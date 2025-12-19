import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { t } from "../i18n/index";
import "./RoleSelection.css";
import { useNavigate } from "react-router-dom"

type RoleSelectionProps = {
  lang: string;
  session: any;
  userID: any
};

const PLATFORM_OPTIONS = ["YouTube", "TikTok", "Instagram", "Twitter"];
const INDUSTRIES_OPTIONS = ["Fashion", "Tech", "Fitness", "Travel", "Food"];
const PRICING_OPTIONS = ["Free", "Low", "Medium", "High"];
const BUDGET_RANGE_OPTIONS = ["<$100", "$100-$500", "$500-$1000", ">$1000"];

export default function RoleSelection({ lang, session }: RoleSelectionProps) {
  const [role, setRole] = useState<"influencer" | "brand" | "">("");
  const [roleLocked, setRoleLocked] = useState(false);
  const navigate = useNavigate()
  const [platforms, setPlatforms] = useState<string[]>([]);
  const [industries, setIndustries] = useState<string[]>([]);
  const [pricing_range, setPricingRange] = useState("");
  const [budget_range, setBudgetRange] = useState("");
  const [budget, setBudget] = useState("");
  const [followerCount, setFollowerCount] = useState("");
  const [message, setMessage] = useState("");

  // Fetch existing profile
  useEffect(() => {
    if (!session?.user) return;

    const fetchProfile = async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("auth_uid", session.user.id)
        .single();

      if (error) return;

      if (data) {
        setRole(data.role || "");
        setRoleLocked(data.role_locked || false);
        setPlatforms(data.platforms || []);
        setIndustries(data.industries || []);
        setPricingRange(data.pricing_range || "");
        setBudgetRange(data.budget_range || "");
        // convert numeric budget coming from DB to string for the input
        setBudget(data.budget !== undefined && data.budget !== null ? data.budget.toString() : "");
        setFollowerCount(data.follower_count?.toString() || "");
      }
    };

    fetchProfile();
  }, [session]);

  const toggleArrayItem = (array: string[], value: string) =>
    array.includes(value) ? array.filter((v) => v !== value) : [...array, value];

  const handleSave = async () => {
    if (!session?.user) {
      setMessage("❌ No user logged in");
      return;
    }

    if (!role) {
      setMessage("❌ Please select a role");
      return;
    }

    if (role === "influencer" && platforms.length === 0) {
      setMessage("❌ Please select at least one platform");
      return;
    }

    if (industries.length === 0) {
      setMessage("❌ Please select at least one industry");
      return;
    }

    const payload: any = {
      role,
      role_locked: true,
      platforms,
      industries,
      pricing_range,
      budget_range,
      // convert budget string -> numeric for DB numeric column
      budget: budget ? Number(budget) : null,
      // convert followerCount string -> integer for DB integer column
      follower_count: followerCount ? parseInt(followerCount, 10) : null,
    };

    const { error } = await supabase
      .from("profiles")
      .upsert({ auth_uid: session.user.id, ...payload }, { onConflict: "auth_uid" });

    setMessage(error ? `❌ ${error.message}` : "✅ Profile saved");
    if (!error) {
      setRoleLocked(true);
      setTimeout(() => navigate("/dashboard"), 800);
    }
  };

  return (
    <div className="role-selection-container">
      <div className="role-selection-content">
        <h2 className="title">{t("selectRole", lang)}</h2>
        <p className="subtitle">Choose your role to get started on CollabConnect</p>

        {/* Role Selection */}
        <div className="role-options">
          {["influencer", "brand"].map((r) => (
            <div
              key={r}
              onClick={() => !roleLocked && setRole(r as "influencer" | "brand")}
              className={`role-card ${role === r ? "selected" : ""} ${roleLocked ? "locked" : ""}`}
            >
              <span>{t(r, lang)}</span>
              {roleLocked && role === r && <span className="lock-icon">🔒</span>}
            </div>
          ))}
        </div>

        {/* Influencer Fields */}
        {role === "influencer" && (
          <div className="field-group">
            <label>{t("platformsLabel", lang)}</label>
            <div className="multi-select">
              {PLATFORM_OPTIONS.map((p) => (
                <div
                  key={p}
                  className={`chip ${platforms.includes(p) ? "selected" : ""}`}
                  onClick={() => setPlatforms(toggleArrayItem(platforms, p))}
                >
                  {p}
                </div>
              ))}
            </div>

            <label style={{ marginTop: "1.5rem" }}>{t("followerCountLabel", lang)}</label>
            <input
              type="number"
              value={followerCount}
              onChange={(e) => setFollowerCount(e.target.value)}
              placeholder={t("followerCountPlaceholder", lang)}
            />
          </div>
        )}

        {/* Common Fields */}
        <div className="field-group">
          <label>{t("industriesLabel", lang)}</label>
          <div className="multi-select">
            {INDUSTRIES_OPTIONS.map((i) => (
              <div
                key={i}
                className={`chip ${industries.includes(i) ? "selected" : ""}`}
                onClick={() => setIndustries(toggleArrayItem(industries, i))}
              >
                {i}
              </div>
            ))}
          </div>

          <label style={{ marginTop: "1.5rem" }}>{t("pricingLabel", lang)}</label>
          <select value={pricing_range} onChange={(e) => setPricingRange(e.target.value)}>
            <option value="">{t("pricingPlaceholder", lang)}</option>
            {PRICING_OPTIONS.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>

        {/* Brand Fields */}
        {role === "brand" && (
          <div className="field-group">
            <label>{t("budgetRangeLabel", lang)}</label>
            <select value={budget_range} onChange={(e) => setBudgetRange(e.target.value)}>
              <option value="">{t("budgetRangePlaceholder", lang)}</option>
              {BUDGET_RANGE_OPTIONS.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>

            <label style={{ marginTop: "1.5rem" }}>{t("budgetLabel", lang)}</label>
            <input
              type="number"
              step="0.01"
              value={budget}
              onChange={(e) => setBudget(e.target.value)}
              placeholder={t("budgetPlaceholder", lang)}
            />
          </div>
        )}

        <button className="save-btn" onClick={handleSave}>
          {t("saveProfile", lang)}
        </button>

        {message && <p className={`message ${message.includes("✅") ? "success" : "error"}`}>{message}</p>}
      </div>
    </div>
  );
}
