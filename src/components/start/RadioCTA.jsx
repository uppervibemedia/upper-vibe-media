import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Play, Pause, Music2 } from "lucide-react";
import FreqBadge from "@/components/shared/FreqBadge";
import { motion } from "framer-motion";
import { base44 } from "@/api/base44Client";
import { usePlayer } from "@/context/PlayerContext";
import { useRadio } from "@/context/RadioContext";
import { pickSmallCards } from "@/lib/featuredTrackPicker";
import NewBadge, { NewBadgeOverlay } from "@/components/shared/NewBadge";
import {
  subscribe as ramSubscribe,
  getState as ramGetState,
  playMyVibeTrack,
  pauseMyVibe,
  resumeMyVibe,
} from "@/lib/radioAudioManager";

const BLUE = "0,160,220";

// Music bars — always animate, fast when playing
function MusicBars({ color = `rgb(${BLUE})`, active = false }) {
  return (
    <>
      <style>{`
        @keyframes rcBar1 { 0%,100% { height: 3px } 50% { height: 14px } }
        @keyframes rcBar2 { 0%,100% { height: 10px } 50% { height: 3px } }
        @keyframes rcBar3 { 0%,100% { height: 5px } 50% { height: 13px } }
        @keyframes rcBar4 { 0%,100% { height: 12px } 50% { height: 4px } }
      `}</style>
      <span style={{ display: "inline-flex", alignItems: "flex-end", gap: "3px", height: "18px" }}>
        {[
          { anim: "rcBar1", delay: "0s" },
          { anim: "rcBar2", delay: "0.18s" },
          { anim: "rcBar3", delay: "0.09s" },
          { anim: "rcBar4", delay: "0.27s" },
        ].map(({ anim, delay }, i) => (
          <span
            key={i}
            style={{
              display: "inline-block",
              width: "3px",
              borderRadius: "2px",
              background: color,
              height: "6px",
              animation: `${anim} ${active ? "0.55s" : "2.2s"} ease-in-out infinite`,
              animationDelay: delay,
              opacity: active ? 1 : 0.5,
            }}
          />
        ))}
      </span>
    </>
  );
}

// Small swipeable song card — entire card navigates to the song detail page
function SmallTrackCard({ track }) {
  const navigate = useNavigate();

  return (
    <div
      onClick={() => navigate(`/song/${track.id}`)}
      className="relative flex-shrink-0 rounded-xl overflow-hidden cursor-pointer transition-all active:scale-[0.95]"
      style={{
        width: 112,
        height: 112,
        background: "#111",
        border: `1px solid rgba(255,255,255,0.08)`,
        scrollSnapAlign: "start",
        WebkitTapHighlightColor: "transparent",
      }}
    >
      {track.cover_url ? (
        <img src={track.cover_url} alt={track.title} loading="lazy" className="w-full h-full object-cover" />
      ) : (
        <div className="w-full h-full flex items-center justify-center" style={{ background: `rgba(${BLUE},0.07)` }}>
          <Music2 style={{ width: 22, height: 22, color: `rgba(${BLUE},0.4)` }} />
        </div>
      )}

      {/* Dark gradient overlay */}
      <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(0,0,0,0.75) 0%, transparent 45%)" }} />

      <NewBadgeOverlay track={track} />

      <p className="absolute bottom-2 left-2 right-2 text-white truncate"
        style={{ fontSize: "10px", fontWeight: 700, lineHeight: 1.2, textShadow: "0 1px 4px rgba(0,0,0,0.9)" }}>
        {track.title}
      </p>
    </div>
  );
}

