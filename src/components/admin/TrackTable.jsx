import React, { useState } from "react";
import { Edit2, Trash2, Star, Globe, Lock, Eye, EyeOff, Search, Filter, X } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { getAccessBadge } from "@/lib/tierAccess";

export default function TrackTable({ tracks, categories, artists, onEdit, onRefresh }) {
  const [search, setSearch] = useState("");
  const [filterTier, setFilterTier] = useState("all");
  const [filterFeatured, setFilterFeatured] = useState("all");

  const getArtist = (id) => artists.find((a) => a.id === id);
  const getCatNames = (ids) => {
    if (!ids?.length) return [];
    return categories.filter((c) => ids.includes(c.id)).map((c) => c.name);
  };

  const filtered = tracks.filter((t) => {
    const q = search.toLowerCase();
    const matchSearch =
      !search ||
      t.title?.toLowerCase().includes(q) ||
      t.artist_display?.toLowerCase().includes(q);
    const matchTier =
      filterTier === "all" || (t.tier_access || []).includes(filterTier);
    const matchFeatured =
      filterFeatured === "all" ||
      (filterFeatured === "yes" ? t.is_featured : !t.is_featured);
    return matchSearch && matchTier && matchFeatured;
  });

  const toggleFeatured = async (track) => {
    await base44.entities.Track.update(track.id, { is_featured: !track.is_featured });
    toast.success(track.is_featured ? "Removed from featured" : "Marked as featured");
    onRefresh();
  };

  const toggleStatus = async (track) => {
    const next = track.status === "published" ? "archived" : "published";
    await base44.entities.Track.update(track.id, { status: next });
    toast.success(`Track ${next}`);
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
      {/* Filters */}
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
        <select
          value={filterTier}
          onChange={(e) => setFilterTier(e.target.value)}
          className="px-3 py-2 rounded-lg bg-card/40 border border-border/30 text-sm text-foreground focus:outline-none focus:border-primary/40"
        >
          <option value="all">All Tiers</option>
          <option value="free">Free</option>
          <option value="supporter">Supporter</option>
          <option value="premium">Premium</option>
        </select>
        <select
          value={filterFeatured}
          onChange={(e) => setFilterFeatured(e.target.value)}
          className="px-3 py-2 rounded-lg bg-card/40 border border-border/30 text-sm text-foreground focus:outline-none focus:border-primary/40"
        >
          <option value="all">All</option>
          <option value="yes">Featured Only</option>
          <option value="no">Not Featured</option>
        </select>
      </div>

      <p className="text-xs text-muted-foreground mb-3">{filtered.length} track{filtered.length !== 1 ? "s" : ""}</p>

      {/* Table */}
      <div className="rounded-xl border border-border/30 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/30 bg-muted/20">
                <th className="text-left px-4 py-3 text-[10px] font-bold tracking-widest uppercase text-muted-foreground">Track</th>
                <th className="text-left px-4 py-3 text-[10px] font-bold tracking-widest uppercase text-muted-foreground hidden md:table-cell">Artist</th>
                <th className="text-left px-4 py-3 text-[10px] font-bold tracking-widest uppercase text-muted-foreground hidden lg:table-cell">Categories</th>
                <th className="text-left px-4 py-3 text-[10px] font-bold tracking-widest uppercase text-muted-foreground">Access</th>
                <th className="text-left px-4 py-3 text-[10px] font-bold tracking-widest uppercase text-muted-foreground hidden lg:table-cell">Status</th>
                <th className="text-right px-4 py-3 text-[10px] font-bold tracking-widest uppercase text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((track) => {
                const badge = getAccessBadge(track);
                const catNames = getCatNames(track.category_ids);
                const artist = getArtist(track.primary_artist_id);
                return (
                  <tr key={track.id} className="border-b border-border/20 hover:bg-muted/10 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {track.cover_url ? (
                          <img src={track.cover_url} alt="" className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-muted/50 flex-shrink-0" />
                        )}
                        <div className="min-w-0">
                          <p className="font-medium text-foreground truncate max-w-[160px]">{track.title}</p>
                          {track.is_featured && (
                            <span className="text-[10px] text-secondary font-bold tracking-wider">★ FEATURED</span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <span className="text-muted-foreground text-xs truncate block max-w-[120px]">
                        {track.artist_display || artist?.name || "—"}
                      </span>
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      <div className="flex flex-wrap gap-1 max-w-[180px]">
                        {catNames.slice(0, 3).map((n) => (
                          <span key={n} className="px-1.5 py-0.5 rounded bg-muted/50 text-[10px] text-muted-foreground">{n}</span>
                        ))}
                        {catNames.length > 3 && (
                          <span className="text-[10px] text-muted-foreground">+{catNames.length - 3}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase border ${badge.color}`}>
                        {badge.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      <span className={`text-xs font-medium ${track.status === "published" ? "text-green-400" : track.status === "draft" ? "text-yellow-400" : "text-muted-foreground"}`}>
                        {track.status || "published"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 justify-end">
                        <button
                          onClick={() => toggleFeatured(track)}
                          title="Toggle featured"
                          className={`p-1.5 rounded-lg transition-all hover:bg-secondary/10 ${track.is_featured ? "text-secondary" : "text-muted-foreground"}`}
                        >
                          <Star className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => toggleStatus(track)}
                          title="Toggle published"
                          className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-all"
                        >
                          {track.status === "published" ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                        </button>
                        <button
                          onClick={() => onEdit(track)}
                          className="p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => deleteTrack(track)}
                          className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all"
                        >
                          <Trash2 className="w-4 h-4" />
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