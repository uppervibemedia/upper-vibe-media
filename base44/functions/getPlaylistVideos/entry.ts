import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Get the YouTube playlist URL from AppSettings
    const settings = await base44.asServiceRole.entities.AppSettings.filter({ key: "youtube_playlist_url" });
    const playlistUrl = settings?.[0]?.value;

    if (!playlistUrl) {
      return Response.json({ error: "No YouTube playlist configured" }, { status: 400 });
    }

    // Extract playlist ID from URL
    const match = playlistUrl.match(/list=([^&]+)/);
    const playlistId = match ? match[1] : null;

    if (!playlistId) {
      return Response.json({ error: "Invalid playlist URL" }, { status: 400 });
    }

    const apiKey = Deno.env.get("YOUTUBE_API_KEY");
    if (!apiKey) {
      return Response.json({ error: "YouTube API key not configured" }, { status: 500 });
    }

    // Fetch playlist items from YouTube Data API
    const url = `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&maxResults=25&playlistId=${playlistId}&key=${apiKey}`;
    const response = await fetch(url);
    const data = await response.json();

    if (data.error) {
      return Response.json({ error: data.error.message }, { status: 500 });
    }

    const videos = (data.items || []).map((item) => ({
      title: item.snippet?.title || "Upper Vibe Media",
      youtube_video_id: item.snippet?.resourceId?.videoId || null,
      video_url: item.snippet?.resourceId?.videoId
        ? `https://www.youtube.com/watch?v=${item.snippet.resourceId.videoId}`
        : null,
      embed_url: item.snippet?.resourceId?.videoId
        ? `https://www.youtube.com/embed/${item.snippet.resourceId.videoId}`
        : null,
      thumbnail_url: item.snippet?.thumbnails?.maxres?.url
        || item.snippet?.thumbnails?.high?.url
        || item.snippet?.thumbnails?.default?.url
        || null,
    }));

    return Response.json({ videos });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});