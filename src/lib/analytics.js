/**
 * Upper Vibe Media — Analytics & Stream Tracking  (v3 — full audit fix)
 *
 * Key changes in this version:
 *  1. Visitor ID persists in localStorage forever — same person never re-counted
 *  2. Session ID resets after 30min of inactivity (industry standard)
 *  3. Traffic source is captured ONCE on first load and pinned to the session
 *  4. Song play is debounced: same song can only fire once per 60s cooldown
 *  5. Song complete only fires when ≥90% of the song is heard
 *  6. Admin guard cached per page load, never re-calls auth.me
 *  7. Email signup event only fired after confirmed DB write (moved to caller)
 *  8. All tracking is fire-and-forget; failures never block the app
 */

import { base44 } from "@/api/base44Client";

// ── Admin guard ───────────────────────────────────────────────────────────────
let _isAdminCached = null;
let _adminCheckPromise = null;

async function isAdminUser() {
  if (_isAdminCached !== null) return _isAdminCached;
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
      _adminCheckPromise = null;
    }
    return _isAdminCached;
  })();
  return _adminCheckPromise;
}

// ── Stable Visitor ID (persistent, never resets) ──────────────────────────────
const VISITOR_KEY = "uvm_visitor_id";

function getVisitorId() {
  try {
    let id = localStorage.getItem(VISITOR_KEY);
    if (!id) {
      id = "v_" + Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
      localStorage.setItem(VISITOR_KEY, id);
    }
    return id;
  } catch {
    return "v_unknown";
  }
}

// ── Session ID (resets after 30min of inactivity) ─────────────────────────────
const SESSION_KEY     = "uvm_session_id";
const SESSION_TS_KEY  = "uvm_session_ts";
const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes

function getSessionId() {
  try {
    const now      = Date.now();
    const lastSeen = parseInt(localStorage.getItem(SESSION_TS_KEY) || "0", 10);
    let   id       = localStorage.getItem(SESSION_KEY);

    if (!id || (now - lastSeen > SESSION_TIMEOUT)) {
      // New session
      id = "s_" + Math.random().toString(36).slice(2) + "_" + now;
      localStorage.setItem(SESSION_KEY, id);
    }
    // Always update the activity timestamp
    localStorage.setItem(SESSION_TS_KEY, String(now));
    return id;
  } catch {
    return "s_unknown";
  }
}

// Keep session alive on user activity
if (typeof window !== "undefined") {
  ["click", "keydown", "scroll", "touchstart"].forEach(evt => {
    window.addEventListener(evt, () => {
      try { localStorage.setItem(SESSION_TS_KEY, String(Date.now())); } catch {}
    }, { passive: true });
  });
}

// ── Traffic Source (captured ONCE per page session, pinned) ───────────────────
// We capture document.referrer on the very first script execution (module load)
// so that internal navigation doesn't overwrite the original source.
const SESSION_SRC_KEY = "uvm_traffic_source";
const SESSION_REF_KEY = "uvm_referrer";

const _initialReferrer = (typeof document !== "undefined") ? (document.referrer || "") : "";

function captureInitialTrafficSource() {
  try {
    // If we already have a source for this session, use it
    const sessionId = localStorage.getItem(SESSION_KEY);
    const savedTs   = parseInt(localStorage.getItem(SESSION_TS_KEY) || "0", 10);
    const isNewSess = !sessionId || (Date.now() - savedTs > SESSION_TIMEOUT);

    if (!isNewSess && localStorage.getItem(SESSION_SRC_KEY)) {
      // Existing session — preserve original source
      return {
        traffic_source: localStorage.getItem(SESSION_SRC_KEY) || "direct",
        referrer:       localStorage.getItem(SESSION_REF_KEY) || "",
      };
    }

    // New session — compute and save
    const src = getTrafficSource(_initialReferrer);
    try {
      localStorage.setItem(SESSION_SRC_KEY, src);
      localStorage.setItem(SESSION_REF_KEY, _initialReferrer);
    } catch {}
    return { traffic_source: src, referrer: _initialReferrer };
  } catch {
    return { traffic_source: getTrafficSource(_initialReferrer), referrer: _initialReferrer };
  }
}

