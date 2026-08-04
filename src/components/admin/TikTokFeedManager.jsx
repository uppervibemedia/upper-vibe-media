import React, { useEffect, useMemo, useState } from "react";
import { Loader2, RefreshCw, EyeOff, Pin, Star, CheckCircle2, AlertTriangle, Search, Wand2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import CoverImage from "@/components/shared/CoverImage";

const normalize = (value) => String(value || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
const titleOf = (track) => track ? `${track.title}${track.artist_display ? ` — ${track.artist_display}` : ""}` : "Unlinked";
const statusText = (post) => {
  if (post.match_method === "manual") return "Matched manually";
  if (post.match_status === "matched" && post.track_id) return "Matched automatically";
  if (post.match_status === "review") return "Needs review";
  return "No song found";
};
const statusClass = (post) => {
  if (post.match_method === "manual") return "bg-purple-400/10 text-purple-300";
  if (post.match_status === "matched" && post.track_id) return "bg-green-400/10 text-green-400";
  if (post.match_status === "review") return "bg-yellow-400/10 text-yellow-400";
  return "bg-red-400/10 text-red-400";
};

export default function TikTokFeedManager({ tracks }) {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [librarySearch, setLibrarySearch] = useState("");
  const [aliasDrafts, setAliasDrafts] = useState({});
  const [captionDrafts, setCaptionDrafts] = useState({});
  const trackMap = useMemo(() => Object.fromEntries((tracks || []).map((track) => [track.id, track])), [tracks]);
  const filteredTracks = useMemo(() => {
    const q = normalize(librarySearch);
    const list = [...(tracks || [])].sort((a, b) => (a.title || "").localeCompare(b.title || ""));
    if (!q) return list;
    return list.filter((track) => normalize(`${track.title} ${track.artist_display}`).includes(q));
  }, [tracks, librarySearch]);

  const loadPosts = async () => {
    setLoading(true);
    const rows = await base44.entities.SocialVideoPost.filter({ provider: "tiktok" }, "-posted_at", 200);
    setPosts(rows);
    setCaptionDrafts(Object.fromEntries(rows.map((post) => [post.id, post.caption || ""])));
    setLoading(false);
  };

  useEffect(() => { loadPosts(); }, []);

  const syncNow = async (forceRematch = false) => {
    setSyncing(true);
    const res = await base44.functions.invoke("syncTikTokFeed", { forceRematch });
    toast.success(`TikTok synced: ${res.data.created || 0} new, ${res.data.updated || 0} updated`);
    setSyncing(false);
    loadPosts();
  };

  const updatePost = async (post, data) => {
    await base44.entities.SocialVideoPost.update(post.id, data);
    setPosts((items) => items.map((item) => item.id === post.id ? { ...item, ...data } : item));
  };

  const assignTrack = async (post, trackId) => {
    const track = trackMap[trackId];
    await updatePost(post, {
      track_id: trackId,
      matched_song_title: track?.title || "",
      matched_artist: track?.artist_display || "",
      song_page_url: trackId ? `/song/${trackId}` : "",
      match_status: trackId ? "matched" : "unmatched",
      match_method: trackId ? "manual" : "none",
      match_confidence: trackId ? 100 : 0,
      approval_status: trackId ? "approved" : "pending",
      suggested_track_ids: trackId ? [trackId] : [],
    });
    toast.success(trackId ? "Song match saved" : "Song match cleared");
  };

  const saveAlias = async (post) => {
    const alias = (aliasDrafts[post.id] || post.detected_song_title || "").trim();
    if (!alias || !post.track_id) return toast.error("Choose a song and enter an alias first.");
    const track = trackMap[post.track_id];
    await base44.entities.SongTitleAlias.create({
      alias_title: alias,
      normalized_alias: normalize(alias),
      track_id: post.track_id,
      canonical_title: track?.title || post.matched_song_title || "",
      artist_display: track?.artist_display || post.matched_artist || "",
    });
    toast.success("Title alias saved");
    setAliasDrafts((drafts) => ({ ...drafts, [post.id]: "" }));
  };

  const saveCaptionAndRematch = async (post) => {
    await updatePost(post, { caption: captionDrafts[post.id] || "", match_method: "none" });
    await syncNow(true);
  };

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs tracking-[0.3em] uppercase text-cyan-400 mb-1">TikTok Feed</p>
          <h2 className="font-heading font-bold text-2xl">TikTok Feed Manager</h2>
          <p className="text-sm text-muted-foreground mt-1">Review detected titles, approve matches, save aliases, and refresh synced TikTok posts.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => syncNow(false)} disabled={syncing} className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-cyan-400 px-5 text-sm font-black uppercase tracking-wider text-black disabled:opacity-60">
            {syncing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />} Refresh TikTok Feed
          </button>
          <button onClick={() => syncNow(true)} disabled={syncing} className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-border/40 px-5 text-sm font-black uppercase tracking-wider disabled:opacity-60">
            <Wand2 className="h-4 w-4" /> Re-run Matching
          </button>
        </div>
      </div>

      <div className="mb-4 flex min-h-[44px] items-center gap-2 rounded-xl border border-border/30 bg-card/40 px-3">
        <Search className="h-4 w-4 text-muted-foreground" />
        <input value={librarySearch} onChange={(e) => setLibrarySearch(e.target.value)} placeholder="Search music library for manual assignment..." className="h-11 flex-1 bg-transparent text-sm outline-none" />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-cyan-400" /></div>
      ) : posts.length === 0 ? (
        <div className="rounded-2xl border border-border/30 bg-card/40 p-8 text-center text-muted-foreground">No synced TikTok videos yet. Press Refresh TikTok Feed.</div>
      ) : (
        <div className="space-y-3">
          {posts.map((post) => {
            const linkedTrack = trackMap[post.track_id];
            return (
              <div key={post.id} className="rounded-2xl border border-border/30 bg-card/45 p-4">
                <div className="grid gap-4 lg:grid-cols-[92px_1fr_340px]">
                  <CoverImage src={post.thumbnail_url} alt={post.caption} width={92} height={128} className="h-32 w-24 overflow-hidden rounded-xl" iconClassName="h-6 w-6" />
                  <div className="min-w-0 space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-black uppercase ${statusClass(post)}`}>{post.match_status === "matched" ? <CheckCircle2 className="h-3 w-3" /> : <AlertTriangle className="h-3 w-3" />}{statusText(post)}</span>
                      {post.is_pinned && <span className="rounded-full bg-cyan-400/10 px-2 py-1 text-[10px] font-black uppercase text-cyan-400">Pinned</span>}
                      {post.is_hidden && <span className="rounded-full bg-red-400/10 px-2 py-1 text-[10px] font-black uppercase text-red-400">Hidden</span>}
                    </div>
                    <label className="block text-[10px] font-black uppercase tracking-wider text-muted-foreground">Detected title</label>
                    <p className="text-sm font-bold text-cyan-300">{post.detected_song_title || "Song match required"}</p>
                    <label className="block text-[10px] font-black uppercase tracking-wider text-muted-foreground">Caption</label>
                    <textarea value={captionDrafts[post.id] ?? post.caption ?? ""} onChange={(e) => setCaptionDrafts((drafts) => ({ ...drafts, [post.id]: e.target.value }))} className="min-h-[72px] w-full rounded-xl border border-border/30 bg-card/50 p-3 text-sm" />
                    <p className="text-xs text-muted-foreground">Matched: <span className="font-bold text-foreground">{titleOf(linkedTrack)}</span> · Confidence {post.match_confidence || 0}% · {post.match_method || "none"}</p>
                    <p className="text-xs text-muted-foreground">{post.posted_at || "No date"} · {post.view_count || 0} views · {post.like_count || 0} likes</p>
                  </div>
                  <div className="space-y-3">
                    <select value={post.track_id || ""} onChange={(e) => assignTrack(post, e.target.value)} className="w-full rounded-lg border border-border/30 bg-card/60 px-3 py-2 text-sm text-foreground">
                      <option value="">Song match required...</option>
                      {filteredTracks.map((track) => <option key={track.id} value={track.id}>{titleOf(track)}</option>)}
                    </select>
                    <div className="flex gap-2">
                      <input value={aliasDrafts[post.id] || ""} onChange={(e) => setAliasDrafts((drafts) => ({ ...drafts, [post.id]: e.target.value }))} placeholder="Alias: My Headspace" className="min-w-0 flex-1 rounded-lg border border-border/30 bg-card/60 px-3 py-2 text-sm" />
                      <button onClick={() => saveAlias(post)} className="rounded-lg border border-border/30 px-3 py-2 text-xs font-bold hover:bg-muted/30">Save Alias</button>
                    </div>
                    {post.suggested_track_ids?.length > 0 && <div className="rounded-xl bg-cyan-400/5 p-2 text-[11px] text-cyan-300">Suggested: {post.suggested_track_ids.map((id) => trackMap[id]?.title).filter(Boolean).join(", ")}</div>}
                    <button onClick={() => saveCaptionAndRematch(post)} className="w-full rounded-lg border border-border/30 px-3 py-2 text-xs font-bold hover:bg-muted/30">Save Caption & Re-run Match</button>
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