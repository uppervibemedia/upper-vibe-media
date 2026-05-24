/**
 * Secure MP3 download proxy.
 *
 * Fetches the MP3 from storage and re-serves it with:
 *   Content-Disposition: attachment; filename="Song - Artist.mp3"
 *
 * This forces Safari (iOS + macOS) and all browsers to trigger
 * a real "Save File" dialog instead of opening the browser audio player.
 *
 * The frontend fetches this function directly as a blob, then uses
 * a temporary anchor to trigger the OS save dialog — user stays on the page.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  }

  try {
    const base44 = createClientFromRequest(req);
    const { trackId } = await req.json();

    if (!trackId) {
      return Response.json({ error: 'trackId is required' }, { status: 400 });
    }

    // Verify user is authenticated and Plus/Admin
    let user = null;
    try {
      user = await base44.auth.me();
    } catch (e) {
      console.error('[downloadTrack] auth error:', e.message);
    }

    if (!user) {
      return Response.json({ error: 'Login required to download' }, { status: 401 });
    }

    // Plus check: admin always allowed, otherwise check role/subscription fields
    const isPlus = user.role === 'admin' ||
      user.role === 'plus' ||
      user.is_plus === true ||
      user.subscription_status === 'active';

    if (!isPlus) {
      return Response.json({ error: 'Plus membership required' }, { status: 403 });
    }

    // Fetch the track record
    const tracks = await base44.asServiceRole.entities.Track.filter({ id: trackId });
    const track = tracks[0];
    if (!track) {
      return Response.json({ error: 'Track not found' }, { status: 404 });
    }
    if (!track.audio_url) {
      return Response.json({ error: 'No audio file for this track' }, { status: 404 });
    }

    // Proxy-fetch the audio file from storage
    const audioRes = await fetch(track.audio_url);
    if (!audioRes.ok) {
      console.error(`[downloadTrack] upstream fetch failed: ${audioRes.status} ${track.audio_url}`);
      return Response.json({ error: 'Could not retrieve audio file' }, { status: 502 });
    }

    // Build a safe filename
    const safeName = [track.title, track.artist_display]
      .filter(Boolean)
      .join(' - ')
      .replace(/[/\\?%*:|"<>]/g, '')
      .trim() || 'track';
    const filename = `${safeName}.mp3`;

    // Return the audio stream with attachment header
    return new Response(audioRes.body, {
      status: 200,
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': audioRes.headers.get('Content-Length') || '',
        'Cache-Control': 'no-store',
        'Access-Control-Allow-Origin': '*',
      },
    });

  } catch (error) {
    console.error('[downloadTrack] error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});