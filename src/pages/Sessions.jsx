import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Waves, Play, Lock, Crown, Clock, Zap } from "lucide-react";
import { base44 } from "@/api/base44Client";
import TrackCard from "../components/shared/TrackCard";
import Footer from "../components/shared/Footer";
import { Link } from "react-router-dom";

const BENEFITS = [
  { icon: Waves, label: "432 Hz Tuning", desc: "Ancient harmonic tuning said to resonate with nature's frequency" },
  { icon: Zap, label: "Neural Alignment", desc: "Designed to shift brainwave states for focus, healing, and clarity" },
  { icon: Crown, label: "Members Only", desc: "Full session library unlocked for Supporter and Premium members" },
  { icon: Clock, label: "Extended Sessions", desc: "30–90 minute uninterrupted audio experiences" },
];

export default function Sessions() {
  const [tracks, setTracks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    base44.entities.Track.filter({ status: "published", frequency_type: "432hz" }, "-created_date", 50)
      .then((t) => { setTracks(t); setLoading(false); });
  }, []);

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="relative overflow-hidden py-24 px-6">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full opacity-10"
            style={{ background: "radial-gradient(circle,#00E5FF,transparent 70%)" }} />
        </div>
        <div className="max-w-3xl mx-auto text-center relative z-10">
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }}>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-6 text-xs font-bold tracking-[0.2em] uppercase"
              style={{ background: "rgba(0,229,255,0.08)", border: "1px solid rgba(0,229,255,0.2)", color: "#00E5FF" }}>
              <Waves className="w-3.5 h-3.5" />
              432 Hz Listening Sessions
            </div>
            <h1 className="font-heading font-black text-5xl md:text-7xl tracking-tight leading-[0.9] mb-6">
              <span className="text-white">TUNE</span>
              <br />
              <span style={{ color: "#00E5FF", textShadow: "0 0 40px rgba(0,229,255,0.4)" }}>THE BODY</span>
            </h1>
            <p className="text-lg text-white/50 leading-relaxed max-w-xl mx-auto mb-8">
              Immersive audio sessions tuned to 432 Hz for healing, focus, manifestation, and deep alignment.
            </p>
            <Link to="/pricing"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full font-bold text-sm tracking-wider transition-all hover:brightness-110"
              style={{ background: "linear-gradient(135deg,#00B8D4,#00E5FF)", color: "#000" }}>
              Unlock All Sessions <Crown className="w-4 h-4" />
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Benefits */}
      <section className="max-w-5xl mx-auto px-6 pb-16">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {BENEFITS.map((b, i) => (
            <motion.div key={b.label}
              initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }} transition={{ delay: i * 0.08 }}
              className="p-4 rounded-2xl text-center"
              style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center mx-auto mb-3"
                style={{ background: "rgba(0,229,255,0.1)" }}>
                <b.icon className="w-5 h-5 text-cyan-400" />
              </div>
              <p className="text-sm font-bold text-white/80 mb-1">{b.label}</p>
              <p className="text-[11px] text-white/35 leading-relaxed">{b.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Tracks */}
      <section className="max-w-7xl mx-auto px-6 pb-20">
        <div className="flex items-center gap-3 mb-8">
          <Waves className="w-5 h-5 text-cyan-400" />
          <h2 className="font-heading font-black text-2xl text-white">432 Hz Library</h2>
          {tracks.length > 0 && (
            <span className="text-xs text-white/30 font-mono">{tracks.length} sessions</span>
          )}
        </div>

        {loading && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="aspect-square rounded-xl animate-pulse"
                style={{ background: "rgba(255,255,255,0.04)" }} />
            ))}
          </div>
        )}

        {!loading && tracks.length === 0 && (
          <div className="text-center py-20">
            <Waves className="w-12 h-12 text-white/10 mx-auto mb-4" />
            <p className="text-white/30">No 432 Hz sessions yet. Check back soon.</p>
          </div>
        )}

        {!loading && tracks.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-5">
            {tracks.map((track, i) => (
              <motion.div key={track.id}
                initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }} transition={{ delay: i * 0.04 }}>
                <TrackCard track={track} />
              </motion.div>
            ))}
          </div>
        )}
      </section>

      <Footer />
    </div>
  );
}