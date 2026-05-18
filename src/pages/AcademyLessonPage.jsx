import React, { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { useParams, Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft, Crown, Lock, Play, CheckCircle2,
  ExternalLink, GraduationCap, Star, Tag
} from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { useAcademyProgress } from "../hooks/useAcademyProgress";

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

export default function AcademyLessonPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [lesson, setLesson] = useState(null);
  const [relatedLessons, setRelatedLessons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [playing, setPlaying] = useState(false);
  const [gated, setGated] = useState(false);
  const timerRef = useRef(null);

  const isPlus = user?.role === "admin" || user?.isPlus === true || user?.tier === "plus" || user?.tier === "premium" || user?.isPremium === true || user?.role === "premium";
  const { getStatus, markStarted, markCompleted } = useAcademyProgress(user?.email);

  useEffect(() => {
    Promise.all([
      base44.entities.AcademyLesson.filter({ id }),
      base44.entities.AcademyLesson.filter({ status: "published" }, "-display_order", 8),
    ]).then(([found, all]) => {
      const l = found[0] || null;
      setLesson(l);
      setRelatedLessons(all.filter((r) => r.id !== id).slice(0, 5));
      setLoading(false);
    });
  }, [id]);

  const handlePlay = () => {
    if (!lesson) return;
    setGated(false);
    setPlaying(true);
    markStarted(lesson.id);

    if (!isPlus && lesson.is_premium) {
      const secs = lesson.free_preview_seconds || 60;
      clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        setPlaying(false);
        setGated(true);
      }, secs * 1000);
    }
  };

  const handleMarkComplete = () => {
    if (lesson) markCompleted(lesson.id);
  };

  useEffect(() => () => clearTimeout(timerRef.current), []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-yellow-400/20 border-t-yellow-400 rounded-full animate-spin" />
      </div>
    );
  }

  if (!lesson) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6 text-center">
        <div>
          <GraduationCap className="w-12 h-12 text-white/15 mx-auto mb-4" />
          <p className="text-white/40 mb-4">Lesson not found.</p>
          <Link to="/academy" className="text-yellow-400 hover:underline text-sm">← Back to Academy</Link>
        </div>
      </div>
    );
  }

  const embedUrl = toEmbedUrl(lesson.embed_url || lesson.video_url);
  const watchUrl = toWatchUrl(lesson.video_url || lesson.embed_url);
  const canWatch = isPlus || !lesson.is_premium;
  const status = getStatus(lesson.id);
  const previewSecs = lesson.free_preview_seconds || 60;

  return (
    <div className="min-h-screen pb-28 lg:pb-12 pt-16 lg:pt-0">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:pt-8">

        {/* Back nav */}
        <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="mb-6">
          <Link to="/academy"
            className="inline-flex items-center gap-2 text-sm text-white/40 hover:text-white/80 transition-colors">
            <ArrowLeft className="w-4 h-4" /> Back to Academy
          </Link>
        </motion.div>

        <div className="grid lg:grid-cols-[1fr_320px] gap-8">

          {/* ── Main content ── */}
          <div>
            {/* Video player */}
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
              className="rounded-3xl overflow-hidden relative mb-6"
              style={{ background: "rgba(0,0,0,0.6)", border: "1px solid rgba(255,255,255,0.07)" }}>

              <div className="relative w-full" style={{ paddingTop: "56.25%" }}>
                <div className="absolute inset-0">

                  {/* Playing */}
                  {playing && embedUrl && !gated && (
                    <iframe
                      src={`${embedUrl}?autoplay=1&rel=0`}
                      title={lesson.title}
                      frameBorder="0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      referrerPolicy="strict-origin-when-cross-origin"
                      className="w-full h-full"
                    />
                  )}

                  {/* Gated overlay */}
                  {gated && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center px-8 text-center"
                      style={{ background: "linear-gradient(180deg,rgba(4,4,14,0.5) 0%,rgba(4,4,14,0.97) 55%)" }}>
                      {lesson.thumbnail_url && (
                        <img src={lesson.thumbnail_url} alt="" className="absolute inset-0 w-full h-full object-cover opacity-15" />
                      )}
                      <div className="relative z-10">
                        <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
                          style={{ background: "rgba(212,168,67,0.15)", border: "1px solid rgba(212,168,67,0.35)" }}>
                          <Crown className="w-7 h-7 text-yellow-400" />
                        </div>
                        <h3 className="font-heading font-black text-2xl text-white mb-2">Unlock Full Lesson</h3>
                        <p className="text-white/45 text-sm leading-relaxed mb-6 max-w-xs mx-auto">
                          Upgrade to Upper Vibe Plus to watch this lesson in full, download music, and access the complete Academy.
                        </p>
                        <div className="flex flex-col sm:flex-row gap-3 justify-center">
                          <Link to="/membership"
                            className="px-7 py-3 rounded-2xl font-black text-sm tracking-wider hover:brightness-110 transition-all"
                            style={{ background: "linear-gradient(135deg,#C8892A,#EDB84A)", color: "#000", boxShadow: "0 0 24px rgba(212,168,67,0.3)" }}>
                            Upgrade To Plus
                          </Link>
                          <button onClick={() => setGated(false)}
                            className="px-5 py-3 rounded-2xl text-sm font-semibold text-white/40 hover:text-white/70 transition-colors"
                            style={{ border: "1px solid rgba(255,255,255,0.1)" }}>
                            Browse Free Lessons
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Thumbnail / play state */}
                  {!playing && !gated && (
                    <div className="w-full h-full cursor-pointer group relative" onClick={canWatch || !lesson.is_premium ? handlePlay : undefined}>
                      {lesson.thumbnail_url ? (
                        <img src={lesson.thumbnail_url} alt={lesson.title}
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center"
                          style={{ background: "linear-gradient(135deg,rgba(212,168,67,0.07),rgba(0,0,0,0.8))" }}>
                          <GraduationCap className="w-16 h-16 text-white/10" />
                        </div>
                      )}

                      {/* Plus gate over thumbnail */}
                      {lesson.is_premium && !isPlus ? (
                        <div className="absolute inset-0 flex flex-col items-center justify-center"
                          style={{ background: "rgba(0,0,0,0.65)" }}>
                          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
                            style={{ background: "rgba(212,168,67,0.15)", border: "1px solid rgba(212,168,67,0.35)" }}>
                            <Lock className="w-8 h-8 text-yellow-400" />
                          </div>
                          <p className="text-white font-heading font-black text-lg mb-1">Plus Access Required</p>
                          <p className="text-white/40 text-xs mb-4">First {previewSecs}s free preview available</p>
                          <div className="flex gap-3">
                            <button onClick={handlePlay}
                              className="px-5 py-2.5 rounded-xl font-black text-xs tracking-wider transition-all hover:brightness-110"
                              style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)", color: "rgba(255,255,255,0.7)" }}>
                              <Play className="w-3 h-3 inline mr-1.5" />Watch Preview
                            </button>
                            <Link to="/membership"
                              className="px-5 py-2.5 rounded-xl font-black text-xs tracking-wider transition-all hover:brightness-110"
                              style={{ background: "linear-gradient(135deg,#C8892A,#EDB84A)", color: "#000" }}>
                              Upgrade To Plus
                            </Link>
                          </div>
                        </div>
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center"
                          style={{ background: "rgba(0,0,0,0.3)" }}>
                          <div className="w-16 h-16 rounded-full flex items-center justify-center transition-transform group-hover:scale-110"
                            style={{ background: "linear-gradient(135deg,#D4A843,#F0C060)", boxShadow: "0 0 32px rgba(212,168,67,0.45)" }}>
                            <Play className="w-7 h-7 text-black ml-1" />
                          </div>
                        </div>
                      )}

                      {/* Badges */}
                      {lesson.is_featured && (
                        <div className="absolute top-3 left-3 flex items-center gap-1 px-2.5 py-1 rounded-full text-[9px] font-black"
                          style={{ background: "rgba(212,168,67,0.9)", color: "#000" }}>
                          <Star className="w-2.5 h-2.5" /> Featured
                        </div>
                      )}
                      {lesson.is_premium ? (
                        <div className="absolute top-3 right-3 flex items-center gap-1 px-2.5 py-1 rounded-full text-[9px] font-black"
                          style={{ background: "rgba(0,0,0,0.8)", border: "1px solid rgba(212,168,67,0.45)", color: "#D4A843" }}>
                          <Crown className="w-2.5 h-2.5" /> Plus
                        </div>
                      ) : (
                        <div className="absolute top-3 right-3 px-2.5 py-1 rounded-full text-[9px] font-black"
                          style={{ background: "rgba(0,200,220,0.15)", border: "1px solid rgba(0,200,220,0.35)", color: "#00C9E0" }}>
                          Free
                        </div>
                      )}
                    </div>
                  )}

                </div>
              </div>
            </motion.div>

            {/* Lesson info */}
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
              {/* Title row */}
              <div className="flex items-start justify-between gap-4 mb-4">
                <div className="flex-1">
                  {lesson.labels?.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {lesson.labels.map((l) => (
                        <span key={l} className="flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded-full"
                          style={{ background: "rgba(212,168,67,0.1)", border: "1px solid rgba(212,168,67,0.2)", color: "#D4A843" }}>
                          <Tag className="w-2 h-2" />{l}
                        </span>
                      ))}
                    </div>
                  )}
                  <h1 className="font-heading font-black text-white leading-tight"
                    style={{ fontSize: "clamp(1.3rem, 2.5vw, 1.8rem)" }}>
                    {lesson.title}
                  </h1>
                </div>
                {/* Progress action */}
                {user && (isPlus || !lesson.is_premium) && (
                  <button onClick={handleMarkComplete}
                    className="flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all hover:brightness-110"
                    style={status === "completed"
                      ? { background: "rgba(34,197,94,0.12)", border: "1px solid rgba(34,197,94,0.3)", color: "#4ade80" }
                      : { background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.4)" }}>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    {status === "completed" ? "Completed" : "Mark Complete"}
                  </button>
                )}
              </div>

              {/* Progress pill */}
              {status && (
                <div className="flex items-center gap-2 mb-4">
                  {status === "completed" ? (
                    <span className="flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full"
                      style={{ background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.25)", color: "#4ade80" }}>
                      <CheckCircle2 className="w-3 h-3" /> Completed
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full"
                      style={{ background: "rgba(0,200,220,0.08)", border: "1px solid rgba(0,200,220,0.2)", color: "#00C9E0" }}>
                      <Play className="w-3 h-3" /> In Progress
                    </span>
                  )}
                </div>
              )}

              {lesson.description && (
                <p className="text-white/45 text-sm leading-relaxed mb-6 max-w-2xl">{lesson.description}</p>
              )}

              {/* Watch on YouTube fallback */}
              {watchUrl && (
                <a href={watchUrl} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-xs font-bold text-white/30 hover:text-white/60 transition-colors mb-6">
                  <ExternalLink className="w-3.5 h-3.5" /> Watch on YouTube
                </a>
              )}

              {/* Plus upsell if not subscribed and lesson is premium */}
              {lesson.is_premium && !isPlus && !user && (
                <div className="p-5 rounded-2xl mb-6"
                  style={{ background: "rgba(212,168,67,0.05)", border: "1px solid rgba(212,168,67,0.2)" }}>
                  <div className="flex items-center gap-3 mb-3">
                    <Crown className="w-5 h-5 text-yellow-400 flex-shrink-0" />
                    <p className="font-bold text-white text-sm">Upper Vibe Plus required for full access</p>
                  </div>
                  <p className="text-white/40 text-xs leading-relaxed mb-4">
                    Create a free account to track progress. Upgrade to Plus for full lesson access, downloads, and the complete Academy.
                  </p>
                  <div className="flex gap-3">
                    <Link to="/membership"
                      className="px-5 py-2.5 rounded-xl font-black text-xs tracking-wider transition-all hover:brightness-110"
                      style={{ background: "linear-gradient(135deg,#C8892A,#EDB84A)", color: "#000" }}>
                      Upgrade To Plus
                    </Link>
                  </div>
                </div>
              )}
            </motion.div>
          </div>

          {/* ── Sidebar: related lessons ── */}
          <motion.div initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15 }}>
            <h3 className="font-heading font-black text-white text-sm tracking-wide uppercase mb-4 flex items-center gap-2">
              <GraduationCap className="w-4 h-4 text-yellow-400" /> More Lessons
            </h3>
            <div className="space-y-3">
              {relatedLessons.map((rel) => {
                const relStatus = getStatus(rel.id);
                return (
                  <Link key={rel.id} to={`/academy/lesson/${rel.id}`}
                    className="flex items-start gap-3 p-3 rounded-2xl group transition-all hover:border-white/15 block"
                    style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.07)" }}>
                    <div className="relative flex-shrink-0 w-20 h-14 rounded-xl overflow-hidden bg-black">
                      {rel.thumbnail_url ? (
                        <img src={rel.thumbnail_url} alt={rel.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <GraduationCap className="w-5 h-5 text-white/15" />
                        </div>
                      )}
                      {rel.is_premium && !isPlus && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                          <Lock className="w-3.5 h-3.5 text-yellow-400/80" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-white leading-snug line-clamp-2 group-hover:text-yellow-300 transition-colors">
                        {rel.title}
                      </p>
                      <div className="flex items-center gap-2 mt-1.5">
                        {rel.is_premium ? (
                          <span className="text-[8px] font-black px-1.5 py-0.5 rounded-full"
                            style={{ background: "rgba(212,168,67,0.12)", border: "1px solid rgba(212,168,67,0.25)", color: "#D4A843" }}>
                            Plus
                          </span>
                        ) : (
                          <span className="text-[8px] font-black px-1.5 py-0.5 rounded-full"
                            style={{ background: "rgba(0,200,220,0.08)", color: "#00C9E0" }}>
                            Free
                          </span>
                        )}
                        {relStatus === "completed" && <CheckCircle2 className="w-3 h-3 text-green-400" />}
                        {relStatus === "started" && <Play className="w-3 h-3 text-cyan-400" />}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </motion.div>

        </div>
      </div>
    </div>
  );
}