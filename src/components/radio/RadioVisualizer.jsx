import React, { useRef, useEffect, useCallback, useState } from "react";
import { usePlayer, getGlobalAnalyser } from "../../context/PlayerContext";
import { ChevronDown } from "lucide-react";

const PREF_KEY = "uvm_radio_viz";

const MODES = [
  { id: "auto",      label: "Auto Match Song" },
  { id: "bars",      label: "Frequency Bars" },
  { id: "waveform",  label: "Waveform" },
  { id: "cosmic",    label: "Cosmic Particles" },
  { id: "albumglow", label: "Album Art Glow" },
  { id: "pulse",     label: "Pulse Ring" },
];

// ── Draw helpers ──────────────────────────────────────────────────────────────

function drawBars(ctx, W, H, data, bufLen, t) {
  const barCount = 64;
  const step = Math.floor(bufLen / barCount);
  const barW = W / barCount;
  for (let i = 0; i < barCount; i++) {
    const v = data[i * step] / 255;
    const h = v * H * 0.85 + 2;
    const hue = 185 + v * 40;
    ctx.fillStyle = `hsla(${hue}, 100%, 60%, ${0.5 + v * 0.5})`;
    ctx.beginPath();
    ctx.roundRect(i * barW + 1, H - h, barW - 2, h, 3);
    ctx.fill();
  }
}

function drawWaveform(ctx, W, H, waveData) {
  ctx.beginPath();
  const sliceW = W / waveData.length;
  let x = 0;
  for (let i = 0; i < waveData.length; i++) {
    const v = waveData[i] / 128.0;
    const y = (v * H) / 2;
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    x += sliceW;
  }
  ctx.lineTo(W, H / 2);
  ctx.strokeStyle = "rgba(0,229,255,0.85)";
  ctx.lineWidth = 2;
  ctx.stroke();

  // Mirror
  ctx.beginPath();
  x = 0;
  for (let i = 0; i < waveData.length; i++) {
    const v = waveData[i] / 128.0;
    const y = H - (v * H) / 2;
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    x += sliceW;
  }
  ctx.strokeStyle = "rgba(0,180,220,0.35)";
  ctx.lineWidth = 1;
  ctx.stroke();
}

function drawCosmic(ctx, W, H, data, bufLen, t, particlesRef) {
  const cx = W / 2, cy = H / 2;
  const avgFreq = data.reduce((s, v) => s + v, 0) / bufLen;
  const pulse = avgFreq / 255;

  // Spawn new particles on beats
  if (pulse > 0.3 && particlesRef.current.length < 120) {
    const count = Math.floor(pulse * 4);
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 0.5 + Math.random() * 2.5 * pulse;
      particlesRef.current.push({
        x: cx, y: cy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1,
        decay: 0.012 + Math.random() * 0.018,
        size: 1.5 + Math.random() * 3,
        hue: 170 + Math.random() * 60,
      });
    }
  }

  // Update + draw
  particlesRef.current = particlesRef.current.filter(p => p.life > 0);
  for (const p of particlesRef.current) {
    p.x += p.vx;
    p.y += p.vy;
    p.vx *= 0.98;
    p.vy *= 0.98;
    p.life -= p.decay;
    const r = p.size * p.life;
    if (r <= 0) continue;
    ctx.beginPath();
    ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
    ctx.fillStyle = `hsla(${p.hue}, 100%, 70%, ${p.life * 0.9})`;
    ctx.fill();
  }

  // Outer glow ring
  const ringR = Math.min(W, H) * 0.3 + pulse * 20;
  const grad = ctx.createRadialGradient(cx, cy, ringR * 0.8, cx, cy, ringR);
  grad.addColorStop(0, `rgba(0,220,255,${0.15 + pulse * 0.2})`);
  grad.addColorStop(1, "rgba(0,0,0,0)");
  ctx.beginPath();
  ctx.arc(cx, cy, ringR, 0, Math.PI * 2);
  ctx.fillStyle = grad;
  ctx.fill();
}

