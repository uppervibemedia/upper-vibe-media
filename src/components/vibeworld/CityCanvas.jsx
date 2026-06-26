import React, { useRef, useEffect, useState, useCallback } from "react";
import * as THREE from "three";
import { SPAWN, TREE_POSITIONS, PARK_RADIUS } from "./cityData";
import createCitySkyline from "./CitySkyline";
import { createVibeShop } from "./VibeShop";
import { createLaunchPad, animateLaunchPad } from './LaunchPad';
import { createFerrisWheel, animateFerrisWheel, WHEEL_X, WHEEL_Z, WHEEL_RADIUS, WHEEL_HUB_Y, getCabinWorldPosition, getBoardingPosition, getRiderCameraTransform } from "./FerrisWheel";
import createZenBeach, { animateZenBeach } from "./ZenBeach";
import { addDanceFloor, animateDanceFloor } from "./DanceFloor";
import { createJukebox, animateJukebox, JUKEBOX_POS, JUKEBOX_INTERACT_RADIUS, DANCE_FLOOR_RADIUS } from "./Jukebox";
import { createHoverboardZone, animateHoverboardZone, flashRing, resetRings, collectOrb, resetOrbs, HOVERBOARD_START, HOVERBOARD_INTERACT_RADIUS, HOVERBOARD_RINGS, BEACH_ORBS, BOOST_PADS, LAUNCH_PADS } from "./HoverboardRingRun";
import { createCrystalZone, animateCrystalZone, activateCrystalZone } from "./CrystalZone";
import { createCosmicSky, animateCosmicSky } from "./CosmicSkySystem";
import { createAvatar, createRemoteAvatar, updateAvatarAnimation, retintAvatar, attachHoverboard, detachHoverboard } from "./AvatarModel.jsx";
import { createTestAvatar, updateTestAvatarAnimation, retintTestAvatar } from "./AvatarModelTest";
import { createMixamoAvatar, updateMixamoAvatarAnimation, retintMixamoAvatar } from "./AvatarModelMixamo";
import { createZoneSign } from "./ZoneSign";

let _threeErr;
if (!THREE) { _threeErr = "Three.js library did not load"; }
const {
  WebGLRenderer,
  Scene,
  PerspectiveCamera,
  MeshStandardMaterial,
  MeshBasicMaterial,
  Color,
  PlaneGeometry,
  RingGeometry,
  CircleGeometry,
  CylinderGeometry,
  BoxGeometry,
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
  Points
} = THREE || {};

const MOVE_SPEED = 4.5;
const ACCELERATION = 14.0;
const DECELERATION = 11.0;
const TURN_SPEED = 2.5;
const ROTATION_SMOOTH = 8.0;
const CAM_DIST = 5.5;
const CAM_HEIGHT = 2.4;
const CAM_LOOK_Y = 0.9;
const CAM_PITCH_MIN = -0.35;
const CAM_PITCH_MAX = 0.22;
const CAM_DIST_LS = 3.5;
const CAM_HEIGHT_LS = 1.75;
const CAM_LOOK_Y_LS = 1.35;
const FOV_PORTRAIT = 52;
const FOV_LANDSCAPE = 60;
const TREE_R = 0.5;
const COLLISION_BOXES = [
  ...TREE_POSITIONS.map(([tx, tz]) => [tx, tz, TREE_R, TREE_R]),
  [22 - 1.5, 5, 0.5, 0.5], [22 + 1.5, 5, 0.5, 0.5], [22, 5, 1.2, 1.2],
];

function circleVsCircle(x1, z1, r1, x2, z2, r2) {
  const dx = x1 - x2, dz = z1 - z2;
  return dx * dx + dz * dz < (r1 + r2) * (r1 + r2);
}

const SKYLINE_NORTH = -36;
const SKYLINE_EAST = 36;
const SKYLINE_WEST = -36;
const SKYLINE_BEACH_START = 15;

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

  if (z < SKYLINE_NORTH + r) z = SKYLINE_NORTH + r;
  if (x > SKYLINE_EAST - r) x = SKYLINE_EAST - r;
  if (x < SKYLINE_WEST + r) x = SKYLINE_WEST + r;

  if (z >= SKYLINE_BEACH_START) {
    const beachProgress = Math.min(1, (z - SKYLINE_BEACH_START) / 18);
    const beachXLimit = 34 - beachProgress * 6;
    if (x > beachXLimit) x = beachXLimit;
    if (x < -beachXLimit) x = -beachXLimit;
  }

  const maxZ = isHoverboarding ? 75 : 34;
  if (z > maxZ) z = maxZ;

  return [x, z];
}

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

