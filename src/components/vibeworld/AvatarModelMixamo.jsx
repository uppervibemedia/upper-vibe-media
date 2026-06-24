/**
 * AvatarModelMixamo — "Casual Human" avatars (Male & Female).
 *
 * Fully procedural — no GLB, no CORS, instant load.
 * TEST ONLY — original soldier remains the permanent default.
 *
 * SPAWN FIX: model.rotation.y = Math.PI so the avatar's chest faces -Z (toward stage).
 * The controller group starts with rotation.y = 0, and the animation loop sets
 * avatar.rotation.y = rot (avatarRotRef). avatarRotRef starts at Math.PI (set in CityCanvas
 * initial state below) so the avatar spawns facing the stage correctly.
 *
 * ANIMATION: Fully procedural walk/run/idle with natural arm swing, leg stride,
 * hip sway, and body bob. Smooth transitions via lerp on per-part targets.
 *
 * HANDS: Proper hand geometry — palm + 4 finger stubs + thumb stub.
 */
import * as THREE from "three";
import { SPAWN } from "./cityData";

// ── Color palettes ─────────────────────────────────────────────────────────────
const MALE_CASUAL = {
  skin:   0xC68642,
  hair:   0x1A0800,
  shirt:  0x1D3557,  // navy hoodie
  pants:  0x2B2D42,  // dark charcoal
  shoes:  0x1A1A1A,  // black
  accent: 0xE63946,  // red logo detail
  glow:   0xFF6B6B,
};

const FEMALE_CASUAL = {
  skin:   0xD4956A,
  hair:   0x3D0C02,  // deep auburn
  shirt:  0x6A0572,  // purple crop top
  pants:  0x1B1B2F,  // dark navy
  shoes:  0xF72585,  // hot pink
  accent: 0xF72585,
  glow:   0xFF9EF5,
};

// ── Shared helpers ─────────────────────────────────────────────────────────────
function mat(hex, opts = {}) {
  return new THREE.MeshStandardMaterial({
    color: hex,
    roughness: opts.roughness ?? 0.65,
    metalness: opts.metalness ?? 0.04,
  });
}

function makeShadow() {
  const m = new THREE.Mesh(
    new THREE.CircleGeometry(0.27, 12),
    new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.22, depthWrite: false })
  );
  m.rotation.x = -Math.PI / 2;
  m.position.y = 0.01;
  return m;
}

/**
 * Build a hand group: palm box + 4 finger stubs + thumb stub.
 * mirrorX: -1 for right hand (mirror of left).
 */
function buildHand(skinHex, mirrorX = 1) {
  const g = new THREE.Group();
  const skinMat = mat(skinHex, { roughness: 0.70 });

  // Palm
  const palm = new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.055, 0.072), skinMat);
  g.add(palm);

  // 4 fingers — spaced along X, extend in +Z (forward)
  const fingerOffsets = [-0.028, -0.009, 0.009, 0.028];
  for (const fx of fingerOffsets) {
    const finger = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.010, 0.042, 2, 6),
      skinMat
    );
    finger.rotation.x = Math.PI / 2; // point along Z
    finger.position.set(fx * mirrorX, 0, 0.055);
    g.add(finger);
  }

  // Thumb — angled outward
  const thumb = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.012, 0.034, 2, 6),
    skinMat
  );
  thumb.rotation.z = mirrorX * -0.6;
  thumb.rotation.x = 0.3;
  thumb.position.set(mirrorX * 0.048, 0.010, 0.018);
  g.add(thumb);

  return g;
}

