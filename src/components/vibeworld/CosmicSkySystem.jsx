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
    new THREE.SphereGeometry(80, skySegs[0], skySegs[1]),
    new THREE.MeshBasicMaterial({ map: skyTex, side: THREE.BackSide, depthWrite: false })
  );
  skybox.name = "skybox";
  skybox.renderOrder = -1;
  scene.add(skybox);
  scene.userData._skyboxRef = skybox;
  scene.userData._zenithCapRef = null; // no cap needed — canvas fills everything

  // ── Shooting stars — fewer on mobile ────────────────────────────
  const SHOOT_COUNT = isMobile ? 3 : 6;
  const shootingStars = [];
  for (let i = 0; i < SHOOT_COUNT; i++) {
    // Tail streak canvas: bright head fading to transparent tail
    const c = document.createElement("canvas");
    c.width = 200; c.height = 4;
    const ctx = c.getContext("2d");
    const grad = ctx.createLinearGradient(0, 0, 200, 0);
    grad.addColorStop(0,    "rgba(255,255,255,0)");
    grad.addColorStop(0.4,  "rgba(200,230,255,0.5)");
    grad.addColorStop(0.82, "rgba(240,250,255,0.95)");
    grad.addColorStop(1,    "rgba(255,255,255,1)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 200, 4);
    const tex = new THREE.CanvasTexture(c);
    tex.minFilter = THREE.LinearFilter;
    const mat = new THREE.SpriteMaterial({
      map: tex, transparent: true, opacity: 0,
      depthWrite: false, blending: THREE.AdditiveBlending,
    });
    const sprite = new THREE.Sprite(mat);
    sprite.scale.set(9 + Math.random() * 4, 0.25, 1);
    sprite.renderOrder = 4;
    scene.add(sprite);
    // Stagger so no two fire at the same time
    shootingStars.push({
      sprite, mat,
      active: false, life: 0, maxLife: 0,
      vx: 0, vy: 0, vz: 0,
      nextFire: performance.now() * 0.001 + 2 + i * 1.8 + Math.random() * 3,
    });
  }
  scene.userData.shootingStars = shootingStars;

  // ── Small asteroids — reduced on mobile for perf ─────────────────
  const ASTEROID_COUNT = isMobile ? 1 : 3;
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
    nextFire: performance.now() * 0.001 + (isMobile ? 30 : 15),
    interval: isMobile ? 120 : 60,
  };
  }

  // No separate nebula panels — the canvas skybox handles the full sky.

  scene.fog = new THREE.Fog("#101835", 75, 95);
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
    skybox.rotation.y += dt * 0.007;
  }
  // (zenith cap removed — galaxy canvas fills entire sphere)

  // ── Planet images — throttled position/opacity updates on mobile ──
  if (!scene.userData._skyFrame) scene.userData._skyFrame = 0;
  scene.userData._skyFrame++;
  const skyFrame = scene.userData._skyFrame;
  const updateSlow = !isMobile || skyFrame % 3 === 0;



  // ── Star twinkling — throttled on mobile ────────────────────────
  const starsMesh = scene.userData.stars;
  if (starsMesh?.material && updateSlow) {
    starsMesh.material.opacity = 0.42 + Math.sin(t * 0.85) * 0.08 + Math.cos(t * 0.55) * 0.06;
    if (!isMobile) starsMesh.material.size = 0.30 + Math.sin(t * 1.1) * 0.05;
  }

  // ── Shooting stars ───────────────────────────────────────────────
  const shootingStars = scene.userData.shootingStars;
  if (shootingStars) {
    for (const ss of shootingStars) {
      if (!ss.active) {
        if (t >= ss.nextFire) {
          const p = spawnArcParams(true);
          ss.sprite.position.set(p.startX, p.startY, p.startZ);
          ss.vx = p.vx; ss.vy = p.vy; ss.vz = p.vz;
          ss.maxLife = p.life; ss.life = p.life;
          ss.active = true;
          ss.mat.opacity = 0;
          ss.sprite.material.rotation = p.rotation;
        }
      } else {
        ss.life -= dt;
        if (ss.life <= 0) {
          ss.active = false;
          ss.mat.opacity = 0;
          ss.nextFire = t + 8 + Math.random() * 5; // next in 8–13s
        } else {
          const prog = ss.life / ss.maxLife; // 1→0 as it travels
          // Bell envelope: bright through middle, fades at start and end
          ss.mat.opacity = Math.sin(Math.PI * (1 - prog)) * 0.95;
          ss.sprite.position.x += ss.vx * dt;
          ss.sprite.position.y += ss.vy * dt;
          ss.sprite.position.z += ss.vz * dt;
        }
      }
    }
  }

  // ── Mega Asteroid — one huge slow pass over the beach every 60s ──
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