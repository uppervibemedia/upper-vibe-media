import React, { useEffect, useRef } from "react";
import { X, Heart } from "lucide-react";
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


export default function VisualizerModal({ viz, onClose, pauseAudio, allVisualizers = [], onSwitchViz, isFaved, onToggleFav }) {
  const savedScrollY = useRef(0);
  const overlayRef = useRef(null);
  const { accentId } = useTheme();
  const rtp = (RADIO_THEMES[accentId] || RADIO_THEMES.cyan).vars["--rt-primary"];

  const videoId = extractVideoId(viz?.embed_url || viz?.video_url);
  const embedUrl = toEmbedUrl(videoId);

  const related = allVisualizers
    .filter((v) => v.id !== viz?.id && (v.category === viz?.category || v.artist === viz?.artist))
    .slice(0, 4);

  useEffect(() => {
    savedScrollY.current = window.scrollY;
    if (pauseAudio) pauseAudio();
    // Scroll the overlay to top so video is immediately visible
    if (overlayRef.current) {
      overlayRef.current.scrollTop = 0;
    }
    return () => {
      window.scrollTo({ top: savedScrollY.current, behavior: "instant" });
    };
  }, [viz?.id]);

  useEffect(() => {
    const handler = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  if (!viz) return null;

  // Video container uses the padding-bottom trick correctly:
  // parent is position:relative with paddingBottom:56.25%, child is absolute inset-0
  // BUT the parent must have width defined (100%) and NOT be inside a flex/grid
  // that collapses its height.
  const videoContainerStyle = {
    position: "relative",
    width: "100%",
    paddingBottom: "56.25%", // 16:9
    background: "#000",
    flexShrink: 0,
  };

  const videoAbsoluteStyle = {
    position: "absolute",
    top: 0, left: 0, right: 0, bottom: 0,
    width: "100%",
    height: "100%",
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        top: 0, left: 0, right: 0, bottom: 0,
        zIndex: 9999,
        background: "rgba(4,4,14,0.96)",
        overflowY: "scroll",
        WebkitOverflowScrolling: "touch",
        isolation: "isolate",
      }}
      ref={overlayRef}
    >
      {/* Content wrapper — max 896px centered, column layout */}
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: 896,
          margin: "0 auto",
          // No flex here — block layout ensures padding-bottom on video container works correctly
          display: "block",
        }}
      >
        {/* ── Top bar ── */}
        <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "12px 16px 10px",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <img
              src="https://media.base44.com/images/public/69cd68afb7fe90ae92757154/10c561c0c_ChatGPTImageApr1202611_53_51AM.png"
              alt="Upper Vibe Media"
              style={{ width: 24, height: 24, borderRadius: 6, objectFit: "contain" }}
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
              border: "1px solid rgba(255,255,255,0.2)",
              background: "rgba(255,255,255,0.06)",
              color: "rgba(255,255,255,0.85)",
              cursor: "pointer",
            }}
          >
            <X style={{ width: 16, height: 16 }} />
          </button>
        </div>

        {/* ── VIDEO — padding-bottom 16:9 trick, iframe fills absolute inset ── */}
        <div style={videoContainerStyle}>
          <div style={videoAbsoluteStyle}>
            {embedUrl ? (
              <iframe
                key={embedUrl}
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
                width: "100%", height: "100%", background: "#000",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <p style={{ fontSize: 14, color: "rgba(255,255,255,0.4)", textAlign: "center", padding: "0 24px" }}>
                  Video unavailable
                </p>
              </div>
            )}
          </div>
        </div>

        {/* ── Info row ── */}
        <div style={{ padding: "14px 16px 0", display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h2 style={{ fontFamily: "var(--font-heading)", fontWeight: 900, fontSize: 18, color: "#fff", lineHeight: 1.25, margin: 0 }}>
              {viz.title}
            </h2>
            <p style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", marginTop: 4, marginBottom: 0 }}>
              {viz.artist || "Upper Vibe Media"}
            </p>
            {viz.linked_song_title && (
              <p style={{ fontSize: 12, marginTop: 4, color: `rgba(${rtp},0.7)`, marginBottom: 0 }}>
                🎵 {viz.linked_song_title}
              </p>
            )}
          </div>
          {onToggleFav && (
            <button onClick={() => onToggleFav(viz)} style={{
              width: 36, height: 36, borderRadius: 10, cursor: "pointer", flexShrink: 0,
              display: "flex", alignItems: "center", justifyContent: "center",
              ...(isFaved
                ? { background: "rgba(155,126,255,0.22)", border: "1px solid rgba(155,126,255,0.55)", color: "#9B7EFF" }
                : { background: "rgba(155,126,255,0.06)", border: "1px solid rgba(155,126,255,0.3)", color: "rgba(155,126,255,0.55)" }),
            }}>
              <Heart style={{ width: 16, height: 16, fill: isFaved ? "currentColor" : "none" }} />
            </button>
          )}
        </div>

        {/* ── Related ── */}
        {related.length > 0 && (
          <div style={{ padding: "20px 16px 0" }}>
            <p style={{ fontSize: 9, fontWeight: 900, letterSpacing: "0.28em", textTransform: "uppercase", color: "rgba(255,255,255,0.25)", marginBottom: 10 }}>
              Related Visualizers
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10 }}>
              {related.map((v) => (
                <button key={v.id} onClick={() => onSwitchViz && onSwitchViz(v)}
                  style={{
                    borderRadius: 10, overflow: "hidden", textAlign: "left", cursor: "pointer",
                    background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)",
                    padding: 0, display: "block",
                  }}>
                  {/* Thumbnail using same padding trick */}
                  <div style={{ position: "relative", width: "100%", paddingBottom: "56.25%", background: "#111" }}>
                    <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}>
                      {v.thumbnail_url
                        ? <img src={v.thumbnail_url} alt={v.title} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} loading="lazy" />
                        : <div style={{ width: "100%", height: "100%", background: `rgba(${rtp},0.06)` }} />
                      }
                    </div>
                  </div>
                  <div style={{ padding: "8px 10px" }}>
                    <p style={{ fontSize: 12, fontWeight: 700, color: "#fff", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", margin: 0 }}>{v.title}</p>
                    <p style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", margin: "2px 0 0" }}>{v.artist}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Tap-outside hint + bottom padding */}
        <p style={{ textAlign: "center", fontSize: 10, color: "rgba(255,255,255,0.15)", padding: "20px 16px 40px" }}>
          Tap outside or press Esc to close
        </p>
      </div>
    </div>
  );
}