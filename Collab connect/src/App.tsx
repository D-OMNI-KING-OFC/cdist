import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom"
import Landing from "./pages/Landing"
import Login from "./components/Auth"
import RoleSelection from "./pages/RoleSelection"
import Dashboard from "./components/Dashboard"
import BrandDashboard from "./components/BrandDashboard"
import InfluencerDashboard from "./components/InfluencerDashboard"
import { useState, useEffect } from "react"

import { supabase } from "./lib/supabaseClient"

import LoadingScreen from "./components/LoadingScreen"

import Translate from "./components/Translate"
import BuilderPage from './BuilderPage';

const pageTransitionStyles = `
  @keyframes pageEnter {
    from {
      opacity: 0;
      transform: translateY(20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .page-container {
    animation: pageEnter 0.5s ease-out forwards;
  }
`;

export default function App() {
  const [session, setSession] = useState<any>(null)
  const [userRole, setUserRole] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [lang, setLang] = useState<"en" | "ko" | "fr">("en");

  useEffect(() => {
    const fetchSession = async () => {
      const { data } = await supabase.auth.getSession()
      setSession(data.session)

      if (data.session?.user) {
        const { data: profile, error } = await supabase
          .from("profiles")
          .select("role")
          .eq("auth_uid", data.session.user.id)
          .single()
        if (!error && profile) setUserRole(profile.role || null)
      }
      setLoading(false)
    }

    fetchSession()

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      if (session?.user) {
        supabase
          .from("profiles")
          .select("role")
          .eq("auth_uid", session.user.id)
          .single()
          .then(({ data: profile }) => {
            setUserRole(profile?.role || null)
          })
      } else {
        setUserRole(null)
      }
    })

    return () => listener?.subscription?.unsubscribe?.()
  }, [])

  // If still loading, show loading screen
  if (loading) return <LoadingScreen />

  return (
    <>
      <style>{pageTransitionStyles}</style>
      <Translate lang={lang} setLang={setLang} />

      <Router>
        <Routes>
          {/* Landing - only accessible when not logged in */}
          {!session ? (
            <>
              <Route path="/" element={<div className="page-container"><Landing lang={lang} /></div>} />
              <Route path="/login" element={<div className="page-container"><Login lang={lang} /></div>} />
              {/* Redirect all other routes to landing when not authenticated */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </>
          ) : (
            <>
              {/* Role selection - for users without a role */}
              {!userRole && (
                <Route
                  path="/role-selection"
                  element={<div className="page-container"><RoleSelection lang={lang} session={session} userID={""} /></div>}
                />
              )}

              {/* Default dashboard fallback */}
              <Route path="/dashboard" element={<div className="page-container"><Dashboard lang={lang} session={session} /></div>} />

              {/* Brand Dashboard - only for brands */}
              {userRole === "brand" && (
                <Route
                  path="/brand-dashboard"
                  element={<div className="page-container"><BrandDashboard lang={lang} session={session} /></div>}
                />
              )}

              {/* Influencer Dashboard - only for influencers */}
              {userRole === "influencer" && (
                <Route
                  path="/influencer-dashboard"
                  element={<div className="page-container"><InfluencerDashboard lang={lang} session={session} /></div>}
                />
              )}

              {/* Builder Page */}
              <Route path="/builder/*" element={<BuilderPage />} />

              {/* Smart redirection based on role */}
              <Route
                path="/"
                element={
                  <Navigate
                    to={
                      !userRole
                        ? "/role-selection"
                        : userRole === "brand"
                          ? "/brand-dashboard"
                          : "/influencer-dashboard"
                    }
                    replace
                  />
                }
              />

              {/* Catch-all redirect - maintain current page if in dashboard, otherwise go to dashboard */}
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </>
          )}
        </Routes>
      </Router>
    </>
  )
}
