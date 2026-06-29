/**
 * PerfAuditOverlay — TV Mode performance audit overlay for Upper Vibe City.
 *
 * Activated via ?perf=1 in the URL.
 * Extra TV Mode columns shown via ?perf=1&tv=1
 *
 * Tracks per-zone:
 *  - FPS (rolling 60-frame average), min FPS, worst frame ms
 *  - Draw calls, triangles, geometries, textures (from renderer.info)
 *  - TV Mode status & quality
 *  - Pixel ratio
 *  - Renderer memory (geometries + textures)
 *  - Active lights, transparent objects count (via scene traverse)
 *  - Active visible mesh count
 *  - Sky/planet/particle system status
 */
import React, { useEffect, useRef, useState, useCallback } from "react";

const params = () => { try { return new URLSearchParams(window.location.search); } catch { return new URLSearchParams(); } };
const isAudit = () => params().get("perf") === "1";
const isTvAudit = () => params().get("tv") === "1";

// Zone definitions — matches CityCanvas world layout
const ZONES = [
  { id: "music_stage",     name: "Music Stage",       x:   0, z: -32, r: 10 },
  { id: "dance_floor",     name: "Dance Floor / DJ",  x:   0, z: -13, r: 11 },
  { id: "vibe_lounge",     name: "Vibe Lounge",        x: -22, z: -26, r:  7 },
  { id: "music_library",   name: "Music Library",      x:  22, z: -20, r:  7 },
  { id: "visualizer_dome", name: "Visualizer Dome",    x: -13, z:   3, r:  7 },
  { id: "vibe_check",      name: "Daily Vibe Check",   x: -16, z: -13, r:  6 },
  { id: "crystal_zone",    name: "Crystal Zone",       x:  28, z:  -7, r:  7 },
  { id: "vibe_academy",    name: "Vibe Academy",       x: -28, z:   5, r:  7 },
  { id: "vibe_launch",     name: "Vibe Launch Zone",   x:   0, z:   4, r:  8 },
  { id: "neon_surf_beach", name: "Neon Surf Beach",    x:  18, z:  22, r: 12 },
  { id: "zen_beach",       name: "Zen Beach",          x: -20, z:  22, r:  8 },
  { id: "ferris_wheel",    name: "Ferris Wheel",       x:  22, z:   5, r:  9 },
  { id: "skyline_north",   name: "Skyline / Buildings",x:   0, z: -36, r:  6 },
  { id: "plaza",           name: "Open Plaza",         x:   0, z:   0, r:  6 },
];

function getZoneId(x, z) {
  let best = null, bestDist = Infinity;
  for (const zone of ZONES) {
    const dx = x - zone.x, dz = z - zone.z;
    const d = Math.sqrt(dx * dx + dz * dz);
    if (d < zone.r && d < bestDist) { bestDist = d; best = zone; }
  }
  return best?.id || "open";
}

function getZoneName(id) {
  return ZONES.find(z => z.id === id)?.name || id;
}

