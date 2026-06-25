/**
 * BlockReportConfirmModal
 * Handles 2-step confirmation for Block, Unblock, and Report actions.
 * mode: "block" | "unblock" | "report"
 */
import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, UserX, Flag, ShieldCheck } from "lucide-react";

const REPORT_REASONS = [
  "Harassment",
  "Spam",
  "Inappropriate content",
  "Scam / fraud",
  "Hate or threats",
  "Other",
];

export default function BlockReportConfirmModal({
  open,
  mode,           // "block" | "unblock" | "report"
  targetUsername,
  onConfirm,      // (reason?, note?) => void
  onCancel,
}) {
  const [selectedReason, setSelectedReason] = useState("");
  const [note, setNote] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleClose = () => {
    setSelectedReason("");
    setNote("");
    setSubmitted(false);
    onCancel?.();
  };

  const handleConfirm = () => {
    if (mode === "report") {
      if (!selectedReason) return;
      setSubmitted(true);
      onConfirm?.(selectedReason, note.trim());
    } else {
      onConfirm?.();
    }
  };

  if (!open) return null;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="brmodal-bg"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 flex items-center justify-center px-4"
          style={{ zIndex: 120, background: "rgba(0,0,0,0.75)", backdropFilter: "blur(6px)", pointerEvents: "auto" }}
          onTouchStart={(e) => e.stopPropagation()}
          onClick={handleClose}
        >
          <motion.div
            key="brmodal-card"
            initial={{ scale: 0.9, y: 24 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 24 }}
            transition={{ type: "spring", damping: 28, stiffness: 340 }}
            className="w-full max-w-sm rounded-2xl overflow-hidden"
            style={{
              background: "rgba(14,10,28,0.99)",
              border: mode === "block" ? "1px solid rgba(239,68,68,0.3)" :
                      mode === "unblock" ? "1px solid rgba(255,165,0,0.3)" :
                      "1px solid rgba(155,126,255,0.3)",
              boxShadow: "0 12px 48px rgba(0,0,0,0.8)",
              pointerEvents: "auto",
            }}
            onClick={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
              <div className="flex items-center gap-2.5">
                {mode === "block" && <UserX className="w-4 h-4 text-red-400" />}
                {mode === "unblock" && <ShieldCheck className="w-4 h-4" style={{ color: "#FFA500" }} />}
                {mode === "report" && <Flag className="w-4 h-4" style={{ color: "#c4aaff" }} />}
                <p className="font-bold text-sm text-white">
                  {mode === "block" ? "Block this user?" :
                   mode === "unblock" ? "Unblock this user?" :
                   "Report this user"}
                </p>
              </div>
              <button
                onClick={handleClose}
                onTouchStart={(e) => e.stopPropagation()}
                className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-white/10 active:scale-90"
                style={{ color: "rgba(255,255,255,0.4)", minWidth: 32, minHeight: 32, touchAction: "manipulation" }}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="px-4 py-4 space-y-4">
              {/* Submitted state */}
              {submitted && mode === "report" ? (
                <div className="text-center py-4 space-y-2">
                  <div className="text-3xl">✅</div>
                  <p className="text-sm font-bold text-white/90">Report submitted.</p>
                  <p className="text-xs text-white/45">Thank you for helping keep Upper Vibe City safe.</p>
                  <button
                    onClick={handleClose}
                    className="mt-2 px-5 py-2.5 rounded-xl text-xs font-black tracking-wider"
                    style={{ background: "rgba(155,126,255,0.15)", border: "1px solid rgba(155,126,255,0.3)", color: "#c4aaff", touchAction: "manipulation" }}
                  >
                    Close
                  </button>
                </div>
              ) : (
                <>
                  {/* Description */}
                  <p className="text-xs text-white/55 leading-relaxed">
                    {mode === "block"
                      ? `${targetUsername || "This user"} will not be able to message you, send requests, or interact with your profile. You can unblock them later.`
                      : mode === "unblock"
                      ? `${targetUsername || "This user"} may be able to message you again if a chat was previously approved, or send a new request if no approved chat exists.`
                      : `Select a reason to report ${targetUsername || "this user"}.`
                    }
                  </p>

                  {/* Report reasons */}
                  {mode === "report" && (
                    <div className="space-y-1.5">
                      {REPORT_REASONS.map((r) => (
                        <button
                          key={r}
                          onClick={() => setSelectedReason(r)}
                          onTouchStart={(e) => e.stopPropagation()}
                          className="w-full text-left px-3 py-2.5 rounded-xl text-xs font-bold transition-all active:scale-[0.98]"
                          style={{
                            background: selectedReason === r ? "rgba(155,126,255,0.18)" : "rgba(255,255,255,0.04)",
                            border: `1px solid ${selectedReason === r ? "rgba(155,126,255,0.4)" : "rgba(255,255,255,0.08)"}`,
                            color: selectedReason === r ? "#c4aaff" : "rgba(255,255,255,0.65)",
                            touchAction: "manipulation",
                            minHeight: 40,
                          }}
                        >
                          {r}
                        </button>
                      ))}
                      <textarea
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        placeholder="Optional: add a note (max 200 chars)"
                        maxLength={200}
                        rows={2}
                        className="w-full px-3 py-2 rounded-xl text-xs text-white placeholder-white/20 outline-none resize-none"
                        style={{
                          background: "rgba(255,255,255,0.05)",
                          border: "1px solid rgba(255,255,255,0.08)",
                          fontSize: "16px",
                        }}
                        onTouchStart={(e) => e.stopPropagation()}
                      />
                    </div>
                  )}

                  {/* Buttons */}
                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={handleClose}
                      onTouchStart={(e) => e.stopPropagation()}
                      className="flex-1 rounded-xl font-black text-xs tracking-wider transition-all active:scale-95"
                      style={{
                        background: "rgba(255,255,255,0.06)",
                        border: "1px solid rgba(255,255,255,0.1)",
                        color: "rgba(255,255,255,0.5)",
                        minHeight: 44,
                        touchAction: "manipulation",
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleConfirm}
                      onTouchStart={(e) => e.stopPropagation()}
                      disabled={mode === "report" && !selectedReason}
                      className="flex-1 rounded-xl font-black text-xs tracking-wider transition-all active:scale-95 disabled:opacity-40"
                      style={{
                        background: mode === "block"
                          ? "rgba(239,68,68,0.2)"
                          : mode === "unblock"
                          ? "rgba(255,165,0,0.18)"
                          : "rgba(155,126,255,0.2)",
                        border: mode === "block"
                          ? "1px solid rgba(239,68,68,0.4)"
                          : mode === "unblock"
                          ? "1px solid rgba(255,165,0,0.35)"
                          : "1px solid rgba(155,126,255,0.4)",
                        color: mode === "block" ? "#EF4444" : mode === "unblock" ? "#FFA500" : "#c4aaff",
                        minHeight: 44,
                        touchAction: "manipulation",
                      }}
                    >
                      {mode === "block" ? "Confirm Block" :
                       mode === "unblock" ? "Unblock" :
                       "Submit Report"}
                    </button>
                  </div>
                </>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}