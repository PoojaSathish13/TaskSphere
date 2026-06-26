"use client";

import React from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { apiClient } from "@/infrastructure/api/api-client";
import { ProtectedRoute } from "@/features/rbac/components/ProtectedRoute";
import { 
  Building, 
  Users, 
  ShieldCheck, 
  CreditCard, 
  Activity, 
  ChevronRight,
  ArrowRight,
  ShieldAlert,
  Sliders
} from "lucide-react";

interface SubscriptionDetails {
  plan_name: string;
  price_monthly: string;
  status: string;
  current_period_end: string;
}

interface UsageMetric {
  tasks_usage: { current: number; limit: number; percentage: number };
  members_usage: { current: number; limit: number; percentage: number };
}

export default function AdminDashboardPage() {
  // Query: Fetch subscription
  const { data: subscription, isLoading: loadingSub } = useQuery<SubscriptionDetails>({
    queryKey: ["saas-subscription"],
    queryFn: async () => {
      const res = await apiClient.get("/api/v1/organizations/subscription/");
      return res.data.data;
    }
  });

  // Query: Fetch usage stats
  const { data: usage, isLoading: loadingUsage } = useQuery<UsageMetric>({
    queryKey: ["saas-usage"],
    queryFn: async () => {
      const res = await apiClient.get("/api/v1/organizations/usage/");
      return res.data.data;
    }
  });

  const cards = [
    {
      name: "SaaS Users & Seats",
      desc: "Manage team member seats, invite users, and control active seats.",
      href: "/admin/users",
      icon: <Users className="h-6 w-6 text-indigo-400" />
    },
    {
      name: "RBAC Role Policies",
      desc: "Configure role-based access permissions and adjust member clearance levels.",
      href: "/admin/roles",
      icon: <ShieldCheck className="h-6 w-6 text-emerald-400" />
    },
    {
      name: "Billing & Invoices",
      desc: "Scale subscription plan tier, view Stripe configurations, and invoice statements.",
      href: "/admin/billing",
      icon: <CreditCard className="h-6 w-6 text-amber-400" />
    },
    {
      name: "Metered Usage Logs",
      desc: "Track real-time tasks limit caps and seat consumption stats.",
      href: "/admin/usage",
      icon: <Activity className="h-6 w-6 text-rose-400" />
    }
  ];

  return (
    <ProtectedRoute allowedPermissions={["ORG_MANAGE"]}>
      <main className="space-y-6 pb-12 text-foreground bg-[#0a0a0c]">
        
        {/* Header */}
        <header className="border-b border-[#1f1f23] pb-5">
          <h1 className="text-3xl font-extrabold tracking-tight flex items-center gap-3 text-white">
            <Sliders className="h-7 w-7 text-indigo-500" />
            Admin / SaaS Control Center
          </h1>
          <p className="text-[#8e8e95] text-xs mt-1">
            Global organizational overview, resource consumption controls, subscription scaling, and access policy rules.
          </p>
        </header>

        {/* Overview Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Plan Card */}
          <div className="bg-[#121214] border border-[#1f1f23] rounded-xl p-5 shadow-sm space-y-3">
            <span className="text-[10px] uppercase font-bold text-[#8e8e95] tracking-wider block">Active Plan Tier</span>
            {loadingSub ? (
              <div className="h-8 bg-white/5 rounded animate-pulse-skeleton w-2/3" />
            ) : (
              <div>
                <h3 className="text-xl font-bold text-white">{subscription?.plan_name || "Enterprise"}</h3>
                <p className="text-[10px] text-[#8e8e95] mt-1">Renewal date: {subscription?.current_period_end || "N/A"}</p>
              </div>
            )}
            <Link 
              href="/admin/billing" 
              className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold flex items-center gap-1.5 pt-2"
            >
              Configure Subscription <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {/* Seat usage */}
          <div className="bg-[#121214] border border-[#1f1f23] rounded-xl p-5 shadow-sm space-y-3">
            <span className="text-[10px] uppercase font-bold text-[#8e8e95] tracking-wider block">Seat Quota Consumption</span>
            {loadingUsage ? (
              <div className="h-8 bg-white/5 rounded animate-pulse-skeleton w-1/2" />
            ) : (
              <div>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-2xl font-black text-white">{usage?.members_usage.current || 0}</span>
                  <span className="text-xs text-[#8e8e95]">/ {usage?.members_usage.limit || 0} seats</span>
                </div>
                <div className="w-full bg-[#1c1c1f] rounded-full h-1.5 overflow-hidden border border-[#2d2d34] mt-2">
                  <div 
                    className="h-full bg-indigo-500 transition-all duration-300"
                    style={{ width: `${usage?.members_usage.percentage || 0}%` }}
                  />
                </div>
              </div>
            )}
            <Link 
              href="/admin/users" 
              className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold flex items-center gap-1.5 pt-1"
            >
              Seat Settings <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {/* Task usage */}
          <div className="bg-[#121214] border border-[#1f1f23] rounded-xl p-5 shadow-sm space-y-3">
            <span className="text-[10px] uppercase font-bold text-[#8e8e95] tracking-wider block">Tasks Quota Consumption</span>
            {loadingUsage ? (
              <div className="h-8 bg-white/5 rounded animate-pulse-skeleton w-1/2" />
            ) : (
              <div>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-2xl font-black text-white">{usage?.tasks_usage.current || 0}</span>
                  <span className="text-xs text-[#8e8e95]">/ {usage?.tasks_usage.limit || 0} tasks</span>
                </div>
                <div className="w-full bg-[#1c1c1f] rounded-full h-1.5 overflow-hidden border border-[#2d2d34] mt-2">
                  <div 
                    className="h-full bg-indigo-500 transition-all duration-300"
                    style={{ width: `${usage?.tasks_usage.percentage || 0}%` }}
                  />
                </div>
              </div>
            )}
            <Link 
              href="/admin/usage" 
              className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold flex items-center gap-1.5 pt-1"
            >
              Limits Analytics <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>

        {/* Feature Sections Navigation Grid */}
        <section className="space-y-4">
          <h2 className="text-xs font-bold text-[#8e8e95] uppercase tracking-wider">Management Control Centers</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {cards.map((card, idx) => (
              <Link 
                key={idx}
                href={card.href}
                className="bg-[#121214] border border-[#1f1f23] hover:border-indigo-500/40 hover:shadow-lg transition duration-200 rounded-xl p-5 flex items-start gap-4"
              >
                <div className="p-3 bg-[#1c1c1f]/60 rounded-xl shrink-0">
                  {card.icon}
                </div>
                <div className="space-y-1">
                  <h3 className="font-extrabold text-white text-base flex items-center gap-1.5">
                    {card.name} <ArrowRight className="h-3.5 w-3.5 text-[#52525b]" />
                  </h3>
                  <p className="text-xs text-[#8e8e95] leading-relaxed">{card.desc}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>

      </main>
    </ProtectedRoute>
  );
}
