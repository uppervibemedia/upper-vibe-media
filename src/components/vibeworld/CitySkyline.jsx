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
  LinearFilter,
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

  const isMobileSkyline = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

  const windowMats = {
    dimWarm: new MeshBasicMaterial({ color: new Color("#D8B981"), depthWrite: false, transparent: true, opacity: isMobileSkyline ? 0.18 : 0.24 }),
    medWarm: new MeshBasicMaterial({ color: new Color("#E9C98D"), depthWrite: false, transparent: true, opacity: isMobileSkyline ? 0.33 : 0.45 }),
    brightWarm: new MeshBasicMaterial({ color: new Color("#FFDFA5"), depthWrite: false, transparent: true, opacity: isMobileSkyline ? 0.51 : 0.66 }),
    dimCool: new MeshBasicMaterial({ color: new Color("#8DB7D8"), depthWrite: false, transparent: true, opacity: isMobileSkyline ? 0.15 : 0.21 }),
    medCool: new MeshBasicMaterial({ color: new Color("#9DCBEE"), depthWrite: false, transparent: true, opacity: isMobileSkyline ? 0.27 : 0.36 }),
  };

  const storeMats = {
    softWarm: new MeshBasicMaterial({ color: new Color("#D0AA72"), depthWrite: false, transparent: true, opacity: 0.18 }),
    medWarm: new MeshBasicMaterial({ color: new Color("#E2BF82"), depthWrite: false, transparent: true, opacity: 0.28 }),
    softCool: new MeshBasicMaterial({ color: new Color("#87A8C8"), depthWrite: false, transparent: true, opacity: 0.14 }),
    medCool: new MeshBasicMaterial({ color: new Color("#9ABDE0"), depthWrite: false, transparent: true, opacity: 0.22 }),
  };

  function floorMood() {
    const r = Math.random();
    if (r < 0.18) return "dark";
    if (r < 0.52) return "quiet";
    return "active";
  }

  function chooseWindowMat(mood = "active") {
    const r = Math.random();
    const offChance = mood === "dark" ? 0.62 : mood === "quiet" ? 0.34 : 0.20;
    if (r < offChance) return null;
    const tier = Math.random();
    const cool = Math.random() < 0.16;
    if (tier < 0.50) return cool ? windowMats.dimCool : windowMats.dimWarm;
    if (tier < 0.88) return cool ? windowMats.medCool : windowMats.medWarm;
    return windowMats.brightWarm;
  }

  function chooseStorefrontMat(warm, important = false) {
    const r = Math.random();
    if (!important && r < 0.35) return null;
    if (important && r < 0.12) return null;
    const medium = important ? r > 0.55 : r > 0.78;
    if (warm) return medium ? storeMats.medWarm : storeMats.softWarm;
    return medium ? storeMats.medCool : storeMats.softCool;
  }

  const neonCyan = new MeshBasicMaterial({ color: new Color("#00B8D4"), depthWrite: false, transparent: true, opacity: isMobileSkyline ? 0.32 : 0.45 });
  const neonPurple = new MeshBasicMaterial({ color: new Color("#8F5DCC"), depthWrite: false, transparent: true, opacity: isMobileSkyline ? 0.30 : 0.42 });
  const neonBlue = new MeshBasicMaterial({ color: new Color("#3C76A8"), depthWrite: false, transparent: true, opacity: isMobileSkyline ? 0.28 : 0.40 });
  const floorBand = new MeshBasicMaterial({ color: new Color("#6F92B8"), depthWrite: false, transparent: true, opacity: isMobileSkyline ? 0.06 : 0.10 });

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

    const winRows = Math.floor((h - 2.5) / 1.4);
    const winCols = Math.max(1, Math.floor(w / 0.9));
    for (let row = 0; row < winRows; row++) {
      const wy = 2.8 + row * 1.4;
      const mood = floorMood();
      for (let col = 0; col < winCols; col++) {
        if ((row + col) % 7 === 0 && mood !== "active") continue;
        const wmat = chooseWindowMat(mood);
        if (!wmat) continue;
        const wx = -w * 0.4 + col * (w * 0.8 / Math.max(1, winCols - 1)) + (Math.random() - 0.5) * 0.05;
        const sw = new Mesh(new PlaneGeometry(0.26 + Math.random() * 0.06, 0.38 + Math.random() * 0.1), wmat);
        sw.position.set(wx, wy + (Math.random() - 0.5) * 0.05, d / 2 + 0.03); g.add(sw);
        if (Math.random() > 0.28) {
          const backMat = chooseWindowMat(mood);
          if (backMat) {
            const swb = new Mesh(new PlaneGeometry(0.26, 0.4), backMat);
            swb.position.set(wx, wy, -d / 2 - 0.03); swb.rotation.y = Math.PI; g.add(swb);
          }
        }
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
      const frontStoreMat = chooseStorefrontMat(ww % 2 === 0);
      if (frontStoreMat) {
        const sw = new Mesh(new PlaneGeometry(0.5, 0.85), frontStoreMat);
        sw.position.set(wx, 1.0, d / 2 + 0.08); g.add(sw);
      }
      const backStoreMat = chooseStorefrontMat(ww % 2 === 0);
      if (backStoreMat) {
        const swb = new Mesh(new PlaneGeometry(0.5, 0.85), backStoreMat);
        swb.position.set(wx, 1.0, -d / 2 - 0.08); swb.rotation.y = Math.PI; g.add(swb);
      }
    }
    const doorMat = chooseStorefrontMat(true, /Gate|Stage|Tower/i.test(name || ""));
    if (doorMat) {
      const door = new Mesh(new PlaneGeometry(0.45, 1.25), doorMat);
      door.position.set(0, 0.8, d / 2 + 0.1); g.add(door);
    }
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
      const wCols = Math.max(1, Math.floor(w / 0.8));
      const mood = floorMood();
      for (let col = 0; col < wCols; col++) {
        const wmat = chooseWindowMat(mood);
        if (!wmat) continue;
        const wx = -w * 0.38 + col * (w * 0.76 / Math.max(1, wCols - 1)) + (Math.random() - 0.5) * 0.04;
        const sw = new Mesh(new PlaneGeometry(0.22, 0.36), wmat);
        sw.position.set(wx, y + hPer / 2 + (Math.random() - 0.5) * 0.05, d / 2 + 0.03); g.add(sw);
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
      const bayMat = chooseStorefrontMat(b % 3 !== 2, /Gate|Aurora|Vibe/i.test(name || ""));
      if (!bayMat) continue;
      const sw = new Mesh(new PlaneGeometry(0.52, 0.9), bayMat);
      sw.position.set(bx, 1.05, baseD / 2 + 0.12); g.add(sw);
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
      const wCols = Math.max(1, Math.floor(w / 0.8));
      const wRows = Math.floor((h - 2.5) / 1.3);
      for (let row = 0; row < wRows; row++) {
        const wy = 2.8 + row * 1.3;
        const mood = floorMood();
        for (let col = 0; col < wCols; col++) {
          const wmat = chooseWindowMat(mood);
          if (!wmat) continue;
          const wx = -w * 0.38 + col * (w * 0.76 / Math.max(1, wCols - 1)) + (Math.random() - 0.5) * 0.04;
          const sw = new Mesh(new PlaneGeometry(0.22, 0.36), wmat);
          sw.position.set(ox + wx, wy + (Math.random() - 0.5) * 0.05, d / 2 + 0.03); g.add(sw);
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
      const bayMat = chooseStorefrontMat(b % 3 !== 0, /Gate|Twin/i.test(name || ""));
      if (!bayMat) continue;
      const sw = new Mesh(new PlaneGeometry(0.45, 0.82), bayMat);
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
  // EAST WING — x=38, every 3 units from z=-35 to z=11 (stops before beach sand)
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
    [38,  11, 2.4, 1.7, 13, glassBody,  neonCyan],
  ];
  eastTowers.forEach((a) => addSkyscraper(a[0], a[1], a[2], a[3], a[4], a[5], a[6], undefined, EAST_FACE));
  addSetbackTower(38, -9, 2.4, 2.2, 3, neonCyan,   "East Gate Tower", EAST_FACE);
  addTwinTower(38, -22, 1.0, 1.5, 1.8, 18, neonPurple, "East Twin Towers", EAST_FACE);
  // Second depth row behind east wall (stop at z=8 — well clear of beach)
  const eastBack = [
    [42, -33, 1.8, 1.4, 11, glassBody,  neonBlue],
    [42, -27, 2.0, 1.4, 14, steelBody,  neonCyan],
    [42, -21, 1.8, 1.5, 10, silverBody, neonPurple],
    [42, -15, 2.0, 1.4, 13, glassBody,  neonBlue],
    [42,  -9, 1.8, 1.3,  9, steelBody,  neonCyan],
    [42,  -3, 2.0, 1.4, 12, silverBody, neonPurple],
    [42,   3, 1.8, 1.4, 10, glassBody,  neonBlue],
    [42,   8, 1.8, 1.3,  9, steelBody,  neonCyan],
  ];
  eastBack.forEach((a) => addSkyscraper(a[0], a[1], a[2], a[3], a[4], a[5], a[6], undefined, EAST_FACE));

  // ══════════════════════════════════════════════════════════════
  // WEST WING — x=-38, every 3 units from z=-35 to z=11 (stops before beach sand)
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
    [-38,  11, 2.4, 1.7, 12, silverBody, neonBlue],
  ];
  westTowers.forEach((a) => addSkyscraper(a[0], a[1], a[2], a[3], a[4], a[5], a[6], undefined, WEST_FACE));
  addSetbackTower(-38, -9, 2.6, 2.0, 3, neonPurple, "West Gate Tower", WEST_FACE);
  addTwinTower(-38, -22, 1.0, 1.5, 1.8, 18, neonCyan, "West Twin Towers", WEST_FACE);
  // Second depth row behind west wall (stop at z=8 — well clear of beach)
  const westBack = [
    [-42, -33, 1.8, 1.4, 12, steelBody,  neonPurple],
    [-42, -27, 2.0, 1.4, 15, glassBody,  neonBlue],
    [-42, -21, 1.8, 1.5, 10, silverBody, neonCyan],
    [-42, -15, 2.0, 1.4, 13, steelBody,  neonPurple],
    [-42,  -9, 1.8, 1.3,  9, glassBody,  neonBlue],
    [-42,  -3, 2.0, 1.4, 12, silverBody, neonCyan],
    [-42,   3, 1.8, 1.4, 10, steelBody,  neonPurple],
    [-42,   8, 1.8, 1.3,  9, glassBody,  neonBlue],
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

  // ══════════════════════════════════════════════════════════════
  // NEON BUILDING SIGNS — 6 architectural facade signs
  // Mounted directly onto east/west building faces flanking the stage.
  // These are 3D panels flush against building surfaces, not floating sprites.
  // West (x≈-38): 3 signs | East (x≈+38): 3 signs
  // ══════════════════════════════════════════════════════════════
  function makeFacadeSign(text, colorHex, glowHex, width, height) {
    const W = 256 * Math.ceil(width / 1.5);
    const H = 128;
    const canvas = document.createElement("canvas");
    canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext("2d");

    // Dark base — architectural backing panel
    ctx.fillStyle = "rgba(4,4,18,0.92)";
    ctx.fillRect(0, 0, W, H);

    // Neon border — 3px inset
    ctx.strokeStyle = glowHex;
    ctx.lineWidth = 6;
    ctx.shadowColor = glowHex;
    ctx.shadowBlur = 18;
    ctx.strokeRect(4, 4, W - 8, H - 8);

    // Glow text
    const fontSize = Math.min(52, Math.floor(H * 0.52));
    ctx.font = `900 ${fontSize}px 'Syne','Inter',sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.shadowColor = glowHex;
    ctx.shadowBlur = 28;
    ctx.fillStyle = colorHex;
    ctx.fillText(text, W / 2, H / 2 + 2);
    // Second pass for stronger glow
    ctx.shadowBlur = 10;
    ctx.fillText(text, W / 2, H / 2 + 2);

    const tex = new THREE.CanvasTexture(canvas);
    tex.minFilter = LinearFilter;
    tex.colorSpace = THREE.SRGBColorSpace;

    const panel = new Mesh(
      new BoxGeometry(width, height, 0.08),
      new MeshBasicMaterial({ map: tex, depthWrite: true })
    );
    return panel;
  }

  function makeCanvasTexture(w, h, draw) {
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    draw(ctx, w, h);
    const tex = new THREE.CanvasTexture(canvas);
    tex.minFilter = LinearFilter;
    tex.magFilter = LinearFilter;
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.needsUpdate = true;
    return tex;
  }

  function makeLightCodePanel(text, color = "#00E5FF", glow = "rgba(0,229,255,0.72)", wide = false) {
    const tex = makeCanvasTexture(wide ? 768 : 512, 160, (ctx, w, h) => {
      ctx.clearRect(0, 0, w, h);
      const bg = ctx.createLinearGradient(0, 0, w, h);
      bg.addColorStop(0, "rgba(4,8,22,0.18)");
      bg.addColorStop(1, "rgba(20,8,42,0.24)");
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = glow;
      ctx.globalAlpha = 0.58;
      ctx.lineWidth = 3;
      ctx.strokeRect(8, 8, w - 16, h - 16);
      ctx.globalAlpha = 1;
      let size = wide ? 46 : 52;
      do {
        ctx.font = `900 ${size}px Syne, Inter, sans-serif`;
        size -= 2;
      } while (ctx.measureText(text).width > w - 52 && size > 22);
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.shadowColor = glow;
      ctx.shadowBlur = 18;
      ctx.fillStyle = color;
      ctx.fillText(text, w / 2, h / 2 + 2);
      ctx.shadowBlur = 5;
      ctx.fillText(text, w / 2, h / 2 + 2);
    });
    return new Mesh(new PlaneGeometry(wide ? 5.2 : 3.2, 0.9), new MeshBasicMaterial({ map: tex, transparent: true, opacity: isMobileSkyline ? 0.62 : 0.78, depthWrite: false, side: THREE.DoubleSide }));
  }

  function makeVerticalCodePanel(lines, color = "#A078FF", glow = "rgba(160,120,255,0.72)") {
    const tex = makeCanvasTexture(160, 640, (ctx, w, h) => {
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = "rgba(4,8,24,0.18)";
      ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = glow;
      ctx.lineWidth = 4;
      ctx.strokeRect(10, 10, w - 20, h - 20);
      ctx.font = "900 42px Syne, Inter, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.shadowColor = glow;
      ctx.shadowBlur = 16;
      ctx.fillStyle = color;
      lines.forEach((line, i) => ctx.fillText(line, w / 2, 74 + i * 82));
    });
    return new Mesh(new PlaneGeometry(1.1, 5.2), new MeshBasicMaterial({ map: tex, transparent: true, opacity: isMobileSkyline ? 0.48 : 0.66, depthWrite: false, side: THREE.DoubleSide }));
  }

  function makeSacredPanel(kind, color = "#00E5FF", glow = "rgba(0,229,255,0.7)") {
    const tex = makeCanvasTexture(512, 512, (ctx, w, h) => {
      const cx = w / 2, cy = h / 2, r = w * 0.31;
      ctx.clearRect(0, 0, w, h);
      ctx.strokeStyle = color;
      ctx.lineWidth = 5;
      ctx.shadowColor = glow;
      ctx.shadowBlur = 20;
      const circle = (x, y, rr) => { ctx.beginPath(); ctx.arc(x, y, rr, 0, Math.PI * 2); ctx.stroke(); };
      const line = (a, b, c, d) => { ctx.beginPath(); ctx.moveTo(a, b); ctx.lineTo(c, d); ctx.stroke(); };
      if (kind === "metatron") {
        const pts = [[cx, cy]];
        for (let i = 0; i < 6; i++) pts.push([cx + Math.cos(i * Math.PI / 3) * r * 0.72, cy + Math.sin(i * Math.PI / 3) * r * 0.72]);
        pts.forEach(([x, y]) => circle(x, y, 28));
        for (let i = 0; i < pts.length; i++) for (let j = i + 1; j < pts.length; j++) line(pts[i][0], pts[i][1], pts[j][0], pts[j][1]);
      } else if (kind === "sri") {
        for (let i = 0; i < 6; i++) { const rr = r * (0.34 + i * 0.1); ctx.beginPath(); for (let p = 0; p < 3; p++) { const a = -Math.PI / 2 + p * Math.PI * 2 / 3 + (i % 2 ? Math.PI : 0); const x = cx + Math.cos(a) * rr; const y = cy + Math.sin(a) * rr; p ? ctx.lineTo(x, y) : ctx.moveTo(x, y); } ctx.closePath(); ctx.stroke(); }
        circle(cx, cy, r * 1.02);
      } else if (kind === "torus") {
        for (let i = 0; i < 7; i++) { ctx.beginPath(); ctx.ellipse(cx, cy, r * 0.92, r * 0.22, i * Math.PI / 7, 0, Math.PI * 2); ctx.stroke(); }
        circle(cx, cy, r * 0.82);
      } else if (kind === "seed") {
        circle(cx, cy, r * 0.34); for (let i = 0; i < 6; i++) circle(cx + Math.cos(i * Math.PI / 3) * r * 0.34, cy + Math.sin(i * Math.PI / 3) * r * 0.34, r * 0.34); circle(cx, cy, r * 0.9);
      } else {
        for (let i = 0; i < 2; i++) for (let p = 0; p < 6; p++) circle(cx + Math.cos(p * Math.PI / 3) * r * 0.22 * (i + 1), cy + Math.sin(p * Math.PI / 3) * r * 0.22 * (i + 1), r * 0.28);
        circle(cx, cy, r * 0.98);
      }
    });
    return new Mesh(new PlaneGeometry(1.8, 1.8), new MeshBasicMaterial({ map: tex, transparent: true, opacity: isMobileSkyline ? 0.42 : 0.58, depthWrite: false, side: THREE.DoubleSide }));
  }

  function makeChakraMeter() {
    const colors = ["#FF3B30", "#FF8A00", "#FFD84D", "#42F587", "#00D9FF", "#5B7CFF", "#A855F7"];
    const tex = makeCanvasTexture(128, 640, (ctx, w, h) => {
      ctx.clearRect(0, 0, w, h);
      colors.forEach((c, i) => {
        const y = h - 56 - i * 78;
        ctx.shadowColor = c; ctx.shadowBlur = 18; ctx.fillStyle = c;
        ctx.fillRect(34, y, 60, 46);
        ctx.strokeStyle = "rgba(255,255,255,0.42)"; ctx.strokeRect(29, y - 5, 70, 56);
      });
    });
    return new Mesh(new PlaneGeometry(0.75, 4.8), new MeshBasicMaterial({ map: tex, transparent: true, opacity: isMobileSkyline ? 0.46 : 0.64, depthWrite: false, side: THREE.DoubleSide }));
  }

  function placeFacade(mesh, side, x, y, z) {
    mesh.position.set(x, y, z);
    if (side === "east") mesh.rotation.y = -Math.PI / 2;
    if (side === "west") mesh.rotation.y = Math.PI / 2;
    scene.add(mesh);
  }

  function placeSkylineLightCodes() {
    const W = W_FACE_X + 0.02, E = E_FACE_X - 0.02, N = -37.1;
    const wisdom = [
      [makeLightCodePanel("AS ABOVE SO BELOW", "#E9F8FF", "rgba(0,229,255,0.7)", true), "north", -28, 12.4, N],
      [makeLightCodePanel("EVERYTHING VIBRATES", "#FFDFA5", "rgba(255,216,120,0.62)", true), "north", 8, 15.8, N],
      [makeLightCodePanel("MIND SHAPES REALITY", "#A8EFFF", "rgba(0,180,255,0.7)", true), "west", W, 10.4, -26],
      [makeLightCodePanel("CAUSE CREATES EFFECT", "#C9B2FF", "rgba(170,120,255,0.68)", true), "east", E, 9.6, -23],
      [makeLightCodePanel("INNER WORLD = OUTER WORLD", "#E9F8FF", "rgba(0,229,255,0.58)", true), "north", -12, 18.6, N],
    ];
    wisdom.forEach(([mesh, side, x, y, z]) => placeFacade(mesh, side, x, y, z));

    [["369", -36, 8.8], ["432", -20, 11.3], ["528", -4, 9.8], ["639", 12, 12.1], ["741", 24, 9.5], ["852", 36, 8.7], ["963", 0, 16.4]].forEach(([code, x, y], i) => {
      placeFacade(makeLightCodePanel(code, i % 2 ? "#FFDFA5" : "#00E5FF", i % 2 ? "rgba(255,216,120,0.62)" : "rgba(0,229,255,0.7)"), "north", x, y, N);
    });

    placeFacade(makeVerticalCodePanel(["111", "222", "333", "444", "555"], "#C9B2FF", "rgba(170,120,255,0.72)"), "west", W, 10.7, -14);
    placeFacade(makeVerticalCodePanel(["333", "444", "555", "777", "888"], "#9AF7FF", "rgba(0,229,255,0.7)"), "east", E, 10.5, -11);

    [
      ["FREQUENCY ONLINE", "east", E, 12.8, -29], ["TIMELINE SYNC", "west", W, 12.7, -32],
      ["AURA FIELD STABLE", "north", 28, 13.8, N], ["SOURCE SIGNAL", "east", E, 8.2, 1],
      ["QUANTUM FOCUS", "west", W, 8.6, 4], ["HIGHER SELF MODE", "north", -32, 9.6, N],
    ].forEach(([txt, side, x, y, z], i) => placeFacade(makeLightCodePanel(txt, i % 2 ? "#FF7AD9" : "#A8EFFF", i % 2 ? "rgba(255,80,195,0.58)" : "rgba(0,229,255,0.62)", true), side, x, y, z));

    [["flower", "north", -16, 14.4, N], ["metatron", "north", 16, 13.4, N], ["sri", "west", W, 14.2, -5], ["seed", "east", E, 13.4, -5], ["torus", "north", 32, 11.8, N]].forEach(([kind, side, x, y, z], i) => {
      placeFacade(makeSacredPanel(kind, i % 2 ? "#C9B2FF" : "#00E5FF", i % 2 ? "rgba(170,120,255,0.65)" : "rgba(0,229,255,0.65)"), side, x, y, z);
    });

    placeFacade(makeChakraMeter(), "north", -24, 8.5, N);
    placeFacade(makeChakraMeter(), "east", E, 8.3, 5);

    placeFacade(makeVerticalCodePanel(["NEW MOON", "FULL MOON", "SOLAR", "LUNAR", "COSMIC"], "#E9F8FF", "rgba(0,229,255,0.58)"), "north", 6, 9.2, N);

    [["ALIGN", -40, 5.6], ["FLOW", -18, 6.7], ["RISE", -2, 7.4], ["RECEIVE", 20, 6.4], ["AWAKEN", 34, 6.8]].forEach(([txt, x, y], i) => {
      placeFacade(makeLightCodePanel(txt, i % 2 ? "#FFDFA5" : "#9AF7FF"), "north", x, y, N);
    });
    [["TRANSMUTE", "west", W, 6.4, -20], ["HARMONIZE", "east", E, 6.8, -17], ["ACTIVATE", "west", W, 6.2, 9], ["BECOME", "east", E, 6.2, 9]].forEach(([txt, side, x, y, z]) => placeFacade(makeLightCodePanel(txt, "#C9B2FF"), side, x, y, z));
  }

  // ── NEON BUILDING SIGNS — eye-level storefront placement ───────
  // Stage is at x=0, z=-32. East wall x=+38, West wall x=-38.
  // Signs sit at y=2.25 — right above the 2.0 storefront floor / awning.
  // Face offset: x = wall ± (depth/2 + 0.05) so panel is flush against the facade.
  // Layout:
  //   STAGE-FLANKING (z≈-32): 1 west + 1 east — frame the Music Stage left/right
  //   SPREAD OUT: 2 west (z=-17, z=-5) + 2 east (z=-14, z=-2) — wide distribution
  const SIGN_Y   = 2.25;           // just above awning — true eye level
  const W_FACE_X = -38 + 0.9;     // west wall east-facing surface
  const E_FACE_X =  38 - 0.9;     // east wall west-facing surface

  // ── Stage-flanking pair (frames the Music Stage from east & west) ──
  // WEST side of stage — "UPPER VIBE MEDIA"
  const wStage = makeFacadeSign("UPPER VIBE MEDIA", "#00E5FF", "#00AADD", 5.5, 0.85);
  wStage.position.set(W_FACE_X, SIGN_Y, -32);
  wStage.rotation.y = Math.PI / 2;
  scene.add(wStage);

  // EAST side of stage — "HIGH VIBE MUSIC"
  const eStage = makeFacadeSign("HIGH VIBE MUSIC", "#00E5FF", "#0088FF", 5.2, 0.85);
  eStage.position.set(E_FACE_X, SIGN_Y, -32);
  eStage.rotation.y = -Math.PI / 2;
  scene.add(eStage);

  // ── Spread-out signs — evenly distributed across the skyline ───
  // West wall runs z=-35 to z=+11. Stage pair is at z=-32.
  // Mid-west: z=-11 (halfway along wall), Far-west end: z=+7
  const wMid = makeFacadeSign("MANIFEST MODE", "#C43BFF", "#9B00FF", 6.5, 0.85);
  wMid.position.set(W_FACE_X, SIGN_Y, -20);
  wMid.rotation.y = Math.PI / 2;
  scene.add(wMid);

  const wEnd = makeFacadeSign("432 HZ LIVE", "#FF4FC3", "#CC0099", 3.8, 0.85);
  wEnd.position.set(W_FACE_X, SIGN_Y, 7);
  wEnd.rotation.y = Math.PI / 2;
  scene.add(wEnd);

  // East wall runs z=-35 to z=+11. Stage pair is at z=-32.
  // Mid-east: z=-11 (halfway along wall), Far-east end: z=+7
  const eMid = makeFacadeSign("VIBE AWARE", "#A078FF", "#7C3AED", 6.0, 0.85);
  eMid.position.set(E_FACE_X, SIGN_Y, -17);
  eMid.rotation.y = -Math.PI / 2;
  scene.add(eMid);

  const eEnd = makeFacadeSign("UPPER VIBE CITY", "#FF6B35", "#DD4400", 5.0, 0.85);
  eEnd.position.set(E_FACE_X, SIGN_Y, 7);
  eEnd.rotation.y = -Math.PI / 2;
  scene.add(eEnd);

  placeSkylineLightCodes();

  scene.add(buildings);

  // ── Only 4 north-skyline buildings pulsate — spread out, stage center excluded ──
  // x=0 (directly behind stage) stays static. Chosen: x=-28, x=-8, x=12, x=32
  // These are well-spread across the north wall and away from stage center.
  const pulseNeonCyan   = new MeshBasicMaterial({ color: new Color("#00A6C8"), depthWrite: false, transparent: true, opacity: 0.32 });
  const pulseNeonPurple = new MeshBasicMaterial({ color: new Color("#8A58C8"), depthWrite: false, transparent: true, opacity: 0.30 });
  const pulseNeonBlue   = new MeshBasicMaterial({ color: new Color("#3D78A8"), depthWrite: false, transparent: true, opacity: 0.30 });
  const pulseNeonCyan2  = new MeshBasicMaterial({ color: new Color("#00A6C8"), depthWrite: false, transparent: true, opacity: 0.28 });

  // Keep skyline accents static and subtle — no per-frame window/building pulse loop.
  scene.userData.neonMats = [];

  // Override accent material on the 4 chosen buildings post-construction
  // Each material targets the corner strips + crown of its specific building group
  const PULSE_BUILDINGS = [
    { x: -28, mat: pulseNeonBlue   }, // far-left north
    { x:  -8, mat: pulseNeonCyan   }, // left-center north (Twin Towers West uses this)
    { x:  12, mat: pulseNeonCyan2  }, // right-center north
    { x:  32, mat: pulseNeonPurple }, // far-right north
  ];
  buildings.children.forEach((child) => {
    if (!child.position) return;
    const cx = Math.round(child.position.x);
    const cz = Math.round(child.position.z);
    // Only apply to north wall (z ≈ -38) buildings at the 4 chosen x positions
    if (cz !== -38) return;
    const pulse = PULSE_BUILDINGS.find((p) => p.x === cx);
    if (!pulse) return;
    child.traverse((obj) => {
      if (obj.isMesh && obj.material === neonCyan)   obj.material = pulse.mat;
      if (obj.isMesh && obj.material === neonPurple) obj.material = pulse.mat;
      if (obj.isMesh && obj.material === neonBlue)   obj.material = pulse.mat;
    });
  });
}