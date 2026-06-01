import React, { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Headphones, ArrowLeft } from "lucide-react";

export default function PageNotFound() {
  const navigate = useNavigate();

  // Auto-redirect away from 404 if a valid token exists in localStorage
  // This catches the case where the platform redirects to a bad URL post-login.
  useEffect(() => {
    try {
      const token = localStorage.getItem("base44_access_token") || localStorage.getItem("token");
      if (token) {
        // User is logged in — don't strand them on 404, send to /music
        const timer = setTimeout(() => {
          navigate("/music", { replace: true });
        }, 2000);
        return () => clearTimeout(timer);
      }
    } catch {}
  }, [navigate]);

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