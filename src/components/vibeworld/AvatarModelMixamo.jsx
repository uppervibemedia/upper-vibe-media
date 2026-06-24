/**
 * AvatarModelMixamo — "Casual Human" avatars (Male & Female).
 *
 * Fully procedural — no GLB, no CORS, instant load.
 * Uses the same high-quality geometry system as AvatarModelTest but
 * with casual street clothes instead of the neon suit.
 *
 * TEST ONLY — original soldier remains the permanent default.
 */
import * as THREE from "three";
import { SPAWN } from "./cityData";

// ── Color palettes ─────────────────────────────────────────────────────────────
const MALE_CASUAL = {
  skin:    0xC68642,
  hair:    0x1A0800,
  shirt:   0x1D3557,   // navy hoodie
  pants:   0x2B2D42,   // dark charcoal
  shoes:   0x1A1A1A,   // black
  accent:  0xE63946,   // red logo detail
  glow:    0xFF6B6B,
};

const FEMALE_CASUAL = {
  skin:    0xD4956A,
  hair:    0x3D0C02,   // deep auburn
  shirt:   0x6A0572,   // purple crop top
  pants:   0x1B1B2F,   // dark navy
  shoes:   0xF72585,   // hot pink
  accent:  0xF72585,
  glow:    0xFF9EF5,
};

