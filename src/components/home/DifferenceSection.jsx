import React from "react";
import { motion } from "framer-motion";
import { Waves, Zap, Shield, Gem, X, Check } from "lucide-react";

const traditional = [
  "Algorithm-driven playlists",
  "Compressed audio quality",
  "Ads & interruptions",
  "No exclusive content",
  "Generic experience",
];

const upperVibe = [
  { text: "Curated high-frequency music", icon: Waves },
  { text: "432 Hz & intentional tuning", icon: Zap },
  { text: "Ad-free premium experience", icon: Shield },
  { text: "Exclusive unreleased drops", icon: Gem },
  { text: "Mindset + music education", icon: Waves },
];

export default function DifferenceSection() {
  return (
    <section className="max-w-5xl mx-auto px-6 py-16">
      <div className="text-center mb-12">
        <p className="text-xs font-bold tracking-[0.2em] uppercase mb-3 text-yellow-400/80">Why We're Different</p>
        <h2 className="font-heading font-black text-3xl md:text-5xl text-white">The Upper Vibe Difference</h2>
      </div>

      <div className="grid md:grid-cols-2 gap-5">
        {/* Traditional */}
        <motion.div
          initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}
          className="rounded-2xl p-6 md:p-8 opacity-50"
          style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
          <h3 className="font-heading font-bold text-base text-white/40 mb-6 tracking-wider uppercase">Traditional Streaming</h3>
          <ul className="space-y-4">
            {traditional.map((item) => (
              <li key={item} className="flex items-center gap-3 text-white/30">
                <X className="w-4 h-4 text-red-500/50 flex-shrink-0" />
                <span className="text-sm">{item}</span>
              </li>
            ))}
          </ul>
        </motion.div>

        {/* Upper Vibe */}
        <motion.div
          initial={{ opacity: 0, x: 20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}
          className="rounded-2xl p-6 md:p-8"
          style={{
            background: "linear-gradient(135deg,rgba(0,229,255,0.07),rgba(0,229,255,0.02))",
            border: "1px solid rgba(0,229,255,0.15)",
            boxShadow: "0 0 40px rgba(0,229,255,0.06)"
          }}>
          <h3 className="font-heading font-bold text-base tracking-wider uppercase mb-6"
            style={{ color: "#00E5FF" }}>Upper Vibe Media</h3>
          <ul className="space-y-4">
            {upperVibe.map((item) => (
              <li key={item.text} className="flex items-center gap-3 text-white/80">
                <Check className="w-4 h-4 text-cyan-400 flex-shrink-0" />
                <span className="text-sm">{item.text}</span>
              </li>
            ))}
          </ul>
        </motion.div>
      </div>
    </section>
  );
}