/**
 * useVibeWorldPresence — Real-time presence with entity subscriptions.
 *
 * Phase 3 (real-time): Fast position sync, heartbeats, entity subscriptions.
 * Phase 4 (disconnect cleanup):
 *   - Periodic stale-user pruning (every 10s)
 *   - Visibility change handling (offline when tab hidden, re-join on visibility)
 *   - Mark offline on unmount / pagehide / beforeunload
 * Phase 5 (safety): Only authenticated users appear; usernames only (no emails).
 *
 * Returns: { activeUsers, userCount, isBroadcasting }
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { base44 } from "@/api/base44Client";

const POSITION_MS = 500;       // Moving users broadcast at 2Hz; remote interpolation smooths between updates
const HEARTBEAT_MS = 30_000;   // Full heartbeat every 30s to avoid rate limits
const STALE_MS = 75_000;       // Mark as offline after missed heartbeats
const BATCH_MS = 120;          // Batch incoming subscribe events briefly
const POS_THRESHOLD = 0.25;    // Meaningful movement delta before sending
const ROT_THRESHOLD = 0.08;    // Meaningful facing delta before sending

function worldKeyForZone(zone) {
  const value = String(zone || "").toLowerCase();
  return value === "vibe_beach" || value.includes("beach") ? "beach" : "city";
}

/** Touch the last_heartbeat timestamp. Returns true on success. Retries once after 1s. */
const touchHeartbeat = async (rid) => {
  const start = Date.now();
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      await base44.entities.VibeWorldPresence.update(rid, { last_heartbeat: new Date().toISOString() });
      return true;
    } catch (err) {
      if (Date.now() - start > 5000) return false; // don't retry past the next cycle start
      if (attempt === 0) await new Promise((r) => setTimeout(r, 1000));
    }
  }
  return false;
};

function getLifetimeOrbs() {
  try {
    const raw = localStorage.getItem("vibeOrbData");
    if (!raw) return 0;
    return JSON.parse(raw)?.lifetimeVibeOrbs ?? 0;
  } catch {
    return 0;
  }
}

