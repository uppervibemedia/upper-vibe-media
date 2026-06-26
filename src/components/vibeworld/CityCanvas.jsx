import React, { useRef, useEffect, useState, useCallback } from "react";
import * as THREE from "three";
import { SPAWN } from "./cityData";
import buildPark from "./city-engine/sceneSetup";
import { MOVE_SPEED, ACCELERATION, DECELERATION, CAM_PITCH_MIN, CAM_PITCH_MAX, CAM_DIST, CAM_HEIGHT, CAM_LOOK_Y, CAM_DIST_LS, CAM_HEIGHT_LS, CAM_LOOK_Y_LS, FOV_PORTRAIT, FOV_LANDSCAPE, AVATAR_R, COLLISION_BOXES, resolveCollisions } from "./city-engine/playerMovement";
import { animateFerrisWheel, getRiderCameraTransform } from "./FerrisWheel";
import { animateZenBeach } from "./ZenBeach";
import { animateDanceFloor } from "./DanceFloor";
import { animateJukebox } from "./Jukebox";
import { animateLaunchZone, getNearLaunchPad, collectNearbyOrbs, triggerLandingPulse, LAUNCH_HEIGHT, LAUNCH_DURATION, GLIDE_DURATION } from "./VibeLaunchZone";
import { animateHoverboardZone, resetOrbs, collectOrb } from "./HoverboardRingRun";
import { animateCrystalZone, activateCrystalZone } from "./CrystalZone";
import { animateCosmicSky } from "./CosmicSkySystem";
import { createAvatar, createRemoteAvatar, updateAvatarAnimation, retintAvatar, attachHoverboard, detachHoverboard } from "./AvatarModel.jsx";
import { createTestAvatar, updateTestAvatarAnimation, retintTestAvatar } from "./AvatarModelTest";
import { createMixamoAvatar, updateMixamoAvatarAnimation, retintMixamoAvatar } from "./AvatarModelMixamo";

const {
  WebGLRenderer,
  Scene,
  PerspectiveCamera,
  Vector3,
  PCFSoftShadowMap,
  BufferGeometry,
  BufferAttribute,
  PointsMaterial,
  Points
} = THREE;