// ── Male casual body ───────────────────────────────────────────────────────────
function buildMaleCasual(C) {
  const root = new THREE.Group();
  root.name = "avatarModel";
  root.add(makeShadow());

  // ── PELVIS (hip pivot for body sway) ──
  const pelvis = new THREE.Group(); pelvis.name = "pelvis";
  pelvis.position.set(0, 0.62, 0);
  root.add(pelvis);

  // ── LEGS ──
  const legGeo = new THREE.CapsuleGeometry(0.088, 0.44, 4, 8);

  const thighL = new THREE.Group(); thighL.name = "thighL"; thighL.position.set(0.108, 0, 0); pelvis.add(thighL);
  const legLMesh = new THREE.Mesh(legGeo, mat(C.pants)); legLMesh.position.y = -0.22; legLMesh.castShadow = true; thighL.add(legLMesh);

  const thighR = new THREE.Group(); thighR.name = "thighR"; thighR.position.set(-0.108, 0, 0); pelvis.add(thighR);
  const legRMesh = new THREE.Mesh(legGeo, mat(C.pants)); legRMesh.position.y = -0.22; legRMesh.castShadow = true; thighR.add(legRMesh);

  // Calves (pivot at knee)
  const shinGeo = new THREE.CapsuleGeometry(0.072, 0.38, 4, 8);
  const calfL = new THREE.Group(); calfL.name = "calfL"; calfL.position.y = -0.46; thighL.add(calfL);
  const shinLMesh = new THREE.Mesh(shinGeo, mat(C.pants)); shinLMesh.position.y = -0.18; calfL.add(shinLMesh);

  const calfR = new THREE.Group(); calfR.name = "calfR"; calfR.position.y = -0.46; thighR.add(calfR);
  const shinRMesh = new THREE.Mesh(shinGeo, mat(C.pants)); shinRMesh.position.y = -0.18; calfR.add(shinRMesh);

  // Shoes
  const shoeGeo = new THREE.BoxGeometry(0.12, 0.10, 0.20);
  const bootL = new THREE.Mesh(shoeGeo, mat(C.shoes)); bootL.name = "bootL"; bootL.position.set(0, -0.41, 0.018); bootL.castShadow = true; calfL.add(bootL);
  const bootR = bootL.clone(); bootR.name = "bootR"; calfR.add(bootR);

  // Sole glow
  const soleMat = new THREE.MeshBasicMaterial({ color: C.accent, transparent: true, opacity: 0.55, depthWrite: false });
  for (const [parent, bx] of [[calfL, 0], [calfR, 0]]) {
    const sole = new THREE.Mesh(new THREE.BoxGeometry(0.122, 0.014, 0.14), soleMat);
    sole.position.set(bx, -0.457, 0.012); parent.add(sole);
  }

  // ── TORSO ──
  const torsoGroup = new THREE.Group(); torsoGroup.name = "torso"; torsoGroup.position.set(0, 0, 0); pelvis.add(torsoGroup);
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.40, 0.46, 0.24), mat(C.shirt, { roughness: 0.75 }));
  torso.position.y = 0.48; torso.castShadow = true; torsoGroup.add(torso);

  const pocketMat = new THREE.MeshBasicMaterial({ color: C.accent, transparent: true, opacity: 0.45, depthWrite: false });
  const pocket = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.09, 0.012), pocketMat);
  pocket.position.set(0, 0.34, 0.122); torsoGroup.add(pocket);

  // ── UPPER ARMS (pivot at shoulder) ──
  const upperArmGeo = new THREE.CapsuleGeometry(0.068, 0.22, 4, 8);
  const shoulderL = new THREE.Group(); shoulderL.name = "shoulderL"; shoulderL.position.set(0.235, 0.44, 0); torsoGroup.add(shoulderL);
  const uArmLMesh = new THREE.Mesh(upperArmGeo, mat(C.shirt, { roughness: 0.75 })); uArmLMesh.position.y = -0.11; uArmLMesh.castShadow = true; shoulderL.add(uArmLMesh);

  const shoulderR = new THREE.Group(); shoulderR.name = "shoulderR"; shoulderR.position.set(-0.235, 0.44, 0); torsoGroup.add(shoulderR);
  const uArmRMesh = uArmLMesh.clone(); uArmRMesh.position.y = -0.11; shoulderR.add(uArmRMesh);

  // Lower arms (pivot at elbow)
  const lowerArmGeo = new THREE.CapsuleGeometry(0.058, 0.20, 4, 8);
  const elbowL = new THREE.Group(); elbowL.name = "elbowL"; elbowL.position.y = -0.25; shoulderL.add(elbowL);
  const lArmLMesh = new THREE.Mesh(lowerArmGeo, mat(C.skin, { roughness: 0.70 })); lArmLMesh.position.y = -0.10; lArmLMesh.castShadow = true; elbowL.add(lArmLMesh);

  const elbowR = new THREE.Group(); elbowR.name = "elbowR"; elbowR.position.y = -0.25; shoulderR.add(elbowR);
  const lArmRMesh = lArmLMesh.clone(); lArmRMesh.position.y = -0.10; elbowR.add(lArmRMesh);

  // Hands
  const handL = buildHand(C.skin, 1); handL.name = "handL"; handL.position.y = -0.23; elbowL.add(handL);
  const handR = buildHand(C.skin, -1); handR.name = "handR"; handR.position.y = -0.23; elbowR.add(handR);

  // ── NECK + HEAD ──
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.072, 0.082, 0.13, 8), mat(C.skin)); neck.position.set(0, 0.77, 0); neck.castShadow = true; torsoGroup.add(neck);

  const headGroup = new THREE.Group(); headGroup.name = "head"; headGroup.position.set(0, 0.90, 0); torsoGroup.add(headGroup);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.158, 12, 10), mat(C.skin)); head.castShadow = true; headGroup.add(head);

  const hair = new THREE.Mesh(new THREE.SphereGeometry(0.163, 10, 8, 0, Math.PI * 2, 0, Math.PI * 0.52), mat(C.hair, { roughness: 0.88 }));
  hair.position.y = 0.02; headGroup.add(hair);

  const eyeGeo = new THREE.SphereGeometry(0.022, 6, 4);
  const eyeMat = new THREE.MeshBasicMaterial({ color: 0x111111 });
  const eyeL2 = new THREE.Mesh(eyeGeo, eyeMat); eyeL2.position.set(0.055, 0.032, 0.148); headGroup.add(eyeL2);
  const eyeR2 = eyeL2.clone(); eyeR2.position.set(-0.055, 0.032, 0.148); headGroup.add(eyeR2);

  root.userData._animParts = { pelvis, torsoGroup, thighL, thighR, calfL, calfR, shoulderL, shoulderR, elbowL, elbowR, headGroup, handL, handR };
  root.userData._animTime = 0;
  root.userData._smooth = {};
  return root;
}

