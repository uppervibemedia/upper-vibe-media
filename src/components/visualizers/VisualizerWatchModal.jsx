import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Play, Music4, Download, Lock, ExternalLink, Tv2 } from "lucide-react";

function getEmbedUrl(url) {
  if (!url) return null;
  // YouTube
  const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/);
  if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}?autoplay=1`;
  // Vimeo
  const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
  if (vimeoMatch) return `https://player.vimeo.com/video/${vimeoMatch[1]}?autoplay=1`;
  // Already an embed or direct
  return url;
}

export default function VisualizerWatchModal({ visualizer, linkedTrack, allVisualizers, isPremium, onWatch, onListenToSong, onUpgrade, onClose }) {
  const embedUrl = visualizer.embed_url || getEmbedUrl(visualizer.video_url);
  const thumb = visualizer.thumbnail_url || linkedTrack?.cover_url;

  const related = allVisualizers
    .filter((v) => v.id !== visualizer.id && (v.category === visualizer.category || v.linked_song_id === visualizer.linked_song_id))
    .slice(0, 4);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 pt-8">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/85 backdrop-blur-sm" onClick={onClose} />

      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="relative w-full max-w-3xl rounded-3xl overflow-hidden z-10 mb-8"
        style={{ background: "#0a0a1e", border: "1px solid rgba(155,126,255,0.2)" }}>

        {/* Close */}
        <button onClick={onClose} className="absolute top-4 right-4 z-20 p-1.5 rounded-xl text-white/30 hover:text-white/70 transition-colors"
          style={{ background: "rgba(0,0,0,0.5)" }}>
          <X className="w-4 h-4" />
        </button>

        {/* Video player */}
        <div className="relative aspect-video bg-black">
          {embedUrl ? (
            <iframe src={embedUrl} className="w-full h-full" allow="autoplay; fullscreen" allowFullScreen title={visualizer.title} />
          ) : thumb ? (
            <div className="relative w-full h-full">
              <img src={thumb} alt={visualizer.title} className="w-full h-full object-cover opacity-40" />
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                <Tv2 className="w-12 h-12 text-white/20" />
                <p className="text-white/40 text-sm">No video URL set</p>
              </div>
            </div>
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center gap-3"
              style={{ background: "linear-gradient(135deg,rgba(155,126,255,0.1),rgba(0,229,255,0.05))" }}>
              <Tv2 className="w-12 h-12 text-white/15" />
              <p className="text-white/30 text-sm">No video URL set</p>
            </div>
          )}
        </div>

        {/* Details */}
        <div className="p-6">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div className="min-w-0">
              <h2 className="font-heading font-black text-xl text-white mb-1 truncate">{visualizer.title}</h2>
              <p className="text-sm text-white/40">{visualizer.artist || "Upper Vibe Media"}</p>
              {visualizer.linked_song_title && (
                <p className="text-xs text-purple-300/60 mt-1">🎵 {visualizer.linked_song_title}</p>
              )}
            </div>
            {visualizer.video_url && (
              <a href={visualizer.video_url} target="_blank" rel="noopener noreferrer"
                className="flex-shrink-0 p-2 rounded-xl text-white/30 hover:text-white/70 transition-colors"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
                <ExternalLink className="w-4 h-4" />
              </a>
            )}
          </div>

          {visualizer.description && (
            <p className="text-sm text-white/40 leading-relaxed mb-5">{visualizer.description}</p>
          )}

          {/* Action buttons */}
          <div className="flex flex-wrap gap-3">
            {linkedTrack && (
              <button onClick={() => onListenToSong(visualizer)}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all hover:brightness-110"
                style={{ background: "rgba(0,229,255,0.1)", border: "1px solid rgba(0,229,255,0.25)", color: "#00E5FF" }}>
                <Music4 className="w-4 h-4" /> Listen To Song
              </button>
            )}

            {linkedTrack && (
              isPremium ? (
                <a href={linkedTrack.audio_url} download={`${linkedTrack.title}.mp3`}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all hover:brightness-110"
                  style={{ background: "rgba(212,168,67,0.1)", border: "1px solid rgba(212,168,67,0.25)", color: "#D4A843" }}>
                  <Download className="w-4 h-4" /> Download Song
                </a>
              ) : (
                <button onClick={onUpgrade}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all hover:bg-white/10"
                  style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.3)" }}>
                  <Lock className="w-4 h-4" /> Download Song
                </button>
              )
            )}
          </div>
        </div>

        {/* Related */}
        {related.length > 0 && (
          <div className="border-t border-white/[0.06] px-6 py-5">
            <p className="text-[10px] font-black tracking-[0.25em] uppercase text-white/30 mb-4">Related Visualizers</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {related.map((v) => {
                const rThumb = v.thumbnail_url;
                return (
                  <button key={v.id} onClick={() => onWatch(v)}
                    className="group rounded-xl overflow-hidden text-left transition-all hover:opacity-80"
                    style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
                    <div className="aspect-video relative overflow-hidden">
                      {rThumb ? (
                        <img src={rThumb} alt={v.title} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center"
                          style={{ background: "rgba(155,126,255,0.08)" }}>
                          <Tv2 className="w-5 h-5 text-white/15" />
                        </div>
                      )}
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        style={{ background: "rgba(0,0,0,0.5)" }}>
                        <Play className="w-4 h-4 text-white" />
                      </div>
                    </div>
                    <div className="p-2">
                      <p className="text-xs font-semibold text-white truncate">{v.title}</p>
                      <p className="text-[10px] text-white/35 truncate">{v.artist}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}