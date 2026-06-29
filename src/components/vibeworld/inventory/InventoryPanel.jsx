import React, { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Package, RefreshCw, Rocket, Sparkles, Badge, Award, Zap } from "lucide-react";
import { getCategoryLabel, getItemConfig, isPersonalHoverboard } from "./inventoryConfig";
import { loadInventory, equipItem, unequipItem } from "./inventoryService";
import { getShopItem } from "../panels/shopConfig";
import { getWalletBalance, getWalletLifetime } from "../wallet/vibeCoinWallet";

const CATEGORY_TABS = [
  { id: "all", label: "All", emoji: "📦", categories: null },
  { id: "hoverboards", label: "Hoverboards", emoji: "🛹", categories: ["hoverboard"] },
  { id: "auras", label: "Auras", emoji: "✨", categories: ["avatar_glow", "aura"] },
  { id: "nameplates", label: "Nameplates", emoji: "🪪", categories: ["nameplate"] },
  { id: "badges", label: "Badges", emoji: "🏅", categories: ["badge"] },
];

const sameEquipGroup = (a, b) => {
  const auraGroup = ["avatar_glow", "aura"];
  return a === b || (auraGroup.includes(a) && auraGroup.includes(b));
};

const itemConfigFor = (record) => getItemConfig(record.item_id) || getShopItem(record.item_id) || null;

const getDisplayName = (record, config) => {
  const name = record.item_name || config?.name || "Inventory Item";
  if (name.trim().toLowerCase() !== "basic vibe board") return name;
  const id = String(record.item_id || "").toLowerCase();
  if (id.includes("city")) return "Basic Vibe Board — City Edition";
  if (id.includes("neon_surf") || id.includes("surf_edition")) return "Basic Vibe Board — Neon Surf Edition";
  return "Basic Vibe Board";
};

const getUsageNote = (record, config) => {
  if (record.item_category === "hoverboard") return "City free-roam";
  if (record.item_category === "avatar_glow" || record.item_category === "aura") return "Avatar aura effect";
  if (record.item_category === "nameplate") return "Profile name display";
  if (record.item_category === "badge") return "Profile badge";
  return config?.description || "Owned inventory item";
};

