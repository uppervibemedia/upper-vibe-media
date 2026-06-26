/**
 * VisualizerDomeZone.js — rebuilt for bigger, more prominent visual presence.
 * Radius +30% (3.5 → 4.5), enlarged entrance, glowing base ring, rim accents,
 * neon edge lighting, soft entrance light spill — all lightweight, iPhone-safe.
 *
 * Position: (-13, 10) — between plaza and beach, well clear of Academy, Shop,
 * Crystal Zone, Zen Beach, and Launch Pads.
 */
import * as THREE from "three";
import { createZoneSign } from "../../ZoneSign";

const {
  BoxGeometry, SphereGeometry, CircleGeometry, RingGeometry, CylinderGeometry,
  MeshStandardMaterial, MeshBasicMaterial, Color, Group, Mesh, PointLight,
} = THREE;

function mat(hexColor, opts = {}) {
  const m = new MeshStandardMaterial();
  m.color = new Color(hexColor);
  m.roughness = opts.roughness ?? 0.5;
  m.metalness = opts.metalness ?? 0.05;
  if (opts.transparent) {
    m.transparent = true;
    m.opacity = opts.opacity ?? 1;
    m.depthWrite = opts.depthWrite ?? true;
  }
  return m;
}

export function buildVisualizerDomeZone(scene) {
  const R = 4.5; // +30% from 3.5
  const CX = -13, CZ = 10;
  const dome = new Group();
  dome.name = "visualizerDome";

  // ── Main dome — larger hemisphere ──────────────────────────────
  const domeGeo = new SphereGeometry(R, 36, 22, 0, Math.PI * 2, 0, Math.PI / 2);
  const domeMesh = new Mesh(
    domeGeo,
    mat("#1E2C4A", { roughness: 0.18, metalness: 0.70, transparent: true, opacity: 0.70, depthWrite: true })
  );
  domeMesh.position.set(CX, 0.05, CZ);
  domeMesh.castShadow = true;
  dome.add(domeMesh);

  // ── Glowing base ring ──────────────────────────────────────────
  const baseRing = new Mesh(
    new RingGeometry(R + 0.05, R + 0.9, 56),
    new MeshBasicMaterial({ color: new Color("#C43BFF"), depthWrite: false, transparent: true, opacity: 0.35, side: THREE.DoubleSide })
  );
  baseRing.rotation.x = -Math.PI / 2;
  baseRing.position.set(CX, 0.002, CZ);
  dome.add(baseRing);

  // ── Soft inner glow ring — sits just inside the dome edge ──────
  const innerGlowRing = new Mesh(
    new RingGeometry(R * 0.65, R * 0.85, 48),
    new MeshBasicMaterial({ color: new Color("#00D4F0"), depthWrite: false, transparent: true, opacity: 0.10, side: THREE.DoubleSide })
  );
  innerGlowRing.rotation.x = -Math.PI / 2;
  innerGlowRing.position.set(CX, 0.004, CZ);
  dome.add(innerGlowRing);

  // ── Dome rim glow (neon edge strip along the hemisphere base) ──
  // Thin torus-like ring hugging the dome's bottom edge
  const rimGlow = new Mesh(
    new RingGeometry(R - 0.015, R + 0.015, 56),
    new MeshBasicMaterial({ color: new Color("#C43BFF"), depthWrite: false, transparent: true, opacity: 0.15, side: THREE.DoubleSide })
  );
  rimGlow.rotation.x = -Math.PI / 2;
  rimGlow.position.set(CX, R * 0.015, CZ);
  dome.add(rimGlow);

  // ── Pulsing LED dots on dome surface (lightweight spheres) ─────
  for (let d = 0; d < 24; d++) {
    const dAng = (d / 24) * Math.PI * 2;
    const dot = new Mesh(
      new SphereGeometry(0.09, 4, 3),
      new MeshBasicMaterial({ color: new Color(["#C43BFF", "#00D4F0", "#FF00FF"][d % 3]), depthWrite: false })
    );
    dot.position.set(CX + Math.cos(dAng) * (R - 0.25), 1.6 + (d % 3) * 1.0, CZ + Math.sin(dAng) * (R - 0.25));
    dome.add(dot);
  }

  // ── Vertical neon accent strips (thin bars, very subtle) ───────
  const STRIP_COUNT = 4;
  for (let i = 0; i < STRIP_COUNT; i++) {
    const sAng = (i / STRIP_COUNT) * Math.PI * 2;
    // Only place on the rear-facing half so the entrance face stays clear
    if (i === 0) continue; // skip front (entrance)
    const strip = new Mesh(
      new BoxGeometry(0.04, R * 0.85, 2.4),
      new MeshBasicMaterial({ color: new Color(["#00D4F0", "#C43BFF", "#A078FF"][i - 1]), depthWrite: false, transparent: true, opacity: 0.12 })
    );
    strip.position.set(CX + Math.cos(sAng) * (R - 0.02), R * 0.45, CZ + Math.sin(sAng) * (R - 0.02));
    strip.lookAt(CX, 0, CZ);
    dome.add(strip);
  }

  // ── Enlarged entrance doors (faces Central Plaza = +Z direction) ──
  // Entrance dimensions: wider and taller for easy walk-in
  const ENTRANCE_W = 3.0, ENTRANCE_H = 4.2;
  // Entrance glow door
  const entranceDoor = new Mesh(
    new BoxGeometry(ENTRANCE_W, ENTRANCE_H, 0.12),
    new MeshBasicMaterial({ color: new Color("#00E5FF"), depthWrite: false, transparent: true, opacity: 0.85 })
  );
  entranceDoor.position.set(CX, ENTRANCE_H / 2, CZ - 0.05);
  entranceDoor.name = "domeEntrance";
  dome.add(entranceDoor);

  // Entrance door edge lighting — thin cyan frame around the opening
  const entranceFrame = new Mesh(
    new BoxGeometry(ENTRANCE_W + 0.25, 0.10, 0.08),
    new MeshBasicMaterial({ color: new Color("#A078FF"), depthWrite: false, transparent: true, opacity: 0.5 })
  );
  entranceFrame.position.set(CX, ENTRANCE_H + 0.05, CZ - 0.05);
  dome.add(entranceFrame);
  const entranceFrame2 = new Mesh(
    new BoxGeometry(ENTRANCE_W + 0.25, 0.10, 0.08),
    new MeshBasicMaterial({ color: new Color("#A078FF"), depthWrite: false, transparent: true, opacity: 0.5 })
  );
  entranceFrame2.position.set(CX, -0.04, CZ - 0.05);
  dome.add(entranceFrame2);

  // ── Dome floor interior ────────────────────────────────────────
  const domeFloor = new Mesh(
    new CircleGeometry(R - 0.6, 36),
    new MeshBasicMaterial({ color: new Color("#1E2A4E"), depthWrite: false, transparent: true, opacity: 0.25 })
  );
  domeFloor.rotation.x = -Math.PI / 2;
  domeFloor.position.set(CX, 0.003, CZ);
  dome.add(domeFloor);

  scene.add(dome);

  // ── Zone sign ─────────────────────────────────────────────────
  createZoneSign(scene, CX, R * 0.85 + 0.6, CZ, "VISUALIZER  DOME", "#C43BFF");

  // ── Zone point light — stronger, farther reach ────────────────
  const domeLight = new PointLight();
  domeLight.color = new Color("#FF69D4");
  domeLight.intensity = 4.5;
  domeLight.distance = 18;
  domeLight.position.set(CX, 3.5, CZ);
  scene.add(domeLight);

  // ── Entrance light spill — soft glow at the doorway ────────────
  const doorLight = new PointLight();
  doorLight.color = new Color("#00E5FF");
  doorLight.intensity = 1.5;
  doorLight.distance = 8;
  doorLight.position.set(CX, 1.0, CZ - 3.0);
  scene.add(doorLight);
}