import React, { useEffect, useRef, useState } from "react";
import resp from "./DashboardResponsive.module.css";
import "./InfluencerDashboard.css";
import { supabase } from "../lib/supabaseClient";
import Wallet from "../components/Wallet";
import ViewActiveCampaigns from "../components/ViewActiveCampaigns";
import BrandSubmissions from "../components/BrandSubmissions";
import MTSV2 from "../pages/MTSV2";
import CampaignCreation from "../components/CampaignCreation";
import { t } from "../i18n/index";
import Profiles from "../components/Profiles";

type ActivityItem = { id: string; type: "points" | "submission"; text: string; ts: string };

type DashboardProps = {
  lang: string;
  session: any;
};

type TabKey =
  | "home"
  | "wallet"
  | "activeCampaigns"
  | "brandSubmissions"
  | "influencerSearch"
  | "campaignCreation"
  | "profile";

const NavItem: React.FC<{
  active: boolean;
  onClick: () => void;
  label: string;
  icon?: React.ReactNode;
  collapsed?: boolean;
}> = ({ active, onClick, label, icon, collapsed }) => {
  const leftAccentGradient = `radial-gradient(
      circle at 26% 20%,
      rgba(0, 110, 255, 0.95) 0%,
      rgba(0, 110, 255, 0.60) 12%,
      rgba(0, 110, 255, 0.18) 28%,
      transparent 44%
    ),
    radial-gradient(
      circle at 74% 78%,
      rgba(8, 90, 255, 0.85) 0%,
      rgba(8, 90, 255, 0.45) 14%,
      rgba(8, 90, 255, 0.08) 32%,
      transparent 50%
    ),
    linear-gradient(120deg,
      rgba(2,36,102,0.8) 0%,
      rgba(1,56,150,0.45) 20%,
      rgba(1,56,150,0.20) 40%,
      transparent 55%
    )`;

  return (
    <button
      onClick={onClick}
      className={`${resp.navItem ?? ""} navItem ${active ? "navItemActive " + (resp.navItemActive ?? "") : ""} ${
        collapsed ? "navItemIconOnly" : ""
      }`}
      style={{
        position: "relative",
        overflow: "hidden",
        width: "100%",
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "10px 12px",
        border: "none",
        background: "transparent",
        cursor: "pointer",
        textAlign: "left",
      }}
      aria-pressed={active}
    >
      <span
        aria-hidden
        style={{
          position: "absolute",
          left: 0,
          top: 6,
          bottom: 6,
          width: active ? 6 : 4,
          borderTopRightRadius: 6,
          borderBottomRightRadius: 6,
          backgroundImage: leftAccentGradient,
          backgroundSize: "cover",
          transform: `translateX(${active ? "0" : "-2px"})`,
          transition: "all 200ms ease",
        }}
      />
      <span style={{ marginLeft: 12, display: "inline-flex", gap: 12, alignItems: "center" }}>
        {icon}
        <span style={{ fontWeight: 600, display: collapsed ? "none" : "inline" }}>{label}</span>
      </span>
    </button>
  );
};

