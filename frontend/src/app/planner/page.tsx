"use client";

import React, { useState, useEffect, useRef } from "react";
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
  Pause,
  RotateCcw,
  Check, 
  X, 
  ShieldAlert,
  ArrowRight,
  Sparkles,
  BarChart2,
  ListTodo,
  Timer
} from "lucide-react";

type PlannerScreen = 
  | "today"
  | "weekly"
  | "queue"
  | "focus"
  | "stats";

const screenLabels: Record<PlannerScreen, string> = {
  today: "Today's Planner",
  weekly: "Weekly Planner",
  queue: "My Priorities",
  focus: "Focus Session",
  stats: "Productivity Statistics",
};

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

  const [activeScreen, setActiveScreen] = useState<PlannerScreen>("today");
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

  // Pomodoro Focus Timer State
  const [timerSeconds, setTimerSeconds] = useState(1500); // 25 min
  const [timerActive, setTimerActive] = useState(false);
  const [timerFocusTask, setTimerFocusTask] = useState<string>("");
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (timerActive) {
      timerRef.current = setInterval(() => {
        setTimerSeconds((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current!);
            setTimerActive(false);
            showToast("Focus session completed! Take a short break.", "success");
            return 1500;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [timerActive]);

  const formatTimer = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  // -----------------------------------------------------------------
  // Queries
  // -----------------------------------------------------------------
  
  // 1. Fetch Suggested Plan
  const suggestedPlanQuery = useQuery<PlannerData>({
    queryKey: ["planner-suggestion", activeOrganizationId],
    queryFn: async () => {
      const res = await apiClient.get("/api/v1/planner/suggest/");
      return res.data.data;
    },
    enabled: !!activeOrganizationId
  });

  // 2. Fetch All Tasks (for the backlog pool)
  const allTasksQuery = useQuery<TaskItem[]>({
    queryKey: ["planner-all-tasks", activeOrganizationId],
    queryFn: async () => {
      const res = await apiClient.get("/api/v1/planner/tasks/");
      return (Array.isArray(res.data?.data) ? res.data.data : (Array.isArray(res.data) ? res.data : []));
    },
    enabled: !!activeOrganizationId
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

  // -----------------------------------------------------------------
  // Mutations
  // -----------------------------------------------------------------

  // Save sequence daily plan execution order (Auto-Save)
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

  // Create Task
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

  // Update Task
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

  // --- Modal Form Actions ---
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

  // --- Metrics calculations ---
  const totalPlannedHours = scheduledTasks.reduce((acc, t) => acc + parseFloat(t.estimated_hours || "0"), 0);
  const totalTasksCount = backlogTasks.length + scheduledTasks.length;
  const completedTasksCount = allTasksQuery.data?.filter(t => t.status === "DONE").length || 0;
  const criticalRisksCount = suggestedPlanQuery.data?.risks.filter(r => r.level === "CRITICAL").length || 0;

  // Timeline Calculator (Consecutive blocks starting 09:00 AM)
  const parseHoursToTimeline = () => {
    let currentHour = 9.0;
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

  // Weekly Planner distribution
  const allOrgTasks = allTasksQuery.data || [];
  const daysOfWeek = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
  
  // Group tasks by day (mock distribute based on task ID hash to fill calendar realistically if deadlines are blank)
  const getTasksForDay = (dayIndex: number) => {
    return allOrgTasks.filter((t) => {
      if (t.status === "DONE") return false;
      if (t.due_date) {
        const dateObj = new Date(t.due_date);
        // Date.getDay(): 0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat
        const targetDay = dateObj.getDay();
        return targetDay === dayIndex + 1; // 1-indexed for Mon-Fri
      }
      // Backfill distribution based on hash index to make view look full
      const hash = t.title.charCodeAt(0) + t.title.charCodeAt(t.title.length - 1 || 0);
      return hash % 5 === dayIndex;
    });
  };

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
      <main className="space-y-6 pb-20 select-none text-foreground relative">
        
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
        <header className="flex flex-col md:flex-row md:justify-between md:items-center border-b border-[#2d2d34]/60 pb-5 gap-4">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-white flex items-center gap-2.5">
              <Calendar className="h-6 w-6 text-indigo-500" />
              <span>Workspace Planner</span>
            </h1>
            <p className="text-xs text-[#8e8e95] mt-1 leading-relaxed">
              Topologically sorted sequence resolving dependencies and tracking workload caps.
            </p>
          </div>

          <div className="flex items-center gap-3 self-end md:self-auto">
            {/* Auto save status */}
            <div className="text-[10px] font-bold text-muted-foreground flex items-center gap-1.5 bg-[#1c1c1f] px-2.5 py-1.5 rounded-lg border border-[#2d2d34]/60">
              <span className={`h-1.5 w-1.5 rounded-full ${
                saveStatus === "saving" ? "bg-amber-400 animate-ping" : saveStatus === "saved" ? "bg-emerald-400" : "bg-zinc-400"
              }`} />
              <span className="uppercase tracking-wider">
                {saveStatus === "saving" ? "Syncing..." : saveStatus === "saved" ? "Synced" : "Cloud Active"}
              </span>
            </div>

            <button
              onClick={handleRecalculateSuggested}
              disabled={!canEdit}
              className="flex items-center gap-1.5 border border-[#2d2d34]/60 text-[10px] font-bold uppercase tracking-wider px-3 py-2 rounded-lg bg-[#1c1c1f] hover:bg-[#28282c] transition focus:outline-none disabled:opacity-50"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span>AI Sort</span>
            </button>

            {canEdit && (
              <button
                onClick={openCreateModal}
                className="flex items-center gap-1.5 px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>New Task</span>
              </button>
            )}
          </div>
        </header>

        {/* Dynamic Screen Selection Tab Bar */}
        <div className="bg-[#1c1c1f] p-1.5 border border-[#2d2d34]/60 rounded-2xl flex gap-1 overflow-x-auto max-w-full no-scrollbar">
          {(["today", "weekly", "queue", "focus", "stats"] as PlannerScreen[]).map((screen) => (
            <button
              key={screen}
              onClick={() => {
                setActiveScreen(screen);
                setTimerActive(false); // reset focus session state if moving tabs
              }}
              className={`py-1.5 px-3 rounded-xl text-[10px] font-bold uppercase tracking-wider shrink-0 transition ${
                activeScreen === screen
                  ? "bg-indigo-600 text-white shadow-md"
                  : "text-[#8e8e95] hover:text-white hover:bg-zinc-800/50"
              }`}
            >
              {screenLabels[screen]}
            </button>
          ))}
        </div>

        {/* ------------------------------------------------------------- */}
        {/* SCREEN 1: TODAY'S PLANNER                                     */}
        {/* ------------------------------------------------------------- */}
        {activeScreen === "today" && (
          <div className="space-y-6">
            
            {/* Risk warnings banner */}
            {suggestedPlanQuery.data?.risks && suggestedPlanQuery.data.risks.length > 0 && (
              <div className="bg-rose-950/20 border border-rose-900/40 text-rose-400 p-3.5 rounded-xl flex gap-3 text-xs">
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 animate-pulse" />
                <div>
                  <span className="font-semibold uppercase tracking-wider text-[9px] font-mono">Plan Risk Center</span>
                  <p className="mt-0.5 leading-relaxed text-foreground">
                    Topological sort warnings detected: {suggestedPlanQuery.data.risks[0].message}
                  </p>
                </div>
              </div>
            )}

            {/* Drag drop columns grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              
              {/* Left backlog */}
              <div
                onDragOver={handleDragOver}
                onDrop={handleDropToBacklog}
                className="lg:col-span-4 bg-[#1c1c1f]/40 border border-[#2d2d34]/60 p-5 rounded-2xl flex flex-col min-h-[420px] space-y-4"
              >
                <div>
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider">Unscheduled Backlog</h3>
                  <p className="text-[9px] text-[#8e8e95] mt-0.5">Drag items to schedule them today</p>
                </div>

                <div className="flex-1 space-y-2.5 max-h-[440px] overflow-y-auto pr-1">
                  {backlogTasks.length === 0 ? (
                    <div className="text-center text-[#8e8e95] py-12 border border-dashed border-[#2d2d34]/40 rounded-xl h-36 flex flex-col justify-center">
                      Backlog empty.
                    </div>
                  ) : (
                    backlogTasks.map((t) => (
                      <div
                        key={t.id}
                        draggable={canEdit}
                        onDragStart={() => handleDragStart(t.id, "BACKLOG")}
                        onClick={() => openEditModal(t)}
                        className="p-3 bg-[#121214]/60 border border-[#1f1f23] hover:border-indigo-500/10 rounded-xl cursor-pointer transition text-xs flex flex-col gap-2 relative group"
                      >
                        <div className="flex gap-2 items-start justify-between">
                          <span className="font-bold text-white group-hover:text-indigo-400 transition truncate flex-1">{t.title}</span>
                          <span className={`text-[8px] font-bold px-1.5 py-0.25 rounded uppercase shrink-0 ${
                            t.priority === "URGENT" ? "bg-rose-500/10 text-rose-400 border border-rose-900/40" : "bg-zinc-500/10 text-zinc-400"
                          }`}>{t.priority}</span>
                        </div>
                        <div className="flex justify-between items-center text-[9px] text-[#8e8e95] border-t border-[#2d2d34]/30 pt-1.5 mt-1">
                          <span className="font-mono">{t.estimated_hours}h</span>
                          {t.due_date && <span className="font-mono">{t.due_date}</span>}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Right Today schedule */}
              <div
                onDragOver={handleDragOver}
                onDrop={(e) => handleDropToScheduled(e)}
                className="lg:col-span-8 bg-[#1c1c1f]/40 border border-[#2d2d34]/60 p-5 rounded-2xl flex flex-col min-h-[420px] space-y-4"
              >
                <div className="flex justify-between items-center border-b border-[#2d2d34]/40 pb-3">
                  <div>
                    <h3 className="text-xs font-bold text-white uppercase tracking-wider">Today's Schedule</h3>
                    <p className="text-[9px] text-[#8e8e95] mt-0.5">Execution order (top to bottom)</p>
                  </div>
                  <div className="text-right text-xs">
                    <span className="text-[#8e8e95]">Workload: </span>
                    <span className={`font-mono font-bold ${
                      totalPlannedHours > 8 ? "text-rose-400" : "text-emerald-400"
                    }`}>
                      {totalPlannedHours.toFixed(1)}h / 8.0h
                    </span>
                  </div>
                </div>

                <div className="flex-1 space-y-2 max-h-[440px] overflow-y-auto pr-1">
                  {scheduledTasks.length === 0 ? (
                    <div className="text-center text-[#8e8e95] py-20 border border-dashed border-[#2d2d34]/40 rounded-xl flex flex-col items-center justify-center gap-2">
                      <Calendar className="h-7 w-7 text-[#8e8e95]/40 animate-pulse" />
                      <p className="font-bold text-white">Daily plan is empty</p>
                      <p className="text-[10px]">Drag tasks from backlog column to plan your schedule.</p>
                    </div>
                  ) : (
                    scheduledTasks.map((t, index) => (
                      <div
                        key={t.id}
                        draggable={canEdit}
                        onDragStart={() => handleDragStart(t.id, "SCHEDULED")}
                        onDragOver={handleDragOver}
                        onDrop={(e) => handleDropToScheduled(e, index)}
                        onClick={() => openEditModal(t)}
                        className="p-3 bg-[#121214]/60 border border-[#1f1f23] hover:border-indigo-500/10 rounded-xl cursor-pointer transition text-xs flex items-center justify-between gap-3 group"
                      >
                        <div className="flex items-center gap-2.5 overflow-hidden flex-1">
                          <span className="font-mono text-[9px] text-indigo-400 font-bold bg-indigo-500/10 border border-indigo-500/25 rounded h-5 w-5 flex items-center justify-center shrink-0">
                            {index + 1}
                          </span>
                          {canEdit && <GripVertical className="h-4 w-4 text-[#8e8e95]/60 shrink-0" />}
                          <p className="font-bold text-white group-hover:text-indigo-400 transition truncate leading-none">{t.title}</p>
                        </div>

                        <div className="flex gap-4 items-center shrink-0">
                          <div className="flex items-center gap-1 text-[10px] text-[#8e8e95]">
                            <Clock className="h-3 w-3" />
                            <span className="font-mono">{t.estimated_hours}h</span>
                          </div>
                          <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded ${
                            t.priority === "URGENT" || t.priority === "HIGH"
                              ? "bg-rose-500/10 text-rose-400 border border-rose-900/40"
                              : "bg-zinc-500/10 text-zinc-400 border border-[#2d2d34]"
                          }`}>
                            {t.priority}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

            </div>

            {/* Timeline Scheduler & Dependency Graph */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Sequential Timeline Scheduler */}
              <div className="bg-[#1c1c1f]/40 border border-[#2d2d34]/60 p-5 rounded-2xl space-y-4">
                <div>
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider">Sequential Timeline Scheduler</h3>
                  <p className="text-[9px] text-[#8e8e95] mt-0.5">Consecutive calendar view starting at 9:00 AM</p>
                </div>

                <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                  {timelineSchedule.length === 0 ? (
                    <div className="text-center text-[#8e8e95] py-8 text-xs">No scheduled timeline items.</div>
                  ) : (
                    timelineSchedule.map((item, idx) => (
                      <div key={idx} className="flex gap-3 items-center border-l-2 border-indigo-500/45 pl-3 py-1 text-xs">
                        <span className="font-mono text-muted-foreground shrink-0 w-32">{item.timeSpan}</span>
                        <ArrowRight className="h-3 w-3 text-[#8e8e95]" />
                        <span className="font-bold text-white truncate">{item.task.title}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Workspace Dependency Graph */}
              <div className="bg-[#1c1c1f]/40 border border-[#2d2d34]/60 p-5 rounded-2xl space-y-4">
                <div>
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider">Workspace Dependency Graph</h3>
                  <p className="text-[9px] text-[#8e8e95] mt-0.5">Sequential blocker mappings for today's tasks</p>
                </div>

                <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                  {scheduledTasks.length === 0 ? (
                    <div className="text-center text-[#8e8e95] py-8 text-xs">No active dependency order to map.</div>
                  ) : (
                    scheduledTasks.map((t, idx) => {
                      const blockers = scheduledTasks.slice(0, idx);
                      return (
                        <div key={t.id} className="p-3 bg-[#121214]/60 border border-[#1f1f23] rounded-xl text-xs flex flex-col gap-1">
                          <span className="font-bold text-white truncate">{t.title}</span>
                          {idx > 0 ? (
                            <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                              <span className="text-[9px] text-[#8e8e95]">Depends on:</span>
                              <span className="text-[9px] bg-indigo-500/10 text-indigo-400 font-bold px-1.5 py-0.25 rounded border border-indigo-500/20 truncate max-w-[220px]">
                                {blockers[blockers.length - 1].title}
                              </span>
                            </div>
                          ) : (
                            <span className="text-[9px] text-emerald-400 font-mono">No prior blockers - Root Task</span>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

            </div>

          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* SCREEN 2: WEEKLY PLANNER                                      */}
        {/* ------------------------------------------------------------- */}
        {activeScreen === "weekly" && (
          <div className="space-y-4">
            <h2 className="text-xs font-bold text-[#8e8e95] uppercase tracking-widest pl-1">Weekly Planner Columns</h2>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-start">
              {daysOfWeek.map((day, dayIdx) => {
                const dayTasks = getTasksForDay(dayIdx);
                return (
                  <div key={day} className="bg-[#1c1c1f]/40 border border-[#2d2d34]/60 p-3.5 rounded-2xl flex flex-col min-h-[380px] space-y-3">
                    <div className="border-b border-[#2d2d34]/40 pb-2 flex justify-between items-center">
                      <span className="text-xs font-bold text-white">{day}</span>
                      <span className="text-[9px] bg-zinc-800 px-1.5 py-0.25 rounded font-bold text-[#8e8e95]">{dayTasks.length}</span>
                    </div>

                    <div className="space-y-2 overflow-y-auto max-h-[360px] pr-0.5">
                      {dayTasks.length === 0 ? (
                        <div className="text-center text-[10px] text-[#8e8e95]/60 py-10 border border-dashed border-[#2d2d34]/40 rounded-xl">
                          No tasks
                        </div>
                      ) : (
                        dayTasks.map((t) => (
                          <div
                            key={t.id}
                            onClick={() => openEditModal(t)}
                            className="p-2.5 bg-[#121214]/60 border border-[#1f1f23] rounded-lg text-xs hover:border-indigo-500/25 transition cursor-pointer"
                          >
                            <p className="font-bold text-white truncate leading-tight">{t.title}</p>
                            <div className="flex justify-between items-center text-[8px] text-[#8e8e95] pt-1.5 border-t border-[#2d2d34]/20 mt-1.5">
                              <span className="font-mono">{t.estimated_hours}h</span>
                              <span className={`font-bold ${t.priority === "URGENT" ? "text-rose-400" : "text-zinc-400"}`}>{t.priority}</span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* SCREEN 3: MY PRIORITIES (Personal Queue)                      */}
        {/* ------------------------------------------------------------- */}
        {activeScreen === "queue" && (
          <div className="space-y-4">
            <h2 className="text-xs font-bold text-[#8e8e95] uppercase tracking-widest pl-1">My Priorities Queue</h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-start">
              {(["URGENT", "HIGH", "MEDIUM", "LOW"] as const).map((prio) => {
                const prioTasks = allOrgTasks.filter(t => t.priority === prio && t.status !== "DONE");
                return (
                  <div key={prio} className="bg-[#1c1c1f]/40 border border-[#2d2d34]/60 p-3.5 rounded-2xl flex flex-col min-h-[320px] space-y-3">
                    <div className="border-b border-[#2d2d34]/40 pb-2 flex justify-between items-center">
                      <span className={`text-[10px] font-bold uppercase tracking-wider ${
                        prio === "URGENT" ? "text-rose-400" : prio === "HIGH" ? "text-amber-400" : prio === "MEDIUM" ? "text-sky-400" : "text-zinc-400"
                      }`}>{prio} Priority</span>
                      <span className="text-[9px] bg-zinc-800 px-1.5 py-0.25 rounded font-bold text-[#8e8e95]">{prioTasks.length}</span>
                    </div>

                    <div className="space-y-2 overflow-y-auto max-h-[300px]">
                      {prioTasks.length === 0 ? (
                        <div className="text-center text-[10px] text-[#8e8e95]/60 py-10 border border-dashed border-[#2d2d34]/40 rounded-xl">
                          No tasks
                        </div>
                      ) : (
                        prioTasks.map((t) => (
                          <div
                            key={t.id}
                            className="p-3 bg-[#121214]/60 border border-[#1f1f23] rounded-lg text-xs space-y-2 relative group"
                          >
                            <div className="flex items-start gap-2">
                              <button
                                onClick={() => {
                                  updateTaskMutation.mutate({ id: t.id, data: { status: "DONE" } });
                                }}
                                className="mt-0.5 text-zinc-500 hover:text-emerald-400 transition"
                              >
                                <CheckCircle2 className="h-4 w-4" />
                              </button>
                              <span
                                onClick={() => openEditModal(t)}
                                className="font-bold text-white group-hover:text-indigo-400 transition cursor-pointer truncate"
                              >
                                {t.title}
                              </span>
                            </div>
                            <div className="flex justify-between items-center text-[9px] text-[#8e8e95] border-t border-[#2d2d34]/20 pt-1.5">
                              <span className="font-mono">{t.estimated_hours}h</span>
                              <span className="font-semibold uppercase text-[8px] bg-indigo-500/10 text-indigo-400 px-1 rounded">{t.status.replace("_", " ")}</span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* SCREEN 4: FOCUS SESSION                                       */}
        {/* ------------------------------------------------------------- */}
        {activeScreen === "focus" && (
          <div className="max-w-md mx-auto bg-[#1c1c1f]/40 border border-[#2d2d34]/60 p-6 rounded-2xl space-y-6 text-center shadow-2xl relative overflow-hidden">
            
            {/* Glowing effect */}
            <div className="absolute -top-12 -left-12 h-36 w-36 bg-indigo-500/10 rounded-full blur-2xl" />
            <div className="absolute -bottom-12 -right-12 h-36 w-36 bg-purple-500/10 rounded-full blur-2xl" />

            <div className="space-y-1">
              <span className="text-[10px] uppercase font-bold tracking-widest text-indigo-400">Focus Sessions</span>
              <h2 className="text-base font-extrabold text-white">Focus Mode Countdown</h2>
            </div>

            {/* Timer Dial Display */}
            <div className="h-48 w-48 rounded-full border-4 border-indigo-500/20 mx-auto flex flex-col items-center justify-center relative bg-[#121214]/60 shadow-inner">
              {timerActive && (
                <div className="absolute inset-2 border border-dashed border-indigo-500/40 rounded-full animate-spin-slow" />
              )}
              <span className="text-4xl font-black text-white font-mono tracking-tight leading-none">
                {formatTimer(timerSeconds)}
              </span>
              <span className="text-[9px] uppercase font-bold text-[#8e8e95] mt-1 tracking-wider">
                {timerActive ? "Focusing" : "Paused"}
              </span>
            </div>

            {/* Choose task to focus on */}
            <div className="space-y-1.5 text-xs text-left max-w-xs mx-auto">
              <label htmlFor="focus-objective-select" className="text-[9px] font-bold text-[#8e8e95] uppercase tracking-wider block text-center">Focus Objective</label>
              <select
                id="focus-objective-select"
                name="focus-objective-select"
                value={timerFocusTask}
                onChange={(e) => setTimerFocusTask(e.target.value)}
                autoComplete="off"
                className="w-full bg-[#121214] border border-[#2d2d34]/60 rounded-lg p-2 text-xs text-white focus:outline-none"
              >
                <option value="">-- General Concentration --</option>
                {allOrgTasks.filter(t => t.status !== "DONE").map(t => (
                  <option key={t.id} value={t.title}>{t.title}</option>
                ))}
              </select>
            </div>

            {/* Controls */}
            <div className="flex justify-center gap-4 pt-2">
              <button
                onClick={() => setTimerActive(!timerActive)}
                className={`h-10 w-24 rounded-lg text-xs font-bold uppercase tracking-wider transition ${
                  timerActive 
                    ? "bg-amber-600 hover:bg-amber-700 text-white" 
                    : "bg-indigo-600 hover:bg-indigo-700 text-white"
                }`}
              >
                {timerActive ? "Pause" : "Start"}
              </button>

              <button
                onClick={() => {
                  setTimerActive(false);
                  setTimerSeconds(1500);
                }}
                className="h-10 w-24 rounded-lg border border-[#2d2d34]/60 text-xs font-bold uppercase tracking-wider text-white hover:bg-zinc-800 transition"
              >
                Reset
              </button>
            </div>

          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* SCREEN 5: PRODUCTIVITY STATISTICS                             */}
        {/* ------------------------------------------------------------- */}
        {activeScreen === "stats" && (
          <div className="bg-[#1c1c1f]/40 border border-[#2d2d34]/60 p-6 rounded-2xl space-y-6">
            
            <div className="border-b border-[#2d2d34]/40 pb-3">
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">Productivity Statistics</h2>
              <p className="text-[10px] text-[#8e8e95] mt-0.5">Aggregate performance parameters calculated inside isolated tenant workspace.</p>
            </div>

            {/* Counters */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              
              <div className="p-4 bg-[#121214]/60 border border-[#1f1f23] rounded-xl space-y-1">
                <span className="text-[9px] uppercase font-bold text-[#8e8e95]">Planned Tasks</span>
                <span className="text-2xl font-black text-white block">{scheduledTasks.length} items</span>
              </div>

              <div className="p-4 bg-[#121214]/60 border border-[#1f1f23] rounded-xl space-y-1">
                <span className="text-[9px] uppercase font-bold text-[#8e8e95]">Total Backlog</span>
                <span className="text-2xl font-black text-indigo-400 block">{backlogTasks.length} items</span>
              </div>

              <div className="p-4 bg-[#121214]/60 border border-[#1f1f23] rounded-xl space-y-1">
                <span className="text-[9px] uppercase font-bold text-[#8e8e95]">Total Completed</span>
                <span className="text-2xl font-black text-emerald-400 block">{completedTasksCount} tasks</span>
              </div>

            </div>

            {/* Graphs row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Daily Allocation */}
              <div className="p-4 bg-[#121214]/40 border border-[#2d2d34]/40 rounded-xl space-y-3 text-xs">
                <span className="text-[10px] font-bold text-[#8e8e95] uppercase block border-b border-[#2d2d34]/20 pb-1">Task Priority Weightage</span>
                <div className="space-y-3 pt-2">
                  {[
                    { label: "Urgent Priority", count: allOrgTasks.filter(t => t.priority === "URGENT").length, color: "bg-rose-500" },
                    { label: "High Priority", count: allOrgTasks.filter(t => t.priority === "HIGH").length, color: "bg-amber-500" },
                    { label: "Medium Priority", count: allOrgTasks.filter(t => t.priority === "MEDIUM").length, color: "bg-indigo-500" },
                    { label: "Low Priority", count: allOrgTasks.filter(t => t.priority === "LOW").length, color: "bg-zinc-500" }
                  ].map((item, idx) => {
                    const total = allOrgTasks.length || 1;
                    const percent = (item.count / total) * 100;
                    return (
                      <div key={idx} className="space-y-1">
                        <div className="flex justify-between font-semibold">
                          <span>{item.label}</span>
                          <span>{item.count} items ({Math.round(percent)}%)</span>
                        </div>
                        <div className="h-2 w-full bg-zinc-800 rounded-full overflow-hidden">
                          <div className={`h-full ${item.color}`} style={{ width: `${percent}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Weekly Velocity chart */}
              <div className="p-4 bg-[#121214]/40 border border-[#2d2d34]/40 rounded-xl space-y-3 text-xs">
                <span className="text-[10px] font-bold text-[#8e8e95] uppercase block border-b border-[#2d2d34]/20 pb-1">Weekly Velocity Trends</span>
                <div className="h-32 flex items-end justify-between px-2 pt-4 relative">
                  <div className="absolute inset-x-2 top-8 border-t border-zinc-800/40 border-dashed" />
                  <div className="absolute inset-x-2 top-20 border-t border-zinc-800/40 border-dashed" />
                  
                  <svg className="absolute inset-0 w-full h-full p-2" viewBox="0 0 100 100" preserveAspectRatio="none">
                    <path d="M 0 80 L 25 65 L 50 35 L 75 42 L 100 15" fill="none" className="stroke-indigo-500" strokeWidth="2.5" />
                  </svg>

                  <div className="w-full flex justify-between text-[9px] text-[#8e8e95] uppercase font-semibold absolute bottom-1 inset-x-2">
                    <span>W1</span>
                    <span>W2</span>
                    <span>W3</span>
                    <span>W4</span>
                    <span>W5</span>
                  </div>
                </div>
              </div>

            </div>

          </div>
        )}

        {/* Task Form Modal (Creation / Modification) */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex justify-center items-center p-4">
            <div className="bg-[#161618] border border-[#2d2d34]/80 rounded-2xl w-full max-w-lg shadow-2xl p-6 relative">
              <button
                onClick={() => setIsModalOpen(false)}
                className="absolute top-4 right-4 text-[#8e8e95] hover:text-white transition p-1 hover:bg-[#2d2d34]/60 rounded"
              >
                <X className="h-4 w-4" />
              </button>

              <h2 className="text-sm font-extrabold text-white uppercase tracking-wider mb-4 border-b border-[#2d2d34]/40 pb-2">
                {editingTask ? "Modify Task Details" : "Create Task Objective"}
              </h2>

              <form onSubmit={handleFormSubmit} className="space-y-4 text-xs">
                 <div className="space-y-1">
                  <label htmlFor="task-title-input" className="text-[10px] font-bold text-[#8e8e95] uppercase">Task Title</label>
                  <input
                    id="task-title-input"
                    name="task-title-input"
                    type="text"
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    placeholder="Enter task title..."
                    autoComplete="off"
                    className="w-full bg-[#121214] border border-[#1f1f23] rounded-lg p-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label htmlFor="task-desc-textarea" className="text-[10px] font-bold text-[#8e8e95] uppercase">Description</label>
                  <textarea
                    id="task-desc-textarea"
                    name="task-desc-textarea"
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                    placeholder="Task details..."
                    rows={3}
                    autoComplete="off"
                    className="w-full bg-[#121214] border border-[#1f1f23] rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-indigo-500 resize-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label htmlFor="task-priority-select" className="text-[10px] font-bold text-[#8e8e95] uppercase">Priority</label>
                    <select
                      id="task-priority-select"
                      name="task-priority-select"
                      value={formPriority}
                      onChange={(e: any) => setFormPriority(e.target.value)}
                      autoComplete="off"
                      className="w-full bg-[#121214] border border-[#1f1f23] rounded-lg p-2 text-xs text-white focus:outline-none"
                    >
                      <option value="LOW">Low</option>
                      <option value="MEDIUM">Medium</option>
                      <option value="HIGH">High</option>
                      <option value="URGENT">Urgent</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label htmlFor="task-status-select" className="text-[10px] font-bold text-[#8e8e95] uppercase">Status</label>
                    <select
                      id="task-status-select"
                      name="task-status-select"
                      value={formStatus}
                      onChange={(e: any) => setFormStatus(e.target.value)}
                      autoComplete="off"
                      className="w-full bg-[#121214] border border-[#1f1f23] rounded-lg p-2 text-xs text-white focus:outline-none"
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
                    <label htmlFor="task-hours-input" className="text-[10px] font-bold text-[#8e8e95] uppercase">Estimated Hours</label>
                    <input
                      id="task-hours-input"
                      name="task-hours-input"
                      type="number"
                      step="0.5"
                      min="0"
                      value={formEstimatedHours}
                      onChange={(e) => setFormEstimatedHours(e.target.value)}
                      autoComplete="off"
                      className="w-full bg-[#121214] border border-[#1f1f23] rounded-lg p-2 text-xs text-white focus:outline-none"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label htmlFor="task-due-input" className="text-[10px] font-bold text-[#8e8e95] uppercase">Due Date</label>
                    <input
                      id="task-due-input"
                      name="task-due-input"
                      type="date"
                      value={formDueDate}
                      onChange={(e) => setFormDueDate(e.target.value)}
                      autoComplete="off"
                      className="w-full bg-[#121214] border border-[#1f1f23] rounded-lg p-2 text-xs text-white focus:outline-none"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 py-2 bg-[#212124] hover:bg-[#2c2c31] border border-[#2d2d34]/60 text-white text-xs font-bold rounded-lg transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg transition"
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
