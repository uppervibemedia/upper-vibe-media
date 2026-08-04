import React from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ExternalLink, Flame, Music2, Play } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { usePlayer } from "@/context/PlayerContext";
import CoverImage from "@/components/shared/CoverImage";
import SaveHeartButton from "@/components/shared/SaveHeartButton";
import ShareVibeButton from "@/components/shared/ShareVibeButton";

const formatCompact = (value) => {
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) return null;
  if (number >= 1000000) return `${(number / 1000000).toFixed(number >= 10000000 ? 0 : 1)}M`;
  if (number >= 1000) return `${Math.round(number / 1000)}K`;
  return String(number);
};

const getSocialProof = (track) => {
  const proof = [];
  const tiktokPlays = formatCompact(track.tiktok_plays || track.tiktok_play_count || track.tiktok_views);
  const videoUses = formatCompact(track.tiktok_video_uses || track.video_uses || track.tiktok_uses);
  if (tiktokPlays) proof.push(`${tiktokPlays} TikTok Plays`);
  if (videoUses) proof.push(`${videoUses} Video Uses`);
  if (track.tiktok_trending_this_week || track.trending_this_week) proof.push("Trending This Week");
  if (track.tiktok_social_proof) proof.push(track.tiktok_social_proof);
  return proof.slice(0, 2);
};

const is432 = (track) => track.frequency_type === "432hz" || Number(track.frequency_hz) === 432;

export default function TikTokSongCard({ track, index }) {
  const { playTrack, currentTrack, isPlaying } = usePlayer();
  const navigate = useNavigate();
  const active = currentTrack?.id === track.id && isPlaying;
  const socialProof = getSocialProof(track);

  const trackAnalytics = (eventName) => {
    base44.analytics.track({
      eventName,
      properties: {
        source: "tiktok_feed",
        track_id: track.id,
        title: track.title || "",
        artist: track.artist_display || "Upper Vibe Media",
      },
    });
  };

  const handlePlay = () => {
    trackAnalytics("tiktok_feed_song_play");
    playTrack(track, "tiktok_feed");
  };

  const handleOpen = () => {
    trackAnalytics("tiktok_feed_open_song");
    navigate(`/song/${track.id}`);
  };

  return (
    <motion.article
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.025, 0.22) }}
      whileHover={{ y: -4 }}
      whileTap={{ y: -2, scale: 0.992 }}
      className="group overflow-hidden rounded-[1.35rem] border border-white/10 bg-white/[0.05] shadow-xl shadow-black/25 backdrop-blur-sm transition-colors hover:border-cyan-200/25 hover:bg-white/[0.065]"
      style={{ WebkitTapHighlightColor: "transparent" }}
    >
      <div className="flex gap-3 p-3">
        <div className="relative h-[112px] w-[112px] shrink-0 overflow-hidden rounded-[1.05rem] bg-black sm:h-[126px] sm:w-[126px]">
          <CoverImage
            src={track.cover_url}
            alt={track.title}
            width={320}
            height={320}
            eager={index < 12}
            fetchPriority={index < 4 ? "high" : "auto"}
            className="h-full w-full transition-transform duration-500 group-hover:scale-[1.045]"
            iconClassName="w-8 h-8"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-transparent" />
          <button
            onClick={handlePlay}
            disabled={!track.audio_url}
            className="absolute bottom-2 right-2 flex h-12 w-12 items-center justify-center rounded-full bg-cyan-300 text-black shadow-[0_0_24px_rgba(34,211,238,0.35)] transition-all hover:scale-105 active:scale-95 disabled:opacity-45"
            aria-label={active ? `Playing ${track.title}` : `Play ${track.title}`}
          >
            <Play className={`ml-0.5 h-5 w-5 ${active ? "fill-current" : ""}`} />
          </button>
        </div>

        <div className="flex min-w-0 flex-1 flex-col py-0.5">
          <div className="mb-1.5 flex flex-wrap gap-1.5">
            {is432(track) && <span className="rounded-full border border-yellow-200/25 bg-yellow-300/10 px-2 py-0.5 text-[10px] font-black text-yellow-100">432 Hz</span>}
            <span className="inline-flex items-center gap-1 rounded-full border border-cyan-200/20 bg-cyan-300/10 px-2 py-0.5 text-[10px] font-black text-cyan-100">
              {track.tiktok_pin_top ? <Flame className="h-3 w-3" /> : <Music2 className="h-3 w-3" />}
              {track.tiktok_pin_top ? "Trending on TikTok" : "You Heard This on TikTok"}
            </span>
          </div>

          <h2 className="line-clamp-2 font-heading text-[1.05rem] font-black leading-[1.05] text-white sm:text-lg">{track.title}</h2>
          <p className="mt-1 truncate text-sm font-semibold text-white/58">{track.artist_display || "Upper Vibe Media"}</p>

          {socialProof.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5 text-[10px] font-black uppercase tracking-[0.08em] text-white/42">
              {socialProof.map((label) => <span key={label}>{label}</span>)}
            </div>
          )}

          <div className="mt-auto grid grid-cols-[1fr_auto_auto] items-center gap-2 pt-3">
            <button
              onClick={handlePlay}
              disabled={!track.audio_url}
              className="flex min-h-[44px] items-center justify-center gap-2 rounded-2xl bg-cyan-300 px-3 text-xs font-black uppercase tracking-wider text-black shadow-[0_0_18px_rgba(34,211,238,0.22)] transition-all hover:brightness-110 active:scale-[0.98] disabled:opacity-45"
            >
              <Play className={`h-4 w-4 ${active ? "fill-current" : ""}`} />
              {active ? "Playing" : "Play"}
            </button>
            <div className="min-h-[44px]" onClickCapture={() => trackAnalytics("tiktok_feed_save_tap")}>
              <SaveHeartButton
                item={track}
                itemType="song"
                meta={{ title: track.title, artist: track.artist_display, cover_url: track.cover_url, audio_url: track.audio_url }}
                size="md"
                onNeedLogin={() => alert("Log in to save this song to My Vibe Library.")}
              />
            </div>
            <div className="min-h-[44px]" onClickCapture={() => trackAnalytics("tiktok_feed_share_tap")}>
              <ShareVibeButton type="song" track={track} size="sm" className="h-10" />
            </div>
          </div>

          <button
            onClick={handleOpen}
            className="mt-2 flex min-h-[40px] w-full items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.055] px-3 text-xs font-black uppercase tracking-wider text-white/82 transition-all hover:bg-white/[0.085] active:scale-[0.98]"
          >
            Open Song <ExternalLink className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </motion.article>
  );
}