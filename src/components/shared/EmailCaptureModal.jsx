import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Zap } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { trackEmailSignup } from "@/lib/analytics";

const SEEN_KEY = "uvm_email_popup_seen";
const COOLDOWN_KEY = "uvm_email_popup_dismissed_at";
const COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

function shouldShow() {
  try {
    if (localStorage.getItem(SEEN_KEY) === "signed_up") return false;
    const dismissed = parseInt(localStorage.getItem(COOLDOWN_KEY) || "0", 10);
    if (dismissed && Date.now() - dismissed < COOLDOWN_MS) return false;
  } catch {}
  return true;
}

/**
 * EmailCaptureModal
 *
 * page="home" triggers:
 *   - After 20s of music playing (pass isPlaying=true)
 *   - After 35s on page
 *   - After scrolling 50% of page height
 *
 * page="start" triggers:
 *   - After 45–60s on page (random in range)
 *   - After user clicks/interacts with something (pass hasInteracted=true)
 *   - After scrolling past 50% of page height
 *   - Never fires before 20s regardless of other signals
 */
export default function EmailCaptureModal({ page = "home", isPlaying = false, hasInteracted = false }) {
  const [visible, setVisible] = useState(false);
  const [email, setEmail]     = useState("");
  const [status, setStatus]   = useState("idle");
  const shownRef = useRef(false);
  const mountTime = useRef(Date.now());

  const show = () => {
    if (shownRef.current) return;
    if (!shouldShow()) return;
    shownRef.current = true;
    setVisible(true);
  };

  // ── Home page triggers ───────────────────────────────────────────────────
  useEffect(() => {
    if (page !== "home") return;

    // 35s page timer
    const timer35 = setTimeout(show, 35_000);

    // Scroll 50%
    const onScroll = () => {
      const scrolled = window.scrollY / (document.documentElement.scrollHeight - window.innerHeight);
      if (scrolled >= 0.5) show();
    };
    window.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      clearTimeout(timer35);
      window.removeEventListener("scroll", onScroll);
    };
  }, [page]); // eslint-disable-line react-hooks/exhaustive-deps

  // Home: music playing 20s
  useEffect(() => {
    if (page !== "home" || !isPlaying) return;
    const timer = setTimeout(show, 20_000);
    return () => clearTimeout(timer);
  }, [page, isPlaying]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Start page triggers ──────────────────────────────────────────────────
  useEffect(() => {
    if (page !== "start") return;

    // Random delay 45–60s, but never before 20s (enforced by min)
    const delay = 45_000 + Math.random() * 15_000;
    const timer = setTimeout(show, delay);

    // Scroll past 50%
    const onScroll = () => {
      const elapsed = Date.now() - mountTime.current;
      if (elapsed < 20_000) return; // minimum guard
      const scrolled = window.scrollY / (document.documentElement.scrollHeight - window.innerHeight);
      if (scrolled >= 0.5) show();
    };
    window.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      clearTimeout(timer);
      window.removeEventListener("scroll", onScroll);
    };
  }, [page]); // eslint-disable-line react-hooks/exhaustive-deps

  // Start: interaction signal (with 20s minimum guard)
  useEffect(() => {
    if (page !== "start" || !hasInteracted) return;
    const elapsed = Date.now() - mountTime.current;
    const minWait = Math.max(0, 20_000 - elapsed);
    const timer = setTimeout(show, minWait);
    return () => clearTimeout(timer);
  }, [page, hasInteracted]); // eslint-disable-line react-hooks/exhaustive-deps

  const dismiss = () => {
    try { localStorage.setItem(COOLDOWN_KEY, String(Date.now())); } catch {}
    setVisible(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !email.includes("@")) return;
    setStatus("loading");
    try {
      const existing = await base44.entities.EmailSubscriber.filter({ email: email.toLowerCase().trim() }, "-created_date", 1);
      if (existing.length > 0) {
        setStatus("duplicate");
        return;
      }
      await base44.entities.EmailSubscriber.create({
        email: email.toLowerCase().trim(),
        source_page: window.location.pathname,
        user_agent: navigator.userAgent.slice(0, 200),
        referrer: document.referrer || "",
        subscribed_status: "active",
      });
      trackEmailSignup();
      setStatus("success");
      try { localStorage.setItem(SEEN_KEY, "signed_up"); } catch {}
      setTimeout(() => setVisible(false), 2500);
    } catch {
      setStatus("error");
    }
  };

  return (
    <AnimatePresence>
      {visible && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={dismiss}
            className="fixed inset-0 z-[200] bg-black/70 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 24 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 24 }}
            transition={{ type: "spring", damping: 28, stiffness: 220 }}
            className="fixed inset-0 z-[201] flex items-center justify-center px-4 pointer-events-none"
          >
            <div
              className="pointer-events-auto relative w-full max-w-md rounded-3xl overflow-hidden"
              style={{
                background: "linear-gradient(160deg, rgba(8,8,22,0.99) 0%, rgba(4,4,14,1) 100%)",
                border: "1px solid rgba(0,229,255,0.18)",
                boxShadow: "0 0 80px rgba(0,184,212,0.12), 0 0 0 1px rgba(0,229,255,0.06), 0 24px 64px rgba(0,0,0,0.8)",
              }}
            >
              <div className="absolute top-0 left-0 right-0 h-[1px]"
                style={{ background: "linear-gradient(90deg, transparent 5%, rgba(0,229,255,0.6) 50%, transparent 95%)" }} />
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-32 rounded-full pointer-events-none"
                style={{ background: "radial-gradient(ellipse, rgba(0,200,220,0.07) 0%, transparent 70%)" }} />

              {/* Close — large tap target */}
              <button
                onClick={dismiss}
                className="absolute top-3 right-3 w-10 h-10 rounded-full flex items-center justify-center transition-all hover:bg-white/10 z-10"
                style={{ border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.4)" }}
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="px-8 pt-10 pb-8">
                <div className="flex justify-center mb-6">
                  <div className="flex items-center gap-2 px-4 py-1.5 rounded-full"
                    style={{ background: "rgba(0,200,220,0.07)", border: "1px solid rgba(0,200,220,0.2)" }}>
                    <Zap className="w-3 h-3" style={{ color: "#00C9E0" }} />
                    <span className="text-[10px] font-black tracking-[0.35em] uppercase" style={{ color: "#00C9E0" }}>
                      Upper Vibe List
                    </span>
                  </div>
                </div>

                <h2 className="font-heading font-black text-center text-white mb-3 leading-tight"
                  style={{ fontSize: "clamp(1.5rem, 5vw, 1.9rem)" }}>
                  Join the Upper Vibe List
                </h2>
                <p className="text-center text-white/45 text-sm leading-relaxed mb-8 max-w-xs mx-auto">
                  Get new 432 Hz music, visualizers, exclusive drops, and high-vibe updates straight to your inbox
                </p>

                {status === "success" ? (
                  <div className="text-center py-4">
                    <div className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl mb-2"
                      style={{ background: "rgba(0,200,220,0.1)", border: "1px solid rgba(0,200,220,0.25)" }}>
                      <span className="text-lg">🔒</span>
                      <span className="font-heading font-black text-white tracking-wide">You're locked in</span>
                    </div>
                    <p className="text-white/30 text-xs mt-2">Welcome to the Upper Vibe List</p>
                  </div>
                ) : status === "duplicate" ? (
                  <div className="text-center py-4">
                    <div className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl mb-2"
                      style={{ background: "rgba(212,168,67,0.1)", border: "1px solid rgba(212,168,67,0.25)" }}>
                      <span className="text-lg">✅</span>
                      <span className="font-heading font-black text-secondary tracking-wide">You're already on the list</span>
                    </div>
                    <button onClick={dismiss} className="text-white/30 text-xs mt-3 hover:text-white/50 transition-colors block mx-auto">
                      Close
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-3">
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Enter your email"
                      required
                      className="w-full px-5 py-4 rounded-2xl text-sm text-white placeholder-white/25 outline-none transition-all"
                      style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}
                      onFocus={(e) => { e.target.style.border = "1px solid rgba(0,229,255,0.35)"; e.target.style.background = "rgba(0,200,220,0.04)"; }}
                      onBlur={(e)  => { e.target.style.border = "1px solid rgba(255,255,255,0.1)";  e.target.style.background = "rgba(255,255,255,0.05)"; }}
                    />
                    <button
                      type="submit"
                      disabled={status === "loading"}
                      className="w-full py-4 rounded-2xl font-heading font-black text-sm tracking-widest uppercase transition-all hover:brightness-110 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-60"
                      style={{ background: "linear-gradient(135deg, #00A8C0 0%, #00D4EE 50%, #D4A843 100%)", color: "#000", boxShadow: "0 0 30px rgba(0,200,220,0.2)" }}
                    >
                      {status === "loading" ? "Joining..." : "Join The Vibe"}
                    </button>
                    {status === "error" && (
                      <p className="text-red-400/70 text-xs text-center">Something went wrong. Try again.</p>
                    )}
                  </form>
                )}

                {status !== "success" && status !== "duplicate" && (
                  <button onClick={dismiss}
                    className="w-full text-center text-white/20 text-xs mt-5 hover:text-white/40 transition-colors">
                    Maybe later
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}