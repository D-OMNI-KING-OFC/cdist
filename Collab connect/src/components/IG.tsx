// src/components/InstagramSearchBar.tsx
import { useState } from "react";

type InstagramUser = {
  id: string;
  username: string;
  fullName: string;
  profilePic: string;
  followers?: number;
  verified: boolean;
  bio?: string;
};

const RAPIDAPI_KEY = "63c292b044msh90f551a27dd1f17p16659ejsn4ea90fcfdac2";
const HOST = "instagram-social-api.p.rapidapi.com";
const PLACEHOLDER =
  "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='120' height='120'><rect width='100%' height='100%' fill='%23eee'/><text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' fill='%23999' font-size='14'>No Image</text></svg>";

export default function InstagramSearchBar() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState<InstagramUser[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function handleSearch() {
    setError(null);
    setUsers([]);
    if (!query.trim()) {
      setError("Type a keyword (e.g., crypto, fitness)");
      return;
    }

    setLoading(true);
    try {
      const params = new URLSearchParams({ search_query: query.trim() });
      const res = await fetch(`https://${HOST}/v1/search_users?${params.toString()}`, {
        headers: {
          "x-rapidapi-key": RAPIDAPI_KEY,
          "x-rapidapi-host": HOST,
          Accept: "application/json",
        },
      });

      if (!res.ok) {
        const txt = await res.text();
        console.error("Instagram API non-OK:", res.status, txt);
        setError(`API error ${res.status}`);
        setLoading(false);
        return;
      }

      const data = await res.json();
      console.info("raw instagram search response:", data);

      // --- Correct array path based on your console ---
      const itemsArray = Array.isArray(data?.data?.items) ? data.data.items : [];
      if (!itemsArray.length) {
        setError(`No users found for "${query}"`);
        setLoading(false);
        return;
      }

      const mapped: InstagramUser[] = itemsArray.map((u: any) => ({
        id: u.id,
        username: u.username,
        fullName: u.full_name || "",
        profilePic: u.profile_pic_url || PLACEHOLDER,
        followers: u.follower_count || 0,
        verified: u.is_verified || false,
        bio: u.biography || "",
      }));

      // filter verified first, fallback to all
      const verifiedOnly = mapped.filter((u) => u.verified);
      setUsers(verifiedOnly.length > 0 ? verifiedOnly : mapped.slice(0, 20));
    } catch (err: any) {
      console.error("Instagram fetch error:", err);
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
          placeholder="Search Instagram users e.g. crypto, fitness"
          style={{ flex: 1, padding: "0.5rem 1rem", borderRadius: 6, border: "1px solid #ccc" }}
        />
        <button
          onClick={handleSearch}
          disabled={loading}
          style={{ padding: "0.5rem 1rem", borderRadius: 6, background: "#C13584", color: "#fff" }}
        >
          {loading ? "Searching..." : "Search"}
        </button>
      </div>

      {error && <div style={{ color: "red", marginBottom: 12 }}>{error}</div>}

      <div style={{ display: "grid", gap: 12 }}>
        {users.map((u) => (
          <div
            key={u.id}
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
              src={u.profilePic || PLACEHOLDER}
              alt={u.username}
              style={{ width: 72, height: 72, borderRadius: "50%", objectFit: "cover", background: "#eee" }}
              onError={(e) => {
                const t = e.target as HTMLImageElement;
                if (t.src !== PLACEHOLDER) t.src = PLACEHOLDER;
              }}
            />
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 700 }}>
                {u.username} {u.verified && <span style={{ color: "#3897f0" }}>✔️</span>}
              </div>
              <div style={{ color: "#666", marginTop: 4 }}>{u.fullName}</div>
              <div style={{ color: "#333", marginTop: 4 }}>
                Followers: {u.followers?.toLocaleString() ?? "?"}
              </div>
              <div style={{ color: "#555", marginTop: 4 }}>{u.bio || "No bio available"}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
