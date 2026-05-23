import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Radio, Music4, Tv2, Mail, CheckCircle2 } from "lucide-react";
import { base44 } from "@/api/base44Client";

export default function Start() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    if (!email) return;
    setSaving(true);
    await base44.entities.ContactMessage.create({
      name: "Fan",
      email,
      type: "newsletter",
      message: "Email list signup from /start landing page",
    });
    setSaving(false);
    setSubmitted(true);
  };

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-start px-5 py-10"
      style={{
        background: "linear-gradient(160deg, #060610 0%, #0a0a1e 60%, #040410 100%)",
        WebkitOverflowScrolling: "touch",
      }}
    >
      {/* Ambient glow — static, no animation loop */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 0 }}>
        <div
          className="absolute top-[-120px] left-1/2 -translate-x-1/2 w-[420px] h-[420px] rounded-full blur-[160px]"
          style={{ background: "rgba(0,160,220,0.07)" }}
        />
        <div
          className="absolute bottom-[-60px] right-[-40px] w-[260px] h-[260px] rounded-full blur-[120px]"
          style={{ background: "rgba(245,168,0,0.05)" }}
        />
      </div>

      <div className="relative z-10 w-full max-w-sm flex flex-col items-center gap-6">

        {/* ── Branding ── */}
        <div className="text-center mt-4">
          {/* Frequency badge */}
          <div
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-5"
            style={{
              background: "rgba(0,160,220,0.07)",
              border: "1px solid rgba(0,160,220,0.22)",
            }}
          >
            <span
              className="w-1.5 h-1.5 rounded-full flex-shrink-0"
              style={{ background: "#00A0DC" }}
            />
            <span
              style={{
                fontSize: "9px",
                fontWeight: 900,
                letterSpacing: "0.38em",
                textTransform: "uppercase",
                color: "#00A0DC",
                fontFamily: "var(--font-heading)",
              }}
            >
              432 Hz High-Vibe Music
            </span>
          </div>

          {/* Logo wordmark */}
          <div className="mb-1">
            <div
              style={{
                fontFamily: "var(--font-heading)",
                fontSize: "clamp(2rem, 10vw, 2.8rem)",
                fontWeight: 900,
                lineHeight: 0.95,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                color: "#F5A800",
                filter: "drop-shadow(0 2px 12px rgba(245,168,0,0.3))",
              }}
            >
              UPPER VIBE
            </div>
            <div
              style={{
                fontFamily: "var(--font-heading)",
                fontSize: "clamp(1.05rem, 5vw, 1.5rem)",
                fontWeight: 800,
                lineHeight: 1.1,
                letterSpacing: "0.22em",
                textTransform: "uppercase",
                color: "#2B9FE8",
                filter: "drop-shadow(0 2px 8px rgba(43,159,232,0.3))",
              }}
            >
              MEDIA
            </div>
          </div>

          {/* Tagline */}
          <p
            className="mt-4 text-sm leading-relaxed"
            style={{ color: "rgba(255,255,255,0.45)", maxWidth: "22rem" }}
          >
            Stream new high-vibe music, visualizers, and frequency-based sounds from Upper Vibe Media.
          </p>
        </div>

        {/* ── Main Buttons ── */}
        <div className="w-full flex flex-col gap-3">

          {/* Try Live Radio — primary CTA */}
          <Link
            to="/radio"
            className="w-full flex items-center justify-center gap-2.5 py-4 rounded-2xl font-black text-sm tracking-wider transition-all active:scale-[0.97]"
            style={{
              background: "linear-gradient(135deg,#0090C8,#00A0DC)",
              color: "#000",
              boxShadow: "0 0 28px rgba(0,160,220,0.35), 0 4px 16px rgba(0,0,0,0.3)",
            }}
          >
            <Radio className="w-4 h-4" />
            Try Live Radio
          </Link>

          {/* Latest Music */}
          <Link
            to="/music"
            className="w-full flex items-center justify-center gap-2.5 py-3.5 rounded-2xl font-black text-sm tracking-wider transition-all active:scale-[0.97]"
            style={{
              background: "rgba(0,160,220,0.07)",
              border: "1px solid rgba(0,160,220,0.28)",
              color: "#00A0DC",
            }}
          >
            <Music4 className="w-4 h-4" />
            Latest Music
          </Link>

          {/* Watch Visualizers */}
          <Link
            to="/visualizers"
            className="w-full flex items-center justify-center gap-2.5 py-3.5 rounded-2xl font-black text-sm tracking-wider transition-all active:scale-[0.97]"
            style={{
              background: "rgba(245,168,0,0.06)",
              border: "1px solid rgba(245,168,0,0.25)",
              color: "#F5A800",
            }}
          >
            <Tv2 className="w-4 h-4" />
            Watch Visualizers
          </Link>

          {/* Divider */}
          <div
            className="w-full h-px my-1"
            style={{ background: "rgba(255,255,255,0.07)" }}
          />

          {/* Listen on Spotify */}
          <a
            href="https://open.spotify.com/artist/uppervibemedia"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full flex items-center justify-center gap-2.5 py-3.5 rounded-2xl font-black text-sm tracking-wider transition-all active:scale-[0.97]"
            style={{
              background: "rgba(30,215,96,0.07)",
              border: "1px solid rgba(30,215,96,0.25)",
              color: "#1ED760",
            }}
          >
            {/* Spotify icon */}
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
            </svg>
            Listen on Spotify
          </a>

          {/* Listen on Apple Music */}
          <a
            href="https://music.apple.com/us/artist/upper-vibe-media"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full flex items-center justify-center gap-2.5 py-3.5 rounded-2xl font-black text-sm tracking-wider transition-all active:scale-[0.97]"
            style={{
              background: "rgba(252,60,68,0.07)",
              border: "1px solid rgba(252,60,68,0.22)",
              color: "#FC3C44",
            }}
          >
            {/* Apple Music icon */}
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M23.994 6.124a9.23 9.23 0 00-.24-2.19c-.317-1.31-1.062-2.31-2.18-3.043a6.303 6.303 0 00-1.903-.737 9.55 9.55 0 00-1.555-.205c-.08-.006-.16-.013-.24-.018H5.562a9.55 9.55 0 00-1.555.205 6.303 6.303 0 00-1.904.737C1.066 1.624.32 2.624.003 3.934A9.23 9.23 0 00-.237 6.124c0 .085-.006.17-.008.256v11.241c0 .086.003.17.008.255a9.23 9.23 0 00.24 2.19c.317 1.31 1.062 2.31 2.18 3.044a6.303 6.303 0 001.904.737 9.55 9.55 0 001.555.205l.24.018h12.758l.24-.018a9.55 9.55 0 001.555-.205 6.303 6.303 0 001.903-.737c1.118-.734 1.863-1.734 2.18-3.044a9.23 9.23 0 00.24-2.19c.005-.085.007-.17.007-.255V6.38c0-.086-.002-.17-.007-.256zM12 17.15c-2.84 0-5.15-2.31-5.15-5.15S9.16 6.85 12 6.85s5.15 2.31 5.15 5.15-2.31 5.15-5.15 5.15zm0-8.3a3.15 3.15 0 100 6.3 3.15 3.15 0 000-6.3zm5.35-2.35a1.2 1.2 0 110 2.4 1.2 1.2 0 010-2.4z"/>
            </svg>
            Listen on Apple Music
          </a>

          {/* Divider */}
          <div
            className="w-full h-px my-1"
            style={{ background: "rgba(255,255,255,0.07)" }}
          />

          {/* Join Email List */}
          {!submitted ? (
            <form onSubmit={handleEmailSubmit} className="w-full flex flex-col gap-2">
              <label
                className="text-xs font-black tracking-wider text-center"
                style={{ color: "rgba(255,255,255,0.35)", letterSpacing: "0.15em", textTransform: "uppercase" }}
              >
                <Mail className="w-3.5 h-3.5 inline mr-1.5 mb-0.5" />
                Join the Email List
              </label>
              <input
                type="email"
                placeholder="Your email address"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 rounded-xl text-sm text-white placeholder:text-white/25 focus:outline-none"
                style={{
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(0,160,220,0.18)",
                  WebkitAppearance: "none",
                }}
              />
              <button
                type="submit"
                disabled={saving}
                className="w-full py-3 rounded-xl font-black text-sm tracking-wider transition-all active:scale-[0.97] disabled:opacity-60"
                style={{
                  background: "rgba(0,160,220,0.12)",
                  border: "1px solid rgba(0,160,220,0.3)",
                  color: "#00A0DC",
                }}
              >
                {saving ? "Joining..." : "Get New Music Alerts"}
              </button>
            </form>
          ) : (
            <div
              className="w-full flex items-center justify-center gap-3 py-3.5 rounded-xl"
              style={{ background: "rgba(0,160,220,0.07)", border: "1px solid rgba(0,160,220,0.2)" }}
            >
              <CheckCircle2 className="w-4 h-4" style={{ color: "#00A0DC" }} />
              <span className="text-sm font-bold" style={{ color: "rgba(255,255,255,0.7)" }}>
                You're on the list!
              </span>
            </div>
          )}
        </div>

        {/* Footer */}
        <p
          className="text-[10px] text-center pb-6"
          style={{ color: "rgba(255,255,255,0.2)", letterSpacing: "0.05em" }}
        >
          © Upper Vibe Media · All rights reserved
        </p>
      </div>
    </div>
  );
}