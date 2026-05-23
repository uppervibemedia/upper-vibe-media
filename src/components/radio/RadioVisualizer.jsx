/**
 * RadioVisualizer — Upper Vibe Media
 *
 * iOS ANALYSER FIX (v7):
 * ─────────────────────────────────────────────────────────────────────────────
 * ROOT CAUSE: On iOS Safari/PWA, calling createMediaElementSource() on the MAIN
 * audio element — even without connecting to destination — internally reroutes
 * the HTMLMediaElement through the Web Audio graph. This BREAKS system audio
 * routing: AirPlay, Bluetooth, and normal speaker output all stop working.
 *
 * FIX: Use a MIRROR audio element — a second hidden <audio> with volume=0 that
 * loads the same src and syncs currentTime to the main element every 2s.
 * The mirror is connected to a Web Audio analyser for frequency data.
 * The main audio element is NEVER touched by Web Audio, so AirPlay/BT/BG
 * audio, lockscreen controls, and Control Center all remain fully intact.
 *
 * NON-iOS: connects directly to the main audio element (no routing side-effects
 * on Chrome/Desktop/Android where Web Audio doesn't break system routing).
 *
 * Detection logs emitted every 3s:
 *   isAirPlayActive, isBluetoothOutput, audioContextState, analyserConnected,
 *   frequencyDataChanging, mediaSessionActive, radioStillPlaying
 */

import React, { useRef, useEffect, useCallback, useState } from "react";
import { usePlayer } from "../../context/PlayerContext";

const PREF_KEY = "uvm_radio_viz_v7";

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

// ── Detection helpers ─────────────────────────────────────────────────────────
function detectAirPlay(audioEl) {
  // AirPlay active: iOS reports remotePlaybackState or the element has a
  // remote playback object with state "connected"
  try {
    if (audioEl && audioEl.remote && audioEl.remote.state === "connected") return true;
  } catch {}
  return false;
}

function detectBluetooth() {
  // No reliable sync API — check userAgent hints or AudioOutput (async-only)
  // We log "unknown" since getBluetooth() is async and not universally available
  return "unknown";
}

function detectMediaSession() {
  return "mediaSession" in navigator
    ? (navigator.mediaSession.playbackState || "none")
    : "unsupported";
}

// ── Mirror AudioContext (iOS-safe: uses a SEPARATE muted audio element) ───────
// On iOS we MUST NOT call createMediaElementSource on the main audio element.
// Instead we create a silent mirror element with the same src, attach it to Web
// Audio, and sync its currentTime periodically. This gives us frequency data
// without touching the main element's system-routing chain.
let _mirrorEl   = null;  // the muted mirror <audio>
let _mirrorCtx  = null;  // AudioContext for the mirror
let _mirrorSrc  = null;  // MediaElementSourceNode of mirror
let _mirrorAn   = null;  // AnalyserNode
let _mirrorSyncUrl = ""; // last src we set on the mirror
let _mirrorSyncTimer = null;

function destroyMirror() {
  clearInterval(_mirrorSyncTimer); _mirrorSyncTimer = null;
  try { if (_mirrorSrc) _mirrorSrc.disconnect(); } catch {}
  try { if (_mirrorAn)  _mirrorAn.disconnect();  } catch {}
  if (_mirrorEl) { _mirrorEl.pause(); _mirrorEl.src = ""; try { _mirrorEl.load(); } catch {} try { _mirrorEl.parentNode?.removeChild(_mirrorEl); } catch {} }
  _mirrorEl = null; _mirrorSrc = null; _mirrorAn = null; _mirrorSyncUrl = "";
}

