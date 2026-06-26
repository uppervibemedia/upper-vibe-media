/**
 * AuraGlow — Soft magical energy-field aura for Upper Vibe City.
 * Designed to look like a floating crystal-charge energy mist around
 * the avatar, NOT a tube/cylinder/shield. Soft body glows + wisps only.
 *
 * Attached to the avatar controller Group so it moves with the character.
 */
import * as THREE from "three";

// Color mapping from aura item config
const AURA_COLORS = {
  glow_starter:      "#00AADD",
  shop_glow_starter: "#00AADD",
  shop_glow_purple:  "#9B4FFF",
  shop_glow_gold:    "#FFD700",
  default:           "#00AADD",
};

/**
 * Generate a soft circular gradient texture for sprite-based glow.
 * Softer falloff = more "mist/energy field" and less "hard circle".
 */
function makeGlowTexture(color, size = 128) {
  const c = document.createElement("canvas");
  c.width = size;
  c.height = size;
  const ctx = c.getContext("2d");
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, color);                     // bright center
  g.addColorStop(0.12, color.replace(")", ",0.8)"));
  g.addColorStop(0.30, color.replace(")", ",0.12)"));
  g.addColorStop(0.50, color.replace(")", ",0.03)"));
  g.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(c);
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

let _texCache = {};
function typedHex(itemId) {
  return AURA_COLORS[itemId] || AURA_COLORS.default;
}
function glowTex(hex) {
  if (!_texCache[hex]) _texCache[hex] = makeGlowTexture(hex);
  return _texCache[hex];
}

/** Build the soft aura group for an avatar. Recreated each bind.
 *  @param {string} colorHex - optional direct hex color override (used for remote avatars) */
export function bindAura(controller, itemId, colorHex) {
  unbindAura(controller);
  const hex = colorHex || typedHex(itemId);
  const color = new THREE.Color(hex);
  const tex = glowTex(hex);

  const aura = new THREE.Group();
  aura.name = "avatarAura";

  // ── 1. SOFT BODY GLOWS (sprite discs at key body points) ──
  // Texture-based sprites = soft misty glow around the body, never hard edges.
  // Stacked vertically to wrap: chest, waist, thighs, knees.
  const bodyPositions = [
    { y: 1.40, s: 1.0, o: 0.15 }, // shoulders / upper chest
    { y: 0.95, s: 0.9, o: 0.14 }, // mid torso
    { y: 0.55, s: 0.8, o: 0.11 }, // waist / hips
    { y: 0.20, s: 0.7, o: 0.09 }, // upper legs / thighs
  ];
  for (const bp of bodyPositions) {
    const sprite = new THREE.Sprite(
      new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, opacity: bp.o, color })
    );
    sprite.position.set(0, bp.y, 0);
    sprite.scale.set(bp.s, bp.s, 1);
    sprite.renderOrder = 1;
    aura.add(sprite);
  }

  // ── 2. SOFT OVERHEAD GLOW ────────────────────────────────
  // Instead of a hard torus ring — a soft sprite floating above
  const headGlow = new THREE.Sprite(
    new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, opacity: 0.08, color })
  );
  headGlow.position.set(0, 1.85, 0);
  headGlow.scale.set(0.75, 0.75, 1);
  headGlow.renderOrder = 1;
  aura.add(headGlow);

  // ── 3. BASE FLOOR GLOW (soft, muted) ────────────────────
  const floorGlow = new THREE.Sprite(
    new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, opacity: 0.05, color })
  );
  floorGlow.position.set(0, 0.02, 0);
  floorGlow.scale.set(0.9, 0.9, 1);
  floorGlow.renderOrder = 1;
  aura.add(floorGlow);

  // ── 4. FLOATING ENERGY WISPS (particles) ─────────────────
  // Small soft sprites that drift around the avatar body.
  // These give the "magical energy field" / "mist" feel.
  const wispCount = 15;
  for (let i = 0; i < wispCount; i++) {
    const theta = Math.random() * Math.PI * 2;
    const radius = 0.42 + Math.random() * 0.25;
    const wisp = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: tex,
        transparent: true,
        depthWrite: false,
        opacity: 0.04 + Math.random() * 0.06,
        color,
      })
    );
    wisp.position.set(
      Math.cos(theta) * radius,
      0.35 + Math.random() * 1.5,
      Math.sin(theta) * radius,
    );
    const s = 0.09 + Math.random() * 0.10;
    wisp.scale.set(s, s, 1);
    wisp.renderOrder = 1;
    wisp.userData._yBase = wisp.position.y;
    wisp.userData._phase = Math.random() * 10;
    wisp.userData._orbitalAngle = theta;
    wisp.userData._orbitRadius = radius;
    wisp.userData._orbitDir = Math.random() > 0.5 ? 1 : -1;
    wisp.userData._driftSpeed = 0.15 + Math.random() * 0.35;
    wisp.userData._isAuraParticle = true;
    aura.add(wisp);
  }

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
    _texCache = {};
  }
}

/** Called each frame — pulse all glows + drift wisps */
export function animateAura(avatarEntry, t) {
  const controller = avatarEntry?.root;
  const aura = controller?.getObjectByName("avatarAura");
  if (!aura?.children?.length) return;

  const pulse = Math.sin(t * 2.5) * 0.5 + 0.5;
  const slow = Math.sin(t * 0.7) * 0.5 + 0.5;

  // ── Body glows pulse ────────────────────────────────────
  // First N sprites = body stack + head + floor (not wisps)
  for (let i = 0; i < aura.children.length; i++) {
    const child = aura.children[i];
    if (!child.isSprite || child.userData._isAuraParticle) continue;
    // Alternating phase between upper body (faster) and lower (slower)
    const phase = i < 3 ? 0 : 0.8;
    const rate = i < 3 ? 2.5 : 1.5;
    child.material.opacity = (i === 0 ? 0.12 : i === aura.children.length - 2 ? 0.04 : 0.08) + Math.sin(t * rate + phase) * 0.04;
    const sBase = [1.2, 1.1, 1.0, 0.9, 0.75, 0.9][i] || 0.9;
    child.scale.setScalar(sBase * (1 + slow * 0.035));
    // Soften color with slight white blend for diffused look
    const baseColor = child.material.color.clone();
    child.material.color = baseColor;
  }

  // ── Wisps drift around the body ─────────────────────────
  for (const wisp of aura.children) {
    if (!wisp.userData?._isAuraParticle) continue;
    const basey = wisp.userData._yBase;
    const phase = wisp.userData._phase;
    const angle = wisp.userData._orbitalAngle + t * wisp.userData._orbitDir * 0.2;
    wisp.position.x = Math.cos(angle) * wisp.userData._orbitRadius;
    wisp.position.z = Math.sin(angle) * wisp.userData._orbitRadius;
    wisp.position.y = basey + Math.sin(t * wisp.userData._driftSpeed + phase) * 0.35;
    wisp.material.opacity = 0.05 + Math.sin(t * 1.4 + phase) * 0.06;
  }
}