"use client";

import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { apiClient } from "@/infrastructure/api/api-client";
import { ProtectedRoute } from "@/features/rbac/components/ProtectedRoute";
import { useAuthStore } from "@/infrastructure/store/auth-store";
import { useAuthorization } from "@/features/rbac/hooks/useAuthorization";
import { 
  Building, 
  FolderPlus, 
  Folder, 
  Check, 
  X, 
  AlertCircle, 
  CheckCircle,
  Clock,
  Eye,
  EyeOff,
  Plus,
  Users,
  Calendar,
  DollarSign,
  Briefcase,
  AlertTriangle,
  Upload,
  FileText,
  Link,
  GitBranch,
  TrendingUp,
  Settings,
  Trash2,
  MessageSquare,
  PlusCircle,
  BarChart3,
  ChevronLeft,
  ChevronRight,
  Sparkles
} from "lucide-react";

type ProjectScreen = 
  | "list"
  | "create"
  | "overview"
  | "team"
  | "milestones"
  | "files"
  | "risk"
  | "dependencies"
  | "analytics"
  | "settings"
  | "chat"
  | "calendar"
  | "gantt";

const screenLabels: Record<ProjectScreen, string> = {
  list: "Project list",
  create: "Create project",
  overview: "Overview",
  team: "Member activity",
  milestones: "Milestones",
  files: "Files",
  risk: "Risk register",
  dependencies: "Task board",
  analytics: "Analytics",
  settings: "Settings",
  chat: "Project chat",
  calendar: "Task calendar",
  gantt: "Gantt Chart",
};

const screenDescriptions: Record<ProjectScreen, string> = {
  list: "Browse and manage your active tenant projects list context",
  create: "Initialize a new project workspace, details, and tenant shares",
  overview: "Track milestones progress, overall completion metrics, and phases",
  team: "Allocate team member capacities and view workspace assignments",
  milestones: "Track key sprint phases, target dates, and release completions",
  files: "Securely upload and share product blueprints, specs, and docs",
  risk: "Identify dependencies blockers, severity impact scores, and status",
  dependencies: "Map task links and resolve blockers across workflows",
  analytics: "Analyze sprint burndowns, velocities, and task timelines",
  settings: "Configure project visibility, descriptions, and metadata keys",
  chat: "Discuss tasks, updates, and chat channels context",
  calendar: "Visualize project deadlines, calendar dates, and sprint tasks",
  gantt: "Interactive project timeline, critical path, and task scheduling",
};

const screenIcons: Record<ProjectScreen, React.ReactNode> = {
  list: <Folder className="h-4 w-4" />,
  create: <FolderPlus className="h-4 w-4" />,
  overview: <Eye className="h-4 w-4" />,
  team: <Users className="h-4 w-4" />,
  milestones: <CheckCircle className="h-4 w-4" />,
  files: <FileText className="h-4 w-4" />,
  risk: <AlertTriangle className="h-4 w-4" />,
  dependencies: <GitBranch className="h-4 w-4" />,
  analytics: <TrendingUp className="h-4 w-4" />,
  settings: <Settings className="h-4 w-4" />,
  chat: <MessageSquare className="h-4 w-4" />,
  calendar: <Calendar className="h-4 w-4" />,
  gantt: <BarChart3 className="h-4 w-4" />,
};




interface ProjectItem {
  id: string;
  name: string;
  description: string;
  is_active: boolean;
  is_client_visible: boolean;
  created_at: string;
}

interface ProjectInput {
  name: string;
  description: string;
  is_client_visible: boolean;
}

