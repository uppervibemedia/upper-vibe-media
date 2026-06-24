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

  // Baked canvas stars — larger dots so they're actually visible on the sphere
  const canvasStarCount = isMobile ? 600 : 1400;
  const seededStar = (() => { let s = 99; return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; }; })();
  for (let i = 0; i < canvasStarCount; i++) {
    const sx = seededStar() * SKY_W;
    const sy = seededStar() * SKY_H;
    // 50% smaller radius — subtler, cleaner sky
    const sr = 0.6 + seededStar() * (seededStar() < 0.08 ? 1.5 : 0.6);
    const bright = SKY_DEBUG ? 1.0 : (0.55 + seededStar() * 0.45);
    const warm = seededStar() < 0.12;
    const col = warm
      ? `rgba(255,215,170,${bright.toFixed(2)})`
      : `rgba(${195 + Math.floor(seededStar() * 60)},${210 + Math.floor(seededStar() * 45)},255,${bright.toFixed(2)})`;
    skyCtx.beginPath();
    skyCtx.arc(sx, sy, sr, 0, Math.PI * 2);
    skyCtx.fillStyle = col;
    skyCtx.fill();
  }

  // Hero stars — bright glowing prominent stars
  const heroStarCount = isMobile ? 15 : 35;
  const seededHero = (() => { let s = 77; return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; }; })();
  for (let h = 0; h < heroStarCount; h++) {
    const hx = seededHero() * SKY_W;
    const hy = seededHero() * SKY_H * 0.80;
    const hr = 2.0 + seededHero() * 3.0;
    const hg = skyCtx.createRadialGradient(hx, hy, 0, hx, hy, hr * 3.0);
    hg.addColorStop(0,    "rgba(255,255,255,1)");
    hg.addColorStop(0.15, "rgba(220,235,255,0.85)");
    hg.addColorStop(0.4,  "rgba(180,210,255,0.35)");
    hg.addColorStop(1,    "rgba(0,0,0,0)");
    skyCtx.fillStyle = hg;
    skyCtx.beginPath();
    skyCtx.arc(hx, hy, hr * 3.0, 0, Math.PI * 2);
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

  // ── 5. SAFE SKY PLANET SYSTEM ─────────────────────────────────────────────────
  //
  // DESIGN RULES:
  //   • All planets are CAMERA-RELATIVE sky sprites — they live in the SKY DOME,
  //     not in world space. They cannot be inside the playable area.
  //   • horizonY: camera-relative Y offset. Values 28–60 put them well above the
  //     skyline (building tops ~8u). They are NEVER at eye level.
  //   • radius: camera-relative radial orbit distance (80–110). Large radius = far,
  //     small apparent size. The far clip plane is typically 800u so these are safe.
  //   • size: sprite scale in world units. Kept small (16–30) so they read as
  //     distant moons, not giant balloons.
  //   • CENTER SAFE ZONE: all paths use angleOffset/radius such that no planet ever
  //     orbits directly in front of the camera (angle ≈ 0). Offsets are biased to
  //     quadrants, never directly behind the avatar view direction.
  //   • BEACH GATE: beach flyby planets only activate when camera.position.z > 8.
  //   • BUILDING SAFE: horizonY ≥ 28 keeps all planets above the tallest building (~12u).

  const PLANET_DEFS = [
    {
      // MEGA — large purple ringed planet. Far upper-left sky quadrant.
      id: "mega",
      bodyColors: ["#1A0A2A", "#3A1A5A", "#6A2A9A", "#9A4ACA", "#CC88FF"],
      glowColor: "rgba(160,80,255,0.55)", ringColor: "rgba(200,140,255,0.65)",
      size: isMobile ? 18 : 26,          // small — distant moon feel
      angleOffset: Math.PI * 0.75,       // left-back quadrant
      horizonY: 42,                      // high above buildings
      radius: 95,                        // very far back
      orbitSpeed: (Math.PI * 2) / 240,   // ultra-slow — barely drifts
    },
    {
      // BLUE — gas giant. Right-back quadrant.
      id: "west",
      bodyColors: ["#0A2A4A", "#1A4A7A", "#2A6AA0", "#4A8AC0", "#7ABAEE"],
      glowColor: "rgba(80,180,255,0.45)", ringColor: "rgba(120,200,255,0.55)",
      size: isMobile ? 14 : 20,
      angleOffset: Math.PI * 0.25,       // right-back quadrant
      horizonY: 36,                      // slightly lower — visible from city looking up
      radius: 105,                       // farthest
      orbitSpeed: (Math.PI * 2) / 300,   // very slow
    },
    {
      // GREEN — emerald planet. Far left, mid-high.
      id: "green",
      bodyColors: ["#041A0A", "#0A3A18", "#185A28", "#28884A", "#50CC80"],
      glowColor: "rgba(60,200,100,0.42)", ringColor: "rgba(80,220,120,0.55)",
      size: isMobile ? 12 : 18,
      angleOffset: Math.PI * 1.60,       // back-left quadrant
      horizonY: 32,
      radius: 100,
      orbitSpeed: (Math.PI * 2) / 270,
    },
    {
      // CRIMSON — red storm planet. Back-right, highest.
      id: "crimson",
      bodyColors: ["#2A0404", "#5A0A0A", "#8A1818", "#C03030", "#E86060"],
      glowColor: "rgba(220,60,60,0.48)", ringColor: "rgba(200,80,80,0.55)",
      size: isMobile ? 16 : 22,
      angleOffset: Math.PI * 1.25,       // back-right quadrant
      horizonY: 48,                      // highest — deep upper sky
      radius: 90,
      orbitSpeed: (Math.PI * 2) / 320,
    },
    // ── 4 NEW PLANETS (same system, extended) ───────────────────────────────────
    {
      // HIGH-1 — LARGE RINGED PURPLE — FAR RIGHT end of world, very high in sky
      id: "ice",
      bodyColors: ["#1A0A2A", "#3A1A5A", "#6A2A9A", "#9A4ACA", "#CC88FF"],
      glowColor: "rgba(160,80,255,0.60)", ringColor: "rgba(200,140,255,0.70)",
      size: isMobile ? 38 : 58,          // very large — prominent sky feature
      angleOffset: Math.PI * 0.45,       // right end of world
      horizonY: 68,                      // very high — deep upper sky, never near buildings
      radius: 95,
      orbitSpeed: (Math.PI * 2) / 280,
    },
    {
      // HIGH-2 — golden nebula, upper-left back, very high
      id: "gold",
      bodyColors: ["#1A1000", "#382000", "#704010", "#B07020", "#E0C060"],
      glowColor: "rgba(220,180,60,0.40)",
      size: isMobile ? 11 : 17,
      angleOffset: Math.PI * 1.45,       // upper-left back quadrant
      horizonY: 55,                      // second highest
      radius: 108,                       // farthest of all — tiny and distant
      orbitSpeed: (Math.PI * 2) / 350,
    },
    {
      // MID-HIGH-1 — violet storm, right-mid sky
      id: "violet",
      bodyColors: ["#150A28", "#2A1450", "#4A2488", "#7A44C0", "#B080F0"],
      glowColor: "rgba(150,100,255,0.44)",
      size: isMobile ? 13 : 18,
      angleOffset: Math.PI * 0.10,       // near-right, mid quadrant
      horizonY: 38,
      radius: 100,
      orbitSpeed: (Math.PI * 2) / 260,
    },
    {
      // MID-HIGH-2 — LARGE TEAL GAS GIANT — FAR LEFT end of world, very high in sky
      id: "teal",
      bodyColors: ["#021410", "#053028", "#0A5840", "#189060", "#40D098"],
      glowColor: "rgba(50,200,140,0.58)",
      size: isMobile ? 34 : 52,          // very large — prominent sky feature
      angleOffset: Math.PI * 1.75,       // left end of world — opposite of purple ringed
      horizonY: 65,                      // very high — deep upper sky, never near buildings
      radius: 94,
      orbitSpeed: (Math.PI * 2) / 230,
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

    if (def.id === "mega") {
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
    } else if (def.id === "ice") {
      // Ice (now large purple ringed): same band style as mega
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
    } else if (def.id === "teal") {
      // Teal: smooth horizontal bands
      for (let b = 0; b < 6; b++) {
        const by = cy - R + (b / 5) * R * 2;
        const bw = R * (0.04 + rng() * 0.07);
        const alpha = 0.05 + rng() * 0.08;
        const bandG = pctx.createLinearGradient(0, by - bw, 0, by + bw);
        bandG.addColorStop(0, "rgba(0,0,0,0)");
        bandG.addColorStop(0.5, `rgba(${180 + Math.floor(rng()*60)},${220 + Math.floor(rng()*35)},255,${alpha})`);
        bandG.addColorStop(1, "rgba(0,0,0,0)");
        pctx.fillStyle = bandG;
        pctx.fillRect(cx - R, by - bw, R * 2, bw * 2);
      }
    } else if (def.id === "gold") {
      // Gold: swirling blob patches
      for (let p = 0; p < 8; p++) {
        const px2 = cx + (rng() - 0.5) * R * 1.5;
        const py2 = cy + (rng() - 0.5) * R * 1.5;
        const pr = R * (0.08 + rng() * 0.18);
        const pG = pctx.createRadialGradient(px2, py2, 0, px2, py2, pr);
        pG.addColorStop(0, `rgba(255,${200 + Math.floor(rng()*55)},${40 + Math.floor(rng()*40)},${0.08 + rng()*0.10})`);
        pG.addColorStop(1, "rgba(0,0,0,0)");
        pctx.fillStyle = pG;
        pctx.fillRect(px2 - pr, py2 - pr, pr * 2, pr * 2);
      }
    } else if (def.id === "violet") {
      // Violet: bands + storm spot
      for (let b = 0; b < 7; b++) {
        const by = cy - R + (b / 6) * R * 2;
        const bw = R * (0.04 + rng() * 0.08);
        const alpha = 0.06 + rng() * 0.09;
        const bandG = pctx.createLinearGradient(0, by - bw, 0, by + bw);
        bandG.addColorStop(0, "rgba(0,0,0,0)");
        bandG.addColorStop(0.5, `rgba(${160 + Math.floor(rng()*60)},${80 + Math.floor(rng()*40)},255,${alpha})`);
        bandG.addColorStop(1, "rgba(0,0,0,0)");
        pctx.fillStyle = bandG;
        pctx.fillRect(cx - R, by - bw, R * 2, bw * 2);
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

    // Ring for mega planet and ice (large purple ringed) planet
    if (def.id === "mega" || def.id === "ice") {
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

    const pmat = new THREE.SpriteMaterial({
      map: ptex,
      transparent: true,
      opacity: 1.0,
      depthWrite: false,
      depthTest: false,   // always draw — never hidden by depth buffer
      sizeAttenuation: true,
    });
    const psprite = new THREE.Sprite(pmat);
    psprite.scale.set(def.size, def.size, 1);
    psprite.frustumCulled = false;  // never culled by frustum
    psprite.renderOrder = 20;       // above skybox(-10), above starfield(1), above world
    scene.add(psprite);

    if (SKY_DEBUG) {
      console.log(`[SkyDebug] Planet "${def.id}" created — renderOrder:20, frustumCulled:false, depthTest:false`);
    }

    return {
      sprite: psprite,
      mat: pmat,
      angleOffset: def.angleOffset,
      horizonY: def.horizonY,
      radius: def.radius,
      orbitSpeed: def.orbitSpeed,
      id: def.id,
    };
  });
  scene.userData.horizonPlanets = planets;

  // ── 6. BEACH FLYBY PLANETS — A & B ───────────────────────────────────────────
  // NEW SAFE DESIGN:
  //   • Camera-relative positioning, locked at cameraZ - 90 (far behind beach horizon).
  //   • horizonY offset: +18 above camera eye level → always sky, never ground level.
  //   • Lane offsets: ±38 X units to either side — wide enough to clear avatar center.
  //   • Each planet sweeps TOWARD center but stops at ±22 — never crosses avatar column.
  //   • Size: small (20–24 units) so they feel distant, not close-up.
  //   • Hard gate: only active when camera.position.z > 8 (beach zone).
  //   • Every frame gate: if player leaves beach, planet vanishes immediately.

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

    const pmat = new THREE.SpriteMaterial({
      map: ptex, transparent: true, opacity: 0,
      depthWrite: false, depthTest: false,
    });
    const psprite = new THREE.Sprite(pmat);
    psprite.scale.set(size, size, 1);
    psprite.frustumCulled = false;
    psprite.renderOrder = 20;
    scene.add(psprite);
    // Park off-screen initially
    psprite.position.set(9999, 9999, 9999);
    return { sprite: psprite, mat: pmat };
  }

  // Planet A: teal/cyan — 50% bigger than original
  const flybyA = buildFlybyPlanet(
    ["#041820", "#0A3840", "#1A6860", "#2A9888", "#50D8C0"],
    "rgba(50,200,180,0.50)",
    isMobile ? 21 : 30
  );
  // Planet B: amber/orange — 50% bigger than original
  const flybyB = buildFlybyPlanet(
    ["#1A0E02", "#3A2004", "#7A4010", "#C07030", "#E8B060"],
    "rgba(220,140,50,0.48)",
    isMobile ? 18 : 27
  );

  const now0 = performance.now() * 0.001;

  // Beach flyby lanes — IN FRONT of camera (toward the water), opposite directions.
  //   CZ = +55 → in FRONT of the camera, out over the beach/water. Never behind buildings.
  //   CY = +6  → low — just above water level, cinematic beach pass.
  //   Planet A: left-to-right  (-55 → +55)
  //   Planet B: right-to-left  (+55 → -55)
  //   fadeOutStart = 0.82 — fade near the edge so it exits cleanly before going OOB.
  //   Duration 28s — enough time to clearly cross the beach view.
  //   GAP_AFTER 10s — pause then the next one comes the other way.
  const DURATION_A = 28;
  const DURATION_B = 28;
  const GAP_AFTER  = 10;

  scene.userData.beachFlybyA = {
    ...flybyA,
    active: false, life: 0, maxLife: 0,
    // left → right — raised to CY=12 so it clears the avatar at all camera angles
    startCX: -55, startCY: 12, startCZ: 55,
    endCX:    55, endCY:   12, endCZ:  55,
    _fadeInEnd: 0.15, _fadeOutStart: 0.82,
    duration: DURATION_A,
    nextFire: now0 + 5,
    _gapAfter: GAP_AFTER,
    _partner: null,
  };
  scene.userData.beachFlybyB = {
    ...flybyB,
    active: false, life: 0, maxLife: 0,
    // right → left — raised to CY=12 so it clears the avatar at all camera angles
    startCX:  55, startCY: 12, startCZ: 55,
    endCX:   -55, endCY:   12, endCZ:  55,
    _fadeInEnd: 0.15, _fadeOutStart: 0.82,
    duration: DURATION_B,
    nextFire: now0 + DURATION_A + GAP_AFTER + 5,
    _gapAfter: GAP_AFTER,
    _partner: null,
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

  // ── Upper Sky Planets — camera-relative, always inside far clip ──────────────
  // Each planet uses its own orbitSpeed so they drift independently.
  // horizonY is camera-relative so they stay at a fixed apparent sky height
  // regardless of player position or terrain elevation.
  const horizonPlanets = scene.userData.horizonPlanets;
  if (horizonPlanets) {
    // Camera pitch compensation: when player tilts camera up, boost planet Y so they
    // stay visually above the skyline. pitch > 0 = looking up.
    // pitchBoost scales with both pitch angle and orbit radius so all planets lift equally.
    const camPitch = scene.userData._camPitch ?? 0;
    const pitchBoost = Math.max(0, -camPitch) * 80; // negative pitch = looking up → boost planets up

    for (const p of horizonPlanets) {
      const angle = t * p.orbitSpeed + p.angleOffset;

      // Camera-relative position — ALWAYS inside far clip plane.
      const cx = camera.position.x + Math.sin(angle) * p.radius;
      const cz = camera.position.z + Math.cos(angle) * p.radius;

      // Arc boost: when the planet passes through the front-facing angle
      // (i.e. directly in front of the camera where buildings are visible),
      // raise it up so it clears the skyline.
      const frontFactor = Math.max(0, Math.cos(angle));
      const buildingArc = frontFactor * frontFactor * 20;

      const cy = camera.position.y + p.horizonY + buildingArc + pitchBoost + Math.sin(t * 0.025 + p.angleOffset) * 0.8;
      p.sprite.position.set(cx, cy, cz);
      p.mat.opacity = 1.0;
    }

    if (SKY_DEBUG && skyFrame % 120 === 0) {
      const cam = camera;
      console.log("[SkyDebug] Camera position:", cam.position.x.toFixed(1), cam.position.y.toFixed(1), cam.position.z.toFixed(1));
      console.log("[SkyDebug] Camera far:", cam.far);
      for (const p of horizonPlanets) {
        const d = p.sprite.position.distanceTo(cam.position);
        console.log(`[SkyDebug] Planet "${p.id}" world pos:`,
          p.sprite.position.x.toFixed(1), p.sprite.position.y.toFixed(1), p.sprite.position.z.toFixed(1),
          "dist from cam:", d.toFixed(1), "renderOrder:", p.sprite.renderOrder,
          "frustumCulled:", p.sprite.frustumCulled, "opacity:", p.mat.opacity.toFixed(2));
      }
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

  // ── Beach Flyby Planets — alternating A → B → A loop ─────────────────────────
  // Runs EVERY frame (not throttled) so timing is accurate on all devices.
  // Only one planet is active at a time. When one finishes, the other fires after _gapAfter.
  const fba = scene.userData.beachFlybyA;
  const fbb = scene.userData.beachFlybyB;

  function animateFlyby(fb, inBeachZone) {
    if (!fb) return;

    // Hard gate: fade out gracefully if player leaves beach zone
    if (!inBeachZone) {
      if (fb.active) {
        // Initiate a 2s exit fade if not already fading out
        if (!fb._exitFading) {
          fb._exitFading = true;
          fb._exitFadeStart = t;
          fb._exitOpacityFrom = fb.mat.opacity;
        }
        const exitProg = Math.min((t - fb._exitFadeStart) / 2.0, 1);
        fb.mat.opacity = fb._exitOpacityFrom * (1 - exitProg);
        if (exitProg >= 1) {
          fb.active = false;
          fb._exitFading = false;
          fb.life = 0;
          fb.mat.opacity = 0;
          fb.sprite.position.set(9999, 9999, 9999);
          fb.nextFire = t + 5;
        }
      }
      return;
    }
    // Reset exit-fade state when back in beach zone
    if (fb._exitFading) {
      fb._exitFading = false;
    }

    if (!fb.active) {
      if (t >= fb.nextFire) {
        if (fb._partner && fb._partner.active) return;
        fb.active = true;
        fb.life = 0;
        fb.maxLife = fb.duration;
        fb.mat.opacity = 0;
      }
    } else {
      fb.life += dt;
      const prog = Math.min(fb.life / fb.maxLife, 1);

      // Fade envelope
      const fadeInEnd    = fb._fadeInEnd    ?? 0.10;
      const fadeOutStart = fb._fadeOutStart ?? 0.80;
      const fadeIn  = Math.min(prog / fadeInEnd, 1);
      const fadeOut = prog > fadeOutStart ? Math.max(0, 1 - (prog - fadeOutStart) / (1 - fadeOutStart)) : 1;
      fb.mat.opacity = Math.min(fadeIn, fadeOut) * 0.88;

      // Camera-relative positioning
      const ox = fb.startCX + (fb.endCX - fb.startCX) * prog;
      const oy = fb.startCY + (fb.endCY - fb.startCY) * prog;
      const oz = fb.startCZ + (fb.endCZ - fb.startCZ) * prog;

      // Building arc: lift over the skyline when near center X, lower back on beach sides
      const centerProximity = Math.max(0, 1 - Math.abs(ox) / 30);
      const buildingLift = centerProximity * centerProximity * 18; // max +18u at center

      // Pitch compensation: when camera tilts up (negative pitch = looking up),
      // push the planet higher so it stays above the avatar's screen column.
      const camPitch = scene.userData._camPitch ?? 0;
      const pitchLift = Math.max(0, -camPitch) * 60; // negative pitch = looking up → lift planet

      fb.sprite.position.set(
        camera.position.x + ox,
        camera.position.y + oy + buildingLift + pitchLift,
        camera.position.z + oz
      );

      if (prog >= 1) {
        fb.active = false;
        fb.life = 0;
        fb.mat.opacity = 0;
        fb.sprite.position.set(9999, 9999, 9999);
        if (fb._partner) fb._partner.nextFire = t + fb._gapAfter;
        fb.nextFire = t + fb._gapAfter + (fb._partner?.duration ?? 35) + (fb._partner?._gapAfter ?? 15);
      }
    }
  }

  const inBeachZone = camera.position.z > 8;
  animateFlyby(fba, inBeachZone);
  animateFlyby(fbb, inBeachZone);

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