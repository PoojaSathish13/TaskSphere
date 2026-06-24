"use client";

import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/infrastructure/api/api-client";
import { ProtectedRoute } from "@/features/rbac/components/ProtectedRoute";
import { useAuthStore } from "@/infrastructure/store/auth-store";
import { 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  ShieldAlert, 
  Plus, 
  Trash2, 
  HelpCircle,
  AlertCircle,
  RefreshCw,
  TrendingUp,
  X,
  PlusCircle,
  Flame,
  Zap,
  Activity,
  CheckCircle2,
  FileText
} from "lucide-react";

interface LabelItem {
  id: string;
  name: string;
  color: string;
}

interface TaskItem {
  id: string;
  title: string;
  status: string;
}

interface BlockerItem {
  id: string;
  task: string;
  task_details?: TaskItem;
  blocker_type: "APPROVAL" | "CLIENT" | "QA" | "DEVOPS" | "TECHNICAL";
  status: "ACTIVE" | "RESOLVED";
  description: string;
  root_cause: string;
  resolution_notes: string | null;
  sla_hours: number;
  is_escalated: boolean;
  risk_score: number;
  time_active_hours: number;
  created_at: string;
}

interface AuditLogItem {
  id: string;
  blocker: string;
  action: string;
  user_email: string;
  notes: string | null;
  timestamp: string;
}

const BLOCKER_LABELS = {
  APPROVAL: "Waiting For Approval",
  CLIENT: "Waiting For Client",
  QA: "Waiting For QA",
  DEVOPS: "Waiting For DevOps",
  TECHNICAL: "Technical Blocker",
};

const ROOT_CAUSE_LABELS = {
  REQUIREMENTS_GAP: "Requirements Gap",
  DEVOPS_INFRA: "DevOps / Infrastructure Down",
  QA_BLOCK: "QA Verification Blocked",
  CLIENT_DELAY: "Waiting for Client Response",
  CODE_BUG: "Critical Code Bug",
  OTHER: "Other / Unspecified",
};

