import * as THREE from "three";

const { Group, Mesh, PlaneGeometry, MeshBasicMaterial, CanvasTexture, Color, DoubleSide, LinearFilter } = THREE;

const IS_MOBILE = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
const textureCache = new Map();

function makeTexture(kind) {
  if (textureCache.has(kind)) return textureCache.get(kind);
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext("2d");
  const cx = 256;
  const cy = 256;
  const maxR = 185;
  ctx.clearRect(0, 0, 512, 512);
  ctx.lineWidth = 3;
  ctx.strokeStyle = "rgba(160,245,255,0.78)";
  ctx.fillStyle = "rgba(255,220,135,0.72)";
  ctx.shadowColor = "rgba(0,229,255,0.72)";
  ctx.shadowBlur = 16;

  const circle = (x, y, r) => { ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.stroke(); };
  const line = (a, b, c, d) => { ctx.beginPath(); ctx.moveTo(a, b); ctx.lineTo(c, d); ctx.stroke(); };
  const polygon = (sides, radius, rot = -Math.PI / 2) => {
    ctx.beginPath();
    for (let i = 0; i < sides; i++) {
      const a = rot + i * Math.PI * 2 / sides;
      const x = cx + Math.cos(a) * radius;
      const y = cy + Math.sin(a) * radius;
      i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    }
    ctx.closePath();
    ctx.stroke();
  };

  if (kind === "circle") {
    [0.28, 0.48, 0.68].forEach((s) => circle(cx, cy, maxR * s));
  } else if (kind === "vesica") {
    circle(cx - maxR * 0.18, cy, maxR * 0.43); circle(cx + maxR * 0.18, cy, maxR * 0.43); circle(cx, cy, maxR * 0.72);
  } else if (kind === "triangle") {
    polygon(3, maxR * 0.72); polygon(3, maxR * 0.48, Math.PI / 2); circle(cx, cy, maxR * 0.76);
  } else if (kind === "pentagon") {
    [0.38, 0.56, 0.74].forEach((s) => polygon(5, maxR * s));
  } else if (kind === "pentagram") {
    const pts = [];
    for (let i = 0; i < 5; i++) pts.push([cx + Math.cos(-Math.PI / 2 + i * Math.PI * 2 / 5) * maxR * 0.66, cy + Math.sin(-Math.PI / 2 + i * Math.PI * 2 / 5) * maxR * 0.66]);
    [0, 2, 4, 1, 3, 0].forEach((idx, i, arr) => { if (i) line(pts[arr[i - 1]][0], pts[arr[i - 1]][1], pts[idx][0], pts[idx][1]); });
    circle(cx, cy, maxR * 0.76);
  } else if (kind === "hexagon") {
    [0.34, 0.56, 0.76].forEach((s) => polygon(6, maxR * s, 0));
    for (let i = 0; i < 6; i++) line(cx, cy, cx + Math.cos(i * Math.PI / 3) * maxR * 0.76, cy + Math.sin(i * Math.PI / 3) * maxR * 0.76);
  } else if (kind === "seed") {
    circle(cx, cy, maxR * 0.22); for (let i = 0; i < 6; i++) circle(cx + Math.cos(i * Math.PI / 3) * maxR * 0.22, cy + Math.sin(i * Math.PI / 3) * maxR * 0.22, maxR * 0.22); circle(cx, cy, maxR * 0.58);
  } else if (kind === "tree") {
    const pts = [[0,-0.52],[-0.23,-0.28],[0.23,-0.28],[-0.34,-0.02],[0,-0.02],[0.34,-0.02],[-0.23,0.24],[0.23,0.24],[0,0.5]].map(([x,y]) => [cx + x * maxR, cy + y * maxR]);
    pts.forEach(([x, y]) => circle(x, y, 15));
    [[0,1],[0,2],[1,3],[1,4],[2,4],[2,5],[3,6],[4,6],[4,7],[5,7],[6,8],[7,8]].forEach(([a,b]) => line(pts[a][0], pts[a][1], pts[b][0], pts[b][1]));
    circle(cx, cy, maxR * 0.72);
  } else if (kind === "egg") {
    const pts = []; for (let i = 0; i < 8; i++) pts.push([cx + Math.cos(i * Math.PI / 4) * maxR * 0.32, cy + Math.sin(i * Math.PI / 4) * maxR * 0.32]);
    pts.forEach(([x, y]) => circle(x, y, maxR * 0.18)); circle(cx, cy, maxR * 0.64);
  } else if (kind === "flower") {
    for (let r = 1; r <= 2; r++) for (let i = 0; i < 6; i++) circle(cx + Math.cos(i * Math.PI / 3) * maxR * 0.2 * r, cy + Math.sin(i * Math.PI / 3) * maxR * 0.2 * r, maxR * 0.2); circle(cx, cy, maxR * 0.7);
  } else if (kind === "fruit") {
    for (let i = 0; i < 12; i++) circle(cx + Math.cos(i * Math.PI * 2 / 12) * maxR * 0.42, cy + Math.sin(i * Math.PI * 2 / 12) * maxR * 0.42, maxR * 0.16); circle(cx, cy, maxR * 0.76);
  } else {
    const pts = [[cx, cy]];
    for (let i = 0; i < 6; i++) pts.push([cx + Math.cos(i * Math.PI / 3) * maxR * 0.55, cy + Math.sin(i * Math.PI / 3) * maxR * 0.55]);
    pts.forEach(([x, y]) => circle(x, y, 32));
    for (let i = 0; i < pts.length; i++) for (let j = i + 1; j < pts.length; j++) line(pts[i][0], pts[i][1], pts[j][0], pts[j][1]);
    circle(cx, cy, maxR * 0.78);
  }

  const tex = new CanvasTexture(canvas);
  tex.minFilter = LinearFilter;
  tex.magFilter = LinearFilter;
  tex.colorSpace = THREE.SRGBColorSpace;
  textureCache.set(kind, tex);
  return tex;
}

