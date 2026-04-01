import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, X } from "lucide-react";
import TrackCard from "../components/shared/TrackCard";
import SectionHeader from "../components/shared/SectionHeader";
import Footer from "../components/shared/Footer";
import { base44 } from "@/api/base44Client";

const CATEGORIES = [
  { id: "all", label: "All" },
  { id: "high_vibe_hiphop", label: "High Vibe Hip-Hop" },
  { id: "reprogramming_sessions", label: "Reprogramming Sessions" },
  { id: "432_collection", label: "432 Collection" },
  { id: "remastered", label: "Remastered" },
  { id: "exclusive_drops", label: "Exclusive Drops" },
  { id: "meditation_focus", label: "Meditation / Focus" },
];



export default function Discover() {
  const [activeCategory, setActiveCategory] = useState("all");
  const [search, setSearch] = useState("");
  const [tracks, setTracks] = useState([]);

  useEffect(() => {
    base44.entities.Track.list("-created_date", 100).then(setTracks);
  }, []);

  const filtered = tracks.filter((t) => {
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