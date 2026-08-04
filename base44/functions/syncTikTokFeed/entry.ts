import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

const TIKTOK_FIELDS = [
  'id', 'title', 'video_description', 'duration', 'cover_image_url',
  'embed_link', 'share_url', 'create_time', 'view_count', 'like_count',
  'comment_count', 'share_count'
].join(',');

const NOISE_PHRASES = [
  'available now', 'out now', 'listen to', 'listen now', 'listen on', 'new song',
  'full song', 'stream now', 'streaming now', 'watch now', 'official audio',
  'official video', 'music video', 'by upper vibe media', 'upper vibe media',
  'upper vibe media collective'
];

function text(value) { return String(value || '').trim(); }

function normalize(value) {
  return text(value)
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[#@]/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function compact(value) { return normalize(value).replace(/\s+/g, ''); }
function containsPhrase(haystack, phrase) { return (` ${haystack} `).includes(` ${phrase} `); }

function cleanCaption(value) {
  let result = normalize(value);
  for (const phrase of NOISE_PHRASES) result = result.replace(new RegExp(`\\b${normalize(phrase).replace(/\s+/g, '\\s+')}\\b`, 'g'), ' ');
  return result.replace(/\s+/g, ' ').trim();
}

function compactDateFromUnix(seconds) {
  const n = Number(seconds || 0);
  return n ? new Date(n * 1000).toISOString().slice(0, 10) : '';
}

function quotedCandidates(caption) {
  const matches = [];
  const patterns = [/“([^”]{2,80})”/g, /"([^"]{2,80})"/g, /'([^']{2,80})'/g, /\(([^)]{2,80})\)/g];
  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(caption))) matches.push(text(match[1]));
  }
  return matches;
}

function rankUnique(candidates) {
  if (!candidates.length) return null;
  const sorted = candidates.sort((a, b) => b.confidence - a.confidence);
  if (sorted.length > 1 && sorted[0].confidence === sorted[1].confidence && sorted[0].track.id !== sorted[1].track.id) return { review: true, suggestions: sorted.map((item) => item.track.id).slice(0, 5) };
  return sorted[0];
}

function matchCaptionToTrack(caption, tracks, aliases) {
  const captionNorm = normalize(caption);
  const captionClean = cleanCaption(caption);
  const captionCompact = compact(caption);
  const quoted = quotedCandidates(caption).map((value) => ({ raw: value, norm: normalize(value), compact: compact(value) }));
  const preparedTracks = tracks.map((track) => ({
    track,
    titleNorm: normalize(track.title),
    titleCompact: compact(track.title),
    artistNorm: normalize(track.artist_display),
  })).filter((item) => item.titleNorm.length >= 3);

  const exactTitle = rankUnique(preparedTracks
    .filter((item) => containsPhrase(captionNorm, item.titleNorm))
    .map((item) => ({ track: item.track, detected: item.track.title, method: 'exact_title', confidence: 98 })));
  if (exactTitle?.track) return exactTitle;
  if (exactTitle?.review) return { status: 'review', suggested_track_ids: exactTitle.suggestions, detected: quoted[0]?.raw || '' };

  const exactTitleArtist = rankUnique(preparedTracks
    .filter((item) => containsPhrase(captionNorm, item.titleNorm) && item.artistNorm && containsPhrase(captionNorm, item.artistNorm))
    .map((item) => ({ track: item.track, detected: item.track.title, method: 'exact_title_artist', confidence: 99 })));
  if (exactTitleArtist?.track) return exactTitleArtist;

  const closeTitle = rankUnique(preparedTracks
    .filter((item) => item.titleCompact.length >= 5 && (captionCompact.includes(item.titleCompact) || quoted.some((q) => q.compact === item.titleCompact)))
    .map((item) => ({ track: item.track, detected: quoted.find((q) => q.compact === item.titleCompact)?.raw || item.track.title, method: 'close_title', confidence: 88 })));
  if (closeTitle?.track) return closeTitle;
  if (closeTitle?.review) return { status: 'review', suggested_track_ids: closeTitle.suggestions, detected: quoted[0]?.raw || '' };

  const aliasMatches = rankUnique(aliases
    .map((alias) => ({ alias, aliasNorm: normalize(alias.alias_title || alias.normalized_alias), aliasCompact: compact(alias.alias_title || alias.normalized_alias) }))
    .filter((item) => item.aliasNorm.length >= 3 && (containsPhrase(captionNorm, item.aliasNorm) || captionCompact.includes(item.aliasCompact)))
    .map((item) => ({ track: tracks.find((track) => track.id === item.alias.track_id), detected: item.alias.alias_title, method: 'alias', confidence: 92 }))
    .filter((item) => item.track));
  if (aliasMatches?.track) return aliasMatches;
  if (aliasMatches?.review) return { status: 'review', suggested_track_ids: aliasMatches.suggestions, detected: quoted[0]?.raw || '' };

  const quotedSuggestions = preparedTracks.filter((item) => quoted.some((q) => q.norm && (q.norm.includes(item.titleNorm) || item.titleNorm.includes(q.norm))));
  if (quotedSuggestions.length === 1) return { track: quotedSuggestions[0].track, detected: quoted[0]?.raw || quotedSuggestions[0].track.title, method: 'close_title', confidence: 84 };
  if (quotedSuggestions.length > 1) return { status: 'review', suggested_track_ids: quotedSuggestions.map((item) => item.track.id).slice(0, 5), detected: quoted[0]?.raw || '' };

  return { status: 'unmatched', suggested_track_ids: [], detected: quoted[0]?.raw || captionClean.split(' ').slice(0, 5).join(' ') };
}

