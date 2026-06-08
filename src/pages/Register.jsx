import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Eye, EyeOff } from "lucide-react";

export default function Register() {
  // If already authenticated, redirect away
  useEffect(() => {
    base44.auth.isAuthenticated().then((authed) => {
      if (authed) window.location.replace("/music");
    });
  }, []);

  const [step, setStep] = useState("form"); // "form" | "otp"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  const handleRegister = async (e) => {
    e.preventDefault();
    setError("");
    if (password !== confirmPassword) {
      setError("Passwords don't match.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    setLoading(true);
    try {
      await base44.auth.register({ email, password });
      setStep("otp");
      startResendCooldown();
    } catch (err) {
      setError(err?.message || "Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await base44.auth.verifyOtp({ email, otpCode });
      base44.auth.setToken(res.access_token);
      window.location.href = "/";
    } catch (err) {
      setError(err?.message || "Invalid code. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const startResendCooldown = () => {
    setResendCooldown(30);
    const interval = setInterval(() => {
      setResendCooldown((prev) => {
        if (prev <= 1) { clearInterval(interval); return 0; }
        return prev - 1;
      });
    }, 1000);
  };

  const handleResend = async () => {
    if (resendCooldown > 0) return;
    setError("");
    try {
      await base44.auth.resendOtp(email);
      startResendCooldown();
    } catch (err) {
      setError(err?.message || "Couldn't resend code.");
    }
  };

  const handleApple = () => {
    base44.auth.loginWithProvider("apple", window.location.origin + "/");
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
          <p className="text-white/40 text-xs mt-1">
            {step === "form" ? "Create your free account" : "Verify your email"}
          </p>
        </div>

        <div className="rounded-2xl p-7"
          style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>

          {step === "form" && (
            <>
              {/* Apple */}
              <button
                onClick={handleApple}
                className="w-full flex items-center justify-center gap-2.5 py-3 rounded-xl font-bold text-sm transition-all hover:brightness-95 mb-5"
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

              <form onSubmit={handleRegister} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-white/50 mb-1.5">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    required
                    className="w-full px-4 py-3 rounded-xl text-sm text-white placeholder:text-white/20 focus:outline-none"
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
                      placeholder="Min. 6 characters"
                      required
                      className="w-full px-4 py-3 pr-11 rounded-xl text-sm text-white placeholder:text-white/20 focus:outline-none"
                      style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}
                    />
                    <button type="button" onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors">
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-white/50 mb-1.5">Confirm Password</label>
                  <div className="relative">
                    <input
                      type={showConfirm ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Repeat password"
                      required
                      className="w-full px-4 py-3 pr-11 rounded-xl text-sm text-white placeholder:text-white/20 focus:outline-none"
                      style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}
                    />
                    <button type="button" onClick={() => setShowConfirm(!showConfirm)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors">
                      {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
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
                  {loading ? "Creating account…" : "Create Account"}
                </button>
              </form>
            </>
          )}

          {step === "otp" && (
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <div className="text-center mb-2">
                <p className="text-sm text-white/60 leading-relaxed">
                  We sent a 6-digit code to<br />
                  <span className="text-white font-semibold">{email}</span>
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-white/50 mb-1.5 text-center">Verification Code</label>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
                  placeholder="000000"
                  required
                  className="w-full px-4 py-3 rounded-xl text-sm text-white text-center placeholder:text-white/20 focus:outline-none tracking-[0.3em] text-base font-bold"
                  style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}
                />
              </div>

              {error && (
                <p className="text-xs text-red-400 text-center py-2 px-3 rounded-lg"
                  style={{ background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.2)" }}>
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={loading || otpCode.length < 6}
                className="w-full py-3 rounded-xl font-black text-sm tracking-wider transition-all hover:brightness-110 disabled:opacity-60 disabled:cursor-not-allowed"
                style={{ background: "linear-gradient(135deg,#0080B8,#00A0DC)", color: "#fff" }}>
                {loading ? "Verifying…" : "Verify & Continue"}
              </button>

              <div className="text-center">
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={resendCooldown > 0}
                  className="text-xs transition-colors disabled:cursor-not-allowed"
                  style={{ color: resendCooldown > 0 ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.45)" }}>
                  {resendCooldown > 0 ? `Resend code in ${resendCooldown}s` : "Resend code"}
                </button>
              </div>
            </form>
          )}
        </div>

        {step === "form" && (
          <p className="text-center text-xs text-white/30 mt-5">
            Already have an account?{" "}
            <Link to="/login" className="text-white/60 hover:text-white transition-colors font-semibold">
              Sign in
            </Link>
          </p>
        )}
      </div>
    </div>
  );
}