function getOrCreateMirrorAnalyser(mainAudioEl) {
  if (!mainAudioEl || !mainAudioEl.src) return null;
  const url = mainAudioEl.src;

  // Reuse if mirror is already set up for this url and ctx is alive
  if (_mirrorAn && _mirrorEl && _mirrorSyncUrl === url && _mirrorCtx && _mirrorCtx.state !== "closed") {
    return _mirrorAn;
  }

  destroyMirror();

  try {
    // Create or reuse AudioContext
    if (!_mirrorCtx || _mirrorCtx.state === "closed") {
      _mirrorCtx = new (window.AudioContext || window.webkitAudioContext)();
    }

    // Create mirror audio element — muted, not attached to system output
    _mirrorEl = document.createElement("audio");
    _mirrorEl.volume = 0;         // completely silent — only used for Web Audio tap
    _mirrorEl.muted  = true;      // belt-and-suspenders mute
    _mirrorEl.crossOrigin = "anonymous";
    _mirrorEl.preload = "auto";
    _mirrorEl.setAttribute("playsinline", "");
    // Do NOT set x-webkit-airplay or disableRemotePlayback — this element
    // must NOT register with the system as a media session source.
    _mirrorEl.style.cssText = "position:absolute;width:0;height:0;opacity:0;pointer-events:none;";
    _mirrorEl.setAttribute("aria-hidden", "true");
    document.body.appendChild(_mirrorEl);

    // Connect mirror → analyser (NO destination → no audio output from mirror)
    _mirrorSrc = _mirrorCtx.createMediaElementSource(_mirrorEl);
    _mirrorAn  = _mirrorCtx.createAnalyser();
    _mirrorAn.fftSize = 2048;
    _mirrorAn.smoothingTimeConstant = 0.55; // moderate built-in smoothing, manual layer handles the rest
    _mirrorSrc.connect(_mirrorAn);
    // Intentionally NOT connecting to _mirrorCtx.destination

    // Load the same src
    _mirrorEl.src = url;
    _mirrorSyncUrl = url;
    _mirrorEl.load();

    // Sync mirror currentTime to main element every 2s (prevents drift)
    clearInterval(_mirrorSyncTimer);
    _mirrorSyncTimer = setInterval(() => {
      if (!_mirrorEl || !mainAudioEl) return;
      const diff = Math.abs(_mirrorEl.currentTime - mainAudioEl.currentTime);
      if (diff > 2.5) {
        try { _mirrorEl.currentTime = mainAudioEl.currentTime; } catch {}
      }
      // Mirror playback state tracks main
      const mainPlaying = !mainAudioEl.paused && !mainAudioEl.ended;
      if (mainPlaying && _mirrorEl.paused) {
        _mirrorEl.play().catch(() => {});
        if (_mirrorCtx.state === "suspended") _mirrorCtx.resume().catch(() => {});
      } else if (!mainPlaying && !_mirrorEl.paused) {
        _mirrorEl.pause();
      }
    }, 2000);

    console.log("[Viz] iOS mirror analyser created | url:", url.substring(0, 60),
      "| ctxState:", _mirrorCtx.state, "| isIOS:", isIOS);
    return _mirrorAn;
  } catch (e) {
    console.warn("[Viz] iOS mirror analyser failed:", e.message);
    destroyMirror();
    return null;
  }
}

async function startMirrorPlayback(mainAudioEl) {
  if (!_mirrorEl || !mainAudioEl) return;
  if (_mirrorCtx && _mirrorCtx.state === "suspended") {
    try { await _mirrorCtx.resume(); } catch {}
  }
  const mainPlaying = !mainAudioEl.paused && !mainAudioEl.ended;
  if (mainPlaying && _mirrorEl.paused && _mirrorEl.readyState >= 2) {
    try {
      _mirrorEl.currentTime = mainAudioEl.currentTime;
      await _mirrorEl.play();
    } catch (e) {
      console.warn("[Viz] mirror play failed:", e.message);
    }
  }
}

// ── Non-iOS: direct tap on the main element ───────────────────────────────────
// On non-iOS (Chrome/Desktop/Android), Web Audio does NOT break system routing,
// so we connect directly. We also reconnect to destination so audio still plays.
let _tapCtx    = null;
let _tapSource = null;
let _tapAn     = null;
let _tapEl     = null;

function getTapAnalyserDirect(audioEl) {
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
    _tapAn.smoothingTimeConstant = 0.55;
    // On non-iOS: connect source → analyser → destination (preserves audio output)
    _tapSource.connect(_tapAn);
    _tapAn.connect(_tapCtx.destination);
    _tapEl = audioEl;
    console.log("[Viz] direct tapAnalyser (non-iOS) | ctxState:", _tapCtx.state);
    return _tapAn;
  } catch (e) {
    console.warn("[Viz] direct tapAnalyser failed:", e.message);
    _tapAn = null; _tapSource = null;
    return null;
  }
}

async function resumeDirectCtx() {
  if (_tapCtx && _tapCtx.state === "suspended") {
    try { await _tapCtx.resume(); } catch {}
  }
}

// ── Smoothing state ───────────────────────────────────────────────────────────
const _sm    = { data: null };
const _peaks = { data: null, decay: null };
const _wfSm  = { data: null };
const IOS_GAIN = isIOS ? 2.2 : 1.0;