function drawAlbumGlow(ctx, W, H, data, bufLen, t, coverImg) {
  const cx = W / 2, cy = H / 2;
  const avgFreq = data.reduce((s, v) => s + v, 0) / bufLen;
  const pulse = avgFreq / 255;
  const baseR = Math.min(W, H) * 0.32;

  // Pulsing glow layers
  for (let i = 3; i >= 0; i--) {
    const r = baseR * (1 + i * 0.18 + pulse * 0.12 * i);
    const alpha = (0.12 - i * 0.025) * (1 + pulse);
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(0,200,220,${alpha})`;
    ctx.fill();
  }

  // Album art circle
  if (coverImg && coverImg.complete && coverImg.naturalWidth > 0) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, baseR, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(coverImg, cx - baseR, cy - baseR, baseR * 2, baseR * 2);
    ctx.restore();
    // Spin overlay
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(t * 0.3);
    const spin = ctx.createConicalGradient ? null : null;
    ctx.beginPath();
    ctx.arc(0, 0, baseR, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(0,200,220,${0.1 + pulse * 0.15})`;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();
  } else {
    // Fallback circle
    ctx.beginPath();
    ctx.arc(cx, cy, baseR, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(0,180,210,${0.12 + pulse * 0.1})`;
    ctx.fill();
    ctx.strokeStyle = `rgba(0,220,255,${0.3 + pulse * 0.3})`;
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  // Frequency ring around album
  const barCount = 60;
  const step = Math.floor(bufLen / barCount);
  for (let i = 0; i < barCount; i++) {
    const v = data[i * step] / 255;
    const angle = (i / barCount) * Math.PI * 2 - Math.PI / 2;
    const inner = baseR + 4;
    const outer = inner + v * baseR * 0.4 + 2;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(angle) * inner, cy + Math.sin(angle) * inner);
    ctx.lineTo(cx + Math.cos(angle) * outer, cy + Math.sin(angle) * outer);
    ctx.strokeStyle = `hsla(${185 + v * 60}, 100%, 65%, ${0.4 + v * 0.5})`;
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.stroke();
  }
}

function drawPulseRing(ctx, W, H, data, bufLen, t) {
  const cx = W / 2, cy = H / 2;
  const avgFreq = data.reduce((s, v) => s + v, 0) / bufLen;
  const bassFreq = data.slice(0, Math.floor(bufLen * 0.1)).reduce((s, v) => s + v, 0) / (bufLen * 0.1);
  const pulse = avgFreq / 255;
  const bassPulse = bassFreq / 255;
  const baseR = Math.min(W, H) * 0.25;

  // Multiple concentric rings
  const rings = [
    { scale: 1 + bassPulse * 0.25, alpha: 0.7 + bassPulse * 0.3, width: 3, color: `0,220,255` },
    { scale: 1 + pulse * 0.35 + 0.1, alpha: 0.35, width: 1.5, color: `155,126,255` },
    { scale: 1 + pulse * 0.5 + 0.22, alpha: 0.15, width: 1, color: `0,200,220` },
  ];
  for (const ring of rings) {
    ctx.beginPath();
    ctx.arc(cx, cy, baseR * ring.scale, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(${ring.color},${ring.alpha})`;
    ctx.lineWidth = ring.width;
    ctx.stroke();
  }

  // Circular frequency bars
  const barCount = 72;
  const step = Math.floor(bufLen / barCount);
  for (let i = 0; i < barCount; i++) {
    const v = data[i * step] / 255;
    const angle = (i / barCount) * Math.PI * 2 - Math.PI / 2;
    const inner = baseR * (1.05 + bassPulse * 0.08);
    const outer = inner + v * baseR * 0.7 + 2;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(angle) * inner, cy + Math.sin(angle) * inner);
    ctx.lineTo(cx + Math.cos(angle) * outer, cy + Math.sin(angle) * outer);
    ctx.strokeStyle = `hsla(${185 + v * 80}, 100%, 60%, ${0.45 + v * 0.55})`;
    ctx.lineWidth = (W / barCount) * 0.5;
    ctx.lineCap = "round";
    ctx.stroke();
  }

  // Center dot
  const dotR = 5 + bassPulse * 14;
  const dg = ctx.createRadialGradient(cx, cy, 0, cx, cy, dotR * 3);
  dg.addColorStop(0, `rgba(0,220,255,${0.8 + bassPulse * 0.2})`);
  dg.addColorStop(0.5, `rgba(0,180,220,${0.2 + bassPulse * 0.2})`);
  dg.addColorStop(1, "rgba(0,0,0,0)");
  ctx.beginPath();
  ctx.arc(cx, cy, dotR, 0, Math.PI * 2);
  ctx.fillStyle = dg;
  ctx.fill();
}

