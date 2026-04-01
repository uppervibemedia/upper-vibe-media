import React, { useState } from "react";
import { motion } from "framer-motion";
import { Send, Mail, MessageSquare, ArrowRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import SectionHeader from "../components/shared/SectionHeader";
import GlowButton from "../components/shared/GlowButton";
import Footer from "../components/shared/Footer";

export default function Contact() {
  const [contactForm, setContactForm] = useState({ name: "", email: "", message: "" });
  const [newsletterEmail, setNewsletterEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [subscribing, setSubscribing] = useState(false);

  const handleContact = async (e) => {
    e.preventDefault();
    setSending(true);
    await base44.entities.ContactMessage.create({
      ...contactForm,
      type: "contact",
    });
    toast.success("Message sent! We'll get back to you soon.");
    setContactForm({ name: "", email: "", message: "" });
    setSending(false);
  };

  const handleNewsletter = async (e) => {
    e.preventDefault();
    setSubscribing(true);
    await base44.entities.ContactMessage.create({
      name: "Newsletter Subscriber",
      email: newsletterEmail,
      message: "Newsletter signup",
      type: "newsletter",
    });
    toast.success("Welcome to the frequency! Check your inbox.");
    setNewsletterEmail("");
    setSubscribing(false);
  };

  return (
    <div>
      <div className="max-w-7xl mx-auto px-6 py-16 md:py-24">
        <div className="text-center mb-16">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <p className="text-xs tracking-[0.3em] uppercase text-primary mb-4 text-glow-blue">Get In Touch</p>
            <h1 className="font-heading font-extrabold text-4xl md:text-6xl tracking-tight mb-4">
              Join the <span className="text-secondary text-glow-gold">Movement</span>
            </h1>
            <p className="text-muted-foreground max-w-md mx-auto">
              Have a question, collaboration idea, or want to join the Upper Vibe community? We'd love to hear from you.
            </p>
          </motion.div>
        </div>

        <div className="grid md:grid-cols-2 gap-12 max-w-4xl mx-auto">
          {/* Contact form */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
          >
            <div className="flex items-center gap-2 mb-6">
              <MessageSquare className="w-4 h-4 text-primary" />
              <h2 className="font-heading font-bold text-lg">Send a Message</h2>
            </div>
            <form onSubmit={handleContact} className="space-y-4">
              <Input
                placeholder="Your name"
                value={contactForm.name}
                onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
                required
                className="bg-card/40 border-border/30 focus:border-primary/50"
              />
              <Input
                type="email"
                placeholder="Your email"
                value={contactForm.email}
                onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                required
                className="bg-card/40 border-border/30 focus:border-primary/50"
              />
              <Textarea
                placeholder="Your message"
                value={contactForm.message}
                onChange={(e) => setContactForm({ ...contactForm, message: e.target.value })}
                required
                rows={5}
                className="bg-card/40 border-border/30 focus:border-primary/50 resize-none"
              />
              <Button
                type="submit"
                disabled={sending}
                className="w-full bg-primary text-primary-foreground hover:bg-primary/90 font-heading font-semibold tracking-wider uppercase"
              >
                {sending ? "Sending..." : "Send Message"}
                <Send className="w-4 h-4 ml-2" />
              </Button>
            </form>
          </motion.div>

          {/* Newsletter signup */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
          >
            <div className="flex items-center gap-2 mb-6">
              <Mail className="w-4 h-4 text-secondary" />
              <h2 className="font-heading font-bold text-lg">Join the Newsletter</h2>
            </div>
            <div className="rounded-xl p-6 bg-card/40 border border-border/20 mb-6">
              <p className="text-sm text-muted-foreground leading-relaxed mb-6">
                Be the first to know about new releases, exclusive drops, and community events.
                Join the Upper Vibe frequency.
              </p>
              <form onSubmit={handleNewsletter} className="space-y-3">
                <Input
                  type="email"
                  placeholder="Enter your email"
                  value={newsletterEmail}
                  onChange={(e) => setNewsletterEmail(e.target.value)}
                  required
                  className="bg-muted/30 border-border/30 focus:border-secondary/50"
                />
                <Button
                  type="submit"
                  disabled={subscribing}
                  className="w-full bg-secondary text-secondary-foreground hover:bg-secondary/90 font-heading font-semibold tracking-wider uppercase"
                >
                  {subscribing ? "Joining..." : "Subscribe"}
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </form>
            </div>

            <div className="rounded-xl p-6 bg-accent/20 border border-secondary/10">
              <h3 className="font-heading font-bold text-sm mb-2 text-secondary">Join the Community</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Upper Vibe is more than a music platform. It's a collective of elevated listeners,
                conscious creators, and frequency seekers. Your journey into high-vibration audio starts here.
              </p>
            </div>
          </motion.div>
        </div>
      </div>

      <Footer />
    </div>
  );
}