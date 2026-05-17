import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';

import AppLayout from './components/layout/AppLayout';
import Home from './pages/Home';
import Music from './pages/Music';
import Categories from './pages/Categories';
import Downloads from './pages/Downloads.jsx';
import About from './pages/About';
import Admin from './pages/Admin';
import Visualizers from './pages/Visualizers.jsx';
import SongPage from './pages/SongPage';
// Hidden pages (still routable but not in nav)
import Discover from './pages/Discover';
import Pricing from './pages/Pricing';
import Dashboard from './pages/Dashboard';
import Vault from './pages/Vault';
import Contact from './pages/Contact';
import Academy from './pages/Academy';
import Artists from './pages/Artists';
import MyVibes from './pages/MyVibes';
import Sessions from './pages/Sessions';
import EmailList from './pages/EmailList';

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-2 border-primary/20 border-t-primary rounded-full animate-spin"></div>
          <p className="text-xs tracking-[0.2em] uppercase text-muted-foreground">Loading frequency...</p>
        </div>
      </div>
    );
  }

  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      navigateToLogin();
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
        <Route path="/email-list" element={<EmailList />} />
        {/* Legacy / hidden routes still accessible */}
        <Route path="/discover" element={<Discover />} />
        <Route path="/pricing" element={<Pricing />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/vault" element={<Vault />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/academy" element={<Academy />} />
        <Route path="/my-vibes" element={<MyVibes />} />
        <Route path="/artists" element={<Artists />} />
        <Route path="/sessions" element={<Sessions />} />
      </Route>
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};


function App() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <AuthenticatedApp />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App