import React from "react";

// Fallback artist-level links shown when a song has no individual platform URL
const FALLBACK_URLS = {
  spotify_url:      "https://open.spotify.com/artist/0Q3LMeSpQkDGNjfiHsuPQ9",
  apple_music_url:  "https://music.apple.com/us/artist/upper-vibe-media-presents/1848599260",
  youtube_url:      "https://www.youtube.com/@UpperVibeMediaPresents/videos",
  youtube_music_url:"https://music.youtube.com/channel/uppervibemedia",
};

// Correct Apple Music icon — the music note inside the gradient square
const AppleMusicIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: 14, height: 14 }}>
    <path d="M18.151 1.008H5.847C3.22 1.008 1.008 3.22 1.008 5.847v12.306c0 2.628 2.212 4.84 4.84 4.84h12.304c2.628 0 4.84-2.212 4.84-4.84V5.847c0-2.628-2.212-4.839-4.84-4.839zM16.5 8.063l-5.988 1.62v4.875c0 .563-.063 1.125-.375 1.5-.563.75-1.5 1.063-2.25 1.063-1.5 0-2.625-1.125-2.625-2.25s1.125-2.25 2.625-2.25c.375 0 .75.063 1.125.188V6.75c0-.375.25-.75.625-.875l6.375-1.688c.5-.125.875.188.875.688v2.25c0 .5-.25.875-.75 1.063-.063-.125-.063-.125-.063-.125z"/>
  </svg>
);

const SpotifyIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: 14, height: 14 }}>
    <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
  </svg>
);

const YouTubeIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: 14, height: 14 }}>
    <path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
  </svg>
);

const YouTubeMusicIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: 14, height: 14 }}>
    <path d="M12 0C5.376 0 0 5.376 0 12s5.376 12 12 12 12-5.376 12-12S18.624 0 12 0zm0 19.104c-3.924 0-7.104-3.18-7.104-7.104S8.076 4.896 12 4.896s7.104 3.18 7.104 7.104-3.18 7.104-7.104 7.104zm0-13.332c-3.432 0-6.228 2.796-6.228 6.228S8.568 18.228 12 18.228s6.228-2.796 6.228-6.228S15.432 5.772 12 5.772zM9.684 15.54V8.46L15.816 12 9.684 15.54z"/>
  </svg>
);

const PLATFORMS = [
  { key: "spotify_url",      label: "Spotify",      color: "#1DB954", Icon: SpotifyIcon },
  { key: "apple_music_url",  label: "Apple Music",  color: "#FA233B", Icon: AppleMusicIcon },
  { key: "youtube_url",      label: "YouTube",      color: "#FF0000", Icon: YouTubeIcon },
  { key: "youtube_music_url",label: "YT Music",     color: "#FF0000", Icon: YouTubeMusicIcon },
];

function hexToRgb(hex) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `${r},${g},${b}`;
}

function PlatformButton({ platform, url, size = "sm" }) {
  const { label, color, Icon } = platform;
  const rgb = hexToRgb(color);
  const padding = size === "sm" ? "6px 12px" : "7px 14px";

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding,
        borderRadius: 99,
        fontSize: 11,
        fontWeight: 700,
        color,
        background: `rgba(${rgb},0.08)`,
        border: `1px solid rgba(${rgb},0.22)`,
        textDecoration: "none",
        transition: "background 0.15s ease",
        WebkitTapHighlightColor: "transparent",
        touchAction: "manipulation",
        minHeight: 32,
      }}
      onMouseEnter={e => { e.currentTarget.style.background = `rgba(${rgb},0.18)`; }}
      onMouseLeave={e => { e.currentTarget.style.background = `rgba(${rgb},0.08)`; }}
    >
      <Icon />
      {label}
    </a>
  );
}

/**
 * StreamingPlatformLinks
 *
 * Props:
 *   track  — track record (optional individual song URLs per platform)
 *   mode   — "song" | "compact"
 *
 * Always shows all 4 platforms. Uses the track's individual URL if set,
 * otherwise falls back to the artist-level URL.
 */
export default function StreamingPlatformLinks({ track = {}, mode = "song" }) {
  // Build the list — always show all 4 using fallback if needed
  const platforms = PLATFORMS.map((p) => ({
    ...p,
    url: track[p.key] || FALLBACK_URLS[p.key],
  }));

  if (mode === "compact") {
    return (
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center" }}>
        {platforms.map((p) => (
          <PlatformButton key={p.key} platform={p} url={p.url} size="md" />
        ))}
      </div>
    );
  }

  // "song" mode — full section with heading
  return (
    <div style={{ marginTop: 32, paddingTop: 24, borderTop: "1px solid rgba(255,255,255,0.06)" }}>
      <p style={{ fontSize: 10, fontWeight: 900, letterSpacing: "0.25em", textTransform: "uppercase", color: "rgba(255,255,255,0.25)", marginBottom: 4 }}>
        Also Available On
      </p>
      <p style={{ fontSize: 11, color: "rgba(255,255,255,0.2)", marginBottom: 12 }}>
        Stream this track on major platforms.
      </p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {platforms.map((p) => (
          <PlatformButton key={p.key} platform={p} url={p.url} size="sm" />
        ))}
      </div>
    </div>
  );
}