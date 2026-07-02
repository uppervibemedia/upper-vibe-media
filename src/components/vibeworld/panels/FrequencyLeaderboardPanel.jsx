import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Trophy, Crown } from "lucide-react";
import { frequencyTitle, loadFrequencyLeaderboard } from "@/lib/frequencyScoreService";

function AvatarMark({ row }) {
  const name = row?.username || "Vibe User";
  if (row?.avatar_image_url) return <img src={row.avatar_image_url} alt="" className="w-9 h-9 rounded-full object-cover" />;
  return <div className="w-9 h-9 rounded-full flex items-center justify-center font-black text-xs" style={{ background: "linear-gradient(135deg,#00D4F0,#7C3AED)", color: "#fff" }}>{name.slice(0, 2).toUpperCase()}</div>;
}

export default function FrequencyLeaderboardPanel({ open, onClose, user, isMobile, mobileLayout }) {
  const [rows, setRows] = useState([]);
  const [own, setOwn] = useState(null);
  const [ownRank, setOwnRank] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    loadFrequencyLeaderboard(user?.id).then(({ top, own, ownRank }) => {
      setRows(top || []); setOwn(own); setOwnRank(ownRank);
    }).finally(() => setLoading(false));
  }, [open, user?.id]);

  return <AnimatePresence>{open && (
    <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 18 }} className="fixed bottom-0 rounded-t-3xl overflow-hidden flex flex-col" data-camera-scroll-lock="true" style={{ zIndex: 92, left: isMobile ? "env(safe-area-inset-left, 0px)" : "50%", right: isMobile ? "env(safe-area-inset-right, 0px)" : "auto", transform: isMobile ? "none" : "translateX(-50%)", width: isMobile ? "auto" : "min(760px, calc(100vw - 48px))", height: isMobile ? "100dvh" : "78vh", background: "linear-gradient(180deg,rgba(5,8,22,0.98),rgba(8,4,24,0.98))", border: "1px solid rgba(0,229,255,0.24)", borderBottom: "none", boxShadow: "0 -18px 70px rgba(0,0,0,0.65),0 0 44px rgba(0,229,255,0.12)", paddingBottom: isMobile && mobileLayout ? mobileLayout.sa.bottom : 0 }}>
      <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-white/10">
        <div className="flex items-center gap-3 min-w-0"><div className="w-11 h-11 rounded-2xl flex items-center justify-center" style={{ background: "rgba(0,229,255,0.12)", color: "#00E5FF", border: "1px solid rgba(0,229,255,0.24)" }}><Trophy className="w-5 h-5" /></div><div className="min-w-0"><h3 className="font-heading font-black text-white text-xl leading-tight">Frequency Leaderboard</h3><p className="text-xs text-white/45">All-Time Upper Vibe City Leaders</p></div></div>
        <button onClick={onClose} className="w-11 h-11 rounded-full flex items-center justify-center" style={{ background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.72)", touchAction: "manipulation" }}><X className="w-5 h-5" /></button>
      </div>
      <div className="px-5 pt-4 flex gap-2"><button className="px-4 py-2 rounded-full text-[10px] font-black tracking-wider" style={{ background: "linear-gradient(135deg,#00B8D4,#7C3AED)", color: "#fff" }}>All-Time</button><button className="px-4 py-2 rounded-full text-[10px] font-black tracking-wider" style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.38)" }}>This Week Soon</button><button className="px-4 py-2 rounded-full text-[10px] font-black tracking-wider" style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.38)" }}>Today Soon</button></div>
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2">
        {loading ? <div className="h-32 flex items-center justify-center"><div className="w-7 h-7 border-2 border-cyan-300/20 border-t-cyan-300 rounded-full animate-spin" /></div> : rows.length ? rows.map((row, idx) => <div key={row.id || row.user_id} className="flex items-center gap-3 rounded-2xl px-3 py-3" style={{ background: idx < 3 ? "rgba(0,229,255,0.075)" : "rgba(255,255,255,0.04)", border: idx < 3 ? "1px solid rgba(0,229,255,0.18)" : "1px solid rgba(255,255,255,0.07)" }}><div className="w-7 text-center font-heading font-black" style={{ color: idx === 0 ? "#FFD36E" : "rgba(255,255,255,0.56)" }}>{idx + 1}</div><AvatarMark row={row} /><div className="min-w-0 flex-1"><p className="font-black text-sm text-white truncate">{row.username || "Vibe User"}</p><p className="text-[10px] font-black uppercase tracking-wider" style={{ color: idx === 0 ? "#FFD36E" : "#00E5FF" }}>{frequencyTitle(row.all_time_score)}</p></div><div className="text-right"><p className="font-heading font-black text-lg text-white">{(row.all_time_score || 0).toLocaleString()}</p><p className="text-[9px] text-white/35 uppercase font-black">Frequency Score</p></div>{idx === 0 && <Crown className="w-4 h-4 text-yellow-300" />}</div>) : <p className="text-center text-sm text-white/45 py-10">No Frequency Score leaders yet.</p>}
      </div>
      {own && ownRank > 10 && <div className="mx-4 mb-4 rounded-2xl p-4" style={{ background: "rgba(181,140,255,0.08)", border: "1px solid rgba(181,140,255,0.18)" }}><p className="text-[10px] font-black uppercase tracking-wider text-white/45">Your Rank</p><p className="font-heading font-black text-white mt-1">#{ownRank} — {(own.all_time_score || 0).toLocaleString()} Frequency Score</p><p className="text-xs" style={{ color: "#B58CFF" }}>{frequencyTitle(own.all_time_score)}</p></div>}
    </motion.div>
  )}</AnimatePresence>;
}