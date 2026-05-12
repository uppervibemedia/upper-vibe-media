import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, X } from "lucide-react";
import VaultTrackCard from "../components/vault/VaultTrackCard";
import Footer from "../components/shared/Footer";

const FILTERS = [
  { id: "all", label: "All" },
  { id: "432hz", label: "432 Hz" },
  { id: "focus", label: "Focus" },
  { id: "confidence", label: "Confidence" },
  { id: "healing", label: "Healing" },
  { id: "money", label: "Money Mindset" },
  { id: "motivation", label: "Motivation" },
  { id: "night", label: "Night Mode" },
  { id: "driving", label: "Driving" },
  { id: "instrumentals", label: "Instrumentals" },
  { id: "downloads", label: "Downloads" },
];

const TRACKS = [
  {
    id: "t1",
    title: "Attract Mode",
    artist: "Upper Vibe Media",
    frequency: "432 Hz",
    moods: ["confidence", "money"],
    moodLabel: "Confidence / Alignment / Money Mindset",
    length: "4:32",
    releaseType: "Exclusive 432 Hz",
    typeKey: "exclusive432",
    isDownloadable: true,
    isPremiumDownload: true,
    cover_url: "https://images.unsplash.com/photo-1614680376573-df3480f0c6ff?w=600&q=80",
    tags: ["432hz", "confidence", "money"],
  },
  {
    id: "t2",
    title: "Fourth Dimension Hustler",
    artist: "Jmack So Lavish",
    frequency: "432 Hz",
    moods: ["motivation", "driving"],
    moodLabel: "Motivation / High Mind / Hustle",
    length: "3:58",
    releaseType: "Exclusive",
    typeKey: "exclusive",
    isDownloadable: true,
    isPremiumDownload: true,
    cover_url: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&q=80",
    tags: ["432hz", "motivation", "driving"],
  },
  {
    id: "t3",
    title: "Glow In My Soul",
    artist: "Aura Rae",
    frequency: "432 Hz",
    moods: ["healing"],
    moodLabel: "Healing / Self-Worth / Inner Light",
    length: "6:15",
    releaseType: "Extended Session",
    typeKey: "extended",
    isDownloadable: false,
    isPremiumDownload: false,
    cover_url: "https://images.unsplash.com/photo-1601342630314-8427c38bf5e6?w=600&q=80",
    tags: ["432hz", "healing"],
  },
  {
    id: "t4",
    title: "Starseed Lover Girl",
    artist: "Aura Rae",
    frequency: "432 Hz",
    moods: ["healing", "night"],
    moodLabel: "Love / Spiritual / R&B",
    length: "3:44",
    releaseType: "Standard + 432 Hz",
    typeKey: "standard432",
    isDownloadable: true,
    isPremiumDownload: false,
    cover_url: "https://images.unsplash.com/photo-1534274988757-a28bf1a57c17?w=600&q=80",
    tags: ["432hz", "healing", "night"],
  },
  {
    id: "t5",
    title: "Neural Drip",
    artist: "iami",
    frequency: "432 Hz",
    moods: ["focus", "driving"],
    moodLabel: "Futuristic / Club / Focus",
    length: "4:07",
    releaseType: "Exclusive",
    typeKey: "exclusive",
    isDownloadable: true,
    isPremiumDownload: true,
    cover_url: "https://images.unsplash.com/photo-1518972559570-7cc1309f3229?w=600&q=80",
    tags: ["432hz", "focus", "driving"],
  },
  {
    id: "t6",
    title: "Upper Vibe Frequency",
    artist: "S.O.N.A. To Infinity",
    frequency: "432 Hz",
    moods: ["confidence", "motivation"],
    moodLabel: "Spiritual / Cosmic / Awakening",
    length: "5:23",
    releaseType: "Exclusive",
    typeKey: "exclusive",
    isDownloadable: true,
    isPremiumDownload: true,
    cover_url: "https://images.unsplash.com/photo-1462331940025-496dfbfc7564?w=600&q=80",
    tags: ["432hz", "confidence", "motivation"],
  },
];

