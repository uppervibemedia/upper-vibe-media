import React from "react";
import { motion } from "framer-motion";
import { Lock, PlayCircle, BookOpen, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

const TIER_BADGE = {
  free: { label: "Free", color: "bg-muted/60 text-muted-foreground border-border/40" },
  supporter: { label: "Supporter", color: "bg-purple-500/10 text-purple-400 border-purple-500/20" },
  premium: { label: "Premium", color: "bg-primary/10 text-primary border-primary/20" },
};

const TIER_BORDER = {
  free: "border-border/30 hover:border-border/60",
  supporter: "border-purple-500/20 hover:border-purple-500/40",
  premium: "border-primary/20 hover:border-primary/40",
};

export default function SeriesCard({ series }) {
  const badge = TIER_BADGE[series.tier] || TIER_BADGE.free;
  const borderClass = TIER_BORDER[series.tier] || TIER_BORDER.free;
  const locked = series.tier !== "free";

  return (
    <motion.div
      whileHover={{ y: -5 }}
      transition={{ type: "spring", damping: 20 }}
      className={`group relative rounded-xl overflow-hidden bg-card/50 border ${borderClass} cursor-pointer transition-all`}
    >
      {/* Thumbnail */}
      <div className="relative aspect-video overflow-hidden">
        <img
          src={series.thumbnail}
          alt={series.name}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105 brightness-75"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />

        {/* Locked overlay */}
        {locked && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-10 h-10 rounded-full bg-background/60 backdrop-blur-md flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <Lock className="w-4 h-4 text-muted-foreground" />
            </div>
          </div>
        )}

        {/* Tier badge */}
        <div className={`absolute top-3 left-3 px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-widest uppercase border ${badge.color} backdrop-blur-md`}>
          {badge.label}
        </div>

        {/* Lessons count */}
        <div className="absolute bottom-3 right-3 flex items-center gap-1 px-2.5 py-1 rounded-md bg-background/80 backdrop-blur-sm">
          <BookOpen className="w-3 h-3 text-muted-foreground" />
          <span className="text-[10px] font-semibold text-muted-foreground">{series.lessons} Lessons</span>
        </div>
      </div>

      {/* Info */}
      <div className="p-4">
        <h3 className="font-heading font-bold text-sm text-foreground mb-1.5 group-hover:text-primary transition-colors">{series.name}</h3>
        <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2 mb-3">{series.description}</p>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            {locked
              ? <Lock className="w-3.5 h-3.5 text-muted-foreground/60" />
              : <PlayCircle className="w-3.5 h-3.5 text-primary" />
            }
            <span className="text-[10px] text-muted-foreground tracking-wider uppercase font-semibold ml-1">
              {locked ? "Upgrade to Access" : "Start Series"}
            </span>
          </div>
          <ArrowRight className="w-3.5 h-3.5 text-muted-foreground/40 group-hover:text-primary group-hover:translate-x-1 transition-all" />
        </div>
      </div>
    </motion.div>
  );
}