import { useState } from "react";
import "./Components.enhanced.css";
import { t } from "../i18n/index";

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

const TOTAL_RESULTS = 5;

// --- API keys / hosts (development) ---
const YT_API_KEY = "AIzaSyDGNK_RKC4i35Oz1OBcrUjWbTTVkK_NMHE";

const RAPID_TWITTER_KEY = "63c292b044msh90f551a27dd1f17p16659ejsn4ea90fcfdac2";
const RAPID_TWITTER_HOST = "twitter-x.p.rapidapi.com";

const RAPID_TIKTOK_KEY = "63c292b044msh90f551a27dd1f17p16659ejsn4ea90fcfdac2";
const RAPID_TIKTOK_HOST = "tiktok-api23.p.rapidapi.com";

const RAPID_FB_KEY = "63c292b044msh90f551a27dd1f17p16659ejsn4ea90fcfdac2";
const RAPID_FB_HOST = "facebook-scraper3.p.rapidapi.com";

const RAPID_IG_KEY = "63c292b044msh90f551a27dd1f17p16659ejsn4ea90fcfdac2";
const RAPID_IG_HOST = "instagram-social-api.p.rapidapi.com";

const safeNum = (v: any) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

const maskDescription = (desc?: string, showFull = false) => {
  if (!desc) return "";
  if (showFull) return desc;
  const limit = 40; // show first 40 chars then mask
  if (desc.length <= limit) return desc;
  return desc.slice(0, limit) + " ******";
};

const PlatformIcon = ({ p }: { p: UnifiedResult["platform"] }) => {
  const style = { width: 18, height: 18, display: "inline-block", verticalAlign: "middle" } as const;
  switch (p) {
    case "youtube":
      return (
        <svg style={style} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="2" y="5" width="20" height="14" rx="4" fill="#FF0000" />
          <path d="M10 8.5v7l6-3.5-6-3.5z" fill="#fff" />
        </svg>
      );
    case "twitter":
      return (
        <svg style={style} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path d="M22 5.92c-.63.28-1.31.48-2 .56a3.51 3.51 0 001.54-1.95 7.05 7.05 0 01-2.24.86 3.5 3.5 0 00-6 3.18A9.94 9.94 0 013 4.86a3.5 3.5 0 001.08 4.66 3.45 3.45 0 01-1.6-.44v.04a3.5 3.5 0 002.8 3.43 3.52 3.52 0 01-1.58.06 3.5 3.5 0 003.27 2.43A7.03 7.03 0 013 18.58a9.92 9.92 0 005.37 1.57c6.45 0 9.98-5.34 9.98-9.98 0-.15 0-.31-.01-.46A7.15 7.15 0 0022 5.92z" fill="#1DA1F2" />
        </svg>
      );
    case "tiktok":
      return (
        <svg style={style} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path d="M17 3h-1.2a4 4 0 01-4 4v5a4 4 0 104 4V9h2V3z" fill="#010101" />
          <path d="M16.5 3v6.5a3 3 0 11-1.5-2.6V3z" fill="#69C9D0" />
          <path d="M13.5 14a3 3 0 11-2.9-3.04V14z" fill="#EE1D52" />
        </svg>
      );
    case "facebook":
      return (
        <svg style={style} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path d="M15 3h3v4h-3v14h-4V7H8V3h3V1.5C11 1 11.7 1 12.3 1 13 1 15 1.6 15 1.6V3z" fill="#1877F2" />
        </svg>
      );
    case "instagram":
      return (
        <svg style={style} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <rect x="3" y="3" width="18" height="18" rx="5" fill="#E1306C" />
          <circle cx="12" cy="12" r="3.2" fill="#fff" />
          <circle cx="17.5" cy="6.5" r="0.9" fill="#fff" />
        </svg>
      );
    default:
      return null;
  }
};

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
    const found = (function collect(node: any, acc: any[]) {
      if (!node || typeof node !== "object") return;
      if (node?.screen_name || node?.screenName || node?.id_str) acc.push(node);
      for (const k of Object.keys(node)) {
        const v = node[k];
        if (v && typeof v === "object") collect(v, acc);
      }
      return acc;
    })(raw, []);
    if (found.length) collected.push(...found);
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

