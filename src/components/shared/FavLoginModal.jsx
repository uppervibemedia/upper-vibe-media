import React from "react";
import { motion } from "framer-motion";
import { Heart } from "lucide-react";
import { base44 } from "@/api/base44Client";

export default function FavLoginModal({ open, onClose }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        className="relative w-full max-w-sm rounded-2xl p-7 text-center"
        style={{ background: "#0a0a1e", border: "1px solid rgba(236,72,153,0.25)" }}>
        <Heart className="w-8 h-8 text-pink-400 fill-current mx-auto mb-3" />
        <h3 className="font-heading font-black text-lg text-white mb-2">Save Your Favorites</h3>
        <p className="text-sm text-white/45 leading-relaxed mb-5">
          Create a free account to save your favorite Upper Vibe Media songs and visualizers.
        </p>
        <button
          onClick={() => base44.auth.redirectToLogin(window.location.pathname)}
          className="w-full py-3 rounded-xl font-black text-sm tracking-wider transition-all hover:brightness-110 mb-2"
          style={{ background: "linear-gradient(135deg,#be185d,#ec4899)", color: "#fff" }}>
          Create Free Account
        </button>
        <button
          onClick={() => base44.auth.redirectToLogin(window.location.pathname)}
          className="w-full py-2.5 rounded-xl font-bold text-sm transition-all hover:bg-white/10"
          style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.7)" }}>
          Log In
        </button>
        <button onClick={onClose} className="mt-3 w-full py-2 text-sm text-white/30 hover:text-white/60 transition-colors">
          Not now
        </button>
      </motion.div>
    </div>
  );
}