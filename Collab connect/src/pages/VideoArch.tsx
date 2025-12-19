import React, { useEffect, useRef, useState } from "react";
import styles from "./VideoArch.module.css";

/**
 * VideoArch - compact section version suitable for a landing page
 *
 * Props:
 *  - videos?: string[] (YouTube / youtu.be / youtube.com/watch / youtube embed)
 *  - arcDegrees?: number  (angular span of the arch)
 *  - radius?: number      (translateZ in px — smaller for section)
 *  - autoRotateDegPerSec?: number
 */
type Props = {
  videos?: string[];
  arcDegrees?: number;
  radius?: number;
  autoRotateDegPerSec?: number;
};
                                                                                 
function extractYouTubeEmbedUrl(raw: string) {
  try {
    const u = new URL(raw);
    if (u.hostname.includes("youtube.com") && u.pathname.startsWith("/shorts/")) {
      const id = u.pathname.split("/")[2];
      return `https://www.youtube-nocookie.com/embed/${encodeURIComponent(
        id
      )}?autoplay=1&mute=1&controls=0&loop=1&playlist=${encodeURIComponent(id)}&rel=0&modestbranding=1&playsinline=1`;
    }
    if (u.hostname.includes("youtu.be")) {
      const id = u.pathname.slice(1);
      return `https://www.youtube-nocookie.com/embed/${encodeURIComponent(
        id
      )}?autoplay=1&mute=1&controls=0&loop=1&playlist=${encodeURIComponent(id)}&rel=0&modestbranding=1&playsinline=1`;
    }
    if (u.hostname.includes("youtube.com") && u.searchParams.get("v")) {
      const id = u.searchParams.get("v")!;
      return `https://www.youtube-nocookie.com/embed/${encodeURIComponent(
        id
      )}?autoplay=1&mute=1&controls=0&loop=1&playlist=${encodeURIComponent(id)}&rel=0&modestbranding=1&playsinline=1`;
    }
  } catch {
    // not a valid URL; fall through
  }
  if (raw.includes("youtube.com/embed/")) return raw;
  return raw;
}

