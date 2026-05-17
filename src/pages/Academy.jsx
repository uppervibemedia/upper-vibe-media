import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { GraduationCap } from "lucide-react";
import FeaturedCourse from "../components/academy/FeaturedCourse";
import AcademyLessonCard from "../components/academy/AcademyLessonCard";
import Footer from "../components/shared/Footer";

const CATEGORIES = [
  "All",
  "Start Here",
  "432 Hz Music Education",
  "Subconscious Reprogramming",
  "Manifestation Through Music",
  "Nervous System Reset",
  "Daily Listening Routines",
  "Artist & Song Breakdowns",
];

const LESSONS = [
  {
    id: "l1",
    title: "How 432 Hz Music Works",
    category: "432 Hz Music Education",
    duration: "8 min",
    difficulty: "Beginner",
    description: "Learn why Upper Vibe Media uses 432 Hz versions and how to listen with intention.",
    thumbnail: "https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?w=600&q=80",
  },
  {
    id: "l2",
    title: "How To Reprogram Your Mind With Repetition",
    category: "Subconscious Reprogramming",
    duration: "12 min",
    difficulty: "Beginner",
    description: "Learn how repeated music, words, and emotional states influence your identity.",
    thumbnail: "https://images.unsplash.com/photo-1559752107-1f1b2b2e7b4e?w=600&q=80",
  },
  {
    id: "l3",
    title: "The 30-Day Nervous System Reset",
    category: "Nervous System Reset",
    duration: "20 min",
    difficulty: "Beginner",
    description: "A daily routine for helping your body feel safe with peace, success, and stability.",
    thumbnail: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=600&q=80",
  },
  {
    id: "l4",
    title: "How To Use Music While Visualizing",
    category: "Manifestation Through Music",
    duration: "10 min",
    difficulty: "Beginner",
    description: "Learn how to pair music with mental imagery to strengthen your future-self identity.",
    thumbnail: "https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=600&q=80",
  },
  {
    id: "l5",
    title: "Morning High-Vibe Listening Routine",
    category: "Daily Listening Routines",
    duration: "7 min",
    difficulty: "Beginner",
    description: "A simple morning routine using music before social media, stress, or outside opinions.",
    thumbnail: "https://images.unsplash.com/photo-1419242902214-272b3f66ee7a?w=600&q=80",
  },
  {
    id: "l6",
    title: "Why Lyrics Matter To Your Subconscious Mind",
    category: "Subconscious Reprogramming",
    duration: "9 min",
    difficulty: "Intermediate",
    description: "Learn why repeated lyrics can become identity programming.",
    thumbnail: "https://images.unsplash.com/photo-1510915361894-db8b60106cb1?w=600&q=80",
  },
];

export default function Academy() {
  const [activeCategory, setActiveCategory] = useState("All");
  const [saved, setSaved] = useState({});

  const filtered = activeCategory === "All"
    ? LESSONS
    : LESSONS.filter((l) => l.category === activeCategory);

  const toggleSave = (id) => setSaved((prev) => ({ ...prev, [id]: !prev[id] }));

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
          </motion.div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 pb-10">
        {/* Featured Course */}
        <FeaturedCourse />

        {/* Category filters */}
        <div className="flex gap-2 overflow-x-auto pb-4 mb-8 scrollbar-hide">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className="whitespace-nowrap px-4 py-2 rounded-full text-xs font-bold tracking-wider transition-all border flex-shrink-0"
              style={activeCategory === cat ? {
                background: "rgba(212,168,67,0.12)",
                borderColor: "rgba(212,168,67,0.35)",
                color: "#D4A843"
              } : {
                background: "rgba(255,255,255,0.03)",
                borderColor: "rgba(255,255,255,0.07)",
                color: "rgba(255,255,255,0.35)"
              }}>
              {cat}
            </button>
          ))}
        </div>

        {/* Lessons grid */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeCategory}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-16"
          >
            {filtered.map((lesson, i) => (
              <motion.div
                key={lesson.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.07 }}
              >
                <AcademyLessonCard
                  lesson={lesson}
                  saved={!!saved[lesson.id]}
                  onSave={() => toggleSave(lesson.id)}
                />
              </motion.div>
            ))}
          </motion.div>
        </AnimatePresence>

        {/* Bottom CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
          className="rounded-3xl p-10 text-center mb-10"
          style={{
            background: "linear-gradient(135deg,rgba(212,168,67,0.08),rgba(0,229,255,0.05))",
            border: "1px solid rgba(212,168,67,0.15)"
          }}>
          <h3 className="font-heading font-black text-2xl md:text-3xl text-white mb-3">
            Keep Watching With Premium
          </h3>
          <p className="text-sm text-white/35 max-w-md mx-auto mb-6 leading-relaxed">
            Unlock the full Upper Vibe Academy, music downloads, exclusive 432 Hz packs, and premium Upper Vibe Media content for $4.99/month.
          </p>
          <a href="/pricing"
            className="inline-flex items-center gap-2 px-8 py-3.5 rounded-full font-black text-sm tracking-wider transition-all hover:brightness-110 hover:scale-[1.02]"
            style={{ background: "linear-gradient(135deg,#D4A843,#F0C060)", color: "#000", boxShadow: "0 0 24px rgba(212,168,67,0.3)" }}>
            <GraduationCap className="w-4 h-4" /> Upgrade To Premium
          </a>
        </motion.div>
      </div>

      <Footer />
    </div>
  );
}