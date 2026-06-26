import React, { useRef, useEffect, useState, useCallback } from 'react';
import { initCore, startAnimationLoop } from '@/components/vibeworld/city-engine/core.js';

export default function CityCanvas(props) {
  const canvasRef = useRef(null);
  const [error, setError] = useState(null);
  const rendererRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let stopAnimation;

    try {
      const { renderer, scene, camera } = initCore(canvas, rendererRef, props.avatarConfig, props.mobileInputRef);

      stopAnimation = startAnimationLoop({
        ...props,
        renderer,
        scene,
        camera,
        canvas,
      });

    } catch (e) {
      console.error("[CityCanvas] init error:", e);
      setError(e.message || String(e));
    }

    return () => {
      if (stopAnimation) stopAnimation();
      if (rendererRef.current) {
        rendererRef.current.dispose();
      }
    };
  }, []); // Run once on mount

  if (error) {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-sky-200">
        <div className="text-center px-6">
          <p className="text-red-600 font-bold text-sm mb-2">3D Error</p>
          <p className="text-xs text-gray-500 mb-4 max-w-md">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 rounded-lg bg-blue-500 text-white text-xs font-bold"
          >
            Reload
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
      }}
    >
      <canvas
        ref={canvasRef}
        className="w-full h-full block"
        style={{ touchAction: "none" }}
      />
    </div>
  );
}