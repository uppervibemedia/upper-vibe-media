import React, { useRef, useEffect, useState } from "react";
import * as THREE from "three";
import buildPark from "./city-engine/sceneSetup";
import { updatePlayerMovement } from "./city-engine/playerMovement";
import { updateCamera } from "./city-engine/cameraController";
import { animateScene } from "./city-engine/animationLoop";
import { SPAWN } from "./city-engine/cityConfig";

import { createAvatar, createRemoteAvatar, updateAvatarAnimation, retintAvatar, attachHoverboard, detachHoverboard } from "./AvatarModel.jsx";
import { createTestAvatar, updateTestAvatarAnimation, retintTestAvatar } from "./AvatarModelTest";
import { createMixamoAvatar, updateMixamoAvatarAnimation, retintMixamoAvatar } from "./AvatarModelMixamo";

// ── Helper: wrap a (possibly stale) plain value so it reads like a ref – share a single object──
function refFromValue(v) {
  const o = {};
  Object.defineProperty(o, "current", { enumerable: true, get: () => v, set: (nv) => { v = nv; }, configurable: true });
  return o;
}

export default function CityCanvasV2({ onLoaded, onPositionChange, onRemoteAvatarClick, stageCanvas, audioIntensityRef, audioBassRef, audioBeatRef, locked, stageScreenPosRef, remoteUsers, isDancing = false, activeEmote = null, avatarConfig, onJukeboxProximity, retintRef, launchRef, onNearPad, djTrack, hbRiding = false, ferrisRiding = false, spawnOverride = null, rendererRef = null, tvMode = false, tvQuality = "smooth", ...props }) {
  const canvasRef = useRef(null);
  const [error, setError] = useState(null);
  const isMobileRef = useRef(/iPhone|iPad|iPod|Android/i.test(navigator.userAgent));
  const effectiveSpawn = spawnOverride ? [spawnOverride.x, SPAWN[1], spawnOverride.z, spawnOverride.rot || 0] : [...SPAWN, 0];
  const avatarPosRef = useRef(effectiveSpawn);   // [x,y,z,rotY]
  const avatarRotRef = useRef(spawnOverride?.rot || 0);
  const velocityRef = useRef({ x:0, z:0 });
  const keysRef = useRef({});
  const mouseRef = useRef({ down:false, dx:0, dy:0, button:0 });
  const camYawRef = useRef(0);
  const camYawSmoothRef = useRef(0);
  const camPitchRef = useRef(0.08);
  const camPitchSmoothRef = useRef(0.08);
  const userTouchingCamRef = useRef(false);
  const remoteAvatarsRef = useRef({});
  const frameRef = useRef(0);
  const launchStateRef = useRef({ active:false, phase:"idle", timer:0, startY:0 });
  const nearPadRef = useRef(-1);
  const speedBoostUntilRef = useRef(0);

  // TV & locked refs synced from props (inner runners re-read .current every frame)
  const tvModeRef = useRef(tvMode);
  const tvQualityRef = useRef(tvQuality);
  const lockedRef = useRef(locked);
  const hbRidingRef = useRef(hbRiding);
  useEffect(() => { tvModeRef.current = tvMode; }, [tvMode]);
  useEffect(() => { tvQualityRef.current = tvQuality; }, [tvQuality]);
  useEffect(() => { lockedRef.current = locked; }, [locked]);
  useEffect(() => { hbRidingRef.current = hbRiding; }, [hbRiding]);

  // Build the refs map that engine modules destructure with .current
  const refs = { sceneRef:null, cameraRef:null, avatarRef:null, avatarEntryRef:null,
    avatarPosRef, avatarRotRef, velocityRef, keysRef, mouseRef,
    camYawRef, camYawSmoothRef, camPitchRef, camPitchSmoothRef, userTouchingCamRef,
    remoteAvatarsRef, mobileInputRef: props.mobileInputRef || { x:0, y:0, camDx:0, camDy:0 },
    tvModeRef, tvQualityRef, lockedRef, hbRidingRef,
    frameRef, launchStateRef, nearPadRef, speedBoostUntilRef,
    isMobileRef: { get current() { return isMobileRef.current; }, set current(v) { isMobileRef.current = v; } }
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const isMob = isMobileRef.current;
    const renderer = new THREE.WebGLRenderer({ canvas, antialias:!isMob, powerPreference:isMob?"low-power":"high-performance" });
    renderer.setClearColor(0x0A1020);
    renderer.setPixelRatio(isMob ? Math.min(window.devicePixelRatio, 1.5) : Math.min(window.devicePixelRatio, 2));
    renderer.setSize(canvas.clientWidth, canvas.clientHeight);
    renderer.shadowMap.enabled = !isMob;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    if(rendererRef) rendererRef.current = renderer;

    const scene = new THREE.Scene();
    refs.sceneRef = scene;
    const camera = new THREE.PerspectiveCamera(52, canvas.clientWidth / canvas.clientHeight, 0.1, isMob ? 130 : 160);
    refs.cameraRef = camera;

    buildPark(scene);

    // ── Avatar ──
    const avatarTypeKey = avatarConfig?.avatarTypeKey || "current";
    const isMixamo = avatarTypeKey === "test-mixamo" || avatarTypeKey === "test-mixamo-female";
    const isTest = avatarTypeKey === "test-male" || avatarTypeKey === "test-female";
    const gender = avatarTypeKey === "test-female" || avatarTypeKey === "test-mixamo-female" ? "female" : "male";
    const savedHair = (()=>{try{return sessionStorage.getItem("uvc_hair_style")||""}catch{return ""}})();

    let entry;
    if(isMixamo) entry = createMixamoAvatar(scene, { spawnX:effectiveSpawn[0], spawnY:effectiveSpawn[1],
        spawnZ:effectiveSpawn[2], gender, hairStyle: savedHair||(gender==="female"?"ponytail":"short"),
        outfitColorKey: avatarConfig?.outfitColorKey || null,
        skinToneKey: (()=>{try{return sessionStorage.getItem("uvc_skin_tone")||null}catch{return null}})()||avatarConfig?.skinTone||"medium" }, null);
    else if(isTest) entry = createTestAvatar(scene, gender, avatarConfig||{}, ()=>{});
    else entry = createAvatar(scene, avatarConfig||{}, ()=>{});
    refs.avatarEntryRef = entry;
    refs.avatarRef = entry?.root || null;

    if(retintRef) {
      retintRef.current = (hex) => {
        const e = refs.avatarEntryRef;
        if(!e) return;
        if(isMixamo) retintMixamoAvatar(e, hex);
        else if(isTest) retintTestAvatar(e, hex);
        else retintAvatar(e, hex);
      };
    }
    if(launchRef) launchRef.current = ()=>{ const ls=launchStateRef.current; if(!ls.active){ls.active=true;ls.phase="rise";ls.timer=0;ls.startY=SPAWN[1];}};

    const onCrystal = ()=>window.dispatchEvent(new CustomEvent("crystalActivate"));
    window.addEventListener("crystalActivate", onCrystal);

    let animId;
    const animate = () => {
      animId = requestAnimationFrame(animate);
      const now = performance.now()*0.001;
      if(frameRef.current===0){frameRef.current=1; refs.lastTimeRef=now;}
      let dt = now - refs.lastTimeRef;
      refs.lastTimeRef = now;
      if(dt>0.1) dt=0.1; if(dt<=0) dt=0.016;

      // Pass reference-typed refs so engine modules get .current
      refs.isMobileRef = isMobileRef;
      refs.hbRidingRef = hbRidingRef;
      refs.mobileInputRef = props.mobileInputRef || refs.mobileInputRef;

      const playerState = updatePlayerMovement(refs, dt);
      if(refs.avatarRef) {
        refs.avatarRef.position.set(...playerState.position);
        refs.avatarRef.rotation.y = playerState.rotation;
      }

      updateCamera(refs, dt, playerState.position);
      animateScene(scene, camera, now, dt, { audioBeatRef, audioIntensityRef }, playerState.position, refs);

      renderer.render(scene, camera);
      if(frameRef.current===3) onLoaded?.();
      frameRef.current++;
    };
    animate();
    return () => { cancelAnimationFrame(animId); window.removeEventListener("crystalActivate",onCrystal);
      renderer.dispose(); if(refs.avatarEntryRef) detachHoverboard(refs.avatarEntryRef);
    };
  }, []);

  if(error) {
    return <div className="absolute inset-0 flex items-center justify-center bg-sky-200">
      <p className="text-red-600 font-bold text-sm">{error}</p>
    </div>;
  }

  return <canvas ref={canvasRef} className="w-full h-full block" style={{ touchAction:"none" }} />;
}