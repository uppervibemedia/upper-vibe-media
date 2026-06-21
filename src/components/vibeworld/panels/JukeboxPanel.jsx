import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Music4, Play, Disc3 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { usePlayer } from "@/context/PlayerContext";

const JUKEBOX_COLOR = "#00D4F0";

export default function JukeboxPanel({ open, onClose, isMobile }) {
  const [featuredTracks, setFeaturedTracks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [playingId, setPlayingId] = useState(null);
  const { playTrack, currentTrack, isPlaying } = usePlayer() || {};

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    base44.entities.Track.filter({ is_featured: true, status: "published" }, "-display_order", 20)
      .then((tracks) => {
        if (tracks.length === 0) {
          // fallback: any published tracks
          return base44.entities.Track.list("-created_date", 16);
        }
        return tracks;
      })
      .then(setFeaturedTracks)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [open]);

  const handlePlay = (track) => {
    if (playTrack) {
      playTrack(track);
      setPlayingId(track.id);
    }
  };

  const isCurrentlyPlaying = (track) =>
    currentTrack?.id === track.id && isPlaying;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="jukebox-panel"
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 40 }}
          transition={{ type: "spring", stiffness: 280, damping: 28 }}
          className="absolute left-0 right-0 bottom-0 z-[70] pointer-events-auto"
          style={{
            paddingBottom: isMobile
              ? "calc(env(safe-area-inset-bottom, 0px) + 5.5rem)"
              : "5.5rem",
          }}
        >
          <div
            className="mx-auto rounded-2xl overflow-hidden"
            style={{
              maxWidth: isMobile ? "100%" : "440px",
              margin: isMobile ? "0 8px" : "0 auto",
              background: "rgba(8,8,24,0.97)",
              border: `1px solid rgba(0,212,240,0.25)`,
              boxShadow: `0 0 40px rgba(0,212,240,0.15), 0 8px 32px rgba(0,0,0,0.6)`,
              backdropFilter: "blur(20px)",
            }}
          >
            {/* Header */}
            <div
              className="flex items-center justify-between px-4 py-3"
              style={{ borderBottom: "1px solid rgba(0,212,240,0.12)" }}
            >
              <div className="flex items-center gap-2.5">
                <div
                  className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{
                    background: `rgba(0,212,240,0.15)`,
                    border: `1px solid rgba(0,212,240,0.3)`,
                  }}
                >
                  <Disc3 className="w-4 h-4" style={{ color: JUKEBOX_COLOR }} />
                </div>
                <div>
                  <p className="font-heading font-black text-sm text-white leading-none">
                    Plaza Jukebox
                  </p>
                  <p className="text-[9px] text-white/35 mt-0.5 leading-none">
                    Featured tracks · plays for everyone nearby
                  </p>
                </div>
              </div>
              <button
                onTouchStart={(e) => e.stopPropagation()}
                onClick={onClose}
                className="w-7 h-7 rounded-full flex items-center justify-center transition-all hover:bg-white/10 active:scale-90"
                style={{ color: "rgba(255,255,255,0.4)", touchAction: "manipulation" }}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Proximity hint */}
            <div
              className="flex items-center gap-2 px-4 py-2"
              style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}
            >
              <div
                className="w-2 h-2 rounded-full animate-pulse flex-shrink-0"
                style={{ background: JUKEBOX_COLOR }}
              />
              <p className="text-[10px] font-medium" style={{ color: `rgba(0,212,240,0.7)` }}>
                🎶 Stay on the dance floor to hear it at full volume
              </p>
            </div>

            {/* Track list */}
            <div
              className="overflow-y-auto"
              style={{ maxHeight: isMobile ? "40vh" : "320px" }}
            >
              {loading && (
                <div className="flex items-center justify-center py-10">
                  <div className="w-5 h-5 border-2 border-cyan-500/30 border-t-cyan-400 rounded-full animate-spin" />
                </div>
              )}
              {!loading && featuredTracks.length === 0 && (
                <p className="text-center text-xs text-white/30 py-10">
                  No featured tracks yet
                </p>
              )}
              {!loading &&
                featuredTracks.map((track) => {
                  const active = isCurrentlyPlaying(track);
                  return (
                    <button
                      key={track.id}
                      onTouchStart={(e) => e.stopPropagation()}
                      onClick={() => handlePlay(track)}
                      className="w-full flex items-center gap-3 px-4 py-3 text-left transition-all hover:bg-white/5 active:bg-white/8"
                      style={{
                        borderBottom: "1px solid rgba(255,255,255,0.03)",
                        background: active
                          ? "rgba(0,212,240,0.07)"
                          : "transparent",
                        touchAction: "manipulation",
                      }}
                    >
                      {/* Cover */}
                      <div className="relative w-10 h-10 rounded-lg overflow-hidden flex-shrink-0">
                        {track.cover_url ? (
                          <img
                            src={track.cover_url}
                            alt={track.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div
                            className="w-full h-full flex items-center justify-center"
                            style={{ background: "rgba(0,212,240,0.1)" }}
                          >
                            <Music4 className="w-4 h-4" style={{ color: JUKEBOX_COLOR }} />
                          </div>
                        )}
                        {active && (
                          <div
                            className="absolute inset-0 flex items-center justify-center"
                            style={{ background: "rgba(0,0,0,0.45)" }}
                          >
                            <div className="flex items-end gap-0.5">
                              {[1, 2, 3].map((b) => (
                                <div
                                  key={b}
                                  className="w-0.5 rounded-full"
                                  style={{
                                    background: JUKEBOX_COLOR,
                                    height: `${6 + b * 3}px`,
                                    animation: `pulse-glow ${0.4 + b * 0.15}s ease-in-out infinite alternate`,
                                  }}
                                />
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p
                          className="text-sm font-bold truncate"
                          style={{ color: active ? JUKEBOX_COLOR : "rgba(255,255,255,0.9)" }}
                        >
                          {track.title}
                        </p>
                        <p className="text-[10px] text-white/35 truncate">
                          {track.artist_display || "Upper Vibe"}
                        </p>
                      </div>

                      {/* Play icon */}
                      {!active && (
                        <Play
                          className="w-4 h-4 flex-shrink-0"
                          style={{ color: "rgba(255,255,255,0.2)" }}
                        />
                      )}
                    </button>
                  );
                })}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}