// ── Female casual body ─────────────────────────────────────────────────────────
function buildFemaleCasual(C) {
  const root = new THREE.Group();
  root.name = "avatarModel";
  root.add(makeShadow());

  // ── PELVIS ──
  const pelvis = new THREE.Group(); pelvis.name = "pelvis";
  pelvis.position.set(0, 0.60, 0);
  root.add(pelvis);

  // ── LEGS ──
  const legGeo = new THREE.CapsuleGeometry(0.072, 0.46, 4, 8);

  const thighL = new THREE.Group(); thighL.name = "thighL"; thighL.position.set(0.090, 0, 0); pelvis.add(thighL);
  const legLMesh = new THREE.Mesh(legGeo, mat(C.pants)); legLMesh.position.y = -0.23; legLMesh.castShadow = true; thighL.add(legLMesh);

  const thighR = new THREE.Group(); thighR.name = "thighR"; thighR.position.set(-0.090, 0, 0); pelvis.add(thighR);
  const legRMesh = new THREE.Mesh(legGeo, mat(C.pants)); legRMesh.position.y = -0.23; legRMesh.castShadow = true; thighR.add(legRMesh);

  // Calves
  const shinGeo = new THREE.CapsuleGeometry(0.058, 0.38, 4, 8);
  const calfL = new THREE.Group(); calfL.name = "calfL"; calfL.position.y = -0.48; thighL.add(calfL);
  const shinLMesh = new THREE.Mesh(shinGeo, mat(C.pants)); shinLMesh.position.y = -0.18; calfL.add(shinLMesh);

  const calfR = new THREE.Group(); calfR.name = "calfR"; calfR.position.y = -0.48; thighR.add(calfR);
  const shinRMesh = new THREE.Mesh(shinGeo, mat(C.pants)); shinRMesh.position.y = -0.18; calfR.add(shinRMesh);

  // Sneakers
  const shoeGeo = new THREE.BoxGeometry(0.10, 0.10, 0.185);
  const bootL = new THREE.Mesh(shoeGeo, mat(C.shoes)); bootL.name = "bootL"; bootL.position.set(0, -0.43, 0.015); bootL.castShadow = true; calfL.add(bootL);
  const bootR = bootL.clone(); bootR.name = "bootR"; calfR.add(bootR);

  const soleMat = new THREE.MeshBasicMaterial({ color: C.glow, transparent: true, opacity: 0.60, depthWrite: false });
  for (const parent of [calfL, calfR]) {
    const sole = new THREE.Mesh(new THREE.BoxGeometry(0.102, 0.012, 0.13), soleMat);
    sole.position.set(0, -0.475, 0.010); parent.add(sole);
  }

  // ── TORSO ──
  const torsoGroup = new THREE.Group(); torsoGroup.name = "torso"; torsoGroup.position.set(0, 0, 0); pelvis.add(torsoGroup);
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.40, 0.20), mat(C.shirt, { roughness: 0.65 }));
  torso.position.y = 0.46; torso.castShadow = true; torsoGroup.add(torso);

  const accentMat = new THREE.MeshBasicMaterial({ color: C.accent, transparent: true, opacity: 0.70, depthWrite: false });
  const belt = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.025, 0.21), accentMat);
  belt.position.set(0, 0.27, 0); torsoGroup.add(belt);

  const vL = new THREE.Mesh(new THREE.BoxGeometry(0.010, 0.20, 0.011), accentMat);
  vL.position.set(0.038, 0.50, 0.102); vL.rotation.z = 0.28; torsoGroup.add(vL);
  const vR = vL.clone(); vR.position.set(-0.038, 0.50, 0.102); vR.rotation.z = -0.28; torsoGroup.add(vR);

  // ── UPPER ARMS ──
  const upperArmGeo = new THREE.CapsuleGeometry(0.056, 0.20, 4, 8);
  const shoulderL = new THREE.Group(); shoulderL.name = "shoulderL"; shoulderL.position.set(0.200, 0.42, 0); torsoGroup.add(shoulderL);
  const uArmLMesh = new THREE.Mesh(upperArmGeo, mat(C.shirt, { roughness: 0.65 })); uArmLMesh.position.y = -0.10; uArmLMesh.castShadow = true; shoulderL.add(uArmLMesh);

  const shoulderR = new THREE.Group(); shoulderR.name = "shoulderR"; shoulderR.position.set(-0.200, 0.42, 0); torsoGroup.add(shoulderR);
  const uArmRMesh = uArmLMesh.clone(); shoulderR.add(uArmRMesh);

  // Lower arms
  const lowerArmGeo = new THREE.CapsuleGeometry(0.046, 0.18, 4, 8);
  const elbowL = new THREE.Group(); elbowL.name = "elbowL"; elbowL.position.y = -0.22; shoulderL.add(elbowL);
  const lArmLMesh = new THREE.Mesh(lowerArmGeo, mat(C.skin, { roughness: 0.70 })); lArmLMesh.position.y = -0.09; lArmLMesh.castShadow = true; elbowL.add(lArmLMesh);

  const elbowR = new THREE.Group(); elbowR.name = "elbowR"; elbowR.position.y = -0.22; shoulderR.add(elbowR);
  const lArmRMesh = lArmLMesh.clone(); elbowR.add(lArmRMesh);

  // Hands
  const handL = buildHand(C.skin, 1); handL.name = "handL"; handL.position.y = -0.20; elbowL.add(handL);
  const handR = buildHand(C.skin, -1); handR.name = "handR"; handR.position.y = -0.20; elbowR.add(handR);

  // ── NECK + HEAD ──
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.062, 0.070, 0.11, 8), mat(C.skin)); neck.position.set(0, 0.72, 0); neck.castShadow = true; torsoGroup.add(neck);

  const headGroup = new THREE.Group(); headGroup.name = "head"; headGroup.position.set(0, 0.85, 0); torsoGroup.add(headGroup);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.148, 12, 10), mat(C.skin)); head.castShadow = true; headGroup.add(head);

  const hairTop = new THREE.Mesh(new THREE.SphereGeometry(0.155, 10, 8, 0, Math.PI * 2, 0, Math.PI * 0.62), mat(C.hair, { roughness: 0.80 }));
  hairTop.position.y = 0.02; headGroup.add(hairTop);

  const hairBack = new THREE.Mesh(new THREE.CapsuleGeometry(0.055, 0.30, 4, 6), mat(C.hair, { roughness: 0.80 }));
  hairBack.position.set(0, -0.12, -0.10); headGroup.add(hairBack);

  const ponyBand = new THREE.Mesh(new THREE.TorusGeometry(0.04, 0.012, 6, 12),
    new THREE.MeshBasicMaterial({ color: C.accent, transparent: true, opacity: 0.85, depthWrite: false }));
  ponyBand.position.set(0, -0.18, -0.10); ponyBand.rotation.x = Math.PI / 2; headGroup.add(ponyBand);

  const eyeGeo = new THREE.SphereGeometry(0.020, 6, 4);
  const eyeMat = new THREE.MeshBasicMaterial({ color: 0x111111 });
  const eyeL2 = new THREE.Mesh(eyeGeo, eyeMat); eyeL2.position.set(0.048, 0.028, 0.138); headGroup.add(eyeL2);
  const eyeR2 = eyeL2.clone(); eyeR2.position.set(-0.048, 0.028, 0.138); headGroup.add(eyeR2);

  root.userData._animParts = { pelvis, torsoGroup, thighL, thighR, calfL, calfR, shoulderL, shoulderR, elbowL, elbowR, headGroup, handL, handR };
  root.userData._animTime = 0;
  root.userData._smooth = {};
  return root;
}

