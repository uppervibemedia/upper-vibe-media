/**
 * InWorldSongPage — in-world song detail popup for Vibe World.
 * Shown when a player clicks a track card in the Music Library or DJ Booth.
 * Stays inside the world experience — does not navigate away.
 */
import React from "react";
import { motion } from "framer-motion";
import { X, Play, Pause, Download, ExternalLink, Lock, Crown, Waves } from "lucide-react";
import { usePlayer } from "@/context/PlayerContext";
import { useAuth } from "@/lib/AuthContext";
import SaveHeartButton from "@/components/shared/SaveHeartButton";

export default function InWorldSongPage({ track, onClose, isMobile, isDJPlaying }) {
  const { currentTrack, isPlaying, togglePlay, playTrack } = usePlayer() || {};
  const { user } = useAuth() || {};
  if (!track) return null;

  const isCurrent = currentTrack?.id === track.id;
  const isActive = isCurrent && isPlaying;
  const isPlus = user?.role === "admin" || user?.membership_tier === "premium" || user?.membership_tier === "vip";

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
          width: isMobile ? "min(calc(100vw - 24px), 360px)" : "340px",
          maxHeight: isMobile ? "calc(100dvh - env(safe-area-inset-top, 0px) - env(safe-area-inset-bottom, 0px) - 40px)" : "520px",
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
          className="absolute top-3 right-3 z-10 w-9 h-9 rounded-full flex items-center justify-center transition-all hover:bg-white/10 active:scale-90"
          style={{ color: "rgba(255,255,255,0.6)", touchAction: "manipulation", minWidth: 36, minHeight: 36, background: "rgba(0,0,0,0.4)" }}
        >
          <X className="w-4 h-4" />
        </button>

        {/* Cover art — full square, not cut off */}
        <div className="relative w-full flex-shrink-0" style={{ aspectRatio: "1/1" }}>
          {track.cover_url ? (
            <img
              src={track.cover_url}
              alt={track.title}
              className="w-full h-full object-cover block"
              style={{ display: "block" }}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center"
              style={{ background: "rgba(0,100,150,0.2)" }}>
              <span className="text-5xl">🎵</span>
            </div>
          )}
          {/* Gradient overlay at bottom */}
          <div className="absolute inset-x-0 bottom-0 h-1/3"
            style={{ background: "linear-gradient(to top, rgba(8,8,24,1) 0%, transparent 100%)" }} />
          {/* 432 Hz badge */}
          {track.frequency_type === "432hz" && (
            <div className="absolute top-2 left-2 flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold"
              style={{ background: "rgba(0,160,220,0.3)", color: "#00E5FF", border: "1px solid rgba(0,160,220,0.4)" }}>
              <Waves className="w-2.5 h-2.5" /> 432 Hz
            </div>
          )}
        </div>

        {/* Info */}
        <div className="px-4 pt-2 pb-1 flex-shrink-0">
          <p className="font-heading font-black text-white text-base leading-tight line-clamp-2">
            {track.title}
          </p>
          <p className="text-[11px] mt-0.5" style={{ color: "rgba(255,255,255,0.4)" }}>
            {track.artist_display || "Upper Vibe Media"}
          </p>
        </div>

        {/* Actions row */}
        <div className="px-4 pb-3 pt-1 flex items-center gap-2 flex-shrink-0">
          {/* Play */}
          <button
            onTouchStart={(e) => e.stopPropagation()}
            onClick={handlePlay}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl font-black text-sm flex-1 justify-center transition-all hover:brightness-110 active:scale-[0.97]"
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

          {/* Favorite */}
          <div onClick={(e) => e.stopPropagation()} style={{ flexShrink: 0 }}>
            <SaveHeartButton
              item={track}
              itemType="song"
              meta={{ title: track.title, artist: track.artist_display, cover_url: track.cover_url }}
              size="md"
            />
          </div>

          {/* Full song page — opens in new tab to stay in world */}
          <a
            href={`/song/${track.id}`}
            target="_blank"
            rel="noopener noreferrer"
            onTouchStart={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
            className="w-11 h-11 rounded-xl flex items-center justify-center transition-all hover:bg-white/10 active:scale-90 flex-shrink-0"
            style={{ border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.5)", touchAction: "manipulation", minWidth: 44, minHeight: 44 }}
            title="Open full song page"
          >
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>

        {/* Download row — Plus gated */}
        <div className="px-4 pb-4 flex-shrink-0">
          {isPlus ? (
            <a
              href={track.audio_url || `/song/${track.id}`}
              download={track.audio_url ? `${track.title}.mp3` : undefined}
              target={track.audio_url ? "_self" : "_blank"}
              rel="noopener noreferrer"
              onTouchStart={(e) => e.stopPropagation()}
              onClick={(e) => e.stopPropagation()}
              className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl font-black text-sm transition-all hover:brightness-110 active:scale-[0.97]"
              style={{
                background: "linear-gradient(135deg,rgba(212,168,67,0.2),rgba(212,168,67,0.1))",
                border: "1px solid rgba(212,168,67,0.4)",
                color: "#D4A843",
                minHeight: "44px",
                touchAction: "manipulation",
                textDecoration: "none",
              }}
            >
              <Download className="w-4 h-4" />
              Download (Plus)
            </a>
          ) : (
            <a
              href="/membership"
              target="_blank"
              rel="noopener noreferrer"
              onTouchStart={(e) => e.stopPropagation()}
              onClick={(e) => e.stopPropagation()}
              className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl font-black text-sm transition-all hover:brightness-110 active:scale-[0.97]"
              style={{
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.1)",
                color: "rgba(255,255,255,0.35)",
                minHeight: "44px",
                touchAction: "manipulation",
                textDecoration: "none",
              }}
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Plus Required</span>
              <Crown className="w-3 h-3 ml-0.5" style={{ color: "#D4A843" }} />
            </a>
          )}
        </div>
      </div>
    </motion.div>
  );
}