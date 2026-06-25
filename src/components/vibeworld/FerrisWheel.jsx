/**
 * FerrisWheel.jsx — Clean neon Ferris wheel for Upper Vibe City.
 *
 * Structure:
 *   root (Group, world-positioned)
 *     ├── stationary: base platform, support legs, hub housing, entry deck
 *     └── wheelPivot (Group at hub center, rotates around Z)
 *           ├── rim rings (TorusGeometry, rotation.y = PI/2 so ring is in Y-Z plane)
 *           ├── spokes (radial cylinders from hub to rim)
 *           └── gondolaPivots[i] (Group at rim point, counter-rotates to stay upright)
 *                 └── gondola body, roof, arm
 *
 * The wheel ring lives in the Y-Z plane (torus rotation.y = PI/2).
 * A spoke at angle θ has its tip at (0, cos(θ)*R, sin(θ)*R) in wheelPivot space.
 * Cylinder default axis is Y; rotate it so its axis points from (0,0,0) toward tip.
 */
import * as THREE from "three";

const {
  MeshStandardMaterial, MeshBasicMaterial, Color,
  CircleGeometry, CylinderGeometry, SphereGeometry,
  BoxGeometry, TorusGeometry, RingGeometry,
  Mesh, Group, PointLight, Vector3,
} = THREE;

export const WHEEL_X = 22;
export const WHEEL_Z = 5;
export const WHEEL_INTERACT_RADIUS = 9.5;
export const WHEEL_RADIUS = 6.0;
export const NUM_CABINS = 8;
export const WHEEL_HUB_Y = 8.5; // hub center height above ground

const IS_MOB = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

// ── Material helpers ──────────────────────────────────────────────
function stdMat(hex, roughness = 0.5, metalness = 0.25) {
  const m = new MeshStandardMaterial();
  m.color = new Color(hex);
  m.roughness = roughness;
  m.metalness = metalness;
  return m;
}

function neonMat(hex, opacity = 0.8) {
  return new MeshBasicMaterial({ color: new Color(hex), transparent: true, opacity, depthWrite: false });
}

// ── Build a radial spoke inside wheelPivot ────────────────────────
// The wheel ring is in the Y-Z plane.  Spoke tip is at angle θ:
//   tip = (0, cos(θ)*R, sin(θ)*R)
// CylinderGeometry default axis is Y.  We need the cylinder to point
// from (0,0,0) toward tip.  That means:
//   • position cylinder at midpoint (0, cos(θ)*R/2, sin(θ)*R/2)
//   • align its Y axis toward tip by rotating the cylinder so +Y → direction of tip
function addSpoke(parent, angle, length, radius, material) {
  const cy = Math.cos(angle);
  const cz = Math.sin(angle);

  const spoke = new Mesh(new CylinderGeometry(radius, radius, length, 6), material);

  // Place at midpoint along the spoke direction
  spoke.position.set(0, cy * length / 2, cz * length / 2);

  // Rotate +Y axis to point toward tip.
  // The tip direction in local space is (0, cy, cz).
  // quaternion from +Y to (0, cy, cz):
  const from = new Vector3(0, 1, 0);
  const to = new Vector3(0, cy, cz).normalize();
  const q = new THREE.Quaternion().setFromUnitVectors(from, to);
  spoke.quaternion.copy(q);

  parent.add(spoke);
  return spoke;
}

