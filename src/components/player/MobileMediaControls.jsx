import React, { useState, useEffect, useRef, useCallback } from "react";
import { usePlayer } from "../../context/PlayerContext";

/**
 * MobileMediaControls — PiP + AirPlay overlay for mobile
 *
 * iPhone Safari:
 *   - AirPlay: calls webkitShowPlaybackTargetPicker() on the audio element ✅
 *   - PiP: canvas.captureStream() not supported → shows clear unsupported message ✅
 *
 * Desktop/Android Chrome:
 *   - PiP: canvas stream → hidden video → requestPictureInPicture() ✅
 *   - AirPlay: n/a (Chromecast handled separately)
 *
 * Icons appear on tap, auto-hide after 3 seconds.
 * Mobile-only — does not render on desktop.
 */

// ── Icons ─────────────────────────────────────────────────────────────────────
const PiPIcon = ({ active }) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="1" y="4" width="22" height="16" rx="2" stroke="white" strokeWidth="2" />
    <rect x="12" y="12" width="9" height="6" rx="1.5" fill={active ? "#00C9E0" : "white"} />
  </svg>
);

const AirPlayIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M5 17H3a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h18a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-2"
      stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <polygon points="12 15 17 21 7 21" fill="white" />
  </svg>
);

// ── Canvas draw for non-iOS PiP ───────────────────────────────────────────────
const PIP_W = 640;
const PIP_H = 360;

