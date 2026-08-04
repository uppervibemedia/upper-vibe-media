import React, { useEffect, useMemo, useState } from "react";
import { Loader2, RefreshCw, EyeOff, Pin, Star, CheckCircle2, AlertTriangle } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import CoverImage from "@/components/shared/CoverImage";

const titleOf = (track) => track ? `${track.title}${track.artist_display ? ` — ${track.artist_display}` : ""}` : "Unlinked";

export default function TikTokFeedManager({ tracks }) {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const trackMap = useMemo(() => Object.fromEntries((tracks || []).map((track) => [track.id, track])), [tracks]);

  const loadPosts = async () => {
    setLoading(true);
    const rows = await base44.entities.SocialVideoPost.filter({ provider: "tiktok" }, "-posted_at", 200);
    setPosts(rows);
    setLoading(false);
  };

  useEffect(() => { loadPosts(); }, []);

  const syncNow = async () => {
    setSyncing(true);
    const res = await base44.functions.invoke("syncTikTokFeed", {});
    toast.success(`TikTok synced: ${res.data.created || 0} new, ${res.data.updated || 0} updated`);
    setSyncing(false);
    loadPosts();
  };

  const updatePost = async (post, data) => {
    await base44.entities.SocialVideoPost.update(post.id, data);
    setPosts((items) => items.map((item) => item.id === post.id ? { ...item, ...data } : item));
  };

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs tracking-[0.3em] uppercase text-cyan-400 mb-1">TikTok Feed</p>
          <h2 className="font-heading font-bold text-2xl">TikTok Feed Manager</h2>
          <p className="text-sm text-muted-foreground mt-1">Sync TikTok videos, approve posts, and map each video to exactly one song.</p>
        </div>
        <button onClick={syncNow} disabled={syncing} className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-cyan-400 px-5 text-sm font-black uppercase tracking-wider text-black disabled:opacity-60">
          {syncing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />} Refresh TikTok Feed
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-cyan-400" /></div>
      ) : posts.length === 0 ? (
        <div className="rounded-2xl border border-border/30 bg-card/40 p-8 text-center text-muted-foreground">No synced TikTok videos yet. Press Refresh TikTok Feed.</div>
      ) : (
        <div className="space-y-3">
          {posts.map((post) => {
            const linkedTrack = trackMap[post.track_id];
            const needsReview = post.match_status === "review" || !post.track_id;
            return (
              <div key={post.id} className="rounded-2xl border border-border/30 bg-card/45 p-4">
                <div className="grid gap-4 lg:grid-cols-[92px_1fr_300px]">
                  <CoverImage src={post.thumbnail_url} alt={post.caption} width={92} height={128} className="h-32 w-24 overflow-hidden rounded-xl" iconClassName="h-6 w-6" />
                  <div className="min-w-0">
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      {needsReview ? <span className="inline-flex items-center gap-1 rounded-full bg-yellow-400/10 px-2 py-1 text-[10px] font-black uppercase text-yellow-400"><AlertTriangle className="h-3 w-3" /> Review</span> : <span className="inline-flex items-center gap-1 rounded-full bg-green-400/10 px-2 py-1 text-[10px] font-black uppercase text-green-400"><CheckCircle2 className="h-3 w-3" /> Mapped</span>}
                      {post.is_pinned && <span className="rounded-full bg-cyan-400/10 px-2 py-1 text-[10px] font-black uppercase text-cyan-400">Pinned</span>}
                      {post.is_hidden && <span className="rounded-full bg-red-400/10 px-2 py-1 text-[10px] font-black uppercase text-red-400">Hidden</span>}
                    </div>
                    <p className="line-clamp-2 text-sm font-semibold text-foreground">{post.caption || "No caption"}</p>
                    <p className="mt-2 text-xs text-muted-foreground">{post.posted_at || "No date"} · {post.view_count || 0} views · {post.like_count || 0} likes · {post.comment_count || 0} comments · {post.share_count || 0} shares</p>
                    <p className="mt-2 text-xs font-bold text-cyan-400">Linked: {titleOf(linkedTrack)}</p>
                  </div>
                  <div className="space-y-3">
                    <select value={post.track_id || ""} onChange={(e) => updatePost(post, { track_id: e.target.value, match_status: e.target.value ? "matched" : "unmatched", approval_status: e.target.value ? "approved" : "pending" })} className="w-full rounded-lg border border-border/30 bg-card/60 px-3 py-2 text-sm text-foreground">
                      <option value="">Link to song...</option>
                      {[...(tracks || [])].sort((a, b) => (a.title || "").localeCompare(b.title || "")).map((track) => <option key={track.id} value={track.id}>{titleOf(track)}</option>)}
                    </select>
                    {post.suggested_track_ids?.length > 0 && (
                      <div className="rounded-xl bg-cyan-400/5 p-2 text-[11px] text-cyan-300">Suggested: {post.suggested_track_ids.map((id) => trackMap[id]?.title).filter(Boolean).join(", ")}</div>
                    )}
                    <div className="grid grid-cols-2 gap-2">
                      <button onClick={() => updatePost(post, { approval_status: post.approval_status === "approved" ? "pending" : "approved" })} className="rounded-lg border border-border/30 px-3 py-2 text-xs font-bold hover:bg-muted/30">{post.approval_status === "approved" ? "Unapprove" : "Approve"}</button>
                      <button onClick={() => updatePost(post, { is_pinned: !post.is_pinned })} className="rounded-lg border border-border/30 px-3 py-2 text-xs font-bold hover:bg-muted/30"><Pin className="mr-1 inline h-3 w-3" /> Pin</button>
                      <button onClick={() => updatePost(post, { is_featured: !post.is_featured })} className="rounded-lg border border-border/30 px-3 py-2 text-xs font-bold hover:bg-muted/30"><Star className="mr-1 inline h-3 w-3" /> Feature</button>
                      <button onClick={() => updatePost(post, { is_hidden: !post.is_hidden })} className="rounded-lg border border-border/30 px-3 py-2 text-xs font-bold hover:bg-muted/30"><EyeOff className="mr-1 inline h-3 w-3" /> Hide</button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}