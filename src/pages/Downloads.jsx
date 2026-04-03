import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Download, Music, Video, ListMusic, Trash2, Crown, Lock, ArrowUpRight, Play } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { getUserDownloads, removeDownload } from "@/lib/downloadService";
import GlowButton from "../components/shared/GlowButton";
import Footer from "../components/shared/Footer";
import { usePlayer } from "../context/PlayerContext";
import { toast } from "sonner";

const TABS = [
  { id: "track", label: "Songs", icon: Music },
  { id: "video", label: "Videos", icon: Video },
  { id: "playlist", label: "Playlists", icon: ListMusic },
];

// For demo — in production this comes from auth context
const USER_TIER = "free";
const USER_EMAIL = "";

export default function Downloads() {
  const [activeTab, setActiveTab] = useState("track");
  const [downloads, setDownloads] = useState([]);
  const [loading, setLoading] = useState(true);
  const { playTrack } = usePlayer();

  const isPremium = USER_TIER === "premium";

  useEffect(() => {
    if (!isPremium || !USER_EMAIL) {
      setLoading(false);
      return;
    }
    getUserDownloads(USER_EMAIL).then((d) => {
      setDownloads(d);
      setLoading(false);
    });
  }, []);

  const handleRemove = async (dl) => {
    await removeDownload(USER_EMAIL, dl.content_type, dl.content_id);
    setDownloads((prev) => prev.filter((d) => d.id !== dl.id));
    toast.success("Removed from downloads");
  };

  const handlePlay = (dl) => {
    if (dl.file_url) {
      playTrack({
        id: dl.content_id,
        title: dl.content_title,
        artist: dl.content_artist,
        cover_url: dl.content_cover_url,
        audio_url: dl.file_url,
        duration: dl.content_duration,
        tier_access: ["premium"],
      });
    }
  };

  const tabDownloads = downloads.filter((d) => d.content_type === activeTab);

  // Non-premium users see upgrade gate
  if (!isPremium) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center px-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full text-center"
        >
          <div className="w-20 h-20 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-6">
            <Lock className="w-9 h-9 text-primary" />
          </div>
          <p className="text-xs font-bold tracking-widest uppercase text-primary text-glow-blue mb-3">Premium Feature</p>
          <h1 className="font-heading font-extrabold text-3xl mb-4">Downloads are Premium Only</h1>
          <p className="text-muted-foreground leading-relaxed mb-8">
            Upgrade to <strong className="text-primary">Premium</strong> to download music, academy videos, and playlists for offline access. Your personal library lives here.
          </p>
          <div className="rounded-xl bg-primary/5 border border-primary/20 p-5 mb-8 text-left space-y-2.5">
            {[
              "Download individual songs & exclusive drops",
              "Download 432 Hz & premium tracks",
              "Save academy lessons for offline access",
              "Download full playlists in one tap",
              "Access everything from your Downloads library",
            ].map((perk) => (
              <div key={perk} className="flex items-start gap-2.5">
                <Crown className="w-3.5 h-3.5 text-primary flex-shrink-0 mt-0.5" />
                <span className="text-sm text-foreground/80">{perk}</span>
              </div>
            ))}
          </div>
          <GlowButton to="/pricing" variant="primary" size="lg" className="w-full justify-center">
            <ArrowUpRight className="w-4 h-4 mr-2" />
            Upgrade to Premium — $9.99/mo
          </GlowButton>
        </motion.div>
      </div>
    );
  }

  return (
    <div>
      <div className="max-w-7xl mx-auto px-6 py-10">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center gap-3 mb-2">
            <Download className="w-5 h-5 text-primary" />
            <p className="text-xs font-bold tracking-[0.2em] uppercase text-primary text-glow-blue">My Library</p>
          </div>
          <h1 className="font-heading font-extrabold text-3xl md:text-4xl mb-8">Downloads</h1>

          {/* Tabs */}
          <div className="flex gap-1 border-b border-border/30 mb-8">
            {TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold transition-all border-b-2 -mb-px ${
                  activeTab === t.id
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                <t.icon className="w-4 h-4" />
                {t.label}
                {downloads.filter((d) => d.content_type === t.id).length > 0 && (
                  <span className="px-1.5 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-bold">
                    {downloads.filter((d) => d.content_type === t.id).length}
                  </span>
                )}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-6 h-6 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
            </div>
          ) : tabDownloads.length === 0 ? (
            <div className="py-20 text-center">
              <div className="w-14 h-14 rounded-2xl bg-muted/30 flex items-center justify-center mx-auto mb-4">
                {activeTab === "track" ? <Music className="w-6 h-6 text-muted-foreground" /> : activeTab === "video" ? <Video className="w-6 h-6 text-muted-foreground" /> : <ListMusic className="w-6 h-6 text-muted-foreground" />}
              </div>
              <p className="text-muted-foreground text-sm">No downloaded {activeTab === "track" ? "songs" : activeTab === "video" ? "videos" : "playlists"} yet.</p>
              <p className="text-muted-foreground/60 text-xs mt-1">
                {activeTab === "track" ? "Download tracks from Discover or Vault." : activeTab === "video" ? "Download lessons from the Academy." : "Download playlists from your library."}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <AnimatePresence>
                {tabDownloads.map((dl, i) => (
                  <motion.div
                    key={dl.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    transition={{ delay: i * 0.04 }}
                    className="flex items-center gap-4 p-4 rounded-xl bg-card/40 border border-border/20 hover:border-primary/20 transition-all group"
                  >
                    <div className="relative flex-shrink-0">
                      {dl.content_cover_url ? (
                        <img src={dl.content_cover_url} alt="" className="w-12 h-12 rounded-lg object-cover" />
                      ) : (
                        <div className="w-12 h-12 rounded-lg bg-muted/40 flex items-center justify-center">
                          <Music className="w-5 h-5 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">{dl.content_title}</p>
                      {dl.content_artist && (
                        <p className="text-xs text-muted-foreground truncate">{dl.content_artist}</p>
                      )}
                      {dl.content_duration && (
                        <p className="text-[10px] text-muted-foreground/60 mt-0.5">{dl.content_duration}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      {activeTab === "track" && dl.file_url && (
                        <button
                          onClick={() => handlePlay(dl)}
                          className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/30 flex items-center justify-center text-primary hover:bg-primary/20 transition-all"
                        >
                          <Play className="w-3.5 h-3.5 ml-0.5" />
                        </button>
                      )}
                      <button
                        onClick={() => handleRemove(dl)}
                        className="w-8 h-8 rounded-lg bg-muted/30 border border-border/30 flex items-center justify-center text-muted-foreground hover:text-destructive hover:border-destructive/30 transition-all"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <div className="flex-shrink-0">
                      <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-green-500/10 border border-green-500/20">
                        <Download className="w-3 h-3 text-green-400" />
                        <span className="text-[10px] text-green-400 font-semibold">Saved</span>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </motion.div>
      </div>
      <Footer />
    </div>
  );
}