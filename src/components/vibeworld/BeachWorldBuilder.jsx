import * as THREE from "three";
import createZenBeach from "./ZenBeach";
import { createHoverboardZone } from "./HoverboardRingRun";
import { buildVibeAcademyZone } from "./city-engine/zones/VibeAcademyZone";
import { createCosmicSky } from "./CosmicSkySystem";

const { Mesh, MeshBasicMaterial, MeshStandardMaterial, PlaneGeometry, CylinderGeometry, RingGeometry, Color, PointLight, AmbientLight, HemisphereLight, DirectionalLight, CanvasTexture, SpriteMaterial, Sprite, LinearFilter } = THREE;

export const CITY_BEACH_PAD = { x: 12, z: 8, radius: 3.2 };
export const BEACH_RETURN_PAD = { x: 0, z: -9, radius: 3.2 };

function mat(hexColor, opts = {}) {
  const m = new MeshStandardMaterial();
  m.color = new Color(hexColor);
  m.roughness = opts.roughness ?? 0.6;
  m.metalness = opts.metalness ?? 0.05;
  if (opts.transparent) {
    m.transparent = true;
    m.opacity = opts.opacity ?? 1;
    m.depthWrite = opts.depthWrite ?? true;
  }
  return m;
}

function makeLabel(text, colorHex) {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 96;
  const ctx = canvas.getContext("2d");
  ctx.shadowColor = colorHex;
  ctx.shadowBlur = 18;
  ctx.font = "900 28px 'Syne','Inter',sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "#fff";
  ctx.fillText(text, 256, 48);
  ctx.fillText(text, 256, 48);
  const tex = new CanvasTexture(canvas);
  tex.minFilter = LinearFilter;
  tex.colorSpace = THREE.SRGBColorSpace;
  const sprite = new Sprite(new SpriteMaterial({ map: tex, transparent: true, depthWrite: false, depthTest: false }));
  sprite.scale.set(8, 1.5, 1);
  sprite.renderOrder = 999;
  return sprite;
}

function createUpperVibeBeachPlanet(scene) {
  const group = new THREE.Group();
  group.name = "upperVibeBeachPlanet";
  group.position.set(-7.5, 3.1, -4.5);

  const planet = new Mesh(
    new THREE.SphereGeometry(2.6, 48, 32),
    mat("#0B7FA0", { roughness: 0.58, metalness: 0.08 })
  );
  planet.castShadow = true;
  group.add(planet);

  [-0.95, -0.35, 0.25, 0.82].forEach((y, idx) => {
    const band = new Mesh(
      new THREE.TorusGeometry(Math.sqrt(Math.max(0.4, 2.6 * 2.6 - y * y)), 0.085 + idx * 0.01, 12, 96),
      mat(idx % 2 === 0 ? "#D2B48C" : "#F0C878", { roughness: 0.72, metalness: 0.02 })
    );
    band.rotation.x = Math.PI / 2;
    band.position.y = y;
    group.add(band);
  });

  const glow = new PointLight(new Color("#40D4FF"), 1.4, 12);
  glow.position.set(0, 1.8, 1.5);
  group.add(glow);

  scene.add(group);
  scene.userData.upperVibeBeachPlanet = group;
  return group;
}

export function createTransportPad(scene, { x, z, label, color = "#00E5FF", name = "transportPad" }) {
  const base = new Mesh(new CylinderGeometry(2.2, 2.45, 0.14, 48), mat("#111033", { roughness: 0.2, metalness: 0.8 }));
  base.position.set(x, 0.07, z);
  base.receiveShadow = true;
  base.name = name;
  scene.add(base);

  const ring = new Mesh(new RingGeometry(1.55, 2.18, 72), new MeshBasicMaterial({ color: new Color(color), transparent: true, opacity: 0.72, depthWrite: false, side: THREE.DoubleSide }));
  ring.rotation.x = -Math.PI / 2;
  ring.position.set(x, 0.16, z);
  ring.renderOrder = 2;
  scene.add(ring);

  const glow = new Mesh(new RingGeometry(0.45, 1.0, 64), new MeshBasicMaterial({ color: new Color("#A078FF"), transparent: true, opacity: 0.4, depthWrite: false, side: THREE.DoubleSide }));
  glow.rotation.x = -Math.PI / 2;
  glow.position.set(x, 0.17, z);
  glow.renderOrder = 2;
  scene.add(glow);

  const sign = makeLabel(label, color);
  sign.position.set(x, 2.35, z);
  sign.userData = { isNeonSign: true };
  scene.add(sign);

  const light = new PointLight(new Color(color), 2.2, 14);
  light.position.set(x, 2.4, z);
  scene.add(light);

  scene.userData.transportPads = scene.userData.transportPads || [];
  scene.userData.transportPads.push({ x, z, label, name, ring, glow, light });
  return { base, ring, glow, sign, light };
}

