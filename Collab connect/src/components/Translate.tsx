// Translate.tsx
import React, { useEffect, useState } from "react";

type TranslateProps = {
  lang: string;
  setLang: (lang: "en" | "ko" | "fr") => void;
};

export default function Translate({ lang, setLang }: TranslateProps) {
  const buttons: { code: "en" | "ko" | "fr"; label: string }[] = [
    { code: "en", label: "EN" },
    { code: "ko", label: "KO" },
    { code: "fr", label: "FR" },
  ];

  const [isSmall, setIsSmall] = useState<boolean>(() =>
    typeof window !== "undefined" ? window.innerWidth < 640 : false
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    const onResize = () => setIsSmall(window.innerWidth < 640);
    window.addEventListener("resize", onResize, { passive: true });
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const containerStyle: React.CSSProperties = {
    position: "fixed",
    top: isSmall ? "auto" : "1rem",
    right: isSmall ? "0.75rem" : "2rem",
    bottom: isSmall ? "0.75rem" : "auto",
    left: isSmall ? "50%" : "auto",
    transform: isSmall ? "translateX(-50%)" : undefined,
    display: "flex",
    gap: "0.4rem",
    zIndex: 600,
    fontSize: "clamp(0.78rem, 0.9vw, 1rem)",
    alignItems: "center",
    padding: isSmall ? "0.22rem" : "0.3rem",
    borderRadius: 9999,
    background: "rgba(10,16,35,0.55)",
    backdropFilter: "blur(8px) saturate(140%)",
    WebkitBackdropFilter: "blur(8px) saturate(140%)",
    boxShadow: "0 8px 26px rgba(0,0,0,0.35)",
    border: "1px solid rgba(120,160,255,0.22)",
    maxWidth: "calc(100% - 2rem)",
    overflow: "hidden",
    flexWrap: "nowrap",
    justifyContent: isSmall ? "center" : "flex-end",
    pointerEvents: "auto",
  };

  const btnBase: React.CSSProperties = {
    padding: "0.22rem 0.55rem",
    borderRadius: 8,
    border: "1px solid rgba(80,110,170,0.35)",
    backgroundColor: "rgba(255,255,255,0.06)",
    color: "#dbe7ff",
    cursor: "pointer",
    fontWeight: 800,
    minWidth: 36,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "transform 160ms ease, box-shadow 160ms ease, background-color 160ms ease, border-color 160ms ease",
    boxShadow: "0 4px 14px rgba(0,0,0,0.25)",
    flexShrink: 0,
  };

  const activeStyle: React.CSSProperties = {
    border: "1px solid rgba(120,160,255,0.65)",
    background: "linear-gradient(90deg, #0b66ff, #0056ff)",
    color: "#fff",
    boxShadow: "0 8px 20px rgba(11,102,255,0.35)",
  };

  return (
    <div style={containerStyle} aria-label="language selector">
      {buttons.map((btn) => (
        <button
          key={btn.code}
          onClick={() => setLang(btn.code)}
          aria-pressed={lang === btn.code}
          title={btn.label}
          style={{
            ...btnBase,
            ...(lang === btn.code ? activeStyle : { opacity: 0.98 }),
            padding: isSmall ? "0.18rem 0.45rem" : btnBase.padding,
            fontSize: isSmall ? "0.82rem" : undefined,
          }}
        >
          {btn.label}
        </button>
      ))}
    </div>
  );
}
