/**
 * RadioVisualizer — Upper Vibe Media
 *
 * ARCHITECTURE:
 * - Attaches to the SINGLE global audio element via getGlobalAnalyser()
 * - Never creates a second audio element, never touches playback
 * - On iOS Safari/PWA: AudioContext is blocked by the platform — we run
 *   a fallback CSS/rAF animation instead (driven only by isPlaying state)
 * - On desktop Chrome/Firefox/Edge: real AnalyserNode data drives all visuals
 * - Reconnects when navigating away and back (via useEffect + visibility)
 * - User preference saved to localStorage
 *
 * PROOF LOGS (search [Viz] in console):
 *   selectedVisualizer, isIOS, isSafari, radioAudioElementFound,
 *   radioAudioSrc, audioContextState, analyserConnected,
 *   fallbackAnimationActive, radioIsPlaying, currentSongTitle
 */

import React, { useRef, useEffect, useCallback, useState } from "react";
import { usePlayer, getGlobalAnalyser } from "../../context/PlayerContext";
import { ChevronDown } from "lucide-react";

// ── Constants ─────────────────────────────────────────────────────────────────
const PREF_KEY = "uvm_radio_viz_v2";

const MODES = [
  { id: "bars",     label: "Frequency Bars" },
  { id: "waveform", label: "Waveform" },
  { id: "cosmic",   label: "Cosmic Particles" },
  { id: "pulse",    label: "Pulse Ring" },
  { id: "spectrum", label: "Spectrum Flow" },
];

// Platform detection (same logic as PlayerContext)
const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent) ||
  (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

const isSafari = /Safari\//.test(navigator.userAgent) &&
  !/Chrome\//.test(navigator.userAgent) &&
  !/Chromium\//.test(navigator.userAgent);

// ── Draw functions (real analyser data) ──────────────────────────────────────

function drawBars(ctx, W, H, freqData, bufLen) {
  const barCount = 60;
  // Use full frequency range but weight high indices to boost right-side energy
  const gap = 2;
  const barW = (W - gap * (barCount - 1)) / barCount;
  for (let i = 0; i < barCount; i++) {
    // Map bars across the full spectrum but boost amplitude on right half
    const step = Math.floor(bufLen / barCount);
    const rawV = freqData[i * step] / 255;
    // Right-side boost: bars at index > 30 get extra height multiplier
    const boost = i > 30 ? 1 + (i - 30) / 30 * 0.8 : 1;
    const v = Math.min(1, rawV * boost);
    const h = Math.max(4, v * H * 0.96);
    const x = i * (barW + gap);
    const hue = 185 + v * 60;
    const alpha = 0.55 + v * 0.45;
    const grad = ctx.createLinearGradient(0, H, 0, H - h);
    grad.addColorStop(0, `hsla(${hue}, 100%, 50%, ${alpha})`);
    grad.addColorStop(0.5, `hsla(${hue + 15}, 100%, 65%, ${alpha * 0.85})`);
    grad.addColorStop(1, `hsla(${hue + 30}, 100%, 80%, ${alpha * 0.5})`);
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.roundRect(x, H - h, barW, h, [3, 3, 0, 0]);
    ctx.fill();
  }
}

function drawWaveform(ctx, W, H, waveData) {
  // Primary wave
  ctx.beginPath();
  const sliceW = W / waveData.length;
  let x = 0;
  for (let i = 0; i < waveData.length; i++) {
    const v = waveData[i] / 128.0;
    const y = (v * H) / 2;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
    x += sliceW;
  }
  ctx.strokeStyle = "rgba(0,229,255,0.9)";
  ctx.lineWidth = 2.5;
  ctx.lineJoin = "round";
  ctx.stroke();

  // Mirror wave (lighter)
  ctx.beginPath();
  x = 0;
  for (let i = 0; i < waveData.length; i++) {
    const v = waveData[i] / 128.0;
    const y = H - (v * H) / 2;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
    x += sliceW;
  }
  ctx.strokeStyle = "rgba(0,180,220,0.3)";
  ctx.lineWidth = 1.5;
  ctx.stroke();
}

function drawCosmic(ctx, W, H, freqData, bufLen, t, particlesRef) {
  const cx = W / 2, cy = H / 2;
  const avgFreq = freqData.reduce((s, v) => s + v, 0) / bufLen;
  const pulse = avgFreq / 255;
  const bassLen = Math.floor(bufLen * 0.08);
  let bassSum = 0;
  for (let i = 0; i < bassLen; i++) bassSum += freqData[i];
  const bassPulse = bassSum / (bassLen * 255);

  // Beat-reactive spawn: bass kick = burst, quiet = trickle
  const beatThreshold = 0.08;
  const isBeat = bassPulse > 0.45; // hard bass hit
  const maxP = isBeat ? 300 : 180;
  if (pulse > beatThreshold && particlesRef.current.length < maxP) {
    // Big burst on bass hit, small trickle otherwise
    const count = isBeat
      ? Math.floor(10 + bassPulse * 18)
      : Math.floor(1 + pulse * 4);
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      // Speed slams up on bass hit
      const speedBase = isBeat ? 0.8 + bassPulse * 1.5 : 0.2 + pulse * 0.7;
      const speed = speedBase + Math.random() * speedBase * 0.5;
      const spawnR = Math.random() < 0.65 ? 0 : Math.random() * Math.min(W, H) * 0.3;
      particlesRef.current.push({
        x: cx + Math.cos(angle) * spawnR,
        y: cy + Math.sin(angle) * spawnR,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1,
        decay: isBeat ? 0.004 + Math.random() * 0.008 : 0.008 + Math.random() * 0.014,
        size: isBeat
          ? 3.5 + Math.random() * 6 * bassPulse
          : 2 + Math.random() * 3,
        hue: 160 + Math.random() * 100,
      });
    }
  }

  // Update and draw
  const alive = [];
  for (const p of particlesRef.current) {
    p.x  += p.vx;
    p.y  += p.vy;
    p.vx *= 0.985; // less drag = travel further
    p.vy *= 0.985;
    p.life -= p.decay;
    if (p.life <= 0) continue;
    const r = Math.max(0, p.size * p.life);
    if (r > 0) {
      ctx.beginPath();
      ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
      ctx.fillStyle = `hsla(${p.hue}, 100%, 72%, ${p.life * 0.9})`;
      ctx.fill();
    }
    alive.push(p);
  }
  particlesRef.current = alive;

  // Center glow — larger radius
  const ringR = Math.min(W, H) * 0.32 + pulse * 30 + bassPulse * 20;
  if (ringR > 0) {
    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, ringR);
    grad.addColorStop(0, `rgba(0,220,255,${0.15 + pulse * 0.22})`);
    grad.addColorStop(0.5, `rgba(155,126,255,${0.06 + pulse * 0.08})`);
    grad.addColorStop(1, "rgba(0,0,0,0)");
    ctx.beginPath();
    ctx.arc(cx, cy, ringR, 0, Math.PI * 2);
    ctx.fillStyle = grad;
    ctx.fill();
  }
}

