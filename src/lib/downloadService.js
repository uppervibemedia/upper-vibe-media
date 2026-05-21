/**
 * Download Service — permission logic and download actions.
 *
 * Rule: Only Premium/Admin users can download.
 * Also writes to UserDownload entity for "My Downloads" page.
 */
import { base44 } from "@/api/base44Client";

/** Check if a user tier is allowed to download */
export function canUserDownload(userTier) {
  return userTier === "premium";
}

/** Check if a specific content item is downloadable by this user */
export function canDownloadContent(userTier, item) {
  if (!canUserDownload(userTier)) return false;
  if (!item?.is_downloadable) return false;
  const required = item.download_tier_required || "premium";
  return required === "premium" ? userTier === "premium" : true;
}

/**
 * Record a download in the UserDownload entity.
 * Prevents duplicates for the same user + song.
 */
export async function recordUserDownload(user, track) {
  if (!user?.id || !track?.id) return;
  try {
    const existing = await base44.entities.UserDownload.filter({
      user_id: user.id,
      song_id: track.id,
    });
    if (existing.length > 0) return existing[0]; // already recorded

    return await base44.entities.UserDownload.create({
      user_id: user.id,
      user_email: user.email || "",
      song_id: track.id,
      song_title: track.title || "",
      artist_name: track.artist_display || track.artist || "",
      artwork_url: track.cover_url || "",
      file_url: track.audio_url || "",
      downloaded_at: new Date().toISOString(),
    });
  } catch (e) {
    console.warn("[downloadService] recordUserDownload error:", e.message);
  }
}

/** Save a download record for the current user (legacy Download entity) */
export async function saveDownloadRecord(userEmail, contentType, item) {
  const existing = await base44.entities.Download.filter({
    user_email: userEmail,
    content_type: contentType,
    content_id: item.id,
  });
  if (existing.length > 0) return existing[0];

  return base44.entities.Download.create({
    user_email: userEmail,
    content_type: contentType,
    content_id: item.id,
    content_title: item.title || item.name,
    content_cover_url: item.cover_url || item.thumbnail || item.cover || "",
    content_artist: item.artist_display || item.artist || "",
    content_duration: item.duration || "",
    file_url: item.audio_url || item.video_url || item.file_url || "",
  });
}

/** Remove a download record */
export async function removeDownload(userEmail, contentType, contentId) {
  const existing = await base44.entities.Download.filter({
    user_email: userEmail,
    content_type: contentType,
    content_id: contentId,
  });
  for (const d of existing) {
    await base44.entities.Download.delete(d.id);
  }
}

/** Get all downloads for a user */
export async function getUserDownloads(userEmail) {
  return base44.entities.Download.filter({ user_email: userEmail }, "-created_date", 200);
}

/** Trigger a browser download for a file URL */
export function triggerBrowserDownload(fileUrl, filename) {
  const a = document.createElement("a");
  a.href = fileUrl;
  a.download = filename || "download";
  a.target = "_blank";
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}