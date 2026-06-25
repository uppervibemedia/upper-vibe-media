/**
 * LoungePreviewCamera — overhead/angled live view of the Vibe Lounge.
 * Renders a dedicated Three.js canvas showing the lounge area from above.
 * Avatars are represented as coloured dot sprites with username labels.
 * Very lightweight — reuses only basic Three.js primitives, no GLB loads.
 */
import React, { useRef, useEffect } from "react";
import * as THREE from "three";

// Lounge world position (matches CityCanvas lounge platform)
const LOUNGE_X = -22;
const LOUNGE_Z = -26;
const LOUNGE_R = 4.5;

export default function LoungePreviewCamera({ activeUsers = [], currentUserId, isMobile }) {
  const canvasRef = useRef(null);
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const rendererRef = useRef(null);
  const dotsRef = useRef({});
  const frameRef = useRef(null);
  const initializedRef = useRef(false);

  // Build the static lounge scene once
  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const w = canvas.clientWidth || 320;
    const h = canvas.clientHeight || 140;

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.setSize(w, Math.max(h, 1));
    renderer.setClearColor(0x0a0816, 1);
    rendererRef.current = renderer;

    const scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0x0a0816, 12, 28);
    sceneRef.current = scene;

    // Overhead angled camera — looks down at the lounge from above and slightly south
    const camera = new THREE.PerspectiveCamera(55, w / Math.max(h, 1), 0.1, 60);
    // Position: above and slightly south of lounge, angled down
    camera.position.set(LOUNGE_X, 14, LOUNGE_Z + 8);
    camera.lookAt(LOUNGE_X, 0.5, LOUNGE_Z);
    cameraRef.current = camera;

    // Ambient light
    const amb = new THREE.AmbientLight(0x6655aa, 1.4);
    scene.add(amb);
    const fill = new THREE.PointLight(0xe040fb, 3.5, 18);
    fill.position.set(LOUNGE_X, 5, LOUNGE_Z);
    scene.add(fill);
    const rim = new THREE.PointLight(0x00d4f0, 2.0, 14);
    rim.position.set(LOUNGE_X + 3, 4, LOUNGE_Z - 3);
    scene.add(rim);

    // Ground plane
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(60, 60),
      new THREE.MeshStandardMaterial({ color: 0x0b1020, roughness: 0.6, metalness: 0.1 })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.set(0, -0.02, -10);
    scene.add(ground);

    // Lounge platform circle
    const platMat = new THREE.MeshStandardMaterial({ color: 0x181032, roughness: 0.3, metalness: 0.55 });
    const plat = new THREE.Mesh(new THREE.CircleGeometry(LOUNGE_R, 48), platMat);
    plat.rotation.x = -Math.PI / 2;
    plat.position.set(LOUNGE_X, 0.003, LOUNGE_Z);
    scene.add(plat);

    // Outer glow ring
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xc43bff, transparent: true, opacity: 0.55, side: THREE.DoubleSide, depthWrite: false,
    });
    const ring = new THREE.Mesh(new THREE.RingGeometry(LOUNGE_R - 0.3, LOUNGE_R, 64), ringMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(LOUNGE_X, 0.006, LOUNGE_Z);
    ring.renderOrder = 1;
    scene.add(ring);
    scene.userData._ring = ringMat;

    // Inner accent ring
    const innerRingMat = new THREE.MeshBasicMaterial({
      color: 0x00d4f0, transparent: true, opacity: 0.4, side: THREE.DoubleSide, depthWrite: false,
    });
    const innerRing = new THREE.Mesh(new THREE.RingGeometry(1.8, 2.1, 48), innerRingMat);
    innerRing.rotation.x = -Math.PI / 2;
    innerRing.position.set(LOUNGE_X, 0.007, LOUNGE_Z);
    innerRing.renderOrder = 1;
    scene.add(innerRing);
    scene.userData._innerRing = innerRingMat;

    // Fire pit center
    const firePit = new THREE.Mesh(
      new THREE.CylinderGeometry(0.5, 0.65, 0.25, 16),
      new THREE.MeshStandardMaterial({ color: 0x3a2a5a, roughness: 0.2, metalness: 0.6 })
    );
    firePit.position.set(LOUNGE_X, 0.14, LOUNGE_Z);
    scene.add(firePit);
    const fireGlow = new THREE.Mesh(
      new THREE.CylinderGeometry(0.55, 0.6, 0.05, 16),
      new THREE.MeshBasicMaterial({ color: 0xe040fb, transparent: true, opacity: 0.7, depthWrite: false })
    );
    fireGlow.position.set(LOUNGE_X, 0.33, LOUNGE_Z);
    scene.add(fireGlow);
    scene.userData._fireGlow = fireGlow.material;

    // Seating dots (5 seats)
    for (let i = 0; i < 5; i++) {
      const ang = Math.PI + (i / 4) * Math.PI * 0.65;
      const sx = LOUNGE_X + Math.cos(ang) * 2.8;
      const sz = LOUNGE_Z + Math.sin(ang) * 2.8;
      const seat = new THREE.Mesh(
        new THREE.BoxGeometry(0.75, 0.18, 0.55),
        new THREE.MeshStandardMaterial({ color: 0x2e1e4a, roughness: 0.3, metalness: 0.3 })
      );
      seat.position.set(sx, 0.15, sz);
      seat.rotation.y = -ang + Math.PI;
      scene.add(seat);
    }

    // Neon pillar posts
    for (let p = 0; p < 4; p++) {
      const ang = Math.PI + (p / 3) * Math.PI * 0.65;
      const px = LOUNGE_X + Math.cos(ang) * 3.0;
      const pz = LOUNGE_Z + Math.sin(ang) * 3.0;
      const pillar = new THREE.Mesh(
        new THREE.CylinderGeometry(0.04, 0.04, 2.2, 6),
        new THREE.MeshBasicMaterial({ color: p % 2 === 0 ? 0x00d4f0 : 0xa078ff, transparent: true, opacity: 0.5, depthWrite: false })
      );
      pillar.position.set(px, 1.1, pz);
      scene.add(pillar);
    }

    // Animation loop
    let t = 0;
    const animate = () => {
      frameRef.current = requestAnimationFrame(animate);
      t += 0.016;

      // Pulse lounge rings
      const ringM = scene.userData._ring;
      if (ringM) ringM.opacity = 0.4 + Math.sin(t * 2.0) * 0.2;
      const innerRingM = scene.userData._innerRing;
      if (innerRingM) innerRingM.opacity = 0.3 + Math.sin(t * 1.5 + 1) * 0.15;
      const fireM = scene.userData._fireGlow;
      if (fireM) fireM.opacity = 0.5 + Math.sin(t * 3.5) * 0.25;
      fill.intensity = 3.0 + Math.sin(t * 1.8) * 0.8;

      renderer.render(scene, camera);
    };
    animate();

    // Handle resize
    const onResize = () => {
      if (!canvas) return;
      const nw = canvas.clientWidth;
      const nh = canvas.clientHeight;
      if (nw > 0 && nh > 0) {
        renderer.setSize(nw, nh);
        camera.aspect = nw / nh;
        camera.updateProjectionMatrix();
      }
    };
    window.addEventListener("resize", onResize);

    return () => {
      cancelAnimationFrame(frameRef.current);
      window.removeEventListener("resize", onResize);
      renderer.dispose();
      scene.traverse((obj) => {
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) {
          if (Array.isArray(obj.material)) obj.material.forEach((m) => m.dispose());
          else obj.material.dispose();
        }
      });
      initializedRef.current = false;
    };
  }, []);

  // Update user dot avatars whenever activeUsers changes
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;

    const loungeUserList = (activeUsers || []).filter(
      (u) => u.current_zone === "Vibe Lounge"
    );

    const existingIds = new Set(Object.keys(dotsRef.current));
    const activeIds = new Set();

    for (const u of loungeUserList) {
      const uid = u.user_id;
      activeIds.add(uid);

      if (!dotsRef.current[uid]) {
        // Create a dot for this user
        const isMe = uid === currentUserId;
        const dotColor = isMe ? 0x7c3aed : 0x00d4f0;
        const dot = new THREE.Mesh(
          new THREE.CylinderGeometry(0.28, 0.28, 0.12, 12),
          new THREE.MeshBasicMaterial({ color: dotColor, depthWrite: false })
        );
        // Spread users around the lounge seats
        const idx = loungeUserList.indexOf(u);
        const ang = (idx / Math.max(1, loungeUserList.length)) * Math.PI * 2;
        const r = 1.8 + Math.random() * 1.2;
        dot.position.set(LOUNGE_X + Math.cos(ang) * r, 0.35, LOUNGE_Z + Math.sin(ang) * r);
        scene.add(dot);

        // Username label sprite
        const canvas2 = document.createElement("canvas");
        canvas2.width = 128; canvas2.height = 32;
        const ctx = canvas2.getContext("2d");
        ctx.clearRect(0, 0, 128, 32);
        ctx.fillStyle = isMe ? "#c4aaff" : "rgba(255,255,255,0.75)";
        ctx.font = "bold 14px sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText((u.username || "User").substring(0, 12), 64, 16);
        const tex = new THREE.CanvasTexture(canvas2);
        tex.minFilter = THREE.LinearFilter;
        const label = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false }));
        label.scale.set(2.5, 0.65, 1);
        label.position.set(dot.position.x, dot.position.y + 0.65, dot.position.z);
        scene.add(label);

        dotsRef.current[uid] = { dot, label };
      }
    }

    // Remove stale user dots
    for (const uid of existingIds) {
      if (!activeIds.has(uid)) {
        const entry = dotsRef.current[uid];
        if (entry) {
          scene.remove(entry.dot);
          scene.remove(entry.label);
          entry.dot.geometry?.dispose();
          entry.dot.material?.dispose();
          entry.label.material?.dispose();
        }
        delete dotsRef.current[uid];
      }
    }
  }, [activeUsers, currentUserId]);

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-full block"
      style={{ touchAction: "none", display: "block" }}
    />
  );
}