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
    preview_emoji: "💙",
  },
  {
    id: "nameplate_default",
    name: "Default Nameplate",
    category: "nameplate",
    description: "Clean white nameplate shown above your avatar.",
    rarity: "common",
    starter: true,
    preview_emoji: "🪪",
  },
  {
    id: "hoverboard_basic",
    name: "Basic Hoverboard",
    category: "hoverboard",
    description: "The standard cyan Neon Surf board.",
    rarity: "common",
    starter: true,
    preview_emoji: "🛹",
  },
  {
    id: "badge_citizen",
    name: "Vibe Citizen",
    category: "badge",
    description: "Awarded to early members of Upper Vibe City.",
    rarity: "rare",
    starter: true,
    preview_emoji: "🏅",
  },
];

/** Look up an item config by id */
export function getItemConfig(itemId) {
  return STARTER_ITEMS.find((i) => i.id === itemId) || null;
}

/** Return label for a category id */
export function getCategoryLabel(categoryId) {
  return INVENTORY_CATEGORIES.find((c) => c.id === categoryId)?.label || categoryId;
}