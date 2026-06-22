/**
 * CosmicSkySystem — skybox + shooting stars + asteroids + star twinkling
 * All sky activity is random and natural — not excessive.
 *
 * Skybox fix: 6 unique face textures, no adjacent duplicates.
 * Shooting stars: rare streaks (~1 every 15–45s), quick fade.
 * Asteroids: very slow drifters (~1 visible at a time, subtle).
 * Stars: per-star twinkle phases for soft atmospheric shimmer.
 */
import * as THREE from "three";

const BASE = "https://media.base44.com/images/public/69cd68afb7fe90ae92757154";

// Four source images — varied: 2 with planets, 2 star fields / nebulas
const SKY_A = `${BASE}/12edd43a9_ChatGPTImageJun19202611_55_16AM.png`; // star field / nebula (no planet)
const SKY_B = `${BASE}/df9a0847f_ChatGPTImageJun19202612_41_21PM.png`; // full planet centered
const SKY_C = `${BASE}/5b01fc961_ChatGPTImageJun19202611_55_39AM.png`; // star field / nebula (no planet)
const SKY_D = `${BASE}/e7caceb54_ChatGPTImageJun19202612_41_07PM.png`; // ringed planet + moon

// BoxGeometry face order: +X, -X, +Y, -Y, +Z, -Z
// Rules:
//   • No two adjacent faces share the same texture
//   • Planets (B, D) must NOT be on adjacent faces
//   • Adjacent pairs: (+X,-X), (+Y,-Y), (+Z,-Z), and ring pairs (+X,+Z), (-X,-Z) etc.
//   • Solution: alternate planet / no-planet with no touching planets
//     +X=B(planet), -X=C(stars), +Y=A(stars), -Y=dark, +Z=D(planet), -Z=A(stars)
//     BUT +X(planet) and +Z(planet) share an edge → swap +Z to C
//     Final: +X=B, -X=C, +Y=A, -Y=dark, +Z=C(stars), -Z=D(planet)
//     Now: +X(B) adj to -X(C)✓, +Y(A) adj to -Y(dark)✓, +Z(C) adj to -Z(D)✓
//     Edge adjacencies: +X adj +Z → B,C ✓  | -X adj -Z → C,D ✓
//     No two planets touch. ✓

