import React, { useRef, useEffect, useCallback } from "react";
import * as THREE from "three";

/* ── District definitions ── */
const RING_RADIUS = 7;
const DISTRICTS = [
  { id: "music",   name: "Music District",       color: 0x00A0DC, angle: 0,   shape: "club" },
  { id: "radio",   name: "Radio Tower",          color: 0x9B7EFF, angle: 72,  shape: "tower" },
  { id: "temple",  name: "Vibe Check Temple",    color: 0xEC4899, angle: 144, shape: "temple" },
  { id: "gardens", name: "Manifestation Gardens",color: 0x34D399, angle: 216, shape: "gardens" },
  { id: "arena",   name: "Concert Arena",        color: 0xF5A800, angle: 288, shape: "arena" },
];

const isMobile = typeof navigator !== "undefined" && /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);

/* ── Helpers ── */
function glowTexture(color, size = 128) {
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const ctx = c.getContext("2d");
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  const col = new THREE.Color(color);
  const r = Math.floor(col.r * 255), gg = Math.floor(col.g * 255), b = Math.floor(col.b * 255);
  g.addColorStop(0, `rgba(${r},${gg},${b},0.7)`);
  g.addColorStop(0.4, `rgba(${r},${gg},${b},0.18)`);
  g.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  return new THREE.CanvasTexture(c);
}

function labelTexture(text, color) {
  const c = document.createElement("canvas");
  c.width = 512; c.height = 96;
  const ctx = c.getContext("2d");
  const col = new THREE.Color(color);
  const hex = `rgb(${Math.floor(col.r * 255)},${Math.floor(col.g * 255)},${Math.floor(col.b * 255)})`;
  ctx.shadowColor = hex;
  ctx.shadowBlur = 18;
  ctx.fillStyle = "#ffffff";
  ctx.font = "900 34px Inter, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text.toUpperCase(), 256, 48);
  const tex = new THREE.CanvasTexture(c);
  tex.minFilter = THREE.LinearFilter;
  return tex;
}

