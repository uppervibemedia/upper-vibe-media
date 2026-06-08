import React, { createContext, useContext, useEffect, useRef } from "react";
import { useSavedItems } from "@/hooks/useSavedItems";
import { useAuth } from "@/lib/AuthContext";

const SavedItemsContext = createContext(null);

/**
 * SavedItemsProvider — wraps the app and provides the clean save/heart system.
 *
 * - Derives stableUserId from auth ONLY after auth is fully loaded.
 * - Passes stableUserId to useSavedItems so it never fires with undefined/null.
 * - Re-fetches when app becomes visible (iOS PWA resume), debounced to 90s.
 */
export function SavedItemsProvider({ children }) {
  const { user, isLoadingAuth } = useAuth();

  // Only set userId after auth finishes loading — prevents premature empty fetch
  const stableUserId = !isLoadingAuth
    ? (user?.id || user?._id || user?.uid || null)
    : null;

  const hook = useSavedItems(stableUserId);

  // Stable refs for use in the visibility handler
  const loadRef = useRef(hook.loadItems);
  loadRef.current = hook.loadItems;
  const uidRef = useRef(stableUserId);
  uidRef.current = stableUserId;
  const lastReload = useRef(0);

  // Re-fetch on iOS tab/app resume — debounced 90s to avoid rate limits
  useEffect(() => {
    if (!stableUserId) return;
    const onVisibility = () => {
      if (document.visibilityState !== "visible") return;
      if (!uidRef.current) return;
      const now = Date.now();
      if (now - lastReload.current < 90_000) return;
      lastReload.current = now;
      console.log("[SavedItems] visibility reload triggered");
      loadRef.current(uidRef.current);
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [stableUserId]);

  return (
    <SavedItemsContext.Provider value={{ ...hook, user, isLoadingAuth }}>
      {children}
    </SavedItemsContext.Provider>
  );
}

export function useSavedItemsContext() {
  const ctx = useContext(SavedItemsContext);
  if (!ctx) throw new Error("useSavedItemsContext must be inside SavedItemsProvider");
  return ctx;
}