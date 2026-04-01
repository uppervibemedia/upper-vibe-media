import React, { useState } from "react";
import { motion } from "framer-motion";
import { Brain, Zap, Sparkles, Play, Lock, Crown, ArrowRight, BookOpen, Target, Flame, Eye, TrendingUp, Star } from "lucide-react";
import { Link } from "react-router-dom";
import LessonCard from "../components/academy/LessonCard";
import SeriesCard from "../components/academy/SeriesCard";
import AcademyUpgradeBanner from "../components/academy/AcademyUpgradeBanner";
import GlowButton from "../components/shared/GlowButton";
import Footer from "../components/shared/Footer";

const CATEGORIES = [
  { id: "all", label: "All Lessons", icon: BookOpen },
  { id: "mindset", label: "Mindset & Reprogramming", icon: Brain },
  { id: "manifestation", label: "Manifestation", icon: Sparkles },
  { id: "identity", label: "Self-Concept & Identity", icon: Eye },
  { id: "habits", label: "Success Habits", icon: TrendingUp },
  { id: "focus", label: "Focus & Discipline", icon: Target },
  { id: "energy", label: "Energy & Frequency", icon: Zap },
  { id: "wealth", label: "Wealth Mindset", icon: Star },
  { id: "spiritual", label: "Spiritual Growth", icon: Flame },
];

const FEATURED_LESSONS = [
  {
    id: "l1",
    title: "The Identity Shift — Become Who You're Meant to Be",
    description: "Discover how your self-concept controls everything. This session rewires how you see yourself at the deepest level.",
    category: "identity",
    duration: "18:42",
    tier: "free",
    thumbnail: "https://media.base44.com/images/public/69cd68afb7fe90ae92757154/213cbf8ff_generated_d250d71f.png",
    series: "Identity Shift Series",
    featured: true,
  },
  {
    id: "l2",
    title: "Reprogram Your Subconscious in 21 Days",
    description: "A step-by-step framework to dissolve limiting beliefs and install a new operating system for your mind.",
    category: "mindset",
    duration: "24:15",
    tier: "supporter",
    thumbnail: "https://media.base44.com/images/public/69cd68afb7fe90ae92757154/8c8572f77_generated_eba73262.png",
    series: "Reprogram Your Mind",
    featured: true,
  },
  {
    id: "l3",
    title: "Manifest Mode: How to Align Thought, Emotion & Action",
    description: "The complete manifestation system used by high performers. Learn to collapse time and attract your vision.",
    category: "manifestation",
    duration: "31:08",
    tier: "premium",
    thumbnail: "https://media.base44.com/images/public/69cd68afb7fe90ae92757154/04c14ab4a_generated_3bb88730.png",
    series: "Manifest Mode",
    featured: true,
  },
];

const ALL_LESSONS = [
  {
    id: "l4",
    title: "Survival Mode Off — Exit the Scarcity Loop",
    description: "Break out of survival programming and step into an abundance frequency.",
    category: "mindset",
    duration: "22:30",
    tier: "supporter",
    thumbnail: "https://media.base44.com/images/public/69cd68afb7fe90ae92757154/b5544df7f_generated_ee779889.png",
    series: "Survival Mode Off",
  },
  {
    id: "l5",
    title: "The Wealth Frequency — Rewire Money Beliefs",
    description: "Identify and dissolve the subconscious blocks keeping you from financial alignment.",
    category: "wealth",
    duration: "27:14",
    tier: "premium",
    thumbnail: "https://media.base44.com/images/public/69cd68afb7fe90ae92757154/11801d304_generated_aecb4feb.png",
    series: "Wealth Frequency",
  },
  {
    id: "l6",
    title: "Focus Reset: Train Your Brain for Undistracted Output",
    description: "Build elite-level mental discipline and reclaim your attention from distraction.",
    category: "focus",
    duration: "19:55",
    tier: "supporter",
    thumbnail: "https://media.base44.com/images/public/69cd68afb7fe90ae92757154/e6873b16a_generated_f48c8f96.png",
    series: "Focus and Discipline Reset",
  },
  {
    id: "l7",
    title: "Raise Your Standard — The Success Identity Protocol",
    description: "Stop tolerating mediocrity. This session installs a new personal standard that demands excellence.",
    category: "habits",
    duration: "16:40",
    tier: "free",
    thumbnail: "https://media.base44.com/images/public/69cd68afb7fe90ae92757154/8c8572f77_generated_eba73262.png",
    series: "Identity Shift Series",
  },
  {
    id: "l8",
    title: "Subconscious Upgrade: Sleep, Sound & Reprogramming",
    description: "Use theta-state audio and intentional sleep routines to accelerate your reprogramming.",
    category: "energy",
    duration: "35:00",
    tier: "premium",
    thumbnail: "https://media.base44.com/images/public/69cd68afb7fe90ae92757154/04c14ab4a_generated_3bb88730.png",
    series: "Subconscious Upgrade Series",
  },
  {
    id: "l9",
    title: "The Inner Game of Manifestation",
    description: "Dive into the psychological foundations of attraction and why most people get it wrong.",
    category: "manifestation",
    duration: "29:22",
    tier: "premium",
    thumbnail: "https://media.base44.com/images/public/69cd68afb7fe90ae92757154/213cbf8ff_generated_d250d71f.png",
    series: "Manifest Mode",
  },
  {
    id: "l10",
    title: "Spiritual Elevation: Frequency, Purpose & Alignment",
    description: "Connect with a deeper sense of purpose and begin living from your highest frequency.",
    category: "spiritual",
    duration: "41:10",
    tier: "premium",
    thumbnail: "https://media.base44.com/images/public/69cd68afb7fe90ae92757154/b5544df7f_generated_ee779889.png",
    series: "Subconscious Upgrade Series",
  },
  {
    id: "l11",
    title: "Morning Architecture — Build a High-Performance Day",
    description: "Design a morning ritual that primes your neurology for focus, energy, and intentional action.",
    category: "habits",
    duration: "14:50",
    tier: "free",
    thumbnail: "https://media.base44.com/images/public/69cd68afb7fe90ae92757154/11801d304_generated_aecb4feb.png",
    series: "Survival Mode Off",
  },
  {
    id: "l12",
    title: "Emotional Mastery: Control the Energy You Carry",
    description: "Learn to regulate emotional states, shift out of reactivity, and operate from a place of power.",
    category: "focus",
    duration: "23:18",
    tier: "supporter",
    thumbnail: "https://media.base44.com/images/public/69cd68afb7fe90ae92757154/e6873b16a_generated_f48c8f96.png",
    series: "Focus and Discipline Reset",
  },
];

