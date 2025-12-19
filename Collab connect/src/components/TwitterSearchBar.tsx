// src/components/TwitterInfluencerFinderDebug.tsx
import { useState } from "react";

/**
 * Robust Twitter influencer finder for twitter-x.p.rapidapi.com/search/
 * - Recursively scans the entire response for objects that look like "users"
 * - Dedupes by id_str or screen_name
 * - Shows top results and raw JSON in-page for debugging
 *
 * Replace RAPIDAPI_KEY with yours (or point to a proxy).
 */

const RAPIDAPI_KEY = "63c292b044msh90f551a27dd1f17p16659ejsn4ea90fcfdac2";
const RAPIDAPI_HOST = "twitter-x.p.rapidapi.com";

type Influencer = {
  id?: string;
  username?: string;
  name?: string;
  profilePic?: string;
  description?: string;
  followers?: number | null;
};

// helper: shallow check if an object looks like a twitter user
function looksLikeUser(obj: any) {
  if (!obj || typeof obj !== "object") return false;
  const keys = Object.keys(obj);
  const checkKeys = [
    "screen_name",
    "profile_image_url_https",
    "profile_image_url",
    "id_str",
    "followers_count",
    "username",
    "name",
    "description",
    "bio",
  ];
  return checkKeys.some((k) => keys.includes(k));
}

// recursively walk an object and collect all objects that look like users
function collectUserObjects(root: any, max = 200): any[] {
  const out: any[] = [];
  const seen = new Set<any>();
  const queue: any[] = [root];

  while (queue.length && out.length < max) {
    const node = queue.shift();
    if (!node || typeof node !== "object") continue;
    // avoid re-visiting
    if (seen.has(node)) continue;
    seen.add(node);

    if (looksLikeUser(node)) {
      out.push(node);
    }

    // push children objects / arrays
    for (const k of Object.keys(node)) {
      try {
        const v = node[k];
        if (v && typeof v === "object") queue.push(v);
      } catch {
        // ignore circular or inaccessible props
      }
    }
  }

  return out;
}

// normalize user-like object into Influencer
function normalizeUser(u: any): Influencer | null {
  if (!u || typeof u !== "object") return null;
  const id = u.id_str || u.id || u.user_id_str || u.user_id || (u.rest_id && String(u.rest_id));
  const username = u.screen_name || u.screenName || u.username || u.handle || (u.legacy && u.legacy.screen_name);
  const name = u.name || u.full_name || (u.legacy && u.legacy.name);
  const profilePic = u.profile_image_url_https || u.profile_image_url || u.profile_image || (u.legacy && u.legacy.profile_image_url_https);
  const description = u.description || u.bio || (u.legacy && u.legacy.description) || "";
  const followers = (u.followers_count ?? u.followers ?? (u.legacy && u.legacy.followers_count)) ?? null;

  if (!id && !username) return null;
  return { id: id ? String(id) : undefined, username, name, profilePic, description, followers };
}

