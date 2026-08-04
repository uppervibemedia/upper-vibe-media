import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Loader2, Sparkles } from "lucide-react";
import { base44 } from "@/api/base44Client";
import TikTokFeedHero from "@/components/tiktok/TikTokFeedHero";
import TikTokFeedSearch from "@/components/tiktok/TikTokFeedSearch";
import TikTokCategoryTabs from "@/components/tiktok/TikTokCategoryTabs";
import TikTokSongCard from "@/components/tiktok/TikTokSongCard";
import FutureSongMatcherPanel from "@/components/tiktok/FutureSongMatcherPanel";

const dateValue = (value) => value ? new Date(value).getTime() || 0 : 0;
const textValue = (value) => String(value || "").toLowerCase();

function orderedTikTokSort(copy) {
  return copy.sort((a, b) => {
    if (!!b.tiktok_pin_top !== !!a.tiktok_pin_top) return Number(!!b.tiktok_pin_top) - Number(!!a.tiktok_pin_top);
    const orderA = Number.isFinite(Number(a.tiktok_display_order)) ? Number(a.tiktok_display_order) : 9999;
    const orderB = Number.isFinite(Number(b.tiktok_display_order)) ? Number(b.tiktok_display_order) : 9999;
    if (orderA !== orderB) return orderA - orderB;
    return dateValue(b.tiktok_posted_at || b.release_date || b.created_date) - dateValue(a.tiktok_posted_at || a.release_date || a.created_date);
  });
}

function matchesTheme(track, theme) {
  const haystack = [track.title, track.artist_display, track.description, track.lyrics, track.tiktok_caption, ...(track.mood_tags || [])].map(textValue).join(" ");
  if (theme === "motivation") return /motivat|inspire|rise|focus|power|grind|energy|strength/.test(haystack);
  if (theme === "mindset") return /mindset|manifest|clarity|heal|meditat|affirm|frequency|peace/.test(haystack);
  if (theme === "relationships") return /love|heart|relationship|twin|soul|romance|breakup|together/.test(haystack);
  return true;
}

function sortTracks(tracks, mode) {
  const copy = [...tracks];
  if (mode === "newest") return copy.sort((a, b) => dateValue(b.release_date || b.created_date) - dateValue(a.release_date || a.created_date));
  if (mode === "saved") return copy.sort((a, b) => Number(b.saved_count || b.favorites || b.plays || 0) - Number(a.saved_count || a.favorites || a.plays || 0));
  if (mode === "rising") return copy.sort((a, b) => dateValue(b.tiktok_posted_at || b.updated_date || b.created_date) - dateValue(a.tiktok_posted_at || a.updated_date || a.created_date));
  if (mode === "432hz") return orderedTikTokSort(copy.filter((track) => track.frequency_type === "432hz" || Number(track.frequency_hz) === 432));
  if (["motivation", "mindset", "relationships"].includes(mode)) return orderedTikTokSort(copy.filter((track) => matchesTheme(track, mode)));
  return orderedTikTokSort(copy);
}

function searchTracks(tracks, query) {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return tracks;
  return tracks.filter((track) => [
    track.title,
    track.artist_display,
    track.lyrics,
    track.description,
    track.tiktok_caption,
    ...(track.mood_tags || []),
  ].some((value) => textValue(value).includes(normalized)));
}

export default function TikTokFeed() {
  const [tracks, setTracks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState("trending");
  const [searchQuery, setSearchQuery] = useState("");
  const [visibleCount, setVisibleCount] = useState(12);

  useEffect(() => {
    base44.analytics.track({ eventName: "tiktok_feed_page_visit", properties: { source: "tiktok_bio" } });
    const load = async () => {
      const promoted = await base44.entities.Track.filter({ status: "published", tiktok_promoted: true }, "-updated_date", 80);
      if (promoted.length > 0) {
        setTracks(promoted);
      } else {
        const recent = await base44.entities.Track.filter({ status: "published" }, "-release_date", 36);
        setTracks(recent);
      }
      setLoading(false);
    };
    load();
  }, []);

  useEffect(() => {
    setVisibleCount(12);
  }, [activeSection, searchQuery]);

  useEffect(() => {
    const onScroll = () => {
      const nearBottom = window.innerHeight + window.scrollY > document.documentElement.scrollHeight - 900;
      if (nearBottom) setVisibleCount((count) => Math.min(count + 8, 80));
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const filteredTracks = useMemo(() => searchTracks(sortTracks(tracks, activeSection), searchQuery), [tracks, activeSection, searchQuery]);
  const visibleTracks = filteredTracks.slice(0, visibleCount);

  return (
    <main className="min-h-[100dvh] overflow-x-hidden bg-black text-white" style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 9.25rem)" }}>
      <section className="mx-auto w-full max-w-[1500px] space-y-3 px-4 pt-[calc(env(safe-area-inset-top,0px)+12px)] sm:px-5 lg:px-7">
        <div className="mx-auto w-full max-w-2xl space-y-3">
          <TikTokFeedHero />
          <TikTokFeedSearch value={searchQuery} onChange={setSearchQuery} />
          <TikTokCategoryTabs active={activeSection} onChange={setActiveSection} />
        </div>

        {loading ? (
          <div className="flex min-h-[45vh] flex-col items-center justify-center gap-3 text-white/60">
            <Loader2 className="h-7 w-7 animate-spin text-cyan-300" />
            <p className="text-xs font-black uppercase tracking-[0.2em]">Loading TikTok songs...</p>
          </div>
        ) : filteredTracks.length === 0 ? (
          <div className="mx-auto max-w-xl rounded-[2rem] border border-white/10 bg-white/[0.04] p-7 text-center">
            <Sparkles className="mx-auto mb-3 h-8 w-8 text-cyan-300" />
            <h2 className="font-heading text-xl font-black">No matching songs yet</h2>
            <p className="mt-2 text-sm text-white/55">Try a different title, lyric, artist, or TikTok sound search.</p>
            <Link to="/music" className="mt-5 inline-flex min-h-[46px] items-center gap-2 rounded-2xl bg-cyan-400 px-5 text-sm font-black uppercase tracking-wider text-black">
              Browse Music <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
            {visibleTracks.map((track, index) => <TikTokSongCard key={track.id} track={track} index={index} />)}
          </div>
        )}

        <FutureSongMatcherPanel />
      </section>
    </main>
  );
}