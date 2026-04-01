import React from "react";
import { motion } from "framer-motion";
import { Lock, Crown, Sparkles, Shield } from "lucide-react";
import TrackCard from "../components/shared/TrackCard";
import SectionHeader from "../components/shared/SectionHeader";
import GlowButton from "../components/shared/GlowButton";
import Footer from "../components/shared/Footer";

const VAULT_SECTIONS = [
  {
    title: "Exclusive Albums",
    subtitle: "Vault Only",
    tier: "premium",
    tracks: [
      { id: "v1", title: "The Awakening LP", artist: "Upper Vibe", duration: "42:00", cover_url: "https://media.base44.com/images/public/69cd68afb7fe90ae92757154/8c8572f77_generated_eba73262.png", min_tier: "premium" },
      { id: "v2", title: "Frequency Atlas", artist: "Upper Vibe", duration: "38:15", cover_url: "https://media.base44.com/images/public/69cd68afb7fe90ae92757154/04c14ab4a_generated_3bb88730.png", min_tier: "premium" },
      { id: "v3", title: "Inner Circuit", artist: "Upper Vibe", duration: "35:50", cover_url: "https://media.base44.com/images/public/69cd68afb7fe90ae92757154/213cbf8ff_generated_d250d71f.png", min_tier: "premium" },
    ],
  },
  {
    title: "Remastered Collection",
    subtitle: "Elevated Classics",
    tier: "premium",
    tracks: [
      { id: "v4", title: "Origin (Remastered)", artist: "Upper Vibe", duration: "4:12", cover_url: "https://media.base44.com/images/public/69cd68afb7fe90ae92757154/11801d304_generated_aecb4feb.png", min_tier: "premium" },
      { id: "v5", title: "Foundation (432Hz)", artist: "Upper Vibe", duration: "5:01", cover_url: "https://media.base44.com/images/public/69cd68afb7fe90ae92757154/e6873b16a_generated_f48c8f96.png", min_tier: "premium" },
      { id: "v6", title: "Ascension (Lossless)", artist: "Upper Vibe", duration: "6:33", cover_url: "https://media.base44.com/images/public/69cd68afb7fe90ae92757154/b5544df7f_generated_ee779889.png", min_tier: "premium" },
    ],
  },
  {
    title: "Unreleased Drops",
    subtitle: "Premium Exclusive",
    tier: "premium",
    tracks: [
      { id: "v7", title: "Unreleased: Signal", artist: "Upper Vibe", duration: "3:55", cover_url: "https://media.base44.com/images/public/69cd68afb7fe90ae92757154/04c14ab4a_generated_3bb88730.png", min_tier: "premium" },
      { id: "v8", title: "Unreleased: Epoch", artist: "Upper Vibe", duration: "4:42", cover_url: "https://media.base44.com/images/public/69cd68afb7fe90ae92757154/8c8572f77_generated_eba73262.png", min_tier: "premium" },
      { id: "v9", title: "Unreleased: Zenith", artist: "Upper Vibe", duration: "5:18", cover_url: "https://media.base44.com/images/public/69cd68afb7fe90ae92757154/213cbf8ff_generated_d250d71f.png", min_tier: "premium" },
    ],
  },
  {
    title: "Frequency Playlists",
    subtitle: "Supporter & Above",
    tier: "supporter",
    tracks: [
      { id: "v10", title: "Morning Ascension", artist: "Upper Vibe", duration: "45:00", cover_url: "https://media.base44.com/images/public/69cd68afb7fe90ae92757154/b5544df7f_generated_ee779889.png", min_tier: "supporter" },
      { id: "v11", title: "Deep Focus 432Hz", artist: "Upper Vibe", duration: "60:00", cover_url: "https://media.base44.com/images/public/69cd68afb7fe90ae92757154/11801d304_generated_aecb4feb.png", min_tier: "supporter" },
      { id: "v12", title: "Night Protocol", artist: "Upper Vibe", duration: "55:00", cover_url: "https://media.base44.com/images/public/69cd68afb7fe90ae92757154/e6873b16a_generated_f48c8f96.png", min_tier: "supporter" },
    ],
  },
];

export default function Vault() {
  return (
    <div>
      {/* Hero */}
      <div className="relative h-64 md:h-80 overflow-hidden">
        <img
          src="https://media.base44.com/images/public/69cd68afb7fe90ae92757154/70e23e35f_generated_b5746c08.png"
          alt="Premium Vault"
          className="w-full h-full object-cover opacity-30"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-background/40" />
        <div className="absolute inset-0 flex items-end">
          <div className="max-w-7xl mx-auto px-6 pb-8 w-full">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-secondary/30 bg-secondary/5 mb-4">
                <Lock className="w-3 h-3 text-secondary" />
                <span className="text-[10px] font-bold tracking-widest uppercase text-secondary">Members Only</span>
              </div>
              <h1 className="font-heading font-extrabold text-4xl md:text-6xl tracking-tight text-foreground">
                The Premium <span className="text-secondary text-glow-gold">Vault</span>
              </h1>
              <p className="text-sm text-muted-foreground mt-2 max-w-md">
                The exclusive inner-circle music archive. Enter the Upper Vibe Vault.
              </p>
            </motion.div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-12">
        {/* Upgrade prompt */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="rounded-xl p-6 bg-gradient-to-r from-accent/40 to-card/40 border border-secondary/20 mb-12 flex flex-col md:flex-row md:items-center md:justify-between gap-4"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-secondary/10 flex items-center justify-center">
              <Crown className="w-6 h-6 text-secondary" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">Unlock the full Vault experience</p>
              <p className="text-xs text-muted-foreground">Subscribe to access exclusive albums, remastered tracks & unreleased drops</p>
            </div>
          </div>
          <GlowButton to="/pricing" variant="secondary" size="sm">
            <Sparkles className="w-3.5 h-3.5 mr-1.5" />
            Subscribe Now
          </GlowButton>
        </motion.div>

        {/* Vault sections */}
        {VAULT_SECTIONS.map((section, si) => (
          <motion.section
            key={section.title}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: si * 0.1 }}
            className="mb-14"
          >
            <SectionHeader
              title={section.title}
              subtitle={section.subtitle}
              glowColor={section.tier === "premium" ? "blue" : "blue"}
            />
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
              {section.tracks.map((track) => (
                <TrackCard key={track.id} track={track} locked />
              ))}
            </div>
          </motion.section>
        ))}
      </div>

      <Footer />
    </div>
  );
}