function addNode(group, node, y) {
  const opacity = node.opacity ?? (IS_MOBILE ? 0.42 : 0.58);
  const mat = new MeshBasicMaterial({ map: makeTexture(node.kind), color: new Color(node.color || "#A8F8FF"), transparent: true, opacity, depthWrite: false, side: DoubleSide });
  mat.userData.baseOpacity = opacity;
  const mesh = new Mesh(new PlaneGeometry(node.size || 4.4, node.size || 4.4), mat);
  mesh.rotation.x = -Math.PI / 2;
  mesh.rotation.z = node.rot || 0;
  mesh.position.set(node.x, y, node.z);
  mesh.renderOrder = 4;
  mesh.userData = { isSacredNode: true, phase: node.phase || 0 };
  group.add(mesh);
  group.userData.nodes.push(mesh);
  return mesh;
}

function addConnection(group, a, b, y, color = "#7DEBFF") {
  const dx = b.x - a.x;
  const dz = b.z - a.z;
  const len = Math.sqrt(dx * dx + dz * dz);
  const baseOpacity = IS_MOBILE ? 0.24 : 0.34;
  const mat = new MeshBasicMaterial({ color: new Color(color), transparent: true, opacity: baseOpacity, depthWrite: false, side: DoubleSide });
  mat.userData.baseOpacity = baseOpacity;
  const line = new Mesh(new PlaneGeometry(len, IS_MOBILE ? 0.16 : 0.22), mat);
  line.rotation.x = -Math.PI / 2;
  line.rotation.z = -Math.atan2(dz, dx);
  line.position.set((a.x + b.x) / 2, y - 0.006, (a.z + b.z) / 2);
  line.renderOrder = 3;
  line.userData = { isSacredLine: true, phase: Math.random() * Math.PI * 2 };
  group.add(line);
  group.userData.lines.push(line);

  if (group.userData.flowDots.length < (IS_MOBILE ? 8 : 14)) {
    const dotMat = new MeshBasicMaterial({ color: new Color("#FFD36E"), transparent: true, opacity: IS_MOBILE ? 0.30 : 0.42, depthWrite: false, side: DoubleSide });
    const dot = new Mesh(new PlaneGeometry(0.58, 0.18), dotMat);
    dot.rotation.copy(line.rotation);
    dot.position.set(a.x, y + 0.004, a.z);
    dot.renderOrder = 5;
    dot.userData = { a, b, phase: Math.random(), len };
    group.add(dot);
    group.userData.flowDots.push(dot);
  }
}

