/**
 * AvatarModel — Low-Poly Stylized Human Avatar
 *
 * Built with custom BufferGeometry meshes that form natural human shapes.
 * No sphere shoulders, no tube arms, no box torso.
 * Joint names match CityCanvas animation system exactly.
 */

import * as THREE from "three";
import { SPAWN } from "./cityData";

// ─── SKIN TONES ───────────────────────────────────────────────
const SKIN = {
  "light":        "#FDEBD3",
  "medium-light": "#F0C490",
  "medium":       "#C8864A",
  "medium-dark":  "#9A6038",
  "dark":         "#6B3A22",
  "deep":         "#3E2018",
};

// ─── OUTFIT COLORS ────────────────────────────────────────────
const CLOTH = {
  masculine: { top: "#1A3A8A", pants: "#0E0E1C", shoe: "#0C0C18", shoeSole: "#181820", accent: "#00E5FF" },
  feminine:  { top: "#55106E", pants: "#0E0E1C", shoe: "#0C0C18", shoeSole: "#181820", accent: "#E040FB" },
  nonbinary: { top: "#162868", pants: "#0E0E1C", shoe: "#0C0C18", shoeSole: "#181820", accent: "#A078FF" },
  neutral:   { top: "#1A3A8A", pants: "#0E0E1C", shoe: "#0C0C18", shoeSole: "#181820", accent: "#00D4F0" },
};

const HAIR_COLOR = {
  masculine: "#1A0E08",
  feminine:  "#160808",
  nonbinary: "#261408",
  neutral:   "#1A0E08",
};

// ─── MATERIAL FACTORY ─────────────────────────────────────────
function M(hex, rough = 0.55, metal = 0.04) {
  return new THREE.MeshStandardMaterial({ color: new THREE.Color(hex), roughness: rough, metalness: metal });
}
function BM(hex, opts = {}) {
  return new THREE.MeshBasicMaterial({ color: new THREE.Color(hex), ...opts });
}

