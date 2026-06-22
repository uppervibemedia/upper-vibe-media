/**
 * FerrisWheel.jsx — Neon Vibe Wheel 3D structure for Upper Vibe City.
 * Placed at the old Vibe Shop location (x=22, z=5), angled ~15° to face the city center.
 * Returns { group, WHEEL_X, WHEEL_Z, WHEEL_INTERACT_RADIUS, getPassengerPosition, getRideAngle }
 */
import * as THREE from "three";

const {
  MeshStandardMaterial,
  MeshBasicMaterial,
  Color,
  CircleGeometry,
  CylinderGeometry,
  SphereGeometry,
  BoxGeometry,
  TorusGeometry,
  RingGeometry,
  Mesh,
  Group,
  PointLight,
  CanvasTexture,
  LinearFilter,
  Vector3,
} = THREE;

export const WHEEL_X = 22;
export const WHEEL_Z = 5;
export const WHEEL_INTERACT_RADIUS = 7.0;
export const WHEEL_RADIUS = 5.5; // visual radius of the rim
export const NUM_CABINS = 8;

function mat(hexColor, opts = {}) {
  const m = new MeshStandardMaterial();
  m.color = new Color(hexColor);
  m.roughness = opts.roughness ?? 0.4;
  m.metalness = opts.metalness ?? 0.3;
  if (opts.transparent) {
    m.transparent = true;
    m.opacity = opts.opacity ?? 1;
    m.depthWrite = opts.depthWrite ?? true;
  }
  return m;
}

// Returns the world-space position of a specific cabin at a given wheel angle
export function getPassengerPosition(cabinIndex, wheelAngle) {
  const cabinAngle = wheelAngle + (cabinIndex / NUM_CABINS) * Math.PI * 2;
  return new Vector3(
    WHEEL_X + Math.sin(cabinAngle) * WHEEL_RADIUS,
    0.5 + WHEEL_RADIUS + Math.sin(cabinAngle) * WHEEL_RADIUS,
    WHEEL_Z + 0.2 // slight Z offset from support legs
  );
}

