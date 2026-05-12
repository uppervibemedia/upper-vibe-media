import React from "react";
import { motion } from "framer-motion";
import { Waves, Zap, Headphones, Music4 } from "lucide-react";
import { Link } from "react-router-dom";
import Footer from "../components/shared/Footer";

const PILLARS = [
  { icon: Waves, title: "432 Hz Music", desc: "We use 432 Hz tuning for deeper resonance, calm energy, and a more natural listening experience." },
  { icon: Zap, title: "High-Vibration Sound", desc: "Every track is curated to carry positive energy, motivation, and futuristic frequency." },
  { icon: Music4, title: "All Genres", desc: "Hip hop, R&B, electronic, instrumentals, and meditation — all tuned to elevate your state of mind." },
  { icon: Headphones, title: "Focus & Self-Mastery", desc: "Music built for focus sessions, motivation, driving, and inner alignment." },
];

export default function About() {
  return (
    <div className="min-h-screen">
      <div className="max-w-4xl mx-auto px-6 pt-24 pb-16">
        {/* Hero */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-16 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-6 text-[10px] font-black tracking-[0.3em] uppercase"
            style={{ background: "rgba(0,229,255,0.08)", border: "1px solid rgba(0,229,255,0.18)", color: "#00E5FF" }}>
            <Waves className="w-3 h-3" /> About Us
          </div>
          <h1 className="font-heading font-black text-5xl md:text-6xl text-white leading-tight mb-6">
            Upper Vibe Media
          </h1>
          <p className="text-lg text-white/45 leading-relaxed max-w-2xl mx-auto">
            Upper Vibe Media is a music brand focused on high-vibration sound, 432 Hz music, futuristic energy, motivation, focus, and self-mastery.
          </p>
        </motion.div>

        {/* Mission */}
        <motion.div
          initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
          className="rounded-3xl p-10 mb-14 text-center"
          style={{ background: "rgba(0,229,255,0.04)", border: "1px solid rgba(0,229,255,0.1)" }}>
          <p className="text-xl md:text-2xl text-white/70 leading-relaxed font-medium">
            We believe music is more than entertainment — it's a frequency that shapes your mindset, your energy, and your reality. Every track we release is crafted with intention.
          </p>
        </motion.div>

        {/* Pillars */}
        <div className="grid sm:grid-cols-2 gap-5 mb-16">
          {PILLARS.map((p, i) => (
            <motion.div
              key={p.title}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="flex gap-4 p-6 rounded-2xl"
              style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.06)" }}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: "rgba(0,229,255,0.1)", border: "1px solid rgba(0,229,255,0.15)" }}>
                <p.icon className="w-5 h-5 text-cyan-400" />
              </div>
              <div>
                <h3 className="font-heading font-bold text-white mb-1">{p.title}</h3>
                <p className="text-sm text-white/40 leading-relaxed">{p.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
          className="text-center">
          <p className="text-white/30 mb-6 text-sm">Ready to start listening?</p>
          <Link to="/music"
            className="inline-flex items-center gap-3 px-10 py-4 rounded-full font-black text-sm tracking-wider transition-all hover:brightness-110 hover:scale-[1.02]"
            style={{ background: "linear-gradient(135deg,#00B8D4,#00E5FF)", color: "#000", boxShadow: "0 0 32px rgba(0,229,255,0.25)" }}>
            <Headphones className="w-5 h-5" /> Start Listening
          </Link>
        </motion.div>
      </div>
      <Footer />
    </div>
  );
}