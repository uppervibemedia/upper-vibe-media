import React from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Play, GraduationCap, UserPlus } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";

export default function HeroSection() {
  const { isAuthenticated, isPlus, isAdmin, navigateToLogin } = useAuth();

  const handleCreateAccount = () => {
    // Redirect back to /music after signup for free users (Plus/admin handled by post-auth logic)
    navigateToLogin(`${window.location.origin}/music`);
  };

  return (
    <section className="relative min-h-screen flex items-center overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0">
        <div className="absolute inset-0" style={{ background: "linear-gradient(135deg,#04040e 0%,#070714 60%,#080820 100%)" }} />
        {/* Teal glow top-right */}
        <div className="absolute -top-32 right-0 w-[700px] h-[700px] rounded-full opacity-[0.07] blur-[120px] pointer-events-none"
          style={{ background: "radial-gradient(circle,#00A0DC,transparent 70%)" }} />
        {/* Gold glow bottom-left */}
        <div className="absolute bottom-0 -left-32 w-[500px] h-[500px] rounded-full opacity-[0.07] blur-[100px] pointer-events-none"
          style={{ background: "radial-gradient(circle,#D4A843,transparent 70%)" }} />
        {/* Center subtle pulse */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[900px] rounded-full opacity-[0.03] blur-[160px] pointer-events-none"
          style={{ background: "radial-gradient(circle,#00A0DC,transparent 60%)" }} />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-6 pt-28 pb-20 md:pt-0 md:pb-0 md:h-screen md:flex md:items-center">
        <div className="max-w-3xl">
          {/* Eyebrow */}
          <motion.div
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-8"
            style={{ background: "rgba(212,168,67,0.1)", border: "1px solid rgba(212,168,67,0.2)" }}>
            <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 animate-pulse" />
            <span className="text-[11px] font-black tracking-[0.25em] uppercase text-yellow-400/90">
              432 Hz · Mindset · Self-Mastery
            </span>
          </motion.div>

          {/* Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15, duration: 0.8 }}
            className="font-heading font-black text-4xl md:text-6xl lg:text-7xl leading-[0.92] tracking-tight mb-7"
          >
            <span className="text-white block">Music That</span>
            <span className="text-white block">Reprograms The</span>
            <span className="block" style={{ color: "#00A0DC", textShadow: "0 0 60px rgba(0,160,220,0.45), 0 0 120px rgba(0,160,220,0.15)" }}>
              Way You Feel,
            </span>
            <span className="block" style={{ color: "#00A0DC", textShadow: "0 0 60px rgba(0,160,220,0.45), 0 0 120px rgba(0,160,220,0.15)" }}>
              Think, And Move
            </span>
          </motion.h1>

          {/* Subheadline */}
          <motion.p
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4, duration: 0.7 }}
            className="text-base md:text-lg text-white/45 leading-relaxed max-w-2xl mb-10"
          >
            Stream exclusive 432 Hz music, enter guided listening sessions, download high-vibration tracks, and learn how sound, repetition, and mindset work together to shift your reality.
          </motion.p>

          {/* CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}
            className="flex flex-wrap gap-4"
          >
            <Link to="/discover"
              className="flex items-center gap-2.5 px-7 py-4 rounded-full font-black text-sm tracking-wider transition-all hover:brightness-110 hover:scale-[1.03]"
              style={{ background: "linear-gradient(135deg,#0080B8,#00A0DC)", color: "#fff", boxShadow: "0 0 32px rgba(0,160,220,0.35)" }}>
              <Play className="w-4 h-4" /> Enter The Music Vault
            </Link>
            <Link to="/academy"
              className="flex items-center gap-2.5 px-7 py-4 rounded-full font-black text-sm tracking-wider transition-all hover:brightness-110 hover:scale-[1.03]"
              style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", color: "#fff" }}>
              <GraduationCap className="w-4 h-4" /> Watch Free Training
            </Link>
          </motion.div>

          {/* Create Account — only shown to logged-out visitors */}
          {!isAuthenticated && (
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.75 }}
              className="flex items-center gap-3 mt-2"
            >
              <button
                onClick={handleCreateAccount}
                className="flex items-center gap-2 px-5 py-3 rounded-full font-black text-xs tracking-wider transition-all hover:brightness-125 active:scale-95"
                style={{
                  background: "rgba(212,168,67,0.1)",
                  border: "1px solid rgba(212,168,67,0.3)",
                  color: "rgba(212,168,67,0.9)",
                  minHeight: 44,
                }}>
                <UserPlus className="w-3.5 h-3.5 flex-shrink-0" />
                Create Free Account
              </button>
              <span className="text-[10px] text-white/20 font-semibold">Free forever · No card needed</span>
            </motion.div>
          )}

          {/* Stats row */}
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.85 }}
            className="flex flex-wrap gap-8 mt-14 pt-10"
            style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}
          >
            {[
              { value: "432 Hz", label: "Tuned Audio" },
              { value: "3 Tiers", label: "Membership" },
              { value: "100%", label: "Ad-Free" },
              { value: "Daily", label: "New Content" },
            ].map((s) => (
              <div key={s.label}>
                <p className="font-heading font-black text-xl text-white">{s.value}</p>
                <p className="text-[10px] tracking-[0.15em] uppercase text-white/25 mt-0.5">{s.label}</p>
              </div>
            ))}
          </motion.div>
        </div>
      </div>

      {/* Bottom fade */}
      <div className="absolute bottom-0 left-0 right-0 h-32 pointer-events-none"
        style={{ background: "linear-gradient(to top,#04040E,transparent)" }} />
    </section>
  );
}