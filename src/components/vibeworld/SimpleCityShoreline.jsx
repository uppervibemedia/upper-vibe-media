import * as THREE from "three";

const {
  Group,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  PlaneGeometry,
  CylinderGeometry,
  ConeGeometry,
  CircleGeometry,
  CanvasTexture,
  SpriteMaterial,
  Sprite,
  Color,
  LinearFilter,
} = THREE;

function standardMat(hex, opts = {}) {
  const mat = new MeshStandardMaterial({ color: new Color(hex) });
  mat.roughness = opts.roughness ?? 0.85;
  mat.metalness = opts.metalness ?? 0.02;
  if (opts.transparent) {
    mat.transparent = true;
    mat.opacity = opts.opacity ?? 1;
    mat.depthWrite = opts.depthWrite ?? true;
  }
  return mat;
}

function makeShorelineLabel(text) {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, 512, 128);
  ctx.fillStyle = "rgba(20, 28, 34, 0.72)";
  ctx.strokeStyle = "rgba(224, 201, 153, 0.85)";
  ctx.lineWidth = 5;
  ctx.roundRect?.(24, 28, 464, 72, 18);
  if (ctx.roundRect) {
    ctx.fill();
    ctx.stroke();
  } else {
    ctx.fillRect(24, 28, 464, 72);
    ctx.strokeRect(24, 28, 464, 72);
  }
  ctx.font = "900 28px 'Syne','Inter',sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "#F4E1B7";
  ctx.fillText(text, 256, 64);

  const texture = new CanvasTexture(canvas);
  texture.minFilter = LinearFilter;
  texture.colorSpace = THREE.SRGBColorSpace;
  const sprite = new Sprite(new SpriteMaterial({ map: texture, transparent: true, depthWrite: false, depthTest: false }));
  sprite.scale.set(7.5, 1.85, 1);
  sprite.renderOrder = 50;
  sprite.userData = { isNeonSign: true };
  return sprite;
}

function createBeachPlanetTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext("2d");

  const bg = ctx.createLinearGradient(0, 0, 512, 256);
  bg.addColorStop(0, "#BFEFFF");
  bg.addColorStop(0.2, "#1BA8C5");
  bg.addColorStop(0.52, "#0B7FA0");
  bg.addColorStop(0.78, "#D2B48C");
  bg.addColorStop(1, "#F0C878");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, 512, 256);

  for (let i = 0; i < 14; i++) {
    const y = 20 + i * 15 + Math.sin(i * 1.7) * 7;
    const h = 7 + (i % 3) * 3;
    const band = ctx.createLinearGradient(0, y, 512, y + h);
    band.addColorStop(0, "rgba(255,255,255,0)");
    band.addColorStop(0.42, i % 2 === 0 ? "rgba(245,214,150,0.38)" : "rgba(100,225,240,0.26)");
    band.addColorStop(0.7, i % 3 === 0 ? "rgba(160,112,58,0.22)" : "rgba(0,95,125,0.18)");
    band.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = band;
    ctx.beginPath();
    ctx.ellipse(256, y, 285, h, Math.sin(i) * 0.08, 0, Math.PI * 2);
    ctx.fill();
  }

  for (let i = 0; i < 18; i++) {
    const x = (i * 83) % 512;
    const y = 34 + ((i * 49) % 180);
    const r = 15 + (i % 5) * 7;
    const patch = ctx.createRadialGradient(x, y, 0, x, y, r);
    patch.addColorStop(0, i % 2 === 0 ? "rgba(255,230,170,0.32)" : "rgba(160,240,248,0.22)");
    patch.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = patch;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }

  const shade = ctx.createLinearGradient(0, 0, 512, 256);
  shade.addColorStop(0, "rgba(255,255,255,0.2)");
  shade.addColorStop(0.58, "rgba(255,255,255,0.02)");
  shade.addColorStop(1, "rgba(0,45,70,0.14)");
  ctx.fillStyle = shade;
  ctx.fillRect(0, 0, 512, 256);

  const texture = new CanvasTexture(canvas);
  texture.minFilter = LinearFilter;
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function addSimplePalm(group, x, z, scale = 1) {
  const trunk = new Mesh(
    new CylinderGeometry(0.18 * scale, 0.28 * scale, 2.6 * scale, 7),
    standardMat("#8B5A2B", { roughness: 0.9 })
  );
  trunk.position.set(x, 1.3 * scale, z);
  trunk.rotation.z = 0.12;
  trunk.castShadow = true;
  group.add(trunk);

  const crown = new Group();
  crown.position.set(x + 0.18 * scale, 2.62 * scale, z);
  const leafMat = new MeshBasicMaterial({ color: new Color("#2E8B57"), transparent: true, opacity: 0.86, depthWrite: false, side: THREE.DoubleSide });
  for (let i = 0; i < 6; i++) {
    const leaf = new Mesh(new ConeGeometry(0.34 * scale, 1.9 * scale, 4), leafMat.clone());
    leaf.position.set(Math.sin(i * Math.PI / 3) * 0.45 * scale, 0, Math.cos(i * Math.PI / 3) * 0.45 * scale);
    leaf.rotation.x = Math.PI / 2;
    leaf.rotation.z = i * Math.PI / 3;
    crown.add(leaf);
  }
  group.add(crown);
}

