import React, { useState, useEffect, useRef, useCallback } from "react";
import { usePlayer } from "../../context/PlayerContext";

/**
 * MobileMediaControls — PiP + AirPlay
 *
 * PiP ARCHITECTURE:
 * ─────────────────
 * The PiP window must show the real song progress, not a fake loop.
 *
 * Desktop/Android Chrome: audio.captureStream() → video.srcObject
 *   - The <video> plays the actual audio stream, so its currentTime === audio.currentTime
 *   - PiP progress bar is perfectly synced to the song
 *   - PiP play/pause controls the same audio element
 *
 * iOS Safari: audio.captureStream() is not supported on <audio>.
 *   - Fallback: canvas animation blob (visual only, not synced to audio time)
 *   - PiP play/pause events are bridged → global audio element
 *   - This is the best iOS allows without native app APIs
 *
 * KEY RULES:
 * - Never create a separate audio/video player for PiP
 * - PiP play/pause always calls setIsPlaying() via context, not audio directly
 * - Lock screen: paused on hide, manual resume on unlock (stability > forced bg play)
 * - AirPlay: only routes existing audio, never reloads src
 */

const PIP_W = 480;
const PIP_H = 270;

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

// Draw cover art + metadata onto a canvas (iOS fallback visual)
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

// iOS fallback: record canvas animation into a blob
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
    recorder.onstop = () => { clearInterval(interval); resolve(new Blob(chunks, { type: mime })); };
    recorder.onerror = (e) => { clearInterval(interval); reject(e.error || new Error("Recorder error")); };
    recorder.start();
    setTimeout(() => { try { recorder.stop(); } catch {} }, durationMs);
  });
}

