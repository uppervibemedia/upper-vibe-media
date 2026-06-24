/**
 * useFollowSystem — lightweight follow/unfollow hook.
 * Loads the current user's follows once on mount; provides follow/unfollow actions.
 */
import { useState, useEffect, useCallback, useRef } from "react";
import { base44 } from "@/api/base44Client";

export default function useFollowSystem(currentUserId, currentUsername) {
  // Set of user IDs the current user is following
  const [following, setFollowing] = useState(new Set());
  // Map: userId → follower count (lazy-loaded per profile card open)
  const [followerCounts, setFollowerCounts] = useState({});
  const [followingCounts, setFollowingCounts] = useState({});
  const [loading, setLoading] = useState(false);
  const followRecordsRef = useRef({}); // userId → record id, for deletes

  // Load current user's following list
  useEffect(() => {
    if (!currentUserId) return;
    setLoading(true);
    base44.entities.UserFollow.filter({ follower_user_id: currentUserId })
      .then((records) => {
        const ids = new Set();
        const map = {};
        records.forEach((r) => {
          ids.add(r.following_user_id);
          map[r.following_user_id] = r.id;
        });
        setFollowing(ids);
        followRecordsRef.current = map;
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [currentUserId]);

  const isFollowing = useCallback((userId) => following.has(userId), [following]);

  const follow = useCallback(async (targetUserId, targetUsername) => {
    if (!currentUserId || !targetUserId) return;
    if (currentUserId === targetUserId) return; // no self-follow
    if (following.has(targetUserId)) return; // already following

    // Optimistic update
    setFollowing((prev) => new Set([...prev, targetUserId]));
    setFollowerCounts((prev) => ({
      ...prev,
      [targetUserId]: (prev[targetUserId] || 0) + 1,
    }));

    try {
      const record = await base44.entities.UserFollow.create({
        follower_user_id: currentUserId,
        following_user_id: targetUserId,
        follower_username: currentUsername || "",
        following_username: targetUsername || "",
      });
      followRecordsRef.current[targetUserId] = record.id;
    } catch {
      // Rollback
      setFollowing((prev) => {
        const next = new Set(prev);
        next.delete(targetUserId);
        return next;
      });
      setFollowerCounts((prev) => ({
        ...prev,
        [targetUserId]: Math.max(0, (prev[targetUserId] || 1) - 1),
      }));
    }
  }, [currentUserId, currentUsername, following]);

  const unfollow = useCallback(async (targetUserId) => {
    if (!currentUserId || !targetUserId) return;
    if (!following.has(targetUserId)) return;

    const recordId = followRecordsRef.current[targetUserId];

    // Optimistic update
    setFollowing((prev) => {
      const next = new Set(prev);
      next.delete(targetUserId);
      return next;
    });
    setFollowerCounts((prev) => ({
      ...prev,
      [targetUserId]: Math.max(0, (prev[targetUserId] || 1) - 1),
    }));

    try {
      if (recordId) {
        await base44.entities.UserFollow.delete(recordId);
        delete followRecordsRef.current[targetUserId];
      } else {
        // Find and delete by filter
        const records = await base44.entities.UserFollow.filter({
          follower_user_id: currentUserId,
          following_user_id: targetUserId,
        });
        for (const r of records) {
          await base44.entities.UserFollow.delete(r.id);
        }
      }
    } catch {
      // Rollback
      setFollowing((prev) => new Set([...prev, targetUserId]));
      setFollowerCounts((prev) => ({
        ...prev,
        [targetUserId]: (prev[targetUserId] || 0) + 1,
      }));
    }
  }, [currentUserId, following]);

  // Load counts for a specific user (call when opening profile card)
  const loadCountsForUser = useCallback(async (userId) => {
    if (!userId) return;
    try {
      const [followers, followings] = await Promise.all([
        base44.entities.UserFollow.filter({ following_user_id: userId }),
        base44.entities.UserFollow.filter({ follower_user_id: userId }),
      ]);
      setFollowerCounts((prev) => ({ ...prev, [userId]: followers.length }));
      setFollowingCounts((prev) => ({ ...prev, [userId]: followings.length }));
    } catch {}
  }, []);

  // Load current user's own following/follower lists for Social Panel
  const loadMyFollows = useCallback(async () => {
    if (!currentUserId) return { followers: [], following: [] };
    try {
      const [followersRaw, followingRaw] = await Promise.all([
        base44.entities.UserFollow.filter({ following_user_id: currentUserId }),
        base44.entities.UserFollow.filter({ follower_user_id: currentUserId }),
      ]);
      return { followers: followersRaw, following: followingRaw };
    } catch {
      return { followers: [], following: [] };
    }
  }, [currentUserId]);

  return {
    isFollowing,
    follow,
    unfollow,
    followerCounts,
    followingCounts,
    loadCountsForUser,
    loadMyFollows,
    loading,
  };
}