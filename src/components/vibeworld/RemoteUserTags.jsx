/**
 * RemoteUserTags — shows clickable username badges for nearby remote users.
 * Displayed as a compact vertical strip on the left edge of the screen.
 * Clicking a badge opens the user interaction menu.
 */
import React from "react";
import { motion, AnimatePresence } from "framer-motion";

const MAX_NEARBY = 6;
const NEARBY_RADIUS = 20; // world units

export default function RemoteUserTags({ remoteUsers, playerX, playerZ, onClickUser, isMobile }) {
  if (!remoteUsers?.length) return null;

  // Sort by proximity, keep closest MAX_NEARBY
  const nearby = remoteUsers
    .filter((u) => u?.user_id && u?.username)
    .map((u) => {
      const dx = (u.pos_x || 0) - (playerX || 0);
      const dz = (u.pos_z || 0) - (playerZ || 0);
      const dist = Math.sqrt(dx * dx + dz * dz);
      return { ...u, dist };
    })
    .filter((u) => u.dist < NEARBY_RADIUS)
    .sort((a, b) => a.dist - b.dist)
    .slice(0, MAX_NEARBY);

  if (!nearby.length) return null;

  return (
    <div
      className="fixed left-0 top-1/2 z-[56] flex flex-col gap-1.5 pointer-events-none"
      style={{
        transform: "translateY(-50%)",
        paddingLeft: "6px",
      }}
    >
      <AnimatePresence>
        {nearby.map((user, i) => (
          <motion.button
            key={user.user_id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ delay: i * 0.04 }}
            onClick={() => onClickUser?.(user)}
            onTouchStart={(e) => { e.stopPropagation(); onClickUser?.(user); }}
            className="pointer-events-auto flex items-center gap-1.5 pr-2 pl-1.5 py-1 rounded-full transition-all active:scale-95 hover:brightness-110"
            style={{
              background: "rgba(10,8,28,0.88)",
              border: "1px solid rgba(155,126,255,0.3)",
              backdropFilter: "blur(10px)",
              boxShadow: "0 2px 10px rgba(0,0,0,0.5)",
              touchAction: "manipulation",
              maxWidth: isMobile ? "110px" : "130px",
              cursor: "pointer",
            }}
          >
            {/* Avatar initial */}
            <div
              className="w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center font-black"
              style={{
                background: "linear-gradient(135deg,rgba(155,126,255,0.4),rgba(0,200,220,0.25))",
                fontSize: "9px",
                color: "#c4aaff",
                minWidth: 20,
                minHeight: 20,
              }}
            >
              {(user.username || "?")[0].toUpperCase()}
            </div>
            {/* Username */}
            <span
              className="font-black text-white truncate"
              style={{ fontSize: "10px", maxWidth: isMobile ? "70px" : "88px" }}
            >
              {user.username}
            </span>
            {/* Distance dot — proximity indicator */}
            <div
              className="w-1.5 h-1.5 rounded-full flex-shrink-0"
              style={{
                background: user.dist < 5 ? "#00E676" : user.dist < 12 ? "#FFC107" : "rgba(255,255,255,0.25)",
              }}
            />
          </motion.button>
        ))}
      </AnimatePresence>
    </div>
  );
}