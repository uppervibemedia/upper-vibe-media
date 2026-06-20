import React, { useEffect, useRef, useImperativeHandle, forwardRef } from "react";

/**
 * StageScreenVisualizer — shared/public rotating visualizer for the Main Music Stage.
 *
 * Rules:
 *  - Always-on, non-stop — renders every frame regardless of user state
 *  - Rotates through 5 modes every ~90 seconds
 *  - Bold, bright, concert-stage aesthetic
 *  - Dark background + vibrant neon visuals
 *  - Uses procedurally generated frequency data (not user-specific audio)
 */

const MODES = ["spectrumBars", "energyRings", "cosmicTunnel", "waveformGlow", "pulseParticles"];
const MODE_DURATION = 90; // seconds per mode

const CANVAS_W = 1024;
const CANVAS_H = 512;

// ── Procedural "frequency-like" data ──
function generateFreqData(t) {
  const count = 64;
  const arr = new Uint8Array(count);
  for (let i = 0; i < count; i++) {
    const norm = i / count;
    const bass = (1 - norm) * (Math.sin(t * 1.4) * 0.4 + 0.6);
    const mid = Math.sin(norm * 6 + t * 0.7) * 0.3 * (1 - Math.abs(norm - 0.5) * 2);
    const high = Math.sin(norm * 14 + t * 1.1) * 0.15 * norm;
    const beat = Math.pow(Math.abs(Math.sin(t * 2.1)), 3) * 0.35;
    arr[i] = Math.max(0, Math.min(255, (bass + mid + high + beat) * 255));
  }
  return arr;
}

// ── DRAWING MODES ──────────────────────────────────────────────────────────

function drawSolidBg(ctx, w, h) {
  ctx.fillStyle = "#080818";
  ctx.fillRect(0, 0, w, h);
}

function drawSpectrumBars(ctx, w, h, t, freq) {
  drawSolidBg(ctx, w, h);
  const barCount = 64;
  const barW = w / barCount;
  const baseY = h * 0.88;

  // Mirror bars: center out
  const halfCount = barCount / 2;

  for (let i = 0; i < halfCount; i++) {
    const fi = Math.floor((i / halfCount) * 63);
    const val = freq[fi] / 255;
    const barH = val * h * 0.7;

    // Left side
    const xL = (halfCount - 1 - i) * barW;
    const hue = 260 + (i / halfCount) * 40;
    const gradL = ctx.createLinearGradient(xL, baseY - barH, xL, baseY);
    gradL.addColorStop(0, `hsl(${hue}, 90%, 65%)`);
    gradL.addColorStop(0.4, `hsl(${hue}, 80%, 50%)`);
    gradL.addColorStop(1, `hsla(${hue}, 60%, 25%, 0.4)`);
    ctx.fillStyle = gradL;
    ctx.fillRect(xL + 1, baseY - barH, barW - 2, barH);

    // Right side (mirrored)
    const xR = (halfCount + i) * barW;
    const gradR = ctx.createLinearGradient(xR, baseY - barH, xR, baseY);
    gradR.addColorStop(0, `hsl(${hue}, 90%, 65%)`);
    gradR.addColorStop(0.4, `hsl(${hue}, 80%, 50%)`);
    gradR.addColorStop(1, `hsla(${hue}, 60%, 25%, 0.4)`);
    ctx.fillStyle = gradR;
    ctx.fillRect(xR + 1, baseY - barH, barW - 2, barH);

    // Top glow dot
    const topGlow = ctx.createRadialGradient(xL + barW / 2, baseY - barH, 0, xL + barW / 2, baseY - barH, barW);
    topGlow.addColorStop(0, `hsla(${hue}, 100%, 80%, 0.7)`);
    topGlow.addColorStop(1, "transparent");
    ctx.fillStyle = topGlow;
    ctx.fillRect(xL - barW / 2, baseY - barH - barW, barW * 2, barW * 2);
  }

  // Beats: flash overlay on strong beats
  const beatVal = freq[0] / 255;
  if (beatVal > 0.7) {
    ctx.fillStyle = `rgba(155, 126, 255, ${(beatVal - 0.7) * 0.15})`;
    ctx.fillRect(0, 0, w, h);
  }
}

