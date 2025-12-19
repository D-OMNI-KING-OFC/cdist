import React, { useEffect, useState } from "react";
import "./Components.enhanced.css";
import { supabase } from "../lib/supabaseClient";
import { t } from "../i18n/index";

type AdRequest = {
  id?: number;
  title?: string | null;
  reward_per_post?: string | number | null;
  advertiser_id?: string | null;
};

type Submission = {
  id: number;
  campaign_id: number;
  creator_id: string | null;
  submission_link: string | null;
  status: "pending" | "approved" | "revision_requested" | "auto_paid" | "rejected" | string;
  submitted_at: string | null;
  approved_at?: string | null;
  revision_requested_at?: string | null;
  payout_amount?: string | number | null;
  auto_paid?: boolean | null;
  ad_requests?: AdRequest | null;
};
 
type bdprops = {
  lang: string
}

export default function BrandSubmissions({lang}: bdprops): React.ReactElement {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [processingIds, setProcessingIds] = useState<Record<number, boolean>>({});
  const [userId, setUserId] = useState<string | null>(null);

  // Helper: fetch current session user id and set it
  const loadSessionUser = async () => {
    try {
      const sessionResp = await supabase.auth.getSession();
      const session = sessionResp?.data?.session;
      const id = session?.user?.id ?? null;
      setUserId(id);
      return id;
    } catch (err) {
      console.error("loadSessionUser error:", err);
      setUserId(null);
      return null;
    }
  };

  // Fetch submissions where the current user is the advertiser for the ad_request.
  const fetchSubmissions = async () => {
    setLoading(true);
    setGeneralError(null);

    try {
      const id = await loadSessionUser();

      if (!id) {
        setSubmissions([]);
        setGeneralError(t("signInToView", lang));
        return;
      }

      // Force an inner join so only rows that belong to this advertiser come back
      const resp = await supabase
        .from("campaign_submissions")
        .select("*, ad_requests!inner(id,title,reward_per_post,advertiser_id)")
        .eq("ad_requests.advertiser_id", id)
        .order("submitted_at", { ascending: true })
        .limit(1000);

      if (resp.error) throw resp.error;
      const data = (resp.data as any) as Submission[];
      setSubmissions(data ?? []);
    } catch (err: any) {
      console.error("fetchSubmissions error:", err);
      setGeneralError(err?.message ?? String(err));
      setSubmissions([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubmissions();

    // subscribe to changes to keep UI fresh
    const channel: any = supabase
      .channel("public:campaign_submissions")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "campaign_submissions" },
        () => {
          fetchSubmissions();
        }
      )
      .subscribe();

    return () => {
      // remove subscription
      try {
        // newer supabase libs use channel.unsubscribe(); older ones use removeChannel
        if (channel?.unsubscribe) channel.unsubscribe();
        else supabase.removeChannel?.(channel);
      } catch (e) {
        // ignore
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Approve submission -> call RPC approve_submission with param p_submission_id
  const approveSubmission = async (submissionId: number, adRequestOwnerId?: string | null) => {
    if (!window.confirm(t("confirm_approve_submission", lang))) {
      return;
    }

    // extra guard: ensure current user is owner
    if (!userId || userId !== adRequestOwnerId) {
      setGeneralError(t("not_authorized_to_approve", lang));
      return;
    }

    setProcessingIds((p) => ({ ...p, [submissionId]: true }));
    setGeneralError(null);

    try {
      // RPC param name is p_submission_id per DB function signature
      const { data, error } = await supabase.rpc("approve_submission", { p_submission_id: submissionId });

      if (error) throw error;

      await fetchSubmissions();
      alert(t("submission_approved_and_paid", lang));
    } catch (err: any) {
      console.error("approveSubmission error:", err);
      setGeneralError(err?.message ?? String(err));
    } finally {
      setProcessingIds((p) => ({ ...p, [submissionId]: false }));
    }
  };

  // Request revision -> call DB RPC directly (no Edge function)
  const requestRevision = async (submission: Submission) => {
    if (!window.confirm(t("confirm_request_revision", lang))) return;

    // guard: only advertiser can request
    if (!userId || userId !== submission.ad_requests?.advertiser_id) {
      setGeneralError(t("not_authorized_to_request_revision", lang));
      return;
    }

    setProcessingIds((p) => ({ ...p, [submission.id]: true }));
    setGeneralError(null);

    try {
      const { error } = await supabase.rpc("request_revision_for_submission", { p_submission_id: submission.id });
      if (error) throw error;

      await fetchSubmissions();
      alert(t("revision_requested_informed", lang));
    } catch (err: any) {
      console.error("requestRevision error:", err);
      setGeneralError(err?.message ?? String(err));
    } finally {
      setProcessingIds((p) => ({ ...p, [submission.id]: false }));
    }
  };

  // Reject submission -> call RPC rpc_reject_campaign_submission
  const rejectSubmission = async (submission: Submission) => {
    if (!window.confirm(t("confirm_reject_submission", lang))) return;

    if (!userId || userId !== submission.ad_requests?.advertiser_id) {
      setGeneralError(t("not_authorized_to_reject", lang));
      return;
    }

    setProcessingIds((p) => ({ ...p, [submission.id]: true }));
    setGeneralError(null);

    try {
      // DB function name is rpc_reject_campaign_submission
      const { data, error } = await supabase.rpc("rpc_reject_campaign_submission", { p_submission_id: submission.id });

      if (error) throw error;

      await fetchSubmissions();
      alert(t("submission_rejected_and_slot_reopened", lang));
    } catch (err: any) {
      console.error("rejectSubmission error:", err);
      setGeneralError(err?.message ?? String(err));
    } finally {
      setProcessingIds((p) => ({ ...p, [submission.id]: false }));
    }
  };

  // Handles timers (revision expiry and 7-day auto payout) - triggers server RPCs if they expire
  const processTimers = async (submission: Submission) => {
    try {
      const now = new Date();

      // 48h revision expiry
      if (submission.status === "revision_requested" && submission.revision_requested_at) {
        const expiry = new Date(submission.revision_requested_at);
        expiry.setHours(expiry.getHours() + 48);
        if (now >= expiry) {
          // call server-side helper to mark rejected and free slot
          const { error } = await supabase.rpc("_reject_submission_if_not_updated", { p_submission_id: submission.id });
          if (error) console.warn("handle_revision_expiry warning:", error);
          else await fetchSubmissions();
        }
      }

      // 7-day auto payout for pending submissions
      if (submission.status === "pending" && submission.submitted_at) {
        const expiry = new Date(submission.submitted_at);
        expiry.setDate(expiry.getDate() + 7);
        if (now >= expiry) {
          const { error } = await supabase.rpc("auto_payout_submission", { p_submission_id: submission.id });
          if (error) console.warn("auto_payout_submission warning:", error);
          else await fetchSubmissions();
        }
      }
    } catch (err: any) {
      console.error("processTimers error:", err);
    }
  };

  // timer tick to check expiries
  const [nowTick, setNowTick] = useState<number>(Date.now());
  useEffect(() => {
    const interval = setInterval(() => setNowTick(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!submissions || submissions.length === 0) return;
    submissions.forEach((s) => {
      processTimers(s);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nowTick, submissions]);

  const getTimerMs = (submission: Submission): number => {
    const nowDate = new Date();
    if (submission.status === "revision_requested" && submission.revision_requested_at) {
      const expiry = new Date(submission.revision_requested_at);
      expiry.setHours(expiry.getHours() + 48);
      return Math.max(expiry.getTime() - nowDate.getTime(), 0);
    }
    if (submission.status === "pending" && submission.submitted_at) {
      const expiry = new Date(submission.submitted_at);
      expiry.setDate(expiry.getDate() + 7);
      return Math.max(expiry.getTime() - nowDate.getTime(), 0);
    }
    return 0;
  };

  const formatTimer = (ms: number) => {
    if (ms <= 0) return t("expired", lang);
    const totalSec = Math.floor(ms / 1000);
    const d = Math.floor(totalSec / (3600 * 24));
    const h = Math.floor((totalSec % (3600 * 24)) / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    // keep the compact numeric formatting; units remain as single letters for now
    return `${d}d ${h}h ${m}m ${s}s`;
  };

  return (
    <div style={{ width: "100%", boxSizing: "border-box", padding: "0 0 24px 0" }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 24, fontWeight: 800, margin: 0, color: "#e6eef8" }}>
          {t("brandSubmissions", lang)}
        </h2>
        <p style={{ margin: "8px 0 0 0", fontSize: 13, color: "rgba(230,238,248,0.6)" }}>
          {submissions.length} {submissions.length !== 1 ? "submissions" : "submission"}
        </p>
      </div>

      {/* Error Alert */}
      {generalError && (
        <div
          style={{
            padding: 12,
            borderRadius: 8,
            background: "rgba(239,68,68,0.1)",
            border: "1px solid rgba(239,68,68,0.3)",
            color: "#fca5a5",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 16,
          }}
          role="alert"
        >
          <span>{generalError}</span>
          <button
            onClick={() => setGeneralError(null)}
            style={{
              background: "none",
              border: "none",
              color: "#fca5a5",
              cursor: "pointer",
              fontSize: 16,
              padding: 0,
            }}
          >
            ×
          </button>
        </div>
      )}

      {/* Loading State */}
      {loading ? (
        <div style={{ padding: 40, textAlign: "center", color: "rgba(230,238,248,0.5)" }}>
          <div style={{ fontSize: 14, fontWeight: 500 }}>{t("loadingSubmissions", lang)}</div>
        </div>
      ) : submissions.length === 0 ? (
        <div style={{ padding: 40, textAlign: "center", color: "rgba(230,238,248,0.5)" }}>
          <div style={{ fontSize: 14, fontWeight: 500 }}>{t("noSubmissions", lang)}</div>
        </div>
      ) : (
        /* Submissions Table */
        <div style={{ overflowX: "auto" }}>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: 13,
            }}
          >
            <thead>
              <tr
                style={{
                  borderBottom: "1px solid rgba(255,255,255,0.06)",
                  backgroundColor: "rgba(255,255,255,0.02)",
                }}
              >
                <th
                  style={{
                    padding: "12px 16px",
                    textAlign: "left",
                    fontWeight: 600,
                    color: "rgba(230,238,248,0.6)",
                    textTransform: "uppercase",
                    fontSize: 11,
                    letterSpacing: "0.5px",
                  }}
                >
                  {t("campaign", lang)}
                </th>
                <th
                  style={{
                    padding: "12px 16px",
                    textAlign: "left",
                    fontWeight: 600,
                    color: "rgba(230,238,248,0.6)",
                    textTransform: "uppercase",
                    fontSize: 11,
                    letterSpacing: "0.5px",
                  }}
                >
                  {t("creatorId", lang) || "Creator"}
                </th>
                <th
                  style={{
                    padding: "12px 16px",
                    textAlign: "left",
                    fontWeight: 600,
                    color: "rgba(230,238,248,0.6)",
                    textTransform: "uppercase",
                    fontSize: 11,
                    letterSpacing: "0.5px",
                  }}
                >
                  {t("status", lang)}
                </th>
                <th
                  style={{
                    padding: "12px 16px",
                    textAlign: "left",
                    fontWeight: 600,
                    color: "rgba(230,238,248,0.6)",
                    textTransform: "uppercase",
                    fontSize: 11,
                    letterSpacing: "0.5px",
                  }}
                >
                  {t("link", lang)}
                </th>
                <th
                  style={{
                    padding: "12px 16px",
                    textAlign: "left",
                    fontWeight: 600,
                    color: "rgba(230,238,248,0.6)",
                    textTransform: "uppercase",
                    fontSize: 11,
                    letterSpacing: "0.5px",
                  }}
                >
                  {t("timer", lang)}
                </th>
                <th
                  style={{
                    padding: "12px 16px",
                    textAlign: "right",
                    fontWeight: 600,
                    color: "rgba(230,238,248,0.6)",
                    textTransform: "uppercase",
                    fontSize: 11,
                    letterSpacing: "0.5px",
                  }}
                >
                  {t("actions", lang)}
                </th>
              </tr>
            </thead>
            <tbody>
              {submissions.map((s, idx) => {
                const remainingMs = getTimerMs(s);
                const isRevisionExpired = s.status === "revision_requested" && remainingMs <= 0;
                const isAutoPay = s.status === "pending" && remainingMs <= 0;
                const isProcessing = !!processingIds[s.id];
                const ownerId = s.ad_requests?.advertiser_id ?? null;
                const showActions = !!userId && userId === ownerId;

                const statusColor =
                  s.status === "approved"
                    ? "#10b981"
                    : s.status === "revision_requested"
                    ? "#f59e0b"
                    : s.status === "auto_paid"
                    ? "#06b6d4"
                    : s.status === "rejected"
                    ? "#ef4444"
                    : "#6366f1";

                const displayStatus = isAutoPay ? t("auto_paid", lang) : t(String(s.status ?? ""), lang);

                return (
                  <tr
                    key={s.id}
                    style={{
                      borderBottom: "1px solid rgba(255,255,255,0.03)",
                      backgroundColor: isRevisionExpired ? "rgba(239,68,68,0.05)" : idx % 2 === 0 ? "transparent" : "rgba(255,255,255,0.01)",
                      transition: "background-color 200ms ease",
                    }}
                  >
                    <td style={{ padding: "12px 16px", color: "#e6eef8", fontWeight: 500 }}>
                      {s.ad_requests?.title ?? `Campaign #${s.campaign_id}`}
                    </td>
                    <td style={{ padding: "12px 16px", color: "rgba(230,238,248,0.7)", fontSize: 12, fontFamily: "monospace" }}>
                      {s.creator_id ? s.creator_id.slice(0, 8) + "..." : "—"}
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      <span
                        style={{
                          display: "inline-block",
                          padding: "4px 8px",
                          borderRadius: 6,
                          fontSize: 11,
                          fontWeight: 600,
                          backgroundColor: `${statusColor}20`,
                          color: statusColor,
                          textTransform: "capitalize",
                        }}
                      >
                        {displayStatus}
                      </span>
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      {s.submission_link ? (
                        <a
                          href={s.submission_link}
                          target="_blank"
                          rel="noreferrer"
                          style={{
                            color: "#0ea5e9",
                            textDecoration: "none",
                            fontWeight: 600,
                            fontSize: 12,
                          }}
                        >
                          View →
                        </a>
                      ) : (
                        <span style={{ color: "rgba(230,238,248,0.4)" }}>—</span>
                      )}
                    </td>
                    <td
                      style={{
                        padding: "12px 16px",
                        color: remainingMs > 0 ? "#fbbf24" : "rgba(230,238,248,0.4)",
                        fontFamily: "monospace",
                        fontSize: 12,
                        fontWeight: 600,
                      }}
                    >
                      {remainingMs > 0 ? formatTimer(remainingMs) : t("expired", lang)}
                    </td>
                    <td style={{ padding: "12px 16px", textAlign: "right" }}>
                      <div style={{ display: "flex", gap: 6, justifyContent: "flex-end", flexWrap: "wrap" }}>
                        {showActions && s.status === "pending" && remainingMs > 0 && (
                          <>
                            <button
                              onClick={() => approveSubmission(s.id, ownerId)}
                              disabled={isProcessing}
                              style={{
                                padding: "6px 10px",
                                borderRadius: 6,
                                border: "1px solid #10b981",
                                background: "rgba(16,185,129,0.1)",
                                color: "#10b981",
                                fontWeight: 600,
                                fontSize: 11,
                                cursor: isProcessing ? "not-allowed" : "pointer",
                                opacity: isProcessing ? 0.5 : 1,
                                transition: "all 200ms ease",
                              }}
                              onMouseEnter={(e) => {
                                if (!isProcessing) {
                                  (e.target as HTMLButtonElement).style.background = "rgba(16,185,129,0.2)";
                                }
                              }}
                              onMouseLeave={(e) => {
                                (e.target as HTMLButtonElement).style.background = "rgba(16,185,129,0.1)";
                              }}
                            >
                              {isProcessing ? t("processing", lang) : t("approve", lang)}
                            </button>

                            <button
                              onClick={() => requestRevision(s)}
                              disabled={isProcessing}
                              style={{
                                padding: "6px 10px",
                                borderRadius: 6,
                                border: "1px solid #f59e0b",
                                background: "rgba(245,158,11,0.1)",
                                color: "#f59e0b",
                                fontWeight: 600,
                                fontSize: 11,
                                cursor: isProcessing ? "not-allowed" : "pointer",
                                opacity: isProcessing ? 0.5 : 1,
                                transition: "all 200ms ease",
                              }}
                              onMouseEnter={(e) => {
                                if (!isProcessing) {
                                  (e.target as HTMLButtonElement).style.background = "rgba(245,158,11,0.2)";
                                }
                              }}
                              onMouseLeave={(e) => {
                                (e.target as HTMLButtonElement).style.background = "rgba(245,158,11,0.1)";
                              }}
                            >
                              {t("request_revision", lang)}
                            </button>

                            <button
                              onClick={() => rejectSubmission(s)}
                              disabled={isProcessing}
                              style={{
                                padding: "6px 10px",
                                borderRadius: 6,
                                border: "1px solid #ef4444",
                                background: "rgba(239,68,68,0.1)",
                                color: "#ef4444",
                                fontWeight: 600,
                                fontSize: 11,
                                cursor: isProcessing ? "not-allowed" : "pointer",
                                opacity: isProcessing ? 0.5 : 1,
                                transition: "all 200ms ease",
                              }}
                              onMouseEnter={(e) => {
                                if (!isProcessing) {
                                  (e.target as HTMLButtonElement).style.background = "rgba(239,68,68,0.2)";
                                }
                              }}
                              onMouseLeave={(e) => {
                                (e.target as HTMLButtonElement).style.background = "rgba(239,68,68,0.1)";
                              }}
                            >
                              {t("reject", lang)}
                            </button>
                          </>
                        )}

                        {!showActions && s.status === "revision_requested" && remainingMs > 0 && (
                          <span style={{ fontSize: 11, color: "rgba(230,238,248,0.5)" }}>
                            {t("awaiting_revision", lang)}
                          </span>
                        )}

                        {(isRevisionExpired || isAutoPay) && (
                          <span style={{ fontSize: 11, color: "rgba(230,238,248,0.4)" }}>
                            {t("no_action_timer_expired", lang)}
                          </span>
                        )}

                        {(s.status === "approved" || s.status === "auto_paid" || s.status === "rejected") && (
                          <span style={{ fontSize: 11, color: "rgba(230,238,248,0.5)" }}>
                            {displayStatus}
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
