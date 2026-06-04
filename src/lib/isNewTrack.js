/**
 * isNewTrack — returns true if the track was uploaded/created within the last 7 days.
 *
 * Uses `created_date` (always present as a built-in entity field) as the primary signal.
 * Falls back to `release_date` if `created_date` is missing.
 * Also respects the manual `is_new_release` flag set by admins.
 *
 * No manual action required — the badge disappears automatically after 7 days.
 */
export function isNewTrack(track) {
  if (!track) return false;
  // Manual admin override always shows the badge
  if (track.is_new_release) return true;

  const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
  const now = Date.now();

  // created_date is always set by the platform (built-in field)
  const dateStr = track.created_date || track.release_date;
  if (!dateStr) return false;

  const trackDate = new Date(dateStr).getTime();
  if (isNaN(trackDate)) return false;

  return now - trackDate <= SEVEN_DAYS_MS;
}