const CITY_NODES = [
  { key: "westCrystal", kind: "hexagon", x: -30, z: -10, size: 6.4, color: "#7DEBFF", opacity: IS_MOBILE ? 0.34 : 0.44 },
  { key: "eastCrystal", kind: "hexagon", x: 30, z: -10, size: 6.4, color: "#B58CFF", opacity: IS_MOBILE ? 0.34 : 0.44 },
  { key: "danceCore", kind: "metatron", x: 0, z: -6, size: 9.2, color: "#A8F8FF", opacity: IS_MOBILE ? 0.20 : 0.28 },
  { key: "stage", kind: "egg", x: 0, z: -29, size: 5.0, color: "#7DEBFF", opacity: IS_MOBILE ? 0.22 : 0.32 },
  { key: "lounge", kind: "flower", x: -22, z: -25, size: 4.8, color: "#B58CFF", opacity: IS_MOBILE ? 0.22 : 0.30 },
  { key: "library", kind: "seed", x: 22, z: -20, size: 4.8, color: "#7DEBFF", opacity: IS_MOBILE ? 0.22 : 0.30 },
  { key: "vibeCheck", kind: "tree", x: -16, z: -13, size: 4.4, color: "#FFD36E", opacity: IS_MOBILE ? 0.20 : 0.28 },
  { key: "visualizer", kind: "vesica", x: -13, z: 10, size: 4.6, color: "#7DEBFF", opacity: IS_MOBILE ? 0.20 : 0.28 },
  { key: "beachGate", kind: "fruit", x: 12, z: 8, size: 4.8, color: "#FFD36E", opacity: IS_MOBILE ? 0.20 : 0.28 },
  { key: "ferris", kind: "pentagon", x: 29, z: 8, size: 4.6, color: "#B58CFF", opacity: IS_MOBILE ? 0.20 : 0.28 },
  { key: "westSpoke", kind: "circle", x: -30, z: 6, size: 4.3, color: "#A8F8FF", opacity: IS_MOBILE ? 0.18 : 0.25 },
  { key: "eastSpoke", kind: "circle", x: 30, z: 6, size: 4.3, color: "#A8F8FF", opacity: IS_MOBILE ? 0.18 : 0.25 },
];

const CITY_CONNECTIONS = [
  ["westCrystal", "danceCore", "#7DEBFF"], ["eastCrystal", "danceCore", "#B58CFF"],
  ["westCrystal", "stage", "#7DEBFF"], ["eastCrystal", "stage", "#7DEBFF"],
  ["westCrystal", "lounge", "#B58CFF"], ["eastCrystal", "library", "#7DEBFF"],
  ["westCrystal", "vibeCheck", "#FFD36E"], ["eastCrystal", "ferris", "#B58CFF"],
  ["danceCore", "stage", "#7DEBFF"], ["danceCore", "visualizer", "#7DEBFF"], ["danceCore", "beachGate", "#FFD36E"],
  ["visualizer", "westSpoke", "#7DEBFF"], ["beachGate", "eastSpoke", "#FFD36E"],
  ["westSpoke", "westCrystal", "#A8F8FF"], ["eastSpoke", "eastCrystal", "#A8F8FF"],
  ["lounge", "stage", "#B58CFF"], ["library", "stage", "#7DEBFF"],
  ["visualizer", "beachGate", "#A8F8FF"], ["westCrystal", "eastCrystal", "#A8F8FF"],
];

