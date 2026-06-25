/**
 * UserInteractionMenu — profile card that opens when clicking another user's avatar/name.
 * Shows: Follow, Send Request (chat), Block/Unblock, Report.
 * All action buttons are 44px+ tap targets for iOS Safari.
 */
import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, MessageCircle, UserPlus, UserCheck, UserX, Flag, Wifi } from "lucide-react";

export default function UserInteractionMenu({
  open,
  targetUser,
  onClose,
  onRequestChat,
  onOpenChat,
  onBlock,
  onUnblock,
  onReport,
  isBlocked,
  isConnected,      // boolean — already connected/friends
  isMobile,
  // Follow system
  currentUserId,
  isFollowing,
  onFollow,
  onUnfollow,
  followerCounts,
  followingCounts,
  onLoadCounts,
  // Outgoing chat request status
  outgoingStatus,
}) {
  const [requestSent, setRequestSent] = useState(false);

  // Reset request-sent state whenever a different user is opened
  useEffect(() => {
    if (open) setRequestSent(false);
  }, [targetUser?.user_id, open]);

  // Load follow counts when card opens
  useEffect(() => {
    if (open && targetUser?.user_id && onLoadCounts) {
      onLoadCounts(targetUser.user_id);
    }
  }, [open, targetUser?.user_id]);

  // Check if the outgoing status is for this user
  const pendingToThisUser =
    outgoingStatus?.status === "pending" &&
    outgoingStatus?.toUsername === targetUser?.username;

  if (!open || !targetUser) return null;

  const userId = targetUser.user_id || targetUser.id;
  const username = targetUser.username || "Unknown";
  const following = isFollowing ? isFollowing(userId) : false;
  const followers = followerCounts?.[userId] ?? null;
  const followingCount = followingCounts?.[userId] ?? null;

  const handleSendRequest = () => {
    setRequestSent(true);
    onRequestChat?.();
  };

  const handleBlock = () => {
    onBlock?.();
    onClose?.();
  };

  const handleUnblock = () => {
    onUnblock?.();
    onClose?.();
  };

  const handleFollow = (e) => {
    e.stopPropagation();
    try { navigator?.vibrate?.(10); } catch {}
    if (following) {
      onUnfollow?.(userId);
    } else {
      onFollow?.(userId, username);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 flex items-center justify-center px-4"
      style={{ zIndex: 85, background: "rgba(0,0,0,0.65)", backdropFilter: "blur(4px)", pointerEvents: "auto" }}
      onTouchStart={(e) => e.stopPropagation()}
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.92, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.92, y: 20 }}
        transition={{ type: "spring", damping: 26, stiffness: 320 }}
        className="rounded-2xl w-full max-w-xs overflow-hidden"
        style={{
          background: "rgba(14,10,28,0.98)",
          border: "1px solid rgba(155,126,255,0.22)",
          backdropFilter: "blur(24px)",
          pointerEvents: "auto",
          boxShadow: "0 8px 40px rgba(0,0,0,0.7)",
        }}
        onClick={(e) => e.stopPropagation()}
        onTouchStart={(e) => e.stopPropagation()}
      >
        {/* ── Header ── */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
          <div className="flex items-center gap-2.5 min-w-0">
            {/* Avatar circle */}
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 font-black text-sm"
              style={{ background: "linear-gradient(135deg,rgba(155,126,255,0.3),rgba(0,200,220,0.2))", color: "#c4aaff" }}
            >
              {username.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="font-bold text-sm text-white truncate">{username}</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <Wifi style={{ width: 8, height: 8, color: "#00C853" }} />
                <span className="text-[9px]" style={{ color: "rgba(0,200,83,0.8)" }}>Online now</span>
                {followers !== null && (
                  <span className="text-[9px]" style={{ color: "rgba(255,255,255,0.3)" }}>
                    · {followers} followers
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Close button — always 44px */}
          <button
            onClick={onClose}
            onTouchStart={(e) => { e.stopPropagation(); }}
            className="flex items-center justify-center rounded-full transition-all hover:brightness-110 active:scale-95 flex-shrink-0"
            style={{
              background: "rgba(255,255,255,0.07)",
              color: "rgba(255,255,255,0.5)",
              width: 44, height: 44, minWidth: 44, minHeight: 44,
              touchAction: "manipulation",
            }}
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* ── Actions ── */}
        <div className="p-3 space-y-2">

          {/* FOLLOW / UNFOLLOW */}
          {currentUserId && currentUserId !== userId && onFollow && onUnfollow && (
            <button
              onClick={handleFollow}
              onTouchStart={(e) => e.stopPropagation()}
              className="w-full flex items-center gap-3 px-3 rounded-xl transition-all hover:brightness-110 active:scale-95"
              style={{
                background: following ? "rgba(0,200,83,0.1)" : "rgba(155,126,255,0.1)",
                border: `1px solid ${following ? "rgba(0,200,83,0.25)" : "rgba(155,126,255,0.25)"}`,
                minHeight: 48,
                touchAction: "manipulation",
              }}
            >
              {following
                ? <UserCheck className="w-4 h-4 flex-shrink-0" style={{ color: "#00C853" }} />
                : <UserPlus className="w-4 h-4 flex-shrink-0" style={{ color: "#c4aaff" }} />}
              <div className="text-left">
                <p className="text-xs font-bold" style={{ color: following ? "#00C853" : "#c4aaff" }}>
                  {following ? "Following" : "Follow"}
                </p>
                <p className="text-[10px]" style={{ color: "rgba(255,255,255,0.3)" }}>
                  {following ? "Tap to unfollow" : "Add to your network"}
                </p>
              </div>
            </button>
          )}

          {/* CONNECTED STATE — show Connected badge + Message button */}
          {!isBlocked && isConnected && (
            <>
              <div
                className="w-full flex items-center gap-3 px-3 rounded-xl"
                style={{
                  background: "rgba(0,200,83,0.07)",
                  border: "1px solid rgba(0,200,83,0.2)",
                  minHeight: 44,
                }}
              >
                <UserCheck className="w-4 h-4 flex-shrink-0" style={{ color: "#00C853" }} />
                <p className="text-xs font-bold" style={{ color: "#00C853" }}>Connected ✓</p>
              </div>
              <button
                onClick={() => onOpenChat?.()}
                onTouchStart={(e) => e.stopPropagation()}
                className="w-full flex items-center gap-3 px-3 rounded-xl transition-all hover:brightness-110 active:scale-95"
                style={{
                  background: "rgba(0,160,220,0.1)",
                  border: "1px solid rgba(0,160,220,0.22)",
                  minHeight: 48,
                  touchAction: "manipulation",
                }}
              >
                <MessageCircle className="w-4 h-4 flex-shrink-0" style={{ color: "#00D4F0" }} />
                <div className="text-left">
                  <p className="text-xs font-bold" style={{ color: "#00D4F0" }}>Message</p>
                  <p className="text-[10px]" style={{ color: "rgba(255,255,255,0.3)" }}>Open direct chat</p>
                </div>
              </button>
            </>
          )}

          {/* SEND CHAT REQUEST — only when not connected and not blocked */}
          {!isBlocked && !isConnected && (
            <button
              onClick={requestSent || pendingToThisUser ? undefined : handleSendRequest}
              onTouchStart={(e) => e.stopPropagation()}
              disabled={requestSent || pendingToThisUser}
              className="w-full flex items-center gap-3 px-3 rounded-xl transition-all hover:brightness-110 active:scale-95 disabled:opacity-70"
              style={{
                background: (requestSent || pendingToThisUser) ? "rgba(0,200,83,0.07)" : "rgba(0,160,220,0.1)",
                border: `1px solid ${(requestSent || pendingToThisUser) ? "rgba(0,200,83,0.2)" : "rgba(0,160,220,0.22)"}`,
                minHeight: 48,
                touchAction: "manipulation",
                cursor: (requestSent || pendingToThisUser) ? "default" : "pointer",
              }}
            >
              <MessageCircle
                className="w-4 h-4 flex-shrink-0"
                style={{ color: (requestSent || pendingToThisUser) ? "#00C853" : "#00D4F0" }}
              />
              <div className="text-left">
                <p className="text-xs font-bold" style={{ color: (requestSent || pendingToThisUser) ? "#00C853" : "#00D4F0" }}>
                  {(requestSent || pendingToThisUser) ? "Request Sent ✓" : "Request 1-on-1 Chat"}
                </p>
                <p className="text-[10px]" style={{ color: "rgba(255,255,255,0.3)" }}>
                  {(requestSent || pendingToThisUser) ? "Waiting for response..." : "Send a private chat request"}
                </p>
              </div>
            </button>
          )}

          {/* BLOCK / UNBLOCK */}
          {isBlocked ? (
            <button
              onClick={handleUnblock}
              onTouchStart={(e) => e.stopPropagation()}
              className="w-full flex items-center gap-3 px-3 rounded-xl transition-all active:scale-95"
              style={{
                background: "rgba(255,165,0,0.07)",
                border: "1px solid rgba(255,165,0,0.18)",
                minHeight: 48,
                touchAction: "manipulation",
              }}
            >
              <UserX className="w-4 h-4 flex-shrink-0" style={{ color: "#FFA500" }} />
              <div className="text-left">
                <p className="text-xs font-bold" style={{ color: "#FFA500" }}>Unblock User</p>
                <p className="text-[10px]" style={{ color: "rgba(255,255,255,0.3)" }}>Remove block and allow requests</p>
              </div>
            </button>
          ) : (
            <button
              onClick={handleBlock}
              onTouchStart={(e) => e.stopPropagation()}
              className="w-full flex items-center gap-3 px-3 rounded-xl transition-all active:scale-95"
              style={{
                background: "rgba(239,68,68,0.06)",
                border: "1px solid rgba(239,68,68,0.12)",
                minHeight: 48,
                touchAction: "manipulation",
              }}
            >
              <UserX className="w-4 h-4 flex-shrink-0 text-red-400" />
              <div className="text-left">
                <p className="text-xs font-bold text-red-400">Block User</p>
                <p className="text-[10px]" style={{ color: "rgba(255,255,255,0.3)" }}>Prevent messages and requests</p>
              </div>
            </button>
          )}

          {/* REPORT */}
          <button
            onClick={() => { onReport?.(); onClose?.(); }}
            onTouchStart={(e) => e.stopPropagation()}
            className="w-full flex items-center gap-3 px-3 rounded-xl transition-all active:scale-95"
            style={{
              background: "rgba(255,255,255,0.025)",
              border: "1px solid rgba(255,255,255,0.06)",
              minHeight: 48,
              touchAction: "manipulation",
            }}
          >
            <Flag className="w-4 h-4 flex-shrink-0" style={{ color: "rgba(255,255,255,0.35)" }} />
            <div className="text-left">
              <p className="text-xs font-bold" style={{ color: "rgba(255,255,255,0.55)" }}>Report User</p>
              <p className="text-[10px]" style={{ color: "rgba(255,255,255,0.3)" }}>Flag inappropriate behavior</p>
            </div>
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}