/**
 * SocialPanel — Followers / Following tab panel.
 * Opens as a slide-up sheet from within UpperVibeCity.
 */
import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Users, User } from "lucide-react";
import FollowButton from "@/components/vibeworld/FollowButton";

export default function SocialPanel({
  open,
  onClose,
  isMobile,
  currentUserId,
  currentUsername,
  isFollowing,
  onFollow,
  onUnfollow,
  loadMyFollows,
  activeUsers = [],
}) {
  const [tab, setTab] = useState("following");
  const [followers, setFollowers] = useState([]);
  const [following, setFollowing] = useState([]);
  const [loadingData, setLoadingData] = useState(false);

  useEffect(() => {
    if (!open || !loadMyFollows) return;
    setLoadingData(true);
    loadMyFollows().then(({ followers: f, following: fw }) => {
      setFollowers(f || []);
      setFollowing(fw || []);
      setLoadingData(false);
    });
  }, [open, loadMyFollows]);

  if (!open) return null;

  // Online status helper
  const isOnline = (userId) => activeUsers.some((u) => u.user_id === userId || u.id === userId);

  const list = tab === "following" ? following : followers;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[85] flex flex-col justify-end"
      style={{ background: "rgba(0,0,0,0.65)", backdropFilter: "blur(6px)" }}
      onClick={onClose}
    >
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 30, stiffness: 280 }}
        className="w-full flex flex-col overflow-hidden"
        style={{
          background: "rgba(10,8,26,0.98)",
          borderRadius: "24px 24px 0 0",
          border: "1px solid rgba(155,126,255,0.18)",
          maxHeight: "75dvh",
          paddingBottom: "env(safe-area-inset-bottom, 0px)",
        }}
        onClick={(e) => e.stopPropagation()}
        onTouchStart={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4 flex-shrink-0"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4" style={{ color: "#9B7EFF" }} />
            <span className="font-black text-white tracking-wider" style={{ fontSize: 15 }}>
              Social
            </span>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full flex items-center justify-center transition-all hover:bg-white/10 active:scale-90"
            style={{ color: "rgba(255,255,255,0.4)", minWidth: 36, minHeight: 36, touchAction: "manipulation" }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 px-4 pt-3 pb-2 flex-shrink-0">
          {["following", "followers"].map((t) => {
            const active = tab === t;
            const count = t === "following" ? following.length : followers.length;
            return (
              <button
                key={t}
                onClick={() => setTab(t)}
                onTouchStart={(e) => e.stopPropagation()}
                className="flex-1 py-2 rounded-xl font-black text-xs tracking-wider transition-all"
                style={{
                  background: active ? "rgba(155,126,255,0.15)" : "rgba(255,255,255,0.04)",
                  border: active ? "1.5px solid rgba(155,126,255,0.5)" : "1px solid rgba(255,255,255,0.06)",
                  color: active ? "#c4aaff" : "rgba(255,255,255,0.35)",
                  minHeight: 40,
                  touchAction: "manipulation",
                }}
              >
                {t === "following" ? "Following" : "Followers"} {count > 0 ? `(${count})` : ""}
              </button>
            );
          })}
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto px-4 pb-4">
          {loadingData ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-5 h-5 border-2 border-purple-500/30 border-t-purple-400 rounded-full animate-spin" />
            </div>
          ) : list.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 gap-2">
              <User className="w-8 h-8 text-white/10" />
              <p className="text-sm text-white/30 font-medium">
                {tab === "following" ? "Not following anyone yet" : "No followers yet"}
              </p>
              <p className="text-[11px] text-white/15">
                {tab === "following" ? "Tap users in the world to follow them" : "Share your vibe to get followers"}
              </p>
            </div>
          ) : (
            <div className="space-y-2 pt-1">
              {list.map((record) => {
                const userId = tab === "following" ? record.following_user_id : record.follower_user_id;
                const username = tab === "following" ? record.following_username : record.follower_username;
                const online = isOnline(userId);
                return (
                  <div
                    key={record.id}
                    className="flex items-center justify-between gap-3 px-3 py-3 rounded-2xl"
                    style={{
                      background: "rgba(255,255,255,0.03)",
                      border: "1px solid rgba(255,255,255,0.06)",
                    }}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      {/* Avatar placeholder */}
                      <div className="relative flex-shrink-0">
                        <div className="w-9 h-9 rounded-full flex items-center justify-center"
                          style={{ background: "rgba(155,126,255,0.15)", border: "1px solid rgba(155,126,255,0.2)" }}>
                          <User className="w-4 h-4 text-purple-300" />
                        </div>
                        {/* Online dot */}
                        {online && (
                          <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full"
                            style={{ background: "#00C853", border: "1.5px solid rgba(10,8,26,1)" }} />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-white truncate">{username || "Vibe User"}</p>
                        <p className="text-[10px]" style={{ color: online ? "#00C853" : "rgba(255,255,255,0.25)" }}>
                          {online ? "● Online now" : "Offline"}
                        </p>
                      </div>
                    </div>
                    {/* Follow button — only show for "followers" tab (so you can follow back) */}
                    {tab === "followers" && (
                      <FollowButton
                        targetUserId={userId}
                        targetUsername={username}
                        currentUserId={currentUserId}
                        isFollowing={isFollowing}
                        onFollow={onFollow}
                        onUnfollow={onUnfollow}
                        size="sm"
                      />
                    )}
                    {tab === "following" && (
                      <button
                        onClick={() => onUnfollow(userId)}
                        onTouchStart={(e) => e.stopPropagation()}
                        className="flex-shrink-0 rounded-full font-black text-[10px] px-3 transition-all hover:brightness-110 active:scale-95"
                        style={{
                          background: "rgba(255,255,255,0.05)",
                          border: "1px solid rgba(255,255,255,0.1)",
                          color: "rgba(255,255,255,0.4)",
                          minHeight: 36,
                          touchAction: "manipulation",
                        }}
                      >
                        Unfollow
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}