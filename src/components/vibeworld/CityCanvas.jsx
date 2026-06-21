import React, { useRef, useEffect, useState, useCallback } from "react";
import * as THREE from "three";
import { SPAWN, TREE_POSITIONS, PARK_RADIUS } from "./cityData";
import createCitySkyline from "./CitySkyline";
import createVibeShop from "./VibeShop";

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

  // Beach shoreline boundary — stop at water's edge
  const SHORELINE_Z = 20;
  if (z > 0) {
    if (z > SHORELINE_Z) z = SHORELINE_Z;
    if (x < -24) x = -24;
    if (x > 24) x = 24;
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
    transparent: true, opacity: 0.12, depthWrite: false, side: THREE.DoubleSide,
  });
  const back = new Mesh(backGeo, backMat);
  back.name = "neonBack";
  group.add(back);

  // Neon border frame
  const borderGeo = new PlaneGeometry(7.1, 2.1);
  const borderMat = new MeshBasicMaterial({
    color: new Color(colorHex),
    transparent: true, opacity: 0.35, depthWrite: false, side: THREE.DoubleSide,
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
  group.userData = { isNeonSign: true, baseOpacity: 0.35, colorHex };
  scene.add(group);
}

// ─── Path accent lights — small glowing dots along paths ───────
function addPathLights(scene, fromX, fromZ, toX, toZ, colorHex) {
  const dx = toX - fromX, dz = toZ - fromZ;
  const len = Math.sqrt(dx * dx + dz * dz);
  const step = 1.8;
  const count = Math.floor(len / step);

  for (let i = 1; i <= count; i++) {
    const t = i / (count + 1);
    const px = fromX + dx * t;
    const pz = fromZ + dz * t;

    const dot = new Mesh(
      new SphereGeometry(0.06, 6, 4),
      new MeshBasicMaterial({ color: new Color(colorHex), depthWrite: false, transparent: true, opacity: 0.6 })
    );
    dot.position.set(px, 0.06, pz);
    dot.userData = { isPathDot: true, baseColor: colorHex, phase: t * Math.PI * 2 };
    scene.add(dot);
  }
}

function buildPark(scene) {
  createCosmicSky(scene);
  createCitySkyline(scene);

  const SHORELINE_Z = 20;
  const OCEAN_DEPTH = 54;

  // ═════════════════════════════════════════════════════════════
  // 1. GROUND — dark urban plaza floor
  // ═════════════════════════════════════════════════════════════
  const groundGeo = new PlaneGeometry(56, 44);
  const groundMat = mat("#1A1A2E", { roughness: 0.85 });
  const ground = new Mesh(groundGeo, groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(0, -0.01, -9);
  ground.receiveShadow = true;
  ground.name = "plazaGround";
  scene.add(ground);

  // ═════════════════════════════════════════════════════════════
  // 2. UVC CENTRAL PLAZA — circular hub at center
  // ═════════════════════════════════════════════════════════════
  const PLAZA_X = 0, PLAZA_Z = -4, PLAZA_R = 7;

  const plazaDisc = new Mesh(
    new CircleGeometry(PLAZA_R, 64),
    mat("#1E1E36", { roughness: 0.5, metalness: 0.25 })
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

  // Outer purple ring
  const ringOuter = new Mesh(
    new RingGeometry(PLAZA_R - 0.5, PLAZA_R - 0.2, 64),
    new MeshBasicMaterial({ color: new Color("#A078FF"), depthWrite: false, side: THREE.DoubleSide })
  );
  ringOuter.rotation.x = -Math.PI / 2;
  ringOuter.position.set(PLAZA_X, 0.005, PLAZA_Z);
  ringOuter.renderOrder = 1;
  scene.add(ringOuter);

  // ═════════════════════════════════════════════════════════════
  // 3. GLOWING PATHS — neon walkways to every zone
  // ═════════════════════════════════════════════════════════════
  const pathGlow = new MeshBasicMaterial({ color: new Color("#00D4F0"), depthWrite: false, transparent: true, opacity: 0.18 });
  const pathFill = new MeshBasicMaterial({ color: new Color("#1A1A32"), depthWrite: false, transparent: true, opacity: 0.4 });

  function createPath(fromX, fromZ, toX, toZ) {
    const dx = toX - fromX, dz = toZ - fromZ;
    const len = Math.sqrt(dx * dx + dz * dz);
    const midX = (fromX + toX) / 2, midZ = (fromZ + toZ) / 2;
    const angle = Math.atan2(dx, dz);

    const pathStrip = new Mesh(new PlaneGeometry(1.6, len), pathFill);
    pathStrip.rotation.x = -Math.PI / 2;
    pathStrip.position.set(midX, 0.002, midZ);
    pathStrip.rotation.z = -angle;
    pathStrip.receiveShadow = true;
    scene.add(pathStrip);

    const innerStrip = new Mesh(new PlaneGeometry(1.2, len), pathGlow);
    innerStrip.rotation.x = -Math.PI / 2;
    innerStrip.position.set(midX, 0.003, midZ);
    innerStrip.rotation.z = -angle;
    scene.add(innerStrip);

    const halfW = 0.8;
    for (const side of [-1, 1]) {
      const lx = side * halfW * Math.cos(angle);
      const lz = side * -halfW * Math.sin(angle);
      const edge = new Mesh(
        new PlaneGeometry(0.06, len),
        new MeshBasicMaterial({ color: new Color("#A078FF"), depthWrite: false, transparent: true, opacity: 0.7 })
      );
      edge.rotation.x = -Math.PI / 2;
      edge.position.set(midX + lx, 0.005, midZ + lz);
      edge.rotation.z = -angle;
      scene.add(edge);
    }

    const centerGlow = new Mesh(
      new PlaneGeometry(0.08, len),
      new MeshBasicMaterial({ color: new Color("#00D4F0"), depthWrite: false, transparent: true, opacity: 0.5 })
    );
    centerGlow.rotation.x = -Math.PI / 2;
    centerGlow.position.set(midX, 0.005, midZ);
    centerGlow.rotation.z = -angle;
    scene.add(centerGlow);
  }

  // Six paths radiating from Central Plaza — all entrances face the plaza
  createPath(PLAZA_X, PLAZA_Z, 0, -15);        // North → Main Music Stage
  createPath(PLAZA_X, PLAZA_Z, -16, -10);      // Left-back → Vibe Lounge
  createPath(PLAZA_X, PLAZA_Z, 16, -10);       // Right-back → Music Library
  createPath(PLAZA_X, PLAZA_Z, -10, 8);        // Lower-left → Visualizer Dome
  createPath(PLAZA_X, PLAZA_Z, 10, 4);         // Lower-right → Daily Vibe Check
  createPath(PLAZA_X, PLAZA_Z, 0, SHORELINE_Z + 1); // South → Beach

  // Path accent lights — subtle color-shifting dots along walkways
  addPathLights(scene, PLAZA_X, PLAZA_Z, 0, -15, "#00D4F0");
  addPathLights(scene, PLAZA_X, PLAZA_Z, -16, -10, "#C43BFF");
  addPathLights(scene, PLAZA_X, PLAZA_Z, 16, -10, "#00D4F0");
  addPathLights(scene, PLAZA_X, PLAZA_Z, -10, 8, "#C43BFF");
  addPathLights(scene, PLAZA_X, PLAZA_Z, 10, 4, "#00E5FF");
  addPathLights(scene, PLAZA_X, PLAZA_Z, 0, SHORELINE_Z + 1, "#2098CC");

  // ── Beach boardwalk ────────────────────────────────────────
  const boardwalkLen = 8;
  const boardwalkStartZ = 15;
  const plankCount = 7;
  for (let p = 0; p < plankCount; p++) {
    const pz = boardwalkStartZ + p * (boardwalkLen / plankCount);
    const plankW = 2.6 + p * 0.1;
    const plank = new Mesh(
      new PlaneGeometry(plankW, boardwalkLen / plankCount - 0.1),
      new MeshBasicMaterial({
        color: new Color(p % 2 === 0 ? "#5C4A90" : "#4A3A78"),
        depthWrite: false, transparent: true, opacity: 0.35,
      })
    );
    plank.rotation.x = -Math.PI / 2;
    plank.position.set(0, 0.015, pz);
    plank.receiveShadow = true;
    scene.add(plank);

    for (const side of [-1, 1]) {
      const rx = side * (plankW / 2 - 0.15);
      const post = new Mesh(
        new CylinderGeometry(0.04, 0.04, 0.5, 6),
        new MeshBasicMaterial({ color: new Color("#A078FF"), depthWrite: false, transparent: true, opacity: 0.5 })
      );
      post.position.set(rx, 0.25, pz);
      scene.add(post);
    }
  }

  // Boardwalk entrance glow
  const entranceGlow = new Mesh(
    new PlaneGeometry(2.8, 0.15),
    new MeshBasicMaterial({ color: new Color("#00D4F0"), depthWrite: false, transparent: true, opacity: 0.7 })
  );
  entranceGlow.rotation.x = -Math.PI / 2;
  entranceGlow.position.set(0, 0.006, 13);
  scene.add(entranceGlow);

  // ═════════════════════════════════════════════════════════════
  // 4. MAIN MUSIC STAGE — north (top) of map
  // ═════════════════════════════════════════════════════════════
  const stage = new Group();
  stage.name = "musicStage";

  const stagePlat = new Mesh(new BoxGeometry(8, 0.5, 5), mat("#2A2A4A", { roughness: 0.3, metalness: 0.5 }));
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
    new MeshBasicMaterial({ color: new Color("#A078FF"), depthWrite: false, transparent: true, opacity: 0.5 })
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

  // ═════════════════════════════════════════════════════════════
  // 5. VIBE LOUNGE — futuristic social hangout, semi-circle seating
  // ═════════════════════════════════════════════════════════════
  const lounge = new Group();
  lounge.name = "vibeLounge";

  // Platform — larger, darker metallic
  const loungePlat = new Mesh(
    new CircleGeometry(4.5, 48),
    mat("#151528", { roughness: 0.4, metalness: 0.5 })
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
    mat("#1A2A3E", { roughness: 0.5, metalness: 0.3 })
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
    mat("#1E2A3E", { roughness: 0.25, metalness: 0.6, transparent: true, opacity: 0.7, depthWrite: true })
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
    new MeshBasicMaterial({ color: new Color("#00E5FF"), depthWrite: false, transparent: true, opacity: 0.7 })
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
    mat("#151E2A", { roughness: 0.4, metalness: 0.5 })
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
    mat("#151028", { roughness: 0.4, metalness: 0.5 })
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

  // Path from Central Plaza to Academy
  createPath(PLAZA_X, PLAZA_Z, ACAD_X, ACAD_Z);
  addPathLights(scene, PLAZA_X, PLAZA_Z, ACAD_X, ACAD_Z, "#7C3AED");

  // Academy ambient light
  const academyLight = new PointLight();
  academyLight.color = new Color("#7C3AED");
  academyLight.intensity = 1.8; academyLight.distance = 12;
  academyLight.position.set(ACAD_X, 2.5, ACAD_Z);
  scene.add(academyLight);

  // ═════════════════════════════════════════════════════════════
  // 8.6. VIBE SHOP — far right, opposite Academy
  // ═════════════════════════════════════════════════════════════
  const { SHOP_X, SHOP_Z } = createVibeShop(scene);

  // Path from Central Plaza to Shop
  createPath(PLAZA_X, PLAZA_Z, SHOP_X, SHOP_Z);
  addPathLights(scene, PLAZA_X, PLAZA_Z, SHOP_X, SHOP_Z, "#D4A843");

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

  // ═════════════════════════════════════════════════════════════
  // 10. BEACH WALK — south edge
  // ═════════════════════════════════════════════════════════════
  const bufferGeo = new PlaneGeometry(56, 6);
  const buffer = new Mesh(bufferGeo, mat("#2A2A40", { roughness: 0.7 }));
  buffer.rotation.x = -Math.PI / 2;
  buffer.position.set(0, -0.002, 12);
  buffer.receiveShadow = true;
  scene.add(buffer);

  const drySand = new Mesh(new PlaneGeometry(56, 5), mat("#D8B47E", { roughness: 0.5 }));
  drySand.rotation.x = -Math.PI / 2;
  drySand.position.set(0, 0.002, 15.5);
  drySand.receiveShadow = true;
  scene.add(drySand);

  const wetSand = new Mesh(new PlaneGeometry(56, 3), mat("#A07048", { roughness: 0.28, metalness: 0.1 }));
  wetSand.rotation.x = -Math.PI / 2;
  wetSand.position.set(0, 0.003, 19);
  wetSand.receiveShadow = true;
  scene.add(wetSand);

  // Boardwalk railing removed — open beach access

  // Beach lounge chairs
  const chairGroup = new Group();
  chairGroup.name = "beachChairs";
  const umbColors = ["#9B7EFF", "#00D4F0", "#C43BFF"];
  for (let u = 0; u < 6; u++) {
    const ux = -14 + u * 5.5;
    const uz = 17.5;
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

  // ═════════════════════════════════════════════════════════════
  // 11. OCEAN — waves from shore to horizon
  // ═════════════════════════════════════════════════════════════
  const oceanSegments = 54;
  const oceanGeo = new PlaneGeometry(56, OCEAN_DEPTH, 56, oceanSegments);
  const oceanMat = new MeshBasicMaterial();
  oceanMat.color = new Color("#2098CC");
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

  const foamGeo = new PlaneGeometry(56, 1.5);
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

  // ═════════════════════════════════════════════════════════════
  // 12. LIGHTING — night ambiance
  // ═════════════════════════════════════════════════════════════
  const moon = new DirectionalLight();
  moon.color = new Color("#7B9EC7");
  moon.intensity = 0.55;
  moon.position.set(15, 22, SHORELINE_Z + 10);
  moon.castShadow = true;
  moon.shadow.mapSize.width = 2048;
  moon.shadow.mapSize.height = 2048;
  moon.shadow.camera.near = 0.5;
  moon.shadow.camera.far = 80;
  moon.shadow.camera.left = -30;
  moon.shadow.camera.right = 30;
  moon.shadow.camera.top = 30;
  moon.shadow.camera.bottom = -30;
  moon.shadow.bias = -0.0003;
  scene.add(moon);

  const ambLight = new AmbientLight();
  ambLight.color = new Color("#2A1B5E");
  ambLight.intensity = 0.5;
  scene.add(ambLight);

  const hemiLight = new HemisphereLight();
  hemiLight.color = new Color("#6B5CAA");
  hemiLight.groundColor = new Color("#1A2430");
  hemiLight.intensity = 0.35;
  scene.add(hemiLight);

  const beachLight = new PointLight();
  beachLight.color = new Color("#5599CC");
  beachLight.intensity = 2.0;
  beachLight.distance = 20;
  beachLight.position.set(0, 3, SHORELINE_Z + 6);
  scene.add(beachLight);

  // Additional zone point lights
  const loungeLight = new PointLight();
  loungeLight.color = new Color("#A078FF");
  loungeLight.intensity = 1.5; loungeLight.distance = 10;
  loungeLight.position.set(-16, 2, -10);
  scene.add(loungeLight);
  scene.userData.loungeLight = loungeLight;

  const libraryLight = new PointLight();
  libraryLight.color = new Color("#00D4F0");
  libraryLight.intensity = 1.5; libraryLight.distance = 10;
  libraryLight.position.set(16, 2, -10);
  scene.add(libraryLight);

  const domeLight = new PointLight();
  domeLight.color = new Color("#C43BFF");
  domeLight.intensity = 1.5; domeLight.distance = 10;
  domeLight.position.set(-10, 2, 8);
  scene.add(domeLight);

  const vibeCheckLight = new PointLight();
  vibeCheckLight.color = new Color("#00E5FF");
  vibeCheckLight.intensity = 1.5; vibeCheckLight.distance = 8;
  vibeCheckLight.position.set(10, 2, 4);
  scene.add(vibeCheckLight);

  // ═════════════════════════════════════════════════════════════
  // 13. TWINKLING STARS + PALM TREES
  // ═════════════════════════════════════════════════════════════
  createStarField(scene);

  // Trees removed — layout cleanup, decoration will be added later
  // Beach palm row — spaced like umbrellas, lining the back of the beach
  // Beach palm row — spaced like umbrellas, lining the back of the beach
  // Removed tree at x=0 that was blocking the central beach pathway
  const palmPositions = [
    [-22, 14], [-16.5, 14], [-11, 14], [-5.5, 14],
    [5.5, 14], [11, 14], [16.5, 14], [22, 14],
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

  scene.fog = new Fog("#0A1525", 48, 60);
}

// createCitySkyline now lives in ./CitySkyline.jsx (imported at top of file)

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

// Mobile joystick now lives in ./MobileJoystick.jsx (imported by UpperVibeCity)

// ═══════════════════════════════════════════════════════════════
// REMOTE AVATAR — Phase 2: render other users in the world
// ═══════════════════════════════════════════════════════════════
function createRemoteAvatar(scene, userId, username, avatarType) {
  const group = new Group();
  group.name = `remote_${userId}`;
  group.userData = { userId, lastPos: { x: 0, z: 0 }, velocity: 0, walkTime: 0 };

  // ── Avatar type colors ───────────────────────────────────────
  const typeColors = {
    default:  { body: "#1565C0", head: "#1976D2", accent: "#42A5F5" },
    cyber:    { body: "#1B5E20", head: "#2E7D32", accent: "#00E676" },
    cosmic:   { body: "#4A148C", head: "#6A1B9A", accent: "#CE93D8" },
    neon:     { body: "#880E4F", head: "#AD1457", accent: "#FF4081" },
  };
  const colors = typeColors[avatarType] || typeColors.default;
  const bodyMat = () => new MeshStandardMaterial({ color: new Color(colors.body), roughness: 0.35, metalness: 0.2 });
  const headMat = () => new MeshStandardMaterial({ color: new Color(colors.head), roughness: 0.35 });
  const accentMat = () => new MeshBasicMaterial({ color: new Color(colors.accent), depthWrite: false });

  // ── Body (cylinder torso) ────────────────────────────────────
  const torso = new Mesh(new CylinderGeometry(0.12, 0.14, 0.38, 8), bodyMat());
  torso.position.y = 0.55;
  torso.castShadow = true;
  group.add(torso);

  // ── Head (sphere) ────────────────────────────────────────────
  const head = new Mesh(new SphereGeometry(0.09, 8, 6), headMat());
  head.position.y = 0.85;
  head.castShadow = true;
  group.add(head);

  // ── Accent ring around neck ──────────────────────────────────
  const ring = new Mesh(new TorusGeometry(0.09, 0.015, 8, 16), accentMat());
  ring.position.y = 0.78;
  ring.rotation.x = Math.PI / 2;
  group.add(ring);

  // ── Legs ─────────────────────────────────────────────────────
  const legGeo = new CylinderGeometry(0.04, 0.05, 0.35, 6);
  for (const side of [-1, 1]) {
    const leg = new Mesh(legGeo, bodyMat());
    leg.position.set(side * 0.07, 0.18, 0);
    leg.castShadow = true;
    leg.name = side > 0 ? "rightLeg" : "leftLeg";
    group.add(leg);
  }

  // ── Username sprite ──────────────────────────────────────────
  const nameCanvas = document.createElement("canvas");
  nameCanvas.width = 256;
  nameCanvas.height = 64;
  const ctx = nameCanvas.getContext("2d");
  ctx.font = "bold 20px 'Inter', sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "rgba(255,255,255,0.9)";
  const displayName = (username || "User").substring(0, 16);
  ctx.fillText(displayName, 128, 32);

  const nameTex = new THREE.CanvasTexture(nameCanvas);
  nameTex.minFilter = THREE.LinearFilter;
  nameTex.colorSpace = THREE.SRGBColorSpace;

  const nameSprite = new Sprite(new SpriteMaterial({
    map: nameTex, transparent: true, depthWrite: false, depthTest: false,
  }));
  nameSprite.scale.set(1.2, 0.3, 1);
  nameSprite.position.y = 1.05;
  nameSprite.renderOrder = 999;
  group.add(nameSprite);

  scene.add(group);
  return group;
}

// ═══════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════
export default function CityCanvas({ onLoaded, onPositionChange, onRemoteAvatarClick, stageCanvas, audioIntensityRef, locked, stageScreenPosRef, remoteUsers, ...props }) {
  const canvasRef = useRef(null);
  const [error, setError] = useState(null);
  const [isMobile, setIsMobile] = useState(false);
  const [mobileResetKey, setMobileResetKey] = useState(0);
  const onLoadedRef = useRef(onLoaded);
  onLoadedRef.current = onLoaded;
  const onPosCbRef = useRef(onPositionChange);
  onPosCbRef.current = onPositionChange;

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
  const avatarPosRef = useRef([...SPAWN, 0]); // [x, y, z, rotY]
  const stageCanvasRef = useRef(null);
  stageCanvasRef.current = stageCanvas;
  const velocityRef = useRef({ x: 0, z: 0 });
  const targetRotRef = useRef(0);
  const keysRef = useRef({});
  const mouseRef = useRef({ down: false, dx: 0, dy: 0 });
  const remoteAvatarsRef = useRef({}); // userId → { group, prevPos }
  const remoteUsersRef = useRef([]);
  remoteUsersRef.current = remoteUsers || [];
  const onRemoteClickRef = useRef(onRemoteAvatarClick);
  onRemoteClickRef.current = onRemoteAvatarClick;
  const cameraRef = useRef(null);
  const animRef = useRef({
    walkTime: 0,
    isMoving: false,
    speed: 0,
    prevWalkTime: 0,
  });
  const isMobileRef = useRef(false);
  const _mobileRef = useRef({ x: 0, y: 0, camDx: 0 });
  const mobileInputRef = props.mobileInputRef || _mobileRef;
  const lockedRef = useRef(false);
  const prevLockedRef = useRef(false);
  lockedRef.current = locked;
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
      });
      renderer.setClearColor(0x050510); // Deep void — matches sky reference
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
      const camera = new PerspectiveCamera(55, asp, 0.1, 80);
      cameraRef.current = camera;
      // Start camera behind avatar (same as animation loop will use)
      const initCamDist = 5;
      const initCamHeight = 2.5;
      const initLookY = 1.5;
      camera.position.set(SPAWN[0], SPAWN[1] + initCamHeight, SPAWN[2] - initCamDist);
      camera.lookAt(SPAWN[0], SPAWN[1] + initLookY, SPAWN[2]);

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
        let [px, py, pz, rot] = avatarPosRef.current;
        const vel = velocityRef.current;

        // ─── INPUT (skipped when locked) ────────────────────
        let inputX = 0, inputZ = 0;
        let turnInput = 0;

        if (lockedRef.current) {
          // Movement locked — skip all input processing
        } else if (isMobileRef.current) {
          // Reset mobile input on unlock transition to prevent stale camDx
          if (prevLockedRef.current) {
            mobileInputRef.current = { x: 0, y: 0, camDx: 0 };
          }
          const joy = mobileInputRef.current;
          if (Math.abs(joy.y) > 0.08) {
            inputX += Math.sin(rot) * joy.y;
            inputZ += Math.cos(rot) * joy.y;
          }
          turnInput = -joy.x;
          if (Math.abs(joy.camDx) > 0.0005) {
            rot += joy.camDx;
            targetRotRef.current = rot;
            joy.camDx *= 0.85;
          }
        } else {
          if (keys.w || keys.arrowup) { inputX += Math.sin(rot); inputZ += Math.cos(rot); }
          if (keys.s || keys.arrowdown) { inputX -= Math.sin(rot); inputZ -= Math.cos(rot); }
          if (keys.a || keys.arrowleft) turnInput = 1;
          if (keys.d || keys.arrowright) turnInput = -1;
        }

        const inputMag = Math.sqrt(inputX * inputX + inputZ * inputZ);
        const isMoving = inputMag > 0.1;
        const isTurning = Math.abs(turnInput) > 0.01;

        // ─── MOUSE LOOK ─────────────────────────────────────────
        if (mouse.down && !lockedRef.current) {
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

          const moveDot = inputX * Math.sin(rot) + inputZ * Math.cos(rot);
          if (!isTurning && moveDot > -0.3) {
            const moveAngle = Math.atan2(inputX, inputZ);
            targetRotRef.current = moveAngle;
          }

          vel.x += (inputX * MOVE_SPEED - vel.x) * Math.min(1, ACCELERATION * dt);
          vel.z += (inputZ * MOVE_SPEED - vel.z) * Math.min(1, ACCELERATION * dt);
        } else {
          vel.x += (0 - vel.x) * Math.min(1, DECELERATION * dt);
          vel.z += (0 - vel.z) * Math.min(1, DECELERATION * dt);
        }

        // Force zero velocity when locked
        if (lockedRef.current) {
          vel.x = 0;
          vel.z = 0;
        }

        // Smoother rotation lerp
        let targetRot = targetRotRef.current;
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

        // Notify parent of position (throttled — every 10 frames)
        if (onPosCbRef.current && frameRef.current % 10 === 0) {
          try { onPosCbRef.current(px, pz, rot); } catch {}
        }

        // ─── CAMERA (third-person, or stage-facing when locked) ──
        const camDist = 5;
        const camHeight = 2.5;
        const lookY = 1.5;

        // When locked (stage watching), smoothly face the stage screen head-on
        const STAGE_LOOK_AT = new Vector3(0, 2.2, -16.4);
        const STAGE_CAM_POS = new Vector3(0, 3.5, -6);
        const CAM_LERP = 3.0;

        if (lockedRef.current) {
          // Lerp camera toward stage-facing position
          camera.position.lerp(STAGE_CAM_POS, Math.min(1, CAM_LERP * dt));
          camera.lookAt(STAGE_LOOK_AT);
        } else {
          // Normal third-person camera behind avatar
          camera.position.set(
            px - Math.sin(rot) * camDist,
            py + camHeight,
            pz - Math.cos(rot) * camDist,
          );
          camera.lookAt(px, py + lookY, pz);
        }

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

        // ── Audio intensity (used by stage screen, ocean, foam, glow) ──
        const audioBeat = audioIntensityRef?.current ?? 0;

        // ─── STAGE SCREEN — visualizer canvas texture or hide when watching ──
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

        if (oceanMesh && origArr) {
          const pos = oceanMesh.geometry.attributes.position;
          const arr = pos.array;
          const waveT = t * 0.55; // main wave cycle

          for (let i = 0; i < arr.length; i += 3) {
            const worldZ = oceanCenterZ + origArr[i + 2];
            const distFromShore = worldZ - SLZ; // 0 at shore, positive going out to sea

            if (distFromShore < 0) continue; // skip sand side

            // Phase: deeper water leads, shore water lags → waves travel toward shore
            const phase = distFromShore * 0.3 - waveT * 3.0;
            const wave = Math.sin(phase) * 0.5 + 0.5; // 0..1 smooth wave

            // Height: waves get taller as they approach shore
            const buildFactor = 1 - Math.max(0, 1 - distFromShore / 20); // 0 far out → 1 near shore
            // Music intensity boosts wave height (0.18 base + up to 0.12 from audio)
            const musicBoost = 1 + audioBeat * 0.8;
            const height = wave * buildFactor * 0.18 * musicBoost;

            // Forward surge: water pushes toward shore during wave crest
            const surge = wave * buildFactor * 0.12 * musicBoost;

            arr[i] = origArr[i]; // X stays
            arr[i + 1] = origArr[i + 1] + height; // Y rises with wave
            arr[i + 2] = origArr[i + 2] + surge; // Z surges forward
          }
          pos.needsUpdate = true;
        }

        // ─── FOAM STRIP — pulses with tide + music ───────────────────
        const foamMesh = scene.userData.foam;
        if (foamMesh && foamMesh.material) {
          const tide = Math.sin(t * 0.55) * 0.5 + 0.5;
          const foamBoost = 1 + audioBeat;
          foamMesh.material.opacity = (0.18 + tide * 0.55) * foamBoost;
          foamMesh.position.z = scene.userData._foamBaseZ + tide * 0.7;
        }

        // ─── STAGE SCREEN GLOW — pulse screen frame with music ──────
        const screenGlowMesh = scene.getObjectByName("stageScreenGlow");
        if (screenGlowMesh?.material) {
          screenGlowMesh.material.opacity = 0.25 + audioBeat * 0.5;
        }

        // ─── VIBE LOUNGE NEON AMBIENT — pulse with music beat ──────
        const loungeNeonMats = scene.userData.loungeNeonMats;
        if (loungeNeonMats) {
          const loungePulse = 0.4 + audioBeat * 0.6;
          const loungeWave = Math.sin(t * 2.5) * 0.12;
          for (const mat of loungeNeonMats) {
            if (mat?.opacity !== undefined) {
              mat.opacity = Math.min(0.85, 0.35 + audioBeat * 0.5 + loungeWave);
            }
          }
          // Point light intensity also pulses
          const ll = scene.userData.loungeLight;
          if (ll && ll.intensity !== undefined) {
            ll.intensity = 1.2 + audioBeat * 1.0;
          }
        }

        // ─── NEON SKYLINE PULSE — buildings breathe with the beat ──
        const neonMats = scene.userData.neonMats;
        if (neonMats) {
          const pulse = 0.55 + audioBeat * 0.45 + Math.sin(t * 1.7) * 0.1;
          for (const mat of neonMats) {
            if (mat?.opacity !== undefined) {
              mat.opacity = pulse;
            }
          }
        }

        // ─── NEON SIGNS + PATH LIGHTS — color-shift ambient glow ──
        const hueShift = Math.sin(t * 0.25) * 0.5 + 0.5; // slow 0..1 wave

        scene.children.forEach((child) => {
          // Neon signs — breathe opacity + billboard toward camera
          if (child.userData?.isNeonSign) {
            child.lookAt(camera.position);
            const breathe = 0.18 + Math.sin(t * 1.3 + child.position.x * 0.5) * 0.08;
            child.children.forEach((part) => {
              if (part.name === "neonBack" && part.material?.opacity !== undefined) {
                part.material.opacity = breathe;
              }
            });
          }
          // Path dots — subtle hue oscillation between cyan and purple
          if (child.userData?.isPathDot && child.material?.color) {
            const baseColor = new Color(child.userData.baseColor);
            const mixColor = new Color(child.userData.baseColor === "#C43BFF" ? "#00D4F0" : "#C43BFF");
            child.material.color.copy(baseColor).lerp(mixColor, hueShift);
            child.material.opacity = 0.2 + Math.sin(t * 2 + child.userData.phase) * 0.2;
          }
        });

        // ─── STARS TWINKLE ─────────────────────────────────────
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
            // Spawn new remote avatar
            const group = createRemoteAvatar(
              scene, remote.user_id,
              remote.username || "User",
              remote.avatar_type || "default"
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

          // Walk animation on legs
          const walkTime = g.userData.walkTime || 0;
          const newWalkTime = walkTime + vel * 7 * dt;
          g.userData.walkTime = newWalkTime;
          g.userData.velocity = vel;

          const legAngle = Math.sin(newWalkTime) * 0.35 * Math.min(1, vel * 30);
          g.children.forEach((child) => {
            if (child.name === "leftLeg") child.rotation.x = legAngle;
            if (child.name === "rightLeg") child.rotation.x = -legAngle;
          });
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
        initializedRef.current = false; // Allow re-init on React Strict Mode remount
        lastTimeRef.current = 0;
        frameRef.current = 0;
        avatarRef.current = null;
        sceneRef.current = null;
        remoteAvatarsRef.current = {};
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