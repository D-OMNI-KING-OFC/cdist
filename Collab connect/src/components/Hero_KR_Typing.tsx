import React, { useEffect, useMemo, useRef, useState } from "react";
import { t } from "../i18n/index";
import styles from "../pages/Landing.module.css";

export type HeroTypingProps = {
  lang: string;
  onPrimaryCTA: () => void;
  className?: string;
};

export const Hero_KR_Typing: React.FC<HeroTypingProps> = ({ lang, onPrimaryCTA, className }) => {
  const prefersReduced = typeof window !== "undefined" && window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const phrases: string[] = useMemo(() => {
    // Pull from i18n array key 'heroTypedPhrases' — fallback hardcoded phrases
    const fromI18n = (t as any)("heroTypedPhrases", lang) as string[] | undefined;
    if (Array.isArray(fromI18n) && fromI18n.length >= 1) return fromI18n;
    return [
      "connects creators and brands",
      "finds perfect matches",
      "grows audience together",
    ];
  }, [lang]);

  const base = (t as any)("landingTitle", lang) || "CollabConnect";
  const [display, setDisplay] = useState<string>("");
  const phraseIndex = useRef(0);
  const charIndex = useRef(0);
  const deleting = useRef(false);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    if (prefersReduced) {
      setDisplay(phrases[0]);
      return () => {
        mounted.current = false;
      };
    }

    let timeout: number | undefined;

    const tick = () => {
      const current = phrases[phraseIndex.current % phrases.length];
      if (!deleting.current) {
        // typing
        if (charIndex.current < current.length) {
          charIndex.current += 1;
          setDisplay(current.slice(0, charIndex.current));
          timeout = window.setTimeout(tick, 150);
        } else {
          // pause then delete
          timeout = window.setTimeout(() => {
            deleting.current = true;
            timeout = window.setTimeout(tick, 60);
          }, 650);
        }
      } else {
        if (charIndex.current > 0) {
          charIndex.current -= 1;
          setDisplay(current.slice(0, charIndex.current));
          timeout = window.setTimeout(tick, 60);
        } else {
          deleting.current = false;
          phraseIndex.current = (phraseIndex.current + 1) % phrases.length;
          timeout = window.setTimeout(tick, 150);
        }
      }
    };

    timeout = window.setTimeout(tick, 450);

    return () => {
      mounted.current = false;
      if (timeout) window.clearTimeout(timeout);
    };
  }, [phrases, prefersReduced]);

  return (
    <section className={`${styles.heroSection} ${className ?? ""}`.trim()} aria-label="hero">
      <div className={styles.heroBg}>
        <div className={styles.heroContent}>
          <h1 className={styles.heroTitle}>
            {base}
            <span style={{ display: "inline-block", marginLeft: 8 }} />
            <span aria-live={prefersReduced ? undefined : "polite"} aria-atomic className="hero-typing">
              <span style={{ color: "var(--primary)", fontWeight: 900 }}>{display}</span>
              <span
                aria-hidden
                style={{
                  display: "inline-block",
                  width: 12,
                  marginLeft: 8,
                  background: "transparent",
                  animation: prefersReduced ? "none" : "blink 1s step-end infinite",
                  borderLeft: "2px solid var(--primary)",
                  height: "1em",
                  verticalAlign: "text-bottom",
                }}
              />
            </span>
          </h1>

          <p className={styles.heroSubtitle}>
            {(t as any)("landingSubtitle", lang) || "Discover creators and grow together."}
          </p>

          <div className={styles.heroButtons}>
            <button className={`${styles.heroButton} ${styles.heroButtonPrimary}`} onClick={onPrimaryCTA}>
              {(t as any)("getStarted", lang) || "Get started"}
            </button>
            <button
              className={`${styles.heroButton} ${styles.heroButtonSecondary}`}
              onClick={() => {
                const el = document.getElementById("features");
                if (el) el.scrollIntoView({ behavior: "smooth" });
              }}
            >
              {(t as any)("landingLearnMore", lang) || "Learn more"}
            </button>
          </div>
        </div>
      </div>
      <style>{`@keyframes blink { 50% { opacity: 0 } }`}</style>
    </section>
  );
};

export default Hero_KR_Typing;
