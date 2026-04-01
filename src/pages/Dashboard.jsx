import React from "react";
import { motion } from "framer-motion";
import { Crown, Play, Clock, Heart, ListMusic, ArrowUpRight } from "lucide-react";
import TrackCard from "../components/shared/TrackCard";
import SectionHeader from "../components/shared/SectionHeader";
import GlowButton from "../components/shared/GlowButton";
import { usePlayer } from "../context/PlayerContext";

const CONTINUE_LISTENING = [
  { id: "cl1", title: "Elevated State", artist: "Upper Vibe", duration: "4:12", cover_url: "https://media.base44.com/images/public/69cd68afb7fe90ae92757154/8c8572f77_generated_eba73262.png", min_tier: "free" },
  { id: "cl2", title: "Neural Bloom 432Hz", artist: "Upper Vibe", duration: "5:33", cover_url: "https://media.base44.com/images/public/69cd68afb7fe90ae92757154/11801d304_generated_aecb4feb.png", min_tier: "free" },
  { id: "cl3", title: "Crown Frequency", artist: "Upper Vibe", duration: "3:47", cover_url: "https://media.base44.com/images/public/69cd68afb7fe90ae92757154/213cbf8ff_generated_d250d71f.png", min_tier: "free" },
];

const RECENTLY_ADDED = [
  { id: "ra1", title: "Vault Session 01", artist: "Upper Vibe", duration: "4:55", cover_url: "https://media.base44.com/images/public/69cd68afb7fe90ae92757154/e6873b16a_generated_f48c8f96.png", min_tier: "premium" },
  { id: "ra2", title: "Deep Focus Alpha", artist: "Upper Vibe", duration: "8:20", cover_url: "https://media.base44.com/images/public/69cd68afb7fe90ae92757154/b5544df7f_generated_ee779889.png", min_tier: "free" },
  { id: "ra3", title: "Intention Protocol", artist: "Upper Vibe", duration: "6:01", cover_url: "https://media.base44.com/images/public/69cd68afb7fe90ae92757154/04c14ab4a_generated_3bb88730.png", min_tier: "vip" },
  { id: "ra4", title: "Reprogramming II", artist: "Upper Vibe", duration: "5:44", cover_url: "https://media.base44.com/images/public/69cd68afb7fe90ae92757154/8c8572f77_generated_eba73262.png", min_tier: "free" },
];

const PLAYLISTS = [
  { name: "Morning Elevation", tracks: 12, cover: "https://media.base44.com/images/public/69cd68afb7fe90ae92757154/8c8572f77_generated_eba73262.png" },
  { name: "Focus Protocol", tracks: 8, cover: "https://media.base44.com/images/public/69cd68afb7fe90ae92757154/b5544df7f_generated_ee779889.png" },
  { name: "432Hz Journey", tracks: 15, cover: "https://media.base44.com/images/public/69cd68afb7fe90ae92757154/11801d304_generated_aecb4feb.png" },
];

export default function Dashboard() {
  return (
    <div className="max-w-7xl mx-auto px-6 py-8 md:py-12">
      {/* Welcome header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-10"
      >
        <p className="text-xs tracking-[0.2em] uppercase text-primary mb-2 text-glow-blue">Welcome Back</p>
        <h1 className="font-heading font-extrabold text-3xl md:text-4xl tracking-tight text-foreground">
          Your Frequency Hub
        </h1>
      </motion.div>

      {/* Subscription status card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="rounded-xl p-5 md:p-6 bg-card/40 border border-primary/20 glow-blue mb-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4"
      >
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
            <Crown className="w-6 h-6 text-primary" />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">Current Plan: <span className="text-primary">Free</span></p>
            <p className="text-xs text-muted-foreground mt-0.5">Upgrade to Supporter ($4.99) or Premium ($9.99) to unlock the full experience</p>
          </div>
        </div>
        <GlowButton to="/pricing" variant="secondary" size="sm">
          <ArrowUpRight className="w-3.5 h-3.5 mr-1.5" />
          Upgrade Tier
        </GlowButton>
      </motion.div>

      {/* Continue Listening */}
      <section className="mb-12">
        <SectionHeader title="Continue Listening" subtitle="Pick up where you left off" />
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {CONTINUE_LISTENING.map((track, i) => (
            <motion.div
              key={track.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + i * 0.05 }}
            >
              <TrackCard track={track} />
            </motion.div>
          ))}
        </div>
      </section>

      {/* Recently Added */}
      <section className="mb-12">
        <SectionHeader title="Recently Added" subtitle="Fresh Drops" glowColor="gold" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {RECENTLY_ADDED.map((track, i) => (
            <motion.div
              key={track.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 + i * 0.05 }}
            >
              <TrackCard track={track} locked={track.min_tier !== "free"} />
            </motion.div>
          ))}
        </div>
      </section>

      {/* Playlists */}
      <section className="mb-12">
        <SectionHeader title="Your Playlists" subtitle="Curated for You" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {PLAYLISTS.map((pl, i) => (
            <motion.div
              key={pl.name}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + i * 0.05 }}
              whileHover={{ scale: 1.02 }}
              className="group flex items-center gap-4 p-4 rounded-xl bg-card/40 border border-border/20 hover:border-primary/20 transition-all cursor-pointer"
            >
              <img src={pl.cover} alt={pl.name} className="w-14 h-14 rounded-lg object-cover" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{pl.name}</p>
                <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                  <ListMusic className="w-3 h-3" />
                  {pl.tracks} tracks
                </p>
              </div>
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <Play className="w-3.5 h-3.5 text-primary ml-0.5" />
              </div>
            </motion.div>
          ))}
        </div>
      </section>
    </div>
  );
}