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

  // ── Platform base ──────────────────────────────────────────────────
  const platform = new THREE.Mesh(
    new THREE.CylinderGeometry(1.9, 2.1, 0.12, 24),
    mat("#0A0A1E", { roughness: 0.3, metalness: 0.7 })
  );
  platform.position.y = 0.06;
  platform.receiveShadow = true;
  group.add(platform);

  // Platform glow ring (faces dance floor)
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

  // Sloped front face (angled up toward dancer side)
  const slope = new THREE.Mesh(
    new THREE.BoxGeometry(1.85, 0.06, 0.92),
    mat("#1A1840", { roughness: 0.2, metalness: 0.7 })
  );
  slope.position.set(0, 0.70, 0);
  slope.rotation.x = 0.28;
  group.add(slope);

  // Console top glow mat (stored for animation)
  const topGlowMat = basicMat("#00D4F0", 0.16);
  const topGlow = new THREE.Mesh(new THREE.BoxGeometry(1.75, 0.02, 0.82), topGlowMat);
  topGlow.position.set(0, 0.70, 0);
  topGlow.name = "djTopGlow";
  group.add(topGlow);

  // ── EQ bars (face the dance floor — on the front face of the console) ──
  const eqBarCount = 8;
  const eqBarMats = [];
  const eqBars = [];
  for (let i = 0; i < eqBarCount; i++) {
    const barMat = basicMat(i % 2 === 0 ? "#00E5FF" : "#C43BFF", 0.85);
    const bar = new THREE.Mesh(
      new THREE.BoxGeometry(0.08, 0.14, 0.05),
      barMat
    );
    const bx = -0.72 + i * 0.205;
    // Place on FRONT face of console (negative Z in local space = toward dance floor)
    bar.position.set(bx, 0.72, 0.475);
    bar.name = `djEqBar_${i}`;
    group.add(bar);
    eqBarMats.push(barMat);
    eqBars.push({ mesh: bar, baseX: bx, phase: i * 0.65 });
  }
  scene.userData.djEqBars = eqBars;
  scene.userData.djEqBarMats = eqBarMats;

  // ── DJ deck platters on top of console ──
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

  // ── Speaker towers — flanking the console, facing the dance floor ──
  const djTrimMats = [];
  const djBeamMats = [];

  for (const sx of [-1.6, 1.6]) {
    const tower = new THREE.Mesh(
      new THREE.BoxGeometry(0.42, 1.7, 0.4),
      mat("#0E0E22", { roughness: 0.25, metalness: 0.6 })
    );
    tower.position.set(sx, 0.87, 0);
    tower.castShadow = true;
    group.add(tower);

    // Speaker cone on FRONT face (positive Z = toward dance floor in local space)
    const cone = new THREE.Mesh(
      new THREE.CylinderGeometry(0.11, 0.15, 0.08, 16),
      mat("#1A1A40", { roughness: 0.4, metalness: 0.5 })
    );
    cone.rotation.x = Math.PI / 2;
    cone.position.set(sx, 0.82, 0.22);
    group.add(cone);

    const tweeter = new THREE.Mesh(
      new THREE.CylinderGeometry(0.05, 0.07, 0.06, 12),
      mat("#111130", { roughness: 0.4, metalness: 0.5 })
    );
    tweeter.rotation.x = Math.PI / 2;
    tweeter.position.set(sx, 1.3, 0.22);
    group.add(tweeter);

    // Neon side strip
    const stripMat = basicMat(sx < 0 ? "#C43BFF" : "#00D4F0", 0.75);
    const strip = new THREE.Mesh(new THREE.BoxGeometry(0.03, 1.45, 0.04), stripMat);
    strip.position.set(sx + (sx < 0 ? 0.23 : -0.23), 0.87, 0);
    group.add(strip);
    djTrimMats.push(stripMat);

    // Tower top glow
    const towerTop = new THREE.Mesh(
      new THREE.BoxGeometry(0.4, 0.04, 0.38),
      basicMat(sx < 0 ? "#C43BFF" : "#00D4F0", 0.55)
    );
    towerTop.position.set(sx, 1.72, 0);
    group.add(towerTop);

    // Light beam — angled TOWARD dance floor (front, positive Z in local = toward floor)
    const beamMat = basicMat(sx < 0 ? "#C43BFF" : "#00D4F0", 0.07);
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.4, 6.0, 8, 1, true), beamMat);
    // Tilt toward dance floor: rotate on X to aim forward, slight inward angle on Z
    beam.rotation.x = -0.25;
    beam.rotation.z = sx < 0 ? 0.18 : -0.18;
    beam.position.set(sx < 0 ? sx + 0.9 : sx - 0.9, 2.4, 1.8);
    beam.renderOrder = 1;
    group.add(beam);
    djBeamMats.push(beamMat);
  }

  scene.userData.djTrimMats = djTrimMats;
  scene.userData.djBeamMats = djBeamMats;

  // ── Point lights ───────────────────────────────────────────────────
  const djLightCyan = new THREE.PointLight();
  djLightCyan.color = new THREE.Color("#00D4F0");
  djLightCyan.intensity = 3.5;
  djLightCyan.distance = 11;
  djLightCyan.position.set(0, 1.6, 0.5); // pushed toward dance floor
  group.add(djLightCyan);

  const djLightPurple = new THREE.PointLight();
  djLightPurple.color = new THREE.Color("#C43BFF");
  djLightPurple.intensity = 2.2;
  djLightPurple.distance = 9;
  djLightPurple.position.set(0, 2.0, 1.5); // further toward dance floor
  group.add(djLightPurple);

  // ── Hologram "LIVE DJ" sign above console ─────────────────────────
  const holoCanvas = document.createElement("canvas");
  holoCanvas.width = 256; holoCanvas.height = 64;
  const hCtx = holoCanvas.getContext("2d");
  hCtx.shadowColor = "#00E5FF";
  hCtx.shadowBlur = 20;
  hCtx.font = "bold 26px 'Syne','Inter',sans-serif";
  hCtx.textAlign = "center";
  hCtx.textBaseline = "middle";
  hCtx.fillStyle = "#00E5FF";
  hCtx.fillText("▶ LIVE DJ", 128, 32);
  hCtx.fillText("▶ LIVE DJ", 128, 32);
  const holoTex = new THREE.CanvasTexture(holoCanvas);
  holoTex.minFilter = THREE.LinearFilter;
  holoTex.colorSpace = THREE.SRGBColorSpace;
  const holoMat = new THREE.SpriteMaterial({ map: holoTex, transparent: true, depthWrite: false, depthTest: false });
  const holo = new THREE.Sprite(holoMat);
  holo.scale.set(2.4, 0.6, 1);
  holo.position.set(0, 2.05, 0.3); // slightly forward toward dance floor
  holo.renderOrder = 999;
  holo.name = "djHoloSign";
  group.add(holo);
  scene.userData.djHoloMat = holoMat;

  // ── Floating "DJ BOOTH" label (visible from afar) ─────────────────
  const labelCanvas = document.createElement("canvas");
  labelCanvas.width = 256; labelCanvas.height = 52;
  const lCtx = labelCanvas.getContext("2d");
  lCtx.shadowColor = "#C43BFF";
  lCtx.shadowBlur = 14;
  lCtx.font = "bold 20px 'Syne','Inter',sans-serif";
  lCtx.textAlign = "center";
  lCtx.textBaseline = "middle";
  lCtx.fillStyle = "#C43BFF";
  lCtx.fillText("🎧 DJ BOOTH", 128, 26);
  const labelTex = new THREE.CanvasTexture(labelCanvas);
  labelTex.minFilter = THREE.LinearFilter;
  labelTex.colorSpace = THREE.SRGBColorSpace;
  const labelSprite = new THREE.Sprite(
    new THREE.SpriteMaterial({ map: labelTex, transparent: true, depthWrite: false, depthTest: false })
  );
  labelSprite.scale.set(2.6, 0.65, 1);
  labelSprite.position.set(JUKEBOX_POS.x, 3.3, JUKEBOX_POS.z);
  labelSprite.renderOrder = 999;
  labelSprite.name = "jukeboxLabel";
  scene.add(labelSprite);

  // ── Music pulse rings radiating TOWARD dance floor ─────────────────
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

  // ── Position and rotate so the FRONT of booth faces the dance floor ──
  // FACE_ANGLE computed at module top: atan2(dz, dx) from booth → plaza center, minus 90°
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