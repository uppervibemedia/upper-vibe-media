import * as THREE from "three";
import { SPAWN } from "./cityData";

// ─── CONSTANTS ────────────────────────────────────────────────
const SKIN = {
  light:          "#FDEBD3",
  "medium-light": "#F3C9A1",
  medium:         "#D4A574",
  "medium-dark":  "#A0724A",
  dark:           "#7B4A32",
  deep:           "#4A2820",
};

const CLOTH = {
  masculine: { shirt: "#1A3A8A", pants: "#18182E", shoe: "#181820", accent: "#00E5FF" },
  feminine:  { shirt: "#4A1A7A", pants: "#18182E", shoe: "#181820", accent: "#E040FB" },
  nonbinary: { shirt: "#1A2A6A", pants: "#18182E", shoe: "#181820", accent: "#A078FF" },
  neutral:   { shirt: "#1A3A7A", pants: "#18182A", shoe: "#181820", accent: "#00D4F0" },
};

const HAIR_COL = {
  masculine: "#120B04",
  feminine:  "#140A04",
  nonbinary: "#1A1008",
  neutral:   "#120B04",
};

const BODY = {
  // [shoulderR, hipR, torsoH, uArmL, fArmL, thighL, calfL, headR]
  masculine: [0.19, 0.155, 0.62, 0.26, 0.23, 0.30, 0.27, 0.145],
  feminine:  [0.165,0.160, 0.58, 0.24, 0.21, 0.29, 0.25, 0.138],
  nonbinary: [0.175,0.158, 0.60, 0.25, 0.22, 0.29, 0.26, 0.142],
  neutral:   [0.175,0.158, 0.60, 0.25, 0.22, 0.29, 0.26, 0.142],
};

const N = 18; // polygon segments — smooth but fast

// ─── MATERIAL HELPERS ─────────────────────────────────────────
function sm(hex, rough = 0.55, metal = 0.05) {
  const m = new THREE.MeshStandardMaterial({ color: new THREE.Color(hex), roughness: rough, metalness: metal });
  return m;
}
function bm(hex, opacity = 1) {
  const m = new THREE.MeshBasicMaterial({ color: new THREE.Color(hex) });
  if (opacity < 1) { m.transparent = true; m.opacity = opacity; }
  return m;
}

// ─── MESH HELPER ──────────────────────────────────────────────
function mesh(geo, mat, px = 0, py = 0, pz = 0, sx = 1, sy = 1, sz = 1, rx = 0, ry = 0, rz = 0) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(px, py, pz);
  m.scale.set(sx, sy, sz);
  m.rotation.set(rx, ry, rz);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

