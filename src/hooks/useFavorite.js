import { useState, useEffect, useCallback, useRef } from "react";
import { base44 } from "@/api/base44Client";

/**
 * useFavorites — global favorites hook.
 *
 * Key iOS/PWA fixes:
 *  - `toggle` never closes over stale `favorites`. It reads the latest snapshot
 *    via a ref that's kept in sync with every state update.
 *  - All setState calls use functional updates (prev => ...) so they're never stale.
 *  - inFlight guard prevents double-tap race conditions.
 *  - On mount, fetches persisted favorites from the database (source of truth).
 *  - ID normalization handles id, _id, trackId, songId, visualizerId variants.
 */
export function useFavorites(userEmail) {
  const [favorites, setFavorites] = useState([]);
  const [loaded, setLoaded] = useState(false);

  // Always-current ref so toggle never reads stale closure state
  const favoritesRef = useRef([]);

  // Keep ref in sync with every state change
  const setFavs = useCallback((updater) => {
    setFavorites((prev) => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      favoritesRef.current = next;
      return next;
    });
  }, []);

  // In-flight guard — prevents double-tap duplicates
  const inFlight = useRef(new Set());

  const reload = useCallback(async () => {
    if (!userEmail) {
      setFavs([]);
      setLoaded(true);
      return;
    }
    try {
      const data = await base44.entities.Favorite.filter(
        { user_email: userEmail },
        "-created_date",
        500
      );
      setFavs(data);
    } catch {
      // non-fatal — keep whatever is in state
    } finally {
      setLoaded(true);
    }
  }, [userEmail, setFavs]);

  useEffect(() => {
    setLoaded(false);
    reload();
  }, [reload]);

  /** Normalize any id variant to a plain string */
  const normalizeId = (id) => {
    if (!id) return null;
    if (typeof id === "object") {
      return String(id.id || id._id || id.trackId || id.songId || id.visualizerId || "");
    }
    return String(id);
  };

  /** Check saved status — reads from ref for freshness, falls back to state */
  const isFaved = useCallback((type, rawId) => {
    const id = normalizeId(rawId);
    if (!id) return false;
    const field = type === "track" ? "track_id" : "visualizer_id";
    // Use ref for the most current snapshot
    return favoritesRef.current.some((f) => f.type === type && f[field] === id);
  }, []); // stable — reads from ref, not closure

  /**
   * toggle — add or remove a favorite.
   * Uses favoritesRef (not closed-over favorites state) so it's always fresh.
   * All setFavs calls use functional updates to prevent stale overwrites.
   */
  const toggle = useCallback(async (type, rawId, meta = {}) => {
    if (!userEmail) return false;

    const id = normalizeId(rawId);
    if (!id) return false;

    const key = `${type}:${id}`;
    if (inFlight.current.has(key)) return false;
    inFlight.current.add(key);

    const field = type === "track" ? "track_id" : "visualizer_id";

    // Read current state from ref (always fresh, never stale)
    const existing = favoritesRef.current.find(
      (f) => f.type === type && f[field] === id
    );

    if (existing) {
      // Optimistic remove
      setFavs((prev) => prev.filter((f) => f.id !== existing.id));
      try {
        await base44.entities.Favorite.delete(existing.id);
      } catch {
        // Revert: add back
        setFavs((prev) => {
          // Only add back if not already present (avoid duplicates)
          const alreadyThere = prev.some((f) => f.id === existing.id);
          return alreadyThere ? prev : [...prev, existing];
        });
      }
    } else {
      // Optimistic add with temp record
      const tempId = `temp_${Date.now()}_${Math.random().toString(36).slice(2)}`;
      const tempRecord = {
        id: tempId,
        user_email: userEmail,
        type,
        [field]: id,
        cached_title: meta.title || "",
        cached_artist: meta.artist || "",
        cached_cover_url: meta.cover_url || "",
      };
      setFavs((prev) => {
        // Guard: don't add duplicate optimistic records
        const alreadyThere = prev.some((f) => f[field] === id && f.type === type);
        return alreadyThere ? prev : [...prev, tempRecord];
      });
      try {
        const record = await base44.entities.Favorite.create({
          user_email: userEmail,
          type,
          [field]: id,
          cached_title: meta.title || "",
          cached_artist: meta.artist || "",
          cached_cover_url: meta.cover_url || "",
        });
        // Replace temp with real DB record
        setFavs((prev) =>
          prev.map((f) => (f.id === tempId ? record : f))
        );
      } catch {
        // Revert: remove temp
        setFavs((prev) => prev.filter((f) => f.id !== tempId));
      }
    }

    inFlight.current.delete(key);
    return true;
  }, [userEmail, setFavs]); // no `favorites` in deps — reads from ref instead

  const trackFavs = favorites.filter((f) => f.type === "track");
  const vizFavs = favorites.filter((f) => f.type === "visualizer");

  return { favorites, isFaved, toggle, trackFavs, vizFavs, reload, loaded };
}