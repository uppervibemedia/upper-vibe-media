import React, { useEffect, useRef, useCallback, useImperativeHandle, forwardRef } from "react";

/**
 * StageScreenVisualizer — a shared/public rotating visualizer for the Main Music Stage.
 *
 * Rules:
 *  - Renders brand-safe abstract visuals on an offscreen canvas
 *  - Rotates through 5 modes every ~3 minutes
 *  - Uses procedurally generated frequency data (not user-specific audio)
 *  - Canvas is exported via ref so CityCanvas can use it as a Three.js texture
 */

const MODES = ["cosmicTunnel", "spectrumBars", "energyRings", "waveformGlow", "pulseParticles"];
const MODE_DURATION = 180; // seconds per mode (3 minutes)

const CANVAS_W = 512;
const CANVAS_H = 256;

// ── Procedural "frequency-like" data — creates nice visuals without real audio ──
function generateFreqData(t) {
  const count = 64;
  const arr = new Uint8Array(count);
  for (let i = 0; i < count; i++) {
    const norm = i / count;
    // Low-end emphasis with rhythmic pulse
    const bass = (1 - norm) * (Math.sin(t * 1.4) * 0.4 + 0.6);
    const mid = Math.sin(norm * 6 + t * 0.7) * 0.3 * (1 - Math.abs(norm - 0.5) * 2);
    const high = Math.sin(norm * 14 + t * 1.1) * 0.15 * norm;
    const beat = Math.abs(Math.sin(t * 2.1)) * 0.25;
    arr[i] = Math.max(0, Math.min(255, (bass + mid + high + beat) * 255));
  }
  return arr;
}

// ── DRAWING MODES ──────────────────────────────────────────────────────────

function drawCosmicTunnel(ctx, w, h, t, freq) {
  ctx.fillStyle = "rgba(10,10,30,0.15)";
  ctx.fillRect(0, 0, w, h);

  const cx = w / 2, cy = h / 2;
  const maxR = Math.min(w, h) * 0.7;

  for (let i = 12; i >= 0; i--) {
    const ratio = i / 12;
    const r = maxR * (1 - ratio * 0.85);
    const pulse = Math.sin(t * 1.5 + i * 0.5) * 0.15 + 0.85;
    const spin = t * 0.3 + i * 0.4;
    const segments = 64;
    const freqIdx = Math.floor((i / 12) * 63);

    ctx.beginPath();
    for (let s = 0; s <= segments; s++) {
      const a = (s / segments) * Math.PI * 2 + spin;
      const rr = r * pulse + (freq[freqIdx] / 255) * r * 0.3;
      const sx = cx + Math.cos(a) * rr;
      const sy = cy + Math.sin(a) * rr * 0.5;
      if (s === 0) ctx.moveTo(sx, sy);
      else ctx.lineTo(sx, sy);
    }
    ctx.closePath();

    const hue = 260 + i * 15;
    const alpha = 0.12 + ratio * 0.5;
    ctx.strokeStyle = `hsla(${hue}, 70%, ${50 + ratio * 25}%, ${alpha})`;
    ctx.lineWidth = 1.5 + ratio * 2;
    ctx.stroke();
  }
}

function drawSpectrumBars(ctx, w, h, t, freq) {
  ctx.fillStyle = "rgba(8,8,22,0.2)";
  ctx.fillRect(0, 0, w, h);

  const barCount = 48;
  const barW = (w / barCount) * 0.7;
  const gap = (w / barCount) * 0.3;
  const baseY = h * 0.85;

  for (let i = 0; i < barCount; i++) {
    const fi = Math.floor((i / barCount) * 63);
    const val = freq[fi] / 255;
    const barH = val * h * 0.75;
    const x = i * (barW + gap) + gap / 2;

    const hue = 260 + (i / barCount) * 40;
    const grad = ctx.createLinearGradient(x, baseY - barH, x, baseY);
    grad.addColorStop(0, `hsla(${hue}, 80%, 60%, 0.9)`);
    grad.addColorStop(1, `hsla(${hue}, 60%, 30%, 0.3)`);
    ctx.fillStyle = grad;

    // Rounded top
    const r = barW * 0.3;
    ctx.beginPath();
    ctx.moveTo(x, baseY);
    ctx.lineTo(x, baseY - barH + r);
    ctx.quadraticCurveTo(x, baseY - barH - r, x + r, baseY - barH);
    ctx.lineTo(x + barW - r, baseY - barH);
    ctx.quadraticCurveTo(x + barW, baseY - barH - r, x + barW, baseY - barH + r);
    ctx.lineTo(x + barW, baseY);
    ctx.closePath();
    ctx.fill();
  }
}

function drawEnergyRings(ctx, w, h, t, freq) {
  ctx.fillStyle = "rgba(6,6,20,0.18)";
  ctx.fillRect(0, 0, w, h);

  const cx = w / 2, cy = h / 2;

  for (let ring = 0; ring < 5; ring++) {
    const baseR = 30 + ring * 45;
    const bassVal = freq[ring * 12] / 255;
    const r = baseR + bassVal * 35;
    const spin = t * (0.4 + ring * 0.15);

    // Main ring
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.strokeStyle = `hsla(${270 - ring * 15}, 70%, ${55 + ring * 8}%, 0.5)`;
    ctx.lineWidth = 2.5 + bassVal * 3;
    ctx.stroke();

    // Glow ring
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.strokeStyle = `hsla(${270 - ring * 15}, 80%, 65%, 0.15)`;
    ctx.lineWidth = 8 + bassVal * 5;
    ctx.stroke();

    // Orbiting dot
    const dotX = cx + Math.cos(spin) * r;
    const dotY = cy + Math.sin(spin) * r;
    ctx.beginPath();
    ctx.arc(dotX, dotY, 2 + bassVal * 2, 0, Math.PI * 2);
    ctx.fillStyle = `hsla(${270 - ring * 15}, 90%, 75%, ${0.6 + bassVal * 0.4})`;
    ctx.fill();
  }
}

