import React, { useRef, useEffect, useState, useCallback } from "react";
import * as THREE from "three";
import { SPAWN, TREE_POSITIONS, PARK_RADIUS } from "./cityData";

// ─── CONSTANTS ────────────────────────────────────────────────
const MOVE_SPEED = 2.8;
const TURN_SPEED = 1.8;

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
function mat(color, opts = {}) {
  return new THREE.MeshStandardMaterial({
    color,
    roughness: opts.roughness ?? 0.5,
    metalness: opts.metalness ?? 0.05,
    ...opts,
  });
}

// ═══════════════════════════════════════════════════════════════
// BUILD SCENE: Simple outdoor park
// ═══════════════════════════════════════════════════════════════
function buildPark(scene) {
  // ─── SKY ────────────────────────────────────────────────────
  scene.background = new THREE.Color("#87CEEB");
  scene.fog = new THREE.Fog("#C8E6C9", 25, 55);

  // ─── GRASS GROUND ───────────────────────────────────────────
  const groundGeo = new THREE.PlaneGeometry(80, 80);
  const ground = new THREE.Mesh(groundGeo, mat("#4CAF50", { roughness: 0.85 }));
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.01;
  ground.receiveShadow = true;
  scene.add(ground);

  // Inner walking area — slightly different green
  const innerGeo = new THREE.PlaneGeometry(PARK_RADIUS * 2, PARK_RADIUS * 2);
  const inner = new THREE.Mesh(innerGeo, mat("#5CB860", { roughness: 0.75 }));
  inner.rotation.x = -Math.PI / 2;
  inner.position.y = -0.005;
  inner.receiveShadow = true;
  scene.add(inner);

  // Dirt path circle
  const pathRing = new THREE.RingGeometry(12, 12.6, 64);
  const path = new THREE.Mesh(pathRing, mat("#C8A96E", { roughness: 0.9 }));
  path.rotation.x = -Math.PI / 2;
  path.position.y = 0.001;
  path.receiveShadow = true;
  scene.add(path);

  // Central dirt patch
  const centerGeo = new THREE.CircleGeometry(3, 32);
  const center = new THREE.Mesh(centerGeo, mat("#C8A96E", { roughness: 0.9 }));
  center.rotation.x = -Math.PI / 2;
  center.position.y = 0.002;
  center.receiveShadow = true;
  scene.add(center);

  // ─── TREES ──────────────────────────────────────────────────
  TREE_POSITIONS.forEach(([tx, tz, scale]) => {
    const tree = new THREE.Group();

    // Trunk
    const trunkGeo = new THREE.CylinderGeometry(0.08 * scale, 0.12 * scale, 2 * scale, 8);
    const trunk = new THREE.Mesh(trunkGeo, mat("#6D4C41", { roughness: 0.7 }));
    trunk.position.y = 1 * scale;
    trunk.castShadow = true;
    trunk.receiveShadow = true;
    tree.add(trunk);

    // Canopy layers — simple spheres for a leafy look
    const canopyColors = ["#388E3C", "#43A047", "#2E7D32"];
    for (let i = 0; i < 3; i++) {
      const canopyGeo = new THREE.SphereGeometry(0.6 * scale - i * 0.08, 8, 6);
      const canopy = new THREE.Mesh(canopyGeo, mat(canopyColors[i], { roughness: 0.6 }));
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
    const bushGeo = new THREE.SphereGeometry(0.2 + Math.random() * 0.25, 6, 5);
    const bush = new THREE.Mesh(bushGeo, mat("#388E3C", { roughness: 0.55 }));
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

    // Stem
    const stemGeo = new THREE.CylinderGeometry(0.01, 0.01, 0.25, 4);
    const stem = new THREE.Mesh(stemGeo, mat("#388E3C"));
    stem.position.set(fx, 0.12, fz);
    scene.add(stem);

    // Petal
    const petalGeo = new THREE.SphereGeometry(0.03, 4, 4);
    const petal = new THREE.Mesh(petalGeo, mat(flowerColors[i % flowerColors.length]));
    petal.position.set(fx, 0.26, fz);
    scene.add(petal);
  }

  // ─── BENCHES ────────────────────────────────────────────────
  const benchPositions = [
    [0, 5.5, 0], [0, -5.5, Math.PI], [5.5, 0, Math.PI / 2], [-5.5, 0, -Math.PI / 2],
  ];
  benchPositions.forEach(([bx, bz, rot]) => {
    const bench = new THREE.Group();
    const seatGeo = new THREE.BoxGeometry(2, 0.06, 0.5);
    const seat = new THREE.Mesh(seatGeo, mat("#8D6E63", { roughness: 0.5 }));
    seat.position.y = 0.45;
    seat.castShadow = true;
    bench.add(seat);
    // Legs
    for (let lx = -0.8; lx <= 0.8; lx += 1.6) {
      for (let lz = -0.15; lz <= 0.15; lz += 0.3) {
        const legGeo = new THREE.BoxGeometry(0.06, 0.42, 0.06);
        const leg = new THREE.Mesh(legGeo, mat("#5D4037", { roughness: 0.4 }));
        leg.position.set(lx, 0.21, lz);
        leg.castShadow = true;
        bench.add(leg);
      }
    }
    // Backrest
    const backGeo = new THREE.BoxGeometry(2, 0.35, 0.05);
    const back = new THREE.Mesh(backGeo, mat("#8D6E63", { roughness: 0.5 }));
    back.position.set(0, 0.65, -0.22);
    back.castShadow = true;
    bench.add(back);
    bench.position.set(bx, 0, bz);
    bench.rotation.y = rot;
    scene.add(bench);
  });

  // ─── LIGHTING ───────────────────────────────────────────────
  // Sun (directional)
  const sun = new THREE.DirectionalLight("#FFF8E1", 1.2);
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

  // Sky / ambient
  scene.add(new THREE.AmbientLight("#BBDEFB", 0.55));

  // Subtle fill light from below (bounce from grass)
  scene.add(new THREE.HemisphereLight("#87CEEB", "#388E3C", 0.3));
}

// ═══════════════════════════════════════════════════════════════
// BUILD HUMAN AVATAR from box geometries
// ═══════════════════════════════════════════════════════════════
function createAvatar(scene) {
  const avatar = new THREE.Group();
  avatar.name = "avatar";

  // ─── BODY PARTS (build bottom-up so pivots chain correctly) ──

  // === FEET ===
  function createFoot() {
    const foot = new THREE.Group();
    foot.name = "foot";
    const geo = new THREE.BoxGeometry(0.14, 0.08, 0.22);
    const mesh = new THREE.Mesh(geo, mat("#1A1A1A", { roughness: 0.3 }));
    mesh.position.set(0, 0.04, 0.05);
    mesh.castShadow = true;
    foot.add(mesh);
    return foot;
  }

  // === LOWER LEG ===
  function createLowerLeg() {
    const leg = new THREE.Group();
    leg.name = "lowerLeg";
    const geo = new THREE.BoxGeometry(0.11, 0.42, 0.11);
    const mesh = new THREE.Mesh(geo, mat("#1565C0", { roughness: 0.3 }));
    mesh.position.y = 0.21;
    mesh.castShadow = true;
    leg.add(mesh);
    // Knee cap
    const kneeGeo = new THREE.BoxGeometry(0.13, 0.03, 0.13);
    const knee = new THREE.Mesh(kneeGeo, mat("#0D47A1", { roughness: 0.2 }));
    knee.position.y = 0.42;
    leg.add(knee);

    const foot = createFoot();
    foot.position.set(0, -0.02, 0);
    leg.add(foot);
    leg.userData.foot = foot;
    return leg;
  }

  // === UPPER LEG ===
  function createUpperLeg() {
    const leg = new THREE.Group();
    leg.name = "upperLeg";
    const geo = new THREE.BoxGeometry(0.12, 0.44, 0.12);
    const mesh = new THREE.Mesh(geo, mat("#1565C0", { roughness: 0.3 }));
    mesh.position.y = 0.22;
    mesh.castShadow = true;
    leg.add(mesh);

    const lowerLeg = createLowerLeg();
    lowerLeg.position.set(0, -0.42, 0);
    leg.add(lowerLeg);
    leg.userData.lowerLeg = lowerLeg;
    return leg;
  }

  // === HAND ===
  function createHand() {
    const hand = new THREE.Group();
    hand.name = "hand";
    const geo = new THREE.BoxGeometry(0.07, 0.08, 0.07);
    const mesh = new THREE.Mesh(geo, mat("#FFCCBC", { roughness: 0.4 }));
    mesh.castShadow = true;
    hand.add(mesh);
    return hand;
  }

  // === FOREARM ===
  function createForearm() {
    const arm = new THREE.Group();
    arm.name = "forearm";
    const geo = new THREE.BoxGeometry(0.09, 0.32, 0.09);
    const mesh = new THREE.Mesh(geo, mat("#FFCCBC", { roughness: 0.4 }));
    mesh.position.y = 0.16;
    mesh.castShadow = true;
    arm.add(mesh);

    const hand = createHand();
    hand.position.set(0, -0.32, 0);
    arm.add(hand);
    arm.userData.hand = hand;
    return arm;
  }

  // === UPPER ARM ===
  function createUpperArm() {
    const arm = new THREE.Group();
    arm.name = "upperArm";
    const geo = new THREE.BoxGeometry(0.10, 0.36, 0.10);
    const mesh = new THREE.Mesh(geo, mat("#FFCCBC", { roughness: 0.4 }));
    mesh.position.y = 0.18;
    mesh.castShadow = true;
    arm.add(mesh);

    const forearm = createForearm();
    forearm.position.set(0, -0.36, 0);
    arm.add(forearm);
    arm.userData.forearm = forearm;
    return arm;
  }

  // === TORSO ===
  const torsoGroup = new THREE.Group();
  torsoGroup.name = "torso";
  const torsoGeo = new THREE.BoxGeometry(0.38, 0.55, 0.22);
  const torsoMesh = new THREE.Mesh(torsoGeo, mat("#1565C0", { roughness: 0.25 }));
  torsoMesh.position.y = 0.275;
  torsoMesh.castShadow = true;
  torsoGroup.add(torsoMesh);

  // Shirt detail (collar)
  const collarGeo = new THREE.BoxGeometry(0.2, 0.04, 0.16);
  const collar = new THREE.Mesh(collarGeo, mat("#FFFFFF", { roughness: 0.3 }));
  collar.position.set(0, 0.57, 0.04);
  torsoGroup.add(collar);

  // === HEAD ===
  const headGroup = new THREE.Group();
  headGroup.name = "head";
  headGroup.position.y = 0.58;

  const headGeo = new THREE.BoxGeometry(0.2, 0.22, 0.2);
  const headMesh = new THREE.Mesh(headGeo, mat("#FFCCBC", { roughness: 0.4 }));
  headMesh.position.y = 0.11;
  headMesh.castShadow = true;
  headGroup.add(headMesh);

  // Eyes
  for (let ex = -0.05; ex <= 0.05; ex += 0.1) {
    const eyeGeo = new THREE.BoxGeometry(0.03, 0.03, 0.01);
    const eye = new THREE.Mesh(eyeGeo, mat("#000000"));
    eye.position.set(ex, 0.14, 0.105);
    headGroup.add(eye);
  }

  // Hair
  const hairGeo = new THREE.BoxGeometry(0.22, 0.06, 0.22);
  const hair = new THREE.Mesh(hairGeo, mat("#3E2723", { roughness: 0.5 }));
  hair.position.set(0, 0.23, 0);
  headGroup.add(hair);

  // Cap/hat
  const capGeo = new THREE.BoxGeometry(0.18, 0.04, 0.22);
  const cap = new THREE.Mesh(capGeo, mat("#1A1A1A", { roughness: 0.3 }));
  cap.position.set(0, 0.26, 0.02);
  headGroup.add(cap);

  const capBrimGeo = new THREE.BoxGeometry(0.2, 0.02, 0.06);
  const capBrim = new THREE.Mesh(capBrimGeo, mat("#1A1A1A", { roughness: 0.3 }));
  capBrim.position.set(0, 0.24, 0.12);
  headGroup.add(capBrim);

  torsoGroup.add(headGroup);

  // === SHOULDER JOINTS ===
  const leftShoulder = new THREE.Group();
  leftShoulder.name = "leftShoulder";
  leftShoulder.position.set(-0.22, 0.5, 0);
  const leftArm = createUpperArm();
  leftArm.position.set(0, -0.02, 0);
  leftShoulder.add(leftArm);
  leftShoulder.userData.arm = leftArm;
  torsoGroup.add(leftShoulder);

  const rightShoulder = new THREE.Group();
  rightShoulder.name = "rightShoulder";
  rightShoulder.position.set(0.22, 0.5, 0);
  const rightArm = createUpperArm();
  rightArm.position.set(0, -0.02, 0);
  rightShoulder.add(rightArm);
  rightShoulder.userData.arm = rightArm;
  torsoGroup.add(rightShoulder);

  // === HIP JOINTS ===
  const leftHip = new THREE.Group();
  leftHip.name = "leftHip";
  leftHip.position.set(-0.09, 0.02, 0);
  const leftLeg = createUpperLeg();
  leftLeg.position.set(0, -0.02, 0);
  leftHip.add(leftLeg);
  leftHip.userData.leg = leftLeg;
  torsoGroup.add(leftHip);

  const rightHip = new THREE.Group();
  rightHip.name = "rightHip";
  rightHip.position.set(0.09, 0.02, 0);
  const rightLeg = createUpperLeg();
  rightLeg.position.set(0, -0.02, 0);
  rightHip.add(rightLeg);
  rightHip.userData.leg = rightLeg;
  torsoGroup.add(rightHip);

  // Shadow disc at feet
  const shadowGeo = new THREE.CircleGeometry(0.2, 16);
  const shadowDisc = new THREE.Mesh(shadowGeo, new THREE.MeshBasicMaterial({
    color: "#000000",
    transparent: true,
    opacity: 0.25,
    depthWrite: false,
  }));
  shadowDisc.rotation.x = -Math.PI / 2;
  shadowDisc.position.y = -0.75;
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

  useEffect(() => {
    setIsMobile(/iPhone|iPad|iPod|Android/i.test(navigator.userAgent));
  }, []);

  const sceneRef = useRef(null);
  const avatarRef = useRef(null);
  const avatarPosRef = useRef([...SPAWN, 0]); // [x, y, z, rotY]
  const keysRef = useRef({});
  const mouseRef = useRef({ down: false, dx: 0, dy: 0 });
  const animRef = useRef({
    walkTime: 0,
    isMoving: false,
    speed: 0,
  });
  const frameRef = useRef(0);

  // Init scene
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    try {
      const renderer = new THREE.WebGLRenderer({
        canvas,
        antialias: true,
        alpha: false,
      });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.setSize(canvas.clientWidth, canvas.clientHeight);
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;

      const scene = new THREE.Scene();
      sceneRef.current = scene;

      const camera = new THREE.PerspectiveCamera(
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
        const dt = Math.min(0.05, 0.016);
        const t = Date.now() * 0.001;

        const keys = keysRef.current;
        const mouse = mouseRef.current;
        let [px, py, pz, rot] = avatarPosRef.current;

        // Mouse camera rotation
        if (mouse.down) {
          rot += mouse.dx * 0.004;
          mouse.dx = 0;
        }

        // WASD movement
        let mx = 0, mz = 0;
        if (keys.w || keys.arrowup) { mx += Math.sin(rot); mz += Math.cos(rot); }
        if (keys.s || keys.arrowdown) { mx -= Math.sin(rot); mz -= Math.cos(rot); }
        if (keys.a || keys.arrowleft) { mx -= Math.cos(rot); mz += Math.sin(rot); }
        if (keys.d || keys.arrowright) { mx += Math.cos(rot); mz -= Math.sin(rot); }

        const mag = Math.sqrt(mx * mx + mz * mz);
        const isMoving = mag > 0.01;
        if (isMoving) {
          mx = (mx / mag) * MOVE_SPEED * dt;
          mz = (mz / mag) * MOVE_SPEED * dt;
        }

        px += mx;
        pz += mz;

        // Collisions
        [px, pz] = resolveCollisions(px, pz, 0.3, COLLISION_BOXES);

        avatarPosRef.current = [px, py, pz, rot];
        avatar.position.set(px, py, pz);
        avatar.rotation.y = rot + Math.PI;

        // Camera follows behind avatar
        const camDist = 5;
        const camHeight = 3.8;
        const behindX = px - Math.sin(rot) * camDist;
        const behindZ = pz - Math.cos(rot) * camDist;
        camera.position.lerp(
          new THREE.Vector3(behindX, py + camHeight, behindZ),
          0.06
        );
        camera.lookAt(px, py + 0.6, pz);

        // ─── WALK / IDLE ANIMATION ──────────────────────────────
        const anim = animRef.current;
        anim.isMoving = isMoving;

        if (isMoving) {
          anim.walkTime += dt * (mag / (MOVE_SPEED * dt)) * 8;
          anim.speed = Math.min(1, anim.speed + dt * 8);
        } else {
          anim.walkTime *= 0.9;
          anim.speed = Math.max(0, anim.speed - dt * 5);
        }

        const wt = anim.walkTime;
        const s = anim.speed;

        // Body bob
        const bobAmount = Math.abs(Math.sin(wt * 2)) * 0.04 * s;
        if (animParts.torso) {
          animParts.torso.position.y = bobAmount;
        }

        // Leg swing (±0.6 rad forward/back)
        const legSwing = Math.sin(wt) * 0.55 * s;
        if (animParts.leftHip) animParts.leftHip.rotation.x = legSwing;
        if (animParts.rightHip) animParts.rightHip.rotation.x = -legSwing;

        // Knee bend at peak
        if (animParts.leftHip?.userData?.leg?.userData?.lowerLeg) {
          animParts.leftHip.userData.leg.userData.lowerLeg.rotation.x = Math.abs(Math.sin(wt)) * 0.35 * s;
        }
        if (animParts.rightHip?.userData?.leg?.userData?.lowerLeg) {
          animParts.rightHip.userData.leg.userData.lowerLeg.rotation.x = Math.abs(Math.sin(wt)) * 0.35 * s;
        }

        // Arm swing (opposite to legs)
        const armSwing = Math.sin(wt + Math.PI) * 0.5 * s;
        if (animParts.leftShoulder) animParts.leftShoulder.rotation.x = armSwing;
        if (animParts.rightShoulder) animParts.rightShoulder.rotation.x = -armSwing;

        // Idle: slight breathing
        if (!isMoving) {
          const breathe = Math.sin(t * 1.5) * 0.015;
          if (animParts.torso) animParts.torso.scale.y = 1 + breathe;
          // Arms rest slightly at sides
          if (animParts.leftShoulder) {
            animParts.leftShoulder.rotation.x += (-0.15 - animParts.leftShoulder.rotation.x) * 0.1;
            animParts.leftShoulder.rotation.z += (-0.1 - animParts.leftShoulder.rotation.z) * 0.1;
          }
          if (animParts.rightShoulder) {
            animParts.rightShoulder.rotation.x += (-0.15 - animParts.rightShoulder.rotation.x) * 0.1;
            animParts.rightShoulder.rotation.z += (0.1 - animParts.rightShoulder.rotation.z) * 0.1;
          }
        } else {
          // Reset shoulder Z during walk
          if (animParts.leftShoulder) animParts.leftShoulder.rotation.z += (0 - animParts.leftShoulder.rotation.z) * 0.2;
          if (animParts.rightShoulder) animParts.rightShoulder.rotation.z += (0 - animParts.rightShoulder.rotation.z) * 0.2;
        }

        renderer.render(scene, camera);
        frameRef.current++;

        if (frameRef.current === 3) onLoaded?.();
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
      setError(e.message || String(e));
    }
  }, [onLoaded]);

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

    if (jy > 0.15 || jy < -0.15 || jx > 0.15 || jx < -0.15) {
      // Override with proportional movement for smoother feel
      avatarPosRef.current[3] = Math.atan2(jx, jy);
    }
  }, []);

  const handleCameraDelta = useCallback((dx) => {
    avatarPosRef.current[3] += dx * 0.005;
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