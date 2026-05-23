/**
 * RadioVisualizer — Upper Vibe Media
 * Attaches to the SINGLE global audio element via getGlobalAnalyser().
 * iOS/Safari: fallback CSS/rAF animation (no AudioContext).
 */

import React, { useRef, useEffect, useCallback, useState } from "react";
import { usePlayer, getGlobalAnalyser } from "../../context/PlayerContext";

const PREF_KEY = "uvm_radio_viz_v4";

const MODES = [
  { id: "energy",  label: "Energy Bars",   icon: "▋" },
  { id: "cosmic",  label: "Cosmic Waves",  icon: "✦" },
  { id: "neon",    label: "Neon Pulse",    icon: "◎" },
  { id: "aurora",  label: "Aurora Flow",   icon: "≋" },
  { id: "tunnel",  label: "Freq Tunnel",   icon: "⊙" },
  { id: "plasma",  label: "Plasma Orbit",  icon: "◈" },
  { id: "drift",   label: "Particle Drift",icon: "·" },
];

const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent) ||
  (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

// ── Smoothed frequency data ───────────────────────────────────────────────────
const _smoothed = { data: null };
function getSmoothedFreq(an) {
  const bufLen = an.frequencyBinCount;
  const raw = new Uint8Array(bufLen);
  an.getByteFrequencyData(raw);
  if (!_smoothed.data || _smoothed.data.length !== bufLen) {
    _smoothed.data = new Float32Array(bufLen);
  }
  const sm = _smoothed.data;
  for (let i = 0; i < bufLen; i++) {
    const r = raw[i] / 255;
    sm[i] = r > sm[i] ? sm[i] * 0.4 + r * 0.6 : sm[i] * 0.88 + r * 0.12;
  }
  return sm;
}

function getBassS(sm, bufLen)   { const n = Math.floor(bufLen * 0.07); let v = 0; for (let i = 0; i < n; i++) v += sm[i]; return v / n; }
function getMidS(sm, bufLen)    { const lo = Math.floor(bufLen * 0.07), hi = Math.floor(bufLen * 0.35); let v = 0; for (let i = lo; i < hi; i++) v += sm[i]; return v / (hi - lo); }
function getTrebleS(sm, bufLen) { const lo = Math.floor(bufLen * 0.35), hi = Math.floor(bufLen * 0.75); let v = 0; for (let i = lo; i < hi; i++) v += sm[i]; return v / (hi - lo); }

const _beat = { last: 0 };
function detectBeat(bass) {
  const now = Date.now();
  if (bass > 0.45 && now - _beat.last > 280) { _beat.last = now; return true; }
  return false;
}

// ── Real-data draw functions ──────────────────────────────────────────────────

// iOS Safari <15.4 lacks roundRect — use a safe polyfill
function drawRoundedBar(ctx, x, y, w, h, r) {
  if (h <= 0 || w <= 0) return;
  r = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h);
  ctx.lineTo(x, y + h);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}

function drawEnergy(ctx, W, H, sm, bufLen, bass, mid, treble, beat) {
  const barCount = 64, gap = 2;
  const barW = (W - gap * (barCount - 1)) / barCount;
  const usableBins = Math.floor(bufLen * 0.78);
  for (let i = 0; i < barCount; i++) {
    const binIdx = Math.floor((i / barCount) * usableBins);
    const boost = i > 38 ? 1 + (i - 38) / 26 * 0.6 : 1;
    const v = Math.min(1, sm[binIdx] * boost * (1 + bass * 0.45));
    const h = Math.max(3, v * H);
    const x = i * (barW + gap);
    const hue = 185 + v * 70;
    const grad = ctx.createLinearGradient(0, H, 0, H - h);
    grad.addColorStop(0, `hsla(${hue},100%,45%,${0.5 + v * 0.5})`);
    grad.addColorStop(0.6, `hsla(${hue + 20},100%,65%,${0.7 + v * 0.3})`);
    grad.addColorStop(1, `hsla(${hue + 40},100%,85%,${0.3 + v * 0.4})`);
    ctx.fillStyle = grad;
    drawRoundedBar(ctx, x, H - h, barW, h, 3);
    ctx.fill();
  }
}