// ── Smooth angle lerp helper (module-level, used by animation and hoverboard pose) ──
function lerpAngle(current, target, alpha) {
  let diff = target - current;
  while (diff > Math.PI)  diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  return current + diff * alpha;
}

// ── Natural procedural animation ───────────────────────────────────────────────
function animateCasual(entry, speed, isDancing, dt) {
  if (!entry?.root) return;
  const model = entry.root.getObjectByName("avatarModel");
  if (!model) return;
  const p = model.userData._animParts;
  if (!p) return;

  model.userData._animTime = (model.userData._animTime || 0) + dt;
  const t = model.userData._animTime;
  const sin = Math.sin;
  const cos = Math.cos;

  // ── Determine state ─────────────────────────────────────────────
  const isRun  = speed > 1.4;
  const isWalk = speed > 0.12 && !isRun;
  const isIdle = !isWalk && !isRun && !isDancing;

  // Stride frequency & amplitude scale with speed naturally
  const walkFreq  = isRun ? 3.8 : isWalk ? 2.2 : 1.0;
  const strideAmp = isRun ? 0.65 : isWalk ? 0.42 : 0.0;
  const armAmp    = isRun ? 0.70 : isWalk ? 0.45 : 0.0;

  // Natural walk: opposite arm/leg phasing (left arm swings with right leg)
  const legPhase = t * walkFreq;

  // Smooth blend alpha — fast enough for responsive feel, not jarring
  const alpha = Math.min(1, dt * 7.0);

  // ── THIGHS (hip pivot, full leg swing) ──────────────────────────
  const thighLTarget = sin(legPhase)  * strideAmp;
  const thighRTarget = -sin(legPhase) * strideAmp;
  if (p.thighL) p.thighL.rotation.x = lerpAngle(p.thighL.rotation.x, thighLTarget, alpha);
  if (p.thighR) p.thighR.rotation.x = lerpAngle(p.thighR.rotation.x, thighRTarget, alpha);

  // ── CALVES (knee bend — always slightly bent, more on run) ──────
  // Knee bends on back-swing (negative thigh rotation = leg going back)
  const kneeBendL = isIdle ? 0.04 : Math.max(0, -sin(legPhase)) * (isRun ? 0.65 : 0.45) + 0.04;
  const kneeBendR = isIdle ? 0.04 : Math.max(0, sin(legPhase))  * (isRun ? 0.65 : 0.45) + 0.04;
  if (p.calfL) p.calfL.rotation.x = lerpAngle(p.calfL.rotation.x, -kneeBendL, alpha);
  if (p.calfR) p.calfR.rotation.x = lerpAngle(p.calfR.rotation.x, -kneeBendR, alpha);

  // ── SHOULDERS (arm swing — opposite to same-side leg) ──────────
  const armLTarget = isDancing
    ? sin(t * 6.0) * 0.55
    : -sin(legPhase) * armAmp * 0.85;
  const armRTarget = isDancing
    ? -sin(t * 6.0) * 0.55
    : sin(legPhase) * armAmp * 0.85;

  if (p.shoulderL) {
    p.shoulderL.rotation.x = lerpAngle(p.shoulderL.rotation.x, armLTarget, alpha);
    // Natural arm splay at sides, slight forward lean at rest
    p.shoulderL.rotation.z = lerpAngle(p.shoulderL.rotation.z, isDancing ? 0.45 : 0.08, alpha);
  }
  if (p.shoulderR) {
    p.shoulderR.rotation.x = lerpAngle(p.shoulderR.rotation.x, armRTarget, alpha);
    p.shoulderR.rotation.z = lerpAngle(p.shoulderR.rotation.z, isDancing ? -0.45 : -0.08, alpha);
  }

  // ── ELBOWS (slight bend during swing, more during run) ──────────
  const elbowBend = isRun ? 0.65 : isWalk ? 0.20 : 0.10;
  if (p.elbowL) p.elbowL.rotation.x = lerpAngle(p.elbowL.rotation.x, elbowBend, alpha);
  if (p.elbowR) p.elbowR.rotation.x = lerpAngle(p.elbowR.rotation.x, elbowBend, alpha);

  // ── TORSO (counter-rotate to legs for natural twist) ────────────
  const torsoTwist = isDancing
    ? sin(t * 3.0) * 0.20
    : sin(legPhase) * (isRun ? 0.10 : isWalk ? 0.055 : 0.0);
  const torsoBaseY = entry._gender === "female" ? 0.0 : 0.0;
  if (p.torsoGroup) {
    p.torsoGroup.rotation.y = lerpAngle(p.torsoGroup.rotation.y, torsoTwist, alpha);
  }

  // ── PELVIS (hip sway side-to-side, more natural for female) ─────
  const hipSway = (entry._gender === "female" ? 0.045 : 0.025);
  const pelvisSway = isDancing
    ? sin(t * 3.0) * 0.12
    : isWalk || isRun
      ? sin(legPhase) * hipSway
      : 0;
  const pelvisRoll = isDancing ? 0 : (isWalk || isRun) ? cos(legPhase) * 0.025 : 0;
  if (p.pelvis) {
    p.pelvis.rotation.z = lerpAngle(p.pelvis.rotation.z, pelvisRoll, alpha);
    p.pelvis.rotation.y = lerpAngle(p.pelvis.rotation.y, pelvisSway, alpha);
  }

  // ── HEAD (slight nod with stride, look around in idle) ──────────
  if (p.headGroup) {
    const headNod   = isIdle ? sin(t * 0.9) * 0.025 : sin(legPhase) * 0.028;
    const headSway  = isIdle ? sin(t * 0.6) * 0.020 : 0;
    p.headGroup.rotation.x = lerpAngle(p.headGroup.rotation.x, headNod, alpha * 0.6);
    p.headGroup.rotation.y = lerpAngle(p.headGroup.rotation.y, headSway, alpha * 0.5);
  }
}