export default function CityCanvas({ onEnterDistrict, onLoaded, interactionLocked }) {
  const mountRef = useRef(null);
  const animIdRef = useRef(null);
  const lockedRef = useRef(interactionLocked);
  lockedRef.current = interactionLocked;
  const onEnterRef = useRef(onEnterDistrict);
  onEnterRef.current = onEnterDistrict;
  const onLoadedRef = useRef(onLoaded);
  onLoadedRef.current = onLoaded;

  useEffect(() => {
    if (!mountRef.current) return;
    const container = mountRef.current;
    const w = container.clientWidth;
    const h = container.clientHeight;

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x05050f, 0.022);

    const camera = new THREE.PerspectiveCamera(58, w / h, 0.1, 120);

    const renderer = new THREE.WebGLRenderer({ antialias: !isMobile, alpha: false });
    renderer.setSize(w, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, isMobile ? 1.5 : 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.25;
    container.appendChild(renderer.domElement);

    /* ── Lighting ── */
    scene.add(new THREE.AmbientLight(0x223055, 0.7));
    const moon = new THREE.DirectionalLight(0x6688cc, 0.5);
    moon.position.set(6, 12, 4);
    scene.add(moon);
    const orbit1 = new THREE.PointLight(0x00A0DC, 2.4, 30);
    const orbit2 = new THREE.PointLight(0xEC4899, 2.2, 30);
    const orbit3 = new THREE.PointLight(0x9B7EFF, 2.0, 30);
    scene.add(orbit1, orbit2, orbit3);

    /* ── Ground ── */
    const floor = new THREE.Mesh(
      new THREE.CircleGeometry(26, 64),
      new THREE.MeshStandardMaterial({ color: 0x070713, roughness: 0.35, metalness: 0.7 })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -0.02;
    scene.add(floor);

    const grid = new THREE.PolarGridHelper(20, 16, 20, 96, 0x1b2350, 0x131a3a);
    grid.position.y = 0;
    scene.add(grid);

    /* ── Animated water (plaza fountain pool) ── */
    const waterSeg = isMobile ? 24 : 48;
    const waterGeo = new THREE.CircleGeometry(2.6, waterSeg, 0, Math.PI * 2);
    const waterMat = new THREE.MeshStandardMaterial({
      color: 0x0a4d6b, roughness: 0.1, metalness: 0.9,
      transparent: true, opacity: 0.78, emissive: 0x00344d, emissiveIntensity: 0.5,
    });
    const water = new THREE.Mesh(waterGeo, waterMat);
    water.rotation.x = -Math.PI / 2;
    water.position.y = 0.06;
    scene.add(water);
    const waterBase = waterGeo.attributes.position.array.slice();

    // Fountain crystal in plaza center
    const crystal = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.7),
      new THREE.MeshStandardMaterial({ color: 0x00A0DC, roughness: 0.1, metalness: 0.85, emissive: 0x0088bb, emissiveIntensity: 0.9 })
    );
    crystal.position.y = 1.4;
    scene.add(crystal);
    const crystalGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(0x00A0DC), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0.5 }));
    crystalGlow.scale.set(4, 4, 1);
    crystalGlow.position.y = 1.4;
    scene.add(crystalGlow);

    // Central plaza clickable disc
    const plaza = new THREE.Group();
    plaza.userData = { district: "plaza" };
    const plazaRing = new THREE.Mesh(
      new THREE.TorusGeometry(2.9, 0.08, 12, 80),
      new THREE.MeshStandardMaterial({ color: 0x00A0DC, emissive: 0x00A0DC, emissiveIntensity: 0.7, roughness: 0.3, metalness: 0.6 })
    );
    plazaRing.rotation.x = -Math.PI / 2;
    plazaRing.position.y = 0.08;
    plaza.add(plazaRing);
    scene.add(plaza);

    /* ── District builder ── */
    const districtGroups = [];
    const animated = []; // { obj, type, seed, base }

    DISTRICTS.forEach((d) => {
      const rad = (d.angle * Math.PI) / 180;
      const x = Math.cos(rad) * RING_RADIUS;
      const z = Math.sin(rad) * RING_RADIUS;
      const group = new THREE.Group();
      group.position.set(x, 0, z);
      group.userData = { district: d.id };

      const mat = new THREE.MeshStandardMaterial({
        color: 0x10142e, roughness: 0.35, metalness: 0.6,
        emissive: d.color, emissiveIntensity: 0.35,
      });

      if (d.shape === "club") {
        const body = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.4, 2.2), mat);
        body.position.y = 0.7;
        group.add(body);
        // equalizer bars on top
        for (let i = 0; i < 5; i++) {
          const bar = new THREE.Mesh(
            new THREE.BoxGeometry(0.22, 0.6, 0.22),
            new THREE.MeshStandardMaterial({ color: d.color, emissive: d.color, emissiveIntensity: 1.1 })
          );
          bar.position.set(-0.8 + i * 0.4, 1.7, 0);
          group.add(bar);
          animated.push({ obj: bar, type: "eq", seed: i * 1.3 });
        }
      } else if (d.shape === "tower") {
        const body = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.8, 3.2, 16), mat);
        body.position.y = 1.6;
        group.add(body);
        const antenna = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.2, 6),
          new THREE.MeshStandardMaterial({ color: d.color, emissive: d.color, emissiveIntensity: 1 }));
        antenna.position.y = 3.6;
        group.add(antenna);
        const pulseRing = new THREE.Mesh(new THREE.TorusGeometry(0.7, 0.04, 8, 40),
          new THREE.MeshBasicMaterial({ color: d.color, transparent: true, opacity: 0.8 }));
        pulseRing.position.y = 3.2;
        pulseRing.rotation.x = Math.PI / 2;
        group.add(pulseRing);
        animated.push({ obj: pulseRing, type: "pulse", seed: 0 });
      } else if (d.shape === "temple") {
        const body = new THREE.Mesh(new THREE.ConeGeometry(1.4, 2.6, 4), mat);
        body.position.y = 1.3;
        body.rotation.y = Math.PI / 4;
        group.add(body);
        const top = new THREE.Mesh(new THREE.OctahedronGeometry(0.3),
          new THREE.MeshStandardMaterial({ color: d.color, emissive: d.color, emissiveIntensity: 1.3 }));
        top.position.y = 2.9;
        group.add(top);
        animated.push({ obj: top, type: "spin", seed: 0 });
      } else if (d.shape === "gardens") {
        const platform = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.5, 0.5, 24), mat);
        platform.position.y = 0.25;
        group.add(platform);
        for (let i = 0; i < 4; i++) {
          const orb = new THREE.Mesh(new THREE.SphereGeometry(0.22, 16, 16),
            new THREE.MeshStandardMaterial({ color: d.color, emissive: d.color, emissiveIntensity: 1, roughness: 0.2 }));
          const a = (i / 4) * Math.PI * 2;
          orb.position.set(Math.cos(a) * 0.7, 1, Math.sin(a) * 0.7);
          group.add(orb);
          animated.push({ obj: orb, type: "float", seed: i * 1.7, base: 1 });
        }
      } else if (d.shape === "arena") {
        const body = new THREE.Mesh(new THREE.CylinderGeometry(1.7, 1.9, 1, 28), mat);
        body.position.y = 0.5;
        group.add(body);
        // light beams
        for (let i = 0; i < 6; i++) {
          const beam = new THREE.Mesh(new THREE.ConeGeometry(0.18, 2.4, 8, 1, true),
            new THREE.MeshBasicMaterial({ color: d.color, transparent: true, opacity: 0.25, blending: THREE.AdditiveBlending, depthWrite: false }));
          const a = (i / 6) * Math.PI * 2;
          beam.position.set(Math.cos(a) * 1.4, 2.2, Math.sin(a) * 1.4);
          group.add(beam);
          animated.push({ obj: beam, type: "beam", seed: i });
        }
      }

      // Glow under building
      const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(d.color), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0.55 }));
      glow.scale.set(5, 5, 1);
      glow.position.y = 1.2;
      group.add(glow);

      // Neon label sign above
      const label = new THREE.Sprite(new THREE.SpriteMaterial({ map: labelTexture(d.name, d.color), transparent: true, depthTest: false, depthWrite: false }));
      label.position.y = 4.3;
      label.scale.set(4, 0.75, 1);
      group.add(label);

      scene.add(group);
      districtGroups.push(group);
    });

    /* ── Floating holograms ── */
    const holos = [];
    const holoColors = [0x00A0DC, 0x9B7EFF, 0xEC4899, 0xF5A800];
    for (let i = 0; i < (isMobile ? 4 : 7); i++) {
      const geo = i % 2 === 0 ? new THREE.IcosahedronGeometry(0.4, 0) : new THREE.TorusKnotGeometry(0.3, 0.1, 50, 8);
      const holo = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({
        color: holoColors[i % holoColors.length], wireframe: true, transparent: true, opacity: 0.4,
      }));
      const a = Math.random() * Math.PI * 2;
      const r = 3 + Math.random() * 8;
      holo.position.set(Math.cos(a) * r, 2 + Math.random() * 4, Math.sin(a) * r);
      scene.add(holo);
      holos.push({ obj: holo, seed: Math.random() * 10, baseY: holo.position.y });
    }

    /* ── Particles drifting upward ── */
    const count = isMobile ? 350 : 700;
    const pGeo = new THREE.BufferGeometry();
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);
    const cOpts = [new THREE.Color(0x00A0DC), new THREE.Color(0x9B7EFF), new THREE.Color(0xEC4899), new THREE.Color(0xF5A800), new THREE.Color(0x34D399)];
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const r = Math.random() * 22;
      pos[i * 3] = Math.cos(a) * r;
      pos[i * 3 + 1] = Math.random() * 14;
      pos[i * 3 + 2] = Math.sin(a) * r;
      const c = cOpts[Math.floor(Math.random() * cOpts.length)];
      col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
    }
    pGeo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    pGeo.setAttribute("color", new THREE.BufferAttribute(col, 3));
    const particles = new THREE.Points(pGeo, new THREE.PointsMaterial({
      size: 0.06, vertexColors: true, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0.75,
    }));
    scene.add(particles);

    /* ── Camera orbit controls ── */
    const camState = { theta: Math.PI * 0.5, phi: 0.95, radius: 15, autoRot: true };
    const clock = new THREE.Clock();
    const raycaster = new THREE.Raycaster();
    const ndc = new THREE.Vector2();
    let dragging = false, moved = false, lastX = 0, lastY = 0, downX = 0, downY = 0;

    const updateCamera = () => {
      const r = camState.radius;
      camera.position.set(
        Math.cos(camState.theta) * Math.sin(camState.phi) * r,
        Math.cos(camState.phi) * r + 4,
        Math.sin(camState.theta) * Math.sin(camState.phi) * r
      );
      camera.lookAt(0, 1.2, 0);
    };

    const onDown = (e) => {
      dragging = true; moved = false;
      lastX = downX = e.clientX; lastY = downY = e.clientY;
    };
    const onMove = (e) => {
      if (!dragging) return;
      const dx = e.clientX - lastX, dy = e.clientY - lastY;
      if (Math.abs(e.clientX - downX) + Math.abs(e.clientY - downY) > 6) moved = true;
      lastX = e.clientX; lastY = e.clientY;
      camState.theta -= dx * 0.005;
      camState.phi = THREE.MathUtils.clamp(camState.phi - dy * 0.004, 0.45, 1.35);
    };
    const onUp = (e) => {
      dragging = false;
      if (moved || lockedRef.current) return;
      // treat as click → raycast districts
      const rect = container.getBoundingClientRect();
      ndc.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      ndc.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(ndc, camera);
      const targets = [...districtGroups, plaza];
      const hits = raycaster.intersectObjects(targets, true);
      if (hits.length) {
        let o = hits[0].object;
        while (o) {
          if (o.userData?.district) { onEnterRef.current?.(o.userData.district); return; }
          o = o.parent;
        }
      }
    };
    const onWheel = (e) => {
      camState.radius = THREE.MathUtils.clamp(camState.radius + e.deltaY * 0.01, 8, 22);
    };

    container.addEventListener("pointerdown", onDown);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    container.addEventListener("wheel", onWheel, { passive: true });

    const onResize = () => {
      const nw = container.clientWidth, nh = container.clientHeight;
      camera.aspect = nw / nh;
      camera.updateProjectionMatrix();
      renderer.setSize(nw, nh);
    };
    window.addEventListener("resize", onResize);

    /* ── Animate ── */
    const animate = () => {
      const t = clock.getElapsedTime();

      if (!dragging && !lockedRef.current) camState.theta += 0.0009;
      updateCamera();

      // Orbiting lights
      orbit1.position.set(Math.cos(t * 0.4) * 9, 5, Math.sin(t * 0.4) * 9);
      orbit2.position.set(Math.cos(t * 0.4 + 2.1) * 9, 6, Math.sin(t * 0.4 + 2.1) * 9);
      orbit3.position.set(Math.cos(-t * 0.3 + 4) * 7, 4, Math.sin(-t * 0.3 + 4) * 7);

      // Crystal
      crystal.rotation.y += 0.01;
      crystal.position.y = 1.4 + Math.sin(t * 1.2) * 0.1;

      // Water ripples
      const wp = waterGeo.attributes.position;
      for (let i = 0; i < wp.count; i++) {
        const ix = i * 3;
        const bx = waterBase[ix], by = waterBase[ix + 1];
        wp.array[ix + 2] = Math.sin(bx * 1.5 + t * 2) * 0.08 + Math.cos(by * 1.5 + t * 1.5) * 0.08;
      }
      wp.needsUpdate = true;

      // Particles drift up
      const pa = pGeo.attributes.position.array;
      for (let i = 0; i < count; i++) {
        pa[i * 3 + 1] += 0.006;
        if (pa[i * 3 + 1] > 14) pa[i * 3 + 1] = 0;
      }
      pGeo.attributes.position.needsUpdate = true;
      particles.rotation.y += 0.0004;

      // Holograms
      holos.forEach((hh) => {
        hh.obj.rotation.x += 0.006;
        hh.obj.rotation.y += 0.008;
        hh.obj.position.y = hh.baseY + Math.sin(t * 0.8 + hh.seed) * 0.5;
      });

      // District animated parts
      animated.forEach((a) => {
        if (a.type === "eq") a.obj.scale.y = 0.5 + Math.abs(Math.sin(t * 4 + a.seed)) * 1.6;
        else if (a.type === "pulse") {
          const s = 1 + (Math.sin(t * 3) * 0.5 + 0.5) * 1.2;
          a.obj.scale.set(s, s, s);
          a.obj.material.opacity = 0.8 - (s - 1) * 0.5;
        } else if (a.type === "spin") { a.obj.rotation.y += 0.03; a.obj.rotation.x += 0.01; }
        else if (a.type === "float") a.obj.position.y = a.base + Math.sin(t * 1.5 + a.seed) * 0.25;
        else if (a.type === "beam") a.obj.material.opacity = 0.12 + Math.abs(Math.sin(t * 2 + a.seed)) * 0.28;
      });

      // Hover highlight on districts
      if (!lockedRef.current && !isMobile) {
        raycaster.setFromCamera(ndc, camera);
      }
      districtGroups.forEach((g) => {
        g.position.y = Math.sin(t * 0.6 + g.position.x) * 0.05;
      });

      renderer.render(scene, camera);
      animIdRef.current = requestAnimationFrame(animate);
    };

    updateCamera();
    animate();
    onLoadedRef.current?.();

    return () => {
      cancelAnimationFrame(animIdRef.current);
      container.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      container.removeEventListener("wheel", onWheel);
      window.removeEventListener("resize", onResize);
      renderer.dispose();
      if (container.contains(renderer.domElement)) container.removeChild(renderer.domElement);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return <div ref={mountRef} style={{ width: "100%", height: "100%", cursor: "grab", touchAction: "none" }} />;
}