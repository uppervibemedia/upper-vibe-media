import React, { useEffect, useState, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Play, Pause, ChevronLeft, ChevronRight, History } from "lucide-react";
import HeartButton from "@/components/shared/HeartButton";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { isNewTrack } from "@/lib/isNewTrack";
import NewBadge from "@/components/shared/NewBadge";

/**
 * RecentlyPlayedRow
 * - Only renders for authenticated users who have listening history
 * - Fetches server-side SongStream records for the current user
 * - Falls back to localStorage history if no server records found
 * - Deduped, most recent first, max 10 tracks
 */
export default function RecentlyPlayedRow({
  user,
  allTracks,
  currentTrack,
  isPlaying,
  handlePlayTrack,
  themeColor = "0,160,220",
  onNeedLogin,
}) {
  const [recentTracks, setRecentTracks] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const scrollRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  // Load server-side history for the logged-in user
  // Deferred by 1.5s to avoid rate-limit collision with Home's parallel loadData() burst
  useEffect(() => {
    if (!user || allTracks.length === 0) return;

    const timer = setTimeout(load, 1500);
    return () => clearTimeout(timer);

    async function load() {
      try {
        // Fetch most recent SongStream records for this user
        // RLS scopes to created_by_id automatically — no extra filter needed
        const streams = await base44.entities.SongStream.list("-created_date", 20);

        let orderedIds = [];

        if (streams && streams.length > 0) {
          // Dedupe by song_id, keep most recent
          const seen = new Set();
          for (const s of streams) {
            if (s.song_id && !seen.has(s.song_id)) {
              seen.add(s.song_id);
              orderedIds.push(s.song_id);
            }
          }
        } else {
          // Fallback: localStorage history (key must match recordPlay in DiscoverTab)
          try {
            const raw = localStorage.getItem("uvm_play_history");
            if (raw) {
              const parsed = JSON.parse(raw);
              const seen = new Set();
              for (const h of parsed) {
                if (h.id && !seen.has(h.id)) {
                  seen.add(h.id);
                  orderedIds.push(h.id);
                }
              }
            }
          } catch {}
        }

        // Map IDs → Track objects (skip missing)
        const trackMap = new Map(allTracks.map((t) => [t.id, t]));
        const resolved = orderedIds
          .slice(0, 10)
          .map((id) => trackMap.get(id))
          .filter(Boolean);

        setRecentTracks(resolved);
      } catch {
        // Silently skip — non-critical
      } finally {
        setLoaded(true);
      }
    }
  }, [user, allTracks]);

  // Update scroll arrow visibility
  const updateScrollState = () => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 8);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 8);
  };

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    updateScrollState();
    el.addEventListener("scroll", updateScrollState, { passive: true });
    return () => el.removeEventListener("scroll", updateScrollState);
  }, [recentTracks]);

  const scrollBy = (dir) => {
    scrollRef.current?.scrollBy({ left: dir * 220, behavior: "smooth" });
  };

  // Only render for logged-in users with history
  if (!user || (!loaded && recentTracks.length === 0)) return null;
  if (loaded && recentTracks.length === 0) return null;

  return (
    <AnimatePresence>
      <motion.section
        key="recently-played-row"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        className="max-w-7xl mx-auto px-4 sm:px-6 pt-2 pb-5"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <History className="w-3.5 h-3.5 flex-shrink-0" style={{ color: `rgb(${themeColor})` }} />
            <span
              className="text-[10px] font-black tracking-[0.3em] uppercase"
              style={{ color: `rgb(${themeColor})` }}
            >
              Recently Played
            </span>
          </div>
          {/* Desktop scroll arrows */}
          <div className="hidden sm:flex items-center gap-1">
            <button
              onClick={() => scrollBy(-1)}
              disabled={!canScrollLeft}
              className="w-7 h-7 rounded-full flex items-center justify-center transition-all disabled:opacity-20"
              style={{
                background: `rgba(${themeColor},0.1)`,
                border: `1px solid rgba(${themeColor},0.25)`,
                color: `rgb(${themeColor})`,
              }}
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => scrollBy(1)}
              disabled={!canScrollRight}
              className="w-7 h-7 rounded-full flex items-center justify-center transition-all disabled:opacity-20"
              style={{
                background: `rgba(${themeColor},0.1)`,
                border: `1px solid rgba(${themeColor},0.25)`,
                color: `rgb(${themeColor})`,
              }}
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Horizontal swipe row */}
        <div
          ref={scrollRef}
          className="flex gap-3 overflow-x-auto hide-scrollbar pb-1"
          style={{ scrollSnapType: "x mandatory", WebkitOverflowScrolling: "touch" }}
        >
          {recentTracks.map((track, i) => {
            const isCurrent = currentTrack?.id === track.id;
            const isNew = isNewTrack(track);
            return (
              <TrackCard
                key={track.id}
                track={track}
                isCurrent={isCurrent}
                isPlaying={isPlaying}
                isNew={isNew}
                themeColor={themeColor}
                onPlay={() => handlePlayTrack(track)}
                onNeedLogin={onNeedLogin}
                index={i}
              />
            );
          })}
        </div>
      </motion.section>
    </AnimatePresence>
  );
}

