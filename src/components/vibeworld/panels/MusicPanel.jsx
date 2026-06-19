import React, { useState, useEffect } from "react";
import { ChevronLeft, ListMusic, Music4 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useRadio } from "@/context/RadioContext";
import WorldTrackRow from "@/components/vibeworld/WorldTrackRow";

const ACCENT = "0,160,220";

export default function MusicPanel({ onNeedLogin }) {
  const { allTracks, tracksLoaded } = useRadio();
  const [tab, setTab] = useState("songs"); // songs | playlists
  const [playlists, setPlaylists] = useState([]);
  const [openPlaylist, setOpenPlaylist] = useState(null);

  useEffect(() => {
    base44.entities.Playlist.list("-created_date", 30).then(setPlaylists).catch(() => {});
  }, []);

  const playlistTracks = openPlaylist
    ? (openPlaylist.track_ids || []).map((id) => allTracks.find((t) => t.id === id)).filter(Boolean)
    : [];

  return (
    <div>
      {/* Tabs */}
      <div className="flex gap-2 mb-4">
        {[{ id: "songs", label: "Songs", icon: Music4 }, { id: "playlists", label: "Playlists", icon: ListMusic }].map((tb) => (
          <button key={tb.id}
            onClick={() => { setTab(tb.id); setOpenPlaylist(null); }}
            className="flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-black tracking-wide transition-all"
            style={tab === tb.id
              ? { background: `rgba(${ACCENT},0.15)`, border: `1px solid rgba(${ACCENT},0.4)`, color: `rgb(${ACCENT})` }
              : { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.5)" }}>
            <tb.icon className="w-3.5 h-3.5" /> {tb.label}
          </button>
        ))}
      </div>

      {!tracksLoaded && <p className="text-xs text-white/40 text-center py-8">Loading the music...</p>}

      {/* Songs */}
      {tracksLoaded && tab === "songs" && (
        <div className="flex flex-col gap-2">
          {allTracks.slice(0, 40).map((t) => (
            <WorldTrackRow key={t.id} track={t} accent={ACCENT} onNeedLogin={onNeedLogin} />
          ))}
        </div>
      )}

      {/* Playlists */}
      {tracksLoaded && tab === "playlists" && !openPlaylist && (
        <div className="flex flex-col gap-2">
          {playlists.length === 0 && <p className="text-xs text-white/40 text-center py-8">No playlists yet.</p>}
          {playlists.map((pl) => (
            <button key={pl.id} onClick={() => setOpenPlaylist(pl)}
              className="flex items-center gap-3 p-3 rounded-xl text-left transition-all hover:bg-white/5"
              style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
              <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ background: `rgba(${ACCENT},0.12)`, border: `1px solid rgba(${ACCENT},0.25)` }}>
                <ListMusic className="w-5 h-5" style={{ color: `rgb(${ACCENT})` }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-white truncate">{pl.name}</p>
                <p className="text-xs text-white/40">{(pl.track_ids || []).length} tracks</p>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Open playlist */}
      {tracksLoaded && tab === "playlists" && openPlaylist && (
        <div>
          <button onClick={() => setOpenPlaylist(null)}
            className="flex items-center gap-1.5 text-xs font-bold mb-3" style={{ color: `rgb(${ACCENT})` }}>
            <ChevronLeft className="w-4 h-4" /> All Playlists
          </button>
          <p className="font-heading font-black text-white mb-3">{openPlaylist.name}</p>
          <div className="flex flex-col gap-2">
            {playlistTracks.length === 0 && <p className="text-xs text-white/40 text-center py-6">No tracks in this playlist.</p>}
            {playlistTracks.map((t) => (
              <WorldTrackRow key={t.id} track={t} accent={ACCENT} onNeedLogin={onNeedLogin} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}