export default function VideoArch({
  videos = [
    "https://www.youtube.com/shorts/8UpxiFOnNj8",
    "https://www.youtube.com/shorts/tVZZvUClIsM",
    "https://www.youtube.com/shorts/8UpxiFOnNj8",
    "https://www.youtube.com/shorts/F7oCBfg1NZk",
  ],
  arcDegrees = 360,
  radius = 100, // reduced for section
  autoRotateDegPerSec = 8,
}: Props) {
  const n = Math.max(1, videos.length);
  const embeds = React.useMemo(() => videos.map((v) => extractYouTubeEmbedUrl(v)), [videos]);

  // rotation & RAF
  const [isPaused, setIsPaused] = useState(false);
  const [rotationDeg, setRotationDeg] = useState(0);
  const rafRef = useRef<number | null>(null);
  const lastRef = useRef<number | null>(null);

  // dragging
  const containerRef = useRef<HTMLDivElement | null>(null);
  const isDragging = useRef(false);
  const dragStartX = useRef(0);
  const startRotation = useRef(0);

  // lazy-loading / observer
  const [active, setActive] = useState<boolean[]>(() => Array(n).fill(false));
  const panelRefs = useRef<Array<HTMLDivElement | null>>([]);

  // keep active array length aligned when n changes
  useEffect(() => {
    setActive((prev) => {
      if (prev.length === n) return prev;
      const next = Array(n).fill(false);
      for (let i = 0; i < Math.min(prev.length, n); i++) next[i] = prev[i];
      return next;
    });
    panelRefs.current = panelRefs.current.slice(0, n);
  }, [n]);

  // pre-activate center panel immediately for better UX
  useEffect(() => {
    setActive((prev) => {
      const next = prev.slice();
      const center = Math.floor(n / 2);
      if (!next[center]) next[center] = true;
      return next;
    });
  }, [n]);

  // RAF loop for auto-rotate
  useEffect(() => {
    const tick = (t: number) => {
      if (lastRef.current == null) lastRef.current = t;
      const dt = (t - lastRef.current) / 1000;
      lastRef.current = t;
      if (!isPaused && !isDragging.current) {
        setRotationDeg((r) => (r + autoRotateDegPerSec * dt) % 360);
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      lastRef.current = null;
    };
  }, [isPaused, autoRotateDegPerSec]);

  // pointer/touch drag handlers
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const onDown = (clientX: number) => {
      isDragging.current = true;
      dragStartX.current = clientX;
      startRotation.current = rotationDeg;
      setIsPaused(true);
    };
    const onMove = (clientX: number) => {
      if (!isDragging.current) return;
      const dx = clientX - dragStartX.current;
      const degreesPerPx = 0.24;
      setRotationDeg(startRotation.current + dx * degreesPerPx);
    };
    const onUp = () => {
      isDragging.current = false;
      setIsPaused(false);
    };

    const onPointerDown = (ev: PointerEvent) => onDown(ev.clientX);
    const onPointerMove = (ev: PointerEvent) => onMove(ev.clientX);
    const onPointerUp = () => onUp();

    el.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);

    const touchStart = (e: TouchEvent) => onDown(e.touches[0].clientX);
    const touchMove = (e: TouchEvent) => onMove(e.touches[0].clientX);
    const touchEnd = () => onUp();

    el.addEventListener("touchstart", touchStart, { passive: true });
    window.addEventListener("touchmove", touchMove, { passive: true });
    window.addEventListener("touchend", touchEnd);

    return () => {
      el.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      el.removeEventListener("touchstart", touchStart);
      window.removeEventListener("touchmove", touchMove);
      window.removeEventListener("touchend", touchEnd);
    };
  }, [rotationDeg]);

  // IntersectionObserver for lazy-loading
  useEffect(() => {
    if (typeof window === "undefined") return;
    const rootEl = containerRef.current ?? null;
    const obs = new IntersectionObserver(
      (entries) => {
        setActive((prev) => {
          const next = prev.slice();
          let changed = false;
          for (const entry of entries) {
            const target = entry.target as HTMLDivElement;
            const idx = panelRefs.current.indexOf(target);
            if (idx === -1) continue;
            const isVisible = entry.isIntersecting && entry.intersectionRatio > 0;
            if (next[idx] !== isVisible) {
              next[idx] = isVisible;
              changed = true;
            }
          }
          return changed ? next : prev;
        });
      },
      {
        root: rootEl,
        rootMargin: "300px",
        threshold: [0, 0.05, 0.2, 0.5],
      }
    );

    panelRefs.current.forEach((el) => {
      if (el) obs.observe(el);
    });

    return () => {
      obs.disconnect();
    };
  }, [embeds.length]);

  const step = n > 1 ? arcDegrees / (n - 1) : 0;

  return (
    <section
      className={styles.viewerWrap}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      ref={containerRef}
      aria-label="Video arch section"
    >
      <div
        className={styles.arch}
        style={{
          transform: `perspective(900px) rotateX(6deg) rotateY(${rotationDeg}deg)`,
        }}
      >
        {embeds.map((src, i) => {
          const angle = -arcDegrees / 2 + i * step;
          const tz = radius;
          const theta = (angle * Math.PI) / 180;
          const ty = -Math.abs(Math.sin(theta)) * 18; // reduced vertical curve for section
          const zIndex = Math.round(1000 - Math.abs(angle));
          const transformStyle = `rotateY(${angle}deg) translateZ(${tz}px) translateY(${ty}px)`;

          return (
            <div
              key={i}
              ref={(el) => {
                if (el) panelRefs.current[i] = el;
              }}
              className={styles.panel}
              style={{
                transform: transformStyle,
                zIndex,
                opacity: 0.98,
                // scale fallback for older browsers — we apply via transform on hover in CSS
              }}
              data-angle={angle}
              aria-hidden={false}
            >
              <div className={styles.panelInner}>
                {active[i] ? (
                  <iframe
                    title={`short-${i}`}
                    src={src}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
                    allowFullScreen
                    loading="lazy"
                  />
                ) : (
                  <div className={styles.placeholder}>Loading…</div>
                )}
              </div>
            </div>
          );
        })}
      </div>

         </section>
  );
}