function drawPulse(ctx, W, H, freqData, bufLen) {
  const cx = W / 2, cy = H / 2;
  const bassLen = Math.floor(bufLen * 0.08);
  let bassSum = 0;
  for (let i = 0; i < bassLen; i++) bassSum += freqData[i];
  const bassPulse = bassSum / (bassLen * 255);
  const avgPulse = freqData.reduce((s, v) => s + v, 0) / (bufLen * 255);
  const baseR = Math.min(W, H) * 0.24;

  // Concentric rings
  const rings = [
    { r: baseR * (1 + bassPulse * 0.3),  alpha: 0.8,  width: 2.5, color: "0,220,255" },
    { r: baseR * (1 + avgPulse * 0.5 + 0.12), alpha: 0.35, width: 1.5, color: "155,126,255" },
    { r: baseR * (1 + avgPulse * 0.7 + 0.25), alpha: 0.15, width: 1,   color: "0,200,220" },
  ];
  for (const ring of rings) {
    if (ring.r <= 0) continue;
    ctx.beginPath();
    ctx.arc(cx, cy, ring.r, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(${ring.color},${ring.alpha})`;
    ctx.lineWidth = ring.width;
    ctx.stroke();
  }

  // Circular frequency bars
  const barCount = 72;
  const step = Math.floor(bufLen / barCount);
  for (let i = 0; i < barCount; i++) {
    const v = freqData[i * step] / 255;
    const angle = (i / barCount) * Math.PI * 2 - Math.PI / 2;
    const inner = baseR * (1.04 + bassPulse * 0.06);
    const outer = inner + Math.max(0, v * baseR * 0.65 + 2);
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(angle) * inner, cy + Math.sin(angle) * inner);
    ctx.lineTo(cx + Math.cos(angle) * outer, cy + Math.sin(angle) * outer);
    ctx.strokeStyle = `hsla(${185 + v * 80}, 100%, 60%, ${0.45 + v * 0.55})`;
    ctx.lineWidth = Math.max(1, (W / barCount) * 0.5);
    ctx.lineCap = "round";
    ctx.stroke();
  }

  // Center dot
  const dotR = Math.max(0, 5 + bassPulse * 14);
  if (dotR > 0) {
    const dg = ctx.createRadialGradient(cx, cy, 0, cx, cy, dotR * 3);
    dg.addColorStop(0, `rgba(0,220,255,${0.8 + bassPulse * 0.2})`);
    dg.addColorStop(0.5, `rgba(0,180,220,${0.2 + bassPulse * 0.2})`);
    dg.addColorStop(1, "rgba(0,0,0,0)");
    ctx.beginPath();
    ctx.arc(cx, cy, dotR, 0, Math.PI * 2);
    ctx.fillStyle = dg;
    ctx.fill();
  }
}

function drawSpectrum(ctx, W, H, freqData, bufLen, t) {
  const bands = 5;
  const bandSize = Math.floor(bufLen / bands);
  const bandAvgs = [];
  for (let b = 0; b < bands; b++) {
    let sum = 0;
    for (let i = b * bandSize; i < (b + 1) * bandSize; i++) sum += freqData[i] || 0;
    bandAvgs.push(sum / bandSize / 255);
  }

  // Draw a flowing wave per band (stacked vertically)
  const sliceH = H / bands;
  const colors = [
    "0,229,255", "0,200,220", "100,160,255", "155,126,255", "200,100,255"
  ];

  for (let b = 0; b < bands; b++) {
    const amp = bandAvgs[b];
    const centerY = sliceH * b + sliceH / 2;
    const waveH = amp * sliceH * 0.75;
    const freq = 1.5 + b * 0.6;
    const phase = t * (0.8 + b * 0.3);

    ctx.beginPath();
    for (let px = 0; px <= W; px += 3) {
      const nx = px / W;
      const y = centerY + Math.sin(nx * Math.PI * 2 * freq + phase) * waveH;
      if (px === 0) ctx.moveTo(px, y);
      else ctx.lineTo(px, y);
    }
    ctx.strokeStyle = `rgba(${colors[b]}, ${0.4 + amp * 0.55})`;
    ctx.lineWidth = 1.5 + amp * 2;
    ctx.lineJoin = "round";
    ctx.stroke();

    // Fill glow below wave
    ctx.beginPath();
    for (let px = 0; px <= W; px += 3) {
      const nx = px / W;
      const y = centerY + Math.sin(nx * Math.PI * 2 * freq + phase) * waveH;
      if (px === 0) ctx.moveTo(px, y);
      else ctx.lineTo(px, y);
    }
    ctx.lineTo(W, centerY + sliceH / 2);
    ctx.lineTo(0, centerY + sliceH / 2);
    ctx.closePath();
    ctx.fillStyle = `rgba(${colors[b]}, ${amp * 0.08})`;
    ctx.fill();
  }
}

// ── Fallback animations (no analyser — iOS or pre-tap) ───────────────────────

function drawFallbackBars(ctx, W, H, t, active) {
  const barCount = 32;
  const gap = 3;
  const barW = (W - gap * (barCount - 1)) / barCount;
  for (let i = 0; i < barCount; i++) {
    const wave = active
      ? (Math.sin(t * 2.5 + i * 0.4) * 0.5 + 0.5) * (Math.sin(t * 1.1 + i * 0.15) * 0.3 + 0.7)
      : 0.05 + Math.sin(i * 0.5) * 0.03;
    const h = Math.max(3, wave * H * 0.7);
    const hue = 185 + i * 1.5;
    ctx.fillStyle = `hsla(${hue}, 100%, 60%, ${0.3 + wave * 0.55})`;
    ctx.beginPath();
    ctx.roundRect(i * (barW + gap), H - h, barW, h, [2, 2, 0, 0]);
    ctx.fill();
  }
}

function drawFallbackWaveform(ctx, W, H, t, active) {
  const speed = active ? 1.8 : 0.3;
  const amp = active ? 0.32 : 0.05;
  ctx.beginPath();
  for (let px = 0; px <= W; px += 3) {
    const nx = px / W;
    const y = H / 2 + Math.sin(nx * Math.PI * 4 + t * speed) * H * amp;
    if (px === 0) ctx.moveTo(px, y);
    else ctx.lineTo(px, y);
  }
  ctx.strokeStyle = `rgba(0,229,255,${active ? 0.8 : 0.25})`;
  ctx.lineWidth = 2;
  ctx.stroke();
}

function drawFallbackCosmic(ctx, W, H, t, active, particlesRef) {
  const cx = W / 2, cy = H / 2;
  const spawnChance = active ? 0.55 : 0.08;
  const maxParticles = active ? 160 : 30;
  if (Math.random() < spawnChance && particlesRef.current.length < maxParticles) {
    const count = active ? Math.floor(1 + Math.random() * 3) : 1;
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = active ? (0.5 + Math.random() * 1.5) : (0.2 + Math.random() * 0.4);
      const spawnR = Math.random() < 0.5 ? 0 : Math.random() * Math.min(W, H) * 0.3;
      particlesRef.current.push({
        x: cx + Math.cos(angle) * spawnR,
        y: cy + Math.sin(angle) * spawnR,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1,
        decay: 0.007 + Math.random() * 0.011,
        size: 2 + Math.random() * 4.5,
        hue: 160 + Math.random() * 100,
      });
    }
  }
  const alive = [];
  for (const p of particlesRef.current) {
    p.x  += p.vx;
    p.y  += p.vy;
    p.vx *= 0.97;
    p.vy *= 0.97;
    p.life -= p.decay;
    if (p.life <= 0) continue;
    const r = Math.max(0, p.size * p.life);
    if (r > 0) {
      ctx.beginPath();
      ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
      ctx.fillStyle = `hsla(${p.hue}, 100%, 70%, ${p.life * 0.75})`;
      ctx.fill();
    }
    alive.push(p);
  }
  particlesRef.current = alive;
  // Center glow
  const pulseR = Math.min(W, H) * 0.18 * (active ? (0.7 + Math.sin(t * 2) * 0.3) : 0.4);
  if (pulseR > 0) {
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, pulseR);
    g.addColorStop(0, `rgba(0,220,255,${active ? 0.2 : 0.06})`);
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.beginPath();
    ctx.arc(cx, cy, pulseR, 0, Math.PI * 2);
    ctx.fillStyle = g;
    ctx.fill();
  }
}

function drawFallbackPulse(ctx, W, H, t, active) {
  const cx = W / 2, cy = H / 2;
  const baseR = Math.min(W, H) * 0.24;
  const pulse = active ? (0.7 + Math.sin(t * 2.2) * 0.3) : 0.4;
  const rings = [
    { scale: 1 + (active ? pulse * 0.12 : 0), alpha: 0.7 * pulse, width: 2.5, color: "0,220,255" },
    { scale: 1.18,  alpha: 0.25 * pulse, width: 1.5, color: "155,126,255" },
    { scale: 1.36,  alpha: 0.1 * pulse,  width: 1,   color: "0,200,220" },
  ];
  for (const ring of rings) {
    const r = baseR * ring.scale;
    if (r <= 0) continue;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(${ring.color},${ring.alpha})`;
    ctx.lineWidth = ring.width;
    ctx.stroke();
  }
  // Static bars
  const barCount = 48;
  for (let i = 0; i < barCount; i++) {
    const angle = (i / barCount) * Math.PI * 2 - Math.PI / 2;
    const v = active ? (Math.sin(t * 1.8 + i * 0.26) * 0.5 + 0.5) : 0.1;
    const inner = baseR * 1.04;
    const outer = inner + Math.max(0, v * baseR * 0.35 + 2);
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(angle) * inner, cy + Math.sin(angle) * inner);
    ctx.lineTo(cx + Math.cos(angle) * outer, cy + Math.sin(angle) * outer);
    ctx.strokeStyle = `hsla(${185 + v * 60}, 100%, 60%, ${active ? (0.4 + v * 0.4) : 0.15})`;
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.stroke();
  }
}

