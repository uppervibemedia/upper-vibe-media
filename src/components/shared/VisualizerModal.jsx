import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ExternalLink, AlertCircle } from "lucide-react";

function extractVideoId(url) {
  if (!url) return null;
  const match = url.match(/(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/);
  return match ? match[1] : null;
}

function toEmbedUrl(url) {
  const id = extractVideoId(url);
  return id ? `https://www.youtube.com/embed/${id}` : null;
}

function toWatchUrl(url) {
  const id = extractVideoId(url);
  return id ? `https://www.youtube.com/watch?v=${id}` : (url || null);
}

/**
 * VisualizerModal — renders a fullscreen-style overlay that plays
 * the exact visualizer inline. Pauses the global audio player on open
 * and restores it on close.
 *
 * Props:
 *   viz        — Visualizer record (with video_url / embed_url)
 *   onClose    — called when the modal should close
 *   pauseAudio — optional () => void — called on mount to pause music
 */
export default function VisualizerModal({ viz, onClose, pauseAudio }) {
  const [embedError, setEmbedError] = useState(false);

  const embedUrl = toEmbedUrl(viz?.embed_url || viz?.video_url);
  const watchUrl = toWatchUrl(viz?.video_url || viz?.embed_url);

  // Pause music player when modal opens
  useEffect(() => {
    if (pauseAudio) pauseAudio();
    // Lock body scroll
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  // Close on Escape key
  useEffect(() => {
    const handler = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  if (!viz) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[200] flex items-center justify-center p-4 md:p-8"
        style={{ background: "rgba(0,0,0,0.92)", backdropFilter: "blur(12px)" }}
        onClick={onClose}
      >
        {/* Modal container — stops propagation so clicks inside don't close */}
        <motion.div
          initial={{ scale: 0.94, opacity: 0, y: 16 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.94, opacity: 0, y: 16 }}
          transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
          className="relative w-full max-w-4xl"
          onClick={e => e.stopPropagation()}
        >
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute -top-10 right-0 z-10 flex items-center gap-1.5 text-xs font-bold text-white/50 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" /> Close (Esc)
          </button>

          {/* Title */}
          <div className="mb-3">
            <p className="text-white font-heading font-bold text-base md:text-lg leading-tight truncate">{viz.title}</p>
            {viz.artist && <p className="text-white/40 text-xs mt-0.5">{viz.artist}</p>}
          </div>

          {/* Video embed — 16:9 */}
          <div className="relative w-full rounded-2xl overflow-hidden" style={{ paddingBottom: "56.25%", background: "#000" }}>
            <div className="absolute inset-0">
              {embedUrl && !embedError ? (
                <iframe
                  src={`${embedUrl}?autoplay=1&rel=0`}
                  title={viz.title}
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                  referrerPolicy="strict-origin-when-cross-origin"
                  className="w-full h-full"
                  onError={() => setEmbedError(true)}
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center gap-4 px-6 text-center"
                  style={{ background: "rgba(0,0,0,0.85)" }}>
                  <AlertCircle className="w-8 h-8 text-white/30" />
                  <p className="text-sm text-white/50">This visualizer can be watched on YouTube.</p>
                  {watchUrl && (
                    <a href={watchUrl} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold"
                      style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)", color: "rgba(255,255,255,0.8)" }}>
                      <ExternalLink className="w-3.5 h-3.5" /> Watch on YouTube
                    </a>
                  )}
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}