/**
 * Track Service — normalized query helpers
 * All track queries go through here to ensure consistent
 * relational logic (multi-category, multi-tier, multi-artist).
 */
import { base44 } from "@/api/base44Client";
import { getEffectiveAccess } from "./tierAccess";

/** Fetch all published tracks */
export async function getAllTracks() {
  return base44.entities.Track.filter({ status: "published" }, "-created_date", 200);
}

/** Filter tracks visible to a given user tier */
export function filterByUserTier(tracks, userTier = "free") {
  return tracks.filter((t) => {
    const access = getEffectiveAccess(t);
    return access.includes(userTier);
  });
}

/** Filter tracks by a category ID */
export function filterByCategory(tracks, categoryId) {
  if (!categoryId) return tracks;
  return tracks.filter((t) => Array.isArray(t.category_ids) && t.category_ids.includes(categoryId));
}

/** Filter tracks by a category slug (requires categories lookup) */
export function filterByCategorySlug(tracks, categories, slug) {
  const cat = categories.find((c) => c.slug === slug);
  if (!cat) return [];
  return filterByCategory(tracks, cat.id);
}

/** Filter tracks by primary or featured artist */
export function filterByArtist(tracks, artistId) {
  if (!artistId) return tracks;
  return tracks.filter(
    (t) =>
      t.primary_artist_id === artistId ||
      (Array.isArray(t.featured_artist_ids) && t.featured_artist_ids.includes(artistId))
  );
}

/** Get featured tracks */
export function getFeatured(tracks) {
  return tracks.filter((t) => t.is_featured);
}

/** Get new releases */
export function getNewReleases(tracks) {
  return tracks.filter((t) => t.is_new_release);
}

/** Get tracks by frequency type */
export function getBy432Hz(tracks) {
  return tracks.filter((t) => t.frequency_type === "432hz" || t.frequency_hz === 432);
}

/** Search across title, artist_display */
export function searchTracks(tracks, query) {
  if (!query) return tracks;
  const q = query.toLowerCase();
  return tracks.filter(
    (t) =>
      t.title?.toLowerCase().includes(q) ||
      t.artist_display?.toLowerCase().includes(q) ||
      t.album?.toLowerCase().includes(q)
  );
}

/** Get artist display name from artists list */
export function getArtistName(artists, artistId) {
  return artists.find((a) => a.id === artistId)?.name || "";
}

/** Get category names for a track */
export function getTrackCategoryNames(categories, track) {
  if (!track.category_ids?.length) return [];
  return categories
    .filter((c) => track.category_ids.includes(c.id))
    .map((c) => c.name);
}