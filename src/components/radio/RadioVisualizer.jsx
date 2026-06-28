/**
 * RadioVisualizer — Upper Vibe Media v9
 *
 * ARCHITECTURE:
 * ─────────────────────────────────────────────────────────────────────────────
 * One shared AudioContext + AnalyserNode, connected once per audio element.
 * sourceNode is cached so createMediaElementSource is never called twice on
 * the same element (which throws InvalidStateError).
 *
 * iOS: connecting createMediaElementSource to the MAIN audio element on iOS
 * Safari routes audio through Web Audio, which can interfere with system
 * output (AirPlay, BT). We still do it because:
 *   1. The user explicitly opened the visualizer (user-gesture context)
 *   2. We connect source → analyser → destination so audio still plays
 *   3. AirPlay/BT typically still works when destination is connected
 *
 * Non-iOS: same approach — source → analyser → destination.
 *
 * We NEVER create a second audio element (mirror). One element, one context.
 *
 * CORS: radio streams from CDNs usually lack CORS headers. We set
 * crossOrigin="anonymous" on the audio element before loading. If CORS is
 * blocked, getByteFrequencyData returns all zeros — we detect this and show
 * the debug overlay with frequencyDataChanging: false.
 */

import React, { useRef, useEffect, useCallback, useState } from "react";

const PREF_KEY = "uvm_radio_viz_v9";
const DEBUG_KEY = "uvm_radio_viz_debug";

const MODES = [
  { id: "spectrum", label: "Stargate Rings", icon: "⬡" },
  { id: "waveform", label: "Petal Spiral",   icon: "✾" },
  { id: "energy",   label: "Solar Mandala",  icon: "✺" },
  { id: "cosmic",   label: "Cosmic Burst",   icon: "✦" },
  { id: "neon",     label: "Neon Pulse",     icon: "◎" },
  { id: "tunnel",   label: "Freq Tunnel",    icon: "⊙" },
  { id: "plasma",   label: "Plasma Orbit",   icon: "◈" },
  { id: "drift",    label: "Particle Drift", icon: "·" },
];

const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent) ||
  (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
const isSafari = /Safari\//.test(navigator.userAgent) &&
  !/Chrome\//.test(navigator.userAgent) && !/Chromium\//.test(navigator.userAgent);
const getDpr = () => Math.min(window.devicePixelRatio || 1, 2);

// ── Smoothed frequency data ───────────────────────────────────────────────────
const _sm = { data: null };
const IOS_GAIN = isIOS ? 2.5 : 1.0;

function readFreqData(an) {
  const bufLen = an.frequencyBinCount;
  const raw = new Uint8Array(bufLen);
  an.getByteFrequencyData(raw);

  if (!_sm.data || _sm.data.length !== bufLen) {
    _sm.data = new Float32Array(bufLen);
  }
  const sm = _sm.data;
  for (let i = 0; i < bufLen; i++) {
    const r = Math.min(1, (raw[i] / 255) * IOS_GAIN);
    // Fast attack, slow release — captures transients
    sm[i] = r > sm[i] ? r * 0.9 + sm[i] * 0.1 : sm[i] * 0.65 + r * 0.35;
  }
  return { sm, raw, bufLen };
}

function getBass(sm, n)   { const e = Math.max(1, Math.floor(n * 0.05)); let v = 0; for (let i = 0; i < e; i++) v += sm[i]; return Math.min(1, v / e); }
function getMid(sm, n)    { const lo = Math.floor(n * 0.05), hi = Math.floor(n * 0.30); let v = 0; for (let i = lo; i < hi; i++) v += sm[i]; return Math.min(1, v / Math.max(1, hi - lo)); }
function getTreble(sm, n) { const lo = Math.floor(n * 0.30), hi = Math.floor(n * 0.70); let v = 0; for (let i = lo; i < hi; i++) v += sm[i]; return Math.min(1, v / Math.max(1, hi - lo)); }
function getAvg(sm, n)    { let v = 0; for (let i = 0; i < n; i++) v += sm[i]; return Math.min(1, v / n); }

// Check if RAW data (not smoothed) has any non-zero values — CORS blocks return all-zeros
function isRawLive(raw, bufLen) {
  let nz = 0;
  const check = Math.min(bufLen, 128);
  for (let i = 0; i < check; i++) if (raw[i] > 2) nz++;
  return nz > 4;
}

// ── Audio-driven spin accumulator ─────────────────────────────────────────────
const _spin = { acc: 0, lastMs: 0 };
function tickSpin(energy) {
  const now = Date.now();
  const dt = Math.min(0.05, (now - _spin.lastMs) / 1000);
  _spin.lastMs = now;
  _spin.acc += dt * (0.05 + energy * 5.0);
  return _spin.acc;
}

// ── Beat detection ────────────────────────────────────────────────────────────
const _beat = { lastMs: 0, hist: new Float32Array(16), idx: 0, count: 0, detected: false };
function detectBeat(bass) {
  const now = Date.now();
  _beat.hist[_beat.idx % 16] = bass;
  _beat.idx++;
  const avg = _beat.hist.reduce((a, b) => a + b, 0) / 16;
  const thresh = Math.min(0.55, avg * 1.35 + 0.07);
  if (bass > thresh && bass > 0.10 && now - _beat.lastMs > 180) {
    _beat.lastMs = now;
    _beat.count++;
    _beat.detected = true;
    return true;
  }
  _beat.detected = false;
  return false;
}

// ── Draw: Stargate Rings ──────────────────────────────────────────────────────
function drawSpectrum(ctx, W, H, sm, bufLen, bass, beat, color) {
  const cx = W / 2, cy = H / 2;
  const usable = Math.floor(bufLen * 0.70);
  const maxR = Math.min(W, H) * 0.46;
  const spinBase = tickSpin(bass + getMid(sm, bufLen) * 0.4);

  if (beat) {
    const bg = ctx.createRadialGradient(cx, cy, 0, cx, cy, maxR * 1.4);
    bg.addColorStop(0, `rgba(${color},${0.22 + bass * 0.25})`);
    bg.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
  }

  for (let ri = 0; ri < 9; ri++) {
    const frac = (ri + 1) / 9;
    const energy = sm[Math.floor(frac * usable * 0.6)] || 0;
    const radius = maxR * frac * (0.5 + energy * 0.9 + (beat && ri < 4 ? bass * 0.3 : 0));
    if (radius < 2) continue;
    const sides = 3 + ri * 2;
    const dir = ri % 2 === 0 ? 1 : -1;
    const spin = spinBase * (0.35 + ri * 0.14) * dir;
    const hue = 185 + frac * 120 + (spinBase * 6 % 60);

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(spin);
    ctx.beginPath();
    for (let s = 0; s <= sides; s++) {
      const a = (s / sides) * Math.PI * 2;
      const wob = 1 + energy * 0.1 * Math.sin(s * 1.5 + spinBase * 1.8);
      ctx.lineTo(Math.cos(a) * radius * wob, Math.sin(a) * radius * wob);
    }
    ctx.closePath();
    ctx.strokeStyle = `hsla(${hue},100%,68%,${Math.min(1, 0.05 + energy * 0.9 + (beat ? bass * 0.3 : 0))})`;
    ctx.lineWidth = 0.7 + energy * 4.5 + (beat && ri < 3 ? bass * 3 : 0);
    ctx.shadowBlur = beat && ri < 3 ? 24 : energy * 10;
    ctx.shadowColor = `hsla(${hue},100%,68%,0.9)`;
    ctx.stroke();
    ctx.restore();

    if (energy > 0.12 && ri < 8) {
      const nextE = sm[Math.floor(((ri + 2) / 9) * usable * 0.6)] || 0;
      const nextR = maxR * ((ri + 2) / 9) * (0.5 + nextE * 0.9);
      for (let sp = 0; sp < Math.min(2 + Math.floor(bass * 5), 7); sp++) {
        const a = (sp / (2 + Math.floor(bass * 5))) * Math.PI * 2 + spin;
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(a) * radius, cy + Math.sin(a) * radius);
        ctx.lineTo(cx + Math.cos(a) * nextR, cy + Math.sin(a) * nextR);
        ctx.strokeStyle = `hsla(${hue},100%,68%,${energy * 0.35})`;
        ctx.lineWidth = 0.5; ctx.stroke();
      }
    }
  }

  const orbR = bass * 38 + (beat ? 16 : 0);
  if (orbR > 1) {
    const og = ctx.createRadialGradient(cx, cy, 0, cx, cy, orbR * 3.5);
    og.addColorStop(0, `rgba(255,255,255,${0.9 + bass * 0.1})`);
    og.addColorStop(0.35, `rgba(${color},${0.7 + bass * 0.3})`);
    og.addColorStop(1, "rgba(0,0,0,0)");
    ctx.beginPath(); ctx.arc(cx, cy, orbR, 0, Math.PI * 2);
    ctx.fillStyle = og; ctx.fill();
  }
}

