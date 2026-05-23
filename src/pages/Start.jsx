import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Radio, Music4, Tv2, Mail, CheckCircle2, Download, Heart, Zap, Check, Crown, Library, Youtube } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";

const PRIMARY = "0,160,220";
const GOLD = "212,168,67";

function PremiumButton({ children, onClick, href, className = "", style = {} }) {
  const base = {
    background: "linear-gradient(135deg,#0090C8,#00A0DC)",
    color: "#000",
    boxShadow: "0 0 32px rgba(0,160,220,0.4), 0 4px 18px rgba(0,0,0,0.35)",
    fontFamily: "var(--font-heading)",
    fontWeight: 900,
    letterSpacing: "0.05em",
    ...style,
  };
  if (href) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer"
        className={`w-full flex items-center justify-center gap-2.5 py-4 rounded-2xl text-sm tracking-wider transition-all active:scale-[0.97] ${className}`}
        style={base}>
        {children}
      </a>
    );
  }
  if (onClick) {
    return (
      <button onClick={onClick}
        className={`w-full flex items-center justify-center gap-2.5 py-4 rounded-2xl text-sm tracking-wider transition-all active:scale-[0.97] ${className}`}
        style={base}>
        {children}
      </button>
    );
  }
  return null;
}

const YT_URL = "https://www.youtube.com/@UpperVibeMedia";
const PAGE_TITLE = "Upper Vibe Media | 432 Hz Music, Visualizers & Frequency Drops";
const PAGE_DESC = "Watch new Upper Vibe Media visualizers on YouTube, stream the latest music free, and unlock full song downloads with Premium.";

function PremiumWelcome() {
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center"
      style={{
        background: "linear-gradient(160deg,#06060f 0%,#090914 55%,#04040d 100%)",
        fontFamily: "var(--font-body)",
      }}
    >
      <div className="fixed inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 0 }}>
        <div className="absolute top-[-100px] left-1/2 -translate-x-1/2 w-[500px] h-[400px] rounded-full blur-[180px]"
          style={{ background: "rgba(0,144,200,0.08)" }} />
      </div>
      <div className="relative z-10 w-full max-w-md px-5 py-16 flex flex-col items-center gap-6 text-center">
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
          style={{ background: "rgba(0,160,220,0.1)", border: "1px solid rgba(0,160,220,0.25)" }}>
          <Crown className="w-8 h-8" style={{ color: "#00A0DC" }} />
        </div>
        <div>
          <p className="text-[9px] font-black tracking-[0.35em] uppercase mb-3" style={{ color: "rgba(0,160,220,0.7)" }}>
            Upper Vibe Plus Member
          </p>
          <h1 style={{ fontFamily: "var(--font-heading)", fontSize: "clamp(1.5rem,6vw,2rem)", fontWeight: 900, color: "#fff", lineHeight: 1.15, marginBottom: "0.75rem" }}>
            Welcome Back To Your<br /><span style={{ color: "#00A0DC" }}>Vibe Library</span>
          </h1>
          <p style={{ fontSize: "0.9rem", lineHeight: 1.65, color: "rgba(255,255,255,0.45)" }}>
            Your Premium downloads and saved frequency collection are ready.
          </p>
        </div>
        <div className="w-full flex flex-col gap-3 mt-2">
          <Link to="/my-vibes"
            className="w-full flex items-center justify-center gap-2.5 py-4 rounded-2xl text-sm font-black tracking-wide transition-all active:scale-[0.97]"
            style={{ background: "linear-gradient(135deg,#0090C8,#00A0DC)", color: "#000", boxShadow: "0 0 32px rgba(0,160,220,0.35)", fontFamily: "var(--font-heading)" }}>
            <Library className="w-4 h-4" /> Open My Vibe Library
          </Link>
          <Link to="/music"
            className="w-full flex items-center justify-center gap-2.5 py-3.5 rounded-2xl text-sm font-black tracking-wide transition-all active:scale-[0.97]"
            style={{ background: "rgba(0,160,220,0.07)", border: "1px solid rgba(0,160,220,0.22)", color: "#00A0DC" }}>
            <Music4 className="w-4 h-4" /> Browse Music
          </Link>
          <Link to="/radio"
            className="w-full flex items-center justify-center gap-2.5 py-3.5 rounded-2xl text-sm font-black tracking-wide transition-all active:scale-[0.97]"
            style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.09)", color: "rgba(255,255,255,0.5)" }}>
            <Radio className="w-4 h-4" /> Listen To Live Radio
          </Link>
        </div>
        <Link to="/" className="text-sm font-bold" style={{ color: "rgba(0,160,220,0.5)" }}>
          Enter Full Site →
        </Link>
      </div>
    </div>
  );
}

