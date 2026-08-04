import React, { useEffect, useMemo, useRef } from "react";
import { X } from "lucide-react";

const getTikTokVideoId = (track) => {
  const raw = track?.provider_video_id || track?.tiktok_provider_video_id || track?.tiktok_video_id || track?.tiktok_post_id || "";
  if (/^\d{8,}$/.test(String(raw))) return String(raw);
  const url = track?.tiktok_post_url || track?.post_url || "";
  return url.match(/video\/(\d+)/)?.[1] || null;
};

const getDirectVideoUrl = (track) => {
  const url = String(track?.tiktok_preview_url || track?.preview_url || "");
  return /\.(mp4|webm|mov)(\?|$)/i.test(url) ? url : null;
};

export default function TikTokInlinePlayer({ track, onClose, onAudioIntent }) {
  const instanceIdRef = useRef(`tiktok-${track?.social_post_id || track?.id || Math.random()}`);
  const directVideoUrl = useMemo(() => getDirectVideoUrl(track), [track]);
  const videoId = useMemo(() => getTikTokVideoId(track), [track]);
  const embedUrl = !directVideoUrl && videoId ? `https://www.tiktok.com/embed/v2/${videoId}` : null;

  useEffect(() => {
    const id = instanceIdRef.current;
    const handleOtherOpen = (event) => {
      if (event.detail?.id && event.detail.id !== id) onClose?.(false);
    };
    window.addEventListener("uppervibe:tiktok-preview-open", handleOtherOpen);
    window.dispatchEvent(new CustomEvent("uppervibe:tiktok-preview-open", { detail: { id } }));
    return () => window.removeEventListener("uppervibe:tiktok-preview-open", handleOtherOpen);
  }, [onClose]);

  return (
    <div className="absolute inset-0 flex items-center justify-center bg-black/92 p-4 sm:p-6 landscape:p-3" onPointerDownCapture={onAudioIntent}>
      <button type="button" onClick={() => onClose?.(true)} className="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-black/70 text-white backdrop-blur-md active:scale-95" aria-label="Close TikTok preview">
        <X className="h-5 w-5" />
      </button>

      <div className="relative h-[90%] w-[90%] max-w-[340px] overflow-hidden rounded-[1.35rem] border border-cyan-300/20 bg-black shadow-[0_0_30px_rgba(34,211,238,0.16)] sm:h-[82%] sm:w-[82%] lg:h-[80%] lg:w-[80%]">
        {directVideoUrl ? (
          <video
            src={directVideoUrl}
            poster={track?.tiktok_thumbnail_url || track?.thumbnail_url || track?.cover_url || ""}
            className="h-full w-full bg-black object-contain"
            controls
            playsInline
            preload="metadata"
            onPlay={onAudioIntent}
            onEnded={() => onClose?.(true)}
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
          <div className="flex h-full items-center justify-center p-5 text-center text-sm font-bold text-white/65">
            Preview unavailable inside Upper Vibe Media.
          </div>
        )}
      </div>
    </div>
  );
}