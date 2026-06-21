/**
 * AvatarModel — Procedural armored space trooper avatar.
 * Inspired by the Soldier.glb look: white/grey armor suit, helmet with visor,
 * shoulder plates, knee pads, belt pouches, T-pose arms.
 * Full armor — no exposed skin anywhere.
 * Supports colorOverrides: { armor, dark, accent, visor }
 */

import * as THREE from "three";
import { SPAWN } from "./cityData";

// ─── DEFAULT PALETTES ────────────────────────────────────────────────────────
const PRESETS = {
  streetwear: {
    armor:  0xdde0e8,  // white/light grey armor plating
    dark:   0x2a2d35,  // dark undersuit / joints
    accent: 0x3a7fff,  // blue stripe trim
    visor:  0x111820,  // dark visor
    sole:   0xff4400,  // orange boot sole accent
    pouch:  0x8b6914,  // tan belt pouches
  },
  cosmic: {
    armor:  0x1a0a40,  // deep purple armor
    dark:   0x080510,  // black undersuit
    accent: 0xb040ff,  // purple/magenta glow
    visor:  0x200040,  // dark purple visor
    sole:   0xb040ff,
    pouch:  0x3a1060,
  },
};

function buildPalette(base, overrides = {}) {
  const p = { ...base };
  const parse = (hex) => parseInt(hex.replace("#", ""), 16);
  if (overrides.armor)  p.armor  = parse(overrides.armor);
  if (overrides.dark)   p.dark   = parse(overrides.dark);
  if (overrides.accent) p.accent = parse(overrides.accent);
  if (overrides.visor)  p.visor  = parse(overrides.visor);
  return p;
}

// ─── MATERIAL HELPERS ────────────────────────────────────────────────────────
function stdMat(hex, rough = 0.45, metal = 0.25) {
  return new THREE.MeshStandardMaterial({ color: new THREE.Color(hex), roughness: rough, metalness: metal });
}
function glowMat(hex, opacity = 0.9) {
  return new THREE.MeshBasicMaterial({ color: new THREE.Color(hex), transparent: true, opacity, depthWrite: false });
}

// ─── NAME LABEL ──────────────────────────────────────────────────────────────
function makeNameSprite(name) {
  const nc = document.createElement("canvas");
  nc.width = 256; nc.height = 52;
  const ctx = nc.getContext("2d");
  ctx.font = "bold 17px 'Inter',sans-serif";
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.shadowColor = "rgba(0,0,0,0.85)"; ctx.shadowBlur = 5;
  ctx.fillStyle = "rgba(255,255,255,0.93)";
  ctx.fillText((name || "User").substring(0, 16), 128, 26);
  const tex = new THREE.CanvasTexture(nc);
  tex.minFilter = THREE.LinearFilter;
  tex.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, depthTest: false }));
  sprite.scale.set(1.4, 0.34, 1);
  sprite.renderOrder = 999;
  return sprite;
}

function makeShadow() {
  const shadow = new THREE.Mesh(
    new THREE.CircleGeometry(0.28, 14),
    new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.22, depthWrite: false }),
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.01;
  return shadow;
}

// ─── HELMET ──────────────────────────────────────────────────────────────────
function makeHelmet(pal) {
  const g = new THREE.Group();
  g.name = "helmet";

  const armorM = stdMat(pal.armor, 0.35, 0.3);
  const darkM  = stdMat(pal.dark,  0.6,  0.1);
  const visorM = glowMat(pal.visor, 0.92);
  const accentM = glowMat(pal.accent, 0.85);

  // Main dome
  const dome = new THREE.Mesh(new THREE.SphereGeometry(0.125, 16, 12), armorM);
  g.add(dome);

  // Visor cutout (flat ellipse on front)
  const visor = new THREE.Mesh(new THREE.SphereGeometry(0.10, 12, 8, -0.5, 1.0, 0.35, 0.85), visorM);
  visor.position.z = 0.055;
  g.add(visor);

  // Visor rim accent
  const vRim = new THREE.Mesh(new THREE.TorusGeometry(0.072, 0.007, 6, 20, Math.PI), accentM);
  vRim.position.set(0, 0.018, 0.09);
  vRim.rotation.x = -0.3;
  g.add(vRim);

  // Chin guard
  const chin = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.055, 0.09), armorM);
  chin.position.set(0, -0.085, 0.065);
  g.add(chin);

  // Back ridge
  const ridge = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.14, 0.06), armorM);
  ridge.position.set(0, 0.025, -0.12);
  g.add(ridge);

  // Side ear plates
  for (const sx of [0.115, -0.115]) {
    const ear = new THREE.Mesh(new THREE.BoxGeometry(0.028, 0.07, 0.065), armorM);
    ear.position.set(sx, -0.02, 0.01);
    g.add(ear);
  }

  // Stripe decal on top
  const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.022, 0.005, 0.18), accentM);
  stripe.position.set(0, 0.128, -0.01);
  g.add(stripe);

  return g;
}

