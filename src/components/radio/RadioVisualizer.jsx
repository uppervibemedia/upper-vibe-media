/**
 * RadioVisualizer — Upper Vibe Media
 * Attaches to the SINGLE global audio element via getGlobalAnalyser().
 * iOS/Safari: fallback CSS/rAF animation (no AudioContext).
 */

import React, { useRef, useEffect, useCallback, useState } from "react";
import { usePlayer, getGlobalAnalyser } from "../../context/PlayerContext";

const PREF_KEY = "uvm_radio_viz_v3";

const MODES = [
  { id: "energy",   label: "Energy Bars",      icon: "▋" },
  { id: "cosmic",   label: "Cosmic Waves",      icon: "✦" },
  { id: "neon",     label: "Neon Pulse",        icon: "◎" },
  { id: "aurora",   label: "Aurora Flow",       icon: "≋" },
  { id: "tunnel",   label: "Freq Tunnel",       icon: "⊙" },
  { id: "plasma",   label: "Plasma Orbit",      icon: "◈" },
  { id: "drift",    label: "Particle Drift",    icon: "·" },
];

const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent) ||
  (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
const isSafari = /Safari\//.test(navigator.userAgent) &&
  !/Chrome\//.test(navigator.userAgent) && !/Chromium\//.test(navigator.userAgent);

// (frequency helpers moved to smoothed section below draw functions)

// ── Real-data draw functions ──────────────────────────────────────────────────

function drawEnergy(ctx, W, H, s, bufLen, bass, mid, treble, beat) {
  const barCount = 64;
  const gap = 2;
  const barW = (W - gap * (barCount - 1)) / barCount;
  const usableBins = Math.floor(bufLen * 0.78);
  for (let i = 0; i < barCount; i++) {
    const binIdx = Math.floor((i / barCount) * usableBins);
    const raw = s[binIdx];
    // Treble boost on right side for visual balance
    const boost = i > 38 ? 1 + (i - 38) / 26 * 0.6 : 1;
    const v = Math.min(1, raw * boost * (1 + bass * 0.45));
    const h = Math.max(3, v * H);
    const x = i * (barW + gap);
    const hue = 185 + v * 70;
    const grad = ctx.createLinearGradient(0, H, 0, H - h);
    grad.addColorStop(0, `hsla(${hue},100%,45%,${0.5 + v * 0.5})`);
    grad.addColorStop(0.6, `hsla(${hue + 20},100%,65%,${0.7 + v * 0.3})`);
    grad.addColorStop(1, `hsla(${hue + 40},100%,85%,${0.3 + v * 0.4})`);
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.roundRect(x, H - h, barW, h, [3, 3, 0, 0]);
    ctx.fill();
  }
}

function drawCosmicWaves(ctx, W, H, s, bufLen, t, particlesRef, bass, beat) {
  const cx = W / 2, cy = H / 2;
  const avg = s.reduce((a, v) => a + v, 0) / bufLen;
  const isBeat = beat;
  const maxP = isBeat ? 280 : 160;

  if (avg > 0.06 && particlesRef.current.length < maxP) {
    const count = isBeat ? Math.floor(8 + bass * 16) : Math.floor(1 + avg * 4);
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const spd = isBeat ? 0.9 + bass * 1.6 : 0.2 + avg * 0.8;
      const spawnR = Math.random() < 0.6 ? 0 : Math.random() * Math.min(W, H) * 0.28;
      particlesRef.current.push({
        x: cx + Math.cos(angle) * spawnR, y: cy + Math.sin(angle) * spawnR,
        vx: Math.cos(angle) * spd, vy: Math.sin(angle) * spd,
        life: 1, decay: isBeat ? 0.004 + Math.random() * 0.007 : 0.008 + Math.random() * 0.013,
        size: isBeat ? 3 + Math.random() * 5 * bass : 1.5 + Math.random() * 3,
        hue: 160 + Math.random() * 120,
      });
    }
  }
  const alive = [];
  for (const p of particlesRef.current) {
    p.x += p.vx; p.y += p.vy; p.vx *= 0.987; p.vy *= 0.987; p.life -= p.decay;
    if (p.life <= 0) continue;
    const r = Math.max(0, p.size * p.life);
    if (r > 0) {
      ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
      ctx.fillStyle = `hsla(${p.hue},100%,72%,${p.life * 0.88})`; ctx.fill();
    }
    alive.push(p);
  }
  particlesRef.current = alive;

  for (let r = 1; r <= 3; r++) {
    const ringR = Math.min(W, H) * (0.1 * r) * (1 + avg * 0.5 + bass * 0.3);
    if (ringR <= 0) continue;
    ctx.beginPath(); ctx.arc(cx, cy, ringR, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(0,220,255,${(0.15 - r * 0.04) + avg * 0.18})`;
    ctx.lineWidth = 1; ctx.stroke();
  }
  const glowR = Math.min(W, H) * 0.3 + avg * 28 + bass * 18;
  const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, glowR);
  g.addColorStop(0, `rgba(0,220,255,${0.14 + avg * 0.2})`);
  g.addColorStop(0.5, `rgba(155,126,255,${0.05 + avg * 0.07})`);
  g.addColorStop(1, "rgba(0,0,0,0)");
  ctx.beginPath(); ctx.arc(cx, cy, glowR, 0, Math.PI * 2);
  ctx.fillStyle = g; ctx.fill();
}

function drawNeonPulse(ctx, W, H, s, bufLen, bass, mid) {
  const cx = W / 2, cy = H / 2;
  const avg = mid;
  const baseR = Math.min(W, H) * 0.22;

  // Outer shock rings
  const rings = [
    { r: baseR * (1 + bass * 0.7), alpha: Math.min(1, 0.65 + bass * 0.35), w: 2.5 + bass * 2.5, c: "0,229,255" },
    { r: baseR * (1.22 + avg * 0.5 + bass * 0.28), alpha: 0.3 + bass * 0.3, w: 1.5, c: "155,126,255" },
    { r: baseR * (1.44 + avg * 0.6 + bass * 0.4), alpha: 0.1 + bass * 0.18, w: 1, c: "0,200,220" },
  ];
  for (const rg of rings) {
    if (rg.r <= 0) continue;
    ctx.beginPath(); ctx.arc(cx, cy, rg.r, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(${rg.c},${rg.alpha})`; ctx.lineWidth = rg.w; ctx.stroke();
  }
  const bars = 80;
  const usable = Math.floor(bufLen * 0.75);
  for (let i = 0; i < bars; i++) {
    const v = s[Math.floor((i / bars) * usable)];
    const angle = (i / bars) * Math.PI * 2 - Math.PI / 2;
    const inner = baseR * (1.05 + bass * 0.1);
    const outer = inner + Math.max(0, v * baseR * (0.7 + bass * 0.9) + 2);
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(angle) * inner, cy + Math.sin(angle) * inner);
    ctx.lineTo(cx + Math.cos(angle) * outer, cy + Math.sin(angle) * outer);
    ctx.strokeStyle = `hsla(${185 + v * 90},100%,62%,${0.4 + v * 0.6})`;
    ctx.lineWidth = Math.max(1, (W / bars) * 0.45); ctx.lineCap = "round"; ctx.stroke();
  }
  // Centre core
  const dotR = Math.max(0, 4 + bass * 16);
  if (dotR > 0) {
    const dg = ctx.createRadialGradient(cx, cy, 0, cx, cy, dotR * 3.5);
    dg.addColorStop(0, `rgba(0,229,255,${0.85 + bass * 0.15})`);
    dg.addColorStop(0.4, `rgba(0,180,220,${0.18 + bass * 0.2})`);
    dg.addColorStop(1, "rgba(0,0,0,0)");
    ctx.beginPath(); ctx.arc(cx, cy, dotR, 0, Math.PI * 2);
    ctx.fillStyle = dg; ctx.fill();
  }
}

