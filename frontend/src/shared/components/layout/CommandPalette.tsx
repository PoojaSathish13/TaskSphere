"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import { useLayoutStore } from "@/infrastructure/store/layout-store";
import { useTenants } from "@/features/tenants/hooks/useTenants";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { useAuthorization } from "@/features/rbac/hooks/useAuthorization";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/infrastructure/api/api-client";
import { useRouter } from "next/navigation";
import { 
  Monitor, 
  Moon, 
  Sun, 
  Search, 
  LogOut, 
  Shield, 
  Settings,
  PlusCircle,
  UserCheck,
  Users,
  Briefcase,
  Calendar,
  Target,
  ShieldAlert,
  Clock,
  Activity,
  UserCheck as StandupIcon,
  Bell,
  ArrowLeft,
  Copy,
  CheckCircle,
  AlertCircle,
  Sliders,
  Folder,
  Tag,
  FileText
} from "lucide-react";

type PaletteState = 
  | "default"
  | "create-task-title"
  | "create-task-priority"
  | "create-task-assignee"
  | "assign-task-select"
  | "assign-task-user"
  | "search-users"
  | "search-projects";

export const CommandPalette: React.FC = () => {
  const router = useRouter();
  const queryClient = useQueryClient();
  
  const { isCommandPaletteOpen, setCommandPaletteOpen, toggleTheme, theme } = useLayoutStore();
  const { organizations, switchOrganization, activeOrganization } = useTenants();
  const { logout } = useAuth();
  const { hasPermission } = useAuthorization();
  
  const [paletteState, setPaletteState] = useState<PaletteState>("default");
  const [search, setSearch] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const paletteRef = useRef<HTMLDivElement>(null);

  // Form states for creating a task
  const [taskTitle, setTaskTitle] = useState("");
  const [taskPriority, setTaskPriority] = useState("MEDIUM");
  
  // States for assigning a task
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  // Queries
  const { data: members = [] } = useQuery<any[]>({
    queryKey: ["rbac-memberships"],
    queryFn: async () => {
      const res = await apiClient.get("/api/v1/rbac/members/");
      return res.data.data || [];
    },
    enabled: isCommandPaletteOpen
  });

  const { data: tasks = [] } = useQuery<any[]>({
    queryKey: ["planner-all-tasks"],
    queryFn: async () => {
      const res = await apiClient.get("/api/v1/planner/tasks/");
      return res.data.data || [];
    },
    enabled: isCommandPaletteOpen
  });

  const { data: projects = [] } = useQuery<any[]>({
    queryKey: ["timesheet-projects"],
    queryFn: async () => {
      const res = await apiClient.get("/api/v1/timesheets/projects/");
      return res.data.data || [];
    },
    enabled: isCommandPaletteOpen
  });

  // Mutations
  const createTaskMutation = useMutation({
    mutationFn: async (payload: { title: string; priority: string; assignee?: string | null }) => {
      const res = await apiClient.post("/api/v1/planner/tasks/", {
        title: payload.title,
        priority: payload.priority,
        assignee: payload.assignee || null,
        status: "TODO"
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["planner-all-tasks"] });
      setCommandPaletteOpen(false);
      setPaletteState("default");
      setTaskTitle("");
      setSearch("");
    }
  });

  const assignTaskMutation = useMutation({
    mutationFn: async (payload: { taskId: string; assigneeId: string | null }) => {
      const res = await apiClient.patch(`/api/v1/planner/tasks/${payload.taskId}/`, {
        assignee: payload.assigneeId
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["planner-all-tasks"] });
      setCommandPaletteOpen(false);
      setPaletteState("default");
      setSelectedTaskId(null);
      setSearch("");
    }
  });

  const handleBackAction = useCallback(() => {
    if (paletteState !== "default") {
      setPaletteState("default");
      setSearch("");
    } else {
      setCommandPaletteOpen(false);
    }
  }, [paletteState, setCommandPaletteOpen]);

  // Key listeners
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setCommandPaletteOpen(!isCommandPaletteOpen);
      }
      if (e.key === "Escape") {
        e.preventDefault();
        handleBackAction();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isCommandPaletteOpen, paletteState, handleBackAction, setCommandPaletteOpen]);



  // Autofocus input when opened or state changes
  useEffect(() => {
    if (isCommandPaletteOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isCommandPaletteOpen, paletteState]);

  // Click outside listener
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (paletteRef.current && !paletteRef.current.contains(event.target as Node)) {
        setCommandPaletteOpen(false);
      }
    };
    if (isCommandPaletteOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isCommandPaletteOpen, setCommandPaletteOpen]);

  if (!isCommandPaletteOpen) return null;

  // 1. Navigation links
  const navigationCommands = [
    { name: "Navigate: Dashboard overview", icon: <Monitor className="h-4 w-4 text-indigo-400" />, action: () => router.push("/dashboard") },
    { name: "Navigate: Projects list", icon: <Folder className="h-4 w-4 text-indigo-400" />, action: () => router.push("/projects") },
    { name: "Navigate: Tasks Board / Kanban", icon: <Sliders className="h-4 w-4 text-indigo-400" />, action: () => router.push("/tasks") },
    { name: "Navigate: Daily Planner", icon: <Calendar className="h-4 w-4 text-indigo-400" />, action: () => router.push("/planner") },
    { name: "Navigate: Blocker Center logs", icon: <ShieldAlert className="h-4 w-4 text-rose-400" />, action: () => router.push("/blockers") },
    { name: "Navigate: Daily Standups sync", icon: <StandupIcon className="h-4 w-4 text-indigo-400" />, action: () => router.push("/standups") },
    { name: "Navigate: Timesheets logs", icon: <Clock className="h-4 w-4 text-indigo-400" />, action: () => router.push("/timesheets") },
    { name: "Navigate: Productivity workspace", icon: <Activity className="h-4 w-4 text-indigo-400" />, action: () => router.push("/productivity") },
    { name: "Navigate: Project Releases", icon: <Tag className="h-4 w-4 text-indigo-400" />, action: () => router.push("/releases") },
    { name: "Navigate: Client Portal secure", icon: <Users className="h-4 w-4 text-indigo-400" />, action: () => router.push("/client-portal") },
    { name: "Navigate: Reports & Analytics", icon: <FileText className="h-4 w-4 text-indigo-400" />, action: () => router.push("/reports") },
    { name: "Navigate: SaaS Settings & Audits", icon: <Settings className="h-4 w-4 text-indigo-400" />, action: () => router.push("/settings") },
  ];

  // 2. Action commands
  const actionCommands = [
    {
      name: "Action: Create new workspace task...",
      icon: <PlusCircle className="h-4 w-4 text-indigo-400 animate-pulse" />,
      action: () => { setPaletteState("create-task-title"); setSearch(""); }
    },
    {
      name: "Action: Assign task assignee...",
      icon: <UserCheck className="h-4 w-4 text-indigo-400" />,
      action: () => { setPaletteState("assign-task-select"); setSearch(""); }
    },
    {
      name: "Action: Search workspace users...",
      icon: <Users className="h-4 w-4 text-indigo-400" />,
      action: () => { setPaletteState("search-users"); setSearch(""); }
    },
    {
      name: "Action: Search workspace projects...",
      icon: <Briefcase className="h-4 w-4 text-indigo-400" />,
      action: () => { setPaletteState("search-projects"); setSearch(""); }
    },
    {
      name: "Action: Toggle Light/Dark Mode theme",
      icon: theme === "dark" ? <Sun className="h-4 w-4 text-amber-400" /> : <Moon className="h-4 w-4 text-indigo-400" />,
      action: () => { toggleTheme(); setCommandPaletteOpen(false); }
    },
    {
      name: "Action: Disconnect active session (Sign Out)",
      icon: <LogOut className="h-4 w-4 text-rose-500" />,
      action: () => { logout(); setCommandPaletteOpen(false); }
    }
  ];

  // 3. Switch workspace list
  const workspaceCommands = organizations.map((org) => ({
    name: `Switch Workspace: ${org.name}`,
    icon: <Monitor className="h-4 w-4 text-emerald-400" />,
    action: () => {
      switchOrganization(org.id);
      setCommandPaletteOpen(false);
    }
  }));

  // Resolve current options list based on active state
  let optionsList: Array<{ name: string; icon: React.ReactNode; action: () => void }> = [];
  let placeholderText = "Type a command or search...";

  if (paletteState === "default") {
    optionsList = [
      ...actionCommands,
      ...navigationCommands,
      ...workspaceCommands
    ];
  } else if (paletteState === "create-task-title") {
    placeholderText = "Enter Task Title and press Enter...";
  } else if (paletteState === "create-task-priority") {
    placeholderText = "Choose Task Priority...";
    const priorities = ["LOW", "MEDIUM", "HIGH", "URGENT"];
    optionsList = priorities.map(p => ({
      name: `Select Priority: ${p}`,
      icon: <AlertCircle className="h-4 w-4 text-indigo-400" />,
      action: () => {
        setTaskPriority(p);
        setPaletteState("create-task-assignee");
      }
    }));
  } else if (paletteState === "create-task-assignee") {
    placeholderText = "Select Assignee...";
    optionsList = [
      {
        name: "Skip Assignee / No assignee allocation",
        icon: <UserCheck className="h-4 w-4 text-zinc-400" />,
        action: () => {
          createTaskMutation.mutate({ title: taskTitle, priority: taskPriority, assignee: null });
        }
      },
      ...members.map((m: any) => ({
        name: `Assign to: ${m.user_name} (${m.user_email})`,
        icon: <Users className="h-4 w-4 text-indigo-400" />,
        action: () => {
          createTaskMutation.mutate({ title: taskTitle, priority: taskPriority, assignee: m.user });
        }
      }))
    ];
  } else if (paletteState === "assign-task-select") {
    placeholderText = "Select Task to assign...";
    optionsList = tasks.map((t: any) => ({
      name: `Select: ${t.title} (${t.status})`,
      icon: <Sliders className="h-4 w-4 text-indigo-400" />,
      action: () => {
        setSelectedTaskId(t.id);
        setPaletteState("assign-task-user");
      }
    }));
  } else if (paletteState === "assign-task-user") {
    placeholderText = "Select Assignee for the task...";
    optionsList = [
      {
        name: "Revoke Assignee / Unassign task",
        icon: <UserCheck className="h-4 w-4 text-zinc-400" />,
        action: () => {
          if (selectedTaskId) {
            assignTaskMutation.mutate({ taskId: selectedTaskId, assigneeId: null });
          }
        }
      },
      ...members.map((m: any) => ({
        name: `Assign to: ${m.user_name} (${m.user_email})`,
        icon: <Users className="h-4 w-4 text-indigo-400" />,
        action: () => {
          if (selectedTaskId) {
            assignTaskMutation.mutate({ taskId: selectedTaskId, assigneeId: m.user });
          }
        }
      }))
    ];
  } else if (paletteState === "search-users") {
    placeholderText = "Type user name to filter (Click to copy email)...";
    optionsList = members.map((m: any) => ({
      name: `Copy Email: ${m.user_name} (${m.user_email})`,
      icon: <Users className="h-4 w-4 text-indigo-400" />,
      action: () => {
        navigator.clipboard.writeText(m.user_email);
        setCommandPaletteOpen(false);
        setPaletteState("default");
      }
    }));
  } else if (paletteState === "search-projects") {
    placeholderText = "Type project name to filter...";
    optionsList = projects.map((p: any) => ({
      name: `Project: ${p.name}`,
      icon: <Briefcase className="h-4 w-4 text-indigo-400" />,
      action: () => {
        router.push("/timesheets"); // Project views are integrated inside Timesheets / Client portal
        setCommandPaletteOpen(false);
        setPaletteState("default");
      }
    }));
  }

  // Filter commands by search input
  const filteredOptions = optionsList.filter(opt => 
    opt.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleInputSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (paletteState === "create-task-title" && search.trim()) {
      setTaskTitle(search);
      setPaletteState("create-task-priority");
      setSearch("");
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-modal flex items-start justify-center pt-24 px-4 animate-in fade-in duration-100">
      <div
        ref={paletteRef}
        className="w-full max-w-xl bg-[#121214] border border-[#1f1f23] rounded-xl shadow-2xl overflow-hidden py-1"
        role="dialog"
        aria-modal="true"
      >
        {/* Header Search bar */}
        <form onSubmit={handleInputSubmit} className="flex items-center px-4 border-b border-[#1f1f23]">
          {paletteState !== "default" && (
            <button
              type="button"
              onClick={handleBackAction}
              className="p-1 text-gray-400 hover:text-white mr-2 transition"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
          )}
          <Search className="h-4 w-4 text-gray-400 mr-3 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={placeholderText}
            className="w-full bg-transparent text-white placeholder-gray-500 py-3.5 text-xs focus:outline-none"
          />
        </form>

        {/* Dynamic task creation title label */}
        {paletteState === "create-task-priority" && (
          <div className="px-4 py-2 bg-indigo-500/5 text-indigo-400 text-[10px] font-bold border-b border-[#1f1f23] flex justify-between">
            <span>Creating Task: "{taskTitle}"</span>
            <span className="uppercase">Step 2: Priority</span>
          </div>
        )}
        {paletteState === "create-task-assignee" && (
          <div className="px-4 py-2 bg-indigo-500/5 text-indigo-400 text-[10px] font-bold border-b border-[#1f1f23] flex justify-between">
            <span>Creating Task: "{taskTitle}" ({taskPriority})</span>
            <span className="uppercase">Step 3: Assignee</span>
          </div>
        )}

        {/* Options list */}
        <div className="max-h-72 overflow-y-auto p-2 space-y-1">
          {filteredOptions.length === 0 && paletteState !== "create-task-title" ? (
            <div className="p-4 text-center text-xs text-gray-400">
              No matching commands or database entries found.
            </div>
          ) : paletteState === "create-task-title" && !search.trim() ? (
            <div className="p-4 text-center text-xs text-gray-500 italic">
              Type the name of the new task above and press Enter...
            </div>
          ) : paletteState === "create-task-title" && search.trim() ? (
            <button
              type="submit"
              onClick={handleInputSubmit}
              className="w-full flex items-center px-3 py-2.5 text-xs text-indigo-400 bg-indigo-500/5 border border-indigo-500/10 rounded-lg text-left transition duration-75"
            >
              <PlusCircle className="mr-3 h-4.5 w-4.5 text-indigo-400" />
              <span className="flex-1 font-bold">Create Task: "{search}"</span>
              <span className="text-[9px] bg-[#1c1c1f] px-2 py-0.5 rounded font-mono text-gray-400 border border-[#2d2d34] uppercase">
                Press Enter
              </span>
            </button>
          ) : (
            filteredOptions.map((opt, idx) => (
              <button
                key={idx}
                onClick={opt.action}
                className="w-full flex items-center px-3 py-2 text-xs text-[#8e8e95] hover:text-white rounded-lg hover:bg-[#1c1c1f]/40 text-left transition duration-75"
              >
                <span className="mr-3">{opt.icon}</span>
                <span className="flex-1 font-medium">{opt.name}</span>
                <span className="text-[9px] bg-[#1c1c1f] px-2 py-0.5 rounded font-mono text-gray-400 border border-[#2d2d34] uppercase tracking-wide">
                  Execute
                </span>
              </button>
            ))
          )}
        </div>

        {/* Footer */}
        <footer className="border-t border-[#1f1f23] px-4 py-2.5 bg-[#161619]/40 flex justify-between items-center text-[10px] text-gray-400">
          <span>Esc to go back/close • Active Workspace: <strong>{activeOrganization?.name || "Default"}</strong></span>
          <span>
            <kbd className="bg-[#1c1c1f] px-1.5 py-0.5 rounded border border-[#2d2d34] font-mono">Ctrl+K</kbd>
          </span>
        </footer>
      </div>
    </div>
  );
};
export default CommandPalette;
