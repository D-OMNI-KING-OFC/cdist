// src/components/ViewActiveCampaigns.tsx
import React, { useEffect, useState } from "react";
import "./Components.enhanced.css";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import { t } from "../i18n/index";

// Professional Icons as inline SVGs
const TrendingUpIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="23 6 13.5 15.5 8.5 10.5 1 17"></polyline>
    <polyline points="17 6 23 6 23 12"></polyline>
  </svg>
);

const CheckCircleIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
    <polyline points="22 4 12 14.01 9 11.01"></polyline>
  </svg>
);

const AlertIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10"></circle>
    <line x1="12" y1="8" x2="12" y2="12"></line>
    <line x1="12" y1="16" x2="12.01" y2="16"></line>
  </svg>
);

const SendIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M22 2L11 13m11-11l-7 20-4-9-9-4 20-7z"></path>
  </svg>
);

type Campaign = {
  id: number;
  title: string;
  description: string | null;
  reward_per_post: number | string | null;
  total_slots: number;
  remaining_slots: number;
  status: string | null;
  advertiser_id: string | null; // uuid
};

type Submission = {
  id: number;
  campaign_id: number;
  creator_id: string | null; // uuid
  submission_link: string;
  status: string | null;
  submitted_at: string | null;
  revision_requested_at?: string | null;
  approved_at?: string | null;
  auto_paid?: boolean | null;
};

type DashboardProps = {
  lang: string;
};

