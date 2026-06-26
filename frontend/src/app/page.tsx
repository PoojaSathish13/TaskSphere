"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { DashboardGrid } from "@/features/dashboard/components/DashboardGrid";
import { PublicNavbar } from "@/shared/components/layout/PublicNavbar";
import { PublicFooter } from "@/shared/components/layout/PublicFooter";
import { 
  Building, 
  CheckSquare, 
  Calendar, 
  Target, 
  ShieldAlert, 
  Clock, 
  Activity, 
  UserCheck, 
  Sliders, 
  ArrowRight,
  Shield
} from "lucide-react";

export default function DashboardGateway() {
  const { isAuthenticated } = useAuth();
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  if (!hasMounted) {
    return (
      <div className="flex h-screen items-center justify-center bg-background text-foreground">
        <p className="text-sm text-muted-foreground animate-pulse">Loading TaskSphere...</p>
      </div>
    );
  }

  // Render Master Dashboard Grid when logged in
  if (isAuthenticated) {
    return <DashboardGrid />;
  }

  // Render Public Landing Page when unauthenticated
  const features = [
    {
      title: "Isolated Tenant Spaces",
      desc: "Secure organization contexts with automatic backend data isolation.",
      icon: <Building className="h-5 w-5 text-indigo-400" />
    },
    {
      title: "Interactive Kanban",
      desc: "Organize, track, and resolve daily work tickets with priority statuses.",
      icon: <CheckSquare className="h-5 w-5 text-indigo-400" />
    },
    {
      title: "Daily Standup Syncs",
      desc: "Track daily progress reports, next-step plans, and blockers easily.",
      icon: <UserCheck className="h-5 w-5 text-indigo-400" />
    },
    {
      title: "Team Pulse Telemetry",
      desc: "Live analytics, active team participation, and load indexes.",
      icon: <Activity className="h-5 w-5 text-indigo-400" />
    },
    {
      title: "Timesheets Log",
      desc: "Easy project time tracking and review cycles for payroll systems.",
      icon: <Clock className="h-5 w-5 text-indigo-400" />
    },
    {
      title: "External Client Portal",
      desc: "Gated portal access for external clients to view project milestones.",
      icon: <Shield className="h-5 w-5 text-indigo-400" />
    }
  ];

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground transition-linear">
      <PublicNavbar />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative overflow-hidden py-20 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto text-center space-y-8">
          
          <div className="space-y-4 max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded bg-slate-100 border border-[#d0d7de] text-xs font-semibold text-slate-700">
              <Shield className="h-3.5 w-3.5 text-[#0969da]" /> Enterprise Multi-Tenant Platform
            </div>
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-black tracking-tight leading-tight">
              Plan Today. Execute Today.{" "}
              <span className="text-[#0969da]">
                Deliver Today.
              </span>
            </h1>
            <p className="text-muted-foreground text-sm sm:text-base md:text-lg leading-relaxed max-w-2xl mx-auto font-medium">
              TaskSphere is the unified multi-tenant work management engine built for high-velocity software, product development, and operations teams.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Link
              href="/auth/register"
              className="w-full sm:w-auto px-8 py-2.5 bg-primary hover:bg-primary/95 text-white font-bold text-xs rounded-md transition shadow-md flex items-center justify-center gap-2"
            >
              Get Started Free <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/pricing"
              className="w-full sm:w-auto px-8 py-2.5 bg-white hover:bg-slate-50 border border-[#d0d7de] font-semibold text-xs rounded-md text-slate-700 transition text-center shadow-sm"
            >
              View Pricing Plans
            </Link>
          </div>
        </section>

        {/* Features Grid Section */}
        <section id="features" className="py-16 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto space-y-12 border-t border-[#d0d7de]">
          <div className="text-center space-y-2">
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Built for High-Velocity Teams</h2>
            <p className="text-muted-foreground text-xs sm:text-sm max-w-lg mx-auto">
              Every workflow you need to plan tasks, sync standups, track timesheets, and keep clients aligned.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feat) => (
              <div
                key={feat.title}
                className="bg-white border border-[#d0d7de] p-6 rounded-md space-y-3 shadow-sm hover:border-[#8c959f] transition-all duration-150"
              >
                <div className="h-9 w-9 rounded bg-slate-100 border border-[#d0d7de] flex items-center justify-center text-[#0969da]">
                  {feat.icon}
                </div>
                <h3 className="font-bold text-sm text-foreground">{feat.title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{feat.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Interactive Console Teaser */}
        <section className="py-16 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto border-t border-[#d0d7de]">
          <div className="bg-white border border-[#d0d7de] p-8 rounded-md md:p-12 flex flex-col lg:flex-row items-center gap-10 shadow-sm relative overflow-hidden">
            
            <div className="space-y-4 max-w-lg flex-1">
              <div className="text-xs font-bold text-[#0969da] uppercase tracking-widest">Global Overlay Console</div>
              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">The Global Command Palette</h2>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed font-medium">
                Unlock instant keyboard navigation. Press <kbd className="px-1.5 py-0.5 rounded bg-slate-100 text-[10px] font-mono border border-[#d0d7de] font-bold">Ctrl+K</kbd> anywhere to create tasks, assign roles, switch workspaces, toggle dark modes, and search projects instantly.
              </p>
              <div className="pt-2">
                <Link
                  href="/auth/register"
                  className="text-xs font-bold text-[#0969da] hover:underline flex items-center gap-1.5 transition"
                >
                  Create an account to try it out <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>

            {/* Command Palette Mock Illustration */}
            <div className="w-full max-w-md bg-[#f6f8fa] border border-[#d0d7de] rounded-md p-4 shadow-sm space-y-3 font-mono text-[10px] text-slate-600 flex-1">
              <div className="flex items-center gap-1.5 border-b border-[#d0d7de] pb-3">
                <Sliders className="h-4 w-4 text-[#0969da] shrink-0" />
                <span className="text-slate-800 font-semibold">Search actions or navigate...</span>
              </div>
              <div className="space-y-2.5">
                <div className="flex items-center justify-between p-2 rounded bg-white border border-[#d0d7de]">
                  <span className="text-slate-800">⚡ Create new workspace task...</span>
                  <span className="text-[9px] text-slate-400">Action</span>
                </div>
                <div className="flex items-center justify-between p-2 rounded hover:bg-slate-200/50 border border-transparent">
                  <span>👥 Assign task assignee...</span>
                  <span className="text-[9px] text-slate-400">Action</span>
                </div>
                <div className="flex items-center justify-between p-2 rounded hover:bg-slate-200/50 border border-transparent">
                  <span>📅 Navigate: Daily Planner</span>
                  <span className="text-[9px] text-slate-400">Route</span>
                </div>
                <div className="flex items-center justify-between p-2 rounded hover:bg-slate-200/50 border border-transparent">
                  <span>⚙️ Navigate: SaaS Settings</span>
                  <span className="text-[9px] text-slate-400">Route</span>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <PublicFooter />
    </div>
  );
}
