/**
 * FerrisWheel.jsx — Complete rebuild. True Ferris wheel mechanics.
 *
 * Coordinate system used here:
 *   • The wheel faces the camera (wheel plane = X-Y plane, wheel is vertical)
 *   • WheelGroup sits at (0, WHEEL_HUB_Y, 0) in root space and rotates around Z
 *   • A spoke tip at wheel angle θ is at (cos(θ)*R, sin(θ)*R, 0) in WheelGroup space
 *   • GondolaPivot is placed at the spoke tip, counter-rotates to stay upright
 *   • Gondola body hangs BELOW the pivot in world Y (position.y = -hangLen)
 *
 * Hierarchy:
 *   root (Group @ world pos, root.rotation.y = facing angle)
 *     staticGroup
 *       base platform
 *       left A-frame leg
 *       right A-frame leg
 *       cross braces
 *       hub housing (static shell)
 *       boarding deck
 *     wheelGroup  ← rotates around Z
 *       innerHub (visual spin disc)
 *       rimStructural (front + back torus)
 *       ledRim, ledRim2 (neon rings)
 *       spokes[i] (cylinders hub→rim)
 *       gondolaPivot[i]  ← at rim point, counter-rotates
 *         suspensionArm
 *         gondolaBody
 *         gondolaRoof
 *         windowGlass
 *         underglow LED
 *         tipLight sphere
 *       chaseBulbs[i]
 */

import * as THREE from "three";

const {
  MeshStandardMaterial, MeshBasicMaterial, Color,
  CircleGeometry, CylinderGeometry, SphereGeometry,
  BoxGeometry, TorusGeometry, RingGeometry,
  Mesh, Group, PointLight, Vector3, Quaternion,
} = THREE;

// ── World placement ────────────────────────────────────────────────
export const WHEEL_X = 22;
export const WHEEL_Z = 5;
export const WHEEL_INTERACT_RADIUS = 10;
export const WHEEL_RADIUS = 6.2;       // rim center radius
export const NUM_CABINS = 8;
export const WHEEL_HUB_Y = 8.8;       // hub center above ground
export const WHEEL_SPEED = 0.14;       // radians/sec — slow, scenic

const IS_MOB = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
const SEG = IS_MOB ? 32 : 56;         // torus/circle segment count

// ── Material factory helpers ───────────────────────────────────────
function stdMat(hex, roughness = 0.5, metalness = 0.3) {
  const m = new MeshStandardMaterial({ color: new Color(hex), roughness, metalness });
  return m;
}

function neonMat(hex, opacity = 0.85) {
  return new MeshBasicMaterial({
    color: new Color(hex), transparent: true, opacity, depthWrite: false,
  });
}

// ── Build a single spoke: cylinder from hub-edge to rim-edge ───────
// In WheelGroup space the wheel is in the X-Y plane.
// Tip of spoke at angle θ: (cos(θ)*R, sin(θ)*R, 0).
// CylinderGeometry default axis is +Y. We rotate it to point hub→tip.
function buildSpoke(parent, angle, length, radius, material) {
  const cx = Math.cos(angle);
  const cy = Math.sin(angle);

  const spoke = new Mesh(new CylinderGeometry(radius, radius, length, 6), material);
  // Position at midpoint
  spoke.position.set(cx * length / 2, cy * length / 2, 0);
  // Align default +Y to (cx, cy, 0)
  const from = new Vector3(0, 1, 0);
  const to = new Vector3(cx, cy, 0).normalize();
  spoke.quaternion.copy(new Quaternion().setFromUnitVectors(from, to));
  parent.add(spoke);
  return spoke;
}

