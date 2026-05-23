/**
 * RadioVisualizer — Upper Vibe Media
 *
 * iOS FIX: Uses a SEPARATE read-only AnalyserNode (does NOT reroute audio output).
 * The main PlayerContext skips AudioContext on iOS to protect AirPlay/Bluetooth.
 * This component creates its own "tap" AudioContext solely for frequency analysis,
 * with NO destination connection — so AirPlay/Bluetooth output is completely unaffected.
 */

import React, { useRef, useEffect, useCallback, useState } from "react";
import { usePlayer } from "../../context/PlayerContext";

const PREF_KEY = "uvm_radio_viz_v6";

const MODES = [
  { id: "spectrum", label: "Spectrum",       icon: "▊" },
  { id: "waveform", label: "Waveform",       icon: "∿" },
  { id: "energy",   label: "Energy Bars",    icon: "▋" },
  { id: "cosmic",   label: "Cosmic Waves",   icon: "✦" },
  { id: "neon",     label: "Neon Pulse",     icon: "◎" },
  { id: "aurora",   label: "Aurora Flow",    icon: "≋" },
  { id: "tunnel",   label: "Freq Tunnel",    icon: "⊙" },
  { id: "plasma",   label: "Plasma Orbit",   icon: "◈" },
  { id: "drift",    label: "Particle Drift", icon: "·" },
];

const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent) ||
  (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
const isSafari = /Safari\//.test(navigator.userAgent) && !/Chrome\//.test(navigator.userAgent);
const getDpr = () => window.devicePixelRatio || 1;

// ── Tap-only AudioContext (no output routing — AirPlay/BT safe) ───────────────
let _tapCtx    = null;
let _tapSource = null;
let _tapAn     = null;
let _tapEl     = null;

function getTapAnalyser(audioEl) {
  if (!audioEl) return null;
  if (_tapAn && _tapEl === audioEl && _tapCtx && _tapCtx.state !== "closed") {
    return _tapAn;
  }
  try { if (_tapSource) _tapSource.disconnect(); } catch {}
  try { if (_tapAn) _tapAn.disconnect(); } catch {}
  try {
    if (!_tapCtx || _tapCtx.state === "closed") {
      _tapCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (_tapCtx.state === "suspended") _tapCtx.resume().catch(() => {});
    _tapSource = _tapCtx.createMediaElementSource(audioEl);
    _tapAn     = _tapCtx.createAnalyser();
    _tapAn.fftSize = 2048;
    _tapAn.smoothingTimeConstant = 0.0;
    // Connect source → analyser ONLY (no destination = silent tap)
    _tapSource.connect(_tapAn);
    _tapEl = audioEl;
    console.log("[Viz] tapAnalyser created | iOS:", isIOS, "| Safari:", isSafari, "| ctxState:", _tapCtx.state);
    return _tapAn;
  } catch (e) {
    console.warn("[Viz] tapAnalyser failed:", e.message);
    _tapAn = null; _tapSource = null;
    return null;
  }
}

async function resumeTapCtx() {
  if (_tapCtx && _tapCtx.state === "suspended") {
    try { await _tapCtx.resume(); } catch {}
  }
}

// ── Smoothing state ───────────────────────────────────────────────────────────
const _sm    = { data: null };
const _peaks = { data: null, decay: null };
const _wfSm  = { data: null };
const IOS_GAIN = isIOS ? 1.6 : 1.0;

function getSmoothedFreq(an) {
  const bufLen = an.frequencyBinCount;
  const raw = new Uint8Array(bufLen);
  an.getByteFrequencyData(raw);
  if (!_sm.data || _sm.data.length !== bufLen) _sm.data = new Float32Array(bufLen);
  const sm = _sm.data;
  for (let i = 0; i < bufLen; i++) {
    let r = Math.min(1, (raw[i] / 255) * IOS_GAIN);
    sm[i] = r > sm[i] ? sm[i] * 0.3 + r * 0.7 : sm[i] * 0.85 + r * 0.15;
  }
  return sm;
}

function getBass(sm, n)   { const e = Math.max(1, Math.floor(n * 0.06)); let v = 0; for (let i = 0; i < e; i++) v += sm[i]; return Math.min(1, v / e); }
function getMid(sm, n)    { const lo = Math.floor(n * 0.06), hi = Math.floor(n * 0.32); let v = 0; for (let i = lo; i < hi; i++) v += sm[i]; return Math.min(1, v / (hi - lo)); }
function getTreble(sm, n) { const lo = Math.floor(n * 0.32), hi = Math.floor(n * 0.72); let v = 0; for (let i = lo; i < hi; i++) v += sm[i]; return Math.min(1, v / (hi - lo)); }
function getAvg(sm, n)    { let v = 0; for (let i = 0; i < n; i++) v += sm[i]; return Math.min(1, v / n); }

const _beat = { last: 0, hist: new Float32Array(8), idx: 0 };
function detectBeat(bass) {
  const now = Date.now();
  _beat.hist[_beat.idx % 8] = bass; _beat.idx++;
  const avg = _beat.hist.reduce((a, b) => a + b, 0) / 8;
  const thresh = Math.min(0.55, avg * 1.45 + 0.12);
  if (bass > thresh && bass > 0.18 && now - _beat.last > 250) { _beat.last = now; return true; }
  return false;
}

function isAnalyserLive(sm, bufLen) {
  let nz = 0; const c = Math.min(bufLen, 64);
  for (let i = 0; i < c; i++) if (sm[i] > 0.01) nz++;
  return nz > 3;
}

function roundedBar(ctx, x, y, w, h, r) {
  if (h <= 0 || w <= 0) return;
  r = Math.min(r, w / 2, Math.max(0, h / 2));
  ctx.beginPath();
  ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h); ctx.lineTo(x, y + h); ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r); ctx.closePath();
}

