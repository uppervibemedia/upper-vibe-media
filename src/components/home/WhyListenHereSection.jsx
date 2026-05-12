import React from "react";
import { motion } from "framer-motion";
import { Music, Waves, Download, BookOpen, Zap, Heart, X, Check } from "lucide-react";

const STREAMING_CONS = [
  "Generic algorithm-driven playlists",
  "Standard 440 Hz tuning only",
  "Ads and interruptions",
  "No educational context",
  "No downloadable files",
  "No personalized sessions",
];

const UVM_PROS = [
  { icon: Waves, text: "Exclusive 432 Hz versions", color: "#00E5FF" },
  { icon: Zap, text: "Extended focus sessions", color: "#00E5FF" },
  { icon: Download, text: "Downloadable MP3 & WAV files", color: "#D4A843" },
  { icon: BookOpen, text: "Educational videos paired with music", color: "#D4A843" },
  { icon: Music, text: "Early access releases", color: "#00E5FF" },
  { icon: Heart, text: "Save favorites to My Library", color: "#D4A843" },
];

export default function WhyListenHereSection() {
  return (
    <section className="px-6 py-16">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <motion.p initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}
            className="text-xs font-black tracking-[0.25em] uppercase mb-3 text-white/30">
            The Difference
          </motion.p>
          <motion.h2 initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
            className="font-heading font-black text-3xl md:text-5xl text-white leading-tight">
            Why Listen Here Instead<br className="hidden md:block" /> Of Streaming Apps?
          </motion.h2>
        </div>

        <div className="grid md:grid-cols-2 gap-5">
          {/* Generic streaming */}
          <motion.div
            initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}
            className="rounded-2xl p-7"
            style={{ background: "rgba(255,255,255,0.015)", border: "1px solid rgba(255,255,255,0.05)", opacity: 0.55 }}>
            <h3 className="text-xs font-black tracking-[0.2em] uppercase text-white/30 mb-6">
              Generic Streaming Apps
            </h3>
            <ul className="space-y-4">
              {STREAMING_CONS.map((item) => (
                <li key={item} className="flex items-center gap-3 text-white/25">
                  <X className="w-4 h-4 text-red-500/40 flex-shrink-0" />
                  <span className="text-sm">{item}</span>
                </li>
              ))}
            </ul>
          </motion.div>

          {/* Upper Vibe */}
          <motion.div
            initial={{ opacity: 0, x: 20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}
            className="rounded-2xl p-7"
            style={{
              background: "linear-gradient(135deg,rgba(0,229,255,0.06),rgba(212,168,67,0.04))",
              border: "1px solid rgba(0,229,255,0.15)",
              boxShadow: "0 0 50px rgba(0,229,255,0.05)"
            }}>
            <h3 className="text-xs font-black tracking-[0.2em] uppercase mb-6" style={{ color: "#00E5FF" }}>
              Upper Vibe Media
            </h3>
            <ul className="space-y-4">
              {UVM_PROS.map((item) => (
                <li key={item.text} className="flex items-center gap-3 text-white/75">
                  <Check className="w-4 h-4 flex-shrink-0" style={{ color: item.color }} />
                  <span className="text-sm">{item.text}</span>
                </li>
              ))}
            </ul>
          </motion.div>
        </div>
      </div>
    </section>
  );
}