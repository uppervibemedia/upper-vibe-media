/**
 * feedEngine.js — Upper Vibe Media Personalization Engine
 *
 * Weights:
 *   40% Listening History (play counts, completions, artist affinity)
 *   20% Favorites
 *   15% Downloads
 *   10% Vibe Check / Mood
 *   10% Recently Played (recency signal)
 *    5% Trending / Community
 */

// ── Mood → tag affinity ─────────────────────────────────────────────────────
export const MOOD_AFFINITIES = {
  high_vibe:   ["high_vibe", "hiphop", "energy", "motivation", "frequency"],
  intentional: ["focus", "meditation_focus", "528hz", "432hz", "consciousness"],
  neutral:     ["432hz", "balance", "meditation_focus", "healing"],
  low_energy:  ["healing", "calm", "528hz", "432hz", "feminine"],
  scattered:   ["focus", "grounding", "432hz", "meditation_focus"],
};

export const MOOD_META = {
  high_vibe:   { emoji: "⚡", label: "High Vibe",   color: "#4ADE80" },
  intentional: { emoji: "🎯", label: "Intentional", color: "#38BDF8" },
  neutral:     { emoji: "😌", label: "Balanced",    color: "#9B7EFF" },
  low_energy:  { emoji: "🌊", label: "Low Energy",  color: "#60A5FA" },
  scattered:   { emoji: "🌀", label: "Scattered",   color: "#FB923C" },
};

function rememberFreshFirstTrack(key, tracks) {
  if (!tracks?.length) return tracks || [];
  let lastId = null;
  try { lastId = localStorage.getItem(key); } catch {}
  const result = [...tracks];
  if (result.length > 1 && result[0]?.id === lastId) {
    const swapIndex = result.findIndex((t, idx) => idx > 0 && t.id !== lastId);
    if (swapIndex > 0) [result[0], result[swapIndex]] = [result[swapIndex], result[0]];
  }
  try { localStorage.setItem(key, result[0]?.id || ""); } catch {}
  return result;
}

export function shuffleTopPersonalizedTracks(tracks, key = "uv_last_my_vibe_first_track") {
  if (!tracks?.length) return tracks || [];
  const topCount = Math.min(12, Math.max(4, Math.ceil(tracks.length * 0.25)));
  const top = [...tracks.slice(0, topCount)].sort(() => Math.random() - 0.5);
  return rememberFreshFirstTrack(key, [...top, ...tracks.slice(topCount)]);
}

export function pickFreshPersonalizedTrack(tracks, key = "uv_last_city_default_track") {
  const shuffled = shuffleTopPersonalizedTracks(tracks || [], key);
  return shuffled[0] || null;
}