function getTrafficSource(referrer) {
  if (!referrer) return "direct";
  // Internal navigation — treat as direct
  if (typeof window !== "undefined" && referrer.includes(window.location.hostname)) return "direct";
  if (/google|bing|yahoo|duckduckgo|baidu/i.test(referrer)) return "organic_search";
  if (/instagram|tiktok|facebook|twitter|x\.com|youtube|pinterest|snapchat/i.test(referrer)) return "social";
  if (/t\.co|bit\.ly|lnk\.to|linktr\.ee/i.test(referrer)) return "social";
  if (/mail\.|gmail\.|yahoo\.mail|outlook\.|substack\.|mailchimp/i.test(referrer)) return "email";
  return "referral";
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

// ── Base event builder ────────────────────────────────────────────────────────
function buildEvent(eventType, extras = {}) {
  const { traffic_source, referrer } = captureInitialTrafficSource();
  return {
    event_type:           eventType,
    page_url:             window.location.pathname,
    user_id:              getVisitorId(),       // stable visitor ID
    anonymous_session_id: getSessionId(),       // session ID (resets at 30min)
    device_type:          getDeviceType(),
    browser:              getBrowser(),
    referrer,
    traffic_source,
    is_admin:             false,
  };
}

// ── Core track function ───────────────────────────────────────────────────────
async function track(eventType, extras = {}) {
  try {
    const adminUser = await isAdminUser();
    if (adminUser) return;
    const event = buildEvent(eventType, extras);
    await base44.entities.AnalyticsEvent.create({ ...event, ...extras });
  } catch {
    // silent
  }
}

// ── Page View Deduplication ────────────────────────────────────────────────────
// One page_view per visitor per page per calendar day
const PAGE_SEEN_KEY = "uvm_pages_seen";

function getTodayStr() {
  return new Date().toISOString().slice(0, 10);
}

function hasSeenPageToday(pagePath) {
  try {
    const key    = `${getVisitorId()}|${pagePath}|${getTodayStr()}`;
    const raw    = localStorage.getItem(PAGE_SEEN_KEY);
    const seen   = raw ? JSON.parse(raw) : {};
    return !!seen[key];
  } catch { return false; }
}

function markPageSeen(pagePath) {
  try {
    const visitorId = getVisitorId();
    const today     = getTodayStr();
    const key       = `${visitorId}|${pagePath}|${today}`;
    const raw       = localStorage.getItem(PAGE_SEEN_KEY);
    const seen      = raw ? JSON.parse(raw) : {};
    seen[key]       = today;

    // Prune entries older than 60 days
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 60);
    const cutoffStr = cutoff.toISOString().slice(0, 10);
    for (const k of Object.keys(seen)) {
      if (seen[k] < cutoffStr) delete seen[k];
    }
    localStorage.setItem(PAGE_SEEN_KEY, JSON.stringify(seen));
  } catch {}
}

// ── Public API ────────────────────────────────────────────────────────────────

export function trackPageView() {
  const pagePath = window.location.pathname;
  if (hasSeenPageToday(pagePath)) return; // deduplicated
  markPageSeen(pagePath);
  track("page_view");
}

// ── Song Play Deduplication ───────────────────────────────────────────────────
// A song_play is only recorded once per (visitor, song, session).
// After a 60s cooldown the same song can register another play (replay).
const _songPlayTimestamps = {}; // songId → timestamp of last play event recorded

export function trackSongPlay(track_) {
  if (!track_?.id) return;
  const now     = Date.now();
  const last    = _songPlayTimestamps[track_.id] || 0;
  const COOLDOWN = 60_000; // 60 seconds
  if (now - last < COOLDOWN) return; // same song within 60s = resume, not new play
  _songPlayTimestamps[track_.id] = now;
  track("song_play", {
    song_id:     track_.id,
    song_title:  track_.title,
    artist_name: track_.artist_display || track_.artist,
  });
}

export function trackSongPause(track_) {
  // We no longer record pause events — they create noise without analytics value.
  // Kept as an export so callers don't break, but intentionally a no-op.
}

// ── Song Completion (≥90% threshold) ─────────────────────────────────────────
// Tracked when the audio `ended` event fires AND the listener heard ≥90% of the song.
// The `streamEnd` function handles the ≥90% check using elapsed listen time.
// This function is called only from streamEnd when the condition is met.
export function trackSongComplete(track_) {
  if (!track_?.id) return;
  track("song_complete", {
    song_id:     track_.id,
    song_title:  track_.title,
    artist_name: track_.artist_display || track_.artist,
  });
}

export function trackVisualizerView(visualizer) {
  if (!visualizer) return;
  track("visualizer_view", {
    song_id:     visualizer.id,
    song_title:  visualizer.title,
    artist_name: visualizer.artist,
  });
}

export function trackDownloadClick(track_) {
  if (!track_) return;
  track("download_click", {
    song_id:     track_.id,
    song_title:  track_.title,
    artist_name: track_.artist_display || track_.artist,
  });
}

export function trackPremiumClick() {
  track("premium_click");
}

