import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Zap, X, Check, Crown } from "lucide-react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";

export default function PremiumUpgradePrompt({ open, onClose }) {
  const [billing, setBilling] = useState("monthly");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleCheckout = async () => {
    if (window.self !== window.top) {
      setError("Checkout is only available from the published app.");
      return;
    }
    base44.analytics.track({ eventName: "vibe_room_upgrade_clicked" });
    setError("");
    setLoading(true);
    try {
      const res = await base44.functions.invoke("stripeCheckout", {
        plan: "plus",
        billingCycle: billing,
        successUrl: `${window.location.origin}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
        cancelUrl: window.location.href,
      });
      if (res.data?.url) window.location.href = res.data.url;
      else setError("Something went wrong. Please try again.");
    } catch (e) {
      setError(e?.response?.data?.error || "Something went wrong. Please try again.");
    }
    setLoading(false);
  };

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0"
            style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)" }}
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 40, scale: 0.95 }}
            transition={{ type: "spring", damping: 28, stiffness: 300 }}
            className="relative w-full max-w-sm rounded-3xl overflow-hidden"
            style={{
              background: "linear-gradient(160deg,#0d0d22,#0a0a1a)",
              border: "1px solid rgba(155,126,255,0.35)",
              boxShadow: "0 0 60px rgba(155,126,255,0.15), 0 32px 80px rgba(0,0,0,0.7)",
            }}>
            {/* Glow */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-24 rounded-full blur-[50px] opacity-25 pointer-events-none"
              style={{ background: "#9B7EFF" }} />

            <div className="relative p-7">
              <button onClick={onClose}
                className="absolute top-4 right-4 w-7 h-7 rounded-full flex items-center justify-center text-white/25 hover:text-white/60 transition-colors">
                <X className="w-4 h-4" />
              </button>

              {/* Icon */}
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4"
                style={{ background: "rgba(155,126,255,0.12)", border: "1px solid rgba(155,126,255,0.3)" }}>
                <Crown className="w-6 h-6 text-yellow-400" />
              </div>

              {/* Badge */}
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full mb-3"
                style={{ background: "rgba(212,168,67,0.1)", border: "1px solid rgba(212,168,67,0.25)" }}>
                <span className="text-[9px] font-black tracking-[0.25em] uppercase text-yellow-400">Upper Vibe Plus</span>
              </div>

              <h2 className="font-heading font-black text-xl text-white mb-2 leading-tight">
                Unlock Vibe Room Chat
              </h2>
              <p className="text-white/45 text-sm leading-relaxed mb-5">
                Upgrade to Plus to post messages, build your profile, download tracks, and connect with the Upper Vibe community.
              </p>

              {/* Billing toggle */}
              <div className="flex items-center gap-1 p-1 rounded-xl mb-4 w-fit"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
                <button onClick={() => setBilling("monthly")}
                  className="px-4 py-1.5 rounded-lg text-xs font-black tracking-wide transition-all"
                  style={billing === "monthly"
                    ? { background: "rgba(212,168,67,0.18)", color: "#EDB84A", border: "1px solid rgba(212,168,67,0.3)" }
                    : { color: "rgba(255,255,255,0.35)", border: "1px solid transparent" }}>
                  Monthly
                </button>
                <button onClick={() => setBilling("yearly")}
                  className="px-4 py-1.5 rounded-lg text-xs font-black tracking-wide transition-all flex items-center gap-1.5"
                  style={billing === "yearly"
                    ? { background: "rgba(212,168,67,0.18)", color: "#EDB84A", border: "1px solid rgba(212,168,67,0.3)" }
                    : { color: "rgba(255,255,255,0.35)", border: "1px solid transparent" }}>
                  Yearly
                  <span className="text-[8px] font-black px-1.5 py-0.5 rounded-full"
                    style={{ background: "rgba(0,160,220,0.12)", color: "#00A0DC" }}>SAVE</span>
                </button>
              </div>

              {/* Price */}
              <div className="flex items-end gap-1.5 mb-4">
                <span className="font-heading font-black text-white text-2xl">
                  {billing === "monthly" ? "$4.99" : "$49.99"}
                </span>
                <span className="text-white/35 text-sm mb-0.5">
                  {billing === "monthly" ? "/month" : "/year"}
                </span>
              </div>

              {/* Benefits */}
              <ul className="space-y-1.5 mb-5">
                {[
                  "Premium Chat in the Vibe Room",
                  "Download tracks & listen offline",
                  "Watch full Academy videos",
                  "Build your My Vibe Library",
                ].map((b) => (
                  <li key={b} className="flex items-center gap-2 text-xs text-white/60">
                    <Check className="w-3.5 h-3.5 text-yellow-400 flex-shrink-0" /> {b}
                  </li>
                ))}
              </ul>

              {error && (
                <div className="mb-3 px-3 py-2 rounded-xl text-xs text-red-400 text-center"
                  style={{ background: "rgba(220,50,50,0.08)", border: "1px solid rgba(220,50,50,0.2)" }}>
                  {error}
                </div>
              )}

              <button onClick={handleCheckout} disabled={loading}
                className="w-full py-3.5 rounded-2xl font-black text-sm tracking-wider text-center transition-all hover:brightness-110 active:scale-[0.98] disabled:opacity-60 mb-3"
                style={{
                  background: "linear-gradient(135deg,#C8892A,#EDB84A,#C8892A)",
                  color: "#000",
                  boxShadow: "0 4px 20px rgba(212,168,67,0.25)",
                  letterSpacing: "0.05em",
                }}>
                {loading ? "Redirecting..." : "Upgrade To Plus"}
              </button>

              <button onClick={onClose}
                className="w-full py-2.5 text-sm text-white/30 hover:text-white/60 transition-colors font-semibold">
                Keep Watching
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}