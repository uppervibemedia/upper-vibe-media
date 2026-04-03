import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";

// Tier hierarchy: premium > supporter > free
export function canAccessVersion(version, userTier) {
  const tiers = version.tier_access || ["free"];
  if (tiers.includes("free")) return true;
  if (userTier === "premium") return true; // premium accesses everything
  if (userTier === "supporter" && tiers.includes("supporter")) return true;
  return false;
}

// Pick the best version for the user: highest-tier accessible one first
export function pickBestVersion(versions, userTier) {
  if (!versions || versions.length === 0) return null;
  const active = versions.filter((v) => v.is_active !== false);

  // Prefer non-free (premium/supporter) if user has access
  const upgraded = active.filter((v) => {
    const tiers = v.tier_access || ["free"];
    return !tiers.includes("free") && canAccessVersion(v, userTier);
  });
  if (upgraded.length > 0) return upgraded[0];

  // Fall back to free version
  const free = active.find((v) => {
    const tiers = v.tier_access || ["free"];
    return tiers.includes("free");
  });
  return free || active[0] || null;
}

export function getVersionBadge(version) {
  if (!version) return null;
  const tiers = version.tier_access || ["free"];
  const isExclusive = !tiers.includes("free");

  const freqLabels = {
    standard: "Standard",
    "432hz": "432 Hz",
    "528hz": "528 Hz",
    binaural: "Binaural",
    remastered: "Remastered",
    other: version.version_name,
  };

  return {
    label: version.version_name || freqLabels[version.frequency_type] || "Version",
    isExclusive,
    color: isExclusive
      ? "border-primary/40 bg-primary/10 text-primary"
      : "border-border/40 bg-muted/30 text-muted-foreground",
  };
}

// Hook: fetch versions for a single track
export function useTrackVersions(trackId, userTier = "free") {
  const [versions, setVersions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!trackId) { setLoading(false); return; }
    base44.entities.TrackVersion.filter({ track_id: trackId, is_active: true }, "display_order", 20)
      .then((v) => { setVersions(v); setLoading(false); });
  }, [trackId]);

  const bestVersion = pickBestVersion(versions, userTier);
  const badge = getVersionBadge(bestVersion);

  return { versions, loading, bestVersion, badge };
}