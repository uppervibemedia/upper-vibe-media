import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const YT_API_KEY = Deno.env.get("YOUTUBE_API_KEY");
const YT_BASE = "https://www.googleapis.com/youtube/v3";

// Known Upper Vibe Media artists
const KNOWN_ARTISTS = [
  "Aura Rae",
  "iami",
  "Jmack So Lavish",
  "Montae DeVine",
  "S.O.N.A. To Infinity",
];

// Artist → default category mapping
const ARTIST_CATEGORY = {
  "Aura Rae": "rnb",
  "Montae DeVine": "rnb",
  "iami": "electronic",
  "Jmack So Lavish": "hiphop",
  "S.O.N.A. To Infinity": "electronic",
};

// Keyword → category mapping
const KEYWORD_CATEGORY = [
  { keywords: ["r&b", "love", "goddess", "divine", "soft", "vibe"], category: "rnb" },
  { keywords: ["trap", "rap", "bars", "lavish", "hustle"], category: "hiphop" },
  { keywords: ["electronic", "neural", "future", "cyber", "2036"], category: "electronic" },
  { keywords: ["meditation", "frequency", "healing", "manifest", "432 hz", "432hz"], category: "meditation" },
];

function detectArtistAndSong(title) {
  const titleLower = title.toLowerCase();

  // Try to find known artist in title
  for (const artist of KNOWN_ARTISTS) {
    if (titleLower.includes(artist.toLowerCase())) {
      // Try to extract song title by removing artist name
      let songTitle = title
        .replace(new RegExp(artist, "i"), "")
        .replace(/^[\s\-–—|]+|[\s\-–—|]+$/g, "")
        .trim();
      return { artist, songTitle: songTitle || title };
    }
  }

  // Try "Artist - Song" or "Song - Artist" patterns
  const dashMatch = title.match(/^([^-–—]+)[-–—]+([^-–—]+)$/);
  if (dashMatch) {
    const part1 = dashMatch[1].trim();
    const part2 = dashMatch[2].trim();
    // Check if part2 is a known artist
    for (const artist of KNOWN_ARTISTS) {
      if (part2.toLowerCase().includes(artist.toLowerCase())) {
        return { artist, songTitle: part1 };
      }
    }
    // Assume "Artist - Song" format
    return { artist: part1, songTitle: part2 };
  }

  return { artist: null, songTitle: title };
}

function detectCategory(title, artist) {
  // Artist-based category first
  if (artist && ARTIST_CATEGORY[artist]) {
    return ARTIST_CATEGORY[artist];
  }
  // Keyword-based
  const lower = title.toLowerCase();
  for (const rule of KEYWORD_CATEGORY) {
    if (rule.keywords.some((kw) => lower.includes(kw))) {
      return rule.category;
    }
  }
  return "";
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

    // Sort: newest first by release_date, fallback to playlist_added_date
    if (order === "newest" || order !== "oldest") {
      videos.sort((a, b) => {
        const da = a.release_date || a.playlist_added_date || "";
        const db = b.release_date || b.playlist_added_date || "";
        return db.localeCompare(da);
      });
    } else {
      videos.sort((a, b) => {
        const da = a.release_date || a.playlist_added_date || "";
        const db = b.release_date || b.playlist_added_date || "";
        return da.localeCompare(db);
      });
    }

    videos = videos.slice(0, maxResults);

    if (!videos.length) {
      return Response.json({ imported: 0, skipped: 0, message: "No videos found." });
    }

    // Load existing visualizers to detect duplicates by youtube_video_id or URL
    let existingVideoIds = new Set();
    if (skipDuplicates) {
      const existing = await base44.asServiceRole.entities.Visualizer.list("created_date", 500);
      for (const v of existing) {
        if (v.youtube_video_id) {
          existingVideoIds.add(v.youtube_video_id);
        } else {
          const m = (v.video_url || v.embed_url || "").match(/(?:watch\?v=|embed\/|youtu\.be\/)([A-Za-z0-9_-]{11})/);
          if (m) existingVideoIds.add(m[1]);
        }
      }
    }

    // Load all tracks for song matching
    const tracks = await base44.asServiceRole.entities.Track.list("title", 500);

    let imported = 0;
    let skipped = 0;

    // display_order: newest = lowest number so they sort top
    // We assign display_order based on sorted position (0 = newest)
    for (let i = 0; i < videos.length; i++) {
      const v = videos[i];
      if (skipDuplicates && existingVideoIds.has(v.videoId)) {
        skipped++;
        continue;
      }

      const { artist, songTitle } = detectArtistAndSong(v.title);
      const category = detectCategory(v.title, artist);

      // Try to match a track
      let linked_song_id = "";
      let linked_song_title = "";
      if (songTitle && tracks.length) {
        const songLower = songTitle.toLowerCase();
        const match = tracks.find((t) => {
          const titleMatch = t.title?.toLowerCase().includes(songLower) || songLower.includes(t.title?.toLowerCase() || "___");
          const artistMatch = !artist || (t.artist_display || "").toLowerCase().includes((artist || "").toLowerCase());
          return titleMatch && artistMatch;
        });
        if (match) {
          linked_song_id = match.id;
          linked_song_title = match.title;
        }
      }

      await base44.asServiceRole.entities.Visualizer.create({
        title: v.title,
        youtube_video_id: v.videoId,
        artist: artist || "",
        detected_artist: artist || "",
        detected_category: category,
        detected_song_title: songTitle || v.title,
        category: category,
        video_url: v.video_url,
        embed_url: v.embed_url,
        thumbnail_url: v.thumbnail_url,
        release_date: v.release_date,
        playlist_added_date: v.playlist_added_date,
        description: v.description,
        status: "published",
        is_featured: false,
        display_order: i,
        linked_song_id,
        linked_song_title,
      });
      imported++;
    }

    return Response.json({
      imported,
      skipped,
      total: videos.length,
      message: `Imported ${imported} video(s), skipped ${skipped} duplicate(s).`,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});