function drawCosmicWaves(ctx, W, H, sm, bufLen, t, particlesRef, bass, beat) {
  const cx = W / 2, cy = H / 2;
  let avg = 0; for (let i = 0; i < bufLen; i++) avg += sm[i]; avg /= bufLen;
  const maxP = beat ? 280 : 160;
  if (avg > 0.06 && particlesRef.current.length < maxP) {
    const count = beat ? Math.floor(8 + bass * 16) : Math.floor(1 + avg * 4);
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const spd = beat ? 0.9 + bass * 1.6 : 0.2 + avg * 0.8;
      const spawnR = Math.random() < 0.6 ? 0 : Math.random() * Math.min(W, H) * 0.28;
      particlesRef.current.push({
        x: cx + Math.cos(angle) * spawnR, y: cy + Math.sin(angle) * spawnR,
        vx: Math.cos(angle) * spd, vy: Math.sin(angle) * spd,
        life: 1, decay: beat ? 0.004 + Math.random() * 0.007 : 0.008 + Math.random() * 0.013,
        size: beat ? 3 + Math.random() * 5 * bass : 1.5 + Math.random() * 3,
        hue: 160 + Math.random() * 120,
      });
    }
  }
  const alive = [];
  for (const p of particlesRef.current) {
    p.x += p.vx; p.y += p.vy; p.vx *= 0.987; p.vy *= 0.987; p.life -= p.decay;
    if (p.life <= 0) continue;
    const r = Math.max(0, p.size * p.life);
    if (r > 0) { ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, Math.PI * 2); ctx.fillStyle = `hsla(${p.hue},100%,72%,${p.life * 0.88})`; ctx.fill(); }
    alive.push(p);
  }
  particlesRef.current = alive;
  for (let ri = 1; ri <= 3; ri++) {
    const ringR = Math.min(W, H) * (0.1 * ri) * (1 + avg * 0.5 + bass * 0.3);
    if (ringR <= 0) continue;
    ctx.beginPath(); ctx.arc(cx, cy, ringR, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(0,220,255,${(0.15 - ri * 0.04) + avg * 0.18})`; ctx.lineWidth = 1; ctx.stroke();
  }
  const glowR = Math.min(W, H) * 0.3 + avg * 28 + bass * 18;
  const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, glowR);
  g.addColorStop(0, `rgba(0,220,255,${0.14 + avg * 0.2})`);
  g.addColorStop(0.5, `rgba(155,126,255,${0.05 + avg * 0.07})`);
  g.addColorStop(1, "rgba(0,0,0,0)");
  ctx.beginPath(); ctx.arc(cx, cy, glowR, 0, Math.PI * 2); ctx.fillStyle = g; ctx.fill();
}

function drawNeonPulse(ctx, W, H, sm, bufLen, bass, mid) {
  const cx = W / 2, cy = H / 2;
  const t = Date.now() / 1000;
  const baseR = Math.min(W, H) * 0.22;

  // Pulsing shock rings — radius and alpha driven by bass
  const rings = [
    { r: baseR * (1 + bass * 1.1), alpha: Math.min(1, 0.65 + bass * 0.5), w: 2.5 + bass * 4, c: "0,229,255" },
    { r: baseR * (1.3 + mid * 0.7 + bass * 0.5), alpha: 0.35 + bass * 0.45, w: 1.5 + bass * 2, c: "155,126,255" },
    { r: baseR * (1.6 + mid * 0.8 + bass * 0.6), alpha: 0.12 + bass * 0.28, w: 1 + bass, c: "0,200,220" },
    { r: baseR * (1.9 + mid * 0.5 + bass * 0.4), alpha: 0.05 + bass * 0.15, w: 0.5, c: "200,100,255" },
  ];
  for (const rg of rings) {
    if (rg.r <= 0) continue;
    ctx.beginPath(); ctx.arc(cx, cy, rg.r, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(${rg.c},${rg.alpha})`; ctx.lineWidth = rg.w; ctx.stroke();
  }

  // Radial bars — wobble angle offset with time for constant spin feel
  const bars = 80, usable = Math.floor(bufLen * 0.75);
  const spin = t * 0.4; // slow continuous rotation
  for (let i = 0; i < bars; i++) {
    const v = sm[Math.floor((i / bars) * usable)];
    const angle = (i / bars) * Math.PI * 2 - Math.PI / 2 + spin;
    const wobble = Math.sin(t * 3.5 + i * 0.18) * 0.04 * (1 + bass);
    const inner = baseR * (0.95 + bass * 0.15 + wobble);
    const outer = inner + Math.max(2, v * baseR * (1.1 + bass * 1.4));
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(angle) * inner, cy + Math.sin(angle) * inner);
    ctx.lineTo(cx + Math.cos(angle) * outer, cy + Math.sin(angle) * outer);
    ctx.strokeStyle = `hsla(${185 + v * 120 + i * 0.8},100%,62%,${0.4 + v * 0.6})`;
    ctx.lineWidth = Math.max(1.5, (W / bars) * 0.55); ctx.lineCap = "round"; ctx.stroke();
  }

  // Breathing centre core
  const breathe = Math.sin(t * 2.8) * 0.3 + 0.7;
  const dotR = Math.max(0, 5 + bass * 22 + mid * 8) * breathe;
  if (dotR > 0) {
    const dg = ctx.createRadialGradient(cx, cy, 0, cx, cy, dotR * 4);
    dg.addColorStop(0, `rgba(0,229,255,${0.9 + bass * 0.1})`);
    dg.addColorStop(0.3, `rgba(155,100,255,${0.25 + bass * 0.25})`);
    dg.addColorStop(1, "rgba(0,0,0,0)");
    ctx.beginPath(); ctx.arc(cx, cy, dotR, 0, Math.PI * 2); ctx.fillStyle = dg; ctx.fill();
  }
}

