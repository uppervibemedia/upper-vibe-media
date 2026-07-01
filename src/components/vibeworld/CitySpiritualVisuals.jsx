import * as THREE from "three";

const { Group, Mesh, PlaneGeometry, CircleGeometry, ConeGeometry, MeshBasicMaterial, CanvasTexture, Color, DoubleSide, LinearFilter } = THREE;

function makeTexture(draw, w = 512, h = 256) {
  const canvas = document.createElement("canvas");
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext("2d");
  draw(ctx, w, h);
  const tex = new CanvasTexture(canvas);
  tex.minFilter = LinearFilter;
  tex.magFilter = LinearFilter;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

function decal(texture, width, height, pos, rot = [0, 0, 0], opacity = 0.72) {
  const mesh = new Mesh(new PlaneGeometry(width, height), new MeshBasicMaterial({ map: texture, transparent: true, opacity, depthWrite: false, side: DoubleSide }));
  mesh.position.set(...pos);
  mesh.rotation.set(...rot);
  mesh.renderOrder = 5;
  return mesh;
}

function flowerTexture() {
  return makeTexture((ctx, w, h) => {
    const cx = w / 2, cy = h / 2, r = h * 0.19;
    ctx.clearRect(0, 0, w, h);
    ctx.shadowColor = "rgba(0,229,255,0.8)";
    ctx.shadowBlur = 18;
    ctx.strokeStyle = "rgba(210,255,255,0.82)";
    ctx.lineWidth = 3;
    for (let ring = 0; ring < 3; ring++) {
      const rad = r * (ring + 1) * 0.54;
      for (let i = 0; i < 6; i++) {
        const a = i * Math.PI / 3;
        ctx.beginPath(); ctx.arc(cx + Math.cos(a) * rad, cy + Math.sin(a) * rad, r, 0, Math.PI * 2); ctx.stroke();
      }
    }
    ctx.strokeStyle = "rgba(212,168,67,0.72)";
    ctx.beginPath(); ctx.arc(cx, cy, r * 2.2, 0, Math.PI * 2); ctx.stroke();
  });
}

function sacredWindowTexture() {
  return makeTexture((ctx, w, h) => {
    ctx.clearRect(0, 0, w, h);
    ctx.strokeStyle = "rgba(160,120,255,0.72)"; ctx.lineWidth = 2; ctx.shadowColor = "rgba(160,120,255,0.65)"; ctx.shadowBlur = 12;
    for (let x = 52; x < w; x += 82) for (let y = 42; y < h; y += 56) {
      ctx.beginPath(); for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3; const px = x + Math.cos(a) * 16; const py = y + Math.sin(a) * 16; i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); } ctx.closePath(); ctx.stroke();
      ctx.beginPath(); ctx.arc(x, y, 8, 0, Math.PI * 2); ctx.stroke();
    }
  });
}

function angelTexture() {
  const nums = ["111", "222", "333", "444", "555", "777", "888"];
  return makeTexture((ctx, w, h) => {
    ctx.clearRect(0, 0, w, h); ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.font = "700 44px Syne, Inter, sans-serif"; ctx.shadowBlur = 16;
    nums.forEach((n, i) => { const x = 70 + (i % 4) * 124, y = 70 + Math.floor(i / 4) * 96; ctx.shadowColor = i % 2 ? "rgba(0,229,255,0.7)" : "rgba(212,168,67,0.65)"; ctx.fillStyle = i % 2 ? "rgba(210,255,255,0.82)" : "rgba(255,222,142,0.8)"; ctx.fillText(n, x, y); });
  });
}

function moonTexture() {
  return makeTexture((ctx, w, h) => {
    const phases = [0, 0.25, 0.5, 1, 0.75]; ctx.clearRect(0, 0, w, h);
    phases.forEach((p, i) => { const x = 70 + i * 92, y = h / 2, r = 28; ctx.shadowColor = "rgba(190,235,255,0.8)"; ctx.shadowBlur = 18; ctx.fillStyle = "rgba(230,250,255,0.9)"; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); if (p !== 1) { ctx.globalCompositeOperation = "destination-out"; ctx.shadowBlur = 0; ctx.beginPath(); ctx.arc(x + (p - 0.5) * 46, y, r, 0, Math.PI * 2); ctx.fill(); ctx.globalCompositeOperation = "source-over"; } });
  });
}

