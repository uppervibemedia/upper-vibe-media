import React from "react";
import { Link2, Search, Wand2 } from "lucide-react";

export default function TikTokFeedSearch({ value, onChange }) {
  return (
    <section className="rounded-[1.35rem] border border-white/10 bg-white/[0.055] p-2 shadow-xl shadow-black/20 backdrop-blur-xl">
      <div className="flex min-h-[54px] items-center gap-3 rounded-[1.1rem] border border-cyan-300/15 bg-black/35 px-3">
        <Search className="h-5 w-5 shrink-0 text-cyan-200" />
        <input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="Search by song title, lyrics, artist, or TikTok sound..."
          className="h-12 min-w-0 flex-1 bg-transparent text-[15px] font-semibold text-white outline-none placeholder:text-white/38"
          type="search"
          autoComplete="off"
        />
      </div>
      <div className="hidden px-3 pb-1 pt-2 text-[11px] font-bold text-white/35" data-future-tiktok-matcher="ready">
        <span className="inline-flex items-center gap-1.5"><Link2 className="h-3.5 w-3.5" /> TikTok URL paste-ready</span>
        <span className="ml-3 inline-flex items-center gap-1.5"><Wand2 className="h-3.5 w-3.5" /> AI match-ready</span>
      </div>
    </section>
  );
}