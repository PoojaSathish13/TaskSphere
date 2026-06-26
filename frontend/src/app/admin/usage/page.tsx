"use client";

import React from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { apiClient } from "@/infrastructure/api/api-client";
import { ProtectedRoute } from "@/features/rbac/components/ProtectedRoute";
import { 
  Activity, 
  ArrowLeft,
  ShieldAlert,
  HelpCircle,
  Building,
  CheckCircle2
} from "lucide-react";

interface UsageMetric {
  plan_name: string;
  plan_code: string;
  tasks_usage: {
    current: number;
    limit: number;
    percentage: number;
  };
  members_usage: {
    current: number;
    limit: number;
    percentage: number;
  };
}

export default function AdminUsagePage() {
  // Query: Fetch usage
  const { data: usage, isLoading } = useQuery<UsageMetric>({
    queryKey: ["saas-usage"],
    queryFn: async () => {
      const res = await apiClient.get("/api/v1/organizations/usage/");
      return res.data.data;
    }
  });

  return (
    <ProtectedRoute allowedPermissions={["ORG_MANAGE"]}>
      <main className="space-y-6 pb-12 text-foreground bg-[#0a0a0c]">
        
        {/* Back navigation */}
        <div>
          <Link href="/admin" className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1.5 font-semibold">
            <ArrowLeft className="h-3.5 w-3.5" /> Back to Admin Console
          </Link>
        </div>

        {/* Header */}
        <header className="border-b border-[#1f1f23] pb-5">
          <h1 className="text-3xl font-extrabold tracking-tight flex items-center gap-3 text-white">
            <Activity className="h-7 w-7 text-indigo-500" />
            Metered Quota Usage
          </h1>
          <p className="text-[#8e8e95] text-xs mt-1">
            Real-time metered resource trackers, consumption thresholds, and subscription limit constraints.
          </p>
        </header>

        {isLoading ? (
          <div className="p-8 text-center text-xs animate-pulse text-[#8e8e95]">Loading quota metrics...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Cards 1: Task usage */}
            <div className="bg-[#121214] border border-[#1f1f23] rounded-xl p-6 shadow-sm space-y-4">
              <div className="flex justify-between items-center">
                <div className="space-y-0.5">
                  <h3 className="font-bold text-white text-base">Tasks Consumption</h3>
                  <p className="text-[10px] text-[#8e8e95]">Number of active items logged in workspace</p>
                </div>
                <span className={`font-mono text-xs font-black px-2 py-0.5 rounded ${
                  (usage?.tasks_usage.percentage || 0) >= 90 ? "bg-rose-500/10 text-rose-400" :
                  (usage?.tasks_usage.percentage || 0) >= 80 ? "bg-amber-500/10 text-amber-400" : "bg-indigo-500/10 text-indigo-400"
                }`}>
                  {usage?.tasks_usage.current} / {usage?.tasks_usage.limit}
                </span>
              </div>

              <div className="space-y-2">
                <div className="w-full bg-[#1c1c1f] rounded-full h-3.5 overflow-hidden border border-[#2d2d34] p-px">
                  <div 
                    className={`h-full rounded-full transition-all duration-500 ${
                      (usage?.tasks_usage.percentage || 0) >= 90 ? "bg-rose-500" :
                      (usage?.tasks_usage.percentage || 0) >= 80 ? "bg-amber-500" : "bg-indigo-500"
                    }`}
                    style={{ width: `${Math.min(usage?.tasks_usage.percentage || 0, 100)}%` }}
                  />
                </div>
                
                <div className="flex justify-between items-center text-[10px] text-[#8e8e95] font-mono mt-1">
                  <span>{usage?.tasks_usage.percentage}% limits utilized</span>
                  <span>{(usage?.tasks_usage.limit || 0) - (usage?.tasks_usage.current || 0)} tasks remaining</span>
                </div>
              </div>

              {(usage?.tasks_usage.percentage || 0) >= 80 && (
                <div className="p-3.5 bg-amber-500/5 border border-amber-500/25 rounded-lg flex gap-2 text-xs text-amber-400 mt-2 leading-relaxed">
                  <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold block text-[10px] uppercase tracking-wider">Warning: Approaching tasks limit</span>
                    Please upgrade your subscription tier in the billing tab to prevent blocking team tasks creation.
                  </div>
                </div>
              )}
            </div>

            {/* Cards 2: Seats usage */}
            <div className="bg-[#121214] border border-[#1f1f23] rounded-xl p-6 shadow-sm space-y-4">
              <div className="flex justify-between items-center">
                <div className="space-y-0.5">
                  <h3 className="font-bold text-white text-base">Member Seats Consumption</h3>
                  <p className="text-[10px] text-[#8e8e95]">Assigned seat permissions in this organization</p>
                </div>
                <span className={`font-mono text-xs font-black px-2 py-0.5 rounded ${
                  (usage?.members_usage.percentage || 0) >= 90 ? "bg-rose-500/10 text-rose-400" :
                  (usage?.members_usage.percentage || 0) >= 80 ? "bg-amber-500/10 text-amber-400" : "bg-indigo-500/10 text-indigo-400"
                }`}>
                  {usage?.members_usage.current} / {usage?.members_usage.limit}
                </span>
              </div>

              <div className="space-y-2">
                <div className="w-full bg-[#1c1c1f] rounded-full h-3.5 overflow-hidden border border-[#2d2d34] p-px">
                  <div 
                    className={`h-full rounded-full transition-all duration-500 ${
                      (usage?.members_usage.percentage || 0) >= 90 ? "bg-rose-500" :
                      (usage?.members_usage.percentage || 0) >= 80 ? "bg-amber-500" : "bg-indigo-500"
                    }`}
                    style={{ width: `${Math.min(usage?.members_usage.percentage || 0, 100)}%` }}
                  />
                </div>
                
                <div className="flex justify-between items-center text-[10px] text-[#8e8e95] font-mono mt-1">
                  <span>{usage?.members_usage.percentage}% limits utilized</span>
                  <span>{(usage?.members_usage.limit || 0) - (usage?.members_usage.current || 0)} seats remaining</span>
                </div>
              </div>

              {(usage?.members_usage.percentage || 0) >= 80 && (
                <div className="p-3.5 bg-amber-500/5 border border-amber-500/25 rounded-lg flex gap-2 text-xs text-amber-400 mt-2 leading-relaxed">
                  <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold block text-[10px] uppercase tracking-wider">Warning: Approaching seats license limit</span>
                    Please purchase additional seats or upgrade your plan to allow adding more team members to this organization context.
                  </div>
                </div>
              )}
            </div>

          </div>
        )}

        {/* SLA and limit description */}
        <section className="p-5 bg-[#121214] border border-[#1f1f23] rounded-xl shadow-sm space-y-3">
          <h3 className="font-bold text-white text-xs uppercase tracking-wider">Quota Guidelines</h3>
          <ul className="text-xs text-[#8e8e95] space-y-2 leading-relaxed list-disc list-inside">
            <li>Quotas are enforced per tenant organization and apply to all child workspaces.</li>
            <li>Seat licenses are consumed when assigning user memberships. Revoking seat memberships immediately frees up licenses.</li>
            <li>If you reach the task allocation quota, users will receive a validation warning when posting new tickets.</li>
          </ul>
        </section>

      </main>
    </ProtectedRoute>
  );
}
