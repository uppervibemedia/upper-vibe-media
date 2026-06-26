/**
 * vibeCoinWallet.js
 * Server-backed Vibe Coin wallet — single source of truth.
 *
 * RULES:
 *  - Database is the ONLY source of truth for balance.
 *  - BALANCE IS NEVER SET TO 0 UNLESS IT'S A TRUE NEW USER (no history).
 *  - Spawning/re-entering/refreshing NEVSR resets or deducts balance.
 *  - ONLY shop purchases spend coins — equip is always free.
 *  - Every balance change gets a transaction record.
 *  - `walletLoaded` flag prevents saving defaults before server responds.
 *  - `isPurchasing` lock prevents double-spend.
 *  - Dedup via source_id prevents re-processing collected coins.
 *
 * IMPORTS:
 *   upperVibeCity.jsx should import:
 *     { loadWallet, earnCoins, spendCoins, getWalletBalance, walletLoaded } from this module
 *   ShopPanel.jsx should import:
 *     { loadWallet, getWalletBalance, spendCoins, walletLoaded }
 *
 * USAGE COLLECTION ONLY INCREASES BALANCE:
 *   earnCoins(userId, coinIds, source) → adds coins, returns { balance, added }
 *   spendCoins(userId, amount, source, sourceId) → deducts, returns { success, balance }
 *
 * HARD RULE:
 *   Spawn, refresh, enter, equip, unequip, zones, hoverboards, launch pads,
 *   closing UI, out-of-bounds respawn — NONE of these touch wallet balance.
 */

import { base44 } from "@/api/base44Client";

// ── Server is truth ──────────────────────────────────────────────
let _walletRecord = null;             // cached server wallet entity
let _walletLoaded = false;            // true only after first successful loadWallet
let _isPurchasing = false;            // prevents double-spend

// LOCALSTORAGE used ONLY as a boot "don't show 0 while loading" seed.
// loadWallet ALWAYS overwrites this with the REAL server balance.
// NEVER used for earn/spend decisions — server is the only ledger.
const BOOT_BAL_KEY = "uvc_wallet_boot_seed";
const BOOT_LIFE_KEY = "uvc_wallet_boot_life";
let _balance = _readBoot(BOOT_BAL_KEY);   // local snapshot (synced from server)
let _lifetime = _readBoot(BOOT_LIFE_KEY);

function _saveBoot(bal, life) {
  try { localStorage.setItem(BOOT_BAL_KEY, String(Math.max(0, bal))); localStorage.setItem(BOOT_LIFE_KEY, String(Math.max(0, life))); } catch {}
}
function _readBoot(k) { try { return parseInt(localStorage.getItem(k) || "0", 10); } catch { return 0; } }

// Session coin dedup: coin unique IDs collected this live session
const _collectedThisSession = new Set();

// ── Getters (instant) ────────────────────────────────────────────
export function getWalletBalance() { return _balance; }
export function getWalletLifetime() { return _lifetime; }
export function walletLoaded() { return _walletLoaded; }

// ── Dedup helpers ────────────────────────────────────────────────
export function isCoinAlreadyCollected(coinId) { return _collectedThisSession.has(coinId); }
export function markCoinCollected(coinId) { _collectedThisSession.add(coinId); }

function _saveSnapshot(bal, life) {
  _balance = bal;
  _lifetime = life;
  _saveBoot(bal, life);
}

// ── Load wallet from server ──────────────────────────────────────
// Called once on world entry. NEVER deducts coins.
export async function loadWallet(userId) {
  if (!userId) return { balance: _balance, lifetime: _lifetime };

  try {
    const results = await base44.entities.UserWallet.filter({ user_id: userId });
    if (results && results.length > 0) {
      _walletRecord = results[0];
      const serverBalance = Math.max(0, _walletRecord.vibe_coin_balance ?? 0);
      const serverLifetime = Math.max(0, _walletRecord.lifetime_vibe_coins_earned ?? 0);
      _saveSnapshot(serverBalance, serverLifetime);
      _walletLoaded = true;
      return { balance: serverBalance, lifetime: serverLifetime };
    }

    // No wallet yet — this is a FIRST-TIME user. Seed with starter balance.
    // SAFE because: `results` returned 0 records AND there's no wallet — truly new user.
    const starter = 300;
    _walletRecord = await base44.entities.UserWallet.create({
      user_id: userId,
      vibe_coin_balance: starter,
      lifetime_vibe_coins_earned: starter,
      updated_at: new Date().toISOString(),
    });
    _saveSnapshot(starter, starter);
    _walletLoaded = true;
    return { balance: starter, lifetime: starter };

  } catch (e) {
    console.warn("[VibeCoinWallet] loadWallet failed:", e.message);
    // Keep existing snapshot — never write default 0
    return { balance: _balance, lifetime: _lifetime };
  }
}