// ── Draw: Petal Spiral (uses real time-domain waveform data) ──────────────────
function drawWaveform(ctx, W, H, an, sm, bass, beat, color) {
  const cx = W / 2, cy = H / 2;
  const bufLen = an.frequencyBinCount;

  // Read real time-domain data — this is the actual waveform
  const waveData = new Uint8Array(bufLen);
  an.getByteTimeDomainData(waveData);

  const baseR = Math.min(W, H) * 0.06;
  const maxR  = Math.min(W, H) * 0.44;
  const spin  = tickSpin(bass * 0.7 + getMid(sm, bufLen) * 0.35);

  if (bass > 0.06) {
    const hg = ctx.createRadialGradient(cx, cy, 0, cx, cy, maxR * (0.8 + bass * 0.6));
    hg.addColorStop(0, `rgba(${color},${bass * 0.12})`);
    hg.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = hg; ctx.fillRect(0, 0, W, H);
  }
  if (beat) {
    const bf = ctx.createRadialGradient(cx, cy, 0, cx, cy, maxR);
    bf.addColorStop(0, `rgba(${color},${bass * 0.28})`);
    bf.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = bf; ctx.fillRect(0, 0, W, H);
  }

  // Draw waveform as polar shape — each sample maps to a radius at its angle
  for (let layer = 0; layer < 2; layer++) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(spin * (layer === 0 ? 1 : -0.5));
    ctx.beginPath();

    const pts = Math.min(512, bufLen);
    for (let i = 0; i <= pts; i++) {
      const frac = i / pts;
      const angle = frac * Math.PI * 2;
      // Waveform sample: 128 = silence, deviation = actual audio signal
      const sample = (waveData[Math.floor(frac * bufLen)] - 128) / 128;
      // Also blend in frequency energy for visual richness
      const freqE = sm[Math.floor(frac * bufLen * 0.7)] || 0;
      const r = baseR + maxR * 0.3 + sample * maxR * 0.35 + freqE * maxR * 0.35 + (beat ? bass * 18 : 0);
      ctx.lineTo(Math.cos(angle) * r, Math.sin(angle) * r);
    }
    ctx.closePath();

    if (layer === 0) {
      const fg = ctx.createRadialGradient(0, 0, baseR, 0, 0, maxR);
      fg.addColorStop(0, `rgba(${color},${0.03 + bass * 0.12})`);
      fg.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = fg; ctx.fill();
    } else {
      ctx.shadowBlur = beat ? 30 : bass * 18;
      ctx.shadowColor = `rgba(${color},0.95)`;
      const hue = 185 + bass * 80 + (spin * 12 % 80);
      ctx.strokeStyle = `hsla(${hue},100%,72%,${0.25 + bass * 0.75})`;
      ctx.lineWidth = 0.7 + bass * 2.8 + (beat ? 1.5 : 0);
      ctx.lineJoin = "round"; ctx.stroke();
    }
    ctx.restore();
  }

  if (bass > 0.08) {
    const starR = baseR + bass * Math.min(W, H) * 0.1;
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(spin * 2.2);
    ctx.beginPath();
    for (let s = 0; s < 12; s++) {
      const a = (s / 12) * Math.PI * 2;
      ctx.lineTo(Math.cos(a) * (s % 2 === 0 ? starR : starR * 0.4),
                 Math.sin(a) * (s % 2 === 0 ? starR : starR * 0.4));
    }
    ctx.closePath();
    ctx.strokeStyle = `rgba(255,255,255,${bass * 0.85})`;
    ctx.lineWidth = 1.1; ctx.shadowBlur = 12; ctx.shadowColor = `rgba(${color},1)`; ctx.stroke();
    ctx.restore();
  }

  const dotR = bass * 24 + (beat ? 12 : 0);
  if (dotR > 1) {
    const dg = ctx.createRadialGradient(cx, cy, 0, cx, cy, dotR * 3);
    dg.addColorStop(0, "rgba(255,255,255,1)");
    dg.addColorStop(0.4, `rgba(${color},0.8)`);
    dg.addColorStop(1, "rgba(0,0,0,0)");
    ctx.beginPath(); ctx.arc(cx, cy, dotR, 0, Math.PI * 2);
    ctx.fillStyle = dg; ctx.fill();
  }
}

