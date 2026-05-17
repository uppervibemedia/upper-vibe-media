import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Edit2, Trash2, Star, X, GraduationCap, Crown, Eye, Upload, Plus } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

const SUGGESTED_LABELS = [
  "432 Hz", "High Vibe", "Manifestation", "Mindset", "Music Business",
  "Behind The Song", "Artist Development", "Frequency Education",
  "Creative Energy", "Spiritual Growth",
];

const EMPTY_FORM = {
  title: "", description: "", video_url: "", embed_url: "",
  thumbnail_url: "", labels: [], is_premium: true, free_preview_seconds: 60,
  is_featured: false, status: "published", display_order: 0,
};

function toEmbedUrl(url) {
  if (!url) return "";
  const m = url.match(/(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/);
  return m ? `https://www.youtube.com/embed/${m[1]}` : (url.includes("/embed/") ? url : "");
}

function LabelPicker({ labels = [], onChange }) {
  const [custom, setCustom] = useState("");

  const toggle = (label) => {
    if (labels.includes(label)) onChange(labels.filter((l) => l !== label));
    else onChange([...labels, label]);
  };

  const addCustom = () => {
    const val = custom.trim();
    if (val && !labels.includes(val)) {
      onChange([...labels, val]);
    }
    setCustom("");
  };

  return (
    <div>
      <div className="flex flex-wrap gap-1.5 mb-2">
        {SUGGESTED_LABELS.map((l) => (
          <button key={l} type="button" onClick={() => toggle(l)}
            className="px-2.5 py-1 rounded-full text-[10px] font-bold transition-all"
            style={labels.includes(l)
              ? { background: "rgba(212,168,67,0.2)", border: "1px solid rgba(212,168,67,0.5)", color: "#D4A843" }
              : { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.4)" }
            }>
            {l}
          </button>
        ))}
      </div>
      <div className="flex gap-2 mt-1">
        <input value={custom} onChange={(e) => setCustom(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addCustom(); } }}
          placeholder="Custom label..."
          className="flex-1 px-3 py-1.5 rounded-lg text-xs text-white focus:outline-none"
          style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)" }} />
        <button type="button" onClick={addCustom}
          className="px-3 py-1.5 rounded-lg text-xs font-bold text-white/50 hover:text-white border border-white/10">
          <Plus className="w-3 h-3" />
        </button>
      </div>
      {labels.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-1.5">
          {labels.map((l) => (
            <span key={l} className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold"
              style={{ background: "rgba(212,168,67,0.15)", border: "1px solid rgba(212,168,67,0.3)", color: "#D4A843" }}>
              {l}
              <button type="button" onClick={() => onChange(labels.filter((x) => x !== l))} className="hover:text-red-400">
                <X className="w-2.5 h-2.5" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export default function AcademyVideoManager({ onRefresh }) {
  const [lessons, setLessons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingLesson, setEditingLesson] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [uploadingThumb, setUploadingThumb] = useState(false);

  const load = async () => {
    setLoading(true);
    const data = await base44.entities.AcademyLesson.list("-release_date", 200);
    setLessons(data);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const openEdit = (lesson) => {
    setEditingLesson(lesson);
    setForm({ ...EMPTY_FORM, ...lesson, labels: lesson.labels || [] });
  };

  const handleVideoUrlChange = (url) => {
    const embed = toEmbedUrl(url);
    setForm((f) => ({ ...f, video_url: url, embed_url: embed }));
  };

  const handleThumbUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingThumb(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setForm((f) => ({ ...f, thumbnail_url: file_url }));
    setUploadingThumb(false);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.title) return toast.error("Title is required");
    setSaving(true);
    await base44.entities.AcademyLesson.update(editingLesson.id, form);
    toast.success("Lesson updated!");
    setSaving(false);
    setEditingLesson(null);
    load();
    onRefresh?.();
  };

  const handleDelete = async (lesson) => {
    if (!confirm(`Delete "${lesson.title}"?`)) return;
    await base44.entities.AcademyLesson.delete(lesson.id);
    toast.success("Deleted");
    load();
    onRefresh?.();
  };

  const toggleFeatured = async (lesson) => {
    await base44.entities.AcademyLesson.update(lesson.id, { is_featured: !lesson.is_featured });
    load();
  };

  return (
    <div className="mt-8">
      <h3 className="font-heading font-bold text-lg text-white mb-4 flex items-center gap-2">
        <GraduationCap className="w-4 h-4 text-yellow-400" /> Imported Academy Videos ({lessons.length})
      </h3>

      {/* Edit Modal */}
      <AnimatePresence>
        {editingLesson && (
          <motion.div className="fixed inset-0 z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setEditingLesson(null)} />
            <motion.form onSubmit={handleSave}
              initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}
              className="relative w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-2xl p-6 grid grid-cols-2 gap-4"
              style={{ background: "#0a0a1e", border: "1px solid rgba(212,168,67,0.2)" }}>
              <div className="col-span-2 flex items-center justify-between mb-2">
                <h3 className="font-heading font-bold text-base text-white">Edit Academy Video</h3>
                <button type="button" onClick={() => setEditingLesson(null)} className="text-white/30 hover:text-white/70">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="col-span-2">
                <label className="text-xs font-semibold tracking-wider uppercase text-white/40 mb-1.5 block">Title *</label>
                <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required
                  className="w-full px-3 py-2 rounded-lg text-sm text-white focus:outline-none"
                  style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }} />
              </div>

              <div className="col-span-2">
                <label className="text-xs font-semibold tracking-wider uppercase text-white/40 mb-1.5 block">Description</label>
                <textarea value={form.description || ""} onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg text-sm text-white focus:outline-none h-20 resize-none"
                  style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }} />
              </div>

              <div>
                <label className="text-xs font-semibold tracking-wider uppercase text-white/40 mb-1.5 block">Status</label>
                <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg text-sm text-white focus:outline-none"
                  style={{ background: "rgba(20,20,40,1)", border: "1px solid rgba(255,255,255,0.1)" }}>
                  <option value="published">Published</option>
                  <option value="draft">Draft</option>
                  <option value="archived">Archived</option>
                </select>
              </div>

              <div className="flex flex-col gap-2.5 justify-center">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={!!form.is_premium} onChange={(e) => setForm({ ...form, is_premium: e.target.checked })} className="accent-yellow-400 w-4 h-4" />
                  <span className="text-sm text-white/70">Premium only</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={!!form.is_featured} onChange={(e) => setForm({ ...form, is_featured: e.target.checked })} className="accent-yellow-400 w-4 h-4" />
                  <span className="text-sm text-white/70">Featured</span>
                </label>
              </div>

              <div className="col-span-2">
                <label className="text-xs font-semibold tracking-wider uppercase text-white/40 mb-1.5 block">
                  YouTube URL <span className="normal-case font-normal text-white/25">(auto-converts to embed)</span>
                </label>
                <input value={form.video_url || ""} onChange={(e) => handleVideoUrlChange(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg text-sm text-white focus:outline-none"
                  style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}
                  placeholder="https://www.youtube.com/watch?v=..." />
                {form.embed_url && <p className="text-[10px] text-yellow-400/50 mt-1">✓ Embed: {form.embed_url}</p>}
              </div>

              <div className="col-span-2">
                <label className="text-xs font-semibold tracking-wider uppercase text-white/40 mb-1.5 block">Thumbnail</label>
                <div className="flex gap-2 items-center">
                  {form.thumbnail_url && (
                    <img src={form.thumbnail_url} alt="" className="w-14 h-10 object-cover rounded-lg flex-shrink-0" />
                  )}
                  <label className="cursor-pointer flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all"
                    style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.6)" }}>
                    <Upload className="w-3 h-3" /> {uploadingThumb ? "Uploading..." : "Upload"}
                    <input type="file" accept="image/*" className="hidden" onChange={handleThumbUpload} disabled={uploadingThumb} />
                  </label>
                  <input value={form.thumbnail_url || ""} onChange={(e) => setForm({ ...form, thumbnail_url: e.target.value })}
                    placeholder="Or paste thumbnail URL"
                    className="flex-1 px-3 py-2 rounded-lg text-xs text-white focus:outline-none"
                    style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }} />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold tracking-wider uppercase text-white/40 mb-1.5 block">Free Preview (seconds)</label>
                <input type="number" min={0} value={form.free_preview_seconds}
                  onChange={(e) => setForm({ ...form, free_preview_seconds: parseInt(e.target.value) || 60 })}
                  className="w-full px-3 py-2 rounded-lg text-sm text-white focus:outline-none"
                  style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }} />
              </div>

              <div className="col-span-2">
                <label className="text-xs font-semibold tracking-wider uppercase text-white/40 mb-1.5 block">Labels / Tags</label>
                <LabelPicker labels={form.labels || []} onChange={(labels) => setForm({ ...form, labels })} />
              </div>

              <div className="col-span-2 flex gap-3">
                <button type="submit" disabled={saving}
                  className="px-6 py-2.5 rounded-xl font-bold text-sm hover:brightness-110 transition-all disabled:opacity-50"
                  style={{ background: "linear-gradient(135deg,#D4A843,#F0C060)", color: "#000" }}>
                  {saving ? "Saving..." : "Save Changes"}
                </button>
                <button type="button" onClick={() => setEditingLesson(null)}
                  className="px-4 py-2.5 rounded-xl text-sm text-white/40 hover:text-white/70 border border-white/10">
                  Cancel
                </button>
              </div>
            </motion.form>
          </motion.div>
        )}
      </AnimatePresence>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-5 h-5 border-2 border-yellow-400/20 border-t-yellow-400 rounded-full animate-spin" />
        </div>
      ) : lessons.length === 0 ? (
        <div className="text-center py-12 text-white/25 text-sm">No Academy videos yet. Import some above.</div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {lessons.map((lesson) => (
            <div key={lesson.id} className="rounded-xl overflow-hidden"
              style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.07)" }}>
              <div className="aspect-video relative bg-black">
                {lesson.thumbnail_url ? (
                  <img src={lesson.thumbnail_url} alt={lesson.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <GraduationCap className="w-8 h-8 text-white/10" />
                  </div>
                )}
                <div className="absolute top-2 left-2 flex gap-1 flex-wrap">
                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase ${lesson.status === "published" ? "bg-green-500/20 text-green-400" : "bg-white/10 text-white/40"}`}>
                    {lesson.status}
                  </span>
                  {lesson.is_premium && (
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-yellow-500/20 text-yellow-400 flex items-center gap-0.5">
                      <Crown className="w-2.5 h-2.5" /> Premium
                    </span>
                  )}
                  {lesson.is_featured && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-yellow-500/20 text-yellow-400">Featured</span>}
                </div>
              </div>
              <div className="p-3">
                <p className="text-sm font-bold text-white truncate">{lesson.title}</p>
                {lesson.labels?.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {lesson.labels.slice(0, 3).map((l) => (
                      <span key={l} className="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                        style={{ background: "rgba(212,168,67,0.12)", color: "#D4A843" }}>{l}</span>
                    ))}
                  </div>
                )}
                {lesson.is_premium && (
                  <p className="text-[9px] text-white/30 flex items-center gap-1 mt-1">
                    <Eye className="w-2.5 h-2.5" /> {lesson.free_preview_seconds}s free preview
                  </p>
                )}
                <div className="flex items-center gap-1 mt-3 justify-end">
                  <button onClick={() => toggleFeatured(lesson)} title="Toggle featured"
                    className={`p-1.5 rounded-lg transition-all ${lesson.is_featured ? "text-yellow-400" : "text-white/30 hover:text-yellow-400"}`}>
                    <Star className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => openEdit(lesson)} className="p-1.5 rounded-lg text-white/30 hover:text-yellow-400 transition-all">
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => handleDelete(lesson)} className="p-1.5 rounded-lg text-white/30 hover:text-red-400 transition-all">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}