// ── Extract user behavior profile from raw data ─────────────────────────────
export function buildUserProfile({
  userStreams,    // SongStream[] for this user
  userFavs,      // Favorite[] for this user
  userDownloads, // UserDownload[] for this user
  checkIns,      // VibeCheckIn[] for this user
  allTracks,     // all published Track[]
}) {
  // Artist play counts
  const artistPlays = {};
  const trackPlayCounts = {};
  const recentlyPlayedIds = []; // ordered newest first

  userStreams.forEach(s => {
    if (!s.song_id) return;
    trackPlayCounts[s.song_id] = (trackPlayCounts[s.song_id] || 0) + 1;
    const track = allTracks.find(t => t.id === s.song_id);
    if (track?.primary_artist_id) {
      artistPlays[track.primary_artist_id] = (artistPlays[track.primary_artist_id] || 0) + 1;
    }
    if (!recentlyPlayedIds.includes(s.song_id)) recentlyPlayedIds.push(s.song_id);
  });

  // Category / tag affinity from history
  const tagAffinity = {};
  userStreams.forEach(s => {
    const track = allTracks.find(t => t.id === s.song_id);
    if (!track) return;
    (track.mood_tags || []).forEach(tag => { tagAffinity[tag] = (tagAffinity[tag] || 0) + 1; });
    (track.category_ids || []).forEach(cat => { tagAffinity[cat] = (tagAffinity[cat] || 0) + 1; });
  });

  // Favorites
  const favTrackIds = new Set(userFavs.map(f => f.track_id).filter(Boolean));
  // Favorite artist affinity
  userFavs.forEach(f => {
    const track = allTracks.find(t => t.id === f.track_id);
    if (track?.primary_artist_id) {
      artistPlays[track.primary_artist_id] = (artistPlays[track.primary_artist_id] || 0) + 3; // favs weight more
    }
    (track?.mood_tags || []).forEach(tag => { tagAffinity[tag] = (tagAffinity[tag] || 0) + 2; });
  });

  // Downloads
  const dlTrackIds = new Set(userDownloads.map(d => d.song_id).filter(Boolean));
  userDownloads.forEach(d => {
    const track = allTracks.find(t => t.id === d.song_id);
    if (track?.primary_artist_id) {
      artistPlays[track.primary_artist_id] = (artistPlays[track.primary_artist_id] || 0) + 2;
    }
  });

  // Dominant mood from check-ins
  let dominantMood = null;
  if (checkIns.length) {
    const tally = {};
    checkIns.slice(0, 5).forEach(c => { tally[c.mood] = (tally[c.mood] || 0) + 1; });
    dominantMood = Object.entries(tally).sort((a, b) => b[1] - a[1])[0]?.[0] || null;
  }

  // Top artist (for "Because you listened to X" labels)
  const topArtistId = Object.entries(artistPlays).sort((a, b) => b[1] - a[1])[0]?.[0] || null;
  const topArtist = allTracks.find(t => t.primary_artist_id === topArtistId)?.artist_display || null;

  // Top mood tags
  const topTags = Object.entries(tagAffinity)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([tag]) => tag);

  // Mood tags from check-ins
  const moodTags = dominantMood ? MOOD_AFFINITIES[dominantMood] || [] : [];

  return {
    artistPlays,
    trackPlayCounts,
    recentlyPlayedIds,
    favTrackIds,
    dlTrackIds,
    tagAffinity,
    topTags,
    moodTags,
    dominantMood,
    topArtistId,
    topArtist,
    isNewUser: userStreams.length === 0 && userFavs.length === 0,
  };
}

// ── Score a single track for a user ────────────────────────────────────────
export function scoreTrackForUser(track, profile, communityScores) {
  const {
    artistPlays, trackPlayCounts, recentlyPlayedIds,
    favTrackIds, dlTrackIds, tagAffinity, topTags, moodTags,
  } = profile;

  const community = communityScores[track.id] || { plays: 0, completions: 0, favs: 0, dls: 0 };

  // 40% — Listening history
  const playCount = trackPlayCounts[track.id] || 0;
  const artistBoost = track.primary_artist_id ? (artistPlays[track.primary_artist_id] || 0) * 4 : 0;
  const recencyIdx = recentlyPlayedIds.indexOf(track.id);
  const recencyBoost = recencyIdx >= 0 ? Math.max(0, 20 - recencyIdx * 2) : 0; // 10% recently played
  const historyScore = (playCount * 8 + artistBoost + recencyBoost) * 0.40;

  // 20% — Favorites
  const favScore = (favTrackIds.has(track.id) ? 30 : 0) * 0.20;

  // 15% — Downloads
  const dlScore = (dlTrackIds.has(track.id) ? 30 : 0) * 0.15;

  // 10% — Mood / Vibe Check
  const moodMatch = moodTags.filter(tag => {
    const haystack = [...(track.mood_tags || []), ...(track.category_ids || [])].map(t => t.toLowerCase());
    return haystack.some(h => h.includes(tag) || tag.includes(h));
  }).length;
  const moodScore = (moodMatch * 10) * 0.10;

  // 10% — Tag affinity from history
  const trackTags = [...(track.mood_tags || []), ...(track.category_ids || [])].map(t => t.toLowerCase());
  const affinityScore = trackTags.reduce((sum, tag) => sum + (tagAffinity[tag] || 0), 0) * 0.10;

  // 5% — Community trending
  const completionRate = community.plays > 0 ? community.completions / community.plays : 0;
  const communityScore = (completionRate * 10 + community.favs * 2 + community.plays * 0.05) * 0.05;

  const total = historyScore + favScore + dlScore + moodScore + affinityScore + communityScore;

  return { total, playCount, artistBoost, moodMatch, affinityScore };
}

