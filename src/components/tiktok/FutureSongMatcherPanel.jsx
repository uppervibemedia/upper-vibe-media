import React from "react";
import { Upload, Wand2 } from "lucide-react";

export default function FutureSongMatcherPanel() {
  return (
    <section className="hidden" data-future-feature="cant-find-the-song" aria-hidden="true">
      <div className="rounded-[1.5rem] border border-purple-300/20 bg-purple-500/10 p-5 text-white">
        <div className="mb-2 flex items-center gap-2 text-purple-100">
          <Wand2 className="h-5 w-5" />
          <h2 className="font-heading text-xl font-black">Can&apos;t Find the Song?</h2>
        </div>
        <p className="text-sm font-semibold text-white/70">Paste a TikTok link or upload a video and we&apos;ll find the song automatically.</p>
        <button className="mt-4 inline-flex min-h-[44px] items-center gap-2 rounded-2xl border border-white/10 px-4 text-sm font-black text-white/50" disabled>
          <Upload className="h-4 w-4" /> Coming Soon
        </button>
      </div>
    </section>
  );
}