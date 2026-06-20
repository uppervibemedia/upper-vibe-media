/**
 * useVibeWorldPresence — Phase 1 real-time user presence for Vibe World.
 *
 * - Creates/updates a VibeWorldPresence record on enter
 * - Heartbeats every 10s with zone + online status
 * - Polls active users every 6s
 * - Cleans up on exit / pagehide / beforeunload
 *
 * Returns: { activeUsers, userCount, isBroadcasting }
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { base44 } from "@/api/base44Client";

const HEARTBEAT_MS = 10_000; // 10s — send position/zone
const POLL_MS = 6_000;       // 6s — read other users
const STALE_MS = 25_000;     // 25s — mark as offline if no heartbeat

export default function useVibeWorldPresence(user, currentZone, position) {
  const [activeUsers, setActiveUsers] = useState([]);
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const recordIdRef = useRef(null);
  const zoneRef = useRef("");
  const posRef = useRef({ x: 0, z: 0, rot: 0 });
  const mountedRef = useRef(true);

  // Keep refs current
  zoneRef.current = currentZone || "";
  posRef.current = position || { x: 0, z: 0, rot: 0 };

  // ── Create or update own presence record ─────────────────────────────────
  const heartbeat = useCallback(async () => {
    if (!user?.id) return;
    const now = new Date().toISOString();

    const payload = {
      user_id: user.id,
      username: user.full_name || user.email?.split("@")[0] || "Vibe Citizen",
      avatar_type: user.avatar_type || "default",
      current_zone: zoneRef.current,
      pos_x: posRef.current.x,
      pos_z: posRef.current.z,
      rotation: posRef.current.rot,
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
      if (!isBroadcasting && mountedRef.current) setIsBroadcasting(true);
    } catch {
      // Silently skip — rate limits or network issues shouldn't crash world
    }
  }, [user, isBroadcasting]);

  // ── Poll active users ────────────────────────────────────────────────────
  useEffect(() => {
    if (!user?.id) return;

    const poll = async () => {
      if (!mountedRef.current) return;
      try {
        const cutoff = new Date(Date.now() - STALE_MS).toISOString();
        const users = await base44.entities.VibeWorldPresence.filter({
          is_online: true,
          last_heartbeat: { $gte: cutoff },
        });
        // Exclude self
        const others = users.filter((u) => u.user_id !== user.id);
        setActiveUsers(others);
      } catch {
        // Silently skip
      }
    };

    poll(); // immediate first poll
    const pollTimer = setInterval(poll, POLL_MS);

    return () => clearInterval(pollTimer);
  }, [user?.id]);

  // ── Heartbeat loop — start on mount ─────────────────────────────────────
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

    // pagehide fires reliably on iOS/Safari tab close
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