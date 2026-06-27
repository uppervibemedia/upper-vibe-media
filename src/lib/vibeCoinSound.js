/**
 * vibeCoinSound.js
 *
 * Lightweight Vibe Coin pickup sound using the Web Audio API.
 * No external files needed — sounds are synthesized.
 *
 * - Soft coin ping (sine, ~800Hz) for normal coins
 * - Brighter sparkle for bonus coins
 * - Cooldown ~80–150ms to prevent spam
 * - Every 5th coin plays a special sparkle sound
 */

let audioCtx = null;

const COOLDOWN_MS = 120;
let lastPlayedAt = 0;
let coinCounter = 0;

function getAudioCtx() {
  if (!audioCtx) {
    try {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    } catch {
      return null;
    }
  }
  // Resume if suspended (needed after idle/sleep on mobile)
  if (audioCtx.state === "suspended") {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

/**
 * Play a Vibe Coin pickup sound.
 * @param {boolean} [isBonus=false] - Whether this is a bonus/rare coin
 */
export function playCoinSound(isBonus = false) {
  const now = Date.now();
  if (now - lastPlayedAt < COOLDOWN_MS) return;
  lastPlayedAt = now;
  coinCounter++;

  const specialEvery = 5;
  const isSpecial = (coinCounter % specialEvery === 0) && coinCounter > 0;

  if (isSpecial) {
    _sparkle();
  } else if (isBonus) {
    _bonusPing();
  } else {
    _normalPing();
  }
}

// ── Normal coin: soft ascending sine ping ────────────────────────────
function _normalPing() {
  const ctx = getAudioCtx();
  if (!ctx) return;

  const now = ctx.currentTime;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(0.28, now + 0.012);
  gain.gain.setValueAtTime(0.28, now + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
  gain.connect(ctx.destination);

  const osc = ctx.createOscillator();
  osc.type = "sine";
  osc.frequency.setValueAtTime(660, now);
  osc.frequency.exponentialRampToValueAtTime(900, now + 0.06);
  osc.frequency.exponentialRampToValueAtTime(680, now + 0.16);
  osc.connect(gain);
  osc.start(now);
  osc.stop(now + 0.18);
}

// ── Bonus coin: brighter triangle ping ───────────────────────────────
function _bonusPing() {
  const ctx = getAudioCtx();
  if (!ctx) return;

  const now = ctx.currentTime;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(0.30, now + 0.01);
  gain.gain.setValueAtTime(0.30, now + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
  gain.connect(ctx.destination);

  // Main tone
  const osc = ctx.createOscillator();
  osc.type = "triangle";
  osc.frequency.setValueAtTime(1050, now);
  osc.frequency.exponentialRampToValueAtTime(1600, now + 0.04);
  osc.frequency.exponentialRampToValueAtTime(1100, now + 0.18);
  osc.connect(gain);
  osc.start(now);
  osc.stop(now + 0.20);

  // Sparkle overtone
  const g2 = ctx.createGain();
  g2.gain.setValueAtTime(0.12, now);
  g2.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
  g2.connect(ctx.destination);
  const osc2 = ctx.createOscillator();
  osc2.type = "sine";
  osc2.frequency.setValueAtTime(2100, now);
  osc2.frequency.exponentialRampToValueAtTime(3000, now + 0.04);
  osc2.connect(g2);
  osc2.start(now);
  osc2.stop(now + 0.14);
}

// ── Every 5th coin: full sparkle chime ───────────────────────────────
function _sparkle() {
  const ctx = getAudioCtx();
  if (!ctx) return;

  const now = ctx.currentTime;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(0.32, now + 0.015);
  gain.gain.setValueAtTime(0.32, now + 0.03);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
  gain.connect(ctx.destination);

  // Warm bell tone
  const osc = ctx.createOscillator();
  osc.type = "triangle";
  osc.frequency.setValueAtTime(880, now);
  osc.frequency.exponentialRampToValueAtTime(1400, now + 0.04);
  osc.connect(gain);
  osc.start(now);
  osc.stop(now + 0.32);

  // Sparkle layer 1
  const g2 = ctx.createGain();
  g2.gain.setValueAtTime(0.18, now);
  g2.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
  g2.connect(ctx.destination);
  const osc2 = ctx.createOscillator();
  osc2.type = "sine";
  osc2.frequency.setValueAtTime(1760, now);
  osc2.frequency.exponentialRampToValueAtTime(2600, now + 0.06);
  osc2.connect(g2);
  osc2.start(now);
  osc2.stop(now + 0.28);

  // Sparkle layer 2
  const g3 = ctx.createGain();
  g3.gain.setValueAtTime(0.08, now + 0.05);
  g3.gain.exponentialRampToValueAtTime(0.001, now + 0.24);
  g3.connect(ctx.destination);
  const osc3 = ctx.createOscillator();
  osc3.type = "sine";
  osc3.frequency.setValueAtTime(2640, now + 0.05);
  osc3.frequency.exponentialRampToValueAtTime(3500, now + 0.07);
  osc3.connect(g3);
  osc3.start(now + 0.05);
  osc3.stop(now + 0.28);
}