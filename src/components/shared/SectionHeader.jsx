import React from "react";
import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

export default function SectionHeader({ label, title, link, linkLabel, labelColor, labelIcon, themeColor }) {
  // themeColor is an RGB string like "0,160,220" — fall back to labelColor-derived or white
  const rgb = themeColor || null;

  return (
    <div className="flex items-center justify-between mb-6">
      <div>
        <p className="text-[10px] font-black tracking-[0.3em] uppercase mb-1 flex items-center gap-1" style={{ color: labelColor }}>
          {labelIcon} {label}
        </p>
        <h2 className="font-heading font-black text-2xl text-white">{title}</h2>
      </div>
      {link && (
        <Link
          to={link}
          className="flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-black tracking-wider transition-all active:scale-95"
          style={rgb ? {
            background: `rgba(${rgb},0.08)`,
            border: `1px solid rgba(${rgb},0.3)`,
            color: `rgb(${rgb})`,
            boxShadow: `0 0 12px rgba(${rgb},0.1)`,
          } : {
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.08)",
            color: "rgba(255,255,255,0.4)",
          }}
          onMouseEnter={e => { if (rgb) { e.currentTarget.style.background = `rgba(${rgb},0.16)`; e.currentTarget.style.boxShadow = `0 0 20px rgba(${rgb},0.25)`; } }}
          onMouseLeave={e => { if (rgb) { e.currentTarget.style.background = `rgba(${rgb},0.08)`; e.currentTarget.style.boxShadow = `0 0 12px rgba(${rgb},0.1)`; } }}
        >
          {linkLabel} <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      )}
    </div>
  );
}