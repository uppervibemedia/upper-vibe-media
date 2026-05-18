import React, { useEffect, useRef, useCallback } from "react";

/**
 * Reactive audio visualizer — taps into the global AudioPlayer's <audio> element
 * via the audioRef passed from PlayerContext.
 *
 * Renders on a canvas with:
 *  - Circular spectrum ring
 *  - Reactive waveform bars
 *  - Floating particles driven by bass energy
 *  - Glow pulse on bass hits
 */

const COLORS = {
  bass:   "#00D4EE",   // cyan
  mid:    "#7B2FFF",   // purple
  high:   "#D4A843",   // gold
  particle: ["#00D4EE", "#7B2FFF", "#D4A843", "#00FFB2"],
};

class Particle {
  constructor(cx, cy) {
    this.reset(cx, cy);
  }
  reset(cx, cy) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 0.3 + Math.random() * 1.2;
    this.x = cx;
    this.y = cy;
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    this.life = 1;
    this.decay = 0.008 + Math.random() * 0.012;
    this.size = 1.5 + Math.random() * 2.5;
    this.color = COLORS.particle[Math.floor(Math.random() * COLORS.particle.length)];
  }
  update() {
    this.x += this.vx;
    this.y += this.vy;
    this.vx *= 0.99;
    this.vy *= 0.99;
    this.life -= this.decay;
  }
  draw(ctx) {
    ctx.save();
    ctx.globalAlpha = Math.max(0, this.life) * 0.7;
    ctx.fillStyle = this.color;
    ctx.shadowColor = this.color;
    ctx.shadowBlur = 6;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

export default function AudioVisualizer({ audioRef, isPlaying }) {
  const canvasRef = useRef(null);
  const animFrameRef = useRef(null);
  const analyserRef = useRef(null);
  const sourceRef = useRef(null);
  const audioCtxRef = useRef(null);
  const particlesRef = useRef([]);
  const bassEnergyRef = useRef(0);

  const MAX_PARTICLES = 60;

  // Setup Web Audio API analyser once
  const setupAnalyser = useCallback(() => {
    const audio = audioRef?.current;
    if (!audio || analyserRef.current) return;

    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === "suspended") ctx.resume();

      // Avoid double-connecting
      if (!sourceRef.current) {
        sourceRef.current = ctx.createMediaElementSource(audio);
      }

      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.8;

      sourceRef.current.connect(analyser);
      analyser.connect(ctx.destination);
      analyserRef.current = analyser;
    } catch (e) {
      // CORS or already connected — visualizer won't be frequency-reactive
      analyserRef.current = null;
    }
  }, [audioRef]);

  // Draw loop
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    const W = canvas.width;
    const H = canvas.height;
    const cx = W / 2;
    const cy = H / 2;

    // Clear with fade trail
    ctx.fillStyle = "rgba(4,4,14,0.18)";
    ctx.fillRect(0, 0, W, H);

    const analyser = analyserRef.current;
    let freqData = null;
    let bassEnergy = 0;
    let midEnergy = 0;
    let highEnergy = 0;

    if (analyser && isPlaying) {
      freqData = new Uint8Array(analyser.frequencyBinCount);
      analyser.getByteFrequencyData(freqData);

      const binCount = freqData.length;
      const bassEnd = Math.floor(binCount * 0.1);
      const midEnd = Math.floor(binCount * 0.4);

      for (let i = 0; i < bassEnd; i++) bassEnergy += freqData[i];
      bassEnergy /= (bassEnd * 255);

      for (let i = bassEnd; i < midEnd; i++) midEnergy += freqData[i];
      midEnergy /= ((midEnd - bassEnd) * 255);

      for (let i = midEnd; i < binCount; i++) highEnergy += freqData[i];
      highEnergy /= ((binCount - midEnd) * 255);
    } else {
      // Idle animation
      const t = Date.now() / 1000;
      bassEnergy = 0.04 + 0.02 * Math.sin(t * 0.7);
      midEnergy  = 0.03 + 0.015 * Math.sin(t * 1.1 + 1);
      highEnergy = 0.02 + 0.01  * Math.sin(t * 1.7 + 2);
    }

    // Smooth bass
    bassEnergyRef.current += (bassEnergy - bassEnergyRef.current) * 0.15;
    const bass = bassEnergyRef.current;

    // ── Ambient glow on bass hit ──
    if (bass > 0.15) {
      const glowRadius = 120 + bass * 180;
      const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, glowRadius);
      grad.addColorStop(0, `rgba(0,212,238,${bass * 0.12})`);
      grad.addColorStop(0.5, `rgba(123,47,255,${bass * 0.04})`);
      grad.addColorStop(1, "transparent");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, W, H);
    }

    // ── Circular spectrum ring ──
    const ringRadius = Math.min(cx, cy) * 0.52;
    const barCount = freqData ? Math.min(freqData.length, 80) : 80;
    const angleStep = (Math.PI * 2) / barCount;

    for (let i = 0; i < barCount; i++) {
      const raw = freqData ? freqData[i] / 255 : (isPlaying ? 0 : 0.04 + 0.01 * Math.sin(Date.now() / 500 + i));
      const barH = raw * ringRadius * 0.75;
      const angle = i * angleStep - Math.PI / 2;
      const innerX = cx + Math.cos(angle) * ringRadius;
      const innerY = cy + Math.sin(angle) * ringRadius;
      const outerX = cx + Math.cos(angle) * (ringRadius + barH);
      const outerY = cy + Math.sin(angle) * (ringRadius + barH);

      // Color: bass=cyan, mid=purple, high=gold
      const t = i / barCount;
      let color;
      if (t < 0.1) color = COLORS.bass;
      else if (t < 0.4) color = COLORS.mid;
      else color = COLORS.high;

      ctx.strokeStyle = color;
      ctx.lineWidth = 2.5;
      ctx.shadowColor = color;
      ctx.shadowBlur = 8 + raw * 12;
      ctx.globalAlpha = 0.5 + raw * 0.5;
      ctx.beginPath();
      ctx.moveTo(innerX, innerY);
      ctx.lineTo(outerX, outerY);
      ctx.stroke();
    }
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;

    // ── Inner ring glow ──
    const ringGlow = ctx.createRadialGradient(cx, cy, ringRadius - 4, cx, cy, ringRadius + 4);
    ringGlow.addColorStop(0, `rgba(0,212,238,${0.08 + bass * 0.15})`);
    ringGlow.addColorStop(1, "transparent");
    ctx.fillStyle = ringGlow;
    ctx.beginPath();
    ctx.arc(cx, cy, ringRadius + 4, 0, Math.PI * 2);
    ctx.fill();

    // ── Waveform bars (bottom strip) ──
    if (freqData) {
      const barW = W / freqData.length * 1.5;
      const stripH = H * 0.18;
      const stripY = H - stripH - 4;
      for (let i = 0; i < freqData.length; i++) {
        const v = freqData[i] / 255;
        const bh = v * stripH;
        const t = i / freqData.length;
        const r = t < 0.3 ? 0 : t < 0.7 ? 123 : 212;
        const g = t < 0.3 ? 212 : t < 0.7 ? 47 : 168;
        const b = t < 0.3 ? 238 : t < 0.7 ? 255 : 67;
        ctx.globalAlpha = 0.35 + v * 0.5;
        ctx.fillStyle = `rgb(${r},${g},${b})`;
        ctx.shadowColor = `rgb(${r},${g},${b})`;
        ctx.shadowBlur = 4;
        ctx.fillRect(i * (W / freqData.length), stripY + (stripH - bh), barW * 0.7, bh);
      }
      ctx.shadowBlur = 0;
      ctx.globalAlpha = 1;
    }

    // ── Spawn particles on bass hit ──
    if (bass > 0.2 && isPlaying) {
      const count = Math.floor(bass * 5);
      for (let i = 0; i < count; i++) {
        if (particlesRef.current.length < MAX_PARTICLES) {
          particlesRef.current.push(new Particle(cx, cy));
        }
      }
    }

    // ── Draw + update particles ──
    particlesRef.current = particlesRef.current.filter((p) => p.life > 0);
    particlesRef.current.forEach((p) => { p.update(); p.draw(ctx); });

    animFrameRef.current = requestAnimationFrame(draw);
  }, [isPlaying]);

  // Start/stop loop
  useEffect(() => {
    if (isPlaying) {
      setupAnalyser();
      if (audioCtxRef.current?.state === "suspended") audioCtxRef.current.resume();
    }
    animFrameRef.current = requestAnimationFrame(draw);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isPlaying, draw, setupAnalyser]);

  // Resize canvas to match container
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const observer = new ResizeObserver(() => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    });
    observer.observe(canvas);
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
    return () => observer.disconnect();
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-full"
      style={{ display: "block" }}
    />
  );
}