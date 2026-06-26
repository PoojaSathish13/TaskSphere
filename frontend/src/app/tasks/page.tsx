"use client";

import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/infrastructure/api/api-client";
import { ProtectedRoute } from "@/features/rbac/components/ProtectedRoute";
import { useAuthorization } from "@/features/rbac/hooks/useAuthorization";
import { useAuthStore } from "@/infrastructure/store/auth-store";
import { 
  Trello, 
  List, 
  Plus, 
  Search, 
  Filter, 
  Clock, 
  Calendar,
  AlertTriangle,
  ChevronDown,
  X,
  PlusCircle,
  FileText,
  Trash2,
  CheckCircle,
  AlertCircle,
  CornerDownRight,
  Send,
  Paperclip,
  Activity,
  GitBranch,
  Edit,
  ArrowUpDown,
  Sparkles,
  CheckSquare,
  Square
} from "lucide-react";

type TaskScreen = 
  | "board"
  | "list"
  | "create"
  | "detail"
  | "edit"
  | "subtasks"
  | "attachments"
  | "activity"
  | "dependencies";

const screenLabels: Record<TaskScreen, string> = {
  board: "Task Board",
  list: "Task List",
  create: "Create Task",
  detail: "Task Detail",
  edit: "Edit Task",
  subtasks: "Subtasks",
  attachments: "Attachments",
  activity: "Activity Log",
  dependencies: "Task Dependencies",
};

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
  parent: string | null;
  labels: LabelItem[];
}

interface AttachmentItem {
  id: string;
  filename: string;
  file: string;
  uploaded_by_email: string;
  uploaded_at: string;
}

interface ActivityLogItem {
  id: string;
  user_email: string;
  field_changed: string;
  old_value: string | null;
  new_value: string | null;
  timestamp: string;
}

const COLUMNS = [
  { id: "BACKLOG", name: "Backlog" },
  { id: "TODO", name: "To Do" },
  { id: "IN_PROGRESS", name: "In Progress" },
  { id: "REVIEW", name: "In Review" },
  { id: "DONE", name: "Completed" },
] as const;