const ItemPreview = ({ record, config }) => {
  const color = config?.preview_color || "#00D4F0";
  if (record.item_category === "hoverboard") {
    return (
      <div style={{ width: 34, height: 18, position: "relative", transform: "rotate(-10deg)" }}>
        <div style={{ position: "absolute", inset: "5px 2px", borderRadius: 999, background: `linear-gradient(90deg, ${color}, #A078FF)`, boxShadow: `0 0 12px ${color}77` }} />
        <div style={{ position: "absolute", left: 7, right: 7, top: 8, height: 2, borderRadius: 999, background: "rgba(255,255,255,0.75)" }} />
      </div>
    );
  }
  if (record.item_category === "avatar_glow" || record.item_category === "aura") {
    return <div style={{ width: 30, height: 30, borderRadius: "50%", border: `2px solid ${color}`, boxShadow: `0 0 18px ${color}99, inset 0 0 12px ${color}55`, display: "flex", alignItems: "center", justifyContent: "center" }}><Sparkles className="w-3.5 h-3.5" /></div>;
  }
  if (record.item_category === "nameplate") {
    return <div style={{ minWidth: 34, height: 18, borderRadius: 999, border: `1px solid ${color}`, background: `${color}22`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 8, fontWeight: 900 }}>UV</div>;
  }
  if (record.item_category === "badge") return <Award className="w-6 h-6" />;

  const Icon = { Rocket, Sparkles, Badge, Award, Zap }[config?.preview_icon] || Package;
  return <Icon className="w-6 h-6" />;
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
        if (sameEquipGroup(r.item_category, record.item_category)) {
          return { ...r, equipped: r.id === record.id ? willEquip : false };
        }
        return r;
      }));
    } catch (e) {
      console.error("Equip failed:", e);
    }
    setEquipping(null);
  };

  const uniqueItems = useMemo(() => {
    const byKey = new Map();
    for (const record of items) {
      const config = itemConfigFor(record);
      const displayName = getDisplayName(record, config).toLowerCase().trim();
      const key = `${record.item_category}:${displayName}`;
      const existing = byKey.get(key);
      if (!existing || record.equipped || (!existing.equipped && record.updated_date > existing.updated_date)) {
        byKey.set(key, record);
      }
    }
    return Array.from(byKey.values());
  }, [items]);

  const filteredItems = useMemo(() => {
    const tab = CATEGORY_TABS.find((cat) => cat.id === activeCategory);
    if (!tab?.categories) return uniqueItems;
    return uniqueItems.filter((r) => tab.categories.includes(r.item_category));
  }, [activeCategory, uniqueItems]);

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
            <div
              className="hide-scrollbar"
              style={{
                display: "flex",
                gap: "8px",
                padding: "10px 16px",
                overflowX: "auto",
                whiteSpace: "nowrap",
                WebkitOverflowScrolling: "touch",
                flexShrink: 0,
                scrollbarWidth: "none",
                touchAction: "pan-x",
              }}
            >
              {CATEGORY_TABS.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  style={{
                    flexShrink: 0,
                    padding: "7px 14px",
                    minHeight: 34,
                    borderRadius: "999px",
                    border: activeCategory === cat.id ? "1px solid rgba(155,126,255,0.5)" : "1px solid rgba(255,255,255,0.08)",
                    background: activeCategory === cat.id ? "rgba(155,126,255,0.18)" : "rgba(255,255,255,0.04)",
                    color: activeCategory === cat.id ? "#c4aaff" : "rgba(255,255,255,0.55)",
                    fontSize: "11px",
                    fontWeight: 800,
                    cursor: "pointer",
                    letterSpacing: "0.03em",
                    whiteSpace: "nowrap",
                    touchAction: "manipulation",
                  }}
                >
                  {cat.emoji} {cat.label}
                </button>
              ))}
            </div>

            {/* Item list */}
            <div style={{ flex: 1, overflowY: "auto", padding: "4px 16px 16px", WebkitOverflowScrolling: "touch", overscrollBehavior: "contain" }}>
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
                  const config = itemConfigFor(record);
                  const isEquipping = equipping === record.id;
                  const isBoard = record.item_category === "hoverboard" || isPersonalHoverboard(record.item_id);
                  const displayName = getDisplayName(record, config);
                  const usageNote = getUsageNote(record, config);
                  const rarity = config?.rarity || "common";
                  const equippedColor = isBoard ? "#00E5FF" : "#c4aaff";
                  const label = isEquipping ? "…" : (record.equipped ? "Equipped" : "Equip");
                  return (
                    <div
                      key={`${record.item_category}-${displayName}-${record.id}`}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "12px",
                        padding: isMobile ? "12px" : "12px 14px",
                        borderRadius: "14px",
                        background: record.equipped ? "rgba(0,229,255,0.08)" : "rgba(255,255,255,0.03)",
                        border: record.equipped ? "1px solid rgba(0,229,255,0.28)" : "1px solid rgba(255,255,255,0.06)",
                        transition: "all 0.2s",
                        minWidth: 0,
                      }}
                    >
                      {/* Preview */}
                      <div style={{ width: 48, height: 48, borderRadius: "12px", background: record.equipped ? "rgba(0,229,255,0.08)" : "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.06)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, color: config?.preview_color || 'rgba(255,255,255,0.75)' }}>
                        <ItemPreview record={record} config={config} />
                      </div>

                      {/* Info */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0, marginBottom: 3 }}>
                          <div style={{ fontWeight: 850, fontSize: "13px", color: "#fff", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {displayName}
                          </div>
                          <span style={{ flexShrink: 0, fontSize: 9, fontWeight: 900, color: record.equipped ? equippedColor : "rgba(255,255,255,0.32)", border: `1px solid ${record.equipped ? "rgba(0,229,255,0.25)" : "rgba(255,255,255,0.08)"}`, borderRadius: 999, padding: "2px 6px", background: record.equipped ? "rgba(0,229,255,0.08)" : "rgba(255,255,255,0.03)" }}>
                            {record.equipped ? "Equipped" : "Owned"}
                          </span>
                        </div>
                        <div style={{ fontSize: "10px", color: "rgba(255,255,255,0.42)", letterSpacing: "0.04em", textTransform: "uppercase", marginBottom: 2 }}>
                          {getCategoryLabel(record.item_category)}
                          <span style={{ marginLeft: "6px", color: rarity === "rare" || rarity === "epic" ? "#FFD700" : "rgba(255,255,255,0.32)" }}>• {rarity}</span>
                        </div>
                        <div style={{ fontSize: "10px", color: isBoard ? "rgba(0,229,255,0.58)" : "rgba(255,255,255,0.32)", lineHeight: 1.25 }}>
                          {usageNote}
                        </div>
                      </div>

                      {/* Equip button */}
                      <button
                        onClick={() => handleEquip(record)}
                        disabled={!!equipping}
                        style={{
                          padding: "0 14px",
                          minHeight: 40,
                          borderRadius: "999px",
                          border: record.equipped ? `1px solid ${isBoard ? "rgba(0,229,255,0.5)" : "rgba(155,126,255,0.5)"}` : "1px solid rgba(255,255,255,0.14)",
                          background: record.equipped ? (isBoard ? "rgba(0,229,255,0.15)" : "rgba(155,126,255,0.22)") : "rgba(255,255,255,0.06)",
                          color: record.equipped ? equippedColor : "rgba(255,255,255,0.68)",
                          fontSize: "11px",
                          fontWeight: 900,
                          cursor: equipping ? "default" : "pointer",
                          flexShrink: 0,
                          letterSpacing: "0.04em",
                          opacity: isEquipping ? 0.5 : 1,
                          transition: "all 0.2s",
                          whiteSpace: "nowrap",
                          touchAction: "manipulation",
                        }}
                      >
                        {label}
                      </button>
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