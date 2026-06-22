/**
 * FerrisWheel.jsx — Realistic pier-style Ferris wheel for Upper Vibe City.
 * Looks like a classic amusement park / beach boardwalk Ferris wheel.
 * Subtle neon accent lights only — main structure is realistic.
 */
import * as THREE from "three";

const {
  MeshStandardMaterial, MeshBasicMaterial, Color,
  CircleGeometry, CylinderGeometry, SphereGeometry,
  BoxGeometry, TorusGeometry, RingGeometry,
  Mesh, Group, PointLight, CanvasTexture, LinearFilter, Vector3,
} = THREE;

export const WHEEL_X = 22;
export const WHEEL_Z = 5;
export const WHEEL_INTERACT_RADIUS = 7.0;
export const WHEEL_RADIUS = 6.0;   // visual radius of the rim
export const NUM_CABINS = 8;
// Hub height: legs are 8 units tall, wheel center sits at top of legs
export const WHEEL_HUB_Y = 8.0;

function mat(hexColor, opts = {}) {
  const m = new MeshStandardMaterial();
  m.color = new Color(hexColor);
  m.roughness = opts.roughness ?? 0.55;
  m.metalness = opts.metalness ?? 0.2;
  if (opts.transparent) { m.transparent = true; m.opacity = opts.opacity ?? 1; m.depthWrite = opts.depthWrite ?? true; }
  return m;
}

function neonMat(hex, opacity = 0.7) {
  return new MeshBasicMaterial({ color: new Color(hex), transparent: true, opacity, depthWrite: false });
}