export default function Start() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [checkoutError, setCheckoutError] = useState("");
  const [isPremiumUser, setIsPremiumUser] = useState(false);
  const navigate = useNavigate();
  const { user, isAuthenticated, isLoadingAuth } = useAuth();

  // Check membership status and redirect if needed — all hooks before any returns
  useEffect(() => {
    if (isLoadingAuth) return;
    if (isAuthenticated && user) {
      const isAdmin = user.role === "admin";
      const isPlus = isAdmin || user.isPlus === true || user.tier === "plus"
        || user.tier === "premium" || user.isPremium === true || user.role === "premium";
      if (isAdmin) { return; } // Admin can view /start normally
      if (isPlus) { navigate("/my-vibes", { replace: true }); setIsPremiumUser(true); return; }
    }
  }, [isAuthenticated, isLoadingAuth, user, navigate]);

  // Inject page-specific meta tags for social sharing
  useEffect(() => {
    const prev = document.title;
    document.title = PAGE_TITLE;

    const setMeta = (sel, attr, val) => {
      let el = document.querySelector(sel);
      if (!el) { el = document.createElement("meta"); document.head.appendChild(el); }
      el.setAttribute(attr, val);
    };

    setMeta('meta[name="description"]', "content", PAGE_DESC);
    setMeta('meta[property="og:title"]', "content", PAGE_TITLE);
    setMeta('meta[property="og:description"]', "content", PAGE_DESC);
    setMeta('meta[property="og:url"]', "content", "https://uppervibemedia.com/start");
    setMeta('meta[name="twitter:title"]', "content", PAGE_TITLE);
    setMeta('meta[name="twitter:description"]', "content", PAGE_DESC);

    return () => { document.title = prev; };
  }, []);

  // Show loading while auth resolves
  if (isLoadingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center"
        style={{ background: "linear-gradient(160deg,#06060f 0%,#090914 55%,#04040d 100%)" }}>
        <div className="w-6 h-6 border-2 border-cyan-400/20 border-t-cyan-400 rounded-full animate-spin" />
      </div>
    );
  }

  // Premium/admin fallback welcome screen (shown if navigate hasn't fired yet)
  if (isPremiumUser) return <PremiumWelcome />;

  const handleCheckout = async () => {
    if (window.self !== window.top) {
      setCheckoutError("Checkout is only available from the published app. Please open uppervibemedia.com directly.");
      return;
    }
    setCheckoutError("");
    try {
      const res = await base44.functions.invoke("stripeCheckout", {
        plan: "plus",
        billingCycle: "monthly",
        successUrl: `${window.location.origin}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
        cancelUrl: `${window.location.origin}/start`,
      });
      if (res.data?.url) window.location.href = res.data.url;
    } catch (e) {
      setCheckoutError("Something went wrong. Please try again.");
    }
  };

  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    if (!email) return;
    setSaving(true);
    await base44.entities.ContactMessage.create({
      name: "Fan",
      email,
      type: "newsletter",
      message: "Email list signup from /start landing page",
    });
    setSaving(false);
    setSubmitted(true);
  };

  return (
    <div
      className="min-h-screen flex flex-col items-center"
      style={{
        background: "linear-gradient(160deg,#06060f 0%,#090914 55%,#04040d 100%)",
        WebkitOverflowScrolling: "touch",
        fontFamily: "var(--font-body)",
      }}
    >
      {/* Ambient glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 0 }}>
        <div className="absolute top-[-100px] left-1/2 -translate-x-1/2 w-[500px] h-[400px] rounded-full blur-[180px]"
          style={{ background: "rgba(0,144,200,0.06)" }} />
        <div className="absolute bottom-[-60px] right-[-30px] w-[280px] h-[280px] rounded-full blur-[130px]"
          style={{ background: "rgba(212,168,67,0.04)" }} />
      </div>

      <div className="relative z-10 w-full max-w-md px-5 pb-16 pt-10 flex flex-col gap-8">

        {/* ── HERO ── */}
        <section className="flex flex-col items-center text-center gap-5">

          {/* Wordmark */}
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-4"
              style={{ background: "rgba(0,160,220,0.07)", border: "1px solid rgba(0,160,220,0.22)" }}>
              <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: "#00A0DC" }} />
              <span style={{ fontSize: "9px", fontWeight: 900, letterSpacing: "0.38em", textTransform: "uppercase", color: "#00A0DC", fontFamily: "var(--font-heading)" }}>
                432 Hz High-Vibe Music
              </span>
            </div>
            <div style={{ fontFamily: "var(--font-heading)", fontSize: "clamp(1.9rem, 9vw, 2.6rem)", fontWeight: 900, lineHeight: 0.93, letterSpacing: "0.06em", textTransform: "uppercase", color: "#F5A800", filter: "drop-shadow(0 2px 12px rgba(245,168,0,0.28))" }}>
              UPPER VIBE
            </div>
            <div style={{ fontFamily: "var(--font-heading)", fontSize: "clamp(1rem, 5vw, 1.4rem)", fontWeight: 800, lineHeight: 1.1, letterSpacing: "0.22em", textTransform: "uppercase", color: "#2B9FE8", filter: "drop-shadow(0 2px 8px rgba(43,159,232,0.28))" }}>
              MEDIA
            </div>
          </div>

          {/* Headline */}
          <div>
            <h1 style={{ fontFamily: "var(--font-heading)", fontSize: "clamp(1.35rem, 5.5vw, 1.85rem)", fontWeight: 900, lineHeight: 1.18, color: "#fff", marginBottom: "0.65rem" }}>
              432 Hz High-Vibe Music,<br />
              <span style={{ color: "#00A0DC" }}>Visualizers & Frequency Drops</span>
            </h1>
            <p style={{ fontSize: "0.875rem", lineHeight: 1.65, color: "rgba(255,255,255,0.45)", maxWidth: "24rem", margin: "0 auto" }}>
              Watch new Upper Vibe Media visualizers on YouTube, stream the latest music free, and unlock full song downloads with Premium.
            </p>
          </div>

          {/* ── PRIMARY CTA: YouTube ── */}
          <div className="w-full flex flex-col gap-3">
            <a
              href={YT_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full flex items-center justify-center gap-2.5 py-4 rounded-2xl text-sm font-black tracking-wide transition-all active:scale-[0.97]"
              style={{
                background: "linear-gradient(135deg,#c4302b,#ff4444)",
                color: "#fff",
                boxShadow: "0 0 32px rgba(196,48,43,0.45), 0 4px 18px rgba(0,0,0,0.35)",
                fontFamily: "var(--font-heading)",
                letterSpacing: "0.05em",
              }}
            >
              <Youtube className="w-4 h-4" /> Watch New Visualizers On YouTube
            </a>

            {/* Secondary: Music */}
            <Link to="/music"
              className="w-full flex items-center justify-center gap-2.5 py-3.5 rounded-2xl text-sm font-black tracking-wide transition-all active:scale-[0.97]"
              style={{ background: "rgba(0,160,220,0.08)", border: "1px solid rgba(0,160,220,0.28)", color: "#00A0DC", fontFamily: "var(--font-heading)" }}>
              <Music4 className="w-4 h-4" /> Listen To Latest Music
            </Link>

            {/* Third: Radio */}
            <Link to="/radio"
              className="w-full flex items-center justify-center gap-2.5 py-3.5 rounded-2xl text-sm font-black tracking-wide transition-all active:scale-[0.97]"
              style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.09)", color: "rgba(255,255,255,0.5)", fontFamily: "var(--font-heading)" }}>
              <Radio className="w-4 h-4" /> Try Live Radio
            </Link>
          </div>
        </section>

        {/* ── PREMIUM CTA ── */}
        <section className="flex flex-col items-center gap-4 py-6 px-5 rounded-3xl"
          style={{ background: `rgba(${PRIMARY},0.06)`, border: `1px solid rgba(${PRIMARY},0.18)` }}>
          <div className="text-center">
            <h2 style={{ fontFamily: "var(--font-heading)", fontSize: "1.2rem", fontWeight: 900, color: "#fff", marginBottom: "0.5rem" }}>
              Want To Keep The Frequency With You?
            </h2>
            <p className="text-sm" style={{ color: "rgba(255,255,255,0.42)", lineHeight: 1.6 }}>
              Upgrade for $4.99/month to download every Upper Vibe Media song and build your personal vibe library.
            </p>
          </div>
          <PremiumButton onClick={handleCheckout} style={{ background: "linear-gradient(135deg,#0090C8,#00B8D4)", color: "#000", boxShadow: "0 0 36px rgba(0,160,220,0.45)" }}>
            <Download className="w-4 h-4" />
            Unlock All Downloads — $4.99/month
          </PremiumButton>
          {checkoutError && (
            <p className="text-xs text-center" style={{ color: "rgba(255,100,100,0.85)" }}>{checkoutError}</p>
          )}
          <p className="text-[10px]" style={{ color: "rgba(255,255,255,0.2)" }}>Cancel anytime · Streaming always free</p>
        </section>

        {/* ── EMAIL CTA ── */}
        <section className="flex flex-col gap-2">
          <p className="text-[9px] font-black tracking-[0.3em] uppercase text-center mb-1" style={{ color: "rgba(255,255,255,0.22)" }}>
            <Mail className="w-3 h-3 inline mr-1 mb-0.5" />
            Join Upper Vibe Updates
          </p>
          {!submitted ? (
            <form onSubmit={handleEmailSubmit} className="flex flex-col gap-2">
              <input
                type="email"
                placeholder="Your email address"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 rounded-xl text-sm text-white placeholder:text-white/25 focus:outline-none"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", WebkitAppearance: "none" }}
              />
              <button type="submit" disabled={saving}
                className="w-full py-3 rounded-xl text-sm font-black tracking-wide transition-all active:scale-[0.97] disabled:opacity-60"
                style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.5)" }}>
                {saving ? "Joining..." : "Get New Music Alerts"}
              </button>
            </form>
          ) : (
            <div className="w-full flex items-center justify-center gap-3 py-3.5 rounded-xl"
              style={{ background: "rgba(0,160,220,0.07)", border: "1px solid rgba(0,160,220,0.2)" }}>
              <CheckCircle2 className="w-4 h-4" style={{ color: "#00A0DC" }} />
              <span className="text-sm font-bold" style={{ color: "rgba(255,255,255,0.65)" }}>You're on the list!</span>
            </div>
          )}
        </section>

        {/* Footer */}
        <div className="flex flex-col items-center gap-2 pt-2">
          <Link to="/" className="text-sm font-bold transition-all" style={{ color: "rgba(0,160,220,0.6)" }}>
            Enter Full Site →
          </Link>
          <p className="text-[10px] text-center" style={{ color: "rgba(255,255,255,0.18)", letterSpacing: "0.05em" }}>
            © Upper Vibe Media · All rights reserved
          </p>
        </div>
      </div>
    </div>
  );
}