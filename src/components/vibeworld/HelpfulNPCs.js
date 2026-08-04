import * as THREE from "three";
import { createMixamoAvatar, updateMixamoAvatarAnimation } from "./AvatarModelMixamo.jsx";

export const HELPFUL_NPCS = [
  {
    id: "vibe-guide",
    world: "city",
    name: "Vibe Guide",
    x: -9.8,
    z: -2.6,
    rot: 1.15,
    gender: "female",
    hairStyle: "ponytail",
    outfitColorKey: "cosmic-blue",
    skinToneKey: "tan",
    accent: "#00E5FF",
    radius: 3.2,
    message: "Welcome to Upper Vibe City. Explore, listen to music, collect rewards, check your vibe, and unlock gear.",
  },
  {
    id: "shop-keeper",
    world: "city",
    name: "Shop Keeper",
    x: 22.8,
    z: 16.4,
    rot: -2.75,
    gender: "female",
    hairStyle: "bob",
    outfitColorKey: "gold-aura",
    skinToneKey: "medium",
    accent: "#FFD36E",
    radius: 3.4,
    message: "Earn Vibe Coins around the city and unlock hoverboards, jetpacks, trails, avatar gear, and coin items in the shop.",
  },
  {
    id: "beach-guide",
    world: "beach",
    name: "Beach Guide",
    x: 10.5,
    z: 18.5,
    rot: -2.15,
    gender: "female",
    hairStyle: "long",
    outfitColorKey: "cosmic-blue",
    skinToneKey: "light",
    accent: "#68D7E8",
    radius: 3.6,
    message: "That planet over the ocean can take you back to Upper Vibe City. Explore the beach activities while you’re here.",
  },
];

const WALKING_NPCS = [
  {
    id: "walker-beachwalk-1",
    world: "city",
    name: "Beach Walker",
    gender: "male",
    hairStyle: "hat",
    outfitColorKey: "cosmic-blue",
    skinToneKey: "brown",
    accent: "#68D7E8",
    speed: 0.78,
    path: [[-18, 22], [-8, 28], [4, 26], [10, 18], [7, 9], [-2, 7], [-12, 13]],
  },
  {
    id: "walker-beach-1",
    world: "beach",
    name: "Beach Guest",
    gender: "male",
    hairStyle: "hat",
    outfitColorKey: "cosmic-blue",
    skinToneKey: "tan",
    accent: "#68D7E8",
    speed: 0.9,
    path: [[-4, 16], [5, 18], [16, 18], [24, 15], [28, 10]],
  },
];

const DANCING_NPCS = [
  {
    id: "dancer-dj-left",
    world: "city",
    name: "Dance Guest",
    x: -3.6,
    z: -6.2,
    rot: 0.65,
    gender: "female",
    hairStyle: "bob",
    outfitColorKey: "rose-glow",
    skinToneKey: "tan",
    accent: "#FF4FC3",
    emoteId: "dance",
  },
  {
    id: "dancer-dj-right",
    world: "city",
    name: "Vibe Dancer",
    x: 3.7,
    z: -4.8,
    rot: -0.55,
    gender: "male",
    hairStyle: "locs",
    outfitColorKey: "neon-purple",
    skinToneKey: "deep-brown",
    accent: "#A078FF",
    emoteId: "vibe",
  },
];

function makeNpcLabel(text, color) {
  const canvas = document.createElement("canvas");
  canvas.width = 320;
  canvas.height = 64;
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, 320, 64);
  ctx.fillStyle = "rgba(4, 6, 18, 0.70)";
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(16, 12, 288, 40, 15);
  else ctx.rect(16, 12, 288, 40);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#FFFFFF";
  ctx.font = "700 20px Inter, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, 160, 32);

  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false, depthTest: false }));
  sprite.scale.set(1.8, 0.42, 1);
  sprite.position.set(0, 2.05, 0);
  sprite.userData.isNeonSign = true;
  sprite.renderOrder = 999;
  return sprite;
}

