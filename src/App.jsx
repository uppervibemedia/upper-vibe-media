import React, { useEffect } from 'react';
import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import { ThemeProvider } from '@/context/ThemeContext';

import AppLayout from './components/layout/AppLayout';
import Home from './pages/Home';
import Music from './pages/Music';
import Categories from './pages/Categories';
import Downloads from './pages/Downloads.jsx';
import About from './pages/About';
import Admin from './pages/Admin';
import Visualizers from './pages/Visualizers.jsx';
import SongPage from './pages/SongPage';
import Contact from './pages/Contact';
import Academy from './pages/Academy';
import AcademyLessonPage from './pages/AcademyLessonPage';
import Artists from './pages/Artists';
import MyVibes from './pages/MyVibes';
import NewestMusic from './pages/NewestMusic';
import RadioPage from './pages/Radio.jsx';
import Account from './pages/Account';
import Sessions from './pages/Sessions';
import EmailList from './pages/EmailList';
import Membership from './pages/Membership';
import PaymentSuccess from './pages/PaymentSuccess';
import PaymentCancelled from './pages/PaymentCancelled';
import TermsAndConditions from './pages/TermsAndConditions';
import PrivacyPolicy from './pages/PrivacyPolicy';
import DMCAPolicy from './pages/DMCAPolicy';
import RefundPolicy from './pages/RefundPolicy';
import Support from './pages/Support';
import ForgotPassword from './pages/ForgotPassword';
import Settings from './pages/Settings';
import FAQ from './pages/FAQ';
import VibeCheck from './pages/VibeCheck';
import Start from './pages/Start';
import PersonalizedFeed from './pages/PersonalizedFeed';
import { isSafeRoute, defaultRouteForUser } from './lib/safeRedirect';

const LoadingScreen = () => (
  <div className="fixed inset-0 flex items-center justify-center bg-background">
    <div className="flex flex-col items-center gap-4">
      <div className="w-8 h-8 border-2 border-primary/20 border-t-primary rounded-full animate-spin"></div>
      <p className="text-xs tracking-[0.2em] uppercase text-muted-foreground">Loading your vibe...</p>
    </div>
  </div>
);

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin, isAuthenticated, user } = useAuth();

  // Failsafe: once auth resolves, if the current path isn't a known route,
  // redirect to the user's role-appropriate default. Runs once per auth session.
  const hasRunFallback = React.useRef(false);
  useEffect(() => {
    if (!isAuthenticated || !user || isLoadingAuth) return;
    if (hasRunFallback.current) return;
    hasRunFallback.current = true;
    const path = window.location.pathname;
    if (!isSafeRoute(path)) {
      const dest = defaultRouteForUser(user);
      console.log("[App] Fallback redirect — unsafe path:", path, "→", dest);
      window.location.replace(dest);
    }
  }, [isAuthenticated, user, isLoadingAuth]);

  // While auth or settings are loading, ALWAYS show loading — never render 404
  if (isLoadingPublicSettings || isLoadingAuth) {
    return <LoadingScreen />;
  }

  // Auth resolved but user is authenticated and on an unknown path —
  // the useEffect above will fire window.location.replace, show loading until it does
  if (isAuthenticated && user && !isSafeRoute(window.location.pathname)) {
    return <LoadingScreen />;
  }

  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'session_expired') {
      return (
        <div className="fixed inset-0 flex items-center justify-center bg-background/95 backdrop-blur-sm z-50">
          <div className="flex flex-col items-center gap-6 max-w-sm px-6 text-center">
            <div className="w-14 h-14 rounded-full flex items-center justify-center"
              style={{ background: "rgba(0,200,220,0.12)", border: "1px solid rgba(0,200,220,0.25)" }}>
              <svg className="w-7 h-7 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h2 className="font-heading font-black text-xl text-foreground mb-2">Session Expired</h2>
              <p className="text-sm text-muted-foreground/70">
                Your login session was cleared (this happens on Safari/PWA after 7 days of no visits). Please log in again to continue.
              </p>
            </div>
            <button
              onClick={() => navigateToLogin(window.location.href)}
              className="w-full px-6 py-3 rounded-lg font-black text-sm tracking-wider transition-all hover:brightness-110 active:scale-95"
              style={{ background: "linear-gradient(135deg,#00B8D4,#00E5FF)", color: "#000" }}>
              Log In Again
            </button>
          </div>
        </div>
      );
    } else if (authError.type === 'auth_required') {
      navigateToLogin(window.location.href);
      return null;
    }
  }

  return (
    <Routes>
      <Route element={<AppLayout />}>
        {/* Main navigation */}
        <Route path="/" element={<Home />} />
        <Route path="/music" element={<Music />} />
        <Route path="/categories" element={<Categories />} />
        <Route path="/downloads" element={<Downloads />} />
        <Route path="/about" element={<About />} />
        <Route path="/visualizers" element={<Visualizers />} />
        <Route path="/song/:id" element={<SongPage />} />
        <Route path="/admin" element={<Admin />} />
        {/* Active routes */}
        <Route path="/contact" element={<Contact />} />
        <Route path="/academy" element={<Academy />} />
        <Route path="/academy/lesson/:id" element={<AcademyLessonPage />} />
        <Route path="/newest-music" element={<NewestMusic />} />
        <Route path="/radio" element={<RadioPage />} />
        <Route path="/vibe-check" element={<VibeCheck />} />
        <Route path="/my-vibes" element={<MyVibes />} />
        <Route path="/my-vibe-library" element={<MyVibes />} />
        <Route path="/artists" element={<Artists />} />
        <Route path="/sessions" element={<Sessions />} />
        <Route path="/account" element={<Account />} />
        <Route path="/upgrade" element={<Membership />} />
        <Route path="/membership" element={<Membership />} />
        <Route path="/payment-success" element={<PaymentSuccess />} />
        <Route path="/payment-cancelled" element={<PaymentCancelled />} />
        <Route path="/terms" element={<TermsAndConditions />} />
        <Route path="/privacy" element={<PrivacyPolicy />} />
        <Route path="/dmca" element={<DMCAPolicy />} />
        <Route path="/refunds" element={<RefundPolicy />} />
        <Route path="/support" element={<Support />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/faq" element={<FAQ />} />
        <Route path="/start" element={<Start />} />
        <Route path="/my-feed" element={<PersonalizedFeed />} />
        <Route path="/email-list" element={<EmailList />} />
      </Route>
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};


function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <QueryClientProvider client={queryClientInstance}>
          <Router>
            <AuthenticatedApp />
          </Router>
          <Toaster />
        </QueryClientProvider>
      </AuthProvider>
    </ThemeProvider>
  )
}

export default App