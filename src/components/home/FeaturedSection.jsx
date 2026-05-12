import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Music4, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import TrackCard from "../shared/TrackCard";
import { base44 } from "@/api/base44Client";

export default function FeaturedSection() {
  const [tracks, setTracks] = useState([]);

  useEffect(() => {
    base44.entities.Track.filter({ status: "published", is_featured: true }, "-created_date", 8)
      .then(setTracks);
  }, []);

  if (tracks.length === 0) return null;

  return (
    <section className="max-w-7xl mx-auto px-6 py-16">
      <div className="flex items-end justify-between mb-8">
        <div>
          <p className="text-xs font-bold tracking-[0.2em] uppercase mb-2"
            style={{ color: "#00E5FF" }}>Featured</p>
          <h2 className="font-heading font-black text-3xl md:text-4xl text-white">Music Vault</h2>
        </div>
        <Link to="/discover"
          className="flex items-center gap-1.5 text-xs font-semibold tracking-wider uppercase text-white/30 hover:text-white/70 transition-colors">
          View All <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 md:gap-5">
        {tracks.map((track, i) => (
          <motion.div key={track.id}
            initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }} transition={{ delay: i * 0.07 }}>
            <TrackCard track={track} />
          </motion.div>
        ))}
      </div>
    </section>
  );
}