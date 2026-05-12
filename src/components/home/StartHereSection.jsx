import React from "react";
import { motion } from "framer-motion";
import { Play, Waves, RotateCcw } from "lucide-react";
import { Link } from "react-router-dom";

const STEPS = [
  {
    number: "01",
    icon: Play,
    title: "Watch The Intro",
    desc: "Learn how high-vibration music, repetition, and mindset training work together to shift your subconscious programming.",
    cta: "Watch Now",
    to: "/academy",
    color: "#00E5FF",
    glow: "rgba(0,229,255,0.12)",
    border: "rgba(0,229,255,0.2)",
  },
  {
    number: "02",
    icon: Waves,
    title: "Pick Your Frequency",
    desc: "Choose music tuned for focus, confidence, healing, money mindset, relaxation, or motivation — we have a session for every state.",
    cta: "Browse Sessions",
    to: "/sessions",
    color: "#D4A843",
    glow: "rgba(212,168,67,0.10)",
    border: "rgba(212,168,67,0.2)",
  },
  {
    number: "03",
    icon: RotateCcw,
    title: "Listen Daily",
    desc: "Use the music as part of your daily identity-shifting and subconscious reprogramming routine for compounding results.",
    cta: "My Library",
    to: "/downloads",
    color: "#00E5FF",
    glow: "rgba(0,229,255,0.10)",
    border: "rgba(0,229,255,0.15)",
  },
];

export default function StartHereSection() {
  return (
    <section className="max-w-6xl mx-auto px-6 py-20">
      {/* Header */}
      <div className="text-center mb-14">
        <motion.p
          initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}
          className="text-xs font-black tracking-[0.25em] uppercase mb-3"
          style={{ color: "#00E5FF" }}>
          New To Upper Vibe Media?
        </motion.p>
        <motion.h2
          initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
          className="font-heading font-black text-3xl md:text-5xl text-white">
          Start Here
        </motion.h2>
      </div>

      {/* Steps */}
      <div className="grid md:grid-cols-3 gap-5">
        {STEPS.map((step, i) => (
          <motion.div
            key={step.number}
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.12 }}
            className="relative rounded-2xl p-7 flex flex-col gap-5"
            style={{
              background: `linear-gradient(135deg,${step.glow},rgba(255,255,255,0.01))`,
              border: `1px solid ${step.border}`,
            }}
          >
            {/* Step number */}
            <span className="font-heading font-black text-5xl leading-none"
              style={{ color: step.color, opacity: 0.18 }}>
              {step.number}
            </span>

            {/* Icon */}
            <div className="w-11 h-11 rounded-xl flex items-center justify-center"
              style={{ background: `${step.glow}`, border: `1px solid ${step.border}` }}>
              <step.icon className="w-5 h-5" style={{ color: step.color }} />
            </div>

            {/* Text */}
            <div className="flex-1">
              <h3 className="font-heading font-bold text-lg text-white mb-2">{step.title}</h3>
              <p className="text-sm text-white/40 leading-relaxed">{step.desc}</p>
            </div>

            {/* CTA */}
            <Link to={step.to}
              className="inline-flex items-center gap-2 text-xs font-bold tracking-wider uppercase transition-colors hover:opacity-80"
              style={{ color: step.color }}>
              {step.cta} →
            </Link>
          </motion.div>
        ))}
      </div>
    </section>
  );
}