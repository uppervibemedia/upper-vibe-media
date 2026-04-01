import React from "react";
import { motion } from "framer-motion";
import GlowButton from "../shared/GlowButton";

export default function HeroSection() {
  return (
    <section className="relative min-h-screen flex items-center overflow-hidden">
      {/* Background image */}
      <div className="absolute inset-0">
        <img
          src="https://media.base44.com/images/public/69cd68afb7fe90ae92757154/379cb9227_generated_3a016793.png"
          alt="Abstract gold sound wave"
          className="w-full h-full object-cover opacity-40"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-background via-background/80 to-background/40" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-background/60" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-6 py-20 md:py-0">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="max-w-2xl"
        >
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="text-xs font-semibold tracking-[0.3em] uppercase text-secondary mb-4 text-glow-gold"
          >
            Upper Vibe Music
          </motion.p>

          <h1 className="font-heading font-extrabold text-5xl md:text-7xl lg:text-8xl tracking-tight leading-[0.9] mb-6">
            <span className="text-foreground">STREAM</span>
            <br />
            <span className="text-foreground">THE</span>
            <br />
            <span className="text-primary text-glow-blue">FREQUENCY</span>
          </h1>

          <p className="text-base md:text-lg text-muted-foreground leading-relaxed max-w-lg mb-8">
            A cognitive-enhancing audio experience. Access the vault of exclusive,
            high-vibration remastered tracks and unreleased soundscapes.
          </p>

          <div className="flex flex-wrap gap-4">
            <GlowButton to="/vault" variant="secondary" size="lg">
              Enter the Vault
            </GlowButton>
            <GlowButton to="/discover" variant="outline" size="lg">
              Free Preview
            </GlowButton>
          </div>
        </motion.div>
      </div>

      {/* Decorative bottom gradient */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent" />
    </section>
  );
}