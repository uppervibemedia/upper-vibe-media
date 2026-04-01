import React from "react";

export default function SectionHeader({ title, subtitle, align = "left", glowColor = "blue" }) {
  const glowClass = glowColor === "gold" ? "text-glow-gold text-secondary" : "text-glow-blue text-primary";

  return (
    <div className={`mb-8 ${align === "center" ? "text-center" : ""}`}>
      <p className={`text-xs font-semibold tracking-[0.2em] uppercase mb-2 ${glowClass}`}>
        {subtitle}
      </p>
      <h2 className="font-heading font-extrabold text-2xl md:text-4xl text-foreground tracking-tight">
        {title}
      </h2>
    </div>
  );
}