/**
 * trackEmailSignup — call ONLY after a successful EmailSubscriber.create()
 * This ensures the analytics count matches the actual subscriber count.
 */
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
// Counts a stream only after 10s of continuous/cumulative listening.
// Only one completion per song per session.
// Song complete event fires when ≥90% of the song is heard.

const streamState = {
  songId:          null,
  songTitle:       null,
  artistName:      null,
  songDuration:    0,    // set from the audio element when available
  startTime:       null,
  totalListened:   0,
  counted:         false,  // has 10s stream been recorded?
  completionFired: false,  // has song_complete been fired this session?
  streamRecordId:  null,
};

export function streamStart(track_, audioDuration = 0) {
  if (!track_) return;

  if (streamState.songId !== track_.id) {
    // New song — full reset
    streamState.songId          = track_.id;
    streamState.songTitle       = track_.title;
    streamState.artistName      = track_.artist_display || track_.artist;
    streamState.songDuration    = audioDuration || 0;
    streamState.startTime       = Date.now();
    streamState.totalListened   = 0;
    streamState.counted         = false;
    streamState.completionFired = false;
    streamState.streamRecordId  = null;
  } else if (streamState.completionFired) {
    // Same song replayed after it ended — allow new stream + completion
    streamState.startTime       = Date.now();
    streamState.totalListened   = 0;
    streamState.counted         = false;
    streamState.completionFired = false;
    streamState.streamRecordId  = null;
    if (audioDuration) streamState.songDuration = audioDuration;
  } else {
    // Resuming the same song (pause → play) — just restart the clock
    streamState.startTime = Date.now();
    if (audioDuration) streamState.songDuration = audioDuration;
  }
}

export function streamPause() {
  if (!streamState.startTime) return;
  const elapsed = (Date.now() - streamState.startTime) / 1000;
  streamState.totalListened += elapsed;
  streamState.startTime = null;
  _checkAndSaveStream(false);
}

export function streamEnd(completed = false, audioDuration = 0) {
  if (streamState.startTime) {
    const elapsed = (Date.now() - streamState.startTime) / 1000;
    streamState.totalListened += elapsed;
    streamState.startTime = null;
  }
  if (audioDuration) streamState.songDuration = audioDuration;
  _checkAndSaveStream(completed);
}

async function _checkAndSaveStream(completed = false) {
  if (!streamState.songId) return;
  if (await isAdminUser()) return;

  const listened = Math.floor(streamState.totalListened);

  // Record a stream after 10 seconds of cumulative listening
  if (!streamState.counted && listened >= 10) {
    streamState.counted = true;
    try {
      const songId = streamState.songId;
      const records = await base44.entities.SongStream.filter({
        song_id:              songId,
        anonymous_session_id: getSessionId(),
      }, "-created_date", 1);

      if (records.length > 0) {
        await base44.entities.SongStream.update(records[0].id, {
          listened_seconds: listened,
          completed:        completed || streamState.completionFired,
        });
        streamState.streamRecordId = records[0].id;
      } else {
        const rec = await base44.entities.SongStream.create({
          song_id:              songId,
          song_title:           streamState.songTitle,
          artist_name:          streamState.artistName,
          anonymous_session_id: getSessionId(),
          listened_seconds:     listened,
          completed:            completed || streamState.completionFired,
        });
        streamState.streamRecordId = rec.id;
      }
    } catch {}
  } else if (streamState.streamRecordId && listened > 0) {
    // Update existing record with latest seconds
    try {
      await base44.entities.SongStream.update(streamState.streamRecordId, {
        listened_seconds: listened,
        completed:        completed || streamState.completionFired,
      });
    } catch {}
  }

  // Fire song_complete when ≥90% of the song has been heard
  // Requires: songDuration known, listened ≥ 90% of duration, not already fired
  if (completed && !streamState.completionFired) {
    const dur = streamState.songDuration;
    const pct = dur > 0 ? (listened / dur) : 0;
    if (dur === 0 || pct >= 0.9) {
      // If we don't know the duration (dur=0), trust the `ended` event
      streamState.completionFired = true;
      try {
        const t = {
          id:            streamState.songId,
          title:         streamState.songTitle,
          artist_display: streamState.artistName,
        };
        trackSongComplete(t);
      } catch {}
    }
  }
}

export function streamSetMeta(track_, audioDuration = 0) {
  if (!track_) return;
  if (streamState.songId === track_.id) {
    // Update duration if now available
    if (audioDuration > 0) streamState.songDuration = audioDuration;
    return;
  }
  streamState.songTitle    = track_.title;
  streamState.artistName   = track_.artist_display || track_.artist;
  if (audioDuration > 0) streamState.songDuration = audioDuration;
}

// Export for debug panel
export function getStreamState() { return { ...streamState }; }
export { getVisitorId, getSessionId };