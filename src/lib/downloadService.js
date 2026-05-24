/**
 * Download Service — permission logic and download actions.
 *
 * Rule: Only Plus/Admin users can download.
 * Also writes to UserDownload entity for "My Downloads" page.
 *
 * iOS Safari behaviour:
 *   - Anchor `.click()` with target="_self" replaces the page with the audio → BLACK SCREEN.
 *   - Anchor `.click()` with target="_blank" opens a new tab with the audio → NEW TAB.
 *   - fetch → blob → objectURL works on iOS 14.5+ but is blocked by CORS on most CDNs.
 *   - Best approach: open the raw URL in a new tab so Safari shows its own media player
 *     in a separate tab, and we keep a toast telling them "Tap Share → Save to Files".
 *     The current page is NEVER replaced.
 *
 * Returns: "blob" | "ios_new_tab" | "error"
 */
import { base44 } from "@/api/base44Client";

/** Check if a user tier is allowed to download.
 * Supports both old "premium" and new "plus" tier naming.
 */
export function canUserDownload(userTier) {
  return userTier === "premium" || userTier === "plus";
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
 * Detect TikTok in-app browser
 */
export function isTikTokBrowser() {
  if (typeof navigator === "undefined") return false;
  return /bytedance|tiktok|musically/i.test(navigator.userAgent);
}

/**
 * Detect Instagram in-app browser
 */
export function isInstagramBrowser() {
  if (typeof navigator === "undefined") return false;
  return /instagram/i.test(navigator.userAgent);
}

/**
 * Detect Facebook in-app browser
 */
export function isFacebookBrowser() {
  if (typeof navigator === "undefined") return false;
  return /fban|fbav|fb_iab/i.test(navigator.userAgent);
}

/**
 * Detect any restricted in-app browser where downloads are unreliable
 */
export function isRestrictedInAppBrowser() {
  return isTikTokBrowser() || isInstagramBrowser() || isFacebookBrowser();
}

/**
 * Detect Android
 */
export function isAndroid() {
  if (typeof navigator === "undefined") return false;
  return /android/i.test(navigator.userAgent);
}

/**
 * Log download environment for debugging
 */
export function logDownloadEnv(songId, plusStatus) {
  const ua = navigator?.userAgent || "unknown";
  console.log("[download] env:", {
    userAgent: ua,
    isTikTokBrowser: isTikTokBrowser(),
    isInstagramBrowser: isInstagramBrowser(),
    isFacebookBrowser: isFacebookBrowser(),
    isRestrictedInAppBrowser: isRestrictedInAppBrowser(),
    isIOS: isIOS(),
    isAndroid: isAndroid(),
    plusStatus,
    currentSongId: songId,
  });
}

/**
 * Trigger a real MP3 download via the secure backend proxy.
 *
 * The `downloadTrack` backend function fetches the audio and re-serves it
 * with `Content-Disposition: attachment` — so Safari and all browsers
 * trigger a real "Save File" dialog, not a browser audio player screen.
 *
 * The frontend fetches the function response as a blob, then uses a
 * temporary anchor (.download) to invoke the OS save dialog.
 * The user stays on the current page throughout.
 *
 * @param {string} trackId  - The Track entity ID
 * @param {string} filename - Desired filename (without extension)
 * Returns: "blob" | "error"
 */
export async function triggerBrowserDownload(trackId, filename) {
  if (!trackId) return "error";
  const safeFilename = (filename || "track").replace(/[/\\?%*:|"<>]/g, "").trim() + ".mp3";

  try {
    const { appParams } = await import("@/lib/app-params");
    const { appId, token, appBaseUrl } = appParams;

    const base = (appBaseUrl || window.location.origin).replace(/\/$/, "");
    const fnBase = `${base}/api/apps/${appId}/functions/downloadTrack`;

    // Restricted in-app browsers (TikTok, Instagram, Facebook): block all raw URL navigation.
    // Caller must show the in-app-browser modal instead — return sentinel value.
    if (isRestrictedInAppBrowser()) {
      console.log("[download] blocked — restricted in-app browser detected");
      return "restricted_browser";
    }

    // iOS Safari: blob URL + anchor .click() is unreliable.
    // Open the backend GET endpoint directly in a new tab — the backend's
    // Content-Disposition: attachment header tells iOS Safari to trigger "Save to Files".
    // We skip the wasted POST round-trip entirely on iOS.
    if (isIOS()) {
      const iosUrl = `${fnBase}?trackId=${encodeURIComponent(trackId)}&token=${encodeURIComponent(token || "")}`;
      window.open(iosUrl, "_blank");
      return "blob";
    }

    // Desktop / Android: fetch as blob then trigger anchor download.
    // User stays on the page throughout.
    const headers = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const response = await fetch(fnBase, {
      method: "POST",
      headers,
      body: JSON.stringify({ trackId }),
    });

    if (!response.ok) {
      const text = await response.text();
      console.error("[downloadService] proxy error:", response.status, text);
      return "error";
    }

    const blob = await response.blob();
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = blobUrl;
    a.download = safeFilename;
    a.rel = "noopener";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(blobUrl), 60000);
    return "blob";
  } catch (err) {
    console.error("[downloadService] triggerBrowserDownload error:", err.message);
    return "error";
  }
}