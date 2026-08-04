import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, ExternalLink, Loader2, Music4, Play, Sparkles } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { usePlayer } from "@/context/PlayerContext";
import CoverImage from "@/components/shared/CoverImage";
import SaveHeartButton from "@/components/shared/SaveHeartButton";
import ShareVibeButton from "@/components/shared/ShareVibeButton";

const sectionTabs = [
  { key: "trending", label: "Trending From TikTok" },
  { key: "newest", label: "Newest TikTok Songs" },
  { key: "played", label: "Most Played This Week" },
  { key: "recent", label: "Recently Posted" },
];

const dateValue = (value) => value ? new Date(value).getTime() || 0 : 0;
const defaultCaption = (track) => track?.description || "The sound you saw on TikTok — tap play and catch the full Upper Vibe frequency.";

function sortTracks(tracks, mode) {
  const copy = [...tracks];
  if (mode === "played") return copy.sort((a, b) => (b.plays || 0) - (a.plays || 0));
  if (mode === "newest") return copy.sort((a, b) => dateValue(b.release_date || b.created_date) - dateValue(a.release_date || a.created_date));
  if (mode === "recent") return copy.sort((a, b) => dateValue(b.tiktok_posted_at || b.updated_date || b.created_date) - dateValue(a.tiktok_posted_at || a.updated_date || a.created_date));
  return copy.sort((a, b) => {
    if (!!b.tiktok_pin_top !== !!a.tiktok_pin_top) return Number(!!b.tiktok_pin_top) - Number(!!a.tiktok_pin_top);
    const orderA = Number.isFinite(Number(a.tiktok_display_order)) ? Number(a.tiktok_display_order) : 9999;
    const orderB = Number.isFinite(Number(b.tiktok_display_order)) ? Number(b.tiktok_display_order) : 9999;
    if (orderA !== orderB) return orderA - orderB;
    return dateValue(b.tiktok_posted_at || b.release_date || b.created_date) - dateValue(a.tiktok_posted_at || a.release_date || a.created_date);
  });
}

function TikTokSongCard({ track, index }) {
  const { playTrack, currentTrack, isPlaying } = usePlayer();
  const navigate = useNavigate();
  const active = currentTrack?.id === track.id && isPlaying;

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
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.04, 0.28) }}
      className="overflow-hidden rounded-[1.75rem] border border-white/10 bg-white/[0.045] shadow-2xl shadow-black/30"
      style={{ WebkitTapHighlightColor: "transparent" }}
    >
      <div className="relative aspect-[4/5] w-full overflow-hidden bg-black">
        <CoverImage
          src={track.cover_url}
          alt={track.title}
          width={720}
          height={900}
          eager={index < 4}
          fetchPriority={index < 2 ? "high" : "auto"}
          className="h-full w-full"
          iconClassName="w-12 h-12"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />
        <div className="absolute left-4 top-4 rounded-full border border-cyan-300/25 bg-black/45 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-cyan-200 backdrop-blur-md">
          Upper Vibe Media
        </div>
        <div className="absolute right-4 top-4 rounded-full border border-yellow-300/25 bg-black/45 px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-yellow-200 backdrop-blur-md">
          432 Hz
        </div>
        <div className="absolute bottom-0 left-0 right-0 p-4">
          <p className="mb-2 text-[11px] font-black uppercase tracking-[0.2em] text-white/55">From TikTok</p>
          <h2 className="font-heading text-2xl font-black leading-tight text-white">{track.title}</h2>
          <p className="mt-1 text-sm font-semibold text-white/70">{track.artist_display || "Upper Vibe Media"}</p>
        </div>
      </div>

      <div className="space-y-4 p-4">
        <p className="text-[15px] font-semibold leading-snug text-white/86">
          {track.tiktok_caption || defaultCaption(track)}
        </p>

        <div className="grid grid-cols-[1fr_auto_auto] gap-2">
          <button
            onClick={handlePlay}
            disabled={!track.audio_url}
            className="flex min-h-[52px] items-center justify-center gap-2 rounded-2xl bg-cyan-400 px-4 text-sm font-black uppercase tracking-wider text-black transition-all active:scale-[0.98] disabled:opacity-50"
          >
            <Play className={`h-5 w-5 ${active ? "fill-current" : ""}`} />
            {active ? "Playing" : "Play"}
          </button>
          <div onClickCapture={() => trackAnalytics("tiktok_feed_save_tap")}>
            <SaveHeartButton
              item={track}
              itemType="song"
              meta={{ title: track.title, artist: track.artist_display, cover_url: track.cover_url, audio_url: track.audio_url }}
              size="md"
              onNeedLogin={() => alert("Log in to save this song to My Vibe Library.")}
            />
          </div>
          <div onClickCapture={() => trackAnalytics("tiktok_feed_share_tap")}>
            <ShareVibeButton type="song" track={track} size="sm" className="h-9" />
          </div>
        </div>

        <button
          onClick={handleOpen}
          className="flex min-h-[46px] w-full items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.055] px-4 text-sm font-black uppercase tracking-wider text-white transition-all active:scale-[0.98]"
        >
          Open Song <ExternalLink className="h-4 w-4" />
        </button>
      </div>
    </motion.article>
  );
}