// ── Main build function ────────────────────────────────────────────
export function createFerrisWheel(scene) {
  const root = new Group();
  root.name = "ferrisWheel";
  root.position.set(WHEEL_X, 0, WHEEL_Z);
  // Rotate the whole ride ~20° so it faces into the city
  root.rotation.y = 0.35;

  // ══ STATIC GROUP ══════════════════════════════════════════════════
  const staticGroup = new Group();
  staticGroup.name = "ferrisStatic";
  root.add(staticGroup);

  // Ground base platform
  const base = new Mesh(
    new CylinderGeometry(4.2, 4.6, 0.25, 32),
    stdMat("#1A1A26", 0.45, 0.55)
  );
  base.position.set(0, 0.125, 0);
  base.receiveShadow = true;
  staticGroup.add(base);

  // ── A-frame support legs ──
  // Two inverted-V steel frames, one on each side (± X in root space).
  // Each frame: two legs meeting at the hub height, wide at the base.
  // Base foot X = ±3.8,  hub attachment X = ±1.0
  // This keeps legs well clear of the gondola sweep (max gondola half-width ~0.5)
  const legMat = stdMat("#23304A", 0.3, 0.8);
  const HUB_Y = WHEEL_HUB_Y;

  // Each side: front leg and back leg (along Z)
  for (const side of [-1, 1]) {
    const footX = side * 3.8;
    const topX  = side * 1.0;

    for (const footZ of [-0.9, 0.9]) {
      // Leg is a cylinder connecting (footX, 0, footZ) → (topX, HUB_Y, 0)
      const start = new Vector3(footX, 0, footZ);
      const end   = new Vector3(topX, HUB_Y, 0);
      const mid   = start.clone().lerp(end, 0.5);
      const dir   = end.clone().sub(start);
      const len   = dir.length();

      const leg = new Mesh(new CylinderGeometry(0.17, 0.22, len, 8), legMat);
      leg.position.copy(mid);
      // Rotate +Y to direction
      const q = new Quaternion().setFromUnitVectors(new Vector3(0, 1, 0), dir.clone().normalize());
      leg.quaternion.copy(q);
      leg.castShadow = true;
      staticGroup.add(leg);
    }

    // Horizontal brace connecting the two legs on this side at mid-height
    for (const braceY of [HUB_Y * 0.35, HUB_Y * 0.65]) {
      const brace = new Mesh(new CylinderGeometry(0.07, 0.07, 1.85, 6), stdMat("#1D2B3C", 0.3, 0.75));
      brace.position.set(side * 3.0 * (1 - braceY / HUB_Y) + topX * (braceY / HUB_Y), braceY, 0);
      brace.rotation.x = Math.PI / 2;
      staticGroup.add(brace);
    }
  }

  // Cross brace between the two sides at hub height (behind the wheel)
  const crossBraceMat = stdMat("#1A2838", 0.25, 0.82);
  for (const braceZ of [-0.75, 0.75]) {
    for (const braceY of [HUB_Y * 0.45, HUB_Y * 0.72]) {
      const cb = new Mesh(new CylinderGeometry(0.065, 0.065, 7.8, 6), crossBraceMat);
      cb.position.set(0, braceY, braceZ);
      cb.rotation.z = Math.PI / 2;
      staticGroup.add(cb);
    }
  }

  // ── Hub housing (static shell around axle) ──
  const hubShell = new Mesh(
    new CylinderGeometry(0.52, 0.52, 1.6, 24),
    stdMat("#1B2A3C", 0.15, 0.9)
  );
  hubShell.rotation.z = Math.PI / 2; // axis along X
  hubShell.position.set(0, HUB_Y, 0);
  staticGroup.add(hubShell);

  // Hub end caps
  for (const sx of [-0.85, 0.85]) {
    const cap = new Mesh(new CylinderGeometry(0.5, 0.5, 0.14, 20), stdMat("#243344", 0.18, 0.88));
    cap.rotation.z = Math.PI / 2;
    cap.position.set(sx, HUB_Y, 0);
    staticGroup.add(cap);
  }

  // Hub neon ring (static)
  const hubNeon = new Mesh(
    new TorusGeometry(0.45, 0.065, 8, 24),
    neonMat("#FFD700", 0.9)
  );
  // Torus default is in X-Y plane; we want it in Y-Z plane (showing as circle when viewed from front)
  // Since wheel is in X-Y plane and hub axle runs along X, a ring in Y-Z plane works
  hubNeon.rotation.y = Math.PI / 2;
  hubNeon.position.set(0, HUB_Y, 0);
  staticGroup.add(hubNeon);

  // ── Boarding deck ──
  // Placed at Z+ side of the wheel (loading zone at bottom-front)
  const deckMat = stdMat("#232336", 0.4, 0.45);
  const deck = new Mesh(new BoxGeometry(2.8, 0.28, 1.8), deckMat);
  deck.position.set(0, 0.42, WHEEL_RADIUS - 0.3);
  deck.castShadow = true;
  staticGroup.add(deck);

  // Deck edge neon strip
  const deckStrip = new Mesh(new BoxGeometry(2.85, 0.055, 0.055), neonMat("#00E5FF", 0.85));
  deckStrip.position.set(0, 0.58, WHEEL_RADIUS + 0.62);
  staticGroup.add(deckStrip);

  // Deck side railings
  for (const sx of [-1.35, 1.35]) {
    const rail = new Mesh(new BoxGeometry(0.045, 0.75, 1.8), stdMat("#2E3A4E", 0.3, 0.7));
    rail.position.set(sx, 0.94, WHEEL_RADIUS - 0.3);
    staticGroup.add(rail);
    const topRail = new Mesh(new BoxGeometry(0.045, 0.045, 1.8), neonMat("#00C8FF", 0.55));
    topRail.position.set(sx, 1.32, WHEEL_RADIUS - 0.3);
    staticGroup.add(topRail);
  }

  // Base neon rings (stationary ground decor)
  const baseLed1Mat = neonMat("#00D4F0", 0.78);
  const baseLed1 = new Mesh(new TorusGeometry(4.25, 0.07, 6, SEG), baseLed1Mat);
  baseLed1.rotation.x = Math.PI / 2;
  baseLed1.position.set(0, 0.28, 0);
  staticGroup.add(baseLed1);

  const baseLed2Mat = neonMat("#C43BFF", 0.55);
  const baseLed2 = new Mesh(new TorusGeometry(3.0, 0.05, 6, IS_MOB ? 28 : 44), baseLed2Mat);
  baseLed2.rotation.x = Math.PI / 2;
  baseLed2.position.set(0, 0.27, 0);
  staticGroup.add(baseLed2);

  // Ground glow disc
  const glowDiscMat = new MeshBasicMaterial({
    color: new Color("#002299"), transparent: true, opacity: 0.2,
    depthWrite: false, side: THREE.DoubleSide,
  });
  const glowDisc = new Mesh(new CircleGeometry(5.2, 32), glowDiscMat);
  glowDisc.rotation.x = -Math.PI / 2;
  glowDisc.position.set(0, 0.01, 0);
  glowDisc.renderOrder = 1;
  staticGroup.add(glowDisc);

  // ══ WHEEL GROUP — rotates around Z ════════════════════════════════
  const wheelGroup = new Group();
  wheelGroup.name = "wheelGroup";
  wheelGroup.position.set(0, HUB_Y, 0);
  root.add(wheelGroup);

  // Inner hub disc (rotates visually with wheel)
  const innerHub = new Mesh(
    new CylinderGeometry(0.7, 0.7, 0.85, 20),
    stdMat("#1C2838", 0.22, 0.82)
  );
  innerHub.rotation.z = Math.PI / 2;
  wheelGroup.add(innerHub);

  // Structural rim (two parallel structural tori, one on each side of Z)
  // In X-Y plane — default torus orientation (ring in X-Y plane)
  const rimStructMat = stdMat("#243444", 0.22, 0.78);
  const rimFront = new Mesh(new TorusGeometry(WHEEL_RADIUS, 0.17, 10, SEG), rimStructMat);
  rimFront.position.z = 0.35;
  rimFront.castShadow = !IS_MOB;
  wheelGroup.add(rimFront);

  const rimBack = new Mesh(new TorusGeometry(WHEEL_RADIUS, 0.17, 10, SEG), stdMat("#1E2C3C", 0.25, 0.78));
  rimBack.position.z = -0.35;
  rimBack.castShadow = !IS_MOB;
  wheelGroup.add(rimBack);

  // LED neon rim strips (rotate with wheel)
  const ledRimMat = neonMat("#00E5FF", 0.88);
  const ledRim = new Mesh(new TorusGeometry(WHEEL_RADIUS + 0.20, 0.07, 6, SEG), ledRimMat);
  ledRim.name = "ledRim";
  wheelGroup.add(ledRim);

  const ledRim2Mat = neonMat("#A078FF", 0.62);
  const ledRim2 = new Mesh(new TorusGeometry(WHEEL_RADIUS - 0.16, 0.05, 6, IS_MOB ? 36 : SEG), ledRim2Mat);
  ledRim2.name = "ledRim2";
  wheelGroup.add(ledRim2);

  const rimNeonMat = neonMat("#00C8FF", 0.5);
  const rimNeon = new Mesh(new TorusGeometry(WHEEL_RADIUS + 0.04, 0.04, 6, SEG), rimNeonMat);
  rimNeon.name = "rimNeon";
  wheelGroup.add(rimNeon);

  // ── Spokes ──
  // Spokes from hub surface to rim. In X-Y plane.
  const spokeMat = stdMat("#1E2D42", 0.22, 0.82);
  const SPOKE_NEON_COLORS = ["#00E5FF", "#A078FF", "#00C8FF", "#C43BFF"];
  const SPOKE_LEN = WHEEL_RADIUS - 0.78; // hub radius 0.70 + rim tube 0.17 + clearance
  const spokeNeonMats = [];

  for (let i = 0; i < NUM_CABINS; i++) {
    const angle = (i / NUM_CABINS) * Math.PI * 2;

    // Two structural spokes per cabin (front + back Z offset)
    for (const zo of [0.28, -0.28]) {
      const sg = new Group();
      sg.position.z = zo;
      buildSpoke(sg, angle, SPOKE_LEN, 0.055, spokeMat);
      wheelGroup.add(sg);
    }

    // Neon center spoke (every other cabin)
    if (i % 2 === 0) {
      const snMat = neonMat(SPOKE_NEON_COLORS[(i / 2) % SPOKE_NEON_COLORS.length], 0.72);
      const sng = new Group();
      buildSpoke(sng, angle, SPOKE_LEN, 0.038, snMat);
      wheelGroup.add(sng);
      spokeNeonMats.push({ mat: snMat, phase: angle });
    }
  }

  // ── Chase bulbs around rim ──
  const CHASE_COLORS = ["#00E5FF","#A078FF","#40C8FF","#C43BFF","#00AAFF","#8844FF","#44EEFF","#FF44CC"];
  const chaseCount = IS_MOB ? 16 : 36;
  const carnivalMats = [];
  for (let i = 0; i < chaseCount; i++) {
    const a = (i / chaseCount) * Math.PI * 2;
    const cMat = neonMat(CHASE_COLORS[i % CHASE_COLORS.length], 0.88);
    const bulb = new Mesh(new SphereGeometry(0.09, 5, 4), cMat);
    bulb.position.set(
      Math.cos(a) * (WHEEL_RADIUS + 0.28),
      Math.sin(a) * (WHEEL_RADIUS + 0.28),
      0
    );
    bulb.name = `chase_${i}`;
    wheelGroup.add(bulb);
    carnivalMats.push({ mat: cMat, phase: a });
  }

  // ── Gondola pivots ──
  // Pivot sits at the rim attachment point in WheelGroup space: (cos(θ)*R, sin(θ)*R, 0).
  // Counter-rotation around Z keeps pivot's local Y pointing world-up.
  // Gondola body hangs at local Y = -(ARM + BODY_HALF) below pivot.
  const GONDOLA_COLORS = ["#C8321E","#1E5FC8","#2EA83A","#C89A1E","#C83278","#1E9AC8","#7C3AED","#C85A1E"];
  const TIP_COLORS    = ["#00E5FF","#A078FF","#00C8FF","#C43BFF","#40AAFF","#AA60FF","#00FFCC","#FF60CC"];
  const gondolaPivots = [];
  const tipLightMats  = [];
  const HANG_ARM = 0.55;   // suspension arm length
  const BODY_H   = 0.88;   // gondola body height
  const BODY_D   = 0.38;   // gondola depth (along wheel axis Z)

  for (let i = 0; i < NUM_CABINS; i++) {
    const angle = (i / NUM_CABINS) * Math.PI * 2;
    const rimX = Math.cos(angle) * WHEEL_RADIUS;
    const rimY = Math.sin(angle) * WHEEL_RADIUS;

    // Pivot at rim attachment point
    const pivot = new Group();
    pivot.name = `gondolaPivot_${i}`;
    pivot.position.set(rimX, rimY, 0);
    pivot.userData.baseAngle = angle;
    wheelGroup.add(pivot);
    gondolaPivots.push(pivot);

    // Suspension arm (cylinder pointing down in pivot-local space)
    const arm = new Mesh(
      new CylinderGeometry(0.032, 0.032, HANG_ARM, 5),
      stdMat("#1E2A3A", 0.2, 0.82)
    );
    arm.position.y = -(HANG_ARM / 2);
    pivot.add(arm);

    // ── Gondola body ──
    const bodyY = -(HANG_ARM + BODY_H / 2); // center of body below pivot
    const bodyColor = GONDOLA_COLORS[i % GONDOLA_COLORS.length];
    const body = new Mesh(
      new BoxGeometry(0.80, BODY_H, BODY_D * 2),
      stdMat(bodyColor, 0.45, 0.22)
    );
    body.position.y = bodyY;
    body.castShadow = !IS_MOB;
    pivot.add(body);

    // Gondola roof canopy
    const roof = new Mesh(
      new BoxGeometry(0.88, 0.11, BODY_D * 2 + 0.06),
      stdMat(bodyColor, 0.35, 0.28)
    );
    roof.position.y = -(HANG_ARM) - 0.06; // sits on top of body
    pivot.add(roof);

    // Window glass (front face)
    if (!IS_MOB) {
      const glass = new Mesh(
        new BoxGeometry(0.52, 0.40, 0.04),
        new MeshBasicMaterial({ color: new Color("#A0D8EF"), transparent: true, opacity: 0.35, depthWrite: false })
      );
      glass.position.set(0, bodyY + 0.05, BODY_D + 0.03);
      pivot.add(glass);

      // Window frame neon outline
      const wf = new Mesh(
        new BoxGeometry(0.56, 0.44, 0.03),
        neonMat(bodyColor, 0.5)
      );
      wf.position.set(0, bodyY + 0.05, BODY_D + 0.035);
      pivot.add(wf);
    }

    // Underglow strip (bottom of cabin)
    const ugColor = i % 2 === 0 ? "#00D4F0" : "#A078FF";
    const ugMat = neonMat(ugColor, 0.65);
    const ugStrip = new Mesh(new BoxGeometry(0.76, 0.04, BODY_D * 1.8), ugMat);
    ugStrip.position.y = -(HANG_ARM + BODY_H) - 0.04;
    pivot.add(ugStrip);

    // Rim-point tip light sphere
    const tipMat = neonMat(TIP_COLORS[i % TIP_COLORS.length], 0.95);
    const tipSphere = new Mesh(new SphereGeometry(0.13, 6, 4), tipMat);
    tipSphere.position.set(0, 0, 0); // at pivot center (rim point)
    pivot.add(tipSphere);
    tipLightMats.push({ mat: tipMat, phase: angle });
  }

  // ── Entry ring in world space (boarding marker on ground) ──────
  const entryRing = new Mesh(
    new RingGeometry(1.05, 1.42, 32),
    new MeshBasicMaterial({ color: new Color("#00D4F0"), depthWrite: false, side: THREE.DoubleSide, transparent: true, opacity: 0.7 })
  );
  entryRing.rotation.x = -Math.PI / 2;
  // Boarding zone is at the bottom of the wheel (+Z side in root space, after root.rotation.y)
  entryRing.position.set(WHEEL_X, 0.01, WHEEL_Z + WHEEL_RADIUS + 0.5);
  entryRing.renderOrder = 1;
  scene.add(entryRing);

  // ── Point lights ──────────────────────────────────────────────────
  const wheelLight = new PointLight();
  wheelLight.color = new Color("#00BBFF");
  wheelLight.intensity = 4.2;
  wheelLight.distance = 30;
  wheelLight.position.set(WHEEL_X, HUB_Y + 1, WHEEL_Z);
  scene.add(wheelLight);
  scene.userData.ferrisWheelLight = wheelLight;

  const baseSplashLight = new PointLight();
  baseSplashLight.color = new Color("#7C3AED");
  baseSplashLight.intensity = 2.5;
  baseSplashLight.distance = 14;
  baseSplashLight.position.set(WHEEL_X, 1.0, WHEEL_Z);
  scene.add(baseSplashLight);

  // ── Add root to scene ─────────────────────────────────────────────
  scene.add(root);

  // ── Store references for animation tick ─────────────────────────
  scene.userData.ferrisWheel = {
    root,
    wheelGroup,
    gondolaPivots,
    hubNeon,
    rimNeonMat,
    ledRimMat,
    ledRim2Mat,
    wheelLight,
    baseSplashLight,
    baseLed1Mat,
    baseLed2Mat,
    glowDiscMat,
    tipLightMats,
    carnivalMats,
    spokeNeonMats,
  };

  return { group: root };
}

