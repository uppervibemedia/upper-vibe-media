import React, { useRef, useEffect, useState, useCallback } from "react";
import * as THREE from "three";
import { SPAWN, TREE_POSITIONS, PARK_RADIUS } from "./cityData";
import createCitySkyline from "./CitySkyline";
import createVibeShop from "./VibeShop";
import createZenBeach, { animateZenBeach } from "./ZenBeach";
import { addDanceFloor, animateDanceFloor } from "./DanceFloor";
import { createJukebox, animateJukebox, JUKEBOX_POS, JUKEBOX_INTERACT_RADIUS, DANCE_FLOOR_RADIUS } from "./Jukebox";
import { buildLaunchZone, animateLaunchZone, getNearLaunchPad, collectNearbyOrbs, triggerLandingPulse, LAUNCH_HEIGHT, LAUNCH_DURATION, GLIDE_DURATION } from "./VibeLaunchZone";

// Destructure immediately after namespace import to ensure full module load
const {
  WebGLRenderer,
  Scene,
  PerspectiveCamera,
  MeshStandardMaterial,
  MeshBasicMaterial,
  Color,
  Fog,
  PlaneGeometry,
  RingGeometry,
  CircleGeometry,
  CylinderGeometry,
  SphereGeometry,
  BoxGeometry,
  TorusGeometry,
  Vector3,
  Mesh,
  Group,
  DirectionalLight,
  AmbientLight,
  HemisphereLight,
  PointLight,
  PCFSoftShadowMap,
  BufferGeometry,
  BufferAttribute,
  PointsMaterial,
  Points,
  SpriteMaterial,
  Sprite,
  CanvasTexture,
  LinearFilter,
} = THREE;

// ─── CONSTANTS ────────────────────────────────────────────────
const MOVE_SPEED = 3.0;
const ACCELERATION = 10.0;
const DECELERATION = 8.0;
const TURN_SPEED = 2.5;       // radians/sec for A/D turning
const ROTATION_SMOOTH = 8.0;  // how fast avatar body snaps to move direction

// Camera constants
const CAM_DIST = 5.5;         // distance behind avatar
const CAM_HEIGHT = 2.4;       // above avatar ground position
const CAM_LOOK_Y = 0.9;       // look-at Y offset (avatar chest)
const CAM_FOLLOW_SPEED = 6.0; // how fast camera angle follows avatar
const IDLE_ORBIT_DELAY = 120.0; // seconds before idle orbit starts (2 minutes)
const IDLE_ORBIT_SPEED = 0.18; // radians/sec for idle orbit (very slow)

// Tree collisions — radius 0.6 per tree
const TREE_R = 0.5;
const COLLISION_BOXES = TREE_POSITIONS.map(([tx, tz]) => [tx, tz, TREE_R, TREE_R]);

// ─── UTILITIES ────────────────────────────────────────────────
function circleVsCircle(x1, z1, r1, x2, z2, r2) {
  const dx = x1 - x2, dz = z1 - z2;
  return dx * dx + dz * dz < (r1 + r2) * (r1 + r2);
}

function resolveCollisions(px, pz, r, boxes) {
  let x = px, z = pz;
  for (const [bx, bz, br] of boxes) {
    if (!circleVsCircle(x, z, r, bx, bz, br)) continue;
    const dx = x - bx, dz = z - bz;
    const dist = Math.sqrt(dx * dx + dz * dz) || 0.001;
    const overlap = r + br - dist;
    x += (dx / dist) * overlap;
    z += (dz / dist) * overlap;
  }

  // Beach shoreline boundary
  const SHORELINE_Z = 26;
  if (z > 0) {
    if (z > SHORELINE_Z) z = SHORELINE_Z;
    if (x < -28) x = -28;
    if (x > 28) x = 28;
  }

  // Circular boundary for rest of the park
  const d = Math.sqrt(x * x + z * z);
  if (d > PARK_RADIUS - r) {
    x = (x / d) * (PARK_RADIUS - r);
    z = (z / d) * (PARK_RADIUS - r);
  }
  return [x, z];
}

// ─── COLORS ───────────────────────────────────────────────────
function mat(hexColor, opts = {}) {
  const m = new MeshStandardMaterial();
  m.color = new Color(hexColor);
  m.roughness = opts.roughness ?? 0.5;
  m.metalness = opts.metalness ?? 0.05;
  if (opts.transparent) {
    m.transparent = true;
    m.opacity = opts.opacity ?? 1;
    m.depthWrite = opts.depthWrite ?? true;
  }
  return m;
}

// ═══════════════════════════════════════════════════════════════
// BUILD SCENE — Upper Vibe City: 6-zone social hub
// ═══════════════════════════════════════════════════════════════
// ─── Neon zone sign — glowing border + floating text ───────────
function createNeonSign(scene, x, y, z, text, colorHex) {
  const group = new Group();
  group.name = "neonSign_" + text.replace(/\s+/g, "");

  // Glowing backing plate
  const backGeo = new PlaneGeometry(7, 2);
  const backMat = new MeshBasicMaterial({
    color: new Color(colorHex),
    transparent: true, opacity: 0.18, depthWrite: false, side: THREE.DoubleSide,
  });
  const back = new Mesh(backGeo, backMat);
  back.name = "neonBack";
  group.add(back);

  // Neon border frame
  const borderGeo = new PlaneGeometry(7.1, 2.1);
  const borderMat = new MeshBasicMaterial({
    color: new Color(colorHex),
    transparent: true, opacity: 0.50, depthWrite: false, side: THREE.DoubleSide,
  });
  const borderFrame = new Mesh(borderGeo, borderMat);
  borderFrame.renderOrder = 1;
  group.add(borderFrame);

  // Text sprite
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 64;
  const ctx = canvas.getContext("2d");
  ctx.shadowColor = colorHex;
  ctx.shadowBlur = 12;
  ctx.font = "bold 22px 'Syne', 'Inter', sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "#FFFFFF";
  ctx.fillText(text, 128, 32);
  ctx.fillText(text, 128, 32); // double-draw for glow intensity

  const tex = new THREE.CanvasTexture(canvas);
  tex.minFilter = THREE.LinearFilter;
  tex.colorSpace = THREE.SRGBColorSpace;

  const spriteMat = new THREE.SpriteMaterial({
    map: tex,
    transparent: true, depthWrite: false, depthTest: false,
  });
  const sprite = new THREE.Sprite(spriteMat);
  sprite.scale.set(6, 1.5, 1);
  sprite.renderOrder = 2;
  group.add(sprite);

  // Small top accent dot
  const dot = new Mesh(
    new SphereGeometry(0.12, 8, 6),
    new MeshBasicMaterial({ color: new Color("#FFFFFF"), depthWrite: false })
  );
  dot.position.set(0, 1.2, 0);
  group.add(dot);

  group.position.set(x, y, z);
  // Billboard toward camera — sprite handles this but we parent the group to scene
  // Each sign should always face the camera, so we'll make the whole group a billboard
  // Using Object3D.lookAt in render loop — store ref for animation
  group.userData = { isNeonSign: true, baseOpacity: 0.50, colorHex };
  scene.add(group);
}



