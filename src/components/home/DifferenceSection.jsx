import React from "react";
import { motion } from "framer-motion";
import { Check, X, Zap, Waves, Gem, Shield } from "lucide-react";
import SectionHeader from "../shared/SectionHeader";

const traditional = [
  "Algorithm-driven playlists",
  "Compressed audio quality",
  "Ads & interruptions",
  "No exclusive content",
  "Generic experience",
];

const upperVibe = [
  { text: "Curated high-frequency music", icon: Waves },
  { text: "432Hz & lossless audio", icon: Zap },
  { text: "Ad-free premium experience", icon: Shield },
  { text: "Exclusive unreleased drops", icon: Gem },
  { text: "Intentional sound design", icon: Waves },
];

export default function DifferenceSection() {
  return (
    <section className="max-w-7xl mx-auto px-6 py-20">
      <SectionHeader
        title="The Upper Vibe Difference"
        subtitle="Why We're Different"
        align="center"
        glowColor="gold"
      />

      <div className="grid md:grid-cols-2 gap-6 mt-12">
        {/* Traditional */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          className="rounded-xl p-6 md:p-8 bg-muted/20 border border-border/20 opacity-60"
        >
          <h3 className="font-heading font-bold text-lg text-muted-foreground mb-6">Traditional Streaming</h3>
          <ul className="space-y-4">
            {traditional.map((item) => (
              <li key={item} className="flex items-center gap-3 text-muted-foreground">
                <X className="w-4 h-4 text-destructive/60 flex-shrink-0" />
                <span className="text-sm">{item}</span>
              </li>
            ))}
          </ul>
        </motion.div>

        {/* Upper Vibe */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          className="rounded-xl p-6 md:p-8 bg-card/60 border border-primary/20 glow-blue"
        >
          <h3 className="font-heading font-bold text-lg text-primary mb-6 text-glow-blue">Upper Vibe Music</h3>
          <ul className="space-y-4">
            {upperVibe.map((item) => (
              <li key={item.text} className="flex items-center gap-3 text-foreground">
                <item.icon className="w-4 h-4 text-primary flex-shrink-0" />
                <span className="text-sm">{item.text}</span>
              </li>
            ))}
          </ul>
        </motion.div>
      </div>
    </section>
  );
}