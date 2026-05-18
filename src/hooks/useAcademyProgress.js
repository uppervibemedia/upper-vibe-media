import { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";

export function useAcademyProgress(userEmail) {
  const [progressMap, setProgressMap] = useState({}); // lessonId -> status

  const load = useCallback(async () => {
    if (!userEmail) return;
    const records = await base44.entities.AcademyProgress.filter({ user_email: userEmail });
    const map = {};
    records.forEach((r) => { map[r.lesson_id] = r; });
    setProgressMap(map);
  }, [userEmail]);

  useEffect(() => { load(); }, [load]);

  const markStarted = useCallback(async (lessonId) => {
    if (!userEmail || progressMap[lessonId]) return; // already tracked
    await base44.entities.AcademyProgress.create({
      user_email: userEmail,
      lesson_id: lessonId,
      status: "started",
    });
    setProgressMap((prev) => ({ ...prev, [lessonId]: { status: "started" } }));
  }, [userEmail, progressMap]);

  const markCompleted = useCallback(async (lessonId) => {
    if (!userEmail) return;
    const existing = progressMap[lessonId];
    if (existing?.id) {
      await base44.entities.AcademyProgress.update(existing.id, {
        status: "completed",
        completed_at: new Date().toISOString(),
      });
    } else {
      await base44.entities.AcademyProgress.create({
        user_email: userEmail,
        lesson_id: lessonId,
        status: "completed",
        completed_at: new Date().toISOString(),
      });
    }
    setProgressMap((prev) => ({
      ...prev,
      [lessonId]: { ...(prev[lessonId] || {}), status: "completed" },
    }));
  }, [userEmail, progressMap]);

  const getStatus = (lessonId) => progressMap[lessonId]?.status || null;

  const stats = {
    total: Object.keys(progressMap).length,
    completed: Object.values(progressMap).filter((r) => r.status === "completed").length,
  };

  return { progressMap, getStatus, markStarted, markCompleted, stats, reload: load };
}