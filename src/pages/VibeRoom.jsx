import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, ShieldCheck, Users, Trash2, Mic2, Ban } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import AgeGateModal, { hasConfirmedAge } from "../components/viberoom/AgeGateModal";
import Footer from "../components/shared/Footer";

export default function VibeRoom() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  const [ageConfirmed, setAgeConfirmed] = useState(() => hasConfirmedAge(user));
  const [showGate, setShowGate] = useState(!hasConfirmedAge(user));

  const [messages, setMessages] = useState([]);
  const [bans, setBans] = useState([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  const isBanned = bans.some((b) => b.user_email === user?.email && b.action === "banned");
  const isMuted = bans.some((b) => b.user_email === user?.email && b.action === "muted");

  useEffect(() => {
    if (!ageConfirmed) return;
    setLoading(true);
    Promise.all([
      base44.entities.VibeRoomMessage.filter({ is_hidden: false }, "created_date", 100),
      base44.entities.VibeRoomBan.list("created_date", 200),
    ]).then(([msgs, banList]) => {
      setMessages(msgs);
      setBans(banList);
      setLoading(false);
    });
  }, [ageConfirmed]);

  // Real-time subscription
  useEffect(() => {
    if (!ageConfirmed) return;
    const unsub = base44.entities.VibeRoomMessage.subscribe((event) => {
      if (event.type === "create" && !event.data?.is_hidden) {
        setMessages((prev) => [...prev, event.data]);
      } else if (event.type === "update") {
        setMessages((prev) =>
          event.data?.is_hidden
            ? prev.filter((m) => m.id !== event.id)
            : prev.map((m) => (m.id === event.id ? event.data : m))
        );
      } else if (event.type === "delete") {
        setMessages((prev) => prev.filter((m) => m.id !== event.id));
      }
    });
    return unsub;
  }, [ageConfirmed]);

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || sending || isBanned || isMuted || !user) return;
    const text = input.trim();
    setInput("");
    setSending(true);
    await base44.entities.VibeRoomMessage.create({
      user_email: user.email,
      user_name: user.full_name || user.email.split("@")[0],
      content: text,
      is_hidden: false,
    });
    setSending(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  // Admin actions
  const handleHide = async (msg) => {
    await base44.entities.VibeRoomMessage.update(msg.id, { is_hidden: true });
  };

  const handleMute = async (email) => {
    const existing = bans.find((b) => b.user_email === email);
    if (existing) {
      await base44.entities.VibeRoomBan.update(existing.id, { action: "muted" });
      setBans((prev) => prev.map((b) => b.id === existing.id ? { ...b, action: "muted" } : b));
    } else {
      const nb = await base44.entities.VibeRoomBan.create({
        user_email: email, action: "muted", applied_by: user.email
      });
      setBans((prev) => [...prev, nb]);
    }
  };

  const handleBan = async (email) => {
    const existing = bans.find((b) => b.user_email === email);
    if (existing) {
      await base44.entities.VibeRoomBan.update(existing.id, { action: "banned" });
      setBans((prev) => prev.map((b) => b.id === existing.id ? { ...b, action: "banned" } : b));
    } else {
      const nb = await base44.entities.VibeRoomBan.create({
        user_email: email, action: "banned", applied_by: user.email
      });
      setBans((prev) => [...prev, nb]);
    }
  };

  const handleUnban = async (email) => {
    const existing = bans.find((b) => b.user_email === email);
    if (existing) {
      await base44.entities.VibeRoomBan.delete(existing.id);
      setBans((prev) => prev.filter((b) => b.id !== existing.id));
    }
  };

  // Age gate screen
  if (showGate) {
    return (
      <AgeGateModal
        open={true}
        user={user}
        onConfirm={() => { setAgeConfirmed(true); setShowGate(false); }}
      />
    );
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ WebkitOverflowScrolling: "touch" }}>
      {/* Header */}
      <section className="relative overflow-hidden flex-shrink-0"
        style={{ background: "linear-gradient(180deg,rgba(155,126,255,0.08) 0%,transparent 100%)" }}>
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[200px] rounded-full blur-[100px] opacity-[0.06] pointer-events-none"
          style={{ background: "#9B7EFF" }} />
        <div className="max-w-3xl mx-auto px-6 relative z-10"
          style={{ paddingTop: "max(4.5rem, calc(3rem + env(safe-area-inset-top, 0px)))", paddingBottom: "1.25rem" }}>
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
            <div className="flex items-center gap-3 flex-wrap">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-sm"
                style={{ background: "rgba(155,126,255,0.08)", border: "1px solid rgba(155,126,255,0.2)" }}>
                <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: "#9B7EFF" }} />
                <span style={{ fontSize: "9px", letterSpacing: "0.35em", fontWeight: 900, textTransform: "uppercase", color: "#9B7EFF", fontFamily: "var(--font-heading)" }}>
                  Live Chat
                </span>
              </div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full"
                style={{ background: "rgba(155,126,255,0.08)", border: "1px solid rgba(155,126,255,0.2)" }}>
                <ShieldCheck className="w-3 h-3 text-purple-400" />
                <span className="text-[10px] font-black tracking-widest uppercase text-purple-300">18+ Positive Community</span>
              </div>
            </div>
            <h1 className="font-heading font-black text-white mt-2 leading-tight"
              style={{ fontSize: "clamp(1.7rem, 5vw, 2.8rem)" }}>
              Vibe Room
            </h1>
            <p className="text-white/30 text-xs mt-1">Connect with other Upper Vibe listeners</p>
          </motion.div>
        </div>
      </section>

      {/* Chat area */}
      <div className="flex-1 max-w-3xl w-full mx-auto px-4 sm:px-6 flex flex-col"
        style={{ paddingBottom: "calc(7rem + env(safe-area-inset-bottom, 16px))" }}>

        {loading ? (
          <div className="flex-1 flex items-center justify-center py-20">
            <div className="w-6 h-6 border-2 border-purple-400/20 border-t-purple-400 rounded-full animate-spin" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center py-20 text-center">
            <Users className="w-10 h-10 text-white/10 mb-3" />
            <p className="text-white/25 text-sm">No messages yet. Start the vibe!</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2 py-4">
            {messages.map((msg, i) => {
              const isOwn = msg.user_email === user?.email;
              const userBanStatus = bans.find((b) => b.user_email === msg.user_email);
              return (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(i * 0.01, 0.2) }}
                  className={`flex gap-2.5 items-end ${isOwn ? "flex-row-reverse" : ""}`}>
                  {/* Avatar */}
                  <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-[10px] font-black"
                    style={{ background: isOwn ? "rgba(155,126,255,0.25)" : "rgba(0,200,220,0.15)", color: isOwn ? "#9B7EFF" : "#00C9E0" }}>
                    {(msg.user_name || msg.user_email || "?")[0].toUpperCase()}
                  </div>

                  {/* Bubble */}
                  <div className={`max-w-[75%] group relative`}>
                    {!isOwn && (
                      <p className="text-[9px] font-bold text-white/30 mb-1 px-1 truncate">{msg.user_name || msg.user_email}</p>
                    )}
                    <div className="px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed"
                      style={isOwn ? {
                        background: "rgba(155,126,255,0.18)",
                        border: "1px solid rgba(155,126,255,0.3)",
                        color: "#e8e0ff",
                        borderBottomRightRadius: "6px",
                      } : {
                        background: "rgba(255,255,255,0.05)",
                        border: "1px solid rgba(255,255,255,0.08)",
                        color: "rgba(255,255,255,0.85)",
                        borderBottomLeftRadius: "6px",
                      }}>
                      {msg.content}
                    </div>

                    {/* Admin action buttons */}
                    {isAdmin && !isOwn && (
                      <div className="absolute -top-7 right-0 hidden group-hover:flex items-center gap-1 px-2 py-1 rounded-xl"
                        style={{ background: "rgba(10,10,30,0.95)", border: "1px solid rgba(255,255,255,0.1)" }}>
                        <button onClick={() => handleHide(msg)} title="Remove message"
                          className="p-1 rounded-lg hover:bg-red-500/20 text-red-400 transition-colors">
                          <Trash2 className="w-3 h-3" />
                        </button>
                        <button onClick={() => handleMute(msg.user_email)} title="Mute user"
                          className="p-1 rounded-lg hover:bg-yellow-500/20 text-yellow-400 transition-colors">
                          <Mic2 className="w-3 h-3" />
                        </button>
                        <button onClick={() => handleBan(msg.user_email)} title="Ban user"
                          className="p-1 rounded-lg hover:bg-red-600/20 text-red-500 transition-colors">
                          <Ban className="w-3 h-3" />
                        </button>
                        {userBanStatus && (
                          <button onClick={() => handleUnban(msg.user_email)} title="Remove ban/mute"
                            className="p-1 rounded-lg hover:bg-green-500/20 text-green-400 transition-colors text-[9px] font-bold px-1.5">
                            Unban
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {/* Input bar — fixed above bottom nav */}
      <div className="fixed left-0 right-0 z-30 flex justify-center px-4"
        style={{ bottom: "calc(3.5rem + env(safe-area-inset-bottom, 8px))" }}>
        <div className="w-full max-w-3xl">
          {isBanned ? (
            <div className="flex items-center justify-center gap-2 py-3 px-5 rounded-2xl text-sm text-red-400"
              style={{ background: "rgba(220,50,50,0.08)", border: "1px solid rgba(220,50,50,0.2)" }}>
              <Ban className="w-4 h-4" /> You have been banned from Vibe Room.
            </div>
          ) : isMuted ? (
            <div className="flex items-center justify-center gap-2 py-3 px-5 rounded-2xl text-sm text-yellow-400"
              style={{ background: "rgba(234,179,8,0.08)", border: "1px solid rgba(234,179,8,0.2)" }}>
              <Mic2 className="w-4 h-4" /> You have been muted by a moderator.
            </div>
          ) : !user ? (
            <div className="flex items-center justify-center gap-3 py-3 px-5 rounded-2xl"
              style={{ background: "rgba(155,126,255,0.06)", border: "1px solid rgba(155,126,255,0.18)" }}>
              <p className="text-sm text-white/40">Log in to join the conversation</p>
              <button onClick={() => base44.auth.redirectToLogin()}
                className="px-4 py-1.5 rounded-xl font-black text-xs tracking-wider transition-all hover:brightness-110"
                style={{ background: "rgba(155,126,255,0.2)", border: "1px solid rgba(155,126,255,0.35)", color: "#9B7EFF" }}>
                Log In
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2"
              style={{ background: "rgba(10,10,25,0.95)", border: "1px solid rgba(155,126,255,0.2)", borderRadius: "1rem", padding: "0.5rem 0.5rem 0.5rem 1rem", backdropFilter: "blur(20px)" }}>
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Send a vibe..."
                maxLength={500}
                className="flex-1 bg-transparent text-sm text-white placeholder:text-white/25 focus:outline-none"
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || sending}
                className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-all disabled:opacity-40 active:scale-95"
                style={{ background: "linear-gradient(135deg,#7C3AED,#9B7EFF)", color: "#fff" }}>
                <Send className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>

      <Footer />
    </div>
  );
}