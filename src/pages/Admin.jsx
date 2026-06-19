import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Plus, Music, Users, Grid3X3, Brain, ListFilter, Tv2, Youtube, GraduationCap, BarChart2, Mic2, FlaskConical, Wrench } from "lucide-react";
import AnalyticsDashboard from "../components/admin/AnalyticsDashboard";
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";
import TrackEditForm from "../components/admin/TrackEditForm";
import MusicManager from "../components/admin/MusicManager";
import AIClassifierPanel from "../components/admin/AIClassifierPanel";
import VisualizerManager from "../components/admin/VisualizerManager";
import YouTubeImporter from "../components/admin/YouTubeImporter";
import AcademyImporter from "../components/admin/AcademyImporter";
import AcademyVideoManager from "../components/admin/AcademyVideoManager";
import ArtistManager from "../components/admin/ArtistManager";
import HostDropManager from "../components/admin/HostDropManager.jsx";
import StripeTestPanel from "../components/admin/StripeTestPanel";
import StripeRepairPanel from "../components/admin/StripeRepairPanel";
import { useAuth } from "@/lib/AuthContext";

const TABS = [
  { id: "analytics", label: "Analytics", icon: BarChart2 },
  { id: "manager", label: "Music Manager", icon: ListFilter },
  { id: "upload", label: "Upload Track", icon: Music },
  { id: "visualizers", label: "Visualizers", icon: Tv2 },
  { id: "host_drops", label: "Host Drops", icon: Mic2 },
  { id: "yt_import", label: "YouTube Import", icon: Youtube },
  { id: "academy_import", label: "Academy Import", icon: GraduationCap },
  { id: "artists", label: "Artists", icon: Users },
  { id: "categories", label: "Categories", icon: Grid3X3 },
  { id: "ai_organizer", label: "AI Organizer", icon: Brain },
  { id: "stripe_test",  label: "Stripe Test",  icon: FlaskConical },
  { id: "stripe_repair", label: "Stripe Repair", icon: Wrench },
];

export default function Admin() {
  const { user } = useAuth();
  const [tab, setTab] = useState("analytics");
  const [tracks, setTracks] = useState([]);
  const [artists, setArtists] = useState([]);
  const [categories, setCategories] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingTrack, setEditingTrack] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadAll = async () => {
    setLoading(true);
    // Sequence calls to avoid rate limiting
    const t = await base44.entities.Track.list("-created_date", 500);
    const a = await base44.entities.Artist.list("name", 100);
    const c = await base44.entities.Category.list("display_order", 50);
    setTracks(t);
    setArtists(a);
    setCategories(c);
    setLoading(false);
  };

  useEffect(() => { loadAll(); }, []);

  if (user?.role !== "admin") {
    return (
      <div className="min-h-[60vh] flex items-center justify-center text-muted-foreground">
        Access restricted to admins.
      </div>
    );
  }

  const handleEdit = (track) => {
    setEditingTrack(track);
    setTab("upload");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSaved = () => {
    setEditingTrack(null);
    setTab("manager");
    loadAll();
  };

  const handleCancel = () => {
    setEditingTrack(null);
    setTab("manager");
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
        <div className="flex gap-1 mb-8 border-b border-border/30 overflow-x-auto">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => { setTab(t.id); setShowForm(false); setEditingTrack(null); }}
              className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold transition-all border-b-2 -mb-px whitespace-nowrap ${
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

        {/* Analytics tab */}
        {tab === "analytics" && <AnalyticsDashboard />}

        {/* Music Manager tab */}
        {tab === "manager" && (
          <div>
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <div className="w-6 h-6 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
              </div>
            ) : (
              <MusicManager
                tracks={tracks}
                categories={categories}
                artists={artists}
                onEdit={handleEdit}
                onRefresh={loadAll}
              />
            )}
          </div>
        )}

        {/* Upload tab */}
        {tab === "upload" && (
          <div>
            <TrackEditForm
              track={editingTrack}
              artists={artists}
              categories={categories}
              onSaved={handleSaved}
              onCancel={() => { setTab("manager"); setEditingTrack(null); }}
            />
          </div>
        )}

        {/* Visualizers tab */}
        {tab === "visualizers" && (
          <VisualizerManager tracks={tracks} onRefresh={loadAll} />
        )}

        {/* Host Drops tab */}
        {tab === "host_drops" && (
          <div>
            <div className="mb-6">
              <p className="text-xs tracking-[0.3em] uppercase text-secondary text-glow-gold mb-1">Radio</p>
              <h2 className="font-heading font-bold text-2xl">Radio Host Drops</h2>
              <p className="text-sm text-muted-foreground mt-1">Manage motivational interstitial clips that play after every 4 completed songs.</p>
            </div>
            <HostDropManager />
          </div>
        )}

        {/* YouTube Import tab */}
        {tab === "yt_import" && (
          <div className="max-w-2xl">
            <div className="mb-6">
              <p className="text-xs tracking-[0.3em] uppercase text-secondary text-glow-gold mb-1">Import</p>
              <h2 className="font-heading font-bold text-2xl">YouTube Import</h2>
              <p className="text-sm text-muted-foreground mt-1">Import visualizers directly from a YouTube playlist, channel, or single video.</p>
            </div>
            <YouTubeImporter onImported={loadAll} />
          </div>
        )}

        {/* Academy Import tab */}
        {tab === "academy_import" && (
          <div className="max-w-2xl">
            <div className="mb-6">
              <p className="text-xs tracking-[0.3em] uppercase text-secondary text-glow-gold mb-1">Academy</p>
              <h2 className="font-heading font-bold text-2xl">Upper Vibe Academy Import</h2>
              <p className="text-sm text-muted-foreground mt-1">Import education videos into the Upper Vibe Academy page. Separate from Visualizers.</p>
            </div>
            <AcademyImporter onImported={loadAll} />
            <AcademyVideoManager onRefresh={loadAll} />
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

        {/* AI Organizer tab */}
        {tab === "ai_organizer" && (
          <AIOrganizerTab tracks={tracks} artists={artists} categories={categories} onRefresh={loadAll} />
        )}

        {/* Stripe Test tab — admin only, never visible to users */}
        {tab === "stripe_test" && (
          <div>
            <div className="mb-6">
              <p className="text-xs tracking-[0.3em] uppercase text-yellow-400 mb-1">Admin Only</p>
              <h2 className="font-heading font-bold text-2xl">Stripe Test Mode</h2>
              <p className="text-sm text-muted-foreground mt-1">Run safe end-to-end payment tests with no real charges. Requires <code className="text-yellow-300/70">STRIPE_TEST_SECRET_KEY</code> secret.</p>
            </div>
            <StripeTestPanel />
          </div>
        )}

        {/* Stripe Repair tab — admin only */}
        {tab === "stripe_repair" && (
          <div>
            <div className="mb-6">
              <p className="text-xs tracking-[0.3em] uppercase text-yellow-400 mb-1">Admin Only</p>
              <h2 className="font-heading font-bold text-2xl">Stripe Subscription Repair</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Check any user's Stripe subscription status and manually sync Plus access if the webhook missed it.
              </p>
            </div>
            <StripeRepairPanel />
          </div>
        )}
      </motion.div>
    </div>
  );
}