function getSmoothedFreq(an) {
  const bufLen = an.frequencyBinCount;
  const raw = new Uint8Array(bufLen);
  an.getByteFrequencyData(raw);
  if (!_sm.data || _sm.data.length !== bufLen) _sm.data = new Float32Array(bufLen);
  const sm = _sm.data;
  for (let i = 0; i < bufLen; i++) {
    const r = Math.min(1, (raw[i] / 255) * IOS_GAIN);
    // Fast attack (0.8 weight on new data), slow decay — preserves beat transients
    sm[i] = r > sm[i] ? r * 0.8 + sm[i] * 0.2 : sm[i] * 0.72 + r * 0.28;
  }
  return sm;
}

function getBass(sm, n)   { const e = Math.max(1, Math.floor(n * 0.05)); let v = 0; for (let i = 0; i < e; i++) v += sm[i]; return Math.min(1, v / e); }
function getMid(sm, n)    { const lo = Math.floor(n * 0.05), hi = Math.floor(n * 0.30); let v = 0; for (let i = lo; i < hi; i++) v += sm[i]; return Math.min(1, v / (hi - lo)); }
function getTreble(sm, n) { const lo = Math.floor(n * 0.30), hi = Math.floor(n * 0.70); let v = 0; for (let i = lo; i < hi; i++) v += sm[i]; return Math.min(1, v / (hi - lo)); }
function getAvg(sm, n)    { let v = 0; for (let i = 0; i < n; i++) v += sm[i]; return Math.min(1, v / n); }

const _beat = { last: 0, hist: new Float32Array(12), idx: 0 };
function detectBeat(bass) {
  const now = Date.now();
  _beat.hist[_beat.idx % 12] = bass; _beat.idx++;
  const avg = _beat.hist.reduce((a, b) => a + b, 0) / 12;
  // Threshold: 1.35x local average, minimum 0.15 — catches both loud and soft tracks
  const thresh = Math.min(0.5, avg * 1.35 + 0.10);
  if (bass > thresh && bass > 0.15 && now - _beat.last > 220) { _beat.last = now; return true; }
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

// ── Draw: Spectrum → STARGATE RINGS ──────────────────────────────────────────
// Concentric rotating rings whose radius pulses with frequency bands
function drawSpectrum(ctx, W, H, sm, bufLen, bass, beat, color) {
  const cx = W / 2, cy = H / 2, t = Date.now() / 1000;
  const usable = Math.floor(bufLen * 0.75);
  const ringCount = 9;
  const maxR = Math.min(W, H) * 0.48;

  // Beat flash
  if (beat) {
    const bg = ctx.createRadialGradient(cx, cy, 0, cx, cy, maxR * 1.5);
    bg.addColorStop(0, `rgba(${color},${bass * 0.18})`);
    bg.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
  }

  for (let ri = 0; ri < ringCount; ri++) {
    const frac = (ri + 1) / ringCount;
    const binIdx = Math.floor(frac * usable * 0.55);
    const energy = sm[binIdx] || 0;
    const beatPush = beat && ri < 3 ? bass * 0.22 : 0;
    const radius = maxR * frac * (1 + energy * 0.35 + beatPush);
    const sides = 3 + ri * 2; // 3, 5, 7, 9 ... sided polygons
    const spin = t * (0.18 + ri * 0.09) * (ri % 2 === 0 ? 1 : -1);
    const alpha = 0.12 + energy * 0.65 + bass * 0.2;
    const hue = 185 + frac * 100 + (t * 20 % 60);
    const lw = 1.0 + energy * 3.5 + (ri < 2 ? bass * 2.5 : 0);

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(spin);
    ctx.beginPath();
    for (let s = 0; s <= sides; s++) {
      const a = (s / sides) * Math.PI * 2;
      const wobble = 1 + Math.sin(t * 2.5 + s * 1.3 + ri) * 0.06 * energy;
      const rx = Math.cos(a) * radius * wobble;
      const ry = Math.sin(a) * radius * wobble;
      s === 0 ? ctx.moveTo(rx, ry) : ctx.lineTo(rx, ry);
    }
    ctx.closePath();
    ctx.strokeStyle = `hsla(${hue},100%,68%,${Math.min(1, alpha)})`;
    ctx.lineWidth = lw;
    ctx.shadowBlur = beat && ri < 3 ? 18 : 6;
    ctx.shadowColor = `hsla(${hue},100%,68%,0.7)`;
    ctx.stroke();
    ctx.restore();

    // Connecting spokes between rings
    if (ri < ringCount - 1) {
      const nextFrac = (ri + 2) / ringCount;
      const nextR = maxR * nextFrac * (1 + (sm[Math.floor(nextFrac * usable * 0.55)] || 0) * 0.35);
      const spokeCount = Math.min(4, 2 + Math.floor(bass * 3));
      for (let sp = 0; sp < spokeCount; sp++) {
        const a = (sp / spokeCount) * Math.PI * 2 + spin;
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(a) * radius, cy + Math.sin(a) * radius);
        ctx.lineTo(cx + Math.cos(a) * nextR,  cy + Math.sin(a) * nextR);
        ctx.strokeStyle = `hsla(${hue},100%,68%,${alpha * 0.35})`;
        ctx.lineWidth = 0.7; ctx.shadowBlur = 0; ctx.stroke();
      }
    }
  }

  // Central orb
  const orbR = Math.max(0, 5 + bass * 28 + (beat ? 14 : 0));
  if (orbR > 0) {
    const og = ctx.createRadialGradient(cx, cy, 0, cx, cy, orbR * 3.5);
    og.addColorStop(0, `rgba(255,255,255,${0.9 + bass * 0.1})`);
    og.addColorStop(0.3, `rgba(${color},${0.6 + bass * 0.4})`);
    og.addColorStop(1, "rgba(0,0,0,0)");
    ctx.beginPath(); ctx.arc(cx, cy, orbR, 0, Math.PI * 2);
    ctx.fillStyle = og; ctx.fill();
  }
}

