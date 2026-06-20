import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, X } from "lucide-react";

export default function ChatWarning({ show, onDismiss }) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="absolute top-0 left-0 right-0 z-[60] flex justify-center px-4"
          style={{ paddingTop: "calc(env(safe-area-inset-top, 0px) + 4.5rem)" }}
        >
          <div
            className="flex items-center gap-3 px-4 py-2.5 rounded-xl max-w-sm"
            style={{
              background: "rgba(245,168,0,0.12)",
              border: "1px solid rgba(245,168,0,0.3)",
              backdropFilter: "blur(12px)",
            }}
          >
            <AlertTriangle className="w-4 h-4 flex-shrink-0" style={{ color: "#F5A800" }} />
            <p className="text-[11px] font-bold text-white/80 leading-snug">
              Do not share personal information. Chat is public.
            </p>
            <button
              onClick={onDismiss}
              className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center"
              style={{ background: "rgba(255,255,255,0.1)" }}
            >
              <X className="w-3 h-3 text-white/50" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}