export default function TasksPage() {
  const queryClient = useQueryClient();
  const { hasPermission } = useAuthorization();
  const { user, activeOrganizationId } = useAuthStore();
  const canEdit = hasPermission("TASK_EDIT") || hasPermission("TASK_CREATE");

  const [activeScreen, setActiveScreen] = useState<TaskScreen>("board");
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  // Filters state
  const [searchQuery, setSearchQuery] = useState("");
  const [filterPriority, setFilterPriority] = useState<string>("ALL");
  const [filterStatus, setFilterStatus] = useState<string>("ALL");
  const [sortBy, setSortBy] = useState<"due_date" | "priority" | "estimated_hours">("priority");

  // Create task form state
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newPriority, setNewPriority] = useState<"LOW" | "MEDIUM" | "HIGH" | "URGENT">("MEDIUM");
  const [newEstimatedHours, setNewEstimatedHours] = useState("2.0");
  const [newDueDate, setNewDueDate] = useState("");

  // Edit task form state
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editPriority, setEditPriority] = useState<"LOW" | "MEDIUM" | "HIGH" | "URGENT">("MEDIUM");
  const [editEstimatedHours, setEditEstimatedHours] = useState("2.0");
  const [editDueDate, setEditDueDate] = useState("");
  const [editStatus, setEditStatus] = useState<TaskItem["status"]>("TODO");

  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // -----------------------------------------------------------------
  // Queries
  // -----------------------------------------------------------------
  
  // 1. Query: Fetch All Tasks
  const { data: tasks = [], isLoading } = useQuery<TaskItem[]>({
    queryKey: ["planner-all-tasks", activeOrganizationId],
    queryFn: async () => {
      const res = await apiClient.get("/api/v1/planner/tasks/");
      return (Array.isArray(res.data?.data) ? res.data.data : (Array.isArray(res.data) ? res.data : []));
    }
  });

  const selectedTask = tasks.find(t => t.id === selectedTaskId);

  // Initialize edit form when selected task changes
  useEffect(() => {
    if (selectedTask) {
      setEditTitle(selectedTask.title);
      setEditDescription(selectedTask.description || "");
      setEditPriority(selectedTask.priority);
      setEditEstimatedHours(selectedTask.estimated_hours);
      setEditDueDate(selectedTask.due_date || "");
      setEditStatus(selectedTask.status);
    }
  }, [selectedTaskId, selectedTask]);

  // 2. Query: Fetch Attachments for selected task
  const { data: attachments = [], refetch: refetchAttachments } = useQuery<AttachmentItem[]>({
    queryKey: ["task-attachments", selectedTaskId],
    queryFn: async () => {
      const res = await apiClient.get(`/api/v1/tasks/attachments/?task=${selectedTaskId}`);
      return (Array.isArray(res.data?.data) ? res.data.data : (Array.isArray(res.data) ? res.data : []));
    },
    enabled: !!selectedTaskId
  });

  // 3. Query: Fetch Activity logs for selected task
  const { data: logs = [], refetch: refetchLogs } = useQuery<ActivityLogItem[]>({
    queryKey: ["task-logs", selectedTaskId],
    queryFn: async () => {
      const res = await apiClient.get(`/api/v1/tasks/activity-logs/?task=${selectedTaskId}`);
      return (Array.isArray(res.data?.data) ? res.data.data : (Array.isArray(res.data) ? res.data : []));
    },
    enabled: !!selectedTaskId
  });

  // 4. Query: Fetch Dependencies for selected task (real API)
  interface DepItem { id: string; task: string; task_title: string; depends_on: string; depends_on_title: string; }
  const { data: taskDepsData = [], refetch: refetchDeps } = useQuery<DepItem[]>({
    queryKey: ["task-dependencies", selectedTaskId],
    queryFn: async () => {
      const res = await apiClient.get(`/api/v1/planner/dependencies/?task=${selectedTaskId}`);
      return Array.isArray(res.data?.data) ? res.data.data : (Array.isArray(res.data) ? res.data : []);
    },
    enabled: !!selectedTaskId
  });

  // -----------------------------------------------------------------
  // Mutations
  // -----------------------------------------------------------------

  // 1. Mutation: Create Task
  const createTaskMutation = useMutation({
    mutationFn: async (taskData: Omit<TaskItem, "id" | "labels">) => {
      const res = await apiClient.post("/api/v1/planner/tasks/", taskData);
      return res.data.data;
    },
    onSuccess: (newT) => {
      showToast("Task created successfully.", "success");
      queryClient.invalidateQueries({ queryKey: ["planner-all-tasks"] });
      
      setNewTitle("");
      setNewDescription("");
      setNewPriority("MEDIUM");
      setNewEstimatedHours("2.0");
      setNewDueDate("");

      if (newT && newT.id) {
        setSelectedTaskId(newT.id);
        setActiveScreen("detail");
      } else {
        setActiveScreen("board");
      }
    },
    onError: (err: any) => {
      showToast(err.message || "Failed to create task.", "error");
    }
  });

  // 2. Mutation: Update Task
  const updateTaskMutation = useMutation({
    mutationFn: async (payload: { id: string; data: Partial<TaskItem> }) => {
      const res = await apiClient.patch(`/api/v1/planner/tasks/${payload.id}/`, payload.data);
      return res.data.data;
    },
    onSuccess: () => {
      showToast("Task details updated.", "success");
      queryClient.invalidateQueries({ queryKey: ["planner-all-tasks"] });
      queryClient.invalidateQueries({ queryKey: ["task-details", selectedTaskId] });
      setActiveScreen("detail");
    },
    onError: (err: any) => {
      showToast(err.message || "Failed to update task.", "error");
    }
  });

  // 3. Mutation: Delete Task
  const deleteTaskMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/api/v1/planner/tasks/${id}/`);
    },
    onSuccess: () => {
      showToast("Task soft-deleted.", "success");
      setSelectedTaskId(null);
      queryClient.invalidateQueries({ queryKey: ["planner-all-tasks"] });
      setActiveScreen("board");
    },
    onError: (err: any) => {
      showToast(err.message || "Failed to delete task.", "error");
    }
  });

  // 4. Mutation: Upload Attachment
  const uploadAttachmentMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("task", selectedTaskId!);
      formData.append("file", file);
      formData.append("filename", file.name);
      await apiClient.post(`/api/v1/tasks/attachments/`, formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });
    },
    onSuccess: () => {
      showToast("Attachment uploaded successfully.", "success");
      queryClient.invalidateQueries({ queryKey: ["task-attachments", selectedTaskId] });
    },
    onError: (err: any) => {
      showToast(err.message || "Failed to upload attachment.", "error");
    }
  });

  // -----------------------------------------------------------------
  // Handlers
  // -----------------------------------------------------------------
  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    createTaskMutation.mutate({
      title: newTitle,
      description: newDescription,
      priority: newPriority,
      status: "TODO",
      estimated_hours: newEstimatedHours,
      due_date: newDueDate || null,
      assignee: user?.id || null,
      parent: null
    });
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTitle.trim() || !selectedTaskId) return;
    updateTaskMutation.mutate({
      id: selectedTaskId,
      data: {
        title: editTitle,
        description: editDescription,
        priority: editPriority,
        estimated_hours: editEstimatedHours,
        due_date: editDueDate || null,
        status: editStatus
      }
    });
  };

  // Drag and drop COLUMN update
  const handleDropColumn = (taskIdToUpdate: string, targetStatus: TaskItem["status"]) => {
    updateTaskMutation.mutate({
      id: taskIdToUpdate,
      data: { status: targetStatus }
    });
  };

  // Subtasks State
  const [subtaskTitle, setSubtaskTitle] = useState("");
  const childSubtasks = tasks.filter(t => t.parent === selectedTaskId);

  // Dependencies — real API state
  const [newDepTargetId, setNewDepTargetId] = useState("");

  // Filtering & Sorting calculations
  const priorityWeights = { URGENT: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };
  const filteredTasks = tasks.filter(t => {
    // Exclude subtasks from main list/board to avoid confusion
    if (t.parent) return false;
    
    const matchesSearch = t.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          t.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesPriority = filterPriority === "ALL" || t.priority === filterPriority;
    const matchesStatus = filterStatus === "ALL" || t.status === filterStatus;
    return matchesSearch && matchesPriority && matchesStatus;
  }).sort((a, b) => {
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
              <Trello className="h-6 w-6 text-indigo-500" />
              <span>Tasks Workspace</span>
            </h1>
            <p className="text-xs text-[#8e8e95] mt-1 leading-relaxed">
              Organize workflow columns, track subtasks, attach documents, and audit activity updates.
            </p>
          </div>

          {/* Task selector dropdown in header if selected */}
          {selectedTaskId && selectedTask && (
            <div className="flex items-center bg-[#1c1c1f]/40 border border-[#2d2d34]/60 p-2.5 rounded-xl gap-2 self-start md:self-auto">
              <label htmlFor="activeTaskSelect" className="text-[9px] uppercase font-bold text-[#8e8e95]">Active Task:</label>
              <select
                id="activeTaskSelect"
                name="activeTaskSelect"
                autoComplete="off"
                value={selectedTaskId}
                onChange={(e) => {
                  setSelectedTaskId(e.target.value);
                  setActiveScreen("detail");
                }}
                className="bg-[#121214] border border-[#2d2d34]/60 rounded-lg text-xs text-indigo-400 font-bold px-2 py-1.5 focus:outline-none max-w-[160px] truncate"
              >
                {tasks.filter(t => !t.parent).map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.title}
                  </option>
                ))}
              </select>
              <button
                onClick={() => {
                  setSelectedTaskId(null);
                  setActiveScreen("board");
                }}
                className="text-[9px] uppercase font-black text-rose-400 hover:bg-rose-500/10 px-2 py-1.5 rounded-lg border border-rose-500/20 transition"
              >
                Exit Task
              </button>
            </div>
          )}
        </div>

        {/* Dynamic Screen Selection Tab Bar */}
        <div className="bg-[#1c1c1f] p-1.5 border border-[#2d2d34]/60 rounded-2xl flex gap-1 overflow-x-auto max-w-full no-scrollbar">
          {(["board", "list", "create", "detail", "edit", "subtasks", "attachments", "activity", "dependencies"] as TaskScreen[]).map((screen) => {
            const label = screenLabels[screen];
            const isTaskSpecific = screen !== "board" && screen !== "list" && screen !== "create";
            const isDisabled = isTaskSpecific && !selectedTaskId;
            
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
                title={isDisabled ? "Please select a task from the board/list to view this screen." : ""}
              >
                {label}
              </button>
            );
          })}
        </div>

        {/* ------------------------------------------------------------- */}
        {/* SCREEN 1: TASK BOARD (Kanban)                                 */}
        {/* ------------------------------------------------------------- */}
        {activeScreen === "board" && (
          <div className="space-y-4">
            
            {/* Filters Toolbar */}
            <div className="bg-[#1c1c1f]/40 border border-[#2d2d34]/60 p-4 rounded-xl flex flex-col md:flex-row gap-3 justify-between items-center">
              <div className="relative w-full md:max-w-xs">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <input
                  id="boardSearchQuery"
                  name="boardSearchQuery"
                  autoComplete="off"
                  aria-label="Search task title"
                  type="text"
                  placeholder="Search task title..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-[#121214] border border-[#1f1f23] rounded-lg pl-9 pr-4 py-2 text-xs focus:outline-none focus:border-indigo-500 transition"
                />
              </div>

              <div className="flex flex-wrap gap-2 w-full md:w-auto justify-end">
                <select
                  id="boardFilterPriority"
                  name="boardFilterPriority"
                  autoComplete="off"
                  aria-label="Filter by priority"
                  value={filterPriority}
                  onChange={(e) => setFilterPriority(e.target.value)}
                  className="bg-[#121214] border border-[#1f1f23] rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none"
                >
                  <option value="ALL">All Priorities</option>
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                  <option value="URGENT">Urgent</option>
                </select>

                <select
                  id="boardSortBy"
                  name="boardSortBy"
                  autoComplete="off"
                  aria-label="Sort tasks by"
                  value={sortBy}
                  onChange={(e: any) => setSortBy(e.target.value)}
                  className="bg-[#121214] border border-[#1f1f23] rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none"
                >
                  <option value="priority">Priority</option>
                  <option value="due_date">Due Date</option>
                  <option value="estimated_hours">Estimation</option>
                </select>

                <button
                  onClick={() => setActiveScreen("create")}
                  className="py-1.5 px-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-lg transition"
                >
                  + Add Task
                </button>
              </div>
            </div>

            {/* Kanban Columns */}
            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4 animate-pulse">
                {[1, 2, 3, 4, 5].map(n => (
                  <div key={n} className="h-96 bg-[#1c1c1f]/40 border border-[#2d2d34]/60 rounded-2xl" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-start">
                {COLUMNS.map((col) => {
                  const colTasks = filteredTasks.filter(t => t.status === col.id);
                  return (
                    <div
                      key={col.id}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => {
                        const tId = e.dataTransfer.getData("text/plain");
                        if (tId) handleDropColumn(tId, col.id);
                      }}
                      className="bg-[#1c1c1f]/40 border border-[#2d2d34]/60 p-3.5 rounded-2xl min-h-[480px] flex flex-col space-y-3"
                    >
                      <div className="flex justify-between items-center border-b border-[#2d2d34]/30 pb-2">
                        <span className="text-xs font-bold text-white uppercase tracking-wider">{col.name}</span>
                        <span className="text-[10px] bg-zinc-800 border border-zinc-700 px-1.5 py-0.25 rounded font-mono font-bold text-muted-foreground">
                          {colTasks.length}
                        </span>
                      </div>

                      <div className="flex-1 space-y-2.5 overflow-y-auto max-h-[420px] pr-1">
                        {colTasks.length === 0 ? (
                          <div className="text-center text-[10px] text-muted-foreground/60 py-10 border border-dashed border-[#2d2d34]/40 rounded-xl">
                            No Tasks
                          </div>
                        ) : (
                          colTasks.map((t) => (
                            <div
                              key={t.id}
                              draggable={canEdit}
                              onDragStart={(e) => {
                                e.dataTransfer.setData("text/plain", t.id);
                              }}
                              onClick={() => {
                                setSelectedTaskId(t.id);
                                setActiveScreen("detail");
                              }}
                              className="p-3 bg-[#121214]/60 border border-[#1f1f23] hover:border-indigo-500/20 rounded-xl transition cursor-pointer flex flex-col gap-2 relative"
                            >
                              <span className="font-bold text-white leading-tight break-words">{t.title}</span>
                              
                              <div className="flex justify-between items-center text-[9px] text-[#8e8e95] border-t border-[#2d2d34]/30 pt-2 mt-1">
                                <span className={`font-bold px-1.5 py-0.5 rounded text-[8px] uppercase ${
                                  t.priority === "URGENT" 
                                    ? "bg-rose-500/10 text-rose-400 border border-rose-900/40" 
                                    : t.priority === "HIGH" 
                                    ? "bg-amber-500/10 text-amber-400 border border-amber-900/30" 
                                    : "bg-zinc-500/10 text-zinc-400"
                                }`}>
                                  {t.priority}
                                </span>
                                <div className="flex items-center gap-2">
                                  <span className="font-mono flex items-center gap-0.5"><Clock className="h-2.5 w-2.5" />{t.estimated_hours}h</span>
                                </div>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* SCREEN 2: TASK LIST (Table view)                             */}
        {/* ------------------------------------------------------------- */}
        {activeScreen === "list" && (
          <div className="space-y-4">
            
            {/* Filters Toolbar */}
            <div className="bg-[#1c1c1f]/40 border border-[#2d2d34]/60 p-4 rounded-xl flex flex-col md:flex-row gap-3 justify-between items-center">
              <div className="relative w-full md:max-w-xs">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <input
                  id="listSearchQuery"
                  name="listSearchQuery"
                  autoComplete="off"
                  aria-label="Search task title"
                  type="text"
                  placeholder="Search task title..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-[#121214] border border-[#1f1f23] rounded-lg pl-9 pr-4 py-2 text-xs focus:outline-none focus:border-indigo-500 transition"
                />
              </div>

              <div className="flex flex-wrap gap-2 w-full md:w-auto justify-end">
                <select
                  id="listFilterPriority"
                  name="listFilterPriority"
                  autoComplete="off"
                  aria-label="Filter by priority"
                  value={filterPriority}
                  onChange={(e) => setFilterPriority(e.target.value)}
                  className="bg-[#121214] border border-[#1f1f23] rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none"
                >
                  <option value="ALL">All Priorities</option>
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                  <option value="URGENT">Urgent</option>
                </select>

                <select
                  id="listFilterStatus"
                  name="listFilterStatus"
                  autoComplete="off"
                  aria-label="Filter by status"
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="bg-[#121214] border border-[#1f1f23] rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="BACKLOG">Backlog</option>
                  <option value="TODO">To Do</option>
                  <option value="IN_PROGRESS">In Progress</option>
                  <option value="REVIEW">In Review</option>
                  <option value="DONE">Completed</option>
                </select>

                <button
                  onClick={() => setActiveScreen("create")}
                  className="py-1.5 px-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-lg transition"
                >
                  + Add Task
                </button>
              </div>
            </div>

            {/* Tasks Table */}
            <div className="bg-[#1c1c1f]/40 border border-[#2d2d34]/60 rounded-2xl overflow-hidden shadow-md">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-[#161618] border-b border-[#2d2d34]/60 text-[10px] text-[#8e8e95] uppercase font-bold tracking-wider">
                      <th className="py-3 px-4">Task Title</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Priority</th>
                      <th className="py-3 px-4">Estimation</th>
                      <th className="py-3 px-4">Due Date</th>
                      <th className="py-3 px-4">Assignee</th>
                    </tr>
                  </thead>
                  <tbody>
                    {isLoading ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-xs animate-pulse text-[#8e8e95]">Loading task rows...</td>
                      </tr>
                    ) : filteredTasks.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-xs text-[#8e8e95]">No matching tasks found.</td>
                      </tr>
                    ) : (
                      filteredTasks.map((t) => (
                        <tr
                          key={t.id}
                          onClick={() => {
                            setSelectedTaskId(t.id);
                            setActiveScreen("detail");
                          }}
                          className={`border-b border-[#2d2d34]/40 hover:bg-[#1c1c1f]/50 cursor-pointer transition ${
                            selectedTaskId === t.id ? "bg-indigo-950/20" : ""
                          }`}
                        >
                          <td className="py-3.5 px-4 font-bold text-white truncate max-w-[200px]">{t.title}</td>
                          <td className="py-3.5 px-4">
                            <span className={`px-2 py-0.5 rounded-full text-[8px] font-bold uppercase ${
                              t.status === "DONE" 
                                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/25" 
                                : t.status === "IN_PROGRESS" 
                                ? "bg-primary/10 text-primary animate-pulse" 
                                : "bg-zinc-500/10 text-zinc-400 border border-[#2d2d34]"
                            }`}>
                              {t.status.replace("_", " ")}
                            </span>
                          </td>
                          <td className="py-3.5 px-4">
                            <span className={`text-[10px] font-bold ${
                              t.priority === "URGENT" ? "text-rose-500" : t.priority === "HIGH" ? "text-amber-500" : "text-zinc-400"
                            }`}>{t.priority}</span>
                          </td>
                          <td className="py-3.5 px-4 font-mono text-[#8e8e95]">{t.estimated_hours} hours</td>
                          <td className="py-3.5 px-4 font-mono text-[#8e8e95]">{t.due_date || "No deadline"}</td>
                          <td className="py-3.5 px-4 font-semibold text-[#8e8e95] truncate max-w-[120px]">{t.assignee_email || "Unassigned"}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* SCREEN 3: CREATE TASK                                         */}
        {/* ------------------------------------------------------------- */}
        {activeScreen === "create" && (
          <div className="max-w-md mx-auto bg-[#1c1c1f]/40 border border-[#2d2d34]/60 p-6 rounded-2xl space-y-4">
            <h2 className="text-sm font-extrabold text-white uppercase tracking-wider flex items-center gap-2 border-b border-[#2d2d34]/30 pb-2">
              <PlusCircle className="h-4.5 w-4.5 text-indigo-500" />
              <span>Create Task</span>
            </h2>

            <form onSubmit={handleCreateSubmit} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label htmlFor="newTitle" className="text-[10px] font-bold text-[#8e8e95] uppercase">Task Title</label>
                <input
                  id="newTitle"
                  name="newTitle"
                  autoComplete="off"
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="What needs to be done?"
                  className="w-full bg-[#121214] border border-[#1f1f23] rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-indigo-500 transition"
                  required
                />
              </div>

              <div className="space-y-1">
                <label htmlFor="newDescription" className="text-[10px] font-bold text-[#8e8e95] uppercase">Description</label>
                <textarea
                  id="newDescription"
                  name="newDescription"
                  autoComplete="off"
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="Task details and deliverables..."
                  rows={3}
                  className="w-full bg-[#121214] border border-[#1f1f23] rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-indigo-500 transition resize-none"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label htmlFor="newPriority" className="text-[10px] font-bold text-[#8e8e95] uppercase">Priority</label>
                  <select
                    id="newPriority"
                    name="newPriority"
                    autoComplete="off"
                    value={newPriority}
                    onChange={(e: any) => setNewPriority(e.target.value)}
                    className="w-full bg-[#121214] border border-[#1f1f23] rounded-lg p-2 text-xs text-white focus:outline-none"
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="URGENT">Urgent</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label htmlFor="newEstimatedHours" className="text-[10px] font-bold text-[#8e8e95] uppercase">Est. Hours</label>
                  <input
                    id="newEstimatedHours"
                    name="newEstimatedHours"
                    autoComplete="off"
                    type="number"
                    step="0.5"
                    value={newEstimatedHours}
                    onChange={(e) => setNewEstimatedHours(e.target.value)}
                    className="w-full bg-[#121214] border border-[#1f1f23] rounded-lg p-2 text-xs text-white focus:outline-none"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label htmlFor="newDueDate" className="text-[10px] font-bold text-[#8e8e95] uppercase">Due Date</label>
                  <input
                    id="newDueDate"
                    name="newDueDate"
                    autoComplete="off"
                    type="date"
                    value={newDueDate}
                    onChange={(e) => setNewDueDate(e.target.value)}
                    className="w-full bg-[#121214] border border-[#1f1f23] rounded-lg p-2 text-xs text-white focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setActiveScreen("board")}
                  className="flex-1 py-2 bg-[#212124] hover:bg-[#2c2c31] border border-[#2d2d34]/60 text-white text-xs font-bold rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createTaskMutation.isPending}
                  className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg transition"
                >
                  {createTaskMutation.isPending ? "Creating..." : "Save Task"}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* SCREEN 4: TASK DETAIL                                         */}
        {/* ------------------------------------------------------------- */}
        {activeScreen === "detail" && selectedTask && (
          <div className="space-y-6">
            <div className="bg-[#1c1c1f]/40 border border-[#2d2d34]/60 p-6 rounded-2xl space-y-6">
              
              <div className="flex justify-between items-start border-b border-[#2d2d34]/40 pb-4">
                <div className="space-y-1">
                  <span className="text-[9px] uppercase font-bold text-indigo-400">Task Scope</span>
                  <h2 className="text-lg font-black text-white">{selectedTask.title}</h2>
                  <p className="text-xs text-[#8e8e95] mt-1">{selectedTask.description || "No description provided."}</p>
                </div>

                <div className="flex gap-2">
                  <select
                    id="detailTaskStatus"
                    name="detailTaskStatus"
                    autoComplete="off"
                    aria-label="Update task status"
                    value={selectedTask.status}
                    onChange={(e) => updateTaskMutation.mutate({ id: selectedTaskId!, data: { status: e.target.value as any } })}
                    className="bg-[#121214] border border-[#2d2d34]/60 rounded-lg text-[10px] font-bold text-indigo-400 p-2 focus:outline-none"
                  >
                    <option value="BACKLOG">Backlog</option>
                    <option value="TODO">To Do</option>
                    <option value="IN_PROGRESS">In Progress</option>
                    <option value="REVIEW">In Review</option>
                    <option value="DONE">Completed</option>
                  </select>
                </div>
              </div>

              {/* Grid metrics */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-[#121214]/60 border border-[#1f1f23] p-4 rounded-xl space-y-1">
                  <span className="text-[9px] uppercase font-bold text-[#8e8e95] block">Priority</span>
                  <span className={`text-sm font-extrabold block ${
                    selectedTask.priority === "URGENT" ? "text-rose-400" : selectedTask.priority === "HIGH" ? "text-amber-400" : "text-white"
                  }`}>
                    {selectedTask.priority}
                  </span>
                </div>

                <div className="bg-[#121214]/60 border border-[#1f1f23] p-4 rounded-xl space-y-1">
                  <span className="text-[9px] uppercase font-bold text-[#8e8e95] block">Time Allocation</span>
                  <span className="text-sm font-extrabold text-white block">{selectedTask.estimated_hours} hours</span>
                </div>

                <div className="bg-[#121214]/60 border border-[#1f1f23] p-4 rounded-xl space-y-1">
                  <span className="text-[9px] uppercase font-bold text-[#8e8e95] block">Due Date</span>
                  <span className="text-sm font-extrabold text-white block">{selectedTask.due_date || "No deadline"}</span>
                </div>

                <div className="bg-[#121214]/60 border border-[#1f1f23] p-4 rounded-xl space-y-1">
                  <span className="text-[9px] uppercase font-bold text-[#8e8e95] block">Checklists (Subtasks)</span>
                  <span className="text-sm font-extrabold text-white block">
                    {childSubtasks.filter(s => s.status === "DONE").length} / {childSubtasks.length} Completed
                  </span>
                </div>
              </div>

              {/* Sub-sections shortcuts */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                <div className="p-4 bg-[#121214]/40 border border-[#2d2d34]/40 rounded-xl space-y-3">
                  <span className="text-[10px] uppercase font-black text-indigo-400 block border-b border-[#2d2d34]/40 pb-1">
                    Ownership Details
                  </span>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-[#8e8e95]">Assignee Email:</span>
                      <span className="font-semibold text-white">{selectedTask.assignee_email || "Unassigned"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#8e8e95]">Task ID:</span>
                      <span className="font-mono text-[#8e8e95]">{selectedTask.id.slice(0, 8)}...</span>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-[#121214]/40 border border-[#2d2d34]/40 rounded-xl space-y-3">
                  <span className="text-[10px] uppercase font-black text-indigo-400 block border-b border-[#2d2d34]/40 pb-1">
                    Manage Section
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setActiveScreen("edit")}
                      className="py-2 px-3 bg-[#1c1c1f] hover:bg-[#28282c] text-white rounded-lg border border-[#2d2d34]/60 text-xs font-bold transition text-center flex items-center justify-center gap-1"
                    >
                      <Edit className="h-3.5 w-3.5 text-indigo-400" />
                      <span>Edit Task</span>
                    </button>
                    
                    <button
                      onClick={() => setActiveScreen("subtasks")}
                      className="py-2 px-3 bg-[#1c1c1f] hover:bg-[#28282c] text-white rounded-lg border border-[#2d2d34]/60 text-xs font-bold transition text-center flex items-center justify-center gap-1"
                    >
                      <CheckSquare className="h-3.5 w-3.5 text-indigo-400" />
                      <span>Subtasks</span>
                    </button>

                    <button
                      onClick={() => setActiveScreen("attachments")}
                      className="py-2 px-3 bg-[#1c1c1f] hover:bg-[#28282c] text-white rounded-lg border border-[#2d2d34]/60 text-xs font-bold transition text-center flex items-center justify-center gap-1"
                    >
                      <Paperclip className="h-3.5 w-3.5 text-indigo-400" />
                      <span>Attachments</span>
                    </button>

                    <button
                      onClick={() => {
                        if (confirm("Are you sure you want to delete this task?")) {
                          deleteTaskMutation.mutate(selectedTask.id);
                        }
                      }}
                      className="py-2 px-3 bg-rose-950/20 hover:bg-rose-900/30 text-rose-400 border border-rose-500/20 rounded-lg text-xs font-bold transition text-center flex items-center justify-center gap-1"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      <span>Delete Task</span>
                    </button>
                  </div>
                </div>

              </div>

            </div>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* SCREEN 5: EDIT TASK                                           */}
        {/* ------------------------------------------------------------- */}
        {activeScreen === "edit" && selectedTask && (
          <div className="max-w-md mx-auto bg-[#1c1c1f]/40 border border-[#2d2d34]/60 p-6 rounded-2xl space-y-4">
            <h2 className="text-sm font-extrabold text-white uppercase tracking-wider flex items-center gap-2 border-b border-[#2d2d34]/30 pb-2">
              <Edit className="h-4.5 w-4.5 text-indigo-500" />
              <span>Edit Task Details</span>
            </h2>

            <form onSubmit={handleEditSubmit} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label htmlFor="editTitle" className="text-[10px] font-bold text-[#8e8e95] uppercase">Task Title</label>
                <input
                  id="editTitle"
                  name="editTitle"
                  autoComplete="off"
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full bg-[#121214] border border-[#1f1f23] rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-indigo-500 transition"
                  required
                />
              </div>

              <div className="space-y-1">
                <label htmlFor="editDescription" className="text-[10px] font-bold text-[#8e8e95] uppercase">Description</label>
                <textarea
                  id="editDescription"
                  name="editDescription"
                  autoComplete="off"
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  rows={3}
                  className="w-full bg-[#121214] border border-[#1f1f23] rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-indigo-500 transition resize-none"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label htmlFor="editPriority" className="text-[10px] font-bold text-[#8e8e95] uppercase">Priority</label>
                  <select
                    id="editPriority"
                    name="editPriority"
                    autoComplete="off"
                    value={editPriority}
                    onChange={(e: any) => setEditPriority(e.target.value)}
                    className="w-full bg-[#121214] border border-[#1f1f23] rounded-lg p-2 text-xs text-white focus:outline-none"
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="URGENT">Urgent</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label htmlFor="editEstimatedHours" className="text-[10px] font-bold text-[#8e8e95] uppercase">Est. Hours</label>
                  <input
                    id="editEstimatedHours"
                    name="editEstimatedHours"
                    autoComplete="off"
                    type="number"
                    step="0.5"
                    value={editEstimatedHours}
                    onChange={(e) => setEditEstimatedHours(e.target.value)}
                    className="w-full bg-[#121214] border border-[#1f1f23] rounded-lg p-2 text-xs text-white focus:outline-none"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label htmlFor="editDueDate" className="text-[10px] font-bold text-[#8e8e95] uppercase">Due Date</label>
                  <input
                    id="editDueDate"
                    name="editDueDate"
                    autoComplete="off"
                    type="date"
                    value={editDueDate}
                    onChange={(e) => setEditDueDate(e.target.value)}
                    className="w-full bg-[#121214] border border-[#1f1f23] rounded-lg p-2 text-xs text-white focus:outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label htmlFor="editStatus" className="text-[10px] font-bold text-[#8e8e95] uppercase">Status</label>
                <select
                  id="editStatus"
                  name="editStatus"
                  autoComplete="off"
                  value={editStatus}
                  onChange={(e: any) => setEditStatus(e.target.value)}
                  className="w-full bg-[#121214] border border-[#1f1f23] rounded-lg p-2.5 text-xs text-white focus:outline-none"
                >
                  <option value="BACKLOG">Backlog</option>
                  <option value="TODO">To Do</option>
                  <option value="IN_PROGRESS">In Progress</option>
                  <option value="REVIEW">In Review</option>
                  <option value="DONE">Completed</option>
                </select>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setActiveScreen("detail")}
                  className="flex-1 py-2 bg-[#212124] hover:bg-[#2c2c31] border border-[#2d2d34]/60 text-white text-xs font-bold rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updateTaskMutation.isPending}
                  className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg transition"
                >
                  {updateTaskMutation.isPending ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* SCREEN 6: SUBTASKS                                            */}
        {/* ------------------------------------------------------------- */}
        {activeScreen === "subtasks" && selectedTaskId && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Checklist */}
            <div className="lg:col-span-2 bg-[#1c1c1f]/40 border border-[#2d2d34]/60 p-5 rounded-2xl space-y-4">
              <h2 className="text-sm font-bold text-white uppercase tracking-wider border-b border-[#2d2d34]/30 pb-2">
                Subtasks Checklist
              </h2>

              <div className="space-y-2">
                {childSubtasks.length === 0 ? (
                  <div className="text-center text-[#8e8e95] py-8 border border-dashed border-[#2d2d34]/40 rounded-xl">
                    No subtasks registered. Split task work using the generator.
                  </div>
                ) : (
                  childSubtasks.map((sub) => (
                    <div key={sub.id} className="flex items-center justify-between p-3 bg-[#121214]/60 border border-[#1f1f23] rounded-xl text-xs">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            const newStatus = sub.status === "DONE" ? "TODO" : "DONE";
                            updateTaskMutation.mutate({ id: sub.id, data: { status: newStatus } });
                          }}
                          className="text-indigo-400 hover:text-indigo-300 transition"
                        >
                          {sub.status === "DONE" ? (
                            <CheckSquare className="h-4 w-4 text-emerald-400" />
                          ) : (
                            <Square className="h-4 w-4" />
                          )}
                        </button>
                        <CornerDownRight className="h-3 w-3 text-[#8e8e95]" />
                        <span className={`font-semibold ${sub.status === "DONE" ? "line-through text-[#8e8e95]" : "text-white"}`}>
                          {sub.title}
                        </span>
                      </div>

                      <button
                        onClick={() => deleteTaskMutation.mutate(sub.id)}
                        className="p-1 hover:bg-[#2d2d34] rounded text-[#8e8e95] hover:text-rose-400 transition"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Quick Add Subtask */}
            <div className="bg-[#1c1c1f]/40 border border-[#2d2d34]/60 p-5 rounded-2xl h-fit space-y-4">
              <span className="text-xs font-bold text-indigo-400 uppercase tracking-widest block border-b border-[#2d2d34]/30 pb-1">
                Add Subtask Checklist
              </span>

              <div className="space-y-3 text-xs">
                <div className="space-y-1">
                  <label htmlFor="subtaskTitle" className="text-[10px] font-bold text-[#8e8e95] uppercase">Subtask Title</label>
                  <input
                    id="subtaskTitle"
                    name="subtaskTitle"
                    autoComplete="off"
                    type="text"
                    value={subtaskTitle}
                    onChange={(e) => setSubtaskTitle(e.target.value)}
                    placeholder="e.g. Write integration test suites"
                    className="w-full bg-[#121214] border border-[#1f1f23] rounded-lg p-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <button
                  onClick={() => {
                    if (!subtaskTitle.trim()) return;
                    createTaskMutation.mutate({
                      title: subtaskTitle,
                      description: "",
                      priority: "MEDIUM",
                      status: "TODO",
                      estimated_hours: "1.0",
                      due_date: null,
                      assignee: null,
                      parent: selectedTaskId
                    });
                    setSubtaskTitle("");
                  }}
                  className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-lg transition"
                >
                  Create Subtask
                </button>
              </div>
            </div>

          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* SCREEN 7: ATTACHMENTS                                         */}
        {/* ------------------------------------------------------------- */}
        {activeScreen === "attachments" && selectedTaskId && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* List */}
            <div className="lg:col-span-2 bg-[#1c1c1f]/40 border border-[#2d2d34]/60 p-5 rounded-2xl space-y-4">
              <h2 className="text-sm font-bold text-white uppercase tracking-wider border-b border-[#2d2d34]/30 pb-2">
                Attachments
              </h2>

              <div className="space-y-2">
                {attachments.length === 0 ? (
                  <div className="text-center text-[#8e8e95] py-8 border border-dashed border-[#2d2d34]/40 rounded-xl">
                    No files attached. Attach code specs or diagrams.
                  </div>
                ) : (
                  attachments.map((file) => (
                    <div key={file.id} className="p-3 bg-[#121214]/60 border border-[#1f1f23] rounded-xl text-xs flex justify-between items-center">
                      <div className="flex items-center gap-3">
                        <FileText className="h-4 w-4 text-indigo-400" />
                        <div>
                          <span className="font-bold text-white block">{file.filename}</span>
                          <span className="text-[9px] text-[#8e8e95] block mt-0.5">Uploaded by {file.uploaded_by_email}</span>
                        </div>
                      </div>

                      <a
                        href={file.file}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[10px] font-bold text-indigo-400 hover:text-indigo-300 transition"
                      >
                        Download
                      </a>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Upload File */}
            <div className="bg-[#1c1c1f]/40 border border-[#2d2d34]/60 p-5 rounded-2xl h-fit space-y-4">
              <span className="text-xs font-bold text-indigo-400 uppercase tracking-widest block border-b border-[#2d2d34]/30 pb-1">
                Upload Document Asset
              </span>

              <label htmlFor="attachmentFile" className="border border-dashed border-zinc-700/60 p-6 rounded-xl hover:bg-zinc-800/10 cursor-pointer block text-center space-y-2 transition">
                <Paperclip className="h-6 w-6 mx-auto text-indigo-400" />
                <span className="text-[10px] text-[#8e8e95] block">Select files or drag here to upload</span>
                <input
                  id="attachmentFile"
                  name="attachmentFile"
                  autoComplete="off"
                  type="file"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      uploadAttachmentMutation.mutate(e.target.files[0]);
                    }
                  }}
                />
              </label>
            </div>

          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* SCREEN 8: ACTIVITY LOG (Timeline)                            */}
        {/* ------------------------------------------------------------- */}
        {activeScreen === "activity" && selectedTaskId && (
          <div className="bg-[#1c1c1f]/40 border border-[#2d2d34]/60 p-5 rounded-2xl space-y-4">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider border-b border-[#2d2d34]/30 pb-2">
              Activity Log (Timeline)
            </h2>

            <div className="space-y-4 relative pl-3 border-l border-zinc-800 ml-2">
              {logs.length === 0 ? (
                <div className="text-center text-[#8e8e95] py-8">
                  No activity log registered for this task.
                </div>
              ) : (
                logs.map((log) => (
                  <div key={log.id} className="relative space-y-1 pl-4">
                    <span className="absolute -left-5 top-1 bg-indigo-900 border border-indigo-500 rounded-full h-3.5 w-3.5 flex items-center justify-center">
                      <Activity className="h-2 w-2 text-indigo-400" />
                    </span>

                    <div className="flex justify-between items-center text-[10px] text-[#8e8e95] font-mono">
                      <span>{log.user_email}</span>
                      <span>{new Date(log.timestamp).toLocaleString()}</span>
                    </div>

                    <p className="text-xs text-white">
                      Updated <span className="font-semibold text-indigo-400">{log.field_changed}</span>:
                      {log.old_value && <span className="text-zinc-500 line-through mx-1">{log.old_value}</span>}
                      <span className="text-emerald-400 font-bold ml-1">{log.new_value}</span>
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* SCREEN 9: TASK DEPENDENCIES                                   */}
        {/* ------------------------------------------------------------- */}
        {activeScreen === "dependencies" && selectedTaskId && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* List */}
            <div className="lg:col-span-2 bg-[#1c1c1f]/40 border border-[#2d2d34]/60 p-5 rounded-2xl space-y-4">
              <h2 className="text-sm font-bold text-white uppercase tracking-wider border-b border-[#2d2d34]/30 pb-2">
                Task Dependencies
              </h2>

              <div className="space-y-3">
                {taskDepsData.length === 0 ? (
                  <div className="text-center text-[#8e8e95] py-8 border border-dashed border-[#2d2d34]/40 rounded-xl">
                    No dependencies linked. Use the form to map task relations.
                  </div>
                ) : (
                  taskDepsData.map((dep) => (
                    <div key={dep.id} className="p-3 bg-[#121214]/60 border border-[#1f1f23] rounded-xl text-xs flex justify-between items-center">
                      <div className="flex items-center gap-3">
                        <GitBranch className="h-4 w-4 text-indigo-400" />
                        <div>
                          <span className="font-bold text-white block">{dep.depends_on_title}</span>
                          <span className="text-[9px] text-[#8e8e95] block mt-0.5">This task is blocked by: <span className="text-indigo-400 font-semibold">{dep.depends_on_title}</span></span>
                        </div>
                      </div>

                      <button
                        onClick={async () => {
                          try {
                            await apiClient.delete(`/api/v1/planner/dependencies/${dep.id}/`);
                            queryClient.invalidateQueries({ queryKey: ["task-dependencies", selectedTaskId] });
                            showToast("Dependency removed.", "success");
                          } catch {
                            showToast("Failed to remove dependency.", "error");
                          }
                        }}
                        className="p-1 hover:bg-[#2d2d34] rounded text-[#8e8e95] hover:text-rose-400 transition"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Link dependency */}
            <div className="bg-[#1c1c1f]/40 border border-[#2d2d34]/60 p-5 rounded-2xl h-fit space-y-4">
              <span className="text-xs font-bold text-indigo-400 uppercase tracking-widest block border-b border-[#2d2d34]/30 pb-1">
                Link Task Dependency
              </span>

              <div className="space-y-3 text-xs">
                <div className="space-y-1">
                  <label htmlFor="newDepTargetId" className="text-[10px] font-bold text-[#8e8e95] uppercase">Blocked By (Target Task)</label>
                  <select
                    id="newDepTargetId"
                    name="newDepTargetId"
                    autoComplete="off"
                    value={newDepTargetId}
                    onChange={(e) => setNewDepTargetId(e.target.value)}
                    className="w-full bg-[#121214] border border-[#1f1f23] rounded-lg p-2 text-xs text-white focus:outline-none"
                  >
                    <option value="">-- Choose Blocker Task --</option>
                    {tasks.filter(t => t.id !== selectedTaskId).map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.title}
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  onClick={async () => {
                    if (!newDepTargetId) {
                      showToast("Please choose a target task.", "error");
                      return;
                    }
                    try {
                      await apiClient.post("/api/v1/planner/dependencies/", {
                        task: selectedTaskId,
                        depends_on: newDepTargetId,
                      });
                      queryClient.invalidateQueries({ queryKey: ["task-dependencies", selectedTaskId] });
                      setNewDepTargetId("");
                      showToast("Dependency mapped successfully.", "success");
                    } catch (err: any) {
                      showToast(err?.response?.data?.errors?.[0]?.message || "Failed to save dependency.", "error");
                    }
                  }}
                  className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-lg transition"
                >
                  Map Dependency
                </button>
              </div>
            </div>

          </div>
        )}

      </div>
    </ProtectedRoute>
  );
}
