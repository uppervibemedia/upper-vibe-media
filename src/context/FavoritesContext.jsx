import React, { createContext, useContext, useEffect } from "react";
import { useFavorites } from "@/hooks/useFavorite";
import { useAuth } from "@/lib/AuthContext";

const FavoritesContext = createContext(null);

export function FavoritesProvider({ children }) {
  const { user, isLoadingAuth } = useAuth();

  // Stable user ID — primary key for favorites.
  // Email is passed as supplementary for DB record backwards-compat only.
  // Do NOT call useFavorites with undefined while auth is still loading —
  // instead pass null so the hook initializes as "logged out" (empty, loaded=true)
  // and won't trigger a DB fetch. The real fetch fires once isLoadingAuth=false and userId exists.
  const stableUserId = !isLoadingAuth ? (user?.id || user?._id || user?.uid || null) : null;
  const userEmail = user?.email || null;

  const favoritesHook = useFavorites(stableUserId, userEmail);

  // On iOS/PWA: re-fetch when tab becomes visible again (handles PWA resume / tab switch)
  useEffect(() => {
    if (!stableUserId) return;
    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        favoritesHook.reload(stableUserId);
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, [stableUserId]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <FavoritesContext.Provider value={{ ...favoritesHook, user, isLoadingAuth }}>
      {children}
    </FavoritesContext.Provider>
  );
}

export function useFavoritesContext() {
  const ctx = useContext(FavoritesContext);
  if (!ctx) throw new Error("useFavoritesContext must be used inside FavoritesProvider");
  return ctx;
}