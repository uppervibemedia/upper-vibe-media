import React from "react";
import { motion } from "framer-motion";
import { Play, Waves, Tv2, Heart } from "lucide-react";
import { Link } from "react-router-dom";

export default function VisualizerCard({ viz, index = 0, isFaved = false, onHeart }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.06, 0.36) }}
      className="group rounded-2xl overflow-hidden flex flex-col"
      style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.07)" }}
    >
      {/* 16:9 thumbnail */}
      <div className="relative aspect-video overflow-hidden flex-shrink-0">
        {viz.thumbnail_url ? (
          <img
            src={viz.thumbnail_url}
            alt={viz.title}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
          />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center"
            style={{ background: "linear-gradient(135deg,rgba(155,126,255,0.1),rgba(0,229,255,0.05))" }}
          >
            <Tv2 className="w-10 h-10 text-white/10" />
          </div>
        )}

        {/* Play overlay */}
        <Link
          to="/visualizers"
          className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
          style={{ background: "rgba(0,0,0,0.52)" }}
        >
          <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ background: "rgba(155,126,255,0.9)" }}>
            <Play className="w-6 h-6 text-white ml-0.5" />
          </div>
        </Link>
      </div>

      {/* Info */}
      <div className="p-4 flex items-start justify-between gap-2 flex-1">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-white truncate leading-tight">{viz.title}</p>
          <p className="text-xs text-white/40 truncate mt-0.5">{viz.artist || "Upper Vibe Media"}</p>
          <span className="inline-flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full mt-2"
            style={{ background: "rgba(0,229,255,0.1)", color: "#00E5FF" }}>
            <Waves className="w-2 h-2" /> 432 Hz
          </span>
        </div>
        {onHeart && (
          <button
            onClick={(e) => { e.stopPropagation(); onHeart(viz); }}
            className="flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center transition-all hover:scale-110 mt-0.5"
            style={isFaved ? { color: "#ec4899" } : { color: "rgba(255,255,255,0.2)" }}
          >
            <Heart className={`w-3.5 h-3.5 ${isFaved ? "fill-current" : ""}`} />
          </button>
        )}
      </div>
    </motion.div>
  );
}