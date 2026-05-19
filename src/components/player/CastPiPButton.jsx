import React, { useEffect, useRef, useState } from "react";
import { usePlayer } from "../../context/PlayerContext";

/**
 * CastPiPButton
 *
 * Renders ONE of three things depending on browser support:
 *   1. AirPlay button  — Safari/iOS  (uses WebKit's built-in AirPlay picker)
 *   2. PiP button      — Chrome/Edge/Android  (opens a canvas-based PiP window
 *                         that shows cover art + track info, driven by the
 *                         existing global audio element — no new Audio() created)
 *   3. null            — browser supports neither
 *
 * IMPORTANT: this component never creates or replaces the audio element.
 * It only reads from `audioRef` (the global persistent audio) for PiP video sync.
 */

// ── detect support once ──────────────────────────────────────────────────────
const supportsAirPlay =
  typeof window !== "undefined" &&
  typeof window.WebKitPlaybackTargetAvailabilityEvent !== "undefined";

const supportsPiP =
  typeof document !== "undefined" &&
  "pictureInPictureEnabled" in document &&
  document.pictureInPictureEnabled;

// ── Draw one frame of the PiP canvas ─────────────────────────────────────────
function drawPiPFrame(canvas, ctx, coverImg, track, isPlaying, analyser) {
  const W = canvas.width;
  const H = canvas.height;

  // Background
  ctx.fillStyle = "#06060e";
  ctx.fillRect(0, 0, W, H);

  // Ambient glow
  const grd = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, W * 0.55);
  grd.addColorStop(0, "rgba(0,200,220,0.07)");
  grd.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, W, H);

  // Cover art (left side, square)
  const coverSize = H * 0.62;
  const coverX = W * 0.06;
  const coverY = (H - coverSize) / 2;

  if (coverImg && coverImg.complete && coverImg.naturalWidth > 0) {
    ctx.save();
    ctx.beginPath();
    const r = 12;
    ctx.moveTo(coverX + r, coverY);
    ctx.lineTo(coverX + coverSize - r, coverY);
    ctx.quadraticCurveTo(coverX + coverSize, coverY, coverX + coverSize, coverY + r);
    ctx.lineTo(coverX + coverSize, coverY + coverSize - r);
    ctx.quadraticCurveTo(coverX + coverSize, coverY + coverSize, coverX + coverSize - r, coverY + coverSize);
    ctx.lineTo(coverX + r, coverY + coverSize);
    ctx.quadraticCurveTo(coverX, coverY + coverSize, coverX, coverY + coverSize - r);
    ctx.lineTo(coverX, coverY + r);
    ctx.quadraticCurveTo(coverX, coverY, coverX + r, coverY);
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(coverImg, coverX, coverY, coverSize, coverSize);
    ctx.restore();
  } else {
    // Fallback placeholder
    ctx.fillStyle = "rgba(0,200,220,0.08)";
    ctx.fillRect(coverX, coverY, coverSize, coverSize);
    ctx.fillStyle = "rgba(0,200,220,0.25)";
    ctx.font = `${coverSize * 0.35}px sans-serif`;
    ctx.textAlign = "center";
    ctx.fillText("♪", coverX + coverSize / 2, coverY + coverSize * 0.68);
  }

  // Text area (right of cover)
  const textX = coverX + coverSize + W * 0.07;
  const textW = W - textX - W * 0.06;
  const textMidY = H / 2;

  // Title
  ctx.fillStyle = "rgba(255,255,255,0.92)";
  ctx.font = `bold ${Math.round(H * 0.115)}px 'Syne', sans-serif`;
  ctx.textAlign = "left";
  const title = track?.title || "Upper Vibe Media";
  // Truncate if too wide
  let displayTitle = title;
  while (ctx.measureText(displayTitle).width > textW && displayTitle.length > 4) {
    displayTitle = displayTitle.slice(0, -2) + "…";
  }
  ctx.fillText(displayTitle, textX, textMidY - H * 0.07);

  // Artist
  ctx.fillStyle = "rgba(255,255,255,0.38)";
  ctx.font = `${Math.round(H * 0.08)}px 'Inter', sans-serif`;
  const artist = track?.artist_display || track?.artist || "Upper Vibe Media";
  let displayArtist = artist;
  while (ctx.measureText(displayArtist).width > textW && displayArtist.length > 4) {
    displayArtist = displayArtist.slice(0, -2) + "…";
  }
  ctx.fillText(displayArtist, textX, textMidY + H * 0.07);

  // 432 Hz badge
  ctx.fillStyle = "rgba(0,200,220,0.12)";
  const badgeH = H * 0.1;
  const badgeW = H * 0.32;
  const badgeX = textX;
  const badgeY = textMidY + H * 0.17;
  ctx.beginPath();
  ctx.roundRect(badgeX, badgeY, badgeW, badgeH, badgeH / 2);
  ctx.fill();
  ctx.fillStyle = "#00C9E0";
  ctx.font = `bold ${Math.round(H * 0.07)}px sans-serif`;
  ctx.textAlign = "center";
  ctx.fillText("432 Hz", badgeX + badgeW / 2, badgeY + badgeH * 0.72);
  ctx.textAlign = "left";

  // Playing indicator bars (bottom right)
  if (analyser && isPlaying) {
    const freqData = new Uint8Array(analyser.frequencyBinCount);
    analyser.getByteFrequencyData(freqData);
    const bars = 6;
    const bW = H * 0.025;
    const bGap = H * 0.018;
    const bMaxH = H * 0.2;
    const bBaseY = H * 0.88;
    const bStartX = W - W * 0.06 - (bars * (bW + bGap));
    for (let i = 0; i < bars; i++) {
      const val = freqData[Math.floor((i / bars) * freqData.length)] / 255;
      const bH = val * bMaxH + 4;
      ctx.fillStyle = `rgba(0,200,220,${0.5 + val * 0.5})`;
      ctx.beginPath();
      ctx.roundRect(bStartX + i * (bW + bGap), bBaseY - bH, bW, bH, bW / 2);
      ctx.fill();
    }
  }

  // Branding watermark
  ctx.fillStyle = "rgba(255,255,255,0.1)";
  ctx.font = `600 ${Math.round(H * 0.065)}px 'Syne', sans-serif`;
  ctx.textAlign = "right";
  ctx.fillText("UPPER VIBE MEDIA", W - W * 0.04, H * 0.95);
  ctx.textAlign = "left";
}