export function createFerrisWheel(scene) {
  const root = new Group();
  root.name = "ferrisWheel";
  root.position.set(WHEEL_X, 0, WHEEL_Z);
  root.rotation.y = 0.26; // ~15° toward city center

  // ── Stationary group (base, legs, hub housing) ──────────────────
  const staticGroup = new Group();
  staticGroup.name = "ferrisWheelStatic";
  root.add(staticGroup);

  // Ground platform
  const base = new Mesh(
    new CylinderGeometry(4.5, 4.8, 0.22, 32),
    stdMat("#1C1C28", 0.4, 0.5)
  );
  base.position.set(0, 0.11, 0);
  base.receiveShadow = true;
  staticGroup.add(base);

  // Loading deck (front boarding area)
  const loadingDeck = new Mesh(
    new BoxGeometry(3.2, 0.3, 2.0),
    stdMat("#2A2A3C", 0.35, 0.45)
  );
  loadingDeck.position.set(0, 0.37, WHEEL_RADIUS - 0.4);
  loadingDeck.castShadow = true;
  staticGroup.add(loadingDeck);

  // Loading edge neon strip
  const loadingEdge = new Mesh(
    new BoxGeometry(3.25, 0.06, 0.06),
    neonMat("#00E5FF", 0.8)
  );
  loadingEdge.position.set(0, 0.55, WHEEL_RADIUS + 0.6);
  staticGroup.add(loadingEdge);

  // Side railings
  for (const sx of [-1.5, 1.5]) {
    const rail = new Mesh(
      new BoxGeometry(0.05, 0.8, 2.0),
      stdMat("#333344", 0.3, 0.7)
    );
    rail.position.set(sx, 0.77, WHEEL_RADIUS - 0.4);
    staticGroup.add(rail);

    const topRail = new Mesh(
      new BoxGeometry(0.05, 0.05, 2.0),
      neonMat("#00D4F0", 0.5)
    );
    topRail.position.set(sx, 1.17, WHEEL_RADIUS - 0.4);
    staticGroup.add(topRail);
  }

  // A-frame support legs — 4 legs, widened base so legs stay outside gondola sweep.
  // Gondola body is 0.85 wide centered on the wheel plane (X=0 in root space).
  // Legs start at x=±3.2 at ground and converge to x=±1.1 at hub top,
  // keeping a clear ~1.0 unit gap from the gondola edge (±0.55) at all heights.
  const legMat = stdMat("#2A3344", 0.3, 0.75);
  const LEG_LEN = WHEEL_HUB_Y + 0.5;
  const legDefs = [
    { x: -3.2, z:  1.0, rz:  0.18, rx: -0.08 },
    { x: -3.0, z: -1.0, rz:  0.16, rx:  0.08 },
    { x:  3.2, z:  1.0, rz: -0.18, rx: -0.08 },
    { x:  3.0, z: -1.0, rz: -0.16, rx:  0.08 },
  ];
  for (const ld of legDefs) {
    const leg = new Mesh(new CylinderGeometry(0.16, 0.22, LEG_LEN, 8), legMat);
    leg.position.set(ld.x, LEG_LEN / 2, ld.z);
    leg.rotation.set(ld.rx, 0, ld.rz);
    leg.castShadow = true;
    staticGroup.add(leg);
  }

  // Horizontal cross-braces between legs — span matches wider leg base
  const braceMat = stdMat("#222A38", 0.25, 0.8);
  for (const by of [2.5, 5.0, 7.0]) {
    for (const bz of [-0.5, 0.5]) {
      const brace = new Mesh(new CylinderGeometry(0.07, 0.07, 6.4, 6), braceMat);
      brace.position.set(0, by, bz);
      brace.rotation.z = Math.PI / 2;
      staticGroup.add(brace);
    }
  }

  // Hub axle housing (stationary cylinder, axis along X)
  const hubHousing = new Mesh(
    new CylinderGeometry(0.55, 0.55, 1.4, 20),
    stdMat("#1E2A3C", 0.12, 0.9)
  );
  hubHousing.rotation.z = Math.PI / 2;
  hubHousing.position.set(0, WHEEL_HUB_Y, 0);
  staticGroup.add(hubHousing);

  // Hub end caps
  for (const sx of [-0.75, 0.75]) {
    const cap = new Mesh(
      new CylinderGeometry(0.52, 0.52, 0.12, 20),
      stdMat("#263040", 0.15, 0.85)
    );
    cap.rotation.z = Math.PI / 2;
    cap.position.set(sx, WHEEL_HUB_Y, 0);
    staticGroup.add(cap);
  }

  // Hub neon ring glow (stationary)
  const hubGlow = new Mesh(
    new TorusGeometry(0.48, 0.06, 8, 24),
    neonMat("#FFD700", 0.85)
  );
  hubGlow.rotation.y = Math.PI / 2; // ring in Y-Z plane
  hubGlow.position.set(0, WHEEL_HUB_Y, 0);
  staticGroup.add(hubGlow);

  // Base LED rings (stationary)
  const baseLedMat = neonMat("#00D4F0", 0.8);
  const baseLedRing = new Mesh(
    new TorusGeometry(4.55, 0.07, 6, IS_MOB ? 32 : 48),
    baseLedMat
  );
  baseLedRing.rotation.x = Math.PI / 2;
  baseLedRing.position.set(0, 0.25, 0);
  staticGroup.add(baseLedRing);

  const baseLedMat2 = neonMat("#C43BFF", 0.6);
  const baseLedRing2 = new Mesh(
    new TorusGeometry(3.2, 0.05, 6, IS_MOB ? 28 : 40),
    baseLedMat2
  );
  baseLedRing2.rotation.x = Math.PI / 2;
  baseLedRing2.position.set(0, 0.24, 0);
  staticGroup.add(baseLedRing2);

  // Ground glow disc
  const groundGlowMat = new MeshBasicMaterial({
    color: new Color("#0044AA"), transparent: true, opacity: 0.22,
    depthWrite: false, side: THREE.DoubleSide,
  });
  const groundGlow = new Mesh(new CircleGeometry(5.5, 32), groundGlowMat);
  groundGlow.rotation.x = -Math.PI / 2;
  groundGlow.position.set(0, 0.01, 0);
  groundGlow.renderOrder = 1;
  staticGroup.add(groundGlow);

  // ── WHEEL PIVOT GROUP — everything here rotates around Z ─────────
  // Positioned at the hub center so rotation.z spins the wheel in place.
  const wheelPivot = new Group();
  wheelPivot.name = "wheelPivot";
  wheelPivot.position.set(0, WHEEL_HUB_Y, 0);
  root.add(wheelPivot);

  // Inner hub cylinder (rotates with wheel, gives visual spin)
  const innerHub = new Mesh(
    new CylinderGeometry(0.75, 0.75, 0.9, 20),
    stdMat("#1C2636", 0.2, 0.8)
  );
  innerHub.rotation.z = Math.PI / 2;
  wheelPivot.add(innerHub);

  // Structural rim — front + back torus, ring in Y-Z plane
  const rimFrontMat = stdMat("#263244", 0.22, 0.75);
  const rimFront = new Mesh(
    new TorusGeometry(WHEEL_RADIUS, 0.18, 10, IS_MOB ? 48 : 72),
    rimFrontMat
  );
  rimFront.rotation.y = Math.PI / 2;
  rimFront.position.x = 0.38;
  rimFront.castShadow = !IS_MOB;
  wheelPivot.add(rimFront);

  const rimBack = new Mesh(
    new TorusGeometry(WHEEL_RADIUS, 0.18, 10, IS_MOB ? 48 : 72),
    stdMat("#222E3C", 0.25, 0.75)
  );
  rimBack.rotation.y = Math.PI / 2;
  rimBack.position.x = -0.38;
  rimBack.castShadow = !IS_MOB;
  wheelPivot.add(rimBack);

  // Outer LED rim neon strips (attached to wheelPivot, rotate with wheel)
  const ledRimMat = neonMat("#00E5FF", 0.9);
  const ledRim = new Mesh(
    new TorusGeometry(WHEEL_RADIUS + 0.18, 0.07, 6, IS_MOB ? 48 : 72),
    ledRimMat
  );
  ledRim.rotation.y = Math.PI / 2;
  ledRim.name = "ledRim";
  wheelPivot.add(ledRim);

  const ledRimMat2 = neonMat("#A078FF", 0.65);
  const ledRim2 = new Mesh(
    new TorusGeometry(WHEEL_RADIUS - 0.15, 0.05, 6, IS_MOB ? 40 : 60),
    ledRimMat2
  );
  ledRim2.rotation.y = Math.PI / 2;
  ledRim2.name = "ledRim2";
  wheelPivot.add(ledRim2);

  // Rim neon pulse ring (thinner, between structural rings)
  const rimNeonMat = neonMat("#00C8FF", 0.55);
  const rimNeon = new Mesh(
    new TorusGeometry(WHEEL_RADIUS + 0.05, 0.04, 6, IS_MOB ? 48 : 72),
    rimNeonMat
  );
  rimNeon.rotation.y = Math.PI / 2;
  rimNeon.name = "rimNeon";
  wheelPivot.add(rimNeon);

  // Spokes — radial from hub to rim, front + back plane
  const spokeMat = stdMat("#1E2D40", 0.2, 0.8);
  const spokeLength = WHEEL_RADIUS - 0.82; // hub radius 0.75 + rim tube 0.18 clearance
  const spokeNeonMats = [];
  const SPOKE_COLORS = ["#00E5FF", "#A078FF", "#00C8FF", "#C43BFF"];

  for (let i = 0; i < NUM_CABINS; i++) {
    const angle = (i / NUM_CABINS) * Math.PI * 2;

    // Front + back structural spokes
    for (const xOffset of [0.28, -0.28]) {
      const sGroup = new Group();
      sGroup.position.x = xOffset;
      addSpoke(sGroup, angle, spokeLength, 0.055, spokeMat);
      // Re-offset the spoke's position to be relative to hub edge
      // addSpoke places midpoint at half-length; we need it offset from hub surface
      // Actually addSpoke builds in sGroup space so it's fine — just add
      wheelPivot.add(sGroup);
    }

    // Neon spoke (center plane, every other spoke)
    if (i % 2 === 0) {
      const snMat = neonMat(SPOKE_COLORS[(i / 2) % SPOKE_COLORS.length], 0.7);
      const snGroup = new Group();
      addSpoke(snGroup, angle, spokeLength, 0.038, snMat);
      wheelPivot.add(snGroup);
      spokeNeonMats.push({ mat: snMat, phase: angle });
    }
  }

  // ── Gondolas — parented to wheelPivot via a pivot at the rim ────
  // Each gondolaPivot sits at the rim attachment point (0, cos(θ)*R, sin(θ)*R).
  // It counter-rotates around Z to keep the gondola hanging upright.
  const GONDOLA_COLORS = ["#C8321E","#1E5FC8","#2EA83A","#C89A1E","#C83278","#1E9AC8","#7C3AED","#C85A1E"];
  const TIP_COLORS = ["#00E5FF","#A078FF","#00C8FF","#C43BFF","#40AAFF","#AA60FF","#00FFCC","#FF60CC"];
  const gondolaPivots = [];
  const tipLightMats = [];
  const carnivalMats = [];

  for (let i = 0; i < NUM_CABINS; i++) {
    const angle = (i / NUM_CABINS) * Math.PI * 2;
    const ry = Math.cos(angle) * WHEEL_RADIUS;
    const rz = Math.sin(angle) * WHEEL_RADIUS;

    // Pivot at the rim point — counter-rotation keeps gondola upright
    const pivotGroup = new Group();
    pivotGroup.name = `gondolaPivot_${i}`;
    pivotGroup.position.set(0, ry, rz);
    pivotGroup.userData.baseAngle = angle;
    wheelPivot.add(pivotGroup);
    gondolaPivots.push(pivotGroup);

    // Suspension arm (hangs from pivot down to gondola)
    const arm = new Mesh(
      new CylinderGeometry(0.035, 0.035, 0.6, 5),
      stdMat("#1E2A38", 0.2, 0.8)
    );
    arm.position.y = -0.3; // hang below pivot
    pivotGroup.add(arm);

    // Gondola body
    const bodyColor = GONDOLA_COLORS[i % GONDOLA_COLORS.length];
    const body = new Mesh(
      new BoxGeometry(0.85, 0.9, 0.65),
      stdMat(bodyColor, 0.45, 0.2)
    );
    body.position.y = -0.85; // below arm
    body.castShadow = !IS_MOB;
    pivotGroup.add(body);

    // Gondola roof
    if (!IS_MOB) {
      const roof = new Mesh(
        new BoxGeometry(0.92, 0.12, 0.7),
        stdMat(bodyColor, 0.35, 0.25)
      );
      roof.position.set(0, -0.37, 0);
      pivotGroup.add(roof);
    }

    // Window (desktop only)
    if (!IS_MOB) {
      const win = new Mesh(
        new BoxGeometry(0.55, 0.44, 0.04),
        new MeshBasicMaterial({ color: new Color("#A0D8EF"), transparent: true, opacity: 0.38, depthWrite: false })
      );
      win.position.set(0, -0.85, 0.345);
      pivotGroup.add(win);

      const winFrame = new Mesh(
        new BoxGeometry(0.58, 0.47, 0.03),
        neonMat(bodyColor, 0.55)
      );
      winFrame.position.set(0, -0.85, 0.348);
      pivotGroup.add(winFrame);
    }

    // Cabin underglow strip (attached to gondola pivot, hangs correctly)
    const glowColor = i % 2 === 0 ? "#00D4F0" : "#A078FF";
    const cgMat = neonMat(glowColor, 0.6);
    const underglow = new Mesh(new BoxGeometry(0.8, 0.04, 0.6), cgMat);
    underglow.position.y = -1.32; // below gondola body
    pivotGroup.add(underglow);

    // Spoke tip light at rim attachment
    const tipMat = neonMat(TIP_COLORS[i % TIP_COLORS.length], 0.95);
    const tipLight = new Mesh(new SphereGeometry(0.13, 6, 4), tipMat);
    tipLight.position.set(0, 0, 0); // at the pivot center (rim point)
    pivotGroup.add(tipLight);
    tipLightMats.push({ mat: tipMat, phase: angle });
  }

  // Chase bulbs around rim (children of wheelPivot — rotate with wheel)
  const CHASE_COLORS = ["#00E5FF","#A078FF","#40C8FF","#C43BFF","#00AAFF","#8844FF","#44EEFF","#FF44CC"];
  const carnivalCount = IS_MOB ? 12 : 32;
  for (let i = 0; i < carnivalCount; i++) {
    const a = (i / carnivalCount) * Math.PI * 2;
    const cMat = neonMat(CHASE_COLORS[i % CHASE_COLORS.length], 0.85);
    const bulb = new Mesh(new SphereGeometry(0.09, 5, 4), cMat);
    bulb.position.set(0, Math.cos(a) * (WHEEL_RADIUS + 0.28), Math.sin(a) * (WHEEL_RADIUS + 0.28));
    bulb.name = `carnival_${i}`;
    wheelPivot.add(bulb);
    carnivalMats.push({ mat: cMat, phase: a });
  }

  // ── Entry ring in world space ──────────────────────────────────
  const entryRing = new Mesh(
    new RingGeometry(1.1, 1.45, 32),
    new MeshBasicMaterial({ color: new Color("#00D4F0"), depthWrite: false, side: THREE.DoubleSide, transparent: true, opacity: 0.7 })
  );
  entryRing.rotation.x = -Math.PI / 2;
  entryRing.position.set(WHEEL_X, 0.01, WHEEL_Z + WHEEL_RADIUS + 0.2);
  entryRing.renderOrder = 1;
  scene.add(entryRing);

  // ── Point lights ───────────────────────────────────────────────
  const wheelLight = new PointLight();
  wheelLight.color = new Color("#00BBFF");
  wheelLight.intensity = 4.0;
  wheelLight.distance = 28;
  wheelLight.position.set(WHEEL_X, WHEEL_HUB_Y + 1, WHEEL_Z);
  scene.add(wheelLight);
  scene.userData.ferrisWheelLight = wheelLight;

  const baseSplashLight = new PointLight();
  baseSplashLight.color = new Color("#7C3AED");
  baseSplashLight.intensity = 2.5;
  baseSplashLight.distance = 14;
  baseSplashLight.position.set(WHEEL_X, 0.8, WHEEL_Z);
  scene.add(baseSplashLight);

  // ── Position root in world ─────────────────────────────────────
  scene.add(root);

  // ── Store for animation tick ───────────────────────────────────
  scene.userData.ferrisWheel = {
    root,
    wheelPivot,
    gondolaPivots,
    hubGlow,
    rimNeonMat,
    ledRimMat,
    ledRimMat2,
    wheelLight,
    baseSplashLight,
    baseLedMat,
    baseLedMat2,
    groundGlowMat,
    tipLightMats,
    carnivalMats,
    spokeNeonMats,
  };

  return { group: root };
}

