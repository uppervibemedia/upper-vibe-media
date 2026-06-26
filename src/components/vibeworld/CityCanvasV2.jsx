import React, { useRef, useEffect, useState, useCallback } from "react";
import * as THREE from "three";
import buildPark from "./city-engine/sceneSetup";
import { updatePlayerMovement } from "./city-engine/playerMovement";
import { updateCamera } from "./city-engine/cameraController";
import { animateScene } from "./city-engine/animationLoop";
import { SPAWN } from "./city-engine/cityConfig";

import { createAvatar, createRemoteAvatar, updateAvatarAnimation, retintAvatar, attachHoverboard, detachHoverboard } from "./AvatarModel.jsx";
import { createTestAvatar, updateTestAvatarAnimation, retintTestAvatar } from "./AvatarModelTest";
import { createMixamoAvatar, updateMixamoAvatarAnimation, retintMixamoAvatar } from "./AvatarModelMixamo";

export default function CityCanvasV2({ onLoaded, onPositionChange, onRemoteAvatarClick, stageCanvas, audioIntensityRef, audioBassRef, audioBeatRef, locked, stageScreenPosRef, remoteUsers, isDancing = false, activeEmote = null, avatarConfig, onJukeboxProximity, retintRef, launchRef, onNearPad, djTrack, hbRiding = false, ferrisRiding = false, spawnOverride = null, rendererRef = null, tvMode = false, tvQuality = "smooth", ...props }) {
  const canvasRef = useRef(null);
  const [error, setError] = useState(null);
  
  const isMobileRef = useRef(/iPhone|iPad|iPod|Android/i.test(navigator.userAgent));

  const effectiveSpawn = spawnOverride ? [spawnOverride.x, SPAWN[1], spawnOverride.z, spawnOverride.rot || 0] : [...SPAWN, 0];
  
  const refs = useRef({
    sceneRef: null,
    cameraRef: null,
    avatarRef: null,
    avatarEntryRef: null,
    avatarPosRef: effectiveSpawn,
    velocityRef: { x: 0, z: 0 },
    avatarRotRef: spawnOverride?.rot || 0,
    keysRef: {},
    mouseRef: { down: false, dx: 0, dy: 0, button: 0 },
    camYawRef: 0,
    camYawSmoothRef: 0,
    camPitchRef: 0.08,
    camPitchSmoothRef: 0.08,
    userTouchingCamRef: false,
    remoteAvatarsRef: {},
    mobileInputRef: props.mobileInputRef || { x: 0, y: 0, camDx: 0 },
    tvModeRef: tvMode,
    tvQualityRef: tvQuality,
    lockedRef: locked,
    prevLockedRef: locked,
    isDancingRef: isDancing,
    hbRidingRef: hbRiding,
    ferrisRidingRef: ferrisRiding,
    activeEmoteRef: activeEmote,
    lastTimeRef: 0,
    frameRef: 0,
    launchStateRef: { active: false, phase: "idle", timer: 0, startY: 0 },
    nearPadRef: -1,
    speedBoostUntilRef: 0,
    isMobile: isMobileRef.current,
  }).current;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let animId;
    try {
      const renderer = new THREE.WebGLRenderer({ canvas, antialias: !refs.isMobile, powerPreference: refs.isMobile ? "low-power" : "high-performance" });
      renderer.setClearColor(0x0A1020);
      renderer.setPixelRatio(refs.isMobile ? Math.min(window.devicePixelRatio, 1.5) : Math.min(window.devicePixelRatio, 2));
      renderer.setSize(canvas.clientWidth, canvas.clientHeight);
      renderer.shadowMap.enabled = !refs.isMobile;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      if(rendererRef) rendererRef.current = renderer;
      
      const scene = new THREE.Scene();
      refs.sceneRef = scene;

      const camera = new THREE.PerspectiveCamera(52, canvas.clientWidth / canvas.clientHeight, 0.1, refs.isMobile ? 130 : 160);
      refs.cameraRef = camera;

      buildPark(scene);

      // This is a simplified placeholder. In a real scenario, you'd have a more robust
      // way to manage avatar creation and state.
      const avatarEntry = createAvatar(scene, avatarConfig || {}, () => {});
      refs.avatarEntryRef = avatarEntry;
      refs.avatarRef = avatarEntry.root;

      const animate = () => {
        animId = requestAnimationFrame(animate);
        const now = performance.now() * 0.001;
        if (refs.lastTimeRef === 0) refs.lastTimeRef = now;
        let dt = now - refs.lastTimeRef;
        refs.lastTimeRef = now;
        if (dt > 0.1) dt = 0.1;
        if (dt <= 0) dt = 0.016;

        const playerState = updatePlayerMovement(refs, dt);
        if(refs.avatarRef) {
          refs.avatarRef.position.set(...playerState.position);
          refs.avatarRef.rotation.y = playerState.rotation;
        }
        
        updateCamera(refs, dt, playerState.position);

        animateScene(scene, camera, now, dt, { audioBeatRef, audioIntensityRef }, playerState.position, refs);
        
        renderer.render(scene, camera);
        refs.frameRef++;
      };

      animate();

    } catch (e) {
      setError(e.message);
    }

    return () => {
      if (animId) cancelAnimationFrame(animId);
    };

  }, []);

  return <canvas ref={canvasRef} className="w-full h-full block" style={{ touchAction: "none" }} />;
}