import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Edit2, Trash2, Star, Image, Loader2, Check, X, Tv2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

const CATEGORIES = [
  { value: "hiphop", label: "Hip Hop / Rap" },
  { value: "rnb", label: "R&B" },
  { value: "electronic", label: "Electronic Music" },
  { value: "meditation", label: "Meditation / Focus" },
  { value: "car", label: "Car Music" },
  { value: "other", label: "Other" },
];

const EMPTY_FORM = {
  title: "", linked_song_id: "", linked_song_title: "", artist: "",
  category: "", duration: "", thumbnail_url: "", video_url: "", embed_url: "",
  description: "", release_date: "", display_order: 0, is_featured: false, status: "published",
};

export default function VisualizerManager({ tracks, onRefresh }) {
  const [visualizers, setVisualizers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingViz, setEditingViz] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [uploadingThumb, setUploadingThumb] = useState(false);

  const load = async () => {
    setLoading(true);
    const v = await base44.entities.Visualizer.list("display_order", 200);
    setVisualizers(v);
    setLoading(false);
    setLoaded(true);
  };

  useEffect(() => { load(); }, []);

  const trackMap = useMemo(() => Object.fromEntries(tracks.map((t) => [t.id, t])), [tracks]);

  // Auto-convert any YouTube watch / short / shorts URL to embed URL
  const toEmbedUrl = (url) => {
    if (!url) return "";
    const match = url.match(/(?:youtube\.com\/(?:watch\?v=|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/);
    if (match) return `https://www.youtube.com/embed/${match[1]}`;
    if (url.includes("youtube.com/embed/")) return url; // already embed
    return url;
  };

  const handleVideoUrlChange = (url) => {
    const embed = toEmbedUrl(url);
    setForm((f) => ({ ...f, video_url: url, embed_url: embed }));
  };

  const handleSongSelect = (songId) => {
    const track = trackMap[songId];
    if (!track) { setForm((f) => ({ ...f, linked_song_id: "" })); return; }
    setForm((f) => ({
      ...f,
      linked_song_id: songId,
      linked_song_title: track.title,
      artist: f.artist || track.artist_display || "",
      // pull cover if no thumb
      thumbnail_url: f.thumbnail_url || track.cover_url || "",
    }));
  };

  const handleThumbUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadingThumb(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setForm((f) => ({ ...f, thumbnail_url: file_url }));
    setUploadingThumb(false);
    toast.success("Thumbnail uploaded!");
  };

  const openNew = () => {
    setEditingViz(null);
    setForm(EMPTY_FORM);
    setShowForm(true);
  };

  const openEdit = (viz) => {
    setEditingViz(viz);
    setForm({ ...EMPTY_FORM, ...viz });
    setShowForm(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.title) return toast.error("Title is required");
    setSaving(true);
    if (editingViz) {
      await base44.entities.Visualizer.update(editingViz.id, form);
      toast.success("Visualizer updated!");
    } else {
      await base44.entities.Visualizer.create(form);
      toast.success("Visualizer added!");
    }
    setSaving(false);
    setShowForm(false);
    setEditingViz(null);
    load();
  };

  const handleDelete = async (viz) => {
    if (!confirm(`Delete "${viz.title}"?`)) return;
    await base44.entities.Visualizer.delete(viz.id);
    toast.success("Deleted");
    load();
  };

  const toggleFeatured = async (viz) => {
    await base44.entities.Visualizer.update(viz.id, { is_featured: !viz.is_featured });
    load();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-heading font-bold text-xl">Visualizers ({visualizers.length})</h2>
        <button onClick={openNew}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary/10 border border-primary/30 text-primary text-sm font-semibold hover:bg-primary/20 transition-all">
          <Plus className="w-4 h-4" /> Add Visualizer
        </button>
      </div>

      {/* Form */}
      <AnimatePresence>
        {showForm && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden mb-6">
            <form onSubmit={handleSave} className="p-6 rounded-2xl bg-card/40 border border-border/30 grid grid-cols-2 gap-4">
              <div className="col-span-2 flex items-center justify-between">
                <h3 className="font-heading font-bold text-base">{editingViz ? "Edit Visualizer" : "New Visualizer"}</h3>
                <button type="button" onClick={() => setShowForm(false)} className="text-muted-foreground hover:text-foreground">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Song selector */}
              <div className="col-span-2">
                <label className="text-xs font-semibold tracking-wider uppercase text-muted-foreground mb-1.5 block">Link to Song</label>
                <select value={form.linked_song_id} onChange={(e) => handleSongSelect(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-card/40 border border-border/30 text-sm text-foreground focus:outline-none focus:border-primary/50">
                  <option value="">— No linked song —</option>
                  {tracks.map((t) => <option key={t.id} value={t.id}>{t.title}{t.artist_display ? ` — ${t.artist_display}` : ""}</option>)}
                </select>
              </div>

              {/* Title */}
              <div className="col-span-2 md:col-span-1">
                <label className="text-xs font-semibold tracking-wider uppercase text-muted-foreground mb-1.5 block">Title *</label>
                <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required
                  className="w-full px-3 py-2 rounded-lg bg-card/40 border border-border/30 text-sm text-foreground focus:outline-none focus:border-primary/50"
                  placeholder="Visualizer title" />
              </div>

              {/* Artist */}
              <div className="col-span-2 md:col-span-1">
                <label className="text-xs font-semibold tracking-wider uppercase text-muted-foreground mb-1.5 block">Artist</label>
                <input value={form.artist} onChange={(e) => setForm({ ...form, artist: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-card/40 border border-border/30 text-sm text-foreground focus:outline-none focus:border-primary/50"
                  placeholder="Artist name" />
              </div>

              {/* Category */}
              <div>
                <label className="text-xs font-semibold tracking-wider uppercase text-muted-foreground mb-1.5 block">Category</label>
                <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-card/40 border border-border/30 text-sm text-foreground focus:outline-none focus:border-primary/50">
                  <option value="">Select category...</option>
                  {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              </div>

              {/* Duration */}
              <div>
                <label className="text-xs font-semibold tracking-wider uppercase text-muted-foreground mb-1.5 block">Duration</label>
                <input value={form.duration} onChange={(e) => setForm({ ...form, duration: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-card/40 border border-border/30 text-sm text-foreground focus:outline-none focus:border-primary/50"
                  placeholder="3:45" />
              </div>

              {/* Video URL — auto-converts to embed */}
              <div className="col-span-2">
                <label className="text-xs font-semibold tracking-wider uppercase text-muted-foreground mb-1.5 block">
                  YouTube Video URL <span className="text-primary/60 normal-case font-normal">(paste normal YouTube link — auto-converts)</span>
                </label>
                <input value={form.video_url} onChange={(e) => handleVideoUrlChange(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-card/40 border border-border/30 text-sm text-foreground focus:outline-none focus:border-primary/50"
                  placeholder="https://www.youtube.com/watch?v=VIDEO_ID" />
                {form.embed_url && (
                  <p className="text-[10px] text-primary/50 mt-1">✓ Embed URL: {form.embed_url}</p>
                )}
              </div>

              {/* Thumbnail */}
              <div className="col-span-2">
                <label className="text-xs font-semibold tracking-wider uppercase text-muted-foreground mb-1.5 block">Thumbnail</label>
                <div className="flex items-center gap-3">
                  {form.thumbnail_url && (
                    <img src={form.thumbnail_url} alt="thumb" className="w-16 h-10 rounded-lg object-cover flex-shrink-0" />
                  )}
                  <div className="flex gap-2 flex-1">
                    <input value={form.thumbnail_url} onChange={(e) => setForm({ ...form, thumbnail_url: e.target.value })}
                      className="flex-1 px-3 py-2 rounded-lg bg-card/40 border border-border/30 text-sm text-foreground focus:outline-none focus:border-primary/50"
                      placeholder="Paste image URL or upload below" />
                    <label className="cursor-pointer px-3 py-2 rounded-lg bg-muted/30 border border-border/30 text-xs font-semibold text-muted-foreground hover:text-foreground transition-all flex items-center gap-1.5">
                      {uploadingThumb ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <><Image className="w-3.5 h-3.5" /> Upload</>}
                      <input type="file" accept="image/*" className="hidden" onChange={handleThumbUpload} />
                    </label>
                  </div>
                </div>
              </div>

              {/* Description */}
              <div className="col-span-2">
                <label className="text-xs font-semibold tracking-wider uppercase text-muted-foreground mb-1.5 block">Description</label>
                <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-card/40 border border-border/30 text-sm text-foreground focus:outline-none focus:border-primary/50 h-20 resize-none"
                  placeholder="Describe the visualizer..." />
              </div>

              {/* Release date + order + featured */}
              <div>
                <label className="text-xs font-semibold tracking-wider uppercase text-muted-foreground mb-1.5 block">Release Date</label>
                <input type="date" value={form.release_date || ""} onChange={(e) => setForm({ ...form, release_date: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-card/40 border border-border/30 text-sm text-foreground focus:outline-none focus:border-primary/50" />
              </div>
              <div>
                <label className="text-xs font-semibold tracking-wider uppercase text-muted-foreground mb-1.5 block">Display Order</label>
                <input type="number" value={form.display_order} onChange={(e) => setForm({ ...form, display_order: parseInt(e.target.value) || 0 })}
                  className="w-full px-3 py-2 rounded-lg bg-card/40 border border-border/30 text-sm text-foreground focus:outline-none focus:border-primary/50" />
              </div>

              <div className="col-span-2 flex items-center gap-6">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={!!form.is_featured} onChange={(e) => setForm({ ...form, is_featured: e.target.checked })} className="accent-primary w-4 h-4" />
                  <span className="text-sm text-foreground">Featured</span>
                </label>
                <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}
                  className="px-3 py-1.5 rounded-lg bg-card/40 border border-border/30 text-sm text-foreground focus:outline-none">
                  <option value="published">Published</option>
                  <option value="draft">Draft</option>
                  <option value="archived">Archived</option>
                </select>
              </div>

              <div className="col-span-2 flex gap-3">
                <button type="submit" disabled={saving}
                  className="px-6 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-all disabled:opacity-50">
                  {saving ? "Saving..." : editingViz ? "Save Changes" : "Add Visualizer"}
                </button>
                <button type="button" onClick={() => setShowForm(false)}
                  className="px-4 py-2.5 rounded-xl border border-border/30 text-sm text-muted-foreground hover:text-foreground transition-all">
                  Cancel
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-5 h-5 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
        </div>
      ) : visualizers.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Tv2 className="w-10 h-10 mx-auto mb-3 opacity-20" />
          <p className="text-sm">No visualizers yet. Add one above.</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {visualizers.map((viz) => {
            const linked = trackMap[viz.linked_song_id];
            const thumb = viz.thumbnail_url || linked?.cover_url;
            return (
              <div key={viz.id} className="rounded-xl overflow-hidden border border-border/20 bg-card/30">
                <div className="aspect-video relative">
                  {thumb ? (
                    <img src={thumb} alt={viz.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-muted/20">
                      <Tv2 className="w-8 h-8 text-muted-foreground/30" />
                    </div>
                  )}
                  <div className="absolute top-2 left-2 flex gap-1">
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase ${viz.status === "published" ? "bg-green-500/20 text-green-400" : "bg-muted/50 text-muted-foreground"}`}>
                      {viz.status}
                    </span>
                    {viz.is_featured && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-yellow-500/20 text-yellow-400">Featured</span>}
                  </div>
                </div>
                <div className="p-3">
                  <p className="text-sm font-bold text-foreground truncate">{viz.title}</p>
                  <p className="text-xs text-muted-foreground truncate">{viz.artist || "—"}</p>
                  {viz.linked_song_title && <p className="text-[10px] text-primary/60 truncate mt-0.5">🎵 {viz.linked_song_title}</p>}
                  <div className="flex items-center gap-1 mt-3 justify-end">
                    <button onClick={() => toggleFeatured(viz)} title="Toggle featured"
                      className={`p-1.5 rounded-lg transition-all ${viz.is_featured ? "text-secondary" : "text-muted-foreground hover:text-secondary"}`}>
                      <Star className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => openEdit(viz)} className="p-1.5 rounded-lg text-muted-foreground hover:text-primary transition-all">
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => handleDelete(viz)} className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive transition-all">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}