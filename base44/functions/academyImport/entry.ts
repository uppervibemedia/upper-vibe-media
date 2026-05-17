import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const YT_API_KEY = Deno.env.get("YOUTUBE_API_KEY");
const YT_BASE = "https://www.googleapis.com/youtube/v3";

const KEYWORD_CATEGORY = [
  { keywords: ["432 hz", "432hz", "frequency", "healing", "solfeggio"], category: "432hz_music" },
  { keywords: ["manifest", "manifestation", "law of attraction", "attract"], category: "manifestation_music" },
  { keywords: ["focus", "study", "concentration", "productivity", "work"], category: "music_for_focus" },
  { keywords: ["behind the song", "breakdown", "how i made", "making of", "story behind"], category: "behind_the_song" },
  { keywords: ["upper vibe", "uvm", "brand", "platform", "about us"], category: "upper_vibe_media" },
  { keywords: ["music business", "label", "publishing", "royalties", "distribution"], category: "music_business" },
  { keywords: ["artist development", "artist growth", "how to be", "artist tips"], category: "artist_development" },
  { keywords: ["high vibe", "high-vibe", "positive", "elevation", "frequency"], category: "high_vibe_music" },
];

function detectCategory(title) {
  const lower = title.toLowerCase();
  for (const rule of KEYWORD_CATEGORY) {
    if (rule.keywords.some((kw) => lower.includes(kw))) {
      return rule.category;
    }
  }
  return "high_vibe_music";
}

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

async function fetchPlaylistVideos(playlistId, maxResults = 50) {
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
        release_date: snippet.videoPublishedAt ? snippet.videoPublishedAt.split("T")[0] : (snippet.publishedAt ? snippet.publishedAt.split("T")[0] : ""),
        playlist_added_date: snippet.publishedAt ? snippet.publishedAt.split("T")[0] : "",
        video_url: buildWatchUrl(videoId),
        embed_url: buildEmbedUrl(videoId),
      });
    }
    pageToken = data.nextPageToken || "";
  } while (pageToken && videos.length < maxResults);
  return videos;
}

async function resolveChannelUploadsPlaylist(channelInput) {
  const handle = channelInput.startsWith("@") ? channelInput : `@${channelInput}`;
  let url = `${YT_BASE}/channels?part=contentDetails&forHandle=${encodeURIComponent(handle)}&key=${YT_API_KEY}`;
  let res = await fetch(url);
  let data = await res.json();
  if (!data.items?.length) {
    url = `${YT_BASE}/channels?part=contentDetails&id=${encodeURIComponent(channelInput)}&key=${YT_API_KEY}`;
    res = await fetch(url);
    data = await res.json();
  }
  if (!data.items?.length) throw new Error("Channel not found. Try using a playlist URL instead.");
  return data.items[0].contentDetails.relatedPlaylists.uploads;
}

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
    playlist_added_date: "",
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

    // Fetch videos
    let videos = [];
    const videoId = extractVideoId(url);
    const playlistId = extractPlaylistId(url);

    if (playlistId) {
      videos = await fetchPlaylistVideos(playlistId, maxResults);
    } else if (videoId) {
      videos = await fetchSingleVideo(videoId);
    } else {
      const channelInput = extractChannelId(url) || url.trim();
      const uploadsPlaylistId = await resolveChannelUploadsPlaylist(channelInput);
      videos = await fetchPlaylistVideos(uploadsPlaylistId, maxResults);
    }

    // Sort
    if (order === "oldest") {
      videos.sort((a, b) => (a.release_date || "").localeCompare(b.release_date || ""));
    } else {
      videos.sort((a, b) => (b.release_date || "").localeCompare(a.release_date || ""));
    }
    videos = videos.slice(0, maxResults);

    if (!videos.length) {
      return Response.json({ imported: 0, skipped: 0, total: 0, message: "No videos found." });
    }

    // Deduplicate against existing AcademyLesson records
    let existingVideoIds = new Set();
    if (skipDuplicates) {
      const existing = await base44.asServiceRole.entities.AcademyLesson.list("created_date", 500);
      for (const v of existing) {
        if (v.youtube_video_id) existingVideoIds.add(v.youtube_video_id);
        else {
          const m = (v.video_url || v.embed_url || "").match(/(?:watch\?v=|embed\/|youtu\.be\/)([A-Za-z0-9_-]{11})/);
          if (m) existingVideoIds.add(m[1]);
        }
      }
    }

    let imported = 0;
    let skipped = 0;

    for (let i = 0; i < videos.length; i++) {
      const v = videos[i];
      if (skipDuplicates && existingVideoIds.has(v.videoId)) {
        skipped++;
        continue;
      }
      const category = detectCategory(v.title);
      await base44.asServiceRole.entities.AcademyLesson.create({
        title: v.title,
        description: v.description,
        youtube_video_id: v.videoId,
        video_url: v.video_url,
        embed_url: v.embed_url,
        thumbnail_url: v.thumbnail_url,
        release_date: v.release_date,
        playlist_added_date: v.playlist_added_date,
        category,
        is_premium: true,
        free_preview_seconds: 60,
        is_featured: false,
        status: "published",
        display_order: i,
      });
      imported++;
    }

    return Response.json({
      imported,
      skipped,
      total: videos.length,
      message: `Imported ${imported} Academy video(s), skipped ${skipped} duplicate(s).`,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});