// ── Animation tick ──────────────────────────────────────────────────
export function animateFerrisWheel(scene, t, audioBeat = 0, playerX = 0, playerZ = 0, tvSmooth = false) {
  const fw = scene.userData.ferrisWheel;
  if (!fw) return;

  const dx = playerX - WHEEL_X;
  const dz = playerZ - WHEEL_Z;
  const dist = Math.sqrt(dx * dx + dz * dz);
  const farAway = (IS_MOB || tvSmooth) && dist > (tvSmooth ? 28 : 34);

  if (!farAway) {
    const wheelAngle = t * WHEEL_SPEED;

    // Rotate the entire wheel group (rim, spokes, chase bulbs, gondola pivots all move together)
    fw.wheelGroup.rotation.z = wheelAngle;

    // Counter-rotate each gondola pivot to keep gondola body upright in world space.
    // wheelGroup.rotation.z = wheelAngle causes each pivot to orbit.
    // Counter-rotation: pivot.rotation.z = -wheelAngle keeps pivot's local axes world-aligned.
    for (const pivot of fw.gondolaPivots) {
      pivot.rotation.z = -wheelAngle;
    }
  }

  // ── Neon animations ───────────────────────────────────────────────
  const beat = audioBeat || 0;

  if (fw.rimNeonMat)  fw.rimNeonMat.opacity  = farAway ? 0.25 : (tvSmooth ? 0.48 : 0.38 + Math.sin(t * 1.8) * 0.14 + beat * 0.22);
  if (fw.ledRimMat)   fw.ledRimMat.opacity   = farAway ? 0.55 : (tvSmooth ? 0.82 : 0.72 + Math.sin(t * 1.4) * 0.15 + beat * 0.18);
  if (fw.ledRim2Mat)  fw.ledRim2Mat.opacity  = farAway ? 0.32 : (tvSmooth ? 0.58 : 0.48 + Math.sin(t * 1.9 + 1.2) * 0.12 + beat * 0.14);
  if (fw.hubNeon?.material) fw.hubNeon.material.opacity = farAway ? 0.38 : (tvSmooth ? 0.68 : 0.62 + Math.sin(t * 2.4) * 0.2 + beat * 0.15);

  if (fw.wheelLight)      fw.wheelLight.intensity      = farAway ? 1.5 : (tvSmooth ? 3.5 : 3.4 + Math.sin(t * 1.1) * 0.7 + beat * 1.1);
  if (fw.baseSplashLight) fw.baseSplashLight.intensity = farAway ? 0.5 : (tvSmooth ? 2.0 : 1.9 + Math.sin(t * 0.9 + 0.8) * 0.5 + beat * 0.8);

  if (fw.baseLed1Mat)  fw.baseLed1Mat.opacity  = farAway ? 0.38 : (tvSmooth ? 0.68 : 0.58 + Math.sin(t * 1.2) * 0.18 + beat * 0.2);
  if (fw.baseLed2Mat)  fw.baseLed2Mat.opacity  = farAway ? 0.22 : (tvSmooth ? 0.48 : 0.38 + Math.sin(t * 1.6 + 2.0) * 0.15 + beat * 0.16);
  if (fw.glowDiscMat)  fw.glowDiscMat.opacity  = farAway ? 0.07 : (tvSmooth ? 0.17 : 0.15 + Math.sin(t * 0.8) * 0.06 + beat * 0.07);

  if (!farAway && fw.spokeNeonMats) {
    for (const sn of fw.spokeNeonMats) {
      sn.mat.opacity = tvSmooth ? 0.58 : 0.48 + Math.sin(t * 1.3 + sn.phase) * 0.2 + beat * 0.14;
    }
  }

  if (!farAway && fw.carnivalMats) {
    const maxB = tvSmooth ? 8 : (IS_MOB ? 16 : fw.carnivalMats.length);
    for (let i = 0; i < maxB; i++) {
      const c = fw.carnivalMats[i];
      c.mat.opacity = tvSmooth ? 0.65 : 0.42 + (Math.sin(t * 0.9 - c.phase) * 0.5 + 0.5) * 0.5 + beat * 0.24;
    }
  }

  if (!farAway && fw.tipLightMats) {
    for (const tip of fw.tipLightMats) {
      tip.mat.opacity = tvSmooth ? 0.68 : 0.58 + (Math.sin(t * 1.6 + tip.phase) * 0.5 + 0.5) * 0.32 + beat * 0.18;
    }
  }
}

