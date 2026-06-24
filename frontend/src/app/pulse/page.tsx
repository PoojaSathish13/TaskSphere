"use client";

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/infrastructure/api/api-client";
import { ProtectedRoute } from "@/features/rbac/components/ProtectedRoute";
import { useAuthorization } from "@/features/rbac/hooks/useAuthorization";
import { useAuthStore } from "@/infrastructure/store/auth-store";
import { 
  Users, 
  CheckCircle2, 
  AlertTriangle, 
  TrendingUp, 
  Activity, 
  ShieldAlert, 
  Clock, 
  Compass, 
  Play,
  Zap,
  Flame,
  Award,
  Download,
  X,
  FileText
} from "lucide-react";

interface WorkloadItem {
  id: string;
  email: string;
  name: string;
  role: string;
  assigned_hours: number;
  capacity_percentage: number;
}

interface TeamPulseReport {
  completion_rate: number;
  total_tasks: number;
  done_tasks: number;
  active_blockers: number;
  productivity_score: number;
  overdue_tasks: number;
  team_health_score: number;
  optimization_insights: string[];
  team_workloads: WorkloadItem[];
}

interface TaskItem {
  id: string;
  title: string;
  status: string;
  priority: string;
  estimated_hours: string;
}

export default function TeamPulsePage() {
  const { roleCode } = useAuthorization();
  const { activeOrganizationId } = useAuthStore();
  const isManagerOrAdmin = roleCode === "SUPER_ADMIN" || roleCode === "PROJECT_MANAGER" || roleCode === "ENGINEERING_LEAD";

  // Drill-down selection state
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [selectedMemberName, setSelectedMemberName] = useState("");

  // Query: Fetch Team Pulse metrics
  const { data: pulse, isLoading } = useQuery<TeamPulseReport>({
    queryKey: ["team-pulse", activeOrganizationId],
    queryFn: async () => {
      const res = await apiClient.get("/api/v1/tasks/pulse/");
      return res.data;
    }
  });

  // Query: Fetch tasks for drill-down inspection
  const { data: drillTasks = [], isFetching: isDrillLoading } = useQuery<TaskItem[]>({
    queryKey: ["drill-tasks", selectedMemberId],
    queryFn: async () => {
      if (!selectedMemberId) return [];
      const res = await apiClient.get("/api/v1/planner/tasks/");
      const all: TaskItem[] = res.data.data || [];
      return all.filter((t: any) => t.assignee === selectedMemberId);
    },
    enabled: !!selectedMemberId
  });

  if (isLoading) {
    return <div className="p-8 text-center text-xs animate-pulse text-muted-foreground">Team pulse workspace loading...</div>;
  }

  if (!pulse) {
    return <div className="p-8 text-center text-xs text-rose-400">Team pulse report could not be loaded.</div>;
  }

  const overloadedMembers = pulse.team_workloads.filter(w => w.assigned_hours > 8.0);

  const handleExportCSV = () => {
    // Generate CSV data from workloads
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Name,Email,Role,Assigned Hours,Capacity Percentage\n";
    pulse.team_workloads.forEach(w => {
      csvContent += `"${w.name}","${w.email}","${w.role}",${w.assigned_hours},${w.capacity_percentage}%\n`;
    });
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `TaskSphere_Team_Pulse_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleMemberClick = (memberId: string, name: string) => {
    if (!isManagerOrAdmin) return;
    setSelectedMemberId(memberId);
    setSelectedMemberName(name);
  };

  return (
    <ProtectedRoute>
      <main className="space-y-6 pb-12">
        {/* Header */}
        <header className="border-b border-border pb-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight flex items-center gap-2">
              Team Pulse
              <span className="text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center gap-1">
                <Activity className="h-3.5 w-3.5" /> Live Sync
              </span>
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              Real-time workspace capacity, workload distribution, and active risk scoring.
            </p>
          </div>

          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 border text-xs font-semibold px-3 py-2 rounded-lg bg-card hover:bg-muted transition focus:outline-none"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Export Report</span>
          </button>
        </header>

        {/* Health Score & Optimizations Header banner */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Radial Health gauge */}
          <section className="bg-card border rounded-xl p-4 shadow-sm flex flex-col items-center justify-center text-center">
            <span className="text-[9px] uppercase font-bold tracking-widest text-muted-foreground mb-3">team health status</span>
            <div className="relative h-28 w-28 flex items-center justify-center">
              <svg className="absolute inset-0 transform -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="40" className="stroke-muted/20" strokeWidth="8" fill="transparent" />
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  className={`transition-all duration-500 ${
                    pulse.team_health_score > 70 ? "stroke-emerald-500" : "stroke-amber-500"
                  }`}
                  strokeWidth="8"
                  fill="transparent"
                  strokeDasharray={251.2}
                  strokeDashoffset={251.2 - (251.2 * pulse.team_health_score) / 100}
                />
              </svg>
              <span className="text-2xl font-black font-mono text-foreground">{pulse.team_health_score}%</span>
            </div>
          </section>

          {/* Workload Insights */}
          <section className="md:col-span-2 bg-card border rounded-xl p-5 shadow-sm space-y-3 flex flex-col justify-center">
            <span className="text-[9px] uppercase font-bold tracking-widest text-indigo-400">Optimization Insights</span>
            <div className="space-y-2">
              {pulse.optimization_insights.map((insight, idx) => (
                <div key={idx} className="p-3 bg-muted/10 border border-border/40 rounded-lg text-xs leading-relaxed text-foreground">
                  {insight}
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* Summary Metrics */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 bg-card border rounded-xl shadow-sm flex items-center gap-3">
            <div className="p-2.5 bg-indigo-500/10 rounded-lg text-indigo-400 shrink-0">
              <CheckCircle2 className="h-4 w-4" />
            </div>
            <div>
              <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Completion Rate</span>
              <p className="text-xl font-bold font-mono text-indigo-400">{pulse.completion_rate}%</p>
            </div>
          </div>

          <div className="p-4 bg-card border rounded-xl shadow-sm flex items-center gap-3">
            <div className="p-2.5 bg-rose-500/10 rounded-lg text-rose-400 shrink-0">
              <AlertTriangle className="h-4 w-4" />
            </div>
            <div>
              <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Active Blockers</span>
              <p className="text-xl font-bold font-mono text-rose-400">{pulse.active_blockers}</p>
            </div>
          </div>

          <div className="p-4 bg-card border rounded-xl shadow-sm flex items-center gap-3">
            <div className="p-2.5 bg-emerald-500/10 rounded-lg text-emerald-400 shrink-0">
              <TrendingUp className="h-4 w-4" />
            </div>
            <div>
              <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Productivity Score</span>
              <p className="text-xl font-bold font-mono text-emerald-400">{pulse.productivity_score}</p>
            </div>
          </div>

          <div className="p-4 bg-card border rounded-xl shadow-sm flex items-center gap-3">
            <div className={`p-2.5 rounded-lg shrink-0 ${
              pulse.overdue_tasks > 0 ? "bg-rose-500/10 text-rose-400" : "bg-zinc-500/10 text-zinc-400"
            }`}>
              <Clock className="h-4 w-4" />
            </div>
            <div>
              <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Overdue Tasks</span>
              <p className="text-xl font-bold font-mono">{pulse.overdue_tasks}</p>
            </div>
          </div>
        </section>

        {/* Dashboard Panels */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Workload Distribution (Role-Gated) */}
          <section className="lg:col-span-2 bg-card border rounded-xl p-5 shadow-sm space-y-4">
            <div>
              <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Workload Capacity Distribution</h2>
              <p className="text-[10px] text-muted-foreground mt-0.5">Assigned estimated hours vs 8.0-hour limit (Click member card to inspect)</p>
            </div>

            {isManagerOrAdmin ? (
              <div className="space-y-4 max-h-[460px] overflow-y-auto pr-1">
                {pulse.team_workloads.map((member) => (
                  <div
                    key={member.id}
                    onClick={() => handleMemberClick(member.id, member.name)}
                    className="p-3 border rounded-xl hover:border-indigo-500/40 transition cursor-pointer space-y-2 text-xs"
                  >
                    <div className="flex justify-between items-center">
                      <span className="font-semibold text-foreground">{member.name}</span>
                      <span className="font-mono text-muted-foreground">
                        {member.assigned_hours.toFixed(1)}h / 8.0h ({member.capacity_percentage}%)
                      </span>
                    </div>

                    <div className="w-full bg-muted rounded-full h-2 overflow-hidden border border-border/40">
                      <div
                        className={`h-full transition-all duration-300 ${
                          member.assigned_hours > 8.0 ? "bg-rose-500" : "bg-indigo-500"
                        }`}
                        style={{ width: `${member.capacity_percentage}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-muted/10 border border-border/40 p-12 rounded-xl text-center flex flex-col items-center justify-center gap-2">
                <ShieldAlert className="h-10 w-10 text-muted-foreground/50" />
                <h3 className="font-bold text-foreground">Access Restricted</h3>
                <p className="text-[11px] text-muted-foreground max-w-xs">
                  Detailed individual workload capacity views are restricted to project managers and admins.
                </p>
              </div>
            )}
          </section>

          {/* Active Risks Panel */}
          <section className="bg-card border rounded-xl p-5 shadow-sm space-y-4 flex flex-col justify-between">
            <div className="space-y-3">
              <div>
                <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Active Workspace Risks</h2>
                <p className="text-[10px] text-muted-foreground mt-0.5">SLA violations and resource overloads</p>
              </div>

              <div className="space-y-3.5 pt-2">
                <div className="p-3 bg-muted/10 border rounded-lg flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Overdue Task Risks</span>
                  <span className={`font-bold font-mono px-2 py-0.5 rounded ${
                    pulse.overdue_tasks > 0 ? "bg-rose-500/10 text-rose-400" : "bg-zinc-500/10 text-zinc-400"
                  }`}>
                    {pulse.overdue_tasks}
                  </span>
                </div>

                <div className="p-3 bg-muted/10 border rounded-lg flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Overload Alert Capacity</span>
                  <span className={`font-bold font-mono px-2 py-0.5 rounded ${
                    overloadedMembers.length > 0 ? "bg-rose-500/10 text-rose-400" : "bg-zinc-500/10 text-zinc-400"
                  }`}>
                    {overloadedMembers.length} Overloaded
                  </span>
                </div>
              </div>
            </div>

            {/* Overload Details */}
            {isManagerOrAdmin && overloadedMembers.length > 0 && (
              <div className="p-3 bg-rose-950/10 border border-rose-500/20 rounded-lg text-xs space-y-1.5 mt-4">
                <span className="text-rose-400 font-bold uppercase tracking-wider text-[9px] flex items-center gap-1">
                  <Flame className="h-3 w-3" /> Overload Warning
                </span>
                <p className="text-[10px] text-muted-foreground leading-normal">
                  The following members exceed the 8h daily limit:
                </p>
                <div className="flex flex-wrap gap-1 mt-1">
                  {overloadedMembers.map(m => (
                    <span key={m.id} className="bg-rose-500/10 text-rose-400 border border-rose-500/20 px-1.5 py-0.25 rounded text-[10px] font-semibold">
                      {m.name} ({m.assigned_hours.toFixed(1)}h)
                    </span>
                  ))}
                </div>
              </div>
            )}
          </section>

        </div>

        {/* Drill-down Task Inspector Drawer/Panel */}
        {selectedMemberId && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex justify-end">
            <div className="bg-card border-l border-border rounded-l-xl w-full max-w-md shadow-2xl p-6 relative flex flex-col h-full animate-slide-left">
              <button
                onClick={() => setSelectedMemberId(null)}
                className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition"
              >
                <X className="h-4 w-4" />
              </button>

              <div className="border-b pb-3 mb-4">
                <span className="text-[9px] uppercase font-bold tracking-widest text-indigo-400">Drill-Down Inspector</span>
                <h3 className="text-base font-extrabold text-foreground mt-0.5">{selectedMemberName}</h3>
                <p className="text-[10px] text-muted-foreground">Assigned active tickets list</p>
              </div>

              <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                {isDrillLoading ? (
                  <p className="text-xs text-muted-foreground py-12 text-center">Loading assigned tasks...</p>
                ) : drillTasks.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-12 text-center">No active tasks assigned.</p>
                ) : (
                  drillTasks.map((t) => (
                    <div key={t.id} className="p-3 bg-muted/10 border border-border/50 rounded-lg text-xs space-y-2">
                      <div className="flex justify-between items-start gap-2">
                        <span className="font-semibold text-foreground">{t.title}</span>
                        <span className="font-mono text-[9px] bg-muted/40 px-1.5 rounded">{t.status}</span>
                      </div>
                      <div className="flex justify-between items-center text-[9px] text-muted-foreground pt-1.5 border-t border-border/20">
                        <span className="font-bold">{t.priority}</span>
                        <span className="font-mono">{t.estimated_hours}h</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </ProtectedRoute>
  );
}
