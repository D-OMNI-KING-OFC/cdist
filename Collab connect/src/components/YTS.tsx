/// src/components/YouTubeSearchBar.tsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { t } from "../i18n/index";

type Props = {
  lang: string;
  onResults?: (results: any[]) => void;
};

const API_KEY = "AIzaSyDGNK_RKC4i35Oz1OBcrUjWbTTVkK_NMHE"; // Replace with your key

export default function YouTubeSearchBar({ lang, onResults }: Props) {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any[]>([]);
  const navigate = useNavigate();

  const handleSearch = async () => {
    if (!query) return;
    setLoading(true);

    try {
      // Search channels
      const searchRes = await fetch(
        `https://www.googleapis.com/youtube/v3/search?part=snippet&type=channel&q=${encodeURIComponent(
          query
        )}&maxResults=10&key=${API_KEY}`
      );
      const searchData = await searchRes.json();
      const channelIds = searchData.items.map((i: any) => i.id.channelId).join(",");

      // Get channel statistics
      const statsRes = await fetch(
        `https://www.googleapis.com/youtube/v3/channels?part=statistics,snippet&id=${channelIds}&key=${API_KEY}`
      );
      const statsData = await statsRes.json();

      const mappedResults = statsData.items.map((channel: any) => ({
        id: channel.id,
        name: channel.snippet.title,
        description: channel.snippet.description,
        profilePic: channel.snippet.thumbnails?.default?.url,
        subscribers: Number(channel.statistics.subscriberCount),
        totalViews: Number(channel.statistics.viewCount),
        videoCount: Number(channel.statistics.videoCount),
      }));

      const limitedResults = mappedResults.slice(0, 3);
      setResults(limitedResults);
      onResults?.(limitedResults);
    } catch (error) {
      console.error("YouTube Search Error:", error);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ marginBottom: "2rem" }}>
      {/* Search bar */}
      <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem" }}>
        <input
          type="text"
          placeholder={t("ytsearch_placeholder", lang)}
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
            transition: "all 0.2s",
          }}
        >
          {loading ? t("searching", lang) : t("ytsearch_button", lang)}
        </button>
      </div>

      {/* Results */}
      <div>
        {results.map((inf) => (
          <div
            key={inf.id}
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
            <img
              src={inf.profilePic}
              alt={inf.name}
              style={{ width: "50px", height: "50px", borderRadius: "50%" }}
            />
            <div style={{ flex: 1 }}>
              <h4 style={{ margin: 0 }}>{inf.name}</h4>
              <p style={{ margin: "0.25rem 0", color: "#555" }}>
                {t("hidden_description", lang)}
              </p>
              <p style={{ margin: 0, fontSize: "0.9rem", color: "#333" }}>
                {t("subs", lang)}: {inf.subscribers.toLocaleString()} | {t("views", lang)}:{" "}
                {inf.totalViews.toLocaleString()} | {t("videos", lang)}: {inf.videoCount}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* CTA */}
      {results.length > 0 && (
        <p
          onClick={() => navigate("/login")}
          style={{
            marginTop: "1rem",
            fontWeight: "bold",
            color: "#4F46E5",
            cursor: "pointer",
            textDecoration: "underline",
          }}
        >
          {t("signup_for_more_results", lang)}
        </p>
      )}
    </div>
  );
}
