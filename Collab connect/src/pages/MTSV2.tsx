// src/pages/MTSV2.tsx
import React, { useState, useRef, useEffect } from "react";
import styles from "../components/InfluencerCards.module.css";
import { t } from "../i18n/index";
// assume your global/custom translation function exists as t(key, lang)
// if TypeScript complains, your project likely already provides a global declaration.
// The `lang` prop is optional and defaults to 'en'.

type Props = {
  lang: string;
};

type UnifiedResult = {
  platform: "youtube" | "twitter" | "tiktok" | "facebook" | "instagram";
  id: string;
  name?: string;
  username?: string;
  profilePic?: string;
  description?: string;
  followers?: number | null;
  verified?: boolean;
  raw?: any;
};

const TOTAL_RESULTS = 10; // unchanged

// --- API keys / hosts (unchanged logic) ---
const YT_API_KEY = "AIzaSyDGNK_RKC4i35Oz1OBcrUjWbTTVkK_NMHE";
const RAPID_TWITTER_KEY = "63c292b044msh90f551a27dd1f17p16659ejsn4ea90fcfdac2";
const RAPID_TWITTER_HOST = "twitter-x.p.rapidapi.com";
const RAPID_TIKTOK_KEY = "63c292b044msh90f551a27dd1f17p16659ejsn4ea90fcfdac2";
const RAPID_TIKTOK_HOST = "tiktok-api23.p.rapidapi.com";
const RAPID_FB_KEY = "63c292b044msh90f551a27dd1f17p16659ejsn4ea90fcfdac2";
const RAPID_FB_HOST = "facebook-scraper3.p.rapidapi.com";
const RAPID_IG_KEY = "63c292b044msh90f551a27dd1f17p16659ejsn4ea90fcfdac2";
const RAPID_IG_HOST = "instagram-social-api.p.rapidapi.com";

// helpers (kept same)
const safeNum = (v: any) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

const maskDescription = (desc?: string, showFull = false) => {
  if (!desc) return "";
  if (showFull) return desc;
  const limit = 40;
  if (desc.length <= limit) return desc;
  return desc.slice(0, limit) + " ******";
};

