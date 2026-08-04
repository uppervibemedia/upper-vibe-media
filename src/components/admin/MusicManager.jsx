import React, { useState, useMemo, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckSquare, Square, Trash2, Download, Lock, Unlock, Tag, Users, Waves,
  Edit2, Search, X, Star, Eye, EyeOff, Music4, Brain, Loader2, Shield, ShieldOff, AlertTriangle, Disc3, Plus, CheckCheck, FileArchive, FileText
} from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import CoverImage from "@/components/shared/CoverImage";

const MOOD_OPTIONS = ["motivation", "focus", "healing", "confidence", "money", "night", "driving", "meditation", "love", "spiritual"];
const TIER_OPTIONS = ["free", "supporter", "premium"];


export default function MusicManager({ tracks, categories, artists, onEdit, onRefresh }) {
  const [selected, setSelected] = useState(new Set());
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(null); // { current, total }
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterTier, setFilterTier] = useState("all");
  const [bulkPanel, setBulkPanel] = useState(null);
  const [bulkValue, setBulkValue] = useState("");
  const [aiOrganizing, setAiOrganizing] = useState(false);
  const [djPlaylists, setDjPlaylists] = useState([]);
  const [djMenuTrackId, setDjMenuTrackId] = useState(null); // track id whose DJ menu is open
  const [djTrackIds, setDjTrackIds] = useState(new Set()); // all track ids in any DJ playlist

  // Load DJ playlists once so we can show "add to DJ" inline
  useEffect(() => {
    base44.entities.DJPlaylist.list("-updatedAt", 30)
      .then(pls => {
        setDjPlaylists(pls);
        const allIds = new Set(pls.flatMap(p => p.trackIds || []));
        setDjTrackIds(allIds);
      })
      .catch(() => {});
  }, [tracks]);

  // Close DJ dropdown on outside click
  useEffect(() => {
    if (!djMenuTrackId) return;
    const close = () => setDjMenuTrackId(null);
    window.addEventListener("click", close);
    return () => window.removeEventListener("click", close);
  }, [djMenuTrackId]);

  const addToDJPlaylist = async (trackId, playlistId) => {
    const pl = djPlaylists.find(p => p.id === playlistId);
    if (!pl) return;
    if ((pl.trackIds || []).includes(trackId)) {
      toast.info("Already in that playlist");
      setDjMenuTrackId(null);
      return;
    }
    const newIds = [...(pl.trackIds || []), trackId];
    await base44.entities.DJPlaylist.update(playlistId, { trackIds: newIds, updatedAt: new Date().toISOString() });
    toast.success(`Added to "${pl.djPlaylistName}"`);
    setDjTrackIds(prev => new Set([...prev, trackId]));
    setDjMenuTrackId(null);
  };

  const catMap = useMemo(() => Object.fromEntries(categories.map((c) => [c.id, c.name])), [categories]);
  const artistMap = useMemo(() => Object.fromEntries(artists.map((a) => [a.id, a.name])), [artists]);

  const filtered = useMemo(() => {
    return tracks.filter((t) => {
      const q = search.toLowerCase();
      const matchSearch = !search ||
        (t.title || "").toLowerCase().includes(q) ||
        (t.artist_display || "").toLowerCase().includes(q) ||
        (artistMap[t.primary_artist_id] || "").toLowerCase().includes(q);
      const matchCat = filterCategory === "all" || (t.category_ids || []).includes(filterCategory);
      const matchTier = filterTier === "all" || (t.tier_access || ["free"]).includes(filterTier);
      return matchSearch && matchCat && matchTier;
    });
  }, [tracks, search, filterCategory, filterTier, artistMap]);

  const toggleSelect = (id) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === filtered.length) setSelected(new Set());
    else setSelected(new Set(filtered.map((t) => t.id)));
  };

  const selCount = selected.size;

  const applyBulk = async () => {
    if (!selCount || !bulkValue) return;
    const ids = [...selected];

    if (bulkPanel === "category") {
      for (const id of ids) {
        const track = tracks.find((t) => t.id === id);
        const existing = track?.category_ids || [];
        const next = existing.includes(bulkValue) ? existing : [...existing, bulkValue];
        await base44.entities.Track.update(id, { category_ids: next });
      }
      toast.success(`Assigned category to ${selCount} tracks`);
    } else if (bulkPanel === "artist") {
      const artistName = artistMap[bulkValue] || "";
      await Promise.all(ids.map((id) => base44.entities.Track.update(id, {
        primary_artist_id: bulkValue,
        artist_display: artistName,
      })));
      toast.success(`Set artist "${artistName}" on ${selCount} tracks`);
    } else if (bulkPanel === "tier") {
      await Promise.all(ids.map((id) => base44.entities.Track.update(id, {
        tier_access: [bulkValue],
        is_premium: bulkValue !== "free",
        min_tier: bulkValue,
      })));
      toast.success(`Set tier to ${bulkValue} for ${selCount} tracks`);
    } else if (bulkPanel === "mood") {
      for (const id of ids) {
        const track = tracks.find((t) => t.id === id);
        const existing = track?.mood_tags || [];
        const next = existing.includes(bulkValue) ? existing : [...existing, bulkValue];
        await base44.entities.Track.update(id, { mood_tags: next });
      }
      toast.success(`Added mood tag "${bulkValue}" to ${selCount} tracks`);
    } else if (bulkPanel === "new_release") {
      const flag = bulkValue === "yes";
      await Promise.all(ids.map((id) => base44.entities.Track.update(id, { is_new_release: flag })));
      toast.success(`Marked ${selCount} tracks as ${flag ? "" : "not "}New Releases`);
    } else if (bulkPanel === "lock") {
      const flag = bulkValue === "yes";
      await Promise.all(ids.map((id) => base44.entities.Track.update(id, { metadata_locked: flag })));
      toast.success(`${flag ? "Locked" : "Unlocked"} metadata on ${selCount} tracks`);
    }

    setSelected(new Set());
    setBulkPanel(null);
    setBulkValue("");
    onRefresh();
  };

  const bulkDelete = async () => {
    if (!selCount) return;
    if (!confirm(`Delete ${selCount} selected track(s)?`)) return;
    await Promise.all([...selected].map((id) => base44.entities.Track.delete(id)));
    toast.success(`Deleted ${selCount} tracks`);
    setSelected(new Set());
    onRefresh();
  };

  const toggleStatus = async (track) => {
    const next = track.status === "published" ? "archived" : "published";
    await base44.entities.Track.update(track.id, { status: next });
    onRefresh();
  };

  const toggleFeatured = async (track) => {
    await base44.entities.Track.update(track.id, { is_featured: !track.is_featured });
    onRefresh();
  };

  const toggleTikTok = async (track) => {
    await base44.entities.Track.update(track.id, { tiktok_promoted: !track.tiktok_promoted });
    toast.success(track.tiktok_promoted ? "Removed from TikTok Feed" : "Added to TikTok Feed");
    onRefresh();
  };

  const deleteTrack = async (track) => {
    if (!confirm(`Delete "${track.title}"?`)) return;
    await base44.entities.Track.delete(track.id);
    toast.success("Track deleted");
    onRefresh();
  };

  const toggleLock = async (track) => {
    await base44.entities.Track.update(track.id, { metadata_locked: !track.metadata_locked });
    toast.success(track.metadata_locked ? "Metadata unlocked" : "Metadata locked");
    onRefresh();
  };

  // ── ID3v2 helpers (pure JS, no deps) ──────────────────────────────────────
  const _syncSafe = (n) => new Uint8Array([(n>>21)&0x7f,(n>>14)&0x7f,(n>>7)&0x7f,n&0x7f]);
  const _textFrame = (id, text) => {
    const tb = new TextEncoder().encode(String(text||''));
    const buf = new Uint8Array(10+1+tb.length);
    new TextEncoder().encodeInto(id, buf);
    new DataView(buf.buffer,4,4).setUint32(0,1+tb.length);
    buf[10]=0; buf.set(tb,11); return buf;
  };
  const _apicFrame = (imgBytes, mime) => {
    const mb = new TextEncoder().encode(mime||'image/jpeg');
    const sz = 1+mb.length+1+1+1+imgBytes.length;
    const buf = new Uint8Array(10+sz);
    new TextEncoder().encodeInto('APIC',buf);
    new DataView(buf.buffer,4,4).setUint32(0,sz);
    let i=10; buf[i++]=0; buf.set(mb,i); i+=mb.length;
    buf[i++]=0; buf[i++]=3; buf[i++]=0;
    buf.set(new Uint8Array(imgBytes),i); return buf;
  };
  const _buildID3 = (frames) => {
    let sz=0; for(const f of frames) sz+=f.length;
    const hdr=new Uint8Array(10);
    hdr[0]=0x49;hdr[1]=0x44;hdr[2]=0x33;hdr[3]=3;hdr[4]=0;hdr[5]=0;
    hdr.set(_syncSafe(sz),6);
    const out=new Uint8Array(10+sz); out.set(hdr);
    let p=10; for(const f of frames){out.set(f,p);p+=f.length;} return out;
  };
  const _writeID3 = (mp3, {title,artist,album,genre,comment,coverBytes,coverMime}) => {
    let start=0;
    if(mp3[0]===0x49&&mp3[1]===0x44&&mp3[2]===0x33){
      const s=((mp3[6]&0x7f)<<21)|((mp3[7]&0x7f)<<14)|((mp3[8]&0x7f)<<7)|(mp3[9]&0x7f);
      start=10+s;
    }
    const audio=mp3.subarray(start);
    const frames=[
      _textFrame('TIT2',title||'Untitled'), _textFrame('TPE1',artist||'Upper Vibe Media'),
      _textFrame('TALB',album||'Upper Vibe Media'), _textFrame('TCON',genre||'432 Hz / High Vibe'),
      _textFrame('COMM',comment||'Exported from Upper Vibe Media'),
    ];
    if(coverBytes&&coverBytes.length>0) frames.push(_apicFrame(coverBytes,coverMime||'image/jpeg'));
    const id3=_buildID3(frames);
    const out=new Uint8Array(id3.length+audio.length);
    out.set(id3); out.set(audio,id3.length); return out;
  };

  const exportAllSongs = async () => {
    if (isExporting) return;
    if (!confirm(`Export all ${tracks.length} songs with cover art + metadata? Songs are processed one at a time — keep this page open until the ZIP downloads.`)) return;

    setIsExporting(true);

    // Dynamically import JSZip only when needed
    const JSZip = (await import("jszip")).default;

    const zip = new JSZip();
    const songsFolder = zip.folder("Songs");
    const artFolder   = zip.folder("Cover Art");

    let exported=0, artEmbedded=0, artSeparate=0, artMissing=0;
    const skipped=[];
    const usedNames = new Map();

    const getExt = (url) => {
      try { const e=new URL(url).pathname.split('.').pop().toLowerCase().split('?')[0]; return ['mp3','wav','m4a','aac','ogg','flac'].includes(e)?e:'mp3'; } catch { return 'mp3'; }
    };
    const getImageMime = (url) => {
      try { const p=new URL(url).pathname.toLowerCase(); if(p.endsWith('.png')) return 'image/png'; if(p.endsWith('.webp')) return 'image/webp'; return 'image/jpeg'; } catch { return 'image/jpeg'; }
    };
    const safeFn = (t) => (t||'Untitled Song').replace(/[\\/:*?"<>|]/g,'').trim()||'Untitled Song';
    const fetchB = async (url) => { try { const r=await fetch(url); if(!r.ok) return null; return new Uint8Array(await r.arrayBuffer()); } catch { return null; } };

    try {
      for (let i = 0; i < tracks.length; i++) {
        const track = tracks[i];
        setExportProgress({ label: `Processing ${i + 1} of ${tracks.length}: ${track.title || ""}` });

        const audioUrl = track.audio_url;
        if (!audioUrl) { skipped.push({title: track.title||'Untitled', reason: 'Missing audio URL'}); continue; }

        const base = safeFn(track.title);
        const ext  = getExt(audioUrl);
        const cnt  = (usedNames.get(base)||0)+1;
        usedNames.set(base, cnt);
        const nk = cnt>1 ? `${base} (${cnt})` : base;

        const audioBytes = await fetchB(audioUrl);
        if (!audioBytes) { skipped.push({title: track.title||'Untitled', reason: 'Could not fetch audio'}); continue; }

        const coverUrl = track.cover_url || track.coverUrl || track.coverArtUrl || track.imageUrl || track.artworkUrl || track.cover_image;
        let coverBytes=null, coverMime='image/jpeg';
        if (coverUrl) { coverBytes=await fetchB(coverUrl); if(coverBytes) coverMime=getImageMime(coverUrl); }

        let finalBytes=audioBytes, embedded=false;
        if (ext==='mp3') {
          try {
            finalBytes = _writeID3(audioBytes, {
              title: track.title||'Untitled', artist: track.artist_display||'Upper Vibe Media',
              album: 'Upper Vibe Media', genre: '432 Hz / High Vibe',
              comment: 'Exported from Upper Vibe Media',
              coverBytes: coverBytes||null, coverMime,
            });
            embedded=true;
          } catch(e) { console.warn('ID3 write failed:', e.message); }
        }

        songsFolder.file(`${nk}.${ext}`, finalBytes);
        exported++;

        if (coverBytes) {
          artFolder.file(`${nk}.jpg`, coverBytes);
          artSeparate++;
          if (embedded) artEmbedded++;
        } else {
          artMissing++;
        }
      }

      setExportProgress({ label: "Generating ZIP…" });

      const now = new Date().toISOString().replace('T',' ').slice(0,19)+' UTC';
      const skippedLines = skipped.map(s=>`  - ${s.title} — ${s.reason}`).join('\n');
      zip.file("EXPORT-REPORT.txt", [
        'Upper Vibe Media Song Export',
        `Exported at: ${now}`,
        '',
        `Total songs found:          ${tracks.length}`,
        `Songs exported:             ${exported}`,
        `Cover art embedded (MP3):   ${artEmbedded}`,
        `Cover art in /Cover Art:    ${artSeparate}`,
        `Cover art missing:          ${artMissing}`,
        `Songs skipped:              ${skipped.length}`,
        '',
        'Notes:',
        '- Cover art is embedded into MP3 files as an ID3v2 APIC frame.',
        '- All available cover art is also saved separately in /Cover Art.',
        '',
        skipped.length>0 ? `Skipped:\n${skippedLines}` : 'No songs were skipped.',
      ].join('\n'));

      const zipBlob = await zip.generateAsync({ type:"blob", compression:"DEFLATE", compressionOptions:{level:1} });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(zipBlob);
      link.download = "Upper-Vibe-Media-All-Songs.zip";
      document.body.appendChild(link); link.click(); document.body.removeChild(link);
      URL.revokeObjectURL(link.href);

      toast.success(`Export complete. ${exported} songs · ${artEmbedded} covers embedded · ${artSeparate} in ZIP${skipped.length>0?` · ${skipped.length} skipped`:""}.`);
    } catch (err) {
      console.error("[exportAllSongs]", err);
      toast.error(`Export failed: ${err.message}`);
    }

    setIsExporting(false);
    setExportProgress(null);
  };

  const exportSongUrlsCsv = () => {
    const rows = [["Title", "Artist", "Audio URL", "Cover URL", "Duration"]];
    for (const t of tracks) {
      rows.push([
        `"${(t.title || "").replace(/"/g, '""')}"`,
        `"${(t.artist_display || "").replace(/"/g, '""')}"`,
        `"${t.audio_url || ""}"`,
        `"${t.cover_url || ""}"`,
        `"${t.duration || ""}"`,
      ]);
    }
    const csv = rows.map(r => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "Upper-Vibe-Media-Song-URLs.csv";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
    toast.success(`Exported ${tracks.length} song URLs as CSV.`);
  };

  const downloadSong = (track) => {
    const fileUrl = track.audio_url || track.audioUrl || track.songUrl || track.fileUrl || track.downloadUrl;
    if (!fileUrl) {
      toast.error("No audio file available for this track.");
      return;
    }
    const artist = track.artist_display || track.artist || "Upper Vibe Media";
    const title = track.title || "Untitled";
    const safeFileName = `${artist} - ${title}.mp3`.replace(/[\\/:*?"<>|]/g, "");
    const link = document.createElement("a");
    link.href = fileUrl;
    link.download = safeFileName;
    link.target = "_blank";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // AI Organize: scan selected (or all unlocked) tracks and fix missing metadata
  const aiOrganizeSongs = async () => {
    const toOrganize = (selCount > 0 ? filtered.filter((t) => selected.has(t.id)) : filtered)
      .filter((t) => !t.metadata_locked);

    if (toOrganize.length === 0) {
      toast.error("No unlocked tracks to organize. Deselect locked tracks or unlock them first.");
      return;
    }

    if (!confirm(`AI Organize ${toOrganize.length} unlocked track(s)? This will fill missing metadata using cover art and title. Locked tracks will be skipped.`)) return;

    setAiOrganizing(true);
    let done = 0;
    const errors = [];

    for (const track of toOrganize) {
      try {
        const res = await base44.functions.invoke("classifyTrack", { track });
        const cls = res.data?.classification;
        if (!cls) continue;

        // Map categories
        const catIds = (cls.suggested_categories || []).flatMap((name) => {
          const match = categories.find((c) => c.name.toLowerCase() === name.toLowerCase());
          return match ? [match.id] : [];
        });
        // Map artist
        const artistMatch = artists.find((a) => a.name.toLowerCase() === (cls.suggested_primary_artist || "").toLowerCase());
        const artistName = artistMatch?.name || cls.suggested_primary_artist || "Upper Vibe Media Collective";

        const updates = {
          frequency_type: "432hz",
          frequency_hz: 432,
          is_downloadable: true,
          artist_display: artistName,
        };
        if (!track.primary_artist_id && artistMatch) updates.primary_artist_id = artistMatch.id;
        if (!track.category_ids?.length && catIds.length) updates.category_ids = catIds;

        await base44.entities.Track.update(track.id, updates);
        done++;
      } catch (err) {
        errors.push(track.title);
      }
    }

    setAiOrganizing(false);
    toast.success(`AI Organized ${done} track(s)!${errors.length ? ` ${errors.length} failed.` : ""}`);
    setSelected(new Set());
    onRefresh();
  };

  // Count tracks missing cover art — admin-only debug warning
  const tracksMissingCovers = useMemo(
    () => tracks.filter((t) => !t.cover_url || t.cover_url.trim() === ""),
    [tracks]
  );

  return (
    <div>
      {/* Filters bar */}
      <div className="flex flex-wrap gap-3 mb-4">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search title or artist..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-lg bg-card/40 border border-border/30 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/40"
          />
        </div>
        <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}
          className="px-3 py-2 rounded-lg bg-card/40 border border-border/30 text-sm text-foreground focus:outline-none">
          <option value="all">All Categories</option>
          {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select value={filterTier} onChange={(e) => setFilterTier(e.target.value)}
          className="px-3 py-2 rounded-lg bg-card/40 border border-border/30 text-sm text-foreground focus:outline-none">
          <option value="all">All Tiers</option>
          {TIER_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>

        {/* AI Organize button */}
        <button
          onClick={aiOrganizeSongs}
          disabled={aiOrganizing}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold tracking-wide transition-all disabled:opacity-60"
          style={{ background: "rgba(0,229,255,0.08)", border: "1px solid rgba(0,229,255,0.2)", color: "#00E5FF" }}
        >
          {aiOrganizing
            ? <><Loader2 className="w-4 h-4 animate-spin" /> Organizing...</>
            : <><Brain className="w-4 h-4" /> AI Organize Songs</>}
        </button>

        {/* Export All Songs (ZIP) */}
        <button
          onClick={exportAllSongs}
          disabled={isExporting || tracks.length === 0}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold tracking-wide transition-all disabled:opacity-60"
          style={{ background: "rgba(74,222,128,0.08)", border: "1px solid rgba(74,222,128,0.2)", color: "#4ade80" }}
          title="Download all songs as a ZIP file"
        >
          <FileArchive className="w-4 h-4" />
          {isExporting ? (exportProgress?.label || "Exporting…") : "Export All Songs"}
        </button>

        {/* Export URL list as CSV */}
        <button
          onClick={exportSongUrlsCsv}
          disabled={tracks.length === 0}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold tracking-wide transition-all disabled:opacity-60"
          style={{ background: "rgba(155,126,255,0.08)", border: "1px solid rgba(155,126,255,0.2)", color: "#9B7EFF" }}
          title="Download a CSV of all song URLs"
        >
          <FileText className="w-4 h-4" /> Export URL List
        </button>
      </div>

      {/* Export progress banner */}
      {isExporting && (
        <div className="mb-4 px-4 py-3 rounded-xl flex items-center gap-3 text-sm"
          style={{ background: "rgba(74,222,128,0.06)", border: "1px solid rgba(74,222,128,0.2)" }}>
          <Loader2 className="w-4 h-4 text-green-400 animate-spin flex-shrink-0" />
          <span className="text-green-400 font-semibold">
            {exportProgress?.label || "Processing export…"}
          </span>
          <span className="text-green-400/50 text-xs ml-auto">Keep this page open until the download starts.</span>
        </div>
      )}

      {/* Selection bar */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <button onClick={toggleAll} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
            {selected.size === filtered.length && filtered.length > 0
              ? <CheckSquare className="w-4 h-4 text-primary" />
              : <Square className="w-4 h-4" />}
            {selCount > 0 ? `${selCount} selected` : `Select all (${filtered.length})`}
          </button>
          {selCount > 0 && (
            <button onClick={() => setSelected(new Set())} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
              <X className="w-3 h-3" /> Clear
            </button>
          )}
        </div>
        <p className="text-xs text-muted-foreground">{filtered.length} track{filtered.length !== 1 ? "s" : ""}</p>
      </div>

      {/* Bulk action toolbar */}
      <AnimatePresence>
        {selCount > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden mb-4"
          >
            <div className="p-4 rounded-xl border flex flex-wrap gap-2 items-center mb-2"
              style={{ background: "rgba(0,229,255,0.05)", border: "1px solid rgba(0,229,255,0.15)" }}>
              <span className="text-xs font-bold text-cyan-400 mr-2">{selCount} selected:</span>
              {[
                { key: "category", icon: Tag, label: "Set Category" },
                { key: "artist", icon: Users, label: "Set Artist" },
                { key: "mood", icon: Waves, label: "Add Mood Tag" },
                { key: "new_release", icon: Star, label: "New Release" },
                { key: "tier", icon: Lock, label: "Set Tier" },
                { key: "lock", icon: Shield, label: "Lock/Unlock" },
              ].map((action) => (
                <button
                  key={action.key}
                  onClick={() => { setBulkPanel(bulkPanel === action.key ? null : action.key); setBulkValue(""); }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${bulkPanel === action.key ? "bg-primary/20 border-primary/40 text-primary" : "bg-card/40 border-border/30 text-muted-foreground hover:text-foreground"}`}
                >
                  <action.icon className="w-3.5 h-3.5" /> {action.label}
                </button>
              ))}
              <button
                onClick={bulkDelete}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-destructive/10 border border-destructive/30 text-destructive hover:bg-destructive/20 transition-all ml-auto"
              >
                <Trash2 className="w-3.5 h-3.5" /> Delete Selected
              </button>
            </div>

            {/* Bulk value picker */}
            {bulkPanel && (
              <div className="flex items-center gap-3 p-3 rounded-xl bg-card/40 border border-border/30 mb-2">
                {bulkPanel === "category" && (
                  <select value={bulkValue} onChange={(e) => setBulkValue(e.target.value)}
                    className="flex-1 px-3 py-2 rounded-lg bg-card/40 border border-border/30 text-sm text-foreground focus:outline-none">
                    <option value="">Select category...</option>
                    {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                )}
                {bulkPanel === "artist" && (
                  <select value={bulkValue} onChange={(e) => setBulkValue(e.target.value)}
                    className="flex-1 px-3 py-2 rounded-lg bg-card/40 border border-border/30 text-sm text-foreground focus:outline-none">
                    <option value="">Select artist...</option>
                    {[...artists].sort((a, b) => a.name.localeCompare(b.name)).map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                  </select>
                )}
                {bulkPanel === "mood" && (
                  <select value={bulkValue} onChange={(e) => setBulkValue(e.target.value)}
                    className="flex-1 px-3 py-2 rounded-lg bg-card/40 border border-border/30 text-sm text-foreground focus:outline-none">
                    <option value="">Select mood tag...</option>
                    {MOOD_OPTIONS.map((m) => <option key={m} value={m}>{m}</option>)}
                  </select>
                )}
                {bulkPanel === "new_release" && (
                  <select value={bulkValue} onChange={(e) => setBulkValue(e.target.value)}
                    className="flex-1 px-3 py-2 rounded-lg bg-card/40 border border-border/30 text-sm text-foreground focus:outline-none">
                    <option value="">Select...</option>
                    <option value="yes">✅ Mark as New Release</option>
                    <option value="no">Remove New Release tag</option>
                  </select>
                )}
                {bulkPanel === "tier" && (
                  <select value={bulkValue} onChange={(e) => setBulkValue(e.target.value)}
                    className="flex-1 px-3 py-2 rounded-lg bg-card/40 border border-border/30 text-sm text-foreground focus:outline-none">
                    <option value="">Select tier...</option>
                    {TIER_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                )}
                {bulkPanel === "lock" && (
                  <select value={bulkValue} onChange={(e) => setBulkValue(e.target.value)}
                    className="flex-1 px-3 py-2 rounded-lg bg-card/40 border border-border/30 text-sm text-foreground focus:outline-none">
                    <option value="">Select...</option>
                    <option value="yes">🔒 Lock Metadata</option>
                    <option value="no">🔓 Unlock Metadata</option>
                  </select>
                )}
                <button
                  onClick={applyBulk}
                  disabled={!bulkValue}
                  className="px-5 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-40 hover:bg-primary/90 transition-all"
                >
                  Apply to {selCount}
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Track table */}
      <div className="rounded-xl border border-border/30 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/30 bg-muted/20">
                <th className="px-3 py-3 w-8"></th>
                <th className="text-left px-4 py-3 text-[10px] font-bold tracking-widest uppercase text-muted-foreground">Cover / Title</th>
                <th className="text-left px-4 py-3 text-[10px] font-bold tracking-widest uppercase text-muted-foreground hidden md:table-cell">Primary Artist</th>
                <th className="text-left px-4 py-3 text-[10px] font-bold tracking-widest uppercase text-muted-foreground hidden lg:table-cell">Display Name</th>
                <th className="text-left px-4 py-3 text-[10px] font-bold tracking-widest uppercase text-muted-foreground hidden lg:table-cell">Category</th>
                <th className="text-left px-4 py-3 text-[10px] font-bold tracking-widest uppercase text-muted-foreground hidden xl:table-cell">Hz</th>
                <th className="text-left px-4 py-3 text-[10px] font-bold tracking-widest uppercase text-muted-foreground hidden xl:table-cell">Mood Tags</th>
                <th className="text-left px-4 py-3 text-[10px] font-bold tracking-widest uppercase text-muted-foreground hidden xl:table-cell">DL</th>
                <th className="text-left px-4 py-3 text-[10px] font-bold tracking-widest uppercase text-muted-foreground hidden xl:table-cell">Locked</th>
                <th className="text-right px-4 py-3 text-[10px] font-bold tracking-widest uppercase text-muted-foreground">Edit</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((track) => {
                const isSelected = selected.has(track.id);
                const primaryArtistName = artistMap[track.primary_artist_id] || "—";
                const displayName = track.artist_display || primaryArtistName;
                const categoryNames = (track.category_ids || []).map((id) => catMap[id]).filter(Boolean);

                return (
                  <tr key={track.id}
                    className={`border-b border-border/20 transition-colors ${isSelected ? "bg-primary/5" : track.metadata_locked ? "bg-yellow-400/5" : "hover:bg-muted/10"}`}
                    onClick={() => toggleSelect(track.id)}
                    style={{ cursor: "pointer" }}
                  >
                    <td className="px-3 py-3">
                      {isSelected
                        ? <CheckSquare className="w-4 h-4 text-primary" />
                        : <Square className="w-4 h-4 text-muted-foreground/40" />}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <CoverImage
                          src={track.cover_url}
                          alt={track.title}
                          width={36}
                          height={36}
                          className="w-9 h-9 rounded-lg overflow-hidden flex-shrink-0"
                          eager={false}
                          iconClassName="w-4 h-4"
                          fallbackOpacityClass="text-muted-foreground/40"
                          fallbackBgClass="bg-muted/50"
                        />
                        <div className="min-w-0">
                          <p className="font-medium text-foreground truncate max-w-[140px]">{track.title}</p>
                          {track.tiktok_promoted && <p className="text-[9px] font-black uppercase tracking-wider text-cyan-400">TikTok Feed</p>}
                          {track.duration && <p className="text-[10px] text-muted-foreground">{track.duration}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <span className="text-xs text-foreground/70 truncate block max-w-[120px]">
                        {primaryArtistName}
                      </span>
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      <span className={`text-xs truncate block max-w-[120px] ${displayName !== primaryArtistName && primaryArtistName !== "—" ? "text-yellow-400" : "text-muted-foreground"}`}>
                        {displayName}
                        {displayName !== primaryArtistName && primaryArtistName !== "—" && (
                          <span className="ml-1 text-[9px] text-yellow-400/60">(mismatch)</span>
                        )}
                      </span>
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      <div className="flex flex-wrap gap-1 max-w-[140px]">
                        {categoryNames.slice(0, 2).map((c) => (
                          <span key={c} className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-primary/10 text-primary/70">{c}</span>
                        ))}
                        {categoryNames.length > 2 && <span className="text-[9px] text-muted-foreground">+{categoryNames.length - 2}</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden xl:table-cell">
                      <span className="text-[10px] font-bold text-cyan-400/80">432 Hz</span>
                    </td>
                    <td className="px-4 py-3 hidden xl:table-cell">
                      <div className="flex flex-wrap gap-1 max-w-[120px]">
                        {(track.mood_tags || []).slice(0, 2).map((m) => (
                          <span key={m} className="text-[9px] px-1.5 py-0.5 rounded-full bg-muted/50 text-muted-foreground">{m}</span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden xl:table-cell">
                      {track.is_downloadable
                        ? <span className="text-[9px] font-bold text-yellow-400">Premium</span>
                        : <span className="text-muted-foreground/30 text-xs">—</span>}
                    </td>
                    <td className="px-4 py-3 hidden xl:table-cell">
                      {track.metadata_locked
                        ? <Shield className="w-3.5 h-3.5 text-yellow-400" />
                        : <span className="text-muted-foreground/20 text-xs">—</span>}
                    </td>
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-1 justify-end">
                        {/* Add to DJ Playlist */}
                        {djPlaylists.length > 0 && (
                          <div className="relative">
                            <button
                              onClick={() => setDjMenuTrackId(djMenuTrackId === track.id ? null : track.id)}
                              title="Add to DJ Playlist"
                              className={`p-1.5 rounded-lg transition-all ${djTrackIds.has(track.id) ? "text-cyan-400" : "text-muted-foreground hover:text-cyan-400"}`}
                            >
                              <Disc3 className="w-3.5 h-3.5" />
                            </button>
                            {djMenuTrackId === track.id && (
                              <div className="absolute right-0 top-7 z-30 bg-card border border-border/40 rounded-xl shadow-xl min-w-[160px] py-1">
                                <p className="text-[10px] font-bold text-muted-foreground px-3 pt-1 pb-1.5 uppercase tracking-wider">Add to playlist</p>
                                {djPlaylists.map(pl => (
                                  <button
                                    key={pl.id}
                                    onClick={() => addToDJPlaylist(track.id, pl.id)}
                                    className="w-full flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-muted/40 text-left transition-colors"
                                  >
                                    {(pl.trackIds || []).includes(track.id)
                                      ? <CheckCheck className="w-3 h-3 text-cyan-400 flex-shrink-0" />
                                      : <Plus className="w-3 h-3 text-muted-foreground flex-shrink-0" />}
                                    <span className="truncate">{pl.djPlaylistName}</span>
                                    {pl.isActive && <span className="ml-auto text-[9px] text-cyan-400 font-bold">LIVE</span>}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                        <button onClick={() => toggleFeatured(track)} title="Toggle featured"
                          className={`p-1.5 rounded-lg transition-all ${track.is_featured ? "text-secondary" : "text-muted-foreground hover:text-secondary"}`}>
                          <Star className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => toggleTikTok(track)} title="Toggle TikTok Feed"
                          className={`p-1.5 rounded-lg transition-all ${track.tiktok_promoted ? "text-cyan-400" : "text-muted-foreground hover:text-cyan-400"}`}>
                          <Music4 className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => toggleLock(track)} title={track.metadata_locked ? "Unlock metadata" : "Lock metadata"}
                          className={`p-1.5 rounded-lg transition-all ${track.metadata_locked ? "text-yellow-400" : "text-muted-foreground hover:text-yellow-400"}`}>
                          {track.metadata_locked ? <Shield className="w-3.5 h-3.5" /> : <ShieldOff className="w-3.5 h-3.5" />}
                        </button>
                        <button onClick={() => toggleStatus(track)} title="Toggle status"
                          className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground transition-all">
                          {track.status === "published" ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                        </button>
                        <button
                          onClick={() => downloadSong(track)}
                          title={track.audio_url ? "Download audio file" : "No audio file available"}
                          disabled={!track.audio_url}
                          className={`p-1.5 rounded-lg transition-all ${track.audio_url ? "text-muted-foreground hover:text-green-400" : "text-muted-foreground/20 cursor-not-allowed"}`}
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => onEdit(track)}
                          className="p-1.5 rounded-lg text-muted-foreground hover:text-primary transition-all">
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => deleteTrack(track)}
                          className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive transition-all">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="py-12 text-center text-muted-foreground text-sm">No tracks found</div>
          )}
          {tracksMissingCovers.length > 0 && (
            <div className="px-4 py-3 mb-2 rounded-xl flex items-center gap-3"
              style={{ background: "rgba(255,180,0,0.06)", border: "1px solid rgba(255,180,0,0.18)" }}>
              <AlertTriangle className="w-4 h-4 text-yellow-400 flex-shrink-0" />
              <div>
                <span className="text-xs font-bold text-yellow-400">
                  {tracksMissingCovers.length} track{tracksMissingCovers.length !== 1 ? "s" : ""} missing cover art
                </span>
                <p className="text-[10px] text-yellow-400/50 mt-0.5">
                  {tracksMissingCovers.slice(0, 5).map((t) => t.title).join(", ")}
                  {tracksMissingCovers.length > 5 ? ` +${tracksMissingCovers.length - 5} more` : ""}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}