export default function Vault() {
  const [activeFilter, setActiveFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [saved, setSaved] = useState({});

  const filtered = useMemo(() => {
    let result = TRACKS;
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          t.artist.toLowerCase().includes(q) ||
          t.moodLabel.toLowerCase().includes(q) ||
          t.frequency.toLowerCase().includes(q)
      );
    } else if (activeFilter !== "all") {
      if (activeFilter === "downloads") {
        result = result.filter((t) => t.isDownloadable);
      } else {
        result = result.filter((t) => t.tags.includes(activeFilter));
      }
    }
    return result;
  }, [activeFilter, search]);

  const toggleSave = (id) => setSaved((prev) => ({ ...prev, [id]: !prev[id] }));

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <div className="relative overflow-hidden pt-20 pb-10 px-6"
        style={{ background: "linear-gradient(180deg,rgba(0,229,255,0.06) 0%,transparent 100%)" }}>
        <div className="absolute top-0 right-0 w-[500px] h-[500px] rounded-full opacity-[0.06] blur-[100px] pointer-events-none -translate-y-1/2 translate-x-1/4"
          style={{ background: "radial-gradient(circle,#00E5FF,transparent)" }} />
        <div className="max-w-7xl mx-auto relative z-10">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-5 text-[10px] font-black tracking-[0.25em] uppercase"
              style={{ background: "rgba(0,229,255,0.08)", border: "1px solid rgba(0,229,255,0.2)", color: "#00E5FF" }}>
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
              Exclusive Listening Hub
            </div>
            <h1 className="font-heading font-black text-5xl md:text-6xl text-white mb-4 leading-tight">
              Music Vault
            </h1>
            <p className="text-base text-white/40 max-w-xl leading-relaxed">
              Stream high-vibration music, save your favorite tracks, and download exclusive 432 Hz versions only available inside Upper Vibe Media.
            </p>
          </motion.div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 pb-10">
        {/* Search */}
        <div className="relative mb-6 mt-2">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/25 pointer-events-none" />
          <input
            type="text"
            placeholder="Search songs, artists, moods, or frequencies"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setActiveFilter("all"); }}
            className="w-full pl-11 pr-10 py-3.5 rounded-2xl text-sm text-white placeholder:text-white/25 focus:outline-none transition-all"
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.08)",
            }}
            onFocus={(e) => e.target.style.borderColor = "rgba(0,229,255,0.3)"}
            onBlur={(e) => e.target.style.borderColor = "rgba(255,255,255,0.08)"}
          />
          {search && (
            <button onClick={() => setSearch("")}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/70 transition-colors">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2 overflow-x-auto pb-4 mb-8 scrollbar-hide">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              onClick={() => { setActiveFilter(f.id); setSearch(""); }}
              className="whitespace-nowrap px-4 py-2 rounded-full text-xs font-bold tracking-wider transition-all border flex-shrink-0"
              style={activeFilter === f.id ? {
                background: "rgba(0,229,255,0.12)",
                borderColor: "rgba(0,229,255,0.35)",
                color: "#00E5FF"
              } : {
                background: "rgba(255,255,255,0.03)",
                borderColor: "rgba(255,255,255,0.07)",
                color: "rgba(255,255,255,0.35)"
              }}>
              {f.label}
            </button>
          ))}
        </div>

        {/* Results count */}
        {search && (
          <p className="text-sm text-white/30 mb-5">
            {filtered.length} result{filtered.length !== 1 ? "s" : ""} for <span className="text-white/60">"{search}"</span>
          </p>
        )}

        {/* Track grid */}
        <AnimatePresence mode="wait">
          {filtered.length === 0 ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center py-24 gap-4">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
                style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                <Search className="w-7 h-7 text-white/15" />
              </div>
              <p className="text-white/25 font-medium">No tracks found for this frequency yet.</p>
            </motion.div>
          ) : (
            <motion.div
              key="grid"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5"
            >
              {filtered.map((track, i) => (
                <motion.div
                  key={track.id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.06 }}
                >
                  <VaultTrackCard
                    track={track}
                    isSaved={!!saved[track.id]}
                    onSave={() => toggleSave(track.id)}
                  />
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <Footer />
    </div>
  );
}