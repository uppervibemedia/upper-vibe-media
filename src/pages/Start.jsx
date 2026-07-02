import React, { Suspense, lazy, useState, useEffect, useRef, useCallback } from "react";
import EmailCaptureModal from "@/components/shared/EmailCaptureModal";
import StreamingPlatformLinks from "@/components/shared/StreamingPlatformLinks";
import { createPortal } from "react-dom";
import { Link, useNavigate } from "react-router-dom";
import { Radio, Music4, Tv2, Mail, CheckCircle2, Download, Heart, Zap, Check, Crown, Library, X, UserPlus, LogIn } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { toast } from "sonner";
import { trackEmailSignup } from "@/lib/analytics";

import RadioCTA from "@/components/start/RadioCTA";
import DeferredMount from "@/components/shared/DeferredMount";

const YouTubeCTA = lazy(() => import("@/components/start/YouTubeCTA"));
const UpperVibeCityPreview = lazy(() => import("@/components/vibeworld/UpperVibeCityPreview"));

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

const PAGE_TITLE = "Start Listening | Upper Vibe Media";
const PAGE_DESC = "Stream 432 Hz high-vibe music free on Upper Vibe Media. Upgrade to Premium for $4.99/month to download every song and build your personal vibe library.";

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
            Your Plus downloads and saved frequency collection are ready.
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

// ── Auth-choice modal — rendered via portal directly on document.body ─────────
// This bypasses framer-motion's transform stacking context so position:fixed
// works correctly relative to the actual viewport on all mobile browsers.
function AuthChoiceModal({ open, onClose, onLogin, onSignup, onListenFree }) {
  const scrollSavedY = useRef(0);
  const contentRef = useRef(null);

  // Lock background scroll when open, restore on close
  useEffect(() => {
    if (open) {
      // Save current scroll position
      scrollSavedY.current = window.scrollY || window.pageYOffset;
      // Lock scroll without jumping to top
      document.body.style.position = "fixed";
      document.body.style.top = `-${scrollSavedY.current}px`;
      document.body.style.width = "100%";
      document.body.style.overflowY = "scroll";
      // Reset modal's own scroll to top
      if (contentRef.current) contentRef.current.scrollTop = 0;
    } else {
      // Restore scroll position
      document.body.style.position = "";
      document.body.style.top = "";
      document.body.style.width = "";
      document.body.style.overflowY = "";
      window.scrollTo(0, scrollSavedY.current);
    }
    return () => {
      document.body.style.position = "";
      document.body.style.top = "";
      document.body.style.width = "";
      document.body.style.overflowY = "";
    };
  }, [open]);

  if (!open) return null;

  return createPortal(
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: "rgba(4,4,14,0.88)",
        backdropFilter: "blur(6px)",
        WebkitBackdropFilter: "blur(6px)",
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        overflowY: "auto",
        paddingTop: "max(env(safe-area-inset-top, 0px), 16px)",
        paddingLeft: 16,
        paddingRight: 16,
        paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 24px)",
      }}
    >
      <div
        ref={contentRef}
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: 420,
          background: "linear-gradient(160deg,#0d0d22,#0a0a1a)",
          border: "1px solid rgba(0,160,220,0.28)",
          borderRadius: 24,
          padding: "28px 22px 24px",
          position: "relative",
          boxShadow: "0 24px 80px rgba(0,0,0,0.7), 0 0 40px rgba(0,160,220,0.08)",
          marginTop: 0,
          flexShrink: 0,
        }}
      >
        {/* Close button — 44px touch target */}
        <button
          onClick={onClose}
          style={{
            position: "absolute", top: 12, right: 12,
            background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.14)",
            borderRadius: 12, color: "rgba(255,255,255,0.6)", cursor: "pointer",
            width: 44, height: 44, display: "flex", alignItems: "center", justifyContent: "center",
            flexShrink: 0,
          }}
          aria-label="Close"
        >
          <X style={{ width: 18, height: 18 }} />
        </button>

        <div style={{ textAlign: "center", marginBottom: 22 }}>
          <div style={{
            width: 52, height: 52, borderRadius: 15,
            background: "rgba(0,160,220,0.1)", border: "1px solid rgba(0,160,220,0.28)",
            display: "inline-flex", alignItems: "center", justifyContent: "center", marginBottom: 14,
          }}>
            <Crown style={{ width: 24, height: 24, color: "#00A0DC" }} />
          </div>
          <h2 style={{ fontFamily: "var(--font-heading)", fontWeight: 900, fontSize: "1.2rem", color: "#fff", marginBottom: 8, lineHeight: 1.2 }}>
            Unlock All Downloads<br />
            <span style={{ color: "#00A0DC" }}>$4.99/month</span>
          </h2>
          <p style={{ fontSize: "0.82rem", color: "rgba(255,255,255,0.42)", lineHeight: 1.55, maxWidth: 300, margin: "0 auto" }}>
            Create a free account to get started, then unlock Plus for unlimited 432 Hz downloads.
          </p>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {/* Primary: Create Account */}
          <button
            onClick={onSignup}
            style={{
              width: "100%", padding: "14px 20px",
              borderRadius: 15, border: "none", cursor: "pointer",
              background: "linear-gradient(135deg,#0090C8,#00A0DC)",
              color: "#000", fontFamily: "var(--font-heading)", fontWeight: 900,
              fontSize: "0.9rem", letterSpacing: "0.04em",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
              boxShadow: "0 0 28px rgba(0,160,220,0.35)",
            }}
          >
            <UserPlus style={{ width: 17, height: 17 }} />
            Create Account &amp; Unlock Plus
          </button>

          {/* Secondary: Log In */}
          <button
            onClick={onLogin}
            style={{
              width: "100%", padding: "13px 20px",
              borderRadius: 14, cursor: "pointer",
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.14)",
              color: "rgba(255,255,255,0.7)", fontWeight: 700, fontSize: "0.875rem",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
            }}
          >
            <LogIn style={{ width: 15, height: 15 }} />
            I Already Have an Account
          </button>

          {/* Tertiary: Listen Free */}
          <button
            onClick={onListenFree}
            style={{
              width: "100%", padding: "10px 20px",
              borderRadius: 12, cursor: "pointer",
              background: "none", border: "none",
              color: "rgba(255,255,255,0.28)", fontSize: "0.8rem", fontWeight: 600,
            }}
          >
            Listen Free — No Account Needed
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

