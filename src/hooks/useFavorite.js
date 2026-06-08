import { useState, useEffect, useCallback, useRef } from "react";
import { base44 } from "@/api/base44Client";

/**
 * useFavorites — global favorites hook with iOS/PWA persistence fixes.
 *
 * Root causes fixed:
 *  1. favoritesRef: toggle reads from ref (always current), never from stale closure.
 *  2. userEmailRef: tracks email changes without causing toggle/isFaved to rebuild.
 *  3. No state reset on email change — we reload from DB, keeping existing UI state
 *     until fresh data arrives (prevents flash of empty hearts).
 *  4. inFlight ref: prevents double-tap race conditions on iOS.
 *  5. All setFavs calls use functional updaters (prev => ...) — never stale.
 *  6. toggle/isFaved have stable references (no `favorites` or `userEmail` in deps).
 */
export function useFavorites(userEmail) {
  const [favorites, setFavorites] = useState([]);
  const [loaded, setLoaded] = useState(false);

  // Refs that are always current — stable, never cause hook rebuilds
  const favoritesRef = useRef([]);
  const userEmailRef = useRef(userEmail);
  const inFlight = useRef(new Set());
  const loadedRef = useRef(false);

  // Keep userEmailRef current on every render
  userEmailRef.current = userEmail;

  // Wrapped setter that keeps ref in sync
  const setFavs = useCallback((updater) => {
    setFavorites((prev) => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      favoritesRef.current = next;
      return next;
    });
  }, []);

  // Fetch from DB — called on mount and when email changes
  const reload = useCallback(async (email) => {
    const resolvedEmail = email ?? userEmailRef.current;
    if (!resolvedEmail) {
      // Not logged in — clear favorites but don't break state
      setFavs([]);
      setLoaded(true);
      loadedRef.current = true;
      return;
    }
    try {
      const data = await base44.entities.Favorite.filter(
        { user_email: resolvedEmail },
        "-created_date",
        500
      );
      setFavs(data);
    } catch (err) {
      console.warn("[useFavorites] reload failed:", err);
      // Keep existing state on failure — don't blank out hearts
    } finally {
      setLoaded(true);
      loadedRef.current = true;
    }
  }, [setFavs]); // stable — reads email from ref

  // On mount and whenever userEmail changes: reload from DB
  // DO NOT reset favorites to [] before reload — that causes the empty-heart flash
  useEffect(() => {
    if (userEmail) {
      // Email is now available — fetch from DB
      reload(userEmail);
    } else {
      // No email (logged out) — clear
      setFavs([]);
      setLoaded(true);
      loadedRef.current = true;
    }
  }, [userEmail]); // eslint-disable-line react-hooks/exhaustive-deps

  /** Normalize any id variant to a plain string */
  const normalizeId = (id) => {
    if (!id) return null;
    if (typeof id === "object") {
      const resolved = id.id || id._id || id.trackId || id.songId || id.visualizerId;
      return resolved ? String(resolved) : null;
    }
    return String(id);
  };

  /**
   * isFaved — reads from ref (always current), so never stale.
   * Stable reference: does not depend on favorites state directly.
   */
  const isFaved = useCallback((type, rawId) => {
    const id = normalizeId(rawId);
    if (!id) return false;
    const field = type === "track" ? "track_id" : "visualizer_id";
    return favoritesRef.current.some((f) => f.type === type && f[field] === id);
  }, []); // stable — reads from ref only

  /**
   * toggle — add or remove a favorite.
   * - Reads email from userEmailRef (never stale).
   * - Reads current favorites from favoritesRef (never stale).
   * - Uses functional setFavs to prevent stale overwrites.
   * - inFlight guard prevents double-tap flipping on iOS.
   */
  const toggle = useCallback(async (type, rawId, meta = {}) => {
    const email = userEmailRef.current;

    // Debug log for iOS diagnosis
    if (/iPhone|iPad|iPod/.test(navigator.userAgent)) {
      console.log("[Favorites] toggle called", {
        email,
        type,
        rawId,
        normalizedId: normalizeId(rawId),
        currentlySaved: favoritesRef.current.some(
          (f) => f.type === type && f[type === "track" ? "track_id" : "visualizer_id"] === normalizeId(rawId)
        ),
        favoritesCount: favoritesRef.current.length,
      });
    }

    if (!email) {
      console.warn("[Favorites] toggle: no user email — cannot save");
      return false;
    }

    const id = normalizeId(rawId);
    if (!id) {
      console.warn("[Favorites] toggle: could not normalize id from", rawId);
      return false;
    }

    const key = `${type}:${id}`;
    if (inFlight.current.has(key)) {
      console.log("[Favorites] toggle: ignoring — already in flight for", key);
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
        console.log("[Favorites] removing from DB:", existing.id);
        await base44.entities.Favorite.delete(existing.id);
        console.log("[Favorites] removed OK");
      } else {
        // Optimistic add
        const tempId = `temp_${Date.now()}_${Math.random().toString(36).slice(2)}`;
        const tempRecord = {
          id: tempId,
          user_email: email,
          type,
          [field]: id,
          cached_title: meta.title || "",
          cached_artist: meta.artist || "",
          cached_cover_url: meta.cover_url || "",
        };
        setFavs((prev) => {
          // Guard: don't add if already present (handles rare double-fire)
          const dupe = prev.some((f) => f.type === type && f[field] === id);
          if (dupe) {
            console.log("[Favorites] optimistic add skipped — already present");
            return prev;
          }
          return [...prev, tempRecord];
        });
        console.log("[Favorites] saving to DB:", { type, id, email });
        const record = await base44.entities.Favorite.create({
          user_email: email,
          type,
          [field]: id,
          cached_title: meta.title || "",
          cached_artist: meta.artist || "",
          cached_cover_url: meta.cover_url || "",
        });
        console.log("[Favorites] saved OK, real id:", record.id);
        // Replace temp with real DB record
        setFavs((prev) => prev.map((f) => (f.id === tempId ? record : f)));
      }
    } catch (err) {
      console.error("[Favorites] toggle DB error:", err);
      // Revert optimistic update on failure
      if (existing) {
        setFavs((prev) => {
          const already = prev.some((f) => f.id === existing.id);
          return already ? prev : [...prev, existing];
        });
      } else {
        // Remove the temp record
        setFavs((prev) => prev.filter((f) => !f.id.startsWith("temp_")));
      }
    } finally {
      inFlight.current.delete(key);
    }

    return true;
  }, [setFavs]); // stable — reads email and favorites from refs only

  const trackFavs = favorites.filter((f) => f.type === "track");
  const vizFavs = favorites.filter((f) => f.type === "visualizer");

  return { favorites, isFaved, toggle, trackFavs, vizFavs, reload, loaded };
}