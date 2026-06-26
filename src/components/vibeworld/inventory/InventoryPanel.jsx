import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Package, RefreshCw, Rocket, Sparkles, Badge, Award, Zap } from "lucide-react";
import { INVENTORY_CATEGORIES, getCategoryLabel, getItemConfig, isPersonalHoverboard } from "./inventoryConfig";
import { loadInventory, equipItem, unequipItem } from "./inventoryService";
import { getWalletBalance, getWalletLifetime } from "../wallet/vibeCoinWallet";

const ItemPreview = ({ config }) => {
  if (!config) return "🎁";
  const Icon = {
    Rocket,
    Sparkles,
    Badge,
    Award,
    Zap
  }[config.preview_icon];

  if (Icon) return <Icon className="w-6 h-6" />;
  return config.preview_emoji || "🎁";
};

export default function InventoryPanel({ open, onClose, user, isMobile }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeCategory, setActiveCategory] = useState("all");
  const [equipping, setEquipping] = useState(null); // item id being processed

  const fetchItems = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const records = await loadInventory(user.id);
      setItems(records);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (open) fetchItems();
  }, [open, fetchItems]);

  const handleEquip = async (record) => {
    if (equipping) return;
    setEquipping(record.id);
    try {
      const willEquip = !record.equipped;
      if (willEquip) {
        await equipItem(user.id, record.id, record.item_category, items);
      } else {
        await unequipItem(record.id);
      }
      // Dispatch event so UpperVibeCity can react to equipment changes
      window.dispatchEvent(new CustomEvent('inventoryUpdate', {
        detail: {
          itemId: record.item_id,
          equipped: willEquip,
          category: record.item_category,
        }
      }));
      // Optimistically update UI
      setItems((prev) => prev.map((r) => {
        if (r.item_category === record.item_category) {
          return { ...r, equipped: r.id === record.id ? willEquip : false };
        }
        return r;
      }));
    } catch (e) {
      console.error("Equip failed:", e);
    }
    setEquipping(null);
  };

  const filteredItems = activeCategory === "all"
    ? items
    : items.filter((r) => r.item_category === activeCategory);

  const balance = getWalletBalance();
  const lifetime = getWalletLifetime();

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[300] flex items-end justify-center"
          style={{ background: "rgba(0,0,0,0.65)", backdropFilter: "blur(6px)" }}
          onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
          <motion.div
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            transition={{ type: "spring", damping: 26, stiffness: 280 }}
            style={{
              width: "100%",
              maxWidth: isMobile ? "100%" : "480px",
              maxHeight: isMobile ? "88dvh" : "78vh",
              marginLeft: "env(safe-area-inset-left, 0px)",
              marginRight: "env(safe-area-inset-right, 0px)",
              background: "linear-gradient(160deg,#0d0d22,#0a0a1a)",
              border: "1px solid rgba(155,126,255,0.18)",
              borderRadius: isMobile ? "20px 20px 0 0" : "16px",
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
              paddingBottom: isMobile ? "env(safe-area-inset-bottom, 16px)" : "0",
            }}
          >
            {/* Header */}
            <div style={{ padding: "18px 20px 12px", borderBottom: "1px solid rgba(255,255,255,0.06)", flexShrink: 0 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <Package style={{ width: 16, height: 16, color: "#c4aaff" }} />
                  <span style={{ fontWeight: 900, fontSize: "15px", color: "#fff", letterSpacing: "0.04em" }}>Inventory</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <button onClick={fetchItems} style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.4)", padding: "4px" }}>
                    <RefreshCw style={{ width: 13, height: 13 }} />
                  </button>
                  <button onClick={onClose} style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "50%", width: 30, height: 30, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "rgba(255,255,255,0.5)" }}>
                    <X style={{ width: 14, height: 14 }} />
                  </button>
                </div>
              </div>

              {/* Wallet summary */}
              <div style={{ display: "flex", gap: "10px" }}>
                <div style={{ flex: 1, padding: "8px 12px", borderRadius: "8px", background: "rgba(255,215,0,0.07)", border: "1px solid rgba(255,215,0,0.15)" }}>
                  <div style={{ fontSize: "9px", color: "rgba(255,215,0,0.6)", fontWeight: 700, letterSpacing: "0.08em", marginBottom: "2px" }}>BALANCE</div>
                  <div style={{ fontSize: "18px", fontWeight: 900, color: "#FFD700", lineHeight: 1 }}>✦ {balance.toLocaleString()}</div>
                </div>
                <div style={{ flex: 1, padding: "8px 12px", borderRadius: "8px", background: "rgba(155,126,255,0.07)", border: "1px solid rgba(155,126,255,0.15)" }}>
                  <div style={{ fontSize: "9px", color: "rgba(155,126,255,0.6)", fontWeight: 700, letterSpacing: "0.08em", marginBottom: "2px" }}>LIFETIME EARNED</div>
                  <div style={{ fontSize: "18px", fontWeight: 900, color: "#c4aaff", lineHeight: 1 }}>✦ {lifetime.toLocaleString()}</div>
                </div>
              </div>
            </div>

            {/* Category tabs */}
            <div style={{ display: "flex", gap: "6px", padding: "10px 16px", overflowX: "auto", flexShrink: 0, scrollbarWidth: "none" }}>
              {[{ id: "all", label: "All", emoji: "📦" }, ...INVENTORY_CATEGORIES].map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  style={{
                    flexShrink: 0,
                    padding: "5px 12px",
                    borderRadius: "999px",
                    border: activeCategory === cat.id ? "1px solid rgba(155,126,255,0.5)" : "1px solid rgba(255,255,255,0.08)",
                    background: activeCategory === cat.id ? "rgba(155,126,255,0.18)" : "rgba(255,255,255,0.04)",
                    color: activeCategory === cat.id ? "#c4aaff" : "rgba(255,255,255,0.45)",
                    fontSize: "11px",
                    fontWeight: 700,
                    cursor: "pointer",
                    letterSpacing: "0.03em",
                    whiteSpace: "nowrap",
                  }}
                >
                  {cat.emoji} {cat.label}
                </button>
              ))}
            </div>

            {/* Item list */}
            <div style={{ flex: 1, overflowY: "auto", padding: "4px 16px 16px" }}>
              {loading && (
                <div style={{ display: "flex", justifyContent: "center", padding: "32px", color: "rgba(255,255,255,0.3)", fontSize: "13px" }}>
                  Loading inventory…
                </div>
              )}

              {!loading && filteredItems.length === 0 && (
                <div style={{ textAlign: "center", padding: "32px 16px", color: "rgba(255,255,255,0.3)" }}>
                  <div style={{ fontSize: "28px", marginBottom: "8px" }}>📦</div>
                  <div style={{ fontSize: "13px", fontWeight: 600, marginBottom: "4px" }}>No items yet</div>
                  <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.2)" }}>Collect Vibe Coins to unlock items</div>
                </div>
              )}

              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {filteredItems.map((record) => {
                  const config = getItemConfig(record.item_id);
                  const isEquipping = equipping === record.id;
                  return (
                    <div
                      key={record.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "12px",
                        padding: "12px 14px",
                        borderRadius: "10px",
                        background: record.equipped ? "rgba(155,126,255,0.12)" : "rgba(255,255,255,0.03)",
                        border: record.equipped ? "1px solid rgba(155,126,255,0.3)" : "1px solid rgba(255,255,255,0.05)",
                        transition: "all 0.2s",
                      }}
                    >
                      {/* Preview */}
                      <div style={{ width: 42, height: 42, borderRadius: "8px", background: "rgba(255,255,255,0.06)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "22px", flexShrink: 0, color: config?.preview_color || 'rgba(255,255,255,0.7)' }}>
                        <ItemPreview config={config} />
                      </div>

                      {/* Info */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                       <div style={{ fontWeight: 800, fontSize: "13px", color: "#fff", marginBottom: "2px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                         {record.item_name}
                       </div>
                       <div style={{ fontSize: "10px", color: "rgba(255,255,255,0.35)", letterSpacing: "0.04em", textTransform: "uppercase" }}>
                         {getCategoryLabel(record.item_category)}
                         {config?.rarity && <span style={{ marginLeft: "6px", color: config.rarity === "rare" ? "#FFD700" : "rgba(255,255,255,0.25)" }}>• {config.rarity}</span>}
                       </div>
                       {isPersonalHoverboard(record.item_id) && (
                         <div style={{ fontSize: "9px", color: "rgba(0,229,255,0.5)", marginTop: "2px" }}>
                           City free-roam · Not Neon Surf
                         </div>
                       )}
                      </div>

                      {/* Equip button — hoverboards get specific personal-board labels */}
                      {(() => {
                       const isBoard = isPersonalHoverboard(record.item_id);
                       const label = isEquipping ? "…"
                         : isBoard
                           ? (record.equipped ? "Equipped" : "Equip")
                           : (record.equipped ? "Equipped" : "Equip");
                       return (
                         <button
                           onClick={() => handleEquip(record)}
                           disabled={!!equipping}
                           style={{
                             padding: "6px 14px",
                             borderRadius: "999px",
                             border: record.equipped ? "1px solid rgba(0,229,255,0.5)" : "1px solid rgba(255,255,255,0.12)",
                             background: record.equipped
                               ? (isBoard ? "rgba(0,229,255,0.15)" : "rgba(155,126,255,0.22)")
                               : "rgba(255,255,255,0.06)",
                             color: record.equipped
                               ? (isBoard ? "#00E5FF" : "#c4aaff")
                               : "rgba(255,255,255,0.5)",
                             fontSize: "11px",
                             fontWeight: 800,
                             cursor: equipping ? "default" : "pointer",
                             flexShrink: 0,
                             letterSpacing: "0.04em",
                             opacity: isEquipping ? 0.5 : 1,
                             transition: "all 0.2s",
                             whiteSpace: "nowrap",
                           }}
                         >
                           {label}
                         </button>
                       );
                      })()}
                    </div>
                  );
                })}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}