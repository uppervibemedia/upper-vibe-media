import React from "react";
import { motion } from "framer-motion";
import { Star } from "lucide-react";
import SectionHeader from "../shared/SectionHeader";

const testimonials = [
  {
    name: "Alex R.",
    tier: "VIP Frequency",
    text: "Upper Vibe completely changed how I experience music. The 432Hz collection alone is worth the subscription.",
    stars: 5,
  },
  {
    name: "Maya K.",
    tier: "Premium",
    text: "The exclusive drops are incredible. It feels like being part of an inner circle of conscious listeners.",
    stars: 5,
  },
  {
    name: "Jordan T.",
    tier: "Supporter",
    text: "I've never heard music curated with this level of intention. Every track feels like it was made for a higher state of mind.",
    stars: 5,
  },
];

export default function TestimonialsSection() {
  return (
    <section className="max-w-7xl mx-auto px-6 py-20">
      <SectionHeader
        title="The Community Speaks"
        subtitle="Social Proof"
        align="center"
      />

      <div className="grid md:grid-cols-3 gap-6 mt-8">
        {testimonials.map((t, i) => (
          <motion.div
            key={t.name}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.1 }}
            className="rounded-xl p-6 bg-card/40 border border-border/20 hover:border-primary/20 transition-all"
          >
            <div className="flex gap-0.5 mb-4">
              {Array.from({ length: t.stars }).map((_, j) => (
                <Star key={j} className="w-3.5 h-3.5 fill-secondary text-secondary" />
              ))}
            </div>
            <p className="text-sm text-foreground/80 leading-relaxed mb-4">"{t.text}"</p>
            <div>
              <p className="text-sm font-medium text-foreground">{t.name}</p>
              <p className="text-xs text-primary">{t.tier} Member</p>
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}