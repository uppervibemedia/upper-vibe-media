import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Upload, Music, Image, Check, Loader2, X, Save } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import TierAccessPicker from "./TierAccessPicker";
import MultiSelectPicker from "./MultiSelectPicker";
import AIClassifierPanel from "./AIClassifierPanel";
import TrackVersionManager from "./TrackVersionManager";

const EMPTY = {
  title: "",
  artist_display: "",
  primary_artist_id: "",
  featured_artist_ids: [],
  album: "",
  description: "",
  category_ids: [],
  tier_access: ["free"],
  frequency_type: "standard",
  frequency_hz: "",
  duration: "",
  status: "published",
  is_featured: false,
  is_new_release: false,
  is_downloadable: false,
  audio_url: "",
  cover_url: "",
};

export default function TrackEditForm({ track, artists, categories, onSaved, onCancel, showAI = true }) {
  const [form, setForm] = useState(track ? { ...EMPTY, ...track } : EMPTY);
  const [audioFile, setAudioFile] = useState(null);
  const [coverPreview, setCoverPreview] = useState(track?.cover_url || null);
  const [uploadingAudio, setUploadingAudio] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [saving, setSaving] = useState(false);

  const isEdit = !!track?.id;

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
    setCoverPreview(URL.createObjectURL(file));
    setUploadingCover(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setForm((f) => ({ ...f, cover_url: file_url }));
    setUploadingCover(false);
    toast.success("Cover art uploaded!");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title) return toast.error("Title is required.");
    setSaving(true);
    const payload = {
      ...form,
      frequency_hz: form.frequency_hz !== "" && form.frequency_hz != null ? parseFloat(form.frequency_hz) : undefined,
      is_premium: !form.tier_access.includes("free"),
      min_tier: form.tier_access.includes("free") ? "free" : form.tier_access.includes("supporter") ? "supporter" : "premium",
    };
    if (isEdit) {
      await base44.entities.Track.update(track.id, payload);
      toast.success(`"${form.title}" updated!`);
    } else {
      await base44.entities.Track.create(payload);
      toast.success(`"${form.title}" added to catalog!`);
    }
    setSaving(false);
    onSaved();
  };

  const artistOptions = artists.map((a) => ({ value: a.id, label: a.name }));
  const categoryOptions = categories.map((c) => ({ value: c.id, label: c.name, description: c.type }));

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card/60 border border-border/30 rounded-2xl p-6 md:p-8"
    >
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-heading font-bold text-xl">{isEdit ? "Edit Track" : "Upload New Track"}</h2>
        {onCancel && (
          <button onClick={onCancel} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {showAI && (
        <div className="mb-6">
          <AIClassifierPanel
            track={form}
            artists={artists}
            categories={categories}
            onApply={(suggestions) => setForm((f) => ({ ...f, ...suggestions }))}
          />
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Media uploads */}
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

          {/* Audio */}
          <div>
            <label className="text-xs font-semibold tracking-wider uppercase text-muted-foreground mb-2 block">Audio File</label>
            <label className="cursor-pointer block">
              <div className={`aspect-square rounded-xl border-2 border-dashed flex flex-col items-center justify-center transition-all gap-2 ${form.audio_url ? "border-primary/40 bg-primary/5" : "border-border/40 hover:border-primary/30"}`}>
                {uploadingAudio ? (
                  <Loader2 className="w-8 h-8 text-primary animate-spin" />
                ) : form.audio_url ? (
                  <>
                    <Check className="w-8 h-8 text-primary" />
                    <p className="text-xs text-primary font-medium text-center px-2 truncate w-full">
                      {audioFile?.name || "Audio ready"}
                    </p>
                  </>
                ) : (
                  <>
                    <Music className="w-8 h-8 text-muted-foreground" />
                    <p className="text-xs text-muted-foreground">MP3 / WAV</p>
                  </>
                )}
              </div>
              <input type="file" accept="audio/*" className="hidden" onChange={handleAudioChange} />
            </label>
          </div>
        </div>

        {/* Core fields */}
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="text-xs font-semibold tracking-wider uppercase text-muted-foreground mb-1.5 block">Title *</label>
            <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Track title" className="bg-card/40 border-border/30" required />
          </div>

          <div className="col-span-2">
            <label className="text-xs font-semibold tracking-wider uppercase text-muted-foreground mb-1.5 block">Artist Display Name</label>
            <Input value={form.artist_display} onChange={(e) => setForm({ ...form, artist_display: e.target.value })} placeholder="e.g. Jmack So Lavish feat. Aura Rae" className="bg-card/40 border-border/30" />
          </div>

          <div>
            <label className="text-xs font-semibold tracking-wider uppercase text-muted-foreground mb-1.5 block">Primary Artist</label>
            <Select value={form.primary_artist_id || ""} onValueChange={(v) => setForm({ ...form, primary_artist_id: v })}>
              <SelectTrigger className="bg-card/40 border-border/30">
                <SelectValue placeholder="Select artist" />
              </SelectTrigger>
              <SelectContent>
                {artists.map((a) => (
                  <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-xs font-semibold tracking-wider uppercase text-muted-foreground mb-1.5 block">Album / Project</label>
            <Input value={form.album} onChange={(e) => setForm({ ...form, album: e.target.value })} placeholder="Album name" className="bg-card/40 border-border/30" />
          </div>

          <div>
            <label className="text-xs font-semibold tracking-wider uppercase text-muted-foreground mb-1.5 block">Duration</label>
            <Input value={form.duration} onChange={(e) => setForm({ ...form, duration: e.target.value })} placeholder="3:45" className="bg-card/40 border-border/30" />
          </div>

          <div>
            <label className="text-xs font-semibold tracking-wider uppercase text-muted-foreground mb-1.5 block">Frequency Type</label>
            <Select value={form.frequency_type || "standard"} onValueChange={(v) => setForm({ ...form, frequency_type: v })}>
              <SelectTrigger className="bg-card/40 border-border/30">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="standard">Standard</SelectItem>
                <SelectItem value="432hz">432 Hz</SelectItem>
                <SelectItem value="528hz">528 Hz</SelectItem>
                <SelectItem value="binaural">Binaural</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-xs font-semibold tracking-wider uppercase text-muted-foreground mb-1.5 block">Status</label>
            <Select value={form.status || "published"} onValueChange={(v) => setForm({ ...form, status: v })}>
              <SelectTrigger className="bg-card/40 border-border/30">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="published">Published</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="col-span-2">
            <MultiSelectPicker
              label="Categories (assign to multiple)"
              options={categoryOptions}
              selected={form.category_ids || []}
              onChange={(v) => setForm({ ...form, category_ids: v })}
              placeholder="Select categories..."
            />
          </div>

          <div className="col-span-2">
            <MultiSelectPicker
              label="Featured Artists"
              options={artistOptions}
              selected={form.featured_artist_ids || []}
              onChange={(v) => setForm({ ...form, featured_artist_ids: v })}
              placeholder="Select featured artists..."
            />
          </div>

          <div className="col-span-2">
            <TierAccessPicker
              value={form.tier_access || ["free"]}
              onChange={(v) => setForm({ ...form, tier_access: v })}
            />
          </div>

          <div className="col-span-2">
            <div className="rounded-xl border border-border/30 bg-muted/10 p-4">
              <p className="text-xs font-bold tracking-wider uppercase text-muted-foreground mb-3">Download Settings</p>
              <div className="flex flex-wrap gap-6">
                {[
                  { key: "is_downloadable", label: "Downloadable (Premium only)" },
                  { key: "offline_enabled", label: "Offline enabled" },
                ].map(({ key, label }) => (
                  <label key={key} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={!!form[key]}
                      onChange={(e) => setForm({ ...form, [key]: e.target.checked })}
                      className="accent-primary w-4 h-4"
                    />
                    <span className="text-sm text-foreground">{label}</span>
                  </label>
                ))}
              </div>
              <p className="text-[10px] text-muted-foreground mt-2">Downloads are always restricted to Premium members.</p>
            </div>
          </div>

          <div className="col-span-2 flex flex-wrap gap-6">
            {[
              { key: "is_featured", label: "Featured track" },
              { key: "is_new_release", label: "New release" },
            ].map(({ key, label }) => (
              <label key={key} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={!!form[key]}
                  onChange={(e) => setForm({ ...form, [key]: e.target.checked })}
                  className="accent-primary w-4 h-4"
                />
                <span className="text-sm text-foreground">{label}</span>
              </label>
            ))}
          </div>
        </div>

        {isEdit && (
          <div className="col-span-2">
            <TrackVersionManager trackId={track.id} />
          </div>
        )}

        <div className="flex gap-3">
          <Button type="submit" disabled={saving} className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90 font-heading font-semibold tracking-wider uppercase py-6 text-base">
            {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...</> : <><Save className="w-4 h-4 mr-2" /> {isEdit ? "Save Changes" : "Add to Catalog"}</>}
          </Button>
          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel} className="px-6">Cancel</Button>
          )}
        </div>
      </form>
    </motion.div>
  );
}