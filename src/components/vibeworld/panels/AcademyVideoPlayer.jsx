import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, ChevronLeft, ChevronRight, ExternalLink, ListVideo, Maximize2, Minimize2, Pause, Play, Volume2, VolumeX, X } from "lucide-react";
import { usePlayer } from "@/context/PlayerContext";
import { getState as getRadioAudioState, pauseMyVibe, pauseUpperVibeRadio, resumeMyVibe, resumeUpperVibeRadio } from "@/lib/radioAudioManager";

function controlledEmbedUrl(url) {
  if (!url) return "";
  try {
    const next = new URL(url);
    next.searchParams.set("enablejsapi", "1");
    next.searchParams.set("controls", "0");
    next.searchParams.set("disablekb", "1");
    next.searchParams.set("fs", "0");
    next.searchParams.set("modestbranding", "1");
    next.searchParams.set("rel", "0");
    next.searchParams.set("playsinline", "1");
    next.searchParams.set("iv_load_policy", "3");
    if (typeof window !== "undefined" && window.location?.origin) next.searchParams.set("origin", window.location.origin);
    return next.toString();
  } catch {
    return url;
  }
}

function formatTime(value = 0) {
  const total = Math.max(0, Math.floor(value || 0));
  const mins = Math.floor(total / 60);
  const secs = String(total % 60).padStart(2, "0");
  return `${mins}:${secs}`;
}

