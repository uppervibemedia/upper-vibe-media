import { useState, useEffect, useRef, useCallback } from "react";
import { base44 } from "@/api/base44Client";

const MAX_LENGTH = 250;
const COOLDOWN_MS = 2000; // 1 message per 2 seconds
const MAX_MESSAGES = 60;

export default function useZoneChat(zoneId, userId, username, blockedUsers = {}) {
  const [messages, setMessages] = useState([]);
  const lastSentAt = useRef(0);
  const lastMessage = useRef("");

  // Load recent messages for this zone
  useEffect(() => {
    if (!zoneId) return;
    setMessages([]);

    base44.entities.ZoneChatMessage
      .filter({ zone_id: zoneId }, "-created_date", MAX_MESSAGES)
      .then((msgs) => {
        if (!msgs?.length) return;
        // Reverse to chronological order, filter blocked
        const filtered = [...msgs]
          .reverse()
          .filter((m) => !blockedUsers[m.user_id]);
        setMessages(filtered);
      })
      .catch(() => {});

    // Realtime subscription
    const unsub = base44.entities.ZoneChatMessage.subscribe((event) => {
      if (!event?.data) return;
      const msg = event.data;
      if (msg.zone_id !== zoneId) return;
      if (blockedUsers[msg.user_id]) return;

      if (event.type === "create") {
        setMessages((prev) => {
          const next = [...prev, msg];
          return next.slice(-MAX_MESSAGES);
        });
      } else if (event.type === "delete") {
        setMessages((prev) => prev.filter((m) => m.id !== msg.id));
      }
    });

    return () => {
      try { unsub(); } catch {}
    };
  }, [zoneId]);

  // Re-filter when blockedUsers changes
  useEffect(() => {
    setMessages((prev) => prev.filter((m) => !blockedUsers[m.user_id]));
  }, [JSON.stringify(blockedUsers)]);

  const sendMessage = useCallback(async (text, isQuick = false) => {
    if (!userId || !username || !zoneId) return { error: "Not authenticated" };

    const trimmed = text?.trim();
    if (!trimmed) return { error: "Empty message" };
    if (trimmed.length > MAX_LENGTH) return { error: `Max ${MAX_LENGTH} characters` };

    // Cooldown check
    const now = Date.now();
    if (now - lastSentAt.current < COOLDOWN_MS) {
      return { error: "Slow down — 1 message every 2 seconds" };
    }

    // Spam check (same message twice in a row)
    if (trimmed === lastMessage.current) {
      return { error: "Don't repeat the same message" };
    }

    lastSentAt.current = now;
    lastMessage.current = trimmed;

    try {
      await base44.entities.ZoneChatMessage.create({
        zone_id: zoneId,
        user_id: userId,
        username,
        message: trimmed,
        is_quick: isQuick,
      });
      return { success: true };
    } catch (e) {
      return { error: "Failed to send" };
    }
  }, [userId, username, zoneId]);

  return { messages, sendMessage };
}