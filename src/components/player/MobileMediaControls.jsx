import React, { useState, useEffect, useRef, useCallback } from "react";
import { usePlayer } from "../../context/PlayerContext";

/**
 * MobileMediaControls — Real native PiP + AirPlay for mobile
 *
 * HOW IPHONE PiP WORKS (the only reliable method):
 * ─────────────────────────────────────────────────
 * iPhone Safari supports PiP only via a real <video> element with a real src.
 * canvas.captureStream() → srcObject is NOT supported on iOS Safari.
 *
 * Our approach:
 * 1. Use MediaRecorder to record a short canvas animation into a WebM/MP4 blob
 * 2. Set video.src = URL.createObjectURL(blob)
 * 3. video.loop = true + requestPictureInPicture()
 *
 * MediaRecorder + WebM is supported in iOS 17.2+ Safari.
 * For older iOS, we show the toast fallback.
 *
 * Audio stays on the existing global audio element — no duplication.
 * PiP video is muted — audio comes from the separate audio element.
 */

const PIP_W = 480;
const PIP_H = 270; // 16:9

const PiPIcon = ({ active }) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
    <rect x="1" y="4" width="22" height="16" rx="2" stroke="white" strokeWidth="2" />
    <rect x="12" y="12" width="9" height="6" rx="1.5" fill={active ? "#00C9E0" : "white"} />
  </svg>
);

const AirPlayIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
    <path d="M5 17H3a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h18a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-2"
      stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <polygon points="12 15 17 21 7 21" fill="white" />
  </svg>
);

