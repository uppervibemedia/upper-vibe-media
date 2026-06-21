/**
 * AvatarTestPlatform — DEV ONLY clean isolated stage for avatar inspection.
 * Renders a bright flat platform with soft multi-angle lighting.
 * No world geometry, no distractions.
 */
import React, { useRef, useEffect } from "react";
import * as THREE from "three";
import { createAvatar } from "./AvatarModel";

// ── Dev flag — set to false to return to normal world ────────────────────────
// Set to true temporarily to inspect avatar on clean test platform
export const DEV_AVATAR_TEST_MODE = true;

const PLATFORM_Y = 0;
const AVATAR_Y   = PLATFORM_Y; // feet on platform

export default function AvatarTestPlatform({ avatarConfig = {} }) {
  const mountRef = useRef(null);

  useEffect(() => {
    const el = mountRef.current;
    if (!el) return;

    // ── Renderer ────────────────────────────────────────────────────────────
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(el.clientWidth, el.clientHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.setClearColor(0x0a0a14);
    el.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0x0a0a14, 18, 32);

    // ── Platform ────────────────────────────────────────────────────────────
    const platGeo = new THREE.CylinderGeometry(5, 5, 0.08, 48);
    const platMat = new THREE.MeshStandardMaterial({ color: 0x181830, roughness: 0.4, metalness: 0.5 });
    const platform = new THREE.Mesh(platGeo, platMat);
    platform.position.y = -0.04;
    platform.receiveShadow = true;
    scene.add(platform);

    // Grid lines on platform
    const gridMat = new THREE.MeshBasicMaterial({ color: 0x2a2a60, transparent: true, opacity: 0.5 });
    for (let i = -4; i <= 4; i++) {
      const h = new THREE.Mesh(new THREE.BoxGeometry(9, 0.004, 0.02), gridMat);
      h.position.set(0, 0.002, i); scene.add(h);
      const v = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.004, 9), gridMat);
      v.position.set(i, 0.002, 0); scene.add(v);
    }

    // Outer glow ring
    const ringMat = new THREE.MeshBasicMaterial({ color: 0x00d4f0, transparent: true, opacity: 0.4, side: THREE.DoubleSide });
    const ring = new THREE.Mesh(new THREE.RingGeometry(4.9, 5.1, 64), ringMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.005;
    scene.add(ring);

    // ── Bright soft lighting ─────────────────────────────────────────────────
    // Key light — front-left, bright warm
    const key = new THREE.DirectionalLight(0xffeedd, 2.8);
    key.position.set(3, 6, 5);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    key.shadow.camera.near = 0.5;
    key.shadow.camera.far = 20;
    key.shadow.camera.left = -4;
    key.shadow.camera.right = 4;
    key.shadow.camera.top = 5;
    key.shadow.camera.bottom = -1;
    scene.add(key);

    // Fill light — right, cooler
    const fill = new THREE.DirectionalLight(0xaaccff, 1.6);
    fill.position.set(-4, 4, 3);
    scene.add(fill);

    // Rim light — behind, makes avatar pop from background
    const rim = new THREE.DirectionalLight(0x9966ff, 1.2);
    rim.position.set(0, 3, -6);
    scene.add(rim);

    // Ambient — ensure no completely dark areas
    scene.add(new THREE.AmbientLight(0x6688aa, 1.4));

    // Under-light — lifts shadow on face/underside
    const under = new THREE.PointLight(0x4466cc, 0.8, 8);
    under.position.set(0, -0.5, 1.5);
    scene.add(under);

    // ── Avatar ───────────────────────────────────────────────────────────────
    // Build a temporary scene just for the avatar (reuse createAvatar but
    // override spawn position)
    const avatarScene = new THREE.Scene(); // temporary scene to capture the group
    const avatar = createAvatar(avatarScene, avatarConfig);
    avatarScene.remove(avatar); // pull it out
    avatar.position.set(0, AVATAR_Y, 0);
    scene.add(avatar);

    // ── Camera orbit ─────────────────────────────────────────────────────────
    // Camera orbits around the avatar center at chest height (y=0.9)
    const TARGET = new THREE.Vector3(0, 0.85, 0);
    const CAM_DIST = 3.2;
    const CAM_HEIGHT = 1.1; // eye-level view

    let orbitAngle = 0; // auto-rotates slowly for all-angle view
    const camera = new THREE.PerspectiveCamera(50, el.clientWidth / el.clientHeight, 0.1, 40);

    // Mouse / touch orbit override — horizontal AND vertical drag + scroll zoom
    let isDragging = false;
    let lastX = 0, lastY = 0;
    let camHeight = CAM_HEIGHT;  // vertical orbit
    const CAM_HEIGHT_MIN = 0.1;  // look at feet
    const CAM_HEIGHT_MAX = 2.8;  // look from above
    let camDist = CAM_DIST;
    const onMouseDown = (e) => {
      isDragging = true;
      lastX = e.clientX ?? e.touches?.[0]?.clientX;
      lastY = e.clientY ?? e.touches?.[0]?.clientY;
    };
    const onMouseMove = (e) => {
      if (!isDragging) return;
      const x = e.clientX ?? e.touches?.[0]?.clientX;
      const y = e.clientY ?? e.touches?.[0]?.clientY;
      if (x === undefined) return;
      orbitAngle -= (x - lastX) * 0.012;
      camHeight = Math.min(CAM_HEIGHT_MAX, Math.max(CAM_HEIGHT_MIN, camHeight - (y - lastY) * 0.008));
      lastX = x; lastY = y;
    };
    const onMouseUp = () => { isDragging = false; };
    const onWheel = (e) => {
      camDist = Math.min(5.5, Math.max(1.4, camDist + e.deltaY * 0.005));
    };
    renderer.domElement.addEventListener("mousedown", onMouseDown);
    renderer.domElement.addEventListener("touchstart", onMouseDown);
    renderer.domElement.addEventListener("wheel", onWheel, { passive: true });
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("touchmove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    window.addEventListener("touchend", onMouseUp);

    // Auto-slow rotation when not dragging
    let animId;
    const animate = () => {
      animId = requestAnimationFrame(animate);
      if (!isDragging) orbitAngle += 0.004;

      camera.position.set(
        Math.sin(orbitAngle) * camDist,
        camHeight,
        Math.cos(orbitAngle) * camDist,
      );
      // Look-at target tracks camera height so avatar stays centered
      TARGET.y = Math.max(0.3, camHeight * 0.75);
      camera.lookAt(TARGET);

      // Idle avatar breathing
      const t = performance.now() * 0.001;
      const torso = avatar.getObjectByName("torso");
      if (torso) {
        torso.scale.y = 1 + Math.sin(t * 1.8) * 0.012;
        torso.rotation.z = Math.sin(t * 0.5) * 0.018;
      }
      const ls = avatar.getObjectByName("leftShoulder");
      const rs = avatar.getObjectByName("rightShoulder");
      if (ls) ls.rotation.z = 0.12 + Math.sin(t * 0.8) * 0.03;
      if (rs) rs.rotation.z = -0.12 - Math.sin(t * 0.8) * 0.03;

      renderer.render(scene, camera);
    };
    animate();

    const onResize = () => {
      renderer.setSize(el.clientWidth, el.clientHeight);
      camera.aspect = el.clientWidth / el.clientHeight;
      camera.updateProjectionMatrix();
    };
    window.addEventListener("resize", onResize);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("touchmove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
      window.removeEventListener("touchend", onMouseUp);
      renderer.domElement.removeEventListener("wheel", onWheel);
      renderer.dispose();
      el.removeChild(renderer.domElement);
    };
  }, []);

  return (
    <div className="fixed inset-0 z-[200] flex flex-col" style={{ background: "#0a0a14" }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 shrink-0"
        style={{ background: "rgba(0,212,240,0.08)", borderBottom: "1px solid rgba(0,212,240,0.2)" }}>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
          <span className="text-cyan-300 text-xs font-mono font-bold tracking-widest">
            DEV · AVATAR TEST PLATFORM
          </span>
        </div>
        <span className="text-white/30 text-[10px] font-mono">drag to rotate/tilt · scroll to zoom</span>
      </div>

      {/* Canvas */}
      <div ref={mountRef} className="flex-1 w-full" style={{ cursor: "grab" }} />

      {/* Checklist overlay */}
      <div className="absolute bottom-4 left-4 text-[10px] font-mono space-y-0.5 pointer-events-none"
        style={{ color: "rgba(0,212,240,0.6)" }}>
        <div>✓ no T-pose arms</div>
        <div>✓ separate shirt + pants</div>
        <div>✓ visible face + hair</div>
        <div>✓ hands + shoes visible</div>
        <div>✓ human proportions</div>
      </div>
    </div>
  );
}