import * as THREE from "three";
import { SPAWN } from "./cityData";

// ─── SKIN TONES ───────────────────────────────────────────────
const SKIN = {
  light:          "#FDEBD3",
  "medium-light": "#F0C9A0",
  medium:         "#C8864A",
  "medium-dark":  "#9A6038",
  dark:           "#6B3A22",
  deep:           "#3E2018",
};

// [shoulderR, hipR, torsoH, uArmL, fArmL, thighL, calfL, headR, neckR]
const BODY = {
  masculine: [0.155, 0.130, 0.52, 0.22, 0.20, 0.25, 0.23, 0.118, 0.042],
  feminine:  [0.135, 0.135, 0.48, 0.20, 0.18, 0.24, 0.21, 0.112, 0.038],
  nonbinary: [0.145, 0.132, 0.50, 0.21, 0.19, 0.245, 0.22, 0.115, 0.040],
  neutral:   [0.145, 0.132, 0.50, 0.21, 0.19, 0.245, 0.22, 0.115, 0.040],
};

const CLOTH = {
  masculine: { shirt: "#1C3D8A", pants: "#16162A", shoe: "#151520", lace: "#CCCCDD" },
  feminine:  { shirt: "#4A1878", pants: "#16162A", shoe: "#151520", lace: "#DDCCEE" },
  nonbinary: { shirt: "#1A2870", pants: "#16162A", shoe: "#151520", lace: "#CCDDEE" },
  neutral:   { shirt: "#1C3D8A", pants: "#14182A", shoe: "#151520", lace: "#CCCCDD" },
};

const HAIR = {
  masculine: "#0E0804",
  feminine:  "#110804",
  nonbinary: "#130A06",
  neutral:   "#0E0804",
};

const N = 16; // segments — smooth but performant

// ─── MATERIAL HELPERS ─────────────────────────────────────────
function sm(hex, rough = 0.55, metal = 0.0) {
  return new THREE.MeshStandardMaterial({
    color: new THREE.Color(hex), roughness: rough, metalness: metal,
  });
}
function bm(hex) {
  return new THREE.MeshBasicMaterial({ color: new THREE.Color(hex) });
}

// ─── ADD MESH HELPER ──────────────────────────────────────────
function addM(parent, geo, mat, px=0, py=0, pz=0, sx=1, sy=1, sz=1, rx=0, ry=0, rz=0) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(px, py, pz);
  m.scale.set(sx, sy, sz);
  m.rotation.set(rx, ry, rz);
  m.castShadow = true;
  m.receiveShadow = true;
  parent.add(m);
  return m;
}

