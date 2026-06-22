// ═══════════════════════════════════════════════════════════════
// CITY SKYLINE — realistic glass & steel waterfront district
// Dense continuous wall: North + East + West wings, no beach gaps
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

export default function createCitySkyline(scene) {
  const buildings = new Group();
  buildings.name = "cityBuildings";

  const glassBody  = mat("#8899BB", { roughness: 0.18, metalness: 0.40 });
  const steelBody  = mat("#99AACC", { roughness: 0.22, metalness: 0.70 });
  const silverBody = mat("#AABBCC", { roughness: 0.28, metalness: 0.60 });
  const whiteBody  = mat("#C0C8D8", { roughness: 0.28, metalness: 0.25 });
  const darkSteel  = mat("#667788", { roughness: 0.28, metalness: 0.75 });

  function makeStoreMat(warm) {
    const m = new MeshBasicMaterial();
    if (warm) {
      m.color = new Color(0.9 + Math.random() * 0.1, 0.82 + Math.random() * 0.1, 0.6 + Math.random() * 0.2);
      m.opacity = 0.65 + Math.random() * 0.3;
    } else {
      m.color = new Color(0.76 + Math.random() * 0.14, 0.68 + Math.random() * 0.14, 0.88 + Math.random() * 0.1);
      m.opacity = 0.5 + Math.random() * 0.4;
    }
    m.depthWrite = false;
    m.transparent = true;
    return m;
  }

  const neonCyan = new MeshBasicMaterial({ color: new Color("#00E5FF"), depthWrite: false, transparent: true, opacity: 0.9 });
  const neonPurple = new MeshBasicMaterial({ color: new Color("#C43BFF"), depthWrite: false, transparent: true, opacity: 0.9 });
  const neonBlue = new MeshBasicMaterial({ color: new Color("#40A0EE"), depthWrite: false, transparent: true, opacity: 0.9 });
  const floorBand = new MeshBasicMaterial({ color: new Color("#88BBEE"), depthWrite: false, transparent: true, opacity: 0.65 });

  // ─── Building helpers ───────────────────────────────────────────
  function addSkyscraper(x, z, w, d, h, bodyMat, accentMat, name, rotY = 0) {
    const g = new Group();
    if (name) g.name = name;

    const body = new Mesh(new BoxGeometry(w, h, d), bodyMat);
    body.position.y = h / 2;
    body.castShadow = true; body.receiveShadow = true;
    g.add(body);

    for (const [cx, cz] of [[-w/2, d/2],[w/2, d/2],[-w/2, -d/2],[w/2, -d/2]]) {
      const strip = new Mesh(new BoxGeometry(0.04, h - 0.3, 0.04), accentMat);
      strip.position.set(cx, h / 2, cz);
      g.add(strip);
    }

    const winMat = new MeshBasicMaterial({ color: new Color("#FFF0D0"), depthWrite: false, transparent: true, opacity: 0.75 });
    const winPurple = new MeshBasicMaterial({ color: new Color("#E4D0FF"), depthWrite: false, transparent: true, opacity: 0.55 });
    const winRows = Math.floor((h - 2.5) / 1.4);
    const winCols = Math.max(1, Math.floor(w / 0.9));
    for (let row = 0; row < winRows; row++) {
      const wy = 2.8 + row * 1.4;
      for (let col = 0; col < winCols; col++) {
        if (Math.random() > 0.65) continue;
        const wx = -w * 0.4 + col * (w * 0.8 / Math.max(1, winCols - 1));
        const wmat = Math.random() > 0.7 ? winPurple : winMat;
        const sw = new Mesh(new PlaneGeometry(0.3, 0.5), wmat);
        sw.position.set(wx, wy, d / 2 + 0.03); g.add(sw);
        const swb = new Mesh(new PlaneGeometry(0.3, 0.5), wmat);
        swb.position.set(wx, wy, -d / 2 - 0.03); swb.rotation.y = Math.PI; g.add(swb);
      }
    }

    const colCount = Math.max(2, Math.floor(w / 0.55));
    for (let col = 0; col < colCount; col++) {
      const cx = -w * 0.42 + col * (w * 0.84 / Math.max(1, colCount - 1));
      const p = new Mesh(new BoxGeometry(0.04, h, 0.06), whiteBody);
      p.position.set(cx, h / 2, d / 2 + 0.02); g.add(p);
      const pb = new Mesh(new BoxGeometry(0.04, h, 0.06), whiteBody);
      pb.position.set(cx, h / 2, -d / 2 - 0.02); g.add(pb);
    }

    const bandCount = Math.floor(h / 2.0);
    for (let b = 1; b <= bandCount; b++) {
      const by = b * 2.0;
      if (by > h - 0.6) continue;
      const band = new Mesh(new BoxGeometry(w + 0.02, 0.06, d + 0.02), floorBand);
      band.position.y = by; g.add(band);
    }

    const crown = new Mesh(new BoxGeometry(w + 0.1, 0.15, d + 0.1), accentMat);
    crown.position.y = h + 0.07; g.add(crown);
    if (h > 10) {
      const spire = new Mesh(new CylinderGeometry(0.03, 0.06, 1.5, 8), accentMat);
      spire.position.y = h + 0.85; g.add(spire);
      const tip = new Mesh(new SphereGeometry(0.08, 8, 6), accentMat);
      tip.position.y = h + 1.65; g.add(tip);
    }

    const storeH = 2.0;
    const storeBody = new Mesh(new BoxGeometry(w - 0.04, storeH, d + 0.15), silverBody);
    storeBody.position.y = storeH / 2; storeBody.castShadow = true; g.add(storeBody);
    const awning = new Mesh(new BoxGeometry(w - 0.1, 0.1, d + 0.25), accentMat);
    awning.position.y = storeH + 0.05; g.add(awning);
    const winCount = Math.max(1, Math.floor(w / 1.2));
    for (let ww = 0; ww < winCount; ww++) {
      const wx = -w * 0.38 + ww * (w * 0.76 / Math.max(1, winCount - 1));
      const sw = new Mesh(new PlaneGeometry(0.55, 1.0), makeStoreMat(ww % 2 === 0));
      sw.position.set(wx, 1.0, d / 2 + 0.08); g.add(sw);
      const swb = new Mesh(new PlaneGeometry(0.55, 1.0), makeStoreMat(ww % 2 === 0));
      swb.position.set(wx, 1.0, -d / 2 - 0.08); swb.rotation.y = Math.PI; g.add(swb);
    }
    const door = new Mesh(new PlaneGeometry(0.5, 1.5), makeStoreMat(true));
    door.position.set(0, 0.85, d / 2 + 0.1); g.add(door);
    const sidewalk = new Mesh(new BoxGeometry(w + 0.3, 0.04, d + 0.3), whiteBody);
    sidewalk.position.y = 0.02; g.add(sidewalk);

    g.position.set(x, 0, z);
    g.rotation.y = rotY;
    buildings.add(g);
  }

  function addSetbackTower(x, z, baseW, baseD, sections, accentMat, name, rotY = 0) {
    const g = new Group();
    if (name) g.name = name;
    let y = 0, w = baseW, d = baseD;
    const hPer = 3.5;
    for (let s = 0; s < sections; s++) {
      const body = new Mesh(new BoxGeometry(w, hPer, d), s % 2 === 0 ? glassBody : steelBody);
      body.position.y = y + hPer / 2; body.castShadow = true; g.add(body);
      for (const [cx, cz] of [[-w/2, d/2],[w/2, d/2],[-w/2, -d/2],[w/2, -d/2]]) {
        const strip = new Mesh(new BoxGeometry(0.04, hPer - 0.2, 0.04), accentMat);
        strip.position.set(cx, y + hPer / 2, cz); g.add(strip);
      }
      const winMat = new MeshBasicMaterial({ color: new Color("#FFF0D0"), depthWrite: false, transparent: true, opacity: 0.7 });
      const wCols = Math.max(1, Math.floor(w / 0.8));
      for (let col = 0; col < wCols; col++) {
        if (Math.random() > 0.55) continue;
        const wx = -w * 0.38 + col * (w * 0.76 / Math.max(1, wCols - 1));
        const sw = new Mesh(new PlaneGeometry(0.25, 0.45), winMat);
        sw.position.set(wx, y + hPer / 2, d / 2 + 0.03); g.add(sw);
      }
      const band = new Mesh(new BoxGeometry(w + 0.06, 0.12, d + 0.06), accentMat);
      band.position.y = y + hPer + 0.06; g.add(band);
      y += hPer + 0.12; w *= 0.75; d *= 0.75;
    }
    const spire = new Mesh(new CylinderGeometry(0.02, 0.05, 1.8, 8), accentMat);
    spire.position.y = y + 0.9; g.add(spire);

    const storeFloor = new Mesh(new BoxGeometry(baseW, 2.2, baseD + 0.2), silverBody);
    storeFloor.position.y = 1.1; storeFloor.castShadow = true; g.add(storeFloor);
    const bays = Math.max(2, Math.floor(baseW / 1.3));
    for (let b = 0; b < bays; b++) {
      const bx = -baseW * 0.38 + b * (baseW * 0.76 / Math.max(1, bays - 1));
      const sw = new Mesh(new PlaneGeometry(0.6, 1.1), makeStoreMat(b % 3 !== 2));
      sw.position.set(bx, 1.1, baseD / 2 + 0.12); g.add(sw);
    }
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
      body.position.set(ox, h / 2, 0); body.castShadow = true; g.add(body);
      for (const [cx, cz] of [[-w/2, d/2],[w/2, d/2],[-w/2, -d/2],[w/2, -d/2]]) {
        const strip = new Mesh(new BoxGeometry(0.04, h - 0.3, 0.04), accentMat);
        strip.position.set(ox + cx, h / 2, cz); g.add(strip);
      }
      const winMat = new MeshBasicMaterial({ color: new Color("#FFF0D0"), depthWrite: false, transparent: true, opacity: 0.7 });
      const wCols = Math.max(1, Math.floor(w / 0.8));
      const wRows = Math.floor((h - 2.5) / 1.3);
      for (let row = 0; row < wRows; row++) {
        const wy = 2.8 + row * 1.3;
        for (let col = 0; col < wCols; col++) {
          if (Math.random() > 0.6) continue;
          const wx = -w * 0.38 + col * (w * 0.76 / Math.max(1, wCols - 1));
          const sw = new Mesh(new PlaneGeometry(0.25, 0.45), winMat);
          sw.position.set(ox + wx, wy, d / 2 + 0.03); g.add(sw);
        }
      }
      const crown = new Mesh(new BoxGeometry(w + 0.08, 0.12, d + 0.08), accentMat);
      crown.position.set(ox, h + 0.06, 0); g.add(crown);
      if (h > 8) {
        const spire = new Mesh(new CylinderGeometry(0.02, 0.05, 1.2, 8), accentMat);
        spire.position.set(ox, h + 0.66, 0); g.add(spire);
      }
    }
    const bridge = new Mesh(new BoxGeometry(gap + 0.1, 0.4, d * 0.6), whiteBody);
    bridge.position.set(0, h * 0.45, 0); bridge.castShadow = true; g.add(bridge);
    const baseW = w * 2 + gap;
    const storeBase = new Mesh(new BoxGeometry(baseW, 2.0, d + 0.2), silverBody);
    storeBase.position.y = 1.0; storeBase.castShadow = true; g.add(storeBase);
    const tBays = Math.max(2, Math.floor(baseW / 1.2));
    for (let b = 0; b < tBays; b++) {
      const bx = -baseW * 0.42 + b * (baseW * 0.84 / Math.max(1, tBays - 1));
      const sw = new Mesh(new PlaneGeometry(0.5, 0.95), makeStoreMat(b % 3 !== 0));
      sw.position.set(bx, 1.0, d / 2 + 0.12); g.add(sw);
    }
    g.position.set(x, 0, z);
    g.rotation.y = rotY;
    buildings.add(g);
  }

  // ══════════════════════════════════════════════════════════════
  // NORTH WALL — z=-38, every 4 units, completely gap-free
  // ══════════════════════════════════════════════════════════════
  const northTowers = [
    [-40, -38, 2.4, 1.6, 13, glassBody,  neonCyan],
    [-36, -38, 2.2, 1.6, 12, glassBody,  neonCyan],
    [-32, -38, 2.4, 1.5, 15, steelBody,  neonPurple],
    [-28, -38, 2.2, 1.7, 18, silverBody, neonBlue],
    [-24, -38, 1.8, 1.4, 11, glassBody,  neonCyan],
    [-20, -38, 2.6, 1.6, 14, steelBody,  neonPurple],
    [-16, -38, 2.0, 1.5, 20, glassBody,  neonBlue],
    [-12, -38, 2.8, 1.8, 22, silverBody, neonCyan],
    [-8,  -38, 2.4, 1.6, 16, steelBody,  neonPurple],
    [-4,  -38, 2.2, 1.5, 13, glassBody,  neonBlue],
    [0,   -38, 2.6, 1.7, 19, silverBody, neonCyan],
    [4,   -38, 2.0, 1.4, 11, glassBody,  neonPurple],
    [8,   -38, 2.8, 1.8, 21, steelBody,  neonBlue],
    [12,  -38, 2.2, 1.6, 15, silverBody, neonCyan],
    [16,  -38, 2.4, 1.5, 17, glassBody,  neonPurple],
    [20,  -38, 2.2, 1.7, 13, steelBody,  neonBlue],
    [24,  -38, 2.0, 1.6, 12, glassBody,  neonCyan],
    [28,  -38, 2.4, 1.5, 16, steelBody,  neonPurple],
    [32,  -38, 2.2, 1.7, 14, silverBody, neonBlue],
    [36,  -38, 2.0, 1.6, 12, glassBody,  neonCyan],
    [40,  -38, 2.4, 1.5, 13, steelBody,  neonPurple],
  ];
  northTowers.forEach((a) => addSkyscraper(...a));
  addSetbackTower(-18, -38, 3.2, 2.0, 3, neonPurple, "Vibe Tower North");
  addSetbackTower(6,   -38, 3.0, 1.8, 4, neonCyan,   "Aurora Spire");
  addSetbackTower(-30, -38, 2.6, 1.7, 3, neonBlue,   "Neon Heights");
  addSetbackTower(26,  -38, 2.8, 1.9, 3, neonBlue,   "Skyline Peak");
  addTwinTower(-8,  -38, 1.2, 1.8, 1.6, 22, neonCyan,   "Twin Towers West");
  addTwinTower(18,  -38, 1.0, 1.6, 1.5, 18, neonPurple, "Twin Towers East");

  // Second depth row behind north wall — fills visual gaps at distance
  const northBack = [
    [-38, -42, 1.8, 1.4, 10, glassBody,  neonBlue],
    [-34, -42, 2.0, 1.4, 14, steelBody,  neonCyan],
    [-30, -42, 1.8, 1.3,  9, glassBody,  neonPurple],
    [-26, -42, 2.2, 1.5, 12, silverBody, neonBlue],
    [-22, -42, 1.8, 1.3, 16, glassBody,  neonCyan],
    [-18, -42, 2.0, 1.4, 11, steelBody,  neonPurple],
    [-14, -42, 1.8, 1.3, 10, glassBody,  neonBlue],
    [-10, -42, 2.2, 1.5, 13, silverBody, neonCyan],
    [-6,  -42, 1.8, 1.4, 15, steelBody,  neonPurple],
    [-2,  -42, 2.0, 1.3, 10, glassBody,  neonBlue],
    [2,   -42, 2.0, 1.4, 12, glassBody,  neonCyan],
    [6,   -42, 1.8, 1.3,  9, steelBody,  neonPurple],
    [10,  -42, 2.2, 1.5, 14, silverBody, neonBlue],
    [14,  -42, 1.8, 1.4, 11, glassBody,  neonCyan],
    [18,  -42, 2.0, 1.3, 13, steelBody,  neonPurple],
    [22,  -42, 1.8, 1.4, 10, glassBody,  neonBlue],
    [26,  -42, 2.2, 1.5, 16, silverBody, neonCyan],
    [30,  -42, 1.8, 1.3,  9, steelBody,  neonPurple],
    [34,  -42, 2.0, 1.4, 12, glassBody,  neonBlue],
    [38,  -42, 1.8, 1.3, 10, glassBody,  neonCyan],
  ];
  northBack.forEach((a) => addSkyscraper(...a));

  // ══════════════════════════════════════════════════════════════
  // EAST WING — x=38, every 3 units from z=-35 to z=14 (no beach)
  // ══════════════════════════════════════════════════════════════
  const EAST_FACE = -Math.PI / 2;
  const eastTowers = [
    [38, -35, 2.0, 1.9, 15, glassBody,  neonCyan],
    [38, -32, 2.4, 1.6, 12, steelBody,  neonPurple],
    [38, -29, 2.2, 1.7, 18, silverBody, neonBlue],
    [38, -26, 1.8, 1.5, 11, glassBody,  neonCyan],
    [38, -23, 2.6, 1.8, 16, steelBody,  neonPurple],
    [38, -20, 2.0, 1.5, 14, silverBody, neonBlue],
    [38, -17, 2.2, 1.7, 10, glassBody,  neonCyan],
    [38, -14, 2.6, 1.8, 17, steelBody,  neonPurple],
    [38, -11, 2.0, 1.5, 13, silverBody, neonBlue],
    [38,  -8, 2.4, 1.7, 11, glassBody,  neonCyan],
    [38,  -5, 2.2, 1.6, 15, steelBody,  neonPurple],
    [38,  -2, 2.0, 1.5, 12, silverBody, neonBlue],
    [38,   1, 1.8, 1.4, 10, glassBody,  neonCyan],
    [38,   4, 2.2, 1.6, 14, steelBody,  neonPurple],
    [38,   7, 2.0, 1.5, 11, silverBody, neonBlue],
    [38,  10, 2.4, 1.7, 13, glassBody,  neonCyan],
    [38,  14, 2.0, 1.5, 10, steelBody,  neonPurple],
  ];
  eastTowers.forEach((a) => addSkyscraper(a[0], a[1], a[2], a[3], a[4], a[5], a[6], undefined, EAST_FACE));
  addSetbackTower(38, -9, 2.4, 2.2, 3, neonCyan,   "East Gate Tower", EAST_FACE);
  addTwinTower(38, -22, 1.0, 1.5, 1.8, 18, neonPurple, "East Twin Towers", EAST_FACE);
  // Second depth row behind east wall
  const eastBack = [
    [42, -33, 1.8, 1.4, 11, glassBody,  neonBlue],
    [42, -27, 2.0, 1.4, 14, steelBody,  neonCyan],
    [42, -21, 1.8, 1.5, 10, silverBody, neonPurple],
    [42, -15, 2.0, 1.4, 13, glassBody,  neonBlue],
    [42,  -9, 1.8, 1.3,  9, steelBody,  neonCyan],
    [42,  -3, 2.0, 1.4, 12, silverBody, neonPurple],
    [42,   3, 1.8, 1.4, 10, glassBody,  neonBlue],
    [42,  10, 1.8, 1.3,  9, steelBody,  neonCyan],
  ];
  eastBack.forEach((a) => addSkyscraper(a[0], a[1], a[2], a[3], a[4], a[5], a[6], undefined, EAST_FACE));

  // ══════════════════════════════════════════════════════════════
  // WEST WING — x=-38, every 3 units from z=-35 to z=14 (no beach)
  // ══════════════════════════════════════════════════════════════
  const WEST_FACE = Math.PI / 2;
  const westTowers = [
    [-38, -35, 2.2, 1.8, 14, steelBody,  neonPurple],
    [-38, -32, 1.8, 1.5, 17, glassBody,  neonBlue],
    [-38, -29, 2.4, 1.7, 11, silverBody, neonCyan],
    [-38, -26, 2.0, 1.6, 19, glassBody,  neonPurple],
    [-38, -23, 2.6, 1.8, 15, steelBody,  neonBlue],
    [-38, -20, 1.8, 1.4, 12, silverBody, neonCyan],
    [-38, -17, 2.2, 1.6, 10, glassBody,  neonPurple],
    [-38, -14, 2.6, 1.8, 16, steelBody,  neonBlue],
    [-38, -11, 2.0, 1.5, 13, silverBody, neonCyan],
    [-38,  -8, 2.4, 1.7, 11, glassBody,  neonPurple],
    [-38,  -5, 1.8, 1.4, 12, silverBody, neonCyan],
    [-38,  -2, 2.2, 1.6, 10, glassBody,  neonPurple],
    [-38,   1, 1.8, 1.4,  9, steelBody,  neonBlue],
    [-38,   4, 2.4, 1.7, 14, glassBody,  neonCyan],
    [-38,   7, 2.0, 1.5, 11, steelBody,  neonPurple],
    [-38,  10, 2.4, 1.7, 12, silverBody, neonBlue],
    [-38,  14, 2.0, 1.5, 10, glassBody,  neonCyan],
  ];
  westTowers.forEach((a) => addSkyscraper(a[0], a[1], a[2], a[3], a[4], a[5], a[6], undefined, WEST_FACE));
  addSetbackTower(-38, -9, 2.6, 2.0, 3, neonPurple, "West Gate Tower", WEST_FACE);
  addTwinTower(-38, -22, 1.0, 1.5, 1.8, 18, neonCyan, "West Twin Towers", WEST_FACE);
  // Second depth row behind west wall
  const westBack = [
    [-42, -33, 1.8, 1.4, 12, steelBody,  neonPurple],
    [-42, -27, 2.0, 1.4, 15, glassBody,  neonBlue],
    [-42, -21, 1.8, 1.5, 10, silverBody, neonCyan],
    [-42, -15, 2.0, 1.4, 13, steelBody,  neonPurple],
    [-42,  -9, 1.8, 1.3,  9, glassBody,  neonBlue],
    [-42,  -3, 2.0, 1.4, 12, silverBody, neonCyan],
    [-42,   3, 1.8, 1.4, 10, steelBody,  neonPurple],
    [-42,  10, 1.8, 1.3,  9, glassBody,  neonBlue],
  ];
  westBack.forEach((a) => addSkyscraper(a[0], a[1], a[2], a[3], a[4], a[5], a[6], undefined, WEST_FACE));

  // ══════════════════════════════════════════════════════════════
  // CORNER BLOCKS — fill northeast/northwest join gaps
  // ══════════════════════════════════════════════════════════════
  // NE corner
  addSkyscraper(38, -38, 2.2, 1.8, 14, glassBody,  neonCyan, "NE Corner");
  addSkyscraper(42, -38, 2.0, 1.6, 11, steelBody,  neonPurple, "NE Corner B");
  // NW corner
  addSkyscraper(-38, -38, 2.2, 1.8, 13, steelBody, neonPurple, "NW Corner");
  addSkyscraper(-42, -38, 2.0, 1.6, 10, glassBody, neonBlue, "NW Corner B");

  scene.add(buildings);

  // Expose neon materials for audio-reactive pulsing
  scene.userData.neonMats = [neonCyan, neonPurple, neonBlue];
  scene.userData._neonBaseOpacities = { neonCyan: 1, neonPurple: 1, neonBlue: 1 };
}