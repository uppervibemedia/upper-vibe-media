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

// ── In-world hair builders — rebuilt from scratch with full-head coverage ───────
// FOUNDATION: every style uses a full-sphere shell (phiEnd >= 0.72*PI) so sides
// are NEVER bare. Extra geometry adds shape, length, and style on top.

function iwMh(hex, rough) {
  return new THREE.MeshStandardMaterial({ color: hex, roughness: rough, metalness: 0.02 });
}
function iwMb(hex, op) {
  return new THREE.MeshBasicMaterial({ color: hex, transparent: true, opacity: op, depthWrite: false });
}
function iwShell(r, phiEnd, hex, rough) {
  return new THREE.Mesh(
    new THREE.SphereGeometry(r, 12, 10, 0, Math.PI * 2, 0, phiEnd),
    iwMh(hex, rough)
  );
}

function buildMaleHairInWorld(style, HAIR, headGroup) {
  switch (style) {

    case "locs": {
      // Shell shifted back so it covers top/sides/back but NOT the front face
      const shell = iwShell(0.170, Math.PI * 0.78, HAIR, 0.80);
      shell.position.set(0, 0.018, -0.022); headGroup.add(shell);
      const locs = [
        { x:  0.00, y:-0.08, z:-0.160, len:0.28, r:0.022 },
        { x:  0.04, y:-0.06, z:-0.158, len:0.25, r:0.021 },
        { x: -0.04, y:-0.06, z:-0.158, len:0.25, r:0.021 },
        { x:  0.10, y:-0.06, z:-0.130, len:0.24, r:0.021 },
        { x: -0.10, y:-0.06, z:-0.130, len:0.24, r:0.021 },
        { x:  0.155, y: 0.00, z:-0.060, len:0.22, r:0.020 },
        { x:  0.158, y:-0.04, z:-0.020, len:0.20, r:0.019 },
        { x:  0.152, y:-0.06, z: 0.030, len:0.18, r:0.019 },
        { x: -0.155, y: 0.00, z:-0.060, len:0.22, r:0.020 },
        { x: -0.158, y:-0.04, z:-0.020, len:0.20, r:0.019 },
        { x: -0.152, y:-0.06, z: 0.030, len:0.18, r:0.019 },
        { x:  0.06, y: 0.02, z:-0.150, len:0.22, r:0.020 },
        { x: -0.06, y: 0.02, z:-0.150, len:0.22, r:0.020 },
      ];
      locs.forEach(({ x, y, z, len, r }) => {
        const loc = new THREE.Mesh(new THREE.CapsuleGeometry(r, len, 3, 6), iwMh(HAIR, 0.84));
        loc.position.set(x, y, z);
        loc.rotation.z = Math.atan2(x * 1.5, 0.18) * 0.5;
        loc.rotation.x = Math.atan2(0.12 + len * 0.4, -(z < 0 ? z * 1.2 : z * 0.5)) * 0.3 - 0.15;
        headGroup.add(loc);
      });
      break;
    }

    case "fade": {
      const shell = iwShell(0.166, Math.PI * 0.75, HAIR, 0.88);
      shell.position.set(0, 0.020, -0.020); headGroup.add(shell);
      const topDome = iwShell(0.162, Math.PI * 0.42, HAIR, 0.85);
      topDome.position.set(0, 0.035, 0); headGroup.add(topDome);
      break;
    }

    case "hat": {
      // Hair underneath — full coverage shell shifted back off face
      const shell = iwShell(0.162, Math.PI * 0.72, HAIR, 0.90);
      shell.position.set(0, 0.010, -0.018); headGroup.add(shell);

      const CAP = 0x1a1a2e;   // dark navy cap
      const BRIM_COL = 0x111122;

      // Cap band — thin cylinder sitting just above the ears, hugging the head
      const band = new THREE.Mesh(
        new THREE.CylinderGeometry(0.166, 0.166, 0.038, 16),
        iwMh(CAP, 0.80)
      );
      band.position.set(0, 0.068, 0); headGroup.add(band);

      // Cap crown — rounded dome sitting on top of band
      const crown = iwShell(0.164, Math.PI * 0.52, CAP, 0.76);
      crown.position.set(0, 0.095, -0.008); headGroup.add(crown);

      // Front brim — flat oval panel sticking out forward only (NOT a full ring)
      const brimGeo = new THREE.CylinderGeometry(0.005, 0.005, 0.200, 4, 1, false, -Math.PI * 0.38, Math.PI * 0.76);
      // Use a BoxGeometry instead for a clean flat brim shape
      const brimFlat = new THREE.Mesh(
        new THREE.BoxGeometry(0.200, 0.014, 0.090),
        iwMh(BRIM_COL, 0.82)
      );
      // Angle brim slightly downward from front of cap band
      brimFlat.position.set(0, 0.058, 0.118);
      brimFlat.rotation.x = 0.18; // slight downward tilt
      headGroup.add(brimFlat);

      // Logo detail on front of crown
      const logo = new THREE.Mesh(new THREE.BoxGeometry(0.044, 0.022, 0.008), iwMh(0x9B7EFF, 0.55));
      logo.position.set(0, 0.108, 0.162); headGroup.add(logo);

      // Back strap — small strip at rear
      const strap = new THREE.Mesh(
        new THREE.BoxGeometry(0.060, 0.018, 0.012),
        iwMh(0x222233, 0.85)
      );
      strap.position.set(0, 0.062, -0.164); headGroup.add(strap);
      break;
    }

    case "bald":
      break;

    default: { // "short"
      const shell = iwShell(0.167, Math.PI * 0.76, HAIR, 0.86);
      shell.position.set(0, 0.018, -0.020); headGroup.add(shell);
      break;
    }
  }
}