// ── Draw: Waveform → LISSAJOUS SPIRAL ────────────────────────────────────────
// Polar waveform: frequency data mapped to angles, drawing a glowing petal/spiral shape
function drawWaveform(ctx, W, H, an, bass, beat, color) {
  const cx = W / 2, cy = H / 2, t = Date.now() / 1000;
  const bufLen = an.frequencyBinCount;
  const sm2 = _sm.data || new Float32Array(bufLen);
  const usable = Math.floor(bufLen * 0.70);
  const baseR = Math.min(W, H) * 0.12;
  const maxR  = Math.min(W, H) * 0.44;
  const points = 360;
  const spin = t * 0.28;

  // Outer glow halo
  const haloR = maxR * (0.9 + bass * 0.3);
  const hg = ctx.createRadialGradient(cx, cy, maxR * 0.55, cx, cy, haloR * 1.4);
  hg.addColorStop(0, `rgba(${color},${0.06 + bass * 0.08})`);
  hg.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = hg; ctx.fillRect(0, 0, W, H);

  // Draw 2 layers: filled shape + bright outline
  for (let layer = 0; layer < 2; layer++) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(spin * (layer === 0 ? 1 : -0.6));
    ctx.beginPath();

    for (let i = 0; i <= points; i++) {
      const frac = i / points;
      const binIdx = Math.floor(frac * usable);
      const energy = sm2[binIdx] || 0;
      const angle = frac * Math.PI * 2;
      // Radius modulated by frequency energy + harmonic wobble
      const harmonic = Math.sin(angle * 3 + t * 1.8) * 0.08 + Math.sin(angle * 7 + t * 0.9) * 0.04;
      const r = baseR + (maxR - baseR) * energy + (maxR - baseR) * 0.12 * harmonic + (beat ? bass * 18 : 0);
      const x = Math.cos(angle) * r, y = Math.sin(angle) * r;
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.closePath();

    if (layer === 0) {
      // Filled interior — dim cosmic glow
      const fg = ctx.createRadialGradient(0, 0, baseR, 0, 0, maxR);
      fg.addColorStop(0, `rgba(${color},${0.08 + bass * 0.12})`);
      fg.addColorStop(1, `rgba(${color},0.02)`);
      ctx.fillStyle = fg; ctx.fill();
    } else {
      // Glowing outline
      ctx.shadowBlur = beat ? 28 : 14;
      ctx.shadowColor = `rgba(${color},0.9)`;
      const hue = 185 + bass * 60 + (t * 18 % 80);
      ctx.strokeStyle = `hsla(${hue},100%,72%,${0.7 + bass * 0.3})`;
      ctx.lineWidth = beat ? 2.2 : 1.4;
      ctx.lineJoin = "round"; ctx.stroke();
    }
    ctx.restore();
  }

  // Inner spinning star
  const starR = baseR * (0.6 + bass * 0.9);
  const spokes = 6;
  ctx.save(); ctx.translate(cx, cy); ctx.rotate(t * 0.9 + bass * 2);
  ctx.beginPath();
  for (let s = 0; s < spokes * 2; s++) {
    const a = (s / (spokes * 2)) * Math.PI * 2;
    const r = s % 2 === 0 ? starR : starR * 0.4;
    s === 0 ? ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r) : ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  ctx.closePath();
  ctx.strokeStyle = `rgba(255,255,255,${0.5 + bass * 0.5})`;
  ctx.lineWidth = 1.2; ctx.shadowBlur = 12; ctx.shadowColor = `rgba(${color},1)`; ctx.stroke();
  ctx.restore();

  // Center dot
  const dotR = Math.max(0, 3 + bass * 16 + (beat ? 10 : 0));
  if (dotR > 0) {
    const dg = ctx.createRadialGradient(cx, cy, 0, cx, cy, dotR * 3);
    dg.addColorStop(0, "rgba(255,255,255,1)");
    dg.addColorStop(0.4, `rgba(${color},0.7)`);
    dg.addColorStop(1, "rgba(0,0,0,0)");
    ctx.beginPath(); ctx.arc(cx, cy, dotR, 0, Math.PI * 2);
    ctx.fillStyle = dg; ctx.fill();
  }
}