export default function InfluencerDashboard({ lang }: DashboardProps) {
  // tabs + nav state
  const [tab, setTab] = useState<TabKey>("home");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  // device/responsive detection
  const [isMobile, setIsMobile] = useState<boolean>(false);

  // Dashboard state
  const [userUid, setUserUid] = useState<string | null>(null);
  const [dashboardLoading, setDashboardLoading] = useState<boolean>(false);
  const [earnings, setEarnings] = useState<number>(0);
  const [activeCampaignsCount, setActiveCampaignsCount] = useState<number>(0);
  const [pendingApprovalsCount, setPendingApprovalsCount] = useState<number>(0);
  const [recentActivity, setRecentActivity] = useState<ActivityItem[]>([]);

  // Responsive scale & collapse logic
  const MIN_SCALE = 0.75;
  const REF_WIDTH = 1200;
  const [viewScale, setViewScale] = useState<number>(1);
  const resizeTimerRef = useRef<number | null>(null);
  const computeScaleFromVW = (vw: number) => Math.max(MIN_SCALE, Math.min(1, vw / REF_WIDTH));

  useEffect(() => {
    if (typeof window === "undefined") return;
    const applyScale = () => {
      setViewScale(computeScaleFromVW(window.innerWidth));
      setIsMobile(window.innerWidth < 769);
    };
    applyScale();
    const onResize = () => {
      if (resizeTimerRef.current) window.clearTimeout(resizeTimerRef.current);
      resizeTimerRef.current = window.setTimeout(() => {
        applyScale();
        resizeTimerRef.current = null;
      }, 120) as unknown as number;
    };
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      if (resizeTimerRef.current) window.clearTimeout(resizeTimerRef.current);
    };
  }, []);

  const collapsed = viewScale < 0.82;
  const toggleMobileNav = () => {
    if (isMobile) {
      setMobileNavOpen((s) => !s);
    } else {
      setMobileNavOpen((s) => !s);
    }
  };

  const primaryGradient = `radial-gradient(
      circle at 26% 20%,
      rgba(0, 110, 255, 0.95) 0%,
      rgba(0, 110, 255, 0.60) 12%,
      rgba(0, 110, 255, 0.18) 28%,
      transparent 44%
    ),
    radial-gradient(
      circle at 74% 78%,
      rgba(8, 90, 255, 0.85) 0%,
      rgba(8, 90, 255, 0.45) 14%,
      rgba(8, 90, 255, 0.08) 32%,
      transparent 50%
    ),
    linear-gradient(120deg,
      rgba(2,36,102,0.8) 0%,
      rgba(1,56,150,0.45) 20%,
      rgba(1,56,150,0.20) 40%,
      transparent 55%
    )`;

  const accentGradient = `linear-gradient(135deg, #a21caf 0%, #ec4899 40%, #fb923c 100%)`;

  const mainWidth = mobileNavOpen ? "70vw" : "80vw";

  // util
  const formatCurrency = (n: number) => (n >= 0 ? `₦ ${n.toLocaleString(undefined, { maximumFractionDigits: 0 })}` : `₦ 0`);

  // fetch dashboard data (defined inside component)
  const fetchDashboardData = async (maybeUid?: string | null) => {
    setDashboardLoading(true);
    try {
      let uid = maybeUid ?? userUid;
      if (!uid) {
        const { data } = await supabase.auth.getSession();
        uid = (data as any)?.session?.user?.id ?? null;
        if (uid) setUserUid(uid);
      }
      if (!uid) {
        setEarnings(0);
        setActiveCampaignsCount(0);
        setPendingApprovalsCount(0);
        setRecentActivity([]);
        return;
      }

      // parallel queries
      const pPoints = supabase.from("user_points").select("balance").eq("user_id", uid).limit(1);
      const pMyAdRequests = supabase.from("ad_requests").select("id,status,remaining_slots").eq("advertiser_id", uid).limit(500);
      const pAvailable = supabase.from("ad_requests").select("id").gt("remaining_slots", 0).limit(500);
      const pMyPendingSubmissions = supabase
        .from("campaign_submissions")
        .select("id, campaign_id, status, submitted_at")
        .eq("creator_id", uid)
        .eq("status", "pending")
        .limit(500);
      const pPointsTx = supabase
        .from("points_transactions")
        .select("id, amount, reason, created_at")
        .eq("user_id", uid)
        .order("created_at", { ascending: false })
        .limit(6);

      const [rPoints, rMyAdRequests, rAvailable, rMyPendingSub, rPointsTx] = await Promise.all([
        pPoints,
        pMyAdRequests,
        pAvailable,
        pMyPendingSubmissions,
        pPointsTx,
      ]);

      // earnings
      if (rPoints.error) {
        console.debug("user_points fetch error:", rPoints.error);
        setEarnings(0);
      } else {
        const b = (rPoints.data && (rPoints.data as any)[0]?.balance) ?? null;
        if (b !== null && b !== undefined) {
          const val = Number(b);
          setEarnings(isNaN(val) ? 0 : val);
        } else {
          if (!rPointsTx.error) {
            const sum = (rPointsTx.data ?? []).reduce((acc: number, t: any) => acc + Number(t.amount ?? 0), 0);
            setEarnings(sum);
          } else {
            setEarnings(0);
          }
        }
      }

      // advertiser vs creator
      let isAdvertiser = false;
      let myAdRequestIds: number[] = [];
      if (!rMyAdRequests.error && Array.isArray(rMyAdRequests.data)) {
        const reqs = rMyAdRequests.data as Array<any>;
        if (reqs.length > 0) {
          isAdvertiser = true;
          myAdRequestIds = reqs.map((r) => r.id).filter(Boolean);
        }
      }

      if (isAdvertiser) {
        const activeCount = (rMyAdRequests.data ?? []).filter((ar: any) => ar.status === "active" || ar.status === "pending").length;
        setActiveCampaignsCount(activeCount);

        if (myAdRequestIds.length > 0) {
          const { data: subsToMe, error: subsErr } = await supabase
            .from("campaign_submissions")
            .select("id")
            .in("campaign_id", myAdRequestIds)
            .eq("status", "pending")
            .limit(1000);
          if (subsErr) {
            console.debug("subsToMe err", subsErr);
            setPendingApprovalsCount(0);
          } else {
            setPendingApprovalsCount((subsToMe ?? []).length);
          }
        } else {
          setPendingApprovalsCount(0);
        }
      } else {
        if (!rAvailable.error) setActiveCampaignsCount((rAvailable.data ?? []).length);
        else setActiveCampaignsCount(0);

        if (!rMyPendingSub.error) setPendingApprovalsCount((rMyPendingSub.data ?? []).length);
        else setPendingApprovalsCount(0);
      }

      // recent activity
      const { data: recentSubs, error: recentSubsErr } = await supabase
        .from("campaign_submissions")
        .select("id, campaign_id, status, submitted_at")
        .eq("creator_id", uid)
        .order("submitted_at", { ascending: false })
        .limit(6);

      const activities: ActivityItem[] = [];

      if (!rPointsTx.error && Array.isArray(rPointsTx.data)) {
        for (const t of (rPointsTx.data as any[])) {
          activities.push({
            id: `pt-${t.id}`,
            type: "points",
            text: `${t.reason ?? "Points"}: ${Number(t.amount ?? 0) >= 0 ? "+" : ""}${Number(t.amount ?? 0)}`,
            ts: t.created_at ?? new Date().toISOString(),
          });
        }
      }

      if (!recentSubsErr && Array.isArray(recentSubs)) {
        for (const s of (recentSubs as any[])) {
          activities.push({
            id: `sub-${s.id}`,
            type: "submission",
            text: `Submission ${s.id} — status: ${s.status ?? "unknown"}`,
            ts: s.submitted_at ?? new Date().toISOString(),
          });
        }
      }

      activities.sort((a, b) => (a.ts < b.ts ? 1 : a.ts > b.ts ? -1 : 0));
      setRecentActivity(activities.slice(0, 6));
    } catch (err) {
      console.error("fetchDashboardData err", err);
    } finally {
      setDashboardLoading(false);
    }
  };

  // initial load: fetch session uid and immediately load dashboard data
  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      const uid = (data as any)?.session?.user?.id ?? null;
      if (uid) setUserUid(uid);
      await fetchDashboardData(uid);
    })();

    // subscribe to changes that should refresh dashboard counts
    const campaignsSub = supabase
      .channel("public:ad_requests")
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "ad_requests" }, () => fetchDashboardData(userUid))
      .subscribe();

    const subsSub = supabase
      .channel("public:campaign_submissions")
      .on("postgres_changes", { event: "*", schema: "public", table: "campaign_submissions" }, () => fetchDashboardData(userUid))
      .subscribe();

    return () => {
      supabase.removeChannel(campaignsSub);
      supabase.removeChannel(subsSub);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // layout render
  return (
    <div
      style={{
        display: "flex",
        minHeight: "100vh",
        fontFamily: "Manrope, Inter, system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial",
        background: "#ffffff",
        position: "relative",
        overflowX: "hidden",
      }}
    >
      <button
        onClick={toggleMobileNav}
        className={resp.mobileNavToggle}
        style={{
          position: "fixed",
          top: 20,
          left: 20,
          zIndex: 1200,
          padding: "10px 12px",
          borderRadius: 10,
          background: "linear-gradient(180deg, rgba(13,176,240,0.95), rgba(4,130,255,0.9))",
          border: "none",
          color: "#fff",
          fontWeight: 700,
          cursor: "pointer",
          display: "block",
          boxShadow: "0 6px 24px rgba(3,102,255,0.12)",
        }}
        aria-expanded={mobileNavOpen}
        aria-controls="dashboard-sidebar"
      >
       {mobileNavOpen ? t("close", lang) : t("menu", lang)}

      </button>

      <aside
        id="dashboard-sidebar"
        className={`${resp.sidebar} ${mobileNavOpen ? resp.sidebarOpen : ""}`}
        style={{
          width: 280,
          minWidth: 280,
          height: "100vh",
          position: "fixed",
          left: 0,
          top: 0,
          zIndex: 1100,
          transform: mobileNavOpen ? "translateX(0)" : "translateX(-105%)",
          transition: "transform 270ms cubic-bezier(.2,.9,.22,1)",
          display: "flex",
          alignItems: "stretch",
          padding: 12,
          background: "transparent",
        }}
        aria-hidden={!mobileNavOpen}
      >
        <div
          style={{
            borderRadius: 12,
            padding: 2,
            width: "100%",
            backgroundImage: primaryGradient,
            boxSizing: "border-box",
          }}
        >
          <div
            style={{
              background: "#ffffff",
              borderRadius: 10,
              padding: 18,
              display: "flex",
              flexDirection: "column",
              gap: 12,
              height: "calc(100vh - 36px)",
              boxSizing: "border-box",
              overflow: "hidden",
            }}
          >
            <div style={{ marginBottom: 8 }}>
              <h2 style={{ fontSize: 20, fontWeight: 800 }}>{t("collabConnect", lang)}</h2>
              <div style={{ color: "#0db0f0", fontWeight: 700 }}>{t("premium", lang)}</div>
            </div>

            <nav
              className={resp.navList}
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 8,
                flexGrow: 1,
                overflowY: "auto",
                paddingRight: 6,
              }}
            >
             <NavItem
  active={tab === "home"}
  onClick={() => setTab("home")}
  label={t("dashboard", lang)}
  icon={<span style={{ fontSize: 18 }}>🏠</span>}