const SERIES = [
  {
    id: "s1",
    name: "Reprogram Your Mind",
    description: "A deep-dive series to dissolve limiting beliefs and install a high-performance mindset.",
    lessons: 6,
    tier: "supporter",
    thumbnail: "https://media.base44.com/images/public/69cd68afb7fe90ae92757154/8c8572f77_generated_eba73262.png",
    category: "mindset",
  },
  {
    id: "s2",
    name: "Manifest Mode",
    description: "The complete manifestation operating system — thoughts, emotions, identity, and aligned action.",
    lessons: 8,
    tier: "premium",
    thumbnail: "https://media.base44.com/images/public/69cd68afb7fe90ae92757154/04c14ab4a_generated_3bb88730.png",
    category: "manifestation",
  },
  {
    id: "s3",
    name: "Survival Mode Off",
    description: "Exit the fear-based scarcity loop and step into an abundance identity for good.",
    lessons: 5,
    tier: "supporter",
    thumbnail: "https://media.base44.com/images/public/69cd68afb7fe90ae92757154/b5544df7f_generated_ee779889.png",
    category: "mindset",
  },
  {
    id: "s4",
    name: "Identity Shift Series",
    description: "Reconstruct your self-concept from the ground up. Become the version of you that changes everything.",
    lessons: 7,
    tier: "free",
    thumbnail: "https://media.base44.com/images/public/69cd68afb7fe90ae92757154/213cbf8ff_generated_d250d71f.png",
    category: "identity",
  },
  {
    id: "s5",
    name: "Wealth Frequency",
    description: "Rewire your relationship with money, success, and abundance at the subconscious level.",
    lessons: 6,
    tier: "premium",
    thumbnail: "https://media.base44.com/images/public/69cd68afb7fe90ae92757154/11801d304_generated_aecb4feb.png",
    category: "wealth",
  },
  {
    id: "s6",
    name: "Subconscious Upgrade Series",
    description: "Advanced reprogramming techniques using sound, sleep, and intentional practice.",
    lessons: 9,
    tier: "premium",
    thumbnail: "https://media.base44.com/images/public/69cd68afb7fe90ae92757154/e6873b16a_generated_f48c8f96.png",
    category: "energy",
  },
];

