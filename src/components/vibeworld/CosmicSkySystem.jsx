/**
 * CosmicSkySystem — seamless sphere skybox + shooting stars + asteroids + planets
 *
 * Layer order (renderOrder):
 *  -10 : skybox sphere (BackSide canvas texture — stars + galaxy baked in)
 *    1 : Points starfield (extra visible stars on top of skybox)
 *   20 : planets (always on top of sky, never hidden by skybox)
 *    5 : shooting star
 *    6 : mega asteroid head
 *
 * Planets: frustumCulled=false, depthTest=false, renderOrder=20 — never disappear.
 * Skybox: depthWrite=false, depthTest=false, renderOrder=-10 — always behind everything.
 * Stars: depthWrite=false, depthTest=false, renderOrder=1 — visible on top of skybox canvas.
 *
 * ?skydebug=1 — boosts opacity of stars/galaxy and logs planet positions to console.
 */
import * as THREE from "three";

const SKY_DEBUG = typeof window !== "undefined" &&
  new URLSearchParams(window.location.search).get("skydebug") === "1";

export function createCosmicSky(scene) {
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
  scene.userData._skyIsMobile = isMobile;

  if (SKY_DEBUG) {
    console.log("[SkyDebug] isMobile:", isMobile);
  }

  // ── 1. SKYBOX — procedural canvas texture (stars + galaxy baked in) ──────────
  // The canvas draws: deep space base → galaxy band → nebula blobs → star dots.
  // Stars here are supplemental — the Points starfield below is the primary star layer.
  const skyCanvas = document.createElement("canvas");
  const SKY_W = isMobile ? 1024 : 2048;
  const SKY_H = isMobile ? 512  : 1024;
  skyCanvas.width  = SKY_W;
  skyCanvas.height = SKY_H;
  const skyCtx = skyCanvas.getContext("2d");

  // Deep space base
  const bgGrad = skyCtx.createLinearGradient(0, 0, 0, SKY_H);
  bgGrad.addColorStop(0.0,  "#030610");
  bgGrad.addColorStop(0.25, "#050A1A");
  bgGrad.addColorStop(0.5,  "#070F25");
  bgGrad.addColorStop(0.75, "#0A1330");
  bgGrad.addColorStop(1.0,  "#0D183C");
  skyCtx.fillStyle = bgGrad;
  skyCtx.fillRect(0, 0, SKY_W, SKY_H);

  // Galaxy band — broad glow pass
  const mwGrad = skyCtx.createLinearGradient(SKY_W * 0.05, SKY_H * 0.08, SKY_W * 0.95, SKY_H * 0.72);
  mwGrad.addColorStop(0,    "rgba(0,0,0,0)");
  mwGrad.addColorStop(0.15, "rgba(50,20,100,0.30)");   // boosted from 0.10
  mwGrad.addColorStop(0.30, "rgba(80,35,150,0.45)");   // boosted from 0.18
  mwGrad.addColorStop(0.45, "rgba(55,70,180,0.50)");   // boosted from 0.22
  mwGrad.addColorStop(0.55, "rgba(35,90,165,0.45)");   // boosted from 0.20
  mwGrad.addColorStop(0.70, "rgba(70,35,125,0.35)");   // boosted from 0.15
  mwGrad.addColorStop(0.85, "rgba(25,12,60,0.18)");    // boosted from 0.08
  mwGrad.addColorStop(1,    "rgba(0,0,0,0)");
  skyCtx.fillStyle = mwGrad;
  skyCtx.fillRect(0, 0, SKY_W, SKY_H);

  // Galaxy band — narrow bright core
  const mwCore = skyCtx.createLinearGradient(SKY_W * 0.10, SKY_H * 0.15, SKY_W * 0.90, SKY_H * 0.65);
  mwCore.addColorStop(0,    "rgba(0,0,0,0)");
  mwCore.addColorStop(0.35, "rgba(90,60,200,0.22)");   // boosted from 0.08
  mwCore.addColorStop(0.50, "rgba(110,155,235,0.30)"); // boosted from 0.13
  mwCore.addColorStop(0.65, "rgba(90,60,200,0.22)");
  mwCore.addColorStop(1,    "rgba(0,0,0,0)");
  skyCtx.fillStyle = mwCore;
  skyCtx.fillRect(0, 0, SKY_W, SKY_H);

  // Nebula cloud blobs (seeded for consistency)
  const nebRng = (() => { let s = 42; return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; }; })();
  const nebCount = isMobile ? 10 : 22;
  const nebHues = [
    [80, 40, 180], [40, 80, 200], [100, 30, 160],
    [30, 100, 180], [60, 20, 140], [20, 60, 200],
    [120, 50, 220], [50, 120, 190],
  ];
  for (let n = 0; n < nebCount; n++) {
    const nx = (0.05 + nebRng() * 0.90) * SKY_W;
    const ny = nebRng() * SKY_H * 0.65;
    const nrx = (0.05 + nebRng() * 0.12) * SKY_W;
    const nry = nrx * (0.30 + nebRng() * 0.50);
    const [r, g, b] = nebHues[Math.floor(nebRng() * nebHues.length)];
    const alpha = SKY_DEBUG ? 0.30 : (0.12 + nebRng() * 0.18); // boosted significantly
    const ng = skyCtx.createRadialGradient(nx, ny, 0, nx, ny, Math.max(nrx, nry));
    ng.addColorStop(0,   `rgba(${r},${g},${b},${alpha.toFixed(3)})`);
    ng.addColorStop(0.4, `rgba(${r},${g},${b},${(alpha * 0.5).toFixed(3)})`);
    ng.addColorStop(1,   "rgba(0,0,0,0)");
    skyCtx.save();
    skyCtx.scale(1, nry / nrx);
    skyCtx.fillStyle = ng;
    skyCtx.beginPath();
    skyCtx.arc(nx, ny * (nrx / nry), nrx, 0, Math.PI * 2);
    skyCtx.fill();
    skyCtx.restore();
  }

  // Baked canvas stars — small dots on the sphere texture
  const canvasStarCount = isMobile ? 400 : 900;
  const seededStar = (() => { let s = 99; return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; }; })();
  for (let i = 0; i < canvasStarCount; i++) {
  const sx = seededStar() * SKY_W;
  const sy = seededStar() * SKY_H;
  // Smaller radius for a less cluttered sky
  const sr = 0.5 + seededStar() * (seededStar() < 0.08 ? 1.2 : 0.5);
  const bright = SKY_DEBUG ? 1.0 : (0.45 + seededStar() * 0.35);
    const warm = seededStar() < 0.12;
    const col = warm
      ? `rgba(255,215,170,${bright.toFixed(2)})`
      : `rgba(${195 + Math.floor(seededStar() * 60)},${210 + Math.floor(seededStar() * 45)},255,${bright.toFixed(2)})`;
    skyCtx.beginPath();
    skyCtx.arc(sx, sy, sr, 0, Math.PI * 2);
    skyCtx.fillStyle = col;
    skyCtx.fill();
  }

  // Hero stars — smaller glowing stars (reduced 60%)
  const heroStarCount = isMobile ? 8 : 18;
  const seededHero = (() => { let s = 77; return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; }; })();
  for (let h = 0; h < heroStarCount; h++) {
    const hx = seededHero() * SKY_W;
    const hy = seededHero() * SKY_H * 0.80;
    const hr = 0.8 + seededHero() * 1.2;
    const hg = skyCtx.createRadialGradient(hx, hy, 0, hx, hy, hr * 2.0);
    hg.addColorStop(0,    "rgba(255,255,255,0.9)");
    hg.addColorStop(0.2,  "rgba(220,235,255,0.5)");
    hg.addColorStop(0.6,  "rgba(180,210,255,0.15)");
    hg.addColorStop(1,    "rgba(0,0,0,0)");
    skyCtx.fillStyle = hg;
    skyCtx.beginPath();
    skyCtx.arc(hx, hy, hr * 2.0, 0, Math.PI * 2);
    skyCtx.fill();
  }

  const skyTex = new THREE.CanvasTexture(skyCanvas);
  skyTex.colorSpace = THREE.SRGBColorSpace;
  skyTex.minFilter = THREE.LinearFilter;
  skyTex.magFilter = THREE.LinearFilter;
  skyTex.generateMipmaps = false;

  const skybox = new THREE.Mesh(
    new THREE.SphereGeometry(120, isMobile ? 32 : 48, isMobile ? 24 : 36),
    new THREE.MeshBasicMaterial({
      map: skyTex,
      side: THREE.BackSide,
      depthWrite: false,
      depthTest: false,
    })
  );
  skybox.name = "skybox";
  skybox.renderOrder = -10;
  skybox.frustumCulled = false;
  scene.add(skybox);
  scene.userData._skyboxRef = skybox;

  // ── 2. POINTS STARFIELD — primary visible star layer ─────────────────────────
  // This is what you actually SEE. The canvas stars above are supplemental.
  // Using THREE.Points: one BufferGeometry, one PointsMaterial, no per-star updates.
  {
    const starCount = isMobile ? 300 : 700;
    const starGeo = new THREE.BufferGeometry();
    const positions = new Float32Array(starCount * 3);
    const colors = new Float32Array(starCount * 3);
    const sr = (() => { let s = 1234; return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; }; })();

    for (let i = 0; i < starCount; i++) {
      // Distribute on upper hemisphere only — no stars on or below the horizon
      const theta = sr() * Math.PI * 2;           // longitude
      // phi in [0, PI/2] → upper hemisphere only (y = cos(phi) >= 0)
      const phi   = Math.acos(1 - sr());          // upper hemisphere: cos(phi) in [0,1]
      const dist  = 95 + sr() * 10;               // just inside skybox (r=120)

      positions[i * 3]     = dist * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = dist * Math.cos(phi);  // always >= 0
      positions[i * 3 + 2] = dist * Math.sin(phi) * Math.sin(theta);

      // Star colors: mostly blue-white, some warm
      const warm = sr() < 0.12;
      if (warm) {
        colors[i * 3]     = 1.0;
        colors[i * 3 + 1] = 0.85 + sr() * 0.15;
        colors[i * 3 + 2] = 0.65 + sr() * 0.20;
      } else {
        const b = 0.75 + sr() * 0.25;
        colors[i * 3]     = 0.75 + sr() * 0.25;
        colors[i * 3 + 1] = 0.82 + sr() * 0.18;
        colors[i * 3 + 2] = b;
      }
    }

    starGeo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    starGeo.setAttribute("color",    new THREE.BufferAttribute(colors, 3));

    // Sprite-like star texture
    const starCanvas = document.createElement("canvas");
    starCanvas.width = 16; starCanvas.height = 16;
    const sc = starCanvas.getContext("2d");
    const sg = sc.createRadialGradient(8, 8, 0, 8, 8, 8);
    sg.addColorStop(0,   "rgba(255,255,255,1)");
    sg.addColorStop(0.25,"rgba(200,220,255,0.8)");
    sg.addColorStop(0.6, "rgba(150,180,255,0.3)");
    sg.addColorStop(1,   "rgba(0,0,0,0)");
    sc.fillStyle = sg;
    sc.fillRect(0, 0, 16, 16);
    const starTex = new THREE.CanvasTexture(starCanvas);
    starTex.minFilter = THREE.LinearFilter;

    const starMat = new THREE.PointsMaterial({
      size: isMobile ? 0.25 : 0.30,
      map: starTex,
      vertexColors: true,
      transparent: true,
      opacity: SKY_DEBUG ? 1.0 : 0.75,
      depthWrite: false,
      depthTest: false,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true,
    });

    const starField = new THREE.Points(starGeo, starMat);
    starField.name = "cosmicStarField";
    starField.renderOrder = 1;
    starField.frustumCulled = false;
    scene.add(starField);
    scene.userData._starFieldRef = starField;

    if (SKY_DEBUG) console.log("[SkyDebug] Points starfield created, count:", starCount);
  }

  // ── 3. SHOOTING STAR — one clean streak every 45s ────────────────────────────
  {
    const sc = document.createElement("canvas");
    sc.width = 180; sc.height = 4;
    const sctx = sc.getContext("2d");
    const sg = sctx.createLinearGradient(0, 0, 180, 0);
    sg.addColorStop(0,    "rgba(255,255,255,0)");
    sg.addColorStop(0.55, "rgba(220,235,255,0.6)");
    sg.addColorStop(0.85, "rgba(240,248,255,0.95)");
    sg.addColorStop(1,    "rgba(255,255,255,1)");
    sctx.fillStyle = sg;
    sctx.fillRect(0, 0, 180, 4);
    const stex = new THREE.CanvasTexture(sc);
    stex.minFilter = THREE.LinearFilter;
    const smat = new THREE.SpriteMaterial({
      map: stex, transparent: true, opacity: 0,
      depthWrite: false, blending: THREE.AdditiveBlending,
    });
    const sstar = new THREE.Sprite(smat);
    sstar.scale.set(10, 0.12, 1);
    sstar.renderOrder = 5;
    sstar.frustumCulled = false;
    scene.add(sstar);
    scene.userData.shootingStar = {
      sprite: sstar, mat: smat,
      active: false, life: 0, maxLife: 0,
      vx: 0, vy: 0, vz: 0,
      nextFire: performance.now() * 0.001 + 12 + Math.random() * 8,
    };
  }

  // ── 4. MEGA ASTEROID — every 120s ────────────────────────────────────────────
  {
    const mac = document.createElement("canvas");
    mac.width = 128; mac.height = 128;
    const mactx = mac.getContext("2d");
    const mag = mactx.createRadialGradient(64, 64, 0, 64, 64, 60);
    mag.addColorStop(0,    "rgba(255,255,220,1)");
    mag.addColorStop(0.15, "rgba(255,210,80,1)");
    mag.addColorStop(0.4,  "rgba(255,120,20,0.85)");
    mag.addColorStop(0.72, "rgba(200,50,0,0.35)");
    mag.addColorStop(1,    "rgba(0,0,0,0)");
    mactx.fillStyle = mag;
    mactx.fillRect(0, 0, 128, 128);
    const matex = new THREE.CanvasTexture(mac);
    matex.minFilter = THREE.LinearFilter;
    const mamat = new THREE.SpriteMaterial({
      map: matex, transparent: true, opacity: 0,
      depthWrite: false, blending: THREE.AdditiveBlending,
    });
    const masprite = new THREE.Sprite(mamat);
    masprite.scale.set(6, 6, 1);
    masprite.renderOrder = 6;
    masprite.frustumCulled = false;
    scene.add(masprite);

    const mtc = document.createElement("canvas");
    mtc.width = 512; mtc.height = 18;
    const mtctx = mtc.getContext("2d");
    const mtg = mtctx.createLinearGradient(0, 0, 512, 0);
    mtg.addColorStop(0,    "rgba(255,80,10,0)");
    mtg.addColorStop(0.25, "rgba(255,150,40,0.35)");
    mtg.addColorStop(0.6,  "rgba(255,200,80,0.75)");
    mtg.addColorStop(0.88, "rgba(255,235,150,0.95)");
    mtg.addColorStop(1,    "rgba(255,255,220,1)");
    mtctx.fillStyle = mtg;
    for (let row = 0; row < 18; row++) {
      const f = 1 - Math.abs(row - 9) / 9;
      mtctx.globalAlpha = f * f;
      mtctx.fillRect(0, row, 512, 1);
    }
    const mttex = new THREE.CanvasTexture(mtc);
    mttex.minFilter = THREE.LinearFilter;
    const mtmat = new THREE.SpriteMaterial({
      map: mttex, transparent: true, opacity: 0,
      depthWrite: false, blending: THREE.AdditiveBlending,
    });
    const mtail = new THREE.Sprite(mtmat);
    mtail.scale.set(28, 0.7, 1);
    mtail.renderOrder = 5;
    mtail.frustumCulled = false;
    scene.add(mtail);

    scene.userData.megaAsteroid = {
      asprite: masprite, amat: mamat,
      tail: mtail, tmat: mtmat,
      active: false, life: 0, maxLife: 0,
      vx: 0, vy: 0, vz: 0,
      nextFire: performance.now() * 0.001 + 20 + Math.random() * 10,
      interval: 120,
    };
  }

  // No small asteroids — only mega asteroid per timing rules
  scene.userData.asteroids = [];

  // ── 5. THREE-LAYER PLANET SYSTEM ─────────────────────────────────────────────
  //
  // LAYER A: LOW BEACH PLANETS (2) — handled separately as beachFlybyA/B below
  //          Fly across beach only, alternate, fade out before skyline walls.
  //
  // LAYER B: MID-HIGH CITY PLANETS (2) — camera-relative, angle 0.3 & 0.7 (NE/NW)
  //          Visible from city and beach looking north. Never path through building faces.
  //          worldY = camera.y + 8 → always above city roofline (~6u tall).
  //          radius: 180–200 → far enough to read as background sky.
  //
  // LAYER C: HIGH NORTH-SKY PLANETS (2) — camera-relative, angle 0.5 (due north)
  //          Highest. Only visible from city by looking up toward north.
  //          worldY = camera.y + 18 → well above anything.
  //          radius: 240–280 → deepest background.
  //
  // All: frustumCulled=false, depthTest=false, renderOrder=20.
  // sizeAttenuation=true — larger radius = smaller apparent size = feels distant.

  const PLANET_DEFS = [
    // ── LAYER B: MID-HIGH CITY PLANETS ──────────────────────────────────────
    {
      id: "west",    // Blue gas giant — NE mid sky
      layer: "mid",
      bodyColors: ["#0A2A4A", "#1A4A7A", "#2A6AA0", "#4A8AC0", "#7ABAEE"],
      glowColor: "rgba(80,180,255,0.45)", ringColor: "rgba(120,200,255,0.55)",
      size: isMobile ? 22 : 30,
      angleOffset: Math.PI * 0.30,
      // worldY = camera.y + camHeightOffset
      // Buildings top out ~8u above ground; camera eye is ~2.4u above ground.
      // So camera.y ≈ 2.4. To clear an 8u rooftop: need offset > 8 - 2.4 = 5.6.
      // Use 14 so the planet centre sits ~16.4u world-Y — clearly above all rooflines.
      camHeightOffset: 14,
      radius: 185,
      orbitSpeed: (Math.PI * 2) / 380,
    },
    {
      id: "green",   // Emerald — NW mid sky
      layer: "mid",
      bodyColors: ["#041A0A", "#0A3A18", "#185A28", "#28884A", "#50CC80"],
      glowColor: "rgba(60,200,100,0.42)", ringColor: "rgba(80,220,120,0.55)",
      size: isMobile ? 20 : 28,
      angleOffset: Math.PI * 0.78,
      camHeightOffset: 16,
      radius: 195,
      orbitSpeed: (Math.PI * 2) / 300,
    },
    // ── LAYER C: HIGH NORTH-SKY PLANETS ─────────────────────────────────────
    {
      id: "mega",    // Large purple ringed — high north sky
      layer: "high",
      bodyColors: ["#1A0A2A", "#3A1A5A", "#6A2A9A", "#9A4ACA", "#CC88FF"],
      glowColor: "rgba(160,80,255,0.55)", ringColor: "rgba(200,140,255,0.65)",
      size: isMobile ? 36 : 50,
      angleOffset: Math.PI * 0.88,
      camHeightOffset: 28,
      radius: 250,
      orbitSpeed: (Math.PI * 2) / 480,
    },
    {
      id: "crimson", // Red storm — high north-northeast sky
      layer: "high",
      bodyColors: ["#2A0404", "#5A0A0A", "#8A1818", "#C03030", "#E86060"],
      glowColor: "rgba(220,60,60,0.48)", ringColor: "rgba(200,80,80,0.55)",
      size: isMobile ? 30 : 42,
      angleOffset: Math.PI * 0.12,
      camHeightOffset: 30,
      radius: 265,
      orbitSpeed: (Math.PI * 2) / 560,
    },
  ];

  function seededRand(seed) {
    let s = seed;
    return () => { s = (s * 16807 + 0) % 2147483647; return (s - 1) / 2147483646; };
  }

  const planets = PLANET_DEFS.map((def, defIdx) => {
    const S = 256;
    const pc = document.createElement("canvas");
    pc.width = S; pc.height = S;
    const pctx = pc.getContext("2d");
    const rng = seededRand(defIdx * 7919 + 1337);
    const R = S * 0.30;
    const cx = S / 2, cy = S / 2;

    // Atmospheric halo
    const haloG = pctx.createRadialGradient(cx, cy, R * 0.92, cx, cy, R * 1.65);
    haloG.addColorStop(0, def.glowColor);
    haloG.addColorStop(1, "rgba(0,0,0,0)");
    pctx.fillStyle = haloG;
    pctx.fillRect(0, 0, S, S);

    // Planet body
    const bodyG = pctx.createRadialGradient(cx - R*0.28, cy - R*0.26, R*0.04, cx, cy, R);
    bodyG.addColorStop(0,    def.bodyColors[4]);
    bodyG.addColorStop(0.25, def.bodyColors[3]);
    bodyG.addColorStop(0.55, def.bodyColors[2]);
    bodyG.addColorStop(0.78, def.bodyColors[1]);
    bodyG.addColorStop(1,    def.bodyColors[0]);
    pctx.beginPath();
    pctx.arc(cx, cy, R, 0, Math.PI * 2);
    pctx.fillStyle = bodyG;
    pctx.fill();

    // Surface texture per planet
    pctx.save();
    pctx.beginPath();
    pctx.arc(cx, cy, R, 0, Math.PI * 2);
    pctx.clip();

    if (def.id === "mega" || def.id === "violet") {
      for (let b = 0; b < 9; b++) {
        const by = cy - R + (b / 8) * R * 2;
        const bw = R * (0.06 + rng() * 0.10);
        const alpha = 0.06 + rng() * 0.10;
        const bandG = pctx.createLinearGradient(0, by - bw, 0, by + bw);
        bandG.addColorStop(0, "rgba(0,0,0,0)");
        bandG.addColorStop(0.5, `rgba(${180 + Math.floor(rng()*60)},${80 + Math.floor(rng()*40)},255,${alpha})`);
        bandG.addColorStop(1, "rgba(0,0,0,0)");
        pctx.fillStyle = bandG;
        pctx.fillRect(cx - R, by - bw, R * 2, bw * 2);
      }
      pctx.save();
      pctx.translate(cx + R * 0.15, cy + R * 0.12);
      pctx.scale(1, 0.55);
      pctx.beginPath();
      pctx.arc(0, 0, R * 0.16, 0, Math.PI * 2);
      pctx.fillStyle = "rgba(255,180,255,0.18)";
      pctx.fill();
      pctx.strokeStyle = "rgba(220,140,255,0.22)";
      pctx.lineWidth = 2;
      pctx.stroke();
      pctx.restore();
    } else if (def.id === "west") {
      for (let b = 0; b < 8; b++) {
        const by = cy - R + (b / 7) * R * 2;
        const bw = R * (0.05 + rng() * 0.09);
        const alpha = 0.07 + rng() * 0.09;
        const bandG = pctx.createLinearGradient(0, by - bw, 0, by + bw);
        bandG.addColorStop(0, "rgba(0,0,0,0)");
        bandG.addColorStop(0.5, `rgba(${80 + Math.floor(rng()*60)},${180 + Math.floor(rng()*60)},255,${alpha})`);
        bandG.addColorStop(1, "rgba(0,0,0,0)");
        pctx.fillStyle = bandG;
        pctx.fillRect(cx - R, by - bw, R * 2, bw * 2);
      }
    } else if (def.id === "east") {
      for (let p = 0; p < 14; p++) {
        const px2 = cx + (rng() - 0.5) * R * 1.7;
        const py2 = cy + (rng() - 0.5) * R * 1.7;
        const pr = R * (0.06 + rng() * 0.18);
        const pG = pctx.createRadialGradient(px2, py2, 0, px2, py2, pr);
        pG.addColorStop(0, `rgba(${180 + Math.floor(rng()*60)},${100 + Math.floor(rng()*60)},${20 + Math.floor(rng()*40)},${0.06 + rng() * 0.11})`);
        pG.addColorStop(1, "rgba(0,0,0,0)");
        pctx.fillStyle = pG;
        pctx.fillRect(px2 - pr, py2 - pr, pr * 2, pr * 2);
      }
    } else if (def.id === "green") {
      for (let p = 0; p < 8; p++) {
        const px2 = cx + (rng() - 0.5) * R * 1.4;
        const py2 = cy + (rng() - 0.5) * R * 1.4;
        const pr = R * (0.10 + rng() * 0.22);
        const pG = pctx.createRadialGradient(px2, py2, 0, px2, py2, pr);
        pG.addColorStop(0, `rgba(${20 + Math.floor(rng()*40)},${160 + Math.floor(rng()*60)},${40 + Math.floor(rng()*40)},${0.14 + rng()*0.10})`);
        pG.addColorStop(1, "rgba(0,0,0,0)");
        pctx.fillStyle = pG;
        pctx.fillRect(px2 - pr, py2 - pr, pr * 2, pr * 2);
      }
    } else if (def.id === "crimson") {
      for (let b = 0; b < 7; b++) {
        const by = cy - R + (b / 6) * R * 2;
        const bw = R * (0.03 + rng() * 0.06);
        pctx.fillStyle = `rgba(255,${60 + Math.floor(rng()*60)},0,${0.08 + rng() * 0.12})`;
        pctx.fillRect(cx - R, by - bw, R * 2, bw * 2);
      }
      for (let h = 0; h < 6; h++) {
        const hx = cx + (rng() - 0.5) * R * 1.5;
        const hy = cy + (rng() - 0.5) * R * 1.5;
        const hr = R * (0.04 + rng() * 0.10);
        const hG = pctx.createRadialGradient(hx, hy, 0, hx, hy, hr);
        hG.addColorStop(0, `rgba(255,${120 + Math.floor(rng()*100)},0,${0.18 + rng()*0.14})`);
        hG.addColorStop(1, "rgba(0,0,0,0)");
        pctx.fillStyle = hG;
        pctx.beginPath();
        pctx.arc(hx, hy, hr, 0, Math.PI * 2);
        pctx.fill();
      }
    }
    pctx.restore();

    // Terminator shadow
    pctx.save();
    pctx.beginPath();
    pctx.arc(cx, cy, R, 0, Math.PI * 2);
    pctx.clip();
    const shadowG = pctx.createRadialGradient(cx + R*0.45, cy + R*0.45, R*0.05, cx + R*0.65, cy + R*0.65, R*1.1);
    shadowG.addColorStop(0, "rgba(0,0,0,0)");
    shadowG.addColorStop(0.55, "rgba(0,0,0,0.18)");
    shadowG.addColorStop(1, "rgba(0,0,0,0.62)");
    pctx.fillStyle = shadowG;
    pctx.fillRect(cx - R, cy - R, R * 2, R * 2);
    pctx.restore();

    // Specular highlight
    pctx.save();
    pctx.beginPath();
    pctx.arc(cx, cy, R, 0, Math.PI * 2);
    pctx.clip();
    const specG = pctx.createRadialGradient(cx - R*0.38, cy - R*0.34, 0, cx - R*0.38, cy - R*0.34, R*0.45);
    specG.addColorStop(0, "rgba(255,255,255,0.18)");
    specG.addColorStop(1, "rgba(0,0,0,0)");
    pctx.fillStyle = specG;
    pctx.fillRect(cx - R, cy - R, R * 2, R * 2);
    pctx.restore();

    // Ring for mega and violet planets
    if (def.id === "mega" || def.id === "violet") {
      pctx.save();
      pctx.translate(cx, cy);
      pctx.scale(1, 0.28);
      pctx.beginPath();
      pctx.arc(0, 0, R * 1.46, 0, Math.PI * 2);
      pctx.strokeStyle = def.ringColor;
      pctx.lineWidth = S * 0.045;
      pctx.stroke();
      pctx.beginPath();
      pctx.arc(0, 0, R * 1.65, 0, Math.PI * 2);
      pctx.strokeStyle = "rgba(200,140,255,0.18)";
      pctx.lineWidth = S * 0.022;
      pctx.stroke();
      pctx.restore();
    }

    const ptex = new THREE.CanvasTexture(pc);
    ptex.minFilter = THREE.LinearFilter;
    ptex.generateMipmaps = false;

    // Mid/high city planets: depthTest=true so skyline buildings occlude them.
    // renderOrder=2 ensures opaque building geometry fills the depth buffer first.
    const pmat = new THREE.SpriteMaterial({
      map: ptex,
      transparent: true,
      opacity: 1.0,
      depthWrite: false,
      depthTest: true,
      sizeAttenuation: true,
    });
    const psprite = new THREE.Sprite(pmat);
    psprite.scale.set(def.size, def.size, 1);
    psprite.frustumCulled = false;
    psprite.renderOrder = 2;
    scene.add(psprite);

    return {
      sprite: psprite,
      mat: pmat,
      angleOffset: def.angleOffset,
      camHeightOffset: def.camHeightOffset,
      radius: def.radius,
      orbitSpeed: def.orbitSpeed,
      id: def.id,
      layer: def.layer,
    };
  });
  scene.userData.horizonPlanets = planets;

  // ── 6. LAYER A: LOW BEACH FLYBY PLANETS — A & B (alternating) ───────────────
  // These are the ONLY low planets. They fly across the BEACH side of the sky only.
  // Rules:
  //  - Camera-relative: offset from camera position so they track correctly
  //  - cameraZ offset: -150 → far behind horizon, never inside playable space
  //  - cameraY offset: +5 → just above avatar eye-level, feels low sky not overhead
  //  - cameraX: left lane (-50 → -20) for A, right lane (+50 → +20) for B
  //  - Fade out at x limit ±22 (before hitting east/west skyline walls at ±36 world)
  //  - Only one active at a time — strict alternation
  //  - Only visible when player pz > 8 (beach/southern area)
  //  - Duration: 18s per pass

  function buildFlybyPlanet(colors, glowColor, size) {
    const S = 256;
    const pc = document.createElement("canvas");
    pc.width = S; pc.height = S;
    const pctx = pc.getContext("2d");
    const R = S * 0.30;
    const cx = S / 2, cy = S / 2;

    const haloG = pctx.createRadialGradient(cx, cy, R * 0.92, cx, cy, R * 1.65);
    haloG.addColorStop(0, glowColor);
    haloG.addColorStop(1, "rgba(0,0,0,0)");
    pctx.fillStyle = haloG;
    pctx.fillRect(0, 0, S, S);

    const bodyG = pctx.createRadialGradient(cx - R*0.28, cy - R*0.26, R*0.04, cx, cy, R);
    bodyG.addColorStop(0,    colors[4]);
    bodyG.addColorStop(0.25, colors[3]);
    bodyG.addColorStop(0.55, colors[2]);
    bodyG.addColorStop(0.78, colors[1]);
    bodyG.addColorStop(1,    colors[0]);
    pctx.beginPath();
    pctx.arc(cx, cy, R, 0, Math.PI * 2);
    pctx.fillStyle = bodyG;
    pctx.fill();

    // Simple band texture
    pctx.save();
    pctx.beginPath();
    pctx.arc(cx, cy, R, 0, Math.PI * 2);
    pctx.clip();
    for (let b = 0; b < 7; b++) {
      const by = cy - R + (b / 6) * R * 2;
      const bw = R * (0.04 + Math.sin(b * 1.7) * 0.03 + 0.02);
      const alpha = 0.06 + Math.abs(Math.sin(b * 0.9)) * 0.08;
      const bandG = pctx.createLinearGradient(0, by - bw, 0, by + bw);
      bandG.addColorStop(0, "rgba(0,0,0,0)");
      bandG.addColorStop(0.5, `rgba(255,255,255,${alpha.toFixed(3)})`);
      bandG.addColorStop(1, "rgba(0,0,0,0)");
      pctx.fillStyle = bandG;
      pctx.fillRect(cx - R, by - bw, R * 2, bw * 2);
    }
    pctx.restore();

    // Terminator shadow
    pctx.save();
    pctx.beginPath();
    pctx.arc(cx, cy, R, 0, Math.PI * 2);
    pctx.clip();
    const shadowG = pctx.createRadialGradient(cx + R*0.45, cy + R*0.45, R*0.05, cx + R*0.65, cy + R*0.65, R*1.1);
    shadowG.addColorStop(0, "rgba(0,0,0,0)");
    shadowG.addColorStop(0.55, "rgba(0,0,0,0.18)");
    shadowG.addColorStop(1, "rgba(0,0,0,0.62)");
    pctx.fillStyle = shadowG;
    pctx.fillRect(cx - R, cy - R, R * 2, R * 2);
    pctx.restore();

    // Specular
    pctx.save();
    pctx.beginPath();
    pctx.arc(cx, cy, R, 0, Math.PI * 2);
    pctx.clip();
    const specG = pctx.createRadialGradient(cx - R*0.38, cy - R*0.34, 0, cx - R*0.38, cy - R*0.34, R*0.45);
    specG.addColorStop(0, "rgba(255,255,255,0.18)");
    specG.addColorStop(1, "rgba(0,0,0,0)");
    pctx.fillStyle = specG;
    pctx.fillRect(cx - R, cy - R, R * 2, R * 2);
    pctx.restore();

    const ptex = new THREE.CanvasTexture(pc);
    ptex.minFilter = THREE.LinearFilter;
    ptex.generateMipmaps = false;

    // Beach flyby planets: open sky zone — no buildings to occlude them.
    // depthTest=false + renderOrder=15 keeps them always visible in the beach sky.
    const pmat = new THREE.SpriteMaterial({
      map: ptex, transparent: true, opacity: 0,
      depthWrite: false, depthTest: false,
    });
    const psprite = new THREE.Sprite(pmat);
    psprite.scale.set(size, size, 1);
    psprite.frustumCulled = false;
    psprite.renderOrder = 15;
    scene.add(psprite);
    // Park off-screen initially
    psprite.position.set(9999, 9999, 9999);
    return { sprite: psprite, mat: pmat };
  }

  // Flyby planets: small sprites at large Z depth — feel distant, never foreground.
  // At depth ~180 units behind camera, size 14–18 world units = small distant body in sky.
  const flybyA = buildFlybyPlanet(
    ["#041820", "#0A3840", "#1A6860", "#2A9888", "#50D8C0"],
    "rgba(50,200,180,0.55)",
    isMobile ? 14 : 18   // much smaller — distant sky object
  );
  const flybyB = buildFlybyPlanet(
    ["#1A0E02", "#3A2004", "#7A4010", "#C07030", "#E8B060"],
    "rgba(220,140,50,0.52)",
    isMobile ? 13 : 16   // slightly smaller than A
  );

  const now0 = performance.now() * 0.001;

  // ── Layer A flyby path rules ──────────────────────────────────────────────
  // Duration: 12s per pass, 3s gap between them → max gap ever seen is 15s.
  // Two planets alternate: A finishes → 3s → B starts → 3s → A again.
  // Total cycle = 12 + 3 + 12 + 3 = 30s, so beach is NEVER bare > 15s.
  const DURATION_A  = 12;
  const DURATION_B  = 12;
  const GAP_AFTER_A = 3;
  const GAP_AFTER_B = 3;

  scene.userData.beachFlybyA = {
    ...flybyA,
    active: false, life: 0, maxLife: 0,
    startCX: -55, startCY: 5, startCZ: -150,
    endCX:   -18, endCY:   4, endCZ: -145,
    duration: DURATION_A,
    nextFire: now0 + 1,
    _gapAfter: GAP_AFTER_A,
    _partner: null,
    _fadeInEnd: 0.10,
    _fadeOutStart: 0.85,
  };
  scene.userData.beachFlybyB = {
    ...flybyB,
    active: false, life: 0, maxLife: 0,
    startCX:  55, startCY: 5, startCZ: -150,
    endCX:    18, endCY:   4, endCZ: -145,
    duration: DURATION_B,
    nextFire: now0 + DURATION_A + GAP_AFTER_A + 1,
    _gapAfter: GAP_AFTER_B,
    _partner: null,
    _fadeInEnd: 0.10,
    _fadeOutStart: 0.85,
  };
  scene.userData.beachFlybyA._partner = scene.userData.beachFlybyB;
  scene.userData.beachFlybyB._partner = scene.userData.beachFlybyA;
}

