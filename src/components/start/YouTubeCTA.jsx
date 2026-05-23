import React, { useState, useEffect, useRef } from "react";
import { Youtube, ChevronLeft, ChevronRight } from "lucide-react";
import { base44 } from "@/api/base44Client";

const DEFAULT_PLAYLIST_URL = "https://youtube.com/playlist?list=PLH-5EaZv0Utx6dsoODbo4wBFTTc_iGs0S&si=xevHTdJKQhdfwUw7";
const FOURTH_DIM_VID = "hzR4m-w2924";

function extractVideoId(url) {
  if (!url) return null;
  const m = url.match(/(?:v=|\/embed\/|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  return m ? m[1] : null;
}

const THUMB_SIZES = ["maxresdefault", "sddefault", "hqdefault", "mqdefault"];

function YtThumb({ videoId, title, overrideThumbnail = null }) {
  const [sizeIdx, setSizeIdx] = useState(0);
  const [useFallback, setUseFallback] = useState(false);

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
      className="relative flex-shrink-0 block overflow-hidden rounded-xl transition-all active:scale-[0.97] group"
      style={{
        aspectRatio: "16/9",
        width: "calc(75vw - 32px)",
        maxWidth: 260,
        minWidth: 200,
        scrollSnapAlign: "start",
        background: "#111",
        border: "1px solid rgba(255,60,60,0.15)",
      }}
    >
      <img
        key={thumbUrl}
        src={thumbUrl}
        alt={title}
        loading="lazy"
        onError={handleError}
        className="w-full h-full object-cover"
      />
      {/* Gradient overlay */}
      <div
        className="absolute inset-0"
        style={{ background: "linear-gradient(to top, rgba(0,0,0,0.65) 0%, transparent 55%)" }}
      />
      {/* Play button — shows on hover/touch */}
      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
        <div style={{
          width: 42, height: 42, borderRadius: "50%",
          background: "rgba(0,0,0,0.65)",
          border: "1.5px solid rgba(255,255,255,0.7)",
          display: "flex", alignItems: "center", justifyContent: "center",
          backdropFilter: "blur(4px)",
        }}>
          <svg viewBox="0 0 24 24" fill="white" style={{ width: 14, height: 14, marginLeft: 2 }}>
            <path d="M8 5v14l11-7z" />
          </svg>
        </div>
      </div>
      {/* Title */}
      {title && (
        <p className="absolute bottom-2 left-2.5 right-2.5 text-white truncate"
          style={{ fontSize: "11px", fontWeight: 700, lineHeight: 1.2, textShadow: "0 1px 4px rgba(0,0,0,0.9)" }}>
          {title}
        </p>
      )}
    </a>
  );
}

export default function YouTubeCTA() {
  const [playlistUrl, setPlaylistUrl] = useState(DEFAULT_PLAYLIST_URL);
  const [videos, setVideos] = useState([]);
  const scrollRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  useEffect(() => {
    base44.entities.AppSettings.filter({ key: "youtube_playlist_url" }).then((rows) => {
      if (rows?.[0]?.value) setPlaylistUrl(rows[0].value);
    });

    base44.entities.Visualizer.filter({ status: "published" }, "-release_date", 20).then((rows) => {
      const valid = rows
        .map((v) => {
          const id = extractVideoId(v.video_url) || extractVideoId(v.embed_url);
          if (!id) return null;
          return { id, title: v.title || v.linked_song_title || "Watch Now", thumbnail_url: v.thumbnail_url };
        })
        .filter(Boolean);

      // Pin Fourth Dimension Hustler first
      const pinned = valid.find((v) => v.id === FOURTH_DIM_VID);
      const rest = valid.filter((v) => v.id !== FOURTH_DIM_VID);
      setVideos(pinned ? [pinned, ...rest] : valid);
    });
  }, []);

  // Track scroll state for arrows
  const checkScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 8);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 8);
  };

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    checkScroll();
    el.addEventListener("scroll", checkScroll, { passive: true });
    window.addEventListener("resize", checkScroll);
    return () => {
      el.removeEventListener("scroll", checkScroll);
      window.removeEventListener("resize", checkScroll);
    };
  }, [videos]);

  const scrollBy = (dir) => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * 260, behavior: "smooth" });
  };

  return (
    <section
      className="flex flex-col gap-4 p-5 rounded-3xl"
      style={{
        background: "rgba(255,0,0,0.05)",
        border: "1px solid rgba(255,60,60,0.3)",
        boxShadow: "0 0 40px rgba(200,0,0,0.2), 0 0 80px rgba(200,0,0,0.08)",
      }}
    >
      {/* Label */}
      <div className="flex items-center justify-center gap-2">
        <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ background: "rgba(255,0,0,0.12)", border: "1px solid rgba(255,60,60,0.25)" }}>
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

      {/* Video carousel */}
      {videos.length > 0 && (
        <div className="relative">
          {/* Left arrow — desktop */}
          {canScrollLeft && (
            <button
              onClick={() => scrollBy(-1)}
              className="hidden md:flex absolute left-0 top-1/2 -translate-y-1/2 -translate-x-3 z-10 w-8 h-8 rounded-full items-center justify-center transition-all hover:scale-110"
              style={{ background: "rgba(0,0,0,0.7)", border: "1px solid rgba(255,255,255,0.15)" }}
            >
              <ChevronLeft style={{ width: 16, height: 16, color: "#fff" }} />
            </button>
          )}

          {/* Scrollable row */}
          <div
            ref={scrollRef}
            className="flex gap-3 overflow-x-auto pb-2"
            style={{
              scrollSnapType: "x mandatory",
              WebkitOverflowScrolling: "touch",
              msOverflowStyle: "none",
              scrollbarWidth: "none",
              paddingRight: "20px",
            }}
          >
            {videos.map((v) => (
              <YtThumb key={v.id} videoId={v.id} title={v.title} overrideThumbnail={v.thumbnail_url} />
            ))}
          </div>

          {/* Right arrow — desktop */}
          {canScrollRight && (
            <button
              onClick={() => scrollBy(1)}
              className="hidden md:flex absolute right-0 top-1/2 -translate-y-1/2 translate-x-3 z-10 w-8 h-8 rounded-full items-center justify-center transition-all hover:scale-110"
              style={{ background: "rgba(0,0,0,0.7)", border: "1px solid rgba(255,255,255,0.15)" }}
            >
              <ChevronRight style={{ width: 16, height: 16, color: "#fff" }} />
            </button>
          )}

          {/* Swipe hint — mobile */}
          {videos.length > 1 && (
            <p className="text-center text-[9px] mt-1 md:hidden"
              style={{ color: "rgba(255,255,255,0.2)", letterSpacing: "0.1em" }}>
              ← swipe to see more →
            </p>
          )}
        </div>
      )}

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