export default function CityCanvas({ onLoaded, onPositionChange, onRemoteAvatarClick, stageCanvas, audioIntensityRef, audioBassRef, audioBeatRef, locked, stageScreenPosRef, remoteUsers, isDancing = false, activeEmote = null, avatarConfig, onJukeboxProximity, retintRef, launchRef, onNearPad, djTrack, hbRiding = false, ferrisRiding = false, spawnOverride = null, rendererRef = null, tvMode = false, tvQuality = "smooth", ...props }) {
  const canvasRef = useRef(null);
  const [error, setError] = useState(null);
  const isMobileRef = useRef(false);

  useEffect(() => {
    isMobileRef.current = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
  }, []);

  const sceneRef = useRef(null);
  const avatarRef = useRef(null);
  const avatarEntryRef = useRef(null);
  const effectiveSpawn = spawnOverride
    ? [spawnOverride.x, SPAWN[1], spawnOverride.z, spawnOverride.rot || 0]
    : [SPAWN[0], SPAWN[1], SPAWN[2], 0];
  const avatarPosRef = useRef(effectiveSpawn);
  const velocityRef = useRef({ x: 0, z: 0 });
  const avatarRotRef = useRef(spawnOverride?.rot || 0);
  const keysRef = useRef({});
  const mouseRef = useRef({ down: false, dx: 0, dy: 0, button: 0 });
  const camYawRef = useRef(0);
  const camYawSmoothRef = useRef(0);
  const camPitchRef = useRef(0.08);
  const camPitchSmoothRef = useRef(0.08);
  const userTouchingCamRef = useRef(false);
  const remoteAvatarsRef = useRef({});
  const cameraRef = useRef(null);
  const fallbackInputRef = useRef({ x: 0, y: 0, camDx: 0, camDy: 0 });
  const mobileInputRef = props.mobileInputRef || fallbackInputRef;
  const tvModeRef = useRef(tvMode);
  tvModeRef.current = tvMode;
  const tvQualityRef = useRef(tvQuality);
  tvQualityRef.current = tvQuality;
  const lockedRef = useRef(locked);
  lockedRef.current = locked;
  const isDancingRef = useRef(isDancing);
  isDancingRef.current = isDancing;
  const hbRidingRef = useRef(hbRiding);
  hbRidingRef.current = hbRiding;
  const ferrisRidingRef = useRef(ferrisRiding);
  ferrisRidingRef.current = ferrisRiding;
  const lastTimeRef = useRef(0);
  const frameRef = useRef(0);
  const launchStateRef = useRef({ active: false, phase: "idle", timer: 0, startY: 0 });
  const nearPadRef = useRef(-1);
  const speedBoostUntilRef = useRef(0);
  const onPosCbRef = useRef(onPositionChange);
  onPosCbRef.current = onPositionChange;
  const onJukeboxProxRef = useRef(onJukeboxProximity);
  onJukeboxProxRef.current = onJukeboxProximity;
  const djTrackRef = useRef(djTrack);
  djTrackRef.current = djTrack;
  const activeEmoteRef = useRef(activeEmote);
  activeEmoteRef.current = activeEmote;
  const orbCountRef = useRef(0);
  const splashParticlesRef = useRef(null);
  const prevLockedRef = useRef(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const renderer = new WebGLRenderer({ canvas, antialias: !isMobileRef.current, powerPreference: isMobileRef.current ? "low-power" : "high-performance" });
    renderer.setClearColor(0x0A1020);
    if(rendererRef) rendererRef.current = renderer;
    renderer.setPixelRatio(isMobileRef.current ? Math.min(window.devicePixelRatio, 1.5) : Math.min(window.devicePixelRatio, 2));
    renderer.setSize(canvas.clientWidth, canvas.clientHeight);
    renderer.shadowMap.enabled = !isMobileRef.current;
    renderer.shadowMap.type = PCFSoftShadowMap;

    const scene = new Scene();
    sceneRef.current = scene;
    const aspect = canvas.clientWidth / (canvas.clientHeight || 1);
    const camera = new PerspectiveCamera(60, aspect, 0.1, isMobileRef.current ? 130 : 160);
    cameraRef.current = camera;
    const [spX, spY, spZ] = effectiveSpawn;
    const spawnLS = isMobileRef.current && window.innerWidth > window.innerHeight;
    camera.fov = spawnLS ? FOV_LANDSCAPE : FOV_PORTRAIT;
    camera.updateProjectionMatrix();
    camera.position.set(spX, spY + (spawnLS ? CAM_HEIGHT_LS : CAM_HEIGHT), spZ + (spawnLS ? CAM_DIST_LS : CAM_DIST));
    camera.lookAt(spX, spY + CAM_LOOK_Y, spZ);

    buildPark(scene);

    const onCrystalActivate = () => activateCrystalZone(scene);
    window.addEventListener("crystalActivate", onCrystalActivate);

    if (launchRef) {
      launchRef.current = () => {
        const ls = launchStateRef.current;
        if (!ls.active) { ls.active = true; ls.phase = "rise"; ls.timer = 0; ls.startY = SPAWN[1]; }
      };
    }

    const avatarTypeKey = avatarConfig?.avatarTypeKey || "current";
    const isMixamoAvatar = avatarTypeKey === "test-mixamo" || avatarTypeKey === "test-mixamo-female";
    const isTestAvatar = avatarTypeKey === "test-male" || avatarTypeKey === "test-female";
    const gender = avatarTypeKey === "test-female" || avatarTypeKey === "test-mixamo-female" ? "female" : "male";
    let entry;
    if (isMixamoAvatar) {
      entry = createMixamoAvatar(scene, { spawnX: effectiveSpawn[0], spawnY: effectiveSpawn[1], spawnZ: effectiveSpawn[2], gender, outfitColorKey: avatarConfig?.outfitColorKey, skinToneKey: avatarConfig?.skinTone }, null);
    } else if (isTestAvatar) {
      entry = createTestAvatar(scene, gender, avatarConfig || {}, () => {});
    } else {
      entry = createAvatar(scene, avatarConfig || {}, () => {});
    }
    avatarEntryRef.current = entry;
    avatarRef.current = entry?.root || null;

    if (retintRef) {
      retintRef.current = (hex) => {
        const e = avatarEntryRef.current;
        if (!e) return;
        if (isMixamoAvatar) retintMixamoAvatar(e, hex);
        else if (isTestAvatar) retintTestAvatar(e, hex);
        else retintAvatar(e, hex);
      };
    }

    let animId;
    const animate = () => {
      animId = requestAnimationFrame(animate);
      const now = performance.now() * 0.001;
      if (lastTimeRef.current === 0) lastTimeRef.current = now;
      let dt = now - lastTimeRef.current;
      lastTimeRef.current = now;
      if (dt > 0.1) dt = 0.1;
      if (dt <= 0) dt = 0.016;

      const keys = keysRef.current;
      const mouse = mouseRef.current;
      let [px, py, pz] = avatarPosRef.current;
      let rot = avatarRotRef.current;
      const vel = velocityRef.current;
      const ws = Math.sqrt(vel.z * vel.z + vel.x * vel.x);

      const isLocks = lockedRef.current || ferrisRidingRef.current;
      const isHB = hbRidingRef.current;
      const isMobile = isMobileRef.current;
      const mi = mobileInputRef;
      const camDx = isMobile ? mi.current?.camDx || 0 : mouse.dx;
      const mouseButton = isMobile ? 0 : mouse.button;

      // ── Launch physics ─────────────────────────────────────────────────
      const ls = launchStateRef.current;
      const isLau = ls.active;
      const hbActive = isHB;
      if (isLau) {
        ls.timer += dt;
        if (ls.phase === "rise") {
          const progress = Math.min(1, ls.timer / LAUNCH_DURATION);
          py = ls.startY + LAUNCH_HEIGHT * progress;
          if (progress >= 1) { ls.phase = "glide"; }
        } else if (ls.phase === "glide") {
          py = ls.startY + LAUNCH_HEIGHT;
          const glideProgress = Math.min(1, (ls.timer - LAUNCH_DURATION) / GLIDE_DURATION);
          pz += (dt * MOVE_SPEED * 1.6) * (1 - glideProgress);
          if (glideProgress >= 1 || pz > 38) {
            ls.phase = "land";
          }
        } else if (ls.phase === "land") {
          ls.timer += dt;
          const landProgress = Math.min(1, ls.timer / 0.24);
          py -= dt * 14;
          if (py <= ls.startY) {
            py = ls.startY;
            ls.phase = "idle"; ls.active = false; ls.timer = 0;
            triggerLandingPulse(scene, px, pz);
            const earned = orbCountRef.current;
            if (earned > 0) { onNearPad(-1, false, earned); orbCountRef.current = 0; }
          }
        }
      } else if (!isLocks) {
        if (isMobile) {
          const moveScale = MOVE_SPEED * 1.3;
          vel.x += -(mi.current?.x || 0) * moveScale * dt;
          vel.z += -(mi.current?.y || 0) * moveScale * dt;
          if (mi.current?.camDx || mi.current?.camDy) {
            camYawRef.current -= mi.current.camDx * 0.016;
            camPitchRef.current = Math.max(CAM_PITCH_MIN, Math.min(CAM_PITCH_MAX, camPitchRef.current + mi.current.camDy * 0.014));
          }
        } else {
          const moveScale = MOVE_SPEED;
          const accel = ACCELERATION;
          if (keys["KeyW"] || keys["ArrowUp"]) vel.x += moveScale * Math.cos(rot) * accel * dt; // forward
          if (keys["KeyA"] || keys["ArrowLeft"]) vel.z -= moveScale * accel * dt; // left
          if (keys["KeyD"] || keys["ArrowRight"]) vel.z += moveScale * accel * dt; // right
          if (keys["KeyS"] || keys["ArrowDown"]) vel.x -= moveScale * Math.cos(rot) * accel * dt; // backward
        }
      }

      // Rotate toward movement direction (non-mobile)
      if (!isMobile && !isLocks) {
        let targetRot = rot;
        const oldVel = vel;
        const ws = Math.sqrt(vel.z * vel.z + vel.x * vel.x);
        if (ws > 0.01) {
          let angle = Math.atan2(vel.z, -vel.x);
          if (camDx > 1) angle = rot - 0.04;
          else if (camDx < -1) angle = rot + 0.04;
          targetRot = angle;
          const diff = targetRot - rot;
          rot += Math.atan2(Math.sin(diff), Math.cos(diff)) * Math.min(1, dt * 10);
        } else if (camDx !== 0) {
          rot += camDx * 0.00015;
        }
      } else if (isMobile && !isLocks) {
        if (camDx !== 0) {
          const move = (-camDx || 0) * 0.0002;
          rot += move;
        }
      }

      avatarRotRef.current = rot;

      // Hoverboard physics
      if (hbActive && !isLau) {
        vel.x += dt * (keys["KeyW"] ? 0.8 : keys["KeyS"] ? -0.3 : 0);
        const hbTarget = 2.5;
        const diffX = hbTarget - vel.x;
        vel.x += diffX * dt * 3;
        const drift = Math.sin(now * 1.5 + px) * 0.18;
        vel.z += drift * dt;
      }

      // Apply velocity
      if (!isLau) {
        const airDamp = hbActive ? 0.4 : 0.03;
        const decel = hbActive ? 0.15 : DECELERATION;
        const resist = 1 - decel * dt;
        if (ws > 0.05) { vel.x *= resist; vel.z *= resist; }
        px += vel.x * dt;
        pz += vel.z * dt;
      }

      // Collision
      const colR = hbActive ? 0.25 : AVATAR_R;
      [px, pz] = resolveCollisions(px, pz, colR, COLLISION_BOXES, hbActive);

      // Landing screen height
      if (!isLau) py = SPAWN[1];
      avatarPosRef.current[0] = px; avatarPosRef.current[1] = py; avatarPosRef.current[2] = pz;

      // Camera
      const sp = spawnLS;
      const cDist = sp ? CAM_DIST_LS : CAM_DIST;
      const cHeight = sp ? CAM_HEIGHT_LS : CAM_HEIGHT;
      const cLookY = sp ? CAM_LOOK_Y_LS : CAM_LOOK_Y;
      const pitch = camPitchRef.current;
      const targetYaw = (isMobile ? mi.current?.camDx || 0 : camDx) !== 0 ? camYawRef.current : camYawRef.current;

      // Apply rotations with smoothing per the original structure
      camYawRef.current -= (mouseButton === 0 && !isMobile ? mouse.dx * 0.003 : (isMobile ? -camDx * 0.002 : 0));
      camPitchRef.current = Math.max(CAM_PITCH_MIN, Math.min(CAM_PITCH_MAX,
        camPitchRef.current + (mouseButton === 1 && !isMobile ? -mouse.dy * 0.003 : (isMobile ? -camDx * 1.0 * 0.0001 : 0))
      ));

      const smooth = 6 * dt;
      camYawSmoothRef.current += (camYawRef.current - camYawSmoothRef.current) * Math.min(1, smooth);
      camPitchSmoothRef.current += (camPitchRef.current - camPitchSmoothRef.current) * Math.min(1, smooth);

      camera.position.set(
        px + Math.sin(-rot + camYawSmoothRef.current) * cDist,
        py + cHeight + Math.sin(camPitchSmoothRef.current) * 0.3,
        pz + Math.cos(-rot + camYawSmoothRef.current) * cDist
      );
      camera.lookAt(px, py + cLookY, pz);

      // Mouse delta reset
      if (!isMobile) { mouse.dx = 0; mouse.dy = 0; }

      // Avatar entry rotation & animation
      const eEntry = avatarEntryRef.current;
      if (eEntry?.root) {
        eEntry.root.position.set(px, py, pz);
        rot = isMobile || isLocks ? avatarRotRef.current : rot;
        const ang = Math.atan2(vel.z, -vel.x) || rot;
        const targetA = isLocks || (ws < 0.1 && Math.abs(mouse.dx) === 0) ? rot : ang;
        const dA = targetA - avatarRotRef.current;
        avatarRotRef.current += Math.atan2(Math.sin(dA), Math.cos(dA)) * Math.min(1, dt * (hbActive ? 5 : 8));
        eEntry.root.rotation.y = avatarRotRef.current;
      }

      const cbPos = onPosCbRef.current;
      if (cbPos) cbPos(px, pz, avatarRotRef.current);

      // Remote avatars
      const remoteIds = remoteUsers.map(u => u.id);
      const rAvs = remoteAvatarsRef.current;
      Object.keys(rAvs).forEach(id => { if (!remoteIds.includes(id)) { scene.remove(rAvs[id]); delete rAvs[id]; } });
      remoteUsers.forEach(ru => {
        const rId = ru.id;
        if (!rAvs[rId] && avatarRef.current && !isLau) {
          rAvs[rId] = createRemoteAvatar(scene, rId, ru.username || "", "", "", "", "#4B0082");
        }
        if (rAvs[rId] && ru.position) {
          rAvs[rId].position.set(ru.position.x, SPAWN[1], ru.position.z);
          let raRot = ru?.rotation?.y || 0;
          const dir = ru?.velocity ? Math.atan2((ru.velocity.z || 0), -(ru.velocity.x || 0)) : raRot;
          if (Math.sqrt((ru.velocity?.x || 0) ** 2 + (ru.velocity?.z || 0) ** 2) > 0.1) raRot = dir;
          rAvs[rId].rotation.y += (raRot - rAvs[rId].rotation.y) * Math.min(1, dt * 5);
        }
      });

      // Zone animations
      const t = now;
      animateCosmicSky(scene, camera, t, dt);
      animateFerrisWheel(scene, t, dt, px, pz, tvQualityRef.current === "smooth");
      animateDanceFloor(scene, t, audioBeatRef.current, audioIntensityRef.current || 0);
      animateJukebox(scene, t, audioBeatRef.current);
      animateLaunchZone(scene, t, audioBeatRef.current, dt);
      animateHoverboardZone(scene, t, audioBeatRef.current);
      animateCrystalZone(scene, t, dt, px, pz, tvQualityRef.current === "smooth");
      animateZenBeach(scene, t, audioBeatRef.current);

      // Avatar animation
      const isDance = isDancingRef.current;
      const eEmote = activeEmoteRef.current;
      if (eEntry) {
        if (isMixamoAvatar) updateMixamoAvatarAnimation(eEntry, ws, isDance, dt, isHB, eEmote?.id);
        else if (isTestAvatar) updateTestAvatarAnimation(eEntry, ws, isDance, dt);
        else updateAvatarAnimation(eEntry, ws, isDance, dt, isHB);
      }

      // Stage screen texture
      if (stageCanvas && scene.userData.stageScreen) {
        const tex = new THREE.CanvasTexture(stageCanvas);
        scene.userData.stageScreen.material = new THREE.MeshBasicMaterial({ map: tex });
      }

      // Launch proximity + orb collection
      const nearPad = isLau ? -1 : getNearLaunchPad(px, pz);
      if (!isLau) {
        const orbs = collectNearbyOrbs(scene, px, py, pz);
        if (orbs.length > 0) { orbCountRef.current += orbs.length; }
      }
      if (nearPad >= 0) {
        if (!animateCosmicSky) null; // expression kept for structure
      }
      nearPadRef.current = nearPad;
      const pIsAirborne = isLau;
      onNearPad(nearPad, pIsAirborne, orbCountRef.current);

      renderer.render(scene, camera);
      if (frameRef.current === 3) onLoaded?.();
      frameRef.current++;
    };
    animate();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("crystalActivate", onCrystalActivate);
      renderer.dispose();
      if (avatarEntryRef.current) detachHoverboard(avatarEntryRef.current);
    };
  }, []);

  useEffect(() => {
    const isMobile = isMobileRef.current;
    canvasRef.current?.focus();

    const handleKey = (e) => {
      if (lockedRef.current) return;
      if (["KeyW","KeyA","KeyS","KeyD","ArrowUp","ArrowDown","ArrowLeft","ArrowRight"].includes(e.code)) {
        e.preventDefault();
        keysRef.current[e.type === "keydown" ? "down" : "up"] = e.code;
      }
      if (["w","a","s","d"].includes(e.code)) e.preventDefault();
    };

    const attachListeners = () => {
      window.addEventListener("keydown", (e) => {
        if (["w","a","s","d","arrowup","arrowdown","arrowleft","arrowright"].indexOf(e.code.toLowerCase()) !== -1) {
          if (!lockedRef.current) e.preventDefault();
          keysRef.current[e.code] = true;
        }
      });
      window.addEventListener("keyup", (e) => { keysRef.current[e.code] = false; });
    };
    attachListeners();
    return () => {};
  }, []);

  useEffect(() => {
    if (isMobileRef.current) return;
    const handleMouseDown = (e) => {
      if (lockedRef.current) return;
      mouseRef.current.down = true;
      mouseRef.current.button = e.button;
      mouseRef.current.dx = 0;
      mouseRef.current.dy = 0;
    };
    const handleMouseMove = (e) => {
      if (!mouseRef.current.down || lockedRef.current) return;
      mouseRef.current.dx += e.movementX;
      mouseRef.current.dy += e.movementY;
    };
    const handleMouseUp = () => { mouseRef.current.down = false; };
    window.addEventListener("mousedown", handleMouseDown);
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousedown", handleMouseDown);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, []);

  return <canvas ref={canvasRef} className="w-full h-full block" style={{ touchAction: "none" }} />;
}