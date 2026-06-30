import * as THREE from "three";

function basic(color, opts = {}) {
  return new THREE.MeshBasicMaterial({ color: new THREE.Color(color), transparent: !!opts.transparent, opacity: opts.opacity ?? 1, depthWrite: false, side: THREE.DoubleSide });
}
function standard(color, opts = {}) {
  return new THREE.MeshStandardMaterial({ color: new THREE.Color(color), roughness: opts.roughness ?? 0.5, metalness: opts.metalness ?? 0.18, transparent: !!opts.transparent, opacity: opts.opacity ?? 1 });
}
function label(text, color = "#B58CFF") {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 96;
  const ctx = canvas.getContext("2d");
  ctx.shadowColor = color;
  ctx.shadowBlur = 14;
  ctx.font = "900 24px 'Syne','Inter',sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "#FFFFFF";
  ctx.fillText(text, 256, 48);
  ctx.fillText(text, 256, 48);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.minFilter = THREE.LinearFilter;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, depthTest: false }));
  sprite.scale.set(3.9, 0.64, 1);
  sprite.renderOrder = 70;
  sprite.userData.isNeonSign = true;
  return sprite;
}
function addPlant(group, x, z, h = 1.1) {
  const plant = new THREE.Group();
  plant.position.set(x, 0.08, z);
  for (let i = 0; i < 5; i++) {
    const leaf = new THREE.Mesh(new THREE.BoxGeometry(0.09, h * (0.75 + i * 0.05), 0.18), standard("#2B9B70", { roughness: 0.72, metalness: 0.02 }));
    leaf.position.y = h * 0.32;
    leaf.rotation.z = (i - 2) * 0.24;
    leaf.rotation.y = i * 1.1;
    plant.add(leaf);
  }
  group.add(plant);
  return plant;
}
function modeMarker(text, x, z, color) {
  const g = new THREE.Group();
  g.position.set(x, 0.08, z);
  const pad = new THREE.Mesh(new THREE.CircleGeometry(0.68, 28), basic(color, { transparent: true, opacity: 0.24 }));
  pad.rotation.x = -Math.PI / 2;
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.7, 0.82, 30), basic(color, { transparent: true, opacity: 0.48 }));
  ring.rotation.x = -Math.PI / 2;
  const sign = label(text, color);
  sign.scale.set(1.8, 0.32, 1);
  sign.position.set(0, 0.86, 0);
  g.add(pad, ring, sign);
  return g;
}

