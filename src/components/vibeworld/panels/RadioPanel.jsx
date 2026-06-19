import React from "react";
import { Play, Pause, SkipForward, SkipBack, Radio } from "lucide-react";
import CoverImage from "@/components/shared/CoverImage";
import { useRadio } from "@/context/RadioContext";
import { usePlayer } from "@/context/PlayerContext";

const ACCENT = "155,126,255";

export default function RadioPanel() {
  const { currentRadioSong, startRadio, resumeRadio, nextRadioSong, prevRadioSong, upNext, isRadioMode, hasPrev } = useRadio();
  const { isPlaying, togglePlay, currentTrack } = usePlayer();

  const liveTrack = isRadioMode ? currentTrack : currentRadioSong;
  const radioPlaying = isRadioMode && isPlaying;

  const handleMain = () => {
    if (isRadioMode) togglePlay();
    else if (currentRadioSong) resumeRadio();
    else startRadio();
  };

  return (
    <div className="flex flex-col items-center gap-5">
      {/* Now playing on radio */}
      <div className="w-40 h-40 rounded-2xl overflow-hidden relative"
        style={{ border: `1px solid rgba(${ACCENT},0.3)`, boxShadow: `0 0 40px rgba(${ACCENT},0.2)` }}>
        <CoverImage src={liveTrack?.cover_url} alt={liveTrack?.title || "Radio"} className="w-full h-full" iconClassName="w-12 h-12" />
        {radioPlaying && (
          <div className="absolute bottom-2 left-2 flex items-center gap-1 px-2 py-1 rounded-full"
            style={{ background: "rgba(0,0,0,0.6)" }}>
            <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: `rgb(${ACCENT})` }} />
            <span className="text-[9px] font-black tracking-widest uppercase text-white">Live</span>
          </div>
        )}
      </div>

      <div className="text-center">
        <p className="text-[10px] font-black tracking-[0.25em] uppercase mb-1" style={{ color: `rgb(${ACCENT})` }}>
          Upper Vibe Radio
        </p>
        <p className="font-heading font-black text-lg text-white">{liveTrack?.title || "Tap play to start"}</p>
        <p className="text-sm text-white/45">{liveTrack?.artist_display || liveTrack?.artist || "Continuous 432 Hz"}</p>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-5">
        <button onClick={() => prevRadioSong()} disabled={!isRadioMode || !hasPrev}
          className="w-11 h-11 rounded-full flex items-center justify-center transition-all disabled:opacity-30"
          style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", color: "#fff" }}>
          <SkipBack className="w-5 h-5" />
        </button>
        <button onClick={handleMain}
          className="w-16 h-16 rounded-full flex items-center justify-center transition-all hover:brightness-110 active:scale-95"
          style={{ background: `linear-gradient(135deg,rgb(${ACCENT}),#7C3AED)`, boxShadow: `0 0 30px rgba(${ACCENT},0.5)`, color: "#fff" }}>
          {radioPlaying ? <Pause className="w-7 h-7" /> : <Play className="w-7 h-7 ml-0.5" />}
        </button>
        <button onClick={() => nextRadioSong()} disabled={!isRadioMode}
          className="w-11 h-11 rounded-full flex items-center justify-center transition-all disabled:opacity-30"
          style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", color: "#fff" }}>
          <SkipForward className="w-5 h-5" />
        </button>
      </div>

      {/* Up next */}
      {upNext?.length > 0 && (
        <div className="w-full">
          <p className="text-[9px] font-black tracking-[0.25em] uppercase text-white/30 mb-2 flex items-center gap-1.5">
            <Radio className="w-3 h-3" /> Up Next
          </p>
          <div className="flex flex-col gap-2">
            {upNext.map((t) => (
              <div key={t.id} className="flex items-center gap-3 p-2 rounded-xl"
                style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                <div className="w-9 h-9 rounded-lg overflow-hidden flex-shrink-0">
                  <CoverImage src={t.cover_url} alt={t.title} className="w-full h-full" iconClassName="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-white truncate">{t.title}</p>
                  <p className="text-[10px] text-white/40 truncate">{t.artist_display || t.artist || "Upper Vibe Media"}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}