function drawFallbackSpectrum(ctx, W, H, t, active) {
  const bands = 5;
  const sliceH = H / bands;
  const colors = ["0,229,255", "0,200,220", "100,160,255", "155,126,255", "200,100,255"];
  for (let b = 0; b < bands; b++) {
    const amp = active ? (0.2 + Math.sin(t * (0.9 + b * 0.3) + b * 1.2) * 0.18) : 0.05;
    const centerY = sliceH * b + sliceH / 2;
    const waveH = amp * sliceH * 0.75;
    const freq = 1.5 + b * 0.6;
    const phase = t * (0.8 + b * 0.3);
    ctx.beginPath();
    for (let px = 0; px <= W; px += 4) {
      const nx = px / W;
      const y = centerY + Math.sin(nx * Math.PI * 2 * freq + phase) * waveH;
      if (px === 0) ctx.moveTo(px, y);
      else ctx.lineTo(px, y);
    }
    ctx.strokeStyle = `rgba(${colors[b]}, ${0.3 + amp * 0.6})`;
    ctx.lineWidth = 1.5 + amp * 2;
    ctx.stroke();
  }
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function RadioVisualizer({ isPlaying, currentSong }) {
  const canvasRef    = useRef(null);
  const rafRef       = useRef(null);
  const analyserRef  = useRef(null);
  const particlesRef = useRef([]);
  const { audioRef } = usePlayer();

  const getSavedMode = () => {
    try { return localStorage.getItem(PREF_KEY) || "bars"; } catch { return "bars"; }
  };

  const [mode, setMode]               = useState(getSavedMode);
  const [showSelector, setShowSelector] = useState(false);
  const [analyserConnected, setAnalyserConnected] = useState(false);

  // Save preference
  useEffect(() => {
    try { localStorage.setItem(PREF_KEY, mode); } catch {}
  }, [mode]);

  // ── Try to connect analyser ───────────────────────────────────────────────
  const tryConnectAnalyser = useCallback(() => {
    const audio = audioRef?.current;
    const audioFound = !!audio;
    const audioSrc = audio?.src || "(none)";
    let ctxState = "N/A";
    let connected = false;

    if (!isIOS && audio) {
      const an = getGlobalAnalyser(audio);
      if (an) {
        analyserRef.current = an;
        connected = true;
        try { ctxState = an.context?.state || "unknown"; } catch {}
      }
    } else {
      analyserRef.current = null;
    }

    const fallback = !connected;

    console.log("[Viz] probe |",
      "selectedVisualizer:", mode,
      "| isIOS:", isIOS,
      "| isSafari:", isSafari,
      "| radioAudioElementFound:", audioFound,
      "| radioAudioSrc:", audioSrc.substring(0, 60),
      "| audioContextState:", ctxState,
      "| analyserConnected:", connected,
      "| fallbackAnimationActive:", fallback,
      "| radioIsPlaying:", isPlaying,
      "| currentSongTitle:", currentSong?.title || "(none)"
    );

    setAnalyserConnected(connected);
    return connected;
  }, [audioRef, mode, isPlaying, currentSong]);

  // ── Animation loop ────────────────────────────────────────────────────────
  const stopLoop = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, []);

  const startLoop = useCallback((currentMode, useAnalyser) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const loop = () => {
      const ctx  = canvas.getContext("2d");
      const rect = canvas.getBoundingClientRect();
      const W    = rect.width  || canvas.width;
      const H    = rect.height || canvas.height;
      const t    = Date.now() / 1000;

      ctx.clearRect(0, 0, W, H);

      const an = useAnalyser ? analyserRef.current : null;

      if (an) {
        // Real analyser data
        const bufLen   = an.frequencyBinCount;
        const freqData = new Uint8Array(bufLen);
        const waveData = new Uint8Array(bufLen);
        an.getByteFrequencyData(freqData);
        an.getByteTimeDomainData(waveData);

        switch (currentMode) {
          case "bars":     drawBars(ctx, W, H, freqData, bufLen); break;
          case "waveform": drawWaveform(ctx, W, H, waveData); break;
          case "cosmic":   drawCosmic(ctx, W, H, freqData, bufLen, t, particlesRef); break;
          case "spectrum": drawSpectrum(ctx, W, H, freqData, bufLen, t); break;
          case "pulse":
          default:         drawPulse(ctx, W, H, freqData, bufLen); break;
        }
      } else {
        // Fallback animation
        const active = isPlaying;
        switch (currentMode) {
          case "bars":     drawFallbackBars(ctx, W, H, t, active); break;
          case "waveform": drawFallbackWaveform(ctx, W, H, t, active); break;
          case "cosmic":   drawFallbackCosmic(ctx, W, H, t, active, particlesRef); break;
          case "spectrum": drawFallbackSpectrum(ctx, W, H, t, active); break;
          case "pulse":
          default:         drawFallbackPulse(ctx, W, H, t, active); break;
        }
      }

      rafRef.current = requestAnimationFrame(loop);
    };

    loop();
  }, [isPlaying]);

  // ── Reconnect + restart on relevant changes ───────────────────────────────
  useEffect(() => {
    stopLoop();
    particlesRef.current = [];

    const connected = tryConnectAnalyser();
    startLoop(mode, connected);

    return stopLoop;
  }, [mode, isPlaying, currentSong?.id]); // reconnect when song changes or play state changes

  // Re-probe analyser when page becomes visible again (navigation away/back)
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState !== "visible") return;
      stopLoop();
      particlesRef.current = [];
      const connected = tryConnectAnalyser();
      startLoop(mode, connected);
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [mode, isPlaying, tryConnectAnalyser, startLoop, stopLoop]);

  // ── DPR-aware canvas resize ───────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const syncSize = () => {
      const rect = canvas.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;
      const dpr = window.devicePixelRatio || 1;
      canvas.width  = Math.round(rect.width  * dpr);
      canvas.height = Math.round(rect.height * dpr);
      const ctx = canvas.getContext("2d");
      ctx.scale(dpr, dpr);
    };
    syncSize();
    const ro = new ResizeObserver(syncSize);
    ro.observe(canvas);
    return () => ro.disconnect();
  }, []);

  const activeLabel = MODES.find(m => m.id === mode)?.label || "Frequency Bars";

  return (
    <div style={{ position: "relative", width: "100%", paddingTop: "min(56.25%, 260px)", overflow: "hidden", borderRadius: "inherit" }}>
      <canvas
        ref={canvasRef}
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", display: "block" }}
      />

      {/* ── Visualizer selector ── */}
      <div style={{ position: "absolute", bottom: 10, right: 10, zIndex: 10 }}>
        <button
          onClick={() => setShowSelector(s => !s)}
          style={{
            display: "flex", alignItems: "center", gap: 5,
            padding: "5px 10px", borderRadius: 20,
            background: "rgba(0,0,0,0.6)", backdropFilter: "blur(10px)",
            WebkitBackdropFilter: "blur(10px)",
            border: `1px solid ${analyserConnected ? "rgba(0,220,255,0.35)" : "rgba(255,255,255,0.15)"}`,
            cursor: "pointer",
            color: analyserConnected ? "rgba(0,220,255,0.9)" : "rgba(255,255,255,0.45)",
            fontSize: 10, fontWeight: 800,
            letterSpacing: "0.05em", textTransform: "uppercase",
            userSelect: "none", WebkitUserSelect: "none",
          }}>
          {activeLabel}
          <ChevronDown style={{
            width: 10, height: 10,
            transform: showSelector ? "rotate(180deg)" : "none",
            transition: "transform 0.2s",
          }} />
        </button>

        {showSelector && (
          <div style={{
            position: "absolute", bottom: "calc(100% + 6px)", right: 0,
            background: "rgba(4,4,18,0.94)", backdropFilter: "blur(18px)",
            WebkitBackdropFilter: "blur(18px)",
            border: "1px solid rgba(0,200,220,0.2)", borderRadius: 14,
            overflow: "hidden", minWidth: 165,
            boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
          }}>
            {MODES.map(m => (
              <button
                key={m.id}
                onClick={() => { setMode(m.id); setShowSelector(false); }}
                style={{
                  display: "block", width: "100%", textAlign: "left",
                  padding: "10px 14px", fontSize: 11, fontWeight: 700,
                  background: m.id === mode ? "rgba(0,200,220,0.1)" : "transparent",
                  color: m.id === mode ? "#00E5FF" : "rgba(255,255,255,0.55)",
                  border: "none", cursor: "pointer", letterSpacing: "0.03em",
                  borderLeft: m.id === mode ? "2px solid #00E5FF" : "2px solid transparent",
                  userSelect: "none", WebkitUserSelect: "none",
                }}>
                {m.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Fallback indicator dot (iOS/Safari only, no analyser) */}
      {!analyserConnected && isIOS && (
        <div style={{
          position: "absolute", bottom: 10, left: 10,
          display: "flex", alignItems: "center", gap: 5,
          padding: "4px 8px", borderRadius: 20,
          background: "rgba(0,0,0,0.5)",
          border: "1px solid rgba(255,255,255,0.1)",
          fontSize: 9, fontWeight: 700, letterSpacing: "0.08em",
          color: "rgba(255,255,255,0.3)", textTransform: "uppercase",
        }}>
          <span style={{ width: 5, height: 5, borderRadius: "50%", background: isPlaying ? "#00C9E0" : "rgba(255,255,255,0.2)", display: "inline-block" }} />
          Visual
        </div>
      )}
    </div>
  );
}