export default function RadioCTA() {
  const [tracks, setTracks] = useState([]);
  const [featuredTrack, setFeaturedTrack] = useState(null);
  const { currentTrack, isPlaying, togglePlay } = usePlayer();
  const { currentRadioSong, startMyVibeQueue } = useRadio();
  const [ramState, setRamState] = useState(() => ramGetState());
  useEffect(() => { return ramSubscribe((s) => setRamState(s)); }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      base44.entities.Track.filter({ status: "published" }, "-created_date", 50)
        .then((recent) => {
          const eligible = recent.filter((t) => t.audio_url && t.cover_url);
          const featured = eligible[0] || null;
          setFeaturedTrack(featured);
          setTracks(pickSmallCards(eligible, featured?.id, 3));
        }).catch(() => {});
    }, 300);
    return () => clearTimeout(timer);
  }, []);

  // ── Display logic ───────────────────────
  // My Vibe Radio state → active global song → last My Vibe track → featured fallback.
  const ramTrack = ramState.activeMode === "myVibeRadio" ? ramState.currentTrack : null;
  const displayTrack = ramTrack || currentRadioSong || currentTrack || ramState.lastTrack || featuredTrack;
  const effectivePlaying = ramState.activeMode === "myVibeRadio"
    ? ramState.isPlaying
    : (isPlaying && !!currentTrack);

  const handlePlayFeatured = () => {
    // RAM myVibeRadio — toggle via RAM
    if (ramState.activeMode === "myVibeRadio") {
      if (ramState.isPlaying) pauseMyVibe();
      else resumeMyVibe();
      return;
    }

    // PlayerContext has a track — toggle
    if (currentTrack) { togglePlay(); return; }

    // Nothing playing — user directly chose this Start page song.
    if (displayTrack?.audio_url) playMyVibeTrack(displayTrack);
  };

  const showTrack = displayTrack;
  const showPlaying = effectivePlaying;
  const r = BLUE;
  const primaryColor = `rgb(${r})`;
  const rgba = (a) => `rgba(${r},${a})`;

  const freqLabel = showTrack?.frequency_type === "432hz" ? "432 Hz"
    : showTrack?.frequency_type === "528hz" ? "528 Hz"
    : "High-Vibe";

  // Label text — matches Home hero labels
  const label = (ramState.activeMode === "myVibeRadio" && ramState.isPlaying)
    ? "My Vibe Radio"
    : ramTrack
      ? "My Vibe Paused"
      : isPlaying && currentTrack
        ? "Now Playing"
        : currentTrack
          ? "Paused"
          : currentRadioSong
            ? "On Air"
            : "Featured Track";

  return (
    <section
      className="flex flex-col gap-3 rounded-3xl relative overflow-hidden"
      style={{
        background: rgba(0.06),
        border: `1px solid ${rgba(0.35)}`,
        boxShadow: `0 0 24px rgba(${r},0.1)`,
      }}
    >
      {/* Ambient glow */}
      <div className="absolute pointer-events-none" style={{
        inset: 0,
        background: `radial-gradient(ellipse at top, rgba(${r},0.1) 0%, transparent 70%)`,
        zIndex: 0,
      }} />

      <div className="relative z-10 flex flex-col gap-3 p-4">

        {/* ── Featured Player Card ── */}
        {showTrack && (
          <div className="rounded-2xl overflow-hidden"
            style={{ background: "rgba(0,0,0,0.35)", border: `1px solid ${rgba(0.3)}` }}>

            {/* Label */}
            <div className="px-3 pt-3 pb-0">
              <span style={{
                fontSize: "8px", fontWeight: 900, letterSpacing: "0.38em",
                textTransform: "uppercase", color: primaryColor,
                fontFamily: "var(--font-heading)",
              }}>
                {label}
              </span>
            </div>

            {/* Music card layout — square art + info side by side */}
            <div className="flex items-center gap-3 p-3">
              {/* Square album art */}
              <div className="flex-shrink-0 rounded-xl overflow-hidden relative"
                style={{ width: 106, height: 106, background: rgba(0.1), border: `1px solid ${rgba(0.2)}` }}>
                {showTrack.cover_url ? (
                  <img
                    src={showTrack.cover_url}
                    alt={showTrack.title}
                    loading="eager"
                    className="w-full h-full"
                    style={{ objectFit: "cover", objectPosition: "center top" }}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Music2 className="w-6 h-6" style={{ color: rgba(0.5) }} />
                  </div>
                )}
              </div>

              {/* Info + controls */}
              <div className="flex-1 min-w-0 flex flex-col gap-2">
                {/* Badge + title + artist */}
                <div>
                  <div className="flex items-center gap-1.5 mb-1">
                    <FreqBadge label={freqLabel} />
                    <NewBadge track={showTrack} />
                  </div>
                  <p className="font-black text-white truncate" style={{ fontFamily: "var(--font-heading)", fontSize: "0.95rem", lineHeight: 1.2 }}>
                    {showTrack.title}
                  </p>
                  <p className="truncate" style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.5)", marginTop: "2px" }}>
                    {showTrack.artist_display || "Upper Vibe Media"}
                  </p>
                </div>

                {/* Play button + bars */}
                <div className="flex items-center gap-2">
                  <motion.button
                    onClick={handlePlayFeatured}
                    whileTap={{ scale: 0.9 }}
                    className="flex items-center gap-1 px-2 py-1 rounded-lg font-black transition-all"
                    style={{
                      background: showPlaying ? rgba(0.2) : `linear-gradient(135deg,rgba(${r},0.85),${primaryColor})`,
                      border: showPlaying ? `1px solid ${rgba(0.6)}` : "none",
                      color: showPlaying ? primaryColor : "#000",
                      boxShadow: `0 0 16px ${rgba(0.4)}`,
                      fontFamily: "var(--font-heading)",
                      letterSpacing: "0.04em",
                      fontSize: "10px",
                      flexShrink: 0,
                    }}
                  >
                    {showPlaying
                      ? <><Pause className="w-2.5 h-2.5" /> Playing</>
                      : <><Play className="w-2.5 h-2.5 ml-0.5" /> Play</>}
                  </motion.button>
                  <MusicBars color={primaryColor} active={showPlaying} />
                </div>
              </div>
            </div>



            {/* Explore Library footer */}
            <div className="px-3 pb-3 pt-2">
              <Link to="/music"
                className="w-full flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-black tracking-wide transition-all active:scale-[0.97]"
                style={{ background: rgba(0.08), border: `1px solid ${rgba(0.2)}`, color: primaryColor, fontFamily: "var(--font-heading)" }}>
                Explore Library →
              </Link>
            </div>
          </div>
        )}

        {/* ── Small song cards (3) ── */}
        {tracks.length > 0 && (
          <div className="flex gap-2.5 overflow-x-auto"
            style={{ scrollSnapType: "x mandatory", WebkitOverflowScrolling: "touch", msOverflowStyle: "none", scrollbarWidth: "none" }}>
            {tracks.map((track) => (
              <SmallTrackCard
                key={track.id}
                track={track}
              />
            ))}
          </div>
        )}


      </div>
    </section>
  );
}