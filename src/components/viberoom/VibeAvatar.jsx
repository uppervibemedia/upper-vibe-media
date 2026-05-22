import React from "react";

// Deterministic color from a string
function nameToColor(name = "") {
  const colors = [
    ["#7C3AED", "#9B7EFF"], // purple
    ["#0891B2", "#00E5FF"], // cyan
    ["#B45309", "#F59E0B"], // amber
    ["#BE185D", "#EC4899"], // pink
    ["#065F46", "#10B981"], // emerald
    ["#1D4ED8", "#60A5FA"], // blue
    ["#7C2D12", "#F97316"], // orange
    ["#4C1D95", "#A78BFA"], // violet
  ];
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xffffffff;
  const [from, to] = colors[Math.abs(h) % colors.length];
  return { from, to };
}

export default function VibeAvatar({ name = "?", avatarUrl = null, size = 36, glowColor = null, onClick }) {
  const { from, to } = nameToColor(name);
  const letter = name[0]?.toUpperCase() || "?";
  const glow = glowColor || from;

  const commonStyle = {
    width: size,
    height: size,
    borderRadius: "50%",
    flexShrink: 0,
    cursor: onClick ? "pointer" : "default",
    boxShadow: `0 0 ${Math.round(size * 0.55)}px ${glow}33`,
    border: `1.5px solid ${from}55`,
  };

  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={name}
        onClick={onClick}
        style={{
          ...commonStyle,
          objectFit: "cover",
        }}
      />
    );
  }

  return (
    <div
      onClick={onClick}
      style={{
        ...commonStyle,
        background: `linear-gradient(135deg, ${from}55, ${to}33)`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "var(--font-heading)",
        fontWeight: 900,
        fontSize: Math.round(size * 0.38),
        color: to,
        userSelect: "none",
      }}>
      {letter}
    </div>
  );
}