import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import {
  MessageCircle, Clock, Check, X, Users, ArrowLeft,
  Loader2, AlertTriangle,
} from "lucide-react";

export default function ChatRequests() {
  const { user, isAuthenticated, navigateToLogin } = useAuth();
  const navigate = useNavigate();
  const [incoming, setIncoming] = useState([]);
  const [outgoing, setOutgoing] = useState([]);
  const [connected, setConnected] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const [inc, out, acc] = await Promise.all([
        base44.entities.PrivateChatRequest.filter({
          to_user_id: user.id,
          status: "pending",
        }),
        base44.entities.PrivateChatRequest.filter({
          from_user_id: user.id,
          status: "pending",
        }),
        base44.entities.PrivateChatRequest.filter({
          status: "accepted",
        }),
      ]);

      // Filter accepted: only where current user is involved
      const myAccepted = acc.filter(
        (r) => r.from_user_id === user.id || r.to_user_id === user.id
      );

      setIncoming(inc);
      setOutgoing(out);
      setConnected(myAccepted);
    } catch (e) {
      setError("Failed to load connections");
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (isAuthenticated && user) {
      fetchData();
    }
  }, [isAuthenticated, user, fetchData]);

  // Only redirect after we're sure auth has resolved and user isn't logged in
  useEffect(() => {
    if (isAuthenticated === false) {
      navigateToLogin(window.location.origin + "/connections");
    }
  }, [isAuthenticated, navigateToLogin]);

  const handleAccept = async (requestId, fromUserId, fromUsername) => {
    setActionLoading(requestId);
    try {
      await base44.entities.PrivateChatRequest.update(requestId, { status: "accepted" });
      setIncoming((prev) => prev.filter((r) => r.id !== requestId));
      setConnected((prev) => [
        ...prev,
        {
          id: requestId,
          from_user_id: fromUserId,
          from_username: fromUsername,
          to_user_id: user.id,
          to_username: user.full_name || "You",
          status: "accepted",
        },
      ]);
    } catch {}
    setActionLoading(null);
  };

  const handleDecline = async (requestId) => {
    setActionLoading(requestId);
    try {
      await base44.entities.PrivateChatRequest.update(requestId, { status: "declined" });
      setIncoming((prev) => prev.filter((r) => r.id !== requestId));
    } catch {}
    setActionLoading(null);
  };

  const handleCancel = async (requestId) => {
    setActionLoading(requestId);
    try {
      await base44.entities.PrivateChatRequest.update(requestId, { status: "expired" });
      setOutgoing((prev) => prev.filter((r) => r.id !== requestId));
    } catch {}
    setActionLoading(null);
  };

  const handleDisconnect = async (requestId) => {
    setActionLoading(requestId);
    try {
      await base44.entities.PrivateChatRequest.update(requestId, { status: "expired" });
      setConnected((prev) => prev.filter((r) => r.id !== requestId));
    } catch {}
    setActionLoading(null);
  };

  // While checking auth, show nothing
  if (isAuthenticated === undefined || (isAuthenticated && !user)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isAuthenticated) return null;

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-4 py-8" style={{ paddingTop: "calc(env(safe-area-inset-top, 0px) + 2rem)" }}>
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <button
            onClick={() => navigate(-1)}
            className="w-10 h-10 rounded-xl flex items-center justify-center transition-all hover:bg-muted"
            style={{ minWidth: 40, minHeight: 40 }}
          >
            <ArrowLeft className="w-5 h-5 text-muted-foreground" />
          </button>
          <div>
            <h1 className="font-heading font-black text-2xl text-foreground">Your Connections</h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Manage chat requests and active connections
            </p>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">{error}</p>
            <button
              onClick={fetchData}
              className="mt-4 text-sm font-bold text-primary underline"
            >
              Try again
            </button>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Incoming Requests */}
            <Section
              title="Incoming Requests"
              icon={MessageCircle}
              count={incoming.length}
              accent="purple"
              emptyMessage="No pending incoming requests"
            >
              <AnimatePresence>
                {incoming.map((req) => (
                  <motion.div
                    key={req.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="flex items-center gap-4 p-4 rounded-2xl"
                    style={{
                      background: "rgba(155,126,255,0.06)",
                      border: "1px solid rgba(155,126,255,0.15)",
                    }}
                  >
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                      style={{ background: "rgba(155,126,255,0.15)" }}
                    >
                      <span className="text-sm font-black text-purple-300">
                        {req.from_username?.[0]?.toUpperCase() || "?"}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-foreground">
                        {req.from_username || "Unknown User"}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        wants to start a 1-on-1 chat
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        onClick={() => handleDecline(req.id)}
                        disabled={actionLoading === req.id}
                        className="w-9 h-9 rounded-xl flex items-center justify-center transition-all hover:bg-destructive/10"
                        style={{
                          background: "rgba(255,255,255,0.05)",
                          border: "1px solid rgba(255,255,255,0.1)",
                          color: "rgba(255,255,255,0.5)",
                          minWidth: 36,
                          minHeight: 36,
                        }}
                      >
                        {actionLoading === req.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <X className="w-4 h-4" />
                        )}
                      </button>
                      <button
                        onClick={() => handleAccept(req.id, req.from_user_id, req.from_username)}
                        disabled={actionLoading === req.id}
                        className="w-9 h-9 rounded-xl flex items-center justify-center transition-all hover:brightness-110"
                        style={{
                          background: "linear-gradient(135deg,#00C853,#00E676)",
                          color: "#000",
                          minWidth: 36,
                          minHeight: 36,
                        }}
                      >
                        {actionLoading === req.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Check className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </Section>

            {/* Outgoing Requests */}
            <Section
              title="Sent Requests"
              icon={Clock}
              count={outgoing.length}
              accent="cyan"
              emptyMessage="No pending sent requests"
            >
              <AnimatePresence>
                {outgoing.map((req) => (
                  <motion.div
                    key={req.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="flex items-center gap-4 p-4 rounded-2xl"
                    style={{
                      background: "rgba(0,160,220,0.05)",
                      border: "1px solid rgba(0,160,220,0.12)",
                    }}
                  >
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                      style={{ background: "rgba(0,160,220,0.12)" }}
                    >
                      <span className="text-sm font-black text-cyan-300">
                        {req.to_username?.[0]?.toUpperCase() || "?"}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-foreground">
                        {req.to_username || "Unknown User"}
                      </p>
                      <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        Waiting for response
                      </p>
                    </div>
                    <button
                      onClick={() => handleCancel(req.id)}
                      disabled={actionLoading === req.id}
                      className="px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all hover:bg-destructive/10 flex-shrink-0"
                      style={{
                        background: "rgba(255,255,255,0.05)",
                        border: "1px solid rgba(255,255,255,0.1)",
                        color: "rgba(255,255,255,0.45)",
                        minHeight: 32,
                      }}
                    >
                      {actionLoading === req.id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        "Cancel"
                      )}
                    </button>
                  </motion.div>
                ))}
              </AnimatePresence>
            </Section>

            {/* Active Connections */}
            <Section
              title="Active Connections"
              icon={Users}
              count={connected.length}
              accent="green"
              emptyMessage="No active connections yet"
            >
              <AnimatePresence>
                {connected.map((req) => {
                  const isInitiator = req.from_user_id === user.id;
                  const peerName = isInitiator ? req.to_username : req.from_username;
                  return (
                    <motion.div
                      key={req.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="flex items-center gap-4 p-4 rounded-2xl"
                      style={{
                        background: "rgba(0,200,83,0.05)",
                        border: "1px solid rgba(0,200,83,0.12)",
                      }}
                    >
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                        style={{ background: "rgba(0,200,83,0.12)" }}
                      >
                        <span className="text-sm font-black text-green-300">
                          {peerName?.[0]?.toUpperCase() || "?"}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-foreground">
                          {peerName || "Unknown User"}
                        </p>
                        <p className="text-[11px] text-green-400/60">
                          Connected — chat available in Vibe World
                        </p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span
                          className="px-2.5 py-1 rounded-full text-[9px] font-bold"
                          style={{
                            background: "rgba(0,200,83,0.15)",
                            color: "rgba(0,200,83,0.8)",
                          }}
                        >
                          Active
                        </span>
                        <button
                          onClick={() => handleDisconnect(req.id)}
                          disabled={actionLoading === req.id}
                          className="px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all hover:bg-destructive/10 flex-shrink-0"
                          style={{
                            background: "rgba(255,255,255,0.05)",
                            border: "1px solid rgba(255,255,255,0.1)",
                            color: "rgba(255,255,255,0.45)",
                            minHeight: 32,
                          }}
                        >
                          {actionLoading === req.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            "Disconnect"
                          )}
                        </button>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </Section>

            {/* Safety note */}
            <div
              className="flex items-start gap-2 p-3 rounded-xl"
              style={{
                background: "rgba(245,168,0,0.04)",
                border: "1px solid rgba(245,168,0,0.1)",
              }}
            >
              <AlertTriangle className="w-4 h-4 text-yellow-400/50 flex-shrink-0 mt-0.5" />
              <p className="text-[10px] text-yellow-400/50 leading-relaxed">
                Never share personal information, phone numbers, or payment details in chat. Report any inappropriate behavior immediately.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Section({ title, icon: Icon, count, accent, emptyMessage, children }) {
  const accentColors = {
    purple: { bg: "rgba(155,126,255,0.08)", text: "#A78BFA" },
    cyan: { bg: "rgba(0,160,220,0.08)", text: "#22D3EE" },
    green: { bg: "rgba(0,200,83,0.08)", text: "#4ADE80" },
  };
  const colors = accentColors[accent] || accentColors.purple;

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: colors.bg }}>
          <Icon className="w-3.5 h-3.5" style={{ color: colors.text }} />
        </div>
        <h2 className="font-heading font-black text-sm text-foreground">{title}</h2>
        {count > 0 && (
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: colors.bg, color: colors.text }}>
            {count}
          </span>
        )}
      </div>

      {count === 0 ? (
        <div className="py-8 text-center rounded-2xl" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)" }}>
          <p className="text-xs text-muted-foreground/50">{emptyMessage}</p>
        </div>
      ) : (
        <div className="space-y-2">{children}</div>
      )}
    </div>
  );
}