// ── Draw: Solar Mandala ───────────────────────────────────────────────────────
function drawEnergy(ctx, W, H, sm, bufLen, bass, mid, treble, beat) {
  const cx = W / 2, cy = H / 2;
  const usable = Math.floor(bufLen * 0.70);
  const innerR = Math.min(W, H) * 0.05;
  const maxR   = Math.min(W, H) * 0.44;
  const spinBase = tickSpin(bass * 0.55 + mid * 0.5);

  if (beat) {
    const bg = ctx.createRadialGradient(cx, cy, 0, cx, cy, maxR * 1.6);
    bg.addColorStop(0, `rgba(155,100,255,${0.08 + bass * 0.22})`);
    bg.addColorStop(0.5, `rgba(0,200,220,${bass * 0.07})`);
    bg.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
  }

  for (let layer = 0; layer < 2; layer++) {
    const layerSpin = spinBase * (layer === 0 ? 1 : -0.65) + layer * (Math.PI / 64);

    for (let i = 0; i < 64; i++) {
      const frac = i / 64;
      const energy = sm[Math.floor(frac * usable)] || 0;
      const boost = frac < 0.08 ? 2.2 + bass * 1.6 : frac < 0.35 ? 1.5 + mid * 0.9 : 1.0 + treble * 0.5;
      const v = Math.min(1, energy * boost * (layer === 0 ? 1 : 0.58));
      if (v < 0.02) continue;

      const angle = frac * Math.PI * 2 + layerSpin;
      const r1 = innerR + (beat && frac < 0.1 ? bass * 16 : 0);
      const r2 = innerR + (maxR - innerR) * v;
      if (r2 <= r1 + 2) continue;

      const hue = 185 + frac * 230 + layer * 45 + (spinBase * 10 % 90);
      ctx.save();
      ctx.shadowBlur = v > 0.45 ? 14 + bass * 8 : 2;
      ctx.shadowColor = `hsla(${hue},100%,65%,0.9)`;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(angle) * r1, cy + Math.sin(angle) * r1);
      ctx.lineTo(cx + Math.cos(angle) * r2, cy + Math.sin(angle) * r2);
      ctx.strokeStyle = `hsla(${hue},100%,68%,${0.12 + v * 0.88})`;
      ctx.lineWidth = layer === 0 ? 1.6 + bass * 1.8 : 0.9;
      ctx.lineCap = "round"; ctx.stroke();

      if (v > 0.48) {
        ctx.beginPath();
        ctx.arc(cx + Math.cos(angle) * r2, cy + Math.sin(angle) * r2, v * 3.5, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${hue},100%,90%,${v * 0.88})`; ctx.fill();
      }
      ctx.restore();
    }
  }

  ctx.beginPath(); ctx.arc(cx, cy, innerR, 0, Math.PI * 2);
  ctx.strokeStyle = `rgba(255,255,255,${0.04 + bass * 0.45})`; ctx.lineWidth = 1 + bass * 1.5; ctx.stroke();

  const orbR = bass * 30 + mid * 10 + (beat ? 18 : 0);
  if (orbR > 1) {
    const og = ctx.createRadialGradient(cx, cy, 0, cx, cy, orbR * 4);
    og.addColorStop(0, "rgba(255,255,255,1)");
    og.addColorStop(0.25, `rgba(0,229,255,${0.8 + bass * 0.2})`);
    og.addColorStop(0.6, `rgba(155,100,255,${0.3 + bass * 0.3})`);
    og.addColorStop(1, "rgba(0,0,0,0)");
    ctx.beginPath(); ctx.arc(cx, cy, orbR, 0, Math.PI * 2);
    ctx.fillStyle = og; ctx.fill();
  }
}

// ── Draw: Neon Pulse ──────────────────────────────────────────────────────────
function drawNeonPulse(ctx, W, H, sm, bufLen, bass, mid) {
  const cx = W / 2, cy = H / 2, baseR = Math.min(W, H) * 0.18;
  const spin = tickSpin(bass * 0.6 + mid * 0.4);

  // Concentric rings — radius = pure audio energy
  [
    { r: baseR * (0.7 + bass * 2.5), alpha: Math.min(1, bass * 1.8), w: 1.5 + bass * 9, c: "0,229,255" },
    { r: baseR * (1.0 + mid * 1.4 + bass * 0.8), alpha: Math.min(1, bass * 1.4 + mid * 0.6), w: 1 + bass * 5, c: "155,126,255" },
    { r: baseR * (1.45 + mid * 1.1 + bass * 0.6), alpha: 0.08 + bass * 0.7, w: 0.8 + bass * 2, c: "0,200,220" },
    { r: baseR * (1.85 + mid * 0.9 + bass * 0.4), alpha: 0.04 + bass * 0.3, w: 0.6, c: "200,100,255" },
  ].forEach(rg => {
    if (rg.r <= 2 || rg.alpha <= 0.02) return;
    ctx.beginPath(); ctx.arc(cx, cy, rg.r, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(${rg.c},${rg.alpha})`; ctx.lineWidth = rg.w; ctx.stroke();
  });

  // Expanding shockwave ring on beat
  const sinceBeat = Date.now() - _beat.lastMs;
  if (sinceBeat < 600) {
    const prog = sinceBeat / 600;
    ctx.beginPath(); ctx.arc(cx, cy, baseR * (0.7 + prog * 4), 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(0,229,255,${(1 - prog) * 0.9})`; ctx.lineWidth = (1 - prog) * 12; ctx.stroke();
  }

  // Frequency bars — pure energy, no time offset
  const bars = 80, usable = Math.floor(bufLen * 0.75);
  for (let i = 0; i < bars; i++) {
    const v = sm[Math.floor((i / bars) * usable)] || 0;
    if (v < 0.015) continue;
    const angle = (i / bars) * Math.PI * 2 - Math.PI / 2 + spin;
    const inner = baseR * (0.88 + bass * 0.12);
    const outer = inner + v * baseR * (1.7 + bass * 2.2);
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(angle) * inner, cy + Math.sin(angle) * inner);
    ctx.lineTo(cx + Math.cos(angle) * outer, cy + Math.sin(angle) * outer);
    ctx.strokeStyle = `hsla(${185 + v * 130 + i * 0.7},100%,65%,${0.25 + v * 0.75})`;
    ctx.lineWidth = Math.max(1.2, (W / bars) * 0.5); ctx.lineCap = "round"; ctx.stroke();
  }

  const dotR = bass * 40 + mid * 12;
  if (dotR > 1) {
    const dg = ctx.createRadialGradient(cx, cy, 0, cx, cy, dotR * 4);
    dg.addColorStop(0, `rgba(0,229,255,${0.9 + bass * 0.1})`);
    dg.addColorStop(0.3, `rgba(155,100,255,${0.3 + bass * 0.4})`); dg.addColorStop(1, "rgba(0,0,0,0)");
    ctx.beginPath(); ctx.arc(cx, cy, dotR, 0, Math.PI * 2); ctx.fillStyle = dg; ctx.fill();
  }
}

// ── Draw: Freq Tunnel ─────────────────────────────────────────────────────────
function drawTunnel(ctx, W, H, sm, bufLen, bass, mid) {
  const cx = W / 2, cy = H / 2, maxR = Math.min(W, H) * 0.5;
  const beatAge = (Date.now() - _beat.lastMs) / 1000;
  const beatPulse = Math.max(0, 1 - beatAge * 2.2);
  const spinBase = tickSpin(bass * 0.85 + mid * 0.35);

  for (let ri = 14; ri >= 1; ri--) {
    const frac = ri / 14;
    const amp = sm[Math.floor(frac * bufLen * 0.45)] || 0;
    const zoom = bass * 0.9 + beatPulse * 0.55;
    const radius = maxR * frac * (0.6 + zoom * (1 - frac * 0.35));
    if (radius < 3) continue;
    const sides = 5 + ri;
    const rotation = spinBase * (0.45 + (14 - ri) * 0.11);
    const alpha = (1 - frac) * (amp * 0.95 + bass * 0.45 + 0.04);
    if (alpha < 0.015) continue;
    const hue = 185 + frac * 95 + (spinBase * 8 % 55);

    ctx.beginPath();
    for (let si = 0; si <= sides; si++) {
      const a = (si / sides) * Math.PI * 2 + rotation;
      ctx.lineTo(cx + Math.cos(a) * radius, cy + Math.sin(a) * radius);
    }
    ctx.closePath();
    ctx.strokeStyle = `hsla(${hue},100%,68%,${Math.min(1, alpha)})`;
    ctx.lineWidth = 0.6 + amp * 3.5 + (ri < 4 ? beatPulse * 5 : 0); ctx.stroke();

    if (bass > 0.06 && ri < 14) {
      const nextFrac = (ri + 1) / 14;
      const nextR = maxR * nextFrac * (0.6 + zoom * (1 - nextFrac * 0.35));
      const sc = 2 + Math.floor(bass * 6);
      for (let sp = 0; sp < Math.min(sc, 8); sp++) {
        const a = (sp / sc) * Math.PI * 2 + rotation;
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(a) * radius, cy + Math.sin(a) * radius);
        ctx.lineTo(cx + Math.cos(a) * nextR, cy + Math.sin(a) * nextR);
        ctx.strokeStyle = `hsla(${hue},100%,68%,${alpha * 0.38})`; ctx.lineWidth = 0.5; ctx.stroke();
      }
    }
  }

  const dotR = bass * 26 + mid * 14 + beatPulse * 28;
  if (dotR > 1) {
    const dg = ctx.createRadialGradient(cx, cy, 0, cx, cy, dotR * 4.5);
    dg.addColorStop(0, `rgba(0,229,255,${0.95 + bass * 0.05})`);
    dg.addColorStop(0.4, `rgba(155,100,255,${0.3 + bass * 0.3})`); dg.addColorStop(1, "rgba(0,0,0,0)");
    ctx.beginPath(); ctx.arc(cx, cy, dotR, 0, Math.PI * 2); ctx.fillStyle = dg; ctx.fill();
  }
}

// ── Draw: Cosmic Burst ────────────────────────────────────────────────────────
function drawCosmicWaves(ctx, W, H, sm, bufLen, t, particlesRef, bass, beat) {
  const cx = W / 2, cy = H / 2, avg = getAvg(sm, bufLen);
  if (avg > 0.04 && particlesRef.current.length < (beat ? 280 : 160)) {
    const count = beat ? Math.floor(8 + bass * 22) : Math.floor(1 + avg * 5);
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const spd = beat ? 1.1 + bass * 2.2 : 0.25 + avg * 0.9;
      const sr = Math.random() < 0.65 ? 0 : Math.random() * Math.min(W, H) * 0.28;
      particlesRef.current.push({ x: cx + Math.cos(angle) * sr, y: cy + Math.sin(angle) * sr,
        vx: Math.cos(angle) * spd, vy: Math.sin(angle) * spd,
        life: 1, decay: beat ? 0.004 + Math.random() * 0.006 : 0.007 + Math.random() * 0.011,
        size: beat ? 3 + Math.random() * 6 * bass : 1.2 + Math.random() * 3, hue: 160 + Math.random() * 120 });
    }
  }
  const alive = [];
  for (const p of particlesRef.current) {
    p.x += p.vx; p.y += p.vy; p.vx *= 0.984; p.vy *= 0.984; p.life -= p.decay;
    if (p.life <= 0) continue;
    const r = Math.max(0, p.size * p.life);
    if (r > 0) { ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, Math.PI * 2); ctx.fillStyle = `hsla(${p.hue},100%,72%,${p.life * 0.88})`; ctx.fill(); }
    alive.push(p);
  }
  particlesRef.current = alive;
  for (let ri = 1; ri <= 3; ri++) {
    const ringR = Math.min(W, H) * (0.1 * ri) * (1 + avg * 0.65 + bass * 0.45);
    ctx.beginPath(); ctx.arc(cx, cy, ringR, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(0,220,255,${(0.15 - ri * 0.03) + avg * 0.25})`; ctx.lineWidth = 1.2; ctx.stroke();
  }
  const gr = Math.min(W, H) * 0.3 + avg * 32 + bass * 24;
  const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, gr);
  g.addColorStop(0, `rgba(0,220,255,${0.14 + avg * 0.28})`);
  g.addColorStop(0.5, `rgba(155,126,255,${0.05 + avg * 0.09})`); g.addColorStop(1, "rgba(0,0,0,0)");
  ctx.beginPath(); ctx.arc(cx, cy, gr, 0, Math.PI * 2); ctx.fillStyle = g; ctx.fill();
}

