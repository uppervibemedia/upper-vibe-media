import React from "react";
import { motion } from "framer-motion";
import { Star } from "lucide-react";

const testimonials = [
  {
    name: "Alex R.",
    tier: "Premium",
    text: "Upper Vibe completely changed how I experience music. The 432 Hz collection alone is worth the subscription.",
    stars: 5,
  },
  {
    name: "Maya K.",
    tier: "Premium",
    text: "The exclusive drops are incredible. It feels like being part of an inner circle of conscious listeners.",
    stars: 5,
  },
  {
    name: "Jordan T.",
    tier: "Supporter",
    text: "I've never heard music curated with this level of intention. Every track feels like it was made for a higher state of mind.",
    stars: 5,
  },
];

export default function TestimonialsSection() {
  return (
    <section className="max-w-5xl mx-auto px-6 py-16">
      <div className="text-center mb-10">
        <p className="text-xs font-bold tracking-[0.2em] uppercase mb-3 text-cyan-400/60">Community</p>
        <h2 className="font-heading font-black text-3xl md:text-4xl text-white">The Community Speaks</h2>
      </div>

      <div className="grid md:grid-cols-3 gap-5">
        {testimonials.map((t, i) => (
          <motion.div
            key={t.name}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.1 }}
            className="rounded-2xl p-6 transition-all"
            style={{
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.06)"
            }}
          >
            <div className="flex gap-0.5 mb-4">
              {Array.from({ length: t.stars }).map((_, j) => (
                <Star key={j} className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
              ))}
            </div>
            <p className="text-sm text-white/60 leading-relaxed mb-5">"{t.text}"</p>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-black"
                style={{ background: "rgba(0,229,255,0.1)", color: "#00E5FF", border: "1px solid rgba(0,229,255,0.2)" }}>
                {t.name[0]}
              </div>
              <div>
                <p className="text-xs font-bold text-white/80">{t.name}</p>
                <p className="text-[10px] text-cyan-400/60 tracking-wider">{t.tier} Member</p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}