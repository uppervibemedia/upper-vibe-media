import React, { useState, useEffect } from "react";
import { Youtube, ExternalLink } from "lucide-react";
import { base44 } from "@/api/base44Client";

const DEFAULT_PLAYLIST_URL = "https://www.youtube.com/@UpperVibeMedia";
// A featured visualizer video ID to preview (lazy-loaded thumbnail)
const PREVIEW_VIDEO_ID = "dQw4w9WgXcQ"; // placeholder — admin can update via AppSettings

export default function YouTubeCTA() {
  const [playlistUrl, setPlaylistUrl] = useState(DEFAULT_PLAYLIST_URL);
  const [previewVideoId, setPreviewVideoId] = useState(PREVIEW_VIDEO_ID);
  const [thumbClicked, setThumbClicked] = useState(false);

  useEffect(() => {
    base44.entities.AppSettings.filter({ key: "youtube_playlist_url" }).then((rows) => {
      if (rows?.[0]?.value) setPlaylistUrl(rows[0].value);
    });
    base44.entities.AppSettings.filter({ key: "youtube_preview_video_id" }).then((rows) => {
      if (rows?.[0]?.value) setPreviewVideoId(rows[0].value);
    });
  }, []);

  const thumbUrl = `https://img.youtube.com/vi/${previewVideoId}/hqdefault.jpg`;
  const videoUrl = `https://www.youtube.com/watch?v=${previewVideoId}`;

  return (
    <section
      className="flex flex-col gap-4 p-5 rounded-3xl"
      style={{
        background: "rgba(255,0,0,0.04)",
        border: "1px solid rgba(255,60,60,0.18)",
      }}
    >
      {/* Label */}
      <div className="flex items-center gap-2">
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ background: "rgba(255,0,0,0.12)", border: "1px solid rgba(255,60,60,0.25)" }}
        >
          <Youtube style={{ width: 14, height: 14, color: "#FF4444" }} />
        </div>
        <span
          style={{
            fontSize: "9px",
            fontWeight: 900,
            letterSpacing: "0.32em",
            textTransform: "uppercase",
            color: "rgba(255,80,80,0.75)",
            fontFamily: "var(--font-heading)",
          }}
        >
          YouTube
        </span>
      </div>

      {/* Headline + copy */}
      <div>
        <h2
          style={{
            fontFamily: "var(--font-heading)",
            fontSize: "1.15rem",
            fontWeight: 900,
            color: "#fff",
            marginBottom: "0.4rem",
            lineHeight: 1.2,
          }}
        >
          Watch The Visualizers
        </h2>
        <p style={{ fontSize: "0.8rem", lineHeight: 1.6, color: "rgba(255,255,255,0.45)" }}>
          Tap in to Upper Vibe Media visualizers and high-vibe music videos on YouTube.
        </p>
      </div>

      {/* Thumbnail preview — lazy, no autoplay */}
      <div
        className="relative w-full overflow-hidden rounded-2xl cursor-pointer"
        style={{
          aspectRatio: "16/9",
          background: "#000",
          border: "1px solid rgba(255,60,60,0.18)",
        }}
        onClick={() => {
          if (thumbClicked) return;
          setThumbClicked(true);
        }}
      >
        {!thumbClicked ? (
          <>
            <img
              src={thumbUrl}
              alt="Visualizer preview"
              loading="lazy"
              className="w-full h-full object-cover"
              style={{ opacity: 0.85 }}
            />
            {/* Play button overlay */}
            <div
              className="absolute inset-0 flex items-center justify-center"
              style={{ background: "rgba(0,0,0,0.35)" }}
            >
              <a
                href={videoUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="flex items-center justify-center w-14 h-14 rounded-full transition-transform active:scale-95"
                style={{ background: "rgba(255,0,0,0.85)", boxShadow: "0 4px 24px rgba(255,0,0,0.5)" }}
              >
                {/* Triangle play icon */}
                <svg viewBox="0 0 24 24" fill="white" className="w-6 h-6 ml-1">
                  <path d="M8 5v14l11-7z" />
                </svg>
              </a>
            </div>
            {/* YouTube logo bottom-right */}
            <div className="absolute bottom-2 right-2 opacity-70">
              <Youtube style={{ width: 18, height: 18, color: "#FF4444" }} />
            </div>
          </>
        ) : (
          <iframe
            src={`https://www.youtube.com/embed/${previewVideoId}?autoplay=1&rel=0`}
            title="Upper Vibe Media Visualizer"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="w-full h-full"
            style={{ border: "none" }}
          />
        )}
      </div>

      {/* CTA button */}
      <a
        href={playlistUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="w-full flex items-center justify-center gap-2.5 py-3.5 rounded-2xl text-sm font-black tracking-wide transition-all active:scale-[0.97]"
        style={{
          background: "linear-gradient(135deg,#C00000,#FF3333)",
          color: "#fff",
          fontFamily: "var(--font-heading)",
          letterSpacing: "0.05em",
          boxShadow: "0 4px 20px rgba(200,0,0,0.3)",
        }}
      >
        Watch 432 Hz Visualizer Videos
        <ExternalLink className="w-3 h-3 opacity-60" />
      </a>
    </section>
  );
}