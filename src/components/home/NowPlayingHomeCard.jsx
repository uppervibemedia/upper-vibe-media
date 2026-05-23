import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Play, Pause, Music4, Waves } from "lucide-react";
import { Link } from "react-router-dom";
import { usePlayer } from "@/context/PlayerContext";
import { useTheme } from "@/context/ThemeContext";
import { RADIO_THEMES } from "../radio/RadioThemePicker";

export default function NowPlayingHomeCard() {
  const { currentTrack, isPlaying, togglePlay } = usePlayer();
  const { accentId } = useTheme();
  const radioTheme = RADIO_THEMES[accentId] || RADIO_THEMES.cyan;
  const rtPrimary = radioTheme.vars["--rt-primary"];

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 pb-4">
      <AnimatePresence mode="wait">
        {currentTrack ? (
          <motion.div
            key={currentTrack.id}
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="flex items-center gap-4 p-4 rounded-2xl"
            style={{
              background: `linear-gradient(135deg, rgba(${rtPrimary},0.08) 0%, rgba(${rtPrimary},0.03) 100%)`,
              border: `1px solid rgba(${rtPrimary},0.2)`,
              boxShadow: `0 0 30px rgba(${rtPrimary},0.07)`,
            }}
          >
            {/* Cover art */}
            <div className="relative flex-shrink-0">
              {currentTrack.cover_url ? (
                <img
                  src={currentTrack.cover_url}
                  alt={currentTrack.title}
                  className="w-14 h-14 rounded-xl object-cover ring-1 ring-white/10"
                />
              ) : (
                <div className="w-14 h-14 rounded-xl flex items-center justify-center"
                  style={{ background: `rgba(${rtPrimary},0.1)` }}>
                  <Music4 className="w-6 h-6" style={{ color: `rgba(${rtPrimary},0.5)` }} />
                </div>
              )}
              {/* Pulsing ring when playing */}
              {isPlaying && (
                <motion.div
                  animate={{ scale: [1, 1.18, 1], opacity: [0.4, 0, 0.4] }}
                  transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
                  className="absolute inset-0 rounded-xl pointer-events-none"
                  style={{ border: `2px solid rgb(${rtPrimary})` }}
                />
              )}
            </div>

            {/* Animated bars */}
            <div className="flex items-end gap-[2px] flex-shrink-0" style={{ height: "18px" }}>
              {[4, 7, 11, 8, 5, 9, 6].map((h, i) => (
                <motion.div
                  key={i}
                  animate={isPlaying
                    ? { height: [`${h * 0.35}px`, `${h}px`, `${h * 0.5}px`] }
                    : { height: "3px" }}
                  transition={{ duration: 0.55 + i * 0.09, repeat: Infinity, ease: "easeInOut", delay: i * 0.07 }}
                  className="w-[2.5px] rounded-full flex-shrink-0"
                  style={{ background: `rgb(${rtPrimary})`, opacity: isPlaying ? 0.85 : 0.3 }}
                />
              ))}
            </div>

            {/* Track info */}
            <div className="flex-1 min-w-0">
              <p className="text-[9px] font-black tracking-[0.22em] uppercase mb-0.5" style={{ color: `rgba(${rtPrimary},0.65)` }}>
                {isPlaying ? "Now Playing" : "Paused"}
              </p>
              <p className="text-sm font-bold text-white truncate leading-tight">{currentTrack.title}</p>
              <p className="text-xs text-white/40 truncate">{currentTrack.artist_display || currentTrack.artist || "Upper Vibe Media"}</p>
            </div>

            {/* 432 badge */}
            <span className="hidden sm:inline-flex items-center gap-0.5 text-[9px] font-black px-2 py-1 rounded-full flex-shrink-0"
              style={{ background: `rgba(${rtPrimary},0.1)`, border: `1px solid rgba(${rtPrimary},0.2)`, color: `rgb(${rtPrimary})` }}>
              <Waves className="w-2.5 h-2.5" /> 432 Hz
            </span>

            {/* Play/Pause button */}
            <button
              onClick={togglePlay}
              className="w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0 transition-all hover:scale-105 active:scale-95"
              style={{
                background: `linear-gradient(135deg,rgb(${rtPrimary}),rgba(${rtPrimary},0.75))`,
                boxShadow: `0 0 20px rgba(${rtPrimary},0.3)`,
              }}>
              {isPlaying
                ? <Pause className="w-4 h-4 text-black fill-current" />
                : <Play className="w-4 h-4 text-black fill-current ml-0.5" />}
            </button>
          </motion.div>
        ) : (
          <motion.div
            key="idle"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="flex items-center gap-4 px-5 py-3.5 rounded-2xl"
            style={{
              background: "rgba(255,255,255,0.025)",
              border: "1px solid rgba(255,255,255,0.07)",
            }}
          >
            <div className="flex items-end gap-[2px] flex-shrink-0 opacity-25" style={{ height: "14px" }}>
              {[3, 5, 8, 5, 3].map((h, i) => (
                <div key={i} className="w-[2px] rounded-full bg-white" style={{ height: `${h}px` }} />
              ))}
            </div>
            <p className="text-xs text-white/30 flex-1">No track playing — browse music or start the radio</p>
            <div className="flex items-center gap-2 flex-shrink-0">
              <Link to="/music"
                className="px-4 py-1.5 rounded-full text-[10px] font-black tracking-wider transition-all hover:brightness-110"
                style={{ background: `rgba(${rtPrimary},0.1)`, border: `1px solid rgba(${rtPrimary},0.2)`, color: `rgb(${rtPrimary})` }}>
                Browse Music
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}