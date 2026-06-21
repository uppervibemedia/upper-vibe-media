import { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";

/**
 * Manages song dislikes for the current user.
 * Disliked songs are persisted cross-device via the SongDislike entity.
 * Also stores disliked IDs in localStorage as a fast local cache so the
 * radio curator can filter them without an async DB round-trip.
 */

const LS_DISLIKE_KEY = "uvm_disliked_ids";

export function getDislikedIds() {
  try { return JSON.parse(localStorage.getItem(LS_DISLIKE_KEY) || "[]"); } catch { return []; }
}

function saveDislikedIds(ids) {
  try { localStorage.setItem(LS_DISLIKE_KEY, JSON.stringify(ids)); } catch {}
}

// ── Shared state + deduplication — prevents every ThumbsDownButton from
//     firing its own SongDislike.filter() call on mount ────────────────
let sharedDislikes = [];
let sharedEmail = null;
let pendingPromise = null;
const listeners = new Set();

function notifyAll(data) {
  sharedDislikes = data;
  listeners.forEach((fn) => fn(data));
}

export function useDislike(userEmail) {
  const [dislikes, setDislikes] = useState(() =>
    userEmail === sharedEmail ? sharedDislikes : []
  );

  useEffect(() => {
    if (!userEmail) { setDislikes([]); return; }

    // Register as listener for future updates
    const listener = (data) => setDislikes(data);
    listeners.add(listener);

    // If email changed, or no data loaded yet for this email, fetch
    if (userEmail !== sharedEmail || sharedDislikes.length === 0) {
      if (pendingPromise) {
        // Another component is already loading — await the same promise
        pendingPromise.then(() => {
          if (userEmail === sharedEmail) setDislikes(sharedDislikes);
        });
      } else {
        sharedEmail = userEmail;
        pendingPromise = base44.entities.SongDislike
          .filter({ user_email: userEmail }, "-created_date", 500)
          .then((data) => {
            notifyAll(data);
            saveDislikedIds(data.map((d) => d.track_id));
            pendingPromise = null;
          })
          .catch(() => {
            pendingPromise = null;
          });
      }
    }

    return () => { listeners.delete(listener); };
  }, [userEmail]);

  const isDisliked = useCallback((trackId) => {
    return dislikes.some((d) => d.track_id === trackId);
  }, [dislikes]);

  const toggle = useCallback(async (trackId, meta = {}) => {
    if (!userEmail) return false;
    const existing = dislikes.find((d) => d.track_id === trackId);
    if (existing) {
      await base44.entities.SongDislike.delete(existing.id);
      const next = dislikes.filter((d) => d.id !== existing.id);
      notifyAll(next);
      saveDislikedIds(next.map((d) => d.track_id));
    } else {
      const record = await base44.entities.SongDislike.create({
        user_email: userEmail,
        track_id: trackId,
        cached_title: meta.title || "",
      });
      const next = [...dislikes, record];
      notifyAll(next);
      saveDislikedIds(next.map((d) => d.track_id));
    }
    return true;
  }, [userEmail, dislikes]);

  return { dislikes, isDisliked, toggle };
}