// ── Draw: Spectrum ────────────────────────────────────────────────────────────
function drawSpectrum(ctx, W, H, sm, bufLen, bass, beat, color) {
  const barCount = 72, gap = Math.max(1, W * 0.003);
  const barW = (W - gap * (barCount - 1)) / barCount;
  const usable = Math.floor(bufLen * 0.75);
  if (!_peaks.data || _peaks.data.length !== barCount) {
    _peaks.data = new Float32Array(barCount); _peaks.decay = new Float32Array(barCount);
  }
  for (let i = 0; i < barCount; i++) {
    const logStart = Math.pow(usable, i / barCount), logEnd = Math.pow(usable, (i + 1) / barCount);
    const binFrom = Math.floor(logStart), binTo = Math.max(binFrom + 1, Math.ceil(logEnd));
    let max = 0;
    for (let b = binFrom; b < binTo && b < usable; b++) max = Math.max(max, sm[b]);
    const boost = i < 10 ? 1.5 + bass * 0.8 : i < 20 ? 1.2 + bass * 0.4 : 1.0;
    const v = Math.min(1, max * boost);
    const h = Math.max(2, v * (H - 6));
    const x = i * (barW + gap), y = H - h;
    const grad = ctx.createLinearGradient(0, H, 0, y);
    grad.addColorStop(0, `rgba(${color},0.65)`); grad.addColorStop(0.5, `rgba(${color},1.0)`);
    grad.addColorStop(0.88, `rgba(${color},1.0)`); grad.addColorStop(1, "rgba(255,255,255,0.95)");
    ctx.fillStyle = grad; roundedBar(ctx, x, y, barW, h, 2); ctx.fill();
    if (v >= _peaks.data[i]) { _peaks.data[i] = v; _peaks.decay[i] = 0; }
    else { _peaks.decay[i] += 0.002; _peaks.data[i] = Math.max(0, _peaks.data[i] - _peaks.decay[i]); }
    const py = H - Math.max(2, _peaks.data[i] * (H - 6)) - 2;
    ctx.fillStyle = beat && i < 14 ? "rgba(255,255,255,1)" : `rgba(${color},0.85)`;
    ctx.fillRect(x, py, barW, 2);
  }
  ctx.save(); ctx.globalAlpha = 0.1; ctx.scale(1, -1); ctx.translate(0, -H * 2);
  for (let i = 0; i < barCount; i++) {
    const logStart = Math.pow(usable, i / barCount), logEnd = Math.pow(usable, (i + 1) / barCount);
    const binFrom = Math.floor(logStart), binTo = Math.max(binFrom + 1, Math.ceil(logEnd));
    let max = 0;
    for (let b = binFrom; b < binTo && b < usable; b++) max = Math.max(max, sm[b]);
    const v = Math.min(1, max), h = Math.max(1, v * (H - 6) * 0.35);
    ctx.fillStyle = `rgba(${color},1)`; ctx.fillRect(i * (barW + gap), H - h, barW, h);
  }
  ctx.restore();
}

// ── Draw: Waveform ────────────────────────────────────────────────────────────
function drawWaveform(ctx, W, H, an, bass, beat, color) {
  const bufLen = an.fftSize;
  const raw = new Uint8Array(bufLen);
  an.getByteTimeDomainData(raw);
  if (!_wfSm.data || _wfSm.data.length !== bufLen) _wfSm.data = new Float32Array(bufLen);
  const wf = _wfSm.data;
  let rms = 0;
  for (let i = 0; i < bufLen; i++) {
    const s = (raw[i] / 128.0) - 1.0; rms += s * s;
    wf[i] = s > wf[i] ? wf[i] * 0.4 + s * 0.6 : wf[i] * 0.75 + s * 0.25;
  }
  rms = Math.sqrt(rms / bufLen) * IOS_GAIN;
  const cy = H / 2, amplitude = H * 0.45 * Math.max(0.08, rms * 3.0) * (1 + bass * 0.6);
  const drawLen = Math.min(bufLen, 1024), step = W / drawLen;
  ctx.save();
  ctx.shadowBlur = beat ? 28 : 14;
  ctx.shadowColor = `rgba(${color},${0.6 + bass * 0.4})`;
  ctx.beginPath(); ctx.moveTo(0, cy);
  for (let i = 0; i < drawLen; i++) ctx.lineTo(i * step, cy + wf[i * Math.floor(bufLen / drawLen)] * amplitude);
  ctx.lineTo(W, cy); ctx.closePath();
  const fg = ctx.createLinearGradient(0, cy - amplitude, 0, cy + amplitude);
  fg.addColorStop(0, `rgba(${color},0.18)`); fg.addColorStop(0.5, `rgba(${color},0.08)`); fg.addColorStop(1, `rgba(${color},0.18)`);
  ctx.fillStyle = fg; ctx.fill();
  ctx.beginPath();
  for (let i = 0; i < drawLen; i++) {
    const x = i * step, y = cy + wf[i * Math.floor(bufLen / drawLen)] * amplitude;
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  }
  const lg = ctx.createLinearGradient(0, 0, W, 0);
  lg.addColorStop(0, `rgba(${color},0.35)`); lg.addColorStop(0.25, `rgba(${color},1.0)`);
  lg.addColorStop(0.5, "rgba(255,255,255,0.95)"); lg.addColorStop(0.75, `rgba(${color},1.0)`); lg.addColorStop(1, `rgba(${color},0.35)`);
  ctx.strokeStyle = lg; ctx.lineWidth = beat ? 3 : 2; ctx.lineJoin = "round"; ctx.lineCap = "round"; ctx.stroke();
  ctx.restore();
  ctx.beginPath(); ctx.moveTo(0, cy); ctx.lineTo(W, cy);
  ctx.strokeStyle = `rgba(${color},0.07)`; ctx.lineWidth = 1; ctx.stroke();
}

// ── Draw: Energy Bars ─────────────────────────────────────────────────────────
function drawEnergy(ctx, W, H, sm, bufLen, bass, mid, treble, beat) {
  const barCount = 60, gap = Math.max(1, W * 0.004);
  const barW = (W - gap * (barCount - 1)) / barCount;
  const usable = Math.floor(bufLen * 0.8);
  for (let i = 0; i < barCount; i++) {
    const binIdx = Math.floor((i / barCount) * usable);
    const boost = i < 12 ? 1.6 + bass * 1.0 : i < 25 ? 1.2 + mid * 0.5 : i > 45 ? 0.9 + treble * 0.4 : 1.0;
    const v = Math.min(1, sm[binIdx] * boost);
    const h = Math.max(3, v * H * 0.96), x = i * (barW + gap), hue = 185 + v * 75;
    const grad = ctx.createLinearGradient(0, H, 0, H - h);
    grad.addColorStop(0, `hsla(${hue},100%,42%,${0.55 + v * 0.45})`);
    grad.addColorStop(0.55, `hsla(${hue + 18},100%,62%,${0.75 + v * 0.25})`);
    grad.addColorStop(1, `hsla(${hue + 36},100%,84%,${0.35 + v * 0.45})`);
    ctx.fillStyle = grad; roundedBar(ctx, x, H - h, barW, h, 3); ctx.fill();
  }
}

