import { useEffect, useRef } from "react";
import { getOrCreateAudioContext } from "../../lib/audioContext";

export default function AudioVisualizer({ audioRef, isPlaying }) {
  const canvasRef = useRef(null);
  const analyserRef = useRef(null);
  const animFrameRef = useRef(null);

  // Set up analyser once, attach to the global audio graph
  useEffect(() => {
    const audio = audioRef?.current;
    if (!audio) return;

    const { audioCtx, sourceNode } = getOrCreateAudioContext(audio);
    if (!audioCtx || !sourceNode) return;

    const analyser = audioCtx.createAnalyser();
    analyser.fftSize = 256;
    sourceNode.connect(analyser);
    analyserRef.current = analyser;

    return () => {
      try { sourceNode.disconnect(analyser); } catch {}
      analyserRef.current = null;
    };
  }, [audioRef]);

  // Draw loop
  useEffect(() => {
    const canvas = canvasRef.current;
    const analyser = analyserRef.current;
    if (!canvas || !analyser) return;

    const ctx = canvas.getContext("2d");
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      animFrameRef.current = requestAnimationFrame(draw);
      analyser.getByteFrequencyData(dataArray);

      const { width, height } = canvas;
      ctx.clearRect(0, 0, width, height);

      const barWidth = (width / bufferLength) * 2.5;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        const v = dataArray[i] / 255;
        const barHeight = v * height * 0.75;

        const alpha = isPlaying ? 0.55 + v * 0.45 : 0.18;
        ctx.fillStyle = `rgba(0,212,238,${alpha})`;
        ctx.fillRect(x, height - barHeight, barWidth - 1, barHeight);
        x += barWidth;
      }
    };

    draw();
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [isPlaying, analyserRef.current]);

  return (
    <canvas
      ref={canvasRef}
      width={600}
      height={200}
      className="w-full h-full"
      style={{ display: "block" }}
    />
  );
}