export function createFerrisWheel(scene) {
  const root = new Group();
  root.name = "ferrisWheel";
  root.rotation.y = 0.26; // ~15° toward city center

  // ─── Ground platform / loading area ─────────────────────────
  // Main base disc
  const basePlat = new Mesh(
    new CylinderGeometry(4.5, 4.8, 0.22, 32),
    mat("#1C1C28", { roughness: 0.4, metalness: 0.5 })
  );
  basePlat.position.set(0, 0.11, 0);
  basePlat.receiveShadow = true;
  root.add(basePlat);

  // Loading platform deck (raised step at the front for boarding)
  const loadingDeck = new Mesh(
    new BoxGeometry(3.2, 0.3, 2.0),
    mat("#2A2A3C", { roughness: 0.35, metalness: 0.45 })
  );
  loadingDeck.position.set(0, 0.37, WHEEL_RADIUS - 0.6);
  loadingDeck.castShadow = true;
  root.add(loadingDeck);

  // Loading platform neon edge strip (cyan)
  const loadingEdge = new Mesh(
    new BoxGeometry(3.25, 0.06, 0.06),
    neonMat("#00E5FF", 0.8)
  );
  loadingEdge.position.set(0, 0.55, WHEEL_RADIUS + 0.35);
  root.add(loadingEdge);

  // Side railings on loading platform
  for (const sx of [-1.5, 1.5]) {
    const rail = new Mesh(new BoxGeometry(0.05, 0.8, 2.0), mat("#333344", { metalness: 0.7, roughness: 0.3 }));
    rail.position.set(sx, 0.77, WHEEL_RADIUS - 0.6);
    root.add(rail);
    const topRail = new Mesh(new BoxGeometry(0.05, 0.05, 2.0), neonMat("#00D4F0", 0.5));
    topRail.position.set(sx, 1.17, WHEEL_RADIUS - 0.6);
    root.add(topRail);
  }

  // ─── A-Frame support structure ───────────────────────────────
  // The A-frame has two main legs that converge at the hub center.
  // Each leg is a pair of angled steel columns forming the A shape.
  const legMat = mat("#2A3344", { roughness: 0.3, metalness: 0.75 });

  // Left front leg
  const legLF = new Mesh(new CylinderGeometry(0.16, 0.22, 9.5, 8), legMat);
  legLF.position.set(-2.2, 4.75, 0.8);
  legLF.rotation.z = 0.24;   // lean inward
  legLF.rotation.x = -0.1;
  legLF.castShadow = true;
  root.add(legLF);

  // Left back leg
  const legLB = new Mesh(new CylinderGeometry(0.14, 0.20, 9.5, 8), legMat);
  legLB.position.set(-2.0, 4.75, -0.8);
  legLB.rotation.z = 0.22;
  legLB.rotation.x = 0.1;
  legLB.castShadow = true;
  root.add(legLB);

  // Right front leg
  const legRF = new Mesh(new CylinderGeometry(0.16, 0.22, 9.5, 8), legMat);
  legRF.position.set(2.2, 4.75, 0.8);
  legRF.rotation.z = -0.24;
  legRF.rotation.x = -0.1;
  legRF.castShadow = true;
  root.add(legRF);

  // Right back leg
  const legRB = new Mesh(new CylinderGeometry(0.14, 0.20, 9.5, 8), legMat);
  legRB.position.set(2.0, 4.75, -0.8);
  legRB.rotation.z = -0.22;
  legRB.rotation.x = 0.1;
  legRB.castShadow = true;
  root.add(legRB);

  // Horizontal cross-braces on the A-frame legs (structural realism)
  const braceMat = mat("#222A38", { metalness: 0.8, roughness: 0.25 });
  for (const bz of [-0.5, 0.5]) {
    for (const by of [2.5, 5.0]) {
      const brace = new Mesh(new CylinderGeometry(0.07, 0.07, 4.8, 6), braceMat);
      brace.rotation.z = Math.PI / 2;
      brace.position.set(0, by, bz);
      root.add(brace);
    }
  }

  // Diagonal cross-braces (X pattern between left and right legs)
  for (const sign of [-1, 1]) {
    const diagBrace = new Mesh(new CylinderGeometry(0.055, 0.055, 5.5, 6), braceMat);
    diagBrace.position.set(0, 3.8, sign * 0.0);
    diagBrace.rotation.z = sign * 0.42; // slight angle
    diagBrace.rotation.y = sign * 0.3;
    root.add(diagBrace);
  }

  // ─── Hub / axle housing ───────────────────────────────────────
  const hubOuter = new Mesh(
    new CylinderGeometry(0.55, 0.55, 1.2, 20),
    mat("#1E2A3C", { metalness: 0.9, roughness: 0.12 })
  );
  hubOuter.rotation.z = Math.PI / 2;
  hubOuter.position.set(0, WHEEL_HUB_Y, 0);
  root.add(hubOuter);

  // Hub end caps
  for (const sx of [-0.65, 0.65]) {
    const cap = new Mesh(new CylinderGeometry(0.52, 0.52, 0.12, 20), mat("#263040", { metalness: 0.85, roughness: 0.15 }));
    cap.rotation.z = Math.PI / 2;
    cap.position.set(sx, WHEEL_HUB_Y, 0);
    root.add(cap);
  }

  // Neon hub ring glow
  const hubGlow = new Mesh(
    new TorusGeometry(0.48, 0.06, 8, 24),
    neonMat("#FFD700", 0.85)
  );
  hubGlow.rotation.y = Math.PI / 2;
  hubGlow.position.set(0, WHEEL_HUB_Y, 0);
  root.add(hubGlow);

  // ─── Rotating wheel group ─────────────────────────────────────
  const wheelGroup = new Group();
  wheelGroup.name = "wheelRotatingGroup";
  wheelGroup.position.set(0, WHEEL_HUB_Y, 0);
  root.add(wheelGroup);

  // ── Outer structural rim — double ring (front + back) ──────────
  const rimFrontMat = mat("#263244", { metalness: 0.75, roughness: 0.22 });
  const rimFront = new Mesh(new TorusGeometry(WHEEL_RADIUS, 0.18, 10, 72), rimFrontMat);
  rimFront.rotation.y = Math.PI / 2;
  rimFront.position.set(0.42, 0, 0);
  rimFront.castShadow = true;
  wheelGroup.add(rimFront);

  const rimBack = new Mesh(new TorusGeometry(WHEEL_RADIUS, 0.18, 10, 72), mat("#222E3C", { metalness: 0.75, roughness: 0.25 }));
  rimBack.rotation.y = Math.PI / 2;
  rimBack.position.set(-0.42, 0, 0);
  rimBack.castShadow = true;
  wheelGroup.add(rimBack);

  // Outer rim neon strip (subtle — between the two structural rings)
  const rimNeon = new Mesh(
    new TorusGeometry(WHEEL_RADIUS + 0.05, 0.05, 6, 72),
    neonMat("#00C8FF", 0.6)
  );
  rimNeon.rotation.y = Math.PI / 2;
  rimNeon.name = "rimNeon";
  wheelGroup.add(rimNeon);

  // ── Inner hub ring ──────────────────────────────────────────
  const innerHub = new Mesh(
    new CylinderGeometry(0.8, 0.8, 0.85, 20),
    mat("#1C2636", { metalness: 0.8, roughness: 0.2 })
  );
  innerHub.rotation.z = Math.PI / 2;
  wheelGroup.add(innerHub);

  // ── Spokes — two sets front + back, like a real steel wheel ────
  const spokeMat = mat("#1E2D40", { metalness: 0.8, roughness: 0.2 });
  for (let i = 0; i < NUM_CABINS; i++) {
    const angle = (i / NUM_CABINS) * Math.PI * 2;
    const halfR = WHEEL_RADIUS / 2;
    const sx = Math.sin(angle) * halfR;
    const sy = Math.cos(angle) * halfR;

    // Front spoke
    const sf = new Mesh(new CylinderGeometry(0.055, 0.055, WHEEL_RADIUS - 0.6, 6), spokeMat);
    sf.rotation.x = Math.PI / 2;
    sf.rotation.z = angle;
    sf.position.set(0.42, sy, sx); // offset to front ring plane
    // Reposition to actually span from hub to rim
    sf.position.set(0.3, sy, sx);
    wheelGroup.add(sf);

    // Back spoke
    const sb = new Mesh(new CylinderGeometry(0.05, 0.05, WHEEL_RADIUS - 0.6, 6), spokeMat);
    sb.rotation.x = Math.PI / 2;
    sb.rotation.z = angle;
    sb.position.set(-0.3, sy, sx);
    wheelGroup.add(sb);

    // Diagonal cross spoke connecting front to back at midpoint (structural X)
    if (i % 2 === 0) {
      const crossSpoke = new Mesh(new CylinderGeometry(0.035, 0.035, 0.8, 5), mat("#1A2530", { metalness: 0.7 }));
      crossSpoke.rotation.z = Math.PI / 2;
      crossSpoke.position.set(0, sy, sx);
      wheelGroup.add(crossSpoke);
    }
  }

  // ── Cabin gondolas ──────────────────────────────────────────────
  const cabinGroup = new Group();
  cabinGroup.name = "cabinGroup";
  wheelGroup.add(cabinGroup);

  // Gondola colors — classic amusement park palette
  const GONDOLA_COLORS = ["#C8321E","#1E5FC8","#2EA83A","#C89A1E","#C83278","#1E9AC8","#7C3AED","#C85A1E"];

  for (let i = 0; i < NUM_CABINS; i++) {
    const angle = (i / NUM_CABINS) * Math.PI * 2;
    const cx = Math.sin(angle) * WHEEL_RADIUS;
    const cy = Math.cos(angle) * WHEEL_RADIUS;
    const color = GONDOLA_COLORS[i % GONDOLA_COLORS.length];

    const gondola = new Group();
    gondola.name = `cabin_${i}`;
    gondola.userData.cabinIndex = i;
    gondola.position.set(0, cy, cx);

    // Gondola body — box with rounded-ish roof
    const body = new Mesh(
      new BoxGeometry(0.85, 0.9, 0.65),
      mat(color, { roughness: 0.45, metalness: 0.2 })
    );
    body.castShadow = true;
    gondola.add(body);

    // Gondola roof (slightly wider, flat)
    const roof = new Mesh(
      new BoxGeometry(0.92, 0.12, 0.7),
      mat(color, { roughness: 0.35, metalness: 0.25 })
    );
    roof.position.y = 0.5;
    gondola.add(roof);

    // Window — front face lighter panel
    const windowMesh = new Mesh(
      new BoxGeometry(0.55, 0.44, 0.04),
      new MeshBasicMaterial({ color: new Color("#A0D8EF"), transparent: true, opacity: 0.38, depthWrite: false })
    );
    windowMesh.position.set(0, 0.02, 0.34);
    gondola.add(windowMesh);

    // Window frame
    const winFrame = new Mesh(
      new BoxGeometry(0.58, 0.47, 0.03),
      neonMat(color, 0.55)
    );
    winFrame.position.set(0, 0.02, 0.345);
    gondola.add(winFrame);

    // Suspension arm from rim to gondola top
    const arm = new Mesh(
      new CylinderGeometry(0.035, 0.035, 0.55, 5),
      mat("#1E2A38", { metalness: 0.8, roughness: 0.2 })
    );
    arm.position.y = 0.72;
    gondola.add(arm);

    // Store base angle — animation loop will set rotation.z = baseAngle - wheelAngle
    // so gondola always hangs straight down regardless of wheel position
    gondola.rotation.z = angle; // initial upright hang
    gondola.userData.baseAngle = angle;
    cabinGroup.add(gondola);
  }

  // ─── Neon spoke tip lights (at rim attachment points) ─────────
  const TIP_COLORS = ["#FF4444","#44AAFF","#44FF88","#FFDD44","#FF44CC","#44DDFF","#AA44FF","#FF8844"];
  const tipLightMats = [];
  for (let i = 0; i < NUM_CABINS; i++) {
    const angle = (i / NUM_CABINS) * Math.PI * 2;
    const tx = Math.sin(angle) * (WHEEL_RADIUS + 0.02);
    const ty = Math.cos(angle) * (WHEEL_RADIUS + 0.02);
    const tipMat = neonMat(TIP_COLORS[i], 0.9);
    const tipLight = new Mesh(new SphereGeometry(0.12, 6, 4), tipMat);
    tipLight.position.set(0, ty, tx);
    tipLight.name = `tipLight_${i}`;
    tipLightMats.push({ mat: tipMat, phase: (i / NUM_CABINS) * Math.PI * 2 });
    wheelGroup.add(tipLight);
  }

  // ─── Carnival string lights — small bulbs along the outer rim ──
  const CARNIVAL_COLORS = ["#FFD700","#FF6644","#44FFAA","#FF44CC","#44AAFF","#FFAA44","#AA44FF","#44FFDD",
                            "#FF4444","#AAFF44","#FF88CC","#44DDFF","#FFB800","#FF6699","#88FF44","#6644FF"];
  const carnivalMats = [];
  const carnivalCount = 24; // bulbs evenly spaced around rim
  for (let i = 0; i < carnivalCount; i++) {
    const angle = (i / carnivalCount) * Math.PI * 2;
    const rx = Math.sin(angle) * (WHEEL_RADIUS + 0.25);
    const ry = Math.cos(angle) * (WHEEL_RADIUS + 0.25);
    const color = CARNIVAL_COLORS[i % CARNIVAL_COLORS.length];
    const cMat = neonMat(color, 0.75);
    const bulb = new Mesh(new SphereGeometry(0.09, 5, 4), cMat);
    bulb.position.set(0, ry, rx);
    bulb.name = `carnival_${i}`;
    carnivalMats.push({ mat: cMat, phase: (i / carnivalCount) * Math.PI * 2, color });
    wheelGroup.add(bulb);
  }

  // ─── Position root in world ────────────────────────────────────
  root.position.set(WHEEL_X, 0, WHEEL_Z);
  scene.add(root);

  // ─── Neon sign label ─────────────────────────────────────────
  const canvasW = 512, canvasH = 64;
  const labelCanvas = document.createElement("canvas");
  labelCanvas.width = canvasW; labelCanvas.height = canvasH;
  const ctx = labelCanvas.getContext("2d");
  ctx.shadowColor = "#00E5FF";
  ctx.shadowBlur = 14;
  ctx.font = "bold 28px 'Syne','Inter',sans-serif";
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.fillStyle = "#FFFFFF";
  ctx.fillText("NEON VIBE WHEEL", canvasW / 2, canvasH / 2);
  ctx.fillText("NEON VIBE WHEEL", canvasW / 2, canvasH / 2);
  const labelTex = new CanvasTexture(labelCanvas);
  labelTex.minFilter = LinearFilter;
  labelTex.colorSpace = THREE.SRGBColorSpace;
  const signSprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: labelTex, transparent: true, depthWrite: false, depthTest: false }));
  signSprite.scale.set(7.5, 7.5 * (canvasH / canvasW), 1);
  signSprite.renderOrder = 2;
  signSprite.position.set(WHEEL_X, WHEEL_HUB_Y + WHEEL_RADIUS + 1.6, WHEEL_Z);
  scene.add(signSprite);
  scene.userData.ferrisWheelSign = signSprite;

  // ─── Entrance ground marker (yellow circle arc) ───────────────
  const entryRing = new Mesh(
    new RingGeometry(1.1, 1.35, 32),
    new MeshBasicMaterial({ color: new Color("#FFD700"), depthWrite: false, side: THREE.DoubleSide, transparent: true, opacity: 0.55 })
  );
  entryRing.rotation.x = -Math.PI / 2;
  entryRing.position.set(WHEEL_X, 0.01, WHEEL_Z + WHEEL_RADIUS + 0.2);
  entryRing.renderOrder = 1;
  scene.add(entryRing);

  // ─── Ambient point light ─────────────────────────────────────
  const wheelLight = new PointLight();
  wheelLight.color = new Color("#FFD080");
  wheelLight.intensity = 2.5;
  wheelLight.distance = 20;
  wheelLight.position.set(WHEEL_X, WHEEL_HUB_Y + 2, WHEEL_Z);
  scene.add(wheelLight);
  scene.userData.ferrisWheelLight = wheelLight;

  // ─── Store for animation ──────────────────────────────────────
  scene.userData.ferrisWheel = {
    root,
    wheelGroup,
    cabinGroup,
    rimNeon,
    hubGlow,
    wheelLight,
    tipLightMats,
    carnivalMats,
  };

  return { group: root };
}