function drawAurora(ctx, W, H, s, bufLen, t, bass, beat) {
  const isBeat = beat;
  const bands = 6;
  const bandSize = Math.floor(bufLen / bands);
  const colors = ["0,229,255","0,200,220","80,150,255","155,126,255","200,100,255","100,220,200"];

  for (let b = 0; b < bands; b++) {
    let sum = 0;
    for (let i = b * bandSize; i < (b + 1) * bandSize; i++) sum += s[i] || 0;
    const amp = Math.min(1, (sum / bandSize) * (1 + bass * 1.6));
    const sliceH = H / bands;
    const cy = sliceH * b + sliceH / 2;
    const beatBoost = b < 2 && isBeat ? 1.5 : 1;
    const wH = amp * sliceH * 1.15 * beatBoost;
    const freq = 1.8 + b * 0.7;
    const phase = t * (1.0 + b * 0.45 + amp * 2.2);

    // Filled body
    ctx.beginPath();
    for (let px = 0; px <= W; px += 2) {
      const y = cy + Math.sin((px / W) * Math.PI * 2 * freq + phase) * wH;
      px === 0 ? ctx.moveTo(px, y) : ctx.lineTo(px, y);
    }
    ctx.lineTo(W, cy + sliceH * 0.55); ctx.lineTo(0, cy + sliceH * 0.55); ctx.closePath();
    ctx.fillStyle = `rgba(${colors[b]},${0.03 + amp * 0.16})`; ctx.fill();

    // Primary line
    ctx.beginPath();
    for (let px = 0; px <= W; px += 2) {
      const y = cy + Math.sin((px / W) * Math.PI * 2 * freq + phase) * wH;
      px === 0 ? ctx.moveTo(px, y) : ctx.lineTo(px, y);
    }
    ctx.strokeStyle = `rgba(${colors[b]},${0.45 + amp * 0.55})`;
    ctx.lineWidth = isBeat && b < 2 ? 3 + amp * 2.5 : 1.5 + amp * 2;
    ctx.lineJoin = "round"; ctx.stroke();

    // Harmonic echo
    ctx.beginPath();
    for (let px = 0; px <= W; px += 3) {
      const y = cy + Math.sin((px / W) * Math.PI * 2 * freq * 2 + phase * 1.4 + 1) * wH * 0.3;
      px === 0 ? ctx.moveTo(px, y) : ctx.lineTo(px, y);
    }
    ctx.strokeStyle = `rgba(${colors[b]},${0.12 + amp * 0.22})`; ctx.lineWidth = 1; ctx.stroke();
  }

  if (isBeat) {
    const fa = (bass - 0.48) * 0.15;
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, `rgba(0,229,255,${fa})`); g.addColorStop(1, `rgba(155,126,255,${fa * 0.4})`);
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  }
}