export default function useVibeWorldPresence(user, currentZone, position, equippedState = {}, liveState = {}, livePositionRef = null) {
  const {
    equippedAura = "", equippedAuraColor = "", equippedHoverboard = "", equippedMovementGear = "",
    equippedNameplate = "", equippedBadge = "", equippedClothing = "",
    avatarTypeKey = "", avatarSkinTone = "", avatarStyle = "", avatarOutfitColor = "", avatarHairStyle = "",
  } = equippedState;
  const {
    isDancing = false,
    personalHoverboardActive: liveHoverboardActive = false,
    isPlayingNeonSurf = false,
    jetpackActive = false,
    jetpackMode = "off",
  } = liveState;
  // Effective riding flags: personal hoverboard OR Neon Surf riding
  const isRidingPersonal = liveHoverboardActive;
  const isRidingNeonSurf = isPlayingNeonSurf;
  const anyRiding = isRidingPersonal || isRidingNeonSurf;
  const isJetpacking = !!jetpackActive;
  const jetpackAirborne = jetpackMode === "flying" || jetpackMode === "falling";
  const [activeUsers, setActiveUsers] = useState([]);
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const recordIdRef = useRef(null);
  const zoneRef = useRef("");
  const localWorldRef = useRef("city");
  const posRef = useRef({ x: 0, z: 0, rot: 0 });
  const animRef = useRef("idle");
  const mountedRef = useRef(true);
  // Track last-sent state so movement and appearance changes broadcast immediately.
  const lastSentRef = useRef({ x: Infinity, y: Infinity, z: Infinity, rot: Infinity, zone: "", anim: "", dancing: false, riding: false, neonSurf: false, jetpack: false, jetpackMode: "", aura: "", auraColor: "", hoverboard: "", movementGear: "", nameplate: "", badge: "", clothing: "", avatarKey: "", skin: "", hair: "", style: "", outfit: "" });
  const sendInFlightRef = useRef(false);
  const usersMapRef = useRef({});

  // Keep refs current without triggering re-renders
  zoneRef.current = currentZone || "";
  localWorldRef.current = worldKeyForZone(currentZone);
  const livePosition = livePositionRef?.current || position || { x: 0, y: 0, z: 0, rot: 0 };
  posRef.current = livePosition;
  animRef.current = livePosition?.animState || position?.animState || "idle";

  // ── Rapid position sync — also carries live animation/riding state ───────
  const sendPosition = useCallback(async () => {
    if (!user?.id || !mountedRef.current) return;
    const rid = recordIdRef.current;
    if (!rid) return;
    if (sendInFlightRef.current) return;

    const { x = 0, y = 0, z = 0, rot = 0 } = posRef.current || {};
    const zone = zoneRef.current;
    const baseAnim = animRef.current;
    const last = lastSentRef.current;
    let liveAvatarTypeKey = avatarTypeKey || user.avatar_type || "neutral";
    try {
      const stored = sessionStorage.getItem("uvc_test_avatar");
      if (stored) liveAvatarTypeKey = stored;
    } catch {}
    const liveSkinTone = avatarSkinTone || user.skin_tone || "medium";
    let liveHairStyle = avatarHairStyle || "";
    try { liveHairStyle = liveHairStyle || sessionStorage.getItem("uvc_hair_style") || ""; } catch {}
    const liveAvatarStyle = avatarStyle || user.avatar_style || "streetwear";
    const liveOutfitColor = avatarOutfitColor || user.avatar_outfit_color || "electric-blue";

    // Derive effective animation state from live state
    // Phase-order: dance > riding > walking > idle
    let anim = baseAnim;
    if (jetpackAirborne) anim = jetpackMode === "falling" ? "jetpackFalling" : "jetpackFlying";
    else if (isJetpacking && jetpackMode === "cooldown") anim = "jetpackCooldown";
    else if (isRidingPersonal) anim = "hbRiding";
    else if (isRidingNeonSurf) anim = "neonSurf";
    else if (isDancing) anim = "dancing";

    const dancing = isDancing;
    const riding = isRidingPersonal;
    const neonSurf = isRidingNeonSurf;

    // Skip full position update if nothing changed (saves DB writes)
    if (
      Math.abs(x - last.x) < POS_THRESHOLD &&
      Math.abs((y || 0) - (last.y || 0)) < POS_THRESHOLD &&
      Math.abs(z - last.z) < POS_THRESHOLD &&
      Math.abs(rot - last.rot) < ROT_THRESHOLD &&
      zone === last.zone &&
      anim === last.anim &&
      dancing === last.dancing &&
      riding === last.riding &&
      neonSurf === last.neonSurf &&
      isJetpacking === last.jetpack &&
      jetpackMode === last.jetpackMode &&
      equippedAura === last.aura &&
      equippedAuraColor === last.auraColor &&
      equippedHoverboard === last.hoverboard &&
      equippedMovementGear === last.movementGear &&
      equippedNameplate === last.nameplate &&
      equippedBadge === last.badge &&
      equippedClothing === last.clothing &&
      liveAvatarTypeKey === last.avatarKey &&
      liveSkinTone === last.skin &&
      liveHairStyle === last.hair &&
      liveAvatarStyle === last.style &&
      liveOutfitColor === last.outfit
    ) {
      return;
    }

    lastSentRef.current = {
      x, y, z, rot, zone, anim,
      dancing,
      riding,
      neonSurf,
      jetpack: isJetpacking,
      jetpackMode,
      aura: equippedAura || "",
      auraColor: equippedAuraColor || "",
      hoverboard: equippedHoverboard || "",
      movementGear: equippedMovementGear || "",
      nameplate: equippedNameplate || "",
      badge: equippedBadge || "",
      clothing: equippedClothing || "",
      avatarKey: liveAvatarTypeKey,
      skin: liveSkinTone,
      hair: liveHairStyle,
      style: liveAvatarStyle,
      outfit: liveOutfitColor,
    };

    // Full position update — only when state actually changed
    sendInFlightRef.current = true;
    try {
      const nowIso = new Date().toISOString();
      await base44.entities.VibeWorldPresence.update(rid, {
        pos_x: x,
        pos_y: y || 0,
        pos_z: z,
        rotation: rot,
        current_zone: zone,
        avatar_type: user.avatar_type || liveAvatarTypeKey,
        avatar_type_key: liveAvatarTypeKey,
        skin_tone: liveSkinTone,
        hair_style: liveHairStyle,
        avatar_style: liveAvatarStyle,
        avatar_outfit_color: liveOutfitColor,
        animation_state: anim,
        is_dancing: dancing,
        personal_hoverboard_active: riding,
        is_playing_neon_surf: neonSurf,
        equipped_hoverboard: equippedHoverboard || "",
        equipped_movement_gear: equippedMovementGear || "",
        jetpack_active: isJetpacking,
        jetpack_mode: jetpackActive ? jetpackMode : "off",
        equipped_aura: equippedAura || "",
        equipped_aura_color: equippedAuraColor || "",
        equipped_nameplate: equippedNameplate || "",
        equipped_badge: equippedBadge || "",
        equipped_clothing: equippedClothing || "",
        last_position_at: nowIso,
        last_heartbeat: nowIso,
      });
    } catch {
      // Silently skip rate limits / network issues
    } finally {
      sendInFlightRef.current = false;
    }
  }, [user, equippedAura, equippedAuraColor, equippedHoverboard, equippedMovementGear, equippedNameplate, equippedBadge, equippedClothing, avatarTypeKey, avatarSkinTone, avatarHairStyle, avatarStyle, avatarOutfitColor, isDancing, isRidingPersonal, isRidingNeonSurf, isJetpacking, jetpackAirborne, jetpackActive, jetpackMode]);

  // Broadcast avatar/item changes immediately so other people see updates without refreshing.
  useEffect(() => {
    sendPosition();
  }, [sendPosition, equippedAura, equippedAuraColor, equippedHoverboard, equippedMovementGear, equippedNameplate, equippedBadge, equippedClothing, avatarTypeKey, avatarSkinTone, avatarHairStyle, avatarStyle, avatarOutfitColor, isDancing, isRidingPersonal, isRidingNeonSurf, isJetpacking, jetpackAirborne, jetpackMode]);

  // ── Full heartbeat (slower — online status + full identity) ──────────────
  const isBroadcastingRef = useRef(false);
  const heartbeat = useCallback(async () => {
    if (!user?.id || !mountedRef.current) return;
    const now = new Date().toISOString();

    // Read the live avatar_type_key from sessionStorage (set by AvatarSetup/WorldGate)
    let liveAvatarTypeKey = avatarTypeKey || user.avatar_type || "neutral";
    try {
      const stored = sessionStorage.getItem("uvc_test_avatar");
      if (stored) liveAvatarTypeKey = stored;
    } catch {}
    let liveHairStyle = avatarHairStyle || "";
    try { liveHairStyle = liveHairStyle || sessionStorage.getItem("uvc_hair_style") || ""; } catch {}

    const payload = {
      user_id: user.id,
      username: user.world_username || "New User",
      avatar_type: user.avatar_type || liveAvatarTypeKey,
      avatar_type_key: liveAvatarTypeKey,
      skin_tone: avatarSkinTone || user.skin_tone || "medium",
      hair_style: liveHairStyle,
      avatar_style: avatarStyle || user.avatar_style || "streetwear",
      avatar_outfit_color: avatarOutfitColor || user.avatar_outfit_color || "electric-blue",
      current_zone: zoneRef.current,
      pos_x: posRef.current.x || 0,
      pos_y: posRef.current.y || 0,
      pos_z: posRef.current.z || 0,
      rotation: posRef.current.rot || 0,
      // Derive effective animation state from live state
      animation_state: jetpackAirborne ? (jetpackMode === "falling" ? "jetpackFalling" : "jetpackFlying") :
        isJetpacking && jetpackMode === "cooldown" ? "jetpackCooldown" :
        isRidingPersonal ? "hbRiding" :
        isRidingNeonSurf ? "neonSurf" :
        isDancing ? "dancing" :
        animRef.current || "idle",
      is_dancing: isDancing,
      personal_hoverboard_active: isRidingPersonal,
      is_playing_neon_surf: isRidingNeonSurf,
      equipped_aura: equippedAura || "",
      equipped_aura_color: equippedAuraColor || "",
      equipped_hoverboard: equippedHoverboard || "",
      equipped_movement_gear: equippedMovementGear || "",
      jetpack_active: isJetpacking,
      jetpack_mode: jetpackActive ? jetpackMode : "off",
      equipped_nameplate: equippedNameplate,
      equipped_badge: equippedBadge,
      equipped_clothing: equippedClothing,
      is_online: true,
      last_position_at: now,
      last_heartbeat: now,
      joined_at: now,
      lifetime_orbs: getLifetimeOrbs(),
    };

    try {
      const existingId = recordIdRef.current;
      if (existingId) {
        await base44.entities.VibeWorldPresence.update(existingId, payload);
      } else {
        const rec = await base44.entities.VibeWorldPresence.create(payload);
        recordIdRef.current = rec.id;
      }
      const dancing = isDancing, riding = isRidingPersonal, neonSurf = isRidingNeonSurf, jetpack = isJetpacking;
      lastSentRef.current = {
        x: posRef.current.x || 0,
        y: posRef.current.y || 0,
        z: posRef.current.z || 0,
        rot: posRef.current.rot || 0,
        zone: zoneRef.current,
        anim: jetpackAirborne ? (jetpackMode === "falling" ? "jetpackFalling" : "jetpackFlying") : jetpack && jetpackMode === "cooldown" ? "jetpackCooldown" : riding ? "hbRiding" : neonSurf ? "neonSurf" : dancing ? "dancing" : animRef.current || "idle",
        dancing,
        riding,
        neonSurf,
        jetpack,
        jetpackMode,
        aura: equippedAura || "",
        auraColor: equippedAuraColor || "",
        hoverboard: equippedHoverboard || "",
        movementGear: equippedMovementGear || "",
        nameplate: equippedNameplate || "",
        badge: equippedBadge || "",
        clothing: equippedClothing || "",
        avatarKey: liveAvatarTypeKey,
        skin: avatarSkinTone || user.skin_tone || "medium",
        hair: liveHairStyle,
        style: avatarStyle || user.avatar_style || "streetwear",
        outfit: avatarOutfitColor || user.avatar_outfit_color || "electric-blue",
      };
      if (!isBroadcastingRef.current && mountedRef.current) {
        isBroadcastingRef.current = true;
        setIsBroadcasting(true);
      }
    } catch (err) {
      console.warn("[VibeWorldPresence] heartbeat failed — record may not exist:", err?.message);
    }
  }, [user, equippedAura, equippedAuraColor, equippedHoverboard, equippedMovementGear, equippedNameplate, equippedBadge, equippedClothing, avatarTypeKey, avatarSkinTone, avatarHairStyle, avatarStyle, avatarOutfitColor, isDancing, isRidingPersonal, isRidingNeonSurf, isJetpacking, jetpackAirborne, jetpackActive, jetpackMode]);

  useEffect(() => {
    if (!user?.id) return;
    usersMapRef.current = Object.fromEntries(
      Object.entries(usersMapRef.current).filter(([, u]) => worldKeyForZone(u.current_zone) === localWorldRef.current)
    );
    setActiveUsers(Object.values(usersMapRef.current));
  }, [user?.id, currentZone]);

  // ── Real-time entity subscription (replaces polling) ─────────────────────
  useEffect(() => {
    if (!user?.id) return;

    let batchTimer = null;
    const pendingChanges = new Map();

    const flushBatch = () => {
      const map = usersMapRef.current;
      let changed = false;

      pendingChanges.forEach((change, id) => {
        if (change.type === "delete") {
          if (map[id]) {
            delete map[id];
            changed = true;
          }
        } else {
          const incoming = change.data;
          // Only accept if this is newer than what we have
          const existing = map[id];
          if (
            !existing ||
            !existing.last_heartbeat ||
            (incoming.last_heartbeat && incoming.last_heartbeat >= existing.last_heartbeat)
          ) {
            map[id] = incoming;
            changed = true;
          }
        }
      });
      pendingChanges.clear();

      if (changed) {
        setActiveUsers(Object.values(map));
      }
    };

    const unsubscribe = base44.entities.VibeWorldPresence.subscribe((event) => {
      if (!mountedRef.current) return;
      const remoteUserId = event.data?.user_id || event.old_data?.user_id || event.id;
      // Skip own events — we track ourselves separately
      if (remoteUserId === user.id) return;
      // Phase 5: Only accept online, non-stale users; remove offline/other-world users immediately.
      if (event.type !== "delete" && event.data) {
        const d = event.data;
        if (!d.is_online) {
          pendingChanges.set(remoteUserId, { ...event, type: "delete" });
          if (!batchTimer) batchTimer = setTimeout(() => { batchTimer = null; flushBatch(); }, BATCH_MS);
          return;
        }
        const lastBeat = d.last_heartbeat ? new Date(d.last_heartbeat).getTime() : 0;
        if (Date.now() - lastBeat > STALE_MS || worldKeyForZone(d.current_zone) !== localWorldRef.current) {
          pendingChanges.set(remoteUserId, { ...event, type: "delete" });
          if (!batchTimer) batchTimer = setTimeout(() => { batchTimer = null; flushBatch(); }, BATCH_MS);
          return;
        }
      }

      pendingChanges.set(remoteUserId, event);

      if (!batchTimer) {
        batchTimer = setTimeout(() => {
          batchTimer = null;
          flushBatch();
        }, BATCH_MS);
      }
    });

    // Initial load — fetch all currently online users
    (async () => {
      try {
        const cutoff = new Date(Date.now() - STALE_MS).toISOString();
        const users = await base44.entities.VibeWorldPresence.filter({
          is_online: true,
          last_heartbeat: { $gte: cutoff },
        });
        const map = {};
        users.forEach((u) => {
          if (u.user_id !== user.id && worldKeyForZone(u.current_zone) === localWorldRef.current) map[u.user_id] = u;
        });
        usersMapRef.current = map;
        if (mountedRef.current) {
          setActiveUsers(Object.values(map));
        }
      } catch {
        // Silently skip
      }
    })();

    return () => {
      unsubscribe();
      if (batchTimer) clearTimeout(batchTimer);
    };
  }, [user?.id]);

  // ── Position sync loop — rapid updates ───────────────────────────────────
  useEffect(() => {
    if (!user?.id) return;

    const posTimer = setInterval(sendPosition, POSITION_MS);

    return () => clearInterval(posTimer);
  }, [user?.id, sendPosition]);

  // ── Heartbeat loop — full status ─────────────────────────────────────────
  useEffect(() => {
    if (!user?.id) return;

    heartbeat(); // immediate first beat
    const beatTimer = setInterval(heartbeat, HEARTBEAT_MS);

    return () => clearInterval(beatTimer);
  }, [user?.id, heartbeat]);

  // ── Phase 4: Periodic stale-user pruning ────────────────────────────────
  useEffect(() => {
    if (!user?.id) return;

    const pruneStale = () => {
      const now = Date.now();
      const map = usersMapRef.current;
      let changed = false;

      for (const id in map) {
        const u = map[id];
        const lastBeat = u.last_heartbeat ? new Date(u.last_heartbeat).getTime() : 0;
        if (now - lastBeat > STALE_MS || worldKeyForZone(u.current_zone) !== localWorldRef.current) {
          delete map[id];
          changed = true;
        }
      }

      if (changed) {
        setActiveUsers(Object.values(map));
      }
    };

    const pruneTimer = setInterval(pruneStale, 10_000);

    return () => clearInterval(pruneTimer);
  }, [user?.id]);

  // ── Phase 4: Visibility change — go offline when tab hidden ─────────────
  const markOffline = useCallback(() => {
    const rid = recordIdRef.current;
    if (!rid) return;
    try {
      base44.entities.VibeWorldPresence.update(rid, {
        is_online: false,
        last_heartbeat: new Date().toISOString(),
      });
    } catch {}
  }, []);

  const markOnline = useCallback(() => {
    if (!user?.id || !mountedRef.current) return;
    isBroadcastingRef.current = false;
    setIsBroadcasting(false); // force re-creation on next heartbeat
    recordIdRef.current = null;
    heartbeat();
  }, [user, heartbeat]);

  useEffect(() => {
    const handleVisibility = () => {
      if (document.hidden) {
        markOffline();
      } else if (mountedRef.current) {
        markOnline();
      }
    };

    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [markOffline, markOnline]);

  useEffect(() => {
    const cleanup = () => {
      mountedRef.current = false;
      markOffline();
    };

    window.addEventListener("pagehide", cleanup);
    window.addEventListener("beforeunload", cleanup);

    return () => {
      cleanup();
      window.removeEventListener("pagehide", cleanup);
      window.removeEventListener("beforeunload", cleanup);
    };
  }, [markOffline]);

  return {
    activeUsers,
    userCount: activeUsers.length,
    isBroadcasting,
  };
}