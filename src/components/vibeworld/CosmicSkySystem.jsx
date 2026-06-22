/**
 * CosmicSkySystem — seamless sphere skybox + shooting stars + asteroids
 *
 * Skybox: SphereGeometry (no box seams/edges ever visible).
 * Shooting stars: every 8-12s, arc naturally across the sky from high overhead
 *   down toward the beach horizon. Visible from anywhere in the world.
 * Asteroids: fireballs with tails, same arc, staggered timing.
 */
import * as THREE from "three";

const BASE = "https://media.base44.com/images/public/69cd68afb7fe90ae92757154";
const SKY_A = `${BASE}/12edd43a9_ChatGPTImageJun19202611_55_16AM.png`;

export function createCosmicSky(scene) {
  const loader = new THREE.TextureLoader();

  // ── Seamless sphere skybox ────────────────────────────────────────
  const skyTex = loader.load(SKY_A);
  skyTex.colorSpace = THREE.SRGBColorSpace;
  skyTex.wrapS = THREE.RepeatWrapping;
  skyTex.wrapT = THREE.ClampToEdgeWrapping;
  skyTex.repeat.set(2, 1);
  skyTex.generateMipmaps = false;
  skyTex.minFilter = THREE.LinearFilter;
  skyTex.magFilter = THREE.LinearFilter;

  const skybox = new THREE.Mesh(
    new THREE.SphereGeometry(80, 32, 16),
    new THREE.MeshBasicMaterial({ map: skyTex, side: THREE.BackSide, depthWrite: false })
  );
  skybox.name = "skybox";
  skybox.renderOrder = -1;
  scene.add(skybox);

  // ── Shooting stars — pool of 6 ───────────────────────────────────
  const SHOOT_COUNT = 6;
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

  // ── Asteroids — 3 fireballs with tails ───────────────────────────
  const ASTEROID_COUNT = 3;
  const asteroids = [];
  for (let i = 0; i < ASTEROID_COUNT; i++) {
    // Fireball head
    const ac = document.createElement("canvas");
    ac.width = 64; ac.height = 64;
    const actx = ac.getContext("2d");
    const ag = actx.createRadialGradient(32, 32, 0, 32, 32, 28);
    ag.addColorStop(0,   "rgba(255,230,160,1)");
    ag.addColorStop(0.25,"rgba(255,160,50,0.9)");
    ag.addColorStop(0.6, "rgba(200,70,10,0.4)");
    ag.addColorStop(1,   "rgba(0,0,0,0)");
    actx.fillStyle = ag;
    actx.fillRect(0, 0, 64, 64);
    const atex = new THREE.CanvasTexture(ac);
    atex.minFilter = THREE.LinearFilter;
    const amat = new THREE.SpriteMaterial({
      map: atex, transparent: true, opacity: 0,
      depthWrite: false, blending: THREE.AdditiveBlending,
    });
    const asprite = new THREE.Sprite(amat);
    asprite.scale.set(1.5, 1.5, 1);
    asprite.renderOrder = 5;
    scene.add(asprite);

    // Tail
    const tc = document.createElement("canvas");
    tc.width = 160; tc.height = 4;
    const tctx = tc.getContext("2d");
    const tg = tctx.createLinearGradient(0, 0, 160, 0);
    tg.addColorStop(0,   "rgba(255,140,40,0)");
    tg.addColorStop(0.5, "rgba(255,190,80,0.55)");
    tg.addColorStop(1,   "rgba(255,230,160,0.9)");
    tctx.fillStyle = tg;
    tctx.fillRect(0, 0, 160, 4);
    const ttex = new THREE.CanvasTexture(tc);
    ttex.minFilter = THREE.LinearFilter;
    const tmat = new THREE.SpriteMaterial({
      map: ttex, transparent: true, opacity: 0,
      depthWrite: false, blending: THREE.AdditiveBlending,
    });
    const tail = new THREE.Sprite(tmat);
    tail.scale.set(6, 0.2, 1);
    tail.renderOrder = 4;
    scene.add(tail);

    asteroids.push({
      asprite, amat, tail, tmat,
      active: false, life: 0, maxLife: 0,
      vx: 0, vy: 0, vz: 0,
      nextFire: performance.now() * 0.001 + 6 + i * 9 + Math.random() * 4,
    });
  }
  scene.userData.asteroids = asteroids;

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
  // ── Skybox follows camera ────────────────────────────────────────
  const skybox = scene.getObjectByName("skybox");
  if (skybox) {
    skybox.position.copy(camera.position);
    skybox.rotation.y += dt * 0.007;
  }

  // ── Star twinkling ───────────────────────────────────────────────
  const starsMesh = scene.userData.stars;
  if (starsMesh?.material) {
    starsMesh.material.opacity = 0.42 + Math.sin(t * 0.85) * 0.08 + Math.cos(t * 0.55) * 0.06;
    starsMesh.material.size    = 0.30 + Math.sin(t * 1.1)  * 0.05;
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

  // ── Asteroids ────────────────────────────────────────────────────
  const asteroids = scene.userData.asteroids;
  if (asteroids) {
    for (const ast of asteroids) {
      if (!ast.active) {
        if (t >= ast.nextFire) {
          const p = spawnArcParams(false);
          ast.asprite.position.set(p.startX, p.startY, p.startZ);
          ast.tail.position.set(p.startX, p.startY, p.startZ);
          ast.vx = p.vx; ast.vy = p.vy; ast.vz = p.vz;
          ast.maxLife = p.life; ast.life = p.life;
          ast.active = true;
          ast.amat.opacity = 0;
          ast.tmat.opacity = 0;
          ast.asprite.material.rotation = p.rotation;
          ast.tail.material.rotation    = p.rotation;
        }
      } else {
        ast.life -= dt;
        if (ast.life <= 0) {
          ast.active = false;
          ast.amat.opacity = 0;
          ast.tmat.opacity = 0;
          ast.nextFire = t + 9 + Math.random() * 6; // next in 9–15s
        } else {
          const prog = ast.life / ast.maxLife;
          const envelope = Math.sin(Math.PI * (1 - prog));
          ast.amat.opacity = envelope * 0.98;
          ast.tmat.opacity = envelope * 0.80;
          ast.asprite.position.x += ast.vx * dt;
          ast.asprite.position.y += ast.vy * dt;
          ast.asprite.position.z += ast.vz * dt;
          // Tail offset: slightly behind the head along travel direction
          const tailLen = 0.12;
          ast.tail.position.set(
            ast.asprite.position.x - ast.vx * tailLen,
            ast.asprite.position.y - ast.vy * tailLen,
            ast.asprite.position.z - ast.vz * tailLen,
          );
        }
      }
    }
  }
}