// ════════════════════════════════════════════════════════════
// HEAD — detailed sculpted human head
// ════════════════════════════════════════════════════════════
function buildHead(skinHex, type) {
  const g = new THREE.Group(); g.name = "headGroup";
  const sk = sm(skinHex, 0.50);
  const skD = sm(new THREE.Color(skinHex).multiplyScalar(0.88).getStyle(), 0.55);
  const hr = sm(HAIR_COL[type] || "#120B04", 0.70);

  // ── Cranium (rounded top)
  const cran = mesh(new THREE.SphereGeometry(1, N, N), sk, 0, 0, 0, 0.88, 1.0, 0.84);
  g.add(cran);

  // ── Forehead flattening
  const fore = mesh(new THREE.SphereGeometry(0.72, N, 10), sk, 0, 0.22, 0.38, 1, 0.55, 0.6);
  g.add(fore);

  // ── Cheeks
  [-1, 1].forEach(s => {
    g.add(mesh(new THREE.SphereGeometry(0.52, 12, 10), sk, s * 0.52, -0.10, 0.36, 0.55, 0.48, 0.44));
  });

  // ── Jaw / chin area
  g.add(mesh(new THREE.SphereGeometry(0.72, N, 10), skD, 0, -0.42, 0.08, 0.80, 0.44, 0.76));
  g.add(mesh(new THREE.SphereGeometry(0.32, 10, 8), skD, 0, -0.65, 0.32, 0.55, 0.42, 0.55));

  // ── Eyes
  [-1, 1].forEach(s => {
    const ex = s * 0.32;
    // Eye socket (slight indent — darker)
    g.add(mesh(new THREE.SphereGeometry(0.22, 10, 8), sm(new THREE.Color(skinHex).multiplyScalar(0.78).getStyle(), 0.5), ex, 0.17, 0.73, 0.52, 0.52, 0.28));
    // Sclera (white)
    g.add(mesh(new THREE.SphereGeometry(0.185, 10, 8), bm("#F0EDE8"), ex, 0.17, 0.76, 0.55, 0.62, 0.30));
    // Iris
    g.add(mesh(new THREE.SphereGeometry(0.10, 9, 7), bm("#2A5A40"), ex, 0.17, 0.78, 1, 1, 0.35));
    // Pupil
    g.add(mesh(new THREE.SphereGeometry(0.058, 7, 5), bm("#060606"), ex, 0.17, 0.79, 1, 1, 0.30));
    // Eyelid crease top
    g.add(mesh(new THREE.CylinderGeometry(0.19, 0.19, 0.04, 12), bm("#1E1008"), ex, 0.27, 0.74, 1, 1, 1, Math.PI / 2));
    // Brow
    const brow = mesh(new THREE.BoxGeometry(0.32, 0.08, 0.065), sm("#2A1608", 0.7), ex, 0.40, 0.71);
    brow.rotation.z = s * 0.06;
    g.add(brow);
  });

  // ── Nose bridge + tip
  g.add(mesh(new THREE.BoxGeometry(0.115, 0.22, 0.10), sk, 0, 0.04, 0.76));
  g.add(mesh(new THREE.SphereGeometry(0.145, 10, 8), skD, 0, -0.06, 0.82, 0.72, 0.56, 0.58));
  [-1, 1].forEach(s => {
    g.add(mesh(new THREE.SphereGeometry(0.07, 8, 6), skD, s * 0.12, -0.09, 0.84, 0.55, 0.48, 0.44));
  });

  // ── Mouth
  g.add(mesh(new THREE.SphereGeometry(0.10, 9, 7), bm("#C06858"), 0, -0.29, 0.82, 0.58, 0.44, 0.38)); // upper lip
  g.add(mesh(new THREE.SphereGeometry(0.115, 9, 7), bm("#A85848"), 0, -0.38, 0.83, 0.78, 0.35, 0.40)); // lower lip
  // Mouth line
  g.add(mesh(new THREE.CylinderGeometry(0.115, 0.115, 0.03, 12), bm("#8A3828"), 0, -0.33, 0.82, 1, 1, 1, Math.PI / 2));

  // ── Ears
  [-1, 1].forEach(s => {
    g.add(mesh(new THREE.SphereGeometry(0.225, 10, 8), skD, s * 0.88, 0.02, 0.02, 0.28, 0.58, 0.44));
  });

  // ── HAIR ─────────────────────────────────────────────────
  buildHairShape(g, type, hr, sm(HAIR_COL[type] || "#120B04", 0.68));

  return g;
}

