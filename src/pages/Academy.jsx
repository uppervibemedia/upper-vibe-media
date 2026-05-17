import React, { useState, useEffect, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { GraduationCap, Play, Crown, Lock, X, ExternalLink, Star } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import Footer from "../components/shared/Footer";

// Premium gate overlay shown after preview timer
function PremiumGateOverlay({ onClose }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="absolute inset-0 z-20 flex flex-col items-center justify-center text-center px-6"
      style={{ background: "linear-gradient(180deg,rgba(4,4,14,0.6) 0%,rgba(4,4,14,0.97) 60%)" }}>
      <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4"
        style={{ background: "rgba(212,168,67,0.15)", border: "1px solid rgba(212,168,67,0.3)" }}>
        <Crown className="w-6 h-6 text-yellow-400" />
      </div>
      <h3 className="font-heading font-black text-xl text-white mb-2">Keep Watching With Premium</h3>
      <p className="text-sm text-white/50 max-w-xs leading-relaxed mb-5">
        Unlock the full Upper Vibe Academy, music downloads, exclusive 432 Hz packs, and premium Upper Vibe Media content for{" "}
        <span className="text-yellow-400 font-bold">$4.99/month</span>.
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

function toEmbedUrl(url) {
  if (!url) return null;
  const m = url.match(/(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/);
  return m ? `https://www.youtube.com/embed/${m[1]}` : (url.includes("/embed/") ? url : null);
}

function toWatchUrl(url) {
  if (!url) return null;
  const m = url.match(/(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/);
  return m ? `https://www.youtube.com/watch?v=${m[1]}` : url;
}

function AcademyVideoCard({ lesson, isPremium }) {
  const [playing, setPlaying] = useState(false);
  const [gated, setGated] = useState(false);
  const [embedError, setEmbedError] = useState(false);
  const timerRef = useRef(null);

  const previewSecs = lesson.free_preview_seconds || 60;
  const embedUrl = toEmbedUrl(lesson.embed_url || lesson.video_url);
  const watchUrl = toWatchUrl(lesson.video_url || lesson.embed_url);

  const handlePlay = () => {
    setGated(false);
    setEmbedError(false);
    setPlaying(true);
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
    setEmbedError(false);
    clearTimeout(timerRef.current);
  };

  useEffect(() => () => clearTimeout(timerRef.current), []);

  return (
    <motion.div layout className="rounded-2xl overflow-hidden flex flex-col"
      style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.07)" }}>

      {/* 16:9 video area */}
      <div className="relative w-full" style={{ paddingTop: "56.25%" }}>
        <div className="absolute inset-0">
          {playing && embedUrl && !embedError ? (
            <>
              <iframe
                src={`${embedUrl}?autoplay=1&rel=0`}
                title={lesson.title}
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                referrerPolicy="strict-origin-when-cross-origin"
                className="w-full h-full"
                onError={() => setEmbedError(true)}
              />
              {gated && <PremiumGateOverlay onClose={handleClose} />}
              <button onClick={handleClose}
                className="absolute top-2 right-2 z-30 w-7 h-7 rounded-full flex items-center justify-center"
                style={{ background: "rgba(0,0,0,0.7)" }}>
                <X className="w-3.5 h-3.5 text-white" />
              </button>
            </>
          ) : playing && embedError ? (
            <div className="w-full h-full flex flex-col items-center justify-center gap-3 px-6 text-center"
              style={{ background: "rgba(0,0,0,0.85)" }}>
              <GraduationCap className="w-7 h-7 text-white/30" />
              <p className="text-sm text-white/50">This Academy video can be watched on YouTube.</p>
              {watchUrl && (
                <a href={watchUrl} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold"
                  style={{ background: "rgba(212,168,67,0.15)", border: "1px solid rgba(212,168,67,0.3)", color: "#D4A843" }}>
                  <ExternalLink className="w-3.5 h-3.5" /> Watch on YouTube
                </a>
              )}
              <button onClick={handleClose} className="text-xs text-white/25 hover:text-white/50">← Back</button>
            </div>
          ) : gated ? (
            <div className="w-full h-full relative"
              style={{ background: "linear-gradient(135deg,rgba(212,168,67,0.06),rgba(0,0,0,0.9))" }}>
              {lesson.thumbnail_url && (
                <img src={lesson.thumbnail_url} alt={lesson.title}
                  className="absolute inset-0 w-full h-full object-cover opacity-20" />
              )}
              <PremiumGateOverlay onClose={handleClose} />
            </div>
          ) : (
            // Thumbnail + play button
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
              {lesson.is_featured && (
                <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full text-[9px] font-black flex items-center gap-1"
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
              {!lesson.is_premium && (
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
        {/* Labels */}
        {lesson.labels?.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {lesson.labels.map((label) => (
              <span key={label} className="text-[9px] font-bold px-2 py-0.5 rounded-full"
                style={{ background: "rgba(212,168,67,0.1)", border: "1px solid rgba(212,168,67,0.2)", color: "#D4A843" }}>
                {label}
              </span>
            ))}
          </div>
        )}
        <p className="font-heading font-bold text-white text-sm leading-snug">{lesson.title}</p>
        {lesson.description && (
          <p className="text-xs text-white/35 line-clamp-2 leading-relaxed">{lesson.description}</p>
        )}
        <div className="mt-auto pt-2">
          {lesson.is_premium && !isPremium ? (
            <div className="flex items-center gap-1.5 text-[10px] text-yellow-400/60">
              <Lock className="w-3 h-3" /> First {previewSecs}s free ·{" "}
              <span className="text-yellow-400/90 font-bold">Premium to unlock</span>
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
  const { user } = useAuth();
  const isPremium = user?.role === "premium" || user?.role === "admin";

  useEffect(() => {
    base44.entities.AcademyLesson.filter({ status: "published" }, "-release_date", 200)
      .then((data) => { setLessons(data); setLoading(false); });
  }, []);

  const sorted = useMemo(() => {
    const featured = lessons.filter((l) => l.is_featured);
    const rest = lessons.filter((l) => !l.is_featured);
    return [...featured, ...rest];
  }, [lessons]);

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
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <div className="w-6 h-6 border-2 border-yellow-400/20 border-t-yellow-400 rounded-full animate-spin" />
          </div>
        ) : sorted.length === 0 ? (
          <div className="text-center py-20">
            <GraduationCap className="w-12 h-12 text-white/10 mx-auto mb-4" />
            <p className="text-white/25 text-sm">No Academy videos yet. Import some in the Admin dashboard.</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {sorted.map((lesson, i) => (
              <motion.div key={lesson.id}
                initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}>
                <AcademyVideoCard lesson={lesson} isPremium={isPremium} />
              </motion.div>
            ))}
          </div>
        )}

        {/* Bottom CTA */}
        {!isPremium && lessons.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
            className="rounded-3xl p-10 text-center mt-16"
            style={{ background: "linear-gradient(135deg,rgba(212,168,67,0.08),rgba(0,229,255,0.05))", border: "1px solid rgba(212,168,67,0.15)" }}>
            <Crown className="w-8 h-8 text-yellow-400 mx-auto mb-4" />
            <h3 className="font-heading font-black text-2xl md:text-3xl text-white mb-3">Keep Watching With Premium</h3>
            <p className="text-sm text-white/35 max-w-md mx-auto mb-6 leading-relaxed">
              Unlock the full Upper Vibe Academy, music downloads, exclusive 432 Hz packs, and premium Upper Vibe Media content for{" "}
              <span className="text-yellow-400 font-bold">$4.99/month</span>.
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