// ── Draw: Plasma Orbit ────────────────────────────────────────────────────────
function drawPlasma(ctx, W, H, sm, bufLen, t, particlesRef, bass, beat) {
  const cx = W / 2, cy = H / 2, avg = getAvg(sm, bufLen);
  const orbitRadii = [Math.min(W, H) * 0.14, Math.min(W, H) * 0.26, Math.min(W, H) * 0.38];
  if (avg > 0.04 && particlesRef.current.length < 220) {
    const count = beat ? Math.floor(7 + bass * 14) : Math.floor(1 + avg * 4);
    for (let i = 0; i < count; i++) {
      const orbit = Math.floor(Math.random() * 3), angle = Math.random() * Math.PI * 2;
      const r = orbitRadii[orbit] * (0.8 + Math.random() * 0.4);
      const spd = beat ? 0.85 + bass * 1.6 : 0.3 + avg * 0.7;
      particlesRef.current.push({ x: cx + Math.cos(angle) * r, y: cy + Math.sin(angle) * r,
        vx: (Math.random() - 0.5) * spd * 2, vy: (Math.random() - 0.5) * spd * 2,
        life: 1, decay: 0.006 + Math.random() * 0.010,
        size: 1.2 + Math.random() * (beat ? 5 * bass : 2.2), hue: 180 + orbit * 55 + Math.random() * 40 });
    }
  }
  const alive = [];
  for (const p of particlesRef.current) {
    p.x += p.vx; p.y += p.vy; p.vx *= 0.96; p.vy *= 0.96; p.life -= p.decay;
    if (p.life <= 0) continue;
    const r = Math.max(0, p.size * p.life);
    if (r > 0) { ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, Math.PI * 2); ctx.fillStyle = `hsla(${p.hue},100%,70%,${p.life * 0.86})`; ctx.fill(); }
    alive.push(p);
  }
  particlesRef.current = alive;
  for (let o = 0; o < 3; o++) {
    const amp = sm[Math.floor((o / 3) * bufLen * 0.5)] || 0;
    const r = orbitRadii[o] * (1 + bass * 0.28 + amp * 0.14);
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.strokeStyle = `hsla(${185 + o * 55},100%,62%,${0.14 + amp * 0.38})`; ctx.lineWidth = 1.2; ctx.stroke();
  }
  const gr = Math.min(W, H) * 0.2 + bass * 26;
  const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, gr);
  g.addColorStop(0, `rgba(155,100,255,${0.2 + bass * 0.38})`);
  g.addColorStop(0.5, `rgba(0,200,220,${0.08 + avg * 0.12})`); g.addColorStop(1, "rgba(0,0,0,0)");
  ctx.beginPath(); ctx.arc(cx, cy, gr, 0, Math.PI * 2); ctx.fillStyle = g; ctx.fill();
}

