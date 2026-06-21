import React, { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, Mic, MicOff, PhoneOff, AlertTriangle, Shield,
  Users, Loader2, Radio, ChevronRight, Info, Volume2,
  UserX, Flag,
} from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { base44 } from "@/api/base44Client";

const STUN_SERVERS = {
  iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
};
const SIGNAL_EXPIRY_MS = 15_000;

export default function VoiceLoungePanel({ open, onClose, isMobile }) {
  const { user } = useAuth();

  // ── Flow states ─────────────────────────────────────────────
  const [step, setStep] = useState("intro"); // intro | info | connecting | connected | failed | denied
  const [isMuted, setIsMuted] = useState(true); // Start muted by default
  const [peerCount, setPeerCount] = useState(0);
  const [micLevel, setMicLevel] = useState(0);

  // ── WebRTC refs ─────────────────────────────────────────────
  const localStreamRef = useRef(null);
  const peerConnsRef = useRef({});
  const audioCtxRef = useRef(null);
  const analyserRef = useRef(null);
  const signalSubRef = useRef(null);

  const getAudioCtx = useCallback(() => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtxRef.current.state === "suspended") {
      audioCtxRef.current.resume();
    }
    return audioCtxRef.current;
  }, []);

  // ── Send signaling message ───────────────────────────────────
  const sendSignal = useCallback(async (toUserId, signalType, signalData) => {
    if (!user?.id) return;
    try {
      await base44.entities.VoiceSignal.create({
        from_user_id: user.id,
        to_user_id: toUserId,
        signal_type: signalType,
        signal_data: signalData,
        status: "pending",
        expires_at: new Date(Date.now() + SIGNAL_EXPIRY_MS).toISOString(),
      });
    } catch {}
  }, [user]);

  // ── Cleanup all connections ─────────────────────────────────
  const cleanupAll = useCallback(() => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
    }
    Object.values(peerConnsRef.current).forEach((pc) => pc.close());
    peerConnsRef.current = {};
    if (analyserRef.current) {
      analyserRef.current.disconnect();
      analyserRef.current = null;
    }
    if (signalSubRef.current) {
      signalSubRef.current();
      signalSubRef.current = null;
    }
    if (presenceSubRef.current) {
      presenceSubRef.current();
      presenceSubRef.current = null;
    }
    // Delete voice presence record
    if (presenceIdRef.current) {
      base44.entities.VoiceRoomPresence.delete(presenceIdRef.current).catch(() => {});
      presenceIdRef.current = null;
    }
    setPeerCount(0);
    setMicLevel(0);
  }, []);

  // ── Handle incoming signal ──────────────────────────────────
  const handleSignal = useCallback(async (signal) => {
    if (!localStreamRef.current || !user?.id) return;
    if (signal.from_user_id === user.id) return;
    if (signal.to_user_id !== user.id) return;
    if (signal.status !== "pending") return;

    try {
      await base44.entities.VoiceSignal.update(signal.id, { status: "processed" });
    } catch {}

    const remoteId = signal.from_user_id;
    let pc = peerConnsRef.current[remoteId];

    try {
      const signalData = JSON.parse(signal.signal_data);

      if (signal.signal_type === "offer") {
        if (!pc) {
          pc = new RTCPeerConnection(STUN_SERVERS);
          peerConnsRef.current[remoteId] = pc;
          localStreamRef.current.getTracks().forEach((t) => pc.addTrack(t, localStreamRef.current));

          pc.ontrack = (event) => {
            const stream = event.streams[0];
            if (!stream) return;
            const ctx = getAudioCtx();
            const source = ctx.createMediaStreamSource(stream);
            source.connect(ctx.destination);
          };
          pc.onicecandidate = (ev) => {
            if (ev.candidate) sendSignal(remoteId, "ice_candidate", JSON.stringify(ev.candidate));
          };
          pc.onconnectionstatechange = () => {
            if (pc.connectionState === "connected") setPeerCount((n) => n + 1);
            if (pc.connectionState === "failed" || pc.connectionState === "disconnected") {
              pc.close();
              delete peerConnsRef.current[remoteId];
              setPeerCount((n) => Math.max(0, n - 1));
            }
          };
        }

        if (pc.signalingState !== "stable") return;
        await pc.setRemoteDescription(new RTCSessionDescription(signalData));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        await sendSignal(remoteId, "answer", JSON.stringify(answer));

      } else if (signal.signal_type === "answer") {
        if (pc && pc.signalingState !== "stable") {
          await pc.setRemoteDescription(new RTCSessionDescription(signalData));
        }
      } else if (signal.signal_type === "ice_candidate") {
        if (pc && pc.remoteDescription) {
          try {
            await pc.addIceCandidate(new RTCIceCandidate(signalData));
          } catch {}
        }
      }
    } catch {}
  }, [user, sendSignal, getAudioCtx]);

  // ── Presence ref for cleanup on leave ──────────────────────
  const presenceIdRef = useRef(null);
  const presenceSubRef = useRef(null);

  // ── Discover peers: when a new voice presence appears, initiate WebRTC offer ──
  const connectToPeer = useCallback(async (remoteUserId) => {
    if (!localStreamRef.current || peerConnsRef.current[remoteUserId]) return;
    const pc = new RTCPeerConnection(STUN_SERVERS);
    peerConnsRef.current[remoteUserId] = pc;

    localStreamRef.current.getTracks().forEach((t) => pc.addTrack(t, localStreamRef.current));

    pc.ontrack = (event) => {
      const stream = event.streams[0];
      if (!stream) return;
      const ctx = getAudioCtx();
      const source = ctx.createMediaStreamSource(stream);
      source.connect(ctx.destination);
    };
    pc.onicecandidate = (ev) => {
      if (ev.candidate) sendSignal(remoteUserId, "ice_candidate", JSON.stringify(ev.candidate));
    };
    pc.onconnectionstatechange = () => {
      if (pc.connectionState === "connected") setPeerCount((n) => n + 1);
      if (pc.connectionState === "failed" || pc.connectionState === "disconnected") {
        pc.close();
        delete peerConnsRef.current[remoteUserId];
        setPeerCount((n) => Math.max(0, n - 1));
      }
    };

    // Initiate offer
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    await sendSignal(remoteUserId, "offer", JSON.stringify(offer));
  }, [sendSignal, getAudioCtx]);

  // ── Join the voice room ─────────────────────────────────────
  const joinVoiceRoom = useCallback(async () => {
    setStep("connecting");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      localStreamRef.current = stream;

      // Set up mic level analyser
      const ctx = getAudioCtx();
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.3;
      source.connect(analyser);
      analyserRef.current = analyser;

      // ── 1. Create voice presence record (peer discovery) ──
      const displayName = user?.full_name || user?.email?.split("@")[0] || "Anon";
      try {
        const presence = await base44.entities.VoiceRoomPresence.create({
          user_id: user.id,
          username: displayName,
          room_id: "vibe-lounge",
          joined_at: new Date().toISOString(),
        });
        presenceIdRef.current = presence.id;
      } catch {}

      // ── 2. Subscribe to incoming signals ──
      const unsubscribe = base44.entities.VoiceSignal.subscribe((event) => {
        if (event.type === "create" && event.data) handleSignal(event.data);
      });
      signalSubRef.current = unsubscribe;

      // ── 3. Discover EXISTING peers (connect to each) ──
      try {
        const existing = await base44.entities.VoiceRoomPresence.filter({
          room_id: "vibe-lounge",
          user_id: { $ne: user.id },
        });
        for (const peer of existing) {
          connectToPeer(peer.user_id);
        }
      } catch {}

      // ── 4. Subscribe to NEW peers joining later ──
      const presUnsub = base44.entities.VoiceRoomPresence.subscribe((event) => {
        if (event.type === "create" && event.data) {
          const data = event.data;
          if (data.user_id !== user.id && data.room_id === "vibe-lounge") {
            connectToPeer(data.user_id);
          }
        }
        if (event.type === "delete" && event.data) {
          const data = event.data;
          const pc = peerConnsRef.current[data.user_id];
          if (pc) {
            pc.close();
            delete peerConnsRef.current[data.user_id];
            setPeerCount((n) => Math.max(0, n - 1));
          }
        }
      });
      presenceSubRef.current = presUnsub;

      // ── 5. Process pending signals ──
      try {
        const pending = await base44.entities.VoiceSignal.filter({
          to_user_id: user.id,
          status: "pending",
        });
        for (const sig of pending) await handleSignal(sig);
      } catch {}

      setStep("connected");
    } catch (err) {
      if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        setStep("denied");
      } else {
        setStep("failed");
      }
    }
  }, [user, handleSignal, getAudioCtx, connectToPeer]);

  // ── Leave voice room ────────────────────────────────────────
  const leaveVoiceRoom = useCallback(() => {
    cleanupAll();
    setStep("intro");
    setIsMuted(true);
  }, [cleanupAll]);

  // ── Toggle mute ─────────────────────────────────────────────
  const toggleMute = useCallback(() => {
    setIsMuted((m) => {
      const next = !m;
      if (localStreamRef.current) {
        localStreamRef.current.getAudioTracks().forEach((t) => {
          t.enabled = !next;
        });
      }
      return next;
    });
  }, []);

  // ── Mic level monitor ───────────────────────────────────────
  useEffect(() => {
    if (!analyserRef.current) return;
    const analyser = analyserRef.current;
    const buffer = new Uint8Array(analyser.frequencyBinCount);
    const timer = setInterval(() => {
      analyser.getByteFrequencyData(buffer);
      const avg = buffer.reduce((a, b) => a + b, 0) / buffer.length;
      setMicLevel(Math.min(1, avg / 100));
    }, 100);
    return () => clearInterval(timer);
  }, [step === "connected"]);

  // ── Cleanup on unmount ──────────────────────────────────────
  useEffect(() => {
    return () => cleanupAll();
  }, []);

  if (!open) return null;

  return (
    <motion.div
      initial={{ y: "100%" }}
      animate={{ y: 0 }}
      exit={{ y: "100%" }}
      transition={{ type: "spring", damping: 30, stiffness: 300 }}
      className="fixed inset-x-0 bottom-0 rounded-t-3xl overflow-hidden flex flex-col"
      style={{
        zIndex: 72,
        height: isMobile ? "55dvh" : "45vh",
        background: "rgba(16,12,32,0.98)",
        backdropFilter: "blur(24px)",
        WebkitBackdropFilter: "blur(24px)",
        border: "1px solid rgba(155,126,255,0.2)",
        borderBottom: "none",
        pointerEvents: "auto",
      }}
      onTouchStart={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-white/5 flex-shrink-0">
        <div className="flex items-center gap-2">
          <Radio className="w-5 h-5 text-green-400" />
          <h3 className="font-heading font-black text-lg text-white">Voice Lounge</h3>
        </div>
        <button
          onTouchStart={(e) => e.stopPropagation()}
          onClick={(e) => { e.stopPropagation(); onClose(); }}
          className="w-11 h-11 rounded-full flex items-center justify-center transition-all hover:bg-white/10"
          style={{
            color: "rgba(255,255,255,0.6)",
            minWidth: 44, minHeight: 44,
            touchAction: "manipulation",
            pointerEvents: "auto",
          }}
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
        <AnimatePresence mode="wait">
          {/* ═══════════════════════════════════════════════════════
              STEP: intro — "Join Voice Lounge" prompt
              ════════════════════════════════════════════════════ */}
          {step === "intro" && (
            <motion.div
              key="intro"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center gap-5 pt-4"
            >
              <div className="w-16 h-16 rounded-full flex items-center justify-center"
                style={{ background: "rgba(0,230,118,0.1)", border: "1px solid rgba(0,230,118,0.2)" }}>
                <Radio className="w-7 h-7 text-green-400" />
              </div>

              <div className="text-center">
                <h4 className="font-heading font-black text-base text-white mb-2">Voice Lounge</h4>
                <p className="text-sm text-white/50 leading-relaxed max-w-xs">
                  Talk with other users in real time inside the Vibe Lounge.
                  Your microphone starts muted — unmute when you're ready.
                </p>
              </div>

              <div className="w-full space-y-2">
                <div className="flex items-start gap-2 p-3 rounded-xl"
                  style={{ background: "rgba(245,168,0,0.06)", border: "1px solid rgba(245,168,0,0.12)" }}>
                  <Shield className="w-4 h-4 text-yellow-400/70 flex-shrink-0 mt-0.5" />
                  <p className="text-[11px] text-yellow-400/70 leading-relaxed">
                    Voice Lounge is for users 18+. Do not share your phone number, address, email, passwords, or private details.
                  </p>
                </div>

                <button
                  onTouchStart={(e) => e.stopPropagation()}
                  onClick={() => setStep("info")}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-black text-sm tracking-wider transition-all hover:brightness-110 active:scale-95"
                  style={{
                    background: "linear-gradient(135deg,#00C853,#00E676)",
                    color: "#000",
                    minHeight: 48,
                    touchAction: "manipulation",
                    pointerEvents: "auto",
                  }}
                >
                  Join Voice Lounge
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          )}

          {/* ═══════════════════════════════════════════════════════
              STEP: info — Permission/info screen before mic
              ════════════════════════════════════════════════════ */}
          {step === "info" && (
            <motion.div
              key="info"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col gap-4 pt-2"
            >
              <div className="flex items-start gap-3 p-4 rounded-2xl"
                style={{ background: "rgba(0,160,220,0.06)", border: "1px solid rgba(0,160,220,0.12)" }}>
                <Info className="w-5 h-5 text-cyan-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-bold text-white mb-1">Before you join</p>
                  <p className="text-xs text-white/50 leading-relaxed">
                    Voice Lounge lets you talk with other users in the Vibe Lounge.
                    Do not share personal information. You can mute, leave, block, or report users at any time.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-4 rounded-2xl"
                style={{ background: "rgba(245,168,0,0.06)", border: "1px solid rgba(245,168,0,0.12)" }}>
                <AlertTriangle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-bold text-white mb-1">Safety Reminder</p>
                  <p className="text-xs text-white/50 leading-relaxed">
                    Voice Lounge is for users 18+. Do not share your phone number, address, email, passwords,
                    payment information, location, or private personal details.
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onTouchStart={(e) => e.stopPropagation()}
                  onClick={() => setStep("intro")}
                  className="flex-1 py-3 rounded-xl font-black text-xs tracking-wider transition-all active:scale-95"
                  style={{
                    background: "rgba(255,255,255,0.06)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    color: "rgba(255,255,255,0.5)",
                    minHeight: 48,
                    touchAction: "manipulation",
                    pointerEvents: "auto",
                  }}
                >
                  Cancel
                </button>
                <button
                  onTouchStart={(e) => e.stopPropagation()}
                  onClick={joinVoiceRoom}
                  className="flex-1 py-3 rounded-xl font-black text-xs tracking-wider transition-all hover:brightness-110 active:scale-95"
                  style={{
                    background: "linear-gradient(135deg,#00C853,#00E676)",
                    color: "#000",
                    minHeight: 48,
                    touchAction: "manipulation",
                    pointerEvents: "auto",
                  }}
                >
                  Continue
                </button>
              </div>
            </motion.div>
          )}

          {/* ═══════════════════════════════════════════════════════
              STEP: connecting
              ════════════════════════════════════════════════════ */}
          {step === "connecting" && (
            <motion.div
              key="connecting"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center gap-5 pt-6"
            >
              <Loader2 className="w-10 h-10 text-green-400 animate-spin" />
              <div className="text-center">
                <p className="text-sm font-bold text-white mb-1">Connecting to Voice Lounge...</p>
                <p className="text-xs text-white/30">Setting up your microphone</p>
              </div>
            </motion.div>
          )}

          {/* ═══════════════════════════════════════════════════════
              STEP: connected — Voice room active
              ═══════════════════════════════════════════════════════ */}
          {step === "connected" && (
            <motion.div
              key="connected"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col gap-4"
            >
              {/* Status bar */}
              <div className="flex items-center justify-between p-3 rounded-xl"
                style={{ background: "rgba(0,230,118,0.08)", border: "1px solid rgba(0,230,118,0.15)" }}>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                  <span className="text-xs font-bold text-green-400">Connected</span>
                </div>
                <div className="flex items-center gap-3">
                  {peerCount > 0 && (
                    <span className="text-[10px] text-white/40 flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      {peerCount} {peerCount === 1 ? "person" : "people"}
                    </span>
                  )}
                  <span className="text-[10px]" style={{ color: isMuted ? "#EF4444" : "#00E676" }}>
                    {isMuted ? "Mic Off" : "Mic On"}
                  </span>
                </div>
              </div>

              {/* Mic level indicator */}
              {!isMuted && (
                <div className="px-1">
                  <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.08)" }}>
                    <motion.div
                      className="h-full rounded-full"
                      animate={{ width: `${micLevel * 100}%` }}
                      transition={{ duration: 0.1 }}
                      style={{
                        background: micLevel > 0.5
                          ? "linear-gradient(90deg,#00E676,#69F0AE)"
                          : "linear-gradient(90deg,#00C853,#00E676)",
                      }}
                    />
                  </div>
                </div>
              )}

              {/* Controls */}
              <div className="flex items-center justify-center gap-5">
                {/* Mic toggle — circle, red when muted, green when unmuted */}
                <button
                  onTouchStart={(e) => e.stopPropagation()}
                  onClick={toggleMute}
                  className="flex flex-col items-center gap-1.5 transition-all active:scale-90"
                  style={{
                    touchAction: "manipulation",
                    pointerEvents: "auto",
                  }}
                >
                  <div
                    className="rounded-full flex items-center justify-center transition-all"
                    style={{
                      width: 64,
                      height: 64,
                      minWidth: 64,
                      minHeight: 64,
                      background: isMuted
                        ? "rgba(239,68,68,0.15)"
                        : "rgba(0,230,118,0.15)",
                      border: `2px solid ${isMuted ? "rgba(239,68,68,0.5)" : "rgba(0,230,118,0.5)"}`,
                      boxShadow: isMuted
                        ? "0 0 16px rgba(239,68,68,0.25)"
                        : "0 0 16px rgba(0,230,118,0.35)",
                    }}
                  >
                    {isMuted ? (
                      <MicOff className="w-6 h-6" style={{ color: "#EF4444" }} />
                    ) : (
                      <Mic className="w-6 h-6" style={{ color: "#00E676" }} />
                    )}
                  </div>
                  <span className="text-[10px] font-black tracking-wider"
                    style={{ color: isMuted ? "#EF4444" : "#00E676" }}>
                    {isMuted ? "Mic Off" : "Mic On"}
                  </span>
                </button>

                {/* Leave button */}
                <button
                  onTouchStart={(e) => e.stopPropagation()}
                  onClick={leaveVoiceRoom}
                  className="flex flex-col items-center gap-1.5 transition-all active:scale-90"
                  style={{
                    touchAction: "manipulation",
                    pointerEvents: "auto",
                  }}
                >
                  <div
                    className="rounded-full flex items-center justify-center transition-all"
                    style={{
                      width: 56,
                      height: 56,
                      minWidth: 56,
                      minHeight: 56,
                      background: "rgba(239,68,68,0.1)",
                      border: "1.5px solid rgba(239,68,68,0.3)",
                    }}
                  >
                    <PhoneOff className="w-5 h-5" style={{ color: "#EF4444" }} />
                  </div>
                  <span className="text-[10px] font-black tracking-wider" style={{ color: "#EF4444" }}>
                    Leave
                  </span>
                </button>
              </div>

              {/* Report / Block row */}
              <div className="flex gap-2">
                <button
                  onTouchStart={(e) => e.stopPropagation()}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-[10px] font-medium text-white/30 transition-all active:scale-95"
                  style={{
                    background: "rgba(255,255,255,0.03)",
                    border: "1px solid rgba(255,255,255,0.06)",
                    minHeight: 40,
                    touchAction: "manipulation",
                    pointerEvents: "auto",
                  }}
                >
                  <Flag className="w-3 h-3" />
                  Report User
                </button>
                <button
                  onTouchStart={(e) => e.stopPropagation()}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-[10px] font-medium text-white/30 transition-all active:scale-95"
                  style={{
                    background: "rgba(255,255,255,0.03)",
                    border: "1px solid rgba(255,255,255,0.06)",
                    minHeight: 40,
                    touchAction: "manipulation",
                    pointerEvents: "auto",
                  }}
                >
                  <UserX className="w-3 h-3" />
                  Block User
                </button>
              </div>
            </motion.div>
          )}

          {/* ═══════════════════════════════════════════════════════
              STEP: failed — Connection failed
              ════════════════════════════════════════════════════ */}
          {step === "failed" && (
            <motion.div
              key="failed"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center gap-4 pt-4"
            >
              <div className="w-14 h-14 rounded-full flex items-center justify-center"
                style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)" }}>
                <AlertTriangle className="w-6 h-6 text-red-400" />
              </div>
              <div className="text-center">
                <p className="text-sm font-bold text-white mb-1">Failed to Connect</p>
                <p className="text-xs text-white/40 leading-relaxed max-w-xs">
                  Could not establish a voice connection. Please check your internet and try again.
                </p>
              </div>
              <button
                onTouchStart={(e) => e.stopPropagation()}
                onClick={() => setStep("intro")}
                className="px-6 py-3 rounded-xl font-black text-xs tracking-wider transition-all active:scale-95"
                style={{
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  color: "rgba(255,255,255,0.6)",
                  minHeight: 44,
                  touchAction: "manipulation",
                  pointerEvents: "auto",
                }}
              >
                Try Again
              </button>
            </motion.div>
          )}

          {/* ═══════════════════════════════════════════════════════
              STEP: denied — Mic permission denied
              ════════════════════════════════════════════════════ */}
          {step === "denied" && (
            <motion.div
              key="denied"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center gap-4 pt-4"
            >
              <div className="w-14 h-14 rounded-full flex items-center justify-center"
                style={{ background: "rgba(245,168,0,0.1)", border: "1px solid rgba(245,168,0,0.2)" }}>
                <MicOff className="w-6 h-6 text-yellow-400" />
              </div>
              <div className="text-center">
                <p className="text-sm font-bold text-white mb-1">Microphone Access Needed</p>
                <p className="text-xs text-white/40 leading-relaxed max-w-xs">
                  Microphone access is needed to join Voice Lounge. You can enable it in your browser settings.
                </p>
              </div>
              <button
                onTouchStart={(e) => e.stopPropagation()}
                onClick={() => setStep("intro")}
                className="px-6 py-3 rounded-xl font-black text-xs tracking-wider transition-all active:scale-95"
                style={{
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  color: "rgba(255,255,255,0.6)",
                  minHeight: 44,
                  touchAction: "manipulation",
                  pointerEvents: "auto",
                }}
              >
                Go Back
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}