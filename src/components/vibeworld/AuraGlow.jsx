/**
 * AuraGlow — Crystal-charge energy aura for Upper Vibe City avatars.
 * Inspired by the CrystalZone charge-up effect: bright energy field,
 * rising charged particles, electric arc wisps, and a pulsing inner light.
 */
import * as THREE from "three";

const AURA_COLORS = {
  glow_starter:      "#00AADD",
  shop_glow_starter: "#00AADD",
  shop_glow_purple:  "#9B4FFF",
  shop_glow_gold:    "#FFD700",
  default:           "#00AADD",
};

function typedHex(itemId) {
  return AURA_COLORS[itemId] || AURA_COLORS.default;
}

// Soft radial glow texture — bright center, hard falloff for energy look
function makeGlowTexture(hex, size = 128) {
  const c = document.createElement("canvas");
  c.width = size; c.height = size;
  const ctx = c.getContext("2d");
  const rgb = hexToRgb(hex);
  const g = ctx.createRadialGradient(size/2, size/2, 0, size/2, size/2, size/2);
  g.addColorStop(0,    `rgba(${rgb},1)`);
  g.addColorStop(0.08, `rgba(${rgb},1)`);
  g.addColorStop(0.25, `rgba(${rgb},0.6)`);
  g.addColorStop(0.50, `rgba(${rgb},0.04)`);
  g.addColorStop(1,    `rgba(${rgb},0)`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(c);
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// Helper: hex -> r,g,b (0-255)
function hexToRgb(hex) {
  const r = parseInt(hex.slice(1,3),16);
  const g = parseInt(hex.slice(3,5),16);
  const b = parseInt(hex.slice(5,7),16);
  return `${r},${g},${b}`;
}

// Bright particle texture — tight glow dot
function makeParticleTex(hex, size = 64) {
  const c = document.createElement("canvas");
  c.width = size; c.height = size;
  const ctx = c.getContext("2d");
  const rgb = hexToRgb(hex);
  const g = ctx.createRadialGradient(size/2,size/2,0, size/2,size/2,size/2);
  g.addColorStop(0,    `rgba(255,255,255,1)`);
  g.addColorStop(0.15, `rgba(${rgb},0.9)`);
  g.addColorStop(0.40, `rgba(${rgb},0.3)`);
  g.addColorStop(1,    `rgba(0,0,0,0)`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(c);
  tex.minFilter = THREE.LinearFilter;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

let _glowCache = {};
let _partCache = {};

export function bindAura(controller, itemId, colorHex) {
  unbindAura(controller);
  const hex = colorHex || typedHex(itemId);
  const color = new THREE.Color(hex);

  if (!_glowCache[hex]) _glowCache[hex] = makeGlowTexture(hex);
  if (!_partCache[hex]) _partCache[hex] = makeParticleTex(hex);
  const glowTex = _glowCache[hex];
  const partTex = _partCache[hex];

  const aura = new THREE.Group();
  aura.name = "avatarAura";

  // ── 1. ENERGY SHELL LAYERS — stacked bright sprites around body ──────
  // Multiple overlapping body glows at high opacity = crystal charge feel
  const bodyLayers = [
    { y: 1.55, s: 1.6,  o: 0.55, key: "head"    },
    { y: 1.10, s: 1.8,  o: 0.65, key: "chest"   },
    { y: 0.70, s: 1.65, o: 0.58, key: "waist"   },
    { y: 0.30, s: 1.45, o: 0.48, key: "legs"    },
    { y: 0.05, s: 1.20, o: 0.30, key: "feet"    },
  ];
  for (const bp of bodyLayers) {
    const sprite = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: glowTex,
        transparent: true,
        depthWrite: false,
        opacity: bp.o,
        color,
        blending: THREE.AdditiveBlending,
      })
    );
    sprite.position.set(0, bp.y, 0);
    sprite.scale.set(bp.s, bp.s, 1);
    sprite.renderOrder = 2;
    sprite.userData._bodyKey = bp.key;
    sprite.userData._baseOpacity = bp.o;
    sprite.userData._baseScale = bp.s;
    aura.add(sprite);
  }

  // ── 2. OUTER ENERGY CORONA — large diffuse shell ─────────────────────
  const corona = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: glowTex,
      transparent: true,
      depthWrite: false,
      opacity: 0.35,
      color,
      blending: THREE.AdditiveBlending,
    })
  );
  corona.position.set(0, 0.85, 0);
  corona.scale.set(3.2, 3.8, 1);
  corona.renderOrder = 1;
  corona.userData._isCorona = true;
  aura.add(corona);

  // ── 3. RISING CHARGED PARTICLES — like crystal zone energy streams ────
  const PARTICLE_COUNT = 28;
  for (let i = 0; i < PARTICLE_COUNT; i++) {
    const theta = Math.random() * Math.PI * 2;
    const radius = 0.28 + Math.random() * 0.45;
    const startY = Math.random() * 0.15; // start near feet
    const particle = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: partTex,
        transparent: true,
        depthWrite: false,
        opacity: 0.0,
        color,
        blending: THREE.AdditiveBlending,
      })
    );
    const s = 0.06 + Math.random() * 0.10;
    particle.scale.set(s, s, 1);
    particle.position.set(
      Math.cos(theta) * radius,
      startY,
      Math.sin(theta) * radius,
    );
    particle.renderOrder = 3;
    particle.userData._isCharged = true;
    particle.userData._phase = Math.random() * Math.PI * 2;
    particle.userData._speed = 0.55 + Math.random() * 0.85; // rise speed
    particle.userData._radius = radius;
    particle.userData._theta = theta;
    particle.userData._orbitDir = Math.random() > 0.5 ? 1 : -1;
    particle.userData._orbitSpeed = 0.4 + Math.random() * 0.6;
    particle.userData._size = s;
    aura.add(particle);
  }

  // ── 4. ELECTRIC ARC WISPS (line-based lightning) ─────────────────────
  const ARC_COLORS = [hex, "#ffffff", hex];
  const arcCount = 4;
  const arcLines = [];
  for (let a = 0; a < arcCount; a++) {
    const mat = new THREE.LineBasicMaterial({
      color: new THREE.Color(a % 2 === 0 ? "#ffffff" : hex),
      transparent: true,
      opacity: 0.0,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const pts = Array.from({ length: 6 }, () => new THREE.Vector3());
    const geo = new THREE.BufferGeometry().setFromPoints(pts);
    const line = new THREE.Line(geo, mat);
    line.renderOrder = 4;
    line.userData._isArc = true;
    line.userData._arcIdx = a;
    line.userData._phase = (a / arcCount) * Math.PI * 2;
    aura.add(line);
    arcLines.push({ line, mat, geo, pts });
  }
  aura.userData._arcLines = arcLines;

  // ── 5. POINT LIGHT — the avatar glows the world around them ─────────
  const light = new THREE.PointLight(color, 3.5, 7);
  light.position.set(0, 1.0, 0);
  light.userData._isAuraLight = true;
  aura.add(light);
  aura.userData._light = light;

  controller.add(aura);
  return aura;
}

export function unbindAura(controller) {
  const existing = controller?.getObjectByName("avatarAura");
  if (existing) {
    existing.traverse((child) => {
      if (child.geometry) child.geometry.dispose();
      if (child.material) child.material.dispose();
    });
    controller.remove(existing);
  }
}

/** Called each frame — crystal charge-up animation */
export function animateAura(avatarEntry, t) {
  const controller = avatarEntry?.root;
  const aura = controller?.getObjectByName("avatarAura");
  if (!aura?.children?.length) return;

  // Master pulse — fast and energetic like the crystal zone
  const fastPulse  = Math.sin(t * 4.5) * 0.5 + 0.5;       // rapid energy throb
  const slowPulse  = Math.sin(t * 1.8) * 0.5 + 0.5;        // slower breathing layer
  const chargePeak = Math.sin(t * 7.0) * 0.5 + 0.5;        // ultra-fast crackle

  // ── Body shell layers ──────────────────────────────────────────────
  for (const child of aura.children) {
    if (!child.isSprite || child.userData._isCorona || child.userData._isCharged) continue;
    const bo = child.userData._baseOpacity ?? 0.5;
    const bs = child.userData._baseScale ?? 1.5;
    const key = child.userData._bodyKey;
    // Each body layer pulses offset for a "charging" wave from feet → head
    const offset = key === "feet" ? 0 : key === "legs" ? 0.4 : key === "waist" ? 0.8 : key === "chest" ? 1.2 : 1.6;
    const wave = Math.sin(t * 4.5 + offset) * 0.5 + 0.5;
    child.material.opacity = Math.min(0.85, bo * (0.75 + wave * 0.55 + chargePeak * 0.25));
    child.scale.setScalar(bs * (1 + wave * 0.08 + fastPulse * 0.04));
  }

  // ── Corona outer shell ──────────────────────────────────────────────
  for (const child of aura.children) {
    if (!child.isSprite || !child.userData._isCorona) continue;
    child.material.opacity = 0.22 + slowPulse * 0.18 + fastPulse * 0.08;
    child.scale.set(
      3.2 + slowPulse * 0.25,
      3.8 + fastPulse * 0.20,
      1
    );
  }

  // ── Rising charged particles ────────────────────────────────────────
  for (const child of aura.children) {
    if (!child.isSprite || !child.userData._isCharged) continue;
    const ph = child.userData._phase;
    const spd = child.userData._speed;
    const orbitAngle = child.userData._theta + t * child.userData._orbitDir * child.userData._orbitSpeed;

    // Loop: particle rises from y=0 to y=2.2 then resets
    const cycleLen = 2.0 / spd;
    const cycleT = ((t * spd + ph) % cycleLen) / cycleLen; // 0→1
    const y = cycleT * 2.2;

    // Tighten orbit near top (particles converge like crystal beams)
    const orbitScale = 1.0 - cycleT * 0.4;
    child.position.set(
      Math.cos(orbitAngle) * child.userData._radius * orbitScale,
      y,
      Math.sin(orbitAngle) * child.userData._radius * orbitScale,
    );

    // Fade in at bottom, bright mid, fade out at top
    const fade = cycleT < 0.15 ? cycleT / 0.15
               : cycleT > 0.75 ? (1 - cycleT) / 0.25
               : 1.0;
    child.material.opacity = fade * (0.55 + Math.sin(t * 5.0 + ph) * 0.30);

    // Slightly enlarge particles mid-rise
    const s = child.userData._size * (0.9 + fade * 0.5);
    child.scale.setScalar(s);
  }

  // ── Electric arc lines — crackle like crystal arcs ─────────────────
  const arcLines = aura.userData._arcLines;
  if (arcLines) {
    for (const { mat, geo, pts, line } of arcLines) {
      const ph = line.userData._phase;
      // Arc flickers on/off rapidly — same as crystal zone lightning
      const flicker = Math.sin(t * 18.0 + ph) > 0.3;
      mat.opacity = flicker ? (0.4 + chargePeak * 0.55) : 0;

      if (flicker) {
        // Arc from foot level up to head — random jagged path
        const startY = 0.1 + Math.random() * 0.3;
        const endY   = 1.4 + Math.random() * 0.5;
        const startA = ph + t * 2.0;
        const r = 0.15 + Math.random() * 0.35;
        for (let i = 0; i < pts.length; i++) {
          const frac = i / (pts.length - 1);
          const jitter = i > 0 && i < pts.length - 1 ? (Math.random() - 0.5) * 0.22 : 0;
          pts[i].set(
            Math.cos(startA + frac * 1.2) * r + jitter,
            startY + (endY - startY) * frac + (Math.random() - 0.5) * 0.1,
            Math.sin(startA + frac * 1.2) * r + jitter,
          );
        }
        geo.setFromPoints(pts);
        geo.attributes.position.needsUpdate = true;
      }
    }
  }

  // ── Point light — throb with the charge ────────────────────────────
  const light = aura.userData._light;
  if (light) {
    light.intensity = 2.5 + fastPulse * 2.5 + chargePeak * 1.5;
    light.distance  = 6 + slowPulse * 2.5;
  }
}