export default function TwitterInfluencerFinderDebug() {
  const [query, setQuery] = useState("");
  const [section, setSection] = useState<"top" | "latest">("top");
  const [loading, setLoading] = useState(false);
  const [influencers, setInfluencers] = useState<Influencer[]>([]);
  const [rawJson, setRawJson] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [showRaw, setShowRaw] = useState(false);

  async function handleSearch() {
    setError(null);
    setInfluencers([]);
    setRawJson(null);

    if (!query.trim()) {
      setError("Type a keyword to search (e.g. crypto, fitness).");
      return;
    }

    setLoading(true);

    try {
      const params = new URLSearchParams({
        query: query.trim(),
        section,
        limit: "20",
      });

      const res = await fetch(`https://${RAPIDAPI_HOST}/search/?${params.toString()}`, {
        headers: {
          "x-rapidapi-key": RAPIDAPI_KEY,
          "x-rapidapi-host": RAPIDAPI_HOST,
          Accept: "application/json",
        },
      });

      if (!res.ok) {
        const txt = await res.text();
        console.error("API non-OK:", res.status, txt);
        setError(`API error ${res.status}`);
        setLoading(false);
        return;
      }

      const raw = await res.json();
      console.info("raw twitter search response:", raw);
      setRawJson(raw);

      // quick tries of known shapes first (fast path)
      let users: any[] = [];

      // path: result.timeline.instructions[*].addEntries.entries[*]
      try {
        const instr = raw?.result?.timeline?.instructions;
        if (Array.isArray(instr)) {
          instr.forEach((ins: any) => {
            const entries = ins?.addEntries?.entries || ins?.entries || [];
            if (Array.isArray(entries)) {
              entries.forEach((entry: any) => {
                // attempt to get nested legacy user
                const coreUser = entry?.content?.itemContent?.tweet_results?.result?.core?.user_results?.result?.legacy;
                const legacyUser = entry?.content?.itemContent?.tweet_results?.result?.legacy;
                const possibleUser = coreUser || legacyUser || entry;
                if (possibleUser) users.push(possibleUser);
              });
            }
          });
        }
      } catch (e) {
        // ignore
      }

      // fast fallback: globalObjects.users
      if (users.length === 0 && raw?.globalObjects?.users) {
        users.push(...Object.values(raw.globalObjects.users));
      }

      // final fallback: recursive scan of all objects for user-like shapes
      if (users.length === 0) {
        const found = collectUserObjects(raw, 500);
        if (found.length > 0) {
          users.push(...found);
        } else {
          console.warn("No user-like objects found in response. Inspect raw response in UI or console.");
        }
      }

      // normalize and dedupe
      const mapped = users.map(normalizeUser).filter(Boolean) as Influencer[];
      const unique = Array.from(new Map(mapped.map((u) => [(u.id || u.username || Math.random()), u])).values());

      // sort by followers if available (descending)
      unique.sort((a, b) => (Number(b.followers || 0) - Number(a.followers || 0)));

      // take top N (you can increase)
      const top = unique.slice(0, 10);
      console.info("parsed influencers:", top);
      setInfluencers(top);

      if (top.length === 0 && users.length > 0) {
        // we found user-like objects but normalization removed them — show a hint
        console.warn("Found user-like objects but normalization returned zero influencers. Check 'raw response' view.");
      }
    } catch (err: any) {
      console.error("Search error:", err);
      setError(err?.message || "Unknown fetch/parse error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ marginBottom: "2rem" }}>
      <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem" }}>
        <input
          type="text"
          placeholder="Search (e.g. crypto, fitness, fashion)"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          style={{
            padding: "0.5rem 1rem",
            flex: 1,
            borderRadius: "6px",
            border: "1px solid #ccc",
            fontSize: "1rem",
          }}
        />
        <select
          value={section}
          onChange={(e) => setSection(e.target.value as any)}
          style={{ padding: "0.5rem", borderRadius: 6 }}
        >
          <option value="top">Top</option>
          <option value="latest">Latest</option>
        </select>
        <button
          onClick={handleSearch}
          disabled={loading}
          style={{
            padding: "0.5rem 1.2rem",
            borderRadius: "6px",
            border: "none",
            backgroundColor: "#4F46E5",
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
            borderRadius: "6px",
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
              borderRadius: "8px",
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
              <h4 style={{ margin: 0 }}>{inf.name || inf.username}</h4>
              <p style={{ margin: "0.25rem 0", color: "#555" }}>{inf.description || "—"}</p>
              <p style={{ margin: 0, fontSize: "0.9rem", color: "#333" }}>
                Followers: {inf.followers ? Number(inf.followers).toLocaleString() : "?"}
              </p>
            </div>
          </div>
        ))}

        {!loading && influencers.length === 0 && !error && query && (
          <p style={{ color: "#666" }}>No influencers found for "{query}".</p>
        )}
      </div>

      {showRaw && rawJson && (
        <div style={{ marginTop: 12 }}>
          <h4 style={{ marginBottom: 8 }}>Raw response (debug)</h4>
          <pre style={{ maxHeight: 400, overflow: "auto", background: "#111", color: "#ddd", padding: 12 }}>
            {JSON.stringify(rawJson, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
