import React, { useMemo } from "react";
import { motion } from "framer-motion";
import { Play, Pause, Music4, Waves, History } from "lucide-react";
import { Link } from "react-router-dom";
import { getHistory } from "./DiscoverTab";

export default function RecentlyListenedSection({ allTracks, currentTrack, isPlaying, handlePlayTrack, heartButton, downloadButton }) {
  const history = useMemo(() => getHistory(), []);

  const recentTracks = useMemo(() => {
    const seen = new Set();
    return history
      .filter((h) => {
        if (seen.has(h.id)) return false;
        seen.add(h.id);
        return true;
      })
      .slice(0, 3)
      .map((h) => allTracks.find((t) => t.id === h.id))
      .filter(Boolean);
  }, [history, allTracks]);

  return (
    <section className="max-w-7xl mx-auto px-6 py-8">
      <div className="mb-5">
        <p className="text-[10px] font-black tracking-[0.3em] uppercase mb-1 flex items-center gap-1.5" style={{ color: "#9B7EFF" }}>
          <History className="w-3 h-3" /> Recently Played
        </p>
        <h2 className="font-heading font-black text-xl text-white">Recently Played</h2>
      </div>

      {recentTracks.length === 0 ? (
        <div className="flex items-center gap-3 px-5 py-6 rounded-2xl"
          style={{ background: "rgba(155,126,255,0.04)", border: "1px solid rgba(155,126,255,0.1)" }}>
          <History className="w-5 h-5 text-purple-400/30 flex-shrink-0" />
          <p className="text-sm text-white/30">Start listening and your recent songs will appear here.</p>
        </div>
      ) : (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
        {recentTracks.map((track, i) => {
          const isCurrent = currentTrack?.id === track.id;
          return (
            <motion.div
              key={track.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className="flex items-center gap-3 px-3.5 py-3 rounded-xl group cursor-pointer transition-all hover:border-white/10 active:scale-[0.98]"
              style={{
                background: isCurrent ? "rgba(155,126,255,0.06)" : "rgba(255,255,255,0.02)",
                border: `1px solid ${isCurrent ? "rgba(155,126,255,0.2)" : "rgba(255,255,255,0.05)"}`,
              }}
              onClick={() => track.audio_url && handlePlayTrack(track)}>
              {/* Cover */}
              <div className="relative flex-shrink-0">
                {track.cover_url ? (
                  <img src={track.cover_url} alt={track.title} className="w-10 h-10 rounded-lg object-cover" />
                ) : (
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: "rgba(155,126,255,0.08)" }}>
                    <Music4 className="w-4 h-4 text-purple-400/30" />
                  </div>
                )}
                <div className="absolute inset-0 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  style={{ background: "rgba(0,0,0,0.65)" }}>
                  {isCurrent && isPlaying ? <Pause className="w-3.5 h-3.5 text-purple-300" /> : <Play className="w-3.5 h-3.5 text-white fill-current" />}
                </div>
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <Link
                  to={`/song/${track.id}`}
                  onClick={(e) => e.stopPropagation()}
                  className="text-xs font-bold text-white truncate block hover:text-purple-300 transition-colors">
                  {track.title}
                </Link>
                <p className="text-[10px] text-white/30 truncate">{track.artist_display || "Upper Vibe Media"}</p>
              </div>

              {/* Badge + actions */}
              <div className="flex items-center gap-1 flex-shrink-0">
                <span className="flex items-center gap-0.5 text-[8px] font-bold px-1.5 py-0.5 rounded-full"
                  style={{ background: "rgba(0,200,220,0.08)", color: "#00C9E0" }}>
                  <Waves className="w-2 h-2" /> 432
                </span>
                {heartButton("track", track.id, { title: track.title, artist: track.artist_display, cover_url: track.cover_url })}
                {downloadButton(track)}
              </div>
            </motion.div>
          );
        })}
      </div>
      )}
    </section>
  );
}