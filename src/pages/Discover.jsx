import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, X, Waves, Zap, Music, TrendingUp, Crown } from "lucide-react";
import TrackCard from "../components/shared/TrackCard";
import CategoryShelf from "../components/shared/CategoryShelf";
import SectionHeader from "../components/shared/SectionHeader";
import UpgradeModal from "../components/shared/UpgradeModal";
import Footer from "../components/shared/Footer";
import { base44 } from "@/api/base44Client";
import {
  filterByCategory,
  filterByCategorySlug,
  filterByUserTier,
  getFeatured,
  getNewReleases,
  getBy432Hz,
  searchTracks,
} from "@/lib/trackService";
import { getEffectiveAccess } from "@/lib/tierAccess";

// For demo, user is "free" — in production connect to auth
const USER_TIER = "free";

const QUICK_FILTERS = [
  { id: "all", label: "All" },
  { id: "432hz", label: "432 Hz", icon: Waves },
  { id: "exclusive-drops", label: "Exclusive Drops", icon: Zap },
  { id: "high-vibe-hiphop", label: "High Vibe Hip-Hop", icon: Music },
  { id: "reprogramming", label: "Reprogramming", icon: Crown },
  { id: "manifestation", label: "Manifestation", icon: TrendingUp },
  { id: "healing-meditation", label: "Healing / Meditation" },
  { id: "luxury-motivation", label: "Luxury Motivation" },
];

