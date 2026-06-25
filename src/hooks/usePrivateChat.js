/**
 * usePrivateChat — direct chat between two users.
 *
 * KEY INVARIANTS:
 * 1. conversationId = dm_${[userA, userB].sort().join("_")} — always deterministic
 * 2. activeChatPeer is ONLY set via openChat() or acceptRequest() — NEVER inside sendMessage()
 * 3. sendMessage() uses the already-active peer; it never opens or re-opens the chat
 * 4. loadMessages() only loads — it never changes activeChatPeer
 */
import { useState, useEffect, useRef, useCallback } from "react";
import { base44 } from "@/api/base44Client";

const REQUEST_EXPIRY_MS = 60_000;
const CLEANUP_INTERVAL_MS = 30_000;
const DM_NOTIF_THROTTLE_MS = 30_000;

/** Stable, deterministic conversation ID for any two users */
const getChatId = (a, b) => `dm_${[a, b].sort().join("_")}`;

export default function usePrivateChat(user) {
  const [activeChatPeer, setActiveChatPeer] = useState(null);
  const [chatMessages, setChatMessages] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [outgoingStatus, setOutgoingStatus] = useState(null);
  const [blockedUsers, setBlockedUsers] = useState({});
  const [connectedUserIds, setConnectedUserIds] = useState(new Set());

  const userRef = useRef(user);
  userRef.current = user;
  const blockedRef = useRef({});
  blockedRef.current = blockedUsers;
  const activePeerRef = useRef(null);
  activePeerRef.current = activeChatPeer;

  const expiryTimers = useRef({});
  const cleanupTimer = useRef(null);
  const dmNotifTimestamps = useRef({});
  const pollTimerRef = useRef(null);

  const myId = user?.id;
  const myUsername = user?.world_username || "New User";

  // ── Load blocks ──────────────────────────────────────────
  useEffect(() => {
    if (!myId) return;
    base44.entities.UserBlock.filter({ blocker_user_id: myId })
      .then((records) => {
        const map = {};
        records.forEach((r) => { map[r.blocked_user_id] = r.id; });
        setBlockedUsers(map);
        blockedRef.current = map;
      }).catch(() => {});
  }, [myId]);

  // ── Load notifications ───────────────────────────────────
  useEffect(() => {
    if (!myId) return;
    base44.entities.Notification
      .filter({ user_id: myId }, "-created_date", 50)
      .then((notes) => {
        const valid = (notes || []).filter((n) => !n.handled);
        setNotifications(valid);
        setUnreadCount(valid.filter((n) => !n.read).length);
      }).catch(() => {});
  }, [myId]);

  // ── Subscribe to notifications ───────────────────────────
  useEffect(() => {
    if (!myId) return;
    const unsub = base44.entities.Notification.subscribe((event) => {
      if (!event?.data) return;
      const note = event.data;
      if (note.user_id !== myId) return;
      if (event.type === "create") {
        setNotifications((prev) => [note, ...prev]);
        setUnreadCount((c) => c + 1);
        try { navigator?.vibrate?.([15, 30, 15]); } catch {}
      } else if (event.type === "update") {
        setNotifications((prev) => {
          const updated = prev.map((n) => n.id === note.id ? note : n).filter((n) => !n.handled);
          setUnreadCount(updated.filter((n) => !n.read).length);
          return updated;
        });
      }
    });
    return () => { try { unsub(); } catch {} };
  }, [myId]);

  // ── Load existing accepted connections on mount ──────────
  useEffect(() => {
    if (!myId) return;
    base44.entities.PrivateChatRequest.filter({ status: "accepted" })
      .then((records) => {
        const ids = new Set();
        records.forEach((r) => {
          if (r.from_user_id === myId) ids.add(r.to_user_id);
          if (r.to_user_id === myId) ids.add(r.from_user_id);
        });
        setConnectedUserIds(ids);
      }).catch(() => {});
  }, [myId]);

  // ── Load message history for a given peer ───────────────
  // Pure data loader — does NOT touch activeChatPeer
  const loadMessages = useCallback(async (peerUserId) => {
    if (!myId || !peerUserId) return;
    const chatId = getChatId(myId, peerUserId);
    try {
      const msgs = await base44.entities.PrivateChatMessage.filter({ chat_id: chatId }, "created_date", 150);
      const sorted = (msgs || [])
        .filter((m) => !blockedRef.current[m.sender_user_id])
        .sort((a, b) => new Date(a.created_date) - new Date(b.created_date));
      setChatMessages(sorted);
    } catch (err) {
      console.error("[loadMessages] failed:", err);
    }
  }, [myId]);

  // ── Realtime subscription + polling for active chat ──────
  // Runs whenever activeChatPeer changes. NEVER calls setActiveChatPeer.
  useEffect(() => {
    if (!myId || !activeChatPeer?.userId) return;
    const chatId = getChatId(myId, activeChatPeer.userId);

    // Realtime subscription
    const unsub = base44.entities.PrivateChatMessage.subscribe((event) => {
      if (event.type !== "create" || !event.data) return;
      const msg = event.data;
      if (msg.chat_id !== chatId) return;
      if (blockedRef.current[msg.sender_user_id]) return;

      setChatMessages((prev) => {
        if (prev.some((m) => m.id === msg.id)) return prev;
        // Replace matching optimistic from self
        if (msg.sender_user_id === myId) {
          const optIdx = prev.findIndex((m) => m._optimistic && !m._failed && m.message === msg.message);
          if (optIdx !== -1) {
            const next = [...prev];
            next[optIdx] = { ...msg };
            return next;
          }
        }
        return [...prev, msg];
      });
    });

    // 5-second polling fallback — merges real DB records without resetting state
    const poll = setInterval(async () => {
      try {
        const msgs = await base44.entities.PrivateChatMessage.filter({ chat_id: chatId }, "created_date", 150);
        if (!msgs?.length) return;
        const sorted = msgs
          .filter((m) => !blockedRef.current[m.sender_user_id])
          .sort((a, b) => new Date(a.created_date) - new Date(b.created_date));

        setChatMessages((prev) => {
          const existingIds = new Set(prev.filter((m) => !m._optimistic).map((m) => m.id));
          const newReal = sorted.filter((m) => !existingIds.has(m.id));
          if (newReal.length === 0) return prev;
          // Remove stale optimistic messages that now have a real record
          const withoutStaleOptimistic = prev.filter((m) => !m._optimistic || m._failed);
          const merged = [...withoutStaleOptimistic, ...newReal].sort((a, b) => new Date(a.created_date) - new Date(b.created_date));
          return merged;
        });
      } catch {}
    }, 5000);
    pollTimerRef.current = poll;

    return () => {
      try { unsub(); } catch {}
      clearInterval(poll);
    };
  }, [myId, activeChatPeer?.userId]);

  // ── Open chat — the ONLY place that sets activeChatPeer ──
  // Clears stale messages, sets peer, loads history.
  const openChat = useCallback(async (userId, username) => {
    if (!myId || !userId) return;
    // If this peer is already open, just reload messages — don't remount
    if (activePeerRef.current?.userId === userId) {
      await loadMessages(userId);
      return;
    }
    setChatMessages([]);
    setActiveChatPeer({ userId, username });
    await loadMessages(userId);
  }, [myId, loadMessages]);

  // ── Send a message — NEVER touches activeChatPeer ────────
  const sendMessage = useCallback(async (text) => {
    if (!myId || !activePeerRef.current?.userId || !text?.trim()) return { error: "Missing data" };

    const peer = activePeerRef.current;
    const chatId = getChatId(myId, peer.userId);
    const trimmed = text.trim();

    // Optimistic render
    const optimisticId = `optimistic_${Date.now()}_${Math.random()}`;
    const optimisticMsg = {
      id: optimisticId,
      chat_id: chatId,
      sender_user_id: myId,
      sender_username: myUsername,
      receiver_user_id: peer.userId,
      message: trimmed,
      created_date: new Date().toISOString(),
      _optimistic: true,
    };
    setChatMessages((prev) => [...prev, optimisticMsg]);

    try {
      const saved = await base44.entities.PrivateChatMessage.create({
        chat_id: chatId,
        sender_user_id: myId,
        sender_username: myUsername,
        receiver_user_id: peer.userId,
        message: trimmed,
      });

      // Replace optimistic with saved record
      setChatMessages((prev) =>
        prev.map((m) => m.id === optimisticId ? { ...saved } : m)
      );

      // Throttled DM notification
      const lastNotif = dmNotifTimestamps.current[peer.userId] || 0;
      if (Date.now() - lastNotif > DM_NOTIF_THROTTLE_MS) {
        dmNotifTimestamps.current[peer.userId] = Date.now();
        base44.entities.Notification.create({
          user_id: peer.userId,
          type: "direct_message",
          from_user_id: myId,
          from_username: myUsername,
          message: `${myUsername}: ${trimmed.slice(0, 60)}${trimmed.length > 60 ? "…" : ""}`,
          read: false,
          handled: false,
        }).catch(() => {});
      }

      return { success: true };
    } catch (err) {
      console.error("[sendMessage] failed:", err);
      setChatMessages((prev) =>
        prev.map((m) => m.id === optimisticId ? { ...m, _failed: true } : m)
      );
      return { error: "Message failed to send. Try again." };
    }
  }, [myId, myUsername]);

  // ── Send a friend/connect request ────────────────────────
  const sendChatRequest = useCallback(async (toUserId, toUsername) => {
    if (!myId || !toUserId) return { error: "Not authenticated" };
    if (blockedRef.current[toUserId]) return { error: "User is blocked" };

    // Check if they blocked me
    try {
      const theyBlocked = await base44.entities.UserBlock.filter({ blocker_user_id: toUserId, blocked_user_id: myId });
      if (theyBlocked.length > 0) return { error: "Cannot contact this user." };
    } catch {}

    // Check if already connected — if so, open existing chat (don't send a new request)
    try {
      const accepted = await base44.entities.PrivateChatRequest.filter({ status: "accepted" });
      const alreadyConnected = accepted.some((r) =>
        (r.from_user_id === myId && r.to_user_id === toUserId) ||
        (r.from_user_id === toUserId && r.to_user_id === myId)
      );
      if (alreadyConnected) {
        await openChat(toUserId, toUsername);
        return { success: true, alreadyConnected: true };
      }
    } catch {}

    // Check existing pending request
    try {
      const existing = await base44.entities.PrivateChatRequest.filter({ from_user_id: myId, to_user_id: toUserId, status: "pending" });
      if (existing.length > 0) {
        setOutgoingStatus({ toUsername, toUserId, status: "pending" });
        return { error: "Request already sent" };
      }
    } catch {}

    try {
      const expiresAt = new Date(Date.now() + REQUEST_EXPIRY_MS).toISOString();
      const created = await base44.entities.PrivateChatRequest.create({
        from_user_id: myId,
        from_username: myUsername,
        to_user_id: toUserId,
        to_username: toUsername,
        status: "pending",
        expires_at: expiresAt,
      });

      await base44.entities.Notification.create({
        user_id: toUserId,
        type: "friend_request",
        from_user_id: myId,
        from_username: myUsername,
        message: `${myUsername} sent you a connect request.`,
        related_request_id: created.id,
        read: false,
        handled: false,
      }).catch(() => {});

      setOutgoingStatus({ toUsername, toUserId, status: "pending" });

      if (expiryTimers.current[toUserId]) clearTimeout(expiryTimers.current[toUserId]);
      expiryTimers.current[toUserId] = setTimeout(() => {
        setOutgoingStatus((prev) =>
          prev?.toUserId === toUserId && prev?.status === "pending"
            ? { ...prev, status: "expired" } : prev
        );
      }, REQUEST_EXPIRY_MS);

      return { success: true };
    } catch {
      return { error: "Failed to send request" };
    }
  }, [myId, myUsername, openChat]);

  // ── Accept a request ─────────────────────────────────────
  const acceptRequest = useCallback(async (requestId, fromUserId, fromUsername) => {
    if (!myId || !fromUserId) return;
    try {
      await base44.entities.PrivateChatRequest.update(requestId, { status: "accepted" });
      setConnectedUserIds((prev) => new Set([...prev, fromUserId]));

      base44.entities.Notification.create({
        user_id: fromUserId,
        type: "request_accepted",
        from_user_id: myId,
        from_username: myUsername,
        message: `${myUsername} accepted your connect request. Tap to open chat.`,
        related_request_id: requestId,
        read: false,
        handled: false,
      }).catch(() => {});

      // Mark the incoming notification handled
      setNotifications((prev) => {
        const note = prev.find((n) => n.related_request_id === requestId);
        if (note) {
          base44.entities.Notification.update(note.id, { read: true, handled: true }).catch(() => {});
        }
        return prev.filter((n) => n.related_request_id !== requestId);
      });
      setUnreadCount((c) => Math.max(0, c - 1));

      // Open chat for the receiver
      await openChat(fromUserId, fromUsername);
    } catch (err) {
      console.error("[acceptRequest] error:", err);
      // Still try to open chat even on partial failure
      await openChat(fromUserId, fromUsername).catch(() => {});
    }
  }, [myId, myUsername, openChat]);

  // ── Decline a request ────────────────────────────────────
  const declineRequest = useCallback(async (requestId) => {
    try {
      await base44.entities.PrivateChatRequest.update(requestId, { status: "declined" });
      setNotifications((prev) => {
        const note = prev.find((n) => n.related_request_id === requestId);
        if (note) base44.entities.Notification.update(note.id, { read: true, handled: true }).catch(() => {});
        return prev.filter((n) => n.related_request_id !== requestId);
      });
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch {}
  }, []);

  const endChat = useCallback(() => {
    setActiveChatPeer(null);
    setChatMessages([]);
  }, []);

  // ── Block / Unblock ───────────────────────────────────────
  const blockUser = useCallback(async (targetUserId, targetUsername) => {
    if (!myId || !targetUserId) return;
    setBlockedUsers((prev) => ({ ...prev, [targetUserId]: "pending" }));
    try {
      const record = await base44.entities.UserBlock.create({
        blocker_user_id: myId,
        blocked_user_id: targetUserId,
        blocker_username: myUsername,
        blocked_username: targetUsername || "",
      });
      setBlockedUsers((prev) => ({ ...prev, [targetUserId]: record.id }));
      base44.entities.PrivateChatRequest.filter({ from_user_id: targetUserId, to_user_id: myId, status: "pending" })
        .then((reqs) => reqs.forEach((r) => base44.entities.PrivateChatRequest.update(r.id, { status: "blocked" }).catch(() => {})))
        .catch(() => {});
      if (activePeerRef.current?.userId === targetUserId) endChat();
    } catch {
      setBlockedUsers((prev) => { const next = { ...prev }; delete next[targetUserId]; return next; });
    }
  }, [myId, myUsername, endChat]);

  const unblockUser = useCallback(async (targetUserId) => {
    if (!myId || !targetUserId) return;
    const recordId = blockedRef.current[targetUserId];
    setBlockedUsers((prev) => { const next = { ...prev }; delete next[targetUserId]; return next; });
    try {
      if (recordId && recordId !== "pending") {
        await base44.entities.UserBlock.delete(recordId);
      } else {
        const records = await base44.entities.UserBlock.filter({ blocker_user_id: myId, blocked_user_id: targetUserId });
        for (const r of records) await base44.entities.UserBlock.delete(r.id).catch(() => {});
      }
    } catch {
      setBlockedUsers((prev) => ({ ...prev, [targetUserId]: recordId }));
    }
  }, [myId]);

  // ── Notification actions ──────────────────────────────────
  const markNotificationHandled = useCallback(async (noteId) => {
    try {
      await base44.entities.Notification.update(noteId, { read: true, handled: true });
      setNotifications((prev) => prev.filter((n) => n.id !== noteId));
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch {}
  }, []);

  const markAllNotificationsRead = useCallback(async () => {
    const unread = notifications.filter((n) => !n.read);
    for (const n of unread) {
      try { await base44.entities.Notification.update(n.id, { read: true }); } catch {}
    }
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
  }, [notifications]);

  const clearOutgoingStatus = useCallback(() => setOutgoingStatus(null), []);

  // ── isConnected (sync) ────────────────────────────────────
  const isConnected = useCallback((targetUserId) => connectedUserIds.has(targetUserId), [connectedUserIds]);

  // ── Update connectedUserIds when "request_accepted" arrives ─
  useEffect(() => {
    const acceptedNotes = notifications.filter((n) => n.type === "request_accepted" && n.from_user_id);
    if (acceptedNotes.length === 0) return;
    setConnectedUserIds((prev) => {
      const next = new Set(prev);
      acceptedNotes.forEach((n) => next.add(n.from_user_id));
      return next;
    });
    setOutgoingStatus((prev) => {
      if (!prev) return prev;
      const match = acceptedNotes.find((n) => n.from_user_id !== myId);
      if (match) return { ...prev, status: "accepted" };
      return prev;
    });
  }, [notifications, myId]);

  // ── Periodic cleanup of expired requests ─────────────────
  useEffect(() => {
    if (!myId) return;
    cleanupTimer.current = setInterval(async () => {
      try {
        const now = new Date().toISOString();
        const stale = await base44.entities.PrivateChatRequest.filter({ status: "pending" });
        for (const req of stale) {
          if (req.expires_at && req.expires_at < now) {
            if (req.created_by_id === myId || req.to_user_id === myId) {
              await base44.entities.PrivateChatRequest.update(req.id, { status: "expired" }).catch(() => {});
            }
          }
        }
      } catch {}
    }, CLEANUP_INTERVAL_MS);
    return () => clearInterval(cleanupTimer.current);
  }, [myId]);

  return {
    activeChatPeer,
    chatMessages,
    notifications,
    unreadCount,
    outgoingStatus,
    blockedUsers,
    connectedUserIds,
    isConnected,
    sendChatRequest,
    acceptRequest,
    declineRequest,
    sendMessage,
    endChat,
    openChat,
    blockUser,
    unblockUser,
    markNotificationHandled,
    markAllNotificationsRead,
    clearOutgoingStatus,
  };
}