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
 * THE ROOT BUG THAT WAS CAUSING THE HEART TO FLASH EMPTY:
 *   1. User taps heart → optimistic add fires → favoritesRef has the new item.
 *   2. Simultaneously (or milliseconds later), FavoritesContext re-renders because
 *      stableUserId just changed (isLoadingAuth resolved), triggering reload().
 *   3. reload() calls Favorite.list() — the DB write hasn't landed yet.
 *   4. The list comes back WITHOUT the new record.
 *   5. setFavs(data) OVERWRITES the optimistic state → heart goes empty.
 *
 * FIX: Track a `pendingSaves` counter. reload() will NOT overwrite state when
 * there are pending saves in flight. After the save completes (and we have the
 * real DB record), we do a single reload to confirm the server state.
 */
export function useFavorites(userId, userEmail) {
  const [favorites, setFavorites] = useState([]);
  const [loaded, setLoaded] = useState(false);

  const favoritesRef = useRef([]);
  const userIdRef = useRef(userId);
  const userEmailRef = useRef(userEmail);
  const inFlight = useRef(new Set());      // per-item toggle lock
  const pendingSaves = useRef(0);          // how many saves are in-progress
  const fetchVersion = useRef(0);          // request versioning

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
   * CRITICAL: will not overwrite state if there are pending saves in-flight.
   * Version-gated: stale responses are discarded.
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

    console.log("[Favorites] reload start — version:", myVersion, "pendingSaves:", pendingSaves.current);

    try {
      const data = await base44.entities.Favorite.list("-created_date", 500);

      // CRITICAL CHECK: If a save started while we were fetching, discard this result.
      // It may not include the just-saved record yet.
      if (myVersion !== fetchVersion.current) {
        console.log("[Favorites] reload: discarding — newer fetch started (version mismatch)");
        return;
      }
      if (pendingSaves.current > 0) {
        console.log("[Favorites] reload: discarding — save in progress, won't overwrite optimistic state. pendingSaves:", pendingSaves.current);
        return;
      }

      console.log("[Favorites] reload: applying", data.length, "records");
      console.log("[Favorites] reload: track_ids =", data.filter(f => f.type === "track").map(f => f.track_id));
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
   * Flow:
   *  1. Increment pendingSaves — blocks reload() from overwriting.
   *  2. Optimistic state update immediately.
   *  3. DB write.
   *  4. Replace temp record with real DB record.
   *  5. Decrement pendingSaves.
   *  6. Do a final reload to confirm server state (now safe, pendingSaves=0).
   */
  const toggle = useCallback(async (type, rawId, meta = {}) => {
    const uid = userIdRef.current;
    const email = userEmailRef.current;
    const id = normalizeItemId(rawId);
    const field = type === "track" ? "track_id" : "visualizer_id";

    // ── DIAGNOSTIC LOG (always, not just iOS) ──
    console.log("[Favorites] toggle START", {
      uid,
      email,
      type,
      rawId,
      normalizedId: id,
      currentlySaved: favoritesRef.current.some((f) => f.type === type && f[field] === id),
      currentFavCount: favoritesRef.current.length,
      currentTrackIds: favoritesRef.current.filter(f => f.type === "track").map(f => f.track_id),
    });

    if (!uid) {
      console.warn("[Favorites] toggle BLOCKED — no uid. isLoadingAuth may still be true.");
      return false;
    }
    if (!id) {
      console.warn("[Favorites] toggle BLOCKED — could not normalize id from", rawId);
      return false;
    }

    const key = `${type}:${id}`;
    if (inFlight.current.has(key)) {
      console.log("[Favorites] toggle IGNORED — already in-flight for", key);
      return false;
    }
    inFlight.current.add(key);

    const existing = favoritesRef.current.find(
      (f) => f.type === type && f[field] === id
    );
    console.log("[Favorites] action:", existing ? "UNSAVE" : "SAVE", "existing record:", existing?.id ?? "none");

    // Block reload() from overwriting optimistic state
    pendingSaves.current += 1;

    try {
      if (existing) {
        // Optimistic remove
        setFavs((prev) => prev.filter((f) => f.id !== existing.id));
        console.log("[Favorites] DELETE record from DB:", existing.id);
        await base44.entities.Favorite.delete(existing.id);
        console.log("[Favorites] DELETE OK");
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
        console.log("[Favorites] Optimistic add temp record:", tempRecord);
        setFavs((prev) => {
          const dupe = prev.some((f) => f.type === type && f[field] === id);
          if (dupe) {
            console.log("[Favorites] Optimistic add SKIPPED — dupe already in state");
            return prev;
          }
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
        console.log("[Favorites] CREATE record in DB:", payload);
        const record = await base44.entities.Favorite.create(payload);
        console.log("[Favorites] CREATE OK — real record:", record);
        console.log("[Favorites] Saved record fields:", {
          id: record.id,
          type: record.type,
          track_id: record.track_id,
          visualizer_id: record.visualizer_id,
          user_email: record.user_email,
          created_by_id: record.created_by_id,
        });

        // Replace temp with real DB record
        setFavs((prev) => prev.map((f) => (f.id === tempId ? record : f)));
        console.log("[Favorites] State after replace — count:", favoritesRef.current.length, "ids:", favoritesRef.current.filter(f=>f.type==="track").map(f=>f.track_id));
      }
    } catch (err) {
      console.error("[Favorites] toggle DB ERROR:", err);
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
      pendingSaves.current -= 1;
      inFlight.current.delete(key);
      console.log("[Favorites] toggle END — pendingSaves:", pendingSaves.current, "isSaved now:", favoritesRef.current.some((f) => f.type === type && f[field] === id));

      // Now that the save is done, do a confirmatory reload.
      // pendingSaves is 0 so reload() will apply the result.
      if (pendingSaves.current === 0 && userIdRef.current) {
        console.log("[Favorites] Confirmatory reload after save...");
        await reload();
        console.log("[Favorites] After confirmatory reload — isSaved:", favoritesRef.current.some((f) => f.type === type && f[field] === id), "all track_ids:", favoritesRef.current.filter(f=>f.type==="track").map(f=>f.track_id));
      }
    }

    return true;
  }, [setFavs, reload]);

  const trackFavs = favorites.filter((f) => f.type === "track");
  const vizFavs = favorites.filter((f) => f.type === "visualizer");

  return { favorites, isFaved, toggle, trackFavs, vizFavs, reload, loaded };
}