function drawAurora(ctx, W, H, sm, bufLen, t, bass, beat) {
  const bands = 6;
  const bandSize = Math.floor(bufLen / bands);
  const colors = ["0,229,255","0,200,220","80,150,255","155,126,255","200,100,255","100,220,200"];
  for (let b = 0; b < bands; b++) {
    let sum = 0;
    for (let i = b * bandSize; i < (b + 1) * bandSize; i++) sum += sm[i] || 0;
    const amp = Math.min(1, (sum / bandSize) * (1 + bass * 1.6));
    const sliceH = H / bands;
    const cy = sliceH * b + sliceH / 2;
    const wH = amp * sliceH * 1.15 * (b < 2 && beat ? 1.5 : 1);
    const freq = 1.8 + b * 0.7;
    const phase = t * (1.0 + b * 0.45 + amp * 2.2);
    ctx.beginPath();
    for (let px = 0; px <= W; px += 2) {
      const y = cy + Math.sin((px / W) * Math.PI * 2 * freq + phase) * wH;
      px === 0 ? ctx.moveTo(px, y) : ctx.lineTo(px, y);
    }
    ctx.lineTo(W, cy + sliceH * 0.55); ctx.lineTo(0, cy + sliceH * 0.55); ctx.closePath();
    ctx.fillStyle = `rgba(${colors[b]},${0.03 + amp * 0.16})`; ctx.fill();
    ctx.beginPath();
    for (let px = 0; px <= W; px += 2) {
      const y = cy + Math.sin((px / W) * Math.PI * 2 * freq + phase) * wH;
      px === 0 ? ctx.moveTo(px, y) : ctx.lineTo(px, y);
    }
    ctx.strokeStyle = `rgba(${colors[b]},${0.45 + amp * 0.55})`;
    ctx.lineWidth = beat && b < 2 ? 3 + amp * 2.5 : 1.5 + amp * 2;
    ctx.lineJoin = "round"; ctx.stroke();
  }
  if (beat && bass > 0.48) {
    const fa = (bass - 0.48) * 0.15;
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, `rgba(0,229,255,${fa})`); g.addColorStop(1, `rgba(155,126,255,${fa * 0.4})`);
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  }
}

function drawTunnel(ctx, W, H, sm, bufLen, t, bass, mid) {
  const cx = W / 2, cy = H / 2;
  const rings = 12;
  const maxR = Math.min(W, H) * 0.52;
  for (let ri = rings; ri >= 1; ri--) {
    const frac = ri / rings;
    const bandIdx = Math.floor(frac * bufLen * 0.5);
    const amp = sm[bandIdx] || 0;
    const radius = maxR * frac * (1 + bass * 0.18 * (1 - frac));
    const sides = 6 + ri;
    const rotation = t * (0.15 + (rings - ri) * 0.05) + bass * 0.4;
    const alpha = (1 - frac) * (0.25 + amp * 0.4);
    const hue = 185 + frac * 80 + (t * 10 % 60);
    ctx.beginPath();
    for (let si = 0; si <= sides; si++) {
      const angle = (si / sides) * Math.PI * 2 + rotation;
      const x = cx + Math.cos(angle) * radius;
      const y = cy + Math.sin(angle) * radius;
      si === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.strokeStyle = `hsla(${hue},100%,65%,${alpha})`;
    ctx.lineWidth = 1 + amp * 1.5; ctx.stroke();
    if (ri < rings) {
      const nextFrac = (ri + 1) / rings;
      const nextR = maxR * nextFrac * (1 + bass * 0.18 * (1 - nextFrac));
      for (let sp = 0; sp < 4; sp++) {
        const angle = (sp / 4) * Math.PI * 2 + rotation;
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius);
        ctx.lineTo(cx + Math.cos(angle) * nextR, cy + Math.sin(angle) * nextR);
        ctx.strokeStyle = `hsla(${hue},100%,65%,${alpha * 0.4})`; ctx.lineWidth = 0.5; ctx.stroke();
      }
    }
  }
  const dotR = Math.max(0, 3 + bass * 12 + mid * 8);
  const dg = ctx.createRadialGradient(cx, cy, 0, cx, cy, dotR * 4);
  dg.addColorStop(0, `rgba(0,229,255,${0.9 + bass * 0.1})`);
  dg.addColorStop(1, "rgba(0,0,0,0)");
  ctx.beginPath(); ctx.arc(cx, cy, dotR, 0, Math.PI * 2); ctx.fillStyle = dg; ctx.fill();
}

