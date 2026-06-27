import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowUp, ArrowDown, Trash2, Plus, Shuffle, ListOrdered, Save, CheckCheck,
  Search, Disc3, Music4, Mic2, AlertTriangle, Loader2, X
} from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import CoverImage from "@/components/shared/CoverImage";

/**
 * DJ Playlist Manager Admin component.
 * Admins build ordered/semi-ordered playlists for the Live DJ dance floor.
 */
export default function DJPlaylistManager({ tracks: allTracks = [] }) {
  const [playlists, setPlaylists] = useState([]);
  const [editing, setEditing] = useState(null); // the playlist being edited
  const [selectedPlaylistId, setSelectedPlaylistId] = useState(null);
  const [partnerSearch, setPartnerSearch] = useState("");
  const [partnerResults, setPartnerResults] = useState([]);
  const searchRef = useRef(null);

  // ── Load all DJ playlists ───────────────────────────────────────────────
  const loadPlaylists = useCallback(async () => {
    try {
      const records = await base44.entities.DJPlaylist.list("-updatedAt", 30);
      setPlaylists(records);
      return records;
    } catch (e) {
      toast.error("Failed to load DJ playlists");
      return [];
    }
  }, []);

  useEffect(() => { loadPlaylists(); }, []);

  // ── Search tracks to add ───────────────────────────────────────────────
  useEffect(() => {
    if (!partnerSearch || !editing) {
      setPartnerResults([]);
      return;
    }
    const q = partnerSearch.toLowerCase();
    const published = allTracks.filter(t => t.status === "published");
    const results = published
      .filter(t =>
        (t.title || "").toLowerCase().includes(q) ||
        (t.artist_display || "").toLowerCase().includes(q)
      )
      .slice(0, 20);
    setPartnerResults(results);
  }, [partnerSearch, allTracks, editing]);

  // ── Create new empty playlist ──────────────────────────────────────────
  const handleCreate = async () => {
    const name = prompt("Name the new DJ playlist:");
    if (!name || !name.trim()) return;
    try {
      const rec = await base44.entities.DJPlaylist.create({
        djPlaylistName: name.trim(),
        trackIds: [],
        playMode: "shuffle",
        isActive: false,
        updatedAt: new Date().toISOString(),
      });
      toast.success(`Created "${name}"`);
      const updated = await loadPlaylists();
      setEditing(rec.id);
      setSelectedPlaylistId(rec.id);
      setPartnerSearch("");
    } catch {
      toast.error("Failed to create playlist");
    }
  };

  // ── Save current playlist ──────────────────────────────────────────────
  const savePlaylist = async () => {
    const pl = playlists.find(p => p.id === editing);
    if (!pl) return;
    try {
      await base44.entities.DJPlaylist.update(pl.id, {
        trackIds: pl.trackIds,
        playMode: pl.playMode,
        updatedAt: new Date().toISOString(),
      });
      toast.success("Playlist saved");
      await loadPlaylists();
    } catch {
      toast.error("Failed to save playlist");
    }
  };

  // ── Set active / deactivate ────────────────────────────────────────────
  const setActive = async (id) => {
    const pl = playlists.find(p => p.id === id);
    if (!pl) return;
    const becomesActive = !pl.isActive;
    const tasks = playlists.map(p => {
      const nextActive = p.id === id ? becomesActive : false;
      return nextActive !== p.isActive
        ? base44.entities.DJPlaylist.update(p.id, { isActive: nextActive })
        : Promise.resolve();
    });
    await Promise.all(tasks);
    await loadPlaylists();
    toast.success(becomesActive ? "This playlist is now active on the dance floor" : "Playlist deactivated");
  };

  // ── Move track in list ─────────────────────────────────────────────────
  const moveTrack = async (from, to) => {
    const pl = playlists.find(p => p.id === editing);
    if (!pl) return;
    const ids = [...pl.trackIds];
    if (to < 0 || to >= ids.length) return;
    [ids[from], ids[to]] = [ids[to], ids[from]];
    const updated = playlists.map(p => p.id === editing ? { ...pl, trackIds: ids } : p);
    setPlaylists(updated);
  };

  // ── Remove track ───────────────────────────────────────────────────────
  const removeTrack = async (idx) => {
    const pl = playlists.find(p => p.id === editing);
    if (!pl) return;
    const ids = pl.trackIds.filter((_, i) => i !== idx);
    const updated = playlists.map(p => p.id === editing ? { ...pl, trackIds: ids } : p);
    setPlaylists(updated);
  };

  // ── Add track ──────────────────────────────────────────────────────────
  const addTrack = async (trackId) => {
    const pl = playlists.find(p => p.id === editing);
    if (!pl) return;
    if (pl.trackIds.includes(trackId)) return;
    const ids = [...pl.trackIds, trackId];
    const updated = playlists.map(p => p.id === editing ? { ...pl, trackIds: ids } : p);
    setPlaylists(updated);
    setPartnerSearch("");
  };

  // ── Clear editing ──────────────────────────────────────────────────────
  const clearEditing = () => {
    setEditing(null);
    setSelectedPlaylistId(null);
    setPartnerSearch("");
    loadPlaylists();
  };

  // ── Helper to get track data ───────────────────────────────────────────
  const getTrack = (id) => allTracks.find(t => t.id === id);

  // ── Remove all tracks ──────────────────────────────────────────────────
  const clearAllTracks = async () => {
    const pl = playlists.find(p => p.id === editing);
    if (!pl || !confirm(`Remove all tracks from "${pl.djPlaylistName}"?`)) return;
    const updated = playlists.map(p => p.id === editing ? { ...pl, trackIds: [] } : p);
    setPlaylists(updated);
    toast.success("Cleared all tracks");
  };

  // ── Toggle shuffle ────────────────────────────────────────────────────
  const togglePlayMode = () => {
    const pl = playlists.find(p => p.id === editing);
    if (!pl) return;
    const next = pl.playMode === "shuffle" ? "ordered" : "shuffle";
    const updated = playlists.map(p => p.id === editing ? { ...pl, playMode: next } : p);
    setPlaylists(updated);
  };

  const editingPlaylist = playlists.find(p => p.id === editing);

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-2.5">
            <Disc3 className="w-5 h-5 text-cyan-400" />
            <h2 className="font-heading font-bold text-xl">Live DJ Playlist</h2>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Build the playlist that plays on the dance floor. Choose songs from the music library, order them, and set one as active.
          </p>
        </div>
        <button
          onClick={handleCreate}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold tracking-wide transition-all hover:brightness-110"
          style={{ background: "linear-gradient(135deg,#00B8D4,#00E5FF)", color: "#000" }}
        >
          <Plus className="w-4 h-4" /> New Playlist
        </button>
      </div>

      {/* Playlist list */}
      <div className="grid md:grid-cols-3 gap-4">
        {/* Sidebar: choose playlist */}
        <div className="md:col-span-1 rounded-xl border border-border/30 p-3 space-y-2 bg-card/20">
          {playlists.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">No DJ playlists yet. Create one to have music on the dance floor.</p>
          )}
          {playlists.map(pl => (
            <button
              key={pl.id}
              onClick={() => { setEditing(pl.id); setSelectedPlaylistId(pl.id); setPartnerSearch(""); }}
              className={`w-full text-left p-3 rounded-lg transition-all flex items-center gap-3 border ${
                editing === pl.id ? "bg-primary/15 border-primary/40" : "border-transparent hover:bg-card/30 hover:border-border/30"
              }`}
            >
              <Disc3 className={`w-4 h-4 flex-shrink-0 ${pl.isActive ? "text-cyan-400" : "text-muted-foreground/50"}`} />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-foreground truncate">{pl.djPlaylistName}</p>
                <p className="text-[10px] text-muted-foreground">
                  {(pl.trackIds || []).length} track{(pl.trackIds || []).length !== 1 ? "s" : ""}
                  {pl.playMode === "ordered" ? " · Ordered" : " · Shuffle"}
                </p>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); setActive(pl.id); }}
                className={`p-1.5 rounded-lg text-xs font-bold transition-all ${
                  pl.isActive ? "bg-cyan-400/20 text-cyan-400" : "text-muted-foreground hover:text-cyan-400"
                }`}
              >
                {pl.isActive ? "LIVE" : "Set Active"}
              </button>
            </button>
          ))}
        </div>

        {/* Editor */}
        <div className="md:col-span-2 rounded-xl border border-border/30 bg-card/20 p-4">
          {!editing ? (
            <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
              <Disc3 className="w-10 h-10 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">Select a playlist to edit, or create a new one.</p>
            </div>
          ) : !editingPlaylist ? (
            <div className="py-16 text-center"><p className="text-sm text-muted-foreground">Playlist not found.</p></div>
          ) : (
            <>
              {/* Editor header */}
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                  <input
                    type="text"
                    value={editingPlaylist.djPlaylistName}
                    onChange={async (e) => {
                      const val = e.target.value;
                      const updated = playlists.map(p => p.id === editing ? { ...p, djPlaylistName: val } : p);
                      setPlaylists(updated);
                    }}
                    style={{ background: "rgba(0,229,255,0.08)", border: "1px solid rgba(0,229,255,0.2)" }}
                    className="px-3 py-2 rounded-lg text-sm font-heading font-bold text-foreground focus:outline-none focus:border-primary/50"
                  />
                  <p className="text-xs text-muted-foreground">{editingPlaylist.trackIds.length} track{editingPlaylist.trackIds.length !== 1 ? "s" : ""}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={clearAllTracks}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold text-destructive hover:bg-destructive/10 border border-destructive/20 transition-all"
                  >
                    Clear All
                  </button>
                  <button
                    onClick={togglePlayMode}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                      editingPlaylist.playMode === "shuffle"
                        ? "bg-primary/15 border-primary/40 text-primary"
                        : "text-muted-foreground hover:text-foreground border-border/30"
                    }`}
                  >
                    {editingPlaylist.playMode === "shuffle" ? <Shuffle className="w-3.5 h-3.5" /> : <ListOrdered className="w-3.5 h-3.5" />}
                    {editingPlaylist.playMode === "shuffle" ? "Shuffle" : "Ordered"}
                  </button>
                  <button
                    onClick={savePlaylist}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-all"
                  >
                    <Save className="w-3.5 h-3.5" /> Save
                  </button>
                </div>
              </div>

              {/* Add song — search + browseable list */}
              <div className="mb-4">
                <div className="relative mb-2">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Filter songs to add..."
                    value={partnerSearch}
                    onChange={(e) => setPartnerSearch(e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 rounded-lg bg-card/40 border border-border/30 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50"
                  />
                </div>
                {/* Always-visible browseable track list */}
                <div className="max-h-44 overflow-y-auto rounded-xl border border-border/20 bg-card/10">
                  {(partnerSearch
                    ? allTracks.filter(t => t.status === "published" && (
                        (t.title || "").toLowerCase().includes(partnerSearch.toLowerCase()) ||
                        (t.artist_display || "").toLowerCase().includes(partnerSearch.toLowerCase())
                      ))
                    : allTracks.filter(t => t.status === "published")
                  ).map(t => {
                    const inList = editingPlaylist.trackIds.includes(t.id);
                    return (
                      <button
                        key={t.id}
                        onClick={() => inList ? null : addTrack(t.id)}
                        className={`w-full flex items-center gap-2.5 px-3 py-2 text-left transition-all border-b border-border/10 last:border-0 ${
                          inList ? "bg-primary/8 opacity-50 cursor-default" : "hover:bg-muted/40"
                        }`}
                      >
                        <CoverImage src={t.cover_url} alt="" width={28} height={28}
                          className="w-7 h-7 rounded object-cover flex-shrink-0"
                          iconClassName="w-3 h-3" fallbackOpacityClass="text-muted-foreground/40" />
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-semibold text-foreground truncate">{t.title}</p>
                          <p className="text-[9px] text-muted-foreground truncate">{t.artist_display || "Upper Vibe Media"}</p>
                        </div>
                        {inList
                          ? <CheckCheck className="w-4 h-4 text-primary flex-shrink-0" />
                          : <Plus className="w-4 h-4 text-muted-foreground/40 flex-shrink-0" />}
                      </button>
                    );
                  })}
                  {allTracks.filter(t => t.status === "published").length === 0 && (
                    <p className="text-xs text-muted-foreground text-center py-4">No published tracks available.</p>
                  )}
                </div>
              </div>

              {/* Playing indicator */}
              {editingPlaylist.isActive && (
                <div className="flex items-center gap-2 mb-3 px-3 py-2 rounded-lg"
                  style={{ background: "rgba(0,229,255,0.06)", border: "1px solid rgba(0,229,255,0.15)" }}>
                  <div className="w-2 h-2 rounded-full bg-cyan-400 animate-mic-pulse" />
                  <span className="text-xs font-bold text-cyan-400">This playlist is currently LIVE on the dance floor</span>
                </div>
              )}

              {/* Track list */}
              {editingPlaylist.trackIds.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground text-sm">No tracks yet. Search above to add songs.</div>
              ) : (
                <div className="space-y-2 max-h-[500px] overflow-y-auto">
                  <AnimatePresence>
                    {editingPlaylist.trackIds.map((trackId, idx) => {
                      const track = getTrack(trackId);
                      return (
                        <motion.div
                          key={trackId + "-" + idx}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg bg-card/30 border border-border/20"
                        >
                          <span className="text-[10px] text-muted-foreground w-5 text-center font-mono">{idx + 1}</span>
                          {track && (
                            <CoverImage src={track.cover_url} alt="" width={32} height={32}
                              className="w-8 h-8 rounded object-cover flex-shrink-0"
                              iconClassName="w-3 h-3" fallbackOpacityClass="text-muted-foreground/40" />
                          )}
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold text-foreground truncate">{track?.title || "Track not found"}</p>
                            <p className="text-[10px] text-muted-foreground truncate">{track?.artist_display || "Upper Vibe Media"}{track?.duration ? ` · ${track.duration}` : ""}</p>
                          </div>
                          <div className="flex items-center gap-1 flex-shrink-0">
                            <button
                              onClick={() => moveTrack(idx, idx - 1)}
                              disabled={idx === 0}
                              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground disabled:opacity-20 transition-all"
                            >
                              <ArrowUp className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => moveTrack(idx, idx + 1)}
                              disabled={idx === editingPlaylist.trackIds.length - 1}
                              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground disabled:opacity-20 transition-all"
                            >
                              <ArrowDown className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => removeTrack(idx)}
                              className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive transition-all"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}