import React, { useState, useEffect, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { GraduationCap, Play, Crown, Lock, X, Tag, Waves, Star } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import Footer from "../components/shared/Footer";

const CATEGORIES = [
  { value: "all", label: "All" },
  { value: "432hz_music", label: "432 Hz Music" },
  { value: "high_vibe_music", label: "High Vibe Music" },
  { value: "manifestation_music", label: "Manifestation Music" },
  { value: "music_for_focus", label: "Music For Focus" },
  { value: "behind_the_song", label: "Behind The Song" },
  { value: "upper_vibe_media", label: "Upper Vibe Media" },
  { value: "music_business", label: "Music Business" },
  { value: "artist_development", label: "Artist Development" },
];

function catLabel(val) {
  return CATEGORIES.find((c) => c.value === val)?.label || val || "";
}

// Premium gate overlay shown after 60s
function PremiumGateOverlay({ onClose }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="absolute inset-0 z-20 flex flex-col items-center justify-center text-center px-6"
      style={{ background: "linear-gradient(180deg,rgba(4,4,14,0.6) 0%,rgba(4,4,14,0.97) 60%)" }}
    >
      <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4"
        style={{ background: "rgba(212,168,67,0.15)", border: "1px solid rgba(212,168,67,0.3)" }}>
        <Crown className="w-6 h-6 text-yellow-400" />
      </div>
      <h3 className="font-heading font-black text-xl text-white mb-2">Keep Watching With Premium</h3>
      <p className="text-sm text-white/50 max-w-xs leading-relaxed mb-5">
        Unlock the full Upper Vibe Academy, music downloads, exclusive 432 Hz packs, and premium Upper Vibe Media content for <span className="text-yellow-400 font-bold">$4.99/month</span>.
      </p>
      <a href="/pricing"
        className="px-7 py-3 rounded-full font-black text-sm tracking-wider transition-all hover:brightness-110 hover:scale-[1.02]"
        style={{ background: "linear-gradient(135deg,#D4A843,#F0C060)", color: "#000", boxShadow: "0 0 24px rgba(212,168,67,0.35)" }}>
        Upgrade To Premium
      </a>
      <button onClick={onClose} className="mt-4 text-xs text-white/25 hover:text-white/50 transition-colors">
        Keep browsing free
      </button>
    </motion.div>
  );
}