// ════════════════════════════════════════════════════════════════
// HEAD — sculpted human head with face features and hair
// All geometry is unit-scale; scale the group to headR
// ════════════════════════════════════════════════════════════════
function buildHead(skinHex, type) {
  const g = new THREE.Group(); g.name = "headGroup";
  const sk = sm(skinHex, 0.48);
  const skDark = sm(new THREE.Color(skinHex).multiplyScalar(0.80).getStyle(), 0.52);

  // ── CRANIUM — wider, natural oval ────────────────────────
  addM(g, new THREE.SphereGeometry(1.0, N, N), sk,   0,  0.05, 0,  0.85, 1.0, 0.82);

  // ── FACE PLATE — slight forward protrusion ────────────────
  addM(g, new THREE.SphereGeometry(0.68, N, 12), sk,  0, -0.05, 0.22,  0.90, 0.88, 0.50);

  // ── JAW / LOWER FACE ──────────────────────────────────────
  addM(g, new THREE.SphereGeometry(0.68, N, 10), skDark,  0, -0.50, 0.06,  0.76, 0.42, 0.72);

  // ── CHIN ──────────────────────────────────────────────────
  addM(g, new THREE.SphereGeometry(0.28, 10, 8), skDark,  0, -0.72, 0.28,  0.55, 0.40, 0.52);

  // ── CHEEKBONES ────────────────────────────────────────────
  [-1,1].forEach(s => addM(g, new THREE.SphereGeometry(0.40, 10, 8), sk, s*0.55, -0.12, 0.40,  0.55, 0.48, 0.42));

  // ── EARS ──────────────────────────────────────────────────
  [-1,1].forEach(s => addM(g, new THREE.SphereGeometry(0.24, 9, 7), skDark, s*0.93, 0.02, 0.0,  0.28, 0.55, 0.40));

  // ══ EYES ══════════════════════════════════════════════════
  [-1,1].forEach(s => {
    const ex = s * 0.30;
    // Socket indent
    addM(g, new THREE.SphereGeometry(0.21, 10, 8), sm(new THREE.Color(skinHex).multiplyScalar(0.72).getStyle()), ex, 0.18, 0.74,  0.54, 0.52, 0.28);
    // Sclera
    addM(g, new THREE.SphereGeometry(0.175, 10, 8), bm("#EDEAE4"), ex, 0.18, 0.77,  0.56, 0.62, 0.30);
    // Iris (color)
    addM(g, new THREE.SphereGeometry(0.095, 8, 6), bm("#2D5A3C"), ex, 0.18, 0.79,  1.0, 1.0, 0.30);
    // Pupil
    addM(g, new THREE.SphereGeometry(0.052, 6, 5), bm("#050505"), ex, 0.18, 0.80,  1.0, 1.0, 0.28);
    // Upper eyelid
    const lid = addM(g, new THREE.CylinderGeometry(0.185, 0.185, 0.035, 12), bm("#1A0E08"), ex, 0.28, 0.74);
    lid.rotation.x = Math.PI / 2;
    // Brow
    const brow = addM(g, new THREE.BoxGeometry(0.30, 0.075, 0.060), sm("#221408", 0.7), ex, 0.42, 0.70);
    brow.rotation.z = s * 0.07;
  });

  // ══ NOSE ══════════════════════════════════════════════════
  // Bridge
  addM(g, new THREE.BoxGeometry(0.10, 0.22, 0.095), sk, 0, 0.06, 0.74);
  // Tip
  addM(g, new THREE.SphereGeometry(0.14, 9, 7), skDark, 0, -0.07, 0.80,  0.70, 0.56, 0.58);
  // Nostrils
  [-1,1].forEach(s => addM(g, new THREE.SphereGeometry(0.065, 7, 5), skDark, s*0.12, -0.10, 0.81,  0.52, 0.45, 0.42));

  // ══ MOUTH ═════════════════════════════════════════════════
  // Upper lip
  addM(g, new THREE.SphereGeometry(0.095, 8, 6), bm("#B05848"), 0, -0.33, 0.79,  0.62, 0.40, 0.38);
  // Lower lip (fuller)
  addM(g, new THREE.SphereGeometry(0.11, 8, 6), bm("#9E4E40"), 0, -0.43, 0.80,  0.76, 0.35, 0.40);
  // Mouth line
  const mline = addM(g, new THREE.CylinderGeometry(0.11, 0.11, 0.028, 11), bm("#7A3020"), 0, -0.38, 0.80);
  mline.rotation.x = Math.PI / 2;

  // ══ HAIR ══════════════════════════════════════════════════
  buildHair(g, type);

  return g;
}

