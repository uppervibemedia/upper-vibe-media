/**
 * useDirectMessaging — clean message request system.
 *
 * KEY RULES:
 * 1. conversation_id = dm_${[userA, userB].sort().join("_")} — always stable
 * 2. Sender can send max 2 messages before receiver approves
 * 3. activeChatPeer is ONLY set via openApprovedChat() — NEVER inside sendMessage()
 * 4. sendMessage() never opens/reopens a chat box
 */
import { useState, useEffect, useRef, useCallback } from "react";
import { base44 } from "@/api/base44Client";

const MAX_PRE_APPROVAL = 2;
const DM_NOTIF_THROTTLE_MS = 30_000;

export const getChatId = (a, b) => `dm_${[a, b].sort().join("_")}`;

export default function useDirectMessaging(user) {
  const [activeChatPeer, setActiveChatPeer] = useState(null); // { userId, username, conversationId }
  const [chatMessages, setChatMessages] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [blockedUsers, setBlockedUsers] = useState({});

  const myId = user?.id;
  const myUsername = user?.world_username || "New User";
  const activePeerRef = useRef(null);
  activePeerRef.current = activeChatPeer;
  const blockedRef = useRef({});
  blockedRef.current = blockedUsers;
  const dmNotifTimestamps = useRef({});

  // ── Load blocks ──────────────────────────────────────────
  useEffect(() => {
    if (!myId) return;
    base44.entities.UserBlock.filter({ blocker_user_id: myId })
      .then((records) => {
        const map = {};
        records.forEach((r) => { map[r.blocked_user_id] = r.id; });
        setBlockedUsers(map);
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

  // ── Subscribe to new notifications ───────────────────────
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

  // ── Subscribe to messages in active approved chat ────────
  useEffect(() => {
    if (!myId || !activeChatPeer?.conversationId) return;
    const convId = activeChatPeer.conversationId;

    const unsub = base44.entities.DirectMessage.subscribe((event) => {
      if (event.type !== "create" || !event.data) return;
      const msg = event.data;
      if (msg.conversation_id !== convId) return;
      if (blockedRef.current[msg.sender_user_id]) return;
      setChatMessages((prev) => {
        if (prev.some((m) => m.id === msg.id)) return prev;
        // Replace matching optimistic
        if (msg.sender_user_id === myId) {
          const optIdx = prev.findIndex((m) => m._optimistic && !m._failed && m.message_text === msg.message_text);
          if (optIdx !== -1) {
            const next = [...prev];
            next[optIdx] = msg;
            return next;
          }
        }
        return [...prev, msg];
      });
    });

    // 8s polling fallback — only appends truly new messages, never replaces the array
    const poll = setInterval(async () => {
      try {
        const msgs = await base44.entities.DirectMessage.filter({ conversation_id: convId }, "created_date", 150);
        if (!msgs?.length) return;
        setChatMessages((prev) => {
          const existingIds = new Set(prev.map((m) => m.id));
          const newReal = msgs.filter(
            (m) => !existingIds.has(m.id) && !m._optimistic && !blockedRef.current[m.sender_user_id]
          );
          // Nothing new — return exact same reference to prevent re-render
          if (!newReal.length) return prev;
          return [...prev, ...newReal].sort((a, b) => new Date(a.created_date) - new Date(b.created_date));
        });
      } catch {}
    }, 8000);

    return () => { try { unsub(); } catch {} clearInterval(poll); };
  }, [myId, activeChatPeer?.conversationId]);

  // ── Load message history ─────────────────────────────────
  const loadMessages = useCallback(async (conversationId) => {
    if (!myId || !conversationId) return;
    try {
      const msgs = await base44.entities.DirectMessage.filter({ conversation_id: conversationId }, "created_date", 150);
      const sorted = (msgs || [])
        .filter((m) => !blockedRef.current[m.sender_user_id])
        .sort((a, b) => new Date(a.created_date) - new Date(b.created_date));
      setChatMessages(sorted);
    } catch (err) {
      console.error("[loadMessages]", err);
    }
  }, [myId]);

  // ── Open an approved chat ────────────────────────────────
  // Checks: neither side blocked, conversation is approved.
  // This is the ONLY place setActiveChatPeer is called (besides acceptRequest).
  const openApprovedChat = useCallback(async (userId, username) => {
    if (!myId || !userId) return;
    // Block check (fast, local)
    if (blockedRef.current[userId]) return;

    const conversationId = getChatId(myId, userId);
    // Already viewing this conversation — don't reload (would flash and reset scroll)
    if (activePeerRef.current?.conversationId === conversationId) return;

    setChatMessages([]);
    setActiveChatPeer({ userId, username, conversationId });
    loadMessages(conversationId);
  }, [myId, loadMessages]);

  // ── Send a message request (first/second message before approval) ────
  // Returns { success, error, limitReached, requestId }
  const sendMessageRequest = useCallback(async (toUserId, toUsername, text) => {
    if (!myId || !toUserId || !text?.trim()) return { error: "Missing data" };
    if (blockedRef.current[toUserId]) return { error: "You cannot contact this user." };

    // Check if they blocked me
    try {
      const theyBlocked = await base44.entities.UserBlock.filter({ blocker_user_id: toUserId, blocked_user_id: myId });
      if (theyBlocked.length > 0) return { error: "You cannot contact this user." };
    } catch {}

    const conversationId = getChatId(myId, toUserId);
    const trimmed = text.trim();

    // Check for existing request
    let existingRequests = [];
    try {
      existingRequests = await base44.entities.MessageRequest.filter({ conversation_id: conversationId });
    } catch {}

    const existing = existingRequests.find((r) =>
      (r.sender_user_id === myId && r.receiver_user_id === toUserId)
    );

    // Already denied/blocked
    if (existing?.status === "denied" || existing?.status === "blocked") {
      return { error: "Your message request was denied." };
    }

    // Already approved — just send a normal message
    if (existing?.status === "approved") {
      return sendApprovedMessage(toUserId, toUsername, trimmed, conversationId);
    }

    // Pending — check 2-message limit
    if (existing?.status === "pending") {
      if ((existing.pre_approval_count || 0) >= MAX_PRE_APPROVAL) {
        return { error: "Waiting for approval. You can't send more messages until this user approves.", limitReached: true };
      }
      // Add another pre-approval message
      try {
        await base44.entities.MessageRequest.update(existing.id, {
          pre_approval_count: (existing.pre_approval_count || 0) + 1,
        });
        await base44.entities.DirectMessage.create({
          conversation_id: conversationId,
          sender_user_id: myId,
          receiver_user_id: toUserId,
          sender_username: myUsername,
          receiver_username: toUsername,
          message_text: trimmed,
          status: "pending_request",
        });
        // Update notification preview
        base44.entities.Notification.create({
          user_id: toUserId,
          type: "message_request",
          from_user_id: myId,
          from_username: myUsername,
          message: `${myUsername}: ${trimmed.slice(0, 80)}`,
          conversation_id: conversationId,
          related_request_id: existing.id,
          read: false,
          handled: false,
        }).catch(() => {});
        return { success: true, requestId: existing.id, pending: true };
      } catch (err) {
        return { error: "Failed to send message." };
      }
    }

    // No existing request — create one + save first message
    try {
      const req = await base44.entities.MessageRequest.create({
        conversation_id: conversationId,
        sender_user_id: myId,
        receiver_user_id: toUserId,
        sender_username: myUsername,
        receiver_username: toUsername,
        status: "pending",
        pre_approval_count: 1,
      });

      await base44.entities.DirectMessage.create({
        conversation_id: conversationId,
        sender_user_id: myId,
        receiver_user_id: toUserId,
        sender_username: myUsername,
        receiver_username: toUsername,
        message_text: trimmed,
        status: "pending_request",
      });

      base44.entities.Notification.create({
        user_id: toUserId,
        type: "message_request",
        from_user_id: myId,
        from_username: myUsername,
        message: `${myUsername}: ${trimmed.slice(0, 80)}`,
        conversation_id: conversationId,
        related_request_id: req.id,
        read: false,
        handled: false,
      }).catch(() => {});

      return { success: true, requestId: req.id, pending: true };
    } catch (err) {
      console.error("[sendMessageRequest]", err);
      return { error: "Failed to send message request." };
    }
  }, [myId, myUsername]);

  // ── Send a normal message in an approved chat ────────────
  // NEVER calls setActiveChatPeer
  const sendApprovedMessage = useCallback(async (toUserId, toUsername, text, conversationId) => {
    if (!myId || !toUserId || !text?.trim()) return { error: "Missing data" };
    // Block guard (local)
    if (blockedRef.current[toUserId]) return { error: "You can't message this user right now." };
    const convId = conversationId || activePeerRef.current?.conversationId;
    if (!convId) return { error: "No active conversation." };
    const trimmed = text.trim();

    const optimisticId = `opt_${Date.now()}_${Math.random()}`;
    const optimistic = {
      id: optimisticId,
      conversation_id: convId,
      sender_user_id: myId,
      sender_username: myUsername,
      receiver_user_id: toUserId,
      message_text: trimmed,
      created_date: new Date().toISOString(),
      _optimistic: true,
    };
    setChatMessages((prev) => [...prev, optimistic]);

    try {
      const saved = await base44.entities.DirectMessage.create({
        conversation_id: convId,
        sender_user_id: myId,
        receiver_user_id: toUserId,
        sender_username: myUsername,
        receiver_username: toUsername || activePeerRef.current?.username || "",
        message_text: trimmed,
        status: "delivered",
      });

      setChatMessages((prev) => prev.map((m) => m.id === optimisticId ? saved : m));

      // Throttled notification
      const lastNotif = dmNotifTimestamps.current[toUserId] || 0;
      if (Date.now() - lastNotif > DM_NOTIF_THROTTLE_MS) {
        dmNotifTimestamps.current[toUserId] = Date.now();
        base44.entities.Notification.create({
          user_id: toUserId,
          type: "direct_message",
          from_user_id: myId,
          from_username: myUsername,
          message: `${myUsername}: ${trimmed.slice(0, 60)}`,
          conversation_id: convId,
          read: false,
          handled: false,
        }).catch(() => {});
      }

      return { success: true };
    } catch (err) {
      setChatMessages((prev) => prev.map((m) => m.id === optimisticId ? { ...m, _failed: true } : m));
      return { error: "Message failed to send. Try again." };
    }
  }, [myId, myUsername]);

  // ── sendMessage: used inside the approved chat panel ────
  const sendMessage = useCallback(async (text) => {
    const peer = activePeerRef.current;
    if (!peer) return { error: "No active chat." };
    return sendApprovedMessage(peer.userId, peer.username, text, peer.conversationId);
  }, [sendApprovedMessage]);

  // ── Approve a message request ────────────────────────────
  const approveRequest = useCallback(async (requestId, fromUserId, fromUsername) => {
    if (!myId || !fromUserId) return;
    const conversationId = getChatId(myId, fromUserId);

    // Open chat immediately — synchronous
    setChatMessages([]);
    setActiveChatPeer({ userId: fromUserId, username: fromUsername, conversationId });

    // Mark notification handled
    setNotifications((prev) => {
      const note = prev.find((n) => n.related_request_id === requestId);
      if (note) base44.entities.Notification.update(note.id, { read: true, handled: true }).catch(() => {});
      return prev.filter((n) => n.related_request_id !== requestId);
    });
    setUnreadCount((c) => Math.max(0, c - 1));

    // Background: update request, upgrade pending messages, notify sender
    try {
      await base44.entities.MessageRequest.update(requestId, { status: "approved" });

      // Upgrade pending messages to delivered
      const pendingMsgs = await base44.entities.DirectMessage.filter({ conversation_id: conversationId, status: "pending_request" });
      for (const msg of (pendingMsgs || [])) {
        base44.entities.DirectMessage.update(msg.id, { status: "delivered" }).catch(() => {});
      }

      // Notify sender
      base44.entities.Notification.create({
        user_id: fromUserId,
        type: "message_approved",
        from_user_id: myId,
        from_username: myUsername,
        message: `${myUsername} approved your message request. Tap to open chat.`,
        conversation_id: conversationId,
        read: false,
        handled: false,
      }).catch(() => {});

      // Load full history
      loadMessages(conversationId);
    } catch (err) {
      console.error("[approveRequest]", err);
      loadMessages(conversationId);
    }
  }, [myId, myUsername, loadMessages]);

  // ── Deny a message request ───────────────────────────────
  const denyRequest = useCallback(async (requestId, fromUserId) => {
    try {
      await base44.entities.MessageRequest.update(requestId, { status: "denied" });
      setNotifications((prev) => {
        const note = prev.find((n) => n.related_request_id === requestId);
        if (note) base44.entities.Notification.update(note.id, { read: true, handled: true }).catch(() => {});
        return prev.filter((n) => n.related_request_id !== requestId);
      });
      setUnreadCount((c) => Math.max(0, c - 1));
      // Optionally notify sender
      if (fromUserId) {
        base44.entities.Notification.create({
          user_id: fromUserId,
          type: "message_denied",
          from_user_id: myId,
          from_username: myUsername,
          message: `${myUsername} declined your message request.`,
          read: false,
          handled: false,
        }).catch(() => {});
      }
    } catch {}
  }, [myId, myUsername]);

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
      if (activePeerRef.current?.userId === targetUserId) {
        setActiveChatPeer(null);
        setChatMessages([]);
      }
    } catch {
      setBlockedUsers((prev) => { const next = { ...prev }; delete next[targetUserId]; return next; });
    }
  }, [myId, myUsername]);

  const unblockUser = useCallback(async (targetUserId) => {
    if (!myId || !targetUserId) return;
    const recordId = blockedRef.current[targetUserId];
    setBlockedUsers((prev) => { const next = { ...prev }; delete next[targetUserId]; return next; });
    try {
      if (recordId && recordId !== "pending") {
        await base44.entities.UserBlock.delete(recordId);
      } else {
        const records = await base44.entities.UserBlock.filter({ blocker_user_id: myId, blocked_user_id: targetUserId });
        for (const r of records) base44.entities.UserBlock.delete(r.id).catch(() => {});
      }
    } catch {
      setBlockedUsers((prev) => ({ ...prev, [targetUserId]: recordId }));
    }
  }, [myId]);

  const endChat = useCallback(() => {
    setActiveChatPeer(null);
    setChatMessages([]);
  }, []);

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
      base44.entities.Notification.update(n.id, { read: true }).catch(() => {});
    }
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
  }, [notifications]);

  return {
    activeChatPeer,
    chatMessages,
    notifications,
    unreadCount,
    blockedUsers,
    sendMessageRequest,
    sendMessage,
    approveRequest,
    denyRequest,
    openApprovedChat,
    endChat,
    blockUser,
    unblockUser,
    markNotificationHandled,
    markAllNotificationsRead,
  };
}