export default function ViewActiveCampaigns({ lang }: DashboardProps): React.ReactElement {
  const navigate = useNavigate();

  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [mySubmissions, setMySubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [userUid, setUserUid] = useState<string | null>(null);
  const [participateModal, setParticipateModal] = useState<{ open: boolean; campaign?: Campaign | null }>({
    open: false,
    campaign: null,
  });
  const [submissionLink, setSubmissionLink] = useState<string>("");
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [rpcLoading, setRpcLoading] = useState<boolean>(false);
  const [generalError, setGeneralError] = useState<string | null>(null);

  // Added state for resubmit/reserve flow
  const [participateIsResubmit, setParticipateIsResubmit] = useState<boolean>(false);
  const [participateSubmissionId, setParticipateSubmissionId] = useState<number | null>(null);

  // Resubmit flow
  const [resubmitState, setResubmitState] = useState<{ open: boolean; submission?: Submission | null }>({
    open: false,
    submission: null,
  });
  const [resubmitLink, setResubmitLink] = useState<string>("");
  const [resubmitError, setResubmitError] = useState<string | null>(null);
  const [resubmitLoading, setResubmitLoading] = useState<boolean>(false);

  // joinedCampaigns map: campaign_id -> title
  const [joinedCampaigns, setJoinedCampaigns] = useState<Record<number, string>>({});

  // ticking clock for timers
  const [nowTs, setNowTs] = useState<number>(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNowTs(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const allowedHosts = [
    "instagram.com",
    "www.instagram.com",
    "m.instagram.com",
    "youtube.com",
    "www.youtube.com",
    "youtu.be",
    "tiktok.com",
    "www.tiktok.com",
    "twitter.com",
    "x.com",
    "www.twitter.com",
    "facebook.com",
    "www.facebook.com",
    "linkedin.com",
    "www.linkedin.com",
    "vimeo.com",
  ];

  const isValidSocialLink = (raw: string): boolean => {
    if (!raw) return false;
    const s = raw.trim();
    let url: URL | null = null;
    try {
      url = new URL(s);
    } catch {
      try {
        url = new URL("https://" + s);
      } catch {
        return false;
      }
    }
    const host = url.hostname.toLowerCase();
    if (!allowedHosts.includes(host)) return false;

    if (host.includes("youtube") || host === "youtu.be") {
      return (
        url.pathname.includes("/watch") ||
        url.pathname.includes("/shorts") ||
        host === "youtu.be" ||
        url.searchParams.get("v") !== null
      );
    }
    if (host.includes("instagram")) {
      return (
        url.pathname.includes("/p/") ||
        url.pathname.includes("/reel/") ||
        url.pathname.includes("/tv/") ||
        url.pathname.includes("/stories/")
      );
    }
    if (host.includes("tiktok")) return url.pathname.includes("/video/");
    if (host.includes("twitter") || host === "x.com") return url.pathname.includes("/status/") || url.pathname.split("/").length >= 3;
    return url.pathname && url.pathname !== "/";
  };

  // Helper: exact spelling used in your DB
  const isRevisionRequested = (status: string | null | undefined) => {
    return status === "revision requested";
  };

  // --- data fetchers ---

  // return UID so callers can use it immediately (avoids waiting for state update)
  const fetchSessionUid = async (): Promise<string | null> => {
    try {
      const { data } = await supabase.auth.getSession();
      const uid = (data as any)?.session?.user?.id ?? null;
      setUserUid(uid);
      return uid;
    } catch (err) {
      console.error("fetchSessionUid error", err);
      setUserUid(null);
      return null;
    }
  };

  // fetchCampaigns accepts optional uid so we can fetch revision campaigns immediately on first load
  const fetchCampaigns = async (uid?: string | null): Promise<void> => {
    setLoading(true);
    try {
      const effectiveUid = uid ?? userUid;

      // 1) Always fetch open campaigns (remaining_slots > 0)
      const { data: openData, error: openError } = await supabase
        .from("ad_requests")
        .select("id, title, description, reward_per_post, total_slots, remaining_slots, status, advertiser_id, created_at")
        .gt("remaining_slots", 0)
        .order("created_at", { ascending: true })
        .limit(200);

      if (openError) throw openError;

      // 2) If user is logged in, fetch campaign_ids where they have 'revision requested'
      let revisionCampaignIds: (number | string)[] = [];
      if (effectiveUid) {
        const { data: subData, error: subError } = await supabase
          .from("campaign_submissions")
          .select("campaign_id")
          .eq("creator_id", effectiveUid)
          .eq("status", "revision requested");

        if (subError) throw subError;

        revisionCampaignIds = (subData ?? []).map((r: any) => r.campaign_id).filter(Boolean);
      }

      // 3) If there are revision IDs, fetch those ad_requests rows
      let revisionCampaigns: any[] = [];
      if (revisionCampaignIds.length > 0) {
        const { data: revData, error: revError } = await supabase
          .from("ad_requests")
          .select("id, title, description, reward_per_post, total_slots, remaining_slots, status, advertiser_id, created_at")
          .in("id", revisionCampaignIds)
          .order("created_at", { ascending: true })
          .limit(200);

        if (revError) throw revError;
        revisionCampaigns = revData ?? [];
      }

      // 4) Merge results: put revision campaigns first, then open campaigns; dedupe by id
      const map = new Map<number | string, any>();

      for (const c of revisionCampaigns) {
        map.set(c.id, c);
      }
      for (const c of openData ?? []) {
        if (!map.has(c.id)) {
          map.set(c.id, c);
        }
      }

      const merged = Array.from(map.values());
      setCampaigns(merged as Campaign[]);
    } catch (err: unknown) {
      console.error("fetchCampaigns err", err);
      setCampaigns([]);
    } finally {
      setLoading(false);
    }
  };

  // fetchMySubmissions accepts optional uid so we can call immediately after reading session
  const fetchMySubmissions = async (uid?: string | null): Promise<void> => {
    try {
      const effectiveUid = uid ?? userUid;
      if (!effectiveUid) {
        setMySubmissions([]);
        setJoinedCampaigns({});
        return;
      }
      const { data, error } = await supabase
        .from<Submission>("campaign_submissions")
        .select("*")
        .eq("creator_id", effectiveUid)
        .order("submitted_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      const subs = (data as Submission[] | null) ?? [];
      setMySubmissions(subs);

      // Fetch joined campaign titles for the submissions we just fetched
      const campaignIds = Array.from(new Set(subs.map((s) => s.campaign_id))).filter(Boolean) as number[];
      await fetchJoinedCampaigns(campaignIds);
    } catch (err) {
      console.error("fetchMySubmissions err", err);
    }
  };

  const fetchJoinedCampaigns = async (ids: number[]): Promise<void> => {
    if (!ids || ids.length === 0) {
      setJoinedCampaigns({});
      return;
    }
    try {
      const { data, error } = await supabase.from<Campaign>("ad_requests").select("id,title").in("id", ids).limit(200);
      if (error) throw error;
      const map: Record<number, string> = {};
      (data ?? []).forEach((c) => {
        if (c.id) map[c.id] = c.title ?? `Campaign ${c.id}`;
      });
      setJoinedCampaigns(map);
    } catch (err) {
      console.error("fetchJoinedCampaigns err", err);
      setJoinedCampaigns({});
    }
  };

  // SINGLE initial effect: get UID, then immediately fetch campaigns + submissions.
  useEffect(() => {
    (async () => {
      const uid = await fetchSessionUid(); // sets state & returns uid
      await fetchCampaigns(uid); // immediately fetch campaigns using uid so revision-requested are included
      if (uid) await fetchMySubmissions(uid); // immediately fetch user's submissions so UI knows about revisions
    })();

    const campaignsSub = supabase
      .channel("public:ad_requests")
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "ad_requests" }, () => fetchCampaigns(userUid))
      .subscribe();

    const subsSub = supabase
      .channel("public:campaign_submissions")
      .on("postgres_changes", { event: "*", schema: "public", table: "campaign_submissions" }, () => fetchMySubmissions(userUid))
      .subscribe();

    return () => {
      supabase.removeChannel(campaignsSub);
      supabase.removeChannel(subsSub);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- participate modal controls ---

  const findRevisionSubmissionForCampaign = (campaignId: number) => {
    return mySubmissions.find((s) => s.campaign_id === campaignId && s.status === "revision requested") ?? null;
  };

  const openParticipateModal = (campaign: Campaign): void => {
    if (campaign.advertiser_id && userUid && campaign.advertiser_id === userUid) {
      setGeneralError(t("cannot_participate_own_campaign", lang));
      setTimeout(() => setGeneralError(null), 4000);
      return;
    }

    // Check if user has an existing 'revision requested' submission for this campaign
    const existing = userUid ? findRevisionSubmissionForCampaign(campaign.id) : null;

    if (existing) {
      // we're going to let the user resubmit into the same row
      setSubmissionLink(existing.submission_link ?? "");
      setParticipateIsResubmit(true);
      setParticipateSubmissionId(existing.id ?? null);
    } else {
      // normal fresh participate
      setSubmissionLink("");
      setParticipateIsResubmit(false);
      setParticipateSubmissionId(null);
    }

    setSubmissionError(null);
    setParticipateModal({ open: true, campaign });
  };

  const closeParticipateModal = (): void => {
    setParticipateModal({ open: false, campaign: null });
    setSubmissionLink("");
    setSubmissionError(null);
  };

  const handleParticipateSubmit = async (): Promise<void> => {
    setSubmissionError(null);
    setGeneralError(null);
    if (!participateModal.campaign) {
      setSubmissionError(t("campaign_context_lost", lang));
      return;
    }
    const { data: sessionData } = await supabase.auth.getSession();
    const uid = (sessionData as any)?.session?.user?.id ?? null;
    if (!uid) {
      setSubmissionError(t("must_be_signed_in", lang));
      return;
    }
    if (participateModal.campaign.advertiser_id && participateModal.campaign.advertiser_id === uid) {
      setSubmissionError(t("cannot_participate_own_campaign", lang));
      return;
    }
    const link = submissionLink.trim();
    if (!link) {
      setSubmissionError(t("paste_direct_link_prompt", lang));
      return;
    }
    if (!isValidSocialLink(link)) {
      setSubmissionError(t("invalid_link", lang));
      return;
    }

    setRpcLoading(true);
    try {
      // If this is a resubmit into an existing "revision requested" row, update that row instead.
      if (participateIsResubmit && participateSubmissionId != null) {
        const { error } = await supabase
          .from("campaign_submissions")
          .update({
            submission_link: link,
            status: "pending",
            submitted_at: new Date().toISOString(),
            revision_requested_at: null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", participateSubmissionId);

        if (error) throw error;

        // refresh both lists
        await fetchCampaigns();
        await fetchMySubmissions();
        closeParticipateModal();
        alert(t("resubmission_success", lang));
      } else {
        // Normal path: create new submission and reserve a slot (existing RPC)
        const { error } = await supabase.rpc("reserve_campaign_slot_with_link", {
          p_campaign_id: participateModal.campaign!.id,
          p_submission_link: link,
        });
        if (error) throw error;

        await fetchCampaigns();
        await fetchMySubmissions();
        closeParticipateModal();
        alert(t("participation_success", lang));
      }
    } catch (err: unknown) {
      console.error("participate rpc err", err);
      const msg = (err as any)?.message ?? String(err);
      if (/Creators cannot participate/i.test(msg)) setSubmissionError(t("cannot_participate_own_campaign", lang));
      else if (/No remaining slots/i.test(msg)) setSubmissionError(t("campaign_full", lang));
      else setSubmissionError(msg);
    } finally {
      setRpcLoading(false);
      // cleanup resubmit flags so next open is fresh
      setParticipateIsResubmit(false);
      setParticipateSubmissionId(null);
    }
  };

  // --- resubmit flow ---

  const openResubmit = (submission: Submission): void => {
    setResubmitState({ open: true, submission });
    setResubmitLink(submission.submission_link ?? "");
    setResubmitError(null);
  };

  const closeResubmit = (): void => {
    setResubmitState({ open: false, submission: null });
    setResubmitLink("");
    setResubmitError(null);
  };

  const handleResubmit = async (): Promise<void> => {
    setResubmitError(null);
    setGeneralError(null);
    if (!resubmitState.submission) {
      setResubmitError(t("submission_context_lost", lang));
      return;
    }
    const submissionId = resubmitState.submission.id;
    const link = resubmitLink.trim();
    if (!link) {
      setResubmitError(t("paste_direct_link_prompt", lang));
      return;
    }
    if (!isValidSocialLink(link)) {
      setResubmitError(t("invalid_link", lang));
      return;
    }
    setResubmitLoading(true);
    try {
      const { error } = await supabase
        .from("campaign_submissions")
        .update({
          submission_link: link,
          status: "pending",
          submitted_at: new Date().toISOString(),
          revision_requested_at: null,
        })
        .eq("id", submissionId);
      if (error) throw error;
      await fetchMySubmissions();
      closeResubmit();
      alert(t("resubmission_sent", lang));
    } catch (err: unknown) {
      console.error("resubmit err", err);
      setResubmitError((err as any)?.message ?? String(err));
    } finally {
      setResubmitLoading(false);
    }
  };

  // --- timers helpers ---

  const computeTimersForSubmission = (s: Submission) => {
    const now = new Date(nowTs);
    let revisionRemaining = 0;
    let autoPayoutRemaining = 0;

    if (s.revision_requested_at) {
      const rev = new Date(s.revision_requested_at);
      const revExpiry = new Date(rev.getTime() + 48 * 60 * 60 * 1000); // +48 hours
      revisionRemaining = Math.max(revExpiry.getTime() - now.getTime(), 0);
    }

    if (s.submitted_at) {
      const sub = new Date(s.submitted_at);
      const autoExpiry = new Date(sub.getTime() + 7 * 24 * 60 * 60 * 1000); // +7 days
      autoPayoutRemaining = Math.max(autoExpiry.getTime() - now.getTime(), 0);
    }

    return { revisionRemaining, autoPayoutRemaining };
  };

  const formatMs = (ms: number) => {
    if (ms <= 0) return "0s";
    const totalSec = Math.floor(ms / 1000);
    const d = Math.floor(totalSec / (3600 * 24));
    const h = Math.floor((totalSec % (3600 * 24)) / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    const parts: string[] = [];
    if (d) parts.push(`${d}d`);
    if (h || d) parts.push(`${h}h`);
    if (m || h || d) parts.push(`${m}m`);
    parts.push(`${s}s`);
    return parts.join(" ");
  };

  // --- render ---
  const sectionBorder = "1px solid rgba(255,255,255,0.06)";
  const cardBg = "rgba(255,255,255,0.02)";
  const cardShadow = "0 8px 32px rgba(14,165,233,0.15)";
  const glassBackdrop = "backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px);";

  return (
    <div style={{ width: "100%", boxSizing: "border-box", padding: "24px 0" }}>
      <style>{`
        @keyframes slideInStaggered {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .campaign-item {
          animation: slideInStaggered 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94) both;
        }
        .campaign-item:nth-child(1) { animation-delay: 0.1s; }
        .campaign-item:nth-child(2) { animation-delay: 0.2s; }
        .campaign-item:nth-child(3) { animation-delay: 0.3s; }
        .campaign-item:nth-child(4) { animation-delay: 0.4s; }
        .campaign-item:nth-child(n+5) { animation-delay: 0.5s; }

        .participate-btn {
          position: relative;
          overflow: hidden;
          background: linear-gradient(135deg, #0ea5e9 0%, #38bdf8 100%);
          background-size: 200% 200%;
          transition: all 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94);
        }

        .participate-btn:not(:disabled):hover {
          transform: translateY(-2px);
          box-shadow: 0 0 20px rgba(14,165,233,0.5), 0 8px 16px rgba(14,165,233,0.3);
          background-position: 200% 200%;
        }

        .participate-btn:not(:disabled):active {
          transform: translateY(0);
        }

        .error-message {
          animation: slideInUp 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94);
        }

        @keyframes slideInUp {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @media (max-width: 768px) {
          .campaign-card-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>

      {/* Header */}
      <div style={{ marginBottom: 28, animation: "slideInUp 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 20, flexWrap: "wrap" }}>
          <div>
            <h2 style={{ fontSize: "clamp(24px, 5vw, 32px)", fontWeight: 800, margin: 0, background: "linear-gradient(135deg, #0ea5e9 0%, #38bdf8 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
              {t("active_campaigns", lang)}
            </h2>
            {Object.keys(joinedCampaigns).length > 0 && (
              <p style={{ marginTop: 8, fontSize: "clamp(13px, 2vw, 14px)", color: "rgba(230,238,248,0.7)" }}>
                ✓ {t("participated_in", lang)} {Object.keys(joinedCampaigns).length}{" "}
                {Object.keys(joinedCampaigns).length !== 1 ? t("campaigns", lang) : t("campaign", lang)}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* General Error */}
      {generalError && (
        <div className="error-message" style={{ padding: "14px 16px", borderRadius: 12, background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.4)", color: "#fca5a5", marginBottom: 20, display: "flex", alignItems: "center", gap: 10, backdropFilter: "blur(10px)", fontSize: "13px", fontWeight: 500 }}>
          <AlertIcon />
          <span>{generalError}</span>
        </div>
      )}

      {/* Active Campaigns List */}
      {loading ? (
        <div style={{ padding: 32, textAlign: "center", color: "rgba(230,238,248,0.5)", fontSize: "14px" }}>
          <div style={{ animation: "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite" }}>
            {t("loading", lang)}...
          </div>
        </div>
      ) : campaigns.length === 0 ? (
        <div style={{ padding: 32, textAlign: "center", color: "rgba(230,238,248,0.5)", fontSize: "14px" }}>
          {t("no_active_campaigns", lang)}
        </div>
      ) : (
        <div style={{ marginBottom: 28, display: "flex", flexDirection: "column", gap: 16 }}>
          {campaigns.map((c, idx) => {
            const isOwner = c.advertiser_id && userUid && c.advertiser_id === userUid;
            const userHasRevision = !!(userUid && mySubmissions.find((s) => s.campaign_id === c.id && isRevisionRequested(s.status)));
            const slotsRemaining = c.remaining_slots > 0;

            return (
              <div
                key={c.id}
                className="campaign-item"
                style={{
                  borderRadius: 14,
                  padding: 2,
                  background: "linear-gradient(135deg, rgba(0, 240, 255, 0.12) 0%, rgba(0, 150, 255, 0.08) 50%, rgba(138, 43, 226, 0.06) 100%)",
                }}
              >
                <div
                  style={{
                    background: cardBg,
                    backdropFilter: "blur(20px)",
                    WebkitBackdropFilter: "blur(20px)",
                    border: sectionBorder,
                    borderRadius: 12,
                    padding: "20px",
                    display: "grid",
                    gridTemplateColumns: "1fr auto",
                    gap: 24,
                    alignItems: "start",
                    boxShadow: cardShadow,
                    transition: "all 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)",
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.borderColor = "rgba(14,165,233,0.3)";
                    (e.currentTarget as HTMLElement).style.boxShadow = "0 12px 40px rgba(14,165,233,0.2)";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.borderColor = sectionBorder;
                    (e.currentTarget as HTMLElement).style.boxShadow = cardShadow;
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <h3 style={{ margin: 0, fontSize: "clamp(15px, 4vw, 17px)", fontWeight: 700, color: "#e6eef8", wordBreak: "break-word" }}>{c.title}</h3>
                    <p style={{ marginTop: 8, fontSize: "clamp(12px, 2vw, 13px)", color: "rgba(230,238,248,0.65)", lineHeight: 1.5, wordBreak: "break-word" }}>
                      {c.description || "No description available"}
                    </p>
                    <div style={{ marginTop: 16, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 16 }}>
                      <div>
                        <div style={{ fontSize: "10px", color: "rgba(230,238,248,0.5)", textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.5px", marginBottom: 6 }}>
                          📊 {t("slots", lang)}
                        </div>
                        <div style={{ fontSize: "clamp(13px, 3vw, 16px)", fontWeight: 800, background: "linear-gradient(135deg, #0ea5e9 0%, #38bdf8 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
                          {c.remaining_slots}/{c.total_slots}
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: "10px", color: "rgba(230,238,248,0.5)", textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.5px", marginBottom: 6 }}>
                          💰 {t("reward", lang)}
                        </div>
                        <div style={{ fontSize: "clamp(13px, 3vw, 16px)", fontWeight: 800, color: "#10b981" }}>
                          {c.reward_per_post ? `$${parseFloat(String(c.reward_per_post)).toFixed(2)}` : "TBD"}
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: "10px", color: "rgba(230,238,248,0.5)", textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.5px", marginBottom: 6 }}>
                          {t("status", lang)}
                        </div>
                        <div
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 6,
                            padding: "6px 12px",
                            borderRadius: 8,
                            fontSize: "11px",
                            fontWeight: 700,
                            background: slotsRemaining ? "rgba(16, 185, 129, 0.15)" : "rgba(107, 114, 128, 0.15)",
                            color: slotsRemaining ? "#10b981" : "#9ca3af",
                            border: slotsRemaining ? "1px solid rgba(16, 185, 129, 0.3)" : "1px solid rgba(107, 114, 128, 0.3)",
                            textTransform: "uppercase",
                            letterSpacing: "0.5px",
                          }}
                        >
                          {slotsRemaining ? <CheckCircleIcon /> : null}
                          {slotsRemaining ? t("open", lang) : t("full", lang)}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div style={{ minWidth: "140px", display: "flex", flexDirection: "column", gap: 8 }}>
                    {isOwner ? (
                      <div style={{ padding: "10px 14px", borderRadius: 10, background: "rgba(107, 114, 128, 0.15)", border: "1px solid rgba(107, 114, 128, 0.3)", color: "rgba(230,238,248,0.6)", fontSize: "12px", textAlign: "center", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                        👑 {t("your_campaign", lang)}
                      </div>
                    ) : (
                      <button
                        onClick={() => openParticipateModal(c)}
                        disabled={!(slotsRemaining || userHasRevision)}
                        className="participate-btn"
                        style={{
                          width: "100%",
                          padding: "10px 14px",
                          borderRadius: 10,
                          border: "none",
                          fontWeight: 700,
                          fontSize: "12px",
                          cursor: slotsRemaining || userHasRevision ? "pointer" : "not-allowed",
                          background: slotsRemaining || userHasRevision ? "linear-gradient(135deg, #0ea5e9 0%, #38bdf8 100%)" : "rgba(107, 114, 128, 0.2)",
                          color: slotsRemaining || userHasRevision ? "#fff" : "rgba(230,238,248,0.5)",
                          opacity: !(slotsRemaining || userHasRevision) ? 0.6 : 1,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: 6,
                          textTransform: "uppercase",
                          letterSpacing: "0.5px",
                          boxShadow: slotsRemaining || userHasRevision ? "0 4px 12px rgba(14,165,233,0.3)" : "none",
                        }}
                      >
                        <SendIcon />
                        {slotsRemaining ? t("participate", lang) : userHasRevision ? t("resubmit", lang) : t("full", lang)}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Separator */}
      {campaigns.length > 0 && mySubmissions.length > 0 && (
        <div style={{ height: 1, background: sectionBorder, margin: "36px 0" }} />
      )}

      {/* Your Submissions Section */}
      {mySubmissions.length === 0 ? (
        <div style={{ padding: 28, textAlign: "center", color: "rgba(230,238,248,0.5)", fontSize: "14px", animation: "slideInUp 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94)" }}>
          {t("no_submissions_yet", lang)}
        </div>
      ) : (
        <div style={{ animation: "slideInUp 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94)" }}>
          <h2 style={{ fontSize: "clamp(20px, 5vw, 24px)", fontWeight: 800, margin: "0 0 20px 0", background: "linear-gradient(135deg, #38bdf8 0%, #0ea5e9 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
            📋 {t("your_submissions", lang)}
          </h2>
          {mySubmissions.map((s, idx) => {
            const { revisionRemaining, autoPayoutRemaining } = computeTimersForSubmission(s);
            const showRevisionTimer = isRevisionRequested(s.status) && revisionRemaining > 0;
            const showAutoPayoutTimer = s.status === "pending" && autoPayoutRemaining > 0;
            const showAutoPayoutExpired = s.status === "pending" && autoPayoutRemaining <= 0;
            const campaignTitle = joinedCampaigns[s.campaign_id] ?? `Campaign ${s.campaign_id}`;

            return (
              <div
                key={s.id}
                className="campaign-item"
                style={{
                  borderRadius: 14,
                  padding: 2,
                  background: "linear-gradient(135deg, rgba(0, 240, 255, 0.12) 0%, rgba(0, 150, 255, 0.08) 50%, rgba(138, 43, 226, 0.06) 100%)",
                  marginBottom: 16,
                }}
              >
                <div
                  style={{
                    background: cardBg,
                    backdropFilter: "blur(20px)",
                    WebkitBackdropFilter: "blur(20px)",
                    border: sectionBorder,
                    borderRadius: 12,
                    padding: 20,
                    display: "grid",
                    gridTemplateColumns: "1fr auto",
                    gap: 24,
                    alignItems: "start",
                    boxShadow: cardShadow,
                    transition: "all 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)",
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.borderColor = "rgba(14,165,233,0.3)";
                    (e.currentTarget as HTMLElement).style.boxShadow = "0 12px 40px rgba(14,165,233,0.2)";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.borderColor = sectionBorder;
                    (e.currentTarget as HTMLElement).style.boxShadow = cardShadow;
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <h3 style={{ margin: 0, fontSize: "clamp(15px, 4vw, 17px)", fontWeight: 700, color: "#e6eef8", wordBreak: "break-word" }}>
                      {campaignTitle}
                    </h3>
                    <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 16 }}>
                      <div>
                        <div style={{ fontSize: "10px", color: "rgba(230,238,248,0.5)", textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.5px", marginBottom: 6 }}>
                          ✓ {t("status_label", lang)}
                        </div>
                        <div style={{ fontSize: "clamp(12px, 3vw, 14px)", fontWeight: 700, color: "#e6eef8", textTransform: "capitalize" }}>
                          {s.status}
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: "10px", color: "rgba(230,238,248,0.5)", textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.5px", marginBottom: 6 }}>
                          🔗 {t("link_label", lang)}
                        </div>
                        <div style={{ marginTop: 4 }}>
                          {s.submission_link ? (
                            <a
                              href={s.submission_link}
                              target="_blank"
                              rel="noreferrer"
                              style={{ color: "#0ea5e9", fontSize: "12px", fontWeight: 700, textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 4, transition: "all 0.3s ease" }}
                              onMouseEnter={(e) => {
                                (e.target as HTMLAnchorElement).style.gap = "6px";
                              }}
                              onMouseLeave={(e) => {
                                (e.target as HTMLAnchorElement).style.gap = "4px";
                              }}
                            >
                              {t("view", lang)} →
                            </a>
                          ) : (
                            <span style={{ fontSize: "12px", color: "rgba(230,238,248,0.4)" }}>—</span>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => navigate(`/campaigns/${s.campaign_id}`)}
                        style={{
                          padding: "6px 10px",
                          borderRadius: 8,
                          border: "1px solid rgba(14, 165, 233, 0.3)",
                          background: "rgba(14, 165, 233, 0.08)",
                          color: "#0ea5e9",
                          fontSize: "11px",
                          fontWeight: 700,
                          cursor: "pointer",
                          textTransform: "uppercase",
                          letterSpacing: "0.5px",
                          transition: "all 0.3s ease",
                        }}
                        onMouseEnter={(e) => {
                          (e.target as HTMLButtonElement).style.background = "rgba(14, 165, 233, 0.15)";
                          (e.target as HTMLButtonElement).style.borderColor = "rgba(14, 165, 233, 0.5)";
                        }}
                        onMouseLeave={(e) => {
                          (e.target as HTMLButtonElement).style.background = "rgba(14, 165, 233, 0.08)";
                          (e.target as HTMLButtonElement).style.borderColor = "rgba(14, 165, 233, 0.3)";
                        }}
                      >
                        {t("view_campaign_details", lang)}
                      </button>
                    </div>
                  </div>

                  <div style={{ minWidth: "160px", textAlign: "right", display: "flex", flexDirection: "column", justifyContent: "center" }}>
                    {isRevisionRequested(s.status) && (
                      <div style={{ animation: "slideInUp 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94) both", animationDelay: "0.2s" }}>
                        <div style={{ fontSize: "10px", color: "rgba(230,238,248,0.5)", textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.5px", marginBottom: 6 }}>
                          ⏰ {t("time_to_resubmit", lang)}
                        </div>
                        <div style={{ fontSize: "clamp(16px, 4vw, 20px)", fontWeight: 900, color: showRevisionTimer ? "#f59e0b" : "rgba(230,238,248,0.4)", fontVariantNumeric: "tabular-nums" }}>
                          {showRevisionTimer ? formatMs(revisionRemaining) : t("expired", lang)}
                        </div>
                        {showRevisionTimer ? (
                          <button
                            onClick={() => openResubmit(s)}
                            style={{
                              marginTop: 10,
                              width: "100%",
                              padding: "8px 12px",
                              borderRadius: 10,
                              border: "1px solid rgba(245,158,11,0.3)",
                              background: "linear-gradient(135deg, rgba(245,158,11,0.2) 0%, rgba(251,191,36,0.2) 100%)",
                              color: "#fbbf24",
                              fontWeight: 700,
                              fontSize: "11px",
                              cursor: "pointer",
                              textTransform: "uppercase",
                              letterSpacing: "0.5px",
                              transition: "all 0.3s ease",
                            }}
                            onMouseEnter={(e) => {
                              (e.target as HTMLButtonElement).style.background = "linear-gradient(135deg, rgba(245,158,11,0.3) 0%, rgba(251,191,36,0.3) 100%)";
                              (e.target as HTMLButtonElement).style.borderColor = "rgba(245,158,11,0.5)";
                              (e.target as HTMLButtonElement).style.boxShadow = "0 4px 12px rgba(245,158,11,0.2)";
                            }}
                            onMouseLeave={(e) => {
                              (e.target as HTMLButtonElement).style.background = "linear-gradient(135deg, rgba(245,158,11,0.2) 0%, rgba(251,191,36,0.2) 100%)";
                              (e.target as HTMLButtonElement).style.borderColor = "rgba(245,158,11,0.3)";
                              (e.target as HTMLButtonElement).style.boxShadow = "none";
                            }}
                          >
                            {t("resubmit", lang)}
                          </button>
                        ) : (
                          <div style={{ marginTop: 10, fontSize: "11px", color: "rgba(230,238,248,0.4)", fontStyle: "italic" }}>
                            {t("revision_window_expired", lang)}
                          </div>
                        )}
                      </div>
                    )}

                    {s.status === "pending" && (
                      <div style={{ animation: "slideInUp 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94) both", animationDelay: "0.3s" }}>
                        <div style={{ fontSize: "10px", color: "rgba(230,238,248,0.5)", textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.5px", marginBottom: 6 }}>
                          💸 {t("auto_payout", lang)}
                        </div>
                        <div style={{ fontSize: "clamp(14px, 4vw, 18px)", fontWeight: 900, background: "linear-gradient(135deg, #10b981 0%, #059669 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text", fontVariantNumeric: "tabular-nums" }}>
                          {showAutoPayoutTimer ? formatMs(autoPayoutRemaining) : showAutoPayoutExpired ? t("processing", lang) : "—"}
                        </div>
                        <div style={{ marginTop: 6, fontSize: "10px", color: "rgba(230,238,248,0.4)", lineHeight: 1.4 }}>
                          {t("auto_payout_info", lang)}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Participate Modal */}
      {participateModal.open && participateModal.campaign && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            backdropFilter: "blur(8px)",
            WebkitBackdropFilter: "blur(8px)",
            animation: "fadeIn 0.3s ease-out",
            padding: "20px",
          }}
          onClick={closeParticipateModal}
        >
          <div
            style={{
              background: cardBg,
              backdropFilter: "blur(20px)",
              WebkitBackdropFilter: "blur(20px)",
              border: sectionBorder,
              borderRadius: 16,
              padding: 28,
              maxWidth: 500,
              width: "100%",
              boxShadow: "0 20px 60px rgba(14,165,233,0.2)",
              animation: "slideInUp 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ margin: 0, fontSize: "clamp(18px, 5vw, 22px)", fontWeight: 800, background: "linear-gradient(135deg, #0ea5e9 0%, #38bdf8 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text", marginBottom: 12 }}>
              {t("participate_in", lang)}
            </h3>
            <p style={{ margin: "0 0 20px 0", fontSize: "13px", color: "rgba(230,238,248,0.7)", lineHeight: 1.5 }}>
              {t("paste_direct_link_instructions_part1", lang)} <strong style={{ color: "#0ea5e9" }}>{t("direct", lang)}</strong> {t("paste_direct_link_instructions_part2", lang)}
            </p>

            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: "rgba(230,238,248,0.7)", display: "block", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                {t("submission_link_label", lang)}
              </label>
              <input
                type="url"
                value={submissionLink}
                onChange={(e) => setSubmissionLink(e.target.value)}
                placeholder="https://instagram.com/p/..."
                disabled={rpcLoading}
                style={{
                  width: "100%",
                  padding: "12px 14px",
                  borderRadius: 10,
                  border: "1px solid rgba(255,255,255,0.1)",
                  background: "rgba(255,255,255,0.04)",
                  color: "#e6eef8",
                  fontSize: "13px",
                  boxSizing: "border-box",
                  transition: "all 0.3s ease",
                  backdropFilter: "blur(10px)",
                }}
                onFocus={(e) => {
                  (e.target as HTMLInputElement).style.borderColor = "rgba(14,165,233,0.5)";
                  (e.target as HTMLInputElement).style.background = "rgba(14,165,233,0.1)";
                }}
                onBlur={(e) => {
                  (e.target as HTMLInputElement).style.borderColor = "rgba(255,255,255,0.1)";
                  (e.target as HTMLInputElement).style.background = "rgba(255,255,255,0.04)";
                }}
              />
              {submissionError && (
                <div style={{ marginTop: 8, fontSize: 12, color: "#fca5a5", display: "flex", alignItems: "center", gap: 6, padding: "8px 12px", background: "rgba(239,68,68,0.1)", borderRadius: 8, border: "1px solid rgba(239,68,68,0.2)", animation: "slideInUp 0.3s ease-out" }}>
                  <AlertIcon />
                  {submissionError}
                </div>
              )}
            </div>

            <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
              <button
                onClick={closeParticipateModal}
                disabled={rpcLoading}
                style={{
                  padding: "10px 18px",
                  borderRadius: 10,
                  border: "1px solid rgba(255,255,255,0.15)",
                  background: "rgba(255,255,255,0.04)",
                  color: "rgba(230,238,248,0.8)",
                  fontWeight: 700,
                  cursor: rpcLoading ? "not-allowed" : "pointer",
                  fontSize: "12px",
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                  transition: "all 0.3s ease",
                  opacity: rpcLoading ? 0.6 : 1,
                }}
                onMouseEnter={(e) => {
                  if (!rpcLoading) {
                    (e.target as HTMLButtonElement).style.borderColor = "rgba(255,255,255,0.3)";
                    (e.target as HTMLButtonElement).style.background = "rgba(255,255,255,0.08)";
                  }
                }}
                onMouseLeave={(e) => {
                  (e.target as HTMLButtonElement).style.borderColor = "rgba(255,255,255,0.15)";
                  (e.target as HTMLButtonElement).style.background = "rgba(255,255,255,0.04)";
                }}
              >
                {t("cancel", lang)}
              </button>
              <button
                onClick={handleParticipateSubmit}
                disabled={rpcLoading}
                style={{
                  padding: "10px 18px",
                  borderRadius: 10,
                  border: "none",
                  background: rpcLoading ? "linear-gradient(135deg, rgba(14,165,233,0.5) 0%, rgba(56,189,248,0.5) 100%)" : "linear-gradient(135deg, #0ea5e9 0%, #38bdf8 100%)",
                  color: "#fff",
                  fontWeight: 700,
                  cursor: rpcLoading ? "not-allowed" : "pointer",
                  fontSize: "12px",
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                  boxShadow: "0 4px 12px rgba(14,165,233,0.3)",
                  transition: "all 0.3s ease",
                  opacity: rpcLoading ? 0.8 : 1,
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
                onMouseEnter={(e) => {
                  if (!rpcLoading) {
                    (e.target as HTMLButtonElement).style.boxShadow = "0 8px 20px rgba(14,165,233,0.5)";
                    (e.target as HTMLButtonElement).style.transform = "translateY(-2px)";
                  }
                }}
                onMouseLeave={(e) => {
                  (e.target as HTMLButtonElement).style.boxShadow = "0 4px 12px rgba(14,165,233,0.3)";
                  (e.target as HTMLButtonElement).style.transform = "translateY(0)";
                }}
              >
                <SendIcon />
                {rpcLoading ? t("submitting", lang) : participateIsResubmit ? t("resubmit", lang) : t("submit_and_reserve_slot", lang)}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Resubmit Modal */}
      {resubmitState.open && resubmitState.submission && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            backdropFilter: "blur(8px)",
            WebkitBackdropFilter: "blur(8px)",
            animation: "fadeIn 0.3s ease-out",
            padding: "20px",
          }}
          onClick={closeResubmit}
        >
          <div
            style={{
              background: cardBg,
              backdropFilter: "blur(20px)",
              WebkitBackdropFilter: "blur(20px)",
              border: sectionBorder,
              borderRadius: 16,
              padding: 28,
              maxWidth: 500,
              width: "100%",
              boxShadow: "0 20px 60px rgba(14,165,233,0.2)",
              animation: "slideInUp 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ margin: 0, fontSize: "clamp(18px, 5vw, 22px)", fontWeight: 800, background: "linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text", marginBottom: 12 }}>
              {t("resubmit_for_campaign", lang)}
            </h3>
            <p style={{ margin: "0 0 20px 0", fontSize: "13px", color: "rgba(230,238,248,0.7)", lineHeight: 1.5 }}>
              {t("resubmit_instructions", lang)}
            </p>

            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: "rgba(230,238,248,0.7)", display: "block", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                {t("new_submission_link", lang)}
              </label>
              <input
                type="url"
                value={resubmitLink}
                onChange={(e) => setResubmitLink(e.target.value)}
                placeholder="https://instagram.com/p/..."
                disabled={resubmitLoading}
                style={{
                  width: "100%",
                  padding: "12px 14px",
                  borderRadius: 10,
                  border: "1px solid rgba(255,255,255,0.1)",
                  background: "rgba(255,255,255,0.04)",
                  color: "#e6eef8",
                  fontSize: "13px",
                  boxSizing: "border-box",
                  transition: "all 0.3s ease",
                  backdropFilter: "blur(10px)",
                }}
                onFocus={(e) => {
                  (e.target as HTMLInputElement).style.borderColor = "rgba(245,158,11,0.5)";
                  (e.target as HTMLInputElement).style.background = "rgba(245,158,11,0.1)";
                }}
                onBlur={(e) => {
                  (e.target as HTMLInputElement).style.borderColor = "rgba(255,255,255,0.1)";
                  (e.target as HTMLInputElement).style.background = "rgba(255,255,255,0.04)";
                }}
              />
              {resubmitError && (
                <div style={{ marginTop: 8, fontSize: 12, color: "#fca5a5", display: "flex", alignItems: "center", gap: 6, padding: "8px 12px", background: "rgba(239,68,68,0.1)", borderRadius: 8, border: "1px solid rgba(239,68,68,0.2)", animation: "slideInUp 0.3s ease-out" }}>
                  <AlertIcon />
                  {resubmitError}
                </div>
              )}
            </div>

            <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
              <button
                onClick={closeResubmit}
                disabled={resubmitLoading}
                style={{
                  padding: "10px 18px",
                  borderRadius: 10,
                  border: "1px solid rgba(255,255,255,0.15)",
                  background: "rgba(255,255,255,0.04)",
                  color: "rgba(230,238,248,0.8)",
                  fontWeight: 700,
                  cursor: resubmitLoading ? "not-allowed" : "pointer",
                  fontSize: "12px",
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                  transition: "all 0.3s ease",
                  opacity: resubmitLoading ? 0.6 : 1,
                }}
                onMouseEnter={(e) => {
                  if (!resubmitLoading) {
                    (e.target as HTMLButtonElement).style.borderColor = "rgba(255,255,255,0.3)";
                    (e.target as HTMLButtonElement).style.background = "rgba(255,255,255,0.08)";
                  }
                }}
                onMouseLeave={(e) => {
                  (e.target as HTMLButtonElement).style.borderColor = "rgba(255,255,255,0.15)";
                  (e.target as HTMLButtonElement).style.background = "rgba(255,255,255,0.04)";
                }}
              >
                {t("cancel", lang)}
              </button>
              <button
                onClick={handleResubmit}
                disabled={resubmitLoading}
                style={{
                  padding: "10px 18px",
                  borderRadius: 10,
                  border: "none",
                  background: resubmitLoading ? "linear-gradient(135deg, rgba(245,158,11,0.5) 0%, rgba(251,191,36,0.5) 100%)" : "linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)",
                  color: "#fff",
                  fontWeight: 700,
                  cursor: resubmitLoading ? "not-allowed" : "pointer",
                  fontSize: "12px",
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                  boxShadow: "0 4px 12px rgba(245,158,11,0.3)",
                  transition: "all 0.3s ease",
                  opacity: resubmitLoading ? 0.8 : 1,
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
                onMouseEnter={(e) => {
                  if (!resubmitLoading) {
                    (e.target as HTMLButtonElement).style.boxShadow = "0 8px 20px rgba(245,158,11,0.5)";
                    (e.target as HTMLButtonElement).style.transform = "translateY(-2px)";
                  }
                }}
                onMouseLeave={(e) => {
                  (e.target as HTMLButtonElement).style.boxShadow = "0 4px 12px rgba(245,158,11,0.3)";
                  (e.target as HTMLButtonElement).style.transform = "translateY(0)";
                }}
              >
                <SendIcon />
                {resubmitLoading ? t("resubmitting", lang) : t("resubmit", lang)}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
