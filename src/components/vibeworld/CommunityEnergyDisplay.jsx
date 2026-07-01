import React, { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Activity, Sparkles } from "lucide-react";
import { base44 } from "@/api/base44Client";

export default function CommunityEnergyDisplay({ activeUsers = [], isMobile, mobileLayout, hidden }) {
  const [activeSymbols, setActiveSymbols] = useState([]);

  useEffect(() => {
    if (hidden) return;
    let alive = true;
    const load = () => {
      base44.entities.SacredSymbolActivation
        .filter({ expires_at: { $gte: new Date().toISOString() } }, "-activated_at", 50)
        .then((records) => {
          if (!alive) return;
          const unique = [...new Map((records || []).map((r) => [r.symbol_id, r])).values()];
          setActiveSymbols(unique);
        })
        .catch(() => alive && setActiveSymbols([]));
    };
    load();
    const id = setInterval(load, 15000);
    return () => { alive = false; clearInterval(id); };
  }, [hidden]);

  const communityLevel = useMemo(() => {
    const onlineBoost = Math.min(30, (activeUsers?.length || 0) * 4);
    return Math.min(100, 18 + onlineBoost + activeSymbols.length * 16);
  }, [activeUsers?.length, activeSymbols.length]);

  if (hidden) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className="absolute z-[67] pointer-events-none rounded-2xl overflow-hidden"
      style={{
        top: isMobile && mobileLayout ? mobileLayout.sa.top + 118 : 112,
        right: isMobile ? 10 : 18,
        width: isMobile ? 168 : 210,
        background: "rgba(5,6,18,0.62)",
        border: "1px solid rgba(0,229,255,0.18)",
        backdropFilter: "blur(16px)",
        boxShadow: "0 12px 34px rgba(0,0,0,0.35), 0 0 24px rgba(0,229,255,0.08)",
      }}
    >
      <div className="px-3 py-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <Sparkles className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "#00E5FF" }} />
            <p className="text-[9px] font-black uppercase tracking-[0.16em] truncate" style={{ color: "rgba(232,252,255,0.82)" }}>Frequency Energy</p>
          </div>
          <div className="flex items-center gap-1 text-[10px] font-black" style={{ color: "#FFD36E" }}>
            <Activity className="w-3 h-3" /> {activeSymbols.length}
          </div>
        </div>
        <div className="h-1.5 mt-2 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.08)" }}>
          <div className="h-full rounded-full" style={{ width: `${communityLevel}%`, background: "linear-gradient(90deg,#00E5FF,#9B7EFF,#FFD36E)", boxShadow: "0 0 12px rgba(0,229,255,0.4)" }} />
        </div>
        <p className="mt-1.5 text-[9px] leading-tight" style={{ color: "rgba(255,255,255,0.48)" }}>{activeSymbols.length} sacred symbol{activeSymbols.length === 1 ? "" : "s"} active now</p>
      </div>
    </motion.div>
  );
}