function extractYouTubeId(url = "") {
  if (!url || typeof url !== "string") return "";
  const patterns = [
    /youtu\.be\/([A-Za-z0-9_-]{6,})/,
    /youtube\.com\/watch\?v=([A-Za-z0-9_-]{6,})/,
    /youtube\.com\/embed\/([A-Za-z0-9_-]{6,})/,
    /youtube\.com\/shorts\/([A-Za-z0-9_-]{6,})/,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match?.[1]) return match[1];
  }
  try {
    const parsed = new URL(url);
    return parsed.searchParams.get("v") || "";
  } catch {
    return "";
  }
}

function normalize(value = "") {
  return String(value).toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function matchPlaylistVideo(track, videos = []) {
  if (!track || !videos.length) return null;
  const title = normalize(track.title);
  const artist = normalize(track.artist_display || track.artist_name || "");
  if (!title) return null;
  return videos.find((video) => normalize(video.title) === title)
    || videos.find((video) => {
      const vt = normalize(video.title);
      return vt.includes(title) && (!artist || vt.includes(artist));
    })
    || videos.find((video) => normalize(video.title).includes(title));
}

function visualFromVideo(video, activeTrack, source = "music_video") {
  if (!video) return null;
  const id = video.youtube_video_id || extractYouTubeId(video.youtube_url || video.url || video.video_url);
  return {
    ...video,
    kind: source,
    youtube_video_id: id,
    title: video.title || activeTrack?.title || "Upper Vibe Visual",
    artist_display: activeTrack?.artist_display || video.artist_display || "Upper Vibe Media",
    thumbnail_url: video.thumbnail_url || (id ? `https://img.youtube.com/vi/${id}/maxresdefault.jpg` : activeTrack?.cover_url),
    cover_url: activeTrack?.cover_url || video.cover_url || video.thumbnail_url,
    stableKey: `${source}:${id || video.title || activeTrack?.id || "default"}`,
    label: source === "manual_video" ? "SELECTED STAGE VIDEO" : "MUSIC VIDEO",
  };
}

export function resolveStageVisual({ activeTrack, stageVideos = [], manualVideo = null } = {}) {
  if (manualVideo) return visualFromVideo(manualVideo, activeTrack, "manual_video");

  const videoUrl = activeTrack?.youtube_url || activeTrack?.music_video_url || activeTrack?.video_url;
  const videoId = extractYouTubeId(videoUrl);
  if (videoId) {
    return {
      kind: "music_video",
      youtube_video_id: videoId,
      title: activeTrack?.title || "Upper Vibe Music Video",
      artist_display: activeTrack?.artist_display || "Upper Vibe Media",
      thumbnail_url: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
      cover_url: activeTrack?.cover_url,
      stableKey: `music_video:${activeTrack?.id || videoId}`,
      label: "MUSIC VIDEO",
      track: activeTrack,
    };
  }

  const matchedVideo = matchPlaylistVideo(activeTrack, stageVideos);
  if (matchedVideo) return visualFromVideo(matchedVideo, activeTrack, "music_video");

  const visualizerUrl = activeTrack?.visualizer_url || activeTrack?.visualizer_youtube_url;
  const visualizerId = extractYouTubeId(visualizerUrl);
  if (visualizerId || visualizerUrl) {
    return {
      kind: "visualizer",
      youtube_video_id: visualizerId,
      visual_url: visualizerUrl,
      title: activeTrack?.title || "Upper Vibe Visualizer",
      artist_display: activeTrack?.artist_display || "Upper Vibe Media",
      thumbnail_url: visualizerId ? `https://img.youtube.com/vi/${visualizerId}/maxresdefault.jpg` : activeTrack?.cover_url,
      cover_url: activeTrack?.cover_url,
      stableKey: `visualizer:${activeTrack?.id || visualizerId || visualizerUrl}`,
      label: "SONG VISUALIZER",
      track: activeTrack,
    };
  }

  const motionUrl = activeTrack?.motion_visual_url || activeTrack?.stage_visual_url || activeTrack?.animation_url;
  if (motionUrl) {
    return {
      kind: "motion_visual",
      visual_url: motionUrl,
      title: activeTrack?.title || "Upper Vibe Motion Visual",
      artist_display: activeTrack?.artist_display || "Upper Vibe Media",
      thumbnail_url: activeTrack?.cover_url,
      cover_url: activeTrack?.cover_url,
      stableKey: `motion:${activeTrack?.id || motionUrl}`,
      label: "MOTION VISUAL",
      track: activeTrack,
    };
  }

  if (activeTrack?.cover_url) {
    return {
      kind: "fallback_cover",
      title: activeTrack.title || "Upper Vibe Media",
      artist_display: activeTrack.artist_display || "Upper Vibe Media",
      thumbnail_url: activeTrack.cover_url,
      cover_url: activeTrack.cover_url,
      stableKey: `cover:${activeTrack?.id || activeTrack.cover_url}`,
      label: "AUDIO VISUAL FALLBACK",
      track: activeTrack,
    };
  }

  return {
    kind: "default",
    title: "Upper Vibe Media",
    artist_display: "Frequency Visual Stage",
    stableKey: "default:upper-vibe-media",
    label: "UPPER VIBE STAGE",
  };
}