function buildFemaleHairInWorld(style, HAIR, ACCENT, headGroup) {
  switch (style) {

    case "long": {
      const shell = iwShell(0.158, Math.PI * 0.80, HAIR, 0.76);
      shell.position.set(0, 0.016, -0.022); headGroup.add(shell);
      const sGeo = new THREE.CapsuleGeometry(0.058, 0.46, 4, 7);
      const sL = new THREE.Mesh(sGeo, iwMh(HAIR, 0.78)); sL.position.set( 0.115, -0.17, -0.010); sL.rotation.z =  0.14; headGroup.add(sL);
      const sR = new THREE.Mesh(sGeo, iwMh(HAIR, 0.78)); sR.position.set(-0.115, -0.17, -0.010); sR.rotation.z = -0.14; headGroup.add(sR);
      const back = new THREE.Mesh(new THREE.CapsuleGeometry(0.078, 0.52, 4, 8), iwMh(HAIR, 0.77));
      back.position.set(0, -0.22, -0.075); back.rotation.x = 0.06; headGroup.add(back);
      const frGeo = new THREE.CapsuleGeometry(0.020, 0.10, 3, 5);
      const frL = new THREE.Mesh(frGeo, iwMh(HAIR, 0.80)); frL.position.set( 0.090, 0.030, 0.118); frL.rotation.z =  0.22; headGroup.add(frL);
      const frR = new THREE.Mesh(frGeo, iwMh(HAIR, 0.80)); frR.position.set(-0.090, 0.030, 0.118); frR.rotation.z = -0.22; headGroup.add(frR);
      break;
    }

    case "bob": {
      const shell = iwShell(0.158, Math.PI * 0.78, HAIR, 0.78);
      shell.position.set(0, 0.016, -0.022); headGroup.add(shell);
      const bGeo = new THREE.CapsuleGeometry(0.062, 0.26, 4, 6);
      const bL = new THREE.Mesh(bGeo, iwMh(HAIR, 0.78)); bL.position.set( 0.110, -0.12, -0.004); bL.rotation.z =  0.10; headGroup.add(bL);
      const bR = new THREE.Mesh(bGeo, iwMh(HAIR, 0.78)); bR.position.set(-0.110, -0.12, -0.004); bR.rotation.z = -0.10; headGroup.add(bR);
      const bBack = new THREE.Mesh(new THREE.CapsuleGeometry(0.068, 0.24, 4, 6), iwMh(HAIR, 0.78));
      bBack.position.set(0, -0.11, -0.085); headGroup.add(bBack);
      break;
    }

    case "short": {
      const shell = iwShell(0.157, Math.PI * 0.76, HAIR, 0.82);
      shell.position.set(0, 0.018, -0.020); headGroup.add(shell);
      const pGeo = new THREE.CapsuleGeometry(0.042, 0.12, 3, 6);
      const pL = new THREE.Mesh(pGeo, iwMh(HAIR, 0.82)); pL.position.set( 0.140, -0.025, -0.028); pL.rotation.z =  0.60; headGroup.add(pL);
      const pR = new THREE.Mesh(pGeo, iwMh(HAIR, 0.82)); pR.position.set(-0.140, -0.025, -0.028); pR.rotation.z = -0.60; headGroup.add(pR);
      const bkN = new THREE.Mesh(new THREE.CapsuleGeometry(0.044, 0.14, 3, 5), iwMh(HAIR, 0.84));
      bkN.position.set(0, -0.062, -0.130); bkN.rotation.x = 0.30; headGroup.add(bkN);
      break;
    }

    default: { // "ponytail"
      const shell = iwShell(0.158, Math.PI * 0.78, HAIR, 0.78);
      shell.position.set(0, 0.016, -0.022); headGroup.add(shell);
      const gather = new THREE.Mesh(new THREE.CapsuleGeometry(0.056, 0.20, 3, 6), iwMh(HAIR, 0.78));
      gather.position.set(0, -0.06, -0.118); gather.rotation.x = -0.15; headGroup.add(gather);
      const band = new THREE.Mesh(new THREE.TorusGeometry(0.044, 0.013, 6, 12), iwMb(ACCENT, 0.90));
      band.position.set(0, -0.178, -0.118); band.rotation.x = Math.PI / 2; headGroup.add(band);
      const tail = new THREE.Mesh(new THREE.CapsuleGeometry(0.034, 0.26, 3, 6), iwMh(HAIR, 0.78));
      tail.position.set(0, -0.320, -0.100); tail.rotation.x = 0.10; headGroup.add(tail);
      break;
    }
  }
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

  // Hair — built by shared builder, reads opts.hairStyle
  buildMaleHairInWorld(C._hairStyle || "short", C.hair, headGroup);

  // Eyes — white sclera + dark pupil, properly positioned mid-face
  const scleraGeo = new THREE.SphereGeometry(0.020, 8, 6);
  const scleraMat = new THREE.MeshBasicMaterial({ color: 0xF2EDE4 });
  const pupilGeo  = new THREE.SphereGeometry(0.012, 8, 6);
  const pupilMat  = new THREE.MeshBasicMaterial({ color: 0x111111 });

  // Eye Y=-0.008 = just below center of head sphere = natural eye socket position
  const eyeScleraL = new THREE.Mesh(scleraGeo, scleraMat);
  eyeScleraL.position.set(0.040, -0.008, 0.148);
  headGroup.add(eyeScleraL);
  const eyePupilL = new THREE.Mesh(pupilGeo, pupilMat);
  eyePupilL.position.set(0.040, -0.008, 0.168);
  headGroup.add(eyePupilL);

  const eyeScleraR = new THREE.Mesh(scleraGeo, scleraMat);
  eyeScleraR.position.set(-0.040, -0.008, 0.148);
  headGroup.add(eyeScleraR);
  const eyePupilR = new THREE.Mesh(pupilGeo, pupilMat);
  eyePupilR.position.set(-0.040, -0.008, 0.168);
  headGroup.add(eyePupilR);

  // Mouth — dark flat box, lower third of face
  const mouthMat = new THREE.MeshBasicMaterial({ color: 0x5C2A1A });
  const mouth = new THREE.Mesh(new THREE.BoxGeometry(0.065, 0.012, 0.010), mouthMat);
  mouth.position.set(0, -0.072, 0.152);
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

  // Hair — built by shared builder, reads C._hairStyle
  buildFemaleHairInWorld(C._hairStyle || "ponytail", C.hair, C.accent, headGroup);

  // Eyes — white sclera + dark pupil, mid-face position
  const fScleraGeo = new THREE.SphereGeometry(0.018, 8, 6);
  const fScleraMat = new THREE.MeshBasicMaterial({ color: 0xF2EDE4 });
  const fPupilGeo  = new THREE.SphereGeometry(0.011, 8, 6);
  const fPupilMat  = new THREE.MeshBasicMaterial({ color: 0x111111 });

  const fEyeScleraL = new THREE.Mesh(fScleraGeo, fScleraMat);
  fEyeScleraL.position.set(0.038, -0.006, 0.134);
  headGroup.add(fEyeScleraL);
  const fEyePupilL = new THREE.Mesh(fPupilGeo, fPupilMat);
  fEyePupilL.position.set(0.038, -0.006, 0.152);
  headGroup.add(fEyePupilL);

  const fEyeScleraR = new THREE.Mesh(fScleraGeo, fScleraMat);
  fEyeScleraR.position.set(-0.038, -0.006, 0.134);
  headGroup.add(fEyeScleraR);
  const fEyePupilR = new THREE.Mesh(fPupilGeo, fPupilMat);
  fEyePupilR.position.set(-0.038, -0.006, 0.152);
  headGroup.add(fEyePupilR);

  // Mouth — subtle dark line, lower third of face
  const fMouthMat = new THREE.MeshBasicMaterial({ color: 0x7A3020 });
  const fMouth = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.011, 0.009), fMouthMat);
  fMouth.position.set(0, -0.068, 0.140);
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

  const walkCycleSpeed = isFemale ? 5.85 : 4.8;  // +50% from 3.9 / 3.2
  const runCycleSpeed  = isFemale ? 8.25 : 6.75; // +25% on top of walk increase
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
  const C = { ...(gender === "female" ? FEMALE_CASUAL : MALE_CASUAL), _hairStyle: opts.hairStyle || "" };

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