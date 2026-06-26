import * as THREE from "three";

const {
  MeshStandardMaterial,
  MeshBasicMaterial,
  Color,
  PlaneGeometry,
  CircleGeometry,
  CylinderGeometry,
  SphereGeometry,
  BoxGeometry,
  RingGeometry,
  Mesh,
  Group,
  PointLight,
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

function createNeonSign(scene, x, y, z, text, colorHex) {
  const group = new Group();
  group.name = "neonSign_" + text.replace(/\s+/g, "");

  const backGeo = new PlaneGeometry(7, 2);
  const backMat = new MeshBasicMaterial({
    color: new Color(colorHex),
    transparent: true, opacity: 0.12, depthWrite: false, side: THREE.DoubleSide,
  });
  const back = new Mesh(backGeo, backMat);
  back.name = "neonBack";
  group.add(back);

  const borderGeo = new PlaneGeometry(7.1, 2.1);
  const borderMat = new MeshBasicMaterial({
    color: new Color(colorHex),
    transparent: true, opacity: 0.35, depthWrite: false, side: THREE.DoubleSide,
  });
  const borderFrame = new Mesh(borderGeo, borderMat);
  borderFrame.renderOrder = 1;
  group.add(borderFrame);

  const canvas = document.createElement("canvas");
  canvas.width = 256; canvas.height = 64;
  const ctx = canvas.getContext("2d");
  ctx.shadowColor = colorHex;
  ctx.shadowBlur = 12;
  ctx.font = "bold 22px 'Syne', 'Inter', sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "#FFFFFF";
  ctx.fillText(text, 128, 32);
  ctx.fillText(text, 128, 32);

  const tex = new THREE.CanvasTexture(canvas);
  tex.minFilter = THREE.LinearFilter;
  tex.colorSpace = THREE.SRGBColorSpace;

  const spriteMat = new THREE.SpriteMaterial({
    map: tex,
    transparent: true, depthWrite: false, depthTest: false,
  });
  const sprite = new THREE.Sprite(spriteMat);
  sprite.scale.set(6, 1.5, 1);
  sprite.renderOrder = 2;
  group.add(sprite);

  const dot = new Mesh(
    new SphereGeometry(0.12, 8, 6),
    new MeshBasicMaterial({ color: new Color("#FFFFFF"), depthWrite: false })
  );
  dot.position.set(0, 1.2, 0);
  group.add(dot);

  group.position.set(x, y, z);
  group.userData = { isNeonSign: true, baseOpacity: 0.35, colorHex };
  scene.add(group);
}

export default function createVibeShop(scene) {
  const shop = new Group();
  shop.name = "vibeShop";

  const SHOP_X = 22, SHOP_Z = 5;

  // Base platform
  const shopPlat = new Mesh(
    new CircleGeometry(3.5, 32),
    mat("#141028", { roughness: 0.4, metalness: 0.5 })
  );
  shopPlat.rotation.x = -Math.PI / 2;
  shopPlat.position.set(SHOP_X, 0.003, SHOP_Z);
  shopPlat.receiveShadow = true;
  shop.add(shopPlat);

  // Outer gold ring
  const shopOuterRing = new Mesh(
    new RingGeometry(3.3, 3.5, 64),
    new MeshBasicMaterial({ color: new Color("#D4A843"), depthWrite: false, side: THREE.DoubleSide, transparent: true, opacity: 0.5 })
  );
  shopOuterRing.rotation.x = -Math.PI / 2;
  shopOuterRing.position.set(SHOP_X, 0.006, SHOP_Z);
  shopOuterRing.renderOrder = 1;
  shop.add(shopOuterRing);

  // Main building
  const shopBldg = new Mesh(
    new BoxGeometry(5, 3, 4),
    mat("#181030", { roughness: 0.3, metalness: 0.4, transparent: true, opacity: 0.85, depthWrite: true })
  );
  shopBldg.position.set(SHOP_X, 1.65, SHOP_Z);
  shopBldg.castShadow = true;
  shop.add(shopBldg);

  // Window front — large glass-panel display (faces plaza)
  const shopFrontAngle = Math.atan2(SHOP_Z - (-4), SHOP_X - 0);
  const windowMat = new MeshBasicMaterial({
    color: new Color("#00D4F0"),
    depthWrite: false, transparent: true, opacity: 0.35,
  });
  const windowFront = new Mesh(new PlaneGeometry(3.5, 2.2), windowMat);
  windowFront.position.set(
    SHOP_X - Math.cos(shopFrontAngle) * 2.02,
    1.65,
    SHOP_Z - Math.sin(shopFrontAngle) * 2.02
  );
  windowFront.rotation.y = shopFrontAngle;
  windowFront.name = "shopWindow";
  shop.add(windowFront);

  // Window frame glow
  const winFrameMat = new MeshBasicMaterial({
    color: new Color("#D4A843"),
    depthWrite: false, transparent: true, opacity: 0.4,
  });
  const winFrame = new Mesh(new PlaneGeometry(3.7, 2.4), winFrameMat);
  winFrame.position.copy(windowFront.position);
  winFrame.rotation.y = shopFrontAngle;
  winFrame.renderOrder = 1;
  shop.add(winFrame);

  // Display shelf items
  for (let s = 0; s < 3; s++) {
    const sx = SHOP_X - Math.cos(shopFrontAngle) * 2.02 + Math.sin(shopFrontAngle) * (s - 1) * 1.0;
    const sy = 1.2 + (s % 2) * 0.8;
    const sz = SHOP_Z - Math.sin(shopFrontAngle) * 2.02 + Math.cos(shopFrontAngle) * (s - 1) * 1.0;
    const item = new Mesh(
      new BoxGeometry(0.25, 0.25, 0.25),
      new MeshBasicMaterial({ color: new Color(["#7C3AED", "#00D4F0", "#D4A843"][s]), depthWrite: false, transparent: true, opacity: 0.6 })
    );
    item.position.set(sx, sy, sz);
    shop.add(item);
  }

  // Roof accent rings
  for (const ry of [0.3, 3.15]) {
    const shopRoofRing = new Mesh(
      new BoxGeometry(5.15, 0.04, 4.15),
      new MeshBasicMaterial({ color: new Color(ry > 1 ? "#D4A843" : "#7C3AED"), depthWrite: false, transparent: true, opacity: 0.4 })
    );
    shopRoofRing.position.set(SHOP_X, ry, SHOP_Z);
    shop.add(shopRoofRing);
  }

  // Roof top accent
  const roofAccent = new Mesh(
    new SphereGeometry(0.35, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2),
    mat("#2A1A5A", { roughness: 0.25, metalness: 0.5, transparent: true, opacity: 0.6, depthWrite: true })
  );
  roofAccent.position.set(SHOP_X, 3.2, SHOP_Z);
  roofAccent.castShadow = true;
  shop.add(roofAccent);

  const roofDot = new Mesh(
    new SphereGeometry(0.08, 6, 4),
    new MeshBasicMaterial({ color: new Color("#D4A843"), depthWrite: false })
  );
  roofDot.position.set(SHOP_X, 3.55, SHOP_Z);
  shop.add(roofDot);

  scene.add(shop);
  createNeonSign(scene, SHOP_X, 4.5, SHOP_Z, "VIBE  SHOP", "#D4A843");

  // Shop ambient light
  const shopLight = new PointLight();
  shopLight.color = new Color("#D4A843");
  shopLight.intensity = 1.5;
  shopLight.distance = 10;
  shopLight.position.set(SHOP_X, 2, SHOP_Z);
  scene.add(shopLight);

  return { shop, SHOP_X, SHOP_Z };
}