// ── Draw: Neon Pulse ──────────────────────────────────────────────────────────
function drawNeonPulse(ctx, W, H, sm, bufLen, bass, mid) {
  const cx = W / 2, cy = H / 2, t = Date.now() / 1000, baseR = Math.min(W, H) * 0.20;
  [
    { r: baseR * (1 + bass * 1.8), alpha: Math.min(1, 0.7 + bass * 0.8), w: 3 + bass * 6, c: "0,229,255" },
    { r: baseR * (1.35 + mid * 0.9 + bass * 0.8), alpha: 0.45 + bass * 0.55, w: 2 + bass * 3, c: "155,126,255" },
    { r: baseR * (1.7 + mid + bass * 0.9), alpha: 0.2 + bass * 0.4, w: 1.5 + bass * 2, c: "0,200,220" },
    { r: baseR * (2.1 + mid * 0.7 + bass * 0.6), alpha: 0.08 + bass * 0.22, w: 0.8, c: "200,100,255" },
  ].forEach(rg => {
    if (rg.r <= 0) return;
    ctx.beginPath(); ctx.arc(cx, cy, rg.r, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(${rg.c},${rg.alpha})`; ctx.lineWidth = rg.w; ctx.stroke();
  });
  const sinceBeat = Date.now() - _beat.last;
  if (sinceBeat < 400) {
    const prog = sinceBeat / 400, shockR = baseR * (1 + prog * 3.5);
    ctx.beginPath(); ctx.arc(cx, cy, shockR, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(0,229,255,${(1 - prog) * 0.7})`; ctx.lineWidth = (1 - prog) * 8; ctx.stroke();
  }
  const bars = 80, usable = Math.floor(bufLen * 0.75), spin = t * 0.45;
  for (let i = 0; i < bars; i++) {
    const v = sm[Math.floor((i / bars) * usable)];
    const angle = (i / bars) * Math.PI * 2 - Math.PI / 2 + spin;
    const wobble = Math.sin(t * 3.5 + i * 0.18) * 0.05 * (1 + bass);
    const inner = baseR * (0.92 + bass * 0.18 + wobble), outer = inner + Math.max(2, v * baseR * (1.4 + bass * 1.8));
    ctx.beginPath(); ctx.moveTo(cx + Math.cos(angle) * inner, cy + Math.sin(angle) * inner);
    ctx.lineTo(cx + Math.cos(angle) * outer, cy + Math.sin(angle) * outer);
    ctx.strokeStyle = `hsla(${185 + v * 120 + i * 0.8},100%,62%,${0.4 + v * 0.65})`;
    ctx.lineWidth = Math.max(1.5, (W / bars) * 0.6); ctx.lineCap = "round"; ctx.stroke();
  }
  const breathe = Math.sin(t * 2.8) * 0.3 + 0.7, dotR = Math.max(0, 6 + bass * 32 + mid * 12) * breathe;
  if (dotR > 0) {
    const dg = ctx.createRadialGradient(cx, cy, 0, cx, cy, dotR * 4);
    dg.addColorStop(0, `rgba(0,229,255,${0.95 + bass * 0.05})`);
    dg.addColorStop(0.3, `rgba(155,100,255,${0.3 + bass * 0.3})`); dg.addColorStop(1, "rgba(0,0,0,0)");
    ctx.beginPath(); ctx.arc(cx, cy, dotR, 0, Math.PI * 2); ctx.fillStyle = dg; ctx.fill();
  }
}

// ── Draw: Tunnel ──────────────────────────────────────────────────────────────
function drawTunnel(ctx, W, H, sm, bufLen, t, bass, mid) {
  const cx = W / 2, cy = H / 2, rings = 14, maxR = Math.min(W, H) * 0.5;
  const beatAge = (Date.now() - _beat.last) / 1000, beatPulse = Math.max(0, 1 - beatAge * 3.5);
  for (let ri = rings; ri >= 1; ri--) {
    const frac = ri / rings, amp = sm[Math.floor(frac * bufLen * 0.45)] || 0;
    const zoomBass = bass * 0.55 + beatPulse * 0.35;
    const radius = maxR * frac * (1 + zoomBass * (1 - frac * 0.5));
    const sides = 5 + ri, rotation = t * (0.25 + (rings - ri) * 0.07) + bass * 0.9 + beatPulse * 0.5;
    const alpha = (1 - frac) * (0.35 + amp * 0.55 + bass * 0.3);
    const hue = 185 + frac * 90 + (t * 15 % 60);
    ctx.beginPath();
    for (let si = 0; si <= sides; si++) {
      const a = (si / sides) * Math.PI * 2 + rotation;
      si === 0 ? ctx.moveTo(cx + Math.cos(a) * radius, cy + Math.sin(a) * radius)
               : ctx.lineTo(cx + Math.cos(a) * radius, cy + Math.sin(a) * radius);
    }
    ctx.closePath(); ctx.strokeStyle = `hsla(${hue},100%,68%,${Math.min(1, alpha)})`;
    ctx.lineWidth = 1.2 + amp * 2.5 + (ri < 4 ? beatPulse * 3 : 0); ctx.stroke();
    if (ri < rings) {
      const nextFrac = (ri + 1) / rings, nextR = maxR * nextFrac * (1 + zoomBass * (1 - nextFrac * 0.5));
      const sc = Math.min(6, 3 + Math.floor(bass * 4));
      for (let sp = 0; sp < sc; sp++) {
        const a = (sp / sc) * Math.PI * 2 + rotation;
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(a) * radius, cy + Math.sin(a) * radius);
        ctx.lineTo(cx + Math.cos(a) * nextR, cy + Math.sin(a) * nextR);
        ctx.strokeStyle = `hsla(${hue},100%,68%,${alpha * 0.45})`; ctx.lineWidth = 0.7; ctx.stroke();
      }
    }
  }
  const dotR = Math.max(0, 4 + bass * 18 + mid * 10 + beatPulse * 20);
  if (dotR > 0) {
    const dg = ctx.createRadialGradient(cx, cy, 0, cx, cy, dotR * 4.5);
    dg.addColorStop(0, `rgba(0,229,255,${0.95 + bass * 0.05})`);
    dg.addColorStop(0.4, `rgba(155,100,255,${0.3 + bass * 0.2})`); dg.addColorStop(1, "rgba(0,0,0,0)");
    ctx.beginPath(); ctx.arc(cx, cy, dotR, 0, Math.PI * 2); ctx.fillStyle = dg; ctx.fill();
  }
}

// ── Draw: Aurora ──────────────────────────────────────────────────────────────
function drawAurora(ctx, W, H, sm, bufLen, t, bass, beat) {
  const bands = 6, bandSize = Math.floor(bufLen / bands);
  const colors = ["0,229,255","0,200,220","80,150,255","155,126,255","200,100,255","100,220,200"];
  for (let b = 0; b < bands; b++) {
    let sum = 0; for (let i = b * bandSize; i < (b + 1) * bandSize; i++) sum += sm[i] || 0;
    const amp = Math.min(1, (sum / bandSize) * (1 + bass * 2.0));
    const sliceH = H / bands, cy = sliceH * b + sliceH / 2;
    const wH = amp * sliceH * 1.2 * (b < 2 && beat ? 1.6 : 1), freq = 1.8 + b * 0.7, phase = t * (1.0 + b * 0.45 + amp * 2.5);
    ctx.beginPath();
    for (let px = 0; px <= W; px += 2) { const y = cy + Math.sin((px / W) * Math.PI * 2 * freq + phase) * wH; px === 0 ? ctx.moveTo(px, y) : ctx.lineTo(px, y); }
    ctx.lineTo(W, cy + sliceH * 0.55); ctx.lineTo(0, cy + sliceH * 0.55); ctx.closePath();
    ctx.fillStyle = `rgba(${colors[b]},${0.04 + amp * 0.18})`; ctx.fill();
    ctx.beginPath();
    for (let px = 0; px <= W; px += 2) { const y = cy + Math.sin((px / W) * Math.PI * 2 * freq + phase) * wH; px === 0 ? ctx.moveTo(px, y) : ctx.lineTo(px, y); }
    ctx.strokeStyle = `rgba(${colors[b]},${0.5 + amp * 0.5})`; ctx.lineWidth = beat && b < 2 ? 3.5 + amp * 3 : 1.8 + amp * 2.2; ctx.lineJoin = "round"; ctx.stroke();
  }
  if (beat && bass > 0.35) {
    const fa = (bass - 0.35) * 0.18, g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, `rgba(0,229,255,${fa})`); g.addColorStop(1, `rgba(155,126,255,${fa * 0.4})`);
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  }
}