export default function AcademyVideoPlayer({
  loadingVideos,
  embedUrl,
  watchUrl,
  currentLesson,
  currentIndex,
  lessons,
  setCurrentIndex,
  completeVideoLesson,
  config,
  isMobile,
  onBackToAcademy,
  onExitAcademy,
}) {
  const iframeRef = useRef(null);
  const { isPlaying, audioRef, safePause, safePlay, setIsPlaying, savePosition } = usePlayer();
  const youtubeSessionActiveRef = useRef(false);
  const musicWasPlayingRef = useRef(false);
  const radioWasPlayingRef = useRef(false);
  const radioModeRef = useRef(null);
  const openedExternalRef = useRef(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [playlistOpen, setPlaylistOpen] = useState(false);
  const [embedIssue, setEmbedIssue] = useState(false);
  const [videoState, setVideoState] = useState("paused");
  const [muted, setMuted] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);

  const customEmbedUrl = useMemo(() => controlledEmbedUrl(embedUrl), [embedUrl]);

  const sendCommand = useCallback((func, args = []) => {
    try {
      iframeRef.current?.contentWindow?.postMessage(JSON.stringify({ event: "command", func, args }), "https://www.youtube.com");
    } catch {}
  }, []);

  const pauseGlobalForYoutube = useCallback(() => {
    const audio = audioRef?.current;
    const radioState = getRadioAudioState();
    if (!youtubeSessionActiveRef.current) {
      const audioPlaying = !!audio && !audio.paused && !audio.ended;
      musicWasPlayingRef.current = !!isPlaying || audioPlaying;
      radioWasPlayingRef.current = !!radioState?.isPlaying;
      radioModeRef.current = radioState?.activeMode || null;
      youtubeSessionActiveRef.current = true;
    }
    if (radioState?.isPlaying) {
      if (radioState.activeMode === "myVibeRadio") pauseMyVibe();
      if (radioState.activeMode === "upperVibeRadio") pauseUpperVibeRadio();
    }
    if (audio && !audio.paused) {
      if (audio.currentTime > 0) savePosition?.(audio.currentTime);
      audio.pause();
      setIsPlaying?.(false);
      safePause?.(audio, "academy-video-playing");
    }
  }, [audioRef, isPlaying, safePause, savePosition, setIsPlaying]);

  const resumeGlobalIfNeeded = useCallback(() => {
    if (!youtubeSessionActiveRef.current) return;
    if (radioWasPlayingRef.current) {
      if (radioModeRef.current === "myVibeRadio") resumeMyVibe();
      if (radioModeRef.current === "upperVibeRadio") resumeUpperVibeRadio();
      return;
    }
    if (musicWasPlayingRef.current && audioRef?.current) {
      safePlay?.(audioRef.current, "academy-video-exit");
    }
  }, [audioRef, safePlay]);

  const pauseVideo = useCallback(() => {
    sendCommand("pauseVideo");
    setVideoState("paused");
  }, [sendCommand]);

  const leaveVideoExperience = useCallback(() => {
    pauseVideo();
    if (!openedExternalRef.current) resumeGlobalIfNeeded();
    openedExternalRef.current = false;
    youtubeSessionActiveRef.current = false;
    musicWasPlayingRef.current = false;
    radioWasPlayingRef.current = false;
    radioModeRef.current = null;
    setVideoState("paused");
  }, [pauseVideo, resumeGlobalIfNeeded]);

  useEffect(() => {
    const onMessage = (event) => {
      if (!String(event.origin || "").includes("youtube.com")) return;
      let data = event.data;
      if (typeof data === "string") {
        try { data = JSON.parse(data); } catch { return; }
      }
      const info = data?.info;
      if (data?.event === "onError" || (info && typeof info === "object" && info.errorCode)) setEmbedIssue(true);
      if (info && typeof info === "object") {
        if (typeof info.duration === "number" && info.duration > 0) setDuration(info.duration);
        if (typeof info.currentTime === "number") {
          setCurrentTime(info.currentTime);
          if (info.duration) setProgress(Math.max(0, Math.min(100, (info.currentTime / info.duration) * 100)));
        }
        if (typeof info.muted === "boolean") setMuted(info.muted);
      }
      const playerState = info && typeof info === "object" ? info.playerState : info;
      if ((data?.event === "onStateChange" || data?.event === "infoDelivery") && playerState === 1) {
        setVideoState("playing");
        pauseGlobalForYoutube();
      } else if ((data?.event === "onStateChange" || data?.event === "infoDelivery") && [0, 2, 5].includes(playerState)) {
        setVideoState("paused");
      }
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [pauseGlobalForYoutube]);

  useEffect(() => () => leaveVideoExperience(), [leaveVideoExperience]);
  useEffect(() => {
    setEmbedIssue(false);
    setVideoState("paused");
    setProgress(0);
    setCurrentTime(0);
  }, [embedUrl]);

  const handleIframeLoad = () => {
    setEmbedIssue(false);
    try {
      iframeRef.current?.contentWindow?.postMessage(JSON.stringify({ event: "listening", id: "academy-youtube-player" }), "https://www.youtube.com");
    } catch {}
    if (muted) sendCommand("mute");
  };

  const playVideo = () => {
    pauseGlobalForYoutube();
    sendCommand("playVideo");
    setVideoState("playing");
  };

  const togglePlay = () => {
    if (videoState === "playing") pauseVideo();
    else playVideo();
  };

  const toggleMute = () => {
    if (muted) {
      pauseGlobalForYoutube();
      sendCommand("unMute");
      setMuted(false);
    } else {
      sendCommand("mute");
      setMuted(true);
    }
  };

  const seekTo = (value) => {
    const pct = Number(value);
    setProgress(pct);
    if (duration > 0) {
      const nextTime = (pct / 100) * duration;
      setCurrentTime(nextTime);
      sendCommand("seekTo", [nextTime, true]);
    }
  };

  const handleWatchYoutube = () => {
    openedExternalRef.current = true;
    pauseGlobalForYoutube();
    pauseVideo();
    if (watchUrl) window.open(watchUrl, "_blank", "noopener,noreferrer");
  };

  const backToAcademy = () => {
    leaveVideoExperience();
    setFullscreen(false);
    onBackToAcademy?.();
  };

  const exitAcademy = () => {
    leaveVideoExperience();
    setFullscreen(false);
    onExitAcademy?.();
  };

  const exitFullscreen = () => {
    setFullscreen(false);
    setPlaylistOpen(false);
  };

  const enterFullscreen = () => {
    pauseGlobalForYoutube();
    setFullscreen(true);
  };

  const goPrevious = () => {
    pauseVideo();
    setCurrentIndex((i) => Math.max(0, i - 1));
  };

  const goNext = () => {
    pauseVideo();
    setCurrentIndex((i) => Math.min(lessons.length - 1, i + 1));
  };

  const panelStyle = {
    background: "linear-gradient(145deg, rgba(2,8,20,0.97), rgba(8,4,24,0.98))",
    border: "1px solid rgba(0,229,255,0.38)",
    boxShadow: "0 0 0 1px rgba(237,184,74,0.18), 0 18px 50px rgba(0,0,0,0.45), inset 0 0 24px rgba(0,229,255,0.055)",
  };

  const rootStyle = fullscreen ? {
    position: "fixed",
    inset: 0,
    zIndex: 95,
    background: "radial-gradient(circle at 18% 0%, rgba(0,229,255,0.14), transparent 32%), radial-gradient(circle at 88% 18%, rgba(237,184,74,0.12), transparent 30%), rgba(0,0,0,0.98)",
    paddingTop: "max(env(safe-area-inset-top, 0px), 10px)",
    paddingBottom: "max(env(safe-area-inset-bottom, 0px), 10px)",
    paddingLeft: "max(env(safe-area-inset-left, 0px), 10px)",
    paddingRight: "max(env(safe-area-inset-right, 0px), 10px)",
  } : {};

  const playerShellStyle = fullscreen
    ? { ...panelStyle, width: "min(100%, 177.78vh)", maxHeight: "calc(100dvh - 190px)", aspectRatio: "16 / 9", borderRadius: isMobile ? 14 : 22, overflow: "hidden" }
    : { aspectRatio: "16 / 9", borderBottom: "1px solid rgba(237,184,74,0.24)" };

  return (
    <div className={fullscreen ? "flex flex-col gap-3" : "flex-1 min-h-0 flex flex-col lg:flex-row gap-4 p-4 overflow-y-auto"} style={rootStyle}>
      {fullscreen && (
        <div className="flex-shrink-0 flex flex-wrap items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.2em]" style={{ color: "#00E5FF" }}>Upper Vibe Academy</p>
            <h3 className="font-heading font-black text-white text-sm sm:text-base truncate max-w-[70vw]">{currentLesson?.title || "Learning Video"}</h3>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setPlaylistOpen((v) => !v)} className="flex items-center gap-2 px-3 py-2 rounded-full font-black text-[10px]" style={{ background: "rgba(0,229,255,0.12)", border: "1px solid rgba(0,229,255,0.34)", color: "#DFFBFF", minHeight: 42 }}><ListVideo className="w-3.5 h-3.5" /> Playlist</button>
            <button onClick={exitFullscreen} className="flex items-center gap-2 px-3 py-2 rounded-full font-black text-[10px]" style={{ background: "rgba(255,211,110,0.12)", border: "1px solid rgba(237,184,74,0.34)", color: "#FFF4C8", minHeight: 42 }}><Minimize2 className="w-3.5 h-3.5" /> Exit Big Screen</button>
            <button onClick={exitAcademy} className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.72)" }}><X className="w-4 h-4" /></button>
          </div>
        </div>
      )}

      <div className={fullscreen ? "flex-1 min-h-0 flex flex-col items-center justify-center" : "flex-1 min-w-0 rounded-3xl overflow-hidden"} style={fullscreen ? {} : panelStyle}>
        <div className="relative w-full bg-black flex items-center justify-center mx-auto" style={playerShellStyle}>
          {loadingVideos ? (
            <div className="w-6 h-6 border-2 border-cyan-300/20 border-t-cyan-300 rounded-full animate-spin" />
          ) : embedIssue && watchUrl ? (
            <div className="w-full h-full flex flex-col items-center justify-center gap-3 p-5 text-center" style={{ background: "radial-gradient(circle, rgba(0,229,255,0.08), rgba(5,8,20,1))" }}>
              <p className="text-white/72 text-sm font-bold">This lesson cannot play inside the Academy right now.</p>
              <div className="flex flex-wrap items-center justify-center gap-2">
                <button onClick={handleWatchYoutube} className="inline-flex items-center gap-2 px-4 py-2 rounded-full font-black text-[10px]" style={{ background: "rgba(255,255,255,0.1)", color: "#fff", minHeight: 44 }}>Open lesson <ExternalLink className="w-3 h-3" /></button>
                <button onClick={backToAcademy} className="px-4 py-2 rounded-full font-black text-[10px]" style={{ background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.75)", minHeight: 44 }}>Back To Academy</button>
              </div>
            </div>
          ) : customEmbedUrl ? (
            <>
              <iframe ref={iframeRef} key={customEmbedUrl} src={customEmbedUrl} title={currentLesson?.title || "Academy Lesson"} className="w-full h-full" style={{ border: 0, pointerEvents: "none" }} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerPolicy="strict-origin-when-cross-origin" onLoad={handleIframeLoad} onError={() => setEmbedIssue(true)} />
              <div className="absolute inset-0 pointer-events-none" style={{ background: "linear-gradient(180deg, rgba(0,0,0,0.18), transparent 30%, rgba(0,0,0,0.58))" }} />
              {!fullscreen && (
                <button onClick={enterFullscreen} className="absolute top-3 right-3 z-10 pointer-events-auto flex items-center gap-2 px-4 py-3 rounded-2xl font-black text-[11px] tracking-wider uppercase transition-all active:scale-95" style={{ background: "linear-gradient(135deg,#00E5FF,#FFD36E)", color: "#020712", boxShadow: "0 0 24px rgba(0,229,255,0.38)", minHeight: 48 }}><Maximize2 className="w-4 h-4" /> Big Screen</button>
              )}
              {videoState !== "playing" && (
                <button onClick={playVideo} className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-auto w-16 h-16 rounded-full flex items-center justify-center transition-all active:scale-95" style={{ background: "linear-gradient(135deg,#00E5FF,#FFD36E)", color: "#020712", boxShadow: "0 0 28px rgba(0,229,255,0.35)" }}>
                  <Play className="w-7 h-7 ml-1" fill="currentColor" />
                </button>
              )}
              <div className="absolute left-0 right-0 bottom-0 p-3 sm:p-4 pointer-events-auto" style={{ background: "linear-gradient(180deg, transparent, rgba(0,0,0,0.82))" }}>
                <div className="flex items-center gap-2 mb-2">
                  <button onClick={togglePlay} className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: "rgba(0,229,255,0.16)", border: "1px solid rgba(0,229,255,0.34)", color: "#DFFBFF" }}>{videoState === "playing" ? <Pause className="w-4 h-4" fill="currentColor" /> : <Play className="w-4 h-4 ml-0.5" fill="currentColor" />}</button>
                  <button onClick={toggleMute} className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: muted ? "rgba(255,211,110,0.16)" : "rgba(255,255,255,0.08)", border: muted ? "1px solid rgba(255,211,110,0.34)" : "1px solid rgba(255,255,255,0.12)", color: muted ? "#FFD36E" : "rgba(255,255,255,0.78)" }}>{muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}</button>
                  <div className="flex-1 min-w-0">
                    <input type="range" min="0" max="100" value={progress} onChange={(e) => seekTo(e.target.value)} className="w-full accent-cyan-300" />
                    <div className="flex items-center justify-between text-[9px] text-white/45 font-bold"><span>{formatTime(currentTime)}</span><span>{duration ? formatTime(duration) : "--:--"}</span></div>
                  </div>
                  {!fullscreen && <button onClick={enterFullscreen} className="flex items-center gap-2 px-3 h-10 rounded-full font-black text-[10px] uppercase tracking-wider" style={{ background: "rgba(255,211,110,0.16)", border: "1px solid rgba(255,211,110,0.38)", color: "#FFF4C8" }}><Maximize2 className="w-4 h-4" /> Big Screen</button>}
                </div>
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[10px] text-white/55 font-bold truncate">Lesson {currentIndex + 1}: {currentLesson?.title || "Upper Vibe Academy"}</p>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button disabled={currentIndex <= 0} onClick={goPrevious} className="px-2 py-1.5 rounded-full text-[9px] font-black disabled:opacity-35" style={{ background: "rgba(255,255,255,0.08)", color: "#fff" }}>Prev</button>
                    <button disabled={currentIndex >= lessons.length - 1} onClick={goNext} className="px-2 py-1.5 rounded-full text-[9px] font-black disabled:opacity-35" style={{ background: "rgba(0,229,255,0.14)", color: "#DFFBFF" }}>Next</button>
                  </div>
                </div>
              </div>
            </>
          ) : <p className="text-white/35 text-sm">No learning videos found yet.</p>}
        </div>

        {!fullscreen && (
          <div className="p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-[0.18em]" style={{ color: config.accent }}>Learning Video • Lesson {currentIndex + 1}</p>
                <h4 className="font-heading font-black text-white text-lg mt-1 leading-tight">{currentLesson?.title || "Upper Vibe Academy"}</h4>
                {currentLesson?.description && <p className="text-xs text-white/42 mt-2 leading-relaxed">{currentLesson.description}</p>}
              </div>
              <button onClick={enterFullscreen} className="flex items-center gap-2 px-5 py-3 rounded-2xl font-black text-[12px] tracking-wider uppercase" style={{ background: "linear-gradient(135deg,#00E5FF,#FFD36E)", border: "1px solid rgba(255,211,110,0.5)", color: "#020712", minHeight: 52, boxShadow: "0 0 24px rgba(0,229,255,0.28)" }}><Maximize2 className="w-4 h-4" /> Big Screen</button>
            </div>
            <div className="flex flex-wrap items-center gap-2 mt-4">
              <button disabled={currentIndex <= 0} onClick={goPrevious} className="flex items-center gap-1 px-4 py-2 rounded-full font-black text-[10px] disabled:opacity-35" style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "#fff" }}><ChevronLeft className="w-3 h-3" /> Previous</button>
              <button disabled={currentIndex >= lessons.length - 1} onClick={goNext} className="flex items-center gap-1 px-4 py-2 rounded-full font-black text-[10px] disabled:opacity-35" style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "#fff" }}>Next <ChevronRight className="w-3 h-3" /></button>
              <button onClick={completeVideoLesson} className="px-4 py-2 rounded-full font-black text-[10px]" style={{ background: config.button, color: "#fff" }}>Mark Lesson Complete</button>
              <button onClick={backToAcademy} className="flex items-center gap-2 px-4 py-2 rounded-full font-black text-[10px]" style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.65)", minHeight: 40 }}><ArrowLeft className="w-3 h-3" /> Back To Academy</button>
              <button onClick={exitAcademy} className="px-4 py-2 rounded-full font-black text-[10px]" style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.65)", minHeight: 40 }}>Return To City</button>
            </div>
          </div>
        )}
      </div>

      {(!fullscreen || playlistOpen) && (
        <div className={fullscreen ? "fixed right-3 top-20 bottom-4 w-[min(86vw,330px)] rounded-3xl p-3 overflow-y-auto" : "lg:w-72 rounded-3xl p-3 overflow-y-auto"} style={{ background: fullscreen ? "rgba(4,8,22,0.96)" : "rgba(255,255,255,0.035)", border: "1px solid rgba(237,184,74,0.22)", boxShadow: "0 0 22px rgba(0,229,255,0.08)", maxHeight: fullscreen ? undefined : isMobile ? "none" : "100%", zIndex: 97 }}>
          <div className="flex items-center justify-between mb-3">
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-white/35">Lesson Playlist</p>
            {fullscreen && <button onClick={() => setPlaylistOpen(false)} className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.7)" }}><X className="w-3.5 h-3.5" /></button>}
          </div>
          <div className="space-y-2">{lessons.map((lesson, idx) => <button key={lesson.id} onClick={() => { pauseVideo(); setCurrentIndex(idx); setPlaylistOpen(false); }} className="w-full rounded-2xl p-3 text-left" style={{ background: idx === currentIndex ? "linear-gradient(135deg,rgba(0,229,255,0.14),rgba(255,211,110,0.08))" : "rgba(255,255,255,0.035)", border: idx === currentIndex ? "1px solid rgba(0,229,255,0.32)" : "1px solid rgba(255,255,255,0.06)" }}><p className="text-xs font-black text-white leading-tight line-clamp-2">{lesson.title}</p><p className="text-[9px] text-white/30 mt-1">Lesson {idx + 1}</p></button>)}</div>
        </div>
      )}
    </div>
  );
}