import React from "react";

const PLATFORMS = [
  {
    key: "spotify_url",
    label: "Spotify",
    color: "#1DB954",
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: 14, height: 14 }}>
        <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
      </svg>
    ),
  },
  {
    key: "apple_music_url",
    label: "Apple Music",
    color: "#FC3C44",
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: 14, height: 14 }}>
        <path d="M23.994 6.124a9.23 9.23 0 00-.24-2.19c-.317-1.31-1.062-2.31-2.18-3.043a5.022 5.022 0 00-1.877-.726 10.496 10.496 0 00-1.564-.15c-.04-.003-.083-.01-.124-.013H5.986c-.152.01-.303.017-.455.026C4.786.07 4.043.15 3.34.428 2.004.958 1.04 1.88.475 3.208A9.78 9.78 0 00.05 5.08a70.75 70.75 0 00-.05 1.2v11.6a9.94 9.94 0 00.255 2.29c.39 1.51 1.288 2.57 2.714 3.14.48.19.98.3 1.49.36.57.07 1.15.09 1.72.09h11.56c.61 0 1.21-.04 1.81-.13.63-.09 1.24-.27 1.81-.55 1.39-.7 2.24-1.82 2.55-3.37.12-.58.17-1.17.18-1.77V7.24c0-.38-.01-.76-.04-1.12zm-7.973 1.97c-.107-.037-.215-.07-.322-.107a5.38 5.38 0 00-1.35-.22 3.46 3.46 0 00-3.461 3.46v4.8a1.16 1.16 0 01-2.32 0V9.387a1.16 1.16 0 012.32 0v.28a5.82 5.82 0 013.812-1.56 5.94 5.94 0 011.632.23 1.16 1.16 0 01-.31 2.267z"/>
      </svg>
    ),
  },
  {
    key: "youtube_url",
    label: "YouTube",
    color: "#FF0000",
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: 14, height: 14 }}>
        <path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
      </svg>
    ),
  },
  {
    key: "youtube_music_url",
    label: "YT Music",
    color: "#FF0000",
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: 14, height: 14 }}>
        <path d="M12 0C5.376 0 0 5.376 0 12s5.376 12 12 12 12-5.376 12-12S18.624 0 12 0zm0 19.104c-3.924 0-7.104-3.18-7.104-7.104S8.076 4.896 12 4.896s7.104 3.18 7.104 7.104-3.18 7.104-7.104 7.104zm0-13.332c-3.432 0-6.228 2.796-6.228 6.228S8.568 18.228 12 18.228s6.228-2.796 6.228-6.228S15.432 5.772 12 5.772zM9.684 15.54V8.46L15.816 12 9.684 15.54z"/>
      </svg>
    ),
  },
];

/**
 * StreamingPlatformLinks
 *
 * Props:
 *   track  — track record with optional spotify_url, apple_music_url, youtube_url, youtube_music_url
 *   mode   — "song" (full section with heading) | "compact" (just icons, for Start page)
 */
export default function StreamingPlatformLinks({ track = {}, mode = "song" }) {
  const available = PLATFORMS.filter((p) => !!track[p.key]);
  if (available.length === 0) return null;

  if (mode === "compact") {
    return (
      <div className="flex flex-wrap gap-2 justify-center">
        {available.map((p) => (
          <a
            key={p.key}
            href={track[p.key]}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={p.label}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "7px 13px",
              borderRadius: 99,
              fontSize: 11,
              fontWeight: 700,
              color: p.color,
              background: `rgba(${hexToRgb(p.color)},0.08)`,
              border: `1px solid rgba(${hexToRgb(p.color)},0.22)`,
              textDecoration: "none",
              transition: "all 0.15s ease",
              WebkitTapHighlightColor: "transparent",
              touchAction: "manipulation",
            }}
            onMouseEnter={e => { e.currentTarget.style.background = `rgba(${hexToRgb(p.color)},0.16)`; }}
            onMouseLeave={e => { e.currentTarget.style.background = `rgba(${hexToRgb(p.color)},0.08)`; }}
          >
            {p.icon}
            {p.label}
          </a>
        ))}
      </div>
    );
  }

  // "song" mode — full section
  return (
    <div className="mt-8 pt-6" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
      <p className="text-[10px] font-black tracking-[0.25em] uppercase text-white/25 mb-1">
        Also Available On
      </p>
      <p className="text-[11px] text-white/20 mb-3">Stream this track on major platforms.</p>
      <div className="flex flex-wrap gap-2">
        {available.map((p) => (
          <a
            key={p.key}
            href={track[p.key]}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={p.label}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "6px 12px",
              borderRadius: 99,
              fontSize: 11,
              fontWeight: 700,
              color: p.color,
              background: `rgba(${hexToRgb(p.color)},0.07)`,
              border: `1px solid rgba(${hexToRgb(p.color)},0.2)`,
              textDecoration: "none",
              transition: "all 0.15s ease",
              WebkitTapHighlightColor: "transparent",
              touchAction: "manipulation",
            }}
            onMouseEnter={e => { e.currentTarget.style.background = `rgba(${hexToRgb(p.color)},0.14)`; }}
            onMouseLeave={e => { e.currentTarget.style.background = `rgba(${hexToRgb(p.color)},0.07)`; }}
          >
            {p.icon}
            {p.label}
          </a>
        ))}
      </div>
    </div>
  );
}

function hexToRgb(hex) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `${r},${g},${b}`;
}