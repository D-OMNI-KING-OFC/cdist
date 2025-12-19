// src/pages/BrandDashboard.tsx
import React, { useEffect, useRef, useState } from "react";
import "./BrandDashboard.modern.css";
import { supabase } from "../lib/supabaseClient";
import {
  HomeIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  SpeakerWaveIcon,
  DocumentTextIcon,
  WalletIcon,
} from "@heroicons/react/24/outline";
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
  session?: { user?: { id: string } };
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
  return (
    <button
      onClick={onClick}
      className={`navItem ${active ? "navItemActive" : ""} ${collapsed ? "navItemIconOnly" : ""} transition-all`}
      style={{
        position: "relative",
        overflow: "hidden",
        width: "100%",
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "12px 14px",
        border: "1px solid " + (active ? "rgba(14, 165, 233, 0.3)" : "transparent"),
        background: active
          ? "linear-gradient(135deg, rgba(14, 165, 233, 0.15), rgba(59, 130, 246, 0.1))"
          : "transparent",
        cursor: "pointer",
        textAlign: "left",
        borderRadius: "8px",
        color: active ? "rgba(14, 165, 233, 1)" : "rgba(255, 255, 255, 0.7)",
        fontWeight: active ? 700 : 500,
        marginBottom: "6px",
      }}
      aria-pressed={active}
    >
      <span
        aria-hidden
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          bottom: 0,
          width: 4,
          borderRadius: "0 8px 8px 0",
          background: active ? "linear-gradient(135deg, rgba(14, 165, 233, 0.8), rgba(6, 182, 212, 0.8))" : "transparent",
          transform: `scaleY(${active ? 1 : 0})`,
          transition: "all 200ms ease",
          transformOrigin: "center",
        }}
      />
      <span
        style={{
          marginLeft: 8,
          display: "inline-flex",
          gap: 10,
          alignItems: "center",
          width: "100%",
          position: "relative",
          zIndex: 1,
        }}
      >
        <span style={{ fontSize: 18, display: "flex", alignItems: "center", flexShrink: 0, color: "inherit" }}>{icon}</span>
        <span
          style={{
            fontWeight: active ? 700 : 500,
            fontSize: "0.95rem",
            display: "inline",
            flex: 1,
            textAlign: "left",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {label}
        </span>
      </span>
    </button>
  );
};