// ── Draw: Cosmic ──────────────────────────────────────────────────────────────
function drawCosmicWaves(ctx, W, H, sm, bufLen, t, particlesRef, bass, beat) {
  const cx = W / 2, cy = H / 2, avg = getAvg(sm, bufLen);
  if (avg > 0.05 && particlesRef.current.length < (beat ? 300 : 180)) {
    const count = beat ? Math.floor(10 + bass * 20) : Math.floor(1 + avg * 5);
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2, spd = beat ? 1.2 + bass * 2.0 : 0.3 + avg * 1.0;
      const sr = Math.random() < 0.6 ? 0 : Math.random() * Math.min(W, H) * 0.3;
      particlesRef.current.push({ x: cx + Math.cos(angle) * sr, y: cy + Math.sin(angle) * sr, vx: Math.cos(angle) * spd, vy: Math.sin(angle) * spd, life: 1, decay: beat ? 0.004 + Math.random() * 0.007 : 0.007 + Math.random() * 0.012, size: beat ? 3.5 + Math.random() * 6 * bass : 1.5 + Math.random() * 3.5, hue: 160 + Math.random() * 120 });
    }
  }
  const alive = [];
  for (const p of particlesRef.current) {
    p.x += p.vx; p.y += p.vy; p.vx *= 0.985; p.vy *= 0.985; p.life -= p.decay;
    if (p.life <= 0) continue;
    const r = Math.max(0, p.size * p.life);
    if (r > 0) { ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, Math.PI * 2); ctx.fillStyle = `hsla(${p.hue},100%,72%,${p.life * 0.9})`; ctx.fill(); }
    alive.push(p);
  }
  particlesRef.current = alive;
  for (let ri = 1; ri <= 3; ri++) {
    const ringR = Math.min(W, H) * (0.1 * ri) * (1 + avg * 0.6 + bass * 0.4);
    ctx.beginPath(); ctx.arc(cx, cy, ringR, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(0,220,255,${(0.18 - ri * 0.04) + avg * 0.22})`; ctx.lineWidth = 1.2; ctx.stroke();
  }
  const gr = Math.min(W, H) * 0.32 + avg * 30 + bass * 22, g = ctx.createRadialGradient(cx, cy, 0, cx, cy, gr);
  g.addColorStop(0, `rgba(0,220,255,${0.16 + avg * 0.25})`); g.addColorStop(0.5, `rgba(155,126,255,${0.06 + avg * 0.08})`); g.addColorStop(1, "rgba(0,0,0,0)");
  ctx.beginPath(); ctx.arc(cx, cy, gr, 0, Math.PI * 2); ctx.fillStyle = g; ctx.fill();
}

// ── Draw: Plasma ──────────────────────────────────────────────────────────────
function drawPlasma(ctx, W, H, sm, bufLen, t, particlesRef, bass, beat) {
  const cx = W / 2, cy = H / 2, avg = getAvg(sm, bufLen);
  const orbitRadii = [Math.min(W, H) * 0.15, Math.min(W, H) * 0.27, Math.min(W, H) * 0.40];
  if (avg > 0.05 && particlesRef.current.length < 240) {
    const count = beat ? Math.floor(8 + bass * 15) : Math.floor(1 + avg * 4);
    for (let i = 0; i < count; i++) {
      const orbit = Math.floor(Math.random() * 3), angle = Math.random() * Math.PI * 2, r = orbitRadii[orbit] * (0.8 + Math.random() * 0.4);
      const spd = beat ? 0.9 + bass * 1.5 : 0.35 + avg * 0.7;
      particlesRef.current.push({ x: cx + Math.cos(angle) * r, y: cy + Math.sin(angle) * r, vx: (Math.random() - 0.5) * spd * 2, vy: (Math.random() - 0.5) * spd * 2, life: 1, decay: 0.006 + Math.random() * 0.01, size: 1.5 + Math.random() * (beat ? 5 * bass : 2.5), hue: 180 + orbit * 50 + Math.random() * 40 });
    }
  }
  const alive = [];
  for (const p of particlesRef.current) {
    p.x += p.vx; p.y += p.vy; p.vx *= 0.96; p.vy *= 0.96; p.life -= p.decay;
    if (p.life <= 0) continue;
    const r = Math.max(0, p.size * p.life);
    if (r > 0) { ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, Math.PI * 2); ctx.fillStyle = `hsla(${p.hue},100%,70%,${p.life * 0.88})`; ctx.fill(); }
    alive.push(p);
  }
  particlesRef.current = alive;
  for (let o = 0; o < 3; o++) {
    const amp = sm[Math.floor((o / 3) * bufLen * 0.5)] || 0, r = orbitRadii[o] * (1 + bass * 0.25 + amp * 0.12);
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.strokeStyle = `hsla(${185 + o * 55},100%,62%,${0.18 + amp * 0.35})`; ctx.lineWidth = 1.2; ctx.stroke();
  }
  const gr = Math.min(W, H) * 0.22 + bass * 24, g = ctx.createRadialGradient(cx, cy, 0, cx, cy, gr);
  g.addColorStop(0, `rgba(155,100,255,${0.22 + bass * 0.35})`); g.addColorStop(0.5, `rgba(0,200,220,${0.09 + avg * 0.12})`); g.addColorStop(1, "rgba(0,0,0,0)");
  ctx.beginPath(); ctx.arc(cx, cy, gr, 0, Math.PI * 2); ctx.fillStyle = g; ctx.fill();
}

// ── Draw: Drift ───────────────────────────────────────────────────────────────
function drawDrift(ctx, W, H, sm, bufLen, t, particlesRef, bass, treble) {
  const avg = getAvg(sm, bufLen), isBeat = bass > 0.32;
  if (avg > 0.04 && particlesRef.current.length < 220) {
    const count = isBeat ? Math.floor(6 + bass * 12) : Math.floor(1 + avg * 4);
    for (let i = 0; i < count; i++) {
      const side = Math.floor(Math.random() * 4); let x, y;
      if (side === 0) { x = Math.random() * W; y = H + 10; } else if (side === 1) { x = -10; y = Math.random() * H; }
      else if (side === 2) { x = W + 10; y = Math.random() * H; } else { x = Math.random() * W; y = -10; }
      const angle = Math.atan2(H / 2 - y, W / 2 - x) + (Math.random() - 0.5) * 1.2, spd = isBeat ? 0.7 + bass * 1.2 : 0.25 + avg * 0.6;
      particlesRef.current.push({ x, y, vx: Math.cos(angle) * spd, vy: Math.sin(angle) * spd, life: 1, decay: 0.005 + Math.random() * 0.009, size: isBeat ? 2 + Math.random() * 5 * bass : 1 + Math.random() * 2.5, hue: 160 + Math.random() * 130, trail: [] });
    }
  }
  const alive = [];
  for (const p of particlesRef.current) {
    p.trail.push({ x: p.x, y: p.y }); if (p.trail.length > 9) p.trail.shift();
    p.x += p.vx; p.y += p.vy; p.vx *= 0.99; p.vy *= 0.99; p.life -= p.decay;
    if (p.life <= 0) continue;
    for (let ti = 0; ti < p.trail.length - 1; ti++) {
      const a = p.trail[ti], b2 = p.trail[ti + 1];
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b2.x, b2.y);
      ctx.strokeStyle = `hsla(${p.hue},100%,70%,${(ti / p.trail.length) * p.life * 0.45})`; ctx.lineWidth = p.size * 0.5; ctx.stroke();
    }
    const r = Math.max(0, p.size * p.life);
    if (r > 0) { ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, Math.PI * 2); ctx.fillStyle = `hsla(${p.hue},100%,75%,${p.life * 0.92})`; ctx.fill(); }
    alive.push(p);
  }
  particlesRef.current = alive;
  const gr = Math.min(W, H) * 0.26 + avg * 28, g = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, gr);
  g.addColorStop(0, `rgba(0,200,255,${0.07 + avg * 0.12})`); g.addColorStop(1, "rgba(0,0,0,0)");
  ctx.beginPath(); ctx.arc(W / 2, H / 2, gr, 0, Math.PI * 2); ctx.fillStyle = g; ctx.fill();
}

// ── Premium Fallbacks (analyser blocked) ──────────────────────────────────────
function fbSpectrum(ctx, W, H, t, active, color) {
  const barCount = 72, gap = Math.max(1, W * 0.003), bw = (W - gap * (barCount - 1)) / barCount;
  const pulse = active ? 0.7 + Math.sin(t * 1.1) * 0.3 : 0.1;
  for (let i = 0; i < barCount; i++) {
    const frac = i / barCount;
    const v = active ? Math.max(0.04, pulse * (Math.sin(t * 2.5 + frac * Math.PI * 4.5) * 0.5 + 0.5) * (0.5 + Math.pow(1 - frac, 0.8) * 0.5)) : 0.04 + Math.sin(i * 0.55) * 0.025;
    const h = Math.max(2, v * (H - 6));
    const grad = ctx.createLinearGradient(0, H, 0, H - h);
    grad.addColorStop(0, `rgba(${color},0.65)`); grad.addColorStop(0.6, `rgba(${color},1.0)`); grad.addColorStop(1, "rgba(255,255,255,0.9)");
    ctx.fillStyle = grad; roundedBar(ctx, i * (bw + gap), H - h, bw, h, 2); ctx.fill();
  }
}

function fbWaveform(ctx, W, H, t, active, color) {
  const cy = H / 2, amp = H * (active ? 0.38 + Math.sin(t * 1.1) * 0.1 : 0.05);
  ctx.beginPath();
  for (let x = 0; x <= W; x += 2) {
    const y = cy + Math.sin((x / W) * Math.PI * 7 + t * 3.2) * amp * 0.65 + Math.sin((x / W) * Math.PI * 3 + t * 1.6) * amp * 0.35;
    x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  }
  const g = ctx.createLinearGradient(0, 0, W, 0);
  g.addColorStop(0, `rgba(${color},0.3)`); g.addColorStop(0.5, `rgba(${color},0.95)`); g.addColorStop(1, `rgba(${color},0.3)`);
  ctx.strokeStyle = g; ctx.lineWidth = 2; ctx.lineJoin = "round"; ctx.stroke();
  ctx.beginPath(); ctx.moveTo(0, cy); ctx.lineTo(W, cy);
  ctx.strokeStyle = `rgba(${color},0.07)`; ctx.lineWidth = 1; ctx.stroke();
}

function fbEnergy(ctx, W, H, t, active) {
  const count = 60, gap = Math.max(1, W * 0.004), bw = (W - gap * (count - 1)) / count;
  const pulse = active ? 0.7 + Math.sin(t * 1.2) * 0.3 : 0.1;
  for (let i = 0; i < count; i++) {
    const frac = i / count;
    const v = active ? Math.max(0.04, pulse * (Math.sin(t * 2.2 + frac * 11) * 0.5 + 0.5) * (Math.sin(t * 0.9 + frac * 7) * 0.3 + 0.7)) : 0.04 + Math.sin(i * 0.5) * 0.02;
    const h = Math.max(3, v * H * 0.92), hue = 185 + v * 70;
    ctx.fillStyle = `hsla(${hue},100%,58%,${0.35 + v * 0.55})`; roundedBar(ctx, i * (bw + gap), H - h, bw, h, 2); ctx.fill();
  }
}

function fbTunnel(ctx, W, H, t, active) {
  const cx = W / 2, cy = H / 2, maxR = Math.min(W, H) * 0.5, rings = 12;
  const pulse = active ? 0.7 + Math.sin(t * 1.8) * 0.3 : 0.35;
  for (let ri = rings; ri >= 1; ri--) {
    const frac = ri / rings, radius = maxR * frac * (active ? 1 + Math.sin(t * 1.5 + frac * 4) * 0.09 * pulse : 1);
    const sides = 5 + ri, rotation = t * (0.22 + (rings - ri) * 0.06);
    const alpha = (1 - frac) * (active ? 0.28 + frac * 0.25 : 0.1);
    ctx.beginPath();
    for (let si = 0; si <= sides; si++) { const a = (si / sides) * Math.PI * 2 + rotation; ctx.lineTo(cx + Math.cos(a) * radius, cy + Math.sin(a) * radius); }
    ctx.closePath(); ctx.strokeStyle = `hsla(${185 + frac * 90},100%,65%,${Math.min(1, alpha)})`; ctx.lineWidth = 1 + pulse * 0.5; ctx.stroke();
  }
  const coreR = Math.max(0, (8 + Math.sin(t * 2.5) * 4) * pulse);
  if (coreR > 0) {
    const dg = ctx.createRadialGradient(cx, cy, 0, cx, cy, coreR * 5);
    dg.addColorStop(0, `rgba(0,229,255,${0.8 * pulse})`); dg.addColorStop(1, "rgba(0,0,0,0)");
    ctx.beginPath(); ctx.arc(cx, cy, coreR, 0, Math.PI * 2); ctx.fillStyle = dg; ctx.fill();
  }
}

function fbNeon(ctx, W, H, t, active) {
  const cx = W / 2, cy = H / 2, baseR = Math.min(W, H) * 0.22, pulse = active ? 0.7 + Math.sin(t * 2.2) * 0.3 : 0.35, spin = t * 0.45;
  [[1, 2.5, "0,220,255"], [1.35, 1.5, "155,126,255"], [1.7, 1, "0,200,220"], [2.1, 0.5, "200,100,255"]].forEach(([scale, w, c], idx) => {
    const breathe = active ? scale + Math.sin(t * (1.8 + idx * 0.4)) * 0.08 : scale;
    ctx.beginPath(); ctx.arc(cx, cy, baseR * breathe, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(${c},${0.6 * pulse})`; ctx.lineWidth = w; ctx.stroke();
  });
  for (let i = 0; i < 80; i++) {
    const a = (i / 80) * Math.PI * 2 - Math.PI / 2 + spin, v = active ? Math.sin(t * 1.8 + i * 0.26) * 0.5 + 0.5 : 0.08;
    const inner = baseR * 0.95, outer = inner + v * baseR * 0.75 + 2;
    ctx.beginPath(); ctx.moveTo(cx + Math.cos(a) * inner, cy + Math.sin(a) * inner);
    ctx.lineTo(cx + Math.cos(a) * outer, cy + Math.sin(a) * outer);
    ctx.strokeStyle = `hsla(${185 + v * 80 + i * 0.8},100%,62%,${active ? 0.4 + v * 0.45 : 0.12})`; ctx.lineWidth = 2; ctx.lineCap = "round"; ctx.stroke();
  }
  const dotR = baseR * (active ? 0.2 + Math.sin(t * 2.8) * 0.09 : 0.1), dg = ctx.createRadialGradient(cx, cy, 0, cx, cy, dotR * 4);
  dg.addColorStop(0, `rgba(0,229,255,${active ? 0.8 : 0.2})`); dg.addColorStop(0.4, `rgba(155,100,255,${active ? 0.22 : 0.05})`); dg.addColorStop(1, "rgba(0,0,0,0)");
  ctx.beginPath(); ctx.arc(cx, cy, dotR, 0, Math.PI * 2); ctx.fillStyle = dg; ctx.fill();
}

