import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Radio, Music4, Tv2, Mail, CheckCircle2, Download, Heart, Zap, Check, X, Crown, Library, MessageCircle } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import FeaturedTrackPlayer from "@/components/start/FeaturedTrackPlayer";
import MusicStack from "@/components/start/MusicStack";
import YouTubeCTA from "@/components/start/YouTubeCTA";

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
  const [stackTracks, setStackTracks] = useState([]);
  const [featuredTrackId, setFeaturedTrackId] = useState(null);
  const navigate = useNavigate();
  const { isAuthenticated, isLoadingAuth, isPlus, isAdmin, hasPreviouslyLoggedIn, navigateToLogin } = useAuth();

  // Load next tracks for the music stack — newest published, excluding the featured track
  useEffect(() => {
    base44.entities.Track.filter({ status: "published" }, "-release_date", 20).then((all) => {
      const withAudio = all.filter((t) => t.audio_url && t.id !== featuredTrackId);
      setStackTracks(withAudio.slice(0, 4));
    }).catch(() => {});
  }, [featuredTrackId]);

  // Routing: redirect based on auth + membership status (all hooks run first)
  useEffect(() => {
    if (isLoadingAuth) return;
    if (!isAuthenticated) return; // logged-out visitors stay on /start
    if (isAdmin) return;          // admins can preview /start freely
    if (isPlus) { navigate("/my-vibes", { replace: true }); return; }
    // Free logged-in users → send to music, not the sales page
    navigate("/music", { replace: true });
  }, [isAuthenticated, isLoadingAuth, isPlus, isAdmin, navigate]);

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

  // Show loading while auth resolves, or while redirecting authenticated users
  if (isLoadingAuth || (isAuthenticated && !isAdmin)) {
    return (
      <div className="min-h-screen flex items-center justify-center"
        style={{ background: "linear-gradient(160deg,#06060f 0%,#090914 55%,#04040d 100%)" }}>
        <div className="w-6 h-6 border-2 border-cyan-400/20 border-t-cyan-400 rounded-full animate-spin" />
      </div>
    );
  }

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
      {/* Static ambient glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 0 }}>
        <div className="absolute top-[-100px] left-1/2 -translate-x-1/2 w-[500px] h-[400px] rounded-full blur-[180px]"
          style={{ background: "rgba(0,144,200,0.06)" }} />
        <div className="absolute bottom-[-60px] right-[-30px] w-[280px] h-[280px] rounded-full blur-[130px]"
          style={{ background: "rgba(212,168,67,0.04)" }} />
      </div>

      <div className="relative z-10 w-full max-w-md px-5 pb-16 pt-10 flex flex-col gap-10">

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

          {/* Featured Track Player */}
          <FeaturedTrackPlayer onTrackLoaded={(t) => setFeaturedTrackId(t.id)} />

          {/* Small song cards — directly under the player */}
          {stackTracks.length > 0 && <MusicStack tracks={stackTracks} />}

          {/* Headline */}
          <div>
            <h1 style={{ fontFamily: "var(--font-heading)", fontSize: "clamp(1.45rem, 6vw, 2rem)", fontWeight: 900, lineHeight: 1.15, color: "#fff", marginBottom: "0.6rem" }}>
              Stream Free.<br />
              <span style={{ color: "#00A0DC" }}>Download Everything</span> for $4.99/month.
            </h1>
            <p style={{ fontSize: "0.875rem", lineHeight: 1.65, color: "rgba(255,255,255,0.45)", maxWidth: "24rem", margin: "0 auto" }}>
              Listen to Upper Vibe Media free anytime. Upgrade to Premium to download every song, save your favorite tracks, and keep the frequency with you offline.
            </p>
          </div>

          {/* Returning visitor hint — only shown when localStorage flag is set */}
          {hasPreviouslyLoggedIn && (
            <div className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl"
              style={{ background: "rgba(0,160,220,0.06)", border: "1px solid rgba(0,160,220,0.2)" }}>
              <span className="text-sm" style={{ color: "rgba(0,160,220,0.9)" }}>👋</span>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold" style={{ color: "rgba(255,255,255,0.7)" }}>Welcome back</p>
                <p className="text-[11px]" style={{ color: "rgba(255,255,255,0.35)" }}>Log in to open your library</p>
              </div>
              <button
                onClick={() => navigateToLogin(`${window.location.origin}/my-vibes`)}
                className="flex-shrink-0 px-3 py-1.5 rounded-xl text-xs font-black transition-all active:scale-[0.97]"
                style={{ background: "rgba(0,160,220,0.15)", border: "1px solid rgba(0,160,220,0.35)", color: "#00A0DC" }}>
                Log In
              </button>
            </div>
          )}

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
                onClick={() => navigateToLogin(`${window.location.origin}/music`)}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-bold tracking-wide transition-all active:scale-[0.97]"
                style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.6)" }}>
                Log In
              </button>
              <button
                onClick={() => navigateToLogin(`${window.location.origin}/music`)}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-bold tracking-wide transition-all active:scale-[0.97]"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.45)" }}>
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

        {/* ── YOUTUBE CTA ── */}
        <YouTubeCTA />

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

        {/* ── FREE vs PREMIUM COMPARISON ── */}
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

          <Link to="/vibe-room"
            className="w-full flex items-center justify-center gap-2.5 py-3.5 rounded-2xl text-sm font-black tracking-wide transition-all active:scale-[0.97]"
            style={{ background: "rgba(155,126,255,0.07)", border: "1px solid rgba(155,126,255,0.22)", color: "#9B7EFF" }}>
            <MessageCircle className="w-4 h-4" /> Vibe Room — Live Chat
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
    </div>
  );
}