// ── Idle fallback ─────────────────────────────────────────────────────────────
function drawIdleMode(ctx, W, H, t) {
  const cx = W / 2, cy = H / 2;
  const baseR = Math.min(W, H) * 0.28;
  for (let i = 0; i < 72; i++) {
    const angle = (i / 72) * Math.PI * 2 - Math.PI / 2;
    const wave = Math.sin(angle * 3 + t * 1.2) * 0.5 + 0.5;
    const barH = wave * baseR * 0.1 + 3;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(angle) * baseR, cy + Math.sin(angle) * baseR);
    ctx.lineTo(cx + Math.cos(angle) * (baseR + barH), cy + Math.sin(angle) * (baseR + barH));
    ctx.strokeStyle = "rgba(0,200,220,0.15)";
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.stroke();
  }
  const dotPulse = Math.sin(t * 1.5) * 0.3 + 0.7;
  ctx.beginPath();
  ctx.arc(cx, cy, 6 * dotPulse, 0, Math.PI * 2);
  ctx.fillStyle = `rgba(0,200,220,${0.3 * dotPulse})`;
  ctx.fill();
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function RadioVisualizer({ isPlaying, currentSong }) {
  const canvasRef = useRef(null);
  const rafRef = useRef(null);
  const analyserRef = useRef(null);
  const particlesRef = useRef([]);
  const coverImgRef = useRef(null);
  const { audioRef } = usePlayer();

  const savedMode = () => {
    try { return localStorage.getItem(PREF_KEY) || "auto"; } catch { return "auto"; }
  };

  const [mode, setMode] = useState(savedMode);
  const [showSelector, setShowSelector] = useState(false);

  // Persist preference
  useEffect(() => {
    try { localStorage.setItem(PREF_KEY, mode); } catch {}
  }, [mode]);

  // Preload cover image for album glow mode
  useEffect(() => {
    const url = currentSong?.cover_url;
    if (!url) { coverImgRef.current = null; return; }
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = url;
    img.onload = () => { coverImgRef.current = img; };
    img.onerror = () => { coverImgRef.current = null; };
  }, [currentSong?.cover_url]);

  // Determine active draw mode
  const resolvedMode = useCallback(() => {
    if (mode !== "auto") return mode;
    // Auto: check if song has an assigned visualizer (we use pulse as default for auto)
    return "pulse";
  }, [mode]);

  const stopLoop = useCallback(() => {
    if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
  }, []);

  const startLoop = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const an = analyserRef.current;
    const activeMode = resolvedMode();

    const loop = () => {
      const ctx = canvas.getContext("2d");
      const rect = canvas.getBoundingClientRect();
      const W = rect.width || canvas.width;
      const H = rect.height || canvas.height;
      const t = Date.now() / 1000;

      ctx.clearRect(0, 0, W, H);

      if (!an) {
        drawIdleMode(ctx, W, H, t);
        rafRef.current = requestAnimationFrame(loop);
        return;
      }

      const bufLen = an.frequencyBinCount;
      const data = new Uint8Array(bufLen);
      an.getByteFrequencyData(data);
      const waveData = new Uint8Array(bufLen);
      an.getByteTimeDomainData(waveData);

      switch (activeMode) {
        case "bars":      drawBars(ctx, W, H, data, bufLen, t); break;
        case "waveform":  drawWaveform(ctx, W, H, waveData); break;
        case "cosmic":    drawCosmic(ctx, W, H, data, bufLen, t, particlesRef); break;
        case "albumglow": drawAlbumGlow(ctx, W, H, data, bufLen, t, coverImgRef.current); break;
        case "pulse":
        default:          drawPulseRing(ctx, W, H, data, bufLen, t); break;
      }

      rafRef.current = requestAnimationFrame(loop);
    };

    loop();
  }, [resolvedMode]);

  // Re-attach analyser + restart loop when isPlaying or mode changes
  useEffect(() => {
    stopLoop();
    particlesRef.current = [];

    if (isPlaying && audioRef?.current) {
      const an = getGlobalAnalyser(audioRef.current);
      analyserRef.current = an || null;
    } else {
      analyserRef.current = null;
    }

    startLoop();
    return stopLoop;
  }, [isPlaying, audioRef, mode, startLoop, stopLoop]);

  // DPR-aware canvas resize
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const syncSize = () => {
      const rect = canvas.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;
      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.round(rect.width * dpr);
      canvas.height = Math.round(rect.height * dpr);
      const ctx = canvas.getContext("2d");
      ctx.scale(dpr, dpr);
    };
    syncSize();
    const ro = new ResizeObserver(syncSize);
    ro.observe(canvas);
    return () => ro.disconnect();
  }, []);

  const activeLabel = MODES.find(m => m.id === mode)?.label || "Auto Match Song";

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
            background: "rgba(0,0,0,0.55)", backdropFilter: "blur(8px)",
            border: "1px solid rgba(0,220,255,0.2)", cursor: "pointer",
            color: "rgba(0,220,255,0.85)", fontSize: 10, fontWeight: 800,
            letterSpacing: "0.06em", textTransform: "uppercase",
          }}>
          {activeLabel}
          <ChevronDown style={{ width: 10, height: 10, transform: showSelector ? "rotate(180deg)" : "none", transition: "transform 0.2s" }} />
        </button>

        {showSelector && (
          <div style={{
            position: "absolute", bottom: "calc(100% + 6px)", right: 0,
            background: "rgba(4,4,18,0.92)", backdropFilter: "blur(16px)",
            border: "1px solid rgba(0,200,220,0.18)", borderRadius: 14,
            overflow: "hidden", minWidth: 160,
          }}>
            {MODES.map(m => (
              <button
                key={m.id}
                onClick={() => { setMode(m.id); setShowSelector(false); }}
                style={{
                  display: "block", width: "100%", textAlign: "left",
                  padding: "9px 14px", fontSize: 11, fontWeight: 700,
                  background: m.id === mode ? "rgba(0,200,220,0.1)" : "transparent",
                  color: m.id === mode ? "#00E5FF" : "rgba(255,255,255,0.55)",
                  border: "none", cursor: "pointer", letterSpacing: "0.03em",
                  borderLeft: m.id === mode ? "2px solid #00E5FF" : "2px solid transparent",
                }}>
                {m.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}