/>
<NavItem
  active={tab === "influencerSearch"}
  onClick={() => setTab("influencerSearch")}
  label={t("influencerSearch", lang)}
  icon={<span style={{ fontSize: 18 }}>🔎</span>}
/>
<NavItem
  active={tab === "campaignCreation"}
  onClick={() => setTab("campaignCreation")}
  label={t("campaignCreation", lang)}
  icon={<span style={{ fontSize: 18 }}>➕</span>}
/>
<NavItem
  active={tab === "activeCampaigns"}
  onClick={() => setTab("activeCampaigns")}
  label={t("myCampaigns", lang)}
  icon={<span style={{ fontSize: 18 }}>📣</span>}
/>
<NavItem
  active={tab === "brandSubmissions"}
  onClick={() => setTab("brandSubmissions")}
  label={t("submissions", lang)}
  icon={<span style={{ fontSize: 18 }}>📝</span>}
/>
<NavItem
  active={tab === "wallet"}
  onClick={() => setTab("wallet")}
  label={t("walletTransactions", lang)}
  icon={<span style={{ fontSize: 18 }}>💼</span>}
/>
              <div style={{ marginTop: "auto" }}>
                <NavItem
  active={tab === "profile"}
  onClick={() => setTab("profile")}
  label={t("settings", lang)}
  icon={<span style={{ fontSize: 18 }}>⚙️</span>}
