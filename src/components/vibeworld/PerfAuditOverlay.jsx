/**
 * PerfAuditOverlay — Mobile performance audit tool for Upper Vibe City.
 * Activated via ?perf=1 in the URL (admin/testing only).
 *
 * Tracks per-zone:
 *  - FPS (rolling 60-frame average)
 *  - Frame time (ms) + worst spike
 *  - Visible mesh count (from Three.js renderer info)
 *  - Draw calls
 *  - Memory (if available)
 *  - Active lights, transparent objects, animated count
 *
 * Zone transitions are tracked automatically via playerPos proximity.
 */
import React, { useEffect, useRef, useState, useCallback } from "react";

const isAudit = () => {
  try { return new URLSearchParams(window.location.search).get("perf") === "1"; } catch { return false; }
};

// Zone definitions — matches CityCanvas world layout
const ZONES = [
  { id: "music_stage",     name: "Music Stage",       x:   0, z: -32, r: 10 },
  { id: "dance_floor",     name: "Dance Floor / DJ",  x:   0, z: -13, r: 11 },
  { id: "vibe_lounge",     name: "Vibe Lounge",        x: -22, z: -26, r:  7 },
  { id: "music_library",   name: "Music Library",      x:  22, z: -20, r:  7 },
  { id: "visualizer_dome", name: "Visualizer Dome",    x: -13, z:   3, r:  7 },
  { id: "vibe_check",      name: "Daily Vibe Check",   x: -16, z: -13, r:  6 },
  { id: "crystal_zone",    name: "Crystal Zone",       x: -26, z: -14, r:  7 },
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

// Rolling average
function rollingAvg(arr) {
  if (!arr.length) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

export default function PerfAuditOverlay({ playerPos, rendererRef }) {
  const [visible] = useState(isAudit);
  const [stats, setStats] = useState({
    fps: 0, frameMs: 0, worstMs: 0,
    drawCalls: 0, triangles: 0, geometries: 0, textures: 0,
    currentZone: "—", zoneHistory: {},
    log: [],
  });

  const fpsBuffer    = useRef([]);
  const frameMsBuffer= useRef([]);
  const lastFrameRef = useRef(performance.now());
  const frameCount   = useRef(0);
  const rafRef       = useRef(null);
  const prevZoneRef  = useRef(null);
  const worstMsRef   = useRef(0);

  // Per-zone accumulated stats
  const zoneStatsRef = useRef({});

  const addLog = useCallback((msg, color = "#FFEE88") => {
    setStats(s => ({
      ...s,
      log: [{ msg, color, t: performance.now() }, ...s.log].slice(0, 18),
    }));
  }, []);

  useEffect(() => {
    if (!visible) return;

    const tick = () => {
      rafRef.current = requestAnimationFrame(tick);
      const now = performance.now();
      const dt = now - lastFrameRef.current;
      lastFrameRef.current = now;
      frameCount.current++;

      if (dt <= 0 || dt > 500) return; // skip abnormal frames

      const fps = 1000 / dt;
      fpsBuffer.current.push(fps);
      frameMsBuffer.current.push(dt);
      if (fpsBuffer.current.length > 60) { fpsBuffer.current.shift(); frameMsBuffer.current.shift(); }

      if (dt > worstMsRef.current) worstMsRef.current = dt;

      // Read renderer info if available
      let drawCalls = 0, triangles = 0, geometries = 0, textures = 0;
      const renderer = rendererRef?.current;
      if (renderer?.info) {
        drawCalls  = renderer.info.render?.calls    ?? 0;
        triangles  = renderer.info.render?.triangles ?? 0;
        geometries = renderer.info.memory?.geometries ?? 0;
        textures   = renderer.info.memory?.textures   ?? 0;
      }

      // Zone from playerPos
      const px = playerPos?.x ?? 0;
      const pz = playerPos?.z ?? 0;
      const zoneId = getZoneId(px, pz);

      // Zone transition detection
      if (zoneId !== prevZoneRef.current) {
        prevZoneRef.current = zoneId;
        worstMsRef.current = dt; // reset worst on zone change
      }

      // Accumulate per-zone stats
      if (!zoneStatsRef.current[zoneId]) {
        zoneStatsRef.current[zoneId] = { fpsSamples: [], msSamples: [], worst: 0, entries: 0 };
      }
      const zs = zoneStatsRef.current[zoneId];
      zs.fpsSamples.push(fps);
      zs.msSamples.push(dt);
      if (zs.fpsSamples.length > 120) { zs.fpsSamples.shift(); zs.msSamples.shift(); }
      if (dt > zs.worst) zs.worst = dt;

      // Update display every 10 frames
      if (frameCount.current % 10 === 0) {
        const avgFps = rollingAvg(fpsBuffer.current);
        const avgMs  = rollingAvg(frameMsBuffer.current);

        // Build zone summary for display
        const zoneHistory = {};
        for (const [id, zs] of Object.entries(zoneStatsRef.current)) {
          if (zs.fpsSamples.length < 5) continue;
          zoneHistory[id] = {
            avgFps: rollingAvg(zs.fpsSamples),
            minFps: Math.min(...zs.fpsSamples),
            worst:  zs.worst,
            samples: zs.fpsSamples.length,
          };
        }

        setStats(s => ({
          ...s,
          fps: avgFps,
          frameMs: avgMs,
          worstMs: worstMsRef.current,
          drawCalls, triangles, geometries, textures,
          currentZone: zoneId,
          zoneHistory,
        }));
      }
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [visible, playerPos, rendererRef, addLog]);

  if (!visible) return null;

  const fps = stats.fps;
  const fpsColor = fps < 20 ? "#FF4444" : fps < 30 ? "#FFAA00" : fps < 45 ? "#FFE044" : "#44FF88";

  // Sort zones by avgFps ascending (worst first)
  const sortedZones = Object.entries(stats.zoneHistory)
    .sort((a, b) => a[1].avgFps - b[1].avgFps);

  return (
    <div
      style={{
        position: "fixed",
        top: 60,
        right: 4,
        zIndex: 9999,
        background: "rgba(0,0,0,0.92)",
        border: "1px solid rgba(0,200,255,0.35)",
        borderRadius: "8px",
        padding: "7px 9px",
        fontFamily: "monospace",
        fontSize: "9px",
        color: "#aaa",
        lineHeight: 1.55,
        pointerEvents: "none",
        maxWidth: "188px",
        maxHeight: "85vh",
        overflowY: "auto",
      }}
    >
      <div style={{ color: "#FF4FC3", fontWeight: "bold", marginBottom: 3, fontSize: 10 }}>
        ⚡ PERF AUDIT
      </div>

      {/* Live frame stats */}
      <Row k="FPS" v={fps.toFixed(1)} vc={fpsColor} />
      <Row k="frame ms" v={stats.frameMs.toFixed(1)} vc={stats.frameMs > 33 ? "#FF8844" : "#88FF88"} />
      <Row k="worst ms" v={stats.worstMs.toFixed(1)} vc={stats.worstMs > 50 ? "#FF4444" : "#FFAA44"} />
      <Row k="draw calls" v={stats.drawCalls} />
      <Row k="triangles" v={(stats.triangles / 1000).toFixed(1) + "k"} />
      <Row k="geometries" v={stats.geometries} />
      <Row k="textures" v={stats.textures} />
      <Row k="zone" v={getZoneName(stats.currentZone)} vc="#00E5FF" />
      <Row k="pos" v={`${playerPos?.x?.toFixed(0)},${playerPos?.z?.toFixed(0)}`} />

      {/* Zone FPS table */}
      {sortedZones.length > 0 && (
        <div style={{ marginTop: 6, borderTop: "1px solid rgba(255,255,255,0.08)", paddingTop: 4 }}>
          <div style={{ color: "#FF4FC3", marginBottom: 2, fontSize: 8.5 }}>ZONE AVG FPS (worst first)</div>
          {sortedZones.slice(0, 12).map(([id, zs]) => {
            const active = id === stats.currentZone;
            const c = zs.avgFps < 20 ? "#FF4444" : zs.avgFps < 30 ? "#FFAA00" : zs.avgFps < 45 ? "#FFE044" : "#44FF88";
            return (
              <div key={id} style={{ display: "flex", justifyContent: "space-between", gap: 4,
                background: active ? "rgba(0,200,255,0.08)" : "transparent",
                borderRadius: 3, padding: "0 2px" }}>
                <span style={{ color: active ? "#00E5FF" : "rgba(255,255,255,0.45)", maxWidth: 98, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {active ? "▶ " : ""}{getZoneName(id)}
                </span>
                <span style={{ color: c, whiteSpace: "nowrap" }}>
                  {zs.avgFps.toFixed(0)} / {zs.minFps.toFixed(0)} <span style={{ color: "#888" }}>({(zs.worst).toFixed(0)}ms)</span>
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* Legend */}
      <div style={{ marginTop: 5, borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: 3, fontSize: 7.5, color: "#666" }}>
        avg / min fps (worst frame ms)
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