// ─── FACE CANVAS TEXTURE ──────────────────────────────────────
function makeFace(skinHex, type) {
  const sz = 256;
  const c = document.createElement("canvas");
  c.width = c.height = sz;
  const x = c.getContext("2d");

  // Skin fill
  x.fillStyle = skinHex;
  x.fillRect(0, 0, sz, sz);

  // Jaw shadow
  const jg = x.createLinearGradient(0, sz * 0.4, 0, sz);
  jg.addColorStop(0, "rgba(0,0,0,0)");
  jg.addColorStop(1, "rgba(0,0,0,0.22)");
  x.fillStyle = jg; x.fillRect(0, 0, sz, sz);

  // Forehead highlight
  const fg = x.createLinearGradient(0, 0, 0, sz * 0.28);
  fg.addColorStop(0, "rgba(255,255,255,0.10)");
  fg.addColorStop(1, "rgba(255,255,255,0)");
  x.fillStyle = fg; x.fillRect(0, 0, sz, sz);

  const isFem = type === "feminine";
  const eyeY = sz * 0.44, eyeW = sz * 0.115, eyeH = sz * 0.082;
  const eyes = [sz * 0.345, sz * 0.655];

  eyes.forEach(ex => {
    // White
    x.fillStyle = "#F0EBE3";
    x.beginPath(); x.ellipse(ex, eyeY, eyeW, eyeH, 0, 0, Math.PI * 2); x.fill();
    // Iris
    x.fillStyle = isFem ? "#4A6888" : "#38584A";
    x.beginPath(); x.ellipse(ex, eyeY, eyeW * 0.60, eyeH * 0.80, 0, 0, Math.PI * 2); x.fill();
    // Pupil
    x.fillStyle = "#080606";
    x.beginPath(); x.ellipse(ex, eyeY, eyeW * 0.30, eyeH * 0.44, 0, 0, Math.PI * 2); x.fill();
    // Highlight
    x.fillStyle = "rgba(255,255,255,0.82)";
    x.beginPath(); x.ellipse(ex - eyeW * 0.14, eyeY - eyeH * 0.24, eyeW * 0.09, eyeH * 0.11, 0, 0, Math.PI * 2); x.fill();
    // Upper lid
    x.strokeStyle = "#1E0E08"; x.lineWidth = isFem ? 3.5 : 2.8; x.lineCap = "round";
    x.beginPath(); x.moveTo(ex - eyeW, eyeY + eyeH * 0.08);
    x.quadraticCurveTo(ex, eyeY - eyeH * 1.10, ex + eyeW, eyeY + eyeH * 0.08); x.stroke();
    // Lower lash
    x.strokeStyle = "rgba(80,40,20,0.5)"; x.lineWidth = 1.5;
    x.beginPath(); x.moveTo(ex - eyeW * 0.88, eyeY + eyeH * 0.18);
    x.quadraticCurveTo(ex, eyeY + eyeH * 0.95, ex + eyeW * 0.88, eyeY + eyeH * 0.18); x.stroke();
  });

  // Brows
  const browY = eyeY - eyeH * 2.0;
  [[eyes[0], -0.08], [eyes[1], 0.08]].forEach(([bx, tilt]) => {
    x.strokeStyle = HAIR_COLOR[type] || "#1A0E08"; x.lineWidth = isFem ? 2.8 : 4.2; x.lineCap = "round";
    x.beginPath(); x.moveTo(bx - eyeW * 1.08, browY + sz * Math.abs(tilt) * 0.07);
    x.quadraticCurveTo(bx, browY - sz * 0.010, bx + eyeW * 1.08, browY + sz * Math.abs(tilt) * 0.07); x.stroke();
  });

  // Nose
  const nX = sz * 0.5, nY = sz * 0.60;
  x.strokeStyle = "rgba(0,0,0,0.14)"; x.lineWidth = 2;
  x.beginPath(); x.moveTo(nX, sz * 0.475); x.lineTo(nX, nY - sz * 0.015); x.stroke();
  x.fillStyle = "rgba(0,0,0,0.16)";
  x.beginPath(); x.ellipse(nX - sz * 0.052, nY, sz * 0.032, sz * 0.020, 0.15, 0, Math.PI * 2); x.fill();
  x.beginPath(); x.ellipse(nX + sz * 0.052, nY, sz * 0.032, sz * 0.020, -0.15, 0, Math.PI * 2); x.fill();

  // Mouth
  const mX = sz * 0.5, mY = sz * 0.73, mW = isFem ? sz * 0.105 : sz * 0.120;
  const lipDark = new THREE.Color(skinHex).multiplyScalar(0.62).getStyle();
  const lipLight = new THREE.Color(skinHex).multiplyScalar(0.78).getStyle();
  x.strokeStyle = lipDark; x.lineWidth = 2.2; x.lineCap = "round";
  x.beginPath(); x.moveTo(mX - mW, mY); x.quadraticCurveTo(mX, mY + sz * 0.007, mX + mW, mY); x.stroke();
  x.fillStyle = lipDark;
  x.beginPath(); x.moveTo(mX - mW, mY);
  x.quadraticCurveTo(mX - mW * 0.35, mY - sz * 0.028, mX, mY - sz * 0.010);
  x.quadraticCurveTo(mX + mW * 0.35, mY - sz * 0.028, mX + mW, mY);
  x.quadraticCurveTo(mX, mY + sz * 0.007, mX - mW, mY); x.fill();
  x.fillStyle = lipLight;
  x.beginPath(); x.moveTo(mX - mW, mY);
  x.quadraticCurveTo(mX, mY + sz * 0.034, mX + mW, mY);
  x.quadraticCurveTo(mX, mY + sz * 0.011, mX - mW, mY); x.fill();

  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.minFilter = t.magFilter = THREE.LinearFilter;
  return t;
}

// ─── LATHE-BASED TORSO PROFILE ────────────────────────────────
// Creates a smooth organic torso shape using LatheGeometry
function makeTorso(type, topHex) {
  // Profile points [radius, y] — shoulder→waist→hip
  let pts;
  if (type === "masculine") {
    pts = [
      [0.155, 0.52], // shoulders
      [0.148, 0.46],
      [0.140, 0.38],
      [0.118, 0.28], // pec-waist
      [0.108, 0.18], // waist
      [0.114, 0.08], // hip swell
      [0.122, 0.00], // hip base
    ];
  } else if (type === "feminine") {
    pts = [
      [0.138, 0.52],
      [0.132, 0.46],
      [0.122, 0.38],
      [0.104, 0.28],
      [0.095, 0.18], // waist (narrower)
      [0.118, 0.08], // hip swell (wider)
      [0.128, 0.00],
    ];
  } else {
    pts = [
      [0.145, 0.52],
      [0.138, 0.46],
      [0.130, 0.38],
      [0.110, 0.28],
      [0.100, 0.18],
      [0.114, 0.08],
      [0.122, 0.00],
    ];
  }

  const points = pts.map(([r, y]) => new THREE.Vector2(r, y));
  const geo = new THREE.LatheGeometry(points, 16);
  geo.computeVertexNormals();
  const mesh = new THREE.Mesh(geo, M(topHex, 0.55, 0.06));
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

// ─── LATHE-BASED LIMB ─────────────────────────────────────────
// Creates a smooth tapered limb using LatheGeometry (better than cylinder)
function makeLimb(topR, botR, length, hex, rough = 0.52, segs = 10) {
  const pts = [];
  const steps = 6;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    // Slight natural bulge in the middle (muscle)
    const bulge = Math.sin(t * Math.PI) * 0.012;
    const r = topR * (1 - t) + botR * t + bulge;
    pts.push(new THREE.Vector2(r, length * (1 - t)));
  }
  const geo = new THREE.LatheGeometry(pts, 10);
  geo.computeVertexNormals();
  const mesh = new THREE.Mesh(geo, M(hex, rough, 0.02));
  mesh.castShadow = true;
  return mesh;
}

