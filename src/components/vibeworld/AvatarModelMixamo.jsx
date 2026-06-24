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

  // Legs (slimmer)
  const legGeo = new THREE.CapsuleGeometry(0.072, 0.46, 4, 8);
  const legL = new THREE.Mesh(legGeo, mat(C.pants));
  legL.name = "legL"; legL.position.set(0.090, 0.36, 0); legL.castShadow = true;
  const legR = legL.clone(); legR.name = "legR"; legR.position.set(-0.090, 0.36, 0);
  root.add(legL, legR);

  // Sneakers (pink)
  const shoeGeo = new THREE.BoxGeometry(0.10, 0.10, 0.185);
  const bootL = new THREE.Mesh(shoeGeo, mat(C.shoes));
  bootL.name = "bootL"; bootL.position.set(0.090, 0.078, 0.015); bootL.castShadow = true;
  const bootR = bootL.clone(); bootR.name = "bootR"; bootR.position.set(-0.090, 0.078, 0.015);
  root.add(bootL, bootR);

  // Shoe glow
  const soleMat = new THREE.MeshBasicMaterial({ color: C.glow, transparent: true, opacity: 0.60, depthWrite: false });
  for (const bx of [0.090, -0.090]) {
    const sole = new THREE.Mesh(new THREE.BoxGeometry(0.102, 0.012, 0.13), soleMat);
    sole.position.set(bx, 0.030, 0.010);
    root.add(sole);
  }

  // Torso
  const torsoGroup = new THREE.Group();
  torsoGroup.name = "torso";
  torsoGroup.position.set(0, 0.86, 0);
  root.add(torsoGroup);

  // Crop top + high-waist pants seam
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.40, 0.20), mat(C.shirt, { roughness: 0.65 }));
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
  const armL = new THREE.Group(); armL.name = "armL"; armL.position.set(0.200, 0.10, 0);
  const armLMesh = new THREE.Mesh(armGeo, mat(C.shirt, { roughness: 0.65 }));
  armLMesh.rotation.z = 0.10; armLMesh.castShadow = true; armL.add(armLMesh);
  const armR = new THREE.Group(); armR.name = "armR"; armR.position.set(-0.200, 0.10, 0);
  const armRMesh = new THREE.Mesh(armGeo, mat(C.shirt, { roughness: 0.65 }));
  armRMesh.rotation.z = -0.10; armRMesh.castShadow = true; armR.add(armRMesh);
  torsoGroup.add(armL, armR);

  // Hands
  const handGeo = new THREE.SphereGeometry(0.058, 8, 6);
  const handL = new THREE.Mesh(handGeo, mat(C.skin)); handL.name = "gloveL";
  handL.position.set(0.215, -0.22, 0); armL.add(handL);
  const handR = handL.clone(); handR.name = "gloveR"; armR.add(handR);

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

  root.userData._animParts = { legL, legR, armL, armR, headGroup, torsoGroup, bootL, bootR };
  root.userData._animTime = 0;
  return root;
}

// ── Procedural animation (shared with both genders) ───────────────────────────
function animateCasual(entry, speed, isDancing, dt) {
  if (!entry?.root) return;
  const model = entry.root.getObjectByName("avatarModel");
  if (!model) return;
  const p = model.userData._animParts;
  if (!p) return;

  model.userData._animTime = (model.userData._animTime || 0) + dt;
  const t = model.userData._animTime;
  const sin = Math.sin;

  const isRun  = speed > 0.5;
  const isWalk = speed > 0.07 && !isRun;
  const freq   = isRun ? 3.2 : isWalk ? 2.0 : 1.0;
  const amp    = isRun ? 0.55 : isWalk ? 0.32 : 0.0;

  if (p.legL) p.legL.rotation.x = sin(t * freq) * amp;
  if (p.legR) p.legR.rotation.x = -sin(t * freq) * amp;
  if (p.bootL) p.bootL.rotation.x = sin(t * freq) * amp * 0.5;
  if (p.bootR) p.bootR.rotation.x = -sin(t * freq) * amp * 0.5;

  if (p.armL) {
    p.armL.rotation.x = isDancing ? sin(t * 6.0) * 0.55  : -sin(t * freq) * amp * 0.7;
    p.armL.rotation.z = isDancing ? Math.PI * 0.28 - Math.abs(sin(t * 6.0)) * 0.55 : 0.10;
  }
  if (p.armR) {
    p.armR.rotation.x = isDancing ? -sin(t * 6.0) * 0.55 : sin(t * freq) * amp * 0.7;
    p.armR.rotation.z = isDancing ? -(Math.PI * 0.28 - Math.abs(sin(t * 6.0)) * 0.55) : -0.10;
  }

  const isIdle = !isWalk && !isRun && !isDancing;
  if (p.torsoGroup) {
    const baseY = entry._gender === "female" ? 0.86 : 0.84;
    p.torsoGroup.position.y = isIdle
      ? baseY + sin(t * 1.2) * 0.006
      : baseY + Math.abs(sin(t * freq)) * (isRun ? 0.022 : 0.012);
    if (isDancing) p.torsoGroup.rotation.y = sin(t * 3.0) * 0.18;
    else p.torsoGroup.rotation.y = 0;
  }
  if (p.headGroup) {
    p.headGroup.rotation.x = isIdle ? sin(t * 0.9) * 0.025 : sin(t * freq) * 0.030;
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
  model.rotation.y = Math.PI; // face forward (toward stage)
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
      if (p.armL) { p.armL.rotation.z = 0.50; p.armL.rotation.x = -0.18; }
      if (p.armR) { p.armR.rotation.z = -0.50; p.armR.rotation.x = -0.18; }
      if (p.legL) p.legL.rotation.x = 0.14;
      if (p.legR) p.legR.rotation.x = 0.14;
    }
    return;
  }

  animateCasual(entry, speed, isDancing, dt);
}