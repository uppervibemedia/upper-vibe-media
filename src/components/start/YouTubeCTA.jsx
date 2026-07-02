import React, { useState, useEffect } from "react";
import { Youtube } from "lucide-react";
import { base44 } from "@/api/base44Client";

const DEFAULT_PLAYLIST_URL = "https://youtube.com/playlist?list=PLH-5EaZv0Utx6dsoODbo4wBFTTc_iGs0S&si=xevHTdJKQhdfwUw7";
const FOURTH_DIM_VID = "hzR4m-w2924";
const QUANTUM_ASCEND_VID = "895KXA7fv0E";
const ANXIETY_MUTE_VID = "DsSmpEKjbGE"; // excluded from lineup

function extractVideoId(url) {
  if (!url) return null;
  const m = url.match(/(?:v=|\/embed\/|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  return m ? m[1] : null;
}

const THUMB_SIZES = ["maxresdefault", "sddefault", "hqdefault", "mqdefault"];

function YtThumb({ videoId, title, small = false, overrideThumbnail = null }) {
  const [sizeIdx, setSizeIdx] = React.useState(0);
  const [pressed, setPressed] = React.useState(false);
  const [useFallback, setUseFallback] = React.useState(false);
  const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
  const fallbackThumb = `https://i.ytimg.com/vi/${videoId}/${THUMB_SIZES[sizeIdx]}.jpg`;
  const thumbUrl = (overrideThumbnail && !useFallback) ? overrideThumbnail : fallbackThumb;

  const handleError = () => {
    if (overrideThumbnail && !useFallback) {
      setUseFallback(true);
    } else if (sizeIdx < THUMB_SIZES.length - 1) {
      setSizeIdx((i) => i + 1);
    }
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
        width: small ? "min(46vw, 168px)" : "100%",
        minWidth: small ? 138 : "100%",
        maxWidth: small ? 168 : "100%",
        scrollSnapAlign: "start",
        WebkitTapHighlightColor: "transparent",
        touchAction: "manipulation",
      }}
    >
      <img
        key={thumbUrl}
        src={thumbUrl}
        alt={title}
        loading="lazy"
        onError={handleError}
        className="w-full h-full object-cover object-center"
        draggable="false"
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
          <div style={{
            width: small ? 28 : 44, height: small ? 28 : 44,
            borderRadius: "50%",
            background: "rgba(0,0,0,0.65)",
            border: "1.5px solid rgba(255,255,255,0.7)",
            display: "flex", alignItems: "center", justifyContent: "center",
            backdropFilter: "blur(4px)",
          }}>
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

const RED = "220,40,40";

export default function YouTubeCTA() {
  const [playlistUrl, setPlaylistUrl] = useState(DEFAULT_PLAYLIST_URL);
  const [mainVideo, setMainVideo] = useState(null);
  const [secondaryVideos, setSecondaryVideos] = useState([]);

  useEffect(() => {
    const timer = setTimeout(() => {
    base44.entities.AppSettings.filter({ key: "youtube_playlist_url" }).then((rows) => {
      if (rows?.[0]?.value) setPlaylistUrl(rows[0].value);
    });

    base44.entities.Visualizer.filter({ status: "published" }, "-release_date", 8).then((rows) => {
      const valid = rows
        .map((v) => {
          const id = extractVideoId(v.video_url) || extractVideoId(v.embed_url);
          if (!id) return null;
          return { id, title: v.title || v.linked_song_title || "Watch Now", thumbnail_url: v.thumbnail_url };
        })
        .filter(Boolean);

      // Exclude Anxiety on Mute, pin Fourth Dimension Hustler first, then Quantum Ascend second
      const filtered = valid.filter((v) => v.id !== ANXIETY_MUTE_VID);
      const pinned = filtered.find((v) => v.id === FOURTH_DIM_VID);
      const quantum = filtered.find((v) => v.id === QUANTUM_ASCEND_VID);
      const rest = filtered.filter((v) => v.id !== FOURTH_DIM_VID && v.id !== QUANTUM_ASCEND_VID);
      const ordered = [
        ...(pinned ? [pinned] : []),
        ...(quantum ? [quantum] : []),
        ...rest,
      ];

      if (ordered.length > 0) setMainVideo(ordered[0]);
      if (ordered.length > 1) setSecondaryVideos(ordered.slice(1, 5));
    });
    }, 600);
    return () => clearTimeout(timer);
  }, []);

  const r = RED;

  return (
    <>
      <section
        className="flex flex-col gap-4 p-5 rounded-3xl relative"
        style={{
          background: `rgba(${r},0.06)`,
          border: `1px solid rgba(${r},0.4)`,
          boxShadow: `0 0 24px rgba(${r},0.12)`,
        }}
      >

        {/* Label */}
        <div className="flex items-center justify-center gap-2">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: `rgba(${r},0.15)`, border: `1px solid rgba(${r},0.35)` }}
          >
            <Youtube style={{ width: 14, height: 14, color: `rgb(${r})` }} />
          </div>
          <span style={{
            fontSize: "9px", fontWeight: 900, letterSpacing: "0.32em",
            textTransform: "uppercase", color: `rgba(${r},0.9)`,
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
        {mainVideo && <YtThumb videoId={mainVideo.id} title={mainVideo.title} overrideThumbnail={mainVideo.thumbnail_url} />}

        {/* Secondary videos — horizontal swipe row */}
        {secondaryVideos.length > 0 && (
          <div
            className="flex gap-3 overflow-x-auto pb-2 hide-scrollbar"
            style={{
              scrollSnapType: "x mandatory",
              scrollPaddingInline: 4,
              WebkitOverflowScrolling: "touch",
              msOverflowStyle: "none",
              scrollbarWidth: "none",
              paddingLeft: "2px",
              paddingRight: "22px",
              touchAction: "pan-x",
              overscrollBehaviorX: "contain",
            }}
          >
            {secondaryVideos.map((v) => (
              <YtThumb key={v.id} videoId={v.id} title={v.title} overrideThumbnail={v.thumbnail_url} small />
            ))}
          </div>
        )}

        {/* CTA */}
        <a
          href={playlistUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl text-sm font-black tracking-wide transition-all active:scale-[0.97]"
          style={{
            background: `linear-gradient(135deg,rgb(${r}),rgba(${r},0.75))`,
            color: "#fff",
            fontFamily: "var(--font-heading)",
            letterSpacing: "0.05em",
            boxShadow: `0 4px 24px rgba(${r},0.5)`,
          }}
        >
          <Youtube style={{ width: 15, height: 15 }} />
          Watch Full Visualizer Playlist
        </a>
      </section>
    </>
  );
}