function rollingAvg(arr) {
  if (!arr.length) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

// Count specific scene objects — called every 30 frames to avoid overhead
function countSceneObjects(scene) {
  if (!scene) return { meshes: 0, lights: 0, transparent: 0, points: 0, sprites: 0 };
  let meshes = 0, lights = 0, transparent = 0, points = 0, sprites = 0;
  scene.traverse((obj) => {
    if (!obj.visible) return;
    if (obj.isLight) { lights++; return; }
    if (obj.isPoints) { points++; return; }
    if (obj.isSprite) { sprites++; return; }
    if (obj.isMesh) {
      meshes++;
      const m = Array.isArray(obj.material) ? obj.material[0] : obj.material;
      if (m?.transparent && m?.opacity < 1) transparent++;
    }
  });
  return { meshes, lights, transparent, points, sprites };
}

export default function PerfAuditOverlay({ playerPos, rendererRef, sceneRef, tvMode, tvQuality }) {
  const [visible] = useState(isAudit);
  const [tvCol] = useState(isTvAudit);

  const [stats, setStats] = useState({
    fps: 0, frameMs: 0, worstMs: 0,
    drawCalls: 0, triangles: 0, geometries: 0, textures: 0,
    currentZone: "—", zoneHistory: {},
    pixelRatio: window.devicePixelRatio || 1,
    meshes: 0, lights: 0, transparent: 0, points: 0, sprites: 0,
    rendererMem: "—",
  });

  const fpsBuffer    = useRef([]);
  const frameMsBuffer= useRef([]);
  const lastFrameRef = useRef(performance.now());
  const frameCount   = useRef(0);
  const rafRef       = useRef(null);
  const prevZoneRef  = useRef(null);
  const worstMsRef   = useRef(0);
  const zoneStatsRef = useRef({});
  const sceneCountRef = useRef({ meshes: 0, lights: 0, transparent: 0, points: 0, sprites: 0 });

  useEffect(() => {
    if (!visible) return;

    const tick = () => {
      rafRef.current = requestAnimationFrame(tick);
      const now = performance.now();
      const dt = now - lastFrameRef.current;
      lastFrameRef.current = now;
      frameCount.current++;

      if (dt <= 0 || dt > 500) return;

      const fps = 1000 / dt;
      fpsBuffer.current.push(fps);
      frameMsBuffer.current.push(dt);
      if (fpsBuffer.current.length > 60) { fpsBuffer.current.shift(); frameMsBuffer.current.shift(); }
      if (dt > worstMsRef.current) worstMsRef.current = dt;

      // Renderer info
      let drawCalls = 0, triangles = 0, geometries = 0, textures = 0, memStr = "—";
      const renderer = rendererRef?.current;
      if (renderer?.info) {
        drawCalls  = renderer.info.render?.calls    ?? 0;
        triangles  = renderer.info.render?.triangles ?? 0;
        geometries = renderer.info.memory?.geometries ?? 0;
        textures   = renderer.info.memory?.textures   ?? 0;
        // renderer.info.memory gives geometry + texture counts (proxy for VRAM)
        memStr = `${geometries}g/${textures}t`;
      }

      // Zone
      const px = playerPos?.x ?? 0;
      const pz = playerPos?.z ?? 0;
      const zoneId = getZoneId(px, pz);
      if (zoneId !== prevZoneRef.current) {
        prevZoneRef.current = zoneId;
        worstMsRef.current = dt;
      }

      // Per-zone accumulation
      if (!zoneStatsRef.current[zoneId]) {
        zoneStatsRef.current[zoneId] = { fpsSamples: [], msSamples: [], worst: 0 };
      }
      const zs = zoneStatsRef.current[zoneId];
      zs.fpsSamples.push(fps);
      zs.msSamples.push(dt);
      if (zs.fpsSamples.length > 120) { zs.fpsSamples.shift(); zs.msSamples.shift(); }
      if (dt > zs.worst) zs.worst = dt;

      // Scene object counts — every 30 frames (expensive traverse)
      if (frameCount.current % 30 === 0 && sceneRef?.current) {
        sceneCountRef.current = countSceneObjects(sceneRef.current);
      }

      // Pixel ratio (may change when TV Mode toggles)
      const pr = renderer ? renderer.getPixelRatio() : (window.devicePixelRatio || 1);

      // Update display every 10 frames
      if (frameCount.current % 10 === 0) {
        const avgFps = rollingAvg(fpsBuffer.current);
        const avgMs  = rollingAvg(frameMsBuffer.current);

        const zoneHistory = {};
        for (const [id, zs] of Object.entries(zoneStatsRef.current)) {
          if (zs.fpsSamples.length < 5) continue;
          zoneHistory[id] = {
            avgFps: rollingAvg(zs.fpsSamples),
            minFps: Math.min(...zs.fpsSamples),
            worst:  zs.worst,
          };
        }

        setStats(s => ({
          ...s,
          fps: avgFps, frameMs: avgMs, worstMs: worstMsRef.current,
          drawCalls, triangles, geometries, textures,
          currentZone: zoneId, zoneHistory,
          pixelRatio: pr,
          rendererMem: memStr,
          ...sceneCountRef.current,
        }));
      }
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [visible, playerPos, rendererRef, sceneRef]);

  if (!visible) return null;

  const fps = stats.fps;
  const fpsColor = fps < 20 ? "#FF4444" : fps < 30 ? "#FFAA00" : fps < 45 ? "#FFE044" : "#44FF88";

  // Sort zones by avgFps ascending (worst first)
  const sortedZones = Object.entries(stats.zoneHistory)
    .sort((a, b) => a[1].avgFps - b[1].avgFps);

  const tvOn = tvMode;
  const tvQ = tvQuality;
  const tvLabel = tvOn ? (tvQ === "smooth" ? "🔵 Smooth" : "⚪ Normal") : "OFF";
  const tvColor = tvOn ? (tvQ === "smooth" ? "#00E5FF" : "#AAAAAA") : "#FF6666";

  return (
    <div
      style={{
        position: "fixed",
        top: 56,
        right: 4,
        zIndex: 9999,
        background: "rgba(0,0,0,0.93)",
        border: "1px solid rgba(0,200,255,0.35)",
        borderRadius: "8px",
        padding: "7px 9px",
        fontFamily: "monospace",
        fontSize: "9px",
        color: "#aaa",
        lineHeight: 1.55,
        pointerEvents: "none",
        maxWidth: tvCol ? "230px" : "192px",
        maxHeight: "90vh",
        overflowY: "auto",
      }}
    >
      <div style={{ color: "#FF4FC3", fontWeight: "bold", marginBottom: 3, fontSize: 10 }}>
        ⚡ PERF {tvCol ? "+ TV AUDIT" : "AUDIT"}
      </div>

      {/* Live frame stats */}
      <Row k="FPS"       v={fps.toFixed(1)}              vc={fpsColor} />
      <Row k="frame ms"  v={stats.frameMs.toFixed(1)}    vc={stats.frameMs > 33 ? "#FF8844" : "#88FF88"} />
      <Row k="worst ms"  v={stats.worstMs.toFixed(1)}    vc={stats.worstMs > 50 ? "#FF4444" : "#FFAA44"} />
      <Row k="draw calls" v={stats.drawCalls} />
      <Row k="triangles" v={(stats.triangles / 1000).toFixed(1) + "k"} />
      <Row k="geo/tex"   v={stats.rendererMem} />
      <Row k="px ratio"  v={stats.pixelRatio.toFixed(2)} vc={stats.pixelRatio > 1.5 ? "#FFAA00" : "#44FF88"} />

      {/* TV Mode block */}
      {tvCol && (
        <>
          <div style={{ height: 1, background: "rgba(0,200,255,0.12)", margin: "4px 0" }} />
          <Row k="TV Mode"   v={tvLabel} vc={tvColor} />
          <Row k="meshes"    v={stats.meshes} />
          <Row k="lights"    v={stats.lights}     vc={stats.lights > 12 ? "#FFAA00" : "#88FF88"} />
          <Row k="transp."   v={stats.transparent} vc={stats.transparent > 30 ? "#FF8844" : "#88FF88"} />
          <Row k="particles" v={stats.points}     vc={stats.points > 5 ? "#FFAA00" : "#88FF88"} />
          <Row k="sprites"   v={stats.sprites}    vc={stats.sprites > 15 ? "#FFAA00" : "#88FF88"} />
        </>
      )}

      <Row k="zone" v={getZoneName(stats.currentZone)} vc="#00E5FF" />
      <Row k="pos"  v={`${playerPos?.x?.toFixed(0)},${playerPos?.z?.toFixed(0)}`} />

      {/* Zone FPS table */}
      {sortedZones.length > 0 && (
        <div style={{ marginTop: 6, borderTop: "1px solid rgba(255,255,255,0.08)", paddingTop: 4 }}>
          <div style={{ color: "#FF4FC3", marginBottom: 2, fontSize: 8.5 }}>ZONE AVG / MIN (worst ms)</div>
          {sortedZones.slice(0, 14).map(([id, zs]) => {
            const active = id === stats.currentZone;
            const c = zs.avgFps < 20 ? "#FF4444" : zs.avgFps < 30 ? "#FFAA00" : zs.avgFps < 45 ? "#FFE044" : "#44FF88";
            return (
              <div key={id} style={{
                display: "flex", justifyContent: "space-between", gap: 4,
                background: active ? "rgba(0,200,255,0.08)" : "transparent",
                borderRadius: 3, padding: "0 2px",
              }}>
                <span style={{
                  color: active ? "#00E5FF" : "rgba(255,255,255,0.45)",
                  maxWidth: 104, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                }}>
                  {active ? "▶ " : ""}{getZoneName(id)}
                </span>
                <span style={{ color: c, whiteSpace: "nowrap" }}>
                  {zs.avgFps.toFixed(0)}/{zs.minFps.toFixed(0)}
                  <span style={{ color: "#888" }}> ({zs.worst.toFixed(0)})</span>
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* TV Mode audit legend */}
      {tvCol && (
        <div style={{ marginTop: 5, borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: 3, fontSize: 7.5, color: "#555", lineHeight: 1.6 }}>
          <div style={{ color: "#FF4FC3", marginBottom: 2 }}>TV LAG RISK (code audit)</div>
          <div>🔴 Stage tex update → 5fps mob/15fps desk</div>
          <div>🟠 Ocean waves → desktop only, skip mob</div>
          <div>🟠 Lounge neon pulse → skipped in Smooth</div>
          <div>🟠 Neon ambient lights → skipped in Smooth</div>
          <div>🟡 Skyline neon → skipped in Smooth</div>
          <div>🟡 Crystal zone → distance-gated</div>
          <div>🟡 Ferris wheel → distance-gated</div>
          <div>🟢 Planets → camera-relative, depthTest off</div>
          <div>🟢 Stars → Points follow camera, no update cost</div>
          <div style={{ marginTop: 3, color: "#888" }}>px ratio: Smooth=1.25 / Normal=1.5 cap</div>
        </div>
      )}

      {/* Standard legend */}
      <div style={{ marginTop: 5, borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: 3, fontSize: 7.5, color: "#666" }}>
        avg/min fps (worst frame ms) · ?perf=1&tv=1 for TV view
      </div>
    </div>
  );
}

function Row({ k, v, vc }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 6 }}>
      <span style={{ color: "rgba(255,255,255,0.4)" }}>{k}</span>
      <span style={{ color: vc || "#00E5FF" }}>{v}</span>
    </div>
  );
}