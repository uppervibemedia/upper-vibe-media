import React, { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts";
import { Users, Eye, Music, Download, Mail, Crown, TrendingUp, Play } from "lucide-react";

const DATE_FILTERS = [
  { label: "Today",   days: 1 },
  { label: "7 Days",  days: 7 },
  { label: "30 Days", days: 30 },
  { label: "All Time", days: 0 },
];

function daysAgo(n) {
  if (n === 0) return null;
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

function StatCard({ icon: Icon, label, value, color = "#00C9E0" }) {
  return (
    <div
      className="rounded-2xl p-5 flex items-center gap-4"
      style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}
    >
      <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ background: `${color}18`, border: `1px solid ${color}30` }}>
        <Icon className="w-5 h-5" style={{ color }} />
      </div>
      <div>
        <p className="text-2xl font-heading font-black text-white">{value ?? "—"}</p>
        <p className="text-xs text-white/40 mt-0.5">{label}</p>
      </div>
    </div>
  );
}

function TopList({ title, items, keyField, valueField, valueLabel }) {
  if (!items?.length) return (
    <div className="rounded-2xl p-5" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
      <p className="text-sm font-bold text-white/60 mb-3">{title}</p>
      <p className="text-xs text-white/25">No data yet</p>
    </div>
  );
  return (
    <div className="rounded-2xl p-5" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
      <p className="text-sm font-bold text-white mb-4">{title}</p>
      <div className="space-y-2.5">
        {items.slice(0, 8).map((item, i) => (
          <div key={i} className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-[10px] font-black text-white/25 w-4 flex-shrink-0">{i + 1}</span>
              <p className="text-xs text-white/70 truncate">{item[keyField] || "Unknown"}</p>
            </div>
            <span className="text-xs font-bold text-white/50 flex-shrink-0">
              {item[valueField]} {valueLabel}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function AnalyticsDashboard() {
  const [filterDays, setFilterDays] = useState(7);
  const [events,     setEvents]     = useState([]);
  const [streams,    setStreams]     = useState([]);
  const [subs,       setSubs]       = useState([]);
  const [loading,    setLoading]    = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const since = daysAgo(filterDays);
      // We fetch all and filter client-side since entity filter doesn't support date gte easily
      const [allEvents, allStreams, allSubs] = await Promise.all([
        base44.entities.AnalyticsEvent.list("-created_date", 2000),
        base44.entities.SongStream.list("-created_date", 1000),
        base44.entities.EmailSubscriber.list("-created_date", 500),
      ]);

      // Exclude admin-generated events (is_admin flag or legacy admin records)
      const noAdmin = (arr) => arr.filter(r => r.is_admin !== true);

      const filter = since
        ? (arr) => noAdmin(arr).filter(r => r.created_date >= since)
        : (arr) => noAdmin(arr);

      setEvents(filter(allEvents));
      setStreams(filter(allStreams));
      setSubs(filter(allSubs));
    } catch (e) {
      console.warn("Analytics load error:", e);
    }
    setLoading(false);
  }, [filterDays]);

  useEffect(() => { load(); }, [load]);

  // ── Derived stats ─────────────────────────────────────────────────────────
  const pageViews   = events.filter(e => e.event_type === "page_view").length;
  const songPlays   = events.filter(e => e.event_type === "song_play").length;
  const dlClicks    = events.filter(e => e.event_type === "download_click").length;
  const premClicks  = events.filter(e => e.event_type === "premium_click").length;
  const emailSigns  = events.filter(e => e.event_type === "email_signup").length;
  const vizViews    = events.filter(e => e.event_type === "visualizer_view").length;
  const completions = events.filter(e => e.event_type === "song_complete").length;

  // Unique visitors by session ID
  const uniqueSessions = new Set(events.map(e => e.anonymous_session_id || e.user_id).filter(Boolean));
  const uniqueVisitors = uniqueSessions.size;

  // Traffic sources
  const sourceMap = {};
  events.filter(e => e.event_type === "page_view").forEach(e => {
    const src = e.traffic_source || "direct";
    sourceMap[src] = (sourceMap[src] || 0) + 1;
  });
  const topSources = Object.entries(sourceMap)
    .map(([source, count]) => ({ source, count }))
    .sort((a, b) => b.count - a.count);

  // Most played songs
  const songPlayMap = {};
  events.filter(e => e.event_type === "song_play" && e.song_title).forEach(e => {
    const key = e.song_title;
    if (!songPlayMap[key]) songPlayMap[key] = { song_title: key, artist_name: e.artist_name, count: 0 };
    songPlayMap[key].count++;
  });
  const topSongs = Object.values(songPlayMap).sort((a, b) => b.count - a.count);

  // Most completed songs
  const completedMap = {};
  events.filter(e => e.event_type === "song_complete" && e.song_title).forEach(e => {
    const key = e.song_title;
    if (!completedMap[key]) completedMap[key] = { song_title: key, count: 0 };
    completedMap[key].count++;
  });
  const topCompleted = Object.values(completedMap).sort((a, b) => b.count - a.count);

  // Top pages
  const pageMap = {};
  events.filter(e => e.event_type === "page_view" && e.page_url).forEach(e => {
    const key = e.page_url;
    pageMap[key] = (pageMap[key] || 0) + 1;
  });
  const topPages = Object.entries(pageMap)
    .map(([page_url, count]) => ({ page_url, count }))
    .sort((a, b) => b.count - a.count);

  // Daily traffic chart (last 14 days)
  const dailyMap = {};
  const now = new Date();
  for (let i = 13; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const key = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    dailyMap[key] = { date: key, views: 0, plays: 0 };
  }
  events.forEach(e => {
    const d = new Date(e.created_date);
    const key = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    if (dailyMap[key]) {
      if (e.event_type === "page_view") dailyMap[key].views++;
      if (e.event_type === "song_play")  dailyMap[key].plays++;
    }
  });
  const dailyData = Object.values(dailyMap);

  // Device breakdown
  const deviceMap = {};
  events.filter(e => e.event_type === "page_view").forEach(e => {
    const d = e.device_type || "desktop";
    deviceMap[d] = (deviceMap[d] || 0) + 1;
  });
  const topDevices = Object.entries(deviceMap).map(([device_type, count]) => ({ device_type, count }));

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="w-6 h-6 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Date filter */}
      <div className="flex gap-2 flex-wrap">
        {DATE_FILTERS.map(f => (
          <button
            key={f.days}
            onClick={() => setFilterDays(f.days)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              filterDays === f.days
                ? "text-black"
                : "text-white/50 hover:text-white/70"
            }`}
            style={filterDays === f.days
              ? { background: "linear-gradient(135deg,#00A8C0,#00D4EE)" }
              : { background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }
            }
          >
            {f.label}
          </button>
        ))}
        <button
          onClick={load}
          className="px-4 py-2 rounded-xl text-xs font-bold text-white/40 hover:text-white/60 transition-all"
          style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}
        >
          Refresh
        </button>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard icon={Eye}       label="Page Views"      value={pageViews}      color="#00C9E0" />
        <StatCard icon={Users}     label="Unique Visitors" value={uniqueVisitors}  color="#A78BFA" />
        <StatCard icon={Play}      label="Song Plays"      value={songPlays}       color="#34D399" />
        <StatCard icon={Music}     label="Completions"     value={completions}     color="#60A5FA" />
        <StatCard icon={Download}  label="Download Clicks" value={dlClicks}        color="#D4A843" />
        <StatCard icon={Crown}     label="Plus Clicks"     value={premClicks}      color="#F59E0B" />
        <StatCard icon={Mail}      label="Email Signups"   value={emailSigns}      color="#EC4899" />
        <StatCard icon={TrendingUp} label="Visualizer Views" value={vizViews}     color="#00C9E0" />
      </div>

      {/* Daily chart */}
      <div
        className="rounded-2xl p-6"
        style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}
      >
        <p className="text-sm font-bold text-white mb-5">Daily Traffic (last 14 days)</p>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={dailyData}>
            <XAxis dataKey="date" tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 10 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 10 }} axisLine={false} tickLine={false} />
            <Tooltip
              contentStyle={{ background: "rgba(8,8,22,0.95)", border: "1px solid rgba(0,229,255,0.2)", borderRadius: 12 }}
              labelStyle={{ color: "rgba(255,255,255,0.6)", fontSize: 11 }}
              itemStyle={{ color: "#00C9E0", fontSize: 11 }}
            />
            <Line type="monotone" dataKey="views" stroke="#00C9E0" strokeWidth={2} dot={false} name="Views" />
            <Line type="monotone" dataKey="plays" stroke="#D4A843" strokeWidth={2} dot={false} name="Plays" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Song plays chart */}
      {topSongs.length > 0 && (
        <div
          className="rounded-2xl p-6"
          style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}
        >
          <p className="text-sm font-bold text-white mb-5">Top 8 Most Played Songs</p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={topSongs.slice(0, 8)} layout="vertical">
              <XAxis type="number" tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="song_title" tick={{ fill: "rgba(255,255,255,0.5)", fontSize: 10 }} axisLine={false} tickLine={false} width={120} />
              <Tooltip
                contentStyle={{ background: "rgba(8,8,22,0.95)", border: "1px solid rgba(0,229,255,0.2)", borderRadius: 12 }}
                itemStyle={{ color: "#00C9E0", fontSize: 11 }}
              />
              <Bar dataKey="count" fill="#00C9E0" radius={[0, 6, 6, 0]} name="Plays" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Grid of top lists */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        <TopList title="Top Traffic Sources"  items={topSources}   keyField="source"      valueField="count" valueLabel="visits" />
        <TopList title="Most Completed Songs" items={topCompleted} keyField="song_title"  valueField="count" valueLabel="✓" />
        <TopList title="Top Pages"            items={topPages}     keyField="page_url"    valueField="count" valueLabel="views" />
        <TopList title="Devices"              items={topDevices}   keyField="device_type" valueField="count" valueLabel="visits" />
      </div>

      {/* Email subscribers table */}
      <div
        className="rounded-2xl p-6"
        style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}
      >
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm font-bold text-white">Email Subscribers ({subs.length})</p>
        </div>
        {subs.length === 0 ? (
          <p className="text-xs text-white/25">No subscribers in this period.</p>
        ) : (
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {subs.map(s => (
              <div key={s.id} className="flex items-center justify-between gap-3 text-xs py-1.5 border-b border-white/5">
                <span className="text-white/70">{s.email}</span>
                <span className="text-white/25 flex-shrink-0">{s.source_page}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}