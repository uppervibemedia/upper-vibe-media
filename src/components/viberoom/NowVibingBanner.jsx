import React from "react";
import { Music2 } from "lucide-react";
import { usePlayer } from "@/context/PlayerContext";

export default function NowVibingBanner() {
  const { currentTrack, isPlaying } = usePlayer();

  return (
    <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl"
      style={{
        background: "rgba(0,200,220,0.04)",
        border: "1px solid rgba(0,200,220,0.1)",
      }}>
      <span className="text-[9px] font-black tracking-[0.25em] uppercase flex-shrink-0"
        style={{ color: "rgba(0,200,220,0.5)" }}>
        You're Vibing To
      </span>

      {currentTrack ? (
        <>
          <div className="flex items-end gap-[2px] flex-shrink-0">
            {[3, 5, 4, 6, 3].map((h, i) => (
              <div key={i} className="w-[2px] rounded-full"
                style={{
                  height: `${h}px`,
                  background: "#00E5FF",
                  opacity: isPlaying ? 0.7 : 0.25,
                  animation: isPlaying ? `vrB${i} ${0.55 + i * 0.1}s ease-in-out infinite alternate` : "none",
                }} />
            ))}
          </div>
          <p className="text-xs text-foreground/70 truncate min-w-0 flex-1">
            <span className="font-semibold">{currentTrack.title}</span>
            <span className="text-muted-foreground/50"> — {currentTrack.artist_display || "Upper Vibe Media"}</span>
          </p>
        </>
      ) : (
        <p className="text-xs text-muted-foreground/40 italic truncate flex-1">
          Start music to share your vibe
        </p>
      )}

      <style>{`
        @keyframes vrB0 { from { height: 2px } to { height: 5px } }
        @keyframes vrB1 { from { height: 2px } to { height: 7px } }
        @keyframes vrB2 { from { height: 2px } to { height: 5px } }
        @keyframes vrB3 { from { height: 3px } to { height: 8px } }
        @keyframes vrB4 { from { height: 2px } to { height: 5px } }
      `}</style>
    </div>
  );
}