import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const YT_API_KEY = Deno.env.get("YOUTUBE_API_KEY");
const YT_BASE = "https://www.googleapis.com/youtube/v3";

function extractPlaylistId(url) {
  const m = url.match(/[?&]list=([A-Za-z0-9_-]+)/);
  return m ? m[1] : null;
}

function extractChannelId(url) {
  const m = url.match(/youtube\.com\/(?:channel\/|c\/|@)([A-Za-z0-9_@.-]+)/);
  return m ? m[1] : null;
}

function extractVideoId(url) {
  const m = url.match(/(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/);
  return m ? m[1] : null;
}

function buildEmbedUrl(videoId) {
  return `https://www.youtube.com/embed/${videoId}`;
}

function buildWatchUrl(videoId) {
  return `https://www.youtube.com/watch?v=${videoId}`;
}

// Fetch all items from a playlist (handles pagination)
async function fetchPlaylistVideos(playlistId, maxResults = 50, order = "newest") {
  const videos = [];
  let pageToken = "";

  do {
    const url = `${YT_BASE}/playlistItems?part=snippet&playlistId=${playlistId}&maxResults=50&key=${YT_API_KEY}${pageToken ? `&pageToken=${pageToken}` : ""}`;
    const res = await fetch(url);
    const data = await res.json();

    if (data.error) throw new Error(data.error.message);

    for (const item of (data.items || [])) {
      const snippet = item.snippet;
      const videoId = snippet?.resourceId?.videoId;
      if (!videoId || videoId === "private") continue;
      videos.push({
        videoId,
        title: snippet.title || "Untitled",
        description: snippet.description || "",
        thumbnail_url: snippet.thumbnails?.maxres?.url || snippet.thumbnails?.high?.url || snippet.thumbnails?.medium?.url || "",
        release_date: snippet.publishedAt ? snippet.publishedAt.split("T")[0] : "",
        video_url: buildWatchUrl(videoId),
        embed_url: buildEmbedUrl(videoId),
      });
    }

    pageToken = data.nextPageToken || "";
  } while (pageToken && videos.length < maxResults);

  if (order === "oldest") videos.reverse();
  return videos.slice(0, maxResults);
}

// Resolve a channel handle / username to uploads playlist ID
async function resolveChannelUploadsPlaylist(channelInput) {
  // Try by handle (@username)
  const handle = channelInput.startsWith("@") ? channelInput : `@${channelInput}`;
  let url = `${YT_BASE}/channels?part=contentDetails&forHandle=${encodeURIComponent(handle)}&key=${YT_API_KEY}`;
  let res = await fetch(url);
  let data = await res.json();

  if (!data.items?.length) {
    // Try by id
    url = `${YT_BASE}/channels?part=contentDetails&id=${encodeURIComponent(channelInput)}&key=${YT_API_KEY}`;
    res = await fetch(url);
    data = await res.json();
  }

  if (!data.items?.length) throw new Error("Channel not found. Try using a playlist URL instead.");
  return data.items[0].contentDetails.relatedPlaylists.uploads;
}

// Single video fetch
async function fetchSingleVideo(videoId) {
  const url = `${YT_BASE}/videos?part=snippet&id=${videoId}&key=${YT_API_KEY}`;
  const res = await fetch(url);
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  const item = data.items?.[0];
  if (!item) throw new Error("Video not found");
  const snippet = item.snippet;
  return [{
    videoId,
    title: snippet.title || "Untitled",
    description: snippet.description || "",
    thumbnail_url: snippet.thumbnails?.maxres?.url || snippet.thumbnails?.high?.url || snippet.thumbnails?.medium?.url || "",
    release_date: snippet.publishedAt ? snippet.publishedAt.split("T")[0] : "",
    video_url: buildWatchUrl(videoId),
    embed_url: buildEmbedUrl(videoId),
  }];
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (user?.role !== "admin") {
      return Response.json({ error: "Admin only" }, { status: 403 });
    }

    const body = await req.json();
    const { url, maxResults = 50, order = "newest", skipDuplicates = true } = body;

    if (!url) return Response.json({ error: "url is required" }, { status: 400 });
    if (!YT_API_KEY) return Response.json({ error: "YOUTUBE_API_KEY secret not set" }, { status: 500 });

    // Detect type
    let videos = [];
    const videoId = extractVideoId(url);
    const playlistId = extractPlaylistId(url);

    if (playlistId) {
      videos = await fetchPlaylistVideos(playlistId, maxResults, order);
    } else if (videoId) {
      videos = await fetchSingleVideo(videoId);
    } else {
      // Channel
      const channelInput = extractChannelId(url) || url.trim();
      const uploadsPlaylistId = await resolveChannelUploadsPlaylist(channelInput);
      videos = await fetchPlaylistVideos(uploadsPlaylistId, maxResults, order);
    }

    if (!videos.length) {
      return Response.json({ imported: 0, skipped: 0, message: "No videos found." });
    }

    // Load existing visualizers to detect duplicates
    let existingVideoIds = new Set();
    if (skipDuplicates) {
      const existing = await base44.asServiceRole.entities.Visualizer.list("created_date", 500);
      existingVideoIds = new Set(
        existing
          .map((v) => {
            const m = (v.video_url || v.embed_url || "").match(/(?:watch\?v=|embed\/|youtu\.be\/)([A-Za-z0-9_-]{11})/);
            return m ? m[1] : null;
          })
          .filter(Boolean)
      );
    }

    let imported = 0;
    let skipped = 0;

    for (const v of videos) {
      if (skipDuplicates && existingVideoIds.has(v.videoId)) {
        skipped++;
        continue;
      }
      await base44.asServiceRole.entities.Visualizer.create({
        title: v.title,
        artist: "",
        category: "",
        video_url: v.video_url,
        embed_url: v.embed_url,
        thumbnail_url: v.thumbnail_url,
        release_date: v.release_date,
        description: v.description,
        status: "published",
        is_featured: false,
        display_order: 0,
        linked_song_id: "",
        linked_song_title: "",
      });
      imported++;
    }

    return Response.json({ imported, skipped, total: videos.length, message: `Imported ${imported} video(s), skipped ${skipped} duplicate(s).` });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});