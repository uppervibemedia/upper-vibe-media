import React, { useState } from "react";
import { motion } from "framer-motion";
import { Crown, Check, X, Zap, Star, Waves, Download, Radio, Heart, GraduationCap, Lock } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { base44 } from "@/api/base44Client";

const FREE_FEATURES = [
  { ok: true,  text: "Stream all 432 Hz songs" },
  { ok: true,  text: "Upper Vibe Radio" },
  { ok: true,  text: "Browse artists" },
  { ok: true,  text: "Watch free visualizers" },
  { ok: true,  text: "Create a free account" },
  { ok: true,  text: "Save songs to My Vibe Library" },
  { ok: false, text: "Download songs" },
  { ok: false, text: "Save music offline" },
  { ok: false, text: "Premium downloadable releases" },
];

const PREMIUM_FEATURES = [
  { ok: true, text: "Everything in Free Listener" },
  { ok: true, text: "Download every available song" },
  { ok: true, text: "Save 432 Hz music offline" },
  { ok: true, text: "Download new releases" },
  { ok: true, text: "Access premium download buttons" },
  { ok: true, text: "Download from My Vibe Library" },
  { ok: true, text: "Support Upper Vibe Media" },
];

const PLUS_FEATURES = [
  { ok: true, text: "Everything in Premium Downloads" },
  { ok: true, text: "Download exclusive music packs" },
  { ok: true, text: "Download extended 432 Hz sessions" },
  { ok: true, soon: true, text: "Member-only visualizers" },
  { ok: true, text: "Early access to new releases" },
  { ok: true, text: "Bonus unreleased songs" },
  { ok: true, soon: true, text: "Priority Upper Vibe Academy access" },
];

