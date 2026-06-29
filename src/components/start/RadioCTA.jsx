import React, { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Play, Pause, SkipForward, Music2 } from "lucide-react";
import FreqBadge from "@/components/shared/FreqBadge";
import { motion } from "framer-motion";
import { base44 } from "@/api/base44Client";
import { usePlayer } from "@/context/PlayerContext";
import { useRadio } from "@/context/RadioContext";
import NewBadge, { NewBadgeOverlay } from "@/components/shared/NewBadge";
import {
  subscribe as ramSubscribe,
  getState as ramGetState,
  playMyVibeTrack,
  pauseMyVibe,
  resumeMyVibe,
} from "@/lib/radioAudioManager";

const BLUE = "0,160,220";

function MusicBars({ color = `rgb(${BLUE})`, active = false }) {
  return (
    <>
      <style>{`
        @keyframes rcBar1 { 0%,100% { height: 3px } 50% { height: 14px } }
        @keyframes rcBar2 { 0%,100% { height: 10px } 50% { height: 3px } }
        @keyframes rcBar3 { 0%,100% { height: 5px } 50% { height: 13px } }
        @keyframes rcBar4 { 0%,100% { height: 12px } 50% { height: 4px } }
      `}</style>
      <span style={{ display: "inline-flex", alignItems: "flex-end", gap: 3, height: 18 }}>
        {["rcBar1", "rcBar2", "rcBar3", "rcBar4"].map((anim, i) => (
          <span key={anim} style={{ width: 3, borderRadius: 2, background: color, height: 6, animation: `${anim} ${active ? "0.55s" : "2.2s"} ease-in-out infinite`, animationDelay: `${i * 0.09}s`, opacity: active ? 1 : 0.5 }} />
        ))}
      </span>
    </>
  );
}

