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

  const ocean = ctx.createLinearGradient(0, 0, 512, 256);
  ocean.addColorStop(0, "#83E6FF");
  ocean.addColorStop(0.25, "#159FC4");
  ocean.addColorStop(0.58, "#086F99");
  ocean.addColorStop(1, "#034464");
  ctx.fillStyle = ocean;
  ctx.fillRect(0, 0, 512, 256);

  for (let i = 0; i < 10; i++) {
    const x = 48 + ((i * 97) % 420);
    const y = 34 + ((i * 43) % 178);
    const rx = 42 + (i % 4) * 18;
    const ry = 13 + (i % 3) * 8;
    const land = ctx.createRadialGradient(x, y, 0, x, y, rx);
    land.addColorStop(0, i % 2 ? "rgba(244,205,134,0.92)" : "rgba(198,144,78,0.9)");
    land.addColorStop(0.58, "rgba(210,180,140,0.72)");
    land.addColorStop(1, "rgba(210,180,140,0)");
    ctx.fillStyle = land;
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, Math.sin(i * 1.4) * 0.8, 0, Math.PI * 2);
    ctx.fill();
  }

  for (let i = 0; i < 18; i++) {
    const y = 14 + i * 13 + Math.sin(i * 1.8) * 5;
    const h = 4 + (i % 3) * 3;
    ctx.strokeStyle = i % 2 === 0 ? "rgba(186,246,255,0.18)" : "rgba(245,222,176,0.2)";
    ctx.lineWidth = h;
    ctx.beginPath();
    ctx.ellipse(256, y, 285, 8 + h, Math.sin(i) * 0.06, 0.08, Math.PI * 1.94);
    ctx.stroke();
  }

  for (let i = 0; i < 36; i++) {
    const x = (i * 67) % 512;
    const y = (i * 37) % 256;
    ctx.fillStyle = i % 2 ? "rgba(255,255,255,0.08)" : "rgba(0,30,55,0.08)";
    ctx.fillRect(x, y, 2 + (i % 4), 1 + (i % 3));
  }

  const shade = ctx.createLinearGradient(0, 0, 512, 256);
  shade.addColorStop(0, "rgba(255,255,255,0.24)");
  shade.addColorStop(0.5, "rgba(255,255,255,0.02)");
  shade.addColorStop(1, "rgba(0,18,35,0.32)");
  ctx.fillStyle = shade;
  ctx.fillRect(0, 0, 512, 256);

  const texture = new CanvasTexture(canvas);
  texture.minFilter = LinearFilter;
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function createBeachCloudTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, 512, 256);
  for (let i = 0; i < 16; i++) {
    const x = (i * 73) % 512;
    const y = 24 + ((i * 41) % 190);
    const grd = ctx.createRadialGradient(x, y, 0, x, y, 42 + (i % 4) * 12);
    grd.addColorStop(0, "rgba(255,255,255,0.28)");
    grd.addColorStop(0.55, "rgba(255,255,255,0.12)");
    grd.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = grd;
    ctx.beginPath();
    ctx.ellipse(x, y, 54, 12 + (i % 3) * 4, Math.sin(i) * 0.35, 0, Math.PI * 2);
    ctx.fill();
  }
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
  planetGroup.position.set(12, 6.7, 38.5);

  const halo = new Mesh(
    new THREE.SphereGeometry(2.55, 32, 24),
    new MeshBasicMaterial({ color: new Color("#4EDBFF"), transparent: true, opacity: 0.22, depthWrite: false, side: THREE.DoubleSide })
  );
  halo.name = "cityBeachPlanetHalo";
  halo.userData = { isBeachPortal: true };
  planetGroup.add(halo);

  const aura = new Mesh(
    new THREE.SphereGeometry(2.2, 32, 24),
    new MeshBasicMaterial({ color: new Color("#EAD19A"), transparent: true, opacity: 0.1, depthWrite: false })
  );
  aura.name = "cityBeachPlanetAura";
  planetGroup.add(aura);

  const ocean = new Mesh(
    new THREE.SphereGeometry(1.42, 56, 36),
    new MeshStandardMaterial({ map: createBeachPlanetTexture(), roughness: 0.72, metalness: 0.03 })
  );
  ocean.name = "cityBeachPlanetOcean";
  ocean.userData = { isBeachPortal: true };
  planetGroup.add(ocean);

  const clouds = new Mesh(
    new THREE.SphereGeometry(1.47, 48, 28),
    new MeshBasicMaterial({ map: createBeachCloudTexture(), transparent: true, opacity: 0.34, depthWrite: false })
  );
  clouds.name = "cityBeachPlanetClouds";
  clouds.userData = { isBeachPortal: true };
  planetGroup.add(clouds);

  [-0.52, -0.22, 0.06, 0.34].forEach((y, idx) => {
    const radius = Math.sqrt(Math.max(0.28, 1.42 * 1.42 - y * y));
    const band = new Mesh(
      new THREE.TorusGeometry(radius, 0.028 + idx * 0.004, 10, 96),
      new MeshBasicMaterial({ color: new Color(idx % 2 === 0 ? "#D2B48C" : "#F0C878"), transparent: true, opacity: 0.62, depthWrite: false })
    );
    band.rotation.x = Math.PI / 2;
    band.rotation.z = idx % 2 === 0 ? 0.08 : -0.05;
    band.position.y = y;
    planetGroup.add(band);
  });

  const destinationRing = new Mesh(
    new THREE.TorusGeometry(1.82, 0.028, 8, 112),
    new MeshBasicMaterial({ color: new Color("#00E5FF"), transparent: true, opacity: 0.48, depthWrite: false })
  );
  destinationRing.name = "cityBeachPlanetDestinationRing";
  destinationRing.userData = { isBeachPortal: true };
  destinationRing.rotation.x = Math.PI / 2.35;
  destinationRing.rotation.z = -0.18;
  planetGroup.add(destinationRing);

  const portalLight = new THREE.PointLight(new Color("#00E5FF"), 1.1, 11);
  portalLight.position.set(0, 0.25, 0);
  planetGroup.add(portalLight);

  const portalLabel = makeShorelineLabel("Enter Upper Vibe Beach");
  portalLabel.name = "cityBeachPlanetPortalLabel";
  portalLabel.position.set(0, 2.15, 0);
  portalLabel.scale.set(4.2, 1.0, 1);
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
    const clouds = planet.getObjectByName("cityBeachPlanetClouds");
    const label = planet.getObjectByName("cityBeachPlanetPortalLabel");
    const pulseActive = planet.userData._portalPulseUntil && t < planet.userData._portalPulseUntil;
    const interactive = !!planet.userData._portalHover || pulseActive;
    const pulse = pulseActive ? Math.sin((planet.userData._portalPulseUntil - t) * 28) * 0.035 : 0;
    const targetScale = interactive ? 1.08 + pulse : 1;
    planet.scale.setScalar(planet.scale.x + (targetScale - planet.scale.x) * 0.2);
    if (halo?.material) halo.material.opacity = (interactive ? 0.22 : 0.14) + tide * 0.06;
    if (aura?.material) aura.material.opacity = (interactive ? 0.1 : 0.05) + tide * 0.04;
    if (label) label.visible = interactive;
    if (clouds) clouds.rotation.y = -t * 0.055;
    if (ring) ring.rotation.z = -0.18 + Math.sin(t * 0.35) * 0.08;
  }
}