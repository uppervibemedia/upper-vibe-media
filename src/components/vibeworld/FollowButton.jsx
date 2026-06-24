/**
 * FollowButton — compact follow/unfollow toggle.
 * Requires the useFollowSystem hook values passed as props.
 */
import React from "react";
import { UserPlus, UserCheck } from "lucide-react";

export default function FollowButton({
  targetUserId,
  targetUsername,
  currentUserId,
  isFollowing,
  onFollow,
  onUnfollow,
  size = "sm", // "sm" | "md"
}) {
  if (!currentUserId || !targetUserId || currentUserId === targetUserId) return null;

  const following = isFollowing(targetUserId);

  const handleClick = (e) => {
    e.stopPropagation();
    try { navigator?.vibrate?.(10); } catch {}
    if (following) {
      onUnfollow(targetUserId);
    } else {
      onFollow(targetUserId, targetUsername);
    }
  };

  const isSmall = size === "sm";

  return (
    <button
      onClick={handleClick}
      onTouchStart={(e) => e.stopPropagation()}
      className="flex items-center gap-1 rounded-full font-black transition-all hover:brightness-110 active:scale-95 flex-shrink-0"
      style={{
        background: following ? "rgba(0,200,83,0.12)" : "rgba(155,126,255,0.15)",
        border: `1px solid ${following ? "rgba(0,200,83,0.3)" : "rgba(155,126,255,0.4)"}`,
        color: following ? "#00C853" : "#c4aaff",
        fontSize: isSmall ? "10px" : "11px",
        padding: isSmall ? "4px 10px" : "6px 14px",
        minHeight: "36px",
        touchAction: "manipulation",
        letterSpacing: "0.04em",
      }}
      aria-label={following ? "Unfollow" : "Follow"}
    >
      {following
        ? <UserCheck style={{ width: isSmall ? 11 : 13, height: isSmall ? 11 : 13 }} />
        : <UserPlus style={{ width: isSmall ? 11 : 13, height: isSmall ? 11 : 13 }} />}
      {following ? "Following" : "Follow"}
    </button>
  );
}