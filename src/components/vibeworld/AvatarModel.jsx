/**
 * AvatarModel — Smooth Humanoid Avatar System
 *
 * Replaces the blocky geometry avatar with smooth, organic humanoid figures.
 * Uses CapsuleGeometry for limbs, SphereGeometry for head, and canvas-texture
 * face features for a modern stylized game avatar look.
 *
 * JOINT NAMES ARE PRESERVED — CityCanvas animation code is unchanged.
 */

import * as THREE from "three";
import { SPAWN } from "./cityData";

// ─── SKIN TONE PALETTE ─────────────────────────────────────────
const SKIN = {
  "light":        { base: "#FDEBD3", shadow: "#F0D5B0", lip: "#D4887A" },
  "medium-light": { base: "#F3C9A1", shadow: "#E0B080", lip: "#C87060" },
  "medium":       { base: "#C8864A", shadow: "#A86835", lip: "#A05040" },
  "medium-dark":  { base: "#9A6038", shadow: "#7A4820", lip: "#8A4535" },
  "dark":         { base: "#6B3A22", shadow: "#522C18", lip: "#6A3028" },
  "deep":         { base: "#3E2018", shadow: "#2E1610", lip: "#4A2020" },
};

// ─── BODY PROPORTIONS ─────────────────────────────────────────
// [torsoH, shoulderW, hipW, headR, neckH, upperArmL, foreArmL, thighL, shinL]
const BODY = {
  masculine:  [0.55, 0.24, 0.19, 0.115, 0.10, 0.22, 0.20, 0.26, 0.23],
  feminine:   [0.50, 0.20, 0.20, 0.108, 0.09, 0.20, 0.18, 0.25, 0.22],
  nonbinary:  [0.52, 0.22, 0.195, 0.112, 0.095, 0.21, 0.19, 0.255, 0.225],
  neutral:    [0.52, 0.22, 0.195, 0.112, 0.095, 0.21, 0.19, 0.255, 0.225],
};

// ─── OUTFIT COLORS ─────────────────────────────────────────────
const CLOTH = {
  masculine: { top: "#1C3D8A", pants: "#12121E", shoe: "#101018", accent: "#00E5FF" },
  feminine:  { top: "#5A1080", pants: "#12121E", shoe: "#101018", accent: "#E040FB" },
  nonbinary: { top: "#1A3A70", pants: "#12121E", shoe: "#101018", accent: "#A078FF" },
  neutral:   { top: "#1C3D8A", pants: "#12121E", shoe: "#101018", accent: "#00D4F0" },
};

// ─── HAIR COLORS ───────────────────────────────────────────────
const HAIR_COLOR = {
  masculine: "#1A0E08",
  feminine:  "#14080A",
  nonbinary: "#28180E",
  neutral:   "#1A0E08",
};

// ─── HELPER: create MeshStandardMaterial ──────────────────────
function mat(hex, rough = 0.55, metal = 0.05, opts = {}) {
  return new THREE.MeshStandardMaterial({
    color: new THREE.Color(hex),
    roughness: rough,
    metalness: metal,
    ...opts,
  });
}

// ─── HELPER: create MeshBasicMaterial ─────────────────────────
function bmat(hex, opts = {}) {
  return new THREE.MeshBasicMaterial({ color: new THREE.Color(hex), ...opts });
}

// ─── HELPER: add mesh to parent ───────────────────────────────
function addMesh(parent, geo, mat, px = 0, py = 0, pz = 0) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(px, py, pz);
  m.castShadow = true;
  m.receiveShadow = true;
  parent.add(m);
  return m;
}

// ─── CAPSULE GEOMETRY HELPER ──────────────────────────────────
// THREE.CapsuleGeometry(radius, length, capSegments, radialSegments)
// length = cylindrical length only (not including caps)
function capsule(radius, length, cap = 8, rad = 14) {
  if (THREE.CapsuleGeometry) {
    return new THREE.CapsuleGeometry(radius, length, cap, rad);
  }
  // Fallback for older three.js: use cylinder with sphere caps
  return new THREE.CylinderGeometry(radius, radius, length + radius * 2, rad);
}