function waveTexture() {
  return makeTexture((ctx, w, h) => {
    ctx.clearRect(0, 0, w, h); ctx.strokeStyle = "rgba(0,229,255,0.74)"; ctx.lineWidth = 4; ctx.shadowColor = "rgba(0,229,255,0.65)"; ctx.shadowBlur = 14;
    for (let row = 0; row < 3; row++) { ctx.beginPath(); for (let x = 24; x < w - 24; x += 8) { const y = 62 + row * 58 + Math.sin(x * 0.045 + row) * (14 + row * 3); x === 24 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); } ctx.stroke(); }
    ctx.font = "700 34px Inter, sans-serif"; ctx.fillStyle = "rgba(255,222,142,0.72)"; ctx.fillText("432 Hz", 28, 44);
  });
}

function textTexture(text) {
  return makeTexture((ctx, w, h) => {
    ctx.clearRect(0, 0, w, h);
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    let size = text.length > 20 ? 26 : text.length > 14 ? 29 : 34;
    do {
      ctx.font = `800 ${size}px Syne, Inter, sans-serif`;
      size -= 1;
    } while (ctx.measureText(text).width > w - 58 && size > 20);
    ctx.shadowColor = "rgba(0,229,255,0.72)";
    ctx.shadowBlur = 16;
    ctx.fillStyle = "rgba(232,252,255,0.94)";
    ctx.fillText(text, w / 2, h / 2);
  }, 640, 128);
}

