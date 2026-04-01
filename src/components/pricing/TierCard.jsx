import React from "react";
import { motion } from "framer-motion";
import { Check } from "lucide-react";
import GlowButton from "../shared/GlowButton";

const tierStyles = {
  free: {
    border: "border-border/30 hover:border-border/60",
    glow: "",
    badge: "bg-muted/40 text-muted-foreground border-border/30",
    button: "ghost",
    accent: "text-muted-foreground",
  },
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
};

export default function TierCard({ tier, name, price, tagline, features, popular = false, delay = 0 }) {
  const style = tierStyles[tier] || tierStyles.free;
  const isFree = tier === "free";

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

      <div className={`inline-flex px-3 py-1 rounded-full border text-[10px] font-bold tracking-widest uppercase mb-4 ${style.badge}`}>
        {name}
      </div>

      {tagline && (
        <p className={`text-xs font-semibold tracking-wider uppercase mb-4 ${style.accent}`}>{tagline}</p>
      )}

      <div className="mb-6">
        {isFree ? (
          <span className="font-heading font-extrabold text-4xl md:text-5xl text-foreground">Free</span>
        ) : (
          <>
            <span className="font-heading font-extrabold text-4xl md:text-5xl text-foreground">${price}</span>
            <span className="text-sm text-muted-foreground ml-1">/month</span>
          </>
        )}
      </div>

      <ul className="space-y-3 mb-8">
        {features.map((feature) => (
          <li key={feature} className="flex items-start gap-2.5">
            <Check className={`w-4 h-4 mt-0.5 flex-shrink-0 ${style.accent}`} />
            <span className="text-sm text-foreground/80">{feature}</span>
          </li>
        ))}
      </ul>

      <GlowButton variant={isFree ? "ghost" : style.button} className="w-full" to={isFree ? "/discover" : "/pricing"}>
        {isFree ? "Start Listening" : "Get Started"}
      </GlowButton>
    </motion.div>
  );
}