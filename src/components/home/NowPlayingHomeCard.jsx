import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Play, Pause, Waves, Radio, Music4 } from "lucide-react";
import { Link } from "react-router-dom";
import { usePlayer } from "@/context/PlayerContext";
import { useRadio } from "@/context/RadioContext";
import { useTheme } from "@/context/ThemeContext";
import { RADIO_THEMES } from "../radio/RadioThemePicker";

export default function NowPlayingHomeCard() {
  const { currentTrack, isPlaying, togglePlay } = usePlayer();
  const { currentRadioSong } = useRadio();
  const { accentId } = useTheme();
  const radioTheme = RADIO_THEMES[accentId] || RADIO_THEMES.cyan;
  const rtPrimary = radioTheme.vars["--rt-primary"];
  const rtSecondary = radioTheme.vars["--rt-secondary"];
  const barColors = [rtPrimary, rtSecondary, "245,158,11", rtSecondary, rtPrimary, rtSecondary, "245,158,11"];

  // Always show something real — active track first, then radio queue, then nothing
  const displayTrack = currentTrack || currentRadioSong;

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
            className="flex items-center gap-4 px-5 py-5 rounded-2xl"
            style={{
              background: `linear-gradient(135deg, rgba(${rtPrimary},0.10) 0%, rgba(${rtPrimary},0.04) 100%)`,
              border: `1px solid rgba(${rtPrimary},0.22)`,
              boxShadow: `0 0 40px rgba(${rtPrimary},0.10), 0 2px 16px rgba(0,0,0,0.3)`,
            }}
          >
            {/* Cover art */}
            <div className="relative flex-shrink-0">
              {(currentTrack.cover_url || currentRadioSong?.cover_url) ? (
                <img
                  src={currentTrack.cover_url || currentRadioSong?.cover_url}
                  alt={currentTrack.title}
                  className="w-[72px] h-[72px] rounded-2xl object-cover ring-1 ring-white/10"
                  style={{ boxShadow: `0 4px 20px rgba(${rtPrimary},0.25)` }}
                />
              ) : (
                <div className="w-[72px] h-[72px] rounded-2xl flex items-center justify-center"
                  style={{ background: `rgba(${rtPrimary},0.1)` }}>
                  <Music4 className="w-7 h-7" style={{ color: `rgba(${rtPrimary},0.5)` }} />
                </div>
              )}
              {/* Pulsing ring when playing */}
              {isPlaying && (
                <motion.div
                  animate={{ scale: [1, 1.18, 1], opacity: [0.4, 0, 0.4] }}
                  transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
                  className="absolute inset-0 rounded-2xl pointer-events-none"
                  style={{ border: `2px solid rgb(${rtPrimary})` }}
                />
              )}
            </div>

            {/* Animated bars */}
            <div className="flex items-end gap-[3px] flex-shrink-0" style={{ height: "24px" }}>
              {[7, 13, 22, 17, 9, 19, 12].map((h, i) => (
                <motion.div
                  key={i}
                  animate={isPlaying
                    ? { height: [`${h * 0.2}px`, `${h}px`, `${h * 0.45}px`, `${h * 0.8}px`, `${h * 0.2}px`] }
                    : { height: "3px" }}
                  transition={{ duration: 0.28 + i * 0.06, repeat: Infinity, ease: "linear", delay: i * 0.04 }}
                  className="w-[3px] rounded-full flex-shrink-0"
                  style={{ background: `rgb(${barColors[i]})`, opacity: isPlaying ? 1 : 0.3 }}
                />
              ))}
            </div>

            {/* Track info */}
            <div className="flex-1 min-w-0 flex flex-col gap-1">
              <p className="text-[9px] font-black tracking-[0.22em] uppercase" style={{ color: `rgba(${rtPrimary},0.65)` }}>
                {isPlaying ? "Now Playing" : "Paused"}
              </p>
              <p className="text-base font-bold text-white truncate leading-tight">{currentTrack.title}</p>
              <p className="text-xs text-white/45 truncate">{currentTrack.artist_display || currentTrack.artist || "Upper Vibe Media"}</p>
            </div>

            {/* 432 badge */}
            <span className="hidden sm:inline-flex items-center gap-0.5 text-[9px] font-black px-2 py-1 rounded-full flex-shrink-0"
              style={{ background: `rgba(${rtPrimary},0.1)`, border: `1px solid rgba(${rtPrimary},0.2)`, color: `rgb(${rtPrimary})` }}>
              <Waves className="w-2.5 h-2.5" /> 432 Hz
            </span>

            {/* Play/Pause button */}
            <button
              onClick={togglePlay}
              className="w-13 h-13 rounded-full flex items-center justify-center flex-shrink-0 transition-all hover:scale-105 active:scale-95"
              style={{
                width: 52, height: 52,
                background: `linear-gradient(135deg,rgb(${rtPrimary}),rgba(${rtPrimary},0.75))`,
                boxShadow: `0 0 28px rgba(${rtPrimary},0.4)`,
                borderRadius: "50%",
              }}>
              {isPlaying
                ? <Pause className="w-5 h-5 text-black fill-current" />
                : <Play className="w-5 h-5 text-black fill-current ml-0.5" />}
            </button>
          </motion.div>
        ) : displayTrack ? (
          /* Idle but radio has a song loaded — show real cover art */
          <motion.div
            key={displayTrack.id + "-idle"}
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="flex items-center gap-4 px-5 py-5 rounded-2xl"
            style={{
              background: `linear-gradient(135deg, rgba(${rtPrimary},0.08) 0%, rgba(${rtPrimary},0.03) 100%)`,
              border: `1px solid rgba(${rtPrimary},0.18)`,
              boxShadow: `0 0 32px rgba(${rtPrimary},0.07), 0 2px 16px rgba(0,0,0,0.3)`,
            }}
          >
            {/* Real cover art */}
            <div className="relative flex-shrink-0">
              <img
                src={displayTrack.cover_url}
                alt={displayTrack.title}
                className="w-[72px] h-[72px] rounded-2xl object-cover ring-1 ring-white/10"
                style={{ boxShadow: `0 4px 20px rgba(${rtPrimary},0.2)` }}
              />
              <motion.div
                animate={{ scale: [1, 1.14, 1], opacity: [0.25, 0, 0.25] }}
                transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut" }}
                className="absolute inset-0 rounded-2xl pointer-events-none"
                style={{ border: `2px solid rgb(${rtPrimary})` }}
              />
            </div>

            {/* Animated bars — dim idle state */}
            <div className="flex items-end gap-[3px] flex-shrink-0" style={{ height: "24px" }}>
              {[7, 13, 22, 17, 9, 19, 12].map((h, i) => (
                <motion.div
                  key={i}
                  animate={{ height: [`${h * 0.2}px`, `${h * 0.85}px`, `${h * 0.35}px`, `${h * 0.7}px`, `${h * 0.2}px`] }}
                  transition={{ duration: 0.38 + i * 0.07, repeat: Infinity, ease: "linear", delay: i * 0.05 }}
                  className="w-[3px] rounded-full flex-shrink-0"
                  style={{ background: `rgb(${barColors[i]})`, opacity: 0.55 }}
                />
              ))}
            </div>

            {/* Real track info */}
            <div className="flex-1 min-w-0 flex flex-col gap-1">
              <p className="text-[9px] font-black tracking-[0.22em] uppercase" style={{ color: `rgba(${rtPrimary},0.55)` }}>
                Live on Radio
              </p>
              <p className="text-base font-bold text-white/85 truncate leading-tight">{displayTrack.title}</p>
              <p className="text-xs text-white/40 truncate">{displayTrack.artist_display || displayTrack.artist || "Upper Vibe Media"}</p>
            </div>

            {/* Live badge */}
            <span className="hidden sm:inline-flex items-center gap-1 text-[9px] font-black px-2 py-1 rounded-full flex-shrink-0"
              style={{ background: `rgba(${rtPrimary},0.1)`, border: `1px solid rgba(${rtPrimary},0.2)`, color: `rgb(${rtPrimary})` }}>
              <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: `rgb(${rtPrimary})`, animation: "pulse 1.5s infinite" }} />
              LIVE
            </span>

            <Link to="/radio"
              className="flex items-center justify-center flex-shrink-0 transition-all hover:scale-105 active:scale-95"
              style={{
                width: 52, height: 52,
                background: `linear-gradient(135deg,rgb(${rtPrimary}),rgba(${rtPrimary},0.75))`,
                boxShadow: `0 0 28px rgba(${rtPrimary},0.4)`,
                borderRadius: "50%",
              }}>
              <Radio className="w-5 h-5 text-black" />
            </Link>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </section>
  );
}