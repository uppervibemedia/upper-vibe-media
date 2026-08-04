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
  const thumbnail = track.tiktok_thumbnail_url || track.tiktok_preview_url || track.cover_url;
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
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.025, 0.2) }}
      whileHover={{ y: -7, scale: 1.02 }}
      whileTap={{ y: -4, scale: 1.01 }}
      className="group/card h-full rounded-[24px] bg-gradient-to-br from-cyan-300 via-blue-500/80 to-purple-500 p-[2px] shadow-[0_18px_48px_rgba(0,0,0,0.44),0_0_30px_rgba(34,211,238,0.15)] transition-shadow duration-200 will-change-transform hover:shadow-[0_24px_62px_rgba(0,0,0,0.52),0_0_44px_rgba(34,211,238,0.26),0_0_28px_rgba(168,85,247,0.18)]"
      style={{ WebkitTapHighlightColor: "transparent" }}
    >
      <div className="flex h-full flex-col overflow-hidden rounded-[22px] bg-[#070713]/88 shadow-inner shadow-white/[0.035] backdrop-blur-xl">
      <div className="relative aspect-[9/13] w-full shrink-0 overflow-hidden bg-gradient-to-br from-purple-950 via-black to-cyan-950">
        {tiktokOpen ? (
          <TikTokInlinePlayer track={track} onClose={handleCloseTikTokPreview} onAudioIntent={handleTikTokAudioIntent} />
        ) : (
      <button type="button" onClick={handleOpenTikTokPreview} className="group/tiktok absolute inset-0 block h-full w-full overflow-hidden text-left transition-transform active:scale-[0.992]" aria-label="Watch TikTok preview inside Upper Vibe Media">
        {thumbnail ? (
          <CoverImage src={thumbnail} alt={caption} width={720} height={1040} eager={index < 8} fetchPriority={index < 3 ? "high" : "auto"} className="h-full w-full transition-transform duration-500 group-hover/tiktok:scale-[1.045]" iconClassName="w-10 h-10" />
        ) : (
          <div className="flex h-full flex-col justify-center p-6 text-center">
            <Quote className="mx-auto mb-4 h-10 w-10 text-cyan-200/70" />
            <p className="font-heading text-2xl font-black leading-tight text-white">{caption}</p>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-black/15" />
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="absolute h-16 w-16 rounded-full bg-cyan-300/20 opacity-0 transition-opacity group-active/tiktok:animate-ping group-active/tiktok:opacity-100" />
          <span className="flex h-16 w-16 items-center justify-center rounded-full border border-white/25 bg-black/48 text-white shadow-2xl backdrop-blur-md transition-transform duration-300 group-hover/tiktok:scale-110">
            <Play className="ml-1 h-7 w-7 fill-current" />
          </span>
        </div>
        <div className="absolute left-3 top-3 flex items-center gap-2 rounded-full border border-white/15 bg-black/45 px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-white/80 backdrop-blur-md">
          <TypeIcon className="h-3.5 w-3.5" /> {postLabel[type] || "Post"}
        </div>
        {(track.tiktok_trending || track.tiktok_pin_top) && (
          <div className="absolute right-3 top-3 flex items-center gap-1 rounded-full border border-orange-300/30 bg-orange-400/16 px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-orange-100 backdrop-blur-md">
            <Flame className="h-3.5 w-3.5" /> Trending
          </div>
        )}
        {stats.length > 0 && (
          <div className="absolute bottom-4 right-3 flex flex-col items-center gap-3">
            {stats.map(({ icon: Icon, value }, i) => (
              <div key={i} className="flex flex-col items-center text-white drop-shadow">
                <Icon className="h-5 w-5" />
                <span className="mt-0.5 text-[10px] font-black">{value}</span>
              </div>
            ))}
          </div>
        )}
        <div className="absolute bottom-0 left-0 right-10 p-4">
          <p className="line-clamp-3 text-sm font-bold leading-snug text-white">{caption}</p>
          {dateText && <p className="mt-2 inline-flex items-center gap-1.5 text-[11px] font-bold text-white/55"><Calendar className="h-3.5 w-3.5" /> {dateText}</p>}
        </div>
      </button>
        )}
      </div>

      <div className="relative flex flex-1 flex-col border-t border-cyan-300/25 bg-[#03030b]/95 p-4 shadow-[0_-22px_55px_rgba(34,211,238,0.13)] backdrop-blur-xl">
        <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-cyan-300/10 via-cyan-300 to-purple-400/90 shadow-[0_0_18px_rgba(34,211,238,0.65)]" />
        <div className="mb-3 flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-[0.22em] text-cyan-200 drop-shadow-[0_0_10px_rgba(34,211,238,0.55)]">
          <span className="h-px flex-1 bg-gradient-to-r from-transparent via-cyan-300/50 to-purple-400/40" />
          ♪ Now Playing
          <span className="h-px flex-1 bg-gradient-to-l from-transparent via-cyan-300/50 to-purple-400/40" />
        </div>

        <div className="flex flex-col items-center text-center">
          <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-2xl border border-white/12 bg-black/40 shadow-[0_0_30px_rgba(34,211,238,0.15)] sm:h-28 sm:w-28">
            {albumCover ? (
              <>
                <img src={albumCover} alt="" aria-hidden="true" className="absolute inset-0 h-full w-full scale-110 object-cover opacity-40 blur-xl" loading={index < 4 ? "eager" : "lazy"} />
                <img src={albumCover} alt={track.title || "Album artwork"} className="relative z-10 h-full w-full object-contain p-1.5" loading={index < 4 ? "eager" : "lazy"} decoding="async" />
              </>
            ) : (
              <CoverImage src={thumbnail} alt={track.title} width={112} height={112} className="h-full w-full" iconClassName="w-8 h-8" />
            )}
          </div>

          <div className="mt-3 min-h-[56px] min-w-0 max-w-full">
            <h2 className="line-clamp-2 font-heading text-xl font-black leading-tight text-white">{track.title}</h2>
            <p className="mt-1 truncate text-sm font-semibold text-white/62">{track.artist_display || "Upper Vibe Media"}</p>
          </div>
        </div>

        <div className="mt-auto grid gap-2.5 pt-4">
          <button
            onClick={handlePlay}
            disabled={!track.audio_url}
            className="flex min-h-[58px] w-full items-center justify-center gap-2 rounded-2xl bg-cyan-300 px-4 text-sm font-black uppercase tracking-wider text-black shadow-[0_0_26px_rgba(34,211,238,0.32)] transition-all hover:brightness-110 active:scale-[0.98] disabled:opacity-45"
          >
            {active ? <Pause className="h-5 w-5 fill-current" /> : <Play className="h-5 w-5 fill-current" />} {active ? "Pause" : isCurrentTrack ? "Resume Full Song" : "Play Full Song"}
          </button>

          <button
            onClick={handleOpen}
            className="flex min-h-[52px] w-full items-center justify-center gap-2 rounded-2xl border border-white/12 bg-white/[0.07] px-4 text-sm font-black text-white transition-all hover:bg-white/[0.1] active:scale-[0.98]"
          >
            Open Song Page <ExternalLink className="h-4 w-4" />
          </button>

        </div>
      </div>
      </div>

    </motion.article>
  );
}