// ── Draw: Particle Drift ──────────────────────────────────────────────────────
function drawDrift(ctx, W, H, sm, bufLen, t, particlesRef, bass, treble) {
  const avg = getAvg(sm, bufLen), isBeat = bass > 0.28;
  if (avg > 0.03 && particlesRef.current.length < 200) {
    const count = isBeat ? Math.floor(5 + bass * 13) : Math.floor(1 + avg * 4);
    for (let i = 0; i < count; i++) {
      const side = Math.floor(Math.random() * 4); let x, y;
      if (side === 0) { x = Math.random() * W; y = H + 10; }
      else if (side === 1) { x = -10; y = Math.random() * H; }
      else if (side === 2) { x = W + 10; y = Math.random() * H; }
      else { x = Math.random() * W; y = -10; }
      const angle = Math.atan2(H / 2 - y, W / 2 - x) + (Math.random() - 0.5) * 1.1;
      const spd = isBeat ? 0.65 + bass * 1.3 : 0.22 + avg * 0.55;
      particlesRef.current.push({ x, y, vx: Math.cos(angle) * spd, vy: Math.sin(angle) * spd,
        life: 1, decay: 0.005 + Math.random() * 0.008,
        size: isBeat ? 1.8 + Math.random() * 5 * bass : 0.8 + Math.random() * 2.2,
        hue: 160 + Math.random() * 130, trail: [] });
    }
  }
  const alive = [];
  for (const p of particlesRef.current) {
    p.trail.push({ x: p.x, y: p.y }); if (p.trail.length > 9) p.trail.shift();
    p.x += p.vx; p.y += p.vy; p.vx *= 0.99; p.vy *= 0.99; p.life -= p.decay;
    if (p.life <= 0) continue;
    for (let ti = 0; ti < p.trail.length - 1; ti++) {
      ctx.beginPath(); ctx.moveTo(p.trail[ti].x, p.trail[ti].y); ctx.lineTo(p.trail[ti + 1].x, p.trail[ti + 1].y);
      ctx.strokeStyle = `hsla(${p.hue},100%,70%,${(ti / p.trail.length) * p.life * 0.42})`; ctx.lineWidth = p.size * 0.48; ctx.stroke();
    }
    const r = Math.max(0, p.size * p.life);
    if (r > 0) { ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, Math.PI * 2); ctx.fillStyle = `hsla(${p.hue},100%,74%,${p.life * 0.9})`; ctx.fill(); }
    alive.push(p);
  }
  particlesRef.current = alive;
  if (avg > 0.03) {
    const gr = Math.min(W, H) * 0.22 + avg * 28;
    const g = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, gr);
    g.addColorStop(0, `rgba(0,200,255,${0.05 + avg * 0.12})`); g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.beginPath(); ctx.arc(W / 2, H / 2, gr, 0, Math.PI * 2); ctx.fillStyle = g; ctx.fill();
  }
}

