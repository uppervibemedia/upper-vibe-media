import React, { useRef, useEffect, useState, useCallback } from "react";
import * as THREE from "three";
import { SPAWN, TREE_POSITIONS, PARK_RADIUS } from "./cityData";
import createCitySkyline from "./CitySkyline";
import createUpperVibeShop, { animateShop } from "./UpperVibeShop";
import { createFerrisWheel, animateFerrisWheel, WHEEL_X, WHEEL_Z, WHEEL_RADIUS, WHEEL_HUB_Y, getCabinWorldPosition, getBoardingPosition, getRiderCameraTransform } from "./FerrisWheel";
import createZenBeach, { animateZenBeach } from "./ZenBeach";
import { addDanceFloor, animateDanceFloor } from "./DanceFloor";
import { createJukebox, animateJukebox, JUKEBOX_POS, JUKEBOX_INTERACT_RADIUS, DANCE_FLOOR_RADIUS } from "./Jukebox";

import { createHoverboardZone, animateHoverboardZone, flashRing, resetRings, collectOrb, resetOrbs, HOVERBOARD_START, HOVERBOARD_INTERACT_RADIUS, HOVERBOARD_RINGS, BEACH_ORBS, BOOST_PADS, LAUNCH_PADS } from "./HoverboardRingRun";
import { createCrystalZone, animateCrystalZone, CRYSTAL_ZONE_X, CRYSTAL_ZONE_Z } from "./CrystalZone";
// Sky system and avatar — must be at top of file, not mid-file
import { createCosmicSky, animateCosmicSky } from "./CosmicSkySystem";
import { createAvatar, createRemoteAvatar, updateAvatarAnimation, retintAvatar, attachHoverboard, detachHoverboard } from "./AvatarModel.jsx";
import { createTestAvatar, updateTestAvatarAnimation, retintTestAvatar } from "./AvatarModelTest";
import { createMixamoAvatar, updateMixamoAvatarAnimation, retintMixamoAvatar } from "./AvatarModelMixamo";
import { createZoneSign } from "./ZoneSign";
import { bindAura, unbindAura, animateAura } from "./AuraGlow";
import { buildMusicStageZone }     from "./city-engine/zones/MusicStageZone";
import { buildVibeLoungeZone }     from "./city-engine/zones/VibeLoungeZone";
import { buildMusicLibraryZone }   from "./city-engine/zones/MusicLibraryZone";
import { buildVisualizerDomeZone } from "./city-engine/zones/VisualizerDomeZone";
import { buildDailyVibeCheckZone } from "./city-engine/zones/DailyVibeCheckZone";
import { buildVibeAcademyZone }    from "./city-engine/zones/VibeAcademyZone";
import { runConnections, tickAddOns, KEYS_CREATED } from "./CityAddOns";
import { MOVEMENT_BRIDGE } from "./city-engine/LaunchRide";


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
  SpriteMaterial,
  Sprite,
  CanvasTexture,
  LinearFilter,
} = THREE;

// ─── CONSTANTS ────────────────────────────────────────────────
const MOVE_SPEED = 7.8;
const PERSONAL_HOVERBOARD_SPEED_MULTIPLIER = 1.5;
const HOVERBOARD_JUMP_FORCE = 9.8;
const HOVERBOARD_JUMP_GRAVITY = -18;
const HOVERBOARD_MAX_JUMP_HEIGHT = 4.2;
const HOVERBOARD_JUMP_COOLDOWN = 1.2;
const HOVERBOARD_AIR_CONTROL_MULTIPLIER = 0.65;
const ACCELERATION = 36.0; // quick response without mobile/low-quality slowdown
const DECELERATION = 24.0; // quick stop without feeling sticky
const TURN_SPEED = 2.5;       // radians/sec for A/D turning
const ROTATION_SMOOTH = 22.0; // responsive body rotation toward travel direction

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
function getCityQuality() {
  const ua = navigator.userAgent || "";
  const isIOS = /iPhone|iPad|iPod/i.test(ua);
  const isMobile = isIOS || /Android/i.test(ua);
  const smallScreen = Math.min(window.innerWidth || 9999, window.innerHeight || 9999) < 760;
  const lowMemory = navigator.deviceMemory && navigator.deviceMemory <= 4;
  const isPWA = window.matchMedia?.("(display-mode: standalone)")?.matches || window.navigator?.standalone === true;
  const qualityLevel = (isIOS || isMobile || smallScreen || lowMemory) ? "mobile" : "high";
  return {
    isIOS,
    isMobile,
    isPWA,
    smallScreen,
    lowMemory,
    qualityLevel,
    currentLevel: qualityLevel,
    pixelRatio: qualityLevel === "mobile" ? (isIOS ? 1.05 : 1.15) : 1.65,
    farClip: qualityLevel === "mobile" ? 112 : 155,
    antialias: qualityLevel === "high",
    shadowMapSize: qualityLevel === "mobile" ? 384 : 1024,
    nearDistance: qualityLevel === "mobile" ? 18 : 22,
    mediumDistance: qualityLevel === "mobile" ? 34 : 42,
  };
}

function disposeMaterialDeep(material) {
  if (!material) return;
  const mats = Array.isArray(material) ? material : [material];
  mats.forEach((m) => {
    if (!m) return;
    Object.keys(m).forEach((key) => {
      const value = m[key];
      if (value?.isTexture) value.dispose();
    });
    m.dispose?.();
  });
}

const STREAM_ZONES = [
  { key: "stage", names: ["musicStage", "stageScreenGlow"], x: 0, z: -32, keepVisible: true },
  { key: "lounge", names: ["vibeLounge"], x: -22, z: -26, keepVisible: true },
  { key: "music_library", names: ["musicLibrary"], x: 22, z: -20, keepVisible: true },
  { key: "visualizer", names: ["visualizerDome", "domePortalGlow"], x: -13, z: 10, keepVisible: true },
  { key: "vibe_check", names: ["dailyVibeCheck", "vibeMirrorGroup"], x: -16, z: -13, keepVisible: true },
  { key: "academy", names: ["upperVibeAcademy", "academyEntrance"], x: -28, z: 5, keepVisible: true },
  { key: "crystal", names: ["crystalZone"], x: CRYSTAL_ZONE_X, z: CRYSTAL_ZONE_Z, keepVisible: true },
  { key: "ferris", names: ["ferrisWheel"], x: WHEEL_X, z: WHEEL_Z, keepVisible: true },
  { key: "beach", names: ["hbPadRing"], x: 18, z: 22, keepVisible: true },
  { key: "skyline", names: ["cityBuildings"], x: 0, z: -36, keepVisible: true },
];

function classifyZoneQuality(px, pz, zx, zz, quality) {
  const dx = px - zx, dz = pz - zz;
  const d = Math.sqrt(dx * dx + dz * dz);
  if (d < quality.nearDistance) return { level: "full", distance: d };
  if (d < quality.mediumDistance) return { level: "medium", distance: d };
  return { level: "low", distance: d };
}

function cacheStreamingObjects(scene) {
  const zones = STREAM_ZONES.map((zone) => ({ ...zone, objects: [] }));
  scene.traverse((obj) => {
    for (const zone of zones) {
      if (zone.names.includes(obj.name)) zone.objects.push(obj);
    }
  });
  scene.userData._streamZones = zones;
}

