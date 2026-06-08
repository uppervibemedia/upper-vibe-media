import React, { createContext, useState, useContext, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { appParams } from '@/lib/app-params';
import { createAxiosClient } from '@base44/sdk/dist/utils/axios-client';
import {
  isSafeRoute,
  defaultRouteForUser,
  clearAllStoredRedirects,
  sanitizePlatformFromUrl,
} from '@/lib/safeRedirect';

// ── Fresh-login detection ──────────────────────────────────────────────────
// app-params.js strips access_token from the URL synchronously at import time.
// We use two signals to detect a fresh login:
// 1. appParams.token exists (a token was just passed in the URL or stored)
// 2. The platform sets a session flag we can check
// We also mark a flag in sessionStorage immediately when the token is consumed.
const IS_FRESH_LOGIN = (() => {
  try {
    // Signal 1: access_token was in the URL at page load (before app-params stripped it)
    // app-params stores it in localStorage as base44_access_token — if the in-memory
    // appParams.token is present it means it came from the URL *this* page load.
    // Signal 2: check if this is a brand-new session (sessionStorage is empty = new tab/load)
    const alreadyHandled = sessionStorage.getItem('uvm_login_handled');
    if (alreadyHandled) return false;
    // If appParams.token is present, the SDK just received a fresh token
    return !!appParams.token;
  } catch { return false; }
})();

// Mark immediately so we only run fresh-login logic once per page load
if (IS_FRESH_LOGIN) {
  try { sessionStorage.setItem('uvm_login_handled', '1'); } catch {}
}

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isLoadingPublicSettings, setIsLoadingPublicSettings] = useState(true);
  const [authError, setAuthError] = useState(null);
  const [appPublicSettings, setAppPublicSettings] = useState(null);
  const [sessionLostError, setSessionLostError] = useState(false);

  useEffect(() => {
    // Sanitize any bad from_url BEFORE auth check so the platform can't use it
    sanitizePlatformFromUrl();
    checkAppState();
  }, []);

  // Re-check auth when tab becomes visible (catches Safari ITP & PWA storage clears)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible" && isAuthenticated) {
        base44.auth.me()
          .then(() => { setSessionLostError(false); })
          .catch(() => {
            setIsAuthenticated(false);
            setUser(null);
            setSessionLostError(true);
            setAuthError({ type: 'session_expired', message: 'Your session expired. Please log in again.' });
          });
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [isAuthenticated]);

  const checkAppState = async () => {
    try {
      setIsLoadingPublicSettings(true);
      setAuthError(null);

      const appClient = createAxiosClient({
        baseURL: `/api/apps/public`,
        headers: { 'X-App-Id': appParams.appId },
        token: appParams.token,
        interceptResponses: true
      });

      try {
        const publicSettings = await appClient.get(`/prod/public-settings/by-id/${appParams.appId}`);
        setAppPublicSettings(publicSettings);

        // Check if a stored token exists (from localStorage, where the SDK persists it).
        // appParams.token already reads from localStorage via getAppParamValue, so if it's
        // present the user is logged in (or was on a previous visit). Only call me() when
        // there's a token to avoid unnecessary API calls for anonymous visitors.
        const storedToken = (() => { try { return localStorage.getItem('base44_access_token'); } catch { return null; } })();
        if (appParams.token || storedToken) {
          await checkUserAuth();
        } else {
          setIsLoadingAuth(false);
          setIsAuthenticated(false);
        }
        setIsLoadingPublicSettings(false);
      } catch (appError) {
        console.error('App state check failed:', appError);
        if (appError.status === 403 && appError.data?.extra_data?.reason) {
          const reason = appError.data.extra_data.reason;
          setAuthError({ type: reason, message: appError.message });
        } else {
          setAuthError({ type: 'unknown', message: appError.message || 'Failed to load app' });
        }
        setIsLoadingPublicSettings(false);
        setIsLoadingAuth(false);
      }
    } catch (error) {
      console.error('Unexpected error:', error);
      setAuthError({ type: 'unknown', message: error.message || 'An unexpected error occurred' });
      setIsLoadingPublicSettings(false);
      setIsLoadingAuth(false);
    }
  };

  const checkUserAuth = async () => {
    try {
      setIsLoadingAuth(true);
      const currentUser = await base44.auth.me();
      setUser(currentUser);
      setIsAuthenticated(true);

      // Mark that this browser has logged in before
      try { localStorage.setItem('uvm_has_logged_in', '1'); } catch {}

      // ── Post-login redirect logic ──────────────────────────────────────
      if (IS_FRESH_LOGIN) {
        const currentPath = window.location.pathname;
        const destination = defaultRouteForUser(currentUser);

        console.log("[AuthContext] Fresh login detected");
        console.log("[AuthContext] Current path:", currentPath);
        console.log("[AuthContext] User role:", currentUser?.role);
        console.log("[AuthContext] isPlus fields:", {
          isPlus: currentUser?.isPlus,
          tier: currentUser?.tier,
          subscription_status: currentUser?.subscription_status,
          subscriptionStatus: currentUser?.subscriptionStatus,
        });
        console.log("[AuthContext] Destination:", destination);

        // Always clear stale redirects on fresh login
        clearAllStoredRedirects();

        // If the current path is not a valid/safe route, redirect to role default
        if (!isSafeRoute(currentPath)) {
          console.log("[AuthContext] Current path is UNSAFE — redirecting to:", destination);
          window.location.replace(destination);
          return; // navigating away
        }

        // Current path is safe — stay here (user may have logged in from /music, /vibe-room, etc.)
        console.log("[AuthContext] Current path is safe — staying on:", currentPath);
      }

      setIsLoadingAuth(false);
    } catch (error) {
      console.error('[AuthContext] auth check failed:', error?.message);
      setIsLoadingAuth(false);
      setIsAuthenticated(false);
      if (error.status === 401 || error.status === 403) {
        setAuthError({ type: 'auth_required', message: 'Authentication required' });
      }
    }
  };

  const logout = (shouldRedirect = true) => {
    setUser(null);
    setIsAuthenticated(false);
    // Clear login-handled flag so next login is detected fresh
    try { sessionStorage.removeItem('uvm_login_handled'); } catch {}
    if (shouldRedirect) {
      base44.auth.logout(window.location.href);
    } else {
      base44.auth.logout();
    }
  };

  const navigateToLogin = (nextUrl) => {
    base44.auth.redirectToLogin(nextUrl || window.location.href);
  };

  // Derived membership helpers
  const isPlus = isAuthenticated && user && (
    user.isPlus === true ||
    user.isPremium === true ||
    user.is_plus === true ||
    user.tier === "plus" ||
    user.tier === "premium" ||
    user.role === "plus" ||
    user.role === "premium" ||
    user.plan === "plus" ||
    user.plan === "premium" ||
    user.subscription_status === "active" ||
    user.subscriptionStatus === "active" ||
    user.stripe_subscription_status === "active"
  );
  const isAdmin = isAuthenticated && user?.role === "admin";

  let hasPreviouslyLoggedIn = false;
  try { hasPreviouslyLoggedIn = !!localStorage.getItem('uvm_has_logged_in'); } catch {}

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated,
      isLoadingAuth,
      isLoadingPublicSettings,
      authError,
      appPublicSettings,
      isPlus,
      isAdmin,
      hasPreviouslyLoggedIn,
      logout,
      navigateToLogin,
      checkAppState
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};