/**
 * DJBooth — futuristic Live DJ Booth outside the Dance Floor.
 * Positioned just outside the dance floor edge, facing the dance floor center.
 * Exports same symbols as the old Jukebox so CityCanvas needs no changes.
 */
import * as THREE from "three";

// Plaza / dance floor center
const PLAZA_X = 0;
const PLAZA_Z = -4;

// DJ Booth sits to the right of the dance floor, just outside its edge
export const JUKEBOX_POS = { x: PLAZA_X + 8.2, z: PLAZA_Z + 0.5 };
export const JUKEBOX_INTERACT_RADIUS = 5.5;
export const DANCE_FLOOR_RADIUS = 7;

// Scale multiplier — 1.5× larger than original
const SCALE = 1.5;

// Angle from booth toward dance floor center (booth faces left-inward)
// atan2(dz, dx) where d = (PLAZA - BOOTH)
const FACE_ANGLE = Math.atan2(PLAZA_Z - JUKEBOX_POS.z, PLAZA_X - JUKEBOX_POS.x) - Math.PI / 2;

function mat(hexColor, opts = {}) {
  const m = new THREE.MeshStandardMaterial();
  m.color = new THREE.Color(hexColor);
  m.roughness = opts.roughness ?? 0.45;
  m.metalness = opts.metalness ?? 0.6;
  if (opts.transparent) {
    m.transparent = true;
    m.opacity = opts.opacity ?? 1;
    m.depthWrite = opts.depthWrite ?? true;
  }
  return m;
}

function basicMat(hex, opacity = 1) {
  const m = new THREE.MeshBasicMaterial({ color: new THREE.Color(hex), depthWrite: false });
  if (opacity < 1) { m.transparent = true; m.opacity = opacity; }
  return m;
}