// ─── HEAD ──────────────────────────────────────────────────────
// Uses LatheGeometry profile for a natural head shape (not a sphere)
function makeHead(skinHex, type) {
  const group = new THREE.Group();
  group.name = "headGroup";

  // ── Skull — LatheGeometry profile (egg-shaped, not sphere)
  const skullPts = [
    new THREE.Vector2(0, 0.115),      // top
    new THREE.Vector2(0.062, 0.105),
    new THREE.Vector2(0.100, 0.082),  // temple
    new THREE.Vector2(0.108, 0.052),  // cheekbone width
    new THREE.Vector2(0.104, 0.022),
    new THREE.Vector2(0.088, -0.010), // jaw
    new THREE.Vector2(0.072, -0.035),
    new THREE.Vector2(0.042, -0.058), // chin
    new THREE.Vector2(0, -0.065),
  ];
  const skullGeo = new THREE.LatheGeometry(skullPts, 16);
  skullGeo.computeVertexNormals();
  const skull = new THREE.Mesh(skullGeo, M(skinHex, 0.54, 0.0));
  skull.castShadow = true;
  group.add(skull);

  // ── Face texture plane — flat disc mapped to front of head only
  // Use a PlaneGeometry so it only appears on the front face
  const facePlaneGeo = new THREE.PlaneGeometry(0.168, 0.188, 6, 8);
  // Slightly curve the plane by displacing vertices to conform to skull
  const fPos = facePlaneGeo.attributes.position;
  for (let i = 0; i < fPos.count; i++) {
    const x = fPos.getX(i), y = fPos.getY(i);
    const r = Math.sqrt(x * x + y * y) / 0.09;
    fPos.setZ(i, 0.090 - r * r * 0.012); // slight concave bow
  }
  facePlaneGeo.computeVertexNormals();
  const faceMesh = new THREE.Mesh(facePlaneGeo, new THREE.MeshBasicMaterial({
    map: makeFace(skinHex, type),
    transparent: false,
    depthWrite: true,
    side: THREE.FrontSide,
  }));
  faceMesh.position.set(0, 0, 0.058);
  faceMesh.renderOrder = 2;
  group.add(faceMesh);

  // ── Ears — small flatten ellipse
  [-1, 1].forEach(s => {
    const earPts = [
      new THREE.Vector2(0, 0.020),
      new THREE.Vector2(0.018, 0.012),
      new THREE.Vector2(0.022, 0),
      new THREE.Vector2(0.018, -0.012),
      new THREE.Vector2(0, -0.020),
    ];
    const earGeo = new THREE.LatheGeometry(earPts, 8);
    earGeo.computeVertexNormals();
    const ear = new THREE.Mesh(earGeo, M(new THREE.Color(skinHex).multiplyScalar(0.88).getStyle(), 0.58, 0));
    ear.position.set(s * 0.105, 0.010, 0);
    ear.rotation.y = s * Math.PI * 0.48;
    ear.scale.set(0.45, 1.0, 0.55);
    group.add(ear);
  });

  // ── Nose protrusion
  const nosePts = [
    new THREE.Vector2(0, 0.010),
    new THREE.Vector2(0.014, 0.005),
    new THREE.Vector2(0.016, -0.006),
    new THREE.Vector2(0.010, -0.016),
    new THREE.Vector2(0, -0.018),
  ];
  const noseGeo = new THREE.LatheGeometry(nosePts, 8);
  const nose = new THREE.Mesh(noseGeo, M(new THREE.Color(skinHex).multiplyScalar(0.82).getStyle(), 0.60, 0));
  nose.position.set(0, -0.006, 0.088);
  nose.rotation.x = 0.38;
  nose.scale.set(0.72, 0.55, 0.55);
  group.add(nose);

  // ── Hair
  buildHair(group, type, skinHex);

  return group;
}

