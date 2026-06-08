import { useState, useEffect, useCallback, useRef } from "react";
import { base44 } from "@/api/base44Client";

/**
 * Normalize any item id variant to a plain string.
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
 * useFavorites — keyed on stable user ID.
 *
 * iOS FIX SUMMARY:
 *  - After CREATE: do NOT do a confirmatory reload. The optimistic state is the
 *    source of truth. A reload right after create on iOS often returns stale data
 *    (the new record hasn't propagated through RLS yet), overwriting the filled heart.
 *  - After DELETE: do a reload to confirm the record is gone.
 *  - pendingSaves guard still blocks any concurrent reload() from stomping state.
 */
export function useFavorites(userId, userEmail) {
  const [favorites, setFavorites] = useState([]);
  const [loaded, setLoaded] = useState(false);

  const favoritesRef = useRef([]);
  const userIdRef = useRef(userId);
  const userEmailRef = useRef(userEmail);
  const inFlight = useRef(new Set());
  const pendingSaves = useRef(0);
  const fetchVersion = useRef(0);

  userIdRef.current = userId;
  userEmailRef.current = userEmail;

  const setFavs = useCallback((updater) => {
    setFavorites((prev) => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      favoritesRef.current = next;
      return next;
    });
  }, []);

  /**
   * reload — fetches from DB.
   * Will not overwrite state if there are pending saves in-flight.
   */
  const reload = useCallback(async (overrideUserId) => {
    const uid = overrideUserId ?? userIdRef.current;

    if (!uid) {
      setFavs([]);
      setLoaded(true);
      return;
    }

    fetchVersion.current += 1;
    const myVersion = fetchVersion.current;

    try {
      const data = await base44.entities.Favorite.list("-created_date", 500);

      if (myVersion !== fetchVersion.current) return;
      if (pendingSaves.current > 0) {
        console.log("[Favorites] reload skipped — save in progress");
        return;
      }

      setFavs(data);
    } catch (err) {
      console.warn("[Favorites] reload failed:", err);
    } finally {
      if (myVersion === fetchVersion.current) {
        setLoaded(true);
      }
    }
  }, [setFavs]);

  // Load when userId becomes available; clear when logged out
  useEffect(() => {
    if (userId) {
      reload(userId);
    } else {
      fetchVersion.current += 1;
      setFavs([]);
      setLoaded(true);
    }
  }, [userId]); // eslint-disable-line react-hooks/exhaustive-deps

  const isFaved = useCallback((type, rawId) => {
    const id = normalizeItemId(rawId);
    if (!id) return false;
    const field = type === "track" ? "track_id" : "visualizer_id";
    return favoritesRef.current.some((f) => f.type === type && f[field] === id);
  }, []);

  /**
   * toggle — add or remove a favorite.
   *
   * KEY iOS FIX:
   *  - On CREATE: optimistic add → DB write → replace temp with real record.
   *    NO confirmatory reload. The optimistic state keeps the heart filled.
   *  - On DELETE: optimistic remove → DB delete → reload to confirm.
   */
  const toggle = useCallback(async (type, rawId, meta = {}) => {
    const uid = userIdRef.current;
    const email = userEmailRef.current;
    const id = normalizeItemId(rawId);
    const field = type === "track" ? "track_id" : "visualizer_id";

    console.log("[Favorites] toggle called", {
      domain: window.location.hostname,
      uid,
      email,
      type,
      id,
      rawId,
    });

    if (!uid) {
      console.warn("[Favorites] toggle blocked — no uid");
      return false;
    }
    if (!id) {
      console.warn("[Favorites] toggle blocked — bad id:", rawId);
      return false;
    }

    const key = `${type}:${id}`;
    if (inFlight.current.has(key)) return false;
    inFlight.current.add(key);

    const existing = favoritesRef.current.find(
      (f) => f.type === type && f[field] === id
    );

    pendingSaves.current += 1;

    try {
      if (existing) {
        // ── UNSAVE ──────────────────────────────────────────────────────────
        // Optimistic remove
        setFavs((prev) => prev.filter((f) => f.id !== existing.id));
        await base44.entities.Favorite.delete(existing.id);
        // After delete, reload to confirm
        pendingSaves.current -= 1;
        inFlight.current.delete(key);
        if (userIdRef.current) await reload();
        return true;
      } else {
        // ── SAVE ─────────────────────────────────────────────────────────────
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

        // Optimistic add — fills the heart immediately
        setFavs((prev) => {
          if (prev.some((f) => f.type === type && f[field] === id)) return prev;
          return [...prev, tempRecord];
        });

        const payload = {
          user_email: email || "",
          type,
          [field]: id,
          cached_title: meta.title || "",
          cached_artist: meta.artist || "",
          cached_cover_url: meta.cover_url || "",
        };

        const record = await base44.entities.Favorite.create(payload);
        console.log("[Favorites] create response:", record);

        // Replace temp with real DB record — heart stays filled
        setFavs((prev) => prev.map((f) => (f.id === tempId ? record : f)));

        // Keep pendingSaves elevated for 3s after CREATE so any visibility-change
        // reload that fires on iOS PWA tab-resume doesn't overwrite the new record
        // with stale data before it propagates through the DB/RLS layer.
        setTimeout(() => {
          pendingSaves.current -= 1;
          inFlight.current.delete(key);
        }, 3000);
        return true;
      }
    } catch (err) {
      console.error("[Favorites] toggle error:", err);
      // Revert optimistic update on error
      if (existing) {
        setFavs((prev) => {
          const already = prev.some((f) => f.id === existing.id);
          return already ? prev : [...prev, existing];
        });
      } else {
        setFavs((prev) => prev.filter((f) => !String(f.id).startsWith("temp_")));
      }
      pendingSaves.current -= 1;
      inFlight.current.delete(key);
      return false;
    }
  }, [setFavs, reload]);

  const trackFavs = favorites.filter((f) => f.type === "track");
  const vizFavs = favorites.filter((f) => f.type === "visualizer");

  return { favorites, isFaved, toggle, trackFavs, vizFavs, reload, loaded };
}