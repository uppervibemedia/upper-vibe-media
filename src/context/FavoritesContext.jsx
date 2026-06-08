import React, { createContext, useContext, useEffect, useRef } from "react";
import { useFavorites } from "@/hooks/useFavorite";
import { useAuth } from "@/lib/AuthContext";

const FavoritesContext = createContext(null);

export function FavoritesProvider({ children }) {
  const { user, isLoadingAuth } = useAuth();

  // Stable user ID — primary key. Null while auth is loading so useFavorites
  // does not fire a premature empty fetch.
  const stableUserId = !isLoadingAuth ? (user?.id || user?._id || user?.uid || null) : null;
  const userEmail = user?.email || null;

  const favoritesHook = useFavorites(stableUserId, userEmail);

  console.log("[FavoritesContext]", { isLoadingAuth, stableUserId, userEmail, favLoaded: favoritesHook.loaded, favCount: favoritesHook.favorites.length });

  // On iOS/PWA: re-fetch when tab becomes visible again (handles PWA resume / tab switch)
  // Use a ref to keep the reload reference stable
  const reloadRef = useRef(favoritesHook.reload);
  reloadRef.current = favoritesHook.reload;
  const stableUserIdRef = useRef(stableUserId);
  stableUserIdRef.current = stableUserId;

  useEffect(() => {
    if (!stableUserId) return;
    const handleVisibility = () => {
      if (document.visibilityState === "visible" && stableUserIdRef.current) {
        reloadRef.current(stableUserIdRef.current);
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, [stableUserId]);

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