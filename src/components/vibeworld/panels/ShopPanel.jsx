import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ShoppingBag, Check, Zap, Rocket, Sparkles, Badge, Award } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { loadWallet, getWalletBalance, getWalletLifetime, spendCoins } from "../wallet/vibeCoinWallet";
import { loadInventory, equipItem } from "../inventory/inventoryService";
import { SHOP_ITEMS, SHOP_CATEGORIES, getShopItem } from "./shopConfig";
import { getCategoryLabel } from "../inventory/inventoryConfig";

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

const STATUS = {
  BUY: "buy",
  OWNED: "owned",
  INSUFFICIENT: "insufficient",
  BUYING: "buying",
};

export default function ShopPanel({ open, onClose, isMobile, user, currentUserId: uid }) {
  const userId = user?.id || uid;
  const [balance, setBalance] = useState(0);
  const [lifetime, setLifetime] = useState(0);
  const [owned, setOwned] = useState({}); // { itemId: inventoryRecord }
  const [inventoryRecords, setInventoryRecords] = useState([]);
  const [activeCategory, setActiveCategory] = useState("all");
  const [processing, setProcessing] = useState(null);
  const [message, setMessage] = useState(null);

  const refresh = useCallback(async () => {
    const w = await loadWallet(userId);
    setBalance(w.balance);
    setLifetime(w.lifetime);
    const inv = await loadInventory(userId);
    setInventoryRecords(inv);
    const m = {};
    inv.forEach((r) => { m[r.item_id] = r; });
    setOwned(m);
  }, [userId]);

  useEffect(() => {
    if (open) refresh();
  }, [open, refresh]);

  const handleBuy = async (item) => {
    if (processing) return;
    if (owned[item.id]) return; // already owned (non-consumable)
    if (balance < item.price) {
      setMessage("Not enough Vibe Coins.");
      setTimeout(() => setMessage(null), 2500);
      return;
    }
    setProcessing(item.id);

    const result = await spendCoins(userId, item.price, "shop_purchase", item.id);
    if (!result.success) {
      setMessage("Not enough Vibe Coins.");
      setTimeout(() => setMessage(null), 2500);
      setProcessing(null);
      return;
    }

    // Add to inventory
    try {
      await base44.entities.UserInventory.create({
        user_id: userId,
        item_id: item.id,
        item_name: item.name,
        item_category: item.category,
        equipped: false,
        acquired_at: new Date().toISOString(),
      });
    } catch (e) {
      console.warn("[ShopPanel] inventory create failed:", e.message);
    }

    setProcessing(null);
    setBalance(result.balance);
    setMessage("Purchased ✓");
    window.dispatchEvent(new CustomEvent("vibeCoinsShopPurchase", { detail: { balance: result.balance } }));
    setTimeout(() => {
      setMessage(null);
      refresh();
    }, 1500);
  };

  const handleEquip = async (itemId, record) => {
    if (processing) return;
    setProcessing(itemId);
    const cat = record.item_category;
    const willEquip = !record.equipped;
    await equipItem(userId, record.id, cat, inventoryRecords);
    // Update local owned state
    setOwned((prev) => {
      const next = { ...prev };
      Object.keys(next).forEach((k) => {
        if (next[k].item_category === cat) next[k] = { ...next[k], equipped: false };
      });
      if (next[itemId]) next[itemId] = { ...next[itemId], equipped: willEquip };
      return next;
    });
    setMessage(willEquip ? "Equipped ✓" : "Unequipped");
    setTimeout(() => setMessage(null), 1500);
    setProcessing(null);
  };

  const filtered = activeCategory === "all"
    ? SHOP_ITEMS
    : SHOP_ITEMS.filter((i) => i.category === activeCategory);

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
            height: isMobile ? "76%" : "60%",
            maxHeight: "640px",
            borderTopLeftRadius: "24px",
            borderTopRightRadius: "24px",
            background: "linear-gradient(180deg, #141028 0%, #0D0A1E 100%)",
            border: "1px solid rgba(255,196,96,0.2)",
            borderBottom: "none",
            boxShadow: "0 -20px 60px rgba(0,0,0,0.5), 0 -4px 20px rgba(255,196,96,0.12)",
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
          }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-white/5 flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center"
                style={{ background: "rgba(255,196,96,0.15)", border: "1px solid rgba(255,196,96,0.3)" }}>
                <ShoppingBag className="w-4 h-4" style={{ color: "#FFD700" }} />
              </div>
              <div>
                <h3 className="font-heading font-black text-base text-white">Upper Vibe Shop</h3>
              </div>
            </div>
            <button
              onTouchStart={(e) => e.stopPropagation()}
              onClick={onClose}
              className="w-9 h-9 rounded-full flex items-center justify-center transition-all hover:bg-white/5"
              style={{ minWidth: 36, minHeight: 36, touchAction: "manipulation", color: "rgba(255,255,255,0.5)" }}
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Wallet */}
          <div className="flex items-center px-5 py-3 gap-3 flex-shrink-0"
            style={{ background: "rgba(255,196,96,0.04)", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full"
              style={{ background: "rgba(255,215,0,0.1)", border: "1px solid rgba(255,215,0,0.2)" }}>
              <span className="text-lg">✦</span>
              <span className="font-black" style={{ color: "#FFD700", fontSize: "16px" }}>{balance.toLocaleString()}</span>
              <span style={{ color: "rgba(255,255,255,0.35)", fontSize: "11px" }}>VIBE COINS</span>
            </div>
          </div>

          {/* Category tabs */}
          <div className="flex gap-2 px-5 py-2.5 overflow-x-auto flex-shrink-0 hide-scrollbar">
            <CategoryTab
              label="All"
              emoji="🛍️"
              active={activeCategory === "all"}
              onClick={() => setActiveCategory("all")}
              isMobile={isMobile}
            />
            {SHOP_CATEGORIES.map((cat) => (
              <CategoryTab
                key={cat.id}
                label={cat.label}
                emoji={cat.emoji}
                active={activeCategory === cat.id}
                onClick={() => setActiveCategory(cat.id)}
                isMobile={isMobile}
              />
            ))}
          </div>

          {/* Items */}
          <div className="flex-1 overflow-y-auto px-5 pb-6 pt-2" style={{ maxHeight: "calc(100% - 160px)" }}>
            {filtered.length === 0 && (
              <div className="flex items-center justify-center h-full" style={{ color: "rgba(255,255,255,0.3)", fontSize: "12px" }}>
                No items in this category
              </div>
            )}
            <div className="flex flex-col gap-3">
              {filtered.map((item) => {
                const owner = owned[item.id];
                const isOwned = !!owner;
                const isEquipped = owner?.equipped;
                const status = processing === item.id ? STATUS.BUYING
                  : isOwned ? STATUS.OWNED
                  : balance >= item.price ? STATUS.BUY
                  : STATUS.INSUFFICIENT;
                return (
                  <div key={item.id} className="rounded-2xl p-3.5 flex items-center gap-3"
                    style={{
                      background: isEquipped ? "rgba(155,126,255,0.1)" : "rgba(255,255,255,0.03)",
                      border: isEquipped ? "1px solid rgba(155,126,255,0.25)" : "1px solid rgba(255,255,255,0.06)",
                    }}
                  >
                    {/* Preview */}
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ background: "rgba(255,255,255,0.06)", fontSize: "26px", color: item.preview_color || 'rgba(255,255,255,0.7)' }}>
                      <ItemPreview config={item} />
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-sm text-white truncate flex items-center gap-1.5">
                        {item.name}
                        {isOwned && <Check className="w-3.5 h-3.5" style={{ color: "#4ADE80", flexShrink: 0 }} />}
                      </div>
                      <div className="text-[10px]" style={{ color: "rgba(255,255,255,0.35)" }}>
                        {getCategoryLabel(item.category)}
                        <span style={{ color: "rgba(255,255,255,0.2)" }}> · {item.rarity}</span>
                      </div>
                    </div>

                    {/* Action */}
                    {status === STATUS.BUYING ? (
                      <div className="px-4 py-2 rounded-full text-[11px] font-black"
                        style={{ background: "rgba(0,229,255,0.12)", color: "#00E5FF" }}>
                        …
                      </div>
                    ) : status === STATUS.OWNED ? (
                      <button
                        onTouchStart={(e) => e.stopPropagation()}
                        onClick={() => handleEquip(item.id, owner)}
                        disabled={!!processing}
                        className="px-4 py-2 rounded-full text-[11px] font-black transition-all hover:brightness-110 active:scale-95"
                        style={{
                          background: isEquipped ? "rgba(0,229,255,0.14)" : "rgba(255,255,255,0.08)",
                          border: isEquipped ? "1px solid rgba(0,229,255,0.45)" : "1px solid rgba(255,255,255,0.14)",
                          color: isEquipped ? "#00E5FF" : "rgba(255,255,255,0.6)",
                          touchAction: "manipulation",
                        }}
                      >
                        {isEquipped ? "Equipped" : "Equip"}
                      </button>
                    ) : status === STATUS.INSUFFICIENT ? (
                      <div className="px-3 py-2 rounded-full text-[10px] font-black whitespace-nowrap"
                        style={{ background: "rgba(255,75,75,0.1)", color: "rgba(255,75,75,0.7)" }}>
                        ✦ {item.price}
                      </div>
                    ) : (
                      <button
                        onTouchStart={(e) => e.stopPropagation()}
                        onClick={() => handleBuy(item)}
                        className="flex items-center gap-1 px-4 py-2 rounded-full text-[11px] font-black transition-all hover:brightness-110 active:scale-95"
                        style={{
                          background: "linear-gradient(135deg,#FFD700AA,#FFC060AA)",
                          color: "#0a0420",
                          touchAction: "manipulation",
                        }}
                      >
                        <Zap className="w-3 h-3" /> ✦{item.price}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Message toast */}
          <AnimatePresence>
            {message && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                className="absolute left-4 right-4 pointer-events-none text-center py-3 rounded-2xl"
                style={{
                  bottom: "calc(env(safe-area-inset-bottom, 0px) + 24px)",
                  background: "rgba(0,0,0,0.75)",
                  backdropFilter: "blur(12px)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  color: message.includes("Not enough") ? "rgba(255,75,75,0.85)" : message.includes("Equipped") ? "#00E5FF" : "#4ADE80",
                  fontSize: "13px",
                  fontWeight: 800,
                  letterSpacing: "0.06em",
                }}
              >
                {message}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function CategoryTab({ label, emoji, active, onClick, isMobile }) {
  return (
    <button
      onTouchStart={onClick ? (e) => e.stopPropagation() : undefined}
      onClick={onClick}
      className="flex-shrink-0 rounded-full font-bold transition-all"
      style={{
        padding: isMobile ? "5px 12px" : "6px 16px",
        background: active ? "rgba(255,196,96,0.18)" : "rgba(255,255,255,0.04)",
        border: active ? "1px solid rgba(255,196,96,0.45)" : "1px solid rgba(255,255,255,0.08)",
        color: active ? "#FFD700" : "rgba(255,255,255,0.45)",
        fontSize: isMobile ? "11px" : "12px",
        touchAction: "manipulation",
        whiteSpace: "nowrap",
      }}
    >
      {emoji} {label}
    </button>
  );
}