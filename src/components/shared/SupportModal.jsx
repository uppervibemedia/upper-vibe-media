import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Zap, Heart, Sparkles } from "lucide-react";
import { base44 } from "@/api/base44Client";

const PRESET_AMOUNTS = [1, 3, 5, 10];

export default function SupportModal({ open, onClose, track }) {
  const [selected, setSelected] = useState(3);
  const [custom, setCustom] = useState("");
  const [isCustom, setIsCustom] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const effectiveAmount = isCustom ? parseFloat(custom) || 0 : selected;

  const handlePreset = (amt) => {
    setSelected(amt);
    setIsCustom(false);
    setCustom("");
    setError("");
  };

  const handleCustomFocus = () => {
    setIsCustom(true);
    setError("");
  };

  const handleSupport = async () => {
    if (effectiveAmount < 1) {
      setError("Minimum support is $1.");
      return;
    }
    if (effectiveAmount > 500) {
      setError("Maximum support is $500.");
      return;
    }

    // Block checkout from iframe
    if (window.self !== window.top) {
      alert("Checkout only works from the published app. Please open the full site.");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const res = await base44.functions.invoke("stripeSupportCheckout", {
        amountCents: Math.round(effectiveAmount * 100),
        trackId: track?.id,
        trackTitle: track?.title,
        trackArtist: track?.artist_display || "Upper Vibe Media",
        successUrl: `${window.location.origin}/song/${track?.id}?supported=1`,
        cancelUrl: window.location.href,
      });
      if (res.data?.url) {
        window.location.href = res.data.url;
      } else {
        setError(res.data?.error || "Something went wrong. Please try again.");
      }
    } catch (e) {
      setError("Unable to start checkout. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/75 backdrop-blur-sm"
            onClick={onClose}
          />

          <motion.div
            initial={{ scale: 0.92, opacity: 0, y: 16 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.92, opacity: 0, y: 16 }}
            transition={{ type: "spring", damping: 22, stiffness: 280 }}
            className="relative w-full max-w-md rounded-3xl overflow-hidden"
            style={{ background: "linear-gradient(160deg, #06061a 0%, #0a0a22 100%)", border: "1px solid rgba(0,229,255,0.2)" }}
          >
            {/* Glow accent */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-32 rounded-full opacity-20 pointer-events-none"
              style={{ background: "radial-gradient(ellipse, #00E5FF 0%, transparent 70%)", filter: "blur(30px)" }} />

            <div className="relative p-7">
              {/* Close */}
              <button onClick={onClose}
                className="absolute top-5 right-5 w-8 h-8 rounded-full flex items-center justify-center transition-all hover:bg-white/10"
                style={{ border: "1px solid rgba(255,255,255,0.1)" }}>
                <X className="w-4 h-4 text-white/50" />
              </button>

              {/* Header */}
              <div className="flex items-center gap-3 mb-1">
                <div className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0"
                  style={{ background: "linear-gradient(135deg,rgba(0,229,255,0.2),rgba(212,168,67,0.15))", border: "1px solid rgba(0,229,255,0.25)" }}>
                  <Zap className="w-5 h-5 text-cyan-300" />
                </div>
                <div>
                  <h2 className="font-heading font-black text-xl text-white leading-tight">Support This Song</h2>
                  {track?.title && (
                    <p className="text-[11px] text-white/35 truncate max-w-[220px]">{track.title}</p>
                  )}
                </div>
              </div>

              <p className="text-sm text-white/45 leading-relaxed mt-4 mb-6">
                If this track raised your vibe, send a boost and help Upper Vibe Media keep creating more 432 Hz high-vibe music. 🙏
              </p>

              {/* Amount presets */}
              <div className="grid grid-cols-4 gap-2 mb-3">
                {PRESET_AMOUNTS.map((amt) => (
                  <button
                    key={amt}
                    onClick={() => handlePreset(amt)}
                    className="py-3 rounded-2xl font-black text-sm transition-all hover:scale-105 active:scale-95"
                    style={!isCustom && selected === amt ? {
                      background: "linear-gradient(135deg,#00B8D4,#00E5FF)",
                      color: "#000",
                      boxShadow: "0 0 16px rgba(0,229,255,0.35)",
                    } : {
                      background: "rgba(255,255,255,0.05)",
                      border: "1px solid rgba(255,255,255,0.1)",
                      color: "rgba(255,255,255,0.65)",
                    }}>
                    ${amt}
                  </button>
                ))}
              </div>

              {/* Custom amount */}
              <div className="mb-5 relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-black text-white/40">$</span>
                <input
                  type="number"
                  min="1"
                  max="500"
                  placeholder="Custom amount"
                  value={custom}
                  onFocus={handleCustomFocus}
                  onChange={(e) => { setCustom(e.target.value); setError(""); }}
                  className="w-full pl-8 pr-4 py-3 rounded-2xl text-sm font-bold bg-transparent outline-none transition-all"
                  style={isCustom ? {
                    border: "1px solid rgba(0,229,255,0.45)",
                    color: "#fff",
                    background: "rgba(0,229,255,0.06)",
                  } : {
                    border: "1px solid rgba(255,255,255,0.1)",
                    color: "rgba(255,255,255,0.6)",
                  }}
                />
              </div>

              {error && <p className="text-xs text-red-400 mb-3 text-center">{error}</p>}

              {/* CTA */}
              <button
                onClick={handleSupport}
                disabled={loading || effectiveAmount < 1}
                className="w-full py-4 rounded-2xl font-black text-sm tracking-wider transition-all hover:brightness-110 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                style={{ background: "linear-gradient(135deg,#00B8D4,#00E5FF)", color: "#000", boxShadow: "0 0 24px rgba(0,229,255,0.25)" }}>
                {loading ? (
                  <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    Boost for ${effectiveAmount > 0 ? effectiveAmount.toFixed(effectiveAmount % 1 === 0 ? 0 : 2) : "—"}
                  </>
                )}
              </button>

              <p className="text-[10px] text-white/20 text-center mt-3 leading-relaxed">
                One-time payment · Secure checkout powered by Stripe<br />
                Music stays free to stream for everyone 🎵
              </p>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}