// ── Fallback (no live data) — gentle animation to show the mode ───────────────
function runFallback(ctx, W, H, t, mode, color, active) {
  const cx = W / 2, cy = H / 2, pulse = active ? 0.55 + Math.sin(t * 1.4) * 0.45 : 0.15;

  if (mode === "spectrum" || mode === "tunnel") {
    const maxR = Math.min(W, H) * 0.44, rings = mode === "tunnel" ? 10 : 7;
    for (let ri = 0; ri < rings; ri++) {
      const frac = (ri + 1) / rings;
      const energy = active ? Math.max(0.03, pulse * (Math.sin(t * 1.6 + ri * 0.8) * 0.5 + 0.5)) : 0.03;
      const sides = mode === "tunnel" ? 6 + ri : 3 + ri * 2;
      const spin = t * (0.15 + ri * 0.07) * (ri % 2 === 0 ? 1 : -1);
      const hue = 185 + frac * 100 + (t * 18 % 55);
      ctx.save(); ctx.translate(cx, cy); ctx.rotate(spin);
      ctx.beginPath();
      for (let s = 0; s <= sides; s++) {
        const a = (s / sides) * Math.PI * 2;
        ctx.lineTo(Math.cos(a) * maxR * frac * (1 + energy * 0.18), Math.sin(a) * maxR * frac * (1 + energy * 0.18));
      }
      ctx.closePath();
      ctx.strokeStyle = `hsla(${hue},100%,68%,${0.08 + energy * 0.45})`; ctx.lineWidth = 0.8 + energy * 2; ctx.stroke();
      ctx.restore();
    }
  } else if (mode === "waveform") {
    const baseR = Math.min(W, H) * 0.1, maxR = Math.min(W, H) * 0.4, spin = t * 0.22;
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(spin); ctx.beginPath();
    for (let i = 0; i <= 200; i++) {
      const frac = i / 200, angle = frac * Math.PI * 2;
      const energy = active ? Math.max(0.04, pulse * (Math.sin(t * 1.7 + frac * Math.PI * 7) * 0.5 + 0.5)) : 0.04;
      const r = baseR + (maxR - baseR) * energy;
      i === 0 ? ctx.moveTo(Math.cos(angle) * r, Math.sin(angle) * r) : ctx.lineTo(Math.cos(angle) * r, Math.sin(angle) * r);
    }
    ctx.closePath();
    const hue = 185 + pulse * 55 + (t * 15 % 75);
    ctx.strokeStyle = `hsla(${hue},100%,72%,${0.4 + pulse * 0.5})`; ctx.lineWidth = 1.2; ctx.stroke();
    ctx.restore();
  } else if (mode === "energy") {
    const maxR = Math.min(W, H) * 0.42, spin = t * 0.18;
    for (let i = 0; i < 48; i++) {
      const frac = i / 48, v = active ? Math.max(0.03, pulse * (Math.sin(t * 1.7 + frac * Math.PI * 6) * 0.5 + 0.5)) : 0.03;
      const angle = frac * Math.PI * 2 + spin;
      const r2 = Math.min(W, H) * 0.06 + (maxR - Math.min(W, H) * 0.06) * v;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(angle) * Math.min(W, H) * 0.06, cy + Math.sin(angle) * Math.min(W, H) * 0.06);
      ctx.lineTo(cx + Math.cos(angle) * r2, cy + Math.sin(angle) * r2);
      ctx.strokeStyle = `hsla(${185 + frac * 220},100%,68%,${0.15 + v * 0.7})`; ctx.lineWidth = 1.5; ctx.lineCap = "round"; ctx.stroke();
    }
  } else {
    // Neon/cosmic/plasma/drift — gentle orb
    const baseR = Math.min(W, H) * 0.18;
    [1, 1.4, 1.8, 2.2].forEach((scale, idx) => {
      const breathe = active ? scale + Math.sin(t * (1.5 + idx * 0.35)) * 0.07 : scale;
      ctx.beginPath(); ctx.arc(cx, cy, baseR * breathe, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(0,220,255,${(0.35 - idx * 0.06) * pulse})`; ctx.lineWidth = 1.5 - idx * 0.25; ctx.stroke();
    });
  }

  // Always show a breathing center dot in fallback
  const dotR = 4 + pulse * 10;
  const dg = ctx.createRadialGradient(cx, cy, 0, cx, cy, dotR * 3.5);
  dg.addColorStop(0, `rgba(${color},${0.8 * pulse})`); dg.addColorStop(1, "rgba(0,0,0,0)");
  ctx.beginPath(); ctx.arc(cx, cy, dotR, 0, Math.PI * 2); ctx.fillStyle = dg; ctx.fill();
}

// ── Main Component ────────────────────────────────────────────────────────────
export { MODES };
export default function RadioVisualizer({ isPlaying, currentSong, themeColor = "0,229,255", mode: modeProp, onCycleMode, radioAudioRef }) {
  const canvasRef    = useRef(null);
  const rafRef       = useRef(null);
  const analyserRef  = useRef(null);
  const audioCtxRef  = useRef(null);
  const sourceRef    = useRef(null);
  const particlesRef = useRef([]);
  const logTimerRef  = useRef(0);
  const debugRef     = useRef({});

  const getSavedMode = () => { try { return localStorage.getItem(PREF_KEY) || "spectrum"; } catch { return "spectrum"; } };
  const [internalMode, setInternalMode] = useState(getSavedMode);
  const mode = modeProp !== undefined ? modeProp : internalMode;
  const debugMode = false;
  const [debugInfo, setDebugInfo] = useState(null);

  useEffect(() => { try { localStorage.setItem(PREF_KEY, mode); } catch {} }, [mode]);

  const cycleMode = () => {
    const idx = MODES.findIndex(m => m.id === mode);
    const next = MODES[(idx + 1) % MODES.length].id;
    if (onCycleMode) onCycleMode(next);
    else setInternalMode(next);
  };

  const tryConnectAnalyser = useCallback(async () => {
    const audio = radioAudioRef?.current;
    if (!audio) {
      console.log("[RadioViz] tryConnect | no radio audio element");
      return false;
    }

    try {
      // Create AudioContext lazily (must be inside user gesture on iOS)
      if (!audioCtxRef.current || audioCtxRef.current.state === "closed") {
        audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
      }

      const ctx = audioCtxRef.current;
      if (ctx.state === "suspended") {
        try { await ctx.resume(); } catch {}
      }

      // Create analyser once
      if (!analyserRef.current) {
        const an = ctx.createAnalyser();
        an.fftSize = 2048;
        an.smoothingTimeConstant = 0.75;
        analyserRef.current = an;
      }

      // Create source node once per audio element — recreating throws InvalidStateError
      if (!sourceRef.current || sourceRef.current._el !== audio) {
        if (sourceRef.current) {
          try { sourceRef.current.disconnect(); } catch {}
          sourceRef.current = null;
        }
        // crossOrigin must be set before src for CORS-gated streams
        if (!audio.crossOrigin) audio.crossOrigin = "anonymous";

        const src = ctx.createMediaElementSource(audio);
        src._el = audio;
        src.connect(analyserRef.current);
        analyserRef.current.connect(ctx.destination);
        sourceRef.current = src;
        console.log("[RadioViz] AudioGraph connected | ctxState:", ctx.state, "| src:", audio.src?.substring(0, 50));
      }

      return true;
    } catch (e) {
      console.warn("[RadioViz] tryConnect failed:", e.name, e.message,
        "| CORS likely blocked — falling back to animated visualizer");
      analyserRef.current = null;
      return false;
    }
  }, [radioAudioRef]);

  const stopLoop = useCallback(() => {
    if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
  }, []);

  const startLoop = useCallback((currentMode, color) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const loop = () => {
      const deviceDpr = getDpr(), rect = canvas.getBoundingClientRect();
      const lW = rect.width || 300, lH = rect.height || 180;
      const pW = Math.round(lW * deviceDpr), pH = Math.round(lH * deviceDpr);
      if (canvas.width !== pW || canvas.height !== pH) { canvas.width = pW; canvas.height = pH; }
      const ctx = canvas.getContext("2d");
      ctx.setTransform(deviceDpr, 0, 0, deviceDpr, 0, 0);
      ctx.clearRect(0, 0, lW, lH);
      const t = Date.now() / 1000;
      const an = analyserRef.current;
      const localCtx = audioCtxRef.current;
      const ctxRunning = localCtx && localCtx.state === "running";
      const audio = radioAudioRef?.current;

      // ── Live path ──
      if (an && ctxRunning) {
        const { sm, raw, bufLen } = readFreqData(an);
        const live = isRawLive(raw, bufLen);
        const bass = getBass(sm, bufLen);
        const mid  = getMid(sm, bufLen);
        const treble = getTreble(sm, bufLen);
        const beat = detectBeat(bass);

        // Update debug ref every frame (cheap)
        if (Date.now() - logTimerRef.current > 3000) {
          logTimerRef.current = Date.now();
          const bpm = (_beat.count / 3 * 60).toFixed(0);
          _beat.count = 0;
          console.log(
            `[RadioViz] LIVE=${live} mode=${currentMode}`,
            `bass=${bass.toFixed(3)} mid=${mid.toFixed(3)}`,
            `ctx=${localCtx?.state} playing=${audio ? !audio.paused : false}`
          );
        }

        if (live) {
          switch (currentMode) {
            case "spectrum": drawSpectrum(ctx, lW, lH, sm, bufLen, bass, beat, color); break;
            case "waveform": drawWaveform(ctx, lW, lH, an, sm, bass, beat, color); break;
            case "energy":   drawEnergy(ctx, lW, lH, sm, bufLen, bass, mid, treble, beat); break;
            case "cosmic":   drawCosmicWaves(ctx, lW, lH, sm, bufLen, t, particlesRef, bass, beat); break;
            case "neon":     drawNeonPulse(ctx, lW, lH, sm, bufLen, bass, mid); break;
            case "tunnel":   drawTunnel(ctx, lW, lH, sm, bufLen, bass, mid); break;
            case "plasma":   drawPlasma(ctx, lW, lH, sm, bufLen, t, particlesRef, bass, beat); break;
            default:         drawDrift(ctx, lW, lH, sm, bufLen, t, particlesRef, bass, treble); break;
          }
        } else {
          // Analyser connected but CORS/stream not giving data — show fallback + log
          if (Date.now() - logTimerRef.current > 3000) {
            logTimerRef.current = Date.now();
            console.warn("[RadioViz] analyser connected but no frequency data — likely CORS block",
              "| audio.paused:", audio?.paused);
          }
          runFallback(ctx, lW, lH, t, currentMode, color, isPlaying);
        }
      } else {
        if (Date.now() - logTimerRef.current > 3000) {
          logTimerRef.current = Date.now();
          console.log("[RadioViz] no analyser | ctxState:", localCtx?.state || "null",
            "| audioEl:", !!audio, "| paused:", audio?.paused);
        }
        runFallback(ctx, lW, lH, t, currentMode, color, isPlaying);
      }

      rafRef.current = requestAnimationFrame(loop);
    };
    loop();
  }, [isPlaying, radioAudioRef, currentSong]);

  // Cleanup local AudioContext on unmount
  useEffect(() => {
    return () => {
      stopLoop();
      try { if (sourceRef.current) sourceRef.current.disconnect(); } catch {}
      try { if (analyserRef.current) analyserRef.current.disconnect(); } catch {}
      try { if (audioCtxRef.current) audioCtxRef.current.close(); } catch {}
      sourceRef.current = null;
      analyserRef.current = null;
      audioCtxRef.current = null;
    };
  }, []);

  // Update debug overlay from ref every 200ms when debug is on
  useEffect(() => {
    if (!debugMode) { setDebugInfo(null); return; }
    const timer = setInterval(() => { setDebugInfo({ ...debugRef.current }); }, 200);
    return () => clearInterval(timer);
  }, [debugMode]);

  // Main effect: reconnect and restart loop when mode/song/playing changes
  useEffect(() => {
    stopLoop();
    particlesRef.current = [];
    _sm.data = null;
    _beat.hist.fill(0); _beat.idx = 0; _beat.count = 0; _beat.lastMs = 0;
    _spin.acc = 0; _spin.lastMs = Date.now();

    tryConnectAnalyser().then(connected => {
      const ctx = audioCtxRef.current;
      if (connected && ctx?.state === "suspended") {
        ctx.resume().catch(() => {}).then(() => setTimeout(() => startLoop(mode, themeColor), 60));
      } else {
        setTimeout(() => startLoop(mode, themeColor), connected ? 60 : 0);
      }
    });
    return stopLoop;
  }, [mode, isPlaying, currentSong?.id, themeColor]);

  // Re-connect when tab becomes visible again
  useEffect(() => {
    const onVisible = async () => {
      if (document.visibilityState !== "visible") return;
      stopLoop(); particlesRef.current = []; _sm.data = null;
      if (audioCtxRef.current?.state === "suspended") {
        try { await audioCtxRef.current.resume(); } catch {}
      }
      const connected = await tryConnectAnalyser();
      setTimeout(() => startLoop(mode, themeColor), connected ? 60 : 0);
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [mode, isPlaying, tryConnectAnalyser, startLoop, stopLoop, themeColor]);

  // Retry connection after playback starts.
  // iOS Safari: AudioContext may take 300-800ms to reach "running" after gesture.
  // We attempt reconnection at 350ms, 800ms, and 1800ms to cover all iOS timing.
  useEffect(() => {
    if (!isPlaying) return;
    const attempt = async (label) => {
      const ctx = audioCtxRef.current;
      if (ctx?.state === "suspended") { try { await ctx.resume(); } catch {} }
      const ctxOk = ctx && ctx.state === "running";
      const needsConnect = !analyserRef.current || !ctxOk;
      console.log(`[RadioViz] retry-${label} | ctxState:`, ctx?.state || "null",
        "| needsConnect:", needsConnect, "| iOS:", isIOS);
      if (needsConnect) {
        const connected = await tryConnectAnalyser();
        if (connected && !rafRef.current) startLoop(mode, themeColor);
      }
    };
    const t1 = setTimeout(() => attempt("350ms"), 350);
    const t2 = setTimeout(() => attempt("800ms"), 800);
    // Third attempt only on iOS Safari where timing is most variable
    const t3 = (isIOS || isSafari) ? setTimeout(() => attempt("1800ms"), 1800) : null;
    return () => { clearTimeout(t1); clearTimeout(t2); if (t3) clearTimeout(t3); };
  }, [isPlaying]);

  const currentModeObj = MODES.find(m => m.id === mode) || MODES[0];

  return (
    <div style={{ width: "100%" }}>
      <div style={{ position: "relative", width: "100%", overflow: "hidden", borderRadius: "inherit" }}>
        <div style={{ paddingTop: "min(56.25%, 260px)", position: "relative" }}>
          <canvas ref={canvasRef} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", display: "block" }} />
          {/* Mode picker moved to parent — spacer kept for layout */}

          {/* ── Debug Overlay ── */}
          {debugMode && debugInfo && (
            <div style={{
              position: "absolute", top: 6, left: 6, right: 6, zIndex: 10,
              background: "rgba(0,0,0,0.82)", borderRadius: 8, padding: "8px 10px",
              fontFamily: "monospace", fontSize: 10, lineHeight: 1.6,
              border: "1px solid rgba(255,255,255,0.12)",
              pointerEvents: "none",
            }}>
              {[
                ["soundPlaying", debugInfo.soundPlaying],
                ["analyserConnected", debugInfo.analyserConnected],
                ["frequencyDataChanging", debugInfo.frequencyDataChanging],
                ["usingFallbackVisualizer", debugInfo.usingFallbackVisualizer],
                ["audioContextState", debugInfo.audioContextState],
                ["sourceNodeReused", debugInfo.sourceNodeReused],
                ["sameAudioElementReused", debugInfo.sameAudioElementReused],
                ["activeVisualizerTheme", debugInfo.activeVisualizerTheme],
                ["bassEnergy", typeof debugInfo.bassEnergy === "number" ? debugInfo.bassEnergy.toFixed(4) : "-"],
                ["beatDetected", debugInfo.beatDetected],
                ["iOS", debugInfo.iOS],
                ["isSafari", debugInfo.isSafari],
              ].map(([k, v]) => (
                <div key={k} style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                  <span style={{ color: "rgba(255,255,255,0.5)" }}>{k}:</span>
                  <span style={{ color: v === true ? "#4eff91" : v === false ? "#ff5555" : "#ffdd55", fontWeight: "bold" }}>
                    {String(v)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

    </div>
  );
}