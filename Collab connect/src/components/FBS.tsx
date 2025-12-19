// src/components/FacebookPagesFinderVerified.tsx
import { useState } from "react";

/**
 * Facebook Pages Finder — Verified-only view
 * - Calls facebook-scraper3.p.rapidapi.com/search/pages
 * - Normalizes results, filters to verified accounts
 * - Shows profile pic (with placeholder), description, followers, and a verified badge
 * - If no verified results, user can toggle to show unverified results
 *
 * Replace RAPIDAPI_KEY if needed or point to a server proxy in production.
 */

const RAPIDAPI_KEY = "63c292b044msh90f551a27dd1f17p16659ejsn4ea90fcfdac2";
const HOST = "facebook-scraper3.p.rapidapi.com";
const PLACEHOLDER =
  "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='120' height='120'><rect width='100%' height='100%' fill='%23eee'/><text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' fill='%23999' font-size='14'>No Image</text></svg>";

type PageItem = {
  id?: string;
  name?: string;
  profilePic?: string;
  description?: string;
  followers?: number | null;
  verified?: boolean;
};

function looksLikePage(obj: any) {
  if (!obj || typeof obj !== "object") return false;
  const keys = Object.keys(obj);
  const probes = [
    "name",
    "id",
    "page_id",
    "profile_pic",
    "picture",
    "followers",
    "fan_count",
    "about",
    "description",
    "category",
    "verified",
    "is_verified",
    "is_verified_account",
  ];
  return probes.some((k) => keys.includes(k));
}

function collectPageObjects(root: any, max = 500) {
  const out: any[] = [];
  const seen = new Set<any>();
  const queue: any[] = [root];
  while (queue.length && out.length < max) {
    const node = queue.shift();
    if (!node || typeof node !== "object") continue;
    if (seen.has(node)) continue;
    seen.add(node);

    if (looksLikePage(node)) out.push(node);

    for (const k of Object.keys(node)) {
      try {
        const v = node[k];
        if (v && typeof v === "object") queue.push(v);
      } catch {
        // ignore
      }
    }
  }
  return out;
}

function normalizePage(p: any): PageItem | null {
  if (!p || typeof p !== "object") return null;
  const id = p.id || p.page_id || p.profile_id || p.fb_id || (p.data && (p.data.id || p.data.page_id));
  const name = p.name || p.title || p.page_name || (p.data && p.data.name);
  const profilePic =
    p.profile_pic ||
    p.picture ||
    p.image ||
    (p.data && p.data.profile_pic) ||
    (p.avatar && (p.avatar.url || p.avatar_thumb?.url_list?.[0])) ||
    null;
  const description = p.description || p.about || p.bio || (p.data && p.data.about) || "";
  const followers = Number(p.followers ?? p.fan_count ?? p.likes ?? (p.data && p.data.followers) ?? null) || null;

  // detect verified flag in many possible shapes
  const verified =
    Boolean(p.verified) ||
    Boolean(p.is_verified) ||
    Boolean(p.isVerified) ||
    Boolean(p.is_verified_account) ||
    Boolean(p.data?.verified) ||
    Boolean(p.raw?.verified) ||
    false;

  if (!id && !name) return null;
  return { id: id ? String(id) : undefined, name, profilePic: profilePic || undefined, description, followers, verified };
}

