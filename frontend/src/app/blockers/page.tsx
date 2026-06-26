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
  AlertCircle, 
  RefreshCw, 
  TrendingUp, 
  X, 
  PlusCircle, 
  Flame, 
  Zap, 
  Activity, 
  CheckCircle2, 
  FileText,
  ChevronDown
} from "lucide-react";

type BlockerScreen = 
  | "dashboard"
  | "create"
  | "details"
  | "escalations"
  | "sla";

const screenLabels: Record<BlockerScreen, string> = {
  dashboard: "Blocker Dashboard",
  create: "Create Blocker",
  details: "Blocker Details",
  escalations: "Escalation Queue",
  sla: "SLA Monitoring",
};

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

  const [activeScreen, setActiveScreen] = useState<BlockerScreen>("dashboard");
  const [selectedBlockerId, setSelectedBlockerId] = useState<string | null>(null);

  // Log blocker form state
  const [selectedTaskId, setSelectedTaskId] = useState("");
  const [blockerType, setBlockerType] = useState<BlockerItem["blocker_type"]>("TECHNICAL");
  const [description, setDescription] = useState("");
  const [slaHours, setSlaHours] = useState("24");

  // Resolution form state
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

  // -----------------------------------------------------------------
  // Queries
  // -----------------------------------------------------------------
  
  // 1. Query: Fetch all blockers
  const { data: blockers = [], isLoading } = useQuery<BlockerItem[]>({
    queryKey: ["task-blockers", activeOrganizationId],
    queryFn: async () => {
      const res = await apiClient.get("/api/v1/blockers/");
      return (Array.isArray(res.data?.data) ? res.data.data : (Array.isArray(res.data) ? res.data : []));
    },
    enabled: !!activeOrganizationId
  });

  const selectedBlocker = blockers.find(b => b.id === selectedBlockerId);

  // 2. Query: Fetch all tasks (for selector)
  const { data: allTasks = [] } = useQuery<TaskItem[]>({
    queryKey: ["planner-all-tasks", activeOrganizationId],
    queryFn: async () => {
      const res = await apiClient.get("/api/v1/planner/tasks/");
      return (Array.isArray(res.data?.data) ? res.data.data : (Array.isArray(res.data) ? res.data : []));
    },
    enabled: !!activeOrganizationId
  });

  // 3. Query: Fetch Blocker Audit Logs
  const { data: auditLogs = [] } = useQuery<AuditLogItem[]>({
    queryKey: ["blocker-audit-logs", activeOrganizationId],
    queryFn: async () => {
      const res = await apiClient.get("/api/v1/blockers/audit-logs/");
      return (Array.isArray(res.data?.data) ? res.data.data : (Array.isArray(res.data) ? res.data : []));
    },
    enabled: !!activeOrganizationId
  });

  const selectedBlockerLogs = auditLogs.filter(log => log.blocker === selectedBlockerId);

  // -----------------------------------------------------------------
  // Mutations
  // -----------------------------------------------------------------
  
  // Log new blocker
  const logBlockerMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await apiClient.post("/api/v1/blockers/", payload);
      return res.data.data;
    },
    onSuccess: (newBlocker) => {
      showToast("Blocker logged successfully", "success");
      setSelectedTaskId("");
      setDescription("");
      setSlaHours("24");
      queryClient.invalidateQueries({ queryKey: ["task-blockers"] });
      queryClient.invalidateQueries({ queryKey: ["blocker-audit-logs"] });
      
      if (newBlocker && newBlocker.id) {
        setSelectedBlockerId(newBlocker.id);
        setActiveScreen("details");
      } else {
        setActiveScreen("dashboard");
      }
    },
    onError: () => {
      showToast("Failed to log blocker", "error");
    }
  });

  // Resolve Blocker
  const resolveBlockerMutation = useMutation({
    mutationFn: async (payload: { id: string; root_cause: string; notes: string }) => {
      const res = await apiClient.post(`/api/v1/blockers/${payload.id}/resolve/`, {
        root_cause: payload.root_cause,
        notes: payload.notes
      });
      return res.data.data;
    },
    onSuccess: () => {
      showToast("Blocker resolved successfully", "success");
      setIsResolveModalOpen(false);
      setResolvingBlockerId("");
      setRootCause("OTHER");
      setResolutionNotes("");
      queryClient.invalidateQueries({ queryKey: ["task-blockers"] });
      queryClient.invalidateQueries({ queryKey: ["blocker-audit-logs"] });
      setActiveScreen("dashboard");
    },
    onError: () => {
      showToast("Failed to resolve blocker", "error");
    }
  });

  // Manual Escalation
  const escalateBlockerMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiClient.post(`/api/v1/blockers/${id}/escalate/`);
      return res.data.data;
    },
    onSuccess: () => {
      showToast("Blocker escalated to executive levels", "success");
      queryClient.invalidateQueries({ queryKey: ["task-blockers"] });
      queryClient.invalidateQueries({ queryKey: ["blocker-audit-logs"] });
    },
    onError: () => {
      showToast("Failed to escalate blocker", "error");
    }
  });

  // Scan and check SLAs
  const checkSlasMutation = useMutation({
    mutationFn: async () => {
      const res = await apiClient.post("/api/v1/blockers/check-slas/");
      return res.data.data;
    },
    onSuccess: (data) => {
      showToast(data.message || "SLA scan completed", "success");
      queryClient.invalidateQueries({ queryKey: ["task-blockers"] });
      queryClient.invalidateQueries({ queryKey: ["blocker-audit-logs"] });
    },
    onError: () => {
      showToast("Failed to audit active SLAs", "error");
    }
  });

  // -----------------------------------------------------------------
  // Handlers
  // -----------------------------------------------------------------
  const handleLogSubmit = (e: React.FormEvent) => {
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

  return (
    <ProtectedRoute>
      <div className="p-6 space-y-6 max-w-6xl mx-auto text-foreground select-none relative pb-20">
        
        {/* Toast Alerts */}
        {toast && (
          <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-xl border text-xs font-semibold shadow-xl animate-slide-up ${
            toast.type === "success" 
              ? "bg-emerald-500/10 border-emerald-500/25 text-emerald-400" 
              : "bg-rose-500/10 border-rose-500/25 text-rose-400"
          }`}>
            {toast.type === "success" ? <CheckCircle className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
            <span>{toast.message}</span>
          </div>
        )}

        {/* Header Block */}
        <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-[#2d2d34]/60 pb-5 gap-4">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-white flex items-center gap-2.5">
              <ShieldAlert className="h-6 w-6 text-indigo-500" />
              <span>Blocker Control Center</span>
            </h1>
            <p className="text-xs text-[#8e8e95] mt-1 leading-relaxed">
              Analyze blocking parameters, track task completion SLAs, and automatically escalate risk scores.
            </p>
          </div>

          {/* Active Blocker dropdown in header */}
          {selectedBlockerId && selectedBlocker && (
            <div className="flex items-center bg-[#1c1c1f]/40 border border-[#2d2d34]/60 p-2.5 rounded-xl gap-2 self-start md:self-auto">
              <label htmlFor="active-blocker-select" className="text-[9px] uppercase font-bold text-[#8e8e95]">Active:</label>
              <select
                id="active-blocker-select"
                name="active-blocker-select"
                value={selectedBlockerId}
                onChange={(e) => {
                  setSelectedBlockerId(e.target.value);
                  setActiveScreen("details");
                }}
                autoComplete="off"
                className="bg-[#121214] border border-[#2d2d34]/60 rounded-lg text-xs text-indigo-400 font-bold px-2 py-1.5 focus:outline-none max-w-[160px] truncate"
              >
                {blockers.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.task_details?.title || "Task Link"} ({b.status})
                  </option>
                ))}
              </select>
              <button
                onClick={() => {
                  setSelectedBlockerId(null);
                  setActiveScreen("dashboard");
                }}
                className="text-[9px] uppercase font-black text-rose-400 hover:bg-rose-500/10 px-2 py-1.5 rounded-lg border border-rose-500/20 transition"
              >
                Exit
              </button>
            </div>
          )}
        </div>

        {/* Dynamic Screen Selection Tab Bar */}
        <div className="bg-[#1c1c1f] p-1.5 border border-[#2d2d34]/60 rounded-2xl flex gap-1 overflow-x-auto max-w-full no-scrollbar">
          {(["dashboard", "create", "details", "escalations", "sla"] as BlockerScreen[]).map((screen) => {
            const label = screenLabels[screen];
            const isBlockerSpecific = screen === "details";
            const isDisabled = isBlockerSpecific && !selectedBlockerId;
            
            return (
              <button
                key={screen}
                disabled={isDisabled}
                onClick={() => setActiveScreen(screen)}
                className={`py-1.5 px-3 rounded-xl text-[10px] font-bold uppercase tracking-wider shrink-0 transition ${
                  isDisabled 
                    ? "opacity-30 cursor-not-allowed text-[#8e8e95]" 
                    : activeScreen === screen
                    ? "bg-indigo-600 text-white shadow-md"
                    : "text-[#8e8e95] hover:text-white hover:bg-zinc-800/50"
                }`}
                title={isDisabled ? "Please select a blocker from the list to view details." : ""}
              >
                {label}
              </button>
            );
          })}
        </div>

        {/* ------------------------------------------------------------- */}
        {/* SCREEN 1: BLOCKER DASHBOARD                                   */}
        {/* ------------------------------------------------------------- */}
        {activeScreen === "dashboard" && (
          <div className="space-y-6">
            {/* Metrics cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 bg-[#1c1c1f]/40 border border-[#2d2d34]/60 rounded-xl flex items-center gap-3">
                <div className="p-2.5 bg-rose-500/10 rounded-lg text-rose-400 shrink-0">
                  <AlertTriangle className="h-4 w-4" />
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Active Blockers</span>
                  <p className="text-xl font-bold font-mono text-rose-400">{activeBlockers.length}</p>
                </div>
              </div>

              <div className="p-4 bg-[#1c1c1f]/40 border border-[#2d2d34]/60 rounded-xl flex items-center gap-3">
                <div className="p-2.5 bg-amber-500/10 rounded-lg text-amber-400 shrink-0">
                  <Flame className="h-4 w-4" />
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Escalated</span>
                  <p className="text-xl font-bold font-mono text-amber-400">{escalatedBlockers.length}</p>
                </div>
              </div>

              <div className="p-4 bg-[#1c1c1f]/40 border border-[#2d2d34]/60 rounded-xl flex items-center gap-3">
                <div className="p-2.5 bg-emerald-500/10 rounded-lg text-emerald-400 shrink-0">
                  <CheckCircle className="h-4 w-4" />
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Resolved</span>
                  <p className="text-xl font-bold font-mono text-emerald-400">{resolvedBlockers.length}</p>
                </div>
              </div>

              <div className="p-4 bg-[#1c1c1f]/40 border border-[#2d2d34]/60 rounded-xl flex items-center gap-3">
                <div className="p-2.5 bg-primary/10 rounded-lg text-primary shrink-0">
                  <TrendingUp className="h-4 w-4" />
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Risk Index</span>
                  <p className="text-xl font-bold font-mono text-primary">{totalRiskScore.toFixed(1)}</p>
                </div>
              </div>
            </div>

            {/* List and Type chart */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Blocker list */}
              <div className="lg:col-span-2 bg-[#1c1c1f]/40 border border-[#2d2d34]/60 p-5 rounded-2xl space-y-4">
                <div className="flex justify-between items-center border-b border-[#2d2d34]/40 pb-3">
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider">Active Blocker Logs</h3>
                  <button
                    onClick={() => setActiveScreen("create")}
                    className="py-1 px-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[9px] uppercase tracking-wider rounded-lg transition"
                  >
                    + Log Blocker
                  </button>
                </div>

                <div className="space-y-3 overflow-y-auto max-h-[380px] pr-1">
                  {isLoading ? (
                    <div className="text-center py-10 text-xs animate-pulse text-muted-foreground">Loading active blocker items...</div>
                  ) : activeBlockers.length === 0 ? (
                    <div className="text-center text-[#8e8e95] py-12 border border-dashed border-[#2d2d34]/40 rounded-xl h-36 flex flex-col justify-center">
                      No active blockers. Project velocity is clean.
                    </div>
                  ) : (
                    activeBlockers.map((b) => (
                      <div
                        key={b.id}
                        onClick={() => {
                          setSelectedBlockerId(b.id);
                          setActiveScreen("details");
                        }}
                        className="p-3 bg-[#121214]/60 border border-[#1f1f23] hover:border-indigo-500/10 rounded-xl cursor-pointer transition text-xs flex justify-between items-start gap-4"
                      >
                        <div className="space-y-1">
                          <span className="px-1.5 py-0.5 rounded text-[8px] font-bold text-white bg-indigo-600/80">
                            {BLOCKER_LABELS[b.blocker_type]}
                          </span>
                          <h4 className="font-bold text-white mt-1.5">{b.task_details?.title || "Task Link"}</h4>
                          <p className="text-[#8e8e95] text-[10px] leading-relaxed line-clamp-2">{b.description}</p>
                        </div>

                        <div className="text-right shrink-0 font-mono">
                          <span className={`block font-bold ${b.is_escalated ? "text-rose-400" : "text-indigo-400"}`}>
                            Risk {b.risk_score}
                          </span>
                          <span className="text-[8px] text-[#8e8e95] block">{b.time_active_hours}h active</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Distribution Chart */}
              <div className="bg-[#1c1c1f]/40 border border-[#2d2d34]/60 p-5 rounded-2xl space-y-4 flex flex-col justify-between">
                <div>
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider">Type Distribution</h3>
                  <p className="text-[9px] text-[#8e8e95] mt-0.5 font-semibold">Active blockers categorized by type</p>
                </div>

                <div className="h-40 flex items-end justify-around px-2 pb-1 border-b border-l border-[#2d2d34]/60 mt-4">
                  {Object.keys(BLOCKER_LABELS).map((type) => {
                    const count = blockerTypeCounts[type] || 0;
                    const pct = activeBlockers.length ? (count / activeBlockers.length) * 100 : 0;
                    return (
                      <div key={type} className="flex flex-col items-center gap-1.5 w-10">
                        <div
                          className="w-4 bg-indigo-600/80 hover:bg-indigo-600 transition-all rounded-t"
                          style={{ height: `${Math.max(8, (pct / 100) * 120)}px` }}
                        />
                        <span className="text-[7px] font-mono text-[#8e8e95] truncate w-full text-center">
                          {type}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* SCREEN 2: CREATE BLOCKER                                      */}
        {/* ------------------------------------------------------------- */}
        {activeScreen === "create" && (
          <div className="max-w-md mx-auto bg-[#1c1c1f]/40 border border-[#2d2d34]/60 p-6 rounded-2xl space-y-4">
            <h2 className="text-sm font-extrabold text-white uppercase tracking-wider flex items-center gap-2 border-b border-[#2d2d34]/30 pb-2">
              <PlusCircle className="h-4.5 w-4.5 text-indigo-500" />
              <span>Log Blocker Ticket</span>
            </h2>

            <form onSubmit={handleLogSubmit} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label htmlFor="linked-task-select" className="text-[10px] font-bold text-[#8e8e95] uppercase">Linked Work Task</label>
                <select
                  id="linked-task-select"
                  name="linked-task-select"
                  value={selectedTaskId}
                  onChange={(e) => setSelectedTaskId(e.target.value)}
                  autoComplete="off"
                  className="w-full bg-[#121214] border border-[#1f1f23] rounded-lg p-2 text-xs text-white focus:outline-none"
                  required
                >
                  <option value="">Select Task Objective...</option>
                  {allTasks.map(t => (
                    <option key={t.id} value={t.id}>{t.title} ({t.status})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label htmlFor="blocker-type-select" className="text-[10px] font-bold text-[#8e8e95] uppercase">Blocker Type</label>
                  <select
                    id="blocker-type-select"
                    name="blocker-type-select"
                    value={blockerType}
                    onChange={(e: any) => setBlockerType(e.target.value)}
                    autoComplete="off"
                    className="w-full bg-[#121214] border border-[#1f1f23] rounded-lg p-2 text-xs text-white focus:outline-none"
                  >
                    <option value="TECHNICAL">Technical Blocker</option>
                    <option value="APPROVAL">Waiting For Approval</option>
                    <option value="CLIENT">Waiting For Client</option>
                    <option value="QA">Waiting For QA</option>
                    <option value="DEVOPS">Waiting For DevOps</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label htmlFor="sla-threshold-input" className="text-[10px] font-bold text-[#8e8e95] uppercase">SLA Threshold (Hours)</label>
                  <input
                    id="sla-threshold-input"
                    name="sla-threshold-input"
                    type="number"
                    value={slaHours}
                    onChange={(e) => setSlaHours(e.target.value)}
                    autoComplete="off"
                    className="w-full bg-[#121214] border border-[#1f1f23] rounded-lg p-2 text-xs text-white focus:outline-none"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label htmlFor="blocker-description-textarea" className="text-[10px] font-bold text-[#8e8e95] uppercase">Description</label>
                <textarea
                  id="blocker-description-textarea"
                  name="blocker-description-textarea"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Provide scope description or blocking elements details..."
                  rows={4}
                  autoComplete="off"
                  className="w-full bg-[#121214] border border-[#1f1f23] rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-indigo-500 transition resize-none"
                  required
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setActiveScreen("dashboard")}
                  className="flex-1 py-2 bg-[#212124] hover:bg-[#2c2c31] border border-[#2d2d34]/60 text-white text-xs font-bold rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={logBlockerMutation.isPending}
                  className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg transition"
                >
                  {logBlockerMutation.isPending ? "Logging..." : "Log Blocker"}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* SCREEN 3: BLOCKER DETAILS                                     */}
        {/* ------------------------------------------------------------- */}
        {activeScreen === "details" && selectedBlocker && (
          <div className="space-y-6">
            <div className="bg-[#1c1c1f]/40 border border-[#2d2d34]/60 p-6 rounded-2xl space-y-6">
              
              <div className="flex justify-between items-start border-b border-[#2d2d34]/40 pb-4 gap-4">
                <div className="space-y-1">
                  <span className="text-[9px] uppercase font-bold text-indigo-400">Blocker Target</span>
                  <h2 className="text-lg font-black text-white">{selectedBlocker.task_details?.title || "Work Task"}</h2>
                  <p className="text-xs text-[#8e8e95] mt-1">{selectedBlocker.description}</p>
                </div>

                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase shrink-0 ${
                  selectedBlocker.status === "ACTIVE"
                    ? "bg-rose-500/10 text-rose-400 border border-rose-500/25 animate-pulse"
                    : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                }`}>
                  {selectedBlocker.status}
                </span>
              </div>

              {/* Grid indicators */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-[#121214]/60 border border-[#1f1f23] p-4 rounded-xl space-y-1">
                  <span className="text-[9px] uppercase font-bold text-[#8e8e95] block">Blocker Type</span>
                  <span className="text-sm font-extrabold text-indigo-400 block">
                    {BLOCKER_LABELS[selectedBlocker.blocker_type]}
                  </span>
                </div>

                <div className="bg-[#121214]/60 border border-[#1f1f23] p-4 rounded-xl space-y-1">
                  <span className="text-[9px] uppercase font-bold text-[#8e8e95] block">Risk Index Score</span>
                  <span className="text-sm font-extrabold text-white block">{selectedBlocker.risk_score}</span>
                </div>

                <div className="bg-[#121214]/60 border border-[#1f1f23] p-4 rounded-xl space-y-1">
                  <span className="text-[9px] uppercase font-bold text-[#8e8e95] block">Time Active</span>
                  <span className="text-sm font-extrabold text-white block">{selectedBlocker.time_active_hours} hours</span>
                </div>

                <div className="bg-[#121214]/60 border border-[#1f1f23] p-4 rounded-xl space-y-1">
                  <span className="text-[9px] uppercase font-bold text-[#8e8e95] block">SLA Limit Threshold</span>
                  <span className="text-sm font-extrabold text-white block">{selectedBlocker.sla_hours} hours</span>
                </div>
              </div>

              {/* Audit history timeline specific to this blocker */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                {/* Details list */}
                <div className="md:col-span-2 p-4 bg-[#121214]/40 border border-[#2d2d34]/40 rounded-xl space-y-3 text-xs">
                  <span className="text-[10px] uppercase font-black text-indigo-400 block border-b border-[#2d2d34]/40 pb-1">
                    Audit timeline log
                  </span>

                  <div className="space-y-3 relative pl-3.5 border-l border-zinc-800 ml-1.5 pt-1.5 max-h-[220px] overflow-y-auto pr-1">
                    {selectedBlockerLogs.length === 0 ? (
                      <div className="text-zinc-500 py-6 text-center">No audit logged events.</div>
                    ) : (
                      selectedBlockerLogs.map((log) => (
                        <div key={log.id} className="relative space-y-0.5">
                          <span className="absolute -left-5 top-0.5 bg-indigo-900/50 border border-indigo-500/40 rounded-full h-3 w-3 flex items-center justify-center">
                            <Activity className="h-1.5 w-1.5 text-indigo-400" />
                          </span>
                          <div className="flex justify-between items-center text-[9px] text-[#8e8e95] font-mono">
                            <span>{log.user_email || "System Automated"}</span>
                            <span>{new Date(log.timestamp).toLocaleTimeString()}</span>
                          </div>
                          <p className="text-[10px] text-white">
                            <span className="font-semibold text-indigo-400">{log.action}:</span> {log.notes}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Operations */}
                <div className="p-4 bg-[#121214]/40 border border-[#2d2d34]/40 rounded-xl space-y-3 text-xs h-fit">
                  <span className="text-[10px] uppercase font-black text-indigo-400 block border-b border-[#2d2d34]/40 pb-1">
                    Operations
                  </span>

                  <div className="space-y-2 pt-1.5">
                    {selectedBlocker.status === "ACTIVE" && (
                      <>
                        {!selectedBlocker.is_escalated && (
                          <button
                            onClick={() => escalateBlockerMutation.mutate(selectedBlocker.id)}
                            className="w-full py-2 bg-amber-600/10 hover:bg-amber-600 hover:text-white border border-amber-500/20 text-amber-400 font-bold rounded-lg transition text-center"
                          >
                            Trigger Escalation
                          </button>
                        )}
                        <button
                          onClick={() => openResolveModal(selectedBlocker.id)}
                          className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg transition text-center"
                        >
                          Resolve Blocker Ticket
                        </button>
                      </>
                    )}

                    {selectedBlocker.status === "RESOLVED" && (
                      <div className="space-y-1.5 text-[10px] text-[#8e8e95] bg-[#121214] border border-[#1f1f23] p-2.5 rounded-lg">
                        <span className="font-bold text-white block">Root Cause analysis</span>
                        <p>{ROOT_CAUSE_LABELS[selectedBlocker.root_cause as keyof typeof ROOT_CAUSE_LABELS] || selectedBlocker.root_cause}</p>
                        <span className="font-bold text-white block mt-2">Closing Resolution Notes</span>
                        <p className="italic">"{selectedBlocker.resolution_notes}"</p>
                      </div>
                    )}
                  </div>
                </div>

              </div>

            </div>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* SCREEN 4: ESCALATION QUEUE                                    */}
        {/* ------------------------------------------------------------- */}
        {activeScreen === "escalations" && (
          <div className="space-y-4">
            <h2 className="text-xs font-bold text-[#8e8e95] uppercase tracking-widest pl-1">SLA Violation Escalation Queue</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {escalatedBlockers.length === 0 ? (
                <div className="p-8 text-center text-xs text-[#8e8e95] border border-dashed border-[#2d2d34]/40 rounded-xl col-span-2">
                  No active critical escalations or SLA violations flagged.
                </div>
              ) : (
                escalatedBlockers.map((b) => (
                  <div key={b.id} className="bg-[#1c1c1f]/40 border border-rose-500/35 p-5 rounded-2xl shadow-md space-y-4 flex flex-col justify-between h-44">
                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center text-[10px]">
                        <span className="font-bold text-rose-400 uppercase tracking-wide">{BLOCKER_LABELS[b.blocker_type]}</span>
                        <span className="font-mono bg-rose-500/10 px-1.5 py-0.5 rounded font-bold text-rose-400 border border-rose-500/20">
                          Risk Index {b.risk_score}
                        </span>
                      </div>
                      <h4 className="font-bold text-white text-sm truncate">{b.task_details?.title || "Task"}</h4>
                      <p className="text-[#8e8e95] text-xs leading-relaxed line-clamp-2">{b.description}</p>
                    </div>

                    <div className="flex justify-between items-center border-t border-[#2d2d34]/40 pt-3">
                      <span className="text-[10px] text-[#8e8e95] font-mono">Clocks active: {b.time_active_hours}h</span>
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            setSelectedBlockerId(b.id);
                            setActiveScreen("details");
                          }}
                          className="px-2.5 py-1 border border-[#2d2d34]/60 hover:bg-zinc-800 text-white rounded text-[10px] font-bold transition"
                        >
                          Audit logs
                        </button>
                        <button
                          onClick={() => openResolveModal(b.id)}
                          className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[10px] font-bold transition"
                        >
                          Resolve
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* SCREEN 5: SLA MONITORING & HISTORY                            */}
        {/* ------------------------------------------------------------- */}
        {activeScreen === "sla" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* SLA bars logs */}
            <div className="lg:col-span-2 bg-[#1c1c1f]/40 border border-[#2d2d34]/60 p-5 rounded-2xl space-y-4">
              <div className="flex justify-between items-center border-b border-[#2d2d34]/40 pb-3">
                <div>
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider">Active SLA Clocks</h3>
                  <p className="text-[9px] text-[#8e8e95] mt-0.5">Real-time depletion trackers for blockers resolution</p>
                </div>

                <button
                  onClick={() => checkSlasMutation.mutate()}
                  className="flex items-center gap-1.5 border border-[#2d2d34]/60 text-[9px] font-black uppercase tracking-wider px-2 py-1.5 rounded-lg bg-[#121214] hover:bg-[#161618] transition focus:outline-none text-indigo-400"
                >
                  <RefreshCw className="h-3 w-3 shrink-0" />
                  <span>Scan active SLAs</span>
                </button>
              </div>

              <div className="space-y-4 max-h-[420px] overflow-y-auto pr-1">
                {activeBlockers.length === 0 ? (
                  <div className="text-center py-10 text-xs text-[#8e8e95]">No active blocker SLAs to monitor.</div>
                ) : (
                  activeBlockers.map((b) => {
                    const pct = Math.min(100, (b.time_active_hours / b.sla_hours) * 100);
                    return (
                      <div key={b.id} className="space-y-2 text-xs">
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="font-bold text-white">{b.task_details?.title || "Task"}</span>
                            <span className="text-[9px] text-[#8e8e95] block mt-0.5">{BLOCKER_LABELS[b.blocker_type]}</span>
                          </div>

                          <div className="text-right font-mono">
                            <span className="font-bold text-white block">{b.time_active_hours}h / {b.sla_hours}h SLA limit</span>
                            <span className={`text-[9px] font-bold ${pct >= 100 ? "text-rose-400" : "text-[#8e8e95]"}`}>
                              {pct >= 100 ? "SLA VIOLATED" : `${Math.round(100 - pct)}% remaining`}
                            </span>
                          </div>
                        </div>

                        {/* Progress Bar */}
                        <div className="h-2 w-full bg-zinc-800 rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full transition-all duration-500 ease-out ${
                              b.is_escalated ? "bg-rose-500" : pct > 75 ? "bg-amber-500" : "bg-indigo-500"
                            }`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Resolution History */}
            <div className="bg-[#1c1c1f]/40 border border-[#2d2d34]/60 p-5 rounded-2xl space-y-4 flex flex-col">
              <div>
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">Resolution History</h3>
                <p className="text-[9px] text-[#8e8e95] mt-0.5 font-semibold">Archived resolutions records</p>
              </div>

              <div className="flex-1 space-y-3 overflow-y-auto max-h-[380px] pr-1">
                {resolvedBlockers.length === 0 ? (
                  <div className="text-center text-[10px] text-[#8e8e95] py-12 border border-dashed border-[#2d2d34]/40 rounded-xl h-36 flex flex-col justify-center">
                    No resolved blockers logged.
                  </div>
                ) : (
                  resolvedBlockers.map((b) => (
                    <div key={b.id} className="p-3 bg-[#121214]/60 border border-[#1f1f23] rounded-xl text-xs space-y-1.5">
                      <div className="flex justify-between items-center text-[8px] text-[#8e8e95] font-mono border-b border-[#2d2d34]/35 pb-1">
                        <span>{BLOCKER_LABELS[b.blocker_type]}</span>
                        <span className="text-emerald-400 font-bold uppercase">RESOLVED</span>
                      </div>
                      <h5 className="font-bold text-white truncate">{b.task_details?.title || "Task Link"}</h5>
                      <p className="text-[#8e8e95] text-[10px] line-clamp-2">"{b.description}"</p>
                      
                      <div className="text-[9px] bg-emerald-950/20 border border-emerald-900/30 p-2 rounded text-emerald-400 space-y-0.5">
                        <span className="font-bold block">Cause: {ROOT_CAUSE_LABELS[b.root_cause as keyof typeof ROOT_CAUSE_LABELS] || b.root_cause}</span>
                        {b.resolution_notes && <span className="italic block mt-1">Notes: "{b.resolution_notes}"</span>}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

          </div>
        )}

        {/* Resolve Blocker Modal (Universal Dialog overlay) */}
        {isResolveModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex justify-center items-center p-4">
            <div className="bg-[#161618] border border-[#2d2d34]/80 rounded-2xl w-full max-w-md shadow-2xl p-6 relative">
              <button
                onClick={() => setIsResolveModalOpen(false)}
                className="absolute top-4 right-4 text-[#8e8e95] hover:text-white transition p-1 hover:bg-[#2d2d34]/60 rounded"
              >
                <X className="h-4 w-4" />
              </button>

              <h2 className="text-sm font-extrabold text-white uppercase tracking-wider mb-4 border-b border-[#2d2d34]/40 pb-2">
                Resolve Blocker Ticket
              </h2>

              <form onSubmit={handleResolveSubmit} className="space-y-4 text-xs">
                <div className="space-y-1">
                  <label htmlFor="root-cause-select" className="text-[10px] font-bold text-[#8e8e95] uppercase">Root Cause Analysis</label>
                  <select
                    id="root-cause-select"
                    name="root-cause-select"
                    value={rootCause}
                    onChange={(e) => setRootCause(e.target.value)}
                    autoComplete="off"
                    className="w-full bg-[#121214] border border-[#1f1f23] rounded-lg p-2 text-xs text-white focus:outline-none"
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
                  <label htmlFor="resolution-notes-textarea" className="text-[10px] font-bold text-[#8e8e95] uppercase">Resolution Notes</label>
                  <textarea
                    id="resolution-notes-textarea"
                    name="resolution-notes-textarea"
                    value={resolutionNotes}
                    onChange={(e) => setResolutionNotes(e.target.value)}
                    placeholder="Provide details about what resolved the blocker ticket..."
                    rows={4}
                    autoComplete="off"
                    className="w-full bg-[#121214] border border-[#1f1f23] rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-indigo-500 resize-none"
                    required
                  />
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsResolveModalOpen(false)}
                    className="flex-1 py-2 bg-[#212124] hover:bg-[#2c2c31] border border-[#2d2d34]/60 text-white text-xs font-bold rounded-lg transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg transition"
                  >
                    Resolve Blocker
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      </div>
    </ProtectedRoute>
  );
}
