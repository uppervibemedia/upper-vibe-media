import React from "react";
import { motion } from "framer-motion";
import { Sparkles, Brain, Zap } from "lucide-react";
import GlowButton from "../shared/GlowButton";

export default function AcademyUpgradeBanner() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="rounded-2xl p-6 md:p-8 bg-gradient-to-r from-accent/60 via-card/60 to-accent/40 border border-primary/20 glow-blue relative overflow-hidden"
    >
      {/* Decorative glow */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl pointer-events-none" />

      <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0">
            <Brain className="w-6 h-6 text-primary" />
          </div>
          <div>
            <p className="text-xs font-bold tracking-widest uppercase text-primary text-glow-blue mb-1">Transformation Vault</p>
            <h3 className="font-heading font-bold text-lg text-foreground mb-1">Unlock the Full Upper Vibe Academy</h3>
            <p className="text-sm text-muted-foreground max-w-md leading-relaxed">
              Supporter unlocks mindset &amp; manifestation lessons. Premium unlocks everything — the full vault, every series, every advanced collection.
            </p>
            <div className="flex flex-wrap gap-3 mt-3">
              {["Reprogram Your Mind", "Manifest Mode", "Identity Shift", "Wealth Frequency"].map((tag) => (
                <span key={tag} className="flex items-center gap-1 text-[10px] font-semibold tracking-wider uppercase text-muted-foreground border border-border/30 px-2.5 py-1 rounded-full">
                  <Zap className="w-2.5 h-2.5 text-primary" />
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 shrink-0">
          <GlowButton to="/pricing" variant="outline" size="sm">
            Supporter — $4.99/mo
          </GlowButton>
          <GlowButton to="/pricing" variant="primary" size="sm">
            <Sparkles className="w-3.5 h-3.5 mr-1.5" />
            Premium — $9.99/mo
          </GlowButton>
        </div>
      </div>
    </motion.div>
  );
}