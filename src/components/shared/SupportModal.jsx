import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Zap, Heart, Sparkles } from "lucide-react";
import { base44 } from "@/api/base44Client";

const AMOUNTS = [
  { label: "$1", value: 100 },
  { label: "$3", value: 300 },
  { label: "$5", value: 500 },
  { label: "$10", value: 1000 },
];

export default function SupportModal({ open, onClose, track }) {
  const [selected, setSelected] = useState(500); // default $5
  const [custom, setCustom] = useState("");
  const [isCustom, setIsCustom] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const effectiveAmount = isCustom
    ? Math.round(parseFloat(custom || "0") * 100)
    : selected;

  const handleSupport = async () => {
    if (window.self !== window.top) {
      alert("Checkout is only available from the published app.");
      return;
    }
    if (effectiveAmount < 100) {
      setError("Minimum support is $1.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const res = await base44.functions.invoke("stripeTip", {
        amount: effectiveAmount,
        trackTitle: track?.title || "Upper Vibe Media",
        trackId: track?.id || "",
        successUrl: `${window.location.origin}/payment-success?session_id={CHECKOUT_SESSION_ID}&tip=1`,
        cancelUrl: window.location.href,
      });
      if (res.data?.url) window.location.href = res.data.url;
      else setError("Something went wrong. Please try again.");
    } catch (e) {
      setError("Something went wrong. Please try again.");
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
            initial={{ opacity: 0, scale: 0.92, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 20 }}
            transition={{ type: "spring", damping: 26, stiffness: 300 }}
            className="relative w-full max-w-sm rounded-3xl overflow-hidden"
            style={{ background: "linear-gradient(160deg,#07071a,#0c0c22)", border: "1px solid rgba(0,200,220,0.2)" }}>

            {/* Top glow */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-24 rounded-full blur-[60px] opacity-15 pointer-events-none"
              style={{ background: "radial-gradient(circle,#00D4EE,transparent)" }} />

            <button onClick={onClose}
              className="absolute top-4 right-4 p-1.5 rounded-xl text-white/25 hover:text-white/60 transition-colors z-10">
              <X className="w-4 h-4" />
            </button>

            <div className="relative p-7">
              {/* Icon */}
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-5"
                style={{ background: "rgba(0,200,220,0.1)", border: "1px solid rgba(0,200,220,0.25)" }}>
                <Zap className="w-6 h-6" style={{ color: "#00D4EE" }} />
              </div>

              <h2 className="font-heading font-black text-xl text-white text-center mb-1">
                Support This Song
              </h2>

              {track?.title && (
                <p className="text-center text-xs font-bold mb-3 truncate px-2"
                  style={{ color: "#00C9E0" }}>
                  {track.title}
                  {track.artist_display ? ` · ${track.artist_display}` : ""}
                </p>
              )}

              <p className="text-white/40 text-xs text-center leading-relaxed mb-6">
                If this track raised your vibe, send a boost and help Upper Vibe Media keep creating more 432 Hz high-vibe music.
              </p>

              {/* Amount grid */}
              <div className="grid grid-cols-4 gap-2 mb-3">
                {AMOUNTS.map((a) => (
                  <button
                    key={a.value}
                    onClick={() => { setSelected(a.value); setIsCustom(false); setError(""); }}
                    className="py-2.5 rounded-xl font-black text-sm transition-all hover:brightness-110"
                    style={!isCustom && selected === a.value ? {
                      background: "rgba(0,200,220,0.18)",
                      border: "1px solid rgba(0,200,220,0.4)",
                      color: "#00D4EE",
                    } : {
                      background: "rgba(255,255,255,0.04)",
                      border: "1px solid rgba(255,255,255,0.08)",
                      color: "rgba(255,255,255,0.5)",
                    }}>
                    {a.label}
                  </button>
                ))}
              </div>

              {/* Custom amount */}
              <div className="mb-5">
                <button
                  onClick={() => { setIsCustom(true); setError(""); }}
                  className="w-full py-2.5 rounded-xl font-bold text-sm transition-all text-left px-4"
                  style={isCustom ? {
                    background: "rgba(212,168,67,0.1)",
                    border: "1px solid rgba(212,168,67,0.3)",
                    color: "#D4A843",
                  } : {
                    background: "rgba(255,255,255,0.03)",
                    border: "1px solid rgba(255,255,255,0.07)",
                    color: "rgba(255,255,255,0.35)",
                  }}>
                  {isCustom ? (
                    <div className="flex items-center gap-2">
                      <span style={{ color: "#D4A843" }}>$</span>
                      <input
                        autoFocus
                        type="number"
                        min="1"
                        step="1"
                        placeholder="Enter amount"
                        value={custom}
                        onChange={(e) => setCustom(e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                        className="flex-1 bg-transparent outline-none text-sm font-bold placeholder:text-white/20"
                        style={{ color: "#D4A843" }}
                      />
                    </div>
                  ) : (
                    <span>Custom amount</span>
                  )}
                </button>
              </div>

              {error && (
                <p className="text-xs text-red-400/80 text-center mb-3">{error}</p>
              )}

              {/* CTA */}
              <button
                onClick={handleSupport}
                disabled={loading || effectiveAmount < 100}
                className="w-full py-3.5 rounded-2xl font-black text-sm tracking-wider transition-all hover:brightness-110 active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2 mb-3"
                style={{
                  background: "linear-gradient(135deg,#00A8C0,#00D4EE)",
                  color: "#000",
                  boxShadow: "0 4px 20px rgba(0,200,220,0.2)",
                  letterSpacing: "0.06em",
                }}>
                {loading ? "Redirecting..." : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    Boost · {isCustom ? (custom ? `$${parseFloat(custom).toFixed(2)}` : "$—") : AMOUNTS.find(a => a.value === selected)?.label}
                  </>
                )}
              </button>

              <button onClick={onClose}
                className="w-full py-2.5 rounded-2xl text-sm font-semibold text-white/25 hover:text-white/50 transition-colors">
                Maybe later
              </button>

              <p className="text-center text-[9px] text-white/15 mt-3">
                Secure checkout · Songs always free to stream
              </p>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}