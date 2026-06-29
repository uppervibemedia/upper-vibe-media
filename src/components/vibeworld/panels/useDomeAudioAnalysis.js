import { useEffect, useRef } from "react";
import { requestAnalyser } from "@/context/PlayerContext";
import { getAudioElement as getRadioAudioElement, getState as getRadioAudioState } from "@/lib/radioAudioManager";

const EMPTY = {
  available: false,
  frequencyData: null,
  timeDomainData: null,
  bassEnergy: 0,
  midEnergy: 0,
  trebleEnergy: 0,
  beatDetected: false,
  beatStrength: 0,
  smoothedVolume: 0,
  pulse: 0,
  audioTime: 0,
};

function averageBins(data, start, end) {
  if (!data || end <= start) return 0;
  let sum = 0;
  for (let i = start; i < end; i++) sum += data[i] || 0;
  return sum / Math.max(1, end - start) / 255;
}

export default function useDomeAudioAnalysis(open) {
  const analysisRef = useRef({ ...EMPTY });
  const analyserRef = useRef(null);
  const rafRef = useRef(null);
  const lastBassRef = useRef(0);
  const smoothedBeatRef = useRef(0);
  const smoothedVolumeRef = useRef(0);

  useEffect(() => {
    if (!open) {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      return;
    }

    let mounted = true;
    let frequencyData = null;
    let timeDomainData = null;

    const getAudio = () => {
      const radioState = getRadioAudioState?.();
      const radioAudio = getRadioAudioElement?.();
      if (radioAudio && (radioState?.activeMode === "myVibeRadio" || radioState?.currentTrack)) return radioAudio;
      return document.querySelector("audio") || radioAudio;
    };

    const connect = () => {
      const audio = getAudio();
      if (!audio) return false;
      try {
        const result = requestAnalyser(audio);
        const analyser = result?.analyser || result;
        if (!analyser) return false;
        analyserRef.current = analyser;
        frequencyData = new Uint8Array(analyser.frequencyBinCount || 1024);
        timeDomainData = new Uint8Array(analyser.fftSize || analyser.frequencyBinCount || 1024);
        return true;
      } catch {
        return false;
      }
    };

    const updateFallback = (audio) => {
      const t = audio?.currentTime || performance.now() * 0.001;
      const tempoPulse = Math.max(0, Math.sin(t * Math.PI * 2 * 1.35));
      const softPulse = Math.pow(tempoPulse, 3) * 0.42;
      smoothedBeatRef.current += (softPulse - smoothedBeatRef.current) * 0.12;
      analysisRef.current = {
        ...EMPTY,
        pulse: smoothedBeatRef.current,
        beatStrength: smoothedBeatRef.current,
        smoothedVolume: smoothedBeatRef.current * 0.45,
        bassEnergy: smoothedBeatRef.current * 0.55,
        audioTime: t,
      };
    };

    const loop = () => {
      if (!mounted) return;
      const audio = getAudio();
      const analyser = analyserRef.current;

      if (!analyser && !connect()) {
        updateFallback(audio);
        rafRef.current = requestAnimationFrame(loop);
        return;
      }

      try {
        analyserRef.current.getByteFrequencyData(frequencyData);
        analyserRef.current.getByteTimeDomainData?.(timeDomainData);

        const len = frequencyData.length;
        const bassEnd = Math.max(4, Math.floor(len * 0.1));
        const midEnd = Math.max(bassEnd + 1, Math.floor(len * 0.42));
        const bassEnergy = averageBins(frequencyData, 0, bassEnd);
        const midEnergy = averageBins(frequencyData, bassEnd, midEnd);
        const trebleEnergy = averageBins(frequencyData, midEnd, len);
        const volume = bassEnergy * 0.52 + midEnergy * 0.32 + trebleEnergy * 0.16;
        const bassRise = Math.max(0, bassEnergy - lastBassRef.current);
        const rawBeat = bassRise > 0.045 && bassEnergy > 0.16 ? Math.min(1, bassRise * 7 + bassEnergy * 0.45) : 0;

        smoothedBeatRef.current = Math.max(rawBeat, smoothedBeatRef.current * 0.88);
        smoothedVolumeRef.current += (volume - smoothedVolumeRef.current) * 0.18;
        lastBassRef.current = bassEnergy;

        analysisRef.current = {
          available: true,
          frequencyData,
          timeDomainData,
          bassEnergy,
          midEnergy,
          trebleEnergy,
          beatDetected: rawBeat > 0.1,
          beatStrength: smoothedBeatRef.current,
          smoothedVolume: smoothedVolumeRef.current,
          pulse: Math.max(smoothedBeatRef.current, smoothedVolumeRef.current * 0.35),
          audioTime: audio?.currentTime || performance.now() * 0.001,
        };
      } catch {
        analyserRef.current = null;
        updateFallback(audio);
      }

      rafRef.current = requestAnimationFrame(loop);
    };

    connect();
    loop();

    const unlock = () => { connect(); };
    window.addEventListener("pointerdown", unlock, { passive: true });
    window.addEventListener("touchend", unlock, { passive: true });
    window.addEventListener("click", unlock, { passive: true });
    getAudio()?.addEventListener?.("play", unlock);

    return () => {
      mounted = false;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("touchend", unlock);
      window.removeEventListener("click", unlock);
      getAudio()?.removeEventListener?.("play", unlock);
    };
  }, [open]);

  return analysisRef;
}