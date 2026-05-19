import React, { useState, useEffect, useRef, useCallback } from "react";
import { usePlayer } from "../../context/PlayerContext";

/**
 * MobileMediaControls — PiP + AirPlay overlay for mobile/iPhone
 *
 * KEY iOS FACTS:
 * - iPhone Safari does NOT support canvas.captureStream() → PiP via canvas won't work
 * - AirPlay on iOS requires webkitShowPlaybackTargetPicker() called on a VIDEO element
 * - The audio-only element won't trigger AirPlay device picker on iPhone
 * - We create a tiny hidden <video> with a canvas stream for AirPlay to attach to
 * - We ALWAYS show both icons on touch devices (disabled state if unsupported)
 *
 * Icons appear on tap, auto-hide after 3s.
 */

const PIP_W = 640;
const PIP_H = 360;

// ── Detect environment ────────────────────────────────────────────────────────
function getEnv() {
  if (typeof window === "undefined") return {};
  const ua = navigator.userAgent || "";
  const isIOS = /iPhone|iPad|iPod/i.test(ua);
  const isMobile = isIOS || /Android/i.test(ua) || navigator.maxTouchPoints > 0;
  const supportsAirPlayAPI = typeof window.WebKitPlaybackTargetAvailabilityEvent !== "undefined";
  const supportsPiPAPI =
    "pictureInPictureEnabled" in document && document.pictureInPictureEnabled;
  return { isIOS, isMobile, supportsAirPlayAPI, supportsPiPAPI };
}

