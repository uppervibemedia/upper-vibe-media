/**
 * shopConfig.js — Basic purchasable items for the Upper Vibe Shop.
 * Kept separate from inventoryConfig (starter items) for clarity.
 */

export const SHOP_ITEMS = [
  // ── Hoverboards ──────────────────────────────────────────────
  {
    id: "shop_hoverboard_basic",
    name: "Basic Vibe Board",
    category: "hoverboard",
    price: 25,
    description: "Your personal hoverboard for city free-roam. Separate from Neon Surf.",
    preview_icon: "Rocket",
    preview_model: "basic",
    rarity: "common",
  },
  {
    id: "shop_hoverboard_neon_blue",
    name: "Neon Blue Board",
    category: "hoverboard",
    price: 75,
    description: "Electric blue personal hoverboard. Equip from Inventory.",
    preview_icon: "Rocket",
    preview_color: "#00D4F0",
    preview_model: "neon_blue",
    rarity: "uncommon",
  },
  {
    id: "shop_hoverboard_cosmic",
    name: "Cosmic Surf Board",
    category: "hoverboard",
    price: 150,
    description: "Deep space-themed personal board for free-roam.",
    preview_icon: "Rocket",
    preview_color: "#9B4FFF",
    preview_model: "cosmic",
    rarity: "rare",
  },

  // ── Movement Gear ─────────────────────────────────────────────
  {
    id: "shop_jetpack",
    name: "Jetpack",
    category: "movement_gear",
    price: 5000,
    description: "Fly through Upper Vibe City with a futuristic back-mounted jetpack.",
    preview_icon: "Flame",
    preview_color: "#FFD36E",
    rarity: "premium",
  },

  // ── Avatar Glows ──────────────────────────────────────────────
  {
    id: "shop_glow_starter",
    name: "Starter Aura",
    category: "avatar_glow",
    price: 20,
    description: "A subtle blue aura for your avatar.",
    preview_icon: "Sparkles",
    preview_color: "#00AADD",
    rarity: "common",
  },
  {
    id: "shop_glow_purple",
    name: "Purple Aura",
    category: "avatar_glow",
    price: 50,
    description: "A purple energy aura around your avatar.",
    preview_icon: "Sparkles",
    preview_color: "#9B4FFF",
    rarity: "uncommon",
  },
  {
    id: "shop_glow_gold",
    name: "Gold Aura",
    category: "avatar_glow",
    price: 100,
    description: "Premium golden aura effect.",
    preview_icon: "Sparkles",
    preview_color: "#FFD700",
    rarity: "rare",
  },

  // ── Nameplates ──────────────────────────────────────────────────
  {
    id: "shop_nameplate_neon",
    name: "Neon Nameplate",
    category: "nameplate",
    price: 30,
    description: "Cyan neon nameplate above your avatar.",
    preview_icon: "Badge",
    preview_color: "#00D4F0",
    rarity: "common",
  },
  {
    id: "shop_nameplate_gold",
    name: "Gold Nameplate",
    category: "nameplate",
    price: 100,
    description: "Premium gold nameplate. Rarity status.",
    preview_icon: "Badge",
    preview_color: "#FFD700",
    rarity: "rare",
  },

  // ── Badges ──────────────────────────────────────────────────────
  {
    id: "shop_badge_citizen",
    name: "Founding Citizen Badge",
    category: "badge",
    price: 50,
    description: "Rewarded to early members of Upper Vibe City.",
    preview_icon: "Award",
    rarity: "rare",
  },
  {
    id: "shop_badge_high_vibe",
    name: "High Vibe Badge",
    category: "badge",
    price: 75,
    description: "Show your commitment to the highest frequency.",
    preview_icon: "Zap",
    rarity: "uncommon",
  },
];

export const SHOP_CATEGORIES = [
  { id: "hoverboard",  label: "Hoverboards", emoji: "🛹" },
  { id: "movement_gear", label: "Movement Gear", emoji: "🚀" },
  { id: "avatar_glow", label: "Auras",        emoji: "✨" },
  { id: "nameplate",   label: "Nameplates",   emoji: "🪪" },
  { id: "badge",       label: "Badges",        emoji: "🏅" },
];

export function getShopItem(itemId) {
  return SHOP_ITEMS.find((i) => i.id === itemId) || null;
}