// ─── HAIR STYLES ──────────────────────────────────────────────
function buildHair(parent, type, skinHex) {
  const hc = HAIR_COLOR[type] || HAIR_COLOR.neutral;
  const hm = M(hc, 0.78, 0.0);
  const hm2 = M(new THREE.Color(hc).multiplyScalar(1.18).getStyle(), 0.72, 0.0);

  if (type === "masculine" || type === "neutral") {
    // ── LOW FADE with short textured top ──────────────────────

    // Tight side shell — thin slice from ear level up (fade effect)
    const sideProfile = [
      new THREE.Vector2(0, 0.108),   // crown center
      new THREE.Vector2(0.068, 0.095),
      new THREE.Vector2(0.106, 0.068), // temple
      new THREE.Vector2(0.110, 0.040), // side max
      new THREE.Vector2(0.108, 0.010),
      new THREE.Vector2(0.100, -0.015),
      new THREE.Vector2(0.082, -0.032),
      new THREE.Vector2(0.055, -0.040),
      new THREE.Vector2(0, -0.040),  // nape center
    ];
    const sideHairGeo = new THREE.LatheGeometry(sideProfile.slice(0, 7), 16);
    sideHairGeo.computeVertexNormals();
    const sideHair = new THREE.Mesh(sideHairGeo, hm);
    sideHair.scale.set(1.015, 1.01, 1.015);
    parent.add(sideHair);

    // Top volume — shaped dome with textured height variation
    const topProfile = [
      new THREE.Vector2(0, 0.122),
      new THREE.Vector2(0.032, 0.120),
      new THREE.Vector2(0.060, 0.110),
      new THREE.Vector2(0.082, 0.090),
      new THREE.Vector2(0.090, 0.068),
    ];
    const topGeo = new THREE.LatheGeometry(topProfile, 16);
    topGeo.computeVertexNormals();
    const topHair = new THREE.Mesh(topGeo, hm2);
    topHair.position.y = 0.010;
    parent.add(topHair);

    // Front wave — textured bump at hairline
    const wavePts = [
      new THREE.Vector2(0.025, 0.112),
      new THREE.Vector2(0.058, 0.108),
      new THREE.Vector2(0.082, 0.096),
      new THREE.Vector2(0.090, 0.078),
    ];
    const waveGeo = new THREE.LatheGeometry(wavePts, 12);
    const wave = new THREE.Mesh(waveGeo, hm2);
    wave.position.set(0, 0.005, 0.018);
    wave.scale.set(0.90, 1.0, 0.52);
    parent.add(wave);

    // Hairline detail — front fringe strip
    const fringe = new THREE.Mesh(
      new THREE.SphereGeometry(0.060, 8, 5, 0, Math.PI * 2, 0, Math.PI * 0.38),
      hm
    );
    fringe.position.set(0, 0.070, 0.078);
    fringe.scale.set(1.02, 0.38, 0.55);
    parent.add(fringe);

    // Nape back
    const napeGeo = new THREE.SphereGeometry(0.058, 8, 6, 0, Math.PI * 2, Math.PI * 0.52, Math.PI * 0.38);
    const nape = new THREE.Mesh(napeGeo, hm);
    nape.position.set(0, -0.022, -0.058);
    nape.scale.set(0.88, 0.48, 0.42);
    parent.add(nape);

  } else if (type === "feminine") {
    // ── SOFT WAVES shoulder-length ─────────────────────────────

    // Main cap following head shape
    const capProfile = [
      new THREE.Vector2(0, 0.118),
      new THREE.Vector2(0.040, 0.116),
      new THREE.Vector2(0.072, 0.108),
      new THREE.Vector2(0.100, 0.090),
      new THREE.Vector2(0.114, 0.062),
      new THREE.Vector2(0.115, 0.028),
      new THREE.Vector2(0.112, -0.002),
      new THREE.Vector2(0.102, -0.028),
      new THREE.Vector2(0.080, -0.055),
    ];
    const capGeo = new THREE.LatheGeometry(capProfile, 16);
    capGeo.computeVertexNormals();
    const cap = new THREE.Mesh(capGeo, hm);
    cap.scale.set(1.02, 1.01, 1.02);
    parent.add(cap);

    // Bangs — soft fringe sweeping forward
    const bangsGeo = new THREE.SphereGeometry(0.065, 10, 6, 0, Math.PI * 2, 0, Math.PI * 0.35);
    const bangs = new THREE.Mesh(bangsGeo, hm2);
    bangs.position.set(-0.018, 0.066, 0.080);
    bangs.scale.set(0.95, 0.38, 0.50);
    bangs.rotation.x = -0.18;
    parent.add(bangs);

    // Side volume — falls past jaw level
    [-1, 1].forEach(s => {
      const sideVol = new THREE.Mesh(
        new THREE.SphereGeometry(0.055, 9, 7),
        hm
      );
      sideVol.position.set(s * 0.095, -0.010, 0.010);
      sideVol.scale.set(0.35, 1.05, 0.70);
      parent.add(sideVol);

      // Lower side strand
      const lowStrand = new THREE.Mesh(
        new THREE.SphereGeometry(0.042, 8, 6),
        hm
      );
      lowStrand.position.set(s * 0.082, -0.090, -0.015);
      lowStrand.scale.set(0.34, 0.78, 0.52);
      parent.add(lowStrand);
    });

    // Back volume — shoulder-length
    const back1 = new THREE.Mesh(new THREE.SphereGeometry(0.075, 10, 8), hm);
    back1.position.set(0, -0.032, -0.078);
    back1.scale.set(0.90, 0.88, 0.42);
    parent.add(back1);

    const back2 = new THREE.Mesh(new THREE.SphereGeometry(0.058, 9, 7), hm);
    back2.position.set(0, -0.110, -0.068);
    back2.scale.set(0.78, 0.82, 0.40);
    parent.add(back2);

  } else {
    // ── NON-BINARY — medium textured natural ──────────────────

    const nbProfile = [
      new THREE.Vector2(0, 0.120),
      new THREE.Vector2(0.038, 0.118),
      new THREE.Vector2(0.068, 0.110),
      new THREE.Vector2(0.098, 0.092),
      new THREE.Vector2(0.112, 0.062),
      new THREE.Vector2(0.113, 0.030),
      new THREE.Vector2(0.108, 0.002),
      new THREE.Vector2(0.096, -0.022),
    ];
    const nbGeo = new THREE.LatheGeometry(nbProfile, 14);
    nbGeo.computeVertexNormals();
    const nbCap = new THREE.Mesh(nbGeo, hm);
    nbCap.scale.set(1.02, 1.01, 1.02);
    parent.add(nbCap);

    // Side swoop
    const swoopGeo = new THREE.SphereGeometry(0.058, 9, 6, 0, Math.PI * 2, 0, Math.PI * 0.36);
    const swoop = new THREE.Mesh(swoopGeo, hm2);
    swoop.position.set(-0.020, 0.062, 0.075);
    swoop.scale.set(0.92, 0.36, 0.50);
    parent.add(swoop);

    [-1, 1].forEach(s => {
      const sv = new THREE.Mesh(new THREE.SphereGeometry(0.052, 8, 6), hm);
      sv.position.set(s * 0.092, -0.005, 0.008);
      sv.scale.set(0.35, 0.92, 0.68);
      parent.add(sv);
    });

    const backNB = new THREE.Mesh(new THREE.SphereGeometry(0.068, 9, 7), hm);
    backNB.position.set(0, -0.020, -0.072);
    backNB.scale.set(0.88, 0.78, 0.42);
    parent.add(backNB);
  }
}

