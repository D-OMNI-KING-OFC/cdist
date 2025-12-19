import React, { useCallback, useEffect, useRef, useState } from "react";
import styles from "../pages/Landing.module.css";
import CreatorCardFeedItem, { type Creator } from "./CreatorCardFeedItem";

export type ScrollingVideoFeedProps = {
  creators: Creator[];
  session?: any;
  layout?: "vertical" | "grid" | "carousel";
  onInvite?: (id: string) => void;
  onSave?: (id: string) => void;
  onSelectProfile?: (id: string) => void;
  className?: string;
};

export const ScrollingVideoFeed: React.FC<ScrollingVideoFeedProps> = ({ creators = [], session, layout = "vertical", onInvite, onSave, onSelectProfile, className }) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const observers = useRef<Map<HTMLVideoElement, IntersectionObserver>>(new Map());

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    // Pause autoplay when window blurred
    const onBlur = () => {
      document.querySelectorAll("video").forEach((v) => { try { (v as HTMLVideoElement).pause(); } catch (e) {} });
    };
    const onFocus = () => {
      // resume via intersection callbacks
    };
    window.addEventListener("blur", onBlur);
    window.addEventListener("focus", onFocus);
    return () => {
      window.removeEventListener("blur", onBlur);
      window.removeEventListener("focus", onFocus);
      observers.current.forEach((o) => o.disconnect());
      observers.current.clear();
    };
  }, []);

  const setupObservers = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    const videos = Array.from(container.querySelectorAll("video")) as HTMLVideoElement[];

    videos.forEach((v) => {
      if (observers.current.has(v)) return;
      const obs = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          try {
            if (entry.isIntersecting && entry.intersectionRatio > 0.6) {
              // play
              v.muted = true;
              const p = v.play();
              if (p && typeof p.then === "function") p.catch(() => {});
            } else {
              v.pause();
            }
          } catch (e) {}
        });
      }, { threshold: [0, 0.25, 0.5, 0.75, 1] });
      obs.observe(v);
      observers.current.set(v, obs);
    });
  }, []);

  useEffect(() => {
    setupObservers();
    // re-run when creators change
  }, [creators, setupObservers]);

  // keyboard controls
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onKey = (e: KeyboardEvent) => {
      if (layout === "vertical") {
        if (e.key === "ArrowDown") el.scrollBy({ top: window.innerHeight, behavior: "smooth" });
        if (e.key === "ArrowUp") el.scrollBy({ top: -window.innerHeight, behavior: "smooth" });
      } else {
        if (e.key === "ArrowRight") el.scrollBy({ left: window.innerWidth * 0.6, behavior: "smooth" });
        if (e.key === "ArrowLeft") el.scrollBy({ left: -window.innerWidth * 0.6, behavior: "smooth" });
      }
      if (e.key === "Enter") {
        // activate focused card
        const focused = document.activeElement as HTMLElement | null;
        if (focused && focused.dataset && focused.dataset.creatorId) {
          const id = focused.dataset.creatorId;
          onSelectProfile && onSelectProfile(id);
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [layout, onSelectProfile]);

  // Layout styles
  const isVertical = layout === "vertical";
  const containerStyle: React.CSSProperties = isVertical
    ? {
        height: "calc(100vh - 160px)",
        overflowY: "auto",
        scrollSnapType: "y mandatory",
        WebkitOverflowScrolling: "touch",
      }
    : {
        overflowX: "auto",
        display: "flex",
        gap: 16,
        scrollSnapType: "x mandatory",
        padding: "12px 8px",
      };

  const itemStyle: React.CSSProperties = isVertical
    ? { minHeight: "100vh", scrollSnapAlign: "start", display: "flex", alignItems: "center", justifyContent: "center", padding: 12 }
    : { minWidth: 320, width: 360, height: 460, scrollSnapAlign: "center", flex: "0 0 auto" };

  return (
    <div ref={containerRef} className={className} style={{ ...containerStyle }} aria-label="creator feed">
      {creators.map((c) => (
        <div key={c.auth_uid} style={itemStyle} tabIndex={0} data-creator-id={c.auth_uid} onClick={() => onSelectProfile && onSelectProfile(c.auth_uid)}>
          <div style={{ width: "100%", height: "100%", borderRadius: 16, overflow: "hidden", boxShadow: "0 10px 32px rgba(2,6,23,0.6)", border: "1px solid rgba(255,255,255,0.04)" }}>
            <CreatorCardFeedItem creator={c} onInvite={onInvite} onSave={onSave} onSelectProfile={onSelectProfile} />
          </div>
        </div>
      ))}

      {/* sentinel to load more */}
      <div style={{ height: 48, width: "100%" }} />
    </div>
  );
};

export default ScrollingVideoFeed;
