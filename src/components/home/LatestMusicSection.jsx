import React from "react";
import { motion } from "framer-motion";
import { Play, Pause, Music4, Waves } from "lucide-react";
import { Link } from "react-router-dom";
import SectionHeader from "../shared/SectionHeader";
import { useTheme } from "@/context/ThemeContext";
import { RADIO_THEMES } from "@/components/radio/RadioThemePicker";

export default function LatestMusicSection({ tracks, currentTrack, isPlaying, handlePlayTrack, heartButton, downloadButton, user, themeColor, onUpgrade }) {
  const { accentId } = useTheme();
  const radioTheme = RADIO_THEMES[accentId] || RADIO_THEMES.cyan;
  const rtp = radioTheme.vars["--rt-primary"];

  const isPremium = user?.role === "premium" || user?.tier === "premium" || user?.role === "admin" || user?.role === "plus" || user?.tier === "plus";

  if (!tracks || tracks.length === 0) return null;

  return (
    <section className="max-w-7xl mx-auto px-6 pt-4 pb-10">
      <SectionHeader label="New Releases" title="Latest Music" link="/newest-music" linkLabel="See More" labelColor={`rgb(${themeColor || rtp})`} themeColor={themeColor || rtp} />
      {/* Mobile: horizontal swipe scroll; desktop: grid */}
      <div className="flex sm:hidden gap-3 overflow-x-auto pb-2 -mx-6 px-6 snap-x snap-mandatory hide-scrollbar"
        style={{ WebkitOverflowScrolling: "touch" }}>
        {tracks.map((track, i) => {
          const isCurrent = currentTrack?.id === track.id;
          return (
            <motion.div
              key={track.id + "-mobile"}
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.06, ease: [0.22,1,0.36,1] }}
              className="group flex-shrink-0 snap-start">
              <Link
                to={`/song/${track.id}`}
                className="block rounded-2xl overflow-hidden active:scale-[0.97] transition-transform"
                style={{
                  width: "calc(50vw - 2rem)",
                  background: isCurrent ? "rgba(0,160,220,0.07)" : "rgba(255,255,255,0.03)",
                  border: `1px solid ${isCurrent ? "rgba(0,160,220,0.25)" : "rgba(255,255,255,0.07)"}`,
                }}>
                <div className="relative w-full aspect-square overflow-hidden">
                  {track.cover_url ? (
                    <img src={track.cover_url} alt={track.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center"
                      style={{ background: "linear-gradient(135deg,rgba(0,160,220,0.1),rgba(0,130,200,0.04))" }}>
                      <Music4 className="w-10 h-10 text-cyan-400/15" />
                    </div>
                  )}
                  {/* Play button overlay — stops propagation to play instead of navigate */}
                  <div
                    className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    style={{ background: "rgba(0,0,0,0.45)" }}
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); if (track.audio_url) handlePlayTrack(track); }}>
                    <div className="w-10 h-10 rounded-full flex items-center justify-center"
                      style={{ background: "linear-gradient(135deg,#0080B8,#00A0DC)" }}>
                      {isCurrent && isPlaying
                        ? <Pause className="w-4 h-4 text-white fill-current" />
                        : <Play className="w-4 h-4 text-white fill-current ml-0.5" />}
                    </div>
                  </div>
                  {track.is_new_release && (
                    <div className="absolute top-2 left-2">
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-black tracking-wider"
                        style={{ background: `linear-gradient(135deg,rgba(${rtp},0.8),rgb(${rtp}))`, color: "#fff" }}>NEW</span>
                    </div>
                  )}
                </div>
                <div className="p-2.5">
                  <p className="font-heading font-black text-xs text-white truncate">{track.title}</p>
                  <p className="text-[10px] text-white/40 truncate mt-0.5">{track.artist_display || "Upper Vibe Media"}</p>
                  <div className="flex items-center justify-between mt-2">
                    <span className="inline-flex items-center gap-0.5 text-[8px] font-black px-1.5 py-0.5 rounded-full"
                      style={{ background: "rgba(0,160,220,0.1)", border: "1px solid rgba(0,160,220,0.2)", color: "#00A0DC" }}>
                      <Waves className="w-2 h-2" /> 432
                    </span>
                    <div className="flex items-center gap-0.5" onClick={(e) => e.preventDefault()}>
                      {heartButton("track", track.id, { title: track.title, artist: track.artist_display, cover_url: track.cover_url })}
                      {!isPremium ? (
                        <button
                          onClick={(e) => { e.preventDefault(); e.stopPropagation(); onUpgrade?.(); }}
                          className="text-[8px] font-black px-1.5 py-0.5 rounded-full transition-all hover:brightness-110"
                          style={{ background: "rgba(212,168,67,0.1)", border: "1px solid rgba(212,168,67,0.2)", color: "rgba(212,168,67,0.6)" }}>
                          Plus 🔒
                        </button>
                      ) : downloadButton(track)}
                    </div>
                  </div>
                </div>
              </Link>
            </motion.div>
          );
        })}
      </div>

      {/* Desktop grid */}
      <div className="hidden sm:grid sm:grid-cols-4 gap-3">
        {tracks.map((track, i) => {
          const isCurrent = currentTrack?.id === track.id;
          return (
            <motion.div
              key={track.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.07, ease: [0.22,1,0.36,1] }}
              className="group">
              <Link
                to={`/song/${track.id}`}
                className="block rounded-2xl overflow-hidden transition-all hover:-translate-y-0.5 active:scale-[0.98]"
                style={{
                  background: isCurrent ? "rgba(0,160,220,0.07)" : "rgba(255,255,255,0.03)",
                  border: `1px solid ${isCurrent ? "rgba(0,160,220,0.25)" : "rgba(255,255,255,0.07)"}`,
                  boxShadow: isCurrent ? "0 0 30px rgba(0,160,220,0.1)" : "none",
                }}>

                {/* Cover art — square, full width */}
                <div className="relative w-full aspect-square overflow-hidden">
                  {track.cover_url ? (
                    <img
                      src={track.cover_url}
                      alt={track.title}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center"
                      style={{ background: "linear-gradient(135deg,rgba(0,160,220,0.1),rgba(0,130,200,0.04))" }}>
                      <Music4 className="w-16 h-16 text-cyan-400/15" />
                    </div>
                  )}

                  {/* Play overlay — plays track without navigating */}
                  <div
                    className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300"
                    style={{ background: "rgba(0,0,0,0.45)" }}
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); if (track.audio_url) handlePlayTrack(track); }}>
                    <div className="w-10 h-10 rounded-full flex items-center justify-center transition-transform hover:scale-110"
                      style={{ background: "linear-gradient(135deg,#0080B8,#00A0DC)", boxShadow: "0 0 16px rgba(0,160,220,0.4)" }}>
                      {isCurrent && isPlaying
                        ? <Pause className="w-4 h-4 text-white fill-current" />
                        : <Play className="w-4 h-4 text-white fill-current ml-0.5" />}
                    </div>
                  </div>

                  {/* New release badge */}
                  {track.is_new_release && (
                    <div className="absolute top-3 left-3">
                      <span className="px-2.5 py-1 rounded-full text-[9px] font-black tracking-wider"
                        style={{ background: `linear-gradient(135deg,rgba(${rtp},0.8),rgb(${rtp}))`, color: "#fff" }}>
                        NEW
                      </span>
                    </div>
                  )}

                  {/* Currently playing indicator */}
                  {isCurrent && isPlaying && (
                    <div className="absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center"
                      style={{ background: "rgba(0,160,220,0.9)" }}>
                      <Waves className="w-4 h-4 text-white animate-pulse" />
                    </div>
                  )}
                </div>

                {/* Info below cover */}
                <div className="p-2.5">
                  <p className="font-heading font-black text-xs text-white truncate leading-tight mb-0.5 hover:text-cyan-300 transition-colors">
                    {track.title}
                  </p>
                  <p className="text-[10px] text-white/40 truncate mb-2">
                    {track.artist_display || "Upper Vibe Media"}
                  </p>
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-0.5 text-[8px] font-black px-1.5 py-0.5 rounded-full"
                      style={{ background: "rgba(0,160,220,0.1)", border: "1px solid rgba(0,160,220,0.2)", color: "#00A0DC" }}>
                      <Waves className="w-2 h-2" /> 432
                    </span>
                    <div className="flex items-center gap-0.5" onClick={(e) => e.preventDefault()}>
                      {heartButton("track", track.id, { title: track.title, artist: track.artist_display, cover_url: track.cover_url })}
                      {!isPremium ? (
                        <button
                          onClick={(e) => { e.preventDefault(); e.stopPropagation(); onUpgrade?.(); }}
                          className="text-[8px] font-black px-1.5 py-0.5 rounded-full transition-all hover:brightness-110"
                          style={{ background: "rgba(212,168,67,0.1)", border: "1px solid rgba(212,168,67,0.2)", color: "rgba(212,168,67,0.6)" }}>
                          Plus 🔒
                        </button>
                      ) : downloadButton(track)}
                    </div>
                  </div>
                </div>
              </Link>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}