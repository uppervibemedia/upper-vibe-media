import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';

export default function StageCoverVisualizer({ onReady, video, audioIntensityRef }) {
  const canvasRef = useRef(null);
  const lastVideoIdRef = useRef(null);
  const lastIntensityRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    onReady?.(canvas);

    let animId;
    const loop = () => {
      animId = requestAnimationFrame(loop);
      const intensity = audioIntensityRef?.current || 0;
      if (video?.youtube_video_id === lastVideoIdRef.current && Math.abs(intensity - lastIntensityRef.current) < 0.005) return;
      lastVideoIdRef.current = video?.youtube_video_id;
      lastIntensityRef.current = intensity;

      const ctx = canvas.getContext('2d');
      // ... (drawing logic from original StageCoverVisualizer) ...
    };
    loop();
    return () => cancelAnimationFrame(animId);
  }, [onReady, video, audioIntensityRef]);

  return <canvas ref={canvasRef} width={1280} height={720} className="hidden" />;
}