export function createJukebox(scene) {
  const group = new THREE.Group();
  group.name = "jukebox";
  // Apply 1.5× scale to the whole booth group
  group.scale.set(SCALE, SCALE, SCALE);

  // ── Platform base ──────────────────────────────────────────────────
  const platform = new THREE.Mesh(
    new THREE.CylinderGeometry(1.9, 2.1, 0.12, 24),
    mat("#0A0A1E", { roughness: 0.3, metalness: 0.7 })
  );
  platform.position.y = 0.06;
  platform.receiveShadow = true;
  group.add(platform);

  // Platform glow ring
  const platRingMat = basicMat("#00D4F0", 0.25);
  const platRing = new THREE.Mesh(new THREE.RingGeometry(1.65, 1.9, 48), platRingMat);
  platRing.rotation.x = -Math.PI / 2;
  platRing.position.y = 0.13;
  platRing.renderOrder = 1;
  platRing.name = "djPlatRing";
  group.add(platRing);

  // ── Console main body ──────────────────────────────────────────────
  const console_ = new THREE.Mesh(
    new THREE.BoxGeometry(1.85, 0.55, 0.92),
    mat("#12102A", { roughness: 0.2, metalness: 0.75 })
  );
  console_.position.set(0, 0.42, 0);
  console_.castShadow = true;
  group.add(console_);

  // Sloped front face
  const slope = new THREE.Mesh(
    new THREE.BoxGeometry(1.85, 0.06, 0.92),
    mat("#1A1840", { roughness: 0.2, metalness: 0.7 })
  );
  slope.position.set(0, 0.70, 0);
  slope.rotation.x = 0.28;
  group.add(slope);

  // Console top glow mat
  const topGlowMat = basicMat("#00D4F0", 0.16);
  const topGlow = new THREE.Mesh(new THREE.BoxGeometry(1.75, 0.02, 0.82), topGlowMat);
  topGlow.position.set(0, 0.70, 0);
  topGlow.name = "djTopGlow";
  group.add(topGlow);

  // ── EQ bars on front face of console ──────────────────────────────
  const eqBarCount = 8;
  const eqBarMats = [];
  const eqBars = [];
  for (let i = 0; i < eqBarCount; i++) {
    const barMat = basicMat(i % 2 === 0 ? "#00E5FF" : "#C43BFF", 0.85);
    const bar = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.14, 0.05), barMat);
    const bx = -0.72 + i * 0.205;
    bar.position.set(bx, 0.72, 0.475);
    bar.name = `djEqBar_${i}`;
    group.add(bar);
    eqBarMats.push(barMat);
    eqBars.push({ mesh: bar, baseX: bx, phase: i * 0.65 });
  }
  scene.userData.djEqBars = eqBars;
  scene.userData.djEqBarMats = eqBarMats;

  // ── DJ deck platters on top of console ──────────────────────────
  for (const px of [-0.48, 0.48]) {
    const platter = new THREE.Mesh(
      new THREE.CylinderGeometry(0.3, 0.3, 0.04, 24),
      mat("#1A1A3A", { roughness: 0.15, metalness: 0.85 })
    );
    platter.position.set(px, 0.73, -0.06);
    group.add(platter);

    const groove = new THREE.Mesh(
      new THREE.RingGeometry(0.17, 0.28, 32),
      basicMat("#00D4F0", 0.32)
    );
    groove.rotation.x = -Math.PI / 2;
    groove.position.set(px, 0.76, -0.06);
    groove.renderOrder = 1;
    group.add(groove);

    const dot = new THREE.Mesh(
      new THREE.CylinderGeometry(0.04, 0.04, 0.03, 12),
      basicMat("#FF4FC3", 0.9)
    );
    dot.position.set(px, 0.77, -0.06);
    group.add(dot);
  }

  // ── Speaker towers — angled inward toward dance floor center ──────
  const djTrimMats = [];
  const djBeamMats = [];

  for (const sx of [-1.6, 1.6]) {
    // Tilt each tower inward (toward dance floor center) by ~15°
    const towerGroup = new THREE.Group();
    towerGroup.position.set(sx, 0, 0);
    // Rotate inward: left tower rotates +Z, right tower rotates -Z
    towerGroup.rotation.y = sx < 0 ? 0.22 : -0.22;
    group.add(towerGroup);

    const tower = new THREE.Mesh(
      new THREE.BoxGeometry(0.42, 1.7, 0.4),
      mat("#0E0E22", { roughness: 0.25, metalness: 0.6 })
    );
    tower.position.set(0, 0.87, 0);
    tower.castShadow = true;
    towerGroup.add(tower);

    // Speaker cone facing dance floor (positive Z in local = toward floor)
    const cone = new THREE.Mesh(
      new THREE.CylinderGeometry(0.13, 0.18, 0.08, 16),
      mat("#1A1A40", { roughness: 0.4, metalness: 0.5 })
    );
    cone.rotation.x = Math.PI / 2;
    cone.position.set(0, 0.82, 0.22);
    towerGroup.add(cone);

    const tweeter = new THREE.Mesh(
      new THREE.CylinderGeometry(0.06, 0.08, 0.06, 12),
      mat("#111130", { roughness: 0.4, metalness: 0.5 })
    );
    tweeter.rotation.x = Math.PI / 2;
    tweeter.position.set(0, 1.3, 0.22);
    towerGroup.add(tweeter);

    // Neon side strip
    const stripMat = basicMat(sx < 0 ? "#C43BFF" : "#00D4F0", 0.75);
    const strip = new THREE.Mesh(new THREE.BoxGeometry(0.03, 1.45, 0.04), stripMat);
    strip.position.set(sx < 0 ? 0.23 : -0.23, 0.87, 0);
    towerGroup.add(strip);
    djTrimMats.push(stripMat);

    // Tower top glow
    const towerTop = new THREE.Mesh(
      new THREE.BoxGeometry(0.4, 0.04, 0.38),
      basicMat(sx < 0 ? "#C43BFF" : "#00D4F0", 0.55)
    );
    towerTop.position.set(0, 1.72, 0);
    towerGroup.add(towerTop);

    // Light beam aimed toward dance floor center
    const beamMat = basicMat(sx < 0 ? "#C43BFF" : "#00D4F0", 0.07);
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.4, 7.0, 8, 1, true), beamMat);
    beam.rotation.x = -0.3;
    beam.rotation.z = sx < 0 ? 0.25 : -0.25;
    beam.position.set(sx < 0 ? 0.8 : -0.8, 2.4, 2.0);
    beam.renderOrder = 1;
    towerGroup.add(beam);
    djBeamMats.push(beamMat);
  }

  scene.userData.djTrimMats = djTrimMats;
  scene.userData.djBeamMats = djBeamMats;

  // ── Point lights ───────────────────────────────────────────────────
  const djLightCyan = new THREE.PointLight();
  djLightCyan.color = new THREE.Color("#00D4F0");
  djLightCyan.intensity = 4.5;
  djLightCyan.distance = 14;
  djLightCyan.position.set(0, 1.6, 0.5);
  group.add(djLightCyan);

  const djLightPurple = new THREE.PointLight();
  djLightPurple.color = new THREE.Color("#C43BFF");
  djLightPurple.intensity = 3.0;
  djLightPurple.distance = 12;
  djLightPurple.position.set(0, 2.0, 1.5);
  group.add(djLightPurple);

  // ── "LIVE DJ" hologram sign (main, above console) ─────────────────
  const holoCanvas = document.createElement("canvas");
  holoCanvas.width = 384; holoCanvas.height = 96;
  const hCtx = holoCanvas.getContext("2d");
  // Main "▶ LIVE DJ" text
  hCtx.shadowColor = "#00E5FF";
  hCtx.shadowBlur = 28;
  hCtx.font = "bold 40px 'Syne','Inter',sans-serif";
  hCtx.textAlign = "center";
  hCtx.textBaseline = "middle";
  hCtx.fillStyle = "#00E5FF";
  hCtx.fillText("▶ LIVE DJ", 192, 40);
  hCtx.fillText("▶ LIVE DJ", 192, 40); // double pass for glow
  // "Upper Vibe Radio" subtitle
  hCtx.shadowColor = "#C43BFF";
  hCtx.shadowBlur = 14;
  hCtx.font = "600 18px 'Inter',sans-serif";
  hCtx.fillStyle = "rgba(196,59,255,0.85)";
  hCtx.fillText("Upper Vibe Radio", 192, 72);
  const holoTex = new THREE.CanvasTexture(holoCanvas);
  holoTex.minFilter = THREE.LinearFilter;
  holoTex.colorSpace = THREE.SRGBColorSpace;
  const holoMat = new THREE.SpriteMaterial({ map: holoTex, transparent: true, depthWrite: false, depthTest: false });
  const holo = new THREE.Sprite(holoMat);
  holo.scale.set(3.2, 1.0, 1);
  holo.position.set(0, 2.2, 0.3);
  holo.renderOrder = 999;
  holo.name = "djHoloSign";
  group.add(holo);
  scene.userData.djHoloMat = holoMat;

  // ── Floating "Now Playing" display (world-space sprite, updated dynamically) ─
  const nowPlayingCanvas = document.createElement("canvas");
  nowPlayingCanvas.width = 512; nowPlayingCanvas.height = 80;
  const npCtx = nowPlayingCanvas.getContext("2d");
  const nowPlayingTex = new THREE.CanvasTexture(nowPlayingCanvas);
  nowPlayingTex.minFilter = THREE.LinearFilter;
  nowPlayingTex.colorSpace = THREE.SRGBColorSpace;
  const nowPlayingMat = new THREE.SpriteMaterial({ map: nowPlayingTex, transparent: true, depthWrite: false, depthTest: false });
  const nowPlayingSprite = new THREE.Sprite(nowPlayingMat);
  nowPlayingSprite.scale.set(3.8, 0.75, 1);
  nowPlayingSprite.position.set(JUKEBOX_POS.x, 5.2, JUKEBOX_POS.z);
  nowPlayingSprite.renderOrder = 999;
  nowPlayingSprite.name = "djNowPlaying";
  scene.add(nowPlayingSprite);

  // Store refs so we can update Now Playing text from outside
  scene.userData.djNowPlayingCanvas = nowPlayingCanvas;
  scene.userData.djNowPlayingCtx = npCtx;
  scene.userData.djNowPlayingTex = nowPlayingTex;
  scene.userData.djNowPlayingSprite = nowPlayingSprite;

  // Initial draw (empty)
  function drawNowPlaying(title, artist) {
    npCtx.clearRect(0, 0, 512, 80);
    // Background pill
    npCtx.fillStyle = "rgba(0,0,0,0.55)";
    roundRect(npCtx, 8, 8, 496, 64, 16);
    npCtx.fill();
    npCtx.strokeStyle = "rgba(0,229,255,0.35)";
    npCtx.lineWidth = 1.5;
    roundRect(npCtx, 8, 8, 496, 64, 16);
    npCtx.stroke();
    // "NOW PLAYING" label
    npCtx.shadowColor = "#00E5FF";
    npCtx.shadowBlur = 10;
    npCtx.font = "600 13px 'Inter',sans-serif";
    npCtx.textAlign = "left";
    npCtx.fillStyle = "rgba(0,229,255,0.7)";
    npCtx.fillText("NOW PLAYING", 28, 30);
    // Title
    npCtx.shadowColor = "#fff";
    npCtx.shadowBlur = 8;
    npCtx.font = "bold 20px 'Syne','Inter',sans-serif";
    npCtx.fillStyle = "#ffffff";
    const maxW = 420;
    let t = title || "Live DJ Mix";
    // Truncate if needed
    while (npCtx.measureText(t).width > maxW && t.length > 4) t = t.slice(0, -4) + "…";
    npCtx.fillText(t, 28, 52);
    // Artist
    npCtx.shadowBlur = 0;
    npCtx.font = "400 13px 'Inter',sans-serif";
    npCtx.fillStyle = "rgba(255,255,255,0.45)";
    const aText = artist ? `— ${artist}` : "";
    npCtx.fillText(aText, 28 + npCtx.measureText(t).width + 6, 52);
    nowPlayingTex.needsUpdate = true;
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
  drawNowPlaying("", "");
  scene.userData.djDrawNowPlaying = drawNowPlaying;

  // ── Music pulse rings ─────────────────────────────────────────────
  const pulseRingMats = [];
  for (let r = 0; r < 3; r++) {
    const prMat = basicMat(r % 2 === 0 ? "#00D4F0" : "#C43BFF", 0.07 - r * 0.015);
    const pr = new THREE.Mesh(new THREE.RingGeometry(1.1 + r * 1.2, 1.22 + r * 1.2, 48), prMat);
    pr.rotation.x = -Math.PI / 2;
    pr.position.y = 0.01;
    pr.renderOrder = 1;
    pr.name = `djPulseRing_${r}`;
    group.add(pr);
    pulseRingMats.push({ mat: prMat, base: 0.07 - r * 0.015, phase: r * 1.2 });
  }
  scene.userData.djPulseRingMats = pulseRingMats;

  // ── Position and rotate so the FRONT faces the dance floor ────────
  group.position.set(JUKEBOX_POS.x, 0, JUKEBOX_POS.z);
  group.rotation.y = FACE_ANGLE;
  scene.add(group);

  // Store refs for animation
  scene.userData.jukebox = group;
  scene.userData.jukeboxLight = djLightCyan;
  scene.userData.jukeboxScreenMat = topGlowMat;
  scene.userData.jukeboxGlowRingMat = platRingMat;
  scene.userData.jukeboxTrimMats = djTrimMats;
  scene.userData.jukeboxGrilleMats = eqBarMats;
  scene.userData.djLightCyan = djLightCyan;
  scene.userData.djLightPurple = djLightPurple;

  return group;
}

