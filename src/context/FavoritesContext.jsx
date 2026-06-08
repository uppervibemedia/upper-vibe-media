import React, { createContext, useContext } from "react";
import { useFavorites } from "@/hooks/useFavorite";
import { useAuth } from "@/lib/AuthContext";

const FavoritesContext = createContext(null);

export function FavoritesProvider({ children }) {
  const { user } = useAuth();
  const favoritesHook = useFavorites(user?.email);
  return (
    <FavoritesContext.Provider value={{ ...favoritesHook, user }}>
      {children}
    </FavoritesContext.Provider>
  );
}

export function useFavoritesContext() {
  const ctx = useContext(FavoritesContext);
  if (!ctx) throw new Error("useFavoritesContext must be used inside FavoritesProvider");
  return ctx;
}