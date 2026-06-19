import React from "react";
import { Play, Pause } from "lucide-react";
import CoverImage from "@/components/shared/CoverImage";
import SaveHeartButton from "@/components/shared/SaveHeartButton";
import { usePlayer } from "@/context/PlayerContext";

/**
 * WorldTrackRow — compact track row used inside Vibe World holo panels.
 * Plays in the global player (keeps audio alive) and supports saving favorites.
 */
export default function WorldTrackRow({ track, accent = "0,160,220", onNeedLogin }) {
  const { currentTrack, isPlaying, playTrack, togglePlay } = usePlayer();
  const isCurrent = currentTrack?.id === track.id;

  const handlePlay = () => {
    if (isCurrent) togglePlay();
    else playTrack(track, "song");
  };

  return (
    <div className="flex items-center gap-3 p-2 rounded-xl transition-all"
      style={{ background: isCurrent ? `rgba(${accent},0.12)` : "rgba(255,255,255,0.03)", border: `1px solid ${isCurrent ? `rgba(${accent},0.3)` : "rgba(255,255,255,0.06)"}` }}>
      <button onClick={handlePlay} className="relative w-11 h-11 rounded-lg overflow-hidden flex-shrink-0 group">
        <CoverImage src={track.cover_url} alt={track.title} className="w-full h-full" />
        <div className="absolute inset-0 flex items-center justify-center transition-all"
          style={{ background: "rgba(0,0,0,0.4)" }}>
          {isCurrent && isPlaying
            ? <Pause className="w-4 h-4 text-white" />
            : <Play className="w-4 h-4 text-white" />}
        </div>
      </button>
      <button onClick={handlePlay} className="flex-1 min-w-0 text-left">
        <p className="text-sm font-bold truncate" style={{ color: isCurrent ? `rgb(${accent})` : "#fff" }}>{track.title}</p>
        <p className="text-xs truncate" style={{ color: "rgba(255,255,255,0.4)" }}>{track.artist_display || track.artist || "Upper Vibe Media"}</p>
      </button>
      <SaveHeartButton item={track} itemType="song" meta={{ title: track.title, artist: track.artist_display, cover_url: track.cover_url, audio_url: track.audio_url }} onNeedLogin={onNeedLogin} />
    </div>
  );
}