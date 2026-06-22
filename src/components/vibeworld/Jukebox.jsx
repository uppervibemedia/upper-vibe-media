/**
 * DJBooth — futuristic Live DJ Booth outside the Dance Floor.
 * Speakers and lights face the dance floor center.
 */
import * as THREE from "three";

// Plaza / dance floor center
const PLAZA_X = 0;
const PLAZA_Z = -13;

// DJ Booth sits to the right of the dance floor, just outside its edge (moved 20% farther right)
export const JUKEBOX_POS = { x: PLAZA_X + 9.8, z: PLAZA_Z + 0.5 };
export const JUKEBOX_INTERACT_RADIUS = 5.5;
export const DANCE_FLOOR_RADIUS = 7;

// Scale multiplier — 50% larger than original (1.0 * 1.5 * 1.5)
const SCALE = 2.25;

// Angle from booth toward dance floor center
// group.rotation.y = FACE_ANGLE makes the local +Z axis point toward the dance floor
const FACE_ANGLE = Math.atan2(PLAZA_Z - JUKEBOX_POS.z, PLAZA_X - JUKEBOX_POS.x) - Math.PI / 2;

// World-space direction from booth to dance floor center (for placing lights)
const TO_FLOOR_X = PLAZA_X - JUKEBOX_POS.x;
const TO_FLOOR_Z = PLAZA_Z - JUKEBOX_POS.z;
const TO_FLOOR_LEN = Math.sqrt(TO_FLOOR_X * TO_FLOOR_X + TO_FLOOR_Z * TO_FLOOR_Z);
const TO_FLOOR_NX = TO_FLOOR_X / TO_FLOOR_LEN;
const TO_FLOOR_NZ = TO_FLOOR_Z / TO_FLOOR_LEN;

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

  // ── Speaker towers — each faces the dance floor center in world space ──
  // The group has FACE_ANGLE rotation. Speakers sit at local ±X.
  // We compute the world-space angle each speaker needs to face the floor,
  // then subtract FACE_ANGLE to get the local rotation.y needed.
  const djTrimMats = [];
  const djBeamMats = [];

  for (const sx of [-1.6, 1.6]) {
    const towerGroup = new THREE.Group();
    // Local X position of the tower (in group-local space, before scale)
    towerGroup.position.set(sx, 0, 0);

    // World position of this tower (approximate, ignoring scale for angle calc)
    const twWorldX = JUKEBOX_POS.x + Math.cos(FACE_ANGLE) * sx;
    const twWorldZ = JUKEBOX_POS.z - Math.sin(FACE_ANGLE) * sx;

    // World-space angle from tower to dance floor center
    const dxWorld = PLAZA_X - twWorldX;
    const dzWorld = PLAZA_Z - twWorldZ;
    const worldAngleToFloor = Math.atan2(dxWorld, dzWorld); // atan2(x,z) for Y-up rotation

    // Local rotation = world angle minus parent (group) rotation
    towerGroup.rotation.y = worldAngleToFloor - FACE_ANGLE;

    group.add(towerGroup);

    const tower = new THREE.Mesh(
      new THREE.BoxGeometry(0.42, 1.7, 0.4),
      mat("#0E0E22", { roughness: 0.25, metalness: 0.6 })
    );
    tower.position.set(0, 0.87, 0);
    tower.castShadow = true;
    towerGroup.add(tower);

    // Speaker cone — local +Z faces dance floor (since towerGroup points there)
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

    // Light beam — fires toward dance floor in local +Z direction
    const beamMat = basicMat(sx < 0 ? "#C43BFF" : "#00D4F0", 0.07);
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.5, 8.0, 8, 1, true), beamMat);
    // Tilt slightly down toward the floor, pointing forward (+Z)
    beam.rotation.x = 0.18;
    beam.position.set(0, 2.2, 3.0);
    beam.renderOrder = 1;
    towerGroup.add(beam);
    djBeamMats.push(beamMat);
  }

  scene.userData.djTrimMats = djTrimMats;
  scene.userData.djBeamMats = djBeamMats;

  // ── Point lights — placed in WORLD space aimed toward dance floor ──
  // Placed outside the group so they aren't rotated with the booth
  // Offset toward dance floor from the booth position
  const lightOffsetDist = 3.5 * SCALE;
  const djLightCyan = new THREE.PointLight();
  djLightCyan.color = new THREE.Color("#00D4F0");
  djLightCyan.intensity = 6.0;
  djLightCyan.distance = 18;
  djLightCyan.position.set(
    JUKEBOX_POS.x + TO_FLOOR_NX * lightOffsetDist,
    2.5,
    JUKEBOX_POS.z + TO_FLOOR_NZ * lightOffsetDist
  );
  scene.add(djLightCyan);

  const djLightPurple = new THREE.PointLight();
  djLightPurple.color = new THREE.Color("#C43BFF");
  djLightPurple.intensity = 4.0;
  djLightPurple.distance = 16;
  djLightPurple.position.set(
    JUKEBOX_POS.x + TO_FLOOR_NX * (lightOffsetDist * 0.5),
    3.5,
    JUKEBOX_POS.z + TO_FLOOR_NZ * (lightOffsetDist * 0.5)
  );
  scene.add(djLightPurple);

  scene.userData.djLightCyan = djLightCyan;
  scene.userData.djLightPurple = djLightPurple;

  // ── "▶ LIVE DJ" hologram sign — no subtitle, just the main label ──
  const holoCanvas = document.createElement("canvas");
  holoCanvas.width = 320; holoCanvas.height = 64;
  const hCtx = holoCanvas.getContext("2d");
  hCtx.shadowColor = "#00E5FF";
  hCtx.shadowBlur = 28;
  hCtx.font = "bold 42px 'Syne','Inter',sans-serif";
  hCtx.textAlign = "center";
  hCtx.textBaseline = "middle";
  hCtx.fillStyle = "#00E5FF";
  hCtx.fillText("▶ LIVE DJ", 160, 32);
  hCtx.fillText("▶ LIVE DJ", 160, 32); // double pass for glow
  const holoTex = new THREE.CanvasTexture(holoCanvas);
  holoTex.minFilter = THREE.LinearFilter;
  holoTex.colorSpace = THREE.SRGBColorSpace;
  const holoMat = new THREE.SpriteMaterial({ map: holoTex, transparent: true, depthWrite: false, depthTest: false });
  const holo = new THREE.Sprite(holoMat);
  holo.scale.set(2.8, 0.7, 1);
  holo.position.set(0, 2.0, 0.3);
  holo.renderOrder = 999;
  holo.name = "djHoloSign";
  group.add(holo);
  scene.userData.djHoloMat = holoMat;

  // ── Floating "Now Playing" card — replaces "Upper Vibe Radio" subtitle ──
  // Placed in world space above the booth, always visible
  const nowPlayingCanvas = document.createElement("canvas");
  nowPlayingCanvas.width = 512; nowPlayingCanvas.height = 96;
  const npCtx = nowPlayingCanvas.getContext("2d");
  const nowPlayingTex = new THREE.CanvasTexture(nowPlayingCanvas);
  nowPlayingTex.minFilter = THREE.LinearFilter;
  nowPlayingTex.colorSpace = THREE.SRGBColorSpace;
  const nowPlayingMat = new THREE.SpriteMaterial({ map: nowPlayingTex, transparent: true, depthWrite: false, depthTest: false });
  const nowPlayingSprite = new THREE.Sprite(nowPlayingMat);
  nowPlayingSprite.scale.set(4.2, 0.9, 1);
  // Position just above the LIVE DJ holo sign (group is scaled 1.5×, holo at y=2.0 local → ~3.0 world + booth offset)
  nowPlayingSprite.position.set(JUKEBOX_POS.x, 4.0, JUKEBOX_POS.z);
  nowPlayingSprite.renderOrder = 999;
  nowPlayingSprite.name = "djNowPlaying";
  scene.add(nowPlayingSprite);

  scene.userData.djNowPlayingTex = nowPlayingTex;

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

  function drawNowPlaying(title, artist) {
    npCtx.clearRect(0, 0, 512, 96);
    // Card background
    npCtx.fillStyle = "rgba(4,2,20,0.72)";
    roundRect(npCtx, 6, 6, 500, 84, 18);
    npCtx.fill();
    // Cyan border
    npCtx.strokeStyle = "rgba(0,229,255,0.45)";
    npCtx.lineWidth = 1.8;
    roundRect(npCtx, 6, 6, 500, 84, 18);
    npCtx.stroke();

    // "NOW PLAYING" pill label
    npCtx.font = "700 11px 'Inter',sans-serif";
    npCtx.textAlign = "left";
    npCtx.fillStyle = "rgba(0,229,255,0.8)";
    npCtx.shadowColor = "#00E5FF";
    npCtx.shadowBlur = 8;
    npCtx.fillText("◉  NOW PLAYING", 22, 28);

    // Title
    npCtx.shadowColor = "#ffffff";
    npCtx.shadowBlur = 6;
    npCtx.font = "bold 22px 'Syne','Inter',sans-serif";
    npCtx.fillStyle = "#ffffff";
    let t = title || "Live DJ Mix";
    const maxW = 350;
    while (npCtx.measureText(t).width > maxW && t.length > 4) t = t.slice(0, -4) + "…";
    npCtx.fillText(t, 22, 58);

    // Artist
    npCtx.shadowBlur = 0;
    npCtx.font = "400 13px 'Inter',sans-serif";
    npCtx.fillStyle = "rgba(196,180,255,0.65)";
    if (artist) {
      npCtx.fillText(`— ${artist}`, 22 + npCtx.measureText(t).width + 8, 58);
    }

    nowPlayingTex.needsUpdate = true;
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
      beamMats[i].opacity = 0.04 + beat * 0.16 + Math.sin(t * 1.6 + i) * 0.02;
    }
  }

  // Pulse rings
  const prMats = scene.userData.djPulseRingMats;
  if (prMats) {
    for (const pr of prMats) {
      pr.mat.opacity = Math.max(0, pr.base + beat * 0.28 + Math.sin(t * 2.1 + pr.phase) * 0.04);
    }
  }

  // Lights — pulse with beat
  const cl = scene.userData.djLightCyan;
  if (cl) cl.intensity = 3.5 + beat * 4.5 + Math.sin(t * 2.2) * 0.6;

  const pl = scene.userData.djLightPurple;
  if (pl) pl.intensity = 1.8 + beat * 3.0 + Math.sin(t * 1.7 + 1.2) * 0.5;
}