function fbAurora(ctx, W, H, t, active) {
  const colors = ["0,229,255","0,200,220","100,160,255","155,126,255","200,100,255"];
  for (let b = 0; b < 5; b++) {
    const amp = active ? Math.max(0.05, 0.32 + Math.sin(t * (1.3 + b * 0.45) + b * 1.2) * 0.28) : 0.05;
    const sliceH = H / 5, cy = sliceH * b + sliceH / 2, wH = amp * sliceH * 1.15, freq = 2 + b * 0.75, phase = t * (1.1 + b * 0.4 + amp * 2);
    ctx.beginPath();
    for (let px = 0; px <= W; px += 2) { const y = cy + Math.sin((px / W) * Math.PI * 2 * freq + phase) * wH; px === 0 ? ctx.moveTo(px, y) : ctx.lineTo(px, y); }
    ctx.lineTo(W, cy + sliceH * 0.55); ctx.lineTo(0, cy + sliceH * 0.55); ctx.closePath();
    ctx.fillStyle = `rgba(${colors[b]},${amp * 0.14})`; ctx.fill();
    ctx.beginPath();
    for (let px = 0; px <= W; px += 2) { const y = cy + Math.sin((px / W) * Math.PI * 2 * freq + phase) * wH; px === 0 ? ctx.moveTo(px, y) : ctx.lineTo(px, y); }
    ctx.strokeStyle = `rgba(${colors[b]},${0.42 + amp * 0.55})`; ctx.lineWidth = 1.8 + amp * 2.4; ctx.lineJoin = "round"; ctx.stroke();
  }
}

