// ═══════════════════════════════════════════════════════════════
// CITY SKYLINE — realistic glass & steel waterfront district
// Extracted from CityCanvas to keep the main file manageable.
// ═══════════════════════════════════════════════════════════════
import * as THREE from "three";

const {
  Color,
  BoxGeometry,
  CylinderGeometry,
  SphereGeometry,
  PlaneGeometry,
  MeshStandardMaterial,
  MeshBasicMaterial,
  Mesh,
  Group,
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

const CENTER_X = 0;
const CENTER_Z = -4;

export default function createCitySkyline(scene) {
  const buildings = new Group();
  buildings.name = "cityBuildings";

  const glassBody = mat("#8899BB", { roughness: 0.18, metalness: 0.40 });
  const steelBody = mat("#99AACC", { roughness: 0.22, metalness: 0.70 });
  const silverBody = mat("#AABBCC", { roughness: 0.28, metalness: 0.60 });
  const whiteBody = mat("#C0C8D8", { roughness: 0.28, metalness: 0.25 });
  const darkSteel = mat("#667788", { roughness: 0.28, metalness: 0.75 });

  // Each store window/door gets its own material for independent animation
  function makeStoreMat(warm) {
    const m = new MeshBasicMaterial();
    // Slightly vary warm (gold-amber) or cool (purple-lavender) tones
    if (warm) {
      const r = 0.9 + Math.random() * 0.15;
      const g = 0.82 + Math.random() * 0.16;
      const b = 0.6 + Math.random() * 0.2;
      m.color = new Color(r, g, b);
      m.opacity = 0.65 + Math.random() * 0.35;
    } else {
      const r = 0.76 + Math.random() * 0.16;
      const g = 0.68 + Math.random() * 0.16;
      const b = 0.88 + Math.random() * 0.12;
      m.color = new Color(r, g, b);
      m.opacity = 0.5 + Math.random() * 0.45;
    }
    m.depthWrite = false;
    m.transparent = true;
    return m;
  }

  const neonCyan = new MeshBasicMaterial();
  neonCyan.color = new Color("#00E5FF");
  neonCyan.depthWrite = false;
  neonCyan.transparent = true;
  neonCyan.opacity = 0.9;

  const neonPurple = new MeshBasicMaterial();
  neonPurple.color = new Color("#C43BFF");
  neonPurple.depthWrite = false;
  neonPurple.transparent = true;
  neonPurple.opacity = 0.9;

  const neonBlue = new MeshBasicMaterial();
  neonBlue.color = new Color("#40A0EE");
  neonBlue.depthWrite = false;
  neonBlue.transparent = true;
  neonBlue.opacity = 0.9;

  const floorBand = new MeshBasicMaterial();
  floorBand.color = new Color("#88BBEE");
  floorBand.depthWrite = false;
  floorBand.transparent = true;
  floorBand.opacity = 0.65;

  function addSkyscraper(x, z, w, d, h, bodyMat, accentMat, name, rotY = 0) {
    const g = new Group();
    if (name) g.name = name;
    const body = new Mesh(new BoxGeometry(w, h, d), bodyMat);
    body.position.y = h / 2;
    body.castShadow = true;
    body.receiveShadow = true;
    g.add(body);

    // ── Vertical neon corner strips ──────────────────────────
    for (const [cx, cz] of [[-w/2, d/2], [w/2, d/2], [-w/2, -d/2], [w/2, -d/2]]) {
      const strip = new Mesh(new BoxGeometry(0.04, h - 0.3, 0.04), accentMat);
      strip.position.set(cx, h / 2, cz);
      g.add(strip);
    }

    // ── Glowing office windows (scattered grid on wide faces) ─
    const winMat = new MeshBasicMaterial();
    winMat.color = new Color("#FFF0D0");
    winMat.depthWrite = false;
    winMat.transparent = true;
    winMat.opacity = 0.75;

    const winPurple = new MeshBasicMaterial();
    winPurple.color = new Color("#E4D0FF");
    winPurple.depthWrite = false;
    winPurple.transparent = true;
    winPurple.opacity = 0.55;

    const winRows = Math.floor((h - 2.5) / 1.4);
    const winCols = Math.max(1, Math.floor(w / 0.9));
    if (winRows > 0 && winCols > 0) {
      for (let row = 0; row < winRows; row++) {
        const wy = 2.8 + row * 1.4;
        for (let col = 0; col < winCols; col++) {
          // Random occupancy — ~65% of windows lit
          if (Math.random() > 0.65) continue;
          const wx = -w * 0.4 + col * (w * 0.8 / (winCols - 1));
          const wmat = Math.random() > 0.7 ? winPurple : winMat;
          const sw = new Mesh(new PlaneGeometry(0.3, 0.5), wmat);
          sw.position.set(wx, wy, d / 2 + 0.03);
          g.add(sw);
          // Back face too
          const swb = new Mesh(new PlaneGeometry(0.3, 0.5), wmat);
          swb.position.set(wx, wy, -d / 2 - 0.03);
          swb.rotation.y = Math.PI;
          g.add(swb);
        }
      }
    }

    const colCount = Math.max(2, Math.floor(w / 0.55));
    for (let col = 0; col < colCount; col++) {
      const cx = -w * 0.42 + col * (w * 0.84 / (colCount - 1));
      const pillar = new Mesh(new BoxGeometry(0.04, h, 0.06), whiteBody);
      pillar.position.set(cx, h / 2, d / 2 + 0.02);
      g.add(pillar);
      const pillarB = new Mesh(new BoxGeometry(0.04, h, 0.06), whiteBody);
      pillarB.position.set(cx, h / 2, -d / 2 - 0.02);
      g.add(pillarB);
    }

    const bandCount = Math.floor(h / 2.0);
    for (let b = 1; b <= bandCount; b++) {
      const by = b * 2.0;
      if (by > h - 0.6) continue;
      const band = new Mesh(new BoxGeometry(w + 0.02, 0.06, d + 0.02), floorBand);
      band.position.y = by;
      g.add(band);
    }

    const crown = new Mesh(new BoxGeometry(w + 0.1, 0.15, d + 0.1), accentMat);
    crown.position.y = h + 0.07;
    g.add(crown);

    if (h > 10) {
      const spire = new Mesh(new CylinderGeometry(0.03, 0.06, 1.5, 8), accentMat);
      spire.position.y = h + 0.85;
      g.add(spire);
      const tip = new Mesh(new SphereGeometry(0.08, 8, 6), accentMat);
      tip.position.y = h + 1.65;
      g.add(tip);
    }

    // Storefront base
    const storeH = 2.0;
    const storeBody = new Mesh(new BoxGeometry(w - 0.04, storeH, d + 0.15), silverBody);
    storeBody.position.y = storeH / 2;
    storeBody.castShadow = true;
    storeBody.receiveShadow = true;
    g.add(storeBody);

    const awning = new Mesh(new BoxGeometry(w - 0.1, 0.1, d + 0.25), accentMat);
    awning.position.y = storeH + 0.05;
    g.add(awning);

    const winCount = Math.max(1, Math.floor(w / 1.2));
    for (let ww = 0; ww < winCount; ww++) {
      const wx = -w * 0.38 + ww * (w * 0.76 / (winCount - 1));
      // Each store window gets its own unique material — independent timing
      const frontMat = makeStoreMat(ww % 2 === 0);
      const backMat = makeStoreMat(ww % 2 === 0);
      const sw = new Mesh(new PlaneGeometry(0.55, 1.0), frontMat);
      sw.position.set(wx, 1.0, d / 2 + 0.08);
      g.add(sw);
      const swb = new Mesh(new PlaneGeometry(0.55, 1.0), backMat);
      swb.position.set(wx, 1.0, -d / 2 - 0.08);
      swb.rotation.y = Math.PI;
      g.add(swb);
    }

    const door = new Mesh(new PlaneGeometry(0.5, 1.5), makeStoreMat(true));
    door.position.set(0, 0.85, d / 2 + 0.1);
    g.add(door);

    const sidewalk = new Mesh(new BoxGeometry(w + 0.3, 0.04, d + 0.3), whiteBody);
    sidewalk.position.y = 0.02;
    g.add(sidewalk);

    g.position.set(x, 0, z);
    g.rotation.y = rotY;
    buildings.add(g);
  }

  function addSetbackTower(x, z, baseW, baseD, sections, accentMat, name, rotY = 0) {
    const g = new Group();
    if (name) g.name = name;
    let y = 0;
    let w = baseW;
    let d = baseD;
    const hPer = 3.5;

    for (let s = 0; s < sections; s++) {
      const body = new Mesh(new BoxGeometry(w, hPer, d), s % 2 === 0 ? glassBody : steelBody);
      body.position.y = y + hPer / 2;
      body.castShadow = true;
      body.receiveShadow = true;
      g.add(body);

      // Neon corners
      for (const [cx, cz] of [[-w/2, d/2], [w/2, d/2], [-w/2, -d/2], [w/2, -d/2]]) {
        const strip = new Mesh(new BoxGeometry(0.04, hPer - 0.2, 0.04), accentMat);
        strip.position.set(cx, y + hPer / 2, cz);
        g.add(strip);
      }

      // Glowing windows
      const winMat = new MeshBasicMaterial({ color: new Color("#FFF0D0"), depthWrite: false, transparent: true, opacity: 0.7 });
      const winCols = Math.max(1, Math.floor(w / 0.8));
      for (let col = 0; col < winCols; col++) {
        if (Math.random() > 0.55) continue;
        const wx = -w * 0.38 + col * (w * 0.76 / (winCols - 1));
        const sw = new Mesh(new PlaneGeometry(0.25, 0.45), winMat);
        sw.position.set(wx, y + hPer / 2, d / 2 + 0.03);
        g.add(sw);
      }

      for (const [px, pz] of [[-w/2.2, d/2.2], [w/2.2, d/2.2], [-w/2.2, -d/2.2], [w/2.2, -d/2.2]]) {
        const pillar = new Mesh(new BoxGeometry(0.05, hPer, 0.05), whiteBody);
        pillar.position.set(px, y + hPer / 2, pz);
        g.add(pillar);
      }

      const band = new Mesh(new BoxGeometry(w + 0.06, 0.12, d + 0.06), accentMat);
      band.position.y = y + hPer + 0.06;
      g.add(band);

      y += hPer + 0.12;
      w *= 0.75;
      d *= 0.75;
    }

    const spire = new Mesh(new CylinderGeometry(0.02, 0.05, 1.8, 8), accentMat);
    spire.position.y = y + 0.9;
    g.add(spire);

    const storeH = 2.2;
    const storeFloor = new Mesh(new BoxGeometry(baseW, storeH, baseD + 0.2), silverBody);
    storeFloor.position.y = storeH / 2;
    storeFloor.castShadow = true;
    g.add(storeFloor);

    const bays = Math.floor(baseW / 1.3);
    for (let b = 0; b < bays; b++) {
      const bx = -baseW * 0.38 + b * (baseW * 0.76 / (bays - 1));
      // Each window gets its own material with independent timing
      const ownMat = makeStoreMat(b % 3 !== 2);
      const sw = new Mesh(new PlaneGeometry(0.6, 1.1), ownMat);
      sw.position.set(bx, 1.1, baseD / 2 + 0.12);
      g.add(sw);
    }

    const entrance = new Mesh(new PlaneGeometry(0.6, 1.6), makeStoreMat(true));
    entrance.position.set(0, 0.9, baseD / 2 + 0.14);
    g.add(entrance);

    g.position.set(x, 0, z);
    g.rotation.y = rotY;
    buildings.add(g);
  }

  function addTwinTower(x, z, gap, w, d, h, accentMat, name, rotY = 0) {
    const g = new Group();
    if (name) g.name = name;
    for (const side of [-1, 1]) {
      const ox = side * (w / 2 + gap / 2);
      const body = new Mesh(new BoxGeometry(w, h, d), glassBody);
      body.position.set(ox, h / 2, 0);
      body.castShadow = true;
      body.receiveShadow = true;
      g.add(body);

      // Neon corners
      for (const [cx, cz] of [[-w/2, d/2], [w/2, d/2], [-w/2, -d/2], [w/2, -d/2]]) {
        const strip = new Mesh(new BoxGeometry(0.04, h - 0.3, 0.04), accentMat);
        strip.position.set(ox + cx, h / 2, cz);
        g.add(strip);
      }

      // Glowing windows
      const winMat = new MeshBasicMaterial({ color: new Color("#FFF0D0"), depthWrite: false, transparent: true, opacity: 0.7 });
      const winCols = Math.max(1, Math.floor(w / 0.8));
      const winRows = Math.floor((h - 2.5) / 1.3);
      for (let row = 0; row < winRows; row++) {
        const wy = 2.8 + row * 1.3;
        for (let col = 0; col < winCols; col++) {
          if (Math.random() > 0.6) continue;
          const wx = -w * 0.38 + col * (w * 0.76 / (winCols - 1));
          const sw = new Mesh(new PlaneGeometry(0.25, 0.45), winMat);
          sw.position.set(ox + wx, wy, d / 2 + 0.03);
          g.add(sw);
        }
      }

      for (const px of [-w / 2.2, w / 2.2]) {
        const pillar = new Mesh(new BoxGeometry(0.04, h, 0.06), whiteBody);
        pillar.position.set(ox + px, h / 2, d / 2 + 0.02);
        g.add(pillar);
      }

      const bands = Math.floor(h / 2.2);
      for (let fb = 1; fb <= bands; fb++) {
        const fy = fb * 2.2;
        if (fy > h - 0.5) continue;
        const band = new Mesh(new BoxGeometry(w + 0.02, 0.05, d + 0.02), floorBand);
        band.position.set(ox, fy, 0);
        g.add(band);
      }

      const crown = new Mesh(new BoxGeometry(w + 0.08, 0.12, d + 0.08), accentMat);
      crown.position.set(ox, h + 0.06, 0);
      g.add(crown);

      if (h > 8) {
        const spire = new Mesh(new CylinderGeometry(0.02, 0.05, 1.2, 8), accentMat);
        spire.position.set(ox, h + 0.66, 0);
        g.add(spire);
      }
    }

    const bridgeY = h * 0.45;
    const bridge = new Mesh(new BoxGeometry(gap + 0.1, 0.4, d * 0.6), whiteBody);
    bridge.position.set(0, bridgeY, 0);
    bridge.castShadow = true;
    g.add(bridge);

    const storeH = 2.0;
    const baseW = w * 2 + gap;
    const storeBase = new Mesh(new BoxGeometry(baseW, storeH, d + 0.2), silverBody);
    storeBase.position.y = storeH / 2;
    storeBase.castShadow = true;
    g.add(storeBase);

    const tBays = Math.floor(baseW / 1.2);
    for (let b = 0; b < tBays; b++) {
      const bx = -baseW * 0.42 + b * (baseW * 0.84 / (tBays - 1));
      // Each window gets its own material with independent timing
      const ownMat = makeStoreMat(b % 3 !== 0);
      const sw = new Mesh(new PlaneGeometry(0.5, 0.95), ownMat);
      sw.position.set(bx, 1.0, d / 2 + 0.12);
      g.add(sw);
    }

    g.position.set(x, 0, z);
    g.rotation.y = rotY;
    buildings.add(g);
  }

  // ── NORTH WALL — z=-42 (pushed ~25% farther out) ──────────────
  const northTowers = [
    [-48, -42, 2.0, 1.6, 12, glassBody, neonCyan],
    [-43, -42, 2.4, 1.5, 15, steelBody, neonPurple],
    [-38, -42, 2.2, 1.7, 18, silverBody, neonBlue],
    [-33, -42, 1.8, 1.4, 10, glassBody, neonCyan],
    [-27, -42, 2.6, 1.6, 14, steelBody, neonPurple],
    [-21, -42, 2.0, 1.5, 20, glassBody, neonBlue],
    [-14, -42, 2.8, 1.8, 22, silverBody, neonCyan],
    [-7,  -42, 2.4, 1.6, 16, steelBody, neonPurple],
    [0,   -42, 2.2, 1.5, 13, glassBody, neonBlue],
    [7,   -42, 2.6, 1.7, 19, silverBody, neonCyan],
    [14,  -42, 2.0, 1.4, 11, glassBody, neonPurple],
    [21,  -42, 2.8, 1.8, 21, steelBody, neonBlue],
    [27,  -42, 2.2, 1.6, 15, silverBody, neonCyan],
    [33,  -42, 2.4, 1.5, 17, glassBody, neonPurple],
    [38,  -42, 2.2, 1.7, 13, steelBody, neonBlue],
    [43,  -42, 2.0, 1.6, 12, glassBody, neonCyan],
    [48,  -42, 2.4, 1.5, 16, steelBody, neonPurple],
  ];
  northTowers.forEach((a) => addSkyscraper(...a));

  addSetbackTower(-20, -42, 3.2, 2.0, 3, neonPurple, "Vibe Tower North");
  addSetbackTower(10,  -42, 3.0, 1.8, 4, neonCyan,   "Aurora Spire");
  addSetbackTower(-40, -42, 2.6, 1.7, 3, neonBlue,   "Neon Heights");
  addSetbackTower(34,  -42, 2.8, 1.9, 3, neonBlue,   "Skyline Peak");

  addTwinTower(-10, -42, 1.2, 1.8, 1.6, 22, neonCyan,   "Twin Towers West");
  addTwinTower(24,  -42, 1.0, 1.6, 1.5, 18, neonPurple, "Twin Towers East");

  // ── EAST WING — x=50 (pushed ~25% farther out) ─────────────────
  const EAST_FACE = -Math.PI / 2;
  const eastTowers = [
    [50, -34, 2.0, 1.9, 14, glassBody, neonCyan],
    [50, -28, 2.4, 1.6, 11, steelBody, neonPurple],
    [50, -22, 1.8, 1.5, 17, silverBody, neonBlue],
    [50, -16, 2.2, 1.7, 10, glassBody, neonCyan],
    [50, -10, 2.6, 1.8, 16, steelBody, neonPurple],
    [50,  -4, 2.0, 1.5, 12, silverBody, neonBlue],
    [50,   2, 1.8, 1.4,  9, glassBody, neonCyan],
    [50,   8, 2.2, 1.6, 13, steelBody, neonPurple],
    [50,  14, 2.0, 1.5, 11, silverBody, neonBlue],
  ];
  eastTowers.forEach((a) => addSkyscraper(a[0], a[1], a[2], a[3], a[4], a[5], a[6], undefined, EAST_FACE));
  addSetbackTower(50, -8, 2.4, 2.2, 3, neonCyan, "East Gate Tower", EAST_FACE);
  addTwinTower(50, -20, 1.0, 1.5, 1.8, 16, neonPurple, "East Twin Towers", EAST_FACE);

  // ── WEST WING — x=-50 (pushed ~25% farther out) ────────────────
  const WEST_FACE = Math.PI / 2;
  const westTowers = [
    [-50, -34, 2.2, 1.8, 13, steelBody, neonPurple],
    [-50, -28, 1.8, 1.5, 16, glassBody, neonBlue],
    [-50, -22, 2.4, 1.7, 10, silverBody, neonCyan],
    [-50, -16, 2.0, 1.6, 18, glassBody, neonPurple],
    [-50, -10, 2.6, 1.8, 14, steelBody, neonBlue],
    [-50,  -4, 1.8, 1.4, 11, silverBody, neonCyan],
    [-50,   2, 2.2, 1.6,  9, glassBody, neonPurple],
    [-50,   8, 2.0, 1.5, 12, steelBody, neonBlue],
    [-50,  14, 2.4, 1.7, 10, silverBody, neonCyan],
  ];
  westTowers.forEach((a) => addSkyscraper(a[0], a[1], a[2], a[3], a[4], a[5], a[6], undefined, WEST_FACE));
  addSetbackTower(-50, -9, 2.6, 2.0, 3, neonPurple, "West Gate Tower", WEST_FACE);
  addTwinTower(-50, -20, 1.0, 1.5, 1.8, 16, neonCyan, "West Twin Towers", WEST_FACE);

  scene.add(buildings);

  // ── Expose neon materials for audio-reactive pulsing ───────────────────
  scene.userData.neonMats = [neonCyan, neonPurple, neonBlue];
  scene.userData._neonBaseOpacities = {
    neonCyan: 1,
    neonPurple: 1,
    neonBlue: 1,
  };
}