// Draw a single cover-art frame onto canvas
function drawCoverFrame(ctx, coverImg, track, W, H, tick) {
  // Subtle slow pulse scale (0.98 → 1.0) for the "motion" requirement
  const scale = 0.98 + 0.02 * Math.abs(Math.sin(tick * 0.03));

  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = "#06060e";
  ctx.fillRect(0, 0, W, H);

  if (coverImg?.complete && coverImg.naturalWidth > 0) {
    const size = Math.min(W, H) * 0.65 * scale;
    const x = (W - size) / 2;
    const y = (H - size) / 2 - H * 0.04;
    ctx.save();
    ctx.shadowColor = "rgba(0,180,200,0.35)";
    ctx.shadowBlur = 24 * scale;
    ctx.drawImage(coverImg, x, y, size, size);
    ctx.restore();
  } else {
    ctx.fillStyle = "rgba(0,200,220,0.15)";
    ctx.font = `${H * 0.3}px sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("♪", W / 2, H / 2);
    ctx.textBaseline = "alphabetic";
  }

  // Bottom bar
  if (track) {
    const barH = H * 0.26, barY = H - barH;
    const grd = ctx.createLinearGradient(0, barY, 0, H);
    grd.addColorStop(0, "rgba(0,0,0,0)");
    grd.addColorStop(0.3, "rgba(0,0,0,0.8)");
    grd.addColorStop(1, "rgba(0,0,0,0.92)");
    ctx.fillStyle = grd;
    ctx.fillRect(0, barY, W, barH);

    const pad = W * 0.04, maxW = W - pad * 2;
    ctx.fillStyle = "rgba(255,255,255,0.95)";
    ctx.font = `bold ${Math.round(H * 0.08)}px sans-serif`;
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
    let title = track.title || "Upper Vibe Media";
    while (ctx.measureText(title).width > maxW && title.length > 4) title = title.slice(0, -2) + "…";
    ctx.fillText(title, pad, H - barH * 0.38);

    ctx.fillStyle = "rgba(0,200,220,0.8)";
    ctx.font = `${Math.round(H * 0.06)}px sans-serif`;
    let artist = track.artist_display || track.artist || "Upper Vibe Media";
    while (ctx.measureText(artist).width > maxW && artist.length > 4) artist = artist.slice(0, -2) + "…";
    ctx.fillText(artist, pad, H - barH * 0.1);
  }
}

// Record N frames from canvas into a video blob via MediaRecorder
function recordCanvasToBlob(canvas, durationMs = 3000, fps = 24) {
  return new Promise((resolve, reject) => {
    if (!canvas.captureStream) { reject(new Error("captureStream not supported")); return; }

    const stream = canvas.captureStream(fps);
    const mimeTypes = ["video/mp4", "video/webm;codecs=vp9", "video/webm;codecs=vp8", "video/webm"];
    const mime = mimeTypes.find((m) => MediaRecorder.isTypeSupported(m)) || "";

    if (!mime) { reject(new Error("No supported video MIME type")); return; }

    const recorder = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 800000 });
    const chunks = [];
    recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };
    recorder.onstop = () => resolve(new Blob(chunks, { type: mime }));
    recorder.onerror = (e) => reject(e.error || new Error("MediaRecorder error"));
    recorder.start();
    setTimeout(() => { try { recorder.stop(); } catch {} }, durationMs);
  });
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function MobileMediaControls({ coverUrl, className = "" }) {
  const { currentTrack, audioRef } = usePlayer();

  // ALL hooks before any conditional return
  const [isMobile, setIsMobile]         = useState(false);
  const [isIOS, setIsIOS]               = useState(false);
  const [supportsAP, setSupportsAP]     = useState(false);
  const [visible, setVisible]           = useState(false);
  const [pipActive, setPipActive]       = useState(false);
  const [pipLoading, setPipLoading]     = useState(false);
  const [toast, setToast]               = useState("");

  const hideTimerRef  = useRef(null);
  const toastTimerRef = useRef(null);
  const canvasRef     = useRef(null);
  const pipVideoRef   = useRef(null);
  const blobUrlRef    = useRef(null); // current objectURL — revoke when done
  const coverImgRef   = useRef(null);
  const rafRef        = useRef(null);
  const tickRef       = useRef(0);

  // ── Device detection ──────────────────────────────────────────────────────
  useEffect(() => {
    const ua = navigator.userAgent || "";
    const ios    = /iPhone|iPad|iPod/i.test(ua);
    const mobile = ios || /Android/i.test(ua) || navigator.maxTouchPoints > 0;
    const ap     = typeof window.WebKitPlaybackTargetAvailabilityEvent !== "undefined";
    setIsMobile(mobile);
    setIsIOS(ios);
    setSupportsAP(ap);
    console.log("[PiP] 🔍", { isMobile: mobile, isIOS: ios, supportsAirPlay: ap, ua: ua.slice(0, 80) });
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

  // ── Toast ─────────────────────────────────────────────────────────────────
  const showToast = useCallback((msg) => {
    setToast(msg);
    clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToast(""), 3500);
  }, []);

  // ── Canvas animation loop (feeds the hidden video while recording) ─────────
  const stopLoop = useCallback(() => {
    if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
  }, []);

  const startLoop = useCallback(() => {
    stopLoop();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const loop = () => {
      tickRef.current += 1;
      drawCoverFrame(ctx, coverImgRef.current, currentTrack, PIP_W, PIP_H, tickRef.current);
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
  }, [currentTrack, stopLoop]);

  // ── PiP lifecycle: exit + cleanup on unmount ──────────────────────────────
  useEffect(() => {
    const onLeave = () => {
      setPipActive(false);
      stopLoop();
      console.log("[PiP] 📴 Exited");
    };
    document.addEventListener("leavepictureinpicture", onLeave);
    return () => document.removeEventListener("leavepictureinpicture", onLeave);
  }, [stopLoop]);

  useEffect(() => () => {
    stopLoop();
    if (document.pictureInPictureElement) document.exitPictureInPicture().catch(() => {});
    if (blobUrlRef.current) { URL.revokeObjectURL(blobUrlRef.current); blobUrlRef.current = null; }
    if (pipVideoRef.current) { pipVideoRef.current.remove(); pipVideoRef.current = null; }
  }, [stopLoop]);

  // ── EARLY RETURN after all hooks ──────────────────────────────────────────
  if (!isMobile || !currentTrack) return null;

  // ── AirPlay handler ───────────────────────────────────────────────────────
  const handleAirPlay = (e) => {
    e.stopPropagation();
    showControls();
    const audio = audioRef?.current;
    if (audio?.webkitShowPlaybackTargetPicker) {
      audio.webkitShowPlaybackTargetPicker();
      console.log("[PiP] ✅ AirPlay picker opened");
    } else {
      showToast("AirPlay not available in this browser");
    }
  };

  // ── PiP handler ───────────────────────────────────────────────────────────
  const handlePiP = async (e) => {
    e.stopPropagation();
    showControls();

    // Exit if already in PiP
    if (document.pictureInPictureElement) {
      await document.exitPictureInPicture().catch(() => {});
      setPipActive(false);
      stopLoop();
      return;
    }

    setPipLoading(true);
    console.log("[PiP] 📱 Starting PiP, isIOS:", isIOS);

    try {
      // ── Step 1: Prepare canvas ──────────────────────────────────────────
      const canvas = canvasRef.current;
      canvas.width  = PIP_W;
      canvas.height = PIP_H;

      // Draw first static frame
      const ctx = canvas.getContext("2d");
      drawCoverFrame(ctx, coverImgRef.current, currentTrack, PIP_W, PIP_H, 0);

      // ── Step 2: Create / reuse the PiP video element ────────────────────
      let video = pipVideoRef.current;
      if (!video) {
        video = document.createElement("video");
        video.loop        = true;
        video.muted       = true; // audio stays on global audio element
        video.playsInline = true;
        video.setAttribute("playsinline", "");
        video.setAttribute("webkit-playsinline", "");
        video.setAttribute("x-webkit-airplay", "deny"); // prevent AirPlay hijack on this muted video
        // Position: tiny but IN the viewport (some browsers need it in viewport for PiP)
        video.style.cssText = [
          "position:fixed",
          "bottom:0",
          "right:0",
          "width:2px",
          "height:2px",
          "opacity:0.001",
          "pointer-events:none",
          "z-index:-1",
        ].join(";");
        document.body.appendChild(video);
        pipVideoRef.current = video;
        console.log("[PiP] ✅ Video element created");
      }

      // ── Step 3: Feed canvas to video ────────────────────────────────────
      // iOS Safari 17.2+ supports MediaRecorder → WebM → video.src
      // Older iOS / other browsers use canvas.captureStream() → srcObject
      let videoReady = false;

      // Method A: captureStream (Chrome/Android/desktop, iOS 18+)
      if (canvas.captureStream && !isIOS) {
        const stream = canvas.captureStream(24);
        video.srcObject = stream;
        startLoop(); // animate while in PiP
        await video.play();
        videoReady = true;
        console.log("[PiP] ✅ Method A: captureStream");
      }

      // Method B: MediaRecorder → blob → video.src (iOS 17.2+ Safari)
      if (!videoReady && canvas.captureStream && typeof MediaRecorder !== "undefined") {
        console.log("[PiP] ⏳ Method B: recording blob...");
        startLoop(); // animate during recording
        try {
          const blob = await recordCanvasToBlob(canvas, 2500, 24);
          stopLoop();
          if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current);
          blobUrlRef.current = URL.createObjectURL(blob);
          video.srcObject = null;
          video.src       = blobUrlRef.current;
          video.loop      = true;
          await video.load();
          await video.play();
          videoReady = true;
          console.log("[PiP] ✅ Method B: blob recorded, size:", blob.size);
        } catch (recErr) {
          stopLoop();
          console.log("[PiP] ⚠️ Method B failed:", recErr.message);
        }
      }

      // Method C: static image as video via canvas → single frame blob
      if (!videoReady) {
        console.log("[PiP] ⏳ Method C: static canvas blob...");
        try {
          // Draw a fresh frame
          drawCoverFrame(ctx, coverImgRef.current, currentTrack, PIP_W, PIP_H, 0);
          const blob = await new Promise((res, rej) =>
            canvas.toBlob((b) => b ? res(b) : rej(new Error("toBlob failed")), "image/png")
          );
          // We can't make a video from just an image without MediaRecorder
          // So this method just signals we tried everything
          void blob;
          throw new Error("Cannot create video from image alone");
        } catch (imgErr) {
          console.log("[PiP] ⚠️ Method C failed:", imgErr.message);
        }
      }

      if (!videoReady) {
        throw new Error(
          isIOS
            ? "PiP requires iOS 17.2+ Safari. Update your iPhone and try again."
            : "Video setup failed — PiP not available on this browser."
        );
      }

      // ── Step 4: Request PiP ─────────────────────────────────────────────
      if (!("requestPictureInPicture" in video)) {
        throw new Error("requestPictureInPicture not available");
      }

      await video.requestPictureInPicture();
      setPipActive(true);
      console.log("[PiP] ✅ PiP window opened!");

      video.addEventListener("leavepictureinpicture", () => {
        setPipActive(false);
        stopLoop();
        console.log("[PiP] 📴 User closed PiP window");
      }, { once: true });

    } catch (err) {
      console.warn("[PiP] ⚠️ Failed:", err.name, "-", err.message);
      stopLoop();
      showToast(err.message.length < 80 ? err.message : "Picture-in-Picture not available on this device");
    } finally {
      setPipLoading(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <>
      {/* Off-screen canvas — source for PiP video */}
      <canvas
        ref={canvasRef}
        width={PIP_W}
        height={PIP_H}
        style={{ position: "absolute", top: -9999, left: -9999, width: 1, height: 1, opacity: 0, pointerEvents: "none" }}
      />

      {/* Full-area touch listener */}
      <div
        className={`absolute inset-0 z-20 ${className}`}
        onTouchStart={showControls}
        onClick={showControls}
        style={{ touchAction: "manipulation" }}
      >
        {/* Top control bar */}
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
            background: "linear-gradient(180deg, rgba(0,0,0,0.75) 0%, transparent 100%)",
          }}
        >
          {/* PiP button */}
          <button
            onTouchStart={(e) => e.stopPropagation()}
            onClick={handlePiP}
            disabled={pipLoading}
            title={pipActive ? "Exit Picture-in-Picture" : "Picture-in-Picture"}
            style={{
              width: 44, height: 44, borderRadius: 12,
              display: "flex", alignItems: "center", justifyContent: "center",
              background: pipActive ? "rgba(0,201,224,0.3)" : "rgba(0,0,0,0.6)",
              border: `1.5px solid ${pipActive ? "rgba(0,201,224,0.8)" : "rgba(255,255,255,0.3)"}`,
              opacity: pipLoading ? 0.5 : 1,
              cursor: pipLoading ? "default" : "pointer",
              WebkitTapHighlightColor: "transparent",
              flexShrink: 0,
              transition: "opacity 0.2s",
            }}
          >
            {pipLoading
              ? <div style={{ width: 16, height: 16, border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "white", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
              : <PiPIcon active={pipActive} />
            }
          </button>

          {/* AirPlay button */}
          <button
            onTouchStart={(e) => e.stopPropagation()}
            onClick={handleAirPlay}
            title="AirPlay"
            style={{
              width: 44, height: 44, borderRadius: 12,
              display: "flex", alignItems: "center", justifyContent: "center",
              background: "rgba(0,0,0,0.6)",
              border: "1.5px solid rgba(255,255,255,0.3)",
              opacity: supportsAP ? 1 : 0.4,
              cursor: "pointer",
              WebkitTapHighlightColor: "transparent",
              flexShrink: 0,
            }}
          >
            <AirPlayIcon />
          </button>

          <span style={{ fontSize: 10, color: "rgba(255,255,255,0.38)", letterSpacing: "0.06em", userSelect: "none" }}>
            {pipActive ? "PiP active" : "PiP · AirPlay"}
          </span>
        </div>

        {/* Toast */}
        {toast !== "" && (
          <div style={{ position: "absolute", top: 62, left: 12, right: 12, display: "flex", justifyContent: "center", pointerEvents: "none", zIndex: 30 }}>
            <div style={{
              padding: "8px 16px", borderRadius: 12, fontSize: 12,
              color: "rgba(255,255,255,0.88)",
              background: "rgba(0,0,0,0.82)",
              border: "1px solid rgba(255,255,255,0.14)",
              backdropFilter: "blur(10px)",
              WebkitBackdropFilter: "blur(10px)",
              textAlign: "center", maxWidth: 290, whiteSpace: "pre-line", lineHeight: 1.5,
            }}>
              {toast}
            </div>
          </div>
        )}
      </div>

      {/* Spinner keyframe */}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </>
  );
}