export default function Academy() {
  const [activeCategory, setActiveCategory] = useState("all");

  const filteredLessons = activeCategory === "all"
    ? ALL_LESSONS
    : ALL_LESSONS.filter((l) => l.category === activeCategory);

  return (
    <div>
      {/* Hero */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0">
          <img
            src="https://media.base44.com/images/public/69cd68afb7fe90ae92757154/70e23e35f_generated_b5746c08.png"
            alt="Academy"
            className="w-full h-full object-cover opacity-20"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-background/60 via-background/80 to-background" />
          {/* Glow orbs */}
          <div className="absolute top-1/2 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl -translate-y-1/2" />
          <div className="absolute top-1/2 right-1/4 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl -translate-y-1/2" />
        </div>

        <div className="relative max-w-7xl mx-auto px-6 py-20 md:py-28">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-3xl"
          >
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-primary/30 bg-primary/5 mb-6">
              <Brain className="w-3.5 h-3.5 text-primary" />
              <span className="text-xs font-bold tracking-widest uppercase text-primary">Upper Vibe Academy</span>
            </div>
            <h1 className="font-heading font-extrabold text-4xl md:text-6xl tracking-tight mb-6 leading-[1.05]">
              Unlock the Next
              <br />
              <span className="text-primary text-glow-blue">Version of Yourself</span>
            </h1>
            <p className="text-muted-foreground text-base md:text-lg leading-relaxed mb-8 max-w-xl">
              This is the inner game. Reprogram your mind, shift your identity, and train your consciousness for manifestation. Upper Vibe Academy is where transformation becomes your daily practice.
            </p>
            <div className="flex flex-wrap gap-4">
              <GlowButton variant="primary" size="lg">
                <Play className="w-4 h-4 mr-2" />
                Start Your First Lesson
              </GlowButton>
              <GlowButton variant="outline" to="/pricing" size="lg">
                <Crown className="w-4 h-4 mr-2" />
                Unlock Full Academy
              </GlowButton>
            </div>
          </motion.div>

          {/* Stats row */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="flex flex-wrap gap-8 mt-14"
          >
            {[
              { label: "Transformation Lessons", value: "50+" },
              { label: "Lesson Series", value: "8" },
              { label: "Categories", value: "8" },
              { label: "Hours of Content", value: "20+" },
            ].map((s) => (
              <div key={s.label}>
                <p className="font-heading font-extrabold text-2xl text-primary text-glow-blue">{s.value}</p>
                <p className="text-xs text-muted-foreground tracking-wider uppercase mt-0.5">{s.label}</p>
              </div>
            ))}
          </motion.div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-10">
        {/* Upgrade banner */}
        <AcademyUpgradeBanner />

        {/* Featured Lessons */}
        <section className="mb-16 mt-12">
          <div className="flex items-center justify-between mb-6">
            <div>
              <p className="text-xs font-semibold tracking-[0.2em] uppercase text-primary text-glow-blue mb-1">Start Here</p>
              <h2 className="font-heading font-extrabold text-2xl md:text-3xl">Featured Lessons</h2>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-5">
            {FEATURED_LESSONS.map((lesson, i) => (
              <motion.div
                key={lesson.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
              >
                <LessonCard lesson={lesson} featured />
              </motion.div>
            ))}
          </div>
        </section>

        {/* Series */}
        <section className="mb-16">
          <div className="flex items-center justify-between mb-6">
            <div>
              <p className="text-xs font-semibold tracking-[0.2em] uppercase text-secondary text-glow-gold mb-1">Structured Learning</p>
              <h2 className="font-heading font-extrabold text-2xl md:text-3xl">Transformation Series</h2>
            </div>
          </div>
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-5">
            {SERIES.map((series, i) => (
              <motion.div
                key={series.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
              >
                <SeriesCard series={series} />
              </motion.div>
            ))}
          </div>
        </section>

        {/* Category filter + lessons */}
        <section className="mb-16">
          <div className="mb-6">
            <p className="text-xs font-semibold tracking-[0.2em] uppercase text-muted-foreground mb-1">Browse by Topic</p>
            <h2 className="font-heading font-extrabold text-2xl md:text-3xl mb-5">Lesson Library</h2>
            <div className="flex gap-2 overflow-x-auto pb-3 scrollbar-hide">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  className={`whitespace-nowrap flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold tracking-wider uppercase transition-all border ${
                    activeCategory === cat.id
                      ? "bg-primary/10 border-primary/40 text-primary"
                      : "border-border/30 text-muted-foreground hover:text-foreground hover:border-border/60"
                  }`}
                >
                  <cat.icon className="w-3 h-3" />
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filteredLessons.map((lesson, i) => (
              <motion.div
                key={lesson.id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <LessonCard lesson={lesson} />
              </motion.div>
            ))}
          </div>
        </section>

        {/* Bottom CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="rounded-2xl overflow-hidden relative mb-12"
        >
          <div className="absolute inset-0">
            <img
              src="https://media.base44.com/images/public/69cd68afb7fe90ae92757154/ebf0a13c4_generated_ca1c1780.png"
              alt="Upgrade"
              className="w-full h-full object-cover opacity-15"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-background via-background/90 to-accent/40" />
          </div>
          <div className="relative px-8 py-14 md:px-14 text-center md:text-left max-w-2xl">
            <p className="text-xs font-bold tracking-widest uppercase text-secondary text-glow-gold mb-3">Enter the Transformation Vault</p>
            <h3 className="font-heading font-extrabold text-3xl md:text-4xl mb-4 leading-tight">
              The Full Academy Is Waiting.
              <br />
              <span className="text-primary text-glow-blue">Are You Ready?</span>
            </h3>
            <p className="text-muted-foreground mb-8 leading-relaxed">
              Reprogram your mind. Shift your identity. Unlock every lesson, every series, and every tool inside the Upper Vibe Academy. Premium starts at $9.99/month.
            </p>
            <div className="flex flex-wrap gap-4 justify-center md:justify-start">
              <GlowButton to="/pricing" variant="primary" size="lg">
                <Sparkles className="w-4 h-4 mr-2" />
                Unlock Full Academy — $9.99/mo
              </GlowButton>
              <GlowButton to="/pricing" variant="outline" size="lg">
                View All Plans
              </GlowButton>
            </div>
          </div>
        </motion.div>
      </div>

      <Footer />
    </div>
  );
}