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
// Same hip-pivot architecture as female to prevent leg/hip clipping.
function buildMaleCasual(C) {
  const root = new THREE.Group();
  root.name = "avatarModel";
  root.add(makeShadow());

  // Hip/pelvis block — bridges torso-bottom to leg-tops, hides seam at all rotations
  const hipBlock = new THREE.Mesh(
    new THREE.BoxGeometry(0.34, 0.20, 0.22),
    mat(C.pants, { roughness: 0.75 })
  );
  hipBlock.position.set(0, 0.66, 0);
  hipBlock.castShadow = true;
  root.add(hipBlock);

  // Legs — pivot groups at hip joint (y=0.66), capsule mesh hangs downward
  const legGeo = new THREE.CapsuleGeometry(0.088, 0.46, 4, 8);
  const legMat = mat(C.pants);

  const legL = new THREE.Group(); legL.name = "legL"; legL.position.set(0.108, 0.66, 0);
  const legLMesh = new THREE.Mesh(legGeo, legMat); legLMesh.position.y = -0.30; legLMesh.castShadow = true; legL.add(legLMesh);

  const legR = new THREE.Group(); legR.name = "legR"; legR.position.set(-0.108, 0.66, 0);
  const legRMesh = new THREE.Mesh(legGeo, legMat); legRMesh.position.y = -0.30; legRMesh.castShadow = true; legR.add(legRMesh);

  root.add(legL, legR);

  // Shoes — parented to leg pivot groups so they follow the leg swing
  const shoeGeo = new THREE.BoxGeometry(0.12, 0.10, 0.20);
  const bootL = new THREE.Mesh(shoeGeo, mat(C.shoes));
  bootL.name = "bootL"; bootL.position.set(0, -0.62, 0.018); bootL.castShadow = true; legL.add(bootL);
  const bootR = new THREE.Mesh(shoeGeo, mat(C.shoes));
  bootR.name = "bootR"; bootR.position.set(0, -0.62, 0.018); bootR.castShadow = true; legR.add(bootR);

  // Shoe sole glow — also parented to leg pivots
  const soleMat = new THREE.MeshBasicMaterial({ color: C.accent, transparent: true, opacity: 0.55, depthWrite: false });
  const soleL = new THREE.Mesh(new THREE.BoxGeometry(0.122, 0.014, 0.14), soleMat);
  soleL.position.set(0, -0.668, 0.012); legL.add(soleL);
  const soleR = new THREE.Mesh(new THREE.BoxGeometry(0.122, 0.014, 0.14), soleMat);
  soleR.position.set(0, -0.668, 0.012); legR.add(soleR);

  // Torso — lowered so bottom overlaps hip block
  const torsoGroup = new THREE.Group();
  torsoGroup.name = "torso";
  torsoGroup.position.set(0, 0.82, 0);
  root.add(torsoGroup);

  // Hoodie body
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.48, 0.24), mat(C.shirt, { roughness: 0.75 }));
  torso.castShadow = true;
  torsoGroup.add(torso);

  // Hoodie pocket detail
  const pocketMat = new THREE.MeshBasicMaterial({ color: C.accent, transparent: true, opacity: 0.45, depthWrite: false });
  const pocket = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.09, 0.012), pocketMat);
  pocket.position.set(0, -0.14, 0.122);
  torsoGroup.add(pocket);

  // Arms — pivot at shoulder, arm hangs downward (matching female pattern)
  const armGeo = new THREE.CapsuleGeometry(0.068, 0.40, 4, 8);
  const armL = new THREE.Group(); armL.name = "armL"; armL.position.set(0.245, -0.02, 0);
  const armLMesh = new THREE.Mesh(armGeo, mat(C.shirt, { roughness: 0.75 }));
  armLMesh.rotation.z = 0.10; armLMesh.castShadow = true; armL.add(armLMesh);
  const armR = new THREE.Group(); armR.name = "armR"; armR.position.set(-0.245, -0.02, 0);
  const armRMesh = new THREE.Mesh(armGeo, mat(C.shirt, { roughness: 0.75 }));
  armRMesh.rotation.z = -0.10; armRMesh.castShadow = true; armR.add(armRMesh);
  torsoGroup.add(armL, armR);

  // Hands — straight down from arm pivot (no lateral offset → no torso clipping)
  const handGeo = new THREE.SphereGeometry(0.068, 8, 6);
  const handL = new THREE.Mesh(handGeo, mat(C.skin)); handL.name = "gloveL";
  handL.position.set(0, -0.26, 0); armL.add(handL);
  const handR = new THREE.Mesh(handGeo, mat(C.skin)); handR.name = "gloveR";
  handR.position.set(0, -0.26, 0); armR.add(handR);

  // Neck
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.076, 0.086, 0.13, 8), mat(C.skin));
  neck.position.set(0, 0.30, 0); neck.castShadow = true; torsoGroup.add(neck);

  // Head
  const headGroup = new THREE.Group(); headGroup.name = "head"; headGroup.position.set(0, 0.44, 0);
  torsoGroup.add(headGroup);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.160, 12, 10), mat(C.skin));
  head.castShadow = true; headGroup.add(head);

  // Hair — short top
  const hair = new THREE.Mesh(
    new THREE.SphereGeometry(0.165, 10, 8, 0, Math.PI * 2, 0, Math.PI * 0.52),
    mat(C.hair, { roughness: 0.88 })
  );
  hair.position.y = 0.02; headGroup.add(hair);

  // Eyes — white sclera protruding from head surface, dark pupil on top
  const scleraGeo = new THREE.SphereGeometry(0.028, 8, 6);
  const scleraMat = new THREE.MeshBasicMaterial({ color: 0xF5F0E8 });
  const pupilGeo  = new THREE.SphereGeometry(0.016, 8, 6);
  const pupilMat  = new THREE.MeshBasicMaterial({ color: 0x111111 });

  const eyeScleraL = new THREE.Mesh(scleraGeo, scleraMat);
  eyeScleraL.position.set(0.055, 0.034, 0.148);
  headGroup.add(eyeScleraL);
  const eyePupilL = new THREE.Mesh(pupilGeo, pupilMat);
  eyePupilL.position.set(0.055, 0.034, 0.172);
  headGroup.add(eyePupilL);

  const eyeScleraR = new THREE.Mesh(scleraGeo, scleraMat);
  eyeScleraR.position.set(-0.055, 0.034, 0.148);
  headGroup.add(eyeScleraR);
  const eyePupilR = new THREE.Mesh(pupilGeo, pupilMat);
  eyePupilR.position.set(-0.055, 0.034, 0.172);
  headGroup.add(eyePupilR);

  // Mouth — dark flat box protruding from face
  const mouthMat = new THREE.MeshBasicMaterial({ color: 0x5C2A1A });
  const mouth = new THREE.Mesh(new THREE.BoxGeometry(0.072, 0.014, 0.012), mouthMat);
  mouth.position.set(0, -0.040, 0.156);
  headGroup.add(mouth);

  root.userData._animParts = { legL, legR, armL, armR, headGroup, torsoGroup };
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

  // Eyes — white sclera protruding from head surface, dark pupil on top
  const fScleraGeo = new THREE.SphereGeometry(0.025, 8, 6);
  const fScleraMat = new THREE.MeshBasicMaterial({ color: 0xF5F0E8 });
  const fPupilGeo  = new THREE.SphereGeometry(0.014, 8, 6);
  const fPupilMat  = new THREE.MeshBasicMaterial({ color: 0x111111 });

  const fEyeScleraL = new THREE.Mesh(fScleraGeo, fScleraMat);
  fEyeScleraL.position.set(0.048, 0.030, 0.134);
  headGroup.add(fEyeScleraL);
  const fEyePupilL = new THREE.Mesh(fPupilGeo, fPupilMat);
  fEyePupilL.position.set(0.048, 0.030, 0.156);
  headGroup.add(fEyePupilL);

  const fEyeScleraR = new THREE.Mesh(fScleraGeo, fScleraMat);
  fEyeScleraR.position.set(-0.048, 0.030, 0.134);
  headGroup.add(fEyeScleraR);
  const fEyePupilR = new THREE.Mesh(fPupilGeo, fPupilMat);
  fEyePupilR.position.set(-0.048, 0.030, 0.156);
  headGroup.add(fEyePupilR);

  // Mouth — subtle dark line protruding from face
  const fMouthMat = new THREE.MeshBasicMaterial({ color: 0x7A3020 });
  const fMouth = new THREE.Mesh(new THREE.BoxGeometry(0.062, 0.012, 0.010), fMouthMat);
  fMouth.position.set(0, -0.036, 0.144);
  headGroup.add(fMouth);

  root.userData._animParts = { legL, legR, armL, armR, headGroup, torsoGroup };
  root.userData._animTime = 0;
  return root;
}