// ── Shared helpers ─────────────────────────────────────────────────────────────
function mat(hex, opts = {}) {
  return new THREE.MeshStandardMaterial({
    color: hex,
    roughness: opts.roughness ?? 0.65,
    metalness: opts.metalness ?? 0.04,
    ...(opts.emissive ? { emissive: new THREE.Color(opts.emissive), emissiveIntensity: opts.emissiveIntensity ?? 0.35 } : {}),
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

// ── Male casual body ───────────────────────────────────────────────────────────
function buildMaleCasual(C) {
  const root = new THREE.Group();
  root.name = "avatarModel";
  root.add(makeShadow());

  // Legs
  const legGeo = new THREE.CapsuleGeometry(0.088, 0.44, 4, 8);
  const legL = new THREE.Mesh(legGeo, mat(C.pants));
  legL.name = "legL"; legL.position.set(0.108, 0.36, 0); legL.castShadow = true;
  const legR = legL.clone(); legR.name = "legR"; legR.position.set(-0.108, 0.36, 0);
  root.add(legL, legR);

  // Shoes
  const shoeGeo = new THREE.BoxGeometry(0.12, 0.10, 0.20);
  const bootL = new THREE.Mesh(shoeGeo, mat(C.shoes));
  bootL.name = "bootL"; bootL.position.set(0.108, 0.080, 0.018); bootL.castShadow = true;
  const bootR = bootL.clone(); bootR.name = "bootR"; bootR.position.set(-0.108, 0.080, 0.018);
  root.add(bootL, bootR);

  // Shoe sole glow accent (subtle)
  const soleMat = new THREE.MeshBasicMaterial({ color: C.accent, transparent: true, opacity: 0.55, depthWrite: false });
  for (const bx of [0.108, -0.108]) {
    const sole = new THREE.Mesh(new THREE.BoxGeometry(0.122, 0.014, 0.14), soleMat);
    sole.position.set(bx, 0.033, 0.012);
    root.add(sole);
  }

  // Torso
  const torsoGroup = new THREE.Group();
  torsoGroup.name = "torso";
  torsoGroup.position.set(0, 0.84, 0);
  root.add(torsoGroup);

  // Hoodie body
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.40, 0.46, 0.24), mat(C.shirt, { roughness: 0.75 }));
  torso.castShadow = true;
  torsoGroup.add(torso);

  // Hoodie pocket detail
  const pocketMat = new THREE.MeshBasicMaterial({ color: C.accent, transparent: true, opacity: 0.45, depthWrite: false });
  const pocket = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.09, 0.012), pocketMat);
  pocket.position.set(0, -0.14, 0.122);
  torsoGroup.add(pocket);

  // Arms
  const armGeo = new THREE.CapsuleGeometry(0.068, 0.40, 4, 8);
  const armL = new THREE.Group(); armL.name = "armL"; armL.position.set(0.235, 0.11, 0);
  const armLMesh = new THREE.Mesh(armGeo, mat(C.shirt, { roughness: 0.75 }));
  armLMesh.rotation.z = 0.12; armLMesh.castShadow = true; armL.add(armLMesh);
  const armR = new THREE.Group(); armR.name = "armR"; armR.position.set(-0.235, 0.11, 0);
  const armRMesh = new THREE.Mesh(armGeo, mat(C.shirt, { roughness: 0.75 }));
  armRMesh.rotation.z = -0.12; armRMesh.castShadow = true; armR.add(armRMesh);
  torsoGroup.add(armL, armR);

  // Hands (skin)
  const handGeo = new THREE.SphereGeometry(0.068, 8, 6);
  const handL = new THREE.Mesh(handGeo, mat(C.skin)); handL.name = "gloveL";
  handL.position.set(0.28, -0.26, 0); armL.add(handL);
  const handR = handL.clone(); handR.name = "gloveR"; armR.add(handR);

  // Neck
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.072, 0.082, 0.13, 8), mat(C.skin));
  neck.position.set(0, 0.30, 0); neck.castShadow = true; torsoGroup.add(neck);

  // Head
  const headGroup = new THREE.Group(); headGroup.name = "head"; headGroup.position.set(0, 0.44, 0);
  torsoGroup.add(headGroup);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.158, 12, 10), mat(C.skin));
  head.castShadow = true; headGroup.add(head);

  // Hair — short top
  const hair = new THREE.Mesh(
    new THREE.SphereGeometry(0.163, 10, 8, 0, Math.PI * 2, 0, Math.PI * 0.52),
    mat(C.hair, { roughness: 0.88 })
  );
  hair.position.y = 0.02; headGroup.add(hair);

  // Eyes
  const eyeGeo = new THREE.SphereGeometry(0.022, 6, 4);
  const eyeMat = new THREE.MeshBasicMaterial({ color: 0x111111 });
  const eyeL = new THREE.Mesh(eyeGeo, eyeMat); eyeL.position.set(0.055, 0.032, 0.148); headGroup.add(eyeL);
  const eyeR = eyeL.clone(); eyeR.position.set(-0.055, 0.032, 0.148); headGroup.add(eyeR);

  root.userData._animParts = { legL, legR, armL, armR, headGroup, torsoGroup, bootL, bootR, gloveL: handL, gloveR: handR };
  root.userData._animTime = 0;
  return root;
}