function drawEnergyRings(ctx, w, h, t, freq) {
  drawSolidBg(ctx, w, h);
  const cx = w / 2, cy = h / 2;

  for (let ring = 5; ring >= 0; ring--) {
    const baseR = 40 + ring * 70;
    const bassVal = freq[ring * 10] / 255;
    const r = baseR + bassVal * 40;
    const spin = t * (0.5 + ring * 0.2);

    // Glow ring (outer)
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.strokeStyle = `hsla(${280 - ring * 20}, 70%, 55%, ${0.08 + bassVal * 0.1})`;
    ctx.lineWidth = 12 + bassVal * 6;
    ctx.stroke();

    // Main ring
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.strokeStyle = `hsla(${280 - ring * 20}, 80%, 60%, ${0.55 + bassVal * 0.3})`;
    ctx.lineWidth = 2 + bassVal * 3;
    ctx.stroke();

    // Orbiting light
    const dotX = cx + Math.cos(spin) * r;
    const dotY = cy + Math.sin(spin) * r;
    const dotGrad = ctx.createRadialGradient(dotX, dotY, 0, dotX, dotY, 8 + bassVal * 6);
    dotGrad.addColorStop(0, `rgba(200, 170, 255, ${0.8 + bassVal * 0.2})`);
    dotGrad.addColorStop(0.3, `rgba(155, 126, 255, 0.4)`);
    dotGrad.addColorStop(1, "transparent");
    ctx.fillStyle = dotGrad;
    ctx.beginPath();
    ctx.arc(dotX, dotY, 8 + bassVal * 6, 0, Math.PI * 2);
    ctx.fill();
  }

  // Center pulse
  const bassAvg = freq.slice(0, 6).reduce((a, b) => a + b, 0) / (6 * 255);
  const pulseR = 20 + bassAvg * 40;
  const centerGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, pulseR);
  centerGrad.addColorStop(0, "rgba(180, 150, 255, 0.4)");
  centerGrad.addColorStop(0.5, "rgba(120, 90, 220, 0.15)");
  centerGrad.addColorStop(1, "transparent");
  ctx.fillStyle = centerGrad;
  ctx.beginPath();
  ctx.arc(cx, cy, pulseR, 0, Math.PI * 2);
  ctx.fill();
}

function drawCosmicTunnel(ctx, w, h, t, freq) {
  drawSolidBg(ctx, w, h);
  const cx = w / 2, cy = h / 2;

  for (let i = 14; i >= 0; i--) {
    const ratio = i / 14;
    const r = Math.min(w, h) * 0.65 * (1 - ratio * 0.8);
    const pulse = Math.sin(t * 1.5 + i * 0.45) * 0.15 + 0.85;
    const spin = t * 0.35 + i * 0.35;
    const segments = 80;
    const freqIdx = Math.floor((i / 14) * 63);

    ctx.beginPath();
    for (let s = 0; s <= segments; s++) {
      const a = (s / segments) * Math.PI * 2 + spin;
      const rr = r * pulse + (freq[freqIdx] / 255) * r * 0.22;
      const sx = cx + Math.cos(a) * rr;
      const sy = cy + Math.sin(a) * rr * 0.5;
      if (s === 0) ctx.moveTo(sx, sy);
      else ctx.lineTo(sx, sy);
    }
    ctx.closePath();

    const hue = 250 + i * 18;
    ctx.strokeStyle = `hsla(${hue}, 75%, ${45 + ratio * 30}%, ${0.4 + ratio * 0.4})`;
    ctx.lineWidth = 2 + ratio * 2.5;
    ctx.stroke();
  }
}

