import * as THREE from "three";
import { SPAWN } from "./cityData";

const {
  BoxGeometry, CircleGeometry, CylinderGeometry, SphereGeometry, Group, Mesh,
  MeshStandardMaterial, MeshBasicMaterial, Color, Vector3,
  TorusGeometry, Sprite, SpriteMaterial, CanvasTexture, LinearFilter,
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

// ─── FORTNITE-STYLE BODY PROPORTIONS ─────────────────────────
// Heroic scale: head ~1.15x, torso ~0.58, legs ~1.0 (total ~1.95 height)
// [shoulderW, hipW, torsoH, armLen, legLen, headScale, waistRatio]
const BODY_PRESETS = {
  masculine:  [0.56, 0.38, 0.60, 0.54, 1.00, 1.15, 0.62],
  feminine:   [0.48, 0.40, 0.55, 0.50, 0.96, 1.10, 0.76],
  nonbinary:  [0.52, 0.39, 0.57, 0.52, 0.98, 1.12, 0.70],
  neutral:    [0.52, 0.39, 0.57, 0.52, 0.98, 1.12, 0.70],
};

// ─── CLOTHING COLORS ─────────────────────────────────────────
const SHIRT_COLORS = { masculine: "#1A5276", feminine: "#8E44AD", nonbinary: "#2E86C1", neutral: "#2E86C1" };
const PANTS_COLORS = { masculine: "#212F3D", feminine: "#1B2631", nonbinary: "#2C3E50", neutral: "#2C3E50" };
const BELT_COLORS  = { masculine: "#3A3A3A", feminine: "#4A3040", nonbinary: "#3A3A4A", neutral: "#3A3A4A" };

// ─── HAIR COLORS ─────────────────────────────────────────────
const HAIR_BASE = "#2C1B0E";
const HAIR_LIGHT = "#3E2723";

const SEG = 16;

function mat(hexColor, opts = {}) {
  const m = new MeshStandardMaterial();
  m.color = new Color(hexColor);
  m.roughness = opts.roughness ?? 0.5;
  m.metalness = opts.metalness ?? 0.05;
  if (opts.transparent) { m.transparent = true; m.opacity = opts.opacity ?? 1; m.depthWrite = opts.depthWrite ?? true; }
  return m;
}

// ═══════════════════════════════════════════════════════════════
// FORTNITE-STYLE AVATAR — heroic proportions, detailed human
// ═══════════════════════════════════════════════════════════════
export function createAvatar(scene, opts = {}) {
  const avatarType = opts.avatarType || "neutral";
  const skinTone = opts.skinTone || "medium";
  const skinHex = SKIN_COLORS[skinTone] || SKIN_COLORS.medium;
  const body = BODY_PRESETS[avatarType] || BODY_PRESETS.neutral;
  const [shoulderW, hipW, torsoH, armLen, legLen, headScale, waistR] = body;
  const shirtColor = SHIRT_COLORS[avatarType] || SHIRT_COLORS.neutral;
  const pantsColor = PANTS_COLORS[avatarType] || PANTS_COLORS.neutral;
  const beltColor = BELT_COLORS[avatarType] || BELT_COLORS.neutral;

  const avatar = new Group();
  avatar.name = "avatar";

  // Materials
  const skinM = () => mat(skinHex, { roughness: 0.42 });
  const skinS = () => mat(skinHex, { roughness: 0.32 });
  const shirtM = () => mat(shirtColor, { roughness: 0.24, metalness: 0.06 });
  const pantsM = () => mat(pantsColor, { roughness: 0.28, metalness: 0.04 });
  const beltM = () => mat(beltColor, { roughness: 0.20, metalness: 0.15 });
  const shoeM = () => mat("#1A1A1A", { roughness: 0.28, metalness: 0.08 });
  const soleM = () => mat("#2C2C2C", { roughness: 0.30, metalness: 0.10 });
  const laceM = () => mat("#DDDDDD", { roughness: 0.35 });
  const hairM = () => mat(HAIR_BASE, { roughness: 0.44 });
  const hairL = () => mat(HAIR_LIGHT, { roughness: 0.38 });
  const eyeW = () => mat("#FFFFFF", { roughness: 0.06 });
  const irisM = () => mat("#5B8C5A", { roughness: 0.05 });
  const pupilM = () => mat("#080808", { roughness: 0.02 });
  const browM = () => mat("#3E2723", { roughness: 0.44 });
  const mouthM = () => mat("#C07060", { roughness: 0.32 });
  const mouthL = () => mat("#B06050", { roughness: 0.30 });

  function addObj(group, geo, materialOrFn, pos, casts = true) {
    const m = new Mesh(geo, typeof materialOrFn === "function" ? materialOrFn() : materialOrFn);
    m.position.copy(pos); m.castShadow = casts; m.receiveShadow = casts;
    group.add(m); return m;
  }

  // ─── HEAD — realistic human face with defined features ──
  function buildHead() {
    const h = new Group(); h.name = "head"; const hs = headScale;
    const eyeY = 0.14 * hs, eyeZ = 0.074 * hs, eyeGap = 0.034 * hs;

    // Cranium — oval with defined brow ridge
    const cranium = addObj(h, new SphereGeometry(0.10 * hs, 24, 20), skinM, new Vector3(0, 0.13 * hs, 0));
    cranium.scale.set(0.84, 1.08, 0.78);
    // Brow ridge — horizontal ridge above eyes
    const browRidge = addObj(h, new SphereGeometry(0.06 * hs, 14, 10), skinS, new Vector3(0, 0.11 * hs, 0.056 * hs));
    browRidge.scale.set(0.72, 0.18, 0.52);

    // Forehead dome
    const fh = addObj(h, new SphereGeometry(0.04 * hs, 10, 8), skinM, new Vector3(0, 0.17 * hs, 0.03 * hs));
    fh.scale.set(0.70, 0.38, 0.50);

    // Jaw — tapered, defined mandible
    const jaw = addObj(h, new SphereGeometry(0.06 * hs, 16, 12), skinM, new Vector3(0, 0.04 * hs, 0.05 * hs));
    jaw.scale.set(0.82, 0.46, 0.62);

    // Chin — pointed, distinct
    const chin = addObj(h, new SphereGeometry(0.018 * hs, 10, 8), skinS, new Vector3(0, 0.005 * hs, 0.08 * hs));
    chin.scale.set(0.65, 0.45, 0.48);

    // Jawline corners (gonion)
    for (const s of [-1, 1]) {
      const corner = addObj(h, new SphereGeometry(0.014 * hs, 8, 6), skinS, new Vector3(s * 0.052 * hs, 0.038 * hs, 0.058 * hs));
      corner.scale.set(0.55, 0.38, 0.48);
    }

    // ── CHEEKBONES — prominent zygomatic ──────────────
    for (const s of [-1, 1]) {
      const cheek = addObj(h, new SphereGeometry(0.03 * hs, 10, 8), skinS, new Vector3(s * 0.062 * hs, 0.10 * hs, 0.052 * hs));
      cheek.scale.set(0.72, 0.58, 0.44);
      // Under-cheek hollow
      const hollow = addObj(h, new SphereGeometry(0.016 * hs, 6, 5), skinS, new Vector3(s * 0.058 * hs, 0.078 * hs, 0.05 * hs));
      hollow.scale.set(0.6, 0.35, 0.4);
    }

    // ── EYE SOCKETS — defined orbital bones ──────────
    for (const s of [-1, 1]) {
      const ex = s * eyeGap;
      // Upper orbital rim
      const orbit = addObj(h, new SphereGeometry(0.018 * hs, 8, 5), skinS, new Vector3(ex, eyeY + 0.012 * hs, eyeZ - 0.004 * hs));
      orbit.scale.set(0.55, 0.22, 0.50);
    }

    // ── EYES — white + iris + pupil + highlight ──────
    for (const s of [-1, 1]) {
      const ex = s * eyeGap;

      // Eye socket indent
      const socket = addObj(h, new SphereGeometry(0.016 * hs, 8, 6), skinS, new Vector3(ex, eyeY, eyeZ - 0.002 * hs));
      socket.scale.set(0.52, 0.65, 0.25);

      const white = addObj(h, new SphereGeometry(0.018 * hs, 10, 8), eyeW, new Vector3(ex, eyeY, eyeZ));
      white.scale.set(0.56, 0.80, 0.34);

      addObj(h, new SphereGeometry(0.01 * hs, 8, 6), irisM, new Vector3(ex, eyeY, eyeZ + 0.007 * hs));
      addObj(h, new SphereGeometry(0.005 * hs, 6, 4), pupilM, new Vector3(ex, eyeY, eyeZ + 0.01 * hs));

      const hl = new Mesh(new SphereGeometry(0.0025 * hs, 3, 2), new MeshBasicMaterial({ color: 0xFFFFFF }));
      hl.position.set(ex + 0.004 * hs, eyeY + 0.006 * hs, eyeZ + 0.012 * hs);
      h.add(hl);

      // Upper eyelid
      const upperLid = addObj(h, new BoxGeometry(0.022 * hs, 0.005 * hs, 0.008 * hs), skinS, new Vector3(ex, eyeY + 0.012 * hs, eyeZ + 0.004 * hs));
      upperLid.rotation.x = -0.15;
      // Lower eyelid
      const lowerLid = addObj(h, new BoxGeometry(0.02 * hs, 0.003 * hs, 0.006 * hs), skinS, new Vector3(ex, eyeY - 0.01 * hs, eyeZ));
      lowerLid.rotation.x = 0.15;

      // Eyebrow — arched
      const brow = addObj(h, new BoxGeometry(0.038 * hs, 0.007 * hs, 0.006 * hs), browM, new Vector3(ex, eyeY + 0.028 * hs, eyeZ + 0.014 * hs));
      brow.rotation.z = s * 0.08;
      brow.rotation.x = -0.05;
    }

    // ── NOSE — bridge + tip + nostrils ─────────────────
    const noseBridge = addObj(h, new BoxGeometry(0.012 * hs, 0.026 * hs, 0.014 * hs), skinS, new Vector3(0, 0.118 * hs, 0.078 * hs));
    const noseTip = addObj(h, new SphereGeometry(0.015 * hs, 10, 8), skinS, new Vector3(0, 0.10 * hs, 0.088 * hs));
    noseTip.scale.set(0.68, 0.55, 0.55);
    // Nostrils
    for (const s of [-1, 1]) {
      const nostril = addObj(h, new SphereGeometry(0.005 * hs, 5, 4), mat("#5A3A2A", { roughness: 0.35 }), new Vector3(s * 0.009 * hs, 0.098 * hs, 0.092 * hs));
      nostril.scale.set(0.55, 0.45, 0.45);
    }
    // Nasolabial fold
    for (const s of [-1, 1]) {
      addObj(h, new BoxGeometry(0.004 * hs, 0.018 * hs, 0.003 * hs), skinS, new Vector3(s * 0.014 * hs, 0.085 * hs, 0.078 * hs));
    }

    // ── MOUTH — full lips with Cupid's bow ────────────
    // Upper lip — M shape (Cupid's bow) via three segments
    const ulCenter = addObj(h, new SphereGeometry(0.006 * hs, 6, 4), mouthM, new Vector3(0, 0.066 * hs, 0.084 * hs));
    ulCenter.scale.set(0.55, 0.45, 0.35);
    for (const s of [-1, 1]) {
      const ulSide = addObj(h, new SphereGeometry(0.007 * hs, 5, 4), mouthM, new Vector3(s * 0.016 * hs, 0.063 * hs, 0.083 * hs));
      ulSide.scale.set(0.5, 0.4, 0.35);
    }
    // Lower lip — fuller
    const lowerLip = addObj(h, new SphereGeometry(0.01 * hs, 8, 6), mouthL, new Vector3(0, 0.058 * hs, 0.085 * hs));
    lowerLip.scale.set(0.78, 0.35, 0.40);
    // Lip corners
    for (const s of [-1, 1]) {
      addObj(h, new SphereGeometry(0.003 * hs, 4, 3), mouthL, new Vector3(s * 0.02 * hs, 0.062 * hs, 0.082 * hs));
    }

    // ── EARS — detailed outer ear ─────────────────────
    for (const s of [-1, 1]) {
      const ear = addObj(h, new SphereGeometry(0.022 * hs, 10, 8), skinM, new Vector3(s * 0.088 * hs, 0.12 * hs, 0));
      ear.scale.set(0.26, 0.62, 0.42);
      // Ear lobe
      const lobe = addObj(h, new SphereGeometry(0.006 * hs, 6, 4), skinS, new Vector3(s * 0.09 * hs, 0.095 * hs, 0.005));
      lobe.scale.set(0.4, 0.5, 0.35);
    }

    // ── HAIR — layered modern style ───────────────────
    const mainHair = addObj(h, new SphereGeometry(0.108 * hs, 20, 18), hairM, new Vector3(0, 0.18 * hs, -0.01));
    mainHair.scale.set(1.08, 0.58, 0.94);
    // Side hair
    for (const s of [-1, 1]) {
      addObj(h, new SphereGeometry(0.048 * hs, 10, 8), hairL, new Vector3(s * 0.074 * hs, 0.15 * hs, 0.016));
      addObj(h, new SphereGeometry(0.042 * hs, 8, 6), hairM, new Vector3(s * 0.062 * hs, 0.19 * hs, -0.004));
    }
    // Hair bangs/fringe
    const bang = addObj(h, new BoxGeometry(0.065 * hs, 0.03 * hs, 0.074 * hs), hairL, new Vector3(0, 0.205 * hs, 0.05 * hs));
    bang.rotation.x = -0.25;
    // Back hair
    addObj(h, new SphereGeometry(0.078 * hs, 12, 10), hairM, new Vector3(0, 0.10 * hs, -0.065 * hs));
    // Crown hair
    addObj(h, new SphereGeometry(0.06 * hs, 10, 8), hairL, new Vector3(0, 0.22 * hs, -0.02 * hs));

    return h;
  }

  // ─── HAND — realistic with segmented fingers, palm, thumb ──
  function buildHand() {
    const hd = new Group(); hd.name = "hand";

    // Palm — wider at base, tapered
    const palm = addObj(hd, new BoxGeometry(0.072, 0.042, 0.082), skinS, new Vector3(0, -0.01, 0));
    // Palm heel (thenar eminence)
    const heel = addObj(hd, new SphereGeometry(0.018, 8, 6), skinS, new Vector3(0.025, -0.018, -0.008));
    heel.scale.set(0.55, 0.45, 0.6);
    // Hypothenar (pinky side pad)
    const hypo = addObj(hd, new SphereGeometry(0.016, 6, 5), skinS, new Vector3(-0.028, -0.015, -0.004));
    hypo.scale.set(0.4, 0.5, 0.55);

    // ── FOUR FINGERS — 3 segments each (proximal, middle, distal) ──
    for (let f = -1; f <= 2; f++) {
      const fx = f * 0.023;
      const fingerLen = f === 2 ? 0.026 : (f === 1 ? 0.032 : (f === 0 ? 0.036 : 0.028)); // pinky shortest, middle longest
      const segLen = fingerLen / 3;
      const radius = f === 2 ? 0.0055 : (f === -1 ? 0.006 : 0.007); // pinky thinnest

      // Proximal phalanx (from knuckle)
      addObj(hd, new CylinderGeometry(radius, radius * 0.95, segLen, 8), skinS, new Vector3(fx, -0.018, 0.032));
      // Middle phalanx
      addObj(hd, new CylinderGeometry(radius * 0.92, radius * 0.85, segLen, 8), skinS, new Vector3(fx, -0.018 - segLen, 0.036));
      // Distal phalanx
      addObj(hd, new CylinderGeometry(radius * 0.82, radius * 0.72, segLen, 8), skinS, new Vector3(fx, -0.018 - segLen * 2, 0.039));
      // Fingertip pad
      addObj(hd, new SphereGeometry(radius * 0.62, 6, 4), skinS, new Vector3(fx, -0.018 - segLen * 2.7, 0.042));

      // Knuckle
      addObj(hd, new SphereGeometry(radius * 1.15, 6, 4), skinS, new Vector3(fx, -0.012, 0.024));
    }

    // ── THUMB — 2 visible segments, rotated outward ──
    const thumbBase = addObj(hd, new CylinderGeometry(0.008, 0.009, 0.022, 8), skinS, new Vector3(0.032, -0.006, 0.01));
    thumbBase.rotation.z = -0.5;
    const thumbMid = addObj(hd, new CylinderGeometry(0.0075, 0.008, 0.024, 8), skinS, new Vector3(0.046, -0.022, 0.012));
    thumbMid.rotation.z = -0.7;
    addObj(hd, new SphereGeometry(0.007, 6, 4), skinS, new Vector3(0.058, -0.036, 0.014));

    // ── WRIST ──────────────────────────────────────────
    addObj(hd, new CylinderGeometry(0.028, 0.034, 0.06, 10), skinS, new Vector3(0, 0.01, -0.02));

    return hd;
  }

  // ─── FOOT — realistic high-top sneaker ────────────────────
  function buildFoot() {
    const f = new Group(); f.name = "foot";

    // Main shoe body — wider midfoot, tapered heel
    const body = addObj(f, new BoxGeometry(0.14, 0.074, 0.21), shoeM, new Vector3(0, 0.02, 0.06));

    // ── SOLE — thick with tread detail ────────────────
    addObj(f, new BoxGeometry(0.15, 0.03, 0.22), soleM, new Vector3(0, -0.03, 0.06));
    // Sole edge highlight
    addObj(f, new BoxGeometry(0.14, 0.01, 0.21), mat("#3A3A3A", { roughness: 0.25 }), new Vector3(0, -0.012, 0.06));
    // Heel sole — thicker at back
    addObj(f, new BoxGeometry(0.13, 0.022, 0.06), soleM, new Vector3(0, -0.012, -0.04));

    // ── TOE BOX — rounded front ────────────────────────
    const toe = addObj(f, new SphereGeometry(0.048, 10, 8), shoeM, new Vector3(0, 0.015, 0.16));
    toe.scale.set(0.82, 0.62, 0.50);
    // Toe cap overlay
    const toeCap = addObj(f, new SphereGeometry(0.042, 8, 6), mat("#252525", { roughness: 0.22 }), new Vector3(0, 0.02, 0.14));
    toeCap.scale.set(0.78, 0.45, 0.42);

    // ── HEEL COUNTER — stiffer rear section ────────────
    addObj(f, new BoxGeometry(0.124, 0.06, 0.05), mat("#1F1F1F", { roughness: 0.22 }), new Vector3(0, 0.015, -0.04));

    // ── MIDSOLE STRIPE — lateral S curve ──────────────
    const stripe = addObj(f, new BoxGeometry(0.12, 0.012, 0.16), laceM, new Vector3(0, -0.008, 0.05));
    stripe.rotation.x = 0.08;

    // ── TONGUE — padded, rises above shoe ─────────────
    addObj(f, new BoxGeometry(0.09, 0.03, 0.045), shoeM, new Vector3(0, 0.06, 0.04));
    // Tongue top edge
    addObj(f, new BoxGeometry(0.088, 0.008, 0.04), mat("#252525", { roughness: 0.22 }), new Vector3(0, 0.075, 0.04));

    // ── LACE PLACKET — diagonal lace area ──────────────
    const laceArea = addObj(f, new BoxGeometry(0.10, 0.018, 0.07), mat("#222222", { roughness: 0.22 }), new Vector3(0, 0.055, 0.05));
    laceArea.rotation.x = 0.3;
    // Individual lace cross-hatches
    for (let l = 0; l < 4; l++) {
      const lx = (l - 1.5) * 0.032;
      addObj(f, new BoxGeometry(0.014, 0.004, 0.07), laceM, new Vector3(lx, 0.06 - l * 0.01, 0.055));
    }

    // ── ANKLE COLLAR — padded rim ─────────────────────
    const collar = addObj(f, new CylinderGeometry(0.062, 0.066, 0.06, 14), shoeM, new Vector3(0, 0.07, -0.02));
    // Collar padding
    addObj(f, new TorusGeometry(0.06, 0.012, 8, 14), mat("#252525", { roughness: 0.22 }), new Vector3(0, 0.07, -0.02));

    return f;
  }

  // ─── LOWER LEG — defined calf muscle ─────────────────────
  function buildLowerLeg() {
    const g = new Group(); g.name = "lowerLeg";
    const len = legLen * 0.48;
    // Calf: sculpted, wider at upper calf
    addObj(g, new CylinderGeometry(0.058, 0.068, len, SEG), pantsM, new Vector3(0, -len / 2, 0));
    // Calf bulge
    const calf = addObj(g, new SphereGeometry(0.024, 8, 6),
      new MeshStandardMaterial({ color: new Color(pantsColor), roughness: 0.22, metalness: 0.08 }),
      new Vector3(0, -len * 0.2, -0.04));
    calf.scale.set(0.55, 0.6, 0.45);
    const f = buildFoot();
    f.position.set(0, -len - 0.01, 0.03);
    g.add(f);
    g.userData.foot = f;
    return g;
  }

  // ─── UPPER LEG — sculpted quadriceps ──────────────────────
  function buildUpperLeg() {
    const g = new Group(); g.name = "upperLeg";
    const len = legLen * 0.52;
    // Thigh: sculpted, wider at upper
    addObj(g, new CylinderGeometry(0.078, 0.088, len, SEG), pantsM, new Vector3(0, -len / 2, 0));
    // Quad definition
    const quad = addObj(g, new SphereGeometry(0.03, 8, 6),
      new MeshStandardMaterial({ color: new Color(pantsColor), roughness: 0.22, metalness: 0.08 }),
      new Vector3(0, -len * 0.3, 0.065));
    quad.scale.set(0.65, 0.55, 0.3);
    const ll = buildLowerLeg();
    ll.position.set(0, -len, 0);
    g.add(ll);
    g.userData.lowerLeg = ll;
    return g;
  }

  // ─── FOREARM ───────────────────────────────────────────────
  function buildForearm() {
    const g = new Group(); g.name = "forearm";
    const len = armLen * 0.48;
    addObj(g, new CylinderGeometry(0.036, 0.046, len, SEG), skinM, new Vector3(0, -len / 2, 0));
    const hd = buildHand();
    hd.position.set(0, -len, 0.005);
    g.add(hd);
    g.userData.hand = hd;
    return g;
  }

  // ─── UPPER ARM — bicep + tricep definition ─────────────
  function buildUpperArm() {
    const g = new Group(); g.name = "upperArm";
    const len = armLen * 0.52;
    // Bicep (wider mid-section)
    addObj(g, new CylinderGeometry(0.048, 0.058, len, SEG), skinM, new Vector3(0, -len / 2, 0));
    // Bicep bulge
    const bicep = addObj(g, new SphereGeometry(0.026, 8, 6), skinS, new Vector3(0, -len * 0.25, 0.03));
    bicep.scale.set(0.55, 0.7, 0.5);
    const fa = buildForearm();
    fa.position.set(0, -len, 0);
    g.add(fa);
    g.userData.forearm = fa;
    return g;
  }

  // ─── TORSO — sculpted V-taper with chest definition ───────
  const torsoGroup = new Group();
  torsoGroup.name = "torso";

  const chestBase = torsoH * 0.62;
  const waistBase = torsoH * 0.12;

  // Hips/pelvis
  addObj(torsoGroup, new CylinderGeometry(hipW * 0.34, hipW * 0.36, torsoH * 0.20, SEG), pantsM, new Vector3(0, waistBase, 0));

  // Lower waist
  addObj(torsoGroup, new CylinderGeometry(shoulderW * 0.30 * waistR, hipW * 0.36, torsoH * 0.16, SEG), pantsM, new Vector3(0, waistBase + torsoH * 0.12, 0));

  // Belt strip
  const belt = addObj(torsoGroup, new CylinderGeometry(shoulderW * 0.34, shoulderW * 0.32, 0.035, SEG), beltM, new Vector3(0, waistBase + torsoH * 0.20, 0));

  // Lower torso (narrowing up)
  addObj(torsoGroup, new CylinderGeometry(shoulderW * 0.35, shoulderW * 0.32, torsoH * 0.14, SEG), shirtM, new Vector3(0, waistBase + torsoH * 0.26, 0));

  // Mid torso (widening)
  addObj(torsoGroup, new CylinderGeometry(shoulderW * 0.41, shoulderW * 0.36, torsoH * 0.20, SEG), shirtM, new Vector3(0, waistBase + torsoH * 0.36, 0));

  // Upper chest — broad, pronounced pectorals
  addObj(torsoGroup, new CylinderGeometry(shoulderW * 0.46, shoulderW * 0.42, torsoH * 0.14, SEG), shirtM, new Vector3(0, chestBase - 0.04, 0));

  // Shoulder cap / trap area
  addObj(torsoGroup, new CylinderGeometry(shoulderW * 0.48, shoulderW * 0.46, 0.07, SEG), shirtM, new Vector3(0, chestBase + 0.05, 0));

  // Pectoral accent (slight chest definition)
  const pectoralL = new Mesh(new SphereGeometry(0.025, 8, 6),
    new MeshStandardMaterial({ color: new Color(shirtColor), roughness: 0.18, metalness: 0.08 }));
  pectoralL.position.set(-shoulderW * 0.12, chestBase + 0.06, 0.06);
  pectoralL.scale.set(0.7, 0.5, 0.35);
  torsoGroup.add(pectoralL);

  const pectoralR = new Mesh(new SphereGeometry(0.025, 8, 6),
    new MeshStandardMaterial({ color: new Color(shirtColor), roughness: 0.18, metalness: 0.08 }));
  pectoralR.position.set(shoulderW * 0.12, chestBase + 0.06, 0.06);
  pectoralR.scale.set(0.7, 0.5, 0.35);
  torsoGroup.add(pectoralR);

  // ─── TRAPEZIUS + NECK ───────────────────────────────────
  const neckGroup = new Group();
  neckGroup.name = "neck";
  neckGroup.position.set(0, chestBase + 0.08, 0);

  // Trapezius muscle (slopes from shoulders to neck)
  for (const s of [-1, 1]) {
    const trap = addObj(neckGroup, new SphereGeometry(0.032, 10, 8), skinS,
      new Vector3(s * 0.06, -0.015, -0.02));
    trap.scale.set(0.6, 0.35, 0.55);
  }

  addObj(neckGroup, new CylinderGeometry(0.038, 0.044, 0.13, SEG), skinM, new Vector3(0, 0.03, 0));
  addObj(neckGroup, new CylinderGeometry(0.07, 0.055, 0.025, SEG), skinS, new Vector3(0, -0.02, 0));

  const headGroup = buildHead();
  headGroup.position.y = 0.07;
  neckGroup.add(headGroup);
  torsoGroup.add(neckGroup);

  // ─── SHOULDERS — pronounced deltoids ──────────────────────
  const shoulderY = chestBase + 0.02;
  const shoulderZ = -0.06;

  // Shoulder deltoid muscles
  const leftDeltoid = new Mesh(new SphereGeometry(0.06, SEG, 12), shirtM());
  leftDeltoid.position.set(-shoulderW * 0.50, shoulderY, shoulderZ + 0.01);
  leftDeltoid.scale.set(0.8, 0.75, 0.65);
  torsoGroup.add(leftDeltoid);

  const rightDeltoid = new Mesh(new SphereGeometry(0.06, SEG, 12), shirtM());
  rightDeltoid.position.set(shoulderW * 0.50, shoulderY, shoulderZ + 0.01);
  rightDeltoid.scale.set(0.8, 0.75, 0.65);
  torsoGroup.add(rightDeltoid);

  const leftShoulder = new Group();
  leftShoulder.name = "leftShoulder";
  leftShoulder.position.set(-shoulderW * 0.56, shoulderY - 0.04, shoulderZ - 0.01);
  const leftArm = buildUpperArm();
  leftShoulder.add(leftArm);
  leftShoulder.userData.arm = leftArm;
  torsoGroup.add(leftShoulder);

  const rightShoulder = new Group();
  rightShoulder.name = "rightShoulder";
  rightShoulder.position.set(shoulderW * 0.56, shoulderY - 0.04, shoulderZ - 0.01);
  const rightArm = buildUpperArm();
  rightShoulder.add(rightArm);
  rightShoulder.userData.arm = rightArm;
  torsoGroup.add(rightShoulder);

  // ─── HIPS ──────────────────────────────────────────────────
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

  // ─── SHADOW ────────────────────────────────────────────────
  const sd = new Mesh(new CircleGeometry(0.22, 16), new MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.18, depthWrite: false }));
  sd.rotation.x = -Math.PI / 2; sd.position.y = -1.10; sd.name = "shadow";
  torsoGroup.add(sd);

  avatar.add(torsoGroup);
  avatar.position.set(SPAWN[0], SPAWN[1], SPAWN[2]);
  scene.add(avatar);
  return avatar;
}

