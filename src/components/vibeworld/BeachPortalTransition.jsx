import React from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function BeachPortalTransition({ active }) {
  return (
    <AnimatePresence>
      {active && (
        <motion.div
          className="absolute inset-0 pointer-events-none overflow-hidden"
          style={{ zIndex: 225 }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.35 }}
        >
          <motion.div
            className="absolute left-1/2 rounded-full"
            style={{
              bottom: "18%",
              width: "min(72vw, 520px)",
              height: "min(72vw, 520px)",
              transform: "translateX(-50%)",
              border: "1px solid rgba(0,229,255,0.22)",
              boxShadow: "0 0 60px rgba(0,229,255,0.18), inset 0 0 80px rgba(155,126,255,0.12)",
              background: "radial-gradient(circle, rgba(0,229,255,0.10) 0%, rgba(155,126,255,0.08) 38%, transparent 68%)",
            }}
            animate={{ scale: [0.72, 1.04, 1.18], opacity: [0, 0.75, 0] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: "easeOut" }}
          />
          <motion.div
            className="absolute left-0 right-0"
            style={{
              bottom: "30%",
              height: 120,
              background: "linear-gradient(90deg, transparent, rgba(0,229,255,0.20), rgba(212,168,67,0.14), rgba(155,126,255,0.18), transparent)",
              filter: "blur(18px)",
            }}
            animate={{ x: ["-28%", "28%"], opacity: [0.15, 0.45, 0.15] }}
            transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div
            className="absolute left-1/2 -translate-x-1/2 rounded-full"
            style={{
              bottom: "24%",
              width: "min(54vw, 380px)",
              height: 3,
              background: "linear-gradient(90deg, transparent, #00E5FF, #D4A843, #9B7EFF, transparent)",
              boxShadow: "0 0 22px rgba(0,229,255,0.7)",
            }}
            animate={{ scaleX: [0.55, 1.08, 0.55], opacity: [0.35, 0.95, 0.35] }}
            transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}