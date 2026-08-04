import React, { useEffect, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export function getTikTokVideoId(track) {
  const direct = String(track?.provider_video_id || "").match(/\d{8,}/)?.[0];
  if (direct) return direct;
  const url = String(track?.tiktok_post_url || track?.post_url || "");
  return url.match(/\/video\/(\d+)/)?.[1] || null;
}

const getDirectVideoUrl = (track) => {
  const url = String(track?.tiktok_preview_url || track?.preview_url || "");
  return /\.(mp4|webm|mov)(\?|$)/i.test(url) ? url : null;
};

export default function TikTokLightbox({ open, onClose, track, onAudioIntent }) {
  const scrollYRef = useRef(0);
  const videoId = useMemo(() => getTikTokVideoId(track), [track]);
  const directVideoUrl = useMemo(() => getDirectVideoUrl(track), [track]);
  const embedUrl = !directVideoUrl && videoId ? `https://www.tiktok.com/embed/v2/${videoId}` : null;

  useEffect(() => {
    if (!open) return;
    scrollYRef.current = window.scrollY;
    const previous = {
      position: document.body.style.position,
      top: document.body.style.top,
      width: document.body.style.width,
      overflow: document.body.style.overflow,
    };
    document.body.style.position = "fixed";
    document.body.style.top = `-${scrollYRef.current}px`;
    document.body.style.width = "100%";
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.position = previous.position;
      document.body.style.top = previous.top;
      document.body.style.width = previous.width;
      document.body.style.overflow = previous.overflow;
      window.scrollTo(0, scrollYRef.current);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/78 px-4 py-[calc(env(safe-area-inset-top,0px)+20px)] backdrop-blur-xl sm:px-6"
          onClick={onClose}
        >
          <button
            type="button"
            onClick={onClose}
            className="absolute right-4 top-[calc(env(safe-area-inset-top,0px)+14px)] z-20 flex h-11 w-11 items-center justify-center rounded-full border border-white/15 bg-black/60 text-white shadow-xl backdrop-blur-md transition hover:bg-white/10 active:scale-95"
            aria-label="Close TikTok preview"
          >
            <X className="h-5 w-5" />
          </button>

          <motion.div
            initial={{ scale: 0.96, y: 16 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.96, y: 16 }}
            transition={{ type: "spring", stiffness: 260, damping: 24 }}
            className="relative h-[min(78dvh,675px)] w-[min(90vw,380px)] overflow-hidden rounded-[1.75rem] border border-cyan-300/20 bg-black shadow-2xl shadow-cyan-500/10 sm:h-[min(76dvh,690px)] sm:w-[min(78vw,390px)] landscape:h-[min(72dvh,560px)] landscape:w-[min(48vw,340px)]"
            onClick={(event) => event.stopPropagation()}
            onPointerDownCapture={onAudioIntent}
          >
            {directVideoUrl ? (
              <video
                src={directVideoUrl}
                poster={track?.tiktok_thumbnail_url || track?.thumbnail_url || track?.cover_url || ""}
                className="h-full w-full bg-black object-contain"
                controls
                playsInline
                preload="metadata"
                onPlay={onAudioIntent}
                onEnded={onClose}
              />
            ) : embedUrl ? (
              <iframe
                title={track?.title ? `${track.title} TikTok preview` : "TikTok preview"}
                src={embedUrl}
                className="h-full w-full bg-black"
                allow="encrypted-media; fullscreen; picture-in-picture"
                allowFullScreen
                loading="lazy"
                sandbox="allow-scripts allow-same-origin allow-presentation"
              />
            ) : (
              <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center text-white">
                <p className="font-heading text-2xl font-black">Preview unavailable</p>
                <p className="text-sm text-white/60">This post does not provide an embeddable player yet.</p>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}