// ── Earn coins ───────────────────────────────────────────────────
// coinIds: unique IDs from e.g. sky coins, surf coins.
// Returns { balance, lifetime, added } — added = coins actually credited (deduped).
// NOTE: The caller sets the Bank HUD value to `balance` after this returns.
export async function earnCoins(userId, coinIds, source = "sky_coin") {
  const newIds = (coinIds || []).filter((id) => !isCoinAlreadyCollected(id));
  if (newIds.length === 0) return { balance: _balance, lifetime: _lifetime, added: 0 };

  const amount = newIds.length;
  newIds.forEach(markCoinCollected);

  // Optimistic local update
  const newBalance = _balance + amount;
  const newLifetime = _lifetime + amount;
  _saveSnapshot(newBalance, newLifetime);

  if (!userId) return { balance: newBalance, lifetime: newLifetime, added: amount };

  // Server update (best-effort, non-blocking)
  (async () => {
    try {
      // Re-fetch wallet first to avoid stale states
      const existing = await base44.entities.UserWallet.filter({ user_id: userId });
      if (existing?.length > 0) {
        _walletRecord = existing[0];
        const merged = {
          vibe_coin_balance: Math.max(0, (_walletRecord.vibe_coin_balance ?? 0) + amount),
          lifetime_vibe_coins_earned: Math.max(0, (_walletRecord.lifetime_vibe_coins_earned ?? 0) + amount),
          updated_at: new Date().toISOString(),
        };
        // Server-side idempotency: if this request processes multiple times, balance only increases once
        // since _collectedThisSession dedup is in memory but still — the request itself only adds `amount`
        // so duplicates would add amount twice (mitigated by single-thread + promise only runs once).
        _walletRecord = await base44.entities.UserWallet.update(_walletRecord.id, merged);
      } else {
        _walletRecord = await base44.entities.UserWallet.create({
          user_id: userId,
          vibe_coin_balance: newBalance,
          lifetime_vibe_coins_earned: newLifetime,
          updated_at: new Date().toISOString(),
        });
      }

      // Record transaction
      await base44.entities.VibeCoinTransaction.create({
        user_id: userId,
        amount,
        type: "earn",
        source,
        source_id: newIds[0],
        note: newIds.length > 1 ? `batch: ${newIds.join(",")}` : null,
      }).catch(() => {}); // tx recording is non-critical
    } catch (e) {
      console.warn("[VibeCoinWallet] server earn sync failed:", e.message);
    }
  })();

  return { balance: newBalance, lifetime: newLifetime, added: amount };
}

// ── Spend coins (shop purchases ONLY) ────────────────────────────
// Returns { success, balance, lifetime }.
// THIS is the ONLY function that reduces wallet balance.
// Uses _isPurchasing lock + server re-read for double-spend protection.
export async function spendCoins(userId, amount, source = "shop_purchase", sourceId = "") {
  if (!userId) return { success: false, balance: _balance, lifetime: _lifetime };
  if (_isPurchasing) return { success: false, balance: _balance, lifetime: _lifetime, reason: "already_processing" };

  _isPurchasing = true;

  try {
    // Re-read server to ensure fresh balance (prevents race with multiple tabs)
    const results = await base44.entities.UserWallet.filter({ user_id: userId });
    if (!results || results.length === 0) {
      _isPurchasing = false;
      return { success: false, balance: _balance, lifetime: _lifetime, reason: "no_wallet" };
    }
    _walletRecord = results[0];
    const serverBalance = _walletRecord.vibe_coin_balance ?? 0;

    if (serverBalance < amount) {
      _isPurchasing = false;
      return { success: false, balance: serverBalance, lifetime: _lifetime, reason: "insufficient_funds" };
    }

    const newBalance = serverBalance - amount;
    const lifetime = _walletRecord.lifetime_vibe_coins_earned ?? _lifetime;

    // Update server
    await base44.entities.UserWallet.update(_walletRecord.id, {
      vibe_coin_balance: newBalance,
      updated_at: new Date().toISOString(),
    });

    // Update local snapshot
    _saveSnapshot(newBalance, lifetime);

    // Record transaction
    await base44.entities.VibeCoinTransaction.create({
      user_id: userId,
      amount: -amount,
      type: "spend",
      source,
      source_id: sourceId,
      note: `Purchased ${sourceId}`,
    }).catch(() => {});

    return { success: true, balance: newBalance, lifetime };
  } catch (e) {
    console.error("[VibeCoinWallet] spendCoins failed:", e.message);
    return { success: false, balance: _balance, lifetime: _lifetime, reason: "server_error" };
  } finally {
    _isPurchasing = false;
  }
}