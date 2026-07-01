import React, { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, ChevronLeft, ChevronRight, ExternalLink, ListVideo, Maximize2, Minimize2 } from "lucide-react";
import { usePlayer } from "@/context/PlayerContext";

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
  const openedExternalRef = useRef(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [playlistOpen, setPlaylistOpen] = useState(false);
  const [embedIssue, setEmbedIssue] = useState(false);

  const pauseGlobalForYoutube = useCallback(() => {
    const audio = audioRef?.current;
    if (!youtubeSessionActiveRef.current) {
      const audioPlaying = !!audio && !audio.paused && !audio.ended;
      musicWasPlayingRef.current = !!isPlaying || audioPlaying;
      youtubeSessionActiveRef.current = true;
    }
    if (audio && !audio.paused) {
      if (audio.currentTime > 0) savePosition?.(audio.currentTime);
      audio.pause();
      setIsPlaying?.(false);
      safePause?.(audio, "academy-youtube-playing");
    }
  }, [audioRef, isPlaying, safePause, savePosition, setIsPlaying]);

  const pauseYoutube = useCallback(() => {
    try {
      iframeRef.current?.contentWindow?.postMessage(JSON.stringify({ event: "command", func: "pauseVideo", args: [] }), "https://www.youtube.com");
    } catch {}
  }, []);

  const leaveVideoExperience = useCallback(() => {
    pauseYoutube();
    if (!openedExternalRef.current && youtubeSessionActiveRef.current && musicWasPlayingRef.current && audioRef?.current) {
      safePlay?.(audioRef.current, "academy-youtube-exit");
    }
    openedExternalRef.current = false;
    youtubeSessionActiveRef.current = false;
    musicWasPlayingRef.current = false;
  }, [audioRef, pauseYoutube, safePlay]);

  useEffect(() => {
    const onMessage = (event) => {
      if (!String(event.origin || "").includes("youtube.com")) return;
      let data = event.data;
      if (typeof data === "string") {
        try { data = JSON.parse(data); } catch { return; }
      }
      if (data?.event === "onError" || data?.info?.errorCode || data?.info?.playerState === -1 && data?.info?.errorCode) {
        setEmbedIssue(true);
      }
      const playerState = typeof data?.info === "object" ? data.info.playerState : data?.info;
      if ((data?.event === "onStateChange" || data?.event === "infoDelivery") && playerState === 1) {
        pauseGlobalForYoutube();
      }
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [pauseGlobalForYoutube]);

  useEffect(() => () => leaveVideoExperience(), [leaveVideoExperience]);
  useEffect(() => setEmbedIssue(false), [embedUrl]);

  const handleIframeLoad = () => {
    setEmbedIssue(false);
    try {
      iframeRef.current?.contentWindow?.postMessage(JSON.stringify({ event: "listening", id: "academy-youtube-player" }), "https://www.youtube.com");
    } catch {}
  };

  const handleWatchYoutube = () => {
    openedExternalRef.current = true;
    pauseGlobalForYoutube();
    pauseYoutube();
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

  const rootStyle = fullscreen ? {
    position: "fixed",
    inset: 0,
    zIndex: 95,
    background: "rgba(0,0,0,0.96)",
    paddingTop: "max(env(safe-area-inset-top, 0px), 12px)",
    paddingBottom: "max(env(safe-area-inset-bottom, 0px), 12px)",
    paddingLeft: "max(env(safe-area-inset-left, 0px), 12px)",
    paddingRight: "max(env(safe-area-inset-right, 0px), 12px)",
  } : {};

  return (
    <div className={fullscreen ? "flex flex-col" : "flex-1 min-h-0 flex flex-col lg:flex-row gap-4 p-4 overflow-y-auto"} style={rootStyle}>
      {fullscreen && (
        <div className="flex-shrink-0 flex flex-wrap items-center justify-between gap-2 pb-3">
          <button onClick={exitFullscreen} className="flex items-center gap-2 px-4 py-2 rounded-full font-black text-[10px] tracking-wider" style={{ background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.18)", color: "#fff", minHeight: 44 }}><Minimize2 className="w-3.5 h-3.5" /> Exit Full Screen</button>
          <div className="flex items-center gap-2">
            <button onClick={() => setPlaylistOpen((v) => !v)} className="flex items-center gap-2 px-4 py-2 rounded-full font-black text-[10px] tracking-wider" style={{ background: "rgba(0,229,255,0.12)", border: "1px solid rgba(0,229,255,0.26)", color: "#DFFBFF", minHeight: 44 }}><ListVideo className="w-3.5 h-3.5" /> Playlist</button>
            <button onClick={backToAcademy} className="px-4 py-2 rounded-full font-black text-[10px] tracking-wider" style={{ background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.75)", minHeight: 44 }}>Back To Academy</button>
            <button onClick={exitAcademy} className="px-4 py-2 rounded-full font-black text-[10px] tracking-wider" style={{ background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.65)", minHeight: 44 }}>Return To City / Exit</button>
          </div>
        </div>
      )}

      <div className={fullscreen ? "flex-1 min-h-0 flex flex-col justify-center" : "flex-1 min-w-0 rounded-3xl overflow-hidden"} style={fullscreen ? {} : { background: "rgba(0,0,0,0.45)", border: "1px solid rgba(0,229,255,0.18)" }}>
        <div onPointerDownCapture={pauseGlobalForYoutube} onTouchStart={pauseGlobalForYoutube} className="w-full bg-black flex items-center justify-center mx-auto" style={fullscreen ? { aspectRatio: "16 / 9", width: "min(100%, 177.78vh)", maxHeight: "calc(100dvh - 170px)", borderRadius: isMobile ? 14 : 22, overflow: "hidden", border: "1px solid rgba(255,255,255,0.1)" } : { aspectRatio: "16 / 9" }}>
          {loadingVideos ? <div className="w-6 h-6 border-2 border-cyan-300/20 border-t-cyan-300 rounded-full animate-spin" /> : embedIssue && watchUrl ? <div className="w-full h-full flex flex-col items-center justify-center gap-3 p-5 text-center"><p className="text-white/72 text-sm font-bold">Video cannot play inside the Academy right now.</p><div className="flex flex-wrap items-center justify-center gap-2"><button onClick={handleWatchYoutube} className="inline-flex items-center gap-2 px-4 py-2 rounded-full font-black text-[10px]" style={{ background: "rgba(255,255,255,0.1)", color: "#fff", minHeight: 44 }}>Watch on YouTube <ExternalLink className="w-3 h-3" /></button><button onClick={backToAcademy} className="px-4 py-2 rounded-full font-black text-[10px]" style={{ background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.75)", minHeight: 44 }}>Back To Academy</button><button onClick={exitAcademy} className="px-4 py-2 rounded-full font-black text-[10px]" style={{ background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.65)", minHeight: 44 }}>Return To City / Exit</button></div></div> : embedUrl ? <iframe ref={iframeRef} key={embedUrl} src={embedUrl} title={currentLesson?.title || "Academy Lesson"} className="w-full h-full" style={{ border: 0 }} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerPolicy="strict-origin-when-cross-origin" allowFullScreen onLoad={handleIframeLoad} onError={() => setEmbedIssue(true)} /> : <p className="text-white/35 text-sm">No learning videos found yet.</p>}
        </div>

        <div className={fullscreen ? "pt-3 mx-auto w-full" : "p-4"} style={fullscreen ? { width: "min(100%, 177.78vh)" } : {}}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-[0.18em]" style={{ color: config.accent }}>Learning Video • Lesson {currentIndex + 1}</p>
              <h4 className="font-heading font-black text-white text-lg mt-1 leading-tight">{currentLesson?.title || "Upper Vibe Academy"}</h4>
              {currentLesson?.description && !fullscreen && <p className="text-xs text-white/42 mt-2 leading-relaxed">{currentLesson.description}</p>}
            </div>
            {!fullscreen && <button onClick={() => setFullscreen(true)} className="flex items-center gap-2 px-4 py-2 rounded-full font-black text-[10px] tracking-wider" style={{ background: "rgba(0,229,255,0.12)", border: "1px solid rgba(0,229,255,0.28)", color: "#DFFBFF", minHeight: 44 }}><Maximize2 className="w-3.5 h-3.5" /> Full Screen</button>}
          </div>


          <div className="flex flex-wrap items-center gap-2 mt-4">
            <button disabled={currentIndex <= 0} onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))} className="flex items-center gap-1 px-4 py-2 rounded-full font-black text-[10px] disabled:opacity-35" style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "#fff", touchAction: "manipulation" }}><ChevronLeft className="w-3 h-3" /> Previous</button>
            <button disabled={currentIndex >= lessons.length - 1} onClick={() => setCurrentIndex((i) => Math.min(lessons.length - 1, i + 1))} className="flex items-center gap-1 px-4 py-2 rounded-full font-black text-[10px] disabled:opacity-35" style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "#fff", touchAction: "manipulation" }}>Next <ChevronRight className="w-3 h-3" /></button>
            <button onClick={completeVideoLesson} className="px-4 py-2 rounded-full font-black text-[10px]" style={{ background: config.button, color: "#fff", touchAction: "manipulation" }}>Mark Lesson Complete</button>
            {!fullscreen && <button onClick={backToAcademy} className="flex items-center gap-2 px-4 py-2 rounded-full font-black text-[10px]" style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.65)", minHeight: 40 }}><ArrowLeft className="w-3 h-3" /> Back To Academy</button>}
          </div>
        </div>
      </div>

      {(!fullscreen || playlistOpen) && (
        <div className={fullscreen ? "fixed right-3 top-20 bottom-4 w-[min(82vw,320px)] rounded-3xl p-3 overflow-y-auto" : "lg:w-72 rounded-3xl p-3 overflow-y-auto"} style={{ background: fullscreen ? "rgba(8,10,24,0.94)" : "rgba(255,255,255,0.035)", border: "1px solid rgba(255,255,255,0.07)", maxHeight: fullscreen ? undefined : isMobile ? "none" : "100%", zIndex: 97 }}>
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-white/35 mb-3">Lesson Playlist</p>
          <div className="space-y-2">{lessons.map((lesson, idx) => <button key={lesson.id} onClick={() => { setCurrentIndex(idx); setPlaylistOpen(false); }} className="w-full rounded-2xl p-3 text-left" style={{ background: idx === currentIndex ? "rgba(0,229,255,0.12)" : "rgba(255,255,255,0.035)", border: idx === currentIndex ? "1px solid rgba(0,229,255,0.28)" : "1px solid rgba(255,255,255,0.06)", touchAction: "manipulation" }}><p className="text-xs font-black text-white leading-tight line-clamp-2">{lesson.title}</p><p className="text-[9px] text-white/30 mt-1">Lesson {idx + 1}</p></button>)}</div>
        </div>
      )}
    </div>
  );
}