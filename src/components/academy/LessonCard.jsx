import React from "react";
import { motion } from "framer-motion";
import { Play, Lock, Clock, BookOpen } from "lucide-react";

const TIER_BADGE = {
  free: { label: "Free Preview", color: "bg-muted/60 text-muted-foreground border-border/40" },
  supporter: { label: "Supporter", color: "bg-purple-500/10 text-purple-400 border-purple-500/20" },
  premium: { label: "Premium", color: "bg-primary/10 text-primary border-primary/20" },
};

const CATEGORY_LABEL = {
  mindset: "Mindset",
  manifestation: "Manifestation",
  identity: "Identity",
  habits: "Habits",
  focus: "Focus",
  energy: "Energy",
  wealth: "Wealth",
  spiritual: "Spiritual",
};

export default function LessonCard({ lesson, featured = false }) {
  const badge = TIER_BADGE[lesson.tier] || TIER_BADGE.free;
  const locked = lesson.tier !== "free";
  const catLabel = CATEGORY_LABEL[lesson.category] || lesson.category;

  return (
    <motion.div
      whileHover={{ y: -4, scale: 1.015 }}
      transition={{ type: "spring", damping: 20 }}
      className={`group relative rounded-xl overflow-hidden bg-card/50 border border-border/30 hover:border-primary/30 cursor-pointer transition-all ${featured ? "glow-blue" : ""}`}
    >
      {/* Thumbnail */}
      <div className={`relative overflow-hidden ${featured ? "aspect-video" : "aspect-video"}`}>
        <img
          src={lesson.thumbnail}
          alt={lesson.title}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/30 to-transparent" />

        {/* Play / Lock overlay */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          <div className={`w-14 h-14 rounded-full backdrop-blur-md flex items-center justify-center ${locked ? "bg-muted/70" : "bg-primary/80 glow-blue"}`}>
            {locked
              ? <Lock className="w-5 h-5 text-muted-foreground" />
              : <Play className="w-6 h-6 text-primary-foreground ml-1" />
            }
          </div>
        </div>

        {/* Duration badge */}
        <div className="absolute bottom-2 right-2 flex items-center gap-1 px-2 py-0.5 rounded-md bg-background/80 backdrop-blur-sm">
          <Clock className="w-3 h-3 text-muted-foreground" />
          <span className="text-[10px] text-muted-foreground font-medium">{lesson.duration}</span>
        </div>

        {/* Tier badge */}
        <div className={`absolute top-2 left-2 px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-widest uppercase border ${badge.color}`}>
          {badge.label}
        </div>

        {/* Featured indicator */}
        {featured && (
          <div className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-secondary/20 border border-secondary/30 text-[10px] font-bold tracking-wider uppercase text-secondary">
            Featured
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-4">
        <div className="flex items-center gap-1.5 mb-2">
          <BookOpen className="w-3 h-3 text-muted-foreground" />
          <span className="text-[10px] text-muted-foreground tracking-widest uppercase font-semibold">{catLabel}</span>
        </div>
        <h3 className="font-heading font-bold text-sm leading-snug text-foreground mb-1 line-clamp-2">{lesson.title}</h3>
        {featured && (
          <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2 mb-2">{lesson.description}</p>
        )}
        {lesson.series && (
          <p className="text-[10px] text-primary/60 tracking-wider">{lesson.series}</p>
        )}
      </div>

      {/* Locked overlay for non-free */}
      {locked && (
        <div className="absolute inset-0 bg-background/10 group-hover:bg-background/0 transition-all pointer-events-none" />
      )}
    </motion.div>
  );
}