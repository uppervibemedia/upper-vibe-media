import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { GraduationCap, Download, RefreshCw, ChevronDown, ChevronUp, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";

export default function AcademyImporter({ onImported }) {
  const [url, setUrl] = useState("");
  const [maxResults, setMaxResults] = useState(50);
  const [order, setOrder] = useState("newest");
  const [skipDuplicates, setSkipDuplicates] = useState(true);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const detectUrlType = (u) => {
    if (!u) return "";
    if (u.match(/[?&]list=/)) return "playlist";
    if (u.match(/(?:watch\?v=|youtu\.be\/|shorts\/)/)) return "video";
    if (u.match(/youtube\.com\/(channel\/|c\/|@)/)) return "channel";
    return "unknown";
  };

  const urlType = detectUrlType(url);

  const handleImport = async () => {
    if (!url.trim()) return;
    setLoading(true);
    setResult(null);
    setError(null);
    try {
      const res = await base44.functions.invoke("academyImport", {
        url: url.trim(),
        maxResults,
        order,
        skipDuplicates,
      });
      setResult(res.data);
      if (res.data?.imported > 0) onImported?.();
    } catch (e) {
      setError(e?.response?.data?.error || e.message || "Import failed");
    }
    setLoading(false);
  };

  const TYPE_COLORS = {
    playlist: { bg: "rgba(212,168,67,0.1)", border: "rgba(212,168,67,0.3)", color: "#D4A843", label: "Playlist" },
    video: { bg: "rgba(0,229,255,0.1)", border: "rgba(0,229,255,0.3)", color: "#00E5FF", label: "Single Video" },
    channel: { bg: "rgba(155,126,255,0.1)", border: "rgba(155,126,255,0.3)", color: "#9B7EFF", label: "Channel" },
  };
  const typeStyle = TYPE_COLORS[urlType];

  return (
    <div className="rounded-2xl p-6" style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.07)" }}>
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: "rgba(212,168,67,0.12)", border: "1px solid rgba(212,168,67,0.25)" }}>
          <GraduationCap className="w-5 h-5 text-yellow-400" />
        </div>
        <div>
          <h3 className="font-heading font-bold text-base text-white">Upper Vibe Academy Import</h3>
          <p className="text-xs text-white/35">Paste a YouTube playlist, channel, or single video URL</p>
        </div>
      </div>

      <div className="flex items-start gap-2 p-3 rounded-xl mb-5 text-xs text-white/50"
        style={{ background: "rgba(212,168,67,0.04)", border: "1px solid rgba(212,168,67,0.1)" }}>
        <span className="text-yellow-400 font-bold flex-shrink-0">Tip:</span>
        Create a YouTube playlist called "Upper Vibe Academy", paste the playlist URL below, and click Import. Videos default to Premium (60-second free preview). Use Sync to pull new videos later.
      </div>

      <div className="mb-4">
        <label className="text-xs font-semibold tracking-wider uppercase text-white/40 mb-1.5 block">YouTube URL</label>
        <div className="relative">
          <input
            value={url}
            onChange={(e) => { setUrl(e.target.value); setResult(null); setError(null); }}
            placeholder="https://www.youtube.com/playlist?list=... or single video URL"
            className="w-full px-4 py-3 rounded-xl text-sm text-white placeholder:text-white/20 focus:outline-none pr-28"
            style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}
          />
          {typeStyle && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[9px] font-black tracking-wider uppercase px-2 py-0.5 rounded-full"
              style={{ background: typeStyle.bg, border: `1px solid ${typeStyle.border}`, color: typeStyle.color }}>
              {typeStyle.label}
            </span>
          )}
        </div>
      </div>

      <button onClick={() => setShowAdvanced(!showAdvanced)}
        className="flex items-center gap-1.5 text-xs text-white/30 hover:text-white/60 transition-colors mb-3">
        {showAdvanced ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        Advanced options
      </button>

      <AnimatePresence>
        {showAdvanced && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden mb-4">
            <div className="grid grid-cols-2 gap-3 pt-1 pb-2">
              <div>
                <label className="text-xs font-semibold tracking-wider uppercase text-white/40 mb-1.5 block">Max videos</label>
                <input type="number" min={1} max={200} value={maxResults}
                  onChange={(e) => setMaxResults(parseInt(e.target.value) || 50)}
                  className="w-full px-3 py-2 rounded-lg text-sm text-white focus:outline-none"
                  style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }} />
              </div>
              <div>
                <label className="text-xs font-semibold tracking-wider uppercase text-white/40 mb-1.5 block">Import order</label>
                <select value={order} onChange={(e) => setOrder(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg text-sm text-white focus:outline-none"
                  style={{ background: "rgba(20,20,40,1)", border: "1px solid rgba(255,255,255,0.1)" }}>
                  <option value="newest">Newest first</option>
                  <option value="oldest">Oldest first</option>
                </select>
              </div>
              <div className="col-span-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={skipDuplicates} onChange={(e) => setSkipDuplicates(e.target.checked)} className="accent-yellow-400 w-4 h-4" />
                  <span className="text-sm text-white/60">Skip duplicates (recommended)</span>
                </label>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex gap-2 flex-wrap">
        <button onClick={handleImport} disabled={loading || !url.trim()}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all disabled:opacity-40 hover:brightness-110"
          style={{ background: "linear-gradient(135deg,#D4A843,#F0C060)", color: "#000" }}>
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
          {loading ? "Importing..." : "Import Videos"}
        </button>
        <button onClick={handleImport} disabled={loading || !url.trim()}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all disabled:opacity-40 hover:brightness-110"
          style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.7)" }}>
          <RefreshCw className="w-4 h-4" /> Sync Latest
        </button>
      </div>

      <AnimatePresence>
        {result && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="mt-4 flex items-start gap-3 p-4 rounded-xl"
            style={{ background: "rgba(212,168,67,0.06)", border: "1px solid rgba(212,168,67,0.2)" }}>
            <CheckCircle2 className="w-4 h-4 text-yellow-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-bold text-white">{result.message}</p>
              <p className="text-xs text-white/40 mt-0.5">
                {result.imported} imported · {result.skipped} skipped · {result.total} total found
              </p>
            </div>
          </motion.div>
        )}
        {error && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="mt-4 flex items-start gap-3 p-4 rounded-xl"
            style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.2)" }}>
            <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-300">{error}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}