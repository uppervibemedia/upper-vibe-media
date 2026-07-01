import * as THREE from "three";

const { Group, Mesh, PlaneGeometry, MeshBasicMaterial, CanvasTexture, Color, DoubleSide, LinearFilter } = THREE;

function makeTexture(draw, w = 768, h = 256) {
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  draw(ctx, w, h);
  const tex = new CanvasTexture(canvas);
  tex.minFilter = LinearFilter;
  tex.magFilter = LinearFilter;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

function decal(texture, width, height, pos, rot = [0, 0, 0], opacity = 0.5) {
  const mesh = new Mesh(new PlaneGeometry(width, height), new MeshBasicMaterial({ map: texture, transparent: true, opacity, depthWrite: false, side: DoubleSide }));
  mesh.position.set(...pos);
  mesh.rotation.set(...rot);
  mesh.renderOrder = 5;
  return mesh;
}

function systemPanelTexture(label, subline) {
  return makeTexture((ctx, w, h) => {
    ctx.clearRect(0, 0, w, h);
    const bg = ctx.createLinearGradient(0, 0, w, h);
    bg.addColorStop(0, "rgba(0,229,255,0.18)");
    bg.addColorStop(0.5, "rgba(124,58,237,0.16)");
    bg.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = bg;
    ctx.fillRect(34, 34, w - 68, h - 68);
    ctx.strokeStyle = "rgba(0,229,255,0.72)";
    ctx.lineWidth = 4;
    ctx.shadowColor = "rgba(0,229,255,0.62)";
    ctx.shadowBlur = 18;
    ctx.strokeRect(42, 42, w - 84, h - 84);
    ctx.shadowBlur = 8;
    for (let i = 0; i < 9; i++) {
      const x = 70 + i * 68;
      ctx.beginPath(); ctx.moveTo(x, 70); ctx.lineTo(x + 28, 70); ctx.lineTo(x + 28, 98); ctx.stroke();
      ctx.beginPath(); ctx.arc(x + 28, 98, 6, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.font = "900 38px Syne, Inter, sans-serif";
    ctx.fillStyle = "rgba(235,255,255,0.94)";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(label, w / 2, h / 2 - 10);
    ctx.font = "700 20px Inter, sans-serif";
    ctx.fillStyle = "rgba(255,211,110,0.82)";
    ctx.fillText(subline, w / 2, h / 2 + 36);
  });
}

function lightCodeTexture(text) {
  return makeTexture((ctx, w, h) => {
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = "rgba(2,10,22,0.62)";
    ctx.fillRect(28, 42, w - 56, h - 84);
    ctx.strokeStyle = "rgba(0,229,255,0.68)";
    ctx.lineWidth = 3;
    ctx.shadowColor = "rgba(0,229,255,0.56)";
    ctx.shadowBlur = 12;
    ctx.strokeRect(28, 42, w - 56, h - 84);
    ctx.strokeStyle = "rgba(255,211,110,0.44)";
    for (let x = 64; x < w - 64; x += 54) {
      ctx.beginPath(); ctx.moveTo(x, h - 68); ctx.lineTo(x + 22, h - 68); ctx.stroke();
    }
    let size = text.length > 18 ? 30 : 36;
    do {
      ctx.font = `900 ${size}px Syne, Inter, sans-serif`;
      size -= 1;
    } while (ctx.measureText(text).width > w - 120 && size > 22);
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "rgba(235,255,255,0.92)";
    ctx.fillText(text, w / 2, h / 2 + 2);
  }, 768, 192);
}

function terminalTexture(text) {
  return makeTexture((ctx, w, h) => {
    ctx.clearRect(0, 0, w, h);
    const g = ctx.createLinearGradient(0, 0, w, h);
    g.addColorStop(0, "rgba(0,229,255,0.2)");
    g.addColorStop(0.7, "rgba(124,58,237,0.16)");
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.fillRect(42, 34, w - 84, h - 68);
    ctx.strokeStyle = "rgba(0,229,255,0.72)";
    ctx.lineWidth = 4;
    ctx.shadowColor = "rgba(0,229,255,0.62)";
    ctx.shadowBlur = 14;
    ctx.strokeRect(42, 34, w - 84, h - 68);
    ctx.font = "900 18px Inter, sans-serif";
    ctx.fillStyle = "rgba(255,211,110,0.86)";
    ctx.textAlign = "left";
    ctx.fillText("LIGHT CODE TERMINAL", 72, 70);
    let size = text.length > 28 ? 26 : 30;
    do {
      ctx.font = `800 ${size}px Syne, Inter, sans-serif`;
      size -= 1;
    } while (ctx.measureText(text).width > w - 140 && size > 20);
    ctx.fillStyle = "rgba(238,255,255,0.94)";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text, w / 2, h / 2 + 18);
  });
}

function groundPanel(group, text, x, z, rot, isMobile) {
  const mat = new MeshBasicMaterial({ map: lightCodeTexture(text), transparent: true, opacity: 0, depthWrite: false, side: DoubleSide });
  mat.userData.baseOpacity = isMobile ? 0.34 : 0.48;
  const mesh = new Mesh(new PlaneGeometry(text.length > 18 ? 5.7 : 4.7, 1.32), mat);
  mesh.rotation.x = -Math.PI / 2;
  mesh.rotation.z = rot;
  mesh.position.set(x, 0.046, z);
  mesh.renderOrder = 6;
  mesh.userData = { kind: "lightCode", radius: isMobile ? 11 : 15 };
  group.add(mesh);
  group.userData.lightCodes.push(mesh);
}

function terminal(group, text, x, y, z, isMobile) {
  const mat = new MeshBasicMaterial({ map: terminalTexture(text), transparent: true, opacity: 0, depthWrite: false, side: DoubleSide });
  mat.userData.baseOpacity = isMobile ? 0.5 : 0.72;
  const mesh = new Mesh(new PlaneGeometry(text.length > 28 ? 5.2 : 4.45, 1.45), mat);
  mesh.position.set(0, 0, 0);
  mesh.renderOrder = 8;
  const holder = new Group();
  holder.position.set(x, y, z);
  holder.userData = { kind: "terminal", radius: isMobile ? 13 : 18 };
  holder.add(mesh);
  group.add(holder);
  group.userData.terminals.push(holder);
}

export function createCitySpiritualVisuals(scene) {
  const group = new Group();
  group.name = "citySpiritualVisuals";
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
  group.userData = { terminals: [], lightCodes: [], panels: [] };
  const rotSouth = [0, 0, 0], rotWest = [0, Math.PI / 2, 0], rotEast = [0, -Math.PI / 2, 0];

  const panelOpacity = isMobile ? 0.28 : 0.42;
  const wallPanels = [
    decal(systemPanelTexture("UPPER VIBE OS", "432HZ • AURA FIELD • TIMELINE SYNC"), 8.4, 2.8, [0, 7.4, -35.84], rotSouth, panelOpacity),
    decal(systemPanelTexture("AURA GRID", "BIOFIELD SCAN ONLINE"), 6.6, 2.4, [35.84, 5.5, -7.2], rotEast, panelOpacity * 0.9),
    decal(systemPanelTexture("QUANTUM FOCUS", "SIGNAL CLEAN • STATE LOCKED"), 6.8, 2.4, [-35.84, 5.6, -17.5], rotWest, panelOpacity * 0.9),
  ];
  wallPanels.forEach((p) => { group.add(p); group.userData.panels.push(p); });

  [
    ["FREQUENCY ONLINE", 2.6, -10.8, -0.12],
    ["ALIGNMENT ACTIVE", -15.2, -16.7, 0.3],
    ["432 HZ LINKED", 3.4, -26.4, 0.05],
    ["TIMELINE SYNC", -11.8, 6.2, -0.14],
    ["AURA FIELD STABLE", -24.2, 12.6, 0.28],
    ["QUANTUM FOCUS", 20.4, -16.2, -0.18],
    ["INNER STATE = OUTER WORLD", -20.4, -24.0, 0.16],
  ].forEach(([text, x, z, rot]) => groundPanel(group, text, x, z, rot, isMobile));

  [
    ["Your nervous system is the interface.", -30.8, 2.5, 5.2],
    ["Your field is your login.", -24.4, 2.7, 12.7],
    ["Reality responds to state.", -13.4, 2.45, 13.6],
    ["Focus creates signal.", -16.7, 2.5, -17.8],
    ["Frequency before form.", 2.8, 2.35, -10.4],
    ["Regulate. Align. Act.", 3.6, 2.7, -29.2],
    ["Energy becomes behavior.", 22.7, 2.55, -23.2],
  ].forEach(([text, x, y, z]) => terminal(group, text, x, y, z, isMobile));

  scene.add(group);
  scene.userData.citySpiritualVisuals = group;
}

export function animateCitySpiritualVisuals(scene, t, px, pz) {
  const group = scene.userData.citySpiritualVisuals;
  if (!group?.userData) return;

  for (const panel of group.userData.panels || []) {
    const base = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) ? 0.26 : 0.38;
    panel.material.opacity = base * (0.88 + Math.sin(t * 0.6 + panel.position.x) * 0.08);
  }

  for (const code of group.userData.lightCodes || []) {
    const dx = code.position.x - px;
    const dz = code.position.z - pz;
    const d2 = dx * dx + dz * dz;
    const radius = code.userData.radius || 14;
    const near = d2 < radius * radius;
    code.visible = near;
    code.material.opacity = near ? code.material.userData.baseOpacity * (0.82 + Math.sin(t * 1.1 + code.position.x) * 0.1) : 0;
  }

  for (const h of group.userData.terminals || []) {
    const dx = h.position.x - px;
    const dz = h.position.z - pz;
    const d2 = dx * dx + dz * dz;
    const radius = h.userData.radius || 16;
    const near = d2 < radius * radius;
    h.visible = near;
    h.lookAt(px, h.position.y, pz);
    const opacity = near ? h.children[0].material.userData.baseOpacity * (0.82 + Math.sin(t * 1.15 + h.position.z) * 0.1) : 0;
    h.children[0].material.opacity = opacity;
  }
}