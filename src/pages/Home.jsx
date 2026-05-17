import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Play, Download, Headphones, Waves, Music4, ArrowRight, Tv2, Mail, Crown, CheckCircle2, Compass, Pause } from "lucide-react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import Footer from "../components/shared/Footer";
import { usePlayer } from "../context/PlayerContext";
import DiscoverTab, { recordPlay } from "../components/home/DiscoverTab";

export default function Home() {
  const [tracks, setTracks] = useState([]);
  const [visualizers, setVisualizers] = useState([]);
  const [activeTab, setActiveTab] = useState("home");
  const { playTrack, currentTrack, isPlaying, togglePlay } = usePlayer();

  const handlePlayTrack = (track) => {
    if (currentTrack?.id === track.id) { togglePlay(); return; }
    playTrack(track);
    recordPlay(track);
  };

  useEffect(() => {
    // Fetch 4 latest tracks sorted by release_date desc, fallback to created_date
    base44.entities.Track.filter({ status: "published" }, "-release_date", 4).then((t) => {
      if (t.length === 0) {
        base44.entities.Track.filter({ status: "published" }, "-created_date", 4).then(setTracks);
      } else {
        setTracks(t);
      }
    });
    base44.entities.Visualizer.filter({ status: "published" }, "-release_date", 4).then((v) => {
      if (v.length === 0) {
        base44.entities.Visualizer.filter({ status: "published" }, "-created_date", 4).then(setVisualizers);
      } else {
        setVisualizers(v);
      }
    });
  }, []);

  return (
    <div className="min-h-screen pb-24 md:pb-0">

      {/* Hero */}
      <section className="relative min-h-[85vh] flex items-center overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full blur-[120px] opacity-[0.08]"
            style={{ background: "radial-gradient(circle,#00E5FF,transparent)" }} />
          <div className="absolute bottom-1/3 right-1/4 w-80 h-80 rounded-full blur-[100px] opacity-[0.06]"
            style={{ background: "radial-gradient(circle,#D4A843,transparent)" }} />
        </div>

        <div className="max-w-7xl mx-auto px-6 w-full pt-20 pb-16 relative z-10">
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }} className="max-w-3xl">
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
              <Link to="/downloads"
                className="inline-flex items-center gap-3 px-7 py-3.5 rounded-full font-black text-sm tracking-wider transition-all hover:brightness-110"
                style={{ background: "rgba(212,168,67,0.1)", border: "1px solid rgba(212,168,67,0.3)", color: "#D4A843" }}>
                <Crown className="w-4 h-4" /> Premium Downloads
              </Link>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
            className="flex flex-wrap gap-8 mt-16">
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

      {/* Tab bar */}
      <div className="sticky top-0 z-30 border-b" style={{ background: "rgba(4,4,14,0.92)", backdropFilter: "blur(20px)", borderColor: "rgba(255,255,255,0.07)" }}>
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex gap-1">
            {[
              { id: "home", label: "Home" },
              { id: "discover", label: "Discover", icon: Compass },
            ].map((tab) => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-5 py-3.5 text-sm font-black tracking-wider border-b-2 -mb-px transition-all ${
                  activeTab === tab.id
                    ? "border-cyan-400 text-cyan-400"
                    : "border-transparent text-white/30 hover:text-white/60"
                }`}>
                {tab.icon && <tab.icon className="w-3.5 h-3.5" />}
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── DISCOVER TAB ── */}
      {activeTab === "discover" && (
        <>
          <div className="max-w-5xl mx-auto px-6 py-12">
            <DiscoverTab />
          </div>
          <Footer />
        </>
      )}

      {/* ── HOME TAB ── */}
      {activeTab === "home" && (
        <>
          {/* Latest Music */}
          {tracks.length > 0 && (
            <section className="max-w-7xl mx-auto px-6 pt-12 pb-8">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <p className="text-[10px] font-black tracking-[0.3em] uppercase mb-1" style={{ color: "#00E5FF" }}>Now Playing</p>
                  <h2 className="font-heading font-black text-2xl text-white">Latest Music</h2>
                </div>
                <Link to="/music"
                  className="flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-black tracking-wider transition-all hover:brightness-110"
                  style={{ background: "rgba(0,229,255,0.08)", border: "1px solid rgba(0,229,255,0.2)", color: "#00E5FF" }}>
                  See More <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {tracks.map((track, i) => {
                  const isCurrent = currentTrack?.id === track.id;
                  return (
                    <motion.div
                      key={track.id}
                      initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}
                      className="flex items-center gap-3 p-4 rounded-2xl group cursor-pointer transition-all hover:border-white/15 active:scale-[0.98]"
                      style={{
                        background: isCurrent ? "rgba(0,229,255,0.06)" : "rgba(255,255,255,0.025)",
                        border: `1px solid ${isCurrent ? "rgba(0,229,255,0.2)" : "rgba(255,255,255,0.06)"}`,
                      }}
                      onClick={() => track.audio_url && handlePlayTrack(track)}
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
                          {isCurrent && isPlaying
                            ? <Pause className="w-4 h-4 text-black" />
                            : <Play className="w-4 h-4 text-black" />}
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-white truncate">{track.title}</p>
                        <p className="text-xs text-white/35 truncate">{track.artist_display || "Upper Vibe Media"}</p>
                        {track.duration && <p className="text-[10px] text-white/20 mt-0.5">{track.duration}</p>}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </section>
          )}

          {/* Latest Visualizers */}
          {visualizers.length > 0 && (
            <section className="max-w-7xl mx-auto px-6 py-8">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <p className="text-[10px] font-black tracking-[0.3em] uppercase mb-1" style={{ color: "#9B7EFF" }}>Watch</p>
                  <h2 className="font-heading font-black text-2xl text-white">Latest Music Visualizers</h2>
                </div>
                <Link to="/visualizers"
                  className="flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-black tracking-wider transition-all hover:brightness-110"
                  style={{ background: "rgba(155,126,255,0.1)", border: "1px solid rgba(155,126,255,0.25)", color: "#9B7EFF" }}>
                  See More <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
                      <Link to="/visualizers"
                        className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        style={{ background: "rgba(0,0,0,0.5)" }}>
                        <div className="w-12 h-12 rounded-full flex items-center justify-center"
                          style={{ background: "rgba(155,126,255,0.9)" }}>
                          <Play className="w-5 h-5 text-white ml-0.5" />
                        </div>
                      </Link>
                    </div>
                    <div className="p-3">
                      <p className="text-sm font-bold text-white truncate">{viz.title}</p>
                      <p className="text-xs text-white/35 truncate">{viz.artist || "Upper Vibe Media"}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </section>
          )}

          {/* Discover teaser */}
          <section className="max-w-7xl mx-auto px-6 py-8">
            <motion.div
              initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
              className="rounded-3xl p-8 md:p-10 flex flex-col sm:flex-row items-center gap-6"
              style={{ background: "linear-gradient(135deg,rgba(0,229,255,0.06),rgba(155,126,255,0.05))", border: "1px solid rgba(0,229,255,0.12)" }}>
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0"
                style={{ background: "rgba(0,229,255,0.1)", border: "1px solid rgba(0,229,255,0.2)" }}>
                <Compass className="w-7 h-7 text-cyan-400" />
              </div>
              <div className="flex-1 text-center sm:text-left">
                <h3 className="font-heading font-black text-xl text-white mb-1">Your Personal Discover Feed</h3>
                <p className="text-white/40 text-sm leading-relaxed">
                  Get song and visualizer recommendations based on what you've listened to and saved.
                </p>
              </div>
              <button onClick={() => setActiveTab("discover")}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-full font-black text-sm tracking-wider flex-shrink-0 transition-all hover:brightness-110"
                style={{ background: "linear-gradient(135deg,#00B8D4,#00E5FF)", color: "#000" }}>
                Open Discover <ArrowRight className="w-4 h-4" />
              </button>
            </motion.div>
          </section>

          {/* Email Signup */}
          <EmailSignupSection />

          {/* Downloads CTA */}
          <section className="max-w-7xl mx-auto px-6 py-8 pb-16">
            <motion.div
              initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
              className="rounded-3xl p-10 md:p-14 flex flex-col md:flex-row items-center gap-8 text-center md:text-left"
              style={{ background: "linear-gradient(135deg,rgba(212,168,67,0.07),rgba(212,168,67,0.03))", border: "1px solid rgba(212,168,67,0.15)" }}>
              <div className="flex-1">
                <h2 className="font-heading font-black text-3xl md:text-4xl text-white mb-3">Download Your Favorites</h2>
                <p className="text-white/40 text-sm leading-relaxed max-w-md">
                  Premium members can download every Upper Vibe Media song and take them anywhere.
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
        </>
      )}
    </div>
  );
}

function EmailSignupSection() {
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
    <section className="max-w-7xl mx-auto px-6 py-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
        className="rounded-3xl p-8 md:p-12"
        style={{ background: "linear-gradient(135deg,rgba(0,229,255,0.05),rgba(212,168,67,0.03))", border: "1px solid rgba(0,229,255,0.1)" }}
      >
        {!submitted ? (
          <div className="flex flex-col lg:flex-row gap-10 items-start lg:items-center">
            <div className="lg:max-w-xs">
              <div className="w-10 h-10 rounded-2xl flex items-center justify-center mb-4"
                style={{ background: "rgba(0,229,255,0.1)", border: "1px solid rgba(0,229,255,0.2)" }}>
                <Mail className="w-5 h-5 text-cyan-400" />
              </div>
              <h3 className="font-heading font-black text-2xl text-white mb-2">Get Notified When New Music Drops</h3>
              <p className="text-white/35 text-sm leading-relaxed">
                Join the Upper Vibe Media list for new 432 Hz songs, visualizers, exclusive drops, and high-vibe updates.
              </p>
            </div>
            <form onSubmit={handleSubmit} className="flex-1 flex flex-col sm:flex-row gap-3 w-full max-w-lg">
              <input
                type="text"
                placeholder="Your name (optional)"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="flex-1 px-4 py-3 rounded-xl text-sm text-white placeholder:text-white/25 focus:outline-none transition-all"
                style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}
                onFocus={(e) => e.target.style.borderColor = "rgba(0,229,255,0.3)"}
                onBlur={(e) => e.target.style.borderColor = "rgba(255,255,255,0.1)"}
              />
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
                className="px-6 py-3 rounded-xl font-black text-xs tracking-wider transition-all hover:brightness-110 flex-shrink-0 disabled:opacity-60 whitespace-nowrap"
                style={{ background: "linear-gradient(135deg,#00B8D4,#00E5FF)", color: "#000" }}>
                {saving ? "..." : "Notify Me"}
              </button>
            </form>
          </div>
        ) : (
          <div className="flex items-center gap-4">
            <CheckCircle2 className="w-8 h-8 text-cyan-400 flex-shrink-0" />
            <div>
              <p className="font-heading font-bold text-white text-lg">You're locked in.</p>
              <p className="text-white/40 text-sm">New Upper Vibe drops will hit your inbox first.</p>
            </div>
          </div>
        )}
      </motion.div>
    </section>
  );
}