export function createBeachFrequencyCove(scene) {
  const group = new THREE.Group();
  group.name = "beachFrequencyCove";
  const cx = -52;
  const cz = 2;

  const platform = new THREE.Mesh(new THREE.CircleGeometry(5.8, 64), standard("#D8C6A5", { roughness: 0.72, metalness: 0.04, transparent: true, opacity: 0.74 }));
  platform.rotation.x = -Math.PI / 2;
  platform.position.set(cx, 0.045, cz);
  platform.renderOrder = 5;
  group.add(platform);

  const inner = new THREE.Mesh(new THREE.CircleGeometry(3.25, 54), basic("#7DEBFF", { transparent: true, opacity: 0.08 }));
  inner.rotation.x = -Math.PI / 2;
  inner.position.set(cx, 0.065, cz);
  group.add(inner);

  const rings = [
    new THREE.Mesh(new THREE.RingGeometry(2.0, 2.32, 72), basic("#B58CFF", { transparent: true, opacity: 0.5 })),
    new THREE.Mesh(new THREE.RingGeometry(3.6, 3.76, 72), basic("#7DEBFF", { transparent: true, opacity: 0.32 })),
    new THREE.Mesh(new THREE.RingGeometry(5.1, 5.22, 72), basic("#FFD36E", { transparent: true, opacity: 0.28 })),
  ];
  rings.forEach((ring, i) => { ring.rotation.x = -Math.PI / 2; ring.position.set(cx, 0.08 + i * 0.006, cz); ring.renderOrder = 7 + i; group.add(ring); });

  const cave = new THREE.Mesh(new THREE.CircleGeometry(1.65, 42), basic("#06101A", { transparent: true, opacity: 0.9 }));
  cave.position.set(cx, 1.35, cz + 4.72);
  cave.scale.set(1.2, 1.35, 1);
  group.add(cave);
  const caveMouth = new THREE.Mesh(new THREE.TorusGeometry(1.95, 0.18, 8, 34, Math.PI), standard("#243142", { roughness: 0.88, metalness: 0.08 }));
  caveMouth.position.set(cx, 1.38, cz + 4.64);
  caveMouth.rotation.z = Math.PI;
  caveMouth.scale.set(1.22, 1.38, 0.7);
  group.add(caveMouth);
  const caveGlow = new THREE.Mesh(new THREE.RingGeometry(1.7, 1.95, 48), basic("#B58CFF", { transparent: true, opacity: 0.42 }));
  caveGlow.position.set(cx, 1.35, cz + 4.69);
  caveGlow.scale.set(1.2, 1.35, 1);
  group.add(caveGlow);
  const waterfall = new THREE.Mesh(new THREE.PlaneGeometry(1.75, 3.6, 1, 12), basic("#8DEFFF", { transparent: true, opacity: 0.34 }));
  waterfall.position.set(cx, 1.72, cz + 4.58);
  waterfall.renderOrder = 8;
  group.add(waterfall);
  const waterfallSide = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 2.8, 1, 8), basic("#DFFFFF", { transparent: true, opacity: 0.22 }));
  waterfallSide.position.set(cx - 0.58, 1.55, cz + 4.55);
  waterfallSide.renderOrder = 9;
  group.add(waterfallSide);
  const pool = new THREE.Mesh(new THREE.CircleGeometry(2.55, 48), basic("#45DFF5", { transparent: true, opacity: 0.22 }));
  pool.rotation.x = -Math.PI / 2;
  pool.position.set(cx, 0.075, cz + 2.95);
  group.add(pool);
  const rocks = [];
  [[-2.9, 4.35, 1.6], [-2.0, 5.0, 2.1], [-0.9, 5.25, 2.45], [0.9, 5.25, 2.45], [2.0, 5.0, 2.1], [2.9, 4.35, 1.6], [-3.4, 2.9, 1.1], [3.4, 2.9, 1.1]].forEach(([ox, oz, s], i) => {
    const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(s, 0), standard(i % 2 ? "#38465A" : "#2C3546", { roughness: 0.86, metalness: 0.08 }));
    rock.position.set(cx + ox, s * 0.55, cz + oz);
    rock.scale.set(1.25, 0.95, 0.82);
    rock.rotation.set(0.12 * i, 0.45 * i, -0.08 * i);
    group.add(rock);
    rocks.push(rock);
  });

  const markers = [
    modeMarker("AFFIRM", cx - 2.6, cz + 1.5, "#7DEBFF"),
    modeMarker("MANIFEST", cx + 2.6, cz + 1.5, "#B58CFF"),
    modeMarker("VISUAL", cx, cz - 2.9, "#FFD36E"),
  ];
  ["affirmation", "manifest", "visualizer"].forEach((key, i) => { markers[i].userData.modeKey = key; markers[i].userData.baseY = markers[i].position.y; });
  markers.forEach((m) => group.add(m));

  const modeBeam = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 2.45, 3.8, 36, 1, true), basic("#7DEBFF", { transparent: true, opacity: 0.12 }));
  modeBeam.position.set(cx, 1.9, cz);
  group.add(modeBeam);

  const crystals = [];
  for (let i = 0; i < 10; i++) {
    const angle = (i / 10) * Math.PI * 2;
    const r = 4.15 + (i % 2) * 0.55;
    const x = cx + Math.cos(angle) * r;
    const z = cz + Math.sin(angle) * r;
    const crystal = new THREE.Mesh(new THREE.ConeGeometry(0.24 + (i % 3) * 0.04, 1.05 + (i % 3) * 0.22, 6), standard(i % 2 ? "#7DEBFF" : "#B58CFF", { roughness: 0.24, metalness: 0.42 }));
    crystal.position.set(x, 0.56, z);
    crystal.rotation.z = Math.sin(i) * 0.18;
    group.add(crystal);
    crystals.push(crystal);
  }

  [[cx - 5.6, cz - 2.8, 1.0], [cx + 5.3, cz - 2.4, 1.25], [cx - 4.7, cz + 4.2, 0.95], [cx + 4.9, cz + 3.8, 1.12]].forEach(([x, z, h]) => addPlant(group, x, z, h));

  const particles = [];
  for (let i = 0; i < 34; i++) {
    const p = new THREE.Mesh(new THREE.SphereGeometry(0.045 + (i % 3) * 0.018, 8, 6), basic(i % 2 ? "#B58CFF" : "#7DEBFF", { transparent: true, opacity: 0.36 }));
    const a = Math.random() * Math.PI * 2;
    const r = 1.7 + Math.random() * 4.2;
    p.position.set(cx + Math.cos(a) * r, 0.45 + Math.random() * 1.7, cz + Math.sin(a) * r);
    p.userData = { a, r, speed: 0.12 + Math.random() * 0.18, y: p.position.y };
    group.add(p);
    particles.push(p);
  }

  const sign = label("FREQUENCY COVE", "#B58CFF");
  sign.position.set(cx, 3.45, cz + 4.25);
  group.add(sign);
  const enterSign = label("ENTER", "#7DEBFF");
  enterSign.scale.set(2.4, 0.42, 1);
  enterSign.position.set(cx, 0.85, cz + 2.4);
  group.add(enterSign);

  const light = new THREE.PointLight(new THREE.Color("#B58CFF"), 1.75, 16);
  light.position.set(cx, 2.4, cz);
  group.add(light);
  const aqua = new THREE.PointLight(new THREE.Color("#7DEBFF"), 1.0, 12);
  aqua.position.set(cx - 2.8, 1.4, cz + 2.2);
  group.add(aqua);

  group.userData = { rings, crystals, particles, markers, modeBeam, waterfall, waterfallSide, pool, caveGlow, rocks, light, aqua, cx, cz };
  scene.add(group);
  scene.userData.beachFrequencyCove = group;
}

