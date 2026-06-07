import React from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Home, Crown, Music4, Heart, Download, Clock } from "lucide-react";
import { useTheme } from "@/context/ThemeContext";

export default function DashboardHeader({ user, savedCount, downloadCount, isPlus, isAdmin }) {
  const { accent } = useTheme();
  const rgb = accent.rgb;
  const isPremium = isPlus || isAdmin;

  const firstName = user?.full_name?.split(" ")[0] || "Vibe Member";

  return (
    <div
      className="relative overflow-hidden pt-16 pb-8 px-6"
      style={{ background: `linear-gradient(180deg,rgba(${rgb},0.08) 0%,transparent 100%)` }}
    >
      {/* Ambient glow */}
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] rounded-full opacity-[0.06] blur-[100px] pointer-events-none"
        style={{ background: `radial-gradient(circle,${accent.hex},transparent)` }}
      />

      <div className="max-w-5xl mx-auto relative z-10">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
          <Link
            to="/"
            className="flex items-center gap-1.5 mb-5 text-xs font-bold tracking-wide transition-all hover:opacity-80"
            style={{ color: "rgba(255,255,255,0.35)" }}
          >
            <Home className="w-3.5 h-3.5" /> Home
          </Link>

          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                {isPremium && (
                  <span
                    className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black tracking-widest uppercase"
                    style={{ background: "rgba(212,168,67,0.15)", border: "1px solid rgba(212,168,67,0.3)", color: "#D4A843" }}
                  >
                    <Crown className="w-2.5 h-2.5" /> Plus Member
                  </span>
                )}
              </div>
              <h1 className="font-heading font-black text-3xl md:text-4xl text-white leading-tight">
                Welcome back, {firstName}
              </h1>
              <p className="text-white/40 text-sm mt-1.5">{user?.email}</p>
            </div>

            {/* Quick stats */}
            <div className="flex items-center gap-3 flex-wrap">
              <div
                className="flex items-center gap-2 px-4 py-2.5 rounded-2xl"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
              >
                <Heart className="w-3.5 h-3.5" style={{ color: "#9B7EFF" }} />
                <div>
                  <p className="text-white font-black text-sm leading-none">{savedCount}</p>
                  <p className="text-white/35 text-[9px] mt-0.5">Saved</p>
                </div>
              </div>
              {isPremium && (
                <div
                  className="flex items-center gap-2 px-4 py-2.5 rounded-2xl"
                  style={{ background: "rgba(212,168,67,0.06)", border: "1px solid rgba(212,168,67,0.15)" }}
                >
                  <Download className="w-3.5 h-3.5" style={{ color: "#D4A843" }} />
                  <div>
                    <p className="text-white font-black text-sm leading-none">{downloadCount}</p>
                    <p className="text-white/35 text-[9px] mt-0.5">Downloads</p>
                  </div>
                </div>
              )}
              <div
                className="flex items-center gap-2 px-4 py-2.5 rounded-2xl"
                style={{ background: `rgba(${rgb},0.06)`, border: `1px solid rgba(${rgb},0.15)` }}
              >
                <Music4 className="w-3.5 h-3.5" style={{ color: `rgb(${rgb})` }} />
                <div>
                  <p className="text-white font-black text-sm leading-none">432Hz</p>
                  <p className="text-white/35 text-[9px] mt-0.5">Library</p>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}