function buildHairShape(g, type, hm, hm2) {
  if (type === "masculine" || type === "neutral") {
    // Short tapered fade
    // Top dome — volume with forward sweep
    g.add(mesh(new THREE.SphereGeometry(0.92, N, N - 4), hm, 0, 0.72, -0.04, 0.96, 0.46, 0.92));
    // Front — slight quiff/sweep forward
    g.add(mesh(new THREE.SphereGeometry(0.62, 14, 10), hm, 0, 0.60, 0.42, 0.88, 0.32, 0.52));
    // Back close crop
    g.add(mesh(new THREE.SphereGeometry(0.68, 13, 10), hm, 0, 0.40, -0.60, 0.90, 0.50, 0.38));
    // Sides — tight
    [-1, 1].forEach(s => {
      g.add(mesh(new THREE.SphereGeometry(0.52, 11, 9), hm2, s * 0.72, 0.35, 0.02, 0.28, 0.60, 0.72));
      // Sideburn (fade)
      g.add(mesh(new THREE.SphereGeometry(0.26, 9, 7), hm2, s * 0.70, -0.28, 0.28, 0.30, 0.42, 0.38));
    });
  } else if (type === "feminine") {
    // Volume curls / flowing mid-length
    g.add(mesh(new THREE.SphereGeometry(1.02, N, N - 4), hm, 0, 0.65, -0.05, 1.08, 0.55, 0.98));
    // Bangs
    g.add(mesh(new THREE.BoxGeometry(0.78, 0.26, 0.42), hm, 0, 0.92, 0.42, 1, 1, 1, -0.22));
    // Side volume
    [-1, 1].forEach(s => {
      g.add(mesh(new THREE.SphereGeometry(0.60, 12, 10), hm, s * 0.72, 0.12, 0.04, 0.38, 0.88, 0.72));
      g.add(mesh(new THREE.SphereGeometry(0.42, 10, 8), hm, s * 0.68, -0.40, -0.20, 0.36, 0.66, 0.52));
    });
    // Back length
    g.add(mesh(new THREE.SphereGeometry(0.68, 13, 10), hm, 0, -0.28, -0.60, 0.90, 1.00, 0.42));
  } else {
    // Nonbinary — medium length natural
    g.add(mesh(new THREE.SphereGeometry(0.98, N, N - 4), hm, 0, 0.68, -0.04, 1.02, 0.52, 0.96));
    g.add(mesh(new THREE.BoxGeometry(0.64, 0.24, 0.36), hm, 0, 0.88, 0.38, 1, 1, 1, -0.18));
    [-1, 1].forEach(s => {
      g.add(mesh(new THREE.SphereGeometry(0.52, 11, 9), hm, s * 0.68, 0.18, 0.04, 0.34, 0.78, 0.70));
    });
    g.add(mesh(new THREE.SphereGeometry(0.62, 12, 10), hm, 0, -0.15, -0.55, 0.88, 0.85, 0.40));
  }
}