function AcademyVideoCard({ lesson, isPremium }) {
  const [playing, setPlaying] = useState(false);
  const [gated, setGated] = useState(false);
  const timerRef = useRef(null);

  const isFreeVideo = !lesson.is_premium;
  const previewSecs = lesson.free_preview_seconds || 60;

  const handlePlay = () => {
    setGated(false);
    setPlaying(true);

    // Start preview timer for free users on premium videos
    if (!isPremium && lesson.is_premium) {
      clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        setPlaying(false);
        setGated(true);
      }, previewSecs * 1000);
    }
  };

  const handleClose = () => {
    setPlaying(false);
    setGated(false);
    clearTimeout(timerRef.current);
  };

  useEffect(() => () => clearTimeout(timerRef.current), []);

  const embedSrc = lesson.embed_url
    ? (playing ? `${lesson.embed_url}?autoplay=1&rel=0` : lesson.embed_url)
    : null;

  return (
    <motion.div layout
      className="rounded-2xl overflow-hidden flex flex-col"
      style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.07)" }}>

      {/* Video area — 16:9 */}
      <div className="relative w-full" style={{ paddingTop: "56.25%" }}>
        <div className="absolute inset-0">
          {playing && embedSrc ? (
            <>
              <iframe
                src={embedSrc}
                title={lesson.title}
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="w-full h-full"
              />
              {gated && <PremiumGateOverlay onClose={handleClose} />}
              <button onClick={handleClose}
                className="absolute top-2 right-2 z-30 w-7 h-7 rounded-full flex items-center justify-center"
                style={{ background: "rgba(0,0,0,0.7)" }}>
                <X className="w-3.5 h-3.5 text-white" />
              </button>
            </>
          ) : gated ? (
            <div className="w-full h-full relative"
              style={{ background: "linear-gradient(135deg,rgba(212,168,67,0.06),rgba(0,0,0,0.9))" }}>
              {lesson.thumbnail_url && (
                <img src={lesson.thumbnail_url} alt={lesson.title} className="absolute inset-0 w-full h-full object-cover opacity-20" />
              )}
              <PremiumGateOverlay onClose={handleClose} />
            </div>
          ) : (
            <div className="w-full h-full cursor-pointer group relative" onClick={handlePlay}>
              {lesson.thumbnail_url ? (
                <img src={lesson.thumbnail_url} alt={lesson.title}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
              ) : (
                <div className="w-full h-full flex items-center justify-center"
                  style={{ background: "linear-gradient(135deg,rgba(212,168,67,0.07),rgba(0,0,0,0.6))" }}>
                  <GraduationCap className="w-10 h-10 text-white/10" />
                </div>
              )}
              <div className="absolute inset-0 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.35)" }}>
                <div className="w-14 h-14 rounded-full flex items-center justify-center transition-transform group-hover:scale-110"
                  style={{ background: "linear-gradient(135deg,#D4A843,#F0C060)", boxShadow: "0 0 28px rgba(212,168,67,0.45)" }}>
                  <Play className="w-6 h-6 text-black ml-0.5" />
                </div>
              </div>
              {/* Badges */}
              {lesson.is_featured && (
                <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full text-[9px] font-black tracking-wider uppercase flex items-center gap-1"
                  style={{ background: "rgba(212,168,67,0.9)", color: "#000" }}>
                  <Star className="w-2.5 h-2.5" /> Featured
                </div>
              )}
              {lesson.is_premium && !isPremium && (
                <div className="absolute top-2 right-2 px-2 py-0.5 rounded-full text-[9px] font-black flex items-center gap-1"
                  style={{ background: "rgba(0,0,0,0.8)", border: "1px solid rgba(212,168,67,0.4)", color: "#D4A843" }}>
                  <Crown className="w-2.5 h-2.5" /> {previewSecs}s preview
                </div>
              )}
              {isFreeVideo && (
                <div className="absolute top-2 right-2 px-2 py-0.5 rounded-full text-[9px] font-black"
                  style={{ background: "rgba(0,229,255,0.15)", border: "1px solid rgba(0,229,255,0.3)", color: "#00E5FF" }}>
                  Free
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Card info */}
      <div className="p-4 flex flex-col gap-2 flex-1">
        <div className="flex flex-wrap gap-1.5">
          {lesson.category && (
            <span className="flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded-full"
              style={{ background: "rgba(212,168,67,0.1)", border: "1px solid rgba(212,168,67,0.2)", color: "#D4A843" }}>
              <Tag className="w-2 h-2" /> {catLabel(lesson.category)}
            </span>
          )}
          <span className="flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded-full"
            style={{ background: "rgba(0,229,255,0.08)", border: "1px solid rgba(0,229,255,0.15)", color: "#00E5FF" }}>
            <Waves className="w-2 h-2" /> 432 Hz
          </span>
        </div>
        <p className="font-heading font-bold text-white text-sm leading-snug">{lesson.title}</p>
        {lesson.description && (
          <p className="text-xs text-white/35 line-clamp-2 leading-relaxed">{lesson.description}</p>
        )}
        <div className="mt-auto pt-2">
          {lesson.is_premium && !isPremium ? (
            <div className="flex items-center gap-1.5 text-[10px] text-yellow-400/60">
              <Lock className="w-3 h-3" /> First {previewSecs}s free · <span className="text-yellow-400/90 font-bold">Premium to unlock</span>
            </div>
          ) : (
            <button onClick={handlePlay}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-bold transition-all hover:brightness-110"
              style={{ background: "linear-gradient(135deg,rgba(212,168,67,0.15),rgba(212,168,67,0.08))", border: "1px solid rgba(212,168,67,0.3)", color: "#D4A843" }}>
              <Play className="w-3 h-3" /> Watch Now
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}

export default function Academy() {
  const [lessons, setLessons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState("all");
  const { user } = useAuth();
  const isPremium = user?.role === "premium" || user?.role === "admin";

  useEffect(() => {
    base44.entities.AcademyLesson.filter({ status: "published" }, "-release_date", 200)
      .then((data) => { setLessons(data); setLoading(false); });
  }, []);

  const filtered = useMemo(() => {
    const r = activeCategory === "all" ? lessons : lessons.filter((l) => l.category === activeCategory);
    const featured = r.filter((l) => l.is_featured);
    const rest = r.filter((l) => !l.is_featured);
    return [...featured, ...rest];
  }, [lessons, activeCategory]);

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <div className="relative overflow-hidden pt-20 pb-10 px-6"
        style={{ background: "linear-gradient(180deg,rgba(212,168,67,0.06) 0%,transparent 100%)" }}>
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] rounded-full opacity-[0.05] blur-[100px] pointer-events-none"
          style={{ background: "radial-gradient(circle,#D4A843,transparent)" }} />
        <div className="max-w-7xl mx-auto relative z-10">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-5 text-[10px] font-black tracking-[0.25em] uppercase"
              style={{ background: "rgba(212,168,67,0.1)", border: "1px solid rgba(212,168,67,0.2)", color: "#D4A843" }}>
              <GraduationCap className="w-3.5 h-3.5" /> UVM Academy
            </div>
            <h1 className="font-heading font-black text-5xl md:text-6xl text-white mb-4 leading-tight">
              Upper Vibe Academy
            </h1>
            <p className="text-base text-white/40 max-w-2xl leading-relaxed">
              Go deeper into 432 Hz music, high-vibe sound, manifestation, creativity, and the energy behind Upper Vibe Media.
            </p>
            {!isPremium && (
              <div className="mt-5 inline-flex items-center gap-3 px-5 py-3 rounded-2xl"
                style={{ background: "rgba(212,168,67,0.07)", border: "1px solid rgba(212,168,67,0.18)" }}>
                <Crown className="w-4 h-4 text-yellow-400 flex-shrink-0" />
                <p className="text-sm text-white/50">
                  Free users get a <span className="text-yellow-400 font-bold">60-second preview</span> of Premium videos.{" "}
                  <a href="/pricing" className="text-yellow-400 font-bold hover:underline">Upgrade to watch in full →</a>
                </p>
              </div>
            )}
          </motion.div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 pb-20">
        {/* Category filters */}
        <div className="flex gap-2 overflow-x-auto pb-4 mb-8">
          {CATEGORIES.map((cat) => (
            <button key={cat.value} onClick={() => setActiveCategory(cat.value)}
              className="whitespace-nowrap px-4 py-2 rounded-full text-xs font-bold tracking-wider border flex-shrink-0 transition-all"
              style={activeCategory === cat.value ? {
                background: "rgba(212,168,67,0.12)", borderColor: "rgba(212,168,67,0.35)", color: "#D4A843"
              } : {
                background: "rgba(255,255,255,0.03)", borderColor: "rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.35)"
              }}>
              {cat.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-24">
            <div className="w-6 h-6 border-2 border-yellow-400/20 border-t-yellow-400 rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <GraduationCap className="w-12 h-12 text-white/10 mx-auto mb-4" />
            <p className="text-white/25 text-sm">
              {lessons.length === 0
                ? "No Academy videos yet. Import some in the Admin dashboard."
                : "No videos in this category."}
            </p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((lesson, i) => (
              <motion.div key={lesson.id}
                initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}>
                <AcademyVideoCard lesson={lesson} isPremium={isPremium} />
              </motion.div>
            ))}
          </div>
        )}

        {/* Bottom CTA for free users */}
        {!isPremium && lessons.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
            className="rounded-3xl p-10 text-center mt-16"
            style={{ background: "linear-gradient(135deg,rgba(212,168,67,0.08),rgba(0,229,255,0.05))", border: "1px solid rgba(212,168,67,0.15)" }}>
            <Crown className="w-8 h-8 text-yellow-400 mx-auto mb-4" />
            <h3 className="font-heading font-black text-2xl md:text-3xl text-white mb-3">Keep Watching With Premium</h3>
            <p className="text-sm text-white/35 max-w-md mx-auto mb-6 leading-relaxed">
              Unlock the full Upper Vibe Academy, music downloads, exclusive 432 Hz packs, and premium Upper Vibe Media content for <span className="text-yellow-400 font-bold">$4.99/month</span>.
            </p>
            <a href="/pricing"
              className="inline-flex items-center gap-2 px-8 py-3.5 rounded-full font-black text-sm tracking-wider transition-all hover:brightness-110 hover:scale-[1.02]"
              style={{ background: "linear-gradient(135deg,#D4A843,#F0C060)", color: "#000", boxShadow: "0 0 24px rgba(212,168,67,0.3)" }}>
              <GraduationCap className="w-4 h-4" /> Upgrade To Premium
            </a>
          </motion.div>
        )}
      </div>

      <Footer />
    </div>
  );
}