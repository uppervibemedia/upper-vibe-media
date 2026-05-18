import React, { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import {
  GraduationCap, Play, Crown, Lock, Star, CheckCircle2,
  Filter, Search, BookOpen, TrendingUp, Zap
} from "lucide-react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { useAcademyProgress } from "../hooks/useAcademyProgress";
import Footer from "../components/shared/Footer";

function toEmbedUrl(url) {
  if (!url) return null;
  const m = url.match(/(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/);
  return m ? `https://www.youtube.com/embed/${m[1]}` : (url.includes("/embed/") ? url : null);
}

const FILTERS = [
  { key: "all", label: "All Lessons" },
  { key: "free", label: "Free" },
  { key: "plus", label: "Plus Only" },
  { key: "started", label: "In Progress" },
  { key: "completed", label: "Completed" },
];

function LessonCard({ lesson, isPlus, getStatus }) {
  const status = getStatus(lesson.id);
  const canAccess = isPlus || !lesson.is_premium;
  const previewSecs = lesson.free_preview_seconds || 60;

  return (
    <Link to={`/academy/lesson/${lesson.id}`}
      className="group block rounded-3xl overflow-hidden transition-all duration-200 hover:border-white/15 hover:-translate-y-0.5"
      style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.07)" }}>

      {/* Thumbnail */}
      <div className="relative w-full" style={{ paddingTop: "56.25%" }}>
        <div className="absolute inset-0">
          {lesson.thumbnail_url ? (
            <img src={lesson.thumbnail_url} alt={lesson.title}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
          ) : (
            <div className="w-full h-full flex items-center justify-center"
              style={{ background: "linear-gradient(135deg,rgba(212,168,67,0.07),rgba(0,0,0,0.7))" }}>
              <GraduationCap className="w-10 h-10 text-white/10" />
            </div>
          )}

          {/* Overlay on hover */}
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200"
            style={{ background: "rgba(0,0,0,0.5)" }}>
            <div className="w-14 h-14 rounded-full flex items-center justify-center"
              style={{
                background: canAccess
                  ? "linear-gradient(135deg,#D4A843,#F0C060)"
                  : "rgba(212,168,67,0.2)",
                boxShadow: canAccess ? "0 0 28px rgba(212,168,67,0.4)" : "none"
              }}>
              {canAccess ? <Play className="w-6 h-6 text-black ml-0.5" /> : <Lock className="w-6 h-6 text-yellow-400" />}
            </div>
          </div>

          {/* Top badges */}
          <div className="absolute top-3 left-3">
            {lesson.is_featured && (
              <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black"
                style={{ background: "rgba(212,168,67,0.9)", color: "#000" }}>
                <Star className="w-2.5 h-2.5" /> Featured
              </span>
            )}
          </div>
          <div className="absolute top-3 right-3">
            {lesson.is_premium ? (
              <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black"
                style={{ background: "rgba(0,0,0,0.8)", border: "1px solid rgba(212,168,67,0.45)", color: "#D4A843" }}>
                <Crown className="w-2.5 h-2.5" /> Plus
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded-full text-[9px] font-black"
                style={{ background: "rgba(0,200,220,0.15)", border: "1px solid rgba(0,200,220,0.3)", color: "#00C9E0" }}>
                Free
              </span>
            )}
          </div>

          {/* Progress indicator bottom-left */}
          {status && (
            <div className="absolute bottom-3 left-3">
              {status === "completed" ? (
                <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black"
                  style={{ background: "rgba(34,197,94,0.85)", color: "#fff" }}>
                  <CheckCircle2 className="w-2.5 h-2.5" /> Done
                </span>
              ) : (
                <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black"
                  style={{ background: "rgba(0,200,220,0.85)", color: "#fff" }}>
                  <Play className="w-2.5 h-2.5" /> In Progress
                </span>
              )}
            </div>
          )}

          {/* Preview note for locked */}
          {lesson.is_premium && !isPlus && (
            <div className="absolute bottom-3 right-3">
              <span className="text-[8px] font-bold px-2 py-0.5 rounded-full"
                style={{ background: "rgba(0,0,0,0.7)", color: "rgba(255,255,255,0.4)" }}>
                {previewSecs}s preview
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Card body */}
      <div className="p-4">
        {lesson.labels?.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-2">
            {lesson.labels.slice(0, 3).map((l) => (
              <span key={l} className="text-[8px] font-bold px-2 py-0.5 rounded-full"
                style={{ background: "rgba(212,168,67,0.08)", border: "1px solid rgba(212,168,67,0.18)", color: "rgba(212,168,67,0.7)" }}>
                {l}
              </span>
            ))}
          </div>
        )}
        <p className="font-heading font-bold text-white text-sm leading-snug line-clamp-2 group-hover:text-yellow-200 transition-colors">
          {lesson.title}
        </p>
        {lesson.description && (
          <p className="text-xs text-white/30 mt-1.5 line-clamp-2 leading-relaxed">{lesson.description}</p>
        )}
        <div className="mt-3 flex items-center justify-between">
          <span className="text-[10px] font-black tracking-wide"
            style={{ color: canAccess ? "#00C9E0" : "rgba(212,168,67,0.6)" }}>
            {canAccess ? "Watch Now →" : "Preview Available →"}
          </span>
        </div>
      </div>
    </Link>
  );
}

export default function Academy() {
  const [lessons, setLessons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const { user } = useAuth();

  const isPlus = user?.role === "admin" || user?.isPlus === true || user?.tier === "plus" || user?.tier === "premium" || user?.isPremium === true || user?.role === "premium";
  const { getStatus, stats } = useAcademyProgress(user?.email);

  useEffect(() => {
    base44.entities.AcademyLesson.filter({ status: "published" }, "-display_order", 200)
      .then((data) => { setLessons(data); setLoading(false); });
  }, []);

  const filtered = useMemo(() => {
    let list = [...lessons];

    // Search
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((l) =>
        l.title?.toLowerCase().includes(q) ||
        l.description?.toLowerCase().includes(q) ||
        l.labels?.some((lbl) => lbl.toLowerCase().includes(q))
      );
    }

    // Filter tab
    if (filter === "free") list = list.filter((l) => !l.is_premium);
    else if (filter === "plus") list = list.filter((l) => l.is_premium);
    else if (filter === "started") list = list.filter((l) => getStatus(l.id) === "started");
    else if (filter === "completed") list = list.filter((l) => getStatus(l.id) === "completed");

    // Featured first
    const featured = list.filter((l) => l.is_featured);
    const rest = list.filter((l) => !l.is_featured);
    return [...featured, ...rest];
  }, [lessons, filter, search, getStatus]);

  const totalFree = lessons.filter((l) => !l.is_premium).length;
  const totalPlus = lessons.filter((l) => l.is_premium).length;

  return (
    <div className="min-h-screen">

      {/* ── Hero ── */}
      <div className="relative overflow-hidden pt-24 pb-12 px-6"
        style={{ background: "linear-gradient(180deg,rgba(212,168,67,0.05) 0%,transparent 100%)" }}>
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[350px] rounded-full opacity-[0.045] blur-[120px] pointer-events-none"
          style={{ background: "radial-gradient(circle,#D4A843,transparent)" }} />

        <div className="max-w-7xl mx-auto relative z-10">
          <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }}>

            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full mb-5 text-[10px] font-black tracking-[0.28em] uppercase"
              style={{ background: "rgba(212,168,67,0.1)", border: "1px solid rgba(212,168,67,0.22)", color: "#D4A843" }}>
              <GraduationCap className="w-3.5 h-3.5" /> Upper Vibe Academy
            </div>

            <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
              <div>
                <h1 className="font-heading font-black text-white mb-3 leading-tight"
                  style={{ fontSize: "clamp(2.2rem, 5vw, 3.5rem)" }}>
                  Upper Vibe Academy
                </h1>
                <p className="text-white/40 max-w-xl leading-relaxed text-base">
                  Go deeper into 432 Hz music, high-vibe sound, manifestation, and the creative process behind Upper Vibe Media.
                </p>
              </div>

              {/* Stats strip */}
              <div className="flex items-center gap-4 flex-shrink-0">
                <div className="text-center px-4 py-3 rounded-2xl"
                  style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
                  <p className="font-heading font-black text-white text-xl">{totalFree}</p>
                  <p className="text-[9px] font-black tracking-wider uppercase text-cyan-400/70">Free</p>
                </div>
                <div className="text-center px-4 py-3 rounded-2xl"
                  style={{ background: "rgba(212,168,67,0.05)", border: "1px solid rgba(212,168,67,0.18)" }}>
                  <p className="font-heading font-black text-white text-xl">{totalPlus}</p>
                  <p className="text-[9px] font-black tracking-wider uppercase text-yellow-400/70">Plus</p>
                </div>
                {user && stats.total > 0 && (
                  <div className="text-center px-4 py-3 rounded-2xl"
                    style={{ background: "rgba(34,197,94,0.05)", border: "1px solid rgba(34,197,94,0.18)" }}>
                    <p className="font-heading font-black text-white text-xl">{stats.completed}/{stats.total}</p>
                    <p className="text-[9px] font-black tracking-wider uppercase text-green-400/70">Done</p>
                  </div>
                )}
              </div>
            </div>

            {/* Plus upsell banner */}
            {!isPlus && (
              <div className="mt-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl"
                style={{ background: "rgba(212,168,67,0.06)", border: "1px solid rgba(212,168,67,0.18)" }}>
                <div className="flex items-center gap-3">
                  <Crown className="w-4 h-4 text-yellow-400 flex-shrink-0" />
                  <p className="text-sm text-white/55">
                    Free users get a <span className="text-yellow-400 font-bold">{lessons[0]?.free_preview_seconds || 60}-second preview</span> of Plus lessons.
                  </p>
                </div>
                <Link to="/membership"
                  className="flex-shrink-0 px-5 py-2 rounded-xl font-black text-xs tracking-wider transition-all hover:brightness-110"
                  style={{ background: "linear-gradient(135deg,#C8892A,#EDB84A)", color: "#000" }}>
                  Upgrade To Plus →
                </Link>
              </div>
            )}
          </motion.div>
        </div>
      </div>

      {/* ── Filters + Search ── */}
      <div className="max-w-7xl mx-auto px-6 mb-8">
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search */}
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search lessons..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm text-white placeholder:text-white/25 focus:outline-none"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
            />
          </div>

          {/* Filter tabs */}
          <div className="flex items-center gap-1 flex-wrap">
            {FILTERS.map((f) => (
              <button key={f.key} onClick={() => setFilter(f.key)}
                className="px-3.5 py-2 rounded-xl text-xs font-black tracking-wide transition-all"
                style={filter === f.key
                  ? { background: "rgba(212,168,67,0.15)", border: "1px solid rgba(212,168,67,0.35)", color: "#EDB84A" }
                  : { background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.4)" }}>
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Lesson grid ── */}
      <div className="max-w-7xl mx-auto px-6 pb-20">
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <div className="w-6 h-6 border-2 border-yellow-400/20 border-t-yellow-400 rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <GraduationCap className="w-12 h-12 text-white/10 mx-auto mb-4" />
            <p className="text-white/25 text-sm">
              {search ? "No lessons match your search." : "No lessons here yet."}
            </p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtered.map((lesson, i) => (
              <motion.div key={lesson.id}
                initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(i * 0.04, 0.3) }}>
                <LessonCard lesson={lesson} isPlus={isPlus} getStatus={getStatus} />
              </motion.div>
            ))}
          </div>
        )}

        {/* Bottom CTA */}
        {!isPlus && lessons.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
            className="rounded-3xl p-10 text-center mt-16"
            style={{ background: "linear-gradient(135deg,rgba(212,168,67,0.07),rgba(0,229,255,0.03))", border: "1px solid rgba(212,168,67,0.15)" }}>
            <Crown className="w-8 h-8 text-yellow-400 mx-auto mb-4" />
            <h3 className="font-heading font-black text-2xl text-white mb-3">Unlock the Full Academy</h3>
            <p className="text-sm text-white/35 max-w-sm mx-auto mb-6 leading-relaxed">
              Upgrade to Upper Vibe Plus for full lesson access, music downloads, and new releases — from <span className="text-yellow-400 font-bold">$4.99/month</span>.
            </p>
            <Link to="/membership"
              className="inline-flex items-center gap-2 px-8 py-3.5 rounded-2xl font-black text-sm tracking-wider transition-all hover:brightness-110"
              style={{ background: "linear-gradient(135deg,#C8892A,#EDB84A)", color: "#000", boxShadow: "0 0 24px rgba(212,168,67,0.25)" }}>
              <Zap className="w-4 h-4" /> Upgrade To Plus
            </Link>
          </motion.div>
        )}
      </div>

      <Footer />
    </div>
  );
}