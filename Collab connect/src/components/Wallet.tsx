// src/components/Wallet.tsx

import { useEffect, useState } from "react";
import "./Components.enhanced.css";
import { supabase } from "../lib/supabaseClient";
import { t } from "../i18n/index";

// Professional Icons as inline SVGs
const WalletIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="1"></circle>
    <path d="M21 9a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2v-6a2 2 0 0 1 2-2M3 7a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h18a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2"></path>
  </svg>
);

const TrendingIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="23 6 13.5 15.5 8.5 10.5 1 17"></polyline>
    <polyline points="17 6 23 6 23 12"></polyline>
  </svg>
);

const CheckIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="20 6 9 17 4 12"></polyline>
  </svg>
);

const DownloadIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
    <polyline points="7 10 12 15 17 10"></polyline>
    <line x1="12" y1="15" x2="12" y2="3"></line>
  </svg>
);
/**
 * Wallet component
 * - Shows user's points balance
 * - Shows transaction history derived from campaign_submissions (joined with ad_requests)
 * - Withdraw button is present but intentionally a no-op (you will wire payments later)
 *
 * Notes:
 * - Uses session.user.id (UUID) as user UID
 * - Prefers user_points.balance; if absent, sums paid submissions
 * - Subscriptions refresh data in realtime for the signed-in user
 */

type SubmissionRow = {
  id: number;
  campaign_id: number;
  creator_id: string | null;
  submission_link: string | null;
  status: string | null;
  submitted_at: string | null;
  approved_at: string | null;
  payout_amount: string | number | null;
  auto_paid: boolean | null;
  ad_requests?: {
    id?: number;
    title?: string | null;
    reward_per_post?: string | number | null;
  } | null;
};

type Tx = {
  id: number;
  campaignTitle: string;
  amount: number;
  date: string | null;
  note?: string;
  status?: string | null;
  auto_paid?: boolean | null;
};

const parseNumeric = (v: string | number | null | undefined): number => {
  if (v === null || v === undefined) return 0;
  if (typeof v === "number") return v;
  const sanitized = String(v).replace(/,/g, "");
  const n = Number(sanitized);
  return Number.isFinite(n) ? n : 0;
};

type WalletProps = {
  lang: string;
};