async function fetchTikTokVideos(accessToken) {
  const response = await fetch(`https://open.tiktokapis.com/v2/video/list/?fields=${encodeURIComponent(TIKTOK_FIELDS)}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ max_count: 20 }),
  });
  const payload = await response.json();
  if (!response.ok) {
    console.error('[syncTikTokFeed] TikTok API error', response.status, payload);
    throw new Error(payload?.error?.message || payload?.error?.log_id || 'TikTok sync failed');
  }
  return payload?.data?.videos || [];
}

function matchFields(match) {
  if (!match?.track) {
    return {
      track_id: '', matched_song_title: '', matched_artist: '', song_page_url: '',
      match_confidence: 0, match_method: 'none', approval_status: 'pending',
      match_status: match?.status === 'review' ? 'review' : 'unmatched',
      suggested_track_ids: match?.suggested_track_ids || [], detected_song_title: match?.detected || '',
    };
  }
  return {
    track_id: match.track.id,
    matched_song_title: match.track.title || '',
    matched_artist: match.track.artist_display || '',
    song_page_url: `/song/${match.track.id}`,
    match_confidence: match.confidence || 0,
    match_method: match.method,
    approval_status: 'approved',
    match_status: 'matched',
    suggested_track_ids: [match.track.id],
    detected_song_title: match.detected || match.track.title || '',
  };
}

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const args = await req.json().catch(() => ({}));

    if (args.source !== 'scheduled') {
      const user = await base44.auth.me();
      if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
      if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { accessToken } = await base44.asServiceRole.connectors.getConnection('tiktok');
    const videos = await fetchTikTokVideos(accessToken);
    const tracks = await base44.asServiceRole.entities.Track.filter({ status: 'published' }, '-updated_date', 500);
    const aliases = await base44.asServiceRole.entities.SongTitleAlias.list('-updated_date', 500).catch(() => []);
    const existing = await base44.asServiceRole.entities.SocialVideoPost.filter({ provider: 'tiktok' }, '-updated_date', 500);
    const existingByVideoId = new Map(existing.map((post) => [post.provider_video_id, post]));
    const now = new Date().toISOString();
    const updates = [];
    const creates = [];

    for (const video of videos) {
      const id = text(video.id);
      if (!id) continue;
      const caption = text(video.video_description || video.title);
      const existingPost = existingByVideoId.get(id);
      const preserveManual = existingPost?.match_method === 'manual' && existingPost?.track_id && !args.forceRematch;
      const match = preserveManual
        ? { track: tracks.find((track) => track.id === existingPost.track_id), detected: existingPost.detected_song_title || '', method: 'manual', confidence: existingPost.match_confidence || 100 }
        : matchCaptionToTrack(caption, tracks, aliases);
      const matched = matchFields(match);
      if (preserveManual) matched.approval_status = existingPost.approval_status || 'approved';
      const data = {
        provider: 'tiktok', provider_video_id: id, caption,
        thumbnail_url: text(video.cover_image_url), post_url: text(video.share_url), embed_url: text(video.embed_link),
        post_type: 'video', posted_at: compactDateFromUnix(video.create_time),
        view_count: Number(video.view_count || 0), like_count: Number(video.like_count || 0),
        comment_count: Number(video.comment_count || 0), share_count: Number(video.share_count || 0),
        ...matched,
        is_trending: Number(video.view_count || 0) >= 1000 || Number(video.like_count || 0) >= 100,
        is_featured: !!existingPost?.is_featured, is_hidden: !!existingPost?.is_hidden,
        is_pinned: !!existingPost?.is_pinned, display_order: Number(existingPost?.display_order || 0),
        last_synced_at: now, raw_payload: video,
      };
      if (existingPost) updates.push({ id: existingPost.id, ...data });
      else creates.push(data);
    }

    if (creates.length) await base44.asServiceRole.entities.SocialVideoPost.bulkCreate(creates);
    if (updates.length) await base44.asServiceRole.entities.SocialVideoPost.bulkUpdate(updates);
    return Response.json({ ok: true, synced: videos.length, created: creates.length, updated: updates.length });
  } catch (error) {
    console.error('[syncTikTokFeed] error', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}