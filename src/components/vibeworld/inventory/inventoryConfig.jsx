/**
 * inventoryConfig.js
 * Defines all inventory categories and starter/default items.
 * Items listed here with starter:true are auto-granted to all users.
 */

export const INVENTORY_CATEGORIES = [
  { id: "avatar_glow",  label: "Avatar Glows",   emoji: "✨" },
  { id: "aura",         label: "Auras",           emoji: "🌀" },
  { id: "nameplate",    label: "Nameplates",      emoji: "🪪" },
  { id: "hoverboard",   label: "Hoverboards",     emoji: "🛹" },
  { id: "badge",        label: "Badges",          emoji: "🏅" },
  { id: "clothing",     label: "Clothing",        emoji: "👕" },
  { id: "emote",        label: "Emotes",          emoji: "🎭" },
];

export const STARTER_ITEMS = [
  {
    id: "glow_starter",
    name: "Starter Glow",
    category: "avatar_glow",
    description: "A subtle blue glow for your avatar.",
    rarity: "common",
    starter: true,
    preview_icon: "Sparkles",
    preview_color: "#00AADD",
  },
  {
    id: "nameplate_default",
    name: "Default Nameplate",
    category: "nameplate",
    description: "Clean white nameplate shown above your avatar.",
    rarity: "common",
    starter: true,
    preview_icon: "Badge",
  },
  {
    id: "hoverboard_basic",
    name: "Basic Vibe Board",
    category: "hoverboard",
    description: "Your personal hoverboard. Equip it from Inventory to free-roam Upper Vibe City.",
    rarity: "common",
    starter: true,
    preview_icon: "Rocket",
    preview_model: "basic",
  },
  {
    id: "badge_citizen",
    name: "Vibe Citizen",
    category: "badge",
    description: "Awarded to early members of Upper Vibe City.",
    rarity: "rare",
    starter: true,
    preview_icon: "Award",
  },
];

// ── Shop hoverboards (purchasable with Vibe Coins, not starter grants) ─────
export const SHOP_HOVERBOARDS = [
  { id: "hoverboard_neon_blue", name: "Neon Blue Board", price: 150, rarity: "uncommon", description: "Electric blue personal hoverboard for city free-roam.", preview_icon: "Rocket", preview_color: "#00D4F0", preview_model: "neon_blue" },
  { id: "hoverboard_cosmic", name: "Cosmic Surf Board",  price: 350, rarity: "rare", description: "Deep space-themed personal board. Turn heads in the plaza.", preview_icon: "Rocket", preview_color: "#9B4FFF", preview_model: "cosmic" },
  { id: "hoverboard_gold_aura", name: "Gold Aura Board", price: 600, rarity: "epic", description: "Premium gold-finish personal board. Only for the dedicated.", preview_icon: "Rocket", preview_color: "#FFD700", preview_model: "gold" },
];

/** Look up an item config by id (checks starter items + shop boards) */
export function getItemConfig(itemId) {
  return STARTER_ITEMS.find((i) => i.id === itemId)
    || SHOP_HOVERBOARDS.find((i) => i.id === itemId)
    || null;
}

/** Returns true if the item id is a personal hoverboard (not Neon Surf) */
export function isPersonalHoverboard(itemId) {
  return itemId?.startsWith("hoverboard_");
}

/** Return label for a category id */
export function getCategoryLabel(categoryId) {
  return INVENTORY_CATEGORIES.find((c) => c.id === categoryId)?.label || categoryId;
}