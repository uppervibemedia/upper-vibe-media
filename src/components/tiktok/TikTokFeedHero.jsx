import React from "react";
import { Music4, Sparkles } from "lucide-react";

export default function TikTokFeedHero() {
  return (
    <section className="rounded-[1.5rem] border border-cyan-300/15 bg-gradient-to-br from-cyan-400/12 via-purple-500/10 to-black px-4 py-4 shadow-2xl shadow-cyan-950/20 sm:px-5 sm:py-5">
      <div className="mb-3 flex items-center gap-2.5">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-cyan-400 text-black shadow-lg shadow-cyan-400/20">
          <Music4 className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-cyan-200">Upper Vibe TikTok Feed</p>
          <p className="truncate text-xs text-white/45">Fast song matching for TikTok listeners.</p>
        </div>
        <Sparkles className="ml-auto h-4 w-4 text-yellow-200/70" />
      </div>
      <h1 className="font-heading text-[1.8rem] font-black leading-[1.02] text-white sm:text-4xl">🎵 Find the Song You Just Heard</h1>
      <p className="mt-2 text-sm font-semibold leading-snug text-white/68">Tap any song to start listening instantly.</p>
    </section>
  );
}