// ─── NECK ─────────────────────────────────────────────────────
function makeNeck(skinHex) {
  const pts = [
    new THREE.Vector2(0.036, 0.10),
    new THREE.Vector2(0.034, 0.05),
    new THREE.Vector2(0.032, 0.00),
  ];
  const geo = new THREE.LatheGeometry(pts, 10);
  geo.computeVertexNormals();
  const m = new THREE.Mesh(geo, M(skinHex, 0.52, 0));
  m.castShadow = true;
  return m;
}

// ─── SHOE ─────────────────────────────────────────────────────
function makeShoe(hex, soleHex, accentHex) {
  const g = new THREE.Group();

  // Shoe upper — tapered box with rounded look via shaping
  const upperPts = [
    new THREE.Vector2(0, 0.044),
    new THREE.Vector2(0.030, 0.042),
    new THREE.Vector2(0.040, 0.035),
    new THREE.Vector2(0.042, 0.022),
    new THREE.Vector2(0.040, 0.010),
    new THREE.Vector2(0.030, 0.004),
    new THREE.Vector2(0, 0.003),
  ];
  // Use a BoxGeometry shaped like a shoe via scale — more natural than a capsule
  const upper = new THREE.Mesh(
    new THREE.BoxGeometry(0.088, 0.044, 0.168),
    M(hex, 0.52, 0.06)
  );
  upper.position.set(0, 0.022, 0.025);
  // Round the toe by taper — scale front vertices down
  upper.castShadow = true;
  g.add(upper);

  // Toe cap — sphere to soften the front
  const toe = new THREE.Mesh(
    new THREE.SphereGeometry(0.034, 8, 6),
    M(hex, 0.50, 0.06)
  );
  toe.position.set(0, 0.018, 0.126);
  toe.scale.set(0.80, 0.55, 0.50);
  toe.castShadow = true;
  g.add(toe);

  // Sole
  const sole = new THREE.Mesh(
    new THREE.BoxGeometry(0.092, 0.014, 0.172),
    M(soleHex, 0.65, 0.04)
  );
  sole.position.set(0, -0.005, 0.025);
  g.add(sole);

  // Heel wedge
  const heel = new THREE.Mesh(
    new THREE.BoxGeometry(0.088, 0.018, 0.048),
    M(soleHex, 0.65, 0.04)
  );
  heel.position.set(0, 0.001, -0.038);
  g.add(heel);

  // Accent stripe
  const stripe = new THREE.Mesh(
    new THREE.BoxGeometry(0.086, 0.006, 0.024),
    BM(accentHex, { transparent: true, opacity: 0.80, depthWrite: false })
  );
  stripe.position.set(0, 0.040, 0.068);
  g.add(stripe);

  return g;
}