function groundSymbolTexture(kind, label = "") {
  return makeTexture((ctx, w, h) => {
    const cx = w / 2, cy = h / 2, maxR = w * 0.38;
    ctx.clearRect(0, 0, w, h);
    ctx.lineWidth = 3; ctx.strokeStyle = "rgba(0,229,255,0.48)"; ctx.fillStyle = "rgba(255,222,142,0.62)"; ctx.shadowColor = "rgba(0,229,255,0.55)"; ctx.shadowBlur = 12;
    const circle = (x, y, r) => { ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.stroke(); };
    const line = (a, b, c, d) => { ctx.beginPath(); ctx.moveTo(a, b); ctx.lineTo(c, d); ctx.stroke(); };
    if (kind === "metatron") {
      const pts = [[cx, cy]];
      for (let i = 0; i < 6; i++) pts.push([cx + Math.cos(i * Math.PI / 3) * maxR * 0.55, cy + Math.sin(i * Math.PI / 3) * maxR * 0.55]);
      pts.forEach(([x, y]) => circle(x, y, 34));
      for (let i = 0; i < pts.length; i++) for (let j = i + 1; j < pts.length; j++) line(pts[i][0], pts[i][1], pts[j][0], pts[j][1]);
    } else if (kind === "sri") {
      for (let i = 0; i < 7; i++) { const r = maxR * (0.25 + i * 0.09); const up = i % 2 === 0; ctx.beginPath(); for (let p = 0; p < 3; p++) { const a = -Math.PI / 2 + p * Math.PI * 2 / 3 + (up ? 0 : Math.PI); const x = cx + Math.cos(a) * r; const y = cy + Math.sin(a) * r; p ? ctx.lineTo(x, y) : ctx.moveTo(x, y); } ctx.closePath(); ctx.stroke(); }
      circle(cx, cy, maxR * 0.86);
    } else if (kind === "torus") {
      for (let i = 0; i < 6; i++) circle(cx, cy, maxR * (0.18 + i * 0.13));
      for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; ctx.beginPath(); ctx.ellipse(cx, cy, maxR * 0.78, maxR * 0.22, a, 0, Math.PI * 2); ctx.stroke(); }
    } else if (kind === "chakra") {
      circle(cx, cy, maxR * 0.72); for (let i = 0; i < 7; i++) circle(cx + Math.cos(i * Math.PI * 2 / 7) * maxR * 0.46, cy + Math.sin(i * Math.PI * 2 / 7) * maxR * 0.46, 24);
    } else if (kind === "vesica") {
      circle(cx - maxR * 0.18, cy, maxR * 0.43); circle(cx + maxR * 0.18, cy, maxR * 0.43); circle(cx, cy, maxR * 0.7);
    } else if (kind === "seed") {
      circle(cx, cy, maxR * 0.22); for (let i = 0; i < 6; i++) circle(cx + Math.cos(i * Math.PI / 3) * maxR * 0.22, cy + Math.sin(i * Math.PI / 3) * maxR * 0.22, maxR * 0.22); circle(cx, cy, maxR * 0.55);
    } else if (kind === "flower") {
      for (let r = 1; r <= 2; r++) for (let i = 0; i < 6; i++) circle(cx + Math.cos(i * Math.PI / 3) * maxR * 0.19 * r, cy + Math.sin(i * Math.PI / 3) * maxR * 0.19 * r, maxR * 0.2); circle(cx, cy, maxR * 0.68);
    } else if (kind === "tree") {
      const pts = [[0,-0.52],[-0.23,-0.28],[0.23,-0.28],[-0.34,-0.02],[0,-0.02],[0.34,-0.02],[-0.23,0.24],[0.23,0.24],[0,0.5]].map(([x,y]) => [cx + x * maxR, cy + y * maxR]);
      pts.forEach(([x, y]) => circle(x, y, 16));
      [[0,1],[0,2],[1,3],[1,4],[2,4],[2,5],[3,6],[4,6],[4,7],[5,7],[6,8],[7,8]].forEach(([a,b]) => line(pts[a][0], pts[a][1], pts[b][0], pts[b][1]));
      circle(cx, cy, maxR * 0.72);
    } else if (kind === "egg") {
      const pts = []; for (let i = 0; i < 8; i++) pts.push([cx + Math.cos(i * Math.PI / 4) * maxR * 0.3, cy + Math.sin(i * Math.PI / 4) * maxR * 0.3]);
      pts.forEach(([x, y]) => circle(x, y, maxR * 0.18)); circle(cx, cy, maxR * 0.62);
    } else if (kind === "fruit") {
      for (let i = 0; i < 12; i++) circle(cx + Math.cos(i * Math.PI * 2 / 12) * maxR * 0.42, cy + Math.sin(i * Math.PI * 2 / 12) * maxR * 0.42, maxR * 0.16); circle(cx, cy, maxR * 0.74);
    } else if (kind === "pentagram") {
      const pts = []; for (let i = 0; i < 5; i++) pts.push([cx + Math.cos(-Math.PI / 2 + i * Math.PI * 2 / 5) * maxR * 0.62, cy + Math.sin(-Math.PI / 2 + i * Math.PI * 2 / 5) * maxR * 0.62]);
      [0,2,4,1,3,0].forEach((idx, i, arr) => { if (i) line(pts[arr[i-1]][0], pts[arr[i-1]][1], pts[idx][0], pts[idx][1]); }); circle(cx, cy, maxR * 0.7);
    } else if (kind === "pentagon") {
      for (let scale of [0.34, 0.56, 0.76]) { ctx.beginPath(); for (let i = 0; i < 5; i++) { const a = -Math.PI / 2 + i * Math.PI * 2 / 5; const px = cx + Math.cos(a) * maxR * scale; const py = cy + Math.sin(a) * maxR * scale; i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); } ctx.closePath(); ctx.stroke(); }
    } else if (kind === "hex") {
      for (let x = 90; x < w - 60; x += 76) for (let y = 90; y < h - 60; y += 66) { ctx.beginPath(); for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3; const px = x + Math.cos(a) * 25; const py = y + Math.sin(a) * 25; i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); } ctx.closePath(); ctx.stroke(); }
    } else {
      for (let i = 0; i < 5; i++) circle(cx, cy, maxR * (0.18 + i * 0.16));
      for (let i = 0; i < 9; i++) circle(cx + Math.cos(i * Math.PI * 2 / 9) * maxR * 0.62, cy + Math.sin(i * Math.PI * 2 / 9) * maxR * 0.62, 12);
    }
    if (label) { ctx.font = label.length > 8 ? "700 30px Syne, Inter, sans-serif" : "800 48px Syne, Inter, sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.shadowColor = "rgba(212,168,67,0.55)"; ctx.fillText(label, cx, cy); }
  }, 512, 512);
}

function groundDecal(texture, size, x, z, opacity, rot = 0) {
  const mesh = new Mesh(new PlaneGeometry(size, size), new MeshBasicMaterial({ map: texture, transparent: true, opacity, depthWrite: false, side: DoubleSide }));
  mesh.rotation.x = -Math.PI / 2; mesh.rotation.z = rot; mesh.position.set(x, 0.028, z); mesh.renderOrder = 4;
  return mesh;
}

