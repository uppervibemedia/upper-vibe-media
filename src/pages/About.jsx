import React from "react";
import { motion } from "framer-motion";
import { Waves, Zap, Gem, Shield, Headphones, Sparkles } from "lucide-react";
import SectionHeader from "../components/shared/SectionHeader";
import GlowButton from "../components/shared/GlowButton";
import Footer from "../components/shared/Footer";

const values = [
  { icon: Waves, title: "Frequency First", description: "Every track is tuned and curated for elevated consciousness and intentional listening." },
  { icon: Zap, title: "Innovation", description: "Blending cutting-edge audio technology with sacred sound principles for a new era of music." },
  { icon: Gem, title: "Exclusivity", description: "Premium content that can't be found anywhere else. Remastered, unreleased, and frequency-tuned." },
  { icon: Shield, title: "Integrity", description: "We believe music carries intention. Every release is crafted with purpose and elevated creativity." },
];

export default function About() {
  return (
    <div>
      {/* Hero */}
      <div className="max-w-7xl mx-auto px-6 py-16 md:py-24">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <motion.div initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }}>
            <p className="text-xs tracking-[0.3em] uppercase text-secondary mb-4 text-glow-gold">Our Story</p>
            <h1 className="font-heading font-extrabold text-4xl md:text-6xl tracking-tight mb-6 leading-tight">
              More Than Music —
              <br />
              <span className="text-primary text-glow-blue">A Frequency</span>
            </h1>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Upper Vibe Music was born from a singular vision: to create a platform where music
              isn't just entertainment — it's elevation. We believe sound carries frequency,
              and frequency shapes consciousness.
            </p>
            <p className="text-muted-foreground leading-relaxed mb-8">
              Founded under Upper Vibe Media, we blend cutting-edge audio technology with intentional
              sound design, creating a catalog that transcends traditional streaming. From 432Hz
              remastered classics to exclusive unreleased drops, every track is designed to raise
              your vibration.
            </p>
            <GlowButton to="/discover" variant="outline">
              <Headphones className="w-4 h-4 mr-2" />
              Start Listening
            </GlowButton>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="relative"
          >
            <div className="aspect-[3/4] rounded-2xl overflow-hidden glow-blue">
              <img
                src="https://media.base44.com/images/public/69cd68afb7fe90ae92757154/ebf0a13c4_generated_ca1c1780.png"
                alt="Upper Vibe Music concept"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="absolute -bottom-4 -left-4 px-4 py-2 rounded-lg glass">
              <p className="text-[10px] tracking-[0.2em] uppercase text-primary font-semibold">Est. 2024</p>
              <p className="text-xs text-muted-foreground">Upper Vibe Media</p>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Values */}
      <section className="max-w-7xl mx-auto px-6 py-16">
        <SectionHeader title="What Drives Us" subtitle="Our Principles" align="center" glowColor="gold" />
        <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-6 mt-8">
          {values.map((v, i) => (
            <motion.div
              key={v.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="rounded-xl p-6 bg-card/40 border border-border/20 hover:border-primary/20 transition-all text-center"
            >
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <v.icon className="w-5 h-5 text-primary" />
              </div>
              <h3 className="font-heading font-bold text-sm mb-2">{v.title}</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">{v.description}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Vision CTA */}
      <section className="max-w-3xl mx-auto px-6 py-20 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <Sparkles className="w-8 h-8 text-secondary mx-auto mb-4" />
          <h2 className="font-heading font-extrabold text-2xl md:text-4xl mb-4">
            Join the High-Vibration
            <br />
            <span className="text-secondary text-glow-gold">Listening Experience</span>
          </h2>
          <p className="text-muted-foreground mb-8 max-w-md mx-auto">
            We're building more than a platform. We're building a movement. A new era
            of conscious, frequency-based music for the elevated listener.
          </p>
          <GlowButton to="/pricing" variant="secondary" size="lg">
            Join the Movement
          </GlowButton>
        </motion.div>
      </section>

      <Footer />
    </div>
  );
}