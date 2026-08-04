import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Loader2, Search, Sparkles } from "lucide-react";
import { base44 } from "@/api/base44Client";
import TikTokCategoryTabs from "@/components/tiktok/TikTokCategoryTabs";
import TikTokPostCard from "@/components/tiktok/TikTokPostCard";
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
  if (mode === "newest") return copy.sort((a, b) => dateValue(b.tiktok_posted_at || b.release_date || b.created_date) - dateValue(a.tiktok_posted_at || a.release_date || a.created_date));
  if (mode === "saved") return copy.sort((a, b) => Number(b.tiktok_like_count || b.saved_count || b.plays || 0) - Number(a.tiktok_like_count || a.saved_count || a.plays || 0));
  if (mode === "rising") return copy.sort((a, b) => Number(b.tiktok_share_count || b.tiktok_view_count || 0) - Number(a.tiktok_share_count || a.tiktok_view_count || 0));
  if (mode === "432hz") return orderedTikTokSort(copy.filter((track) => track.frequency_type === "432hz" || Number(track.frequency_hz) === 432));
  if (["motivation", "mindset", "relationships"].includes(mode)) return orderedTikTokSort(copy.filter((track) => matchesTheme(track, mode)));
  return orderedTikTokSort(copy);
}

function searchTracks(tracks, query) {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return tracks;
  return tracks.filter((track) => [track.title, track.artist_display, track.lyrics, track.description, track.tiktok_caption, ...(track.mood_tags || [])].some((value) => textValue(value).includes(normalized)));
}

export default function TikTokFeed() {
  const [tracks, setTracks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState("trending");
  const [searchQuery, setSearchQuery] = useState("");
  const [visibleCount, setVisibleCount] = useState(10);

  useEffect(() => {
    base44.analytics.track({ eventName: "tiktok_post_feed_page_visit", properties: { source: "tiktok_bio" } });
    const load = async () => {
      const promoted = await base44.entities.Track.filter({ status: "published", tiktok_promoted: true }, "-updated_date", 80);
      if (promoted.length > 0) setTracks(promoted);
      else setTracks(await base44.entities.Track.filter({ status: "published" }, "-release_date", 24));
      setLoading(false);
    };
    load();
  }, []);

  useEffect(() => setVisibleCount(10), [activeSection, searchQuery]);

  useEffect(() => {
    const onScroll = () => {
      if (window.innerHeight + window.scrollY > document.documentElement.scrollHeight - 900) {
        setVisibleCount((count) => Math.min(count + 6, 80));
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const filteredTracks = useMemo(() => searchTracks(sortTracks(tracks, activeSection), searchQuery), [tracks, activeSection, searchQuery]);
  const visibleTracks = filteredTracks.slice(0, visibleCount);
  const topPosts = visibleTracks.slice(0, 4);
  const laterPosts = visibleTracks.slice(4);

  return (
    <main className="min-h-[100dvh] overflow-x-hidden bg-black text-white" style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 9.25rem)" }}>
      <section className="mx-auto w-full max-w-[1280px] px-4 pt-[calc(env(safe-area-inset-top,0px)+10px)] sm:px-5 lg:px-7">
        <div className="sticky top-0 z-20 -mx-4 border-b border-white/8 bg-black/88 px-4 pb-3 pt-[calc(env(safe-area-inset-top,0px)+10px)] backdrop-blur-xl sm:-mx-5 sm:px-5 lg:-mx-7 lg:px-7">
          <div className="mx-auto max-w-2xl">
            <div className="mb-3 flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-300 to-blue-500 text-lg font-black text-black">UV</div>
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-[0.24em] text-cyan-200">Official Upper Vibe TikTok</p>
                <h1 className="truncate font-heading text-2xl font-black leading-none text-white">Find the TikTok you just saw</h1>
              </div>
            </div>
            <div className="flex min-h-[50px] items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.055] px-3 shadow-xl shadow-black/20">
              <Search className="h-5 w-5 shrink-0 text-cyan-200" />
              <input value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="Search song title or TikTok caption..." className="h-12 min-w-0 flex-1 bg-transparent text-[15px] font-semibold text-white outline-none placeholder:text-white/38" type="search" autoComplete="off" />
            </div>
          </div>
        </div>

        <div className="mx-auto mt-4 max-w-2xl pb-3 text-center">
          <p className="text-sm font-semibold text-white/58">Scroll recent Upper Vibe TikToks, recognize the exact post, then tap Play Song.</p>
        </div>

        {loading ? (
          <div className="flex min-h-[45vh] flex-col items-center justify-center gap-3 text-white/60">
            <Loader2 className="h-7 w-7 animate-spin text-cyan-300" />
            <p className="text-xs font-black uppercase tracking-[0.2em]">Loading TikTok posts...</p>
          </div>
        ) : filteredTracks.length === 0 ? (
          <div className="mx-auto max-w-xl rounded-[2rem] border border-white/10 bg-white/[0.04] p-7 text-center">
            <Sparkles className="mx-auto mb-3 h-8 w-8 text-cyan-300" />
            <h2 className="font-heading text-xl font-black">No matching TikToks yet</h2>
            <p className="mt-2 text-sm text-white/55">Try a song title, lyric, artist, or caption from the TikTok you remember.</p>
            <Link to="/music" className="mt-5 inline-flex min-h-[46px] items-center gap-2 rounded-2xl bg-cyan-400 px-5 text-sm font-black uppercase tracking-wider text-black">Browse Music <ArrowRight className="h-4 w-4" /></Link>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {topPosts.map((track, index) => <TikTokPostCard key={track.id} track={track} index={index} />)}
            </div>

            <div className="mx-auto my-5 max-w-2xl rounded-[1.35rem] border border-white/10 bg-white/[0.035] p-3">
              <p className="mb-2 px-1 text-[10px] font-black uppercase tracking-[0.2em] text-white/38">Explore if you need it</p>
              <TikTokCategoryTabs active={activeSection} onChange={setActiveSection} />
            </div>

            {laterPosts.length > 0 && (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                {laterPosts.map((track, index) => <TikTokPostCard key={track.id} track={track} index={index + 4} />)}
              </div>
            )}
          </>
        )}

        <FutureSongMatcherPanel />
      </section>
    </main>
  );
}