/**
 * InWorldSongPage — in-world song detail popup for Vibe World.
 * Shown when a player clicks a track card in the Music Library or DJ Booth.
 */
import React from "react";
import { motion } from "framer-motion";
import { X, Play, Pause, Heart, Download, ExternalLink } from "lucide-react";
import { usePlayer } from "@/context/PlayerContext";
import SaveHeartButton from "@/components/shared/SaveHeartButton";

export default function InWorldSongPage({ track, onClose, isMobile, isDJPlaying }) {
  const { currentTrack, isPlaying, togglePlay, playTrack } = usePlayer() || {};
  if (!track) return null;

  const isCurrent = currentTrack?.id === track.id;
  const isActive = isCurrent && isPlaying;

  const handlePlay = () => {
    if (isCurrent) {
      togglePlay?.();
    } else {
      playTrack?.(track, "song");
    }
  };

  return (
    <motion.div
      key="inworld-song-page"
      initial={{ opacity: 0, scale: 0.95, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: 20 }}
      transition={{ type: "spring", damping: 28, stiffness: 300 }}
      className="fixed inset-0 z-[90] flex items-center justify-center pointer-events-auto"
      style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(12px)" }}
      onClick={onClose}
    >
      <div
        className="relative rounded-2xl overflow-hidden flex flex-col"
        style={{
          width: isMobile ? "calc(100vw - 32px)" : "340px",
          maxHeight: isMobile ? "80dvh" : "520px",
          background: "rgba(8,8,24,0.98)",
          border: "1px solid rgba(0,229,255,0.18)",
          boxShadow: "0 0 48px rgba(0,184,212,0.15), 0 8px 40px rgba(0,0,0,0.7)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close */}
        <button
          onTouchStart={(e) => e.stopPropagation()}
          onClick={onClose}
          className="absolute top-3 right-3 z-10 w-8 h-8 rounded-full flex items-center justify-center transition-all hover:bg-white/10 active:scale-90"
          style={{ color: "rgba(255,255,255,0.5)", touchAction: "manipulation" }}
        >
          <X className="w-4 h-4" />
        </button>

        {/* Cover art */}
        <div className="relative w-full" style={{ aspectRatio: "1/1", maxHeight: "180px" }}>
          {track.cover_url ? (
            <img
              src={track.cover_url}
              alt={track.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center"
              style={{ background: "rgba(0,100,150,0.2)" }}>
              <span className="text-4xl">🎵</span>
            </div>
          )}
          {/* Gradient overlay */}
          <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(8,8,24,0.9) 0%, transparent 50%)" }} />
        </div>

        {/* Info */}
        <div className="px-4 pt-3 pb-2">
          <p className="font-heading font-black text-white text-base leading-tight line-clamp-2">
            {track.title}
          </p>
          <p className="text-[11px] mt-0.5" style={{ color: "rgba(255,255,255,0.4)" }}>
            {track.artist_display || "Upper Vibe Media"}
          </p>
          {track.frequency_type === "432hz" && (
            <span className="inline-block mt-1.5 px-2 py-0.5 rounded-full text-[9px] font-bold"
              style={{ background: "rgba(0,160,220,0.15)", color: "#00A0DC", border: "1px solid rgba(0,160,220,0.25)" }}>
              432 Hz
            </span>
          )}
        </div>

        {/* Actions */}
        <div className="px-4 pb-4 flex items-center gap-2">
          {/* Play button */}
          <button
            onTouchStart={(e) => e.stopPropagation()}
            onClick={handlePlay}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-black text-sm flex-1 justify-center transition-all hover:brightness-110 active:scale-[0.97]"
            style={{
              background: "linear-gradient(135deg,#00B8D4,#00E5FF)",
              color: "#000",
              minHeight: "44px",
              touchAction: "manipulation",
            }}
          >
            {isActive ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
            {isActive ? "Pause" : "Play"}
          </button>

          {/* Save heart */}
          <div onClick={(e) => e.stopPropagation()}>
            <SaveHeartButton
              item={track}
              itemType="song"
              meta={{ title: track.title, artist: track.artist_display, cover_url: track.cover_url }}
              size="md"
            />
          </div>

          {/* Full page link */}
          <a
            href={`/song/${track.id}`}
            target="_blank"
            rel="noopener noreferrer"
            onTouchStart={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
            className="w-10 h-10 rounded-xl flex items-center justify-center transition-all hover:bg-white/10 active:scale-90"
            style={{ border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.4)", touchAction: "manipulation" }}
            title="Open full page"
          >
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>
      </div>
    </motion.div>
  );
}