import React from "react";
import { Music4, Waves, Play } from "lucide-react";
import { motion } from "framer-motion";
import { useTheme } from "@/context/ThemeContext";
import { RADIO_THEMES } from "./RadioThemePicker";
import NewBadge from "@/components/shared/NewBadge";

export default function UpNextPanel({ upNext, onJump }) {
  const { accentId } = useTheme();
  const rtPrimary = (RADIO_THEMES[accentId] || RADIO_THEMES.cyan).vars["--rt-primary"];
  if (!upNext || upNext.length === 0) return null;

  return (
    <div className="rounded-3xl p-5"
      style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.07)" }}>
      <h3 className="font-heading font-black text-white text-xs tracking-[0.18em] uppercase mb-4">
        Up Next
      </h3>

      <div className="flex flex-col gap-2">
        {upNext.map((song, i) => (
          <motion.div
            key={song.id}
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.07 }}
            onClick={() => onJump(song)}
            className="flex items-center gap-3 p-3 rounded-2xl cursor-pointer group transition-all active:scale-[0.98]"
            style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}>

            {/* Position number */}
            <span className="text-[10px] font-black w-4 text-center flex-shrink-0"
              style={{ color: i < 3 ? `rgb(${rtPrimary})` : "rgba(255,255,255,0.2)" }}>
              {i + 1}
            </span>

            {/* Cover */}
            <div className="relative flex-shrink-0 w-10 h-10 rounded-xl overflow-hidden">
              {song.cover_url ? (
                <img src={song.cover_url} alt={song.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
              ) : (
                <div className="w-full h-full flex items-center justify-center"
                  style={{ background: "rgba(0,200,220,0.06)" }}>
                  <Music4 className="w-3.5 h-3.5 text-white/20" />
                </div>
              )}
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                style={{ background: "rgba(0,0,0,0.55)" }}>
                <Play className="w-3 h-3 text-white ml-0.5" />
              </div>
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-white truncate leading-snug transition-colors" style={{ color: "rgba(255,255,255,0.9)" }} onMouseEnter={e => e.currentTarget.style.color = `rgb(${rtPrimary})`} onMouseLeave={e => e.currentTarget.style.color = "rgba(255,255,255,0.9)"}>
                {song.title}
              </p>
              <p className="text-[10px] text-white/35 truncate mt-0.5">
                {song.artist_display || "Upper Vibe Media"}
              </p>
            </div>

            {/* NEW + 432 tags */}
            <div className="flex flex-col items-end gap-1 flex-shrink-0">
              <NewBadge track={song} />
              <span className="inline-flex items-center gap-0.5 text-[8px] font-black px-1.5 py-0.5 rounded-full"
                style={{ background: `rgba(${rtPrimary},0.1)`, color: `rgb(${rtPrimary})` }}>
                <Waves className="w-2 h-2" /> 432
              </span>
            </div>
          </motion.div>
        ))}
      </div>

      <p className="text-[9px] text-white/20 mt-4 text-center tracking-wider">
        Tap a song to play it next
      </p>
    </div>
  );
}