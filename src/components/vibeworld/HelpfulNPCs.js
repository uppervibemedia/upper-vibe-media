import * as THREE from "three";
import { createMixamoAvatar, updateMixamoAvatarAnimation } from "./AvatarModelMixamo.jsx";

export const HELPFUL_NPCS = [
  {
    id: "vibe-guide",
    world: "city",
    name: "Vibe Guide",
    x: -7.8,
    z: -1.8,
    rot: 1.1,
    gender: "female",
    hairStyle: "ponytail",
    outfitColorKey: "cosmic-blue",
    skinToneKey: "tan",
    accent: "#00E5FF",
    radius: 3.2,
    message: "Welcome to Upper Vibe City. Explore, listen to music, collect rewards, check your vibe, and unlock gear.",
  },
  {
    id: "dj-guide",
    world: "city",
    name: "DJ NPC",
    x: 7.6,
    z: -8.8,
    rot: -1.1,
    gender: "male",
    hairStyle: "hat",
    outfitColorKey: "rose-glow",
    skinToneKey: "brown",
    accent: "#FF4FC3",
    radius: 3.0,
    message: "The DJ booth stays updated with live Upper Vibe music. Tap the booth to hear what’s playing.",
  },
  {
    id: "shop-keeper",
    world: "city",
    name: "Shop Keeper",
    x: 18.2,
    z: 9.7,
    rot: -2.4,
    gender: "female",
    hairStyle: "bob",
    outfitColorKey: "gold-aura",
    skinToneKey: "medium",
    accent: "#FFD36E",
    radius: 3.4,
    message: "Earn Vibe Coins around the city and unlock hoverboards, jetpacks, trails, avatar gear, and coin items in the shop.",
  },
  {
    id: "ferris-attendant",
    world: "city",
    name: "Wheel Attendant",
    x: -3.2,
    z: 30.1,
    rot: -0.15,
    gender: "male",
    hairStyle: "fade",
    outfitColorKey: "neon-purple",
    skinToneKey: "deep-brown",
    accent: "#A078FF",
    radius: 3.6,
    message: "Step closer to ride the Ferris Wheel and see the city from above.",
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
    id: "walker-spawn-1",
    world: "city",
    name: "City Listener",
    gender: "male",
    hairStyle: "short",
    outfitColorKey: "cosmic-blue",
    skinToneKey: "medium",
    accent: "#00D4F0",
    speed: 1.05,
    path: [[-10, -5], [-8, -9], [-3.5, -11], [1.5, -10], [4.5, -7.5]],
  },
  {
    id: "walker-dance-1",
    world: "city",
    name: "Dance Floor Guest",
    gender: "female",
    hairStyle: "bob",
    outfitColorKey: "rose-glow",
    skinToneKey: "tan",
    accent: "#FF4FC3",
    speed: 0.95,
    path: [[8.7, -5.5], [7.4, -1.5], [2.5, 1.0], [-3.0, 0.6], [-7.5, -2.8], [-8.2, -6.5]],
  },
  {
    id: "walker-shop-1",
    world: "city",
    name: "Gear Browser",
    gender: "male",
    hairStyle: "locs",
    outfitColorKey: "gold-aura",
    skinToneKey: "deep-brown",
    accent: "#FFD36E",
    speed: 0.85,
    path: [[15.5, 14.6], [20.5, 15.2], [26, 13.7], [27.5, 9.5], [22, 8.7], [16.5, 10.2]],
  },
  {
    id: "walker-leaderboard-1",
    world: "city",
    name: "Frequency Fan",
    gender: "female",
    hairStyle: "short",
    outfitColorKey: "white-silver",
    skinToneKey: "dark",
    accent: "#C8D4E0",
    speed: 0.9,
    path: [[-5.5, 9.2], [-1.8, 15.7], [3.5, 15.4], [6.2, 10.4], [2.0, 7.8], [-3.5, 7.9]],
  },
  {
    id: "walker-ferris-1",
    world: "city",
    name: "Wheel Guest",
    gender: "male",
    hairStyle: "fade",
    outfitColorKey: "neon-purple",
    skinToneKey: "light",
    accent: "#A078FF",
    speed: 0.82,
    path: [[-9, 20], [-7.5, 26], [-3.8, 32], [4.2, 32], [7.5, 26], [7, 20]],
  },
  {
    id: "walker-beachwalk-1",
    world: "city",
    name: "Beach Walker",
    gender: "female",
    hairStyle: "ponytail",
    outfitColorKey: "cosmic-blue",
    skinToneKey: "brown",
    accent: "#68D7E8",
    speed: 0.92,
    path: [[-18, 22], [-10, 24], [0, 25.5], [10, 24], [18, 22]],
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
    speed: 0.95,
    path: [[-4, 16], [5, 18], [16, 18], [24, 15], [28, 10]],
  },
  {
    id: "walker-beach-2",
    world: "beach",
    name: "Retreat Guest",
    gender: "female",
    hairStyle: "long",
    outfitColorKey: "gold-aura",
    skinToneKey: "medium",
    accent: "#FFD36E",
    speed: 0.82,
    path: [[-22, 13], [-16, 17], [-8, 19], [0, 20], [6, 17]],
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
  scene.userData.helpfulNPCs = helpful;
  scene.userData.walkingNPCs = walkers;
  scene.userData._lastHelpfulNPCId = null;
  return { helpful, walkers };
}

export function tickHelpfulNPCs(scene, player, enabled = true, t = 0, dt = 0.016) {
  const helpful = scene.userData.helpfulNPCs || [];
  const walkers = scene.userData.walkingNPCs || [];

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