// ── World-space gondola position for ride camera ───────────────────
// Returns {x, y, z} of gondola body center in world space.
export function getCabinWorldPosition(cabinIndex, t) {
  const wheelAngle = t * WHEEL_SPEED;
  const baseAngle  = (cabinIndex / NUM_CABINS) * Math.PI * 2;
  const totalAngle = baseAngle + wheelAngle;
  const localX = Math.cos(totalAngle) * WHEEL_RADIUS;
  const localY = Math.sin(totalAngle) * WHEEL_RADIUS;

  const HANG_ARM = 0.55;
  const BODY_H   = 0.88;
  const pivotWorldY  = WHEEL_HUB_Y + localY;
  const bodyWorldY   = Math.max(0.6, pivotWorldY - HANG_ARM - BODY_H / 2);

  const ry = 0.35;
  const worldX = WHEEL_X + Math.cos(ry) * localX;
  const worldZ = WHEEL_Z + Math.sin(ry) * localX;

  return { x: worldX, y: bodyWorldY, z: worldZ };
}

// ── Rider camera transform for scenic Ferris wheel view ─────────────
// Returns { camPos, lookAt, atTop } in world space.
//
// KEY DESIGN: the gaze is computed as a POINT IN WORLD SPACE (not a cabin-
// relative yaw). The gaze traces a closed piecewise C¹ bezier curve that
// visits three scenic holds in a 50s loop:
//   Stage ≈ 15s → Center ≈ 10s → Beach ≈ 15s → transit back to Stage ≈ 10s
// Each segment is a cubic bezier between holds; adjacent segments share the
// same tangent direction at the shared hold (= a single "knot"), and the
// loop from the last hold back to the first is itself a C¹ connection, so
// there is NO boundary jump, NO yaw reversal, NO wrap blend.
//
// The camera positions per frame are the cabin's orbit (camX/camY/camZ) as
// defined by the gondola motion — purely for the eye position. the look
// direction to gazeWorld is recomputed in world space each frame, so the
// rLookSmooth lerp always tracks a monotonic direction and never resets.
//
// userYawOffset / userPitchOffset: soft gaze bias (±33° /±15°) applied to
// the world-space point so the cabin rotation doesn't fight the offset.