export default function Membership() {
  const { user, isAuthenticated, navigateToLogin } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(null);

  const isAdmin = user?.role === "admin";
  const isPlus = isAdmin || user?.isPlus === true || user?.tier === "plus";
  const isPremium = isAdmin || isPlus || user?.isPremium === true || user?.role === "premium" || user?.tier === "premium";

  const currentPlan = isAdmin ? "admin" : isPlus ? "plus" : isPremium ? "premium" : "free";

  const handleCheckout = async (plan) => {
    if (!isAuthenticated) {
      navigateToLogin();
      return;
    }
    // Block checkout in iframe (Base44 preview)
    if (window.self !== window.top) {
      alert("Checkout is only available from the published app. Please open the app in a new tab.");
      return;
    }
    setLoading(plan);
    try {
      const res = await base44.functions.invoke("stripeCheckout", {
        plan,
        successUrl: `${window.location.origin}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
        cancelUrl: `${window.location.origin}/payment-cancelled`,
      });
      if (res.data?.url) {
        window.location.href = res.data.url;
      }
    } catch (err) {
      console.error(err);
      alert("Something went wrong. Please try again.");
    }
    setLoading(null);
  };

  const handlePortal = async () => {
    if (window.self !== window.top) {
      alert("The billing portal is only available from the published app.");
      return;
    }
    setLoading("portal");
    try {
      const res = await base44.functions.invoke("stripePortal", {
        returnUrl: `${window.location.origin}/account`,
      });
      if (res.data?.url) window.location.href = res.data.url;
    } catch (err) {
      alert("Could not open billing portal. Please try again.");
    }
    setLoading(null);
  };

  return (
    <div className="min-h-screen pb-28 lg:pb-16 pt-20 lg:pt-14">
      <div className="max-w-5xl mx-auto px-6">

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full mb-6"
            style={{ background: "rgba(0,200,220,0.06)", border: "1px solid rgba(0,200,220,0.18)" }}>
            <Waves className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-[10px] font-black tracking-[0.35em] uppercase text-cyan-400">Upper Vibe Media</span>
          </div>
          <h1 className="font-heading font-black text-white leading-tight mb-4"
            style={{ fontSize: "clamp(2rem,5vw,3.2rem)" }}>
            Choose Your Vibe Access
          </h1>
          <p className="text-white/40 text-base leading-relaxed max-w-xl mx-auto">
            Stream every 432 Hz song for free. Upgrade when you're ready to download music and unlock premium Upper Vibe Media access.
          </p>

          {/* Already on a plan? */}
          {isPremium && !isAdmin && (
            <div className="mt-6 inline-flex items-center gap-3 px-5 py-2.5 rounded-2xl"
              style={{ background: "rgba(212,168,67,0.08)", border: "1px solid rgba(212,168,67,0.25)" }}>
              <Crown className="w-4 h-4 text-yellow-400" />
              <span className="text-sm font-bold text-yellow-400">
                You're on {isPlus ? "Upper Vibe Plus" : "Premium Downloads"}
              </span>
              <button onClick={handlePortal} disabled={loading === "portal"}
                className="text-[11px] font-black tracking-wide text-white/50 hover:text-white/90 transition-colors ml-2 underline underline-offset-2">
                {loading === "portal" ? "Opening..." : "Manage Subscription"}
              </button>
            </div>
          )}
        </motion.div>

        {/* Pricing cards */}
        <div className="grid md:grid-cols-3 gap-5 mb-12">

          {/* ── FREE ── */}
          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}
            className="rounded-3xl p-6 flex flex-col"
            style={{ background: "rgba(255,255,255,0.025)", border: `1px solid ${currentPlan === "free" ? "rgba(0,200,220,0.35)" : "rgba(255,255,255,0.07)"}` }}>
            {currentPlan === "free" && (
              <div className="text-[9px] font-black tracking-[0.3em] uppercase text-cyan-400 mb-3">Current Plan</div>
            )}
            <p className="text-[10px] font-black tracking-[0.3em] uppercase text-white/35 mb-2">Free Listener</p>
            <div className="flex items-end gap-1 mb-6">
              <span className="font-heading font-black text-4xl text-white">$0</span>
              <span className="text-white/30 text-sm mb-1">/month</span>
            </div>
            <ul className="space-y-2.5 mb-8 flex-1">
              {FREE_FEATURES.map((f) => (
                <li key={f.text} className="flex items-center gap-2.5 text-sm">
                  {f.ok
                    ? <Check className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0" />
                    : <X className="w-3.5 h-3.5 text-white/18 flex-shrink-0" />}
                  <span className={f.ok ? "text-white/60" : "text-white/22"}>{f.text}</span>
                </li>
              ))}
            </ul>
            {currentPlan === "free" ? (
              <div className="w-full py-3 rounded-2xl text-center text-sm font-black text-white/25"
                style={{ border: "1px solid rgba(255,255,255,0.08)" }}>
                Current Plan
              </div>
            ) : (
              <Link to="/music"
                className="w-full py-3 rounded-2xl text-center text-sm font-black text-white/50 hover:text-white/80 transition-colors"
                style={{ border: "1px solid rgba(255,255,255,0.08)" }}>
                Start Free
              </Link>
            )}
          </motion.div>

          {/* ── PREMIUM DOWNLOADS (recommended) ── */}
          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.14 }}
            className="rounded-3xl p-6 flex flex-col relative overflow-hidden md:-mt-3 md:mb-0"
            style={{
              background: "linear-gradient(160deg,rgba(212,168,67,0.1),rgba(212,168,67,0.04),rgba(0,0,0,0.2))",
              border: `1px solid ${currentPlan === "premium" ? "rgba(212,168,67,0.6)" : "rgba(212,168,67,0.3)"}`,
              boxShadow: "0 0 40px rgba(212,168,67,0.08)",
            }}>
            {/* Glow */}
            <div className="absolute top-0 right-0 w-48 h-48 rounded-full blur-[90px] opacity-15 pointer-events-none"
              style={{ background: "#D4A843" }} />

            {/* Badge */}
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full self-start mb-4"
              style={{ background: "rgba(212,168,67,0.15)", border: "1px solid rgba(212,168,67,0.4)" }}>
              <Star className="w-3 h-3 text-yellow-400 fill-current" />
              <span className="text-[9px] font-black tracking-[0.3em] uppercase text-yellow-400">Best For Downloads</span>
            </div>

            <p className="text-[10px] font-black tracking-[0.3em] uppercase text-yellow-400 mb-2">Premium Downloads</p>
            <div className="flex items-end gap-1 mb-6">
              <span className="font-heading font-black text-4xl text-white">$4.99</span>
              <span className="text-white/40 text-sm mb-1">/month</span>
            </div>
            <ul className="space-y-2.5 mb-8 flex-1">
              {PREMIUM_FEATURES.map((f) => (
                <li key={f.text} className="flex items-center gap-2.5 text-sm">
                  <Check className="w-3.5 h-3.5 text-yellow-400 flex-shrink-0" />
                  <span className="text-white/70">{f.text}</span>
                </li>
              ))}
            </ul>
            {currentPlan === "premium" ? (
              <div>
                <div className="w-full py-3 rounded-2xl text-center text-sm font-black text-yellow-400/60 mb-2"
                  style={{ border: "1px solid rgba(212,168,67,0.25)" }}>Current Plan</div>
                <button onClick={handlePortal} disabled={loading === "portal"}
                  className="w-full py-2.5 rounded-2xl text-sm font-bold text-white/40 hover:text-white/70 transition-colors"
                  style={{ border: "1px solid rgba(255,255,255,0.07)" }}>
                  {loading === "portal" ? "Opening..." : "Manage Subscription"}
                </button>
              </div>
            ) : currentPlan === "free" ? (
              <button onClick={() => handleCheckout("premium")} disabled={!!loading}
                className="w-full py-3.5 rounded-2xl font-black text-sm tracking-wider transition-all hover:brightness-110 active:scale-[0.98] disabled:opacity-60"
                style={{ background: "linear-gradient(135deg,#D4A843,#F0C060)", color: "#000" }}>
                {loading === "premium" ? "Redirecting..." : "Upgrade To Premium"}
              </button>
            ) : null}
          </motion.div>

          {/* ── UPPER VIBE PLUS ── */}
          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
            className="rounded-3xl p-6 flex flex-col relative overflow-hidden"
            style={{
              background: "linear-gradient(160deg,rgba(155,126,255,0.08),rgba(155,126,255,0.03),rgba(0,0,0,0.2))",
              border: `1px solid ${currentPlan === "plus" ? "rgba(155,126,255,0.6)" : "rgba(155,126,255,0.2)"}`,
            }}>
            {/* Glow */}
            <div className="absolute top-0 right-0 w-40 h-40 rounded-full blur-[80px] opacity-15 pointer-events-none"
              style={{ background: "#9B7EFF" }} />

            {/* Badge */}
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full self-start mb-4"
              style={{ background: "rgba(155,126,255,0.12)", border: "1px solid rgba(155,126,255,0.3)" }}>
              <Zap className="w-3 h-3 text-purple-400 fill-current" />
              <span className="text-[9px] font-black tracking-[0.3em] uppercase text-purple-400">Best Value</span>
            </div>

            <p className="text-[10px] font-black tracking-[0.3em] uppercase text-purple-400 mb-2">Upper Vibe Plus</p>
            <div className="flex items-end gap-1 mb-6">
              <span className="font-heading font-black text-4xl text-white">$9.99</span>
              <span className="text-white/40 text-sm mb-1">/month</span>
            </div>
            <ul className="space-y-2.5 mb-8 flex-1">
              {PLUS_FEATURES.map((f) => (
                <li key={f.text} className="flex items-center gap-2.5 text-sm">
                  <Check className="w-3.5 h-3.5 text-purple-400 flex-shrink-0" />
                  <span className={f.soon ? "text-white/35 flex items-center gap-1.5" : "text-white/70"}>
                    {f.text}
                    {f.soon && <span className="text-[9px] font-black tracking-wider px-1.5 py-0.5 rounded-full"
                      style={{ background: "rgba(155,126,255,0.15)", color: "#9B7EFF" }}>SOON</span>}
                  </span>
                </li>
              ))}
            </ul>
            {currentPlan === "plus" ? (
              <div>
                <div className="w-full py-3 rounded-2xl text-center text-sm font-black text-purple-400/60 mb-2"
                  style={{ border: "1px solid rgba(155,126,255,0.2)" }}>Current Plan</div>
                <button onClick={handlePortal} disabled={loading === "portal"}
                  className="w-full py-2.5 rounded-2xl text-sm font-bold text-white/40 hover:text-white/70 transition-colors"
                  style={{ border: "1px solid rgba(255,255,255,0.07)" }}>
                  {loading === "portal" ? "Opening..." : "Manage Subscription"}
                </button>
              </div>
            ) : (currentPlan === "free" || currentPlan === "premium") ? (
              <button onClick={() => handleCheckout("plus")} disabled={!!loading}
                className="w-full py-3.5 rounded-2xl font-black text-sm tracking-wider transition-all hover:brightness-110 active:scale-[0.98] disabled:opacity-60"
                style={{ background: "linear-gradient(135deg,#7B5FCC,#9B7EFF)", color: "#fff" }}>
                {loading === "plus" ? "Redirecting..." : "Go Plus"}
              </button>
            ) : null}
          </motion.div>
        </div>

        {/* Bottom note */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
          className="text-center space-y-2">
          <p className="text-xs text-white/20">All plans include free streaming. Cancel anytime from your billing portal.</p>
          <p className="text-xs text-white/15">Payments securely handled by Stripe.</p>
        </motion.div>
      </div>
    </div>
  );
}