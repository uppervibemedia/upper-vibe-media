import React from "react";
import { Flame, Clock3, Eye, CalendarDays } from "lucide-react";

const filters = [
  { id: "newest", label: "Newest", icon: Clock3 },
  { id: "views", label: "Most Viewed", icon: Eye },
  { id: "trending", label: "Trending", icon: Flame },
  { id: "week", label: "This Week", icon: CalendarDays },
];

export default function TikTokFeedFilterTabs({ active, onChange }) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1 hide-scrollbar" role="tablist" aria-label="TikTok feed filters">
      {filters.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          onClick={() => onChange(id)}
          className={`flex min-h-[42px] shrink-0 items-center gap-2 rounded-2xl border px-4 text-xs font-black uppercase tracking-[0.12em] transition-all ${
            active === id
              ? "border-cyan-300 bg-cyan-300 text-black shadow-[0_0_18px_rgba(34,211,238,0.24)]"
              : "border-white/10 bg-white/[0.045] text-white/62 hover:bg-white/[0.075]"
          }`}
        >
          <Icon className="h-4 w-4" /> {label}
        </button>
      ))}
    </div>
  );
}