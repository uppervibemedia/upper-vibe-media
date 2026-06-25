import { useState, useEffect, useRef, useCallback } from "react";
import { base44 } from "@/api/base44Client";

const MAX_LENGTH = 250;
const COOLDOWN_MS = 2000;
const MAX_MESSAGES = 60;

export default function useZoneChat(zoneId, userId, username, blockedUsers = {}) {
  const [messages, setMessages] = useState([]);
  const lastSentAt = useRef(0);
  const lastMessage = useRef("");
  // Keep a ref to blockedUsers so the subscription closure always sees the latest value
  const blockedRef = useRef(blockedUsers);
  blockedRef.current = blockedUsers;

  // Load + subscribe — re-runs only when zoneId changes
  useEffect(() => {
    if (!zoneId) return;
    setMessages([]);

    base44.entities.ZoneChatMessage
      .filter({ zone_id: zoneId }, "-created_date", MAX_MESSAGES)
      .then((msgs) => {
        if (!msgs?.length) return;
        const filtered = [...msgs]
          .reverse()
          .filter((m) => !blockedRef.current[m.user_id]);
        setMessages(filtered);
      })
      .catch(() => {});

    // Realtime subscription — uses ref so it never needs to be re-created for block changes
    const unsub = base44.entities.ZoneChatMessage.subscribe((event) => {
      if (!event?.data) return;
      const msg = event.data;
      if (msg.zone_id !== zoneId) return;
      if (blockedRef.current[msg.user_id]) return;

      if (event.type === "create") {
        setMessages((prev) => {
          // Deduplicate (optimistic message already has a temp id starting with "opt_")
          const withoutOptimistic = prev.filter(
            (m) => !(m._optimistic && m.message === msg.message && m.user_id === msg.user_id)
          );
          const next = [...withoutOptimistic, msg];
          return next.slice(-MAX_MESSAGES);
        });
      } else if (event.type === "delete") {
        setMessages((prev) => prev.filter((m) => m.id !== msg.id));
      }
    });

    return () => { try { unsub(); } catch {} };
  }, [zoneId]);

  // Re-filter visible messages when block list changes
  useEffect(() => {
    setMessages((prev) => prev.filter((m) => !blockedRef.current[m.user_id]));
  }, [JSON.stringify(blockedUsers)]);

  const sendMessage = useCallback(async (text, isQuick = false) => {
    if (!userId) return { error: "Sign in to chat" };
    if (!username || username === "Visitor") return { error: "Set a username to chat" };
    if (!zoneId) return { error: "No zone selected" };

    const trimmed = text?.trim();
    if (!trimmed) return { error: "Empty message" };
    if (trimmed.length > MAX_LENGTH) return { error: `Max ${MAX_LENGTH} characters` };

    const now = Date.now();
    if (now - lastSentAt.current < COOLDOWN_MS) {
      return { error: "Slow down — 1 message every 2 seconds" };
    }
    if (trimmed === lastMessage.current) {
      return { error: "Don't repeat the same message" };
    }

    lastSentAt.current = now;
    lastMessage.current = trimmed;

    // Optimistic add — shows instantly, replaced by real message from subscription
    const optimisticMsg = {
      id: `opt_${Date.now()}`,
      _optimistic: true,
      zone_id: zoneId,
      user_id: userId,
      username,
      message: trimmed,
      is_quick: isQuick,
      created_date: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimisticMsg].slice(-MAX_MESSAGES));

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
      // Roll back optimistic message on failure
      setMessages((prev) => prev.filter((m) => m.id !== optimisticMsg.id));
      return { error: "Failed to send — try again" };
    }
  }, [userId, username, zoneId]);

  return { messages, sendMessage };
}