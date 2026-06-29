/**
 * FPSMonitor — Lightweight debug overlay.
 * Only visible when ?debug=1 is in the URL or localStorage.debug === "1".
 * Shows FPS, frame time, mesh count, light count, live avatars, memory.
 */
import React, { useEffect, useRef, useState } from "react";

function isDebugMode() {
  try {
    if (new URLSearchParams(window.location.search).get("debug") === "1") return true;
    if (localStorage.getItem("uvc_debug") === "1") return true;
  } catch {}
  return false;
}

export default function FPSMonitor({ sceneRef, remoteUserCount = 0 }) {
  const [stats, setStats] = useState(null);
  const frameRef = useRef(0);
  const lastTRef = useRef(performance.now());
  const fpsAccRef = useRef([]);
  const enabled = isDebugMode();

  useEffect(() => {
    if (!enabled) return;

    let rafId;
    const tick = () => {
      rafId = requestAnimationFrame(tick);
      frameRef.current++;

      // Update stats every 30 frames (~0.5s)
      if (frameRef.current % 30 !== 0) return;

      const now = performance.now();
      const elapsed = now - lastTRef.current;
      lastTRef.current = now;
      const fps = Math.round((30 / elapsed) * 1000);
      fpsAccRef.current.push(fps);
      if (fpsAccRef.current.length > 5) fpsAccRef.current.shift();
      const avgFps = Math.round(fpsAccRef.current.reduce((a, b) => a + b, 0) / fpsAccRef.current.length);
      const frameMs = Math.round(elapsed / 30);

      let meshCount = 0, lightCount = 0, pointsCount = 0, spritesCount = 0;
      const materials = new Set();
      // Use globally exposed scene (set by CityCanvas as window.__hbScene)
      const scene = window.__hbScene;
      if (scene) {
        scene.traverse((obj) => {
          if (obj.isMesh) {
            meshCount++;
            if (Array.isArray(obj.material)) obj.material.forEach((m) => materials.add(m));
            else if (obj.material) materials.add(obj.material);
          }
          if (obj.isPoints) pointsCount++;
          if (obj.isSprite) spritesCount++;
          if (obj.isLight) lightCount++;
        });
      }

      let memMb = null;
      if (window.performance?.memory) {
        memMb = Math.round(window.performance.memory.usedJSHeapSize / 1048576);
      }

      const renderer = sceneRef?.current;
      const renderInfo = renderer?.info || null;
      setStats({
        fps: avgFps,
        frameMs,
        meshCount,
        lightCount,
        pointsCount,
        spritesCount,
        materialCount: materials.size,
        qualityLevel: scene?.userData?._activeQualityLevel || scene?.userData?._cityQuality?.currentLevel || "—",
        loadedZones: scene?.userData?._loadedZoneState || {},
        drawCalls: renderInfo?.render?.calls ?? null,
        textures: renderInfo?.memory?.textures ?? null,
        geometries: renderInfo?.memory?.geometries ?? null,
        remoteUserCount,
        memMb,
      });
    };
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [enabled, sceneRef, remoteUserCount]);

  if (!enabled || !stats) return null;

  const fpsColor = stats.fps >= 50 ? "#4ade80" : stats.fps >= 30 ? "#facc15" : "#f87171";

  return (
    <div
      style={{
        position: "absolute",
        top: 8,
        left: 8,
        background: "rgba(0,0,0,0.7)",
        color: "#fff",
        fontFamily: "monospace",
        fontSize: 11,
        padding: "6px 10px",
        borderRadius: 6,
        lineHeight: 1.7,
        pointerEvents: "none",
        zIndex: 9999,
        userSelect: "none",
      }}
    >
      <div style={{ color: fpsColor, fontWeight: "bold" }}>FPS: {stats.fps}</div>
      <div>Frame: {stats.frameMs}ms</div>
      <div>Meshes: {stats.meshCount}</div>
      <div>Materials: {stats.materialCount}</div>
      <div>Lights: {stats.lightCount}</div>
      <div>Quality: {stats.qualityLevel}</div>
      <div>Points/Sprites: {stats.pointsCount}/{stats.spritesCount}</div>
      {stats.drawCalls !== null && <div>Draws: {stats.drawCalls}</div>}
      {stats.textures !== null && <div>Textures: {stats.textures}</div>}
      {stats.geometries !== null && <div>Geometry: {stats.geometries}</div>}
      <div>Zones: {Object.values(stats.loadedZones || {}).filter((v) => v === "full").length} full</div>
      <div>Remote: {stats.remoteUserCount}</div>
      {stats.memMb !== null && <div>Mem: {stats.memMb}MB</div>}
    </div>
  );
}