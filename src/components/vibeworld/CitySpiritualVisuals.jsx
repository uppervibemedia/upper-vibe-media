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
  group.add(decal(angelTexture(), 7.2, 3.8, [-35.86, 5.8, -14], rotEast, isMobile ? 0.4 : 0.58));
  group.add(decal(moonTexture(), 6.2, 2.4, [9, 7.2, -35.84], rotSouth, isMobile ? 0.42 : 0.62));
  group.add(decal(waveTexture(), 6.4, 3.0, [35.86, 4.8, 4], rotWest, isMobile ? 0.38 : 0.58));
  group.add(decal(waveTexture(), 5.4, 2.6, [-26, 4.2, -35.85], rotSouth, isMobile ? 0.34 : 0.52));

  const gridMat = new MeshBasicMaterial({ color: new Color("#00E5FF"), transparent: true, opacity: isMobile ? 0.14 : 0.2, depthWrite: false, side: DoubleSide });
  const zones = [{ x: 0, z: -32 }, { x: 0, z: -6 }, { x: 12, z: 6 }, { x: -13, z: 10 }, { x: -28, z: 5 }, { x: -16, z: -13 }, { x: 0, z: -32 }];
  for (let i = 0; i < zones.length - 1; i++) addGridLine(group, zones[i], zones[i + 1], gridMat);

  const crystalMat = new MeshBasicMaterial({ color: new Color("#A078FF"), transparent: true, opacity: isMobile ? 0.42 : 0.62, depthWrite: false });
  [[-22, 10.4, -34], [24, 9.2, -34], [34, 8.4, -2], [-34, 7.8, 3]].forEach(([x, y, z], i) => { const c = new Mesh(new ConeGeometry(0.38, 1.9, 5), crystalMat); c.position.set(x, y, z); c.rotation.y = i * 0.8; group.add(c); });

  const affirmations = [["Protect Your Peace", -9, 1.7, -18], ["Energy Leads", 9, 1.7, -15], ["Become The Frequency", -20, 1.9, -4], ["Calm Is Power", 15, 1.8, 8], ["Focus Is Currency", -10, 1.8, 7], ["Your Energy Opens Doors", 22, 1.9, -23]];
  group.userData.affirmations = affirmations.map(([text, x, y, z]) => { const h = decal(textTexture(text), 4.5, 1.12, [x, y, z], [0, 0, 0], 0); h.userData.isAffirmationHologram = true; h.userData.baseOpacity = isMobile ? 0.58 : 0.76; group.add(h); return h; });

  scene.add(group); scene.userData.citySpiritualVisuals = group;
}

export function animateCitySpiritualVisuals(scene, t, px, pz) {
  const group = scene.userData.citySpiritualVisuals;
  if (!group?.userData?.affirmations) return;
  group.userData.affirmations.forEach((h) => {
    const dx = h.position.x - px, dz = h.position.z - pz, d2 = dx * dx + dz * dz;
    const near = d2 < 16 * 16;
    h.visible = near;
    h.material.opacity = near ? h.userData.baseOpacity * (0.82 + Math.sin(t * 1.1) * 0.08) : 0;
  });
}