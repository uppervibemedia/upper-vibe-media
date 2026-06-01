import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Headphones, ArrowLeft } from "lucide-react";

export default function PageNotFound() {
  const navigate = useNavigate();
  const [showContent, setShowContent] = useState(false);

  useEffect(() => {
    // If user has a token, they're logged in — redirect immediately without showing 404
    try {
      const token =
        localStorage.getItem("base44_access_token") ||
        localStorage.getItem("token") ||
        localStorage.getItem("base44_token");
      if (token) {
        // Redirect to music immediately — no 404 flash
        navigate("/music", { replace: true });
        return;
      }
    } catch {}

    // No token — show 404 content after a brief grace period
    // (avoids flash while SPA router is still hydrating on first load)
    const timer = setTimeout(() => setShowContent(true), 300);
    return () => clearTimeout(timer);
  }, [navigate]);

  // Loading state — shown while checking token or while redirect is pending
  if (!showContent) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
          <p className="text-xs tracking-[0.2em] uppercase text-muted-foreground">Loading your vibe...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-6">
      <div className="text-center">
        <Headphones className="w-12 h-12 text-primary/40 mx-auto mb-6" />
        <h1 className="font-heading font-extrabold text-6xl md:text-8xl text-foreground/10 mb-2">404</h1>
        <p className="font-heading font-bold text-lg text-foreground mb-2">Signal Lost</p>
        <p className="text-sm text-muted-foreground mb-8">This frequency doesn't exist. Let's get you back on track.</p>
        <Link
          to="/music"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-primary/10 border border-primary/30 text-primary text-sm font-medium hover:bg-primary/20 transition-all"
        >
          <ArrowLeft className="w-4 h-4" />
          Return Home
        </Link>
      </div>
    </div>
  );
}