// ─── FACE TEXTURE GENERATOR ───────────────────────────────────
// Paints a full human face onto a canvas and returns a texture
function makeFaceTexture(skinTone, type) {
  const S = SKIN[skinTone] || SKIN.medium;
  const size = 256;
  const c = document.createElement("canvas");
  c.width = size; c.height = size;
  const ctx = c.getContext("2d");

  // Base skin fill
  ctx.fillStyle = S.base;
  ctx.fillRect(0, 0, size, size);

  // Subtle jaw shadow gradient
  const jawGrad = ctx.createLinearGradient(0, size * 0.45, 0, size);
  jawGrad.addColorStop(0, "transparent");
  jawGrad.addColorStop(1, S.shadow + "AA");
  ctx.fillStyle = jawGrad;
  ctx.fillRect(0, 0, size, size);

  // Forehead slightly lighter
  const foreGrad = ctx.createLinearGradient(0, 0, 0, size * 0.3);
  foreGrad.addColorStop(0, "rgba(255,255,255,0.12)");
  foreGrad.addColorStop(1, "transparent");
  ctx.fillStyle = foreGrad;
  ctx.fillRect(0, 0, size, size);

  // Cheekbone warmth
  const blush = (type === "feminine") ? "rgba(220,120,120,0.18)" : "rgba(200,130,100,0.10)";
  ctx.fillStyle = blush;
  ctx.beginPath(); ctx.ellipse(size * 0.28, size * 0.56, size * 0.14, size * 0.08, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(size * 0.72, size * 0.56, size * 0.14, size * 0.08, 0, 0, Math.PI * 2); ctx.fill();

  // ── EYES ──────────────────────────────────────────────────
  const eyeY = size * 0.43;
  const eyeXL = size * 0.35;
  const eyeXR = size * 0.65;
  const eyeW = size * 0.12;
  const eyeH = size * 0.085;

  [[eyeXL, eyeY], [eyeXR, eyeY]].forEach(([ex, ey]) => {
    // Eye white
    ctx.fillStyle = "#F5F0EA";
    ctx.beginPath(); ctx.ellipse(ex, ey, eyeW, eyeH, 0, 0, Math.PI * 2); ctx.fill();

    // Iris
    ctx.fillStyle = type === "feminine" ? "#4A7090" : "#385A48";
    ctx.beginPath(); ctx.ellipse(ex, ey, eyeW * 0.6, eyeH * 0.8, 0, 0, Math.PI * 2); ctx.fill();

    // Pupil
    ctx.fillStyle = "#0A0808";
    ctx.beginPath(); ctx.ellipse(ex, ey, eyeW * 0.3, eyeH * 0.45, 0, 0, Math.PI * 2); ctx.fill();

    // Eye highlight
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    ctx.beginPath(); ctx.ellipse(ex - eyeW * 0.15, ey - eyeH * 0.25, eyeW * 0.1, eyeH * 0.12, 0, 0, Math.PI * 2); ctx.fill();

    // Upper eyelid line
    ctx.strokeStyle = "#2A1810";
    ctx.lineWidth = type === "feminine" ? 3.5 : 2.5;
    ctx.beginPath();
    ctx.moveTo(ex - eyeW, ey + eyeH * 0.1);
    ctx.quadraticCurveTo(ex, ey - eyeH * 1.1, ex + eyeW, ey + eyeH * 0.1);
    ctx.stroke();

    // Lower lash line (softer)
    ctx.strokeStyle = S.shadow;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(ex - eyeW * 0.9, ey + eyeH * 0.2);
    ctx.quadraticCurveTo(ex, ey + eyeH * 1.0, ex + eyeW * 0.9, ey + eyeH * 0.2);
    ctx.stroke();
  });

  // ── EYEBROWS ──────────────────────────────────────────────
  const browY = eyeY - eyeH * 2.0;
  [[eyeXL, -0.10], [eyeXR, 0.10]].forEach(([bx, tilt]) => {
    ctx.strokeStyle = HAIR_COLOR[type] || "#1A0E08";
    ctx.lineWidth = type === "feminine" ? 3 : 4;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(bx - eyeW * 1.1, browY + size * tilt * 0.08);
    ctx.quadraticCurveTo(bx, browY - size * 0.012, bx + eyeW * 1.1, browY + size * tilt * 0.08);
    ctx.stroke();
  });

  // ── NOSE ──────────────────────────────────────────────────
  const noseX = size * 0.5;
  const noseY = size * 0.59;
  const noseW = size * 0.055;

  // Nose bridge shadow
  ctx.strokeStyle = S.shadow + "88";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(noseX, size * 0.47);
  ctx.lineTo(noseX, noseY - size * 0.02);
  ctx.stroke();

  // Nostrils
  ctx.fillStyle = S.shadow + "CC";
  ctx.beginPath(); ctx.ellipse(noseX - noseW * 0.7, noseY, noseW * 0.6, noseW * 0.4, Math.PI * 0.15, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(noseX + noseW * 0.7, noseY, noseW * 0.6, noseW * 0.4, -Math.PI * 0.15, 0, Math.PI * 2); ctx.fill();

  // Nose tip
  ctx.fillStyle = S.shadow + "55";
  ctx.beginPath(); ctx.ellipse(noseX, noseY - size * 0.01, noseW * 0.9, noseW * 0.55, 0, 0, Math.PI * 2); ctx.fill();

  // ── MOUTH ─────────────────────────────────────────────────
  const mouthX = size * 0.5;
  const mouthY = size * 0.725;
  const mouthW = size * (type === "feminine" ? 0.11 : 0.13);

  // Lip split line
  ctx.strokeStyle = S.shadow;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(mouthX - mouthW, mouthY);
  ctx.quadraticCurveTo(mouthX, mouthY + size * 0.008, mouthX + mouthW, mouthY);
  ctx.stroke();

  // Upper lip
  ctx.fillStyle = S.lip;
  ctx.beginPath();
  ctx.moveTo(mouthX - mouthW, mouthY);
  ctx.quadraticCurveTo(mouthX - mouthW * 0.4, mouthY - size * 0.03, mouthX, mouthY - size * 0.012);
  ctx.quadraticCurveTo(mouthX + mouthW * 0.4, mouthY - size * 0.03, mouthX + mouthW, mouthY);
  ctx.quadraticCurveTo(mouthX, mouthY + size * 0.008, mouthX - mouthW, mouthY);
  ctx.fill();

  // Lower lip (fuller)
  ctx.fillStyle = new THREE.Color(S.lip).multiplyScalar(1.12).getStyle();
  ctx.beginPath();
  ctx.moveTo(mouthX - mouthW, mouthY);
  ctx.quadraticCurveTo(mouthX, mouthY + size * 0.038, mouthX + mouthW, mouthY);
  ctx.quadraticCurveTo(mouthX, mouthY + size * 0.012, mouthX - mouthW, mouthY);
  ctx.fill();

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  return tex;
}

// ─── HAIR BUILDER ─────────────────────────────────────────────
function buildHair(parent, type, headR) {
  const hc = HAIR_COLOR[type] || HAIR_COLOR.neutral;
  const hm = mat(hc, 0.75, 0.0);
  const hm2 = mat(hc, 0.7, 0.0);
  const S = headR;

  if (type === "masculine" || type === "neutral") {
    // Low fade — tight to skull, more volume on top
    const topDome = new THREE.Mesh(
      new THREE.SphereGeometry(S * 1.01, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.55),
      hm
    );
    topDome.position.set(0, 0, 0);
    parent.add(topDome);

    // Front hairline ridge
    const frontRidge = new THREE.Mesh(
      new THREE.SphereGeometry(S * 0.72, 12, 8),
      hm2
    );
    frontRidge.position.set(0, S * 0.25, S * 0.62);
    frontRidge.scale.set(0.85, 0.35, 0.45);
    parent.add(frontRidge);

    // Crown volume
    const crown = new THREE.Mesh(
      new THREE.SphereGeometry(S * 0.68, 10, 8),
      hm
    );
    crown.position.set(0, S * 0.58, S * 0.1);
    crown.scale.set(0.82, 0.48, 0.72);
    parent.add(crown);

    // Sides (tight fade — very slim)
    [-1, 1].forEach(s => {
      const side = new THREE.Mesh(new THREE.SphereGeometry(S * 0.52, 10, 8), hm);
      side.position.set(s * S * 0.88, S * 0.05, 0);
      side.scale.set(0.28, 0.55, 0.65);
      parent.add(side);
    });

    // Back nape
    const nape = new THREE.Mesh(new THREE.SphereGeometry(S * 0.65, 10, 8), hm);
    nape.position.set(0, S * 0.12, -S * 0.72);
    nape.scale.set(0.82, 0.50, 0.38);
    parent.add(nape);

  } else if (type === "feminine") {
    // Shoulder-length, soft waves, side volume
    const cap = new THREE.Mesh(
      new THREE.SphereGeometry(S * 1.04, 16, 12),
      hm
    );
    cap.scale.set(1.0, 0.58, 1.02);
    cap.position.set(0, S * 0.18, 0);
    parent.add(cap);

    // Bangs — forward fringe
    const bangs = new THREE.Mesh(new THREE.SphereGeometry(S * 0.65, 12, 8), hm);
    bangs.position.set(0, S * 0.55, S * 0.52);
    bangs.scale.set(0.88, 0.32, 0.52);
    parent.add(bangs);

    // Side volumes (past shoulders)
    [-1, 1].forEach(s => {
      const sideTop = new THREE.Mesh(new THREE.SphereGeometry(S * 0.62, 10, 8), hm);
      sideTop.position.set(s * S * 0.8, S * 0.1, S * 0.0);
      sideTop.scale.set(0.38, 0.95, 0.72);
      parent.add(sideTop);

      const sideLow = new THREE.Mesh(new THREE.SphereGeometry(S * 0.48, 10, 8), hm);
      sideLow.position.set(s * S * 0.7, -S * 0.85, S * -0.15);
      sideLow.scale.set(0.42, 0.75, 0.55);
      parent.add(sideLow);
    });

    // Back length
    const back1 = new THREE.Mesh(new THREE.SphereGeometry(S * 0.75, 12, 10), hm);
    back1.position.set(0, -S * 0.2, -S * 0.68);
    back1.scale.set(0.92, 1.05, 0.45);
    parent.add(back1);

    const back2 = new THREE.Mesh(new THREE.SphereGeometry(S * 0.6, 10, 8), hm);
    back2.position.set(0, -S * 0.95, -S * 0.58);
    back2.scale.set(0.78, 0.8, 0.42);
    parent.add(back2);

  } else {
    // Non-binary — natural medium textured
    const cap = new THREE.Mesh(
      new THREE.SphereGeometry(S * 1.02, 14, 11),
      hm
    );
    cap.scale.set(1.0, 0.55, 1.0);
    cap.position.set(0, S * 0.14, 0);
    parent.add(cap);

    // Front swoop
    const front = new THREE.Mesh(new THREE.SphereGeometry(S * 0.60, 10, 8), hm);
    front.position.set(S * -0.18, S * 0.48, S * 0.55);
    front.scale.set(0.9, 0.35, 0.52);
    parent.add(front);

    [-1, 1].forEach(s => {
      const side = new THREE.Mesh(new THREE.SphereGeometry(S * 0.56, 10, 8), hm);
      side.position.set(s * S * 0.78, S * 0.05, S * 0.0);
      side.scale.set(0.36, 0.78, 0.68);
      parent.add(side);
    });

    const back = new THREE.Mesh(new THREE.SphereGeometry(S * 0.68, 10, 8), hm);
    back.position.set(0, -S * 0.08, -S * 0.68);
    back.scale.set(0.88, 0.68, 0.42);
    parent.add(back);
  }
}

// ─── HEAD BUILDER ─────────────────────────────────────────────
function buildHead(parent, skinTone, type) {
  const S = SKIN[skinTone] || SKIN.medium;
  const headR = 0.115;

  // Head group
  const headGroup = new THREE.Group();
  headGroup.name = "headGroup";

  // ── Skull / cranium ───────────────────────────────────────
  // Front face sphere (forward-projected)
  const skull = new THREE.Mesh(
    new THREE.SphereGeometry(headR, 20, 18),
    mat(S.base, 0.55, 0.0)
  );
  skull.scale.set(0.88, 1.0, 0.84);
  skull.castShadow = true;
  headGroup.add(skull);

  // Jaw — slightly wider, lower
  const jaw = new THREE.Mesh(
    new THREE.SphereGeometry(headR * 0.78, 16, 14),
    mat(S.shadow, 0.60, 0.0)
  );
  jaw.position.set(0, -headR * 0.55, headR * 0.06);
  jaw.scale.set(0.78, 0.44, 0.74);
  jaw.castShadow = true;
  headGroup.add(jaw);

  // Cheekbones
  [-1, 1].forEach(s => {
    const cheek = new THREE.Mesh(
      new THREE.SphereGeometry(headR * 0.40, 10, 8),
      mat(S.base, 0.55, 0.0)
    );
    cheek.position.set(s * headR * 0.64, -headR * 0.1, headR * 0.38);
    cheek.scale.set(0.6, 0.5, 0.45);
    headGroup.add(cheek);
  });

  // Ears
  [-1, 1].forEach(s => {
    const ear = new THREE.Mesh(
      new THREE.SphereGeometry(headR * 0.22, 8, 7),
      mat(S.shadow, 0.60, 0.0)
    );
    ear.position.set(s * headR * 0.92, -headR * 0.05, 0);
    ear.scale.set(0.30, 0.55, 0.38);
    ear.castShadow = true;
    headGroup.add(ear);
  });

  // ── Face texture sphere (forward-facing) ──────────────────
  // A slightly smaller sphere layered over the front of the skull
  // with the face texture painted on it
  const faceTex = makeFaceTexture(skinTone, type);
  const faceSphere = new THREE.Mesh(
    new THREE.SphereGeometry(headR * 0.95, 18, 16),
    new THREE.MeshBasicMaterial({
      map: faceTex,
      transparent: false,
      depthWrite: true,
    })
  );
  // Offset slightly forward so it always shows over skull
  faceSphere.position.set(0, 0, headR * 0.06);
  faceSphere.scale.set(0.80, 0.92, 0.55);
  faceSphere.renderOrder = 1;
  headGroup.add(faceSphere);

  // ── HAIR ──────────────────────────────────────────────────
  const hairGroup = new THREE.Group();
  hairGroup.name = "hair";
  hairGroup.position.set(0, headR * 0.06, 0);
  buildHair(hairGroup, type, headR);
  headGroup.add(hairGroup);

  // ── Nose bump (3D protrusion) ──────────────────────────────
  const noseTip = new THREE.Mesh(
    new THREE.SphereGeometry(headR * 0.12, 8, 7),
    mat(S.shadow, 0.62, 0.0)
  );
  noseTip.position.set(0, -headR * 0.07, headR * 0.82);
  noseTip.scale.set(0.70, 0.55, 0.52);
  headGroup.add(noseTip);

  parent.add(headGroup);
  return headGroup;
}

// ─── SHOE BUILDER ─────────────────────────────────────────────
function buildShoe(shoeHex, accentHex) {
  const g = new THREE.Group();
  const sm2 = mat(shoeHex, 0.55, 0.06);
  const sole = mat("#0C0C18", 0.65, 0.04);
  const accentMat = mat(accentHex, 0.40, 0.05);

  // Shoe body (slightly rounded box)
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.090, 0.045, 0.165), sm2);
  body.position.set(0, 0.022, 0.028);
  body.castShadow = true;
  g.add(body);

  // Toe cap round
  const toe = new THREE.Mesh(new THREE.SphereGeometry(0.032, 9, 7), sm2);
  toe.position.set(0, 0.022, 0.125);
  toe.scale.set(0.82, 0.55, 0.48);
  toe.castShadow = true;
  g.add(toe);

  // Sole
  const soleM = new THREE.Mesh(new THREE.BoxGeometry(0.095, 0.016, 0.170), sole);
  soleM.position.set(0, -0.006, 0.028);
  g.add(soleM);

  // Heel block
  const heel = new THREE.Mesh(new THREE.BoxGeometry(0.088, 0.022, 0.050), sole);
  heel.position.set(0, 0.002, -0.038);
  g.add(heel);

  // Neon accent stripe on toe
  const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.088, 0.008, 0.028), accentMat);
  stripe.position.set(0, 0.040, 0.068);
  g.add(stripe);

  return g;
}