export default function ProjectsPage() {
  const queryClient = useQueryClient();
  const { activeOrganizationId } = useAuthStore();
  const { hasPermission } = useAuthorization();
  
  const [activeScreen, setActiveScreen] = useState<ProjectScreen>("list");
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const [windowWidth, setWindowWidth] = useState(0);
  const [standupSummary, setStandupSummary] = useState<string>("");
  const [standupLoading, setStandupLoading] = useState<boolean>(false);

  useEffect(() => {
    setWindowWidth(window.innerWidth);
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // -----------------------------------------------------------------
  // API Queries & Mutations
  // -----------------------------------------------------------------
  
  // 1. Query: Fetch Projects
  const { data: projectsData, isLoading } = useQuery<ProjectItem[]>({
    queryKey: ["projects", activeOrganizationId],
    queryFn: async () => {
      const res = await apiClient.get("/api/v1/timesheets/projects/");
      return (Array.isArray(res.data?.data) ? res.data.data : (Array.isArray(res.data) ? res.data : []));
    },
    enabled: !!activeOrganizationId,
  });

  const projects = React.useMemo(() => Array.isArray(projectsData) ? projectsData : [], [projectsData]);

  // Auto-select the first project to enable and unlock all modules by default
  useEffect(() => {
    if (projects.length > 0) {
      const exists = projects.some(p => p.id === selectedProjectId);
      if (!exists) {
        setSelectedProjectId(projects[0].id);
      }
    } else {
      setSelectedProjectId(null);
    }
  }, [projects, selectedProjectId]);

  const selectedProject = projects.find(p => p.id === selectedProjectId);
  const selectedProjectName = selectedProject ? selectedProject.name : "";

  // 2. Form Setup for Create Project
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ProjectInput>({
    defaultValues: {
      name: "",
      description: "",
      is_client_visible: false
    }
  });

  // 3. Mutation: Create Project
  const createProjectMutation = useMutation({
    mutationFn: async (data: ProjectInput) => {
      const res = await apiClient.post("/api/v1/timesheets/projects/", data);
      return res.data.data;
    },
    onSuccess: (newProj) => {
      showToast("Project created successfully.", "success");
      reset();
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      // Auto-select the newly created project and switch to overview
      if (newProj && newProj.id) {
        setSelectedProjectId(newProj.id);
        setActiveScreen("overview");
      } else {
        setActiveScreen("list");
      }
    },
    onError: (err: any) => {
      const errMsg = err.response?.data?.[0] || err.message || "Failed to create project.";
      showToast(errMsg, "error");
    }
  });

  // 4. Mutation: Toggle Status
  const toggleProjectMutation = useMutation({
    mutationFn: async (payload: { id: string; is_active: boolean }) => {
      const res = await apiClient.patch(`/api/v1/timesheets/projects/${payload.id}/`, {
        is_active: payload.is_active
      });
      return res.data;
    },
    onSuccess: () => {
      showToast("Project status updated.", "success");
      queryClient.invalidateQueries({ queryKey: ["projects"] });
    },
    onError: (err: any) => {
      showToast(err.message || "Failed to update project status.", "error");
    }
  });

  // 5. Mutation: Edit Project Metadata
  const updateProjectMutation = useMutation({
    mutationFn: async (payload: { id: string; name: string; description: string; is_client_visible: boolean }) => {
      const res = await apiClient.patch(`/api/v1/timesheets/projects/${payload.id}/`, {
        name: payload.name,
        description: payload.description,
        is_client_visible: payload.is_client_visible
      });
      return res.data;
    },
    onSuccess: () => {
      showToast("Project settings saved.", "success");
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      setActiveScreen("overview");
    },
    onError: (err: any) => {
      showToast(err.message || "Failed to save project settings.", "error");
    }
  });

  const onSubmitCreate = (data: ProjectInput) => {
    createProjectMutation.mutate(data);
  };

  const handleToggleActive = (id: string, currentStatus: boolean) => {
    toggleProjectMutation.mutate({ id, is_active: !currentStatus });
  };

  // -----------------------------------------------------------------
  // Stateful Mock Data for Sub-Screens
  // -----------------------------------------------------------------
  const [milestones, setMilestones] = useState<Record<string, { id: string; title: string; date: string; status: "Completed" | "In Progress" | "Pending" }[]>>({});
  const [teamMembers, setTeamMembers] = useState<Record<string, { name: string; role: string; allocation: number }[]>>({});
  const [projectFiles, setProjectFiles] = useState<Record<string, { name: string; size: string; type: string; date: string }[]>>({});
  const [risks, setRisks] = useState<Record<string, { id: string; desc: string; severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW"; status: "Active" | "Mitigated" }[]>>({});
  const [dependencies, setDependencies] = useState<Record<string, { id: string; task: string; dependsOn: string; status: "Blocked" | "Active" | "Resolved" }[]>>({});

  const getMilestones = (projId: string) => {
    return milestones[projId] || [
      { id: "m1", title: "Project Kickoff & Architecture Spec", date: "2026-07-01", status: "Completed" as const },
      { id: "m2", title: "Database Schema & Server Setup", date: "2026-07-15", status: "Completed" as const },
      { id: "m3", title: "Frontend Client Portal Shell", date: "2026-08-01", status: "In Progress" as const },
      { id: "m4", title: "User Acceptance Testing (UAT)", date: "2026-08-20", status: "Pending" as const },
      { id: "m5", title: "Production Deployment", date: "2026-09-01", status: "Pending" as const },
    ];
  };

  const getTeamMembers = (projId: string) => {
    return teamMembers[projId] || [
      { name: "Sarah Jenkins", role: "DevOps Lead", allocation: 100 },
      { name: "David Kim", role: "Backend Developer", allocation: 80 },
      { name: "Jessica Alba", role: "Frontend Developer", allocation: 50 },
    ];
  };

  const getFiles = (projId: string) => {
    return projectFiles[projId] || [
      { name: "Product_Requirements_v2.docx", size: "4.2 MB", type: "Document", date: "2026-06-20" },
      { name: "System_Architecture_Blueprint.pdf", size: "8.7 MB", type: "PDF", date: "2026-06-22" },
    ];
  };

  const getRisks = (projId: string) => {
    return risks[projId] || [
      { id: "r1", desc: "Third-party payment integration API latency", severity: "HIGH" as const, status: "Active" as const },
      { id: "r2", desc: "Database migration lock timeout on replica", severity: "MEDIUM" as const, status: "Mitigated" as const },
    ];
  };

  const getDependencies = (projId: string) => {
    return dependencies[projId] || [
      { id: "d1", task: "Stripe Billing UI Setup", dependsOn: "Stripe Webhook API Integration", status: "Blocked" as const },
      { id: "d2", task: "Database Indexing", dependsOn: "Data Migration v2", status: "Resolved" as const },
    ];
  };

  // State forms for adding elements
  const [newMilestoneText, setNewMilestoneText] = useState("");
  const [newMilestoneDate, setNewMilestoneDate] = useState("");
  
  const [newMemberName, setNewMemberName] = useState("");
  const [newMemberRole, setNewMemberRole] = useState("");
  const [newMemberAlloc, setNewMemberAlloc] = useState(100);

  const [newFileName, setNewFileName] = useState("");
  const [newFileSize, setNewFileSize] = useState("");

  const [newRiskDesc, setNewRiskDesc] = useState("");
  const [newRiskSeverity, setNewRiskSeverity] = useState<"CRITICAL" | "HIGH" | "MEDIUM" | "LOW">("MEDIUM");

  const [newDepTask, setNewDepTask] = useState("");
  const [newDepDependsOn, setNewDepDependsOn] = useState("");
  const [newDepStatus, setNewDepStatus] = useState<"Blocked" | "Active" | "Resolved">("Active");

  // Edit settings form
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editVisible, setEditVisible] = useState(false);

  // Initialize edit form values when selected project changes
  const startEditSettings = () => {
    if (selectedProject) {
      setEditName(selectedProject.name);
      setEditDesc(selectedProject.description);
      setEditVisible(selectedProject.is_client_visible);
    }
  };

  return (
    <ProtectedRoute>
      <div className="p-6 space-y-6 max-w-6xl mx-auto text-foreground select-none relative pb-20">
        
        {/* Toast Notification */}
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
              <Folder className="h-6 w-6 text-indigo-500" />
              <span>Projects Workspace</span>
            </h1>
            <p className="text-xs text-[#8e8e95] mt-1 leading-relaxed">
              Track project milestones, files, risks, allocations, and configurations inside your tenant space.
            </p>
          </div>

          {/* Project selector dropdown in header if selected */}
          {selectedProjectId && (
            <div className="flex items-center bg-[#1c1c1f]/40 border border-[#2d2d34]/60 p-2.5 rounded-xl gap-2 self-start md:self-auto">
              <span className="text-[9px] uppercase font-bold text-[#8e8e95]">Active:</span>
              <select
                value={selectedProjectId}
                onChange={(e) => {
                  setSelectedProjectId(e.target.value);
                  setActiveScreen("overview");
                }}
                className="bg-[#121214] border border-[#2d2d34]/60 rounded-lg text-xs text-indigo-400 font-bold px-2 py-1.5 focus:outline-none"
              >
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
              <button
                onClick={() => {
                  setSelectedProjectId(null);
                  setActiveScreen("list");
                }}
                className="text-[9px] uppercase font-black text-rose-400 hover:bg-rose-500/10 px-2 py-1.5 rounded-lg border border-rose-500/20 transition"
              >
                Exit Project
              </button>
            </div>
          )}
        </div>

        {/* Dynamic Card-Based Navigation Grid */}
        <nav role="navigation" aria-label="Projects directory navigation" className="space-y-6 w-full">
          {/* Section 1: Workspace Services */}
          <div className="space-y-2">
            <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Workspace Services</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {(["list", "create"] as ProjectScreen[]).map((screen) => {
                const label = screenLabels[screen];
                const desc = screenDescriptions[screen];
                const isActive = activeScreen === screen;

                return (
                  <button
                    key={screen}
                    onClick={() => {
                      setActiveScreen(screen);
                      if (screen === "settings") {
                        startEditSettings();
                      }
                    }}
                    className={`flex items-start gap-4 p-4 border rounded-xl text-left transition-all duration-200 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#0969da] ${
                      isActive
                        ? "bg-white border-[#2da44e] shadow-md ring-1 ring-[#2da44e]"
                        : "bg-white border-[#d0d7de] hover:border-slate-400 hover:-translate-y-0.5 hover:shadow-sm"
                    }`}
                    aria-label={`${label}: ${desc}`}
                  >
                    <span className={`p-2.5 rounded-lg transition-colors shrink-0 ${
                      isActive
                        ? "bg-emerald-50 text-[#2da44e]"
                        : "bg-slate-50 text-slate-500"
                    }`}>
                      {screenIcons[screen]}
                    </span>
                    <div className="overflow-hidden space-y-1">
                      <span className={`text-sm font-semibold block leading-tight ${isActive ? "text-[#2da44e]" : "text-[#24292f]"}`}>
                        {label}
                      </span>
                      <p className={`text-xs leading-normal ${isActive ? "text-emerald-700/80" : "text-slate-500"}`}>
                        {desc}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section 2: Project Modules */}
          <div className="space-y-2">
            <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Project Modules</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {(["overview", "team", "milestones", "files", "risk", "dependencies", "gantt", "analytics", "settings"] as ProjectScreen[]).map((screen) => {
                const label = screenLabels[screen];
                const desc = screenDescriptions[screen];
                const isProjectSpecific = screen !== "list" && screen !== "create";
                const isDisabled = isProjectSpecific && !selectedProjectId;
                const isActive = activeScreen === screen;

                return (
                  <button
                    key={screen}
                    disabled={isDisabled}
                    onClick={() => {
                      setActiveScreen(screen);
                      if (screen === "settings") {
                        startEditSettings();
                      }
                    }}
                    className={`flex items-start gap-4 p-4 border rounded-xl text-left transition-all duration-200 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#0969da] ${
                      isDisabled
                        ? "bg-slate-50/20 border-slate-200 opacity-40 cursor-not-allowed"
                        : isActive
                        ? "bg-white border-[#2da44e] shadow-md ring-1 ring-[#2da44e]"
                        : "bg-white border-[#d0d7de] hover:border-slate-400 hover:-translate-y-0.5 hover:shadow-sm"
                    }`}
                    aria-label={isDisabled ? `${label}: Locked (Please select a project)` : `${label}: ${desc}`}
                    title={isDisabled ? "Select a project from the list to view this screen." : ""}
                  >
                    <span className={`p-2.5 rounded-lg transition-colors shrink-0 ${
                      isDisabled
                        ? "bg-slate-100 text-slate-400"
                        : isActive
                        ? "bg-emerald-50 text-[#2da44e]"
                        : "bg-slate-50 text-slate-500"
                    }`}>
                      {screenIcons[screen]}
                    </span>
                    <div className="overflow-hidden space-y-1">
                      <div className="flex items-center gap-2">
                        <span className={`text-sm font-semibold block leading-tight ${isActive ? "text-[#2da44e]" : "text-[#24292f]"}`}>
                          {label}
                        </span>
                        {screen === "team" && selectedProjectId && (
                          <span className="px-1.5 py-0.25 text-[9px] font-bold bg-slate-100 text-slate-500 rounded-full shrink-0">
                            {getTeamMembers(selectedProjectId).length}
                          </span>
                        )}
                        {screen === "milestones" && selectedProjectId && (
                          <span className="px-1.5 py-0.25 text-[9px] font-bold bg-slate-100 text-slate-500 rounded-full shrink-0">
                            {getMilestones(selectedProjectId).length}
                          </span>
                        )}
                      </div>
                      <p className={`text-xs leading-normal ${isActive ? "text-emerald-700/80" : "text-slate-500"}`}>
                        {desc}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </nav>

        {/* ------------------------------------------------------------- */}
        {/* SCREEN 1: PROJECT LIST                                        */}
        {/* ------------------------------------------------------------- */}
        {activeScreen === "list" && (
          <div className="space-y-6">
            <div className="flex justify-between items-center border-b border-[#d0d7de] pb-3">
              <h2 className="text-sm font-semibold text-[#24292f]">Projects</h2>
              <button
                onClick={() => setActiveScreen("create")}
                className="py-1.5 px-4 bg-[#2da44e] hover:bg-[#2c974b] text-white font-medium text-xs rounded-md shadow-sm transition"
              >
                Create project
              </button>
            </div>

            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
                {[1, 2, 3].map(n => (
                  <div key={n} className="h-40 bg-[#f6f8fa] border border-[#d0d7de] rounded-lg" />
                ))}
              </div>
            ) : projects.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-16 bg-[#f6f8fa] border border-[#d0d7de] border-dashed rounded-lg text-center space-y-4">
                <Folder className="h-12 w-12 text-[#8c959f]" />
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-[#24292f]">No projects registered</p>
                  <p className="text-xs text-[#57606a]">Start by creating with template or blank canvas.</p>
                </div>
                <button
                  onClick={() => setActiveScreen("create")}
                  className="py-2 px-5 bg-[#2da44e] hover:bg-[#2c974b] text-white font-bold text-xs rounded-lg shadow-sm transition"
                >
                  Create Project
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {projects.map((proj) => (
                  <div
                    key={proj.id}
                    className={`bg-[#1c1c1f]/50 border border-[#2d2d34]/60 p-5 rounded-2xl shadow-md hover:shadow-glow hover:border-indigo-500/20 transition-all duration-300 flex flex-col justify-between h-44 ${
                      !proj.is_active ? "opacity-60" : ""
                    }`}
                  >
                    <div className="space-y-2">
                      <div className="flex items-start justify-between">
                        <h3 className="font-bold text-sm text-white truncate max-w-[180px]">{proj.name}</h3>
                        <div className="flex items-center gap-1">
                          <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold ${
                            proj.is_active 
                              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" 
                              : "bg-zinc-500/10 text-zinc-400 border border-zinc-500/20"
                          }`}>
                            {proj.is_active ? "Active" : "Archived"}
                          </span>
                          <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold ${
                            proj.is_client_visible 
                              ? "bg-sky-500/10 text-sky-400 border border-sky-500/20" 
                              : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                          }`}>
                            {proj.is_client_visible ? "Shared" : "Internal"}
                          </span>
                        </div>
                      </div>
                      <p className="text-xs text-[#8e8e95] leading-relaxed line-clamp-3">
                        {proj.description || "No project description provided."}
                      </p>
                    </div>

                    <div className="flex items-center justify-between border-t border-[#2d2d34]/40 pt-3 mt-2">
                      <button
                        onClick={() => {
                          setSelectedProjectId(proj.id);
                          setActiveScreen("overview");
                        }}
                        className="text-[10px] font-black text-indigo-400 hover:text-indigo-300 flex items-center gap-1 transition"
                      >
                        Manage Project &rarr;
                      </button>
                      
                      <button
                        onClick={() => handleToggleActive(proj.id, proj.is_active)}
                        className={`text-[9px] font-bold py-1 px-2 rounded border transition ${
                          proj.is_active 
                            ? "border-[#2d2d34]/60 hover:bg-zinc-800 text-zinc-300"
                            : "border-emerald-500/30 hover:bg-emerald-500/10 text-emerald-400"
                        }`}
                      >
                        {proj.is_active ? "Archive" : "Restore"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* SCREEN 2: CREATE PROJECT                                      */}
        {/* ------------------------------------------------------------- */}
        {activeScreen === "create" && (
          <div className="max-w-md mx-auto bg-[#1c1c1f]/40 border border-[#2d2d34]/60 p-6 rounded-2xl space-y-4">
            <h2 className="text-sm font-extrabold text-white uppercase tracking-wider flex items-center gap-2 border-b border-[#2d2d34]/30 pb-2">
              <FolderPlus className="h-4.5 w-4.5 text-indigo-500" />
              <span>Create Project</span>
            </h2>

            <form onSubmit={handleSubmit(onSubmitCreate)} className="space-y-4">
              <div className="space-y-1">
                <label htmlFor="create-project-name" className="text-[10px] font-bold uppercase tracking-wider text-[#8e8e95]">Project Name</label>
                <input
                  id="create-project-name"
                  type="text"
                  {...register("name", { required: "Project name is required" })}
                  placeholder="e.g. Mobile Application Client Portal"
                  autoComplete="off"
                  className="w-full bg-[#121214] border border-[#1f1f23] rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-indigo-500 transition"
                />
                {errors.name && <p className="text-[10px] text-rose-400 mt-1">{errors.name.message}</p>}
              </div>

              <div className="space-y-1">
                <label htmlFor="create-project-desc" className="text-[10px] font-bold uppercase tracking-wider text-[#8e8e95]">Description</label>
                <textarea
                  id="create-project-desc"
                  rows={4}
                  {...register("description")}
                  placeholder="Overview of scope, deliverables, and targets..."
                  className="w-full bg-[#121214] border border-[#1f1f23] rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-indigo-500 transition resize-none"
                />
              </div>

              <div className="flex items-center bg-[#1c1c1f]/60 border border-[#2d2d34]/60 p-3.5 rounded-xl justify-between">
                <div className="space-y-0.5">
                  <label htmlFor="create-project-visible" className="text-[11px] font-bold text-white block cursor-pointer">Client Portal Visibility</label>
                  <span className="text-[9px] text-[#8e8e95] block leading-relaxed">
                    Allow users in Client roles to view tasks inside this project.
                  </span>
                </div>
                <input
                  id="create-project-visible"
                  type="checkbox"
                  {...register("is_client_visible")}
                  autoComplete="off"
                  className="h-4 w-4 rounded border-zinc-700 text-indigo-600 focus:ring-indigo-600 bg-[#121214] cursor-pointer"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setActiveScreen("list")}
                  className="flex-1 py-2 bg-[#212124] hover:bg-[#2c2c31] border border-[#2d2d34]/60 text-white text-xs font-bold rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createProjectMutation.isPending}
                  className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg transition disabled:opacity-50"
                >
                  {createProjectMutation.isPending ? "Creating..." : "Save Project"}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* SCREEN 3: PROJECT OVERVIEW                                    */}
        {/* ------------------------------------------------------------- */}
        {activeScreen === "overview" && selectedProject && (
          <div className="space-y-6">
            <div className="bg-[#1c1c1f]/40 border border-[#2d2d34]/60 p-6 rounded-2xl space-y-6">
              
              <div className="flex justify-between items-start border-b border-[#2d2d34]/40 pb-4">
                <div className="space-y-1">
                  <h2 className="text-lg font-black text-white">{selectedProject.name}</h2>
                  <p className="text-xs text-[#8e8e95]">{selectedProject.description || "No description provided."}</p>
                </div>
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                  selectedProject.is_active
                    ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                    : "bg-zinc-500/10 text-zinc-400 border border-[#2d2d34]"
                }`}>
                  {selectedProject.is_active ? "Active Workspace" : "Archived Workspace"}
                </span>
              </div>

              {/* Grid Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                
                <div className="bg-[#121214]/60 border border-[#1f1f23] p-4 rounded-xl space-y-1">
                  <span className="text-[9px] uppercase font-bold text-[#8e8e95] block">Current Phase</span>
                  <span className="text-sm font-extrabold text-indigo-400 block">Development</span>
                </div>

                <div className="bg-[#121214]/60 border border-[#1f1f23] p-4 rounded-xl space-y-1">
                  <span className="text-[9px] uppercase font-bold text-[#8e8e95] block">Overall Progress</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-extrabold text-white block">72%</span>
                    <div className="h-1.5 flex-1 bg-zinc-800 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-500" style={{ width: "72%" }} />
                    </div>
                  </div>
                </div>

                <div className="bg-[#121214]/60 border border-[#1f1f23] p-4 rounded-xl space-y-1">
                  <span className="text-[9px] uppercase font-bold text-[#8e8e95] block">Milestones Completed</span>
                  <span className="text-sm font-extrabold text-white block">
                    {getMilestones(selectedProjectId!).filter(m => m.status === "Completed").length} / {getMilestones(selectedProjectId!).length}
                  </span>
                </div>

                <div className="bg-[#121214]/60 border border-[#1f1f23] p-4 rounded-xl space-y-1">
                  <span className="text-[9px] uppercase font-bold text-[#8e8e95] block">Active Team Members</span>
                  <span className="text-sm font-extrabold text-white block">
                    {getTeamMembers(selectedProjectId!).length} assigned
                  </span>
                </div>

              </div>

              {/* Details sections row */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                <div className="p-4 bg-[#121214]/40 border border-[#2d2d34]/40 rounded-xl space-y-3">
                  <span className="text-[10px] uppercase font-black text-indigo-400 block border-b border-[#2d2d34]/40 pb-1">
                    Metadata details
                  </span>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-[#8e8e95]">Created On:</span>
                      <span className="font-semibold text-white">{new Date(selectedProject.created_at).toLocaleDateString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#8e8e95]">Client Visible:</span>
                      <span className="font-semibold text-white">{selectedProject.is_client_visible ? "Yes (Shared)" : "No (Internal)"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#8e8e95]">Active Status:</span>
                      <span className="font-semibold text-white">{selectedProject.is_active ? "Running" : "Paused/Archived"}</span>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-[#121214]/40 border border-[#2d2d34]/40 rounded-xl space-y-3">
                  <span className="text-[10px] uppercase font-black text-indigo-400 block border-b border-[#2d2d34]/40 pb-1">
                    Quick Actions
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setActiveScreen("team")}
                      className="py-2 px-3 bg-[#1c1c1f] hover:bg-[#28282c] text-white rounded-lg border border-[#2d2d34]/60 text-xs font-bold transition text-center"
                    >
                      Assign Team
                    </button>
                    <button
                      onClick={() => setActiveScreen("milestones")}
                      className="py-2 px-3 bg-[#1c1c1f] hover:bg-[#28282c] text-white rounded-lg border border-[#2d2d34]/60 text-xs font-bold transition text-center"
                    >
                      Edit Milestones
                    </button>
                    <button
                      onClick={() => setActiveScreen("risk")}
                      className="py-2 px-3 bg-[#1c1c1f] hover:bg-[#28282c] text-white rounded-lg border border-[#2d2d34]/60 text-xs font-bold transition text-center"
                    >
                      Risk Register
                    </button>
                    <button
                      onClick={() => {
                        startEditSettings();
                        setActiveScreen("settings");
                      }}
                      className="py-2 px-3 bg-[#1c1c1f] hover:bg-[#28282c] text-white rounded-lg border border-[#2d2d34]/60 text-xs font-bold transition text-center"
                    >
                      Configure Settings
                    </button>
                  </div>
                </div>

              </div>

              {/* AI Daily Standup Summarization Block */}
              <div className="p-5 bg-gradient-to-br from-[#121214]/80 to-[#1c1c1f]/80 border border-[#2d2d34]/60 rounded-xl space-y-4">
                <div className="flex justify-between items-center border-b border-[#2d2d34]/40 pb-2">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4.5 w-4.5 text-indigo-400 animate-pulse" />
                    <span className="text-xs font-bold text-white uppercase tracking-wider">AI Daily Standup Summarizer</span>
                  </div>
                  <button
                    onClick={async () => {
                      setStandupLoading(true);
                      try {
                        const res = await apiClient.get("/api/v1/tasks/standup/");
                        setStandupSummary(res.data?.data?.summary || res.data?.summary || "No standup summary returned.");
                        showToast("Standup summary generated.", "success");
                      } catch {
                        showToast("Failed to generate standup summary.", "error");
                      } finally {
                        setStandupLoading(false);
                      }
                    }}
                    disabled={standupLoading}
                    className="py-1 px-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[10px] rounded-lg uppercase tracking-wider transition disabled:opacity-50"
                  >
                    {standupLoading ? "Generating..." : "Generate Standup"}
                  </button>
                </div>

                {standupSummary ? (
                  <div className="space-y-3">
                    <pre className="p-3.5 bg-[#0f0f11] border border-[#1f1f23] rounded-lg text-xs text-slate-300 font-mono whitespace-pre-wrap leading-relaxed select-text">
                      {standupSummary}
                    </pre>
                    <div className="flex justify-end">
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(standupSummary);
                          showToast("Copied to clipboard!", "success");
                        }}
                        className="py-1 px-3 bg-[#1c1c1f] hover:bg-[#28282c] border border-[#2d2d34]/60 text-white font-semibold text-[10px] rounded-lg transition"
                      >
                        Copy to Clipboard
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-[#8e8e95] leading-relaxed">
                    Aggregate completed, active, and overdue tasks from all projects to compile a quick AI-assisted daily digest.
                  </p>
                )}
              </div>

            </div>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* SCREEN 4: TEAM MEMBERS                                        */}
        {/* ------------------------------------------------------------- */}
        {activeScreen === "team" && selectedProjectId && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* List */}
            <div className="lg:col-span-2 bg-[#1c1c1f]/40 border border-[#2d2d34]/60 p-5 rounded-2xl space-y-4">
              <h2 className="text-sm font-bold text-white uppercase tracking-wider border-b border-[#2d2d34]/30 pb-2">
                Team Members
              </h2>

              <div className="space-y-3">
                {getTeamMembers(selectedProjectId).map((member, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 bg-[#121214]/60 border border-[#1f1f23] rounded-xl text-xs">
                    <div className="flex items-center gap-3">
                      <span className="h-8 w-8 rounded-full bg-indigo-950/40 border border-indigo-900/50 text-[10px] font-bold text-indigo-400 flex items-center justify-center select-none">
                        {member.name.split(" ").map(n => n[0]).join("")}
                      </span>
                      <div>
                        <span className="font-bold text-white block">{member.name}</span>
                        <span className="text-[10px] text-[#8e8e95] block mt-0.5">{member.role}</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <span className="font-bold text-white block">{member.allocation}%</span>
                        <span className="text-[9px] text-[#8e8e95] block">Allocation</span>
                      </div>
                      <button
                        onClick={() => {
                          const filtered = getTeamMembers(selectedProjectId).filter(m => m.name !== member.name);
                          setTeamMembers(prev => ({ ...prev, [selectedProjectId]: filtered }));
                          showToast(`${member.name} unassigned.`, "success");
                        }}
                        className="p-1 hover:bg-[#2d2d34] rounded text-[#8e8e95] hover:text-rose-400 transition"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Assign Form */}
            <div className="bg-[#1c1c1f]/40 border border-[#2d2d34]/60 p-5 rounded-2xl space-y-4 h-fit">
              <span className="text-xs font-bold text-indigo-400 uppercase tracking-widest block border-b border-[#2d2d34]/30 pb-1">
                Assign Member
              </span>

              <div className="space-y-3 text-xs">
                <div className="space-y-1">
                  <label htmlFor="member-name" className="text-[10px] font-bold text-[#8e8e95] uppercase">Member Name</label>
                  <input
                    id="member-name"
                    name="member-name"
                    type="text"
                    value={newMemberName}
                    onChange={(e) => setNewMemberName(e.target.value)}
                    placeholder="e.g. John Doe"
                    autoComplete="name"
                    className="w-full bg-[#121214] border border-[#1f1f23] rounded-lg p-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="space-y-1">
                  <label htmlFor="member-role" className="text-[10px] font-bold text-[#8e8e95] uppercase">Role</label>
                  <input
                    id="member-role"
                    name="member-role"
                    type="text"
                    value={newMemberRole}
                    onChange={(e) => setNewMemberRole(e.target.value)}
                    placeholder="e.g. Quality Assurance"
                    autoComplete="off"
                    className="w-full bg-[#121214] border border-[#1f1f23] rounded-lg p-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="space-y-1">
                  <label htmlFor="member-allocation" className="text-[10px] font-bold text-[#8e8e95] uppercase">Allocation %</label>
                  <input
                    id="member-allocation"
                    name="member-allocation"
                    type="number"
                    value={newMemberAlloc}
                    onChange={(e) => setNewMemberAlloc(Number(e.target.value))}
                    max={100}
                    min={10}
                    placeholder="100"
                    autoComplete="off"
                    className="w-full bg-[#121214] border border-[#1f1f23] rounded-lg p-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <button
                  onClick={() => {
                    if (!newMemberName || !newMemberRole) {
                      showToast("Please fill in member credentials.", "error");
                      return;
                    }
                    const current = getTeamMembers(selectedProjectId);
                    setTeamMembers(prev => ({
                      ...prev,
                      [selectedProjectId]: [...current, { name: newMemberName, role: newMemberRole, allocation: newMemberAlloc }]
                    }));
                    setNewMemberName("");
                    setNewMemberRole("");
                    setNewMemberAlloc(100);
                    showToast("Member assigned to project.", "success");
                  }}
                  className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-lg transition"
                >
                  Assign to Project
                </button>
              </div>
            </div>

          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* SCREEN 5: MILESTONES                                          */}
        {/* ------------------------------------------------------------- */}
        {activeScreen === "milestones" && selectedProjectId && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Timeline */}
            <div className="lg:col-span-2 bg-[#1c1c1f]/40 border border-[#2d2d34]/60 p-5 rounded-2xl space-y-4">
              <h2 className="text-sm font-bold text-white uppercase tracking-wider border-b border-[#2d2d34]/30 pb-2">
                Milestones
              </h2>

              <div className="space-y-4 relative pl-4 border-l border-zinc-800 ml-2">
                {getMilestones(selectedProjectId).map((milestone, idx) => (
                  <div key={milestone.id} className="relative space-y-1">
                    {/* Circle icon marker */}
                    <span className={`absolute -left-6.5 top-0.5 h-4 w-4 rounded-full border flex items-center justify-center ${
                      milestone.status === "Completed"
                        ? "bg-emerald-500/10 border-emerald-500 text-emerald-400"
                        : milestone.status === "In Progress"
                        ? "bg-indigo-500/10 border-indigo-500 text-indigo-400"
                        : "bg-zinc-800 border-zinc-700 text-zinc-500"
                    }`}>
                      {milestone.status === "Completed" && <Check className="h-2 w-2" />}
                    </span>

                    <div className="flex justify-between items-start gap-4">
                      <div>
                        <span className="font-bold text-xs text-white block">{milestone.title}</span>
                        <span className="text-[9px] text-[#8e8e95] flex items-center gap-1.5 mt-0.5">
                          <Calendar className="h-3 w-3" />
                          <span>Target: {milestone.date}</span>
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <select
                          value={milestone.status}
                          onChange={(e) => {
                            const updated = getMilestones(selectedProjectId).map(m => 
                              m.id === milestone.id ? { ...m, status: e.target.value as any } : m
                            );
                            setMilestones(prev => ({ ...prev, [selectedProjectId]: updated }));
                            showToast("Milestone status updated.", "success");
                          }}
                          className="bg-[#121214] border border-[#2d2d34]/60 rounded text-[9px] font-bold p-1 text-white"
                        >
                          <option value="Completed">Completed</option>
                          <option value="In Progress">In Progress</option>
                          <option value="Pending">Pending</option>
                        </select>

                        <button
                          onClick={() => {
                            const filtered = getMilestones(selectedProjectId).filter(m => m.id !== milestone.id);
                            setMilestones(prev => ({ ...prev, [selectedProjectId]: filtered }));
                            showToast("Milestone deleted.", "success");
                          }}
                          className="p-1 hover:bg-[#2d2d34] rounded text-[#8e8e95] hover:text-rose-400 transition"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Add Milestone Form */}
            <div className="bg-[#1c1c1f]/40 border border-[#2d2d34]/60 p-5 rounded-2xl space-y-4 h-fit">
              <span className="text-xs font-bold text-indigo-400 uppercase tracking-widest block border-b border-[#2d2d34]/30 pb-1">
                Add Milestone
              </span>

              <div className="space-y-3 text-xs">
                <div className="space-y-1">
                  <label htmlFor="milestone-title" className="text-[10px] font-bold text-[#8e8e95] uppercase">Milestone Title</label>
                  <input
                    id="milestone-title"
                    name="milestone-title"
                    type="text"
                    value={newMilestoneText}
                    onChange={(e) => setNewMilestoneText(e.target.value)}
                    placeholder="e.g. Beta release v1.0.0"
                    autoComplete="off"
                    className="w-full bg-[#121214] border border-[#1f1f23] rounded-lg p-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="space-y-1">
                  <label htmlFor="milestone-date" className="text-[10px] font-bold text-[#8e8e95] uppercase">Target Date</label>
                  <input
                    id="milestone-date"
                    name="milestone-date"
                    type="date"
                    value={newMilestoneDate}
                    onChange={(e) => setNewMilestoneDate(e.target.value)}
                    autoComplete="off"
                    className="w-full bg-[#121214] border border-[#1f1f23] rounded-lg p-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <button
                  onClick={() => {
                    if (!newMilestoneText || !newMilestoneDate) {
                      showToast("Please provide all milestone details.", "error");
                      return;
                    }
                    const current = getMilestones(selectedProjectId);
                    setMilestones(prev => ({
                      ...prev,
                      [selectedProjectId]: [...current, { id: `m-${Date.now()}`, title: newMilestoneText, date: newMilestoneDate, status: "Pending" }]
                    }));
                    setNewMilestoneText("");
                    setNewMilestoneDate("");
                    showToast("Milestone added successfully.", "success");
                  }}
                  className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-lg transition"
                >
                  Create Milestone
                </button>
              </div>
            </div>

          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* SCREEN 6: PROJECT FILES (DOCUMENTS)                           */}
        {/* ------------------------------------------------------------- */}
        {activeScreen === "files" && selectedProjectId && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* List */}
            <div className="lg:col-span-2 bg-[#1c1c1f]/40 border border-[#2d2d34]/60 p-5 rounded-2xl space-y-4">
              <h2 className="text-sm font-bold text-white uppercase tracking-wider border-b border-[#2d2d34]/30 pb-2">
                Project Files
              </h2>

              <div className="space-y-3">
                {getFiles(selectedProjectId).map((file, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 bg-[#121214]/60 border border-[#1f1f23] rounded-xl text-xs">
                    <div className="flex items-center gap-3">
                      <span className="h-8 w-8 rounded bg-zinc-800 border flex items-center justify-center text-indigo-400">
                        <FileText className="h-4 w-4" />
                      </span>
                      <div>
                        <span className="font-bold text-white block">{file.name}</span>
                        <span className="text-[9px] text-[#8e8e95] block mt-0.5">{file.size} • Uploaded {file.date}</span>
                      </div>
                    </div>
                    
                    <button
                      onClick={() => {
                        const filtered = getFiles(selectedProjectId).filter(f => f.name !== file.name);
                        setProjectFiles(prev => ({ ...prev, [selectedProjectId]: filtered }));
                        showToast("Document deleted.", "success");
                      }}
                      className="p-1 hover:bg-[#2d2d34] rounded text-[#8e8e95] hover:text-rose-400 transition"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Upload form placeholder */}
            <div className="bg-[#1c1c1f]/40 border border-[#2d2d34]/60 p-5 rounded-2xl space-y-4 h-fit">
              <span className="text-xs font-bold text-indigo-400 uppercase tracking-widest block border-b border-[#2d2d34]/30 pb-1">
                Upload Document
              </span>

              <div className="space-y-3 text-xs">
                <div className="border border-dashed border-zinc-700/60 p-6 rounded-xl text-center space-y-2">
                  <Upload className="h-6 w-6 mx-auto text-indigo-400 animate-pulse" />
                  <span className="text-[10px] text-[#8e8e95] block">Select files or drag here to upload</span>
                </div>

                <div className="space-y-1.5 pt-1">
                  <label htmlFor="file-name" className="text-[10px] font-bold text-[#8e8e95] uppercase">Or Add File Name</label>
                  <input
                    id="file-name"
                    name="file-name"
                    type="text"
                    value={newFileName}
                    onChange={(e) => setNewFileName(e.target.value)}
                    placeholder="e.g. Architecture Blueprint.pdf"
                    autoComplete="off"
                    className="w-full bg-[#121214] border border-[#1f1f23] rounded-lg p-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="file-size" className="text-[10px] font-bold text-[#8e8e95] uppercase">Size (optional)</label>
                  <input
                    id="file-size"
                    name="file-size"
                    type="text"
                    value={newFileSize}
                    onChange={(e) => setNewFileSize(e.target.value)}
                    placeholder="e.g. 2.5 MB"
                    autoComplete="off"
                    className="w-full bg-[#121214] border border-[#1f1f23] rounded-lg p-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <button
                  onClick={() => {
                    if (!newFileName) {
                      showToast("Please provide a file name.", "error");
                      return;
                    }
                    const current = getFiles(selectedProjectId);
                    setProjectFiles(prev => ({
                      ...prev,
                      [selectedProjectId]: [...current, { name: newFileName, size: newFileSize || "1.0 MB", type: "Document", date: new Date().toISOString().split("T")[0] }]
                    }));
                    setNewFileName("");
                    setNewFileSize("");
                    showToast("Document saved.", "success");
                  }}
                  className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-lg transition"
                >
                  Save Document
                </button>
              </div>
            </div>

          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* SCREEN 7: RISK REGISTER                                       */}
        {/* ------------------------------------------------------------- */}
        {activeScreen === "risk" && selectedProjectId && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* List */}
            <div className="lg:col-span-2 bg-[#1c1c1f]/40 border border-[#2d2d34]/60 p-5 rounded-2xl space-y-4">
              <h2 className="text-sm font-bold text-white uppercase tracking-wider border-b border-[#2d2d34]/30 pb-2">
                Risk Register
              </h2>

              <div className="space-y-3">
                {getRisks(selectedProjectId).map((risk, idx) => (
                  <div key={risk.id} className="p-3 bg-[#121214]/60 border border-[#1f1f23] rounded-xl text-xs flex justify-between items-start gap-4">
                    <div className="space-y-1.5 overflow-hidden">
                      <div className="flex items-center gap-2">
                        <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold ${
                          risk.severity === "CRITICAL"
                            ? "bg-rose-500/10 text-rose-400 border border-rose-900/50"
                            : risk.severity === "HIGH"
                            ? "bg-amber-500/10 text-amber-400 border border-amber-900/30"
                            : "bg-indigo-500/10 text-indigo-400 border border-indigo-900/20"
                        }`}>
                          {risk.severity}
                        </span>
                        <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold ${
                          risk.status === "Active"
                            ? "bg-rose-500/10 text-rose-400"
                            : "bg-emerald-500/10 text-emerald-400"
                        }`}>
                          {risk.status}
                        </span>
                      </div>
                      <p className="text-white font-medium">{risk.desc}</p>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          const updated = getRisks(selectedProjectId).map(r => 
                            r.id === risk.id ? { ...r, status: r.status === "Active" ? "Mitigated" : "Active" as any } : r
                          );
                          setRisks(prev => ({ ...prev, [selectedProjectId]: updated }));
                          showToast("Risk status toggled.", "success");
                        }}
                        className="px-2 py-1 bg-card hover:bg-zinc-800 text-[10px] text-white border border-[#2d2d34] rounded transition"
                      >
                        Mitigate
                      </button>
                      <button
                        onClick={() => {
                          const filtered = getRisks(selectedProjectId).filter(r => r.id !== risk.id);
                          setRisks(prev => ({ ...prev, [selectedProjectId]: filtered }));
                          showToast("Risk cleared.", "success");
                        }}
                        className="p-1 hover:bg-[#2d2d34] rounded text-[#8e8e95] hover:text-rose-400 transition"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Add Risk Form */}
            <div className="bg-[#1c1c1f]/40 border border-[#2d2d34]/60 p-5 rounded-2xl space-y-4 h-fit">
              <span className="text-xs font-bold text-indigo-400 uppercase tracking-widest block border-b border-[#2d2d34]/30 pb-1">
                Log Project Risk
              </span>

              <div className="space-y-3 text-xs">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-[#8e8e95] uppercase">Risk Description</label>
                  <textarea
                    rows={3}
                    value={newRiskDesc}
                    onChange={(e) => setNewRiskDesc(e.target.value)}
                    placeholder="Identify vulnerabilities, dependency blocks..."
                    className="w-full bg-[#121214] border border-[#1f1f23] rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-indigo-500 resize-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-[#8e8e95] uppercase">Severity Impact</label>
                  <select
                    value={newRiskSeverity}
                    onChange={(e) => setNewRiskSeverity(e.target.value as any)}
                    className="w-full bg-[#121214] border border-[#1f1f23] rounded-lg p-2 text-xs text-white focus:outline-none"
                  >
                    <option value="CRITICAL">Critical</option>
                    <option value="HIGH">High</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="LOW">Low</option>
                  </select>
                </div>

                <button
                  onClick={() => {
                    if (!newRiskDesc) {
                      showToast("Please write a risk description.", "error");
                      return;
                    }
                    const current = getRisks(selectedProjectId);
                    setRisks(prev => ({
                      ...prev,
                      [selectedProjectId]: [...current, { id: `r-${Date.now()}`, desc: newRiskDesc, severity: newRiskSeverity, status: "Active" }]
                    }));
                    setNewRiskDesc("");
                    showToast("Risk logged in Register.", "success");
                  }}
                  className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-lg transition"
                >
                  Log Risk
                </button>
              </div>
            </div>

          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* SCREEN 8: DEPENDENCIES                                        */}
        {/* ------------------------------------------------------------- */}
        {activeScreen === "dependencies" && selectedProjectId && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* List */}
            <div className="lg:col-span-2 bg-[#1c1c1f]/40 border border-[#2d2d34]/60 p-5 rounded-2xl space-y-4">
              <h2 className="text-sm font-bold text-white uppercase tracking-wider border-b border-[#2d2d34]/30 pb-2">
                Dependencies
              </h2>

              <div className="space-y-3">
                {getDependencies(selectedProjectId).map((dep, idx) => (
                  <div key={dep.id} className="p-3 bg-[#121214]/60 border border-[#1f1f23] rounded-xl text-xs flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      <span className="p-1.5 rounded bg-zinc-800 border flex items-center justify-center text-indigo-400">
                        <GitBranch className="h-4 w-4" />
                      </span>
                      <div>
                        <span className="font-bold text-white block">{dep.task}</span>
                        <span className="text-[10px] text-[#8e8e95] block mt-0.5">Depends on: <span className="text-indigo-400">{dep.dependsOn}</span></span>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                        dep.status === "Blocked"
                          ? "bg-rose-500/10 text-rose-400 border border-rose-900/50 animate-pulse"
                          : dep.status === "Resolved"
                          ? "bg-emerald-500/10 text-emerald-400"
                          : "bg-indigo-500/10 text-indigo-400"
                      }`}>
                        {dep.status}
                      </span>
                      
                      <button
                        onClick={() => {
                          const filtered = getDependencies(selectedProjectId).filter(d => d.id !== dep.id);
                          setDependencies(prev => ({ ...prev, [selectedProjectId]: filtered }));
                          showToast("Dependency removed.", "success");
                        }}
                        className="p-1 hover:bg-[#2d2d34] rounded text-[#8e8e95] hover:text-rose-400 transition"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Add Dependency Form */}
            <div className="bg-[#1c1c1f]/40 border border-[#2d2d34]/60 p-5 rounded-2xl space-y-4 h-fit">
              <span className="text-xs font-bold text-indigo-400 uppercase tracking-widest block border-b border-[#2d2d34]/30 pb-1">
                Link Tasks Dependency
              </span>

              <div className="space-y-3 text-xs">
                <div className="space-y-1">
                  <label htmlFor="dependency-task" className="text-[10px] font-bold text-[#8e8e95] uppercase">Work Task</label>
                  <input
                    id="dependency-task"
                    name="dependency-task"
                    type="text"
                    value={newDepTask}
                    onChange={(e) => setNewDepTask(e.target.value)}
                    placeholder="e.g. Production Release deployment"
                    autoComplete="off"
                    className="w-full bg-[#121214] border border-[#1f1f23] rounded-lg p-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="space-y-1">
                  <label htmlFor="dependency-depends" className="text-[10px] font-bold text-[#8e8e95] uppercase">Depends On</label>
                  <input
                    id="dependency-depends"
                    name="dependency-depends"
                    type="text"
                    value={newDepDependsOn}
                    onChange={(e) => setNewDepDependsOn(e.target.value)}
                    placeholder="e.g. Database Index Setup"
                    autoComplete="off"
                    className="w-full bg-[#121214] border border-[#1f1f23] rounded-lg p-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-[#8e8e95] uppercase">Dependency Status</label>
                  <select
                    value={newDepStatus}
                    onChange={(e) => setNewDepStatus(e.target.value as any)}
                    className="w-full bg-[#121214] border border-[#1f1f23] rounded-lg p-2 text-xs text-white focus:outline-none"
                  >
                    <option value="Active">Active</option>
                    <option value="Blocked">Blocked</option>
                    <option value="Resolved">Resolved</option>
                  </select>
                </div>

                <button
                  onClick={() => {
                    if (!newDepTask || !newDepDependsOn) {
                      showToast("Please provide dependency targets.", "error");
                      return;
                    }
                    const current = getDependencies(selectedProjectId);
                    setDependencies(prev => ({
                      ...prev,
                      [selectedProjectId]: [...current, { id: `d-${Date.now()}`, task: newDepTask, dependsOn: newDepDependsOn, status: newDepStatus }]
                    }));
                    setNewDepTask("");
                    setNewDepDependsOn("");
                    showToast("Dependency mapping saved.", "success");
                  }}
                  className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-lg transition"
                >
                  Map Dependency
                </button>
              </div>
            </div>

          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* SCREEN 9: PROJECT ANALYTICS                                   */}
        {/* ------------------------------------------------------------- */}
        {activeScreen === "analytics" && selectedProjectId && (
          <div className="bg-[#1c1c1f]/40 border border-[#2d2d34]/60 p-5 rounded-2xl space-y-6">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider border-b border-[#2d2d34]/30 pb-2">
              Project Analytics
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Burndown chart */}
              <div className="bg-[#121214]/60 border border-[#1f1f23] p-4 rounded-xl space-y-3">
                <span className="text-[10px] uppercase font-bold text-[#8e8e95]">Burndown Chart (Sprint 4 Tasks)</span>
                <div className="w-full h-36 flex items-end justify-between px-2 pt-4 relative">
                  <div className="absolute inset-x-2 top-8 border-t border-zinc-800 border-dashed" />
                  <div className="absolute inset-x-2 top-20 border-t border-zinc-800 border-dashed" />
                  
                  {/* Burndown mock graph lines via simple SVGs */}
                  <svg className="absolute inset-0 w-full h-full p-2" viewBox="0 0 100 100" preserveAspectRatio="none">
                    {/* Ideal Burndown (zinc) */}
                    <line x1="0" y1="10" x2="100" y2="90" className="stroke-zinc-700" strokeWidth="1" strokeDasharray="3 3" />
                    {/* Real Burndown (indigo) */}
                    <path d="M 0 10 L 20 18 L 40 45 L 60 52 L 80 78 L 100 90" fill="none" className="stroke-indigo-500" strokeWidth="2" />
                  </svg>

                  <div className="w-full flex justify-between text-[9px] text-[#8e8e95] uppercase font-semibold absolute bottom-1 inset-x-2">
                    <span>Start</span>
                    <span>W1</span>
                    <span>W2</span>
                    <span>W3</span>
                    <span>W4</span>
                    <span>End</span>
                  </div>
                </div>
              </div>

              {/* Task Completion Velocity */}
              <div className="bg-[#121214]/60 border border-[#1f1f23] p-4 rounded-xl space-y-3">
                <span className="text-[10px] uppercase font-bold text-[#8e8e95]">Completions Velocity</span>
                <div className="h-36 flex items-end gap-3 justify-center">
                  {[
                    { week: "W1", tasks: 8 },
                    { week: "W2", tasks: 12 },
                    { week: "W3", tasks: 15 },
                    { week: "W4", tasks: 11 },
                    { week: "W5", tasks: 16 }
                  ].map((w, idx) => (
                    <div key={idx} className="flex flex-col items-center gap-1.5 flex-1 max-w-[40px]">
                      <span className="text-[9px] font-bold text-white">{w.tasks}</span>
                      <div className="w-full bg-[#2d2d34]/60 rounded-md h-20 relative overflow-hidden">
                        <div 
                          className="bg-indigo-600/80 rounded-md absolute bottom-0 left-0 right-0"
                          style={{ height: `${(w.tasks / 20) * 100}%` }}
                        />
                      </div>
                      <span className="text-[9px] text-[#8e8e95] font-semibold">{w.week}</span>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* SCREEN 10: PROJECT SETTINGS                                   */}
        {/* ------------------------------------------------------------- */}
        {activeScreen === "settings" && selectedProjectId && (
          <div className="max-w-md mx-auto bg-[#1c1c1f]/40 border border-[#2d2d34]/60 p-6 rounded-2xl space-y-4">
            <h2 className="text-sm font-extrabold text-white uppercase tracking-wider flex items-center gap-2 border-b border-[#2d2d34]/30 pb-2">
              <Settings className="h-4.5 w-4.5 text-indigo-500" />
              <span>Project Settings</span>
            </h2>

            <div className="space-y-4 text-xs">
              <div className="space-y-1">
                <label htmlFor="edit-project-name" className="text-[10px] font-bold uppercase tracking-wider text-[#8e8e95]">Project Name</label>
                <input
                  id="edit-project-name"
                  name="edit-project-name"
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  autoComplete="off"
                  className="w-full bg-[#121214] border border-[#1f1f23] rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-indigo-500 transition"
                />
              </div>

              <div className="space-y-1">
                <label htmlFor="edit-project-desc" className="text-[10px] font-bold uppercase tracking-wider text-[#8e8e95]">Description</label>
                <textarea
                  id="edit-project-desc"
                  rows={4}
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                  className="w-full bg-[#121214] border border-[#1f1f23] rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-indigo-500 transition resize-none"
                />
              </div>

              <div className="flex items-center bg-[#1c1c1f]/60 border border-[#2d2d34]/60 p-3.5 rounded-xl justify-between">
                <div className="space-y-0.5">
                  <label htmlFor="edit-project-visible" className="text-[11px] font-bold text-white block cursor-pointer">Client Portal Visibility</label>
                  <span className="text-[9px] text-[#8e8e95] block leading-relaxed">
                    Allow users in Client roles to view tasks inside this project.
                  </span>
                </div>
                <input
                  id="edit-project-visible"
                  name="edit-project-visible"
                  type="checkbox"
                  checked={editVisible}
                  onChange={(e) => setEditVisible(e.target.checked)}
                  autoComplete="off"
                  className="h-4 w-4 rounded border-zinc-700 text-indigo-600 focus:ring-indigo-600 bg-[#121214] cursor-pointer"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setActiveScreen("overview")}
                  className="flex-1 py-2 bg-[#212124] hover:bg-[#2c2c31] border border-[#2d2d34]/60 text-white text-xs font-bold rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    if (!editName) {
                      showToast("Project name cannot be empty.", "error");
                      return;
                    }
                    updateProjectMutation.mutate({
                      id: selectedProjectId,
                      name: editName,
                      description: editDesc,
                      is_client_visible: editVisible
                    });
                  }}
                  disabled={updateProjectMutation.isPending}
                  className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg transition disabled:opacity-50"
                >
                  {updateProjectMutation.isPending ? "Saving..." : "Save Settings"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* SCREEN 11: PROJECT CHAT (PLACEHOLDER)                         */}
        {/* ------------------------------------------------------------- */}
        {activeScreen === "chat" && selectedProjectId && (
          <div className="bg-[#f6f8fa] border border-[#d0d7de] p-8 rounded-lg text-center space-y-4">
            <Users className="h-12 w-12 text-[#8c959f] mx-auto animate-bounce" />
            <div className="space-y-1">
              <h3 className="text-base font-bold text-[#24292f]">Project Chat Channels</h3>
              <p className="text-xs text-[#57606a]">Real-time discussions and Slack/Teams integrations are loading...</p>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* SCREEN 12: TASK CALENDAR (PLACEHOLDER)                       */}
        {/* ------------------------------------------------------------- */}
        {activeScreen === "calendar" && selectedProjectId && (
          <div className="bg-[#f6f8fa] border border-[#d0d7de] p-8 rounded-lg text-center space-y-4">
            <Calendar className="h-12 w-12 text-[#8c959f] mx-auto animate-pulse" />
            <div className="space-y-1">
              <h3 className="text-base font-bold text-[#24292f]">Task Calendar Grid</h3>
              <p className="text-xs text-[#57606a]">Synchronized team calendar events and sprint tasks scheduler view.</p>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* SCREEN 13: GANTT CHART (INTERACTIVE TIMELINE)                  */}
        {/* ------------------------------------------------------------- */}
        {activeScreen === "gantt" && selectedProjectId && (() => {
          // Build tasks list for this project from the fetched tasks list
          const ganttTasks = tasks.filter((t: any) => t.project === selectedProjectId && t.due_date);
          const today = new Date();
          // Determine timeline window: 4 weeks back, 8 weeks forward
          const windowStart = new Date(today);
          windowStart.setDate(today.getDate() - 14);
          const windowEnd = new Date(today);
          windowEnd.setDate(today.getDate() + 42);
          const totalDays = Math.round((windowEnd.getTime() - windowStart.getTime()) / 86400000);

          const dayLabels: string[] = [];
          for (let i = 0; i < totalDays; i++) {
            const d = new Date(windowStart);
            d.setDate(windowStart.getDate() + i);
            dayLabels.push(d.toLocaleDateString("en-US", { month: "short", day: "numeric" }));
          }

          const getTaskBar = (task: any) => {
            const due = new Date(task.due_date);
            const start = task.created_at ? new Date(task.created_at) : new Date(due.getTime() - 3 * 86400000);
            const startOffset = Math.max(0, Math.round((start.getTime() - windowStart.getTime()) / 86400000));
            const endOffset = Math.min(totalDays, Math.round((due.getTime() - windowStart.getTime()) / 86400000));
            const width = Math.max(1, endOffset - startOffset);
            return { startOffset, width };
          };

          const priorityColors: Record<string, string> = {
            URGENT: "bg-rose-500",
            HIGH: "bg-amber-500",
            MEDIUM: "bg-indigo-500",
            LOW: "bg-emerald-500",
          };

          const statusColors: Record<string, string> = {
            DONE: "opacity-50 saturate-50",
            IN_PROGRESS: "ring-2 ring-white/30",
            BACKLOG: "opacity-70",
            TODO: "",
            REVIEW: "ring-2 ring-amber-400/60",
          };

          const todayOffset = Math.round((today.getTime() - windowStart.getTime()) / 86400000);
          const COL_W = 48; // px per day column

          return (
            <div className="space-y-4">
              {/* Header */}
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-bold text-[#24292f] uppercase tracking-wider">Gantt Chart — Project Timeline</h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {ganttTasks.length} task{ganttTasks.length !== 1 ? "s" : ""} with due dates · Showing {totalDays}-day window
                  </p>
                </div>
                <div className="flex items-center gap-3 text-[10px]">
                  {["URGENT","HIGH","MEDIUM","LOW"].map(p => (
                    <span key={p} className="flex items-center gap-1.5">
                      <span className={`h-2.5 w-2.5 rounded-sm ${priorityColors[p]}`} />
                      <span className="text-slate-500 font-semibold">{p}</span>
                    </span>
                  ))}
                </div>
              </div>

              {ganttTasks.length === 0 ? (
                <div className="border border-dashed border-slate-300 rounded-xl p-12 text-center">
                  <BarChart3 className="h-10 w-10 mx-auto text-slate-300 mb-3" />
                  <p className="text-sm font-semibold text-slate-500">No tasks with due dates found for this project.</p>
                  <p className="text-xs text-slate-400 mt-1">Create tasks with due dates in the Task Board to see them here.</p>
                </div>
              ) : (
                <div className="border border-[#d0d7de] rounded-xl overflow-hidden bg-white shadow-sm">
                  {/* Timeline header row */}
                  <div className="flex border-b border-[#d0d7de] bg-[#f6f8fa] sticky top-0 z-10">
                    <div className="w-48 shrink-0 px-4 py-2 border-r border-[#d0d7de]">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Task</span>
                    </div>
                    <div className="flex overflow-x-auto" style={{ width: `${totalDays * COL_W}px`, minWidth: `${totalDays * COL_W}px` }}>
                      {dayLabels.map((label, i) => (
                        <div
                          key={i}
                          style={{ width: `${COL_W}px`, minWidth: `${COL_W}px` }}
                          className={`px-1 py-2 text-center border-r border-[#d0d7de]/50 ${
                            i === todayOffset ? "bg-indigo-50 border-indigo-300" : ""
                          }`}
                        >
                          <span className={`text-[9px] font-bold ${i === todayOffset ? "text-indigo-600" : "text-slate-400"}`}>
                            {i % 3 === 0 ? label : ""}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Task rows */}
                  {ganttTasks.map((task: any, rowIdx: number) => {
                    const { startOffset, width } = getTaskBar(task);
                    const barColor = priorityColors[task.priority] || "bg-indigo-500";
                    const barStatus = statusColors[task.status] || "";
                    return (
                      <div
                        key={task.id}
                        className={`flex items-center border-b border-[#d0d7de]/60 hover:bg-slate-50/50 transition ${
                          rowIdx % 2 === 0 ? "bg-white" : "bg-slate-50/30"
                        }`}
                        style={{ height: "44px" }}
                      >
                        {/* Task label */}
                        <div className="w-48 shrink-0 px-4 border-r border-[#d0d7de]/60 flex items-center gap-2 overflow-hidden" style={{ height: "44px" }}>
                          <span className={`h-2 w-2 rounded-full shrink-0 ${barColor}`} />
                          <div className="overflow-hidden">
                            <p className="text-xs font-semibold text-[#24292f] truncate leading-tight">{task.title}</p>
                            <p className="text-[9px] text-slate-400 truncate">{task.status.replace("_", " ")}</p>
                          </div>
                        </div>

                        {/* Timeline bar area */}
                        <div
                          className="relative flex-1 overflow-x-auto"
                          style={{ width: `${totalDays * COL_W}px`, minWidth: `${totalDays * COL_W}px`, height: "44px" }}
                        >
                          {/* Today vertical line */}
                          <div
                            className="absolute top-0 bottom-0 w-px bg-indigo-400/50 z-10"
                            style={{ left: `${todayOffset * COL_W}px` }}
                          />

                          {/* Task bar */}
                          <div
                            className={`absolute top-1/2 -translate-y-1/2 h-6 rounded-md ${barColor} ${barStatus} flex items-center px-2 shadow-sm cursor-pointer group`}
                            style={{
                              left: `${startOffset * COL_W + 2}px`,
                              width: `${Math.max(width * COL_W - 4, 24)}px`,
                            }}
                            title={`${task.title} — Due: ${task.due_date}`}
                          >
                            <span className="text-[9px] font-bold text-white/90 truncate">{task.title}</span>
                            {task.status === "DONE" && (
                              <Check className="h-3 w-3 text-white ml-auto shrink-0" />
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Legend */}
              <div className="flex flex-wrap items-center gap-4 pt-2 border-t border-slate-200">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Status:</span>
                {Object.entries({ "In Progress": "ring-2 ring-indigo-400/60 bg-indigo-500", "Done": "opacity-50 bg-slate-500", "Under Review": "ring-2 ring-amber-400/60 bg-amber-500", "Backlog": "opacity-70 bg-slate-400" }).map(([label, cls]) => (
                  <span key={label} className="flex items-center gap-1.5 text-[10px] text-slate-500">
                    <span className={`h-2.5 w-6 rounded-sm ${cls}`} />
                    {label}
                  </span>
                ))}
                <div className="flex items-center gap-1.5 ml-auto text-[10px] text-indigo-500 font-semibold">
                  <div className="h-3 w-px bg-indigo-400" />
                  Today
                </div>
              </div>
            </div>
          );
        })()}

      </div>
    </ProtectedRoute>
  );
}
