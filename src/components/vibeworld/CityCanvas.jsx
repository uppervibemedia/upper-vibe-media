import React, { useRef, useEffect, useState, useCallback } from "react";
import * as THREE from "three";
import { SPAWN, TREE_POSITIONS, PARK_RADIUS } from "./cityData";

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
  Vector3,
  Mesh,
  Group,
  DirectionalLight,
  AmbientLight,
  HemisphereLight,
  PCFSoftShadowMap,
} = THREE;

// ─── CONSTANTS ────────────────────────────────────────────────
const MOVE_SPEED = 3.0;
const ACCELERATION = 10.0;
const DECELERATION = 8.0;
const TURN_SPEED = 8.0;
const ROTATION_SMOOTH = 6.0;
const WALK_CYCLE_SPEED = 7.0;

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
  // Park boundary
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
// BUILD SCENE: Simple outdoor park
// ═══════════════════════════════════════════════════════════════
function buildPark(scene) {
  // ─── SKY ────────────────────────────────────────────────────
  scene.background = new Color("#87CEEB");
  scene.fog = new Fog("#C8E6C9", 25, 55);

  // ─── GRASS GROUND ───────────────────────────────────────────
  const groundGeo = new PlaneGeometry(80, 80);
  const groundMat = mat("#4CAF50", { roughness: 0.85 });
  const ground = new Mesh(groundGeo, groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.01;
  ground.receiveShadow = true;
  scene.add(ground);

  // Inner walking area
  const innerGeo = new PlaneGeometry(PARK_RADIUS * 2, PARK_RADIUS * 2);
  const innerMat = mat("#5CB860", { roughness: 0.75 });
  const inner = new Mesh(innerGeo, innerMat);
  inner.rotation.x = -Math.PI / 2;
  inner.position.y = -0.005;
  inner.receiveShadow = true;
  scene.add(inner);

  // Dirt path circle
  const pathRing = new RingGeometry(12, 12.6, 64);
  const pathMat = mat("#C8A96E", { roughness: 0.9 });
  const path = new Mesh(pathRing, pathMat);
  path.rotation.x = -Math.PI / 2;
  path.position.y = 0.001;
  path.receiveShadow = true;
  scene.add(path);

  // Central dirt patch
  const centerGeo = new CircleGeometry(3, 32);
  const centerMat = mat("#C8A96E", { roughness: 0.9 });
  const center = new Mesh(centerGeo, centerMat);
  center.rotation.x = -Math.PI / 2;
  center.position.y = 0.002;
  center.receiveShadow = true;
  scene.add(center);

  // ─── TREES ──────────────────────────────────────────────────
  TREE_POSITIONS.forEach(([tx, tz, scale]) => {
    const tree = new Group();

    const trunkGeo = new CylinderGeometry(0.08 * scale, 0.12 * scale, 2 * scale, 8);
    const trunkMat = mat("#6D4C41", { roughness: 0.7 });
    const trunk = new Mesh(trunkGeo, trunkMat);
    trunk.position.y = 1 * scale;
    trunk.castShadow = true;
    trunk.receiveShadow = true;
    tree.add(trunk);

    const canopyColors = ["#388E3C", "#43A047", "#2E7D32"];
    for (let i = 0; i < 3; i++) {
      const canopyGeo = new SphereGeometry(0.6 * scale - i * 0.08, 8, 6);
      const canopyMat = mat(canopyColors[i], { roughness: 0.6 });
      const canopy = new Mesh(canopyGeo, canopyMat);
      canopy.position.y = 1.6 * scale + i * 0.35 * scale;
      canopy.position.x = (i - 1) * 0.15 * scale;
      canopy.castShadow = true;
      canopy.receiveShadow = true;
      tree.add(canopy);
    }

    tree.position.set(tx, 0, tz);
    tree.rotation.y = Math.random() * Math.PI;
    scene.add(tree);
  });

  // ─── BUSHES ─────────────────────────────────────────────────
  for (let i = 0; i < 30; i++) {
    const angle = Math.random() * Math.PI * 2;
    const radius = 4 + Math.random() * 10;
    const bx = Math.cos(angle) * radius;
    const bz = Math.sin(angle) * radius;
    const bushGeo = new SphereGeometry(0.2 + Math.random() * 0.25, 6, 5);
    const bushMat = mat("#388E3C", { roughness: 0.55 });
    const bush = new Mesh(bushGeo, bushMat);
    bush.position.set(bx, 0.15, bz);
    bush.scale.set(1, 0.7, 1);
    bush.castShadow = true;
    bush.receiveShadow = true;
    scene.add(bush);
  }

  // ─── SMALL FLOWERS ──────────────────────────────────────────
  const flowerColors = ["#FFEB3B", "#FF9800", "#E91E63", "#9C27B0", "#FFFFFF"];
  for (let i = 0; i < 60; i++) {
    const angle = Math.random() * Math.PI * 2;
    const radius = 3 + Math.random() * 14;
    const fx = Math.cos(angle) * radius;
    const fz = Math.sin(angle) * radius;

    const stemGeo = new CylinderGeometry(0.01, 0.01, 0.25, 4);
    const stemMat = mat("#388E3C");
    const stem = new Mesh(stemGeo, stemMat);
    stem.position.set(fx, 0.12, fz);
    scene.add(stem);

    const petalGeo = new SphereGeometry(0.03, 4, 4);
    const petalMat = mat(flowerColors[i % flowerColors.length]);
    const petal = new Mesh(petalGeo, petalMat);
    petal.position.set(fx, 0.26, fz);
    scene.add(petal);
  }

  // ─── BENCHES ────────────────────────────────────────────────
  const benchPositions = [
    [0, 5.5, 0], [0, -5.5, Math.PI], [5.5, 0, Math.PI / 2], [-5.5, 0, -Math.PI / 2],
  ];
  benchPositions.forEach(([bx, bz, rot]) => {
    const bench = new Group();
    const seatGeo = new BoxGeometry(2, 0.06, 0.5);
    const seatMat = mat("#8D6E63", { roughness: 0.5 });
    const seat = new Mesh(seatGeo, seatMat);
    seat.position.y = 0.45;
    seat.castShadow = true;
    bench.add(seat);
    for (let lx = -0.8; lx <= 0.8; lx += 1.6) {
      for (let lz = -0.15; lz <= 0.15; lz += 0.3) {
        const legGeo = new BoxGeometry(0.06, 0.42, 0.06);
        const legMat = mat("#5D4037", { roughness: 0.4 });
        const leg = new Mesh(legGeo, legMat);
        leg.position.set(lx, 0.21, lz);
        leg.castShadow = true;
        bench.add(leg);
      }
    }
    const backGeo = new BoxGeometry(2, 0.35, 0.05);
    const backMat = mat("#8D6E63", { roughness: 0.5 });
    const back = new Mesh(backGeo, backMat);
    back.position.set(0, 0.65, -0.22);
    back.castShadow = true;
    bench.add(back);
    bench.position.set(bx, 0, bz);
    bench.rotation.y = rot;
    scene.add(bench);
  });

  // ─── LIGHTING ───────────────────────────────────────────────
  const sun = new DirectionalLight();
  sun.color = new Color("#FFF8E1");
  sun.intensity = 1.2;
  sun.position.set(10, 18, -5);
  sun.castShadow = true;
  sun.shadow.mapSize.width = 2048;
  sun.shadow.mapSize.height = 2048;
  sun.shadow.camera.near = 0.5;
  sun.shadow.camera.far = 60;
  sun.shadow.camera.left = -20;
  sun.shadow.camera.right = 20;
  sun.shadow.camera.top = 20;
  sun.shadow.camera.bottom = -20;
  sun.shadow.bias = -0.0003;
  scene.add(sun);

  const ambLight = new AmbientLight();
  ambLight.color = new Color("#BBDEFB");
  ambLight.intensity = 0.55;
  scene.add(ambLight);

  const hemiLight = new HemisphereLight();
  hemiLight.color = new Color("#87CEEB");
  hemiLight.groundColor = new Color("#388E3C");
  hemiLight.intensity = 0.3;
  scene.add(hemiLight);
}

// ═══════════════════════════════════════════════════════════════
// BUILD LOW-POLY HUMANOID AVATAR (spheres, capsules — no boxes)
// ═══════════════════════════════════════════════════════════════
function createAvatar(scene) {
  const avatar = new Group();
  avatar.name = "avatar";

  // Material helpers
  const skinMat = () => mat("#FFD5C2", { roughness: 0.45 });
  const shirtMat = () => mat("#1565C0", { roughness: 0.3 });
  const pantsMat = () => mat("#1B5E20", { roughness: 0.35 });
  const shoeMat = () => mat("#3E2723", { roughness: 0.4 });
  const hairMat = () => mat("#3E2723", { roughness: 0.55 });
  const eyeMat = () => mat("#111111", { roughness: 0.1 });
  const darkShoe = () => mat("#1A1A1A", { roughness: 0.35 });

  function addMesh(group, geo, materialOrFn, pos, casts = true) {
    const m = new Mesh(geo, typeof materialOrFn === "function" ? materialOrFn() : materialOrFn);
    m.position.copy(pos);
    m.castShadow = casts;
    m.receiveShadow = casts;
    group.add(m);
    return m;
  }

  // ─── FEET ────────────────────────────────────────────────────
  function createFoot() {
    const foot = new Group();
    foot.name = "foot";
    // Shoe body (rounded cylinder for shoe shape)
    addMesh(foot, new CylinderGeometry(0.04, 0.05, 0.12, 8), darkShoe, new Vector3(0, 0.03, 0.05));
    // Sole (flat box)
    const sole = new Mesh(new BoxGeometry(0.11, 0.025, 0.16), shoeMat());
    sole.position.set(0, -0.02, 0.05);
    sole.castShadow = true;
    sole.receiveShadow = true;
    foot.add(sole);
    return foot;
  }

  // ─── LOWER LEG (knee to ankle) ──────────────────────────────
  function createLowerLeg() {
    const leg = new Group();
    leg.name = "lowerLeg";
    const len = 0.36;
    addMesh(leg, new CylinderGeometry(0.055, 0.065, len, 8), pantsMat, new Vector3(0, -len / 2, 0));

    const foot = createFoot();
    foot.position.set(0, -len - 0.01, 0);
    leg.add(foot);
    leg.userData.foot = foot;
    return leg;
  }

  // ─── UPPER LEG (hip to knee) ────────────────────────────────
  function createUpperLeg() {
    const leg = new Group();
    leg.name = "upperLeg";
    const len = 0.4;
    addMesh(leg, new CylinderGeometry(0.065, 0.075, len, 8), pantsMat, new Vector3(0, -len / 2, 0));

    const lowerLeg = createLowerLeg();
    lowerLeg.position.set(0, -len, 0);
    leg.add(lowerLeg);
    leg.userData.lowerLeg = lowerLeg;
    return leg;
  }

  // ─── HAND ────────────────────────────────────────────────────
  function createHand() {
    const hand = new Group();
    hand.name = "hand";
    addMesh(hand, new SphereGeometry(0.045, 6, 4), skinMat, new Vector3(0, 0, 0));
    return hand;
  }

  // ─── FOREARM (elbow to wrist) ───────────────────────────────
  function createForearm() {
    const arm = new Group();
    arm.name = "forearm";
    const len = 0.26;
    addMesh(arm, new CylinderGeometry(0.04, 0.05, len, 8), skinMat, new Vector3(0, -len / 2, 0));

    const hand = createHand();
    hand.position.set(0, -len, 0);
    arm.add(hand);
    arm.userData.hand = hand;
    return arm;
  }

  // ─── UPPER ARM (shoulder to elbow) ──────────────────────────
  function createUpperArm() {
    const arm = new Group();
    arm.name = "upperArm";
    const len = 0.3;
    addMesh(arm, new CylinderGeometry(0.045, 0.055, len, 8), skinMat, new Vector3(0, -len / 2, 0));

    const forearm = createForearm();
    forearm.position.set(0, -len, 0);
    arm.add(forearm);
    arm.userData.forearm = forearm;
    return arm;
  }

  // ─── TORSO (pelvis to shoulders) ────────────────────────────
  const torsoGroup = new Group();
  torsoGroup.name = "torso";
  // Use a tapered shape: wider at top, narrower at waist
  // Main torso (wider at top, narrower at waist)
  addMesh(torsoGroup, new CylinderGeometry(0.13, 0.16, 0.38, 8), shirtMat, new Vector3(0, 0.22, 0));
  // Slightly wider chest
  addMesh(torsoGroup, new CylinderGeometry(0.16, 0.17, 0.1, 8), shirtMat, new Vector3(0, 0.44, 0));

  // ─── NECK ───────────────────────────────────────────────────
  const neckGroup = new Group();
  neckGroup.name = "neck";
  neckGroup.position.set(0, 0.5, 0);
  addMesh(neckGroup, new CylinderGeometry(0.04, 0.05, 0.1, 8), skinMat, new Vector3(0, 0.05, 0));

  // ─── HEAD (sphere, eyes, hair) ──────────────────────────────
  const headGroup = new Group();
  headGroup.name = "head";
  headGroup.position.y = 0.1;

  // Head sphere
  addMesh(headGroup, new SphereGeometry(0.1, 12, 10), skinMat, new Vector3(0, 0.1, 0), true);

  // Eyes (positioned at front = +Z)
  for (let ex = -0.04; ex <= 0.04; ex += 0.08) {
    const eyeGeo = new SphereGeometry(0.015, 6, 4);
    const eye = new Mesh(eyeGeo, eyeMat());
    eye.position.set(ex, 0.12, 0.088);
    headGroup.add(eye);
    // Pupil highlight
    const pupilGeo = new SphereGeometry(0.005, 4, 3);
    const pupilMat = new MeshStandardMaterial();
    pupilMat.color = new Color("#FFFFFF");
    pupilMat.roughness = 0.1;
    const pupil = new Mesh(pupilGeo, pupilMat);
    pupil.position.set(ex, 0.122, 0.098);
    headGroup.add(pupil);
  }

  // Nose (tiny bump)
  addMesh(headGroup, new SphereGeometry(0.012, 4, 3), mat("#FFC0A8", { roughness: 0.5 }), new Vector3(0, 0.11, 0.1), false);

  // Hair on top
  addMesh(headGroup, new SphereGeometry(0.105, 8, 6), hairMat, new Vector3(0, 0.135, 0), false);

  // Cap
  addMesh(headGroup, new CylinderGeometry(0.07, 0.09, 0.06, 8), darkShoe, new Vector3(0, 0.17, 0.02), false);
  addMesh(headGroup, new BoxGeometry(0.14, 0.015, 0.07), darkShoe, new Vector3(0, 0.17, 0.08), false);

  neckGroup.add(headGroup);
  torsoGroup.add(neckGroup);

  // ─── SHOULDERS ──────────────────────────────────────────────
  const leftShoulder = new Group();
  leftShoulder.name = "leftShoulder";
  leftShoulder.position.set(-0.19, 0.48, 0);
  const leftArm = createUpperArm();
  leftArm.position.set(0, 0, 0);
  leftShoulder.add(leftArm);
  leftShoulder.userData.arm = leftArm;
  torsoGroup.add(leftShoulder);

  const rightShoulder = new Group();
  rightShoulder.name = "rightShoulder";
  rightShoulder.position.set(0.19, 0.48, 0);
  const rightArm = createUpperArm();
  rightArm.position.set(0, 0, 0);
  rightShoulder.add(rightArm);
  rightShoulder.userData.arm = rightArm;
  torsoGroup.add(rightShoulder);

  // ─── HIPS ───────────────────────────────────────────────────
  const PELVIS_Y = 0.0; // hips pivot at pelvis level

  const leftHip = new Group();
  leftHip.name = "leftHip";
  leftHip.position.set(-0.08, PELVIS_Y, 0);
  const leftLeg = createUpperLeg();
  leftLeg.position.set(0, 0, 0);
  leftHip.add(leftLeg);
  leftHip.userData.leg = leftLeg;
  torsoGroup.add(leftHip);

  const rightHip = new Group();
  rightHip.name = "rightHip";
  rightHip.position.set(0.08, PELVIS_Y, 0);
  const rightLeg = createUpperLeg();
  rightLeg.position.set(0, 0, 0);
  rightHip.add(rightLeg);
  rightHip.userData.leg = rightLeg;
  torsoGroup.add(rightHip);

  // ─── SHADOW DISC ────────────────────────────────────────────
  const shadowGeo = new CircleGeometry(0.18, 16);
  const shadowDiscMat = new MeshBasicMaterial();
  shadowDiscMat.color = new Color("#000000");
  shadowDiscMat.transparent = true;
  shadowDiscMat.opacity = 0.22;
  shadowDiscMat.depthWrite = false;
  const shadowDisc = new Mesh(shadowGeo, shadowDiscMat);
  shadowDisc.rotation.x = -Math.PI / 2;
  shadowDisc.position.y = -0.88;
  shadowDisc.name = "shadow";
  torsoGroup.add(shadowDisc);

  avatar.add(torsoGroup);
  avatar.position.set(SPAWN[0], SPAWN[1], SPAWN[2]);
  scene.add(avatar);

  return avatar;
}

// ═══════════════════════════════════════════════════════════════
// MOBILE VIRTUAL JOYSTICK
// ═══════════════════════════════════════════════════════════════
function VirtualJoystick({ onMove, onCameraDelta }) {
  const containerRef = useRef(null);
  const joystickRef = useRef(null);
  const activeRef = useRef(false);
  const baseRef = useRef({ x: 0, y: 0 });
  const camActiveRef = useRef(false);
  const camBaseRef = useRef({ x: 0, y: 0 });

  const getPos = useCallback((e) => {
    const t = e.touches?.[0] ?? e;
    return { x: t.clientX, y: t.clientY };
  }, []);

  const handleDown = useCallback((e) => {
    e.preventDefault();
    const pos = getPos(e);
    const rect = e.currentTarget.getBoundingClientRect();
    const relX = pos.x - rect.left, relY = pos.y - rect.top;

    // Left side = joystick, right side = camera
    if (relX < rect.width * 0.45) {
      activeRef.current = true;
      baseRef.current = { x: pos.x, y: pos.y };
    } else {
      camActiveRef.current = true;
      camBaseRef.current = { x: pos.x, y: pos.y };
    }
  }, [getPos]);

  const handleMove = useCallback((e) => {
    e.preventDefault();
    const pos = getPos(e);

    if (activeRef.current) {
      const dx = pos.x - baseRef.current.x;
      const dy = pos.y - baseRef.current.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const maxR = 70;
      const clamped = dist > maxR ? { x: (dx / dist) * maxR, y: (dy / dist) * maxR } : { x: dx, y: dy };
      onMove?.(clamped.x / maxR, -clamped.y / maxR);
    }

    if (camActiveRef.current) {
      const dx = pos.x - camBaseRef.current.x;
      onCameraDelta?.(dx);
      camBaseRef.current = { x: pos.x, y: pos.y };
    }
  }, [onMove, onCameraDelta, getPos]);

  const handleUp = useCallback((e) => {
    e.preventDefault();
    activeRef.current = false;
    camActiveRef.current = false;
    onMove?.(0, 0);
  }, [onMove]);

  return (
    <div
      ref={containerRef}
      onTouchStart={handleDown}
      onTouchMove={handleMove}
      onTouchEnd={handleUp}
      className="absolute inset-0 z-50"
      style={{ touchAction: "none" }}
    >
      {/* Visual indicators removed — keep it invisible and functional */}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════
export default function CityCanvas({ onLoaded }) {
  const canvasRef = useRef(null);
  const [error, setError] = useState(null);
  const [isMobile, setIsMobile] = useState(false);
  const onLoadedRef = useRef(onLoaded);
  onLoadedRef.current = onLoaded;

  useEffect(() => {
    setIsMobile(/iPhone|iPad|iPod|Android/i.test(navigator.userAgent));
  }, []);

  const sceneRef = useRef(null);
  const avatarRef = useRef(null);
  const avatarPosRef = useRef([...SPAWN, 0]); // [x, y, z, rotY]
  const velocityRef = useRef({ x: 0, z: 0 });
  const targetRotRef = useRef(0);
  const keysRef = useRef({});
  const mouseRef = useRef({ down: false, dx: 0, dy: 0 });
  const animRef = useRef({
    walkTime: 0,
    isMoving: false,
    speed: 0,
    prevWalkTime: 0,
  });
  const lastTimeRef = useRef(0);
  const frameRef = useRef(0);
  const initializedRef = useRef(false);

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
        alpha: false,
      });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.setSize(canvas.clientWidth, canvas.clientHeight);
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = PCFSoftShadowMap;

      const scene = new Scene();
      sceneRef.current = scene;

      const camera = new PerspectiveCamera(
        55,
        canvas.clientWidth / canvas.clientHeight,
        0.1,
        80
      );
      camera.position.set(0, 4, 8);
      camera.lookAt(0, 0.7, 0);

      buildPark(scene);
      const avatar = createAvatar(scene);
      avatarRef.current = avatar;

      let torso = null;
      let leftShoulder = null;
      let rightShoulder = null;
      let leftHip = null;
      let rightHip = null;
      avatar.traverse((child) => {
        if (child.name === "torso") torso = child;
        if (child.name === "leftShoulder") leftShoulder = child;
        if (child.name === "rightShoulder") rightShoulder = child;
        if (child.name === "leftHip") leftHip = child;
        if (child.name === "rightHip") rightHip = child;
      });

      const animParts = { torso, leftShoulder, rightShoulder, leftHip, rightHip };

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
        let [px, py, pz, rot] = avatarPosRef.current;
        const vel = velocityRef.current;

        // ─── INPUT ──────────────────────────────────────────────
        let inputX = 0, inputZ = 0;
        let turnInput = 0;

        // Forward / Backward — relative to facing direction
        if (keys.w || keys.arrowup) { inputX += Math.sin(rot); inputZ += Math.cos(rot); }
        if (keys.s || keys.arrowdown) { inputX -= Math.sin(rot); inputZ -= Math.cos(rot); }

        // Rotate left / right — affects rotation only, not position
        // Three.js Y-axis: positive = counterclockwise (left turn)
        if (keys.a || keys.arrowleft) turnInput = 1;
        if (keys.d || keys.arrowright) turnInput = -1;

        const inputMag = Math.sqrt(inputX * inputX + inputZ * inputZ);
        const isMoving = inputMag > 0.1;
        const isTurning = Math.abs(turnInput) > 0.01;

        // ─── MOUSE LOOK ─────────────────────────────────────────
        if (mouse.down) {
          rot += mouse.dx * 0.004;
          targetRotRef.current = rot;
          mouse.dx = 0;
        }

        // ─── TURNING (A/D keys) ─────────────────────────────────
        if (isTurning) {
          rot += turnInput * TURN_SPEED * dt;
          targetRotRef.current = rot;
        }

        // ─── VELOCITY WITH SMOOTH ACCEL/DECEL ──────────────────
        if (isMoving) {
          inputX /= inputMag;
          inputZ /= inputMag;

          // Only auto-face toward movement when moving forward
          // (don't rotate when moving backward or while manually turning)
          const moveDot = inputX * Math.sin(rot) + inputZ * Math.cos(rot);
          if (!isTurning && moveDot > -0.3) {
            const moveAngle = Math.atan2(inputX, inputZ);
            targetRotRef.current = moveAngle;
          }

          // Accelerate
          vel.x += (inputX * MOVE_SPEED - vel.x) * Math.min(1, ACCELERATION * dt);
          vel.z += (inputZ * MOVE_SPEED - vel.z) * Math.min(1, ACCELERATION * dt);
        } else {
          // Decelerate
          vel.x += (0 - vel.x) * Math.min(1, DECELERATION * dt);
          vel.z += (0 - vel.z) * Math.min(1, DECELERATION * dt);
        }

        // Smoother rotation lerp
        let targetRot = targetRotRef.current;
        // Wrap angle difference
        let diff = targetRot - rot;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        rot += diff * Math.min(1, ROTATION_SMOOTH * dt);

        // Apply velocity
        const speed = Math.sqrt(vel.x * vel.x + vel.z * vel.z);
        px += vel.x * dt;
        pz += vel.z * dt;

        // Collisions
        [px, pz] = resolveCollisions(px, pz, 0.3, COLLISION_BOXES);

        // Ground clamp
        py = SPAWN[1];

        avatarPosRef.current = [px, py, pz, rot];
        avatar.position.set(px, py, pz);
        avatar.rotation.y = rot;

        // ─── CAMERA ─────────────────────────────────────────────
        const camDist = 5;
        const camHeight = 3.8;
        const behindX = px - Math.sin(rot) * camDist;
        const behindZ = pz - Math.cos(rot) * camDist;
        const camTarget = new Vector3(behindX, py + camHeight, behindZ);
        camera.position.lerp(camTarget, 1 - Math.exp(-4 * dt));
        camera.lookAt(px, py + 0.65, pz);

        // ═════════════════════════════════════════════════════════
        // ANIMATION SYSTEM
        // ═════════════════════════════════════════════════════════
        const anim = animRef.current;
        anim.isMoving = speed > 0.1;

        // Detect backward movement for walk cycle direction reversal
        const facingDot = vel.x * Math.sin(rot) + vel.z * Math.cos(rot);
        const isBackward = facingDot < -0.15;
        const walkDir = isBackward ? -1 : 1;

        if (anim.isMoving) {
          anim.walkTime += speed * WALK_CYCLE_SPEED * walkDir * dt;
          anim.speed = Math.min(1, anim.speed + dt * 6);
        } else {
          anim.walkTime += anim.prevWalkTime * 0.3 * dt;
          anim.speed = Math.max(0, anim.speed - dt * 4);
        }
        anim.prevWalkTime = anim.isMoving ? speed * WALK_CYCLE_SPEED * walkDir : 0;

        const wt = anim.walkTime;
        const s = anim.speed;

        // ─── TORSO ──────────────────────────────────────────────
        if (animParts.torso) {
          const bob = Math.abs(Math.sin(wt * 2)) * 0.035 * s;
          const lean = vel.x * 0.015;
          const leanZ = vel.z * 0.015;
          animParts.torso.position.y = bob;
          animParts.torso.rotation.x = leanZ;
          animParts.torso.rotation.z = lean;
        }

        // ─── LEGS ───────────────────────────────────────────────
        // Hip rotation: smooth sine wave, opposing legs
        const hipAngle = Math.sin(wt) * 0.5 * s;

        if (animParts.leftHip) animParts.leftHip.rotation.x = hipAngle;
        if (animParts.rightHip) animParts.rightHip.rotation.x = -hipAngle;

        // Knee bend: bend when leg is forward (lifting foot), straight when planted
        // Left knee bends when left hip is forward (wt: π/2 → 3π/2, sin > 0 means forward)
        const lkneeAngle = Math.max(0, Math.sin(wt)) * 0.6 * s;
        const rkneeAngle = Math.max(0, -Math.sin(wt)) * 0.6 * s;

        const llLeg = animParts.leftHip?.userData?.leg?.userData?.lowerLeg;
        const rlLeg = animParts.rightHip?.userData?.leg?.userData?.lowerLeg;
        if (llLeg) llLeg.rotation.x = lkneeAngle;
        if (rlLeg) rlLeg.rotation.x = rkneeAngle;

        // ─── ARMS ───────────────────────────────────────────────
        // Shoulder swing: opposite to same-side leg (right arm with left leg)
        const shoulderAngle = Math.sin(wt) * 0.45 * s;

        if (animParts.leftShoulder) animParts.leftShoulder.rotation.x = -shoulderAngle;
        if (animParts.rightShoulder) animParts.rightShoulder.rotation.x = shoulderAngle;

        // Forearm bend: slight bend when arm swings back
        const larmForearm = animParts.leftShoulder?.userData?.arm?.userData?.forearm;
        const rarmForearm = animParts.rightShoulder?.userData?.arm?.userData?.forearm;
        const forearmBend = Math.max(0, Math.sin(wt)) * 0.35 * s;
        const forearmBendR = Math.max(0, -Math.sin(wt)) * 0.35 * s;
        if (larmForearm) larmForearm.rotation.x = forearmBendR;
        if (rarmForearm) rarmForearm.rotation.x = forearmBend;

        // Torso breathing when idle
        if (!anim.isMoving) {
          const breathe = Math.sin(t * 1.8) * 0.012;
          if (animParts.torso) animParts.torso.scale.y = 1 + breathe;
          // Gentle arm sway at rest
          const idleSway = Math.sin(t * 0.8) * 0.04;
          if (animParts.leftShoulder) {
            animParts.leftShoulder.rotation.x += (-0.12 - animParts.leftShoulder.rotation.x) * dt * 3;
            animParts.leftShoulder.rotation.z += (idleSway - animParts.leftShoulder.rotation.z) * dt * 3;
          }
          if (animParts.rightShoulder) {
            animParts.rightShoulder.rotation.x += (-0.12 - animParts.rightShoulder.rotation.x) * dt * 3;
            animParts.rightShoulder.rotation.z += (-idleSway - animParts.rightShoulder.rotation.z) * dt * 3;
          }
        } else {
          // Reset shoulder Z during walk
          if (animParts.leftShoulder) animParts.leftShoulder.rotation.z += (0 - animParts.leftShoulder.rotation.z) * dt * 5;
          if (animParts.rightShoulder) animParts.rightShoulder.rotation.z += (0 - animParts.rightShoulder.rotation.z) * dt * 5;
        }

        renderer.render(scene, camera);
        frameRef.current++;

        if (frameRef.current === 3) onLoadedRef.current?.();
      };

      animate();

      const onResize = () => {
        if (!canvas) return;
        const w = canvas.clientWidth;
        const h = canvas.clientHeight;
        renderer.setSize(w, h);
        camera.aspect = w / h;
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
      };
    } catch (e) {
      console.error("[CityCanvas] init error:", e);
      setError(e.message || String(e));
    }
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
      }
    };
    const onUp = () => { mouseRef.current.down = false; };
    const onMove = (e) => {
      if (mouseRef.current.down) {
        mouseRef.current.dx += e.movementX;
      }
    };
    window.addEventListener("mousedown", onDown);
    window.addEventListener("mouseup", onUp);
    window.addEventListener("mousemove", onMove);
    return () => {
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("mouseup", onUp);
      window.removeEventListener("mousemove", onMove);
    };
  }, []);

  // Mobile joystick handlers
  const handleJoystickMove = useCallback((jx, jy) => {
    keysRef.current.w = jy > 0.15;
    keysRef.current.s = jy < -0.15;
    keysRef.current.a = jx < -0.15;
    keysRef.current.d = jx > 0.15;

    if (Math.abs(jx) > 0.15 || Math.abs(jy) > 0.15) {
      // Smooth face-direction from joystick
      targetRotRef.current = Math.atan2(jx, jy);
    }
  }, []);

  const handleCameraDelta = useCallback((dx) => {
    avatarPosRef.current[3] += dx * 0.004;
    targetRotRef.current = avatarPosRef.current[3];
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
    <div className="relative w-full h-full" style={{ position: "relative" }}>
      <canvas
        ref={canvasRef}
        className="w-full h-full block"
        style={{ touchAction: "none" }}
      />
      {isMobile && (
        <VirtualJoystick
          onMove={handleJoystickMove}
          onCameraDelta={handleCameraDelta}
        />
      )}
    </div>
  );
}