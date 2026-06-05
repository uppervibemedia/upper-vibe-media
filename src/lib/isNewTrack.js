/**
 * isNewTrack — returns true if the track was released/uploaded within the last 7 days.
 *
 * Date field priority:
 *   release_date → created_date → createdAt → created_at → upload_date
 *
 * Also respects the manual `is_new_release` flag set by admins.
 * No manual action required — the badge disappears automatically after 7 days.
 */

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

/** Returns the best available date string from a track object. */
export function getSongDate(track) {
  if (!track) return null;
  return (
    track.release_date ||
    track.created_date ||
    track.createdAt ||
    track.created_at ||
    track.upload_date ||
    null
  );
}

/** Returns true if the song is within the last 7 days (or admin-flagged). */
export function isNewTrack(track) {
  if (!track) return false;
  // Manual admin override always shows the badge
  if (track.is_new_release) return true;

  const dateStr = getSongDate(track);
  if (!dateStr) return false;

  const trackDate = new Date(dateStr).getTime();
  if (isNaN(trackDate)) return false;

  return Date.now() - trackDate <= SEVEN_DAYS_MS;
}

// Alias for naming consistency
export const isNewSong = isNewTrack;

// ── Visualizer helpers ────────────────────────────────────────────────────────

/** Returns the best available date string from a visualizer object. */
export function getVisualizerDate(viz) {
  if (!viz) return null;
  return (
    viz.release_date ||
    viz.playlist_added_date ||
    viz.created_date ||
    viz.createdAt ||
    viz.created_at ||
    null
  );
}

/** Returns true if the visualizer was released within the last 7 days. */
export function isNewVisualizer(viz) {
  if (!viz) return false;
  const dateStr = getVisualizerDate(viz);
  if (!dateStr) return false;
  const d = new Date(dateStr).getTime();
  if (isNaN(d)) return false;
  return Date.now() - d <= SEVEN_DAYS_MS;
}

/**
 * Sorts visualizers: new ones (≤7 days) first, then older ones.
 * Within each group, newest date first.
 */
export function sortVisualizersNewestFirst(vizList) {
  if (!vizList?.length) return [];
  const getTime = (v) => {
    const d = getVisualizerDate(v);
    return d ? new Date(d).getTime() : 0;
  };
  const newOnes = vizList.filter(isNewVisualizer).sort((a, b) => getTime(b) - getTime(a));
  const oldOnes = vizList.filter((v) => !isNewVisualizer(v)).sort((a, b) => getTime(b) - getTime(a));
  return [...newOnes, ...oldOnes];
}