import React, { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ExternalLink, ChevronRight, Heart, Maximize2 } from "lucide-react";
import { useTheme } from "@/context/ThemeContext";
import { RADIO_THEMES } from "@/components/radio/RadioThemePicker";

function extractVideoId(url) {
  if (!url) return null;
  const match = url.match(/(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/);
  return match ? match[1] : null;
}

function toEmbedUrl(videoId) {
  if (!videoId) return null;
  return `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0&playsinline=1&modestbranding=1&fs=1`;
}

function toWatchUrl(url) {
  const id = extractVideoId(url);
  return id ? `https://www.youtube.com/watch?v=${id}` : (url || null);
}

export default function VisualizerModal({ viz, onClose, pauseAudio, allVisualizers = [], onSwitchViz, isFaved, onToggleFav }) {
  const savedScrollY = useRef(0);
  const { accentId } = useTheme();
  const rtp = (RADIO_THEMES[accentId] || RADIO_THEMES.cyan).vars["--rt-primary"];

  const videoId = extractVideoId(viz?.embed_url || viz?.video_url);
  const embedUrl = toEmbedUrl(videoId);
  const watchUrl = toWatchUrl(viz?.video_url || viz?.embed_url);

  // Related visualizers
  const related = allVisualizers
    .filter((v) => v.id !== viz?.id && (v.category === viz?.category || v.artist === viz?.artist))
    .slice(0, 4);

  // Save scroll pos and lock body on mount
  useEffect(() => {
    savedScrollY.current = window.scrollY;
    if (pauseAudio) pauseAudio();
    document.body.style.overflow = "hidden";
    document.body.style.position = "fixed";
    document.body.style.top = `-${savedScrollY.current}px`;
    document.body.style.width = "100%";
    return () => {
      document.body.style.overflow = "";
      document.body.style.position = "";
      document.body.style.top = "";
      document.body.style.width = "";
      window.scrollTo({ top: savedScrollY.current, behavior: "instant" });
    };
  }, []);

  // Escape key
  useEffect(() => {
    const handler = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  if (!viz) return null;

  return (
    <AnimatePresence>
      <motion.div
        key="viz-modal-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[300] flex flex-col items-center overflow-y-auto"
        style={{
          background: "rgba(4,4,14,0.97)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          paddingTop: "env(safe-area-inset-top, 0px)",
        }}
        onClick={onClose}
      >
        <motion.div
          key="viz-modal-content"
          initial={{ scale: 0.97, opacity: 0, y: 12 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.97, opacity: 0, y: 12 }}
          transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
          className="relative w-full max-w-4xl px-0 md:px-6 md:pt-8 pb-10"
          onClick={(e) => e.stopPropagation()}
        >
          {/* ── Top bar: brand + close ── */}
          <div className="flex items-center justify-between px-4 md:px-0 py-3 md:pb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-6 h-6 rounded-md overflow-hidden flex-shrink-0">
                <img
                  src="https://media.base44.com/images/public/69cd68afb7fe90ae92757154/10c561c0c_ChatGPTImageApr1202611_53_51AM.png"
                  alt="Upper Vibe Media"
                  className="w-full h-full object-contain"
                />
              </div>
              <span className="text-[9px] font-black tracking-[0.25em] uppercase" style={{ color: `rgb(${rtp})` }}>
                Upper Vibe Media
              </span>
            </div>
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-full flex items-center justify-center transition-all hover:bg-white/10 active:scale-90"
              style={{ border: "1px solid rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.6)" }}
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* ── Video player 16:9 ── */}
          <div
            className="relative w-full md:rounded-2xl overflow-hidden"
            style={{ paddingBottom: "56.25%", background: "#000" }}
          >
            <div className="absolute inset-0">
              {embedUrl ? (
                <iframe
                  src={embedUrl}
                  title={viz.title}
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
                  allowFullScreen
                  referrerPolicy="strict-origin-when-cross-origin"
                  className="w-full h-full"
                  // playsInline is critical for inline mobile playback
                  style={{ display: "block" }}
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center gap-4 px-6 text-center"
                  style={{ background: "#000" }}>
                  <p className="text-sm text-white/50">This visualizer can be watched on YouTube.</p>
                  {watchUrl && (
                    <a
                      href={watchUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold"
                      style={{ background: `rgba(${rtp},0.12)`, border: `1px solid rgba(${rtp},0.3)`, color: `rgb(${rtp})` }}
                    >
                      <ExternalLink className="w-4 h-4" /> Watch on YouTube
                    </a>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* ── Info bar below video ── */}
          <div className="px-4 md:px-0 mt-4 flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <h2 className="font-heading font-black text-lg md:text-xl text-white leading-tight line-clamp-2">
                {viz.title}
              </h2>
              <p className="text-sm text-white/40 mt-0.5">{viz.artist || "Upper Vibe Media"}</p>
              {viz.linked_song_title && (
                <p className="text-xs mt-1" style={{ color: `rgba(${rtp},0.7)` }}>🎵 {viz.linked_song_title}</p>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 flex-shrink-0">
              {onToggleFav && (
                <button
                  onClick={() => onToggleFav(viz)}
                  className="w-9 h-9 rounded-xl flex items-center justify-center transition-all hover:scale-110"
                  style={isFaved
                    ? { background: "rgba(155,126,255,0.22)", border: "1px solid rgba(155,126,255,0.55)", color: "#9B7EFF" }
                    : { background: "rgba(155,126,255,0.06)", border: "1px solid rgba(155,126,255,0.3)", color: "rgba(155,126,255,0.55)" }}
                >
                  <Heart className={`w-4 h-4 ${isFaved ? "fill-current" : ""}`} />
                </button>
              )}
              {watchUrl && (
                <a
                  href={watchUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-9 h-9 rounded-xl flex items-center justify-center transition-all hover:bg-white/10"
                  style={{ border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.4)" }}
                  title="Open on YouTube"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              )}
            </div>
          </div>

          {/* ── Related visualizers ── */}
          {related.length > 0 && (
            <div className="px-4 md:px-0 mt-6">
              <p className="text-[9px] font-black tracking-[0.28em] uppercase mb-3" style={{ color: "rgba(255,255,255,0.25)" }}>
                Related Visualizers
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {related.map((v) => (
                  <button
                    key={v.id}
                    onClick={() => onSwitchViz && onSwitchViz(v)}
                    className="group rounded-xl overflow-hidden text-left transition-all hover:opacity-80 active:scale-[0.97]"
                    style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}
                  >
                    <div className="relative overflow-hidden" style={{ paddingBottom: "56.25%" }}>
                      <div className="absolute inset-0">
                        {v.thumbnail_url ? (
                          <img src={v.thumbnail_url} alt={v.title} className="w-full h-full object-cover" loading="lazy" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center" style={{ background: `rgba(${rtp},0.06)` }} />
                        )}
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                          style={{ background: "rgba(0,0,0,0.5)" }}>
                          <ChevronRight className="w-5 h-5 text-white" />
                        </div>
                      </div>
                    </div>
                    <div className="p-2">
                      <p className="text-xs font-bold text-white truncate">{v.title}</p>
                      <p className="text-[10px] text-white/35 truncate">{v.artist}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Close hint */}
          <p className="text-center text-[10px] text-white/15 mt-6 px-4">
            Tap outside or press Esc to close
          </p>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}