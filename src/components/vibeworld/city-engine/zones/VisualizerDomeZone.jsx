/**
 * VisualizerDomeZone.js — rebuilt for bigger, more prominent visual presence.
 * Radius +30% (3.5 → 4.5), enlarged entrance, glowing base ring, rim accents,
 * neon edge lighting, soft entrance light spill — all lightweight, iPhone-safe.
 *
 * Position: (-13, 10) — Academy-row south layout, clear of paths, Shop,
 * Crystal Zone and Zen Beach.
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

  // ── Clean entrance opening (faces toward Central Plaza / -Z) ──
  // No solid door — just a subtle open portal glow so users can walk through
  const ENTRANCE_W = 3.0, ENTRANCE_H = 4.3;
  const ENTRANCE_Z = CZ - R + 0.05;

  // Subtle portal glow — faint energy field inside the doorway (not a solid door)
  const portalGlow = new Mesh(
    new BoxGeometry(ENTRANCE_W, ENTRANCE_H, 0.05),
    new MeshBasicMaterial({ color: new Color("#00E5FF"), depthWrite: false, transparent: true, opacity: 0.20 })
  );
  portalGlow.position.set(CX, ENTRANCE_H / 2, ENTRANCE_Z + 0.3);
  portalGlow.name = "domePortalGlow";
  dome.add(portalGlow);

  // Subtle neon entrance frame — slim top/bottom edges
  const entranceFrameTop = new Mesh(
    new BoxGeometry(ENTRANCE_W + 0.25, 0.08, 0.06),
    new MeshBasicMaterial({ color: new Color("#A078FF"), depthWrite: false, transparent: true, opacity: 0.35 })
  );
  entranceFrameTop.position.set(CX, ENTRANCE_H + 0.03, ENTRANCE_Z);
  dome.add(entranceFrameTop);
  const entranceFrameBot = new Mesh(
    new BoxGeometry(ENTRANCE_W + 0.25, 0.08, 0.06),
    new MeshBasicMaterial({ color: new Color("#A078FF"), depthWrite: false, transparent: true, opacity: 0.35 })
  );
  entranceFrameBot.position.set(CX, -0.03, ENTRANCE_Z);
  dome.add(entranceFrameBot);

  // Thin neon side columns
  const entranceSideL = new Mesh(
    new BoxGeometry(0.06, ENTRANCE_H, 0.06),
    new MeshBasicMaterial({ color: new Color("#00E5FF"), depthWrite: false, transparent: true, opacity: 0.25 })
  );
  entranceSideL.position.set(CX - ENTRANCE_W / 2 - 0.03, ENTRANCE_H / 2, ENTRANCE_Z);
  dome.add(entranceSideL);
  const entranceSideR = new Mesh(
    new BoxGeometry(0.06, ENTRANCE_H, 0.06),
    new MeshBasicMaterial({ color: new Color("#00E5FF"), depthWrite: false, transparent: true, opacity: 0.25 })
  );
  entranceSideR.position.set(CX + ENTRANCE_W / 2 + 0.03, ENTRANCE_H / 2, ENTRANCE_Z);
  dome.add(entranceSideR);

  // ── Dome floor interior ────────────────────────────────────────
  const domeFloor = new Mesh(
    new CircleGeometry(R - 0.6, 36),
    new MeshBasicMaterial({ color: new Color("#1E2A4E"), depthWrite: false, transparent: true, opacity: 0.25 })
  );
  domeFloor.rotation.x = -Math.PI / 2;
  domeFloor.position.set(CX, 0.003, CZ);
  dome.add(domeFloor);

  scene.add(dome);

  // ── Zone sign — placed in front of the entrance, facing the plaza ──
  createZoneSign(scene, CX, R * 0.85 + 0.5, CZ - R - 0.9, "VISUALIZER  DOME", "#A078FF");

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
  doorLight.position.set(CX, 1.0, CZ - R - 1.5);
  scene.add(doorLight);

  scene.userData.visualizerDomePerf = { domeLight, doorLight, baseRing, innerGlowRing, rimGlow, portalGlow };
}