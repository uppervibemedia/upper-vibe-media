import * as THREE from "three";

// ─────────────────────────────────────────────────────────────
// LaunchPad — visual-only 3D component
// Purpose: Inert scene object rendered in a standalone canvas.
// Do NOT import into CityCanvas until explicitly approved.
// ⚠ No launch logic, no click behavior, no movement.
// ─────────────────────────────────────────────────────────────

const {
  Mesh,
  MeshStandardMaterial,
  MeshBasicMaterial,
  Group,
  RingGeometry,
  CircleGeometry,
  CylinderGeometry,
  SphereGeometry,
  TorusGeometry,
  PlaneGeometry,
  Vector3,
  Color,
  BackSide,
  DoubleSide,
} = THREE;

const WHITE = new Color("#ffffff");

// ── Shared reusable materials ────────────────────────────────
const Make = (() => {
  const mats = {};
  function get(hex, key, opts) {
    const k = Array.isArray(hex) ? hex.join(",") : hex + JSON.stringify(opts || {});
    if (!mats[k]) {
      const m = new MeshStandardMaterial({
        color: new Color(Array.isArray(hex) ? hex[0] : hex),
        roughness: 0.35,
        metalness: 0.45,
        ...opts,
      });
      m.userData = { hex: Array.isArray(hex) ? hex : [hex], opts };
      mats[k] = m;
    }
    return mats[k];
  }
  return { get };
})();

// ── Classic pad ──────────────────────────────────────────────
function buildClassicPad(g, opts) {
  const { outerRingHex, innerRingHex, rimHex, labelColor } = opts;

  // Base disc
  const base = new Mesh(
    new CircleGeometry(1.05, 48),
    Make.get(rimHex, "base", { roughness: 0.55, metalness: 0.25, transparent: true, opacity: 0.92 })
  );
  base.rotation.x = -Math.PI / 2;
  base.position.y -= 0.001;
  base.renderOrder = -1;
  g.add(base);

  // Outer glow ring (additive blend)
  const outerRing = new Mesh(
    new RingGeometry(0.95, 1.05, 48),
    new MeshBasicMaterial({ color: new Color(outerRingHex), depthWrite: false, transparent: true, opacity: 0.45, blending: THREE.AdditiveBlending })
  );
  outerRing.rotation.x = -Math.PI / 2;
  g.add(outerRing);

  // Inner glow ring
  const innerRing = new Mesh(
    new RingGeometry(0.25, 0.35, 48),
    new MeshBasicMaterial({ color: new Color(innerRingHex), depthWrite: false, transparent: true, opacity: 0.7 })
  );
  innerRing.rotation.x = -Math.PI / 2;
  g.add(innerRing);

  // Center spark
  const center = new Mesh(
    new CircleGeometry(0.18, 20),
    new MeshBasicMaterial({ color: WHITE, depthWrite: false, transparent: true, opacity: 0.57, blending: THREE.AdditiveBlending })
  );
  center.rotation.x = -Math.PI / 2;
  g.add(center);

  // Dot
  const dot = new Mesh(
    new SphereGeometry(0.04, 8, 6),
    new MeshBasicMaterial({ color: WHITE, depthWrite: false })
  );
  dot.position.y = 0.065;
  g.add(dot);

  // Pulsing ring (Torus)
  const pulseRing = new Mesh(
    new TorusGeometry(0.9, 0.03, 12, 36),
    new MeshBasicMaterial({ color: new Color(outerRingHex), depthWrite: false, transparent: true, opacity: 0.3 })
  );
  pulseRing.rotation.x = -Math.PI / 2;
  pulseRing.position.y = 0.025;
  g.add(pulseRing);

  // Upward energy: 3 cylinders stacking up
  const energyOpts = { color: new Color(innerRingHex), depthWrite: false, transparent: true, opacity: 0.17 };
  for (let i = 0; i < 3; i++) {
    const pillar = new Mesh(
      new CylinderGeometry(0.04, 0.08, 2 + i * 0.5, 8),
      new MeshBasicMaterial({ ...energyOpts, opacity: 0.17 - i * 0.04 })
    );
    pillar.position.y = 1.2 + i * 0.4;
    g.add(pillar);
    pillar.userData._energyIdx = i;
  }

  // Neon ring near top
  const topRing = new Mesh(
    new TorusGeometry(0.1, 0.02, 8, 16),
    new MeshBasicMaterial({ color: new Color(outerRingHex), depthWrite: false, transparent: true, opacity: 0.65 })
  );
  topRing.position.y = 1.2;
  topRing.rotation.x = Math.PI / 2;
  g.add(topRing);

  // Base neon ring
  const baseRing = new Mesh(
    new TorusGeometry(0.97, 0.025, 12, 36),
    new MeshBasicMaterial({ color: new Color(innerRingHex), depthWrite: false, transparent: true, opacity: 0.4 })
  );
  baseRing.rotation.x = -Math.PI / 2;
  baseRing.position.y = 0.005;
  g.add(baseRing);
}

// ── Build the full pad assembly ──────────────────────────────
function buildPad(group) {
  buildClassicPad(group, {
    outerRingHex: "#00E5FF",
    innerRingHex: "#00D4F0",
    rimHex: "#101E3A",
    labelColor: "#00E5FF",
  });
}

// ── Animation (visual loop only) ─────────────────────────────
let _pulsePhase = 0;
export function animateLaunchPad(group, t, audioBeat = 0) {
  // Animate children (in-place) — group is expected to be a THREE.Group
  let children;
  if (group?.type === "Group") children = group.children;
  if (!children || children.length === 0) return;

  // Find pulse ring (Torus) and energy pillars
  let pulseRing = null;
  const energyPillars = [];
  for (const c of children) {
    if (c.geometry?.type === "TorusGeometry") pulseRing = c;
    if (c.userData?._energyIdx !== undefined) energyPillars.push(c);
  }

  if (pulseRing) {
    _pulsePhase += 0.02;
    const r = 0.9 + Math.sin(_pulsePhase) * 0.12;
    pulseRing.scale.set(r / 0.9, r / 0.9, 1);
    pulseRing.material.opacity = 0.2 + Math.sin(_pulsePhase * 2) * 0.12 + audioBeat * 0.15;
  }

  for (const p of energyPillars) {
    p.material.opacity = 0.15 + Math.sin(_pulsePhase * 1.5 + p.userData._energyIdx) * 0.06;
  }
}

// ── Factory: create a standalone LaunchPad instance ───────────
let _msgShown = false;
if (!_msgShown) {
  console.log("[LaunchPad] Visual-only component created. Still inactive — not placed in city.");
  _msgShown = true;
}

export default function createLaunchPad(scene, pos) {
  if (!scene) {
    console.warn("[LaunchPad] No scene provided — skipping creation.");
    return null;
  }

  const isArray = Array.isArray(pos);
  const fx = isArray ? pos[0] : (pos?.x ?? 0);
  const fz = isArray ? pos[2] : (pos?.z ?? 0);

  const group = new Group();
  group.name = "launchPad";
  group.position.set(fx, 0.025, fz);
  buildPad(group);
  scene.add(group);
  return group;
}