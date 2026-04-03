import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles, Brain, Check, AlertTriangle, Lock, Crown, Loader2,
  ChevronDown, ChevronUp, ShieldAlert, RefreshCw, CheckCircle2, XCircle
} from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

const ConfidenceBar = ({ score, label }) => {
  const color = score >= 90 ? "bg-green-500" : score >= 75 ? "bg-primary" : score >= 60 ? "bg-secondary" : "bg-destructive";
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-muted-foreground w-24 flex-shrink-0">{label}</span>
      <div className="flex-1 h-1.5 bg-muted/30 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-500 ${color}`} style={{ width: `${score}%` }} />
      </div>
      <span className={`text-xs font-bold w-8 text-right ${score >= 90 ? "text-green-400" : score >= 75 ? "text-primary" : score >= 60 ? "text-secondary" : "text-destructive"}`}>
        {score}%
      </span>
    </div>
  );
};

const Badge = ({ children, variant = "default", className = "" }) => {
  const variants = {
    default: "bg-muted/30 border-border/30 text-muted-foreground",
    primary: "bg-primary/10 border-primary/30 text-primary",
    success: "bg-green-500/10 border-green-500/30 text-green-400",
    warning: "bg-secondary/10 border-secondary/30 text-secondary",
    danger: "bg-destructive/10 border-destructive/30 text-destructive",
    purple: "bg-purple-500/10 border-purple-500/30 text-purple-400",
  };
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg border text-[10px] font-bold tracking-wider uppercase ${variants[variant]} ${className}`}>
      {children}
    </span>
  );
};

export default function AIClassifierPanel({ track, artists, categories, onApply }) {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showAlternates, setShowAlternates] = useState(false);

  const classify = async () => {
    if (!track?.title) {
      toast.error("Track needs at least a title to classify.");
      return;
    }
    setLoading(true);
    setResult(null);
    const res = await base44.functions.invoke("classifyTrack", { track });
    setResult(res.data?.classification || null);
    setLoading(false);
  };

  const handleApplyAll = () => {
    if (!result) return;
    // Map suggested categories to IDs
    const catIds = (result.suggested_categories || []).flatMap((name) => {
      const match = categories.find((c) => c.name.toLowerCase() === name.toLowerCase() || c.slug?.includes(name.toLowerCase().replace(/\s+/g, "-")));
      return match ? [match.id] : [];
    });
    // Map suggested artist to ID
    const artistMatch = artists.find(
      (a) => a.name.toLowerCase() === (result.suggested_primary_artist || "").toLowerCase()
    );

    onApply?.({
      primary_artist_id: artistMatch?.id || "",
      artist_display: result.suggested_primary_artist || "",
      category_ids: catIds,
      tier_access: result.suggested_access_tiers || ["free"],
      is_featured: result.suggested_shelves?.includes("Featured") || false,
      is_new_release: result.suggested_shelves?.includes("New Releases") || false,
      is_downloadable: result.is_downloadable || false,
      download_tier_required: result.download_tier_required || "premium",
    });
    toast.success("AI recommendations applied to form!");
  };

  const overall = result?.confidence_scores?.overall || 0;
  const isHighConfidence = overall >= 90;
  const isLowConfidence = overall < 75;

  return (
    <div className="rounded-2xl border border-primary/20 bg-gradient-to-b from-primary/5 to-transparent overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-5 border-b border-border/20">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
            <Brain className="w-4.5 h-4.5 text-primary" />
          </div>
          <div>
            <p className="text-sm font-bold text-foreground">AI Content Organizer</p>
            <p className="text-xs text-muted-foreground">Classify this track automatically</p>
          </div>
        </div>
        <button
          onClick={classify}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold tracking-wide uppercase hover:bg-primary/90 transition-all disabled:opacity-60"
        >
          {loading ? (
            <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Analyzing...</>
          ) : result ? (
            <><RefreshCw className="w-3.5 h-3.5" /> Re-analyze</>
          ) : (
            <><Sparkles className="w-3.5 h-3.5" /> Analyze Track</>
          )}
        </button>
      </div>

      <AnimatePresence>
        {loading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center gap-3 py-10 px-6"
          >
            <div className="relative w-16 h-16">
              <div className="absolute inset-0 rounded-full border-2 border-primary/20 animate-spin border-t-primary" />
              <Brain className="absolute inset-0 m-auto w-6 h-6 text-primary" />
            </div>
            <p className="text-sm text-muted-foreground">Analyzing metadata, lyrics, frequency signals...</p>
          </motion.div>
        )}

        {result && !loading && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-5 space-y-5"
          >
            {/* Status badges */}
            <div className="flex flex-wrap gap-2">
              {isHighConfidence && (
                <Badge variant="success"><CheckCircle2 className="w-3 h-3" /> High Confidence</Badge>
              )}
              {isLowConfidence && (
                <Badge variant="danger"><AlertTriangle className="w-3 h-3" /> Low Confidence</Badge>
              )}
              {result.needs_human_review && (
                <Badge variant="warning"><AlertTriangle className="w-3 h-3" /> Needs Review</Badge>
              )}
              {result.locked_artist_conflict && (
                <Badge variant="danger"><ShieldAlert className="w-3 h-3" /> Locked Artist Conflict</Badge>
              )}
              {result.is_downloadable && (
                <Badge variant="purple"><Crown className="w-3 h-3" /> Premium Download</Badge>
              )}
            </div>

            {/* Confidence bars */}
            <div className="rounded-xl bg-card/40 border border-border/20 p-4 space-y-2.5">
              <p className="text-[10px] font-bold tracking-wider uppercase text-muted-foreground mb-3">Confidence Scores</p>
              <ConfidenceBar score={result.confidence_scores?.overall || 0} label="Overall" />
              <ConfidenceBar score={result.confidence_scores?.artist_lane || 0} label="Artist Lane" />
              <ConfidenceBar score={result.confidence_scores?.categories || 0} label="Categories" />
              <ConfidenceBar score={result.confidence_scores?.access_tiers || 0} label="Access Tiers" />
              <ConfidenceBar score={result.confidence_scores?.shelves || 0} label="Shelves" />
            </div>

            {/* Recommendations grid */}
            <div className="grid sm:grid-cols-2 gap-3">
              <div className="rounded-xl bg-card/40 border border-border/20 p-4">
                <p className="text-[10px] font-bold tracking-wider uppercase text-muted-foreground mb-2.5">Artist Lane</p>
                <p className="text-sm font-bold text-foreground">{result.suggested_primary_artist || "—"}</p>
              </div>

              <div className="rounded-xl bg-card/40 border border-border/20 p-4">
                <p className="text-[10px] font-bold tracking-wider uppercase text-muted-foreground mb-2.5">Access Tiers</p>
                <div className="flex flex-wrap gap-1.5">
                  {(result.suggested_access_tiers || []).map((t) => (
                    <Badge key={t} variant={t === "premium" ? "purple" : t === "supporter" ? "primary" : "default"}>
                      {t}
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="rounded-xl bg-card/40 border border-border/20 p-4">
                <p className="text-[10px] font-bold tracking-wider uppercase text-muted-foreground mb-2.5">Categories</p>
                <div className="flex flex-wrap gap-1.5">
                  {(result.suggested_categories || []).map((c) => (
                    <Badge key={c} variant="primary">{c}</Badge>
                  ))}
                </div>
              </div>

              <div className="rounded-xl bg-card/40 border border-border/20 p-4">
                <p className="text-[10px] font-bold tracking-wider uppercase text-muted-foreground mb-2.5">Shelves</p>
                <div className="flex flex-wrap gap-1.5">
                  {(result.suggested_shelves || []).map((s) => (
                    <Badge key={s} variant="warning">{s}</Badge>
                  ))}
                </div>
              </div>
            </div>

            {/* Download recommendation */}
            <div className={`rounded-xl border p-4 flex items-center gap-3 ${result.is_downloadable ? "bg-purple-500/5 border-purple-500/20" : "bg-muted/10 border-border/20"}`}>
              {result.is_downloadable ? (
                <Crown className="w-4 h-4 text-purple-400 flex-shrink-0" />
              ) : (
                <Lock className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              )}
              <div>
                <p className="text-xs font-bold text-foreground">
                  {result.is_downloadable ? "Premium Download Recommended" : "Stream Only — No Download"}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  {result.is_downloadable ? "is_downloadable = true · download_tier_required = premium" : "is_downloadable = false"}
                </p>
              </div>
            </div>

            {/* Reasoning */}
            <div className="rounded-xl bg-card/40 border border-border/20 p-4">
              <p className="text-[10px] font-bold tracking-wider uppercase text-muted-foreground mb-2">AI Reasoning</p>
              <p className="text-sm text-foreground/80 leading-relaxed">{result.reasoning_summary}</p>
            </div>

            {/* Alternates */}
            {result.alternate_recommendations?.length > 0 && (
              <div className="rounded-xl border border-border/20 overflow-hidden">
                <button
                  onClick={() => setShowAlternates(!showAlternates)}
                  className="w-full flex items-center justify-between p-4 text-left hover:bg-muted/10 transition-all"
                >
                  <p className="text-xs font-bold tracking-wider uppercase text-muted-foreground">
                    Alternate Routes ({result.alternate_recommendations.length})
                  </p>
                  {showAlternates ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                </button>
                {showAlternates && (
                  <div className="border-t border-border/20 divide-y divide-border/10">
                    {result.alternate_recommendations.map((alt, i) => (
                      <div key={i} className="p-4">
                        <div className="flex items-center justify-between mb-1.5">
                          <p className="text-sm font-semibold text-foreground">{alt.label}</p>
                          <Badge variant={alt.confidence >= 75 ? "primary" : "danger"}>{alt.confidence}%</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mb-2">{alt.reason}</p>
                        <div className="flex flex-wrap gap-1.5">
                          <Badge variant="default">{alt.suggested_primary_artist}</Badge>
                          {(alt.suggested_categories || []).map((c) => (
                            <Badge key={c} variant="primary">{c}</Badge>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Action buttons */}
            <div className="flex gap-3 pt-2">
              <button
                onClick={handleApplyAll}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-primary text-primary-foreground font-bold text-sm tracking-wide hover:bg-primary/90 transition-all"
              >
                <Check className="w-4 h-4" />
                Apply All Recommendations
              </button>
              <button
                onClick={() => setResult(null)}
                className="px-4 py-3 rounded-xl border border-border/30 text-muted-foreground hover:text-foreground hover:border-border/60 transition-all"
              >
                <XCircle className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}

        {!result && !loading && (
          <div className="flex flex-col items-center gap-2 py-8 px-6 text-center">
            <Sparkles className="w-8 h-8 text-primary/30" />
            <p className="text-sm text-muted-foreground">Click "Analyze Track" to get AI classification recommendations.</p>
            <p className="text-xs text-muted-foreground/60">Works best with a title, artist, description, or lyrics filled in.</p>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}