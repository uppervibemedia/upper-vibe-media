/**
 * usePrivateChat — clean rebuild.
 * Friend requests → notifications → direct messages.
 * No zone chat. Uses world_username only. No email fallbacks.
 */
import { useState, useEffect, useRef, useCallback } from "react";
import { base44 } from "@/api/base44Client";

const REQUEST_EXPIRY_MS = 60_000;
const CLEANUP_INTERVAL_MS = 30_000;
// Throttle DM notifications: only send one per peer per 30s to avoid spam
const DM_NOTIF_THROTTLE_MS = 30_000;

export default function usePrivateChat(user) {
  const [activeChatPeer, setActiveChatPeer] = useState(null);
  const [chatMessages, setChatMessages] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [outgoingStatus, setOutgoingStatus] = useState(null);
  const [blockedUsers, setBlockedUsers] = useState({});

  const userRef = useRef(user);
  userRef.current = user;
  const blockedRef = useRef({});
  blockedRef.current = blockedUsers;
  const expiryTimers = useRef({});
  const cleanupTimer = useRef(null);
  const chatSubRef = useRef(null);
  const dmNotifTimestamps = useRef({}); // peerUserId → last notification timestamp

  const myId = user?.id;
  const myUsername = user?.world_username || "New User";

  const getChatId = useCallback((a, b) => `dm_${[a, b].sort().join("_")}`, []);

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

  // ── Subscribe to messages in active chat ─────────────────
  useEffect(() => {
    if (!myId || !activeChatPeer?.userId) return;
    const chatId = getChatId(myId, activeChatPeer.userId);
    const peerUserId = activeChatPeer.userId;

    const unsub = base44.entities.PrivateChatMessage.subscribe((event) => {
      if (event.type !== "create" || !event.data) return;
      const msg = event.data;
      if (msg.chat_id !== chatId) return;
      if (blockedRef.current[msg.sender_user_id]) return;
      setChatMessages((prev) => {
        if (prev.some((m) => m.id === msg.id)) return prev;
        // Replace matching optimistic message from self
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
    chatSubRef.current = unsub;

    // Polling fallback — catches messages realtime subscription may have missed
    const poll = setInterval(async () => {
      try {
        const msgs = await base44.entities.PrivateChatMessage.filter({ chat_id: chatId }, "created_date", 100);
        if (!msgs?.length) return;
        const sorted = msgs.sort((a, b) => new Date(a.created_date) - new Date(b.created_date));
        setChatMessages((prev) => {
          // Merge: add any real DB messages not yet in state (skip optimistic duplicates)
          const existingIds = new Set(prev.filter((m) => !m._optimistic).map((m) => m.id));
          const newReal = sorted.filter((m) => !existingIds.has(m.id) && !blockedRef.current[m.sender_user_id]);
          if (newReal.length === 0) return prev;
          // Replace optimistic messages that now have real records
          let next = prev.filter((m) => !m._optimistic || m._failed);
          next = [...next, ...newReal].sort((a, b) => new Date(a.created_date) - new Date(b.created_date));
          return next;
        });
      } catch {}
    }, 5000);

    return () => {
      try { unsub(); } catch {}
      clearInterval(poll);
    };
  }, [myId, activeChatPeer?.userId, getChatId]);

  // ── Load messages when chat opens ───────────────────────
  const loadMessages = useCallback(async (peerUserId) => {
    if (!myId || !peerUserId) return;
    const chatId = getChatId(myId, peerUserId);
    try {
      const msgs = await base44.entities.PrivateChatMessage.filter({ chat_id: chatId }, "created_date", 100);
      // Sort ascending by created_date so oldest message is at top
      const sorted = (msgs || []).sort((a, b) => new Date(a.created_date) - new Date(b.created_date));
      setChatMessages(sorted);
    } catch (err) {
      console.error("[loadMessages] failed:", err);
      // Keep current messages rather than wiping on error
    }
  }, [myId, getChatId]);

  // ── Send friend request ──────────────────────────────────
  const sendChatRequest = useCallback(async (toUserId, toUsername) => {
    if (!myId || !toUserId) return { error: "Not authenticated" };
    if (blockedRef.current[toUserId]) return { error: "User is blocked" };

    // Check if they blocked me
    try {
      const theyBlocked = await base44.entities.UserBlock.filter({ blocker_user_id: toUserId, blocked_user_id: myId });
      if (theyBlocked.length > 0) return { error: "Cannot contact this user." };
    } catch {}

    // Check existing pending
    try {
      const existing = await base44.entities.PrivateChatRequest.filter({ from_user_id: myId, to_user_id: toUserId, status: "pending" });
      if (existing.length > 0) return { error: "Request already sent" };
      // Check if already accepted (already connected)
      const accepted = await base44.entities.PrivateChatRequest.filter({
        $or: [
          { from_user_id: myId, to_user_id: toUserId, status: "accepted" },
          { from_user_id: toUserId, to_user_id: myId, status: "accepted" },
        ]
      });
      if (accepted.length > 0) {
        // Already connected — open chat directly
        setActiveChatPeer({ userId: toUserId, username: toUsername });
        await loadMessages(toUserId);
        return { success: true, alreadyConnected: true };
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

      // Notify the receiver
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

      // Auto-expire
      if (expiryTimers.current[toUserId]) clearTimeout(expiryTimers.current[toUserId]);
      expiryTimers.current[toUserId] = setTimeout(() => {
        setOutgoingStatus((prev) =>
          prev?.toUserId === toUserId && prev?.status === "pending"
            ? { ...prev, status: "expired" }
            : prev
        );
      }, REQUEST_EXPIRY_MS);

      return { success: true };
    } catch (e) {
      return { error: "Failed to send request" };
    }
  }, [myId, myUsername, loadMessages]);

  // ── Track accepted connections locally for instant UI update ──────────
  const [connectedUserIds, setConnectedUserIds] = useState(new Set());

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

  // ── Accept a friend request (from notification) ──────────
  const acceptRequest = useCallback(async (requestId, fromUserId, fromUsername) => {
    if (!myId || !fromUserId) return;
    let chatOpened = false;
    try {
      // 1. Update request status to accepted
      await base44.entities.PrivateChatRequest.update(requestId, { status: "accepted" });

      // 2. Update local connected set immediately
      setConnectedUserIds((prev) => new Set([...prev, fromUserId]));

      // 3. Notify the sender that their request was accepted
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

      // 4. Mark the receiver's own friend_request notification as handled
      const relatedNote = notifications.find((n) => n.related_request_id === requestId);
      if (relatedNote) {
        base44.entities.Notification.update(relatedNote.id, { read: true, handled: true }).catch(() => {});
        setNotifications((prev) => prev.filter((n) => n.id !== relatedNote.id));
        setUnreadCount((c) => Math.max(0, c - 1));
      }

      // 5. Open direct chat immediately for the receiver
      setActiveChatPeer({ userId: fromUserId, username: fromUsername });
      await loadMessages(fromUserId);
      chatOpened = true;
    } catch (err) {
      console.error("[acceptRequest] error:", err);
      // Even if something failed, still try to open chat
      if (!chatOpened && fromUserId && fromUsername) {
        setActiveChatPeer({ userId: fromUserId, username: fromUsername });
        await loadMessages(fromUserId).catch(() => {});
      }
    }
  }, [myId, myUsername, notifications, loadMessages]);

  // ── Decline a request ────────────────────────────────────
  const declineRequest = useCallback(async (requestId) => {
    try {
      await base44.entities.PrivateChatRequest.update(requestId, { status: "declined" });
      const relatedNote = notifications.find((n) => n.related_request_id === requestId);
      if (relatedNote) {
        await base44.entities.Notification.update(relatedNote.id, { read: true, handled: true }).catch(() => {});
        setNotifications((prev) => prev.filter((n) => n.id !== relatedNote.id));
        setUnreadCount((c) => Math.max(0, c - 1));
      }
    } catch {}
  }, [notifications]);

  // ── Send a message ───────────────────────────────────────
  // Returns { success: true } or { error: string }
  const sendMessage = useCallback(async (text) => {
    if (!myId || !activeChatPeer?.userId || !text?.trim()) return { error: "Missing data" };
    const chatId = getChatId(myId, activeChatPeer.userId);
    const trimmed = text.trim();

    // Optimistic: add to local state immediately so it appears right away
    const optimisticId = `optimistic_${Date.now()}`;
    const optimisticMsg = {
      id: optimisticId,
      chat_id: chatId,
      sender_user_id: myId,
      sender_username: myUsername,
      receiver_user_id: activeChatPeer.userId,
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
        receiver_user_id: activeChatPeer.userId,
        message: trimmed,
      });

      // Replace optimistic with real saved record
      setChatMessages((prev) =>
        prev.map((m) => m.id === optimisticId ? { ...saved } : m)
      );

      // Notify receiver — throttled to avoid spam (one notif per 30s per peer)
      const lastNotif = dmNotifTimestamps.current[activeChatPeer.userId] || 0;
      if (Date.now() - lastNotif > DM_NOTIF_THROTTLE_MS) {
        dmNotifTimestamps.current[activeChatPeer.userId] = Date.now();
        base44.entities.Notification.create({
          user_id: activeChatPeer.userId,
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
      // Mark the optimistic message as failed so the UI can show retry
      setChatMessages((prev) =>
        prev.map((m) => m.id === optimisticId ? { ...m, _failed: true } : m)
      );
      return { error: "Failed to send message" };
    }
  }, [myId, myUsername, activeChatPeer, getChatId]);

  const endChat = useCallback(() => {
    setActiveChatPeer(null);
    setChatMessages([]);
  }, []);

  // ── Open chat with a connected user ─────────────────────
  const openChat = useCallback(async (userId, username) => {
    // Set peer first so subscription activates, then load history
    setChatMessages([]); // clear stale messages from previous chat
    setActiveChatPeer({ userId, username });
    await loadMessages(userId);
  }, [loadMessages]);

  // ── Block ────────────────────────────────────────────────
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
      // Cancel pending requests
      base44.entities.PrivateChatRequest.filter({ from_user_id: targetUserId, to_user_id: myId, status: "pending" })
        .then((reqs) => reqs.forEach((r) => base44.entities.PrivateChatRequest.update(r.id, { status: "blocked" }).catch(() => {})))
        .catch(() => {});
      if (activeChatPeer?.userId === targetUserId) endChat();
    } catch {
      setBlockedUsers((prev) => { const next = { ...prev }; delete next[targetUserId]; return next; });
    }
  }, [myId, myUsername, activeChatPeer, endChat]);

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

  // ── Mark notification read ───────────────────────────────
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

  // ── Periodic cleanup ─────────────────────────────────────
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

  // ── Check if two users are connected (sync, instant) ────
  const isConnected = useCallback((targetUserId) => {
    return connectedUserIds.has(targetUserId);
  }, [connectedUserIds]);

  // When sender receives a "request_accepted" notification, update their connected set + outgoing status
  useEffect(() => {
    const acceptedNotes = notifications.filter((n) => n.type === "request_accepted" && n.from_user_id);
    if (acceptedNotes.length === 0) return;
    setConnectedUserIds((prev) => {
      const next = new Set(prev);
      acceptedNotes.forEach((n) => next.add(n.from_user_id));
      return next;
    });
    // Update outgoing status to accepted so the sender sees live feedback
    setOutgoingStatus((prev) => {
      if (!prev) return prev;
      const match = acceptedNotes.find((n) => n.from_user_id !== myId);
      if (match) return { ...prev, status: "accepted", toUsername: prev.toUsername };
      return prev;
    });
  }, [notifications, myId]);

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