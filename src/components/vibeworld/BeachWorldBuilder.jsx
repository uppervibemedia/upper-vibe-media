import * as THREE from "three";
import createZenBeach from "./ZenBeach";
import { createBeachDaySky } from "./BeachDaySky";
import { createBeachReturnPlanet } from "./BeachReturnPlanet";
import { createBeachResortAddOns } from "./BeachResortAddOns.jsx";
import { createBeachArrivalReturnPlaza } from "./BeachArrivalReturnPlaza.jsx";
import { createBeachPremiumPolish } from "./BeachPremiumPolish.jsx";

const { Mesh, MeshBasicMaterial, MeshStandardMaterial, PlaneGeometry, CylinderGeometry, RingGeometry, Color, PointLight, AmbientLight, HemisphereLight, DirectionalLight, CanvasTexture, SpriteMaterial, Sprite, LinearFilter } = THREE;

export const CITY_BEACH_PAD = { x: 12, z: 8, radius: 3.2 };
export const BEACH_RETURN_PAD = { x: 10, z: 16, radius: 2.6 };

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
  sprite.scale.set(5.8, 1.1, 1);
  sprite.renderOrder = 999;
  return sprite;
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
  sign.position.set(x, 2.15, z - 1.2);
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
  scene.userData._beachDaylightSky = true;
  createBeachDaySky(scene);

  const SHORELINE_Z = 35;
  const OCEAN_DEPTH = 62;
  const isMob = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

  const islandShape = new THREE.Shape();
  islandShape.moveTo(-8, -34);
  islandShape.bezierCurveTo(28, -36, 62, -25, 66, 0);
  islandShape.bezierCurveTo(70, 25, 46, 49, 8, 54);
  islandShape.bezierCurveTo(-32, 58, -66, 40, -68, 10);
  islandShape.bezierCurveTo(-70, -16, -46, -32, -8, -34);
  const sand = new Mesh(
    new THREE.ExtrudeGeometry(islandShape, { depth: 0.28, bevelEnabled: false, curveSegments: isMob ? 8 : 16 }),
    mat("#D7C5A4", { roughness: 0.78, metalness: 0.04 })
  );
  sand.material.side = THREE.DoubleSide;
  sand.rotation.x = -Math.PI / 2;
  sand.position.set(0, -0.28, 0);
  sand.receiveShadow = true;
  sand.name = "beach";
  scene.add(sand);

  const pathMat = new MeshBasicMaterial({ color: new Color("#D8CFB7"), transparent: true, opacity: 0.26, depthWrite: false, side: THREE.DoubleSide });
  [[14, -5, 38, 3.0], [-18, -5, 42, 3.0], [0, 9, 46, 3.2], [-28, 18, 34, 2.8], [27, 18, 32, 2.8], [0, 25, 58, 2.6]].forEach(([x, z, w, d]) => {
    const path = new Mesh(new PlaneGeometry(w, d), pathMat.clone());
    path.rotation.x = -Math.PI / 2;
    path.position.set(x, 0.012, z);
    path.renderOrder = 1;
    path.name = "beachPath";
    scene.add(path);
  });

  const oceanGeo = new PlaneGeometry(160, OCEAN_DEPTH, isMob ? 6 : 56, isMob ? 6 : 54);
  const ocean = new Mesh(oceanGeo, new MeshBasicMaterial({ color: new Color(isMob ? "#1D9AB4" : "#22B8D6"), side: THREE.DoubleSide }));
  ocean.rotation.x = -Math.PI / 2;
  ocean.position.set(0, 0, SHORELINE_Z + OCEAN_DEPTH / 2);
  ocean.name = "ocean";
  scene.add(ocean);
  scene.userData.ocean = ocean;
  scene.userData._oceanOrig = isMob ? null : (() => { const a = new Float32Array(oceanGeo.attributes.position.array.length); a.set(oceanGeo.attributes.position.array); return a; })();
  scene.userData._oceanStatic = isMob;
  scene.userData._oceanCenterZ = SHORELINE_Z + OCEAN_DEPTH / 2;
  scene.userData.shorelineZ = SHORELINE_Z;

  const foamMat = new MeshBasicMaterial({ color: new Color("#F4FFFF"), transparent: true, opacity: 0.58, depthWrite: false, side: THREE.DoubleSide });
  const foam = new Mesh(new PlaneGeometry(150, 2.05), foamMat);
  foam.rotation.x = -Math.PI / 2;
  foam.position.set(0, 0.006, SHORELINE_Z + 0.3);
  foam.renderOrder = 2;
  foam.name = "foam";
  scene.add(foam);
  scene.userData.foam = foam;
  scene.userData._foamBaseZ = SHORELINE_Z + 0.3;

  const shoreGlow = new Mesh(new PlaneGeometry(150, 1.05), new MeshBasicMaterial({ color: new Color("#65F4E9"), transparent: true, opacity: 0.24, depthWrite: false, side: THREE.DoubleSide }));
  shoreGlow.rotation.x = -Math.PI / 2;
  shoreGlow.position.set(0, 0.012, SHORELINE_Z);
  shoreGlow.renderOrder = 2;
  shoreGlow.name = "shoreGlow";
  scene.add(shoreGlow);
  scene.userData.shoreGlow = shoreGlow;

  createBeachPremiumPolish(scene, { shorelineZ: SHORELINE_Z, isMobile: isMob });
  createZenBeach(scene, 0, 0);
  createBeachResortAddOns(scene);
  createBeachArrivalReturnPlaza(scene);
  createBeachReturnPlanet(scene);
  createTransportPad(scene, { ...BEACH_RETURN_PAD, label: "Return to Upper Vibe City", color: "#EDB84A", name: "returnCityPad" });

  const sun = new DirectionalLight(new Color("#FFE2A8"), 2.45);
  sun.position.set(-18, 34, SHORELINE_Z + 18);
  scene.add(sun);
  scene.add(new AmbientLight(new Color("#FFE8CA"), 1.68));
  const hemi = new HemisphereLight(new Color("#B8F4FF"), new Color("#F0C47B"), 1.46);
  scene.add(hemi);
  [[0, 5, 35, "#FFE3A6", 2.8, 58], [-24, 4, 24, "#FFB35C", 2.0, 24], [28, 4, 24, "#58D8FF", 2.2, 28], [-28, 3, 10, "#B58CFF", 1.35, 22]].forEach(([x, y, z, c, i, d]) => {
    const light = new PointLight(new Color(c), i, d);
    light.position.set(x, y, z);
    scene.add(light);
  });
}