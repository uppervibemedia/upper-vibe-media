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

export default function VisualizerModal({ viz, onClose, pauseAudio }) {
  const [embedError, setEmbedError] = useState(false);

  const embedUrl = toEmbedUrl(viz?.embed_url || viz?.video_url);
  const watchUrl = toWatchUrl(viz?.video_url || viz?.embed_url);

  useEffect(() => {
    if (pauseAudio) pauseAudio();
    // Scroll to top so the modal is fully visible on mobile
    window.scrollTo({ top: 0, behavior: "instant" });
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

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
        // Use align-items: flex-start with padding-top on mobile so the video
        // is at the very top of the viewport; center on desktop.
        className="fixed inset-0 z-[200] flex flex-col items-center justify-start md:justify-center overflow-y-auto"
        style={{
          background: "rgba(0,0,0,0.94)",
          backdropFilter: "blur(14px)",
          paddingTop: "env(safe-area-inset-top, 0px)",
        }}
        onClick={onClose}
      >
        {/* Modal container */}
        <motion.div
          initial={{ scale: 0.96, opacity: 0, y: 10 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.96, opacity: 0, y: 10 }}
          transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
          className="relative w-full max-w-4xl px-4 pt-4 pb-6 md:px-6 md:pt-6"
          onClick={e => e.stopPropagation()}
        >
          {/* Close button — top-right, always visible */}
          <div className="flex items-center justify-between mb-3">
            <div className="min-w-0 flex-1 pr-4">
              <p className="text-white font-heading font-bold text-sm md:text-base leading-tight truncate">
                {viz.title}
              </p>
              {viz.artist && (
                <p className="text-white/40 text-xs mt-0.5 truncate">{viz.artist}</p>
              )}
            </div>
            <button
              onClick={onClose}
              className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-all hover:bg-white/10 active:scale-95"
              style={{ border: "1px solid rgba(255,255,255,0.15)", color: "rgba(255,255,255,0.7)" }}
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Video embed — 16:9, fills width */}
          <div
            className="relative w-full rounded-2xl overflow-hidden"
            style={{ paddingBottom: "56.25%", background: "#000" }}
          >
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
                <div
                  className="w-full h-full flex flex-col items-center justify-center gap-4 px-6 text-center"
                  style={{ background: "rgba(0,0,0,0.85)" }}
                >
                  <AlertCircle className="w-8 h-8 text-white/30" />
                  <p className="text-sm text-white/50">This visualizer can be watched on YouTube.</p>
                  {watchUrl && (
                    <a
                      href={watchUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold"
                      style={{
                        background: "rgba(255,255,255,0.08)",
                        border: "1px solid rgba(255,255,255,0.15)",
                        color: "rgba(255,255,255,0.8)",
                      }}
                    >
                      <ExternalLink className="w-3.5 h-3.5" /> Watch on YouTube
                    </a>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Tap outside hint */}
          <p className="text-center text-[11px] text-white/20 mt-3">
            Tap outside or press Esc to close
          </p>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}