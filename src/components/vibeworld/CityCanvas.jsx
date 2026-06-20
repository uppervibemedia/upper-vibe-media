import React, { useRef, useEffect, useState, useCallback } from "react";
import * as THREE from "three";
import { SPAWN, TREE_POSITIONS, PARK_RADIUS } from "./cityData";
import createCitySkyline from "./CitySkyline";

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
// ─── Floating zone label sprite ────────────────────────────────
function createZoneLabel(scene, x, y, z, text, colorHex) {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 64;
  const ctx = canvas.getContext("2d");
  ctx.font = "bold 22px 'Syne', 'Inter', sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = colorHex;
  ctx.fillText(text, 128, 32);

  const tex = new THREE.CanvasTexture(canvas);
  tex.minFilter = THREE.LinearFilter;
  tex.colorSpace = THREE.SRGBColorSpace;

  const spriteMat = new THREE.SpriteMaterial({
    map: tex,
    transparent: true,
    depthWrite: false,
    depthTest: false,
  });
  const sprite = new THREE.Sprite(spriteMat);
  sprite.position.set(x, y, z);
  sprite.scale.set(6, 1.5, 1);
  sprite.name = "label_" + text.replace(/\s+/g, "");
  scene.add(sprite);
}

function buildPark(scene) {
  createCosmicSky(scene);
  createCitySkyline(scene);

  const SHORELINE_Z = 20;
  const OCEAN_DEPTH = 54;

  // ═════════════════════════════════════════════════════════════
  // 1. GROUND — dark urban plaza floor covering the playable area
  // ═════════════════════════════════════════════════════════════
  const groundGeo = new PlaneGeometry(56, 42);
  const groundMat = mat("#1A1A2E", { roughness: 0.85 });
  const ground = new Mesh(groundGeo, groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(0, -0.01, -10);
  ground.receiveShadow = true;
  ground.name = "plazaGround";
  scene.add(ground);

  // ═════════════════════════════════════════════════════════════
  // 2. UVC CENTRAL PLAZA — large circular hub at center
  // ═════════════════════════════════════════════════════════════
  const PLAZA_X = 0, PLAZA_Z = -4, PLAZA_R = 7;

  // Main plaza disc
  const plazaDisc = new Mesh(
    new CircleGeometry(PLAZA_R, 64),
    mat("#1E1E36", { roughness: 0.6, metalness: 0.2 })
  );
  plazaDisc.rotation.x = -Math.PI / 2;
  plazaDisc.position.set(PLAZA_X, 0.001, PLAZA_Z);
  plazaDisc.receiveShadow = true;
  plazaDisc.name = "plazaDisc";
  scene.add(plazaDisc);

  // Glowing center ring
  const ringInner = new Mesh(
    new RingGeometry(2.0, 2.3, 64),
    new MeshBasicMaterial({ color: new Color("#00D4F0"), depthWrite: false, side: THREE.DoubleSide })
  );
  ringInner.rotation.x = -Math.PI / 2;
  ringInner.position.set(PLAZA_X, 0.005, PLAZA_Z);
  ringInner.renderOrder = 1;
  scene.add(ringInner);

  // Outer ring (purple)
  const ringOuter = new Mesh(
    new RingGeometry(PLAZA_R - 0.5, PLAZA_R - 0.2, 64),
    new MeshBasicMaterial({ color: new Color("#A078FF"), depthWrite: false, side: THREE.DoubleSide })
  );
  ringOuter.rotation.x = -Math.PI / 2;
  ringOuter.position.set(PLAZA_X, 0.005, PLAZA_Z);
  ringOuter.renderOrder = 1;
  scene.add(ringOuter);

  // ═════════════════════════════════════════════════════════════
  // 3. GLOWING PATHS — wide neon-lit walkways to every zone
  // ═════════════════════════════════════════════════════════════
  const pathGlow = new MeshBasicMaterial({ color: new Color("#00D4F0"), depthWrite: false, transparent: true, opacity: 0.18 });
  const pathFill = new MeshBasicMaterial({ color: new Color("#1A1A32"), depthWrite: false, transparent: true, opacity: 0.4 });

  function createPath(fromX, fromZ, toX, toZ) {
    const dx = toX - fromX, dz = toZ - fromZ;
    const len = Math.sqrt(dx * dx + dz * dz);
    const midX = (fromX + toX) / 2, midZ = (fromZ + toZ) / 2;
    const angle = Math.atan2(dx, dz);

    // Wide base path (1.6 wide — easy to walk)
    const pathStrip = new Mesh(new PlaneGeometry(1.6, len), pathFill);
    pathStrip.rotation.x = -Math.PI / 2;
    pathStrip.position.set(midX, 0.002, midZ);
    pathStrip.rotation.z = -angle;
    pathStrip.receiveShadow = true;
    scene.add(pathStrip);

    // Cyan inner glow strip
    const innerStrip = new Mesh(new PlaneGeometry(1.2, len), pathGlow);
    innerStrip.rotation.x = -Math.PI / 2;
    innerStrip.position.set(midX, 0.003, midZ);
    innerStrip.rotation.z = -angle;
    scene.add(innerStrip);

    // Purple neon edge lines (both sides)
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

    // Center glow line (cyan pulse)
    const centerGlow = new Mesh(
      new PlaneGeometry(0.08, len),
      new MeshBasicMaterial({ color: new Color("#00D4F0"), depthWrite: false, transparent: true, opacity: 0.5 })
    );
    centerGlow.rotation.x = -Math.PI / 2;
    centerGlow.position.set(midX, 0.005, midZ);
    centerGlow.rotation.z = -angle;
    scene.add(centerGlow);
  }

  // Paths: plaza center to each zone
  createPath(PLAZA_X, PLAZA_Z, 0, -14);       // North → Stage
  createPath(PLAZA_X, PLAZA_Z, PLAZA_X, SHORELINE_Z + 2); // South → Beach
  createPath(PLAZA_X, PLAZA_Z, -14, -3);       // West → Dome
  createPath(PLAZA_X, PLAZA_Z, 12, -2);        // East → Lounge
  createPath(PLAZA_X, PLAZA_Z, 16, -8);        // SE → Shops

  // ── Beach boardwalk — transition from plaza path into the sand ──
  const boardwalkLen = 8;
  const boardwalkZ = 15;
  const boardwalkMat = new MeshBasicMaterial({ color: new Color("#6B5AA0"), depthWrite: false, transparent: true, opacity: 0.25 });
  const boardwalkG = new PlaneGeometry(3, boardwalkLen);

  // Boardwalk planks (wider at beach to accommodate lounging)
  const plankCount = 7;
  for (let p = 0; p < plankCount; p++) {
    const pz = boardwalkZ + p * (boardwalkLen / plankCount);
    const plankW = 2.6 + p * 0.1; // Slightly wider toward shore
    const plank = new Mesh(
      new PlaneGeometry(plankW, boardwalkLen / plankCount - 0.1),
      new MeshBasicMaterial({
        color: new Color(p % 2 === 0 ? "#5C4A90" : "#4A3A78"),
        depthWrite: false,
        transparent: true,
        opacity: 0.35,
      })
    );
    plank.rotation.x = -Math.PI / 2;
    plank.position.set(0, 0.015, pz);
    plank.receiveShadow = true;
    scene.add(plank);

    // Neon rail glow at boardwalk edges
    for (const side of [-1, 1]) {
      const rx = side * (plankW / 2 - 0.15);
      const post = new Mesh(
        new CylinderGeometry(0.04, 0.04, 0.5, 6),
        new MeshBasicMaterial({
          color: new Color("#A078FF"),
          depthWrite: false,
          transparent: true,
          opacity: 0.5,
        })
      );
      post.position.set(rx, 0.25, pz);
      scene.add(post);
    }
  }

  // Boardwalk entrance glow (where path meets boardwalk)
  const entranceGlow = new Mesh(
    new PlaneGeometry(2.8, 0.15),
    new MeshBasicMaterial({ color: new Color("#00D4F0"), depthWrite: false, transparent: true, opacity: 0.7 })
  );
  entranceGlow.rotation.x = -Math.PI / 2;
  entranceGlow.position.set(0, 0.006, 13);
  scene.add(entranceGlow);

  // ═════════════════════════════════════════════════════════════
  // 4. MAIN MUSIC STAGE — north of plaza
  // ═════════════════════════════════════════════════════════════
  const stage = new Group();
  stage.name = "musicStage";

  // Stage platform
  const stagePlat = new Mesh(new BoxGeometry(8, 0.5, 5), mat("#2A2A4A", { roughness: 0.3, metalness: 0.5 }));
  stagePlat.position.set(0, 0.25, -14);
  stagePlat.castShadow = true;
  stagePlat.receiveShadow = true;
  stage.add(stagePlat);

  // Stage front edge glow
  const stageEdge = new Mesh(
    new BoxGeometry(8.1, 0.08, 0.1),
    new MeshBasicMaterial({ color: new Color("#00D4F0"), depthWrite: false })
  );
  stageEdge.position.set(0, 0.52, -11.45);
  stage.add(stageEdge);

  // Backdrop screen (glowing curved wall)
  // Material is replaced at runtime with stage canvas texture if available
  const screenMat = mat("#1A1A3A", { roughness: 0.2, metalness: 0.7 });
  const screen = new Mesh(new BoxGeometry(7, 4, 0.2), screenMat);
  screen.position.set(0, 2.5, -16.4);
  screen.castShadow = true;
  screen.name = "stageScreen";
  stage.add(screen);
  scene.userData.stageScreen = screen;
  scene.userData._stageCanvasApplied = false;

  // Screen glow frame — pulses with music beat
  const screenGlow = new Mesh(
    new BoxGeometry(7.2, 4.2, 0.05),
    new MeshBasicMaterial({ color: new Color("#A078FF"), depthWrite: false, transparent: true, opacity: 0.5 })
  );
  screenGlow.position.set(0, 2.5, -16.4);
  screenGlow.name = "stageScreenGlow";
  stage.add(screenGlow);

  // Stage spotlights (point lights)
  const spotL = new PointLight();
  spotL.color = new Color("#A078FF");
  spotL.intensity = 4;
  spotL.distance = 12;
  spotL.position.set(-3, 3.5, -14);
  stage.add(spotL);

  const spotR = new PointLight();
  spotR.color = new Color("#00D4F0");
  spotR.intensity = 4;
  spotR.distance = 12;
  spotR.position.set(3, 3.5, -14);
  stage.add(spotR);

  // Vertical stage pillars
  for (const sx of [-3.5, 3.5]) {
    const pillar = new Mesh(
      new CylinderGeometry(0.12, 0.15, 4, 8),
      mat("#555588", { roughness: 0.3, metalness: 0.7 })
    );
    pillar.position.set(sx, 2.2, -11.5);
    pillar.castShadow = true;
    stage.add(pillar);

    const pillarGlow = new Mesh(
      new CylinderGeometry(0.14, 0.17, 0.3, 8),
      new MeshBasicMaterial({ color: new Color("#00D4F0"), depthWrite: false })
    );
    pillarGlow.position.set(sx, 4.2, -11.5);
    stage.add(pillarGlow);
  }

  scene.add(stage);

  // ── Stage label ───────────────────────────────────────────
  createZoneLabel(scene, 0, 5.2, -14, "MUSIC  STAGE", "#00D4F0");

  // ═════════════════════════════════════════════════════════════
  // 5. VISUALIZER DOME — west/left side
  // ═════════════════════════════════════════════════════════════
  const dome = new Group();
  dome.name = "visualizerDome";

  // Dome hemisphere
  const domeGeo = new SphereGeometry(3.5, 32, 20, 0, Math.PI * 2, 0, Math.PI / 2);
  const domeMesh = new Mesh(
    domeGeo,
    mat("#1E2A3E", { roughness: 0.25, metalness: 0.6, transparent: true, opacity: 0.7, depthWrite: true })
  );
  domeMesh.position.set(-12, 0.05, -3);
  domeMesh.castShadow = true;
  dome.add(domeMesh);

  // Dome ring at base
  const domeRing = new Mesh(
    new RingGeometry(3.2, 3.5, 64),
    new MeshBasicMaterial({ color: new Color("#00D4F0"), depthWrite: false, side: THREE.DoubleSide })
  );
  domeRing.rotation.x = -Math.PI / 2;
  domeRing.position.set(-12, 0.06, -3);
  domeRing.renderOrder = 1;
  dome.add(domeRing);

  // Dome entrance (glowing arched doorway)
  const entrance = new Mesh(
    new BoxGeometry(2.5, 3.5, 0.1),
    new MeshBasicMaterial({ color: new Color("#00E5FF"), depthWrite: false, transparent: true, opacity: 0.7 })
  );
  entrance.position.set(-12, 1.75, -3 + 3.35);
  entrance.name = "domeEntrance";
  dome.add(entrance);

  // Exit glow ring around entrance
  const exitRing = new Mesh(
    new RingGeometry(1.35, 1.55, 32),
    new MeshBasicMaterial({ color: new Color("#00E5FF"), depthWrite: false, side: THREE.DoubleSide, transparent: true, opacity: 0.5 })
  );
  exitRing.position.set(-12, 1.75, -3 + 3.4);
  exitRing.name = "domeExitRing";
  dome.add(exitRing);

  // Ground light under dome
  const domeFloor = new Mesh(
    new CircleGeometry(3, 32),
    new MeshBasicMaterial({ color: new Color("#1E2A4E"), depthWrite: false, transparent: true, opacity: 0.3 })
  );
  domeFloor.rotation.x = -Math.PI / 2;
  domeFloor.position.set(-12, 0.003, -3);
  dome.add(domeFloor);

  scene.add(dome);

  // ── Dome label ────────────────────────────────────────────
  createZoneLabel(scene, -12, 4.2, -3, "VISUALIZER  DOME", "#A078FF");

  // ═════════════════════════════════════════════════════════════
  // 6. VIBE LOUNGE — east/right side, circular seating
  // ═════════════════════════════════════════════════════════════
  const lounge = new Group();
  lounge.name = "vibeLounge";

  // Lounge base platform
  const loungePlat = new Mesh(
    new CircleGeometry(4, 32),
    mat("#1E1E3A", { roughness: 0.5, metalness: 0.3 })
  );
  loungePlat.rotation.x = -Math.PI / 2;
  loungePlat.position.set(12, 0.002, -3);
  loungePlat.receiveShadow = true;
  lounge.add(loungePlat);

  // Circular seating — ring of cushioned blocks
  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * Math.PI * 2;
    const sx = 12 + Math.cos(angle) * 2.5;
    const sz = -3 + Math.sin(angle) * 2.5;

    // Seat cushion
    const seat = new Mesh(
      new BoxGeometry(1.0, 0.25, 0.6),
      mat("#4A3A6A", { roughness: 0.4, metalness: 0.15 })
    );
    seat.position.set(sx, 0.15, sz);
    seat.rotation.y = -angle;
    seat.castShadow = true;
    seat.receiveShadow = true;
    lounge.add(seat);

    // Glow under seat
    const seatGlow = new Mesh(
      new BoxGeometry(0.95, 0.03, 0.55),
      new MeshBasicMaterial({ color: new Color("#A078FF"), depthWrite: false, transparent: true, opacity: 0.5 })
    );
    seatGlow.position.set(sx, 0.03, sz);
    seatGlow.rotation.y = -angle;
    lounge.add(seatGlow);
  }

  // Central table
  const table = new Mesh(
    new CylinderGeometry(1.2, 1.2, 0.3, 16),
    mat("#555588", { roughness: 0.3, metalness: 0.6 })
  );
  table.position.set(12, 0.3, -3);
  table.castShadow = true;
  lounge.add(table);

  const tableGlow = new Mesh(
    new CylinderGeometry(1.25, 1.25, 0.04, 16),
    new MeshBasicMaterial({ color: new Color("#00D4F0"), depthWrite: false })
  );
  tableGlow.position.set(12, 0.47, -3);
  lounge.add(tableGlow);

  scene.add(lounge);

  // ── Lounge label ─────────────────────────────────────────
  createZoneLabel(scene, 12, 4.2, -3, "VIBE  LOUNGE", "#A078FF");

  // ═════════════════════════════════════════════════════════════
  // 7. SHOP / HANGOUT DISTRICT — southeast area, storefronts face beach
  // ═════════════════════════════════════════════════════════════
  const shopGroup = new Group();
  shopGroup.name = "shopDistrict";

  const shopLabels = ["UVC WEAR", "BEAT HUB", "CAFE VIBE"];
  for (let i = 0; i < 3; i++) {
    const sx = 12 + i * 3.5;
    const sz = -11;

    // Shop building box
    const shop = new Mesh(new BoxGeometry(2.5, 3.5, 2.5), mat("#2A2A44", { roughness: 0.3, metalness: 0.4 }));
    shop.position.set(sx, 1.75, sz);
    shop.castShadow = true;
    shop.receiveShadow = true;
    shopGroup.add(shop);

    // Neon edge strips on south/front face
    for (const ey of [0.05, 3.3]) {
      const edgeStrip = new Mesh(
        new BoxGeometry(2.55, 0.06, 0.06),
        new MeshBasicMaterial({ color: new Color("#A078FF"), depthWrite: false })
      );
      edgeStrip.position.set(sx, ey, sz + 1.25);
      shopGroup.add(edgeStrip);
    }

    // Glowing storefront window — facing south toward beach
    const frontWin = new Mesh(
      new PlaneGeometry(1.8, 1.5),
      new MeshBasicMaterial({ color: new Color("#FFE0A0"), depthWrite: false, transparent: true, opacity: 0.6 })
    );
    frontWin.position.set(sx, 1.8, sz + 1.26);
    shopGroup.add(frontWin);

    // Awning — south side
    const awning = new Mesh(
      new BoxGeometry(2.3, 0.08, 0.25),
      new MeshBasicMaterial({ color: new Color("#00D4F0"), depthWrite: false })
    );
    awning.position.set(sx, 2.65, sz + 1.15);
    shopGroup.add(awning);
  }

  scene.add(shopGroup);

  // ── Shop label ───────────────────────────────────────────
  createZoneLabel(scene, 18, 3.8, -11, "SHOP  DISTRICT", "#FFE0A0");

  // ═════════════════════════════════════════════════════════════
  // 8. BEACH WALK — front edge
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

  // Boardwalk railing
  const railGroup = new Group();
  railGroup.name = "boardwalkRail";
  for (let rx = -24; rx <= 24; rx += 3) {
    // Post
    const post = new Mesh(new CylinderGeometry(0.06, 0.08, 1.5, 6), mat("#777799", { roughness: 0.3, metalness: 0.6 }));
    post.position.set(rx, 0.75, 9.5);
    post.castShadow = true;
    railGroup.add(post);

    // Post glow cap
    const cap = new Mesh(
      new CylinderGeometry(0.07, 0.09, 0.1, 6),
      new MeshBasicMaterial({ color: new Color("#A078FF"), depthWrite: false })
    );
    cap.position.set(rx, 1.5, 9.5);
    railGroup.add(cap);
  }
  // Top rail bar
  const railBar = new Mesh(new BoxGeometry(50, 0.06, 0.1), mat("#8888AA", { roughness: 0.3, metalness: 0.5 }));
  railBar.position.set(0, 1.25, 9.5);
  railBar.castShadow = true;
  railGroup.add(railBar);
  scene.add(railGroup);

  // Beach lounge chairs
  const chairGroup = new Group();
  chairGroup.name = "beachChairs";
  const umbColors = ["#9B7EFF", "#00D4F0", "#A078FF"];
  for (let u = 0; u < 6; u++) {
    const ux = -14 + u * 5.5;
    const uz = 17.5;

    // Umbrella pole
    const pole = new Mesh(new CylinderGeometry(0.04, 0.04, 2, 6), mat("#CCCCDD", { roughness: 0.3, metalness: 0.3 }));
    pole.position.set(ux, 1.0, uz);
    pole.castShadow = true;
    chairGroup.add(pole);

    // Umbrella canopy (wide cone)
    const canopy = new Mesh(
      new CylinderGeometry(0.05, 0.8, 0.6, 12),
      mat(umbColors[u % 3], { roughness: 0.4, metalness: 0.1 })
    );
    canopy.position.set(ux, 2.2, uz);
    canopy.castShadow = true;
    chairGroup.add(canopy);

    // Lounge chair (simple box)
    const chair = new Mesh(new BoxGeometry(0.5, 0.08, 1.4), mat("#555566", { roughness: 0.4, metalness: 0.3 }));
    chair.position.set(ux + 0.6, 0.06, uz);
    chair.rotation.x = -0.2;
    chair.castShadow = true;
    chair.receiveShadow = true;
    chairGroup.add(chair);
  }
  scene.add(chairGroup);

  // ═════════════════════════════════════════════════════════════
  // 9. OCEAN — waves from shore to horizon
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
  // 10. LIGHTING — night ambiance
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

  // ═════════════════════════════════════════════════════════════
  // 11. TWINKLING STARS + PALM TREES
  // ═════════════════════════════════════════════════════════════
  createStarField(scene);

  // Palm trees around plaza
  const palmPositions = [
    [-5, -8], [5, -8], [-8, -2], [8, -2], [-4, 2], [4, 2],
    [-15, -8], [15, -8], [-10, -12], [10, -12],
  ];
  palmPositions.forEach(([px, pz]) => {
    const palm = new Group();
    const trunkGeo = new CylinderGeometry(0.06, 0.1, 3, 8);
    const trunk = new Mesh(trunkGeo, mat("#6D4C41", { roughness: 0.6 }));
    trunk.position.y = 1.5;
    trunk.castShadow = true;
    palm.add(trunk);

    // Palm fronds (simple radiating planes)
    for (let f = 0; f < 5; f++) {
      const angle = (f / 5) * Math.PI * 2;
      const frond = new Mesh(
        new PlaneGeometry(0.15, 0.8),
        mat("#2E7D32", { roughness: 0.5 })
      );
      frond.position.set(Math.cos(angle) * 0.3, 2.8, Math.sin(angle) * 0.3);
      frond.rotation.x = Math.cos(angle) * 0.6;
      frond.rotation.z = Math.sin(angle) * 0.5;
      frond.castShadow = true;
      palm.add(frond);
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

// ═══════════════════════════════════════════════════════════════
// MOBILE VIRTUAL JOYSTICK — visible dual-touch controls
// ═══════════════════════════════════════════════════════════════
function VirtualJoystick({ onMove, onCameraDelta }) {
  const MAX_R = 45;
  const JOY_BASE_X = 75;
  const JOY_BASE_Y_OFFSET = 130;

  const [thumbX, setThumbX] = useState(0);
  const [thumbY, setThumbY] = useState(0);
  const [joyActive, setJoyActive] = useState(false);
  const [joyBaseY, setJoyBaseY] = useState(() => window.innerHeight - JOY_BASE_Y_OFFSET);

  const joyTouchId = useRef(null);
  const camTouchId = useRef(null);
  const camBaseRef = useRef({ x: 0, y: 0 });

  // Keep joyBaseY current on resize/orientation change
  useEffect(() => {
    const update = () => setJoyBaseY(window.innerHeight - JOY_BASE_Y_OFFSET);
    window.addEventListener("resize", update);
    window.addEventListener("orientationchange", update);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("orientationchange", update);
    };
  }, []);

  const isInteractiveTarget = useCallback((el) => {
    while (el && el !== document.body) {
      const tag = el.tagName?.toLowerCase();
      const role = el.getAttribute?.("role");
      // Skip touch capture for buttons, links, inputs, and interactive elements
      if (tag === "button" || tag === "a" || tag === "input" || tag === "textarea" || tag === "select") return true;
      if (role === "button" || role === "link" || role === "tab") return true;
      if (el.classList?.contains("pointer-events-auto")) return true;
      // Stop at the canvas or touch layer — don't walk into unrelated DOM
      if (el.dataset?.touchLayer === "true") break;
      el = el.parentElement;
    }
    return false;
  }, []);

  // ── Joystick touch handlers (directly on joystick visual) ──
  const handleJoyStart = useCallback((e) => {
    if (joyTouchId.current !== null) return;
    const t = e.changedTouches[0];
    e.preventDefault();
    e.stopPropagation();
    joyTouchId.current = t.identifier;
  }, []);

  // ── Camera touch handlers (right-side zone, top portion only) ──
  const handleCamStart = useCallback((e) => {
    if (camTouchId.current !== null) return;
    const t = e.changedTouches[0];
    if (isInteractiveTarget(t.target)) return;
    e.preventDefault();
    camTouchId.current = t.identifier;
    camBaseRef.current = { x: t.clientX, y: t.clientY };
  }, [isInteractiveTarget]);

  const handleTouchMove = useCallback((e) => {
    let consumed = false;
    for (const t of [...e.touches]) {
      if (t.identifier === joyTouchId.current) {
        consumed = true;
        let dx = t.clientX - JOY_BASE_X;
        let dy = joyBaseY - t.clientY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > MAX_R) { dx = (dx / dist) * MAX_R; dy = (dy / dist) * MAX_R; }
        setThumbX(dx);
        setThumbY(dy);
        setJoyActive(dist > 8);
        onMove?.(dx / MAX_R, dy / MAX_R);
      }
      if (t.identifier === camTouchId.current) {
        consumed = true;
        const dx = t.clientX - camBaseRef.current.x;
        onCameraDelta?.(dx);
        camBaseRef.current = { x: t.clientX, y: t.clientY };
      }
    }
    if (consumed) e.preventDefault();
  }, [onMove, onCameraDelta, joyBaseY]);

  const handleTouchEnd = useCallback((e) => {
    let consumed = false;
    for (const t of [...e.changedTouches]) {
      if (t.identifier === joyTouchId.current) {
        joyTouchId.current = null;
        setJoyActive(false);
        setThumbX(0);
        setThumbY(0);
        onMove?.(0, 0);
        consumed = true;
      }
      if (t.identifier === camTouchId.current) {
        camTouchId.current = null;
        consumed = true;
      }
    }
    if (consumed) e.preventDefault();
  }, [onMove]);

  return (
    <>
      {/* Camera look zone — right half, top 70% only (leaves bottom area free for player + HUD) */}
      <div
        className="absolute z-30"
        data-zone="camera"
        style={{
          top: 0,
          right: 0,
          width: "50%",
          height: "70%",
          touchAction: "none",
          userSelect: "none",
          WebkitUserSelect: "none",
          pointerEvents: "auto",
        }}
        onTouchStart={handleCamStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      />
      {/* Joystick visual — now directly touchable (not pointer-events-none anymore) */}
      <div
        className="absolute z-40 rounded-full flex items-center justify-center"
        style={{
          width: 100, height: 100,
          left: JOY_BASE_X - 50,
          top: joyBaseY - 50,
          background: joyActive ? "rgba(255,255,255,0.18)" : "rgba(255,255,255,0.08)",
          border: `2.5px solid ${joyActive ? "rgba(255,255,255,0.4)" : "rgba(255,255,255,0.18)"}`,
          backdropFilter: "blur(10px)",
          WebkitBackdropFilter: "blur(10px)",
          boxShadow: joyActive ? "0 0 20px rgba(0,180,220,0.2)" : "none",
          pointerEvents: "auto",
          touchAction: "none",
        }}
        onTouchStart={handleJoyStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div
          className="rounded-full pointer-events-none"
          style={{
            width: 52, height: 52,
            background: joyActive
              ? "linear-gradient(135deg,rgba(0,180,220,0.5),rgba(155,126,255,0.4))"
              : "rgba(255,255,255,0.18)",
            border: "2px solid rgba(255,255,255,0.35)",
            transform: `translate(${thumbX}px, ${-thumbY}px)`,
          }}
        />
      </div>
    </>
  );
}

// ═══════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════
export default function CityCanvas({ onLoaded, onPositionChange, stageCanvas, audioIntensityRef, locked, stageScreenPosRef }) {
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
  const animRef = useRef({
    walkTime: 0,
    isMoving: false,
    speed: 0,
    prevWalkTime: 0,
  });
  const isMobileRef = useRef(false);
  const mobileInputRef = useRef({ x: 0, y: 0, camDx: 0 });
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
          const ss = new Vector3(0, 2.5, -16.4);
          const proj = ss.clone().project(camera);
          const rw = renderer.domElement.clientWidth || renderer.domElement.width;
          const rh = renderer.domElement.clientHeight || renderer.domElement.height;
          const cx = (proj.x * 0.5 + 0.5) * rw;
          const cy = (-proj.y * 0.5 + 0.5) * rh;
          // Project corners for size
          const tl = new Vector3(-3.5, 4.5, -16.4).project(camera);
          const br = new Vector3(3.5, 0.5, -16.4).project(camera);
          const sw = Math.abs((br.x - tl.x) * 0.5 * rw);
          const sh = Math.abs((-br.y + tl.y) * 0.5 * rh);
          stageScreenPosRef.current = { x: cx - sw / 2, y: cy - sh / 2, w: sw, h: sh };
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

  // Mobile joystick handlers — store analog values for the animation loop
  const handleJoystickMove = useCallback((jx, jy) => {
    mobileInputRef.current.x = jx;
    mobileInputRef.current.y = jy;
  }, []);

  const handleCameraDelta = useCallback((dx) => {
    mobileInputRef.current.camDx -= dx * 0.005;
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
      {isMobile && (
        <VirtualJoystick
          key={mobileResetKey}
          onMove={handleJoystickMove}
          onCameraDelta={handleCameraDelta}
        />
      )}
    </div>
  );
}