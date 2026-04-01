import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, X } from "lucide-react";
import TrackCard from "../components/shared/TrackCard";
import SectionHeader from "../components/shared/SectionHeader";
import Footer from "../components/shared/Footer";

const CATEGORIES = [
  { id: "all", label: "All" },
  { id: "high_vibe_hiphop", label: "High Vibe Hip-Hop" },
  { id: "reprogramming_sessions", label: "Reprogramming Sessions" },
  { id: "432_collection", label: "432 Collection" },
  { id: "remastered", label: "Remastered" },
  { id: "exclusive_drops", label: "Exclusive Drops" },
  { id: "meditation_focus", label: "Meditation / Focus" },
];

const SAMPLE_TRACKS = [
  { id: "d1", title: "Elevated State", artist: "Upper Vibe", duration: "4:12", cover_url: "https://media.base44.com/images/public/69cd68afb7fe90ae92757154/8c8572f77_generated_eba73262.png", category: "high_vibe_hiphop", min_tier: "free" },
  { id: "d2", title: "Neural Bloom 432Hz", artist: "Upper Vibe", duration: "5:33", cover_url: "https://media.base44.com/images/public/69cd68afb7fe90ae92757154/11801d304_generated_aecb4feb.png", category: "432_collection", min_tier: "premium" },
  { id: "d3", title: "Crown Frequency", artist: "Upper Vibe", duration: "3:47", cover_url: "https://media.base44.com/images/public/69cd68afb7fe90ae92757154/213cbf8ff_generated_d250d71f.png", category: "high_vibe_hiphop", min_tier: "free" },
  { id: "d4", title: "Intention Protocol", artist: "Upper Vibe", duration: "6:01", cover_url: "https://media.base44.com/images/public/69cd68afb7fe90ae92757154/04c14ab4a_generated_3bb88730.png", category: "reprogramming_sessions", min_tier: "vip" },
  { id: "d5", title: "Vault Session 01", artist: "Upper Vibe", duration: "4:55", cover_url: "https://media.base44.com/images/public/69cd68afb7fe90ae92757154/e6873b16a_generated_f48c8f96.png", category: "exclusive_drops", min_tier: "premium" },
  { id: "d6", title: "Deep Focus Alpha", artist: "Upper Vibe", duration: "8:20", cover_url: "https://media.base44.com/images/public/69cd68afb7fe90ae92757154/b5544df7f_generated_ee779889.png", category: "meditation_focus", min_tier: "supporter" },
  { id: "d7", title: "Remastered: Origin", artist: "Upper Vibe", duration: "3:58", cover_url: "https://media.base44.com/images/public/69cd68afb7fe90ae92757154/8c8572f77_generated_eba73262.png", category: "remastered", min_tier: "premium" },
  { id: "d8", title: "High Vibe Cypher", artist: "Upper Vibe", duration: "4:30", cover_url: "https://media.base44.com/images/public/69cd68afb7fe90ae92757154/213cbf8ff_generated_d250d71f.png", category: "high_vibe_hiphop", min_tier: "free" },
  { id: "d9", title: "Frequency Reset", artist: "Upper Vibe", duration: "7:15", cover_url: "https://media.base44.com/images/public/69cd68afb7fe90ae92757154/11801d304_generated_aecb4feb.png", category: "432_collection", min_tier: "supporter" },
  { id: "d10", title: "Reprogramming II", artist: "Upper Vibe", duration: "5:44", cover_url: "https://media.base44.com/images/public/69cd68afb7fe90ae92757154/04c14ab4a_generated_3bb88730.png", category: "reprogramming_sessions", min_tier: "free" },
  { id: "d11", title: "Exclusive Drop #7", artist: "Upper Vibe", duration: "3:12", cover_url: "https://media.base44.com/images/public/69cd68afb7fe90ae92757154/e6873b16a_generated_f48c8f96.png", category: "exclusive_drops", min_tier: "vip" },
  { id: "d12", title: "Theta Waves", artist: "Upper Vibe", duration: "10:00", cover_url: "https://media.base44.com/images/public/69cd68afb7fe90ae92757154/b5544df7f_generated_ee779889.png", category: "meditation_focus", min_tier: "free" },
];

export default function Discover() {
  const [activeCategory, setActiveCategory] = useState("all");
  const [search, setSearch] = useState("");

  const filtered = SAMPLE_TRACKS.filter((t) => {
    const matchesCategory = activeCategory === "all" || t.category === activeCategory;
    const matchesSearch = !search || t.title.toLowerCase().includes(search.toLowerCase()) || t.artist.toLowerCase().includes(search.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div>
      {/* Hero banner */}
      <div className="relative h-48 md:h-64 overflow-hidden">
        <img
          src="https://media.base44.com/images/public/69cd68afb7fe90ae92757154/7fa1b96e5_generated_89d5ed9d.png"
          alt="Discover music"
          className="w-full h-full object-cover opacity-30"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/70 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-6">
          <div className="max-w-7xl mx-auto">
            <SectionHeader title="Discover" subtitle="Explore the Frequency" />
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Search bar */}
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            placeholder="Search tracks or artists..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-card/40 border border-border/30 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 transition-colors"
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Category tabs */}
        <div className="flex gap-2 overflow-x-auto pb-4 mb-8 scrollbar-hide">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`whitespace-nowrap px-4 py-2 rounded-full text-xs font-semibold tracking-wider uppercase transition-all border ${
                activeCategory === cat.id
                  ? "bg-primary/10 border-primary/40 text-primary"
                  : "border-border/30 text-muted-foreground hover:text-foreground hover:border-border/60"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Empty state */}
        {filtered.length === 0 && (
          <p className="text-center text-muted-foreground text-sm py-16">No tracks found for "<span className="text-foreground">{search}</span>"</p>
        )}

        {/* Track grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-5">
          <AnimatePresence mode="wait">
            {filtered.map((track, i) => (
              <motion.div
                key={track.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ delay: i * 0.04 }}
              >
                <TrackCard
                  track={track}
                  locked={track.min_tier !== "free"}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>

      <Footer />
    </div>
  );
}