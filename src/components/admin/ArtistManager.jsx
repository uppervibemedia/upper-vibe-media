import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Edit2, X, Upload, Music, Star, Instagram } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

const EMPTY_FORM = {
  name: "", slug: "", bio: "", type: "solo", genre: "",
  is_active: true, is_featured: false, image_url: "", banner_url: "",
  social_links: { spotify: "", youtube: "", apple_music: "", instagram: "", tiktok: "" },
};

function slugify(str) {
  return str.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
}

export default function ArtistManager({ artists, onRefresh }) {
  const [editingArtist, setEditingArtist] = useState(null); // null = closed, {} = new, artist = edit
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);

  const openNew = () => {
    setForm(EMPTY_FORM);
    setEditingArtist({});
  };

  const openEdit = (artist) => {
    setEditingArtist(artist);
    setForm({
      ...EMPTY_FORM,
      ...artist,
      social_links: { ...EMPTY_FORM.social_links, ...(artist.social_links || {}) },
    });
  };

  const close = () => setEditingArtist(null);

  const handleNameChange = (name) => {
    setForm((f) => ({ ...f, name, slug: f.slug || slugify(name) }));
  };

  const handleImageUpload = async (e, field) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const setter = field === "image_url" ? setUploadingImage : setUploadingBanner;
    setter(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setForm((f) => ({ ...f, [field]: file_url }));
    setter(false);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.name) return toast.error("Artist name is required");
    setSaving(true);
    if (editingArtist?.id) {
      await base44.entities.Artist.update(editingArtist.id, form);
      toast.success("Artist updated!");
    } else {
      await base44.entities.Artist.create(form);
      toast.success("Artist created!");
    }
    setSaving(false);
    close();
    onRefresh();
  };

  const handleDelete = async (artist) => {
    if (!confirm(`Delete artist "${artist.name}"?`)) return;
    await base44.entities.Artist.delete(artist.id);
    toast.success("Artist deleted");
    onRefresh();
  };

  const setSocial = (key, val) =>
    setForm((f) => ({ ...f, social_links: { ...f.social_links, [key]: val } }));

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-heading font-bold text-xl">Artists ({artists.length})</h2>
        <button onClick={openNew}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all hover:bg-primary/20"
          style={{ background: "rgba(0,229,255,0.08)", border: "1px solid rgba(0,229,255,0.25)", color: "#00E5FF" }}>
          <Plus className="w-4 h-4" /> Add Artist
        </button>
      </div>

      {/* Artist grid */}
      <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {artists.map((artist) => (
          <div key={artist.id} className="rounded-2xl overflow-hidden group relative"
            style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.07)" }}>
            <div className="aspect-square relative bg-black">
              {artist.image_url ? (
                <img src={artist.image_url} alt={artist.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center"
                  style={{ background: "rgba(0,229,255,0.04)" }}>
                  <Music className="w-10 h-10 text-white/10" />
                </div>
              )}
              {artist.is_featured && (
                <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full text-[9px] font-black"
                  style={{ background: "rgba(212,168,67,0.9)", color: "#000" }}>
                  <Star className="w-2.5 h-2.5 inline mr-0.5" />Featured
                </div>
              )}
              {/* Edit overlay */}
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2"
                style={{ background: "rgba(0,0,0,0.6)" }}>
                <button onClick={() => openEdit(artist)}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1"
                  style={{ background: "rgba(0,229,255,0.2)", border: "1px solid rgba(0,229,255,0.4)", color: "#00E5FF" }}>
                  <Edit2 className="w-3 h-3" /> Edit
                </button>
              </div>
            </div>
            <div className="p-3 flex items-center justify-between">
              <div className="min-w-0">
                <p className="text-sm font-bold text-white truncate">{artist.name}</p>
                <p className="text-[10px] text-white/35 uppercase tracking-wider">{artist.genre || artist.type}</p>
              </div>
              <button onClick={() => openEdit(artist)} className="p-1.5 text-white/30 hover:text-cyan-400 transition-colors flex-shrink-0">
                <Edit2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
        {artists.length === 0 && (
          <p className="col-span-4 text-center text-white/25 py-12 text-sm">No artists yet. Click Add Artist to get started.</p>
        )}
      </div>

      {/* Edit / Create Modal */}
      <AnimatePresence>
        {editingArtist !== null && (
          <motion.div className="fixed inset-0 z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={close} />
            <motion.form onSubmit={handleSave}
              initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}
              className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl p-6"
              style={{ background: "#0a0a1e", border: "1px solid rgba(0,229,255,0.2)" }}
              onClick={(e) => e.stopPropagation()}>

              <div className="flex items-center justify-between mb-5">
                <h3 className="font-heading font-bold text-lg text-white">
                  {editingArtist?.id ? "Edit Artist" : "Add Artist"}
                </h3>
                <button type="button" onClick={close} className="text-white/30 hover:text-white/70">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Profile Picture */}
                <div className="col-span-2">
                  <label className="text-xs font-semibold tracking-wider uppercase text-white/40 mb-2 block">Profile Picture</label>
                  <div className="flex items-center gap-4">
                    <div className="w-20 h-20 rounded-2xl overflow-hidden flex-shrink-0"
                      style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}>
                      {form.image_url ? (
                        <img src={form.image_url} alt="Preview" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Music className="w-8 h-8 text-white/10" />
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col gap-2">
                      <label className="cursor-pointer flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all hover:brightness-110"
                        style={{ background: "rgba(0,229,255,0.08)", border: "1px solid rgba(0,229,255,0.25)", color: "#00E5FF" }}>
                        <Upload className="w-3.5 h-3.5" />
                        {uploadingImage ? "Uploading..." : "Upload Photo"}
                        <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, "image_url")} disabled={uploadingImage} />
                      </label>
                      <input value={form.image_url || ""} onChange={(e) => setForm({ ...form, image_url: e.target.value })}
                        placeholder="Or paste image URL"
                        className="px-3 py-1.5 rounded-lg text-xs text-white focus:outline-none"
                        style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }} />
                    </div>
                  </div>
                </div>

                {/* Name */}
                <div className="col-span-2 md:col-span-1">
                  <label className="text-xs font-semibold tracking-wider uppercase text-white/40 mb-1.5 block">Name *</label>
                  <input value={form.name} onChange={(e) => handleNameChange(e.target.value)} required
                    className="w-full px-3 py-2 rounded-lg text-sm text-white focus:outline-none"
                    style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }} />
                </div>

                {/* Genre */}
                <div className="col-span-2 md:col-span-1">
                  <label className="text-xs font-semibold tracking-wider uppercase text-white/40 mb-1.5 block">Genre</label>
                  <input value={form.genre || ""} onChange={(e) => setForm({ ...form, genre: e.target.value })}
                    placeholder="Hip Hop, R&B, Electronic..."
                    className="w-full px-3 py-2 rounded-lg text-sm text-white focus:outline-none"
                    style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }} />
                </div>

                {/* Type */}
                <div>
                  <label className="text-xs font-semibold tracking-wider uppercase text-white/40 mb-1.5 block">Type</label>
                  <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg text-sm text-white focus:outline-none"
                    style={{ background: "rgba(20,20,40,1)", border: "1px solid rgba(255,255,255,0.1)" }}>
                    <option value="solo">Solo</option>
                    <option value="group">Group</option>
                    <option value="brand">Brand</option>
                    <option value="alias">Alias</option>
                  </select>
                </div>

                {/* Flags */}
                <div className="flex flex-col gap-2.5 justify-center">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={!!form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} className="accent-cyan-400 w-4 h-4" />
                    <span className="text-sm text-white/70">Active</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={!!form.is_featured} onChange={(e) => setForm({ ...form, is_featured: e.target.checked })} className="accent-yellow-400 w-4 h-4" />
                    <span className="text-sm text-white/70">Featured</span>
                  </label>
                </div>

                {/* Bio */}
                <div className="col-span-2">
                  <label className="text-xs font-semibold tracking-wider uppercase text-white/40 mb-1.5 block">Bio</label>
                  <textarea value={form.bio || ""} onChange={(e) => setForm({ ...form, bio: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg text-sm text-white focus:outline-none h-20 resize-none"
                    style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }} />
                </div>

                {/* Social links */}
                <div className="col-span-2">
                  <label className="text-xs font-semibold tracking-wider uppercase text-white/40 mb-2 block">Social Links</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {[
                      { key: "spotify", label: "Spotify URL" },
                      { key: "youtube", label: "YouTube URL" },
                      { key: "apple_music", label: "Apple Music URL" },
                      { key: "instagram", label: "Instagram URL" },
                      { key: "tiktok", label: "TikTok URL" },
                    ].map(({ key, label }) => (
                      <input key={key} value={form.social_links?.[key] || ""} onChange={(e) => setSocial(key, e.target.value)}
                        placeholder={label}
                        className="w-full px-3 py-2 rounded-lg text-xs text-white focus:outline-none"
                        style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }} />
                    ))}
                  </div>
                </div>

                {/* Banner upload */}
                <div className="col-span-2">
                  <label className="text-xs font-semibold tracking-wider uppercase text-white/40 mb-1.5 block">Banner Image (optional)</label>
                  <div className="flex gap-3 items-center">
                    <label className="cursor-pointer flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all hover:brightness-110"
                      style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.5)" }}>
                      <Upload className="w-3.5 h-3.5" />
                      {uploadingBanner ? "Uploading..." : "Upload Banner"}
                      <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, "banner_url")} disabled={uploadingBanner} />
                    </label>
                    <input value={form.banner_url || ""} onChange={(e) => setForm({ ...form, banner_url: e.target.value })}
                      placeholder="Or paste banner URL"
                      className="flex-1 px-3 py-2 rounded-lg text-xs text-white focus:outline-none"
                      style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }} />
                  </div>
                </div>

                {/* Actions */}
                <div className="col-span-2 flex items-center gap-3 pt-2">
                  <button type="submit" disabled={saving}
                    className="px-6 py-2.5 rounded-xl font-bold text-sm hover:brightness-110 transition-all disabled:opacity-50"
                    style={{ background: "linear-gradient(135deg,#00B8D4,#00E5FF)", color: "#000" }}>
                    {saving ? "Saving..." : editingArtist?.id ? "Save Changes" : "Create Artist"}
                  </button>
                  <button type="button" onClick={close}
                    className="px-4 py-2.5 rounded-xl text-sm text-white/40 hover:text-white/70 border border-white/10">
                    Cancel
                  </button>
                  {editingArtist?.id && (
                    <button type="button" onClick={() => { close(); handleDelete(editingArtist); }}
                      className="ml-auto px-4 py-2.5 rounded-xl text-sm text-red-400/60 hover:text-red-400 border border-red-400/20 transition-colors">
                      Delete Artist
                    </button>
                  )}
                </div>
              </div>
            </motion.form>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}