function drawTunnel(ctx, W, H, s, bufLen, t, bass, mid) {
  const cx = W / 2, cy = H / 2;
  const avg = mid;
  const rings = 12;
  const maxR = Math.min(W, H) * 0.52;

  for (let r = rings; r >= 1; r--) {
    const frac = r / rings;
    const bandIdx = Math.floor(frac * (bufLen * 0.5));
    const amp = s[bandIdx] || 0;
    const radius = maxR * frac * (1 + bass * 0.18 * (1 - frac));
    const sides = 6 + r;
    const rotation = t * (0.15 + (rings - r) * 0.05) + bass * 0.4;
    const alpha = (1 - frac) * (0.25 + amp * 0.4);
    const hue = 185 + frac * 80 + t * 10 % 60;

    ctx.beginPath();
    for (let s = 0; s <= sides; s++) {
      const angle = (s / sides) * Math.PI * 2 + rotation;
      const x = cx + Math.cos(angle) * radius;
      const y = cy + Math.sin(angle) * radius;
      s === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.strokeStyle = `hsla(${hue},100%,65%,${alpha})`;
    ctx.lineWidth = 1 + amp * 1.5; ctx.stroke();

    // Connect to next ring
    if (r < rings) {
      const nextFrac = (r + 1) / rings;
      const nextR = maxR * nextFrac * (1 + bass * 0.18 * (1 - nextFrac));
      const spokes = 4;
      for (let s = 0; s < spokes; s++) {
        const angle = (s / spokes) * Math.PI * 2 + rotation;
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius);
        ctx.lineTo(cx + Math.cos(angle) * nextR, cy + Math.sin(angle) * nextR);
        ctx.strokeStyle = `hsla(${hue},100%,65%,${alpha * 0.4})`; ctx.lineWidth = 0.5; ctx.stroke();
      }
    }
  }

  // Centre dot
  const dotR = Math.max(0, 3 + bass * 12 + avg * 8);
  const dg = ctx.createRadialGradient(cx, cy, 0, cx, cy, dotR * 4);
  dg.addColorStop(0, `rgba(0,229,255,${0.9 + bass * 0.1})`);
  dg.addColorStop(1, "rgba(0,0,0,0)");
  ctx.beginPath(); ctx.arc(cx, cy, dotR, 0, Math.PI * 2); ctx.fillStyle = dg; ctx.fill();
}

