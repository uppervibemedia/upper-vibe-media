import React, { useState, useEffect } from "react";
import { Youtube, ExternalLink } from "lucide-react";
import { base44 } from "@/api/base44Client";

const DEFAULT_PLAYLIST_URL = "https://youtube.com/playlist?list=PLH-5EaZv0Utx6dsoODbo4wBFTTc_iGs0S";

export default function YouTubeCTA() {
  const [playlistUrl, setPlaylistUrl] = useState(DEFAULT_PLAYLIST_URL);

  useEffect(() => {
    base44.entities.AppSettings.filter({ key: "youtube_playlist_url" }).then((rows) => {
      if (rows?.[0]?.value) setPlaylistUrl(rows[0].value);
    });
  }, []);

  return (
    <section
      className="flex flex-col gap-4 p-5 rounded-3xl"
      style={{
        background: "rgba(255,0,0,0.04)",
        border: "1px solid rgba(255,60,60,0.18)",
      }}
    >
      {/* Label */}
      <div className="flex items-center justify-center gap-2">
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ background: "rgba(255,0,0,0.12)", border: "1px solid rgba(255,60,60,0.25)" }}
        >
          <Youtube style={{ width: 14, height: 14, color: "#FF4444" }} />
        </div>
        <span
          style={{
            fontSize: "9px",
            fontWeight: 900,
            letterSpacing: "0.32em",
            textTransform: "uppercase",
            color: "rgba(255,80,80,0.75)",
            fontFamily: "var(--font-heading)",
          }}
        >
          YouTube
        </span>
      </div>

      {/* Headline + copy */}
      <div className="text-center">
        <h2
          style={{
            fontFamily: "var(--font-heading)",
            fontSize: "1.15rem",
            fontWeight: 900,
            color: "#fff",
            marginBottom: "0.4rem",
            lineHeight: 1.2,
          }}
        >
          Watch The Visualizers
        </h2>
        <p style={{ fontSize: "0.8rem", lineHeight: 1.6, color: "rgba(255,255,255,0.45)" }}>
          Tap in to Upper Vibe Media visualizers and high-vibe music videos on YouTube.
        </p>
      </div>

      {/* CTA button */}
      <a
        href={playlistUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="w-full flex items-center justify-center gap-2.5 py-3.5 rounded-2xl text-sm font-black tracking-wide transition-all active:scale-[0.97]"
        style={{
          background: "linear-gradient(135deg,#C00000,#FF3333)",
          color: "#fff",
          fontFamily: "var(--font-heading)",
          letterSpacing: "0.05em",
          boxShadow: "0 4px 20px rgba(200,0,0,0.3)",
        }}
      >
        Watch 432 Hz Visualizer Videos
        <ExternalLink className="w-3 h-3 opacity-60" />
      </a>
    </section>
  );
}