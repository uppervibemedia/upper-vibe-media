/**
 * CosmicSkySystem — seamless sphere skybox + shooting stars + asteroids
 *
 * Skybox: SphereGeometry (no box seams/edges ever visible).
 * Shooting stars: every 8-12s, arc naturally across the sky from high overhead
 *   down toward the beach horizon. Visible from anywhere in the world.
 * Asteroids: fireballs with tails, same arc, staggered timing.
 */
import * as THREE from "three";



export function createCosmicSky(scene) {
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
  scene.userData._skyIsMobile = isMobile;

  // ── Galaxy skybox — procedural canvas covering the ENTIRE sphere with no gaps ──
  // We draw a 2048×1024 equirectangular galaxy texture: deep space base, milky-way
  // band, thousands of stars, nebula color clouds — fully fills every pixel so there
  // are never any dark bare spots anywhere on the sphere.
  const skyCanvas = document.createElement("canvas");
  const SKY_W = isMobile ? 1024 : 2048;
  const SKY_H = isMobile ? 512  : 1024;
  skyCanvas.width  = SKY_W;
  skyCanvas.height = SKY_H;
  const skyCtx = skyCanvas.getContext("2d");

  // 1. Deep space base gradient — dark indigo at top, slightly lighter navy near equator
  const bgGrad = skyCtx.createLinearGradient(0, 0, 0, SKY_H);
  bgGrad.addColorStop(0.0,  "#030610"); // zenith — near-black deep space
  bgGrad.addColorStop(0.25, "#060C1E"); // upper sky
  bgGrad.addColorStop(0.5,  "#08122A"); // mid sky
  bgGrad.addColorStop(0.75, "#0B1535"); // lower sky / horizon
  bgGrad.addColorStop(1.0,  "#0E1A40"); // nadir
  skyCtx.fillStyle = bgGrad;
  skyCtx.fillRect(0, 0, SKY_W, SKY_H);

  // 2. Single subtle milky way sweep — one soft diagonal band, very low opacity
  const mwGrad = skyCtx.createLinearGradient(0, SKY_H * 0.2, SKY_W, SKY_H * 0.7);
  mwGrad.addColorStop(0,   "rgba(0,0,0,0)");
  mwGrad.addColorStop(0.3, "rgba(60,40,110,0.07)");
  mwGrad.addColorStop(0.5, "rgba(80,50,130,0.10)");
  mwGrad.addColorStop(0.7, "rgba(60,40,110,0.07)");
  mwGrad.addColorStop(1,   "rgba(0,0,0,0)");
  skyCtx.fillStyle = mwGrad;
  skyCtx.fillRect(0, 0, SKY_W, SKY_H);

  // 4. Stars — thousands of tiny dots at randomised brightness across entire canvas
  const starCount = isMobile ? 1800 : 4000;
  for (let s = 0; s < starCount; s++) {
    const sx = Math.random() * SKY_W;
    const sy = Math.random() * SKY_H;
    const sr = 0.3 + Math.random() * (Math.random() < 0.04 ? 1.4 : 0.5);
    const bright = 0.4 + Math.random() * 0.6;
    // Slightly blue-white tint for most stars, occasional warm/orange star
    const hue = Math.random() < 0.12 ? `rgba(255,210,160,${bright})` : `rgba(${200 + Math.floor(Math.random()*55)},${210 + Math.floor(Math.random()*45)},255,${bright})`;
    skyCtx.beginPath();
    skyCtx.arc(sx, sy, sr, 0, Math.PI * 2);
    skyCtx.fillStyle = hue;
    skyCtx.fill();
  }

  // 5. Bright hero stars — a handful of large prominent stars
  const heroStars = isMobile ? 8 : 18;
  for (let h = 0; h < heroStars; h++) {
    const hx = Math.random() * SKY_W;
    const hy = Math.random() * SKY_H * 0.85; // avoid very bottom
    const hr = 1.2 + Math.random() * 2.0;
    const hg = skyCtx.createRadialGradient(hx, hy, 0, hx, hy, hr * 4);
    hg.addColorStop(0,   "rgba(255,255,255,1)");
    hg.addColorStop(0.2, "rgba(200,230,255,0.5)");
    hg.addColorStop(1,   "rgba(0,0,0,0)");
    skyCtx.fillStyle = hg;
    skyCtx.beginPath();
    skyCtx.arc(hx, hy, hr * 4, 0, Math.PI * 2);
    skyCtx.fill();
  }

  const skyTex = new THREE.CanvasTexture(skyCanvas);
  skyTex.colorSpace = THREE.SRGBColorSpace;
  skyTex.minFilter = THREE.LinearFilter;
  skyTex.magFilter = THREE.LinearFilter;
  skyTex.generateMipmaps = false;
  skyTex.wrapS = THREE.RepeatWrapping;
  skyTex.wrapT = THREE.ClampToEdgeWrapping; // clamp vertical so no seam at poles

  const skySegs = isMobile ? [48, 32] : [64, 48];
  const skybox = new THREE.Mesh(
    new THREE.SphereGeometry(130, skySegs[0], skySegs[1]),
    new THREE.MeshBasicMaterial({ map: skyTex, side: THREE.BackSide, depthWrite: false })
  );
  skybox.name = "skybox";
  skybox.renderOrder = -2;
  skybox.frustumCulled = false;
  scene.add(skybox);
  scene.userData._skyboxRef = skybox;
  scene.userData._zenithCapRef = null; // no cap needed — canvas fills everything

  // ── Single shooting star — one clean streak every 45s ───────────
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
    scene.add(sstar);
    scene.userData.shootingStar = {
      sprite: sstar, mat: smat,
      active: false, life: 0, maxLife: 0,
      vx: 0, vy: 0, vz: 0,
      nextFire: performance.now() * 0.001 + 12 + Math.random() * 8, // first one ~12-20s in
    };
  }

  // Small asteroids disabled — only mega asteroid + single shooting star per timing rules
  const ASTEROID_COUNT = 0;
  const asteroids = [];
  for (let i = 0; i < ASTEROID_COUNT; i++) {
    // Head: bright glowing fireball core
    const ac = document.createElement("canvas");
    ac.width = 96; ac.height = 96;
    const actx = ac.getContext("2d");
    const ag = actx.createRadialGradient(48, 48, 0, 48, 48, 44);
    ag.addColorStop(0,    "rgba(255,255,220,1)");
    ag.addColorStop(0.15, "rgba(255,220,100,1)");
    ag.addColorStop(0.35, "rgba(255,140,30,0.9)");
    ag.addColorStop(0.6,  "rgba(220,60,10,0.5)");
    ag.addColorStop(0.82, "rgba(160,20,0,0.15)");
    ag.addColorStop(1,    "rgba(0,0,0,0)");
    actx.fillStyle = ag;
    actx.fillRect(0, 0, 96, 96);
    const atex = new THREE.CanvasTexture(ac);
    atex.minFilter = THREE.LinearFilter;
    const amat = new THREE.SpriteMaterial({
      map: atex, transparent: true, opacity: 0,
      depthWrite: false, blending: THREE.AdditiveBlending,
    });
    const asprite = new THREE.Sprite(amat);
    asprite.scale.set(2.2, 2.2, 1);
    asprite.renderOrder = 6;
    scene.add(asprite);

    // Core streak — tight bright white-orange center line
    const cc = document.createElement("canvas");
    cc.width = 220; cc.height = 6;
    const cctx = cc.getContext("2d");
    const cg = cctx.createLinearGradient(0, 0, 220, 0);
    cg.addColorStop(0,    "rgba(255,255,255,0)");
    cg.addColorStop(0.3,  "rgba(255,230,160,0.4)");
    cg.addColorStop(0.7,  "rgba(255,200,80,0.85)");
    cg.addColorStop(0.92, "rgba(255,240,180,0.98)");
    cg.addColorStop(1,    "rgba(255,255,255,1)");
    cctx.fillStyle = cg;
    cctx.fillRect(0, 0, 220, 6);
    const ctex = new THREE.CanvasTexture(cc);
    ctex.minFilter = THREE.LinearFilter;
    const cmat = new THREE.SpriteMaterial({
      map: ctex, transparent: true, opacity: 0,
      depthWrite: false, blending: THREE.AdditiveBlending,
    });
    const coreStreak = new THREE.Sprite(cmat);
    coreStreak.scale.set(9, 0.18, 1);
    coreStreak.renderOrder = 5;
    scene.add(coreStreak);

    // Glow halo — wide soft orange-red diffuse bloom behind the head
    const gc = document.createElement("canvas");
    gc.width = 280; gc.height = 28;
    const gctx = gc.getContext("2d");
    const gg = gctx.createLinearGradient(0, 0, 280, 0);
    gg.addColorStop(0,    "rgba(200,40,0,0)");
    gg.addColorStop(0.25, "rgba(230,80,10,0.18)");
    gg.addColorStop(0.6,  "rgba(255,130,30,0.42)");
    gg.addColorStop(0.85, "rgba(255,180,60,0.55)");
    gg.addColorStop(1,    "rgba(255,220,120,0.3)");
    gctx.fillStyle = gg;
    // Soft vertical falloff — bright center row, fading edges
    for (let row = 0; row < 28; row++) {
      const falloff = 1 - Math.abs(row - 14) / 14;
      gctx.globalAlpha = falloff * falloff;
      gctx.fillRect(0, row, 280, 1);
    }
    const gtex = new THREE.CanvasTexture(gc);
    gtex.minFilter = THREE.LinearFilter;
    const gmat = new THREE.SpriteMaterial({
      map: gtex, transparent: true, opacity: 0,
      depthWrite: false, blending: THREE.AdditiveBlending,
    });
    const glowTrail = new THREE.Sprite(gmat);
    glowTrail.scale.set(12, 1.4, 1);
    glowTrail.renderOrder = 4;
    scene.add(glowTrail);

    // Ember sparks — tiny scattered dots trailing behind
    const ec = document.createElement("canvas");
    ec.width = 180; ec.height = 20;
    const ectx = ec.getContext("2d");
    for (let s = 0; s < 18; s++) {
      const ex = Math.random() * 160 + 10;
      const ey = 4 + Math.random() * 12;
      const er = 0.8 + Math.random() * 1.4;
      const eg = ectx.createRadialGradient(ex, ey, 0, ex, ey, er * 2);
      eg.addColorStop(0, `rgba(255,${180 + Math.floor(Math.random()*60)},${Math.floor(Math.random()*80)},0.9)`);
      eg.addColorStop(1, "rgba(0,0,0,0)");
      ectx.fillStyle = eg;
      ectx.beginPath();
      ectx.arc(ex, ey, er * 2, 0, Math.PI * 2);
      ectx.fill();
    }
    const etex = new THREE.CanvasTexture(ec);
    etex.minFilter = THREE.LinearFilter;
    const emat = new THREE.SpriteMaterial({
      map: etex, transparent: true, opacity: 0,
      depthWrite: false, blending: THREE.AdditiveBlending,
    });
    const embers = new THREE.Sprite(emat);
    embers.scale.set(10, 1.0, 1);
    embers.renderOrder = 4;
    scene.add(embers);

    asteroids.push({
      asprite, amat,
      tail: coreStreak, tmat: cmat,
      glowTrail, gmat,
      embers, emat,
      active: false, life: 0, maxLife: 0,
      vx: 0, vy: 0, vz: 0,
      nextFire: performance.now() * 0.001 + 6 + i * 9 + Math.random() * 4,
    });
  }
  scene.userData.asteroids = asteroids;

  // ── MEGA ASTEROID — every 60s desktop, every 120s mobile ────────
  {
  // Head: large glowing fireball
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
  scene.add(masprite);

  // Tail: long glowing streak with soft vertical falloff
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
  // Soft vertical glow falloff
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
  scene.add(mtail);

  scene.userData.megaAsteroid = {
    asprite: masprite, amat: mamat,
    tail: mtail, tmat: mtmat,
    active: false, life: 0, maxLife: 0,
    vx: 0, vy: 0, vz: 0,
    nextFire: performance.now() * 0.001 + 20 + Math.random() * 10, // first one ~20-30s in
    interval: 120, // exactly 2 minutes
  };
  }

  // No separate nebula panels — the canvas skybox handles the full sky.

  // ── Two drifting horizon planets — east and west ends of the sky ──
  // Each is a canvas-drawn planet disc with a soft atmospheric glow halo.
  // They sit just above the beach horizon line (Y≈8, Z=+35) and drift
  // very slowly east↔west so they're always visible from the beach.
  // 5 planets evenly spaced 72° apart (2π/5 ≈ 1.257 rad) so there's always
  // at least one near the beach horizon (angle ≈ 0 = south/+Z) at any time.
  const STEP = (Math.PI * 2) / 5;
  const PLANET_DEFS = [
    // MEGA — purple gas giant
    {
      id: "mega",
      bodyColors: ["#1A0A2A", "#3A1A5A", "#6A2A9A", "#9A4ACA", "#CC88FF"],
      glowColor:  "rgba(160,80,255,0.28)",
      ringColor:  "rgba(200,140,255,0.45)",
      size: isMobile ? 27.5 : 37.5,
      angleOffset: 0,
      horizonY: 14,
      radius: 60,
      setsBelow: false,
    },
    // Blue gas giant
    {
      id: "west",
      bodyColors: ["#0A2A4A", "#1A4A7A", "#2A6AA0", "#4A8AC0", "#7ABAEE"],
      glowColor:  "rgba(80,180,255,0.18)",
      ringColor:  "rgba(120,200,255,0.35)",
      size: isMobile ? 20.0 : 26.0,
      angleOffset: STEP * 1,
      horizonY: 10,
      radius: 60,
      setsBelow: false,
    },
    // Amber planet
    {
      id: "east",
      bodyColors: ["#2A1A0A", "#5A3A1A", "#8A5A2A", "#C07840", "#E8B060"],
      glowColor:  "rgba(220,140,60,0.18)",
      ringColor:  "rgba(200,160,80,0.30)",
      size: isMobile ? 17.0 : 22.0,
      angleOffset: STEP * 2,
      horizonY: 16,
      radius: 60,
      setsBelow: false,
    },
    // Emerald green
    {
      id: "green",
      bodyColors: ["#041A0A", "#0A3A18", "#185A28", "#28884A", "#50CC80"],
      glowColor:  "rgba(60,200,100,0.16)",
      ringColor:  "rgba(80,220,120,0.30)",
      size: isMobile ? 14.0 : 18.0,
      angleOffset: STEP * 3,
      horizonY: 11,
      radius: 60,
      setsBelow: false,
    },
    // Crimson
    {
      id: "crimson",
      bodyColors: ["#2A0404", "#5A0A0A", "#8A1818", "#C03030", "#E86060"],
      glowColor:  "rgba(220,60,60,0.20)",
      ringColor:  "rgba(200,80,80,0.30)",
      size: isMobile ? 22.0 : 30.0,
      angleOffset: STEP * 4,
      horizonY: 8,
      radius: 60,
      setsBelow: false,
    },
  ];

  // Seeded pseudo-random per planet for consistent texture
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
    const R = S * 0.30; // planet radius in pixels
    const cx = S / 2, cy = S / 2;

    // Atmospheric glow halo (drawn first, behind planet)
    const haloG = pctx.createRadialGradient(cx, cy, R * 0.92, cx, cy, R * 1.65);
    haloG.addColorStop(0, def.glowColor);
    haloG.addColorStop(1, "rgba(0,0,0,0)");
    pctx.fillStyle = haloG;
    pctx.fillRect(0, 0, S, S);

    // Planet body — layered radial gradient for depth
    const bodyG = pctx.createRadialGradient(cx - R*0.28, cy - R*0.26, R*0.04, cx, cy, R);
    bodyG.addColorStop(0,   def.bodyColors[4]);
    bodyG.addColorStop(0.25,def.bodyColors[3]);
    bodyG.addColorStop(0.55,def.bodyColors[2]);
    bodyG.addColorStop(0.78,def.bodyColors[1]);
    bodyG.addColorStop(1,   def.bodyColors[0]);
    pctx.beginPath();
    pctx.arc(cx, cy, R, 0, Math.PI * 2);
    pctx.fillStyle = bodyG;
    pctx.fill();

    // ── Per-planet surface texture ──────────────────────────────────
    pctx.save();
    pctx.beginPath();
    pctx.arc(cx, cy, R, 0, Math.PI * 2);
    pctx.clip();

    if (def.id === "mega") {
      // Purple gas giant — thick swirling storm bands + great spot
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
      // Great storm oval
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
      // Blue gas giant — horizontal jet-stream bands with subtle turbulence
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
      // Polar ice cap glow
      const iceG = pctx.createRadialGradient(cx, cy - R * 0.8, 0, cx, cy - R * 0.8, R * 0.4);
      iceG.addColorStop(0, "rgba(200,240,255,0.22)");
      iceG.addColorStop(1, "rgba(0,0,0,0)");
      pctx.fillStyle = iceG;
      pctx.fillRect(cx - R, cy - R, R * 2, R);

    } else if (def.id === "east") {
      // Amber — rocky desert world: irregular terrain patches + dust storms
      for (let p = 0; p < 14; p++) {
        const px = cx + (rng() - 0.5) * R * 1.7;
        const py = cy + (rng() - 0.5) * R * 1.7;
        const pr = R * (0.06 + rng() * 0.18);
        const pG = pctx.createRadialGradient(px, py, 0, px, py, pr);
        const alpha = 0.06 + rng() * 0.11;
        pG.addColorStop(0, `rgba(${180 + Math.floor(rng()*60)},${100 + Math.floor(rng()*60)},${20 + Math.floor(rng()*40)},${alpha})`);
        pG.addColorStop(1, "rgba(0,0,0,0)");
        pctx.fillStyle = pG;
        pctx.fillRect(px - pr, py - pr, pr * 2, pr * 2);
      }
      // Subtle craters — only on rocky planets
      for (let cr = 0; cr < 5; cr++) {
        const crx = cx + (rng() - 0.5) * R * 1.4;
        const cry = cy + (rng() - 0.5) * R * 1.4;
        const crr = R * (0.04 + rng() * 0.09);
        pctx.beginPath();
        pctx.arc(crx, cry, crr, 0, Math.PI * 2);
        pctx.strokeStyle = `rgba(80,40,10,${0.12 + rng() * 0.10})`;
        pctx.lineWidth = 1.5;
        pctx.stroke();
        const crG = pctx.createRadialGradient(crx - crr*0.25, cry - crr*0.25, 0, crx, cry, crr);
        crG.addColorStop(0, `rgba(255,200,120,0.08)`);
        crG.addColorStop(0.5, `rgba(100,50,10,0.10)`);
        crG.addColorStop(1, "rgba(0,0,0,0)");
        pctx.fillStyle = crG;
        pctx.fill();
      }

    } else if (def.id === "green") {
      // Emerald — jungle/ocean world: continent blobs + cloud wisps
      for (let p = 0; p < 8; p++) {
        const px = cx + (rng() - 0.5) * R * 1.4;
        const py = cy + (rng() - 0.5) * R * 1.4;
        const pr = R * (0.10 + rng() * 0.22);
        const pG = pctx.createRadialGradient(px, py, 0, px, py, pr);
        pG.addColorStop(0, `rgba(${20 + Math.floor(rng()*40)},${160 + Math.floor(rng()*60)},${40 + Math.floor(rng()*40)},${0.14 + rng()*0.10})`);
        pG.addColorStop(1, "rgba(0,0,0,0)");
        pctx.fillStyle = pG;
        pctx.fillRect(px - pr, py - pr, pr * 2, pr * 2);
      }
      // Cloud wisps
      for (let cl = 0; cl < 5; cl++) {
        const clx = cx + (rng() - 0.5) * R * 1.6;
        const cly = cy + (rng() - 0.5) * R * 1.6;
        const clw = R * (0.12 + rng() * 0.16);
        const clG = pctx.createRadialGradient(clx, cly, 0, clx, cly, clw);
        clG.addColorStop(0, `rgba(200,255,220,${0.08 + rng()*0.08})`);
        clG.addColorStop(1, "rgba(0,0,0,0)");
        pctx.fillStyle = clG;
        pctx.fillRect(clx - clw, cly - clw * 0.4, clw * 2, clw * 0.8);
      }

    } else if (def.id === "crimson") {
      // Crimson — volcanic world: lava cracks + hotspot glows + craters
      for (let b = 0; b < 7; b++) {
        const by = cy - R + (b / 6) * R * 2;
        const bw = R * (0.03 + rng() * 0.06);
        const alpha = 0.08 + rng() * 0.12;
        pctx.fillStyle = `rgba(255,${60 + Math.floor(rng()*60)},0,${alpha})`;
        pctx.fillRect(cx - R, by - bw, R * 2, bw * 2);
      }
      // Lava hotspots
      for (let h = 0; h < 6; h++) {
        const hx = cx + (rng() - 0.5) * R * 1.5;
        const hy = cy + (rng() - 0.5) * R * 1.5;
        const hr = R * (0.04 + rng() * 0.10);
        const hG = pctx.createRadialGradient(hx, hy, 0, hx, hy, hr);
        hG.addColorStop(0, `rgba(255,${120 + Math.floor(rng()*100)},0,${0.18 + rng()*0.14})`);
        hG.addColorStop(1, "rgba(0,0,0,0)");
        pctx.fillStyle = hG;
        pctx.arc(hx, hy, hr, 0, Math.PI * 2);
        pctx.fill();
      }
      // Dark craters
      for (let cr = 0; cr < 4; cr++) {
        const crx = cx + (rng() - 0.5) * R * 1.3;
        const cry = cy + (rng() - 0.5) * R * 1.3;
        const crr = R * (0.05 + rng() * 0.10);
        pctx.beginPath();
        pctx.arc(crx, cry, crr, 0, Math.PI * 2);
        pctx.strokeStyle = `rgba(20,0,0,${0.18 + rng() * 0.14})`;
        pctx.lineWidth = 2;
        pctx.stroke();
        const crG = pctx.createRadialGradient(crx, cry, 0, crx, cry, crr);
        crG.addColorStop(0, "rgba(10,0,0,0.18)");
        crG.addColorStop(1, "rgba(0,0,0,0)");
        pctx.fillStyle = crG;
        pctx.fill();
      }
    }

    pctx.restore();

    // ── Terminator shadow (dark side) — consistent light from upper-left ──
    pctx.save();
    pctx.beginPath();
    pctx.arc(cx, cy, R, 0, Math.PI * 2);
    pctx.clip();
    const shadowG = pctx.createRadialGradient(cx + R * 0.45, cy + R * 0.45, R * 0.05, cx + R * 0.65, cy + R * 0.65, R * 1.1);
    shadowG.addColorStop(0, "rgba(0,0,0,0)");
    shadowG.addColorStop(0.55, "rgba(0,0,0,0.18)");
    shadowG.addColorStop(1, "rgba(0,0,0,0.62)");
    pctx.fillStyle = shadowG;
    pctx.fillRect(cx - R, cy - R, R * 2, R * 2);
    pctx.restore();

    // ── Specular highlight (light glint upper-left) ──
    pctx.save();
    pctx.beginPath();
    pctx.arc(cx, cy, R, 0, Math.PI * 2);
    pctx.clip();
    const specG = pctx.createRadialGradient(cx - R * 0.38, cy - R * 0.34, 0, cx - R * 0.38, cy - R * 0.34, R * 0.45);
    specG.addColorStop(0, "rgba(255,255,255,0.18)");
    specG.addColorStop(1, "rgba(0,0,0,0)");
    pctx.fillStyle = specG;
    pctx.fillRect(cx - R, cy - R, R * 2, R * 2);
    pctx.restore();

    // ── Atmospheric horizon haze — fades the bottom of the planet into the sky ──
    // Simulates atmospheric scattering so the planet dissolves into the horizon
    // rather than having a hard edge where it meets the water.
    pctx.save();
    pctx.beginPath();
    pctx.arc(cx, cy, R * 1.05, 0, Math.PI * 2);
    pctx.clip();
    const hazeG = pctx.createLinearGradient(0, cy, 0, cy + R * 1.1);
    hazeG.addColorStop(0,   "rgba(0,0,0,0)");
    hazeG.addColorStop(0.5, def.glowColor.replace(/[\d.]+\)$/, "0.12)"));
    hazeG.addColorStop(1,   def.glowColor.replace(/[\d.]+\)$/, "0.55)"));
    pctx.fillStyle = hazeG;
    pctx.fillRect(0, cy, S, S);
    pctx.restore();

    // Ring (elliptical, angled) — only on purple mega planet
    if (def.id === "mega") {
      pctx.save();
      pctx.translate(cx, cy);
      pctx.scale(1, 0.28);
      pctx.beginPath();
      pctx.arc(0, 0, R * 1.46, 0, Math.PI * 2);
      pctx.strokeStyle = def.ringColor;
      pctx.lineWidth = S * 0.045;
      pctx.stroke();
      // Second faint ring
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
      map: ptex, transparent: true, opacity: 0.85,
      depthWrite: false,
      depthTest: false,
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
      horizonY: def.horizonY,
      radius: def.radius,
      setsBelow: def.setsBelow,
    };
  });
  scene.userData.horizonPlanets = planets;

  // No fog — keeps beach and ocean fully visible with no dark dome/wall artifact.
}

