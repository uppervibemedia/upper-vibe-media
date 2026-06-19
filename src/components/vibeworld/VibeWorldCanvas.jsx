import React, { useRef, useEffect, useCallback } from "react";
import * as THREE from "three";
import { useNavigate } from "react-router-dom";

/* ── Constants ── */
const PORTALS = [
  { id: "music", label: "Music Library", route: "/music", color: 0x00A0DC, pos: [-3, 0.5, -4] },
  { id: "radio", label: "Radio", route: "/radio", color: 0x9B7EFF, pos: [3, 0.5, -4] },
  { id: "vibecheck", label: "Vibe Check", route: "/vibe-check", color: 0xEC4899, pos: [0, 0.5, -6] },
  { id: "plus", label: "Upper Vibe Plus", route: "/membership", color: 0xD4A843, pos: [0, 2.2, -4] },
];

const FLOATING_CARDS = [
  { title: "Above The Noise", pos: [-5, 1.8, -2] },
  { title: "Cosmic Traveler", pos: [5, 1.2, -3] },
  { title: "Energy On Go", pos: [-4, 2.5, -5] },
  { title: "Quantum Ascend", pos: [4, 2.0, -5] },
];

/* ── Helpers ── */
function createGlowTexture(color, size = 128) {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  const c = new THREE.Color(color);
  gradient.addColorStop(0, `rgba(${Math.floor(c.r * 255)},${Math.floor(c.g * 255)},${Math.floor(c.b * 255)},0.6)`);
  gradient.addColorStop(0.4, `rgba(${Math.floor(c.r * 255)},${Math.floor(c.g * 255)},${Math.floor(c.b * 255)},0.15)`);
  gradient.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  return new THREE.CanvasTexture(canvas);
}

function createRoundedRectShape(w, h, r) {
  const shape = new THREE.Shape();
  const x = -w / 2, y = -h / 2;
  shape.moveTo(x + r, y);
  shape.lineTo(x + w - r, y);
  shape.quadraticCurveTo(x + w, y, x + w, y + r);
  shape.lineTo(x + w, y + h - r);
  shape.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  shape.lineTo(x + r, y + h);
  shape.quadraticCurveTo(x, y + h, x, y + h - r);
  shape.lineTo(x, y + r);
  shape.quadraticCurveTo(x, y, x + r, y);
  return shape;
}

