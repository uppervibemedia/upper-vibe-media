import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Eye, EyeOff } from "lucide-react";

export default function Login() {
  // If already authenticated, redirect away from login page
  useEffect(() => {
    base44.auth.isAuthenticated().then((authed) => {
      if (authed) window.location.replace("/my-vibes");
    });
  }, []);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await base44.auth.loginViaEmailPassword(email, password);
      const params = new URLSearchParams(window.location.search);
      const next = params.get("next");
      window.location.href = next && next.startsWith("/") ? next : "/my-vibes";
    } catch (err) {
      setError(err?.message || "Invalid email or password.");
    } finally {
      setLoading(false);
    }
  };

  const handleApple = () => {
    base44.auth.loginWithProvider("apple", window.location.origin + "/my-vibes");
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4"
      style={{ background: "hsl(240 50% 2%)" }}>
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="flex items-center gap-2.5 mb-2">
            <img
              src="https://media.base44.com/images/public/69cd68afb7fe90ae92757154/10c561c0c_ChatGPTImageApr1202611_53_51AM.png"
              alt="Upper Vibe Media"
              className="w-9 h-9 object-contain"
            />
            <div>
              <p className="font-heading font-black text-sm tracking-[0.2em] text-white">UPPER VIBE</p>
              <p className="text-[9px] tracking-wider text-yellow-400/50 uppercase">Media</p>
            </div>
          </div>
          <p className="text-white/40 text-xs mt-1">Sign in to your account</p>
        </div>

        {/* Card */}
        <div className="rounded-2xl p-7"
          style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
          
          {/* Apple */}
          <button
            onClick={handleApple}
            className="w-full flex items-center justify-center gap-2.5 py-3 rounded-xl font-bold text-sm transition-all hover:bg-white/10 mb-5"
            style={{ background: "rgba(255,255,255,0.92)", border: "1px solid rgba(255,255,255,0.15)", color: "#000" }}>
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.56-1.701z"/>
            </svg>
            Continue with Apple
          </button>

          <div className="flex items-center gap-3 mb-5">
            <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.08)" }} />
            <span className="text-[11px] text-white/25 font-medium">or</span>
            <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.08)" }} />
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-white/50 mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                className="w-full px-4 py-3 rounded-xl text-sm text-white placeholder:text-white/20 focus:outline-none transition-colors"
                style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-white/50 mb-1.5">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Your password"
                  required
                  className="w-full px-4 py-3 pr-11 rounded-xl text-sm text-white placeholder:text-white/20 focus:outline-none transition-colors"
                  style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors">
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <div className="flex justify-end mt-1.5">
                <Link to="/forgot-password" className="text-[11px] text-white/35 hover:text-white/60 transition-colors">
                  Forgot password?
                </Link>
              </div>
            </div>

            {error && (
              <p className="text-xs text-red-400 text-center py-2 px-3 rounded-lg"
                style={{ background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.2)" }}>
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl font-black text-sm tracking-wider transition-all hover:brightness-110 disabled:opacity-60 disabled:cursor-not-allowed"
              style={{ background: "linear-gradient(135deg,#0080B8,#00A0DC)", color: "#fff" }}>
              {loading ? "Signing in…" : "Sign In"}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-white/30 mt-5">
          Don't have an account?{" "}
          <Link to="/register" className="text-white/60 hover:text-white transition-colors font-semibold">
            Create one free
          </Link>
        </p>
      </div>
    </div>
  );
}