function affirmationHologram(text, x, y, z, baseOpacity) {
  const holder = new Group();
  holder.position.set(x, y, z);
  holder.userData.isAffirmationHologram = true;
  holder.userData.baseOpacity = baseOpacity;
  holder.userData.baseY = y;
  holder.userData.phase = Math.random() * Math.PI * 2;
  const tex = textTexture(text);
  [0, Math.PI].forEach((ry) => {
    const side = new Mesh(new PlaneGeometry(text.length > 18 ? 7.2 : text.length > 14 ? 6.2 : 5.2, 1.24), new MeshBasicMaterial({ map: tex, transparent: true, opacity: 0, depthWrite: false, side: THREE.FrontSide }));
    side.rotation.y = ry;
    side.position.z = ry === 0 ? 0.012 : -0.012;
    side.renderOrder = 6;
    holder.add(side);
  });
  return holder;
}

function addGridLine(group, a, b, mat) {
  const dx = b.x - a.x, dz = b.z - a.z, len = Math.sqrt(dx * dx + dz * dz);
  const line = new Mesh(new PlaneGeometry(len, 0.16), mat);
  line.rotation.x = -Math.PI / 2; line.rotation.z = -Math.atan2(dz, dx);
  line.position.set((a.x + b.x) / 2, 0.018, (a.z + b.z) / 2);
  line.renderOrder = 2; group.add(line);
}

