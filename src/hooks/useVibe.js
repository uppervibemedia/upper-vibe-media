import { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";

// Fetches all saved track IDs for the current user and provides save/unsave actions
export function useVibe(userEmail) {
  const [savedIds, setSavedIds] = useState(new Set());
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!userEmail) return;
    base44.entities.Favorite.filter({ user_email: userEmail }, "-created_date", 500)
      .then((favs) => setSavedIds(new Set(favs.map((f) => f.track_id))));
  }, [userEmail]);

  const isSaved = useCallback((trackId) => savedIds.has(trackId), [savedIds]);

  const toggleSave = useCallback(async (track) => {
    if (!userEmail) return;
    if (savedIds.has(track.id)) {
      // Remove: find the record and delete it
      const existing = await base44.entities.Favorite.filter({ user_email: userEmail, track_id: track.id }, "-created_date", 1);
      if (existing.length > 0) await base44.entities.Favorite.delete(existing[0].id);
      setSavedIds((prev) => { const next = new Set(prev); next.delete(track.id); return next; });
    } else {
      // Save
      await base44.entities.Favorite.create({ user_email: userEmail, track_id: track.id });
      setSavedIds((prev) => new Set([...prev, track.id]));
    }
  }, [userEmail, savedIds]);

  return { savedIds, isSaved, toggleSave, loading };
}