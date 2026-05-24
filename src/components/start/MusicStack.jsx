import React, { useRef, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { Play, Music2 } from "lucide-react";
import { useTheme } from "@/context/ThemeContext";
import { RADIO_THEMES } from "../radio/RadioThemePicker";

export default function MusicStack({ tracks = [] }) {
  const { accentId } = useTheme();
  const radioTheme = RADIO_THEMES[accentId] || RADIO_THEMES.cyan;
  const rtPrimary = radioTheme.vars["--rt-primary"];
  const primaryColor = `rgb(${rtPrimary})`;
  const primaryRgba = (a) => `rgba(${rtPrimary},${a})`;

  const scrollRef = useRef(null);
  const [activeIdx, setActiveIdx] = useState(0);

  const limited = tracks.slice(0, 4);

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const cardWidth = el.scrollWidth / limited.length;
    const idx = Math.round(el.scrollLeft / cardWidth);
    setActiveIdx(Math.max(0, Math.min(idx, limited.length - 1)));
  }, [limited.length]);

  if (!limited.length) return null;

  return (
    <div className="w-full flex flex-col gap-3">
      {/* Carousel container — overflowX scroll, touch-action pan-x to avoid interfering with vertical scroll */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        style={{
          display: "flex",
          gap: "12px",
          overflowX: "auto",
          overflowY: "hidden",
          WebkitOverflowScrolling: "touch",
          scrollSnapType: "x mandatory",
          scrollBehavior: "smooth",
          msOverflowStyle: "none",
          scrollbarWidth: "none",
          touchAction: "pan-x",
          paddingBottom: "4px",
          paddingLeft: "2px",
          paddingRight: "20px",
          willChange: "scroll-position",
        }}
      >
        {limited.map((track) => (
          <Link
            key={track.id}
            to={`/song/${track.id}`}
            style={{
              flexShrink: 0,
              display: "flex",
              flexDirection: "column",
              borderRadius: "16px",
              overflow: "hidden",
              scrollSnapAlign: "start",
              width: "calc(50vw - 28px)",
              maxWidth: "155px",
              minWidth: "130px",
              background: primaryRgba(0.07),
              border: `1px solid ${primaryRgba(0.2)}`,
              boxShadow: `0 0 12px ${primaryRgba(0.08)}`,
              textDecoration: "none",
              WebkitTapHighlightColor: "transparent",
            }}
          >
            {/* Artwork */}
            <div style={{ position: "relative", width: "100%", aspectRatio: "1/1" }}>
              {track.cover_url ? (
                <img
                  src={track.cover_url}
                  alt={track.title}
                  loading="lazy"
                  style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                />
              ) : (
                <div style={{
                  width: "100%", height: "100%",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  background: primaryRgba(0.1),
                }}>
                  <Music2 style={{ width: 20, height: 20, color: primaryRgba(0.4) }} />
                </div>
              )}
              {/* Play overlay — show on touch/hover */}
              <div style={{
                position: "absolute", inset: 0,
                display: "flex", alignItems: "center", justifyContent: "center",
                background: "rgba(0,0,0,0.38)",
                opacity: 0,
                transition: "opacity 0.15s",
              }}
                onMouseEnter={(e) => e.currentTarget.style.opacity = 1}
                onMouseLeave={(e) => e.currentTarget.style.opacity = 0}
              >
                <div style={{
                  display: "flex", alignItems: "center", justifyContent: "center",
                  width: 36, height: 36, borderRadius: "50%",
                  background: primaryRgba(0.9),
                  boxShadow: `0 2px 12px ${primaryRgba(0.5)}`,
                }}>
                  <Play style={{ width: 13, height: 13, color: "#000", marginLeft: 2 }} />
                </div>
              </div>
            </div>

            {/* Info */}
            <div style={{ padding: "10px" }}>
              <p style={{
                fontFamily: "var(--font-heading)", fontSize: "12px", fontWeight: 900,
                color: "#fff", lineHeight: 1.3,
                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                margin: 0,
              }}>
                {track.title}
              </p>
              <p style={{
                fontSize: "10px", marginTop: "3px",
                color: "rgba(255,255,255,0.38)",
                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                margin: "3px 0 0",
              }}>
                {track.artist_display || "Upper Vibe Media"}
              </p>
            </div>
          </Link>
        ))}
      </div>

      {/* Live pagination dots */}
      {limited.length > 2 && (
        <div style={{ display: "flex", justifyContent: "center", gap: "6px" }}>
          {limited.map((_, i) => (
            <span
              key={i}
              style={{
                width: i === activeIdx ? 14 : 5,
                height: 5,
                borderRadius: 3,
                background: i === activeIdx ? primaryColor : primaryRgba(0.25),
                transition: "all 0.25s ease",
                display: "inline-block",
              }}
            />
          ))}
        </div>
      )}

      {/* CTA */}
      <Link
        to="/music"
        style={{
          width: "100%",
          display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
          padding: "14px 0",
          borderRadius: "16px",
          fontSize: "14px", fontWeight: 900,
          letterSpacing: "0.05em",
          background: primaryRgba(0.07),
          border: `1px solid ${primaryRgba(0.2)}`,
          color: primaryColor,
          fontFamily: "var(--font-heading)",
          textDecoration: "none",
          WebkitTapHighlightColor: "transparent",
        }}
      >
        Explore Music Library
      </Link>
    </div>
  );
}