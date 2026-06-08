import { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";

/**
 * Manages all favorites for the current user.
 * Returns helpers to check & toggle favorites for tracks and visualizers.
 */
export function useFavorites(userEmail) {
  const [favorites, setFavorites] = useState([]); // raw Favorite records

  const reload = useCallback(async () => {
    if (!userEmail) return;
    const data = await base44.entities.Favorite.filter({ user_email: userEmail }, "-created_date", 500);
    setFavorites(data);
  }, [userEmail]);

  useEffect(() => { reload(); }, [reload]);

  const isFaved = useCallback((type, id) => {
    const field = type === "track" ? "track_id" : "visualizer_id";
    return favorites.some((f) => f.type === type && f[field] === id);
  }, [favorites]);

  const toggle = useCallback(async (type, id, meta = {}) => {
    if (!userEmail) return false;
    const field = type === "track" ? "track_id" : "visualizer_id";
    const existing = favorites.find((f) => f.type === type && f[field] === id);
    if (existing) {
      await base44.entities.Favorite.delete(existing.id);
      setFavorites((prev) => prev.filter((f) => f.id !== existing.id));
    } else {
      const record = await base44.entities.Favorite.create({
        user_email: userEmail,
        type,
        [field]: id,
        cached_title: meta.title || "",
        cached_artist: meta.artist || "",
        cached_cover_url: meta.cover_url || "",
      });
      setFavorites((prev) => [...prev, record]);
    }
    return true;
  }, [userEmail, favorites]);

  const trackFavs = favorites.filter((f) => f.type === "track");
  const vizFavs = favorites.filter((f) => f.type === "visualizer");

  return { favorites, isFaved, toggle, trackFavs, vizFavs };
}