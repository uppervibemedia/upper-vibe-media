import React, { useState, useEffect, useRef, useCallback } from "react";
import { usePlayer } from "../../context/PlayerContext";

/**
 * MobileMediaControls — Native PiP + AirPlay for mobile
 *
 * KEY FIX for "not triggered by user activation":
 * ─────────────────────────────────────────────────
 * requestPictureInPicture() MUST be called in the SAME synchronous call stack
 * as the user gesture (tap). Any await before it breaks this.
 *
 * Strategy: Pre-bake the video whenever the track changes (background work),
 * so by the time the user taps PiP the video is already loaded at readyState >= 2.
 * The tap handler then calls requestPictureInPicture() IMMEDIATELY — no async gap.
 *
 * iOS Safari PiP path (iOS 17.2+ with MediaRecorder/WebM support):
 *   1. On track change → record 3s canvas animation blob in background
 *   2. Load blob into looping hidden <video>
 *   3. User taps → video.requestPictureInPicture() called synchronously
 *
 * Desktop/Android:
 *   1. On track change → canvas.captureStream() → video.srcObject → video.play()
 *   2. User taps → requestPictureInPicture() called synchronously
 *
 * Audio stays on the global audio element — NEVER touched here.
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

// Draw one cover-art frame with subtle pulse
function drawCoverFrame(ctx, coverImg, track, W, H, tick) {
  const scale = 0.97 + 0.03 * Math.abs(Math.sin((tick || 0) * 0.025));
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = "#06060e";
  ctx.fillRect(0, 0, W, H);

  if (coverImg?.complete && coverImg.naturalWidth > 0) {
    const size = Math.min(W, H) * 0.62 * scale;
    const x = (W - size) / 2;
    const y = (H - size) / 2 - H * 0.04;
    ctx.save();
    ctx.shadowColor = "rgba(0,180,200,0.3)";
    ctx.shadowBlur = 20;
    ctx.drawImage(coverImg, x, y, size, size);
    ctx.restore();
  } else {
    ctx.fillStyle = "rgba(0,200,220,0.12)";
    ctx.font = `${H * 0.3}px sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("♪", W / 2, H / 2);
    ctx.textBaseline = "alphabetic";
  }

  if (track) {
    const barH = H * 0.26, barY = H - barH;
    const grd = ctx.createLinearGradient(0, barY, 0, H);
    grd.addColorStop(0, "rgba(0,0,0,0)");
    grd.addColorStop(0.3, "rgba(0,0,0,0.82)");
    grd.addColorStop(1, "rgba(0,0,0,0.94)");
    ctx.fillStyle = grd;
    ctx.fillRect(0, barY, W, barH);

    const pad = W * 0.04, maxW = W - pad * 2;
    ctx.fillStyle = "rgba(255,255,255,0.95)";
    ctx.font = `bold ${Math.round(H * 0.079)}px sans-serif`;
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
    let title = track.title || "Upper Vibe Media";
    while (ctx.measureText(title).width > maxW && title.length > 4) title = title.slice(0, -2) + "…";
    ctx.fillText(title, pad, H - barH * 0.38);

    ctx.fillStyle = "rgba(0,200,220,0.85)";
    ctx.font = `${Math.round(H * 0.06)}px sans-serif`;
    let artist = track.artist_display || track.artist || "Upper Vibe Media";
    while (ctx.measureText(artist).width > maxW && artist.length > 4) artist = artist.slice(0, -2) + "…";
    ctx.fillText(artist, pad, H - barH * 0.1);
  }
}

// Record N frames from an animated canvas into a blob (iOS MediaRecorder path)
function recordCanvasToBlob(canvas, coverImg, track, W, H, durationMs = 3000, fps = 20) {
  return new Promise((resolve, reject) => {
    if (!canvas.captureStream) { reject(new Error("captureStream not supported")); return; }

    const mimeTypes = ["video/webm;codecs=vp8", "video/webm;codecs=vp9", "video/webm", "video/mp4"];
    const mime = mimeTypes.find((m) => {
      try { return MediaRecorder.isTypeSupported(m); } catch { return false; }
    });
    if (!mime) { reject(new Error("No supported MIME")); return; }

    const ctx = canvas.getContext("2d");
    let tick = 0;
    const interval = setInterval(() => {
      tick++;
      drawCoverFrame(ctx, coverImg, track, W, H, tick);
    }, 1000 / fps);

    const stream = canvas.captureStream(fps);
    const recorder = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 600000 });
    const chunks = [];
    recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };
    recorder.onstop = () => {
      clearInterval(interval);
      resolve(new Blob(chunks, { type: mime }));
    };
    recorder.onerror = (e) => { clearInterval(interval); reject(e.error || new Error("Recorder error")); };
    recorder.start();
    setTimeout(() => { try { recorder.stop(); } catch {} }, durationMs);
  });
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function MobileMediaControls({ coverUrl, className = "" }) {
  const { currentTrack, audioRef, isPlaying, togglePlay } = usePlayer();

  // All hooks must be declared unconditionally
  const [isMobile, setIsMobile]     = useState(false);
  const [isIOS, setIsIOS]           = useState(false);
  const [supportsAP, setSupportsAP] = useState(false);
  const [visible, setVisible]       = useState(false);
  const [pipActive, setPipActive]   = useState(false);
  const [pipReady, setPipReady]     = useState(false);   // video is preloaded and ready
  const [pipPrepping, setPipPrepping] = useState(false); // background prep in progress
  const [toast, setToast]           = useState("");

  const hideTimerRef    = useRef(null);
  const toastTimerRef   = useRef(null);
  const canvasRef       = useRef(null);
  const pipVideoRef     = useRef(null);
  const blobUrlRef      = useRef(null);
  const coverImgRef     = useRef(null);
  const rafRef          = useRef(null);
  const tickRef         = useRef(0);
  const prepAbortRef    = useRef(false); // cancel prep if track changes mid-record
  const [videoReady, setVideoReady] = useState(false); // triggers bridge effect after ensureVideo

  // ── Device detection ──────────────────────────────────────────────────────
  useEffect(() => {
    const ua = navigator.userAgent || "";
    const ios    = /iPhone|iPad|iPod/i.test(ua);
    const mobile = ios || /Android/i.test(ua) || navigator.maxTouchPoints > 0;
    const ap     = typeof window.WebKitPlaybackTargetAvailabilityEvent !== "undefined";
    setIsMobile(mobile);
    setIsIOS(ios);
    setSupportsAP(ap);
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

  // ── Canvas RAF loop (for captureStream path while PiP is open) ────────────
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

  // ── Ensure PiP video element exists ──────────────────────────────────────
  const ensureVideo = useCallback(() => {
    if (pipVideoRef.current) return pipVideoRef.current;
    const video = document.createElement("video");
    video.loop        = true;
    video.muted       = true;
    video.playsInline = true;
    video.setAttribute("playsinline", "");
    video.setAttribute("webkit-playsinline", "");
    // Must be in the DOM and tiny-but-visible for some browsers to allow PiP
    video.style.cssText = "position:fixed;bottom:0;right:0;width:1px;height:1px;opacity:0.001;pointer-events:none;z-index:-1;";
    document.body.appendChild(video);
    pipVideoRef.current = video;
    setVideoReady(true); // signal that the bridge effect can now attach listeners
    return video;
  }, []);

  // ── PRE-BAKE: prepare video in background whenever track or device changes ─
  useEffect(() => {
    if (!isMobile || !currentTrack) return;

    // Cancel any in-progress prep
    prepAbortRef.current = true;
    setPipReady(false);
    setPipPrepping(true);

    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width  = PIP_W;
    canvas.height = PIP_H;

    const abortToken = {}; // unique per prep run
    prepAbortRef.current = abortToken;

    const prep = async () => {
      // Wait a tick for cover image to load
      await new Promise((r) => setTimeout(r, 300));
      if (prepAbortRef.current !== abortToken) return; // aborted

      const video = ensureVideo();

      // ── Desktop/Android: captureStream (synchronous, no recording needed) ──
      if (!isIOS && canvas.captureStream) {
        try {
          // Draw first frame
          drawCoverFrame(canvas.getContext("2d"), coverImgRef.current, currentTrack, PIP_W, PIP_H, 0);
          video.srcObject = canvas.captureStream(24);
          video.src = ""; // clear any previous blob src
          await video.play();
          if (prepAbortRef.current !== abortToken) return;
          setPipReady(true);
          setPipPrepping(false);
          console.log("[PiP] ✅ Desktop: captureStream ready");
          return;
        } catch (e) {
          console.warn("[PiP] captureStream prep failed:", e.message);
        }
      }

      // ── iOS / fallback: MediaRecorder → blob ──────────────────────────────
      if (typeof MediaRecorder === "undefined") {
        setPipPrepping(false);
        console.log("[PiP] MediaRecorder not available");
        return;
      }

      try {
        console.log("[PiP] ⏳ Recording blob for iOS...");
        const blob = await recordCanvasToBlob(
          canvas, coverImgRef.current, currentTrack, PIP_W, PIP_H, 3000, 20
        );
        if (prepAbortRef.current !== abortToken) return; // aborted mid-record

        // Revoke old blob
        if (blobUrlRef.current) { URL.revokeObjectURL(blobUrlRef.current); blobUrlRef.current = null; }
        blobUrlRef.current = URL.createObjectURL(blob);

        video.srcObject = null;
        video.src       = blobUrlRef.current;
        video.loop      = true;
        await video.load();
        // play() so readyState >= 2 — required for requestPictureInPicture
        await video.play();
        video.pause(); // pause immediately (don't need it playing in bg)

        if (prepAbortRef.current !== abortToken) return;
        setPipReady(true);
        setPipPrepping(false);
        console.log("[PiP] ✅ iOS: blob ready, size:", blob.size, "readyState:", video.readyState);
      } catch (e) {
        if (prepAbortRef.current !== abortToken) return;
        setPipPrepping(false);
        console.warn("[PiP] Blob prep failed:", e.message);
      }
    };

    prep();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMobile, isIOS, currentTrack?.id, ensureVideo]);

  // ── Bridge PiP video play/pause → global audio ───────────────────────────
  // When PiP is open the user can tap play/pause IN the floating PiP window.
  // Those events fire on the hidden <video>, not the global <audio>.
  // We intercept them here and forward to the global audio element so that
  // PiP controls and the in-app player stay perfectly in sync.
  // We also prevent the video from ever loading/changing the song (it's visual-only).
  useEffect(() => {
    const video = pipVideoRef.current;
    if (!video) return;
    const audio = audioRef?.current;
    if (!audio) return;

    const onVideoPause = (e) => {
      // Only act when PiP is actually active — ignore background pauses
      if (!document.pictureInPictureElement) return;
      // Don't pause audio if audio is already paused
      if (!audio.paused) {
        audio.pause();
        console.log("[PiP] ⏸ PiP pause → global audio paused");
      }
    };

    const onVideoPlay = (e) => {
      if (!document.pictureInPictureElement) return;
      if (audio.paused) {
        audio.play().catch(() => {});
        console.log("[PiP] ▶️ PiP play → global audio resumed");
      }
    };

    video.addEventListener("pause", onVideoPause);
    video.addEventListener("play",  onVideoPlay);
    return () => {
      video.removeEventListener("pause", onVideoPause);
      video.removeEventListener("play",  onVideoPlay);
    };
  // Re-run when the video element is (re-)created or audioRef changes
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoReady, audioRef]);

  // ── Keep PiP video play/pause state mirrored from global audio ───────────
  // When the user pauses/resumes from lock screen or in-app controls WHILE PiP
  // is open, sync the video's visual state so PiP shows the correct icon.
  useEffect(() => {
    const video = pipVideoRef.current;
    if (!video || !document.pictureInPictureElement) return;
    if (isPlaying) {
      if (video.paused) video.play().catch(() => {});
    } else {
      if (!video.paused) video.pause();
    }
  }, [isPlaying, videoReady]);

  // ── PiP lifecycle listeners ───────────────────────────────────────────────
  useEffect(() => {
    const onLeave = () => { setPipActive(false); stopLoop(); };
    document.addEventListener("leavepictureinpicture", onLeave);
    return () => document.removeEventListener("leavepictureinpicture", onLeave);
  }, [stopLoop]);

  // ── Cleanup on unmount ────────────────────────────────────────────────────
  useEffect(() => () => {
    stopLoop();
    prepAbortRef.current = {}; // abort any ongoing prep
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
    } else {
      showToast("AirPlay not available in this browser");
    }
  };

  // ── PiP handler — called DIRECTLY from user tap ───────────────────────────
  // requestPictureInPicture() is called IMMEDIATELY, synchronously within this handler.
  // No awaits before the PiP call — this preserves the user activation.
  const handlePiP = (e) => {
    e.stopPropagation();
    showControls();

    // Exit if already active
    if (document.pictureInPictureElement) {
      document.exitPictureInPicture().catch(() => {});
      setPipActive(false);
      stopLoop();
      return;
    }

    const video = pipVideoRef.current;

    if (!video) {
      showToast("Player not ready yet. Start a song first.");
      return;
    }

    if (!("requestPictureInPicture" in video)) {
      showToast("Picture-in-Picture not supported on this device.");
      return;
    }

    if (!pipReady) {
      if (pipPrepping) {
        showToast("Preparing PiP... try again in a moment.");
      } else {
        showToast("PiP not available. Try updating your browser.");
      }
      return;
    }

    // ── SYNCHRONOUS: call PiP immediately — user activation is still valid ──
    // For captureStream path (desktop/Android): video is already playing
    // For blob path (iOS): video was played then paused — we resume it first
    const launch = () => {
      // Resume if paused (blob path)
      if (video.paused) {
        video.play().catch(() => {});
      }

      // For captureStream path, restart the animation loop
      if (!isIOS) {
        startLoop();
      }

      video.requestPictureInPicture()
        .then(() => {
          setPipActive(true);
          console.log("[PiP] ✅ PiP opened!");
          video.addEventListener("leavepictureinpicture", () => {
            setPipActive(false);
            stopLoop();
          }, { once: true });
        })
        .catch((err) => {
          console.warn("[PiP] ⚠️ requestPictureInPicture failed:", err.name, "-", err.message);
          stopLoop();
          showToast("Picture-in-Picture failed. Try playing the song first.");
        });
    };

    launch();
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <>
      {/* Off-screen canvas — used during background prep and live animation */}
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
            title={pipActive ? "Exit Picture-in-Picture" : "Picture-in-Picture"}
            style={{
              width: 44, height: 44, borderRadius: 12,
              display: "flex", alignItems: "center", justifyContent: "center",
              background: pipActive ? "rgba(0,201,224,0.28)" : "rgba(0,0,0,0.62)",
              border: `1.5px solid ${pipActive ? "rgba(0,201,224,0.8)" : "rgba(255,255,255,0.28)"}`,
              opacity: pipPrepping ? 0.55 : 1,
              cursor: "pointer",
              WebkitTapHighlightColor: "transparent",
              flexShrink: 0,
              transition: "opacity 0.2s",
              position: "relative",
            }}
          >
            <PiPIcon active={pipActive} />
            {/* Small ready indicator dot */}
            {pipReady && !pipActive && (
              <div style={{
                position: "absolute", bottom: 4, right: 4,
                width: 6, height: 6, borderRadius: "50%",
                background: "#00C9E0",
                boxShadow: "0 0 4px #00C9E0",
              }} />
            )}
            {pipPrepping && (
              <div style={{
                position: "absolute", bottom: 4, right: 4,
                width: 6, height: 6, borderRadius: "50%",
                background: "rgba(255,255,255,0.4)",
                animation: "uvPipPulse 1s ease-in-out infinite",
              }} />
            )}
          </button>

          {/* AirPlay button */}
          <button
            onTouchStart={(e) => e.stopPropagation()}
            onClick={handleAirPlay}
            title="AirPlay"
            style={{
              width: 44, height: 44, borderRadius: 12,
              display: "flex", alignItems: "center", justifyContent: "center",
              background: "rgba(0,0,0,0.62)",
              border: "1.5px solid rgba(255,255,255,0.28)",
              opacity: supportsAP ? 1 : 0.38,
              cursor: "pointer",
              WebkitTapHighlightColor: "transparent",
              flexShrink: 0,
            }}
          >
            <AirPlayIcon />
          </button>

          <span style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", letterSpacing: "0.06em", userSelect: "none" }}>
            {pipActive ? "PiP active" : pipPrepping ? "Preparing PiP..." : "PiP · AirPlay"}
          </span>
        </div>

        {/* Toast */}
        {toast !== "" && (
          <div style={{ position: "absolute", top: 62, left: 12, right: 12, display: "flex", justifyContent: "center", pointerEvents: "none", zIndex: 30 }}>
            <div style={{
              padding: "8px 16px", borderRadius: 12, fontSize: 12,
              color: "rgba(255,255,255,0.9)",
              background: "rgba(0,0,0,0.84)",
              border: "1px solid rgba(255,255,255,0.12)",
              backdropFilter: "blur(10px)",
              WebkitBackdropFilter: "blur(10px)",
              textAlign: "center", maxWidth: 290, whiteSpace: "pre-line", lineHeight: 1.5,
            }}>
              {toast}
            </div>
          </div>
        )}
      </div>

      {/* Animations */}
      <style>{`
        @keyframes uvPipPulse {
          0%, 100% { opacity: 0.3; transform: scale(0.8); }
          50%       { opacity: 1;   transform: scale(1.1); }
        }
      `}</style>
    </>
  );
}