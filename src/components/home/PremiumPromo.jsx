import React from "react";
import { motion } from "framer-motion";
import { Crown, Waves, GraduationCap, Download, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

const PERKS = [
  { icon: Waves, label: "Full 432 Hz Library", desc: "Extended sessions + exclusive drops" },
  { icon: GraduationCap, label: "UVM Academy", desc: "Music education & mindset courses" },
  { icon: Download, label: "Downloads", desc: "Offline access to premium tracks" },
  { icon: Crown, label: "Members Only", desc: "Early access & unreleased content" },
];

export default function PremiumPromo() {
  return (
    <section className="px-6 py-16">
      <motion.div
        initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
        className="max-w-5xl mx-auto rounded-3xl overflow-hidden relative"
        style={{
          background: "linear-gradient(135deg,rgba(212,168,67,0.12) 0%,rgba(212,168,67,0.04) 50%,rgba(0,229,255,0.06) 100%)",
          border: "1px solid rgba(212,168,67,0.2)"
        }}>
        {/* Decorative orbs */}
        <div className="absolute top-0 right-0 w-80 h-80 rounded-full opacity-10 pointer-events-none -translate-y-1/2 translate-x-1/2"
          style={{ background: "radial-gradient(circle,#D4A843,transparent)" }} />
        <div className="absolute bottom-0 left-0 w-64 h-64 rounded-full opacity-[0.06] pointer-events-none translate-y-1/2 -translate-x-1/2"
          style={{ background: "radial-gradient(circle,#00E5FF,transparent)" }} />

        <div className="relative z-10 p-8 md:p-12">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
            <div className="max-w-lg">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-4 text-[10px] font-black tracking-[0.2em] uppercase"
                style={{ background: "rgba(212,168,67,0.15)", border: "1px solid rgba(212,168,67,0.25)", color: "#D4A843" }}>
                <Crown className="w-3 h-3" /> Premium Membership
              </div>
              <h2 className="font-heading font-black text-3xl md:text-4xl text-white mb-4 leading-tight">
                Unlock the Full<br />
                <span style={{ color: "#D4A843" }}>Upper Vibe Experience</span>
              </h2>
              <p className="text-white/45 text-sm leading-relaxed">
                Get access to the complete 432 Hz library, UVM Academy courses, exclusive downloads, and members-only content drops.
              </p>
            </div>
            <div className="flex-shrink-0">
              <Link to="/pricing"
                className="flex items-center gap-3 px-8 py-4 rounded-2xl font-black text-sm tracking-wider transition-all hover:brightness-110 hover:scale-105 whitespace-nowrap"
                style={{ background: "linear-gradient(135deg,#D4A843,#F0C060)", color: "#050505", boxShadow: "0 0 30px rgba(212,168,67,0.3)" }}>
                View Plans <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>

          {/* Perks grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-10">
            {PERKS.map((perk, i) => (
              <motion.div key={perk.label}
                initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }} transition={{ delay: i * 0.08 }}
                className="flex items-start gap-3 p-4 rounded-xl"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}>
                <perk.icon className="w-4 h-4 text-yellow-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-bold text-white/80">{perk.label}</p>
                  <p className="text-[10px] text-white/30 mt-0.5 leading-relaxed">{perk.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.div>
    </section>
  );
}