export default function BlockersPage() {
  const queryClient = useQueryClient();
  const { activeOrganizationId } = useAuthStore();

  // Log blocker form state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState("");
  const [blockerType, setBlockerType] = useState<BlockerItem["blocker_type"]>("TECHNICAL");
  const [description, setDescription] = useState("");
  const [slaHours, setSlaHours] = useState("24");

  // Resolution modal state
  const [isResolveModalOpen, setIsResolveModalOpen] = useState(false);
  const [resolvingBlockerId, setResolvingBlockerId] = useState("");
  const [rootCause, setRootCause] = useState("OTHER");
  const [resolutionNotes, setResolutionNotes] = useState("");

  // Notifications
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Query: Fetch all blockers
  const { data: blockers = [], isLoading, refetch } = useQuery<BlockerItem[]>({
    queryKey: ["task-blockers", activeOrganizationId],
    queryFn: async () => {
      const res = await apiClient.get("/api/v1/blockers/");
      return res.data.data || [];
    }
  });

  // Query: Fetch all tasks (for form selector)
  const { data: allTasks = [] } = useQuery<TaskItem[]>({
    queryKey: ["planner-all-tasks", activeOrganizationId],
    queryFn: async () => {
      const res = await apiClient.get("/api/v1/planner/tasks/");
      return res.data.data || [];
    }
  });

  // Query: Fetch Blocker Audit Logs
  const { data: auditLogs = [] } = useQuery<AuditLogItem[]>({
    queryKey: ["blocker-audit-logs", activeOrganizationId],
    queryFn: async () => {
      const res = await apiClient.get("/api/v1/blockers/audit-logs/");
      return res.data.data || [];
    }
  });

  // Mutation: Log new blocker
  const logBlockerMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await apiClient.post("/api/v1/blockers/", payload);
      return res.data.data;
    },
    onSuccess: () => {
      showToast("Blocker logged successfully", "success");
      setIsModalOpen(false);
      setSelectedTaskId("");
      setDescription("");
      setSlaHours("24");
      queryClient.invalidateQueries({ queryKey: ["task-blockers"] });
      queryClient.invalidateQueries({ queryKey: ["blocker-audit-logs"] });
    },
    onError: () => {
      showToast("Failed to log blocker", "error");
    }
  });

  // Mutation: Resolve Blocker (with root cause inputs)
  const resolveBlockerMutation = useMutation({
    mutationFn: async (payload: { id: string; root_cause: string; notes: string }) => {
      const res = await apiClient.post(`/api/v1/blockers/${payload.id}/resolve/`, {
        root_cause: payload.root_cause,
        notes: payload.notes
      });
      return res.data.data;
    },
    onSuccess: () => {
      showToast("Blocker resolved and logged to archive", "success");
      setIsResolveModalOpen(false);
      setResolvingBlockerId("");
      setRootCause("OTHER");
      setResolutionNotes("");
      queryClient.invalidateQueries({ queryKey: ["task-blockers"] });
      queryClient.invalidateQueries({ queryKey: ["blocker-audit-logs"] });
    }
  });

  // Mutation: Manual Escalation
  const escalateBlockerMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiClient.post(`/api/v1/blockers/${id}/escalate/`);
      return res.data.data;
    },
    onSuccess: () => {
      showToast("Blocker escalated to executive levels", "success");
      queryClient.invalidateQueries({ queryKey: ["task-blockers"] });
      queryClient.invalidateQueries({ queryKey: ["blocker-audit-logs"] });
    }
  });

  // Mutation: Scan and check SLAs
  const checkSlasMutation = useMutation({
    mutationFn: async () => {
      const res = await apiClient.post("/api/v1/blockers/check-slas/");
      return res.data;
    },
    onSuccess: (data) => {
      showToast(data.message || "SLA scan completed", "success");
      queryClient.invalidateQueries({ queryKey: ["task-blockers"] });
      queryClient.invalidateQueries({ queryKey: ["blocker-audit-logs"] });
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTaskId || !description.trim()) {
      showToast("Please fill in all fields", "error");
      return;
    }

    logBlockerMutation.mutate({
      task: selectedTaskId,
      blocker_type: blockerType,
      description,
      sla_hours: parseInt(slaHours)
    });
  };

  const handleResolveSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!resolvingBlockerId) return;
    resolveBlockerMutation.mutate({
      id: resolvingBlockerId,
      root_cause: rootCause,
      notes: resolutionNotes
    });
  };

  const openResolveModal = (id: string) => {
    setResolvingBlockerId(id);
    setIsResolveModalOpen(true);
  };

  const activeBlockers = blockers.filter(b => b.status === "ACTIVE");
  const escalatedBlockers = activeBlockers.filter(b => b.is_escalated);
  const resolvedBlockers = blockers.filter(b => b.status === "RESOLVED");

  // Summary Metrics calculations
  const totalRiskScore = activeBlockers.reduce((acc, b) => acc + b.risk_score, 0);

  // Group blockers by type for trend reporting
  const blockerTypeCounts = activeBlockers.reduce((acc, b) => {
    acc[b.blocker_type] = (acc[b.blocker_type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  if (isLoading) {
    return <div className="p-8 text-center text-xs animate-pulse text-muted-foreground">Blocker center loading...</div>;
  }

  return (
    <ProtectedRoute>
      <main className="space-y-6 pb-12">
        {/* Toast alerts */}
        {toast && (
          <div className={`fixed bottom-5 right-5 z-50 p-4 rounded-xl border shadow-xl flex items-center gap-2 text-xs font-bold bg-popover text-popover-foreground ${
            toast.type === "success" ? "border-emerald-500/40 text-emerald-400" : "border-rose-500/40 text-rose-400"
          }`}>
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{toast.message}</span>
          </div>
        )}

        {/* Header */}
        <header className="border-b border-border pb-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight flex items-center gap-2">
              Blocker Intelligence
              <span className="text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20 flex items-center gap-1">
                <ShieldAlert className="h-3.5 w-3.5" /> SLA Audits
              </span>
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              Analyze blocking parameters, track task completion SLAs, and automatically escalate risk scores.
            </p>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            <button
              onClick={() => checkSlasMutation.mutate()}
              className="flex items-center gap-1.5 border text-xs font-semibold px-3 py-2 rounded-lg bg-card hover:bg-muted transition focus:outline-none"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span>Audit active SLAs</span>
            </button>

            <button
              onClick={() => setIsModalOpen(true)}
              className="flex items-center gap-1 px-3 py-2 text-xs font-semibold text-primary-foreground bg-primary rounded-lg hover:bg-primary/95 transition"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Log Blocker</span>
            </button>
          </div>
        </header>

        {/* Summary metrics widgets */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 bg-card border rounded-xl shadow-sm flex items-center gap-3">
            <div className="p-2.5 bg-rose-500/10 rounded-lg text-rose-400 shrink-0">
              <AlertTriangle className="h-4 w-4" />
            </div>
            <div>
              <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Active Blockers</span>
              <p className="text-xl font-bold font-mono text-rose-400">{activeBlockers.length}</p>
            </div>
          </div>

          <div className="p-4 bg-card border rounded-xl shadow-sm flex items-center gap-3">
            <div className="p-2.5 bg-amber-500/10 rounded-lg text-amber-400 shrink-0">
              <Flame className="h-4 w-4" />
            </div>
            <div>
              <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Escalated Logs</span>
              <p className="text-xl font-bold font-mono text-amber-400">{escalatedBlockers.length}</p>
            </div>
          </div>

          <div className="p-4 bg-card border rounded-xl shadow-sm flex items-center gap-3">
            <div className="p-2.5 bg-emerald-500/10 rounded-lg text-emerald-400 shrink-0">
              <CheckCircle className="h-4 w-4" />
            </div>
            <div>
              <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Resolved SLA</span>
              <p className="text-xl font-bold font-mono text-emerald-400">{resolvedBlockers.length}</p>
            </div>
          </div>

          <div className="p-4 bg-card border rounded-xl shadow-sm flex items-center gap-3">
            <div className="p-2.5 bg-primary/10 rounded-lg text-primary shrink-0">
              <TrendingUp className="h-4 w-4" />
            </div>
            <div>
              <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Total Risk Index</span>
              <p className="text-xl font-bold font-mono text-primary">{totalRiskScore.toFixed(1)}</p>
            </div>
          </div>
        </section>

        {/* Escalation Center Alerts */}
        {escalatedBlockers.length > 0 && (
          <section className="bg-rose-950/15 border border-rose-500/30 rounded-xl p-4 space-y-3 shadow-sm">
            <div className="flex items-center gap-2 text-rose-400 font-bold text-xs uppercase tracking-wider">
              <Zap className="h-4 w-4 animate-bounce" />
              SLA Violations / Critical Escalations
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {escalatedBlockers.map((b) => (
                <div key={b.id} className="p-3.5 bg-background border border-rose-500/20 rounded-lg text-xs space-y-2 flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-center text-[10px]">
                      <span className="font-bold text-rose-400">{BLOCKER_LABELS[b.blocker_type]}</span>
                      <span className="font-mono bg-rose-500/10 px-1 rounded font-bold text-rose-400">Risk {b.risk_score}</span>
                    </div>
                    <p className="font-semibold text-foreground mt-1 truncate">{b.task_details?.title || "Task Item"}</p>
                    <p className="text-muted-foreground text-[11px] mt-0.5 leading-snug line-clamp-2">{b.description}</p>
                  </div>

                  <div className="flex justify-end gap-2 pt-2 border-t border-border/40 mt-1">
                    <button
                      onClick={() => openResolveModal(b.id)}
                      className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[10px] font-bold transition"
                    >
                      Mark Resolved
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Main Board Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Active Blockers List */}
          <section className="lg:col-span-2 bg-card border rounded-xl p-5 shadow-sm space-y-4 flex flex-col">
            <div>
              <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Active Blocker Logs</h2>
              <p className="text-[10px] text-muted-foreground mt-0.5">Escalate manually or review SLA clocks</p>
            </div>

            <div className="space-y-3 overflow-y-auto max-h-[460px] pr-1">
              {activeBlockers.length === 0 ? (
                <div className="p-12 text-center text-xs text-muted-foreground border border-dashed rounded-lg flex flex-col justify-center h-48">
                  No active blockers. Your project velocity is clean.
                </div>
              ) : (
                activeBlockers.map((b) => (
                  <div key={b.id} className="p-4 bg-muted/10 border border-border/50 rounded-lg text-xs space-y-2 relative">
                    <div className="flex justify-between items-start gap-4">
                      <div>
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-bold text-primary-foreground bg-primary/80">
                          {BLOCKER_LABELS[b.blocker_type]}
                        </span>
                        <h4 className="font-bold text-foreground mt-2 text-sm">{b.task_details?.title || "Task"}</h4>
                        <p className="text-muted-foreground mt-0.5 leading-normal">{b.description}</p>
                      </div>

                      <div className="text-right shrink-0 font-mono">
                        <span className="block text-primary font-bold">Risk {b.risk_score}</span>
                        <span className="text-[9px] text-muted-foreground block">{b.time_active_hours}h / {b.sla_hours}h SLA</span>
                      </div>
                    </div>

                    {/* Progress SLA bar */}
                    <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                      <div
                        className={`h-full transition-all duration-300 ${
                          b.is_escalated ? "bg-rose-500" : "bg-primary"
                        }`}
                        style={{ width: `${Math.min(100, (b.time_active_hours / b.sla_hours) * 100)}%` }}
                      />
                    </div>

                    <div className="flex justify-end gap-2 pt-2 border-t border-border/20">
                      {!b.is_escalated && (
                        <button
                          onClick={() => escalateBlockerMutation.mutate(b.id)}
                          className="px-2.5 py-1 border border-amber-500/20 text-amber-400 rounded hover:bg-amber-950/20 text-[10px] font-bold transition"
                        >
                          Escalate
                        </button>
                      )}
                      <button
                        onClick={() => openResolveModal(b.id)}
                        className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[10px] font-bold transition"
                      >
                        Resolve
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>

          {/* Resolved Blocker Logs */}
          <section className="bg-card border rounded-xl p-5 shadow-sm space-y-4 flex flex-col">
            <div>
              <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Historical Archive</h2>
              <p className="text-[10px] text-muted-foreground mt-0.5">Chronological audit logs of resolved blockers</p>
            </div>

            <div className="flex-1 space-y-3 overflow-y-auto max-h-[460px] pr-1">
              {resolvedBlockers.length === 0 ? (
                <div className="p-8 text-center text-xs text-muted-foreground border border-dashed rounded-lg h-48 flex items-center justify-center">
                  No blockers resolved yet.
                </div>
              ) : (
                resolvedBlockers.map((b) => (
                  <div key={b.id} className="p-3 bg-muted/20 border border-border/30 rounded-lg text-xs space-y-1">
                    <div className="flex justify-between items-center text-[9px] text-muted-foreground">
                      <span className="font-bold">{BLOCKER_LABELS[b.blocker_type]}</span>
                      <span className="font-mono">Resolved</span>
                    </div>
                    <p className="font-semibold text-foreground truncate">{b.task_details?.title || "Task"}</p>
                    <p className="text-muted-foreground text-[10px] truncate">{b.description}</p>
                    <div className="text-[9px] text-emerald-400 pt-1 border-t border-border/20 mt-1 flex flex-col gap-0.5">
                      <span>Root cause: {ROOT_CAUSE_LABELS[b.root_cause as keyof typeof ROOT_CAUSE_LABELS] || b.root_cause}</span>
                      {b.resolution_notes && <span className="text-muted-foreground italic">"{b.resolution_notes}"</span>}
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>

        {/* Analytics & Audit Logs Feed */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Trend chart */}
          <section className="bg-card border rounded-xl p-5 shadow-sm space-y-4">
            <div>
              <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Active Blocker Type Distribution</h2>
              <p className="text-[10px] text-muted-foreground mt-0.5">Active blockers grouped by category</p>
            </div>

            <div className="h-44 flex items-end justify-around px-4 pb-2 border-b border-l border-border/60">
              {Object.keys(BLOCKER_LABELS).map((type) => {
                const count = blockerTypeCounts[type] || 0;
                const height = Math.min(100, count * 30); // scale height
                return (
                  <div key={type} className="flex flex-col items-center gap-1.5 w-12">
                    <div
                      className="w-5 bg-primary/80 hover:bg-primary transition-all rounded-t"
                      style={{ height: `${Math.max(10, height)}px` }}
                    />
                    <span className="text-[8px] font-mono text-muted-foreground truncate w-full text-center">
                      {type}
                    </span>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Audit Logs Timeline history */}
          <section className="bg-card border rounded-xl p-5 shadow-sm flex flex-col gap-4">
            <div>
              <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Audit Ledger Feed</h2>
              <p className="text-[10px] text-muted-foreground mt-0.5">Audited escalation logs and triggers</p>
            </div>

            <div className="flex-1 space-y-3 overflow-y-auto max-h-[190px] pr-1">
              {auditLogs.length === 0 ? (
                <div className="text-center text-xs text-muted-foreground py-12 border border-dashed rounded-lg">
                  No blocker actions logged yet.
                </div>
              ) : (
                auditLogs.map((log) => (
                  <div key={log.id} className="flex gap-2.5 items-start pl-2 py-1 border-l-2 border-primary/40">
                    <Activity className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                    <div>
                      <div className="flex justify-between items-center gap-4 text-[9px] text-muted-foreground font-mono">
                        <span>{log.user_email || "System Automation"}</span>
                        <span>{new Date(log.timestamp).toLocaleTimeString()}</span>
                      </div>
                      <p className="text-[10px] text-foreground mt-0.5">
                        <span className="font-bold text-primary">{log.action}: </span>
                        {log.notes}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>

        </div>

        {/* Log Blocker Modal */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex justify-center items-center p-4">
            <div className="bg-card border rounded-xl w-full max-w-md shadow-2xl p-6 relative">
              <button
                onClick={() => setIsModalOpen(false)}
                className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition"
              >
                <X className="h-4 w-4" />
              </button>

              <h2 className="text-lg font-bold text-foreground mb-4">Log Blocker Ticket</h2>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted-foreground">Linked Task</label>
                  <select
                    value={selectedTaskId}
                    onChange={(e) => setSelectedTaskId(e.target.value)}
                    className="w-full bg-muted/30 border border-border rounded-lg p-2 text-xs focus:outline-none"
                    required
                  >
                    <option value="">Select Task...</option>
                    {allTasks.map(t => (
                      <option key={t.id} value={t.id}>{t.title} ({t.status})</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-muted-foreground">Blocker Type</label>
                    <select
                      value={blockerType}
                      onChange={(e: any) => setBlockerType(e.target.value)}
                      className="w-full bg-muted/30 border border-border rounded-lg p-2 text-xs focus:outline-none"
                    >
                      <option value="TECHNICAL">Technical Blocker</option>
                      <option value="APPROVAL">Waiting For Approval</option>
                      <option value="CLIENT">Waiting For Client</option>
                      <option value="QA">Waiting For QA</option>
                      <option value="DEVOPS">Waiting For DevOps</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-muted-foreground">SLA Threshold (Hours)</label>
                    <input
                      type="number"
                      value={slaHours}
                      onChange={(e) => setSlaHours(e.target.value)}
                      className="w-full bg-muted/30 border border-border rounded-lg p-2 text-xs focus:outline-none"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted-foreground">Description</label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Details about blocker..."
                    rows={3}
                    className="w-full bg-muted/30 border border-border rounded-lg p-2 text-xs focus:ring-1 focus:ring-primary focus:outline-none resize-none"
                    required
                  />
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 border rounded-lg text-xs font-semibold hover:bg-muted transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-primary hover:bg-primary/95 text-primary-foreground rounded-lg text-xs font-semibold transition"
                  >
                    Log Blocker
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Resolve Blocker Modal */}
        {isResolveModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex justify-center items-center p-4">
            <div className="bg-card border rounded-xl w-full max-w-md shadow-2xl p-6 relative">
              <button
                onClick={() => setIsResolveModalOpen(false)}
                className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition"
              >
                <X className="h-4 w-4" />
              </button>

              <h2 className="text-lg font-bold text-foreground mb-4">Resolve Blocker Ticket</h2>

              <form onSubmit={handleResolveSubmit} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted-foreground">Root Cause Analysis</label>
                  <select
                    value={rootCause}
                    onChange={(e) => setRootCause(e.target.value)}
                    className="w-full bg-muted/30 border border-border rounded-lg p-2 text-xs focus:outline-none"
                    required
                  >
                    <option value="OTHER">Other / Unspecified</option>
                    <option value="REQUIREMENTS_GAP">Requirements Gap</option>
                    <option value="DEVOPS_INFRA">DevOps / Infrastructure Down</option>
                    <option value="QA_BLOCK">QA Verification Blocked</option>
                    <option value="CLIENT_DELAY">Waiting for Client Response</option>
                    <option value="CODE_BUG">Critical Code Bug</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted-foreground">Resolution Notes</label>
                  <textarea
                    value={resolutionNotes}
                    onChange={(e) => setResolutionNotes(e.target.value)}
                    placeholder="Details about what resolved the blocker..."
                    rows={3}
                    className="w-full bg-muted/30 border border-border rounded-lg p-2 text-xs focus:ring-1 focus:ring-primary focus:outline-none resize-none"
                    required
                  />
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsResolveModalOpen(false)}
                    className="px-4 py-2 border rounded-lg text-xs font-semibold hover:bg-muted transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold transition"
                  >
                    Resolve Blocker
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </ProtectedRoute>
  );
}