function createAvatarNPC(scene, def, helper = false) {
  const [x, z] = def.path?.[0] || [def.x, def.z];
  const entry = createMixamoAvatar(scene, {
    spawnX: x,
    spawnY: 0,
    spawnZ: z,
    gender: def.gender,
    hairStyle: def.hairStyle,
    outfitColorKey: def.outfitColorKey,
    skinToneKey: def.skinToneKey,
  });
  entry.root.name = helper ? `helpfulNpc_${def.id}` : `walkingNpc_${def.id}`;
  entry.root.rotation.y = def.rot || 0;
  entry.root.userData.npcDef = def;
  entry.root.userData.isHelpfulNpc = helper;
  return { ...def, entry, group: entry.root, segment: 0, waitUntil: 0 };
}

function updateWalkingNpc(npc, player, t, dt) {
  const group = npc.group;
  const path = npc.path;
  if (!group || !path?.length) return;

  if (t < (npc.waitUntil || 0)) {
    updateMixamoAvatarAnimation(npc.entry, 0, false, dt);
    return;
  }

  const nextIndex = (npc.segment + 1) % path.length;
  const target = path[nextIndex];
  const dx = target[0] - group.position.x;
  const dz = target[1] - group.position.z;
  const dist = Math.sqrt(dx * dx + dz * dz) || 0.001;

  const playerDx = player.x - group.position.x;
  const playerDz = player.z - group.position.z;
  const nearPlayer = playerDx * playerDx + playerDz * playerDz < 1.35 * 1.35;
  if (nearPlayer) {
    updateMixamoAvatarAnimation(npc.entry, 0, false, dt);
    return;
  }

  if (dist < 0.18) {
    npc.segment = nextIndex;
    npc.waitUntil = t + 0.7 + ((npc.segment % 3) * 0.2);
    updateMixamoAvatarAnimation(npc.entry, 0, false, dt);
    return;
  }

  const step = Math.min(dist, npc.speed * dt);
  group.position.x += (dx / dist) * step;
  group.position.z += (dz / dist) * step;

  const targetRot = Math.atan2(dx, dz);
  let diff = targetRot - group.rotation.y;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  group.rotation.y += diff * Math.min(1, dt * 7);
  updateMixamoAvatarAnimation(npc.entry, npc.speed, false, dt);
}

export function createHelpfulNPCs(scene, worldMode) {
  const helpful = HELPFUL_NPCS.filter((npc) => npc.world === worldMode).map((def) => createAvatarNPC(scene, def, true));
  const walkers = WALKING_NPCS.filter((npc) => npc.world === worldMode).map((def) => createAvatarNPC(scene, def, false));
  const dancers = DANCING_NPCS.filter((npc) => npc.world === worldMode).map((def) => createAvatarNPC(scene, def, false));
  scene.userData.helpfulNPCs = helpful;
  scene.userData.walkingNPCs = walkers;
  scene.userData.dancingNPCs = dancers;
  scene.userData._lastHelpfulNPCId = null;
  return { helpful, walkers, dancers };
}

export function tickHelpfulNPCs(scene, player, enabled = true, t = 0, dt = 0.016) {
  const helpful = scene.userData.helpfulNPCs || [];
  const walkers = scene.userData.walkingNPCs || [];
  const dancers = scene.userData.dancingNPCs || [];

  for (const npc of helpful) {
    updateMixamoAvatarAnimation(npc.entry, 0, false, dt);
    if (npc.group) {
      const dx = player.x - npc.group.position.x;
      const dz = player.z - npc.group.position.z;
      if (dx * dx + dz * dz < 36) {
        const face = Math.atan2(dx, dz);
        let diff = face - npc.group.rotation.y;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        npc.group.rotation.y += diff * Math.min(1, dt * 3);
      }
    }
  }

  for (const npc of walkers) updateWalkingNpc(npc, player, t, dt);
  for (const npc of dancers) updateMixamoAvatarAnimation(npc.entry, 0, true, dt, false, npc.emoteId);

  let nearest = null;
  let nearestD2 = Infinity;
  if (enabled) {
    for (const npc of helpful) {
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
        accent: nearest.accent,
      } : null,
    }));
  }
}