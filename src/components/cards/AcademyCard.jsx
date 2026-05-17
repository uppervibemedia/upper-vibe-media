import React from "react";
import { motion } from "framer-motion";
import { Play, GraduationCap } from "lucide-react";
import { Link } from "react-router-dom";

export default function AcademyCard({ lesson, index = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.07, 0.35) }}
      className="group rounded-2xl overflow-hidden flex flex-col"
      style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.07)" }}
    >
      {/* 16:9 thumbnail */}
      <div className="relative aspect-video overflow-hidden flex-shrink-0">
        {lesson.thumbnail_url ? (
          <img
            src={lesson.thumbnail_url}
            alt={lesson.title}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
          />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center"
            style={{ background: "linear-gradient(135deg,rgba(155,126,255,0.12),rgba(0,229,255,0.05))" }}
          >
            <GraduationCap className="w-10 h-10 text-white/10" />
          </div>
        )}

        {/* Badges */}
        <div className="absolute top-2 left-2 flex gap-1.5 pointer-events-none">
          {lesson.is_premium && (
            <span className="px-2 py-0.5 rounded-full text-[9px] font-black tracking-wider"
              style={{ background: "rgba(212,168,67,0.9)", color: "#000" }}>PREMIUM</span>
          )}
          {lesson.is_premium && lesson.free_preview_seconds > 0 && (
            <span className="px-2 py-0.5 rounded-full text-[9px] font-bold"
              style={{ background: "rgba(0,0,0,0.7)", color: "rgba(255,255,255,0.7)" }}>
              {lesson.free_preview_seconds}s preview
            </span>
          )}
        </div>
      </div>

      {/* Info */}
      <div className="p-4 flex flex-col gap-2 flex-1">
        <p className="text-sm font-bold text-white leading-snug line-clamp-2">{lesson.title}</p>
        {lesson.description && (
          <p className="text-xs text-white/35 leading-relaxed line-clamp-2">{lesson.description}</p>
        )}
        {lesson.labels?.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-0.5">
            {lesson.labels.slice(0, 3).map((lbl) => (
              <span key={lbl} className="text-[9px] font-bold px-2 py-0.5 rounded-full"
                style={{ background: "rgba(155,126,255,0.1)", border: "1px solid rgba(155,126,255,0.2)", color: "#9B7EFF" }}>
                {lbl}
              </span>
            ))}
          </div>
        )}
        <Link
          to="/academy"
          className="mt-auto inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black tracking-wider transition-all hover:brightness-110 self-start"
          style={{ background: "rgba(155,126,255,0.1)", border: "1px solid rgba(155,126,255,0.25)", color: "#9B7EFF" }}
        >
          <Play className="w-3 h-3" /> Watch
        </Link>
      </div>
    </motion.div>
  );
}