// ── Female casual body ─────────────────────────────────────────────────────────
function buildFemaleCasual(C) {
  const root = new THREE.Group();
  root.name = "avatarModel";
  root.add(makeShadow());

  // Hip/pelvis block — static mesh that bridges the gap between torso bottom and leg tops.
  // Positioned to overlap both so the seam is always hidden regardless of leg rotation.
  const hipBlock = new THREE.Mesh(
    new THREE.BoxGeometry(0.30, 0.18, 0.20),
    mat(C.pants, { roughness: 0.75 })
  );
  hipBlock.position.set(0, 0.66, 0);
  hipBlock.castShadow = true;
  root.add(hipBlock);

  // Legs — pivot groups sit at the hip joint (y=0.66), capsule mesh hangs downward.
  // This means rotation happens at the top of the leg, so the thigh never pokes through the hip block.
  const legGeo = new THREE.CapsuleGeometry(0.072, 0.46, 4, 8);
  const legMat = mat(C.pants);

  const legL = new THREE.Group(); legL.name = "legL"; legL.position.set(0.090, 0.66, 0);
  const legLMesh = new THREE.Mesh(legGeo, legMat); legLMesh.position.y = -0.30; legLMesh.castShadow = true; legL.add(legLMesh);

  const legR = new THREE.Group(); legR.name = "legR"; legR.position.set(-0.090, 0.66, 0);
  const legRMesh = new THREE.Mesh(legGeo, legMat); legRMesh.position.y = -0.30; legRMesh.castShadow = true; legR.add(legRMesh);

  root.add(legL, legR);

  // Sneakers — parented to leg pivot groups so they follow the leg swing
  const shoeGeo = new THREE.BoxGeometry(0.10, 0.10, 0.185);
  const bootL = new THREE.Mesh(shoeGeo, mat(C.shoes));
  bootL.name = "bootL"; bootL.position.set(0, -0.62, 0.015); bootL.castShadow = true; legL.add(bootL);
  const bootR = new THREE.Mesh(shoeGeo, mat(C.shoes));
  bootR.name = "bootR"; bootR.position.set(0, -0.62, 0.015); bootR.castShadow = true; legR.add(bootR);

  // Shoe glow — also parented to leg pivots
  const soleMat = new THREE.MeshBasicMaterial({ color: C.glow, transparent: true, opacity: 0.60, depthWrite: false });
  const soleL = new THREE.Mesh(new THREE.BoxGeometry(0.102, 0.012, 0.13), soleMat);
  soleL.position.set(0, -0.665, 0.010); legL.add(soleL);
  const soleR = new THREE.Mesh(new THREE.BoxGeometry(0.102, 0.012, 0.13), soleMat);
  soleR.position.set(0, -0.665, 0.010); legR.add(soleR);

  // Torso — lowered slightly so bottom edge overlaps hip block top
  const torsoGroup = new THREE.Group();
  torsoGroup.name = "torso";
  torsoGroup.position.set(0, 0.82, 0);
  root.add(torsoGroup);

  // Crop top — taller to reach down into hip block
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.46, 0.20), mat(C.shirt, { roughness: 0.65 }));
  torso.castShadow = true; torsoGroup.add(torso);

  const accentMat = new THREE.MeshBasicMaterial({ color: C.accent, transparent: true, opacity: 0.70, depthWrite: false });

  // Waist band
  const belt = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.025, 0.21), accentMat);
  belt.position.set(0, -0.13, 0); torsoGroup.add(belt);

  // V-neck detail
  const vL = new THREE.Mesh(new THREE.BoxGeometry(0.010, 0.20, 0.011), accentMat);
  vL.position.set(0.038, 0.08, 0.102); vL.rotation.z = 0.28; torsoGroup.add(vL);
  const vR = vL.clone(); vR.position.set(-0.038, 0.08, 0.102); vR.rotation.z = -0.28; torsoGroup.add(vR);

  // Arms
  const armGeo = new THREE.CapsuleGeometry(0.056, 0.37, 4, 8);
  const armL = new THREE.Group(); armL.name = "armL"; armL.position.set(0.215, -0.02, 0);
  const armLMesh = new THREE.Mesh(armGeo, mat(C.shirt, { roughness: 0.65 }));
  armLMesh.rotation.z = 0.08; armLMesh.castShadow = true; armL.add(armLMesh);
  const armR = new THREE.Group(); armR.name = "armR"; armR.position.set(-0.215, -0.02, 0);
  const armRMesh = new THREE.Mesh(armGeo, mat(C.shirt, { roughness: 0.65 }));
  armRMesh.rotation.z = -0.08; armRMesh.castShadow = true; armR.add(armRMesh);
  torsoGroup.add(armL, armR);

  // Hands — positioned straight below arm pivot so they follow the arm swing
  // without drifting inward and clipping through the torso
  const handGeo = new THREE.SphereGeometry(0.058, 8, 6);
  const handL = new THREE.Mesh(handGeo, mat(C.skin)); handL.name = "gloveL";
  handL.position.set(0, -0.24, 0); armL.add(handL);
  const handR = new THREE.Mesh(handGeo, mat(C.skin)); handR.name = "gloveR";
  handR.position.set(0, -0.24, 0); armR.add(handR);

  // Neck
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.062, 0.070, 0.11, 8), mat(C.skin));
  neck.position.set(0, 0.28, 0); neck.castShadow = true; torsoGroup.add(neck);

  // Head
  const headGroup = new THREE.Group(); headGroup.name = "head"; headGroup.position.set(0, 0.42, 0);
  torsoGroup.add(headGroup);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.148, 12, 10), mat(C.skin));
  head.castShadow = true; headGroup.add(head);

  // Hair — long with ponytail
  const hairTop = new THREE.Mesh(
    new THREE.SphereGeometry(0.155, 10, 8, 0, Math.PI * 2, 0, Math.PI * 0.62),
    mat(C.hair, { roughness: 0.80 })
  );
  hairTop.position.y = 0.02; headGroup.add(hairTop);

  const hairBack = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.055, 0.30, 4, 6),
    mat(C.hair, { roughness: 0.80 })
  );
  hairBack.position.set(0, -0.12, -0.10); headGroup.add(hairBack);

  // Ponytail holder
  const ponyBand = new THREE.Mesh(
    new THREE.TorusGeometry(0.04, 0.012, 6, 12),
    new THREE.MeshBasicMaterial({ color: C.accent, transparent: true, opacity: 0.85, depthWrite: false })
  );
  ponyBand.position.set(0, -0.18, -0.10); ponyBand.rotation.x = Math.PI / 2; headGroup.add(ponyBand);

  // Eyes
  const eyeGeo = new THREE.SphereGeometry(0.020, 6, 4);
  const eyeMat = new THREE.MeshBasicMaterial({ color: 0x111111 });
  const eyeL = new THREE.Mesh(eyeGeo, eyeMat); eyeL.position.set(0.048, 0.028, 0.138); headGroup.add(eyeL);
  const eyeR = eyeL.clone(); eyeR.position.set(-0.048, 0.028, 0.138); headGroup.add(eyeR);

  root.userData._animParts = { legL, legR, armL, armR, headGroup, torsoGroup };
  root.userData._animTime = 0;
  return root;
}