export function createFerrisWheel(scene) {
  const root = new Group();
  root.name = "ferrisWheel";

  // Angle the whole structure slightly so it faces city center
  root.rotation.y = 0.26; // ~15 degrees toward plaza

  // ─── Ground platform ─────────────────────────────────────────
  const plat = new Mesh(
    new CircleGeometry(5.5, 48),
    mat("#101820", { roughness: 0.4, metalness: 0.5 })
  );
  plat.rotation.x = -Math.PI / 2;
  plat.position.set(0, 0.003, 0);
  plat.receiveShadow = true;
  root.add(plat);

  // Platform outer ring
  const platRing = new Mesh(
    new RingGeometry(5.2, 5.5, 64),
    new MeshBasicMaterial({ color: new Color("#00E5FF"), depthWrite: false, side: THREE.DoubleSide, transparent: true, opacity: 0.45 })
  );
  platRing.rotation.x = -Math.PI / 2;
  platRing.position.set(0, 0.007, 0);
  platRing.renderOrder = 1;
  root.add(platRing);

  // ─── Left support leg ────────────────────────────────────────
  const legMat = mat("#1A2B3C", { roughness: 0.3, metalness: 0.7 });
  const legGeo = new CylinderGeometry(0.12, 0.18, 10, 8);

  const legL = new Mesh(legGeo, legMat);
  legL.position.set(-1.8, 5, -0.3);
  legL.rotation.z = 0.22; // lean inward
  legL.castShadow = true;
  root.add(legL);

  const legR = new Mesh(legGeo, legMat.clone());
  legR.position.set(1.8, 5, -0.3);
  legR.rotation.z = -0.22;
  legR.castShadow = true;
  root.add(legR);

  // Neon trim on legs
  for (const lx of [-1.8, 1.8]) {
    for (const ly of [2, 5.5, 9]) {
      const neonDot = new Mesh(
        new SphereGeometry(0.08, 6, 4),
        new MeshBasicMaterial({ color: new Color(lx < 0 ? "#C43BFF" : "#00E5FF"), depthWrite: false })
      );
      neonDot.position.set(lx, ly, -0.3);
      root.add(neonDot);
    }
  }

  // Cross brace
  const braceGeo = new CylinderGeometry(0.06, 0.06, 4.2, 6);
  const braceL = new Mesh(braceGeo, mat("#243040", { metalness: 0.7, roughness: 0.3 }));
  braceL.position.set(-0.9, 3.5, -0.3);
  braceL.rotation.z = Math.PI / 2;
  root.add(braceL);

  // ─── Center axle ─────────────────────────────────────────────
  const axle = new Mesh(
    new CylinderGeometry(0.18, 0.18, 1.2, 12),
    mat("#2A3A50", { metalness: 0.9, roughness: 0.15 })
  );
  axle.rotation.z = Math.PI / 2;
  axle.position.set(0, 10.2, 0);
  axle.castShadow = true;
  root.add(axle);

  // Axle glow
  const axleGlow = new Mesh(
    new SphereGeometry(0.28, 12, 8),
    new MeshBasicMaterial({ color: new Color("#00E5FF"), depthWrite: false, transparent: true, opacity: 0.6 })
  );
  axleGlow.position.set(0, 10.2, 0);
  root.add(axleGlow);

  // ─── Rotating wheel group — rim + spokes + cabins all spin together ──
  const wheelGroup = new Group();
  wheelGroup.name = "wheelRotatingGroup";
  wheelGroup.position.set(0, 10.2, 0);
  root.add(wheelGroup);

  // ─── Main wheel rim — torus ───────────────────────────────────
  const rimGeo = new TorusGeometry(WHEEL_RADIUS, 0.14, 12, 64);
  const rimMesh = new Mesh(rimGeo, mat("#1E3050", { metalness: 0.8, roughness: 0.2 }));
  rimMesh.rotation.y = Math.PI / 2;
  rimMesh.castShadow = true;
  rimMesh.name = "wheelRim";
  wheelGroup.add(rimMesh);

  // Neon rim glow ring — outer
  const rimGlowMat = new MeshBasicMaterial({ color: new Color("#00E5FF"), depthWrite: false, transparent: true, opacity: 0.55 });
  const rimGlow = new Mesh(
    new TorusGeometry(WHEEL_RADIUS + 0.08, 0.07, 8, 64),
    rimGlowMat
  );
  rimGlow.rotation.y = Math.PI / 2;
  rimGlow.name = "rimGlow";
  wheelGroup.add(rimGlow);

  // Second softer glow halo — wider, very transparent for bloom-like spread
  const rimGlow2Mat = new MeshBasicMaterial({ color: new Color("#C43BFF"), depthWrite: false, transparent: true, opacity: 0.18 });
  const rimGlow2 = new Mesh(
    new TorusGeometry(WHEEL_RADIUS + 0.28, 0.18, 6, 64),
    rimGlow2Mat
  );
  rimGlow2.rotation.y = Math.PI / 2;
  rimGlow2.name = "rimGlow2";
  wheelGroup.add(rimGlow2);

  // Inner rim accent
  const innerRim = new Mesh(
    new TorusGeometry(WHEEL_RADIUS - 0.8, 0.07, 8, 48),
    new MeshBasicMaterial({ color: new Color("#A078FF"), depthWrite: false, transparent: true, opacity: 0.35 })
  );
  innerRim.rotation.y = Math.PI / 2;
  wheelGroup.add(innerRim);

  // ─── Spokes ──────────────────────────────────────────────────
  const spokeGroup = new Group();
  spokeGroup.name = "wheelSpokes";
  const numSpokes = NUM_CABINS;
  for (let i = 0; i < numSpokes; i++) {
    const angle = (i / numSpokes) * Math.PI * 2;
    const spoke = new Mesh(
      new CylinderGeometry(0.04, 0.04, WHEEL_RADIUS, 6),
      mat("#1A2B3C", { metalness: 0.8, roughness: 0.2 })
    );
    spoke.rotation.x = Math.PI / 2;
    spoke.rotation.z = angle;
    const halfR = WHEEL_RADIUS / 2;
    spoke.position.set(Math.sin(angle) * halfR, Math.cos(angle) * halfR, 0);
    spokeGroup.add(spoke);
  }
  wheelGroup.add(spokeGroup);

  // ─── Cabins ───────────────────────────────────────────────────
  const cabinGroup = new Group();
  cabinGroup.name = "cabinGroup";
  wheelGroup.add(cabinGroup);

  const CABIN_COLORS = ["#C43BFF","#00E5FF","#FFD700","#FF4FC3","#A078FF","#00C8A0","#FF6B35","#7C3AED"];
  for (let i = 0; i < NUM_CABINS; i++) {
    const angle = (i / NUM_CABINS) * Math.PI * 2;
    const cx = Math.sin(angle) * WHEEL_RADIUS;
    const cy = Math.cos(angle) * WHEEL_RADIUS;
    const color = CABIN_COLORS[i % CABIN_COLORS.length];

    const cabin = new Mesh(
      new BoxGeometry(0.7, 0.8, 0.55),
      mat("#1A2030", { metalness: 0.5, roughness: 0.4, transparent: true, opacity: 0.88, depthWrite: true })
    );
    cabin.position.set(cx, cy, 0);
    cabin.name = `cabin_${i}`;
    cabin.userData.cabinIndex = i;
    cabinGroup.add(cabin);

    // Cabin frame glow
    const glowMat = new MeshBasicMaterial({ color: new Color(color), depthWrite: false, transparent: true, opacity: 0.65 });
    const glow = new Mesh(new BoxGeometry(0.76, 0.86, 0.04), glowMat);
    glow.position.set(cx, cy, 0.28);
    glow.name = `cabinGlow_${i}`;
    glow.userData.glowMat = glowMat;
    cabinGroup.add(glow);

    // Connecting arm from axle to cabin
    const armLen = WHEEL_RADIUS;
    const arm = new Mesh(
      new CylinderGeometry(0.03, 0.03, armLen, 5),
      new MeshBasicMaterial({ color: new Color("#304060"), depthWrite: false, transparent: true, opacity: 0.6 })
    );
    arm.rotation.z = -(angle + Math.PI / 2);
    const ah = armLen / 2;
    arm.position.set(Math.sin(angle) * ah, Math.cos(angle) * ah, 0);
    cabinGroup.add(arm);
  }

  root.position.set(WHEEL_X, 0, WHEEL_Z);
  scene.add(root);

  // ─── Neon sign label ─────────────────────────────────────────
  const signGroup = new Group();
  signGroup.name = "ferrisWheelSign";
  const canvasW = 512, canvasH = 72;
  const labelCanvas = document.createElement("canvas");
  labelCanvas.width = canvasW; labelCanvas.height = canvasH;
  const ctx = labelCanvas.getContext("2d");
  ctx.shadowColor = "#00E5FF";
  ctx.shadowBlur = 18;
  ctx.font = "bold 30px 'Syne', 'Inter', sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "#FFFFFF";
  ctx.fillText("NEON VIBE WHEEL", canvasW / 2, canvasH / 2);
  ctx.fillText("NEON VIBE WHEEL", canvasW / 2, canvasH / 2);
  const labelTex = new CanvasTexture(labelCanvas);
  labelTex.minFilter = LinearFilter;
  labelTex.colorSpace = THREE.SRGBColorSpace;
  const backPlane = new Mesh(
    new BoxGeometry(8.2, 1.6, 0.05),
    new MeshBasicMaterial({ color: new Color("#00E5FF"), depthWrite: false, transparent: true, opacity: 0.14 })
  );
  backPlane.position.set(0, 0, 0);
  signGroup.add(backPlane);
  const borderPlane = new Mesh(
    new BoxGeometry(8.3, 1.7, 0.04),
    new MeshBasicMaterial({ color: new Color("#00E5FF"), depthWrite: false, transparent: true, opacity: 0.45 })
  );
  borderPlane.position.set(0, 0, -0.01);
  borderPlane.renderOrder = 1;
  signGroup.add(borderPlane);
  const spriteMat = new THREE.SpriteMaterial({ map: labelTex, transparent: true, depthWrite: false, depthTest: false });
  const sprite = new THREE.Sprite(spriteMat);
  sprite.scale.set(8, 8 * (canvasH / canvasW), 1);
  sprite.renderOrder = 2;
  signGroup.add(sprite);
  signGroup.position.set(WHEEL_X, 17.2, WHEEL_Z);
  signGroup.userData = { isNeonSign: true, baseOpacity: 0.45, colorHex: "#00E5FF" };
  scene.add(signGroup);

  // ─── Entrance marker — glowing ground arc ─────────────────
  const entryRing = new Mesh(
    new RingGeometry(1.0, 1.25, 32),
    new MeshBasicMaterial({ color: new Color("#FFD700"), depthWrite: false, side: THREE.DoubleSide, transparent: true, opacity: 0.5 })
  );
  entryRing.rotation.x = -Math.PI / 2;
  entryRing.position.set(WHEEL_X - 3.5, 0.01, WHEEL_Z);
  entryRing.renderOrder = 1;
  scene.add(entryRing);

  // ─── Ambient light ────────────────────────────────────────────
  const wheelLight = new PointLight();
  wheelLight.color = new Color("#00D4F0");
  wheelLight.intensity = 3.0;
  wheelLight.distance = 18;
  wheelLight.position.set(WHEEL_X, 12, WHEEL_Z);
  scene.add(wheelLight);
  scene.userData.ferrisWheelLight = wheelLight;

  // Store references for animation
  scene.userData.ferrisWheel = {
    root,
    wheelGroup,
    cabinGroup,
    rimGlow,
    rimGlow2,
    wheelLight,
    angle: 0,
  };

  return { group: root, WHEEL_X, WHEEL_Z };
}

