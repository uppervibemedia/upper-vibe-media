import React, { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { X, Heart, Play, Tv2, Headphones, Download, Lock } from "lucide-react";
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

export default function VisualizerModal({ viz, onClose, pauseAudio, allVisualizers = [], onSwitchViz, isFaved, onToggleFav, isPremium }) {
  const savedScrollY = useRef(0);
  const navigate = useNavigate();
  const { accentId } = useTheme();
  const rtp = (RADIO_THEMES[accentId] || RADIO_THEMES.cyan).vars["--rt-primary"];

  const embedUrl = toEmbedUrl(viz?.embed_url || viz?.video_url);
  const related = allVisualizers
    .filter((v) => v.id !== viz?.id && (v.category === viz?.category || v.artist === viz?.artist))
    .slice(0, 4);

  useEffect(() => {
    if (!viz) return;

    // Save current scroll position
    savedScrollY.current = window.scrollY || document.documentElement.scrollTop;

    if (pauseAudio) pauseAudio();

    // Lock the body in place using the iOS-safe technique:
    // position:fixed + top:-scrollY freezes the page without losing scroll position
    document.body.style.overflow = "hidden";
    document.body.style.position = "fixed";
    document.body.style.top = `-${savedScrollY.current}px`;
    document.body.style.left = "0";
    document.body.style.right = "0";

    return () => {
      // Restore body
      document.body.style.overflow = "";
      document.body.style.position = "";
      document.body.style.top = "";
      document.body.style.left = "";
      document.body.style.right = "";
      // Restore page scroll position
      window.scrollTo(0, savedScrollY.current);
    };
  }, [viz?.id]);

  useEffect(() => {
    const handler = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  if (!viz) return null;

  // Render into document.body via Portal — completely outside any scrolled parent
  return createPortal(
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        top: 0, left: 0, right: 0, bottom: 0,
        zIndex: 99999,
        background: "rgba(4,4,14,0.97)",
        overflowY: "auto",
        overscrollBehavior: "contain",
        // No WebkitOverflowScrolling — avoids iOS creating independent scroll layer
      }}
    >
      {/* Inner content — click stops propagation so backdrop click closes */}
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

        {/* ── VIDEO — 16:9 ratio via padding trick ── */}
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

        {/* ── Song CTA buttons ── */}
        {viz.linked_song_id && (
          <div style={{ padding: "16px 16px 0", display: "flex", flexWrap: "wrap", gap: 10 }}>
            {/* Primary: Listen to Song → exact song page */}
            <button
              onClick={() => { onClose(); navigate(`/song/${viz.linked_song_id}`); }}
              style={{
                display: "inline-flex", alignItems: "center", gap: 8,
                padding: "10px 20px", borderRadius: 12,
                fontWeight: 900, fontSize: 13, letterSpacing: "0.04em",
                cursor: "pointer", border: "none",
                background: `linear-gradient(135deg,rgb(${rtp}),rgba(${rtp},0.75))`,
                color: "#000",
                boxShadow: `0 0 20px rgba(${rtp},0.35)`,
              }}
            >
              <Headphones style={{ width: 15, height: 15, flexShrink: 0 }} />
              Listen to Song
            </button>

            {/* Download → exact song page with downloadIntent flag */}
            <button
              onClick={() => { onClose(); navigate(`/song/${viz.linked_song_id}?downloadIntent=true`); }}
              style={{
                display: "inline-flex", alignItems: "center", gap: 8,
                padding: "10px 18px", borderRadius: 12,
                fontWeight: 800, fontSize: 13,
                cursor: "pointer",
                background: isPremium ? "rgba(212,168,67,0.12)" : "rgba(212,168,67,0.06)",
                border: `1px solid ${isPremium ? "rgba(212,168,67,0.4)" : "rgba(212,168,67,0.2)"}`,
                color: isPremium ? "#D4A843" : "rgba(212,168,67,0.45)",
              }}
            >
              {isPremium
                ? <Download style={{ width: 14, height: 14, flexShrink: 0 }} />
                : <Lock style={{ width: 14, height: 14, flexShrink: 0 }} />}
              Download Song
            </button>
          </div>
        )}

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
    </div>,
    document.body
  );
}