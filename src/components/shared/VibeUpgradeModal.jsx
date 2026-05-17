import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Heart, X, Crown, Check } from "lucide-react";

const BENEFITS = [
  "Save songs to My Vibe Library",
  "Build your personal 432 Hz playlist",
  "Download every song",
  "Access full Upper Vibe Academy",
  "Support Upper Vibe Media",
];

export default function VibeUpgradeModal({ open, onClose }) {
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
            style={{ background: "linear-gradient(145deg,#0a0a1e,#0d0d1f)", border: "1px solid rgba(236,72,153,0.25)" }}>

            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-32 rounded-full blur-[60px] opacity-25 pointer-events-none"
              style={{ background: "radial-gradient(circle,#ec4899,transparent)" }} />

            <button onClick={onClose} className="absolute top-4 right-4 p-1.5 rounded-xl text-white/30 hover:text-white/70 z-10">
              <X className="w-4 h-4" />
            </button>

            <div className="relative p-8">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-5"
                style={{ background: "rgba(236,72,153,0.15)", border: "1px solid rgba(236,72,153,0.3)" }}>
                <Heart className="w-7 h-7 text-pink-400 fill-current" />
              </div>
              <h2 className="font-heading font-black text-2xl text-white text-center mb-3">
                Build Your Vibe Library
              </h2>
              <p className="text-white/45 text-sm text-center leading-relaxed mb-6">
                Saving favorites and building your personal playlist is a <span className="text-pink-400 font-bold">Premium feature</span>. Upgrade to start curating your 432 Hz collection.
              </p>

              <div className="p-4 rounded-2xl mb-6"
                style={{ background: "rgba(236,72,153,0.06)", border: "1px solid rgba(236,72,153,0.18)" }}>
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="font-heading font-black text-white text-base">Premium Membership</p>
                    <p className="text-xs text-white/40">Monthly membership</p>
                  </div>
                  <div className="text-right">
                    <p className="font-heading font-black text-pink-400 text-xl">$4.99</p>
                    <p className="text-[10px] text-white/30">/month</p>
                  </div>
                </div>
                <ul className="space-y-1.5">
                  {BENEFITS.map((b) => (
                    <li key={b} className="flex items-center gap-2 text-xs text-white/60">
                      <Check className="w-3.5 h-3.5 text-pink-400 flex-shrink-0" /> {b}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="flex flex-col gap-3">
                <a href="/pricing"
                  className="w-full py-3.5 rounded-2xl font-black text-sm tracking-wider text-center transition-all hover:brightness-110"
                  style={{ background: "linear-gradient(135deg,#be185d,#ec4899)", color: "#fff" }}>
                  Upgrade To Premium
                </a>
                <button onClick={onClose}
                  className="w-full py-3 rounded-2xl font-semibold text-sm text-white/40 hover:text-white/70 transition-colors">
                  Keep Listening Free
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}