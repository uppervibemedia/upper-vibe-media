import React, { useEffect, useRef } from "react";
import { X, ExternalLink, ChevronRight, Heart } from "lucide-react";
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

  const related = allVisualizers
    .filter((v) => v.id !== viz?.id && (v.category === viz?.category || v.artist === viz?.artist))
    .slice(0, 4);

  // Pause audio on open; save scroll and lock body scroll without position:fixed (avoids iOS viewport shift)
  useEffect(() => {
    savedScrollY.current = window.scrollY;
    if (pauseAudio) pauseAudio();
    // Simple overflow hidden — no position:fixed which breaks modal positioning on iOS
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
      // Restore scroll position
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
    // Full-screen fixed overlay — no overflow-y-auto on the backdrop itself
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: "rgba(4,4,14,0.97)",
        display: "flex",
        flexDirection: "column",
        overflowY: "auto",
        WebkitOverflowScrolling: "touch",
      }}
      onClick={onClose}
    >
      {/* Inner content — stops click propagation */}
      <div
        style={{ width: "100%", maxWidth: 896, margin: "0 auto", display: "flex", flexDirection: "column" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Top bar: brand + close — always visible at top ── */}
        <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "12px 16px",
          flexShrink: 0,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <img
              src="https://media.base44.com/images/public/69cd68afb7fe90ae92757154/10c561c0c_ChatGPTImageApr1202611_53_51AM.png"
              alt="Upper Vibe Media"
              style={{ width: 24, height: 24, borderRadius: 6, objectFit: "contain", flexShrink: 0 }}
            />
            <span style={{ fontSize: 9, fontWeight: 900, letterSpacing: "0.25em", textTransform: "uppercase", color: `rgb(${rtp})` }}>
              Upper Vibe Media
            </span>
          </div>
          <button
            onClick={onClose}
            style={{
              width: 36, height: 36, borderRadius: "50%",
              display: "flex", alignItems: "center", justifyContent: "center",
              border: "1px solid rgba(255,255,255,0.18)",
              background: "rgba(255,255,255,0.05)",
              color: "rgba(255,255,255,0.8)",
              cursor: "pointer", flexShrink: 0,
            }}
          >
            <X style={{ width: 16, height: 16 }} />
          </button>
        </div>

        {/* ── VIDEO — 16:9, always visible, no absolute trickery on mobile ── */}
        <div style={{
          width: "100%",
          aspectRatio: "16 / 9",
          background: "#000",
          flexShrink: 0,
          position: "relative",
        }}>
          {embedUrl ? (
            <iframe
              src={embedUrl}
              title={viz.title}
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
              allowFullScreen
              referrerPolicy="strict-origin-when-cross-origin"
              style={{ width: "100%", height: "100%", display: "block", border: "none" }}
            />
          ) : (
            <div style={{
              width: "100%", height: "100%",
              display: "flex", flexDirection: "column",
              alignItems: "center", justifyContent: "center",
              gap: 16, padding: "0 24px", textAlign: "center",
              background: "#000",
            }}>
              <p style={{ fontSize: 14, color: "rgba(255,255,255,0.5)" }}>
                This visualizer can be watched on YouTube.
              </p>
              {watchUrl && (
                <a
                  href={watchUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: "inline-flex", alignItems: "center", gap: 8,
                    padding: "10px 20px", borderRadius: 12, fontSize: 14, fontWeight: 700,
                    background: `rgba(${rtp},0.12)`, border: `1px solid rgba(${rtp},0.3)`,
                    color: `rgb(${rtp})`, textDecoration: "none",
                  }}
                >
                  <ExternalLink style={{ width: 16, height: 16 }} /> Watch on YouTube
                </a>
              )}
            </div>
          )}
        </div>

        {/* ── Info + actions ── */}
        <div style={{ padding: "16px 16px 0", display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h2 style={{ fontFamily: "var(--font-heading)", fontWeight: 900, fontSize: 18, color: "#fff", lineHeight: 1.2, margin: 0 }}>
              {viz.title}
            </h2>
            <p style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", marginTop: 4 }}>
              {viz.artist || "Upper Vibe Media"}
            </p>
            {viz.linked_song_title && (
              <p style={{ fontSize: 12, marginTop: 4, color: `rgba(${rtp},0.7)` }}>🎵 {viz.linked_song_title}</p>
            )}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
            {onToggleFav && (
              <button
                onClick={() => onToggleFav(viz)}
                style={{
                  width: 36, height: 36, borderRadius: 10,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  cursor: "pointer",
                  ...(isFaved
                    ? { background: "rgba(155,126,255,0.22)", border: "1px solid rgba(155,126,255,0.55)", color: "#9B7EFF" }
                    : { background: "rgba(155,126,255,0.06)", border: "1px solid rgba(155,126,255,0.3)", color: "rgba(155,126,255,0.55)" }),
                }}
              >
                <Heart style={{ width: 16, height: 16, fill: isFaved ? "currentColor" : "none" }} />
              </button>
            )}
            {watchUrl && (
              <a
                href={watchUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  width: 36, height: 36, borderRadius: 10,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  border: "1px solid rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.4)",
                  textDecoration: "none",
                }}
                title="Open on YouTube"
              >
                <ExternalLink style={{ width: 16, height: 16 }} />
              </a>
            )}
          </div>
        </div>

        {/* ── Related visualizers ── */}
        {related.length > 0 && (
          <div style={{ padding: "20px 16px 0" }}>
            <p style={{ fontSize: 9, fontWeight: 900, letterSpacing: "0.28em", textTransform: "uppercase", color: "rgba(255,255,255,0.25)", marginBottom: 12 }}>
              Related Visualizers
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12 }}>
              {related.map((v) => (
                <button
                  key={v.id}
                  onClick={() => onSwitchViz && onSwitchViz(v)}
                  style={{
                    borderRadius: 12, overflow: "hidden", textAlign: "left", cursor: "pointer",
                    background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)",
                    padding: 0,
                  }}
                >
                  <div style={{ width: "100%", aspectRatio: "16 / 9", background: "#000", position: "relative" }}>
                    {v.thumbnail_url ? (
                      <img src={v.thumbnail_url} alt={v.title}
                        style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                        loading="lazy" />
                    ) : (
                      <div style={{ width: "100%", height: "100%", background: `rgba(${rtp},0.06)` }} />
                    )}
                  </div>
                  <div style={{ padding: "8px 10px" }}>
                    <p style={{ fontSize: 12, fontWeight: 700, color: "#fff", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", margin: 0 }}>{v.title}</p>
                    <p style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{v.artist}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Bottom spacing */}
        <div style={{ height: 32 }} />
      </div>
    </div>
  );
}