// ── Procedural animation — natural walk/run cycle ─────────────────────────────
// Uses a single phase accumulator driven by actual movement speed so feet
// never slide relative to the ground. Smooth lerp blending between states
// replaces hard frequency/amplitude switches.
function animateCasual(entry, speed, isDancing, dt) {
  if (!entry?.root) return;
  const model = entry.root.getObjectByName("avatarModel");
  if (!model) return;
  const p = model.userData._animParts;
  if (!p) return;

  const ud = model.userData;
  const sin = Math.sin;
  const cos = Math.cos;
  const isFemale = entry._gender === "female";

  // ── Smooth blend weight (0=idle, 1=full walk/run) with asymmetric lag ───────
  // Ease in fast (0.18s) so movement feels responsive; ease out slower (0.35s)
  // so stopping looks natural and feet don't snap.
  const blendTarget = (speed > 0.06 && !isDancing) ? Math.min(speed / 2.8, 1.0) : 0.0;
  const blendSpeed  = blendTarget > (ud._blend || 0) ? 5.5 : 2.8; // fast in, slow out
  ud._blend = (ud._blend || 0) + (blendTarget - (ud._blend || 0)) * Math.min(1, blendSpeed * dt);
  const blend = ud._blend;

  // Walk vs run blend (0=walk, 1=full run) — crossfade over 0.3s
  const runTarget  = Math.max(0, (speed - 1.8) / 1.4);
  const runBlend   = Math.min(1, (ud._runBlend || 0) + (runTarget - (ud._runBlend || 0)) * Math.min(1, 4.0 * dt));
  ud._runBlend = runBlend;

  // ── Phase accumulator: advance proportional to actual speed ──────────────────
  // Walk cycle stride at 3.0 m/s → one full step (2π) per ~0.9m of travel.
  // Run cycle is faster — scaled up smoothly.
  // Female gets 22% faster cycle to match her longer stride from the 1.16 height scale.
  const walkCycleSpeed = isFemale ? 3.9 : 3.2;
  const runCycleSpeed  = isFemale ? 6.6 : 5.4;
  const cycleSpeed = walkCycleSpeed + (runCycleSpeed - walkCycleSpeed) * runBlend;

  // Only advance phase when actually moving — prevents sliding when stopped
  if (speed > 0.06 && !isDancing) {
    ud._phase = (ud._phase || 0) + cycleSpeed * dt;
  }
  // Separate slow idle sway timer always advances
  ud._idleT = (ud._idleT || 0) + dt;

  const phase  = ud._phase || 0;
  const idleT  = ud._idleT;

  // ── Animation amplitudes — interpolate with blend & runBlend ─────────────────
  const legAmpWalk = 0.42;   // max leg swing in walk
  const legAmpRun  = 0.62;   // max leg swing in run
  const legAmp     = (legAmpWalk + (legAmpRun - legAmpWalk) * runBlend) * blend;

  const armAmpWalk = 0.30;
  const armAmpRun  = 0.50;
  const armAmp     = (armAmpWalk + (armAmpRun - armAmpWalk) * runBlend) * blend;

  // ── Leg rotation (hip-pivot swing) ───────────────────────────────────────────
  // Legs swing on X (forward/back). Right leg leads when left is back (sin vs -sin).
  // Use smoothstep on the sin to make foot contact flatter (less floaty arc).
  const legSin = sin(phase);
  // Knee bend: when leg is behind (negative extension), add slight knee bend on Z
  // to fake the knee lift. We approximate with a half-wave rectified sin.
  const kneeWalk = 0.10;
  const kneeRun  = 0.20;
  const kneeAmp  = (kneeWalk + (kneeRun - kneeWalk) * runBlend) * blend;

  if (p.legL) {
    p.legL.rotation.x = legSin * legAmp;
    // Slight outward lean when leg is forward (natural gait)
    p.legL.rotation.z = 0.04 * blend * sin(phase + Math.PI * 0.5);
  }
  if (p.legR) {
    p.legR.rotation.x = -legSin * legAmp;
    p.legR.rotation.z = -0.04 * blend * sin(phase + Math.PI * 0.5);
  }

  // ── Arm swing — naturally opposite to same-side leg ──────────────────────────
  // Left arm swings forward when LEFT leg swings back (arms counter legs).
  // Arms also have a slight inward-outward Z swing for shoulder feel.
  const armSinFwd = -legSin; // counter to left leg
  // Female arms stay strictly on X axis with minimal Z drift to prevent clipping
  const armZBase = isFemale ? 0.08 : 0.10;
  const armZSwing = isFemale ? 0.03 : 0.06; // reduced for female to keep arms clear of body

  if (p.armL) {
    p.armL.rotation.x = armSinFwd * armAmp;
    p.armL.rotation.z = armZBase + armZSwing * blend * sin(phase + Math.PI * 0.5);
  }
  if (p.armR) {
    p.armR.rotation.x = -armSinFwd * armAmp;
    p.armR.rotation.z = -(armZBase + armZSwing * blend * sin(phase + Math.PI * 0.5));
  }

  // ── Torso: hip sway + shoulder counter-rotation + bob ────────────────────────
  if (p.torsoGroup) {
    const baseY = isFemale ? 0.82 : 0.84;

    // Vertical bob: body drops slightly on each step contact (2× per stride cycle)
    const bobAmpWalk = 0.010;
    const bobAmpRun  = 0.022;
    const bob = (bobAmpWalk + (bobAmpRun - bobAmpWalk) * runBlend) * blend;
    const bobVal = -Math.abs(sin(phase)) * bob;

    // Idle breathing: gentle up/down
    const idleBob = isDancing ? 0 : sin(idleT * 1.1) * 0.005 * (1 - blend);

    p.torsoGroup.position.y = baseY + bobVal + idleBob;

    // Shoulder counter-rotation — reduced for female so shoulders don't swing arms into body
    const shoulderAmpWalk = isFemale ? 0.030 : 0.055;
    const shoulderAmpRun  = isFemale ? 0.055 : 0.10;
    const shoulderAmp = (shoulderAmpWalk + (shoulderAmpRun - shoulderAmpWalk) * runBlend) * blend;
    if (isDancing) {
      p.torsoGroup.rotation.y = sin(idleT * 3.0) * 0.18;
    } else {
      p.torsoGroup.rotation.y = sin(phase + Math.PI) * shoulderAmp;
    }

    // Slight forward lean when running
    const leanAmp  = 0.06 * runBlend * blend;
    p.torsoGroup.rotation.x = leanAmp;
  }

  // ── Head: subtle nod and gentle idle look-around ─────────────────────────────
  if (p.headGroup) {
    // Small forward nod on each step
    const nodAmp = 0.022 * blend;
    p.headGroup.rotation.x = sin(phase * 2) * nodAmp + sin(idleT * 0.7) * 0.015 * (1 - blend);
    // Subtle side tilt with gait (looks at path)
    p.headGroup.rotation.z = sin(phase) * 0.015 * blend;
  }
}

