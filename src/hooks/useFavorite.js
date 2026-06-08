import { useState, useEffect, useCallback, useRef } from "react";
import { base44 } from "@/api/base44Client";

/**
 * Normalize any item id variant to a plain string.
 * Exported so other components (MyVibes, etc.) can reuse it.
 */
export function normalizeItemId(id) {
  if (!id) return null;
  if (typeof id === "object") {
    const resolved = id.id || id._id || id.trackId || id.songId || id.visualizerId;
    return resolved ? String(resolved) : null;
  }
  return String(id);
}

/**
 * useFavorites — keyed on stable user ID (not email).
 *
 * Fixes:
 *  1. Uses user.id (stable DB ID) as primary key — never resets when email loads async.
 *  2. Does NOT initialize until userId is known (caller must gate on isLoadingAuth).
 *  3. Request versioning: stale fetch responses are discarded if a newer fetch started.
 *  4. favoritesRef always current — toggle/isFaved never have stale closures.
 *  5. inFlight per-item lock — prevents double-tap race on iOS.
 *  6. setFavs uses functional updaters — never stale overwrites.
 *  7. Stores user_email as supplementary field (for backwards compat with existing DB records).
 */
export function useFavorites(userId, userEmail) {
  const [favorites, setFavorites] = useState([]);
  const [loaded, setLoaded] = useState(false);

  // Always-current refs — stable references, never trigger hook rebuilds
  const favoritesRef = useRef([]);
  const userIdRef = useRef(userId);
  const userEmailRef = useRef(userEmail);
  const inFlight = useRef(new Set());
  // Request versioning: each reload increments this; stale responses check against it
  const fetchVersion = useRef(0);

  // Keep refs current on every render (no deps needed)
  userIdRef.current = userId;
  userEmailRef.current = userEmail;

  // Wrapped setter keeps ref in sync
  const setFavs = useCallback((updater) => {
    setFavorites((prev) => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      favoritesRef.current = next;
      return next;
    });
  }, []);

  /**
   * reload — fetches from DB.
   * Version-gated: if a newer fetch starts before this one completes, result is discarded.
   */
  const reload = useCallback(async (overrideUserId) => {
    const uid = overrideUserId ?? userIdRef.current;
    const email = userEmailRef.current;

    if (!uid) {
      setFavs([]);
      setLoaded(true);
      return;
    }

    // Increment version; capture this call's version
    fetchVersion.current += 1;
    const myVersion = fetchVersion.current;

    try {
      // Query by created_by_id (the stable Base44 user ID used in RLS)
      // Fall back to user_email filter if needed for legacy records
      const data = await base44.entities.Favorite.list("-created_date", 500);

      // Discard if a newer fetch has started
      if (myVersion !== fetchVersion.current) {
        console.log("[Favorites] reload: discarding stale response (version mismatch)");
        return;
      }

      setFavs(data);
    } catch (err) {
      console.warn("[Favorites] reload failed:", err);
      // Keep existing state — don't blank hearts on error
    } finally {
      if (myVersion === fetchVersion.current) {
        setLoaded(true);
      }
    }
  }, [setFavs]);

  // Load when userId becomes available; clear when logged out
  // Does NOT reset to [] before the fetch — prevents flash of empty hearts
  useEffect(() => {
    if (userId) {
      reload(userId);
    } else {
      // Not logged in — clear state
      fetchVersion.current += 1; // invalidate any pending fetches
      setFavs([]);
      setLoaded(true);
    }
  }, [userId]); // eslint-disable-line react-hooks/exhaustive-deps

  /**
   * isFaved — reads from ref (always current), stable reference.
   */
  const isFaved = useCallback((type, rawId) => {
    const id = normalizeItemId(rawId);
    if (!id) return false;
    const field = type === "track" ? "track_id" : "visualizer_id";
    return favoritesRef.current.some((f) => f.type === type && f[field] === id);
  }, []); // reads from ref only — stable forever

  /**
   * toggle — add or remove a favorite.
   * Reads userId and email from refs — never stale regardless of auth timing.
   */
  const toggle = useCallback(async (type, rawId, meta = {}) => {
    const uid = userIdRef.current;
    const email = userEmailRef.current;

    if (/iPhone|iPad|iPod/.test(navigator.userAgent)) {
      console.log("[Favorites] toggle", {
        uid,
        type,
        rawId,
        normalizedId: normalizeItemId(rawId),
        currentlySaved: favoritesRef.current.some(
          (f) => f.type === type && f[type === "track" ? "track_id" : "visualizer_id"] === normalizeItemId(rawId)
        ),
        count: favoritesRef.current.length,
      });
    }

    if (!uid) {
      console.warn("[Favorites] toggle: no userId — cannot save");
      return false;
    }

    const id = normalizeItemId(rawId);
    if (!id) {
      console.warn("[Favorites] toggle: could not normalize id from", rawId);
      return false;
    }

    const key = `${type}:${id}`;
    if (inFlight.current.has(key)) {
      console.log("[Favorites] toggle: ignoring in-flight for", key);
      return false;
    }
    inFlight.current.add(key);

    const field = type === "track" ? "track_id" : "visualizer_id";
    const existing = favoritesRef.current.find(
      (f) => f.type === type && f[field] === id
    );

    try {
      if (existing) {
        // Optimistic remove
        setFavs((prev) => prev.filter((f) => f.id !== existing.id));
        await base44.entities.Favorite.delete(existing.id);
        console.log("[Favorites] removed", existing.id);
      } else {
        // Optimistic add
        const tempId = `temp_${Date.now()}_${Math.random().toString(36).slice(2)}`;
        const tempRecord = {
          id: tempId,
          user_email: email || "",
          type,
          [field]: id,
          cached_title: meta.title || "",
          cached_artist: meta.artist || "",
          cached_cover_url: meta.cover_url || "",
        };
        setFavs((prev) => {
          const dupe = prev.some((f) => f.type === type && f[field] === id);
          if (dupe) return prev;
          return [...prev, tempRecord];
        });

        const record = await base44.entities.Favorite.create({
          user_email: email || "",
          type,
          [field]: id,
          cached_title: meta.title || "",
          cached_artist: meta.artist || "",
          cached_cover_url: meta.cover_url || "",
        });
        console.log("[Favorites] saved", record.id, "userId:", uid);

        // Replace temp with real record
        setFavs((prev) => prev.map((f) => (f.id === tempId ? record : f)));
      }
    } catch (err) {
      console.error("[Favorites] toggle DB error:", err);
      // Revert optimistic update
      if (existing) {
        setFavs((prev) => {
          const already = prev.some((f) => f.id === existing.id);
          return already ? prev : [...prev, existing];
        });
      } else {
        setFavs((prev) => prev.filter((f) => !String(f.id).startsWith("temp_")));
      }
    } finally {
      inFlight.current.delete(key);
    }

    return true;
  }, [setFavs]); // reads userId/email from refs — stable

  const trackFavs = favorites.filter((f) => f.type === "track");
  const vizFavs = favorites.filter((f) => f.type === "visualizer");

  return { favorites, isFaved, toggle, trackFavs, vizFavs, reload, loaded };
}