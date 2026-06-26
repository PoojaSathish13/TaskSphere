"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { PublicNavbar } from "@/shared/components/layout/PublicNavbar";
import { PublicFooter } from "@/shared/components/layout/PublicFooter";
import { 
  Building, 
  ShieldCheck, 
  Zap, 
  Users, 
  ArrowRight,
  TrendingUp
} from "lucide-react";

export default function AboutPage() {
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  if (!hasMounted) {
    return null;
  }

  const values = [
    {
      title: "Data Security & Tenant Isolation",
      desc: "We ensure complete database separation between organizations, safeguarding confidential work tickets, audits, and configurations.",
      icon: <ShieldCheck className="h-5 w-5 text-indigo-400" />
    },
    {
      title: "High Velocity Flow",
      desc: "Our platform features immediate keyboard shortcuts, quick standup inputs, and drag-and-drop boards to keep your operations agile.",
      icon: <Zap className="h-5 w-5 text-indigo-400" />
    },
    {
      title: "Radical Transparency",
      desc: "With real-time Team Pulse tracking and an integrated client portal, managers and clients are always aligned on billing, hours, and blockers.",
      icon: <TrendingUp className="h-5 w-5 text-indigo-400" />
    }
  ];

  return (
    <div className="min-h-screen flex flex-col bg-[#0a0a0c] text-foreground transition-linear">
      <PublicNavbar />

      <main className="flex-1 max-w-6xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-16 space-y-16">
        {/* Hero Section */}
        <section className="text-center max-w-3xl mx-auto space-y-4">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight leading-tight">
            Our Mission is to Simplify{" "}
            <span className="bg-gradient-to-r from-primary to-indigo-400 bg-clip-text text-transparent">
              Enterprise Work.
            </span>
          </h1>
          <p className="text-muted-foreground text-xs sm:text-sm md:text-base leading-relaxed">
            TaskSphere was built by engineers who were tired of heavy, slow task managers. We created a fast, multi-tenant work management hub that integrates tasks, timesheets, and client communication into a single interface.
          </p>
        </section>

        {/* Core Values Section */}
        <section className="space-y-8 border-t border-border/40 pt-16">
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-extrabold tracking-tight">Our Core Values</h2>
            <p className="text-muted-foreground text-xs max-w-md mx-auto">
              How we build, support, and scale our SaaS platform for global organization workspaces.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 pt-4">
            {values.map((val) => (
              <div
                key={val.title}
                className="bg-glass border border-border/40 p-6 rounded-2xl space-y-3 shadow-md"
              >
                <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  {val.icon}
                </div>
                <h3 className="font-bold text-sm text-foreground">{val.title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{val.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* CTA Banner */}
        <section className="bg-glass border border-border/40 p-8 rounded-2xl text-center space-y-4 max-w-4xl mx-auto shadow-xl relative overflow-hidden">
          <div className="absolute -top-24 -right-24 h-48 w-48 rounded-full bg-primary/5 blur-2xl pointer-events-none" />
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight">Ready to Align Your Organization?</h2>
          <p className="text-xs text-muted-foreground max-w-md mx-auto leading-relaxed">
            Start a workspace for your team today and experience secure multi-tenancy, clean timesheets, and real-time pulse analytics.
          </p>
          <div className="pt-2">
            <Link
              href="/auth/register"
              className="inline-flex items-center gap-1.5 px-6 py-2.5 bg-primary hover:bg-primary/95 text-primary-foreground font-bold text-xs rounded-xl transition"
            >
              Sign Up Now <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </section>
      </main>

      <PublicFooter />
    </div>
  );
}
