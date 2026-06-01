import React, { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { X, Heart, Play, Tv2 } from "lucide-react";
import { useTheme } from "@/context/ThemeContext";
import { RADIO_THEMES } from "@/components/radio/RadioThemePicker";

function extractVideoId(url) {
  if (!url) return null;
  const match = url.match(/(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/);
  return match ? match[1] : null;
}

function toEmbedUrl(url) {
  if (!url) return null;
  const id = extractVideoId(url);
  if (id) return `https://www.youtube.com/embed/${id}?autoplay=1&rel=0&playsinline=1&modestbranding=1&fs=1`;
  return url;
}

export default function VisualizerModal({ viz, onClose, pauseAudio, allVisualizers = [], onSwitchViz, isFaved, onToggleFav }) {
  const containerRef = useRef(null);
  const savedScrollY = useRef(0);
  const { accentId } = useTheme();
  const rtp = (RADIO_THEMES[accentId] || RADIO_THEMES.cyan).vars["--rt-primary"];

  const embedUrl = toEmbedUrl(viz?.embed_url || viz?.video_url);

  const related = allVisualizers
    .filter((v) => v.id !== viz?.id && (v.category === viz?.category || v.artist === viz?.artist))
    .slice(0, 4);

  // Every time a viz opens (or switches), lock body scroll and force container to top
  useEffect(() => {
    savedScrollY.current = window.scrollY;

    // Lock body so underlying page can't scroll on iOS
    document.body.style.overflow = "hidden";
    document.body.style.position = "fixed";
    document.body.style.top = `-${savedScrollY.current}px`;
    document.body.style.width = "100%";

    if (pauseAudio) pauseAudio();

    // Force container scroll to top — sync + two rAF passes + fallback timers
    const scrollToTop = () => {
      if (containerRef.current) {
        containerRef.current.scrollTop = 0;
      }
    };

    scrollToTop();
    const raf1 = requestAnimationFrame(() => {
      scrollToTop();
      requestAnimationFrame(scrollToTop);
    });
    const t1 = setTimeout(scrollToTop, 50);
    const t2 = setTimeout(scrollToTop, 200);

    return () => {
      cancelAnimationFrame(raf1);
      clearTimeout(t1);
      clearTimeout(t2);
      // Restore body scroll
      document.body.style.overflow = "";
      document.body.style.position = "";
      document.body.style.top = "";
      document.body.style.width = "";
      window.scrollTo(0, savedScrollY.current);
    };
  }, [viz?.id]);

  useEffect(() => {
    const handler = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  if (!viz) return null;

  return (
    <div
      ref={containerRef}
      onClick={onClose}
      style={{
        position: "fixed",
        top: 0, left: 0, right: 0, bottom: 0,
        zIndex: 9999,
        background: "rgba(4,4,14,0.97)",
        overflowY: "scroll",
        // Disable smooth scroll so scrollTop=0 is instant
        scrollBehavior: "auto",
        // Prevent scroll chaining to body
        overscrollBehavior: "contain",
        WebkitOverflowScrolling: "touch",
        // Force stacking context so iOS doesn't inherit parent scroll
        isolation: "isolate",
        willChange: "scroll-position",
      }}
    >
      {/* Content — max-width centered, video is first visible element */}
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ width: "100%", maxWidth: 896, margin: "0 auto" }}
      >
        {/* ── Top bar ── */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
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

        {/* ── VIDEO ── */}
        <div style={{ position: "relative", width: "100%", paddingBottom: "56.25%", background: "#000" }}>
          <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}>
            {embedUrl ? (
              <iframe
                key={viz.id}
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
                display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12,
              }}>
                <Tv2 style={{ width: 40, height: 40, color: "rgba(255,255,255,0.15)" }} />
                <p style={{ fontSize: 14, color: "rgba(255,255,255,0.35)", textAlign: "center", padding: "0 24px" }}>
                  Video unavailable
                </p>
              </div>
            )}
          </div>
        </div>

        {/* ── Info row ── */}
        <div style={{ padding: "16px 16px 0", display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h2 style={{ fontFamily: "var(--font-heading)", fontWeight: 900, fontSize: 18, color: "#fff", lineHeight: 1.25, margin: 0 }}>
              {viz.title}
            </h2>
            <p style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", marginTop: 4, marginBottom: 0 }}>
              {viz.artist || "Upper Vibe Media"}
            </p>
            {viz.linked_song_title && (
              <p style={{ fontSize: 12, marginTop: 4, color: `rgba(${rtp},0.75)`, marginBottom: 0 }}>
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

        {/* ── Related Visualizers — 2×2 grid ── */}
        {related.length > 0 && (
          <div style={{ padding: "20px 16px 0", borderTop: "1px solid rgba(255,255,255,0.05)", marginTop: 20 }}>
            <p style={{ fontSize: 9, fontWeight: 900, letterSpacing: "0.28em", textTransform: "uppercase", color: "rgba(255,255,255,0.25)", marginBottom: 12 }}>
              Related Visualizers
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10 }}>
              {related.map((v) => (
                <button key={v.id}
                  onClick={() => onSwitchViz && onSwitchViz(v)}
                  className="group"
                  style={{
                    borderRadius: 10, overflow: "hidden", textAlign: "left", cursor: "pointer",
                    background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)",
                    padding: 0, display: "block",
                  }}>
                  <div style={{ position: "relative", width: "100%", paddingBottom: "56.25%", background: "#111" }}>
                    <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}>
                      {v.thumbnail_url
                        ? <img src={v.thumbnail_url} alt={v.title} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} loading="lazy" />
                        : <div style={{ width: "100%", height: "100%", background: `rgba(${rtp},0.06)`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                            <Tv2 style={{ width: 20, height: 20, color: "rgba(255,255,255,0.15)" }} />
                          </div>
                      }
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        style={{ background: "rgba(0,0,0,0.5)" }}>
                        <Play style={{ width: 16, height: 16, color: "#fff" }} />
                      </div>
                    </div>
                  </div>
                  <div style={{ padding: "8px 10px" }}>
                    <p style={{ fontSize: 12, fontWeight: 700, color: "#fff", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", margin: 0 }}>{v.title}</p>
                    <p style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", margin: "2px 0 0" }}>{v.artist || "Upper Vibe Media"}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Bottom padding */}
        <div style={{ height: 48 }} />
      </div>
    </div>
  );
}