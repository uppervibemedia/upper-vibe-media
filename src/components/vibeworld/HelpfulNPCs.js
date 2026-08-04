import * as THREE from "three";
import { createMixamoAvatar, updateMixamoAvatarAnimation } from "./AvatarModelMixamo.jsx";

const DANCE_EMOTES = ["dance", "vibe", "clap", "celebrate"];

export const HELPFUL_NPCS = [
  {
    id: "vibe-guide",
    world: "city",
    zone: "spawn",
    name: "Vibe Guide",
    x: -10.2,
    z: -2.6,
    rot: 1.05,
    gender: "female",
    hairStyle: "ponytail",
    outfitColorKey: "cosmic-blue",
    skinToneKey: "tan",
    accent: "#00E5FF",
    radius: 3.2,
    message: "Welcome to Upper Vibe City. Explore the zones, collect rewards, and follow your vibe.",
  },
  {
    id: "shop-keeper",
    world: "city",
    zone: "shop",
    name: "Shop Keeper",
    x: 23.2,
    z: 16.2,
    rot: -2.75,
    gender: "female",
    hairStyle: "bob",
    outfitColorKey: "gold-aura",
    skinToneKey: "medium",
    accent: "#FFD36E",
    radius: 3.4,
    message: "Earn Vibe Coins around the city, then unlock hoverboards, jetpacks, avatar gear, and aura items in the shop.",
  },
  {
    id: "beach-guide-city",
    world: "city",
    zone: "beach-portal",
    name: "Beach Guide",
    x: 12.8,
    z: 25.4,
    rot: -1.75,
    gender: "male",
    hairStyle: "hat",
    outfitColorKey: "cosmic-blue",
    skinToneKey: "brown",
    accent: "#68D7E8",
    radius: 3.5,
    message: "The beach portal connects you to Upper Vibe Beach. Step near it when you’re ready to transport.",
  },
  {
    id: "beach-guide",
    world: "beach",
    zone: "beach-spawn",
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

const STATIC_NPCS = [
  {
    id: "stage-watcher-left",
    world: "city",
    zone: "stage",
    name: "Stage Listener",
    x: -6.8,
    z: -24.4,
    lookAt: [0, -32],
    gender: "male",
    hairStyle: "short",
    outfitColorKey: "shadow-black",
    skinToneKey: "medium",
    accent: "#00D4F0",
    behavior: "watchStage",
  },
  {
    id: "stage-vibe-right",
    world: "city",
    zone: "stage",
    name: "Screen Fan",
    x: 6.6,
    z: -24.8,
    lookAt: [0, -32],
    gender: "female",
    hairStyle: "short",
    outfitColorKey: "white-silver",
    skinToneKey: "dark",
    accent: "#C8D4E0",
    behavior: "vibe",
  },
  {
    id: "leaderboard-viewer",
    world: "city",
    zone: "leaderboard",
    name: "Score Watcher",
    x: -5.7,
    z: 10.2,
    lookAt: [0, 12.25],
    gender: "female",
    hairStyle: "bob",
    outfitColorKey: "neon-purple",
    skinToneKey: "tan",
    accent: "#A078FF",
    behavior: "observe",
  },
  {
    id: "wheel-guest",
    world: "city",
    zone: "ferris",
    name: "Wheel Guest",
    x: -8.4,
    z: 28.6,
    lookAt: [0, 24],
    gender: "male",
    hairStyle: "fade",
    outfitColorKey: "neon-purple",
    skinToneKey: "deep-brown",
    accent: "#A078FF",
    behavior: "observe",
  },
  {
    id: "academy-student",
    world: "city",
    zone: "academy",
    name: "Academy Student",
    x: -31.8,
    z: 5.2,
    lookAt: [-28, 10],
    gender: "female",
    hairStyle: "long",
    outfitColorKey: "gold-aura",
    skinToneKey: "light",
    accent: "#FFD36E",
    behavior: "idle",
  },
  {
    id: "crystal-meditator",
    world: "city",
    zone: "crystal",
    name: "Crystal Visitor",
    x: 8.8,
    z: -14.6,
    lookAt: [0, -10],
    gender: "male",
    hairStyle: "locs",
    outfitColorKey: "cosmic-blue",
    skinToneKey: "brown",
    accent: "#00E5FF",
    behavior: "idle",
  },
  {
    id: "beach-relaxer",
    world: "beach",
    zone: "beach-path",
    name: "Beach Guest",
    x: -6,
    z: 18,
    lookAt: [10, 18],
    gender: "male",
    hairStyle: "hat",
    outfitColorKey: "cosmic-blue",
    skinToneKey: "tan",
    accent: "#68D7E8",
    behavior: "idle",
  },
];

const WALKING_NPCS = [
  {
    id: "outer-path-walker",
    world: "city",
    zone: "outer-paths",
    name: "City Walker",
    gender: "female",
    hairStyle: "ponytail",
    outfitColorKey: "rose-glow",
    skinToneKey: "medium",
    accent: "#FF4FC3",
    speed: 0.72,
    path: [[-18, 22], [-9, 28], [2, 27], [10, 19], [7, 9], [-2, 7], [-12, 13]],
  },
  {
    id: "shop-path-walker",
    world: "city",
    zone: "shop-path",
    name: "Shopper",
    gender: "male",
    hairStyle: "hat",
    outfitColorKey: "gold-aura",
    skinToneKey: "light",
    accent: "#FFD36E",
    speed: 0.64,
    path: [[16.5, 10.5], [20.5, 14.8], [26, 13.8], [27.5, 9.5], [21.8, 8.2]],
  },
  {
    id: "beach-walker",
    world: "beach",
    zone: "beach-walk",
    name: "Beach Walker",
    gender: "female",
    hairStyle: "bob",
    outfitColorKey: "gold-aura",
    skinToneKey: "medium",
    accent: "#FFD36E",
    speed: 0.78,
    path: [[-4, 16], [5, 18], [16, 18], [24, 15], [28, 10]],
  },
];

const DANCING_NPCS = [
  {
    id: "dancer-left",
    world: "city",
    zone: "dance-floor",
    name: "Dance Guest",
    x: -3.8,
    z: -6.7,
    rot: 0.6,
    gender: "female",
    hairStyle: "bob",
    outfitColorKey: "rose-glow",
    skinToneKey: "tan",
    accent: "#FF4FC3",
    emoteId: "dance",
  },
  {
    id: "dancer-center",
    world: "city",
    zone: "dance-floor",
    name: "Vibe Dancer",
    x: 0.8,
    z: -3.3,
    rot: -0.25,
    gender: "male",
    hairStyle: "locs",
    outfitColorKey: "neon-purple",
    skinToneKey: "deep-brown",
    accent: "#A078FF",
    emoteId: "vibe",
  },
  {
    id: "dancer-right",
    world: "city",
    zone: "dance-floor",
    name: "Rhythm Guest",
    x: 4.4,
    z: -7.2,
    rot: -0.7,
    gender: "female",
    hairStyle: "short",
    outfitColorKey: "cosmic-blue",
    skinToneKey: "brown",
    accent: "#00E5FF",
    emoteId: "clap",
  },
];

function faceTarget(fromX, fromZ, target) {
  if (!target) return 0;
  return Math.atan2(target[0] - fromX, target[1] - fromZ);
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
  entry.root.name = helper ? `helpfulNpc_${def.id}` : `ambientNpc_${def.id}`;
  entry.root.rotation.y = def.lookAt ? faceTarget(x, z, def.lookAt) : (def.rot || 0);
  entry.root.userData.npcDef = def;
  entry.root.userData.isHelpfulNpc = helper;
  entry._npcEmote = def.emoteId || null;
  entry._npcNextEmoteAt = Math.random() * 5;
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
  const nearPlayer = playerDx * playerDx + playerDz * playerDz < 1.45 * 1.45;
  if (nearPlayer) {
    updateMixamoAvatarAnimation(npc.entry, 0, false, dt);
    return;
  }

  if (dist < 0.18) {
    npc.segment = nextIndex;
    npc.waitUntil = t + 0.8 + ((npc.segment % 3) * 0.25);
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
  group.rotation.y += diff * Math.min(1, dt * 6);
  updateMixamoAvatarAnimation(npc.entry, npc.speed, false, dt);
}

function updateStaticNpc(npc, player, t, dt) {
  const behavior = npc.behavior || "idle";
  const shouldVibe = behavior === "vibe" && Math.sin(t * 0.7 + npc.x) > -0.15;
  updateMixamoAvatarAnimation(npc.entry, 0, shouldVibe, dt, false, shouldVibe ? "vibe" : null);
  if (npc.group && npc.lookAt) {
    const targetRot = faceTarget(npc.group.position.x, npc.group.position.z, npc.lookAt);
    let diff = targetRot - npc.group.rotation.y;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    npc.group.rotation.y += diff * Math.min(1, dt * 2);
  }
}

function updateDancerNpc(npc, t, dt) {
  if (!npc.entry._npcEmote || t >= npc.entry._npcNextEmoteAt) {
    const current = npc.entry._npcEmote;
    const options = DANCE_EMOTES.filter((emote) => emote !== current);
    npc.entry._npcEmote = options[Math.floor(Math.random() * options.length)] || "dance";
    npc.entry._npcNextEmoteAt = t + 5.5 + Math.random() * 5;
  }
  updateMixamoAvatarAnimation(npc.entry, 0, true, dt, false, npc.entry._npcEmote);
}

export function createHelpfulNPCs(scene, worldMode) {
  const helpful = HELPFUL_NPCS.filter((npc) => npc.world === worldMode).map((def) => createAvatarNPC(scene, def, true));
  const staticNpcs = STATIC_NPCS.filter((npc) => npc.world === worldMode).map((def) => createAvatarNPC(scene, def, false));
  const walkers = WALKING_NPCS.filter((npc) => npc.world === worldMode).map((def) => createAvatarNPC(scene, def, false));
  const dancers = DANCING_NPCS.filter((npc) => npc.world === worldMode).map((def) => createAvatarNPC(scene, def, false));
  scene.userData.helpfulNPCs = helpful;
  scene.userData.staticNPCs = staticNpcs;
  scene.userData.walkingNPCs = walkers;
  scene.userData.dancingNPCs = dancers;
  scene.userData._lastHelpfulNPCId = null;
  return { helpful, staticNpcs, walkers, dancers };
}

export function tickHelpfulNPCs(scene, player, enabled = true, t = 0, dt = 0.016) {
  const helpful = scene.userData.helpfulNPCs || [];
  const staticNpcs = scene.userData.staticNPCs || [];
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

  for (const npc of staticNpcs) updateStaticNpc(npc, player, t, dt);
  for (const npc of walkers) updateWalkingNpc(npc, player, t, dt);
  for (const npc of dancers) updateDancerNpc(npc, t, dt);

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