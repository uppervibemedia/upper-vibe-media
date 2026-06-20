/**
 * useProximityVoice — WebRTC-based proximity voice chat for Vibe World.
 *
 * - Requests mic permission on mount
 * - Monitors nearby users via position data from parent
 * - Establishes WebRTC peer connections with users within PROXIMITY_RADIUS
 * - Uses VoiceSignal entity for signaling (offer/answer/ICE via entity subscriptions)
 * - Applies distance-based gain attenuation (linear fade)
 * - Cleans up connections when users leave proximity or world
 *
 * Params:
 *   user          — auth user object (with .id)
 *   playerPos     — { x, z } current position
 *   remoteUsers   — array from useVibeWorldPresence (has user_id, pos_x, pos_z)
 *
 * Returns:
 *   { isMicEnabled, toggleMic, voicePeers, isConnected }
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { base44 } from "@/api/base44Client";

const PROXIMITY_RADIUS = 8;        // Units — users within this range can hear each other
const CONNECTION_CHECK_MS = 1000;  // How often to scan for new/lost peers
const SIGNAL_CLEANUP_MS = 30_000;  // Delete stale signals every 30s
const SIGNAL_EXPIRY_MS = 15_000;   // Individual signal record expires after 15s
const STUN_SERVERS = {
  iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
};

export default function useProximityVoice(user, playerPos, remoteUsers) {
  const [isMicEnabled, setIsMicEnabled] = useState(false);
  const [voicePeers, setVoicePeers] = useState([]); // nearby user_ids with active connections
  const localStreamRef = useRef(null);
  const peerConnectionsRef = useRef({});      // userId → RTCPeerConnection
  const remoteStreamsRef = useRef({});         // userId → MediaStream
  const gainNodesRef = useRef({});             // userId → GainNode
  const audioCtxRef = useRef(null);
  const signalSubRef = useRef(null);
  const pendingSignalsRef = useRef(new Set()); // Track signal IDs being processed
  const cleanupTimerRef = useRef(null);

  const playerPosRef = useRef(playerPos);
  playerPosRef.current = playerPos;

  // ── Audio context (lazy init) ────────────────────────────────────────────
  const getAudioCtx = useCallback(() => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtxRef.current.state === "suspended") {
      audioCtxRef.current.resume();
    }
    return audioCtxRef.current;
  }, []);

  // ── Toggle mic ───────────────────────────────────────────────────────────
  const toggleMic = useCallback(async () => {
    if (isMicEnabled) {
      // Disable mic
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((t) => t.stop());
        localStreamRef.current = null;
      }
      // Close all peer connections
      Object.values(peerConnectionsRef.current).forEach((pc) => pc.close());
      peerConnectionsRef.current = {};
      remoteStreamsRef.current = {};
      gainNodesRef.current = {};
      setVoicePeers([]);
      setIsMicEnabled(false);
    } else {
      // Enable mic
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        localStreamRef.current = stream;
        setIsMicEnabled(true);
      } catch (err) {
        console.warn("[ProximityVoice] Mic access denied:", err.message);
      }
    }
  }, [isMicEnabled]);

  // ── Stop mic on unmount ──────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((t) => t.stop());
      }
      Object.values(peerConnectionsRef.current).forEach((pc) => pc.close());
      peerConnectionsRef.current = {};
      if (audioCtxRef.current) {
        audioCtxRef.current.close();
        audioCtxRef.current = null;
      }
      if (cleanupTimerRef.current) clearInterval(cleanupTimerRef.current);
    };
  }, []);

  // ── Create a peer connection to a specific user ─────────────────────────
  const createPeerConnection = useCallback(
    async (remoteUserId) => {
      if (!localStreamRef.current || peerConnectionsRef.current[remoteUserId]) return;

      const ctx = getAudioCtx();
      const pc = new RTCPeerConnection(STUN_SERVERS);

      // Add local audio tracks
      localStreamRef.current.getTracks().forEach((track) => {
        pc.addTrack(track, localStreamRef.current);
      });

      // Handle incoming remote stream
      pc.ontrack = (event) => {
        const remoteStream = event.streams[0];
        if (!remoteStream) return;

        remoteStreamsRef.current[remoteUserId] = remoteStream;

        // Create gain node for distance-based volume
        const source = ctx.createMediaStreamSource(remoteStream);
        const gainNode = ctx.createGain();
        gainNode.gain.value = 1.0;
        source.connect(gainNode);
        gainNode.connect(ctx.destination);
        gainNodesRef.current[remoteUserId] = gainNode;
      };

      // Handle ICE candidates — send via entity signal
      pc.onicecandidate = (event) => {
        if (!event.candidate) return;
        sendSignal(remoteUserId, "ice_candidate", JSON.stringify(event.candidate));
      };

      // Handle connection state changes
      pc.onconnectionstatechange = () => {
        if (pc.connectionState === "failed" || pc.connectionState === "disconnected") {
          closePeerConnection(remoteUserId);
        }
      };

      peerConnectionsRef.current[remoteUserId] = pc;

      // Create and send offer
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      await sendSignal(remoteUserId, "offer", JSON.stringify(offer));

      return pc;
    },
    [getAudioCtx]
  );

  // ── Close a specific peer connection ────────────────────────────────────
  const closePeerConnection = useCallback((remoteUserId) => {
    const pc = peerConnectionsRef.current[remoteUserId];
    if (pc) {
      pc.close();
      delete peerConnectionsRef.current[remoteUserId];
    }
    const stream = remoteStreamsRef.current[remoteUserId];
    if (stream) {
      stream.getTracks().forEach((t) => t.stop());
      delete remoteStreamsRef.current[remoteUserId];
    }
    const gain = gainNodesRef.current[remoteUserId];
    if (gain) {
      gain.disconnect();
      delete gainNodesRef.current[remoteUserId];
    }
    setVoicePeers((prev) => prev.filter((id) => id !== remoteUserId));
  }, []);

  // ── Send a WebRTC signal via VoiceSignal entity ─────────────────────────
  const sendSignal = useCallback(async (toUserId, signalType, signalData) => {
    if (!user?.id) return;
    try {
      const expiresAt = new Date(Date.now() + SIGNAL_EXPIRY_MS).toISOString();
      await base44.entities.VoiceSignal.create({
        from_user_id: user.id,
        to_user_id: toUserId,
        signal_type: signalType,
        signal_data: signalData,
        status: "pending",
        expires_at: expiresAt,
      });
    } catch {
      // Silently skip
    }
  }, [user]);

  // ── Process an incoming signal ──────────────────────────────────────────
  const handleIncomingSignal = useCallback(
    async (signal) => {
      if (!isMicEnabled || !localStreamRef.current) return;
      if (signal.from_user_id === user?.id) return; // Skip own signals
      if (signal.to_user_id !== user?.id) return;    // Not for us
      if (signal.status !== "pending") return;

      const sigId = signal.id;
      if (pendingSignalsRef.current.has(sigId)) return;
      pendingSignalsRef.current.add(sigId);

      try {
        // Mark as processed
        await base44.entities.VoiceSignal.update(sigId, { status: "processed" });

        const remoteUserId = signal.from_user_id;
        const signalData = JSON.parse(signal.signal_data);

        if (signal.signal_type === "offer") {
          // Someone wants to connect — create peer connection and answer
          let pc = peerConnectionsRef.current[remoteUserId];
          if (!pc) {
            pc = await createPeerConnection(remoteUserId);
          }
          if (!pc) return;

          await pc.setRemoteDescription(new RTCSessionDescription(signalData));
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          await sendSignal(remoteUserId, "answer", JSON.stringify(answer));
        } else if (signal.signal_type === "answer") {
          // Our offer was accepted
          const pc = peerConnectionsRef.current[remoteUserId];
          if (pc && pc.signalingState !== "stable") {
            await pc.setRemoteDescription(new RTCSessionDescription(signalData));
          }
        } else if (signal.signal_type === "ice_candidate") {
          // ICE candidate from remote peer
          const pc = peerConnectionsRef.current[remoteUserId];
          if (pc) {
            try {
              await pc.addIceCandidate(new RTCIceCandidate(signalData));
            } catch {
              // Candidate may arrive before remote description — ignore
            }
          }
        }
      } catch (err) {
        console.warn("[ProximityVoice] Signal processing error:", err.message);
      } finally {
        pendingSignalsRef.current.delete(sigId);
      }
    },
    [user, isMicEnabled, createPeerConnection, sendSignal]
  );

  // ── Subscribe to incoming voice signals ─────────────────────────────────
  useEffect(() => {
    if (!user?.id) return;

    // Initial load — process any pending signals meant for us
    (async () => {
      try {
        const signals = await base44.entities.VoiceSignal.filter({
          to_user_id: user.id,
          status: "pending",
        });
        for (const sig of signals) {
          await handleIncomingSignal(sig);
        }
      } catch {}
    })();

    const unsubscribe = base44.entities.VoiceSignal.subscribe((event) => {
      if (event.type === "create" && event.data) {
        handleIncomingSignal(event.data);
      }
    });

    signalSubRef.current = unsubscribe;

    return () => {
      unsubscribe();
      signalSubRef.current = null;
    };
  }, [user?.id, handleIncomingSignal]);

  // ── Cleanup stale signals periodically ──────────────────────────────────
  useEffect(() => {
    if (!user?.id) return;

    cleanupTimerRef.current = setInterval(async () => {
      try {
        const cutoff = new Date(Date.now() - SIGNAL_EXPIRY_MS).toISOString();
        const stale = await base44.entities.VoiceSignal.filter({
          expires_at: { $lt: cutoff },
        });
        // Delete in batches, but limit to 20 at a time to avoid overload
        const batch = stale.slice(0, 20);
        for (const sig of batch) {
          try {
            await base44.entities.VoiceSignal.delete(sig.id);
          } catch {}
        }
      } catch {}
    }, SIGNAL_CLEANUP_MS);

    return () => {
      if (cleanupTimerRef.current) clearInterval(cleanupTimerRef.current);
    };
  }, [user?.id]);

  // ── Proximity check loop — manage connections based on distance ─────────
  useEffect(() => {
    if (!isMicEnabled || !user?.id) return;

    const checkProximity = () => {
      const myPos = playerPosRef.current;
      if (!myPos) return;

      const nearbyIds = new Set();
      const connectedIds = new Set(Object.keys(peerConnectionsRef.current));

      // Find nearby users
      for (const remote of remoteUsers || []) {
        if (!remote?.user_id || remote.user_id === user.id) continue;

        const dx = myPos.x - (remote.pos_x || 0);
        const dz = myPos.z - (remote.pos_z || 0);
        const dist = Math.sqrt(dx * dx + dz * dz);

        if (dist <= PROXIMITY_RADIUS) {
          nearbyIds.add(remote.user_id);

          // Connect if not already connected
          if (!connectedIds.has(remote.user_id)) {
            createPeerConnection(remote.user_id);
          }

          // Adjust volume based on distance
          const gainNode = gainNodesRef.current[remote.user_id];
          if (gainNode) {
            const volume = Math.max(0, 1 - dist / PROXIMITY_RADIUS);
            gainNode.gain.setTargetAtTime(volume, getAudioCtx().currentTime, 0.1);
          }
        }
      }

      // Disconnect users who left proximity
      for (const id of connectedIds) {
        if (!nearbyIds.has(id)) {
          closePeerConnection(id);
        }
      }

      setVoicePeers(Array.from(nearbyIds));
    };

    checkProximity();
    const timer = setInterval(checkProximity, CONNECTION_CHECK_MS);

    return () => clearInterval(timer);
  }, [isMicEnabled, user?.id, remoteUsers, createPeerConnection, closePeerConnection, getAudioCtx]);

  return {
    isMicEnabled,
    toggleMic,
    voicePeers,
    isConnected: voicePeers.length > 0,
  };
}