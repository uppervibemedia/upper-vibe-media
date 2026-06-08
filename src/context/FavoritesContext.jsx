import React, { createContext, useContext, useEffect } from "react";
import { useFavorites } from "@/hooks/useFavorite";
import { useAuth } from "@/lib/AuthContext";

const FavoritesContext = createContext(null);

export function FavoritesProvider({ children }) {
  const { user, isLoadingAuth } = useAuth();
  const favoritesHook = useFavorites(user?.email);

  // On iOS/PWA: when the app tab becomes visible again, re-fetch favorites
  // to catch any changes made in other tabs or after a PWA resume.
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === "visible" && user?.email) {
        favoritesHook.reload(user.email);
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, [user?.email]); // eslint-disable-line react-hooks/exhaustive-deps

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