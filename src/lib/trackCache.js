/**
 * trackCache — shared in-memory cache for published tracks.
 *
 * Eliminates duplicate Track.filter({status:"published"}) calls across
 * Home, Music, MyVibes, and RadioContext which all fetch the same data.
 *
 * TTL: 5 minutes. A stale cache is auto-cleared on next call.
 * Thread-safe: concurrent callers share the same in-flight promise.
 */

import { base44 } from "@/api/base44Client";

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

let _cachedTracks = null;
let _cacheTime = 0;
let _inflightPromise = null;

/**
 * getPublishedTracks — returns up to `limit` published tracks.
 * Fetches fresh data on first call or after TTL expiry.
 * Concurrent callers share the same in-flight fetch.
 *
 * @param {string} [sort="-created_date"]
 * @param {number} [limit=500]
 * @returns {Promise<Array>}
 */
export async function getPublishedTracks(sort = "-created_date", limit = 500) {
  const now = Date.now();

  // Cache hit — still fresh
  if (_cachedTracks && now - _cacheTime < CACHE_TTL_MS) {
    return _cachedTracks;
  }

  // In-flight — share the existing promise
  if (_inflightPromise) return _inflightPromise;

  // Fetch fresh
  _inflightPromise = base44.entities.Track.filter({ status: "published" }, sort, limit)
    .then((tracks) => {
      _cachedTracks = tracks;
      _cacheTime = Date.now();
      _inflightPromise = null;
      return tracks;
    })
    .catch((err) => {
      _inflightPromise = null;
      throw err;
    });

  return _inflightPromise;
}

/**
 * invalidateTrackCache — force a fresh fetch on next call.
 * Call this from pull-to-refresh handlers.
 */
export function invalidateTrackCache() {
  _cachedTracks = null;
  _cacheTime = 0;
  _inflightPromise = null;
}