/**
 * vibeCoinWallet.js
 * Server-backed Vibe Coin wallet.
 * - Upserts a UserWallet record tied to the user
 * - Records a VibeCoinTransaction per earn/spend
 * - Deduplicates via source_id (coin's unique ID)
 * - Falls back to localStorage when offline/unauthenticated
 */

import { base44 } from "@/api/base44Client";

const LOCAL_BALANCE_KEY = "uvc_wallet_balance";
const LOCAL_LIFETIME_KEY = "uvc_wallet_lifetime";
const STARTER_BALANCE = 300; // Vibe Coins granted on first wallet creation
let _starterGranted = false; // only seed once per session

// ── Local fallback ────────────────────────────────────────────
export function getLocalBalance() {
  try { return parseInt(localStorage.getItem(LOCAL_BALANCE_KEY) || "0", 10); } catch { return 0; }
}
function setLocalBalance(n) {
  try { localStorage.setItem(LOCAL_BALANCE_KEY, String(Math.max(0, n))); } catch {}
}
function getLocalLifetime() {
  try { return parseInt(localStorage.getItem(LOCAL_LIFETIME_KEY) || "0", 10); } catch { return 0; }
}
function setLocalLifetime(n) {
  try { localStorage.setItem(LOCAL_LIFETIME_KEY, String(Math.max(0, n))); } catch {}
}

// ── Dedup: track coin IDs collected this spawn cycle in memory ──
const _collectedThisSession = new Set();

export function isCoinAlreadyCollected(coinId) {
  return _collectedThisSession.has(coinId);
}

export function markCoinCollected(coinId) {
  _collectedThisSession.add(coinId);
}

// ── Load wallet from server ───────────────────────────────────
let _walletRecord = null; // cached wallet entity record

export async function loadWallet(userId) {
  if (!userId) return { balance: getLocalBalance(), lifetime: getLocalLifetime() };
  try {
    const results = await base44.entities.UserWallet.filter({ user_id: userId });
    if (results && results.length > 0) {
      _walletRecord = results[0];
      // If server has more, sync local up
      const serverBalance = _walletRecord.vibe_coin_balance ?? 0;
      const serverLifetime = _walletRecord.lifetime_vibe_coins_earned ?? 0;
      setLocalBalance(serverBalance);
      setLocalLifetime(serverLifetime);
      return { balance: serverBalance, lifetime: serverLifetime };
    } else {
      // First time — seed wallet with starter balance if localStorage is empty
      const localBal = (getLocalBalance() > 0 || _starterGranted) ? getLocalBalance() : STARTER_BALANCE;
      const localLife = (getLocalLifetime() > 0 || _starterGranted) ? getLocalLifetime() : STARTER_BALANCE;
      _starterGranted = true;
      setLocalBalance(localBal);
      setLocalLifetime(localLife);
      _walletRecord = await base44.entities.UserWallet.create({
        user_id: userId,
        vibe_coin_balance: localBal,
        lifetime_vibe_coins_earned: localLife,
        updated_at: new Date().toISOString(),
      });
      return { balance: localBal, lifetime: localLife };
    }
  } catch (e) {
    console.warn("[VibeCoinWallet] loadWallet failed, using local:", e.message);
    return { balance: getLocalBalance(), lifetime: getLocalLifetime() };
  }
}

// ── Earn coins ───────────────────────────────────────────────
// coinIds: array of unique coin IDs from the 3D world
// Returns { balance, lifetime, added } — added = coins actually credited (deduped)
export async function earnCoins(userId, coinIds, source = "sky_coin") {
  // Dedup: filter out already-collected coins
  const newIds = coinIds.filter((id) => !isCoinAlreadyCollected(id));
  if (newIds.length === 0) return { balance: getLocalBalance(), lifetime: getLocalLifetime(), added: 0 };

  const amount = newIds.length; // each coin = 1 Vibe Coin
  newIds.forEach(markCoinCollected);

  // Update local immediately (optimistic)
  const newBalance = getLocalBalance() + amount;
  const newLifetime = getLocalLifetime() + amount;
  setLocalBalance(newBalance);
  setLocalLifetime(newLifetime);

  if (!userId) return { balance: newBalance, lifetime: newLifetime, added: amount };

  // Server update (best-effort, non-blocking)
  (async () => {
    try {
      // 1) Upsert wallet
      if (_walletRecord?.id) {
        _walletRecord = await base44.entities.UserWallet.update(_walletRecord.id, {
          vibe_coin_balance: newBalance,
          lifetime_vibe_coins_earned: newLifetime,
          updated_at: new Date().toISOString(),
        });
      } else {
        // Re-fetch in case another tab created it
        const existing = await base44.entities.UserWallet.filter({ user_id: userId });
        if (existing?.length > 0) {
          _walletRecord = existing[0];
          const merged = {
            vibe_coin_balance: (_walletRecord.vibe_coin_balance ?? 0) + amount,
            lifetime_vibe_coins_earned: (_walletRecord.lifetime_vibe_coins_earned ?? 0) + amount,
            updated_at: new Date().toISOString(),
          };
          _walletRecord = await base44.entities.UserWallet.update(_walletRecord.id, merged);
        } else {
          _walletRecord = await base44.entities.UserWallet.create({
            user_id: userId,
            vibe_coin_balance: newBalance,
            lifetime_vibe_coins_earned: newLifetime,
            updated_at: new Date().toISOString(),
          });
        }
      }

      // 2) Record transaction (batch as one record with source_ids in note)
      await base44.entities.VibeCoinTransaction.create({
        user_id: userId,
        amount,
        type: "earn",
        source,
        source_id: newIds[0], // primary dedup key
        note: newIds.length > 1 ? `batch: ${newIds.join(",")}` : null,
      });
    } catch (e) {
      console.warn("[VibeCoinWallet] server sync failed:", e.message);
    }
  })();

  return { balance: newBalance, lifetime: newLifetime, added: amount };
}

// ── Spend coins (shop purchases) ──────────────────────────────
// Returns { success, balance, lifetime } — success = false if insufficient funds
export async function spendCoins(userId, amount, source = "shop_purchase", sourceId = "") {
  if (!userId) return { success: false, balance: getLocalBalance(), lifetime: getLocalLifetime() };

  const currentBalance = getLocalBalance();
  if (currentBalance < amount) return { success: false, balance: currentBalance, lifetime: getLocalLifetime() };

  const newBalance = currentBalance - amount;
  const lifetime = getLocalLifetime();
  setLocalBalance(newBalance);

  // Server update (best-effort)
  (async () => {
    try {
      if (_walletRecord?.id) {
        _walletRecord = await base44.entities.UserWallet.update(_walletRecord.id, {
          vibe_coin_balance: newBalance,
          updated_at: new Date().toISOString(),
        });
      }
      await base44.entities.VibeCoinTransaction.create({
        user_id: userId,
        amount: -amount,
        type: "spend",
        source,
        source_id: sourceId,
        note: `Purchased ${sourceId}`,
      });
    } catch (e) {
      console.warn("[VibeCoinWallet] spendCoins server sync failed:", e.message);
    }
  })();

  return { success: true, balance: newBalance, lifetime };
}

// ── Get current wallet state ──────────────────────────────────
export function getWalletBalance() { return getLocalBalance(); }
export function getWalletLifetime() { return getLocalLifetime(); }