export default function BrandDashboard({ lang }: DashboardProps) {
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
    // if mobile -> show slide nav; if desktop -> toggle collapse visually (keeps behavior intuitive)
    if (isMobile) {
      setMobileNavOpen((s) => !s);
    } else {
      // on desktop clicking "menu" should toggle a compact sidebar (optional)
      // to keep things simple, on desktop we'll toggle a small 'mobileNavOpen' state to allow manual override of main width
      setMobileNavOpen((s) => !s);
      // but keep mobileNavOpen meaning "sidebar narrower" on desktop; the rendering below handles both cases
    }
  };

  // util
  const formatCurrency = (n: number) => (n >= 0 ? `₦ ${n.toLocaleString(undefined, { maximumFractionDigits: 0 })}` : `₦ 0`);

  // fetch dashboard data
  const fetchDashboardData = async (maybeUid?: string | null) => {
    setDashboardLoading(true);
    try {
      let uid = maybeUid ?? userUid;
      if (!uid) {
        const { data } = await supabase.auth.getSession();
        uid = (data?.session?.user?.id) ?? null;
        if (uid) setUserUid(uid as string);
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

      if (rPoints.error) {
        console.debug("user_points fetch error:", rPoints.error);
        setEarnings(0);
      } else {
        const b = (rPoints.data && (rPoints.data as Array<Record<string, unknown>>)[0]?.balance) ?? null;
        if (b !== null && b !== undefined) {
          const val = Number(b);
          setEarnings(isNaN(val) ? 0 : val);
        } else {
          if (!rPointsTx.error) {
            const sum = (rPointsTx.data ?? []).reduce((acc: number, t: Record<string, unknown>) => acc + Number(t.amount ?? 0), 0);
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
        const reqs = rMyAdRequests.data as Array<Record<string, unknown>>;
        if (reqs.length > 0) {
          isAdvertiser = true;
          myAdRequestIds = reqs.map((r) => (r.id as number)).filter(Boolean);
        }
      }

      if (isAdvertiser) {
        const activeCount = (rMyAdRequests.data ?? []).filter((ar: Record<string, unknown>) => ar.status === "active" || ar.status === "pending").length;
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
        for (const t of (rPointsTx.data as Array<Record<string, unknown>>)) {
          activities.push({
            id: `pt-${t.id}`,
            type: "points",
            text: `${t.reason ?? "Points"}: ${Number(t.amount ?? 0) >= 0 ? "+" : ""}${Number(t.amount ?? 0)}`,
            ts: (t.created_at as string) ?? new Date().toISOString(),
          });
        }
      }

      if (!recentSubsErr && Array.isArray(recentSubs)) {
        for (const s of (recentSubs as Array<Record<string, unknown>>)) {
          activities.push({
            id: `sub-${s.id}`,
            type: "submission",
            text: `Submission ${s.id} — status: ${s.status ?? "unknown"}`,
            ts: (s.submitted_at as string) ?? new Date().toISOString(),
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
      const uid = (data?.session?.user?.id) ?? null;
      if (uid) setUserUid(uid);
      await fetchDashboardData(uid as string | null);
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
      // best-effort cleanup
      try {
        supabase.removeChannel(campaignsSub);
        supabase.removeChannel(subsSub);
      } catch {
        // ignore if runtime doesn't support removeChannel
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // layout calculations
  const desktopSidebarWidth = collapsed ? 96 : 280;
  const asideWidthPx = isMobile ? 0 : desktopSidebarWidth;
  const mainStyleWidth = "100%";

  return (
    <div className="dashboardWrap slide-in-up" style={{ minHeight: "100vh", position: "relative", display: "flex", flexDirection: "row" }}>
      {/* Mobile Navigation Toggle - Only visible on mobile */}
      {isMobile && (
        <button
          onClick={toggleMobileNav}
          className="mobileNavToggle btn transition-all"
          aria-expanded={mobileNavOpen}
          aria-controls="dashboard-sidebar"
          style={{
            position: "fixed",
            top: 12,
            left: 12,
            zIndex: 1400,
            width: 44,
            height: 44,
            padding: 0,
            borderRadius: 12,
            border: "1px solid rgba(14, 165, 233, 0.3)",
            color: "#fff",
            background: mobileNavOpen
              ? "linear-gradient(135deg, rgba(14, 165, 233, 0.3), rgba(59, 130, 246, 0.2))"
              : "linear-gradient(135deg, rgba(14, 165, 233, 0.15), rgba(59, 130, 246, 0.08))",
            backdropFilter: "blur(12px)",
            boxShadow: "0 4px 20px rgba(14, 165, 233, 0.25), 0 0 0 1px rgba(255,255,255,0.05)",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transition: "all 200ms ease",
          }}
        >
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{
              transition: "transform 200ms ease",
              transform: mobileNavOpen ? "rotate(90deg)" : "rotate(0deg)",
            }}
          >
            {mobileNavOpen ? (
              <>
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </>
            ) : (
              <>
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </>
            )}
          </svg>
        </button>
      )}

      {/* Sidebar Navigation */}
      <aside
        id="dashboard-sidebar"
        className={`sidebar slide-in-left ${mobileNavOpen ? "sidebarOpen" : ""}`}
        aria-hidden={isMobile ? !mobileNavOpen : false}
        style={{
          position: "fixed",
          left: 0,
          top: 0,
          bottom: 0,
          width: isMobile ? "65vw" : `${desktopSidebarWidth}px`,
          maxWidth: isMobile ? "80vw" : desktopSidebarWidth === 96 ? "96px" : "280px",
          zIndex: 1350,
          transform: isMobile ? (mobileNavOpen ? "translateX(0)" : "translateX(-110%)") : "translateX(0)",
          transition: "transform 300ms cubic-bezier(0.25, 0.46, 0.45, 0.94), width 300ms ease",
          willChange: "transform, width",
          boxSizing: "border-box",
          padding: isMobile ? 8 : 12,
          background: "transparent",
          overflow: "hidden",
          height: "100vh",
          flexShrink: 0,
        }}
      >
        <div
          className="glass-effect"
          style={{
            borderRadius: 16,
            padding: isMobile ? 12 : 20,
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            gap: isMobile ? 8 : 16,
            height: "100vh",
            overflow: "hidden",
            position: "relative",
            boxSizing: "border-box",
            paddingRight: isMobile ? 8 : 12,
          }}
        >
          {/* Brand Header */}
          <div style={{ marginBottom: 12 }}>
            <h2
              style={{
                fontSize: 18,
                fontWeight: 900,
                margin: 0,
                background: "linear-gradient(135deg, #fff 0%, #38bdf8 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
                letterSpacing: "-0.5px",
              }}
            >
              {t("collabConnect", lang)}
            </h2>
            <p
              style={{
                fontSize: 12,
                fontWeight: 700,
                color: "rgba(14, 165, 233, 0.8)",
                margin: "4px 0 0 0",
                textTransform: "uppercase",
                letterSpacing: "1px",
              }}
            >
              {t("premium", lang)}
            </p>
          </div>

          {/* Navigation Menu */}
          <nav
            style={{
              flexGrow: 1,
              overflowY: "auto",
              overflowX: "hidden",
              paddingRight: 4,
              display: "flex",
              flexDirection: "column",
              justifyContent: isMobile ? "center" : "flex-start",
              gap: isMobile ? 6 : 4,
            }}
            className="scroll-smooth"
          >
            {[
              { key: "home" as TabKey, label: t("dashboard", lang), icon: <HomeIcon className="w-5 h-5" /> },
              { key: "influencerSearch" as TabKey, label: t("influencerSearch", lang), icon: <MagnifyingGlassIcon className="w-5 h-5" /> },
              { key: "campaignCreation" as TabKey, label: t("campaignCreation", lang), icon: <PlusIcon className="w-5 h-5" /> },
              { key: "activeCampaigns" as TabKey, label: t("myCampaigns", lang), icon: <SpeakerWaveIcon className="w-5 h-5" /> },
              { key: "brandSubmissions" as TabKey, label: t("submissions", lang), icon: <DocumentTextIcon className="w-5 h-5" /> },
              { key: "wallet" as TabKey, label: t("walletTransactions", lang), icon: <WalletIcon className="w-5 h-5" /> },
            ].map((item, idx) => (
              <div key={item.key} style={{ animationDelay: `${idx * 50}ms` }} className="stagger-item">
                <NavItem
                  active={tab === item.key}
                  onClick={() => {
                    setTab(item.key);
                    if (isMobile) setMobileNavOpen(false);
                  }}
                  label={item.label}
                  icon={item.icon}
                  collapsed={collapsed}
                />
              </div>
            ))}

            <div style={{ marginTop: "auto" }}>
              <NavItem
                active={tab === "profile"}
                onClick={() => {
                  setTab("profile");
                  if (isMobile) setMobileNavOpen(false);
                }}
                label={t("settings", lang)}
                icon={<DocumentTextIcon className="w-5 h-5" />}
                collapsed={collapsed}
              />
            </div>
          </nav>

          {/* Bottom accent gradient */}
          <div
            style={{
              height: 3,
              borderRadius: 2,
              background: "linear-gradient(90deg, #0ea5e9, #06b6d4, #a78bfa)",
              opacity: 0.5,
              marginTop: "auto",
            }}
          />
        </div>
      </aside>

      {/* Mobile overlay */}
      {isMobile && mobileNavOpen && (
        <div
          onClick={() => setMobileNavOpen(false)}
          className="backdrop-fade"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 1200,
            background: "rgba(2, 6, 23, 0.5)",
            backdropFilter: "blur(4px)",
          }}
        />
      )}

      {/* Main Content */}
      <main
        className="main slide-in-up"
        style={{
          marginLeft: 0,
          width: mainStyleWidth,
          minWidth: mainStyleWidth,
          transition: "margin-left 300ms cubic-bezier(.2,.9,.2,1), width 300ms ease",
          boxSizing: "border-box",
          padding: isMobile ? "72px 16px 24px 16px" : `24px 24px 24px ${asideWidthPx + 24}px`,
          flex: 1,
          overflow: "auto",
          maxWidth: "100%",
        }}
      >
        <div
          className="featureCard"
          style={{
            borderRadius: 16,
            padding: isMobile ? 16 : 28,
            minHeight: "80vh",
            boxSizing: "border-box",
          }}
        >
          {/* Header */}
          <div className="header" style={{ marginBottom: 28 }}>
            <h1
              style={{
                fontSize: "2.2rem",
                fontWeight: 900,
                margin: 0,
                background: "linear-gradient(135deg, #fff 0%, #38bdf8 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
                letterSpacing: "-1px",
              }}
            >
              {tab === "home" && t("dashboard", lang)}
              {tab === "wallet" && t("walletTransactions", lang)}
              {tab === "activeCampaigns" && t("myCampaigns", lang)}
              {tab === "brandSubmissions" && t("submissions", lang)}
              {tab === "influencerSearch" && t("influencerSearch", lang)}
              {tab === "campaignCreation" && t("campaignCreation", lang)}
              {tab === "profile" && t("settings", lang)}
            </h1>
            <p
              style={{
                marginTop: 8,
                color: "rgba(255, 255, 255, 0.6)",
                fontSize: "0.95rem",
              }}
            >
              {tab === "home" && t("overviewQuickActions", lang)}
            </p>
          </div>

          {/* Tab Content with Transitions */}
          <section className="tab-enter" style={{ borderRadius: 12, padding: 8 }}>
            {tab === "wallet" && (
              <div className="embeddedComponent">
                <Wallet lang={lang} />
              </div>
            )}

            {tab === "activeCampaigns" && (
              <div style={{ width: "100%", boxSizing: "border-box", display: "flex", flexDirection: "column" }}>
                <ViewActiveCampaigns lang={lang} />
              </div>
            )}

            {tab === "brandSubmissions" && (
              <BrandSubmissions lang={lang} />
            )}

            {tab === "influencerSearch" && (
              <MTSV2 lang={lang} />
            )}

            {tab === "campaignCreation" && <CampaignCreation lang={lang} />}

            {tab === "profile" && (
              <Profiles lang={lang} />
            )}

            {tab === "home" && (
              <div style={{ width: "100%" }} className="slide-in-up">
                {/* Stats Cards */}
                <div className="summaryGrid">
                  {[
                    { label: t("earnings", lang), value: dashboardLoading ? t("loading", lang) : formatCurrency(Number(earnings ?? 0)), icon: "💰" },
                    {
                      label: t("activeCampaigns", lang),
                      value: dashboardLoading ? t("loading", lang) : `${activeCampaignsCount} ${t("running", lang)}`,
                      icon: "🚀",
                    },
                    {
                      label: t("pendingApprovals", lang),
                      value: dashboardLoading ? t("loading", lang) : `${pendingApprovalsCount} ${pendingApprovalsCount !== 1 ? t("items", lang) : t("item", lang)}`,
                      icon: "⏳",
                    },
                  ].map((stat, idx) => (
                    <div
                      key={idx}
                      className="previewCard hover-lift stagger-item"
                      style={{
                        animationDelay: `${idx * 100}ms`,
                        cursor: "pointer",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
                        <span style={{ fontSize: "1.5rem" }}>{stat.icon}</span>
                        <h3 style={{ margin: 0, fontSize: "0.85rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "1px", color: "rgba(255, 255, 255, 0.6)" }}>
                          {stat.label}
                        </h3>
                      </div>
                      <p style={{ margin: 0, fontSize: "1.8rem", fontWeight: 800, color: "#38bdf8", letterSpacing: "-0.5px" }}>{stat.value}</p>
                    </div>
                  ))}
                </div>

                {/* Secondary Cards Grid */}
                <div className="previewGrid" style={{ marginTop: 24 }}>
                  {/* Recent Activity */}
                  <div className="previewCard hover-lift stagger-item" style={{ animationDelay: "300ms" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
                      <span style={{ fontSize: "1.3rem" }}>📋</span>
                      <h4 style={{ margin: 0, fontWeight: 700, fontSize: "1rem" }}>{t("recentActivity", lang)}</h4>
                    </div>
                    <div className="previewInnerScroll" style={{ maxHeight: 240, overflowY: "auto" }}>
                      {dashboardLoading ? (
                        <p style={{ margin: 0, color: "rgba(255, 255, 255, 0.5)" }}>{t("loadingActivity", lang)}</p>
                      ) : recentActivity.length === 0 ? (
                        <p style={{ margin: 0, color: "rgba(255, 255, 255, 0.5)" }}>{t("noRecentActivity", lang)}</p>
                      ) : (
                        <ul style={{ margin: 0, paddingLeft: 0, listStyle: "none" }}>
                          {recentActivity.map((a, idx) => (
                            <li
                              key={a.id}
                              style={{
                                marginBottom: 12,
                                paddingBottom: 12,
                                borderBottom: "1px solid rgba(14, 165, 233, 0.1)",
                                animation: `slideInLeft 300ms cubic-bezier(0.25, 0.46, 0.45, 0.94)`,
                                animationDelay: `${idx * 50}ms`,
                              }}
                            >
                              <p style={{ margin: 0, fontSize: "0.9rem", color: "rgba(255, 255, 255, 0.8)", fontWeight: 500 }}>{a.text}</p>
                              <span style={{ fontSize: "0.75rem", color: "rgba(255, 255, 255, 0.4)" }}>{new Date(a.ts).toLocaleTimeString()}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>

                  {/* Quick Actions */}
                  <div className="previewCard hover-lift stagger-item" style={{ animationDelay: "400ms" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
                      <span style={{ fontSize: "1.3rem" }}>⚡</span>
                      <h4 style={{ margin: 0, fontWeight: 700, fontSize: "1rem" }}>{t("quickActions", lang)}</h4>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                      <button
                        onClick={() => {
                          setTab("campaignCreation");
                          if (isMobile) setMobileNavOpen(false);
                        }}
                        className="btn btn-primary transition-all"
                        style={{
                          padding: "11px 16px",
                          fontSize: "0.9rem",
                          fontWeight: 700,
                        }}
                      >
                        ➕ {t("createCampaign", lang)}
                      </button>

                      <button
                        onClick={() => {
                          setTab("influencerSearch");
                          if (isMobile) setMobileNavOpen(false);
                        }}
                        className="btn btn-secondary transition-all"
                        style={{
                          padding: "11px 16px",
                          fontSize: "0.9rem",
                          fontWeight: 700,
                        }}
                      >
                        🔎 {t("searchInfluencer", lang)}
                      </button>

                      <button
                        onClick={() => {
                          fetchDashboardData(userUid);
                        }}
                        className="btn btn-ghost transition-all"
                        style={{
                          padding: "11px 16px",
                          fontSize: "0.9rem",
                          fontWeight: 700,
                        }}
                      >
                        🔄 {t("refresh", lang)}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