// ── PUBLIC API ─────────────────────────────────────────────────────────────────
export function createMixamoAvatar(scene, opts = {}, onReady) {
  const gender = opts.gender || "male";
  const C = gender === "female" ? FEMALE_CASUAL : MALE_CASUAL;

  const controller = new THREE.Group();
  controller.name = "avatar";
  controller.position.set(opts.spawnX ?? SPAWN[0], opts.spawnY ?? SPAWN[1], opts.spawnZ ?? SPAWN[2]);
  // Controller spawns with rotation.y = Math.PI so the model (which has its own
  // rotation.y = 0 in local space, facing +Z) ends up facing -Z = toward stage.
  // CityCanvas will set avatar.rotation.y = rot each frame; avatarRotRef starts at Math.PI.
  controller.rotation.y = Math.PI;
  scene.add(controller);

  const model = gender === "female" ? buildFemaleCasual(C) : buildMaleCasual(C);
  // model.rotation.y = 0: model's natural forward direction is +Z.
  // Since controller.rotation.y = Math.PI, the combined world-space forward = -Z (toward stage).
  controller.add(model);

  const entry = {
    root: controller,
    mixer: null,
    clips: {},
    currentAnim: "idle",
    _isMixamo: true,
    _gender: gender,
  };

  setTimeout(() => onReady?.(entry), 0);
  return entry;
}

