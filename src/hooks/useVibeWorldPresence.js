/**
 * useVibeWorldPresence — Phase 3 real-time presence with entity subscriptions.
 *
 * - Creates/updates a VibeWorldPresence record on enter
 * - Fast position sync every ~300ms (only when position changed meaningfully)
 * - Heartbeat every 10s with full payload (online status, zone)
 * - Uses base44 entity subscribe() for real-time receiving (no polling)
 * - Batches incoming updates every 100ms for efficient React state merging
 * - Cleans up on exit / pagehide / beforeunload
 *
 * Returns: { activeUsers, userCount, isBroadcasting }
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { base44 } from "@/api/base44Client";

const POSITION_MS = 300;       // Send position every 300ms for smooth appearance
const HEARTBEAT_MS = 10_000;   // Full heartbeat every 10s
const STALE_MS = 25_000;       // Mark as offline if no heartbeat for 25s
const BATCH_MS = 100;          // Batch incoming subscribe events every 100ms
const POS_THRESHOLD = 0.05;    // Minimum position delta to trigger an update
const ROT_THRESHOLD = 0.02;    // Minimum rotation delta to trigger an update

export default function useVibeWorldPresence(user, currentZone, position) {
  const [activeUsers, setActiveUsers] = useState([]);
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const recordIdRef = useRef(null);
  const zoneRef = useRef("");
  const posRef = useRef({ x: 0, z: 0, rot: 0 });
  const animRef = useRef("idle");
  const mountedRef = useRef(true);
  const lastSentRef = useRef({ x: Infinity, z: Infinity, rot: Infinity, zone: "", anim: "" });
  const usersMapRef = useRef({});

  // Keep refs current without triggering re-renders
  zoneRef.current = currentZone || "";
  posRef.current = position || { x: 0, z: 0, rot: 0 };
  animRef.current = position?.animState || "idle";

  // ── Rapid position sync (only if changed meaningfully) ────────────────────
  const sendPosition = useCallback(async () => {
    if (!user?.id || !mountedRef.current) return;
    const rid = recordIdRef.current;
    if (!rid) return;

    const { x, z, rot } = posRef.current;
    const zone = zoneRef.current;
    const anim = animRef.current;
    const last = lastSentRef.current;

    // Skip if nothing changed meaningfully
    if (
      Math.abs(x - last.x) < POS_THRESHOLD &&
      Math.abs(z - last.z) < POS_THRESHOLD &&
      Math.abs(rot - last.rot) < ROT_THRESHOLD &&
      zone === last.zone &&
      anim === last.anim
    ) {
      return;
    }

    lastSentRef.current = { x, z, rot, zone, anim };

    try {
      await base44.entities.VibeWorldPresence.update(rid, {
        pos_x: x,
        pos_z: z,
        rotation: rot,
        current_zone: zone,
        animation_state: anim,
        last_heartbeat: new Date().toISOString(),
      });
    } catch {
      // Silently skip rate limits / network issues
    }
  }, [user]);

  // ── Full heartbeat (slower — online status + full identity) ──────────────
  const heartbeat = useCallback(async () => {
    if (!user?.id || !mountedRef.current) return;
    const now = new Date().toISOString();

    const payload = {
      user_id: user.id,
      username: user.full_name || user.email?.split("@")[0] || "Vibe Citizen",
      avatar_type: user.avatar_type || "default",
      current_zone: zoneRef.current,
      pos_x: posRef.current.x,
      pos_z: posRef.current.z,
      rotation: posRef.current.rot,
      animation_state: animRef.current,
      is_online: true,
      last_heartbeat: now,
      joined_at: now,
    };

    try {
      const existingId = recordIdRef.current;
      if (existingId) {
        await base44.entities.VibeWorldPresence.update(existingId, payload);
      } else {
        const rec = await base44.entities.VibeWorldPresence.create(payload);
        recordIdRef.current = rec.id;
      }
      lastSentRef.current = {
        x: posRef.current.x,
        z: posRef.current.z,
        rot: posRef.current.rot,
        zone: zoneRef.current,
        anim: animRef.current,
      };
      if (!isBroadcasting && mountedRef.current) setIsBroadcasting(true);
    } catch {
      // Silently skip
    }
  }, [user, isBroadcasting]);

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
      // Skip own events — we track ourselves separately
      if (event.data?.user_id === user.id) return;

      pendingChanges.set(event.id, event);

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
          if (u.user_id !== user.id) map[u.user_id] = u;
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

  // ── Mark offline on exit ─────────────────────────────────────────────────
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