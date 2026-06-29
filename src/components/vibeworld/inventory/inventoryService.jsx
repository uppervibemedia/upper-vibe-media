/**
 * inventoryService.js
 * Load, grant starter items, and equip/unequip items in UserInventory.
 */

import { base44 } from "@/api/base44Client";
import { STARTER_ITEMS } from "./inventoryConfig";

const sameEquipGroup = (a, b) => {
  const auraGroup = ["avatar_glow", "aura"];
  return a === b || (auraGroup.includes(a) && auraGroup.includes(b));
};

// ── Load all inventory records for user ──────────────────────
export async function loadInventory(userId) {
  if (!userId) return [];
  try {
    const items = await base44.entities.UserInventory.filter({ user_id: userId });
    return items || [];
  } catch (e) {
    console.warn("[Inventory] load failed:", e.message);
    return [];
  }
}

// ── Grant starter items (idempotent — safe to call on every login) ──
export async function grantStarterItems(userId) {
  if (!userId) return;
  try {
    const existing = await base44.entities.UserInventory.filter({ user_id: userId });
    const ownedIds = new Set((existing || []).map((r) => r.item_id));

    const toGrant = STARTER_ITEMS.filter((item) => item.starter && !ownedIds.has(item.id));
    for (const item of toGrant) {
      await base44.entities.UserInventory.create({
        user_id: userId,
        item_id: item.id,
        item_name: item.name,
        item_category: item.category,
        equipped: false,
        acquired_at: new Date().toISOString(),
      });
    }
  } catch (e) {
    console.warn("[Inventory] grantStarterItems failed:", e.message);
  }
}

// ── Equip an item (unequips others in same category) ─────────
export async function equipItem(userId, inventoryRecordId, category, allRecords) {
  if (!userId || !inventoryRecordId) return;
  try {
    // Unequip all other items in this category
    const toUnequip = (allRecords || []).filter(
      (r) => sameEquipGroup(r.item_category, category) && r.equipped && r.id !== inventoryRecordId
    );
    for (const r of toUnequip) {
      await base44.entities.UserInventory.update(r.id, { equipped: false });
    }
    // Equip the selected item
    await base44.entities.UserInventory.update(inventoryRecordId, { equipped: true });
  } catch (e) {
    console.warn("[Inventory] equipItem failed:", e.message);
    throw e;
  }
}

// ── Unequip an item ───────────────────────────────────────────
export async function unequipItem(inventoryRecordId) {
  if (!inventoryRecordId) return;
  try {
    await base44.entities.UserInventory.update(inventoryRecordId, { equipped: false });
  } catch (e) {
    console.warn("[Inventory] unequipItem failed:", e.message);
    throw e;
  }
}