function buildPark(scene) {
  createCosmicSky(scene);
  createCitySkyline(scene);

  const SHORELINE_Z = 26;
  const OCEAN_DEPTH = 54;

  // ═════════════════════════════════════════════════════════════
  // 1. GROUND — dark urban plaza floor
  // ═════════════════════════════════════════════════════════════
  const groundGeo = new PlaneGeometry(68, 52);
  const groundMat = mat("#0B1020", { roughness: 0.55, metalness: 0.15 });
  const ground = new Mesh(groundGeo, groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(0, -0.01, -10);
  ground.receiveShadow = true;
  ground.name = "plazaGround";
  scene.add(ground);

  // ═════════════════════════════════════════════════════════════
  // 2. UVC CENTRAL PLAZA — circular hub at center
  // ═════════════════════════════════════════════════════════════
  const PLAZA_X = 0, PLAZA_Z = -4, PLAZA_R = 7;

  const plazaDisc = new Mesh(
    new CircleGeometry(PLAZA_R, 64),
    mat("#141B2D", { roughness: 0.35, metalness: 0.30 })
  );
  plazaDisc.rotation.x = -Math.PI / 2;
  plazaDisc.position.set(PLAZA_X, 0.001, PLAZA_Z);
  plazaDisc.receiveShadow = true;
  plazaDisc.name = "plazaDisc";
  scene.add(plazaDisc);

  // UVC center branding ring
  const ringInner = new Mesh(
    new RingGeometry(1.8, 2.1, 64),
    new MeshBasicMaterial({ color: new Color("#00D4F0"), depthWrite: false, side: THREE.DoubleSide })
  );
  ringInner.rotation.x = -Math.PI / 2;
  ringInner.position.set(PLAZA_X, 0.005, PLAZA_Z);
  ringInner.renderOrder = 1;
  scene.add(ringInner);

  // UVC center text disc
  const uvcCanvas = document.createElement("canvas");
  uvcCanvas.width = 128; uvcCanvas.height = 128;
  const uCtx = uvcCanvas.getContext("2d");
  uCtx.fillStyle = "#00D4F0"; uCtx.font = "bold 36px 'Syne','Inter',sans-serif";
  uCtx.textAlign = "center"; uCtx.textBaseline = "middle";
  uCtx.fillText("UVC", 64, 64);
  const uvcTex = new THREE.CanvasTexture(uvcCanvas);
  uvcTex.minFilter = THREE.LinearFilter;
  uvcTex.colorSpace = THREE.SRGBColorSpace;
  const uvcDisc = new Mesh(
    new CircleGeometry(1.5, 32),
    new MeshBasicMaterial({ map: uvcTex, depthWrite: false, side: THREE.DoubleSide })
  );
  uvcDisc.rotation.x = -Math.PI / 2;
  uvcDisc.position.set(PLAZA_X, 0.006, PLAZA_Z);
  uvcDisc.renderOrder = 1;
  scene.add(uvcDisc);

  const ringOuter = new Mesh(
    new RingGeometry(PLAZA_R - 0.5, PLAZA_R - 0.2, 64),
    new MeshBasicMaterial({ color: new Color("#A078FF"), depthWrite: false, side: THREE.DoubleSide })
  );
  ringOuter.rotation.x = -Math.PI / 2;
  ringOuter.position.set(PLAZA_X, 0.005, PLAZA_Z);
  ringOuter.renderOrder = 1;
  scene.add(ringOuter);
  addDanceFloor(scene, PLAZA_X, PLAZA_Z, PLAZA_R);
  createJukebox(scene);

  // ═════════════════════════════════════════════════════════════
  // 3. OPEN CONNECTED FLOOR — clean unified plaza surface
  // ═════════════════════════════════════════════════════════════

  // ═════════════════════════════════════════════════════════════
  // 4. MAIN MUSIC STAGE — north (top) of map
  // ═════════════════════════════════════════════════════════════
  const stage = new Group();
  stage.name = "musicStage";

  const stagePlat = new Mesh(new BoxGeometry(8, 0.5, 5), mat("#1A2050", { roughness: 0.25, metalness: 0.55 }));
  stagePlat.position.set(0, 0.25, -15);
  stagePlat.castShadow = true; stagePlat.receiveShadow = true;
  stage.add(stagePlat);

  const stageEdge = new Mesh(
    new BoxGeometry(8.1, 0.08, 0.1),
    new MeshBasicMaterial({ color: new Color("#00D4F0"), depthWrite: false })
  );
  stageEdge.position.set(0, 0.52, -12.45);
  stage.add(stageEdge);

  const screenMat = mat("#1A1A3A", { roughness: 0.2, metalness: 0.7 });
  const screen = new Mesh(new BoxGeometry(7, 4, 0.2), screenMat);
  screen.position.set(0, 2.5, -17.4);
  screen.castShadow = true;
  screen.name = "stageScreen";
  stage.add(screen);
  scene.userData.stageScreen = screen;
  scene.userData._stageCanvasApplied = false;

  const screenGlow = new Mesh(
  new BoxGeometry(7.2, 4.2, 0.05),
  new MeshBasicMaterial({ color: new Color("#00E5FF"), depthWrite: false, transparent: true, opacity: 0.65 })
  );
  screenGlow.position.set(0, 2.5, -17.4);
  screenGlow.name = "stageScreenGlow";
  stage.add(screenGlow);

  // Stage arch — curved neon frame above screen
  for (let a = 0; a < 8; a++) {
    const archAngle = -Math.PI / 2 + (a / 7) * Math.PI;
    const ax = Math.cos(archAngle) * 3.6;
    const ay = 2.5 + Math.sin(archAngle) * 3.6;
    const archSeg = new Mesh(
      new BoxGeometry(0.08, 0.08, 0.15),
      new MeshBasicMaterial({ color: new Color("#C43BFF"), depthWrite: false, transparent: true, opacity: 0.8 })
    );
    archSeg.position.set(ax, ay, -17.3);
    stage.add(archSeg);
  }

  const spotL = new PointLight();
  spotL.color = new Color("#A078FF"); spotL.intensity = 4; spotL.distance = 12;
  spotL.position.set(-3, 3.5, -15); stage.add(spotL);

  const spotR = new PointLight();
  spotR.color = new Color("#00D4F0"); spotR.intensity = 4; spotR.distance = 12;
  spotR.position.set(3, 3.5, -15); stage.add(spotR);

  for (const sx of [-3.5, 3.5]) {
    const pillar = new Mesh(
      new CylinderGeometry(0.12, 0.15, 4, 8),
      mat("#555588", { roughness: 0.3, metalness: 0.7 })
    );
    pillar.position.set(sx, 2.2, -12.5); pillar.castShadow = true;
    stage.add(pillar);

    const pillarGlow = new Mesh(
      new CylinderGeometry(0.14, 0.17, 0.3, 8),
      new MeshBasicMaterial({ color: new Color("#00D4F0"), depthWrite: false })
    );
    pillarGlow.position.set(sx, 4.2, -12.5);
    stage.add(pillarGlow);
  }

  scene.add(stage);
  createNeonSign(scene, 0, 5.5, -15, "MUSIC  STAGE", "#00D4F0");

  // ═══════════════════════════════════════
  // VIBE LAUNCH ZONE
  // ═══════════════════════════════════════
  buildLaunchZone(scene);
  createNeonSign(scene, 0, 3.2, 4, "VIBE  LAUNCH  ZONE", "#00E5FF");

  // ═════════════════════════════════════════════════════════════
  // 5. VIBE LOUNGE — futuristic social hangout, semi-circle seating
  // ═════════════════════════════════════════════════════════════
  const lounge = new Group();
  lounge.name = "vibeLounge";

  // Platform — larger, darker metallic
  const loungePlat = new Mesh(
    new CircleGeometry(4.5, 48),
    mat("#181032", { roughness: 0.30, metalness: 0.55 })
  );
  loungePlat.rotation.x = -Math.PI / 2;
  loungePlat.position.set(-16, 0.003, -10);
  loungePlat.receiveShadow = true;
  lounge.add(loungePlat);

  // Outer glow ring — pink/purple
  const loungeOuterRing = new Mesh(
    new RingGeometry(4.2, 4.5, 64),
    new MeshBasicMaterial({ color: new Color("#C43BFF"), depthWrite: false, side: THREE.DoubleSide, transparent: true, opacity: 0.5 })
  );
  loungeOuterRing.rotation.x = -Math.PI / 2;
  loungeOuterRing.position.set(-16, 0.006, -10);
  loungeOuterRing.renderOrder = 1;
  lounge.add(loungeOuterRing);

  // Curved neon lounge seating — 5 seats in a semi-circle facing inward
  for (let i = 0; i < 5; i++) {
    const ang = Math.PI + (i / 4) * Math.PI * 0.65; // ~117° arc for openness
    const radius = 2.8;
    const sx = -16 + Math.cos(ang) * radius;
    const sz = -10 + Math.sin(ang) * radius;

    // Curved seat body (3 box segments for a gentle curve effect)
    const seatBase = new Mesh(
      new BoxGeometry(0.75, 0.18, 0.55),
      mat("#2E1E4A", { roughness: 0.3, metalness: 0.3 })
    );
    seatBase.position.set(sx, 0.15, sz);
    seatBase.rotation.y = -ang + Math.PI;
    seatBase.castShadow = true; seatBase.receiveShadow = true;
    lounge.add(seatBase);

    // Glowing seat cushion strip
    const cushionGlow = new Mesh(
      new BoxGeometry(0.7, 0.04, 0.48),
      new MeshBasicMaterial({ color: new Color(i % 2 === 0 ? "#C43BFF" : "#A078FF"), depthWrite: false, transparent: true, opacity: 0.55 })
    );
    cushionGlow.position.set(sx, 0.26, sz);
    cushionGlow.rotation.y = -ang + Math.PI;
    lounge.add(cushionGlow);

    // Small side table between every other seat
    if (i < 4) {
      const nextAng = Math.PI + ((i + 0.5) / 4) * Math.PI * 0.65;
      const tx = -16 + Math.cos(nextAng) * (radius - 0.15);
      const tz = -10 + Math.sin(nextAng) * (radius - 0.15);
      const table = new Mesh(
        new CylinderGeometry(0.22, 0.25, 0.12, 8),
        mat("#3A2A5A", { roughness: 0.25, metalness: 0.5 })
      );
      table.position.set(tx, 0.08, tz);
      table.castShadow = true;
      lounge.add(table);

      const tableGlow = new Mesh(
        new CylinderGeometry(0.24, 0.27, 0.03, 8),
        new MeshBasicMaterial({ color: new Color("#E040FB"), depthWrite: false, transparent: true, opacity: 0.5 })
      );
      tableGlow.position.set(tx, 0.15, tz);
      lounge.add(tableGlow);
    }
  }

  // Central fire pit — modernized
  const firePit = new Mesh(
    new CylinderGeometry(0.5, 0.65, 0.25, 24),
    mat("#3A2A5A", { roughness: 0.2, metalness: 0.6 })
  );
  firePit.position.set(-16, 0.14, -10);
  firePit.castShadow = true;
  lounge.add(firePit);

  // Fire glow layers (pink → purple gradient)
  const loungeFireMats = [];
  for (const [radius, opacity] of [[0.55, 0.7], [0.6, 0.4], [0.7, 0.2]]) {
    const fGlowMat = new MeshBasicMaterial({ color: new Color(radius > 0.55 ? "#C43BFF" : "#E040FB"), depthWrite: false, transparent: true, opacity });
    const fGlow = new Mesh(
      new CylinderGeometry(radius, radius + 0.05, 0.05, 24),
      fGlowMat
    );
    fGlow.position.set(-16, 0.32 + (radius - 0.5) * 0.5, -10);
    lounge.add(fGlow);
    loungeFireMats.push(fGlowMat);
  }

  // ── Neon ambient lighting — floor arcs, vertical pillars, energy ring ──
  const loungeNeonMats = [...loungeFireMats];

  // Floor neon arcs — curved strips on the platform perimeter
  for (let a = 0; a < 3; a++) {
    const arcRadius = 3.2 + a * 0.5;
    const arcAngle = Math.PI * 0.65;
    const arcStart = Math.PI - arcAngle / 2;
    const segments = 32;
    for (let s = 0; s < segments; s++) {
      const ang = arcStart + (s / (segments - 1)) * arcAngle;
      const ax = -16 + Math.cos(ang) * arcRadius;
      const az = -10 + Math.sin(ang) * arcRadius;
      const arcDot = new Mesh(
        new SphereGeometry(0.05, 4, 3),
        new MeshBasicMaterial({
          color: new Color(a === 0 ? "#00D4F0" : a === 1 ? "#A078FF" : "#C43BFF"),
          depthWrite: false, transparent: true, opacity: 0.55,
        })
      );
      arcDot.position.set(ax, 0.02, az);
      lounge.add(arcDot);
      loungeNeonMats.push(arcDot.material);
    }
  }

  // Vertical neon accent pillars — 4 around the lounge
  for (let p = 0; p < 4; p++) {
    const pAng = Math.PI + (p / 3) * Math.PI * 0.65;
    const pr = 3.0;
    const px = -16 + Math.cos(pAng) * pr;
    const pz = -10 + Math.sin(pAng) * pr;
    const pillarMat = new MeshBasicMaterial({
      color: new Color(p % 2 === 0 ? "#00D4F0" : "#A078FF"),
      depthWrite: false, transparent: true, opacity: 0.45,
    });
    const pillar = new Mesh(
      new CylinderGeometry(0.04, 0.04, 2.2, 8),
      pillarMat
    );
    pillar.position.set(px, 1.1, pz);
    lounge.add(pillar);
    loungeNeonMats.push(pillarMat);

    // Pillar top glow dot
    const topDot = new Mesh(
      new SphereGeometry(0.08, 6, 4),
      new MeshBasicMaterial({ color: new Color("#00D4F0"), depthWrite: false, transparent: true, opacity: 0.7 })
    );
    topDot.position.set(px, 2.2, pz);
    lounge.add(topDot);
    loungeNeonMats.push(topDot.material);
  }

  // Ambient energy ring — low, wide, subtle
  const energyRing = new Mesh(
    new RingGeometry(2.8, 3.0, 64),
    new MeshBasicMaterial({ color: new Color("#A078FF"), depthWrite: false, side: THREE.DoubleSide, transparent: true, opacity: 0.25 })
  );
  energyRing.rotation.x = -Math.PI / 2;
  energyRing.position.set(-16, 0.07, -10);
  energyRing.renderOrder = 1;
  lounge.add(energyRing);
  loungeNeonMats.push(energyRing.material);

  // Store lounge neon materials for audio-reactive pulsing
  scene.userData.loungeNeonMats = loungeNeonMats;

  scene.add(lounge);
  createNeonSign(scene, -16, 4.5, -10, "VIBE  LOUNGE", "#C43BFF");

  // ═════════════════════════════════════════════════════════════
  // 6. MUSIC LIBRARY — right-back, entrance faces plaza
  // ═════════════════════════════════════════════════════════════
  const library = new Group();
  library.name = "musicLibrary";

  const libPlat = new Mesh(
    new CircleGeometry(4, 32),
    mat("#162040", { roughness: 0.35, metalness: 0.35 })
  );
  libPlat.rotation.x = -Math.PI / 2;
  libPlat.position.set(16, 0.002, -10);
  libPlat.receiveShadow = true;
  library.add(libPlat);

  // Main building cylinder
  const libBldg = new Mesh(
    new CylinderGeometry(2.8, 3, 3.2, 16),
    mat("#1E2E4A", { roughness: 0.3, metalness: 0.35, transparent: true, opacity: 0.85, depthWrite: true })
  );
  libBldg.position.set(16, 1.6, -10);
  libBldg.castShadow = true;
  library.add(libBldg);

  // Cyan ring lights around building
  for (const ry of [0.3, 1.8, 3.0]) {
    const libRing = new Mesh(
      new RingGeometry(2.85, 3.05, 32),
      new MeshBasicMaterial({ color: new Color("#00D4F0"), depthWrite: false, side: THREE.DoubleSide })
    );
    libRing.rotation.x = -Math.PI / 2;
    libRing.position.set(16, ry, -10);
    libRing.renderOrder = 1;
    library.add(libRing);
  }

  // Headphone icon on top
  const iconCanvas = document.createElement("canvas");
  iconCanvas.width = 64; iconCanvas.height = 64;
  const iCtx = iconCanvas.getContext("2d");
  iCtx.fillStyle = "#00D4F0"; iCtx.font = "bold 40px sans-serif";
  iCtx.textAlign = "center"; iCtx.textBaseline = "middle";
  iCtx.fillText("🎧", 32, 32);
  const iconTex = new THREE.CanvasTexture(iconCanvas);
  iconTex.minFilter = THREE.LinearFilter;
  iconTex.colorSpace = THREE.SRGBColorSpace;
  const iconDisc = new Mesh(
    new CircleGeometry(1.2, 16),
    new MeshBasicMaterial({ map: iconTex, depthWrite: false, side: THREE.DoubleSide })
  );
  iconDisc.rotation.x = -Math.PI / 2;
  iconDisc.position.set(16, 3.25, -10);
  iconDisc.renderOrder = 1;
  library.add(iconDisc);

  // Entrance faces Central Plaza (west, toward 0,-4 from 16,-10)
  const libEntrance = new Mesh(
    new BoxGeometry(2.2, 3.0, 0.08),
    new MeshBasicMaterial({ color: new Color("#0080B8"), depthWrite: false, transparent: true, opacity: 0.65 })
  );
  libEntrance.position.set(16 - 2.8, 1.5, -10);
  libEntrance.rotation.y = Math.PI / 2;
  library.add(libEntrance);

  scene.add(library);
  createNeonSign(scene, 16, 4.2, -10, "MUSIC  LIBRARY", "#00D4F0");

  // ═════════════════════════════════════════════════════════════
  // 7. VISUALIZER DOME — lower-left, entrance facing Central Plaza
  // ═════════════════════════════════════════════════════════════
  const dome = new Group();
  dome.name = "visualizerDome";

  const domeGeo2 = new SphereGeometry(3.5, 32, 20, 0, Math.PI * 2, 0, Math.PI / 2);
  const domeMesh2 = new Mesh(
    domeGeo2,
    mat("#1A2540", { roughness: 0.20, metalness: 0.65, transparent: true, opacity: 0.75, depthWrite: true })
  );
  domeMesh2.position.set(-10, 0.05, 8);
  domeMesh2.castShadow = true;
  dome.add(domeMesh2);

  // Pulsing LED dots on dome surface
  for (let d = 0; d < 20; d++) {
    const dAng = (d / 20) * Math.PI * 2;
    const dot = new Mesh(
      new SphereGeometry(0.08, 4, 3),
      new MeshBasicMaterial({ color: new Color(["#C43BFF", "#00D4F0", "#FF00FF"][d % 3]), depthWrite: false })
    );
    dot.position.set(-10 + Math.cos(dAng) * 3.2, 1.5 + (d % 3) * 0.8, 8 + Math.sin(dAng) * 3.2);
    dome.add(dot);
  }

  // Entrance faces Central Plaza (northeast from dome at -10,8 toward 0,-4)
  const domeEntrance = new Mesh(
    new BoxGeometry(2.5, 3.5, 0.1),
    new MeshBasicMaterial({ color: new Color("#00E5FF"), depthWrite: false, transparent: true, opacity: 0.85 })
  );
  domeEntrance.position.set(-10, 1.75, 8 - 3.35);
  domeEntrance.name = "domeEntrance";
  dome.add(domeEntrance);

  const domeFloor = new Mesh(
    new CircleGeometry(3, 32),
    new MeshBasicMaterial({ color: new Color("#1E2A4E"), depthWrite: false, transparent: true, opacity: 0.3 })
  );
  domeFloor.rotation.x = -Math.PI / 2;
  domeFloor.position.set(-10, 0.003, 8);
  dome.add(domeFloor);

  scene.add(dome);
  createNeonSign(scene, -10, 4.2, 8, "VISUALIZER  DOME", "#C43BFF");

  // ═════════════════════════════════════════════════════════════
  // 8. DAILY VIBE CHECK — Vibe Mirror reflection zone
  // ═════════════════════════════════════════════════════════════
  const vibeCheck = new Group();
  vibeCheck.name = "dailyVibeCheck";

  // Base platform — slightly larger for check-in feel
  const vcPlat = new Mesh(
    new CircleGeometry(3, 48),
    mat("#142540", { roughness: 0.30, metalness: 0.55 })
  );
  vcPlat.rotation.x = -Math.PI / 2;
  vcPlat.position.set(10, 0.003, 4);
  vcPlat.receiveShadow = true;
  vibeCheck.add(vcPlat);

  // Outer cyan ring
  const vcOuterRing = new Mesh(
    new RingGeometry(2.85, 3.0, 64),
    new MeshBasicMaterial({ color: new Color("#00E5FF"), depthWrite: false, side: THREE.DoubleSide, transparent: true, opacity: 0.5 })
  );
  vcOuterRing.rotation.x = -Math.PI / 2;
  vcOuterRing.position.set(10, 0.006, 4);
  vcOuterRing.renderOrder = 1;
  vibeCheck.add(vcOuterRing);

  // Check-in step platform (circular, raised slightly)
  const vcStep = new Mesh(
    new CircleGeometry(1.2, 32),
    mat("#1E2E3E", { roughness: 0.3, metalness: 0.6, transparent: true, opacity: 0.7, depthWrite: true })
  );
  vcStep.rotation.x = -Math.PI / 2;
  vcStep.position.set(10, 0.06, 4);
  vcStep.receiveShadow = true;
  vibeCheck.add(vcStep);

  // Step edge glow ring
  const vcStepRing = new Mesh(
    new RingGeometry(1.15, 1.25, 48),
    new MeshBasicMaterial({ color: new Color("#00E5FF"), depthWrite: false, side: THREE.DoubleSide, transparent: true, opacity: 0.7 })
  );
  vcStepRing.rotation.x = -Math.PI / 2;
  vcStepRing.position.set(10, 0.07, 4);
  vcStepRing.renderOrder = 1;
  vibeCheck.add(vcStepRing);

  // Mirror assembly sub-group — rotated to face Central Plaza + Vibe Lounge
  const mirrorGroup = new Group();
  mirrorGroup.name = "vibeMirrorGroup";
  // Rotate to face the Central Plaza (0,-4) from mirror position (10,4)
  // Direction vector: dx=-10, dz=-8, angle = atan2(-10,-8) in Three.js
  mirrorGroup.rotation.y = Math.atan2(-10, -8);

  // Vibe Mirror — tall glowing vertical panel
  const mirrorMat = mat("#0A1525", { roughness: 0.1, metalness: 0.8, transparent: true, opacity: 0.85, depthWrite: true });
  const mirror = new Mesh(new BoxGeometry(1.6, 3.5, 0.15), mirrorMat);
  mirror.position.set(0, 1.85, 0);
  mirror.castShadow = true;
  mirror.name = "vibeMirror";
  mirrorGroup.add(mirror);

  // Mirror face glow (the "screen" — cyan inner panel)
  const mirrorFace = new Mesh(
    new PlaneGeometry(1.35, 3.1),
    new MeshBasicMaterial({ color: new Color("#0A2030"), depthWrite: false, side: THREE.DoubleSide })
  );
  mirrorFace.position.set(0.08, 1.85, 0);
  mirrorFace.rotation.y = Math.PI / 2;
  mirrorFace.renderOrder = 1;
  mirrorFace.name = "vibeMirrorFace";
  mirrorGroup.add(mirrorFace);

  // Mirror frame — cyan neon border
  for (const side of [-1, 1]) {
    const frameVert = new Mesh(
      new BoxGeometry(0.04, 3.6, 0.18),
      new MeshBasicMaterial({ color: new Color("#00E5FF"), depthWrite: false, transparent: true, opacity: 0.7 })
    );
    frameVert.position.set(side * 0.82, 1.85, 0);
    mirrorGroup.add(frameVert);

    const frameHoriz = new Mesh(
      new BoxGeometry(1.68, 0.04, 0.18),
      new MeshBasicMaterial({ color: new Color("#00E5FF"), depthWrite: false, transparent: true, opacity: 0.7 })
    );
    frameHoriz.position.set(0, 1.85 + side * 1.78, 0);
    mirrorGroup.add(frameHoriz);
  }

  // Energy accent rings floating around the mirror
  for (const ry of [0.4, 2.2, 3.4]) {
    const vcRing = new Mesh(
      new RingGeometry(0.8, 0.95, 48),
      new MeshBasicMaterial({ color: new Color(ry === 2.2 ? "#00E5FF" : "#20A0CC"), depthWrite: false, side: THREE.DoubleSide, transparent: true, opacity: 0.35 })
    );
    vcRing.rotation.x = -Math.PI / 2;
    vcRing.position.set(0, ry, 0);
    vcRing.renderOrder = 1;
    mirrorGroup.add(vcRing);
  }

  // Pulse dot on top of mirror
  const mirrorDot = new Mesh(
    new SphereGeometry(0.1, 8, 6),
    new MeshBasicMaterial({ color: new Color("#00E5FF"), depthWrite: false })
  );
  mirrorDot.position.set(0, 3.7, 0);
  mirrorGroup.add(mirrorDot);

  // Place mirror group at the zone center
  mirrorGroup.position.set(10, 0, 4);
  vibeCheck.add(mirrorGroup);

  scene.add(vibeCheck);
  createNeonSign(scene, 10, 4.4, 4, "DAILY  VIBE  CHECK", "#00E5FF");

  // ═════════════════════════════════════════════════════════════
  // 8.5. UPPER VIBE ACADEMY — futuristic learning cinema, top-left
  // ═════════════════════════════════════════════════════════════
  const academy = new Group();
  academy.name = "upperVibeAcademy";

  const ACAD_X = -20, ACAD_Z = 5;

  // Base platform — wide, cinematic
  const acadPlat = new Mesh(
    new BoxGeometry(8, 0.15, 6),
    mat("#181032", { roughness: 0.30, metalness: 0.55 })
  );
  acadPlat.position.set(ACAD_X, 0.08, ACAD_Z);
  acadPlat.receiveShadow = true;
  academy.add(acadPlat);

  // Main building — wide theater-style front
  const acadBldg = new Mesh(
    new BoxGeometry(6, 3.5, 4.5),
    mat("#1A1030", { roughness: 0.3, metalness: 0.4, transparent: true, opacity: 0.88, depthWrite: true })
  );
  acadBldg.position.set(ACAD_X, 1.9, ACAD_Z);
  acadBldg.castShadow = true;
  academy.add(acadBldg);

  // Marquee top — floating roof panel
  const marquee = new Mesh(
    new BoxGeometry(6.6, 0.2, 1.2),
    new MeshBasicMaterial({ color: new Color("#7C3AED"), depthWrite: false, transparent: true, opacity: 0.7 })
  );
  marquee.position.set(ACAD_X, 3.7, ACAD_Z + 2.0);
  academy.add(marquee);

  // Marquee edge glow
  for (const sx of [-1, 1]) {
    const marqEdge = new Mesh(
      new BoxGeometry(6.6, 0.05, 0.06),
      new MeshBasicMaterial({ color: new Color("#00D4F0"), depthWrite: false, transparent: true, opacity: 0.8 })
    );
    marqEdge.position.set(ACAD_X, 3.7, ACAD_Z + 2.0 + sx * 0.58);
    academy.add(marqEdge);
  }

  // Purple/cyan ring bands around building
  for (const ry of [0.4, 2.0, 3.3]) {
    const acadRing = new Mesh(
      new BoxGeometry(6.15, 0.06, 4.65),
      new MeshBasicMaterial({
        color: new Color(ry === 2.0 ? "#00D4F0" : "#7C3AED"),
        depthWrite: false, transparent: true, opacity: 0.4,
      })
    );
    acadRing.position.set(ACAD_X, ry, ACAD_Z);
    academy.add(acadRing);
  }

  // Cinema entrance — wide doorway facing skyline edge (opposite of plaza)
  const entGeo = new BoxGeometry(3.5, 3.2, 0.12);
  const entMat = new MeshBasicMaterial({
    color: new Color("#00D4F0"),
    depthWrite: false, transparent: true, opacity: 0.6,
  });
  const entrance = new Mesh(entGeo, entMat);
  // Academy at (-20,5), face away from plaza: direction is (-20,9) → northwest toward edge
  const entAngle = Math.atan2(5 - 0, -20 - 0); // angle away from plaza toward edge
  entrance.position.set(ACAD_X + Math.sin(entAngle) * 2.9, 1.7, ACAD_Z + Math.cos(entAngle) * 2.9);
  entrance.rotation.y = entAngle;
  entrance.name = "academyEntrance";
  academy.add(entrance);

  // Door frame glow pillars
  for (const side of [-1, 1]) {
    const pillarX = ACAD_X + Math.sin(entAngle) * 2.9 + Math.cos(entAngle) * side * 1.8;
    const pillarZ = ACAD_Z + Math.cos(entAngle) * 2.9 - Math.sin(entAngle) * side * 1.8;
    const pillar = new Mesh(
      new CylinderGeometry(0.08, 0.1, 3.2, 8),
      new MeshBasicMaterial({ color: new Color("#A078FF"), depthWrite: false, transparent: true, opacity: 0.5 })
    );
    pillar.position.set(pillarX, 1.7, pillarZ);
    academy.add(pillar);
  }

  // Theater seats (glowing rows visible through entrance)
  for (let row = 0; row < 3; row++) {
    const rz = ACAD_Z - 2.2 + row * 0.6;
    for (let s = -3; s <= 3; s++) {
      const seat = new Mesh(
        new BoxGeometry(0.3, 0.12, 0.25),
        mat(row === 1 ? "#2A1A5A" : "#1E143E", { roughness: 0.3, metalness: 0.3 })
      );
      seat.position.set(ACAD_X + s * 0.55, 0.2, rz);
      seat.castShadow = true;
      academy.add(seat);

      if (row === 1 && s % 2 === 0) {
        const seatGlow = new Mesh(
          new BoxGeometry(0.28, 0.03, 0.22),
          new MeshBasicMaterial({ color: new Color(s === 0 ? "#00D4F0" : "#7C3AED"), depthWrite: false, transparent: true, opacity: 0.45 })
        );
        seatGlow.position.set(ACAD_X + s * 0.55, 0.27, rz);
        academy.add(seatGlow);
      }
    }
  }

  // Roof accent — small dome/sphere
  const roofDome = new Mesh(
    new SphereGeometry(0.5, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2),
    mat("#2A1A5A", { roughness: 0.25, metalness: 0.6, transparent: true, opacity: 0.7, depthWrite: true })
  );
  roofDome.position.set(ACAD_X, 3.85, ACAD_Z);
  roofDome.castShadow = true;
  academy.add(roofDome);

  const roofDot = new Mesh(
    new SphereGeometry(0.1, 8, 6),
    new MeshBasicMaterial({ color: new Color("#00D4F0"), depthWrite: false })
  );
  roofDot.position.set(ACAD_X, 4.3, ACAD_Z);
  academy.add(roofDot);

  scene.add(academy);
  createNeonSign(scene, ACAD_X, 5.2, ACAD_Z, "VIBE  ACADEMY", "#7C3AED");

  // Academy ambient light
  const academyLight = new PointLight();
  academyLight.color = new Color("#7C3AED");
  academyLight.intensity = 1.8; academyLight.distance = 12;
  academyLight.position.set(ACAD_X, 2.5, ACAD_Z);
  scene.add(academyLight);

  // ═════════════════════════════════════════════════════════════
  // 8.6. ZEN BEACH — meditation zone, left-side beach area
  // ═════════════════════════════════════════════════════════════
  createZenBeach(scene, PLAZA_X, PLAZA_Z);

  // ═════════════════════════════════════════════════════════════
  // 8.7. VIBE SHOP — far right, opposite Academy
  // ═════════════════════════════════════════════════════════════
  const { SHOP_X, SHOP_Z } = createVibeShop(scene);

  // ═════════════════════════════════════════════════════════════
  // 9. CITY EDGE BUILDINGS — framing the perimeter
  // ═════════════════════════════════════════════════════════════
  const edgeBuildings = new Group();
  edgeBuildings.name = "edgeBuildings";

  const bldgDefs = [];

  for (const b of bldgDefs) {
    const bldg = new Mesh(
      new BoxGeometry(b.w, b.h, b.d),
      mat(b.color, { roughness: 0.35, metalness: 0.4 })
    );
    bldg.position.set(b.x, b.h / 2, b.z);
    bldg.castShadow = true; bldg.receiveShadow = true;
    edgeBuildings.add(bldg);

    // Window glow strip on inner face (facing plaza)
    if (b.labelColor) {
      const winFace = b.x < 0 ? b.w / 2 + 0.02 : -b.w / 2 - 0.02;
      for (let wy = 0.5; wy < b.h - 0.5; wy += 1.2) {
        const win = new Mesh(
          new PlaneGeometry(b.w * 0.5, 0.6),
          new MeshBasicMaterial({ color: new Color(b.labelColor), depthWrite: false, transparent: true, opacity: 0.5 })
        );
        if (b.x < 0) {
          win.position.set(b.x + winFace, wy, b.z);
          win.rotation.y = Math.PI / 2;
        } else {
          win.position.set(b.x + winFace, wy, b.z);
          win.rotation.y = -Math.PI / 2;
        }
        edgeBuildings.add(win);
      }
    }

    // Future building marker — small "Coming Soon" glow
    if (b.future) {
      const futureGlow = new Mesh(
        new BoxGeometry(b.w - 0.6, 0.06, 0.08),
        new MeshBasicMaterial({ color: new Color("#FFE0A0"), depthWrite: false, transparent: true, opacity: 0.6 })
      );
      futureGlow.position.set(b.x, b.h + 0.3, b.z);
      edgeBuildings.add(futureGlow);
    }

    // Neon edge strips at top (only for labeled buildings)
    if (b.label) {
      for (const side of [-1, 1]) {
        const topEdge = new Mesh(
          new BoxGeometry(side > 0 ? b.w + 0.1 : 0.06, 0.06, side > 0 ? 0.06 : b.d + 0.1),
          new MeshBasicMaterial({ color: new Color("#C43BFF"), depthWrite: false, transparent: true, opacity: 0.7 })
        );
        topEdge.position.set(b.x, b.h + 0.03, b.z);
        edgeBuildings.add(topEdge);
      }
    }
  }

  scene.add(edgeBuildings);

  // 10. BEACH — single continuous sand surface
  const beachGeo = new PlaneGeometry(68, 18);
  const beach = new Mesh(beachGeo, mat("#C8A878", { roughness: 0.5 }));
  beach.rotation.x = -Math.PI / 2;
  beach.position.set(0, 0.001, 21);
  beach.receiveShadow = true;
  beach.name = "beach";
  scene.add(beach);

  // Beach lounge chairs
  const chairGroup = new Group();
  chairGroup.name = "beachChairs";
  const umbColors = ["#9B7EFF", "#00D4F0", "#C43BFF"];
  for (let u = 0; u < 6; u++) {
    const ux = -14 + u * 5.5;
    const uz = 22.5;
    const pole = new Mesh(new CylinderGeometry(0.04, 0.04, 2, 6), mat("#CCCCDD", { roughness: 0.3, metalness: 0.3 }));
    pole.position.set(ux, 1.0, uz); pole.castShadow = true;
    chairGroup.add(pole);

    const canopy = new Mesh(
      new CylinderGeometry(0.05, 0.8, 0.6, 12),
      mat(umbColors[u % 3], { roughness: 0.4, metalness: 0.1 })
    );
    canopy.position.set(ux, 2.2, uz); canopy.castShadow = true;
    chairGroup.add(canopy);

    const chair = new Mesh(new BoxGeometry(0.5, 0.08, 1.4), mat("#555566", { roughness: 0.4, metalness: 0.3 }));
    chair.position.set(ux + 0.6, 0.06, uz); chair.rotation.x = -0.2;
    chair.castShadow = true; chair.receiveShadow = true;
    chairGroup.add(chair);
  }
  scene.add(chairGroup);

  // 11. OCEAN — waves from shore
  const oceanSegments = 54;
  const oceanWidth = 68;
  const oceanGeo = new PlaneGeometry(oceanWidth, OCEAN_DEPTH, 56, oceanSegments);
  const oceanMat = new MeshBasicMaterial();
  oceanMat.color = new Color("#30B0DC");
  oceanMat.side = THREE.DoubleSide;
  const ocean = new Mesh(oceanGeo, oceanMat);
  ocean.rotation.x = -Math.PI / 2;
  ocean.position.set(0, 0, SHORELINE_Z + OCEAN_DEPTH / 2);
  ocean.renderOrder = 0;
  ocean.name = "ocean";
  scene.add(ocean);

  const origArr = new Float32Array(oceanGeo.attributes.position.array.length);
  origArr.set(oceanGeo.attributes.position.array);
  scene.userData.ocean = ocean;
  scene.userData._oceanOrig = origArr;
  scene.userData._oceanCenterZ = SHORELINE_Z + OCEAN_DEPTH / 2;

  const foamGeo = new PlaneGeometry(68, 1.5);
  const foamMeshMat = new MeshBasicMaterial();
  foamMeshMat.color = new Color("#FFFFFF");
  foamMeshMat.transparent = true;
  foamMeshMat.opacity = 0.35;
  foamMeshMat.depthWrite = false;
  const foam = new Mesh(foamGeo, foamMeshMat);
  foam.rotation.x = -Math.PI / 2;
  foam.position.set(0, 0.005, SHORELINE_Z + 0.3);
  foam.renderOrder = 2;
  foam.name = "foam";
  scene.add(foam);
  scene.userData.foam = foam;
  scene.userData._foamBaseZ = SHORELINE_Z + 0.3;
  scene.userData.shorelineZ = SHORELINE_Z;

  // ── Shoreline glow strip — pulses with music beat ──────────
  const shoreGlowGeo = new PlaneGeometry(68, 0.5);
  const shoreGlowMat = new MeshBasicMaterial();
  shoreGlowMat.color = new Color("#00D4F0");
  shoreGlowMat.transparent = true;
  shoreGlowMat.opacity = 0.12;
  shoreGlowMat.depthWrite = false;
  shoreGlowMat.side = THREE.DoubleSide;
  const shoreGlow = new Mesh(shoreGlowGeo, shoreGlowMat);
  shoreGlow.rotation.x = -Math.PI / 2;
  shoreGlow.position.set(0, 0.01, SHORELINE_Z);
  shoreGlow.renderOrder = 1;
  shoreGlow.name = "shoreGlow";
  scene.add(shoreGlow);
  scene.userData.shoreGlow = shoreGlow;

  // ═════════════════════════════════════════════════════════════
  // 12. LIGHTING — night ambiance
  // ═════════════════════════════════════════════════════════════
  // Soft moonlight — keeps night vibe visible
  const moon = new DirectionalLight();
  moon.color = new Color("#8899CC");
  moon.intensity = 0.6;
  moon.position.set(15, 22, SHORELINE_Z + 10);
  moon.castShadow = true;
  moon.shadow.mapSize.width = 2048;
  moon.shadow.mapSize.height = 2048;
  moon.shadow.camera.near = 0.5;
  moon.shadow.camera.far = 80;
  moon.shadow.camera.left = -36;
  moon.shadow.camera.right = 36;
  moon.shadow.camera.top = 30;
  moon.shadow.camera.bottom = -30;
  moon.shadow.bias = -0.0006;
  scene.add(moon);

  // Soft blue ambient — bright neon city night
  const ambLight = new AmbientLight();
  ambLight.color = new Color("#4850A0");
  ambLight.intensity = 0.9;
  scene.add(ambLight);

  // Purple-blue hemisphere fill
  const hemiLight = new HemisphereLight();
  hemiLight.color = new Color("#6B5CAA");
  hemiLight.groundColor = new Color("#1A2040");
  hemiLight.intensity = 0.7;
  scene.add(hemiLight);

  const beachLight = new PointLight();
  beachLight.color = new Color("#55AADD");
  beachLight.intensity = 3.5;
  beachLight.distance = 24;
  beachLight.position.set(0, 3, SHORELINE_Z + 6);
  scene.add(beachLight);

  // Zone point lights — bright neon glow per zone
  const loungeLight = new PointLight();
  loungeLight.color = new Color("#E040FB");
  loungeLight.intensity = 3.5; loungeLight.distance = 14;
  loungeLight.position.set(-16, 2.5, -10);
  scene.add(loungeLight);
  scene.userData.loungeLight = loungeLight;

  const libraryLight = new PointLight();
  libraryLight.color = new Color("#00E5FF");
  libraryLight.intensity = 3.5; libraryLight.distance = 14;
  libraryLight.position.set(16, 2.5, -10);
  scene.add(libraryLight);

  const domeLight = new PointLight();
  domeLight.color = new Color("#FF00FF");
  domeLight.intensity = 3.5; domeLight.distance = 14;
  domeLight.position.set(-10, 2.5, 8);
  scene.add(domeLight);

  const vibeCheckLight = new PointLight();
  vibeCheckLight.color = new Color("#00E5FF");
  vibeCheckLight.intensity = 3.5; vibeCheckLight.distance = 12;
  vibeCheckLight.position.set(10, 2.5, 4);
  scene.add(vibeCheckLight);

  // ── Plaza fill light — soft central glow ──────────────────
  const plazaFill = new PointLight();
  plazaFill.color = new Color("#8888DD");
  plazaFill.intensity = 2.0;
  plazaFill.distance = 16;
  plazaFill.position.set(0, 1.5, -4);
  scene.add(plazaFill);
  scene.userData.plazaFill = plazaFill;

  // ── Shifting neon ambient lights — 4 roving fill lights ──────
  // These drift slowly around the city, shifting between electric blue
  // and deep purple to create the "neon night" atmosphere without
  // adding any new geometry. Performance-friendly: intensity kept low.
  const neonAmbients = [
    // [x, y, z, color, distance, phaseOffset]
    { pos: [8,  3.5,  -6], color: new Color("#0088FF"), distance: 18, phase: 0.0,    baseI: 1.2 }, // electric blue — stage-right
    { pos: [-8, 3.5,  -6], color: new Color("#7C3AED"), distance: 18, phase: 1.6,    baseI: 1.2 }, // deep purple — stage-left
    { pos: [0,  4.0,   8], color: new Color("#00C8E8"), distance: 16, phase: 3.1,    baseI: 1.0 }, // cyan — beach entrance
    { pos: [0,  3.5, -14], color: new Color("#9B4FFF"), distance: 14, phase: 4.7,    baseI: 0.9 }, // violet — behind stage
  ].map(({ pos, color, distance, phase, baseI }) => {
    const light = new PointLight();
    light.color.copy(color);
    light.intensity = baseI;
    light.distance = distance;
    light.position.set(...pos);
    scene.add(light);
    return { light, phase, baseI, color1: color.clone(), color2: new Color(phase < 2 ? "#A040FF" : "#00B8D4") };
  });
  scene.userData.neonAmbients = neonAmbients;

  // ═════════════════════════════════════════════════════════════
  // 13. TWINKLING STARS + PALM TREES
  // ═════════════════════════════════════════════════════════════
  createStarField(scene);

  // Trees removed — layout cleanup, decoration will be added later
  // Beach palm row — spaced like umbrellas, lining the back of the beach
  // Beach palm row — spaced like umbrellas, lining the back of the beach
  // Removed tree at x=0 that was blocking the central beach pathway
  const palmPositions = [
    [-24, 19], [-18, 19], [-12, 19], [-6, 19],
    [6, 19], [12, 19], [18, 19], [24, 19],
  ];
  palmPositions.forEach(([px, pz]) => {
    const palm = new Group();
    const trunkGeo = new CylinderGeometry(0.06, 0.1, 3, 8);
    const trunk = new Mesh(trunkGeo, mat("#6D4C41", { roughness: 0.6 }));
    trunk.position.y = 1.5;
    trunk.castShadow = true;
    palm.add(trunk);

    // DoubleSide fronds — four planes per position for omni-directional visibility
    const frondGeoGreen = new PlaneGeometry(0.2, 0.7);
    const frondMatGreen = new MeshStandardMaterial({
      color: new Color("#2E7D32"),
      roughness: 0.5,
      side: THREE.DoubleSide,
    });
    const frondMatLighter = new MeshStandardMaterial({
      color: new Color("#3A8F3E"),
      roughness: 0.5,
      side: THREE.DoubleSide,
    });

    for (let f = 0; f < 6; f++) {
      const angle = (f / 6) * Math.PI * 2;
      const fx = Math.cos(angle) * 0.3;
      const fz = Math.sin(angle) * 0.3;

      // Four crossing fronds at each position — visible from every angle
      for (let cr = 0; cr < 4; cr++) {
        const frond = new Mesh(
          frondGeoGreen,
          cr % 2 === 0 ? frondMatGreen : frondMatLighter,
        );
        frond.position.set(fx, 2.7, fz);
        frond.rotation.x = Math.cos(angle) * 0.5;
        frond.rotation.z = Math.sin(angle) * 0.5;
        frond.rotation.y = (cr / 4) * Math.PI;
        frond.castShadow = true;
        palm.add(frond);
      }
    }

    palm.position.set(px, 0, pz);
    scene.add(palm);
  });
}

// ═══════════════════════════════════════════════════════════════
// TWINKLING STAR FIELD — small lights over the sky
// ═══════════════════════════════════════════════════════════════
function createStarField(scene) {
  const starCanvas = document.createElement("canvas");
  starCanvas.width = 32;
  starCanvas.height = 32;
  const ctx = starCanvas.getContext("2d");
  const gradient = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
  gradient.addColorStop(0, "rgba(255,255,255,1)");
  gradient.addColorStop(0.08, "rgba(255,255,255,0.85)");
  gradient.addColorStop(0.3, "rgba(200,215,255,0.35)");
  gradient.addColorStop(0.6, "rgba(140,160,255,0.06)");
  gradient.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 32, 32);
  const starTex = new THREE.CanvasTexture(starCanvas);

  const starCount = 180;
  const starGeo = new BufferGeometry();
  const positions = new Float32Array(starCount * 3);
  const phases = new Float32Array(starCount); // per-star twinkle phase
  for (let i = 0; i < starCount; i++) {
    const angle = Math.random() * Math.PI * 2;
    const radius = 14 + Math.random() * 24;
    positions[i * 3] = Math.cos(angle) * radius;
    positions[i * 3 + 1] = 7 + Math.random() * 18;
    positions[i * 3 + 2] = Math.sin(angle) * radius;
    phases[i] = Math.random() * Math.PI * 2;
  }
  starGeo.setAttribute("position", new BufferAttribute(positions, 3));
  starGeo.userData = { phases };

  const starMat = new PointsMaterial();
  starMat.map = starTex;
  starMat.color = new Color("#DDE4FF");
  starMat.size = 0.35;
  starMat.transparent = true;
  starMat.opacity = 0.55;
  starMat.depthWrite = false;
  starMat.blending = THREE.AdditiveBlending;

  const stars = new Points(starGeo, starMat);
  stars.name = "stars";
  stars.renderOrder = 0;
  scene.add(stars);
  scene.userData.stars = stars;
}

