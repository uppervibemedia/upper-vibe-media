import React, { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Calendar, ExternalLink, Flame, Heart, MessageCircle, Play, Pause, Share2, Image as ImageIcon, Quote } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { usePlayer } from "@/context/PlayerContext";
import CoverImage from "@/components/shared/CoverImage";
import TikTokInlinePlayer from "@/components/tiktok/TikTokInlinePlayer";

const compact = (value) => {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return null;
  if (n >= 1000000) return `${(n / 1000000).toFixed(n >= 10000000 ? 0 : 1)}M`;
  if (n >= 1000) return `${Math.round(n / 1000)}K`;
  return String(n);
};

const postIcon = { video: Play, image: ImageIcon, quote: Quote, meme: MessageCircle };
const postLabel = { video: "Video", image: "Image", quote: "Quote", meme: "Meme" };

export default function TikTokPostCard({ track, index }) {
  const { playTrack, togglePlay, currentTrack, isPlaying } = usePlayer();
  const navigate = useNavigate();
  const [tiktokOpen, setTikTokOpen] = useState(false);
  const pausedForTikTokRef = useRef(false);
  const wasPlayingBeforeTikTokRef = useRef(false);
  const isCurrentTrack = currentTrack?.id === track.id;
  const active = isCurrentTrack && isPlaying;
  const type = track.tiktok_post_type || "video";
  const TypeIcon = postIcon[type] || Play;
  const thumbnail = track.tiktok_thumbnail_url || track.thumbnail_url || track.cover_url;
  const albumCover = track.cover_url;
  const caption = track.tiktok_caption || track.description || "The Upper Vibe sound from TikTok — tap Play Song to hear the full track.";
  const stats = [
    { icon: Play, value: compact(track.tiktok_view_count || track.tiktok_plays || track.tiktok_views) },
    { icon: Heart, value: compact(track.tiktok_like_count || track.tiktok_likes) },
    { icon: MessageCircle, value: compact(track.tiktok_comment_count || track.tiktok_comments) },
    { icon: Share2, value: compact(track.tiktok_share_count || track.tiktok_shares) },
  ].filter((item) => item.value);

  const dateText = track.tiktok_posted_at
    ? new Date(track.tiktok_posted_at).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })
    : null;

  const trackAnalytics = (eventName) => base44.analytics.track({
    eventName,
    properties: { source: "tiktok_post_feed", track_id: track.id, title: track.title || "" },
  });

  const handlePlay = () => {
    trackAnalytics(active ? "tiktok_post_pause_song" : "tiktok_post_play_song");
    if (tiktokOpen) handleCloseTikTokPreview(false);
    if (isCurrentTrack) togglePlay();
    else playTrack(track, "tiktok_feed");
  };

  const handleOpen = () => {
    trackAnalytics("tiktok_post_open_song");
    navigate(`/song/${track.id}`);
  };

  const handleOpenTikTokPreview = () => {
    trackAnalytics("tiktok_post_open_preview");
    wasPlayingBeforeTikTokRef.current = isPlaying;
    pausedForTikTokRef.current = false;
    setTikTokOpen(true);
  };

  const handleTikTokAudioIntent = () => {
    if (!isPlaying || pausedForTikTokRef.current) return;
    wasPlayingBeforeTikTokRef.current = true;
    pausedForTikTokRef.current = true;
    togglePlay();
  };

  const handleCloseTikTokPreview = (resumeAudio = true) => {
    setTikTokOpen(false);
    if (resumeAudio && pausedForTikTokRef.current && wasPlayingBeforeTikTokRef.current) {
      setTimeout(() => togglePlay(), 120);
    }
  };

  return (
    <motion.article
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.025, 0.18) }}
      whileHover={{ y: -4, scale: 1.01 }}
      className="group/card h-full rounded-[24px] bg-gradient-to-br from-cyan-300 via-blue-500/80 to-purple-500 p-[2px] shadow-[0_16px_42px_rgba(0,0,0,0.42),0_0_26px_rgba(34,211,238,0.14)] transition-shadow duration-200 hover:shadow-[0_22px_54px_rgba(0,0,0,0.5),0_0_36px_rgba(34,211,238,0.22)]"
      style={{ WebkitTapHighlightColor: "transparent" }}
    >
      <div className="flex h-full flex-col overflow-hidden rounded-[22px] bg-[#070713]/90 shadow-inner shadow-white/[0.035] backdrop-blur-xl">
        <div className="p-3 pb-2 sm:p-4 sm:pb-3">
          <div className="relative mx-auto aspect-[9/16] w-[68%] max-w-[230px] overflow-hidden rounded-[1.45rem] border border-cyan-300/22 bg-black shadow-[0_0_30px_rgba(34,211,238,0.16)] sm:w-[62%] sm:max-w-[245px] lg:w-[58%] lg:max-w-[260px] landscape:w-[46%] landscape:max-w-[220px]">
            {tiktokOpen ? (
              <TikTokInlinePlayer track={track} onClose={handleCloseTikTokPreview} onAudioIntent={handleTikTokAudioIntent} />
            ) : (
              <button type="button" onClick={handleOpenTikTokPreview} className="group/tiktok absolute inset-0 block h-full w-full overflow-hidden text-left active:scale-[0.992]" aria-label="Watch TikTok preview inside Upper Vibe Media">
                {thumbnail ? (
                  <img src={thumbnail} alt={caption} className="h-full w-full bg-black object-contain" loading={index < 8 ? "eager" : "lazy"} fetchPriority={index < 3 ? "high" : "auto"} decoding="async" />
                ) : (
                  <div className="flex h-full flex-col justify-center p-4 text-center">
                    <Quote className="mx-auto mb-3 h-8 w-8 text-cyan-200/70" />
                    <p className="font-heading text-lg font-black leading-tight text-white">{caption}</p>
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-black/10" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="flex h-11 w-11 items-center justify-center rounded-full border border-white/25 bg-black/55 text-white shadow-xl backdrop-blur-md transition-transform duration-300 group-hover/tiktok:scale-105">
                    <Play className="ml-0.5 h-5 w-5 fill-current" />
                  </span>
                </div>
                <div className="absolute left-2 top-2 flex items-center gap-1.5 rounded-full border border-white/15 bg-black/50 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.14em] text-white/82 backdrop-blur-md">
                  <TypeIcon className="h-3 w-3" /> {postLabel[type] || "Post"}
                </div>
                {(track.tiktok_trending || track.tiktok_pin_top) && (
                  <div className="absolute right-2 top-2 flex items-center gap-1 rounded-full border border-orange-300/30 bg-orange-400/18 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.12em] text-orange-100 backdrop-blur-md">
                    <Flame className="h-3 w-3" /> Hot
                  </div>
                )}
              </button>
            )}
          </div>

          <div className="mt-3 rounded-2xl border border-white/10 bg-white/[0.045] p-3">
            <p className="line-clamp-2 text-sm font-bold leading-snug text-white/88">{caption}</p>
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-2 text-[11px] font-black text-white/52">
              {dateText && <span className="inline-flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5" /> {dateText}</span>}
              {stats.map(({ icon: Icon, value }, i) => (
                <span key={i} className="inline-flex items-center gap-1.5"><Icon className="h-3.5 w-3.5" /> {value}</span>
              ))}
            </div>
          </div>
        </div>

        <div className="relative flex flex-1 flex-col border-t border-cyan-300/25 bg-[#03030b]/95 p-4 pt-3 shadow-[0_-16px_42px_rgba(34,211,238,0.11)] backdrop-blur-xl">
          <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-cyan-300/10 via-cyan-300 to-purple-400/90 shadow-[0_0_18px_rgba(34,211,238,0.65)]" />
          <div className="mb-3 flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-cyan-200 drop-shadow-[0_0_10px_rgba(34,211,238,0.5)]">
            <span className="h-px flex-1 bg-gradient-to-r from-transparent via-cyan-300/50 to-purple-400/40" />
            ♪ Matched Song
            <span className="h-px flex-1 bg-gradient-to-l from-transparent via-cyan-300/50 to-purple-400/40" />
          </div>

          <div className="flex flex-col items-center text-center">
            <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-2xl border border-white/12 bg-black/40 shadow-[0_0_24px_rgba(34,211,238,0.14)] sm:h-24 sm:w-24">
              {albumCover ? (
                <>
                  <img src={albumCover} alt="" aria-hidden="true" className="absolute inset-0 h-full w-full scale-110 object-cover opacity-40 blur-xl" loading={index < 4 ? "eager" : "lazy"} />
                  <img src={albumCover} alt={track.title || "Album artwork"} className="relative z-10 h-full w-full object-contain p-1.5" loading={index < 4 ? "eager" : "lazy"} decoding="async" />
                </>
              ) : (
                <CoverImage src={thumbnail} alt={track.title} width={96} height={96} className="h-full w-full" iconClassName="w-7 h-7" />
              )}
            </div>

            <div className="mt-3 min-h-[48px] min-w-0 max-w-full">
              <h2 className="line-clamp-2 font-heading text-lg font-black leading-tight text-white sm:text-xl">{track.title}</h2>
              <p className="mt-1 truncate text-sm font-semibold text-white/62">{track.artist_display || "Upper Vibe Media"}</p>
            </div>
          </div>

          <div className="mt-auto grid gap-2.5 pt-3">
            <button
              onClick={handlePlay}
              disabled={!track.audio_url}
              className="flex min-h-[54px] w-full items-center justify-center gap-2 rounded-2xl bg-cyan-300 px-4 text-sm font-black uppercase tracking-wider text-black shadow-[0_0_24px_rgba(34,211,238,0.3)] transition-all hover:brightness-110 active:scale-[0.98] disabled:opacity-45"
            >
              {active ? <Pause className="h-5 w-5 fill-current" /> : <Play className="h-5 w-5 fill-current" />} {active ? "Pause" : isCurrentTrack ? "Resume Full Song" : "Play Full Song"}
            </button>

            <button
              onClick={handleOpen}
              className="flex min-h-[46px] w-full items-center justify-center gap-2 rounded-2xl border border-white/12 bg-white/[0.06] px-4 text-sm font-black text-white transition-all hover:bg-white/[0.1] active:scale-[0.98]"
            >
              Open Song Page <ExternalLink className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </motion.article>
  );
}