function updateZoneStreaming(scene, px, pz, quality, frame) {
  const zones = scene.userData._streamZones || [];
  const zoneState = {};
  const mobileLike = quality.currentLevel !== "high";
  for (const zone of zones) {
    const { level, distance } = classifyZoneQuality(px, pz, zone.x, zone.z, quality);
    zoneState[zone.key] = level;
    for (const obj of zone.objects) {
      if (!obj) continue;
      obj.userData._zoneQuality = level;
      // Keep layouts present. Only hide far decorative particle systems on low quality.
      if (mobileLike && level === "low" && (obj.isPoints || obj.name?.includes("Particles"))) obj.visible = false;
      else obj.visible = true;
    }
  }
  scene.userData._loadedZoneState = zoneState;
  scene.userData._activeQualityLevel = quality.currentLevel;
}

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
const BEACH_SHORELINE_Z = 32; // sand meets the ocean here

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

  // Beach shoreline / ocean boundary — walking stays on sand; hoverboard free-ride can still launch over water.
  const maxZ = isHoverboarding ? 75 : BEACH_SHORELINE_Z - r;
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
export function buildPark(scene) {
  createCosmicSky(scene);
  createCitySkyline(scene);

  const SHORELINE_Z = 32;
  const OCEAN_DEPTH = 54;

  // ═════════════════════════════════════════════════════════════
  // 1. GROUND — dark urban plaza floor
  // ═════════════════════════════════════════════════════════════
  const groundGeo = new PlaneGeometry(84, 64);
  const groundMat = mat("#080C1A", { roughness: 0.45, metalness: 0.25 });
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
    mat("#131A30", { roughness: 0.3, metalness: 0.35 })
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
  // 4–8.5: ZONES — extracted to separate files
  // ═════════════════════════════════════════════════════════════
  buildMusicStageZone(scene);
  buildVibeLoungeZone(scene);
  buildMusicLibraryZone(scene);
  buildVisualizerDomeZone(scene);
  buildDailyVibeCheckZone(scene);
  buildVibeAcademyZone(scene);

  // ═════════════════════════════════════════════════════════════
  // 8.5.5 CRYSTAL ZONE — east-side destination between Library and Vibe Wheel
  // ═════════════════════════════════════════════════════════════
  const crystalPathMat = new MeshBasicMaterial({ color: new Color("#6C3CFF"), transparent: true, opacity: 0.16, depthWrite: false, side: THREE.DoubleSide });
  const crystalPathA = new Mesh(new PlaneGeometry(Math.max(2, Math.abs(CRYSTAL_ZONE_X - 4)), 2.2), crystalPathMat.clone());
  crystalPathA.rotation.x = -Math.PI / 2;
  crystalPathA.position.set((CRYSTAL_ZONE_X + 4) / 2, 0.012, CRYSTAL_ZONE_Z);
  crystalPathA.renderOrder = 1;
  scene.add(crystalPathA);
  const crystalPathB = new Mesh(new PlaneGeometry(2.2, Math.max(2, Math.abs(CRYSTAL_ZONE_Z - PLAZA_Z))), crystalPathMat.clone());
  crystalPathB.rotation.x = -Math.PI / 2;
  crystalPathB.position.set(4, 0.013, (CRYSTAL_ZONE_Z + PLAZA_Z) / 2);
  crystalPathB.renderOrder = 1;
  scene.add(crystalPathB);
  createCrystalZone(scene);
  createNeonSign(scene, CRYSTAL_ZONE_X, 3.2, CRYSTAL_ZONE_Z, "CRYSTAL  ZONE", "#AA66FF");

  // ═════════════════════════════════════════════════════════════
  // 8.6. ZEN BEACH — meditation zone, left-side beach area
  // ═════════════════════════════════════════════════════════════
  createZenBeach(scene, PLAZA_X, PLAZA_Z);

  // ═════════════════════════════════════════════════════════════
  // 8.65. UPPER VIBE SHOP — central plaza storefront
  // ═════════════════════════════════════════════════════════════
  const shopGroup = createUpperVibeShop(scene, [0, 0, 10]);
  if (shopGroup) shopGroup.rotation.y = Math.PI; // face toward player spawn
  scene.userData.shopGroup = shopGroup;

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

  // 10. BEACH — one connected tan sand strip for Zen Beach + Neon Surf Beach
  // Runs from the city-side beach walk to the ocean edge without disconnected patches.
  const beachGeo = new PlaneGeometry(92, 24);
  const beach = new Mesh(beachGeo, mat("#D2B48C", { roughness: 0.88, metalness: 0.0 }));
  beach.rotation.x = -Math.PI / 2;
  beach.position.set(0, 0.001, 20);
  beach.receiveShadow = true;
  beach.name = "beach";
  scene.add(beach);

  // Beach chairs removed — hoverboard course uses this space

  // 11. OCEAN — mobile: flat static low-poly mesh; desktop: animated high-poly
  const isMobScene = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
  const oceanWidth = 92;
  const oceanGeo = new PlaneGeometry(oceanWidth, OCEAN_DEPTH, isMobScene ? 4 : 56, isMobScene ? 4 : 54);
  const oceanMat = new MeshBasicMaterial({ color: new Color(isMobScene ? "#204468" : "#284A78"), side: THREE.DoubleSide });
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
  foamMeshMat.opacity = 0.5;
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
  shoreGlowMat.opacity = 0.2;
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
  // Moonlight — cool blue, casts shadows but keeps the city dark at night
  const moon = new DirectionalLight();
  moon.color = new Color("#8899CC");
  moon.intensity = 0.5;
  moon.position.set(15, 22, SHORELINE_Z + 10);
  moon.castShadow = true;
  moon.shadow.mapSize.width = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) ? 512 : 1024;
    moon.shadow.mapSize.height = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) ? 512 : 1024;
  moon.shadow.camera.near = 0.5;
  moon.shadow.camera.far = 100;
  moon.shadow.camera.left = -55;
  moon.shadow.camera.right = 55;
  moon.shadow.camera.top = 48;
  moon.shadow.camera.bottom = -48;
  moon.shadow.bias = -0.0006;
  scene.add(moon);

  // Dark night ambient — keeps the skyline pitch-black, neon stays punchy
  const ambLight = new AmbientLight();
  ambLight.color = new Color("#384490");
  ambLight.intensity = 0.55;
  scene.add(ambLight);

  // Deep purple-blue hemisphere — evening sky top, dark ground floor
  const hemiLight = new HemisphereLight();
  hemiLight.color = new Color("#574A99");
  hemiLight.groundColor = new Color("#0E1228");
  hemiLight.intensity = 0.5;
  scene.add(hemiLight);

  // ── BEACH LIGHTING — softer neon wash, keeps the nighttime mood ──
  const beachLight = new PointLight();
  beachLight.color = new Color("#B0D8F0");
  beachLight.intensity = 2.0;
  beachLight.distance = 42;
  beachLight.position.set(0, 4, SHORELINE_Z + 6);
  scene.add(beachLight);

  // Soft lavender fills from above-left and above-right
  const beachSunL = new PointLight();
  beachSunL.color = new Color("#B080F0");
  beachSunL.intensity = 1.5;
  beachSunL.distance = 36;
  beachSunL.position.set(-18, 5, SHORELINE_Z + 8);
  scene.add(beachSunL);

  const beachSunR = new PointLight();
  beachSunR.color = new Color("#A060F0");
  beachSunR.intensity = 1.5;
  beachSunR.distance = 36;
  beachSunR.position.set(18, 5, SHORELINE_Z + 8);
  scene.add(beachSunR);

  // Ocean reflection — cool blue-cyan shimmer on the water surface
  const oceanReflect = new PointLight();
  oceanReflect.color = new Color("#40D4FF");
  oceanReflect.intensity = 1.8;
  oceanReflect.distance = 28;
  oceanReflect.position.set(0, 2, SHORELINE_Z + 20);
  scene.add(oceanReflect);

  // ── Plaza fill light — soft central neon wash ──────────────────
  const plazaFill = new PointLight();
  plazaFill.color = new Color("#8888DD");
  plazaFill.intensity = 1.8;
  plazaFill.distance = 18;
  plazaFill.position.set(0, 1.5, -13);
  scene.add(plazaFill);
  scene.userData.plazaFill = plazaFill;

  // ── Shifting neon ambient lights — 2 on mobile, 4 on desktop ──
  const _isMobLights = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
  const _allNeonAmb = [
    { pos: [8,  3.5, -20], color: new Color("#0088FF"), distance: 20, phase: 0.0, baseI: 1.6 },
    { pos: [-8, 3.5, -20], color: new Color("#7C3AED"), distance: 20, phase: 1.6, baseI: 1.6 },
    { pos: [0,  4.0,   8], color: new Color("#00C8E8"), distance: 18, phase: 3.1, baseI: 1.4 },
    { pos: [0,  3.5, -30], color: new Color("#9B4FFF"), distance: 16, phase: 4.7, baseI: 1.2 },
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
export default function CityCanvas({ onLoaded, onPositionChange, onRemoteAvatarClick, stageCanvas, audioIntensityRef, audioBassRef, audioBeatRef, locked, stageScreenPosRef, remoteUsers, isDancing = false, activeEmote = null, avatarConfig, onJukeboxProximity, retintRef, djTrack, hbRiding = false, isPlayingNeonSurf = false, personalHoverboardActive = false, hoverboardJumpRequest = null, ferrisRiding = false, spawnOverride = null, moveTarget = null, rendererRef = null, tvMode = false, tvQuality = "smooth", auraActive = false, equippedAura = null, ...props }) {
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
  // Avatar faces camera on spawn: camera is at +Z, avatar faces +Z = rotation 0
  const avatarPosRef = useRef([...effectiveSpawn, 0]); // [x, y, z, rotY]
  const stageCanvasRef = useRef(null);
  stageCanvasRef.current = stageCanvas;
  const velocityRef = useRef({ x: 0, z: 0 });
  // Spawn near Vibe Check: avatar faces toward (-16,-13) from (-10,-4)
  // angle = atan2(-16 - -10, -13 - -4) = atan2(-6, -9) ≈ -2.55 rad (NW direction)
  const SPAWN_AVATAR_ROT = -2.55;
  const avatarRotRef = useRef(spawnOverride?.rot !== undefined ? spawnOverride.rot : SPAWN_AVATAR_ROT);
  const keysRef = useRef({});
  const mouseRef = useRef({ down: false, dx: 0, dy: 0, button: 0 });
  // Camera: yaw = angle of camera around avatar (0 = directly behind)
  // camYaw is independent of avatar rotation; avatar rotation is avatarRotRef
  // Third-person camera: camYaw is WORLD-SPACE absolute angle (not relative to avatar)
  // 0 = camera looks from +Z toward avatar (south), increases clockwise
  // Spawn near Vibe Check: avatar faces toward (-16,-13) from (-10,-4) → angle ≈ -2.5 rad (NW)
  // Camera sits opposite (SE), camYaw = avatar.rot + π ≈ -2.5+π ≈ 0.64 rad
  const SPAWN_CAM_YAW = 0.64;
  const camYawRef = useRef(SPAWN_CAM_YAW);
  const camYawSmoothRef = useRef(SPAWN_CAM_YAW);
  const camPitchRef = useRef(0.08);    // slight upward default
  const camPitchSmoothRef = useRef(0.08);
  const userTouchingCamRef = useRef(false); // right-click or cam drag active
  const remoteAvatarsRef = useRef({}); // userId → { group, prevPos }
  const remoteHbStateRef = useRef({}); // userId → { hasAura, hasHoverboard, isRiding }
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
  const isPlayingNeonSurfRef = useRef(false);
  isPlayingNeonSurfRef.current = isPlayingNeonSurf;
  const personalHoverboardActiveRef = useRef(false);
  personalHoverboardActiveRef.current = personalHoverboardActive;
  const ferrisRidingRef = useRef(false);
  ferrisRidingRef.current = ferrisRiding;
  const equippedAuraRef = useRef(null);
  const prevEquippedAuraRef = useRef(null);
  equippedAuraRef.current = equippedAura;
  const danceFloorFrameRefRef = useRef(props.danceFloorFrameRef);
  danceFloorFrameRefRef.current = props.danceFloorFrameRef;
  const pendingHoverboardJumpRef = useRef(false);
  const hoverboardJumpOffsetRef = useRef(0);
  const hoverboardVerticalVelocityRef = useRef(0);
  const hoverboardJumpingRef = useRef(false);
  const lastHoverboardJumpTimeRef = useRef(-999);
  const hoverboardLandingBounceRef = useRef(0);

  useEffect(() => {
    if (hoverboardJumpRequest?.id) pendingHoverboardJumpRef.current = true;
  }, [hoverboardJumpRequest?.id]);

  useEffect(() => {
    if (!moveTarget) return;
    const x = Number(moveTarget.x);
    const z = Number(moveTarget.z);
    if (!Number.isFinite(x) || !Number.isFinite(z)) return;
    const y = SPAWN[1];
    const rot = Number.isFinite(Number(moveTarget.rot)) ? Number(moveTarget.rot) : 0;
    avatarPosRef.current = [x, y, z, rot];
    avatarRotRef.current = rot;
    velocityRef.current = { x: 0, z: 0 };
    mobileInputRef.current = { x: 0, y: 0, camDx: 0, camDy: 0 };
    const avatar = avatarRef.current;
    if (avatar) {
      avatar.position.set(x, y, z);
      avatar.rotation.y = rot;
    }
    const camera = cameraRef.current;
    if (camera) {
      const isLandscape = isMobileRef.current && window.innerWidth > window.innerHeight;
      const camDist = isLandscape ? CAM_DIST_LS : CAM_DIST;
      const camHeight = isLandscape ? CAM_HEIGHT_LS : CAM_HEIGHT;
      const camLookY = isLandscape ? CAM_LOOK_Y_LS : CAM_LOOK_Y;
      const yaw = rot + Math.PI;
      camYawRef.current = yaw;
      camYawSmoothRef.current = yaw;
      camera.position.set(x + Math.sin(yaw) * camDist, y + camHeight, z + Math.cos(yaw) * camDist);
      camera.lookAt(x, y + camLookY, z);
    }
    try { onPosCbRef.current?.(x, z, rot); } catch {}
  }, [moveTarget?.id]);

  const activeEmoteRef = useRef(null);
  activeEmoteRef.current = activeEmote;
  const lastTimeRef = useRef(0);
  const frameRef = useRef(0);
  const initializedRef = useRef(false);
  // Launch is handled by LaunchRide (tickAddOns via MOVEMENT_BRIDGE)
  const speedBoostUntilRef = useRef(0); // timestamp (performance.now) when boost expires
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

      const quality = getCityQuality();
      const isMob = quality.isMobile;
      isMobileRef.current = isMob;
      const renderer = new WebGLRenderer({
        canvas,
        antialias: quality.antialias,
        powerPreference: isMob ? "low-power" : "high-performance",
      });
      renderer.setClearColor(0x0A1020); // Deep navy void — bright neon night
      if (rendererRef) rendererRef.current = renderer;
      // Cap pixel ratio — lower on iOS/mobile to reduce WebGL memory and heat.
      const basePR = Math.min(window.devicePixelRatio || 1, quality.pixelRatio);
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
      // Expose scene globally so HoverboardPanel can look up coin values
      window.__hbScene = scene;
      // CityAddOns: create visual shop + launch pads (inert, no logic)
      runConnections(scene, audioIntensityRef);

      const asp = rw / Math.max(rh, 1);
      // Reduce far clip on mobile — less geometry enters view when turning, fewer draw calls
      // Far clip: planets are camera-relative at radius=55 — must be > 55+margin.
      // Stars (Points) also follow camera at r≈105 — must be > 105. Use 130 for both.
      const camera = new PerspectiveCamera(52, asp, 0.1, quality.farClip);
      cameraRef.current = camera;
      // Spawn in the central plaza (outside dance floor), avatar faces -Z toward the city.
      // camYaw=0 → camera is at +Z behind avatar → avatar faces -Z. Correct.
      const [spX, spY, spZ] = effectiveSpawn;
      const spawnLS = isMob && window.innerWidth > window.innerHeight;
      camera.fov = spawnLS ? FOV_LANDSCAPE : FOV_PORTRAIT;
      camera.updateProjectionMatrix();
      const spCamDist = spawnLS ? CAM_DIST_LS : CAM_DIST;
      const spCamH    = spawnLS ? CAM_HEIGHT_LS : CAM_HEIGHT;
      const spLookY   = spawnLS ? CAM_LOOK_Y_LS : CAM_LOOK_Y;
      // Spawn near Vibe Check (-16, -13). Camera sits behind avatar on +X/+Z side,
      // looking toward Vibe Check zone so it's visible immediately on entry.
      // camYaw will be set to point camera from +X/+Z toward avatar facing -X/-Z.
      camera.position.set(spX + spCamDist * 0.7, spY + spCamH, spZ + spCamDist * 0.7);
      camera.lookAt(spX, spY + spLookY, spZ); // look at avatar; Vibe Check is ahead of avatar

      buildPark(scene);
      scene.userData._cityQuality = quality;
      const cachedNeonSigns = [];
      scene.traverse((obj) => {
        if (obj.userData?.isNeonSign) cachedNeonSigns.push(obj);
      });
      scene.userData._neonSigns = cachedNeonSigns;
      cacheStreamingObjects(scene);
      updateZoneStreaming(scene, effectiveSpawn[0], effectiveSpawn[2], quality, 0);


      // Crystal Zone is decorative-only — no activation event needed

      // Avatar rim light — stronger cool-blue rim so characters pop against the dark ground
      const avatarRimLight = new PointLight();
      avatarRimLight.color = new Color("#8899DD");
      avatarRimLight.intensity = 1.2;
      avatarRimLight.distance = 10;
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
        if (dt > 0.1) dt = 0.1; // Keep FPS tracking honest after tab resumes
        if (dt <= 0) dt = 0.016;
        const moveDt = Math.min(dt, 0.033); // movement/turning never consumes lag spikes

        // ── Adaptive quality + TV Mode pixel ratio control ──
        if (!quality._fpsSamples) quality._fpsSamples = [];
        quality._fpsSamples.push(1 / dt);
        if (quality._fpsSamples.length > 180) quality._fpsSamples.shift();
        if (frameRef.current % 120 === 0) {
          const avgFps = quality._fpsSamples.reduce((a, b) => a + b, 0) / Math.max(1, quality._fpsSamples.length);
          if (avgFps < 24 && quality.currentLevel !== "low") quality.currentLevel = "low";
          else if (avgFps < 34 && quality.currentLevel === "high") quality.currentLevel = "medium";
          const isTv = tvModeRef.current;
          const isSmooth = tvQualityRef.current === "smooth";
          const adaptiveCap = quality.currentLevel === "low" ? 0.9 : quality.currentLevel === "mobile" ? quality.pixelRatio : quality.currentLevel === "medium" ? 1.25 : quality.pixelRatio;
          const targetPR = isTv && isSmooth
            ? Math.min(window.devicePixelRatio, 1.05)
            : Math.min(window.devicePixelRatio || 1, adaptiveCap);
          if (Math.abs(renderer.getPixelRatio() - targetPR) > 0.05) {
            renderer.setPixelRatio(targetPR);
          }
          scene.userData._activeQualityLevel = quality.currentLevel;
        }

        const t = now;
        const keys = keysRef.current;
        const mouse = mouseRef.current;
        let [px, py, pz] = avatarPosRef.current;
        let rot = avatarRotRef.current;
        const vel = velocityRef.current;

        const jumpEnabled = personalHoverboardActiveRef.current && hbRidingRef.current && !isPlayingNeonSurfRef.current && !ferrisRidingRef.current && !lockedRef.current && !window.__lr_flying;
        const jumpGrounded = hoverboardJumpOffsetRef.current <= 0.001 && !hoverboardJumpingRef.current;
        if (pendingHoverboardJumpRef.current) {
          if (jumpEnabled && jumpGrounded && t - lastHoverboardJumpTimeRef.current >= HOVERBOARD_JUMP_COOLDOWN) {
            hoverboardVerticalVelocityRef.current = HOVERBOARD_JUMP_FORCE;
            hoverboardJumpingRef.current = true;
            hoverboardLandingBounceRef.current = 0.18;
            lastHoverboardJumpTimeRef.current = t;
          }
          pendingHoverboardJumpRef.current = false;
        }
        if (jumpEnabled || hoverboardJumpOffsetRef.current > 0) {
          if (hoverboardJumpingRef.current || hoverboardJumpOffsetRef.current > 0) {
            hoverboardVerticalVelocityRef.current += HOVERBOARD_JUMP_GRAVITY * moveDt;
            hoverboardJumpOffsetRef.current += hoverboardVerticalVelocityRef.current * moveDt;
            if (hoverboardJumpOffsetRef.current > HOVERBOARD_MAX_JUMP_HEIGHT) {
              hoverboardJumpOffsetRef.current = HOVERBOARD_MAX_JUMP_HEIGHT;
              hoverboardVerticalVelocityRef.current = Math.min(0, hoverboardVerticalVelocityRef.current);
            }
            if (hoverboardJumpOffsetRef.current <= 0) {
              hoverboardJumpOffsetRef.current = 0;
              hoverboardVerticalVelocityRef.current = 0;
              hoverboardJumpingRef.current = false;
              hoverboardLandingBounceRef.current = Math.max(hoverboardLandingBounceRef.current, 0.12);
            }
          }
        } else {
          hoverboardJumpOffsetRef.current = 0;
          hoverboardVerticalVelocityRef.current = 0;
          hoverboardJumpingRef.current = false;
        }
        if (hoverboardLandingBounceRef.current > 0) {
          hoverboardLandingBounceRef.current *= Math.max(0, 1 - moveDt * 8);
        }
        const hoverboardAirborne = hoverboardJumpOffsetRef.current > 0.03;

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
             const turnSpeed = 16.0;
             rot += rotDiff * Math.min(1, turnSpeed * moveDt);
           }
        } else {
          // Desktop: WASD movement is camera-relative, and the avatar faces the exact travel direction.
          if (!scene.userData._moveVecs) {
            scene.userData._moveVecs = {
              cameraForward: new Vector3(),
              cameraRight: new Vector3(),
              moveDir: new Vector3(),
              up: new Vector3(0, 1, 0),
            };
          }
          const { cameraForward, cameraRight, moveDir, up } = scene.userData._moveVecs;
          camera.getWorldDirection(cameraForward);
          cameraForward.y = 0;
          if (cameraForward.lengthSq() > 0) cameraForward.normalize();

          cameraRight.crossVectors(cameraForward, up);
          if (cameraRight.lengthSq() > 0) cameraRight.normalize();

          moveDir.set(0, 0, 0);
          if (inputFwd > 0) moveDir.add(cameraForward);
          if (inputFwd < 0) moveDir.sub(cameraForward);
          if (inputStrafe > 0) moveDir.add(cameraRight);
          if (inputStrafe < 0) moveDir.sub(cameraRight);

          if (moveDir.lengthSq() > 0) {
            moveDir.normalize();
            moveX = moveDir.x;
            moveZ = moveDir.z;

            const targetYaw = Math.atan2(moveDir.x, moveDir.z);
            let rotDiff = targetYaw - rot;
            while (rotDiff > Math.PI) rotDiff -= Math.PI * 2;
            while (rotDiff < -Math.PI) rotDiff += Math.PI * 2;
            rot += rotDiff * Math.min(1, ROTATION_SMOOTH * moveDt);
          }
        }

        if (isMoving) {
          const boosting = hbRidingRef.current && performance.now() < speedBoostUntilRef.current;
          const usingPersonalBoard = personalHoverboardActiveRef.current && !isPlayingNeonSurfRef.current;
          const personalHoverboardSpeed = MOVE_SPEED * PERSONAL_HOVERBOARD_SPEED_MULTIPLIER;
          const airControl = hoverboardAirborne ? HOVERBOARD_AIR_CONTROL_MULTIPLIER : 1;
          const baseRideSpeed = (usingPersonalBoard ? personalHoverboardSpeed : MOVE_SPEED) * airControl;
          const targetSpeed = Math.abs(inputFwd) > 0.08 || Math.abs(inputStrafe) > 0.08
            ? (boosting ? MOVE_SPEED * 3.0 : baseRideSpeed)
            : 0;
          vel.x += (moveX * targetSpeed - vel.x) * Math.min(1, ACCELERATION * moveDt);
          vel.z += (moveZ * targetSpeed - vel.z) * Math.min(1, ACCELERATION * moveDt);
        } else {
          vel.x += (0 - vel.x) * Math.min(1, DECELERATION * moveDt);
          vel.z += (0 - vel.z) * Math.min(1, DECELERATION * moveDt);
        }

        // Apply velocity
        const speed = Math.sqrt(vel.x * vel.x + vel.z * vel.z);
        px += vel.x * moveDt;
        pz += vel.z * moveDt;

        // Collisions
        [px, pz] = resolveCollisions(px, pz, 0.3, COLLISION_BOXES, hbRidingRef.current);

        // ── Launch arc handled by LaunchRide (tickAddOns via MOVEMENT_BRIDGE) ──
        // Step-on city pads auto-launch walking AND hoverboard riders.
        const hbLift = hbRidingRef.current ? (0.18 + Math.sin(t * 3.0) * 0.04) : 0;
        py = window.__lr_flying ? MOVEMENT_BRIDGE.py : SPAWN[1] + hbLift + hoverboardJumpOffsetRef.current;

        avatarRotRef.current = rot;
        avatarPosRef.current = [px, py, pz, rot];
        // ── Every-frame dance floor ref (bypasses throttled onPositionChange) ──
        const dfRef = danceFloorFrameRefRef.current;
        if (dfRef) {
          dfRef.x = px;
          dfRef.z = pz;
          const dfDx = px - 0;
          const dfDz = pz - (-13);
          dfRef.onDanceFloor = Math.sqrt(dfDx * dfDx + dfDz * dfDz) <= 10.0;
        }
        const avatar = avatarRef.current;
        if (avatar) {
          avatar.position.set(px, py, pz);
          avatar.rotation.y = rot;
        }

        // Rim light follows avatar
        const rimLight = scene.userData.avatarRimLight;
        if (rimLight) rimLight.position.set(px, py + 1.0, pz);

        // Notify parent of position (throttled — every 10 frames)
        if (onPosCbRef.current && frameRef.current % 10 === 0) {
          try { onPosCbRef.current(px, pz, rot); } catch {}
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
          const step = Math.min(Math.abs(yawDelta) * Math.min(1, moveDt * 3.5), 0.16) * Math.sign(yawDelta);
          camYawRef.current += step;
        } else if (!isMobileRef.current && speed > 0.05 && !userTouchingCamRef.current) {
          // Desktop: maintain camera behind avatar without dragging behind turns
          const targetYaw = rot + Math.PI;
          let yawDelta = targetYaw - camYawRef.current;
          while (yawDelta > Math.PI) yawDelta -= Math.PI * 2;
          while (yawDelta < -Math.PI) yawDelta += Math.PI * 2;
          camYawRef.current += yawDelta * Math.min(1, moveDt * 5.5);
        }

        // Smooth camera yaw + pitch — responsive enough to avoid camera/avatar fighting
        let yawDiff = camYawRef.current - camYawSmoothRef.current;
        while (yawDiff > Math.PI) yawDiff -= Math.PI * 2;
        while (yawDiff < -Math.PI) yawDiff += Math.PI * 2;
        const yawSmoothSpeed = isMobileRef.current ? 12.0 : 16.0;
        camYawSmoothRef.current += yawDiff * Math.min(1, moveDt * yawSmoothSpeed);
        camPitchSmoothRef.current += (camPitchRef.current - camPitchSmoothRef.current) * Math.min(1, moveDt * 10.0);

        const pitch = camPitchSmoothRef.current;

        if (!scene.userData._camVecs) {
          scene.userData._camVecs = {
            cabinPos: new Vector3(), nLook: new Vector3(),
            rLookSmooth: new Vector3(), rLookInitialized: false,
            cLook: new Vector3(0, 4.5, -34.4),
            lkPos: new Vector3(0, 3.0, -12), lkLook: new Vector3(0, 3.5, -34.4),
            fA: new Vector3(0, WHEEL_HUB_Y * 0.4, -10), fB: new Vector3(0, 2, 40),
          };
        }
        const cv = scene.userData._camVecs;
        if (ferrisRidingRef.current) {
          if (!cv._rl) cv._rl = { yaw: 0, pitch: 0, rt: 0 };
          const rl = cv._rl;
          const joy = mobileInputRef.current;
          const rcdx = joy.camDx || 0, rcdy = joy.camDy || 0;
          joy.camDx = 0; joy.camDy = 0;
          if (Math.abs(rcdx) > 0.0002 || Math.abs(rcdy) > 0.0002) {
            rl.yaw += rcdx * 0.65; rl.pitch += rcdy * 0.65; rl.rt = 0;
          } else { rl.rt += dt; }
          const MY = (40*Math.PI)/180, MP = (20*Math.PI)/180;
          rl.yaw   = Math.max(-MY, Math.min(MY, rl.yaw));
          rl.pitch = Math.max(-MP, Math.min(MP, rl.pitch));
          if (rl.rt > 1.2) {
            rl.yaw   -= Math.sign(rl.yaw)   * Math.min(Math.abs(rl.yaw),   0.8*dt);
            rl.pitch -= Math.sign(rl.pitch) * Math.min(Math.abs(rl.pitch), 0.8*dt);
          }
          const rider = getRiderCameraTransform(t, rl.yaw, rl.pitch);
          cv.cabinPos.set(rider.camPos.x, rider.camPos.y, rider.camPos.z);
          cv.nLook.set(rider.lookAt.x, rider.lookAt.y, rider.lookAt.z);
          // Smooth look-at: lerp gaze toward target — prevents hard jumps between views
          if (!cv.rLookInitialized) { cv.rLookSmooth.copy(cv.nLook); cv.rLookInitialized = true; }
          else { cv.rLookSmooth.lerp(cv.nLook, Math.min(1, dt * 1.1)); }
          const rFov = 62 + rider.atTop * 4;
          if (Math.abs(camera.fov - rFov) > 0.5) { camera.fov += (rFov - camera.fov) * Math.min(1, dt*4.0); camera.updateProjectionMatrix(); }
          camera.position.lerp(cv.cabinPos, Math.min(1, 8.0 * dt));
          camera.lookAt(cv.rLookSmooth);
          if (avatarRef.current) avatarRef.current.visible = false;
        } else if (lockedRef.current) {
          // Detect if player is in the lounge zone (x≈-22, z≈-26) to show lounge camera
          const inLounge = Math.sqrt((px - (-22)) ** 2 + (pz - (-26)) ** 2) < 12;
          if (inLounge) {
            // Overhead-angled lounge camera — same angle as LoungePreviewCamera
            if (!cv.lgLkPos) {
              cv.lgLkPos = new Vector3(-22, 14, -18);
              cv.lgLkLook = new Vector3(-22, 0.5, -26);
            }
            camera.position.lerp(cv.lgLkPos, Math.min(1, 3.0 * dt));
            camera.lookAt(cv.lgLkLook);
          } else {
            camera.position.lerp(cv.lkPos, Math.min(1, 3.0 * dt));
            camera.lookAt(cv.lkLook);
          }
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
          updateMixamoAvatarAnimation(avatarEntry, speed, isDancingRef.current, moveDt, hbRidingRef.current, emoteId);
        } else if (avatarEntry?._isTestAvatar) {
          // Procedural test avatars (male/female) — no mixer/clips
          updateTestAvatarAnimation(avatarEntry, speed, isDancingRef.current, moveDt);
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
          if (avatarEntry) updateAvatarAnimation(avatarEntry, speed, isDancingRef.current, moveDt, hbRidingRef.current);
        }

        // ── Aura glow animation ─────────────────────────────
        animateAura(avatarEntry, t);

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
          // Throttle texture upload — TV Smooth: 3fps | mobile: 5fps | desktop: 15fps
          // Also skip uploads entirely when stage fullscreen iframe is covering the canvas
          const stageTex = scene.userData._stageTex;
          if (stageTex) {
            const stageTexNow = performance.now();
            const isFullscreenActive = lockedRef.current; // locked = stage fullscreen/watch
            if (!isFullscreenActive) {
              const stageFps = (tvModeRef.current && tvQualityRef.current === "smooth") ? 3
                : isMob ? 5 : 15;
              const STAGE_TEX_INTERVAL = 1000 / stageFps;
              if (!scene.userData._lastStageTexTime || stageTexNow - scene.userData._lastStageTexTime >= STAGE_TEX_INTERVAL) {
                stageTex.needsUpdate = true;
                scene.userData._lastStageTexTime = stageTexNow;
              }
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
            foamMesh.material.opacity = 0.25 + tide * 0.55;
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
            // TV Smooth: reduce screen glow overdraw when far from stage
            if (tvSmooth && pz > -12) {
              screenGlowMesh.material.opacity = 0.08;
            } else {
              screenGlowMesh.material.opacity = 0.45 + audioBeat * 0.7 + (audioIntensityRef?.current || 0) * 0.3;
            }
          }
          const loungeNeonMats = scene.userData.loungeNeonMats;
          if (loungeNeonMats && !tvSmooth) {
            const loungeWave = Math.sin(t * 2.5) * 0.15;
            for (const mat of loungeNeonMats) {
              if (mat?.opacity !== undefined) mat.opacity = Math.min(0.9, 0.4 + audioBeat * 0.6 + loungeWave);
            }
            const ll = scene.userData.loungeLight;
            if (ll) ll.intensity = 1.5 + audioBeat * 1.2;
          } else if (tvSmooth) {
            // TV Smooth: hold lounge neon at a fixed low opacity — no per-frame writes
            const ll = scene.userData.loungeLight;
            if (ll) ll.intensity = 1.5; // static, no pulse
          }
        }

        // ─── NEON SKYLINE PULSE — throttled on mobile, skipped in TV smooth ──
        const neonMats = scene.userData.neonMats;
        if (neonMats && (!isMob || frameRef.current % 6 === 0) && !tvSmooth) {
          const colorShift = Math.sin(t * 0.4) * 0.5 + 0.5;
          if (!scene.userData._neonC) {
            scene.userData._neonC = [new Color("#00D4F0"), new Color("#A078FF"), new Color("#40A0EE")];
            scene.userData._neonC2 = [new Color("#C43BFF"), new Color("#00E5FF"), new Color("#C43BFF")];
          }
          const nc = scene.userData._neonC, nc2 = scene.userData._neonC2;
          if (neonMats[0]) { neonMats[0].opacity = Math.max(0.55, 0.75 + audioBeat * 1.3 + Math.sin(t * 2.1) * 0.2); neonMats[0].color.copy(nc[0]).lerp(nc2[0], colorShift * 0.35); }
          if (neonMats[1]) { neonMats[1].opacity = Math.max(0.5, 0.65 + audioBeat * 1.1 + Math.sin(t * 1.5 + 1.2) * 0.25); neonMats[1].color.copy(nc[1]).lerp(nc2[1], colorShift * 0.4); }
          if (neonMats[2]) { neonMats[2].opacity = Math.max(0.5, 0.7 + audioBeat * 1.2 + Math.sin(t * 1.8 + 2.5) * 0.22); neonMats[2].color.copy(nc[2]).lerp(nc2[2], colorShift * 0.38); }
        }


        // Building window flickers removed — static windows for performance

        // ─── PLAZA FILL LIGHT — throttled on mobile ───────────
        if (!isMob || frameRef.current % 8 === 0) {
          const pf = scene.userData.plazaFill;
          if (pf) pf.intensity = 1.0 + audioBeat * 0.8 + Math.sin(t * 1.2) * 0.2;
        }

        // ─── SHIFTING NEON AMBIENT LIGHTS — throttled on mobile, skipped in TV smooth ──
        // Mobile: skip color lerp (expensive), just pulse intensity every 6 frames
        if (!tvSmooth) {
          const neonAmbients = scene.userData.neonAmbients;
          if (neonAmbients) {
            if (isMob) {
              if (frameRef.current % 6 === 0) {
                for (const na of neonAmbients) {
                  const wave = Math.sin(t * 0.35 + na.phase);
                  na.light.intensity = na.baseI * (0.7 + wave * 0.3);
                }
              }
            } else if (frameRef.current % 2 === 0) {
              for (const na of neonAmbients) {
                const wave = Math.sin(t * 0.35 + na.phase);
                na.light.intensity = na.baseI * (0.7 + wave * 0.3) + audioBeat * 0.4;
                const blend = wave * 0.5 + 0.5;
                na.light.color.copy(na.color1).lerp(na.color2, blend * 0.45);
              }
            }
          }
        }

        // ─── TV SMOOTH: distance-gate far zone lights ────────────────────
        // Reduce PointLight intensity for zones the player is far from,
        // cutting draw cost without removing the lights entirely.
        if (tvSmooth && frameRef.current % 60 === 0) {
          const zoneDistCheck = [
            { key: "loungeLight",       zx: -22, zz: -26 },
            { key: "ferrisWheelLight",  zx: WHEEL_X, zz: WHEEL_Z },
          ];
          for (const { key, zx, zz } of zoneDistCheck) {
            const light = scene.userData[key];
            if (!light) continue;
            const ldx = px - zx, ldz = pz - zz;
            const ldist = Math.sqrt(ldx * ldx + ldz * ldz);
            // Dim lights when player is >20u away
            light.intensity = ldist > 20 ? 0.4 : light.intensity;
          }
        }

        // Distance flags — declared before any code that uses them
        const nearBeach = pz > 10;
        const nearDanceFloor = Math.sqrt(px * px + (pz + 13) * (pz + 13)) < 18;
        const lowQuality = quality.currentLevel === "low";
        const mobileQuality = quality.currentLevel === "mobile" || lowQuality;
        if (frameRef.current % (mobileQuality ? 20 : 30) === 0) {
          updateZoneStreaming(scene, px, pz, quality, frameRef.current);
        }

        // Signs/particles: cached arrays avoid scanning the whole scene every frame.
        const updateSigns = !isMob || frameRef.current % 8 === 0;
        if (updateSigns) {
          const signs = scene.userData._neonSigns || [];
          for (const child of signs) {
            if (isMob) {
              const sdx = child.position.x - px, sdz = child.position.z - pz;
              if (sdx * sdx + sdz * sdz > 2025) continue; // skip signs >45u away on mobile
            }
            child.lookAt(camera.position);
          }
        }
        // Distance-gate zone animations on mobile — skip if player is far away
        if (!mobileQuality || nearBeach || frameRef.current % (lowQuality ? 8 : 4) === 0) animateZenBeach(scene, t, audioBeat);
        // Dance floor — throttle on mobile/low, only when near. Audio zone logic remains separate and always active.
        const danceFloorPerf = lowQuality ? "low" : mobileQuality ? "medium" : "full";
        if (!mobileQuality ? true : (nearDanceFloor && frameRef.current % (lowQuality ? 6 : 4) === 0)) animateDanceFloor(scene, t, audioBeat, audioIntensityRef?.current ?? 0, danceFloorPerf);
        // Crystal Zone — TV Smooth: skip when >25u away; always animate when active
        const crystalDx = px - CRYSTAL_ZONE_X, crystalDz = pz - CRYSTAL_ZONE_Z;
        const crystalDist = Math.sqrt(crystalDx * crystalDx + crystalDz * crystalDz);
        const crystalGate = tvSmooth
          ? (crystalDist < 25 || scene.userData.crystalZone?.activated)
          : (!mobileQuality || crystalDist < 28 || frameRef.current % (lowQuality ? 10 : 4) === 0);
        if (crystalGate) animateCrystalZone(scene, t, dt, px, pz, tvSmooth || lowQuality);
        if (!mobileQuality || nearDanceFloor || frameRef.current % (lowQuality ? 8 : 4) === 0) animateJukebox(scene, t, audioBeat, danceFloorPerf);
        if (scene.userData.shopGroup && (!mobileQuality || frameRef.current % (lowQuality ? 8 : 3) === 0)) animateShop(scene.userData.shopGroup, t, audioBeat);

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
            const jumpGlow = Math.min(0.35, hoverboardJumpOffsetRef.current * 0.12 + hoverboardLandingBounceRef.current);
            const stripeMat = hbBoard.userData.stripeMat;
            if (stripeMat) {
              stripeMat.opacity = Math.min(1, 0.72 + audioBeat * 0.26 + Math.sin(t * 4.5) * 0.10 + jumpGlow);
              if (!scene.userData._hbC1) { scene.userData._hbC1 = new Color("#00E5FF"); scene.userData._hbC2 = new Color("#C43BFF"); }
              stripeMat.color.copy(scene.userData._hbC1).lerp(scene.userData._hbC2, Math.sin(t * 1.6) * 0.5 + 0.5);
            }
            if (hbBoard.userData.hoverDisc) {
              hbBoard.userData.hoverDisc.opacity = Math.min(0.65, 0.14 + audioBeat * 0.22 + Math.sin(t * 3.0) * 0.07 + jumpGlow);
            }
            // Board tilts forward on speed and slightly pitches up during controlled jumps.
            const spd = Math.sqrt(velocityRef.current.x ** 2 + velocityRef.current.z ** 2);
            hbBoard.rotation.x = hoverboardAirborne ? -0.18 - Math.min(0.12, hoverboardJumpOffsetRef.current * 0.04) : spd > 0.3 ? -spd * 0.06 : Math.sin(t * 1.2) * 0.02;
            hbBoard.rotation.z = Math.sin(t * 0.85) * 0.015;
          }
        } else {
          // Ensure board rotation resets after detach
          const hbBoard = avatarEntryRef.current?._hbBoard;
          if (hbBoard) { hbBoard.rotation.x = 0; hbBoard.rotation.z = 0; }
        }
        // Distance-gate heavy zone animations on mobile
        const nearFerris = Math.sqrt((px - WHEEL_X) * (px - WHEEL_X) + (pz - WHEEL_Z) * (pz - WHEEL_Z)) < 28;
        if (!mobileQuality || nearFerris || frameRef.current % (lowQuality ? 8 : 4) === 0) animateHoverboardZone(scene, t, audioBeat);
        // Ferris Wheel — TV Smooth: skip when >30u away (unless riding)
        const ferrisDist = Math.sqrt((px - WHEEL_X) * (px - WHEEL_X) + (pz - WHEEL_Z) * (pz - WHEEL_Z));
        const ferrisGate = tvSmooth
          ? (ferrisRidingRef.current || ferrisDist < 30)
          : (!mobileQuality || ferrisRidingRef.current || nearFerris || frameRef.current % (lowQuality ? 10 : 6) === 0);
        if (ferrisGate) animateFerrisWheel(scene, t, audioBeat, px, pz, tvSmooth);


        // Reset orbs when new ride starts
        if (window.__hbResetRings) {
          window.__hbResetRings = false;
          resetOrbs(scene);
        }

        // ─── HOVERBOARD ORB COLLECTION — only while playing Neon Surf game (not personal board) ──
        if (isPlayingNeonSurfRef.current && frameRef.current % 4 === 0) {
          const orbMeshes = scene.userData.hbOrbMeshes;
          if (orbMeshes) {
            for (const orb of orbMeshes) {
              if (orb.collected) continue;
              const od = BEACH_ORBS[orb.id];
              if (!od) continue;
              const dx = px - od.x, dz = pz - od.z;
              const dy = (py + 0.4) - (orb.group?.position?.y ?? 1.0);
              if (Math.sqrt(dx * dx + dz * dz) < 1.4 && Math.abs(dy) < 1.45) {
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

        // ─── COSMIC SKY — skybox + starfield follow camera, planets/shooting stars/asteroids ──
        scene.userData._playerZ = pz;
        scene.userData._camPitch = camPitchSmoothRef.current; // pass live pitch for planet compensation
        scene.userData._camYaw   = camYawSmoothRef.current;   // pass live yaw for facing-direction fade
        // During Ferris ride: only hide city-side (front/stage-facing) planets.
        // During stage fullscreen/watch (locked): hide all planets.
        scene.userData._hidePlanets = lockedRef.current;
        scene.userData._ferrisRiding = ferrisRidingRef.current;
        animateCosmicSky(scene, camera, t, dt);
        // LaunchRide bridge — passes avatar position + state into add-ons
        MOVEMENT_BRIDGE.px = px; MOVEMENT_BRIDGE.py = py; MOVEMENT_BRIDGE.pz = pz;
        MOVEMENT_BRIDGE.hbRiding = hbRidingRef.current;
        MOVEMENT_BRIDGE.dt_ = moveDt;
        tickAddOns(scene, t);

        // ─── Stage screen projection (for YouTube iframe overlay) ──────────
        // Use clientWidth/clientHeight (CSS pixels) NOT domElement width/height
        // (attribute pixels are scaled by devicePixelRatio on retina/mobile)
        if (stageScreenPosRef && (!isMob || frameRef.current % 2 === 0)) {
          if (!scene.userData._stageProjectionVecs) {
            scene.userData._stageProjectionVecs = {
              ss: new Vector3(0, 3.5, -34.4),
              tl: new Vector3(),
              br: new Vector3(),
            };
          }
          const pv = scene.userData._stageProjectionVecs;
          const proj = pv.ss.set(0, 3.5, -34.4).project(camera);
          const rw = renderer.domElement.clientWidth || renderer.domElement.width;
          const rh = renderer.domElement.clientHeight || renderer.domElement.height;
          const cx = (proj.x * 0.5 + 0.5) * rw;
          const cy = (-proj.y * 0.5 + 0.5) * rh;
          const sw2 = (scene.userData._screenW || 12.444) / 2;
          const sh2 = scene.userData._screenH || 7;
          const tl = pv.tl.set(-sw2, 3.5 + sh2 / 2, -34.4).project(camera);
          const br = pv.br.set( sw2, 3.5 - sh2 / 2, -34.4).project(camera);
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

          const remoteAvatarType = remote.avatar_type_key || remote.avatar_type || "current";
          const remoteSignature = [
            remoteAvatarType,
            remote.skin_tone || "medium",
            remote.avatar_style || "streetwear",
            remote.avatar_outfit_color || "",
            remote.username || "User",
          ].join("|");

          let entry = remoteMap[remote.user_id];
          if (entry && entry.signature !== remoteSignature) {
            const remoteEntry = entry.group?.userData?._avatarEntry;
            if (remoteEntry) detachHoverboard(remoteEntry);
            unbindAura(entry.group);
            if (entry.group) {
              scene.remove(entry.group);
              entry.group.traverse((obj) => {
                if (obj.geometry) obj.geometry.dispose();
                if (obj.material) disposeMaterialDeep(obj.material);
              });
            }
            delete remoteHbStateRef.current[remote.user_id];
            delete remoteMap[remote.user_id];
            entry = null;
          }

          if (!entry) {
            // Spawn new remote avatar using the same avatar type the remote user has selected.
            // Prefer avatar_type_key (the exact sessionStorage key broadcast in heartbeat).
            let group;
            if (remoteAvatarType === "test-mixamo" || remoteAvatarType === "test-mixamo-female") {
              // Use Mixamo procedural avatar matching their chosen type
              const remoteGender = remoteAvatarType === "test-mixamo-female" ? "female" : "male";
              const remoteEntry = createMixamoAvatar(scene, {
                spawnX: remote.pos_x || 0,
                spawnY: SPAWN[1],
                spawnZ: remote.pos_z || 0,
                gender: remoteGender,
                hairStyle: remoteGender === "female" ? "ponytail" : "short",
                outfitColorKey: remote.avatar_outfit_color || null,
                skinToneKey: remote.skin_tone || "medium",
                isRemote: true,
                userId: remote.user_id,
                username: remote.username || "User",
              }, null);
              group = remoteEntry.root;
              // name and userData already set by createMixamoAvatar (isRemote=true)
              group.userData._avatarEntry = remoteEntry;
            } else {
              // Default: Soldier GLB remote avatar
              group = createRemoteAvatar(
                scene, remote.user_id,
                remote.username || "User",
                remoteAvatarType,
                remote.skin_tone || "medium",
                remote.avatar_style || "streetwear",
                remote.avatar_outfit_color || null
              );
            }
            entry = { group, prevPos: { x: remote.pos_x || 0, z: remote.pos_z || 0 }, signature: remoteSignature };
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

          // ─── Remote avatar animation — use received state ──
          const remoteEntry = g.userData._avatarEntry;
          const animState = remote.animation_state || remote.animationState || "idle";
          const remoteIsDancing = animState === "dance" || !!remote.is_dancing;
          const remoteIsHoverboarding = animState === "hbRiding" || !!remote.personal_hoverboard_active;
          // Neon Surf is separate — remote animation stays normal, no hoverboard attach
          if (remoteEntry) {
          if (remoteEntry._isMixamo) {
            const emergeId = remoteIsDancing ? "dance" : null;
            updateMixamoAvatarAnimation(remoteEntry, vel * 15, remoteIsDancing, dt,
              remoteIsHoverboarding ? true : false, emergeId);
          } else {
            updateAvatarAnimation(remoteEntry, vel * 15, remoteIsDancing, dt,
              remoteIsHoverboarding ? true : false);
          }
          // Smoothly lerp avatar Y up when hoverboarding, back down when not.
          // A hard set (SPAWN[1] → SPAWN[1]+0.15) creates an instantaneous
          // jump that looks like the board "flickers on and off" to observers.
          const targetY = remoteIsHoverboarding ? SPAWN[1] + 0.15 : SPAWN[1];
          g.position.y += (targetY - g.position.y) * Math.min(1, 8 * dt);
          }

          // ── Remote aura sync ────────────────────────────
          const rs = remoteHbStateRef.current;
          const prevS = rs[remote.user_id];
          const hasAura   = !!remote.equipped_aura;
          const isRidingHb = !!remote.personal_hoverboard_active;
          const isRidingNeon = !!remote.is_playing_neon_surf;
          if (prevS && prevS.hasAura !== hasAura) {
            if (hasAura) {
              bindAura(g, remote.equipped_aura, remote.equipped_aura_color || null);
            } else {
              unbindAura(g);
            }
          } else if (hasAura && !prevS) {
            bindAura(g, remote.equipped_aura, remote.equipped_aura_color || null);
          }

          // ── Remote hoverboard sync (PERSONAL board — NOT Neon Surf) ──
          // Grace window: brief drops in isRidingHb (from noisy presence ticks)
          // won't detach immediately. Only detach after 6+ consecutive false frames.
          const prevRiding = prevS?.isRiding;
          const gc = prevS || {};
          if (isRidingHb) {
            gc.rideGraceCounter = 0;
            if (!prevRiding) attachHoverboard(remoteEntry);
          } else if (prevRiding) {
            gc.rideGraceCounter = (gc.rideGraceCounter || 0) + 1;
            if (gc.rideGraceCounter >= 6) detachHoverboard(remoteEntry);
          } else {
            // Wasn't riding before either — noop
          }

          rs[remote.user_id] = { hasAura, isRiding: isRidingHb, isDancing: remoteIsDancing };
        }

        // Despawn avatars that are no longer present
        for (const id in remoteMap) {
          if (!activeIds.has(id)) {
            const entry = remoteMap[id];
            // Clean remote state
            const rs = remoteHbStateRef.current[id];
            if (rs) {
              // Detach hoverboard + aura before removing the group from the scene
              const remoteEntry = entry.group?.userData?._avatarEntry;
              if (remoteEntry) detachHoverboard(remoteEntry);
              unbindAura(entry.group);
              delete remoteHbStateRef.current[id];
            }
            if (entry.group) {
              scene.remove(entry.group);
              entry.group.traverse((obj) => {
                if (obj.geometry) obj.geometry.dispose();
                if (obj.material) disposeMaterialDeep(obj.material);
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
          if (obj.material) disposeMaterialDeep(obj.material);
        });
        // Detach hoverboard + aura on unmount
        if (avatarEntryRef.current) {
          detachHoverboard(avatarEntryRef.current);
          if (equippedAuraRef.current) unbindAura(avatarEntryRef.current.root);
        }
        window.__hbScene = null;
        initializedRef.current = false;
        lastTimeRef.current = 0;
        frameRef.current = 0;
        avatarRef.current = null;
        avatarEntryRef.current = null;
        sceneRef.current = null;
        remoteAvatarsRef.current = {};
        remoteHbStateRef.current = {};
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
    if (!ferrisRiding) {
      if (avatarRef.current) avatarRef.current.visible = true;
      const cv = sceneRef.current?.userData?._camVecs;
      if (cv) { cv._rl = null; cv.rLookInitialized = false; }
    }
  }, [ferrisRiding]);

  // ── Aura glow bind/unbind ─────────────────────────────────────
  useEffect(() => {
    const controller = avatarRef.current;
    if (!controller) return;
    const prev = prevEquippedAuraRef.current;
    if (equippedAura !== prev) {
      prevEquippedAuraRef.current = equippedAura;
      if (equippedAura) {
        bindAura(controller, equippedAura);
      } else {
        unbindAura(controller);
      }
    }
  }, [equippedAura]);

  // Keyboard
  useEffect(() => {
    const onDown = (e) => {
      keysRef.current[e.key.toLowerCase()] = true;
      if ((e.code === "Space" || e.key === " ") && personalHoverboardActiveRef.current) {
        e.preventDefault();
        pendingHoverboardJumpRef.current = true;
      }
    };
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

    const handleClick = (e, fromTouch = false) => {
      // Only process clicks directly on the canvas (ignore HUD buttons)
      // fromTouch=true bypasses target check since touch events use canvas directly
      if (!fromTouch && e.target !== canvas) return;

      const scene = sceneRef.current;
      const camera = cameraRef.current;
      if (!scene || !camera) return;

      const rect = canvas.getBoundingClientRect();
      const mouseX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const mouseY = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(new THREE.Vector2(mouseX, mouseY), camera);
      raycaster.far = fromTouch ? 50 : 35; // Mobile: longer reach for avatar taps

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
        // Walk up to find the root remote avatar group or check hitbox userData directly
        let obj = intersects[0].object;
        // First: check if the directly hit object has userId (hitbox)
        let hitUserId = obj.userData?.userId;
        if (!hitUserId) {
          // Walk up to find the remote_ root group
          let cur = obj;
          while (cur && !cur.name?.startsWith("remote_")) {
            cur = cur.parent;
          }
          if (cur) hitUserId = cur.userData?.userId;
        }
        if (hitUserId) {
          const remoteUser = remoteUsersRef.current.find(
            (u) => u.user_id === hitUserId
          );
          if (remoteUser && onRemoteClickRef.current) {
            onRemoteClickRef.current(hitUserId, remoteUser.username || "User");
          }
        }
      }
    };

    // Desktop: click on canvas
    canvas.addEventListener("click", handleClick);

    // iOS Safari tap detection — listen on window (not canvas) so CameraLookZone pointer-events:none
    // doesn't interfere. Short tap (< 200ms, < 15px drift) → raycast for avatar hit.
    let _tapStart = null;
    const onWindowTouchStart = (e) => {
      if (e.touches.length !== 1) return;
      _tapStart = { x: e.touches[0].clientX, y: e.touches[0].clientY, t: Date.now() };
    };
    const onWindowTouchEnd = (e) => {
      if (!_tapStart || e.changedTouches.length !== 1) { _tapStart = null; return; }
      const ch = e.changedTouches[0];
      const dx = ch.clientX - _tapStart.x;
      const dy = ch.clientY - _tapStart.y;
      const elapsed = Date.now() - _tapStart.t;
      _tapStart = null;
      // Only fire for short taps, not drags
      if (elapsed > 300 || Math.sqrt(dx * dx + dy * dy) > 15) return;
      handleClick({ clientX: ch.clientX, clientY: ch.clientY }, true);
    };
    window.addEventListener("touchstart", onWindowTouchStart, { passive: true });
    window.addEventListener("touchend", onWindowTouchEnd, { passive: true });

    return () => {
      canvas.removeEventListener("click", handleClick);
      window.removeEventListener("touchstart", onWindowTouchStart);
      window.removeEventListener("touchend", onWindowTouchEnd);
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