function drawPlasma(ctx, W, H, sm, bufLen, t, particlesRef, bass, beat) {
  const cx = W / 2, cy = H / 2;
  let avg = 0; for (let i = 0; i < bufLen; i++) avg += sm[i]; avg /= bufLen;
  const orbitCount = 3;
  const orbitRadii = [Math.min(W, H) * 0.15, Math.min(W, H) * 0.26, Math.min(W, H) * 0.38];
  if (avg > 0.06 && particlesRef.current.length < 220) {
    const count = beat ? Math.floor(6 + bass * 12) : Math.floor(1 + avg * 3);
    for (let i = 0; i < count; i++) {
      const orbit = Math.floor(Math.random() * orbitCount);
      const angle = Math.random() * Math.PI * 2;
      const r = orbitRadii[orbit] * (0.8 + Math.random() * 0.4);
      const spd = beat ? 0.7 + bass * 1.2 : 0.3 + avg * 0.6;
      particlesRef.current.push({
        x: cx + Math.cos(angle) * r, y: cy + Math.sin(angle) * r,
        vx: (Math.random() - 0.5) * spd * 2, vy: (Math.random() - 0.5) * spd * 2,
        life: 1, decay: 0.006 + Math.random() * 0.01,
        size: 1.5 + Math.random() * (beat ? 4 * bass : 2),
        hue: 180 + orbit * 50 + Math.random() * 40,
      });
    }
  }
  const alive = [];
  for (const p of particlesRef.current) {
    p.x += p.vx; p.y += p.vy; p.vx *= 0.96; p.vy *= 0.96; p.life -= p.decay;
    if (p.life <= 0) continue;
    const r = Math.max(0, p.size * p.life);
    if (r > 0) { ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, Math.PI * 2); ctx.fillStyle = `hsla(${p.hue},100%,70%,${p.life * 0.85})`; ctx.fill(); }
    alive.push(p);
  }
  particlesRef.current = alive;
  for (let o = 0; o < orbitCount; o++) {
    const bandIdx = Math.floor((o / orbitCount) * bufLen * 0.5);
    const amp = sm[bandIdx] || 0;
    const r = orbitRadii[o] * (1 + bass * 0.2 + amp * 0.1);
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.strokeStyle = `hsla(${185 + o * 55},100%,62%,${0.15 + amp * 0.3})`; ctx.lineWidth = 1; ctx.stroke();
  }
  const gr = Math.min(W, H) * 0.2 + bass * 20;
  const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, gr);
  g.addColorStop(0, `rgba(155,100,255,${0.2 + bass * 0.3})`);
  g.addColorStop(0.5, `rgba(0,200,220,${0.08 + avg * 0.1})`);
  g.addColorStop(1, "rgba(0,0,0,0)");
  ctx.beginPath(); ctx.arc(cx, cy, gr, 0, Math.PI * 2); ctx.fillStyle = g; ctx.fill();
}

