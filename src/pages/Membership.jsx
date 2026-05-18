import React, { useState } from "react";
import { motion } from "framer-motion";
import { Check, X, Crown, Waves, Download, Lock } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { base44 } from "@/api/base44Client";

const FREE_FEATURES = [
  { ok: true,  text: "Stream every 432 Hz song" },
  { ok: true,  text: "Upper Vibe Radio" },
  { ok: true,  text: "Watch free visualizers" },
  { ok: true,  text: "Browse artists" },
  { ok: true,  text: "Create a free account" },
  { ok: true,  text: "Save songs to My Vibe Library" },
  { ok: false, text: "Downloads locked" },
];

const PREMIUM_FEATURES = [
  { ok: true, text: "Everything in Free Listener" },
  { ok: true, text: "Download every available song" },
  { ok: true, text: "Save 432 Hz music offline" },
  { ok: true, text: "Download from My Vibe Library" },
  { ok: true, text: "Access new downloadable releases" },
  { ok: true, text: "Support Upper Vibe Media" },
];

export default function Membership() {
  const { user, isAuthenticated, navigateToLogin } = useAuth();
  const [loading, setLoading] = useState(false);

  const isAdmin = user?.role === "admin";
  const isPremium = isAdmin || user?.isPremium === true || user?.role === "premium" || user?.tier === "premium" || user?.tier === "plus";
  const currentPlan = isPremium ? "premium" : "free";

  const handlePortal = async () => {
    if (window.self !== window.top) {
      alert("The billing portal is only available from the published app.");
      return;
    }
    setLoading(true);
    try {
      const res = await base44.functions.invoke("stripePortal", {
        returnUrl: `${window.location.origin}/account`,
      });
      if (res.data?.url) window.location.href = res.data.url;
    } catch {
      alert("Could not open billing portal. Please try again.");
    }
    setLoading(false);
  };

  const handleCheckout = async () => {
    if (!isAuthenticated) { navigateToLogin(); return; }
    if (window.self !== window.top) {
      alert("Checkout is only available from the published app.");
      return;
    }
    setLoading(true);
    try {
      const res = await base44.functions.invoke("stripeCheckout", {
        plan: "premium",
        successUrl: `${window.location.origin}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
        cancelUrl: `${window.location.origin}/payment-cancelled`,
      });
      if (res.data?.url) window.location.href = res.data.url;
    } catch {
      alert("Something went wrong. Please try again.");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen pb-28 lg:pb-16">
      {/* ── Background ── */}
      <div className="fixed inset-0 pointer-events-none -z-10">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] blur-[160px] opacity-[0.04]"
          style={{ background: "radial-gradient(ellipse,#D4A843,transparent)" }} />
      </div>

      <div className="max-w-3xl mx-auto px-6 pt-28 lg:pt-20">

        {/* ── Header ── */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
          className="text-center mb-14">

          {/* Eyebrow */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full mb-7"
            style={{ background: "rgba(0,200,220,0.06)", border: "1px solid rgba(0,200,220,0.18)" }}>
            <Waves className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-[10px] font-black tracking-[0.35em] uppercase text-cyan-400">Upper Vibe Media</span>
          </div>

          <h1 className="font-heading font-black text-white mb-5"
            style={{ fontSize: "clamp(2rem, 4.5vw, 3rem)", lineHeight: 1.1, letterSpacing: "-0.01em" }}>
            Choose Your Access
          </h1>

          <p className="text-white/45 leading-relaxed mx-auto"
            style={{ fontSize: "clamp(0.9rem, 1.4vw, 1.05rem)", maxWidth: "30rem" }}>
            Stream every 432 Hz song for free. Upgrade when you want to download and save Upper Vibe Media tracks offline.
          </p>

          {/* Active plan badge */}
          {isPremium && !isAdmin && (
            <div className="mt-7 inline-flex items-center gap-2.5 px-4 py-2 rounded-full"
              style={{ background: "rgba(212,168,67,0.08)", border: "1px solid rgba(212,168,67,0.28)" }}>
              <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 animate-pulse" />
              <span className="text-[11px] font-black tracking-[0.25em] uppercase text-yellow-400">Premium Active</span>
              <button onClick={handlePortal} disabled={loading}
                className="text-[11px] font-bold text-white/40 hover:text-white/80 transition-colors ml-1 underline underline-offset-2">
                {loading ? "Opening..." : "Manage"}
              </button>
            </div>
          )}
        </motion.div>

        {/* ── Cards ── */}
        <div className="grid md:grid-cols-2 gap-5 mb-12">

          {/* ── FREE ── */}
          <motion.div
            initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className="rounded-3xl p-7 flex flex-col"
            style={{
              background: "rgba(255,255,255,0.025)",
              border: `1px solid ${currentPlan === "free" && !isPremium ? "rgba(0,200,220,0.4)" : "rgba(255,255,255,0.08)"}`,
            }}>

            {currentPlan === "free" && !isPremium && (
              <span className="text-[9px] font-black tracking-[0.3em] uppercase text-cyan-400 mb-3">Current Plan</span>
            )}

            <div className="mb-6">
              <p className="text-[10px] font-black tracking-[0.3em] uppercase text-white/35 mb-3">Free Listener</p>
              <div className="flex items-end gap-1.5 mb-2">
                <span className="font-heading font-black text-white" style={{ fontSize: "2.8rem", lineHeight: 1 }}>$0</span>
                <span className="text-white/30 text-sm mb-1.5">/month</span>
              </div>
              <p className="text-sm font-semibold text-cyan-400/80">Stream all songs free</p>
            </div>

            <ul className="space-y-3 mb-8 flex-1">
              {FREE_FEATURES.map((f) => (
                <li key={f.text} className="flex items-center gap-3 text-sm">
                  {f.ok
                    ? <Check className="w-4 h-4 text-cyan-400 flex-shrink-0" />
                    : <Lock className="w-4 h-4 text-white/20 flex-shrink-0" />}
                  <span className={f.ok ? "text-white/65" : "text-white/25"}>{f.text}</span>
                </li>
              ))}
            </ul>

            {currentPlan === "free" && !isPremium ? (
              <div className="w-full py-3.5 rounded-2xl text-center text-sm font-black text-white/30"
                style={{ border: "1px solid rgba(255,255,255,0.08)" }}>
                Current Plan
              </div>
            ) : (
              <Link to="/music"
                className="w-full py-3.5 rounded-2xl text-center text-sm font-black text-white/55 hover:text-white/80 transition-colors"
                style={{ border: "1px solid rgba(255,255,255,0.1)" }}>
                Start Free
              </Link>
            )}
          </motion.div>

          {/* ── PREMIUM (featured) ── */}
          <motion.div
            initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.18 }}
            className="rounded-3xl p-7 flex flex-col relative overflow-hidden"
            style={{
              background: "linear-gradient(155deg,rgba(24,18,6,0.95),rgba(16,12,4,0.98))",
              border: "1px solid rgba(212,168,67,0.45)",
              boxShadow: "0 0 50px rgba(212,168,67,0.07), 0 0 0 1px rgba(212,168,67,0.08)",
            }}>

            {/* Ambient glow */}
            <div className="absolute top-0 right-0 w-56 h-48 rounded-full blur-[90px] opacity-20 pointer-events-none"
              style={{ background: "radial-gradient(circle,#D4A843,transparent)" }} />
            <div className="absolute bottom-0 left-0 w-40 h-40 rounded-full blur-[70px] opacity-10 pointer-events-none"
              style={{ background: "radial-gradient(circle,#C08830,transparent)" }} />

            {/* Most Popular badge */}
            <div className="relative flex items-center justify-between mb-5">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[9px] font-black tracking-[0.28em] uppercase"
                style={{ background: "linear-gradient(135deg,rgba(212,168,67,0.25),rgba(212,168,67,0.12))", border: "1px solid rgba(212,168,67,0.4)", color: "#EDB84A" }}>
                <Crown className="w-2.5 h-2.5" /> Most Popular
              </span>
              {currentPlan === "premium" && (
                <span className="text-[9px] font-black tracking-[0.3em] uppercase text-yellow-400/70">Current Plan</span>
              )}
            </div>

            <div className="relative mb-6">
              <p className="text-[10px] font-black tracking-[0.3em] uppercase text-yellow-500/80 mb-3">Premium Downloads</p>
              <div className="flex items-end gap-1.5 mb-2">
                <span className="font-heading font-black text-white" style={{ fontSize: "2.8rem", lineHeight: 1 }}>$4.99</span>
                <span className="text-white/35 text-sm mb-1.5">/month</span>
              </div>
              <p className="text-sm font-semibold" style={{ color: "rgba(237,184,74,0.85)" }}>Download every song</p>
            </div>

            <ul className="relative space-y-3 mb-8 flex-1">
              {PREMIUM_FEATURES.map((f) => (
                <li key={f.text} className="flex items-center gap-3 text-sm">
                  <Check className="w-4 h-4 text-yellow-400 flex-shrink-0" />
                  <span className="text-white/75">{f.text}</span>
                </li>
              ))}
            </ul>

            <div className="relative">
              {currentPlan === "premium" ? (
                <div className="space-y-2.5">
                  <div className="w-full py-3.5 rounded-2xl text-center text-sm font-black text-yellow-400/50"
                    style={{ border: "1px solid rgba(212,168,67,0.2)" }}>
                    Current Plan
                  </div>
                  <button onClick={handlePortal} disabled={loading}
                    className="w-full py-3 rounded-2xl text-sm font-bold text-white/40 hover:text-white/70 transition-colors"
                    style={{ border: "1px solid rgba(255,255,255,0.07)" }}>
                    {loading ? "Opening..." : "Manage Subscription"}
                  </button>
                </div>
              ) : (
                <button onClick={handleCheckout} disabled={loading}
                  className="w-full py-4 rounded-2xl font-black text-sm tracking-wider transition-all hover:brightness-110 active:scale-[0.98] disabled:opacity-60"
                  style={{
                    background: "linear-gradient(135deg,#C8892A,#EDB84A,#C8892A)",
                    backgroundSize: "200% 100%",
                    color: "#000",
                    boxShadow: "0 4px 24px rgba(212,168,67,0.28), 0 1px 0 rgba(255,220,100,0.3) inset",
                    letterSpacing: "0.06em",
                  }}>
                  {loading ? "Redirecting..." : "Upgrade To Premium"}
                </button>
              )}
            </div>
          </motion.div>
        </div>

        {/* Bottom note */}
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.35 }}
          className="text-center text-xs text-white/20 pb-4">
          All plans include free streaming. Premium downloads can be managed through your account.
        </motion.p>

      </div>
    </div>
  );
}