// ═══════════════════════════════════════════════════════════════
// DIRECTIONAL SKY IMAGES — four unique deep-space cosmic views
// ═══════════════════════════════════════════════════════════════
const BASE = "https://media.base44.com/images/public/69cd68afb7fe90ae92757154";
const SKY_FORWARD = `${BASE}/12edd43a9_ChatGPTImageJun19202611_55_16AM.png`;   // No planet — North/Forward
const SKY_RIGHT   = `${BASE}/df9a0847f_ChatGPTImageJun19202612_41_21PM.png`;   // Full planet (centered) — East/Right
const SKY_BACK    = `${BASE}/5b01fc961_ChatGPTImageJun19202611_55_39AM.png`;   // No planet — South/Back
const SKY_LEFT    = `${BASE}/e7caceb54_ChatGPTImageJun19202612_41_07PM.png`;   // Ringed planet + moon — West/Left

// ═══════════════════════════════════════════════════════════════
// COSMIC SKYBOX — camera-centered cube, BackSide textures
// BoxGeometry face order: +X, -X, +Y, -Y, +Z, -Z
//
// Direction order (planets separated by non-planet views):
//   Forward (+Z) = no planet  →  Right (+X) = planet
//   Back    (-Z) = no planet  →  Left  (-X) = planet
// ═══════════════════════════════════════════════════════════════
function createCosmicSky(scene) {
  const loader = new THREE.TextureLoader();
  const SKYBOX_SIZE = 55;

  const loadTex = (url) => {
    const tex = loader.load(url);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.wrapS = THREE.ClampToEdgeWrapping;
    tex.wrapT = THREE.ClampToEdgeWrapping;
    return tex;
  };

  // Four directional textures — planets only on East (+X) and West (-X)
  const texForward = loadTex(SKY_FORWARD);  // +Z = North / Forward — no planet
  const texRight   = loadTex(SKY_RIGHT);    // +X = East  / Right   — planet
  const texBack    = loadTex(SKY_BACK);     // -Z = South / Back    — no planet
  const texLeft    = loadTex(SKY_LEFT);     // -X = West  / Left    — planet

  // Bottom face: deep void (underground, rarely visible)
  const bottomMat = new MeshBasicMaterial();
  bottomMat.color = new Color("#050510");
  bottomMat.side = THREE.BackSide;
  bottomMat.depthWrite = false;

  // Materials array in BoxGeometry face order: +X, -X, +Y, -Y, +Z, -Z
  // All sides use cosmic textures — top reuses texForward for a seamless overhead sky
  const materials = [
    new MeshBasicMaterial({ map: texRight,   side: THREE.BackSide, depthWrite: false }), // +X = Right/East  (planet)
    new MeshBasicMaterial({ map: texLeft,    side: THREE.BackSide, depthWrite: false }), // -X = Left/West   (planet)
    new MeshBasicMaterial({ map: texForward, side: THREE.BackSide, depthWrite: false }), // +Y = Top (cosmic, no planet)
    bottomMat,                                                                           // -Y = Bottom
    new MeshBasicMaterial({ map: texRight,   side: THREE.BackSide, depthWrite: false }), // +Z = North (galaxy)
    new MeshBasicMaterial({ map: texLeft,    side: THREE.BackSide, depthWrite: false }), // -Z = South (galaxy)
  ];

  const skybox = new Mesh(new BoxGeometry(SKYBOX_SIZE, SKYBOX_SIZE, SKYBOX_SIZE), materials);
  skybox.name = "skybox";
  skybox.renderOrder = -1; // Always render behind everything
  scene.add(skybox);

  scene.fog = new Fog("#101835", 52, 62);
}

