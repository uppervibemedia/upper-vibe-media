import React from "react";
import { motion } from "framer-motion";
import { PlayCircle, Clock, BookOpen } from "lucide-react";
import { Link } from "react-router-dom";

const VIDEOS = [
  {
    title: "How 432 Hz Music Works",
    category: "Science & Sound",
    duration: "12 min",
    desc: "A breakdown of how 432 Hz tuning differs from standard 440 Hz and why it matters for your nervous system.",
    thumb: "https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?w=600&q=80",
  },
  {
    title: "How To Reprogram Your Mind With Repetition",
    category: "Mindset",
    duration: "18 min",
    desc: "Learn the science of repetition-based subconscious reprogramming and how music amplifies the process.",
    thumb: "https://images.unsplash.com/photo-1559752107-1f1b2b2e7b4e?w=600&q=80",
  },
  {
    title: "How To Use Music While Visualizing",
    category: "Manifestation",
    duration: "14 min",
    desc: "Step-by-step guide to combining visualization techniques with curated frequency music for maximum impact.",
    thumb: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=600&q=80",
  },
  {
    title: "Morning Music Routines",
    category: "Daily Practice",
    duration: "9 min",
    desc: "Build a 30-minute morning audio ritual that primes your identity, energy, and mindset for the day.",
    thumb: "https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=600&q=80",
  },
  {
    title: "Nighttime Reprogramming Sessions",
    category: "Sleep & Reset",
    duration: "16 min",
    desc: "How to use the hypnagogic state before sleep to install new beliefs and subconscious patterns.",
    thumb: "https://images.unsplash.com/photo-1419242902214-272b3f66ee7a?w=600&q=80",
  },
  {
    title: "Why Lyrics Matter To Your Subconscious",
    category: "Psychology",
    duration: "11 min",
    desc: "Understand how repeated lyrics shape identity, self-talk, and emotional states over time.",
    thumb: "https://images.unsplash.com/photo-1510915361894-db8b60106cb1?w=600&q=80",
  },
];

export default function EducationalVideosSection() {
  return (
    <section className="max-w-7xl mx-auto px-6 py-16">
      {/* Header */}
      <div className="flex items-end justify-between mb-10">
        <div>
          <p className="text-xs font-black tracking-[0.25em] uppercase mb-2" style={{ color: "#D4A843" }}>
            UVM Academy
          </p>
          <h2 className="font-heading font-black text-3xl md:text-4xl text-white">
            Latest Educational Videos
          </h2>
        </div>
        <Link to="/academy"
          className="hidden md:flex items-center gap-1.5 text-xs font-bold tracking-wider uppercase text-white/25 hover:text-white/60 transition-colors">
          View All →
        </Link>
      </div>

      {/* Grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {VIDEOS.map((v, i) => (
          <motion.div
            key={v.title}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.07 }}
            className="rounded-2xl overflow-hidden group cursor-pointer"
            style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.06)" }}>
            {/* Thumbnail */}
            <div className="relative aspect-video overflow-hidden">
              <img src={v.thumb} alt={v.title}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105 opacity-60" />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-12 h-12 rounded-full flex items-center justify-center backdrop-blur-sm transition-all group-hover:scale-110"
                  style={{ background: "rgba(212,168,67,0.85)" }}>
                  <PlayCircle className="w-6 h-6 text-black" />
                </div>
              </div>
              <div className="absolute bottom-2 right-2 flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-bold"
                style={{ background: "rgba(0,0,0,0.7)", color: "rgba(255,255,255,0.7)" }}>
                <Clock className="w-2.5 h-2.5" /> {v.duration}
              </div>
            </div>

            {/* Content */}
            <div className="p-5">
              <div className="flex items-center gap-2 mb-3">
                <BookOpen className="w-3 h-3 text-yellow-400/60" />
                <span className="text-[10px] font-bold tracking-wider uppercase text-yellow-400/60">{v.category}</span>
              </div>
              <h3 className="font-heading font-bold text-sm text-white leading-snug mb-2">{v.title}</h3>
              <p className="text-xs text-white/30 leading-relaxed mb-4">{v.desc}</p>
              <Link to="/academy"
                className="inline-flex items-center gap-2 text-xs font-bold tracking-wider uppercase transition-colors"
                style={{ color: "#D4A843" }}>
                Watch Free →
              </Link>
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}