/**
 * AuraGlow — 3D aura ring rendered around the player avatar.
 * Controlled via CustomEvents from inventory equip/unequip.
 * Attached to the avatar root Group so it moves with the character.
 */
import * as THREE from "three";

// Color mapping from aura item config
const AURA_COLORS = {
  shop_glow_starter: "#00AADD",
  shop_glow_purple:  "#9B4FFF",
  shop_glow_gold:    "#FFD700",
  glow_starter:      "#00AADD",
   // fallback
  default:           "#00AADD",
};

/** Bind aura to an avatar controller Group. Meshes are recreated each call. */
export function bindAura(controller, itemId) {
  // Remove existing aura first
  unbindAura(controller);

  const hex = AURA_COLORS[itemId] || AURA_COLORS.default;
  const color = new THREE.Color(hex);

  const aura = new THREE.Group();
  aura.name = "avatarAura";

  // Outer ring
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(0.70, 0.025, 16, 32),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.45, depthWrite: false })
  );
  ring.rotation.x = -Math.PI / 2 - 0.12; // slight tilt
  ring.position.y = 0.55;
  ring.renderOrder = 1;
  aura.add(ring);

  // Inner glow disc
  const disc = new THREE.Mesh(
    new THREE.CircleGeometry(0.50, 24),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.12, depthWrite: false, side: THREE.DoubleSide })
  );
  disc.rotation.x = -Math.PI / 2;
  disc.position.y = 0.05;
  disc.renderOrder = 1;
  aura.add(disc);

  // Particle halo — scattered tiny spheres around avatar
  const particleCount = 16;
  for (let i = 0; i < particleCount; i++) {
    const theta = (i / particleCount) * Math.PI * 2;
    const angle = Math.PI * 0.5;
    const r = 0.95;
    const sp = new THREE.Mesh(
      new THREE.SphereGeometry(0.035, 6, 6),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.35, depthWrite: false })
    );
    sp.position.set(Math.cos(theta) * r * Math.cos(angle), 0.45+Math.sin(angle)*0.45, Math.sin(theta) * r * Math.cos(angle));
    sp.userData._phase = i * 0.8;
    sp.userData._yBase = 0.45;
    aura.add(sp);
    // Store particle refs for animation
    sp.userData._isAuraParticle = true;
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
  }
}

/** Called each frame to animate aura rings/particles */
export function animateAura(avatarEntry, t) {
  const controller = avatarEntry?.root;
  const aura = controller?.getObjectByName("avatarAura");
  if (!aura) return;

  const beat = Math.sin(t * 2.2) * 0.5 + 0.5;

  // Outer ring pulse
  const ring = aura.children[0];
  if (ring?.isMesh && ring.material) {
    ring.material.opacity = 0.35 + beat * 0.25;
    ring.scale.setScalar(1 + beat * 0.04);
  }

  // Particles float up/down
  aura.traverse((child) => {
    if (child.userData?._isAuraParticle) {
      const ph = child.userData._phase;
      child.position.y = child.userData._yBase + Math.sin(t * 1.8 + ph) * 0.18;
      child.material.opacity = 0.25 + Math.sin(t * 1.4 + ph * 1.3) * 0.12;
    }
  });
}