function buildPark(scene) {
  createCosmicSky(scene);
  createCitySkyline(scene);

  const SHORELINE_Z = 32;
  const OCEAN_DEPTH = 54;

  const groundGeo = new PlaneGeometry(84, 64);
  const groundMat = mat("#0B1020", { roughness: 0.55, metalness: 0.15 });
  const ground = new Mesh(groundGeo, groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(0, -0.01, -10);
  ground.receiveShadow = true;
  ground.name = "plazaGround";
  scene.add(ground);

  const PLAZA_X = 0, PLAZA_Z = -13, PLAZA_R = 10.5;
  const plazaDisc = new Mesh(
    new CircleGeometry(PLAZA_R, 64),
    mat("#141B2D", { roughness: 0.35, metalness: 0.30 })
  );
  plazaDisc.rotation.x = -Math.PI / 2;
  plazaDisc.position.set(PLAZA_X, 0.001, PLAZA_Z);
  plazaDisc.receiveShadow = true;
  scene.add(plazaDisc);

  addDanceFloor(scene, PLAZA_X, PLAZA_Z, PLAZA_R);
  createJukebox(scene);

  createVibeShop(scene);
  createZoneSign(scene, 0, 3.5, 3, "UPPER VIBE SHOP", "#00E5FF");

  createFerrisWheel(scene);
  createZenBeach(scene, PLAZA_X, PLAZA_Z);
  createHoverboardZone(scene);
  createCrystalZone(scene);
  createZoneSign(scene, -26, 3.2, -14, "CRYSTAL  ZONE", "#AA66FF");
  
  const launchPads = [
    { x: -15, z: -5, rot: Math.PI / 4 },
    { x: 15, z: -5, rot: -Math.PI / 4 },
    { x: -10, z: 15, rot: Math.PI * 0.75 },
    { x: 10, z: 15, rot: -Math.PI * 0.75 },
  ];
  scene.userData.launchPads = launchPads.map(p => ({...p, ...createLaunchPad(scene, p.x, p.z, p.rot)}));

}

export default function CityCanvas({ onLoaded, onPositionChange, onRemoteAvatarClick, stageCanvas, audioIntensityRef, audioBassRef, audioBeatRef, locked, stageScreenPosRef, remoteUsers, isDancing = false, activeEmote = null, avatarConfig, onJukeboxProximity, retintRef, onNearShop, djTrack, hbRiding = false, ferrisRiding = false, spawnOverride = null, rendererRef = null, tvMode = false, tvQuality = "smooth", ...props }) {
  const canvasRef = useRef(null);
  const [error, setError] = useState(null);
  const [isMobile, setIsMobile] = useState(false);
  const onLoadedRef = useRef(onLoaded);
  onLoadedRef.current = onLoaded;

  const launchState = useRef({ active: false, phase: null, timer: 0, startY: 0, cooldown: 0 });

  useEffect(() => {
    // Simplified init
    const canvas = canvasRef.current;
    if (!canvas || _threeErr) {
        setError(_threeErr || "Canvas not found");
        return;
    }

    const renderer = new WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = PCFSoftShadowMap;

    const scene = new Scene();
    const camera = new PerspectiveCamera(52, window.innerWidth / window.innerHeight, 0.1, 160);
    
    buildPark(scene);
    scene.userData.launchState = { active: false, phase: "rise", timer: 0, startY: 0, cooldown: 0 };

    const avatarEntry = createMixamoAvatar(scene, {
        spawnX: SPAWN[0], spawnY: SPAWN[1], spawnZ: SPAWN[2],
        gender: "female",
        outfitColorKey: avatarConfig?.outfitColorKey,
        skinToneKey: avatarConfig?.skinTone
    });
    const avatar = avatarEntry.root;

    let animId;
    let lastTime = 0;

    const animate = (t) => {
        animId = requestAnimationFrame(animate);
        const now = t * 0.001;
        const dt = now - (lastTime || now);
        lastTime = now;

        let [px, py, pz] = avatar.position.toArray();
        let rot = avatar.rotation.y;

        checkLaunchPadCollision(scene, px, pz, py);
        const { newPy, airborne } = applyLaunchPhysics(scene, py, dt);
        const hbLift = hbRiding ? (0.18 + Math.sin(now * 3.0) * 0.04) : 0;
        py = airborne ? newPy : SPAWN[1] + hbLift;

        avatar.position.set(px, py, pz);

        animateLaunchSystem(scene, now);
        animateFerrisWheel(scene, now, 0, px, pz, false);
        animateCosmicSky(scene, camera, now, dt);

        renderer.render(scene, camera);
    };

    animate(0);

    return () => {
        cancelAnimationFrame(animId);
        renderer.dispose();
        const sc = scene.userData;
        delete sc.launchState;
        delete sc.launchPads;
    };
  }, []);

  return <canvas ref={canvasRef} />;
}

function checkLaunchPadCollision(scene, px, pz, py) {
    const launchPads = scene.userData.launchPads || [];
    const launchState = scene.userData.launchState;

    for (const pad of launchPads) {
        const dx = px - pad.x;
        const dz = pz - pad.z;
        if (dx * dx + dz * dz < 1.8 * 1.8) {
            if (!launchState.active && launchState.cooldown <= 0) {
                launchState.active = true;
                launchState.phase = "rise";
                launchState.timer = 0;
                launchState.startY = py;
                launchState.cooldown = 2.0; // 2 second cooldown
            }
            return true;
        }
    }
    return false;
}

function applyLaunchPhysics(scene, py, dt) {
    const launchState = scene.userData.launchState;
    let newPy = py;
    let airborne = false;

    if (launchState?.active) {
        airborne = true;
        launchState.timer += dt;
        const DURATION = 1.6;
        const APEX = 12.0;
        const progress = Math.min(1, launchState.timer / DURATION);

        if (launchState.phase === "rise") {
            const easeIn = progress * progress;
            newPy = launchState.startY + easeIn * APEX;
            if (progress >= 1) {
                launchState.phase = "fall";
                launchState.timer = 0;
                launchState.startY = newPy;
            }
        } else {
            const easeOut = 1 - (1 - progress) * (1 - progress);
            newPy = launchState.startY * (1 - easeOut);
            if (progress >= 1) {
                launchState.active = false;
            }
        }
    } else {
        if (launchState.cooldown > 0) {
            launchState.cooldown -= dt;
        }
    }

    return { newPy, airborne };
}

function animateLaunchSystem(scene, t) {
    (scene.userData.launchPads || []).forEach(pad => animateLaunchPad(pad, t));
}