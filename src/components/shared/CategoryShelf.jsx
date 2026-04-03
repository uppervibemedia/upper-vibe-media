import React, { useRef } from "react";
import { motion } from "framer-motion";
import { ChevronRight, ChevronLeft } from "lucide-react";
import TrackCard from "./TrackCard";

export default function CategoryShelf({ title, subtitle, tracks, glowColor = "blue", onTrackClick }) {
  const scrollRef = useRef(null);

  const scroll = (dir) => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: dir * 220, behavior: "smooth" });
    }
  };

  if (!tracks?.length) return null;

  return (
    <section className="mb-12">
      <div className="flex items-center justify-between mb-4 px-6">
        <div>
          {subtitle && (
            <p className={`text-xs font-semibold tracking-[0.2em] uppercase mb-1 ${glowColor === "gold" ? "text-secondary text-glow-gold" : "text-primary text-glow-blue"}`}>
              {subtitle}
            </p>
          )}
          <h2 className="font-heading font-extrabold text-xl md:text-2xl">{title}</h2>
        </div>
        <div className="flex gap-1">
          <button
            onClick={() => scroll(-1)}
            className="w-8 h-8 rounded-full bg-card/60 border border-border/30 flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-border/60 transition-all"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => scroll(1)}
            className="w-8 h-8 rounded-full bg-card/60 border border-border/30 flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-border/60 transition-all"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
      <div
        ref={scrollRef}
        className="flex gap-4 overflow-x-auto pb-3 px-6 scrollbar-hide"
        style={{ scrollSnapType: "x mandatory" }}
      >
        {tracks.map((track, i) => (
          <motion.div
            key={track.id}
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.04 }}
            className="flex-shrink-0 w-40 md:w-48"
            style={{ scrollSnapAlign: "start" }}
          >
            <TrackCard track={track} onLockedClick={onTrackClick} />
          </motion.div>
        ))}
      </div>
    </section>
  );
}