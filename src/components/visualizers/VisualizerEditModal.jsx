import React, { useState } from "react";
import { motion } from "framer-motion";
import { X, Image, Loader2 } from "lucide-react";
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

function extractVideoId(url) {
  if (!url) return null;
  const match = url.match(/(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/);
  return match ? match[1] : null;
}

function toEmbedUrl(url) {
  const id = extractVideoId(url);
  return id ? `https://www.youtube.com/embed/${id}` : (url || "");
}

export default function VisualizerEditModal({ viz, tracks, onClose, onSaved }) {
  const [form, setForm] = useState({ ...viz });
  const [saving, setSaving] = useState(false);
  const [uploadingThumb, setUploadingThumb] = useState(false);

  const handleVideoUrlChange = (url) => {
    const embed = toEmbedUrl(url);
    setForm((f) => ({ ...f, video_url: url, embed_url: embed }));
  };

  const handleSongSelect = (songId) => {
    const track = tracks.find((t) => t.id === songId);
    setForm((f) => ({
      ...f,
      linked_song_id: songId,
      linked_song_title: track?.title || "",
      artist: f.artist || track?.artist_display || "",
      thumbnail_url: f.thumbnail_url || track?.cover_url || "",
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

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.title) return toast.error("Title is required");
    setSaving(true);
    await base44.entities.Visualizer.update(viz.id, form);
    toast.success("Visualizer updated!");
    setSaving(false);
    onSaved();
  };

  const inputCls = "w-full px-3 py-2 rounded-lg bg-card/40 border border-border/30 text-sm text-foreground focus:outline-none focus:border-primary/50";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4"
      style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(8px)" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-2xl"
        style={{ background: "hsl(var(--card))", border: "1px solid rgba(255,255,255,0.08)" }}>
        <form onSubmit={handleSave} className="p-6 grid grid-cols-2 gap-4">
          {/* Header */}
          <div className="col-span-2 flex items-center justify-between mb-1">
            <h3 className="font-heading font-bold text-base text-foreground">Edit Visualizer</h3>
            <button type="button" onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Title */}
          <div className="col-span-2 md:col-span-1">
            <label className="text-xs font-semibold tracking-wider uppercase text-muted-foreground mb-1.5 block">Title *</label>
            <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className={inputCls} required placeholder="Visualizer title" />
          </div>

          {/* Artist */}
          <div className="col-span-2 md:col-span-1">
            <label className="text-xs font-semibold tracking-wider uppercase text-muted-foreground mb-1.5 block">Artist</label>
            <input value={form.artist || ""} onChange={(e) => setForm({ ...form, artist: e.target.value })} className={inputCls} placeholder="Artist name" />
          </div>

          {/* Category */}
          <div>
            <label className="text-xs font-semibold tracking-wider uppercase text-muted-foreground mb-1.5 block">Category</label>
            <select value={form.category || ""} onChange={(e) => setForm({ ...form, category: e.target.value })} className={inputCls}>
              <option value="">Select...</option>
              {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </div>

          {/* Release date */}
          <div>
            <label className="text-xs font-semibold tracking-wider uppercase text-muted-foreground mb-1.5 block">Release Date</label>
            <input type="date" value={form.release_date || ""} onChange={(e) => setForm({ ...form, release_date: e.target.value })} className={inputCls} />
          </div>

          {/* YouTube URL */}
          <div className="col-span-2">
            <label className="text-xs font-semibold tracking-wider uppercase text-muted-foreground mb-1.5 block">
              YouTube Video URL <span className="text-primary/50 normal-case font-normal">(auto-converts watch/shorts/youtu.be links)</span>
            </label>
            <input value={form.video_url || ""} onChange={(e) => handleVideoUrlChange(e.target.value)} className={inputCls}
              placeholder="https://www.youtube.com/watch?v=VIDEO_ID" />
            {form.embed_url && (
              <p className="text-[10px] text-primary/50 mt-1">✓ Embed URL: {form.embed_url}</p>
            )}
          </div>

          {/* Embed URL (editable override) */}
          <div className="col-span-2">
            <label className="text-xs font-semibold tracking-wider uppercase text-muted-foreground mb-1.5 block">Embed URL (auto-filled — only edit if needed)</label>
            <input value={form.embed_url || ""} onChange={(e) => setForm({ ...form, embed_url: e.target.value })} className={inputCls}
              placeholder="https://www.youtube.com/embed/VIDEO_ID" />
          </div>

          {/* Thumbnail */}
          <div className="col-span-2">
            <label className="text-xs font-semibold tracking-wider uppercase text-muted-foreground mb-1.5 block">Thumbnail</label>
            <div className="flex items-center gap-3">
              {form.thumbnail_url && (
                <img src={form.thumbnail_url} alt="thumb" className="w-16 h-10 rounded-lg object-cover flex-shrink-0" />
              )}
              <div className="flex gap-2 flex-1">
                <input value={form.thumbnail_url || ""} onChange={(e) => setForm({ ...form, thumbnail_url: e.target.value })} className={`${inputCls} flex-1`}
                  placeholder="Paste image URL or upload" />
                <label className="cursor-pointer px-3 py-2 rounded-lg bg-muted/30 border border-border/30 text-xs font-semibold text-muted-foreground hover:text-foreground transition-all flex items-center gap-1.5">
                  {uploadingThumb ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <><Image className="w-3.5 h-3.5" /> Upload</>}
                  <input type="file" accept="image/*" className="hidden" onChange={handleThumbUpload} />
                </label>
              </div>
            </div>
          </div>

          {/* Related song */}
          <div className="col-span-2">
            <label className="text-xs font-semibold tracking-wider uppercase text-muted-foreground mb-1.5 block">Related Song</label>
            <select value={form.linked_song_id || ""} onChange={(e) => handleSongSelect(e.target.value)} className={inputCls}>
              <option value="">— No linked song —</option>
              {tracks.map((t) => <option key={t.id} value={t.id}>{t.title}{t.artist_display ? ` — ${t.artist_display}` : ""}</option>)}
            </select>
          </div>

          {/* Toggles: 432 Hz badge + featured */}
          <div className="col-span-2 flex items-center gap-6 flex-wrap">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={!!form.is_featured} onChange={(e) => setForm({ ...form, is_featured: e.target.checked })} className="accent-primary w-4 h-4" />
              <span className="text-sm text-foreground">Featured</span>
            </label>
            <select value={form.status || "published"} onChange={(e) => setForm({ ...form, status: e.target.value })}
              className="px-3 py-1.5 rounded-lg bg-card/40 border border-border/30 text-sm text-foreground focus:outline-none">
              <option value="published">Published</option>
              <option value="draft">Draft</option>
              <option value="archived">Archived</option>
            </select>
          </div>

          {/* Actions */}
          <div className="col-span-2 flex gap-3 pt-2">
            <button type="submit" disabled={saving}
              className="px-6 py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-50"
              style={{ background: "linear-gradient(135deg,#00B8D4,#00E5FF)", color: "#000" }}>
              {saving ? "Saving..." : "Save Changes"}
            </button>
            <button type="button" onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-border/30 text-sm text-muted-foreground hover:text-foreground transition-all">
              Cancel
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}