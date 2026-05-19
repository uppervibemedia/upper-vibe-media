import React, { useState, useEffect, useRef, useCallback } from "react";
import { usePlayer } from "../../context/PlayerContext";

/**
 * MobileMediaControls
 *
 * Shows PiP + AirPlay/Cast icons at the top of a player area on mobile.
 * Appears on tap/touch, auto-hides after 3 seconds of no interaction.
 * Designed to look native — like YouTube/iPhone media player controls.
 *
 * Usage: render inside a relative-positioned container that wraps the player visual area.
 * The container must have position:relative and a defined height.
 *
 * Props:
 *   coverUrl   — fallback image for PiP if no live canvas is registered
 *   className  — extra classes on the overlay wrapper
 */

// ── Feature detection ────────────────────────────────────────────────────────
const supportsAirPlay =
  typeof window !== "undefined" &&
  typeof window.WebKitPlaybackTargetAvailabilityEvent !== "undefined";

const supportsPiP =
  typeof document !== "undefined" &&
  "pictureInPictureEnabled" in document &&
  document.pictureInPictureEnabled;

const PIP_W = 640;
const PIP_H = 360;

function drawPiPFrame(ctx, coverImg, track) {
  const W = PIP_W;
  const H = PIP_H;

  // Try live visualizer canvas first
  const vizCanvas = window._uvPiPCanvas || null;
  if (vizCanvas) {
    try { ctx.drawImage(vizCanvas, 0, 0, W, H); }
    catch { ctx.fillStyle = "#000"; ctx.fillRect(0, 0, W, H); }
  } else if (coverImg?.complete && coverImg.naturalWidth > 0) {
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, W, H);
    const size = Math.min(W, H) * 0.72;
    const x = (W - size) / 2;
    const y = (H - size) / 2 - H * 0.04;
    ctx.shadowColor = "rgba(0,0,0,0.8)";
    ctx.shadowBlur = 32;
    ctx.drawImage(coverImg, x, y, size, size);
    ctx.shadowBlur = 0;
  } else {
    ctx.fillStyle = "#06060e";
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "rgba(0,200,220,0.15)";
    ctx.font = `${H * 0.35}px sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("♪", W / 2, H / 2);
    ctx.textBaseline = "alphabetic";
  }

  // Bottom overlay bar
  if (track) {
    const barH = H * 0.22;
    const barY = H - barH;
    const grd = ctx.createLinearGradient(0, barY, 0, H);
    grd.addColorStop(0, "rgba(0,0,0,0)");
    grd.addColorStop(0.4, "rgba(0,0,0,0.72)");
    grd.addColorStop(1, "rgba(0,0,0,0.88)");
    ctx.fillStyle = grd;
    ctx.fillRect(0, barY, W, barH);
    const pad = W * 0.04;
    ctx.fillStyle = "rgba(255,255,255,0.92)";
    ctx.font = `bold ${Math.round(H * 0.075)}px sans-serif`;
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
    let title = track.title || "Upper Vibe Media";
    const maxW = W - pad * 2;
    while (ctx.measureText(title).width > maxW && title.length > 4) title = title.slice(0, -2) + "…";
    ctx.fillText(title, pad, H - barH * 0.44);
    ctx.fillStyle = "rgba(255,255,255,0.45)";
    ctx.font = `${Math.round(H * 0.058)}px sans-serif`;
    let artist = track.artist_display || track.artist || "Upper Vibe Media";
    while (ctx.measureText(artist).width > maxW && artist.length > 4) artist = artist.slice(0, -2) + "…";
    ctx.fillText(artist, pad, H - barH * 0.14);
  }

  // Branding
  ctx.fillStyle = "rgba(255,255,255,0.18)";
  ctx.font = `600 ${Math.round(H * 0.042)}px sans-serif`;
  ctx.textAlign = "right";
  ctx.textBaseline = "alphabetic";
  ctx.fillText("UPPER VIBE MEDIA", W * 0.97, H * 0.97);
  ctx.textAlign = "left";
}

export default function MobileMediaControls({ coverUrl, className = "" }) {
  const { currentTrack, audioRef } = usePlayer();
  const [visible, setVisible]           = useState(false);
  const [airPlayAvail, setAirPlayAvail] = useState(false);
  const [pipActive, setPipActive]       = useState(false);

  const hideTimerRef = useRef(null);
  const canvasRef    = useRef(null);
  const videoRef     = useRef(null);
  const rafRef       = useRef(null);
  const coverImgRef  = useRef(null);

  // Only show on touch devices
  const isTouchDevice = typeof window !== "undefined" && ("ontouchstart" in window || navigator.maxTouchPoints > 0);

  // ── AirPlay availability ──────────────────────────────────────────────────
  useEffect(() => {
    if (!supportsAirPlay || !audioRef?.current) return;
    const audio = audioRef.current;
    const onAvail = (e) => setAirPlayAvail(e.availability === "available");
    audio.addEventListener("webkitplaybacktargetavailabilitychanged", onAvail);
    return () => audio.removeEventListener("webkitplaybacktargetavailabilitychanged", onAvail);
  }, [audioRef]);

  // ── Cover image preload ───────────────────────────────────────────────────
  const imgSrc = coverUrl || currentTrack?.cover_url;
  useEffect(() => {
    if (!imgSrc) { coverImgRef.current = null; return; }
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = imgSrc;
    img.onload = () => { coverImgRef.current = img; };
  }, [imgSrc]);

  // ── Show / auto-hide logic ─────────────────────────────────────────────────
  const showControls = useCallback(() => {
    setVisible(true);
    clearTimeout(hideTimerRef.current);
    hideTimerRef.current = setTimeout(() => setVisible(false), 3000);
  }, []);

  useEffect(() => () => clearTimeout(hideTimerRef.current), []);

  // ── PiP draw loop ─────────────────────────────────────────────────────────
  const stopLoop = useCallback(() => {
    if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
  }, []);

  const startLoop = useCallback(() => {
    stopLoop();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const loop = () => {
      drawPiPFrame(ctx, coverImgRef.current, currentTrack);
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
  }, [currentTrack, stopLoop]);

  useEffect(() => { if (pipActive) startLoop(); }, [currentTrack, pipActive, startLoop]);
  useEffect(() => { if (!pipActive) stopLoop(); }, [pipActive, stopLoop]);

  useEffect(() => {
    const onLeave = () => setPipActive(false);
    document.addEventListener("leavepictureinpicture", onLeave);
    return () => document.removeEventListener("leavepictureinpicture", onLeave);
  }, []);

  useEffect(() => {
    return () => {
      stopLoop();
      if (document.pictureInPictureElement) document.exitPictureInPicture().catch(() => {});
    };
  }, [stopLoop]);

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleAirPlay = (e) => {
    e.stopPropagation();
    const audio = audioRef?.current;
    if (audio?.webkitShowPlaybackTargetPicker) audio.webkitShowPlaybackTargetPicker();
  };

  const handlePiP = async (e) => {
    e.stopPropagation();
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
      video.muted = true;
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
      console.warn("[MobileMediaControls] PiP failed:", err.message);
      stopLoop();
    }
  };

  // Don't render on desktop or if no track
  if (!isTouchDevice || !currentTrack) return null;

  const showPiP     = supportsPiP;
  const showAirPlay = supportsAirPlay && airPlayAvail;
  if (!showPiP && !showAirPlay) return null;

  return (
    <>
      {/* Hidden canvas for PiP */}
      <canvas ref={canvasRef} style={{ display: "none" }} />

      {/* Touch capture overlay */}
      <div
        className={`absolute inset-0 z-10 ${className}`}
        onTouchStart={showControls}
        onClick={showControls}
        style={{ touchAction: "manipulation" }}
      >
        {/* Top control bar — fades in/out */}
        <div
          className="absolute top-0 left-0 right-0 flex items-center gap-2 px-3 pt-3 pb-6 transition-opacity duration-300"
          style={{
            opacity: visible ? 1 : 0,
            pointerEvents: visible ? "auto" : "none",
            background: "linear-gradient(180deg, rgba(0,0,0,0.65) 0%, transparent 100%)",
          }}
        >
          {/* PiP button */}
          {showPiP && (
            <button
              onTouchStart={(e) => { e.stopPropagation(); }}
              onClick={handlePiP}
              title={pipActive ? "Exit Picture-in-Picture" : "Picture-in-Picture"}
              className="w-9 h-9 rounded-xl flex items-center justify-center transition-all active:scale-90"
              style={{
                background: pipActive ? "rgba(0,200,220,0.3)" : "rgba(0,0,0,0.45)",
                border: `1.5px solid ${pipActive ? "rgba(0,200,220,0.7)" : "rgba(255,255,255,0.25)"}`,
              }}
            >
              {/* PiP icon — mini player inside screen */}
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="3" width="20" height="14" rx="2" />
                <rect x="12" y="11" width="9" height="6" rx="1" fill="white" stroke="none" opacity="0.8" />
              </svg>
            </button>
          )}

          {/* AirPlay / TV button */}
          {showAirPlay && (
            <button
              onTouchStart={(e) => { e.stopPropagation(); }}
              onClick={handleAirPlay}
              title="AirPlay to TV / Speaker"
              className="w-9 h-9 rounded-xl flex items-center justify-center transition-all active:scale-90"
              style={{
                background: "rgba(0,0,0,0.45)",
                border: "1.5px solid rgba(255,255,255,0.25)",
              }}
            >
              {/* AirPlay icon */}
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12H3l9-9 9 9h-2" />
                <rect x="2" y="14" width="20" height="8" rx="2" />
                <path d="M8 22l4-4 4 4" />
              </svg>
            </button>
          )}
        </div>
      </div>
    </>
  );
}