function drawWaveformGlow(ctx, w, h, t, freq) {
  ctx.fillStyle = "rgba(5,5,18,0.15)";
  ctx.fillRect(0, 0, w, h);

  const cy = h / 2;

  // Multiple layered waveforms
  for (let layer = 0; layer < 3; layer++) {
    const amp = h * (0.15 + layer * 0.1);
    const speed = 0.6 + layer * 0.2;
    const phase = t * speed;

    ctx.beginPath();
    for (let x = 0; x <= w; x += 2) {
      const norm = x / w;
      const fi = Math.floor(norm * 63);
      const freqVal = freq[fi] / 255;
      const wave1 = Math.sin(norm * 8 + phase) * amp * freqVal;
      const wave2 = Math.sin(norm * 3 + phase * 0.7) * amp * 0.6;
      const wave3 = Math.sin(norm * 15 + phase * 1.3) * amp * 0.25 * freqVal;
      const y = cy + wave1 + wave2 + wave3;

      if (x === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }

    const hue = 250 + layer * 20;
    ctx.strokeStyle = `hsla(${hue}, 70%, ${55 + layer * 12}%, ${0.5 + layer * 0.15})`;
    ctx.lineWidth = 1.5 + layer;
    ctx.stroke();
  }
}

function drawPulseParticles(ctx, w, h, t, freq) {
  ctx.fillStyle = "rgba(4,4,16,0.12)";
  ctx.fillRect(0, 0, w, h);

  const cx = w / 2, cy = h / 2;

  for (let i = 0; i < 40; i++) {
    const angle = (i / 40) * Math.PI * 2 + t * 0.15;
    const fi = Math.floor((i / 40) * 63);
    const val = freq[fi] / 255;
    const dist = 60 + val * 80 + Math.sin(t * 0.8 + i * 0.5) * 20;
    const px = cx + Math.cos(angle) * dist;
    const py = cy + Math.sin(angle) * dist * 0.6;

    // Particle
    const hue = 260 + i * 2;
    const size = 1.5 + val * 3;
    ctx.beginPath();
    ctx.arc(px, py, size, 0, Math.PI * 2);
    ctx.fillStyle = `hsla(${hue}, 80%, ${60 + val * 20}%, ${0.4 + val * 0.5})`;
    ctx.fill();

    // Trail line to center
    ctx.beginPath();
    ctx.moveTo(px, py);
    ctx.lineTo(cx + (px - cx) * 0.3, cy + (py - cy) * 0.3);
    ctx.strokeStyle = `hsla(${hue}, 60%, 50%, 0.08)`;
    ctx.lineWidth = 0.5;
    ctx.stroke();
  }

  // Center pulse
  const bassAvg = freq.slice(0, 8).reduce((a, b) => a + b, 0) / (8 * 255);
  const pulseR = 15 + bassAvg * 30;
  const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, pulseR);
  grad.addColorStop(0, "rgba(155, 126, 255, 0.3)");
  grad.addColorStop(0.5, "rgba(100, 80, 220, 0.1)");
  grad.addColorStop(1, "rgba(0, 0, 0, 0)");
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(cx, cy, pulseR, 0, Math.PI * 2);
  ctx.fill();
}

const DRAW_FNS = {
  cosmicTunnel: drawCosmicTunnel,
  spectrumBars: drawSpectrumBars,
  energyRings: drawEnergyRings,
  waveformGlow: drawWaveformGlow,
  pulseParticles: drawPulseParticles,
};

// ═══════════════════════════════════════════════════════════════════════════════
// Component
// ═══════════════════════════════════════════════════════════════════════════════

const StageScreenVisualizer = forwardRef(function StageScreenVisualizer(_props, ref) {
  const canvasRef = useRef(null);
  const modeIdxRef = useRef(0);
  const modeTimerRef = useRef(0);
  const animRef = useRef(null);

  useImperativeHandle(ref, () => ({
    getCanvas: () => canvasRef.current,
  }));

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = CANVAS_W;
    canvas.height = CANVAS_H;

    const startTime = performance.now() * 0.001;

    const animate = () => {
      const t = (performance.now() * 0.001) - startTime;
      const modeDuration = t - modeTimerRef.current;

      // Rotate mode every MODE_DURATION seconds
      if (modeDuration >= MODE_DURATION) {
        modeIdxRef.current = (modeIdxRef.current + 1) % MODES.length;
        modeTimerRef.current = t;
      }

      const mode = MODES[modeIdxRef.current];
      const freq = generateFreqData(t);
      const drawFn = DRAW_FNS[mode];

      if (drawFn) {
        // Don't fully clear — let trails build up slightly
        drawFn(ctx, CANVAS_W, CANVAS_H, t, freq);
      }

      animRef.current = requestAnimationFrame(animate);
    };

    animRef.current = requestAnimationFrame(animate);

    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      width={CANVAS_W}
      height={CANVAS_H}
      style={{ display: "none" }}
    />
  );
});

export { MODES, MODE_DURATION, CANVAS_W, CANVAS_H };
export default StageScreenVisualizer;