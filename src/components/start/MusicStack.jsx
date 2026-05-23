import React from "react";
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

  if (!tracks.length) return null;

  return (
    <>
      <style>{`
        @keyframes stackCardPulse {
          0%, 100% { box-shadow: 0 0 14px rgba(${rtPrimary},0.22), 0 0 4px rgba(${rtPrimary},0.1); }
          50% { box-shadow: 0 0 38px rgba(${rtPrimary},0.65), 0 0 18px rgba(${rtPrimary},0.4); }
        }
      `}</style>
      <div className="w-full flex flex-col gap-3">
        {/* Horizontal swipe row — 3–4 cards */}
        <div
          className="flex gap-3 pb-1"
          style={{
            overflowX: "scroll",
            scrollSnapType: "x mandatory",
            WebkitOverflowScrolling: "touch",
            msOverflowStyle: "none",
            scrollbarWidth: "none",
          }}
        >
          {tracks.slice(0, 4).map((track) => (
            <Link
              key={track.id}
              to={`/song/${track.id}`}
              className="flex flex-col rounded-2xl overflow-hidden transition-all active:scale-[0.97]"
              style={{
                flex: "0 0 44vw",
                maxWidth: 160,
                minWidth: 120,
                background: primaryRgba(0.07),
                border: `1px solid ${primaryRgba(0.28)}`,
                scrollSnapAlign: "start",
                animation: "stackCardPulse 2.4s ease-in-out infinite",
              }}
            >
              {/* Artwork */}
              <div className="relative w-full" style={{ aspectRatio: "1/1" }}>
                {track.cover_url ? (
                  <img
                    src={track.cover_url}
                    alt={track.title}
                    loading="lazy"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div
                    className="w-full h-full flex items-center justify-center"
                    style={{ background: primaryRgba(0.1) }}
                  >
                    <Music2 style={{ width: 20, height: 20, color: primaryRgba(0.4) }} />
                  </div>
                )}
                {/* Play overlay */}
                <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity"
                  style={{ background: "rgba(0,0,0,0.4)" }}>
                  <div
                    className="flex items-center justify-center w-9 h-9 rounded-full"
                    style={{ background: primaryRgba(0.9), boxShadow: `0 2px 12px ${primaryRgba(0.5)}` }}
                  >
                    <Play style={{ width: 14, height: 14, color: "#000", marginLeft: 2 }} />
                  </div>
                </div>
              </div>

              {/* Info */}
              <div className="p-2.5">
                <p
                  className="text-xs font-black truncate text-white"
                  style={{ fontFamily: "var(--font-heading)", lineHeight: 1.3 }}
                >
                  {track.title}
                </p>
                <p className="text-[10px] truncate mt-0.5" style={{ color: "rgba(255,255,255,0.38)" }}>
                  {track.artist_display || "Upper Vibe Media"}
                </p>
              </div>
            </Link>
          ))}
        </div>

        {/* Swipe hint dots */}
        {tracks.length > 2 && (
          <div className="flex justify-center gap-1.5">
            {tracks.slice(0, 4).map((_, i) => (
              <span
                key={i}
                style={{
                  width: i === 0 ? 14 : 5,
                  height: 5,
                  borderRadius: 3,
                  background: i === 0 ? primaryColor : primaryRgba(0.25),
                  transition: "all 0.2s",
                }}
              />
            ))}
          </div>
        )}

        {/* CTA button */}
        <Link
          to="/music"
          className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl text-sm font-black tracking-wide transition-all active:scale-[0.97]"
          style={{
            background: primaryRgba(0.08),
            border: `1px solid ${primaryRgba(0.25)}`,
            color: primaryColor,
            fontFamily: "var(--font-heading)",
            letterSpacing: "0.05em",
          }}
        >
          Explore Music Library
        </Link>
      </div>
    </>
  );
}