/>    </div>
            </nav>

            <div style={{ height: 8, borderRadius: 6, backgroundImage: accentGradient, opacity: 0.5 }} />
          </div>
        </div>
      </aside>

      {mobileNavOpen && (
        <div
          onClick={toggleMobileNav}
          aria-hidden
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 1050,
            background: "rgba(6,30,90,0.08)",
            transition: "opacity 180ms ease",
          }}
        />
      )}

      <main
        className={resp.main}
        style={{
          marginLeft: 0,
          width: mainWidth,
          minWidth: mainWidth,
          transition: "width 240ms ease, min-width 240ms ease",
          marginRight: "auto",
          padding: 28,
          boxSizing: "border-box",
          zIndex: 100,
        }}
      >
        <div
          style={{
            borderRadius: 14,
            padding: 2,
            backgroundImage: primaryGradient,
            boxSizing: "border-box",
          }}
        >
          <div
            style={{
              background: "#ffffff",
              borderRadius: 12,
              padding: 20,
              minHeight: "80vh",
              boxSizing: "border-box",
              boxShadow: "0 12px 40px rgba(3,102,255,0.06)",
            }}
          >
            <div className={resp.header} style={{ marginBottom: 18 }}>
              <h1 style={{ fontSize: 28, fontWeight: 800, margin: 0 }}>{t("dashboard", lang)}</h1>
              <p style={{ marginTop: 6, color: "#4b5563" }}>{t("overviewQuickActions", lang)}</p>
            </div>

            <section className={resp.sectionFull}>
              {tab === "wallet" && <Wallet lang={lang} />}

              {tab === "activeCampaigns" && (
                <div style={{ width: "100%", boxSizing: "border-box", overflow: "visible", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center" }}>
                  <div
                    style={{
                      transform: `scale(${viewScale})`,
                      transformOrigin: "top center",
                      transition: "transform 200ms ease, width 200ms ease",
                      width: `${100 / viewScale}%`,
                      boxSizing: "border-box",
                    }}
                  >
                    <ViewActiveCampaigns lang={lang} />
                  </div>
                </div>
              )}

              {tab === "brandSubmissions" && (
                <div
                  style={{
                    transform: `scale(${viewScale})`,
                    transformOrigin: "top center",
                    transition: "transform 200ms ease, width 200ms ease",
                    width: `${100 / viewScale}%`,
                    boxSizing: "border-box",
                  }}
                >
                  <BrandSubmissions lang={lang} />
                </div>
              )}

              {tab === "influencerSearch" && (
                <div
                  style={{
                    transform: `scale(${viewScale})`,
                    transformOrigin: "top center",
                    transition: "transform 200ms ease, width 200ms ease",
                    width: `${100 / viewScale}%`,
                    boxSizing: "border-box",
                    display: "table",
                  }}
                >
                  <MTSV2 lang={lang} />
                </div>
              )}

              {tab === "campaignCreation" &&  <div  style={{display:"content"}}  ><CampaignCreation lang={lang} /> </div>  }

              {tab === "profile" && (
                   <div
                  style={{
                    transform: `scale(${viewScale})`,
                    transformOrigin: "top center",
                    transition: "transform 200ms ease, width 200ms ease",
                    width: `${100 / viewScale}%`,
                    boxSizing: "border-box",
                    display: "table",
                  }}
                > <Profiles lang={lang} />  </div>
              )}

              {tab === "home" && (
                <div>
                  <div className={resp.summaryGrid} style={{ marginBottom: 16 }}>
                    <div className={resp.previewCard} style={{ padding: 14, borderRadius: 10, background: "#fff", boxShadow: "0 6px 18px rgba(3,102,255,0.04)" }}>
                      <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>{t("earnings", lang)}</h3>
                      <p style={{ marginTop: 8, fontSize: 14 }}>{dashboardLoading ? t("loading", lang) : formatCurrency(Number(earnings ?? 0))}</p>
                    </div>

                    <div className={resp.previewCard} style={{ padding: 14, borderRadius: 10, background: "#fff", boxShadow: "0 6px 18px rgba(3,102,255,0.04)" }}>
                      <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>{t("activeCampaigns", lang)} </h3>
                      <p style={{ marginTop: 8, fontSize: 14 }}>{dashboardLoading ? t("loading", lang) : `${activeCampaignsCount} ${t("running", lang)}`}</p>
                    </div>

                    <div className={resp.previewCard} style={{ padding: 14, borderRadius: 10, background: "#fff", boxShadow: "0 6px 18px rgba(3,102,255,0.04)" }}>
                      <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>{t("pendingApprovals", lang)}</h3>
                      <p style={{ marginTop: 8, fontSize: 14 }}>
{dashboardLoading
  ? t("loading", lang)
  : `${pendingApprovalsCount} ${pendingApprovalsCount !== 1 ? t("items", lang) : t("item", lang)}`}</p>
                    </div>
                  </div>

                  <div className={resp.previewGrid}>
                    <div className={resp.previewCard} style={{ padding: 12, borderRadius: 10, background: "#fff" }}>
                      <h4 style={{ margin: 0, fontWeight: 700 }}>{t("recentActivity", lang)}</h4>
                      <div className={resp.previewInnerScroll} style={{ marginTop: 8 }}>
                        {dashboardLoading ? (
                          <p style={{ margin: 0 }}>{t("loadingActivity", lang)}</p>
                        ) : recentActivity.length === 0 ? (
                          <p style={{ margin: 0 }}>{t("noRecentActivity", lang)}</p>
                        ) : (
                          <ul style={{ margin: 0, paddingLeft: 14 }}>
                            {recentActivity.map((a) => (
                              <li key={a.id} style={{ marginBottom: 6 }}>
                                <small style={{ color: "#333" }}>{a.text}</small>
                                <div style={{ fontSize: 12, color: "#666" }}>{new Date(a.ts).toLocaleString()}</div>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </div>

                    <div className={resp.previewCard} style={{ padding: 12, borderRadius: 10, background: "#fff" }}>
                      <h4 style={{ margin: 0, fontWeight: 700 }}>{t("quickActions", lang)}</h4>
                      <div style={{ marginTop: 8, display: "flex", gap: 8 }}>
                        <button
                          onClick={() => setTab("campaignCreation")}
                          style={{
                            padding: "8px 12px",
                            borderRadius: 8,
                            border: "none",
                            fontWeight: 700,
                            cursor: "pointer",
                            background: "linear-gradient(90deg, rgba(2,36,102,0.12), rgba(8,90,255,0.08))",
                          }}
                        >
                         {t("createCampaign", lang)}
                        </button>
                        <button
                          onClick={() => setTab("influencerSearch")}
                          style={{
                            padding: "8px 12px",
                            borderRadius: 8,
                            border: "1px solid rgba(8,90,255,0.08)",
                            fontWeight: 700,
                            cursor: "pointer",
                            background: "#fff",
                          }}
                        >
                          {t("searchInfluencer", lang)}
                        </button>
                        <button
                          onClick={() => {
                            fetchDashboardData(userUid);
                          }}
                          style={{
                            padding: "8px 12px",
                            borderRadius: 8,
                            border: "1px solid rgba(0,0,0,0.06)",
                            fontWeight: 700,
                            cursor: "pointer",
                            background: "#fff",
                          }}
                        >
                         {t("refresh", lang)}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}
