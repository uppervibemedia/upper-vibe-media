/**
 * Upper Vibe Media — Analytics & Stream Tracking
 *
 * All functions are fire-and-forget async.
 * Failures are caught silently — tracking NEVER blocks playback or navigation.
 */

import { base44 } from "@/api/base44Client";

// ── Admin guard — never track admin activity ──────────────────────────────────
// Cached so we only call auth.me() once per session.
// _adminCheckPromise prevents multiple simultaneous auth.me() calls during cold
// startup (page_view + song_play + streamStart all fire within ~200ms of load).
let _isAdminCached = null;
let _adminCheckPromise = null;

async function isAdminUser() {
  if (_isAdminCached !== null) return _isAdminCached;
  // Return the in-flight promise if one is already resolving — prevents a
  // thundering-herd of auth API calls when multiple analytics events fire
  // simultaneously before the first check completes.
  if (_adminCheckPromise) return _adminCheckPromise;
  _adminCheckPromise = (async () => {
    try {
      const isAuthed = await base44.auth.isAuthenticated();
      if (!isAuthed) { _isAdminCached = false; return false; }
      const me = await base44.auth.me();
      _isAdminCached = me?.role === "admin";
    } catch {
      _isAdminCached = false;
    } finally {
      _adminCheckPromise = null; // clear so a future re-check is possible
    }
    return _isAdminCached;
  })();
  return _adminCheckPromise;
}

// ── Session ID ────────────────────────────────────────────────────────────────
const SESSION_KEY = "uvm_anon_session_id";

function getSessionId() {
  try {
    let id = localStorage.getItem(SESSION_KEY);
    if (!id) {
      id = "anon_" + Math.random().toString(36).slice(2) + "_" + Date.now();
      localStorage.setItem(SESSION_KEY, id);
    }
    return id;
  } catch {
    return "anon_unknown";
  }
}

// ── Device / Browser detection ────────────────────────────────────────────────
function getDeviceType() {
  const ua = navigator.userAgent;
  if (/tablet|ipad|playbook|silk/i.test(ua)) return "tablet";
  if (/mobile|iphone|ipod|android|blackberry|opera mini|iemobile/i.test(ua)) return "mobile";
  return "desktop";
}

function getBrowser() {
  const ua = navigator.userAgent;
  if (/edg/i.test(ua))     return "Edge";
  if (/chrome/i.test(ua))  return "Chrome";
  if (/safari/i.test(ua))  return "Safari";
  if (/firefox/i.test(ua)) return "Firefox";
  if (/trident/i.test(ua)) return "IE";
  return "Other";
}

function getTrafficSource(referrer) {
  if (!referrer) return "direct";
  if (/google|bing|yahoo|duckduckgo/i.test(referrer)) return "organic_search";
  if (/instagram|tiktok|facebook|twitter|x\.com|youtube/i.test(referrer)) return "social";
  if (/t\.co|bit\.ly|lnk\.to/i.test(referrer)) return "social";
  return "referral";
}

// ── Base event builder ────────────────────────────────────────────────────────
function buildEvent(eventType, extras = {}) {
  const referrer = document.referrer || "";
  return {
    event_type: eventType,
    page_url: window.location.pathname,
    anonymous_session_id: getSessionId(),
    device_type: getDeviceType(),
    browser: getBrowser(),
    referrer,
    traffic_source: getTrafficSource(referrer),
    ...extras,
  };
}

// ── Core track function ───────────────────────────────────────────────────────
async function track(eventType, extras = {}) {
  try {
    // Never record admin activity — keeps stats clean
    const adminUser = await isAdminUser();
    if (adminUser) return;
    const event = buildEvent(eventType, { ...extras, is_admin: false });
    await base44.entities.AnalyticsEvent.create(event);
  } catch {
    // silent — never break the app
  }
}

// ── Public API ────────────────────────────────────────────────────────────────

export function trackPageView() {
  track("page_view");
}

export function trackSongPlay(track_) {
  if (!track_) return;
  track("song_play", {
    song_id: track_.id,
    song_title: track_.title,
    artist_name: track_.artist_display || track_.artist,
  });
}

