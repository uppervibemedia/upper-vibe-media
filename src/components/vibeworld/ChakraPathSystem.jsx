import * as THREE from "three";

const IS_MOBILE = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent || "");
const Y_LINE = 0.032;
const Y_SYMBOL = 0.046;

export const CHAKRA_PATH_POINTS = [
  { x: 0, z: 1.45, type: "anchor" },
  { x: -1.7, z: 2.55, type: "chakra", key: "root", label: "ROOT", mantra: "LAM", color: "#FF3B30" },
  { x: -1.15, z: 3.85, type: "chakra", key: "sacral", label: "SACRAL", mantra: "VAM", color: "#FF8A00" },
  { x: -0.58, z: 5.12, type: "chakra", key: "solar", label: "SOLAR", mantra: "RAM", color: "#FFD36E" },
  { x: 0, z: 6.42, type: "chakra", key: "heart", label: "HEART", mantra: "YAM", color: "#42FF9B" },
  { x: 0.58, z: 7.72, type: "chakra", key: "throat", label: "THROAT", mantra: "HAM", color: "#00E5FF" },
  { x: 1.15, z: 9.02, type: "chakra", key: "thirdEye", label: "THIRD EYE", mantra: "OM", color: "#7C8CFF" },
  { x: 1.7, z: 10.32, type: "chakra", key: "crown", label: "CROWN", mantra: "AH", color: "#C58CFF" },
  { x: 0, z: 12.25, type: "leaderboard" },
  { x: 0, z: 17.8, type: "guide" },
  { x: 0, z: 21.9, type: "ferris" },
];

function hexToRgba(hex, alpha) {
  const raw = String(hex || "#00E5FF").replace("#", "");
  const full = raw.length === 3 ? raw.split("").map((c) => c + c).join("") : raw;
  const n = parseInt(full.slice(0, 6), 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return `rgba(${r},${g},${b},${alpha})`;
}

function makeLineMat(color, opacity) {
  return new THREE.MeshBasicMaterial({
    color: new THREE.Color(color),
    transparent: true,
    opacity,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2,
  });
}

function makeSegment(a, b, width, color, opacity, yOffset = 0) {
  const dx = b.x - a.x;
  const dz = b.z - a.z;
  const len = Math.sqrt(dx * dx + dz * dz);
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(len, 0.012, width), makeLineMat(color, opacity));
  mesh.position.set((a.x + b.x) / 2, Y_LINE + yOffset, (a.z + b.z) / 2);
  mesh.rotation.y = -Math.atan2(dz, dx);
  mesh.renderOrder = 5;
  mesh.userData.baseOpacity = opacity;
  return mesh;
}

function createSymbolTexture(chakra) {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, 256, 256);

  const grad = ctx.createRadialGradient(128, 128, 10, 128, 128, 120);
  grad.addColorStop(0, hexToRgba(chakra.color, 0.34));
  grad.addColorStop(0.46, hexToRgba(chakra.color, 0.13));
  grad.addColorStop(1, "rgba(0,229,255,0)");
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(128, 128, 122, 0, Math.PI * 2);
  ctx.fill();

  ctx.save();
  ctx.translate(128, 128);
  ctx.strokeStyle = chakra.color;
  ctx.globalAlpha = 0.82;
  ctx.lineWidth = 4;
  for (let i = 0; i < 12; i++) {
    ctx.rotate((Math.PI * 2) / 12);
    ctx.beginPath();
    ctx.ellipse(0, -62, 15, 38, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();

  ctx.strokeStyle = "rgba(0,229,255,0.82)";
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.arc(128, 128, 72, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = "rgba(255,211,110,0.55)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(128, 128, 88, 0, Math.PI * 2);
  ctx.stroke();

  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.shadowColor = chakra.color;
  ctx.shadowBlur = 18;
  ctx.fillStyle = "rgba(255,255,255,0.95)";
  ctx.font = "900 42px Syne, Inter, sans-serif";
  ctx.fillText(chakra.mantra, 128, 121);
  ctx.shadowBlur = 8;
  ctx.fillStyle = "rgba(223,251,255,0.82)";
  ctx.font = "900 18px Inter, sans-serif";
  ctx.fillText(chakra.label, 128, 163);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  return texture;
}

function makePromptSprite(chakra) {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, 512, 128);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.shadowColor = chakra.color;
  ctx.shadowBlur = 14;
  ctx.fillStyle = "rgba(0,229,255,0.22)";
  roundRect(ctx, 52, 24, 408, 80, 34);
  ctx.fill();
  ctx.strokeStyle = "rgba(0,229,255,0.52)";
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.fillStyle = "rgba(255,255,255,0.94)";
  ctx.font = "900 24px Inter, sans-serif";
  ctx.fillText(`${chakra.label}  •  TAP TO ACTIVATE`, 256, 64);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearFilter;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true, opacity: 0, depthWrite: false, depthTest: false }));
  sprite.scale.set(4.9, 1.22, 1);
  sprite.position.set(chakra.x, 1.18, chakra.z);
  sprite.renderOrder = 60;
  sprite.userData.baseY = 1.18;
  return sprite;
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