export function createCitySpiritualVisuals(scene) {
  const group = new Group(); group.name = "citySpiritualVisuals";
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

  const floorSymbols = [
    ["torus", 11.6, 22, 1.5, 0.34, 0.04],
    ["seed", 11.2, 22, -13.5, 0.32, -0.12],
    ["tree", 10.8, -8, 4, 0.3, 0.16],
    ["metatron", 11.4, -24, 3, 0.22, 0.12],
    ["vesica", 10.0, 5, -18, 0.2, -0.18],
    ["egg", 9.6, -25, 18, 0.18, -0.1],
    ["sri", 9.4, -31, -19, 0.17, 0.14],
    ["flower", 9.4, 31, 20, 0.17, -0.12],
  ];
  group.userData.groundSymbols = floorSymbols.map(([kind, size, x, z, opacity, rot]) => {
    const sym = groundDecal(groundSymbolTexture(kind), size, x, z, isMobile ? opacity * 0.78 : opacity, rot);
    group.add(sym);
    return sym;
  });

  const wallVisuals = [];
  const addWallVisual = (visual, range = 42) => {
    visual.userData.baseOpacity = visual.material?.opacity ?? 1;
    visual.userData.visualRange = isMobile ? Math.min(range, 32) : range;
    group.add(visual);
    wallVisuals.push(visual);
  };
  const flowerTex = flowerTexture();
  const windowTex = sacredWindowTexture();
  const angelTex = angelTexture();
  const moonTex = moonTexture();
  const waveTex = waveTexture();
  const panelOpacity = isMobile ? 0.24 : 0.36;
  addWallVisual(decal(flowerTex, 4.6, 4.6, [-37.08, 6.2, -25], [0, Math.PI / 2, 0], panelOpacity), 38);
  addWallVisual(decal(flowerTex, 4.3, 4.3, [37.08, 6.1, -12], [0, -Math.PI / 2, 0], panelOpacity), 38);
  addWallVisual(decal(flowerTex, 4.8, 4.8, [14, 7.6, -37.08], [0, 0, 0], isMobile ? 0.22 : 0.34), 44);
  addWallVisual(decal(windowTex, 5.4, 3.2, [-37.1, 9.2, -11], [0, Math.PI / 2, 0], isMobile ? 0.18 : 0.28), 34);
  addWallVisual(decal(windowTex, 5.4, 3.2, [37.1, 9.2, -24], [0, -Math.PI / 2, 0], isMobile ? 0.18 : 0.28), 34);
  addWallVisual(decal(windowTex, 5.8, 3.4, [-18, 9.4, -37.1], [0, 0, 0], isMobile ? 0.16 : 0.26), 40);
  addWallVisual(decal(angelTex, 7.2, 3.2, [-37.12, 6.7, -4], [0, Math.PI / 2, 0], isMobile ? 0.24 : 0.34), 36);
  addWallVisual(decal(moonTex, 5.8, 1.65, [37.12, 6.6, 5.5], [0, -Math.PI / 2, 0], isMobile ? 0.24 : 0.34), 34);
  addWallVisual(decal(waveTex, 6.2, 2.4, [37.12, 5.8, -27], [0, -Math.PI / 2, 0], isMobile ? 0.22 : 0.32), 38);
  const gridMat = new MeshBasicMaterial({ color: new Color("#00E5FF"), transparent: true, opacity: isMobile ? 0.08 : 0.12, depthWrite: false, side: DoubleSide });
  [[{ x: 0, z: -6 }, { x: 22, z: 1.5 }], [{ x: 0, z: -6 }, { x: -8, z: 4 }], [{ x: 0, z: -6 }, { x: 5, z: -18 }], [{ x: 0, z: -6 }, { x: -24, z: 3 }]].forEach(([a, b]) => addGridLine(group, a, b, gridMat));
  const crystalMat = new MeshBasicMaterial({ color: new Color("#BFA2FF"), transparent: true, opacity: isMobile ? 0.32 : 0.48, depthWrite: false });
  [[-28, 12.8, -37.5], [12, 14.4, -37.5], [37.5, 11.2, -17]].forEach(([x, y, z]) => {
    const crystal = new Group();
    crystal.position.set(x, y, z);
    crystal.userData.visualRange = isMobile ? 30 : 44;
    [[0, 0], [0.32, 0.18], [-0.28, 0.16]].forEach(([ox, oz], i) => {
      const c = new Mesh(new ConeGeometry(0.22 - i * 0.035, 0.85 - i * 0.1, 5), crystalMat);
      c.position.set(ox, 0, oz);
      c.rotation.y = i * 0.7;
      crystal.add(c);
    });
    group.add(crystal);
    wallVisuals.push(crystal);
  });
  group.userData.wallVisuals = wallVisuals;

  const words = ["ALIGN", "RECEIVE", "TRUST", "FLOW", "CALM", "FOCUS", "ACTIVATE", "I AM", "BECOME", "HARMONIZE", "ENERGY FIRST", "STAY ALIGNED", "I AM READY", "HIGHER SELF", "ABUNDANCE FLOWS", "CLARITY NOW"];
  const spots = [[-9, 1.9, -18], [9, 1.9, -15], [-20, 2.2, -4], [17, 2.1, 9.5], [-7, 2.25, 10.5], [22, 2.2, -23], [-28, 2.3, 2], [27, 2.3, -2], [0, 2.1, -21], [-13, 2.35, 3], [12, 2.25, 2], [-24, 2.35, 13], [24, 2.35, -8]];
  const shuffledWords = [...words].sort(() => Math.random() - 0.5);
  const shuffledSpots = [...spots].sort(() => Math.random() - 0.5);
  const count = isMobile ? 7 : 9;
  const affirmations = shuffledSpots.slice(0, count).map((spot, i) => [shuffledWords[i % shuffledWords.length], ...spot]);
  group.userData.affirmations = affirmations.map(([text, x, y, z]) => { const h = affirmationHologram(text, x, y, z, isMobile ? 0.56 : 0.74); group.add(h); return h; });

  scene.add(group); scene.userData.citySpiritualVisuals = group;
}

export function animateCitySpiritualVisuals(scene, t, px, pz) {
  const group = scene.userData.citySpiritualVisuals;
  if (!group?.userData?.affirmations) return;
  group.userData.affirmations.forEach((h) => {
    const dx = h.position.x - px, dz = h.position.z - pz, d2 = dx * dx + dz * dz;
    const near = d2 < 18 * 18;
    h.position.y = h.userData.baseY + Math.sin(t * 0.75 + h.userData.phase) * 0.08;
    h.rotation.y = Math.sin(t * 0.18 + h.userData.phase) * 0.12;
    const opacity = near ? h.userData.baseOpacity * (0.82 + Math.sin(t * 1.1 + h.userData.phase) * 0.08) : 0;
    h.visible = near;
    h.children.forEach((side) => { side.material.opacity = opacity; });
  });
  (group.userData.wallVisuals || []).forEach((visual) => {
    const dx = visual.position.x - px, dz = visual.position.z - pz;
    const range = visual.userData.visualRange || 38;
    visual.visible = dx * dx + dz * dz < range * range;
  });
}