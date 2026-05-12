import React from "react";
import { motion } from "framer-motion";
import { Play, GraduationCap, Clock, Layers } from "lucide-react";
import { Link } from "react-router-dom";

export default function FeaturedCourse() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-3xl overflow-hidden relative mb-14"
      style={{
        background: "linear-gradient(135deg,rgba(0,229,255,0.07) 0%,rgba(4,4,14,0.8) 50%,rgba(212,168,67,0.06) 100%)",
        border: "1px solid rgba(0,229,255,0.15)",
      }}
    >
      {/* Glow */}
      <div className="absolute top-0 right-0 w-80 h-80 rounded-full opacity-[0.08] blur-3xl pointer-events-none translate-x-1/2 -translate-y-1/2"
        style={{ background: "radial-gradient(circle,#00E5FF,transparent)" }} />

      <div className="relative z-10 p-8 md:p-10 flex flex-col md:flex-row items-start md:items-center gap-8">
        {/* Icon */}
        <div className="w-20 h-20 rounded-2xl flex items-center justify-center flex-shrink-0"
          style={{ background: "rgba(0,229,255,0.1)", border: "1px solid rgba(0,229,255,0.2)" }}>
          <GraduationCap className="w-9 h-9 text-cyan-400" />
        </div>

        {/* Info */}
        <div className="flex-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full mb-3 text-[10px] font-black tracking-[0.2em] uppercase"
            style={{ background: "rgba(0,229,255,0.08)", border: "1px solid rgba(0,229,255,0.2)", color: "#00E5FF" }}>
            Featured Course
          </div>
          <h2 className="font-heading font-black text-2xl md:text-3xl text-white mb-2 leading-tight">
            Music Reprogramming 101
          </h2>
          <p className="text-sm text-white/45 leading-relaxed max-w-xl mb-4">
            A beginner-friendly course teaching how to use high-vibration music, repetition, lyrics, and emotion to shift your mindset and daily energy.
          </p>
          <div className="flex flex-wrap items-center gap-4 text-xs text-white/30 mb-5">
            <span className="flex items-center gap-1.5"><Layers className="w-3.5 h-3.5" /> 6 Lessons</span>
            <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> ~66 min total</span>
            <span className="flex items-center gap-1.5 text-cyan-400/70">Beginner Friendly</span>
          </div>
          <button
            className="flex items-center gap-2.5 px-6 py-3 rounded-full font-black text-sm tracking-wider transition-all hover:brightness-110 hover:scale-[1.02]"
            style={{ background: "linear-gradient(135deg,#00B8D4,#00E5FF)", color: "#000", boxShadow: "0 0 24px rgba(0,229,255,0.3)" }}>
            <Play className="w-4 h-4" /> Start Course
          </button>
        </div>
      </div>
    </motion.div>
  );
}