// ── Animation tick ─────────────────────────────────────────────────
export function animateFerrisWheel(scene, t, audioBeat, playerX, playerZ, tvSmooth = false) {
  const fw = scene.userData.ferrisWheel;
  if (!fw) return;

  const dx = (playerX ?? 0) - WHEEL_X;
  const dz = (playerZ ?? 0) - WHEEL_Z;
  const dist = Math.sqrt(dx * dx + dz * dz);
  const tooFar = (IS_MOB || tvSmooth) && dist > (tvSmooth ? 30 : 35);

  if (!tooFar) {
    const wheelAngle = t * 0.16; // slow clockwise

    // Rotate the entire wheel (spokes, rim, gondola pivots all rotate together)
    fw.wheelPivot.rotation.z = wheelAngle;

    // Counter-rotate each gondola pivot so gondola stays upright
    for (const pivot of fw.gondolaPivots) {
      pivot.rotation.z = -wheelAngle;
    }
  }

  // ── Rim neon ──────────────────────────────────────────────────
  if (fw.rimNeonMat) {
    fw.rimNeonMat.opacity = tooFar ? 0.25 : (tvSmooth ? 0.5 : 0.4 + Math.sin(t * 1.8) * 0.15 + audioBeat * 0.25);
  }
  if (fw.ledRimMat) {
    fw.ledRimMat.opacity = tooFar ? 0.55 : (tvSmooth ? 0.85 : 0.75 + Math.sin(t * 1.4) * 0.15 + audioBeat * 0.2);
  }
  if (fw.ledRimMat2) {
    fw.ledRimMat2.opacity = tooFar ? 0.35 : (tvSmooth ? 0.6 : 0.5 + Math.sin(t * 1.9 + 1.2) * 0.12 + audioBeat * 0.15);
  }

  // ── Hub glow ──────────────────────────────────────────────────
  if (fw.hubGlow?.material) {
    fw.hubGlow.material.opacity = tooFar ? 0.4 : (tvSmooth ? 0.7 : 0.65 + Math.sin(t * 2.5) * 0.2 + audioBeat * 0.15);
  }

  // ── Point lights ──────────────────────────────────────────────
  if (fw.wheelLight) {
    fw.wheelLight.intensity = tooFar ? 1.5 : (tvSmooth ? 3.5 : 3.5 + Math.sin(t * 1.1) * 0.7 + audioBeat * 1.2);
  }
  if (fw.baseSplashLight) {
    fw.baseSplashLight.intensity = tooFar ? 0.5 : (tvSmooth ? 2.0 : 2.0 + Math.sin(t * 0.9 + 0.8) * 0.5 + audioBeat * 0.8);
  }

  // ── Base LED rings ────────────────────────────────────────────
  if (fw.baseLedMat) {
    fw.baseLedMat.opacity = tooFar ? 0.4 : (tvSmooth ? 0.7 : 0.6 + Math.sin(t * 1.2) * 0.18 + audioBeat * 0.2);
  }
  if (fw.baseLedMat2) {
    fw.baseLedMat2.opacity = tooFar ? 0.25 : (tvSmooth ? 0.5 : 0.4 + Math.sin(t * 1.6 + 2.0) * 0.15 + audioBeat * 0.18);
  }
  if (fw.groundGlowMat) {
    fw.groundGlowMat.opacity = tooFar ? 0.08 : (tvSmooth ? 0.18 : 0.16 + Math.sin(t * 0.8) * 0.06 + audioBeat * 0.08);
  }

  // ── Spoke neon ────────────────────────────────────────────────
  if (!tooFar && fw.spokeNeonMats) {
    for (const sn of fw.spokeNeonMats) {
      sn.mat.opacity = tvSmooth ? 0.6 : 0.5 + Math.sin(t * 1.3 + sn.phase) * 0.2 + audioBeat * 0.15;
    }
  }

  // ── Chase bulbs ───────────────────────────────────────────────
  if (!tooFar && fw.carnivalMats) {
    const maxBulbs = tvSmooth ? 6 : (IS_MOB ? 12 : fw.carnivalMats.length);
    for (let i = 0; i < maxBulbs; i++) {
      const c = fw.carnivalMats[i];
      if (tvSmooth) { c.mat.opacity = 0.65; continue; }
      c.mat.opacity = 0.45 + (Math.sin(t * 0.9 - c.phase) * 0.5 + 0.5) * 0.5 + audioBeat * 0.25;
    }
  }

  // ── Tip lights ────────────────────────────────────────────────
  if (!tooFar && fw.tipLightMats) {
    for (const tip of fw.tipLightMats) {
      tip.mat.opacity = tvSmooth ? 0.7 : 0.6 + (Math.sin(t * 1.6 + tip.phase) * 0.5 + 0.5) * 0.35 + audioBeat * 0.2;
    }
  }
}

