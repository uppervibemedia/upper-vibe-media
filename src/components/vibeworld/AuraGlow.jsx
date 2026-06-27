/**
 * AuraGlow — Lightweight crystal-charge energy aura.
 * Optimized: cached aura ref, reduced point light intensity,
 * throttled per-layer updates, no scene traversal every frame.
 */
import * as THREE from "three";

const IS_MOBILE = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

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

// Soft radial glow texture — cached per color
const _glowCache = {};
function makeGlowTexture(hex) {
  if (_glowCache[hex]) return _glowCache[hex];
  const size = IS_MOBILE ? 64 : 128;
  const c = document.createElement("canvas");
  c.width = size; c.height = size;
  const ctx = c.getContext("2d");
  const r = parseInt(hex.slice(1,3),16);
  const g = parseInt(hex.slice(3,5),16);
  const b = parseInt(hex.slice(5,7),16);
  const rgb = `${r},${g},${b}`;
  const grad = ctx.createRadialGradient(size/2, size/2, 0, size/2, size/2, size/2);
  grad.addColorStop(0,    `rgba(${rgb},1)`);
  grad.addColorStop(0.08, `rgba(${rgb},1)`);
  grad.addColorStop(0.25, `rgba(${rgb},0.6)`);
  grad.addColorStop(0.50, `rgba(${rgb},0.04)`);
  grad.addColorStop(1,    `rgba(${rgb},0)`);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(c);
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.colorSpace = THREE.SRGBColorSpace;
  _glowCache[hex] = tex;
  return tex;
}

export function bindAura(controller, itemId, colorHex) {
  unbindAura(controller);
  const hex = colorHex || typedHex(itemId);
  const color = new THREE.Color(hex);
  const glowTex = makeGlowTexture(hex);

  const aura = new THREE.Group();
  aura.name = "avatarAura";

  // Mobile: 3 body layers; Desktop: 5
  const bodyLayers = IS_MOBILE ? [
    { y: 1.10, s: 1.8,  o: 0.50, key: "chest" },
    { y: 0.55, s: 1.55, o: 0.42, key: "waist" },
    { y: 0.05, s: 1.10, o: 0.25, key: "feet"  },
  ] : [
    { y: 1.55, s: 1.6,  o: 0.50, key: "head"  },
    { y: 1.10, s: 1.8,  o: 0.58, key: "chest" },
    { y: 0.70, s: 1.65, o: 0.52, key: "waist" },
    { y: 0.30, s: 1.45, o: 0.42, key: "legs"  },
    { y: 0.05, s: 1.20, o: 0.26, key: "feet"  },
  ];

  const bodySprites = [];
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
    sprite.userData._baseOpacity = bp.o;
    sprite.userData._baseScale = bp.s;
    sprite.userData._offset = bodyLayers.indexOf(bp) * 0.4;
    aura.add(sprite);
    bodySprites.push(sprite);
  }

  // Outer corona
  const corona = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: glowTex,
      transparent: true,
      depthWrite: false,
      opacity: 0.28,
      color,
      blending: THREE.AdditiveBlending,
    })
  );
  corona.position.set(0, 0.85, 0);
  corona.scale.set(3.0, 3.5, 1);
  corona.renderOrder = 1;
  aura.add(corona);

  // Point light — lower intensity on mobile to reduce GPU draw calls
  const lightIntensity = IS_MOBILE ? 1.8 : 2.8;
  const lightDistance  = IS_MOBILE ? 5   : 7;
  const light = new THREE.PointLight(color, lightIntensity, lightDistance);
  light.position.set(0, 1.0, 0);
  aura.add(light);

  // Cache refs directly on the aura group for fast frame-access (no traversal)
  aura.userData._light = light;
  aura.userData._corona = corona;
  aura.userData._bodySprites = bodySprites;
  aura.userData._baseIntensity = lightIntensity;

  controller.add(aura);
  // Cache aura ref on the controller for O(1) frame access
  controller.userData._auraGroup = aura;
  return aura;
}

export function unbindAura(controller) {
  // Use cached ref first (O(1)), fall back to traversal for safety
  const existing = controller?.userData?._auraGroup || controller?.getObjectByName("avatarAura");
  if (existing) {
    existing.traverse((child) => {
      if (child.material) {
        if (child.material.map) child.material.map = null; // don't dispose shared tex
        child.material.dispose();
      }
    });
    controller.remove(existing);
    if (controller.userData) controller.userData._auraGroup = null;
  }
}

/** Called each frame — use cached refs, no scene traversal */
export function animateAura(avatarEntry, t) {
  const controller = avatarEntry?.root;
  // O(1) lookup via cached ref
  const aura = controller?.userData?._auraGroup;
  if (!aura) return;

  // On mobile: update every other frame
  if (IS_MOBILE && Math.round(t * 30) % 2 !== 0) return;

  const fastPulse = Math.sin(t * 4.5) * 0.5 + 0.5;
  const slowPulse = Math.sin(t * 1.8) * 0.5 + 0.5;

  // Body layers
  const bodySprites = aura.userData._bodySprites;
  if (bodySprites) {
    for (let i = 0; i < bodySprites.length; i++) {
      const sprite = bodySprites[i];
      const bo = sprite.userData._baseOpacity;
      const bs = sprite.userData._baseScale;
      const off = sprite.userData._offset;
      const wave = Math.sin(t * 4.5 + off) * 0.5 + 0.5;
      sprite.material.opacity = Math.min(0.75, bo * (0.8 + wave * 0.45));
      sprite.scale.x = sprite.scale.y = bs * (1 + wave * 0.07 + fastPulse * 0.03);
    }
  }

  // Corona
  const corona = aura.userData._corona;
  if (corona) {
    corona.material.opacity = 0.18 + slowPulse * 0.14 + fastPulse * 0.06;
    corona.scale.x = 3.0 + slowPulse * 0.2;
    corona.scale.y = 3.5 + fastPulse * 0.15;
  }

  // Point light — capped intensity so it doesn't spike GPU
  const light = aura.userData._light;
  if (light) {
    const base = aura.userData._baseIntensity ?? 2.5;
    light.intensity = base * (0.75 + fastPulse * 0.35);
    // Don't animate distance — constant is cheaper
  }
}