// ── Three scenic holds (viewpoints the rider settles on) ────────────
// Each is a point in world space the gaze lingers at.
const HOLD_BEACH  = { x:  0, y:  3.0, z:  28 }; // mid-beach / shoreline
const HOLD_CENTER = { x:  0, y:  6.5, z: -13 }; // center plaza / city
const HOLD_STAGE  = { x:  0, y:  5.0, z: -31 }; // music stage / dance floor

// ── Knots: the gaze follows HOLD1→HOLD2→HOLD3→HOLD1 in a closed loop ─
// To keep the implementation simple and time-balanced, we place the three
// holds evenly around a circle in the (y,z) plane and use uniform timing.
// Every segment between holds is a cubic bezier; the CONTROL POINT behaves
// as a single tangent knot — ctlA(cabin) points INTO the hold from the
// previous segment, and ctlB points OUT toward the next segment.
//
//   The closed loop has 4 edges (3 forward + 1 wrap-back), each 0.25 of the
//   50s period = 12.5s. The easeStep per segment ramps through ≈4s transit
//   accel + 4s decel, leaving each hold comfortably settled  ≈4-5s.
const K = 0.50;

export function getRiderCameraTransform(t, userYawOffset = 0, userPitchOffset = 0) {
  const wheelAngle = t * WHEEL_SPEED;

  // ── Gondola position in world space ──────────────────────────────
  // (identical eye computation — unchanged from earlier versions)
  const pivotLocalX = Math.cos(wheelAngle) * WHEEL_RADIUS;
  const pivotLocalY = Math.sin(wheelAngle) * WHEEL_RADIUS;
  const pivotWorldY = WHEEL_HUB_Y + pivotLocalY;

  const HANG_ARM = 0.55;
  const BODY_H   = 0.88;
  const gondolaFloorY = pivotWorldY - HANG_ARM - BODY_H;
  const camY = Math.max(1.2, gondolaFloorY + BODY_H * 0.4);

  const ry = 0.35;
  const pivotWX = WHEEL_X + Math.cos(ry) * pivotLocalX;
  const pivotWZ = WHEEL_Z + Math.sin(ry) * pivotLocalX;
  const rimLocalLen = Math.abs(pivotLocalX) || 0.001;
  const radOutWX = (pivotWX - WHEEL_X) / rimLocalLen;
  const radOutWZ = (pivotWZ - WHEEL_Z) / rimLocalLen;
  const axleWX = Math.sin(ry), axleWZ = Math.cos(ry);
  const INWARD_PULL = 1.6, AXLE_PUSH = 0.55;
  const camX = pivotWX - radOutWX * INWARD_PULL + axleWX * AXLE_PUSH;
  const camZ = pivotWZ - radOutWZ * INWARD_PULL + axleWZ * AXLE_PUSH;

  // ═══════════════════════════════════════════════════════════════════
  // C¹ BEZIER VIA CHORD TANGENTS — 50s loop, 4×12.5s edges
  // ═══════════════════════════════════════════════════════════════════
  // THE FIX: the tangent at each knot points ALONG the CHORD (E0→E1),
  // NOT the knot two ahead (E2). All edges use identical arm length
  // (= K × average chord length) so bezier derivative magnitude is
  // identical entering AND leaving every knot (true C¹). The gaze
  // decisively reaches each hold, settles ≈4-5s, then transitions
  // to the next — with NO direction reversal, NO wrap jump.
  const NE = 4, T = 50;
  const p = (t % T) / T;
  const idx = Math.floor(p * NE);
  const edg = p * NE - idx; // 0‥1 within edge idx
  const E0 = [HOLD_BEACH, HOLD_CENTER, HOLD_STAGE][idx % 3];
  const E1 = [HOLD_BEACH, HOLD_CENTER, HOLD_STAGE][(idx + 1) % 3];

  const dx = E1.x - E0.x, dy = E1.y - E0.y, dz = E1.z - E0.z;
  const mLen = Math.sqrt(dx * dx + dy * dy + dz * dz) || 0.001;
  // Precompute average chord ONCE per instance
  if (!HOLD_BEACH.__ca) {
    const cl = (i) => { const a=[HOLD_BEACH,HOLD_CENTER,HOLD_STAGE][i],b=[HOLD_BEACH,HOLD_CENTER,HOLD_STAGE][(i+1)%3]; return Math.sqrt((b.x-a.x)**2+(b.y-a.y)**2+(b.z-a.z)**2)||0.001; };
    HOLD_BEACH.__ca = (cl(0) + cl(1) + cl(2) + cl(0)) / 4;
  }
  const arm = K * HOLD_BEACH.__ca; // same length for EVERY edge → C¹
  const u0 = dx / mLen, v0 = dy / mLen, w0 = dz / mLen;
  const cAx = E0.x + u0 * arm, cAy = E0.y + v0 * arm, cAz = E0.z + w0 * arm;
  const cBx = E1.x - u0 * arm, cBy = E1.y - v0 * arm, cBz = E1.z - w0 * arm;

  const sg = (() => { const c = Math.max(0, Math.min(1, edg)); return c * c * (3 - 2 * c); })(); // smoothstep
  const f0 = (1 - sg) * (1 - sg) * (1 - sg);
  const f1 = 3 * sg * (1 - sg) * (1 - sg);
  const f2 = 3 * sg * sg * (1 - sg);
  const f3 = sg * sg * sg;
  const gazX = f0 * E0.x + f1 * cAx + f2 * cBx + f3 * E1.x;
  const gazY = f0 * E0.y + f1 * cAy + f2 * cBy + f3 * E1.y;
  const gazZ = f0 * E0.z + f1 * cAz + f2 * cBz + f3 * E1.z;

  // ── User look offsets applied to the world gaze point ────────────
  // (not cabin-relative offsets, which would fight the gondola rotation).
  const MAX_YAW   = (33 * Math.PI) / 180;
  const MAX_PITCH = (15 * Math.PI) / 180;
  const uy = Math.max(-MAX_YAW,   Math.min(MAX_YAW,   userYawOffset));
  const up = Math.max(-MAX_PITCH, Math.min(MAX_PITCH, userPitchOffset));

  const dtx = gazX - camX, dty = gazY - camY, dtz = gazZ - camZ;
  const baseYaw   = Math.atan2(dtx, dtz);
  const dist2 = dtx * dtx + dty * dty + dtz * dtz;
  const basePitch = Math.asin(Math.max(-1, Math.min(1, dty / (Math.sqrt(dist2) || 1))));
  const fY = baseYaw + uy;
  const fP = Math.max(-0.35, Math.min(0.50, basePitch + up));

  const LOOK_DIST = 55;
  const lx = camX + Math.sin(fY) * Math.cos(fP) * LOOK_DIST;
  const ly = camY + Math.sin(fP) * LOOK_DIST;
  const lz = camZ + Math.cos(fY) * Math.cos(fP) * LOOK_DIST;

  const atTop = Math.max(0, Math.min(1,
    (pivotWorldY - WHEEL_HUB_Y + WHEEL_RADIUS) / (WHEEL_RADIUS * 2)
  ));

  return { camPos: { x: camX, y: camY, z: camZ }, lookAt: { x: lx, y: ly, z: lz }, atTop };
}

// Boarding position (near bottom of wheel, in front of the deck)
export function getBoardingPosition() {
  const ry = 0.35;
  const localZ = WHEEL_RADIUS + 0.6;
  return {
    x: WHEEL_X - Math.sin(ry) * localZ,
    y: 0.55,
    z: WHEEL_Z + Math.cos(ry) * localZ,
  };
}