function addCityBeachPlanet(group) {
  const planetGroup = new Group();
  planetGroup.name = "cityBeachBlueSandPlanet";
  planetGroup.position.set(12, 8.2, 31.5);

  const halo = new Mesh(
    new THREE.SphereGeometry(3.65, 28, 20),
    new MeshBasicMaterial({ color: new Color("#4EDBFF"), transparent: true, opacity: 0.2, depthWrite: false, side: THREE.BackSide })
  );
  halo.name = "cityBeachPlanetHalo";
  halo.userData = { isBeachPortal: true };
  planetGroup.add(halo);

  const aura = new Mesh(
    new THREE.SphereGeometry(3.1, 28, 20),
    new MeshBasicMaterial({ color: new Color("#EAD19A"), transparent: true, opacity: 0.09, depthWrite: false })
  );
  aura.name = "cityBeachPlanetAura";
  planetGroup.add(aura);

  const ocean = new Mesh(
    new THREE.SphereGeometry(2.15, 48, 32),
    new MeshBasicMaterial({ map: createBeachPlanetTexture() })
  );
  ocean.name = "cityBeachPlanetOcean";
  ocean.userData = { isBeachPortal: true };
  planetGroup.add(ocean);

  [-0.86, -0.38, 0.08, 0.56].forEach((y, idx) => {
    const radius = Math.sqrt(Math.max(0.42, 2.15 * 2.15 - y * y));
    const band = new Mesh(
      new THREE.TorusGeometry(radius, 0.055 + idx * 0.006, 10, 96),
      new MeshBasicMaterial({ color: new Color(idx % 2 === 0 ? "#D2B48C" : "#F0C878"), transparent: true, opacity: 0.82, depthWrite: false })
    );
    band.rotation.x = Math.PI / 2;
    band.rotation.z = idx % 2 === 0 ? 0.08 : -0.05;
    band.position.y = y;
    planetGroup.add(band);
  });

  const destinationRing = new Mesh(
    new THREE.TorusGeometry(2.65, 0.035, 8, 96),
    new MeshBasicMaterial({ color: new Color("#00E5FF"), transparent: true, opacity: 0.52, depthWrite: false })
  );
  destinationRing.name = "cityBeachPlanetDestinationRing";
  destinationRing.userData = { isBeachPortal: true };
  destinationRing.rotation.x = Math.PI / 2.35;
  destinationRing.rotation.z = -0.18;
  planetGroup.add(destinationRing);

  const portalLabel = makeShorelineLabel("Enter Upper Vibe Beach");
  portalLabel.name = "cityBeachPlanetPortalLabel";
  portalLabel.position.set(0, 3.15, 0);
  portalLabel.scale.set(5.6, 1.35, 1);
  portalLabel.visible = false;
  planetGroup.add(portalLabel);

  planetGroup.userData = { isBeachPortal: true, baseScale: 1 };

  group.add(planetGroup);
  return planetGroup;
}

