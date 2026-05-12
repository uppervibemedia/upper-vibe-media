import React, { useState } from "react";
import { motion } from "framer-motion";
import { Play, Pause, Bookmark, Download, Lock, Waves, Clock } from "lucide-react";
import { usePlayer } from "../../context/PlayerContext";

const TYPE_STYLES = {
  exclusive432: { label: "Exclusive 432 Hz", color: "#00E5FF", bg: "rgba(0,229,255,0.1)", border: "rgba(0,229,255,0.25)" },
  exclusive: { label: "Exclusive", color: "#D4A843", bg: "rgba(212,168,67,0.1)", border: "rgba(212,168,67,0.25)" },
  extended: { label: "Extended Session", color: "#9B7EFF", bg: "rgba(155,126,255,0.1)", border: "rgba(155,126,255,0.25)" },
  standard432: { label: "Standard + 432 Hz", color: "#00E5FF", bg: "rgba(0,229,255,0.08)", border: "rgba(0,229,255,0.2)" },
  standard: { label: "Standard", color: "rgba(255,255,255,0.4)", bg: "rgba(255,255,255,0.04)", border: "rgba(255,255,255,0.1)" },
};

export default function VaultTrackCard({ track, isSaved, onSave }) {
  const { playTrack, currentTrack, isPlaying, togglePlay } = usePlayer();
  const isCurrentTrack = currentTrack?.id === track.id;
  const typeStyle = TYPE_STYLES[track.typeKey] || TYPE_STYLES.standard;

  const handlePlay = () => {
    if (isCurrentTrack) {
      togglePlay();
    } else {
      playTrack({ ...track, audio_url: track.audio_url || "" });
    }
  };

  return (
    <motion.div
      whileHover={{ y: -3 }}
      transition={{ type: "spring", damping: 22 }}
      className="rounded-2xl overflow-hidden group"
      style={{
        background: "rgba(255,255,255,0.025)",
        border: `1px solid ${isCurrentTrack ? "rgba(0,229,255,0.3)" : "rgba(255,255,255,0.06)"}`,
        boxShadow: isCurrentTrack ? "0 0 30px rgba(0,229,255,0.08)" : "none",
      }}
    >
      {/* Cover art */}
      <div className="relative aspect-[4/3] overflow-hidden">
        <img
          src={track.cover_url}
          alt={track.title}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          style={{ opacity: 0.75 }}
        />
        <div className="absolute inset-0"
          style={{ background: "linear-gradient(to top,rgba(4,4,14,0.95) 0%,rgba(4,4,14,0.3) 60%,transparent 100%)" }} />

        {/* Play button overlay */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={handlePlay}
            className="w-14 h-14 rounded-full flex items-center justify-center transition-all hover:scale-110"
            style={{ background: "rgba(0,229,255,0.9)", boxShadow: "0 0 30px rgba(0,229,255,0.5)" }}>
            {isCurrentTrack && isPlaying
              ? <Pause className="w-6 h-6 text-black" />
              : <Play className="w-6 h-6 text-black ml-0.5" />}
          </button>
        </div>

        {/* Now playing bars */}
        {isCurrentTrack && isPlaying && (
          <div className="absolute bottom-3 left-3 flex gap-0.5 items-end h-4">
            {[1, 2, 3].map((i) => (
              <motion.div
                key={i}
                animate={{ height: ["4px", "16px", "4px"] }}
                transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15 }}
                className="w-1 rounded-full"
                style={{ background: "#00E5FF" }}
              />
            ))}
          </div>
        )}

        {/* Release type badge */}
        <div className="absolute top-3 left-3">
          <span className="text-[9px] font-black tracking-wider uppercase px-2.5 py-1 rounded-full"
            style={{ background: typeStyle.bg, border: `1px solid ${typeStyle.border}`, color: typeStyle.color }}>
            {typeStyle.label}
          </span>
        </div>

        {/* Frequency badge */}
        <div className="absolute top-3 right-3 flex items-center gap-1 px-2 py-1 rounded-full text-[9px] font-bold"
          style={{ background: "rgba(4,4,14,0.7)", border: "1px solid rgba(0,229,255,0.2)", color: "#00E5FF" }}>
          <Waves className="w-2.5 h-2.5" /> {track.frequency}
        </div>
      </div>

      {/* Info */}
      <div className="p-5">
        {/* Title & artist */}
        <div className="mb-3">
          <h3 className="font-heading font-bold text-base text-white leading-snug mb-0.5">{track.title}</h3>
          <p className="text-xs text-white/40">{track.artist}</p>
        </div>

        {/* Mood & length */}
        <div className="flex items-center justify-between gap-2 mb-4">
          <p className="text-[11px] text-white/30 leading-tight flex-1">{track.moodLabel}</p>
          <div className="flex items-center gap-1 text-[10px] text-white/25 flex-shrink-0">
            <Clock className="w-3 h-3" /> {track.length}
          </div>
        </div>

        {/* Action row */}
        <div className="flex items-center gap-2">
          {/* Play */}
          <button
            onClick={handlePlay}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-bold text-xs tracking-wider transition-all hover:brightness-110"
            style={{ background: isCurrentTrack ? "rgba(0,229,255,0.15)" : "rgba(0,229,255,0.1)", border: "1px solid rgba(0,229,255,0.2)", color: "#00E5FF" }}>
            {isCurrentTrack && isPlaying
              ? <><Pause className="w-3.5 h-3.5" /> Pause</>
              : <><Play className="w-3.5 h-3.5" /> Play</>}
          </button>

          {/* Save */}
          <button
            onClick={onSave}
            className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-all hover:scale-110"
            style={{
              background: isSaved ? "rgba(0,229,255,0.12)" : "rgba(255,255,255,0.04)",
              border: `1px solid ${isSaved ? "rgba(0,229,255,0.3)" : "rgba(255,255,255,0.08)"}`,
              color: isSaved ? "#00E5FF" : "rgba(255,255,255,0.3)",
            }}
            title="Save to Library">
            <Bookmark className={`w-4 h-4 ${isSaved ? "fill-current" : ""}`} />
          </button>

          {/* Download */}
          {track.isDownloadable && (
            <button
              className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-all hover:scale-110 relative group/dl"
              style={{
                background: track.isPremiumDownload ? "rgba(212,168,67,0.08)" : "rgba(255,255,255,0.04)",
                border: `1px solid ${track.isPremiumDownload ? "rgba(212,168,67,0.25)" : "rgba(255,255,255,0.08)"}`,
                color: track.isPremiumDownload ? "#D4A843" : "rgba(255,255,255,0.35)",
              }}
              title={track.isPremiumDownload ? "Premium Download" : "Download"}>
              {track.isPremiumDownload
                ? <Lock className="w-3.5 h-3.5" />
                : <Download className="w-4 h-4" />}
              {/* Tooltip */}
              {track.isPremiumDownload && (
                <span className="absolute -top-9 left-1/2 -translate-x-1/2 whitespace-nowrap text-[9px] font-bold tracking-wider px-2.5 py-1.5 rounded-lg opacity-0 group-hover/dl:opacity-100 transition-opacity pointer-events-none"
                  style={{ background: "rgba(212,168,67,0.9)", color: "#000" }}>
                  Premium Download
                </span>
              )}
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}