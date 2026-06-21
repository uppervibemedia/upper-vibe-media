import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ShoppingBag, ExternalLink, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";

const SHOP_ITEMS = [
  {
    id: "merch",
    name: "Upper Vibe Merch",
    description: "Official apparel and accessories. Rep the vibe in style.",
    icon: ShoppingBag,
    action: "Coming Soon",
    color: "#7C3AED",
  },
  {
    id: "digital",
    name: "Digital Downloads",
    description: "Exclusive stems, samples, and production kits.",
    icon: Sparkles,
    action: "Coming Soon",
    color: "#00D4F0",
  },
  {
    id: "sessions",
    name: "1-on-1 Sessions",
    description: "Book a private session with your favorite Upper Vibe artist.",
    icon: ExternalLink,
    action: "Coming Soon",
    color: "#C43BFF",
  },
];

export default function ShopPanel({ open, onClose, isMobile }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="shop-panel"
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "100%" }}
          transition={{ type: "spring", damping: 26, stiffness: 260 }}
          className="fixed inset-x-0 bottom-0 z-[70] pointer-events-auto"
          style={{
            height: isMobile ? "70%" : "55%",
            maxHeight: "600px",
            borderTopLeftRadius: "24px",
            borderTopRightRadius: "24px",
            background: "linear-gradient(180deg, #141028 0%, #0D0A1E 100%)",
            border: "1px solid rgba(124,58,237,0.2)",
            borderBottom: "none",
            boxShadow: "0 -20px 60px rgba(0,0,0,0.5), 0 -4px 20px rgba(124,58,237,0.15)",
            overflow: "hidden",
          }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center"
                style={{ background: "rgba(124,58,237,0.15)", border: "1px solid rgba(124,58,237,0.3)" }}>
                <ShoppingBag className="w-4 h-4" style={{ color: "#A078FF" }} />
              </div>
              <div>
                <h3 className="font-heading font-black text-base text-white">Vibe Shop</h3>
                <p className="text-[10px] text-white/30 font-medium tracking-wider">EXCLUSIVE DROPS</p>
              </div>
            </div>
            <button
              onTouchStart={(e) => e.stopPropagation()}
              onClick={onClose}
              className="w-9 h-9 rounded-full flex items-center justify-center transition-all hover:bg-white/5"
              style={{
                minWidth: 36, minHeight: 36,
                touchAction: "manipulation",
                color: "rgba(255,255,255,0.5)",
              }}
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Shop items grid */}
          <div className="p-4 space-y-3 overflow-y-auto" style={{ maxHeight: "calc(100% - 70px)" }}>
            {SHOP_ITEMS.map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.id}
                  className="rounded-2xl p-4 flex items-start gap-4 transition-all hover:brightness-110"
                  style={{
                    background: "rgba(255,255,255,0.03)",
                    border: `1px solid ${item.color}20`,
                  }}
                >
                  <div
                    className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{
                      background: `${item.color}15`,
                      border: `1px solid ${item.color}30`,
                    }}
                  >
                    <Icon className="w-5 h-5" style={{ color: item.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-sm text-white mb-0.5">{item.name}</h4>
                    <p className="text-[11px] text-white/40 leading-relaxed mb-2">{item.description}</p>
                    <span
                      className="inline-block px-2.5 py-1 rounded-full text-[9px] font-black tracking-wider"
                      style={{
                        background: `${item.color}12`,
                        border: `1px solid ${item.color}25`,
                        color: item.color,
                      }}
                    >
                      {item.action}
                    </span>
                  </div>
                </div>
              );
            })}

            {/* CTA section */}
            <div
              className="rounded-2xl p-5 text-center"
              style={{
                background: "linear-gradient(135deg, rgba(124,58,237,0.1), rgba(0,212,240,0.08))",
                border: "1px solid rgba(124,58,237,0.2)",
              }}
            >
              <p className="text-xs font-bold text-white/60 mb-3">
                More exclusive drops coming soon to the Vibe Shop.
              </p>
              <Link
                to="/upgrade"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full font-black text-[11px] tracking-wider transition-all hover:brightness-110"
                style={{
                  background: "linear-gradient(135deg, #7C3AED, #A078FF)",
                  color: "#fff",
                  boxShadow: "0 0 20px rgba(124,58,237,0.3)",
                }}
              >
                <Sparkles className="w-3 h-3" />
                Upgrade for Early Access
              </Link>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}