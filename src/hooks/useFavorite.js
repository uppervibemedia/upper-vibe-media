import { useState, useEffect, useCallback, useRef } from "react";
import { base44 } from "@/api/base44Client";

/**
 * useFavorites — manages all favorites for the current user.
 *
 * Optimistic updates: the UI updates immediately, then syncs to backend.
 * If backend fails, the optimistic update is reverted.
 *
 * ID normalization: handles id, _id, trackId, songId, visualizerId variants.
 */
export function useFavorites(userEmail) {
  const [favorites, setFavorites] = useState([]);
  // Tracks in-flight operations to prevent duplicate requests
  const inFlight = useRef(new Set());

  const reload = useCallback(async () => {
    if (!userEmail) return;
    const data = await base44.entities.Favorite.filter({ user_email: userEmail }, "-created_date", 500);
    setFavorites(data);
  }, [userEmail]);

  useEffect(() => {
    reload();
  }, [reload]);

  /** Normalize any id variant to a plain string */
  const normalizeId = (id) => {
    if (!id) return null;
    return String(id.id || id._id || id.trackId || id.songId || id.visualizerId || id);
  };

  const isFaved = useCallback((type, rawId) => {
    const id = normalizeId(rawId);
    if (!id) return false;
    const field = type === "track" ? "track_id" : "visualizer_id";
    return favorites.some((f) => f.type === type && f[field] === id);
  }, [favorites]);

  const toggle = useCallback(async (type, rawId, meta = {}) => {
    if (!userEmail) return false;

    const id = normalizeId(rawId);
    if (!id) return false;

    // Prevent duplicate in-flight requests for same item
    const key = `${type}:${id}`;
    if (inFlight.current.has(key)) return false;
    inFlight.current.add(key);

    const field = type === "track" ? "track_id" : "visualizer_id";
    const existing = favorites.find((f) => f.type === type && f[field] === id);

    if (existing) {
      // Optimistic remove
      setFavorites((prev) => prev.filter((f) => f.id !== existing.id));
      try {
        await base44.entities.Favorite.delete(existing.id);
      } catch {
        // Revert on failure
        setFavorites((prev) => [...prev, existing]);
      }
    } else {
      // Optimistic add — use a temp record with a placeholder id
      const tempId = `temp_${Date.now()}`;
      const tempRecord = {
        id: tempId,
        user_email: userEmail,
        type,
        [field]: id,
        cached_title: meta.title || "",
        cached_artist: meta.artist || "",
        cached_cover_url: meta.cover_url || "",
      };
      setFavorites((prev) => [...prev, tempRecord]);
      try {
        const record = await base44.entities.Favorite.create({
          user_email: userEmail,
          type,
          [field]: id,
          cached_title: meta.title || "",
          cached_artist: meta.artist || "",
          cached_cover_url: meta.cover_url || "",
        });
        // Replace temp record with real one
        setFavorites((prev) => prev.map((f) => f.id === tempId ? record : f));
      } catch {
        // Revert on failure
        setFavorites((prev) => prev.filter((f) => f.id !== tempId));
      }
    }

    inFlight.current.delete(key);
    return true;
  }, [userEmail, favorites]);

  const trackFavs = favorites.filter((f) => f.type === "track");
  const vizFavs = favorites.filter((f) => f.type === "visualizer");

  return { favorites, isFaved, toggle, trackFavs, vizFavs, reload };
}