import React from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Calendar, ExternalLink, Flame, Heart, MessageCircle, Play, Repeat2, Share2, Image as ImageIcon, Quote } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { usePlayer } from "@/context/PlayerContext";
import CoverImage from "@/components/shared/CoverImage";

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
  const { playTrack, currentTrack, isPlaying } = usePlayer();
  const navigate = useNavigate();
  const active = currentTrack?.id === track.id && isPlaying;
  const type = track.tiktok_post_type || "video";
  const TypeIcon = postIcon[type] || Play;
  const thumbnail = track.tiktok_thumbnail_url || track.tiktok_preview_url || track.cover_url;
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
    trackAnalytics("tiktok_post_play_song");
    playTrack(track, "tiktok_feed");
  };

  const handleOpen = () => {
    trackAnalytics("tiktok_post_open_song");
    navigate(`/song/${track.id}`);
  };

  return (
    <motion.article
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.025, 0.2) }}
      whileHover={{ y: -4 }}
      whileTap={{ scale: 0.992 }}
      className="overflow-hidden rounded-[1.65rem] border border-white/10 bg-[#070713] shadow-2xl shadow-black/30"
      style={{ WebkitTapHighlightColor: "transparent" }}
    >
      <div className="relative aspect-[9/13] overflow-hidden bg-gradient-to-br from-purple-950 via-black to-cyan-950">
        {thumbnail ? (
          <CoverImage src={thumbnail} alt={caption} width={720} height={1040} eager={index < 8} fetchPriority={index < 3 ? "high" : "auto"} className="h-full w-full transition-transform duration-500 group-hover:scale-[1.03]" iconClassName="w-10 h-10" />
        ) : (
          <div className="flex h-full flex-col justify-center p-6 text-center">
            <Quote className="mx-auto mb-4 h-10 w-10 text-cyan-200/70" />
            <p className="font-heading text-2xl font-black leading-tight text-white">{caption}</p>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-black/15" />
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
      </div>

      <div className="space-y-3 p-3.5">
        <div className="flex items-center gap-3">
          <CoverImage src={track.cover_url || thumbnail} alt={track.title} width={48} height={48} className="h-12 w-12 shrink-0 rounded-xl overflow-hidden" iconClassName="w-5 h-5" />
          <div className="min-w-0">
            <h2 className="truncate font-heading text-lg font-black leading-tight text-white">{track.title}</h2>
            <p className="truncate text-sm font-semibold text-white/55">{track.artist_display || "Upper Vibe Media"}</p>
          </div>
        </div>

        <button
          onClick={handlePlay}
          disabled={!track.audio_url}
          className="flex min-h-[54px] w-full items-center justify-center gap-2 rounded-2xl bg-cyan-300 px-4 text-sm font-black uppercase tracking-wider text-black shadow-[0_0_24px_rgba(34,211,238,0.26)] transition-all hover:brightness-110 active:scale-[0.98] disabled:opacity-45"
        >
          <Play className={`h-5 w-5 ${active ? "fill-current" : ""}`} /> {active ? "Playing Song" : "Play Song"}
        </button>

        <button
          onClick={handleOpen}
          className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.055] px-4 text-sm font-black text-white transition-all hover:bg-white/[0.085] active:scale-[0.98]"
        >
          Open Full Song <ExternalLink className="h-4 w-4" />
        </button>
      </div>
    </motion.article>
  );
}