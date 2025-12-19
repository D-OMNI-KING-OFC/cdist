// src/components/Profile.tsx
import React, { useEffect, useState } from "react";
import "./Components.enhanced.css";
import { supabase } from "../lib/supabaseClient";
import { t } from "../i18n/index";

type ProfileRow = {
  id: number;
  created_at: string | null;
  platforms: any; // jsonb
  industries: string[];
  pricing_range?: string | null;
  follower_count?: number | null;
  budget_range?: string | null;
  role?: string | null;
  auth_uid?: string | null;
  budget?: number | null;
  role_locked?: boolean | null;
};

type Props = {
  // optional: if uid passed we'll load that profile, otherwise fall back to session user
  uid?: string | null;
  lang: string;
};

export default function Profile({ uid: propUid, lang }: Props): JSX.Element {
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionUid, setSessionUid] = useState<string | null>(null);
  const [authMeta, setAuthMeta] = useState<any>(null); // to read user metadata like email/name
  const [showEditModal, setShowEditModal] = useState<boolean>(false);
  const [editData, setEditData] = useState<Partial<ProfileRow> | null>(null);
  const [updateLoading, setUpdateLoading] = useState<boolean>(false);
  const [updateError, setUpdateError] = useState<string | null>(null);

  // fetch session uid + metadata
  const fetchSession = async (): Promise<string | null> => {
    try {
      const { data } = await supabase.auth.getSession();
      const session = (data as any)?.session ?? null;
      const uid = session?.user?.id ?? null;
      setSessionUid(uid);
      setAuthMeta(session?.user ?? null);
      return uid;
    } catch (err) {
      console.error("fetchSession error", err);
      setSessionUid(null);
      setAuthMeta(null);
      return null;
    }
  };

  const fetchProfile = async (targetUid?: string | null) => {
    setLoading(true);
    setError(null);
    try {
      const uidToUse = targetUid ?? propUid ?? (await fetchSession());
      if (!uidToUse) {
        setProfile(null);
        setLoading(false);
        setError(t("not_signed_in", lang));
        return;
      }

      const { data, error } = await supabase
        .from<ProfileRow>("profiles")
        .select("*")
        .eq("auth_uid", uidToUse)
        .single();

      if (error) {
        // if no rows, supabase may return an error message containing "No rows"
        if ((error as any)?.message && /no rows/i.test((error as any).message)) {
          setProfile(null);
          setError(t("profile_not_found", lang));
        } else {
          setProfile(null);
          setError((error as any)?.message ?? String(error));
        }
      } else {
        setProfile(data ?? null);
        setError(null);
      }
    } catch (err: any) {
      console.error("fetchProfile exception", err);
      setProfile(null);
      setError(err?.message ?? String(err));
    } finally {
      setLoading(false);
    }
  };

  const openEditModal = () => {
    if (profile) {
      setEditData({ ...profile });
      setShowEditModal(true);
      setUpdateError(null);
    }
  };

  const closeEditModal = () => {
    setShowEditModal(false);
    setEditData(null);
    setUpdateError(null);
  };

  const updateProfile = async () => {
    if (!profile || !editData) return;

    setUpdateLoading(true);
    setUpdateError(null);

    try {
      const { error } = await supabase
        .from<ProfileRow>("profiles")
        .update({
          role: editData.role,
          follower_count: editData.follower_count,
          pricing_range: editData.pricing_range,
          platforms: editData.platforms,
          industries: editData.industries,
          budget: editData.budget,
          budget_range: editData.budget_range,
        })
        .eq("id", profile.id)
        .eq("auth_uid", sessionUid);

      if (error) {
        setUpdateError((error as any)?.message ?? String(error));
      } else {
        // Refresh profile data
        await fetchProfile(propUid ?? sessionUid);
        closeEditModal();
      }
    } catch (err: any) {
      console.error("updateProfile error", err);
      setUpdateError(err?.message ?? String(err));
    } finally {
      setUpdateLoading(false);
    }
  };

  useEffect(() => {
    // load session + profile on mount
    (async () => {
      // if propUid is provided, we still fetch session to determine "isOwner"
      await fetchSession();
      await fetchProfile(propUid ?? undefined);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [propUid, lang]);

  const isOwner = Boolean(sessionUid && profile && sessionUid === profile.auth_uid);

  // readable display helpers
  const displayName = (() => {
    // prefer auth metadata (if available), else show short uid
    const metaName = (authMeta && (authMeta.user_metadata?.full_name || authMeta.user_metadata?.name || authMeta.email)) ?? null;
    if (metaName) return metaName;
    if (profile?.auth_uid) return `User ${profile.auth_uid.slice(0, 8)}`;
    return t("no_website", lang); // fallback short label
  })();

  const platformsList = (() => {
    try {
      if (!profile) return [];
      if (Array.isArray(profile.platforms)) return profile.platforms;
      if (typeof profile.platforms === "string") {
        const parsed = JSON.parse(profile.platforms);
        return Array.isArray(parsed) ? parsed : [];
      }
      // if it's an object with keys, convert to array
      if (profile.platforms && typeof profile.platforms === "object") {
        return Object.values(profile.platforms);
      }
      return [];
    } catch {
      return [];
    }
  })();

  // Design tokens
  const sectionBorder = "1px solid rgba(255,255,255,0.06)";
  const cardBg = "rgba(255,255,255,0.012)";
  const cardShadow = "0 8px 28px rgba(2,6,23,0.45)";
  const primaryGradient = "radial-gradient(circle at 30% 50%, rgba(14,165,233,0.15), rgba(14,165,233,0.02))";

  return (
    <div
      style={{
        width: "100%",
        boxSizing: "border-box",
        padding: "24px",
        maxWidth: 1000,
        margin: "0 auto",
      }}
    >
      {/* Header Card with Gradient Border */}
      <div
        style={{
          borderRadius: 12,
          padding: 1.5,
          backgroundImage: primaryGradient,
          marginBottom: 24,
        }}
      >
        <div
          style={{
            background: cardBg,
            borderRadius: 10,
            border: sectionBorder,
            padding: 28,
            display: "flex",
            gap: 24,
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
          }}
        >
          {/* Avatar & Info */}
          <div style={{ display: "flex", gap: 20, alignItems: "flex-start", flex: 1, minWidth: 200 }}>
            {/* Avatar */}
            <div
              style={{
                width: 80,
                height: 80,
                borderRadius: 12,
                background: "linear-gradient(135deg, rgba(14,165,233,0.3), rgba(168,85,247,0.2))",
                border: "1px solid rgba(14,165,233,0.2)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <span
                style={{
                  fontSize: 32,
                  fontWeight: 800,
                  background: "linear-gradient(135deg, #0ea5e9, #a855f7)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}
              >
                {displayName && typeof displayName === "string" ? displayName.charAt(0).toUpperCase() : "U"}
              </span>
            </div>

            {/* Profile Text */}
            <div>
              <h1 style={{ fontSize: 24, fontWeight: 800, margin: "0 0 8px 0", color: "#e6eef8" }}>
                {loading ? t("loading", lang) : profile ? displayName : error ?? t("profile_not_found", lang)}
              </h1>
              <p style={{ margin: 0, fontSize: 13, color: "rgba(230,238,248,0.6)" }}>
                {profile?.role ? `${profile.role} Account` : "User Profile"}
              </p>
            </div>
          </div>

          {/* Edit Button */}
          {isOwner && (
            <button
              onClick={openEditModal}
              style={{
                padding: "10px 24px",
                borderRadius: 8,
                border: "1px solid rgba(14,165,233,0.4)",
                background: "linear-gradient(135deg, rgba(14,165,233,0.15), rgba(168,85,247,0.1))",
                color: "#0ea5e9",
                fontWeight: 700,
                fontSize: 13,
                cursor: "pointer",
                transition: "all 200ms ease",
                textTransform: "uppercase",
                letterSpacing: "0.5px",
              }}
              onMouseEnter={(e) => {
                (e.target as HTMLButtonElement).style.background = "linear-gradient(135deg, rgba(14,165,233,0.25), rgba(168,85,247,0.15))";
                (e.target as HTMLButtonElement).style.borderColor = "rgba(14,165,233,0.6)";
              }}
              onMouseLeave={(e) => {
                (e.target as HTMLButtonElement).style.background = "linear-gradient(135deg, rgba(14,165,233,0.15), rgba(168,85,247,0.1))";
                (e.target as HTMLButtonElement).style.borderColor = "rgba(14,165,233,0.4)";
              }}
            >
              {t("edit_profile", lang)}
            </button>
          )}
        </div>
      </div>

      {/* Error State */}
      {error && !loading && (
        <div
          role="alert"
          style={{
            padding: 16,
            borderRadius: 8,
            background: "rgba(239,68,68,0.1)",
            border: "1px solid rgba(239,68,68,0.3)",
            color: "#fca5a5",
            marginBottom: 24,
            fontSize: 13,
          }}
        >
          {error}
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div
          style={{
            padding: 40,
            textAlign: "center",
            color: "rgba(230,238,248,0.5)",
            fontSize: 14,
          }}
        >
          {t("loading", lang)}
        </div>
      )}

      {/* Profile Content */}
      {!loading && profile && (
        <div style={{ display: "grid", gap: 24, gridTemplateColumns: "1fr 1fr" }}>
          {/* Profile Information */}
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
                padding: 20,
              }}
            >
              <h3 style={{ fontSize: 14, fontWeight: 700, margin: "0 0 16px 0", color: "#e6eef8", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                {t("profile_info", lang)}
              </h3>

              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div
                  style={{
                    padding: 12,
                    borderRadius: 8,
                    background: "rgba(14,165,233,0.05)",
                    border: "1px solid rgba(14,165,233,0.1)",
                  }}
                >
                  <div style={{ fontSize: 11, fontWeight: 600, color: "rgba(230,238,248,0.6)", textTransform: "uppercase" }}>
                    {t("name_label", lang)}
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#e6eef8", marginTop: 4 }}>
                    {displayName}
                  </div>
                </div>

                <div
                  style={{
                    padding: 12,
                    borderRadius: 8,
                    background: "rgba(14,165,233,0.05)",
                    border: "1px solid rgba(14,165,233,0.1)",
                  }}
                >
                  <div style={{ fontSize: 11, fontWeight: 600, color: "rgba(230,238,248,0.6)", textTransform: "uppercase" }}>
                    {t("role_label", lang)}
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#0ea5e9", marginTop: 4 }}>
                    {profile.role ?? "—"}
                  </div>
                </div>

                <div
                  style={{
                    padding: 12,
                    borderRadius: 8,
                    background: "rgba(14,165,233,0.05)",
                    border: "1px solid rgba(14,165,233,0.1)",
                  }}
                >
                  <div style={{ fontSize: 11, fontWeight: 600, color: "rgba(230,238,248,0.6)", textTransform: "uppercase" }}>
                    {t("joined", lang)}
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#e6eef8", marginTop: 4 }}>
                    {profile.created_at ? new Date(profile.created_at).toLocaleDateString() : "—"}
                  </div>
                </div>

                <div
                  style={{
                    padding: 12,
                    borderRadius: 8,
                    background: "rgba(16,185,129,0.05)",
                    border: "1px solid rgba(16,185,129,0.1)",
                  }}
                >
                  <div style={{ fontSize: 11, fontWeight: 600, color: "rgba(230,238,248,0.6)", textTransform: "uppercase" }}>
                    {t("followers_label", lang)}
                  </div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: "#10b981", marginTop: 4 }}>
                    {profile.follower_count != null ? profile.follower_count.toLocaleString() : "—"}
                  </div>
                </div>

                <div
                  style={{
                    padding: 12,
                    borderRadius: 8,
                    background: "rgba(168,85,247,0.05)",
                    border: "1px solid rgba(168,85,247,0.1)",
                  }}
                >
                  <div style={{ fontSize: 11, fontWeight: 600, color: "rgba(230,238,248,0.6)", textTransform: "uppercase" }}>
                    {t("pricing_label", lang)}
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#d8b4fe", marginTop: 4 }}>
                    {profile.pricing_range ?? "—"}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Platforms & Industries */}
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
                padding: 20,
              }}
            >
              <h3 style={{ fontSize: 14, fontWeight: 700, margin: "0 0 16px 0", color: "#e6eef8", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                Connected Platforms
              </h3>

              {platformsList.length === 0 ? (
                <div
                  style={{
                    padding: 20,
                    textAlign: "center",
                    borderRadius: 8,
                    background: "rgba(255,255,255,0.05)",
                    border: "1px dashed rgba(255,255,255,0.1)",
                    color: "rgba(230,238,248,0.5)",
                    fontSize: 13,
                  }}
                >
                  {t("no_socials", lang)}
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {platformsList.map((p: any, i: number) => {
                    const label =
                      typeof p === "string"
                        ? p
                        : p.handle
                        ? `${p.platform ?? "Account"} • ${p.handle}`
                        : p.platform
                        ? `${p.platform} • ${p.username ?? p.handle ?? ""}`
                        : JSON.stringify(p);
                    const url = (typeof p === "object" && (p.url || p.link)) ?? null;

                    return (
                      <div
                        key={i}
                        style={{
                          padding: 12,
                          borderRadius: 8,
                          background: "rgba(14,165,233,0.08)",
                          border: "1px solid rgba(14,165,233,0.2)",
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                        }}
                      >
                        <span
                          style={{
                            fontSize: 12,
                            fontWeight: 600,
                            color: "#0ea5e9",
                          }}
                        >
                          {label}
                        </span>
                        {url && (
                          <a
                            href={url}
                            target="_blank"
                            rel="noreferrer"
                            style={{
                              fontSize: 11,
                              color: "rgba(230,238,248,0.5)",
                              textDecoration: "none",
                              padding: "4px 8px",
                              borderRadius: 4,
                              background: "rgba(255,255,255,0.05)",
                              transition: "all 200ms ease",
                            }}
                            onMouseEnter={(e) => {
                              (e.target as HTMLAnchorElement).style.background = "rgba(14,165,233,0.15)";
                              (e.target as HTMLAnchorElement).style.color = "#0ea5e9";
                            }}
                            onMouseLeave={(e) => {
                              (e.target as HTMLAnchorElement).style.background = "rgba(255,255,255,0.05)";
                              (e.target as HTMLAnchorElement).style.color = "rgba(230,238,248,0.5)";
                            }}
                          >
                            Visit →
                          </a>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Industries */}
              <div style={{ marginTop: 20 }}>
                <h4 style={{ fontSize: 12, fontWeight: 700, margin: "0 0 12px 0", color: "#e6eef8", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                  Industries
                </h4>

                {Array.isArray(profile.industries) && profile.industries.length > 0 ? (
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {profile.industries.map((industry, i) => (
                      <span
                        key={i}
                        style={{
                          display: "inline-block",
                          padding: "6px 12px",
                          borderRadius: 6,
                          background: "rgba(168,85,247,0.15)",
                          border: "1px solid rgba(168,85,247,0.3)",
                          color: "#d8b4fe",
                          fontSize: 11,
                          fontWeight: 700,
                          textTransform: "capitalize",
                        }}
                      >
                        {industry}
                      </span>
                    ))}
                  </div>
                ) : (
                  <div style={{ fontSize: 12, color: "rgba(230,238,248,0.5)" }}>
                    {t("no_bio", lang)}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {!loading && !profile && !error && (
        <div
          style={{
            padding: 40,
            textAlign: "center",
            color: "rgba(230,238,248,0.5)",
            fontSize: 14,
          }}
        >
          {t("profile_not_found", lang)}
        </div>
      )}

      {/* Edit Profile Modal */}
      {showEditModal && editData && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(2, 6, 23, 0.7)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: 16,
          }}
          onClick={closeEditModal}
        >
          <div
            style={{
              background: "rgba(255,255,255,0.012)",
              border: "1px solid rgba(255,255,255,0.06)",
              borderRadius: 12,
              padding: 28,
              maxWidth: 600,
              width: "100%",
              maxHeight: "80vh",
              overflowY: "auto",
              boxShadow: "0 8px 28px rgba(2,6,23,0.45)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{ fontSize: 20, fontWeight: 800, margin: "0 0 20px 0", color: "#e6eef8" }}>
              {t("edit_profile", lang)}
            </h2>

            {updateError && (
              <div
                style={{
                  padding: 12,
                  borderRadius: 8,
                  background: "rgba(239,68,68,0.1)",
                  border: "1px solid rgba(239,68,68,0.3)",
                  color: "#fca5a5",
                  marginBottom: 16,
                  fontSize: 12,
                }}
              >
                {updateError}
              </div>
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {/* Role Field */}
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: "rgba(230,238,248,0.7)", textTransform: "uppercase", marginBottom: 8, display: "block" }}>
                  {t("role_label", lang)}
                </label>
                <input
                  type="text"
                  value={editData.role ?? ""}
                  onChange={(e) => setEditData({ ...editData, role: e.target.value })}
                  placeholder="e.g. Influencer, Brand"
                  style={{
                    width: "100%",
                    boxSizing: "border-box",
                    padding: 10,
                    borderRadius: 8,
                    border: "1px solid rgba(14,165,233,0.2)",
                    background: "rgba(14,165,233,0.05)",
                    color: "#e6eef8",
                    fontSize: 13,
                    transition: "all 200ms ease",
                  }}
                  onFocus={(e) => {
                    (e.target as HTMLInputElement).style.borderColor = "rgba(14,165,233,0.4)";
                    (e.target as HTMLInputElement).style.background = "rgba(14,165,233,0.1)";
                  }}
                  onBlur={(e) => {
                    (e.target as HTMLInputElement).style.borderColor = "rgba(14,165,233,0.2)";
                    (e.target as HTMLInputElement).style.background = "rgba(14,165,233,0.05)";
                  }}
                />
              </div>

              {/* Follower Count Field */}
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: "rgba(230,238,248,0.7)", textTransform: "uppercase", marginBottom: 8, display: "block" }}>
                  {t("followers_label", lang)}
                </label>
                <input
                  type="number"
                  value={editData.follower_count ?? ""}
                  onChange={(e) => setEditData({ ...editData, follower_count: e.target.value ? parseInt(e.target.value) : null })}
                  placeholder="e.g. 50000"
                  style={{
                    width: "100%",
                    boxSizing: "border-box",
                    padding: 10,
                    borderRadius: 8,
                    border: "1px solid rgba(16,185,129,0.2)",
                    background: "rgba(16,185,129,0.05)",
                    color: "#e6eef8",
                    fontSize: 13,
                    transition: "all 200ms ease",
                  }}
                  onFocus={(e) => {
                    (e.target as HTMLInputElement).style.borderColor = "rgba(16,185,129,0.4)";
                    (e.target as HTMLInputElement).style.background = "rgba(16,185,129,0.1)";
                  }}
                  onBlur={(e) => {
                    (e.target as HTMLInputElement).style.borderColor = "rgba(16,185,129,0.2)";
                    (e.target as HTMLInputElement).style.background = "rgba(16,185,129,0.05)";
                  }}
                />
              </div>

              {/* Pricing Range Field */}
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: "rgba(230,238,248,0.7)", textTransform: "uppercase", marginBottom: 8, display: "block" }}>
                  {t("pricing_label", lang)}
                </label>
                <input
                  type="text"
                  value={editData.pricing_range ?? ""}
                  onChange={(e) => setEditData({ ...editData, pricing_range: e.target.value })}
                  placeholder="e.g. $100 - $500"
                  style={{
                    width: "100%",
                    boxSizing: "border-box",
                    padding: 10,
                    borderRadius: 8,
                    border: "1px solid rgba(168,85,247,0.2)",
                    background: "rgba(168,85,247,0.05)",
                    color: "#e6eef8",
                    fontSize: 13,
                    transition: "all 200ms ease",
                  }}
                  onFocus={(e) => {
                    (e.target as HTMLInputElement).style.borderColor = "rgba(168,85,247,0.4)";
                    (e.target as HTMLInputElement).style.background = "rgba(168,85,247,0.1)";
                  }}
                  onBlur={(e) => {
                    (e.target as HTMLInputElement).style.borderColor = "rgba(168,85,247,0.2)";
                    (e.target as HTMLInputElement).style.background = "rgba(168,85,247,0.05)";
                  }}
                />
              </div>

              {/* Platforms Field */}
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: "rgba(230,238,248,0.7)", textTransform: "uppercase", marginBottom: 8, display: "block" }}>
                  Platforms (JSON)
                </label>
                <textarea
                  value={typeof editData.platforms === "string" ? editData.platforms : JSON.stringify(editData.platforms ?? [], null, 2)}
                  onChange={(e) => {
                    try {
                      setEditData({ ...editData, platforms: JSON.parse(e.target.value) });
                    } catch {
                      setEditData({ ...editData, platforms: e.target.value });
                    }
                  }}
                  placeholder='e.g. [{"platform":"Instagram","handle":"@username"}]'
                  style={{
                    width: "100%",
                    boxSizing: "border-box",
                    padding: 10,
                    borderRadius: 8,
                    border: "1px solid rgba(14,165,233,0.2)",
                    background: "rgba(14,165,233,0.05)",
                    color: "#e6eef8",
                    fontSize: 12,
                    fontFamily: "monospace",
                    minHeight: 80,
                    transition: "all 200ms ease",
                    resize: "vertical",
                  }}
                  onFocus={(e) => {
                    (e.target as HTMLTextAreaElement).style.borderColor = "rgba(14,165,233,0.4)";
                    (e.target as HTMLTextAreaElement).style.background = "rgba(14,165,233,0.1)";
                  }}
                  onBlur={(e) => {
                    (e.target as HTMLTextAreaElement).style.borderColor = "rgba(14,165,233,0.2)";
                    (e.target as HTMLTextAreaElement).style.background = "rgba(14,165,233,0.05)";
                  }}
                />
              </div>

              {/* Industries Field */}
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: "rgba(230,238,248,0.7)", textTransform: "uppercase", marginBottom: 8, display: "block" }}>
                  Industries (comma-separated)
                </label>
                <input
                  type="text"
                  value={Array.isArray(editData.industries) ? editData.industries.join(", ") : ""}
                  onChange={(e) => setEditData({ ...editData, industries: e.target.value.split(",").map((i) => i.trim()).filter((i) => i) })}
                  placeholder="e.g. Tech, Fashion, Fitness"
                  style={{
                    width: "100%",
                    boxSizing: "border-box",
                    padding: 10,
                    borderRadius: 8,
                    border: "1px solid rgba(168,85,247,0.2)",
                    background: "rgba(168,85,247,0.05)",
                    color: "#e6eef8",
                    fontSize: 13,
                    transition: "all 200ms ease",
                  }}
                  onFocus={(e) => {
                    (e.target as HTMLInputElement).style.borderColor = "rgba(168,85,247,0.4)";
                    (e.target as HTMLInputElement).style.background = "rgba(168,85,247,0.1)";
                  }}
                  onBlur={(e) => {
                    (e.target as HTMLInputElement).style.borderColor = "rgba(168,85,247,0.2)";
                    (e.target as HTMLInputElement).style.background = "rgba(168,85,247,0.05)";
                  }}
                />
              </div>

              {/* Budget Field */}
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: "rgba(230,238,248,0.7)", textTransform: "uppercase", marginBottom: 8, display: "block" }}>
                  Budget
                </label>
                <input
                  type="number"
                  value={editData.budget ?? ""}
                  onChange={(e) => setEditData({ ...editData, budget: e.target.value ? parseInt(e.target.value) : null })}
                  placeholder="e.g. 5000"
                  style={{
                    width: "100%",
                    boxSizing: "border-box",
                    padding: 10,
                    borderRadius: 8,
                    border: "1px solid rgba(14,165,233,0.2)",
                    background: "rgba(14,165,233,0.05)",
                    color: "#e6eef8",
                    fontSize: 13,
                    transition: "all 200ms ease",
                  }}
                  onFocus={(e) => {
                    (e.target as HTMLInputElement).style.borderColor = "rgba(14,165,233,0.4)";
                    (e.target as HTMLInputElement).style.background = "rgba(14,165,233,0.1)";
                  }}
                  onBlur={(e) => {
                    (e.target as HTMLInputElement).style.borderColor = "rgba(14,165,233,0.2)";
                    (e.target as HTMLInputElement).style.background = "rgba(14,165,233,0.05)";
                  }}
                />
              </div>

              {/* Budget Range Field */}
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: "rgba(230,238,248,0.7)", textTransform: "uppercase", marginBottom: 8, display: "block" }}>
                  Budget Range
                </label>
                <input
                  type="text"
                  value={editData.budget_range ?? ""}
                  onChange={(e) => setEditData({ ...editData, budget_range: e.target.value })}
                  placeholder="e.g. $1000 - $5000"
                  style={{
                    width: "100%",
                    boxSizing: "border-box",
                    padding: 10,
                    borderRadius: 8,
                    border: "1px solid rgba(14,165,233,0.2)",
                    background: "rgba(14,165,233,0.05)",
                    color: "#e6eef8",
                    fontSize: 13,
                    transition: "all 200ms ease",
                  }}
                  onFocus={(e) => {
                    (e.target as HTMLInputElement).style.borderColor = "rgba(14,165,233,0.4)";
                    (e.target as HTMLInputElement).style.background = "rgba(14,165,233,0.1)";
                  }}
                  onBlur={(e) => {
                    (e.target as HTMLInputElement).style.borderColor = "rgba(14,165,233,0.2)";
                    (e.target as HTMLInputElement).style.background = "rgba(14,165,233,0.05)";
                  }}
                />
              </div>

              {/* Action Buttons */}
              <div style={{ display: "flex", gap: 12, marginTop: 16, justifyContent: "flex-end" }}>
                <button
                  onClick={closeEditModal}
                  disabled={updateLoading}
                  style={{
                    padding: "10px 20px",
                    borderRadius: 8,
                    border: "1px solid rgba(255,255,255,0.1)",
                    background: "rgba(255,255,255,0.05)",
                    color: "rgba(230,238,248,0.7)",
                    fontWeight: 700,
                    fontSize: 13,
                    cursor: updateLoading ? "not-allowed" : "pointer",
                    transition: "all 200ms ease",
                    opacity: updateLoading ? 0.5 : 1,
                  }}
                  onMouseEnter={(e) => {
                    if (!updateLoading) {
                      (e.target as HTMLButtonElement).style.background = "rgba(255,255,255,0.1)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    (e.target as HTMLButtonElement).style.background = "rgba(255,255,255,0.05)";
                  }}
                >
                  {t("cancel", lang)}
                </button>
                <button
                  onClick={updateProfile}
                  disabled={updateLoading}
                  style={{
                    padding: "10px 24px",
                    borderRadius: 8,
                    border: "1px solid rgba(14,165,233,0.4)",
                    background: "linear-gradient(135deg, rgba(14,165,233,0.15), rgba(168,85,247,0.1))",
                    color: "#0ea5e9",
                    fontWeight: 700,
                    fontSize: 13,
                    cursor: updateLoading ? "not-allowed" : "pointer",
                    transition: "all 200ms ease",
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
                    opacity: updateLoading ? 0.6 : 1,
                  }}
                  onMouseEnter={(e) => {
                    if (!updateLoading) {
                      (e.target as HTMLButtonElement).style.background = "linear-gradient(135deg, rgba(14,165,233,0.25), rgba(168,85,247,0.15))";
                      (e.target as HTMLButtonElement).style.borderColor = "rgba(14,165,233,0.6)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    (e.target as HTMLButtonElement).style.background = "linear-gradient(135deg, rgba(14,165,233,0.15), rgba(168,85,247,0.1))";
                    (e.target as HTMLButtonElement).style.borderColor = "rgba(14,165,233,0.4)";
                  }}
                >
                  {updateLoading ? t("saving", lang) : t("saveProfile", lang)}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
