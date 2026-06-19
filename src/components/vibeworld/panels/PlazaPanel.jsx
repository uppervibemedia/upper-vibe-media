import React, { useState, useEffect } from "react";
import { Play, Pause, Users, Music4, Radio, Sparkles, Flower2, Mic2 } from "lucide-react";
import CoverImage from "@/components/shared/CoverImage";
import { usePlayer } from "@/context/PlayerContext";
import { base44 } from "@/api/base44Client";

const ACCENT = "0,160,220";

const QUICK = [
  { id: "music",   label: "Music District",   icon: Music4,  color: "0,160,220" },
  { id: "radio",   label: "Radio Tower",      icon: Radio,   color: "155,126,255" },
  { id: "temple",  label: "Vibe Check Temple",icon: Sparkles,color: "236,72,153" },
  { id: "gardens", label: "Manifestation Gardens", icon: Flower2, color: "52,211,153" },
  { id: "arena",   label: "Concert Arena",    icon: Mic2,    color: "245,168,0" },
];

export default function PlazaPanel({ onNavigate }) {
  const { currentTrack, isPlaying, togglePlay } = usePlayer();
  const [listeners, setListeners] = useState(null);

  // Try to read live presence (works for admins; non-admins fall back to a vibe count)
  useEffect(() => {
    let mounted = true;
    base44.entities.LivePresence.list("-last_seen", 200)
      .then((recs) => {
        if (!mounted) return;
        const cutoff = Date.now() - 35_000;
        const active = recs.filter((r) => !r.is_admin && r.last_seen && new Date(r.last_seen).getTime() > cutoff);
        setListeners(active.length);
      })
      .catch(() => { if (mounted) setListeners(null); });
    return () => { mounted = false; };
  }, []);

  return (
    <div className="flex flex-col gap-5">
      {/* Welcome */}
      <div className="text-center">
        <p className="text-sm text-white/55 leading-relaxed">
          Welcome to <span className="font-bold text-white">Upper Vibe City</span>. Wander the districts, keep the music flowing, and stay a while.
        </p>
      </div>

      {/* Now playing */}
      <div className="flex items-center gap-3 p-3 rounded-2xl"
        style={{ background: `rgba(${ACCENT},0.07)`, border: `1px solid rgba(${ACCENT},0.2)` }}>
        <div className="w-14 h-14 rounded-xl overflow-hidden flex-shrink-0">
          <CoverImage src={currentTrack?.cover_url} alt={currentTrack?.title || "Nothing playing"} className="w-full h-full" iconClassName="w-6 h-6" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[9px] font-black tracking-[0.25em] uppercase mb-0.5" style={{ color: `rgb(${ACCENT})` }}>Now Playing</p>
          <p className="text-sm font-bold text-white truncate">{currentTrack?.title || "Nothing playing yet"}</p>
          <p className="text-xs text-white/40 truncate">{currentTrack?.artist_display || currentTrack?.artist || "Visit the Music District"}</p>
        </div>
        {currentTrack && (
          <button onClick={togglePlay}
            className="w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0"
            style={{ background: `rgb(${ACCENT})`, color: "#000" }}>
            {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
          </button>
        )}
      </div>

      {/* Live listeners */}
      <div className="flex items-center justify-center gap-2.5 py-3 rounded-2xl"
        style={{ background: "rgba(52,211,153,0.06)", border: "1px solid rgba(52,211,153,0.18)" }}>
        <span className="relative flex h-2.5 w-2.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-60" style={{ background: "#34D399" }} />
          <span className="relative inline-flex rounded-full h-2.5 w-2.5" style={{ background: "#34D399" }} />
        </span>
        <Users className="w-4 h-4" style={{ color: "#34D399" }} />
        <span className="text-sm font-bold text-white">
          {listeners != null && listeners > 0
            ? `${listeners} ${listeners === 1 ? "soul" : "souls"} vibing now`
            : "You're vibing live"}
        </span>
      </div>

      {/* Quick travel */}
      <div>
        <p className="text-[9px] font-black tracking-[0.25em] uppercase text-white/30 mb-2">Travel The City</p>
        <div className="grid grid-cols-1 gap-2">
          {QUICK.map((q) => (
            <button key={q.id} onClick={() => onNavigate(q.id)}
              className="flex items-center gap-3 p-3 rounded-xl text-left transition-all hover:bg-white/5"
              style={{ background: `rgba(${q.color},0.06)`, border: `1px solid rgba(${q.color},0.2)` }}>
              <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ background: `rgba(${q.color},0.14)`, color: `rgb(${q.color})` }}>
                <q.icon className="w-4 h-4" />
              </div>
              <span className="text-sm font-bold text-white">{q.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}