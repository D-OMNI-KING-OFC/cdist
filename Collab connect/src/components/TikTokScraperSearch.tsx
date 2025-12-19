// src/components/TikTokInfluencerFinderDebug.tsx
import { useState } from "react";

/**
 * TikTok influencer finder (debug mode)
 * - Uses tiktok-api23.p.rapidapi.com/api/search/account
 * - Recursively scans the response for TikTok user-like objects
 * - Normalizes, dedups, shows results and raw JSON on the page
 *
 * Replace RAPIDAPI_KEY with your key (or use proxy).
 */

const RAPIDAPI_KEY = "63c292b044msh90f551a27dd1f17p16659ejsn4ea90fcfdac2";
const RAPIDAPI_HOST = "tiktok-api23.p.rapidapi.com";

type Influencer = {
  id?: string;
  username?: string;
  nickname?: string;
  profilePic?: string;
  description?: string;
  followers?: number | null;
  likes?: number | null;
};

function looksLikeTikTokUser(obj: any) {
  if (!obj || typeof obj !== "object") return false;
  const keys = new Set(Object.keys(obj));
  const probes = [
    "unique_id",
    "nickname",
    "avatar",
    "avatar_thumb",
    "follower_count",
    "followerCount",
    "signature",
    "user_id",
    "sec_uid",
    "id",
  ];
  return probes.some((k) => keys.has(k));
}

function collectUserObjects(root: any, max = 500) {
  const out: any[] = [];
  const seen = new Set<any>();
  const queue: any[] = [root];
  while (queue.length && out.length < max) {
    const node = queue.shift();
    if (!node || typeof node !== "object") continue;
    if (seen.has(node)) continue;
    seen.add(node);
    if (looksLikeTikTokUser(node)) out.push(node);
    for (const k of Object.keys(node)) {
      try {
        const v = node[k];
        if (v && typeof v === "object") queue.push(v);
      } catch {
        /* ignore */
      }
    }
  }
  return out;
}

function normalizeTikTokUser(u: any): Influencer | null {
  if (!u || typeof u !== "object") return null;
  const id = u.user_id || u.id || u.uid || u.sec_uid || u.userId;
  const username = u.unique_id || u.uniqueId || u.username || u.shortId;
  const nickname = u.nickname || u.nickName || u.name;
  // try several avatar fields
  const profilePic =
    (u.avatar_thumb && (u.avatar_thumb.url_list?.[0] || u.avatar_thumb?.url)) ||
    u.avatar ||
    u.avatar_larger ||
    u.avatarMedium ||
    (u.user && u.user.avatar) ||
    null;
  const description = u.signature || u.signature_txt || u.bio || u.description || (u.user && u.user.signature) || "";
  const followers =
    Number(u.follower_count ?? u.followerCount ?? u.follow_count ?? u.user?.follower_count ?? 0) || null;
  const likes = Number(u.total_favorited ?? u.favorited_count ?? u.user?.total_favorited ?? 0) || null;

  if (!id && !username) return null;
  return {
    id: id ? String(id) : undefined,
    username,
    nickname,
    profilePic: profilePic || undefined,
    description,
    followers,
    likes,
  };
}