const BEACH_NODES = [
  { key: "returnGate", kind: "flower", x: 0, z: 2, size: 5.8, color: "#7DEBFF", opacity: IS_MOBILE ? 0.24 : 0.34 },
  { key: "westWater", kind: "circle", x: -41, z: -13, size: 4.4, color: "#B58CFF", opacity: IS_MOBILE ? 0.18 : 0.26 },
  { key: "westSand", kind: "triangle", x: -20, z: -7, size: 4.3, color: "#FFD36E", opacity: IS_MOBILE ? 0.18 : 0.26 },
  { key: "north", kind: "hexagon", x: 10, z: -18, size: 4.4, color: "#7DEBFF", opacity: IS_MOBILE ? 0.18 : 0.26 },
  { key: "eastSand", kind: "pentagon", x: 34, z: -8, size: 4.3, color: "#B58CFF", opacity: IS_MOBILE ? 0.18 : 0.26 },
  { key: "eastWater", kind: "vesica", x: 44, z: 8, size: 4.2, color: "#FFD36E", opacity: IS_MOBILE ? 0.18 : 0.26 },
  { key: "southEast", kind: "seed", x: 27, z: 24, size: 4.4, color: "#7DEBFF", opacity: IS_MOBILE ? 0.18 : 0.26 },
  { key: "south", kind: "tree", x: -8, z: 28, size: 4.3, color: "#B58CFF", opacity: IS_MOBILE ? 0.18 : 0.26 },
  { key: "southWest", kind: "metatron", x: -44, z: 14, size: 4.4, color: "#A8F8FF", opacity: IS_MOBILE ? 0.18 : 0.26 },
];

const BEACH_CONNECTIONS = [
  ["returnGate", "westSand", "#FFD36E"], ["returnGate", "north", "#7DEBFF"], ["returnGate", "eastSand", "#B58CFF"],
  ["westSand", "westWater", "#B58CFF"], ["eastSand", "eastWater", "#FFD36E"],
  ["westWater", "southWest", "#A8F8FF"], ["eastWater", "southEast", "#7DEBFF"],
  ["southWest", "south", "#B58CFF"], ["south", "southEast", "#7DEBFF"],
  ["westSand", "south", "#FFD36E"], ["eastSand", "south", "#FFD36E"],
];

export function createSacredGeometryNetwork(scene, mode) {
  const group = new Group();
  group.name = `sacredGeometryNetwork_${mode}`;
  group.userData = { mode, nodes: [], lines: [], flowDots: [] };
  const y = mode === "beach" ? 0.055 : 0.052;
  const nodes = mode === "beach" ? BEACH_NODES : CITY_NODES;
  const connections = mode === "beach" ? BEACH_CONNECTIONS : CITY_CONNECTIONS;
  const byKey = new Map(nodes.map((node) => [node.key, node]));

  nodes.forEach((node) => addNode(group, node, y));
  connections.forEach(([aKey, bKey, color]) => {
    const a = byKey.get(aKey);
    const b = byKey.get(bKey);
    if (a && b) addConnection(group, a, b, y, color);
  });

  scene.add(group);
  scene.userData.sacredGeometryNetwork = group;
}

export function animateSacredGeometryNetwork(scene, t, beat = 0) {
  const group = scene.userData.sacredGeometryNetwork;
  if (!group) return;
  const nodePulse = 0.08 + beat * 0.05;
  for (const node of group.userData.nodes || []) {
    const base = node.material.userData.baseOpacity || 0.5;
    node.material.opacity = base * (0.84 + Math.sin(t * 1.25 + node.userData.phase) * nodePulse);
  }
  for (const line of group.userData.lines || []) {
    const base = line.material.userData.baseOpacity || 0.22;
    line.material.opacity = base * (0.82 + Math.sin(t * 1.45 + line.userData.phase) * 0.16 + beat * 0.08);
  }
  for (const dot of group.userData.flowDots || []) {
    const s = (t * 0.08 + dot.userData.phase) % 1;
    const a = dot.userData.a;
    const b = dot.userData.b;
    dot.position.x = a.x + (b.x - a.x) * s;
    dot.position.z = a.z + (b.z - a.z) * s;
    dot.material.opacity = (IS_MOBILE ? 0.24 : 0.38) + Math.sin(t * 2.2 + s * 6.28) * 0.08;
  }
}