/**
 * animateJukebox — called every frame from CityCanvas render loop.
 */
export function animateJukebox(scene, t, beat) {
  // EQ bars bounce with music
  const eqBars = scene.userData.djEqBars;
  if (eqBars) {
    for (const b of eqBars) {
      const h = 0.1 + Math.abs(Math.sin(t * 3.8 + b.phase)) * 0.3 + beat * 0.38;
      b.mesh.scale.y = Math.max(0.5, h / 0.14);
      b.mesh.position.y = 0.72 + (h - 0.14) * 0.5;
    }
  }
  const eqMats = scene.userData.djEqBarMats;
  if (eqMats) {
    for (let i = 0; i < eqMats.length; i++) {
      eqMats[i].opacity = 0.5 + beat * 0.48 + Math.sin(t * 4.2 + i * 0.6) * 0.15;
    }
  }

  // Hologram flicker
  const holoMat = scene.userData.djHoloMat;
  if (holoMat) {
    holoMat.opacity = 0.72 + Math.sin(t * 3.1) * 0.18 + beat * 0.14;
  }

  // Console top glow
  const topGlow = scene.userData.jukeboxScreenMat;
  if (topGlow) {
    topGlow.opacity = 0.09 + beat * 0.38 + Math.sin(t * 2.2) * 0.05;
  }

  // Platform ring
  const platRing = scene.userData.jukeboxGlowRingMat;
  if (platRing) {
    platRing.opacity = 0.12 + beat * 0.55 + Math.sin(t * 1.8) * 0.07;
  }

  // Trim strips color shift cyan ↔ purple
  const trimMats = scene.userData.jukeboxTrimMats;
  if (trimMats) {
    const shift = Math.sin(t * 0.9) * 0.5 + 0.5;
    const cyan = new THREE.Color("#00D4F0");
    const purple = new THREE.Color("#C43BFF");
    for (let i = 0; i < trimMats.length; i++) {
      trimMats[i].color.copy(i % 2 === 0 ? cyan : purple).lerp(i % 2 === 0 ? purple : cyan, shift);
      trimMats[i].opacity = 0.5 + beat * 0.42;
    }
  }

  // Light beams
  const beamMats = scene.userData.djBeamMats;
  if (beamMats) {
    for (let i = 0; i < beamMats.length; i++) {
      beamMats[i].opacity = 0.04 + beat * 0.14 + Math.sin(t * 1.6 + i) * 0.02;
    }
  }

  // Pulse rings
  const prMats = scene.userData.djPulseRingMats;
  if (prMats) {
    for (const pr of prMats) {
      pr.mat.opacity = Math.max(0, pr.base + beat * 0.28 + Math.sin(t * 2.1 + pr.phase) * 0.04);
    }
  }

  // Lights
  const cl = scene.userData.djLightCyan;
  if (cl) cl.intensity = 2.5 + beat * 3.8 + Math.sin(t * 2.2) * 0.5;

  const pl = scene.userData.djLightPurple;
  if (pl) pl.intensity = 1.2 + beat * 2.2 + Math.sin(t * 1.7 + 1.2) * 0.4;
}