import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Crown, X, Check, Zap } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";

export default function PremiumDownloadModal({ open, onClose }) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(null);

  const handleCheckout = async (plan) => {
    if (window.self !== window.top) {
      alert("Checkout is only available from the published app.");
      return;
    }
    setLoading(plan);
    try {
      const res = await base44.functions.invoke("stripeCheckout", {
        plan,
        successUrl: `${window.location.origin}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
        cancelUrl: `${window.location.origin}/payment-cancelled`,
      });
      if (res.data?.url) window.location.href = res.data.url;
    } catch {
      alert("Something went wrong. Please try again.");
    }
    setLoading(null);
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
            className="relative w-full max-w-md rounded-3xl overflow-hidden"
            style={{ background: "linear-gradient(145deg,#0a0a1e,#0d0d1f)", border: "1px solid rgba(212,168,67,0.25)" }}>

            <button onClick={onClose}
              className="absolute top-4 right-4 p-1.5 rounded-xl text-white/30 hover:text-white/70 transition-colors z-10">
              <X className="w-4 h-4" />
            </button>

            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-32 rounded-full blur-[60px] opacity-25 pointer-events-none"
              style={{ background: "radial-gradient(circle,#D4A843,transparent)" }} />

            <div className="relative p-7">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-5"
                style={{ background: "linear-gradient(135deg,rgba(212,168,67,0.2),rgba(212,168,67,0.08))", border: "1px solid rgba(212,168,67,0.3)" }}>
                <Crown className="w-6 h-6 text-yellow-400" />
              </div>

              <h2 className="font-heading font-black text-xl text-white text-center mb-2">Unlock Premium Downloads</h2>
              <p className="text-white/40 text-sm text-center leading-relaxed mb-6">
                Stream every song free. Upgrade to download 432 Hz tracks, save music offline, and unlock premium Upper Vibe Media access.
              </p>

              {/* Two plan options */}
              <div className="space-y-3 mb-5">

                {/* Premium */}
                <div className="p-4 rounded-2xl" style={{ background: "rgba(212,168,67,0.07)", border: "1px solid rgba(212,168,67,0.2)" }}>
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <p className="font-heading font-black text-white text-sm">Premium Downloads</p>
                      <p className="text-[10px] text-white/35">Monthly membership</p>
                    </div>
                    <p className="font-heading font-black text-yellow-400 text-lg">$4.99<span className="text-[10px] text-white/30">/mo</span></p>
                  </div>
                  <ul className="space-y-1 mb-3">
                    {["Download every song", "Save 432 Hz music offline", "Access new releases"].map((b) => (
                      <li key={b} className="flex items-center gap-2 text-xs text-white/55">
                        <Check className="w-3 h-3 text-yellow-400 flex-shrink-0" /> {b}
                      </li>
                    ))}
                  </ul>
                  <button onClick={() => handleCheckout("premium")} disabled={!!loading}
                    className="w-full py-2.5 rounded-xl font-black text-xs tracking-wider transition-all hover:brightness-110 disabled:opacity-60"
                    style={{ background: "linear-gradient(135deg,#D4A843,#F0C060)", color: "#000" }}>
                    {loading === "premium" ? "Redirecting..." : "Upgrade To Premium"}
                  </button>
                </div>

                {/* Plus */}
                <div className="p-4 rounded-2xl" style={{ background: "rgba(155,126,255,0.07)", border: "1px solid rgba(155,126,255,0.2)" }}>
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <p className="font-heading font-black text-white text-sm flex items-center gap-1.5">
                        Upper Vibe Plus <Zap className="w-3.5 h-3.5 text-purple-400" />
                      </p>
                      <p className="text-[10px] text-white/35">Monthly membership</p>
                    </div>
                    <p className="font-heading font-black text-purple-400 text-lg">$9.99<span className="text-[10px] text-white/30">/mo</span></p>
                  </div>
                  <ul className="space-y-1 mb-3">
                    {["Everything in Premium", "Exclusive music packs", "Early access to new releases"].map((b) => (
                      <li key={b} className="flex items-center gap-2 text-xs text-white/55">
                        <Check className="w-3 h-3 text-purple-400 flex-shrink-0" /> {b}
                      </li>
                    ))}
                  </ul>
                  <button onClick={() => handleCheckout("plus")} disabled={!!loading}
                    className="w-full py-2.5 rounded-xl font-black text-xs tracking-wider transition-all hover:brightness-110 disabled:opacity-60"
                    style={{ background: "linear-gradient(135deg,#7B5FCC,#9B7EFF)", color: "#fff" }}>
                    {loading === "plus" ? "Redirecting..." : "Go Plus"}
                  </button>
                </div>
              </div>

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