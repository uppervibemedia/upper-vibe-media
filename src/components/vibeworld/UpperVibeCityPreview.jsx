/**
 * UpperVibeCityPreview — Cinematic live preview card for the Home and Start pages.
 * Shows a live-rendered 3D flyover of Upper Vibe City via CityLiveFeed, with
 * updated feature badges, LIVE status pill, and responsive mobile/desktop layout.
 */
import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { base44 } from "@/api/base44Client";
import CityLiveFeed from "@/components/vibeworld/CityLiveFeed";

const FEATURE_BADGES = [
  { emoji: "🎧", label: "Live DJ",     color: "#C43BFF" },
  { emoji: "🛹", label: "Hoverboards", color: "#00E5FF" },
  { emoji: "🪙", label: "Vibe Coins",   color: "#F5A800" },
  { emoji: "✨", label: "Auras",        color: "#00D4F0" },
  { emoji: "🏄", label: "Neon Surf",    color: "#00FF88" },
  { emoji: "🔮", label: "Viz Dome",     color: "#9B7EFF" },
  { emoji: "👥", label: "Live Users",   color: "#00E5FF" },
  { emoji: "🎵", label: "Music Stage",  color: "#00D4F0" },
];

export default function UpperVibeCityPreview({ variant = "home" }) {
  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const [onlineCount, setOnlineCount] = useState(null);

  // Fetch live presence count (lightweight, public read)
  useEffect(() => {
    if (variant === "home") return; // only show count on Start page
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    base44.entities.VibeWorldPresence
      .filter({ is_online: true }, "-last_heartbeat", 50)
      .then((users) => {
        const active = users.filter(u => u.last_heartbeat && u.last_heartbeat > fiveMinutesAgo);
        if (active.length > 0) setOnlineCount(active.length);
        else setOnlineCount(null); // don't show "0 online"
      })
      .catch(() => {});
  }, [variant]);

  const handleEnter = () => {
    navigate("/vibe-world"); // WorldGate handles login/terms/username
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
        {/* ── Live 3D aerial feed ── */}
        <div className="relative w-full" style={{ paddingBottom: isHome ? "42%" : "50%", minHeight: isHome ? 180 : 220 }}>
          <div className="absolute inset-0 overflow-hidden rounded-t-2xl md:rounded-t-3xl">
            <CityLiveFeed />

            {/* HUD overlay — LIVE pill + online count */}
            <div className="absolute inset-x-0 top-0 flex items-center gap-2 px-3 pt-3 z-10 pointer-events-none">
              {/* LIVE badge */}
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full"
                style={{ background: "rgba(0,0,0,0.55)", border: "1px solid rgba(239,68,68,0.4)", backdropFilter: "blur(10px)" }}>
                <motion.span
                  animate={{ opacity: [1, 0.3, 1] }}
                  transition={{ duration: 1.2, repeat: Infinity }}
                  className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                  style={{ background: "#EF4444" }}
                />
                <span className="text-[9px] font-black tracking-widest uppercase" style={{ color: "#EF4444" }}>
                  Live Now
                </span>
              </div>

              {/* Online count — only shown with real data */}
              {onlineCount !== null && (
                <div className="flex items-center gap-1 px-2 py-1 rounded-full"
                  style={{ background: "rgba(0,0,0,0.5)", border: "1px solid rgba(255,255,255,0.12)", backdropFilter: "blur(8px)" }}>
                  <span className="text-[9px] font-bold" style={{ color: "rgba(255,255,255,0.55)" }}>
                    🔴 {onlineCount} online
                  </span>
                </div>
              )}
            </div>

            {/* Bottom gradient fade */}
            <div className="absolute bottom-0 left-0 right-0 h-10 pointer-events-none"
              style={{ background: "linear-gradient(to top, #060614, transparent)" }} />
          </div>
        </div>

        {/* ── Content below preview ── */}
        <div className="px-5 pb-5 pt-3 md:px-8 md:pb-6">
          {/* Headline */}
          <h2
            className="font-heading font-black text-white leading-tight mb-1"
            style={{ fontSize: "clamp(1.1rem, 3vw, 1.5rem)" }}
          >
            {(isHome
              ? "Live View — Upper Vibe City"
              : "Enter Upper Vibe City")}
          </h2>

          {/* Subtitle */}
          <p className="text-xs sm:text-sm leading-relaxed mb-2" style={{ color: "rgba(255,255,255,0.45)", maxWidth: "36rem" }}>
            {isHome
              ? "Step into the neon music world. Dance with live users, ride hoverboards, collect Vibe Coins, unlock auras, and explore the full Upper Vibe Media 3D experience."
              : "A live 3D music world with DJ dance floors, hoverboards, Vibe Coins, Neon Surf, visualizers, and real users exploring together."}
          </p>

          {/* Feature badges */}
          <div className="flex flex-wrap gap-1.5 mt-1">
            {FEATURE_BADGES.map(({ emoji, label, color }) => (
              <div
                key={label}
                className="flex items-center gap-1 px-2 py-1 rounded-full"
                style={{ background: `${color}14`, border: `1px solid ${color}30`, flexShrink: 0 }}
              >
                <span className="text-[9px]">{emoji}</span>
                <span className="text-[10px] font-black tracking-wide whitespace-nowrap" style={{ color }}>
                  {label}
                </span>
              </div>
            ))}
          </div>

          {/* Enter button — same on both variants */}
          <button
            onClick={handleEnter}
            className="mt-4 w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 rounded-full font-black text-sm tracking-wider transition-all hover:brightness-110 active:scale-95 min-h-[44px]"
            style={{
              background: "linear-gradient(135deg,#00B8D4,#9B4FFF)",
              color: "#fff",
              boxShadow: "0 0 24px rgba(0,212,240,0.3)",
              touchAction: "manipulation",
            }}
          >
            {isHome ? "Enter Upper Vibe City" : "Enter City"}
          </button>

          {/* Login/terms footnote */}
          <p className="text-[10px] mt-2 leading-relaxed" style={{ color: "rgba(255,255,255,0.22)" }}>
            Login required. Terms must be accepted before entering.
          </p>
        </div>
      </div>
    </motion.div>
  );
}