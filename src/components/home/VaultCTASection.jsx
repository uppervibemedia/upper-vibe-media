import React from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Crown, Music4 } from "lucide-react";

export default function VaultCTASection() {
  return (
    <section className="px-6 py-20">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="max-w-4xl mx-auto rounded-3xl overflow-hidden relative text-center"
        style={{
          background: "linear-gradient(135deg,rgba(0,229,255,0.07) 0%,rgba(4,4,14,0.8) 40%,rgba(212,168,67,0.07) 100%)",
          border: "1px solid rgba(255,255,255,0.07)",
        }}
      >
        {/* Decorative glows */}
        <div className="absolute top-0 left-0 w-64 h-64 rounded-full opacity-[0.12] blur-3xl pointer-events-none -translate-x-1/2 -translate-y-1/2"
          style={{ background: "radial-gradient(circle,#00E5FF,transparent)" }} />
        <div className="absolute bottom-0 right-0 w-64 h-64 rounded-full opacity-[0.1] blur-3xl pointer-events-none translate-x-1/2 translate-y-1/2"
          style={{ background: "radial-gradient(circle,#D4A843,transparent)" }} />

        <div className="relative z-10 px-8 py-16 md:py-20 md:px-16">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-8"
            style={{ background: "rgba(212,168,67,0.1)", border: "1px solid rgba(212,168,67,0.25)" }}>
            <Crown className="w-3.5 h-3.5 text-yellow-400" />
            <span className="text-[11px] font-black tracking-[0.25em] uppercase text-yellow-400/90">
              Members Only
            </span>
          </div>

          <h2 className="font-heading font-black text-4xl md:text-6xl text-white mb-5 tracking-tight leading-tight">
            Enter The Vault
          </h2>

          <p className="text-base md:text-lg text-white/40 leading-relaxed max-w-xl mx-auto mb-10">
            Get exclusive 432 Hz downloads, unreleased music, guided listening sessions, and Upper Vibe Academy lessons — all in one place.
          </p>

          <div className="flex flex-wrap gap-4 justify-center">
            <Link to="/pricing"
              className="flex items-center gap-2.5 px-8 py-4 rounded-full font-black text-sm tracking-wider transition-all hover:brightness-110 hover:scale-[1.03]"
              style={{ background: "linear-gradient(135deg,#D4A843,#F0C060)", color: "#000", boxShadow: "0 0 30px rgba(212,168,67,0.3)" }}>
              <Crown className="w-4 h-4" /> View Membership
            </Link>
            <Link to="/discover"
              className="flex items-center gap-2.5 px-8 py-4 rounded-full font-black text-sm tracking-wider transition-all hover:brightness-110 hover:scale-[1.03]"
              style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", color: "#fff" }}>
              <Music4 className="w-4 h-4" /> Explore Free Music
            </Link>
          </div>
        </div>
      </motion.div>
    </section>
  );
}