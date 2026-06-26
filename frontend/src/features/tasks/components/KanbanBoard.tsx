"use client";

import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/infrastructure/api/api-client";
import { useAuthorization } from "@/features/rbac/hooks/useAuthorization";
import { useAuthStore } from "@/infrastructure/store/auth-store";
import { 
  Plus, 
  Trash2, 
  UserPlus, 
  Tag, 
  CheckSquare, 
  Square,
  Search,
  Filter,
  ArrowUpDown,
  Clock,
  Calendar,
  AlertCircle,
  HelpCircle,
  X,
  Sparkles,
  ChevronDown
} from "lucide-react";

interface LabelItem {
  id: string;
  name: string;
  color: string;
}

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
  labels: LabelItem[];
}

const COLUMNS = [
  { id: "BACKLOG", name: "Backlog" },
  { id: "TODO", name: "To Do" },
  { id: "IN_PROGRESS", name: "In Progress" },
  { id: "REVIEW", name: "In Review" },
  { id: "DONE", name: "Completed" },
] as const;

export const KanbanBoard: React.FC = () => {
  const queryClient = useQueryClient();
  const { hasPermission } = useAuthorization();
  const { user, activeOrganizationId } = useAuthStore();
  const canEdit = hasPermission("TASK_EDIT");

  // Selection states (for bulk actions)
  const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([]);

  // Filtering states
  const [searchQuery, setSearchQuery] = useState("");
  const [filterPriority, setFilterPriority] = useState<string>("ALL");
  const [filterLabel, setFilterLabel] = useState<string>("ALL");
  const [sortBy, setSortBy] = useState<"due_date" | "priority" | "estimated_hours">("priority");

  // Notifications/Toasts
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Query: Fetch All Tasks
  const { data: tasks = [], isLoading, refetch } = useQuery<TaskItem[]>({
    queryKey: ["planner-all-tasks", activeOrganizationId],
    queryFn: async () => {
      const res = await apiClient.get("/api/v1/planner/tasks/");
      return res.data.data || [];
    }
  });

  // Query: Fetch all organization Labels (for filter dropdown)
  const { data: workspaceLabels = [] } = useQuery<LabelItem[]>({
    queryKey: ["workspace-labels", activeOrganizationId],
    queryFn: async () => {
      const res = await apiClient.get("/api/v1/tasks/labels/");
      return res.data.data || [];
    }
  });

  // Drag state
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);

  // Mutation: Single Task Update (Status transition with Optimistic UI updates)
  const updateTaskMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<TaskItem> }) => {
      const res = await apiClient.patch(`/api/v1/planner/tasks/${id}/`, data);
      return res.data.data;
    },
    onMutate: async ({ id, data }) => {
      // Cancel outgoing queries
      await queryClient.cancelQueries({ queryKey: ["planner-all-tasks", activeOrganizationId] });
      const previousTasks = queryClient.getQueryData(["planner-all-tasks", activeOrganizationId]);

      // Optimistically update
      queryClient.setQueryData(
        ["planner-all-tasks", activeOrganizationId],
        (old: TaskItem[] | undefined) => {
          if (!old) return [];
          return old.map(t => t.id === id ? { ...t, ...data } : t);
        }
      );

      return { previousTasks };
    },
    onError: (err: any, variables, context) => {
      // Rollback on error
      if (context?.previousTasks) {
        queryClient.setQueryData(["planner-all-tasks", activeOrganizationId], context.previousTasks);
      }
      const errMsg = err?.response?.data?.errors?.[0]?.message || "Workflow validation error: transition rejected.";
      showToast(errMsg, "error");
    },
    onSuccess: () => {
      showToast("Task updated successfully", "success");
      queryClient.invalidateQueries({ queryKey: ["planner-all-tasks"] });
      queryClient.invalidateQueries({ queryKey: ["planner-suggestion"] });
    }
  });

  // Mutation: Bulk Updates (status, priority, assignment, delete)
  const bulkUpdateMutation = useMutation({
    mutationFn: async (payload: { ids: string[]; status?: string; priority?: string; assignee?: string | null; delete?: boolean }) => {
      const res = await apiClient.patch("/api/v1/planner/tasks/bulk-update/", payload);
      return res.data;
    },
    onSuccess: (data) => {
      showToast(data.message || "Bulk operation completed successfully", "success");
      setSelectedTaskIds([]);
      queryClient.invalidateQueries({ queryKey: ["planner-all-tasks"] });
      queryClient.invalidateQueries({ queryKey: ["planner-suggestion"] });
    },
    onError: (err: any) => {
      const errMsg = err?.response?.data?.error || "Failed to execute bulk update";
      showToast(errMsg, "error");
    }
  });

  // --- Drag and Drop Handlers ---
  const handleDragStart = (e: React.DragEvent, id: string) => {
    if (!canEdit) return;
    setDraggedTaskId(id);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDropColumn = (e: React.DragEvent, targetStatus: TaskItem["status"]) => {
    e.preventDefault();
    if (!draggedTaskId || !canEdit) return;
    
    // Trigger update
    updateTaskMutation.mutate({ id: draggedTaskId, data: { status: targetStatus } });
    setDraggedTaskId(null);
  };

  // --- Checkbox selection ---
  const handleSelectTask = (id: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Avoid triggering open card click
    setSelectedTaskIds(prev => 
      prev.includes(id) ? prev.filter(tid => tid !== id) : [...prev, id]
    );
  };

  const handleSelectAll = (columnTasks: TaskItem[]) => {
    const columnIds = columnTasks.map(t => t.id);
    const allSelected = columnIds.every(id => selectedTaskIds.includes(id));
    if (allSelected) {
      setSelectedTaskIds(prev => prev.filter(id => !columnIds.includes(id)));
    } else {
      setSelectedTaskIds(prev => Array.from(new Set([...prev, ...columnIds])));
    }
  };

  // --- Search, Filtering & Sorting logic ---
  const priorityWeights = { URGENT: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };
  
  const filteredAndSortedTasks = tasks
    .filter(t => {
      const matchesSearch = t.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            t.description.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesPriority = filterPriority === "ALL" || t.priority === filterPriority;
      const matchesLabel = filterLabel === "ALL" || t.labels.some(l => l.id === filterLabel);
      return matchesSearch && matchesPriority && matchesLabel;
    })
    .sort((a, b) => {
      if (sortBy === "priority") {
        return (priorityWeights[b.priority] || 0) - (priorityWeights[a.priority] || 0);
      }
      if (sortBy === "due_date") {
        if (!a.due_date) return 1;
        if (!b.due_date) return -1;
        return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
      }
      if (sortBy === "estimated_hours") {
        return parseFloat(b.estimated_hours) - parseFloat(a.estimated_hours);
      }
      return 0;
    });

  return (
    <div className="space-y-6">
      {/* Toast notifications */}
      {toast && (
        <div className={`fixed bottom-5 right-5 z-50 p-4 rounded-xl border shadow-xl flex items-center gap-2 text-xs font-bold bg-popover text-popover-foreground ${
          toast.type === "success" ? "border-emerald-500/40 text-emerald-400" : "border-rose-500/40 text-rose-400"
        }`}>
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{toast.message}</span>
        </div>
      )}

      {/* Advanced Filter, Search, Sort Header */}
      <section className="bg-card border rounded-xl p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Search */}
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <input
            id="kanbanSearchQuery"
            name="kanbanSearchQuery"
            autoComplete="off"
            type="text"
            placeholder="Search tasks by title..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-muted/20 border border-border/80 rounded-lg pl-9 pr-4 py-2 text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none"
            aria-label="Search tasks"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5 bg-muted/20 border border-border/80 rounded-lg px-2 py-1 text-xs">
            <Filter className="h-3.5 w-3.5 text-muted-foreground" />
            <select
              id="kanbanFilterPriority"
              name="kanbanFilterPriority"
              autoComplete="off"
              value={filterPriority}
              onChange={(e) => setFilterPriority(e.target.value)}
              className="bg-transparent border-0 text-[11px] font-bold focus:outline-none cursor-pointer"
              aria-label="Filter by priority"
            >
              <option value="ALL">All Priorities</option>
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
              <option value="URGENT">Urgent</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5 bg-muted/20 border border-border/80 rounded-lg px-2 py-1 text-xs">
            <Tag className="h-3.5 w-3.5 text-muted-foreground" />
            <select
              id="kanbanFilterLabel"
              name="kanbanFilterLabel"
              autoComplete="off"
              value={filterLabel}
              onChange={(e) => setFilterLabel(e.target.value)}
              className="bg-transparent border-0 text-[11px] font-bold focus:outline-none cursor-pointer"
              aria-label="Filter by label"
            >
              <option value="ALL">All Labels</option>
              {workspaceLabels.map(l => (
                <option key={l.id} value={l.id}>{l.name}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1.5 bg-muted/20 border border-border/80 rounded-lg px-2 py-1 text-xs">
            <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground" />
            <select
              id="kanbanSortBy"
              name="kanbanSortBy"
              autoComplete="off"
              value={sortBy}
              onChange={(e: any) => setSortBy(e.target.value)}
              className="bg-transparent border-0 text-[11px] font-bold focus:outline-none cursor-pointer"
              aria-label="Sort by attribute"
            >
              <option value="priority">Priority</option>
              <option value="due_date">Due Date</option>
              <option value="estimated_hours">Estimation</option>
            </select>
          </div>

          <button onClick={() => refetch()} className="p-2 border rounded-lg bg-card hover:bg-muted/30 transition">
            <Sparkles className="h-3.5 w-3.5 text-indigo-400" />
          </button>
        </div>
      </section>

      {/* Kanban Grid */}
      <section className="grid grid-cols-1 md:grid-cols-5 gap-4 items-start select-none">
        {COLUMNS.map((col) => {
          const columnTasks = filteredAndSortedTasks.filter(t => t.status === col.id);
          const allSelected = columnTasks.length > 0 && columnTasks.every(t => selectedTaskIds.includes(t.id));

          return (
            <div
              key={col.id}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDropColumn(e, col.id)}
              className="bg-card border rounded-xl p-3.5 shadow-sm space-y-3 flex flex-col min-h-[500px]"
            >
              {/* Header column */}
              <div className="flex justify-between items-center pb-2 border-b border-border/40">
                <div className="flex items-center gap-2">
                  {canEdit && columnTasks.length > 0 && (
                    <button onClick={() => handleSelectAll(columnTasks)} className="text-muted-foreground hover:text-indigo-400 transition">
                      {allSelected ? <CheckSquare className="h-3.5 w-3.5" /> : <Square className="h-3.5 w-3.5" />}
                    </button>
                  )}
                  <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">{col.name}</h3>
                  <span className="text-[10px] bg-muted/30 border border-border px-1.5 py-0.25 rounded font-mono font-bold text-muted-foreground">
                    {columnTasks.length}
                  </span>
                </div>
              </div>

              {/* Task cards scroll wrapper */}
              <div className="flex-1 space-y-2.5 overflow-y-auto max-h-[520px]">
                {columnTasks.length === 0 ? (
                  <div className="text-center text-[10px] text-muted-foreground/60 py-12 border border-dashed rounded-lg">
                    Drop items here
                  </div>
                ) : (
                  columnTasks.map((t) => {
                    const isSelected = selectedTaskIds.includes(t.id);
                    return (
                      <div
                        key={t.id}
                        draggable={canEdit}
                        onDragStart={(e) => handleDragStart(e, t.id)}
                        className={`p-3 border rounded-lg transition text-xs flex flex-col gap-2 relative bg-card ${
                          isSelected ? "border-indigo-500 bg-indigo-950/5" : "hover:border-border/80"
                        } ${canEdit ? "cursor-grab active:cursor-grabbing" : ""}`}
                      >
                        {/* Title and selector */}
                        <div className="flex justify-between items-start gap-2">
                          <span className="font-semibold text-foreground leading-snug break-words pr-4">{t.title}</span>
                          {canEdit && (
                            <button
                              onClick={(e) => handleSelectTask(t.id, e)}
                              className="text-muted-foreground/60 hover:text-indigo-400 transition"
                            >
                              {isSelected ? <CheckSquare className="h-3.5 w-3.5 text-indigo-400" /> : <Square className="h-3.5 w-3.5" />}
                            </button>
                          )}
                        </div>

                        {/* Labels row */}
                        {t.labels.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {t.labels.map(l => (
                              <span
                                key={l.id}
                                className="px-1.5 py-0.25 rounded text-[8px] font-bold text-white uppercase tracking-wider"
                                style={{ backgroundColor: l.color }}
                              >
                                {l.name}
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Details footer */}
                        <div className="flex justify-between items-center text-[9px] text-muted-foreground pt-1.5 border-t border-border/30">
                          <div className="flex items-center gap-2">
                            <span className={`font-bold px-1 rounded uppercase ${
                              t.priority === "URGENT" ? "bg-rose-500/10 text-rose-400 border border-rose-900/40" : "bg-zinc-500/10 text-zinc-400"
                            }`}>{t.priority}</span>
                            <div className="flex items-center gap-0.5">
                              <Clock className="h-2.5 w-2.5" />
                              <span className="font-mono">{t.estimated_hours}h</span>
                            </div>
                          </div>
                          {t.due_date && (
                            <div className="flex items-center gap-0.5">
                              <Calendar className="h-2.5 w-2.5" />
                              <span className="font-mono">{t.due_date}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </section>

      {/* Floating Bulk Operations Action Bar */}
      {selectedTaskIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-40 bg-card border border-indigo-500/35 rounded-xl shadow-2xl p-3 flex items-center justify-between gap-6 min-w-[320px] max-w-lg animate-slide-up">
          <div className="flex items-center gap-2">
            <span className="h-5 w-5 bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 rounded-full flex items-center justify-center font-mono font-bold text-[10px]">
              {selectedTaskIds.length}
            </span>
            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">selected</span>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Bulk transition status */}
            <div className="relative group">
              <button className="flex items-center gap-1 border px-2.5 py-1.5 rounded-lg hover:bg-muted text-[10px] font-bold">
                Transition Status
                <ChevronDown className="h-3 w-3 text-muted-foreground" />
              </button>
              <div className="hidden group-hover:block absolute bottom-full mb-1 left-0 bg-popover border rounded-lg shadow-xl py-1 w-32 text-left">
                {COLUMNS.map(col => (
                  <button
                    key={col.id}
                    onClick={() => bulkUpdateMutation.mutate({ ids: selectedTaskIds, status: col.id })}
                    className="w-full text-left px-3 py-1 hover:bg-muted text-[10px] font-semibold"
                  >
                    {col.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Bulk Delete */}
            <button
              onClick={() => {
                if (confirm(`Soft-delete ${selectedTaskIds.length} tasks?`)) {
                  bulkUpdateMutation.mutate({ ids: selectedTaskIds, delete: true });
                }
              }}
              className="flex items-center gap-1 border border-rose-500/20 text-rose-400 px-2.5 py-1.5 rounded-lg hover:bg-rose-950/20 text-[10px] font-bold transition"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete
            </button>

            <button onClick={() => setSelectedTaskIds([])} className="text-muted-foreground hover:text-foreground transition p-1">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
export default KanbanBoard;
