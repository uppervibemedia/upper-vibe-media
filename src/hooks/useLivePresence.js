/**
 * useLivePresence — broadcasts a heartbeat every 30s so the admin dashboard
 * can count genuinely active non-admin visitors.
 *
 * - Reuses the same stable visitor ID from analytics.js
 * - Upserts a single LivePresence record per visitor (keyed by visitor_id)
 * - Admins are flagged and excluded from the Live Users count on the dashboard
 * - Stops broadcasting when the tab is hidden (pagehide / visibilitychange)
 */

import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { getVisitorId, getSessionId } from "@/lib/analytics";

const HEARTBEAT_INTERVAL = 10_000; // 10 seconds
const PRESENCE_RECORD_KEY = "uvm_presence_id"; // localStorage: ID of our LivePresence record

// Page path → human label mapping
const PAGE_LABELS = {
  "/":                   "Home",
  "/start":              "Start",
  "/music":              "Music Library",
  "/radio":              "Live Radio",
  "/visualizers":        "Visualizers",
  "/categories":         "Categories",
  "/downloads":          "My Downloads",
  "/my-vibes":           "My Vibe Library",
  "/my-vibe-library":    "My Vibe Library",
  "/artists":            "Artists",
  "/academy":            "Academy",
  "/account":            "Account",
  "/upgrade":            "Membership / Plus",
  "/membership":         "Membership / Plus",
  "/support":            "Support",
  "/settings":           "Settings",
  "/newest-music":       "Newest Music",
  "/my-feed":            "Personalized Feed",
  "/vibe-check":         "Vibe Check",
  "/faq":                "FAQ",
  "/about":              "About",
  "/contact":            "Contact",
  "/email-list":         "Email List",
  "/sessions":           "Sessions",
  "/community-guidelines": "Community Guidelines",
  "/terms":              "Terms",
  "/privacy":            "Privacy",
  "/dmca":               "DMCA",
  "/refunds":            "Refund Policy",
};

function getPageLabel(path) {
  if (PAGE_LABELS[path]) return PAGE_LABELS[path];
  if (path.startsWith("/song/")) return "Song Page";
  if (path.startsWith("/academy/lesson/")) return "Academy Lesson";
  if (path.startsWith("/admin")) return null; // don't track admin page views
  return "Other";
}

function getDeviceType() {
  const ua = navigator.userAgent || "";
  if (/tablet|ipad|playbook|silk/i.test(ua)) return "tablet";
  if (/mobile|iphone|ipod|android|blackberry/i.test(ua)) return "mobile";
  return "desktop";
}

async function getIsAdmin() {
  try {
    const authed = await base44.auth.isAuthenticated();
    if (!authed) return false;
    const me = await base44.auth.me();
    return me?.role === "admin";
  } catch { return false; }
}

function getPresenceRecordId() {
  try { return localStorage.getItem(PRESENCE_RECORD_KEY); } catch { return null; }
}
function savePresenceRecordId(id) {
  try { localStorage.setItem(PRESENCE_RECORD_KEY, id); } catch {}
}

export function useLivePresence() {
  const location = useLocation();
  const timerRef      = useRef(null);
  const recordIdRef   = useRef(getPresenceRecordId());
  const isAdminRef    = useRef(null); // null = not yet checked
  const currentPathRef = useRef(location.pathname);

  // Keep path ref current without resetting the interval
  useEffect(() => {
    currentPathRef.current = location.pathname;
  }, [location.pathname]);

  useEffect(() => {
    let mounted = true;

    const beat = async () => {
      if (!mounted) return;

      // Lazy admin check — only runs once per session
      if (isAdminRef.current === null) {
        isAdminRef.current = await getIsAdmin();
      }

      const path  = currentPathRef.current;
      const label = getPageLabel(path);
      // Skip broadcasting from admin pages (but still mark is_admin=true so the
      // dashboard can exclude them if they browse elsewhere)
      if (path.startsWith("/admin") && !isAdminRef.current) {
        // non-admin on admin page — unusual, skip
        return;
      }

      const payload = {
        visitor_id:  getVisitorId(),
        session_id:  getSessionId(),
        page_path:   path,
        page_label:  label || path,
        last_seen:   new Date().toISOString(),
        device_type: getDeviceType(),
        is_admin:    isAdminRef.current || false,
      };

      try {
        const existingId = recordIdRef.current;
        if (existingId) {
          // Upsert — update existing record
          await base44.entities.LivePresence.update(existingId, payload);
        } else {
          // First heartbeat — create a new record
          const rec = await base44.entities.LivePresence.create(payload);
          recordIdRef.current = rec.id;
          savePresenceRecordId(rec.id);
        }
      } catch (err) {
        // If update fails (record deleted), reset and recreate next beat
        if (err?.message?.includes("not found") || err?.status === 404) {
          recordIdRef.current = null;
          savePresenceRecordId(null);
        }
        // Otherwise silent — never block the app
      }
    };

    // Fire immediately, then on interval
    beat();
    timerRef.current = setInterval(beat, HEARTBEAT_INTERVAL);

    // Pause when tab is hidden, resume when visible
    const onVisibility = () => {
      if (document.hidden) {
        clearInterval(timerRef.current);
      } else {
        beat();
        timerRef.current = setInterval(beat, HEARTBEAT_INTERVAL);
      }
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      mounted = false;
      clearInterval(timerRef.current);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  // Run once on mount — path changes are handled via currentPathRef
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}