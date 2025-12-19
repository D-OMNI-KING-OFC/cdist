import React, { useEffect } from "react";
import styles from "../pages/Landing.module.css";
import { t } from "../i18n/index";
import useIntersection from "../hooks/useIntersectionHook";

export const featureImage1 = "https://lh3.googleusercontent.com/aida-public/AB6AXuDTAkrc1Jz5yicifSte8KMC5xRRPkp5vsonuzdbxn9BRq6L-421rZAMeROSf0Oe7mBRMnXkJ3Y5EYTyYD9xJpjOdKuePCbgNXEQT6V426Zq0Yk9b7Udyvtua_G2X45A1V6Em0hlI_7Xy0XyHfVDcQ5PjPmGEfEUb0clCHsmYSx2ik8FdJIbAVJm55PIbEaFwYnKxotyeE4TF4g3xiZUYm-BbJVgNcMiMe3xFzQ8a-S0zvC4Dga_VQjUmi_HHjO2a2h9ZTJNoZaKd8Q";
export const featureImage2 = "https://lh3.googleusercontent.com/aida-public/AB6AXuCHZoc_yX_U05bLpstdvy6mwCvANdCZQ1UUUgXC4LHhwyGV4AKpcfC5_a7iLdCPvkxkgiP2FxKpo9PapQCaoRiG6LYlQdgtTUJ-0sySiSzERdH7T1VqQckceH2Oos27MIz4b7CWATnShui76a-5OMAWTRH7WKUV9fogzzAc5a-crMcJwDIT_OIugt1V2zrxSCiXkTheRD_msdfoTFOZAloUMPYlaxoDo2733k-sH7OIjaAg3OSwWnC14i4uElIrZTrQSh0RrlLGpEE";
export const featureImage3 = "https://lh3.googleusercontent.com/aida-public/AB6AXuC1cfOUmG9i7WqkvTR7zByXOtqUpeZxkOVt08XwUohzNiazix0xXT5_VI6ACVKtlsXLSTdgE4QnBnWzpaObWCnwA8Qmsg8Xwq033itODM6KnAqv7MpVEIsIRGUCOwBSZRihGh-ZZGE0wzMJIQyA2aYiuWTnLHTs_2zGqw0paXTnwds3zxfs03anGcYrXzl5A26c0DwlKmArrSPjD2xgFjplsHZ3pOnAFWEVuyVI-KdxRXC0KX3tCYJiOfPSL0hCvKxATdYQETrWHJE";

export type FeaturesSectionProps = { lang: string; className?: string };

export const FeaturesSection_Fusion: React.FC<FeaturesSectionProps> = ({ lang, className }) => {
  const ref = useIntersection<HTMLDivElement>({ rootMargin: "-10%" });

  useEffect(() => {}, []);

  return (
    <section id="features" ref={ref} className={`${styles.featuresSection} ${styles.section} ${className ?? ""}`.trim()} aria-label="features">
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 1rem" }}>
        <div style={{ textAlign: "center", maxWidth: 800, margin: "0 auto 2rem" }}>
          <h2 className={styles.heroTitle}>{t("servicesTitle", lang) || (t as any)("service1Title", lang)}</h2>
          <p className={styles.heroSubtitle}>{t("service1Desc", lang) || (t as any)("service1Desc", lang)}</p>
        </div>

        <div className={styles.featuresContainer}>
          <div className={styles.featureCard}>
            <div className={styles.featureImage} style={{ backgroundImage: `url(${featureImage1})` }} />
            <div>
              <h3 className={styles.featureTitle}>{t("feature1Title", lang) || "Search creators"}</h3>
              <p className={styles.featureDesc}>{t("feature1Desc", lang) || "Powerful search across platforms."}</p>
            </div>
          </div>

          <div className={styles.featureCard}>
            <div className={styles.featureImage} style={{ backgroundImage: `url(${featureImage2})` }} />
            <div>
              <h3 className={styles.featureTitle}>{t("feature2Title", lang) || "Manage campaigns"}</h3>
              <p className={styles.featureDesc}>{t("feature2Desc", lang) || "Track progress and payments."}</p>
            </div>
          </div>

          <div className={styles.featureCard}>
            <div className={styles.featureImage} style={{ backgroundImage: `url(${featureImage3})` }} />
            <div>
              <h3 className={styles.featureTitle}>{t("feature3Title", lang) || "Analytics"}</h3>
              <p className={styles.featureDesc}>{t("feature3Desc", lang) || "Measure reach and engagement."}</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection_Fusion;
