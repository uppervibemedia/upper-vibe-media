import React from "react";
import { motion } from "framer-motion";
import { Check } from "lucide-react";
import GlowButton from "../shared/GlowButton";

const tierStyles = {
  supporter: {
    border: "border-purple-500/30 hover:border-purple-500/60",
    glow: "glow-purple",
    badge: "bg-purple-500/10 text-purple-400 border-purple-500/20",
    button: "outline",
    accent: "text-purple-400",
  },
  premium: {
    border: "border-primary/30 hover:border-primary/60",
    glow: "glow-blue",
    badge: "bg-primary/10 text-primary border-primary/20",
    button: "primary",
    accent: "text-primary",
  },
  vip: {
    border: "border-secondary/30 hover:border-secondary/60",
    glow: "glow-gold",
    badge: "bg-secondary/10 text-secondary border-secondary/20",
    button: "secondary",
    accent: "text-secondary",
  },
};

export default function TierCard({ tier, name, price, features, popular = false, delay = 0 }) {
  const style = tierStyles[tier];

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay }}
      whileHover={{ y: -8 }}
      className={`relative rounded-2xl p-6 md:p-8 bg-card/40 backdrop-blur-md border ${style.border} ${style.glow} transition-all`}
    >
      {popular && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-primary text-primary-foreground text-[10px] font-bold tracking-widest uppercase">
          Most Popular
        </div>
      )}

      <div className={`inline-flex px-3 py-1 rounded-full border text-[10px] font-bold tracking-widest uppercase mb-6 ${style.badge}`}>
        {name}
      </div>

      <div className="mb-6">
        <span className="font-heading font-extrabold text-4xl md:text-5xl text-foreground">${price}</span>
        <span className="text-sm text-muted-foreground ml-1">/month</span>
      </div>

      <ul className="space-y-3 mb-8">
        {features.map((feature) => (
          <li key={feature} className="flex items-start gap-2.5">
            <Check className={`w-4 h-4 mt-0.5 flex-shrink-0 ${style.accent}`} />
            <span className="text-sm text-foreground/80">{feature}</span>
          </li>
        ))}
      </ul>

      <GlowButton variant={style.button} className="w-full" to="/pricing">
        Commence Subscription
      </GlowButton>
    </motion.div>
  );
}