function AIOrganizerTab({ tracks, artists, categories, onRefresh }) {
  const [selectedTrack, setSelectedTrack] = React.useState(null);
  const [search, setSearch] = React.useState("");

  const filtered = tracks.filter((t) =>
    !search || t.title?.toLowerCase().includes(search.toLowerCase()) || t.artist_display?.toLowerCase().includes(search.toLowerCase())
  );

  const handleApply = async (suggestions) => {
    if (!selectedTrack) return;
    await base44.entities.Track.update(selectedTrack.id, suggestions);
    toast.success(`Classifications saved to "${selectedTrack.title}"`);
    onRefresh();
  };

  return (
    <div className="grid md:grid-cols-2 gap-6">
      {/* Track selector */}
      <div>
        <div className="flex items-center gap-3 mb-4">
          <Brain className="w-4 h-4 text-primary" />
          <h2 className="font-heading font-bold text-lg">Select a Track to Classify</h2>
        </div>
        <input
          type="text"
          placeholder="Search tracks..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full px-3 py-2 mb-3 rounded-lg bg-card/40 border border-border/30 text-sm text-foreground focus:outline-none focus:border-primary/50"
        />
        <div className="space-y-1.5 max-h-[600px] overflow-y-auto pr-1">
          {filtered.map((t) => (
            <button
              key={t.id}
              onClick={() => setSelectedTrack(t)}
              className={`w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all border ${
                selectedTrack?.id === t.id
                  ? "bg-primary/10 border-primary/30"
                  : "bg-card/30 border-border/20 hover:border-border/50 hover:bg-card/50"
              }`}
            >
              {t.cover_url ? (
                <img src={t.cover_url} alt="" className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
              ) : (
                <div className="w-10 h-10 rounded-lg bg-muted/40 flex-shrink-0" />
              )}
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground truncate">{t.title}</p>
                <p className="text-xs text-muted-foreground truncate">{t.artist_display || "No artist"}</p>
              </div>
              {selectedTrack?.id === t.id && (
                <div className="flex-shrink-0 ml-auto">
                  <div className="w-2 h-2 rounded-full bg-primary" />
                </div>
              )}
            </button>
          ))}
          {filtered.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">No tracks found.</p>
          )}
        </div>
      </div>

      {/* AI Panel */}
      <div>
        {selectedTrack ? (
          <>
            <div className="flex items-center gap-3 mb-4">
              <div>
                <h2 className="font-heading font-bold text-lg truncate">"{selectedTrack.title}"</h2>
                <p className="text-xs text-muted-foreground">{selectedTrack.artist_display || "No artist assigned"}</p>
              </div>
            </div>
            <AIClassifierPanel
              track={selectedTrack}
              artists={artists}
              categories={categories}
              onApply={handleApply}
            />
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-64 rounded-2xl border border-border/20 bg-card/20 text-center gap-3">
            <Brain className="w-10 h-10 text-primary/20" />
            <p className="text-sm text-muted-foreground">Select a track on the left to run AI classification.</p>
          </div>
        )}
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