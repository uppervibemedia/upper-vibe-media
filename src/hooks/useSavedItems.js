import { useState, useEffect, useCallback, useRef } from "react";
import { base44 } from "@/api/base44Client";

const BUILD_VERSION = "2.0.0-saveditems";

/**
 * normalizeId — single source of truth for item ID normalization.
 * Pass a record object or a raw string/number.
 */
export function normalizeId(item) {
  if (!item) return "";
  if (typeof item === "string" || typeof item === "number") return String(item);
  return String(item.id || item._id || item.trackId || item.songId || item.visualizerId || "");
}

/**
 * useSavedItems — clean, self-contained save/heart system.
 *
 * Design rules:
 * - Waits until auth is fully loaded before any fetch.
 * - Keyed on stableUserId (never email).
 * - Request versioning: stale responses are discarded.
 * - Optimistic updates: heart flips immediately.
 * - pendingSaves blocks all background reloads while a save is in flight.
 * - No Recently Played or Downloads logic touches this state.
 */
export function useSavedItems(stableUserId) {
  const [savedItems, setSavedItems] = useState([]);
  const [loading, setLoading] = useState(true);

  // Derived set of keys for O(1) lookup: "song:abc123"
  const [savedKeys, setSavedKeys] = useState(new Set());

  const itemsRef = useRef([]);
  const keysRef = useRef(new Set());
  const userIdRef = useRef(stableUserId);
  userIdRef.current = stableUserId;

  // Request versioning — only latest fetch wins
  const fetchSeq = useRef(0);

  // Per-item in-flight lock — prevents double taps
  const inFlight = useRef(new Set());

  // Count of pending saves — blocks background reloads
  const pendingSaves = useRef(0);

  // Apply a new list atomically
  const applyItems = useCallback((list) => {
    itemsRef.current = list;
    const keys = new Set(list.map((s) => `${s.itemType}:${s.itemId}`));
    keysRef.current = keys;
    setSavedItems(list);
    setSavedKeys(keys);
  }, []);

  // ── load ──────────────────────────────────────────────────────────────────
  const loadItems = useCallback(async (uid) => {
    if (!uid) {
      applyItems([]);
      setLoading(false);
      return;
    }
    if (pendingSaves.current > 0) {
      console.log("[SavedItems] loadItems blocked — saves pending");
      return;
    }

    fetchSeq.current += 1;
    const seq = fetchSeq.current;

    console.log("[SavedItems] loadItems start", { BUILD_VERSION, uid, seq });

    try {
      const data = await base44.entities.SavedItem.list("-savedAt", 500);

      if (seq !== fetchSeq.current) {
        console.log("[SavedItems] stale response discarded", { seq, current: fetchSeq.current });
        return;
      }
      if (pendingSaves.current > 0) {
        console.log("[SavedItems] load blocked post-await by pending saves");
        return;
      }

      console.log("[SavedItems] loaded", data.length, "items for uid:", uid);
      console.log("[SavedItems] list response:", data);
      applyItems(data);
    } catch (err) {
      console.error("[SavedItems] loadItems failed:", err?.message);
    } finally {
      if (seq === fetchSeq.current) {
        setLoading(false);
      }
    }
  }, [applyItems]);

  // Trigger load when userId becomes available; clear on logout
  useEffect(() => {
    if (stableUserId) {
      setLoading(true);
      loadItems(stableUserId);
    } else {
      fetchSeq.current += 1; // invalidate any in-flight request
      applyItems([]);
      setLoading(false);
    }
  }, [stableUserId]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── isSaved ───────────────────────────────────────────────────────────────
  const isSaved = useCallback((item, itemType) => {
    const id = normalizeId(item);
    if (!id || !itemType) return false;
    return keysRef.current.has(`${itemType}:${id}`);
  }, []);

  // ── toggleSaved ───────────────────────────────────────────────────────────
  const toggleSaved = useCallback(async (item, itemType, meta = {}) => {
    const uid = userIdRef.current;
    const itemId = normalizeId(item);
    const key = `${itemType}:${itemId}`;

    // ── Debug log ──────────────────────────────────────────────────────────
    console.log("[SavedItems] toggleSaved", {
      BUILD_VERSION,
      domain: window.location.hostname,
      uid,
      itemId,
      itemType,
      isSavedBefore: keysRef.current.has(key),
      action: keysRef.current.has(key) ? "UNSAVE" : "SAVE",
    });

    if (!uid) {
      console.warn("[SavedItems] blocked — no userId");
      return { ok: false, reason: "no_user" };
    }
    if (!itemId) {
      console.warn("[SavedItems] blocked — bad itemId:", item);
      return { ok: false, reason: "bad_id" };
    }
    if (!["song", "visualizer"].includes(itemType)) {
      console.warn("[SavedItems] blocked — invalid itemType:", itemType);
      return { ok: false, reason: "bad_type" };
    }
    if (inFlight.current.has(key)) {
      console.log("[SavedItems] blocked — in-flight:", key);
      return { ok: false, reason: "in_flight" };
    }

    inFlight.current.add(key);
    pendingSaves.current += 1;

    const alreadySaved = keysRef.current.has(key);

    if (alreadySaved) {
      // ── UNSAVE ────────────────────────────────────────────────────────────
      const existing = itemsRef.current.find(
        (s) => s.itemType === itemType && s.itemId === itemId
      );

      // Optimistic remove
      applyItems(itemsRef.current.filter((s) => !(s.itemType === itemType && s.itemId === itemId)));
      console.log("[SavedItems] optimistic REMOVE", { existing });

      try {
        if (existing?.id) {
          await base44.entities.SavedItem.delete(existing.id);
          console.log("[SavedItems] backend DELETE ok", existing.id);
        }
        pendingSaves.current -= 1;
        inFlight.current.delete(key);
        // Soft reload after 2s if no other saves pending
        setTimeout(() => {
          if (pendingSaves.current === 0 && userIdRef.current) {
            loadItems(userIdRef.current);
          }
        }, 2000);
        return { ok: true };
      } catch (err) {
        console.error("[SavedItems] DELETE failed:", err?.message);
        // Revert
        if (existing) applyItems([...itemsRef.current, existing]);
        pendingSaves.current -= 1;
        inFlight.current.delete(key);
        return { ok: false, reason: "delete_failed", error: err?.message };
      }
    } else {
      // ── SAVE ──────────────────────────────────────────────────────────────
      const tempId = `_tmp_${Date.now()}`;
      const now = new Date().toISOString();
      const tempRecord = {
        id: tempId,
        userId: uid,
        itemId,
        itemType,
        title: meta.title || "",
        artist: meta.artist || "",
        coverUrl: meta.coverUrl || meta.cover_url || "",
        songUrl: meta.songUrl || meta.audio_url || "",
        pageUrl: meta.pageUrl || "",
        savedAt: now,
        _isTemp: true,
      };

      // Optimistic add
      applyItems([...itemsRef.current, tempRecord]);
      console.log("[SavedItems] optimistic ADD", tempRecord);

      const payload = {
        userId: uid,
        itemId,
        itemType,
        title: meta.title || "",
        artist: meta.artist || "",
        coverUrl: meta.coverUrl || meta.cover_url || "",
        songUrl: meta.songUrl || meta.audio_url || "",
        pageUrl: meta.pageUrl || `${window.location.origin}/song/${itemId}`,
        savedAt: now,
      };
      console.log("[SavedItems] create payload:", payload);

      try {
        const record = await base44.entities.SavedItem.create(payload);
        console.log("[SavedItems] create response:", record);

        // Replace temp with real record
        applyItems(itemsRef.current.map((s) => (s.id === tempId ? record : s)));
        console.log("[SavedItems] isSaved after save:", keysRef.current.has(key));

        // Hold pending lock for 5s — prevents iOS PWA visibility-reload from overwriting
        setTimeout(() => {
          pendingSaves.current -= 1;
          inFlight.current.delete(key);
          console.log("[SavedItems] save lock released:", key);
        }, 5000);

        return { ok: true, record };
      } catch (err) {
        console.error("[SavedItems] CREATE failed:", err?.message);
        // Revert
        applyItems(itemsRef.current.filter((s) => s.id !== tempId));
        pendingSaves.current -= 1;
        inFlight.current.delete(key);
        return { ok: false, reason: "create_failed", error: err?.message };
      }
    }
  }, [applyItems, loadItems]);

  return { savedItems, savedKeys, isSaved, toggleSaved, loadItems, loading };
}