// ─── HAND ─────────────────────────────────────────────────────
function makeHand(skinHex) {
  const g = new THREE.Group();
  const sm = M(skinHex, 0.50, 0);

  // Palm — slightly rounded box
  const palm = new THREE.Mesh(new THREE.BoxGeometry(0.054, 0.026, 0.056), sm);
  palm.castShadow = true;
  g.add(palm);

  // Fingers — 4 slightly tapered stubs
  for (let f = 0; f < 4; f++) {
    const fx = (f - 1.5) * 0.0130;
    const fl = (f === 0 || f === 3) ? 0.026 : 0.033;
    const pts = [
      new THREE.Vector2(0.0048, fl),
      new THREE.Vector2(0.0045, fl * 0.5),
      new THREE.Vector2(0.0042, 0),
    ];
    const fGeo = new THREE.LatheGeometry(pts, 6);
    const finger = new THREE.Mesh(fGeo, sm);
    finger.position.set(fx, 0, 0.028 + fl * 0.5);
    finger.rotation.x = 0.18;
    g.add(finger);
  }

  // Thumb — angled stub
  const thumbPts = [
    new THREE.Vector2(0.0055, 0.025),
    new THREE.Vector2(0.0050, 0.012),
    new THREE.Vector2(0.0046, 0),
  ];
  const thumb = new THREE.Mesh(new THREE.LatheGeometry(thumbPts, 6), sm);
  thumb.position.set(0.030, 0.002, 0.010);
  thumb.rotation.z = -0.55;
  thumb.rotation.y = -0.40;
  g.add(thumb);

  return g;
}

