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
    preview_emoji: "🛹",
    rarity: "common",
  },
  {
    id: "shop_hoverboard_neon_blue",
    name: "Neon Blue Board",
    category: "hoverboard",
    price: 75,
    description: "Electric blue personal hoverboard. Equip from Inventory.",
    preview_emoji: "💙",
    rarity: "uncommon",
  },
  {
    id: "shop_hoverboard_cosmic",
    name: "Cosmic Surf Board",
    category: "hoverboard",
    price: 150,
    description: "Deep space-themed personal board for free-roam.",
    preview_emoji: "🌌",
    rarity: "rare",
  },

  // ── Avatar Glows ──────────────────────────────────────────────
  {
    id: "shop_glow_starter",
    name: "Starter Glow",
    category: "avatar_glow",
    price: 20,
    description: "A subtle blue glow for your avatar.",
    preview_emoji: "💙",
    rarity: "common",
  },
  {
    id: "shop_glow_purple",
    name: "Purple Aura Glow",
    category: "avatar_glow",
    price: 50,
    description: "A purple energy aura around your avatar.",
    preview_emoji: "🟣",
    rarity: "uncommon",
  },
  {
    id: "shop_glow_gold",
    name: "Gold Aura Glow",
    category: "avatar_glow",
    price: 100,
    description: "Premium golden glow effect.",
    preview_emoji: "✨",
    rarity: "rare",
  },

  // ── Nameplates ──────────────────────────────────────────────────
  {
    id: "shop_nameplate_neon",
    name: "Neon Nameplate",
    category: "nameplate",
    price: 30,
    description: "Cyan neon nameplate above your avatar.",
    preview_emoji: "🪪",
    rarity: "common",
  },
  {
    id: "shop_nameplate_gold",
    name: "Gold Nameplate",
    category: "nameplate",
    price: 100,
    description: "Premium gold nameplate. Rarity status.",
    preview_emoji: "🏆",
    rarity: "rare",
  },

  // ── Badges ──────────────────────────────────────────────────────
  {
    id: "shop_badge_citizen",
    name: "Founding Citizen Badge",
    category: "badge",
    price: 50,
    description: "Rewarded to early members of Upper Vibe City.",
    preview_emoji: "🏅",
    rarity: "rare",
  },
  {
    id: "shop_badge_high_vibe",
    name: "High Vibe Badge",
    category: "badge",
    price: 75,
    description: "Show your commitment to the highest frequency.",
    preview_emoji: "⚡",
    rarity: "uncommon",
  },
];

export const SHOP_CATEGORIES = [
  { id: "hoverboard",  label: "Hoverboards", emoji: "🛹" },
  { id: "avatar_glow", label: "Avatar Glows", emoji: "✨" },
  { id: "nameplate",   label: "Nameplates",   emoji: "🪪" },
  { id: "badge",       label: "Badges",        emoji: "🏅" },
];

export function getShopItem(itemId) {
  return SHOP_ITEMS.find((i) => i.id === itemId) || null;
}