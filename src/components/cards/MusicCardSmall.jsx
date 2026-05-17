import React from "react";
import { motion } from "framer-motion";
import { Play, Pause, Waves, Music4, Heart } from "lucide-react";
import { Link } from "react-router-dom";

export default function MusicCardSmall({
  track,
  index = 0,
  isCurrent = false,
  isPlaying = false,
  onPlay,
  onHeart,
  isFaved = false,
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.03, 0.3) }}
      className="group flex flex-col rounded-xl overflow-hidden transition-all"
      style={{
        background: isCurrent ? "rgba(0,229,255,0.06)" : "rgba(255,255,255,0.02)",
        border: `1px solid ${isCurrent ? "rgba(0,229,255,0.25)" : "rgba(255,255,255,0.06)"}`,
      }}
    >
      {/* Cover — strict 1:1 */}
      <div
        className="relative w-full aspect-square overflow-hidden cursor-pointer flex-shrink-0"
        onClick={() => onPlay?.(track)}
      >
        {track.cover_url ? (
          <img
            src={track.cover_url}
            alt={track.title}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.05]"
          />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center"
            style={{ background: "linear-gradient(135deg,rgba(0,229,255,0.07),rgba(212,168,67,0.03))" }}
          >
            <Music4 className="w-8 h-8 text-white/10" />
          </div>
        )}

        {/* Play overlay */}
        <div
          className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
          style={{ background: "rgba(0,0,0,0.52)" }}
        >
          <div className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: "rgba(0,229,255,0.9)" }}>
            {isCurrent && isPlaying
              ? <Pause className="w-4 h-4 text-black" />
              : <Play className="w-4 h-4 text-black ml-0.5" />}
          </div>
        </div>

        {/* 432 badge */}
        <div className="absolute top-1.5 left-1.5 pointer-events-none">
          <span className="flex items-center gap-0.5 text-[8px] font-black px-1.5 py-0.5 rounded-full"
            style={{ background: "rgba(0,0,0,0.68)", color: "#00E5FF" }}>
            <Waves className="w-1.5 h-1.5" /> 432
          </span>
        </div>

        {/* Heart — top right, always visible on mobile, hover on desktop */}
        {onHeart && (
          <button
            onClick={(e) => { e.stopPropagation(); onHeart(track); }}
            className="absolute top-1.5 right-1.5 w-6 h-6 rounded-lg flex items-center justify-center transition-all hover:scale-110 opacity-0 group-hover:opacity-100"
            style={{
              background: "rgba(0,0,0,0.6)",
              color: isFaved ? "#ec4899" : "rgba(255,255,255,0.55)",
            }}
          >
            <Heart className={`w-3 h-3 ${isFaved ? "fill-current" : ""}`} />
          </button>
        )}
      </div>

      {/* Info + play button */}
      <div className="px-2.5 pt-2 pb-2.5 flex flex-col gap-1.5">
        <Link to={`/song/${track.id}`} className="min-w-0 hover:opacity-80 transition-opacity">
          <p className="text-xs font-bold text-white truncate leading-tight">{track.title}</p>
          <p className="text-[10px] text-white/35 truncate mt-0.5">{track.artist_display || "Upper Vibe Media"}</p>
        </Link>

        <button
          onClick={() => onPlay?.(track)}
          className="w-full flex items-center justify-center gap-1 py-1.5 rounded-lg text-[10px] font-black tracking-wider transition-all hover:brightness-110"
          style={{
            background: isCurrent ? "rgba(0,229,255,0.18)" : "rgba(0,229,255,0.07)",
            border: "1px solid rgba(0,229,255,0.18)",
            color: "#00E5FF",
          }}
        >
          {isCurrent && isPlaying
            ? <><Pause className="w-3 h-3" /> Pause</>
            : <><Play className="w-3 h-3 ml-0.5" /> Play</>}
        </button>
      </div>
    </motion.div>
  );
}