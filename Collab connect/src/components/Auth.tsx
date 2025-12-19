import React, { useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { t } from "../i18n/index";
import "./Auth.css";

type AuthProps = {
  lang: string;
};

export default function Auth({ lang }: AuthProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  // 🔹 Sign Up
  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
      });
      setMessage(error ? error.message : "✅ Check your email for confirmation link");
    } catch (err: unknown) {
      const error = err instanceof Error ? err.message : "Unknown error";
      setMessage(error ?? "❌ Unknown error during sign up");
    } finally {
      setLoading(false);
    }
  };

  // 🔹 Sign In
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      setMessage(error ? error.message : "🎉 Logged in successfully!");
    } catch (err: unknown) {
      const error = err instanceof Error ? err.message : "Unknown error";
      setMessage(error ?? "❌ Unknown error during sign in");
    } finally {
      setLoading(false);
    }
  };

  // 🔹 Google Login
  const handleGoogleLogin = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
      });
      if (error) setMessage(error.message);
    } catch (err: unknown) {
      const error = err instanceof Error ? err.message : "Unknown error";
      setMessage(error ?? "❌ Unknown error during Google login");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      {/* Header / Nav */}
      <header className="auth-header" role="banner">
        <nav className="auth-nav container" aria-label="Main navigation">
          <div className="brand" aria-hidden={false}>
            <div className="brand-logo" aria-hidden>
              {/* use forward slashes for React */}
              <img src="src/assets/cc-3d.png" alt="CollabConnect logo" />
            </div>
            <h1 className="brand-title">CollabConnect</h1>
          </div>

          {/* Desktop links (uses nav-links, nav-link, desktop-only) */}
          <div className="nav-links desktop-only" role="navigation" aria-label="Desktop links">
            <a className="nav-link" href="#" onClick={(e) => e.preventDefault()}>
              For Creators
            </a>
            <a className="nav-link" href="#" onClick={(e) => e.preventDefault()}>
              Pricing
            </a>
            <a className="nav-link" href="#" onClick={(e) => e.preventDefault()}>
              Resources
            </a>

            {/* header buttons use btn and btn-ghost / btn-primary */}
            <button className="btn btn-ghost" onClick={(e) => e.preventDefault()}>
              Log In
            </button>
            <button className="btn btn-primary" onClick={(e) => e.preventDefault()}>
              Get Started
            </button>
          </div>

          {/* Mobile hamburger (mobile-only, hamburger, hamburger-svg) */}
          <div className="mobile-only">
            <button className="hamburger btn" aria-label="open menu" onClick={(e) => e.preventDefault()}>
              <svg className="hamburger-svg" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                <path d="M4 6h16M4 12h16m-7 6h7" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
              </svg>
            </button>
          </div>
        </nav>
      </header>

      {/* Main */}
      <main className="auth-main" role="main">
        <div className="auth-card-wrap">
          {/* Left column: intro + form */}
          <div>
            <div className="auth-intro">
              <h2 className="auth-title">{t("authTitle", lang) || "Sign in to your brand account"}</h2>
              <p className="auth-sub">
                Or{" "}
                <a
                  className="auth-link"
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    /* could route to sign up flow */
                  }}
                >
                  create a new account
                </a>
              </p>
            </div>

            <div className="auth-card" aria-labelledby="signin-heading">
              <form className="auth-form" method="POST" onSubmit={handleSignIn}>
                {/* Email row */}
                <div className="form-row">
                  <label htmlFor="email" className="form-label">
                    Email address
                  </label>
                  <div className="input-wrap">
                    <input
                      id="email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      required
                      placeholder={t("emailPlaceholder", lang) || "you@brand.com"}
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="form-input"
                    />
                  </div>
                </div>

                {/* Password row */}
                <div className="form-row">
                  <label htmlFor="password" className="form-label">
                    Password
                  </label>
                  <div className="input-wrap">
                    <input
                      id="password"
                      name="password"
                      type="password"
                      autoComplete="current-password"
                      required
                      placeholder={t("passwordPlaceholder", lang) || "••••••••"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="form-input"
                    />
                  </div>
                </div>

                {/* Remember / Forgot row (uses form-between, remember, checkbox, remember-label, auth-link) */}
                <div className="form-row form-between">
                  <div className="remember">
                    <input id="remember-me" name="remember-me" type="checkbox" className="checkbox" />
                    <label htmlFor="remember-me" className="remember-label">
                      Remember me
                    </label>
                  </div>
                  <div>
                    <a className="auth-link nav-link" href="#" onClick={(e) => e.preventDefault()}>
                      Forgot your password?
                    </a>
                  </div>
                </div>

                {/* Sign in (btn-submit uses btn styles too) */}
                <div className="form-row">
                  <button type="submit" disabled={loading} className="btn btn-submit">
                    {loading ? "Loading..." : t("signIn", lang)}
                  </button>
                </div>

                {/* Sign up (secondary) */}
                <div className="form-row">
                  <button
                    type="button"
                    onClick={handleSignUp}
                    disabled={loading}
                    className="btn btn-secondary"
                  >
                    {loading ? "Loading..." : t("signUp", lang)}
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* Right column: alternative auth + extras (makes sure all classes used) */}
          <aside aria-label="Alternative sign-in options and info">
            {/* Small info card that also uses auth-card to reuse styles */}
            <div className="auth-card">
              <h3 className="auth-title" style={{ fontSize: "1.125rem", marginBottom: 8 }}>
                Quick access
              </h3>

              <p className="auth-sub" style={{ marginBottom: 12 }}>
                Use a social account or explore features. This panel intentionally uses the same glass surface as the form.
              </p>

              {/* Ghost action and primary action examples (btn-ghost & btn-primary) */}
              <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
                <button className="btn btn-ghost" onClick={(e) => e.preventDefault()}>
                  Learn more
                </button>
                <button className="btn btn-primary" onClick={(e) => e.preventDefault()}>
                  Start tour
                </button>
              </div>

              {/* Divider (auth-hr) and Google button (btn-google) */}
              <div className="auth-alt">
                <hr className="auth-hr" />
                <button onClick={handleGoogleLogin} disabled={loading} className="btn btn-google">
                  <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden focusable="false">
                    <path fill="currentColor" d="M21.35 11.1h-9.18v2.92h5.26c-.23 1.48-1.53 4.34-5.26 4.34-3.17 0-5.76-2.6-5.76-5.8s2.59-5.8 5.76-5.8c1.8 0 3.01.77 3.7 1.42l2.53-2.44C17.15 4.1 15.31 3 12.7 3 7.95 3 4 6.92 4 11.99s3.95 8.99 8.7 8.99c5.02 0 8.36-3.52 8.36-8.47 0-.57-.06-.98-.41-1.41z"/>
                  </svg>
                  {t("signInWithGoogle", lang) || "Sign in with Google"}
                </button>

                {/* status message (auth-message with success/error) */}
                <p className={`auth-message ${message.includes("✅") ? "success" : "error"}`}>{message}</p>
              </div>
            </div>

            {/* Decorative / background helper to consume heroBg class from CSS (uses heroBg) */}
            <div aria-hidden className="heroBg" style={{ marginTop: 12, borderRadius: 12, overflow: "hidden", height: 90 }} />

          </aside>
        </div>
      </main>
    </div>
  );
}