// ─── BUILD FULL ARMOR BODY ────────────────────────────────────────────────────
/*
  HEIGHT LAYOUT (y=0 is ground):
    Boot sole:   y = 0
    Knee:        y = 0.48
    Hip:         y = 0.90
    Torso ctr:   y = 1.05
    Shoulder:    y = 1.28
    Neck top:    y = 1.44
    Head ctr:    y = 1.58
    Top of head: y ≈ 1.72

  T-POSE ARMS: arms extend horizontally outward (rotation.z = ±π/2)
*/
function buildAvatarBody(opts = {}) {
  const { avatarStyle = "streetwear", colorOverrides = {} } = opts;
  const basePal = PRESETS[avatarStyle === "cosmic" ? "cosmic" : "streetwear"];
  const pal = buildPalette(basePal, colorOverrides);

  const armorM  = stdMat(pal.armor,  0.35, 0.3);
  const darkM   = stdMat(pal.dark,   0.6,  0.1);
  const accentM = glowMat(pal.accent, 0.85);
  const pouchM  = stdMat(pal.pouch ?? 0x8b6914, 0.7, 0.0);

  const root = new THREE.Group();
  root.name = "avatar";

  // ── LEGS ──────────────────────────────────────────────────────────────────
  for (const { name, sx } of [{ name: "leftHip", sx: 0.11 }, { name: "rightHip", sx: -0.11 }]) {
    const hipG = new THREE.Group();
    hipG.name = name;
    hipG.position.set(sx, 0.90, 0);

    // Thigh armor
    const thigh = new THREE.Mesh(new THREE.CapsuleGeometry(0.075, 0.24, 4, 8), armorM);
    thigh.position.y = -0.20;
    thigh.castShadow = true;
    hipG.add(thigh);

    // Thigh side plate
    const tPlate = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.12, 0.055), stdMat(pal.dark, 0.5, 0.2));
    tPlate.position.set(sx > 0 ? 0.075 : -0.075, -0.18, 0);
    hipG.add(tPlate);

    // Knee pivot
    const kneeG = new THREE.Group();
    kneeG.name = name.replace("Hip", "Knee");
    kneeG.position.y = -0.44;

    // Knee pad
    const kpad = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.065, 0.065), stdMat(pal.dark, 0.5, 0.15));
    kpad.position.set(0, 0.015, 0.06);
    kneeG.add(kpad);

    // Shin armor
    const shin = new THREE.Mesh(new THREE.CapsuleGeometry(0.058, 0.20, 4, 8), armorM);
    shin.position.y = -0.14;
    shin.castShadow = true;
    kneeG.add(shin);

    // Foot group
    const footG = new THREE.Group();
    footG.name = name.replace("Hip", "Foot");
    footG.position.y = -0.30;

    // Boot
    const boot = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.08, 0.22), armorM);
    boot.position.set(0, -0.015, 0.025);
    boot.castShadow = true;
    footG.add(boot);

    // Boot toe
    const toe = new THREE.Mesh(new THREE.SphereGeometry(0.058, 8, 6, 0, Math.PI * 2, 0, Math.PI * 0.5), armorM);
    toe.scale.set(0.95, 0.52, 1.0);
    toe.position.set(0, -0.002, 0.118);
    footG.add(toe);

    // Boot sole accent
    const sole = new THREE.Mesh(new THREE.BoxGeometry(0.112, 0.010, 0.22), glowMat(pal.sole ?? pal.accent, 0.7));
    sole.position.set(0, -0.058, 0.025);
    footG.add(sole);

    kneeG.add(footG);
    hipG.add(kneeG);
    root.add(hipG);
  }

  // ── PELVIS / HIP ARMOR ────────────────────────────────────────────────────
  const pelvis = new THREE.Mesh(new THREE.CylinderGeometry(0.155, 0.145, 0.20, 10), armorM);
  pelvis.position.set(0, 0.88, 0);
  root.add(pelvis);

  // Belt with pouches
  const belt = new THREE.Mesh(new THREE.CylinderGeometry(0.162, 0.158, 0.038, 10), darkM);
  belt.position.set(0, 0.80, 0);
  root.add(belt);

  // Belt pouches (front)
  for (const bx of [0.09, -0.09, 0.0]) {
    const pouch = new THREE.Mesh(new THREE.BoxGeometry(0.058, 0.055, 0.048), pouchM);
    pouch.position.set(bx, 0.80, 0.155);
    root.add(pouch);
  }

  // ── TORSO ─────────────────────────────────────────────────────────────────
  const torsoG = new THREE.Group();
  torsoG.name = "torso";
  torsoG.position.y = 1.05;

  // Main chest armor — slightly wider than legs
  const chest = new THREE.Mesh(new THREE.CapsuleGeometry(0.155, 0.34, 4, 10), armorM);
  chest.castShadow = true;
  torsoG.add(chest);

  // Chest center plate
  const cPlate = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.20, 0.018), stdMat(pal.dark, 0.4, 0.3));
  cPlate.position.set(0, 0.04, 0.155);
  torsoG.add(cPlate);

  // Chest stripe / logo
  const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.016, 0.18, 0.012), accentM);
  stripe.position.set(0, 0.04, 0.168);
  torsoG.add(stripe);

  // Side armor ridges
  for (const sx of [0.16, -0.16]) {
    const ridge = new THREE.Mesh(new THREE.BoxGeometry(0.028, 0.22, 0.045), stdMat(pal.dark, 0.5, 0.2));
    ridge.position.set(sx, 0.02, 0.06);
    torsoG.add(ridge);
  }

  // Backpack / jetpack block
  const bpack = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.22, 0.055), stdMat(pal.dark, 0.5, 0.15));
  bpack.position.set(0, 0.04, -0.17);
  torsoG.add(bpack);

  // Collar / neck seal
  const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.072, 0.118, 0.08, 10), darkM);
  collar.position.y = 0.24;
  torsoG.add(collar);

  // ── ARMS — T-POSE (horizontal) ────────────────────────────────────────────
  for (const { name, sx } of [{ name: "leftShoulder", sx: 1 }, { name: "rightShoulder", sx: -1 }]) {
    const shG = new THREE.Group();
    shG.name = name;
    // Position at shoulder socket
    shG.position.set(sx * 0.175, 0.19, 0);
    // T-pose: arm extends straight out
    shG.rotation.z = sx > 0 ? Math.PI / 2 : -Math.PI / 2;

    // Shoulder pauldron (armor plate)
    const pauldron = new THREE.Mesh(new THREE.SphereGeometry(0.075, 10, 8, 0, Math.PI * 2, 0, Math.PI * 0.65), armorM);
    pauldron.scale.set(1.0, 0.75, 0.9);
    pauldron.position.y = -0.02;
    shG.add(pauldron);

    // Upper arm
    const uArm = new THREE.Mesh(new THREE.CapsuleGeometry(0.048, 0.16, 4, 6), armorM);
    uArm.position.y = -0.12;
    uArm.castShadow = true;
    shG.add(uArm);

    // Elbow pivot
    const elbG = new THREE.Group();
    elbG.name = name.replace("Shoulder", "Elbow");
    elbG.position.y = -0.24;

    // Elbow guard
    const eguard = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 6), stdMat(pal.dark, 0.4, 0.2));
    elbG.add(eguard);

    // Forearm armor
    const fArm = new THREE.Mesh(new THREE.CapsuleGeometry(0.040, 0.15, 4, 6), armorM);
    fArm.position.y = -0.10;
    fArm.castShadow = true;
    elbG.add(fArm);

    // Wrist plate
    const wrist = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.042, 0.038, 8), stdMat(pal.dark, 0.4, 0.3));
    wrist.position.y = -0.195;
    elbG.add(wrist);

    // Gauntlet / fist
    const handG = new THREE.Group();
    handG.name = name.replace("Shoulder", "Hand");
    handG.position.y = -0.23;

    const fist = new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.065, 0.058), armorM);
    handG.add(fist);

    // Knuckle ridges
    for (let ki = 0; ki < 3; ki++) {
      const kr = new THREE.Mesh(new THREE.BoxGeometry(0.016, 0.010, 0.060), stdMat(pal.dark, 0.4, 0.3));
      kr.position.set((ki - 1) * 0.022, 0.036, 0);
      handG.add(kr);
    }

    elbG.add(handG);
    shG.add(elbG);
    torsoG.add(shG);
  }

  root.add(torsoG);

  // ── NECK ──────────────────────────────────────────────────────────────────
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.062, 0.072, 0.16, 10), darkM);
  neck.position.set(0, 1.43, 0);
  root.add(neck);

  // ── HELMET ────────────────────────────────────────────────────────────────
  const headAnchor = new THREE.Group();
  headAnchor.name = "headAnchor";
  headAnchor.position.set(0, 1.56, 0);
  headAnchor.add(makeHelmet(pal));
  root.add(headAnchor);

  return root;
}

// ─── PUBLIC: createAvatar ────────────────────────────────────────────────────
export function createAvatar(scene, opts = {}) {
  const root = buildAvatarBody(opts);
  root.add(makeShadow());
  root.position.set(SPAWN[0], SPAWN[1], SPAWN[2]);
  scene.add(root);
  return root;
}

// ─── PUBLIC: createRemoteAvatar ──────────────────────────────────────────────
export function createRemoteAvatar(scene, userId, username, avatarType, skinTone, avatarStyle) {
  const root = buildAvatarBody({ avatarStyle });
  root.name = `remote_${userId}`;
  root.userData = { userId, walkTime: 0, speed: 0 };
  const nameSprite = makeNameSprite(username);
  nameSprite.position.y = 1.92;
  root.add(nameSprite);
  root.add(makeShadow());
  scene.add(root);
  return root;
}