import * as THREE from "three";
import { SPAWN } from "./cityData";

const {
  BoxGeometry, CylinderGeometry, SphereGeometry, Group, Mesh,
  MeshStandardMaterial, MeshBasicMaterial, Color, Vector3,
  TorusGeometry, Sprite, SpriteMaterial, CanvasTexture, LinearFilter,
  ShapeGeometry, Shape, CircleGeometry,
} = THREE;

// ─── SKIN TONES ──────────────────────────────────────────────
const SKIN_COLORS = {
  light:          "#FDEBD3",
  "medium-light": "#F3C9A1",
  medium:         "#D4A373",
  "medium-dark":  "#B07D5A",
  dark:           "#7B4A3A",
  deep:           "#4A2C2A",
};

// ─── BODY PROPORTIONS — Fortnite-lite stylized human ──────────
const BODY_PRESETS = {
  masculine:  [0.56, 0.38, 0.60, 0.54, 1.00, 1.20, 0.62],
  feminine:   [0.48, 0.40, 0.55, 0.50, 0.96, 1.16, 0.76],
  nonbinary:  [0.52, 0.39, 0.57, 0.52, 0.98, 1.18, 0.70],
  neutral:    [0.52, 0.39, 0.57, 0.52, 0.98, 1.18, 0.70],
};

// ─── CLOTHING — dark with neon accents per type ─────────────
const CLOTHING = {
  masculine: {
    shirt: "#141416", shirtAccent: "#1A1A1E",
    neonPrimary: "#00E5FF", neonSecondary: "#E040FB",
    pants: "#1A1A1E", shoe: "#121214",
    jacketStyle: "track",
  },
  feminine: {
    shirt: "#141416", shirtAccent: "#1A1A1E",
    neonPrimary: "#E040FB", neonSecondary: "#00E5FF",
    pants: "#18181C", shoe: "#121214",
    jacketStyle: "crop",
  },
  nonbinary: {
    shirt: "#141416", shirtAccent: "#1A1A1E",
    neonPrimary: "#A078FF", neonSecondary: "#00E5FF",
    pants: "#1A1A1E", shoe: "#121214",
    jacketStyle: "layered",
  },
  neutral: {
    shirt: "#141416", shirtAccent: "#1A1A1E",
    neonPrimary: "#00D4F0", neonSecondary: "#00D4F0",
    pants: "#18181C", shoe: "#121214",
    jacketStyle: "hoodie",
  },
};

// ─── HAIR COLORS ─────────────────────────────────────────────
const HAIR_BASE = "#1C110A";
const HAIR_LIGHT = "#2E1B10";

const SEG = 32; // High segments for smooth human surfaces

function mat(hexColor, opts = {}) {
  const m = new MeshStandardMaterial();
  m.color = new Color(hexColor);
  m.roughness = opts.roughness ?? 0.5;
  m.metalness = opts.metalness ?? 0.05;
  if (opts.transparent) { m.transparent = true; m.opacity = opts.opacity ?? 1; m.depthWrite = opts.depthWrite ?? true; }
  return m;
}

function neonMat(hexColor, opacity = 0.6) {
  return new MeshBasicMaterial({
    color: new Color(hexColor),
    depthWrite: false,
    transparent: true,
    opacity,
  });
}

