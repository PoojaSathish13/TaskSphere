"use client";

import React, { useState, useEffect } from "react";
import { PublicNavbar } from "@/shared/components/layout/PublicNavbar";
import { PublicFooter } from "@/shared/components/layout/PublicFooter";
import { 
  Building, 
  Mail, 
  HelpCircle, 
  Activity, 
  CheckCircle,
  AlertCircle 
} from "lucide-react";

export default function ContactPage() {
  const [hasMounted, setHasMounted] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("General Support Request");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  if (!hasMounted) {
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name || !email || !message) {
      setError("Please fill in all required fields.");
      return;
    }

    setIsSubmitting(true);
    // Simulate API delay
    setTimeout(() => {
      setIsSubmitting(false);
      setSubmitted(true);
      setName("");
      setEmail("");
      setMessage("");
    }, 1200);
  };

  const supportChannels = [
    {
      title: "Help Center Documentation",
      desc: "Find setup guides, API keys references, and settings tutorials.",
      actionText: "Browse Docs",
      icon: <HelpCircle className="h-5 w-5 text-indigo-400" />
    },
    {
      title: "Email Support Desk",
      desc: "Get in touch directly with our support team at support@tasksphere.com.",
      actionText: "Send Email",
      icon: <Mail className="h-5 w-5 text-indigo-400" />
    },
    {
      title: "System Status Page",
      desc: "Check active API uptimes and service dashboard statistics.",
      actionText: "View Status",
      icon: <Activity className="h-5 w-5 text-indigo-400" />
    }
  ];

  return (
    <div className="min-h-screen flex flex-col bg-[#0a0a0c] text-foreground transition-linear">
      <PublicNavbar />

      <main className="flex-1 max-w-6xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-16 space-y-16">
        {/* Header */}
        <section className="text-center max-w-3xl mx-auto space-y-4">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight leading-tight">
            We are Here to{" "}
            <span className="bg-gradient-to-r from-primary to-indigo-400 bg-clip-text text-transparent">
              Support Your Team.
            </span>
          </h1>
          <p className="text-muted-foreground text-xs sm:text-sm leading-relaxed max-w-lg mx-auto">
            Have questions about billing, tenant configurations, or self-hosted enterprise setups? Get in touch.
          </p>
        </section>

        {/* Contact Form and Channels Section */}
        <section className="grid lg:grid-cols-12 gap-12 items-start">
          {/* Support Channels */}
          <div className="lg:col-span-5 space-y-6">
            <h2 className="text-lg font-bold tracking-tight">Direct Support Channels</h2>
            <div className="space-y-4">
              {supportChannels.map((channel) => (
                <div
                  key={channel.title}
                  className="bg-glass border border-border/40 p-5 rounded-2xl space-y-2.5 shadow-md"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
                      {channel.icon}
                    </div>
                    <h3 className="font-extrabold text-xs text-foreground">{channel.title}</h3>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">{channel.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Form */}
          <div className="lg:col-span-7 bg-glass border border-border/40 p-8 rounded-2xl shadow-xl relative overflow-hidden">
            <div className="absolute -top-24 -left-24 h-48 w-48 rounded-full bg-primary/5 blur-2xl pointer-events-none" />
            
            <h2 className="text-lg font-bold tracking-tight mb-6">Send an Inquiry</h2>

            {submitted ? (
              <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-6 text-center space-y-3">
                <CheckCircle className="h-10 w-10 text-emerald-500 mx-auto" />
                <h3 className="font-bold text-sm text-foreground">Message Sent Successfully</h3>
                <p className="text-xs text-muted-foreground leading-relaxed max-w-xs mx-auto">
                  Thank you! Your ticket has been received. Our support engineers will reach out to you within 24 hours.
                </p>
                <button
                  onClick={() => setSubmitted(false)}
                  className="mt-2 text-xs font-semibold text-primary hover:underline"
                >
                  Send another message
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4 relative z-10">
                {error && (
                  <div className="rounded-lg bg-rose-500/10 border border-rose-500/20 p-3 text-xs text-rose-500 font-semibold flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-rose-500 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label htmlFor="contact-name" className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Full Name</label>
                    <input
                      id="contact-name"
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full bg-background border border-input rounded-xl px-3.5 py-2.5 text-xs text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition"
                      placeholder="Jane Doe"
                    />
                  </div>
                  <div className="space-y-1">
                    <label htmlFor="contact-email" className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Email Address</label>
                    <input
                      id="contact-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full bg-background border border-input rounded-xl px-3.5 py-2.5 text-xs text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition"
                      placeholder="jane@organization.com"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label htmlFor="contact-subject" className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Subject Inquiry</label>
                  <select
                    id="contact-subject"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="w-full bg-background border border-input rounded-xl px-3.5 py-2.5 text-xs text-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition"
                  >
                    <option value="General Support Request">General Support Request</option>
                    <option value="Billing & Pricing Details">Billing & Pricing Details</option>
                    <option value="Enterprise Self-Hosted License">Enterprise Self-Hosted License</option>
                    <option value="Report Platform Security Vulnerability">Report Platform Security Vulnerability</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label htmlFor="contact-message" className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Message</label>
                  <textarea
                    id="contact-message"
                    rows={4}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    className="w-full bg-background border border-input rounded-xl px-3.5 py-2.5 text-xs text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition resize-none"
                    placeholder="Describe how we can help your workspace..."
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-2.5 bg-primary hover:bg-primary/95 disabled:opacity-60 text-primary-foreground font-bold text-xs rounded-xl transition shadow-lg shadow-primary/10 flex items-center justify-center gap-1.5"
                >
                  {isSubmitting ? "Sending Ticket..." : "Submit Inquiry"}
                </button>
              </form>
            )}
          </div>
        </section>
      </main>

      <PublicFooter />
    </div>
  );
}
