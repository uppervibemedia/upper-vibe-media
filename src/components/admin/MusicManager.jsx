import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckSquare, Square, Trash2, Download, Lock, Unlock, Tag, Users, Waves,
  Edit2, Search, X, Star, Eye, EyeOff, Music4, Brain, Loader2, Shield, ShieldOff
} from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

const MOOD_OPTIONS = ["motivation", "focus", "healing", "confidence", "money", "night", "driving", "meditation", "love", "spiritual"];
const TIER_OPTIONS = ["free", "supporter", "premium"];

export default function MusicManager({ tracks, categories, artists, onEdit, onRefresh }) {
  const [selected, setSelected] = useState(new Set());
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterTier, setFilterTier] = useState("all");
  const [bulkPanel, setBulkPanel] = useState(null);
  const [bulkValue, setBulkValue] = useState("");
  const [aiOrganizing, setAiOrganizing] = useState(false);

  const catMap = useMemo(() => Object.fromEntries(categories.map((c) => [c.id, c.name])), [categories]);
  const artistMap = useMemo(() => Object.fromEntries(artists.map((a) => [a.id, a.name])), [artists]);

  const filtered = useMemo(() => {
    return tracks.filter((t) => {
      const q = search.toLowerCase();
      const matchSearch = !search ||
        (t.title || "").toLowerCase().includes(q) ||
        (t.artist_display || "").toLowerCase().includes(q) ||
        (artistMap[t.primary_artist_id] || "").toLowerCase().includes(q);
      const matchCat = filterCategory === "all" || (t.category_ids || []).includes(filterCategory);
      const matchTier = filterTier === "all" || (t.tier_access || ["free"]).includes(filterTier);
      return matchSearch && matchCat && matchTier;
    });
  }, [tracks, search, filterCategory, filterTier, artistMap]);

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

  const selCount = selected.size;

  const applyBulk = async () => {
    if (!selCount || !bulkValue) return;
    const ids = [...selected];

    if (bulkPanel === "category") {
      for (const id of ids) {
        const track = tracks.find((t) => t.id === id);
        const existing = track?.category_ids || [];
        const next = existing.includes(bulkValue) ? existing : [...existing, bulkValue];
        await base44.entities.Track.update(id, { category_ids: next });
      }
      toast.success(`Assigned category to ${selCount} tracks`);
    } else if (bulkPanel === "artist") {
      const artistName = artistMap[bulkValue] || "";
      await Promise.all(ids.map((id) => base44.entities.Track.update(id, {
        primary_artist_id: bulkValue,
        artist_display: artistName,
      })));
      toast.success(`Set artist "${artistName}" on ${selCount} tracks`);
    } else if (bulkPanel === "tier") {
      await Promise.all(ids.map((id) => base44.entities.Track.update(id, {
        tier_access: [bulkValue],
        is_premium: bulkValue !== "free",
        min_tier: bulkValue,
      })));
      toast.success(`Set tier to ${bulkValue} for ${selCount} tracks`);
    } else if (bulkPanel === "mood") {
      for (const id of ids) {
        const track = tracks.find((t) => t.id === id);
        const existing = track?.mood_tags || [];
        const next = existing.includes(bulkValue) ? existing : [...existing, bulkValue];
        await base44.entities.Track.update(id, { mood_tags: next });
      }
      toast.success(`Added mood tag "${bulkValue}" to ${selCount} tracks`);
    } else if (bulkPanel === "new_release") {
      const flag = bulkValue === "yes";
      await Promise.all(ids.map((id) => base44.entities.Track.update(id, { is_new_release: flag })));
      toast.success(`Marked ${selCount} tracks as ${flag ? "" : "not "}New Releases`);
    } else if (bulkPanel === "lock") {
      const flag = bulkValue === "yes";
      await Promise.all(ids.map((id) => base44.entities.Track.update(id, { metadata_locked: flag })));
      toast.success(`${flag ? "Locked" : "Unlocked"} metadata on ${selCount} tracks`);
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
    onRefresh();
  };

  const toggleFeatured = async (track) => {
    await base44.entities.Track.update(track.id, { is_featured: !track.is_featured });
    onRefresh();
  };

  const deleteTrack = async (track) => {
    if (!confirm(`Delete "${track.title}"?`)) return;
    await base44.entities.Track.delete(track.id);
    toast.success("Track deleted");
    onRefresh();
  };

  const toggleLock = async (track) => {
    await base44.entities.Track.update(track.id, { metadata_locked: !track.metadata_locked });
    toast.success(track.metadata_locked ? "Metadata unlocked" : "Metadata locked");
    onRefresh();
  };

  // AI Organize: scan selected (or all unlocked) tracks and fix missing metadata
  const aiOrganizeSongs = async () => {
    const toOrganize = (selCount > 0 ? filtered.filter((t) => selected.has(t.id)) : filtered)
      .filter((t) => !t.metadata_locked);

    if (toOrganize.length === 0) {
      toast.error("No unlocked tracks to organize. Deselect locked tracks or unlock them first.");
      return;
    }

    if (!confirm(`AI Organize ${toOrganize.length} unlocked track(s)? This will fill missing metadata using cover art and title. Locked tracks will be skipped.`)) return;

    setAiOrganizing(true);
    let done = 0;
    const errors = [];

    for (const track of toOrganize) {
      try {
        const res = await base44.functions.invoke("classifyTrack", { track });
        const cls = res.data?.classification;
        if (!cls) continue;

        // Map categories
        const catIds = (cls.suggested_categories || []).flatMap((name) => {
          const match = categories.find((c) => c.name.toLowerCase() === name.toLowerCase());
          return match ? [match.id] : [];
        });
        // Map artist
        const artistMatch = artists.find((a) => a.name.toLowerCase() === (cls.suggested_primary_artist || "").toLowerCase());
        const artistName = artistMatch?.name || cls.suggested_primary_artist || "Upper Vibe Media Collective";

        const updates = {
          frequency_type: "432hz",
          frequency_hz: 432,
          is_downloadable: true,
          artist_display: artistName,
        };
        if (!track.primary_artist_id && artistMatch) updates.primary_artist_id = artistMatch.id;
        if (!track.category_ids?.length && catIds.length) updates.category_ids = catIds;

        await base44.entities.Track.update(track.id, updates);
        done++;
      } catch (err) {
        errors.push(track.title);
      }
    }

    setAiOrganizing(false);
    toast.success(`AI Organized ${done} track(s)!${errors.length ? ` ${errors.length} failed.` : ""}`);
    setSelected(new Set());
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
        <select value={filterTier} onChange={(e) => setFilterTier(e.target.value)}
          className="px-3 py-2 rounded-lg bg-card/40 border border-border/30 text-sm text-foreground focus:outline-none">
          <option value="all">All Tiers</option>
          {TIER_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>

        {/* AI Organize button */}
        <button
          onClick={aiOrganizeSongs}
          disabled={aiOrganizing}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold tracking-wide transition-all disabled:opacity-60"
          style={{ background: "rgba(0,229,255,0.08)", border: "1px solid rgba(0,229,255,0.2)", color: "#00E5FF" }}
        >
          {aiOrganizing
            ? <><Loader2 className="w-4 h-4 animate-spin" /> Organizing...</>
            : <><Brain className="w-4 h-4" /> AI Organize Songs</>}
        </button>
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
                { key: "mood", icon: Waves, label: "Add Mood Tag" },
                { key: "new_release", icon: Star, label: "New Release" },
                { key: "tier", icon: Lock, label: "Set Tier" },
                { key: "lock", icon: Shield, label: "Lock/Unlock" },
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
                {bulkPanel === "mood" && (
                  <select value={bulkValue} onChange={(e) => setBulkValue(e.target.value)}
                    className="flex-1 px-3 py-2 rounded-lg bg-card/40 border border-border/30 text-sm text-foreground focus:outline-none">
                    <option value="">Select mood tag...</option>
                    {MOOD_OPTIONS.map((m) => <option key={m} value={m}>{m}</option>)}
                  </select>
                )}
                {bulkPanel === "new_release" && (
                  <select value={bulkValue} onChange={(e) => setBulkValue(e.target.value)}
                    className="flex-1 px-3 py-2 rounded-lg bg-card/40 border border-border/30 text-sm text-foreground focus:outline-none">
                    <option value="">Select...</option>
                    <option value="yes">✅ Mark as New Release</option>
                    <option value="no">Remove New Release tag</option>
                  </select>
                )}
                {bulkPanel === "tier" && (
                  <select value={bulkValue} onChange={(e) => setBulkValue(e.target.value)}
                    className="flex-1 px-3 py-2 rounded-lg bg-card/40 border border-border/30 text-sm text-foreground focus:outline-none">
                    <option value="">Select tier...</option>
                    {TIER_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                )}
                {bulkPanel === "lock" && (
                  <select value={bulkValue} onChange={(e) => setBulkValue(e.target.value)}
                    className="flex-1 px-3 py-2 rounded-lg bg-card/40 border border-border/30 text-sm text-foreground focus:outline-none">
                    <option value="">Select...</option>
                    <option value="yes">🔒 Lock Metadata</option>
                    <option value="no">🔓 Unlock Metadata</option>
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
                <th className="text-left px-4 py-3 text-[10px] font-bold tracking-widest uppercase text-muted-foreground">Cover / Title</th>
                <th className="text-left px-4 py-3 text-[10px] font-bold tracking-widest uppercase text-muted-foreground hidden md:table-cell">Primary Artist</th>
                <th className="text-left px-4 py-3 text-[10px] font-bold tracking-widest uppercase text-muted-foreground hidden lg:table-cell">Display Name</th>
                <th className="text-left px-4 py-3 text-[10px] font-bold tracking-widest uppercase text-muted-foreground hidden lg:table-cell">Category</th>
                <th className="text-left px-4 py-3 text-[10px] font-bold tracking-widest uppercase text-muted-foreground hidden xl:table-cell">Hz</th>
                <th className="text-left px-4 py-3 text-[10px] font-bold tracking-widest uppercase text-muted-foreground hidden xl:table-cell">Mood Tags</th>
                <th className="text-left px-4 py-3 text-[10px] font-bold tracking-widest uppercase text-muted-foreground hidden xl:table-cell">DL</th>
                <th className="text-left px-4 py-3 text-[10px] font-bold tracking-widest uppercase text-muted-foreground hidden xl:table-cell">Locked</th>
                <th className="text-right px-4 py-3 text-[10px] font-bold tracking-widest uppercase text-muted-foreground">Edit</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((track) => {
                const isSelected = selected.has(track.id);
                const primaryArtistName = artistMap[track.primary_artist_id] || "—";
                const displayName = track.artist_display || primaryArtistName;
                const categoryNames = (track.category_ids || []).map((id) => catMap[id]).filter(Boolean);

                return (
                  <tr key={track.id}
                    className={`border-b border-border/20 transition-colors ${isSelected ? "bg-primary/5" : track.metadata_locked ? "bg-yellow-400/5" : "hover:bg-muted/10"}`}
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
                          <p className="font-medium text-foreground truncate max-w-[140px]">{track.title}</p>
                          {track.duration && <p className="text-[10px] text-muted-foreground">{track.duration}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <span className="text-xs text-foreground/70 truncate block max-w-[120px]">
                        {primaryArtistName}
                      </span>
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      <span className={`text-xs truncate block max-w-[120px] ${displayName !== primaryArtistName && primaryArtistName !== "—" ? "text-yellow-400" : "text-muted-foreground"}`}>
                        {displayName}
                        {displayName !== primaryArtistName && primaryArtistName !== "—" && (
                          <span className="ml-1 text-[9px] text-yellow-400/60">(mismatch)</span>
                        )}
                      </span>
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      <div className="flex flex-wrap gap-1 max-w-[140px]">
                        {categoryNames.slice(0, 2).map((c) => (
                          <span key={c} className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-primary/10 text-primary/70">{c}</span>
                        ))}
                        {categoryNames.length > 2 && <span className="text-[9px] text-muted-foreground">+{categoryNames.length - 2}</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden xl:table-cell">
                      <span className="text-[10px] font-bold text-cyan-400/80">432 Hz</span>
                    </td>
                    <td className="px-4 py-3 hidden xl:table-cell">
                      <div className="flex flex-wrap gap-1 max-w-[120px]">
                        {(track.mood_tags || []).slice(0, 2).map((m) => (
                          <span key={m} className="text-[9px] px-1.5 py-0.5 rounded-full bg-muted/50 text-muted-foreground">{m}</span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden xl:table-cell">
                      {track.is_downloadable
                        ? <span className="text-[9px] font-bold text-yellow-400">Premium</span>
                        : <span className="text-muted-foreground/30 text-xs">—</span>}
                    </td>
                    <td className="px-4 py-3 hidden xl:table-cell">
                      {track.metadata_locked
                        ? <Shield className="w-3.5 h-3.5 text-yellow-400" />
                        : <span className="text-muted-foreground/20 text-xs">—</span>}
                    </td>
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-1 justify-end">
                        <button onClick={() => toggleFeatured(track)} title="Toggle featured"
                          className={`p-1.5 rounded-lg transition-all ${track.is_featured ? "text-secondary" : "text-muted-foreground hover:text-secondary"}`}>
                          <Star className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => toggleLock(track)} title={track.metadata_locked ? "Unlock metadata" : "Lock metadata"}
                          className={`p-1.5 rounded-lg transition-all ${track.metadata_locked ? "text-yellow-400" : "text-muted-foreground hover:text-yellow-400"}`}>
                          {track.metadata_locked ? <Shield className="w-3.5 h-3.5" /> : <ShieldOff className="w-3.5 h-3.5" />}
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