export function createChakraPathSystem(scene) {
  const group = new THREE.Group();
  group.name = "chakraPathSystem";

  const coreSegments = [];
  const glowSegments = [];
  for (let i = 0; i < CHAKRA_PATH_POINTS.length - 1; i++) {
    const a = CHAKRA_PATH_POINTS[i];
    const b = CHAKRA_PATH_POINTS[i + 1];
    const glow = makeSegment(a, b, 0.72, "#00E5FF", 0.12, -0.004);
    const core = makeSegment(a, b, 0.16, i >= 8 ? "#FFD36E" : "#00D4F0", i >= 8 ? 0.32 : 0.38, 0.004);
    const accent = makeSegment(a, b, 0.035, "#A078FF", 0.42, 0.011);
    group.add(glow, core, accent);
    glowSegments.push(glow);
    coreSegments.push(core, accent);
  }

  const chakras = [];
  CHAKRA_PATH_POINTS.filter((p) => p.type === "chakra").forEach((chakra, index) => {
    const symbol = new THREE.Mesh(
      new THREE.CircleGeometry(IS_MOBILE ? 0.72 : 0.86, IS_MOBILE ? 36 : 56),
      new THREE.MeshBasicMaterial({
        map: createSymbolTexture(chakra),
        transparent: true,
        opacity: 0.78,
        depthWrite: false,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
      })
    );
    symbol.rotation.x = -Math.PI / 2;
    symbol.position.set(chakra.x, Y_SYMBOL + index * 0.0006, chakra.z);
    symbol.renderOrder = 7;
    symbol.userData.baseScale = 1;
    symbol.userData.baseOpacity = 0.78;

    const halo = new THREE.Mesh(
      new THREE.RingGeometry(IS_MOBILE ? 0.82 : 0.98, IS_MOBILE ? 0.95 : 1.12, IS_MOBILE ? 36 : 56),
      makeLineMat(index === 6 ? "#FFD36E" : chakra.color, 0.34)
    );
    halo.rotation.x = -Math.PI / 2;
    halo.position.set(chakra.x, Y_SYMBOL + 0.01 + index * 0.0006, chakra.z);
    halo.renderOrder = 8;
    halo.userData.baseOpacity = 0.34;

    const prompt = makePromptSprite(chakra);
    group.add(symbol, halo, prompt);
    chakras.push({ ...chakra, symbol, halo, prompt, phase: index * 0.55 });
  });

  const flowDots = [];
  const dotCount = IS_MOBILE ? 5 : 8;
  for (let i = 0; i < dotCount; i++) {
    const dot = new THREE.Mesh(
      new THREE.CircleGeometry(IS_MOBILE ? 0.09 : 0.115, 18),
      makeLineMat(i % 3 === 0 ? "#FFD36E" : i % 2 === 0 ? "#A078FF" : "#00E5FF", 0.72)
    );
    dot.rotation.x = -Math.PI / 2;
    dot.position.y = Y_SYMBOL + 0.03;
    dot.renderOrder = 12;
    dot.userData.offset = i / dotCount;
    group.add(dot);
    flowDots.push(dot);
  }

  scene.add(group);
  scene.userData.chakraPathSystem = { group, chakras, flowDots, coreSegments, glowSegments, pathPoints: CHAKRA_PATH_POINTS };
  return group;
}

function pointOnPath(points, progress) {
  const lengths = [];
  let total = 0;
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i], b = points[i + 1];
    const len = Math.sqrt((b.x - a.x) ** 2 + (b.z - a.z) ** 2);
    lengths.push(len);
    total += len;
  }
  let target = ((progress % 1) + 1) % 1 * total;
  for (let i = 0; i < lengths.length; i++) {
    if (target <= lengths[i]) {
      const a = points[i], b = points[i + 1];
      const p = target / lengths[i];
      return { x: a.x + (b.x - a.x) * p, z: a.z + (b.z - a.z) * p };
    }
    target -= lengths[i];
  }
  const last = points[points.length - 1];
  return { x: last.x, z: last.z };
}

export function animateChakraPathSystem(scene, t, playerX = 0, playerZ = 0, mobileThrottle = false) {
  const system = scene.userData.chakraPathSystem;
  if (!system) return;

  const slowPulse = 0.5 + Math.sin(t * 1.4) * 0.5;
  for (const segment of system.glowSegments) segment.material.opacity = segment.userData.baseOpacity * (0.72 + slowPulse * 0.42);
  for (const segment of system.coreSegments) segment.material.opacity = segment.userData.baseOpacity * (0.76 + slowPulse * 0.28);

  for (const chakra of system.chakras) {
    const dx = playerX - chakra.x;
    const dz = playerZ - chakra.z;
    const dist = Math.sqrt(dx * dx + dz * dz);
    const near = Math.max(0, 1 - dist / 4.2);
    const standing = dist < 1.45;
    const pulse = 1 + Math.sin(t * (2.1 + near * 1.4) + chakra.phase) * (0.035 + near * 0.07);
    const scale = pulse * (1 + near * 0.16);
    chakra.symbol.scale.setScalar(scale);
    chakra.halo.scale.setScalar(1 + near * 0.24 + Math.sin(t * 2.0 + chakra.phase) * 0.025);
    chakra.symbol.material.opacity = Math.min(0.96, chakra.symbol.userData.baseOpacity + near * 0.18);
    chakra.halo.material.opacity = Math.min(0.72, chakra.halo.userData.baseOpacity + near * 0.26);
    if (chakra.prompt?.material) {
      const targetOpacity = standing ? 0.94 : 0;
      chakra.prompt.material.opacity += (targetOpacity - chakra.prompt.material.opacity) * (mobileThrottle ? 0.28 : 0.38);
      chakra.prompt.position.y = chakra.prompt.userData.baseY + Math.sin(t * 1.8) * 0.045;
    }
  }

  for (const dot of system.flowDots) {
    const p = pointOnPath(system.pathPoints, dot.userData.offset + t * 0.055);
    dot.position.x = p.x;
    dot.position.z = p.z;
    dot.material.opacity = 0.45 + Math.sin(t * 3.2 + dot.userData.offset * 8) * 0.18;
  }
}