// ─── HAND BUILDER ─────────────────────────────────────────────
function buildHand(skinHex) {
  const g = new THREE.Group();
  const sm2 = mat(skinHex, 0.52, 0.0);

  // Palm
  const palm = new THREE.Mesh(new THREE.BoxGeometry(0.052, 0.028, 0.058), sm2);
  palm.position.set(0, 0, 0);
  palm.castShadow = true;
  g.add(palm);

  // Fingers (4 capsule stubs)
  for (let f = 0; f < 4; f++) {
    const fx = (f - 1.5) * 0.013;
    const fLen = f === 0 || f === 3 ? 0.030 : 0.036;
    const finger = new THREE.Mesh(
      capsule(0.0048, fLen * 0.55, 4, 6),
      sm2
    );
    finger.position.set(fx, 0, 0.030 + fLen / 2);
    g.add(finger);
  }

  // Thumb
  const thumb = new THREE.Mesh(capsule(0.0055, 0.018, 4, 6), sm2);
  thumb.position.set(0.030, 0.005, 0.010);
  thumb.rotation.z = -0.55;
  thumb.rotation.y = -0.4;
  g.add(thumb);

  return g;
}

// ═══════════════════════════════════════════════════════════════
// createAvatar — LOCAL PLAYER
// Builds a smooth humanoid avatar. Joint names MUST match what
// CityCanvas animation code expects.
// ═══════════════════════════════════════════════════════════════
export function createAvatar(scene, opts = {}) {
  const type   = opts.avatarType || "neutral";
  const tone   = opts.skinTone   || "medium";
  const S      = SKIN[tone]      || SKIN.medium;
  const B      = BODY[type]      || BODY.neutral;
  const C      = CLOTH[type]     || CLOTH.neutral;

  const [torsoH, shoulderW, hipW, headR, neckH, uAL, fAL, thighL, shinL] = B;

  const avatar = new THREE.Group();
  avatar.name = "avatar";

  // ─── TORSO ─────────────────────────────────────────────────
  const torso = new THREE.Group();
  torso.name = "torso";
  avatar.add(torso);

  // Torso body — tapered capsule-like, shoulder wider than hip
  const torsoGeo = new THREE.CylinderGeometry(shoulderW * 0.88, hipW * 0.82, torsoH, 16);
  const torsoMesh = new THREE.Mesh(torsoGeo, mat(C.top, 0.55, 0.08));
  torsoMesh.position.set(0, torsoH * 0.5, 0);
  torsoMesh.castShadow = true;
  torso.add(torsoMesh);

  // Chest plate slight protrusion
  const chestMesh = new THREE.Mesh(
    new THREE.SphereGeometry(shoulderW * 0.78, 14, 10),
    mat(C.top, 0.52, 0.1)
  );
  chestMesh.position.set(0, torsoH * 0.72, 0.01);
  chestMesh.scale.set(1.0, 0.64, 0.62);
  chestMesh.castShadow = true;
  torso.add(chestMesh);

  // Neon accent line on chest
  const accentLine = new THREE.Mesh(
    new THREE.BoxGeometry(0.012, torsoH * 0.42, 0.012),
    bmat(C.accent, { transparent: true, opacity: 0.75, depthWrite: false })
  );
  accentLine.position.set(0, torsoH * 0.52, shoulderW * 0.82);
  torso.add(accentLine);

  // Belt
  const belt = new THREE.Mesh(
    new THREE.CylinderGeometry(hipW * 0.85, hipW * 0.85, 0.038, 16),
    mat("#222230", 0.45, 0.25)
  );
  belt.position.set(0, torsoH * 0.08, 0);
  torso.add(belt);

  const beltBuckle = new THREE.Mesh(
    new THREE.BoxGeometry(0.050, 0.042, 0.016),
    mat("#C8A844", 0.30, 0.55)
  );
  beltBuckle.position.set(0, torsoH * 0.08, hipW * 0.84);
  torso.add(beltBuckle);

  // ─── SHADOW BLOB ────────────────────────────────────────────
  const shadowBlob = new THREE.Mesh(
    new THREE.CircleGeometry(0.22, 14),
    new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0.20,
      depthWrite: false,
    })
  );
  shadowBlob.rotation.x = -Math.PI / 2;
  shadowBlob.position.set(0, -(thighL + shinL + 0.04), 0);
  torso.add(shadowBlob);

  // ─── NECK ──────────────────────────────────────────────────
  const neckGroup = new THREE.Group();
  neckGroup.name = "neck";
  neckGroup.position.set(0, torsoH + 0.005, 0);
  torso.add(neckGroup);

  const neckMesh = new THREE.Mesh(
    capsule(0.036, neckH * 0.5, 6, 10),
    mat(S.base, 0.52, 0.0)
  );
  neckMesh.position.set(0, neckH * 0.55, 0);
  neckMesh.castShadow = true;
  neckGroup.add(neckMesh);

  // ─── HEAD ──────────────────────────────────────────────────
  const headPivot = new THREE.Group();
  headPivot.name = "head";
  headPivot.position.set(0, neckH * 1.1, 0);
  buildHead(headPivot, tone, type);
  neckGroup.add(headPivot);

  // ─── SHOULDER CAPS ─────────────────────────────────────────
  [-1, 1].forEach(s => {
    const cap = new THREE.Mesh(
      new THREE.SphereGeometry(shoulderW * 0.44, 12, 10),
      mat(C.top, 0.50, 0.10)
    );
    cap.position.set(s * (shoulderW + 0.015), torsoH * 0.82, 0);
    cap.scale.set(1.0, 0.78, 0.88);
    cap.castShadow = true;
    torso.add(cap);
  });

  // ─── ARMS ──────────────────────────────────────────────────
  [-1, 1].forEach(s => {
    const side = s > 0 ? "right" : "left";

    const shoulderPivot = new THREE.Group();
    shoulderPivot.name = side + "Shoulder";
    shoulderPivot.position.set(s * (shoulderW + 0.028), torsoH * 0.82, 0);
    torso.add(shoulderPivot);

    // Upper arm — smooth capsule (sleeved)
    const upperArm = new THREE.Mesh(
      capsule(0.030, uAL * 0.65, 6, 10),
      mat(C.top, 0.55, 0.06)
    );
    upperArm.position.set(0, -uAL * 0.5, 0);
    upperArm.castShadow = true;
    shoulderPivot.add(upperArm);

    // Elbow pivot
    const elbowPivot = new THREE.Group();
    elbowPivot.name = side + "Elbow";
    elbowPivot.position.set(0, -uAL, 0);
    shoulderPivot.add(elbowPivot);

    // Elbow bump
    const elbowBump = new THREE.Mesh(
      new THREE.SphereGeometry(0.028, 8, 7),
      mat(S.shadow, 0.60, 0.0)
    );
    elbowBump.scale.set(1.0, 0.82, 0.88);
    elbowBump.castShadow = true;
    elbowPivot.add(elbowBump);

    // Forearm — skin exposed below sleeve
    const forearm = new THREE.Mesh(
      capsule(0.026, fAL * 0.60, 6, 10),
      mat(S.base, 0.50, 0.0)
    );
    forearm.name = side + "Forearm";
    forearm.position.set(0, -fAL * 0.5, 0);
    forearm.castShadow = true;
    elbowPivot.add(forearm);

    // Wrist pivot
    const wristPivot = new THREE.Group();
    wristPivot.name = side + "Wrist";
    wristPivot.position.set(0, -fAL, 0);
    elbowPivot.add(wristPivot);

    const handG = buildHand(S.base);
    handG.name = side + "Hand";
    wristPivot.add(handG);

    // Store refs for CityCanvas animation system
    // CityCanvas accesses: leftShoulder.userData.arm.userData.forearm → elbow pivot
    //                       elbowPivot.userData.hand → hand group
    shoulderPivot.userData.arm = { userData: { forearm: elbowPivot } };
    elbowPivot.userData.forearm = elbowPivot;
    elbowPivot.userData.hand = handG;
  });

  // ─── HIPS / LEGS ───────────────────────────────────────────
  [-1, 1].forEach(s => {
    const side = s > 0 ? "right" : "left";

    const hipPivot = new THREE.Group();
    hipPivot.name = side + "Hip";
    hipPivot.position.set(s * hipW * 0.56, thighL, -0.010);
    torso.add(hipPivot);

    // Thigh — wide capsule
    const thigh = new THREE.Mesh(
      capsule(0.048, thighL * 0.65, 6, 12),
      mat(C.pants, 0.60, 0.04)
    );
    thigh.position.set(0, -thighL * 0.5, 0);
    thigh.castShadow = true;
    hipPivot.add(thigh);

    // Knee pivot
    const kneePivot = new THREE.Group();
    kneePivot.name = side + "Knee";
    kneePivot.position.set(0, -thighL, 0);
    hipPivot.add(kneePivot);

    // Knee bump
    const kneeBump = new THREE.Mesh(
      new THREE.SphereGeometry(0.042, 10, 8),
      mat(C.pants, 0.58, 0.04)
    );
    kneeBump.position.set(0, 0, 0.008);
    kneeBump.scale.set(1.0, 0.86, 0.82);
    kneeBump.castShadow = true;
    kneePivot.add(kneeBump);

    // Shin — tapered capsule
    const shin = new THREE.Mesh(
      capsule(0.038, shinL * 0.62, 6, 10),
      mat(C.pants, 0.60, 0.04)
    );
    shin.position.set(0, -shinL * 0.5, 0);
    shin.castShadow = true;
    kneePivot.add(shin);

    // Ankle pivot
    const anklePivot = new THREE.Group();
    anklePivot.name = side + "Ankle";
    anklePivot.position.set(0, -shinL, 0.010);
    kneePivot.add(anklePivot);

    const shoeG = buildShoe(C.shoe, C.accent);
    shoeG.name = side + "Shoe";
    anklePivot.add(shoeG);

    // Store refs for CityCanvas animation system
    // CityCanvas accesses: leftHip.userData.leg.userData.lowerLeg → kneePivot
    //                       kneePivot.userData.foot → anklePivot
    kneePivot.userData.foot = anklePivot;
    hipPivot.userData.leg = { userData: { lowerLeg: kneePivot } };
    hipPivot.userData.lowerLeg = kneePivot;
  });

  avatar.position.set(SPAWN[0], SPAWN[1], SPAWN[2]);
  scene.add(avatar);
  return avatar;
}

