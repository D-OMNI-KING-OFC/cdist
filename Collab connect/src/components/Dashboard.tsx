// src/pages/Dashboard.tsx
import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import { t } from "../i18n/index";
import LoadingScreen from "../components/LoadingScreen";

type DashboardProps = {
  lang: string;
  session?: { user?: { id: string } };
};

const dashboardStyles = `
  .dashboard-transition {
    animation: dashboardFadeIn 0.6s ease-out;
  }

  @keyframes dashboardFadeIn {
    from {
      opacity: 0;
      transform: translateY(20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .dashboard-container {
    min-height: 100vh;
    background: 
      radial-gradient(ellipse 80% 50% at 50% -20%, rgba(14, 165, 233, 0.15), transparent),
      radial-gradient(ellipse 60% 40% at 80% 100%, rgba(59, 130, 246, 0.1), transparent),
      linear-gradient(180deg, #010409 0%, #030712 50%, #0a1929 100%);
    background-attachment: fixed;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 2rem;
  }

  .dashboard-content {
    text-align: center;
    max-width: 600px;
    padding: 3rem;
    background: rgba(255, 255, 255, 0.02);
    backdrop-filter: blur(20px);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 16px;
    color: rgba(255, 255, 255, 0.95);
    font-family: 'Inter', system-ui, -apple-system, sans-serif;
  }

  .dashboard-content h2 {
    font-size: 1.8rem;
    margin-bottom: 1rem;
    background: linear-gradient(135deg, #fff 0%, #38bdf8 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }

  .dashboard-content p {
    font-size: 1rem;
    color: rgba(255, 255, 255, 0.7);
    margin-bottom: 2rem;
    line-height: 1.6;
  }

  .dashboard-btn {
    padding: 0.85rem 2rem;
    background: linear-gradient(135deg, #0ea5e9 0%, #3b82f6 100%);
    color: white;
    border: none;
    border-radius: 12px;
    font-size: 1rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    box-shadow: 0 8px 24px rgba(14, 165, 233, 0.3);
  }

  .dashboard-btn:hover {
    transform: translateY(-3px);
    box-shadow: 0 12px 32px rgba(14, 165, 233, 0.4);
  }

  .dashboard-btn:active {
    transform: translateY(-1px);
  }
`;

export default function Dashboard({ lang, session: propSession }: DashboardProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const [session, setSession] = useState<{ user?: { id: string } } | null>(propSession || location.state?.session || null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      // Try to get session from Supabase if not passed as prop
      if (!session) {
        const { data } = await supabase.auth.getSession();
        if (!data.session) {
          navigate("/login");
          return;
        }
        setSession(data.session);
      }

      const currentSession = session || (await supabase.auth.getSession()).data.session;
      if (!currentSession?.user) {
        navigate("/login");
        return;
      }

      // Fetch user profile
      const { data: profile, error } = await supabase
        .from("profiles")
        .select("role")
        .eq("auth_uid", currentSession.user.id)
        .single();

      if (error) {
        console.error("Error fetching profile:", error.message);
      } else {
        // Redirect automatically if role exists
        if (profile?.role === "brand") {
          setTimeout(() => navigate("/brand-dashboard"), 300);
          return;
        } else if (profile?.role === "influencer") {
          setTimeout(() => navigate("/influencer-dashboard"), 300);
          return;
        }
      }

      setLoading(false);
    };

    init();
  }, [session, navigate]);

  if (loading) return <LoadingScreen />;

  // If user has no role yet
  return (
    <>
      <style>{dashboardStyles}</style>
      <div className="dashboard-transition">
        <div className="dashboard-container">
          <div className="dashboard-content">
            <h2>{t("noRoleTitle", lang)}</h2>
            <p>{t("noRoleMessage", lang)}</p>
            <button
              className="dashboard-btn"
              onClick={() => navigate("/role-selection", { state: { session } })}
            >
              {t("chooseRole", lang)}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
