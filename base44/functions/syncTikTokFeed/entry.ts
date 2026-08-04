import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

const TIKTOK_FIELDS = [
  'id', 'title', 'video_description', 'duration', 'cover_image_url',
  'embed_link', 'share_url', 'create_time', 'view_count', 'like_count',
  'comment_count', 'share_count'
].join(',');

function text(value) {
  return String(value || '').trim();
}

function normalize(value) {
  return text(value).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function compactDateFromUnix(seconds) {
  const n = Number(seconds || 0);
  if (!n) return '';
  return new Date(n * 1000).toISOString().slice(0, 10);
}

function suggestTracks(video, tracks) {
  const caption = normalize([video.title, video.video_description].filter(Boolean).join(' '));
  if (!caption) return [];
  return tracks.filter((track) => {
    const title = normalize(track.title);
    if (!title || title.length < 3) return false;
    return caption.includes(title);
  }).map((track) => track.id);
}

async function fetchTikTokVideos(accessToken) {
  const response = await fetch(`https://open.tiktokapis.com/v2/video/list/?fields=${encodeURIComponent(TIKTOK_FIELDS)}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ max_count: 20 }),
  });
  const payload = await response.json();
  if (!response.ok) {
    console.error('[syncTikTokFeed] TikTok API error', response.status, payload);
    throw new Error(payload?.error?.message || payload?.error?.log_id || 'TikTok sync failed');
  }
  return payload?.data?.videos || [];
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
    const existing = await base44.asServiceRole.entities.SocialVideoPost.filter({ provider: 'tiktok' }, '-updated_date', 500);
    const existingByVideoId = new Map(existing.map((post) => [post.provider_video_id, post]));
    const now = new Date().toISOString();
    const updates = [];
    const creates = [];

    for (const video of videos) {
      const id = text(video.id);
      if (!id) continue;
      const suggestions = suggestTracks(video, tracks);
      const existingPost = existingByVideoId.get(id);
      const hasManualTrack = !!existingPost?.track_id;
      const nextTrackId = hasManualTrack ? existingPost.track_id : (suggestions.length === 1 ? suggestions[0] : '');
      const nextMatch = hasManualTrack || suggestions.length === 1 ? 'matched' : suggestions.length > 1 ? 'review' : 'unmatched';
      const data = {
        provider: 'tiktok',
        provider_video_id: id,
        caption: text(video.video_description || video.title),
        thumbnail_url: text(video.cover_image_url),
        post_url: text(video.share_url),
        embed_url: text(video.embed_link),
        post_type: 'video',
        posted_at: compactDateFromUnix(video.create_time),
        view_count: Number(video.view_count || 0),
        like_count: Number(video.like_count || 0),
        comment_count: Number(video.comment_count || 0),
        share_count: Number(video.share_count || 0),
        suggested_track_ids: suggestions,
        match_status: nextMatch,
        track_id: nextTrackId,
        approval_status: existingPost?.approval_status || (nextTrackId ? 'approved' : 'pending'),
        is_trending: Number(video.view_count || 0) >= 1000 || Number(video.like_count || 0) >= 100,
        is_featured: !!existingPost?.is_featured,
        is_hidden: !!existingPost?.is_hidden,
        is_pinned: !!existingPost?.is_pinned,
        display_order: Number(existingPost?.display_order || 0),
        last_synced_at: now,
        raw_payload: video,
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