// ── World-space cabin position for ride camera ─────────────────────
export function getCabinWorldPosition(cabinIndex, t) {
  const wheelAngle = t * 0.16;
  const baseAngle = (cabinIndex / NUM_CABINS) * Math.PI * 2;
  // wheelPivot rotates by wheelAngle around Z; gondolaPivot counter-rotates.
  // The gondola body stays upright; its world position follows the pivot point on the rim.
  // After wheelPivot.rotation.z = wheelAngle, pivot at (0, cos(base)*R, sin(base)*R) becomes:
  const totalAngle = baseAngle + wheelAngle;
  const localY = Math.cos(totalAngle) * WHEEL_RADIUS;
  const localZ = Math.sin(totalAngle) * WHEEL_RADIUS;

  // gondola body is at -0.85 Y below pivot (in counter-rotated space, so world-space Y offset)
  // The gondola stays upright so the body center is 0.85 below the pivot in world Y
  const pivotWorldY = WHEEL_HUB_Y + localY;
  const worldBodyY = pivotWorldY - 0.85;

  // root is at (WHEEL_X, 0, WHEEL_Z), rotated 0.26 on Y
  const ry = 0.26;
  const worldX = WHEEL_X + Math.cos(ry) * 0 - Math.sin(ry) * localZ;
  const worldY = Math.max(0.5, worldBodyY);
  const worldZ = WHEEL_Z + Math.sin(ry) * 0 + Math.cos(ry) * localZ;

  return { x: worldX, y: worldY, z: worldZ };
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