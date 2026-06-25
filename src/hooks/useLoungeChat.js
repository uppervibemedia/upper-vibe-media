/**
 * useLoungeChat — simple Vibe Lounge group chat.
 * Only uses LoungeMessage entity. No zone routing.
 */
import { useState, useEffect, useRef, useCallback } from "react";
import { base44 } from "@/api/base44Client";

const MAX_MESSAGES = 60;
const COOLDOWN_MS = 2000;

export default function useLoungeChat(userId, username, blockedUsers = {}) {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const lastSentAt = useRef(0);
  const blockedRef = useRef(blockedUsers);
  blockedRef.current = blockedUsers;

  // Load initial messages
  useEffect(() => {
    if (!userId) return;
    setLoading(true);
    base44.entities.LoungeMessage
      .list("-created_date", MAX_MESSAGES)
      .then((msgs) => {
        const filtered = [...(msgs || [])].reverse().filter((m) => !blockedRef.current[m.sender_user_id]);
        setMessages(filtered);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [userId]);

  // Real-time subscription
  useEffect(() => {
    if (!userId) return;
    const unsub = base44.entities.LoungeMessage.subscribe((event) => {
      if (!event?.data) return;
      const msg = event.data;
      if (blockedRef.current[msg.sender_user_id]) return;
      if (event.type === "create") {
        setMessages((prev) => {
          if (prev.some((m) => m.id === msg.id)) return prev;
          return [...prev, msg].slice(-MAX_MESSAGES);
        });
      }
    });
    return () => { try { unsub(); } catch {} };
  }, [userId]);

  // Re-filter when block list changes
  useEffect(() => {
    setMessages((prev) => prev.filter((m) => !blockedRef.current[m.sender_user_id]));
  }, [JSON.stringify(blockedUsers)]);

  const sendMessage = useCallback(async (text) => {
    if (!userId) return { error: "Sign in to chat" };
    if (!username) return { error: "Set a username first" };
    const trimmed = text?.trim();
    if (!trimmed) return { error: "Empty message" };
    if (trimmed.length > 250) return { error: "Max 250 characters" };

    const now = Date.now();
    if (now - lastSentAt.current < COOLDOWN_MS) {
      return { error: "Slow down — 1 message every 2 seconds" };
    }
    lastSentAt.current = now;

    // Optimistic
    const optimisticId = `opt_${Date.now()}`;
    const optimisticMsg = {
      id: optimisticId,
      _optimistic: true,
      sender_user_id: userId,
      sender_username: username,
      message: trimmed,
      created_date: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimisticMsg].slice(-MAX_MESSAGES));

    try {
      await base44.entities.LoungeMessage.create({
        sender_user_id: userId,
        sender_username: username,
        message: trimmed,
      });
      return { success: true };
    } catch {
      setMessages((prev) => prev.filter((m) => m.id !== optimisticId));
      return { error: "Failed to send — try again" };
    }
  }, [userId, username]);

  return { messages, sendMessage, loading };
}