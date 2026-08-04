import React from "react";

export const TIKTOK_CATEGORIES = [
  { key: "trending", label: "Trending on TikTok" },
  { key: "newest", label: "Newest Sounds" },
  { key: "saved", label: "Most Saved" },
  { key: "rising", label: "Rising Fast" },
  { key: "motivation", label: "Motivation" },
  { key: "mindset", label: "Mindset" },
  { key: "relationships", label: "Relationships" },
  { key: "432hz", label: "432 Hz" },
];

export default function TikTokCategoryTabs({ active, onChange }) {
  return (
    <nav className="-mx-4 overflow-x-auto px-4 pb-1 hide-scrollbar" aria-label="TikTok feed categories">
      <div className="flex w-max gap-2">
        {TIKTOK_CATEGORIES.map((tab) => {
          const selected = active === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => onChange(tab.key)}
              className={`min-h-[42px] shrink-0 rounded-full border px-4 text-xs font-black transition-all duration-200 active:scale-[0.97] ${selected ? "border-cyan-200/60 bg-cyan-300/18 text-cyan-50 shadow-lg shadow-cyan-500/15" : "border-white/10 bg-white/[0.045] text-white/58 hover:border-white/18 hover:bg-white/[0.07]"}`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
    </nav>
  );
}