import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Loader2, Search, Sparkles } from "lucide-react";
import { base44 } from "@/api/base44Client";
import TikTokFeedFilterTabs from "@/components/tiktok/TikTokFeedFilterTabs";
import TikTokPostCard from "@/components/tiktok/TikTokPostCard";

const dateValue = (value) => value ? new Date(value).getTime() || 0 : 0;
const textValue = (value) => String(value || "").toLowerCase();
const weekAgo = () => Date.now() - 7 * 24 * 60 * 60 * 1000;

function mapPostToPlayable(post, track) {
  return {
    ...track,
    social_post_id: post.id,
    provider_video_id: post.provider_video_id,
    tiktok_caption: post.caption,
    tiktok_post_type: post.post_type || "video",
    tiktok_thumbnail_url: post.thumbnail_url,
    tiktok_preview_url: post.preview_url,
    tiktok_post_url: post.post_url,
    tiktok_posted_at: post.posted_at,
    tiktok_view_count: post.view_count || 0,
    tiktok_like_count: post.like_count || 0,
    tiktok_comment_count: post.comment_count || 0,
    tiktok_share_count: post.share_count || 0,
    tiktok_trending: !!post.is_trending,
    tiktok_pin_top: !!post.is_pinned,
    tiktok_featured: !!post.is_featured,
    tiktok_display_order: post.display_order || 0,
  };
}

function sortItems(items, mode) {
  const copy = [...items];
  if (mode === "views") return copy.sort((a, b) => Number(b.tiktok_view_count || 0) - Number(a.tiktok_view_count || 0));
  if (mode === "trending") return copy.sort((a, b) => Number(!!b.tiktok_trending) - Number(!!a.tiktok_trending) || Number(b.tiktok_view_count || 0) - Number(a.tiktok_view_count || 0));
  if (mode === "week") return copy.filter((item) => dateValue(item.tiktok_posted_at) >= weekAgo()).sort((a, b) => dateValue(b.tiktok_posted_at) - dateValue(a.tiktok_posted_at));
  return copy.sort((a, b) => Number(!!b.tiktok_pin_top) - Number(!!a.tiktok_pin_top) || Number(a.tiktok_display_order || 0) - Number(b.tiktok_display_order || 0) || dateValue(b.tiktok_posted_at || b.release_date || b.created_date) - dateValue(a.tiktok_posted_at || a.release_date || a.created_date));
}

function searchItems(items, query) {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return items;
  return items.filter((item) => [item.title, item.artist_display, item.lyrics, item.description, item.tiktok_caption].some((value) => textValue(value).includes(normalized)));
}

export default function TikTokFeed() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState("newest");
  const [searchQuery, setSearchQuery] = useState("");
  const [visibleCount, setVisibleCount] = useState(10);

  useEffect(() => {
    base44.analytics.track({ eventName: "tiktok_live_feed_page_visit", properties: { source: "tiktok_bio" } });
    const load = async () => {
      const [posts, tracks] = await Promise.all([
        base44.entities.SocialVideoPost.filter({ provider: "tiktok", approval_status: "approved", is_hidden: false }, "-posted_at", 80),
        base44.entities.Track.filter({ status: "published" }, "-updated_date", 500),
      ]);
      const trackMap = Object.fromEntries(tracks.map((track) => [track.id, track]));
      const mapped = posts.map((post) => post.track_id && trackMap[post.track_id] ? mapPostToPlayable(post, trackMap[post.track_id]) : null).filter(Boolean);
      if (mapped.length > 0) setItems(mapped);
      else {
        const promoted = tracks.filter((track) => track.tiktok_promoted).slice(0, 24);
        setItems(promoted.length ? promoted : tracks.slice(0, 16));
      }
      setLoading(false);
    };
    load();
  }, []);

  useEffect(() => setVisibleCount(10), [activeFilter, searchQuery]);

  useEffect(() => {
    const onScroll = () => {
      if (window.innerHeight + window.scrollY > document.documentElement.scrollHeight - 900) {
        setVisibleCount((count) => Math.min(count + 6, 80));
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const filteredItems = useMemo(() => searchItems(sortItems(items, activeFilter), searchQuery), [items, activeFilter, searchQuery]);
  const visibleItems = filteredItems.slice(0, visibleCount);
  const firstPosts = visibleItems.slice(0, 4);
  const laterPosts = visibleItems.slice(4);

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

        <div className="mx-auto mt-4 max-w-2xl pb-4 text-center">
          <p className="text-sm font-semibold text-white/58">Newest synced TikTok uploads first — recognize the post, tap Play Song, and listen instantly.</p>
        </div>

        {loading ? (
          <div className="flex min-h-[45vh] flex-col items-center justify-center gap-3 text-white/60">
            <Loader2 className="h-7 w-7 animate-spin text-cyan-300" />
            <p className="text-xs font-black uppercase tracking-[0.2em]">Loading live TikTok feed...</p>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="mx-auto max-w-xl rounded-[2rem] border border-white/10 bg-white/[0.04] p-7 text-center">
            <Sparkles className="mx-auto mb-3 h-8 w-8 text-cyan-300" />
            <h2 className="font-heading text-xl font-black">No matching TikToks yet</h2>
            <p className="mt-2 text-sm text-white/55">Try a song title, lyric, artist, or caption from the TikTok you remember.</p>
            <Link to="/music" className="mt-5 inline-flex min-h-[46px] items-center gap-2 rounded-2xl bg-cyan-400 px-5 text-sm font-black uppercase tracking-wider text-black">Browse Music <ArrowRight className="h-4 w-4" /></Link>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {firstPosts.map((item, index) => <TikTokPostCard key={`${item.social_post_id || item.id}-${index}`} track={item} index={index} />)}
            </div>
            <div className="mx-auto my-5 max-w-2xl rounded-[1.35rem] border border-white/10 bg-white/[0.035] p-3">
              <p className="mb-2 px-1 text-[10px] font-black uppercase tracking-[0.2em] text-white/38">Filter TikTok posts</p>
              <TikTokFeedFilterTabs active={activeFilter} onChange={setActiveFilter} />
            </div>
            {laterPosts.length > 0 && (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                {laterPosts.map((item, index) => <TikTokPostCard key={`${item.social_post_id || item.id}-${index + 4}`} track={item} index={index + 4} />)}
              </div>
            )}
          </>
        )}
      </section>
    </main>
  );
}