// ─── Animation loop tick ──────────────────────────────────────────
export function animateFerrisWheel(scene, t, audioBeat) {
  const fw = scene.userData.ferrisWheel;
  if (!fw) return;

  // Smooth continuous counter-clockwise rotation — ~35s per revolution
  // Only rotate the wheelGroup around Z — root stays fixed
  const angle = -(t * 0.18);
  fw.wheelGroup.rotation.z = angle;

  // Counter-rotate each gondola so they always hang straight down
  // Use absolute angle (baseAngle - wheelAngle) so they don't accumulate
  for (const child of fw.cabinGroup.children) {
    if (child.name?.startsWith("cabin_")) {
      const base = child.userData.baseAngle || 0;
      child.rotation.z = base - angle;
    }
  }

  // Rim neon subtle pulse
  if (fw.rimNeon?.material) {
    fw.rimNeon.material.opacity = 0.4 + Math.sin(t * 1.8) * 0.15 + audioBeat * 0.2;
  }

  // Hub glow pulse — warm gold
  if (fw.hubGlow?.material) {
    fw.hubGlow.material.opacity = 0.6 + Math.sin(t * 2.5) * 0.2 + audioBeat * 0.15;
  }

  // Wheel light warm pulse
  if (fw.wheelLight) {
    fw.wheelLight.intensity = 2.0 + Math.sin(t * 1.1) * 0.5 + audioBeat * 1.0;
  }

  // Sign billboard
  const sign = scene.userData.ferrisWheelSign;
  if (sign) {
    sign.material.opacity = 0.75 + Math.sin(t * 1.4) * 0.18;
  }

  // Carnival string lights — smooth musical pulse with staggered phase
  const carnivalMats = fw.carnivalMats;
  if (carnivalMats) {
    for (const c of carnivalMats) {
      // Each bulb breathes at slightly different phase — no harsh sync
      const wave = Math.sin(t * 1.8 + c.phase) * 0.5 + 0.5;
      const beatLift = audioBeat * 0.35;
      c.mat.opacity = 0.35 + wave * 0.45 + beatLift;
    }
  }

  // Spoke tip lights — gentle sequential chase with beat
  const tipLightMats = fw.tipLightMats;
  if (tipLightMats) {
    for (const tip of tipLightMats) {
      const wave = Math.sin(t * 2.2 + tip.phase) * 0.5 + 0.5;
      tip.mat.opacity = 0.5 + wave * 0.45 + audioBeat * 0.2;
    }
  }
}

