/**
 * UpperVibeCityPreview — Lightweight cinematic preview card for the Home and Start pages.
 * Uses static imagery + CSS animations. No heavy 3D world loaded.
 */
import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { base44 } from "@/api/base44Client";
import { Music4, Users, Zap, Tv2, GraduationCap, Waves, MapPin } from "lucide-react";

const FEATURE_BADGES = [
  { icon: Music4,       label: "Music Stage",    color: "#00D4F0" },
  { icon: Zap,          label: "Live DJ",         color: "#C43BFF" },
  { icon: GraduationCap, label: "Vibe Academy",  color: "#9B7EFF" },
  { icon: Waves,        label: "Vibe Check",      color: "#00E5FF" },
  { icon: Tv2,          label: "Neon Surf Beach", color: "#F5A800" },
];

// Pseudo-parallax floating dots for cinematic feel
function FloatingOrbs() {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {/* Stage screen glow */}
      <div className="absolute top-[18%] left-1/2 -translate-x-1/2 w-40 h-24 rounded-lg blur-[30px] opacity-50"
        style={{ background: "linear-gradient(135deg,#00D4F0,#9B4FFF)" }} />
      {/* Left ambient */}
      <motion.div
        animate={{ y: [0, -12, 0], opacity: [0.25, 0.4, 0.25] }}
        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
        className="absolute top-[30%] left-[12%] w-16 h-16 rounded-full blur-[22px]"
        style={{ background: "#C43BFF" }} />
      {/* Right ambient */}
      <motion.div
        animate={{ y: [0, 10, 0], opacity: [0.2, 0.35, 0.2] }}
        transition={{ duration: 6.5, repeat: Infinity, ease: "easeInOut", delay: 1.5 }}
        className="absolute top-[40%] right-[15%] w-12 h-12 rounded-full blur-[18px]"
        style={{ background: "#00D4F0" }} />
      {/* Ground glow */}
      <div className="absolute bottom-0 left-0 right-0 h-20 blur-[16px] opacity-30"
        style={{ background: "linear-gradient(to top, #00B8D480, transparent)" }} />

      {/* Neon grid lines — cityscape feel */}
      <div className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage: "linear-gradient(rgba(0,212,240,0.8) 1px, transparent 1px), linear-gradient(90deg, rgba(0,212,240,0.8) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
          backgroundPosition: "center center",
        }} />
    </div>
  );
}

// Animated city silhouette drawn in CSS
function CitySilhouette() {
  const buildings = [
    { left: "2%",  width: 28, height: 90 },
    { left: "6%",  width: 20, height: 65 },
    { left: "10%", width: 36, height: 120 },
    { left: "15%", width: 24, height: 80 },
    { left: "19%", width: 18, height: 55 },
    { left: "72%", width: 20, height: 60 },
    { left: "76%", width: 32, height: 100 },
    { left: "80%", width: 22, height: 75 },
    { left: "84%", width: 28, height: 110 },
    { left: "88%", width: 18, height: 50 },
    { left: "92%", width: 36, height: 90 },
  ];

  return (
    <div className="absolute bottom-0 left-0 right-0 flex items-end pointer-events-none" style={{ height: "140px" }}>
      {buildings.map((b, i) => (
        <div
          key={i}
          className="absolute bottom-0 rounded-t-sm"
          style={{
            left: b.left,
            width: b.width,
            height: b.height,
            background: "rgba(8,8,30,0.85)",
            border: "1px solid rgba(0,212,240,0.15)",
            borderBottom: "none",
          }}
        >
          {/* Window lights */}
          {Array.from({ length: Math.floor(b.height / 22) }).map((_, wi) => (
            <div
              key={wi}
              className="absolute"
              style={{
                width: 4, height: 4,
                top: 8 + wi * 16,
                left: "50%",
                transform: "translateX(-50%)",
                background: (i + wi) % 3 === 0 ? "#00D4F0" : (i + wi) % 3 === 1 ? "#C43BFF" : "#9B7EFF",
                opacity: 0.5 + (i % 3) * 0.15,
                borderRadius: 1,
              }}
            />
          ))}
        </div>
      ))}

      {/* Music Stage center piece */}
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 flex flex-col items-center">
        {/* Stage screen */}
        <div className="w-32 h-18 rounded-t-lg flex items-center justify-center relative overflow-hidden"
          style={{
            width: 128, height: 72,
            background: "linear-gradient(180deg,#0A1030,#0d1540)",
            border: "2px solid rgba(0,229,255,0.5)",
            borderBottom: "none",
          }}>
          {/* Screen content */}
          <div className="absolute inset-0 flex items-center justify-center">
            <Music4 style={{ width: 24, height: 24, color: "rgba(0,212,240,0.6)" }} />
          </div>
          {/* Scan line shimmer */}
          <motion.div
            animate={{ y: [-72, 72] }}
            transition={{ duration: 2.5, repeat: Infinity, ease: "linear" }}
            className="absolute left-0 right-0 h-4 opacity-10"
            style={{ background: "linear-gradient(to bottom, transparent, rgba(0,229,255,0.8), transparent)" }}
          />
          {/* Glow border */}
          <div className="absolute inset-0 rounded-t-lg"
            style={{ boxShadow: "inset 0 0 20px rgba(0,229,255,0.15), 0 0 20px rgba(0,229,255,0.3)" }} />
        </div>
        {/* Stage platform */}
        <div className="rounded-sm" style={{ width: 160, height: 18, background: "#111830", borderTop: "2px solid #00D4F0" }} />
      </div>

      {/* Ground floor */}
      <div className="absolute bottom-0 left-0 right-0 h-3"
        style={{ background: "linear-gradient(to top, #0B1020, transparent)" }} />
    </div>
  );
}