// ═══════════════════════════════════════════════════════════════
// STYLIZED HUMAN AVATAR — social-world quality
// ═══════════════════════════════════════════════════════════════
export function createAvatar(scene, opts = {}) {
  const avatarType = opts.avatarType || "neutral";
  const skinTone = opts.skinTone || "medium";
  const skinHex = SKIN_COLORS[skinTone] || SKIN_COLORS.medium;
  const body = BODY_PRESETS[avatarType] || BODY_PRESETS.neutral;
  const [shoulderW, hipW, torsoH, armLen, legLen, headScale] = body;
  const cloth = CLOTHING[avatarType] || CLOTHING.neutral;

  const avatar = new Group();
  avatar.name = "avatar";

  // Materials — brighter for neon-lit night scene
  const skinM = () => mat(skinHex, { roughness: 0.45 });
  const skinS = () => mat(skinHex, { roughness: 0.35 });
  const shirtM = () => mat(cloth.shirt, { roughness: 0.22, metalness: 0.10 });
  const shirtAccentM = () => mat(cloth.shirtAccent, { roughness: 0.20, metalness: 0.08 });
  const pantsM = () => mat(cloth.pants, { roughness: 0.26, metalness: 0.06 });
  const pantsAccentM = () => mat(cloth.pants, { roughness: 0.24, metalness: 0.05 });
  const shoeM = () => mat(cloth.shoe, { roughness: 0.28, metalness: 0.10 });
  const soleM = () => mat("#1A1A1A", { roughness: 0.32, metalness: 0.12 });
  const laceM = () => mat("#E8E8E8", { roughness: 0.35 });
  const hairM = () => mat(HAIR_BASE, { roughness: 0.44 });
  const hairL = () => mat(HAIR_LIGHT, { roughness: 0.38 });
  // Face features use UNLIT materials so they pop regardless of lighting
  const eyeW = () => new MeshBasicMaterial({ color: 0xFFFFFF });
  const irisM = () => new MeshBasicMaterial({ color: 0x5B8C5A });
  const pupilM = () => new MeshBasicMaterial({ color: 0x080808 });
  const browM = () => new MeshBasicMaterial({ color: 0x3A2018 });
  const mouthM = () => new MeshBasicMaterial({ color: 0xC07060 });
  const mouthL = () => new MeshBasicMaterial({ color: 0xB06050 });
  const neonP = () => neonMat(cloth.neonPrimary, 0.55);
  const neonS = () => neonMat(cloth.neonSecondary, 0.45);

  function addObj(group, geo, materialOrFn, pos, casts = true) {
    const m = new Mesh(geo, typeof materialOrFn === "function" ? materialOrFn() : materialOrFn);
    m.position.copy(pos); m.castShadow = casts; m.receiveShadow = casts;
    group.add(m); return m;
  }

  // ─── HEAD — large visible face with bold features ──────────
  function buildHead() {
    const h = new Group(); h.name = "head";
    const hs = headScale;

    // Cranium — larger visible dome (radius ~0.18 with scale gives ~0.19 tall)
    const cranium = addObj(h, new SphereGeometry(0.18 * hs, 28, 22), skinM, new Vector3(0, 0.13 * hs, 0));
    cranium.scale.set(0.84, 1.06, 0.78);

    // Brow ridge — prominent
    const browRidge = addObj(h, new SphereGeometry(0.10 * hs, 18, 12), skinS, new Vector3(0, 0.10 * hs, 0.06 * hs));
    browRidge.scale.set(0.72, 0.18, 0.48);

    // Jaw — broader tapered shape
    const jaw = addObj(h, new SphereGeometry(0.10 * hs, 20, 14), skinM, new Vector3(0, 0.03 * hs, 0.05 * hs));
    jaw.scale.set(0.80, 0.44, 0.60);

    // Chin
    const chin = addObj(h, new SphereGeometry(0.03 * hs, 12, 8), skinS, new Vector3(0, -0.005 * hs, 0.08 * hs));
    chin.scale.set(0.65, 0.45, 0.48);

    // ── CHEEKBONES ──────────────────────────────────────
    for (const s of [-1, 1]) {
      const cheek = addObj(h, new SphereGeometry(0.05 * hs, 12, 10), skinS, new Vector3(s * 0.06 * hs, 0.09 * hs, 0.05 * hs));
      cheek.scale.set(0.72, 0.55, 0.44);
    }

    // ── EYE REGION — BIG visible eyes ────────────────────
    const eyeY = 0.13 * hs, eyeZ = 0.08 * hs, eyeGap = 0.05 * hs;
    for (const s of [-1, 1]) {
      const ex = s * eyeGap;

      // White — large sphere, scaled flat
      const white = addObj(h, new SphereGeometry(0.04 * hs, 13, 10), eyeW, new Vector3(ex, eyeY, eyeZ));
      white.scale.set(0.56, 0.72, 0.30);

      // Iris
      addObj(h, new SphereGeometry(0.018 * hs, 10, 8), irisM, new Vector3(ex, eyeY, eyeZ + 0.008 * hs));

      // Pupil
      addObj(h, new SphereGeometry(0.009 * hs, 8, 6), pupilM, new Vector3(ex, eyeY, eyeZ + 0.014 * hs));

      // Upper eyelid — dark outline
      const upperLid = addObj(h, new BoxGeometry(0.045 * hs, 0.008 * hs, 0.01 * hs), skinS, new Vector3(ex, eyeY + 0.018 * hs, eyeZ + 0.004 * hs));
      upperLid.rotation.x = -0.15;

      // Eyebrow — thick block for visibility
      const brow = addObj(h, new BoxGeometry(0.06 * hs, 0.014 * hs, 0.012 * hs), browM, new Vector3(ex, eyeY + 0.04 * hs, eyeZ + 0.01 * hs));
      brow.rotation.z = s * 0.06;
    }

    // ── NOSE — prominent block ─────────────────────────
    const noseBridge = addObj(h, new BoxGeometry(0.025 * hs, 0.04 * hs, 0.024 * hs), skinS, new Vector3(0, 0.10 * hs, 0.08 * hs));
    const noseTip = addObj(h, new SphereGeometry(0.028 * hs, 12, 10), skinS, new Vector3(0, 0.08 * hs, 0.09 * hs));
    noseTip.scale.set(0.68, 0.55, 0.55);
    for (const s of [-1, 1]) {
      const nostril = addObj(h, new SphereGeometry(0.01 * hs, 6, 5),
        new MeshBasicMaterial({ color: 0x5A3A2A }),
        new Vector3(s * 0.016 * hs, 0.076 * hs, 0.094 * hs));
      nostril.scale.set(0.55, 0.45, 0.45);
    }

    // ── MOUTH — visible lips ───────────────────────────
    const ulCenter = addObj(h, new SphereGeometry(0.012 * hs, 8, 6), mouthM, new Vector3(0, 0.05 * hs, 0.09 * hs));
    ulCenter.scale.set(0.55, 0.45, 0.35);
    for (const s of [-1, 1]) {
      const ulSide = addObj(h, new SphereGeometry(0.014 * hs, 7, 5), mouthM, new Vector3(s * 0.03 * hs, 0.045 * hs, 0.088 * hs));
      ulSide.scale.set(0.5, 0.4, 0.35);
    }
    const lowerLip = addObj(h, new SphereGeometry(0.018 * hs, 10, 8), mouthL, new Vector3(0, 0.035 * hs, 0.092 * hs));
    lowerLip.scale.set(0.78, 0.35, 0.40);

    // ── EARS ───────────────────────────────────────────
    for (const s of [-1, 1]) {
      const ear = addObj(h, new SphereGeometry(0.04 * hs, 12, 10), skinM, new Vector3(s * 0.09 * hs, 0.11 * hs, 0));
      ear.scale.set(0.26, 0.58, 0.40);
    }

    // ── HAIR — per-type style ──────────────────────────
    const style = cloth.jacketStyle;
    if (style === "track" || style === "hoodie") {
      const mainHair = addObj(h, new SphereGeometry(0.20 * hs, 24, 20), hairM, new Vector3(0, 0.17 * hs, -0.01));
      mainHair.scale.set(1.08, 0.52, 0.94);
      for (const s of [-1, 1]) {
        addObj(h, new SphereGeometry(0.07 * hs, 13, 10), hairL, new Vector3(s * 0.08 * hs, 0.14 * hs, 0.016));
      }
      const bang = addObj(h, new BoxGeometry(0.10 * hs, 0.05 * hs, 0.08 * hs), hairL, new Vector3(0, 0.21 * hs, 0.05 * hs));
      bang.rotation.x = -0.25;
      addObj(h, new SphereGeometry(0.12 * hs, 16, 12), hairM, new Vector3(0, 0.08 * hs, -0.07 * hs));
    } else if (style === "crop") {
      const mainHair = addObj(h, new SphereGeometry(0.21 * hs, 24, 20), hairM, new Vector3(0, 0.16 * hs, -0.01));
      mainHair.scale.set(1.10, 0.55, 0.96);
      for (const s of [-1, 1]) {
        for (let c = 0; c < 3; c++) {
          addObj(h, new SphereGeometry(0.04 * hs, 10, 8), hairL, new Vector3(s * (0.07 + c * 0.02) * hs, 0.12 + c * 0.03 * hs, 0.02));
        }
      }
      const bang = addObj(h, new BoxGeometry(0.10 * hs, 0.045 * hs, 0.07 * hs), hairL, new Vector3(0, 0.20 * hs, 0.048 * hs));
      bang.rotation.x = -0.22;
      addObj(h, new SphereGeometry(0.11 * hs, 16, 12), hairM, new Vector3(0, 0.10 * hs, -0.06 * hs));
    } else {
      const mainHair = addObj(h, new SphereGeometry(0.20 * hs, 24, 20), hairM, new Vector3(0, 0.15 * hs, -0.01));
      mainHair.scale.set(1.10, 0.50, 0.94);
      const sweep = addObj(h, new BoxGeometry(0.08 * hs, 0.04 * hs, 0.08 * hs), hairL, new Vector3(-0.03 * hs, 0.19 * hs, 0.04 * hs));
      sweep.rotation.z = 0.25; sweep.rotation.x = -0.18;
      for (let i = 0; i < 3; i++) {
        addObj(h, new SphereGeometry(0.06 * hs, 10, 8), hairL, new Vector3((i - 1) * 0.05 * hs, 0.20 * hs, -0.015 * hs));
      }
      addObj(h, new SphereGeometry(0.12 * hs, 16, 12), hairM, new Vector3(0, 0.08 * hs, -0.065 * hs));
    }

    return h;
  }

  // ─── HAND — stylized with segmented fingers ───────────────
  function buildHand() {
    const hd = new Group(); hd.name = "hand";

    // Palm
    addObj(hd, new BoxGeometry(0.072, 0.042, 0.082), skinS, new Vector3(0, -0.01, 0));
    // Palm heel
    const heel = addObj(hd, new SphereGeometry(0.018, 10, 8), skinS, new Vector3(0.025, -0.018, -0.008));
    heel.scale.set(0.55, 0.45, 0.6);

    // Four fingers
    for (let f = -1; f <= 2; f++) {
      const fx = f * 0.023;
      const fingerLen = f === 2 ? 0.026 : (f === 1 ? 0.032 : (f === 0 ? 0.036 : 0.028));
      const segLen = fingerLen / 3;
      const radius = f === 2 ? 0.0055 : (f === -1 ? 0.006 : 0.007);

      addObj(hd, new CylinderGeometry(radius, radius * 0.95, segLen, 10), skinS, new Vector3(fx, -0.018, 0.032));
      addObj(hd, new CylinderGeometry(radius * 0.92, radius * 0.85, segLen, 10), skinS, new Vector3(fx, -0.018 - segLen, 0.036));
      addObj(hd, new CylinderGeometry(radius * 0.82, radius * 0.72, segLen, 10), skinS, new Vector3(fx, -0.018 - segLen * 2, 0.039));
      addObj(hd, new SphereGeometry(radius * 0.62, 7, 5), skinS, new Vector3(fx, -0.018 - segLen * 2.7, 0.042));
      addObj(hd, new SphereGeometry(radius * 1.15, 8, 6), skinS, new Vector3(fx, -0.012, 0.024));
    }

    // Thumb
    const thumbBase = addObj(hd, new CylinderGeometry(0.008, 0.009, 0.022, 10), skinS, new Vector3(0.032, -0.006, 0.01));
    thumbBase.rotation.z = -0.5;
    const thumbMid = addObj(hd, new CylinderGeometry(0.0075, 0.008, 0.024, 10), skinS, new Vector3(0.046, -0.022, 0.012));
    thumbMid.rotation.z = -0.7;
    addObj(hd, new SphereGeometry(0.007, 8, 6), skinS, new Vector3(0.058, -0.036, 0.014));

    // Wrist
    addObj(hd, new CylinderGeometry(0.028, 0.034, 0.06, 12), skinS, new Vector3(0, 0.01, -0.02));

    return hd;
  }

  // ─── FOOT — modern sneaker with neon sole ──────────────────
  function buildFoot() {
    const f = new Group(); f.name = "foot";

    // Main shoe body
    addObj(f, new BoxGeometry(0.14, 0.074, 0.21), shoeM, new Vector3(0, 0.02, 0.06));

    // Sole
    addObj(f, new BoxGeometry(0.15, 0.03, 0.22), soleM, new Vector3(0, -0.03, 0.06));

    // Neon sole stripe
    addObj(f, new BoxGeometry(0.14, 0.012, 0.21), neonP, new Vector3(0, -0.012, 0.06));

    // Heel
    addObj(f, new BoxGeometry(0.13, 0.022, 0.06), soleM, new Vector3(0, -0.012, -0.04));

    // Toe box
    const toe = addObj(f, new SphereGeometry(0.048, 13, 10), shoeM, new Vector3(0, 0.015, 0.16));
    toe.scale.set(0.82, 0.62, 0.50);

    // Toe cap
    const toeCap = addObj(f, new SphereGeometry(0.042, 10, 8), mat("#1A1A1A", { roughness: 0.20 }), new Vector3(0, 0.02, 0.14));
    toeCap.scale.set(0.78, 0.45, 0.42);

    // Heel counter
    addObj(f, new BoxGeometry(0.124, 0.06, 0.05), mat("#141414", { roughness: 0.20 }), new Vector3(0, 0.015, -0.04));

    // Midsole stripe
    const stripe = addObj(f, new BoxGeometry(0.12, 0.012, 0.16), laceM, new Vector3(0, -0.008, 0.05));
    stripe.rotation.x = 0.08;

    // Tongue
    addObj(f, new BoxGeometry(0.09, 0.03, 0.045), shoeM, new Vector3(0, 0.06, 0.04));
    addObj(f, new BoxGeometry(0.088, 0.008, 0.04), mat("#181818", { roughness: 0.22 }), new Vector3(0, 0.075, 0.04));

    // Lace area
    const laceArea = addObj(f, new BoxGeometry(0.10, 0.018, 0.07), mat("#181818", { roughness: 0.22 }), new Vector3(0, 0.055, 0.05));
    laceArea.rotation.x = 0.3;
    for (let l = 0; l < 4; l++) {
      const lx = (l - 1.5) * 0.032;
      addObj(f, new BoxGeometry(0.014, 0.004, 0.07), laceM, new Vector3(lx, 0.06 - l * 0.01, 0.055));
    }

    // Ankle collar
    addObj(f, new CylinderGeometry(0.062, 0.066, 0.06, 16), shoeM, new Vector3(0, 0.07, -0.02));
    addObj(f, new TorusGeometry(0.06, 0.012, 10, 16), mat("#181818", { roughness: 0.22 }), new Vector3(0, 0.07, -0.02));

    return f;
  }

  // ─── LOWER LEG — sculpted calf ──────────────────────────────
  function buildLowerLeg() {
    const g = new Group(); g.name = "lowerLeg";
    const len = legLen * 0.48;

    // Calf — sphere-based for natural bulge
    const calfSphere = addObj(g, new SphereGeometry(0.068, SEG, 16), pantsM, new Vector3(0, -len * 0.30, 0));
    calfSphere.scale.set(0.80, 0.72, 0.70);
    addObj(g, new CylinderGeometry(0.056, 0.062, len * 0.40, SEG), pantsM, new Vector3(0, -len * 0.55, 0));
    addObj(g, new CylinderGeometry(0.052, 0.058, len * 0.35, SEG), pantsM, new Vector3(0, -len * 0.82, 0));
    const calf = addObj(g, new SphereGeometry(0.026, 12, 10),
      new MeshStandardMaterial({ color: new Color(cloth.pants), roughness: 0.20, metalness: 0.10 }),
      new Vector3(0, -len * 0.18, -0.04));
    calf.scale.set(0.55, 0.6, 0.45);

    // Neon pant stripe down the leg seam
    const neonStripe = addObj(g, new BoxGeometry(0.012, len * 0.65, 0.04), neonS, new Vector3(0.05, -len * 0.25, -0.005));

    const f = buildFoot();
    f.position.set(0, -len - 0.01, 0.03);
    g.add(f);
    g.userData.foot = f;
    return g;
  }

  // ─── UPPER LEG — sculpted thigh shape ───────────────────────
  function buildUpperLeg() {
    const g = new Group(); g.name = "upperLeg";
    const len = legLen * 0.52;

    // Thigh — sphere-based for natural roundness
    const thighSphere = addObj(g, new SphereGeometry(0.08, SEG, 18), pantsM, new Vector3(0, -len * 0.30, 0));
    thighSphere.scale.set(0.88, 0.82, 0.75);
    addObj(g, new CylinderGeometry(0.074, 0.082, len * 0.45, SEG), pantsM, new Vector3(0, -len * 0.60, 0));
    addObj(g, new CylinderGeometry(0.066, 0.076, len * 0.35, SEG), pantsM, new Vector3(0, -len * 0.85, -0.005));
    const quad = addObj(g, new SphereGeometry(0.035, 12, 10),
      new MeshStandardMaterial({ color: new Color(cloth.pants), roughness: 0.20, metalness: 0.10 }),
      new Vector3(0, -len * 0.28, 0.068));
    quad.scale.set(0.70, 0.58, 0.32);

    const ll = buildLowerLeg();
    ll.position.set(0, -len, 0);
    g.add(ll);
    g.userData.lowerLeg = ll;
    return g;
  }

  // ─── FOREARM — sculpted ─────────────────────────────────────
  function buildForearm() {
    const g = new Group(); g.name = "forearm";
    const len = armLen * 0.48;
    // Tapered forearm using sphere + cylinder
    const faTop = addObj(g, new SphereGeometry(0.044, SEG, 14), skinM, new Vector3(0, -len * 0.15, 0));
    faTop.scale.set(0.76, 0.70, 0.65);
    addObj(g, new CylinderGeometry(0.034, 0.042, len * 0.60, SEG), skinM, new Vector3(0, -len * 0.50, 0));

    // Neon bracelet/wristband
    addObj(g, new CylinderGeometry(0.038, 0.038, 0.018, 16), neonP, new Vector3(0, -len, 0));

    const hd = buildHand();
    hd.position.set(0, -len, 0.005);
    g.add(hd);
    g.userData.hand = hd;
    return g;
  }

  // ─── UPPER ARM — sculpted bicep shape ───────────────────────
  function buildUpperArm(clothingColor) {
    const g = new Group(); g.name = "upperArm";
    const len = armLen * 0.52;
    // Sculpted bicep using sphere for natural roundness
    const bicepSphere = addObj(g, new SphereGeometry(0.054, SEG, 14),
      new MeshStandardMaterial({ color: new Color(clothingColor), roughness: 0.22, metalness: 0.10 }),
      new Vector3(0, -len * 0.20, 0));
    bicepSphere.scale.set(0.80, 0.85, 0.72);
    
    // Lower upper arm (tricep area) — tapering cylinder
    addObj(g, new CylinderGeometry(0.048, 0.054, len * 0.55, SEG),
      new MeshStandardMaterial({ color: new Color(clothingColor), roughness: 0.22, metalness: 0.10 }),
      new Vector3(0, -len * 0.50, 0));
    
    const bicep = addObj(g, new SphereGeometry(0.028, 12, 10), skinS, new Vector3(0, -len * 0.22, 0.04));
    bicep.scale.set(0.6, 0.75, 0.55);

    // Neon arm stripe
    addObj(g, new BoxGeometry(0.012, len * 0.5, 0.03), neonS, new Vector3(0.04, -len * 0.30, -0.005));

    const fa = buildForearm();
    fa.position.set(0, -len, 0);
    g.add(fa);
    g.userData.forearm = fa;
    return g;
  }

  // ─── TORSO — sculpted V-taper with layered spheres ──────────
  const torsoGroup = new Group();
  torsoGroup.name = "torso";

  const style = cloth.jacketStyle;
  const chestBase = torsoH * 0.62;
  const waistBase = torsoH * 0.12;

  // Hips/pelvis — wider sphere-based
  const hipPelvis = addObj(torsoGroup, new SphereGeometry(hipW * 0.22, SEG, 20), pantsM, new Vector3(0, waistBase, 0));
  hipPelvis.scale.set(1.0, 0.65, 0.8);

  // Lower waist — sphere sculpt
  const lw = addObj(torsoGroup, new SphereGeometry(shoulderW * 0.24, SEG, 18), shirtM, new Vector3(0, waistBase + torsoH * 0.10, 0));
  lw.scale.set(0.92, 0.55, 0.72);

  // Belt strip with neon accent
  addObj(torsoGroup, new TorusGeometry(shoulderW * 0.24, 0.016, 8, SEG),
    mat("#222224", { roughness: 0.18, metalness: 0.20 }),
    new Vector3(0, waistBase + torsoH * 0.18, 0));
  // Belt neon edge
  addObj(torsoGroup, new TorusGeometry(shoulderW * 0.242, 0.005, 6, SEG), neonP, new Vector3(0, waistBase + torsoH * 0.20, 0));

  // Mid torso — sculpted sphere
  const midTorso = addObj(torsoGroup, new SphereGeometry(shoulderW * 0.30, SEG, 22), shirtM, new Vector3(0, waistBase + torsoH * 0.30, 0));
  midTorso.scale.set(0.88, 0.70, 0.72);

  // Upper chest — broader sphere for V-taper
  const upperChest = addObj(torsoGroup, new SphereGeometry(shoulderW * 0.38, SEG, 24), shirtM, new Vector3(0, chestBase - 0.02, 0));
  upperChest.scale.set(0.90, 0.58, 0.72);

  // Pectoral definition — subtle chest plates
  for (const s of [-1, 1]) {
    const pec = addObj(torsoGroup, new SphereGeometry(shoulderW * 0.10, 14, 12), shirtM, new Vector3(s * shoulderW * 0.12, chestBase + 0.01, 0.06));
    pec.scale.set(0.65, 0.55, 0.35);
  }

  // Shoulder cap — broader for smooth arm attachment
  addObj(torsoGroup, new SphereGeometry(shoulderW * 0.22, SEG, 16), shirtAccentM, new Vector3(0, chestBase + 0.06, -0.04));

  // ── CLOTHING DETAILS per style ─────────────────────
  if (style === "track") {
    // Masculine: track jacket with neon chest triangle
    // Center zipper line
    addObj(torsoGroup, new BoxGeometry(0.01, torsoH * 0.35, 0.08), neonP, new Vector3(0, chestBase - 0.02, 0.07));
    // Chest triangle icon
    const triShape = new Shape();
    triShape.moveTo(0, 0.04); triShape.lineTo(-0.016, -0.014); triShape.lineTo(0.016, -0.014); triShape.closePath();
    const triGeo = new ShapeGeometry(triShape);
    const triMesh = new Mesh(triGeo, neonP);
    triMesh.position.set(0, chestBase + 0.06, 0.07);
    torsoGroup.add(triMesh);
  } else if (style === "crop") {
    // Feminine: cropped jacket with heartbeat pulse graphic
    const pulseShape = new Shape();
    pulseShape.moveTo(-0.018, 0); pulseShape.lineTo(-0.01, 0); pulseShape.lineTo(-0.006, -0.018); pulseShape.lineTo(-0.002, 0.018); pulseShape.lineTo(0.002, -0.006); pulseShape.lineTo(0.006, 0.012); pulseShape.lineTo(0.01, -0.014); pulseShape.lineTo(0.014, 0.008); pulseShape.lineTo(0.018, 0);
    const pulseGeo = new ShapeGeometry(pulseShape);
    const pulseMesh = new Mesh(pulseGeo, neonP);
    pulseMesh.position.set(0, chestBase + 0.05, 0.07);
    torsoGroup.add(pulseMesh);
  } else if (style === "layered") {
    // Non-Binary: triangle icon + layered shirt collar
    const triShape = new Shape();
    triShape.moveTo(0, 0.04); triShape.lineTo(-0.016, -0.014); triShape.lineTo(0.016, -0.014); triShape.closePath();
    const triGeo = new ShapeGeometry(triShape);
    const triMesh = new Mesh(triGeo, neonP);
    triMesh.position.set(0, chestBase + 0.06, 0.07);
    torsoGroup.add(triMesh);
    // Layered collar accent
    addObj(torsoGroup, new BoxGeometry(shoulderW * 0.4, 0.022, 0.04), shirtAccentM, new Vector3(0, chestBase + 0.09, 0.06));
  } else {
    // Neutral: hoodie with vertical neon piping
    for (const s of [-1, 1]) {
      addObj(torsoGroup, new BoxGeometry(0.01, torsoH * 0.5, 0.04), neonP, new Vector3(s * shoulderW * 0.14, chestBase - 0.04, 0.06));
    }
  }

  // ─── TRAPEZIUS + NECK — smooth anatomical ───────────────
  const neckGroup = new Group();
  neckGroup.name = "neck";
  neckGroup.position.set(0, chestBase + 0.08, 0);

  // Trapezius — broader shoulders-to-neck transition
  for (const s of [-1, 1]) {
    const trap = addObj(neckGroup, new SphereGeometry(0.038, 14, 12), skinS, new Vector3(s * 0.072, -0.018, -0.02));
    trap.scale.set(0.65, 0.32, 0.58);
  }

  // Neck column — slightly tapered
  addObj(neckGroup, new CylinderGeometry(0.036, 0.040, 0.12, SEG), skinM, new Vector3(0, 0.03, 0));
  // Base collar
  addObj(neckGroup, new SphereGeometry(0.045, 14, 12), skinS, new Vector3(0, -0.02, 0));

  const headGroup = buildHead();
  headGroup.position.y = 0.07;
  neckGroup.add(headGroup);
  torsoGroup.add(neckGroup);

  // ─── SHOULDERS — rounded deltoids with smooth pivots ───
  const shoulderY = chestBase + 0.01;
  const shoulderZ = -0.05;
  const armClothColor = style === "crop" ? skinHex : cloth.shirt;

  // Deltoid muscles — larger sphere for rounded shoulder
  const leftDeltoid = new Mesh(new SphereGeometry(0.07, SEG, 16), shirtM());
  leftDeltoid.position.set(-shoulderW * 0.50, shoulderY, shoulderZ);
  leftDeltoid.scale.set(0.8, 0.78, 0.68);
  torsoGroup.add(leftDeltoid);

  const rightDeltoid = new Mesh(new SphereGeometry(0.07, SEG, 16), shirtM());
  rightDeltoid.position.set(shoulderW * 0.50, shoulderY, shoulderZ);
  rightDeltoid.scale.set(0.8, 0.78, 0.68);
  torsoGroup.add(rightDeltoid);

  // Left shoulder pivot
  const leftShoulder = new Group();
  leftShoulder.name = "leftShoulder";
  leftShoulder.position.set(-shoulderW * 0.56, shoulderY - 0.04, shoulderZ - 0.01);
  const leftArm = buildUpperArm(armClothColor);
  leftShoulder.add(leftArm);
  leftShoulder.userData.arm = leftArm;
  torsoGroup.add(leftShoulder);

  // Right shoulder pivot
  const rightShoulder = new Group();
  rightShoulder.name = "rightShoulder";
  rightShoulder.position.set(shoulderW * 0.56, shoulderY - 0.04, shoulderZ - 0.01);
  const rightArm = buildUpperArm(armClothColor);
  rightShoulder.add(rightArm);
  rightShoulder.userData.arm = rightArm;
  torsoGroup.add(rightShoulder);

  // ─── HIPS ──────────────────────────────────────────────
  const pelvisY = waistBase - 0.03;
  const hipZ = -0.04;

  const leftHip = new Group();
  leftHip.name = "leftHip";
  leftHip.position.set(-hipW * 0.46, pelvisY, hipZ);
  const leftLeg = buildUpperLeg();
  leftHip.add(leftLeg);
  leftHip.userData.leg = leftLeg;
  torsoGroup.add(leftHip);

  const rightHip = new Group();
  rightHip.name = "rightHip";
  rightHip.position.set(hipW * 0.46, pelvisY, hipZ);
  const rightLeg = buildUpperLeg();
  rightHip.add(rightLeg);
  rightHip.userData.leg = rightLeg;
  torsoGroup.add(rightHip);

  // ─── SHADOW ────────────────────────────────────────────
  const sd = new Mesh(new CircleGeometry(0.22, 16), new MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.18, depthWrite: false }));
  sd.rotation.x = -Math.PI / 2; sd.position.y = -1.10; sd.name = "shadow";
  torsoGroup.add(sd);

  avatar.add(torsoGroup);
  avatar.position.set(SPAWN[0], SPAWN[1], SPAWN[2]);
  scene.add(avatar);
  return avatar;
}