// ── Main component ────────────────────────────────────────────────────────────
export default function CastPiPButton({ className = "", size = "sm" }) {
  const { currentTrack, isPlaying, audioRef } = usePlayer();
  const [airPlayAvailable, setAirPlayAvailable] = useState(false);
  const [pipActive, setPipActive]             = useState(false);

  const canvasRef     = useRef(null);
  const videoRef      = useRef(null);
  const rafRef        = useRef(null);
  const coverImgRef   = useRef(null);
  const streamRef     = useRef(null);

  // ── AirPlay availability listener ───────────────────────────────────────
  useEffect(() => {
    if (!supportsAirPlay || !audioRef?.current) return;
    const audio = audioRef.current;

    const onAvailability = (e) => {
      setAirPlayAvailable(e.availability === "available");
    };
    audio.addEventListener("webkitplaybacktargetavailabilitychanged", onAvailability);
    return () => audio.removeEventListener("webkitplaybacktargetavailabilitychanged", onAvailability);
  }, [audioRef]);

  // ── Preload cover image whenever track changes ───────────────────────────
  useEffect(() => {
    if (!currentTrack?.cover_url) { coverImgRef.current = null; return; }
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = currentTrack.cover_url;
    img.onload = () => { coverImgRef.current = img; };
  }, [currentTrack?.cover_url]);

  // ── PiP canvas RAF loop ──────────────────────────────────────────────────
  const startDrawLoop = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const analyser = window._uvAnalyser || null;

    const loop = () => {
      drawPiPFrame(canvas, ctx, coverImgRef.current, currentTrack, isPlaying, analyser);
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
  };

  const stopDrawLoop = () => {
    if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
  };

  // Stop loop when PiP closes
  useEffect(() => {
    if (!pipActive) stopDrawLoop();
  }, [pipActive]);

  // Keep drawing even when track/isPlaying changes during PiP
  useEffect(() => {
    if (pipActive) {
      stopDrawLoop();
      startDrawLoop();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTrack, isPlaying, pipActive]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopDrawLoop();
      if (document.pictureInPictureElement) {
        document.exitPictureInPicture().catch(() => {});
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Listen for PiP being closed by the browser
  useEffect(() => {
    const onLeave = () => { setPipActive(false); };
    document.addEventListener("leavepictureinpicture", onLeave);
    return () => document.removeEventListener("leavepictureinpicture", onLeave);
  }, []);

  // ── AirPlay handler ──────────────────────────────────────────────────────
  const handleAirPlay = () => {
    const audio = audioRef?.current;
    if (!audio || !audio.webkitShowPlaybackTargetPicker) return;
    audio.webkitShowPlaybackTargetPicker();
  };

  // ── PiP handler ──────────────────────────────────────────────────────────
  const handlePiP = async () => {
    if (!supportsPiP) return;

    // If already in PiP, exit
    if (document.pictureInPictureElement) {
      await document.exitPictureInPicture();
      setPipActive(false);
      stopDrawLoop();
      return;
    }

    // Build an offscreen canvas + video stream
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Ensure canvas has dimensions
    canvas.width  = 640;
    canvas.height = 200;

    // Get a stream from the canvas
    const stream = canvas.captureStream(30);
    streamRef.current = stream;

    // Create / reuse a hidden video element fed by the canvas stream
    let video = videoRef.current;
    if (!video) {
      video = document.createElement("video");
      video.muted = true;       // canvas video has no audio — audio stays in global player
      video.style.display = "none";
      document.body.appendChild(video);
      videoRef.current = video;
    }

    video.srcObject = stream;
    await video.play();

    startDrawLoop();

    try {
      await video.requestPictureInPicture();
      setPipActive(true);

      video.addEventListener("leavepictureinpicture", () => {
        setPipActive(false);
        stopDrawLoop();
      }, { once: true });
    } catch (err) {
      console.warn("[CastPiPButton] PiP request failed:", err);
      stopDrawLoop();
    }
  };

  // Nothing to show if no track loaded
  if (!currentTrack) return null;

  const btnSize = size === "lg"
    ? "w-9 h-9 text-xs"
    : "w-7 h-7 text-[10px]";
  const iconSize = size === "lg" ? "w-4 h-4" : "w-3.5 h-3.5";

  return (
    <>
      {/* Hidden canvas for PiP rendering */}
      <canvas ref={canvasRef} style={{ display: "none" }} />

      {/* AirPlay button — Safari/iOS only */}
      {supportsAirPlay && airPlayAvailable && (
        <button
          onClick={handleAirPlay}
          title="AirPlay to TV / Speaker"
          className={`${btnSize} rounded-lg flex items-center justify-center transition-all hover:scale-105 ${className}`}
          style={{ background: "rgba(0,200,220,0.08)", border: "1px solid rgba(0,200,220,0.2)", color: "#00C9E0" }}
        >
          {/* AirPlay SVG — matches Apple's icon */}
          <svg className={iconSize} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12H3l9-9 9 9h-2" />
            <path d="M12 3v13" strokeOpacity="0" />
            <rect x="2" y="14" width="20" height="8" rx="2" />
            <path d="M8 22l4-4 4 4" />
          </svg>
        </button>
      )}

      {/* PiP button — Chrome/Edge/Android */}
      {supportsPiP && !supportsAirPlay && (
        <button
          onClick={handlePiP}
          title={pipActive ? "Exit Picture-in-Picture" : "Picture-in-Picture"}
          className={`${btnSize} rounded-lg flex items-center justify-center transition-all hover:scale-105 ${className}`}
          style={{
            background: pipActive ? "rgba(0,200,220,0.18)" : "rgba(0,200,220,0.08)",
            border: `1px solid ${pipActive ? "rgba(0,200,220,0.5)" : "rgba(0,200,220,0.2)"}`,
            color: "#00C9E0",
          }}
        >
          {/* PiP SVG */}
          <svg className={iconSize} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="3" width="20" height="14" rx="2" />
            <rect x="12" y="11" width="9" height="6" rx="1" fill="currentColor" stroke="none" opacity="0.6" />
          </svg>
        </button>
      )}
    </>
  );
}