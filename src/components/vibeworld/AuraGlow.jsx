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

export function bindAura(controller, itemId, colorHex) {
  unbindAura(controller);
  const hex = colorHex || typedHex(itemId);
  const color = new THREE.Color(hex);

  if (!_glowCache[hex]) _glowCache[hex] = makeGlowTexture(hex);
  const glowTex = _glowCache[hex];

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

  // ── 3. POINT LIGHT — the avatar glows the world around them ─────────
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

  // ── Point light — throb with the charge ────────────────────────────
  const light = aura.userData._light;
  if (light) {
    light.intensity = 2.5 + fastPulse * 2.5 + chargePeak * 1.5;
    light.distance  = 6 + slowPulse * 2.5;
  }
}