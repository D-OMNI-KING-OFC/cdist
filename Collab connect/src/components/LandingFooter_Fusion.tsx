import React from "react";
import styles from "../pages/Landing.module.css";
import { t } from "../i18n/index";

export const LandingFooter_Fusion: React.FC<{ lang: string; className?: string }> = ({ lang, className }) => {
  return (
    <footer className={`${styles.footer} ${className ?? ""}`.trim()} aria-label="site footer">
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 1rem" }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
          <div className={styles.footerLinks}>
            <a className={styles.footerLink} href="#terms">{t("landingTerms", lang) || "Terms"}</a>
            <a className={styles.footerLink} href="#privacy">{t("landingPrivacy", lang) || "Privacy"}</a>
            <a className={styles.footerLink} href="#contact">{t("landingContact", lang) || "Contact"}</a>
          </div>
          <p className={styles.footerText}>© 2025 CollabConnect. {t("footerText", lang)}</p>
        </div>
      </div>
    </footer>
  );
};

export default LandingFooter_Fusion;
