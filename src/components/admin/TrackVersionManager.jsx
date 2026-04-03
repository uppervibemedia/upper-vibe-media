import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Trash2, Music, Check, Loader2, GripVertical, ChevronDown, ChevronUp, Lock } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import TierAccessPicker from "./TierAccessPicker";

const EMPTY_VERSION = {
  version_name: "",
  frequency_type: "standard",
  audio_url: "",
  tier_access: ["free"],
  is_downloadable: false,
  is_active: true,
  display_order: 0,
};

const FREQ_LABELS = {
  standard: "Standard",
  "432hz": "432 Hz",
  "528hz": "528 Hz",
  binaural: "Binaural",
  remastered: "Remastered",
  other: "Other",
};

const TIER_COLORS = {
  free: "text-green-400 bg-green-400/10 border-green-400/20",
  supporter: "text-purple-400 bg-purple-400/10 border-purple-400/20",
  premium: "text-primary bg-primary/10 border-primary/20",
};

function VersionRow({ version, onSave, onDelete }) {
  const [editing, setEditing] = useState(!version.id);
  const [form, setForm] = useState(version);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleAudioUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setForm((f) => ({ ...f, audio_url: file_url }));
    setUploading(false);
    toast.success("Audio uploaded!");
  };

  const handleSave = async () => {
    if (!form.version_name) return toast.error("Version name is required.");
    setSaving(true);
    await onSave(form);
    setSaving(false);
    setEditing(false);
  };

  const tierLabel = form.tier_access?.includes("free") ? "Free" : form.tier_access?.includes("supporter") ? "Supporter+" : "Premium";
  const tierKey = form.tier_access?.includes("free") ? "free" : form.tier_access?.includes("supporter") ? "supporter" : "premium";

  if (!editing) {
    return (
      <div className="flex items-center gap-3 p-3 rounded-xl bg-card/30 border border-border/20 group">
        <GripVertical className="w-4 h-4 text-muted-foreground/40 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-semibold text-foreground">{form.version_name}</p>
            <span className="text-[10px] font-bold tracking-wider uppercase px-1.5 py-0.5 rounded border text-muted-foreground bg-muted/30 border-border/30">
              {FREQ_LABELS[form.frequency_type] || form.frequency_type}
            </span>
            <span className={`text-[10px] font-bold tracking-wider uppercase px-1.5 py-0.5 rounded border ${TIER_COLORS[tierKey]}`}>
              {tierLabel}
            </span>
            {form.is_downloadable && (
              <span className="text-[10px] font-bold tracking-wider uppercase px-1.5 py-0.5 rounded border text-secondary bg-secondary/10 border-secondary/20">DL</span>
            )}
            {form.audio_url ? (
              <span className="text-[10px] text-green-400 flex items-center gap-0.5"><Check className="w-3 h-3" /> Audio</span>
            ) : (
              <span className="text-[10px] text-destructive flex items-center gap-0.5"><Music className="w-3 h-3" /> No audio</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={() => setEditing(true)} className="text-xs px-2 py-1 rounded bg-muted/40 text-muted-foreground hover:text-foreground transition-colors">Edit</button>
          <button onClick={() => onDelete(version.id)} className="p-1.5 rounded text-muted-foreground hover:text-destructive transition-colors">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-4 rounded-xl bg-card/50 border border-primary/20 space-y-4"
    >
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2 md:col-span-1">
          <label className="text-xs font-semibold tracking-wider uppercase text-muted-foreground mb-1 block">Version Name *</label>
          <Input
            value={form.version_name}
            onChange={(e) => setForm({ ...form, version_name: e.target.value })}
            placeholder="e.g. Standard Version, 432 Hz Version"
            className="bg-card/40 border-border/30"
          />
        </div>
        <div>
          <label className="text-xs font-semibold tracking-wider uppercase text-muted-foreground mb-1 block">Frequency Type</label>
          <Select value={form.frequency_type || "standard"} onValueChange={(v) => setForm({ ...form, frequency_type: v })}>
            <SelectTrigger className="bg-card/40 border-border/30">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="standard">Standard</SelectItem>
              <SelectItem value="432hz">432 Hz</SelectItem>
              <SelectItem value="528hz">528 Hz</SelectItem>
              <SelectItem value="binaural">Binaural</SelectItem>
              <SelectItem value="remastered">Remastered</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-xs font-semibold tracking-wider uppercase text-muted-foreground mb-1 block">Display Order</label>
          <Input
            type="number"
            value={form.display_order}
            onChange={(e) => setForm({ ...form, display_order: parseInt(e.target.value) || 0 })}
            className="bg-card/40 border-border/30"
          />
        </div>
      </div>

      {/* Audio upload */}
      <div>
        <label className="text-xs font-semibold tracking-wider uppercase text-muted-foreground mb-1 block">Audio File</label>
        <label className="cursor-pointer">
          <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border-2 border-dashed transition-all ${form.audio_url ? "border-primary/40 bg-primary/5" : "border-border/40 hover:border-primary/30"}`}>
            {uploading ? (
              <Loader2 className="w-4 h-4 text-primary animate-spin" />
            ) : form.audio_url ? (
              <Check className="w-4 h-4 text-primary" />
            ) : (
              <Music className="w-4 h-4 text-muted-foreground" />
            )}
            <span className="text-sm text-muted-foreground">
              {uploading ? "Uploading..." : form.audio_url ? "Audio ready — click to replace" : "Upload MP3 / WAV"}
            </span>
          </div>
          <input type="file" accept="audio/*" className="hidden" onChange={handleAudioUpload} />
        </label>
      </div>

      {/* Tier access */}
      <TierAccessPicker
        value={form.tier_access || ["free"]}
        onChange={(v) => setForm({ ...form, tier_access: v })}
      />

      {/* Download + Active */}
      <div className="flex flex-wrap gap-5">
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={!!form.is_downloadable} onChange={(e) => setForm({ ...form, is_downloadable: e.target.checked })} className="accent-primary w-4 h-4" />
          <span className="text-sm text-foreground">Downloadable (Premium only)</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={!!form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} className="accent-primary w-4 h-4" />
          <span className="text-sm text-foreground">Active</span>
        </label>
      </div>

      <div className="flex gap-2">
        <Button size="sm" onClick={handleSave} disabled={saving} className="bg-primary text-primary-foreground hover:bg-primary/90">
          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
          <span className="ml-1.5">Save Version</span>
        </Button>
        {version.id && (
          <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>Cancel</Button>
        )}
      </div>
    </motion.div>
  );
}

export default function TrackVersionManager({ trackId }) {
  const [versions, setVersions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [collapsed, setCollapsed] = useState(false);
  const [addingNew, setAddingNew] = useState(false);

  const loadVersions = async () => {
    setLoading(true);
    const v = await base44.entities.TrackVersion.filter({ track_id: trackId }, "display_order", 20);
    setVersions(v);
    setLoading(false);
  };

  useEffect(() => {
    if (trackId) loadVersions();
  }, [trackId]);

  const handleSave = async (form) => {
    if (form.id) {
      await base44.entities.TrackVersion.update(form.id, form);
      toast.success("Version updated!");
    } else {
      await base44.entities.TrackVersion.create({ ...form, track_id: trackId });
      toast.success("Version added!");
      setAddingNew(false);
    }
    loadVersions();
  };

  const handleDelete = async (versionId) => {
    await base44.entities.TrackVersion.delete(versionId);
    toast.success("Version removed.");
    loadVersions();
  };

  if (!trackId) return null;

  return (
    <div className="rounded-xl border border-border/30 bg-muted/10 p-4">
      <div className="flex items-center justify-between mb-3 cursor-pointer" onClick={() => setCollapsed(!collapsed)}>
        <div className="flex items-center gap-2">
          <Music className="w-4 h-4 text-primary" />
          <p className="text-xs font-bold tracking-wider uppercase text-muted-foreground">
            Track Versions
            {versions.length > 0 && <span className="ml-2 text-primary">{versions.length}</span>}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {!collapsed && (
            <button
              onClick={(e) => { e.stopPropagation(); setAddingNew(true); }}
              className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg bg-primary/10 border border-primary/20 text-primary hover:bg-primary/20 transition-all"
            >
              <Plus className="w-3 h-3" /> Add Version
            </button>
          )}
          {collapsed ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronUp className="w-4 h-4 text-muted-foreground" />}
        </div>
      </div>

      {!collapsed && (
        <div className="space-y-2">
          {loading ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="w-5 h-5 text-primary animate-spin" />
            </div>
          ) : (
            <>
              <AnimatePresence>
                {versions.map((v) => (
                  <motion.div key={v.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    <VersionRow version={v} onSave={handleSave} onDelete={handleDelete} />
                  </motion.div>
                ))}
              </AnimatePresence>

              {versions.length === 0 && !addingNew && (
                <p className="text-xs text-muted-foreground text-center py-4">
                  No versions yet. The track's main audio file will be used. Add versions to support multiple mixes.
                </p>
              )}

              {addingNew && (
                <VersionRow
                  version={{ ...EMPTY_VERSION, display_order: versions.length }}
                  onSave={handleSave}
                  onDelete={() => setAddingNew(false)}
                />
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}