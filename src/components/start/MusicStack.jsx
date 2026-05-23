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
    <div className="flex flex-col gap-3">
      {/* Horizontal swipe row on mobile, grid on desktop */}
      <div
        className="flex gap-3 overflow-x-auto pb-1 md:grid md:grid-cols-4 md:overflow-visible"
        style={{ scrollSnapType: "x mandatory" }}
      >
        {tracks.slice(0, 4).map((track) => (
          <Link
            key={track.id}
            to={`/song/${track.id}`}
            className="flex-shrink-0 flex flex-col rounded-2xl overflow-hidden transition-all active:scale-[0.97]"
            style={{
              width: "calc(50vw - 28px)",
              maxWidth: 160,
              background: primaryRgba(0.05),
              border: `1px solid ${primaryRgba(0.12)}`,
              scrollSnapAlign: "start",
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
  );
}