function buildHair(g, type) {
  const hc = HAIR[type] || HAIR.neutral;
  const hm  = sm(hc, 0.72);
  const hm2 = sm(new THREE.Color(hc).multiplyScalar(1.15).getStyle(), 0.68);

  if (type === "masculine" || type === "neutral") {
    // Short clean cut with slight texture — low fade
    // Main dome (tight to skull)
    addM(g, new THREE.SphereGeometry(1.0, N, N-4), hm, 0, 0.65, -0.02,  0.90, 0.38, 0.86);
    // Front sweep / hairline
    addM(g, new THREE.SphereGeometry(0.64, 13, 9), hm, 0, 0.56, 0.38,  0.82, 0.28, 0.50);
    // Crown bump — gives volume at top
    addM(g, new THREE.SphereGeometry(0.52, 12, 9), hm2, 0, 0.72, 0.05,  0.72, 0.32, 0.68);
    // Sides — tight fade (very thin slabs hugging skull)
    [-1,1].forEach(s => {
      addM(g, new THREE.SphereGeometry(0.50, 11, 8), hm, s*0.76, 0.32, 0.04,  0.26, 0.50, 0.66);
      // Sideburn trace
      addM(g, new THREE.SphereGeometry(0.24, 8, 6), hm, s*0.72, -0.28, 0.26,  0.28, 0.38, 0.32);
    });
    // Back nape
    addM(g, new THREE.SphereGeometry(0.60, 12, 9), hm, 0, 0.35, -0.62,  0.84, 0.42, 0.34);

  } else if (type === "feminine") {
    // Shoulder-length soft layered style
    // Main cap
    addM(g, new THREE.SphereGeometry(1.0, N, N-4), hm, 0, 0.62, -0.04,  1.04, 0.52, 0.98);
    // Bangs — forward fringe
    addM(g, new THREE.BoxGeometry(0.72, 0.22, 0.36), hm, 0, 0.88, 0.40,  1,1,1, -0.20);
    // Side volume (falls past jaw)
    [-1,1].forEach(s => {
      addM(g, new THREE.SphereGeometry(0.58, 12, 9), hm, s*0.74, 0.08, 0.02,  0.36, 0.88, 0.70);
      addM(g, new THREE.SphereGeometry(0.40, 10, 8), hm, s*0.68, -0.52, -0.10,  0.34, 0.62, 0.50);
    });
    // Back shoulder-length
    addM(g, new THREE.SphereGeometry(0.72, 13, 10), hm, 0, -0.30, -0.55,  0.88, 0.98, 0.40);
    addM(g, new THREE.SphereGeometry(0.55, 11, 9), hm, 0, -0.70, -0.48,  0.80, 0.72, 0.36);

  } else {
    // Non-binary — medium textured curly/natural
    addM(g, new THREE.SphereGeometry(1.0, N, N-4), hm, 0, 0.65, -0.03,  1.00, 0.48, 0.96);
    addM(g, new THREE.BoxGeometry(0.62, 0.22, 0.34), hm, 0, 0.86, 0.36,  1,1,1, -0.18);
    [-1,1].forEach(s => {
      addM(g, new THREE.SphereGeometry(0.50, 11, 9), hm, s*0.70, 0.15, 0.03,  0.34, 0.75, 0.68);
    });
    addM(g, new THREE.SphereGeometry(0.62, 12, 9), hm, 0, -0.12, -0.56,  0.86, 0.80, 0.38);
  }
}

// ─── FOOT / SHOE ──────────────────────────────────────────────
function buildFoot(shoeHex) {
  const g = new THREE.Group(); g.name = "foot";
  const sho = sm(shoeHex, 0.55, 0.04);
  const sol = sm("#101018", 0.62);
  // Shoe body
  addM(g, new THREE.BoxGeometry(0.095, 0.055, 0.170), sho, 0, 0.010, 0.034);
  // Toe round
  addM(g, new THREE.SphereGeometry(0.038, 9, 7), sho, 0, 0.010, 0.130,  0.80, 0.56, 0.46);
  // Sole
  addM(g, new THREE.BoxGeometry(0.100, 0.018, 0.176), sol, 0, -0.015, 0.034);
  // Heel block
  addM(g, new THREE.BoxGeometry(0.092, 0.026, 0.054), sol, 0, -0.006, -0.040);
  return g;
}

// ─── HAND ────────────────────────────────────────────────────
function buildHand(skinHex) {
  const g = new THREE.Group(); g.name = "hand";
  const sk = sm(skinHex, 0.50);
  // Palm
  addM(g, new THREE.BoxGeometry(0.058, 0.034, 0.064), sk, 0, -0.015, 0);
  // Finger row (4 fingers as mini cylinders)
  for (let f = 0; f < 4; f++) {
    const fx = (f - 1.5) * 0.015;
    const fl = f === 0 || f === 3 ? 0.036 : 0.045;
    addM(g, new THREE.CylinderGeometry(0.0060, 0.0055, fl, 6), sk, fx, -0.015 - fl/2, 0.037);
  }
  // Thumb
  const th = addM(g, new THREE.CylinderGeometry(0.0070, 0.0062, 0.030, 6), sk, 0.034, -0.018, 0.012);
  th.rotation.z = -0.60;
  return g;
}

