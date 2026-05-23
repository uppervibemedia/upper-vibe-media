import React from "react";
import { motion } from "framer-motion";
import { Play, Pause, Music4, Waves, Clock } from "lucide-react";
import { Link } from "react-router-dom";

export default function RecentlyAddedSection({ tracks, currentTrack, isPlaying, handlePlayTrack, heartButton, downloadButton }) {
  if (!tracks || tracks.length === 0) return null;

  return (
    <section className="max-w-7xl mx-auto px-6 py-8">
      <div className="flex items-center justify-between mb-5">
        <div>
          <p className="text-[10px] font-black tracking-[0.3em] uppercase mb-1 flex items-center gap-1.5" style={{ color: "#00A0DC" }}>
            <Clock className="w-3 h-3" /> Recently Added
          </p>
          <h2 className="font-heading font-black text-xl text-white">Latest Uploads</h2>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
        {tracks.map((track, i) => {
          const isCurrent = currentTrack?.id === track.id;
          return (
            <motion.div
              key={track.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className="flex items-center gap-3 px-3.5 py-3 rounded-xl group cursor-pointer transition-all hover:border-white/12 active:scale-[0.98]"
              style={{
                background: isCurrent ? "rgba(0,160,220,0.05)" : "rgba(255,255,255,0.02)",
                border: `1px solid ${isCurrent ? "rgba(0,160,220,0.18)" : "rgba(255,255,255,0.05)"}`,
              }}
              onClick={() => track.audio_url && handlePlayTrack(track)}>
              {/* Cover */}
              <div className="relative flex-shrink-0">
                {track.cover_url ? (
                  <img src={track.cover_url} alt={track.title} className="w-10 h-10 rounded-lg object-cover" />
                ) : (
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: "rgba(0,160,220,0.07)" }}>
                    <Music4 className="w-4 h-4 text-cyan-400/30" />
                  </div>
                )}
                <div className="absolute inset-0 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  style={{ background: "rgba(0,130,195,0.85)" }}>
                  {isCurrent && isPlaying ? <Pause className="w-3.5 h-3.5 text-white" /> : <Play className="w-3.5 h-3.5 text-white fill-current" />}
                </div>
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <Link
                  to={`/song/${track.id}`}
                  onClick={(e) => e.stopPropagation()}
                  className="text-xs font-bold text-white truncate block hover:text-cyan-300 transition-colors">
                  {track.title}
                </Link>
                <p className="text-[10px] text-white/30 truncate">{track.artist_display || "Upper Vibe Media"}</p>
              </div>

              {/* Badge + actions */}
              <div className="flex items-center gap-1 flex-shrink-0">
                <span className="flex items-center gap-0.5 text-[8px] font-bold px-1.5 py-0.5 rounded-full"
                  style={{ background: "rgba(0,160,220,0.08)", color: "#00A0DC" }}>
                  <Waves className="w-2 h-2" /> 432
                </span>
                {heartButton("track", track.id, { title: track.title, artist: track.artist_display, cover_url: track.cover_url })}
                {downloadButton(track)}
              </div>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}