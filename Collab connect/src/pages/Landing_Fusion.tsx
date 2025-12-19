import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { t } from "../i18n/index";
import styles from "./Landing.module.css";
import Hero_KR_Typing from "../components/Hero_KR_Typing";
import ScrollingVideoFeed from "../components/ScrollingVideoFeed";
import FeaturesSection_Fusion from "../components/FeaturesSection_Fusion";
import LandingFooter_Fusion from "../components/LandingFooter_Fusion";
import MTSWrapper from "../components/MTSWrapper";
import useIntersection from "../hooks/useIntersectionHook";

export type LandingFusionProps = {
  lang: string;
  session?: any;
  onGetStarted?: () => void;
  onInvite?: (id: string) => void;
  onSelectProfile?: (id: string) => void;
  setLang?: (lang: "en" | "ko" | "fr") => void;
};

// Fresh CollabConnect landing page with falling hero text + animated sections
export const Landing_Fusion: React.FC<LandingFusionProps> = ({ lang, session, onGetStarted, onInvite, onSelectProfile, setLang }) => {
  const navigate = useNavigate();
  const [layout, setLayout] = useState<"vertical" | "grid" | "carousel">("grid");

  const heroRef = useRef<HTMLDivElement | null>(null);
  const statsRef = useRef<HTMLDivElement | null>(null);

  const heroObserverRef = useIntersection<HTMLDivElement>({});
  const statsObserverRef = useIntersection<HTMLDivElement>({});

  useEffect(() => {
    // ensure hero & stats reveal when observed
    if (heroRef.current) heroRef.current.classList.add("fadeIn");
  }, []);

  const handlePrimary = () => {
    if (onGetStarted) return onGetStarted();
    if (!session) return navigate("/login");
    navigate("/dashboard");
  };

  const sampleCreators = [
    { auth_uid: "c1", profile_image: "/src/assets/cc-3d.png", display_name: "Luna Park", platform: "YouTube", followers: 124000, avg_views: 12000, engagement: 4.2, latest_post_url: "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4", price_range: "$500–$1,200", niche: ["beauty","lifestyle"], poster: "/src/assets/cc-3d.png" },
    { auth_uid: "c2", profile_image: "/src/assets/cc-3d.png", display_name: "DJ Kim", platform: "TikTok", followers: 54000, avg_views: 8000, engagement: 6.1, latest_post_url: "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4", price_range: "$200–$700", niche: ["music","edm"], poster: "/src/assets/cc-3d.png" },
    { auth_uid: "c3", profile_image: "/src/assets/cc-3d.png", display_name: "Ahn Studio", platform: "Instagram", followers: 98000, avg_views: 7200, engagement: 5.4, latest_post_url: "", price_range: "$300–$900", niche: ["design","art"], poster: "/src/assets/cc-3d.png" },
    { auth_uid: "c4", profile_image: "/src/assets/cc-3d.png", display_name: "Seo Min", platform: "YouTube", followers: 220000, avg_views: 42000, engagement: 3.8, latest_post_url: "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4", price_range: "$1,200–$4,000", niche: ["tech","reviews"], poster: "/src/assets/cc-3d.png" },
    { auth_uid: "c5", profile_image: "/src/assets/cc-3d.png", display_name: "Mina Lee", platform: "Instagram", followers: 43000, avg_views: 2600, engagement: 7.2, latest_post_url: "", price_range: "$150–$450", niche: ["food","travel"], poster: "/src/assets/cc-3d.png" },
    { auth_uid: "c6", profile_image: "/src/assets/cc-3d.png", display_name: "ByteHouse", platform: "Twitter", followers: 66000, avg_views: 9000, engagement: 2.8, latest_post_url: "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4", price_range: "$250��$800", niche: ["gaming","tech"], poster: "/src/assets/cc-3d.png" },
  ];

  // falling decorative words (from i18n heroTypedPhrases)
  const falling = (t as any)("heroTypedPhrases", lang) || ["Smart creator discovery","Automated campaigns","Transparent rewards"];

  const prefersReduced = typeof window !== "undefined" && window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  return (
    <div className={styles.landingContainer} style={{ fontFamily: "'Noto Sans KR', system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial" }}>
      <header className={styles.header} style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <img src="src/assets/cc-3d.png" alt="CollabConnect logo" style={{ width: 48, height: 48, borderRadius: 10 }} />
          <div>
            <div style={{ fontWeight: 900, fontSize: 20 }}>CollabConnect</div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.72)" }}>{t("collab_tagline", lang)}</div>
          </div>
        </div>

        <nav style={{ marginLeft: "auto", display: "flex", gap: 16 }} className={styles.navLinks}>
          <a className={styles.navLink} href="#home">{t("landingNavHome", lang)}</a>
          <a className={styles.navLink} href="#features">{t("landingNavFeatures", lang)}</a>
          <a className={styles.navLink} href="#pricing">{t("landingNavPricing", lang)}</a>
          <a className={styles.navLink} href="#resources">{t("landingNavResources", lang)}</a>
        </nav>

        <div className={styles.mh} style={{ marginLeft: 12 }}>
          <button className={`${styles.headerButton} ${styles.loginButton}`} onClick={() => navigate("/login")}>{t("signIn", lang)}</button>
          <button className={`${styles.headerButton} ${styles.getStartedButton}`} onClick={handlePrimary}>{t("landing_cta_primary", lang) || t("getStarted", lang)}</button>
        </div>
      </header>

      <main>
        {/* HERO */}
        <section id="home" className={`${styles.heroSection} ${styles.section}`} ref={heroRef} style={{ position: "relative", paddingBottom: 24 }}>
          <div style={{
            borderRadius: 16,
            padding: "2.5rem 1rem",
            margin: "1rem auto",
            maxWidth: 1100,
            background: "linear-gradient(180deg, rgba(255,255,255,0.02), rgba(255,255,255,0.01))",
            border: "1px solid rgba(255,255,255,0.06)",
            boxShadow: "0 12px 40px rgba(3,6,23,0.6)",
            backdropFilter: "blur(8px)",
          }}>
            <div style={{ display: "flex", gap: 24, alignItems: "center", justifyContent: "space-between", flexWrap: "wrap" }}>
              <div style={{ flex: "1 1 520px" }}>
                <Hero_KR_Typing lang={lang} onPrimaryCTA={handlePrimary} className={styles.heroContent} />
                <div style={{ marginTop: 18, display: "flex", gap: 12 }}>
                  <button className={styles.ctaButton} onClick={handlePrimary}>{t("landing_cta_primary", lang)}</button>
                  <button className={`${styles.ctaButton} ${styles.heroButtonSecondary}`} onClick={() => navigate("/contact")}>{t("landing_cta_secondary", lang)}</button>
                </div>
              </div>

              <div style={{ width: 420, minWidth: 280, position: "relative" }} aria-hidden>
                {/* falling decorative words */}
                <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
                  {!prefersReduced && falling.map((w: string, i: number) => {
                    const left = 8 + (i * 18) % 70;
                    const delay = (i * 400) % 3000;
                    const duration = 4200 + (i * 800);
                    return (
                      <span key={w + i} style={{
                        position: "absolute",
                        left: `${left}%`,
                        top: `-8%`,
                        color: "rgba(255,255,255,0.06)",
                        fontWeight: 900,
                        fontSize: 42,
                        transform: "rotate(-8deg)",
                        animation: `fall ${duration}ms linear ${delay}ms infinite`
                      }}>{w}</span>
                    );
                  })}
                </div>

                <div style={{ borderRadius: 12, overflow: "hidden", border: "1px solid rgba(255,255,255,0.04)", background: "linear-gradient(180deg, rgba(255,255,255,0.02), rgba(0,0,0,0.2))" }}>
                  <img src="/src/assets/cc-3d.png" alt="logo poster" style={{ width: "100%", height: 260, objectFit: "cover" }} />
                </div>
              </div>
            </div>
          </div>

          <style>{`
            @keyframes fall { 0% { transform: translateY(-40vh) rotate(-10deg); opacity: 0 } 10% { opacity: 1 } 90% { opacity: 1 } 100% { transform: translateY(120vh) rotate(10deg); opacity: 0 }
            .${styles.section}.fadeIn { opacity: 1; transform: translateY(0); transition: opacity 700ms ease, transform 700ms cubic-bezier(.2,.9,.2,1); }
          `}</style>
        </section>

        {/* MTS Search */}
        <section style={{ padding: "2rem 1rem", maxWidth: 1200, margin: "0 auto" }}>
          <MTSWrapper lang={lang} />
        </section>

        {/* Features & Stats */}
        <section id="features" ref={statsObserverRef} className={`${styles.featuresSection} ${styles.section}`} style={{ paddingTop: 12 }}>
          <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 1rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
              <div style={{ flex: "1 1 420px" }}>
                <h2 className={styles.heroTitle}>{t("servicesTitle", lang)}</h2>
                <p className={styles.heroSubtitle}>{t("service1Desc", lang)}</p>
              </div>

              <div style={{ display: "flex", gap: 12 }}>
                <div style={{ padding: 12, borderRadius: 12, border: "1px solid rgba(255,255,255,0.04)", background: "rgba(255,255,255,0.02)" }}>
                  <div style={{ fontSize: 24, fontWeight: 900 }}>{t("stat1Number", lang)}</div>
                  <div style={{ color: "rgba(255,255,255,0.72)" }}>{t("stat1Text", lang)}</div>
                </div>
                <div style={{ padding: 12, borderRadius: 12, border: "1px solid rgba(255,255,255,0.04)", background: "rgba(255,255,255,0.02)" }}>
                  <div style={{ fontSize: 24, fontWeight: 900 }}>{t("stat2Number", lang)}</div>
                  <div style={{ color: "rgba(255,255,255,0.72)" }}>{t("stat2Text", lang)}</div>
                </div>
                <div style={{ padding: 12, borderRadius: 12, border: "1px solid rgba(255,255,255,0.04)", background: "rgba(255,255,255,0.02)" }}>
                  <div style={{ fontSize: 24, fontWeight: 900 }}>{t("stat3Number", lang)}</div>
                  <div style={{ color: "rgba(255,255,255,0.72)" }}>{t("stat3Text", lang)}</div>
                </div>
              </div>
            </div>

            <div style={{ marginTop: 28 }}>
              <div className={styles.featuresContainer}>
                <div className={styles.featureCard}>
                  <div className={styles.featureImage} style={{ backgroundImage: `url(${(window as any)?.featureImage1 || ''})` }} />
                  <div>
                    <h3 className={styles.featureTitle}>{t("feature_automated_campaigns_title", lang)}</h3>
                    <p className={styles.featureDesc}>{t("feature_automated_campaigns_desc", lang)}</p>
                  </div>
                </div>

                <div className={styles.featureCard}>
                  <div className={styles.featureImage} style={{ backgroundImage: `url(${(window as any)?.featureImage2 || ''})` }} />
                  <div>
                    <h3 className={styles.featureTitle}>{t("feature_smart_discovery_title", lang)}</h3>
                    <p className={styles.featureDesc}>{t("feature_smart_discovery_desc", lang)}</p>
                  </div>
                </div>

                <div className={styles.featureCard}>
                  <div className={styles.featureImage} style={{ backgroundImage: `url(${(window as any)?.featureImage3 || ''})` }} />
                  <div>
                    <h3 className={styles.featureTitle}>{t("feature_rewards_title", lang)}</h3>
                    <p className={styles.featureDesc}>{t("feature_rewards_desc", lang)}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Interactive feed */}
        <section id="interactive" style={{ padding: "2rem 1rem", maxWidth: 1200, margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
            <div>
              <h2 style={{ margin: 0 }}>{t("keyFeaturesTitle", lang)}</h2>
              <p style={{ color: "rgba(255,255,255,0.72)" }}>{t("corePurpose", lang)}</p>
            </div>

            <div style={{ display: "flex", gap: 8 }}>
              <button className={styles.ctaButton} onClick={() => setLayout("grid")} style={{ opacity: layout === "grid" ? 1 : 0.8 }}>{t("landing_cta_primary", lang)}</button>
              <button className={`${styles.ctaButton} ${styles.heroButtonSecondary}`} onClick={() => setLayout("carousel")} style={{ marginLeft: 8 }}>{t("landing_cta_secondary", lang)}</button>
            </div>
          </div>

          <div style={{ marginTop: 18 }}>
            <ScrollingVideoFeed creators={sampleCreators} layout={layout} onInvite={onInvite} onSave={() => {}} onSelectProfile={onSelectProfile} />
          </div>

        </section>

        <section id="cta" style={{ padding: "3rem 1rem", textAlign: "center" }}>
          <h2 style={{ fontSize: 28 }}>{t("collab_title", lang)}</h2>
          <p style={{ color: "rgba(255,255,255,0.78)", maxWidth: 900, margin: "12px auto" }}>{t("collab_subtitle", lang)}</p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", marginTop: 18 }}>
            <button className={styles.ctaButton} onClick={handlePrimary}>{t("landing_cta_primary", lang)}</button>
            <button className={`${styles.ctaButton} ${styles.heroButtonSecondary}`} onClick={() => navigate("/contact")}>{t("landing_cta_secondary", lang)}</button>
          </div>
        </section>

        <LandingFooter_Fusion lang={lang} />
      </main>

      <style>{`
        @keyframes fall { 0% { transform: translateY(-40vh) rotate(-10deg); opacity: 0 } 10% { opacity: 1 } 90% { opacity: 1 } 100% { transform: translateY(120vh) rotate(10deg); opacity: 0 }
      `}</style>
    </div>
  );
};

export default Landing_Fusion;