function fbCosmic(ctx, W, H, t, active, particlesRef) {
  const cx = W / 2, cy = H / 2;
  if (Math.random() < (active ? 0.55 : 0.06) && particlesRef.current.length < (active ? 160 : 25)) {
    const n = active ? Math.floor(1 + Math.random() * 3) : 1;
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, spd = active ? 0.6 + Math.random() * 1.6 : 0.2 + Math.random() * 0.4;
      const sr = Math.random() < 0.5 ? 0 : Math.random() * Math.min(W, H) * 0.3;
      particlesRef.current.push({ x: cx + Math.cos(a) * sr, y: cy + Math.sin(a) * sr, vx: Math.cos(a) * spd, vy: Math.sin(a) * spd, life: 1, decay: 0.006 + Math.random() * 0.010, size: 1.5 + Math.random() * 4.5, hue: 160 + Math.random() * 110 });
    }
  }
  const alive = [];
  for (const p of particlesRef.current) {
    p.x += p.vx; p.y += p.vy; p.vx *= 0.972; p.vy *= 0.972; p.life -= p.decay;
    if (p.life <= 0) continue;
    const r = Math.max(0, p.size * p.life);
    if (r > 0) { ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, Math.PI * 2); ctx.fillStyle = `hsla(${p.hue},100%,70%,${p.life * 0.8})`; ctx.fill(); }
    alive.push(p);
  }
  particlesRef.current = alive;
  const pr = Math.min(W, H) * 0.18 * (active ? 0.7 + Math.sin(t * 2) * 0.3 : 0.35);
  if (pr > 0) {
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, pr);
    g.addColorStop(0, `rgba(0,220,255,${active ? 0.2 : 0.05})`); g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.beginPath(); ctx.arc(cx, cy, pr, 0, Math.PI * 2); ctx.fillStyle = g; ctx.fill();
  }
}

