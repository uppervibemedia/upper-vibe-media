import React from "react";
import { motion } from "framer-motion";
import { Play, Pause, Music4, Heart } from "lucide-react";
import { Link } from "react-router-dom";

export default function CompactSongCard({
  track,
  index = 0,
  isCurrent = false,
  isPlaying = false,
  onPlay,
  onHeart,
  isFaved = false,
}) {
  const active = isCurrent && isPlaying;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.025, 0.25) }}
      className="group flex flex-col rounded-xl overflow-hidden cursor-pointer transition-all hover:brightness-110"
      style={{
        background: isCurrent ? "rgba(0,229,255,0.05)" : "rgba(255,255,255,0.03)",
        border: `1px solid ${isCurrent ? "rgba(0,229,255,0.2)" : "rgba(255,255,255,0.05)"}`,
      }}
      onClick={() => onPlay?.(track)}
    >
      {/* Square cover */}
      <div className="relative w-full aspect-square overflow-hidden flex-shrink-0">
        {track.cover_url ? (
          <img
            src={track.cover_url}
            alt={track.title}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.06]"
          />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center"
            style={{ background: "linear-gradient(135deg,rgba(0,229,255,0.07),rgba(212,168,67,0.03))" }}
          >
            <Music4 className="w-7 h-7 text-white/10" />
          </div>
        )}

        {/* Circular play button — bottom right, slides in on hover */}
        <div
          className="absolute bottom-2 right-2 w-8 h-8 rounded-full flex items-center justify-center shadow-lg
                     translate-y-1 opacity-0 group-hover:translate-y-0 group-hover:opacity-100
                     transition-all duration-200"
          style={{ background: isCurrent ? "rgba(0,229,255,1)" : "rgba(0,229,255,0.92)" }}
          onClick={(e) => { e.stopPropagation(); onPlay?.(track); }}
        >
          {active
            ? <Pause className="w-3.5 h-3.5 text-black" />
            : <Play className="w-3.5 h-3.5 text-black ml-0.5" />}
        </div>

        {/* Currently playing indicator — bottom left dot */}
        {isCurrent && (
          <div className="absolute bottom-2 left-2 flex gap-0.5 items-end h-3">
            {[1, 0.6, 0.8].map((h, i) => (
              <span key={i} className="w-0.5 rounded-full animate-pulse"
                style={{ height: `${h * 12}px`, background: "#00E5FF", animationDelay: `${i * 0.15}s` }} />
            ))}
          </div>
        )}
      </div>

      {/* Info row */}
      <div className="px-2.5 pt-2 pb-2.5 flex items-start justify-between gap-1.5">
        <Link
          to={`/song/${track.id}`}
          className="min-w-0 flex-1 hover:opacity-75 transition-opacity"
          onClick={(e) => e.stopPropagation()}
        >
          <p className="text-xs font-bold text-white truncate leading-tight">{track.title}</p>
          <p className="text-[10px] text-white/38 truncate mt-0.5">{track.artist_display || "Upper Vibe Media"}</p>
        </Link>

        {onHeart && (
          <button
            onClick={(e) => { e.stopPropagation(); onHeart(track); }}
            className="flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-lg transition-all hover:scale-110 mt-0.5"
            style={{ color: isFaved ? "#ec4899" : "rgba(255,255,255,0.22)" }}
          >
            <Heart className={`w-3 h-3 ${isFaved ? "fill-current" : ""}`} />
          </button>
        )}
      </div>
    </motion.div>
  );
}