function drawPlasma(ctx, W, H, s, bufLen, t, particlesRef, bass, beat) {
  const cx = W / 2, cy = H / 2;
  const avg = s.reduce((a, v) => a + v, 0) / bufLen;
  const isBeat = beat;
  const orbitCount = 3;
  const orbitRadii = [Math.min(W, H) * 0.15, Math.min(W, H) * 0.26, Math.min(W, H) * 0.38];

  // Spawn particles from orbit positions
  if (avg > 0.06 && particlesRef.current.length < 220) {
    const count = isBeat ? Math.floor(6 + bass * 12) : Math.floor(1 + avg * 3);
    for (let i = 0; i < count; i++) {
      const orbit = Math.floor(Math.random() * orbitCount);
      const angle = Math.random() * Math.PI * 2;
      const r = orbitRadii[orbit] * (0.8 + Math.random() * 0.4);
      const spd = isBeat ? 0.7 + bass * 1.2 : 0.3 + avg * 0.6;
      particlesRef.current.push({
        x: cx + Math.cos(angle) * r, y: cy + Math.sin(angle) * r,
        vx: (Math.random() - 0.5) * spd * 2, vy: (Math.random() - 0.5) * spd * 2,
        life: 1, decay: 0.006 + Math.random() * 0.01,
        size: 1.5 + Math.random() * (isBeat ? 4 * bass : 2),
        hue: 180 + orbit * 50 + Math.random() * 40,
      });
    }
  }
  const alive = [];
  for (const p of particlesRef.current) {
    p.x += p.vx; p.y += p.vy; p.vx *= 0.96; p.vy *= 0.96; p.life -= p.decay;
    if (p.life <= 0) continue;
    const r = Math.max(0, p.size * p.life);
    if (r > 0) {
      ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
      ctx.fillStyle = `hsla(${p.hue},100%,70%,${p.life * 0.85})`; ctx.fill();
    }
    alive.push(p);
  }
  particlesRef.current = alive;

  for (let o = 0; o < orbitCount; o++) {
    const bandIdx = Math.floor((o / orbitCount) * bufLen * 0.5);
    const amp = s[bandIdx] || 0;
    const r = orbitRadii[o] * (1 + bass * 0.2 + amp * 0.1);
    const hue = 185 + o * 55;
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.strokeStyle = `hsla(${hue},100%,62%,${0.15 + amp * 0.3})`; ctx.lineWidth = 1; ctx.stroke();
  }

  // Centre plasma glow
  const gr = Math.min(W, H) * 0.2 + bass * 20;
  const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, gr);
  g.addColorStop(0, `rgba(155,100,255,${0.2 + bass * 0.3})`);
  g.addColorStop(0.5, `rgba(0,200,220,${0.08 + avg * 0.1})`);
  g.addColorStop(1, "rgba(0,0,0,0)");
  ctx.beginPath(); ctx.arc(cx, cy, gr, 0, Math.PI * 2); ctx.fillStyle = g; ctx.fill();
}