export default function Start() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [checkoutError, setCheckoutError] = useState("");
  const [authModal, setAuthModal] = useState(false); // "plus" | false
  const [startInteracted, setStartInteracted] = useState(false);
  const navigate = useNavigate();
  const { isAuthenticated, isLoadingAuth, isPlus, isAdmin, navigateToLogin } = useAuth();

  // Single effect handles all authenticated routing to avoid race conditions
  useEffect(() => {
    if (isLoadingAuth || !isAuthenticated) return;
    if (isAdmin) return; // admins stay to preview

    const params = new URLSearchParams(window.location.search);
    const hasCheckoutIntent = params.get("intent") === "checkout";

    if (hasCheckoutIntent) {
      // Clear the param from URL
      window.history.replaceState({}, "", "/start");
      if (isPlus) {
        toast.success("You already have Upper Vibe Plus!");
        navigate("/my-vibe-library", { replace: true });
      } else {
        // Free user returning from login — trigger checkout immediately
        triggerCheckout();
      }
      return;
    }

    // No checkout intent — normal redirect
    if (isPlus) { navigate("/my-vibe-library", { replace: true }); return; }
    navigate("/music", { replace: true });
  }, [isAuthenticated, isLoadingAuth, isPlus, isAdmin]);

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

  // Track any meaningful interaction (click) for email popup trigger — must be before early returns
  useEffect(() => {
    if (startInteracted) return;
    const mark = () => setStartInteracted(true);
    window.addEventListener("click", mark, { once: true, passive: true });
    return () => window.removeEventListener("click", mark);
  }, [startInteracted]);

  // Show loading while auth resolves, or while a normal redirect is in progress.
  // If the user has ?intent=checkout, keep the page visible so triggerCheckout can run.
  const hasCheckoutIntent = new URLSearchParams(window.location.search).get("intent") === "checkout";
  const isRedirecting = isAuthenticated && !isAdmin && !hasCheckoutIntent;
  if (isLoadingAuth || isRedirecting) {
    return (
      <div className="min-h-screen flex items-center justify-center"
        style={{ background: "linear-gradient(160deg,#06060f 0%,#090914 55%,#04040d 100%)" }}>
        <div className="w-6 h-6 border-2 border-cyan-400/20 border-t-cyan-400 rounded-full animate-spin" />
      </div>
    );
  }

  const triggerCheckout = async () => {
    setCheckoutError("");
    try {
      const res = await base44.functions.invoke("stripeCheckout", {
        plan: "plus",
        billingCycle: "monthly",
        successUrl: `${window.location.origin}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
        cancelUrl: `${window.location.origin}/start`,
      });
      if (res.data?.url) {
        window.location.href = res.data.url;
      } else {
        setCheckoutError("Checkout could not start. Please try again or contact support.");
      }
    } catch (e) {
      console.error("Checkout error:", e);
      setCheckoutError("Checkout could not start. Please try again or contact support.");
    }
  };

  const handleCheckout = () => {
    setCheckoutError("");

    // Block checkout inside iframes (TikTok in-app browser)
    if (window.self !== window.top) {
      setCheckoutError("Checkout works only from the published app. Please open uppervibemedia.com directly in Safari.");
      return;
    }

    // Already Plus — don't charge again
    if (isPlus) {
      toast.success("You already have Upper Vibe Plus!");
      navigate("/my-vibe-library");
      return;
    }

    // Logged out — show inline choice modal (Create Account vs Log In)
    if (!isAuthenticated) {
      setAuthModal(true);
      return;
    }

    // Logged-in free user (reached via ?intent=checkout flow) — proceed to checkout
    triggerCheckout();
  };

  // Modal action: Create Account — go to auth in signup mode with checkout intent
  const handleSignupForPlus = () => {
    setAuthModal(false);
    navigateToLogin(`${window.location.origin}/start?intent=checkout`);
  };

  // Modal action: Log In — go to auth with checkout intent
  const handleLoginForPlus = () => {
    setAuthModal(false);
    navigateToLogin(`${window.location.origin}/start?intent=checkout`);
  };

  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    if (!email) return;
    setSaving(true);
    const existing = await base44.entities.EmailSubscriber.filter({ email }, "-created_date", 1);
    if (existing.length === 0) {
      await base44.entities.EmailSubscriber.create({
        email,
        source_page: "/start",
        referrer:    document.referrer || "",
        subscribed_status: "active",
      });
      trackEmailSignup();
    }
    setSaving(false);
    setSubmitted(true);
  };

  return (
    <div
      className="min-h-[100dvh] flex flex-col items-center overflow-x-hidden"
      style={{
        background: "linear-gradient(160deg,#06060f 0%,#090914 55%,#04040d 100%)",
        WebkitOverflowScrolling: "touch",
        fontFamily: "var(--font-body)",
        width: "100%",
      }}
    >
      {/* Lightweight static ambient — no fixed positioning, reduced blur for mobile perf */}
      <div className="absolute top-0 left-0 right-0 h-[300px] pointer-events-none overflow-hidden" style={{ zIndex: 0 }}>
        <div className="absolute top-[-60px] left-1/2 -translate-x-1/2 w-[320px] h-[240px] rounded-full blur-[80px]"
          style={{ background: "rgba(0,144,200,0.07)" }} />
      </div>

      <div className="relative z-10 w-full max-w-md px-5 flex flex-col gap-8" style={{ paddingTop: "calc(env(safe-area-inset-top, 0px) + 1.5rem)", paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 9.5rem)" }}>

        {/* ── HERO ── */}
        <section className="flex flex-col items-center text-center gap-5">

          {/* Wordmark */}
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-4"
              style={{ background: "rgba(0,160,220,0.07)", border: "1px solid rgba(0,160,220,0.22)" }}>
              <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: "#00A0DC" }} />
              <span style={{ fontSize: "10px", fontWeight: 900, letterSpacing: "0.3em", textTransform: "uppercase", color: "#00A0DC", fontFamily: "var(--font-heading)" }}>
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

          {/* Featured player card — at the top */}
          <RadioCTA />

          {/* Headline */}
          <div>
            <h1 style={{ fontFamily: "var(--font-heading)", fontSize: "clamp(1.45rem, 6vw, 2rem)", fontWeight: 900, lineHeight: 1.15, color: "#fff", marginBottom: "0.6rem" }}>
              Stream Free.<br />
              <span style={{ color: "#00A0DC" }}>Download Everything</span> for $4.99/month.
            </h1>
            <p style={{ fontSize: "0.875rem", lineHeight: 1.65, color: "rgba(255,255,255,0.45)", maxWidth: "24rem", margin: "0 auto" }}>
              Listen to Upper Vibe Media free anytime. Upgrade to Plus to download every song, save your favorite tracks, and keep the frequency with you offline.
            </p>
          </div>



          {/* Primary CTA — below headline */}
          <div className="w-full flex flex-col gap-3">
            <PremiumButton onClick={handleCheckout}>
              Unlock All Downloads — $4.99/mo
            </PremiumButton>

            {checkoutError && (
              <p className="text-xs text-center px-2" style={{ color: "rgba(255,100,100,0.85)" }}>{checkoutError}</p>
            )}

            {/* Login / Create Account for logged-out visitors */}
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => navigateToLogin(window.location.origin + "/start")}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-bold tracking-wide transition-all active:scale-[0.97]"
                style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.6)" }}>
                Log In
              </button>
              <button
                onClick={() => setAuthModal(true)}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-bold tracking-wide transition-all active:scale-[0.97]"
                style={{ background: "rgba(0,160,220,0.08)", border: "1px solid rgba(0,160,220,0.28)", color: "#00A0DC" }}>
                Create Account
              </button>
            </div>

            <Link to="/music"
              className="w-full flex items-center justify-center gap-2.5 py-3.5 rounded-2xl text-sm font-bold tracking-wide transition-all active:scale-[0.97]"
              style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.4)" }}>
              Listen Free — No Account Needed
            </Link>
          </div>
        </section>

        {/* ── UPPER VIBE CITY PREVIEW ── */}
        <DeferredMount minHeight={220} rootMargin="450px">
          <Suspense fallback={<div style={{ minHeight: 220 }} />}>
            <UpperVibeCityPreview variant="start" />
          </Suspense>
        </DeferredMount>

        {/* ── YOUTUBE CTA ── */}
        <DeferredMount minHeight={160} rootMargin="450px">
          <Suspense fallback={<div style={{ minHeight: 160 }} />}>
            <YouTubeCTA />
          </Suspense>
        </DeferredMount>

        {/* ── BENEFIT CARDS ── */}
        <section className="flex flex-col gap-3">
          <p className="text-[9px] font-black tracking-[0.3em] uppercase text-center" style={{ color: `rgba(${PRIMARY},0.6)` }}>
            What You Get with Plus
          </p>

          {[
            {
              icon: <Download className="w-5 h-5" style={{ color: "#00A0DC" }} />,
              title: "Unlimited Song Downloads",
              desc: "Download every Upper Vibe Media track with Plus.",
              accent: PRIMARY,
            },
            {
              icon: <Heart className="w-5 h-5" style={{ color: "#9B7EFF" }} />,
              title: "Build Your Vibe Library",
              desc: "Save your favorite 432 Hz songs and keep your personal frequency collection.",
              accent: "155,126,255",
            },
            {
              icon: <Zap className="w-5 h-5" style={{ color: "#F5A800" }} />,
              title: "Support Independent High-Vibe Music",
              desc: "Your membership helps Upper Vibe Media keep releasing new music, visualizers, and frequency-based content.",
              accent: GOLD,
            },
          ].map((card) => (
            <div key={card.title}
              className="flex gap-4 items-start p-4 rounded-2xl"
              style={{ background: `rgba(${card.accent},0.05)`, border: `1px solid rgba(${card.accent},0.15)` }}>
              <div className="flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center"
                style={{ background: `rgba(${card.accent},0.1)`, border: `1px solid rgba(${card.accent},0.2)` }}>
                {card.icon}
              </div>
              <div>
                <p className="text-sm font-bold text-white mb-0.5" style={{ fontFamily: "var(--font-heading)" }}>{card.title}</p>
                <p className="text-xs leading-relaxed" style={{ color: "rgba(255,255,255,0.42)" }}>{card.desc}</p>
              </div>
            </div>
          ))}
        </section>

        {/* ── FREE vs PLUS COMPARISON ── */}
        <section className="flex flex-col gap-4">
          <p className="text-[9px] font-black tracking-[0.3em] uppercase text-center" style={{ color: `rgba(${PRIMARY},0.6)` }}>
            Free vs Plus
          </p>

          <div className="grid grid-cols-2 gap-3">
            {/* Free */}
            <div className="rounded-2xl p-4 flex flex-col gap-3"
              style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
              <div>
                <p className="text-xs font-black text-white mb-0.5" style={{ fontFamily: "var(--font-heading)" }}>Free</p>
                <p className="text-[10px]" style={{ color: "rgba(255,255,255,0.3)" }}>Always free</p>
              </div>
              <div className="flex flex-col gap-2">
                {["Stream songs", "Listen to Live Radio", "Watch visualizers", "Explore latest music"].map((item) => (
                  <div key={item} className="flex items-start gap-2">
                    <Check className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" style={{ color: "rgba(255,255,255,0.4)" }} />
                    <span className="text-[11px] leading-tight" style={{ color: "rgba(255,255,255,0.45)" }}>{item}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Premium */}
            <div className="rounded-2xl p-4 flex flex-col gap-3 relative overflow-hidden"
              style={{ background: `rgba(${PRIMARY},0.07)`, border: `1px solid rgba(${PRIMARY},0.3)`, boxShadow: `0 0 24px rgba(${PRIMARY},0.1)` }}>
              {/* Glow */}
              <div className="absolute top-0 right-0 w-24 h-24 rounded-full blur-[40px] pointer-events-none"
                style={{ background: `rgba(${PRIMARY},0.15)` }} />
              <div className="relative z-10">
                <p className="text-xs font-black mb-0.5" style={{ color: "#00A0DC", fontFamily: "var(--font-heading)" }}>Plus</p>
                <p className="text-[10px] font-bold" style={{ color: `rgba(${PRIMARY},0.7)` }}>$4.99/month</p>
              </div>
              <div className="flex flex-col gap-2 relative z-10">
                {["Download all songs", "Save to My Vibe Library", "Offline listening", "Plus music drops", "Support UVM directly"].map((item) => (
                  <div key={item} className="flex items-start gap-2">
                    <Check className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" style={{ color: "#00A0DC" }} />
                    <span className="text-[11px] font-semibold leading-tight" style={{ color: "rgba(255,255,255,0.75)" }}>{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ── CONVERSION CTA ── */}
        <section className="flex flex-col items-center gap-4 py-6 px-5 rounded-3xl"
          style={{ background: `rgba(${PRIMARY},0.06)`, border: `1px solid rgba(${PRIMARY},0.18)` }}>
          <div className="text-center">
            <h2 style={{ fontFamily: "var(--font-heading)", fontSize: "1.25rem", fontWeight: 900, color: "#fff", marginBottom: "0.5rem" }}>
              Keep The Frequency With You
            </h2>
            <p className="text-sm" style={{ color: "rgba(255,255,255,0.42)", lineHeight: 1.6 }}>
              For only $4.99/month, unlock downloads for the full Upper Vibe Media catalog.
            </p>
          </div>
          <PremiumButton onClick={handleCheckout} style={{ background: "linear-gradient(135deg,#0090C8,#00B8D4)", color: "#000", boxShadow: "0 0 36px rgba(0,160,220,0.45)" }}>
            <Download className="w-4 h-4" />
            Start Plus — $4.99/month
          </PremiumButton>
          {checkoutError && (
            <p className="text-xs text-center" style={{ color: "rgba(255,100,100,0.85)" }}>{checkoutError}</p>
          )}
          <p className="text-[10px]" style={{ color: "rgba(255,255,255,0.2)" }}>Cancel anytime · Streaming always free</p>
        </section>

        {/* ── ALSO STREAMING ON ── */}
        <section className="flex flex-col items-center gap-4 text-center">
          <p className="text-[9px] font-black tracking-[0.3em] uppercase" style={{ color: "rgba(255,255,255,0.2)" }}>
            Also Streaming On
          </p>
          <StreamingPlatformLinks track={{}} mode="compact" />
          <p className="text-[10px]" style={{ color: "rgba(255,255,255,0.18)" }}>
            But the full Upper Vibe experience lives here.
          </p>
        </section>

        {/* ── DIVIDER ── */}
        <div className="w-full h-px" style={{ background: "rgba(255,255,255,0.07)" }} />

        {/* ── NAVIGATION BUTTONS ── */}
        <section className="flex flex-col gap-3">
          <p className="text-[9px] font-black tracking-[0.3em] uppercase text-center" style={{ color: "rgba(255,255,255,0.2)" }}>
            Explore Free
          </p>

          <Link to="/radio"
            className="w-full flex items-center justify-center gap-2.5 py-3.5 rounded-2xl text-sm font-black tracking-wide transition-all active:scale-[0.97]"
            style={{ background: "rgba(0,160,220,0.07)", border: "1px solid rgba(0,160,220,0.22)", color: "#00A0DC" }}>
            <Radio className="w-4 h-4" /> Try Live Radio
          </Link>

          <Link to="/music"
            className="w-full flex items-center justify-center gap-2.5 py-3.5 rounded-2xl text-sm font-black tracking-wide transition-all active:scale-[0.97]"
            style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.09)", color: "rgba(255,255,255,0.5)" }}>
            <Music4 className="w-4 h-4" /> Latest Music
          </Link>

          <Link to="/music"
            className="w-full flex items-center justify-center gap-2.5 py-3.5 rounded-2xl text-sm font-black tracking-wide transition-all active:scale-[0.97]"
            style={{ background: "rgba(155,126,255,0.07)", border: "1px solid rgba(155,126,255,0.22)", color: "#9B7EFF" }}>
            <Music4 className="w-4 h-4" /> Explore All Music
          </Link>

          <Link to="/visualizers"
            className="w-full flex items-center justify-center gap-2.5 py-3.5 rounded-2xl text-sm font-black tracking-wide transition-all active:scale-[0.97]"
            style={{ background: "rgba(245,168,0,0.05)", border: "1px solid rgba(245,168,0,0.2)", color: "#C89432" }}>
            <Tv2 className="w-4 h-4" /> Watch Visualizers
          </Link>

          {/* Email signup */}
          <div className="pt-1">
            {!submitted ? (
              <form onSubmit={handleEmailSubmit} className="flex flex-col gap-2">
                <p className="text-[10px] font-black tracking-[0.2em] uppercase text-center" style={{ color: "rgba(255,255,255,0.25)" }}>
                  <Mail className="w-3 h-3 inline mr-1 mb-0.5" />
                  Join the Email List
                </p>
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
          </div>
        </section>

        {/* Footer */}
        <div className="flex flex-col items-center gap-2">
          <Link to="/"
            className="text-sm font-bold transition-all"
            style={{ color: "rgba(0,160,220,0.6)" }}>
            Enter Full Site →
          </Link>
          <p className="text-[10px] text-center" style={{ color: "rgba(255,255,255,0.18)", letterSpacing: "0.05em" }}>
            © Upper Vibe Media · All rights reserved
          </p>
        </div>
      </div>

      <EmailCaptureModal page="start" hasInteracted={startInteracted} />

      {/* Auth choice modal — shown when logged-out user taps Plus CTA or Create Account */}
      <AuthChoiceModal
        open={authModal}
        onClose={() => setAuthModal(false)}
        onSignup={handleSignupForPlus}
        onLogin={handleLoginForPlus}
        onListenFree={() => { setAuthModal(false); navigate("/music"); }}
      />
    </div>
  );
}