// ── Helper: compute a natural arc spawn toward the beach horizon ─────
// Spawns high in the sky above the city center, travels in a shallow arc
// toward the beach (+Z horizon). Always world-space — not camera-relative.
function spawnArcParams(fast) {
  // Start: high overhead, slightly north of center (city side), spread left/right
  const startX = (Math.random() - 0.5) * 40;   // ±20 world units wide
  const startY = 22 + Math.random() * 10;        // 22–32 units high in sky
  const startZ = -10 + (Math.random() - 0.5) * 14; // z=-17 to z=-3 (city/stage area overhead)

  // End: near beach horizon level, toward +Z
  const endX = startX + (Math.random() - 0.5) * 20;
  const endY = 4 + Math.random() * 5;            // land near horizon height
  const endZ = 28 + Math.random() * 16;          // beach/ocean area (+Z)

  const life = fast
    ? 0.7 + Math.random() * 0.4   // shooting star: quick
    : 1.6 + Math.random() * 0.8;  // asteroid: slower burn

  const vx = (endX - startX) / life;
  const vy = (endY - startY) / life;
  const vz = (endZ - startZ) / life;

  // Sprite rotation: align with direction of travel (XZ plane angle, tilted by vy)
  const hSpeed = Math.sqrt(vx * vx + vz * vz);
  const rotation = Math.atan2(vy, hSpeed); // negative = falling toward horizon

  return { startX, startY, startZ, vx, vy, vz, life, rotation };
}