function drawDrift(ctx, W, H, s, bufLen, t, particlesRef, bass, treble) {
  const avg = s.reduce((a, v) => a + v, 0) / bufLen;
  const isBeat = bass > 0.44;
  const maxP = 200;

  if (avg > 0.05 && particlesRef.current.length < maxP) {
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
      particlesRef.current.push({
        x, y, vx: Math.cos(angle) * spd, vy: Math.sin(angle) * spd,
        life: 1, decay: 0.005 + Math.random() * 0.009,
        size: isBeat ? 2 + Math.random() * 4 * bass : 1 + Math.random() * 2.5,
        hue: 160 + Math.random() * 130, trail: [],
      });
    }
  }
  const alive = [];
  for (const p of particlesRef.current) {
    p.trail.push({ x: p.x, y: p.y, life: p.life });
    if (p.trail.length > 8) p.trail.shift();
    p.x += p.vx; p.y += p.vy; p.vx *= 0.99; p.vy *= 0.99; p.life -= p.decay;
    if (p.life <= 0) continue;

    // Draw trail
    for (let ti = 0; ti < p.trail.length - 1; ti++) {
      const a = p.trail[ti], b = p.trail[ti + 1];
      const alpha = (ti / p.trail.length) * p.life * 0.4;
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y);
      ctx.strokeStyle = `hsla(${p.hue},100%,70%,${alpha})`; ctx.lineWidth = p.size * 0.5; ctx.stroke();
    }
    const r = Math.max(0, p.size * p.life);
    if (r > 0) {
      ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
      ctx.fillStyle = `hsla(${p.hue},100%,75%,${p.life * 0.9})`; ctx.fill();
    }
    alive.push(p);
  }
  particlesRef.current = alive;

  // Ambient centre
  const gr = Math.min(W, H) * 0.25 + avg * 25;
  const g = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, gr);
  g.addColorStop(0, `rgba(0,200,255,${0.06 + avg * 0.1})`);
  g.addColorStop(1, "rgba(0,0,0,0)");
  ctx.beginPath(); ctx.arc(W / 2, H / 2, gr, 0, Math.PI * 2); ctx.fillStyle = g; ctx.fill();
}

// ── Fallback draw functions (iOS / no analyser) ───────────────────────────────

function fallbackEnergy(ctx, W, H, t, active) {
  const count = 48, gap = 3;
  const bw = (W - gap * (count - 1)) / count;
  for (let i = 0; i < count; i++) {
    const w = active ? (Math.sin(t * 2.4 + i * 0.38) * 0.5 + 0.5) * (Math.sin(t * 1.1 + i * 0.14) * 0.3 + 0.7) : 0.05 + Math.sin(i * 0.5) * 0.03;
    const h = Math.max(3, w * H * 0.85);
    ctx.fillStyle = `hsla(${185 + i * 1.2},100%,58%,${0.3 + w * 0.55})`;
    ctx.beginPath(); ctx.roundRect(i * (bw + gap), H - h, bw, h, [2, 2, 0, 0]); ctx.fill();
  }
}