export default function UpperVibeCityPreview({ variant = "home" }) {
  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const [onlineCount, setOnlineCount] = useState(null);

  // Fetch live presence count (lightweight, public read)
  useEffect(() => {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    base44.entities.VibeWorldPresence
      .filter({ is_online: true }, "-last_heartbeat", 50)
      .then((users) => {
        // Count only recently active (heartbeat within 5 min)
        const active = users.filter(u => u.last_heartbeat && u.last_heartbeat > fiveMinutesAgo);
        if (active.length > 0) setOnlineCount(active.length);
      })
      .catch(() => {});
  }, []);

  const handleEnter = () => {
    // Always route through /vibe-world — WorldGate handles the full flow
    navigate("/vibe-world");
  };

  const isHome = variant === "home";

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className="w-full"
    >
      <div
        className="relative rounded-2xl md:rounded-3xl overflow-hidden"
        style={{
          background: "linear-gradient(160deg,#060614 0%,#0a0a22 60%,#060610 100%)",
          border: "1px solid rgba(0,212,240,0.2)",
          boxShadow: "0 0 60px rgba(0,212,240,0.06), 0 0 100px rgba(155,126,255,0.04)",
        }}
      >
        {/* ── Cinematic preview frame ── */}
        <div className="relative w-full" style={{ paddingBottom: isHome ? "42%" : "56.25%", minHeight: isHome ? 160 : 200 }}>
          <div className="absolute inset-0">
            <FloatingOrbs />
            <CitySilhouette />

            {/* Stars */}
            <div className="absolute inset-0 pointer-events-none">
              {Array.from({ length: 30 }).map((_, i) => (
                <motion.div
                  key={i}
                  animate={{ opacity: [0.2, 0.8, 0.2] }}
                  transition={{ duration: 2 + (i % 5) * 0.6, repeat: Infinity, delay: i * 0.15 }}
                  className="absolute rounded-full"
                  style={{
                    width: i % 4 === 0 ? 2 : 1,
                    height: i % 4 === 0 ? 2 : 1,
                    top: `${5 + (i * 31 % 55)}%`,
                    left: `${(i * 37 % 85) + 5}%`,
                    background: i % 3 === 0 ? "#00D4F0" : i % 3 === 1 ? "#C43BFF" : "#ffffff",
                  }}
                />
              ))}
            </div>

            {/* Overhead text overlay */}
            <div className="absolute inset-x-0 top-0 flex flex-col items-center pt-4 z-10 pointer-events-none">
              {/* LIVE badge + online count */}
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full"
                  style={{ background: "rgba(0,0,0,0.5)", border: "1px solid rgba(0,212,240,0.3)", backdropFilter: "blur(8px)" }}>
                  <motion.span
                    animate={{ opacity: [1, 0.3, 1] }}
                    transition={{ duration: 1.2, repeat: Infinity }}
                    className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                    style={{ background: "#00E5FF" }}
                  />
                  <span className="text-[9px] font-black tracking-widest uppercase" style={{ color: "#00E5FF" }}>
                    Upper Vibe City
                  </span>
                </div>
                {onlineCount !== null && (
                  <div className="flex items-center gap-1 px-2 py-1 rounded-full"
                    style={{ background: "rgba(0,0,0,0.45)", border: "1px solid rgba(255,255,255,0.1)", backdropFilter: "blur(6px)" }}>
                    <Users style={{ width: 9, height: 9, color: "rgba(255,255,255,0.5)" }} />
                    <span className="text-[9px] font-bold" style={{ color: "rgba(255,255,255,0.55)" }}>
                      {onlineCount} online
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Center Enter button overlay */}
            <div className="absolute inset-0 flex items-center justify-center z-10">
              <button
                onClick={handleEnter}
                className="flex items-center gap-2 px-5 py-2.5 rounded-full font-black text-sm tracking-wider transition-all hover:brightness-110 active:scale-95"
                style={{
                  background: "linear-gradient(135deg,rgba(0,184,212,0.85),rgba(155,79,255,0.85))",
                  color: "#fff",
                  backdropFilter: "blur(12px)",
                  border: "1px solid rgba(255,255,255,0.2)",
                  boxShadow: "0 0 32px rgba(0,212,240,0.4), 0 4px 20px rgba(0,0,0,0.5)",
                  touchAction: "manipulation",
                  fontSize: "13px",
                }}
              >
                <MapPin style={{ width: 14, height: 14 }} />
                Enter Upper Vibe City
              </button>
            </div>

            {/* Bottom gradient fade into content */}
            <div className="absolute bottom-0 left-0 right-0 h-12 pointer-events-none"
              style={{ background: "linear-gradient(to top, #060614, transparent)" }} />
          </div>
        </div>

        {/* ── Content below preview ── */}
        <div className="px-5 pb-5 pt-3 md:px-8 md:pb-6">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
            {/* Headline + subtext */}
            <div className="flex-1">
              <h2
                className="font-heading font-black text-white leading-tight mb-1"
                style={{ fontSize: "clamp(1.1rem, 3vw, 1.5rem)" }}
              >
                {isHome
                  ? "Listen to Music and Chill in Upper Vibe City"
                  : "Enter Upper Vibe City"}
              </h2>
              <p className="text-xs sm:text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.45)", maxWidth: "34rem" }}>
                {isHome
                  ? "Step into a 3D music world by Upper Vibe Media. Explore the city, watch visualizers, vibe at the Music Stage, meet other users, and listen while you move."
                  : "Listen to music, chill, explore, and connect inside the Upper Vibe Media world."}
              </p>
            </div>

            {/* Enter button (desktop right side) */}
            <button
              onClick={handleEnter}
              className="hidden sm:flex items-center gap-2 px-5 py-2.5 rounded-full font-black text-sm tracking-wider transition-all hover:brightness-110 active:scale-95 flex-shrink-0"
              style={{
                background: "linear-gradient(135deg,#00B8D4,#9B4FFF)",
                color: "#fff",
                boxShadow: "0 0 24px rgba(0,212,240,0.3)",
                touchAction: "manipulation",
              }}
            >
              <MapPin style={{ width: 14, height: 14 }} />
              Enter City
            </button>
          </div>

          {/* Feature badges */}
          <div className="flex flex-wrap gap-1.5 mt-3">
            {FEATURE_BADGES.map(({ icon: Icon, label, color }) => (
              <div
                key={label}
                className="flex items-center gap-1 px-2.5 py-1 rounded-full"
                style={{
                  background: `${color}12`,
                  border: `1px solid ${color}30`,
                }}
              >
                <Icon style={{ width: 10, height: 10, color, flexShrink: 0 }} />
                <span className="text-[10px] font-black tracking-wide" style={{ color }}>
                  {label}
                </span>
              </div>
            ))}
          </div>

          {/* Mobile enter button */}
          <button
            onClick={handleEnter}
            className="sm:hidden mt-4 w-full flex items-center justify-center gap-2 py-3 rounded-full font-black text-sm tracking-wider transition-all hover:brightness-110 active:scale-95"
            style={{
              background: "linear-gradient(135deg,#00B8D4,#9B4FFF)",
              color: "#fff",
              boxShadow: "0 0 20px rgba(0,212,240,0.25)",
              touchAction: "manipulation",
              minHeight: "44px",
            }}
          >
            <MapPin style={{ width: 14, height: 14 }} />
            Enter Upper Vibe City
          </button>
        </div>
      </div>
    </motion.div>
  );
}