function NewestTrackCard({ track, onPlay, isPlaying }) {
  return (
    <button
      onClick={() => onPlay(track)}
      className="relative flex-shrink-0 rounded-xl overflow-hidden cursor-pointer transition-all active:scale-[0.95] text-left"
      style={{ width: 116, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", scrollSnapAlign: "start", WebkitTapHighlightColor: "transparent" }}
      aria-label={`Play ${track.title}`}
    >
      <div className="relative" style={{ width: "100%", height: 112, background: "#111" }}>
        {track.cover_url ? <img src={track.cover_url} alt={track.title} loading="lazy" className="w-full h-full object-cover" /> : (
          <div className="w-full h-full flex items-center justify-center" style={{ background: `rgba(${BLUE},0.07)` }}>
            <Music2 style={{ width: 22, height: 22, color: `rgba(${BLUE},0.4)` }} />
          </div>
        )}
        <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(0,0,0,0.72) 0%, transparent 52%)" }} />
        <NewBadgeOverlay track={track} />
        <div className="absolute bottom-2 left-2 w-8 h-8 rounded-full flex items-center justify-center" style={{ background: isPlaying ? `rgba(${BLUE},0.18)` : `rgba(${BLUE},0.92)`, border: isPlaying ? `1px solid rgba(${BLUE},0.55)` : "none", boxShadow: `0 0 14px rgba(${BLUE},0.35)` }}>
          {isPlaying ? <Pause className="w-3 h-3" style={{ color: `rgb(${BLUE})` }} /> : <Play className="w-3 h-3 ml-0.5" style={{ color: "#000" }} />}
        </div>
      </div>
      <div className="p-2.5">
        <p className="text-white truncate" style={{ fontSize: 10, fontWeight: 800, lineHeight: 1.2 }}>{track.title}</p>
        <p className="truncate mt-1" style={{ fontSize: 9, color: "rgba(255,255,255,0.42)" }}>{track.artist_display || "Upper Vibe Media"}</p>
      </div>
    </button>
  );
}

export default function RadioCTA() {
  const [newestTracks, setNewestTracks] = useState([]);
  const [myVibePreviewTrack, setMyVibePreviewTrack] = useState(null);
  const { currentTrack, isPlaying, togglePlay } = usePlayer();
  const { tracksLoaded, likedIdsLoaded, currentRadioSong, startMyVibeQueue, nextRadioSong, jumpToSong, upNext } = useRadio();
  const [ramState, setRamState] = useState(() => ramGetState());

  useEffect(() => ramSubscribe((state) => setRamState(state)), []);

  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(() => {
      base44.entities.Track.filter({ status: "published" }, "-created_date", 24)
        .then((rows) => {
          if (cancelled) return;
          setNewestTracks((rows || []).filter((track) => track.audio_url && track.cover_url).slice(0, 6));
        })
        .catch(() => {});
    }, 250);
    return () => { cancelled = true; clearTimeout(timer); };
  }, []);

  useEffect(() => {
    if (!tracksLoaded || !likedIdsLoaded || currentRadioSong || myVibePreviewTrack) return;
    startMyVibeQueue((firstTrack) => setMyVibePreviewTrack(firstTrack || null));
  }, [tracksLoaded, likedIdsLoaded, currentRadioSong, myVibePreviewTrack, startMyVibeQueue]);

  useEffect(() => {
    if (currentRadioSong) setMyVibePreviewTrack(currentRadioSong);
  }, [currentRadioSong]);

  const ramTrack = ramState.activeMode === "myVibeRadio" ? ramState.currentTrack : null;
  const activeTrack = ramTrack || currentTrack || null;
  const sourceTrack = currentRadioSong || myVibePreviewTrack;
  const showTrack = activeTrack || sourceTrack;
  const showPlaying = ramState.activeMode === "myVibeRadio" ? ramState.isPlaying : (isPlaying && !!currentTrack);

  const handlePlayCta = useCallback(() => {
    const target = sourceTrack || showTrack;
    if (!target?.audio_url) return;

    if (ramState.activeMode === "myVibeRadio" && ramState.currentTrack?.id === target.id) {
      if (ramState.isPlaying) pauseMyVibe();
      else resumeMyVibe();
      return;
    }

    if (!ramState.activeMode && currentTrack?.id === target.id) {
      togglePlay?.();
      return;
    }

    playMyVibeTrack(target);
  }, [sourceTrack, showTrack, ramState.activeMode, ramState.currentTrack?.id, ramState.isPlaying, currentTrack?.id, togglePlay]);

  const handleSkipCta = useCallback(() => {
    const nextTrack = upNext?.find((track) => track?.audio_url);
    if (nextTrack && jumpToSong) {
      jumpToSong(nextTrack, playMyVibeTrack);
      return;
    }
    nextRadioSong?.();
  }, [upNext, jumpToSong, nextRadioSong]);

  const handlePlayNewest = useCallback((track) => {
    if (!track?.audio_url) return;
    if (jumpToSong) jumpToSong(track, playMyVibeTrack);
    else playMyVibeTrack(track);
  }, [jumpToSong]);

  const r = BLUE;
  const primaryColor = `rgb(${r})`;
  const rgba = (a) => `rgba(${r},${a})`;
  const freqLabel = showTrack?.frequency_type === "432hz" ? "432 Hz" : showTrack?.frequency_type === "528hz" ? "528 Hz" : "High-Vibe";
  const label = showPlaying ? "My Vibe Playing" : "My Vibe Pick";

  return (
    <section className="flex flex-col gap-3 rounded-3xl relative overflow-hidden" style={{ background: rgba(0.06), border: `1px solid ${rgba(0.35)}`, boxShadow: `0 0 24px rgba(${r},0.1)` }}>
      <div className="absolute pointer-events-none" style={{ inset: 0, background: `radial-gradient(ellipse at top, rgba(${r},0.1) 0%, transparent 70%)`, zIndex: 0 }} />
      <div className="relative z-10 flex flex-col gap-3 p-4">
        {showTrack && (
          <div className="rounded-2xl overflow-hidden" style={{ background: "rgba(0,0,0,0.35)", border: `1px solid ${rgba(0.3)}` }}>
            <div className="px-3 pt-3 pb-0">
              <span style={{ fontSize: 8, fontWeight: 900, letterSpacing: "0.38em", textTransform: "uppercase", color: primaryColor, fontFamily: "var(--font-heading)" }}>{label}</span>
            </div>
            <div className="flex items-center gap-3 p-3">
              <div className="flex-shrink-0 rounded-xl overflow-hidden relative" style={{ width: 106, height: 106, background: rgba(0.1), border: `1px solid ${rgba(0.2)}` }}>
                {showTrack.cover_url ? <img src={showTrack.cover_url} alt={showTrack.title} loading="eager" className="w-full h-full" style={{ objectFit: "cover", objectPosition: "center top" }} /> : (
                  <div className="w-full h-full flex items-center justify-center"><Music2 className="w-6 h-6" style={{ color: rgba(0.5) }} /></div>
                )}
              </div>
              <div className="flex-1 min-w-0 flex flex-col gap-2">
                <div>
                  <div className="flex items-center gap-1.5 mb-1"><FreqBadge label={freqLabel} /><NewBadge track={showTrack} /></div>
                  <p className="font-black text-white truncate" style={{ fontFamily: "var(--font-heading)", fontSize: "0.95rem", lineHeight: 1.2 }}>{showTrack.title}</p>
                  <p className="truncate" style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.5)", marginTop: 2 }}>{showTrack.artist_display || "Upper Vibe Media"}</p>
                </div>
                <div className="flex items-center gap-2">
                  <motion.button onClick={handlePlayCta} whileTap={{ scale: 0.9 }} className="flex items-center gap-1 px-2 py-1 rounded-lg font-black transition-all" style={{ background: showPlaying ? rgba(0.2) : `linear-gradient(135deg,rgba(${r},0.85),${primaryColor})`, border: showPlaying ? `1px solid ${rgba(0.6)}` : "none", color: showPlaying ? primaryColor : "#000", boxShadow: `0 0 16px ${rgba(0.4)}`, fontFamily: "var(--font-heading)", letterSpacing: "0.04em", fontSize: 10, flexShrink: 0 }}>
                    {showPlaying ? <><Pause className="w-2.5 h-2.5" /> Playing</> : <><Play className="w-2.5 h-2.5 ml-0.5" /> Play</>}
                  </motion.button>
                  <button onClick={handleSkipCta} className="flex items-center justify-center rounded-lg" style={{ width: 28, height: 24, background: rgba(0.08), border: `1px solid ${rgba(0.22)}`, color: primaryColor }} aria-label="Skip My Vibe song">
                    <SkipForward className="w-3 h-3" />
                  </button>
                  <MusicBars color={primaryColor} active={showPlaying} />
                </div>
              </div>
            </div>
            <div className="px-3 pb-3 pt-2">
              <Link to="/music" className="w-full flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-black tracking-wide transition-all active:scale-[0.97]" style={{ background: rgba(0.08), border: `1px solid ${rgba(0.2)}`, color: primaryColor, fontFamily: "var(--font-heading)" }}>
                Explore Library →
              </Link>
            </div>
          </div>
        )}

        {newestTracks.length > 0 && (
          <div className="flex flex-col gap-2">
            <p style={{ fontSize: 8, fontWeight: 900, letterSpacing: "0.3em", textTransform: "uppercase", color: "rgba(255,255,255,0.28)", fontFamily: "var(--font-heading)" }}>Newest Songs</p>
            <div className="flex gap-2.5 overflow-x-auto" style={{ scrollSnapType: "x mandatory", WebkitOverflowScrolling: "touch", msOverflowStyle: "none", scrollbarWidth: "none" }}>
              {newestTracks.map((track) => (
                <NewestTrackCard key={track.id} track={track} onPlay={handlePlayNewest} isPlaying={showPlaying && showTrack?.id === track.id} />
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}