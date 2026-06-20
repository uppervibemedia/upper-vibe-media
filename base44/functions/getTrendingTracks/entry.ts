import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Query SongStream records from the last 60 minutes using service role
    const streams = await base44.asServiceRole.entities.SongStream.filter(
      {},
      '-created_date',
      500
    );

    // Filter to last 60 minutes
    const cutoff = Date.now() - 60 * 60 * 1000;
    const recent = streams.filter((s) => {
      const d = new Date(s.created_date).getTime();
      return d > cutoff;
    });

    // Group by song_id and count unique listeners
    const songMap = {};
    for (const s of recent) {
      const id = s.song_id;
      if (!id) continue;
      if (!songMap[id]) {
        songMap[id] = {
          song_id: id,
          title: s.song_title || 'Untitled',
          artist: s.artist_name || 'Unknown Artist',
          listeners: new Set(),
        };
      }
      const listenerKey = s.user_id || s.anonymous_session_id;
      if (listenerKey) songMap[id].listeners.add(listenerKey);
    }

    // Convert to array, count unique listeners, sort
    const trending = Object.values(songMap)
      .map((s) => ({
        song_id: s.song_id,
        title: s.title,
        artist: s.artist,
        listener_count: s.listeners.size,
      }))
      .sort((a, b) => b.listener_count - a.listener_count)
      .slice(0, 10);

    // Enrich with track data (cover_url) — fetch published tracks matching song_ids
    const trackIds = trending.map((t) => t.song_id);
    let tracks = [];
    if (trackIds.length > 0) {
      const allTracks = await base44.asServiceRole.entities.Track.filter(
        { status: 'published' },
        '-created_date',
        500
      );
      tracks = allTracks.filter((t) => trackIds.includes(t.id));
    }

    const trackMap = {};
    for (const t of tracks) {
      trackMap[t.id] = t;
    }

    const result = trending.map((t) => ({
      ...t,
      cover_url: trackMap[t.song_id]?.cover_url || null,
      id: t.song_id,
    }));

    return Response.json({ trending: result, updated_at: new Date().toISOString() });
  } catch (error) {
    console.error('[getTrendingTracks] error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});