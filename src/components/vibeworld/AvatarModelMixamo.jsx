/**
 * AvatarModelMixamo — "Human" test avatar.
 *
 * Fully procedural — no GLB loading, no CORS issues, instant appearance.
 * Visually distinct from the soldier: casual human proportions, colored outfit,
 * procedural limb animation for walk/run/idle/dance.
 *
 * TEST ONLY — original soldier remains the permanent default.
 */

import * as THREE from "three";

// ── Color palette — clearly different from soldier's dark armor ──
const SKIN  = 0xC68642;   // warm skin tone
const SHIRT = 0x2255CC;   // blue hoodie
const PANTS = 0x222244;   // dark navy pants
const SHOES = 0x111111;   // black sneakers
const HAIR  = 0x1A0A00;   // dark hair

function mat(hex, roughness = 0.75) {
  return new THREE.MeshStandardMaterial({ color: hex, roughness, metalness: 0.05 });
}

function box(w, h, d, color) {
  return new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(color));
}

function sphere(r, color) {
  return new THREE.Mesh(new THREE.SphereGeometry(r, 8, 6), mat(color));
}

function makeShadow() {
  const m = new THREE.Mesh(
    new THREE.CircleGeometry(0.28, 12),
    new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.22, depthWrite: false })
  );
  m.rotation.x = -Math.PI / 2;
  m.position.y = 0.01;
  return m;
}

// ── Build humanoid skeleton as parented groups ──────────────────────────
function buildHuman() {
  // Root (at feet level — matches controller position)
  const root = new THREE.Group();
  root.name = "avatarModel";

  // ── Legs ──
  const leftLeg  = new THREE.Group(); // pivot at hip
  const rightLeg = new THREE.Group();

  // Upper legs
  const lUpper = box(0.14, 0.38, 0.13, PANTS);
  lUpper.position.y = -0.19;
  leftLeg.add(lUpper);

  const rUpper = box(0.14, 0.38, 0.13, PANTS);
  rUpper.position.y = -0.19;
  rightLeg.add(rUpper);

  // Lower leg pivots (at knee)
  const leftKnee  = new THREE.Group();
  const rightKnee = new THREE.Group();
  leftKnee.position.y  = -0.38;
  rightKnee.position.y = -0.38;

  const lLower = box(0.12, 0.36, 0.12, PANTS);
  lLower.position.y = -0.18;
  leftKnee.add(lLower);

  const rLower = box(0.12, 0.36, 0.12, PANTS);
  rLower.position.y = -0.18;
  rightKnee.add(rLower);

  // Feet
  const lFoot = box(0.12, 0.08, 0.22, SHOES);
  lFoot.position.set(0, -0.38, 0.04);
  leftKnee.add(lFoot);
  const rFoot = box(0.12, 0.08, 0.22, SHOES);
  rFoot.position.set(0, -0.38, 0.04);
  rightKnee.add(rFoot);

  leftLeg.add(leftKnee);
  rightLeg.add(rightKnee);

  leftLeg.position.set(-0.10, 0.88, 0);
  rightLeg.position.set( 0.10, 0.88, 0);
  root.add(leftLeg, rightLeg);

  // ── Torso ──
  const torso = box(0.38, 0.44, 0.20, SHIRT);
  torso.position.y = 1.10;
  root.add(torso);

  // ── Arms ──
  const leftArm  = new THREE.Group();  // pivot at shoulder
  const rightArm = new THREE.Group();

  const lUpperArm = box(0.10, 0.30, 0.10, SHIRT);
  lUpperArm.position.y = -0.15;
  leftArm.add(lUpperArm);
  const rUpperArm = box(0.10, 0.30, 0.10, SHIRT);
  rUpperArm.position.y = -0.15;
  rightArm.add(rUpperArm);

  // Elbows
  const leftElbow  = new THREE.Group();
  const rightElbow = new THREE.Group();
  leftElbow.position.y  = -0.30;
  rightElbow.position.y = -0.30;

  const lForearm = box(0.09, 0.28, 0.09, SKIN);
  lForearm.position.y = -0.14;
  leftElbow.add(lForearm);
  const rForearm = box(0.09, 0.28, 0.09, SKIN);
  rForearm.position.y = -0.14;
  rightElbow.add(rForearm);

  // Hands
  const lHand = sphere(0.065, SKIN);
  lHand.position.y = -0.30;
  leftElbow.add(lHand);
  const rHand = sphere(0.065, SKIN);
  rHand.position.y = -0.30;
  rightElbow.add(rHand);

  leftArm.add(leftElbow);
  rightArm.add(rightElbow);

  leftArm.position.set(-0.24, 1.28, 0);
  rightArm.position.set( 0.24, 1.28, 0);
  root.add(leftArm, rightArm);

  // ── Neck + Head ──
  const neck = box(0.10, 0.10, 0.10, SKIN);
  neck.position.y = 1.37;
  root.add(neck);

  const head = sphere(0.155, SKIN);
  head.position.y = 1.58;
  root.add(head);

  // Hair (cap on top of head)
  const hair = box(0.32, 0.10, 0.32, HAIR);
  hair.position.y = 1.68;
  root.add(hair);

  // Eyes
  for (const sx of [-0.055, 0.055]) {
    const eye = sphere(0.025, 0x111111);
    eye.position.set(sx, 1.60, -0.145);
    root.add(eye);
  }

  // Store limb refs for animation
  root.userData.limbs = { leftLeg, rightLeg, leftKnee, rightKnee, leftArm, rightArm, leftElbow, rightElbow };

  return root;
}