function drawPiPFrame(ctx, coverImg, track) {
  const W = PIP_W, H = PIP_H;
  const vizCanvas = window._uvPiPCanvas;
  if (vizCanvas) {
    try { ctx.drawImage(vizCanvas, 0, 0, W, H); } catch { /* ignore */ }
  } else if (coverImg?.complete && coverImg.naturalWidth > 0) {
    ctx.fillStyle = "#06060e";
    ctx.fillRect(0, 0, W, H);
    const size = Math.min(W, H) * 0.68;
    ctx.shadowColor = "rgba(0,0,0,0.7)";
    ctx.shadowBlur = 28;
    ctx.drawImage(coverImg, (W - size) / 2, (H - size) / 2 - H * 0.03, size, size);
    ctx.shadowBlur = 0;
  } else {
    ctx.fillStyle = "#06060e";
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "rgba(0,200,220,0.18)";
    ctx.font = `${H * 0.32}px sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("♪", W / 2, H / 2);
    ctx.textBaseline = "alphabetic";
  }
  if (track) {
    const barH = H * 0.24, barY = H - barH;
    const grd = ctx.createLinearGradient(0, barY, 0, H);
    grd.addColorStop(0, "rgba(0,0,0,0)");
    grd.addColorStop(0.35, "rgba(0,0,0,0.75)");
    grd.addColorStop(1, "rgba(0,0,0,0.9)");
    ctx.fillStyle = grd;
    ctx.fillRect(0, barY, W, barH);
    const pad = W * 0.04, maxW = W - pad * 2;
    ctx.fillStyle = "rgba(255,255,255,0.93)";
    ctx.font = `bold ${Math.round(H * 0.074)}px sans-serif`;
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
    let title = track.title || "Upper Vibe Media";
    while (ctx.measureText(title).width > maxW && title.length > 4) title = title.slice(0, -2) + "…";
    ctx.fillText(title, pad, H - barH * 0.42);
    ctx.fillStyle = "rgba(255,255,255,0.45)";
    ctx.font = `${Math.round(H * 0.056)}px sans-serif`;
    let artist = track.artist_display || track.artist || "Upper Vibe Media";
    while (ctx.measureText(artist).width > maxW && artist.length > 4) artist = artist.slice(0, -2) + "…";
    ctx.fillText(artist, pad, H - barH * 0.13);
  }
  ctx.fillStyle = "rgba(255,255,255,0.16)";
  ctx.font = `600 ${Math.round(H * 0.04)}px sans-serif`;
  ctx.textAlign = "right";
  ctx.textBaseline = "alphabetic";
  ctx.fillText("UPPER VIBE MEDIA", W * 0.97, H * 0.96);
  ctx.textAlign = "left";
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function MobileMediaControls({ coverUrl, className = "" }) {
  const { currentTrack, audioRef } = usePlayer();

  // All state/refs declared before any conditional return (Rules of Hooks)
  const [isMobile, setIsMobile]       = useState(false);
  const [isIOS, setIsIOS]             = useState(false);
  const [supportsPiP, setSupportsPiP] = useState(false);
  const [supportsAP, setSupportsAP]   = useState(false);
  const [visible, setVisible]         = useState(false);
  const [pipActive, setPipActive]     = useState(false);
  const [toast, setToast]             = useState("");

  const hideTimerRef  = useRef(null);
  const toastTimerRef = useRef(null);
  const canvasRef     = useRef(null);
  const pipVideoRef   = useRef(null);
  const rafRef        = useRef(null);
  const coverImgRef   = useRef(null);

  // ── Detect device once on mount ───────────────────────────────────────────
  useEffect(() => {
    const ua = navigator.userAgent || "";
    const ios    = /iPhone|iPad|iPod/i.test(ua);
    const mobile = ios || /Android/i.test(ua) || navigator.maxTouchPoints > 0;
    const pip    = !ios && "pictureInPictureEnabled" in document && !!document.pictureInPictureEnabled;
    const ap     = typeof window.WebKitPlaybackTargetAvailabilityEvent !== "undefined";

    setIsMobile(mobile);
    setIsIOS(ios);
    setSupportsPiP(pip);
    setSupportsAP(ap);

    console.log("[MobileMediaControls] 🔍 Device:", { isMobile: mobile, isIOS: ios, supportsPiP: pip, supportsAirPlay: ap });
  }, []);

  // ── Cover image preload ───────────────────────────────────────────────────
  const imgSrc = coverUrl || currentTrack?.cover_url;
  useEffect(() => {
    if (!imgSrc) { coverImgRef.current = null; return; }
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = imgSrc;
    img.onload = () => { coverImgRef.current = img; };
  }, [imgSrc]);

  // ── Show / auto-hide ──────────────────────────────────────────────────────
  const showControls = useCallback(() => {
    setVisible(true);
    clearTimeout(hideTimerRef.current);
    hideTimerRef.current = setTimeout(() => setVisible(false), 3000);
  }, []);

  useEffect(() => () => {
    clearTimeout(hideTimerRef.current);
    clearTimeout(toastTimerRef.current);
  }, []);

  // ── PiP canvas loop (desktop/Android only) ────────────────────────────────
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
    const onLeave = () => { setPipActive(false); stopLoop(); };
    document.addEventListener("leavepictureinpicture", onLeave);
    return () => document.removeEventListener("leavepictureinpicture", onLeave);
  }, [stopLoop]);

  useEffect(() => () => {
    stopLoop();
    if (document.pictureInPictureElement) document.exitPictureInPicture().catch(() => {});
    if (pipVideoRef.current) { pipVideoRef.current.remove(); pipVideoRef.current = null; }
  }, [stopLoop]);

  // ── Toast ─────────────────────────────────────────────────────────────────
  const showToast = useCallback((msg) => {
    setToast(msg);
    clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToast(""), 3000);
  }, []);

  // ── Early return AFTER all hooks ──────────────────────────────────────────
  if (!isMobile || !currentTrack) return null;

  // ── AirPlay handler ───────────────────────────────────────────────────────
  const handleAirPlay = (e) => {
    e.stopPropagation();
    showControls();
    const audio = audioRef?.current;
    console.log("[MobileMediaControls] 📺 AirPlay tapped", {
      hasMethod: !!audio?.webkitShowPlaybackTargetPicker,
      supportsAP,
    });
    if (audio?.webkitShowPlaybackTargetPicker) {
      audio.webkitShowPlaybackTargetPicker();
    } else {
      showToast("AirPlay not available in this browser");
    }
  };

  // ── PiP handler ───────────────────────────────────────────────────────────
  const handlePiP = async (e) => {
    e.stopPropagation();
    showControls();

    // iOS Safari: canvas.captureStream() not supported — inform user clearly
    if (isIOS) {
      showToast("PiP not supported in iPhone Safari.\nUse the native iOS PiP button in Safari's media controls.");
      console.log("[MobileMediaControls] ℹ️ PiP tapped on iOS — not supported");
      return;
    }

    if (!supportsPiP) {
      showToast("Picture-in-Picture not supported on this device");
      return;
    }

    // Exit existing PiP
    if (document.pictureInPictureElement) {
      await document.exitPictureInPicture().catch(() => {});
      setPipActive(false);
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width  = PIP_W;
    canvas.height = PIP_H;

    // Draw first frame before requesting PiP
    drawPiPFrame(canvas.getContext("2d"), coverImgRef.current, currentTrack);

    let video = pipVideoRef.current;
    if (!video) {
      video = document.createElement("video");
      video.muted = true;
      video.playsInline = true;
      video.setAttribute("playsinline", "");
      video.style.cssText = "position:fixed;top:-9999px;left:-9999px;width:2px;height:2px;opacity:0.001;pointer-events:none;z-index:-1;";
      document.body.appendChild(video);
      pipVideoRef.current = video;
    }

    try {
      video.srcObject = canvas.captureStream(30);
      await video.play();
      startLoop();
      await video.requestPictureInPicture();
      setPipActive(true);
      console.log("[MobileMediaControls] ✅ PiP opened");
      video.addEventListener("leavepictureinpicture", () => { setPipActive(false); stopLoop(); }, { once: true });
    } catch (err) {
      console.warn("[MobileMediaControls] ⚠️ PiP failed:", err.message);
      stopLoop();
      showToast("Picture-in-Picture not available");
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <>
      <canvas
        ref={canvasRef}
        style={{ position: "absolute", top: -9999, left: -9999, width: 1, height: 1, opacity: 0, pointerEvents: "none" }}
      />

      <div
        className={`absolute inset-0 z-20 ${className}`}
        onTouchStart={showControls}
        onClick={showControls}
        style={{ touchAction: "manipulation" }}
      >
        {/* Top bar */}
        <div
          style={{
            position: "absolute",
            top: 0, left: 0, right: 0,
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "12px 12px 36px 12px",
            opacity: visible ? 1 : 0,
            transform: visible ? "translateY(0)" : "translateY(-8px)",
            transition: "opacity 0.22s ease, transform 0.22s ease",
            pointerEvents: visible ? "auto" : "none",
            background: "linear-gradient(180deg, rgba(0,0,0,0.72) 0%, transparent 100%)",
          }}
        >
          {/* PiP */}
          <button
            onTouchStart={(e) => e.stopPropagation()}
            onClick={handlePiP}
            title={pipActive ? "Exit Picture-in-Picture" : "Picture-in-Picture"}
            style={{
              width: 44, height: 44, borderRadius: 12,
              display: "flex", alignItems: "center", justifyContent: "center",
              background: pipActive ? "rgba(0,201,224,0.3)" : "rgba(0,0,0,0.58)",
              border: `1.5px solid ${pipActive ? "rgba(0,201,224,0.8)" : "rgba(255,255,255,0.28)"}`,
              opacity: (supportsPiP || isIOS) ? 1 : 0.42,
              cursor: "pointer",
              WebkitTapHighlightColor: "transparent",
              flexShrink: 0,
            }}
          >
            <PiPIcon active={pipActive} />
          </button>

          {/* AirPlay */}
          <button
            onTouchStart={(e) => e.stopPropagation()}
            onClick={handleAirPlay}
            title="AirPlay to TV / Speaker"
            style={{
              width: 44, height: 44, borderRadius: 12,
              display: "flex", alignItems: "center", justifyContent: "center",
              background: "rgba(0,0,0,0.58)",
              border: "1.5px solid rgba(255,255,255,0.28)",
              opacity: supportsAP ? 1 : 0.42,
              cursor: "pointer",
              WebkitTapHighlightColor: "transparent",
              flexShrink: 0,
            }}
          >
            <AirPlayIcon />
          </button>

          <span style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", letterSpacing: "0.06em", userSelect: "none" }}>
            PiP &nbsp;·&nbsp; AirPlay
          </span>
        </div>

        {/* Toast */}
        {toast !== "" && (
          <div style={{ position: "absolute", top: 62, left: 12, right: 12, display: "flex", justifyContent: "center", pointerEvents: "none", zIndex: 30 }}>
            <div style={{
              padding: "8px 14px", borderRadius: 12, fontSize: 12,
              color: "rgba(255,255,255,0.85)",
              background: "rgba(0,0,0,0.8)",
              border: "1px solid rgba(255,255,255,0.14)",
              backdropFilter: "blur(10px)",
              WebkitBackdropFilter: "blur(10px)",
              textAlign: "center", maxWidth: 280, whiteSpace: "pre-line",
            }}>
              {toast}
            </div>
          </div>
        )}
      </div>
    </>
  );
}