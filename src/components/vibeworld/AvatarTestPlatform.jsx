/**
 * AvatarTestPlatform — DEV ONLY isolated stage for GLB avatar inspection.
 * Shows the real humanoid Soldier.glb with idle/walk/run animations.
 */
import React, { useRef, useEffect, useState } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

export const DEV_AVATAR_TEST_MODE = false;

const GLB_URL = "https://threejs.org/examples/models/gltf/Soldier.glb";
const ANIMS = ["idle", "walk", "run"];

export default function AvatarTestPlatform() {
  const mountRef = useRef(null);
  const mixerRef = useRef(null);
  const clipsRef = useRef({});
  const currentRef = useRef("idle");
  const [currentAnim, setCurrentAnim] = useState("idle");
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const el = mountRef.current;
    if (!el) return;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(el.clientWidth, el.clientHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.setClearColor(0x0a0a14);
    el.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0x0a0a14, 18, 32);

    // Platform + grid
    const plat = new THREE.Mesh(
      new THREE.CylinderGeometry(5, 5, 0.08, 48),
      new THREE.MeshStandardMaterial({ color: 0x181830, roughness: 0.4, metalness: 0.5 })
    );
    plat.position.y = -0.04; plat.receiveShadow = true;
    scene.add(plat);

    const gridMat = new THREE.MeshBasicMaterial({ color: 0x2a2a60, transparent: true, opacity: 0.5 });
    for (let i = -4; i <= 4; i++) {
      const h = new THREE.Mesh(new THREE.BoxGeometry(9, 0.004, 0.02), gridMat);
      h.position.set(0, 0.002, i); scene.add(h);
      const v = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.004, 9), gridMat);
      v.position.set(i, 0.002, 0); scene.add(v);
    }
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(4.9, 5.1, 64),
      new THREE.MeshBasicMaterial({ color: 0x00d4f0, transparent: true, opacity: 0.4, side: THREE.DoubleSide })
    );
    ring.rotation.x = -Math.PI / 2; ring.position.y = 0.005; scene.add(ring);

    // Lighting
    const key = new THREE.DirectionalLight(0xffeedd, 2.8);
    key.position.set(3, 6, 5); key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    key.shadow.camera.near = 0.5; key.shadow.camera.far = 20;
    key.shadow.camera.left = -4; key.shadow.camera.right = 4;
    key.shadow.camera.top = 5; key.shadow.camera.bottom = -1;
    scene.add(key);
    const fill = new THREE.DirectionalLight(0xaaccff, 1.6); fill.position.set(-4, 4, 3); scene.add(fill);
    const rim  = new THREE.DirectionalLight(0x9966ff, 1.2);  rim.position.set(0, 3, -6);  scene.add(rim);
    scene.add(new THREE.AmbientLight(0x6688aa, 1.4));
    const under = new THREE.PointLight(0x4466cc, 0.8, 8); under.position.set(0, -0.5, 1.5); scene.add(under);

    // Camera + orbit
    const camera = new THREE.PerspectiveCamera(50, el.clientWidth / el.clientHeight, 0.1, 40);
    const TARGET = new THREE.Vector3(0, 0.9, 0);
    let orbitAngle = 0.4, camHeight = 1.2, camDist = 3.2;

    let isDragging = false, lastX = 0, lastY = 0;
    const onDown = (e) => { isDragging = true; lastX = e.clientX ?? e.touches?.[0]?.clientX; lastY = e.clientY ?? e.touches?.[0]?.clientY; };
    const onMove = (e) => {
      if (!isDragging) return;
      const x = e.clientX ?? e.touches?.[0]?.clientX;
      const y = e.clientY ?? e.touches?.[0]?.clientY;
      if (x === undefined) return;
      orbitAngle -= (x - lastX) * 0.012;
      camHeight = Math.min(2.8, Math.max(0.05, camHeight - (y - lastY) * 0.008));
      lastX = x; lastY = y;
    };
    const onUp   = () => { isDragging = false; };
    const onWheel = (e) => { camDist = Math.min(5.5, Math.max(1.2, camDist + e.deltaY * 0.005)); };
    renderer.domElement.addEventListener("mousedown", onDown);
    renderer.domElement.addEventListener("touchstart", onDown);
    renderer.domElement.addEventListener("wheel", onWheel, { passive: true });
    window.addEventListener("mousemove", onMove);
    window.addEventListener("touchmove", onMove);
    window.addEventListener("mouseup", onUp);
    window.addEventListener("touchend", onUp);

    // Load GLB
    let animId;
    const clock = new THREE.Clock();

    const loader = new GLTFLoader();
    loader.load(GLB_URL, (gltf) => {
      const model = gltf.scene;
      model.traverse((child) => { if (child.isMesh) { child.castShadow = true; child.receiveShadow = true; } });
      scene.add(model);

      const mixer = new THREE.AnimationMixer(model);
      mixerRef.current = mixer;

      const clips = {};
      gltf.animations.forEach((clip) => {
        const key = clip.name.toLowerCase();
        clips[key] = mixer.clipAction(clip);
        clips[key].setLoop(THREE.LoopRepeat, Infinity);
      });
      clipsRef.current = clips;
      if (clips.idle) clips.idle.play();
      setLoaded(true);

      const animate = () => {
        animId = requestAnimationFrame(animate);
        const dt = clock.getDelta();
        mixer.update(dt);
        if (!isDragging) orbitAngle += 0.004;
        camera.position.set(Math.sin(orbitAngle) * camDist, camHeight, Math.cos(orbitAngle) * camDist);
        TARGET.y = Math.max(0.5, camHeight * 0.75);
        camera.lookAt(TARGET);
        renderer.render(scene, camera);
      };
      animate();
    }, undefined, (err) => {
      console.error("[AvatarTestPlatform] GLB load error:", err);
      setError("Failed to load GLB model. Check network / CORS.");
    });

    const onResize = () => {
      renderer.setSize(el.clientWidth, el.clientHeight);
      camera.aspect = el.clientWidth / el.clientHeight;
      camera.updateProjectionMatrix();
    };
    window.addEventListener("resize", onResize);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("mouseup", onUp);
      window.removeEventListener("touchend", onUp);
      renderer.dispose();
      if (el.contains(renderer.domElement)) el.removeChild(renderer.domElement);
    };
  }, []);

  const playAnim = (key) => {
    const clips = clipsRef.current;
    const mixer = mixerRef.current;
    if (!clips[key] || !mixer || currentRef.current === key) return;
    const from = clips[currentRef.current];
    const to = clips[key];
    to.reset().setEffectiveTimeScale(1).setEffectiveWeight(1).play();
    if (from) from.crossFadeTo(to, 0.3, true);
    currentRef.current = key;
    setCurrentAnim(key);
  };

  return (
    <div className="fixed inset-0 z-[200] flex flex-col" style={{ background: "#0a0a14" }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 shrink-0"
        style={{ background: "rgba(0,212,240,0.08)", borderBottom: "1px solid rgba(0,212,240,0.2)" }}>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
          <span className="text-cyan-300 text-xs font-mono font-bold tracking-widest">DEV · AVATAR TEST PLATFORM</span>
        </div>
        <span className="text-white/30 text-[10px] font-mono">drag to rotate/tilt · scroll to zoom</span>
      </div>

      <div className="flex flex-1 overflow-hidden relative">
        {/* Canvas */}
        <div ref={mountRef} className="flex-1" style={{ cursor: "grab" }} />

        {/* Loading / error overlay */}
        {!loaded && !error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 pointer-events-none">
            <div className="w-8 h-8 border-2 border-cyan-400/30 border-t-cyan-400 rounded-full animate-spin" />
            <p className="text-xs text-cyan-300/60 font-mono">Loading humanoid model...</p>
          </div>
        )}
        {error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 pointer-events-none">
            <p className="text-xs text-red-400 font-mono">{error}</p>
          </div>
        )}

        {/* Animation Controls */}
        {loaded && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
            {ANIMS.map((a) => (
              <button key={a} onClick={() => playAnim(a)}
                className="px-4 py-1.5 rounded-full text-[11px] font-mono font-bold uppercase tracking-wider transition-all hover:brightness-110"
                style={{
                  background: currentAnim === a ? "rgba(0,212,240,0.25)" : "rgba(255,255,255,0.07)",
                  border: `1px solid ${currentAnim === a ? "rgba(0,212,240,0.55)" : "rgba(255,255,255,0.12)"}`,
                  color: currentAnim === a ? "#00d4f0" : "rgba(255,255,255,0.5)",
                }}>
                {a}
              </button>
            ))}
          </div>
        )}

        {/* Info panel */}
        <div className="absolute top-3 right-3 pointer-events-none"
          style={{ background: "rgba(10,10,28,0.85)", border: "1px solid rgba(0,212,240,0.15)", borderRadius: 10, padding: "10px 14px" }}>
          <p className="text-[9px] font-mono text-cyan-400/60 uppercase tracking-wider mb-1">Model</p>
          <p className="text-[10px] font-mono text-white/70">Soldier.glb (Three.js CC0)</p>
          <p className="text-[9px] font-mono text-white/35 mt-1">Properly rigged humanoid</p>
          <p className="text-[9px] font-mono text-white/35">Idle · Walk · Run clips</p>
          <p className="text-[9px] font-mono text-cyan-400/40 mt-1.5">AnimationMixer driven</p>
        </div>
      </div>
    </div>
  );
}