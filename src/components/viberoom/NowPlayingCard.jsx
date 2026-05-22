import React from "react";
import { Music2 } from "lucide-react";
import { usePlayer } from "@/context/PlayerContext";

export default function NowPlayingCard() {
  const { currentTrack, isPlaying } = usePlayer();

  return (
    <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl"
      style={{
        background: "rgba(0,200,220,0.04)",
        border: "1px solid rgba(0,200,220,0.1)",
      }}>
      {/* Label */}
      <span className="text-[9px] font-black tracking-[0.25em] uppercase flex-shrink-0"
        style={{ color: "rgba(0,200,220,0.5)" }}>
        Vibing To
      </span>

      {currentTrack ? (
        <>
          {/* Tiny animated bars */}
          <div className="flex items-end gap-[2px] flex-shrink-0">
            {[3, 5, 4, 6, 3].map((h, i) => (
              <div key={i} className="w-[2px] rounded-full"
                style={{
                  height: `${h}px`,
                  background: "#00E5FF",
                  opacity: isPlaying ? 0.7 : 0.25,
                  animation: isPlaying ? `vrBar${i} ${0.55 + i * 0.1}s ease-in-out infinite alternate` : "none",
                }} />
            ))}
          </div>
          <p className="text-xs text-white/70 truncate min-w-0 flex-1">
            <span className="font-semibold">{currentTrack.title}</span>
            <span className="text-white/35"> — {currentTrack.artist_display || "Upper Vibe Media"}</span>
          </p>
        </>
      ) : (
        <p className="text-xs text-white/25 italic truncate flex-1">Start music to vibe with the room</p>
      )}

      <style>{`
        @keyframes vrBar0 { from { height: 2px } to { height: 5px } }
        @keyframes vrBar1 { from { height: 2px } to { height: 7px } }
        @keyframes vrBar2 { from { height: 2px } to { height: 5px } }
        @keyframes vrBar3 { from { height: 3px } to { height: 8px } }
        @keyframes vrBar4 { from { height: 2px } to { height: 5px } }
      `}</style>
    </div>
  );
}