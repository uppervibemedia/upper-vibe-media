import * as THREE from "three";

const IS_MOBILE = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent || "");
const SEGMENTS = IS_MOBILE ? 8 : 12;

export const HELPFUL_NPCS = [
  {
    id: "vibe-guide",
    world: "city",
    name: "Vibe Guide",
    x: -7.8,
    z: -1.8,
    color: "#00E5FF",
    accent: "#A078FF",
    radius: 3.2,
    message: "Welcome to Upper Vibe City. Explore, listen to music, collect rewards, check your vibe, and unlock gear.",
  },
  {
    id: "dj-guide",
    world: "city",
    name: "DJ NPC",
    x: 7.6,
    z: -8.8,
    color: "#FF4FC3",
    accent: "#00E5FF",
    radius: 3.0,
    message: "The DJ booth stays updated with live Upper Vibe music. Tap the booth to hear what’s playing.",
  },
  {
    id: "shop-keeper",
    world: "city",
    name: "Shop Keeper",
    x: 18.2,
    z: 9.7,
    color: "#FFD36E",
    accent: "#00D4F0",
    radius: 3.4,
    message: "Earn Vibe Coins around the city and unlock hoverboards, jetpacks, trails, avatar gear, and coin items in the shop.",
  },
  {
    id: "ferris-attendant",
    world: "city",
    name: "Wheel Attendant",
    x: -3.2,
    z: 30.1,
    color: "#7C3AED",
    accent: "#00E5FF",
    radius: 3.6,
    message: "Step closer to ride the Ferris Wheel and see the city from above.",
  },
  {
    id: "beach-guide",
    world: "beach",
    name: "Beach Guide",
    x: 10.5,
    z: 18.5,
    color: "#68D7E8",
    accent: "#FFD36E",
    radius: 3.6,
    message: "That planet over the ocean can take you back to Upper Vibe City. Explore the beach activities while you’re here.",
  },
];

function makeMaterial(color, emissive = "#000000", emissiveIntensity = 0.12) {
  return new THREE.MeshStandardMaterial({
    color: new THREE.Color(color),
    emissive: new THREE.Color(emissive),
    emissiveIntensity,
    roughness: 0.42,
    metalness: 0.28,
  });
}

function makeNpcLabel(text, color) {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 64;
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, 256, 64);
  ctx.fillStyle = "rgba(4, 6, 18, 0.78)";
  ctx.strokeStyle = color;
  ctx.lineWidth = 3;
  ctx.beginPath();
  if (ctx.roundRect) {
    ctx.roundRect(10, 10, 236, 44, 18);
  } else {
    ctx.rect(10, 10, 236, 44);
  }
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#FFFFFF";
  ctx.font = "700 22px Inter, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, 128, 32);

  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false }));
  sprite.scale.set(2.9, 0.72, 1);
  sprite.position.set(0, 2.45, 0);
  sprite.userData.isNeonSign = true;
  return sprite;
}

function createNpc(def) {
  const group = new THREE.Group();
  group.name = `helpfulNpc_${def.id}`;
  group.position.set(def.x, 0, def.z);
  group.userData.npcDef = def;

  const bodyMat = makeMaterial(def.color, def.color, 0.14);
  const accentMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(def.accent), transparent: true, opacity: 0.78, depthWrite: false });
  const headMat = makeMaterial("#E8D7C0", def.accent, 0.05);

  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.44, 0.58, 0.16, SEGMENTS), accentMat);
  base.position.y = 0.08;
  group.add(base);

  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.38, 1.15, SEGMENTS), bodyMat);
  body.position.y = 0.76;
  group.add(body);

  const chest = new THREE.Mesh(new THREE.TorusGeometry(0.31, 0.035, 5, SEGMENTS), accentMat);
  chest.position.y = 1.12;
  chest.rotation.x = Math.PI / 2;
  group.add(chest);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.23, SEGMENTS, SEGMENTS), headMat);
  head.position.y = 1.5;
  group.add(head);

  const visor = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.055, 0.045), accentMat);
  visor.position.set(0, 1.52, 0.2);
  group.add(visor);

  const halo = new THREE.Mesh(new THREE.TorusGeometry(0.48, 0.025, 5, SEGMENTS), accentMat);
  halo.position.y = 0.2;
  halo.rotation.x = -Math.PI / 2;
  group.add(halo);

  group.add(makeNpcLabel(def.name, def.accent));
  return group;
}

export function createHelpfulNPCs(scene, worldMode) {
  const npcs = HELPFUL_NPCS.filter((npc) => npc.world === worldMode).map((def) => {
    const group = createNpc(def);
    scene.add(group);
    return { ...def, group };
  });
  scene.userData.helpfulNPCs = npcs;
  scene.userData._lastHelpfulNPCId = null;
  return npcs;
}

export function tickHelpfulNPCs(scene, player, enabled = true) {
  const npcs = scene.userData.helpfulNPCs || [];
  let nearest = null;
  let nearestD2 = Infinity;

  if (enabled) {
    for (const npc of npcs) {
      const dx = player.x - npc.x;
      const dz = player.z - npc.z;
      const d2 = dx * dx + dz * dz;
      if (d2 <= npc.radius * npc.radius && d2 < nearestD2) {
        nearest = npc;
        nearestD2 = d2;
      }
    }
  }

  const nextId = nearest?.id || null;
  if (scene.userData._lastHelpfulNPCId !== nextId) {
    scene.userData._lastHelpfulNPCId = nextId;
    window.dispatchEvent(new CustomEvent("uvcNpcProximity", {
      detail: nearest ? {
        id: nearest.id,
        name: nearest.name,
        message: nearest.message,
        color: nearest.color,
        accent: nearest.accent,
      } : null,
    }));
  }
}