import React, { useEffect, useState, useMemo } from "react";
import { motion } from "framer-motion";
import { X, Search, Play, Pause, Music4, Waves } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { usePlayer } from "@/context/PlayerContext";
import CoverImage from "@/components/shared/CoverImage";
import SaveHeartButton from "@/components/shared/SaveHeartButton";

const TABS = [
  { key: "latest", label: "Latest" },
  { key: "featured", label: "Featured" },
  { key: "432hz", label: "432 Hz" },
];

function SongCard({ track, isCurrent, isPlaying, onPlay }) {
  const isActive = isCurrent && isPlaying;
  return (
    <div
      onClick={() => onPlay(track)}
      onTouchStart={(e) => e.stopPropagation()}
      className="group relative flex flex-col rounded-xl overflow-hidden cursor-pointer transition-all active:scale-[0.97] hover:brightness-110"
      style={{
        background: isCurrent
          ? "rgba(0,229,255,0.08)"
          : "rgba(255,255,255,0.03)",
        border: `1px solid ${isCurrent
          ? "rgba(0,229,255,0.2)"
          : "rgba(255,255,255,0.06)"}`,
        touchAction: "manipulation",
      }}
    >
      {/* Cover */}
      <div className="relative aspect-square w-full overflow-hidden">
        <CoverImage
          src={track.cover_url}
          alt={track.title}
          className="w-full h-full"
          iconClassName="w-5 h-5"
          fallbackOpacityClass="text-white/15"
        />
        {/* Play/pause overlay */}
        <div
          className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 group-active:opacity-100 transition-opacity"
          style={{ background: "rgba(0,0,0,0.55)" }}
        >
          <div className="w-9 h-9 rounded-full flex items-center justify-center"
            style={{ background: "rgba(0,229,255,0.25)", border: "1px solid rgba(0,229,255,0.4)" }}>
            {isActive
              ? <Pause className="w-4 h-4 text-white" />
              : <Play className="w-4 h-4 text-white ml-0.5" />}
          </div>
        </div>
        {/* 432 Hz badge */}
        {track.frequency_type === "432hz" && (
          <div className="absolute top-1.5 left-1.5 flex items-center gap-0.5 px-1 py-0.5 rounded text-[8px] font-bold"
            style={{ background: "rgba(0,160,220,0.25)", color: "#00A0DC" }}>
            <Waves className="w-2 h-2" /> 432
          </div>
        )}
        {/* Save heart */}
        <div className="absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={(e) => e.stopPropagation()}>
          <SaveHeartButton
            item={track}
            itemType="song"
            meta={{ title: track.title, artist: track.artist_display, cover_url: track.cover_url }}
            size="sm"
            className="drop-shadow-md"
          />
        </div>
      </div>
      {/* Info */}
      <div className="px-2 py-2 flex flex-col gap-0.5 min-w-0">
        <p className="text-[11px] font-bold text-white leading-tight line-clamp-2"
          title={track.title}>
          {track.title}
        </p>
        <p className="text-[9px] text-white/30 leading-tight truncate">
          {track.artist_display || "Upper Vibe Media"}
        </p>
      </div>
    </div>
  );
}

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
    return list.slice(0, 40);
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
      className="fixed inset-0 rounded-t-3xl overflow-hidden flex flex-col"
      style={{
        zIndex: 70,
        top: isMobile ? "0" : undefined,
        bottom: isMobile ? "0" : undefined,
        height: isMobile ? "100dvh" : "82vh",
        paddingTop: isMobile ? "calc(env(safe-area-inset-top, 0px) + 0px)" : undefined,
        paddingBottom: isMobile ? "calc(env(safe-area-inset-bottom, 0px) + 0px)" : undefined,
        background: "rgba(8,8,24,0.97)",
        backdropFilter: "blur(24px)",
        WebkitBackdropFilter: "blur(24px)",
        border: "1px solid rgba(255,255,255,0.1)",
        borderBottom: "none",
        pointerEvents: "auto",
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3 border-b border-white/5 flex-shrink-0"
        style={{ paddingTop: isMobile ? "calc(env(safe-area-inset-top, 0px) + 8px)" : undefined }}
      >
        <div className="flex items-center gap-2">
          <Music4 className="w-5 h-5 text-cyan-400" />
          <h3 className="font-heading font-black text-lg text-white">Music Library</h3>
        </div>
        <button
          onTouchStart={(e) => e.stopPropagation()}
          onClick={(e) => { e.stopPropagation(); onClose(); }}
          className="w-11 h-11 rounded-full flex items-center justify-center transition-all hover:bg-white/10 active:bg-white/20"
          style={{
            color: "rgba(255,255,255,0.6)",
            minWidth: 44, minHeight: 44,
            touchAction: "manipulation",
            pointerEvents: "auto",
          }}
          aria-label="Close library"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Search + Tabs (sticky) */}
      <div className="flex-shrink-0 px-4 pt-3 pb-2 space-y-2"
        style={{ background: "rgba(8,8,24,0.97)", backdropFilter: "blur(24px)" }}>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/25" />
          <input
            type="text"
            placeholder="Search songs..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onTouchStart={(e) => e.stopPropagation()}
            className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm text-white placeholder-white/25 outline-none transition-all"
            style={{
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.08)",
              pointerEvents: "auto",
              touchAction: "manipulation",
              minHeight: "44px",
              fontSize: "16px",
            }}
          />
        </div>
        <div className="flex gap-1.5 overflow-x-auto hide-scrollbar">
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
      </div>

      {/* Song grid */}
      <div className="flex-1 overflow-y-auto px-3"
        style={{ paddingBottom: isMobile ? "calc(env(safe-area-inset-bottom, 0px) + 100px)" : "2rem" }}>
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-6 h-6 border-2 border-cyan-400/20 border-t-cyan-400 rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <p className="text-center py-16 text-white/25 text-sm">No songs found</p>
        ) : (
          <div
            className="grid gap-2 pt-2"
            style={{
              gridTemplateColumns: isMobile
                ? "repeat(auto-fill, minmax(82px, 1fr))"
                : "repeat(auto-fill, minmax(120px, 1fr))",
            }}
          >
            {filtered.map((track) => (
              <SongCard
                key={track.id}
                track={track}
                isCurrent={currentTrack?.id === track.id}
                isPlaying={isPlaying}
                onPlay={handlePlay}
              />
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}