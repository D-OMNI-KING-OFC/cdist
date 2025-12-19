// src/components/CampaignCreation.tsx
import React, { useState, useRef } from "react";
import "./Components.enhanced.css";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import { t } from "../i18n/index";

type cpprops = {
  lang: string;
};

type FieldErrors = Partial<
  Record<
    | "title"
    | "description"
    | "category"
    | "target_platform"
    | "reward_per_post"
    | "total_slots"
    | "deadline"
    | "media_url"
    | "general",
    string
  >
>;

const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024; // 50 MB
const ALLOWED_FILE_PREFIXES = ["image/", "video/"];

export default function CampaignCreation({ lang }: cpprops) {
  const navigate = useNavigate();

  // inputs as strings to avoid TS number/string pitfalls
  const [title, setTitle] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [category, setCategory] = useState<string>("");
  const [targetPlatform, setTargetPlatform] = useState<string>("");
  const [deadline, setDeadline] = useState<string>("");
  const [rewardPerPost, setRewardPerPost] = useState<string>("");
  const [totalPosts, setTotalPosts] = useState<string>("1");
  const [file, setFile] = useState<File | null>(null);

  const [loading, setLoading] = useState<boolean>(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [success, setSuccess] = useState<string>("");

  // Refs
  const titleRef = useRef<HTMLInputElement | null>(null);
  const descRef = useRef<HTMLTextAreaElement | null>(null);
  const categoryRef = useRef<HTMLSelectElement | null>(null);
  const targetPlatformRef = useRef<HTMLInputElement | null>(null);
  const rewardRef = useRef<HTMLInputElement | null>(null);
  const totalRef = useRef<HTMLInputElement | null>(null);
  const deadlineRef = useRef<HTMLInputElement | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  // Helpers
  const isAllowedFileType = (f: File) => ALLOWED_FILE_PREFIXES.some((p) => f.type.startsWith(p));

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrors((s) => ({ ...s, media_url: undefined }));
    const files = e.target.files;
    if (!files || files.length === 0) {
      setFile(null);
      return;
    }
    const f = files[0];
    if (!isAllowedFileType(f)) {
      setFile(null);
      setErrors((s) => ({ ...s, media_url: t("unsupported_file_type", lang) }));
      return;
    }
    if (f.size > MAX_FILE_SIZE_BYTES) {
      setFile(null);
      setErrors((s) => ({ ...s, media_url: t("file_too_large", lang) }));
      return;
    }
    setFile(f);
  };

  const validateAll = async (): Promise<boolean> => {
    const newErrors: FieldErrors = {};

    if (!title.trim()) newErrors.title = t("campaign_title_required", lang);
    if (!description.trim()) newErrors.description = t("describe_campaign", lang);
    if (!category.trim()) newErrors.category = t("select_campaign_type", lang);
    if (!targetPlatform.trim()) newErrors.target_platform = t("specify_target_platform", lang);

    const reward = parseFloat(rewardPerPost === "" ? "NaN" : rewardPerPost);
    if (isNaN(reward) || reward <= 0) newErrors.reward_per_post = t("reward_must_be_number", lang);

    const total = parseInt(totalPosts === "" ? "0" : totalPosts, 10);
    if (isNaN(total) || total < 1) newErrors.total_slots = t("total_posts_must_be_integer", lang);

    if (deadline) {
      const parsed = Date.parse(deadline);
      if (Number.isNaN(parsed)) newErrors.deadline = t("invalid_date_time", lang);
      else if (parsed <= Date.now()) newErrors.deadline = t("deadline_in_future", lang);
    }

    if (file && file.size > MAX_FILE_SIZE_BYTES) newErrors.media_url = t("file_too_large", lang);

    setErrors(newErrors);

    // Focus first invalid field
    const order: Array<{ key: keyof FieldErrors; ref?: React.RefObject<any> }> = [
      { key: "title", ref: titleRef },
      { key: "description", ref: descRef },
      { key: "category", ref: categoryRef },
      { key: "target_platform", ref: targetPlatformRef },
      { key: "reward_per_post", ref: rewardRef },
      { key: "total_slots", ref: totalRef },
      { key: "deadline", ref: deadlineRef },
      { key: "media_url", ref: fileRef },
    ];

    for (const o of order) {
      if (newErrors[o.key]) {
        if (o.ref && o.ref.current && typeof o.ref.current.focus === "function") {
          o.ref.current.focus();
        }
        break;
      }
    }

    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrors({});
    setSuccess("");

    const ok = await validateAll();
    if (!ok) return;

    setLoading(true);

    try {
      // get session & advertiser uuid
      const { data: sessionData } = await supabase.auth.getSession();
      const session = (sessionData as any)?.session ?? null;
      const advertiser_id: string | null = session?.user?.id ?? null;

      if (!advertiser_id) {
        setErrors({ general: t("must_be_signed_in_create", lang) });
        setLoading(false);
        return;
      }

      // Upload file if present
      let publicUrl: string | null = null;
      if (file) {
        // place file under the user's folder to satisfy bucket policies (e.g. "uuid/filename")
        const safeFileName = `${Date.now()}_${file.name.replace(/\s+/g, "_")}`;
        const filePath = `${advertiser_id}/${safeFileName}`;

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from("campaign-media")
          .upload(filePath, file, { upsert: false });

        if (uploadError) {
          setErrors({ media_url: `${t("file_upload_failed_prefix", lang)} ${uploadError.message}` });
          setLoading(false);
          return;
        }

        // get public URL
        const { data: urlData, error: urlError } = await supabase.storage.from("campaign-media").getPublicUrl(filePath);
        if (urlError) {
          // not fatal — we can still store null, but surface the error
          setErrors((s) => ({ ...s, media_url: `${t("could_not_get_public_url_prefix", lang)} ${urlError.message}` }));
        } else {
          publicUrl = (urlData as any)?.publicUrl ?? null;
        }
      }

      // parse numbers safely
      const rewardNum = parseFloat(rewardPerPost);
      const totalNum = parseInt(totalPosts, 10);

      const reward_amount = Number.isFinite(rewardNum) && Number.isFinite(totalNum) ? rewardNum * totalNum : 0;

      // Build payload matching ad_requests columns
      const payload = {
        advertiser_id, // uuid
        title: title.trim(),
        description: description.trim() || null,
        category: category || null,
        target_platform: targetPlatform || null,
        deadline: deadline || null,
        media_url: publicUrl,
        reward_amount: reward_amount,
        reward_per_post: rewardNum,
        total_slots: totalNum,
        remaining_slots: totalNum,
        status: "pending",
      };

      const { error: insertError } = await supabase.from("ad_requests").insert([payload]);

      if (insertError) {
        if (/(row-level security|RLS|policy)/i.test(insertError.message)) {
          setErrors({
            general: `${t("permission_denied_rls_prefix", lang)} ${t("permission_denied_rls_suffix", lang)}`,
          });
        } else {
          setErrors({ general: `${t("database_error_prefix", lang)} ${insertError.message}` });
        }
        setLoading(false);
        return;
      }

      // success
      setSuccess(t("campaign_created_success", lang));
      // reset form
      setTitle("");
      setDescription("");
      setCategory("");
      setTargetPlatform("");
      setDeadline("");
      setRewardPerPost("");
      setTotalPosts("1");
      setFile(null);

      // navigate away after success
      navigate("/dashboard");
    } catch (err: any) {
      setErrors({ general: `${t("unexpected_error_prefix", lang)} ${err?.message ?? String(err)}` });
    } finally {
      setLoading(false);
    }
  };

  const [isMobile, setIsMobile] = useState(false);

  React.useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <div
      style={{
        width: "100%",
        boxSizing: "border-box",
        padding: isMobile ? "16px 8px" : "24px",
        maxWidth: 1200,
        margin: "0 auto",
      }}
    >
      {/* Design tokens */}
      {(() => {
        const sectionBorder = "1px solid rgba(255,255,255,0.06)";
        const cardBg = "rgba(255,255,255,0.012)";
        const cardShadow = "0 8px 28px rgba(2,6,23,0.45)";
        const primaryGradient = "radial-gradient(circle at 30% 50%, rgba(14,165,233,0.15), rgba(14,165,233,0.02))";
        const accentGradient = "linear-gradient(135deg, rgba(14,165,233,0.4), rgba(168,85,247,0.2))";

        return (
          <div
            style={{
              borderRadius: 12,
              padding: 1.5,
              backgroundImage: primaryGradient,
            }}
          >
            <div
              style={{
                background: cardBg,
                borderRadius: 10,
                border: sectionBorder,
                padding: isMobile ? 16 : 32,
                boxShadow: cardShadow,
              }}
            >
              {/* Header */}
              <div style={{ marginBottom: isMobile ? 20 : 32 }}>
                <h2 style={{ fontSize: isMobile ? 20 : 28, fontWeight: 800, margin: "0 0 8px 0", color: "#e6eef8", wordBreak: "break-word" }}>
                  {t("createCampaign", lang) || "Create Campaign"}
                </h2>
                <p style={{ margin: 0, fontSize: 13, color: "rgba(230,238,248,0.6)" }}>
                  {t("campaign_setup_steps", lang) || "Setup your influencer campaign in 4 steps"}
                </p>
              </div>

              {/* Progress Bar */}
              <div style={{ marginBottom: 28 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: "rgba(230,238,248,0.7)", textTransform: "uppercase" }}>
                    Progress
                  </span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: "#0ea5e9" }}>25% Complete</span>
                </div>
                <div
                  style={{
                    height: 4,
                    borderRadius: 999,
                    background: "rgba(255,255,255,0.08)",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      height: "100%",
                      width: "25%",
                      background: "linear-gradient(90deg, #0ea5e9, #06b6d4)",
                      borderRadius: 999,
                    }}
                  />
                </div>
              </div>

              <form onSubmit={handleSubmit} noValidate>
                {/* Campaign Details Section */}
                <div style={{ marginBottom: 28 }}>
                  <h3 style={{ fontSize: 14, fontWeight: 700, margin: "0 0 16px 0", color: "#e6eef8", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                    Campaign Details
                  </h3>

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
                      gap: 16,
                      marginBottom: 16,
                    }}
                  >
                    {/* Campaign Title */}
                    <div>
                      <label
                        htmlFor="title"
                        style={{
                          display: "block",
                          fontSize: 12,
                          fontWeight: 600,
                          color: "rgba(230,238,248,0.7)",
                          marginBottom: 8,
                          textTransform: "uppercase",
                        }}
                      >
                        Campaign Name *
                      </label>
                      <input
                        id="title"
                        name="title"
                        type="text"
                        ref={titleRef}
                        placeholder="e.g., Summer Tech Launch"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        aria-invalid={!!errors.title}
                        aria-describedby={errors.title ? "error-title" : undefined}
                        style={{
                          width: "100%",
                          padding: "10px 14px",
                          borderRadius: 8,
                          border: errors.title ? "1px solid rgba(239,68,68,0.4)" : "1px solid rgba(255,255,255,0.08)",
                          background: "rgba(255,255,255,0.02)",
                          color: "#e6eef8",
                          fontSize: 13,
                          fontWeight: 500,
                          boxSizing: "border-box",
                          outline: "none",
                          transition: "all 200ms ease",
                        }}
                        onFocus={(e) => {
                          if (!errors.title) {
                            (e.target as HTMLInputElement).style.borderColor = "rgba(14,165,233,0.3)";
                            (e.target as HTMLInputElement).style.background = "rgba(14,165,233,0.05)";
                          }
                        }}
                        onBlur={(e) => {
                          (e.target as HTMLInputElement).style.borderColor = errors.title ? "rgba(239,68,68,0.4)" : "rgba(255,255,255,0.08)";
                          (e.target as HTMLInputElement).style.background = "rgba(255,255,255,0.02)";
                        }}
                      />
                      {errors.title && (
                        <div
                          id="error-title"
                          role="alert"
                          style={{ color: "#fca5a5", marginTop: 6, fontSize: 11 }}
                        >
                          {errors.title}
                        </div>
                      )}
                    </div>

                    {/* Category */}
                    <div>
                      <label
                        htmlFor="category"
                        style={{
                          display: "block",
                          fontSize: 12,
                          fontWeight: 600,
                          color: "rgba(230,238,248,0.7)",
                          marginBottom: 8,
                          textTransform: "uppercase",
                        }}
                      >
                        Campaign Type *
                      </label>
                      <select
                        id="category"
                        name="category"
                        ref={categoryRef}
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        aria-invalid={!!errors.category}
                        aria-describedby={errors.category ? "error-category" : undefined}
                        style={{
                          width: "100%",
                          padding: "10px 14px",
                          borderRadius: 8,
                          border: errors.category ? "1px solid rgba(239,68,68,0.4)" : "1px solid rgba(255,255,255,0.08)",
                          background: "rgba(255,255,255,0.02)",
                          color: "#e6eef8",
                          fontSize: 13,
                          fontWeight: 500,
                          boxSizing: "border-box",
                          outline: "none",
                          transition: "all 200ms ease",
                          appearance: "none",
                          WebkitAppearance: "none",
                          MozAppearance: "none",
                          paddingRight: "32px",
                          backgroundImage: "url('data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%2216%22 height=%2216%22 viewBox=%220 0 16 16%22%3E%3Cpath fill=%22%23e6eef8%22 d=%22M4.5 6l3.5 4 3.5-4%22/%3E%3C/svg%3E')",
                          backgroundRepeat: "no-repeat",
                          backgroundPosition: "right 10px center",
                          backgroundSize: "16px",
                        }}
                        onFocus={(e) => {
                          if (!errors.category) {
                            (e.target as HTMLSelectElement).style.borderColor = "rgba(14,165,233,0.3)";
                            (e.target as HTMLSelectElement).style.background = "rgba(14,165,233,0.05) url('data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%2216%22 height=%2216%22 viewBox=%220 0 16 16%22%3E%3Cpath fill=%22%23e6eef8%22 d=%22M4.5 6l3.5 4 3.5-4%22/%3E%3C/svg%3E') no-repeat right 10px center / 16px";
                          }
                        }}
                        onBlur={(e) => {
                          (e.target as HTMLSelectElement).style.borderColor = errors.category ? "rgba(239,68,68,0.4)" : "rgba(255,255,255,0.08)";
                          (e.target as HTMLSelectElement).style.background = "rgba(255,255,255,0.02) url('data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%2216%22 height=%2216%22 viewBox=%220 0 16 16%22%3E%3Cpath fill=%22%23e6eef8%22 d=%22M4.5 6l3.5 4 3.5-4%22/%3E%3C/svg%3E') no-repeat right 10px center / 16px";
                        }}
                      >
                        <option value="" style={{ background: "rgba(5,15,40,0.95)", color: "#e6eef8" }}>{t("select_type", lang)}</option>
                        <option value="Sponsored Posts" style={{ background: "rgba(5,15,40,0.95)", color: "#e6eef8" }}>{t("sponsored_posts", lang)}</option>
                        <option value="Product Reviews" style={{ background: "rgba(5,15,40,0.95)", color: "#e6eef8" }}>{t("product_reviews", lang)}</option>
                        <option value="Brand Ambassadorship" style={{ background: "rgba(5,15,40,0.95)", color: "#e6eef8" }}>{t("brand_ambassadorship", lang)}</option>
                      </select>
                      {errors.category && (
                        <div
                          id="error-category"
                          role="alert"
                          style={{ color: "#fca5a5", marginTop: 6, fontSize: 11 }}
                        >
                          {errors.category}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Description */}
                  <div>
                    <label
                      htmlFor="description"
                      style={{
                        display: "block",
                        fontSize: 12,
                        fontWeight: 600,
                        color: "rgba(230,238,248,0.7)",
                        marginBottom: 8,
                        textTransform: "uppercase",
                      }}
                    >
                      Deliverables *
                    </label>
                    <textarea
                      id="description"
                      name="description"
                      ref={descRef}
                      placeholder="Describe what influencers should create and include..."
                      rows={3}
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      aria-invalid={!!errors.description}
                      aria-describedby={errors.description ? "error-description" : undefined}
                      style={{
                        width: "100%",
                        padding: "10px 14px",
                        borderRadius: 8,
                        border: errors.description ? "1px solid rgba(239,68,68,0.4)" : "1px solid rgba(255,255,255,0.08)",
                        background: "rgba(255,255,255,0.02)",
                        color: "#e6eef8",
                        fontSize: 13,
                        fontWeight: 500,
                        boxSizing: "border-box",
                        outline: "none",
                        transition: "all 200ms ease",
                        fontFamily: "inherit",
                        resize: "vertical",
                      }}
                      onFocus={(e) => {
                        if (!errors.description) {
                          (e.target as HTMLTextAreaElement).style.borderColor = "rgba(14,165,233,0.3)";
                          (e.target as HTMLTextAreaElement).style.background = "rgba(14,165,233,0.05)";
                        }
                      }}
                      onBlur={(e) => {
                        (e.target as HTMLTextAreaElement).style.borderColor = errors.description ? "rgba(239,68,68,0.4)" : "rgba(255,255,255,0.08)";
                        (e.target as HTMLTextAreaElement).style.background = "rgba(255,255,255,0.02)";
                      }}
                    />
                    {errors.description && (
                      <div
                        id="error-description"
                        role="alert"
                        style={{ color: "#fca5a5", marginTop: 6, fontSize: 11 }}
                      >
                        {errors.description}
                      </div>
                    )}
                  </div>
                </div>

                {/* Target Audience */}
                <div style={{ marginBottom: 28 }}>
                  <h3 style={{ fontSize: 14, fontWeight: 700, margin: "0 0 16px 0", color: "#e6eef8", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                    Target Audience
                  </h3>

                  <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 16 }}>
                    {/* Target Platform */}
                    <div>
                      <label
                        htmlFor="target_platform"
                        style={{
                          display: "block",
                          fontSize: 12,
                          fontWeight: 600,
                          color: "rgba(230,238,248,0.7)",
                          marginBottom: 8,
                          textTransform: "uppercase",
                        }}
                      >
                        Platform *
                      </label>
                      <input
                        id="target_platform"
                        name="target_platform"
                        type="text"
                        ref={targetPlatformRef}
                        placeholder="e.g., Instagram, TikTok, YouTube"
                        value={targetPlatform}
                        onChange={(e) => setTargetPlatform(e.target.value)}
                        aria-invalid={!!errors.target_platform}
                        aria-describedby={errors.target_platform ? "error-target_platform" : undefined}
                        style={{
                          width: "100%",
                          padding: "10px 14px",
                          borderRadius: 8,
                          border: errors.target_platform ? "1px solid rgba(239,68,68,0.4)" : "1px solid rgba(255,255,255,0.08)",
                          background: "rgba(255,255,255,0.02)",
                          color: "#e6eef8",
                          fontSize: 13,
                          fontWeight: 500,
                          boxSizing: "border-box",
                          outline: "none",
                          transition: "all 200ms ease",
                        }}
                        onFocus={(e) => {
                          if (!errors.target_platform) {
                            (e.target as HTMLInputElement).style.borderColor = "rgba(14,165,233,0.3)";
                            (e.target as HTMLInputElement).style.background = "rgba(14,165,233,0.05)";
                          }
                        }}
                        onBlur={(e) => {
                          (e.target as HTMLInputElement).style.borderColor = errors.target_platform ? "rgba(239,68,68,0.4)" : "rgba(255,255,255,0.08)";
                          (e.target as HTMLInputElement).style.background = "rgba(255,255,255,0.02)";
                        }}
                      />
                      {errors.target_platform && (
                        <div
                          id="error-target_platform"
                          role="alert"
                          style={{ color: "#fca5a5", marginTop: 6, fontSize: 11 }}
                        >
                          {errors.target_platform}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Budget & Slots */}
                <div style={{ marginBottom: 28 }}>
                  <h3 style={{ fontSize: 14, fontWeight: 700, margin: "0 0 16px 0", color: "#e6eef8", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                    Budget & Slots
                  </h3>

                  <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 16 }}>
                    {/* Reward Per Post */}
                    <div>
                      <label
                        htmlFor="reward_per_post"
                        style={{
                          display: "block",
                          fontSize: 12,
                          fontWeight: 600,
                          color: "rgba(230,238,248,0.7)",
                          marginBottom: 8,
                          textTransform: "uppercase",
                        }}
                      >
                        Reward Per Post ($) *
                      </label>
                      <input
                        id="reward_per_post"
                        name="reward_per_post"
                        type="number"
                        step="0.01"
                        ref={rewardRef}
                        placeholder="100.00"
                        value={rewardPerPost}
                        onChange={(e) => setRewardPerPost(e.target.value)}
                        aria-invalid={!!errors.reward_per_post}
                        aria-describedby={errors.reward_per_post ? "error-reward_per_post" : undefined}
                        style={{
                          width: "100%",
                          padding: "10px 14px",
                          borderRadius: 8,
                          border: errors.reward_per_post ? "1px solid rgba(239,68,68,0.4)" : "1px solid rgba(255,255,255,0.08)",
                          background: "rgba(255,255,255,0.02)",
                          color: "#e6eef8",
                          fontSize: 13,
                          fontWeight: 500,
                          boxSizing: "border-box",
                          outline: "none",
                          transition: "all 200ms ease",
                        }}
                        onFocus={(e) => {
                          if (!errors.reward_per_post) {
                            (e.target as HTMLInputElement).style.borderColor = "rgba(14,165,233,0.3)";
                            (e.target as HTMLInputElement).style.background = "rgba(14,165,233,0.05)";
                          }
                        }}
                        onBlur={(e) => {
                          (e.target as HTMLInputElement).style.borderColor = errors.reward_per_post ? "rgba(239,68,68,0.4)" : "rgba(255,255,255,0.08)";
                          (e.target as HTMLInputElement).style.background = "rgba(255,255,255,0.02)";
                        }}
                      />
                      {errors.reward_per_post && (
                        <div
                          id="error-reward_per_post"
                          role="alert"
                          style={{ color: "#fca5a5", marginTop: 6, fontSize: 11 }}
                        >
                          {errors.reward_per_post}
                        </div>
                      )}
                    </div>

                    {/* Total Slots */}
                    <div>
                      <label
                        htmlFor="total_slots"
                        style={{
                          display: "block",
                          fontSize: 12,
                          fontWeight: 600,
                          color: "rgba(230,238,248,0.7)",
                          marginBottom: 8,
                          textTransform: "uppercase",
                        }}
                      >
                        Number of Slots *
                      </label>
                      <input
                        id="total_slots"
                        name="total_slots"
                        type="number"
                        min={1}
                        ref={totalRef}
                        placeholder="5"
                        value={totalPosts}
                        onChange={(e) => setTotalPosts(e.target.value)}
                        aria-invalid={!!errors.total_slots}
                        aria-describedby={errors.total_slots ? "error-total_slots" : undefined}
                        style={{
                          width: "100%",
                          padding: "10px 14px",
                          borderRadius: 8,
                          border: errors.total_slots ? "1px solid rgba(239,68,68,0.4)" : "1px solid rgba(255,255,255,0.08)",
                          background: "rgba(255,255,255,0.02)",
                          color: "#e6eef8",
                          fontSize: 13,
                          fontWeight: 500,
                          boxSizing: "border-box",
                          outline: "none",
                          transition: "all 200ms ease",
                        }}
                        onFocus={(e) => {
                          if (!errors.total_slots) {
                            (e.target as HTMLInputElement).style.borderColor = "rgba(14,165,233,0.3)";
                            (e.target as HTMLInputElement).style.background = "rgba(14,165,233,0.05)";
                          }
                        }}
                        onBlur={(e) => {
                          (e.target as HTMLInputElement).style.borderColor = errors.total_slots ? "rgba(239,68,68,0.4)" : "rgba(255,255,255,0.08)";
                          (e.target as HTMLInputElement).style.background = "rgba(255,255,255,0.02)";
                        }}
                      />
                      {errors.total_slots && (
                        <div
                          id="error-total_slots"
                          role="alert"
                          style={{ color: "#fca5a5", marginTop: 6, fontSize: 11 }}
                        >
                          {errors.total_slots}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Media & Deadline */}
                <div style={{ marginBottom: 28 }}>
                  <h3 style={{ fontSize: 14, fontWeight: 700, margin: "0 0 16px 0", color: "#e6eef8", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                    Media & Timeline
                  </h3>

                  <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 16 }}>
                    {/* Deadline */}
                    <div>
                      <label
                        htmlFor="deadline"
                        style={{
                          display: "block",
                          fontSize: 12,
                          fontWeight: 600,
                          color: "rgba(230,238,248,0.7)",
                          marginBottom: 8,
                          textTransform: "uppercase",
                        }}
                      >
                        Submission Deadline
                      </label>
                      <input
                        id="deadline"
                        name="deadline"
                        type="datetime-local"
                        ref={deadlineRef}
                        value={deadline}
                        onChange={(e) => setDeadline(e.target.value)}
                        aria-invalid={!!errors.deadline}
                        aria-describedby={errors.deadline ? "error-deadline" : undefined}
                        style={{
                          width: "100%",
                          padding: "10px 14px",
                          borderRadius: 8,
                          border: errors.deadline ? "1px solid rgba(239,68,68,0.4)" : "1px solid rgba(255,255,255,0.08)",
                          background: "rgba(255,255,255,0.02)",
                          color: "#e6eef8",
                          fontSize: 13,
                          fontWeight: 500,
                          boxSizing: "border-box",
                          outline: "none",
                          transition: "all 200ms ease",
                        }}
                        onFocus={(e) => {
                          if (!errors.deadline) {
                            (e.target as HTMLInputElement).style.borderColor = "rgba(14,165,233,0.3)";
                            (e.target as HTMLInputElement).style.background = "rgba(14,165,233,0.05)";
                          }
                        }}
                        onBlur={(e) => {
                          (e.target as HTMLInputElement).style.borderColor = errors.deadline ? "rgba(239,68,68,0.4)" : "rgba(255,255,255,0.08)";
                          (e.target as HTMLInputElement).style.background = "rgba(255,255,255,0.02)";
                        }}
                      />
                      {errors.deadline && (
                        <div
                          id="error-deadline"
                          role="alert"
                          style={{ color: "#fca5a5", marginTop: 6, fontSize: 11 }}
                        >
                          {errors.deadline}
                        </div>
                      )}
                    </div>

                    {/* File Upload */}
                    <div>
                      <label
                        htmlFor="media_url"
                        style={{
                          display: "block",
                          fontSize: 12,
                          fontWeight: 600,
                          color: "rgba(230,238,248,0.7)",
                          marginBottom: 8,
                          textTransform: "uppercase",
                        }}
                      >
                        Campaign Media (Image/Video)
                      </label>
                      <input
                        id="media_url"
                        name="media_url"
                        type="file"
                        accept="image/*,video/*"
                        ref={fileRef}
                        onChange={handleFileChange}
                        aria-invalid={!!errors.media_url}
                        aria-describedby={errors.media_url ? "error-media_url" : undefined}
                        style={{
                          width: "100%",
                          padding: "10px 14px",
                          borderRadius: 8,
                          border: errors.media_url ? "1px solid rgba(239,68,68,0.4)" : "1px solid rgba(255,255,255,0.08)",
                          background: "rgba(255,255,255,0.02)",
                          color: "rgba(230,238,248,0.7)",
                          fontSize: 13,
                          fontWeight: 500,
                          boxSizing: "border-box",
                          outline: "none",
                          cursor: "pointer",
                          transition: "all 200ms ease",
                        }}
                      />
                      {errors.media_url && (
                        <div
                          id="error-media_url"
                          role="alert"
                          style={{ color: "#fca5a5", marginTop: 6, fontSize: 11 }}
                        >
                          {errors.media_url}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Media Preview */}
                  {file && (
                    <div
                      style={{
                        marginTop: 16,
                        padding: 12,
                        borderRadius: 8,
                        border: "1px solid rgba(14,165,233,0.2)",
                        background: "rgba(14,165,233,0.05)",
                      }}
                    >
                      {file.type.startsWith("image/") ? (
                        <img
                          src={URL.createObjectURL(file)}
                          alt="Preview"
                          style={{ maxWidth: "100%", maxHeight: 200, borderRadius: 6 }}
                        />
                      ) : file.type.startsWith("video/") ? (
                        <video
                          src={URL.createObjectURL(file)}
                          controls
                          style={{ maxWidth: "100%", maxHeight: 200, borderRadius: 6 }}
                        />
                      ) : null}
                    </div>
                  )}
                </div>

                {/* Error Messages */}
                {errors.general && (
                  <div
                    role="alert"
                    style={{
                      padding: 12,
                      borderRadius: 8,
                      background: "rgba(239,68,68,0.1)",
                      border: "1px solid rgba(239,68,68,0.3)",
                      color: "#fca5a5",
                      marginBottom: 20,
                      fontSize: 13,
                    }}
                  >
                    {errors.general}
                  </div>
                )}

                {success && (
                  <div
                    role="status"
                    style={{
                      padding: 12,
                      borderRadius: 8,
                      background: "rgba(16,185,129,0.1)",
                      border: "1px solid rgba(16,185,129,0.3)",
                      color: "#86efac",
                      marginBottom: 20,
                      fontSize: 13,
                    }}
                  >
                    {success}
                  </div>
                )}

                {/* Action Buttons */}
                <div style={{ display: "flex", gap: 12, justifyContent: "flex-end", flexDirection: isMobile ? "column-reverse" : "row" }}>
                  <button
                    type="button"
                    onClick={() => navigate("/dashboard")}
                    style={{
                      padding: "10px 24px",
                      borderRadius: 8,
                      border: "1px solid rgba(255,255,255,0.1)",
                      background: "rgba(255,255,255,0.05)",
                      color: "rgba(230,238,248,0.8)",
                      fontWeight: 700,
                      fontSize: 13,
                      cursor: "pointer",
                      transition: "all 200ms ease",
                      textTransform: "uppercase",
                      letterSpacing: "0.5px",
                      width: isMobile ? "100%" : "auto",
                    }}
                    onMouseEnter={(e) => {
                      (e.target as HTMLButtonElement).style.background = "rgba(255,255,255,0.1)";
                      (e.target as HTMLButtonElement).style.borderColor = "rgba(255,255,255,0.2)";
                    }}
                    onMouseLeave={(e) => {
                      (e.target as HTMLButtonElement).style.background = "rgba(255,255,255,0.05)";
                      (e.target as HTMLButtonElement).style.borderColor = "rgba(255,255,255,0.1)";
                    }}
                  >
                    {t("cancel", lang) || "Cancel"}
                  </button>

                  <button
                    type="submit"
                    disabled={loading}
                    style={{
                      padding: "10px 24px",
                      borderRadius: 8,
                      border: "1px solid rgba(14,165,233,0.4)",
                      background: "linear-gradient(135deg, rgba(14,165,233,0.4), rgba(168,85,247,0.2))",
                      color: "#0ea5e9",
                      fontWeight: 700,
                      fontSize: 13,
                      cursor: loading ? "not-allowed" : "pointer",
                      opacity: loading ? 0.6 : 1,
                      transition: "all 200ms ease",
                      textTransform: "uppercase",
                      letterSpacing: "0.5px",
                      boxShadow: "0 8px 20px rgba(14,165,233,0.2)",
                      width: isMobile ? "100%" : "auto",
                    }}
                    onMouseEnter={(e) => {
                      if (!loading) {
                        (e.target as HTMLButtonElement).style.background =
                          "linear-gradient(135deg, rgba(14,165,233,0.5), rgba(168,85,247,0.3))";
                        (e.target as HTMLButtonElement).style.boxShadow = "0 12px 32px rgba(14,165,233,0.3)";
                      }
                    }}
                    onMouseLeave={(e) => {
                      (e.target as HTMLButtonElement).style.background =
                        "linear-gradient(135deg, rgba(14,165,233,0.4), rgba(168,85,247,0.2))";
                      (e.target as HTMLButtonElement).style.boxShadow = "0 8px 20px rgba(14,165,233,0.2)";
                    }}
                  >
                    {loading ? t("creating", lang) : t("next_step", lang)}
                  </button>
                </div>
              </form>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