// ── Draw: Energy → RADIAL MANDALA ─────────────────────────────────────────────
// Frequency bins mapped as radial spokes in a mandala — rotates and pulses with the beat
function drawEnergy(ctx, W, H, sm, bufLen, bass, mid, treble, beat) {
  const cx = W / 2, cy = H / 2, t = Date.now() / 1000;
  const usable = Math.floor(bufLen * 0.70);
  const spokeCount = 64;
  const innerR = Math.min(W, H) * 0.08;
  const maxR   = Math.min(W, H) * 0.46;
  const spin   = t * 0.22;

  // Ambient background pulse on beat
  if (beat) {
    const bg = ctx.createRadialGradient(cx, cy, 0, cx, cy, maxR * 1.6);
    bg.addColorStop(0, `rgba(155,100,255,${bass * 0.14})`);
    bg.addColorStop(0.5, `rgba(0,200,220,${bass * 0.06})`);
    bg.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
  }

  // Draw two counter-rotating layers for mandala depth
  for (let layer = 0; layer < 2; layer++) {
    const layerSpin = spin * (layer === 0 ? 1 : -0.7) + layer * (Math.PI / spokeCount);
    const layerBoost = layer === 0 ? 1.0 : 0.65;

    for (let i = 0; i < spokeCount; i++) {
      const frac = i / spokeCount;
      const binIdx = Math.floor(frac * usable);
      const energy = sm[binIdx] || 0;
      const boost = frac < 0.08 ? 1.8 + bass * 1.2 : frac < 0.35 ? 1.3 + mid * 0.7 : 1.0 + treble * 0.4;
      const v = Math.min(1, energy * boost * layerBoost);

      const angle = frac * Math.PI * 2 + layerSpin;
      const r1 = innerR + (beat && i % 8 === 0 ? bass * 10 : 0);
      const r2 = innerR + (maxR - innerR) * v;

      // Hue cycles around the circle + shifts over time
      const hue = 185 + frac * 220 + layer * 40 + (t * 25 % 90);
      const alpha = 0.3 + v * 0.7;

      ctx.save();
      ctx.shadowBlur = v > 0.6 ? 10 : 3;
      ctx.shadowColor = `hsla(${hue},100%,65%,0.8)`;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(angle) * r1, cy + Math.sin(angle) * r1);
      ctx.lineTo(cx + Math.cos(angle) * r2, cy + Math.sin(angle) * r2);
      ctx.strokeStyle = `hsla(${hue},100%,68%,${alpha})`;
      ctx.lineWidth = layer === 0 ? 2.2 : 1.2;
      ctx.lineCap = "round";
      ctx.stroke();

      // Tip dot on energetic spokes
      if (v > 0.45) {
        const dotR = Math.max(0, 1.5 + v * 3.5);
        ctx.beginPath();
        ctx.arc(cx + Math.cos(angle) * r2, cy + Math.sin(angle) * r2, dotR, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${hue},100%,88%,${0.5 + v * 0.5})`;
        ctx.fill();
      }
      ctx.restore();
    }
  }

  // Inner ring
  ctx.beginPath(); ctx.arc(cx, cy, innerR, 0, Math.PI * 2);
  ctx.strokeStyle = `rgba(255,255,255,${0.1 + bass * 0.25})`; ctx.lineWidth = 1; ctx.stroke();

  // Central orb
  const orbR = Math.max(0, 4 + bass * 22 + mid * 8 + (beat ? 12 : 0));
  if (orbR > 0) {
    const og = ctx.createRadialGradient(cx, cy, 0, cx, cy, orbR * 4);
    og.addColorStop(0, "rgba(255,255,255,1)");
    og.addColorStop(0.25, `rgba(0,229,255,${0.8 + bass * 0.2})`);
    og.addColorStop(0.6, `rgba(155,100,255,${0.3 + bass * 0.2})`);
    og.addColorStop(1, "rgba(0,0,0,0)");
    ctx.beginPath(); ctx.arc(cx, cy, orbR, 0, Math.PI * 2);
    ctx.fillStyle = og; ctx.fill();
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
  const cx = W / 2, cy = H / 2, ringCount = 9, maxR = Math.min(W, H) * 0.48;
  const pulse = active ? 0.6 + Math.sin(t * 1.2) * 0.4 : 0.15;
  for (let ri = 0; ri < ringCount; ri++) {
    const frac = (ri + 1) / ringCount;
    const energy = active ? Math.max(0.04, pulse * (Math.sin(t * 1.8 + ri * 0.9) * 0.5 + 0.5)) : 0.04;
    const radius = maxR * frac * (1 + energy * 0.2);
    const sides = 3 + ri * 2;
    const spin = t * (0.18 + ri * 0.09) * (ri % 2 === 0 ? 1 : -1);
    const hue = 185 + frac * 100 + (t * 20 % 60);
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(spin);
    ctx.beginPath();
    for (let s = 0; s <= sides; s++) {
      const a = (s / sides) * Math.PI * 2;
      s === 0 ? ctx.moveTo(Math.cos(a) * radius, Math.sin(a) * radius) : ctx.lineTo(Math.cos(a) * radius, Math.sin(a) * radius);
    }
    ctx.closePath();
    ctx.strokeStyle = `hsla(${hue},100%,68%,${0.1 + energy * 0.55})`; ctx.lineWidth = 1 + energy * 2.5; ctx.stroke();
    ctx.restore();
  }
  const dotR = 4 + pulse * 12;
  const dg = ctx.createRadialGradient(cx, cy, 0, cx, cy, dotR * 3);
  dg.addColorStop(0, "rgba(255,255,255,0.9)"); dg.addColorStop(0.4, `rgba(${color},0.6)`); dg.addColorStop(1, "rgba(0,0,0,0)");
  ctx.beginPath(); ctx.arc(cx, cy, dotR, 0, Math.PI * 2); ctx.fillStyle = dg; ctx.fill();
}

function fbWaveform(ctx, W, H, t, active, color) {
  const cx = W / 2, cy = H / 2, baseR = Math.min(W, H) * 0.12, maxR = Math.min(W, H) * 0.44;
  const pulse = active ? 0.55 + Math.sin(t * 1.3) * 0.45 : 0.1;
  const points = 200, spin = t * 0.28;
  for (let layer = 0; layer < 2; layer++) {
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(spin * (layer === 0 ? 1 : -0.6));
    ctx.beginPath();
    for (let i = 0; i <= points; i++) {
      const frac = i / points, angle = frac * Math.PI * 2;
      const energy = active ? Math.max(0.06, pulse * (Math.sin(t * 1.8 + frac * Math.PI * 8) * 0.5 + 0.5)) : 0.06;
      const harmonic = Math.sin(angle * 3 + t * 1.8) * 0.08;
      const r = baseR + (maxR - baseR) * energy + (maxR - baseR) * 0.12 * harmonic;
      i === 0 ? ctx.moveTo(Math.cos(angle) * r, Math.sin(angle) * r) : ctx.lineTo(Math.cos(angle) * r, Math.sin(angle) * r);
    }
    ctx.closePath();
    if (layer === 0) { ctx.fillStyle = `rgba(${color},${0.06 * pulse})`; ctx.fill(); }
    else { const hue = 185 + pulse * 60 + (t * 18 % 80); ctx.strokeStyle = `hsla(${hue},100%,72%,${0.5 + pulse * 0.5})`; ctx.lineWidth = 1.4; ctx.stroke(); }
    ctx.restore();
  }
  const dotR = 3 + pulse * 12;
  const dg = ctx.createRadialGradient(cx, cy, 0, cx, cy, dotR * 3);
  dg.addColorStop(0, "rgba(255,255,255,1)"); dg.addColorStop(0.4, `rgba(${color},0.7)`); dg.addColorStop(1, "rgba(0,0,0,0)");
  ctx.beginPath(); ctx.arc(cx, cy, dotR, 0, Math.PI * 2); ctx.fillStyle = dg; ctx.fill();
}

function fbEnergy(ctx, W, H, t, active) {
  const cx = W / 2, cy = H / 2, spokeCount = 64, innerR = Math.min(W, H) * 0.08, maxR = Math.min(W, H) * 0.46;
  const pulse = active ? 0.6 + Math.sin(t * 1.2) * 0.4 : 0.12;
  const spin = t * 0.22;
  for (let layer = 0; layer < 2; layer++) {
    const layerSpin = spin * (layer === 0 ? 1 : -0.7) + layer * (Math.PI / spokeCount);
    for (let i = 0; i < spokeCount; i++) {
      const frac = i / spokeCount;
      const v = active ? Math.max(0.04, pulse * (Math.sin(t * 1.9 + frac * Math.PI * 6.5 + layer) * 0.5 + 0.5)) : 0.04;
      const angle = frac * Math.PI * 2 + layerSpin;
      const r2 = innerR + (maxR - innerR) * v * (layer === 0 ? 1 : 0.65);
      const hue = 185 + frac * 220 + layer * 40 + (t * 25 % 90);
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(angle) * innerR, cy + Math.sin(angle) * innerR);
      ctx.lineTo(cx + Math.cos(angle) * r2, cy + Math.sin(angle) * r2);
      ctx.strokeStyle = `hsla(${hue},100%,68%,${0.2 + v * 0.7})`; ctx.lineWidth = layer === 0 ? 2 : 1; ctx.lineCap = "round"; ctx.stroke();
    }
  }
  ctx.beginPath(); ctx.arc(cx, cy, innerR, 0, Math.PI * 2);
  ctx.strokeStyle = `rgba(255,255,255,${0.08 + pulse * 0.15})`; ctx.lineWidth = 1; ctx.stroke();
  const orbR = 4 + pulse * 18;
  const og = ctx.createRadialGradient(cx, cy, 0, cx, cy, orbR * 4);
  og.addColorStop(0, "rgba(255,255,255,1)"); og.addColorStop(0.3, `rgba(0,229,255,${0.7 + pulse * 0.3})`); og.addColorStop(1, "rgba(0,0,0,0)");
  ctx.beginPath(); ctx.arc(cx, cy, orbR, 0, Math.PI * 2); ctx.fillStyle = og; ctx.fill();
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

    let an = null;

    if (isIOS) {
      // iOS: use mirror element to avoid breaking AirPlay/BT/system routing
      an = getOrCreateMirrorAnalyser(audio);
      if (an) {
        analyserRef.current = an;
        await startMirrorPlayback(audio);
        console.log("[Viz] probe | isIOS: true | isSafari:", isSafari,
          "| analyserConnected: true | analyserStrategy: mirror_element",
          "| audioContextState:", _mirrorCtx?.state,
          "| isAirPlayActive:", detectAirPlay(audio),
          "| isBluetoothOutput:", detectBluetooth(),
          "| mediaSessionActive:", detectMediaSession(),
          "| radioStillPlaying:", !audio.paused,
          "| dpr:", getDpr());
        return true;
      }
    } else {
      // Non-iOS: direct tap on main element — safe, no routing side-effects
      await resumeDirectCtx();
      an = getTapAnalyserDirect(audio);
      if (an) {
        analyserRef.current = an;
        console.log("[Viz] probe | isIOS: false | analyserConnected: true | analyserStrategy: direct",
          "| audioContextState:", _tapCtx?.state,
          "| mediaSessionActive:", detectMediaSession(),
          "| radioStillPlaying:", !audio.paused);
        return true;
      }
    }

    analyserRef.current = null;
    console.log("[Viz] probe | analyserConnected: false | isIOS:", isIOS,
      "| isAirPlayActive:", detectAirPlay(audio),
      "| audioContextState:", (isIOS ? _mirrorCtx?.state : _tapCtx?.state) || "null",
      "| mediaSessionActive:", detectMediaSession(),
      "| radioStillPlaying:", !audio.paused);
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

      // Determine active AudioContext based on strategy
      const activeCtx = isIOS ? _mirrorCtx : _tapCtx;
      const ctxRunning = activeCtx && activeCtx.state === "running";

      if (an && ctxRunning) {
        const bufLen = an.frequencyBinCount, sm = getSmoothedFreq(an);
        const live = isAnalyserLive(sm, bufLen);
        const mainAudio = audioRef?.current;
        if (live) {
          const bass = getBass(sm, bufLen), mid = getMid(sm, bufLen), treble = getTreble(sm, bufLen), beat = detectBeat(bass);
          if (Date.now() - logTimerRef.current > 3000) {
            logTimerRef.current = Date.now();
            console.log("[Viz] live | modeName:", currentMode,
              "| isIOS:", isIOS, "| isSafari:", isSafari,
              "| analyserConnected: true | frequencyDataChanging: true",
              "| bassEnergy:", bass.toFixed(3), "| midEnergy:", mid.toFixed(3), "| trebleEnergy:", treble.toFixed(3),
              "| beatDetected:", beat,
              "| audioContextState:", activeCtx.state,
              "| isAirPlayActive:", detectAirPlay(mainAudio),
              "| isBluetoothOutput:", detectBluetooth(),
              "| mediaSessionActive:", detectMediaSession(),
              "| radioStillPlaying:", isPlaying,
              "| usingFallbackVisualizer: false",
              "| canvasDevicePixelRatio:", deviceDpr);
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
          // Analyser connected but data is silent — mirror may need to start playing
          if (isIOS && _mirrorEl && _mirrorEl.paused && mainAudio && !mainAudio.paused) {
            _mirrorEl.play().catch(() => {});
            if (_mirrorCtx?.state === "suspended") _mirrorCtx.resume().catch(() => {});
          }
          if (Date.now() - logTimerRef.current > 3000) {
            logTimerRef.current = Date.now();
            console.log("[Viz] live | analyserConnected: true | frequencyDataChanging: false",
              "| usingFallbackVisualizer: true | modeName:", currentMode,
              "| isIOS:", isIOS, "| audioContextState:", activeCtx.state,
              "| isAirPlayActive:", detectAirPlay(mainAudio),
              "| mediaSessionActive:", detectMediaSession(),
              "| radioStillPlaying:", isPlaying);
          }
          runFallback(ctx, lW, lH, t, currentMode, color, isPlaying, particlesRef);
        }
      } else {
        if (Date.now() - logTimerRef.current > 3000) {
          logTimerRef.current = Date.now();
          const mainAudio = audioRef?.current;
          console.log("[Viz] fallback | modeName:", currentMode,
            "| isIOS:", isIOS, "| isSafari:", isSafari,
            "| audioElementFound:", !!mainAudio,
            "| audioContextState:", activeCtx?.state || "null",
            "| analyserConnected: false | usingFallbackVisualizer: true",
            "| isAirPlayActive:", detectAirPlay(mainAudio),
            "| isBluetoothOutput:", detectBluetooth(),
            "| mediaSessionActive:", detectMediaSession(),
            "| radioStillPlaying:", isPlaying);
        }
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
      // Resume appropriate context
      if (isIOS) {
        if (_mirrorCtx?.state === "suspended") { try { await _mirrorCtx.resume(); } catch {} }
        if (_mirrorEl && audioRef?.current && !audioRef.current.paused && _mirrorEl.paused) {
          try { await _mirrorEl.play(); } catch {}
        }
      } else {
        await resumeDirectCtx();
      }
      const connected = await tryConnectAnalyser();
      if (!connected) { startLoop(mode, themeColor); } else { setTimeout(() => startLoop(mode, themeColor), 80); }
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [mode, isPlaying, tryConnectAnalyser, startLoop, stopLoop, themeColor]);

  useEffect(() => {
    if (!isPlaying) return;
    const timer = setTimeout(async () => {
      const activeCtx = isIOS ? _mirrorCtx : _tapCtx;
      if (analyserRef.current && activeCtx?.state === "running") {
        // On iOS: ensure mirror is actually playing
        if (isIOS && _mirrorEl && _mirrorEl.paused) {
          await startMirrorPlayback(audioRef?.current);
        }
        return;
      }
      const connected = await tryConnectAnalyser();
      if (connected && !rafRef.current) startLoop(mode, themeColor);
    }, 400);
    return () => clearTimeout(timer);
  }, [isPlaying]);

  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    const ro = new ResizeObserver(() => { if (canvas) { canvas.width = 0; canvas.height = 0; } });
    ro.observe(canvas); return () => ro.disconnect();
  }, []);

  // Cleanup mirror element on unmount
  useEffect(() => {
    return () => {
      if (isIOS) destroyMirror();
    };
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