export default function FacebookPagesFinderVerified() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [pages, setPages] = useState<PageItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showUnverified, setShowUnverified] = useState(false);

  async function handleSearch() {
    setError(null);
    setPages([]);
    if (!query.trim()) {
      setError("Type a keyword (e.g. crypto, fitness)");
      return;
    }

    setLoading(true);
    try {
      const params = new URLSearchParams({ query: query.trim() });
      const res = await fetch(`https://${HOST}/search/pages?${params.toString()}`, {
        headers: {
          "x-rapidapi-key": RAPIDAPI_KEY,
          "x-rapidapi-host": HOST,
          Accept: "application/json",
        },
      });

      if (!res.ok) {
        const txt = await res.text();
        console.error("Facebook pages API non-OK:", res.status, txt);
        setError(`API error ${res.status}`);
        setLoading(false);
        return;
      }

      const data = await res.json();
      console.info("raw facebook pages response:", data);

      // --- Fast-path candidates (common shapes) ---
      let candidates: any[] = [];
      if (Array.isArray(data)) candidates = [...data];
      else if (Array.isArray(data?.data)) candidates = [...data.data];
      else if (Array.isArray(data?.results)) candidates = [...data.results];
      else if (Array.isArray(data?.pages)) candidates = [...data.pages];
      else if (Array.isArray(data?.profiles)) candidates = [...data.profiles];
      else if (Array.isArray(data?.response?.data)) candidates = [...data.response.data];

      // nested path tries
      if (candidates.length === 0) {
        const maybePaths = [
          data?.data?.pages,
          data?.response?.results,
          data?.response?.pages,
          data?.payload?.pages,
          data?.payload?.results,
        ];
        for (const p of maybePaths) {
          if (Array.isArray(p)) {
            candidates = p;
            break;
          }
        }
      }

      // fallback: recursive collect
      if (candidates.length === 0) {
        const found = collectPageObjects(data, 500);
        if (found.length > 0) candidates = found;
        else {
          console.warn("No page-like objects found in response.");
        }
      }

      // normalize + dedupe
      const mapped = candidates.map(normalizePage).filter(Boolean) as PageItem[];
      const unique = Array.from(new Map(mapped.map((m) => [(m.id || m.name || Math.random()), m])).values());

      // filter verified (unless user toggles to show unverified)
      const verifiedOnly = unique.filter((u) => Boolean(u.verified));
      const finalList = showUnverified ? unique : verifiedOnly;

      // update state
      setPages(finalList.slice(0, 20));

      if (!showUnverified && verifiedOnly.length === 0) {
        setError("No verified pages found. Toggle to show unverified results.");
      } else if (finalList.length === 0) {
        setError(`No pages found for "${query}"`);
      }
    } catch (err: any) {
      console.error("Facebook pages fetch/parse error:", err);
      setError(err?.message || "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search Facebook Pages (verified only) e.g. fitness, crypto"
          style={{ flex: 1, padding: "0.5rem 1rem", borderRadius: 6, border: "1px solid #ccc" }}
        />
        <button onClick={handleSearch} disabled={loading} style={{ padding: "0.5rem 1rem", borderRadius: 6, background: "#4267B2", color: "#fff" }}>
          {loading ? "Searching..." : "Search"}
        </button>
        <button
          onClick={() => {
            setShowUnverified((s) => !s);
            // flip and re-run search on toggle if there are results already
            if (pages.length > 0) handleSearch();
          }}
          title="If no verified results appear, toggle to show unverified pages"
          style={{ padding: "0.4rem 0.7rem", borderRadius: 6 }}
        >
          {showUnverified ? "Showing: Unverified" : "Showing: Verified only"}
        </button>
      </div>

      {error && <div style={{ color: "red", marginBottom: 12 }}>{error}</div>}

      <div style={{ display: "grid", gap: 12 }}>
        {pages.map((p) => (
          <div
            key={p.id || p.name}
            style={{
              display: "flex",
              gap: 12,
              padding: 12,
              borderRadius: 8,
              border: "1px solid #eee",
              alignItems: "center",
              background: "#fafafa",
            }}
          >
            <img
              src={p.profilePic || PLACEHOLDER}
              alt={p.name || "profile"}
              style={{ width: 72, height: 72, borderRadius: 8, objectFit: "cover", background: "#eee" }}
              onError={(e) => {
                // fallback to placeholder if image fails to load
                const t = e.target as HTMLImageElement;
                if (t.src !== PLACEHOLDER) t.src = PLACEHOLDER;
              }}
            />
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ fontWeight: 700 }}>{p.name}</div>
                {p.verified && (
                  <div
                    title="Verified"
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      padding: "2px 8px",
                      background: "#e6f2ff",
                      borderRadius: 999,
                      color: "#0b66ff",
                      fontSize: 12,
                    }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M20 12c0 4.418-3.582 8-8 8s-8-3.582-8-8 3.582-8 8-8 8 3.582 8 8z" stroke="#0b66ff" strokeWidth="1.2" />
                      <path d="M9.5 12.5l1.8 1.8L14.5 10" stroke="#0b66ff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    Verified
                  </div>
                )}
              </div>

              <div style={{ color: "#666", marginTop: 8 }}>{p.description || "No description available."}</div>

              <div style={{ color: "#333", marginTop: 8 }}>
                {p.followers ? `Followers: ${Number(p.followers).toLocaleString()}` : "Followers: ?"}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