// ── Draw a PiP frame onto a canvas ───────────────────────────────────────────
function drawPiPFrame(ctx, coverImg, track) {
  const W = PIP_W;
  const H = PIP_H;

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
    ctx.fillStyle = "rgba(0,200,220,0.18)";
    ctx.font = `${H * 0.35}px sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("♪", W / 2, H / 2);
    ctx.textBaseline = "alphabetic";
  }

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
    const maxW = W - pad * 2;
    ctx.fillStyle = "rgba(255,255,255,0.92)";
    ctx.font = `bold ${Math.round(H * 0.075)}px sans-serif`;
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
    let title = track.title || "Upper Vibe Media";
    while (ctx.measureText(title).width > maxW && title.length > 4) title = title.slice(0, -2) + "…";
    ctx.fillText(title, pad, H - barH * 0.44);
    ctx.fillStyle = "rgba(255,255,255,0.45)";
    ctx.font = `${Math.round(H * 0.058)}px sans-serif`;
    let artist = track.artist_display || track.artist || "Upper Vibe Media";
    while (ctx.measureText(artist).width > maxW && artist.length > 4) artist = artist.slice(0, -2) + "…";
    ctx.fillText(artist, pad, H - barH * 0.14);
  }

  ctx.fillStyle = "rgba(255,255,255,0.18)";
  ctx.font = `600 ${Math.round(H * 0.042)}px sans-serif`;
  ctx.textAlign = "right";
  ctx.textBaseline = "alphabetic";
  ctx.fillText("UPPER VIBE MEDIA", W * 0.97, H * 0.97);
  ctx.textAlign = "left";
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function MobileMediaControls({ coverUrl, className = "" }) {
  const { currentTrack, audioRef } = usePlayer();

  const [visible, setVisible]     = useState(false);
  const [pipActive, setPipActive] = useState(false);
  const [toast, setToast]         = useState("");

  const hideTimerRef  = useRef(null);
  const toastTimerRef = useRef(null);
  const canvasRef     = useRef(null);
  const videoRef      = useRef(null);  // hidden video — AirPlay & PiP on iOS
  const rafRef        = useRef(null);
  const coverImgRef   = useRef(null);

  // Compute env once (stable across renders)
  const { isIOS, isMobile, supportsAirPlayAPI, supportsPiPAPI } = getEnv();

  // ── Debug log on mount ────────────────────────────────────────────────────
  useEffect(() => {
    const ua = navigator.userAgent || "";
    const isIOScheck = /iPhone|iPad|iPod/i.test(ua);
    const isMobileCheck = isIOScheck || /Android/i.test(ua) || navigator.maxTouchPoints > 0;
    console.log("[MobileMediaControls] 🔍 Environment:", {
      isMobile: isMobileCheck,
      isIOS: isIOScheck,
      supportsPiP: "pictureInPictureEnabled" in document ? document.pictureInPictureEnabled : false,
      supportsAirPlay: typeof window.WebKitPlaybackTargetAvailabilityEvent !== "undefined",
      userAgent: ua.slice(0, 80),
    });
  }, []);

  useEffect(() => {
    console.log("[MobileMediaControls] 🎛 State:", {
      controlsVisible: visible,
      pipActive,
      hasTrack: !!currentTrack,
      trackTitle: currentTrack?.title,
    });
  }, [visible, pipActive, currentTrack]);

  // ── Only render on mobile ─────────────────────────────────────────────────
  if (!isMobile || !currentTrack) return null;

  // ── AirPlay video element setup ───────────────────────────────────────────
  // eslint-disable-next-line react-hooks/rules-of-hooks
  useEffect(() => {
    // Create a tiny hidden video element that AirPlay can attach to on iOS.
    // Must be in the DOM before webkitShowPlaybackTargetPicker is called.
    if (!isIOS && !supportsAirPlayAPI) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width  = PIP_W;
    canvas.height = PIP_H;

    // Draw one static frame immediately so the video has content
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#06060e";
    ctx.fillRect(0, 0, PIP_W, PIP_H);

    let video = videoRef.current;
    if (!video) {
      video = document.createElement("video");
      video.muted        = true;
      video.playsInline  = true;   // Required on iOS to not go fullscreen
      video.setAttribute("playsinline", "");
      video.setAttribute("webkit-playsinline", "");
      video.style.cssText = "position:fixed;top:-9999px;left:-9999px;width:1px;height:1px;opacity:0.001;pointer-events:none;";
      document.body.appendChild(video);
      videoRef.current = video;
      console.log("[MobileMediaControls] ✅ Hidden video element created for AirPlay/PiP");
    }

    // Feed canvas stream to the video
    try {
      const stream = canvas.captureStream ? canvas.captureStream(15) : null;
      if (stream) {
        video.srcObject = stream;
        video.play().catch(() => {});
        console.log("[MobileMediaControls] ✅ Canvas stream attached to video");
      } else {
        console.log("[MobileMediaControls] ⚠️ captureStream not available (iOS Safari)");
      }
    } catch (err) {
      console.log("[MobileMediaControls] ⚠️ captureStream error:", err.message);
    }

    return () => {
      if (videoRef.current) {
        videoRef.current.remove();
        videoRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Cover image preload ───────────────────────────────────────────────────
  const imgSrc = coverUrl || currentTrack?.cover_url;
  // eslint-disable-next-line react-hooks/rules-of-hooks
  useEffect(() => {
    if (!imgSrc) { coverImgRef.current = null; return; }
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = imgSrc;
    img.onload = () => { coverImgRef.current = img; };
  }, [imgSrc]);

  // ── Show / auto-hide ───────────────────────────────────────────────────────
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const showControls = useCallback(() => {
    setVisible(true);
    clearTimeout(hideTimerRef.current);
    hideTimerRef.current = setTimeout(() => setVisible(false), 3000);
  }, []);

  // eslint-disable-next-line react-hooks/rules-of-hooks
  useEffect(() => () => {
    clearTimeout(hideTimerRef.current);
    clearTimeout(toastTimerRef.current);
  }, []);

  // ── PiP RAF loop ──────────────────────────────────────────────────────────
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const stopLoop = useCallback(() => {
    if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
  }, []);

  // eslint-disable-next-line react-hooks/rules-of-hooks
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

  // eslint-disable-next-line react-hooks/rules-of-hooks
  useEffect(() => { if (pipActive) startLoop(); }, [currentTrack, pipActive, startLoop]);
  // eslint-disable-next-line react-hooks/rules-of-hooks
  useEffect(() => { if (!pipActive) stopLoop(); }, [pipActive, stopLoop]);

  // eslint-disable-next-line react-hooks/rules-of-hooks
  useEffect(() => {
    const onLeave = () => setPipActive(false);
    document.addEventListener("leavepictureinpicture", onLeave);
    return () => document.removeEventListener("leavepictureinpicture", onLeave);
  }, []);

  // eslint-disable-next-line react-hooks/rules-of-hooks
  useEffect(() => {
    return () => {
      stopLoop();
      if (document.pictureInPictureElement) document.exitPictureInPicture().catch(() => {});
    };
  }, [stopLoop]);

  // ── Show toast ────────────────────────────────────────────────────────────
  const showToast = (msg) => {
    setToast(msg);
    clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToast(""), 2500);
  };

  // ── AirPlay handler ───────────────────────────────────────────────────────
  const handleAirPlay = (e) => {
    e.stopPropagation();
    showControls(); // reset auto-hide timer

    console.log("[MobileMediaControls] 📺 AirPlay tapped", {
      supportsAirPlayAPI,
      videoRef: !!videoRef.current,
      audioRef: !!audioRef?.current,
    });

    // Try video element first (required on iOS)
    const video = videoRef.current;
    if (video?.webkitShowPlaybackTargetPicker) {
      video.webkitShowPlaybackTargetPicker();
      console.log("[MobileMediaControls] ✅ AirPlay picker shown via video element");
      return;
    }
    // Fallback: try audio element
    const audio = audioRef?.current;
    if (audio?.webkitShowPlaybackTargetPicker) {
      audio.webkitShowPlaybackTargetPicker();
      console.log("[MobileMediaControls] ✅ AirPlay picker shown via audio element");
      return;
    }
    console.log("[MobileMediaControls] ⚠️ AirPlay not supported on this device");
    showToast("AirPlay not supported on this device");
  };

  // ── PiP handler ───────────────────────────────────────────────────────────
  const handlePiP = async (e) => {
    e.stopPropagation();
    showControls();

    console.log("[MobileMediaControls] 📱 PiP tapped", {
      supportsPiPAPI,
      isIOS,
      videoRef: !!videoRef.current,
    });

    if (!supportsPiPAPI) {
      console.log("[MobileMediaControls] ⚠️ PiP not supported");
      showToast("Picture-in-Picture not supported on this device");
      return;
    }

    if (document.pictureInPictureElement) {
      await document.exitPictureInPicture().catch(() => {});
      setPipActive(false);
      return;
    }

    // Ensure canvas has content before requesting PiP
    const canvas = canvasRef.current;
    if (!canvas) { showToast("PiP unavailable"); return; }
    canvas.width  = PIP_W;
    canvas.height = PIP_H;
    startLoop(); // draw first frame

    let video = videoRef.current;
    if (!video) {
      video = document.createElement("video");
      video.muted       = true;
      video.playsInline = true;
      video.setAttribute("playsinline", "");
      video.style.cssText = "position:fixed;top:-9999px;left:-9999px;width:1px;height:1px;opacity:0.001;pointer-events:none;";
      document.body.appendChild(video);
      videoRef.current = video;
    }

    try {
      const stream = canvas.captureStream(30);
      video.srcObject = stream;
      await video.play();
      await video.requestPictureInPicture();
      setPipActive(true);
      console.log("[MobileMediaControls] ✅ PiP started");
      video.addEventListener("leavepictureinpicture", () => setPipActive(false), { once: true });
    } catch (err) {
      console.warn("[MobileMediaControls] ⚠️ PiP failed:", err.name, err.message);
      stopLoop();
      showToast("Picture-in-Picture not available");
    }
  };

  return (
    <>
      {/* Hidden canvas — feeds the hidden video for AirPlay & PiP */}
      <canvas ref={canvasRef} style={{ display: "none" }} />

      {/* Full-area touch capture overlay */}
      <div
        className={`absolute inset-0 z-20 ${className}`}
        onTouchStart={showControls}
        onClick={showControls}
        style={{ touchAction: "manipulation" }}
      >
        {/* Top bar — slides in when visible */}
        <div
          className="absolute top-0 left-0 right-0 flex items-center gap-2 px-3 pt-3 pb-8"
          style={{
            opacity: visible ? 1 : 0,
            transform: visible ? "translateY(0)" : "translateY(-6px)",
            transition: "opacity 0.25s ease, transform 0.25s ease",
            pointerEvents: visible ? "auto" : "none",
            background: "linear-gradient(180deg, rgba(0,0,0,0.7) 0%, transparent 100%)",
          }}
        >
          {/* PiP button */}
          <button
            onTouchStart={(e) => e.stopPropagation()}
            onClick={handlePiP}
            title={pipActive ? "Exit Picture-in-Picture" : "Picture-in-Picture"}
            className="flex items-center justify-center rounded-xl transition-all active:scale-90"
            style={{
              width: 40,
              height: 40,
              background: pipActive ? "rgba(0,200,220,0.35)" : "rgba(0,0,0,0.55)",
              border: `1.5px solid ${pipActive ? "rgba(0,200,220,0.8)" : "rgba(255,255,255,0.3)"}`,
              opacity: supportsPiPAPI ? 1 : 0.45,
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="3" width="20" height="14" rx="2" />
              <rect x="12" y="11" width="9" height="6" rx="1" fill="white" stroke="none" opacity="0.85" />
            </svg>
          </button>

          {/* AirPlay / TV button */}
          <button
            onTouchStart={(e) => e.stopPropagation()}
            onClick={handleAirPlay}
            title="AirPlay to TV / Speaker"
            className="flex items-center justify-center rounded-xl transition-all active:scale-90"
            style={{
              width: 40,
              height: 40,
              background: "rgba(0,0,0,0.55)",
              border: "1.5px solid rgba(255,255,255,0.3)",
              opacity: supportsAirPlayAPI ? 1 : 0.45,
            }}
          >
            {/* AirPlay / TV icon */}
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12H3l9-9 9 9h-2" />
              <rect x="2" y="14" width="20" height="8" rx="2" />
              <path d="M8 22l4-4 4 4" />
            </svg>
          </button>
        </div>

        {/* Toast message */}
        {toast !== "" && (
          <div
            className="absolute top-14 left-3 right-3 flex items-center justify-center"
            style={{ pointerEvents: "none" }}
          >
            <div
              className="px-3 py-1.5 rounded-xl text-xs text-white/80 text-center"
              style={{
                background: "rgba(0,0,0,0.75)",
                border: "1px solid rgba(255,255,255,0.15)",
                backdropFilter: "blur(8px)",
              }}
            >
              {toast}
            </div>
          </div>
        )}
      </div>
    </>
  );
}