// ── Generate a dynamic, context-aware label for a track ────────────────────
export function generateTrackLabel(track, profile, scoreBreakdown) {
  const { topArtist, topArtistId, favTrackIds, dlTrackIds, dominantMood, trackPlayCounts, moodTags } = profile;
  const { playCount, artistBoost, moodMatch } = scoreBreakdown;

  // Most played by this user
  if (trackPlayCounts[track.id] >= 3) {
    return { label: `🔁 You've played this ${trackPlayCounts[track.id]}x`, bg: "rgba(0,160,220,0.12)", border: "rgba(0,160,220,0.35)", color: "#38BDF8" };
  }
  // Same artist as most-played
  if (track.primary_artist_id && track.primary_artist_id === topArtistId && topArtist && !trackPlayCounts[track.id]) {
    return { label: `🎤 More from ${topArtist}`, bg: "rgba(155,126,255,0.14)", border: "rgba(155,126,255,0.4)", color: "#c4aaff" };
  }
  // Favorited
  if (favTrackIds.has(track.id)) {
    return { label: "❤️ In Your Favorites", bg: "rgba(239,68,68,0.1)", border: "rgba(239,68,68,0.3)", color: "#F87171" };
  }
  // Downloaded
  if (dlTrackIds.has(track.id)) {
    return { label: "⬇️ You Downloaded This", bg: "rgba(56,189,248,0.12)", border: "rgba(56,189,248,0.3)", color: "#38BDF8" };
  }
  // Mood match
  if (moodMatch > 0 && dominantMood) {
    const moodLabel = MOOD_META[dominantMood]?.label || dominantMood;
    return { label: `🎯 Based On Your ${moodLabel} Vibe`, bg: "rgba(74,222,128,0.1)", border: "rgba(74,222,128,0.28)", color: "#4ADE80" };
  }
  // Artist affinity (listened to same artist before)
  if (track.primary_artist_id && artistBoost > 0 && topArtist) {
    return { label: `🎤 Because You Like ${topArtist}`, bg: "rgba(155,126,255,0.14)", border: "rgba(155,126,255,0.4)", color: "#c4aaff" };
  }
  // Default personalized
  return { label: "💜 Recommended For You", bg: "rgba(155,126,255,0.14)", border: "rgba(155,126,255,0.4)", color: "#c4aaff" };
}

// ── Community score index from all streams/favs/dls ────────────────────────
export function buildCommunityIndex(streams, allFavs, allDls) {
  const idx = {};
  streams.forEach(s => {
    if (!s.song_id) return;
    if (!idx[s.song_id]) idx[s.song_id] = { plays: 0, completions: 0, favs: 0, dls: 0 };
    idx[s.song_id].plays++;
    if (s.completed) idx[s.song_id].completions++;
  });
  allFavs.forEach(f => {
    if (!f.track_id) return;
    if (!idx[f.track_id]) idx[f.track_id] = { plays: 0, completions: 0, favs: 0, dls: 0 };
    idx[f.track_id].favs++;
  });
  allDls.forEach(d => {
    if (!d.content_id) return;
    if (!idx[d.content_id]) idx[d.content_id] = { plays: 0, completions: 0, favs: 0, dls: 0 };
    idx[d.content_id].dls++;
  });
  return idx;
}