// ════════════════════════════════════════════════════════════
// LOCAL (player) AVATAR
// ════════════════════════════════════════════════════════════
export function createAvatar(scene, opts = {}) {
  const type  = opts.avatarType || "neutral";
  const tone  = opts.skinTone   || "medium";
  const skinH = SKIN[tone] || SKIN.medium;
  const B     = BODY[type] || BODY.neutral;
  const C     = CLOTH[type] || CLOTH.neutral;
  const [sR, hR, tH, uAL, fAL, thL, caL, headR] = B;

  const avatar = new THREE.Group(); avatar.name = "avatar";
  const root   = new THREE.Group(); root.name = "torso";
  avatar.add(root);

  const skin  = sm(skinH, 0.50);
  const shirt = sm(C.shirt, 0.55, 0.06);
  const pants = sm(C.pants, 0.60);
  const shoes = sm(C.shoe, 0.55, 0.04);
  const sole  = sm("#0E0E14", 0.60);

  // ── TORSO — tapered, organic cylinder with chest and waist ──
  // Main body
  const torsoMesh = mesh(new THREE.CylinderGeometry(sR, hR, tH, N), shirt, 0, tH * 0.5, 0);
  root.add(torsoMesh);
  // Chest swell
  root.add(mesh(new THREE.SphereGeometry(sR * 0.82, N, 12), shirt, 0, tH * 0.72, 0.02, 1.1, 0.75, 0.72));
  // Waist indent
  root.add(mesh(new THREE.CylinderGeometry(hR * 0.80, hR, tH * 0.22, N), shirt, 0, tH * 0.18, 0));

  // ── NECK ──────────────────────────────────────────────────
  const neckPivot = new THREE.Group(); neckPivot.name = "neck";
  neckPivot.position.set(0, tH + 0.01, 0);
  root.add(neckPivot);
  neckPivot.add(mesh(new THREE.CylinderGeometry(0.045, 0.055, 0.12, N), skin, 0, 0.06, 0));

  // ── HEAD ──────────────────────────────────────────────────
  const headPivot = new THREE.Group(); headPivot.name = "head";
  headPivot.position.set(0, 0.13, 0);
  const headMesh = buildHead(skinH, type);
  headMesh.scale.setScalar(headR);
  headPivot.add(headMesh);
  neckPivot.add(headPivot);

  // ── SHOULDER CAPS ─────────────────────────────────────────
  [-1, 1].forEach(s => {
    root.add(mesh(new THREE.SphereGeometry(sR * 0.52, N, 12), shirt, s * sR * 1.02, tH * 0.82, 0, 1, 0.75, 0.88));
  });

  // ── ARMS ──────────────────────────────────────────────────
  [-1, 1].forEach(s => {
    const side  = s > 0 ? "right" : "left";
    const sPivot = new THREE.Group(); sPivot.name = side + "Shoulder";
    sPivot.position.set(s * (sR + 0.038), tH * 0.80, 0);
    root.add(sPivot);

    // Upper arm
    sPivot.add(mesh(new THREE.CylinderGeometry(0.050, 0.042, uAL, N), skin, 0, -uAL / 2, 0));

    // Elbow pivot
    const ePivot = new THREE.Group(); ePivot.name = side + "Elbow";
    ePivot.position.set(0, -uAL, 0);
    sPivot.add(ePivot);

    // Forearm
    ePivot.add(mesh(new THREE.CylinderGeometry(0.040, 0.032, fAL, N), skin, 0, -fAL / 2, 0));

    // Wrist
    const wPivot = new THREE.Group(); wPivot.name = side + "Wrist";
    wPivot.position.set(0, -fAL, 0);
    ePivot.add(wPivot);

    // Hand — palm + knuckle row + thumb
    const handG = new THREE.Group(); handG.name = side + "Hand";
    handG.add(mesh(new THREE.BoxGeometry(0.065, 0.040, 0.072), skin, 0, -0.018, 0)); // palm
    // Fingers
    for (let f = 0; f < 4; f++) {
      const fx = (f - 1.5) * 0.017;
      const fl = f === 0 || f === 3 ? 0.040 : 0.050;
      handG.add(mesh(new THREE.CylinderGeometry(0.007, 0.006, fl, 7), skin, fx, -0.018 - fl / 2, 0.042));
    }
    // Thumb
    const thumb = mesh(new THREE.CylinderGeometry(0.008, 0.007, 0.034, 7), skin, s * 0.038, -0.022, 0.015);
    thumb.rotation.z = -s * 0.60;
    handG.add(thumb);

    wPivot.add(handG);
    sPivot.userData = { arm: sPivot, elbowPivot: ePivot, wristPivot: wPivot, handGroup: handG };
  });

  // ── HIPS / LEGS ───────────────────────────────────────────
  [-1, 1].forEach(s => {
    const side   = s > 0 ? "right" : "left";
    const hPivot = new THREE.Group(); hPivot.name = side + "Hip";
    hPivot.position.set(s * hR * 0.62, thL, -0.01);
    root.add(hPivot);

    // Thigh
    hPivot.add(mesh(new THREE.CylinderGeometry(0.070, 0.058, thL, N), pants, 0, -thL / 2, 0));

    // Knee pivot
    const kPivot = new THREE.Group(); kPivot.name = side + "Knee";
    kPivot.position.set(0, -thL, 0);
    hPivot.add(kPivot);

    // Calf
    kPivot.add(mesh(new THREE.CylinderGeometry(0.054, 0.040, caL, N), pants, 0, -caL / 2, 0));

    // Ankle pivot
    const aPivot = new THREE.Group(); aPivot.name = side + "Ankle";
    aPivot.position.set(0, -caL, 0.012);
    kPivot.add(aPivot);

    // Foot (shoe)
    const footG = new THREE.Group(); footG.name = side + "Foot";
    footG.add(mesh(new THREE.BoxGeometry(0.105, 0.058, 0.185), shoes, 0, 0.012, 0.038));
    footG.add(mesh(new THREE.SphereGeometry(0.042, 10, 8), shoes, 0, 0.012, 0.148, 0.80, 0.56, 0.46));
    footG.add(mesh(new THREE.BoxGeometry(0.110, 0.020, 0.190), sole, 0, -0.016, 0.038));
    footG.add(mesh(new THREE.BoxGeometry(0.102, 0.028, 0.058), sole, 0, -0.008, -0.042));
    aPivot.add(footG);

    hPivot.userData = {
      leg: hPivot,
      kneePivot: kPivot,
      anklePivot: aPivot,
      footGroup: footG,
    };
  });

  // ── SHADOW BLOB ───────────────────────────────────────────
  const shadowM = new THREE.Mesh(
    new THREE.CircleGeometry(0.22, 14),
    new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.18, depthWrite: false })
  );
  shadowM.rotation.x = -Math.PI / 2;
  shadowM.position.y = -(thL + caL + 0.04);
  root.add(shadowM);

  avatar.position.set(SPAWN[0], SPAWN[1], SPAWN[2]);
  scene.add(avatar);
  return avatar;
}

