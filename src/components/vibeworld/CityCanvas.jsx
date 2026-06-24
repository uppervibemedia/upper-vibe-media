import React, { useRef, useEffect, useState, useCallback } from "react";
import * as THREE from "three";
import { SPAWN, TREE_POSITIONS, PARK_RADIUS } from "./cityData";
import createCitySkyline from "./CitySkyline";
// Vibe Shop is temporarily disabled — replaced by Ferris Wheel
// import createVibeShop from "./VibeShop";
import { createFerrisWheel, animateFerrisWheel, WHEEL_X, WHEEL_Z, WHEEL_RADIUS, WHEEL_HUB_Y, getCabinWorldPosition, getBoardingPosition } from "./FerrisWheel";
import createZenBeach, { animateZenBeach } from "./ZenBeach";
import { addDanceFloor, animateDanceFloor } from "./DanceFloor";
import { createJukebox, animateJukebox, JUKEBOX_POS, JUKEBOX_INTERACT_RADIUS, DANCE_FLOOR_RADIUS } from "./Jukebox";
import { buildLaunchZone, animateLaunchZone, getNearLaunchPad, collectNearbyOrbs, triggerLandingPulse, LAUNCH_HEIGHT, LAUNCH_DURATION, GLIDE_DURATION } from "./VibeLaunchZone";
import { createHoverboardZone, animateHoverboardZone, flashRing, resetRings, collectOrb, resetOrbs, HOVERBOARD_START, HOVERBOARD_INTERACT_RADIUS, HOVERBOARD_RINGS, BEACH_ORBS, BOOST_PADS, LAUNCH_PADS } from "./HoverboardRingRun";
import { createCrystalZone, animateCrystalZone, activateCrystalZone } from "./CrystalZone";
// Sky system and avatar — must be at top of file, not mid-file
import { createCosmicSky, animateCosmicSky } from "./CosmicSkySystem";
import { createAvatar, createRemoteAvatar, updateAvatarAnimation, retintAvatar, attachHoverboard, detachHoverboard } from "./AvatarModel.jsx";
import { createTestAvatar, updateTestAvatarAnimation, retintTestAvatar } from "./AvatarModelTest";
import { createMixamoAvatar, updateMixamoAvatarAnimation, retintMixamoAvatar } from "./AvatarModelMixamo";
import { createZoneSign } from "./ZoneSign";

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
const MOVE_SPEED = 4.5;    // +50% from 3.0
const ACCELERATION = 14.0; // +40% so movement feels snappy at new speed
const DECELERATION = 11.0; // +37.5% so stopping stays proportional
const TURN_SPEED = 2.5;       // radians/sec for A/D turning
const ROTATION_SMOOTH = 8.0;  // how fast avatar body snaps to move direction

// Camera constants — standard third-person (portrait / desktop)
const CAM_DIST = 5.5;         // distance behind avatar
const CAM_HEIGHT = 2.4;       // above avatar ground position
const CAM_LOOK_Y = 0.9;       // look-at Y offset (avatar chest)
const CAM_PITCH_MIN = -0.35;  // radians — look down (prevent under-map)
const CAM_PITCH_MAX =  0.22;  // radians — look up (was 0.50; tighter limit prevents planet/building overlap)
// Landscape mobile — closer, more cinematic, immersive third-person
const CAM_DIST_LS   = 3.5;    // much closer — world feels nearer
const CAM_HEIGHT_LS = 1.75;   // lower shoulder height
const CAM_LOOK_Y_LS = 1.35;   // look at avatar upper chest / head
const FOV_PORTRAIT  = 52;     // default portrait FOV
const FOV_LANDSCAPE = 60;     // wider FOV in landscape feels immersive

// Tree collisions — radius 0.6 per tree
const TREE_R = 0.5;
const COLLISION_BOXES = [
  ...TREE_POSITIONS.map(([tx, tz]) => [tx, tz, TREE_R, TREE_R]),
  [22 - 1.5, 5, 0.5, 0.5], [22 + 1.5, 5, 0.5, 0.5], [22, 5, 1.2, 1.2],
];

// ─── UTILITIES ────────────────────────────────────────────────
function circleVsCircle(x1, z1, r1, x2, z2, r2) {
  const dx = x1 - x2, dz = z1 - z2;
  return dx * dx + dz * dz < (r1 + r2) * (r1 + r2);
}

// Skyline boundary — rectangular perimeter matching CitySkyline.jsx wall positions
// North wall: z=-36  East wall: x=36  West wall: x=-36
// Beach/south open face starts at z=15 (where wings end)
const SKYLINE_NORTH = -36;
const SKYLINE_EAST  =  36;
const SKYLINE_WEST  = -36;
const SKYLINE_BEACH_START = 15; // south of this z, beach x-limits apply