export function updateMixamoAvatarAnimation(entry, speed, isDancing, dt, isHoverboarding = false) {
  if (!entry) return;

  if (isHoverboarding) {
    const model = entry.root?.getObjectByName("avatarModel");
    const p = model?.userData?._animParts;
    if (p) {
      const alpha = Math.min(1, dt * 5);
      // Balanced riding pose
      if (p.shoulderL) { p.shoulderL.rotation.x = lerpAngle(p.shoulderL.rotation.x, -0.20, alpha); p.shoulderL.rotation.z = lerpAngle(p.shoulderL.rotation.z, 0.55, alpha); }
      if (p.shoulderR) { p.shoulderR.rotation.x = lerpAngle(p.shoulderR.rotation.x, -0.20, alpha); p.shoulderR.rotation.z = lerpAngle(p.shoulderR.rotation.z, -0.55, alpha); }
      if (p.elbowL)    p.elbowL.rotation.x = lerpAngle(p.elbowL.rotation.x, 0.70, alpha);
      if (p.elbowR)    p.elbowR.rotation.x = lerpAngle(p.elbowR.rotation.x, 0.70, alpha);
      if (p.thighL)    p.thighL.rotation.x = lerpAngle(p.thighL.rotation.x, 0.16, alpha);
      if (p.thighR)    p.thighR.rotation.x = lerpAngle(p.thighR.rotation.x, 0.16, alpha);
      if (p.calfL)     p.calfL.rotation.x  = lerpAngle(p.calfL.rotation.x, -0.10, alpha);
      if (p.calfR)     p.calfR.rotation.x  = lerpAngle(p.calfR.rotation.x, -0.10, alpha);
    }
    return;
  }

  animateCasual(entry, speed, isDancing, dt);
}