function drawDrift(ctx, W, H, sm, bufLen, t, particlesRef, bass, treble) {
  let avg = 0; for (let i = 0; i < bufLen; i++) avg += sm[i]; avg /= bufLen;
  const isBeat = bass > 0.44;
  if (avg > 0.05 && particlesRef.current.length < 200) {
    const count = isBeat ? Math.floor(5 + bass * 10) : Math.floor(1 + avg * 3);
    for (let i = 0; i < count; i++) {
      const side = Math.floor(Math.random() * 4);
      let x, y;
      if (side === 0) { x = Math.random() * W; y = H + 10; }
      else if (side === 1) { x = -10; y = Math.random() * H; }
      else if (side === 2) { x = W + 10; y = Math.random() * H; }
      else { x = Math.random() * W; y = -10; }
      const angle = Math.atan2(H / 2 - y, W / 2 - x) + (Math.random() - 0.5) * 1.2;
      const spd = isBeat ? 0.6 + bass * 1.0 : 0.2 + avg * 0.5;
      particlesRef.current.push({ x, y, vx: Math.cos(angle) * spd, vy: Math.sin(angle) * spd, life: 1, decay: 0.005 + Math.random() * 0.009, size: isBeat ? 2 + Math.random() * 4 * bass : 1 + Math.random() * 2.5, hue: 160 + Math.random() * 130, trail: [] });
    }
  }
  const alive = [];
  for (const p of particlesRef.current) {
    p.trail.push({ x: p.x, y: p.y });
    if (p.trail.length > 8) p.trail.shift();
    p.x += p.vx; p.y += p.vy; p.vx *= 0.99; p.vy *= 0.99; p.life -= p.decay;
    if (p.life <= 0) continue;
    for (let ti = 0; ti < p.trail.length - 1; ti++) {
      const a = p.trail[ti], b = p.trail[ti + 1];
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y);
      ctx.strokeStyle = `hsla(${p.hue},100%,70%,${(ti / p.trail.length) * p.life * 0.4})`; ctx.lineWidth = p.size * 0.5; ctx.stroke();
    }
    const r = Math.max(0, p.size * p.life);
    if (r > 0) { ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, Math.PI * 2); ctx.fillStyle = `hsla(${p.hue},100%,75%,${p.life * 0.9})`; ctx.fill(); }
    alive.push(p);
  }
  particlesRef.current = alive;
  const gr = Math.min(W, H) * 0.25 + avg * 25;
  const g = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, gr);
  g.addColorStop(0, `rgba(0,200,255,${0.06 + avg * 0.1})`);
  g.addColorStop(1, "rgba(0,0,0,0)");
  ctx.beginPath(); ctx.arc(W / 2, H / 2, gr, 0, Math.PI * 2); ctx.fillStyle = g; ctx.fill();
}

// ── Fallback draw functions (no analyser) ─────────────────────────────────────

function fallbackEnergy(ctx, W, H, t, active) {
  const count = 48, gap = 3;
  const bw = (W - gap * (count - 1)) / count;
  for (let i = 0; i < count; i++) {
    const v = active ? (Math.sin(t * 2.4 + i * 0.38) * 0.5 + 0.5) * (Math.sin(t * 1.1 + i * 0.14) * 0.3 + 0.7) : 0.05 + Math.sin(i * 0.5) * 0.03;
    const h = Math.max(3, v * H * 0.85);
    ctx.fillStyle = `hsla(${185 + i * 1.2},100%,58%,${0.3 + v * 0.55})`;
    drawRoundedBar(ctx, i * (bw + gap), H - h, bw, h, 2);
    ctx.fill();
  }
}

function fallbackCosmic(ctx, W, H, t, active, particlesRef) {
  const cx = W / 2, cy = H / 2;
  if (Math.random() < (active ? 0.5 : 0.06) && particlesRef.current.length < (active ? 150 : 25)) {
    const n = active ? Math.floor(1 + Math.random() * 3) : 1;
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, spd = active ? 0.5 + Math.random() * 1.4 : 0.2 + Math.random() * 0.4;
      const sr = Math.random() < 0.5 ? 0 : Math.random() * Math.min(W, H) * 0.28;
      particlesRef.current.push({ x: cx + Math.cos(a) * sr, y: cy + Math.sin(a) * sr, vx: Math.cos(a) * spd, vy: Math.sin(a) * spd, life: 1, decay: 0.007 + Math.random() * 0.011, size: 1.5 + Math.random() * 4, hue: 160 + Math.random() * 110 });
    }
  }
  const alive = [];
  for (const p of particlesRef.current) {
    p.x += p.vx; p.y += p.vy; p.vx *= 0.972; p.vy *= 0.972; p.life -= p.decay;
    if (p.life <= 0) continue;
    const r = Math.max(0, p.size * p.life);
    if (r > 0) { ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, Math.PI * 2); ctx.fillStyle = `hsla(${p.hue},100%,70%,${p.life * 0.75})`; ctx.fill(); }
    alive.push(p);
  }
  particlesRef.current = alive;
  const pr = Math.min(W, H) * 0.18 * (active ? 0.7 + Math.sin(t * 2) * 0.3 : 0.35);
  if (pr > 0) { const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, pr); g.addColorStop(0, `rgba(0,220,255,${active ? 0.18 : 0.05})`); g.addColorStop(1, "rgba(0,0,0,0)"); ctx.beginPath(); ctx.arc(cx, cy, pr, 0, Math.PI * 2); ctx.fillStyle = g; ctx.fill(); }
}

