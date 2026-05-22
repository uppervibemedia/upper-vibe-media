import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ShieldCheck, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";

const AGE_GATE_KEY = "uv_vibe_room_age_confirmed";

export function hasConfirmedAge(user) {
  if (user?.vibe_room_age_confirmed) return true;
  return localStorage.getItem(AGE_GATE_KEY) === "true";
}

export default function AgeGateModal({ open, onConfirm, user }) {
  const navigate = useNavigate();

  const handleConfirm = async () => {
    // Track analytics
    base44.analytics.track({ eventName: "vibe_room_age_confirmed" });

    // Persist confirmation
    localStorage.setItem(AGE_GATE_KEY, "true");
    if (user) {
      try {
        await base44.auth.updateMe({ vibe_room_age_confirmed: true });
      } catch (_) {
        // silently fail — localStorage fallback is set
      }
    }
    onConfirm();
  };

  const handleGoBack = () => navigate("/");

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0"
            style={{ background: "rgba(0,0,0,0.85)", backdropFilter: "blur(12px)" }}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 24 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 24 }}
            transition={{ type: "spring", damping: 26, stiffness: 260 }}
            className="relative w-full max-w-sm rounded-3xl overflow-hidden text-center"
            style={{
              background: "linear-gradient(160deg,#0d0d22,#0a0a1a)",
              border: "1px solid rgba(155,126,255,0.3)",
              boxShadow: "0 0 60px rgba(155,126,255,0.12)",
            }}
          >
            {/* Glow */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-32 rounded-full blur-[60px] opacity-20 pointer-events-none"
              style={{ background: "radial-gradient(circle,#9B7EFF,transparent)" }} />

            <div className="relative p-8">
              {/* Icon */}
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-5"
                style={{ background: "rgba(155,126,255,0.12)", border: "1px solid rgba(155,126,255,0.3)" }}>
                <ShieldCheck className="w-7 h-7 text-purple-400" />
              </div>

              {/* 18+ badge */}
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full mb-4"
                style={{ background: "rgba(155,126,255,0.1)", border: "1px solid rgba(155,126,255,0.25)" }}>
                <span className="text-[10px] font-black tracking-[0.3em] uppercase text-purple-300">18+ Positive Community</span>
              </div>

              <h2 className="font-heading font-black text-2xl text-white mb-3 leading-tight">
                Vibe Room
              </h2>

              <p className="text-white/50 text-sm leading-relaxed mb-7">
                Vibe Room is an 18+ positive community space for music listeners. By entering, you confirm you are 18 or older and agree to follow the community rules.
              </p>

              {/* Confirm button */}
              <button
                onClick={handleConfirm}
                className="w-full py-3.5 rounded-2xl font-black text-sm tracking-wider transition-all hover:brightness-110 active:scale-[0.98] mb-3"
                style={{
                  background: "linear-gradient(135deg,#7C3AED,#9B7EFF)",
                  color: "#fff",
                  boxShadow: "0 4px 20px rgba(155,126,255,0.3)",
                  letterSpacing: "0.05em",
                }}>
                I confirm I am 18 or older
              </button>

              {/* Go back */}
              <button
                onClick={handleGoBack}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-2xl font-semibold text-sm text-white/30 hover:text-white/60 transition-colors">
                <ArrowLeft className="w-4 h-4" /> Go back
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}