function fbDrift(ctx, W, H, t, active, particlesRef) {
  const cx = W / 2, cy = H / 2;
  if (active && Math.random() < 0.45 && particlesRef.current.length < 130) {
    const side = Math.floor(Math.random() * 4); let x, y;
    if (side === 0) { x = Math.random() * W; y = H + 10; } else if (side === 1) { x = -10; y = Math.random() * H; }
    else if (side === 2) { x = W + 10; y = Math.random() * H; } else { x = Math.random() * W; y = -10; }
    const angle = Math.atan2(cy - y, cx - x) + (Math.random() - 0.5) * 1.0;
    particlesRef.current.push({ x, y, vx: Math.cos(angle) * (0.4 + Math.random() * 0.9), vy: Math.sin(angle) * (0.4 + Math.random() * 0.9), life: 1, decay: 0.006 + Math.random() * 0.008, size: 1.2 + Math.random() * 2.8, hue: 160 + Math.random() * 130, trail: [] });
  }
  const alive = [];
  for (const p of particlesRef.current) {
    if (p.trail) { p.trail.push({ x: p.x, y: p.y }); if (p.trail.length > 7) p.trail.shift(); }
    p.x += p.vx; p.y += p.vy; p.life -= p.decay;
    if (p.life <= 0) continue;
    if (p.trail) for (let ti = 0; ti < p.trail.length - 1; ti++) {
      ctx.beginPath(); ctx.moveTo(p.trail[ti].x, p.trail[ti].y); ctx.lineTo(p.trail[ti + 1].x, p.trail[ti + 1].y);
      ctx.strokeStyle = `hsla(${p.hue},100%,70%,${(ti / p.trail.length) * p.life * 0.4})`; ctx.lineWidth = p.size * 0.4; ctx.stroke();
    }
    const r = Math.max(0, p.size * p.life);
    if (r > 0) { ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, Math.PI * 2); ctx.fillStyle = `hsla(${p.hue},100%,72%,${p.life * 0.88})`; ctx.fill(); }
    alive.push(p);
  }
  particlesRef.current = alive;
}

