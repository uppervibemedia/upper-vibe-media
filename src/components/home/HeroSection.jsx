import React from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Waves, Crown, Play } from "lucide-react";

export default function HeroSection() {
  return (
    <section className="relative min-h-screen flex items-center overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0">
        <img
          src="https://media.base44.com/images/public/69cd68afb7fe90ae92757154/379cb9227_generated_3a016793.png"
          alt="Upper Vibe"
          className="w-full h-full object-cover opacity-25"
        />
        <div className="absolute inset-0" style={{ background: "linear-gradient(135deg,rgba(4,4,14,0.95) 0%,rgba(4,4,14,0.75) 50%,rgba(4,4,14,0.6) 100%)" }} />
        {/* Glow orbs */}
        <div className="absolute top-1/4 right-1/4 w-96 h-96 rounded-full opacity-[0.06] blur-3xl pointer-events-none"
          style={{ background: "radial-gradient(circle,#00E5FF,transparent)" }} />
        <div className="absolute bottom-1/3 left-1/3 w-64 h-64 rounded-full opacity-[0.05] blur-3xl pointer-events-none"
          style={{ background: "radial-gradient(circle,#D4A843,transparent)" }} />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-6 py-28 md:py-0">
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, ease: "easeOut" }}
          className="max-w-3xl"
        >
          {/* Eyebrow */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-8"
            style={{ background: "rgba(212,168,67,0.1)", border: "1px solid rgba(212,168,67,0.2)" }}
          >
            <Waves className="w-3.5 h-3.5 text-yellow-400" />
            <span className="text-xs font-bold tracking-[0.25em] uppercase text-yellow-400/90">
              High Vibration Music Platform
            </span>
          </motion.div>

          {/* Headline */}
          <h1 className="font-heading font-black leading-[0.88] mb-8 tracking-tighter">
            <motion.span
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="block text-5xl md:text-7xl lg:text-8xl text-white"
            >
              STREAM
            </motion.span>
            <motion.span
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="block text-5xl md:text-7xl lg:text-8xl text-white"
            >
              THE
            </motion.span>
            <motion.span
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="block text-5xl md:text-7xl lg:text-8xl"
              style={{ color: "#00E5FF", textShadow: "0 0 60px rgba(0,229,255,0.5), 0 0 120px rgba(0,229,255,0.2)" }}
            >
              FREQUENCY
            </motion.span>
          </h1>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.75 }}
            className="text-base md:text-xl text-white/45 leading-relaxed max-w-xl mb-10"
          >
            A private vault of 432 Hz music, mindset reprogramming sessions, exclusive drops,
            and conscious education — engineered for elevation.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.9 }}
            className="flex flex-wrap gap-4"
          >
            <Link
              to="/discover"
              className="flex items-center gap-2.5 px-6 py-3.5 rounded-full font-bold text-sm tracking-wider transition-all hover:brightness-110 hover:scale-105"
              style={{ background: "linear-gradient(135deg,#00B8D4,#00E5FF)", color: "#000", boxShadow: "0 0 30px rgba(0,229,255,0.3)" }}
            >
              <Play className="w-4 h-4" /> Enter Music Vault
            </Link>
            <Link
              to="/pricing"
              className="flex items-center gap-2.5 px-6 py-3.5 rounded-full font-bold text-sm tracking-wider transition-all hover:brightness-110 hover:scale-105"
              style={{ background: "linear-gradient(135deg,#D4A843,#F0C060)", color: "#000" }}
            >
              <Crown className="w-4 h-4" /> Become a Member
            </Link>
          </motion.div>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.1 }}
            className="flex flex-wrap gap-8 mt-14"
          >
            {[
              { value: "432 Hz", label: "Tuned Audio" },
              { value: "100%", label: "Ad-Free" },
              { value: "3 Tiers", label: "Membership" },
            ].map((stat) => (
              <div key={stat.label}>
                <p className="font-heading font-black text-2xl text-white">{stat.value}</p>
                <p className="text-xs tracking-[0.15em] uppercase text-white/30 mt-0.5">{stat.label}</p>
              </div>
            ))}
          </motion.div>
        </motion.div>
      </div>

      {/* Bottom fade */}
      <div className="absolute bottom-0 left-0 right-0 h-40"
        style={{ background: "linear-gradient(to top,#04040E,transparent)" }} />
    </section>
  );
}