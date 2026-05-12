import React, { useState } from "react";
import { motion } from "framer-motion";
import { PlayCircle, Bookmark, Clock, BarChart2 } from "lucide-react";

const DIFFICULTY_STYLES = {
  Beginner: { color: "#00E5FF", bg: "rgba(0,229,255,0.1)", border: "rgba(0,229,255,0.2)" },
  Intermediate: { color: "#D4A843", bg: "rgba(212,168,67,0.1)", border: "rgba(212,168,67,0.2)" },
  Advanced: { color: "#9B7EFF", bg: "rgba(155,126,255,0.1)", border: "rgba(155,126,255,0.2)" },
};

const CATEGORY_COLORS = {
  "Start Here": "#00E5FF",
  "432 Hz Music Education": "#00E5FF",
  "Subconscious Reprogramming": "#9B7EFF",
  "Manifestation Through Music": "#D4A843",
  "Nervous System Reset": "#00E5FF",
  "Daily Listening Routines": "#D4A843",
  "Artist & Song Breakdowns": "#9B7EFF",
  "Music Education": "#D4A843",
};

export default function AcademyLessonCard({ lesson, saved, onSave }) {
  const diff = DIFFICULTY_STYLES[lesson.difficulty] || DIFFICULTY_STYLES.Beginner;
  const catColor = CATEGORY_COLORS[lesson.category] || "#00E5FF";

  return (
    <motion.div
      whileHover={{ y: -3 }}
      transition={{ type: "spring", damping: 22 }}
      className="rounded-2xl overflow-hidden flex flex-col group"
      style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.06)" }}
    >
      {/* Thumbnail */}
      <div className="relative aspect-video overflow-hidden bg-black">
        {lesson.thumbnail ? (
          <img src={lesson.thumbnail} alt={lesson.title}
            className="w-full h-full object-cover opacity-55 transition-transform duration-500 group-hover:scale-105" />
        ) : (
          <div className="w-full h-full flex items-center justify-center"
            style={{ background: "rgba(255,255,255,0.02)" }}>
            <PlayCircle className="w-10 h-10 text-white/10" />
          </div>
        )}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="w-12 h-12 rounded-full flex items-center justify-center"
            style={{ background: "rgba(0,229,255,0.9)", boxShadow: "0 0 24px rgba(0,229,255,0.5)" }}>
            <PlayCircle className="w-6 h-6 text-black" />
          </div>
        </div>
        {/* Duration badge */}
        <div className="absolute bottom-2 right-2 flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-bold"
          style={{ background: "rgba(0,0,0,0.75)", color: "rgba(255,255,255,0.6)" }}>
          <Clock className="w-2.5 h-2.5" /> {lesson.duration}
        </div>
      </div>

      {/* Content */}
      <div className="p-5 flex flex-col flex-1 gap-3">
        {/* Meta row */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[9px] font-black tracking-wider uppercase px-2 py-0.5 rounded-full"
            style={{ color: catColor, background: `${catColor}18`, border: `1px solid ${catColor}30` }}>
            {lesson.category}
          </span>
          <span className="text-[9px] font-black tracking-wider uppercase px-2 py-0.5 rounded-full flex items-center gap-1"
            style={{ color: diff.color, background: diff.bg, border: `1px solid ${diff.border}` }}>
            <BarChart2 className="w-2.5 h-2.5" /> {lesson.difficulty}
          </span>
        </div>

        {/* Title & desc */}
        <div className="flex-1">
          <h3 className="font-heading font-bold text-sm text-white leading-snug mb-1.5">{lesson.title}</h3>
          <p className="text-xs text-white/35 leading-relaxed">{lesson.description}</p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 mt-auto">
          <button
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-bold text-xs tracking-wider transition-all hover:brightness-110"
            style={{ background: "rgba(0,229,255,0.1)", border: "1px solid rgba(0,229,255,0.2)", color: "#00E5FF" }}>
            <PlayCircle className="w-3.5 h-3.5" /> Watch
          </button>
          <button
            onClick={onSave}
            className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-all hover:scale-110"
            style={{
              background: saved ? "rgba(0,229,255,0.12)" : "rgba(255,255,255,0.04)",
              border: `1px solid ${saved ? "rgba(0,229,255,0.3)" : "rgba(255,255,255,0.08)"}`,
              color: saved ? "#00E5FF" : "rgba(255,255,255,0.25)",
            }}
            title="Save Lesson">
            <Bookmark className={`w-3.5 h-3.5 ${saved ? "fill-current" : ""}`} />
          </button>
        </div>
      </div>
    </motion.div>
  );
}