// ═══════════════════════════════════════════════════════════════
// createAvatar — LOCAL PLAYER (full detail)
// ═══════════════════════════════════════════════════════════════
export function createAvatar(scene, opts = {}) {
  const type  = opts.avatarType || "neutral";
  const tone  = opts.skinTone   || "medium";
  const skin  = SKIN[tone]      || SKIN.medium;
  const C     = CLOTH[type]     || CLOTH.neutral;

  // Limb lengths
  const uArmL = 0.220, fArmL = 0.200;
  const thighL = 0.270, shinL = 0.240;

  const avatar = new THREE.Group();
  avatar.name = "avatar";

  // ─── TORSO ────────────────────────────────────────────────
  const torso = new THREE.Group();
  torso.name = "torso";
  avatar.add(torso);

  const torsoMesh = makeTorso(type, C.top);
  torso.add(torsoMesh);

  // Belt
  const belt = new THREE.Mesh(
    new THREE.CylinderGeometry(0.118, 0.118, 0.032, 16),
    M("#1E1E2C", 0.42, 0.28)
  );
  belt.position.y = 0.024;
  torso.add(belt);

  const buckle = new THREE.Mesh(
    new THREE.BoxGeometry(0.044, 0.038, 0.014),
    M("#C8A840", 0.28, 0.55)
  );
  buckle.position.set(0, 0.024, 0.118);
  torso.add(buckle);

  // Neon chest accent line
  const accentLine = new THREE.Mesh(
    new THREE.BoxGeometry(0.010, 0.180, 0.010),
    BM(C.accent, { transparent: true, opacity: 0.72, depthWrite: false })
  );
  accentLine.position.set(0, 0.30, 0.140);
  torso.add(accentLine);

  // Shadow blob
  const shadow = new THREE.Mesh(
    new THREE.CircleGeometry(0.20, 14),
    new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.18, depthWrite: false })
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = -(thighL + shinL + 0.04);
  torso.add(shadow);

  // ─── NECK ─────────────────────────────────────────────────
  const neckGroup = new THREE.Group();
  neckGroup.name = "neck";
  neckGroup.position.set(0, 0.520, 0);
  torso.add(neckGroup);
  neckGroup.add(makeNeck(skin));

  // ─── HEAD ─────────────────────────────────────────────────
  const headPivot = new THREE.Group();
  headPivot.name = "head";
  headPivot.position.set(0, 0.098, 0);
  neckGroup.add(headPivot);
  headPivot.add(makeHead(skin, type));

  // ─── ARMS ─────────────────────────────────────────────────
  const shoulderY  = 0.460;
  const shoulderXs = type === "masculine" ? 0.168 : type === "feminine" ? 0.148 : 0.158;

  [-1, 1].forEach(s => {
    const side = s > 0 ? "right" : "left";

    // Shoulder socket — smooth organic joint (no sphere ball)
    const shoulderSocket = new THREE.Mesh(
      new THREE.SphereGeometry(0.042, 10, 8),
      M(C.top, 0.52, 0.06)
    );
    shoulderSocket.scale.set(0.80, 0.70, 0.82);
    shoulderSocket.position.set(s * (shoulderXs + 0.025), shoulderY, 0);
    torso.add(shoulderSocket);

    // Shoulder pivot
    const sPivot = new THREE.Group();
    sPivot.name = side + "Shoulder";
    sPivot.position.set(s * (shoulderXs + 0.030), shoulderY, 0);
    torso.add(sPivot);

    // Upper arm — lathe (shirt-sleeved, tapers toward elbow)
    const uArm = makeLimb(0.032, 0.026, uArmL, C.top, 0.52);
    uArm.position.y = -uArmL;
    uArm.rotation.x = Math.PI; // flip so top is at pivot
    sPivot.add(uArm);

    // Elbow bump — soft joint, not a ball
    const ePivot = new THREE.Group();
    ePivot.name = side + "Elbow";
    ePivot.position.set(0, -uArmL, 0);
    sPivot.add(ePivot);

    const elbowJoint = new THREE.Mesh(
      new THREE.SphereGeometry(0.024, 8, 6),
      M(skin, 0.56, 0)
    );
    elbowJoint.scale.set(0.85, 0.78, 0.88);
    ePivot.add(elbowJoint);

    // Forearm — lathe (skin, tapers toward wrist)
    const fArm = makeLimb(0.026, 0.020, fArmL, skin, 0.50);
    fArm.position.y = -fArmL;
    fArm.rotation.x = Math.PI;
    ePivot.add(fArm);

    // Wrist pivot
    const wPivot = new THREE.Group();
    wPivot.name = side + "Wrist";
    wPivot.position.set(0, -fArmL, 0);
    ePivot.add(wPivot);

    const handG = makeHand(skin);
    handG.name = side + "Hand";
    wPivot.add(handG);

    // Store userData refs for animation system
    sPivot.userData.arm = { userData: { forearm: ePivot } };
    ePivot.userData.forearm = ePivot;
    ePivot.userData.hand = handG;
  });

  // ─── LEGS ─────────────────────────────────────────────────
  const hipXs = type === "masculine" ? 0.108 : type === "feminine" ? 0.115 : 0.110;

  [-1, 1].forEach(s => {
    const side = s > 0 ? "right" : "left";

    const hPivot = new THREE.Group();
    hPivot.name = side + "Hip";
    hPivot.position.set(s * hipXs, thighL, -0.008);
    torso.add(hPivot);

    // Thigh — lathe, widest at hip, tapers to knee
    const thigh = makeLimb(0.054, 0.040, thighL, C.pants, 0.58);
    thigh.position.y = -thighL;
    thigh.rotation.x = Math.PI;
    hPivot.add(thigh);

    // Knee pivot
    const kPivot = new THREE.Group();
    kPivot.name = side + "Knee";
    kPivot.position.set(0, -thighL, 0);
    hPivot.add(kPivot);

    // Knee joint — subtle bump
    const kneeJoint = new THREE.Mesh(
      new THREE.SphereGeometry(0.036, 8, 6),
      M(C.pants, 0.58, 0.02)
    );
    kneeJoint.scale.set(0.88, 0.78, 0.82);
    kneeJoint.position.z = 0.008;
    kPivot.add(kneeJoint);

    // Shin — lathe, tapers strongly
    const shin = makeLimb(0.038, 0.026, shinL, C.pants, 0.58);
    shin.position.y = -shinL;
    shin.rotation.x = Math.PI;
    kPivot.add(shin);

    // Ankle pivot
    const aPivot = new THREE.Group();
    aPivot.name = side + "Ankle";
    aPivot.position.set(0, -shinL, 0.010);
    kPivot.add(aPivot);

    const shoeG = makeShoe(C.shoe, C.shoeSole, C.accent);
    shoeG.name = side + "Shoe";
    aPivot.add(shoeG);

    // Animation refs
    kPivot.userData.foot = aPivot;
    hPivot.userData.leg = { userData: { lowerLeg: kPivot } };
    hPivot.userData.lowerLeg = kPivot;
  });

  avatar.position.set(SPAWN[0], SPAWN[1], SPAWN[2]);
  scene.add(avatar);
  return avatar;
}

