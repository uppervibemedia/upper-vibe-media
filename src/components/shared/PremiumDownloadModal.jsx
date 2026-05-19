import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Crown, X, Check, GraduationCap } from "lucide-react";
import { base44 } from "@/api/base44Client";

export default function PremiumDownloadModal({ open, onClose }) {
  const [billing, setBilling] = useState("monthly");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleCheckout = async () => {
    if (window.self !== window.top) {
      setError("Checkout is only available from the published app.");
      return;
    }
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
    } catch (e) {
      setError(e?.response?.data?.error || "Something went wrong. Please try again.");
    }
    setLoading(false);
  };

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: "spring", damping: 25 }}
            className="relative w-full max-w-sm rounded-3xl overflow-hidden"
            style={{ background: "linear-gradient(145deg,#0a0a1e,#0d0d1f)", border: "1px solid rgba(212,168,67,0.28)" }}>

            <button onClick={onClose}
              className="absolute top-4 right-4 p-1.5 rounded-xl text-white/30 hover:text-white/70 transition-colors z-10">
              <X className="w-4 h-4" />
            </button>

            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-56 h-28 rounded-full blur-[60px] opacity-20 pointer-events-none"
              style={{ background: "radial-gradient(circle,#D4A843,transparent)" }} />

            <div className="relative p-7">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-5"
                style={{ background: "rgba(212,168,67,0.12)", border: "1px solid rgba(212,168,67,0.3)" }}>
                <Crown className="w-6 h-6 text-yellow-400" />
              </div>

              <h2 className="font-heading font-black text-xl text-white text-center mb-2">
                Unlock Upper Vibe Plus
              </h2>
              <p className="text-white/40 text-sm text-center leading-relaxed mb-6">
                Stream every song free. Upgrade to download 432 Hz tracks, save music offline, and access premium Academy lessons.
              </p>

              {/* Billing toggle */}
              <div className="flex items-center gap-1 p-1 rounded-xl mb-5 mx-auto w-fit"
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
                    style={{ background: "rgba(0,200,220,0.12)", color: "#00C9E0" }}>SAVE</span>
                </button>
              </div>

              {/* Price */}
              <div className="text-center mb-5">
                <span className="font-heading font-black text-white text-3xl">
                  {billing === "monthly" ? "$4.99" : "$49.99"}
                </span>
                <span className="text-white/35 text-sm ml-1">
                  {billing === "monthly" ? "/month" : "/year"}
                </span>
                {billing === "yearly" && (
                  <p className="text-xs mt-1" style={{ color: "rgba(0,200,220,0.7)" }}>Save with yearly access</p>
                )}
              </div>

              {/* Benefits */}
              <ul className="space-y-2 mb-6">
                {["Download every available song", "Access premium Academy lessons", "Save 432 Hz music offline", "Access new downloadable releases"].map((b) => (
                  <li key={b} className="flex items-center gap-2.5 text-xs text-white/60">
                    <Check className="w-3.5 h-3.5 text-yellow-400 flex-shrink-0" /> {b}
                  </li>
                ))}
              </ul>

              {error && (
                <div className="mb-3 px-3 py-2.5 rounded-xl text-xs text-red-400 text-center"
                  style={{ background: "rgba(220,50,50,0.08)", border: "1px solid rgba(220,50,50,0.2)" }}>
                  {error}
                </div>
              )}

              <button onClick={handleCheckout} disabled={loading}
                className="w-full py-3.5 rounded-2xl font-black text-sm tracking-wider transition-all hover:brightness-110 active:scale-[0.98] disabled:opacity-60 mb-3"
                style={{
                  background: "linear-gradient(135deg,#C8892A,#EDB84A,#C8892A)",
                  color: "#000",
                  boxShadow: "0 4px 20px rgba(212,168,67,0.25)",
                  letterSpacing: "0.06em",
                }}>
                {loading ? "Redirecting..." : "Upgrade To Plus"}
              </button>

              <button onClick={onClose}
                className="w-full py-2.5 rounded-2xl text-sm font-semibold text-white/30 hover:text-white/60 transition-colors">
                Keep Listening Free
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}