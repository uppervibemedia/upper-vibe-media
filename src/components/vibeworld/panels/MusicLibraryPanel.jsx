import React, { useEffect, useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Search, Play, Pause, Heart, Music4, Waves } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { usePlayer } from "@/context/PlayerContext";
import CoverImage from "@/components/shared/CoverImage";

const TABS = [
  { key: "latest", label: "Latest" },
  { key: "featured", label: "Featured" },
  { key: "432hz", label: "432 Hz" },
];

export default function MusicLibraryPanel({ open, onClose, isMobile }) {
  const { currentTrack, isPlaying, togglePlay, playTrack } = usePlayer() || {};
  const [tracks, setTracks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("latest");
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    base44.entities.Track.filter({ status: "published" }, "-created_date", 100)
      .then(setTracks)
      .finally(() => setLoading(false));
  }, [open]);

  const filtered = useMemo(() => {
    let list = [...tracks];
    if (activeTab === "featured") list = list.filter(t => t.is_featured);
    if (activeTab === "432hz") list = list.filter(t => t.frequency_type === "432hz");
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(t =>
        t.title?.toLowerCase().includes(q) ||
        t.artist_display?.toLowerCase().includes(q)
      );
    }
    return list.slice(0, 30);
  }, [tracks, activeTab, search]);

  const handlePlay = (track) => {
    if (currentTrack?.id === track.id) {
      togglePlay?.();
    } else {
      playTrack?.(track, "song");
    }
  };

  if (!open) return null;

  return (
    <motion.div
      initial={{ y: "100%" }}
      animate={{ y: 0 }}
      exit={{ y: "100%" }}
      transition={{ type: "spring", damping: 30, stiffness: 300 }}
      className="absolute inset-x-0 bottom-0 rounded-t-3xl overflow-hidden"
      style={{ zIndex: 65 }}
      style={{
        height: isMobile ? "85dvh" : "75vh",
        background: "rgba(8,8,24,0.97)",
        backdropFilter: "blur(24px)",
        border: "1px solid rgba(255,255,255,0.1)",
        borderBottom: "none",
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
        <div className="flex items-center gap-2">
          <Music4 className="w-5 h-5 text-cyan-400" />
          <h3 className="font-heading font-black text-lg text-white">Music Library</h3>
        </div>
        <button
          onClick={onClose}
          className="w-9 h-9 rounded-full flex items-center justify-center transition-all hover:bg-white/10"
          style={{ color: "rgba(255,255,255,0.6)" }}
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Search */}
      <div className="px-4 py-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/25" />
          <input
            type="text"
            placeholder="Search songs..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm text-white placeholder-white/25 outline-none transition-all"
            style={{
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.08)",
            }}
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1.5 px-4 pb-3 overflow-x-auto hide-scrollbar">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className="flex-shrink-0 px-4 py-1.5 rounded-full text-[11px] font-black tracking-wider transition-all"
            style={{
              background: activeTab === tab.key
                ? "rgba(0,229,255,0.12)"
                : "rgba(255,255,255,0.04)",
              border: `1px solid ${activeTab === tab.key
                ? "rgba(0,229,255,0.3)"
                : "rgba(255,255,255,0.08)"}`,
              color: activeTab === tab.key ? "#00E5FF" : "rgba(255,255,255,0.4)",
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Track list */}
      <div className="overflow-y-auto px-4 pb-8" style={{ maxHeight: "calc(100% - 150px)" }}>
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-6 h-6 border-2 border-cyan-400/20 border-t-cyan-400 rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <p className="text-center py-12 text-white/25 text-sm">No songs found</p>
        ) : (
          <div className="space-y-1.5">
            {filtered.map((track) => {
              const isCurrent = currentTrack?.id === track.id;
              return (
                <div
                  key={track.id}
                  className="flex items-center gap-3 p-2.5 rounded-xl group cursor-pointer transition-all active:scale-[0.98]"
                  style={{
                    background: isCurrent
                      ? "rgba(0,229,255,0.06)"
                      : "rgba(255,255,255,0.02)",
                    border: `1px solid ${isCurrent
                      ? "rgba(0,229,255,0.2)"
                      : "rgba(255,255,255,0.04)"}`,
                  }}
                  onClick={() => handlePlay(track)}
                >
                  <div className="relative flex-shrink-0">
                    <CoverImage
                      src={track.cover_url}
                      alt={track.title}
                      className="w-11 h-11 rounded-lg"
                      iconClassName="w-4 h-4"
                    />
                    <div
                      className="absolute inset-0 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      style={{ background: "rgba(0,0,0,0.6)" }}
                    >
                      {isCurrent && isPlaying
                        ? <Pause className="w-3.5 h-3.5 text-cyan-400" />
                        : <Play className="w-3.5 h-3.5 text-white ml-0.5" />}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-white truncate">{track.title}</p>
                    <p className="text-[11px] text-white/35 truncate">
                      {track.artist_display || "Upper Vibe Media"}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {track.frequency_type === "432hz" && (
                      <span
                        className="flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded"
                        style={{ background: "rgba(0,160,220,0.1)", color: "#00A0DC" }}
                      >
                        <Waves className="w-2 h-2" /> 432
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </motion.div>
  );
}