// ── PUBLIC API ─────────────────────────────────────────────────────────────────
export function createMixamoAvatar(scene, opts = {}, onReady) {
  const gender = opts.gender || "male";
  const C = gender === "female" ? FEMALE_CASUAL : MALE_CASUAL;

  const controller = new THREE.Group();
  controller.name = "avatar";
  controller.position.set(opts.spawnX ?? SPAWN[0], opts.spawnY ?? SPAWN[1], opts.spawnZ ?? SPAWN[2]);
  scene.add(controller);

  const model = gender === "female" ? buildFemaleCasual(C) : buildMaleCasual(C);
  model.rotation.y = 0; // face is +Z; camera starts at +Z behind avatar, sees back
  if (gender === "female") {
    // Scale to match soldier GLB height (~1.8u). Female geometry top ≈ 1.55u → scale = 1.8/1.55 ≈ 1.16
    model.scale.set(1.16, 1.16, 1.16);
    model.position.y = 0; // feet origin stays at ground
  }
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

  const model = entry.root?.getObjectByName("avatarModel");
  const p = model?.userData;

  if (isHoverboarding) {
    // Smooth blend into hoverboard stance — lerp toward target pose
    const lerpSpeed = Math.min(1, 6.0 * dt);
    const parts = p?._animParts;
    if (parts) {
      if (parts.armL) {
        parts.armL.rotation.x += (-0.18 - parts.armL.rotation.x) * lerpSpeed;
        parts.armL.rotation.z += (0.50 - parts.armL.rotation.z) * lerpSpeed;
      }
      if (parts.armR) {
        parts.armR.rotation.x += (-0.18 - parts.armR.rotation.x) * lerpSpeed;
        parts.armR.rotation.z += (-0.50 - parts.armR.rotation.z) * lerpSpeed;
      }
      if (parts.legL) {
        parts.legL.rotation.x += (0.14 - parts.legL.rotation.x) * lerpSpeed;
        parts.legL.rotation.z += (0 - parts.legL.rotation.z) * lerpSpeed;
      }
      if (parts.legR) {
        parts.legR.rotation.x += (0.14 - parts.legR.rotation.x) * lerpSpeed;
        parts.legR.rotation.z += (0 - parts.legR.rotation.z) * lerpSpeed;
      }

    }
    // Freeze phase accumulator so walk cycle resumes cleanly from where it was
    if (p) p._blend = (p._blend || 0) * (1 - lerpSpeed * 0.5);
    return;
  }

  animateCasual(entry, speed, isDancing, dt);
}