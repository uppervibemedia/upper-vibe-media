import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckSquare, Square, Trash2, Download, Lock, Unlock, Tag, Users, Waves,
  Edit2, Search, Filter, X, Star, Eye, EyeOff, ChevronDown, Music4
} from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

const FREQUENCY_OPTIONS = ["standard", "432hz", "528hz", "binaural", "other"];
const MOOD_OPTIONS = ["motivation", "focus", "healing", "confidence", "money", "night", "driving", "meditation", "love", "spiritual"];
const TIER_OPTIONS = ["free", "supporter", "premium"];

export default function MusicManager({ tracks, categories, artists, onEdit, onRefresh }) {
  const [selected, setSelected] = useState(new Set());
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterFrequency, setFilterFrequency] = useState("all");
  const [filterTier, setFilterTier] = useState("all");
  const [filterDownloadable, setFilterDownloadable] = useState("all");
  const [bulkPanel, setBulkPanel] = useState(null); // null | 'category' | 'artist' | 'frequency' | 'mood' | 'tier' | 'downloadable'
  const [bulkValue, setBulkValue] = useState("");

  // Category map
  const catMap = useMemo(() => Object.fromEntries(categories.map((c) => [c.id, c.name])), [categories]);
  const artistMap = useMemo(() => Object.fromEntries(artists.map((a) => [a.id, a.name])), [artists]);

  const filtered = useMemo(() => {
    return tracks.filter((t) => {
      const q = search.toLowerCase();
      const matchSearch = !search || (t.title || "").toLowerCase().includes(q) || (t.artist_display || "").toLowerCase().includes(q);
      const matchCat = filterCategory === "all" || (t.category_ids || []).includes(filterCategory);
      const matchFreq = filterFrequency === "all" || t.frequency_type === filterFrequency;
      const matchTier = filterTier === "all" || (t.tier_access || ["free"]).includes(filterTier);
      const matchDl = filterDownloadable === "all" || (filterDownloadable === "yes" ? t.is_downloadable : !t.is_downloadable);
      return matchSearch && matchCat && matchFreq && matchTier && matchDl;
    });
  }, [tracks, search, filterCategory, filterFrequency, filterTier, filterDownloadable]);

  const toggleSelect = (id) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === filtered.length) setSelected(new Set());
    else setSelected(new Set(filtered.map((t) => t.id)));
  };

  const selectedTracks = filtered.filter((t) => selected.has(t.id));
  const selCount = selected.size;

  const applyBulk = async () => {
    if (!selCount || !bulkValue) return;
    const ids = [...selected];
    let updates = {};

    if (bulkPanel === "category") {
      // Add category to category_ids
      for (const id of ids) {
        const track = tracks.find((t) => t.id === id);
        const existing = track?.category_ids || [];
        const next = existing.includes(bulkValue) ? existing : [...existing, bulkValue];
        await base44.entities.Track.update(id, { category_ids: next });
      }
      toast.success(`Assigned category to ${selCount} tracks`);
    } else if (bulkPanel === "artist") {
      updates = { primary_artist_id: bulkValue, artist_display: artistMap[bulkValue] || "" };
      await Promise.all(ids.map((id) => base44.entities.Track.update(id, updates)));
      toast.success(`Assigned artist to ${selCount} tracks`);
    } else if (bulkPanel === "frequency") {
      updates = { frequency_type: bulkValue };
      await Promise.all(ids.map((id) => base44.entities.Track.update(id, updates)));
      toast.success(`Set frequency to ${bulkValue} for ${selCount} tracks`);
    } else if (bulkPanel === "mood") {
      for (const id of ids) {
        const track = tracks.find((t) => t.id === id);
        const existing = track?.description || "";
        await base44.entities.Track.update(id, { description: existing });
      }
      toast.success(`Mood tags noted (store in description for now)`);
    } else if (bulkPanel === "tier") {
      updates = { tier_access: [bulkValue], is_premium: bulkValue !== "free", min_tier: bulkValue };
      await Promise.all(ids.map((id) => base44.entities.Track.update(id, updates)));
      toast.success(`Set tier to ${bulkValue} for ${selCount} tracks`);
    } else if (bulkPanel === "downloadable") {
      updates = { is_downloadable: bulkValue === "yes" };
      await Promise.all(ids.map((id) => base44.entities.Track.update(id, updates)));
      toast.success(`Marked ${selCount} tracks as ${bulkValue === "yes" ? "downloadable" : "not downloadable"}`);
    }

    setSelected(new Set());
    setBulkPanel(null);
    setBulkValue("");
    onRefresh();
  };

  const bulkDelete = async () => {
    if (!selCount) return;
    if (!confirm(`Delete ${selCount} selected track(s)?`)) return;
    await Promise.all([...selected].map((id) => base44.entities.Track.delete(id)));
    toast.success(`Deleted ${selCount} tracks`);
    setSelected(new Set());
    onRefresh();
  };

  const toggleStatus = async (track) => {
    const next = track.status === "published" ? "archived" : "published";
    await base44.entities.Track.update(track.id, { status: next });
    toast.success(`Track ${next}`);
    onRefresh();
  };

  const toggleFeatured = async (track) => {
    await base44.entities.Track.update(track.id, { is_featured: !track.is_featured });
    toast.success(track.is_featured ? "Removed from featured" : "Marked as featured");
    onRefresh();
  };

  const deleteTrack = async (track) => {
    if (!confirm(`Delete "${track.title}"?`)) return;
    await base44.entities.Track.delete(track.id);
    toast.success("Track deleted");
    onRefresh();
  };

  return (
    <div>
      {/* Filters bar */}
      <div className="flex flex-wrap gap-3 mb-4">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search title or artist..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-lg bg-card/40 border border-border/30 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/40"
          />
        </div>
        <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}
          className="px-3 py-2 rounded-lg bg-card/40 border border-border/30 text-sm text-foreground focus:outline-none">
          <option value="all">All Categories</option>
          {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select value={filterFrequency} onChange={(e) => setFilterFrequency(e.target.value)}
          className="px-3 py-2 rounded-lg bg-card/40 border border-border/30 text-sm text-foreground focus:outline-none">
          <option value="all">All Frequencies</option>
          {FREQUENCY_OPTIONS.map((f) => <option key={f} value={f}>{f}</option>)}
        </select>
        <select value={filterTier} onChange={(e) => setFilterTier(e.target.value)}
          className="px-3 py-2 rounded-lg bg-card/40 border border-border/30 text-sm text-foreground focus:outline-none">
          <option value="all">All Tiers</option>
          {TIER_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        <select value={filterDownloadable} onChange={(e) => setFilterDownloadable(e.target.value)}
          className="px-3 py-2 rounded-lg bg-card/40 border border-border/30 text-sm text-foreground focus:outline-none">
          <option value="all">All Downloads</option>
          <option value="yes">Downloadable</option>
          <option value="no">Not Downloadable</option>
        </select>
      </div>

      {/* Selection bar */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <button onClick={toggleAll} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
            {selected.size === filtered.length && filtered.length > 0
              ? <CheckSquare className="w-4 h-4 text-primary" />
              : <Square className="w-4 h-4" />}
            {selCount > 0 ? `${selCount} selected` : `Select all (${filtered.length})`}
          </button>
          {selCount > 0 && (
            <button onClick={() => setSelected(new Set())} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
              <X className="w-3 h-3" /> Clear
            </button>
          )}
        </div>
        <p className="text-xs text-muted-foreground">{filtered.length} track{filtered.length !== 1 ? "s" : ""}</p>
      </div>

      {/* Bulk action toolbar */}
      <AnimatePresence>
        {selCount > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden mb-4"
          >
            <div className="p-4 rounded-xl border flex flex-wrap gap-2 items-center mb-2"
              style={{ background: "rgba(0,229,255,0.05)", border: "1px solid rgba(0,229,255,0.15)" }}>
              <span className="text-xs font-bold text-cyan-400 mr-2">{selCount} selected:</span>
              {[
                { key: "category", icon: Tag, label: "Set Category" },
                { key: "artist", icon: Users, label: "Set Artist" },
                { key: "frequency", icon: Waves, label: "Set Frequency" },
                { key: "tier", icon: Lock, label: "Set Tier" },
                { key: "downloadable", icon: Download, label: "Set Downloadable" },
              ].map((action) => (
                <button
                  key={action.key}
                  onClick={() => { setBulkPanel(bulkPanel === action.key ? null : action.key); setBulkValue(""); }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${bulkPanel === action.key ? "bg-primary/20 border-primary/40 text-primary" : "bg-card/40 border-border/30 text-muted-foreground hover:text-foreground"}`}
                >
                  <action.icon className="w-3.5 h-3.5" /> {action.label}
                </button>
              ))}
              <button
                onClick={bulkDelete}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-destructive/10 border border-destructive/30 text-destructive hover:bg-destructive/20 transition-all ml-auto"
              >
                <Trash2 className="w-3.5 h-3.5" /> Delete Selected
              </button>
            </div>

            {/* Bulk value picker */}
            {bulkPanel && (
              <div className="flex items-center gap-3 p-3 rounded-xl bg-card/40 border border-border/30 mb-2">
                {bulkPanel === "category" && (
                  <select value={bulkValue} onChange={(e) => setBulkValue(e.target.value)}
                    className="flex-1 px-3 py-2 rounded-lg bg-card/40 border border-border/30 text-sm text-foreground focus:outline-none">
                    <option value="">Select category...</option>
                    {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                )}
                {bulkPanel === "artist" && (
                  <select value={bulkValue} onChange={(e) => setBulkValue(e.target.value)}
                    className="flex-1 px-3 py-2 rounded-lg bg-card/40 border border-border/30 text-sm text-foreground focus:outline-none">
                    <option value="">Select artist...</option>
                    {artists.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                  </select>
                )}
                {bulkPanel === "frequency" && (
                  <select value={bulkValue} onChange={(e) => setBulkValue(e.target.value)}
                    className="flex-1 px-3 py-2 rounded-lg bg-card/40 border border-border/30 text-sm text-foreground focus:outline-none">
                    <option value="">Select frequency...</option>
                    {FREQUENCY_OPTIONS.map((f) => <option key={f} value={f}>{f}</option>)}
                  </select>
                )}
                {bulkPanel === "tier" && (
                  <select value={bulkValue} onChange={(e) => setBulkValue(e.target.value)}
                    className="flex-1 px-3 py-2 rounded-lg bg-card/40 border border-border/30 text-sm text-foreground focus:outline-none">
                    <option value="">Select tier...</option>
                    {TIER_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                )}
                {bulkPanel === "downloadable" && (
                  <select value={bulkValue} onChange={(e) => setBulkValue(e.target.value)}
                    className="flex-1 px-3 py-2 rounded-lg bg-card/40 border border-border/30 text-sm text-foreground focus:outline-none">
                    <option value="">Select...</option>
                    <option value="yes">Yes — Downloadable</option>
                    <option value="no">No — Not Downloadable</option>
                  </select>
                )}
                <button
                  onClick={applyBulk}
                  disabled={!bulkValue}
                  className="px-5 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-40 hover:bg-primary/90 transition-all"
                >
                  Apply to {selCount}
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Track table */}
      <div className="rounded-xl border border-border/30 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/30 bg-muted/20">
                <th className="px-3 py-3 w-8"></th>
                <th className="text-left px-4 py-3 text-[10px] font-bold tracking-widest uppercase text-muted-foreground">Track</th>
                <th className="text-left px-4 py-3 text-[10px] font-bold tracking-widest uppercase text-muted-foreground hidden md:table-cell">Artist</th>
                <th className="text-left px-4 py-3 text-[10px] font-bold tracking-widest uppercase text-muted-foreground hidden lg:table-cell">Frequency</th>
                <th className="text-left px-4 py-3 text-[10px] font-bold tracking-widest uppercase text-muted-foreground hidden lg:table-cell">Tier</th>
                <th className="text-left px-4 py-3 text-[10px] font-bold tracking-widest uppercase text-muted-foreground hidden xl:table-cell">DL</th>
                <th className="text-left px-4 py-3 text-[10px] font-bold tracking-widest uppercase text-muted-foreground hidden xl:table-cell">Status</th>
                <th className="text-right px-4 py-3 text-[10px] font-bold tracking-widest uppercase text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((track) => {
                const isSelected = selected.has(track.id);
                return (
                  <tr key={track.id}
                    className={`border-b border-border/20 transition-colors ${isSelected ? "bg-primary/5" : "hover:bg-muted/10"}`}
                    onClick={() => toggleSelect(track.id)}
                    style={{ cursor: "pointer" }}
                  >
                    <td className="px-3 py-3">
                      {isSelected
                        ? <CheckSquare className="w-4 h-4 text-primary" />
                        : <Square className="w-4 h-4 text-muted-foreground/40" />}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {track.cover_url ? (
                          <img src={track.cover_url} alt="" className="w-9 h-9 rounded-lg object-cover flex-shrink-0" />
                        ) : (
                          <div className="w-9 h-9 rounded-lg bg-muted/50 flex items-center justify-center flex-shrink-0">
                            <Music4 className="w-4 h-4 text-muted-foreground/40" />
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="font-medium text-foreground truncate max-w-[150px]">{track.title}</p>
                          {track.duration && <p className="text-[10px] text-muted-foreground">{track.duration}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <span className="text-xs text-muted-foreground truncate block max-w-[120px]">
                        {track.artist_display || artistMap[track.primary_artist_id] || "—"}
                      </span>
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      <span className="text-[10px] font-bold uppercase text-cyan-400/70">{track.frequency_type || "standard"}</span>
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${
                        (track.tier_access || ["free"]).includes("premium")
                          ? "text-yellow-400 bg-yellow-400/10 border-yellow-400/20"
                          : (track.tier_access || ["free"]).includes("supporter")
                          ? "text-purple-400 bg-purple-400/10 border-purple-400/20"
                          : "text-green-400 bg-green-400/10 border-green-400/20"
                      }`}>
                        {(track.tier_access || ["free"]).includes("premium") ? "premium" : (track.tier_access || ["free"]).includes("supporter") ? "supporter" : "free"}
                      </span>
                    </td>
                    <td className="px-4 py-3 hidden xl:table-cell">
                      {track.is_downloadable
                        ? <Download className="w-3.5 h-3.5 text-green-400" />
                        : <span className="text-muted-foreground/30 text-xs">—</span>}
                    </td>
                    <td className="px-4 py-3 hidden xl:table-cell">
                      <span className={`text-xs font-medium ${track.status === "published" ? "text-green-400" : "text-muted-foreground"}`}>
                        {track.status || "published"}
                      </span>
                    </td>
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-1 justify-end">
                        <button onClick={() => toggleFeatured(track)} title="Toggle featured"
                          className={`p-1.5 rounded-lg transition-all ${track.is_featured ? "text-secondary" : "text-muted-foreground hover:text-secondary"}`}>
                          <Star className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => toggleStatus(track)} title="Toggle status"
                          className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground transition-all">
                          {track.status === "published" ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                        </button>
                        <button onClick={() => onEdit(track)}
                          className="p-1.5 rounded-lg text-muted-foreground hover:text-primary transition-all">
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => deleteTrack(track)}
                          className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive transition-all">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="py-12 text-center text-muted-foreground text-sm">No tracks found</div>
          )}
        </div>
      </div>
    </div>
  );
}