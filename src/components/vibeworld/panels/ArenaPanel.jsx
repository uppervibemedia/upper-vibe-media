import React from "react";
import { Play, Pause, Sparkles } from "lucide-react";
import CoverImage from "@/components/shared/CoverImage";
import { useRadio } from "@/context/RadioContext";
import { usePlayer } from "@/context/PlayerContext";
import WorldTrackRow from "@/components/vibeworld/WorldTrackRow";

const ACCENT = "245,168,0";

export default function ArenaPanel({ onNeedLogin }) {
  const { allTracks, tracksLoaded } = useRadio();
  const { currentTrack, isPlaying, playTrack, togglePlay } = usePlayer();

  const featured = allTracks.filter((t) => t.is_featured);
  const headline = (featured.length ? featured : allTracks)[0];
  const rest = (featured.length ? featured : allTracks).slice(1, 12);

  if (!tracksLoaded) return <p className="text-xs text-white/40 text-center py-8">Loading the stage...</p>;
  if (!headline) return <p className="text-xs text-white/40 text-center py-8">No tracks on stage yet.</p>;

  const isCurrent = currentTrack?.id === headline.id;
  const playHeadline = () => isCurrent ? togglePlay() : playTrack(headline, "song");

  return (
    <div className="flex flex-col gap-5">
      <p className="text-sm text-white/55 text-center leading-relaxed">
        Take the main stage. Spotlight tracks, turned up loud.
      </p>

      {/* Headline act */}
      <div className="relative rounded-2xl overflow-hidden p-5 flex flex-col items-center gap-4"
        style={{ background: `rgba(${ACCENT},0.08)`, border: `1px solid rgba(${ACCENT},0.28)`, boxShadow: `0 0 40px rgba(${ACCENT},0.12)` }}>
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full"
          style={{ background: `rgba(${ACCENT},0.18)` }}>
          <Sparkles className="w-3 h-3" style={{ color: `rgb(${ACCENT})` }} />
          <span className="text-[9px] font-black tracking-[0.25em] uppercase" style={{ color: `rgb(${ACCENT})` }}>Headliner</span>
        </div>
        <div className="w-36 h-36 rounded-2xl overflow-hidden" style={{ boxShadow: `0 0 30px rgba(${ACCENT},0.25)` }}>
          <CoverImage src={headline.cover_url} alt={headline.title} className="w-full h-full" iconClassName="w-12 h-12" />
        </div>
        <div className="text-center">
          <p className="font-heading font-black text-lg text-white">{headline.title}</p>
          <p className="text-sm text-white/45">{headline.artist_display || headline.artist || "Upper Vibe Media"}</p>
        </div>
        <button onClick={playHeadline}
          className="flex items-center gap-2 px-7 py-3 rounded-full font-black text-sm tracking-wide transition-all hover:brightness-110 active:scale-95"
          style={{ background: `linear-gradient(135deg,rgb(${ACCENT}),#D4880A)`, color: "#000", boxShadow: `0 0 24px rgba(${ACCENT},0.4)` }}>
          {isCurrent && isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          {isCurrent && isPlaying ? "Pause" : "Play On Stage"}
        </button>
      </div>

      {/* Lineup */}
      {rest.length > 0 && (
        <div>
          <p className="text-[9px] font-black tracking-[0.25em] uppercase text-white/30 mb-2">Tonight's Lineup</p>
          <div className="flex flex-col gap-2">
            {rest.map((t) => (
              <WorldTrackRow key={t.id} track={t} accent={ACCENT} onNeedLogin={onNeedLogin} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}