import React from "react";
import { motion } from "framer-motion";
import { Play, Pause, Waves, Music4, Heart, Download, Lock } from "lucide-react";
import { Link } from "react-router-dom";

export default function MusicCard({
  track,
  index = 0,
  isCurrent = false,
  isPlaying = false,
  onPlay,
  onHeart,
  isFaved = false,
  isPremium = false,
  onUpgrade,
  showDownload = false,
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.04, 0.4) }}
      className="group flex flex-col rounded-2xl overflow-hidden transition-all"
      style={{
        background: isCurrent ? "rgba(0,229,255,0.06)" : "rgba(255,255,255,0.025)",
        border: `1px solid ${isCurrent ? "rgba(0,229,255,0.25)" : "rgba(255,255,255,0.07)"}`,
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
          style={{ background: "rgba(0,0,0,0.52)" }}
        >
          <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: "rgba(0,229,255,0.9)" }}>
            {isCurrent && isPlaying
              ? <Pause className="w-5 h-5 text-black" />
              : <Play className="w-5 h-5 text-black ml-0.5" />}
          </div>
        </div>

        {/* Badges */}
        <div className="absolute top-2 left-2 flex gap-1 pointer-events-none">
          <span className="flex items-center gap-0.5 text-[9px] font-black px-1.5 py-0.5 rounded-full"
            style={{ background: "rgba(0,0,0,0.68)", color: "#00E5FF" }}>
            <Waves className="w-2 h-2" /> 432 Hz
          </span>
          {track.is_new_release && (
            <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full"
              style={{ background: "rgba(212,168,67,0.9)", color: "#000" }}>NEW</span>
          )}
        </div>
      </div>

      {/* Info */}
      <div className="p-3 flex flex-col gap-2.5 flex-1">
        <div className="flex items-start justify-between gap-2 min-w-0">
          <Link to={`/song/${track.id}`} className="min-w-0 flex-1 hover:opacity-80 transition-opacity">
            <p className="text-sm font-bold text-white truncate leading-tight">{track.title}</p>
            <p className="text-xs text-white/40 truncate mt-0.5">{track.artist_display || "Upper Vibe Media"}</p>
          </Link>
          {onHeart && (
            <button
              onClick={(e) => { e.stopPropagation(); onHeart(track); }}
              className="flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center transition-all hover:scale-110"
              style={isFaved ? { color: "#ec4899" } : { color: "rgba(255,255,255,0.2)" }}
            >
              <Heart className={`w-3.5 h-3.5 ${isFaved ? "fill-current" : ""}`} />
            </button>
          )}
        </div>

        {/* Action row */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => onPlay?.(track)}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-black tracking-wider transition-all hover:brightness-110"
            style={{
              background: isCurrent ? "rgba(0,229,255,0.18)" : "rgba(0,229,255,0.08)",
              border: "1px solid rgba(0,229,255,0.2)",
              color: "#00E5FF",
            }}
          >
            {isCurrent && isPlaying ? <><Pause className="w-3.5 h-3.5" /> Pause</> : <><Play className="w-3.5 h-3.5 ml-0.5" /> Play</>}
          </button>

          {showDownload && (
            isPremium ? (
              <a
                href={track.audio_url}
                download={`${track.title}.mp3`}
                className="w-8 h-8 rounded-xl flex items-center justify-center transition-all hover:scale-110 flex-shrink-0"
                style={{ background: "rgba(212,168,67,0.1)", border: "1px solid rgba(212,168,67,0.25)", color: "#D4A843" }}
                onClick={(e) => e.stopPropagation()}
                title="Download"
              >
                <Download className="w-3.5 h-3.5" />
              </a>
            ) : (
              <button
                onClick={onUpgrade}
                className="w-8 h-8 rounded-xl flex items-center justify-center transition-all hover:scale-110 flex-shrink-0"
                style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.2)" }}
                title="Premium download"
              >
                <Lock className="w-3.5 h-3.5" />
              </button>
            )
          )}
        </div>
      </div>
    </motion.div>
  );
}