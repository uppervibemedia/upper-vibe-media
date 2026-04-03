import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Music, Play, ArrowLeft } from "lucide-react";
import { base44 } from "@/api/base44Client";
import TrackCard from "../components/shared/TrackCard";
import UpgradeModal from "../components/shared/UpgradeModal";
import Footer from "../components/shared/Footer";
import { filterByArtist } from "@/lib/trackService";
import { getEffectiveAccess } from "@/lib/tierAccess";

export default function Artists() {
  const [artists, setArtists] = useState([]);
  const [tracks, setTracks] = useState([]);
  const [selectedArtist, setSelectedArtist] = useState(null);
  const [upgradeModal, setUpgradeModal] = useState({ open: false, track: null });

  useEffect(() => {
    Promise.all([
      base44.entities.Artist.filter({ is_active: true }, "name", 50),
      base44.entities.Track.filter({ status: "published" }, "-created_date", 300),
    ]).then(([a, t]) => {
      setArtists(a);
      setTracks(t);
    });
  }, []);

  const handleLockedClick = (track) => {
    const access = getEffectiveAccess(track);
    const requiredTier = access.includes("supporter") ? "supporter" : "premium";
    setUpgradeModal({ open: true, track, requiredTier });
  };

  const artistTracks = selectedArtist ? filterByArtist(tracks, selectedArtist.id) : [];

  if (selectedArtist) {
    return (
      <div>
        {/* Artist hero */}
        <div className="relative h-64 md:h-80 overflow-hidden">
          <img
            src={selectedArtist.banner_url || selectedArtist.image_url || "https://media.base44.com/images/public/69cd68afb7fe90ae92757154/7fa1b96e5_generated_89d5ed9d.png"}
            alt={selectedArtist.name}
            className="w-full h-full object-cover opacity-30"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/70 to-transparent" />
          <div className="absolute inset-0 flex items-end">
            <div className="max-w-7xl mx-auto px-6 pb-8 w-full">
              <button
                onClick={() => setSelectedArtist(null)}
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" /> All Artists
              </button>
              <div className="flex items-end gap-5">
                <img
                  src={selectedArtist.image_url || ""}
                  alt={selectedArtist.name}
                  className="w-20 h-20 md:w-28 md:h-28 rounded-2xl object-cover border-2 border-primary/30 glow-blue flex-shrink-0"
                />
                <div>
                  <p className="text-xs font-bold tracking-widest uppercase text-primary mb-1">{selectedArtist.type}</p>
                  <h1 className="font-heading font-extrabold text-3xl md:text-5xl">{selectedArtist.name}</h1>
                  <p className="text-sm text-muted-foreground mt-1">{artistTracks.length} track{artistTracks.length !== 1 ? "s" : ""}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-6 py-10">
          {selectedArtist.bio && (
            <div className="mb-10 max-w-2xl">
              <p className="text-xs font-bold tracking-widest uppercase text-muted-foreground mb-3">About</p>
              <p className="text-muted-foreground leading-relaxed">{selectedArtist.bio}</p>
            </div>
          )}

          <div className="mb-4">
            <p className="text-xs font-bold tracking-widest uppercase text-primary text-glow-blue mb-2">Discography</p>
            <h2 className="font-heading font-extrabold text-2xl">All Tracks</h2>
          </div>

          {artistTracks.length === 0 ? (
            <p className="text-muted-foreground py-12 text-center">No tracks assigned to this artist yet.</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {artistTracks.map((track, i) => (
                <motion.div
                  key={track.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                >
                  <TrackCard track={track} onLockedClick={handleLockedClick} />
                </motion.div>
              ))}
            </div>
          )}
        </div>

        <Footer />

        <UpgradeModal
          isOpen={upgradeModal.open}
          onClose={() => setUpgradeModal({ open: false, track: null })}
          requiredTier={upgradeModal.requiredTier}
          trackTitle={upgradeModal.track?.title}
        />
      </div>
    );
  }

  return (
    <div>
      <div className="max-w-7xl mx-auto px-6 py-12">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <p className="text-xs font-bold tracking-[0.2em] uppercase text-primary text-glow-blue mb-2">Upper Vibe Roster</p>
          <h1 className="font-heading font-extrabold text-3xl md:text-4xl mb-10">Artists</h1>

          <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
            {artists.map((artist, i) => {
              const count = filterByArtist(tracks, artist.id).length;
              return (
                <motion.button
                  key={artist.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.08 }}
                  whileHover={{ y: -6, scale: 1.02 }}
                  onClick={() => setSelectedArtist(artist)}
                  className="group text-left rounded-2xl overflow-hidden bg-card/40 border border-border/20 hover:border-primary/30 transition-all"
                >
                  <div className="aspect-square overflow-hidden relative">
                    {artist.image_url ? (
                      <img
                        src={artist.image_url}
                        alt={artist.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    ) : (
                      <div className="w-full h-full bg-muted/30 flex items-center justify-center">
                        <Music className="w-12 h-12 text-muted-foreground/30" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent" />
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="w-12 h-12 rounded-full bg-primary/80 backdrop-blur-md flex items-center justify-center glow-blue">
                        <Play className="w-5 h-5 text-primary-foreground ml-0.5" />
                      </div>
                    </div>
                  </div>
                  <div className="p-4">
                    <p className="font-heading font-bold text-sm text-foreground">{artist.name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{count} track{count !== 1 ? "s" : ""}</p>
                  </div>
                </motion.button>
              );
            })}
          </div>

          {artists.length === 0 && (
            <p className="text-center text-muted-foreground py-20">No artists yet. Add them in the Admin panel.</p>
          )}
        </motion.div>
      </div>
      <Footer />
    </div>
  );
}