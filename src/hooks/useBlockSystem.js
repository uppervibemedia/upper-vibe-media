/**
 * useBlockSystem — persists blocks to UserBlock entity.
 * Loads on mount, exposes block/unblock/isBlocked.
 */
import { useState, useEffect, useCallback, useRef } from "react";
import { base44 } from "@/api/base44Client";

export default function useBlockSystem(currentUserId, currentUsername) {
  // Map: blockedUserId → record id
  const [blockMap, setBlockMap] = useState({});
  const blockMapRef = useRef({});

  useEffect(() => { blockMapRef.current = blockMap; }, [blockMap]);

  // Load existing blocks on mount
  useEffect(() => {
    if (!currentUserId) return;
    base44.entities.UserBlock.filter({ blocker_user_id: currentUserId })
      .then((records) => {
        const map = {};
        records.forEach((r) => { map[r.blocked_user_id] = r.id; });
        setBlockMap(map);
      })
      .catch(() => {});
  }, [currentUserId]);

  const isBlocked = useCallback((userId) => !!blockMapRef.current[userId], []);

  const blockUser = useCallback(async (targetUserId, targetUsername) => {
    if (!currentUserId || !targetUserId) return;
    if (blockMapRef.current[targetUserId]) return; // already blocked

    // Optimistic
    setBlockMap((prev) => ({ ...prev, [targetUserId]: "pending" }));

    try {
      const record = await base44.entities.UserBlock.create({
        blocker_user_id: currentUserId,
        blocked_user_id: targetUserId,
        blocker_username: currentUsername || "",
        blocked_username: targetUsername || "",
      });
      setBlockMap((prev) => ({ ...prev, [targetUserId]: record.id }));

      // Also decline/cancel any pending chat requests between them
      try {
        const pending = await base44.entities.PrivateChatRequest.filter({
          from_user_id: targetUserId,
          to_user_id: currentUserId,
          status: "pending",
        });
        for (const req of pending) {
          await base44.entities.PrivateChatRequest.update(req.id, { status: "blocked" }).catch(() => {});
        }
      } catch {}
    } catch {
      // Rollback
      setBlockMap((prev) => {
        const next = { ...prev };
        delete next[targetUserId];
        return next;
      });
    }
  }, [currentUserId, currentUsername]);

  const unblockUser = useCallback(async (targetUserId) => {
    if (!currentUserId || !targetUserId) return;
    const recordId = blockMapRef.current[targetUserId];
    if (!recordId) return;

    // Optimistic
    setBlockMap((prev) => {
      const next = { ...prev };
      delete next[targetUserId];
      return next;
    });

    try {
      if (recordId && recordId !== "pending") {
        await base44.entities.UserBlock.delete(recordId);
      } else {
        // Find by filter
        const records = await base44.entities.UserBlock.filter({
          blocker_user_id: currentUserId,
          blocked_user_id: targetUserId,
        });
        for (const r of records) {
          await base44.entities.UserBlock.delete(r.id).catch(() => {});
        }
      }
    } catch {
      // Rollback
      setBlockMap((prev) => ({ ...prev, [targetUserId]: recordId }));
    }
  }, [currentUserId]);

  return { isBlocked, blockUser, unblockUser, blockMap };
}