// ═══════════════════════════════════════════════════════════════
// createRemoteAvatar — OTHER PLAYERS
// Lightweight version — same proportions, fewer details for perf
// ═══════════════════════════════════════════════════════════════
export function createRemoteAvatar(scene, userId, username, avatarType, skinTone) {
  const type = avatarType || "neutral";
  const tone = skinTone   || "medium";
  const S    = SKIN[tone] || SKIN.medium;
  const B    = BODY[type] || BODY.neutral;
  const C    = CLOTH[type]|| CLOTH.neutral;
  const hc   = HAIR_COLOR[type] || HAIR_COLOR.neutral;

  const [torsoH, shoulderW, hipW, headR, neckH, uAL, fAL, thighL, shinL] = B;

  const group = new THREE.Group();
  group.name  = `remote_${userId}`;
  group.userData = { userId, walkTime: 0, speed: 0 };

  const skinMat  = mat(S.base,  0.52, 0.0);
  const topMat   = mat(C.top,   0.55, 0.08);
  const pantsMat = mat(C.pants, 0.60, 0.04);
  const hairMat  = mat(hc,      0.75, 0.0);

  // ─── TORSO ────────────────────────────────────────────────
  const torsoM = new THREE.Mesh(
    new THREE.CylinderGeometry(shoulderW * 0.86, hipW * 0.80, torsoH, 12),
    topMat
  );
  torsoM.position.set(0, torsoH * 0.5, 0);
  torsoM.castShadow = true;
  group.add(torsoM);

  // Chest protrusion
  const chestM = new THREE.Mesh(
    new THREE.SphereGeometry(shoulderW * 0.75, 10, 8),
    topMat
  );
  chestM.position.set(0, torsoH * 0.72, 0.01);
  chestM.scale.set(1.0, 0.62, 0.60);
  group.add(chestM);

  // ─── NECK ─────────────────────────────────────────────────
  const neckM = new THREE.Mesh(
    capsule(0.034, neckH * 0.5, 5, 8),
    skinMat
  );
  neckM.position.set(0, torsoH + neckH * 0.55, 0);
  neckM.castShadow = true;
  group.add(neckM);

  // ─── HEAD ─────────────────────────────────────────────────
  const headY = torsoH + neckH * 1.1;

  // Skull
  const headM = new THREE.Mesh(
    new THREE.SphereGeometry(headR, 14, 12),
    skinMat
  );
  headM.position.set(0, headY, 0);
  headM.scale.set(0.88, 1.0, 0.84);
  headM.castShadow = true;
  group.add(headM);

  // Jaw
  const jawM = new THREE.Mesh(
    new THREE.SphereGeometry(headR * 0.76, 12, 10),
    mat(S.shadow, 0.60, 0.0)
  );
  jawM.position.set(0, headY - headR * 0.55, headR * 0.06);
  jawM.scale.set(0.76, 0.44, 0.72);
  group.add(jawM);

  // Eyes (simple spheres — avoid canvas texture cost for remote)
  [-1, 1].forEach(s => {
    const eyeW2 = new THREE.Mesh(
      new THREE.SphereGeometry(headR * 0.14, 7, 6),
      bmat("#E8E4DC")
    );
    eyeW2.position.set(s * headR * 0.35, headY + headR * 0.14, headR * 0.76);
    eyeW2.scale.set(0.58, 0.65, 0.30);
    group.add(eyeW2);

    const pupil = new THREE.Mesh(
      new THREE.SphereGeometry(headR * 0.075, 6, 5),
      bmat("#080808")
    );
    pupil.position.set(s * headR * 0.35, headY + headR * 0.14, headR * 0.80);
    pupil.scale.set(0.58, 0.65, 0.28);
    group.add(pupil);

    // Brow
    const brow = new THREE.Mesh(
      new THREE.BoxGeometry(headR * 0.26, headR * 0.055, headR * 0.055),
      bmat(hc)
    );
    brow.position.set(s * headR * 0.35, headY + headR * 0.38, headR * 0.72);
    brow.rotation.z = s * 0.08;
    group.add(brow);
  });

  // Hair (simplified cap)
  const hairCap = new THREE.Mesh(
    new THREE.SphereGeometry(headR * 1.02, 12, 10, 0, Math.PI * 2, 0, Math.PI * 0.55),
    hairMat
  );
  hairCap.position.set(0, headY + headR * 0.1, 0);
  group.add(hairCap);

  if (type !== "masculine" && type !== "neutral") {
    // Side volume for feminine/non-binary
    [-1, 1].forEach(s => {
      const sv = new THREE.Mesh(
        new THREE.SphereGeometry(headR * 0.55, 8, 7),
        hairMat
      );
      sv.position.set(s * headR * 0.78, headY + headR * 0.04, 0);
      sv.scale.set(0.38, 0.90, 0.68);
      group.add(sv);
    });
  }

  // Nose bump
  const noseM = new THREE.Mesh(
    new THREE.SphereGeometry(headR * 0.10, 6, 5),
    mat(S.shadow, 0.62, 0.0)
  );
  noseM.position.set(0, headY - headR * 0.06, headR * 0.82);
  noseM.scale.set(0.68, 0.52, 0.50);
  group.add(noseM);

  // ─── SHOULDER CAPS ────────────────────────────────────────
  [-1, 1].forEach(s => {
    const cap = new THREE.Mesh(
      new THREE.SphereGeometry(shoulderW * 0.42, 10, 8),
      topMat
    );
    cap.position.set(s * (shoulderW + 0.012), torsoH * 0.82, 0);
    cap.scale.set(1.0, 0.76, 0.86);
    group.add(cap);
  });

  // ─── ARMS ─────────────────────────────────────────────────
  [-1, 1].forEach(s => {
    const side = s > 0 ? "right" : "left";

    const sPivot = new THREE.Group();
    sPivot.name = side + "Shoulder";
    sPivot.position.set(s * (shoulderW + 0.025), torsoH * 0.80, 0);
    group.add(sPivot);

    // Upper arm
    const uArm = new THREE.Mesh(
      capsule(0.028, uAL * 0.60, 5, 8),
      skinMat
    );
    uArm.position.set(0, -uAL * 0.5, 0);
    uArm.castShadow = true;
    sPivot.add(uArm);

    // Elbow pivot
    const ePivot = new THREE.Group();
    ePivot.name = side + "Elbow";
    ePivot.position.set(0, -uAL, 0);
    sPivot.add(ePivot);

    // Forearm
    const fArm = new THREE.Mesh(
      capsule(0.024, fAL * 0.58, 5, 8),
      skinMat
    );
    fArm.position.set(0, -fAL * 0.5, 0);
    fArm.castShadow = true;
    ePivot.add(fArm);

    // Wrist + simple hand
    const wPivot = new THREE.Group();
    wPivot.name = side + "Wrist";
    wPivot.position.set(0, -fAL, 0);
    ePivot.add(wPivot);

    const handM = new THREE.Mesh(
      new THREE.BoxGeometry(0.048, 0.026, 0.054),
      skinMat
    );
    handM.position.set(0, -0.012, 0);
    handM.castShadow = true;
    wPivot.add(handM);

    sPivot.userData.elbowPivot = ePivot;
    sPivot.userData.wristPivot = wPivot;
  });

  // ─── LEGS ─────────────────────────────────────────────────
  [-1, 1].forEach(s => {
    const side = s > 0 ? "right" : "left";

    const hPivot = new THREE.Group();
    hPivot.name = side + "Hip";
    hPivot.position.set(s * hipW * 0.54, thighL, -0.010);
    group.add(hPivot);

    const thighM = new THREE.Mesh(
      capsule(0.046, thighL * 0.62, 5, 10),
      pantsMat
    );
    thighM.position.set(0, -thighL * 0.5, 0);
    thighM.castShadow = true;
    hPivot.add(thighM);

    const kPivot = new THREE.Group();
    kPivot.name = side + "Knee";
    kPivot.position.set(0, -thighL, 0);
    hPivot.add(kPivot);

    const shinM = new THREE.Mesh(
      capsule(0.036, shinL * 0.60, 5, 8),
      pantsMat
    );
    shinM.position.set(0, -shinL * 0.5, 0);
    shinM.castShadow = true;
    kPivot.add(shinM);

    const aPivot = new THREE.Group();
    aPivot.name = side + "Ankle";
    aPivot.position.set(0, -shinL, 0.010);
    kPivot.add(aPivot);

    const shoeG = buildShoe(C.shoe, C.accent);
    aPivot.add(shoeG);

    hPivot.userData.kneePivot = kPivot;
    hPivot.userData.anklePivot = aPivot;
    kPivot.userData.anklePivot = aPivot;
  });

  // ─── NAME LABEL ────────────────────────────────────────────
  const nc = document.createElement("canvas");
  nc.width = 256; nc.height = 52;
  const nCtx = nc.getContext("2d");
  nCtx.font = "bold 17px 'Inter',sans-serif";
  nCtx.textAlign = "center";
  nCtx.textBaseline = "middle";
  // Subtle shadow for readability
  nCtx.shadowColor = "rgba(0,0,0,0.8)";
  nCtx.shadowBlur = 4;
  nCtx.fillStyle = "rgba(255,255,255,0.93)";
  nCtx.fillText((username || "User").substring(0, 16), 128, 26);

  const nt = new THREE.CanvasTexture(nc);
  nt.minFilter = THREE.LinearFilter;
  nt.colorSpace = THREE.SRGBColorSpace;

  const ns = new THREE.Sprite(
    new THREE.SpriteMaterial({ map: nt, transparent: true, depthWrite: false, depthTest: false })
  );
  ns.scale.set(1.4, 0.34, 1);
  ns.position.y = torsoH + neckH + headR * 2.5;
  ns.renderOrder = 999;
  group.add(ns);

  scene.add(group);
  return group;
}