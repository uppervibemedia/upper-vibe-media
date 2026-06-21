import { useState, useEffect, useRef, useCallback } from "react";
import { base44 } from "@/api/base44Client";

const REQUEST_EXPIRY_MS = 60_000; // 60 seconds
const COOLDOWN_MS = 120_000; // 2 minutes cooldown after decline
const CLEANUP_INTERVAL_MS = 15_000;

export default function usePrivateChat(user) {
  const [activeChatPeer, setActiveChatPeer] = useState(null); // { userId, username }
  const [chatMessages, setChatMessages] = useState([]);
  const [incomingRequest, setIncomingRequest] = useState(null); // { id, fromUsername, fromUserId }
  const [outgoingStatus, setOutgoingStatus] = useState(null); // { toUsername, status: 'pending'|'accepted'|'declined'|'expired' }
  const [safetyConfirmed, setSafetyConfirmed] = useState(false);
  const [blockedUsers, setBlockedUsers] = useState({});

  const chatSubRef = useRef(null);
  const requestSubRef = useRef(null);
  const expiryTimersRef = useRef({});
  const cleanupTimerRef = useRef(null);

  // ── Build chat_id from two user IDs (sorted) ──────────────────
  const getChatId = useCallback((uid1, uid2) => {
    return [uid1, uid2].sort().join("_");
  }, []);

  // ── Load messages for active chat ──────────────────────────────
  const loadMessages = useCallback(async (peerUserId) => {
    if (!user?.id || !peerUserId) return;
    const chatId = getChatId(user.id, peerUserId);
    try {
      const msgs = await base44.entities.PrivateChatMessage.filter(
        { chat_id: chatId },
        "created_date",
        50
      );
      setChatMessages(msgs);
    } catch {}
  }, [user, getChatId]);

  // ── Send a chat request ───────────────────────────────────────
  const myDisplayName = user?.full_name || user?.email?.split("@")[0] || "Anon";

  const sendChatRequest = useCallback(async (toUserId, toUsername) => {
    if (!user?.id) {
      console.warn("[sendChatRequest] Not authenticated, no user.id");
      return { error: "Not authenticated" };
    }
    if (!toUserId) {
      console.warn("[sendChatRequest] No target user ID provided");
      return { error: "No target user" };
    }

    // Check block
    if (blockedUsers[toUserId]) return { error: "User is blocked" };

    // Check existing pending request
    try {
      const existing = await base44.entities.PrivateChatRequest.filter({
        from_user_id: user.id,
        to_user_id: toUserId,
        status: "pending",
      });
      if (existing.length > 0) return { error: "You already have a pending request to this user" };
    } catch (e) {
      console.warn("[sendChatRequest] Error checking existing requests:", e);
    }

    try {
      const expiresAt = new Date(Date.now() + REQUEST_EXPIRY_MS).toISOString();
      console.log("[sendChatRequest] Creating request:", {
        from_user_id: user.id,
        from_username: myDisplayName,
        to_user_id: toUserId,
        to_username: toUsername,
      });
      const created = await base44.entities.PrivateChatRequest.create({
        from_user_id: user.id,
        from_username: myDisplayName,
        to_user_id: toUserId,
        to_username: toUsername,
        status: "pending",
        expires_at: expiresAt,
      });
      console.log("[sendChatRequest] Created:", created);
      setOutgoingStatus({ toUsername, status: "pending" });

      // Auto-expire timer
      expiryTimersRef.current[toUserId] = setTimeout(() => {
        setOutgoingStatus((prev) =>
          prev?.toUsername === toUsername && prev?.status === "pending"
            ? { toUsername, status: "expired" }
            : prev
        );
      }, REQUEST_EXPIRY_MS);

      return { success: true };
    } catch (e) {
      console.error("[sendChatRequest] Failed to create request:", e);
      return { error: "Failed to send request: " + (e?.message || String(e)) };
    }
  }, [user, blockedUsers, myDisplayName]);

  // ── Accept incoming request ──────────────────────────────────
  const acceptRequest = useCallback(async (requestId, fromUserId, fromUsername) => {
    try {
      await base44.entities.PrivateChatRequest.update(requestId, { status: "accepted" });
      setIncomingRequest(null);
      setActiveChatPeer({ userId: fromUserId, username: fromUsername });
      await loadMessages(fromUserId);
    } catch {}
  }, [loadMessages]);

  // ── Decline incoming request ─────────────────────────────────
  const declineRequest = useCallback(async (requestId, fromUserId) => {
    try {
      await base44.entities.PrivateChatRequest.update(requestId, { status: "declined" });
      setIncomingRequest(null);
    } catch {}
  }, []);

  // ── End chat (close panel) ───────────────────────────────────
  const endChat = useCallback(() => {
    setActiveChatPeer(null);
    setChatMessages([]);
  }, []);

  // ── Send a message ───────────────────────────────────────────
  const sendMessage = useCallback(async (text) => {
    if (!user?.id || !activeChatPeer?.userId || !text?.trim()) return;
    const name = user?.full_name || user?.email?.split("@")[0] || "Anon";
    try {
      const chatId = getChatId(user.id, activeChatPeer.userId);
      await base44.entities.PrivateChatMessage.create({
        chat_id: chatId,
        sender_user_id: user.id,
        sender_username: name,
        receiver_user_id: activeChatPeer.userId,
        message: text.trim(),
      });
    } catch {}
  }, [user, activeChatPeer, getChatId]);

  // ── Block user ───────────────────────────────────────────────
  const blockUser = useCallback(async (blockedUserId) => {
    setBlockedUsers((prev) => ({ ...prev, [blockedUserId]: true }));

    // Decline any pending requests from this user
    try {
      const pending = await base44.entities.PrivateChatRequest.filter({
        from_user_id: blockedUserId,
        to_user_id: user.id,
        status: "pending",
      });
      for (const req of pending) {
        await base44.entities.PrivateChatRequest.update(req.id, { status: "blocked" });
      }
    } catch {}

    // Close active chat if it's with this user
    if (activeChatPeer?.userId === blockedUserId) {
      endChat();
    }

    if (incomingRequest?.fromUserId === blockedUserId) {
      setIncomingRequest(null);
    }
  }, [user, activeChatPeer, incomingRequest, endChat]);

  // ── Subscribe to incoming requests ───────────────────────────
  useEffect(() => {
    if (!user?.id) return;

    const unsubscribe = base44.entities.PrivateChatRequest.subscribe((event) => {
      if (event.type !== "create" || !event.data) return;
      const data = event.data;
      if (data.to_user_id !== user.id) return;
      if (data.status !== "pending") return;
      if (blockedUsers[data.from_user_id]) return;

      setIncomingRequest({
        id: data.id,
        fromUserId: data.from_user_id,
        fromUsername: data.from_username,
      });

      // Auto-expire incoming request
      expiryTimersRef.current[`in_${data.from_user_id}`] = setTimeout(() => {
        setIncomingRequest((prev) =>
          prev?.fromUserId === data.from_user_id ? null : prev
        );
      }, REQUEST_EXPIRY_MS);
    });

    requestSubRef.current = unsubscribe;
    return () => unsubscribe();
  }, [user?.id, blockedUsers]);

  // ── Subscribe to messages in active chat ─────────────────────
  useEffect(() => {
    if (!user?.id || !activeChatPeer?.userId) return;

    const chatId = getChatId(user.id, activeChatPeer.userId);

    const unsubscribe = base44.entities.PrivateChatMessage.subscribe((event) => {
      if (event.type !== "create" || !event.data) return;
      if (event.data.chat_id !== chatId) return;
      setChatMessages((prev) => [...prev, event.data]);
    });

    chatSubRef.current = unsubscribe;
    return () => unsubscribe();
  }, [user?.id, activeChatPeer?.userId, getChatId]);

  // ── Periodic cleanup: expire stale requests ──────────────────
  useEffect(() => {
    if (!user?.id) return;
    cleanupTimerRef.current = setInterval(async () => {
      try {
        const now = new Date().toISOString();
        const stale = await base44.entities.PrivateChatRequest.filter({
          status: "pending",
          expires_at: { $lt: now },
        });
        for (const req of stale) {
          if (req.created_by_id === user.id || req.to_user_id === user.id) {
            await base44.entities.PrivateChatRequest.update(req.id, { status: "expired" }).catch(() => {});
          }
        }
      } catch {}
    }, CLEANUP_INTERVAL_MS);

    return () => clearInterval(cleanupTimerRef.current);
  }, [user?.id]);

  // ── Cleanup on unmount ───────────────────────────────────────
  useEffect(() => {
    return () => {
      Object.values(expiryTimersRef.current).forEach(clearTimeout);
      if (cleanupTimerRef.current) clearInterval(cleanupTimerRef.current);
    };
  }, []);

  return {
    // Active chat
    activeChatPeer,
    chatMessages,
    // Incoming
    incomingRequest,
    // Outgoing
    outgoingStatus,
    // Safety
    safetyConfirmed,
    setSafetyConfirmed,
    // Actions
    sendChatRequest,
    acceptRequest,
    declineRequest,
    sendMessage,
    endChat,
    blockUser,
    blockedUsers,
  };
}