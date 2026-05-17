import React from "react";
import { motion } from "framer-motion";
import { Play, Pause, Waves, Music4, Heart } from "lucide-react";

export default function HomeSongCard({ track, index, isCurrent, isPlaying, onPlay, onHeart, isFaved }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.07 }}
      className="group flex flex-col rounded-2xl overflow-hidden cursor-pointer transition-all"
      style={{
        background: isCurrent ? "rgba(0,229,255,0.06)" : "rgba(255,255,255,0.025)",
        border: `1px solid ${isCurrent ? "rgba(0,229,255,0.25)" : "rgba(255,255,255,0.07)"}`,
      }}
    >
      {/* Cover — square full width */}
      <div
        className="relative w-full aspect-square overflow-hidden"
        onClick={() => track.audio_url && onPlay(track)}
      >
        {track.cover_url ? (
          <img
            src={track.cover_url}
            alt={track.title}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
          />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center"
            style={{ background: "linear-gradient(135deg,rgba(0,229,255,0.08),rgba(212,168,67,0.04))" }}
          >
            <Music4 className="w-10 h-10 text-white/10" />
          </div>
        )}
        {/* Play overlay */}
        <div
          className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
          style={{ background: "rgba(0,0,0,0.5)" }}
        >
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center"
            style={{ background: "rgba(0,229,255,0.9)" }}
          >
            {isCurrent && isPlaying
              ? <Pause className="w-5 h-5 text-black" />
              : <Play className="w-5 h-5 text-black ml-0.5" />}
          </div>
        </div>
        {/* 432 Hz badge */}
        <div
          className="absolute top-2 left-2 flex items-center gap-0.5 text-[9px] font-black px-1.5 py-0.5 rounded-full pointer-events-none"
          style={{ background: "rgba(0,0,0,0.65)", color: "#00E5FF" }}
        >
          <Waves className="w-2 h-2" /> 432 Hz
        </div>
      </div>

      {/* Info */}
      <div className="p-3 flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-white truncate leading-tight">{track.title}</p>
          <p className="text-xs text-white/35 truncate mt-0.5">{track.artist_display || "Upper Vibe Media"}</p>
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); onHeart(track); }}
          className="flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center transition-all hover:scale-110"
          style={isFaved ? { color: "#ec4899" } : { color: "rgba(255,255,255,0.2)" }}
        >
          <Heart className={`w-3.5 h-3.5 ${isFaved ? "fill-current" : ""}`} />
        </button>
      </div>
    </motion.div>
  );
}