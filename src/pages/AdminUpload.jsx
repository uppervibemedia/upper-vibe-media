import React, { useState } from "react";
import { motion } from "framer-motion";
import { Upload, Music, Image, Check, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import TierAccessPicker from "../components/admin/TierAccessPicker";

const EMPTY_FORM = {
  title: "",
  artist: "",
  album: "",
  category: "",
  duration: "",
  tier_access: ["free"],
  is_featured: false,
  audio_url: "",
  cover_url: "",
};

export default function AdminUpload() {
  const [form, setForm] = useState(EMPTY_FORM);
  const [audioFile, setAudioFile] = useState(null);
  const [coverFile, setCoverFile] = useState(null);
  const [coverPreview, setCoverPreview] = useState(null);
  const [uploadingAudio, setUploadingAudio] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleAudioChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setAudioFile(file);
    setUploadingAudio(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setForm((f) => ({ ...f, audio_url: file_url }));
    setUploadingAudio(false);
    toast.success("Audio uploaded!");
  };

  const handleCoverChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setCoverFile(file);
    setCoverPreview(URL.createObjectURL(file));
    setUploadingCover(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setForm((f) => ({ ...f, cover_url: file_url }));
    setUploadingCover(false);
    toast.success("Cover art uploaded!");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title || !form.artist) return toast.error("Title and artist are required.");
    setSaving(true);
    await base44.entities.Track.create({
      ...form,
      is_premium: !form.tier_access.includes("free"),
      min_tier: form.tier_access.includes("free") ? "free" : form.tier_access.includes("supporter") ? "supporter" : "premium",
    });
    toast.success(`"${form.title}" added to the catalog!`);
    setForm(EMPTY_FORM);
    setAudioFile(null);
    setCoverFile(null);
    setCoverPreview(null);
    setSaving(false);
  };

  return (
    <div className="max-w-2xl mx-auto px-6 py-12">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <p className="text-xs tracking-[0.3em] uppercase text-secondary mb-2 text-glow-gold">Admin</p>
        <h1 className="font-heading font-extrabold text-3xl md:text-4xl mb-8">Upload Track</h1>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Cover Art + Audio uploads side by side */}
          <div className="grid grid-cols-2 gap-4">
            {/* Cover Art */}
            <div>
              <label className="text-xs font-semibold tracking-wider uppercase text-muted-foreground mb-2 block">Cover Art</label>
              <label className="cursor-pointer block">
                <div className={`relative aspect-square rounded-xl border-2 border-dashed flex items-center justify-center overflow-hidden transition-all ${coverPreview ? "border-primary/40" : "border-border/40 hover:border-primary/30"}`}>
                  {coverPreview ? (
                    <img src={coverPreview} alt="Cover" className="w-full h-full object-cover" />
                  ) : (
                    <div className="text-center p-4">
                      <Image className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                      <p className="text-xs text-muted-foreground">Upload image</p>
                    </div>
                  )}
                  {uploadingCover && (
                    <div className="absolute inset-0 bg-background/70 flex items-center justify-center">
                      <Loader2 className="w-6 h-6 text-primary animate-spin" />
                    </div>
                  )}
                  {form.cover_url && !uploadingCover && (
                    <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                      <Check className="w-3 h-3 text-primary-foreground" />
                    </div>
                  )}
                </div>
                <input type="file" accept="image/*" className="hidden" onChange={handleCoverChange} />
              </label>
            </div>

            {/* Audio File */}
            <div>
              <label className="text-xs font-semibold tracking-wider uppercase text-muted-foreground mb-2 block">Audio File</label>
              <label className="cursor-pointer block">
                <div className={`aspect-square rounded-xl border-2 border-dashed flex flex-col items-center justify-center transition-all gap-2 ${form.audio_url ? "border-primary/40 bg-primary/5" : "border-border/40 hover:border-primary/30"}`}>
                  {uploadingAudio ? (
                    <Loader2 className="w-8 h-8 text-primary animate-spin" />
                  ) : form.audio_url ? (
                    <>
                      <Check className="w-8 h-8 text-primary" />
                      <p className="text-xs text-primary font-medium text-center px-2 truncate w-full text-center">
                        {audioFile?.name}
                      </p>
                    </>
                  ) : (
                    <>
                      <Music className="w-8 h-8 text-muted-foreground" />
                      <p className="text-xs text-muted-foreground">Upload MP3 / WAV</p>
                    </>
                  )}
                </div>
                <input type="file" accept="audio/*" className="hidden" onChange={handleAudioChange} />
              </label>
            </div>
          </div>

          {/* Track details */}
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="text-xs font-semibold tracking-wider uppercase text-muted-foreground mb-1.5 block">Title *</label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Track title" className="bg-card/40 border-border/30" required />
            </div>
            <div>
              <label className="text-xs font-semibold tracking-wider uppercase text-muted-foreground mb-1.5 block">Artist *</label>
              <Input value={form.artist} onChange={(e) => setForm({ ...form, artist: e.target.value })} placeholder="Artist name" className="bg-card/40 border-border/30" required />
            </div>
            <div>
              <label className="text-xs font-semibold tracking-wider uppercase text-muted-foreground mb-1.5 block">Album</label>
              <Input value={form.album} onChange={(e) => setForm({ ...form, album: e.target.value })} placeholder="Album name" className="bg-card/40 border-border/30" />
            </div>
            <div>
              <label className="text-xs font-semibold tracking-wider uppercase text-muted-foreground mb-1.5 block">Duration</label>
              <Input value={form.duration} onChange={(e) => setForm({ ...form, duration: e.target.value })} placeholder="e.g. 3:45" className="bg-card/40 border-border/30" />
            </div>
            <div>
              <label className="text-xs font-semibold tracking-wider uppercase text-muted-foreground mb-1.5 block">Category</label>
              <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                <SelectTrigger className="bg-card/40 border-border/30">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="high_vibe_hiphop">High Vibe Hip-Hop</SelectItem>
                  <SelectItem value="reprogramming_sessions">Reprogramming Sessions</SelectItem>
                  <SelectItem value="432_collection">432 Collection</SelectItem>
                  <SelectItem value="remastered">Remastered</SelectItem>
                  <SelectItem value="exclusive_drops">Exclusive Drops</SelectItem>
                  <SelectItem value="meditation_focus">Meditation / Focus</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2">
              <TierAccessPicker
                value={form.tier_access}
                onChange={(v) => setForm({ ...form, tier_access: v })}
              />
            </div>
            <div className="col-span-2 flex gap-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.is_featured} onChange={(e) => setForm({ ...form, is_featured: e.target.checked })} className="accent-primary w-4 h-4" />
                <span className="text-sm text-foreground">Featured track</span>
              </label>
            </div>
          </div>

          <Button type="submit" disabled={saving} className="w-full bg-primary text-primary-foreground hover:bg-primary/90 font-heading font-semibold tracking-wider uppercase py-6 text-base">
            {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...</> : <><Upload className="w-4 h-4 mr-2" /> Add to Catalog</>}
          </Button>
        </form>
      </motion.div>
    </div>
  );
}