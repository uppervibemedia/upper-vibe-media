/**
 * CosmicSkySystem — seamless sphere skybox + shooting stars + asteroids
 *
 * Skybox: SphereGeometry (no box seams/edges ever visible).
 * Shooting stars: every 8-12s, arc from high sky down toward the beach horizon (+Z).
 * Asteroids: every 10s, streaks across the sky toward the horizon — always visible.
 */
import * as THREE from "three";

const BASE = "https://media.base44.com/images/public/69cd68afb7fe90ae92757154";
const SKY_A = `${BASE}/12edd43a9_ChatGPTImageJun19202611_55_16AM.png`;
const SKY_B = `${BASE}/5b01fc961_ChatGPTImageJun19202611_55_39AM.png`;

export function createCosmicSky(scene) {
  const loader = new THREE.TextureLoader();

  // ── Seamless sphere skybox — no box edges ever visible ──────────
  const skyTex = loader.load(SKY_A);
  skyTex.colorSpace = THREE.SRGBColorSpace;
  skyTex.wrapS = THREE.RepeatWrapping;
  skyTex.wrapT = THREE.ClampToEdgeWrapping;
  skyTex.repeat.set(2, 1); // wrap twice around equator for coverage
  skyTex.generateMipmaps = false;
  skyTex.minFilter = THREE.LinearFilter;
  skyTex.magFilter = THREE.LinearFilter;

  const skyMat = new THREE.MeshBasicMaterial({
    map: skyTex,
    side: THREE.BackSide,
    depthWrite: false,
  });

  const skybox = new THREE.Mesh(
    new THREE.SphereGeometry(80, 32, 16),
    skyMat
  );
  skybox.name = "skybox";
  skybox.renderOrder = -1;
  scene.add(skybox);

  // ── Shooting stars — pool of 6 streaks ──────────────────────────
  // They spawn high in the sky and fall toward the beach horizon (+Z direction)
  const SHOOT_COUNT = 6;
  const shootingStars = [];
  for (let i = 0; i < SHOOT_COUNT; i++) {
    const c = document.createElement("canvas");
    c.width = 160; c.height = 4;
    const ctx = c.getContext("2d");
    const grad = ctx.createLinearGradient(0, 0, 160, 0);
    grad.addColorStop(0, "rgba(255,255,255,0)");
    grad.addColorStop(0.5, "rgba(200,230,255,0.7)");
    grad.addColorStop(0.85, "rgba(240,250,255,0.95)");
    grad.addColorStop(1, "rgba(255,255,255,1)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 160, 4);
    const tex = new THREE.CanvasTexture(c);
    tex.minFilter = THREE.LinearFilter;
    const mat = new THREE.SpriteMaterial({
      map: tex, transparent: true, opacity: 0,
      depthWrite: false, blending: THREE.AdditiveBlending,
    });
    const sprite = new THREE.Sprite(mat);
    sprite.scale.set(7 + Math.random() * 4, 0.22, 1);
    sprite.renderOrder = 4;
    scene.add(sprite);
    // Stagger initial fire times so they don't all go at once
    const nextFire = performance.now() * 0.001 + 3 + i * 2 + Math.random() * 4;
    shootingStars.push({ sprite, mat, active: false, life: 0, maxLife: 0, vx: 0, vy: 0, vz: 0, nextFire });
  }
  scene.userData.shootingStars = shootingStars;

  // ── Asteroids — 3 glowing rock streaks ───────────────────────────
  const ASTEROID_COUNT = 3;
  const asteroids = [];
  for (let i = 0; i < ASTEROID_COUNT; i++) {
    // Each asteroid is a small bright sprite so it's clearly visible as a streak
    const ac = document.createElement("canvas");
    ac.width = 64; ac.height = 64;
    const actx = ac.getContext("2d");
    const ag = actx.createRadialGradient(32, 32, 0, 32, 32, 28);
    ag.addColorStop(0, "rgba(255,220,140,1)");
    ag.addColorStop(0.3, "rgba(255,160,60,0.8)");
    ag.addColorStop(0.7, "rgba(200,80,20,0.3)");
    ag.addColorStop(1, "rgba(0,0,0,0)");
    actx.fillStyle = ag;
    actx.fillRect(0, 0, 64, 64);
    const atex = new THREE.CanvasTexture(ac);
    atex.minFilter = THREE.LinearFilter;
    const amat = new THREE.SpriteMaterial({
      map: atex, transparent: true, opacity: 0,
      depthWrite: false, blending: THREE.AdditiveBlending,
    });
    const asprite = new THREE.Sprite(amat);
    asprite.scale.set(1.2, 1.2, 1);
    asprite.renderOrder = 4;
    scene.add(asprite);
    // Also add a tail streak
    const tc = document.createElement("canvas");
    tc.width = 128; tc.height = 3;
    const tctx = tc.getContext("2d");
    const tg = tctx.createLinearGradient(0, 0, 128, 0);
    tg.addColorStop(0, "rgba(255,160,60,0)");
    tg.addColorStop(0.6, "rgba(255,200,100,0.6)");
    tg.addColorStop(1, "rgba(255,220,140,0.9)");
    tctx.fillStyle = tg;
    tctx.fillRect(0, 0, 128, 3);
    const ttex = new THREE.CanvasTexture(tc);
    ttex.minFilter = THREE.LinearFilter;
    const tmat = new THREE.SpriteMaterial({
      map: ttex, transparent: true, opacity: 0,
      depthWrite: false, blending: THREE.AdditiveBlending,
    });
    const tail = new THREE.Sprite(tmat);
    tail.scale.set(5, 0.18, 1);
    tail.renderOrder = 4;
    scene.add(tail);

    // Stagger: fire at 5, 15, 25s etc
    const nextFire = performance.now() * 0.001 + 5 + i * 10 + Math.random() * 3;
    asteroids.push({ asprite, amat, tail, tmat, active: false, life: 0, maxLife: 0, vx: 0, vy: 0, vz: 0, nextFire });
  }
  scene.userData.asteroids = asteroids;

  scene.fog = new THREE.Fog("#101835", 75, 95);
}

export function animateCosmicSky(scene, camera, t, dt) {
  // ── Skybox follows camera, very slow rotation ────────────────
  const skybox = scene.getObjectByName("skybox");
  if (skybox) {
    skybox.position.copy(camera.position);
    skybox.rotation.y += dt * 0.008;
  }

  // ── Star twinkling ───────────────────────────────────────────
  const starsMesh = scene.userData.stars;
  if (starsMesh?.material) {
    starsMesh.material.opacity = 0.42 + Math.sin(t * 0.85) * 0.08 + Math.cos(t * 0.55) * 0.06;
    starsMesh.material.size = 0.30 + Math.sin(t * 1.1) * 0.05;
  }

  // ── Shooting stars — spawn high, arc toward beach horizon ────
  // Beach is at +Z direction from center. Spawn above camera, travel toward +Z and down.
  const shootingStars = scene.userData.shootingStars;
  if (shootingStars) {
    for (const ss of shootingStars) {
      if (!ss.active) {
        if (t >= ss.nextFire) {
          // Spawn high in sky above and slightly behind camera
          const sideSpread = (Math.random() - 0.5) * 30; // left/right spread
          const cx = camera.position.x + sideSpread;
          const cy = camera.position.y + 18 + Math.random() * 10; // high in sky
          const cz = camera.position.z - 15 - Math.random() * 10; // behind camera (away from beach)
          ss.sprite.position.set(cx, cy, cz);
          // Travel toward +Z (beach horizon) and downward
          ss.vx = sideSpread * 0.3; // slight lateral drift
          ss.vy = -(8 + Math.random() * 6); // fall
          ss.vz = 20 + Math.random() * 15; // toward beach
          ss.maxLife = 0.8 + Math.random() * 0.5;
          ss.life = ss.maxLife;
          ss.active = true;
          ss.mat.opacity = 0;
          // Align sprite with travel direction
          ss.sprite.material.rotation = Math.atan2(ss.vy, ss.vz) + Math.PI * 0.5;
        }
      } else {
        ss.life -= dt;
        if (ss.life <= 0) {
          ss.active = false;
          ss.mat.opacity = 0;
          ss.nextFire = t + 7 + Math.random() * 6; // every 7-13s
        } else {
          const prog = ss.life / ss.maxLife;
          // Bright flash in, fade out
          ss.mat.opacity = Math.min(prog * 3, 1) * Math.min((1 - prog) * 3, 1) * 0.92;
          ss.sprite.position.x += ss.vx * dt;
          ss.sprite.position.y += ss.vy * dt;
          ss.sprite.position.z += ss.vz * dt;
        }
      }
    }
  }

  // ── Asteroids — bright fireballs arcing toward beach horizon ──
  const asteroids = scene.userData.asteroids;
  if (asteroids) {
    for (const ast of asteroids) {
      if (!ast.active) {
        if (t >= ast.nextFire) {
          // Spawn high and offset, travel toward beach (+Z) and down
          const sideSpread = (Math.random() - 0.5) * 28;
          const startX = camera.position.x + sideSpread;
          const startY = camera.position.y + 14 + Math.random() * 8;
          const startZ = camera.position.z - 8 - Math.random() * 12;
          ast.asprite.position.set(startX, startY, startZ);
          ast.tail.position.set(startX - 2, startY, startZ - 2);
          // Velocity: toward beach and down
          ast.vx = sideSpread * 0.1;
          ast.vy = -(5 + Math.random() * 4);
          ast.vz = 12 + Math.random() * 8;
          ast.maxLife = 1.5 + Math.random() * 1.0;
          ast.life = ast.maxLife;
          ast.active = true;
          ast.amat.opacity = 0;
          ast.tmat.opacity = 0;
          // Align tail with direction
          const angle = Math.atan2(ast.vy, ast.vz) + Math.PI * 0.5;
          ast.tail.material.rotation = angle;
          ast.asprite.material.rotation = angle;
        }
      } else {
        ast.life -= dt;
        if (ast.life <= 0) {
          ast.active = false;
          ast.amat.opacity = 0;
          ast.tmat.opacity = 0;
          ast.nextFire = t + 8 + Math.random() * 5; // every 8-13s
        } else {
          const prog = ast.life / ast.maxLife;
          const envelope = Math.min(prog * 4, 1) * Math.min((1 - prog) * 4, 1);
          ast.amat.opacity = envelope * 0.95;
          ast.tmat.opacity = envelope * 0.75;
          ast.asprite.position.x += ast.vx * dt;
          ast.asprite.position.y += ast.vy * dt;
          ast.asprite.position.z += ast.vz * dt;
          // Tail slightly behind
          ast.tail.position.set(
            ast.asprite.position.x - ast.vx * 0.08,
            ast.asprite.position.y - ast.vy * 0.08,
            ast.asprite.position.z - ast.vz * 0.08,
          );
        }
      }
    }
  }
}