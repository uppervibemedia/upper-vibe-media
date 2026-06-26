/**
 * AuraGlow — 3D avatar aura effect for Upper Vibe City.
 * Creates a vertical energy field that surrounds the avatar's entire body
 * (torso, head, legs), not just a floor ring.
 *
 * Controlled via CustomEvents from inventory equip/unequip.
 * Attached to the avatar root Group so it moves with the character.
 */
import * as THREE from "three";

// Color mapping from aura item config
const AURA_COLORS = {
  glow_starter:      "#00AADD",
  shop_glow_starter: "#00AADD",
  shop_glow_purple:  "#9B4FFF",
  shop_glow_gold:    "#FFD700",
   // fallback
  default:           "#00AADD",
};

/** Bind aura to an avatar controller Group. Meshes are recreated each call. */
export function bindAura(controller, itemId) {
  // Remove existing aura first
  unbindAura(controller);

  const hex = AURA_COLORS[itemId] || AURA_COLORS.default;
  const color = new THREE.Color(hex);

  // ── VERTICAL FIELD GROUP ──────────────────────────────────
  // All meshes are children of this group so they move with the avatar.
  const shroud = new THREE.Group();
  shroud.name = "avatarAura";

  // ── 1. SHROUD HALO / OVERHEAD GLOW ───────────────────────
  // Floating ring above the avatar's head — like a crown/energy
  const halo = new THREE.Mesh(
    new THREE.TorusGeometry(0.55, 0.02, 12, 24),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.22, depthWrite: false })
  );
  halo.rotation.x = Math.PI / 3; // tilted like an energy ring
  halo.position.y = 1.9;
  halo.renderOrder = 2;
  shroud.add(halo);

  // Small second ring inside halo
  const haloInner = new THREE.Mesh(
    new THREE.TorusGeometry(0.30, 0.015, 10, 20),
    new THREE.MeshBasicMaterial({ color: new THREE.Color("#FFFFFF"), transparent: true, opacity: 0.15, depthWrite: false })
  );
  haloInner.rotation.x = Math.PI / 3;
  haloInner.position.set(0, 1.87, 0.05);
  haloInner.renderOrder = 2;
  shroud.add(haloInner);

  // ── 2. FLOATING FIELD DISC — mid-body (chest level) ──────
  // Silhouette-sized semi-transparent disc at avatar's torso height
  // Gives the "body energy field" look rather than a ground floor ring
  const bodyDisc = new THREE.Mesh(
    new THREE.CircleGeometry(0.52, 20),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.07, depthWrite: false, side: THREE.DoubleSide })
  );
  bodyDisc.position.y = 0.85;
  bodyDisc.renderOrder = 1;
  shroud.add(bodyDisc);

  // ── 3. ENERGY RIBS — vertical light pillars ──────────────
  // Thin vertical planes arranged in a ring around the avatar.
  // These create the "vertical enveloping energy field" effect.
  const ribCount = 8;
  const ribPositions = [];
  for (let i = 0; i < ribCount; i++) {
    const angle = (i / ribCount) * Math.PI * 2;
    ribPositions.push({
      x: Math.cos(angle) * 0.48,
      z: Math.sin(angle) * 0.48,
      phase: i * 1.23,
    });
  }

  const ribMat = new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity: 0.09,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  for (const rp of ribPositions) {
    // Tall narrow plane running from feet to above head
    const rib = new THREE.Mesh(
      new THREE.PlaneGeometry(0.09, 2.0),
      ribMat.clone()
    );
    rib.position.set(rp.x, 1.0, rp.z);
    // Rotate plane to face outward from center, like a ring of pillars
    rib.lookAt(0, 1.0, 0);
    rib.renderOrder = 1;
    rib.userData._phase = rp.phase;
    shroud.add(rib);
  }

  // ── 4. GRADIENT LEGACY: subtle softened floor glow (muted) ──
  // Kept lightweight so the aura feels grounded without being the
  // primary visual. Body disc + ribs do the heavy lifting now.
  const floorGlow = new THREE.Mesh(
    new THREE.CircleGeometry(0.50, 20),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.06, depthWrite: false })
  );
  floorGlow.rotation.x = -Math.PI / 2;
  floorGlow.position.y = 0.002;
  shroud.add(floorGlow);

  // ── 5. PARTICLE SPARKLES — subtle floating specks ─────────
  // Each glows and drifts upward for a gentle "energy field" effect
  const particleCount = 28;
  for (let i = 0; i < particleCount; i++) {
    const theta = Math.random() * Math.PI * 2;
    const baseY = 0.4 + Math.random() * 1.6;
    const radius = 0.38 + Math.random() * 0.18;
    const speck = new THREE.Mesh(
      new THREE.SphereGeometry(0.018, 4, 4),
      new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.08 + Math.random() * 0.15,
        depthWrite: false,
      })
    );
    speck.position.set(
      Math.cos(theta) * radius,
      baseY,
      Math.sin(theta) * radius,
    );
    speck.userData._yBase = baseY;
    speck.userData._phase = Math.random() * 10;
    speck.userData._isAuraParticle = true;
    shroud.add(speck);
  }

  controller.add(shroud);
  return shroud;
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

  const pulse = Math.sin(t * 2.2) * 0.5 + 0.5;
  const slow = Math.sin(t * 0.9) * 0.5 + 0.5;

  // ── Halo pulse ──────────────────────────────────────────
  const halo = aura.children[0];
  if (halo?.isMesh && halo.material) {
    halo.material.opacity = 0.18 + pulse * 0.14;
    halo.scale.setScalar(1 + slow * 0.035);
    halo.rotation.z = Math.sin(t * 0.15) * 0.04;
  }

  // ── Inner halo ──────────────────────────────────────────
  const haloInner = aura.children[1];
  if (haloInner?.isMesh && haloInner.material) {
    haloInner.material.opacity = 0.10 + pulse * 0.12;
    haloInner.scale.setScalar(1 + slow * 0.03);
  }

  // ── Energy ribs pulse ───────────────────────────────────
  // Children 2-3 are body disc + floor glow, ribs start at child 4
  for (let i = 4; i < aura.children.length; i++) {
    const child = aura.children[i];
    if (child.isMesh && child.material && child.material.opacity !== undefined) {
      const phase = child.userData?._phase || i;
      const flicker = Math.sin(t * 3.5 + phase) * 0.5 + 0.5;
      child.material.opacity = 0.06 + flicker * 0.12;
      child.material.color.multiplyScalar(0.95 + flicker * 0.1);
      child.material.color.set(aura.children[0]?.material?.color || child.material.color);
    }
  }

  // ── Body disc + floor glow ──────────────────────────────
  // Child 2 = body disc, child 3 = floor glow
  const bodyDisc = aura.children[2];
  if (bodyDisc?.isMesh && bodyDisc.material) {
    bodyDisc.material.opacity = 0.05 + pulse * 0.06;
    bodyDisc.material.color.set(aura.children[0]?.material?.color || bodyDisc.material.color);
  }

  const floorGlow =
    aura.children.length > 3 && !aura.children[3]?.userData._isAuraParticle
      ? aura.children[3]
      : null;
  if (floorGlow?.isMesh && floorGlow.material) {
    floorGlow.material.opacity = 0.04 + pulse * 0.05;
    floorGlow.scale.setScalar(1 + slow * 0.04);
  }

  // ── Particles float up/down ─────────────────────────────
  for (const child of aura.children) {
    if (child.userData?._isAuraParticle) {
      const ph = child.userData._phase;
      child.position.y = child.userData._yBase + Math.sin(t * 0.7 + ph) * 0.5;
      child.material.opacity = 0.10 + Math.sin(t * 1.1 + ph) * 0.12;
    }
  }
}