function TrackCard({ track, isCurrent, isPlaying, isNew, themeColor, onPlay, onNeedLogin, index }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.04, duration: 0.3 }}
      className="flex-shrink-0 group"
      style={{ width: 140, scrollSnapAlign: "start" }}
    >
      {/* Cover art + play overlay */}
      <div className="relative rounded-xl overflow-hidden mb-2" style={{ width: 140, height: 140 }}>
        {track.cover_url ? (
          <img
            src={track.cover_url}
            alt={track.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-400"
            loading="lazy"
          />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center"
            style={{ background: `rgba(${themeColor},0.08)` }}
          >
            <div className="w-10 h-10 rounded-full flex items-center justify-center"
              style={{ background: `rgba(${themeColor},0.15)`, color: `rgb(${themeColor})` }}>
              <Play className="w-5 h-5 fill-current ml-0.5" />
            </div>
          </div>
        )}

        {/* Hover / active play overlay */}
        <div
          className="absolute inset-0 flex items-center justify-center transition-opacity duration-200"
          style={{
            background: "rgba(0,0,0,0.5)",
            opacity: isCurrent ? 1 : undefined,
          }}
        >
          <button
            onClick={(e) => { e.preventDefault(); onPlay(); }}
            className="w-11 h-11 rounded-full flex items-center justify-center transition-all hover:scale-105 active:scale-95 opacity-0 group-hover:opacity-100"
            style={{
              background: `linear-gradient(135deg,rgb(${themeColor}),rgba(${themeColor},0.8))`,
              boxShadow: `0 0 16px rgba(${themeColor},0.5)`,
              ...(isCurrent ? { opacity: 1 } : {}),
            }}
          >
            {isCurrent && isPlaying
              ? <Pause className="w-4 h-4 fill-current text-black" />
              : <Play className="w-4 h-4 fill-current text-black ml-0.5" />}
          </button>
        </div>

        {/* NEW badge overlay */}
        {isNew && (
          <div className="absolute top-1.5 left-1.5 pointer-events-none">
            <NewBadge track={track} />
          </div>
        )}

        {/* Active playing indicator */}
        {isCurrent && isPlaying && (
          <div className="absolute bottom-1.5 right-1.5 flex items-end gap-[2px]">
            {[4, 7, 5, 8, 4].map((h, i) => (
              <motion.div
                key={i}
                animate={{ height: [`${h * 0.4}px`, `${h}px`, `${h * 0.5}px`] }}
                transition={{ duration: 0.7 + i * 0.12, repeat: Infinity, ease: "easeInOut", delay: i * 0.1 }}
                style={{
                  width: 2,
                  borderRadius: 1,
                  background: `rgb(${themeColor})`,
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Text info + heart */}
      <div className="flex items-start justify-between gap-1 min-w-0">
        <Link
          to={`/song/${track.id}`}
          className="block min-w-0 flex-1"
          onClick={(e) => e.stopPropagation()}
        >
          <p
            className="text-xs font-bold leading-tight truncate transition-colors"
            style={{ color: isCurrent ? `rgb(${themeColor})` : "rgba(255,255,255,0.88)" }}
            title={track.title}
          >
            {track.title}
          </p>
          <p className="text-[10px] truncate mt-0.5" style={{ color: "rgba(255,255,255,0.38)" }}>
            {track.artist_display || "Upper Vibe Media"}
          </p>
        </Link>
        <HeartButton track={track} size="sm" onNeedLogin={onNeedLogin} className="flex-shrink-0 mt-0.5" />
      </div>
    </motion.div>
  );
}