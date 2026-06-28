/**
 * SongMiniSheet — slide-up song detail panel for My Vibe Radio
 *
 * Opens over the Radio page WITHOUT navigating away, so the global player
 * (My Vibe Radio) keeps playing uninterrupted. Shows song metadata,
 * streaming links, and a download action.
 */
import React, { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { X, Download, Lock, ExternalLink, Music4, Tag, User } from "lucide-react";
import { Link } from "react-router-dom";
import StreamingPlatformLinks from "@/components/shared/StreamingPlatformLinks";
import FreqBadge from "@/components/shared/FreqBadge";
import NewBadge from "@/components/shared/NewBadge";
import { recordUserDownload, triggerBrowserDownload, isRestrictedInAppBrowser, logDownloadEnv } from "@/lib/downloadService";
import { useAuth } from "@/lib/AuthContext";
import { toast } from "sonner";

export default function SongMiniSheet({ track, isPlus, p, theme, downloadIntent, onClose }) {
  const { user } = useAuth();
  const downloadRef = useRef(null);

  // Scroll to download button if downloadIntent
  useEffect(() => {
    if (downloadIntent && downloadRef.current) {
      setTimeout(() => {
        downloadRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 400);
    }
  }, [downloadIntent]);

  const handleDownload = async () => {
    if (!track?.audio_url) return;
    logDownloadEnv(track.id, isPlus);
    if (isRestrictedInAppBrowser()) {
      toast.error("Open in Safari or Chrome to download.");
      return;
    }
    if (user) recordUserDownload(user, track).catch(() => {});
    const filename = `${track.title || "song"}${track.artist_display ? " - " + track.artist_display : ""}`;
    const result = await triggerBrowserDownload(track.id, filename);
    if (result === "blob") {
      toast.success("Download started");
    } else if (result === "restricted_browser") {
      toast.error("Open in Safari or Chrome to download.");
    } else {
      toast.error("Download failed. Please try again.");
    }
  };

  const freq = track?.frequency_type === "432hz" ? "432 Hz" : track?.frequency_type === "528hz" ? "528 Hz" : "";
  const releaseYear = track?.release_date ? new Date(track.release_date).getFullYear() : null;

  return (
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 z-50"
        style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(6px)" }}
        onClick={onClose}
      />

      {/* Sheet */}
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 30, stiffness: 280 }}
        className="fixed bottom-0 left-0 right-0 z-50 rounded-t-3xl overflow-hidden"
        style={{
          background: "rgba(8,8,22,0.98)",
          border: "1px solid rgba(255,255,255,0.08)",
          borderBottom: "none",
          maxHeight: "85vh",
          overflowY: "auto",
        }}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full" style={{ background: "rgba(255,255,255,0.15)" }} />
        </div>

        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center transition-all hover:brightness-125"
          style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)" }}
        >
          <X className="w-4 h-4" style={{ color: "rgba(255,255,255,0.5)" }} />
        </button>

        <div className="px-5 pb-10 pt-2">
          {/* Cover + info row */}
          <div className="flex gap-4 mb-5">
            {/* Cover */}
            <div className="flex-shrink-0 w-24 h-24 rounded-2xl overflow-hidden"
              style={{ border: `1px solid rgba(${p},0.25)` }}>
              {track.cover_url ? (
                <img src={track.cover_url} alt={track.title} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center" style={{ background: `rgba(${p},0.08)` }}>
                  <Music4 className="w-8 h-8" style={{ color: `rgb(${p})` }} />
                </div>
              )}
            </div>

            {/* Meta */}
            <div className="flex-1 min-w-0 flex flex-col justify-center gap-1.5">
              {/* Badges */}
              <div className="flex flex-wrap gap-1">
                {freq && <FreqBadge label={freq} color={p} />}
                {track.album && (
                  <span className="flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded-full"
                    style={{ background: "rgba(212,168,67,0.12)", border: "1px solid rgba(212,168,67,0.25)", color: "#D4A843" }}>
                    <Tag className="w-2 h-2" /> {track.album}
                  </span>
                )}
                {releaseYear && (
                  <span className="text-[9px] font-bold px-2 py-0.5 rounded-full"
                    style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.4)" }}>
                    {releaseYear}
                  </span>
                )}
                <NewBadge track={track} />
              </div>

              <h2 className="font-heading font-black text-white leading-tight" style={{ fontSize: "clamp(1rem,4vw,1.3rem)" }}>
                {track.title}
              </h2>
              <p className="text-white/40 text-xs flex items-center gap-1">
                <User className="w-3 h-3" />
                {track.artist_display || "Upper Vibe Media"}
              </p>
            </div>
          </div>

          {/* Description */}
          {track.description && (
            <p className="text-xs text-white/35 leading-relaxed mb-5 line-clamp-3">{track.description}</p>
          )}

          {/* Download button */}
          <div className="mb-4" ref={downloadRef}>
            {isPlus ? (
              track.audio_url ? (
                <button
                  onClick={handleDownload}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-black text-sm tracking-wide transition-all hover:brightness-110 active:scale-[0.97]"
                  style={{
                    background: "linear-gradient(135deg,#D4A843,#F0C060)",
                    color: "#000",
                    boxShadow: downloadIntent ? "0 0 0 2px rgba(212,168,67,0.5), 0 0 20px rgba(212,168,67,0.4)" : "0 0 16px rgba(212,168,67,0.25)",
                  }}
                >
                  <Download className="w-4 h-4" /> Download Song
                </button>
              ) : (
                <div className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-black text-sm opacity-40 cursor-not-allowed"
                  style={{ border: "1px solid rgba(212,168,67,0.2)", color: "#D4A843" }}>
                  <Download className="w-4 h-4" /> Coming Soon
                </div>
              )
            ) : (
              <Link
                to="/upgrade"
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-black text-sm tracking-wide transition-all hover:brightness-110"
                style={{ background: "linear-gradient(135deg,rgba(212,168,67,0.15),rgba(212,168,67,0.08))", border: "1px solid rgba(212,168,67,0.35)", color: "#D4A843" }}
              >
                <Lock className="w-4 h-4" /> Unlock Downloads — Plus
              </Link>
            )}
          </div>

          {/* Streaming platform links */}
          <div className="mb-5">
            <StreamingPlatformLinks track={track} mode="song" />
          </div>

          {/* View full song page link */}
          <Link
            to={`/song/${track.id}?source=myVibeRadio&returnPath=/radio`}
            className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-xs font-black tracking-wide transition-all hover:brightness-125"
            style={{ background: `rgba(${p},0.07)`, border: `1px solid rgba(${p},0.2)`, color: `rgb(${p})` }}
          >
            <ExternalLink className="w-3.5 h-3.5" /> View Full Song Page
          </Link>

          {/* Safe area spacer */}
          <div style={{ height: "env(safe-area-inset-bottom, 16px)" }} />
        </div>
      </motion.div>
    </>
  );
}