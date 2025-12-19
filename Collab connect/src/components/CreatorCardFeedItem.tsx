import React, { useEffect, useRef, useState } from "react";
import styles from "../pages/Landing.module.css";

export type Creator = {
  auth_uid: string;
  profile_image?: string;
  display_name: string;
  platform?: string;
  followers?: number;
  avg_views?: number;
  engagement?: number;
  latest_post_url?: string;
  price_range?: string;
  niche?: string[];
  poster?: string;
};

export type CreatorCardProps = {
  creator: Creator;
  onInvite?: (id: string) => void;
  onSave?: (id: string) => void;
  onSelectProfile?: (id: string) => void;
  className?: string;
};

export const CreatorCardFeedItem: React.FC<CreatorCardProps> = ({ creator, onInvite, onSave, onSelectProfile, className }) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const handleCanPlay = () => setLoaded(true);
    v.addEventListener("canplay", handleCanPlay);
    return () => v.removeEventListener("canplay", handleCanPlay);
  }, []);

  return (
    <article
      className={className}
      style={{
        borderRadius: 16,
        overflow: "hidden",
        position: "relative",
        background: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(255,255,255,0.06)",
      }}
      aria-label={`Creator ${creator.display_name}`}
    >
      {creator.latest_post_url ? (
        <video
          ref={videoRef}
          src={creator.latest_post_url}
          poster={creator.poster}
          preload="metadata"
          playsInline
          muted
          loop
          style={{ width: "100%", height: "100%", display: "block", objectFit: "cover" }}
        />
      ) : (
        <img src={creator.poster || creator.profile_image} alt={creator.display_name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      )}

      <div
        style={{
          position: "absolute",
          left: 12,
          right: 12,
          bottom: 12,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-end",
          gap: 12,
        }}
      >
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <img src={creator.profile_image} alt={creator.display_name} style={{ width: 44, height: 44, borderRadius: 8, objectFit: "cover", border: "1px solid rgba(255,255,255,0.06)" }} />
          <div style={{ color: "#eaf3ff" }}>
            <div style={{ fontWeight: 800 }}>{creator.display_name}</div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.72)" }}>{creator.niche?.slice(0,2).join(" • ")}</div>
          </div>
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={() => onInvite && onInvite(creator.auth_uid)}
            style={{
              background: "linear-gradient(90deg,#FF5A2D,#D633FF)",
              color: "#fff",
              border: "none",
              padding: "6px 10px",
              borderRadius: 999,
              fontWeight: 800,
              transform: "translateY(0)",
              transition: "transform .18s ease, box-shadow .18s ease",
            }}
          >
            Invite
          </button>

          <button
            onClick={() => onSave && onSave(creator.auth_uid)}
            aria-label={`Save ${creator.display_name}`}
            style={{
              background: "rgba(255,255,255,0.06)",
              color: "#eaf3ff",
              border: "1px solid rgba(255,255,255,0.08)",
              padding: "6px 10px",
              borderRadius: 999,
              fontWeight: 700,
            }}
          >
            Save
          </button>
        </div>
      </div>
    </article>
  );
};

export default CreatorCardFeedItem;
