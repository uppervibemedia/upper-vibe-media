import React, { useEffect, useRef, useState, useCallback } from "react";
import { usePlayer } from "../../context/PlayerContext";

/**
 * CastPiPButton — YouTube-style mini PiP player + AirPlay
 *
 * PiP canvas is 16:9, black background.
 * - If the active page registers a visualizer canvas via window._uvSetPiPVisual(canvas),
 *   that canvas is mirrored into PiP at 30 fps.
 * - Otherwise, cover art is drawn centered (letterboxed), with a subtle title/artist
 *   bar at the bottom — clean, no oversized layout.
 * - Browser provides native play/pause/close controls; no custom UI overlays.
 *
 * AirPlay (Safari/iOS): calls webkitShowPlaybackTargetPicker() on the global audio element.
 * Neither path creates a new Audio element or interrupts playback.
 *
 * Pages that want to feed a live visualizer canvas into PiP call:
 *   window._uvSetPiPVisual(canvasElement)   // register
 *   window._uvSetPiPVisual(null)             // deregister on unmount
 */

// ── Browser feature detection ────────────────────────────────────────────────
const supportsAirPlay =
  typeof window !== "undefined" &&
  typeof window.WebKitPlaybackTargetAvailabilityEvent !== "undefined";

const supportsPiP =
  typeof document !== "undefined" &&
  "pictureInPictureEnabled" in document &&
  document.pictureInPictureEnabled;

// ── Canvas dimensions (16:9 — matches PiP default aspect) ───────────────────
const PIP_W = 640;
const PIP_H = 360;