// ── Procedural animation state ─────────────────────────────────────────
function animateLimbs(model, speed, isDancing, dt, t) {
  const limbs = model.userData.limbs;
  if (!limbs) return;

  const { leftLeg, rightLeg, leftKnee, rightKnee, leftArm, rightArm, leftElbow, rightElbow } = limbs;

  if (isDancing) {
    // Dance: hips bounce, arms wave
    const d = Math.sin(t * 5.5);
    leftLeg.rotation.x  =  d * 0.35;
    rightLeg.rotation.x = -d * 0.35;
    leftKnee.rotation.x  = Math.max(0, -d * 0.3);
    rightKnee.rotation.x = Math.max(0,  d * 0.3);
    leftArm.rotation.x  = -d * 0.5;
    rightArm.rotation.x =  d * 0.5;
    leftArm.rotation.z  =  Math.sin(t * 3.0) * 0.3 + 0.3;
    rightArm.rotation.z = -Math.sin(t * 3.0) * 0.3 - 0.3;
    leftElbow.rotation.x  = Math.abs(d) * 0.5;
    rightElbow.rotation.x = Math.abs(d) * 0.5;
    return;
  }

  const walkSpeed = Math.min(speed * 1.5, 8.0);
  const swing = speed > 0.07 ? Math.sin(t * walkSpeed) : Math.sin(t * 0.8) * 0.04;
  const swingAmt = speed > 0.5 ? 0.7 : speed > 0.07 ? 0.5 : 0.04;

  // Legs swing opposite each other
  leftLeg.rotation.x  =  swing * swingAmt;
  rightLeg.rotation.x = -swing * swingAmt;

  // Knees bend on back-swing
  leftKnee.rotation.x  = Math.max(0,  swing * swingAmt * 0.55);
  rightKnee.rotation.x = Math.max(0, -swing * swingAmt * 0.55);

  // Arms swing opposite to legs
  leftArm.rotation.x  = -swing * swingAmt * 0.6;
  rightArm.rotation.x =  swing * swingAmt * 0.6;
  leftArm.rotation.z  =  0.15;
  rightArm.rotation.z = -0.15;
  leftElbow.rotation.x  = speed > 0.07 ? Math.abs(swing) * 0.3 : 0;
  rightElbow.rotation.x = speed > 0.07 ? Math.abs(swing) * 0.3 : 0;
}

// ── PUBLIC API ─────────────────────────────────────────────────────────
export function createMixamoAvatar(scene, opts = {}, onReady) {
  const sx = opts.spawnX ?? 0;
  const sy = opts.spawnY ?? 0;
  const sz = opts.spawnZ ?? 5;

  const controller = new THREE.Group();
  controller.name = "avatar";
  controller.position.set(sx, sy, sz);
  controller.add(makeShadow());
  scene.add(controller);

  const model = buildHuman();
  controller.add(model);

  const entry = {
    root: controller,
    mixer: null,   // no GLB mixer — procedural only
    clips: {},
    currentAnim: "idle",
    _isMixamo: true,
    _model: model,
    _t: 0,
    _speed: 0,
    _isDancing: false,
  };

  // Immediately ready — no async load
  setTimeout(() => onReady?.(entry), 0);

  return entry;
}

export function updateMixamoAvatarAnimation(entry, speed, isDancing, dt, isHoverboarding = false) {
  if (!entry?._model) return;

  entry._t = (entry._t || 0) + dt;
  entry._speed = speed;
  entry._isDancing = isDancing;

  if (isHoverboarding) {
    // Frozen surf pose — arms slightly out
    const { leftArm, rightArm, leftLeg, rightLeg, leftKnee, rightKnee } = entry._model.userData.limbs || {};
    if (leftArm) { leftArm.rotation.z = 0.5; leftArm.rotation.x = -0.2; }
    if (rightArm) { rightArm.rotation.z = -0.5; rightArm.rotation.x = -0.2; }
    if (leftLeg) leftLeg.rotation.x = 0.15;
    if (rightLeg) rightLeg.rotation.x = 0.15;
    if (leftKnee) leftKnee.rotation.x = 0.3;
    if (rightKnee) rightKnee.rotation.x = 0.3;
    return;
  }

  animateLimbs(entry._model, speed, isDancing, dt, entry._t);
}