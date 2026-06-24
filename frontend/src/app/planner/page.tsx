"use client";

import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/infrastructure/api/api-client";
import { ProtectedRoute } from "@/features/rbac/components/ProtectedRoute";
import { useAuthorization } from "@/features/rbac/hooks/useAuthorization";
import { useAuthStore } from "@/infrastructure/store/auth-store";
import { 
  Calendar, 
  AlertCircle, 
  RefreshCw, 
  Layers, 
  Clock, 
  GripVertical, 
  Plus, 
  CheckCircle2, 
  AlertTriangle,
  Play, 
  Check, 
  X, 
  Save, 
  ShieldAlert,
  ArrowRight,
  Sparkles
} from "lucide-react";

interface TaskItem {
  id: string;
  title: string;
  description: string;
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  status: "BACKLOG" | "TODO" | "IN_PROGRESS" | "REVIEW" | "DONE";
  estimated_hours: string;
  due_date: string | null;
  assignee: string | null;
  assignee_email?: string;
}

interface RiskItem {
  code: string;
  message: string;
  level: "WARNING" | "CRITICAL";
}

interface PlannerData {
  suggested_order: TaskItem[];
  risks: RiskItem[];
}

export default function PlannerPage() {
  const queryClient = useQueryClient();
  const { hasPermission } = useAuthorization();
  const { user, activeOrganizationId } = useAuthStore();
  const canEdit = hasPermission("TASK_EDIT") || hasPermission("TASK_CREATE");

  const [scheduledTasks, setScheduledTasks] = useState<TaskItem[]>([]);
  const [backlogTasks, setBacklogTasks] = useState<TaskItem[]>([]);
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [dragSource, setDragSource] = useState<"BACKLOG" | "SCHEDULED" | null>(null);
  
  // Toast notifications state
  const [toasts, setToasts] = useState<Array<{ id: string; message: string; type: "success" | "info" | "warning" }>>([]);
  const showToast = (message: string, type: "success" | "info" | "warning" = "success") => {
    const id = Math.random().toString();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  // Auto-save status
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");

  // Form modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<TaskItem | null>(null);
  const [formTitle, setFormTitle] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formPriority, setFormPriority] = useState<"LOW" | "MEDIUM" | "HIGH" | "URGENT">("MEDIUM");
  const [formStatus, setFormStatus] = useState<"BACKLOG" | "TODO" | "IN_PROGRESS" | "REVIEW" | "DONE">("TODO");
  const [formEstimatedHours, setFormEstimatedHours] = useState("2.0");
  const [formDueDate, setFormDueDate] = useState("");

  // 1. Fetch Suggested Plan
  const suggestedPlanQuery = useQuery<PlannerData>({
    queryKey: ["planner-suggestion", activeOrganizationId],
    queryFn: async () => {
      const res = await apiClient.get("/api/v1/planner/suggest/");
      return res.data.data;
    },
  });

  // 2. Fetch All Tasks (for the backlog pool)
  const allTasksQuery = useQuery<TaskItem[]>({
    queryKey: ["planner-all-tasks", activeOrganizationId],
    queryFn: async () => {
      const res = await apiClient.get("/api/v1/planner/tasks/");
      return res.data.data || [];
    },
  });

  // Sync state once queries load
  useEffect(() => {
    if (suggestedPlanQuery.data) {
      setScheduledTasks(suggestedPlanQuery.data.suggested_order);
    }
  }, [suggestedPlanQuery.data]);

  useEffect(() => {
    if (allTasksQuery.data && suggestedPlanQuery.data) {
      const scheduledIds = new Set(suggestedPlanQuery.data.suggested_order.map((t) => t.id));
      const unscheduled = allTasksQuery.data.filter((t) => !scheduledIds.has(t.id) && t.status !== "DONE");
      setBacklogTasks(unscheduled);
    }
  }, [allTasksQuery.data, suggestedPlanQuery.data]);

  // Mutation: Save customized sequence order to DailyPlan (Auto-Save)
  const savePlanMutation = useMutation({
    mutationFn: async (taskIds: string[]) => {
      setSaveStatus("saving");
      const today = new Date().toISOString().split("T")[0];
      const res = await apiClient.post("/api/v1/planner/plans/", {
        date: today,
        tasks_order: taskIds,
      });
      return res.data;
    },
    onSuccess: () => {
      setSaveStatus("saved");
      showToast("Planner execution order synced successfully", "success");
    },
    onError: () => {
      setSaveStatus("error");
      showToast("Failed to auto-save planner order", "warning");
    }
  });

  // Mutation: Create Task
  const createTaskMutation = useMutation({
    mutationFn: async (taskData: Omit<TaskItem, "id">) => {
      const res = await apiClient.post("/api/v1/planner/tasks/", taskData);
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["planner-all-tasks"] });
      queryClient.invalidateQueries({ queryKey: ["planner-suggestion"] });
      setIsModalOpen(false);
      showToast("Task created successfully", "success");
    },
    onError: (err: any) => {
      const errMsg = err?.response?.data?.errors?.[0]?.message || "Failed to create task";
      showToast(errMsg, "warning");
    }
  });

  // Mutation: Update Task
  const updateTaskMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<TaskItem> }) => {
      const res = await apiClient.patch(`/api/v1/planner/tasks/${id}/`, data);
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["planner-all-tasks"] });
      queryClient.invalidateQueries({ queryKey: ["planner-suggestion"] });
      setIsModalOpen(false);
      showToast("Task updated successfully", "success");
    },
    onError: (err: any) => {
      const errMsg = err?.response?.data?.errors?.[0]?.message || "Failed to update task";
      showToast(errMsg, "warning");
    }
  });

  // --- Drag and Drop Event Handlers ---
  const handleDragStart = (id: string, source: "BACKLOG" | "SCHEDULED") => {
    if (!canEdit) {
      showToast("Access Restricted: You lack permissions to plan tasks.", "warning");
      return;
    }
    setDraggedTaskId(id);
    setDragSource(source);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDropToScheduled = (e: React.DragEvent, index?: number) => {
    e.preventDefault();
    if (!canEdit || !draggedTaskId || dragSource === null) return;

    if (dragSource === "BACKLOG") {
      const task = backlogTasks.find((t) => t.id === draggedTaskId);
      if (!task) return;

      setBacklogTasks(backlogTasks.filter((t) => t.id !== draggedTaskId));
      const newScheduled = [...scheduledTasks];
      if (typeof index === "number") {
        newScheduled.splice(index, 0, task);
      } else {
        newScheduled.push(task);
      }
      setScheduledTasks(newScheduled);
      savePlanMutation.mutate(newScheduled.map((t) => t.id));
    } else if (dragSource === "SCHEDULED" && typeof index === "number") {
      const task = scheduledTasks.find((t) => t.id === draggedTaskId);
      if (!task) return;

      const filtered = scheduledTasks.filter((t) => t.id !== draggedTaskId);
      filtered.splice(index, 0, task);
      setScheduledTasks(filtered);
      savePlanMutation.mutate(filtered.map((t) => t.id));
    }

    setDraggedTaskId(null);
    setDragSource(null);
  };

  const handleDropToBacklog = (e: React.DragEvent) => {
    e.preventDefault();
    if (!canEdit || !draggedTaskId || dragSource !== "SCHEDULED") return;

    const task = scheduledTasks.find((t) => t.id === draggedTaskId);
    if (!task) return;

    setScheduledTasks(scheduledTasks.filter((t) => t.id !== draggedTaskId));
    setBacklogTasks([...backlogTasks, task]);
    savePlanMutation.mutate(scheduledTasks.filter((t) => t.id !== draggedTaskId).map((t) => t.id));

    setDraggedTaskId(null);
    setDragSource(null);
  };

  const handleRecalculateSuggested = async () => {
    await suggestedPlanQuery.refetch();
    showToast("Suggested topological sort applied", "info");
  };

  // --- Modal Forms Managers ---
  const openCreateModal = () => {
    if (!canEdit) return;
    setEditingTask(null);
    setFormTitle("");
    setFormDescription("");
    setFormPriority("MEDIUM");
    setFormStatus("TODO");
    setFormEstimatedHours("2.0");
    setFormDueDate(new Date().toISOString().split("T")[0]);
    setIsModalOpen(true);
  };

  const openEditModal = (task: TaskItem) => {
    if (!canEdit) return;
    setEditingTask(task);
    setFormTitle(task.title);
    setFormDescription(task.description || "");
    setFormPriority(task.priority);
    setFormStatus(task.status);
    setFormEstimatedHours(task.estimated_hours);
    setFormDueDate(task.due_date || "");
    setIsModalOpen(true);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Simple verification
    if (!formTitle.trim()) {
      showToast("Task title is required", "warning");
      return;
    }

    const payload = {
      title: formTitle,
      description: formDescription,
      priority: formPriority,
      status: formStatus,
      estimated_hours: formEstimatedHours,
      due_date: formDueDate || null,
      assignee: user?.id || null
    };

    if (editingTask) {
      updateTaskMutation.mutate({ id: editingTask.id, data: payload });
    } else {
      createTaskMutation.mutate(payload);
    }
  };

  // --- Metrics Summary ---
  const totalPlannedHours = scheduledTasks.reduce(
    (acc, t) => acc + parseFloat(t.estimated_hours || "0"),
    0
  );
  const totalTasksCount = backlogTasks.length + scheduledTasks.length;
  const completedTasksCount = allTasksQuery.data?.filter(t => t.status === "DONE").length || 0;
  const criticalRisksCount = suggestedPlanQuery.data?.risks.filter(r => r.level === "CRITICAL").length || 0;

  // --- Daily Timeline Layout Calculator ---
  // Start from 09:00 AM, allocate tasks consecutively based on estimated hours
  const parseHoursToTimeline = () => {
    let currentHour = 9.0; // 9:00 AM
    return scheduledTasks.map((t) => {
      const duration = parseFloat(t.estimated_hours || "1");
      const start = currentHour;
      const end = currentHour + duration;
      currentHour = end;

      const formatTime = (time: number) => {
        const hours24 = Math.floor(time);
        const minutes = Math.round((time - hours24) * 60);
        const ampm = hours24 >= 12 ? "PM" : "AM";
        const displayHour = hours24 % 12 === 0 ? 12 : hours24 % 12;
        const displayMinutes = minutes < 10 ? `0${minutes}` : minutes;
        return `${displayHour}:${displayMinutes} ${ampm}`;
      };

      return {
        task: t,
        timeSpan: `${formatTime(start)} - ${formatTime(end)}`,
      };
    });
  };

  const timelineSchedule = parseHoursToTimeline();

  // Loading indicator states
  if (suggestedPlanQuery.isLoading || allTasksQuery.isLoading) {
    return (
      <main className="space-y-6 animate-pulse p-6">
        <div className="h-10 bg-muted rounded w-1/4"></div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="h-20 bg-muted rounded"></div>
          <div className="h-20 bg-muted rounded"></div>
          <div className="h-20 bg-muted rounded"></div>
          <div className="h-20 bg-muted rounded"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          <div className="md:col-span-4 h-96 bg-muted rounded"></div>
          <div className="md:col-span-8 h-96 bg-muted rounded"></div>
        </div>
      </main>
    );
  }

  return (
    <ProtectedRoute>
      <main className="space-y-6 pb-12">
        {/* Toast alerts */}
        <div className="fixed bottom-5 right-5 z-50 space-y-2 pointer-events-none">
          {toasts.map((toast) => (
            <div
              key={toast.id}
              className={`p-3 rounded-lg border shadow-lg text-xs font-semibold flex items-center gap-2 animate-bounce bg-popover/90 text-popover-foreground ${
                toast.type === "success" ? "border-emerald-500/50 text-emerald-400" : "border-rose-500/50 text-rose-400"
              }`}
            >
              <AlertCircle className="h-4 w-4" />
              <span>{toast.message}</span>
            </div>
          ))}
        </div>

        {/* Header */}
        <header className="flex flex-col md:flex-row md:justify-between md:items-center border-b border-border pb-4 gap-4">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight flex items-center gap-2">
              Smart Daily Planner
              <span className="text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20 flex items-center gap-1">
                <Sparkles className="h-2.5 w-2.5" /> AI Engine
              </span>
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              Topologically sorted daily sequence resolving blockers and warning workloads.
            </p>
          </div>

          <div className="flex items-center gap-3 self-end md:self-auto">
            {/* Auto save badge */}
            <div className="text-[11px] font-medium text-muted-foreground/80 flex items-center gap-1.5 bg-muted/20 px-2.5 py-1.5 rounded-lg border border-border/40">
              <span className={`h-1.5 w-1.5 rounded-full ${
                saveStatus === "saving" ? "bg-amber-400 animate-ping" : saveStatus === "saved" ? "bg-emerald-400" : "bg-zinc-400"
              }`} />
              <span>
                {saveStatus === "saving" ? "Saving Draft..." : saveStatus === "saved" ? "Saved to Cloud" : "Cloud Synced"}
              </span>
            </div>

            <button
              onClick={handleRecalculateSuggested}
              disabled={!canEdit}
              className="flex items-center gap-1.5 border text-xs font-semibold px-3 py-2 rounded-lg bg-card hover:bg-muted transition focus:outline-none disabled:opacity-50"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span>AI Suggest Sort</span>
            </button>

            {canEdit && (
              <button
                onClick={openCreateModal}
                className="flex items-center gap-1 px-3 py-2 text-xs font-semibold text-primary-foreground bg-primary rounded-lg hover:bg-primary/95 transition"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>New Task</span>
              </button>
            )}
          </div>
        </header>

        {/* RBAC Warning Banner */}
        {!canEdit && (
          <div className="bg-amber-950/20 border border-amber-900/50 text-amber-400 p-3.5 rounded-xl flex gap-3 text-xs">
            <ShieldAlert className="h-4 w-4 shrink-0" />
            <div>
              <span className="font-semibold uppercase tracking-wider text-[10px]">Read-Only View</span>
              <p className="mt-0.5">You do not have write permissions for planning. Interactive modifications and drag-drop order changes are disabled.</p>
            </div>
          </div>
        )}

        {/* Summary Metrics */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 bg-card border rounded-xl shadow-sm flex items-center gap-3">
            <div className="p-2.5 bg-primary/10 rounded-lg text-primary shrink-0">
              <Layers className="h-4 w-4" />
            </div>
            <div>
              <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Active Tasks</span>
              <p className="text-xl font-bold font-mono">{totalTasksCount}</p>
            </div>
          </div>

          <div className="p-4 bg-card border rounded-xl shadow-sm flex items-center gap-3">
            <div className={`p-2.5 rounded-lg shrink-0 ${
              totalPlannedHours > 8 ? "bg-rose-500/10 text-rose-400" : "bg-emerald-500/10 text-emerald-400"
            }`}>
              <Clock className="h-4 w-4" />
            </div>
            <div>
              <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Planned Time</span>
              <p className="text-xl font-bold font-mono">{totalPlannedHours.toFixed(1)}h / 8.0h</p>
            </div>
          </div>

          <div className="p-4 bg-card border rounded-xl shadow-sm flex items-center gap-3">
            <div className="p-2.5 bg-emerald-500/10 rounded-lg text-emerald-400 shrink-0">
              <CheckCircle2 className="h-4 w-4" />
            </div>
            <div>
              <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Archive Closed</span>
              <p className="text-xl font-bold font-mono">{completedTasksCount}</p>
            </div>
          </div>

          <div className="p-4 bg-card border rounded-xl shadow-sm flex items-center gap-3">
            <div className={`p-2.5 rounded-lg shrink-0 ${
              criticalRisksCount > 0 ? "bg-rose-500/10 text-rose-400" : "bg-zinc-500/10 text-zinc-400"
            }`}>
              <AlertTriangle className="h-4 w-4" />
            </div>
            <div>
              <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Plan Risks</span>
              <p className="text-xl font-bold font-mono">{suggestedPlanQuery.data?.risks.length || 0}</p>
            </div>
          </div>
        </section>

        {/* Risk Center Widget */}
        {suggestedPlanQuery.data?.risks && suggestedPlanQuery.data.risks.length > 0 && (
          <section className="bg-card border rounded-xl p-4 shadow-sm space-y-2">
            <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">Planner Risk Center</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {suggestedPlanQuery.data.risks.map((risk, idx) => (
                <div
                  key={idx}
                  className={`rounded-lg p-3 text-xs font-medium border flex gap-3 items-start ${
                    risk.level === "CRITICAL"
                      ? "bg-rose-950/20 border-rose-900/40 text-rose-400"
                      : "bg-amber-950/20 border-amber-900/40 text-amber-400"
                  }`}
                >
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold uppercase tracking-wider text-[10px] font-mono">
                      {risk.code.replace("_", " ")}
                    </span>
                    <p className="mt-0.5 leading-relaxed text-foreground">{risk.message}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Drag Drop Grid Area */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 select-none">
          
          {/* Unscheduled Backlog Column */}
          <section
            onDragOver={handleDragOver}
            onDrop={handleDropToBacklog}
            className="lg:col-span-4 bg-card border rounded-xl p-5 shadow-sm space-y-4 flex flex-col min-h-[480px]"
          >
            <div>
              <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Unscheduled Backlog</h2>
              <p className="text-[10px] text-muted-foreground mt-0.5">Drag tasks to today's schedule</p>
            </div>

            <div className="flex-1 space-y-2 max-h-[500px] overflow-y-auto pr-1">
              {backlogTasks.length === 0 ? (
                <div className="p-8 text-center text-xs text-muted-foreground border border-dashed rounded-lg border-border/80 flex flex-col justify-center h-48">
                  No pending tasks in backlog.
                </div>
              ) : (
                backlogTasks.map((task) => (
                  <div
                    key={task.id}
                    draggable={canEdit}
                    onDragStart={() => handleDragStart(task.id, "BACKLOG")}
                    onClick={() => openEditModal(task)}
                    className="p-3 bg-muted/20 hover:bg-muted/40 border rounded-lg cursor-pointer active:cursor-grabbing transition text-xs flex gap-2.5 items-start relative group"
                  >
                    {canEdit && <GripVertical className="h-4 w-4 text-muted-foreground/60 shrink-0 mt-0.5 cursor-grab" />}
                    <div className="space-y-1 overflow-hidden leading-tight flex-1">
                      <p className="font-semibold text-foreground group-hover:text-primary transition truncate">{task.title}</p>
                      {task.description && <p className="text-[10px] text-muted-foreground truncate">{task.description}</p>}
                      <div className="flex justify-between items-center text-[9px] text-muted-foreground pt-1 border-t border-border/30 mt-1">
                        <span className="font-mono">{task.estimated_hours}h</span>
                        <span className={`font-bold uppercase ${
                          task.priority === "URGENT" ? "text-rose-400" : task.priority === "HIGH" ? "text-amber-400" : "text-zinc-400"
                        }`}>{task.priority}</span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>

          {/* Today's Daily Schedule Column */}
          <section
            onDragOver={handleDragOver}
            onDrop={(e) => handleDropToScheduled(e)}
            className="lg:col-span-8 bg-card border rounded-xl p-5 shadow-sm flex flex-col min-h-[480px] space-y-4"
          >
            <div className="flex justify-between items-center border-b pb-2">
              <div>
                <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Today's Schedule</h2>
                <p className="text-[10px] text-muted-foreground mt-0.5">Execution order (top to bottom)</p>
              </div>
              <div className="text-right text-xs">
                <span className="text-muted-foreground">Workload: </span>
                <span className={`font-mono font-bold ${
                  totalPlannedHours > 8 ? "text-rose-400" : "text-emerald-400"
                }`}>
                  {totalPlannedHours.toFixed(1)}h / 8.0h
                </span>
              </div>
            </div>

            <div className="flex-1 space-y-2 max-h-[500px] overflow-y-auto pr-1">
              {scheduledTasks.length === 0 ? (
                <div className="p-12 text-center text-xs text-muted-foreground border border-dashed rounded-lg border-border/80 flex-1 flex flex-col justify-center items-center gap-2 min-h-[300px]">
                  <Calendar className="h-8 w-8 text-muted-foreground/45" />
                  <p>Daily plan is empty.</p>
                  <p className="text-[10px] text-muted-foreground/75">Drag tasks from the backlog column to plan your day.</p>
                </div>
              ) : (
                scheduledTasks.map((task, index) => (
                  <div
                    key={task.id}
                    draggable={canEdit}
                    onDragStart={() => handleDragStart(task.id, "SCHEDULED")}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDropToScheduled(e, index)}
                    onClick={() => openEditModal(task)}
                    className="p-3 bg-muted/20 hover:bg-muted/40 border rounded-lg cursor-pointer active:cursor-grabbing transition text-xs flex items-center justify-between gap-3 group"
                  >
                    <div className="flex items-center gap-2.5 overflow-hidden flex-1">
                      <span className="font-mono text-[10px] text-primary font-bold bg-primary/10 border border-primary/20 rounded h-5 w-5 flex items-center justify-center shrink-0">
                        {index + 1}
                      </span>
                      {canEdit && <GripVertical className="h-4 w-4 text-muted-foreground/60 shrink-0" />}
                      <p className="font-semibold text-foreground group-hover:text-primary transition truncate leading-none">{task.title}</p>
                    </div>

                    <div className="flex gap-4 items-center shrink-0">
                      <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        <span className="font-mono">{task.estimated_hours}h</span>
                      </div>
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                        task.priority === "URGENT" || task.priority === "HIGH"
                          ? "bg-rose-500/10 text-rose-400 border border-rose-900/40"
                          : "bg-zinc-500/10 text-zinc-400 border border-zinc-900/30"
                      }`}>
                        {task.priority}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>

        </div>

        {/* Daily Timeline Scheduler & Dependency Graph */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Timeline Block Scheduler */}
          <section className="bg-card border rounded-xl p-5 shadow-sm space-y-4">
            <div>
              <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Sequential Timeline Scheduler</h2>
              <p className="text-[10px] text-muted-foreground mt-0.5">Consecutive calendar view starting at 9:00 AM</p>
            </div>

            <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
              {timelineSchedule.length === 0 ? (
                <div className="text-center text-xs text-muted-foreground py-12 border border-dashed rounded-lg">
                  No scheduled items to display.
                </div>
              ) : (
                timelineSchedule.map((item, idx) => (
                  <div key={idx} className="flex gap-3 items-center border-l-2 border-primary/40 pl-3 py-1">
                    <span className="text-[10px] font-mono text-muted-foreground shrink-0 w-32">{item.timeSpan}</span>
                    <ArrowRight className="h-3 w-3 text-muted-foreground/45" />
                    <span className="text-xs font-semibold text-foreground truncate">{item.task.title}</span>
                  </div>
                ))
              )}
            </div>
          </section>

          {/* Dependency Graph Visualization */}
          <section className="bg-card border rounded-xl p-5 shadow-sm space-y-4">
            <div>
              <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Workspace Dependency Graph</h2>
              <p className="text-[10px] text-muted-foreground mt-0.5">Visual blocking links mapped for daily alignment</p>
            </div>

            <div className="max-h-[360px] overflow-y-auto space-y-3 pr-1">
              {scheduledTasks.length === 0 ? (
                <div className="text-center text-xs text-muted-foreground py-12 border border-dashed rounded-lg">
                  Empty plan graph.
                </div>
              ) : (
                <div className="space-y-2">
                  {scheduledTasks.map((t, idx) => {
                    // Check if current task blocks others
                    const blockers = scheduledTasks.slice(0, idx); // topological sort dictates blockers are earlier
                    return (
                      <div key={t.id} className="p-3 bg-muted/10 border border-border/40 rounded-lg flex flex-col gap-1">
                        <span className="font-semibold text-xs text-foreground truncate">{t.title}</span>
                        {idx > 0 ? (
                          <div className="flex items-center gap-1.5 flex-wrap pt-1">
                            <span className="text-[9px] text-muted-foreground">Sequenced after:</span>
                            <span className="text-[9px] bg-primary/10 text-primary font-semibold px-1 rounded truncate max-w-[200px]">
                              {blockers[blockers.length - 1].title}
                            </span>
                          </div>
                        ) : (
                          <span className="text-[9px] text-emerald-400 font-mono">No prior blockers - Root Task</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </section>

        </div>

        {/* Task Form Modal (Creation / Modification) */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex justify-center items-center p-4">
            <div className="bg-card border rounded-xl w-full max-w-lg shadow-2xl p-6 relative">
              <button
                onClick={() => setIsModalOpen(false)}
                className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition"
              >
                <X className="h-4 w-4" />
              </button>

              <h2 className="text-lg font-bold text-foreground mb-4">
                {editingTask ? "Modify Task" : "Create New Task"}
              </h2>

              <form onSubmit={handleFormSubmit} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted-foreground">Task Title</label>
                  <input
                    type="text"
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    placeholder="Enter task title..."
                    className="w-full bg-muted/30 border border-border rounded-lg p-2 text-xs focus:ring-1 focus:ring-primary focus:outline-none"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted-foreground">Description</label>
                  <textarea
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                    placeholder="Task details..."
                    rows={3}
                    className="w-full bg-muted/30 border border-border rounded-lg p-2 text-xs focus:ring-1 focus:ring-primary focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-muted-foreground">Priority</label>
                    <select
                      value={formPriority}
                      onChange={(e: any) => setFormPriority(e.target.value)}
                      className="w-full bg-muted/30 border border-border rounded-lg p-2 text-xs focus:outline-none"
                    >
                      <option value="LOW">Low</option>
                      <option value="MEDIUM">Medium</option>
                      <option value="HIGH">High</option>
                      <option value="URGENT">Urgent</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-muted-foreground">Status</label>
                    <select
                      value={formStatus}
                      onChange={(e: any) => setFormStatus(e.target.value)}
                      className="w-full bg-muted/30 border border-border rounded-lg p-2 text-xs focus:outline-none"
                    >
                      <option value="BACKLOG">Backlog</option>
                      <option value="TODO">To Do</option>
                      <option value="IN_PROGRESS">In Progress</option>
                      <option value="REVIEW">Under Review</option>
                      <option value="DONE">Done</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-muted-foreground">Estimated Hours</label>
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      value={formEstimatedHours}
                      onChange={(e) => setFormEstimatedHours(e.target.value)}
                      className="w-full bg-muted/30 border border-border rounded-lg p-2 text-xs focus:ring-1 focus:ring-primary focus:outline-none"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-muted-foreground">Due Date</label>
                    <input
                      type="date"
                      value={formDueDate}
                      onChange={(e) => setFormDueDate(e.target.value)}
                      className="w-full bg-muted/30 border border-border rounded-lg p-2 text-xs focus:ring-1 focus:ring-primary focus:outline-none"
                    />
                  </div>
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
                    Save Changes
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