// ── Score visualizers for user ──────────────────────────────────────────────
export function scoreVizForUser(viz, profile) {
  const { tagAffinity, topArtistId } = profile;
  let score = 0;
  // Artist match
  if (viz.artist && topArtistId) {
    // rough name match — visualizers store artist name not ID
    score += 2;
  }
  // Category affinity
  if (viz.category) {
    score += (tagAffinity[viz.category] || 0) * 1.5;
  }
  // Featured bonus
  if (viz.is_featured) score += 3;
  return score;
}

// ── Generate visualizer label ───────────────────────────────────────────────
export function generateVizLabel(viz, profile) {
  const { topArtist } = profile;
  if (viz.artist && topArtist && viz.artist.toLowerCase().includes(topArtist.split(" ")[0].toLowerCase())) {
    return { label: `🎬 ${viz.artist} Visualizer`, bg: "rgba(0,229,255,0.1)", border: "rgba(0,229,255,0.28)", color: "#00E5FF" };
  }
  if (viz.is_featured) {
    return { label: "⭐ Featured Visual", bg: "rgba(212,168,67,0.12)", border: "rgba(212,168,67,0.35)", color: "#D4A843" };
  }
  return { label: "🎬 Watch This", bg: "rgba(0,229,255,0.1)", border: "rgba(0,229,255,0.28)", color: "#00E5FF" };
}

// ── Build the full personalized feed ───────────────────────────────────────
export function buildPersonalizedFeed({
  allTracks, allViz,
  profile,
  communityIdx,
  trackCount = 5,
  vizCount = 3,
}) {
  const publishedTracks = (allTracks || []).filter(t => t.status === "published" && t.audio_url);

  // Score all tracks
  const scoredTracks = publishedTracks.map(t => {
    const breakdown = scoreTrackForUser(t, profile, communityIdx);
    const badge = generateTrackLabel(t, profile, breakdown);
    return { ...t, _score: breakdown.total, _breakdown: breakdown, _badge: badge };
  }).sort((a, b) => b._score - a._score);

  // For new users — sort by community score (trending)
  const rankedTracks = profile.isNewUser
    ? [...scoredTracks].sort((a, b) => {
        const ca = communityIdx[a.id] || { plays: 0, favs: 0, dls: 0 };
        const cb = communityIdx[b.id] || { plays: 0, favs: 0, dls: 0 };
        const sa = ca.plays * 0.05 + ca.favs * 20 + ca.dls * 5;
        const sb = cb.plays * 0.05 + cb.favs * 20 + cb.dls * 5;
        return sb - sa;
      })
    : scoredTracks;
  const finalTracks = shuffleTopPersonalizedTracks(rankedTracks);

  // Score visualizers
  const scoredViz = (allViz || [])
    .filter(v => v.status === "published")
    .map(v => {
      const score = scoreVizForUser(v, profile);
      const badge = generateVizLabel(v, profile);
      return { ...v, _score: score, _badge: badge };
    })
    .sort((a, b) => b._score - a._score);

  // Build track items (no duplicates)
  const usedTrackIds = new Set();
  const trackItems = [];
  for (const t of finalTracks) {
    if (trackItems.length >= trackCount) break;
    if (usedTrackIds.has(t.id)) continue;
    usedTrackIds.add(t.id);
    trackItems.push({ type: "track", data: t, badge: t._badge });
  }

  // Build viz items
  const vizItems = scoredViz.slice(0, vizCount).map(v => ({
    type: "visualizer", data: v, badge: v._badge,
  }));

  // Interleave: T T T V T T V T V
  const result = [];
  const tArr = [...trackItems];
  const vArr = [...vizItems];
  const slots = ["t","t","t","v","t","t","v","t","v"];
  let ti = 0, vi = 0;
  for (const slot of slots) {
    if (slot === "t" && tArr[ti]) result.push(tArr[ti++]);
    else if (slot === "v" && vArr[vi]) result.push(vArr[vi++]);
  }
  while (result.length < 8 && ti < tArr.length) result.push(tArr[ti++]);

  return result.slice(0, 8);
}