// Called in the animation loop — slowly rotates the wheel
export function animateFerrisWheel(scene, t, audioBeat) {
  const fw = scene.userData.ferrisWheel;
  if (!fw) return;

  // Smooth continuous rotation — ~30s per full revolution
  const angle = t * 0.21;

  // Rotate the entire wheel group (rim + spokes + cabins all move together)
  fw.wheelGroup.rotation.z = angle;

  // Cabins counter-rotate to stay upright (gondola gravity effect)
  for (const child of fw.cabinGroup.children) {
    if (child.name?.startsWith("cabin_") || child.name?.startsWith("cabinGlow_")) {
      child.rotation.z = -angle;
    }
  }

  // Outer rim glow — pulses cyan↔purple with audio beat
  if (fw.rimGlow?.material) {
    const glowPulse = 0.45 + Math.sin(t * 2.2) * 0.18 + audioBeat * 0.3;
    fw.rimGlow.material.opacity = glowPulse;
    // Color shift: cyan → purple → cyan
    const shift = Math.sin(t * 0.7) * 0.5 + 0.5;
    fw.rimGlow.material.color.set(new Color("#00E5FF")).lerp(new Color("#C43BFF"), shift);
  }

  // Wide soft halo — opposite phase for alternating glow effect
  if (fw.rimGlow2?.material) {
    fw.rimGlow2.material.opacity = 0.12 + Math.sin(t * 2.2 + Math.PI) * 0.1 + audioBeat * 0.15;
    const shift2 = Math.sin(t * 0.7 + Math.PI) * 0.5 + 0.5;
    fw.rimGlow2.material.color.set(new Color("#C43BFF")).lerp(new Color("#FFD700"), shift2 * 0.6);
  }

  // Cabin glow opacity cycle — each cabin breathes independently
  let ci = 0;
  for (const child of fw.cabinGroup.children) {
    if (child.userData?.glowMat) {
      child.userData.glowMat.opacity = 0.45 + Math.sin(t * 1.5 + ci * 0.8) * 0.28 + audioBeat * 0.2;
      ci++;
    }
  }

  // Wheel point light — color-shifts and pulses
  if (fw.wheelLight) {
    fw.wheelLight.intensity = 2.8 + audioBeat * 2.0 + Math.sin(t * 1.4) * 0.6;
    const colorShift = Math.sin(t * 0.5) * 0.5 + 0.5;
    fw.wheelLight.color.set(new Color("#00D4F0")).lerp(new Color("#C43BFF"), colorShift);
  }
}

// Returns the world position a riding avatar should be placed at, given the current time
export function getRidePosition(cabinIndex, t) {
  const wheelAngle = t * 0.21;
  const angle = wheelAngle + (cabinIndex / NUM_CABINS) * Math.PI * 2;
  // cabinGroup is at wheelGroup center (WHEEL_X, 10.2, WHEEL_Z), rotated in Z
  const x = WHEEL_X;
  const y = Math.max(0.5, 10.2 + Math.cos(angle) * WHEEL_RADIUS);
  const z = WHEEL_Z + Math.sin(angle) * WHEEL_RADIUS * 0.3;
  return { x, y, z };
}