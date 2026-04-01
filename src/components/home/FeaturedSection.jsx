import React from "react";
import { motion } from "framer-motion";
import SectionHeader from "../shared/SectionHeader";
import TrackCard from "../shared/TrackCard";

const FEATURED_TRACKS = [
  {
    id: "f1",
    title: "Elevated State",
    artist: "Upper Vibe",
    duration: "4:12",
    cover_url: "https://media.base44.com/images/public/69cd68afb7fe90ae92757154/8c8572f77_generated_eba73262.png",
    min_tier: "free",
    is_featured: true,
  },
  {
    id: "f2",
    title: "Neural Bloom 432Hz",
    artist: "Upper Vibe",
    duration: "5:33",
    cover_url: "https://media.base44.com/images/public/69cd68afb7fe90ae92757154/11801d304_generated_aecb4feb.png",
    min_tier: "premium",
    is_featured: true,
  },
  {
    id: "f3",
    title: "Crown Frequency",
    artist: "Upper Vibe",
    duration: "3:47",
    cover_url: "https://media.base44.com/images/public/69cd68afb7fe90ae92757154/213cbf8ff_generated_d250d71f.png",
    min_tier: "free",
    is_featured: true,
  },
  {
    id: "f4",
    title: "Intention Protocol",
    artist: "Upper Vibe",
    duration: "6:01",
    cover_url: "https://media.base44.com/images/public/69cd68afb7fe90ae92757154/04c14ab4a_generated_3bb88730.png",
    min_tier: "vip",
    is_featured: true,
  },
];

export default function FeaturedSection() {
  return (
    <section className="max-w-7xl mx-auto px-6 py-20">
      <SectionHeader
        title="Featured Releases"
        subtitle="Now Playing"
        glowColor="blue"
      />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
        {FEATURED_TRACKS.map((track, i) => (
          <motion.div
            key={track.id}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.1 }}
          >
            <TrackCard track={track} locked={track.min_tier === "vip" || track.min_tier === "premium"} />
          </motion.div>
        ))}
      </div>
    </section>
  );
}