export function animateBeachFrequencyCove(scene, t, beat = 0) {
  const group = scene.userData.beachFrequencyCove;
  if (!group) return;
  const { rings = [], crystals = [], particles = [], markers = [], modeBeam, waterfall, waterfallSide, pool, caveGlow, light, aqua, cx, cz } = group.userData || {};
  const mode = window.__uvcFrequencyCoveMode || "affirmation";
  const active = !!window.__uvcFrequencyCoveActive;
  const modeColor = mode === "manifest" ? new THREE.Color("#B58CFF") : mode === "visualizer" ? new THREE.Color("#FFD36E") : new THREE.Color("#7DEBFF");
  rings.forEach((ring, i) => {
    ring.rotation.z += (i % 2 ? -0.006 : 0.008);
    ring.material.opacity = (i === 0 ? 0.42 : 0.24) + (active ? 0.14 : 0) + Math.sin(t * (active ? 2.4 : 1.4) + i) * 0.05 + beat * 0.08;
    ring.material.color.lerp(modeColor, 0.035);
  });
  crystals.forEach((crystal, i) => {
    crystal.position.y = 0.56 + Math.sin(t * 1.7 + i) * 0.06;
    crystal.rotation.y += 0.006;
  });
  markers.forEach((marker, i) => {
    const active = marker.userData.modeKey === mode;
    const targetScale = active ? 1.18 : 0.92;
    marker.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), 0.08);
    marker.position.y = (marker.userData.baseY || 0.08) + (active ? Math.sin(t * 2.4 + i) * 0.05 : 0);
    marker.children?.forEach((child) => { if (child.material?.opacity !== undefined) child.material.opacity = active ? 0.72 + Math.sin(t * 2.2) * 0.14 : 0.22; });
  });
  if (modeBeam?.material) {
    modeBeam.material.color.lerp(modeColor, 0.06);
    modeBeam.material.opacity = (active ? 0.24 : 0.1) + Math.sin(t * (active ? 2.6 : 1.6)) * 0.045 + beat * 0.08;
    modeBeam.rotation.y += 0.004;
  }
  if (waterfall?.material) {
    waterfall.material.color.lerp(modeColor, 0.018);
    waterfall.material.opacity = (active ? 0.44 : 0.28) + Math.sin(t * 5.2) * 0.06;
    waterfall.position.y = 1.72 - (Math.sin(t * 3.8) * 0.08 + 0.08);
    waterfall.scale.y = 1 + Math.sin(t * 4.5) * 0.035;
  }
  if (waterfallSide?.material) {
    waterfallSide.material.color.lerp(modeColor, 0.014);
    waterfallSide.material.opacity = (active ? 0.26 : 0.16) + Math.sin(t * 4.6) * 0.04;
    waterfallSide.position.y = 1.55 - Math.sin(t * 4.1) * 0.06;
  }
  if (pool?.material) {
    pool.material.color.lerp(modeColor, 0.025);
    pool.material.opacity = 0.18 + Math.sin(t * 1.8) * 0.04;
    pool.rotation.z += 0.003;
  }
  if (caveGlow?.material) {
    caveGlow.material.color.lerp(modeColor, 0.045);
    caveGlow.material.opacity = (active ? 0.56 : 0.32) + Math.sin(t * (active ? 2.2 : 1.35)) * 0.08;
  }
  particles.forEach((p) => {
    p.userData.a += p.userData.speed * 0.016;
    p.position.x = cx + Math.cos(p.userData.a + t * p.userData.speed) * p.userData.r;
    p.position.z = cz + Math.sin(p.userData.a + t * p.userData.speed) * p.userData.r;
    p.position.y = p.userData.y + Math.sin(t * 1.5 + p.userData.r) * 0.18;
    p.material.opacity = 0.22 + Math.sin(t * 2 + p.userData.r) * 0.12;
  });
  if (light) light.intensity = 1.35 + Math.sin(t * 1.1) * 0.25 + beat * 0.5;
  if (aqua) aqua.intensity = 0.85 + Math.sin(t * 1.4 + 1) * 0.18 + beat * 0.35;
}