// ── Draw one frame ────────────────────────────────────────────────────────────
function drawFrame(ctx, sourceCanvas, coverImg, track) {
  const W = PIP_W;
  const H = PIP_H;

  if (sourceCanvas) {
    // Mirror the live visualizer canvas
    try {
      ctx.drawImage(sourceCanvas, 0, 0, W, H);
    } catch {
      ctx.fillStyle = "#000";
      ctx.fillRect(0, 0, W, H);
    }
  } else if (coverImg && coverImg.complete && coverImg.naturalWidth > 0) {
    // Black background + letterboxed cover art centered
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, W, H);

    // Fit cover art maintaining square aspect
    const size = Math.min(W, H) * 0.72;
    const x = (W - size) / 2;
    const y = (H - size) / 2 - H * 0.04; // slightly above center to leave room for text

    // Subtle shadow
    ctx.shadowColor = "rgba(0,0,0,0.8)";
    ctx.shadowBlur = 32;
    ctx.drawImage(coverImg, x, y, size, size);
    ctx.shadowBlur = 0;
  } else {
    // Solid dark background with music note
    ctx.fillStyle = "#06060e";
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "rgba(0,200,220,0.15)";
    ctx.font = `${H * 0.4}px sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("♪", W / 2, H / 2);
    ctx.textBaseline = "alphabetic";
  }

  // Bottom bar — semi-transparent overlay for title/artist
  if (track) {
    const barH = H * 0.22;
    const barY = H - barH;
    const barGrd = ctx.createLinearGradient(0, barY, 0, H);
    barGrd.addColorStop(0, "rgba(0,0,0,0)");
    barGrd.addColorStop(0.4, "rgba(0,0,0,0.72)");
    barGrd.addColorStop(1, "rgba(0,0,0,0.88)");
    ctx.fillStyle = barGrd;
    ctx.fillRect(0, barY, W, barH);

    const pad = W * 0.04;

    // Title
    ctx.fillStyle = "rgba(255,255,255,0.92)";
    ctx.font = `bold ${Math.round(H * 0.075)}px 'Syne', 'Inter', sans-serif`;
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
    const maxTW = W - pad * 2;
    let title = track.title || "Upper Vibe Media";
    while (ctx.measureText(title).width > maxTW && title.length > 4) {
      title = title.slice(0, -2) + "…";
    }
    ctx.fillText(title, pad, H - barH * 0.44);

    // Artist
    ctx.fillStyle = "rgba(255,255,255,0.45)";
    ctx.font = `${Math.round(H * 0.058)}px 'Inter', sans-serif`;
    let artist = track.artist_display || track.artist || "Upper Vibe Media";
    while (ctx.measureText(artist).width > maxTW && artist.length > 4) {
      artist = artist.slice(0, -2) + "…";
    }
    ctx.fillText(artist, pad, H - barH * 0.14);
  }

  // Tiny branding bug (bottom-right)
  ctx.fillStyle = "rgba(255,255,255,0.18)";
  ctx.font = `600 ${Math.round(H * 0.042)}px 'Syne', sans-serif`;
  ctx.textAlign = "right";
  ctx.textBaseline = "alphabetic";
  ctx.fillText("UPPER VIBE MEDIA", W * 0.97, H * 0.97);
  ctx.textAlign = "left";
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function CastPiPButton({ className = "", size = "sm" }) {
  const { currentTrack, isPlaying, audioRef } = usePlayer();
  const [airPlayAvailable, setAirPlayAvailable] = useState(false);
  const [pipActive, setPipActive] = useState(false);

  const canvasRef    = useRef(null);
  const videoRef     = useRef(null);
  const rafRef       = useRef(null);
  const coverImgRef  = useRef(null);
  // External visualizer canvas fed by the active page
  const vizCanvasRef = useRef(null);

  // ── Expose setter so visualizer/radio pages can push their canvas ──────────
  useEffect(() => {
    window._uvSetPiPVisual = (canvas) => {
      vizCanvasRef.current = canvas || null;
    };
    return () => {
      window._uvSetPiPVisual = null;
    };
  }, []);

  // ── AirPlay availability ─────────────────────────────────────────────────
  useEffect(() => {
    if (!supportsAirPlay || !audioRef?.current) return;
    const audio = audioRef.current;
    const onAvail = (e) => setAirPlayAvailable(e.availability === "available");
    audio.addEventListener("webkitplaybacktargetavailabilitychanged", onAvail);
    return () => audio.removeEventListener("webkitplaybacktargetavailabilitychanged", onAvail);
  }, [audioRef]);

  // ── Cover art preload ────────────────────────────────────────────────────
  useEffect(() => {
    if (!currentTrack?.cover_url) { coverImgRef.current = null; return; }
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = currentTrack.cover_url;
    img.onload = () => { coverImgRef.current = img; };
  }, [currentTrack?.cover_url]);

  // ── RAF draw loop ─────────────────────────────────────────────────────────
  const stopLoop = useCallback(() => {
    if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
  }, []);

  const startLoop = useCallback(() => {
    stopLoop();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");

    const loop = () => {
      drawFrame(ctx, vizCanvasRef.current, coverImgRef.current, currentTrack);
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
  }, [currentTrack, stopLoop]);

  // Restart loop when track changes while PiP is open
  useEffect(() => {
    if (pipActive) startLoop();
  }, [currentTrack, pipActive, startLoop]);

  // Stop loop when PiP closes
  useEffect(() => {
    if (!pipActive) stopLoop();
  }, [pipActive, stopLoop]);

  // Global leavepictureinpicture listener
  useEffect(() => {
    const onLeave = () => setPipActive(false);
    document.addEventListener("leavepictureinpicture", onLeave);
    return () => document.removeEventListener("leavepictureinpicture", onLeave);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopLoop();
      if (document.pictureInPictureElement) {
        document.exitPictureInPicture().catch(() => {});
      }
    };
  }, [stopLoop]);

  // ── AirPlay handler ───────────────────────────────────────────────────────
  const handleAirPlay = () => {
    const audio = audioRef?.current;
    if (audio?.webkitShowPlaybackTargetPicker) audio.webkitShowPlaybackTargetPicker();
  };

  // ── PiP handler ───────────────────────────────────────────────────────────
  const handlePiP = async () => {
    if (!supportsPiP) return;

    if (document.pictureInPictureElement) {
      await document.exitPictureInPicture().catch(() => {});
      setPipActive(false);
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width  = PIP_W;
    canvas.height = PIP_H;

    const stream = canvas.captureStream(30);

    let video = videoRef.current;
    if (!video) {
      video = document.createElement("video");
      video.muted = true; // canvas stream has no audio — real audio stays in the global player
      video.style.cssText = "position:fixed;width:1px;height:1px;opacity:0;pointer-events:none;";
      document.body.appendChild(video);
      videoRef.current = video;
    }
    video.srcObject = stream;
    await video.play().catch(() => {});

    startLoop();

    try {
      await video.requestPictureInPicture();
      setPipActive(true);
      video.addEventListener("leavepictureinpicture", () => setPipActive(false), { once: true });
    } catch (err) {
      console.warn("[CastPiPButton] PiP request failed:", err.message);
      stopLoop();
    }
  };

  if (!currentTrack) return null;

  const btnCls = size === "lg" ? "w-9 h-9" : "w-7 h-7";
  const iconCls = size === "lg" ? "w-4 h-4" : "w-3.5 h-3.5";

  return (
    <>
      <canvas ref={canvasRef} style={{ display: "none" }} />

      {/* AirPlay — Safari/iOS */}
      {supportsAirPlay && airPlayAvailable && (
        <button
          onClick={handleAirPlay}
          title="AirPlay to TV / Speaker"
          className={`${btnCls} rounded-lg flex items-center justify-center transition-all hover:scale-105 ${className}`}
          style={{ background: "rgba(0,200,220,0.08)", border: "1px solid rgba(0,200,220,0.2)", color: "#00C9E0" }}
        >
          <svg className={iconCls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12H3l9-9 9 9h-2" />
            <rect x="2" y="14" width="20" height="8" rx="2" />
            <path d="M8 22l4-4 4 4" />
          </svg>
        </button>
      )}

      {/* PiP — Chrome/Edge/Android */}
      {supportsPiP && !supportsAirPlay && (
        <button
          onClick={handlePiP}
          title={pipActive ? "Exit Picture-in-Picture" : "Picture-in-Picture"}
          className={`${btnCls} rounded-lg flex items-center justify-center transition-all hover:scale-105 ${className}`}
          style={{
            background: pipActive ? "rgba(0,200,220,0.18)" : "rgba(0,200,220,0.08)",
            border: `1px solid ${pipActive ? "rgba(0,200,220,0.5)" : "rgba(0,200,220,0.2)"}`,
            color: "#00C9E0",
          }}
        >
          <svg className={iconCls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="3" width="20" height="14" rx="2" />
            <rect x="12" y="11" width="9" height="6" rx="1" fill="currentColor" stroke="none" opacity="0.7" />
          </svg>
        </button>
      )}
    </>
  );
}