function resolveCollisions(px, pz, r, boxes, isHoverboarding = false) {
  let x = px, z = pz;
  for (const [bx, bz, br] of boxes) {
    if (!circleVsCircle(x, z, r, bx, bz, br)) continue;
    const dx = x - bx, dz = z - bz;
    const dist = Math.sqrt(dx * dx + dz * dz) || 0.001;
    const overlap = r + br - dist;
    x += (dx / dist) * overlap;
    z += (dz / dist) * overlap;
  }

  // ── Rectangular skyline perimeter ──────────────────────────────
  // North wall (z=-36): block players from going behind stage/north buildings
  if (z < SKYLINE_NORTH + r) z = SKYLINE_NORTH + r;
  // East wall (x=36): block access behind east wing buildings
  if (x > SKYLINE_EAST - r) x = SKYLINE_EAST - r;
  // West wall (x=-36): block access behind west wing buildings
  if (x < SKYLINE_WEST + r) x = SKYLINE_WEST + r;

  // ── Beach zone (z > SKYLINE_BEACH_START) ───────────────────────
  // Wings stop at z=14; apply narrower x limits so players don't walk off
  // to the sides where there are no buildings. Beach area is open but contained.
  if (z >= SKYLINE_BEACH_START) {
    // Gradually narrow the x corridor as player moves toward ocean
    const beachProgress = Math.min(1, (z - SKYLINE_BEACH_START) / 18);
    const beachXLimit = 34 - beachProgress * 6; // from ±34 → ±28 deep
    if (x > beachXLimit) x = beachXLimit;
    if (x < -beachXLimit) x = -beachXLimit;
  }

  // Beach shoreline / ocean boundary
  const maxZ = isHoverboarding ? 75 : 34;
  if (z > maxZ) z = maxZ;

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
// Alias — all sign creation delegated to ZoneSign.js
const createNeonSign = createZoneSign;



function buildPark(scene) {
  createCosmicSky(scene);
  createCitySkyline(scene);

  const SHORELINE_Z = 32;
  const OCEAN_DEPTH = 54;

  // ═════════════════════════════════════════════════════════════
  // 1. GROUND — dark urban plaza floor
  // ═════════════════════════════════════════════════════════════
  const groundGeo = new PlaneGeometry(84, 64);
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
  const PLAZA_X = 0, PLAZA_Z = -13, PLAZA_R = 10.5; // 50% larger dance floor

  const plazaDisc = new Mesh(
    new CircleGeometry(PLAZA_R, 64),
    mat("#141B2D", { roughness: 0.35, metalness: 0.30 })
  );
  plazaDisc.rotation.x = -Math.PI / 2;
  plazaDisc.position.set(PLAZA_X, 0.001, PLAZA_Z);  // PLAZA_Z=-13
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
  // 4. MAIN MUSIC STAGE — pushed back to z=-26 for open gathering space
  // ═════════════════════════════════════════════════════════════
  const stage = new Group();
  stage.name = "musicStage";

  // Riser base
  const stageRiser = new Mesh(new BoxGeometry(10, 1.0, 5.5), mat("#111830", { roughness: 0.3, metalness: 0.6 }));
  stageRiser.position.set(0, 0.5, -32);
  stageRiser.castShadow = true; stageRiser.receiveShadow = true;
  stage.add(stageRiser);

  // Top platform deck
  const stagePlat = new Mesh(new BoxGeometry(10, 0.25, 5.5), mat("#1A2050", { roughness: 0.2, metalness: 0.65 }));
  stagePlat.position.set(0, 1.12, -32);
  stagePlat.castShadow = true; stagePlat.receiveShadow = true;
  stage.add(stagePlat);

  // Front edge neon strip
  const stageEdge = new Mesh(
    new BoxGeometry(10.1, 0.08, 0.1),
    new MeshBasicMaterial({ color: new Color("#00D4F0"), depthWrite: false })
  );
  stageEdge.position.set(0, 1.27, -29.2);
  stage.add(stageEdge);

  // Side neon strips
  for (const sx of [-5.05, 5.05]) {
    const sideStrip = new Mesh(
      new BoxGeometry(0.06, 1.0, 0.06),
      new MeshBasicMaterial({ color: new Color(sx < 0 ? "#C43BFF" : "#00D4F0"), depthWrite: false, transparent: true, opacity: 0.7 })
    );
    sideStrip.position.set(sx, 0.5, -32);
    stage.add(sideStrip);
  }

  // Main screen
  const screenMat = mat("#1A1A3A", { roughness: 0.2, metalness: 0.7 });
  const screen = new Mesh(new BoxGeometry(14, 7, 0.2), screenMat);
  screen.position.set(0, 3.5, -34.4);
  screen.castShadow = true;
  screen.name = "stageScreen";
  stage.add(screen);
  scene.userData.stageScreen = screen;
  scene.userData._stageCanvasApplied = false;

  const screenGlow = new Mesh(
    new BoxGeometry(14.3, 7.3, 0.05),
    new MeshBasicMaterial({ color: new Color("#00E5FF"), depthWrite: false, transparent: true, opacity: 0.65 })
  );
  screenGlow.position.set(0, 3.5, -34.4);
  screenGlow.name = "stageScreenGlow";
  stage.add(screenGlow);

  // Stage arch
  for (let a = 0; a < 10; a++) {
    const archAngle = -Math.PI / 2 + (a / 9) * Math.PI;
    const ax = Math.cos(archAngle) * 7.2;
    const ay = 3.5 + Math.sin(archAngle) * 7.2;
    const archSeg = new Mesh(
      new BoxGeometry(0.09, 0.09, 0.15),
      new MeshBasicMaterial({ color: new Color("#C43BFF"), depthWrite: false, transparent: true, opacity: 0.85 })
    );
    archSeg.position.set(ax, ay, -34.3);
    stage.add(archSeg);
  }

  // Stage lights
  const spotL = new PointLight();
  spotL.color = new Color("#A078FF"); spotL.intensity = 5; spotL.distance = 20;
  spotL.position.set(-6, 4.5, -31); stage.add(spotL);

  const spotR = new PointLight();
  spotR.color = new Color("#00D4F0"); spotR.intensity = 5; spotR.distance = 20;
  spotR.position.set(6, 4.5, -31); stage.add(spotR);

  // Front wash light
  const frontWash = new PointLight();
  frontWash.color = new Color("#9B4FFF"); frontWash.intensity = 3; frontWash.distance = 14;
  frontWash.position.set(0, 2.5, -29); stage.add(frontWash);

  scene.add(stage);
  // Stage label — just above the screen, centered on screen face
  createNeonSign(scene, 0, 7.4, -34.0, "MUSIC  STAGE", "#00D4F0");

  // ═══════════════════════════════════════
  // VIBE LAUNCH ZONE
  // ═══════════════════════════════════════
  buildLaunchZone(scene);
  createNeonSign(scene, 0, 3.5, 3, "VIBE  LAUNCH  ZONE", "#00E5FF");

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
  loungePlat.position.set(-22, 0.003, -26);
  loungePlat.receiveShadow = true;
  lounge.add(loungePlat);

  // Outer glow ring — pink/purple
  const loungeOuterRing = new Mesh(
    new RingGeometry(4.2, 4.5, 64),
    new MeshBasicMaterial({ color: new Color("#C43BFF"), depthWrite: false, side: THREE.DoubleSide, transparent: true, opacity: 0.5 })
  );
  loungeOuterRing.rotation.x = -Math.PI / 2;
  loungeOuterRing.position.set(-22, 0.006, -26);
  loungeOuterRing.renderOrder = 1;
  lounge.add(loungeOuterRing);

  // Curved neon lounge seating — 5 seats in a semi-circle facing inward
  for (let i = 0; i < 5; i++) {
    const ang = Math.PI + (i / 4) * Math.PI * 0.65; // ~117° arc for openness
    const radius = 2.8;
    const sx = -22 + Math.cos(ang) * radius;
    const sz = -26 + Math.sin(ang) * radius;

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
      const tx = -22 + Math.cos(nextAng) * (radius - 0.15);
      const tz = -26 + Math.sin(nextAng) * (radius - 0.15);
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
  firePit.position.set(-22, 0.14, -26);
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
    fGlow.position.set(-22, 0.32 + (radius - 0.5) * 0.5, -26);
    lounge.add(fGlow);
    loungeFireMats.push(fGlowMat);
  }

  // ── Neon ambient lighting — 3 RingGeometry arcs instead of 96 sphere dots ──
  const loungeNeonMats = [...loungeFireMats];
  const _isMobLounge = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

  // Replace 96 arc-dot sphere meshes with 3 simple RingGeometry arcs
  const ARC_COLORS_L = ["#00D4F0", "#A078FF", "#C43BFF"];
  const arcRingMats = [];
  for (let a = 0; a < 3; a++) {
    const arcR = 3.2 + a * 0.5;
    const arcMat = new MeshBasicMaterial({
      color: new Color(ARC_COLORS_L[a]),
      depthWrite: false, transparent: true, opacity: 0.45, side: THREE.DoubleSide,
    });
    const arcRing = new Mesh(
      new RingGeometry(arcR - 0.07, arcR + 0.07, _isMobLounge ? 32 : 48),
      arcMat
    );
    arcRing.rotation.x = -Math.PI / 2;
    arcRing.position.set(-22, 0.02, -26);
    arcRing.renderOrder = 1;
    lounge.add(arcRing);
    arcRingMats.push(arcMat);
    loungeNeonMats.push(arcMat);
  }

  // Vertical neon accent pillars — 4 around the lounge
  for (let p = 0; p < 4; p++) {
    const pAng = Math.PI + (p / 3) * Math.PI * 0.65;
    const pr = 3.0;
    const px = -22 + Math.cos(pAng) * pr;
    const pz = -26 + Math.sin(pAng) * pr;
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
  energyRing.position.set(-22, 0.07, -26);
  energyRing.renderOrder = 1;
  lounge.add(energyRing);
  loungeNeonMats.push(energyRing.material);

  // Store lounge neon materials for audio-reactive pulsing
  scene.userData.loungeNeonMats = loungeNeonMats;

  scene.add(lounge);
  // Lounge sign — directly above the platform center
  createNeonSign(scene, -22, 3.8, -26, "VIBE  LOUNGE", "#C43BFF");

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
  libPlat.position.set(22, 0.002, -20);
  libPlat.receiveShadow = true;
  library.add(libPlat);

  // Main building cylinder
  const libBldg = new Mesh(
    new CylinderGeometry(2.8, 3, 3.2, 16),
    mat("#1E2E4A", { roughness: 0.3, metalness: 0.35, transparent: true, opacity: 0.85, depthWrite: true })
  );
  libBldg.position.set(22, 1.6, -20);
  libBldg.castShadow = true;
  library.add(libBldg);

  // Cyan ring lights around building
  for (const ry of [0.3, 1.8, 3.0]) {
    const libRing = new Mesh(
      new RingGeometry(2.85, 3.05, 32),
      new MeshBasicMaterial({ color: new Color("#00D4F0"), depthWrite: false, side: THREE.DoubleSide })
    );
    libRing.rotation.x = -Math.PI / 2;
    libRing.position.set(22, ry, -20);
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
  iconDisc.position.set(22, 3.25, -20);
  iconDisc.renderOrder = 1;
  library.add(iconDisc);

  // Entrance faces Central Plaza (west, toward 0,-4 from 16,-10)
  const libEntrance = new Mesh(
    new BoxGeometry(2.2, 3.0, 0.08),
    new MeshBasicMaterial({ color: new Color("#0080B8"), depthWrite: false, transparent: true, opacity: 0.65 })
  );
  libEntrance.position.set(22 - 2.8, 1.5, -20);
  libEntrance.rotation.y = Math.PI / 2;
  library.add(libEntrance);

  scene.add(library);
  // Library sign — above the building top
  createNeonSign(scene, 22, 3.6, -20, "MUSIC  LIBRARY", "#00D4F0");

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
  domeMesh2.position.set(-13, 0.05, 3);
  domeMesh2.castShadow = true;
  dome.add(domeMesh2);

  // Pulsing LED dots on dome surface
  for (let d = 0; d < 20; d++) {
    const dAng = (d / 20) * Math.PI * 2;
    const dot = new Mesh(
      new SphereGeometry(0.08, 4, 3),
      new MeshBasicMaterial({ color: new Color(["#C43BFF", "#00D4F0", "#FF00FF"][d % 3]), depthWrite: false })
    );
    dot.position.set(-13 + Math.cos(dAng) * 3.2, 1.5 + (d % 3) * 0.8, 3 + Math.sin(dAng) * 3.2);
    dome.add(dot);
  }

  // Entrance faces Central Plaza (northeast from dome at -10,8 toward 0,-4)
  const domeEntrance = new Mesh(
    new BoxGeometry(2.5, 3.5, 0.1),
    new MeshBasicMaterial({ color: new Color("#00E5FF"), depthWrite: false, transparent: true, opacity: 0.85 })
  );
  domeEntrance.position.set(-13, 1.75, 3 - 3.35);
  domeEntrance.name = "domeEntrance";
  dome.add(domeEntrance);

  const domeFloor = new Mesh(
    new CircleGeometry(3, 32),
    new MeshBasicMaterial({ color: new Color("#1E2A4E"), depthWrite: false, transparent: true, opacity: 0.3 })
  );
  domeFloor.rotation.x = -Math.PI / 2;
  domeFloor.position.set(-13, 0.003, 3);
  dome.add(domeFloor);

  scene.add(dome);
  // Dome sign — above the dome top
  createNeonSign(scene, -13, 3.8, 3, "VISUALIZER  DOME", "#C43BFF");

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
  vcPlat.position.set(-16, 0.003, -13);
  vcPlat.receiveShadow = true;
  vibeCheck.add(vcPlat);

  // Outer cyan ring
  const vcOuterRing = new Mesh(
    new RingGeometry(2.85, 3.0, 64),
    new MeshBasicMaterial({ color: new Color("#00E5FF"), depthWrite: false, side: THREE.DoubleSide, transparent: true, opacity: 0.5 })
  );
  vcOuterRing.rotation.x = -Math.PI / 2;
  vcOuterRing.position.set(-16, 0.006, -13);
  vcOuterRing.renderOrder = 1;
  vibeCheck.add(vcOuterRing);

  // Check-in step platform (circular, raised slightly)
  const vcStep = new Mesh(
    new CircleGeometry(1.2, 32),
    mat("#1E2E3E", { roughness: 0.3, metalness: 0.6, transparent: true, opacity: 0.7, depthWrite: true })
  );
  vcStep.rotation.x = -Math.PI / 2;
  vcStep.position.set(-16, 0.06, -13);
  vcStep.receiveShadow = true;
  vibeCheck.add(vcStep);

  // Step edge glow ring
  const vcStepRing = new Mesh(
    new RingGeometry(1.15, 1.25, 48),
    new MeshBasicMaterial({ color: new Color("#00E5FF"), depthWrite: false, side: THREE.DoubleSide, transparent: true, opacity: 0.7 })
  );
  vcStepRing.rotation.x = -Math.PI / 2;
  vcStepRing.position.set(-16, 0.07, -13);
  vcStepRing.renderOrder = 1;
  vibeCheck.add(vcStepRing);

  // Mirror assembly sub-group — rotated to face Central Plaza + Vibe Lounge
  const mirrorGroup = new Group();
  mirrorGroup.name = "vibeMirrorGroup";
  // Rotate to face the Central Plaza (0,-13) from mirror position (-16,-13)
  // Direction vector: dx=16, dz=0 → faces east
  mirrorGroup.rotation.y = Math.atan2(16, 0);

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
  mirrorGroup.position.set(-16, 0, -13);
  vibeCheck.add(mirrorGroup);

  scene.add(vibeCheck);
  // Vibe Check sign — above the mirror top
  createNeonSign(scene, -16, 4.2, -13, "DAILY  VIBE  CHECK", "#00E5FF");

  // ═════════════════════════════════════════════════════════════
  // 8.5. UPPER VIBE ACADEMY — futuristic learning cinema, top-left
  // ═════════════════════════════════════════════════════════════
  const academy = new Group();
  academy.name = "upperVibeAcademy";

  const ACAD_X = -28, ACAD_Z = 5;

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
  // Academy sign — above the roof dome
  createNeonSign(scene, ACAD_X, 4.6, ACAD_Z, "VIBE  ACADEMY", "#7C3AED");

  // Academy ambient light
  const academyLight = new PointLight();
  academyLight.color = new Color("#7C3AED");
  academyLight.intensity = 1.8; academyLight.distance = 12;
  academyLight.position.set(ACAD_X, 2.5, ACAD_Z);
  scene.add(academyLight);


  // ═════════════════════════════════════════════════════════════
  // 8.5.5 CRYSTAL ZONE — between Vibe Lounge and Vibe Academy
  // ═════════════════════════════════════════════════════════════
  createCrystalZone(scene);
  createNeonSign(scene, -26, 3.2, -14, "CRYSTAL  ZONE", "#AA66FF");

  // ═════════════════════════════════════════════════════════════
  // 8.6. ZEN BEACH — meditation zone, left-side beach area
  // ═════════════════════════════════════════════════════════════
  createZenBeach(scene, PLAZA_X, PLAZA_Z);

  // ═════════════════════════════════════════════════════════════
  // 8.8. HOVERBOARD RING RUN — right-side beach, action zone
  // ═════════════════════════════════════════════════════════════
  createHoverboardZone(scene);

  // ═════════════════════════════════════════════════════════════
  // 8.7. NEON VIBE WHEEL — far right (Vibe Shop temporarily disabled)
  // ═════════════════════════════════════════════════════════════
  createFerrisWheel(scene);

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

  // 10. BEACH — wider sand strip for the hoverboard course
  const beachGeo = new PlaneGeometry(92, 32);
  const beach = new Mesh(beachGeo, mat("#D4AA70", { roughness: 0.55, metalness: 0.0 }));
  beach.rotation.x = -Math.PI / 2;
  beach.position.set(0, 0.001, 24);
  beach.receiveShadow = true;
  beach.name = "beach";
  scene.add(beach);

  // Beach chairs removed — hoverboard course uses this space

  // 11. OCEAN — mobile: flat static low-poly mesh; desktop: animated high-poly
  const isMobScene = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
  const oceanWidth = 92;
  const oceanGeo = new PlaneGeometry(oceanWidth, OCEAN_DEPTH, isMobScene ? 4 : 56, isMobScene ? 4 : 54);
  const oceanMat = new MeshBasicMaterial({ color: new Color(isMobScene ? "#38B8E0" : "#30B0DC"), side: THREE.DoubleSide });
  const ocean = new Mesh(oceanGeo, oceanMat);
  ocean.rotation.x = -Math.PI / 2;
  ocean.position.set(0, 0, SHORELINE_Z + OCEAN_DEPTH / 2);
  ocean.renderOrder = 0; ocean.name = "ocean";
  scene.add(ocean);
  const origArr = isMobScene ? null : (() => { const a = new Float32Array(oceanGeo.attributes.position.array.length); a.set(oceanGeo.attributes.position.array); return a; })();
  scene.userData.ocean = ocean;
  scene.userData._oceanOrig = origArr;
  scene.userData._oceanStatic = isMobScene;
  scene.userData._oceanCenterZ = SHORELINE_Z + OCEAN_DEPTH / 2;

  const foamGeo = new PlaneGeometry(92, 1.5);
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
  const shoreGlowGeo = new PlaneGeometry(92, 0.5);
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
  moon.shadow.mapSize.width = 1024;
        moon.shadow.mapSize.height = 1024;
  moon.shadow.camera.near = 0.5;
  moon.shadow.camera.far = 100;
  moon.shadow.camera.left = -55;
  moon.shadow.camera.right = 55;
  moon.shadow.camera.top = 48;
  moon.shadow.camera.bottom = -48;
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

  // ── BEACH LIGHTING — much brighter and warmer than city interior ──
  const beachLight = new PointLight();
  beachLight.color = new Color("#FFE0A0");
  beachLight.intensity = 6.0;
  beachLight.distance = 42;
  beachLight.position.set(0, 5, SHORELINE_Z + 6);
  scene.add(beachLight);

  // Warm sun fills from above-left and above-right
  const beachSunL = new PointLight();
  beachSunL.color = new Color("#FFD580");
  beachSunL.intensity = 4.5;
  beachSunL.distance = 36;
  beachSunL.position.set(-20, 7, SHORELINE_Z + 8);
  scene.add(beachSunL);

  const beachSunR = new PointLight();
  beachSunR.color = new Color("#FFC060");
  beachSunR.intensity = 4.5;
  beachSunR.distance = 36;
  beachSunR.position.set(20, 7, SHORELINE_Z + 8);
  scene.add(beachSunR);

  // Ocean reflection — cool blue-cyan shimmer on the water surface
  const oceanReflect = new PointLight();
  oceanReflect.color = new Color("#40D4FF");
  oceanReflect.intensity = 3.5;
  oceanReflect.distance = 28;
  oceanReflect.position.set(0, 2, SHORELINE_Z + 20);
  scene.add(oceanReflect);

  // Zone point lights — bright neon glow per zone
  const loungeLight = new PointLight();
  loungeLight.color = new Color("#E040FB");
  loungeLight.intensity = 3.5; loungeLight.distance = 14;
  loungeLight.position.set(-22, 2.5, -26);
  scene.add(loungeLight);
  scene.userData.loungeLight = loungeLight;

  const libraryLight = new PointLight();
  libraryLight.color = new Color("#00E5FF");
  libraryLight.intensity = 3.5; libraryLight.distance = 14;
  libraryLight.position.set(22, 2.5, -20);
  scene.add(libraryLight);

  const domeLight = new PointLight();
  domeLight.color = new Color("#FF00FF");
  domeLight.intensity = 3.5; domeLight.distance = 14;
  domeLight.position.set(-13, 2.5, 3);
  scene.add(domeLight);

  const vibeCheckLight = new PointLight();
  vibeCheckLight.color = new Color("#00E5FF");
  vibeCheckLight.intensity = 3.5; vibeCheckLight.distance = 12;
  vibeCheckLight.position.set(-16, 2.5, -13);
  scene.add(vibeCheckLight);

  // ── Plaza fill light — soft central glow ──────────────────
  const plazaFill = new PointLight();
  plazaFill.color = new Color("#8888DD");
  plazaFill.intensity = 2.0;
  plazaFill.distance = 16;
  plazaFill.position.set(0, 1.5, -13);
  scene.add(plazaFill);
  scene.userData.plazaFill = plazaFill;

  // ── Shifting neon ambient lights — 2 on mobile, 4 on desktop ──
  const _isMobLights = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
  const _allNeonAmb = [
    { pos: [8,  3.5, -20], color: new Color("#0088FF"), distance: 18, phase: 0.0, baseI: 1.2 },
    { pos: [-8, 3.5, -20], color: new Color("#7C3AED"), distance: 18, phase: 1.6, baseI: 1.2 },
    { pos: [0,  4.0,   8], color: new Color("#00C8E8"), distance: 16, phase: 3.1, baseI: 1.0 },
    { pos: [0,  3.5, -30], color: new Color("#9B4FFF"), distance: 14, phase: 4.7, baseI: 0.9 },
  ];
  // Mobile: only 1 neon ambient light (the front one)
  const neonAmbients = (_isMobLights ? _allNeonAmb.slice(0, 1) : _allNeonAmb).map(({ pos, color, distance, phase, baseI }) => {
    const light = new PointLight();
    light.color.copy(color); light.intensity = baseI; light.distance = distance; light.position.set(...pos);
    scene.add(light);
    return { light, phase, baseI, color1: color.clone(), color2: new Color(phase < 2 ? "#A040FF" : "#00B8D4") };
  });
  scene.userData.neonAmbients = neonAmbients;

  // Palm trees removed — hoverboard course runs along the beach
  // Stars handled entirely by CosmicSkySystem (camera-relative, no ground bleed)
}

// ═══════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════
export default function CityCanvas({ onLoaded, onPositionChange, onRemoteAvatarClick, stageCanvas, audioIntensityRef, audioBassRef, audioBeatRef, locked, stageScreenPosRef, remoteUsers, isDancing = false, activeEmote = null, avatarConfig, onJukeboxProximity, retintRef, launchRef, onNearPad, djTrack, hbRiding = false, ferrisRiding = false, spawnOverride = null, rendererRef = null, tvMode = false, tvQuality = "smooth", ...props }) {
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

  // Update the in-world "Now Playing" display whenever djTrack changes
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;
    const draw = scene.userData.djDrawNowPlaying;
    if (draw) draw(djTrack?.title || "", djTrack?.artist_display || "Upper Vibe");
  }, [djTrack?.id, djTrack?.title]);

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
  // Use spawn override if provided (restores position when returning from SongPage)
  const effectiveSpawn = spawnOverride
    ? [spawnOverride.x, SPAWN[1], spawnOverride.z, spawnOverride.rot || 0]
    : [...SPAWN, 0];
  const avatarPosRef = useRef(effectiveSpawn); // [x, y, z, rotY]
  const stageCanvasRef = useRef(null);
  stageCanvasRef.current = stageCanvas;
  const velocityRef = useRef({ x: 0, z: 0 });
  const avatarRotRef = useRef(spawnOverride?.rot || 0);    // avatar body Y rotation (world space)
  const keysRef = useRef({});
  const mouseRef = useRef({ down: false, dx: 0, dy: 0, button: 0 });
  // Camera: yaw = angle of camera around avatar (0 = directly behind)
  // camYaw is independent of avatar rotation; avatar rotation is avatarRotRef
  // Third-person camera: camYaw is WORLD-SPACE absolute angle (not relative to avatar)
  // 0 = camera looks from +Z toward avatar (south), increases clockwise
  const camYawRef = useRef(0);    // start: camera at +Z behind avatar, avatar faces stage (-Z)
  const camYawSmoothRef = useRef(0);
  const camPitchRef = useRef(0.08);    // slight upward default
  const camPitchSmoothRef = useRef(0.08);
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
  const tvModeRef = useRef(tvMode);
  tvModeRef.current = tvMode;
  const tvQualityRef = useRef(tvQuality);
  tvQualityRef.current = tvQuality;
  const lockedRef = useRef(false);
  const prevLockedRef = useRef(false);
  lockedRef.current = locked;
  const isDancingRef = useRef(false);
  isDancingRef.current = isDancing;
  const hbRidingRef = useRef(false);
  hbRidingRef.current = hbRiding;
  const ferrisRidingRef = useRef(false);
  ferrisRidingRef.current = ferrisRiding;

  const activeEmoteRef = useRef(null);
  activeEmoteRef.current = activeEmote;
  const lastTimeRef = useRef(0);
  const frameRef = useRef(0);
  const initializedRef = useRef(false);
  // Launch zone state
  const launchStateRef = useRef({ active: false, phase: "idle", timer: 0, startY: 0 });
  const orbCountRef = useRef(0);
  const nearPadRef = useRef(-1);
  const speedBoostUntilRef = useRef(0); // timestamp (performance.now) when boost expires
  const splashParticlesRef = useRef(null); // water spray particle system

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

      const isMob = isMobileRef.current;
      const renderer = new WebGLRenderer({
        canvas,
        antialias: !isMob, // antialias is expensive on mobile — skip it
        powerPreference: isMob ? "low-power" : "high-performance",
      });
      renderer.setClearColor(0x0A1020); // Deep navy void — bright neon night
      if (rendererRef) rendererRef.current = renderer;
      // Cap pixel ratio — lower on mobile, even lower in TV Smooth mode
      const basePR = isMob ? Math.min(window.devicePixelRatio, 1.5) : Math.min(window.devicePixelRatio, 2);
      renderer.setPixelRatio(basePR);
      // Use window dimensions on mobile for reliable viewport sizing
      const rw = isMob ? window.innerWidth : canvas.clientWidth;
      const rh = isMob ? window.innerHeight : canvas.clientHeight;
      renderer.setSize(rw, Math.max(rh, 1));
      // Shadows are very expensive on mobile — disable them entirely
      renderer.shadowMap.enabled = !isMob;
      renderer.shadowMap.type = PCFSoftShadowMap;

      const scene = new Scene();
      sceneRef.current = scene;

      const asp = rw / Math.max(rh, 1);
      // Reduce far clip on mobile — less geometry enters view when turning, fewer draw calls
      // Far clip: planets are camera-relative at radius=55 — must be > 55+margin.
      // Stars (Points) also follow camera at r≈105 — must be > 105. Use 130 for both.
      const camera = new PerspectiveCamera(52, asp, 0.1, isMob ? 130 : 160);
      cameraRef.current = camera;
      // Start camera at camYaw=0: camera behind avatar facing stage. Use landscape constants if already landscape.
      const [spX, spY, spZ] = effectiveSpawn;
      const spawnLS = isMob && window.innerWidth > window.innerHeight;
      camera.fov = spawnLS ? FOV_LANDSCAPE : FOV_PORTRAIT;
      camera.updateProjectionMatrix();
      camera.position.set(spX, spY + (spawnLS ? CAM_HEIGHT_LS : CAM_HEIGHT), spZ + (spawnLS ? CAM_DIST_LS : CAM_DIST));
      camera.lookAt(spX, spY + (spawnLS ? CAM_LOOK_Y_LS : CAM_LOOK_Y), spZ);

      buildPark(scene);

      // Water splash particles — desktop only (too costly on mobile)
      if (!isMob) {
        const SPLASH_COUNT = 28;
        const splashGeo = new BufferGeometry();
        const pos = new Float32Array(SPLASH_COUNT * 3);
        splashGeo.setAttribute("position", new BufferAttribute(pos, 3));
        const splashMat = new PointsMaterial({ color: new Color("#80DFFF"), size: 0.18, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending });
        const splashPoints = new Points(splashGeo, splashMat);
        splashPoints.name = "hbSplash"; splashPoints.renderOrder = 5;
        scene.add(splashPoints);
        const particles = Array.from({ length: SPLASH_COUNT }, () => ({ vx: 0, vy: 0, vz: 0, life: 0, maxLife: 0 }));
        splashParticlesRef.current = { points: splashPoints, particles, pos };
      }

      // ── Crystal Zone activate via custom event ──────────────────
      const onCrystalActivate = () => activateCrystalZone(scene);
      window.addEventListener("crystalActivate", onCrystalActivate);

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

      // Determine avatar type
      const avatarTypeKey = avatarConfig?.avatarTypeKey || "current";
      const isMixamoAvatar = avatarTypeKey === "test-mixamo" || avatarTypeKey === "test-mixamo-female";
      const isTestAvatar = avatarTypeKey === "test-male" || avatarTypeKey === "test-female";
      const testGender = avatarTypeKey === "test-female" ? "female" : "male";
      const mixamoGender = avatarTypeKey === "test-mixamo-female" ? "female" : "male";

      // Read hair style from sessionStorage (set by customizer)
      const savedHairStyle = (() => { try { return sessionStorage.getItem("uvc_hair_style") || ""; } catch { return ""; } })();

      let entry;
      if (isMixamoAvatar) {
        // Casual human avatar — pass spawn position, hair style, outfit color, and skin tone
        entry = createMixamoAvatar(scene, {
          spawnX: effectiveSpawn[0],
          spawnY: effectiveSpawn[1],
          spawnZ: effectiveSpawn[2],
          gender: mixamoGender,
          hairStyle: savedHairStyle || (mixamoGender === "female" ? "ponytail" : "short"),
          outfitColorKey: avatarConfig?.outfitColorKey || null,
          skinToneKey: (() => { try { return sessionStorage.getItem("uvc_skin_tone") || null; } catch { return null; } })() || avatarConfig?.skinTone || "medium",
        }, (_entry) => {
          avatarEntryRef.current = _entry;
        });
        if (retintRef) {
          retintRef.current = (hexColor) => retintMixamoAvatar(avatarEntryRef.current, hexColor);
        }
      } else if (isTestAvatar) {
        // TEST avatars — procedural geometry, no GLB, instant load
        entry = createTestAvatar(scene, testGender, avatarConfig || {}, (_entry) => {
          const savedColor = avatarConfig?.suitColor;
          if (savedColor) retintTestAvatar(_entry, savedColor);
        });
        if (retintRef) {
          retintRef.current = (hexColor) => retintTestAvatar(avatarEntryRef.current, hexColor);
        }
      } else {
        // CURRENT avatar — original GLB-based system, completely unchanged
        entry = createAvatar(scene, avatarConfig || {}, (_entry) => {
          const savedColor = avatarConfig?.outfitColorKey;
          if (savedColor) {
            const COLOR_MAP = {
              "cosmic-blue":    "#00AADD",
              "neon-purple":    "#7B2FFF",
              "shadow-black":   "#080A0F",
              "rose-glow":      "#CC2288",
              "gold-aura":      "#CC9900",
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
        if (retintRef) {
          retintRef.current = (hexColor) => retintAvatar(avatarEntryRef.current, hexColor);
        }
      }
      avatarEntryRef.current = entry;
      avatarRef.current = entry.root;

      // Skybox is managed by animateCosmicSky each frame

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

        // ── TV Mode: lower pixel ratio for smoother mirroring ──
        // Update every 120 frames (~2s) to avoid costly setPixelRatio calls per frame
        if (frameRef.current % 120 === 0) {
          const isTv = tvModeRef.current;
          const isSmooth = tvQualityRef.current === "smooth";
          const targetPR = isTv && isSmooth
            ? Math.min(window.devicePixelRatio, 1.25)
            : isMob ? Math.min(window.devicePixelRatio, 1.5) : Math.min(window.devicePixelRatio, 2);
          if (Math.abs(renderer.getPixelRatio() - targetPR) > 0.05) {
            renderer.setPixelRatio(targetPR);
          }
        }

        const t = now;
        const keys = keysRef.current;
        const mouse = mouseRef.current;
        let [px, py, pz] = avatarPosRef.current;
        let rot = avatarRotRef.current;
        const vel = velocityRef.current;

        // ─── RIGHT-CLICK / CAM DRAG (desktop) ───────────────
        if (mouse.down && mouse.button === 2 && !lockedRef.current) {
          camYawRef.current   += mouse.dx * 0.004; // world-space yaw
          camPitchRef.current  = Math.max(CAM_PITCH_MIN, Math.min(CAM_PITCH_MAX, camPitchRef.current - mouse.dy * 0.004));
          userTouchingCamRef.current = true;
        } else if (!mouse.down) {
          userTouchingCamRef.current = false;
        }
        mouse.dx = 0;
        mouse.dy = 0;

        // ─── INPUT (skipped when locked) ────────────────────
         // GTA 5 style: idle = full 360° orbit, moving = camera behind avatar
         let inputFwd = 0; // +1 = forward, -1 = backward
         let inputStrafe = 0; // +1 = left, -1 = right (relative to camera)
         let hasAnyInput = false;

         if (lockedRef.current) {
           vel.x = 0;
           vel.z = 0;
         } else if (isMobileRef.current) {
           if (prevLockedRef.current) {
             // Exiting stage/locked mode — reset camera back behind avatar facing stage
             mobileInputRef.current = { x: 0, y: 0, camDx: 0, camDy: 0 };
             camYawRef.current = 0;        // camera at +Z side, avatar faces stage
             camYawSmoothRef.current = 0;
             avatarRotRef.current = Math.PI; // avatar faces -Z = toward stage
           }
           const joy = mobileInputRef.current;

           // Left joystick: forward/backward
            // MobileJoystick: dy = (cy - touchY)/halfSize, so drag UP → dy>0 → joy.y>0 = forward
            if (Math.abs(joy.y) > 0.08) { inputFwd = joy.y; hasAnyInput = true; }
            // Left joystick: left/right strafe — joy.x>0 = right
            if (Math.abs(joy.x) > 0.08) { inputStrafe = joy.x; hasAnyInput = true; }

           // ── Right-thumb camera drag (world-space yaw) ──
           // sensitivity already set in CameraLookZone (0.0072 rad)
           const cdx = joy.camDx || 0;
           const cdy = joy.camDy || 0;
           if (Math.abs(cdx) > 0.00005 || Math.abs(cdy) > 0.00005) {
             camYawRef.current += cdx;  // drag right = +cdx = camera rotates right
             camPitchRef.current = Math.max(CAM_PITCH_MIN, Math.min(CAM_PITCH_MAX, camPitchRef.current - cdy));
             userTouchingCamRef.current = true;
           }
           joy.camDx = 0;
           joy.camDy = 0;

           if (mobileInputRef.current._camActive) {
             userTouchingCamRef.current = true;
           }
        } else {
          if (prevLockedRef.current) {
            // Desktop: exiting stage mode — snap camera back to stage-facing
            camYawRef.current = 0;
            camYawSmoothRef.current = 0;
            avatarRotRef.current = Math.PI;
          }
          if (keys.w || keys.arrowup)    { inputFwd =  1; hasAnyInput = true; }
          if (keys.s || keys.arrowdown)  { inputFwd = -1; hasAnyInput = true; }
          if (keys.a || keys.arrowleft)  { inputStrafe = -1; hasAnyInput = true; }
          if (keys.d || keys.arrowright) { inputStrafe =  1; hasAnyInput = true; }
        }

        const isMoving = Math.abs(inputFwd) > 0.08 || Math.abs(inputStrafe) > 0.08;
         if (Math.abs(inputStrafe) > 0.08 && Math.abs(inputFwd) < 0.08) hasAnyInput = true;

         // ─── MOVEMENT (GTA 5 style) ───────────────────────────────────
         // Camera yaw is world-space and controlled by right thumb independently.
         // When idle: full 360° orbit around avatar, avatar doesn't turn.
         // When moving: avatar rotates toward camera heading (0.25-0.5s smooth turn),
         //             camera repositions behind avatar (0.5-1s smooth transition).
         let moveX = 0, moveZ = 0;
         if (isMobileRef.current) {
           if (isMoving) {
             // Movement directions relative to camera:
             // camYaw is the world-space angle where camera sits around avatar.
             // Camera at camYaw → looks toward avatar → "screen forward" = camYaw + π direction.
             // joy.y > 0 (drag up) = inputFwd > 0 = move forward = camYaw + π.
             // joy.x > 0 (drag right) = inputStrafe > 0 = move right = camYaw + π + π/2.
             const moveFwdAngle = camYawRef.current + Math.PI;
             // Right = 90° clockwise from forward in our sin/cos convention = forward - π/2
             const moveRightAngle = moveFwdAngle - Math.PI / 2;
             // inputFwd: +1 = forward, -1 = backward (camera-relative)
             // inputStrafe: +1 = strafe right, -1 = strafe left (camera-relative)
             moveX = Math.sin(moveFwdAngle) * inputFwd + Math.sin(moveRightAngle) * inputStrafe;
             moveZ = Math.cos(moveFwdAngle) * inputFwd + Math.cos(moveRightAngle) * inputStrafe;
             // Avatar faces the direction of travel (smooth 0.25-0.5s turn)
             const travelAngle = Math.atan2(moveX, moveZ);
             let rotDiff = travelAngle - rot;
             while (rotDiff > Math.PI) rotDiff -= Math.PI * 2;
             while (rotDiff < -Math.PI) rotDiff += Math.PI * 2;
             const turnSpeed = 4.0; // 0.25s to turn 90°
             rot += rotDiff * Math.min(1, turnSpeed * dt);
           }
        } else {
          // Desktop: A/D strafes left/right, W/S moves forward/backward (avatar direction)
          const kbStrafe = inputStrafe * 0.6;
          moveX = Math.sin(rot) * inputFwd + Math.cos(rot) * kbStrafe;
          moveZ = Math.cos(rot) * inputFwd - Math.sin(rot) * kbStrafe;
        }

        if (isMoving) {
          const boosting = hbRidingRef.current && performance.now() < speedBoostUntilRef.current;
          const targetSpeed = Math.abs(inputFwd) > 0.08 || Math.abs(inputStrafe) > 0.08
            ? (boosting ? MOVE_SPEED * 3.0 : MOVE_SPEED)
            : 0;
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
        [px, pz] = resolveCollisions(px, pz, 0.3, COLLISION_BOXES, hbRidingRef.current);

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
          // When riding hoverboard, float avatar slightly above ground
          const hbLift = hbRidingRef.current ? (0.18 + Math.sin(t * 3.0) * 0.04) : 0;
          py = SPAWN[1] + hbLift;
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

        // ── Hoverboard zone proximity ──
        if (frameRef.current % 10 === 0) {
          const hbdx = px - HOVERBOARD_START.x;
          const hbdz = pz - HOVERBOARD_START.z;
          const hbDist = Math.sqrt(hbdx * hbdx + hbdz * hbdz);
          scene.userData._nearHoverboard = hbDist < HOVERBOARD_INTERACT_RADIUS;
        }

        // ── Jukebox proximity ──
        if (onJukeboxProxRef.current && frameRef.current % 6 === 0) {
          const jdx = px - JUKEBOX_POS.x;
          const jdz = pz - JUKEBOX_POS.z;
          const jDist = Math.sqrt(jdx * jdx + jdz * jdz);
          const nearJukebox = jDist < JUKEBOX_INTERACT_RADIUS;
          const ddx = px;
          const ddz = pz - (-13);
          const dFloorDist = Math.sqrt(ddx * ddx + ddz * ddz);
          const proximityVol = Math.max(0.1, Math.min(1.0, 1.0 - (dFloorDist - 2) / (DANCE_FLOOR_RADIUS - 2)));
          try { onJukeboxProxRef.current(nearJukebox, proximityVol); } catch {}
        }

        // ─── CAMERA RECENTERING ──────────────────────────────
        const movingSpeed = Math.abs(inputFwd) > 0.08 || Math.abs(inputStrafe) > 0.08;
        if (isMobileRef.current && movingSpeed && !userTouchingCamRef.current) {
          const targetYaw = rot + Math.PI;
          let yawDelta = targetYaw - camYawRef.current;
          while (yawDelta > Math.PI) yawDelta -= Math.PI * 2;
          while (yawDelta < -Math.PI) yawDelta += Math.PI * 2;
          // Cap per-frame step to 0.06 rad — prevents frame spikes on 180° turns
          const step = Math.min(Math.abs(yawDelta) * Math.min(1, dt * 0.8), 0.06) * Math.sign(yawDelta);
          camYawRef.current += step;
        } else if (!isMobileRef.current && speed > 0.05 && !userTouchingCamRef.current) {
          // Desktop: maintain camera behind avatar
          const targetYaw = rot + Math.PI;
          let yawDelta = targetYaw - camYawRef.current;
          while (yawDelta > Math.PI) yawDelta -= Math.PI * 2;
          while (yawDelta < -Math.PI) yawDelta += Math.PI * 2;
          camYawRef.current += yawDelta * Math.min(1, dt * 2.5);
        }

        // Smooth camera yaw + pitch — slower on mobile avoids jerky geometry pop-in
        let yawDiff = camYawRef.current - camYawSmoothRef.current;
        while (yawDiff > Math.PI) yawDiff -= Math.PI * 2;
        while (yawDiff < -Math.PI) yawDiff += Math.PI * 2;
        const yawSmoothSpeed = isMobileRef.current ? 6.0 : 10.0;
        camYawSmoothRef.current += yawDiff * Math.min(1, dt * yawSmoothSpeed);
        camPitchSmoothRef.current += (camPitchRef.current - camPitchSmoothRef.current) * Math.min(1, dt * 8.0);

        const pitch = camPitchSmoothRef.current;

        if (!scene.userData._camVecs) {
          scene.userData._camVecs = {
            cabinPos: new Vector3(), nLook: new Vector3(),
            cLook: new Vector3(0, 4.5, -34.4),
            lkPos: new Vector3(0, 3.0, -12), lkLook: new Vector3(0, 3.5, -34.4),
            fA: new Vector3(0, WHEEL_HUB_Y * 0.4, -10), fB: new Vector3(0, 2, 40),
          };
        }
        const cv = scene.userData._camVecs;
        if (ferrisRidingRef.current) {
          const cabin = getCabinWorldPosition(0, t);
          cv.cabinPos.set(cabin.x, cabin.y + 0.6, cabin.z);
          camera.position.lerp(cv.cabinPos, Math.min(1, 4.0 * dt));
          const atTop = Math.max(0, Math.min(1, (cabin.y - WHEEL_HUB_Y) / WHEEL_RADIUS));
          const concertWindow = Math.max(0, (atTop - 0.72) / 0.28);
          const concertBlend = concertWindow * concertWindow * (3 - 2 * concertWindow);
          cv.nLook.lerpVectors(cv.fA, cv.fB, atTop);
          camera.lookAt(cv.nLook.lerp(cv.cLook, concertBlend));
          if (avatarRef.current) avatarRef.current.visible = false;
        } else if (lockedRef.current) {
          camera.position.lerp(cv.lkPos, Math.min(1, 3.0 * dt));
          camera.lookAt(cv.lkLook);
        } else {
          // Standard third-person: camera sits at world-space camYaw angle behind avatar.
          // Pick landscape vs portrait camera constants based on current orientation.
          const isLandscape = isMobileRef.current && window.innerWidth > window.innerHeight;
          const camDist   = isLandscape ? CAM_DIST_LS   : CAM_DIST;
          const camHeight = isLandscape ? CAM_HEIGHT_LS : CAM_HEIGHT;
          const camLookY  = isLandscape ? CAM_LOOK_Y_LS : CAM_LOOK_Y;
          const targetFov = isLandscape ? FOV_LANDSCAPE  : FOV_PORTRAIT;
          // Smoothly update FOV so transitions don't snap
          if (Math.abs(camera.fov - targetFov) > 0.1) {
            camera.fov += (targetFov - camera.fov) * Math.min(1, dt * 6);
            camera.updateProjectionMatrix();
          }

          const camAngle = camYawSmoothRef.current;
          const cosPitch = Math.cos(pitch);
          const sinPitch = Math.sin(pitch);
          const camX = px + Math.sin(camAngle) * camDist * cosPitch;
          const camY = py + camHeight + sinPitch * camDist;
          const camZ = pz + Math.cos(camAngle) * camDist * cosPitch;

          // Clamp camera above ground
          const minCamY = py + 0.5;
          camera.position.set(camX, Math.max(minCamY, camY), camZ);
          camera.lookAt(px, py + camLookY, pz);
        }

        // ─── GLB AVATAR ANIMATION ────────────────────────────
        // avatarEntryRef.current is the same object returned by createAvatar.
        // Its mixer/clips get populated in-place when GLB loads — no reassignment needed.
        const avatarEntry = avatarEntryRef.current;
        if (avatarEntry?._isMixamo) {
          // Mixamo Xbot GLB avatar — same logic as soldier, including hoverboard freeze
          const emoteId = isDancingRef.current ? (activeEmoteRef.current?.id || "dance") : null;
          updateMixamoAvatarAnimation(avatarEntry, speed, isDancingRef.current, dt, hbRidingRef.current, emoteId);
        } else if (avatarEntry?._isTestAvatar) {
          // Procedural test avatars (male/female) — no mixer/clips
          updateTestAvatarAnimation(avatarEntry, speed, isDancingRef.current, dt);
        } else {
          // Current avatar — original GLB animation system, completely unchanged
          if (avatarEntry && isDancingRef.current) {
            const emoteId = activeEmoteRef.current?.id || "dance";
            if (avatarEntry._emote !== emoteId) {
              avatarEntry._emote = emoteId;
              avatarEntry._emoteTimer = 0;
              avatarEntry._emoteBones = null; // force bone re-cache on emote switch
            }
          } else if (avatarEntry && !isDancingRef.current && avatarEntry._emote) {
            avatarEntry._emote = null;
            avatarEntry._emoteTimer = 0;
            avatarEntry._emoteBones = null;
          }
          if (avatarEntry) updateAvatarAnimation(avatarEntry, speed, isDancingRef.current, dt, hbRidingRef.current);
        }

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
          // Throttle texture upload — 8fps on mobile when far from stage, 15fps otherwise
          const stageTex = scene.userData._stageTex;
          if (stageTex) {
            const stageTexNow = performance.now();
            // Mobile: always 5fps regardless of distance
            const stageFps = isMob ? 5 : 15;
            const STAGE_TEX_INTERVAL = 1000 / stageFps;
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

        // Wave cycle: steady tempo
        const waveSpeed = 1.8;
        const waveT = t * waveSpeed;

        // Mobile: static ocean — no vertex animation at all
        const skipOcean = scene.userData._oceanStatic || (isMob && frameRef.current % 3 !== 0);
        if (oceanMesh && origArr && !skipOcean) {
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
            const height = wave * buildFactor * 0.18;

            // Forward surge: water pushes toward shore during wave crest
            const surge = wave * buildFactor * 0.12;

            arr[i] = origArr[i];
            arr[i + 1] = origArr[i + 1] + height;
            arr[i + 2] = origArr[i + 2] + surge;
          }
          pos.needsUpdate = true;
        }

        // ─── FOAM + SHORELINE GLOW — skip on mobile when far from beach ──
        const nearBeachAnim = pz > 8;
        if (!isMob || (nearBeachAnim && frameRef.current % 3 === 0)) {
          const foamMesh = scene.userData.foam;
          if (foamMesh?.material) {
            const tide = Math.sin(t * 0.55) * 0.5 + 0.5;
            foamMesh.material.opacity = 0.18 + tide * 0.55;
            foamMesh.position.z = scene.userData._foamBaseZ + tide * 0.7;
          }
          const shoreGlow = scene.userData.shoreGlow;
          if (shoreGlow?.material) {
            shoreGlow.material.opacity = 0.10;
            if (!scene.userData._cyanColor) { scene.userData._cyanColor = new Color("#00D4F0"); }
            shoreGlow.material.color.copy(scene.userData._cyanColor);
          }
        }

        // ── TV Smooth mode: skip non-essential pulse animations ──
        const tvSmooth = tvModeRef.current && tvQualityRef.current === "smooth";

        // ─── STAGE SCREEN GLOW — only animate when near stage on mobile ──
        const nearStageForGlow = pz < -8;
        if (!isMob || (nearStageForGlow && frameRef.current % 4 === 0)) {
          const screenGlowMesh = scene.getObjectByName("stageScreenGlow");
          if (screenGlowMesh?.material) {
            screenGlowMesh.material.opacity = 0.45 + audioBeat * 0.7 + (audioIntensityRef?.current || 0) * 0.3;
          }
          const loungeNeonMats = scene.userData.loungeNeonMats;
          if (loungeNeonMats && !tvSmooth) {
            const loungeWave = Math.sin(t * 2.5) * 0.15;
            for (const mat of loungeNeonMats) {
              if (mat?.opacity !== undefined) mat.opacity = Math.min(0.9, 0.4 + audioBeat * 0.6 + loungeWave);
            }
            const ll = scene.userData.loungeLight;
            if (ll) ll.intensity = 1.5 + audioBeat * 1.2;
          }
        }

        // ─── NEON SKYLINE PULSE — throttled on mobile, skipped in TV smooth ──
        const neonMats = scene.userData.neonMats;
        if (neonMats && (!isMob || frameRef.current % 3 === 0) && !tvSmooth) {
          const colorShift = Math.sin(t * 0.4) * 0.5 + 0.5;
          if (!scene.userData._neonC) {
            scene.userData._neonC = [new Color("#00D4F0"), new Color("#A078FF"), new Color("#40A0EE")];
            scene.userData._neonC2 = [new Color("#C43BFF"), new Color("#00E5FF"), new Color("#C43BFF")];
          }
          const nc = scene.userData._neonC, nc2 = scene.userData._neonC2;
          if (neonMats[0]) { neonMats[0].opacity = Math.max(0.5, 0.65 + audioBeat * 1.1 + Math.sin(t * 2.1) * 0.2); neonMats[0].color.copy(nc[0]).lerp(nc2[0], colorShift * 0.35); }
          if (neonMats[1]) { neonMats[1].opacity = Math.max(0.4, 0.55 + audioBeat * 0.9 + Math.sin(t * 1.5 + 1.2) * 0.25); neonMats[1].color.copy(nc[1]).lerp(nc2[1], colorShift * 0.4); }
          if (neonMats[2]) { neonMats[2].opacity = Math.max(0.45, 0.6 + audioBeat * 1.0 + Math.sin(t * 1.8 + 2.5) * 0.22); neonMats[2].color.copy(nc[2]).lerp(nc2[2], colorShift * 0.38); }
        }


        // Building window flickers removed — static windows for performance

        // ─── PLAZA FILL LIGHT — throttled on mobile ───────────
        if (!isMob || frameRef.current % 4 === 0) {
          const pf = scene.userData.plazaFill;
          if (pf) pf.intensity = 1.0 + audioBeat * 0.8 + Math.sin(t * 1.2) * 0.2;
        }

        // ─── SHIFTING NEON AMBIENT LIGHTS — throttled on mobile, skipped in TV smooth ──
        if ((!isMob || frameRef.current % 3 === 0) && !tvSmooth) {
          const neonAmbients = scene.userData.neonAmbients;
          if (neonAmbients) {
            for (const na of neonAmbients) {
              const wave = Math.sin(t * 0.35 + na.phase);
              na.light.intensity = na.baseI * (0.7 + wave * 0.3) + audioBeat * 0.4;
              const blend = wave * 0.5 + 0.5;
              na.light.color.copy(na.color1).lerp(na.color2, blend * 0.45);
            }
          }
        }

        // Distance flags — declared before any code that uses them
        const nearBeach = pz > 10;
        const nearDanceFloor = Math.sqrt(px * px + (pz + 13) * (pz + 13)) < 18;

        // Signs: billboard toward camera — every 6 frames on mobile, skip if far
        const updateSigns = !isMob || frameRef.current % 6 === 0;
        const updateZenPart = !isMob || (nearBeach && frameRef.current % 3 === 0);
        scene.children.forEach((child) => {
          if (child.userData?.isNeonSign) {
            if (updateSigns) {
              if (isMob) {
                const sdx = child.position.x - px, sdz = child.position.z - pz;
                if (sdx * sdx + sdz * sdz > 2025) return; // skip signs >45u away on mobile
              }
              child.lookAt(camera.position);
            }
          }
          if (updateZenPart && child.userData?.isZenParticle) {
            const p = child.userData;
            child.position.y = p.baseY + Math.sin(t * 1.2 + p.phase) * 0.15;
            child.position.x = p.baseX + Math.cos(t * 0.8 + p.phase) * 0.2;
            child.position.z = p.baseZ + Math.sin(t * 0.6 + p.phase) * 0.2;
          }
        });
        // Distance-gate zone animations on mobile — skip if player is far away
        if (!isMob || nearBeach || frameRef.current % 3 === 0) animateZenBeach(scene, t, audioBeat);
        // Dance floor — throttle to every 4 frames on mobile, only when near
        if (!isMob ? true : (nearDanceFloor && frameRef.current % 4 === 0)) animateDanceFloor(scene, t, audioBeat, audioIntensityRef?.current ?? 0);
        if (!isMob || frameRef.current % 3 === 0) animateCrystalZone(scene, t, dt, px, pz);
        if (!isMob || nearDanceFloor || frameRef.current % 3 === 0) animateJukebox(scene, t, audioBeat);

        // ── Hoverboard attach once GLB is ready (async GLB load race condition) ──
        if (hbRidingRef.current && avatarEntryRef.current && !avatarEntryRef.current._hbBoard) {
          attachHoverboard(avatarEntryRef.current);
        }

        // ── Hoverboard board glow animation ─────────────────────
        // IMPORTANT: never touch avatar.rotation.x — the controller root only ever
        // has rotation.y set (facing direction). Touching x/z breaks movement sync.
        if (hbRidingRef.current) {
          const hbBoard = avatarEntryRef.current?._hbBoard;
          if (hbBoard) {
            const stripeMat = hbBoard.userData.stripeMat;
            if (stripeMat) {
              stripeMat.opacity = 0.72 + audioBeat * 0.26 + Math.sin(t * 4.5) * 0.10;
              if (!scene.userData._hbC1) { scene.userData._hbC1 = new Color("#00E5FF"); scene.userData._hbC2 = new Color("#C43BFF"); }
              stripeMat.color.copy(scene.userData._hbC1).lerp(scene.userData._hbC2, Math.sin(t * 1.6) * 0.5 + 0.5);
            }
            if (hbBoard.userData.hoverDisc) {
              hbBoard.userData.hoverDisc.opacity = 0.14 + audioBeat * 0.22 + Math.sin(t * 3.0) * 0.07;
            }
            // Board tilts forward on speed, gently rolls when idle — rotation is LOCAL to board group only
            const spd = Math.sqrt(velocityRef.current.x ** 2 + velocityRef.current.z ** 2);
            hbBoard.rotation.x = spd > 0.3 ? -spd * 0.06 : Math.sin(t * 1.2) * 0.02;
            hbBoard.rotation.z = Math.sin(t * 0.85) * 0.015;
          }
        } else {
          // Ensure board rotation resets after detach
          const hbBoard = avatarEntryRef.current?._hbBoard;
          if (hbBoard) { hbBoard.rotation.x = 0; hbBoard.rotation.z = 0; }
        }
        // Distance-gate heavy zone animations on mobile
        const nearLaunch = Math.sqrt(px * px + (pz - 4) * (pz - 4)) < 20;
        const nearFerris = Math.sqrt((px - WHEEL_X) * (px - WHEEL_X) + (pz - WHEEL_Z) * (pz - WHEEL_Z)) < 28;
        if (!isMob || nearLaunch || frameRef.current % 4 === 0) animateLaunchZone(scene, t, audioBeat, dt);
        if (!isMob || nearFerris || frameRef.current % 4 === 0) animateHoverboardZone(scene, t, audioBeat);
        if (!isMob || ferrisRidingRef.current || nearFerris || frameRef.current % 6 === 0) animateFerrisWheel(scene, t, audioBeat, px, pz);

        // ── WATER SPLASH — hoverboard spray when rider is in the ocean zone ──
        const splash = splashParticlesRef.current;
        if (splash) {
          const { points, particles, pos } = splash;
          const inWater = hbRidingRef.current && pz > 34;
          const spd = Math.sqrt(vel.x * vel.x + vel.z * vel.z);
          const isMoving2 = spd > 0.3;

          // Emit new spray droplets every ~3 frames when in water and moving
          if (inWater && isMoving2 && frameRef.current % 3 === 0) {
            // Spread: fan behind the board (opposite of velocity direction)
            const emitCount = Math.min(3, Math.ceil(spd * 0.8));
            const emitted = particles.filter(p => p.life <= 0);
            let used = 0;
            for (const p of emitted) {
              if (used >= emitCount) break;
              // Behind the avatar: offset opposite to movement direction
              const bx = px - (vel.x / spd) * 0.4 + (Math.random() - 0.5) * 0.6;
              const bz = pz - (vel.z / spd) * 0.4 + (Math.random() - 0.5) * 0.6;
              const idx = particles.indexOf(p) * 3;
              pos[idx]     = bx;
              pos[idx + 1] = 0.05;
              pos[idx + 2] = bz;
              // Spray velocity: upward + sideways fan
              p.vx = (Math.random() - 0.5) * 1.8 - (vel.x / spd) * 0.5;
              p.vy = 0.8 + Math.random() * 1.2;
              p.vz = (Math.random() - 0.5) * 1.8 - (vel.z / spd) * 0.5;
              p.maxLife = 0.35 + Math.random() * 0.3;
              p.life = p.maxLife;
              used++;
            }
          }

          // Simulate all particles
          let anyAlive = false;
          for (let i = 0; i < particles.length; i++) {
            const p = particles[i];
            const idx = i * 3;
            if (p.life > 0) {
              p.life -= dt;
              pos[idx]     += p.vx * dt;
              pos[idx + 1] += p.vy * dt;
              pos[idx + 2] += p.vz * dt;
              p.vy -= 3.5 * dt; // gravity
              anyAlive = true;
            } else {
              // Park dead particles far away (invisible)
              pos[idx] = 9999; pos[idx + 1] = 9999; pos[idx + 2] = 9999;
            }
          }
          points.geometry.attributes.position.needsUpdate = true;
          // Fade opacity based on whether any particles are active
          const targetOpacity = anyAlive ? 0.75 : 0;
          points.material.opacity += (targetOpacity - points.material.opacity) * Math.min(1, 12 * dt);
        }

        // Reset orbs when new ride starts
        if (window.__hbResetRings) {
          window.__hbResetRings = false;
          resetOrbs(scene);
        }

        // ─── HOVERBOARD ORB COLLECTION — only while actively riding ──
        if (hbRidingRef.current && frameRef.current % 4 === 0) {
          const orbMeshes = scene.userData.hbOrbMeshes;
          if (orbMeshes) {
            for (const orb of orbMeshes) {
              if (orb.collected) continue;
              const od = BEACH_ORBS[orb.id];
              if (!od) continue;
              const dx = px - od.x, dz = pz - od.z;
              if (Math.sqrt(dx * dx + dz * dz) < 1.4) {
                collectOrb(scene, orb.id);
                if (window.__hbCollectOrb) window.__hbCollectOrb(orb.id);
              }
            }
          }
        }

        // ─── SPEED PAD DETECTION — temporary speed multiplier ────────
        if (hbRidingRef.current && frameRef.current % 6 === 0) {
          const nowMs = performance.now();
          for (const pad of BOOST_PADS) {
            const dx = px - pad.x, dz = pz - pad.z;
            if (Math.sqrt(dx * dx + dz * dz) < 1.5) {
              if (nowMs > speedBoostUntilRef.current) {
                // Grant 2.5s speed boost (3× normal speed)
                speedBoostUntilRef.current = nowMs + 2500;
                if (window.__hbBoostTriggered) window.__hbBoostTriggered();
              }
            }
          }
        }

        // ─── LAUNCH PAD DETECTION — air launch ───────────────────────
        if (hbRidingRef.current && frameRef.current % 6 === 0) {
          for (const pad of LAUNCH_PADS) {
            const dx = px - pad.x, dz = pz - pad.z;
            if (Math.sqrt(dx * dx + dz * dz) < 1.6) {
              if (!scene.userData._lastLaunchTime || performance.now() - scene.userData._lastLaunchTime > 3000) {
                scene.userData._lastLaunchTime = performance.now();
                // Trigger a mini launch arc via launchState (reuse existing launch system)
                const ls = launchStateRef.current;
                if (!ls.active) {
                  ls.active = true;
                  ls.phase = "rise";
                  ls.timer = 0;
                  ls.startY = py;
                }
                if (window.__hbLaunchTriggered) window.__hbLaunchTriggered();
              }
            }
          }
        }

        // ─── COSMIC SKY — skybox + starfield follow camera, planets/shooting stars/asteroids ──
        scene.userData._playerZ = pz;
        scene.userData._camPitch = camPitchSmoothRef.current; // pass live pitch for planet compensation
        animateCosmicSky(scene, camera, t, dt);

        // ─── Stage screen projection (for YouTube iframe overlay) ──────────
        // Use clientWidth/clientHeight (CSS pixels) NOT domElement width/height
        // (attribute pixels are scaled by devicePixelRatio on retina/mobile)
        if (stageScreenPosRef) {
          const ss = new Vector3(0, 3.5, -34.4);
          const proj = ss.clone().project(camera);
          const rw = renderer.domElement.clientWidth || renderer.domElement.width;
          const rh = renderer.domElement.clientHeight || renderer.domElement.height;
          const cx = (proj.x * 0.5 + 0.5) * rw;
          const cy = (-proj.y * 0.5 + 0.5) * rh;
          // Project corners for size (screen is 14×7 centered at y=3.5)
          const tl = new Vector3(-7.0, 7.0, -34.4).project(camera);
          const br = new Vector3(7.0, 0.0, -34.4).project(camera);
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
            // Spawn remote avatar using the same type they selected in the customizer
            const remoteAvatarType = remote.avatar_type || "current";
            const remoteIsMixamo = remoteAvatarType === "test-mixamo" || remoteAvatarType === "test-mixamo-female";
            const remoteIsTest   = remoteAvatarType === "test-male" || remoteAvatarType === "test-female";
            let group;
            if (remoteIsMixamo) {
              const remoteGender = remoteAvatarType === "test-mixamo-female" ? "female" : "male";
              // createMixamoAvatar returns an entry object; we need the root Group
              const remoteEntry = createMixamoAvatar(scene, {
                spawnX: remote.pos_x || 0, spawnY: SPAWN[1], spawnZ: remote.pos_z || 0,
                gender: remoteGender,
                hairStyle: remoteGender === "female" ? "ponytail" : "short",
                outfitColorKey: remote.avatar_outfit_color || null,
                skinToneKey: remote.skin_tone || "medium",
                username: remote.username || "User",
                isRemote: true,
              }, () => {});
              group = remoteEntry.root;
              group.name = `remote_${remote.user_id}`;
              group.userData.userId = remote.user_id;
              group.userData._avatarEntry = remoteEntry;
            } else if (remoteIsTest) {
              const remoteGender = remoteAvatarType === "test-female" ? "female" : "male";
              const remoteEntry = createTestAvatar(scene, remoteGender, { username: remote.username || "User" }, () => {});
              group = remoteEntry.root;
              group.name = `remote_${remote.user_id}`;
              group.userData.userId = remote.user_id;
              group.userData._avatarEntry = remoteEntry;
            } else {
              // Default: original Soldier GLB avatar
              group = createRemoteAvatar(
                scene, remote.user_id,
                remote.username || "User",
                remote.avatar_type || "neutral",
                remote.skin_tone || "medium",
                remote.avatar_style || "streetwear"
              );
            }
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

          // ─── Remote avatar animation — use correct system per type ──
          const remoteEntry = g.userData._avatarEntry;
          if (remoteEntry) {
            if (remoteEntry._isMixamo) {
              updateMixamoAvatarAnimation(remoteEntry, vel * 15, false, dt, false, null);
            } else if (remoteEntry._isTestAvatar) {
              updateTestAvatarAnimation(remoteEntry, vel * 15, false, dt);
            } else {
              updateAvatarAnimation(remoteEntry, vel * 15, false, dt);
            }
          }
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
        window.removeEventListener("crystalActivate", onCrystalActivate);
        renderer.dispose();
        scene.traverse((obj) => {
          if (obj.geometry) obj.geometry.dispose();
          if (obj.material) {
            if (Array.isArray(obj.material)) obj.material.forEach((m) => m.dispose());
            else obj.material.dispose();
          }
        });
        // Detach hoverboard on unmount
        if (avatarEntryRef.current) detachHoverboard(avatarEntryRef.current);
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

  // Hoverboard attach/detach; ferris ride hides avatar to avoid blocking ride-cam view
  useEffect(() => {
    const entry = avatarEntryRef.current;
    if (hbRiding) { if (entry) attachHoverboard(entry); }
    else { if (entry) detachHoverboard(entry); }
  }, [hbRiding]);
  useEffect(() => {
    // When ride ends, restore avatar visibility. When riding, the animation loop
    // hides it every frame (handles late GLB loads gracefully).
    if (!ferrisRiding && avatarRef.current) {
      avatarRef.current.visible = true;
    }
  }, [ferrisRiding]);

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