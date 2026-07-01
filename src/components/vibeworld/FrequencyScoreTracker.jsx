import React, { useEffect, useRef } from "react";
import { awardFrequencyScore } from "@/lib/frequencyScoreService";

export default function FrequencyScoreTracker({ user }) {
  const userRef = useRef(user);
  userRef.current = user;

  useEffect(() => {
    const handleScore = (event) => {
      const detail = event.detail || {};
      if (!detail.action) return;
      awardFrequencyScore(userRef.current, detail.action, detail).catch(() => {});
    };
    const handleDailyAction = (event) => {
      const detail = event.detail || {};
      if (["sacred_symbol_activated", "beach_visit", "vibecheck"].includes(detail.action)) {
        awardFrequencyScore(userRef.current, detail.action, detail).catch(() => {});
      }
    };
    window.addEventListener("uvcFrequencyScoreAction", handleScore);
    window.addEventListener("uvcDailyAction", handleDailyAction);
    return () => {
      window.removeEventListener("uvcFrequencyScoreAction", handleScore);
      window.removeEventListener("uvcDailyAction", handleDailyAction);
    };
  }, []);

  return null;
}