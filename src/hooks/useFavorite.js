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
 * iOS FIX APPROACH (definitive):
 *
 * SAVE flow:
 *   optimistic add (temp record) → DB create → replace temp with real record
 *   NO reload after save. The optimistic record IS the truth.
 *   pendingSaves stays elevated for 4s to block any visibility-reload from stomping it.
 *
 * UNSAVE flow:
 *   optimistic remove → DB delete
 *   NO reload after delete either. Trust optimistic state.
 *   A scheduled soft-reload happens 2s later ONLY if pendingSaves is 0, as a cleanup.
 *
 * WHY NO RELOAD AFTER DELETE:
 *   On iOS PWA, calling reload() after delete triggers another Favorite.list() which
 *   can return stale data (RLS cache) OR trigger rate-limit errors.
 *   The optimistic remove is sufficient — if the user force-refreshes they'll get fresh data.
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
   * Skipped entirely if any pending saves are in-flight.
   */
  const reload = useCallback(async (overrideUserId) => {
    const uid = overrideUserId ?? userIdRef.current;

    if (!uid) {
      setFavs([]);
      setLoaded(true);
      return;
    }

    // Hard block — never reload while saves are pending
    if (pendingSaves.current > 0) {
      return;
    }

    fetchVersion.current += 1;
    const myVersion = fetchVersion.current;

    try {
      const data = await base44.entities.Favorite.list("-created_date", 500);

      if (myVersion !== fetchVersion.current) return;
      // Double-check after the await
      if (pendingSaves.current > 0) return;

      setFavs(data);
    } catch (err) {
      console.warn("[Favorites] reload failed:", err?.message);
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
   * Returns true on success, false on failure.
   */
  const toggle = useCallback(async (type, rawId, meta = {}) => {
    const uid = userIdRef.current;
    const email = userEmailRef.current;
    const id = normalizeItemId(rawId);
    const field = type === "track" ? "track_id" : "visualizer_id";

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
        // Optimistic remove immediately
        setFavs((prev) => prev.filter((f) => f.id !== existing.id));

        await base44.entities.Favorite.delete(existing.id);

        // Done — decrement and clear inflight
        pendingSaves.current -= 1;
        inFlight.current.delete(key);

        // Soft cleanup reload after 2s — only if no other saves pending
        setTimeout(() => {
          if (pendingSaves.current === 0 && userIdRef.current) {
            reload();
          }
        }, 2000);

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

        // Replace temp with real DB record — heart stays filled
        setFavs((prev) => prev.map((f) => (f.id === tempId ? record : f)));

        // Hold pendingSaves elevated for 4s — blocks any visibility-change reload
        // from overwriting the new record with stale pre-save data on iOS PWA.
        setTimeout(() => {
          pendingSaves.current -= 1;
          inFlight.current.delete(key);
        }, 4000);

        return true;
      }
    } catch (err) {
      console.error("[Favorites] toggle error:", err?.message);

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