function runFallback(ctx, W, H, t, mode, color, active, particlesRef) {
  switch (mode) {
    case "spectrum": fbSpectrum(ctx, W, H, t, active, color); break;
    case "waveform": fbWaveform(ctx, W, H, t, active, color); break;
    case "energy":   fbEnergy(ctx, W, H, t, active); break;
    case "cosmic":   fbCosmic(ctx, W, H, t, active, particlesRef); break;
    case "neon":     fbNeon(ctx, W, H, t, active); break;
    case "aurora":   fbAurora(ctx, W, H, t, active); break;
    case "tunnel":   fbTunnel(ctx, W, H, t, active); break;
    case "plasma":   fbCosmic(ctx, W, H, t, active, particlesRef); break;
    default:         fbDrift(ctx, W, H, t, active, particlesRef); break;
  }
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function RadioVisualizer({ isPlaying, currentSong, themeColor = "0,229,255" }) {
  const canvasRef    = useRef(null);
  const rafRef       = useRef(null);
  const analyserRef  = useRef(null);
  const particlesRef = useRef([]);
  const logTimerRef  = useRef(0);
  const { audioRef } = usePlayer();

  const getSavedMode = () => { try { return localStorage.getItem(PREF_KEY) || "spectrum"; } catch { return "spectrum"; } };
  const [mode, setMode] = useState(getSavedMode);
  useEffect(() => { try { localStorage.setItem(PREF_KEY, mode); } catch {} }, [mode]);

  const cycleMode = () => { const idx = MODES.findIndex(m => m.id === mode); setMode(MODES[(idx + 1) % MODES.length].id); };

  const tryConnectAnalyser = useCallback(async () => {
    const audio = audioRef?.current;
    if (!audio) { analyserRef.current = null; return false; }
    await resumeTapCtx();
    const an = getTapAnalyser(audio);
    if (an) {
      analyserRef.current = an;
      console.log("[Viz] probe | audioElementFound: true | analyserConnected: true | ctxState:", _tapCtx?.state, "| isIOS:", isIOS, "| isSafari:", isSafari, "| dpr:", getDpr());
      return true;
    }
    analyserRef.current = null;
    console.log("[Viz] probe | audioElementFound: true | analyserConnected: false | isIOS:", isIOS);
    return false;
  }, [audioRef]);

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
      const t = Date.now() / 1000, an = analyserRef.current;

      if (an && _tapCtx && _tapCtx.state === "running") {
        const bufLen = an.frequencyBinCount, sm = getSmoothedFreq(an);
        const live = isAnalyserLive(sm, bufLen);
        if (live) {
          const bass = getBass(sm, bufLen), mid = getMid(sm, bufLen), treble = getTreble(sm, bufLen), beat = detectBeat(bass);
          if (Date.now() - logTimerRef.current > 3000) {
            logTimerRef.current = Date.now();
            console.log("[Viz] live | modeName:", currentMode, "| isIOS:", isIOS, "| isSafari:", isSafari, "| analyserConnected: true | frequencyDataChanging: true | bassEnergy:", bass.toFixed(3), "| midEnergy:", mid.toFixed(3), "| trebleEnergy:", treble.toFixed(3), "| beatDetected:", beat, "| canvasDevicePixelRatio:", deviceDpr, "| usingFallbackVisualizer: false | radioStillPlaying:", isPlaying);
          }
          switch (currentMode) {
            case "spectrum": drawSpectrum(ctx, lW, lH, sm, bufLen, bass, beat, color); break;
            case "waveform": drawWaveform(ctx, lW, lH, an, bass, beat, color); break;
            case "energy":   drawEnergy(ctx, lW, lH, sm, bufLen, bass, mid, treble, beat); break;
            case "cosmic":   drawCosmicWaves(ctx, lW, lH, sm, bufLen, t, particlesRef, bass, beat); break;
            case "neon":     drawNeonPulse(ctx, lW, lH, sm, bufLen, bass, mid); break;
            case "aurora":   drawAurora(ctx, lW, lH, sm, bufLen, t, bass, beat); break;
            case "tunnel":   drawTunnel(ctx, lW, lH, sm, bufLen, t, bass, mid); break;
            case "plasma":   drawPlasma(ctx, lW, lH, sm, bufLen, t, particlesRef, bass, beat); break;
            default:         drawDrift(ctx, lW, lH, sm, bufLen, t, particlesRef, bass, treble); break;
          }
        } else {
          if (Date.now() - logTimerRef.current > 3000) { logTimerRef.current = Date.now(); console.log("[Viz] live | analyserConnected: true | frequencyDataChanging: false | usingFallbackVisualizer: true | modeName:", currentMode, "| isIOS:", isIOS); }
          runFallback(ctx, lW, lH, t, currentMode, color, isPlaying, particlesRef);
        }
      } else {
        if (Date.now() - logTimerRef.current > 3000) { logTimerRef.current = Date.now(); console.log("[Viz] fallback | modeName:", currentMode, "| isIOS:", isIOS, "| isSafari:", isSafari, "| audioElementFound:", !!audioRef?.current, "| audioContextState:", _tapCtx?.state || "null", "| analyserConnected: false | usingFallbackVisualizer: true | radioStillPlaying:", isPlaying); }
        runFallback(ctx, lW, lH, t, currentMode, color, isPlaying, particlesRef);
      }
      rafRef.current = requestAnimationFrame(loop);
    };
    loop();
  }, [isPlaying, audioRef]);

  useEffect(() => {
    stopLoop(); particlesRef.current = []; _sm.data = null; _peaks.data = null; _peaks.decay = null; _wfSm.data = null; _beat.hist.fill(0); _beat.idx = 0;
    tryConnectAnalyser().then(connected => {
      if (!connected) { startLoop(mode, themeColor); }
      else { setTimeout(() => startLoop(mode, themeColor), 80); }
    });
    return stopLoop;
  }, [mode, isPlaying, currentSong?.id, themeColor]);

  useEffect(() => {
    const onVisible = async () => {
      if (document.visibilityState !== "visible") return;
      stopLoop(); particlesRef.current = []; _sm.data = null;
      await resumeTapCtx();
      const connected = await tryConnectAnalyser();
      if (!connected) { startLoop(mode, themeColor); } else { setTimeout(() => startLoop(mode, themeColor), 80); }
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [mode, isPlaying, tryConnectAnalyser, startLoop, stopLoop, themeColor]);

  useEffect(() => {
    if (!isPlaying) return;
    const t = setTimeout(async () => {
      if (analyserRef.current && _tapCtx?.state === "running") return;
      await resumeTapCtx();
      const connected = await tryConnectAnalyser();
      if (connected && !rafRef.current) startLoop(mode, themeColor);
    }, 300);
    return () => clearTimeout(t);
  }, [isPlaying]);

  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    const ro = new ResizeObserver(() => { if (canvas) { canvas.width = 0; canvas.height = 0; } });
    ro.observe(canvas); return () => ro.disconnect();
  }, []);

  const currentModeObj = MODES.find(m => m.id === mode) || MODES[0];

  return (
    <div style={{ width: "100%" }}>
      <div style={{ position: "relative", width: "100%", overflow: "hidden", borderRadius: "inherit" }}>
        <div style={{ paddingTop: "min(56.25%, 260px)", position: "relative" }}>
          <canvas ref={canvasRef} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", display: "block" }} />
        </div>
      </div>
      <div style={{ display: "flex", justifyContent: "flex-end", paddingTop: 8, paddingRight: 4 }}>
        <button onClick={cycleMode} style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "4px 10px", borderRadius: 20, fontSize: 9, fontWeight: 800, letterSpacing: "0.07em", textTransform: "uppercase", cursor: "pointer", whiteSpace: "nowrap", transition: "all 0.2s ease", userSelect: "none", WebkitUserSelect: "none", background: `rgba(${themeColor},0.10)`, border: `1px solid rgba(${themeColor},0.45)`, color: `rgb(${themeColor})`, boxShadow: `0 0 8px rgba(${themeColor},0.12)` }}>
          <span style={{ fontSize: 9, lineHeight: 1 }}>{currentModeObj.icon}</span>
          {currentModeObj.label}
        </button>
      </div>
    </div>
  );
}