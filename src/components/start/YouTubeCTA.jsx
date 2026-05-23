import React, { useState, useEffect } from "react";
import { Youtube } from "lucide-react";
import { base44 } from "@/api/base44Client";

const DEFAULT_PLAYLIST_URL = "https://youtube.com/playlist?list=PLH-5EaZv0Utx6dsoODbo4wBFTTc_iGs0S&si=xevHTdJKQhdfwUw7";
const DEFAULT_MAIN_ID = "hzR4m-w2924";

// Hardcoded fallback secondary videos from the UVM visualizer playlist
const DEFAULT_SECONDARY = [
  { id: "Qq9YO4FVYQQ", title: "Quantum Ascend" },
  { id: "1JNmz7mCFmg", title: "Cosmic Control" },
  { id: "QP4FxSwkc1c", title: "432 Hz Session" },
  { id: "6VXNZ1NOFDI", title: "High Vibe Drop" },
];

// YouTube thumbnails via i.ytimg.com (avoids some CORS issues with img.youtube.com)
const THUMB_SIZES = ["maxresdefault", "sddefault", "hqdefault", "mqdefault"];

function YtThumb({ videoId, title, small = false }) {
  const [sizeIdx, setSizeIdx] = React.useState(0);
  const [pressed, setPressed] = React.useState(false);
  const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
  const thumbUrl = `https://i.ytimg.com/vi/${videoId}/${THUMB_SIZES[sizeIdx]}.jpg`;

  const handleError = () => {
    if (sizeIdx < THUMB_SIZES.length - 1) setSizeIdx((i) => i + 1);
  };

  return (
    <a
      href={videoUrl}
      target="_blank"
      rel="noopener noreferrer"
      onMouseEnter={() => setPressed(true)}
      onMouseLeave={() => setPressed(false)}
      onTouchStart={() => setPressed(true)}
      onTouchEnd={() => setPressed(false)}
      className="relative block overflow-hidden rounded-xl flex-shrink-0 transition-all active:scale-[0.97]"
      style={{
        aspectRatio: "16/9",
        background: "#111",
        border: "1px solid rgba(255,60,60,0.15)",
        width: small ? "calc(50vw - 28px)" : "100%",
        maxWidth: small ? 160 : "100%",
        scrollSnapAlign: "start",
      }}
    >
      <img
        key={thumbUrl}
        src={thumbUrl}
        alt={title}
        loading="lazy"
        onError={handleError}
        className="w-full h-full object-cover"
        style={{ display: "block" }}
      />
      {/* Gradient overlay */}
      <div
        className="absolute inset-0"
        style={{ background: "linear-gradient(to top, rgba(0,0,0,0.6) 0%, transparent 50%)" }}
      />
      {/* Play button — only visible on hover/press */}
      {pressed && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div
            style={{
              width: small ? 28 : 44,
              height: small ? 28 : 44,
              borderRadius: "50%",
              background: "rgba(0,0,0,0.65)",
              border: "1.5px solid rgba(255,255,255,0.7)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              backdropFilter: "blur(4px)",
            }}
          >
            <svg viewBox="0 0 24 24" fill="white" style={{ width: small ? 9 : 14, height: small ? 9 : 14, marginLeft: 2 }}>
              <path d="M8 5v14l11-7z" />
            </svg>
          </div>
        </div>
      )}
      {/* Title */}
      {title && (
        <p
          className="absolute bottom-1.5 left-2 right-2 text-white truncate"
          style={{ fontSize: small ? "9px" : "11px", fontWeight: 700, lineHeight: 1.2, textShadow: "0 1px 4px rgba(0,0,0,0.8)" }}
        >
          {title}
        </p>
      )}
    </a>
  );
}

export default function YouTubeCTA() {
  const [playlistUrl, setPlaylistUrl] = useState(DEFAULT_PLAYLIST_URL);
  const [mainVideoId, setMainVideoId] = useState(DEFAULT_MAIN_ID);
  const [secondaryVideos, setSecondaryVideos] = useState(DEFAULT_SECONDARY);

  useEffect(() => {
    base44.entities.AppSettings.filter({ key: "youtube_playlist_url" }).then((rows) => {
      if (rows?.[0]?.value) setPlaylistUrl(rows[0].value);
    });
    base44.entities.AppSettings.filter({ key: "youtube_preview_video_id" }).then((rows) => {
      if (rows?.[0]?.value) setMainVideoId(rows[0].value);
    });
    // Admin can override secondary videos as a JSON array in AppSettings
    base44.entities.AppSettings.filter({ key: "youtube_secondary_videos" }).then((rows) => {
      if (rows?.[0]?.value) {
        try { setSecondaryVideos(JSON.parse(rows[0].value)); } catch {}
      }
    });
  }, []);

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
        <span style={{
          fontSize: "9px", fontWeight: 900, letterSpacing: "0.32em",
          textTransform: "uppercase", color: "rgba(255,80,80,0.75)",
          fontFamily: "var(--font-heading)",
        }}>
          Watch On YouTube
        </span>
      </div>

      {/* Headline */}
      <div className="text-center">
        <h2 style={{
          fontFamily: "var(--font-heading)", fontSize: "1.15rem", fontWeight: 900,
          color: "#fff", marginBottom: "0.4rem", lineHeight: 1.2,
        }}>
          See The Frequency In Motion
        </h2>
        <p style={{ fontSize: "0.8rem", lineHeight: 1.6, color: "rgba(255,255,255,0.45)" }}>
          Visualizers, music videos, and 432 Hz frequency drops.
        </p>
      </div>

      {/* Main featured video */}
      <YtThumb videoId={mainVideoId} title="Featured Visualizer" />

      {/* Secondary videos — horizontal swipe row */}
      <div
        className="flex gap-3 overflow-x-auto pb-1"
        style={{ scrollSnapType: "x mandatory" }}
      >
        {secondaryVideos.slice(0, 4).map((v) => (
          <YtThumb key={v.id} videoId={v.id} title={v.title} small />
        ))}
      </div>

      {/* CTA */}
      <a
        href={playlistUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl text-sm font-black tracking-wide transition-all active:scale-[0.97]"
        style={{
          background: "linear-gradient(135deg,#C00000,#FF3333)",
          color: "#fff",
          fontFamily: "var(--font-heading)",
          letterSpacing: "0.05em",
          boxShadow: "0 4px 20px rgba(200,0,0,0.3)",
        }}
      >
        <Youtube style={{ width: 15, height: 15 }} />
        Watch Full Visualizer Playlist
      </a>
    </section>
  );
}