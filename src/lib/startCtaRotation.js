const RECENT_KEY = "uvm_start_cta_recent_track_ids";
const LAST_KEY = "uvm_start_cta_last_track_id";
const MAX_RECENT = 5;

export function getRecentStartCtaTrackIds() {
  try {
    const parsed = JSON.parse(localStorage.getItem(RECENT_KEY) || "[]");
    return Array.isArray(parsed) ? parsed.filter(Boolean).slice(0, MAX_RECENT) : [];
  } catch {
    return [];
  }
}

export function getLastStartCtaTrackId() {
  try { return localStorage.getItem(LAST_KEY) || null; } catch { return null; }
}

export function rememberStartCtaTrack(trackId) {
  if (!trackId) return;
  try {
    const recent = getRecentStartCtaTrackIds().filter((id) => id !== trackId);
    localStorage.setItem(RECENT_KEY, JSON.stringify([trackId, ...recent].slice(0, MAX_RECENT)));
    localStorage.setItem(LAST_KEY, trackId);
  } catch {}
}

function playable(track) {
  return !!track?.id && !!track?.audio_url && track.status === "published";
}

function uniqueTracks(tracks = []) {
  const seen = new Set();
  const result = [];
  for (const track of tracks) {
    if (!playable(track) || seen.has(track.id)) continue;
    seen.add(track.id);
    result.push(track);
  }
  return result;
}

function withoutIds(tracks, ids) {
  const blocked = new Set(ids || []);
  return (tracks || []).filter((track) => track?.id && !blocked.has(track.id));
}

export function buildStartCtaPool({ recommendations = [], allTracks = [], newestTracks = [] }) {
  const newestIds = newestTracks.map((track) => track.id).filter(Boolean);
  const recommended = withoutIds(uniqueTracks(recommendations), newestIds);
  if (recommended.length) return recommended;

  const playableTracks = uniqueTracks(allTracks);
  const nonNewest = withoutIds(playableTracks, newestIds);
  const base = nonNewest.length >= 5 ? nonNewest : playableTracks;

  const defaultMyVibe = base.filter((track) =>
    track.is_featured ||
    track.frequency_type === "432hz" ||
    track.frequency_type === "528hz" ||
    (track.mood_tags || []).some((tag) => String(tag).toLowerCase().includes("vibe"))
  );
  if (defaultMyVibe.length) return uniqueTracks(defaultMyVibe);

  const popular = [...base].sort((a, b) => (b.plays || 0) - (a.plays || 0));
  return uniqueTracks(popular.length ? popular : playableTracks);
}

export function pickRotatingStartCtaTrack(pool = []) {
  const cleanPool = uniqueTracks(pool);
  if (!cleanPool.length) return null;
  if (cleanPool.length === 1) return cleanPool[0];

  const lastId = getLastStartCtaTrackId();
  const recentIds = getRecentStartCtaTrackIds();
  const notLast = cleanPool.filter((track) => track.id !== lastId);
  const notRecent = notLast.filter((track) => !recentIds.includes(track.id));
  const candidates = notRecent.length ? notRecent : (notLast.length ? notLast : cleanPool);
  return candidates[Math.floor(Math.random() * candidates.length)] || cleanPool[0];
}