// ════════════════════════════════════════════════════════════════
// createAvatar — LOCAL (player) avatar
// ════════════════════════════════════════════════════════════════
export function createAvatar(scene, opts = {}) {
  const type  = opts.avatarType || "neutral";
  const tone  = opts.skinTone   || "medium";
  const skinH = SKIN[tone] || SKIN.medium;
  const B     = BODY[type] || BODY.neutral;
  const C     = CLOTH[type] || CLOTH.neutral;
  const [sR, hR, tH, uAL, fAL, thL, caL, headR, neckR] = B;

  const avatar = new THREE.Group(); avatar.name = "avatar";
  const root   = new THREE.Group(); root.name = "torso";
  avatar.add(root);

  const skin  = sm(skinH, 0.50);
  const shirt = sm(C.shirt, 0.55, 0.06);
  const pants = sm(C.pants, 0.60);
  const shoes = sm(C.shoe, 0.55, 0.04);

  // ── TORSO — natural tapered cylinder ─────────────────────
  // Main cylinder — shoulders wider than hips
  addM(root, new THREE.CylinderGeometry(sR, hR, tH, N), shirt, 0, tH*0.50, 0);
  // Chest swell
  addM(root, new THREE.SphereGeometry(sR*0.80, N, 11), shirt, 0, tH*0.72, 0.015,  1.08, 0.70, 0.70);
  // Waist taper (slightly tighter)
  addM(root, new THREE.CylinderGeometry(hR*0.84, hR, tH*0.24, N), shirt, 0, tH*0.18, 0);

  // ── NECK ─────────────────────────────────────────────────
  const neckPiv = new THREE.Group(); neckPiv.name = "neck";
  neckPiv.position.set(0, tH + 0.005, 0);
  root.add(neckPiv);
  addM(neckPiv, new THREE.CylinderGeometry(neckR, neckR*1.12, 0.11, N), skin, 0, 0.055, 0);

  // ── HEAD ─────────────────────────────────────────────────
  const headPiv = new THREE.Group(); headPiv.name = "head";
  headPiv.position.set(0, 0.12, 0);
  const headG = buildHead(skinH, type);
  headG.scale.setScalar(headR);
  headPiv.add(headG);
  neckPiv.add(headPiv);

  // ── SHOULDER CAPS ────────────────────────────────────────
  [-1,1].forEach(s => {
    addM(root, new THREE.SphereGeometry(sR*0.50, N, 11), shirt, s*(sR+0.012), tH*0.82, 0,  1.0, 0.72, 0.85);
  });

  // ── ARMS ─────────────────────────────────────────────────
  [-1,1].forEach(s => {
    const side   = s > 0 ? "right" : "left";
    const sPivot = new THREE.Group(); sPivot.name = side + "Shoulder";
    sPivot.position.set(s*(sR + 0.030), tH*0.80, 0);
    root.add(sPivot);

    // Upper arm
    addM(sPivot, new THREE.CylinderGeometry(0.040, 0.034, uAL, N), skin, 0, -uAL/2, 0);

    const ePivot = new THREE.Group(); ePivot.name = side + "Elbow";
    ePivot.position.set(0, -uAL, 0);
    sPivot.add(ePivot);

    // Elbow bump
    addM(ePivot, new THREE.SphereGeometry(0.034, 9, 8), skin, 0, 0, 0,  1, 0.88, 0.88);

    // Forearm
    addM(ePivot, new THREE.CylinderGeometry(0.032, 0.026, fAL, N), skin, 0, -fAL/2, 0);

    const wPivot = new THREE.Group(); wPivot.name = side + "Wrist";
    wPivot.position.set(0, -fAL, 0);
    ePivot.add(wPivot);

    const handG = buildHand(skinH);
    wPivot.add(handG);

    sPivot.userData = { elbowPivot: ePivot, wristPivot: wPivot, handGroup: handG };
  });

  // ── HIPS / LEGS ──────────────────────────────────────────
  [-1,1].forEach(s => {
    const side   = s > 0 ? "right" : "left";
    const hPivot = new THREE.Group(); hPivot.name = side + "Hip";
    hPivot.position.set(s*hR*0.58, thL, -0.008);
    root.add(hPivot);

    // Thigh
    addM(hPivot, new THREE.CylinderGeometry(0.058, 0.048, thL, N), pants, 0, -thL/2, 0);

    const kPivot = new THREE.Group(); kPivot.name = side + "Knee";
    kPivot.position.set(0, -thL, 0);
    hPivot.add(kPivot);

    // Knee bump
    addM(kPivot, new THREE.SphereGeometry(0.048, 9, 8), pants, 0, 0, 0.008,  1.0, 0.88, 0.80);

    // Calf
    addM(kPivot, new THREE.CylinderGeometry(0.044, 0.034, caL, N), pants, 0, -caL/2, 0);

    const aPivot = new THREE.Group(); aPivot.name = side + "Ankle";
    aPivot.position.set(0, -caL, 0.010);
    kPivot.add(aPivot);

    const footG = buildFoot(C.shoe);
    aPivot.add(footG);

    hPivot.userData = {
      leg: hPivot,
      kneePivot: kPivot,
      anklePivot: aPivot,
      footGroup: footG,
    };
  });

  // ── SHADOW ───────────────────────────────────────────────
  const shad = new THREE.Mesh(
    new THREE.CircleGeometry(0.20, 14),
    new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.18, depthWrite: false })
  );
  shad.rotation.x = -Math.PI / 2;
  shad.position.y = -(thL + caL + 0.04);
  root.add(shad);

  avatar.position.set(SPAWN[0], SPAWN[1], SPAWN[2]);
  scene.add(avatar);
  return avatar;
}