export function createBeachWorld(scene) {
  createCosmicSky(scene);

  const SHORELINE_Z = 35;
  const OCEAN_DEPTH = 62;
  const isMob = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

  const sand = new Mesh(new PlaneGeometry(116, 82), mat("#D2B48C", { roughness: 0.9, metalness: 0.0 }));
  sand.rotation.x = -Math.PI / 2;
  sand.position.set(0, 0, 10);
  sand.receiveShadow = true;
  sand.name = "beach";
  scene.add(sand);

  const pathMat = new MeshBasicMaterial({ color: new Color("#E0C999"), transparent: true, opacity: 0.44, depthWrite: false, side: THREE.DoubleSide });
  [[0, 9, 62, 4.5], [-24, 16, 5, 26], [20, 21, 52, 5]].forEach(([x, z, w, d]) => {
    const path = new Mesh(new PlaneGeometry(w, d), pathMat.clone());
    path.rotation.x = -Math.PI / 2;
    path.position.set(x, 0.012, z);
    path.renderOrder = 1;
    path.name = "beachPath";
    scene.add(path);
  });

  const oceanGeo = new PlaneGeometry(118, OCEAN_DEPTH, isMob ? 4 : 56, isMob ? 4 : 54);
  const ocean = new Mesh(oceanGeo, new MeshBasicMaterial({ color: new Color(isMob ? "#204468" : "#284A78"), side: THREE.DoubleSide }));
  ocean.rotation.x = -Math.PI / 2;
  ocean.position.set(0, 0, SHORELINE_Z + OCEAN_DEPTH / 2);
  ocean.name = "ocean";
  scene.add(ocean);
  scene.userData.ocean = ocean;
  scene.userData._oceanOrig = isMob ? null : (() => { const a = new Float32Array(oceanGeo.attributes.position.array.length); a.set(oceanGeo.attributes.position.array); return a; })();
  scene.userData._oceanStatic = isMob;
  scene.userData._oceanCenterZ = SHORELINE_Z + OCEAN_DEPTH / 2;
  scene.userData.shorelineZ = SHORELINE_Z;

  const foamMat = new MeshBasicMaterial({ color: new Color("#FFFFFF"), transparent: true, opacity: 0.5, depthWrite: false, side: THREE.DoubleSide });
  const foam = new Mesh(new PlaneGeometry(118, 1.6), foamMat);
  foam.rotation.x = -Math.PI / 2;
  foam.position.set(0, 0.006, SHORELINE_Z + 0.3);
  foam.renderOrder = 2;
  foam.name = "foam";
  scene.add(foam);
  scene.userData.foam = foam;
  scene.userData._foamBaseZ = SHORELINE_Z + 0.3;

  const shoreGlow = new Mesh(new PlaneGeometry(118, 0.55), new MeshBasicMaterial({ color: new Color("#00D4F0"), transparent: true, opacity: 0.2, depthWrite: false, side: THREE.DoubleSide }));
  shoreGlow.rotation.x = -Math.PI / 2;
  shoreGlow.position.set(0, 0.012, SHORELINE_Z);
  shoreGlow.renderOrder = 2;
  shoreGlow.name = "shoreGlow";
  scene.add(shoreGlow);
  scene.userData.shoreGlow = shoreGlow;

  buildVibeAcademyZone(scene);
  createZenBeach(scene, 0, 0);
  createHoverboardZone(scene);
  createTransportPad(scene, { ...BEACH_RETURN_PAD, label: "Return to Upper Vibe City", color: "#EDB84A", name: "returnCityPad" });
  createUpperVibeBeachPlanet(scene);

  const moon = new DirectionalLight(new Color("#8899CC"), 0.55);
  moon.position.set(15, 22, SHORELINE_Z + 10);
  scene.add(moon);
  scene.add(new AmbientLight(new Color("#4C4A7A"), 0.62));
  const hemi = new HemisphereLight(new Color("#6B64B8"), new Color("#C9A66B"), 0.58);
  scene.add(hemi);
  [[0, 4, 35, "#B0D8F0", 2.2, 52], [-24, 4, 24, "#F97316", 1.6, 20], [28, 4, 24, "#00C8FF", 2.6, 26], [-28, 3, 10, "#7C3AED", 1.8, 20]].forEach(([x, y, z, c, i, d]) => {
    const light = new PointLight(new Color(c), i, d);
    light.position.set(x, y, z);
    scene.add(light);
  });
}