export function createSimpleCityShoreline(scene) {
  const group = new Group();
  group.name = "simpleCityShoreline";

  const sand = new Mesh(new PlaneGeometry(76, 18, 1, 1), standardMat("#D2B48C", { roughness: 0.95, metalness: 0 }));
  sand.rotation.x = -Math.PI / 2;
  sand.position.set(0, 0.002, 24);
  sand.receiveShadow = true;
  sand.name = "cityBeachSand";
  group.add(sand);

  const wetSand = new Mesh(
    new PlaneGeometry(76, 3.2, 1, 1),
    new MeshBasicMaterial({ color: new Color("#C9A66B"), transparent: true, opacity: 0.58, depthWrite: false, side: THREE.DoubleSide })
  );
  wetSand.rotation.x = -Math.PI / 2;
  wetSand.position.set(0, 0.008, 31.1);
  wetSand.renderOrder = 1;
  group.add(wetSand);

  const water = new Mesh(
    new PlaneGeometry(84, 28, 1, 1),
    new MeshBasicMaterial({ color: new Color("#24496B"), transparent: true, opacity: 0.88, side: THREE.DoubleSide })
  );
  water.rotation.x = -Math.PI / 2;
  water.position.set(0, -0.004, 45.5);
  water.name = "cityShoreWater";
  group.add(water);

  const foam = new Mesh(
    new PlaneGeometry(76, 0.9, 1, 1),
    new MeshBasicMaterial({ color: new Color("#F8F2E6"), transparent: true, opacity: 0.42, depthWrite: false, side: THREE.DoubleSide })
  );
  foam.rotation.x = -Math.PI / 2;
  foam.position.set(0, 0.014, 32.15);
  foam.renderOrder = 2;
  foam.name = "foam";
  group.add(foam);

  const waterEdge = new Mesh(
    new PlaneGeometry(76, 0.44, 1, 1),
    new MeshBasicMaterial({ color: new Color("#7EC8D6"), transparent: true, opacity: 0.18, depthWrite: false, side: THREE.DoubleSide })
  );
  waterEdge.rotation.x = -Math.PI / 2;
  waterEdge.position.set(0, 0.018, 32.55);
  waterEdge.renderOrder = 2;
  waterEdge.name = "shoreGlow";
  group.add(waterEdge);

  const path = new Mesh(
    new PlaneGeometry(7.5, 12, 1, 1),
    new MeshBasicMaterial({ color: new Color("#E0C999"), transparent: true, opacity: 0.38, depthWrite: false, side: THREE.DoubleSide })
  );
  path.rotation.x = -Math.PI / 2;
  path.position.set(12, 0.016, 15.5);
  path.renderOrder = 1;
  group.add(path);

  [-26, -14, 24].forEach((x, i) => addSimplePalm(group, x, i === 1 ? 22 : 24.5, i === 1 ? 0.82 : 0.95));
  const beachPlanet = addCityBeachPlanet(group);

  const label = makeShorelineLabel("Upper Vibe Shoreline");
  label.position.set(-12, 2.2, 20.5);
  group.add(label);

  const sunDisc = new Mesh(
    new CircleGeometry(2.2, 24),
    new MeshBasicMaterial({ color: new Color("#EDB84A"), transparent: true, opacity: 0.18, depthWrite: false, side: THREE.DoubleSide })
  );
  sunDisc.position.set(28, 9, 48);
  sunDisc.rotation.y = Math.PI;
  group.add(sunDisc);

  scene.add(group);
  scene.userData.cityBeachPlanet = beachPlanet;
  scene.userData.cityShoreline = { group, foam, waterEdge };
  scene.userData.ocean = water;
  scene.userData._oceanOrig = null;
  scene.userData._oceanStatic = true;
  scene.userData._oceanCenterZ = 45.5;
  scene.userData.shorelineZ = 32;
  scene.userData.foam = foam;
  scene.userData._foamBaseZ = 32.15;
  scene.userData.shoreGlow = waterEdge;
}

export function animateSimpleCityShoreline(scene, t) {
  const shoreline = scene.userData.cityShoreline;
  if (!shoreline) return;
  const tide = Math.sin(t * 0.45) * 0.5 + 0.5;
  if (shoreline.foam?.material) {
    shoreline.foam.material.opacity = 0.28 + tide * 0.24;
    shoreline.foam.position.z = 31.95 + tide * 0.32;
  }
  if (shoreline.waterEdge?.material) {
    shoreline.waterEdge.material.color.set("#7EC8D6");
    shoreline.waterEdge.material.opacity = 0.12 + tide * 0.08;
  }
  const planet = scene.userData.cityBeachPlanet;
  if (planet) {
    planet.rotation.y = t * 0.075;
    const halo = planet.getObjectByName("cityBeachPlanetHalo");
    const aura = planet.getObjectByName("cityBeachPlanetAura");
    const ring = planet.getObjectByName("cityBeachPlanetDestinationRing");
    const label = planet.getObjectByName("cityBeachPlanetPortalLabel");
    const pulseActive = planet.userData._portalPulseUntil && t < planet.userData._portalPulseUntil;
    const interactive = !!planet.userData._portalHover || pulseActive;
    const pulse = pulseActive ? Math.sin((planet.userData._portalPulseUntil - t) * 28) * 0.035 : 0;
    const targetScale = interactive ? 1.08 + pulse : 1;
    planet.scale.setScalar(planet.scale.x + (targetScale - planet.scale.x) * 0.2);
    if (halo?.material) halo.material.opacity = (interactive ? 0.22 : 0.14) + tide * 0.06;
    if (aura?.material) aura.material.opacity = (interactive ? 0.1 : 0.05) + tide * 0.04;
    if (label) label.visible = interactive;
    if (ring) ring.rotation.z = -0.18 + Math.sin(t * 0.35) * 0.08;
  }
}