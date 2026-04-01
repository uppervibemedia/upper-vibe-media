import React from "react";
import { motion } from "framer-motion";
import { Lock, Sparkles, Headphones } from "lucide-react";
import GlowButton from "../shared/GlowButton";

export default function PremiumPromo() {
  return (
    <section className="relative overflow-hidden py-24">
      <div className="absolute inset-0">
        <img
          src="https://media.base44.com/images/public/69cd68afb7fe90ae92757154/70e23e35f_generated_b5746c08.png"
          alt="Premium vault"
          className="w-full h-full object-cover opacity-20"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-background via-background/90 to-background" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-6">
        <div className="max-w-xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-secondary/30 bg-secondary/5 mb-6">
              <Sparkles className="w-3.5 h-3.5 text-secondary" />
              <span className="text-xs font-semibold tracking-wider uppercase text-secondary">Premium Access</span>
            </div>

            <h2 className="font-heading font-extrabold text-3xl md:text-5xl tracking-tight mb-4">
              <span className="text-foreground">Tap Into</span>
              <br />
              <span className="text-secondary text-glow-gold">Premium Sound</span>
            </h2>

            <p className="text-muted-foreground leading-relaxed mb-8 max-w-md mx-auto">
              Unlock the full Upper Vibe experience. Exclusive drops, remastered classics,
              432Hz collections, and the VIP frequency vault.
            </p>

            <div className="flex flex-wrap gap-4 justify-center">
              <GlowButton to="/pricing" variant="secondary" size="lg">
                <Lock className="w-4 h-4 mr-2" />
                Join Premium
              </GlowButton>
              <GlowButton to="/vault" variant="outline" size="lg">
                <Headphones className="w-4 h-4 mr-2" />
                Preview Vault
              </GlowButton>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}