// ── Procedural emote animations ──────────────────────────────────────────────
// All emotes use the _animParts skeleton. emoteBlend (0→1) controls blend-in.
function applyProceduralEmote(p, emoteId, t, emoteBlend, isFemale) {
  const sin = Math.sin;
  const PI  = Math.PI;
  const b   = emoteBlend; // 0=idle, 1=full emote

  switch (emoteId) {
    case "dance": {
      // Full body dance — hip sway, alternating arm pumps, bounce
      const beat = t * 3.5;
      const hipSway = sin(beat) * 0.28 * b;
      const bounce  = Math.abs(sin(beat)) * 0.04 * b;
      if (p.torsoGroup) {
        p.torsoGroup.rotation.y = hipSway;
        p.torsoGroup.rotation.x = sin(beat * 2) * 0.06 * b;
        p.torsoGroup.position.y = 0.82 + bounce;
      }
      // Arms pump alternately — left up when right down
      if (p.armL) {
        p.armL.rotation.x = sin(beat + PI * 0.5) * 0.55 * b;
        p.armL.rotation.z = (isFemale ? 0.08 : 0.10) + sin(beat) * 0.3 * b;
      }
      if (p.armR) {
        p.armR.rotation.x = -sin(beat + PI * 0.5) * 0.55 * b;
        p.armR.rotation.z = -(isFemale ? 0.08 : 0.10) - sin(beat) * 0.3 * b;
      }
      // Legs step side to side
      if (p.legL) { p.legL.rotation.x = sin(beat) * 0.18 * b; p.legL.rotation.z = 0; }
      if (p.legR) { p.legR.rotation.x = -sin(beat) * 0.18 * b; p.legR.rotation.z = 0; }
      if (p.headGroup) {
        p.headGroup.rotation.z = sin(beat * 0.5) * 0.08 * b;
        p.headGroup.rotation.x = sin(beat * 2) * 0.04 * b;
      }
      break;
    }
    case "clap": {
      // Arms swing inward to clap, alternating with a body bounce
      const beat = t * 5.0;
      const clap = Math.abs(sin(beat)); // 0=apart, 1=together
      const fwd  = clap * 0.65 * b;    // arms swing forward/inward
      if (p.armL) {
        p.armL.rotation.x = -fwd;
        p.armL.rotation.z = (isFemale ? 0.08 : 0.10) - clap * 0.55 * b;
      }
      if (p.armR) {
        p.armR.rotation.x = -fwd;
        p.armR.rotation.z = -(isFemale ? 0.08 : 0.10) + clap * 0.55 * b;
      }
      if (p.torsoGroup) {
        p.torsoGroup.position.y = 0.82 + clap * 0.015 * b;
        p.torsoGroup.rotation.y = sin(beat * 0.5) * 0.06 * b;
        p.torsoGroup.rotation.x = 0;
      }
      if (p.legL) { p.legL.rotation.x = 0; p.legL.rotation.z = 0; }
      if (p.legR) { p.legR.rotation.x = 0; p.legR.rotation.z = 0; }
      if (p.headGroup) {
        p.headGroup.rotation.z = 0;
        p.headGroup.rotation.x = clap * 0.05 * b;
      }
      break;
    }
    case "wave": {
      // Right arm raises and waves side to side
      const beat = t * 4.5;
      const wave = sin(beat) * 0.45 * b;
      if (p.armR) {
        p.armR.rotation.x = -0.55 * b;         // raise arm up
        p.armR.rotation.z = -0.55 * b + wave;  // wave left/right
      }
      if (p.armL) {
        p.armL.rotation.x = sin(beat * 0.3) * 0.06 * b;
        p.armL.rotation.z = (isFemale ? 0.08 : 0.10);
      }
      if (p.torsoGroup) {
        p.torsoGroup.rotation.y = sin(beat * 0.4) * 0.06 * b;
        p.torsoGroup.position.y = 0.82;
        p.torsoGroup.rotation.x = 0;
      }
      if (p.legL) { p.legL.rotation.x = 0; p.legL.rotation.z = 0; }
      if (p.legR) { p.legR.rotation.x = 0; p.legR.rotation.z = 0; }
      if (p.headGroup) {
        p.headGroup.rotation.z = sin(beat * 0.5) * 0.04 * b;
        p.headGroup.rotation.x = 0;
      }
      break;
    }
    case "celebrate": {
      // Both arms pump up in victory, body bounces
      const beat = t * 4.0;
      const pump = sin(beat);
      const upAmount = (0.55 + pump * 0.25) * b;
      if (p.armL) {
        p.armL.rotation.x = -upAmount;
        p.armL.rotation.z = 0.55 * b + sin(beat) * 0.15 * b;
      }
      if (p.armR) {
        p.armR.rotation.x = -upAmount;
        p.armR.rotation.z = -(0.55 * b + sin(beat) * 0.15 * b);
      }
      const bounce = Math.abs(sin(beat * 2)) * 0.045 * b;
      if (p.torsoGroup) {
        p.torsoGroup.position.y = 0.82 + bounce;
        p.torsoGroup.rotation.y = sin(beat * 0.5) * 0.10 * b;
        p.torsoGroup.rotation.x = -0.04 * b; // slight lean back for victory feel
      }
      if (p.legL) { p.legL.rotation.x = sin(beat) * 0.12 * b; p.legL.rotation.z = 0; }
      if (p.legR) { p.legR.rotation.x = -sin(beat) * 0.12 * b; p.legR.rotation.z = 0; }
      if (p.headGroup) {
        p.headGroup.rotation.x = -0.08 * b; // look slightly upward
        p.headGroup.rotation.z = sin(beat * 0.5) * 0.04 * b;
      }
      break;
    }
    case "vibe": {
      // Relaxed groove — gentle hip sway, soft arm swing, slight body roll
      const beat = t * 2.2;
      if (p.torsoGroup) {
        p.torsoGroup.rotation.y = sin(beat) * 0.20 * b;
        p.torsoGroup.rotation.x = sin(beat * 2) * 0.03 * b;
        p.torsoGroup.position.y = 0.82 + Math.abs(sin(beat)) * 0.018 * b;
      }
      if (p.armL) {
        p.armL.rotation.x = sin(beat + PI * 0.3) * 0.25 * b;
        p.armL.rotation.z = (isFemale ? 0.08 : 0.10) + sin(beat) * 0.18 * b;
      }
      if (p.armR) {
        p.armR.rotation.x = -sin(beat + PI * 0.3) * 0.25 * b;
        p.armR.rotation.z = -(isFemale ? 0.08 : 0.10) - sin(beat) * 0.18 * b;
      }
      if (p.legL) { p.legL.rotation.x = sin(beat) * 0.10 * b; p.legL.rotation.z = sin(beat * 0.5) * 0.04 * b; }
      if (p.legR) { p.legR.rotation.x = -sin(beat) * 0.10 * b; p.legR.rotation.z = -sin(beat * 0.5) * 0.04 * b; }
      if (p.headGroup) {
        p.headGroup.rotation.z = sin(beat * 0.7) * 0.07 * b;
        p.headGroup.rotation.x = sin(beat * 1.4) * 0.03 * b;
      }
      break;
    }
    default:
      break;
  }
}