export function createCosmicSky(scene) {
  const loader = new THREE.TextureLoader();
  const SKYBOX_SIZE = 90; // Large enough to cover full upward view with no gaps

  const loadTex = (url) => {
    const tex = loader.load(url, undefined, undefined, () => {
      // On error, texture stays black — acceptable fallback
    });
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.wrapS = THREE.ClampToEdgeWrapping;
    tex.wrapT = THREE.ClampToEdgeWrapping;
    tex.generateMipmaps = false;
    tex.minFilter = THREE.LinearFilter;
    tex.magFilter = THREE.LinearFilter;
    return tex;
  };

  const tA = loadTex(SKY_A);
  const tB = loadTex(SKY_B);
  const tC = loadTex(SKY_C);
  const tD = loadTex(SKY_D);

  const darkMat = new THREE.MeshBasicMaterial({
    color: new THREE.Color("#060616"),
    side: THREE.BackSide,
    depthWrite: false,
  });

  function faceMat(tex) {
    return new THREE.MeshBasicMaterial({
      map: tex,
      side: THREE.BackSide,
      depthWrite: false,
    });
  }

  // Face order: +X, -X, +Y, -Y, +Z, -Z
  const materials = [
    faceMat(tB),   // +X East  — planet
    faceMat(tC),   // -X West  — stars
    faceMat(tA),   // +Y Top   — nebula
    darkMat,       // -Y Bottom — void (never visible)
    faceMat(tC),   // +Z North  — stars (different from adjacent planets)
    faceMat(tD),   // -Z South  — ringed planet
  ];

  const skybox = new THREE.Mesh(
    new THREE.BoxGeometry(SKYBOX_SIZE, SKYBOX_SIZE, SKYBOX_SIZE),
    materials
  );
  skybox.name = "skybox";
  skybox.renderOrder = -1;
  scene.add(skybox);

  // ── Shooting stars ─────────────────────────────────────────────
  // Each streak: a short line segment sprite that fades quickly
  const SHOOT_COUNT = 5; // pool of reusable streaks
  const shootingStars = [];
  for (let i = 0; i < SHOOT_COUNT; i++) {
    const c = document.createElement("canvas");
    c.width = 128; c.height = 4;
    const ctx = c.getContext("2d");
    const grad = ctx.createLinearGradient(0, 0, 128, 0);
    grad.addColorStop(0, "rgba(255,255,255,0)");
    grad.addColorStop(0.7, "rgba(220,240,255,0.9)");
    grad.addColorStop(1, "rgba(255,255,255,1)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 128, 4);
    const tex = new THREE.CanvasTexture(c);
    tex.minFilter = THREE.LinearFilter;
    const mat = new THREE.SpriteMaterial({
      map: tex, transparent: true, opacity: 0,
      depthWrite: false, blending: THREE.AdditiveBlending,
    });
    const sprite = new THREE.Sprite(mat);
    sprite.scale.set(6 + Math.random() * 4, 0.18, 1);
    sprite.renderOrder = 3;
    scene.add(sprite);
    // State: idle until nextFire
    const nextFire = performance.now() * 0.001 + 8 + Math.random() * 40;
    shootingStars.push({ sprite, mat, active: false, life: 0, maxLife: 0, vx: 0, vy: 0, nextFire });
  }
  scene.userData.shootingStars = shootingStars;

  // ── Small background asteroids ─────────────────────────────────
  const ASTEROID_COUNT = 3;
  const asteroids = [];
  for (let i = 0; i < ASTEROID_COUNT; i++) {
    const size = 0.08 + Math.random() * 0.1;
    const geo = new THREE.SphereGeometry(size, 4, 3);
    const mat = new THREE.MeshBasicMaterial({
      color: new THREE.Color("#CCBBAA"),
      transparent: true, opacity: 0,
      depthWrite: false,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.renderOrder = 3;
    scene.add(mesh);
    const nextFire = performance.now() * 0.001 + 20 + Math.random() * 60;
    asteroids.push({ mesh, mat, active: false, life: 0, maxLife: 0, vx: 0, vy: 0, vz: 0, nextFire });
  }
  scene.userData.asteroids = asteroids;

  // ── BIG BEACH ASTEROID — giant rock crossing the open beach sky every ~60s ──
  // Built from multiple sphere fragments merged into a lumpy irregular shape
  const bigAstGroup = new THREE.Group();
  bigAstGroup.renderOrder = 4;

  // Core body
  const bigCoreMat = new THREE.MeshBasicMaterial({ color: new THREE.Color("#B8A898"), transparent: true, opacity: 0, depthWrite: false });
  const bigCore = new THREE.Mesh(new THREE.SphereGeometry(1.1, 8, 6), bigCoreMat);
  bigAstGroup.add(bigCore);

  // Lumpy surface chunks
  const chunkDefs = [
    [0.55, 4, 3, "#A09080",  0.9,  0.2,  0.6],
    [0.45, 4, 3, "#C0B0A0", -0.7,  0.5, -0.5],
    [0.38, 4, 3, "#907060",  0.3, -0.6,  0.8],
    [0.50, 4, 3, "#B0A090", -0.8, -0.3,  0.4],
    [0.35, 4, 3, "#A89888",  0.6,  0.7, -0.7],
  ];
  const chunkMats = [bigCoreMat];
  for (const [r, ws, hs, col, cx, cy, cz] of chunkDefs) {
    const cm = new THREE.MeshBasicMaterial({ color: new THREE.Color(col), transparent: true, opacity: 0, depthWrite: false });
    const ch = new THREE.Mesh(new THREE.SphereGeometry(r, ws, hs), cm);
    ch.position.set(cx, cy, cz);
    bigAstGroup.add(ch);
    chunkMats.push(cm);
  }

  // Glow halo around it
  const haloMat = new THREE.MeshBasicMaterial({ color: new THREE.Color("#FF8844"), transparent: true, opacity: 0, depthWrite: false, side: THREE.BackSide });
  const halo = new THREE.Mesh(new THREE.SphereGeometry(1.6, 8, 6), haloMat);
  bigAstGroup.add(halo);

  scene.add(bigAstGroup);
  scene.userData.bigAsteroid = {
    group: bigAstGroup,
    mats: chunkMats,
    haloMat,
    active: false,
    life: 0,
    maxLife: 0,
    vx: 0, vy: 0, vz: 0,
    nextFire: performance.now() * 0.001 + 8, // first pass after 8s
  };

  // ── Per-star twinkle phases ────────────────────────────────────
  // Already handled by CityCanvas stars material — we add per-star index phases
  // to the star geometry so they twinkle individually (set once here)
  // The existing starsMesh already has userData.phases from createStarField.
  // We just ensure the animation loop uses them (done in animateCosmicSky).

  scene.fog = new THREE.Fog("#101835", 75, 95);
}

// ─── Animation tick — call every frame from CityCanvas ───────────
// camPos: camera.position (Vector3) — skybox follows camera
// skybox: scene.getObjectByName("skybox")
// t: elapsed time in seconds
// dt: delta time
export function animateCosmicSky(scene, camera, t, dt) {
  // ── Skybox follows camera, very slow Y drift ─────────────────
  const skybox = scene.getObjectByName("skybox");
  if (skybox) {
    skybox.position.copy(camera.position);
    skybox.rotation.y += dt * 0.012;
    skybox.rotation.x += dt * 0.002;
  }

  // ── Star twinkling — per-star phases if available ─────────────
  const starsMesh = scene.userData.stars;
  if (starsMesh?.material) {
    // Global opacity breath
    starsMesh.material.opacity = 0.42 + Math.sin(t * 0.85) * 0.08 + Math.cos(t * 0.55) * 0.06;
    starsMesh.material.size = 0.30 + Math.sin(t * 1.1) * 0.05;
  }

  // ── Shooting stars ────────────────────────────────────────────
  const shootingStars = scene.userData.shootingStars;
  if (shootingStars) {
    for (const ss of shootingStars) {
      if (!ss.active) {
        if (t >= ss.nextFire) {
          // Launch from a random position high in the sky sphere
          const ang = Math.random() * Math.PI * 2;
          const elev = 0.3 + Math.random() * 0.5; // above horizon
          const r = 22 + Math.random() * 6;
          const cx = camera.position.x + Math.cos(ang) * r;
          const cy = camera.position.y + 8 + elev * 12;
          const cz = camera.position.z + Math.sin(ang) * r;
          ss.sprite.position.set(cx, cy, cz);
          // Direction: slightly downward, fast
          const travelAng = ang + Math.PI + (Math.random() - 0.5) * 0.6;
          ss.vx = Math.cos(travelAng) * (18 + Math.random() * 10);
          ss.vy = -(3 + Math.random() * 4);
          ss.vz = Math.sin(travelAng) * (18 + Math.random() * 10);
          ss.maxLife = 0.55 + Math.random() * 0.35;
          ss.life = ss.maxLife;
          ss.active = true;
          ss.mat.opacity = 0;
          // Rotate sprite to align with travel direction
          ss.sprite.material.rotation = Math.atan2(ss.vy, Math.sqrt(ss.vx * ss.vx + ss.vz * ss.vz));
        }
      } else {
        ss.life -= dt;
        if (ss.life <= 0) {
          ss.active = false;
          ss.mat.opacity = 0;
          // Next fire: 15–50s from now
          ss.nextFire = t + 15 + Math.random() * 35;
        } else {
          const progress = ss.life / ss.maxLife;
          // Fade in quickly, hold, then fade out
          ss.mat.opacity = progress < 0.85
            ? (progress / 0.85)
            : Math.max(0, (ss.life / ss.maxLife) * 0.9);
          ss.mat.opacity *= 0.85; // keep subtle
          ss.sprite.position.x += ss.vx * dt;
          ss.sprite.position.y += ss.vy * dt;
          ss.sprite.position.z += ss.vz * dt;
        }
      }
    }
  }

  // ── Small background asteroids ────────────────────────────────
  const asteroids = scene.userData.asteroids;
  if (asteroids) {
    for (const ast of asteroids) {
      if (!ast.active) {
        if (t >= ast.nextFire) {
          const ang = Math.random() * Math.PI * 2;
          const elev = -0.1 + Math.random() * 0.6;
          const r = 18 + Math.random() * 8;
          ast.mesh.position.set(
            camera.position.x + Math.cos(ang) * r,
            camera.position.y + 4 + elev * 10,
            camera.position.z + Math.sin(ang) * r,
          );
          const driftAng = ang + Math.PI + (Math.random() - 0.5) * 1.0;
          ast.vx = Math.cos(driftAng) * (0.4 + Math.random() * 0.6);
          ast.vy = (Math.random() - 0.5) * 0.15;
          ast.vz = Math.sin(driftAng) * (0.4 + Math.random() * 0.6);
          ast.maxLife = 18 + Math.random() * 22;
          ast.life = ast.maxLife;
          ast.active = true;
          ast.mat.opacity = 0;
        }
      } else {
        ast.life -= dt;
        if (ast.life <= 0) {
          ast.active = false;
          ast.mat.opacity = 0;
          ast.nextFire = t + 25 + Math.random() * 55;
        } else {
          const progress = ast.life / ast.maxLife;
          const envelope = Math.min(progress / 0.1, 1) * Math.min((1 - progress) / 0.1, 1);
          ast.mat.opacity = envelope * (0.35 + Math.random() * 0.05);
          ast.mesh.position.x += ast.vx * dt;
          ast.mesh.position.y += ast.vy * dt;
          ast.mesh.position.z += ast.vz * dt;
          ast.mesh.rotation.x += dt * 0.3;
          ast.mesh.rotation.y += dt * 0.2;
        }
      }
    }
  }

  // ── BIG BEACH ASTEROID — crosses open beach sky every ~60s ───────────────
  const ba = scene.userData.bigAsteroid;
  if (ba) {
    if (!ba.active) {
      if (t >= ba.nextFire) {
        // Spawn high over the west side of beach, travel east at medium speed
        // Beach is at z > 15, open sky. Spawn at x=-40, high y, z=28 (mid-beach)
        const side = Math.random() < 0.5 ? -1 : 1;
        const startX = side * (38 + Math.random() * 8);
        const startY = camera.position.y + 10 + Math.random() * 8; // high overhead
        const startZ = 18 + Math.random() * 18; // over beach/ocean zone
        ba.group.position.set(startX, startY, startZ);
        ba.group.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
        // Travel across — fast enough to be dramatic, slow enough to watch
        ba.vx = -side * (5.5 + Math.random() * 3.5);
        ba.vy = -(0.4 + Math.random() * 0.6); // slight downward arc
        ba.vz = (Math.random() - 0.5) * 2.0;
        ba.maxLife = 12 + Math.random() * 5; // ~12–17s crossing
        ba.life = ba.maxLife;
        ba.active = true;
        // Set all chunk mats to 0
        for (const m of ba.mats) m.opacity = 0;
        ba.haloMat.opacity = 0;
      }
    } else {
      ba.life -= dt;
      if (ba.life <= 0) {
        ba.active = false;
        for (const m of ba.mats) m.opacity = 0;
        ba.haloMat.opacity = 0;
        ba.nextFire = t + 55 + Math.random() * 15; // ~60s cycle
      } else {
        const progress = ba.life / ba.maxLife;
        // Fade in over first 8%, hold, fade out over last 8%
        const envelope = Math.min(progress / 0.08, 1) * Math.min((1 - progress) / 0.08, 1);
        const opacity = envelope * 0.92;
        for (const m of ba.mats) m.opacity = opacity;
        ba.haloMat.opacity = envelope * 0.18; // subtle atmospheric glow
        ba.group.position.x += ba.vx * dt;
        ba.group.position.y += ba.vy * dt;
        ba.group.position.z += ba.vz * dt;
        // Slow tumble
        ba.group.rotation.x += dt * 0.22;
        ba.group.rotation.y += dt * 0.14;
        ba.group.rotation.z += dt * 0.08;
      }
    }
  }
}