export function animateCosmicSky(scene, camera, t, dt) {
  const isMobile = scene.userData._skyIsMobile;

  // ── Skybox + zenith cap follow camera — use cached refs, not getObjectByName ──
  const skybox = scene.userData._skyboxRef;
  if (skybox) {
    skybox.position.copy(camera.position);
    skybox.rotation.y += dt * 0.04;
  }
  // (zenith cap removed — galaxy canvas fills entire sphere)

  // ── Planet images — throttled position/opacity updates on mobile ──
  if (!scene.userData._skyFrame) scene.userData._skyFrame = 0;
  scene.userData._skyFrame++;
  const skyFrame = scene.userData._skyFrame;
  const updateSlow = !isMobile || skyFrame % 3 === 0;
  // Mobile: skip asteroid + mega asteroid animation entirely every 3 frames
  const updateAsteroids = !isMobile || skyFrame % 3 === 0;



  // ── Horizon planets — full orbital arc: high over north (behind city), below horizon on south (beach side) ──
  // cosA: -1 = north (high in sky), 0 = east/west (at horizonY), +1 = south/beach (below ground)
  const horizonPlanets = scene.userData.horizonPlanets;
  if (horizonPlanets && skybox) {
    const skyAngle = skybox.rotation.y;
    for (const p of horizonPlanets) {
      const angle = skyAngle + p.angleOffset;
      const cosA = Math.cos(angle); // -1=north, +1=south/beach

      // North side: all planets lift high into sky.
      // South/beach side: only large planets (setsBelow) sink behind the ocean.
      // They stay on the horizon through the first half of the beach, then drop
      // well below ground so they look like they're setting behind the water.
      const northLift = Math.max(0, -cosA);
      const southDip = p.setsBelow ? Math.max(0, cosA - 0.5) * 2 : 0; // 0→1 only past beach midpoint
      const arcY = p.horizonY + northLift * 32 - southDip * 18; // partial set — bottom half hides behind horizon

      const cx = camera.position.x + Math.sin(angle) * p.radius;
      const cz = camera.position.z + cosA * p.radius;
      p.sprite.position.set(cx, arcY + Math.sin(t * 0.04 + p.angleOffset) * 0.6, cz);
      p.mat.opacity = 0.88 + Math.sin(t * 0.06 + p.angleOffset) * 0.06;
    }
  }

  // ── Star twinkling — throttled on mobile ────────────────────────
  const starsMesh = scene.userData.stars;
  if (starsMesh?.material && updateSlow) {
    starsMesh.material.opacity = 0.42 + Math.sin(t * 0.85) * 0.08 + Math.cos(t * 0.55) * 0.06;
    if (!isMobile) starsMesh.material.size = 0.30 + Math.sin(t * 1.1) * 0.05;
  }

  // ── Single Shooting Star — one clean streak every 45s ───────────
  const sstar = scene.userData.shootingStar;
  if (sstar && updateSlow) {
    if (!sstar.active) {
      if (t >= sstar.nextFire) {
        const p = spawnArcParams(true); // fast = shooting star speed
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
        sstar.nextFire = t + 45; // exactly 45 seconds until next one
      } else {
        const prog = sstar.life / sstar.maxLife;
        const envelope = Math.sin(Math.PI * (1 - prog));
        sstar.mat.opacity = Math.min(1, envelope * 0.92);
        sstar.sprite.position.x += sstar.vx * dt;
        sstar.sprite.position.y += sstar.vy * dt;
        sstar.sprite.position.z += sstar.vz * dt;
      }
    }
  }

  // ── Mega Asteroid — throttled on mobile ──────────────────────────
  if (!updateAsteroids) return;
  const mega = scene.userData.megaAsteroid;
  if (mega) {
    if (!mega.active) {
      if (t >= mega.nextFire) {
        // Spawn high on the west side of the sky, arc slowly east across the beach horizon
        const fromLeft = Math.random() < 0.5;
        mega.asprite.position.set(fromLeft ? -55 : 55, 18 + Math.random() * 6, 10 + Math.random() * 10);
        mega.vx = (fromLeft ? 1 : -1) * (5 + Math.random() * 3);  // slow horizontal pass
        mega.vy = -(1.5 + Math.random() * 1.0);                    // gentle downward arc
        mega.vz = 2 + Math.random() * 2;                           // drifts slightly toward beach
        mega.maxLife = 7 + Math.random() * 3;                      // 7–10s visible pass
        mega.life = mega.maxLife;
        mega.active = true;
        mega.amat.opacity = 0;
        mega.tmat.opacity = 0;
        const hSpd = Math.sqrt(mega.vx * mega.vx + mega.vz * mega.vz);
        const rot = Math.atan2(mega.vy, hSpd);
        mega.asprite.material.rotation = rot;
        mega.tail.material.rotation    = rot;
      }
    } else {
      mega.life -= dt;
      if (mega.life <= 0) {
        mega.active = false;
        mega.amat.opacity = 0;
        mega.tmat.opacity = 0;
        mega.nextFire = t + (mega.interval || 60) + Math.random() * 10;
      } else {
        const prog = mega.life / mega.maxLife;
        const envelope = Math.min(prog * 5, 1) * Math.min((1 - prog) * 5, 1);
        const megaFlicker = 1.0 + Math.sin(t * 28) * 0.08 + Math.sin(t * 11) * 0.05;
        mega.amat.opacity = Math.min(1, envelope * 1.0 * megaFlicker);
        mega.tmat.opacity = Math.min(1, envelope * 0.90 * megaFlicker);
        mega.asprite.position.x += mega.vx * dt;
        mega.asprite.position.y += mega.vy * dt;
        mega.asprite.position.z += mega.vz * dt;
        // Tail slightly behind head
        mega.tail.position.set(
          mega.asprite.position.x - mega.vx * 0.18,
          mega.asprite.position.y - mega.vy * 0.18,
          mega.asprite.position.z - mega.vz * 0.18,
        );
      }
    }
  }

  // ── Small Asteroids — multi-layer burning trail ───────────────────
  const asteroids = scene.userData.asteroids;
  if (asteroids) {
    for (const ast of asteroids) {
      if (!ast.active) {
        if (t >= ast.nextFire) {
          const p = spawnArcParams(false);
          ast.asprite.position.set(p.startX, p.startY, p.startZ);
          ast.tail.position.set(p.startX, p.startY, p.startZ);
          if (ast.glowTrail) ast.glowTrail.position.set(p.startX, p.startY, p.startZ);
          if (ast.embers)    ast.embers.position.set(p.startX, p.startY, p.startZ);
          ast.vx = p.vx; ast.vy = p.vy; ast.vz = p.vz;
          ast.maxLife = p.life; ast.life = p.life;
          ast.active = true;
          ast.amat.opacity = 0;
          ast.tmat.opacity = 0;
          if (ast.gmat) ast.gmat.opacity = 0;
          if (ast.emat) ast.emat.opacity = 0;
          ast.asprite.material.rotation = p.rotation;
          ast.tail.material.rotation    = p.rotation;
          if (ast.glowTrail) ast.glowTrail.material.rotation = p.rotation;
          if (ast.embers)    ast.embers.material.rotation    = p.rotation;
        }
      } else {
        ast.life -= dt;
        if (ast.life <= 0) {
          ast.active = false;
          ast.amat.opacity = 0;
          ast.tmat.opacity = 0;
          if (ast.gmat) ast.gmat.opacity = 0;
          if (ast.emat) ast.emat.opacity = 0;
          ast.nextFire = t + 9 + Math.random() * 6;
        } else {
          const prog = ast.life / ast.maxLife;
          // Bell envelope — full brightness through the middle, fades in/out
          const envelope = Math.sin(Math.PI * (1 - prog));
          // Flicker: high-freq shimmer makes it look like it's burning
          const flicker = 1.0 + Math.sin(t * 38 + ast.vx * 10) * 0.12 + Math.sin(t * 17) * 0.07;

          ast.amat.opacity  = Math.min(1, envelope * 1.0  * flicker);
          ast.tmat.opacity  = Math.min(1, envelope * 0.95 * flicker); // core streak
          if (ast.gmat) ast.gmat.opacity = Math.min(1, envelope * 0.75);  // glow — no flicker, soft
          if (ast.emat) ast.emat.opacity = Math.min(1, envelope * 0.65 * flicker); // embers flicker

          ast.asprite.position.x += ast.vx * dt;
          ast.asprite.position.y += ast.vy * dt;
          ast.asprite.position.z += ast.vz * dt;

          // Core streak — tight, just behind the head
          const coreOff = 0.14;
          ast.tail.position.set(
            ast.asprite.position.x - ast.vx * coreOff,
            ast.asprite.position.y - ast.vy * coreOff,
            ast.asprite.position.z - ast.vz * coreOff,
          );
          // Glow halo — slightly further behind, wider spread
          if (ast.glowTrail) {
            ast.glowTrail.position.set(
              ast.asprite.position.x - ast.vx * 0.28,
              ast.asprite.position.y - ast.vy * 0.28,
              ast.asprite.position.z - ast.vz * 0.28,
            );
          }
          // Ember sparks — furthest behind, scattered
          if (ast.embers) {
            ast.embers.position.set(
              ast.asprite.position.x - ast.vx * 0.45,
              ast.asprite.position.y - ast.vy * 0.45,
              ast.asprite.position.z - ast.vz * 0.45,
            );
          }
        }
      }
    }
  }
}