function fallbackNeon(ctx, W, H, t, active) {
  const cx = W / 2, cy = H / 2, baseR = Math.min(W, H) * 0.22;
  const pulse = active ? 0.7 + Math.sin(t * 2.2) * 0.3 : 0.35;
  const spin = t * 0.4;
  // Rings — scale breathing when active
  [[1, 2.5, "0,220,255"], [1.3, 1.5, "155,126,255"], [1.6, 1, "0,200,220"], [1.9, 0.5, "200,100,255"]].forEach(([scale, w, c], idx) => {
    const breathe = active ? scale + Math.sin(t * (1.8 + idx * 0.4)) * 0.06 : scale;
    ctx.beginPath(); ctx.arc(cx, cy, baseR * breathe, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(${c},${0.55 * pulse})`; ctx.lineWidth = w; ctx.stroke();
  });
  // Spinning bars
  for (let i = 0; i < 64; i++) {
    const a = (i / 64) * Math.PI * 2 - Math.PI / 2 + spin;
    const wobble = active ? Math.sin(t * 3.5 + i * 0.18) * 0.04 : 0;
    const v = active ? Math.sin(t * 1.8 + i * 0.26) * 0.5 + 0.5 : 0.08;
    const inner = baseR * (0.95 + wobble), outer = inner + v * baseR * 0.65 + 2;
    ctx.beginPath(); ctx.moveTo(cx + Math.cos(a) * inner, cy + Math.sin(a) * inner);
    ctx.lineTo(cx + Math.cos(a) * outer, cy + Math.sin(a) * outer);
    ctx.strokeStyle = `hsla(${185 + v * 80 + i * 0.8},100%,62%,${active ? 0.35 + v * 0.4 : 0.12})`; ctx.lineWidth = 2; ctx.lineCap = "round"; ctx.stroke();
  }
  // Breathing core
  const dotR = baseR * (active ? 0.18 + Math.sin(t * 2.8) * 0.08 : 0.1);
  const dg = ctx.createRadialGradient(cx, cy, 0, cx, cy, dotR * 4);
  dg.addColorStop(0, `rgba(0,229,255,${active ? 0.75 : 0.2})`);
  dg.addColorStop(0.4, `rgba(155,100,255,${active ? 0.2 : 0.05})`);
  dg.addColorStop(1, "rgba(0,0,0,0)");
  ctx.beginPath(); ctx.arc(cx, cy, dotR, 0, Math.PI * 2); ctx.fillStyle = dg; ctx.fill();
}

function fallbackAurora(ctx, W, H, t, active) {
  const colors = ["0,229,255","0,200,220","100,160,255","155,126,255","200,100,255"];
  for (let b = 0; b < 5; b++) {
    const amp = active ? Math.max(0.04, 0.28 + Math.sin(t * (1.3 + b * 0.45) + b * 1.2) * 0.26) : 0.04;
    const sliceH = H / 5, cy = sliceH * b + sliceH / 2;
    const wH = amp * sliceH * 1.1, freq = 2 + b * 0.75, phase = t * (1.1 + b * 0.4 + amp * 2);
    ctx.beginPath();
    for (let px = 0; px <= W; px += 3) { const y = cy + Math.sin((px / W) * Math.PI * 2 * freq + phase) * wH; px === 0 ? ctx.moveTo(px, y) : ctx.lineTo(px, y); }
    ctx.lineTo(W, cy + sliceH * 0.55); ctx.lineTo(0, cy + sliceH * 0.55); ctx.closePath();
    ctx.fillStyle = `rgba(${colors[b]},${amp * 0.13})`; ctx.fill();
    ctx.beginPath();
    for (let px = 0; px <= W; px += 3) { const y = cy + Math.sin((px / W) * Math.PI * 2 * freq + phase) * wH; px === 0 ? ctx.moveTo(px, y) : ctx.lineTo(px, y); }
    ctx.strokeStyle = `rgba(${colors[b]},${0.38 + amp * 0.5})`; ctx.lineWidth = 1.5 + amp * 2.2; ctx.lineJoin = "round"; ctx.stroke();
  }
}

function fallbackTunnel(ctx, W, H, t, active) {
  const cx = W / 2, cy = H / 2, maxR = Math.min(W, H) * 0.5, rings = 10;
  for (let ri = rings; ri >= 1; ri--) {
    const frac = ri / rings;
    const radius = maxR * frac * (active ? 1 + Math.sin(t * 1.2 + frac * 3) * 0.05 : 1);
    const sides = 6 + ri, rotation = t * (0.12 + (rings - ri) * 0.04);
    const alpha = (1 - frac) * (active ? 0.2 + frac * 0.2 : 0.1);
    ctx.beginPath();
    for (let si = 0; si <= sides; si++) { const a = (si / sides) * Math.PI * 2 + rotation; ctx.lineTo(cx + Math.cos(a) * radius, cy + Math.sin(a) * radius); }
    ctx.closePath(); ctx.strokeStyle = `hsla(${185 + frac * 80},100%,65%,${alpha})`; ctx.lineWidth = 1; ctx.stroke();
  }
}

function fallbackDrift(ctx, W, H, t, active, particlesRef) {
  const cx = W / 2, cy = H / 2;
  if (active && Math.random() < 0.4 && particlesRef.current.length < 120) {
    const side = Math.floor(Math.random() * 4);
    let x, y;
    if (side === 0) { x = Math.random() * W; y = H + 10; }
    else if (side === 1) { x = -10; y = Math.random() * H; }
    else if (side === 2) { x = W + 10; y = Math.random() * H; }
    else { x = Math.random() * W; y = -10; }
    const angle = Math.atan2(cy - y, cx - x) + (Math.random() - 0.5) * 1.0;
    particlesRef.current.push({ x, y, vx: Math.cos(angle) * (0.3 + Math.random() * 0.8), vy: Math.sin(angle) * (0.3 + Math.random() * 0.8), life: 1, decay: 0.006 + Math.random() * 0.008, size: 1 + Math.random() * 2.5, hue: 160 + Math.random() * 130, trail: [] });
  }
  const alive = [];
  for (const p of particlesRef.current) {
    if (p.trail) { p.trail.push({ x: p.x, y: p.y }); if (p.trail.length > 6) p.trail.shift(); }
    p.x += p.vx; p.y += p.vy; p.life -= p.decay;
    if (p.life <= 0) continue;
    if (p.trail) for (let ti = 0; ti < p.trail.length - 1; ti++) {
      ctx.beginPath(); ctx.moveTo(p.trail[ti].x, p.trail[ti].y); ctx.lineTo(p.trail[ti + 1].x, p.trail[ti + 1].y);
      ctx.strokeStyle = `hsla(${p.hue},100%,70%,${(ti / p.trail.length) * p.life * 0.35})`; ctx.lineWidth = p.size * 0.4; ctx.stroke();
    }
    const r = Math.max(0, p.size * p.life);
    if (r > 0) { ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, Math.PI * 2); ctx.fillStyle = `hsla(${p.hue},100%,72%,${p.life * 0.85})`; ctx.fill(); }
    alive.push(p);
  }
  particlesRef.current = alive;
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function RadioVisualizer({ isPlaying, currentSong }) {
  const canvasRef    = useRef(null);
  const rafRef       = useRef(null);
  const analyserRef  = useRef(null);
  const particlesRef = useRef([]);
  const logTimerRef  = useRef(0);
  const { audioRef } = usePlayer();

  const getSavedMode = () => { try { return localStorage.getItem(PREF_KEY) || "energy"; } catch { return "energy"; } };
  const [mode, setMode] = useState(getSavedMode);

  useEffect(() => { try { localStorage.setItem(PREF_KEY, mode); } catch {} }, [mode]);

  const cycleMode = () => {
    const idx = MODES.findIndex(m => m.id === mode);
    setMode(MODES[(idx + 1) % MODES.length].id);
  };

  const tryConnectAnalyser = useCallback(() => {
    const audio = audioRef?.current;
    if (!audio) { analyserRef.current = null; return false; }
    const an = getGlobalAnalyser(audio);
    if (an) {
      analyserRef.current = an;
      an.fftSize = 2048;
      an.smoothingTimeConstant = 0.0;
      const ctxState = an.context?.state || "unknown";
      console.log("[Viz] probe | analyserConnected: true | ctxState:", ctxState, "| isIOS:", isIOS, "| dpr:", window.devicePixelRatio || 1);
      return true;
    }
    analyserRef.current = null;
    console.log("[Viz] probe | analyserConnected: false | isIOS:", isIOS);
    return false;
  }, [audioRef]);

  const stopLoop = useCallback(() => {
    if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
  }, []);

  const startLoop = useCallback((currentMode, useAnalyser) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const loop = () => {
      const dpr  = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      const lW   = rect.width  || 300;
      const lH   = rect.height || 180;
      const pW   = Math.round(lW * dpr);
      const pH   = Math.round(lH * dpr);
      if (canvas.width !== pW || canvas.height !== pH) { canvas.width = pW; canvas.height = pH; }
      const ctx = canvas.getContext("2d");
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, lW, lH);
      const t  = Date.now() / 1000;
      const an = useAnalyser ? analyserRef.current : null;
      if (an) {
        const bufLen = an.frequencyBinCount;
        const sm     = getSmoothedFreq(an);
        const bass   = getBassS(sm, bufLen);
        const mid    = getMidS(sm, bufLen);
        const treble = getTrebleS(sm, bufLen);
        const beat   = detectBeat(bass);
        if (Date.now() - logTimerRef.current > 3000) {
          logTimerRef.current = Date.now();
          const nonZero = Array.from(sm).filter(v => v > 0.01).length;
          console.log("[Viz] live | bass:", bass.toFixed(3), "| mid:", mid.toFixed(3), "| treble:", treble.toFixed(3), "| beat:", beat, "| active bins:", nonZero);
        }
        switch (currentMode) {
          case "energy":  drawEnergy(ctx, lW, lH, sm, bufLen, bass, mid, treble, beat); break;
          case "cosmic":  drawCosmicWaves(ctx, lW, lH, sm, bufLen, t, particlesRef, bass, beat); break;
          case "neon":    drawNeonPulse(ctx, lW, lH, sm, bufLen, bass, mid); break;
          case "aurora":  drawAurora(ctx, lW, lH, sm, bufLen, t, bass, beat); break;
          case "tunnel":  drawTunnel(ctx, lW, lH, sm, bufLen, t, bass, mid); break;
          case "plasma":  drawPlasma(ctx, lW, lH, sm, bufLen, t, particlesRef, bass, beat); break;
          default:        drawDrift(ctx, lW, lH, sm, bufLen, t, particlesRef, bass, treble); break;
        }
      } else {
        const active = isPlaying;
        if (Date.now() - logTimerRef.current > 3000) { logTimerRef.current = Date.now(); console.log("[Viz] fallback | isIOS:", isIOS, "| isPlaying:", active); }
        switch (currentMode) {
          case "energy":  fallbackEnergy(ctx, lW, lH, t, active); break;
          case "cosmic":  fallbackCosmic(ctx, lW, lH, t, active, particlesRef); break;
          case "neon":    fallbackNeon(ctx, lW, lH, t, active); break;
          case "aurora":  fallbackAurora(ctx, lW, lH, t, active); break;
          case "tunnel":  fallbackTunnel(ctx, lW, lH, t, active); break;
          case "plasma":  fallbackCosmic(ctx, lW, lH, t, active, particlesRef); break;
          default:        fallbackDrift(ctx, lW, lH, t, active, particlesRef); break;
        }
      }
      rafRef.current = requestAnimationFrame(loop);
    };
    loop();
  }, [isPlaying]);

  useEffect(() => {
    stopLoop(); particlesRef.current = []; _smoothed.data = null;
    const connected = tryConnectAnalyser();
    startLoop(mode, connected);
    return stopLoop;
  }, [mode, isPlaying, currentSong?.id]);

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState !== "visible") return;
      stopLoop(); particlesRef.current = []; _smoothed.data = null;
      const connected = tryConnectAnalyser();
      startLoop(mode, connected);
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [mode, isPlaying, tryConnectAnalyser, startLoop, stopLoop]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ro = new ResizeObserver(() => { if (canvas) { canvas.width = 0; canvas.height = 0; } });
    ro.observe(canvas);
    return () => ro.disconnect();
  }, []);

  const currentModeObj = MODES.find(m => m.id === mode) || MODES[0];

  return (
    <div style={{ width: "100%" }}>
      {/* Canvas box */}
      <div style={{ position: "relative", width: "100%", overflow: "hidden", borderRadius: "inherit" }}>
        <div style={{ paddingTop: "min(56.25%, 260px)", position: "relative" }}>
          <canvas ref={canvasRef} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", display: "block" }} />
        </div>
      </div>

      {/* ── Cycle button — outside the visualizer box ── */}
      <div style={{ display: "flex", justifyContent: "flex-end", paddingTop: 8, paddingRight: 4 }}>
        <button
          onClick={cycleMode}
          style={{
            display: "inline-flex", alignItems: "center", gap: 4,
            padding: "4px 10px", borderRadius: 20,
            fontSize: 9, fontWeight: 800, letterSpacing: "0.07em",
            textTransform: "uppercase", cursor: "pointer", whiteSpace: "nowrap",
            transition: "all 0.2s ease",
            userSelect: "none", WebkitUserSelect: "none",
            background: "rgba(0,229,255,0.10)",
            border: "1px solid rgba(0,229,255,0.45)",
            color: "#00E5FF",
            boxShadow: "0 0 8px rgba(0,229,255,0.12)",
          }}
        >
          <span style={{ fontSize: 9, lineHeight: 1 }}>{currentModeObj.icon}</span>
          {currentModeObj.label}
        </button>
      </div>
    </div>
  );
}