function fallbackCosmic(ctx, W, H, t, active, particlesRef) {
  const cx = W / 2, cy = H / 2;
  const spawn = active ? 0.5 : 0.06;
  if (Math.random() < spawn && particlesRef.current.length < (active ? 150 : 25)) {
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
  [[1, 2.5, "0,220,255"], [1.2, 1.5, "155,126,255"], [1.42, 1, "0,200,220"]].forEach(([scale, w, c]) => {
    ctx.beginPath(); ctx.arc(cx, cy, baseR * scale, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(${c},${0.55 * pulse})`; ctx.lineWidth = w; ctx.stroke();
  });
  const bars = 48;
  for (let i = 0; i < bars; i++) {
    const a = (i / bars) * Math.PI * 2 - Math.PI / 2;
    const v = active ? Math.sin(t * 1.8 + i * 0.26) * 0.5 + 0.5 : 0.08;
    const inner = baseR * 1.04, outer = inner + v * baseR * 0.4 + 2;
    ctx.beginPath(); ctx.moveTo(cx + Math.cos(a) * inner, cy + Math.sin(a) * inner);
    ctx.lineTo(cx + Math.cos(a) * outer, cy + Math.sin(a) * outer);
    ctx.strokeStyle = `hsla(${185 + v * 60},100%,62%,${active ? 0.35 + v * 0.4 : 0.12})`; ctx.lineWidth = 2; ctx.lineCap = "round"; ctx.stroke();
  }
}

function fallbackAurora(ctx, W, H, t, active) {
  const bands = 5, colors = ["0,229,255","0,200,220","100,160,255","155,126,255","200,100,255"];
  for (let b = 0; b < bands; b++) {
    const amp = active ? Math.max(0.04, 0.28 + Math.sin(t * (1.3 + b * 0.45) + b * 1.2) * 0.26 + Math.sin(t * (2.5 + b * 0.3)) * 0.1) : 0.04;
    const sliceH = H / bands, cy = sliceH * b + sliceH / 2;
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
  for (let r = rings; r >= 1; r--) {
    const frac = r / rings;
    const radius = maxR * frac * (active ? 1 + Math.sin(t * 1.2 + frac * 3) * 0.05 : 1);
    const sides = 6 + r, rotation = t * (0.12 + (rings - r) * 0.04);
    const alpha = (1 - frac) * (active ? 0.2 + frac * 0.2 : 0.1);
    ctx.beginPath();
    for (let s = 0; s <= sides; s++) { const a = (s / sides) * Math.PI * 2 + rotation; ctx.lineTo(cx + Math.cos(a) * radius, cy + Math.sin(a) * radius); }
    ctx.closePath(); ctx.strokeStyle = `hsla(${185 + frac * 80},100%,65%,${alpha})`; ctx.lineWidth = 1; ctx.stroke();
  }
}

function fallbackPlasma(ctx, W, H, t, active, particlesRef) {
  fallbackCosmic(ctx, W, H, t, active, particlesRef);
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
    const spd = 0.3 + Math.random() * 0.8;
    particlesRef.current.push({ x, y, vx: Math.cos(angle) * spd, vy: Math.sin(angle) * spd, life: 1, decay: 0.006 + Math.random() * 0.008, size: 1 + Math.random() * 2.5, hue: 160 + Math.random() * 130, trail: [] });
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

// ── Smoothed frequency data ────────────────────────────────────────────────────
// Persistent smoothed buffer — attack fast, release slow
const _smoothed = { data: null };
function getSmoothedFreq(an) {
  const bufLen = an.frequencyBinCount;
  const raw = new Uint8Array(bufLen);
  an.getByteFrequencyData(raw);

  if (!_smoothed.data || _smoothed.data.length !== bufLen) {
    _smoothed.data = new Float32Array(bufLen);
  }
  const s = _smoothed.data;
  for (let i = 0; i < bufLen; i++) {
    const r = raw[i] / 255;
    // Attack 0.6 (fast on transients), release 0.12 (slow decay = smooth)
    s[i] = r > s[i] ? s[i] * 0.4 + r * 0.6 : s[i] * 0.88 + r * 0.12;
  }
  return s; // values 0–1
}

function getBassS(s, bufLen)   { const n = Math.floor(bufLen * 0.07); let v=0; for(let i=0;i<n;i++) v+=s[i]; return v/n; }
function getMidS(s, bufLen)    { const lo=Math.floor(bufLen*0.07), hi=Math.floor(bufLen*0.35); let v=0; for(let i=lo;i<hi;i++) v+=s[i]; return v/(hi-lo); }
function getTrebleS(s, bufLen) { const lo=Math.floor(bufLen*0.35), hi=Math.floor(bufLen*0.75); let v=0; for(let i=lo;i<hi;i++) v+=s[i]; return v/(hi-lo); }

// Beat detection — simple threshold on bass energy with cooldown
const _beat = { last: 0, triggered: false };
function detectBeat(bass) {
  const now = Date.now();
  const isBeat = bass > 0.45 && (now - _beat.last) > 280;
  if (isBeat) { _beat.last = now; _beat.triggered = true; }
  else _beat.triggered = false;
  return isBeat;
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function RadioVisualizer({ isPlaying, currentSong }) {
  const canvasRef    = useRef(null);
  const rafRef       = useRef(null);
  const analyserRef  = useRef(null);
  const particlesRef = useRef([]);
  const chipRowRef   = useRef(null);
  const logTimerRef  = useRef(0);
  const { audioRef } = usePlayer();

  const getSavedMode = () => { try { return localStorage.getItem(PREF_KEY) || "energy"; } catch { return "energy"; } };
  const [mode, setMode] = useState(getSavedMode);
  const [analyserConnected, setAnalyserConnected] = useState(false);

  useEffect(() => { try { localStorage.setItem(PREF_KEY, mode); } catch {} }, [mode]);

  // Scroll active chip into view
  useEffect(() => {
    if (!chipRowRef.current) return;
    const active = chipRowRef.current.querySelector("[data-active='true']");
    if (active) active.scrollIntoView({ inline: "center", behavior: "smooth", block: "nearest" });
  }, [mode]);

  // ── Try to connect analyser — attempt on ALL platforms, iOS included ────────
  const tryConnectAnalyser = useCallback(() => {
    const audio = audioRef?.current;
    const audioElementFound = !!audio;
    let connected = false;
    let ctxState = "N/A";

    // Try even on iOS — AudioContext may work if user gesture already fired
    if (audio) {
      const an = getGlobalAnalyser(audio);
      if (an) {
        analyserRef.current = an;
        connected = true;
        try { ctxState = an.context?.state || "unknown"; } catch {}
        // Tune for reactive beat response
        an.fftSize = 2048;
        an.smoothingTimeConstant = 0.0; // we do our own smoothing
      }
    }

    if (!connected) analyserRef.current = null;
    setAnalyserConnected(connected);

    const canvas = canvasRef.current;
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas?.getBoundingClientRect();
    console.log("[Viz] probe |",
      "audioElementFound:", audioElementFound,
      "| audioContextState:", ctxState,
      "| analyserConnected:", connected,
      "| usingFallbackVisualizer:", !connected,
      "| isIOS:", isIOS,
      "| devicePixelRatio:", dpr,
      "| canvasWidth:", rect?.width ?? 0,
      "| canvasHeight:", rect?.height ?? 0,
    );

    return connected;
  }, [audioRef]);

  const stopLoop = useCallback(() => {
    if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
  }, []);

  const startLoop = useCallback((currentMode, useAnalyser) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const loop = () => {
      // ── Always re-read logical size and re-apply DPR scale each frame ──
      const dpr  = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      const lW   = rect.width  || 300;
      const lH   = rect.height || 180;
      const pW   = Math.round(lW * dpr);
      const pH   = Math.round(lH * dpr);

      // Only resize backing store when dimensions actually change (perf guard)
      if (canvas.width !== pW || canvas.height !== pH) {
        canvas.width  = pW;
        canvas.height = pH;
      }

      const ctx = canvas.getContext("2d");
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0); // always correct — no accumulated scale
      ctx.clearRect(0, 0, lW, lH);

      const t  = Date.now() / 1000;
      const an = useAnalyser ? analyserRef.current : null;

      if (an) {
        const bufLen = an.frequencyBinCount;
        const s      = getSmoothedFreq(an);
        const waveData = new Uint8Array(bufLen);
        an.getByteTimeDomainData(waveData);

        const bass   = getBassS(s, bufLen);
        const mid    = getMidS(s, bufLen);
        const treble = getTrebleS(s, bufLen);
        const beat   = detectBeat(bass);

        // Periodic debug log (every 3s)
        const now = Date.now();
        if (now - logTimerRef.current > 3000) {
          logTimerRef.current = now;
          // Check if data is actually changing
          const nonZero = Array.from(s).filter(v => v > 0.01).length;
          console.log("[Viz] live |",
            "bassEnergy:", bass.toFixed(3),
            "| midEnergy:", mid.toFixed(3),
            "| trebleEnergy:", treble.toFixed(3),
            "| beatDetected:", beat,
            "| frequencyDataChanging:", nonZero > 5,
            "| usingFallbackVisualizer: false",
          );
        }

        switch (currentMode) {
          case "energy":  drawEnergy(ctx, lW, lH, s, bufLen, bass, mid, treble, beat); break;
          case "cosmic":  drawCosmicWaves(ctx, lW, lH, s, bufLen, t, particlesRef, bass, beat); break;
          case "neon":    drawNeonPulse(ctx, lW, lH, s, bufLen, bass, mid); break;
          case "aurora":  drawAurora(ctx, lW, lH, s, bufLen, t, bass, beat); break;
          case "tunnel":  drawTunnel(ctx, lW, lH, s, bufLen, t, bass, mid); break;
          case "plasma":  drawPlasma(ctx, lW, lH, s, bufLen, t, particlesRef, bass, beat); break;
          case "drift":
          default:        drawDrift(ctx, lW, lH, s, bufLen, t, particlesRef, bass, treble); break;
        }
      } else {
        const active = isPlaying;
        if (Date.now() - logTimerRef.current > 3000) {
          logTimerRef.current = Date.now();
          console.log("[Viz] fallback | usingFallbackVisualizer: true | isIOS:", isIOS, "| isPlaying:", active);
        }
        switch (currentMode) {
          case "energy":  fallbackEnergy(ctx, lW, lH, t, active); break;
          case "cosmic":  fallbackCosmic(ctx, lW, lH, t, active, particlesRef); break;
          case "neon":    fallbackNeon(ctx, lW, lH, t, active); break;
          case "aurora":  fallbackAurora(ctx, lW, lH, t, active); break;
          case "tunnel":  fallbackTunnel(ctx, lW, lH, t, active); break;
          case "plasma":  fallbackPlasma(ctx, lW, lH, t, active, particlesRef); break;
          case "drift":
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

  // ResizeObserver just triggers a re-probe (canvas resize now happens in loop)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ro = new ResizeObserver(() => {
      // Force canvas backing store refresh on next frame (handled in loop)
      if (canvas) { canvas.width = 0; canvas.height = 0; }
    });
    ro.observe(canvas);
    return () => ro.disconnect();
  }, []);

  return (
    <div style={{ position: "relative", width: "100%", overflow: "hidden", borderRadius: "inherit" }}>
      {/* Canvas */}
      <div style={{ paddingTop: "min(56.25%, 260px)", position: "relative" }}>
        <canvas ref={canvasRef} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", display: "block" }} />
      </div>

      {/* ── Premium swipeable chip selector ── */}
      <div style={{
        padding: "10px 12px 12px",
        background: "linear-gradient(180deg, rgba(4,4,18,0) 0%, rgba(4,4,18,0.85) 100%)",
        position: "relative",
      }}>
        <div
          ref={chipRowRef}
          style={{
            display: "flex", gap: 6, overflowX: "auto", overflowY: "hidden",
            scrollbarWidth: "none", WebkitOverflowScrolling: "touch",
            paddingBottom: 2,
          }}
        >
          {MODES.map(m => {
            const isActive = m.id === mode;
            return (
              <button
                key={m.id}
                data-active={isActive}
                onClick={() => setMode(m.id)}
                style={{
                  flexShrink: 0,
                  display: "inline-flex", alignItems: "center", gap: 5,
                  padding: "6px 12px", borderRadius: 20,
                  fontSize: 10, fontWeight: 800, letterSpacing: "0.06em",
                  textTransform: "uppercase", cursor: "pointer",
                  whiteSpace: "nowrap",
                  transition: "all 0.2s ease",
                  userSelect: "none", WebkitUserSelect: "none",
                  background: isActive
                    ? "rgba(0,220,255,0.15)"
                    : "rgba(255,255,255,0.04)",
                  border: isActive
                    ? "1px solid rgba(0,220,255,0.55)"
                    : "1px solid rgba(255,255,255,0.08)",
                  color: isActive ? "#00E5FF" : "rgba(255,255,255,0.35)",
                  boxShadow: isActive
                    ? "0 0 12px rgba(0,220,255,0.2), inset 0 0 8px rgba(0,220,255,0.06)"
                    : "none",
                }}>
                <span style={{ fontSize: 11, lineHeight: 1 }}>{m.icon}</span>
                {m.label}
              </button>
            );
          })}
        </div>
        {/* Hide scrollbar for webkit */}
        <style>{`.viz-chips::-webkit-scrollbar{display:none}`}</style>
      </div>
    </div>
  );
}