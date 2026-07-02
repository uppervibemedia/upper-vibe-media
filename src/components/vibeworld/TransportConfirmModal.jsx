import React from "react";

export default function TransportConfirmModal({ open, title, body, onEnter, onCancel }) {
  if (!open) return null;

  return (
    <div
      data-beach-portal-prompt
      data-camera-scroll-lock="true"
      className="fixed left-1/2 -translate-x-1/2 z-[260] rounded-2xl border px-4 py-3 text-center shadow-2xl"
      style={{
        bottom: "calc(104px + env(safe-area-inset-bottom, 0px))",
        width: "min(340px, calc(100vw - 32px))",
        background: "rgba(5, 12, 24, 0.88)",
        borderColor: "rgba(78, 219, 255, 0.42)",
        backdropFilter: "blur(18px)",
      }}
      onTouchStart={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <p className="text-sm font-black tracking-wide text-white mb-1">{title}</p>
      <p className="text-[11px] text-cyan-100/70 mb-3">{body}</p>
      <div className="flex gap-2">
        <button
          onClick={onEnter}
          className="flex-1 rounded-xl px-4 py-2 text-xs font-black uppercase tracking-[0.12em] text-black active:scale-95"
          style={{ background: "linear-gradient(135deg,#00E5FF,#EDB84A)" }}
        >
          ENTER
        </button>
        <button
          onClick={onCancel}
          className="flex-1 rounded-xl border border-white/15 px-4 py-2 text-xs font-black uppercase tracking-[0.12em] text-white/80 active:scale-95"
          style={{ background: "rgba(255,255,255,0.06)" }}
        >
          CANCEL
        </button>
      </div>
    </div>
  );
}