// ═══════════════════════════════════════════════════════════════
// createRemoteAvatar — OTHER PLAYERS (optimized)
// ═══════════════════════════════════════════════════════════════
export function createRemoteAvatar(scene, userId, username, avatarType, skinTone) {
  const type = avatarType || "neutral";
  const skin = SKIN[skinTone] || SKIN.medium;
  const C    = CLOTH[type] || CLOTH.neutral;
  const hc   = HAIR_COLOR[type] || HAIR_COLOR.neutral;

  const uArmL = 0.220, fArmL = 0.200;
  const thighL = 0.270, shinL = 0.240;

  const group = new THREE.Group();
  group.name = `remote_${userId}`;
  group.userData = { userId, walkTime: 0, speed: 0 };

  // Torso
  const torsoM = makeTorso(type, C.top);
  torsoM.position.y = 0;
  group.add(torsoM);

  // Belt
  const belt = new THREE.Mesh(
    new THREE.CylinderGeometry(0.115, 0.115, 0.028, 12),
    M("#1E1E2C", 0.42, 0.28)
  );
  belt.position.y = 0.024;
  group.add(belt);

  // Neck
  const neckM = makeNeck(skin);
  neckM.position.y = 0.524;
  group.add(neckM);

  // Head
  const headY = 0.634;
  const headGroup = makeHead(skin, type);
  headGroup.position.y = headY;
  group.add(headGroup);

  // Shoulder sockets
  const shoulderXs = type === "masculine" ? 0.168 : type === "feminine" ? 0.148 : 0.158;
  [-1, 1].forEach(s => {
    const socket = new THREE.Mesh(
      new THREE.SphereGeometry(0.040, 8, 7),
      M(C.top, 0.52, 0.06)
    );
    socket.scale.set(0.80, 0.70, 0.82);
    socket.position.set(s * (shoulderXs + 0.024), 0.460, 0);
    group.add(socket);
  });

  // Arms
  [-1, 1].forEach(s => {
    const side = s > 0 ? "right" : "left";

    const sPivot = new THREE.Group();
    sPivot.name = side + "Shoulder";
    sPivot.position.set(s * (shoulderXs + 0.030), 0.460, 0);
    group.add(sPivot);

    const uArm = makeLimb(0.030, 0.024, uArmL, C.top, 0.52);
    uArm.position.y = -uArmL;
    uArm.rotation.x = Math.PI;
    sPivot.add(uArm);

    const ePivot = new THREE.Group();
    ePivot.name = side + "Elbow";
    ePivot.position.set(0, -uArmL, 0);
    sPivot.add(ePivot);

    const fArm = makeLimb(0.024, 0.018, fArmL, skin, 0.50);
    fArm.position.y = -fArmL;
    fArm.rotation.x = Math.PI;
    ePivot.add(fArm);

    const wPivot = new THREE.Group();
    wPivot.name = side + "Wrist";
    wPivot.position.set(0, -fArmL, 0);
    ePivot.add(wPivot);

    const handM = new THREE.Mesh(new THREE.BoxGeometry(0.048, 0.024, 0.052), M(skin, 0.50, 0));
    wPivot.add(handM);

    sPivot.userData.elbowPivot = ePivot;
    sPivot.userData.wristPivot = wPivot;
  });

  // Legs
  const hipXs = type === "masculine" ? 0.108 : type === "feminine" ? 0.115 : 0.110;
  [-1, 1].forEach(s => {
    const side = s > 0 ? "right" : "left";

    const hPivot = new THREE.Group();
    hPivot.name = side + "Hip";
    hPivot.position.set(s * hipXs, thighL, -0.008);
    group.add(hPivot);

    const thigh = makeLimb(0.052, 0.038, thighL, C.pants, 0.58);
    thigh.position.y = -thighL;
    thigh.rotation.x = Math.PI;
    hPivot.add(thigh);

    const kPivot = new THREE.Group();
    kPivot.name = side + "Knee";
    kPivot.position.set(0, -thighL, 0);
    hPivot.add(kPivot);

    const shin = makeLimb(0.036, 0.024, shinL, C.pants, 0.58);
    shin.position.y = -shinL;
    shin.rotation.x = Math.PI;
    kPivot.add(shin);

    const aPivot = new THREE.Group();
    aPivot.name = side + "Ankle";
    aPivot.position.set(0, -shinL, 0.010);
    kPivot.add(aPivot);

    const shoeG = makeShoe(C.shoe, C.shoeSole, C.accent);
    aPivot.add(shoeG);

    kPivot.userData.foot = aPivot;
    kPivot.userData.anklePivot = aPivot;
    hPivot.userData.kneePivot = kPivot;
    hPivot.userData.leg = { userData: { lowerLeg: kPivot } };
  });

  // Name label
  const nc = document.createElement("canvas");
  nc.width = 256; nc.height = 52;
  const nCtx = nc.getContext("2d");
  nCtx.font = "bold 17px 'Inter',sans-serif";
  nCtx.textAlign = "center"; nCtx.textBaseline = "middle";
  nCtx.shadowColor = "rgba(0,0,0,0.85)"; nCtx.shadowBlur = 5;
  nCtx.fillStyle = "rgba(255,255,255,0.93)";
  nCtx.fillText((username || "User").substring(0, 16), 128, 26);
  const nt = new THREE.CanvasTexture(nc);
  nt.minFilter = THREE.LinearFilter;
  nt.colorSpace = THREE.SRGBColorSpace;
  const ns = new THREE.Sprite(new THREE.SpriteMaterial({ map: nt, transparent: true, depthWrite: false, depthTest: false }));
  ns.scale.set(1.4, 0.34, 1);
  ns.position.y = 0.524 + 0.105 + 0.115 * 2.5;
  ns.renderOrder = 999;
  group.add(ns);

  scene.add(group);
  return group;
}