// ─── World-space cabin position for ride camera ───────────────────
// Returns { x, y, z } of cabin i at time t, in world space
export function getCabinWorldPosition(cabinIndex, t) {
  const wheelAngle = -(t * 0.18); // counter-clockwise matches animation
  const cabinAngle = (cabinIndex / NUM_CABINS) * Math.PI * 2;
  // wheelGroup rotates around z, cabin is at (0, cy, cx) local to wheelGroup
  // wheelGroup is at (0, WHEEL_HUB_Y, 0) local to root
  // root is at (WHEEL_X, 0, WHEEL_Z) world, rotated 0.26 on Y
  const localAngle = wheelAngle + cabinAngle;
  // After z-rotation: new_y = cos(a)*orig_y - sin(a)*orig_z  ... but cabin is (0,cy,cx) before wheel rotation
  // Actually: cabin starts at (0, WHEEL_RADIUS, 0) rotated by cabinAngle around z,
  // then the whole wheelGroup adds another wheelAngle around z.
  const totalAngle = localAngle;
  // In wheelGroup local space (y up, x left-right, z into screen)
  // torus is rotation.y=PI/2, so rim is in the Y-Z plane. Spoke tips at sin(a)*Z + cos(a)*Y.
  const localY = Math.cos(totalAngle) * WHEEL_RADIUS;
  const localZ = Math.sin(totalAngle) * WHEEL_RADIUS;
  const localX = 0;

  // wheelGroup is at y=WHEEL_HUB_Y in root space
  const rootY = WHEEL_HUB_Y + localY;
  const rootX = localX;
  const rootZ = localZ;

  // root is rotated 0.26 on Y, at position (WHEEL_X, 0, WHEEL_Z)
  const ry = 0.26;
  const worldX = WHEEL_X + Math.cos(ry) * rootX - Math.sin(ry) * rootZ;
  const worldY = rootY;
  const worldZ = WHEEL_Z + Math.sin(ry) * rootX + Math.cos(ry) * rootZ;

  return { x: worldX, y: Math.max(0.5, worldY), z: worldZ };
}

// Loading platform world position (where avatar stands to board)
export function getBoardingPosition() {
  const ry = 0.26;
  const rootZ = WHEEL_RADIUS + 0.2;
  return {
    x: WHEEL_X - Math.sin(ry) * rootZ,
    y: 0.55,
    z: WHEEL_Z + Math.cos(ry) * rootZ,
  };
}