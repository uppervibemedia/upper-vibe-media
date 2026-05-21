import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Plus, Trash2, Play, Pause, ToggleLeft, ToggleRight, Upload } from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

const CATEGORIES = [
  "motivation", "manifestation", "wealth", "discipline",
  "calm_reset", "station_id", "premium_promo", "new_music_promo"
];

const BLANK = { title: "", category: "motivation", audio_url: "", duration: null, is_active: true };

export default function HostDropManager() {
  const [drops, setDrops]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [form, setForm]         = useState(null); // null = hidden, obj = editing/creating
  const [saving, setSaving]     = useState(false);
  const [uploading, setUploading] = useState(false);
  const [playingId, setPlayingId] = useState(null);
  const audioRef = useRef(new Audio());

  const load = async () => {
    setLoading(true);
    const res = await base44.entities.RadioHostDrop.list("-created_date", 100);
    setDrops(res);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  // Cleanup audio on unmount
  useEffect(() => {
    const a = audioRef.current;
    return () => { a.pause(); a.src = ""; };
  }, []);

  const handlePreview = (drop) => {
    const a = audioRef.current;
    if (playingId === drop.id) {
      a.pause();
      setPlayingId(null);
    } else {
      a.src = drop.audio_url;
      a.play().catch(() => {});
      setPlayingId(drop.id);
      a.onended = () => setPlayingId(null);
    }
  };

  const handleToggle = async (drop) => {
    await base44.entities.RadioHostDrop.update(drop.id, { is_active: !drop.is_active });
    toast.success(drop.is_active ? "Drop deactivated" : "Drop activated");
    load();
  };

  const handleDelete = async (drop) => {
    if (!confirm(`Delete "${drop.title}"?`)) return;
    await base44.entities.RadioHostDrop.delete(drop.id);
    toast.success("Deleted");
    load();
  };

  const handleAudioUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setForm((f) => ({ ...f, audio_url: file_url }));
    setUploading(false);
    toast.success("Audio uploaded");
  };

  const handleSave = async () => {
    if (!form.title || !form.audio_url) {
      toast.error("Title and audio are required");
      return;
    }
    setSaving(true);
    if (form.id) {
      await base44.entities.RadioHostDrop.update(form.id, form);
    } else {
      await base44.entities.RadioHostDrop.create(form);
    }
    setSaving(false);
    setForm(null);
    toast.success("Saved");
    load();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <p className="text-sm text-muted-foreground">{drops.length} drop{drops.length !== 1 ? "s" : ""} total</p>
        <button
          onClick={() => setForm({ ...BLANK })}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-all"
        >
          <Plus className="w-4 h-4" /> Add Drop
        </button>
      </div>

      {/* Form */}
      <AnimatePresence>
        {form && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mb-6 p-5 rounded-2xl border border-border/30 bg-card/40"
          >
            <h3 className="font-heading font-bold text-lg mb-4">{form.id ? "Edit Drop" : "New Drop"}</h3>
            <div className="grid sm:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Title *</label>
                <input
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  placeholder="e.g. Stay Focused Drop"
                  className="w-full px-3 py-2 rounded-lg bg-background border border-border/40 text-sm focus:outline-none focus:border-primary/50"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Category</label>
                <select
                  value={form.category}
                  onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg bg-background border border-border/40 text-sm focus:outline-none focus:border-primary/50"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>{c.replace(/_/g, " ")}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Audio upload */}
            <div className="mb-4">
              <label className="text-xs text-muted-foreground mb-1 block">Audio File *</label>
              {form.audio_url ? (
                <div className="flex items-center gap-3">
                  <span className="text-xs text-primary truncate max-w-xs">{form.audio_url.split("/").pop()}</span>
                  <button onClick={() => setForm((f) => ({ ...f, audio_url: "" }))} className="text-destructive text-xs hover:underline">Remove</button>
                </div>
              ) : (
                <label className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border border-dashed border-border/40 text-sm text-muted-foreground cursor-pointer hover:border-primary/40 transition-colors w-fit ${uploading ? "opacity-60 pointer-events-none" : ""}`}>
                  <Upload className="w-4 h-4" />
                  {uploading ? "Uploading..." : "Upload audio file"}
                  <input type="file" accept="audio/*" className="hidden" onChange={handleAudioUpload} />
                </label>
              )}
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-5 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 disabled:opacity-50 transition-all"
              >
                {saving ? "Saving..." : "Save"}
              </button>
              <button
                onClick={() => setForm(null)}
                className="px-5 py-2 rounded-lg bg-card border border-border/30 text-sm hover:bg-card/80 transition-all"
              >
                Cancel
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-5 h-5 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
        </div>
      ) : drops.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground text-sm">No host drops yet. Add one above.</div>
      ) : (
        <div className="space-y-3">
          {drops.map((drop) => (
            <div key={drop.id} className="flex items-center gap-4 p-4 rounded-xl bg-card/40 border border-border/20">
              {/* Preview button */}
              <button
                onClick={() => handlePreview(drop)}
                disabled={!drop.audio_url}
                className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 bg-primary/10 text-primary hover:bg-primary/20 disabled:opacity-30 transition-all"
              >
                {playingId === drop.id ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              </button>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground truncate">{drop.title}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[11px] text-muted-foreground">{drop.category?.replace(/_/g, " ")}</span>
                  {drop.play_count > 0 && (
                    <span className="text-[11px] text-muted-foreground">· {drop.play_count} plays</span>
                  )}
                </div>
              </div>

              {/* Active toggle */}
              <button
                onClick={() => handleToggle(drop)}
                className={`transition-colors ${drop.is_active ? "text-primary" : "text-muted-foreground/40"}`}
                title={drop.is_active ? "Active — click to deactivate" : "Inactive — click to activate"}
              >
                {drop.is_active ? <ToggleRight className="w-6 h-6" /> : <ToggleLeft className="w-6 h-6" />}
              </button>

              {/* Edit */}
              <button
                onClick={() => setForm({ ...drop })}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded border border-border/30 hover:border-border/60"
              >
                Edit
              </button>

              {/* Delete */}
              <button
                onClick={() => handleDelete(drop)}
                className="text-destructive/60 hover:text-destructive transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}