// ═══════════════════════════════════════════════════════════════
// REMOTE AVATAR — optimized LOD, matching the main avatar style
// ═══════════════════════════════════════════════════════════════
export function createRemoteAvatar(scene, userId, username, avatarType, skinTone) {
  const skinHex = SKIN_COLORS[skinTone] || SKIN_COLORS.medium;
  const body = BODY_PRESETS[avatarType] || BODY_PRESETS.neutral;
  const [shoulderW, hipW, torsoH, , legLen] = body;
  const cloth = CLOTHING[avatarType] || CLOTHING.neutral;
  const RS = 24;
  const RS_SMALL = 18;

  const group = new Group();
  group.name = `remote_${userId}`;
  group.userData = { userId, lastPos: { x: 0, z: 0 }, velocity: 0, walkTime: 0, speed: 0 };

  const sMat = () => new MeshStandardMaterial({ color: new Color(skinHex), roughness: 0.40 });
  const sMatLight = () => new MeshStandardMaterial({ color: new Color(skinHex), roughness: 0.30 });
  const bMat = () => new MeshStandardMaterial({ color: new Color(cloth.shirt), roughness: 0.24, metalness: 0.08 });
  const bAccent = () => new MeshStandardMaterial({ color: new Color(cloth.shirtAccent), roughness: 0.22, metalness: 0.06 });
  const pMat = () => new MeshStandardMaterial({ color: new Color(cloth.pants), roughness: 0.28, metalness: 0.05 });
  const bltMat = () => new MeshStandardMaterial({ color: new Color("#222224"), roughness: 0.18, metalness: 0.20 });
  const eMat = () => new MeshBasicMaterial({ color: 0x080808 });
  const irisMat = () => new MeshBasicMaterial({ color: 0x5B8C5A });
  const moMat = () => new MeshBasicMaterial({ color: 0xC07060 });
  const hMat = () => new MeshStandardMaterial({ color: new Color(HAIR_BASE), roughness: 0.44 });
  const hLMat = () => new MeshStandardMaterial({ color: new Color(HAIR_LIGHT), roughness: 0.38 });
  const shoeMat = () => new MeshStandardMaterial({ color: new Color("#121214"), roughness: 0.28 });
  const soleMat = () => new MeshStandardMaterial({ color: new Color("#1A1A1A"), roughness: 0.32 });
  const neonMat = () => new MeshBasicMaterial({ color: new Color(cloth.neonPrimary), transparent: true, opacity: 0.40, depthWrite: false });

  // ─── TORSO — V-tapered ──────────────────────────────────
  const bodyY = torsoH * 0.48;
  const torso = new Mesh(new CylinderGeometry(shoulderW * 0.44, hipW * 0.36, torsoH, RS), bMat());
  torso.position.y = bodyY; torso.castShadow = true; torso.receiveShadow = true;
  group.add(torso);

  // ─── HEAD — big visible face ───────────────────────────────
  const headGroup = new Group();
  headGroup.position.y = torsoH * 0.68 + 0.38;

  const cranium = new Mesh(new SphereGeometry(0.16, 22, 18), sMat());
  cranium.scale.set(0.84, 1.06, 0.78); cranium.position.y = 0.10; cranium.castShadow = true;
  headGroup.add(cranium);

  const jaw = new Mesh(new SphereGeometry(0.09, 16, 12), sMat());
  jaw.scale.set(0.80, 0.44, 0.62); jaw.position.set(0, 0.02, 0.05);
  headGroup.add(jaw);

  const chin = new Mesh(new SphereGeometry(0.026, 10, 8), sMatLight());
  chin.scale.set(0.65, 0.45, 0.48); chin.position.set(0, -0.005, 0.08);
  headGroup.add(chin); chin.castShadow = true;

  // Cheekbones
  for (const s of [-1, 1]) {
    const cheek = new Mesh(new SphereGeometry(0.04, 10, 8), sMatLight());
    cheek.scale.set(0.68, 0.5, 0.4); cheek.position.set(s * 0.055, 0.09, 0.048);
    headGroup.add(cheek); cheek.castShadow = true;
  }

  // Eyes — big and bright
  for (const s of [-1, 1]) {
    const ex = s * 0.045;
    const eyeMesh = new Mesh(new SphereGeometry(0.035, 10, 8), new MeshBasicMaterial({ color: 0xFFFFFF }));
    eyeMesh.scale.set(0.52, 0.72, 0.28); eyeMesh.position.set(ex, 0.11, 0.07);
    headGroup.add(eyeMesh);

    const iris = new Mesh(new SphereGeometry(0.015, 8, 6), irisMat());
    iris.position.set(ex, 0.11, 0.076); headGroup.add(iris);

    const pupil = new Mesh(new SphereGeometry(0.008, 6, 4), eMat());
    pupil.position.set(ex, 0.11, 0.080); headGroup.add(pupil);

    // Eyebrow
    const brow = new Mesh(new BoxGeometry(0.05, 0.012, 0.01),
      new MeshBasicMaterial({ color: 0x3A2018 }));
    brow.position.set(ex, 0.14, 0.072); brow.rotation.z = s * 0.06;
    headGroup.add(brow);
  }

  // Nose — bigger
  const noseBridge = new Mesh(new BoxGeometry(0.02, 0.035, 0.02), sMatLight());
  noseBridge.position.set(0, 0.10, 0.078); headGroup.add(noseBridge);
  const noseTip = new Mesh(new SphereGeometry(0.022, 10, 8), sMatLight());
  noseTip.scale.set(0.65, 0.5, 0.5); noseTip.position.set(0, 0.08, 0.086);
  headGroup.add(noseTip);

  // Mouth — visible
  const upperLip = new Mesh(new BoxGeometry(0.06, 0.014, 0.008), moMat());
  upperLip.position.set(0, 0.05, 0.084); headGroup.add(upperLip);
  const lowerLip = new Mesh(new BoxGeometry(0.052, 0.016, 0.006),
    new MeshBasicMaterial({ color: 0xB06050 }));
  lowerLip.position.set(0, 0.035, 0.086); lowerLip.rotation.x = 0.12;
  headGroup.add(lowerLip);

  // Hair
  const rHair = new Mesh(new SphereGeometry(0.17, 18, 16), hMat());
  rHair.scale.set(1.08, 0.52, 0.94); rHair.position.set(0, 0.16, -0.01); rHair.castShadow = true;
  headGroup.add(rHair);
  const bangs = new Mesh(new BoxGeometry(0.09, 0.04, 0.07), hLMat());
  bangs.position.set(0, 0.20, 0.05); bangs.rotation.x = -0.22;
  headGroup.add(bangs);

  group.add(headGroup);

  // ─── NECK ───────────────────────────────────────────────
  const neckMesh = new Mesh(new CylinderGeometry(0.035, 0.04, 0.10, RS_SMALL), sMat());
  neckMesh.position.y = torsoH * 0.7 + 0.05;
  group.add(neckMesh); neckMesh.castShadow = true;

  // ─── ARMS + HANDS ──────────────────────────────────
  const armLen = body ? body[3] : 0.52;
  const armSeg = armLen * 0.52, faSeg = armLen * 0.48;
  for (const s of [-1, 1]) {
    const sx = s * shoulderW * 0.50;
    const signName = s > 0 ? "right" : "left";

    const shoulderPivot = new Group();
    shoulderPivot.name = `${signName}Shoulder`;
    shoulderPivot.position.set(sx, torsoH * 0.62, -0.05);
    group.add(shoulderPivot);

    const upperArm = new Mesh(new CylinderGeometry(0.044, 0.052, armSeg, RS_SMALL), sMat());
    upperArm.position.set(0, -armSeg / 2, 0); upperArm.castShadow = true;
    upperArm.name = `${signName}UpperArm`;
    shoulderPivot.add(upperArm);

    // Neon arm stripe
    const armStripe = new Mesh(new BoxGeometry(0.01, armSeg * 0.5, 0.025), neonMat());
    armStripe.position.set(s * 0.04, -armSeg * 0.3, -0.005);
    shoulderPivot.add(armStripe);

    const elbowPivot = new Group();
    elbowPivot.name = `${signName}Elbow`;
    elbowPivot.position.set(0, -armSeg, 0);
    shoulderPivot.add(elbowPivot);

    const forearm = new Mesh(new CylinderGeometry(0.036, 0.046, faSeg, RS_SMALL), sMat());
    forearm.position.set(0, -faSeg / 2, 0); forearm.castShadow = true;
    forearm.name = `${signName}Forearm`;
    elbowPivot.add(forearm);

    const wristPivot = new Group();
    wristPivot.name = `${signName}Wrist`;
    wristPivot.position.set(0, -faSeg, 0);
    elbowPivot.add(wristPivot);

    const hand = new Mesh(new BoxGeometry(0.06, 0.036, 0.07), sMat());
    hand.position.set(0, -0.025, 0); hand.castShadow = true;
    hand.name = `${signName}Hand`;
    wristPivot.add(hand);

    shoulderPivot.userData = { elbowPivot, wristPivot, hand };
  }

  // ─── LEGS ──────────────────────────────────────────
  const totalLegLen = legLen || 1.00;
  const thighLen = totalLegLen * 0.52, calfLen = totalLegLen * 0.48;
  for (const s of [-1, 1]) {
    const legX = s * hipW * 0.42;
    const signName = s > 0 ? "right" : "left";

    const hipPivot = new Group();
    hipPivot.name = `${signName}Hip`;
    hipPivot.position.set(legX, thighLen, -0.04);
    group.add(hipPivot);

    const thigh = new Mesh(new CylinderGeometry(0.06, 0.068, thighLen, RS_SMALL), pMat());
    thigh.position.set(0, -thighLen / 2, 0); thigh.castShadow = true;
    thigh.name = `${signName}Thigh`;
    hipPivot.add(thigh);

    // Belt/waist neon accent on hip pivot
    const beltStrip = new Mesh(new BoxGeometry(0.008, 0.04, 0.025), neonMat());
    beltStrip.position.set(0, 0.02, 0.02);
    hipPivot.add(beltStrip);

    const kneePivot = new Group();
    kneePivot.name = `${signName}Knee`;
    kneePivot.position.set(0, -thighLen, 0);
    hipPivot.add(kneePivot);

    const calf = new Mesh(new CylinderGeometry(0.044, 0.055, calfLen, RS_SMALL), pMat());
    calf.position.set(0, -calfLen / 2, 0); calf.castShadow = true;
    calf.name = `${signName}Calf`;
    kneePivot.add(calf);

    const anklePivot = new Group();
    anklePivot.name = `${signName}Ankle`;
    anklePivot.position.set(0, -calfLen, 0.02);
    kneePivot.add(anklePivot);

    const footGroup = new Group();
    footGroup.name = `${signName}Foot`;

    const shoe = new Mesh(new BoxGeometry(0.12, 0.06, 0.18), shoeMat());
    shoe.position.set(0, 0.01, 0.04); shoe.castShadow = true;
    footGroup.add(shoe);
    const sole = new Mesh(new BoxGeometry(0.13, 0.025, 0.19), soleMat());
    sole.position.set(0, -0.015, 0.04);
    footGroup.add(sole); sole.castShadow = true;
    const toe = new Mesh(new SphereGeometry(0.04, 10, 8), shoeMat());
    toe.scale.set(0.82, 0.52, 0.48); toe.position.set(0, 0.015, 0.13);
    footGroup.add(toe); toe.castShadow = true;

    anklePivot.add(footGroup);
    hipPivot.userData = { kneePivot, anklePivot, footGroup };
  }

  // ─── USERNAME ───────────────────────────────────────────
  const nc = document.createElement("canvas"); nc.width = 256; nc.height = 64;
  const ctx = nc.getContext("2d");
  ctx.font = "bold 20px 'Inter', sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.fillStyle = "rgba(255,255,255,0.9)"; ctx.fillText((username || "User").substring(0, 16), 128, 32);
  const nt = new CanvasTexture(nc); nt.minFilter = LinearFilter; nt.colorSpace = THREE.SRGBColorSpace;
  const ns = new Sprite(new SpriteMaterial({ map: nt, transparent: true, depthWrite: false, depthTest: false }));
  ns.scale.set(1.4, 0.35, 1); ns.position.y = torsoH * 0.68 + 0.60; ns.renderOrder = 999;
  group.add(ns);

  scene.add(group);
  return group;
}