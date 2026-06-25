import React, { useRef, useEffect, useState, useCallback } from "react";
import * as THREE from "three";
import { buildPark } from "./park";
import { SPAWN } from "./cityData";
import { setupInputListeners } from "./input";
import { animateScene } from "./animation";

const {
  WebGLRenderer,
  Scene,
  PerspectiveCamera,
  MeshStandardMaterial,
  Color,
  Vector3,
  PCFSoftShadowMap,
} = THREE;

const CAM_DIST = 5.5;
const CAM_HEIGHT = 2.4;
const CAM_LOOK_Y = 0.9;
const CAM_PITCH_MIN = -0.35;
const CAM_PITCH_MAX = 0.22;
const CAM_DIST_LS = 3.5;
const CAM_HEIGHT_LS = 1.75;
const CAM_LOOK_Y_LS = 1.35;
const FOV_PORTRAIT = 52;
const FOV_LANDSCAPE = 60;

export default function CityCanvas({ onLoaded, onPositionChange, onRemoteAvatarClick, stageCanvas, audioIntensityRef, audioBassRef, audioBeatRef, locked, stageScreenPosRef, remoteUsers, isDancing = false, activeEmote = null, avatarConfig, onJukeboxProximity, retintRef, launchRef, onNearPad, djTrack, hbRiding = false, ferrisRiding = false, spawnOverride = null, rendererRef = null, tvMode = false, tvQuality = "smooth", ...props }) {
  const canvasRef = useRef(null);
  const [error, setError] = useState(null);
  const [isMobile, setIsMobile] = useState(false);

  const animationState = useRef({
    scene: null,
    camera: null,
    renderer: null,
    avatar: null,
    avatarEntry: null,
    avatarPos: spawnOverride ? [spawnOverride.x, SPAWN[1], spawnOverride.z, spawnOverride.rot || 0] : [...SPAWN, 0],
    velocity: { x: 0, z: 0 },
    avatarRot: spawnOverride?.rot || 0,
    camYaw: 0,
    camYawSmooth: 0,
    camPitch: 0.08,
    camPitchSmooth: 0.08,
    userTouchingCam: false,
    remoteAvatars: {},
    keys: {},
    mouse: { down: false, dx: 0, dy: 0, button: 0 },
    mobileInput: props.mobileInputRef || { x: 0, y: 0, camDx: 0, camDy: 0 },
    lastTime: 0,
    frame: 0,
    launchState: { active: false, phase: "idle", timer: 0, startY: 0 },
    orbCount: 0,
    nearPad: -1,
    speedBoostUntil: 0,
    splashParticles: null,
    isDancing: isDancing,
    activeEmote: activeEmote,
    hbRiding: hbRiding,
    ferrisRiding: ferrisRiding,
    locked: locked,
    prevLocked: false,
    tvMode: tvMode,
    tvQuality: tvQuality,
    isMobile: false,
    remoteUsers: remoteUsers || [],
    djTrack: djTrack,
  }).current;

  useEffect(() => { animationState.isDancing = isDancing; }, [isDancing]);
  useEffect(() => { animationState.activeEmote = activeEmote; }, [activeEmote]);
  useEffect(() => { animationState.hbRiding = hbRiding; }, [hbRiding]);
  useEffect(() => { animationState.locked = locked; }, [locked]);
  useEffect(() => { animationState.tvMode = tvMode; }, [tvMode]);
  useEffect(() => { animationState.tvQuality = tvQuality; }, [tvQuality]);
  useEffect(() => { animationState.remoteUsers = remoteUsers || []; }, [remoteUsers]);
  useEffect(() => { animationState.djTrack = djTrack; }, [djTrack]);

  useEffect(() => {
    animationState.ferrisRiding = ferrisRiding;
    if (!ferrisRiding) {
        if(animationState.avatar) animationState.avatar.visible = true;
        animationState.rideState = null;
        if(animationState.scene) {
            const cv = animationState.scene.userData._camVecs;
            if (cv) cv.rLookInitialized = false;
        }
    }
  }, [ferrisRiding]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    try {
      const mobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
      setIsMobile(mobile);
      animationState.isMobile = mobile;

      const renderer = new WebGLRenderer({
        canvas,
        antialias: !mobile,
        powerPreference: mobile ? "low-power" : "high-performance",
      });
      renderer.setClearColor(0x0A1020);
      if (rendererRef) rendererRef.current = renderer;
      
      const basePR = mobile ? Math.min(window.devicePixelRatio, 1.5) : Math.min(window.devicePixelRatio, 2);
      renderer.setPixelRatio(basePR);
      
      const rw = mobile ? window.innerWidth : canvas.clientWidth;
      const rh = mobile ? window.innerHeight : canvas.clientHeight;
      renderer.setSize(rw, Math.max(rh, 1));
      renderer.shadowMap.enabled = !mobile;
      renderer.shadowMap.type = PCFSoftShadowMap;

      const scene = new Scene();
      animationState.scene = scene;

      const asp = rw / Math.max(rh, 1);
      const camera = new PerspectiveCamera(52, asp, 0.1, mobile ? 130 : 160);
      animationState.camera = camera;

      const [spX, spY, spZ] = animationState.avatarPos;
      const spawnLS = mobile && window.innerWidth > window.innerHeight;
      camera.fov = spawnLS ? FOV_LANDSCAPE : FOV_PORTRAIT;
      camera.updateProjectionMatrix();
      camera.position.set(spX, spY + (spawnLS ? CAM_HEIGHT_LS : CAM_HEIGHT), spZ + (spawnLS ? CAM_DIST_LS : CAM_DIST));
      camera.lookAt(spX, spY + (spawnLS ? CAM_LOOK_Y_LS : CAM_LOOK_Y), spZ);

      buildPark(scene, mobile, {
        avatarConfig,
        retintRef,
        launchRef,
        onLoaded
      }, animationState);
      
      animationState.renderer = renderer;

      let animId;
      const animate = () => {
        animId = requestAnimationFrame(animate);
        animateScene(animationState, {
          onPositionChange,
          onJukeboxProximity,
          onNearPad,
          stageCanvas,
          audioIntensityRef,
          audioBassRef,
          audioBeatRef,
          stageScreenPosRef
        });
      };

      animate();

      const onResize = () => {
        if (!canvas) return;
        const w = animationState.isMobile ? window.innerWidth : canvas.clientWidth;
        const h = animationState.isMobile ? window.innerHeight : canvas.clientHeight;
        renderer.setSize(w, Math.max(h, 1));
        camera.aspect = w / Math.max(h, 1);
        camera.updateProjectionMatrix();
      };
      window.addEventListener("resize", onResize);

      const cleanupInput = setupInputListeners(canvas, animationState, onRemoteAvatarClick);

      return () => {
        cancelAnimationFrame(animId);
        window.removeEventListener("resize", onResize);
        cleanupInput();
        renderer.dispose();
        scene.traverse((obj) => {
          if (obj.geometry) obj.geometry.dispose();
          if (obj.material) {
            if (Array.isArray(obj.material)) obj.material.forEach((m) => m.dispose());
            else obj.material.dispose();
          }
        });
      };
    } catch (e) {
      console.error("[CityCanvas] init error:", e);
      setError(e.message || String(e));
    }
  }, []);

  if (error) {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-sky-200">
        <div className="text-center px-6">
          <p className="text-red-600 font-bold text-sm mb-2">3D Error</p>
          <p className="text-xs text-gray-500 mb-4 max-w-md">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 rounded-lg bg-blue-500 text-white text-xs font-bold"
          >
            Reload
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        position: "relative",
        width: isMobile ? "100vw" : "100%",
        height: isMobile ? "100dvh" : "100%",
      }}
    >
      <canvas
        ref={canvasRef}
        className="w-full h-full block"
        style={{ touchAction: "none" }}
      />
    </div>
  );
}