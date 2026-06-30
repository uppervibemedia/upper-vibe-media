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

function makeBeachWorldTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 768;
  canvas.height = 384;
  const ctx = canvas.getContext("2d");
  const ocean = ctx.createLinearGradient(0, 0, 768, 384);
  ocean.addColorStop(0, "#052A46");
  ocean.addColorStop(0.28, "#086987");
  ocean.addColorStop(0.58, "#0A91AC");
  ocean.addColorStop(1, "#07314D");
  ctx.fillStyle = ocean;
  ctx.fillRect(0, 0, 768, 384);

  const continents = [
    [108, 112, 150, 54, -0.18], [300, 220, 190, 70, 0.16], [520, 120, 170, 58, -0.28],
    [650, 270, 145, 52, 0.22], [180, 310, 120, 42, 0.1], [410, 58, 130, 38, -0.1],
  ];
  continents.forEach(([x, y, w, h, rot], i) => {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    ctx.scale(1, h / w);
    const coast = ctx.createRadialGradient(0, 0, w * 0.36, 0, 0, w * 1.08);
    coast.addColorStop(0, i % 2 === 0 ? "rgba(247,214,151,1)" : "rgba(222,177,111,1)");
    coast.addColorStop(0.56, "rgba(196,137,70,0.96)");
    coast.addColorStop(0.72, "rgba(242,222,166,0.58)");
    coast.addColorStop(0.84, "rgba(102,219,235,0.38)");
    coast.addColorStop(1, "rgba(102,219,235,0)");
    ctx.fillStyle = coast;
    ctx.beginPath();
    ctx.arc(0, 0, w, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  });

  for (let i = 0; i < 34; i++) {
    const x = (i * 97) % 768;
    const y = 28 + ((i * 53) % 328);
    const len = 42 + (i % 5) * 22;
    const wave = ctx.createLinearGradient(x - len, y, x + len, y + 6);
    wave.addColorStop(0, "rgba(255,255,255,0)");
    wave.addColorStop(0.5, i % 3 === 0 ? "rgba(199,246,255,0.24)" : "rgba(255,240,198,0.17)");
    wave.addColorStop(1, "rgba(255,255,255,0)");
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate((i % 7 - 3) * 0.08);
    ctx.fillStyle = wave;
    ctx.fillRect(-len, -2, len * 2, 4);
    ctx.restore();
  }

  const glow = ctx.createRadialGradient(230, 110, 0, 230, 110, 360);
  glow.addColorStop(0, "rgba(255,255,255,0.16)");
  glow.addColorStop(0.35, "rgba(154,233,255,0.08)");
  glow.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, 768, 384);

  const texture = new CanvasTexture(canvas);
  texture.minFilter = LinearFilter;
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function addCityBeachPlanet(group) {
  const planetGroup = new Group();
  planetGroup.name = "cityBeachBlueSandPlanet";
  planetGroup.position.set(12, 7.7, 34.5);

  const halo = new Mesh(
    new THREE.SphereGeometry(4.7, 32, 24),
    new MeshBasicMaterial({ color: new Color("#4EDBFF"), transparent: true, opacity: 0.1, depthWrite: false, side: THREE.BackSide })
  );
  halo.name = "cityBeachPlanetHalo";
  planetGroup.add(halo);

  const ocean = new Mesh(
    new THREE.SphereGeometry(3.75, 64, 40),
    new MeshStandardMaterial({ map: makeBeachWorldTexture(), color: new Color("#ffffff"), roughness: 0.44, metalness: 0.12 })
  );
  ocean.name = "cityBeachPlanetOcean";
  ocean.castShadow = true;
  planetGroup.add(ocean);

  const glow = new THREE.PointLight(new Color("#40D4FF"), 1.2, 12);
  glow.position.set(0, 0.4, 1.8);
  planetGroup.add(glow);

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
    if (halo?.material) halo.material.opacity = 0.08 + tide * 0.035;
  }
}