// ════════════════════════════════════════════════════════════
// REMOTE AVATAR — same quality, lighter geometry counts
// ════════════════════════════════════════════════════════════
export function createRemoteAvatar(scene, userId, username, avatarType, skinTone) {
  const type  = avatarType || "neutral";
  const skinH = SKIN[skinTone] || SKIN.medium;
  const B     = BODY[type] || BODY.neutral;
  const C     = CLOTH[type] || CLOTH.neutral;
  const [sR, hR, tH, uAL, fAL, thL, caL, headR] = B;

  const group = new THREE.Group();
  group.name  = `remote_${userId}`;
  group.userData = { userId, walkTime: 0, speed: 0 };

  const skin  = sm(skinH, 0.50);
  const shirt = sm(C.shirt, 0.55, 0.06);
  const pants = sm(C.pants, 0.60);
  const shoes = sm(C.shoe, 0.55);
  const sole  = sm("#0E0E14", 0.60);
  const hair  = sm(HAIR_COL[type] || "#120B04", 0.70);

  // Torso
  group.add(mesh(new THREE.CylinderGeometry(sR, hR, tH, 14), shirt, 0, tH * 0.5, 0));
  group.add(mesh(new THREE.SphereGeometry(sR * 0.80, 13, 10), shirt, 0, tH * 0.72, 0.02, 1.1, 0.72, 0.72));

  // Neck
  group.add(mesh(new THREE.CylinderGeometry(0.042, 0.052, 0.11, 12), skin, 0, tH + 0.065, 0));

  // Head
  const headY = tH + 0.17;
  const headG = new THREE.Group();
  headG.scale.setScalar(headR);
  headG.position.set(0, headY, 0);
  // Cranium
  headG.add(mesh(new THREE.SphereGeometry(1, 14, 13), skin, 0, 0, 0, 0.88, 1.0, 0.82));
  headG.add(mesh(new THREE.SphereGeometry(0.70, 12, 9), sm(new THREE.Color(skinH).multiplyScalar(0.88).getStyle(), 0.55), 0, -0.42, 0.08, 0.80, 0.44, 0.74));
  [-1, 1].forEach(s => {
    headG.add(mesh(new THREE.SphereGeometry(0.185, 10, 8), new THREE.MeshBasicMaterial({ color: 0xF0EDE8 }), s * 0.32, 0.17, 0.76, 0.55, 0.62, 0.28));
    headG.add(mesh(new THREE.SphereGeometry(0.058, 7, 5), new THREE.MeshBasicMaterial({ color: 0x060606 }), s * 0.32, 0.17, 0.79, 1, 1, 0.28));
    const brow = mesh(new THREE.BoxGeometry(0.30, 0.07, 0.06), new THREE.MeshBasicMaterial({ color: 0x2A1608 }), s * 0.32, 0.40, 0.70);
    brow.rotation.z = s * 0.06;
    headG.add(brow);
  });
  headG.add(mesh(new THREE.SphereGeometry(0.140, 9, 7), sm(new THREE.Color(skinH).multiplyScalar(0.90).getStyle(), 0.55), 0, -0.06, 0.82, 0.72, 0.55, 0.58));
  headG.add(mesh(new THREE.SphereGeometry(0.112, 9, 7), new THREE.MeshBasicMaterial({ color: 0xA85848 }), 0, -0.38, 0.82, 0.76, 0.36, 0.40));
  // Remote hair (simplified)
  headG.add(mesh(new THREE.SphereGeometry(0.92, 13, 11), hair, 0, 0.72, -0.04, 0.96, 0.46, 0.92));
  if (type === "masculine" || type === "neutral") {
    headG.add(mesh(new THREE.SphereGeometry(0.60, 11, 9), hair, 0, 0.60, 0.42, 0.86, 0.30, 0.50));
    [-1, 1].forEach(s => headG.add(mesh(new THREE.SphereGeometry(0.50, 10, 8), hair, s * 0.70, 0.35, 0.02, 0.28, 0.58, 0.70)));
  } else {
    headG.add(mesh(new THREE.BoxGeometry(0.74, 0.24, 0.40), hair, 0, 0.90, 0.40, 1, 1, 1, -0.20));
    [-1, 1].forEach(s => headG.add(mesh(new THREE.SphereGeometry(0.56, 11, 9), hair, s * 0.70, 0.14, 0.04, 0.36, 0.82, 0.70)));
  }
  group.add(headG);

  // Shoulder caps
  [-1, 1].forEach(s => {
    group.add(mesh(new THREE.SphereGeometry(sR * 0.50, 12, 10), shirt, s * sR * 1.02, tH * 0.80, 0, 1, 0.72, 0.88));
  });

  // Arms
  [-1, 1].forEach(s => {
    const side  = s > 0 ? "right" : "left";
    const sPivot = new THREE.Group(); sPivot.name = side + "Shoulder";
    sPivot.position.set(s * (sR + 0.036), tH * 0.78, 0);
    group.add(sPivot);

    sPivot.add(mesh(new THREE.CylinderGeometry(0.048, 0.040, uAL, 12), skin, 0, -uAL / 2, 0));

    const ePivot = new THREE.Group(); ePivot.name = side + "Elbow";
    ePivot.position.set(0, -uAL, 0);
    sPivot.add(ePivot);

    ePivot.add(mesh(new THREE.CylinderGeometry(0.038, 0.030, fAL, 12), skin, 0, -fAL / 2, 0));

    const wPivot = new THREE.Group(); wPivot.name = side + "Wrist";
    wPivot.position.set(0, -fAL, 0);
    ePivot.add(wPivot);

    const hand = mesh(new THREE.BoxGeometry(0.062, 0.036, 0.068), skin, 0, -0.016, 0);
    hand.name = side + "Hand";
    wPivot.add(hand);

    sPivot.userData = { elbowPivot: ePivot, wristPivot: wPivot };
  });

  // Legs
  [-1, 1].forEach(s => {
    const side   = s > 0 ? "right" : "left";
    const hPivot = new THREE.Group(); hPivot.name = side + "Hip";
    hPivot.position.set(s * hR * 0.62, thL, -0.01);
    group.add(hPivot);

    hPivot.add(mesh(new THREE.CylinderGeometry(0.068, 0.056, thL, 12), pants, 0, -thL / 2, 0));

    const kPivot = new THREE.Group(); kPivot.name = side + "Knee";
    kPivot.position.set(0, -thL, 0);
    hPivot.add(kPivot);

    kPivot.add(mesh(new THREE.CylinderGeometry(0.052, 0.038, caL, 12), pants, 0, -caL / 2, 0));

    const aPivot = new THREE.Group(); aPivot.name = side + "Ankle";
    aPivot.position.set(0, -caL, 0.012);
    kPivot.add(aPivot);

    const footG = new THREE.Group();
    footG.add(mesh(new THREE.BoxGeometry(0.102, 0.056, 0.180), shoes, 0, 0.012, 0.036));
    footG.add(mesh(new THREE.SphereGeometry(0.040, 9, 7), shoes, 0, 0.012, 0.142, 0.78, 0.54, 0.44));
    footG.add(mesh(new THREE.BoxGeometry(0.108, 0.018, 0.186), sole, 0, -0.016, 0.036));
    aPivot.add(footG);

    hPivot.userData = { kneePivot: kPivot, anklePivot: aPivot, footGroup: footG };
  });

  // Name label
  const nc = document.createElement("canvas"); nc.width = 256; nc.height = 56;
  const ctx = nc.getContext("2d");
  ctx.font = "bold 19px 'Inter',sans-serif";
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.fillStyle = "rgba(255,255,255,0.92)";
  ctx.fillText((username || "User").substring(0, 16), 128, 28);
  const nt = new THREE.CanvasTexture(nc);
  nt.minFilter = THREE.LinearFilter;
  nt.colorSpace = THREE.SRGBColorSpace;
  const ns = new THREE.Sprite(new THREE.SpriteMaterial({ map: nt, transparent: true, depthWrite: false, depthTest: false }));
  ns.scale.set(1.4, 0.34, 1);
  ns.position.y = tH + 0.72;
  ns.renderOrder = 999;
  group.add(ns);

  scene.add(group);
  return group;
}