export function trackSongPause(track_) {
  if (!track_) return;
  track("song_pause", {
    song_id: track_.id,
    song_title: track_.title,
    artist_name: track_.artist_display || track_.artist,
  });
}

export function trackSongComplete(track_) {
  if (!track_) return;
  track("song_complete", {
    song_id: track_.id,
    song_title: track_.title,
    artist_name: track_.artist_display || track_.artist,
  });
}

export function trackVisualizerView(visualizer) {
  if (!visualizer) return;
  track("visualizer_view", {
    song_id: visualizer.id,
    song_title: visualizer.title,
    artist_name: visualizer.artist,
  });
}

export function trackDownloadClick(track_) {
  if (!track_) return;
  track("download_click", {
    song_id: track_.id,
    song_title: track_.title,
    artist_name: track_.artist_display || track_.artist,
  });
}

export function trackPremiumClick() {
  track("premium_click");
}

export function trackEmailSignup() {
  track("email_signup");
}

export function trackSearchUsed() {
  track("search_used");
}

export function trackOutboundLink(url) {
  track("outbound_link_click", { page_url: url });
}

// ── Stream tracking ───────────────────────────────────────────────────────────
// Counts a stream only after 30s of continuous listening.
// One stream per song per session unless replayed after completion.

const streamState = {
  songId: null,
  startTime: null,
  totalListened: 0,
  counted: false,
  completed: false,
  streamRecordId: null,
};

export function streamStart(track_) {
  if (!track_) return;

  // Different song — reset state
  if (streamState.songId !== track_.id) {
    streamState.songId       = track_.id;
    streamState.startTime    = Date.now();
    streamState.totalListened = 0;
    streamState.counted      = false;
    streamState.completed    = false;
    streamState.streamRecordId = null;
  } else if (streamState.completed) {
    // Same song replayed after completion — allow new stream
    streamState.startTime    = Date.now();
    streamState.totalListened = 0;
    streamState.counted      = false;
    streamState.completed    = false;
    streamState.streamRecordId = null;
  } else {
    // Resuming same song
    streamState.startTime = Date.now();
  }
}

export function streamPause() {
  if (!streamState.startTime) return;
  const elapsed = (Date.now() - streamState.startTime) / 1000;
  streamState.totalListened += elapsed;
  streamState.startTime = null;
  _checkAndSaveStream();
}

export function streamEnd(completed = false) {
  if (streamState.startTime) {
    const elapsed = (Date.now() - streamState.startTime) / 1000;
    streamState.totalListened += elapsed;
    streamState.startTime = null;
  }
  if (completed) streamState.completed = true;
  _checkAndSaveStream(completed);
}

async function _checkAndSaveStream(completed = false) {
  if (!streamState.songId) return;
  if (streamState.counted && !completed) return; // already saved a 30s stream

  // Skip stream tracking for admins
  if (await isAdminUser()) return;

  const listened = Math.floor(streamState.totalListened);

  // Save stream record once we hit 30s
  if (!streamState.counted && listened >= 30) {
    streamState.counted = true;
    try {
      const songId = streamState.songId;
      const records = await base44.entities.SongStream.filter({
        song_id: songId,
        anonymous_session_id: getSessionId(),
      }, "-created_date", 1);

      if (records.length > 0) {
        // Update existing
        await base44.entities.SongStream.update(records[0].id, {
          listened_seconds: listened,
          completed: completed || streamState.completed,
        });
        streamState.streamRecordId = records[0].id;
      } else {
        // Create new
        const rec = await base44.entities.SongStream.create({
          song_id: songId,
          song_title: streamState.songTitle,
          artist_name: streamState.artistName,
          anonymous_session_id: getSessionId(),
          listened_seconds: listened,
          completed: completed || streamState.completed,
        });
        streamState.streamRecordId = rec.id;
      }
    } catch {
      // silent
    }
  } else if (streamState.streamRecordId && completed) {
    // Update completion flag on existing record
    try {
      await base44.entities.SongStream.update(streamState.streamRecordId, {
        listened_seconds: listened,
        completed: true,
      });
    } catch {}
  }
}

export function streamSetMeta(track_) {
  if (!track_) return;
  streamState.songTitle  = track_.title;
  streamState.artistName = track_.artist_display || track_.artist;
}