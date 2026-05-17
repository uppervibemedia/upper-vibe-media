import React from "react";
import { motion } from "framer-motion";
import { Play, Pause, Music4, Waves, Lock } from "lucide-react";
import { Link } from "react-router-dom";
import SectionHeader from "../shared/SectionHeader";

export default function LatestMusicSection({ tracks, currentTrack, isPlaying, handlePlayTrack, heartButton, downloadButton, user }) {
  if (!tracks || tracks.length === 0) return null;

  const isPremium = user?.role === "premium" || user?.tier === "premium" || user?.role === "admin";

  return (
    <section className="max-w-7xl mx-auto px-6 pt-4 pb-10">
      <SectionHeader label="New Releases" title="Latest Music" link="/newest-music" linkLabel="See More" labelColor="#00E5FF" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {tracks.map((track, i) => {
          const isCurrent = currentTrack?.id === track.id;
          return (
            <motion.div
              key={track.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
              className="group rounded-2xl overflow-hidden cursor-pointer transition-all hover:-translate-y-0.5 active:scale-[0.98]"
              style={{
                background: isCurrent ? "rgba(0,229,255,0.07)" : "rgba(255,255,255,0.03)",
                border: `1px solid ${isCurrent ? "rgba(0,229,255,0.25)" : "rgba(255,255,255,0.07)"}`,
                boxShadow: isCurrent ? "0 0 30px rgba(0,200,220,0.1)" : "none",
              }}
              onClick={() => track.audio_url && handlePlayTrack(track)}>

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
                    style={{ background: "linear-gradient(135deg,rgba(0,200,220,0.1),rgba(0,180,200,0.04))" }}>
                    <Music4 className="w-16 h-16 text-cyan-400/15" />
                  </div>
                )}

                {/* Play overlay */}
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300"
                  style={{ background: "rgba(0,0,0,0.45)" }}>
                  <div className="w-16 h-16 rounded-full flex items-center justify-center transition-transform hover:scale-110"
                    style={{ background: "linear-gradient(135deg,#00A8C0,#00D4EE)", boxShadow: "0 0 24px rgba(0,200,220,0.4)" }}>
                    {isCurrent && isPlaying
                      ? <Pause className="w-7 h-7 text-black fill-current" />
                      : <Play className="w-7 h-7 text-black fill-current ml-0.5" />}
                  </div>
                </div>

                {/* New release badge */}
                {track.is_new_release && (
                  <div className="absolute top-3 left-3">
                    <span className="px-2.5 py-1 rounded-full text-[9px] font-black tracking-wider"
                      style={{ background: "linear-gradient(135deg,#00A8C0,#00D4EE)", color: "#000" }}>
                      NEW
                    </span>
                  </div>
                )}

                {/* Currently playing indicator */}
                {isCurrent && isPlaying && (
                  <div className="absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center"
                    style={{ background: "rgba(0,229,255,0.9)" }}>
                    <Waves className="w-4 h-4 text-black animate-pulse" />
                  </div>
                )}
              </div>

              {/* Info below cover */}
              <div className="p-4">
                {/* Title & artist */}
                <Link
                  to={`/song/${track.id}`}
                  onClick={(e) => e.stopPropagation()}
                  className="font-heading font-black text-base text-white truncate block hover:text-cyan-300 transition-colors leading-tight mb-0.5">
                  {track.title}
                </Link>
                <p className="text-sm text-white/40 truncate mb-3">
                  {track.artist_display || "Upper Vibe Media"}
                </p>

                {/* Bottom row: badge + actions */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1 text-[9px] font-black px-2 py-1 rounded-full"
                      style={{ background: "rgba(0,200,220,0.1)", border: "1px solid rgba(0,200,220,0.2)", color: "#00C9E0" }}>
                      <Waves className="w-2.5 h-2.5" /> 432 Hz
                    </span>
                    {track.duration && (
                      <span className="text-[10px] text-white/25">{track.duration}</span>
                    )}
                  </div>

                  {/* Action buttons */}
                  <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                    {heartButton("track", track.id, { title: track.title, artist: track.artist_display, cover_url: track.cover_url })}
                    {/* Download: show locked icon if not premium */}
                    {!isPremium ? (
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                        style={{ color: "rgba(212,168,67,0.4)" }}
                        title="Premium download">
                        <Lock className="w-3.5 h-3.5" />
                      </div>
                    ) : (
                      downloadButton(track)
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}