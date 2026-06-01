import React, { useState } from "react";
import { motion } from "framer-motion";
import { Check, Lock, Crown, Waves } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { base44 } from "@/api/base44Client";

const FREE_FEATURES = [
  { ok: true,  text: "Stream every 432 Hz song" },
  { ok: true,  text: "Upper Vibe Radio" },
  { ok: true,  text: "Watch free visualizers" },
  { ok: true,  text: "Browse artists" },
  { ok: false, text: "My Vibe Library" },
  { ok: false, text: "Plus downloads" },
  { ok: false, text: "Full Academy videos" },
];

const PLUS_FEATURES = [
  { ok: true, text: "Everything in Free Listener" },
  { ok: true, text: "Build your My Vibe Library" },
  { ok: true, text: "Download available songs for offline listening" },
  { ok: true, text: "Watch full Upper Vibe Academy videos" },
  { ok: true, text: "Support Upper Vibe Media" },
];

export default function Membership() {
  const { user, isAuthenticated, navigateToLogin } = useAuth();
  const [billing, setBilling] = useState("monthly"); // "monthly" | "yearly"
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const isAdmin = user?.role === "admin";
  const isPlus = isAdmin || user?.isPlus === true || user?.tier === "plus" || user?.tier === "premium" || user?.isPremium === true || user?.role === "premium";
  const currentPlan = isPlus ? "plus" : "free";

  const handlePortal = async () => {
    if (window.self !== window.top) { setError("The billing portal is only available from the published app."); return; }
    setError("");
    setLoading(true);
    try {
      const res = await base44.functions.invoke("stripePortal", { returnUrl: `${window.location.origin}/account` });
      if (res.data?.url) window.location.href = res.data.url;
      else setError("Could not open billing portal. Please try again.");
    } catch { setError("Could not open billing portal. Please try again."); }
    setLoading(false);
  };

  const handleCheckout = async () => {
    if (!isAuthenticated) { navigateToLogin(); return; }
    if (window.self !== window.top) { setError("Checkout is only available from the published app."); return; }
    setError("");
    setLoading(true);
    try {
      const res = await base44.functions.invoke("stripeCheckout", {
        plan: "plus",
        billingCycle: billing,
        successUrl: `${window.location.origin}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
        cancelUrl: `${window.location.origin}/payment-cancelled`,
      });
      if (res.data?.url) window.location.href = res.data.url;
      else setError("Something went wrong. Please try again.");
    } catch (e) { setError(e?.response?.data?.error || "Something went wrong. Please try again."); }
    setLoading(false);
  };

  return (
    <div className="min-h-screen pb-28 lg:pb-16">
      {/* Ambient bg glow */}
      <div className="fixed inset-0 pointer-events-none -z-10">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[280px] blur-[180px] opacity-[0.035]"
          style={{ background: "radial-gradient(ellipse,#D4A843,transparent)" }} />
      </div>

      <div className="max-w-3xl mx-auto px-6 pt-28 lg:pt-20">

        {/* ── Header ── */}
        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
          className="text-center mb-14">
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
            style={{ fontSize: "clamp(0.9rem, 1.4vw, 1.05rem)", maxWidth: "32rem" }}>
            Stream every 432 Hz song for free. Upgrade to Upper Vibe Plus when you want downloads and Academy access.
          </p>

          {/* Active plan badge */}
          {isPlus && !isAdmin && (
            <div className="mt-7 inline-flex items-center gap-2.5 px-4 py-2 rounded-full"
              style={{ background: "rgba(212,168,67,0.08)", border: "1px solid rgba(212,168,67,0.28)" }}>
              <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 animate-pulse" />
              <span className="text-[11px] font-black tracking-[0.25em] uppercase text-yellow-400">Plus Active</span>
              <button onClick={handlePortal} disabled={loading}
                className="text-[11px] font-bold text-white/40 hover:text-white/80 transition-colors ml-1 underline underline-offset-2">
                {loading ? "Opening..." : "Manage"}
              </button>
            </div>
          )}
        </motion.div>

        {/* ── Cards ── */}
        <div className="grid md:grid-cols-2 gap-5 mb-10">

          {/* FREE */}
          <motion.div initial={{ opacity: 0, y: 22 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className="rounded-3xl p-7 flex flex-col"
            style={{
              background: "rgba(255,255,255,0.025)",
              border: `1px solid ${currentPlan === "free" ? "rgba(0,200,220,0.35)" : "rgba(255,255,255,0.08)"}`,
            }}>

            {/* Badge row — same height as Plus card */}
            <div className="relative flex items-center justify-center mb-4">
              {currentPlan === "free" && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[9px] font-black tracking-[0.28em] uppercase"
                  style={{ background: "rgba(0,200,220,0.08)", border: "1px solid rgba(0,200,220,0.25)", color: "#00C9E0" }}>
                  Current Plan
                </span>
              )}
            </div>

            <div className="mb-6">
              <p className="text-[10px] font-black tracking-[0.3em] uppercase text-white/35 mb-3">Free Listener</p>
              <div className="flex items-end gap-1.5 mb-2">
                <span className="font-heading font-black text-white" style={{ fontSize: "2.6rem", lineHeight: 1 }}>$0</span>
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

            {currentPlan === "free" ? (
              <div className="w-full py-3.5 rounded-2xl text-center text-sm font-black text-white/30"
                style={{ border: "1px solid rgba(255,255,255,0.08)" }}>
                Current Plan
              </div>
            ) : (
              <Link to="/music"
                className="w-full py-3.5 rounded-2xl text-center text-sm font-black text-white/55 hover:text-white/80 transition-colors block"
                style={{ border: "1px solid rgba(255,255,255,0.1)" }}>
                Start Free
              </Link>
            )}
          </motion.div>

          {/* UPPER VIBE PLUS (featured) */}
          <motion.div initial={{ opacity: 0, y: 22 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.18 }}
            className="rounded-3xl p-7 flex flex-col relative overflow-hidden"
            style={{
              background: "linear-gradient(155deg,rgba(22,16,4,0.98),rgba(14,10,2,0.99))",
              border: "1px solid rgba(212,168,67,0.45)",
              boxShadow: "0 0 55px rgba(212,168,67,0.07), 0 0 0 1px rgba(212,168,67,0.06)",
            }}>

            {/* Glow blobs */}
            <div className="absolute top-0 right-0 w-52 h-44 rounded-full blur-[90px] opacity-18 pointer-events-none"
              style={{ background: "radial-gradient(circle,#D4A843,transparent)" }} />
            <div className="absolute bottom-0 left-0 w-36 h-36 rounded-full blur-[65px] opacity-8 pointer-events-none"
              style={{ background: "radial-gradient(circle,#B07828,transparent)" }} />

            {/* Badge row — centered */}
            <div className="relative flex items-center justify-center mb-4">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[9px] font-black tracking-[0.28em] uppercase"
                style={{ background: "linear-gradient(135deg,rgba(212,168,67,0.22),rgba(212,168,67,0.1))", border: "1px solid rgba(212,168,67,0.38)", color: "#EDB84A" }}>
                <Crown className="w-2.5 h-2.5" /> Most Popular
              </span>
            </div>

            {/* Plan name + price — mirrors Free card structure */}
            <div className="relative mb-5">
              <p className="text-[10px] font-black tracking-[0.3em] uppercase text-yellow-500/80 mb-3">Upper Vibe Plus</p>

              {/* Price display */}
              {billing === "monthly" ? (
                <div className="flex items-end gap-1.5 mb-2">
                  <span className="font-heading font-black text-white" style={{ fontSize: "2.6rem", lineHeight: 1 }}>$4.99</span>
                  <span className="text-white/35 text-sm mb-1.5">/month</span>
                </div>
              ) : (
                <div className="mb-2">
                  <div className="flex items-end gap-1.5">
                    <span className="font-heading font-black text-white" style={{ fontSize: "2.6rem", lineHeight: 1 }}>$49.99</span>
                    <span className="text-white/35 text-sm mb-1.5">/year</span>
                  </div>
                  <p className="text-xs font-semibold mt-1" style={{ color: "rgba(0,200,220,0.7)" }}>
                    Save with yearly access
                  </p>
                </div>
              )}

              <p className="text-sm font-semibold mb-4" style={{ color: "rgba(237,184,74,0.85)" }}>Downloads + Academy access</p>

              {/* Billing toggle */}
              <div className="flex items-center gap-1 p-1 rounded-xl self-start inline-flex"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
                <button
                  onClick={() => setBilling("monthly")}
                  className="px-4 py-1.5 rounded-lg text-xs font-black tracking-wide transition-all"
                  style={billing === "monthly"
                    ? { background: "rgba(212,168,67,0.18)", color: "#EDB84A", border: "1px solid rgba(212,168,67,0.3)" }
                    : { color: "rgba(255,255,255,0.35)", border: "1px solid transparent" }}>
                  Monthly
                </button>
                <button
                  onClick={() => setBilling("yearly")}
                  className="px-4 py-1.5 rounded-lg text-xs font-black tracking-wide transition-all flex items-center gap-1.5"
                  style={billing === "yearly"
                    ? { background: "rgba(212,168,67,0.18)", color: "#EDB84A", border: "1px solid rgba(212,168,67,0.3)" }
                    : { color: "rgba(255,255,255,0.35)", border: "1px solid transparent" }}>
                  Yearly
                  <span className="text-[8px] font-black px-1.5 py-0.5 rounded-full"
                    style={{ background: "rgba(0,200,220,0.12)", color: "#00C9E0" }}>
                    SAVE
                  </span>
                </button>
              </div>
            </div>

            <ul className="relative space-y-3 mb-8 flex-1">
              {PLUS_FEATURES.map((f) => (
                <li key={f.text} className="flex items-center gap-3 text-sm">
                  <Check className="w-4 h-4 text-yellow-400 flex-shrink-0" />
                  <span className="text-white/75">{f.text}</span>
                </li>
              ))}
            </ul>

            <div className="relative">
              {currentPlan === "plus" ? (
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
                <>
                  <button onClick={handleCheckout} disabled={loading}
                    className="w-full py-4 rounded-2xl font-black text-sm tracking-wider transition-all hover:brightness-110 active:scale-[0.98] disabled:opacity-60"
                    style={{
                      background: "linear-gradient(135deg,#C8892A,#EDB84A,#C8892A)",
                      color: "#000",
                      boxShadow: "0 4px 24px rgba(212,168,67,0.28), 0 1px 0 rgba(255,220,100,0.3) inset",
                      letterSpacing: "0.06em",
                    }}>
                    {loading ? "Redirecting..." : "Upgrade To Plus"}
                  </button>
                  <p className="text-center text-[10px] text-white/25 mt-2.5 leading-relaxed">
                    Recurring billing. Cancel anytime from your account.
                  </p>
                  <p className="text-center text-[10px] text-white/20 mt-1">
                    By subscribing you agree to our{" "}
                    <Link to="/terms" className="underline underline-offset-2 hover:text-white/40">Terms</Link> and{" "}
                    <Link to="/refunds" className="underline underline-offset-2 hover:text-white/40">Refund Policy</Link>.
                  </p>
                </>
              )}
            </div>
          </motion.div>
        </div>

        {/* Error message */}
        {error && (
          <div className="mb-4 px-4 py-3 rounded-2xl text-sm text-red-400 text-center"
            style={{ background: "rgba(220,50,50,0.08)", border: "1px solid rgba(220,50,50,0.2)" }}>
            {error}
          </div>
        )}

        {/* Bottom note */}
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.32 }}
          className="text-center text-xs text-white/20 pb-4">
          All plans include free streaming. Plus downloads and Academy access can be managed in your account.
        </motion.p>
      </div>
    </div>
  );
}