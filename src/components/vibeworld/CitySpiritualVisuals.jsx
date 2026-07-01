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
    ctx.clearRect(0, 0, w, h); ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.font = "700 34px Syne, Inter, sans-serif"; ctx.shadowColor = "rgba(0,229,255,0.7)"; ctx.shadowBlur = 18; ctx.fillStyle = "rgba(222,252,255,0.88)"; ctx.fillText(text, w / 2, h / 2);
  }, 512, 128);
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
  const tex = textTexture(text);
  [0, Math.PI].forEach((ry) => {
    const side = new Mesh(new PlaneGeometry(4.5, 1.12), new MeshBasicMaterial({ map: tex, transparent: true, opacity: 0, depthWrite: false, side: THREE.FrontSide }));
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
  const rotSouth = [0, 0, 0], rotNorth = [0, Math.PI, 0], rotEast = [0, -Math.PI / 2, 0], rotWest = [0, Math.PI / 2, 0];

  group.add(decal(flowerTexture(), 5.6, 3.2, [-17.8, 5.4, -35.85], rotSouth, isMobile ? 0.5 : 0.68));
  group.add(decal(flowerTexture(), 4.8, 2.8, [35.85, 5.2, -12], rotWest, isMobile ? 0.42 : 0.6));
  group.add(decal(sacredWindowTexture(), 6, 4, [17, 6.2, -35.82], rotSouth, isMobile ? 0.34 : 0.5));
  group.add(decal(angelTexture(), 7.2, 3.8, [-35.86, 5.8, -14], rotWest, isMobile ? 0.4 : 0.58));
  group.add(decal(moonTexture(), 6.2, 2.4, [9, 7.2, -35.84], rotSouth, isMobile ? 0.42 : 0.62));
  group.add(decal(waveTexture(), 6.4, 3.0, [35.86, 4.8, 4], rotWest, isMobile ? 0.38 : 0.58));
  group.add(decal(waveTexture(), 5.4, 2.6, [-26, 4.2, -35.85], rotSouth, isMobile ? 0.34 : 0.52));

  const gridMat = new MeshBasicMaterial({ color: new Color("#00E5FF"), transparent: true, opacity: isMobile ? 0.2 : 0.3, depthWrite: false, side: DoubleSide });
  gridMat.userData.baseOpacity = isMobile ? 0.2 : 0.3;
  group.userData.energyGridMat = gridMat;
  const zones = [
    { x: -6, z: -27 },
    { x: -27, z: -20 },
    { x: -18, z: -8.5 },
    { x: -30, z: 9.5 },
    { x: -14, z: 16.5 },
    { x: -8, z: 23 },
    { x: 29, z: 15 },
    { x: 27, z: -15 },
    { x: 30, z: -30 },
    { x: -6, z: -27 },
  ];
  for (let i = 0; i < zones.length - 1; i++) addGridLine(group, zones[i], zones[i + 1], gridMat);
  addGridLine(group, { x: -18, z: -8.5 }, { x: 27, z: -15 }, gridMat);
  addGridLine(group, { x: -14, z: 16.5 }, { x: 29, z: 15 }, gridMat);

  const zoneSymbolSize = 7.2;
  const zoneSymbolOpacity = isMobile ? 0.38 : 0.58;
  [
    ["egg", -6, -27, 0.22, 1.0],
    ["flower", -27, -20, -0.16, 0.96],
    ["seed", 27, -15, 0.2, 0.96],
    ["sri", -14, 16.5, -0.28, 0.98],
    ["chakra", -18, -8.5, 0.32, 1.0],
    ["metatron", -30, 9.5, 0.02, 1.0],
    ["fruit", 29, 15, -0.18, 0.94],
    ["vesica", -8, 23, 0.38, 0.92],
    ["pentagon", 30, -30, -0.22, 0.86],
    ["pentagram", -31, -2, 0.12, 0.86],
  ].forEach(([kind, x, z, rot, boost]) => {
    group.add(groundDecal(groundSymbolTexture(kind, ""), zoneSymbolSize, x, z, zoneSymbolOpacity * boost, rot));
  });
  group.add(groundDecal(groundSymbolTexture("metatron", ""), 10.5, 23, -3, zoneSymbolOpacity * 1.08, 0.12));

  const crystalMat = new MeshBasicMaterial({ color: new Color("#A078FF"), transparent: true, opacity: isMobile ? 0.42 : 0.62, depthWrite: false });
  [[-22, 10.4, -34], [24, 9.2, -34], [34, 8.4, -2], [-34, 7.8, 3]].forEach(([x, y, z], i) => { const c = new Mesh(new ConeGeometry(0.38, 1.9, 5), crystalMat); c.position.set(x, y, z); c.rotation.y = i * 0.8; group.add(c); });

  const affirmations = [["Protect Your Peace", -9, 1.7, -18], ["Energy Leads", 9, 1.7, -15], ["Become The Frequency", -20, 1.9, -4], ["Calm Is Power", 15, 1.8, 8], ["Focus Is Currency", -10, 1.8, 7], ["Your Energy Opens Doors", 22, 1.9, -23]];
  group.userData.affirmations = affirmations.map(([text, x, y, z]) => { const h = affirmationHologram(text, x, y, z, isMobile ? 0.58 : 0.76); group.add(h); return h; });

  scene.add(group); scene.userData.citySpiritualVisuals = group;
}

export function animateCitySpiritualVisuals(scene, t, px, pz) {
  const group = scene.userData.citySpiritualVisuals;
  if (!group?.userData?.affirmations) return;
  const energyGridMat = group.userData.energyGridMat;
  if (energyGridMat) {
    const base = energyGridMat.userData.baseOpacity || 0.24;
    energyGridMat.opacity = base * (0.72 + Math.sin(t * 1.4) * 0.18);
  }
  group.userData.affirmations.forEach((h) => {
    const dx = h.position.x - px, dz = h.position.z - pz, d2 = dx * dx + dz * dz;
    const near = d2 < 16 * 16;
    const opacity = near ? h.userData.baseOpacity * (0.82 + Math.sin(t * 1.1) * 0.08) : 0;
    h.visible = near;
    h.children.forEach((side) => { side.material.opacity = opacity; });
  });
}