// ── Helper: natural arc spawn ─────────────────────────────────────────────────
function spawnArcParams(fast) {
  const startX = (Math.random() - 0.5) * 40;
  const startY = 22 + Math.random() * 10;
  const startZ = -10 + (Math.random() - 0.5) * 14;
  const endX = startX + (Math.random() - 0.5) * 20;
  const endY = 4 + Math.random() * 5;
  const endZ = 28 + Math.random() * 16;
  const life = fast ? (0.7 + Math.random() * 0.4) : (1.6 + Math.random() * 0.8);
  const vx = (endX - startX) / life;
  const vy = (endY - startY) / life;
  const vz = (endZ - startZ) / life;
  const hSpeed = Math.sqrt(vx * vx + vz * vz);
  const rotation = Math.atan2(vy, hSpeed);
  return { startX, startY, startZ, vx, vy, vz, life, rotation };
}

export function animateCosmicSky(scene, camera, t, dt) {
  const isMobile = scene.userData._skyIsMobile;

  // ── Skybox follows camera (so it always surrounds the player) ────────────────
  const skybox = scene.userData._skyboxRef;
  if (skybox) {
    skybox.position.copy(camera.position);
    skybox.rotation.y += dt * 0.04; // very slow drift
  }

  // ── Starfield follows camera (points are in world-relative space offset from cam) ──
  // Stars are placed at r=95–105 around world origin — follow camera so they
  // always stay inside the far clip plane.
  const starField = scene.userData._starFieldRef;
  if (starField) {
    starField.position.copy(camera.position);
  }

  // Frame counter for throttling
  if (!scene.userData._skyFrame) scene.userData._skyFrame = 0;
  scene.userData._skyFrame++;
  const skyFrame = scene.userData._skyFrame;
  const updateSlow = !isMobile || skyFrame % 3 === 0;

  // ── Layer B & C Planets — camera-relative orbital positioning ────────────────
  // playerZ is set by CityCanvas each frame: scene.userData._playerZ = pz
  const playerZ = scene.userData._playerZ ?? 0;
  // Beach zone: pz > 8. City zone: pz < 8.
  const isAtBeach = playerZ > 8;

  const horizonPlanets = scene.userData.horizonPlanets;
  if (horizonPlanets) {
    for (const p of horizonPlanets) {
      const angle = t * p.orbitSpeed + p.angleOffset;

      // All orbits are NORTH-biased: Math.cos(angle)*radius pushes planet northward (−Z)
      // sin(angle) sweeps left/right. For north-sky planets, we clamp the sweep.
      const cx = camera.position.x + Math.sin(angle) * p.radius;
      const cz = camera.position.z + Math.cos(angle) * p.radius;
      const cy = camera.position.y + p.camHeightOffset + Math.sin(t * 0.018 + p.angleOffset) * 0.6;
      p.sprite.position.set(cx, cy, cz);

      // LAYER B (mid) + LAYER C (high): both use the same zone gate as beach flybys
      // but inverted — only visible when player is NOT at the beach (city/north zone).
      // This prevents them from ever appearing above or through the skyline buildings.
      const targetOpacity = isAtBeach ? 0.0 : 1.0;
      p.mat.opacity += (targetOpacity - p.mat.opacity) * Math.min(1, dt * 1.5);
    }
  }

  // ── Star opacity pulse (subtle twinkle) ──────────────────────────────────────
  if (starField?.material && updateSlow) {
    const base = SKY_DEBUG ? 1.0 : 0.72;
    starField.material.opacity = base + Math.sin(t * 0.9) * 0.08 + Math.cos(t * 0.55) * 0.05;
  }

  // ── Shooting Star — one every 45s ────────────────────────────────────────────
  const sstar = scene.userData.shootingStar;
  if (sstar && updateSlow) {
    if (!sstar.active) {
      if (t >= sstar.nextFire) {
        const p = spawnArcParams(true);
        sstar.sprite.position.set(p.startX, p.startY, p.startZ);
        sstar.sprite.material.rotation = p.rotation;
        sstar.vx = p.vx; sstar.vy = p.vy; sstar.vz = p.vz;
        sstar.maxLife = p.life; sstar.life = p.life;
        sstar.active = true;
        sstar.mat.opacity = 0;
      }
    } else {
      sstar.life -= dt;
      if (sstar.life <= 0) {
        sstar.active = false;
        sstar.mat.opacity = 0;
        sstar.nextFire = t + 45;
      } else {
        const prog = sstar.life / sstar.maxLife;
        sstar.mat.opacity = Math.min(1, Math.sin(Math.PI * (1 - prog)) * 0.92);
        sstar.sprite.position.x += sstar.vx * dt;
        sstar.sprite.position.y += sstar.vy * dt;
        sstar.sprite.position.z += sstar.vz * dt;
      }
    }
  }

  // ── Layer A: Beach Flyby Planets — strict alternation, beach-only ────────────
  // Only rendered when player is at the beach (pz > 8).
  // Fade envelope uses _fadeInEnd / _fadeOutStart for clean appear/disappear.
  const fba = scene.userData.beachFlybyA;
  const fbb = scene.userData.beachFlybyB;

  function animateFlyby(fb) {
    if (!fb) return;
    if (!fb.active) {
      // Only fire when player is at beach AND no partner is active
      if (t >= fb.nextFire && isAtBeach) {
        if (fb._partner && fb._partner.active) return;
        fb.active = true;
        fb.life = 0;
        fb.maxLife = fb.duration;
        fb.mat.opacity = 0;
        fb.sprite.position.set(9999, 9999, 9999);
      }
    } else {
      fb.life += dt;
      const prog = Math.min(fb.life / fb.maxLife, 1);

      // Fade in during first _fadeInEnd%, fade out during last (1-_fadeOutStart)%
      const fadeInEnd = fb._fadeInEnd ?? 0.08;
      const fadeOutStart = fb._fadeOutStart ?? 0.82;
      let env = 1.0;
      if (prog < fadeInEnd) env = prog / fadeInEnd;
      else if (prog > fadeOutStart) env = Math.max(0, (1 - prog) / (1 - fadeOutStart));

      // Let active passes complete their fade naturally — no hard cut when
      // player briefly steps off beach. Only new fires are gated by isAtBeach.
      fb.mat.opacity = env * 0.92;

      // Camera-relative — deep background, left/right sky lanes only
      const cx = fb.startCX + (fb.endCX - fb.startCX) * prog;
      const cy = fb.startCY + (fb.endCY - fb.startCY) * prog;
      const cz = fb.startCZ + (fb.endCZ - fb.startCZ) * prog;
      fb.sprite.position.set(
        camera.position.x + cx,
        camera.position.y + cy,
        camera.position.z + cz
      );

      if (prog >= 1) {
        fb.active = false;
        fb.mat.opacity = 0;
        fb.sprite.position.set(9999, 9999, 9999);
        // Partner fires after our gap, then we fire after partner finishes + gap
        const partnerDur = fb._partner ? (fb._partner.duration || 12) : 12;
        const partnerGap = fb._partner ? (fb._partner._gapAfter || 3) : 3;
        if (fb._partner) fb._partner.nextFire = t + fb._gapAfter;
        fb.nextFire = t + fb._gapAfter + partnerDur + partnerGap;
      }
    }
  }

  animateFlyby(fba);
  animateFlyby(fbb);

  // ── Mega Asteroid — every 120s ────────────────────────────────────────────────
  if (!updateSlow && isMobile) return;
  const mega = scene.userData.megaAsteroid;
  if (mega) {
    if (!mega.active) {
      if (t >= mega.nextFire) {
        const fromLeft = Math.random() < 0.5;
        mega.asprite.position.set(fromLeft ? -55 : 55, 18 + Math.random() * 6, 10 + Math.random() * 10);
        mega.vx = (fromLeft ? 1 : -1) * (5 + Math.random() * 3);
        mega.vy = -(1.5 + Math.random() * 1.0);
        mega.vz = 2 + Math.random() * 2;
        mega.maxLife = 7 + Math.random() * 3;
        mega.life = mega.maxLife;
        mega.active = true;
        mega.amat.opacity = 0;
        mega.tmat.opacity = 0;
        const hSpd = Math.sqrt(mega.vx * mega.vx + mega.vz * mega.vz);
        mega.asprite.material.rotation = Math.atan2(mega.vy, hSpd);
        mega.tail.material.rotation    = mega.asprite.material.rotation;
      }
    } else {
      mega.life -= dt;
      if (mega.life <= 0) {
        mega.active = false;
        mega.amat.opacity = 0;
        mega.tmat.opacity = 0;
        mega.nextFire = t + (mega.interval || 120) + Math.random() * 10;
      } else {
        const prog = mega.life / mega.maxLife;
        const envelope = Math.min(prog * 5, 1) * Math.min((1 - prog) * 5, 1);
        const flicker = 1.0 + Math.sin(t * 28) * 0.08 + Math.sin(t * 11) * 0.05;
        mega.amat.opacity = Math.min(1, envelope * flicker);
        mega.tmat.opacity = Math.min(1, envelope * 0.90 * flicker);
        mega.asprite.position.x += mega.vx * dt;
        mega.asprite.position.y += mega.vy * dt;
        mega.asprite.position.z += mega.vz * dt;
        mega.tail.position.set(
          mega.asprite.position.x - mega.vx * 0.18,
          mega.asprite.position.y - mega.vy * 0.18,
          mega.asprite.position.z - mega.vz * 0.18,
        );
      }
    }
  }
}