// createCitySkyline lives in ./CitySkyline.jsx, avatars in ./AvatarModel.jsx
import { createAvatar, createRemoteAvatar, updateAvatarAnimation, retintAvatar } from "./AvatarModel.jsx";

// ═══════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════
export default function CityCanvas({ onLoaded, onPositionChange, onRemoteAvatarClick, stageCanvas, audioIntensityRef, audioBassRef, audioBeatRef, locked, stageScreenPosRef, remoteUsers, isDancing = false, activeEmote = null, avatarConfig, onJukeboxProximity, retintRef, launchRef, onNearPad, djTrack, ...props }) {
  const canvasRef = useRef(null);
  const [error, setError] = useState(null);
  const [isMobile, setIsMobile] = useState(false);
  const [mobileResetKey, setMobileResetKey] = useState(0);
  const onLoadedRef = useRef(onLoaded);
  onLoadedRef.current = onLoaded;
  const onPosCbRef = useRef(onPositionChange);
  onPosCbRef.current = onPositionChange;
  const onJukeboxProxRef = useRef(onJukeboxProximity);
  onJukeboxProxRef.current = onJukeboxProximity;
  const djTrackRef = useRef(djTrack);
  djTrackRef.current = djTrack;

  useEffect(() => {
    const mobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    setIsMobile(mobile);
    isMobileRef.current = mobile;
    if (mobile) {
      const prevBodyOverflow = document.body.style.overflow;
      const prevBodyOverscroll = document.body.style.overscrollBehavior;
      document.body.style.overflow = "hidden";
      document.body.style.overscrollBehavior = "none";
      return () => {
        document.body.style.overflow = prevBodyOverflow;
        document.body.style.overscrollBehavior = prevBodyOverscroll;
      };
    }
  }, []);

  const sceneRef = useRef(null);
  const avatarRef = useRef(null);
  const avatarEntryRef = useRef(null); // { root, mixer, clips } from GLB load
  const avatarPosRef = useRef([...SPAWN, 0]); // [x, y, z, rotY]
  const stageCanvasRef = useRef(null);
  stageCanvasRef.current = stageCanvas;
  const velocityRef = useRef({ x: 0, z: 0 });
  const avatarRotRef = useRef(0);    // avatar body Y rotation (world space)
  const keysRef = useRef({});
  const mouseRef = useRef({ down: false, dx: 0, dy: 0, button: 0 });
  // Camera: yaw = angle of camera around avatar (0 = directly behind)
  // camYaw is independent of avatar rotation; avatar rotation is avatarRotRef
  const camYawRef = useRef(0);          // camera yaw offset (right-click drag)
  const camYawSmoothRef = useRef(0);    // smoothed camera yaw
  const idleTimerRef = useRef(0);       // seconds since last movement input
  const isOrbitingRef = useRef(false);  // true during idle orbit
  const userTouchingCamRef = useRef(false); // right-click or cam drag active
  const remoteAvatarsRef = useRef({}); // userId → { group, prevPos }
  const remoteUsersRef = useRef([]);
  remoteUsersRef.current = remoteUsers || [];
  const onRemoteClickRef = useRef(onRemoteAvatarClick);
  onRemoteClickRef.current = onRemoteAvatarClick;
  const cameraRef = useRef(null);
  const isMobileRef = useRef(false);
  const _mobileRef = useRef({ x: 0, y: 0, camDx: 0 });
  const mobileInputRef = props.mobileInputRef || _mobileRef;
  const lockedRef = useRef(false);
  const prevLockedRef = useRef(false);
  lockedRef.current = locked;
  const isDancingRef = useRef(false);
  isDancingRef.current = isDancing;
  const activeEmoteRef = useRef(null);
  activeEmoteRef.current = activeEmote;
  const lastTimeRef = useRef(0);
  const frameRef = useRef(0);
  const initializedRef = useRef(false);
  // Launch zone state
  const launchStateRef = useRef({ active: false, phase: "idle", timer: 0, startY: 0 });
  const orbCountRef = useRef(0);
  const nearPadRef = useRef(-1);

  // Init scene — runs once only
  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    const canvas = canvasRef.current;
    if (!canvas) return;

    try {
      // Sanity-check that THREE loaded properly
      if (typeof MeshStandardMaterial !== "function") {
        throw new Error("Three.js MeshStandardMaterial unavailable — check your bundle");
      }

      const renderer = new WebGLRenderer({
        canvas,
        antialias: true,
      });
      renderer.setClearColor(0x0A1020); // Deep navy void — bright neon night
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      // Use window dimensions on mobile for reliable viewport sizing
      const rw = isMobileRef.current ? window.innerWidth : canvas.clientWidth;
      const rh = isMobileRef.current ? window.innerHeight : canvas.clientHeight;
      renderer.setSize(rw, Math.max(rh, 1));
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = PCFSoftShadowMap;

      const scene = new Scene();
      sceneRef.current = scene;

      const asp = rw / Math.max(rh, 1);
      const camera = new PerspectiveCamera(52, asp, 0.1, 80);
      cameraRef.current = camera;
      // Start directly BEHIND avatar (avatar faces -Z toward stage at spawn)
      // camYaw=0 → camera behind → at +Z from avatar (opposite of facing direction)
      camera.position.set(SPAWN[0], SPAWN[1] + CAM_HEIGHT, SPAWN[2] + CAM_DIST);
      camera.lookAt(SPAWN[0], SPAWN[1] + CAM_LOOK_Y, SPAWN[2]);

      buildPark(scene);

      // ── Expose launch trigger ref once (not in animation loop) ──
      if (launchRef) {
        launchRef.current = () => {
          const ls = launchStateRef.current;
          if (!ls.active) {
            ls.active = true;
            ls.phase = "rise";
            ls.timer = 0;
            ls.startY = SPAWN[1];
          }
        };
      }

      // Avatar rim light
      const avatarRimLight = new PointLight();
      avatarRimLight.color = new Color("#8899DD");
      avatarRimLight.intensity = 0.8;
      avatarRimLight.distance = 8;
      avatarRimLight.position.set(SPAWN[0], SPAWN[1] + 1.2, SPAWN[2]);
      scene.add(avatarRimLight);
      scene.userData.avatarRimLight = avatarRimLight;

      // createAvatar returns an entry immediately. entry.root is the controller Group
      // already in the scene. CityCanvas stores entry.root in avatarRef and moves it
      // every frame. When GLB loads, the model is parented INTO entry.root — it inherits
      // all movement automatically. The same entry object is mutated in-place.
      const entry = createAvatar(scene, avatarConfig || {}, (_entry) => {
        // GLB done loading — apply saved outfit color immediately
        const savedColor = avatarConfig?.outfitColorKey;
        if (savedColor) {
          // Map outfitColorKey to hex — matches OUTFIT_COLORS in AvatarSetup
          const COLOR_MAP = {
            "cosmic-blue":    "#00AADD",
            "neon-purple":    "#7B2FFF",
            "shadow-black":   "#080A0F",
            "rose-glow":      "#CC2288",
            "gold-aura":      "#CC9900",
            // legacy keys
            "electric-blue":  "#00AADD",
            "cosmic-black":   "#080A0F",
            "white-silver":   "#C8D4E0",
            "pink-rose":      "#CC2288",
            "gold-yellow":    "#CC9900",
          };
          const hex = COLOR_MAP[savedColor];
          if (hex) retintAvatar(_entry, hex);
        }
      });
      avatarEntryRef.current = entry;
      avatarRef.current = entry.root; // this is what gets moved every frame

      // Expose retint function so UpperVibeCity can update the in-world avatar color after save
      if (retintRef) {
        retintRef.current = (hexColor) => {
          retintAvatar(avatarEntryRef.current, hexColor);
        };
      }

      // Skybox — must follow camera so sky always feels infinitely far away
      const skybox = scene.getObjectByName("skybox");

      let animId;
      const animate = () => {
        animId = requestAnimationFrame(animate);

        // Real delta time
        const now = performance.now() * 0.001;
        if (lastTimeRef.current === 0) lastTimeRef.current = now;
        let dt = now - lastTimeRef.current;
        lastTimeRef.current = now;
        if (dt > 0.1) dt = 0.1; // Clamp large gaps
        if (dt <= 0) dt = 0.016;

        const t = now;
        const keys = keysRef.current;
        const mouse = mouseRef.current;
        let [px, py, pz] = avatarPosRef.current;
        let rot = avatarRotRef.current;
        const vel = velocityRef.current;

        // ─── RIGHT-CLICK / CAM DRAG ──────────────────────────
        if (mouse.down && mouse.button === 2 && !lockedRef.current) {
          camYawRef.current -= mouse.dx * 0.006;
          userTouchingCamRef.current = true;
          idleTimerRef.current = 0;
          isOrbitingRef.current = false;
        } else if (!mouse.down) {
          userTouchingCamRef.current = false;
        }
        mouse.dx = 0;
        mouse.dy = 0;

        // ─── INPUT (skipped when locked) ────────────────────
        // avatarFwd = direction the avatar currently faces
        // W/S move forward/backward in avatar-facing direction
        // A/D rotate the avatar left/right (and camera follows)
        let inputFwd = 0; // +1 = forward, -1 = backward
        let turnInput = 0; // +1 = turn left, -1 = turn right
        let hasAnyInput = false;

        if (lockedRef.current) {
          vel.x = 0;
          vel.z = 0;
        } else if (isMobileRef.current) {
          if (prevLockedRef.current) {
            mobileInputRef.current = { x: 0, y: 0, camDx: 0 };
          }
          const joy = mobileInputRef.current;
          // joy.y: positive = joystick pushed up = move forward (cy - clientY, so up = +)
          // joy.x: positive = joystick pushed right = turn right
          if (Math.abs(joy.y) > 0.08) { inputFwd = joy.y; hasAnyInput = true; }
          if (Math.abs(joy.x) > 0.08) { turnInput = -joy.x; hasAnyInput = true; }
          // Camera drag from right side of screen
          if (Math.abs(joy.camDx) > 0.0005) {
            camYawRef.current -= joy.camDx;
            userTouchingCamRef.current = true;
            idleTimerRef.current = 0;
            isOrbitingRef.current = false;
            joy.camDx *= 0.85;
          } else if (mobileInputRef.current._camActive) {
            // Finger still on cam zone — pause orbit even if no movement
            userTouchingCamRef.current = true;
            idleTimerRef.current = 0;
            isOrbitingRef.current = false;
          }
        } else {
          if (keys.w || keys.arrowup)    { inputFwd =  1; hasAnyInput = true; }
          if (keys.s || keys.arrowdown)  { inputFwd = -1; hasAnyInput = true; }
          if (keys.a || keys.arrowleft)  { turnInput =  1; hasAnyInput = true; }
          if (keys.d || keys.arrowright) { turnInput = -1; hasAnyInput = true; }
        }

        const isMoving = Math.abs(inputFwd) > 0.08 || Math.abs(turnInput) > 0.08;
        if (Math.abs(turnInput) > 0.08 && Math.abs(inputFwd) < 0.08) hasAnyInput = true; // A/D alone also counts

        // ─── AVATAR TURNING (A/D) ────────────────────────────
        if (Math.abs(turnInput) > 0.01) {
          rot += turnInput * TURN_SPEED * dt;
        }

        // ─── FORWARD/BACKWARD + STRAFE MOVEMENT ──────────────
        // Avatar forward is +Z when rot=0: sin(rot) = right, cos(rot) = forward
        // A/D also contribute lateral movement (strafe) at reduced speed
        const strafeInput = -turnInput * 0.6; // A=left strafe, D=right strafe
        const moveX = Math.sin(rot) * inputFwd + Math.cos(rot) * strafeInput;
        const moveZ = Math.cos(rot) * inputFwd - Math.sin(rot) * strafeInput;

        if (isMoving) {
          const targetSpeed = (Math.abs(inputFwd) > 0.08 || Math.abs(strafeInput) > 0.04) ? MOVE_SPEED : 0;
          vel.x += (moveX * targetSpeed - vel.x) * Math.min(1, ACCELERATION * dt);
          vel.z += (moveZ * targetSpeed - vel.z) * Math.min(1, ACCELERATION * dt);
        } else {
          vel.x += (0 - vel.x) * Math.min(1, DECELERATION * dt);
          vel.z += (0 - vel.z) * Math.min(1, DECELERATION * dt);
        }

        // Apply velocity
        const speed = Math.sqrt(vel.x * vel.x + vel.z * vel.z);
        px += vel.x * dt;
        pz += vel.z * dt;

        // Collisions
        [px, pz] = resolveCollisions(px, pz, 0.3, COLLISION_BOXES);

        // ── Launch zone physics ──────────────────────────────
        const ls = launchStateRef.current;
        if (ls.active) {
          ls.timer += dt;
          if (ls.phase === "rise") {
            const progress = Math.min(ls.timer / LAUNCH_DURATION, 1);
            const eased = 1 - (1 - progress) * (1 - progress); // ease-out
            py = ls.startY + LAUNCH_HEIGHT * eased;
            if (progress >= 1) { ls.phase = "fall"; ls.timer = 0; }
          } else if (ls.phase === "fall") {
            const progress = Math.min(ls.timer / GLIDE_DURATION, 1);
            const eased = progress * progress; // ease-in
            py = ls.startY + LAUNCH_HEIGHT * (1 - eased);
            if (progress >= 1) {
              py = ls.startY;
              ls.active = false;
              ls.phase = "idle";
              // Landing pulse ring at current position
              if (sceneRef.current) triggerLandingPulse(sceneRef.current, px, pz);
            }
          }
          // Collect orbs every frame during ALL airborne phases using real py height
          if (sceneRef.current) {
            const c = collectNearbyOrbs(sceneRef.current, px, py, pz);
            if (c.length) orbCountRef.current += c.length;
          }
          vel.x *= 0.88; vel.z *= 0.88; // dampen horizontal during flight
        } else {
          py = SPAWN[1];
          // Check pad proximity (every 6 frames for responsiveness)
          if (frameRef.current % 6 === 0 && sceneRef.current) {
            nearPadRef.current = getNearLaunchPad(px, pz);
          }
        }

        avatarRotRef.current = rot;
        avatarPosRef.current = [px, py, pz, rot];
        const avatar = avatarRef.current;
        if (avatar) { avatar.position.set(px, py, pz); avatar.rotation.y = rot; }

        // Rim light follows avatar
        const rimLight = scene.userData.avatarRimLight;
        if (rimLight) rimLight.position.set(px, py + 1.0, pz);

        // Notify parent of position (throttled — every 10 frames)
        if (onPosCbRef.current && frameRef.current % 10 === 0) {
          try { onPosCbRef.current(px, pz, rot); } catch {}
        }

        // ── Notify parent of near-pad state ──
        if (onNearPad && frameRef.current % 10 === 0) {
          try { onNearPad(nearPadRef.current, launchStateRef.current.active, orbCountRef.current); } catch {}
        }

        // ── Jukebox proximity ──
        if (onJukeboxProxRef.current && frameRef.current % 6 === 0) {
          const jdx = px - JUKEBOX_POS.x;
          const jdz = pz - JUKEBOX_POS.z;
          const jDist = Math.sqrt(jdx * jdx + jdz * jdz);
          const nearJukebox = jDist < JUKEBOX_INTERACT_RADIUS;
          const ddx = px;
          const ddz = pz - (-4);
          const dFloorDist = Math.sqrt(ddx * ddx + ddz * ddz);
          const proximityVol = Math.max(0.1, Math.min(1.0, 1.0 - (dFloorDist - 2) / (DANCE_FLOOR_RADIUS - 2)));
          try { onJukeboxProxRef.current(nearJukebox, proximityVol); } catch {}
        }

        // ─── IDLE ORBIT + CAMERA ─────────────────────────────
        // Track idle time
        if (hasAnyInput || speed > 0.05) {
          idleTimerRef.current = 0;
          if (isOrbitingRef.current) {
            // Just started moving after orbit — smoothly reset camYaw to 0
            isOrbitingRef.current = false;
            // camYaw will lerp back to 0 below when moving
          }
        } else if (!userTouchingCamRef.current && !lockedRef.current && !isDancingRef.current) {
          idleTimerRef.current += dt;
        }

        // When moving, pull camYaw back toward 0 (behind avatar) smoothly
        if (speed > 0.05 && !userTouchingCamRef.current) {
          camYawRef.current += (0 - camYawRef.current) * Math.min(1, CAM_FOLLOW_SPEED * dt * 0.5);
        }

        // Start idle orbit
        if (!isOrbitingRef.current && idleTimerRef.current >= IDLE_ORBIT_DELAY && !userTouchingCamRef.current && !lockedRef.current) {
          isOrbitingRef.current = true;
        }

        // Idle orbit: advance camYaw
        if (isOrbitingRef.current) {
          camYawRef.current += IDLE_ORBIT_SPEED * dt;
        }

        // Smooth camera yaw
        let yawDiff = camYawRef.current - camYawSmoothRef.current;
        while (yawDiff > Math.PI) yawDiff -= Math.PI * 2;
        while (yawDiff < -Math.PI) yawDiff += Math.PI * 2;
        camYawSmoothRef.current += yawDiff * Math.min(1, dt * (isOrbitingRef.current ? 2.0 : 8.0));

        // Final camera angle: avatar facing + camYaw offset
        // Camera sits BEHIND avatar: avatar faces +Z when rot=0, camera is at +Z offset
        const finalCamAngle = rot + camYawSmoothRef.current;

        // Stage watching mode
        const STAGE_LOOK_AT = new Vector3(0, 2.2, -16.4);
        const STAGE_CAM_POS = new Vector3(0, 3.5, -6);

        if (lockedRef.current) {
          camera.position.lerp(STAGE_CAM_POS, Math.min(1, 3.0 * dt));
          camera.lookAt(STAGE_LOOK_AT);
        } else {
          // True behind-avatar third-person camera:
          // Avatar forward = +Z when rot=0. "Behind" = camera offset in -Z direction.
          // finalCamAngle=0 → camera at (px, py+height, pz-dist) = behind avatar facing +Z ✓
          // camYaw rotates this offset around the avatar (right-click/drag)
          camera.position.set(
            px - Math.sin(finalCamAngle) * CAM_DIST,
            py + CAM_HEIGHT,
            pz - Math.cos(finalCamAngle) * CAM_DIST,
          );
          // Look at avatar chest height
          camera.lookAt(px, py + CAM_LOOK_Y, pz);
        }

        // ─── GLB AVATAR ANIMATION ────────────────────────────
        // avatarEntryRef.current is the same object returned by createAvatar.
        // Its mixer/clips get populated in-place when GLB loads — no reassignment needed.
        const avatarEntry = avatarEntryRef.current;
        if (avatarEntry) updateAvatarAnimation(avatarEntry, speed, isDancingRef.current, dt);

        // ── Audio intensity (used by stage screen, ocean, foam, glow) ──
        const audioBeat = audioIntensityRef?.current ?? 0;

        // Stage screen — visualizer canvas
        const stageCanvasVal = stageCanvasRef.current;
        const stageScreen = scene.userData.stageScreen;
        if (stageCanvasVal) {
          if (stageScreen && !scene.userData._stageCanvasApplied) {
            const tex = new THREE.CanvasTexture(stageCanvasVal);
            tex.colorSpace = THREE.SRGBColorSpace;
            tex.minFilter = THREE.LinearFilter;
            tex.magFilter = THREE.LinearFilter;
            stageScreen.material = new MeshBasicMaterial({ map: tex, depthWrite: true });
            scene.userData._stageCanvasApplied = true;
            scene.userData._stageTex = tex;
            scene.userData._lastStageTexTime = 0;
          }
          // Throttle texture upload to ~15fps to prevent GPU flicker
          const stageTex = scene.userData._stageTex;
          if (stageTex) {
            const stageTexNow = performance.now();
            const STAGE_TEX_INTERVAL = 1000 / 15;
            if (!scene.userData._lastStageTexTime || stageTexNow - scene.userData._lastStageTexTime >= STAGE_TEX_INTERVAL) {
              stageTex.needsUpdate = true;
              scene.userData._lastStageTexTime = stageTexNow;
            }
          }
        } else if (stageScreen && scene.userData._stageCanvasApplied) {
          // No canvas — hide the stage screen (prevents duplicate cover art behind embed)
          stageScreen.material = new MeshBasicMaterial({ color: new Color("#0a0a1e"), depthWrite: true, transparent: true, opacity: 0.15 });
          scene.userData._stageCanvasApplied = false;
          scene.userData._stageTex = null;
        }

        // ─── OCEAN WAVES — rolling from deep water toward shore ──

        const oceanMesh = scene.userData.ocean;
        const origArr = scene.userData._oceanOrig;
        const oceanCenterZ = scene.userData._oceanCenterZ || 47;
        const SLZ = scene.userData.shorelineZ || 20;

        // Audio data (with fallback to 0 when not playing)
        const bassEnergy = audioBassRef?.current ?? 0;
        const beatPulse = audioBeatRef?.current ?? 0;

        // Wave cycle: music-reactive tempo — faster with more energy
        const waveSpeed = 1.8 + bassEnergy * 4.5 + beatPulse * 2.0;
        const waveT = t * waveSpeed;

        if (oceanMesh && origArr) {
          const pos = oceanMesh.geometry.attributes.position;
          const arr = pos.array;

          for (let i = 0; i < arr.length; i += 3) {
            const worldZ = oceanCenterZ + origArr[i + 2];
            const distFromShore = worldZ - SLZ;

            if (distFromShore < 0) continue;

            // Phase: deeper water leads, shore water lags → waves travel toward shore
            const phase = distFromShore * 0.3 - waveT * 2.2;
            const wave = Math.sin(phase) * 0.5 + 0.5;

            // Height: waves get taller as they approach shore
            const buildFactor = 1 - Math.max(0, 1 - distFromShore / 20);
            // Bass drives wave height, beat adds punch
            const heightBoost = 1 + bassEnergy * 1.4 + beatPulse * 0.6;
            const height = wave * buildFactor * 0.18 * heightBoost;

            // Forward surge: water pushes toward shore during wave crest
            const surge = wave * buildFactor * 0.12 * heightBoost;

            arr[i] = origArr[i];
            arr[i + 1] = origArr[i + 1] + height;
            arr[i + 2] = origArr[i + 2] + surge;
          }
          pos.needsUpdate = true;
        }

        // ─── FOAM STRIP — pulses with tide + music ───────────────────
        const foamMesh = scene.userData.foam;
        if (foamMesh && foamMesh.material) {
          const tide = Math.sin(t * 0.55) * 0.5 + 0.5;
          const foamBoost = 1 + bassEnergy * 1.2 + beatPulse * 0.8;
          foamMesh.material.opacity = (0.18 + tide * 0.55) * foamBoost;
          foamMesh.position.z = scene.userData._foamBaseZ + tide * 0.7;
        }

        // ─── SHORELINE GLOW — pulses with beat ──────────────────
        const shoreGlow = scene.userData.shoreGlow;
        if (shoreGlow?.material) {
          const glowOpacity = 0.08 + bassEnergy * 0.25 + beatPulse * 0.35;
          shoreGlow.material.opacity = glowOpacity;
          // Shift color between cyan and purple based on energy
          const cyan = new Color("#00D4F0");
          const purple = new Color("#A078FF");
          shoreGlow.material.color.copy(cyan).lerp(purple, Math.min(1, bassEnergy * 1.5));
        }

        // ─── STAGE SCREEN GLOW — pulse screen frame with music ──────
        const screenGlowMesh = scene.getObjectByName("stageScreenGlow");
        if (screenGlowMesh?.material) {
          screenGlowMesh.material.opacity = 0.45 + audioBeat * 0.7 + (audioIntensityRef?.current || 0) * 0.3;
        }

        // ─── VIBE LOUNGE NEON AMBIENT — stronger pulse with music ──
        const loungeNeonMats = scene.userData.loungeNeonMats;
        if (loungeNeonMats) {
          const loungeWave = Math.sin(t * 2.5) * 0.15;
          for (const mat of loungeNeonMats) {
            if (mat?.opacity !== undefined) {
              mat.opacity = Math.min(0.9, 0.4 + audioBeat * 0.6 + loungeWave);
            }
          }
          const ll = scene.userData.loungeLight;
          if (ll && ll.intensity !== undefined) {
            ll.intensity = 1.5 + audioBeat * 1.2;
          }
        }

        // ─── NEON SKYLINE PULSE + COLOR SHIFT — buildings breathe ──
        const neonMats = scene.userData.neonMats;
        if (neonMats) {
          const pulse = 0.6 + audioBeat * 0.5 + Math.sin(t * 1.7) * 0.1 + Math.sin(t * 0.6) * 0.08;
          const colorShift = Math.sin(t * 0.4) * 0.5 + 0.5; // slow 0..1 wave
          for (let i = 0; i < neonMats.length; i++) {
            const mat = neonMats[i];
            if (mat?.opacity !== undefined) {
              mat.opacity = pulse;
            }
            // Subtle color shift between cyan ↔ purple ↔ blue
            if (mat?.color && i === 0) {
              // neonCyan — shift toward purple
              mat.color.copy(new Color("#00D4F0")).lerp(new Color("#C43BFF"), colorShift * 0.15);
            } else if (mat?.color && i === 1) {
              // neonPurple — shift toward cyan  
              mat.color.copy(new Color("#A078FF")).lerp(new Color("#00D4F0"), colorShift * 0.15);
            } else if (mat?.color && i === 2) {
              // neonBlue — shift toward purple
              mat.color.copy(new Color("#3088CC")).lerp(new Color("#C43BFF"), colorShift * 0.12);
            }
          }
        }

        // ─── BUILDING WINDOW FLICKERS — staggered natural on/off cycles ──
        // Each window independently stays lit or dim for several seconds
        // before slowly transitioning to the opposite state.
        const buildingsGroup = scene.getObjectByName("cityBuildings");
        if (!scene.userData.__windowFlickerInit && buildingsGroup) {
          // One-time: collect all window meshes and assign per-window timers
          const allWindows = [];
          buildingsGroup.traverse((child) => {
            if (child.isMesh && child.material?.isMeshBasicMaterial &&
                child.material.color?.getHex && child.material.transparent &&
                child.geometry?.type === "PlaneGeometry" &&
                child.material.color.getHex() !== 0x00D4F0 &&
                child.material.color.getHex() !== 0xA078FF &&
                child.material.color.getHex() !== 0x3088CC) {
              allWindows.push(child);
            }
          });
          // Each window gets: current opacity, target opacity, next change time
          scene.userData.__windowStates = allWindows.map((w) => ({
            mesh: w,
            current: w.material.opacity || 0.6,
            target: w.material.opacity || 0.6,
            nextChange: t + 1.0 + Math.random() * 8.0,
            pulseSpeed: 0.25 + Math.random() * 0.5,
            pulsePhase: Math.random() * Math.PI * 2,
            isStore: w.position.y < 2.5,
          }));
          scene.userData.__windowFlickerInit = true;
        }

        const windowStates = scene.userData.__windowStates;
        if (windowStates) {
          const LERP_SPEED = 0.85;
          for (const ws of windowStates) {
            if (t >= ws.nextChange) {
              const brightChance = ws.isStore ? 0.82 : 0.73;
              ws.target = Math.random() < brightChance
                ? 0.5 + Math.random() * 0.5
                : 0.25 + Math.random() * 0.2;
              ws.nextChange = t + (ws.isStore ? 3.5 : 2.5) + Math.random() * 5.0;
            }
            ws.current += (ws.target - ws.current) * Math.min(1, LERP_SPEED * dt);
            const microPulse = Math.sin(t * ws.pulseSpeed + ws.pulsePhase) * 0.04;
            const finalOpacity = Math.max(0.2, Math.min(1.0, ws.current + microPulse));
            if (ws.mesh?.material) {
              ws.mesh.material.opacity = finalOpacity;
            }
          }
        }

        // ─── PLAZA FILL LIGHT — soft pulse with music ─────────
        const pf = scene.userData.plazaFill;
        if (pf && pf.intensity !== undefined) {
          pf.intensity = 1.0 + audioBeat * 0.8 + Math.sin(t * 1.2) * 0.2;
        }

        // ─── SHIFTING NEON AMBIENT LIGHTS — slow color/intensity drift ──
        // Each light breathes and shifts between its two neon colors.
        // Very low frequency keeps it subtle and mobile-friendly.
        const neonAmbients = scene.userData.neonAmbients;
        if (neonAmbients) {
          for (const na of neonAmbients) {
            const wave = Math.sin(t * 0.35 + na.phase); // ~18s full cycle — very slow
            // Intensity: gentle breath + slight music lift
            na.light.intensity = na.baseI * (0.7 + wave * 0.3) + audioBeat * 0.4;
            // Color: lerp between color1 (blue/purple) and color2 (opposite) smoothly
            const blend = wave * 0.5 + 0.5; // 0..1
            na.light.color.copy(na.color1).lerp(na.color2, blend * 0.45);
          }
        }

        // ─── NEON SIGNS + PATH LIGHTS — color-shift ambient glow ──
        const hueShift = Math.sin(t * 0.25) * 0.5 + 0.5; // slow 0..1 wave

        scene.children.forEach((child) => {
          // Neon signs — brighter + color-shift ambient glow
          if (child.userData?.isNeonSign) {
            child.lookAt(camera.position);
            const signPhase = child.position.x * 0.5;
            const breathe = 0.22 + Math.sin(t * 1.3 + signPhase) * 0.1 + audioBeat * 0.12;
            child.children.forEach((part) => {
              if (part.name === "neonBack" && part.material?.opacity !== undefined) {
                part.material.opacity = breathe;
              }
              // Pulse the border frame
              if (part.material?.color && part.material?.opacity !== undefined && part.renderOrder === 1) {
                part.material.opacity = 0.35 + audioBeat * 0.3 + Math.sin(t * 1.5 + signPhase) * 0.1;
              }
            });
          }
          if (child.userData?.isZenParticle) {
            const p = child.userData;
            child.position.y = p.baseY + Math.sin(t * 1.2 + p.phase) * 0.15;
            child.position.x = p.baseX + Math.cos(t * 0.8 + p.phase) * 0.2;
            child.position.z = p.baseZ + Math.sin(t * 0.6 + p.phase) * 0.2;
          }
        });
        animateZenBeach(scene, t, audioBeat);
        const djIsPlaying = !!(djTrackRef.current && (audioIntensityRef?.current ?? 0) > 0.01);
        animateDanceFloor(scene, t, audioBeat, audioIntensityRef?.current ?? 0, djIsPlaying);
        // Push current DJ track into scene for Now Playing display
        if (djTrackRef.current) scene.userData.djNowPlayingTrack = djTrackRef.current;
        animateJukebox(scene, t, audioBeat);
        animateLaunchZone(scene, t, audioBeat, dt);

        // Stars twinkle
        const starsMesh = scene.userData.stars;
        if (starsMesh && starsMesh.material) {
          starsMesh.material.opacity = 0.45 + Math.sin(t * 0.9) * 0.08 + Math.cos(t * 0.6) * 0.07;
          // Vary star size slightly too
          starsMesh.material.size = 0.32 + Math.sin(t * 1.2) * 0.04;
        }

        // ─── SKYBOX — follows camera + slow drift rotation ─────────
        if (skybox) {
          skybox.position.copy(camera.position);
          skybox.rotation.y += dt * 0.015; // Very slow Y-axis drift
          skybox.rotation.x += dt * 0.003; // Tiny tilt for depth
        }

        // ─── Stage screen projection (for YouTube iframe overlay) ──────────
        // Use clientWidth/clientHeight (CSS pixels) NOT domElement width/height
        // (attribute pixels are scaled by devicePixelRatio on retina/mobile)
        if (stageScreenPosRef) {
          const ss = new Vector3(0, 2.5, -17.4);
          const proj = ss.clone().project(camera);
          const rw = renderer.domElement.clientWidth || renderer.domElement.width;
          const rh = renderer.domElement.clientHeight || renderer.domElement.height;
          const cx = (proj.x * 0.5 + 0.5) * rw;
          const cy = (-proj.y * 0.5 + 0.5) * rh;
          // Project corners for size
          const tl = new Vector3(-3.5, 4.5, -17.4).project(camera);
          const br = new Vector3(3.5, 0.5, -17.4).project(camera);
          const sw = Math.abs((br.x - tl.x) * 0.5 * rw);
          const sh = Math.abs((-br.y + tl.y) * 0.5 * rh);
          stageScreenPosRef.current = { x: cx - sw / 2, y: cy - sh / 2, w: sw, h: sh };
        }

        // ─── REMOTE AVATARS — Phase 2: sync, spawn, despawn, animate ──
        const remoteMap = remoteAvatarsRef.current;
        const activeIds = new Set();

        for (const remote of remoteUsersRef.current) {
          if (!remote?.user_id) continue;
          activeIds.add(remote.user_id);

          let entry = remoteMap[remote.user_id];
          if (!entry) {
            // Spawn new remote avatar — returns a controller Group immediately
            const group = createRemoteAvatar(
              scene, remote.user_id,
              remote.username || "User",
              remote.avatar_type || "neutral",
              remote.skin_tone || "medium",
              remote.avatar_style || "streetwear"
            );
            entry = { group, prevPos: { x: remote.pos_x || 0, z: remote.pos_z || 0 } };
            remoteMap[remote.user_id] = entry;
          }

          const g = entry.group;
          const targetX = remote.pos_x || 0;
          const targetZ = remote.pos_z || 0;
          const targetRot = remote.rotation || 0;

          // Smooth position lerp
          g.position.x += (targetX - g.position.x) * Math.min(1, 8 * dt);
          g.position.y = SPAWN[1];
          g.position.z += (targetZ - g.position.z) * Math.min(1, 8 * dt);

          // Smooth rotation
          let rotDiff = targetRot - g.rotation.y;
          while (rotDiff > Math.PI) rotDiff -= Math.PI * 2;
          while (rotDiff < -Math.PI) rotDiff += Math.PI * 2;
          g.rotation.y += rotDiff * Math.min(1, 6 * dt);

          // Calculate velocity for walk animation
          const dx = g.position.x - entry.prevPos.x;
          const dz = g.position.z - entry.prevPos.z;
          const vel = Math.sqrt(dx * dx + dz * dz);
          entry.prevPos = { x: g.position.x, z: g.position.z };

          // ─── Remote GLB avatar animation ────────────────────
          // _avatarEntry is set immediately on the controller group, updated when GLB loads
          const remoteEntry = g.userData._avatarEntry;
          if (remoteEntry) updateAvatarAnimation(remoteEntry, vel * 15, false, dt);
        }

        // Despawn avatars that are no longer present
        for (const id in remoteMap) {
          if (!activeIds.has(id)) {
            const entry = remoteMap[id];
            if (entry.group) {
              scene.remove(entry.group);
              entry.group.traverse((obj) => {
                if (obj.geometry) obj.geometry.dispose();
                if (obj.material) {
                  if (Array.isArray(obj.material)) obj.material.forEach((m) => m.dispose());
                  else obj.material.dispose();
                }
              });
            }
            delete remoteMap[id];
          }
        }

        renderer.render(scene, camera);
        frameRef.current++;

        // Track lock transitions for cleanup
        prevLockedRef.current = lockedRef.current;

        if (frameRef.current === 3) onLoadedRef.current?.();
      };

      animate();

      const onResize = () => {
        if (!canvas) return;
        const w = isMobileRef.current ? window.innerWidth : canvas.clientWidth;
        const h = isMobileRef.current ? window.innerHeight : canvas.clientHeight;
        renderer.setSize(w, Math.max(h, 1));
        camera.aspect = w / Math.max(h, 1);
        camera.updateProjectionMatrix();
      };
      window.addEventListener("resize", onResize);

      return () => {
        cancelAnimationFrame(animId);
        window.removeEventListener("resize", onResize);
        renderer.dispose();
        scene.traverse((obj) => {
          if (obj.geometry) obj.geometry.dispose();
          if (obj.material) {
            if (Array.isArray(obj.material)) obj.material.forEach((m) => m.dispose());
            else obj.material.dispose();
          }
        });
        initializedRef.current = false;
        lastTimeRef.current = 0;
        frameRef.current = 0;
        avatarRef.current = null;
        avatarEntryRef.current = null;
        sceneRef.current = null;
        remoteAvatarsRef.current = {};
        avatarRotRef.current = 0;
        camYawRef.current = 0;
        camYawSmoothRef.current = 0;
        idleTimerRef.current = 0;
        isOrbitingRef.current = false;
      };
    } catch (e) {
      console.error("[CityCanvas] init error:", e);
      setError(e.message || String(e));
    }
  }, []);

  // Orientation / resize cleanup — resets all mobile touch state
  useEffect(() => {
    const handleResize = () => {
      // Clear mobile input
      mobileInputRef.current = { x: 0, y: 0, camDx: 0 };
      velocityRef.current = { x: 0, z: 0 };
      // Remount joystick to clear stuck pointer IDs
      setMobileResetKey((k) => k + 1);
      // Force renderer size update (handled in the init resize listener too)
    };
    window.addEventListener("resize", handleResize);
    window.addEventListener("orientationchange", handleResize);
    if (window.visualViewport) {
      window.visualViewport.addEventListener("resize", handleResize);
    }
    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("orientationchange", handleResize);
      if (window.visualViewport) {
        window.visualViewport.removeEventListener("resize", handleResize);
      }
    };
  }, []);

  // Keyboard
  useEffect(() => {
    const onDown = (e) => { keysRef.current[e.key.toLowerCase()] = true; };
    const onUp = (e) => { keysRef.current[e.key.toLowerCase()] = false; };
    window.addEventListener("keydown", onDown);
    window.addEventListener("keyup", onUp);
    return () => {
      window.removeEventListener("keydown", onDown);
      window.removeEventListener("keyup", onUp);
    };
  }, []);

  // Mouse
  useEffect(() => {
    const onDown = (e) => {
      if (e.target === canvasRef.current) {
        mouseRef.current.down = true;
        mouseRef.current.button = e.button;
      }
    };
    const onUp = () => { mouseRef.current.down = false; mouseRef.current.button = 0; };
    const onMove = (e) => {
      if (mouseRef.current.down) {
        mouseRef.current.dx += e.movementX;
        mouseRef.current.dy += e.movementY;
      }
    };
    // Prevent context menu on right-click
    const onContext = (e) => {
      if (e.target === canvasRef.current) e.preventDefault();
    };
    window.addEventListener("mousedown", onDown);
    window.addEventListener("mouseup", onUp);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("contextmenu", onContext);
    return () => {
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("mouseup", onUp);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("contextmenu", onContext);
    };
  }, []);

  // ─── REMOTE AVATAR CLICK DETECTION (raycasting) ────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleClick = (e) => {
      // Only process clicks directly on the canvas (ignore HUD buttons)
      if (e.target !== canvas) return;

      const scene = sceneRef.current;
      const camera = cameraRef.current;
      if (!scene || !camera) return;

      const rect = canvas.getBoundingClientRect();
      const mouseX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const mouseY = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(new THREE.Vector2(mouseX, mouseY), camera);
      raycaster.far = 20; // Only detect within reasonable distance

      // Collect all remote avatar groups (including name sprites)
      const remoteGroups = [];
      const remoteMap = remoteAvatarsRef.current;
      for (const id in remoteMap) {
        const entry = remoteMap[id];
        if (entry.group) remoteGroups.push(entry.group);
      }

      if (remoteGroups.length === 0) return;

      // Raycast against remote avatar groups (recursive: includes torso, head, name sprite)
      const intersects = raycaster.intersectObjects(remoteGroups, true);

      if (intersects.length > 0) {
        // Walk up to find the root remote avatar group
        let obj = intersects[0].object;
        while (obj && !obj.name?.startsWith("remote_")) {
          obj = obj.parent;
        }
        if (obj && obj.userData?.userId) {
          const hitUserId = obj.userData.userId;
          // Find the remote user data
          const remoteUser = remoteUsersRef.current.find(
            (u) => u.user_id === hitUserId
          );
          if (remoteUser && onRemoteClickRef.current) {
            onRemoteClickRef.current(hitUserId, remoteUser.username || "User");
          }
        }
      }
    };

    canvas.addEventListener("click", handleClick);
    // Also handle touch on mobile
    canvas.addEventListener("touchend", (e) => {
      // Convert touch to click-like event
      if (e.target !== canvas) return;
      if (e.changedTouches.length === 1 && !e.cancelable) return;
      handleClick({ target: canvas, clientX: e.changedTouches[0]?.clientX, clientY: e.changedTouches[0]?.clientY });
    });

    return () => {
      canvas.removeEventListener("click", handleClick);
    };
  }, []);

  if (error) {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-sky-200">
        <div className="text-center px-6">
          <p className="text-red-600 font-bold text-sm mb-2">3D Error</p>
          <p className="text-xs text-gray-500 mb-4 max-w-md">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 rounded-lg bg-blue-500 text-white text-xs font-bold"
          >
            Reload
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        position: "relative",
        width: isMobile ? "100vw" : "100%",
        height: isMobile ? "100dvh" : "100%",
      }}
    >
      <canvas
        ref={canvasRef}
        className="w-full h-full block"
        style={{ touchAction: "none" }}
      />
      {/* Mobile controls rendered by parent (UpperVibeCity) */}
    </div>
  );
}