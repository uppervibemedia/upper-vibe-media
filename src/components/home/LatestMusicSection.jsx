import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Play, Pause, Music4, Waves, Download, ChevronLeft, ChevronRight } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import SectionHeader from "../shared/SectionHeader";
import { useTheme } from "@/context/ThemeContext";
import { RADIO_THEMES } from "@/components/radio/RadioThemePicker";
import { NewBadgeOverlay } from "@/components/shared/NewBadge";

const PAGE_SIZE = 4;
const AUTO_CYCLE_MS = 7000;

export default function LatestMusicSection({ tracks, currentTrack, isPlaying, handlePlayTrack, heartButton, user, themeColor }) {
  const navigate = useNavigate();
  const { accentId } = useTheme();
  const radioTheme = RADIO_THEMES[accentId] || RADIO_THEMES.cyan;
  const rtp = radioTheme.vars["--rt-primary"];
  const color = themeColor || rtp;

  const [page, setPage] = useState(0);
  const [direction, setDirection] = useState(1); // 1 = forward, -1 = backward
  const timerRef = useRef(null);
  const interactedRef = useRef(false);
  const touchStartX = useRef(null);

  const isPremium = user?.role === "premium" || user?.tier === "premium" || user?.role === "admin" || user?.role === "plus" || user?.tier === "plus";

  const totalPages = Math.ceil((tracks?.length || 0) / PAGE_SIZE);
  const visibleTracks = (tracks || []).slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);

  const goTo = useCallback((newPage, dir) => {
    setDirection(dir);
    setPage(newPage);
  }, []);

  const goNext = useCallback(() => {
    const next = (page + 1) % totalPages;
    goTo(next, 1);
  }, [page, totalPages, goTo]);

  const goPrev = useCallback(() => {
    const prev = (page - 1 + totalPages) % totalPages;
    goTo(prev, -1);
  }, [page, totalPages, goTo]);

  // Auto-cycle — pause after user interaction for 15s
  useEffect(() => {
    if (totalPages <= 1) return;
    const tick = () => {
      if (!interactedRef.current) goNext();
    };
    timerRef.current = setInterval(tick, AUTO_CYCLE_MS);
    return () => clearInterval(timerRef.current);
  }, [goNext, totalPages]);

  const handleUserInteract = (fn) => {
    interactedRef.current = true;
    clearInterval(timerRef.current);
    fn();
    // Resume auto-cycle after 15s of no interaction
    timerRef.current = setTimeout(() => {
      interactedRef.current = false;
      timerRef.current = setInterval(() => {
        if (!interactedRef.current) goNext();
      }, AUTO_CYCLE_MS);
    }, 15000);
  };

  if (!tracks || tracks.length === 0) return (
    <section className="max-w-7xl mx-auto px-6 pt-4 pb-10">
      <SectionHeader label="New Releases" title="Latest Music" link="/music" linkLabel="Browse Music" labelColor={`rgb(${color})`} themeColor={color} />
      <div className="flex items-center gap-4 rounded-2xl px-5 py-6 mt-3"
        style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.06)" }}>
        <Music4 className="w-8 h-8 flex-shrink-0" style={{ color: `rgba(${color},0.35)` }} />
        <div>
          <p className="text-sm font-bold text-white/50">No new songs this week — explore the full music library</p>
          <Link to="/music" className="inline-flex items-center gap-1.5 mt-2 px-3 py-1.5 rounded-full text-[11px] font-black tracking-wide transition-all hover:brightness-110"
            style={{ background: `rgba(${color},0.1)`, border: `1px solid rgba(${color},0.3)`, color: `rgb(${color})` }}>
            Browse Music →
          </Link>
        </div>
      </div>
    </section>
  );

  // Touch swipe support
  const handleTouchStart = (e) => { touchStartX.current = e.touches[0].clientX; };
  const handleTouchEnd = (e) => {
    if (touchStartX.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(dx) > 40) {
      handleUserInteract(dx < 0 ? goNext : goPrev);
    }
    touchStartX.current = null;
  };

  const variants = {
    enter: (d) => ({ x: d > 0 ? "100%" : "-100%", opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (d) => ({ x: d > 0 ? "-100%" : "100%", opacity: 0 }),
  };

  return (
    <section className="max-w-7xl mx-auto px-6 pt-4 pb-10">
      <div className="flex items-end justify-between mb-1 flex-wrap gap-2">
        <SectionHeader
          label="New Releases"
          title="Latest Music"
          link="/newest-music"
          linkLabel="See More"
          labelColor={`rgb(${color})`}
          themeColor={color}
        />
        {/* Desktop prev/next arrows */}
        {totalPages > 1 && (
          <div className="hidden sm:flex items-center gap-2 mb-1">
            <button
              onClick={() => handleUserInteract(goPrev)}
              className="w-8 h-8 rounded-full flex items-center justify-center transition-all hover:brightness-125 active:scale-90"
              style={{ background: `rgba(${color},0.08)`, border: `1px solid rgba(${color},0.25)` }}
              aria-label="Previous">
              <ChevronLeft className="w-4 h-4" style={{ color: `rgb(${color})` }} />
            </button>
            <span className="text-[10px] font-bold tabular-nums" style={{ color: `rgba(${color},0.55)` }}>
              {page + 1} / {totalPages}
            </span>
            <button
              onClick={() => handleUserInteract(goNext)}
              className="w-8 h-8 rounded-full flex items-center justify-center transition-all hover:brightness-125 active:scale-90"
              style={{ background: `rgba(${color},0.08)`, border: `1px solid rgba(${color},0.25)` }}
              aria-label="Next">
              <ChevronRight className="w-4 h-4" style={{ color: `rgb(${color})` }} />
            </button>
          </div>
        )}
      </div>

      {/* Mobile: horizontal swipe scroll through all tracks */}
      <div
        className="flex sm:hidden gap-3 overflow-x-auto pb-2 -mx-6 px-6 snap-x snap-mandatory hide-scrollbar"
        style={{ WebkitOverflowScrolling: "touch" }}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}>
        {tracks.map((track, i) => {
          const isCurrent = currentTrack?.id === track.id;
          return (
            <div key={track.id + "-mobile"} className="group flex-shrink-0 snap-start">
              <Link
                to={`/song/${track.id}`}
                className="block rounded-2xl overflow-hidden active:scale-[0.97] transition-transform"
                style={{
                  width: "calc(50vw - 2rem)",
                  background: isCurrent ? `rgba(${color},0.07)` : "rgba(255,255,255,0.03)",
                  border: `1px solid ${isCurrent ? `rgba(${color},0.25)` : "rgba(255,255,255,0.07)"}`,
                }}>
                <div className="relative w-full aspect-square overflow-hidden">
                  {track.cover_url ? (
                    <img src={track.cover_url} alt={track.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center"
                      style={{ background: "linear-gradient(135deg,rgba(0,160,220,0.1),rgba(0,130,200,0.04))" }}>
                      <Music4 className="w-10 h-10 text-cyan-400/15" />
                    </div>
                  )}
                  <div
                    className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    style={{ background: "rgba(0,0,0,0.45)" }}
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); if (track.audio_url) handlePlayTrack(track); }}>
                    <div className="w-10 h-10 rounded-full flex items-center justify-center"
                      style={{ background: `linear-gradient(135deg,rgba(${color},0.7),rgb(${color}))` }}>
                      {isCurrent && isPlaying
                        ? <Pause className="w-4 h-4 text-white fill-current" />
                        : <Play className="w-4 h-4 text-white fill-current ml-0.5" />}
                    </div>
                  </div>
                  <NewBadgeOverlay track={track} />
                </div>
                <div className="p-2.5">
                  <p className="font-heading font-black text-xs text-white truncate">{track.title}</p>
                  <p className="text-[10px] text-white/40 truncate mt-0.5">{track.artist_display || "Upper Vibe Media"}</p>
                  <div className="flex items-center justify-between mt-2">
                    <span className="inline-flex items-center gap-0.5 text-[8px] font-black px-1.5 py-0.5 rounded-full"
                      style={{ background: `rgba(${color},0.1)`, border: `1px solid rgba(${color},0.2)`, color: `rgb(${color})` }}>
                      <Waves className="w-2 h-2" /> 432
                    </span>
                    <div className="flex items-center gap-0.5" onClick={(e) => { e.preventDefault(); e.stopPropagation(); }} onTouchEnd={(e) => e.stopPropagation()}>
                      {heartButton("track", track.id, { title: track.title, artist: track.artist_display, cover_url: track.cover_url })}
                      <button
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); navigate(`/song/${track.id}?downloadIntent=true`); }}
                        className="text-[8px] font-black px-1.5 py-0.5 rounded-full transition-all hover:brightness-110"
                        style={{ background: "rgba(212,168,67,0.1)", border: "1px solid rgba(212,168,67,0.2)", color: "rgba(212,168,67,0.6)" }}>
                        {isPremium ? <Download className="w-3 h-3 inline" /> : "Plus 🔒"}
                      </button>
                    </div>
                  </div>
                </div>
              </Link>
            </div>
          );
        })}
      </div>

      {/* Desktop: animated 4-card carousel */}
      <div className="hidden sm:block relative overflow-hidden">
        <AnimatePresence custom={direction} mode="wait">
          <motion.div
            key={page}
            custom={direction}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.38, ease: [0.22, 1, 0.36, 1] }}
            className="grid grid-cols-4 gap-3">
            {visibleTracks.map((track) => {
              const isCurrent = currentTrack?.id === track.id;
              return (
                <div key={track.id} className="group">
                  <Link
                    to={`/song/${track.id}`}
                    className="block rounded-2xl overflow-hidden transition-all hover:-translate-y-0.5 active:scale-[0.98]"
                    style={{
                      background: isCurrent ? `rgba(${color},0.07)` : "rgba(255,255,255,0.03)",
                      border: `1px solid ${isCurrent ? `rgba(${color},0.25)` : "rgba(255,255,255,0.07)"}`,
                      boxShadow: isCurrent ? `0 0 30px rgba(${color},0.1)` : "none",
                    }}>
                    <div className="relative w-full aspect-square overflow-hidden">
                      {track.cover_url ? (
                        <img
                          src={track.cover_url}
                          alt={track.title}
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center"
                          style={{ background: "linear-gradient(135deg,rgba(0,160,220,0.1),rgba(0,130,200,0.04))" }}>
                          <Music4 className="w-16 h-16 text-cyan-400/15" />
                        </div>
                      )}
                      <div
                        className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300"
                        style={{ background: "rgba(0,0,0,0.45)" }}
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); if (track.audio_url) handlePlayTrack(track); }}>
                        <div className="w-10 h-10 rounded-full flex items-center justify-center transition-transform hover:scale-110"
                          style={{ background: `linear-gradient(135deg,rgba(${color},0.7),rgb(${color}))`, boxShadow: `0 0 16px rgba(${color},0.4)` }}>
                          {isCurrent && isPlaying
                            ? <Pause className="w-4 h-4 text-white fill-current" />
                            : <Play className="w-4 h-4 text-white fill-current ml-0.5" />}
                        </div>
                      </div>
                      <NewBadgeOverlay track={track} />
                      {isCurrent && isPlaying && (
                        <div className="absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center"
                          style={{ background: `rgba(${color},0.9)` }}>
                          <Waves className="w-4 h-4 text-white animate-pulse" />
                        </div>
                      )}
                    </div>
                    <div className="p-2.5">
                      <p className="font-heading font-black text-xs text-white truncate leading-tight mb-0.5 hover:text-cyan-300 transition-colors">
                        {track.title}
                      </p>
                      <p className="text-[10px] text-white/40 truncate mb-2">
                        {track.artist_display || "Upper Vibe Media"}
                      </p>
                      <div className="flex items-center justify-between">
                        <span className="inline-flex items-center gap-0.5 text-[8px] font-black px-1.5 py-0.5 rounded-full"
                          style={{ background: `rgba(${color},0.1)`, border: `1px solid rgba(${color},0.2)`, color: `rgb(${color})` }}>
                          <Waves className="w-2 h-2" /> 432
                        </span>
                        <div className="flex items-center gap-0.5" onClick={(e) => { e.preventDefault(); e.stopPropagation(); }} onTouchEnd={(e) => e.stopPropagation()}>
                          {heartButton("track", track.id, { title: track.title, artist: track.artist_display, cover_url: track.cover_url })}
                          <button
                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); navigate(`/song/${track.id}?downloadIntent=true`); }}
                            className="text-[8px] font-black px-1.5 py-0.5 rounded-full transition-all hover:brightness-110"
                            style={{ background: "rgba(212,168,67,0.1)", border: "1px solid rgba(212,168,67,0.2)", color: "rgba(212,168,67,0.6)" }}>
                            {isPremium ? <Download className="w-3 h-3 inline" /> : "Plus 🔒"}
                          </button>
                        </div>
                      </div>
                    </div>
                  </Link>
                </div>
              );
            })}
          </motion.div>
        </AnimatePresence>

        {/* Pagination dots */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-1.5 mt-4">
            {Array.from({ length: totalPages }).map((_, i) => (
              <button
                key={i}
                onClick={() => handleUserInteract(() => goTo(i, i > page ? 1 : -1))}
                className="rounded-full transition-all"
                style={{
                  width: i === page ? 20 : 6,
                  height: 6,
                  background: i === page ? `rgb(${color})` : `rgba(${color},0.25)`,
                }}
                aria-label={`Page ${i + 1}`}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}