const PlatformIcon = ({ p }: { p: UnifiedResult["platform"] }) => {
  const style = { width: 18, height: 18, display: "inline-block", verticalAlign: "middle" } as const;
  switch (p) {
    case "youtube": return (/* svg as before */ <svg style={style} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="2" y="5" width="20" height="14" rx="4" fill="#FF0000" /><path d="M10 8.5v7l6-3.5-6-3.5z" fill="#fff" /></svg>);
    case "twitter": return (<svg style={style} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M22 5.92c-.63.28-1.31.48-2 .56a3.51 3.51 0 001.54-1.95 7.05 7.05 0 01-2.24.86 3.5 3.5 0 00-6 3.18A9.94 9.94 0 013 4.86a3.5 3.5 0 001.08 4.66 3.45 3.45 0 01-1.6-.44v.04a3.5 3.5 0 002.8 3.43 3.52 3.52 0 01-1.58.06 3.5 3.5 0 003.27 2.43A7.03 7.03 0 013 18.58a9.92 9.92 0 005.37 1.57c6.45 0 9.98-5.34 9.98-9.98 0-.15 0-.31-.01-.46A7.15 7.15 0 0022 5.92z" fill="#1DA1F2" /></svg>);
    case "tiktok": return (<svg style={style} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M17 3h-1.2a4 4 0 01-4 4v5a4 4 0 104 4V9h2V3z" fill="#010101" /><path d="M16.5 3v6.5a3 3 0 11-1.5-2.6V3z" fill="#69C9D0" /><path d="M13.5 14a3 3 0 11-2.9-3.04V14z" fill="#EE1D52" /></svg>);
    case "facebook": return (<svg style={style} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M15 3h3v4h-3v14h-4V7H8V3h3V1.5C11 1 11.7 1 12.3 1 13 1 15 1.6 15 1.6V3z" fill="#1877F2" /></svg>);
    case "instagram": return (<svg style={style} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><rect x="3" y="3" width="18" height="18" rx="5" fill="#E1306C" /><circle cx="12" cy="12" r="3.2" fill="#fff" /><circle cx="17.5" cy="6.5" r="0.9" fill="#fff" /></svg>);
    default: return null;
  }
};
// (All fetch functions identical to the ones you provided)
async function fetchYouTube(query: string, perPlatformLimit: number): Promise<UnifiedResult[]> {
  try {
    if (!query) return [];
    const searchRes = await fetch(
      `https://www.googleapis.com/youtube/v3/search?part=snippet&type=channel&q=${encodeURIComponent(query)}&maxResults=${perPlatformLimit}&key=${YT_API_KEY}`
    );
    const searchData = await searchRes.json();
    const channelIds = (searchData.items || []).map((i: any) => i.id.channelId).filter(Boolean).join(",");
    if (!channelIds) return [];
    const statsRes = await fetch(
      `https://www.googleapis.com/youtube/v3/channels?part=statistics,snippet&id=${channelIds}&key=${YT_API_KEY}`
    );
    const statsData = await statsRes.json();
    const mapped =
      (statsData.items || []).map((channel: any) => {
        return {
          platform: "youtube" as const,
          id: channel.id,
          name: channel.snippet.title,
          username: channel.snippet.title,
          profilePic: channel.snippet.thumbnails?.default?.url,
          description: channel.snippet.description || "",
          followers: safeNum(channel.statistics?.subscriberCount) ?? null,
          verified: false,
          raw: channel,
        };
      }) || [];
    return mapped.slice(0, perPlatformLimit);
  } catch (e) {
    console.error("YouTube fetch error:", e);
    return [];
  }
}

async function fetchTwitter(query: string, perPlatformLimit: number): Promise<UnifiedResult[]> {
  try {
    if (!query) return [];
    const params = new URLSearchParams({ query, section: "top", limit: String(20) });
    const res = await fetch(`https://${RAPID_TWITTER_HOST}/search/?${params.toString()}`, {
      headers: {
        "x-rapidapi-key": RAPID_TWITTER_KEY,
        "x-rapidapi-host": RAPID_TWITTER_HOST,
        Accept: "application/json",
      },
    });
    if (!res.ok) {
      console.warn("Twitter API non-OK", await res.text());
      return [];
    }
    const raw = await res.json();
    const collected: any[] = [];
    if (raw?.globalObjects?.users) collected.push(...Object.values(raw.globalObjects.users));

    // ensure this collector always returns an array (fixes the TS 'possibly undefined' issue)
    const found = (function collect(node: any, acc: any[]) {
      if (!node || typeof node !== "object") return acc;
      if (node?.screen_name || node?.screenName || node?.id_str) acc.push(node);
      for (const k of Object.keys(node)) {
        const v = node[k];
        if (v && typeof v === "object") collect(v, acc);
      }
      return acc;
    })(raw, []);

    if (found && found.length) collected.push(...found);
    const mapped = collected
      .map((u: any) => {
        const id = u.id_str || u.id || (u.user_id_str && String(u.user_id_str));
        const username = u.screen_name || u.username || (u.legacy && u.legacy.screen_name);
        return {
          platform: "twitter" as const,
          id: id ? String(id) : Math.random().toString(),
          name: u.name || username,
          username,
          profilePic: u.profile_image_url_https || u.profile_image_url || (u.legacy && u.legacy.profile_image_url_https),
          description: u.description || (u.legacy && u.legacy.description) || "",
          followers: safeNum(u.followers_count ?? (u.legacy && u.legacy.followers_count)) ?? null,
          verified: Boolean(u.verified || u.is_verified || (u.legacy && u.legacy.verified)),
          raw: u,
        } as UnifiedResult;
      })
      .filter(Boolean);
    const unique = Array.from(new Map(mapped.map((m) => [(m.id || m.username || Math.random()), m])).values());
    unique.sort((a, b) => Number(b.followers || 0) - Number(a.followers || 0));
    return unique.slice(0, perPlatformLimit);
  } catch (e) {
    console.error("Twitter fetch error:", e);
    return [];
  }
}

async function fetchTikTok(query: string, perPlatformLimit: number): Promise<UnifiedResult[]> {
  try {
    if (!query) return [];
    const params = new URLSearchParams({ keyword: query, cursor: "0", search_id: "0" });
    const res = await fetch(`https://${RAPID_TIKTOK_HOST}/api/search/account?${params.toString()}`, {
      headers: {
        "x-rapidapi-key": RAPID_TIKTOK_KEY,
        "x-rapidapi-host": RAPID_TIKTOK_HOST,
        Accept: "application/json",
      },
    });
    if (!res.ok) {
      console.warn("TikTok API non-OK", await res.text());
      return [];
    }
    const data = await res.json();
    let found: any[] = [];
    if (Array.isArray(data?.data)) found.push(...data.data);
    else if (Array.isArray(data?.data?.users)) found.push(...data.data.users);
    else if (Array.isArray(data?.users)) found.push(...data.users);
    if (found.length === 0) {
      const collect = (node: any, acc: any[]) => {
        if (!node || typeof node !== "object") return;
        if (node?.unique_id || node?.nickname || node?.user_id) acc.push(node);
        for (const k of Object.keys(node)) {
          const v = node[k];
          if (v && typeof v === "object") collect(v, acc);
        }
      };
      collect(data, found);
    }
    const mapped = found
      .map((u: any) => {
        const id = u.user_id || u.id || u.uid || (u.user && (u.user.id || u.user.user_id));
        const username = u.unique_id || u.uniqueId || u.username || (u.user && u.user.unique_id);
        return {
          platform: "tiktok" as const,
          id: id ? String(id) : Math.random().toString(),
          name: u.nickname || u.name || username,
          username,
          profilePic:
            (u.avatar_thumb && (u.avatar_thumb.url_list?.[0] || u.avatar_thumb.url)) ||
            u.avatar ||
            u.avatar_larger ||
            (u.user && u.user.avatar) ||
            undefined,
          description: u.signature || u.signature_txt || u.bio || u.description || "",
          followers: safeNum(u.follower_count ?? u.followerCount ?? u.user?.follower_count) ?? null,
          verified: false,
          raw: u,
        } as UnifiedResult;
      })
      .filter(Boolean);
    const unique = Array.from(new Map(mapped.map((m) => [(m.id || m.username || Math.random()), m])).values());
    unique.sort((a, b) => Number(b.followers || 0) - Number(a.followers || 0));
    return unique.slice(0, perPlatformLimit);
  } catch (e) {
    console.error("TikTok fetch error:", e);
    return [];
  }
}

async function fetchFacebookPages(query: string, perPlatformLimit: number): Promise<UnifiedResult[]> {
  try {
    if (!query) return [];
    const params = new URLSearchParams({ query });
    const res = await fetch(`https://${RAPID_FB_HOST}/search/pages?${params.toString()}`, {
      headers: {
        "x-rapidapi-key": RAPID_FB_KEY,
        "x-rapidapi-host": RAPID_FB_HOST,
        Accept: "application/json",
      },
    });
    if (!res.ok) {
      console.warn("FB API non-OK", await res.text());
      return [];
    }
    const data = await res.json();
    let items: any[] = [];
    if (Array.isArray(data)) items = data;
    else if (Array.isArray(data?.data)) items = data.data;
    else if (Array.isArray(data?.results)) items = data.results;
    else if (Array.isArray(data?.pages)) items = data.pages;
    else if (Array.isArray(data?.profiles)) items = data.profiles;
    if (items.length === 0) {
      const found: any[] = [];
      (function collect(node: any) {
        if (!node || typeof node !== "object") return;
        if (node?.name && (node?.id || node?.page_id)) found.push(node);
        for (const k of Object.keys(node)) {
          const v = node[k];
          if (v && typeof v === "object") collect(v);
        }
      })(data);
      items = found;
    }
    const mapped = items
      .map((p: any) => {
        const id = p.id || p.page_id || (p.data && (p.data.id || p.data.page_id));
        const name = p.name || p.title || p.page_name || (p.data && p.data.name);
        const profilePic = p.profile_pic || p.picture || (p.data && p.data.profile_pic) || undefined;
        const description = p.description || p.about || (p.data && p.data.about) || "";
        const followers = safeNum(p.followers ?? p.fan_count ?? p.likes ?? (p.data && p.data.followers)) ?? null;
        const verified = Boolean(p.verified || p.is_verified || p.isVerified || p.is_verified_account);
        return {
          platform: "facebook" as const,
          id: id ? String(id) : Math.random().toString(),
          name,
          username: name,
          profilePic,
          description,
          followers,
          verified,
          raw: p,
        } as UnifiedResult;
      })
      .filter(Boolean);
    const unique = Array.from(new Map(mapped.map((m) => [(m.id || m.name || Math.random()), m])).values());
    unique.sort((a, b) => Number(b.followers || 0) - Number(a.followers || 0));
    return unique.slice(0, perPlatformLimit);
  } catch (e) {
    console.error("Facebook fetch error:", e);
    return [];
  }
}

async function fetchInstagram(query: string, perPlatformLimit: number): Promise<UnifiedResult[]> {
  try {
    if (!query) return [];
    const params = new URLSearchParams({ search_query: query });
    const res = await fetch(`https://${RAPID_IG_HOST}/v1/search_users?${params.toString()}`, {
      headers: {
        "x-rapidapi-key": RAPID_IG_KEY,
        "x-rapidapi-host": RAPID_IG_HOST,
        Accept: "application/json",
      },
    });
    if (!res.ok) {
      console.warn("IG API non-OK", await res.text());
      return [];
    }
    const data = await res.json();
    const items = Array.isArray(data?.data?.items) ? data.data.items : Array.isArray(data?.users) ? data.users : [];
    if (!items.length) return [];
    const mapped = items.map((u: any) => ({
      platform: "instagram" as const,
      id: u.id ? String(u.id) : Math.random().toString(),
      name: u.full_name || u.username,
      username: u.username,
      profilePic: u.profile_pic_url || undefined,
      description: u.biography || "",
      followers: safeNum(u.follower_count) ?? null,
      verified: Boolean(u.is_verified),
      raw: u,
    }));
    mapped.sort((a: { followers: any }, b: { followers: any }) => Number(b.followers || 0) - Number(a.followers || 0));
    return mapped.slice(0, perPlatformLimit);
  } catch (e) {
    console.error("Instagram fetch error:", e);
    return [];
  }
}

export default function MTSV2({lang}: Props) {
  const [query, setQuery] = useState("");
  // initialize labels using t so platform labels are translated
  const initialSelectedPlatforms = [
    { key: "youtube" as const, label: t("platform.youtube", lang), checked: true },
    { key: "twitter" as const, label: t("platform.twitter", lang), checked: true },
    { key: "tiktok" as const, label: t("platform.tiktok", lang), checked: true },
    { key: "facebook" as const, label: t("platform.facebook", lang), checked: true },
    { key: "instagram" as const, label: t("platform.instagram", lang), checked: true },
  ];
  const [selectedPlatforms, setSelectedPlatforms] = useState<
    { key: UnifiedResult["platform"]; label: string; checked: boolean }[]
  >(initialSelectedPlatforms);

  const [minFollowers, setMinFollowers] = useState<number | "">("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<UnifiedResult[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [sub] = useState<boolean>(true);
  const showFullDescriptions = sub;

  const [platformDropdownOpen, setPlatformDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const platformButtonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node | null;
      if (
        platformDropdownOpen &&
        dropdownRef.current &&
        !dropdownRef.current.contains(target!) &&
        platformButtonRef.current &&
        !platformButtonRef.current.contains(target!)
      ) {
        setPlatformDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [platformDropdownOpen]);

  const togglePlatform = (key: UnifiedResult["platform"]) => {
    setSelectedPlatforms((prev) => prev.map((p) => (p.key === key ? { ...p, checked: !p.checked } : p)));
  };

  const setAllPlatforms = (on: boolean) => setSelectedPlatforms((prev) => prev.map((p) => ({ ...p, checked: on })));

  const computeEngagementRate = (r: UnifiedResult) => {
    const followers = Number(r.followers || 0);
    const raw = r.raw || {};
    const candidates = [
      raw.avg_likes,
      raw.average_engagement,
      raw.engagement,
      raw.engagement_rate,
      raw.engagementRate,
      raw.engagements,
      raw.avg_engagement,
      raw.statistics?.likeCount,
      raw.statistics?.commentCount,
      raw.statistics?.viewCount ? Number(raw.statistics.viewCount) * 0.03 : undefined,
      raw.likes,
      raw.recent_likes,
      raw.avg_views,
    ];
    let engagement = null as number | null;
    for (const c of candidates) {
      const n = safeNum(c);
      if (n != null) {
        engagement = Number(n);
        break;
      }
    }
    if (engagement != null && followers > 0) {
      const rate = (engagement / followers) * 100;
      return Number(rate.toFixed(2));
    }
    if (followers <= 0) return 0.0;
    const estimate = Math.max(0.3, Math.min(10, (1000 / (followers + 1000)) * 8));
    return Number(estimate.toFixed(2));
  };

  const handleSearch = async () => {
    setError(null);
    setResults([]);
    if (!query.trim()) {
      setError(t("search.error.typeKeyword", lang));
      return;
    }

    const active = selectedPlatforms.filter((p) => p.checked).map((p) => p.key);
    if (active.length === 0) {
      setError(t("search.error.selectPlatform", lang));
      return;
    }

    const basePerPlatform = Math.max(1, Math.floor(TOTAL_RESULTS / active.length));

    setLoading(true);
    try {
      const calls: Promise<UnifiedResult[]>[] = [];
      for (const platform of active) {
        let perPlatform = basePerPlatform;
        if (platform === "youtube") perPlatform = perPlatform + 5;
        if (platform === "facebook" || platform === "instagram") perPlatform = perPlatform + 1;

        switch (platform) {
          case "youtube":
            calls.push(fetchYouTube(query, perPlatform));
            break;
          case "twitter":
            calls.push(fetchTwitter(query, perPlatform));
            break;
          case "tiktok":
            calls.push(fetchTikTok(query, perPlatform));
            break;
          case "facebook":
            calls.push(fetchFacebookPages(query, perPlatform));
            break;
          case "instagram":
            calls.push(fetchInstagram(query, perPlatform));
            break;
        }
      }

      const settled = await Promise.allSettled(calls);
      let combined: UnifiedResult[] = [];
      for (const s of settled) {
        if (s.status === "fulfilled" && Array.isArray(s.value)) {
          combined.push(...s.value);
        } else {
          console.warn("Platform fetch failed:", s);
        }
      }

      if (minFollowers !== "") {
        const min = Number(minFollowers);
        combined = combined.filter((r) => {
          if (r.followers == null) return false;
          return Number(r.followers) >= min;
        });
      }

      const deduped = Array.from(new Map(combined.map((r) => [`${r.platform}:${r.id}`, r])).values());

      const byPlatformMap = new Map<string, UnifiedResult[]>();
      for (const p of selectedPlatforms.filter((s) => s.checked).map((s) => s.key)) byPlatformMap.set(p, []);
      for (const r of deduped) {
        const arr = byPlatformMap.get(r.platform) ?? [];
        let allowed = basePerPlatform;
        if (r.platform === "youtube") allowed = allowed + 5;
        if (r.platform === "facebook" || r.platform === "instagram") allowed = allowed + 1;
        if (arr.length < allowed) arr.push(r);
        byPlatformMap.set(r.platform, arr);
      }

      let final: UnifiedResult[] = [];
      for (const p of selectedPlatforms.filter((s) => s.checked).map((s) => s.key)) {
        final.push(...(byPlatformMap.get(p) || []));
      }

      if (final.length < TOTAL_RESULTS) {
        const remaining = deduped.filter((d) => !final.some((f) => f.platform === d.platform && f.id === d.id));
        final.push(...remaining.slice(0, TOTAL_RESULTS - final.length));
      }

      final = final.slice(0, TOTAL_RESULTS);

      setResults(final);
      if (final.length === 0) setError(t("search.noResults", lang));
    } catch (err: any) {
      console.error("Multi-platform search error:", err);
      setError(t("search.failed", lang));
    } finally {
      setLoading(false);
    }
  };

  const cardVariantFor = (r: UnifiedResult, index: number) => {
    if (index < 2) return { card: styles["card--v1"], ring: styles["avatarRing--v1"], btn: styles["btn--primary"] };
    switch (r.platform) {
      case "youtube":
        return { card: styles["card--v2"], ring: styles["avatarRing--v2"], btn: styles["btn--primary--blue"] };
      case "instagram":
      case "facebook":
        return { card: styles["card--v1"], ring: styles["avatarRing--v1"], btn: styles["btn--white"] };
      case "tiktok":
        return { card: styles["card--v3"], ring: styles["avatarRing--v3"], btn: styles["btn--primary"] };
      case "twitter":
      default:
        return { card: styles["card--v3"], ring: styles["avatarRing--v2"], btn: styles["btn--primary--blue"] };
    }
  };
  // === Keep your original responsive scale variables and logic (unchanged names) ===
  /**
   * The minimum scale value used for rendering, determined by the current language.
   * If the language is English ("en") or French ("fr"), the minimum scale is set to 0.5.
   * For all other languages, the minimum scale is set to 0.9.
   */
  const MIN_SCALE = 0.7;

  const REF_WIDTH = 1200;
  const [viewScale, setViewScale] = useState<number>(1);
  const resizeTimerRef = useRef<number | null>(null);

  const computeScaleFromVW = (vw: number) => Math.max(MIN_SCALE, Math.min(1, vw / REF_WIDTH));

  useEffect(() => {
    if (typeof window === "undefined") return;
    const applyScale = () => setViewScale(computeScaleFromVW(window.innerWidth));
    applyScale();
    const onResize = () => {
      if (resizeTimerRef.current) window.clearTimeout(resizeTimerRef.current);
      // debounce 120ms
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ----------------------
  // NOTE: The following variables / functions are referenced in the original snippet
  // (t, lang, query, setQuery, minFollowers, setMinFollowers, platformButtonRef, platformDropdownOpen,
  //  setPlatformDropdownOpen, dropdownRef, selectedPlatforms, togglePlatform, handleSearch, loading, error,
  //  results, cardVariantFor, computeEngagementRate, maskDescription, showFullDescriptions, sub, styles, PlatformIcon)
  // They are left as-is — this file assumes they exist in the same scope as before. Do not rename them.
  // ----------------------

  return (
    // Top-level wrapper with dark gradient background
    <div
      style={{
        width: "100%",
        boxSizing: "border-box",
        overflowX: "hidden",
        display: "flex",
        justifyContent: "center",
        background: "linear-gradient(135deg, #010409 0%, #020617 50%, #030712 100%)",
        minHeight: "100vh",
        padding: "40px 20px",
      }}
    >
      {/* Apply the scale once at the top-level so inner elements can size using responsive CSS instead of repeated transforms */}
      <div
        style={{
          transform: `scale(${viewScale})`,
          transformOrigin: "top center",
          transition: "transform 200ms ease, width 200ms ease",
          width: `${100 / viewScale}%`,
          boxSizing: "border-box",
          maxWidth: `${REF_WIDTH}px`,
          padding: "20px",
        }}
      >
        {/* Main container */}
        <div className={styles.container} style={{ width: "100%", maxWidth: "1200px", margin: "0 auto" }}>
          {/* accessible label (srOnly) */}
          <label className={styles.srOnly} htmlFor="mts-query">
            {t("search.label", lang)}
          </label>

          {/* Search controls */}
          <div style={{ gridColumn: "1 / -1" }}>
            <div style={{ display: "flex", gap: 8, marginBottom: 24, alignItems: "center", justifyContent: "center", flexDirection: "column" }}>
              {/* Search bar title */}
              <h2 style={{
                fontSize: "2rem",
                fontWeight: 800,
                margin: "0 0 16px 0",
                background: "linear-gradient(135deg, #0ea5e9, #38bdf8)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
                textAlign: "center",
              }}>
                {t("search.label", lang) || "Discover Influencers"}
              </h2>

              {/* The search bar card: glass morphism with neon accents - responsive mobile fix */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "clamp(6px, 2vw, 12px)",
                  background: "rgba(2, 6, 23, 0.6)",
                  backdropFilter: "blur(20px)",
                  borderRadius: 16,
                  padding: "clamp(8px, 2vw, 16px)",
                  boxShadow: "0 0 40px rgba(14, 165, 233, 0.2), inset 0 0 30px rgba(14, 165, 233, 0.05)",
                  border: "1px solid rgba(14, 165, 233, 0.3)",
                  width: "100%",
                  maxWidth: 900,
                  boxSizing: "border-box",
                  flexWrap: "wrap",
                  transition: "all 300ms ease",
                  justifyContent: "center",
                }}
              >
                {/* Text input: Industry/Niche */}
                <input
                  id="mts-query"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={t("search.placeholder", lang) || "Search influencers..."}
                  style={{
                    flex: "1 1 auto",
                    minWidth: "clamp(140px, 50vw, 480px)",
                    maxWidth: "100%",
                    background: "rgba(255, 255, 255, 0.02)",
                    border: "1px solid rgba(14, 165, 233, 0.2)",
                    borderRadius: 10,
                    padding: "clamp(8px, 1.5vw, 12px) clamp(10px, 2vw, 14px)",
                    outline: "none",
                    fontSize: "clamp(0.8rem, 2vw, 0.95rem)",
                    boxSizing: "border-box",
                    color: "#e6eef8",
                    transition: "all 200ms ease",
                  }}
                  aria-label={t("search.aria", lang)}
                  onFocus={(e) => {
                    (e.target as HTMLInputElement).style.borderColor = "rgba(14, 165, 233, 0.5)";
                    (e.target as HTMLInputElement).style.background = "rgba(14, 165, 233, 0.08)";
                    (e.target as HTMLInputElement).style.boxShadow = "0 0 20px rgba(14, 165, 233, 0.2)";
                  }}
                  onBlur={(e) => {
                    (e.target as HTMLInputElement).style.borderColor = "rgba(14, 165, 233, 0.2)";
                    (e.target as HTMLInputElement).style.background = "rgba(255, 255, 255, 0.02)";
                    (e.target as HTMLInputElement).style.boxShadow = "none";
                  }}
                />

                {/* Min followers input: fixed-ish but responsive */}
                <input
                  type="number"
                  min={0}
                  placeholder={t("minFollowers.placeholder", lang) || "Min"}
                  value={minFollowers as any}
                  onChange={(e) => setMinFollowers(e.target.value === "" ? "" : Number(e.target.value))}
                  style={{
                    flex: "0 1 auto",
                    minWidth: "clamp(80px, 15vw, 140px)",
                    maxWidth: "100%",
                    background: "rgba(255, 255, 255, 0.02)",
                    border: "1px solid rgba(14, 165, 233, 0.2)",
                    borderRadius: 10,
                    padding: "clamp(8px, 1.5vw, 12px) clamp(8px, 1.5vw, 12px)",
                    outline: "none",
                    fontSize: "clamp(0.75rem, 1.5vw, 0.9rem)",
                    boxSizing: "border-box",
                    color: "#e6eef8",
                    transition: "all 200ms ease",
                  }}
                  aria-label={t("minFollowers.aria", lang)}
                  onFocus={(e) => {
                    (e.target as HTMLInputElement).style.borderColor = "rgba(14, 165, 233, 0.5)";
                    (e.target as HTMLInputElement).style.background = "rgba(14, 165, 233, 0.08)";
                  }}
                  onBlur={(e) => {
                    (e.target as HTMLInputElement).style.borderColor = "rgba(14, 165, 233, 0.2)";
                    (e.target as HTMLInputElement).style.background = "rgba(255, 255, 255, 0.02)";
                  }}
                />

                {/* Platform dropdown button */}
                <div style={{ position: "relative", flex: "0 1 auto", minWidth: 0 }}>
                  <button
                    ref={platformButtonRef}
                    onClick={() => setPlatformDropdownOpen((prev) => !prev)}
                    style={{
                      width: "clamp(90px, 18vw, 140px)",
                      background: "rgba(14, 165, 233, 0.1)",
                      border: "1px solid rgba(14, 165, 233, 0.3)",
                      borderRadius: 10,
                      padding: "clamp(8px, 1.5vw, 12px) clamp(8px, 1.5vw, 12px)",
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                      cursor: "pointer",
                      fontSize: "clamp(0.75rem, 1.5vw, 0.9rem)",
                      boxSizing: "border-box",
                      color: "#0ea5e9",
                      fontWeight: 600,
                      transition: "all 200ms ease",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                    onMouseEnter={(e) => {
                      (e.target as HTMLButtonElement).style.background = "rgba(14, 165, 233, 0.15)";
                      (e.target as HTMLButtonElement).style.boxShadow = "0 0 20px rgba(14, 165, 233, 0.3)";
                    }}
                    onMouseLeave={(e) => {
                      (e.target as HTMLButtonElement).style.background = "rgba(14, 165, 233, 0.1)";
                      (e.target as HTMLButtonElement).style.boxShadow = "none";
                    }}
                  >
                    {t("platforms.title", lang) || "Platforms"}
                    <span style={{ marginLeft: 4 }}>▾</span>
                  </button>

                  {platformDropdownOpen && (
                    <div
                      ref={dropdownRef}
                      style={{
                        position: "absolute",
                        top: "calc(100% + 8px)",
                        left: 0,
                        background: "rgba(2, 6, 23, 0.95)",
                        backdropFilter: "blur(20px)",
                        border: "1px solid rgba(14, 165, 233, 0.3)",
                        borderRadius: 12,
                        boxShadow: "0 8px 40px rgba(14, 165, 233, 0.2), 0 0 40px rgba(14, 165, 233, 0.1)",
                        zIndex: 10,
                        display: "flex",
                        flexDirection: "column",
                        padding: 10,
                        minWidth: "180px",
                      }}
                    >
                      {selectedPlatforms.map((p) => (
                        <label
                          key={p.key}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                            cursor: "pointer",
                            padding: "8px 10px",
                            borderRadius: 8,
                            transition: "all 200ms ease",
                            color: "#e6eef8",
                          }}
                          onMouseEnter={(e) => {
                            (e.currentTarget as HTMLLabelElement).style.background = "rgba(14, 165, 233, 0.1)";
                          }}
                          onMouseLeave={(e) => {
                            (e.currentTarget as HTMLLabelElement).style.background = "transparent";
                          }}
                        >
                          <input type="checkbox" checked={p.checked} onChange={() => togglePlatform(p.key)} style={{ display: "none" }} />
                          <span
                            style={{
                              width: 18,
                              height: 18,
                              borderRadius: 4,
                              border: "1.5px solid rgba(14, 165, 233, 0.5)",
                              display: "inline-flex",
                              alignItems: "center",
                              justifyContent: "center",
                              background: p.checked ? "linear-gradient(135deg, #0ea5e9, #06b6d4)" : "transparent",
                              color: "#fff",
                              fontSize: 12,
                              fontWeight: 700,
                              transition: "all 200ms ease",
                              boxShadow: p.checked ? "0 0 12px rgba(14, 165, 233, 0.6)" : "none",
                            }}
                          >
                            {p.checked && "✓"}
                          </span>
                          <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: "0.9rem", fontWeight: 500 }}>
                            <PlatformIcon p={p.key} /> {p.label}
                          </span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>

                {/* Search button - neon gradient */}
                <button
                  onClick={handleSearch}
                  disabled={loading}
                  style={{
                    background: "linear-gradient(135deg, #0ea5e9, #06b6d4)",
                    color: "#fff",
                    border: "1px solid rgba(14, 165, 233, 0.5)",
                    borderRadius: 10,
                    padding: "clamp(8px, 1.5vw, 12px) clamp(12px, 2.5vw, 20px)",
                    marginLeft: 0,
                    cursor: loading ? "not-allowed" : "pointer",
                    fontWeight: 700,
                    fontSize: "clamp(0.7rem, 1.5vw, 0.9rem)",
                    transition: "all 200ms ease",
                    flex: "0 1 auto",
                    boxShadow: "0 0 20px rgba(14, 165, 233, 0.4)",
                    opacity: loading ? 0.6 : 1,
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
                    minWidth: "clamp(70px, 12vw, 120px)",
                    whiteSpace: "nowrap",
                  }}
                  onMouseEnter={(e) => {
                    if (!loading) {
                      (e.target as HTMLButtonElement).style.boxShadow = "0 0 40px rgba(14, 165, 233, 0.6)";
                      (e.target as HTMLButtonElement).style.transform = "translateY(-2px)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    (e.target as HTMLButtonElement).style.boxShadow = "0 0 20px rgba(14, 165, 233, 0.4)";
                    (e.target as HTMLButtonElement).style.transform = "translateY(0)";
                  }}
                >
                  {loading ? t("search.searching", lang) : t("search.button", lang) || "Search"}
                </button>
              </div>
            </div>

            {error && (
              <div style={{
                color: "#fca5a5",
                marginBottom: 16,
                textAlign: "center",
                padding: "12px 16px",
                background: "rgba(239, 68, 68, 0.1)",
                borderRadius: 10,
                border: "1px solid rgba(239, 68, 68, 0.3)",
              }}>
                {error}
              </div>
            )}
          </div>

          {/* Center wrapper (unchanged) */}
          <div className={styles.centerWrap}>
            <span className={styles.second} />
          </div>

          {/* Card grid: responsive columns with dark theme glass morphism */}
          <div
            className={styles.container}
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(clamp(240px, 28vw, 360px), 1fr))",
              gap: 24,
              alignItems: "start",
              padding: "20px 0",
            }}
          >
            {results.map((r, idx) => {
              const variant = cardVariantFor(r, idx);
              const engagement = computeEngagementRate(r);
              const tags = (() => {
                const rawTags = r.raw?.categories || r.raw?.niche || r.raw?.tags || r.raw?.categories_raw;
                if (Array.isArray(rawTags) && rawTags.length) return rawTags.slice(0, 3);
                if (r.platform === "youtube") return ["Creator", "Video"];
                if (r.platform === "tiktok") return ["Shorts", "Viral"];
                return ["Lifestyle"];
              })();

              const avatarImg = r.profilePic ? (
                <img
                  src={r.profilePic}
                  alt={r.name || r.username}
                  className={styles.avatar}
                  onError={(e) => {
                    const t = e.currentTarget as HTMLImageElement;
                    t.onerror = null;
                    t.src =
                      "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='96' height='96'><rect width='100%' height='100%' fill='%23e2e8f0'/></svg>";
                  }}
                />
              ) : (
                <div className={styles.avatarFallback} aria-hidden>
                  {((r.name || r.username) || "U").slice(0, 1).toUpperCase()}
                </div>
              );

              return (
                <article
                  key={`${r.platform}:${r.id}`}
                  className={`${styles.card} ${variant.card} cardContainer lang-${lang} ${idx < 2 ? styles.firstTwo : ""} ${styles.cardBordered}`}
                  aria-labelledby={`card-title-${idx}`}
                  style={{
                    boxSizing: "border-box",
                    width: "100%",
                    background: "linear-gradient(135deg, rgba(2, 6, 23, 0.7) 0%, rgba(2, 6, 23, 0.5) 100%)",
                    backdropFilter: "blur(20px)",
                    border: "1px solid rgba(14, 165, 233, 0.2)",
                    boxShadow: "0 8px 40px rgba(14, 165, 233, 0.15), inset 0 0 30px rgba(14, 165, 233, 0.05)",
                    transition: "all 300ms ease",
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.borderColor = "rgba(14, 165, 233, 0.4)";
                    (e.currentTarget as HTMLElement).style.boxShadow = "0 16px 60px rgba(14, 165, 233, 0.25), inset 0 0 30px rgba(14, 165, 233, 0.08)";
                    (e.currentTarget as HTMLElement).style.transform = "translateY(-8px)";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.borderColor = "rgba(14, 165, 233, 0.2)";
                    (e.currentTarget as HTMLElement).style.boxShadow = "0 8px 40px rgba(14, 165, 233, 0.15), inset 0 0 30px rgba(14, 165, 233, 0.05)";
                    (e.currentTarget as HTMLElement).style.transform = "translateY(0)";
                  }}
                >
                  <div className={styles.avatarWrap + " " + (variant.ring === styles["avatarRing--v1"] ? styles["avatarRing--v1"] : variant.ring)}>
                    {avatarImg}
                    <span className={styles.statusDot} aria-hidden />
                  </div>

                  <div className={styles.name} id={`card-title-${idx}`} style={{ color: "#e6eef8" }}>
                    <div style={{ display: "flex", gap: 8, alignItems: "center", justifyContent: "center", flexWrap: "wrap" }}>
                      <PlatformIcon p={r.platform} />
                      <span>{r.name || r.username}</span>
                      {r.verified && (
                        <span style={{
                          fontSize: 11,
                          padding: "4px 10px",
                          borderRadius: 999,
                          background: "rgba(14, 165, 233, 0.2)",
                          color: "#0ea5e9",
                          border: "1px solid rgba(14, 165, 233, 0.4)",
                          fontWeight: 700,
                          textTransform: "uppercase",
                          letterSpacing: "0.5px",
                        }}>
                          {t("verified", lang) || "Verified"}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className={styles.handle} style={{ color: "rgba(230, 238, 248, 0.7)" }}>
                    {r.username ? `@${r.username}` : r.platform}
                  </div>

                  <div className={styles.tags} aria-hidden>
                    {tags.slice(0, 3).map((tItem: any, i: number) => (
                      <span key={i} className={`${styles.tag} ${i === 0 ? styles["tag--pink"] : i === 1 ? styles["tag--orange"] : styles["tag--cyan"]}`} style={{
                        background: i === 0 ? "linear-gradient(135deg, rgba(162, 28, 175, 0.6), rgba(236, 72, 153, 0.6))" : i === 1 ? "linear-gradient(135deg, rgba(251, 113, 133, 0.6), rgba(251, 146, 60, 0.6))" : "linear-gradient(135deg, rgba(6, 182, 212, 0.6), rgba(59, 130, 246, 0.6))",
                        color: "#fff",
                        fontSize: "0.75rem",
                        padding: "4px 10px",
                        borderRadius: 999,
                        fontWeight: 600,
                        border: "1px solid rgba(255, 255, 255, 0.1)",
                        backdropFilter: "blur(10px)",
                      }}>
                        {String(tItem)}
                      </span>
                    ))}
                  </div>

                  <p className={styles.bio} aria-describedby={`desc-${idx}`} style={{ color: "rgba(230, 238, 248, 0.6)" }}>
                    <span id={`desc-${idx}`}>{maskDescription(r.description || String(r.raw?.about || ""), showFullDescriptions)}</span>
                    <span className={styles.srOnly}> platform: {r.platform}</span>
                  </p>

                  <div className={styles.statsRow} role="group" aria-label="Stats" style={{
                    borderTop: "1px solid rgba(14, 165, 233, 0.2)",
                    borderBottom: "1px solid rgba(14, 165, 233, 0.2)",
                  }}>
                    <div className={styles.stat}>
                      <div className="number" style={{
                        fontWeight: 700,
                        fontSize: 18,
                        color: "#0ea5e9",
                        textShadow: "0 0 10px rgba(14, 165, 233, 0.3)",
                      }}>
                        {r.followers != null ? Number(r.followers).toLocaleString() : "—"}
                      </div>
                      <div className={styles.label} style={{ fontSize: 12, color: "rgba(230, 238, 248, 0.5)" }}>
                        {t("followers", lang) || "Followers"}
                      </div>
                    </div>
                    <div className={styles.stat}>
                      <div className="number" style={{
                        fontWeight: 700,
                        fontSize: 18,
                        color: "#06b6d4",
                        textShadow: "0 0 10px rgba(6, 182, 212, 0.3)",
                      }}>
                        {engagement}%
                      </div>
                      <div className={styles.label} style={{ fontSize: 12, color: "rgba(230, 238, 248, 0.5)" }}>
                        {t("engagement", lang) || "Engagement"}
                      </div>
                    </div>
                  </div>

                  <div style={{ width: "100%" }} className={styles.cardBodyLeft}>
                    <a
                      href={
                        r.platform === "youtube" ? `https://www.youtube.com/channel/${r.id}` :
                        r.platform === "instagram" ? `https://instagram.com/${r.username ?? ""}` :
                        r.platform === "facebook" ? `https://facebook.com/${r.id}` :
                        r.platform === "tiktok" ? `https://www.tiktok.com/@${r.username ?? r.id}` :
                        r.platform === "twitter" ? `https://twitter.com/${r.username ?? r.id}` :
                        "#"
                      }
                      target="_blank"
                      rel="noreferrer"
                      className={styles.actionLink}
                      style={{ width: "100%" }}
                    >
                      <button
                        className={`${styles.btn} ${variant.btn}`}
                        onClick={() => { /* placeholder */ }}
                        style={{
                          width: "100%",
                          background: "linear-gradient(135deg, #0ea5e9, #06b6d4)",
                          color: "#fff",
                          border: "1px solid rgba(14, 165, 233, 0.5)",
                          borderRadius: 10,
                          padding: "10px 16px",
                          fontWeight: 700,
                          fontSize: "0.9rem",
                          cursor: "pointer",
                          transition: "all 200ms ease",
                          boxShadow: "0 0 20px rgba(14, 165, 233, 0.3)",
                          textTransform: "uppercase",
                          letterSpacing: "0.5px",
                        }}
                        onMouseEnter={(e) => {
                          (e.target as HTMLButtonElement).style.boxShadow = "0 0 40px rgba(14, 165, 233, 0.5)";
                          (e.target as HTMLButtonElement).style.transform = "translateY(-2px)";
                        }}
                        onMouseLeave={(e) => {
                          (e.target as HTMLButtonElement).style.boxShadow = "0 0 20px rgba(14, 165, 233, 0.3)";
                          (e.target as HTMLButtonElement).style.transform = "translateY(0)";
                        }}
                      >
                        {t("viewProfile", lang) || "View Profile"}
                      </button>
                    </a>
                  </div>

                  <div className={styles['mb-6']} />
                  <div className={styles['mt-4']} />
                </article>
              );
            })}

            {!sub && (
              <div style={{
                gridColumn: "1 / -1",
                textAlign: "center",
                padding: 24,
                background: "rgba(14, 165, 233, 0.1)",
                borderRadius: 14,
                border: "1px solid rgba(14, 165, 233, 0.2)",
                backdropFilter: "blur(10px)",
                marginTop: 12,
              }}>
                <div style={{ marginBottom: 12, color: "rgba(230, 238, 248, 0.7)", fontSize: "0.95rem" }}>
                  {t("upgrade.hint", lang) || "Unlock premium features"}
                </div>
                <a
                  href="/upgrade"
                  className={styles.actionLink}
                  style={{
                    padding: "10px 24px",
                    background: "linear-gradient(135deg, #0ea5e9, #06b6d4)",
                    color: "#fff",
                    borderRadius: 10,
                    textDecoration: "none",
                    display: "inline-block",
                    fontWeight: 700,
                    border: "1px solid rgba(14, 165, 233, 0.5)",
                    boxShadow: "0 0 20px rgba(14, 165, 233, 0.3)",
                    transition: "all 200ms ease",
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
                    fontSize: "0.85rem",
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLAnchorElement).style.boxShadow = "0 0 40px rgba(14, 165, 233, 0.5)";
                    (e.currentTarget as HTMLAnchorElement).style.transform = "translateY(-2px)";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLAnchorElement).style.boxShadow = "0 0 20px rgba(14, 165, 233, 0.3)";
                    (e.currentTarget as HTMLAnchorElement).style.transform = "translateY(0)";
                  }}
                >
                  {t("upgrade.cta", lang) || "Upgrade Now"}
                </a>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
