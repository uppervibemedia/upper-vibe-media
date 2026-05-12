import React, { useState } from "react";
import { motion } from "framer-motion";
import { Play, Bookmark, Waves, Clock } from "lucide-react";

const SESSIONS = [
  {
    title: "Money Mindset 432 Hz Session",
    mood: "Abundance",
    length: "45 min",
    desc: "Rewire your relationship with wealth through intentional 432 Hz audio layered with affirmation frequency.",
    color: "#D4A843",
    bg: "rgba(212,168,67,0.07)",
    border: "rgba(212,168,67,0.18)",
  },
  {
    title: "Focus Mode Session",
    mood: "Concentration",
    length: "60 min",
    desc: "Deep work audio designed to lock you into flow state without distractions or mental chatter.",
    color: "#00E5FF",
    bg: "rgba(0,229,255,0.06)",
    border: "rgba(0,229,255,0.15)",
  },
  {
    title: "Night Reprogramming Session",
    mood: "Sleep & Reset",
    length: "90 min",
    desc: "End your day with soothing 432 Hz frequencies that program your subconscious mind while you rest.",
    color: "#9B7EFF",
    bg: "rgba(155,126,255,0.06)",
    border: "rgba(155,126,255,0.15)",
  },
  {
    title: "High Confidence Session",
    mood: "Empowerment",
    length: "30 min",
    desc: "Step into your power with high-energy frequency music tuned to activate identity and self-belief.",
    color: "#D4A843",
    bg: "rgba(212,168,67,0.07)",
    border: "rgba(212,168,67,0.18)",
  },
  {
    title: "Nervous System Reset Session",
    mood: "Healing",
    length: "40 min",
    desc: "Gentle 432 Hz compositions to calm anxiety, regulate your nervous system, and restore inner peace.",
    color: "#00E5FF",
    bg: "rgba(0,229,255,0.06)",
    border: "rgba(0,229,255,0.15)",
  },
  {
    title: "Drive & Manifest Playlist",
    mood: "Motivation",
    length: "55 min",
    desc: "Premium high-vibe hip-hop and music engineered for drive, ambition, and daily manifestation rituals.",
    color: "#9B7EFF",
    bg: "rgba(155,126,255,0.06)",
    border: "rgba(155,126,255,0.15)",
  },
];

export default function FeaturedSessionsSection() {
  const [saved, setSaved] = useState({});

  return (
    <section className="max-w-7xl mx-auto px-6 py-16">
      {/* Header */}
      <div className="flex items-end justify-between mb-10">
        <div>
          <p className="text-xs font-black tracking-[0.25em] uppercase mb-2" style={{ color: "#00E5FF" }}>
            Featured
          </p>
          <h2 className="font-heading font-black text-3xl md:text-4xl text-white">
            432 Hz Listening Sessions
          </h2>
        </div>
        <a href="/sessions"
          className="hidden md:flex items-center gap-1.5 text-xs font-bold tracking-wider uppercase text-white/25 hover:text-white/60 transition-colors">
          View All →
        </a>
      </div>

      {/* Grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {SESSIONS.map((s, i) => (
          <motion.div
            key={s.title}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.08 }}
            className="rounded-2xl p-6 flex flex-col gap-4 group"
            style={{ background: s.bg, border: `1px solid ${s.border}` }}
          >
            {/* Top row */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-bold tracking-wider uppercase px-2.5 py-1 rounded-full"
                  style={{ background: `${s.bg}`, border: `1px solid ${s.border}`, color: s.color }}>
                  {s.mood}
                </span>
                <span className="flex items-center gap-1 text-[10px] text-white/30">
                  <Clock className="w-3 h-3" /> {s.length}
                </span>
              </div>
              <button
                onClick={() => setSaved((prev) => ({ ...prev, [s.title]: !prev[s.title] }))}
                className="flex-shrink-0 transition-colors"
                style={{ color: saved[s.title] ? s.color : "rgba(255,255,255,0.2)" }}>
                <Bookmark className={`w-4 h-4 ${saved[s.title] ? "fill-current" : ""}`} />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1">
              <h3 className="font-heading font-bold text-base text-white mb-2 leading-snug">{s.title}</h3>
              <p className="text-xs text-white/35 leading-relaxed">{s.desc}</p>
            </div>

            {/* Play button */}
            <button
              className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl font-bold text-xs tracking-wider transition-all hover:brightness-110 hover:scale-[1.02] w-full justify-center"
              style={{ background: s.color, color: "#000" }}>
              <Play className="w-3.5 h-3.5" /> Play Session
            </button>
          </motion.div>
        ))}
      </div>
    </section>
  );
}