export default function MultiPlatformSearchBar({ lang }: { lang: string })  {
  const [query, setQuery] = useState("");
  const [selectedPlatforms, setSelectedPlatforms] = useState<
    { key: UnifiedResult["platform"]; label: string; checked: boolean }[]
  >([
    { key: "youtube", label: "YouTube", checked: true },
    { key: "twitter", label: "Twitter", checked: true },
    { key: "tiktok", label: "TikTok", checked: true },
    { key: "facebook", label: "Facebook", checked: true },
    { key: "instagram", label: "Instagram", checked: true },
  ]);
  const [minFollowers, setMinFollowers] = useState<number | "">("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<UnifiedResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showFullDescriptions] = useState(false);

  const togglePlatform = (key: UnifiedResult["platform"]) => {
    setSelectedPlatforms((prev) => prev.map((p) => (p.key === key ? { ...p, checked: !p.checked } : p)));
  };

  const setAllPlatforms = (on: boolean) => setSelectedPlatforms((prev) => prev.map((p) => ({ ...p, checked: on })));

  const handleSearch = async () => {
    setError(null);
    setResults([]);
    if (!query.trim()) {
      setError("Type a keyword (e.g. crypto, fitness)");
      return;
    }

    const active = selectedPlatforms.filter((p) => p.checked).map((p) => p.key);
    if (active.length === 0) {
      setError("Select at least one platform to search.");
      return;
    }

    const perPlatform = Math.max(1, Math.floor(TOTAL_RESULTS / active.length));
    setLoading(true);

    try {
      const calls: Promise<UnifiedResult[]>[] = [];
      for (const platform of active) {
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
        if (arr.length < perPlatform) arr.push(r);
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
      if (final.length === 0) setError("No influencer results found (try fewer filters or select more platforms).");
    } catch (err: any) {
      console.error("Multi-platform search error:", err);
      setError("Search failed — check console.");
    } finally {
      setLoading(false);
    }
  };

  // Design tokens
  const sectionBorder = "1px solid rgba(255,255,255,0.06)";
  const cardBg = "rgba(255,255,255,0.012)";
  const cardShadow = "0 8px 28px rgba(2,6,23,0.45)";
  const primaryGradient = "radial-gradient(circle at 30% 50%, rgba(14,165,233,0.15), rgba(14,165,233,0.02))";
  const accentGradient = "linear-gradient(135deg, rgba(14,165,233,0.4), rgba(168,85,247,0.2))";

  return (
    <div
      style={{
        width: "100%",
        boxSizing: "border-box",
        padding: "24px",
        background: "linear-gradient(135deg, rgba(3,7,18,0.5), rgba(1,4,9,0.5))",
        borderRadius: 16,
        border: sectionBorder,
      }}
    >
      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 28, fontWeight: 800, margin: 0, color: "#e6eef8" }}>
          Multi-Platform Search
        </h2>
        <p style={{ margin: "8px 0 0 0", fontSize: 13, color: "rgba(230,238,248,0.6)" }}>
          Search across YouTube, Twitter, TikTok, Facebook & Instagram
        </p>
      </div>

      {/* Advanced Search Bar with Gradient Border */}
      <div
        style={{
          borderRadius: 12,
          padding: 1.5,
          backgroundImage: primaryGradient,
          marginBottom: 24,
        }}
      >
        <div
          style={{
            background: cardBg,
            borderRadius: 10,
            border: sectionBorder,
            padding: 20,
            display: "flex",
            gap: 16,
            alignItems: "flex-end",
            flexWrap: "wrap",
          }}
        >
          {/* Search Input */}
          <div style={{ flex: 1, minWidth: 200 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: "rgba(230,238,248,0.7)", textTransform: "uppercase" }}>
              Search keyword
            </label>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              placeholder="e.g., crypto, fitness, tech..."
              style={{
                width: "100%",
                padding: "10px 14px",
                borderRadius: 8,
                border: "1px solid rgba(255,255,255,0.08)",
                background: "rgba(255,255,255,0.02)",
                color: "#e6eef8",
                outline: "none",
                marginTop: 8,
                fontSize: 14,
                fontWeight: 500,
                transition: "all 200ms ease",
              }}
              onFocus={(e) => {
                (e.target as HTMLInputElement).style.borderColor = "rgba(14,165,233,0.3)";
                (e.target as HTMLInputElement).style.background = "rgba(14,165,233,0.05)";
              }}
              onBlur={(e) => {
                (e.target as HTMLInputElement).style.borderColor = "rgba(255,255,255,0.08)";
                (e.target as HTMLInputElement).style.background = "rgba(255,255,255,0.02)";
              }}
            />
          </div>

          {/* Min Followers Filter */}
          <div style={{ flex: 0 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: "rgba(230,238,248,0.7)", textTransform: "uppercase" }}>
              Min followers
            </label>
            <input
              type="number"
              min={0}
              placeholder="0"
              value={minFollowers as any}
              onChange={(e) => setMinFollowers(e.target.value === "" ? "" : Number(e.target.value))}
              style={{
                width: 140,
                padding: "10px 14px",
                borderRadius: 8,
                border: "1px solid rgba(255,255,255,0.08)",
                background: "rgba(255,255,255,0.02)",
                color: "#e6eef8",
                fontSize: 14,
                fontWeight: 500,
                marginTop: 8,
                outline: "none",
                transition: "all 200ms ease",
              }}
              onFocus={(e) => {
                (e.target as HTMLInputElement).style.borderColor = "rgba(14,165,233,0.3)";
                (e.target as HTMLInputElement).style.background = "rgba(14,165,233,0.05)";
              }}
              onBlur={(e) => {
                (e.target as HTMLInputElement).style.borderColor = "rgba(255,255,255,0.08)";
                (e.target as HTMLInputElement).style.background = "rgba(255,255,255,0.02)";
              }}
            />
          </div>

          {/* Search Button */}
          <button
            onClick={handleSearch}
            disabled={loading}
            style={{
              padding: "10px 24px",
              background: accentGradient,
              border: "1px solid rgba(14,165,233,0.4)",
              color: "#0ea5e9",
              borderRadius: 8,
              fontWeight: 700,
              fontSize: 13,
              cursor: loading ? "not-allowed" : "pointer",
              opacity: loading ? 0.6 : 1,
              transition: "all 200ms ease",
              textTransform: "uppercase",
              letterSpacing: "0.5px",
              boxShadow: "0 8px 20px rgba(14,165,233,0.2)",
            }}
            onMouseEnter={(e) => {
              if (!loading) {
                (e.target as HTMLButtonElement).style.background =
                  "linear-gradient(135deg, rgba(14,165,233,0.5), rgba(168,85,247,0.3))";
                (e.target as HTMLButtonElement).style.boxShadow = "0 12px 32px rgba(14,165,233,0.3)";
              }
            }}
            onMouseLeave={(e) => {
              (e.target as HTMLButtonElement).style.background = accentGradient;
              (e.target as HTMLButtonElement).style.boxShadow = "0 8px 20px rgba(14,165,233,0.2)";
            }}
          >
            {loading ? "Searching..." : "Search"}
          </button>
        </div>
      </div>

      {/* Platform Filter Tabs */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: "rgba(230,238,248,0.7)", textTransform: "uppercase", marginBottom: 12 }}>
          Platforms
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <button
            onClick={() => setAllPlatforms(!selectedPlatforms.every((p) => p.checked))}
            style={{
              padding: "8px 16px",
              borderRadius: 999,
              border: "1px solid rgba(255,255,255,0.1)",
              background: selectedPlatforms.every((p) => p.checked) ? "rgba(14,165,233,0.15)" : "rgba(255,255,255,0.05)",
              color: selectedPlatforms.every((p) => p.checked) ? "#0ea5e9" : "rgba(230,238,248,0.6)",
              fontWeight: 600,
              fontSize: 12,
              cursor: "pointer",
              transition: "all 200ms ease",
              textTransform: "uppercase",
              letterSpacing: "0.5px",
            }}
            onMouseEnter={(e) => {
              (e.target as HTMLButtonElement).style.background = "rgba(14,165,233,0.2)";
              (e.target as HTMLButtonElement).style.borderColor = "rgba(14,165,233,0.4)";
            }}
            onMouseLeave={(e) => {
              (e.target as HTMLButtonElement).style.background = selectedPlatforms.every((p) => p.checked) ? "rgba(14,165,233,0.15)" : "rgba(255,255,255,0.05)";
              (e.target as HTMLButtonElement).style.borderColor = "rgba(255,255,255,0.1)";
            }}
          >
            All
          </button>

          {selectedPlatforms.map((p) => (
            <button
              key={p.key}
              onClick={() => togglePlatform(p.key)}
              style={{
                display: "inline-flex",
                gap: 8,
                alignItems: "center",
                padding: "8px 16px",
                borderRadius: 999,
                border: p.checked ? "1px solid rgba(14,165,233,0.4)" : "1px solid rgba(255,255,255,0.1)",
                background: p.checked ? "rgba(14,165,233,0.15)" : "rgba(255,255,255,0.05)",
                color: p.checked ? "#0ea5e9" : "rgba(230,238,248,0.6)",
                fontWeight: 600,
                fontSize: 12,
                cursor: "pointer",
                transition: "all 200ms ease",
              }}
              onMouseEnter={(e) => {
                (e.target as HTMLButtonElement).style.background = "rgba(14,165,233,0.2)";
                (e.target as HTMLButtonElement).style.borderColor = "rgba(14,165,233,0.4)";
              }}
              onMouseLeave={(e) => {
                (e.target as HTMLButtonElement).style.background = p.checked ? "rgba(14,165,233,0.15)" : "rgba(255,255,255,0.05)";
                (e.target as HTMLButtonElement).style.borderColor = p.checked ? "rgba(14,165,233,0.4)" : "rgba(255,255,255,0.1)";
              }}
            >
              <PlatformIcon p={p.key} />
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div
          style={{
            padding: 12,
            borderRadius: 8,
            background: "rgba(239,68,68,0.1)",
            border: "1px solid rgba(239,68,68,0.3)",
            color: "#fca5a5",
            marginBottom: 24,
            fontSize: 13,
          }}
        >
          {error}
        </div>
      )}

      {/* Results Grid */}
      {results.length > 0 && (
        <div style={{ display: "grid", gap: 16, gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))" }}>
          {results.map((r) => (
            <div
              key={`${r.platform}:${r.id}`}
              style={{
                borderRadius: 12,
                padding: 1.5,
                backgroundImage: primaryGradient,
              }}
            >
              <div
                style={{
                  background: cardBg,
                  borderRadius: 10,
                  border: sectionBorder,
                  padding: 16,
                  display: "flex",
                  flexDirection: "column",
                  gap: 12,
                  height: "100%",
                }}
              >
                {/* Profile Header */}
                <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                  <img
                    src={
                      r.profilePic ||
                      "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='64' height='64'><rect width='100%' height='100%' fill='%23111'/></svg>"
                    }
                    alt={r.name || r.username}
                    style={{
                      width: 64,
                      height: 64,
                      borderRadius: 8,
                      objectFit: "cover",
                      background: "rgba(14,165,233,0.1)",
                      border: "1px solid rgba(14,165,233,0.2)",
                      flexShrink: 0,
                    }}
                    onError={(e) => {
                      (e.target as HTMLImageElement).src =
                        "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='64' height='64'><rect width='100%' height='100%' fill='%23111'/></svg>";
                    }}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                      <PlatformIcon p={r.platform} />
                      <span style={{ fontSize: 11, fontWeight: 700, color: "rgba(230,238,248,0.5)", textTransform: "uppercase" }}>
                        {r.platform}
                      </span>
                    </div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: "#e6eef8", marginBottom: 4, wordBreak: "break-word" }}>
                      {r.name || r.username}
                    </div>
                    {r.username && (
                      <div style={{ fontSize: 12, color: "rgba(230,238,248,0.6)" }}>
                        @{r.username}
                      </div>
                    )}
                  </div>
                </div>

                {/* Verification Badge */}
                {r.verified && (
                  <div
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      padding: "6px 10px",
                      borderRadius: 6,
                      background: "rgba(14,165,233,0.15)",
                      border: "1px solid rgba(14,165,233,0.3)",
                      color: "#0ea5e9",
                      fontSize: 11,
                      fontWeight: 700,
                      width: "fit-content",
                    }}
                  >
                    <span>✓</span> Verified
                  </div>
                )}

                {/* Followers Stat */}
                <div
                  style={{
                    padding: 12,
                    borderRadius: 8,
                    background: "rgba(14,165,233,0.08)",
                    border: "1px solid rgba(14,165,233,0.15)",
                    textAlign: "center",
                  }}
                >
                  <div style={{ fontSize: 20, fontWeight: 800, color: "#0ea5e9", marginBottom: 4 }}>
                    {r.followers != null ? Number(r.followers).toLocaleString() : "—"}
                  </div>
                  <div style={{ fontSize: 11, color: "rgba(230,238,248,0.6)", fontWeight: 600 }}>
                    Followers
                  </div>
                </div>

                {/* Description */}
                {r.description && (
                  <div
                    style={{
                      fontSize: 12,
                      color: "rgba(230,238,248,0.7)",
                      lineHeight: 1.5,
                      maxHeight: 60,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      display: "-webkit-box",
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: "vertical" as any,
                    }}
                  >
                    {maskDescription(r.description, showFullDescriptions)}
                  </div>
                )}

                {/* View Profile Button */}
                <button
                  style={{
                    padding: "10px 14px",
                    borderRadius: 8,
                    border: "1px solid rgba(14,165,233,0.3)",
                    background: "rgba(14,165,233,0.08)",
                    color: "#0ea5e9",
                    fontWeight: 700,
                    fontSize: 12,
                    cursor: "pointer",
                    transition: "all 200ms ease",
                    marginTop: "auto",
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
                  }}
                  onMouseEnter={(e) => {
                    (e.target as HTMLButtonElement).style.background = "rgba(14,165,233,0.15)";
                    (e.target as HTMLButtonElement).style.borderColor = "rgba(14,165,233,0.5)";
                  }}
                  onMouseLeave={(e) => {
                    (e.target as HTMLButtonElement).style.background = "rgba(14,165,233,0.08)";
                    (e.target as HTMLButtonElement).style.borderColor = "rgba(14,165,233,0.3)";
                  }}
                >
                  View profile →
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && results.length === 0 && !error && (
        <div
          style={{
            textAlign: "center",
            padding: "48px 24px",
            color: "rgba(230,238,248,0.5)",
          }}
        >
          <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>
            No results yet
          </div>
          <div style={{ fontSize: 13 }}>
            Enter a search keyword and select platforms to discover influencers
          </div>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div
          style={{
            textAlign: "center",
            padding: "48px 24px",
            color: "rgba(230,238,248,0.5)",
          }}
        >
          <div style={{ fontSize: 16, fontWeight: 600 }}>
            Searching across platforms...
          </div>
        </div>
      )}
    </div>
  );
}