export default function Discover() {
  const [activeFilter, setActiveFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [tracks, setTracks] = useState([]);
  const [categories, setCategories] = useState([]);
  const [upgradeModal, setUpgradeModal] = useState({ open: false, track: null });

  useEffect(() => {
    Promise.all([
      base44.entities.Track.filter({ status: "published" }, "-created_date", 300),
      base44.entities.Category.list("display_order", 50),
    ]).then(([t, c]) => {
      setTracks(t);
      setCategories(c);
    });
  }, []);

  const handleLockedClick = (track) => {
    const access = getEffectiveAccess(track);
    const requiredTier = access.includes("supporter") ? "supporter" : "premium";
    setUpgradeModal({ open: true, track, requiredTier });
  };

  // Active filter tracks
  const displayTracks = useMemo(() => {
    let result = tracks;
    if (search) return searchTracks(result, search);
    if (activeFilter === "all") return result;
    if (activeFilter === "432hz") return getBy432Hz(result);
    // Try slug-based category filter
    return filterByCategorySlug(result, categories, activeFilter);
  }, [tracks, categories, activeFilter, search]);

  // Shelf data (lazy — only computed when on "all" with no search)
  const shelves = useMemo(() => {
    if (activeFilter !== "all" || search) return [];
    const getShelf = (slug) => {
      const cat = categories.find((c) => c.slug === slug);
      if (!cat) return [];
      return filterByCategory(tracks, cat.id).slice(0, 20);
    };
    return [
      { slug: "high-vibe-hiphop", title: "High Vibe Hip-Hop", subtitle: "Elevated Sound", glowColor: "blue" },
      { slug: "432hz", title: "432 Hz Collection", subtitle: "Frequency Tuned", glowColor: "gold" },
      { slug: "exclusive-drops", title: "Exclusive Drops", subtitle: "Members Only", glowColor: "blue" },
      { slug: "reprogramming", title: "Reprogramming Music", subtitle: "Rewire Your Mind", glowColor: "gold" },
      { slug: "manifestation", title: "Manifestation Music", subtitle: "Align & Attract", glowColor: "blue" },
      { slug: "healing-meditation", title: "Healing & Meditation", subtitle: "Restore Your Frequency", glowColor: "gold" },
    ]
      .map((s) => ({ ...s, tracks: getShelf(s.slug) }))
      .filter((s) => s.tracks.length > 0);
  }, [tracks, categories, activeFilter, search]);

  const featuredTracks = useMemo(() => getFeatured(tracks).slice(0, 10), [tracks]);
  const newReleases = useMemo(() => getNewReleases(tracks).slice(0, 10), [tracks]);

  return (
    <div>
      {/* Hero banner */}
      <div className="relative h-48 md:h-64 overflow-hidden">
        <img
          src="https://media.base44.com/images/public/69cd68afb7fe90ae92757154/7fa1b96e5_generated_89d5ed9d.png"
          alt="Discover"
          className="w-full h-full object-cover opacity-30"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/70 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-6">
          <div className="max-w-7xl mx-auto">
            <SectionHeader title="Discover" subtitle="Explore the Frequency" />
          </div>
        </div>
      </div>

      <div className="py-6">
        {/* Search */}
        <div className="px-6 mb-5">
          <div className="relative max-w-7xl mx-auto">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <input
              type="text"
              placeholder="Search tracks, artists, albums..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setActiveFilter("all"); }}
              className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-card/40 border border-border/30 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 transition-colors"
            />
            {search && (
              <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Quick filter tabs */}
        <div className="flex gap-2 overflow-x-auto pb-3 mb-6 px-6 scrollbar-hide">
          {QUICK_FILTERS.map((f) => (
            <button
              key={f.id}
              onClick={() => { setActiveFilter(f.id); setSearch(""); }}
              className={`whitespace-nowrap flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold tracking-wider uppercase transition-all border ${
                activeFilter === f.id
                  ? "bg-primary/10 border-primary/40 text-primary"
                  : "border-border/30 text-muted-foreground hover:text-foreground hover:border-border/60"
              }`}
            >
              {f.icon && <f.icon className="w-3 h-3" />}
              {f.label}
            </button>
          ))}
        </div>

        {/* Shelf view (all mode) */}
        {activeFilter === "all" && !search && (
          <>
            {/* Featured shelf */}
            {featuredTracks.length > 0 && (
              <CategoryShelf
                title="Featured Tracks"
                subtitle="Handpicked"
                tracks={featuredTracks}
                glowColor="gold"
                onTrackClick={handleLockedClick}
              />
            )}

            {/* New releases */}
            {newReleases.length > 0 && (
              <CategoryShelf
                title="New Releases"
                subtitle="Just Dropped"
                tracks={newReleases}
                glowColor="blue"
                onTrackClick={handleLockedClick}
              />
            )}

            {/* Category shelves */}
            {shelves.map((shelf) => (
              <CategoryShelf
                key={shelf.slug}
                title={shelf.title}
                subtitle={shelf.subtitle}
                tracks={shelf.tracks}
                glowColor={shelf.glowColor}
                onTrackClick={handleLockedClick}
              />
            ))}

            {tracks.length === 0 && (
              <div className="py-20 text-center text-muted-foreground px-6">
                <p>No tracks yet. Add some in the Admin panel.</p>
              </div>
            )}
          </>
        )}

        {/* Grid view (filtered/search) */}
        {(activeFilter !== "all" || search) && (
          <div className="max-w-7xl mx-auto px-6">
            {search && (
              <p className="text-sm text-muted-foreground mb-4">
                {displayTracks.length} result{displayTracks.length !== 1 ? "s" : ""} for <span className="text-foreground">"{search}"</span>
              </p>
            )}
            {displayTracks.length === 0 && (
              <p className="text-center text-muted-foreground py-16">No tracks found.</p>
            )}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-5">
              <AnimatePresence mode="wait">
                {displayTracks.map((track, i) => (
                  <motion.div
                    key={track.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ delay: i * 0.03 }}
                  >
                    <TrackCard track={track} onLockedClick={handleLockedClick} />
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
        )}
      </div>

      <Footer />

      <UpgradeModal
        isOpen={upgradeModal.open}
        onClose={() => setUpgradeModal({ open: false, track: null })}
        requiredTier={upgradeModal.requiredTier}
        trackTitle={upgradeModal.track?.title}
      />
    </div>
  );
}