import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Zap, X } from "lucide-react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";

export default function PremiumUpgradePrompt({ open, onClose }) {
  const handleUpgradeClick = () => {
    base44.analytics.track({ eventName: "vibe_room_upgrade_clicked" });
    onClose();
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
                <Zap className="w-6 h-6 text-purple-400" />
              </div>

              {/* Badge */}
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full mb-3"
                style={{ background: "rgba(212,168,67,0.1)", border: "1px solid rgba(212,168,67,0.25)" }}>
                <span className="text-[9px] font-black tracking-[0.25em] uppercase text-yellow-400">Premium Chat</span>
              </div>

              <h2 className="font-heading font-black text-xl text-white mb-2 leading-tight">
                Unlock Vibe Room Chat
              </h2>
              <p className="text-white/45 text-sm leading-relaxed mb-6">
                Join Premium to post messages, build your profile, and connect with the Upper Vibe community.
              </p>

              <Link
                to="/membership"
                onClick={handleUpgradeClick}
                className="block w-full py-3.5 rounded-2xl font-black text-sm tracking-wider text-center transition-all hover:brightness-110 active:scale-[0.98] mb-3"
                style={{
                  background: "linear-gradient(135deg,#7C3AED,#9B7EFF)",
                  color: "#fff",
                  boxShadow: "0 4px 20px rgba(155,126,255,0.35)",
                  letterSpacing: "0.05em",
                }}>
                Upgrade to Premium
              </Link>

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