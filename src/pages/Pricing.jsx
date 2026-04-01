import React from "react";
import { motion } from "framer-motion";
import { Zap } from "lucide-react";
import SectionHeader from "../components/shared/SectionHeader";
import TierCard from "../components/pricing/TierCard";
import Footer from "../components/shared/Footer";

const tiers = [
  {
    tier: "free",
    name: "Free",
    price: "0",
    tagline: "Discover the Sound",
    features: [
      "Browse all music categories",
      "View cover art & track info",
      "30-second previews of selected songs",
      "Access to free full tracks",
      "See what's waiting for you in the Vault",
    ],
  },
  {
    tier: "supporter",
    name: "Supporter",
    price: "4.99",
    tagline: "Unlock the Frequency",
    features: [
      "Full 432 Hz catalog — tuned for elevation",
      "Selected remastered classics",
      "Early previews of upcoming releases",
      "Members-only updates & newsletter",
      "Supporter badge on your profile",
      "Access to curated premium playlists",
    ],
  },
  {
    tier: "premium",
    name: "Premium",
    price: "9.99",
    tagline: "Enter the Full Upper Vibe Vault",
    popular: true,
    features: [
      "Everything in Supporter, plus:",
      "Full Upper Vibe Vault access",
      "Unreleased & exclusive drop tracks",
      "Complete remastered catalog",
      "Premium-only mixes & music bundles",
      "Full premium playlists & collections",
      "Early access to every new release",
    ],
  },
];

export default function Pricing() {
  return (
    <div>
      <div className="max-w-7xl mx-auto px-6 py-16 md:py-24">
        <div className="text-center mb-16">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-secondary/30 bg-secondary/5 mb-6">
              <Zap className="w-3.5 h-3.5 text-secondary" />
              <span className="text-xs font-semibold tracking-wider uppercase text-secondary">Choose Your Frequency</span>
            </div>
            <h1 className="font-heading font-extrabold text-4xl md:text-6xl tracking-tight mb-4">
              <span className="text-foreground">Your Path Into the</span>
              <br />
              <span className="text-primary text-glow-blue">Upper Vibe Experience</span>
            </h1>
            <p className="text-muted-foreground max-w-lg mx-auto leading-relaxed">
              Start free. Unlock the frequency. Enter the Vault. Three steps into a listening experience unlike anything else.
            </p>
          </motion.div>
        </div>

        {/* Conversion path indicator */}
        <div className="flex items-center justify-center gap-3 mb-12">
          {["Free", "Supporter", "Premium"].map((label, i) => (
            <React.Fragment key={label}>
              <span className="text-xs font-semibold tracking-widest uppercase text-muted-foreground">{label}</span>
              {i < 2 && <span className="text-primary/50 text-sm">→</span>}
            </React.Fragment>
          ))}
        </div>

        <div className="grid md:grid-cols-3 gap-6 md:gap-8 max-w-5xl mx-auto">
          {tiers.map((t, i) => (
            <TierCard key={t.tier} {...t} delay={i * 0.12} />
          ))}
        </div>

        <div className="mt-20 text-center">
          <p className="text-xs tracking-[0.2em] uppercase text-muted-foreground mb-4">
            Cancel anytime · No contracts · Instant access
          </p>
          <p className="text-sm text-muted-foreground/60">
            All subscriptions are processed securely. Your frequency, your choice.
          </p>
        </div>
      </div>

      <Footer />
    </div>
  );
}