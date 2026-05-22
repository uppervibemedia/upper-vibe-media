import React from "react";
import { Waves, Music2 } from "lucide-react";
import { usePlayer } from "@/context/PlayerContext";

export default function NowPlayingCard() {
  const { currentTrack, isPlaying } = usePlayer();

  return (
    <div className="flex items-center gap-3 px-4 py-2.5 rounded-2xl"
      style={{
        background: "rgba(0,200,220,0.05)",
        border: "1px solid rgba(0,200,220,0.12)",
        backdropFilter: "blur(12px)",
      }}>
      {currentTrack ? (
        <>
          {/* Animated bars */}
          <div className="flex items-end gap-[2px] flex-shrink-0">
            {[4, 7, 5, 8, 4].map((h, i) => (
              <div
                key={i}
                className="w-[2px] rounded-full"
                style={{
                  height: `${h}px`,
                  background: "#00E5FF",
                  opacity: isPlaying ? 1 : 0.3,
                  animation: isPlaying ? `barBounce${i} ${0.6 + i * 0.1}s ease-in-out infinite alternate` : "none",
                  animationDelay: `${i * 0.08}s`,
                }}
              />
            ))}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[9px] font-black tracking-[0.25em] uppercase text-cyan-400/60 leading-none mb-0.5">Now Playing</p>
            <p className="text-xs font-bold text-white truncate">{currentTrack.title}</p>
            <p className="text-[10px] text-white/35 truncate">{currentTrack.artist_display || "Upper Vibe Media"}</p>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0 px-2 py-1 rounded-full"
            style={{ background: "rgba(0,229,255,0.08)", border: "1px solid rgba(0,229,255,0.15)" }}>
            <Waves className="w-2.5 h-2.5 text-cyan-400/70" />
            <span className="text-[9px] font-bold text-cyan-400/70">432 Hz</span>
          </div>
        </>
      ) : (
        <>
          <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
            style={{ background: "rgba(0,229,255,0.08)", border: "1px solid rgba(0,229,255,0.12)" }}>
            <Music2 className="w-3.5 h-3.5 text-white/20" />
          </div>
          <p className="text-xs text-white/30 italic">Start music to vibe with the room</p>
        </>
      )}

      <style>{`
        @keyframes barBounce0 { from { height: 2px } to { height: 7px } }
        @keyframes barBounce1 { from { height: 3px } to { height: 9px } }
        @keyframes barBounce2 { from { height: 2px } to { height: 6px } }
        @keyframes barBounce3 { from { height: 4px } to { height: 10px } }
        @keyframes barBounce4 { from { height: 2px } to { height: 7px } }
      `}</style>
    </div>
  );
}