/* ── Main Component ── */
export default function VibeWorldCanvas({ onLoaded }) {
  const mountRef = useRef(null);
  const navigate = useNavigate();
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const rendererRef = useRef(null);
  const raycasterRef = useRef(new THREE.Raycaster());
  const mouseRef = useRef(new THREE.Vector2());
  const animIdRef = useRef(null);
  const clockRef = useRef(new THREE.Clock());
  const targetPos = useRef(new THREE.Vector3(0, 1.5, 0));
  const particlesRef = useRef(null);
  const onLoadedRef = useRef(onLoaded);
  onLoadedRef.current = onLoaded;

  useEffect(() => {
    if (!mountRef.current) return;

    const container = mountRef.current;
    const w = container.clientWidth;
    const h = container.clientHeight;

    /* ── Scene ── */
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x050510, 0.00015);
    sceneRef.current = scene;

    /* ── Camera ── */
    const camera = new THREE.PerspectiveCamera(60, w / h, 0.1, 50);
    camera.position.set(0, 1.5, 8);
    camera.lookAt(0, 1.5, -3);
    cameraRef.current = camera;

    /* ── Renderer ── */
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(w, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    /* ── Lighting ── */
    scene.add(new THREE.AmbientLight(0x1a1a3a, 0.6));
    const dirLight = new THREE.DirectionalLight(0x00A0DC, 1.2);
    dirLight.position.set(5, 8, 3);
    scene.add(dirLight);
    const pointLight1 = new THREE.PointLight(0x9B7EFF, 2, 12);
    pointLight1.position.set(-4, 3, -2);
    scene.add(pointLight1);
    const pointLight2 = new THREE.PointLight(0xEC4899, 2, 12);
    pointLight2.position.set(4, 3, -2);
    scene.add(pointLight2);

    /* ── Floor ── */
    const floorGeo = new THREE.PlaneGeometry(30, 30);
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x0a0a1e,
      roughness: 0.5,
      metalness: 0.3,
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -2;
    scene.add(floor);

    /* ── Grid Lines ── */
    const gridHelper = new THREE.PolarGridHelper(10, 32, 24, 64, 0x1a1a3a, 0x1a1a3a);
    gridHelper.position.y = -1.99;
    scene.add(gridHelper);

    /* ── Walls ── */
    const wallGeo = new THREE.PlaneGeometry(14, 5);
    const wallMat = new THREE.MeshStandardMaterial({
      color: 0x0d0d22,
      roughness: 0.6,
      metalness: 0.2,
      side: THREE.DoubleSide,
    });
    // Back wall
    const backWall = new THREE.Mesh(wallGeo, wallMat);
    backWall.position.set(0, 0.5, -7);
    scene.add(backWall);
    // Left wall
    const leftWall = new THREE.Mesh(wallGeo, wallMat);
    leftWall.position.set(-7, 0.5, -2);
    leftWall.rotation.y = Math.PI / 2;
    scene.add(leftWall);
    // Right wall
    const rightWall = new THREE.Mesh(wallGeo, wallMat);
    rightWall.position.set(7, 0.5, -2);
    rightWall.rotation.y = -Math.PI / 2;
    scene.add(rightWall);

    /* ── Glowing accent strips ── */
    const stripGeo = new THREE.BoxGeometry(14, 0.1, 0.1);
    const stripColors = [0x00A0DC, 0x9B7EFF, 0xEC4899];
    stripColors.forEach((color, i) => {
      const mat = new THREE.MeshBasicMaterial({ color });
      const strip = new THREE.Mesh(stripGeo, mat);
      strip.position.set(0, 3 - i * 0.3, -7);
      scene.add(strip);
    });

    /* ── Floating particles ── */
    const particlesGeo = new THREE.BufferGeometry();
    const count = 300;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const colorOptions = [
      new THREE.Color(0x00A0DC),
      new THREE.Color(0x9B7EFF),
      new THREE.Color(0xEC4899),
      new THREE.Color(0xD4A843),
    ];
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 14;
      positions[i * 3 + 1] = Math.random() * 5 - 1;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 7 - 3;
      const col = colorOptions[Math.floor(Math.random() * colorOptions.length)];
      colors[i * 3] = col.r;
      colors[i * 3 + 1] = col.g;
      colors[i * 3 + 2] = col.b;
    }
    particlesGeo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    particlesGeo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    const particlesMat = new THREE.PointsMaterial({
      size: 0.04,
      vertexColors: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      transparent: true,
      opacity: 0.7,
    });
    const particles = new THREE.Points(particlesGeo, particlesMat);
    scene.add(particles);
    particlesRef.current = particles;

    /* ── Portals ── */
    const portalObjects = [];
    PORTALS.forEach((portal) => {
      const group = new THREE.Group();
      group.position.set(...portal.pos);
      group.userData = { type: "portal", route: portal.route, id: portal.id };

      // Ring
      const ringGeo = new THREE.TorusGeometry(1, 0.08, 16, 64);
      const ringMat = new THREE.MeshStandardMaterial({
        color: portal.color,
        roughness: 0.3,
        metalness: 0.5,
        emissive: portal.color,
        emissiveIntensity: 0.6,
      });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      group.add(ring);

      // Glow disc
      const glowSprite = new THREE.Sprite(new THREE.SpriteMaterial({
        map: createGlowTexture(portal.color),
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        transparent: true,
        opacity: 0.5,
      }));
      glowSprite.scale.set(2.5, 2.5, 1);
      group.add(glowSprite);

      // Label sprite
      const labelCanvas = document.createElement("canvas");
      labelCanvas.width = 512;
      labelCanvas.height = 64;
      const lctx = labelCanvas.getContext("2d");
      lctx.fillStyle = "#ffffff";
      lctx.font = "bold 20px Inter, sans-serif";
      lctx.textAlign = "center";
      lctx.fillText(portal.label, 256, 36);
      const labelTex = new THREE.CanvasTexture(labelCanvas);
      labelTex.minFilter = THREE.LinearFilter;
      const labelSprite = new THREE.Sprite(new THREE.SpriteMaterial({
        map: labelTex,
        transparent: true,
        depthTest: false,
        depthWrite: false,
      }));
      labelSprite.position.y = 1.3;
      labelSprite.scale.set(2.5, 0.625, 1);
      group.add(labelSprite);

      scene.add(group);
      portalObjects.push(group);
    });

    /* ── Floating song cards ── */
    FLOATING_CARDS.forEach((card) => {
      const group = new THREE.Group();
      group.position.set(...card.pos);
      group.userData = { type: "card", title: card.title };

      // Card body
      const cardShape = createRoundedRectShape(1.2, 0.8, 0.1);
      const cardGeo = new THREE.ExtrudeGeometry(cardShape, { depth: 0.05, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.02, bevelSegments: 3 });
      const cardMat = new THREE.MeshStandardMaterial({
        color: 0x1a1a3a,
        roughness: 0.3,
        metalness: 0.4,
        emissive: 0x0a0a1e,
        emissiveIntensity: 0.3,
      });
      const cardMesh = new THREE.Mesh(cardGeo, cardMat);
      cardMesh.rotation.x = -0.1;
      cardMesh.rotation.y = 0.1;
      group.add(cardMesh);

      // Glow border
      const edgeGeo = new THREE.EdgesGeometry(cardGeo);
      const edgeLine = new THREE.LineSegments(edgeGeo, new THREE.LineBasicMaterial({
        color: 0x00A0DC,
        transparent: true,
        opacity: 0.4,
      }));
      edgeLine.rotation.copy(cardMesh.rotation);
      group.add(edgeLine);

      scene.add(group);
    });

    /* ── Center crystal / 432 Hz symbol ── */
    const crystalGroup = new THREE.Group();
    crystalGroup.position.set(0, 0, 0);
    // Octahedron
    const octGeo = new THREE.OctahedronGeometry(0.5);
    const octMat = new THREE.MeshStandardMaterial({
      color: 0x00A0DC,
      roughness: 0.1,
      metalness: 0.8,
      emissive: 0x003366,
      emissiveIntensity: 0.8,
    });
    const octahedron = new THREE.Mesh(octGeo, octMat);
    crystalGroup.add(octahedron);
    // Glow
    const crystalGlow = new THREE.Sprite(new THREE.SpriteMaterial({
      map: createGlowTexture(0x00A0DC),
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      transparent: true,
      opacity: 0.4,
    }));
    crystalGlow.scale.set(3, 3, 1);
    crystalGroup.add(crystalGlow);
    scene.add(crystalGroup);

    /* ── Event listeners ── */
    const clickables = [...portalObjects];

    const handleResize = () => {
      if (!mountRef.current) return;
      const nw = mountRef.current.clientWidth;
      const nh = mountRef.current.clientHeight;
      camera.aspect = nw / nh;
      camera.updateProjectionMatrix();
      renderer.setSize(nw, nh);
    };

    const handlePointerMove = (e) => {
      const rect = container.getBoundingClientRect();
      mouseRef.current.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouseRef.current.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    };

    const handleClick = (e) => {
      const rect = container.getBoundingClientRect();
      const mx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const my = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      raycasterRef.current.setFromCamera(new THREE.Vector2(mx, my), camera);
      const intersects = raycasterRef.current.intersectObjects(clickables, true);

      if (intersects.length > 0) {
        let obj = intersects[0].object;
        while (obj) {
          if (obj.userData?.type === "portal" && obj.userData?.route) {
            navigate(obj.userData.route);
            return;
          }
          obj = obj.parent;
        }
      }
    };

    window.addEventListener("resize", handleResize);
    container.addEventListener("pointermove", handlePointerMove);
    container.addEventListener("click", handleClick);

    /* ── Animation loop ── */
    const animate = () => {
      const t = clockRef.current.getElapsedTime();

      // Smooth camera toward target
      camera.position.lerp(targetPos.current, 0.02);
      camera.lookAt(0, 1.2, -3);

      // Rotate crystal
      octahedron.rotation.y += 0.005;
      octahedron.rotation.x += 0.002;

      // Rotate portal rings
      portalObjects.forEach((p, i) => {
        p.children.forEach((child) => {
          if (child.geometry?.type === "TorusGeometry") {
            child.rotation.z += 0.008 * (i + 1);
            child.rotation.x += 0.003 * (i + 1);
          }
        });
      });

      // Float particles
      if (particlesRef.current) {
        particlesRef.current.rotation.y += 0.0003;
        particlesRef.current.rotation.x += 0.0001;
      }

      // Bob floating cards
      scene.children.forEach((child) => {
        if (child.userData?.type === "card") {
          child.position.y += Math.sin(t * 1.5 + child.position.x) * 0.003;
          child.rotation.z += 0.003;
        }
      });

      // Hover effect on portals
      raycasterRef.current.setFromCamera(mouseRef.current, camera);
      const hovered = raycasterRef.current.intersectObjects(clickables, true);
      portalObjects.forEach((p) => {
        const isHovered = hovered.some((h) => {
          let obj = h.object;
          while (obj) {
            if (obj === p) return true;
            obj = obj.parent;
          }
          return false;
        });
        p.children.forEach((child) => {
          if (child.material?.emissiveIntensity !== undefined) {
            child.material.emissiveIntensity = THREE.MathUtils.lerp(
              child.material.emissiveIntensity,
              isHovered ? 1.2 : 0.6,
              0.1
            );
          }
        });
        p.scale.lerp(
          new THREE.Vector3(isHovered ? 1.15 : 1, isHovered ? 1.15 : 1, 1),
          0.1
        );
      });

      renderer.render(scene, camera);
      animIdRef.current = requestAnimationFrame(animate);
    };

    animate();
    if (onLoadedRef.current) onLoadedRef.current();

    return () => {
      cancelAnimationFrame(animIdRef.current);
      window.removeEventListener("resize", handleResize);
      container.removeEventListener("pointermove", handlePointerMove);
      container.removeEventListener("click", handleClick);
      if (rendererRef.current) {
        rendererRef.current.dispose();
        if (container.contains(rendererRef.current.domElement)) {
          container.removeChild(rendererRef.current.domElement);
        }
      }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handlePointerDown = useCallback((e) => {
    const rect = mountRef.current?.getBoundingClientRect();
    if (!rect) return;
    const dx = (e.clientX - rect.left) / rect.width - 0.5;
    const dy = (e.clientY - rect.top) / rect.height - 0.5;
    targetPos.current.set(dx * 2, 1.5 + dy, 8);
  }, []);

  return (
    <div
      ref={mountRef}
      onPointerDown={handlePointerDown}
      style={{
        width: "100%",
        height: "100%",
        cursor: "grab",
        touchAction: "none",
      }}
    />
  );
}