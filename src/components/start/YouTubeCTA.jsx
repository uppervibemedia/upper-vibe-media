import React, { useState, useEffect } from "react";
import { Youtube, ExternalLink } from "lucide-react";
import { base44 } from "@/api/base44Client";

const DEFAULT_PLAYLIST_URL = "https://youtube.com/playlist?list=PLH-5EaZv0Utx6dsoODbo4wBFTTc_iGs0S&si=xevHTdJKQhdfwUw7";
// First (newest) video from the UVM visualizer playlist — admin can update via AppSettings
const DEFAULT_PREVIEW_VIDEO_ID = "hzR4m-w2924";

export default function YouTubeCTA() {
  const [playlistUrl, setPlaylistUrl] = useState(DEFAULT_PLAYLIST_URL);
  const [previewVideoId, setPreviewVideoId] = useState(DEFAULT_PREVIEW_VIDEO_ID);

  useEffect(() => {
    base44.entities.AppSettings.filter({ key: "youtube_playlist_url" }).then((rows) => {
      if (rows?.[0]?.value) setPlaylistUrl(rows[0].value);
    });
    base44.entities.AppSettings.filter({ key: "youtube_preview_video_id" }).then((rows) => {
      if (rows?.[0]?.value) setPreviewVideoId(rows[0].value);
    });
  }, []);

  const thumbUrl = `https://img.youtube.com/vi/${previewVideoId}/hqdefault.jpg`;
  const videoPageUrl = `https://www.youtube.com/watch?v=${previewVideoId}&list=PLH-5EaZv0Utx6dsoODbo4wBFTTc_iGs0S`;

  return (
    <section
      className="flex flex-col gap-4 p-5 rounded-3xl"
      style={{
        background: "rgba(255,0,0,0.04)",
        border: "1px solid rgba(255,60,60,0.18)",
      }}
    >
      {/* Label */}
      <div className="flex items-center justify-center gap-2">
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
          Watch On YouTube
        </span>
      </div>

      {/* Headline + copy */}
      <div className="text-center">
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
          See The Frequency In Motion
        </h2>
        <p style={{ fontSize: "0.8rem", lineHeight: 1.6, color: "rgba(255,255,255,0.45)" }}>
          Tap into Upper Vibe Media visualizers, music videos, and 432 Hz frequency drops on YouTube.
        </p>
      </div>

      {/* Thumbnail — lazy, click opens YouTube */}
      <a
        href={videoPageUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="relative block w-full overflow-hidden rounded-2xl"
        style={{
          aspectRatio: "16/9",
          background: "#000",
          border: "1px solid rgba(255,60,60,0.18)",
        }}
      >
        <img
          src={thumbUrl}
          alt="Featured Visualizer — Upper Vibe Media"
          loading="lazy"
          className="w-full h-full object-cover"
        />
        {/* Subtle bottom gradient so YouTube bar is readable */}
        <div
          className="absolute inset-0"
          style={{ background: "linear-gradient(to top, rgba(0,0,0,0.55) 0%, transparent 50%)" }}
        />
        {/* Centered YouTube-style play button */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div
            style={{
              width: 48,
              height: 34,
              borderRadius: 8,
              background: "rgba(220,0,0,0.92)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 2px 12px rgba(0,0,0,0.5)",
            }}
          >
            <svg viewBox="0 0 24 24" fill="white" style={{ width: 18, height: 18, marginLeft: 2 }}>
              <path d="M8 5v14l11-7z" />
            </svg>
          </div>
        </div>
        {/* YouTube logo bottom-right — matches real YouTube UI */}
        <div className="absolute bottom-2 right-2.5 flex items-center gap-1">
          <Youtube style={{ width: 16, height: 16, color: "#fff" }} />
          <span style={{ fontSize: "10px", fontWeight: 700, color: "#fff", letterSpacing: "0.02em" }}>YouTube</span>
        </div>
      </a>

      {/* CTA button */}
      <a
        href={playlistUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="w-full flex items-center justify-center gap-2.5 py-3.5 rounded-2xl text-sm font-black tracking-wide transition-all active:scale-[0.97] text-center justify-center"
        style={{
          background: "linear-gradient(135deg,#C00000,#FF3333)",
          color: "#fff",
          fontFamily: "var(--font-heading)",
          letterSpacing: "0.05em",
          boxShadow: "0 4px 20px rgba(200,0,0,0.3)",
        }}
      >
        Watch Full Visualizer Playlist
        <ExternalLink className="w-3 h-3 opacity-60" />
      </a>
    </section>
  );
}