// ── Procedural animation — natural walk/run cycle ─────────────────────────────
function animateCasual(entry, speed, isDancing, dt, emoteId) {
  if (!entry?.root) return;
  const model = entry.root.getObjectByName("avatarModel");
  if (!model) return;
  const p = model.userData._animParts;
  if (!p) return;

  const ud = model.userData;
  const sin = Math.sin;
  const isFemale = entry._gender === "female";

  // Global timer (always advances)
  ud._idleT = (ud._idleT || 0) + dt;
  const idleT = ud._idleT;

  // ── Emote blend weight — smooth in/out ────────────────────────────────────────
  const emoteTarget = isDancing ? 1.0 : 0.0;
  const emoteBlendSpeed = emoteTarget > (ud._emoteBlend || 0) ? 4.5 : 3.0; // fast in, slower out
  ud._emoteBlend = (ud._emoteBlend || 0) + (emoteTarget - (ud._emoteBlend || 0)) * Math.min(1, emoteBlendSpeed * dt);
  const emoteBlend = ud._emoteBlend;

  // When emote is active, hand off to emote system
  if (emoteBlend > 0.01 && emoteId) {
    // Walk blend drops to 0 during emote (avatar stays in place)
    ud._blend = (ud._blend || 0) * (1 - Math.min(1, 6 * dt));
    applyProceduralEmote(p, emoteId, idleT, emoteBlend, isFemale);
    return;
  }

  // ── Walk/run blend weight ─────────────────────────────────────────────────────
  const blendTarget = speed > 0.06 ? Math.min(speed / 2.8, 1.0) : 0.0;
  const blendSpeed  = blendTarget > (ud._blend || 0) ? 5.5 : 2.8;
  ud._blend = (ud._blend || 0) + (blendTarget - (ud._blend || 0)) * Math.min(1, blendSpeed * dt);
  const blend = ud._blend;

  const runTarget  = Math.max(0, (speed - 1.8) / 1.4);
  ud._runBlend = Math.min(1, (ud._runBlend || 0) + (runTarget - (ud._runBlend || 0)) * Math.min(1, 4.0 * dt));
  const runBlend = ud._runBlend;

  const walkCycleSpeed = isFemale ? 3.9 : 3.2;
  const runCycleSpeed  = isFemale ? 6.6 : 5.4;
  const cycleSpeed = walkCycleSpeed + (runCycleSpeed - walkCycleSpeed) * runBlend;

  if (speed > 0.06) {
    ud._phase = (ud._phase || 0) + cycleSpeed * dt;
  }
  const phase = ud._phase || 0;

  const legAmp = (0.42 + 0.20 * runBlend) * blend;
  const armAmp = (0.30 + 0.20 * runBlend) * blend;
  const legSin = sin(phase);

  if (p.legL) { p.legL.rotation.x = legSin * legAmp; p.legL.rotation.z = 0.04 * blend * sin(phase + Math.PI * 0.5); }
  if (p.legR) { p.legR.rotation.x = -legSin * legAmp; p.legR.rotation.z = -0.04 * blend * sin(phase + Math.PI * 0.5); }

  const armSinFwd = -legSin;
  const armZBase  = isFemale ? 0.08 : 0.10;
  const armZSwing = isFemale ? 0.03 : 0.06;
  if (p.armL) { p.armL.rotation.x = armSinFwd * armAmp; p.armL.rotation.z = armZBase + armZSwing * blend * sin(phase + Math.PI * 0.5); }
  if (p.armR) { p.armR.rotation.x = -armSinFwd * armAmp; p.armR.rotation.z = -(armZBase + armZSwing * blend * sin(phase + Math.PI * 0.5)); }

  if (p.torsoGroup) {
    const bob = (0.010 + 0.012 * runBlend) * blend;
    const idleBob = sin(idleT * 1.1) * 0.005 * (1 - blend);
    p.torsoGroup.position.y = 0.82 - Math.abs(sin(phase)) * bob + idleBob;
    const shoulderAmp = (isFemale ? 0.030 : 0.055) + (isFemale ? 0.025 : 0.045) * runBlend;
    p.torsoGroup.rotation.y = sin(phase + Math.PI) * shoulderAmp * blend;
    p.torsoGroup.rotation.x = 0.06 * runBlend * blend;
  }

  if (p.headGroup) {
    p.headGroup.rotation.x = sin(phase * 2) * 0.022 * blend + sin(idleT * 0.7) * 0.015 * (1 - blend);
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
  // Scale both genders to match soldier GLB height (~1.8u).
  // Both procedural geometries top out at ~1.55u → scale = 1.8/1.55 ≈ 1.16
  model.scale.set(1.16, 1.16, 1.16);
  model.position.y = 0; // feet origin stays at ground
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

export function updateMixamoAvatarAnimation(entry, speed, isDancing, dt, isHoverboarding = false, emoteId = null) {
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

  animateCasual(entry, speed, isDancing, dt, emoteId);
}