/**
 * MobileDebugOverlay — development-only overlay showing real viewport geometry.
 * Only renders when ?debug=mobile is in the URL.
 * Shows: viewport, safe-areas, joystick coords, player coords, active zone, media mode.
 */
import React, { useState, useEffect } from "react";

const isDebug = () => {
  try {
    return new URLSearchParams(window.location.search).get("debug") === "mobile";
  } catch { return false; }
};

export default function MobileDebugOverlay({ layout, zone, mediaMode, playerPos }) {
  const [show] = useState(isDebug);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!show) return;
    const t = setInterval(() => setTick(v => v + 1), 500);
    return () => clearInterval(t);
  }, [show]);

  if (!show || !layout) return null;

  const vvp = window.visualViewport;
  const sa = layout.sa;

  const rows = [
    ["viewport", `${layout.vw}×${layout.vh} (${layout.isLandscape ? "LS" : "PT"})`],
    ["innerWH", `${window.innerWidth}×${window.innerHeight}`],
    ["visualVP", vvp ? `${Math.round(vvp.width)}×${Math.round(vvp.height)}` : "n/a"],
    ["sa-top", `${sa.top}px`],
    ["sa-bottom", `${sa.bottom}px`],
    ["sa-left", `${sa.left}px`],
    ["sa-right", `${sa.right}px`],
    ["joy.cx", `${Math.round(layout.joystick.cx)}px`],
    ["joy.cyBot", `${Math.round(layout.joystick.cyFromBottom)}px`],
    ["joy.size", `${layout.joystick.size}px`],
    ["playerBot", `${Math.round(layout.playerBottom)}px`],
    ["playerLeft", `${Math.round(layout.playerLeft)}px`],
    ["actionBot", `${Math.round(layout.actionBottom)}px`],
    ["zone", zone?.id || "—"],
    ["media", mediaMode || "none"],
    ["pos", playerPos ? `${playerPos.x?.toFixed(1)},${playerPos.z?.toFixed(1)}` : "—"],
  ];

  return (
    <div
      style={{
        position: "fixed",
        top: sa.top + 50,
        right: 4,
        zIndex: 9999,
        background: "rgba(0,0,0,0.85)",
        border: "1px solid rgba(0,200,255,0.4)",
        borderRadius: "8px",
        padding: "6px 8px",
        fontFamily: "monospace",
        fontSize: "9px",
        color: "#00E5FF",
        lineHeight: "1.5",
        pointerEvents: "none",
        maxWidth: "160px",
      }}
    >
      <div style={{ color: "#FF4FC3", fontWeight: "bold", marginBottom: 2 }}>📐 DEBUG</div>
      {rows.map(([k, v]) => (
        <div key={k} style={{ display: "flex", justifyContent: "space-between", gap: 6 }}>
          <span style={{ color: "rgba(255,255,255,0.5)" }}>{k}</span>
          <span style={{ color: "#00E5FF" }}>{v}</span>
        </div>
      ))}
    </div>
  );
}