// ════════════════════════════════════════════════════════════════
// createRemoteAvatar — other players (same style, optimized)
// ════════════════════════════════════════════════════════════════
export function createRemoteAvatar(scene, userId, username, avatarType, skinTone) {
  const type  = avatarType || "neutral";
  const skinH = SKIN[skinTone] || SKIN.medium;
  const B     = BODY[type] || BODY.neutral;
  const C     = CLOTH[type] || CLOTH.neutral;
  const [sR, hR, tH, uAL, fAL, thL, caL, headR, neckR] = B;

  const group = new THREE.Group();
  group.name  = `remote_${userId}`;
  group.userData = { userId, walkTime: 0, speed: 0 };

  const skin  = sm(skinH, 0.50);
  const shirt = sm(C.shirt, 0.55, 0.06);
  const pants = sm(C.pants, 0.60);
  const shoes = sm(C.shoe, 0.55, 0.04);
  const hc    = sm(HAIR[type] || "#0E0804", 0.72);

  // Torso
  addM(group, new THREE.CylinderGeometry(sR, hR, tH, 13), shirt, 0, tH*0.50, 0);
  addM(group, new THREE.SphereGeometry(sR*0.78, 12, 10), shirt, 0, tH*0.72, 0.015,  1.08, 0.70, 0.70);

  // Neck
  addM(group, new THREE.CylinderGeometry(neckR, neckR*1.10, 0.10, 12), skin, 0, tH+0.060, 0);

  // Head (simplified remote)
  const headY = tH + 0.165;
  const rHead = new THREE.Group(); rHead.scale.setScalar(headR); rHead.position.set(0, headY, 0);
  addM(rHead, new THREE.SphereGeometry(1.0, 14, 13), skin, 0, 0.05, 0,  0.85, 1.0, 0.82);
  addM(rHead, new THREE.SphereGeometry(0.65, 12, 9), sm(new THREE.Color(skinH).multiplyScalar(0.80).getStyle()), 0, -0.50, 0.06,  0.76, 0.42, 0.72);
  // Eyes
  [-1,1].forEach(s => {
    addM(rHead, new THREE.SphereGeometry(0.175, 9, 7), bm("#EDEAE4"), s*0.30, 0.18, 0.77,  0.56, 0.62, 0.28);
    addM(rHead, new THREE.SphereGeometry(0.052, 6, 5), bm("#050505"), s*0.30, 0.18, 0.80,  1,1, 0.26);
    const brow = addM(rHead, new THREE.BoxGeometry(0.28, 0.07, 0.055), sm("#221408", 0.7), s*0.30, 0.42, 0.69);
    brow.rotation.z = s * 0.07;
  });
  // Nose
  addM(rHead, new THREE.SphereGeometry(0.13, 8, 6), sm(new THREE.Color(skinH).multiplyScalar(0.88).getStyle()), 0, -0.07, 0.79,  0.68, 0.54, 0.56);
  // Mouth
  addM(rHead, new THREE.SphereGeometry(0.10, 8, 6), bm("#9E4E40"), 0, -0.42, 0.79,  0.74, 0.33, 0.38);
  // Hair
  addM(rHead, new THREE.SphereGeometry(1.0, 13, 11), hc, 0, 0.65, -0.02,  0.90, 0.38, 0.86);
  if (type === "masculine" || type === "neutral") {
    addM(rHead, new THREE.SphereGeometry(0.62, 12, 9), hc, 0, 0.56, 0.38,  0.80, 0.28, 0.50);
    [-1,1].forEach(s => addM(rHead, new THREE.SphereGeometry(0.48, 10, 8), hc, s*0.74, 0.32, 0.04,  0.26, 0.50, 0.64));
  } else {
    addM(rHead, new THREE.BoxGeometry(0.70, 0.22, 0.34), hc, 0, 0.88, 0.38,  1,1,1, -0.20);
    [-1,1].forEach(s => addM(rHead, new THREE.SphereGeometry(0.54, 11, 9), hc, s*0.72, 0.08, 0.02,  0.36, 0.85, 0.68));
  }
  group.add(rHead);

  // Shoulder caps
  [-1,1].forEach(s => addM(group, new THREE.SphereGeometry(sR*0.48, 12, 10), shirt, s*(sR+0.010), tH*0.82, 0,  1.0, 0.72, 0.85));

  // Arms
  [-1,1].forEach(s => {
    const side   = s > 0 ? "right" : "left";
    const sPivot = new THREE.Group(); sPivot.name = side + "Shoulder";
    sPivot.position.set(s*(sR+0.028), tH*0.80, 0);
    group.add(sPivot);

    addM(sPivot, new THREE.CylinderGeometry(0.038, 0.032, uAL, 12), skin, 0, -uAL/2, 0);

    const ePivot = new THREE.Group(); ePivot.name = side + "Elbow";
    ePivot.position.set(0, -uAL, 0);
    sPivot.add(ePivot);

    addM(ePivot, new THREE.CylinderGeometry(0.030, 0.025, fAL, 12), skin, 0, -fAL/2, 0);

    const wPivot = new THREE.Group(); wPivot.name = side + "Wrist";
    wPivot.position.set(0, -fAL, 0);
    ePivot.add(wPivot);

    const hand = addM(wPivot, new THREE.BoxGeometry(0.054, 0.030, 0.060), skin, 0, -0.012, 0);
    hand.name = side + "Hand";

    sPivot.userData = { elbowPivot: ePivot, wristPivot: wPivot };
  });

  // Legs
  [-1,1].forEach(s => {
    const side   = s > 0 ? "right" : "left";
    const hPivot = new THREE.Group(); hPivot.name = side + "Hip";
    hPivot.position.set(s*hR*0.58, thL, -0.008);
    group.add(hPivot);

    addM(hPivot, new THREE.CylinderGeometry(0.056, 0.046, thL, 12), pants, 0, -thL/2, 0);

    const kPivot = new THREE.Group(); kPivot.name = side + "Knee";
    kPivot.position.set(0, -thL, 0);
    hPivot.add(kPivot);

    addM(kPivot, new THREE.CylinderGeometry(0.042, 0.032, caL, 12), pants, 0, -caL/2, 0);

    const aPivot = new THREE.Group(); aPivot.name = side + "Ankle";
    aPivot.position.set(0, -caL, 0.010);
    kPivot.add(aPivot);

    const footG = buildFoot(C.shoe);
    aPivot.add(footG);

    hPivot.userData = { kneePivot: kPivot, anklePivot: aPivot, footGroup: footG };
  });

  // Name label
  const nc = document.createElement("canvas"); nc.width = 256; nc.height = 54;
  const ctx = nc.getContext("2d");
  ctx.font = "bold 18px 'Inter',sans-serif";
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.fillStyle = "rgba(255,255,255,0.92)";
  ctx.fillText((username || "User").substring(0, 16), 128, 27);
  const nt = new THREE.CanvasTexture(nc);
  nt.minFilter = THREE.LinearFilter;
  nt.colorSpace = THREE.SRGBColorSpace;
  const ns = new THREE.Sprite(new THREE.SpriteMaterial({ map: nt, transparent: true, depthWrite: false, depthTest: false }));
  ns.scale.set(1.4, 0.34, 1);
  ns.position.y = tH + 0.70;
  ns.renderOrder = 999;
  group.add(ns);

  scene.add(group);
  return group;
}