/**
 * useNotifications — bell notification system.
 * Loads + subscribes to Notification records for the current user.
 */
import { useState, useEffect, useCallback, useRef } from "react";
import { base44 } from "@/api/base44Client";

export default function useNotifications(userId) {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const userIdRef = useRef(userId);
  userIdRef.current = userId;

  // Load on mount
  useEffect(() => {
    if (!userId) return;
    base44.entities.Notification
      .filter({ user_id: userId }, "-created_date", 50)
      .then((notes) => {
        const valid = (notes || []).filter((n) => !n.handled);
        setNotifications(valid);
        setUnreadCount(valid.filter((n) => !n.read).length);
      })
      .catch(() => {});
  }, [userId]);

  // Real-time subscription
  useEffect(() => {
    if (!userId) return;
    const unsub = base44.entities.Notification.subscribe((event) => {
      if (!event?.data) return;
      const note = event.data;
      if (note.user_id !== userIdRef.current) return;

      if (event.type === "create") {
        setNotifications((prev) => [note, ...prev]);
        setUnreadCount((c) => c + 1);
        try { navigator?.vibrate?.([15, 30, 15]); } catch {}
      } else if (event.type === "update") {
        setNotifications((prev) => {
          const updated = prev.map((n) => n.id === note.id ? note : n);
          const valid = updated.filter((n) => !n.handled);
          setUnreadCount(valid.filter((n) => !n.read).length);
          return valid;
        });
      } else if (event.type === "delete") {
        setNotifications((prev) => {
          const updated = prev.filter((n) => n.id !== note.id);
          setUnreadCount(updated.filter((n) => !n.read).length);
          return updated;
        });
      }
    });
    return () => { try { unsub(); } catch {} };
  }, [userId]);

  const markRead = useCallback(async (notificationId) => {
    try {
      await base44.entities.Notification.update(notificationId, { read: true });
      setNotifications((prev) =>
        prev.map((n) => n.id === notificationId ? { ...n, read: true } : n)
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch {}
  }, []);

  const markHandled = useCallback(async (notificationId) => {
    try {
      await base44.entities.Notification.update(notificationId, { read: true, handled: true });
      setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch {}
  }, []);

  const markAllRead = useCallback(async () => {
    const unread = notifications.filter((n) => !n.read);
    for (const n of unread) {
      try { await base44.entities.Notification.update(n.id, { read: true }); } catch {}
    }
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
  }, [notifications]);

  // Create a notification for another user (called by sender)
  const createNotification = useCallback(async (targetUserId, type, fromUsername, message, relatedRequestId) => {
    try {
      await base44.entities.Notification.create({
        user_id: targetUserId,
        type,
        from_user_id: userIdRef.current,
        from_username: fromUsername,
        message,
        related_request_id: relatedRequestId || null,
        read: false,
        handled: false,
      });
    } catch {}
  }, []);

  return { notifications, unreadCount, markRead, markHandled, markAllRead, createNotification };
}