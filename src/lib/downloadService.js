/**
 * Download Service — permission logic and download actions.
 *
 * Rule: Only Plus/Admin users can download.
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

/**
 * Detect iOS (iPhone/iPad) — Safari and in-app browsers (TikTok, Instagram, etc.)
 */
export function isIOS() {
  if (typeof navigator === "undefined") return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent) || 
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

/**
 * Trigger a browser download.
 *
 * Strategy:
 *  1. Try fetch → blob → objectURL (works on Android, desktop, Firefox).
 *  2. If fetch fails (CORS, network) or we're on iOS, fall back to anchor with download attr.
 *  3. On iOS the browser will open the file inline — caller should show a tip after calling this.
 *
 * Returns: "blob" | "anchor" | "error"
 */
export async function triggerBrowserDownload(fileUrl, filename) {
  const safeFilename = (filename || "download").replace(/[/\\?%*:|"<>]/g, "") + ".mp3";

  // On iOS, skip the fetch attempt entirely — it will fail with CORS or open a blank page.
  // Just use the anchor approach directly.
  if (isIOS()) {
    _anchorDownload(fileUrl, safeFilename);
    return "anchor";
  }

  // Desktop / Android: try blob fetch first for a true save dialog
  try {
    const response = await fetch(fileUrl, { mode: "cors" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const blob = await response.blob();
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = blobUrl;
    a.download = safeFilename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(blobUrl), 15000);
    return "blob";
  } catch {
    // Fallback: anchor download (browser may open inline if CORS blocks download attr)
    _anchorDownload(fileUrl, safeFilename);
    return "anchor";
  }
}

function _anchorDownload(fileUrl, filename) {
  const a = document.createElement("a");
  a.href = fileUrl;
  a.download = filename;
  // Do NOT use target="_blank" — that opens the audio URL as a page (black screen)
  // target="_self" on iOS will open the audio inline in Safari — acceptable
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}