// ═══════════════════════════════════════════════════════════════
// REMOTE AVATAR — optimized LOD matching the Fortnite-style model
// ═══════════════════════════════════════════════════════════════
export function createRemoteAvatar(scene, userId, username, avatarType, skinTone) {
  const skinHex = SKIN_COLORS[skinTone] || SKIN_COLORS.medium;
  const body = BODY_PRESETS[avatarType] || BODY_PRESETS.neutral;
  const [shoulderW, hipW, torsoH, , legLen] = body;
  const shirtColor = SHIRT_COLORS[avatarType] || SHIRT_COLORS.neutral;
  const pantsColor = PANTS_COLORS[avatarType] || PANTS_COLORS.neutral;
  const RS = 12;

  const group = new Group();
  group.name = `remote_${userId}`;
  group.userData = { userId, lastPos: { x: 0, z: 0 }, velocity: 0, walkTime: 0 };

  const sMat = () => new MeshStandardMaterial({ color: new Color(skinHex), roughness: 0.42 });
  const bMat = () => new MeshStandardMaterial({ color: new Color(shirtColor), roughness: 0.26, metalness: 0.15 });
  const pMat = () => new MeshStandardMaterial({ color: new Color(pantsColor), roughness: 0.28, metalness: 0.05 });
  const eMat = () => new MeshStandardMaterial({ color: new Color("#080808"), roughness: 0.05 });
  const irisMat = () => new MeshStandardMaterial({ color: new Color("#5B8C5A"), roughness: 0.05 });
  const moMat = () => new MeshStandardMaterial({ color: new Color("#C07060"), roughness: 0.32 });
  const hMat = () => new MeshStandardMaterial({ color: new Color(HAIR_BASE), roughness: 0.44 });
  const hLMat = () => new MeshStandardMaterial({ color: new Color(HAIR_LIGHT), roughness: 0.38 });
  const shoeMat = () => new MeshStandardMaterial({ color: new Color("#1A1A1A"), roughness: 0.28 });
  const soleMat = () => new MeshStandardMaterial({ color: new Color("#2C2C2C"), roughness: 0.30 });

  // ─── TORSO — V-tapered for heroic silhouette ──────────────
  const bodyY = torsoH * 0.48;
  const torsoGeo = new CylinderGeometry(shoulderW * 0.44, hipW * 0.36, torsoH, RS);
  const torso = new Mesh(torsoGeo, bMat());
  torso.position.y = bodyY; torso.castShadow = true; torso.receiveShadow = true;
  group.add(torso);

  // ─── HEAD — realistic face features ────────────────────────
  const headGroup = new Group();
  headGroup.position.y = torsoH * 0.68 + 0.32;

  const cranium = new Mesh(new SphereGeometry(0.096, 18, 16), sMat());
  cranium.scale.set(0.84, 1.08, 0.78); cranium.position.y = 0.10; cranium.castShadow = true;
  headGroup.add(cranium);

  const jaw = new Mesh(new SphereGeometry(0.052, 14, 10), sMat());
  jaw.scale.set(0.80, 0.46, 0.62); jaw.position.set(0, 0.03, 0.048);
  headGroup.add(jaw);

  const chin = new Mesh(new SphereGeometry(0.016, 8, 6), sMat());
  chin.scale.set(0.65, 0.45, 0.48); chin.position.set(0, 0, 0.078);
  headGroup.add(chin);
  chin.castShadow = true;

  // Cheekbones
  for (const s of [-1, 1]) {
    const cheek = new Mesh(new SphereGeometry(0.026, 8, 6), sMat());
    cheek.scale.set(0.68, 0.5, 0.4); cheek.position.set(s * 0.058, 0.095, 0.05);
    headGroup.add(cheek); cheek.castShadow = true;
  }

  // Eyes — white + iris + pupil
  for (const s of [-1, 1]) {
    const ex = s * 0.03;
    const eyeW = new Mesh(new SphereGeometry(0.016, 8, 6), new MeshStandardMaterial({ color: new Color("#FFFFFF"), roughness: 0.06 }));
    eyeW.scale.set(0.52, 0.75, 0.3); eyeW.position.set(ex, 0.11, 0.065);
    headGroup.add(eyeW);

    const iris = new Mesh(new SphereGeometry(0.008, 6, 4), irisMat());
    iris.position.set(ex, 0.11, 0.072);
    headGroup.add(iris);

    const pupil = new Mesh(new SphereGeometry(0.004, 4, 3), eMat());
    pupil.position.set(ex, 0.11, 0.074);
    headGroup.add(pupil);
  }

  // Nose
  const noseBridge = new Mesh(new BoxGeometry(0.01, 0.022, 0.012), sMat());
  noseBridge.position.set(0, 0.115, 0.075);
  headGroup.add(noseBridge); noseBridge.castShadow = true;
  const noseTip = new Mesh(new SphereGeometry(0.012, 8, 6), sMat());
  noseTip.scale.set(0.65, 0.5, 0.5); noseTip.position.set(0, 0.095, 0.084);
  headGroup.add(noseTip); noseTip.castShadow = true;

  // Mouth
  const upperLip = new Mesh(new BoxGeometry(0.036, 0.007, 0.005), moMat());
  upperLip.position.set(0, 0.062, 0.08);
  headGroup.add(upperLip);
  const lowerLip = new Mesh(new BoxGeometry(0.032, 0.009, 0.004), new MeshStandardMaterial({ color: new Color("#B06050"), roughness: 0.30 }));
  lowerLip.position.set(0, 0.054, 0.081); lowerLip.rotation.x = 0.12;
  headGroup.add(lowerLip);

  // Hair — layered
  const rHair = new Mesh(new SphereGeometry(0.098, 16, 14), hMat());
  rHair.scale.set(1.08, 0.58, 0.94); rHair.position.set(0, 0.16, -0.01); rHair.castShadow = true;
  headGroup.add(rHair);
  // Bangs
  const bangs = new Mesh(new BoxGeometry(0.06, 0.026, 0.07), hLMat());
  bangs.position.set(0, 0.20, 0.048); bangs.rotation.x = -0.22;
  headGroup.add(bangs);

  group.add(headGroup);

  // ─── NECK ─────────────────────────────────────────────────
  const neckMesh = new Mesh(new CylinderGeometry(0.035, 0.04, 0.10, 10), sMat());
  neckMesh.position.y = torsoH * 0.7 + 0.05;
  group.add(neckMesh); neckMesh.castShadow = true;

  // ─── ARMS + HANDS ─────────────────────────────────────────
  const armLen = body ? body[3] : 0.52;
  const armSeg = armLen * 0.52;
  const faSeg = armLen * 0.48;
  for (const s of [-1, 1]) {
    const sx = s * shoulderW * 0.50;
    // Upper arm — bicep
    const upperArm = new Mesh(new CylinderGeometry(0.044, 0.052, armSeg, 10), sMat());
    upperArm.position.set(sx, torsoH * 0.62 - armSeg / 2, -0.05);
    upperArm.name = s > 0 ? "rightUpperArm" : "leftUpperArm";
    group.add(upperArm); upperArm.castShadow = true;

    // Forearm
    const forearm = new Mesh(new CylinderGeometry(0.036, 0.046, faSeg, 10), sMat());
    forearm.position.set(sx, torsoH * 0.62 - armSeg - faSeg / 2, -0.05);
    group.add(forearm); forearm.castShadow = true;

    // Hand (palm + fingers simplified)
    const hand = new Mesh(new BoxGeometry(0.06, 0.036, 0.07), sMat());
    hand.position.set(sx, torsoH * 0.62 - armSeg - faSeg - 0.028, -0.05);
    group.add(hand); hand.castShadow = true;
  }

  // ─── LEGS — sculpted thighs + calves ────────────────────
  const totalLegLen = legLen || 1.00;
  const thighLen = totalLegLen * 0.52;
  const calfLen = totalLegLen * 0.48;

  for (const s of [-1, 1]) {
    const legX = s * hipW * 0.42;
    const thigh = new Mesh(new CylinderGeometry(0.06, 0.068, thighLen, 10), pMat());
    thigh.position.set(legX, thighLen / 2, -0.04); thigh.castShadow = true;
    thigh.name = s > 0 ? "rightLeg" : "leftLeg";
    group.add(thigh);

    const calf = new Mesh(new CylinderGeometry(0.044, 0.055, calfLen, 10), pMat());
    calf.position.set(legX, -calfLen / 2, -0.04); calf.castShadow = true;
    group.add(calf);

    // Detailed shoe
    const shoe = new Mesh(new BoxGeometry(0.12, 0.06, 0.18), shoeMat());
    shoe.position.set(legX, -calfLen - 0.05, 0.01); shoe.castShadow = true;
    group.add(shoe);
    // Sole
    const sole = new Mesh(new BoxGeometry(0.13, 0.025, 0.19), soleMat());
    sole.position.set(legX, -calfLen - 0.07, 0.01);
    group.add(sole); sole.castShadow = true;
    // Toe cap
    const toe = new Mesh(new SphereGeometry(0.04, 8, 6), shoeMat());
    toe.scale.set(0.82, 0.52, 0.48); toe.position.set(legX, -calfLen - 0.04, 0.10);
    group.add(toe); toe.castShadow = true;
  }

  // ─── USERNAME ─────────────────────────────────────────────
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