export default function MobileMediaControls({ coverUrl, className = "" }) {
  const { currentTrack, audioRef, isPlaying, togglePlay } = usePlayer();

  const [isMobile, setIsMobile]         = useState(false);
  const [isIOS, setIsIOS]               = useState(false);
  const [supportsAP, setSupportsAP]     = useState(false);
  const [visible, setVisible]           = useState(false);
  const [pipActive, setPipActive]       = useState(false);
  const [pipReady, setPipReady]         = useState(false);
  const [pipPrepping, setPipPrepping]   = useState(false);
  const [toast, setToast]               = useState("");
  const [videoReady, setVideoReady]     = useState(false);

  const hideTimerRef  = useRef(null);
  const toastTimerRef = useRef(null);
  const canvasRef     = useRef(null);
  const pipVideoRef   = useRef(null);
  const blobUrlRef    = useRef(null);
  const coverImgRef   = useRef(null);
  const rafRef        = useRef(null);
  const tickRef       = useRef(0);
  const prepAbortRef  = useRef(false);

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

  const showToast = useCallback((msg) => {
    setToast(msg);
    clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToast(""), 3500);
  }, []);

  // ── Canvas RAF loop (iOS visual animation while PiP is open) ─────────────
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
    video.style.cssText = "position:fixed;bottom:0;right:0;width:1px;height:1px;opacity:0.001;pointer-events:none;z-index:-1;";
    document.body.appendChild(video);
    pipVideoRef.current = video;
    setVideoReady(true);
    return video;
  }, []);

  // ── PRE-BAKE: prepare PiP video whenever track changes ───────────────────
  // Desktop/Android: use audio.captureStream() → real-time synced progress
  // iOS: canvas blob fallback (visual only)
  useEffect(() => {
    if (!isMobile || !currentTrack) return;

    prepAbortRef.current = true;
    setPipReady(false);
    setPipPrepping(true);

    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width  = PIP_W;
    canvas.height = PIP_H;

    const abortToken = {};
    prepAbortRef.current = abortToken;

    const prep = async () => {
      await new Promise((r) => setTimeout(r, 300));
      if (prepAbortRef.current !== abortToken) return;

      const video = ensureVideo();
      const audio = audioRef?.current;

      // ── Strategy 1: audio.captureStream() — real synced PiP (Chrome/Android) ──
      // This makes the video's currentTime === audio.currentTime exactly.
      if (!isIOS && audio && typeof audio.captureStream === "function") {
        try {
          // Draw a static cover frame as video background
          drawCoverFrame(canvas.getContext("2d"), coverImgRef.current, currentTrack, PIP_W, PIP_H, 0);

          // Use audio's own stream — video tracks real audio time
          const audioStream = audio.captureStream();
          // Mix with canvas visual for cover art display
          const canvasStream = canvas.captureStream(1); // 1fps static cover art
          const combined = new MediaStream([
            ...canvasStream.getVideoTracks(),
            ...audioStream.getAudioTracks(),
          ]);
          video.srcObject = combined;
          video.muted = false; // must be unmuted so PiP shows play/pause correctly
          // We don't actually want to hear audio from video (audio plays through audio el)
          // But we need it unmuted for PiP controls to appear. Set volume to 0.
          video.volume = 0;

          await video.play();
          if (prepAbortRef.current !== abortToken) return;
          setPipReady(true);
          setPipPrepping(false);
          console.log("[PiP] ✅ Audio captureStream ready (synced)");
          return;
        } catch (e) {
          console.warn("[PiP] audio.captureStream failed:", e.message, "— falling back");
        }
      }

      // ── Strategy 2: canvas captureStream (visual only, no audio stream) ──
      if (!isIOS && canvas.captureStream) {
        try {
          drawCoverFrame(canvas.getContext("2d"), coverImgRef.current, currentTrack, PIP_W, PIP_H, 0);
          video.srcObject = canvas.captureStream(24);
          video.muted = true;
          video.volume = 0;
          await video.play();
          if (prepAbortRef.current !== abortToken) return;
          setPipReady(true);
          setPipPrepping(false);
          console.log("[PiP] ✅ Canvas captureStream ready (visual)");
          return;
        } catch (e) {
          console.warn("[PiP] canvas.captureStream failed:", e.message);
        }
      }

      // ── Strategy 3: iOS MediaRecorder blob fallback ───────────────────────
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
        if (prepAbortRef.current !== abortToken) return;

        if (blobUrlRef.current) { URL.revokeObjectURL(blobUrlRef.current); blobUrlRef.current = null; }
        blobUrlRef.current = URL.createObjectURL(blob);

        video.srcObject = null;
        video.src       = blobUrlRef.current;
        video.loop      = true;
        video.muted     = true;
        video.volume    = 0;
        await video.load();
        await video.play();
        video.pause();

        if (prepAbortRef.current !== abortToken) return;
        setPipReady(true);
        setPipPrepping(false);
        console.log("[PiP] ✅ iOS blob ready, size:", blob.size);
      } catch (e) {
        if (prepAbortRef.current !== abortToken) return;
        setPipPrepping(false);
        console.warn("[PiP] Blob prep failed:", e.message);
      }
    };

    prep();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMobile, isIOS, currentTrack?.id, ensureVideo]);

  // ── Bridge: PiP video play/pause → PlayerContext ──────────────────────────
  // When user taps play/pause IN the PiP floating window, those events fire on
  // the hidden <video>. We forward them to the global audio via PlayerContext
  // so all UI (in-app player, lock screen, etc.) stays in sync.
  useEffect(() => {
    const video = pipVideoRef.current;
    if (!video) return;
    const audio = audioRef?.current;
    if (!audio) return;

    const onVideoPause = () => {
      if (!document.pictureInPictureElement) return;
      // Forward to global audio
      if (!audio.paused) {
        audio.pause();
        console.log("[PiP] ⏸ PiP pause → audio paused");
      }
    };

    const onVideoPlay = () => {
      if (!document.pictureInPictureElement) return;
      if (audio.paused) {
        audio.play().catch(() => {});
        console.log("[PiP] ▶️ PiP play → audio resumed");
      }
    };

    // For audio.captureStream path: video seek → audio seek
    const onVideoSeeked = () => {
      if (!document.pictureInPictureElement) return;
      if (video.srcObject) return; // srcObject streams can't seek independently
      // Blob/src path: sync seek back to audio
      if (Math.abs(audio.currentTime - video.currentTime) > 1) {
        audio.currentTime = video.currentTime;
        console.log("[PiP] ⏩ PiP seek → audio seeked to", video.currentTime);
      }
    };

    video.addEventListener("pause",  onVideoPause);
    video.addEventListener("play",   onVideoPlay);
    video.addEventListener("seeked", onVideoSeeked);
    return () => {
      video.removeEventListener("pause",  onVideoPause);
      video.removeEventListener("play",   onVideoPlay);
      video.removeEventListener("seeked", onVideoSeeked);
    };
  }, [videoReady, audioRef]);

  // ── Mirror isPlaying → PiP video visual state ─────────────────────────────
  // When in-app controls or lock screen pause/resume, keep PiP icon in sync.
  useEffect(() => {
    const video = pipVideoRef.current;
    if (!video || !document.pictureInPictureElement) return;
    if (isPlaying) {
      if (video.paused) video.play().catch(() => {});
    } else {
      if (!video.paused) video.pause();
    }
  }, [isPlaying, videoReady]);

  // ── PiP lifecycle ─────────────────────────────────────────────────────────
  useEffect(() => {
    const onLeave = () => { setPipActive(false); stopLoop(); };
    document.addEventListener("leavepictureinpicture", onLeave);
    return () => document.removeEventListener("leavepictureinpicture", onLeave);
  }, [stopLoop]);

  // ── Cleanup on unmount ────────────────────────────────────────────────────
  useEffect(() => () => {
    stopLoop();
    prepAbortRef.current = {};
    if (document.pictureInPictureElement) document.exitPictureInPicture().catch(() => {});
    if (blobUrlRef.current) { URL.revokeObjectURL(blobUrlRef.current); blobUrlRef.current = null; }
    if (pipVideoRef.current) { pipVideoRef.current.remove(); pipVideoRef.current = null; }
  }, [stopLoop]);

  // ── Early return (all hooks above) ───────────────────────────────────────
  if (!isMobile || !currentTrack) return null;

  // ── AirPlay ───────────────────────────────────────────────────────────────
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

  // ── PiP — called directly from tap (no async before requestPictureInPicture) ──
  const handlePiP = (e) => {
    e.stopPropagation();
    showControls();

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
      showToast(pipPrepping ? "Preparing PiP... try again in a moment." : "PiP not available. Try updating your browser.");
      return;
    }

    // For iOS blob path: resume video so readyState >= 2
    if (video.paused && !video.srcObject) {
      video.play().catch(() => {});
    }

    // For canvas captureStream (no audio tracks): start animation loop
    const hasAudioStream = video.srcObject && video.srcObject.getAudioTracks?.()?.length > 0;
    if (!isIOS && !hasAudioStream) {
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
        console.warn("[PiP] ⚠️ Failed:", err.name, "-", err.message);
        stopLoop();
        showToast("Picture-in-Picture failed. Try playing the song first.");
      });
  };

  return (
    <>
      <canvas
        ref={canvasRef}
        width={PIP_W}
        height={PIP_H}
        style={{ position: "absolute", top: -9999, left: -9999, width: 1, height: 1, opacity: 0, pointerEvents: "none" }}
      />

      <div
        className={`absolute inset-0 z-20 ${className}`}
        onTouchStart={showControls}
        onClick={showControls}
        style={{ touchAction: "manipulation" }}
      >
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
            {pipReady && !pipActive && (
              <div style={{
                position: "absolute", bottom: 4, right: 4,
                width: 6, height: 6, borderRadius: "50%",
                background: "#00C9E0", boxShadow: "0 0 4px #00C9E0",
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

      <style>{`
        @keyframes uvPipPulse {
          0%, 100% { opacity: 0.3; transform: scale(0.8); }
          50%       { opacity: 1;   transform: scale(1.1); }
        }
      `}</style>
    </>
  );
}