export default function TikTokFeed() {
  const [tracks, setTracks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState("trending");

  useEffect(() => {
    base44.analytics.track({ eventName: "tiktok_feed_page_visit", properties: { source: "tiktok_bio" } });
    const load = async () => {
      const promoted = await base44.entities.Track.filter({ status: "published", tiktok_promoted: true }, "-updated_date", 60);
      if (promoted.length > 0) {
        setTracks(promoted);
      } else {
        const recent = await base44.entities.Track.filter({ status: "published" }, "-release_date", 12);
        setTracks(recent);
      }
      setLoading(false);
    };
    load();
  }, []);

  const visibleTracks = useMemo(() => sortTracks(tracks, activeSection), [tracks, activeSection]);

  return (
    <main className="min-h-[100dvh] overflow-x-hidden bg-black text-white" style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 9.5rem)" }}>
      <section className="mx-auto w-full max-w-xl px-4 pt-8 sm:pt-10">
        <div className="mb-6 rounded-[2rem] border border-cyan-300/15 bg-gradient-to-br from-cyan-400/12 via-purple-500/10 to-black p-5 shadow-2xl shadow-cyan-950/25">
          <div className="mb-4 flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-cyan-400 text-black">
              <Music4 className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-cyan-200">Upper Vibe TikTok Feed</p>
              <p className="text-xs text-white/45">Find the song you just saw.</p>
            </div>
          </div>
          <h1 className="font-heading text-3xl font-black leading-tight sm:text-4xl">Tap the TikTok song and start listening.</h1>
          <p className="mt-3 text-sm leading-relaxed text-white/65">Newest promoted tracks appear first, with direct play, save, share, and song-page links.</p>
        </div>

        <div className="mb-5 flex gap-2 overflow-x-auto pb-1 hide-scrollbar">
          {sectionTabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveSection(tab.key)}
              className={`shrink-0 rounded-full border px-4 py-2 text-xs font-black transition-all ${activeSection === tab.key ? "border-cyan-300/50 bg-cyan-300/15 text-cyan-100" : "border-white/10 bg-white/[0.04] text-white/55"}`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex min-h-[45vh] flex-col items-center justify-center gap-3 text-white/60">
            <Loader2 className="h-7 w-7 animate-spin text-cyan-300" />
            <p className="text-xs font-black uppercase tracking-[0.2em]">Loading TikTok songs...</p>
          </div>
        ) : visibleTracks.length === 0 ? (
          <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-8 text-center">
            <Sparkles className="mx-auto mb-3 h-8 w-8 text-cyan-300" />
            <h2 className="font-heading text-xl font-black">TikTok feed coming soon</h2>
            <p className="mt-2 text-sm text-white/55">Mark songs as promoted on TikTok in the music manager to feature them here.</p>
            <Link to="/music" className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-cyan-400 px-5 py-3 text-sm font-black uppercase tracking-wider text-black">
              Browse Music <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        ) : (
          <div className="space-y-5">
            {visibleTracks.map((track, index) => <TikTokSongCard key={track.id} track={track} index={index} />)}
          </div>
        )}
      </section>
    </main>
  );
}