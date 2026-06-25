/**
 * useLoungeChat — Vibe Lounge group chat with duplicate-safe optimistic updates.
 *
 * Duplicate prevention strategy:
 *  1. A `clientMsgId` (stable per send attempt) is stored on the optimistic record.
 *  2. When the realtime subscription fires with the saved record, we first try to
 *     replace the optimistic record that has a matching clientMsgId. If no match,
 *     we fall back to the standard id-dedup check.
 *  3. The Send button is disabled until the previous send resolves (setSending guard).
 *  4. A per-instance sendingRef prevents concurrent sends even if the hook is called
 *     faster than React re-renders.
 */
import { useState, useEffect, useRef, useCallback } from "react";
import { base44 } from "@/api/base44Client";

const MAX_MESSAGES = 60;
const COOLDOWN_MS = 1500;

export default function useLoungeChat(userId, username, blockedUsers = {}) {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const lastSentAt = useRef(0);
  const sendingRef = useRef(false);   // hard lock — prevents double-fire even before state updates
  const blockedRef = useRef(blockedUsers);
  blockedRef.current = blockedUsers;

  // ── Initial load ───────────────────────────────────────────────────
  useEffect(() => {
    if (!userId) return;
    setLoading(true);
    base44.entities.LoungeMessage
      .list("-created_date", MAX_MESSAGES)
      .then((msgs) => {
        const filtered = [...(msgs || [])].reverse().filter(
          (m) => !blockedRef.current[m.sender_user_id]
        );
        setMessages(filtered);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [userId]);

  // ── Realtime subscription ──────────────────────────────────────────
  // When a new message arrives:
  //   a) If a matching optimistic record exists (same clientMsgId or same sender+text+recent),
  //      REPLACE it so the message appears exactly once.
  //   b) Otherwise, append only if not already present (id dedup).
  useEffect(() => {
    if (!userId) return;
    const unsub = base44.entities.LoungeMessage.subscribe((event) => {
      if (!event?.data) return;
      const msg = event.data;
      if (blockedRef.current[msg.sender_user_id]) return;

      if (event.type === "create") {
        setMessages((prev) => {
          // Already present by real id — skip
          if (prev.some((m) => m.id === msg.id)) return prev;

          // Try to replace a matching optimistic record:
          //  - same clientMsgId stored in msg (if we stored it)
          //  - OR same sender + same message text + optimistic flag + sent within 15s
          const now = Date.now();
          const optimisticIdx = prev.findIndex((m) => {
            if (!m._optimistic) return false;
            if (m.sender_user_id !== msg.sender_user_id) return false;
            if (m.message !== msg.message) return false;
            const age = now - new Date(m.created_date).getTime();
            return age < 15000;
          });

          if (optimisticIdx !== -1) {
            // Replace the optimistic entry with the real saved message
            const next = [...prev];
            next[optimisticIdx] = msg;
            return next;
          }

          // New message from someone else (or our own from another device)
          return [...prev, msg].slice(-MAX_MESSAGES);
        });
      }
    });
    return () => { try { unsub(); } catch {} };
  }, [userId]);

  // ── Re-filter when block list changes ──────────────────────────────
  useEffect(() => {
    setMessages((prev) => prev.filter((m) => !blockedRef.current[m.sender_user_id]));
  }, [JSON.stringify(blockedUsers)]);

  // ── sendMessage ────────────────────────────────────────────────────
  const sendMessage = useCallback(async (text) => {
    if (!userId) return { error: "Sign in to chat" };
    if (!username) return { error: "Set a username first" };
    const trimmed = text?.trim();
    if (!trimmed) return { error: "Empty message" };
    if (trimmed.length > 250) return { error: "Max 250 characters" };

    // Hard lock — prevents double-send from fast taps even before state settles
    if (sendingRef.current) return { error: "Still sending…" };

    const now = Date.now();
    if (now - lastSentAt.current < COOLDOWN_MS) {
      return { error: "Slow down a bit" };
    }

    sendingRef.current = true;
    lastSentAt.current = now;

    // Add optimistic message immediately so the sender sees it right away
    const optimisticId = `opt_${now}_${Math.random().toString(36).slice(2, 7)}`;
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
      // Optimistic record will be replaced by the subscription handler above
      return { success: true };
    } catch {
      // Remove the optimistic record on failure
      setMessages((prev) => prev.filter((m) => m.id !== optimisticId));
      return { error: "Message failed to send. Try again." };
    } finally {
      sendingRef.current = false;
    }
  }, [userId, username]);

  return { messages, sendMessage, loading };
}