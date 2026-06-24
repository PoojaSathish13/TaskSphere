"use client";

import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/infrastructure/api/api-client";
import { ProtectedRoute } from "@/features/rbac/components/ProtectedRoute";
import { useAuthorization } from "@/features/rbac/hooks/useAuthorization";
import { useAuthStore } from "@/infrastructure/store/auth-store";
import { KanbanBoard } from "@/features/tasks/components/KanbanBoard";
import { TaskManagementPanel } from "@/features/tasks/components/TaskManagementPanel";
import { 
  Trello, 
  List, 
  Calendar as CalendarIcon, 
  Plus, 
  Search, 
  Filter, 
  Clock, 
  Calendar,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  X,
  Play,
  Pause,
  PlusCircle,
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
  description: string;
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  status: "BACKLOG" | "TODO" | "IN_PROGRESS" | "REVIEW" | "DONE";
  estimated_hours: string;
  due_date: string | null;
  assignee: string | null;
  assignee_email?: string;
  labels: LabelItem[];
}

export default function TasksPage() {
  const queryClient = useQueryClient();
  const { hasPermission } = useAuthorization();
  const { user, activeOrganizationId } = useAuthStore();
  const canEdit = hasPermission("TASK_EDIT") || hasPermission("TASK_CREATE");

  const [currentView, setCurrentView] = useState<"board" | "list" | "calendar">("board");
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  
  // Create task modal state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newPriority, setNewPriority] = useState<"LOW" | "MEDIUM" | "HIGH" | "URGENT">("MEDIUM");
  const [newEstimatedHours, setNewEstimatedHours] = useState("2.0");
  const [newDueDate, setNewDueDate] = useState("");

  // Filters state
  const [searchQuery, setSearchQuery] = useState("");
  const [filterPriority, setFilterPriority] = useState<string>("ALL");
  const [filterStatus, setFilterStatus] = useState<string>("ALL");

  // Calendar navigation state
  const [currentDate, setCurrentDate] = useState(new Date());

  // Query: Fetch All Tasks
  const { data: tasks = [], isLoading } = useQuery<TaskItem[]>({
    queryKey: ["planner-all-tasks", activeOrganizationId],
    queryFn: async () => {
      const res = await apiClient.get("/api/v1/planner/tasks/");
      return res.data.data || [];
    }
  });

  // Mutation: Create Task
  const createTaskMutation = useMutation({
    mutationFn: async (taskData: Omit<TaskItem, "id" | "labels">) => {
      const res = await apiClient.post("/api/v1/planner/tasks/", taskData);
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["planner-all-tasks"] });
      setIsCreateModalOpen(false);
      setNewTitle("");
      setNewDescription("");
      setNewPriority("MEDIUM");
      setNewEstimatedHours("2.0");
      setNewDueDate("");
    }
  });

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
      assignee: user?.id || null
    });
  };

  // Filter Tasks
  const filteredTasks = tasks.filter(t => {
    const matchesSearch = t.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          t.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesPriority = filterPriority === "ALL" || t.priority === filterPriority;
    const matchesStatus = filterStatus === "ALL" || t.status === filterStatus;
    return matchesSearch && matchesPriority && matchesStatus;
  });

  // Calendar calculations
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayIndex = new Date(year, month, 1).getDay();

  const calendarDays = [];
  // Fill offset days from prev month
  for (let i = 0; i < firstDayIndex; i++) {
    calendarDays.push(null);
  }
  // Fill current month days
  for (let i = 1; i <= daysInMonth; i++) {
    calendarDays.push(new Date(year, month, i));
  }

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  return (
    <ProtectedRoute>
      <div className="space-y-6 relative min-h-[calc(100vh-100px)]">
        
        {/* Top Header */}
        <header className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 border-b border-border pb-4">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight">Task Workspace</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Organize workflows, track checklists, post deliverables, and audit changes.
            </p>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            {/* View Selectors */}
            <div className="bg-muted/40 border border-border p-1 rounded-xl flex items-center gap-1 select-none">
              <button
                onClick={() => { setCurrentView("board"); setSelectedTaskId(null); }}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  currentView === "board" ? "bg-primary text-primary-foreground shadow-md" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Trello className="h-3.5 w-3.5" />
                <span className="hidden md:inline">Board</span>
              </button>
              <button
                onClick={() => { setCurrentView("list"); setSelectedTaskId(null); }}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  currentView === "list" ? "bg-primary text-primary-foreground shadow-md" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <List className="h-3.5 w-3.5" />
                <span className="hidden md:inline">List</span>
              </button>
              <button
                onClick={() => { setCurrentView("calendar"); setSelectedTaskId(null); }}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  currentView === "calendar" ? "bg-primary text-primary-foreground shadow-md" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <CalendarIcon className="h-3.5 w-3.5" />
                <span className="hidden md:inline">Calendar</span>
              </button>
            </div>

            {canEdit && (
              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="flex items-center gap-1 bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-bold px-4 py-2 rounded-xl transition shadow-lg shadow-primary/10"
              >
                <Plus className="h-4 w-4" />
                <span>New Task</span>
              </button>
            )}
          </div>
        </header>

        {/* Global Toolbar Filters (Visible for List/Calendar) */}
        {currentView !== "board" && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-card border border-border rounded-xl p-4 shadow-sm select-none">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search task title..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-background border border-input rounded-lg pl-9 pr-4 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition"
              />
            </div>

            <div>
              <select
                value={filterPriority}
                onChange={(e) => setFilterPriority(e.target.value)}
                className="w-full bg-background border border-input rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition font-semibold"
              >
                <option value="ALL">All Priorities</option>
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="URGENT">Urgent</option>
              </select>
            </div>

            <div>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full bg-background border border-input rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition font-semibold"
              >
                <option value="ALL">All Statuses</option>
                <option value="BACKLOG">Backlog</option>
                <option value="TODO">To Do</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="REVIEW">In Review</option>
                <option value="DONE">Completed</option>
              </select>
            </div>
          </div>
        )}

        {/* Main View Render Area */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Main workspace (Col-span 8 or 12 depending on side panel open) */}
          <div className={`${selectedTaskId ? "lg:col-span-8" : "lg:col-span-12"} space-y-4 w-full transition-all duration-300`}>
            
            {/* 1. Kanban Board View */}
            {currentView === "board" && (
              <div className="overflow-x-auto min-h-[60vh]">
                <KanbanBoard />
              </div>
            )}

            {/* 2. Structured List View */}
            {currentView === "list" && (
              <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden select-none">
                {isLoading ? (
                  <div className="p-8 text-center text-xs animate-pulse text-muted-foreground">Loading task rows...</div>
                ) : filteredTasks.length === 0 ? (
                  <div className="p-12 text-center text-xs text-muted-foreground border border-dashed rounded-lg m-4 border-border/80">
                    No matching tasks found.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-muted/40 border-b border-border/60 text-[10px] text-muted-foreground uppercase font-bold tracking-wider">
                          <th className="py-3 px-4">Title</th>
                          <th className="py-3 px-4">Status</th>
                          <th className="py-3 px-4">Priority</th>
                          <th className="py-3 px-4">Est. Time</th>
                          <th className="py-3 px-4">Due Date</th>
                          <th className="py-3 px-4">Assignee</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredTasks.map((t) => (
                          <tr
                            key={t.id}
                            onClick={() => setSelectedTaskId(t.id)}
                            className={`border-b border-border/40 hover:bg-muted/20 cursor-pointer transition ${
                              selectedTaskId === t.id ? "bg-primary/5" : ""
                            }`}
                          >
                            <td className="py-3.5 px-4 font-semibold text-foreground truncate max-w-[240px]">
                              {t.title}
                            </td>
                            <td className="py-3.5 px-4">
                              <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${
                                t.status === "DONE" 
                                  ? "bg-emerald-500/10 text-emerald-400" 
                                  : t.status === "IN_PROGRESS" 
                                  ? "bg-primary/10 text-primary animate-pulse" 
                                  : t.status === "REVIEW" 
                                  ? "bg-purple-500/10 text-purple-400" 
                                  : "bg-zinc-500/10 text-zinc-400"
                              }`}>
                                {t.status.replace("_", " ")}
                              </span>
                            </td>
                            <td className="py-3.5 px-4">
                              <span className={`text-[10px] font-bold ${
                                t.priority === "URGENT" 
                                  ? "text-rose-500" 
                                  : t.priority === "HIGH" 
                                  ? "text-amber-500" 
                                  : "text-zinc-500"
                              }`}>
                                {t.priority}
                              </span>
                            </td>
                            <td className="py-3.5 px-4 font-mono text-muted-foreground">
                              {t.estimated_hours}h
                            </td>
                            <td className="py-3.5 px-4 font-mono text-muted-foreground">
                              {t.due_date || "No due date"}
                            </td>
                            <td className="py-3.5 px-4 font-semibold text-muted-foreground truncate max-w-[120px]">
                              {t.assignee_email || "Unassigned"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* 3. Calendar View */}
            {currentView === "calendar" && (
              <div className="bg-card border border-border rounded-xl p-4 shadow-sm space-y-4 select-none">
                
                {/* Calendar Navigation header */}
                <div className="flex justify-between items-center border-b pb-3">
                  <h3 className="text-sm font-bold text-foreground">
                    {monthNames[month]} {year}
                  </h3>
                  <div className="flex gap-2">
                    <button
                      onClick={handlePrevMonth}
                      className="p-1.5 border rounded-lg bg-card hover:bg-muted transition"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => setCurrentDate(new Date())}
                      className="text-xs font-semibold px-2.5 py-1 border rounded-lg bg-card hover:bg-muted transition"
                    >
                      Today
                    </button>
                    <button
                      onClick={handleNextMonth}
                      className="p-1.5 border rounded-lg bg-card hover:bg-muted transition"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* Calendar Grid */}
                <div className="grid grid-cols-7 gap-2 text-center text-xs font-bold text-muted-foreground uppercase border-b pb-1 text-[10px] tracking-wider">
                  <span>Sun</span>
                  <span>Mon</span>
                  <span>Tue</span>
                  <span>Wed</span>
                  <span>Thu</span>
                  <span>Fri</span>
                  <span>Sat</span>
                </div>

                <div className="grid grid-cols-7 gap-2 h-[480px]">
                  {calendarDays.map((day, idx) => {
                    if (!day) {
                      return <div key={`empty-${idx}`} className="bg-muted/10 rounded-lg border border-transparent" />;
                    }

                    const dayStr = day.toISOString().split("T")[0];
                    const dayTasks = filteredTasks.filter(t => t.due_date === dayStr);

                    return (
                      <div
                        key={dayStr}
                        className="bg-muted/10 border border-border/30 rounded-lg p-1.5 flex flex-col justify-between overflow-hidden"
                      >
                        <span className="text-[10px] font-bold text-foreground text-left pl-0.5">
                          {day.getDate()}
                        </span>

                        <div className="flex-1 overflow-y-auto space-y-1 mt-1 pr-0.5 scrollbar-thin">
                          {dayTasks.map(t => (
                            <div
                              key={t.id}
                              onClick={(e) => { e.stopPropagation(); setSelectedTaskId(t.id); }}
                              className={`p-1 text-[9px] font-semibold text-white rounded truncate cursor-pointer transition hover:brightness-110 leading-tight ${
                                t.status === "DONE" 
                                  ? "bg-emerald-600/90 text-white" 
                                  : t.priority === "URGENT" 
                                  ? "bg-rose-600/90 text-white" 
                                  : t.priority === "HIGH" 
                                  ? "bg-amber-600/90 text-white" 
                                  : "bg-primary/90 text-primary-foreground"
                              }`}
                              title={t.title}
                            >
                              {t.title}
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

          </div>

          {/* Right Sidebar Detail Drawer (Col-span 4) */}
          {selectedTaskId && (
            <div className="lg:col-span-4 bg-card border rounded-xl overflow-hidden shadow-2xl h-[560px] sticky top-6 animate-slide-up flex flex-col">
              <TaskManagementPanel 
                taskId={selectedTaskId} 
                onClose={() => setSelectedTaskId(null)} 
              />
            </div>
          )}

        </div>

        {/* Task Creation Modal */}
        {isCreateModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex justify-center items-center p-4">
            <div className="bg-card border border-border rounded-xl w-full max-w-lg shadow-2xl p-6 relative">
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition p-1"
              >
                <X className="h-4 w-4" />
              </button>

              <h2 className="text-lg font-bold text-foreground mb-4">Create New Task</h2>

              <form onSubmit={handleCreateSubmit} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted-foreground">Task Title</label>
                  <input
                    type="text"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="Enter task title..."
                    className="w-full bg-muted/30 border border-border rounded-lg p-2.5 text-xs focus:ring-1 focus:ring-primary focus:outline-none"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted-foreground">Description</label>
                  <textarea
                    value={newDescription}
                    onChange={(e) => setNewDescription(e.target.value)}
                    placeholder="Task details..."
                    rows={3}
                    className="w-full bg-muted/30 border border-border rounded-lg p-2.5 text-xs focus:ring-1 focus:ring-primary focus:outline-none resize-none"
                  />
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-muted-foreground">Priority</label>
                    <select
                      value={newPriority}
                      onChange={(e: any) => setNewPriority(e.target.value)}
                      className="w-full bg-muted/30 border border-border rounded-lg p-2 text-xs focus:outline-none font-semibold"
                    >
                      <option value="LOW">Low</option>
                      <option value="MEDIUM">Medium</option>
                      <option value="HIGH">High</option>
                      <option value="URGENT">Urgent</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-muted-foreground">Est. Hours</label>
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      value={newEstimatedHours}
                      onChange={(e) => setNewEstimatedHours(e.target.value)}
                      className="w-full bg-muted/30 border border-border rounded-lg p-2 text-xs focus:ring-1 focus:ring-primary focus:outline-none font-semibold"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-muted-foreground">Due Date</label>
                    <input
                      type="date"
                      value={newDueDate}
                      onChange={(e) => setNewDueDate(e.target.value)}
                      className="w-full bg-muted/30 border border-border rounded-lg p-2 text-xs focus:ring-1 focus:ring-primary focus:outline-none font-semibold"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsCreateModalOpen(false)}
                    className="px-4 py-2 border rounded-lg text-xs font-semibold hover:bg-muted transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-primary hover:bg-primary/95 text-primary-foreground rounded-lg text-xs font-semibold transition"
                  >
                    Create Task
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
