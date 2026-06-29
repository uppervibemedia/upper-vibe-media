import React from "react";

export default function CityAudioDebugPanel({ snapshot }) {
  if (!snapshot?.isIOS) return null;

  const rows = [
    ["isIOS", String(snapshot.isIOS)],
    ["isPWA", String(snapshot.isPWA)],
    ["cityAudioMode", snapshot.cityAudioMode],
    ["isUserInsideDanceFloor", String(snapshot.isUserInsideDanceFloor)],
    ["globalAudioPaused", String(snapshot.globalAudioPaused)],
    ["globalAudioMuted", String(snapshot.globalAudioMuted)],
    ["globalAudioVolume", snapshot.globalAudioVolume],
    ["liveDjPaused", String(snapshot.liveDjPaused)],
    ["liveDjMuted", String(snapshot.liveDjMuted)],
    ["liveDjVolume", snapshot.liveDjVolume],
    ["currentGlobalTrack", snapshot.currentGlobalTrack],
    ["currentDjTrack", snapshot.currentDjTrack],
  ];

  return (
    <div
      style={{
        position: "fixed",
        left: "calc(env(safe-area-inset-left, 0px) + 8px)",
        bottom: "calc(env(safe-area-inset-bottom, 0px) + 118px)",
        zIndex: 9999,
        maxWidth: "290px",
        padding: "8px 10px",
        borderRadius: "10px",
        background: "rgba(0,0,0,0.82)",
        border: "1px solid rgba(0,229,255,0.45)",
        color: "#00E5FF",
        fontFamily: "monospace",
        fontSize: "9px",
        lineHeight: 1.45,
        pointerEvents: "none",
      }}
    >
      <div style={{ color: "#F5A800", fontWeight: 900, marginBottom: 4 }}>CITY AUDIO DEBUG</div>
      {rows.map(([label, value]) => (
        <div key={label} style={{ display: "grid", gridTemplateColumns: "126px 1fr", gap: 6 }}>
          <span style={{ color: "rgba(255,255,255,0.55)" }}>{label}</span>
          <span style={{ color: "#00E5FF", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{value}</span>
        </div>
      ))}
    </div>
  );
}