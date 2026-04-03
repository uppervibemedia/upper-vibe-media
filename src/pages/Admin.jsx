import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Plus, Music, Users, Grid3X3, BarChart3, Upload } from "lucide-react";
import { base44 } from "@/api/base44Client";
import TrackEditForm from "../components/admin/TrackEditForm";
import TrackTable from "../components/admin/TrackTable";

const TABS = [
  { id: "tracks", label: "Tracks", icon: Music },
  { id: "artists", label: "Artists", icon: Users },
  { id: "categories", label: "Categories", icon: Grid3X3 },
];

export default function Admin() {
  const [tab, setTab] = useState("tracks");
  const [tracks, setTracks] = useState([]);
  const [artists, setArtists] = useState([]);
  const [categories, setCategories] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingTrack, setEditingTrack] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadAll = async () => {
    setLoading(true);
    const [t, a, c] = await Promise.all([
      base44.entities.Track.list("-created_date", 500),
      base44.entities.Artist.list("name", 100),
      base44.entities.Category.list("display_order", 50),
    ]);
    setTracks(t);
    setArtists(a);
    setCategories(c);
    setLoading(false);
  };

  useEffect(() => { loadAll(); }, []);

  const handleEdit = (track) => {
    setEditingTrack(track);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSaved = () => {
    setShowForm(false);
    setEditingTrack(null);
    loadAll();
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingTrack(null);
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-8 md:py-12">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center justify-between mb-8">
          <div>
            <p className="text-xs tracking-[0.3em] uppercase text-secondary text-glow-gold mb-1">Admin</p>
            <h1 className="font-heading font-extrabold text-3xl md:text-4xl">Content Manager</h1>
          </div>
          {tab === "tracks" && !showForm && (
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => { setEditingTrack(null); setShowForm(true); }}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-heading font-semibold text-sm tracking-wider uppercase hover:bg-primary/90 transition-all"
            >
              <Plus className="w-4 h-4" />
              Upload Track
            </motion.button>
          )}
        </div>

        {/* Tab nav */}
        <div className="flex gap-1 mb-8 border-b border-border/30">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => { setTab(t.id); setShowForm(false); setEditingTrack(null); }}
              className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold transition-all border-b-2 -mb-px ${
                tab === t.id
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <t.icon className="w-4 h-4" />
              {t.label}
            </button>
          ))}
        </div>

        {/* Track tab */}
        {tab === "tracks" && (
          <div>
            {showForm && (
              <div className="mb-8">
                <TrackEditForm
                  track={editingTrack}
                  artists={artists}
                  categories={categories}
                  onSaved={handleSaved}
                  onCancel={handleCancel}
                />
              </div>
            )}
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <div className="w-6 h-6 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
              </div>
            ) : (
              <TrackTable
                tracks={tracks}
                categories={categories}
                artists={artists}
                onEdit={handleEdit}
                onRefresh={loadAll}
              />
            )}
          </div>
        )}

        {/* Artists tab */}
        {tab === "artists" && (
          <ArtistManager artists={artists} onRefresh={loadAll} />
        )}

        {/* Categories tab */}
        {tab === "categories" && (
          <CategoriesView categories={categories} tracks={tracks} />
        )}
      </motion.div>
    </div>
  );
}

function ArtistManager({ artists, onRefresh }) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", slug: "", bio: "", type: "solo", is_active: true });
  const [saving, setSaving] = useState(false);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    await base44.entities.Artist.create(form);
    setForm({ name: "", slug: "", bio: "", type: "solo", is_active: true });
    setShowForm(false);
    setSaving(false);
    onRefresh();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-heading font-bold text-xl">Artists ({artists.length})</h2>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary/10 border border-primary/30 text-primary text-sm font-semibold hover:bg-primary/20 transition-all"
        >
          <Plus className="w-4 h-4" /> Add Artist
        </button>
      </div>
      {showForm && (
        <form onSubmit={handleSave} className="p-6 rounded-xl bg-card/40 border border-border/30 mb-6 grid grid-cols-2 gap-4">
          <div className="col-span-2 md:col-span-1">
            <label className="text-xs font-semibold tracking-wider uppercase text-muted-foreground mb-1.5 block">Name *</label>
            <input
              className="w-full px-3 py-2 rounded-lg bg-card/40 border border-border/30 text-sm text-foreground focus:outline-none focus:border-primary/50"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value, slug: e.target.value.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "") })}
              placeholder="Artist name"
              required
            />
          </div>
          <div className="col-span-2 md:col-span-1">
            <label className="text-xs font-semibold tracking-wider uppercase text-muted-foreground mb-1.5 block">Type</label>
            <select
              className="w-full px-3 py-2 rounded-lg bg-card/40 border border-border/30 text-sm text-foreground focus:outline-none focus:border-primary/50"
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value })}
            >
              <option value="solo">Solo</option>
              <option value="group">Group</option>
              <option value="brand">Brand</option>
              <option value="alias">Alias</option>
            </select>
          </div>
          <div className="col-span-2">
            <label className="text-xs font-semibold tracking-wider uppercase text-muted-foreground mb-1.5 block">Bio</label>
            <textarea
              className="w-full px-3 py-2 rounded-lg bg-card/40 border border-border/30 text-sm text-foreground focus:outline-none focus:border-primary/50 h-20 resize-none"
              value={form.bio}
              onChange={(e) => setForm({ ...form, bio: e.target.value })}
              placeholder="Artist bio..."
            />
          </div>
          <div className="col-span-2 flex gap-3">
            <button type="submit" disabled={saving} className="px-6 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-all">
              {saving ? "Saving..." : "Save Artist"}
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 rounded-lg border border-border/30 text-sm text-muted-foreground hover:text-foreground transition-all">Cancel</button>
          </div>
        </form>
      )}
      <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {artists.map((a) => (
          <div key={a.id} className="p-4 rounded-xl bg-card/40 border border-border/20 flex items-center gap-3">
            {a.image_url ? (
              <img src={a.image_url} alt={a.name} className="w-10 h-10 rounded-full object-cover flex-shrink-0" />
            ) : (
              <div className="w-10 h-10 rounded-full bg-muted/50 flex-shrink-0" />
            )}
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground truncate">{a.name}</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{a.type}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function CategoriesView({ categories, tracks }) {
  const countTracks = (catId) => tracks.filter((t) => t.category_ids?.includes(catId)).length;

  const typeColors = {
    genre: "text-primary bg-primary/10 border-primary/20",
    frequency: "text-cyan-400 bg-cyan-400/10 border-cyan-400/20",
    artist_lane: "text-purple-400 bg-purple-400/10 border-purple-400/20",
    editorial: "text-secondary bg-secondary/10 border-secondary/20",
    mood: "text-pink-400 bg-pink-400/10 border-pink-400/20",
    learning: "text-green-400 bg-green-400/10 border-green-400/20",
  };

  return (
    <div>
      <h2 className="font-heading font-bold text-xl mb-6">Categories ({categories.length})</h2>
      <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3">
        {categories.map((cat) => {
          const count = countTracks(cat.id);
          return (
            <div key={cat.id} className="p-4 rounded-xl bg-card/40 border border-border/20 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground">{cat.name}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`text-[10px] font-bold tracking-wider uppercase px-1.5 py-0.5 rounded border ${typeColors[cat.type] || "text-muted-foreground bg-muted/30 border-border/30"}`}>
                    {cat.type}
                  </span>
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-lg font-heading font-extrabold text-primary">{count}</p>
                <p className="text-[10px] text-muted-foreground">tracks</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}