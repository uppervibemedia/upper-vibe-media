/**
 * ZoneSign — Premium holographic wayfinding signs for Upper Vibe City.
 * Slim pill panel: dark glass backing + thin neon border + icon + label.
 * Static glow only (no animation). Billboards toward player each frame via CityCanvas.
 */
import * as THREE from "three";

const { Group, Mesh, SphereGeometry, MeshBasicMaterial, Color } = THREE;

// ─── Zone icon glyphs ────────────────────────────────────────────
const ZONE_ICONS = {
  "MUSIC  STAGE":             "♪",
  "UVC  ·  BEACH  DISTRICT":  "〰",
  "UPPER  VIBE  MEDIA":       "◈",
  "VIBE  LAUNCH  ZONE":       "↑",
  "VIBE  LOUNGE":             "✦",
  "MUSIC  LIBRARY":           "⌘",
  "VISUALIZER  DOME":         "◉",
  "DAILY  VIBE  CHECK":       "✓",
  "VIBE  ACADEMY":            "◎",
  "CRYSTAL  ZONE":            "◇",
  "NEON  SURF  BEACH":        "⚡",
  "NEON  VIBE  WHEEL":        "○",
};

/**
 * createZoneSign(scene, x, y, z, text, colorHex)
 * Places a premium holographic zone banner at world position (x, y, z).
 * Signs billboard toward the player automatically — CityCanvas calls child.lookAt(camera.position).
 */
export function createZoneSign(scene, x, y, z, text, colorHex) {
  const group = new Group();
  group.name = "neonSign_" + text.replace(/\s+/g, "");

  const icon = ZONE_ICONS[text] || "·";

  // ── Sizing constants ──────────────────────────────────────────
  const CANVAS_H  = 64;   // logical canvas height (px)
  const FONT_SIZE = 20;
  const ICON_SIZE = 22;
  const PAD_X     = 24;
  const ICON_GAP  = 8;
  const SCALE2X   = 2;   // 2× for retina sharpness

  // Measure text to size canvas width
  const tmpC = document.createElement("canvas");
  const tmpCtx = tmpC.getContext("2d");
  tmpCtx.font = `bold ${FONT_SIZE}px 'Syne','Inter',sans-serif`;
  const labelW = tmpCtx.measureText(text).width;
  tmpCtx.font = `${ICON_SIZE}px sans-serif`;
  const iconW = tmpCtx.measureText(icon).width;
  const totalTextW = iconW + ICON_GAP + labelW;
  const canvasW = Math.max(200, Math.ceil(totalTextW) + PAD_X * 2);

  // Draw at 2× for crispness
  const canvas = document.createElement("canvas");
  canvas.width  = canvasW * SCALE2X;
  canvas.height = CANVAS_H * SCALE2X;
  const ctx = canvas.getContext("2d");
  ctx.scale(SCALE2X, SCALE2X);

  const col = new Color(colorHex);
  const r = Math.round(col.r * 255);
  const g = Math.round(col.g * 255);
  const b = Math.round(col.b * 255);
  const colRGB = `${r},${g},${b}`;

  // ── Rounded-rect clip path ────────────────────────────────────
  const rr = 9;
  function roundRect(cx, w, h, rad) {
    cx.beginPath();
    cx.moveTo(rad, 0);
    cx.lineTo(w - rad, 0);
    cx.quadraticCurveTo(w, 0, w, rad);
    cx.lineTo(w, h - rad);
    cx.quadraticCurveTo(w, h, w - rad, h);
    cx.lineTo(rad, h);
    cx.quadraticCurveTo(0, h, 0, h - rad);
    cx.lineTo(0, rad);
    cx.quadraticCurveTo(0, 0, rad, 0);
    cx.closePath();
  }

  // Tinted glass panel — semi-transparent with zone color tint
  roundRect(ctx, canvasW, CANVAS_H, rr);
  ctx.fillStyle = `rgba(${colRGB},0.22)`;
  ctx.fill();

  // Gloss sheen (top highlight)
  roundRect(ctx, canvasW, CANVAS_H, rr);
  const gloss = ctx.createLinearGradient(0, 0, 0, CANVAS_H * 0.55);
  gloss.addColorStop(0, "rgba(255,255,255,0.12)");
  gloss.addColorStop(1, "rgba(255,255,255,0.0)");
  ctx.fillStyle = gloss;
  ctx.fill();

  // Thin neon border — brighter, more visible
  roundRect(ctx, canvasW, CANVAS_H, rr);
  ctx.save();
  ctx.shadowColor = colorHex;
  ctx.shadowBlur = 18;
  ctx.strokeStyle = `rgba(${colRGB},1.0)`;
  ctx.lineWidth = 2.2;
  ctx.stroke();
  ctx.restore();

  // Left accent bar
  const barH = CANVAS_H * 0.50;
  const barY = (CANVAS_H - barH) / 2;
  ctx.fillStyle = `rgba(${colRGB},1.0)`;
  ctx.fillRect(6, barY, 3, barH);

  // Icon
  const textStartX = PAD_X + 6;
  ctx.save();
  ctx.font = `${ICON_SIZE}px sans-serif`;
  ctx.fillStyle = `rgba(${colRGB},1)`;
  ctx.shadowColor = colorHex;
  ctx.shadowBlur = 14;
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText(icon, textStartX, CANVAS_H / 2);
  ctx.restore();

  // Label — drawn twice: colored glow pass then sharp white pass
  const labelX = textStartX + iconW + ICON_GAP;
  // Glow pass
  ctx.save();
  ctx.font = `bold ${FONT_SIZE}px 'Syne','Inter',sans-serif`;
  ctx.fillStyle = `rgba(${colRGB},0.55)`;
  ctx.shadowColor = colorHex;
  ctx.shadowBlur = 20;
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText(text, labelX, CANVAS_H / 2);
  ctx.restore();
  // Sharp white pass
  ctx.save();
  ctx.font = `bold ${FONT_SIZE}px 'Syne','Inter',sans-serif`;
  ctx.fillStyle = "#FFFFFF";
  ctx.shadowColor = colorHex;
  ctx.shadowBlur = 8;
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText(text, labelX, CANVAS_H / 2);
  ctx.restore();

  const tex = new THREE.CanvasTexture(canvas);
  tex.minFilter = THREE.LinearFilter;
  tex.colorSpace = THREE.SRGBColorSpace;

  // World-space size — compact, eye-level readable
  // Max width 2.6 world units (~1m real scale), scales with text length
  const worldW = Math.max(1.4, Math.min(2.6, (canvasW / 320) * 2.4));
  const worldH = worldW * (CANVAS_H / canvasW) * SCALE2X * 0.5; // 0.5 compensates for 2× canvas

  const spriteMat = new THREE.SpriteMaterial({
    map: tex,
    transparent: true,
    depthWrite: false,
    depthTest: true,
    opacity: 0.97,
  });
  const sprite = new THREE.Sprite(spriteMat);
  sprite.scale.set(worldW, worldH, 1);
  sprite.renderOrder = 3;
  group.add(sprite);

  // Tiny color-matched neon dot (left anchor)
  const dot = new Mesh(
    new SphereGeometry(0.03, 6, 4),
    new MeshBasicMaterial({ color: new Color(colorHex), depthWrite: false })
  );
  dot.position.set(-worldW * 0.5 + 0.04, 0, 0.01);
  group.add(dot);

  group.position.set(x, y, z);
  group.userData = { isNeonSign: true, colorHex };
  scene.add(group);
}