function drawWaveformGlow(ctx, w, h, t, freq) {
  drawSolidBg(ctx, w, h);
  const cy = h / 2;

  // 4 layered waveforms with glow
  for (let layer = 0; layer < 4; layer++) {
    const amp = h * (0.18 + layer * 0.12);
    const speed = 0.5 + layer * 0.25;
    const phase = t * speed;

    // Glow layer (wider, more transparent)
    ctx.beginPath();
    for (let x = 0; x <= w; x += 3) {
      const norm = x / w;
      const fi = Math.floor(norm * 63);
      const freqVal = freq[fi] / 255;
      const wave1 = Math.sin(norm * 6 + phase) * amp * freqVal;
      const wave2 = Math.sin(norm * 2.5 + phase * 0.6) * amp * 0.5;
      const wave3 = Math.sin(norm * 12 + phase * 1.2) * amp * 0.2 * freqVal;
      const y = cy + wave1 + wave2 + wave3;
      if (x === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    const hue = 240 + layer * 22;
    ctx.strokeStyle = `hsla(${hue}, 70%, 55%, 0.12)`;
    ctx.lineWidth = 6 + layer;
    ctx.stroke();

    // Main line layer
    ctx.beginPath();
    for (let x = 0; x <= w; x += 3) {
      const norm = x / w;
      const fi = Math.floor(norm * 63);
      const freqVal = freq[fi] / 255;
      const wave1 = Math.sin(norm * 6 + phase) * amp * freqVal;
      const wave2 = Math.sin(norm * 2.5 + phase * 0.6) * amp * 0.5;
      const y = cy + wave1 + wave2;
      if (x === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.strokeStyle = `hsla(${hue}, 85%, ${60 + layer * 8}%, 0.7)`;
    ctx.lineWidth = 1.5 + layer * 0.3;
    ctx.stroke();
  }
}

function drawPulseParticles(ctx, w, h, t, freq) {
  drawSolidBg(ctx, w, h);
  const cx = w / 2, cy = h / 2;

  // Stars/particles orbiting center
  for (let i = 0; i < 50; i++) {
    const angle = (i / 50) * Math.PI * 2 + t * 0.2;
    const fi = Math.floor((i / 50) * 63);
    const val = freq[fi] / 255;
    const dist = 70 + val * 100 + Math.sin(t * 0.9 + i * 0.4) * 25;
    const px = cx + Math.cos(angle) * dist;
    const py = cy + Math.sin(angle) * dist * 0.55;

    const hue = 260 + i * 3;
    const size = 2 + val * 4;
    const dotGrad = ctx.createRadialGradient(px, py, 0, px, py, size + 3);
    dotGrad.addColorStop(0, `hsla(${hue}, 100%, 80%, 0.9)`);
    dotGrad.addColorStop(0.5, `hsla(${hue}, 80%, 60%, 0.3)`);
    dotGrad.addColorStop(1, "transparent");
    ctx.fillStyle = dotGrad;
    ctx.beginPath();
    ctx.arc(px, py, size + 3, 0, Math.PI * 2);
    ctx.fill();
  }

  // Center pulsing orb
  const bassAvg = freq.slice(0, 6).reduce((a, b) => a + b, 0) / (6 * 255);
  const orbR = 25 + bassAvg * 35;
  const orbGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, orbR);
  orbGrad.addColorStop(0, "rgba(200, 170, 255, 0.5)");
  orbGrad.addColorStop(0.3, "rgba(140, 110, 240, 0.25)");
  orbGrad.addColorStop(0.7, "rgba(80, 60, 180, 0.05)");
  orbGrad.addColorStop(1, "transparent");
  ctx.fillStyle = orbGrad;
  ctx.beginPath();
  ctx.arc(cx, cy, orbR, 0, Math.PI * 2);
  ctx.fill();

  // Beat flash
  const beatVal = freq[0] / 255;
  if (beatVal > 0.75) {
    ctx.fillStyle = `rgba(180, 150, 255, ${(beatVal - 0.75) * 0.2})`;
    ctx.fillRect(0, 0, w, h);
  }
}

const DRAW_FNS = {
  spectrumBars: drawSpectrumBars,
  energyRings: drawEnergyRings,
  cosmicTunnel: drawCosmicTunnel,
  waveformGlow: drawWaveformGlow,
  pulseParticles: drawPulseParticles,
};

// ═══════════════════════════════════════════════════════════════════════════════
// Component — owns a persistent canvas and animation loop
// ═══════════════════════════════════════════════════════════════════════════════

const StageScreenVisualizer = forwardRef(function StageScreenVisualizer({ onReady }, ref) {
  const canvasRef = useRef(null);
  const modeIdxRef = useRef(0);
  const modeTimerRef = useRef(0);
  const animRef = useRef(null);
  const startedRef = useRef(false);

  // Expose the canvas to parent for Three.js texture creation
  useImperativeHandle(ref, () => ({
    getCanvas: () => canvasRef.current,
  }), []);

  useEffect(() => {
    // Prevent double-init in Strict Mode
    if (startedRef.current) return;
    startedRef.current = true;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = CANVAS_W;
    canvas.height = CANVAS_H;

    // Draw initial frame immediately (solid bg + first mode)
    drawSolidBg(ctx, CANVAS_W, CANVAS_H);

    // Notify parent that canvas is ready for Three.js texture
    if (onReady) onReady(canvas);

    const startTime = performance.now() * 0.001;
    let frameCount = 0;

    const animate = () => {
      const t = (performance.now() * 0.001) - startTime;
      const modeDuration = t - modeTimerRef.current;

      if (modeDuration >= MODE_DURATION) {
        modeIdxRef.current = (modeIdxRef.current + 1) % MODES.length;
        modeTimerRef.current = t;
      }

      const mode = MODES[modeIdxRef.current];
      const freq = generateFreqData(t);
      const drawFn = DRAW_FNS[mode];

      if (drawFn) {
        drawFn(ctx, CANVAS_W, CANVAS_H, t, freq);
      }

      // Mode label in corner (subtle)
      ctx.font = "12px 'Inter', sans-serif";
      ctx.fillStyle = "rgba(255,255,255,0.15)";
      ctx.textAlign = "right";
      ctx.fillText(`UPPER VIBE MEDIA`, CANVAS_W - 20, 30);

      frameCount++;
      animRef.current = requestAnimationFrame(animate);
    };

    animRef.current = requestAnimationFrame(animate);

    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
      startedRef.current = false;
    };
  }, []);

  // Keep canvas off-screen but in DOM — browsers render to it fine
  return (
    <canvas
      ref={canvasRef}
      width={CANVAS_W}
      height={CANVAS_H}
      style={{
        position: "fixed",
        left: "-9999px",
        top: 0,
        pointerEvents: "none",
        opacity: 0,
      }}
    />
  );
});

export { MODES, MODE_DURATION, CANVAS_W, CANVAS_H };
export default StageScreenVisualizer;