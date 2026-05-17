import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Play, Download, Headphones, Waves, Music4, Grid3X3, ArrowRight, Tv2, Mail, Crown, CheckCircle2 } from "lucide-react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import Footer from "../components/shared/Footer";
import { usePlayer } from "../context/PlayerContext";

export default function Home() {
  const [tracks, setTracks] = useState([]);
  const [visualizers, setVisualizers] = useState([]);
  const { playTrack } = usePlayer();

  useEffect(() => {
    base44.entities.Track.filter({ status: "published" }, "-created_date", 6).then(setTracks);
    base44.entities.Visualizer.filter({ status: "published" }, "-created_date", 6).then(setVisualizers);
  }, []);

  const CATEGORIES = [
    { label: "High Vibe Music", icon: "✨", color: "#00E5FF" },
    { label: "432 Hz Music", icon: "〰️", color: "#D4A843" },
    { label: "Hip Hop / Rap", icon: "🎤", color: "#9B7EFF" },
    { label: "R&B", icon: "🎵", color: "#D4A843" },
    { label: "Electronic Music", icon: "⚡", color: "#00E5FF" },
    { label: "Instrumentals", icon: "🎸", color: "#9B7EFF" },
    { label: "Meditation / Focus", icon: "🧘", color: "#00E5FF" },
    { label: "Car Music", icon: "🚗", color: "#D4A843" },
  ];

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="relative min-h-[85vh] flex items-center overflow-hidden">
        {/* Background glows */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full blur-[120px] opacity-[0.08]"
            style={{ background: "radial-gradient(circle,#00E5FF,transparent)" }} />
          <div className="absolute bottom-1/3 right-1/4 w-80 h-80 rounded-full blur-[100px] opacity-[0.06]"
            style={{ background: "radial-gradient(circle,#D4A843,transparent)" }} />
        </div>

        <div className="max-w-7xl mx-auto px-6 w-full pt-20 pb-16 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
            className="max-w-3xl"
          >
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-8 text-[10px] font-black tracking-[0.3em] uppercase"
              style={{ background: "rgba(0,229,255,0.08)", border: "1px solid rgba(0,229,255,0.2)", color: "#00E5FF" }}>
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
              High-Vibration Music
            </div>

            <h1 className="font-heading font-black text-6xl md:text-7xl lg:text-8xl text-white leading-[0.95] mb-6">
              Upper Vibe
              <br />
              <span style={{ color: "#D4A843" }}>Media</span>
            </h1>

            <p className="text-lg text-white/45 leading-relaxed mb-10 max-w-xl">
              High-vibration music, 432 Hz sounds, electronic music, hip hop, R&B, instrumentals, and focus sessions — all in one place.
            </p>

            <div className="flex flex-wrap gap-3">
              <Link to="/music"
                className="inline-flex items-center gap-3 px-7 py-3.5 rounded-full font-black text-sm tracking-wider transition-all hover:brightness-110 hover:scale-[1.02]"
                style={{ background: "linear-gradient(135deg,#00B8D4,#00E5FF)", color: "#000", boxShadow: "0 0 32px rgba(0,229,255,0.3)" }}>
                <Headphones className="w-4 h-4" /> Listen Now
              </Link>
              <Link to="/email-list"
                className="inline-flex items-center gap-3 px-7 py-3.5 rounded-full font-black text-sm tracking-wider transition-all hover:bg-white/10"
                style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.8)" }}>
                <Mail className="w-4 h-4" /> Join Email List
              </Link>
              <Link to="/downloads"
                className="inline-flex items-center gap-3 px-7 py-3.5 rounded-full font-black text-sm tracking-wider transition-all hover:brightness-110"
                style={{ background: "rgba(212,168,67,0.1)", border: "1px solid rgba(212,168,67,0.3)", color: "#D4A843" }}>
                <Crown className="w-4 h-4" /> Premium Downloads
              </Link>
            </div>
          </motion.div>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="flex flex-wrap gap-8 mt-16"
          >
            {[
              { label: "Songs", value: "50+" },
              { label: "Frequencies", value: "432 Hz" },
              { label: "Genres", value: "8+" },
              { label: "Downloads", value: "Free" },
            ].map((s) => (
              <div key={s.label}>
                <p className="font-heading font-black text-2xl text-white">{s.value}</p>
                <p className="text-[11px] text-white/30 tracking-widest uppercase mt-0.5">{s.label}</p>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Email Signup Banner */}
      <EmailSignupBanner />

      {/* Recent Tracks */}
      {tracks.length > 0 && (
        <section className="max-w-7xl mx-auto px-6 py-14">
          <div className="flex items-center justify-between mb-8">
            <div>
              <p className="text-[10px] font-black tracking-[0.3em] uppercase mb-1" style={{ color: "#00E5FF" }}>Now Playing</p>
              <h2 className="font-heading font-black text-2xl text-white">Latest Music</h2>
            </div>
            <Link to="/music" className="flex items-center gap-1.5 text-xs font-bold text-white/40 hover:text-white/70 transition-colors">
              View All <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
            {tracks.map((track, i) => (
              <motion.div
                key={track.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.07 }}
                className="flex items-center gap-4 p-4 rounded-2xl group cursor-pointer transition-all hover:border-white/15"
                style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.06)" }}
                onClick={() => track.audio_url && playTrack(track)}
              >
                <div className="relative flex-shrink-0">
                  {track.cover_url ? (
                    <img src={track.cover_url} alt={track.title} className="w-12 h-12 rounded-xl object-cover" />
                  ) : (
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center"
                      style={{ background: "rgba(0,229,255,0.08)" }}>
                      <Music4 className="w-5 h-5 text-cyan-400/40" />
                    </div>
                  )}
                  <div className="absolute inset-0 rounded-xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    style={{ background: "rgba(0,229,255,0.85)" }}>
                    <Play className="w-4 h-4 text-black" />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-white truncate">{track.title}</p>
                  <p className="text-xs text-white/35 truncate">{track.artist_display || "Upper Vibe Media"}</p>
                </div>
                {track.duration && <p className="text-[10px] text-white/25 flex-shrink-0">{track.duration}</p>}
              </motion.div>
            ))}
          </div>
        </section>
      )}

      {/* Categories preview */}
      <section className="max-w-7xl mx-auto px-6 py-14">
        <div className="flex items-center justify-between mb-8">
          <div>
            <p className="text-[10px] font-black tracking-[0.3em] uppercase mb-1" style={{ color: "#D4A843" }}>Explore</p>
            <h2 className="font-heading font-black text-2xl text-white">Browse by Category</h2>
          </div>
          <Link to="/categories" className="flex items-center gap-1.5 text-xs font-bold text-white/40 hover:text-white/70 transition-colors">
            All Categories <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {CATEGORIES.map((cat) => (
            <Link
              key={cat.label}
              to={`/categories?cat=${encodeURIComponent(cat.label)}`}
              className="flex items-center gap-3 p-4 rounded-2xl transition-all hover:scale-[1.02]"
              style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.06)" }}
            >
              <span className="text-xl">{cat.icon}</span>
              <span className="text-sm font-bold text-white/70">{cat.label}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* Latest Visualizers */}
      {visualizers.length > 0 && (
        <section className="max-w-7xl mx-auto px-6 py-14">
          <div className="flex items-center justify-between mb-8">
            <div>
              <p className="text-[10px] font-black tracking-[0.3em] uppercase mb-1" style={{ color: "#9B7EFF" }}>Watch</p>
              <h2 className="font-heading font-black text-2xl text-white">Latest Music Visualizers</h2>
            </div>
            <Link to="/visualizers" className="flex items-center gap-1.5 text-xs font-bold text-white/40 hover:text-white/70 transition-colors">
              All Visualizers <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
            {visualizers.map((viz, i) => (
              <motion.div key={viz.id}
                initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}
                className="group rounded-2xl overflow-hidden"
                style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.06)" }}>
                <div className="aspect-video relative overflow-hidden">
                  {viz.thumbnail_url ? (
                    <img src={viz.thumbnail_url} alt={viz.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center"
                      style={{ background: "linear-gradient(135deg,rgba(155,126,255,0.1),rgba(0,229,255,0.05))" }}>
                      <Tv2 className="w-8 h-8 text-white/10" />
                    </div>
                  )}
                </div>
                <div className="p-4">
                  <p className="text-sm font-bold text-white truncate">{viz.title}</p>
                  <p className="text-xs text-white/35 truncate mb-3">{viz.artist || "Upper Vibe Media"}</p>
                  <div className="flex items-center gap-2">
                    <Link to="/visualizers"
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all hover:brightness-110"
                      style={{ background: "rgba(155,126,255,0.15)", border: "1px solid rgba(155,126,255,0.3)", color: "#9B7EFF" }}>
                      <Play className="w-3 h-3" /> Watch
                    </Link>
                    {viz.linked_song_id && (
                      <button
                        onClick={() => {
                          base44.entities.Track.filter({ id: viz.linked_song_id }, "", 1).then(([t]) => t && playTrack(t));
                        }}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all hover:brightness-110"
                        style={{ background: "rgba(0,229,255,0.08)", border: "1px solid rgba(0,229,255,0.2)", color: "#00E5FF" }}>
                        <Music4 className="w-3 h-3" /> Listen
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </section>
      )}

      {/* CTA */}
      <section className="max-w-7xl mx-auto px-6 pb-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
          className="rounded-3xl p-10 md:p-14 flex flex-col md:flex-row items-center gap-8 text-center md:text-left"
          style={{
            background: "linear-gradient(135deg,rgba(0,229,255,0.07),rgba(212,168,67,0.05))",
            border: "1px solid rgba(0,229,255,0.12)"
          }}>
          <div className="flex-1">
            <h2 className="font-heading font-black text-3xl md:text-4xl text-white mb-3">
              Download Your Favorites
            </h2>
            <p className="text-white/40 text-sm leading-relaxed max-w-md">
              Select songs that are available for download and take them with you anywhere.
            </p>
          </div>
          <Link to="/downloads"
            className="inline-flex items-center gap-3 px-8 py-4 rounded-full font-black text-sm tracking-wider flex-shrink-0 transition-all hover:brightness-110"
            style={{ background: "linear-gradient(135deg,#D4A843,#F0C060)", color: "#000" }}>
            <Download className="w-5 h-5" /> Go to Downloads
          </Link>
        </motion.div>
      </section>

      <Footer />
    </div>
  );
}

function EmailSignupBanner() {
  const [form, setForm] = useState({ name: "", email: "" });
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.email) return;
    setSaving(true);
    await base44.entities.ContactMessage.create({
      name: form.name || "Fan",
      email: form.email,
      type: "newsletter",
      message: "Email list signup from homepage",
    });
    setSaving(false);
    setSubmitted(true);
  };

  return (
    <section className="max-w-7xl mx-auto px-6 pb-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
        className="rounded-3xl p-8 md:p-10"
        style={{ background: "linear-gradient(135deg,rgba(0,229,255,0.06),rgba(212,168,67,0.04))", border: "1px solid rgba(0,229,255,0.12)" }}
      >
        {!submitted ? (
          <div className="flex flex-col md:flex-row gap-8 items-start md:items-center">
            <div className="flex-shrink-0">
              <div className="w-10 h-10 rounded-2xl flex items-center justify-center mb-3"
                style={{ background: "rgba(0,229,255,0.1)", border: "1px solid rgba(0,229,255,0.2)" }}>
                <Mail className="w-5 h-5 text-cyan-400" />
              </div>
              <h3 className="font-heading font-black text-xl text-white mb-1">Get Notified When New Music Drops</h3>
              <p className="text-white/35 text-xs leading-relaxed max-w-xs">
                Join the Upper Vibe Media list for new 432 Hz songs, visualizers, exclusive drops, and high-vibe updates.
              </p>
            </div>
            <form onSubmit={handleSubmit} className="flex-1 flex flex-col sm:flex-row gap-2 w-full md:max-w-sm">
              <input
                type="email"
                placeholder="Your email *"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
                className="flex-1 px-4 py-3 rounded-xl text-sm text-white placeholder:text-white/25 focus:outline-none transition-all"
                style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}
                onFocus={(e) => e.target.style.borderColor = "rgba(0,229,255,0.4)"}
                onBlur={(e) => e.target.style.borderColor = "rgba(255,255,255,0.1)"}
              />
              <button
                type="submit"
                disabled={saving}
                className="px-5 py-3 rounded-xl font-black text-xs tracking-wider transition-all hover:brightness-110 flex-shrink-0 disabled:opacity-60"
                style={{ background: "linear-gradient(135deg,#00B8D4,#00E5FF)", color: "#000" }}>
                {saving ? "..." : "Notify Me"}
              </button>
            </form>
          </div>
        ) : (
          <div className="flex items-center gap-4">
            <CheckCircle2 className="w-8 h-8 text-cyan-400 flex-shrink-0" />
            <div>
              <p className="font-heading font-bold text-white">You're locked in.</p>
              <p className="text-white/40 text-sm">New Upper Vibe drops will hit your inbox first.</p>
            </div>
          </div>
        )}
      </motion.div>
    </section>
  );
}