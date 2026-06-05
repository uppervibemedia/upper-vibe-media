import React, { useState, useEffect, useCallback, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts";
import { Users, Eye, Music, Download, Mail, Crown, TrendingUp, Play, Bug, ChevronDown, ChevronUp } from "lucide-react";

// ─────────────────────────────────────────────────────────────────────────────
// Date helpers
// ─────────────────────────────────────────────────────────────────────────────
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

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────
function StatCard({ icon: Icon, label, value, sub, color = "#00C9E0" }) {
  return (
    <div className="rounded-2xl p-5 flex items-center gap-4"
      style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
      <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ background: `${color}18`, border: `1px solid ${color}30` }}>
        <Icon className="w-5 h-5" style={{ color }} />
      </div>
      <div>
        <p className="text-2xl font-heading font-black text-white">{value ?? "—"}</p>
        <p className="text-xs text-white/40 mt-0.5">{label}</p>
        {sub && <p className="text-[10px] text-white/25 mt-0.5">{sub}</p>}
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

// ─────────────────────────────────────────────────────────────────────────────
// Debug Panel
// ─────────────────────────────────────────────────────────────────────────────
function DebugPanel({ events }) {
  const [open, setOpen] = useState(false);
  const recent = events.slice(0, 50);
  return (
    <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid rgba(255,100,100,0.2)" }}>
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-5 py-3"
        style={{ background: "rgba(255,60,60,0.05)" }}
      >
        <div className="flex items-center gap-2">
          <Bug className="w-4 h-4 text-red-400/60" />
          <p className="text-sm font-bold text-white/60">Analytics Debug — Last 50 Raw Events</p>
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-white/30" /> : <ChevronDown className="w-4 h-4 text-white/30" />}
      </button>

      {open && (
        <div className="overflow-x-auto">
          {recent.length === 0 ? (
            <p className="px-5 py-4 text-xs text-white/30">No events in current filter window.</p>
          ) : (
            <table className="w-full text-[10px] text-white/60" style={{ minWidth: 900 }}>
              <thead>
                <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                  {["Type","Date/Time","Visitor ID","Session ID","Page","Song","Source","Device","is_admin"].map(h => (
                    <th key={h} className="px-3 py-2 text-left font-bold text-white/30 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {recent.map((e, i) => (
                  <tr key={e.id || i} style={{ borderBottom: "1px solid rgba(255,255,255,0.03)" }}
                    className="hover:bg-white/[0.02]">
                    <td className="px-3 py-1.5 font-bold whitespace-nowrap"
                      style={{ color: e.event_type.includes("song") ? "#34D399" : e.event_type === "page_view" ? "#60A5FA" : "#D4A843" }}>
                      {e.event_type}
                    </td>
                    <td className="px-3 py-1.5 whitespace-nowrap text-white/40">
                      {e.created_date ? new Date(e.created_date).toLocaleString() : "—"}
                    </td>
                    <td className="px-3 py-1.5 font-mono max-w-[100px] truncate" title={e.user_id}>{e.user_id || "—"}</td>
                    <td className="px-3 py-1.5 font-mono max-w-[100px] truncate" title={e.anonymous_session_id}>{e.anonymous_session_id || "—"}</td>
                    <td className="px-3 py-1.5 max-w-[120px] truncate" title={e.page_url}>{e.page_url || "—"}</td>
                    <td className="px-3 py-1.5 max-w-[120px] truncate" title={e.song_title || e.song_id}>{e.song_title || e.song_id || "—"}</td>
                    <td className="px-3 py-1.5 whitespace-nowrap">{e.traffic_source || "—"}</td>
                    <td className="px-3 py-1.5 whitespace-nowrap">{e.device_type || "—"}</td>
                    <td className="px-3 py-1.5">
                      {e.is_admin === true
                        ? <span className="text-red-400 font-bold">ADMIN</span>
                        : <span className="text-green-400/60">no</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Dashboard
// ─────────────────────────────────────────────────────────────────────────────
export default function AnalyticsDashboard() {
  const [filterDays, setFilterDays] = useState(7);
  const [allEvents,  setAllEvents]  = useState([]);
  const [allStreams, setAllStreams]  = useState([]);
  const [allSubs,    setAllSubs]    = useState([]);
  const [trackIndex, setTrackIndex] = useState({}); // id → track record (for song titles in pages)
  const [loading,    setLoading]    = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [evs, strms, subs, tracks] = await Promise.all([
        base44.entities.AnalyticsEvent.list("-created_date", 3000),
        base44.entities.SongStream.list("-created_date", 1000),
        base44.entities.EmailSubscriber.list("-created_date", 1000),
        base44.entities.Track.filter({ status: "published" }, "-created_date", 500),
      ]);
      // Build song id → record index for Top Pages enrichment
      const idx = {};
      tracks.forEach(t => { idx[t.id] = t; });
      setTrackIndex(idx);
      setAllEvents(evs);
      setAllStreams(strms);
      setAllSubs(subs);
    } catch (e) {
      console.warn("Analytics load error:", e);
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  // ── Apply date filter + exclude admins ────────────────────────────────────
  const since = daysAgo(filterDays);

  const events = useMemo(() => {
    let arr = allEvents.filter(r => r.is_admin !== true);
    if (since) arr = arr.filter(r => r.created_date >= since);
    return arr;
  }, [allEvents, since]);

  const streams = useMemo(() => {
    let arr = allStreams; // SongStream has no is_admin flag; filtered via user context
    if (since) arr = arr.filter(r => r.created_date >= since);
    return arr;
  }, [allStreams, since]);

  const subs = useMemo(() => {
    // Email subscribers: show those who signed up in the selected window
    if (!since) return allSubs.filter(s => s.subscribed_status !== "unsubscribed");
    return allSubs.filter(s => s.subscribed_status !== "unsubscribed" && s.created_date >= since);
  }, [allSubs, since]);

  // ── Visitor ID helper (stable across events) ──────────────────────────────
  // user_id field holds the stable visitor ID written by analytics.js v3.
  // anonymous_session_id is the session ID. Fall back for legacy events.
  const visitorOf  = e => e.user_id || e.anonymous_session_id || "unknown";
  const sessionOf  = e => e.anonymous_session_id || e.user_id || "unknown";

  // ── Page View events (all page_view events in window) ─────────────────────
  const pageViewEvents = useMemo(() => events.filter(e => e.event_type === "page_view"), [events]);

  // ── Total Pageviews: every page_view event ────────────────────────────────
  const totalPageviews = pageViewEvents.length;

  // ── Unique Pageviews: one per visitorId + page (all time) or per day ─────
  // Defined as: each distinct page URL counted once per visitor in the period.
  const uniquePageviewSet = useMemo(() => {
    const seen = new Set();
    pageViewEvents.forEach(e => {
      seen.add(`${visitorOf(e)}|${e.page_url || "/"}`);
    });
    return seen;
  }, [pageViewEvents]);
  const uniquePageviews = uniquePageviewSet.size;

  // ── Unique Visitors: distinct stable visitor IDs ───────────────────────────
  const uniqueVisitors = useMemo(() => {
    const ids = new Set(events.map(visitorOf).filter(v => v !== "unknown"));
    return ids.size;
  }, [events]);

  // ── Sessions/Visits: distinct session IDs from page_view events ───────────
  // A "session" is one browsing session; we approximate using distinct session IDs
  // that appear on page_view events.
  const totalSessions = useMemo(() => {
    const ids = new Set(pageViewEvents.map(sessionOf).filter(v => v !== "unknown"));
    return ids.size;
  }, [pageViewEvents]);

  // ── Song Plays: raw song_play count (already deduplicated at write time) ──
  const songPlays = useMemo(() => events.filter(e => e.event_type === "song_play").length, [events]);

  // ── Completions ───────────────────────────────────────────────────────────
  const completions = useMemo(() => events.filter(e => e.event_type === "song_complete").length, [events]);

  // ── Other KPIs ────────────────────────────────────────────────────────────
  const dlClicks   = useMemo(() => events.filter(e => e.event_type === "download_click").length, [events]);
  const premClicks = useMemo(() => events.filter(e => e.event_type === "premium_click").length, [events]);
  const vizViews   = useMemo(() => events.filter(e => e.event_type === "visualizer_view").length, [events]);

  // ── Email Signups: count from actual EmailSubscriber records ─────────────
  // This ensures the KPI card matches the subscriber table below.
  const emailSignups = subs.length;

  // ── Traffic Sources: one per visitor per session (first-touch) ───────────
  // We deduplicate by visitorId to avoid inflating sources when someone
  // visits multiple pages in one session.
  const topSources = useMemo(() => {
    const map = {};
    const seen = new Set(); // one entry per visitor
    pageViewEvents.forEach(e => {
      const vid = visitorOf(e);
      if (seen.has(vid)) return;
      seen.add(vid);
      const src = e.traffic_source || "direct";
      map[src] = (map[src] || 0) + 1;
    });
    return Object.entries(map)
      .map(([source, count]) => ({ source, count }))
      .sort((a, b) => b.count - a.count);
  }, [pageViewEvents]);

  // ── Most Played Songs ─────────────────────────────────────────────────────
  const topSongs = useMemo(() => {
    const map = {};
    events.filter(e => e.event_type === "song_play" && e.song_title).forEach(e => {
      const key = e.song_title;
      if (!map[key]) map[key] = { song_title: key, artist_name: e.artist_name, count: 0 };
      map[key].count++;
    });
    return Object.values(map).sort((a, b) => b.count - a.count);
  }, [events]);

  // ── Most Completed Songs ──────────────────────────────────────────────────
  const topCompleted = useMemo(() => {
    const map = {};
    events.filter(e => e.event_type === "song_complete" && e.song_title).forEach(e => {
      const key = e.song_title;
      if (!map[key]) map[key] = { song_title: key, count: 0 };
      map[key].count++;
    });
    return Object.values(map).sort((a, b) => b.count - a.count);
  }, [events]);

  // ── Top Pages: unique visitors per page, with song title enrichment ────────
  const topPages = useMemo(() => {
    const map  = {};
    const seen = new Set();
    pageViewEvents.forEach(e => {
      if (!e.page_url) return;
      const key = `${visitorOf(e)}|${e.page_url}`;
      if (seen.has(key)) return;
      seen.add(key);
      map[e.page_url] = (map[e.page_url] || 0) + 1;
    });

    return Object.entries(map)
      .map(([page_url, count]) => {
        // Enrich song pages with title/artist
        const songMatch = page_url.match(/^\/song\/([^/?]+)/);
        let label = page_url;
        if (songMatch) {
          const songId = songMatch[1];
          const t      = trackIndex[songId];
          if (t) {
            label = `${t.title}${t.artist_display ? " — " + t.artist_display : ""} (${page_url})`;
          }
        }
        return { page_url: label, count };
      })
      .sort((a, b) => b.count - a.count);
  }, [pageViewEvents, trackIndex]);

  // ── Devices: unique visitors per device type ──────────────────────────────
  const topDevices = useMemo(() => {
    const map  = {};
    const seen = new Set(); // one device count per visitor
    pageViewEvents.forEach(e => {
      const vid = visitorOf(e);
      if (seen.has(vid)) return;
      seen.add(vid);
      const d = e.device_type || "desktop";
      map[d] = (map[d] || 0) + 1;
    });
    return Object.entries(map).map(([device_type, count]) => ({ device_type, count }))
      .sort((a, b) => b.count - a.count);
  }, [pageViewEvents]);

  // ── Daily Traffic Chart ───────────────────────────────────────────────────
  // Number of days to show depends on the filter
  const chartDays = filterDays === 1 ? 1 : filterDays === 7 ? 7 : filterDays === 30 ? 30 : 30;

  const dailyData = useMemo(() => {
    const now = new Date();
    const buckets = {};

    for (let i = chartDays - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dayStr = d.toISOString().slice(0, 10);
      const label  = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      buckets[dayStr] = { date: label, views: 0, plays: 0, visitors: new Set() };
    }

    const pageSeenInDay = new Set();
    events.forEach(e => {
      const dayStr = e.created_date?.slice(0, 10);
      if (!dayStr || !buckets[dayStr]) return;

      if (e.event_type === "page_view") {
        const dedupKey = `${visitorOf(e)}|${e.page_url || "/"}|${dayStr}`;
        if (!pageSeenInDay.has(dedupKey)) {
          pageSeenInDay.add(dedupKey);
          buckets[dayStr].views++;
        }
        buckets[dayStr].visitors.add(visitorOf(e));
      }
      if (e.event_type === "song_play") {
        buckets[dayStr].plays++;
      }
    });

    return Object.values(buckets).map(b => ({
      date:     b.date,
      views:    b.views,
      plays:    b.plays,
      visitors: b.visitors.size,
    }));
  }, [events, chartDays]);

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
      <div className="flex gap-2 flex-wrap items-center">
        {DATE_FILTERS.map(f => (
          <button key={f.days} onClick={() => setFilterDays(f.days)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              filterDays === f.days ? "text-black" : "text-white/50 hover:text-white/70"
            }`}
            style={filterDays === f.days
              ? { background: "linear-gradient(135deg,#00A8C0,#00D4EE)" }
              : { background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }
            }>{f.label}</button>
        ))}
        <button onClick={load}
          className="px-4 py-2 rounded-xl text-xs font-bold text-white/40 hover:text-white/60 transition-all"
          style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}>
          Refresh
        </button>
        <span className="text-[10px] text-white/20 ml-2">Admin activity excluded • Unique visitor IDs are persistent</span>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard icon={Eye}        label="Total Pageviews"    value={totalPageviews}  sub="every page load"       color="#00C9E0" />
        <StatCard icon={Eye}        label="Unique Pageviews"   value={uniquePageviews} sub="one per visitor+page"   color="#38BDF8" />
        <StatCard icon={Users}      label="Sessions / Visits"  value={totalSessions}   sub="distinct session IDs"  color="#A78BFA" />
        <StatCard icon={Users}      label="Unique Visitors"    value={uniqueVisitors}  sub="persistent visitor IDs" color="#818CF8" />
        <StatCard icon={Play}       label="Song Plays"         value={songPlays}       sub="≥10s cooldown dedup"   color="#34D399" />
        <StatCard icon={Music}      label="Completions"        value={completions}     sub="≥90% of song heard"    color="#60A5FA" />
        <StatCard icon={Download}   label="Download Clicks"    value={dlClicks}        color="#D4A843" />
        <StatCard icon={Crown}      label="Plus Clicks"        value={premClicks}      color="#F59E0B" />
        <StatCard icon={Mail}       label="Email Subscribers"  value={emailSignups}    sub="confirmed DB records"  color="#EC4899" />
        <StatCard icon={TrendingUp} label="Visualizer Views"   value={vizViews}        color="#00C9E0" />
      </div>

      {/* Daily traffic chart */}
      <div className="rounded-2xl p-6"
        style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
        <p className="text-sm font-bold text-white mb-1">
          Daily Traffic{filterDays > 0 ? ` (last ${chartDays} day${chartDays > 1 ? "s" : ""})` : " (last 30 days)"}
        </p>
        <p className="text-[10px] text-white/30 mb-5">Unique pageviews per day (blue) · Song plays (gold)</p>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={dailyData}>
            <XAxis dataKey="date" tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 10 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 10 }} axisLine={false} tickLine={false} />
            <Tooltip
              contentStyle={{ background: "rgba(8,8,22,0.95)", border: "1px solid rgba(0,229,255,0.2)", borderRadius: 12 }}
              labelStyle={{ color: "rgba(255,255,255,0.6)", fontSize: 11 }}
              itemStyle={{ fontSize: 11 }}
            />
            <Line type="monotone" dataKey="views"    stroke="#00C9E0" strokeWidth={2} dot={false} name="Unique Pageviews" />
            <Line type="monotone" dataKey="plays"    stroke="#D4A843" strokeWidth={2} dot={false} name="Song Plays" />
            <Line type="monotone" dataKey="visitors" stroke="#A78BFA" strokeWidth={1.5} dot={false} name="Unique Visitors" strokeDasharray="4 2" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Song plays bar chart */}
      {topSongs.length > 0 && (
        <div className="rounded-2xl p-6"
          style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
          <p className="text-sm font-bold text-white mb-5">Top 8 Most Played Songs</p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={topSongs.slice(0, 8)} layout="vertical">
              <XAxis type="number" tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="song_title" tick={{ fill: "rgba(255,255,255,0.5)", fontSize: 10 }} axisLine={false} tickLine={false} width={120} />
              <Tooltip contentStyle={{ background: "rgba(8,8,22,0.95)", border: "1px solid rgba(0,229,255,0.2)", borderRadius: 12 }} itemStyle={{ color: "#00C9E0", fontSize: 11 }} />
              <Bar dataKey="count" fill="#00C9E0" radius={[0, 6, 6, 0]} name="Plays" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Grid of top lists */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        <TopList title="Traffic Sources (1 per visitor)"  items={topSources}   keyField="source"      valueField="count" valueLabel="visitors" />
        <TopList title="Most Completed Songs"             items={topCompleted} keyField="song_title"  valueField="count" valueLabel="✓" />
        <TopList title="Top Pages (unique visitors)"      items={topPages}     keyField="page_url"    valueField="count" valueLabel="visitors" />
        <TopList title="Devices (1 per visitor)"          items={topDevices}   keyField="device_type" valueField="count" valueLabel="visitors" />
      </div>

      {/* Email subscribers */}
      <div className="rounded-2xl p-6"
        style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm font-bold text-white">
            Email Subscribers — {filterDays > 0 ? `last ${filterDays} day${filterDays > 1 ? "s" : ""}` : "all time"} ({subs.length})
          </p>
        </div>
        {subs.length === 0 ? (
          <p className="text-xs text-white/25">No new subscribers in this period.</p>
        ) : (
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {subs.map(s => (
              <div key={s.id} className="flex items-center justify-between gap-3 text-xs py-1.5 border-b border-white/5">
                <span className="text-white/70">{s.email}</span>
                <div className="flex items-center gap-3 text-white/25 flex-shrink-0">
                  <span>{s.source_page}</span>
                  <span>{s.created_date ? new Date(s.created_date).toLocaleDateString() : ""}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Debug panel */}
      <DebugPanel events={events} />
    </div>
  );
}