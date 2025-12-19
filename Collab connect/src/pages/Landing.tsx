import { t } from "../i18n/index";
import { useNavigate } from "react-router-dom";
import { useState, useEffect, useRef } from "react";

import { supabase } from "../lib/supabaseClient";
import VideoArch from "./VideoArch";
import MTS from "../components/MTS";

import ccLogo from "../assets/cc-3d.png";
import campaignManagementImg from "../assets/campaign-management.png";
import influencerDiscoveryImg from "../assets/influencer-discovery.jpg";
import collaborationToolsImg from "../assets/collaboration-tools.png";
import styles from "./Landing.module.css";

type LandingProps = {
  lang: string;
};

export default function Landing({ lang }: LandingProps) {
  const navigate = useNavigate();
  const [session, setSession] = useState<any>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [viewScale, setViewScale] = useState<number>(1);
  const resizeTimerRef = useRef<number | null>(null);

  const MIN_SCALE = 0.3;
  const REF_WIDTH = 120;
  const computeScaleFromVW = (vw: number) => Math.max(MIN_SCALE, Math.min(1, vw / REF_WIDTH));

  useEffect(() => {
    if (typeof window === "undefined") return;
    const applyScale = () => {
      setViewScale(computeScaleFromVW(window.innerWidth));
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

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      setSession(data.session);
      if (data.session?.user) {
        const { data: profile, error } = await supabase
          .from("profiles")
          .select("role")
          .eq("auth_uid", data.session.user.id)
          .single();
        if (!error && profile) setUserRole(profile.role || null);
      }
    });

    const { data: listener } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      if (session?.user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("auth_uid", session.user.id)
          .single();
        setUserRole(profile?.role || null);
      } else {
        setUserRole(null);
      }
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  const handleGetStarted = () => {
    if (!session) {
      navigate("/login");
    } else if (!userRole) {
      navigate("/role-selection");
    } else {
      navigate("/dashboard");
    }
  };

  const sectionsRef = useRef<Array<HTMLDivElement | null>>([]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add(styles.fadeIn);
          }
        });
      },
      { threshold: 0.2 }
    );

    sectionsRef.current.forEach((section) => {
      if (section) observer.observe(section);
    });

    return () => observer.disconnect();
  }, []);

  const setSectionRef = (index: number) => (el: HTMLDivElement | null) => {
    sectionsRef.current[index] = el;
  };



  return (
    <div className={styles.landingContainer}>
      <header className={styles.header}>
        <div className={styles.logoContainer}>
          <div className={styles.logoIcon}>
            <img src={ccLogo} alt="CollabConnect" />
          </div>
          <h2 className={styles.logoText}>CollabConnect</h2>
        </div>

        <nav className={styles.navLinks}>
          <a className={styles.navLink} href="#home">{t("landingNavHome", lang) || "Home"}</a>
          <a className={styles.navLink} href="#features">{t("landingNavFeatures", lang) || "Features"}</a>
          <a className={styles.navLink} href="#pricing">{t("landingNavPricing", lang) || "Pricing"}</a>
          <a className={styles.navLink} href="#resources">{t("landingNavResources", lang) || "Resources"}</a>
        </nav>

        <div className={styles.mh}>
          <button className={`${styles.headerButton} ${styles.loginButton}`} onClick={() => navigate("/login")} type="button">
            {t("signIn", lang) || "Sign In"}
          </button>
          <button className={`${styles.headerButton} ${styles.getStartedButton}`} onClick={handleGetStarted} type="button">
            {t("getStarted", lang) || "Get Started"}
          </button>
        </div>
      </header>

      <main>
        <section ref={setSectionRef(0)} className={`${styles.heroSection} ${styles.section}`}>
          <div className={styles.heroOverlay} aria-hidden />
          <div className={styles.heroBg}>
            <div className={styles.heroContent}>
              <h1 className={styles.heroTitle}>{t("landingTitle", lang) || "Connect Brands with Creators"}</h1>
              <p className={styles.heroSubtitle}>{t("landingSubtitle", lang) || "The ultimate platform for influencer marketing. Discover content creators, launch campaigns, and grow your brand."}</p>
              <div className={styles.heroButtons}>
                <button className={`${styles.heroButton} ${styles.heroButtonPrimary}`} onClick={handleGetStarted}>
                  {t("getStarted", lang) || "Get Started"}
                </button>
                <button className={`${styles.heroButton} ${styles.heroButtonSecondary}`} onClick={() => {
                  const el = document.getElementById("features");
                  if (el) el.scrollIntoView({ behavior: "smooth" });
                }}>
                  {t("landingLearnMore", lang) || "Learn More"}
                </button>
              </div>
            </div>
          </div>
        </section>

        <section className={styles.featuresSection}>
          <div
            style={{
              transform: `scale(${viewScale})`,
              transformOrigin: "top center",
              transition: "transform 200ms ease",
              width: "100%",
            }}
          >
            <div style={{ padding: "25px", maxWidth: "100%", display: "flex", flexDirection: "column", alignItems: "center" }}>
              <VideoArch />
            </div>
          </div>
        </section>

        <section style={{ display: "flex", justifyContent: "center", flexDirection: "column", padding: "2rem" }}>
          <MTS lang={lang} />
        </section>

        <section id="features" ref={setSectionRef(1)} className={`${styles.featuresSection} ${styles.section}`}>
          <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 1.5rem" }}>
            <div style={{ textAlign: "center", maxWidth: 800, margin: "0 auto 3rem" }}>
              <h2 className={styles.heroTitle}>{t("servicesTitle", lang) || "Our Services"}</h2>
              <p className={styles.heroSubtitle}>{t("serviceDesc", lang) || "Everything you need to run successful influencer campaigns."}</p>
            </div>

            <div className={styles.featuresContainer}>
              <div className={styles.featureCard}>
                <div className={styles.featureImage} style={{ backgroundImage: `url("${campaignManagementImg}")` }} />
                <div>
                  <h3 className={styles.featureTitle}>{t("feature1Title", lang) || "Discover Creators"}</h3>
                  <p className={styles.featureDesc}>{t("feature1Desc", lang) || "Find the perfect influencers for your brand across all major platforms."}</p>
                </div>
              </div>

              <div className={styles.featureCard}>
                <div className={styles.featureImage} style={{ backgroundImage: `url("${influencerDiscoveryImg}")` }} />
                <div>
                  <h3 className={styles.featureTitle}>{t("feature2Title", lang) || "Launch Campaigns"}</h3>
                  <p className={styles.featureDesc}>{t("feature2Desc", lang) || "Create and manage influencer campaigns with our powerful tools."}</p>
                </div>
              </div>

              <div className={styles.featureCard}>
                <div className={styles.featureImage} style={{ backgroundImage: `url("${collaborationToolsImg}")` }} />
                <div>
                  <h3 className={styles.featureTitle}>{t("feature3Title", lang) || "Track Performance"}</h3>
                  <p className={styles.featureDesc}>{t("feature3Desc", lang) || "Monitor campaign results with detailed analytics and insights."}</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section ref={setSectionRef(2)} className={`${styles.featuresSection} ${styles.section}`}>
          <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 1.5rem", textAlign: "center" }}>
            <h2 className={styles.heroTitle}>{t("whyUsTitle", lang) || "Why Choose Us"}</h2>
            <div style={{ display: "flex", justifyContent: "center", gap: 32, flexWrap: "wrap", marginTop: 32 }}>
              <div className={styles.featureCard} style={{ maxWidth: 280, textAlign: "center", padding: "2rem" }}>
                <h3 style={{ fontSize: 32, fontWeight: 800, color: "var(--primary-light)", margin: "0 0 8px" }}>{t("stat1Number", lang) || "10K+"}</h3>
                <p style={{ color: "var(--text-secondary)" }}>{t("stat1Text", lang) || "Active Creators"}</p>
              </div>
              <div className={styles.featureCard} style={{ maxWidth: 280, textAlign: "center", padding: "2rem" }}>
                <h3 style={{ fontSize: 32, fontWeight: 800, color: "var(--primary-light)", margin: "0 0 8px" }}>{t("stat2Number", lang) || "500+"}</h3>
                <p style={{ color: "var(--text-secondary)" }}>{t("stat2Text", lang) || "Brand Partners"}</p>
              </div>
              <div className={styles.featureCard} style={{ maxWidth: 280, textAlign: "center", padding: "2rem" }}>
                <h3 style={{ fontSize: 32, fontWeight: 800, color: "var(--primary-light)", margin: "0 0 8px" }}>{t("stat3Number", lang) || "$2M+"}</h3>
                <p style={{ color: "var(--text-secondary)" }}>{t("stat3Text", lang) || "Paid to Creators"}</p>
              </div>
            </div>
          </div>
        </section>

        <section ref={setSectionRef(3)} className={`${styles.ctaSection} ${styles.section}`}>
          <div style={{ maxWidth: 800, margin: "0 auto", padding: "0 1.5rem", textAlign: "center" }}>
            <h2 className={styles.heroTitle}>{t("ctaTitle", lang) || "Ready to Get Started?"}</h2>
            <p className={styles.heroSubtitle} style={{ marginTop: 16 }}>Join thousands of brands and creators already growing together.</p>
            <div style={{ marginTop: 32 }}>
              <button className={styles.ctaButton} onClick={handleGetStarted}>
                {t("getStarted", lang) || "Get Started Free"}
              </button>
            </div>
          </div>
        </section>
      </main>

      <footer className={styles.footer}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 1.5rem" }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
            <div className={styles.footerLinks}>
              <a className={styles.footerLink} href="#terms">{t("landingTerms", lang) || "Terms"}</a>
              <a className={styles.footerLink} href="#privacy">{t("landingPrivacy", lang) || "Privacy"}</a>
              <a className={styles.footerLink} href="#contact">{t("landingContact", lang) || "Contact"}</a>
            </div>
            <p className={styles.footerText}> {t("footerText", lang) || "All rights reserved."}</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