export default function Wallet ({ lang }: WalletProps) {
  const [userUid, setUserUid] = useState<string | null>(null);
  const [balance, setBalance] = useState<number | null>(null);
  const [transactions, setTransactions] = useState<Tx[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Load session UID
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

  // Fetch user_points row (if exists)
  const fetchUserPoints = async (uid: string | null): Promise<number | null> => {
    if (!uid) return null;
    try {
      const { data, error } = await supabase.from("user_points").select("balance").eq("user_id", uid).single();
      if (error && !(error as any).message?.toLowerCase().includes("no rows")) {
        // If an unexpected error occurred, surface it but keep proceeding
        console.warn("user_points fetch warning:", error);
      }
      const bal = data?.balance !== undefined && data?.balance !== null ? parseNumeric(data.balance) : null;
      setBalance(bal);
      return bal;
    } catch (err) {
      console.error("fetchUserPoints error", err);
      setBalance(null);
      return null;
    }
  };

  // Fetch paid submissions for user and map to transactions
  const fetchTransactionsFromSubmissions = async (uid: string | null): Promise<Tx[]> => {
    if (!uid) {
      setTransactions([]);
      return [];
    }
    try {
      // select submissions for this creator that are paid (approved OR auto_paid true)
      // Include ad_requests fields for title and fallback reward_per_post
      const { data, error } = await supabase
        .from("campaign_submissions")
        .select(
          "id,campaign_id,creator_id,submission_link,status,submitted_at,approved_at,payout_amount,auto_paid,ad_requests(id,title,reward_per_post)"
        )
        .eq("creator_id", uid)
        .or("status.eq.approved,auto_paid.eq.true")
        .order("approved_at", { ascending: false })
        .limit(500);

      if (error) throw error;
      const subs = (data as SubmissionRow[]) ?? [];

      const txs: Tx[] = subs.map((s) => {
        const payout = parseNumeric(s.payout_amount ?? s.ad_requests?.reward_per_post ?? 0);
        const title = s.ad_requests?.title ?? `Campaign #${s.campaign_id}`;
        const date = s.approved_at ?? s.submitted_at ?? null;
        const note =
          s.status === "approved"
            ? t("approved", lang)
            : s.auto_paid
            ? t("auto_paid", lang)
            : s.status ?? undefined;
        return {
          id: s.id,
          campaignTitle: title,
          amount: payout,
          date,
          note,
          status: s.status,
          auto_paid: s.auto_paid,
        };
      });

      // sort by date desc
      txs.sort((a, b) => {
        const ta = a.date ? Date.parse(a.date) : 0;
        const tb = b.date ? Date.parse(b.date) : 0;
        return tb - ta;
      });

      setTransactions(txs);
      return txs;
    } catch (err) {
      console.error("fetchTransactionsFromSubmissions err", err);
      setTransactions([]);
      return [];
    }
  };

  const reconcileBalance = (userPointsBalance: number | null, txs: Tx[]) => {
    if (userPointsBalance !== null) {
      setBalance(userPointsBalance);
      return userPointsBalance;
    }
    const sum = txs.reduce((acc, t) => acc + (t.amount || 0), 0);
    setBalance(sum);
    return sum;
  };

  // Load all data
  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const uid = await fetchSessionUid();
      if (!uid) {
        setError(t("not_signed_in", lang));
        setLoading(false);
        return;
      }
      const [userPointsBal, txs] = await Promise.all([fetchUserPoints(uid), fetchTransactionsFromSubmissions(uid)]);
      reconcileBalance(userPointsBal, txs);
    } catch (err: any) {
      console.error("Wallet load error", err);
      setError(err?.message ?? String(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();

    // Set up realtime subscriptions (lightweight)
    let submissionsChannel: any = null;
    let pointsChannel: any = null;

    (async () => {
      const { data } = await supabase.auth.getSession();
      const uid = (data as any)?.session?.user?.id ?? null;
      if (!uid) return;

      // Subscribe to changes on campaign_submissions for this user
      submissionsChannel = supabase
        .channel(`realtime:campaign_submissions:${uid}`)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "campaign_submissions", filter: `creator_id=eq.${uid}` },
          () => {
            fetchTransactionsFromSubmissions(uid).then((txs) => reconcileBalance(null, txs));
            // Also refresh user_points
            fetchUserPoints(uid);
          }
        )
        .subscribe();

      // Subscribe to user_points changes for this user
      pointsChannel = supabase
        .channel(`realtime:user_points:${uid}`)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "user_points", filter: `user_id=eq.${uid}` },
          () => {
            fetchUserPoints(uid);
          }
        )
        .subscribe();
    })();

    return () => {
      if (submissionsChannel) supabase.removeChannel(submissionsChannel);
      if (pointsChannel) supabase.removeChannel(pointsChannel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Render - Modern Dark Theme Design
  const sectionBorder = "1px solid rgba(255,255,255,0.06)";
  const cardBg = "rgba(255,255,255,0.02)";
  const cardShadow = "0 8px 32px rgba(14,165,233,0.15)";
  const glassEffect = "rgba(255,255,255,0.02)";

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

        .balance-card {
          animation: slideInStaggered 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94);
        }

        .transactions-table {
          animation: slideInStaggered 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94) 0.2s both;
        }

        .transaction-row {
          animation: slideInStaggered 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94) both;
        }

        .transaction-row:nth-child(1) { animation-delay: 0.3s; }
        .transaction-row:nth-child(2) { animation-delay: 0.4s; }
        .transaction-row:nth-child(3) { animation-delay: 0.5s; }
        .transaction-row:nth-child(4) { animation-delay: 0.6s; }
        .transaction-row:nth-child(5) { animation-delay: 0.7s; }
        .transaction-row:nth-child(n+6) { animation-delay: 0.8s; }

        .withdraw-btn {
          position: relative;
          overflow: hidden;
          transition: all 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94);
        }

        .withdraw-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 0 20px rgba(14,165,233,0.5), 0 8px 16px rgba(14,165,233,0.3);
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
          .balance-content {
            flex-direction: column;
            align-items: flex-start !important;
          }

          .table-responsive {
            display: block;
            overflow-x: auto;
          }
        }
      `}</style>

      <div style={{ marginBottom: 28, animation: "slideInUp 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94)" }}>
        <h1 style={{ fontSize: "clamp(24px, 5vw, 32px)", fontWeight: 800, margin: "0 0 8px 0", background: "linear-gradient(135deg, #0ea5e9 0%, #38bdf8 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
          💼 {t("wallet_title", lang)}
        </h1>
        <p style={{ margin: 0, color: "rgba(230,238,248,0.7)", fontSize: "clamp(13px, 2vw, 14px)" }}>
          {t("wallet_lead", lang)}
        </p>
      </div>

      {/* Balance Card */}
      <div
        className="balance-card"
        style={{
          borderRadius: 14,
          padding: 2,
          background: "linear-gradient(135deg, rgba(0, 240, 255, 0.12) 0%, rgba(0, 150, 255, 0.08) 50%, rgba(138, 43, 226, 0.06) 100%)",
          marginBottom: 24,
        }}
      >
        <div
          className="balance-content"
          style={{
            background: cardBg,
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
            border: sectionBorder,
            borderRadius: 12,
            padding: 24,
            boxShadow: cardShadow,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 24,
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
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: "11px", color: "rgba(230,238,248,0.6)", fontWeight: 700, marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.5px" }}>
              💰 {t("total_points", lang)}
            </div>
            <div
              style={{
                fontSize: "clamp(32px, 8vw, 48px)",
                fontWeight: 900,
                background: "linear-gradient(135deg, #0ea5e9 0%, #38bdf8 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
                fontVariantNumeric: "tabular-nums",
              }}
              aria-live="polite"
            >
              {loading ? <span style={{ animation: "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite" }}>{t("loading_short", lang)}</span> : balance !== null ? balance.toLocaleString() : "0"}
            </div>
            {userUid && (
              <div style={{ fontSize: "11px", color: "rgba(230,238,248,0.5)", marginTop: 10, fontFamily: "monospace" }}>
                {t("account", lang)}: {userUid.slice(0, 8)}...
              </div>
            )}
          </div>

          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 12, minWidth: "140px" }}>
            <div style={{ width: 56, height: 56, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 12, background: "linear-gradient(135deg, rgba(14,165,233,0.2) 0%, rgba(56,189,248,0.2) 100%)", border: "1px solid rgba(14,165,233,0.3)", color: "#0ea5e9" }}>
              <WalletIcon />
            </div>
            <button
              className="withdraw-btn"
              onClick={() => {
                /* no-op: implement payments later */
              }}
              style={{
                padding: "10px 16px",
                borderRadius: 10,
                border: "1px solid rgba(14, 165, 233, 0.3)",
                background: "rgba(14, 165, 233, 0.1)",
                color: "#0ea5e9",
                fontWeight: 700,
                cursor: "pointer",
                fontSize: "11px",
                textTransform: "uppercase",
                letterSpacing: "0.5px",
                display: "flex",
                alignItems: "center",
                gap: 6,
                width: "100%",
                justifyContent: "center",
                boxShadow: "0 4px 12px rgba(14,165,233,0.2)",
              }}
            >
              <DownloadIcon />
              {t("withdraw", lang)}
            </button>
          </div>
        </div>
      </div>

      {/* Transactions Table Card */}
      <div
        className="transactions-table"
        style={{
          borderRadius: 14,
          padding: 2,
          background: "linear-gradient(135deg, rgba(0, 240, 255, 0.12) 0%, rgba(0, 150, 255, 0.08) 50%, rgba(138, 43, 226, 0.06) 100%)",
        }}
      >
        <div
          style={{
            background: glassEffect,
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
            border: sectionBorder,
            borderRadius: 12,
            padding: 0,
            boxShadow: cardShadow,
            overflow: "hidden",
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
          <div
            style={{
              padding: "16px 20px",
              borderBottom: sectionBorder,
              display: "grid",
              gridTemplateColumns: "120px 1fr 100px",
              gap: 16,
              fontSize: "10px",
              fontWeight: 700,
              textTransform: "uppercase",
              color: "rgba(230,238,248,0.5)",
              letterSpacing: "0.5px",
              background: "rgba(255,255,255,0.02)",
            }}
          >
            <div>📅 {t("date", lang)}</div>
            <div>📝 {t("description", lang)}</div>
            <div style={{ textAlign: "right" }}>💵 {t("points", lang)}</div>
          </div>

          <div style={{ maxHeight: "500px", overflowY: "auto" }} aria-live="polite">
            {loading ? (
              <div style={{ padding: "24px", color: "rgba(230,238,248,0.5)", textAlign: "center", animation: "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite" }}>
                {t("loading_transactions", lang)}
              </div>
            ) : error ? (
              <div style={{ padding: "24px", color: "#fca5a5", textAlign: "center", fontSize: "13px", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                <span>⚠️</span>
                <span>{error}</span>
              </div>
            ) : transactions.length === 0 ? (
              <div style={{ padding: "24px", color: "rgba(230,238,248,0.5)", textAlign: "center", fontSize: "14px" }}>
                {t("no_transactions", lang)}
              </div>
            ) : (
              transactions.map((tItem, idx) => (
                <div
                  key={tItem.id}
                  className="transaction-row"
                  style={{
                    padding: "16px 20px",
                    borderBottom: idx < transactions.length - 1 ? sectionBorder : "none",
                    display: "grid",
                    gridTemplateColumns: "120px 1fr 100px",
                    gap: 16,
                    alignItems: "center",
                    fontSize: "13px",
                    transition: "all 0.3s ease",
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.background = "rgba(14,165,233,0.05)";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.background = "transparent";
                  }}
                  role="article"
                  aria-label={`${t("transaction_for", lang)} ${tItem.campaignTitle}`}
                >
                  <div style={{ color: "rgba(230,238,248,0.7)", fontVariantNumeric: "tabular-nums", fontWeight: 500 }}>
                    {tItem.date ? new Date(tItem.date).toLocaleDateString(undefined, { month: "short", day: "numeric" }) : "—"}
                  </div>
                  <div>
                    <div style={{ color: "#e6eef8", fontWeight: 600, marginBottom: 4 }}>
                      {tItem.campaignTitle}
                    </div>
                    {tItem.note && (
                      <div style={{ fontSize: "10px", color: "rgba(230,238,248,0.4)", display: "flex", alignItems: "center", gap: 4 }}>
                        {tItem.status === "approved" ? <CheckIcon /> : tItem.auto_paid ? <TrendingIcon /> : null}
                        <span style={{ textTransform: "uppercase", letterSpacing: "0.5px", fontWeight: 600 }}>{tItem.note}</span>
                      </div>
                    )}
                  </div>
                  <div
                    style={{
                      textAlign: "right",
                      fontWeight: 700,
                      color: tItem.amount >= 0 ? "#10b981" : "#ef4444",
                      fontVariantNumeric: "tabular-nums",
                      fontSize: "14px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "flex-end",
                      gap: 4,
                    }}
                  >
                    {tItem.amount >= 0 ? "+" : ""}{tItem.amount.toLocaleString()}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Helper Text */}
      <div style={{ marginTop: 20, fontSize: "12px", color: "rgba(230,238,248,0.4)", textAlign: "center", animation: "slideInUp 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94) 0.4s both" }}>
        ℹ️ {t("wallet_tip", lang)}
      </div>
    </div>
  );
};
