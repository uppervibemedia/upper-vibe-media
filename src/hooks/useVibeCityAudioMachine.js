import { useEffect, useState } from "react";
import {
  enterCityDanceFloor,
  leaveCityDanceFloor,
  enforceCityAudioState,
  preloadCityDj,
  retryCityAudioFromGesture,
  setCityDefaultTrack,
  subscribeCityAudio,
  getCityAudioDebugSnapshot,
  getCityAudioMode,
} from "@/lib/vibeCityAudioController";

export default function useVibeCityAudioMachine({ isUserInsideDanceFloor, defaultTrack, playerAudioRef, suppressExternalPlayer = true }) {
  const [debugSnapshot, setDebugSnapshot] = useState(() => getCityAudioDebugSnapshot());

  useEffect(() => {
    if (defaultTrack?.audio_url) setCityDefaultTrack(defaultTrack);
  }, [defaultTrack]);

  useEffect(() => {
    preloadCityDj();
    const refresh = setInterval(() => preloadCityDj(), 60 * 1000);
    const unsubscribe = subscribeCityAudio(setDebugSnapshot);
    return () => { clearInterval(refresh); unsubscribe(); };
  }, []);

  useEffect(() => {
    if (isUserInsideDanceFloor) enterCityDanceFloor();
    else leaveCityDanceFloor();
  }, [isUserInsideDanceFloor]);

  useEffect(() => {
    const id = setInterval(() => {
      const externalAudio = playerAudioRef?.current;
      const mode = getCityAudioMode();
      if (externalAudio && suppressExternalPlayer && (mode === "globalMusic" || mode === "leavingDanceFloor" || mode === "danceFloor" || mode === "enteringDanceFloor")) {
        try { externalAudio.pause(); } catch {}
        externalAudio.muted = true;
        externalAudio.volume = 0;
      }
      enforceCityAudioState();
    }, 120);
    return () => clearInterval(id);
  }, [playerAudioRef, suppressExternalPlayer]);

  useEffect(() => {
    const retry = () => {
      if (!suppressExternalPlayer) return;
      retryCityAudioFromGesture(defaultTrack);
    };
    window.addEventListener("touchstart", retry, { capture: true, passive: true });
    window.addEventListener("touchmove", retry, { capture: true, passive: true });
    window.addEventListener("pointerdown", retry, { capture: true, passive: true });
    window.addEventListener("click", retry, { capture: true, passive: true });
    return () => {
      window.removeEventListener("touchstart", retry, true);
      window.removeEventListener("touchmove", retry, true);
      window.removeEventListener("pointerdown", retry, true);
      window.removeEventListener("click", retry, true);
      leaveCityDanceFloor();
    };
  }, [defaultTrack, suppressExternalPlayer]);

  return {
    cityAudioMode: debugSnapshot.cityAudioMode,
    djTrack: debugSnapshot.djTrackObject || null,
    debugSnapshot: {
      ...debugSnapshot,
      isUserInsideDanceFloor,
    },
  };
}