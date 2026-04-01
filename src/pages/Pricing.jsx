import React from "react";
import { motion } from "framer-motion";
import { Zap } from "lucide-react";
import SectionHeader from "../components/shared/SectionHeader";
import TierCard from "../components/pricing/TierCard";
import Footer from "../components/shared/Footer";

const tiers = [
  {
    tier: "supporter",
    name: "Supporter",
    price: "4.99",
    features: [
      "Access to selected exclusive songs",
      "Early previews of new releases",
      "Supporter badge on your profile",
      "Members-only updates & newsletter",
      "Support the Upper Vibe movement",
    ],
  },
  {
    tier: "premium",
    name: "Premium",
    price: "9.99",
    popular: true,
    features: [
      "Full streaming access to premium catalog",
      "Remastered tracks & alternate versions",
      "Unreleased music collection",
      "432Hz & frequency-tuned audio",
      "Curated playlists by mood & intention",
      "Access to the Exclusive Listening Vault",
    ],
  },
  {
    tier: "vip",
    name: "VIP Frequency",
    price: "19.99",
    features: [
      "Everything in Premium included",
      "Early access to all new drops",
      "Downloadable exclusive tracks",
      "Behind-the-scenes content",
      "Members-only livestreams",
      "Merch discounts & perks",
      "Inner Circle community access",
    ],
  },
];

export default function Pricing() {
  return (
    <div>
      <div className="max-w-7xl mx-auto px-6 py-16 md:py-24">
        <div className="text-center mb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-secondary/30 bg-secondary/5 mb-6">
              <Zap className="w-3.5 h-3.5 text-secondary" />
              <span className="text-xs font-semibold tracking-wider uppercase text-secondary">Choose Your Frequency</span>
            </div>
            <h1 className="font-heading font-extrabold text-4xl md:text-6xl tracking-tight mb-4">
              <span className="text-foreground">Unlock the</span>
              <br />
              <span className="text-primary text-glow-blue">Full Experience</span>
            </h1>
            <p className="text-muted-foreground max-w-md mx-auto leading-relaxed">
              Three tiers of elevation. Choose the frequency that resonates with you.
            </p>
          </motion.div>
        </div>

        <div className="grid md:grid-cols-3 gap-6 md:gap-8 max-w-5xl mx-auto">
          {tiers.map((t, i) => (
            <TierCard key={t.tier} {...t} delay={i * 0.15} />
          ))}
        </div>

        {/* FAQ-like trust section */}
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