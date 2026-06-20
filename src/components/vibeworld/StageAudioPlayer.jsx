import React, { useRef, useEffect, useCallback, useImperativeHandle, forwardRef } from "react";

/**
 * StageAudioPlayer — hidden YouTube iframe that provides audio for the stage.
 * Invoked by "Watch on Stage" / "Watch Full Screen" clicks.
 *
 * Exposes via ref: { play, pause, mute, unmute, setVideo(videoId) }
 */
const StageAudioPlayer = forwardRef(function StageAudioPlayer({ video, onReady, onError }, ref) {
  const iframeRef = useRef(null);
  const playerRef = useRef(null);
  const readyRef = useRef(false);
  const queuedPlayRef = useRef(false);
  const mutedRef = useRef(true);
  const lastVideoIdRef = useRef(null);

  useImperativeHandle(ref, () => ({
    play() {
      if (playerRef.current?.playVideo) {
        playerRef.current.playVideo();
      } else {
        queuedPlayRef.current = true;
      }
    },
    pause() {
      playerRef.current?.pauseVideo?.();
    },
    mute() {
      mutedRef.current = true;
      playerRef.current?.mute?.();
    },
    unmute() {
      mutedRef.current = false;
      playerRef.current?.unMute?.();
    },
    setVideo(videoId) {
      if (videoId && videoId !== lastVideoIdRef.current) {
        lastVideoIdRef.current = videoId;
        if (playerRef.current?.loadVideoById) {
          playerRef.current.loadVideoById(videoId);
          // Auto-play after loading the new video
          setTimeout(() => {
            playerRef.current?.playVideo?.();
            if (!mutedRef.current) {
              playerRef.current?.unMute?.();
            }
          }, 400);
        }
      }
    },
    isMuted() {
      return mutedRef.current;
    },
  }));

  // YouTube iframe API ready callback
  const onYouTubeReady = useCallback(() => {
    readyRef.current = true;
    const YT = window.YT;
    if (!YT?.Player) return;

    playerRef.current = new YT.Player(iframeRef.current, {
      events: {
        onReady: () => {
          onReady?.();
          const vid = video?.youtube_video_id;
          if (vid) {
            playerRef.current.loadVideoById(vid);
            lastVideoIdRef.current = vid;
          }
          playerRef.current.mute();
          mutedRef.current = true;
          if (queuedPlayRef.current) {
            playerRef.current.playVideo();
            queuedPlayRef.current = false;
          }
        },
        onError: (e) => {
          onError?.(e);
        },
      },
    });
  }, [video?.youtube_video_id, onReady, onError]);

  useEffect(() => {
    // Load YouTube iframe API
    if (window.YT?.Player) {
      onYouTubeReady();
      return;
    }
    if (window.__ytApiLoading) {
      const prevCb = window.__ytApiCallbacks || [];
      window.__ytApiCallbacks = prevCb.concat(onYouTubeReady);
      return;
    }
    window.__ytApiLoading = true;
    window.__ytApiCallbacks = [onYouTubeReady];

    const tag = document.createElement("script");
    tag.src = "https://www.youtube.com/iframe_api";
    const firstScriptTag = document.getElementsByTagName("script")[0];
    firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

    const origOnYouTubeIframeAPIReady = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      if (origOnYouTubeIframeAPIReady) origOnYouTubeIframeAPIReady();
      (window.__ytApiCallbacks || []).forEach((cb) => cb());
      window.__ytApiCallbacks = [];
    };
  }, [onYouTubeReady]);

  // React to video changes
  useEffect(() => {
    const vid = video?.youtube_video_id;
    if (!vid || !playerRef.current?.loadVideoById) return;
    if (vid === lastVideoIdRef.current) return;
    lastVideoIdRef.current = vid;
    playerRef.current.loadVideoById(vid);
    if (!mutedRef.current) {
      setTimeout(() => playerRef.current?.unMute?.(), 500);
    }
  }, [video?.youtube_video_id]);

  return (
    <div
      style={{
        position: "fixed",
        left: "-9999px",
        top: 0,
        width: "1px",
        height: "1px",
        opacity: 0,
        pointerEvents: "none",
        overflow: "hidden",
      }}
      aria-hidden="true"
    >
      <div ref={iframeRef} />
    </div>
  );
});

export default StageAudioPlayer;