export default function TikTokInfluencerFinderDebug() {
  const [keyword, setKeyword] = useState("");
  const [loading, setLoading] = useState(false);
  const [influencers, setInfluencers] = useState<Influencer[]>([]);
  const [raw, setRaw] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showRaw, setShowRaw] = useState(false);

  async function handleSearch() {
    setError(null);
    setInfluencers([]);
    setRaw(null);
    if (!keyword.trim()) {
      setError("Type a keyword (e.g. dance, fashion, crypto).");
      return;
    }
    setLoading(true);

    try {
      const params = new URLSearchParams({
        keyword: keyword.trim(),
        cursor: "0",
        search_id: "0",
      });

      const res = await fetch(`https://${RAPIDAPI_HOST}/api/search/account?${params.toString()}`, {
        headers: {
          "x-rapidapi-key": RAPIDAPI_KEY,
          "x-rapidapi-host": RAPIDAPI_HOST,
          Accept: "application/json",
        },
      });

      if (!res.ok) {
        const txt = await res.text();
        console.error("TikTok API non-OK:", res.status, txt);
        setError(`API error ${res.status}`);
        setLoading(false);
        return;
      }

      const data = await res.json();
      console.info("raw tiktok search/account response:", data);
      setRaw(data);

      // Fast path: many RapidAPI TikTok account endpoints return data.data or data.data.users
      let found: any[] = [];
      if (Array.isArray(data?.data)) {
        found.push(...data.data);
      } else if (Array.isArray(data?.data?.users)) {
        found.push(...data.data.users);
      } else if (Array.isArray(data?.users)) {
        found.push(...data.users);
      }

      // If nothing in fast path, do recursive collect
      if (found.length === 0) {
        const collected = collectUserObjects(data, 500);
        if (collected.length) {
          found.push(...collected);
        } else {
          console.warn("No user-like objects found in response. Inspect raw JSON (toggle 'Show raw').");
        }
      }

      // normalize and dedupe
      const mapped = found.map(normalizeTikTokUser).filter(Boolean) as Influencer[];
      const unique = Array.from(new Map(mapped.map((m) => [(m.id || m.username || Math.random()), m])).values());

      // optional: sort by follower count (desc)
      unique.sort((a, b) => (Number(b.followers || 0) - Number(a.followers || 0)));

      setInfluencers(unique.slice(0, 10)); // top 10
      if (unique.length === 0) {
        setError("No influencers parsed — open raw JSON to inspect.");
      }
    } catch (err: any) {
      console.error("TikTok fetch/parse error:", err);
      setError(err?.message || "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ marginBottom: "2rem" }}>
      <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem" }}>
        <input
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          placeholder="Search TikTok (e.g. dance, beauty, fitness)"
          style={{ padding: "0.5rem 1rem", flex: 1, borderRadius: 6, border: "1px solid #ccc", fontSize: "1rem" }}
        />
        <button
          onClick={handleSearch}
          disabled={loading}
          style={{
            padding: "0.5rem 1.2rem",
            borderRadius: 6,
            border: "none",
            backgroundColor: "#ff0050",
            color: "#fff",
            fontWeight: "bold",
            cursor: "pointer",
          }}
        >
          {loading ? "Searching..." : "Search"}
        </button>

        <button
          onClick={() => setShowRaw((s) => !s)}
          style={{
            padding: "0.5rem 0.8rem",
            borderRadius: 6,
            border: "1px solid #ddd",
            background: "#fff",
            cursor: "pointer",
          }}
        >
          {showRaw ? "Hide raw" : "Show raw"}
        </button>
      </div>

      {error && <div style={{ color: "red", marginBottom: 8 }}>{error}</div>}

      <div>
        {influencers.map((inf) => (
          <div
            key={inf.id || inf.username}
            style={{
              display: "flex",
              gap: "1rem",
              padding: "1rem",
              border: "1px solid #ddd",
              borderRadius: 8,
              marginBottom: "0.5rem",
              backgroundColor: "#fafafa",
              alignItems: "center",
            }}
          >
            {inf.profilePic ? (
              <img src={inf.profilePic} alt={inf.username} style={{ width: 50, height: 50, borderRadius: "50%" }} />
            ) : (
              <div style={{ width: 50, height: 50, borderRadius: "50%", background: "#eee" }} />
            )}
            <div style={{ flex: 1 }}>
              <h4 style={{ margin: 0 }}>{inf.nickname || inf.username}</h4>
              <p style={{ margin: "0.25rem 0", color: "#555" }}>{inf.description || "—"}</p>
              <p style={{ margin: 0, fontSize: "0.9rem", color: "#333" }}>
                Followers: {inf.followers ? Number(inf.followers).toLocaleString() : "?"} | Likes:{" "}
                {inf.likes ? Number(inf.likes).toLocaleString() : "?"}
              </p>
            </div>
          </div>
        ))}

        {!loading && influencers.length === 0 && !error && keyword && (
          <p style={{ color: "#666" }}>No TikTok influencers found for "{keyword}".</p>
        )}
      </div>

      {showRaw && raw && (
        <div style={{ marginTop: 12 }}>
          <h4 style={{ marginBottom: 8 }}>Raw response (debug)</h4>
          <pre style={{ maxHeight: 400, overflow: "auto", background: "#111", color: "#ddd", padding: 12 }}>
            {JSON.stringify(raw, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}

