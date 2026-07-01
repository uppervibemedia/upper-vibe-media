import * as THREE from "three";

const { Group, Mesh, PlaneGeometry, MeshBasicMaterial, CanvasTexture, Color, DoubleSide, LinearFilter } = THREE;

const IS_MOBILE = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
const textureCache = new Map();

function makeTexture(kind, label = "") {
  const key = `${kind}:${label}`;
  if (textureCache.has(key)) return textureCache.get(key);

  const canvas = document.createElement("canvas");
  canvas.width = 640;
  canvas.height = 640;
  const ctx = canvas.getContext("2d");
  const cx = 320;
  const cy = 320;
  const r = 226;

  ctx.clearRect(0, 0, 640, 640);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  const circle = (x, y, rad) => { ctx.beginPath(); ctx.arc(x, y, rad, 0, Math.PI * 2); ctx.stroke(); };
  const line = (a, b, c, d) => { ctx.beginPath(); ctx.moveTo(a, b); ctx.lineTo(c, d); ctx.stroke(); };
  const poly = (sides, rad, rot = -Math.PI / 2) => {
    ctx.beginPath();
    for (let i = 0; i < sides; i++) {
      const a = rot + i * Math.PI * 2 / sides;
      const x = cx + Math.cos(a) * rad;
      const y = cy + Math.sin(a) * rad;
      i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    }
    ctx.closePath();
    ctx.stroke();
  };

  const radial = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
  radial.addColorStop(0, "rgba(0,229,255,0.16)");
  radial.addColorStop(0.52, "rgba(124,58,237,0.08)");
  radial.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = radial;
  ctx.beginPath(); ctx.arc(cx, cy, r * 1.08, 0, Math.PI * 2); ctx.fill();

  ctx.shadowColor = "rgba(0,229,255,0.74)";
  ctx.shadowBlur = 18;
  ctx.strokeStyle = "rgba(180,250,255,0.82)";
  ctx.lineWidth = 4;
  circle(cx, cy, r * 0.94);
  ctx.strokeStyle = "rgba(160,120,255,0.58)";
  ctx.lineWidth = 2;
  circle(cx, cy, r * 0.74);
  ctx.setLineDash([14, 18]);
  circle(cx, cy, r * 1.04);
  ctx.setLineDash([]);

  if (kind === "flowerHud") {
    ctx.strokeStyle = "rgba(0,229,255,0.72)";
    ctx.lineWidth = 3;
    const cr = 58;
    for (let ring = 0; ring < 3; ring++) {
      const rr = cr * (ring + 1) * 0.78;
      for (let i = 0; i < 6; i++) circle(cx + Math.cos(i * Math.PI / 3) * rr, cy + Math.sin(i * Math.PI / 3) * rr, cr);
    }
    ctx.strokeStyle = "rgba(255,211,110,0.62)";
    for (let i = 0; i < 12; i++) line(cx, cy, cx + Math.cos(i * Math.PI / 6) * r * 0.82, cy + Math.sin(i * Math.PI / 6) * r * 0.82);
  } else if (kind === "metatronTech") {
    const pts = [[cx, cy]];
    for (let i = 0; i < 6; i++) pts.push([cx + Math.cos(i * Math.PI / 3) * r * 0.52, cy + Math.sin(i * Math.PI / 3) * r * 0.52]);
    ctx.strokeStyle = "rgba(0,229,255,0.62)";
    ctx.lineWidth = 2.5;
    for (let i = 0; i < pts.length; i++) for (let j = i + 1; j < pts.length; j++) line(pts[i][0], pts[i][1], pts[j][0], pts[j][1]);
    ctx.fillStyle = "rgba(255,211,110,0.9)";
    pts.forEach(([x, y]) => { ctx.beginPath(); ctx.arc(x, y, 13, 0, Math.PI * 2); ctx.fill(); circle(x, y, 28); });
  } else if (kind === "sriCircuit") {
    ctx.strokeStyle = "rgba(180,120,255,0.72)";
    ctx.lineWidth = 3;
    for (let i = 0; i < 7; i++) poly(3, r * (0.28 + i * 0.075), i % 2 ? Math.PI / 2 : -Math.PI / 2);
    ctx.strokeStyle = "rgba(0,229,255,0.52)";
    for (let i = 0; i < 6; i++) {
      const a = i * Math.PI / 3;
      line(cx + Math.cos(a) * r * 0.22, cy + Math.sin(a) * r * 0.22, cx + Math.cos(a) * r * 0.92, cy + Math.sin(a) * r * 0.92);
    }
  } else if (kind === "code369") {
    ctx.strokeStyle = "rgba(255,211,110,0.76)";
    ctx.lineWidth = 3;
    const pts = [3, 6, 9].map((n, i) => {
      const a = -Math.PI / 2 + i * Math.PI * 2 / 3;
      const x = cx + Math.cos(a) * r * 0.54;
      const y = cy + Math.sin(a) * r * 0.54;
      ctx.font = "900 72px Syne, Inter, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = i === 1 ? "rgba(0,229,255,0.92)" : "rgba(255,211,110,0.92)";
      ctx.fillText(String(n), x, y);
      return [x, y];
    });
    line(pts[0][0], pts[0][1], pts[1][0], pts[1][1]);
    line(pts[1][0], pts[1][1], pts[2][0], pts[2][1]);
    line(pts[2][0], pts[2][1], pts[0][0], pts[0][1]);
  } else if (kind === "wave432") {
    ctx.strokeStyle = "rgba(0,229,255,0.76)";
    ctx.lineWidth = 5;
    for (let row = 0; row < 4; row++) {
      ctx.beginPath();
      for (let x = cx - r * 0.72; x <= cx + r * 0.72; x += 9) {
        const y = cy - 68 + row * 44 + Math.sin((x + row * 30) * 0.035) * (16 + row * 2);
        x === cx - r * 0.72 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
  } else if (kind === "torusHud") {
    ctx.strokeStyle = "rgba(0,229,255,0.68)";
    ctx.lineWidth = 3;
    for (let i = 0; i < 8; i++) {
      ctx.beginPath();
      ctx.ellipse(cx, cy, r * 0.66, r * 0.18, i * Math.PI / 8, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.strokeStyle = "rgba(180,120,255,0.62)";
    [0.28, 0.48, 0.68].forEach((s) => circle(cx, cy, r * s));
  } else if (kind === "scanner") {
    const colors = ["#00E5FF", "#7C3AED", "#FFD36E", "#44FFB1", "#FF4FC3", "#88CCFF", "#FFFFFF"];
    colors.forEach((c, i) => {
      ctx.fillStyle = c;
      const h = 58 + i * 18;
      ctx.fillRect(cx - 115 + i * 38, cy + 96 - h, 16, h);
    });
    ctx.strokeStyle = "rgba(255,255,255,0.68)";
    ctx.lineWidth = 2;
    for (let y = cy - 120; y <= cy + 110; y += 38) line(cx - 145, y, cx + 145, y);
  }

  ctx.shadowBlur = 8;
  ctx.font = "900 28px Syne, Inter, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "rgba(235,255,255,0.92)";
  ctx.fillText(label, cx, cy + r * 0.76);

  const tex = new CanvasTexture(canvas);
  tex.minFilter = LinearFilter;
  tex.magFilter = LinearFilter;
  tex.colorSpace = THREE.SRGBColorSpace;
  textureCache.set(key, tex);
  return tex;
}

function addNode(group, node, y) {
  if (node.hidden) return null;
  const opacity = node.opacity ?? (IS_MOBILE ? 0.32 : 0.48);
  const mat = new MeshBasicMaterial({ map: makeTexture(node.kind, node.label), color: new Color(node.color || "#FFFFFF"), transparent: true, opacity, depthWrite: false, side: DoubleSide });
  mat.userData.baseOpacity = opacity;
  const mesh = new Mesh(new PlaneGeometry(node.size || 4.6, node.size || 4.6), mat);
  mesh.rotation.x = -Math.PI / 2;
  mesh.rotation.z = node.rot || 0;
  mesh.position.set(node.x, y, node.z);
  mesh.renderOrder = 4;
  mesh.userData = { isSacredNode: true, phase: node.phase || 0, pulse: node.pulse || 1 };
  group.add(mesh);
  group.userData.nodes.push(mesh);
  return mesh;
}

function addConnection(group, a, b, y, color = "#7DEBFF") {
  const dx = b.x - a.x;
  const dz = b.z - a.z;
  const len = Math.sqrt(dx * dx + dz * dz);
  const baseOpacity = IS_MOBILE ? 0.14 : 0.22;
  const mat = new MeshBasicMaterial({ color: new Color(color), transparent: true, opacity: baseOpacity, depthWrite: false, side: DoubleSide });
  mat.userData.baseOpacity = baseOpacity;
  const line = new Mesh(new PlaneGeometry(len, IS_MOBILE ? 0.055 : 0.075), mat);
  line.rotation.x = -Math.PI / 2;
  line.rotation.z = -Math.atan2(dz, dx);
  line.position.set((a.x + b.x) / 2, y - 0.006, (a.z + b.z) / 2);
  line.renderOrder = 3;
  line.userData = { isSacredLine: true, phase: Math.random() * Math.PI * 2 };
  group.add(line);
  group.userData.lines.push(line);

  if (!IS_MOBILE || group.userData.flowDots.length < 8) {
    const dotMat = new MeshBasicMaterial({ color: new Color("#FFD36E"), transparent: true, opacity: IS_MOBILE ? 0.28 : 0.42, depthWrite: false, side: DoubleSide });
    const dot = new Mesh(new PlaneGeometry(0.46, 0.12), dotMat);
    dot.rotation.copy(line.rotation);
    dot.position.set(a.x, y + 0.004, a.z);
    dot.renderOrder = 5;
    dot.userData = { a, b, phase: Math.random(), len };
    group.add(dot);
    group.userData.flowDots.push(dot);
  }
}

const CITY_NODES = [
  { kind: "flowerHud", label: "REACTOR", x: 0, z: -6, size: 5.4, color: "#FFFFFF", opacity: 0.55, hidden: true },
  { kind: "wave432", label: "432 LINK", x: 0, z: -30, size: 4.7, color: "#9AF8FF" },
  { kind: "code369", label: "369 MAP", x: -16, z: -13, size: 4.3, color: "#FFD36E" },
  { kind: "torusHud", label: "VISUAL", x: -13, z: 10, size: 4.2, color: "#B58CFF" },
  { kind: "metatronTech", label: "CRYSTAL", x: -28, z: 9, size: 4.5, color: "#A8F8FF" },
  { kind: "scanner", label: "LIBRARY", x: 22, z: -20, size: 4.2, color: "#7DEBFF" },
  { kind: "sriCircuit", label: "LOUNGE", x: -22, z: -26, size: 4.2, color: "#B58CFF" },
];

const BEACH_NODES = [
  { kind: "flowerHud", label: "BEACH", x: -5, z: 2, size: 5.0, color: "#7DEBFF" },
  { kind: "torusHud", label: "COVE", x: -41, z: -13, size: 4.2, color: "#B58CFF" },
  { kind: "wave432", label: "SURF", x: 10, z: -18, size: 4.2, color: "#7DEBFF" },
  { kind: "scanner", label: "AURA", x: 27, z: 24, size: 4.1, color: "#FFD36E" },
  { kind: "metatronTech", label: "RETURN", x: -44, z: 14, size: 4.2, color: "#A8F8FF" },
];

export function createSacredGeometryNetwork(scene, mode) {
  const group = new Group();
  group.name = `sacredGeometryNetwork_${mode}`;
  group.userData = { mode, nodes: [], lines: [], flowDots: [] };
  const y = mode === "beach" ? 0.046 : 0.034;
  const nodes = mode === "beach" ? BEACH_NODES : CITY_NODES;
  nodes.forEach((node, i) => addNode(group, { ...node, phase: i * 0.7, rot: (i % 3 - 1) * 0.11 }, y));

  const center = nodes[0];
  for (let i = 1; i < nodes.length; i++) addConnection(group, center, nodes[i], y, i % 3 === 0 ? "#B58CFF" : i % 3 === 1 ? "#7DEBFF" : "#FFD36E");
  if (mode === "city") {
    addConnection(group, nodes[1], nodes[5], y, "#7DEBFF");
    addConnection(group, nodes[2], nodes[6], y, "#B58CFF");
    addConnection(group, nodes[3], nodes[4], y, "#FFD36E");
  }

  scene.add(group);
  scene.userData.sacredGeometryNetwork = group;
}

export function animateSacredGeometryNetwork(scene, t, beat = 0) {
  const group = scene.userData.sacredGeometryNetwork;
  if (!group) return;
  const nodePulse = 0.06 + beat * 0.05;
  for (const node of group.userData.nodes || []) {
    const base = node.material.userData.baseOpacity || 0.42;
    node.material.opacity = base * (0.86 + Math.sin(t * 1.15 + node.userData.phase) * nodePulse);
    node.rotation.z += (IS_MOBILE ? 0.00025 : 0.00045) * node.userData.pulse;
  }
  for (const line of group.userData.lines || []) {
    const base = line.material.userData.baseOpacity || 0.2;
    line.material.opacity = base * (0.8 + Math.sin(t * 1.35 + line.userData.phase) * 0.14 + beat * 0.08);
  }
  for (const dot of group.userData.flowDots || []) {
    const s = (t * 0.075 + dot.userData.phase) % 1;
    const a = dot.userData.a;
    const b = dot.userData.b;
    dot.position.x = a.x + (b.x - a.x) * s;
    dot.position.z = a.z + (b.z - a.z) * s;
    dot.material.opacity = (IS_MOBILE ? 0.2 : 0.34) + Math.sin(t * 2.2 + s * 6.28) * 0.06;
  }
}