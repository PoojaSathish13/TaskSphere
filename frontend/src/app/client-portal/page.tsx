"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/infrastructure/api/api-client";
import { ProtectedRoute } from "@/features/rbac/components/ProtectedRoute";
import { useAuthStore } from "@/infrastructure/store/auth-store";
import { 
  CheckSquare, 
  Clock, 
  FileText, 
  Check, 
  X, 
  AlertCircle, 
  CheckCircle,
  TrendingUp,
  ChevronRight,
  ShieldAlert,
  Building,
  User,
  Inbox,
  Send,
  Flag,
  FileDown,
  Activity,
  FolderOpen,
  Bell,
  HelpCircle,
  Briefcase,
  Layers,
  DollarSign,
  MessageSquare
} from "lucide-react";

// 7 Requested Modules
type ClientModule =
  | "dashboard"
  | "projects"
  | "deliverables"
  | "releases"
  | "approvals"
  | "invoices"
  | "documents";

const moduleLabels: Record<ClientModule, string> = {
  dashboard: "Dashboard",
  projects: "Projects",
  deliverables: "Deliverables",
  releases: "Releases",
  approvals: "Approvals",
  invoices: "Invoices",
  documents: "Documents",
};

interface ProjectItem {
  id: string;
  name: string;
  description: string;
}

interface TaskItem {
  id: string;
  title: string;
  description: string;
  priority: string;
  status: string;
  due_date: string | null;
  project: string;
  project_name: string;
}

interface ReleaseItem {
  id: string;
  project_name: string;
  version: string;
  release_date: string | null;
  status: 'PLANNING' | 'BETA' | 'RELEASED';
  notes: string;
}

interface ApprovalRequestItem {
  id: string;
  project_name: string;
  title: string;
  description: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'NEEDS_CLARIFICATION';
  requested_by_email: string;
  comments: string;
  created_at: string;
}

interface ClientDocumentItem {
  id: string;
  project_name: string;
  title: string;
  description: string;
  file_url: string;
  uploaded_by_email: string;
  created_at: string;
}

interface ProjectActivityItem {
  id: string;
  project_name: string;
  activity_type: string;
  title: string;
  description: string;
  created_by_email: string;
  created_at: string;
}

interface NotificationItem {
  id: string;
  verb: string;
  description: string;
  is_read: boolean;
  created_at: string;
}

interface ReportMetrics {
  total_tasks: number;
  completed_tasks: number;
  pending_tasks: number;
  progress_rate: number;
  pending_approvals: number;
  risks: { id: number; title: string; severity: string }[];
}

interface InvoiceItem {
  id: string;
  invoice_number: string;
  description: string;
  amount: string;
  due_date: string;
  status: "PAID" | "PENDING" | "OVERDUE";
}

export default function ClientPortalPage() {
  const queryClient = useQueryClient();
  const { activeOrganizationId, user: currentUser } = useAuthStore();

  const [activeModule, setActiveModule] = useState<ClientModule>("dashboard");
  
  // Projects Module sub-screens: Client Projects | Project Progress
  const [projectsScreen, setProjectsScreen] = useState<"list" | "progress">("list");
  
  // Approvals Module sub-screens: Milestone Approval | Comments & Feedback
  const [approvalsScreen, setApprovalsScreen] = useState<"milestones" | "comments">("milestones");

  const [selectedProjectId, setSelectedProjectId] = useState<string>("all");
  const [reviewEntryId, setReviewEntryId] = useState<string | null>(null);
  const [reviewStatus, setReviewStatus] = useState<"APPROVED" | "REJECTED" | "NEEDS_CLARIFICATION">("APPROVED");
  const [comments, setComments] = useState("");
  const [showNotifications, setShowNotifications] = useState(false);

  // Comments Feed state for "Comments & Feedback" screen
  const [feedbackInput, setFeedbackInput] = useState("");
  const [feedbackList, setFeedbackList] = useState<Array<{ id: string; user: string; text: string; time: string }>>([
    { id: "1", user: "manager@company.com", text: "Welcome to the client portal! Please review the wireframe blueprints milestone.", time: "2 hours ago" },
  ]);

  // Stateful mock Invoices
  const [invoices] = useState<InvoiceItem[]>([
    { id: "1", invoice_number: "INV-2281-01", description: "Design Sprint & Requirements Phase 1 Completion", amount: "$3,800.00", due_date: "2026-05-15", status: "PAID" },
    { id: "2", invoice_number: "INV-2281-02", description: "Sprint 2 Deliverables: Auth, MFA, and Database Integration", amount: "$9,500.00", due_date: "2026-06-30", status: "PENDING" },
    { id: "3", invoice_number: "INV-2281-03", description: "Sprint 3: Enterprise Timesheet Workspace Release", amount: "$7,200.00", due_date: "2026-07-25", status: "PENDING" },
  ]);

  // Toast notifications
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Queries
  const { data: projects = [] } = useQuery<ProjectItem[]>({
    queryKey: ["client-projects", activeOrganizationId],
    queryFn: async () => {
      const res = await apiClient.get("/api/v1/client/projects/");
      return (Array.isArray(res.data?.data) ? res.data.data : (Array.isArray(res.data) ? res.data : []));
    }
  });

  const { data: tasks = [], isLoading: loadingTasks } = useQuery<TaskItem[]>({
    queryKey: ["client-tasks", activeOrganizationId],
    queryFn: async () => {
      const res = await apiClient.get("/api/v1/client/tasks/");
      return (Array.isArray(res.data?.data) ? res.data.data : (Array.isArray(res.data) ? res.data : []));
    }
  });

  const { data: releases = [], isLoading: loadingReleases } = useQuery<ReleaseItem[]>({
    queryKey: ["client-releases", activeOrganizationId],
    queryFn: async () => {
      const res = await apiClient.get("/api/v1/client/releases/");
      return (Array.isArray(res.data?.data) ? res.data.data : (Array.isArray(res.data) ? res.data : []));
    }
  });

  const { data: approvals = [], isLoading: loadingApprovals } = useQuery<ApprovalRequestItem[]>({
    queryKey: ["client-approvals", activeOrganizationId],
    queryFn: async () => {
      const res = await apiClient.get("/api/v1/client/approvals/");
      return (Array.isArray(res.data?.data) ? res.data.data : (Array.isArray(res.data) ? res.data : []));
    }
  });

  const { data: documents = [], isLoading: loadingDocs } = useQuery<ClientDocumentItem[]>({
    queryKey: ["client-documents", activeOrganizationId],
    queryFn: async () => {
      const res = await apiClient.get("/api/v1/client/documents/");
      return (Array.isArray(res.data?.data) ? res.data.data : (Array.isArray(res.data) ? res.data : []));
    }
  });

  const { data: activities = [], isLoading: loadingActivities } = useQuery<ProjectActivityItem[]>({
    queryKey: ["client-activities", activeOrganizationId],
    queryFn: async () => {
      const res = await apiClient.get("/api/v1/client/activities/");
      return (Array.isArray(res.data?.data) ? res.data.data : (Array.isArray(res.data) ? res.data : []));
    }
  });

  const { data: notifications = [] } = useQuery<NotificationItem[]>({
    queryKey: ["client-notifications", activeOrganizationId],
    queryFn: async () => {
      const res = await apiClient.get("/api/v1/client/notifications/");
      return (Array.isArray(res.data?.data) ? res.data.data : (Array.isArray(res.data) ? res.data : []));
    }
  });

  const { data: report } = useQuery<ReportMetrics>({
    queryKey: ["client-reports", activeOrganizationId],
    queryFn: async () => {
      const res = await apiClient.get("/api/v1/client/reports/");
      return res.data.data;
    }
  });

  // Mutation: Submit Review Action (Approve/Reject/Clarify)
  const submitReviewMutation = useMutation({
    mutationFn: async (payload: { id: string; status: "APPROVED" | "REJECTED" | "NEEDS_CLARIFICATION"; comments: string }) => {
      const res = await apiClient.patch(`/api/v1/client/approvals/${payload.id}/`, {
        status: payload.status,
        comments: payload.comments
      });
      return res.data.data;
    },
    onSuccess: (data) => {
      showToast(`Request status updated to ${data.status.toLowerCase()} successfully`, "success");
      setReviewEntryId(null);
      setComments("");
      queryClient.invalidateQueries({ queryKey: ["client-approvals"] });
      queryClient.invalidateQueries({ queryKey: ["client-reports"] });
      queryClient.invalidateQueries({ queryKey: ["client-activities"] });
    },
    onError: () => {
      showToast("Failed to submit approval review decision", "error");
    }
  });

  const handleOpenReviewModal = (id: string, status: "APPROVED" | "REJECTED" | "NEEDS_CLARIFICATION") => {
    setReviewEntryId(id);
    setReviewStatus(status);
    setComments("");
  };

  const handleReviewSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewEntryId) return;
    submitReviewMutation.mutate({
      id: reviewEntryId,
      status: reviewStatus,
      comments
    });
  };

  const handlePostFeedback = (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedbackInput.trim()) return;
    setFeedbackList(prev => [
      ...prev,
      {
        id: Math.random().toString(),
        user: currentUser?.email || "client@company.com",
        text: feedbackInput,
        time: "Just now"
      }
    ]);
    setFeedbackInput("");
    showToast("Feedback comment posted", "success");
  };

  const handleDownload = async (type: "pdf" | "excel") => {
    try {
      const endpoint = type === "pdf" ? "/api/v1/client/reports/export_pdf/" : "/api/v1/client/reports/export_excel/";
      const res = await apiClient.get(endpoint, { responseType: "blob" });
      const blob = new Blob([res.data], { type: type === "pdf" ? "application/pdf" : "text/csv" });
      const link = document.createElement("a");
      link.href = window.URL.createObjectURL(blob);
      link.download = type === "pdf" ? "client_report.pdf" : "client_report.csv";
      link.click();
      showToast(`${type.toUpperCase()} downloaded successfully`, "success");
    } catch {
      showToast("Export failed. Please try again.", "error");
    }
  };

  const unreadNotifications = notifications.filter(n => !n.is_read);

  // Filter items by selected project
  const filteredTasks = selectedProjectId === "all" ? tasks : tasks.filter(t => t.project === selectedProjectId);
  const filteredReleases = selectedProjectId === "all" ? releases : releases.filter(r => r.project_name === projects.find(p => p.id === selectedProjectId)?.name);
  const filteredApprovals = selectedProjectId === "all" ? approvals : approvals.filter(a => a.project_name === projects.find(p => p.id === selectedProjectId)?.name);
  const filteredDocuments = selectedProjectId === "all" ? documents : documents.filter(d => d.project_name === projects.find(p => p.id === selectedProjectId)?.name);
  const filteredActivities = selectedProjectId === "all" ? activities : activities.filter(a => a.project_name === projects.find(p => p.id === selectedProjectId)?.name);

  // Check role: Must be client or superadmin
  const isClient = currentUser?.is_superuser || currentUser?.memberships?.some((m: any) => m.role_code === 'CLIENT');

  if (!isClient) {
    return (
      <ProtectedRoute>
        <div className="flex flex-col items-center justify-center h-[60vh] text-center p-8 bg-[#0a0a0c]">
          <ShieldAlert className="h-16 w-16 text-rose-500 mb-4 animate-pulse" />
          <h2 className="text-xl font-bold text-white">Access Unauthorized</h2>
          <p className="text-[#8e8e95] text-xs mt-2 max-w-sm">
            Only users with formal CLIENT credentials or administrators can access the client portal.
          </p>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div className="p-6 space-y-6 max-w-6xl mx-auto text-foreground select-none relative pb-20">
        
        {/* Toast Alert */}
        {toast && (
          <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-xl border text-xs font-semibold shadow-xl animate-slide-up bg-[#121214] ${
            toast.type === "success" 
              ? "border-emerald-500/25 text-emerald-400" 
              : "border-rose-500/25 text-rose-400"
          }`}>
            {toast.type === "success" ? <CheckCircle className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
            <span>{toast.message}</span>
          </div>
        )}

        {/* Header Block */}
        <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-[#2d2d34]/60 pb-5 gap-4">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-white flex items-center gap-2.5">
              <Inbox className="h-6 w-6 text-indigo-500" />
              <span>Secure Client Portal</span>
            </h1>
            <p className="text-xs text-[#8e8e95] mt-1 leading-relaxed">
              Verify roadmap versions, sign off milestones, view invoicing lists, and consult uploader assets.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Notification Center */}
            <div className="relative">
              <button 
                onClick={() => setShowNotifications(!showNotifications)}
                className="p-2 bg-[#1c1c1f] border border-[#2d2d34]/60 text-[#8e8e95] hover:text-white rounded-xl relative transition"
              >
                <Bell className="h-4.5 w-4.5" />
                {unreadNotifications.length > 0 && (
                  <span className="absolute top-0 right-0 h-2 w-2 rounded-full bg-indigo-500 animate-ping" />
                )}
              </button>

              {showNotifications && (
                <div className="absolute right-0 mt-2 w-80 bg-[#121214] border border-[#1f1f23] rounded-xl shadow-2xl z-50 p-4 space-y-3">
                  <div className="flex justify-between items-center pb-2 border-b border-[#1f1f23]">
                    <span className="text-xs font-bold text-white">Alerts & Notifications</span>
                    <span className="text-[9px] bg-indigo-500/10 text-indigo-400 px-2 py-0.5 rounded font-bold">
                      {unreadNotifications.length} New
                    </span>
                  </div>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <p className="text-[10px] text-[#8e8e95] py-2 text-center">No alerts logged.</p>
                    ) : (
                      notifications.map(n => (
                        <div key={n.id} className="text-[10px] p-2 bg-[#1c1c1f]/40 border border-[#2d2d34]/40 rounded-lg space-y-1">
                          <p className="text-white font-semibold">{n.verb}</p>
                          {n.description && <p className="text-[#8e8e95]">{n.description}</p>}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Export Actions */}
            <div className="flex gap-2">
              <button 
                onClick={() => handleDownload("pdf")}
                className="flex items-center gap-1.5 px-3 py-2 bg-[#1c1c1f] border border-[#2d2d34]/60 text-gray-300 hover:text-white text-[10px] font-bold uppercase tracking-wider rounded-xl transition"
              >
                <FileDown className="h-3.5 w-3.5 text-[#8e8e95]" /> PDF Report
              </button>
              <button 
                onClick={() => handleDownload("excel")}
                className="flex items-center gap-1.5 px-3 py-2 bg-[#1c1c1f] border border-[#2d2d34]/60 text-gray-300 hover:text-white text-[10px] font-bold uppercase tracking-wider rounded-xl transition"
              >
                <FileDown className="h-3.5 w-3.5 text-[#8e8e95]" /> Excel CSV
              </button>
            </div>
          </div>
        </div>

        {/* Global Context Project Filter */}
        <div className="flex items-center gap-2 text-xs">
          <Briefcase className="h-4 w-4 text-indigo-500" />
          <label htmlFor="project-context-select" className="text-[#8e8e95] font-semibold">Active Project Context:</label>
          <select 
            id="project-context-select"
            name="project-context-select"
            value={selectedProjectId}
            onChange={(e) => setSelectedProjectId(e.target.value)}
            autoComplete="off"
            className="bg-[#1c1c1f] border border-[#2d2d34]/60 text-white text-xs font-bold rounded-lg px-2.5 py-1.5 focus:outline-none cursor-pointer"
          >
            <option value="all">All Accessible Projects</option>
            {projects.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>

        {/* Modules Tab Bar */}
        <div className="bg-[#1c1c1f] p-1.5 border border-[#2d2d34]/60 rounded-2xl flex gap-1 overflow-x-auto max-w-full no-scrollbar">
          {(["dashboard", "projects", "deliverables", "releases", "approvals", "invoices", "documents"] as ClientModule[]).map((mod) => (
            <button
              key={mod}
              onClick={() => setActiveModule(mod)}
              className={`py-1.5 px-3.5 rounded-xl text-[10px] font-bold uppercase tracking-wider shrink-0 transition ${
                activeModule === mod
                  ? "bg-indigo-600 text-white shadow-md"
                  : "text-[#8e8e95] hover:text-white hover:bg-zinc-800/50"
              }`}
            >
              {moduleLabels[mod]}
            </button>
          ))}
        </div>

        {/* ------------------------------------------------------------- */}
        {/* MODULE 1: DASHBOARD -> Client Dashboard Screen                */}
        {/* ------------------------------------------------------------- */}
        {activeModule === "dashboard" && (
          <div className="space-y-6">
            
            {/* Screen Header */}
            <div className="flex flex-col gap-1 border-b border-[#2d2d34]/40 pb-3">
              <h2 className="text-lg font-black text-white">Client Dashboard</h2>
              <p className="text-xs text-[#8e8e95]">Overview metrics, health scores, and pending approval items</p>
            </div>

            {/* Metrics cards grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-[#1c1c1f]/40 border border-[#2d2d34]/60 rounded-xl p-4 shadow-sm">
                <span className="text-[10px] uppercase font-bold text-[#8e8e95] tracking-wider">Project Progress Rate</span>
                <div className="flex items-baseline gap-1.5 mt-2">
                  <span className="text-2xl font-black text-white">{report?.progress_rate || 100}%</span>
                  <span className="text-xs text-indigo-400 font-semibold">completion</span>
                </div>
              </div>

              <div className="bg-[#1c1c1f]/40 border border-[#2d2d34]/60 rounded-xl p-4 shadow-sm">
                <span className="text-[10px] uppercase font-bold text-[#8e8e95] tracking-wider">Completed Tasks</span>
                <div className="flex items-baseline gap-1.5 mt-2">
                  <span className="text-2xl font-black text-emerald-400">{report?.completed_tasks || 0}</span>
                  <span className="text-xs text-[#8e8e95]">tasks</span>
                </div>
              </div>

              <div className="bg-[#1c1c1f]/40 border border-[#2d2d34]/60 rounded-xl p-4 shadow-sm">
                <span className="text-[10px] uppercase font-bold text-[#8e8e95] tracking-wider">Active Risks</span>
                <div className="flex items-baseline gap-1.5 mt-2">
                  <span className="text-2xl font-black text-amber-500">{report?.risks?.length || 0}</span>
                  <span className="text-xs text-amber-500 font-semibold">identified</span>
                </div>
              </div>

              <div className="bg-[#1c1c1f]/40 border border-[#2d2d34]/60 rounded-xl p-4 shadow-sm">
                <span className="text-[10px] uppercase font-bold text-[#8e8e95] tracking-wider">Pending Approvals</span>
                <div className="flex items-baseline gap-1.5 mt-2">
                  <span className={`text-2xl font-black ${report?.pending_approvals && report.pending_approvals > 0 ? "text-indigo-400 animate-pulse" : "text-[#8e8e95]"}`}>
                    {report?.pending_approvals || 0}
                  </span>
                  <span className="text-xs text-[#8e8e95]">requests</span>
                </div>
              </div>
            </div>

            {/* Warnings and summary notifications log */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Warnings panel */}
              <div className="bg-[#1c1c1f]/40 border border-[#2d2d34]/60 p-5 rounded-2xl space-y-4">
                <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <ShieldAlert className="h-4 w-4 text-amber-500" />
                  <span>Sprint Risks & Flags</span>
                </h3>

                <div className="space-y-3 pt-1">
                  {!report?.risks || report.risks.length === 0 ? (
                    <div className="text-center py-8 text-[11px] text-[#8e8e95]">
                      No active blockers or scheduling risks identified for your projects.
                    </div>
                  ) : (
                    report.risks.map((risk) => (
                      <div key={risk.id} className="p-3 bg-[#121214]/60 border border-[#1f1f23] rounded-xl flex justify-between items-center text-xs">
                        <span className="text-[#8e8e95] truncate max-w-[200px]">{risk.title}</span>
                        <span className={`font-mono font-bold text-[8px] uppercase px-1.5 py-0.5 rounded ${
                          risk.severity === 'CRITICAL' ? "bg-rose-500/10 text-rose-400 border border-rose-500/20" : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                        }`}>{risk.severity}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Summary Activities log */}
              <div className="bg-[#1c1c1f]/40 border border-[#2d2d34]/60 p-5 rounded-2xl space-y-4">
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">Recent Activity Logs</h3>
                
                <div className="space-y-3 max-h-[220px] overflow-y-auto pr-1">
                  {loadingActivities ? (
                    <p className="text-xs text-muted-foreground animate-pulse">Loading updates...</p>
                  ) : filteredActivities.length === 0 ? (
                    <p className="text-xs text-[#8e8e95] py-4 text-center">No recent activities logged.</p>
                  ) : (
                    filteredActivities.slice(0, 4).map((act) => (
                      <div key={act.id} className="p-3 bg-[#121214]/60 border border-[#1f1f23] rounded-xl text-[11px] space-y-1">
                        <div className="flex justify-between items-baseline">
                          <span className="font-bold text-white truncate max-w-[150px]">{act.title}</span>
                          <span className="font-mono text-[9px] text-[#8e8e95]">{new Date(act.created_at).toLocaleDateString()}</span>
                        </div>
                        <p className="text-[#8e8e95] text-[10px] truncate">"{act.description}"</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* MODULE 2: PROJECTS                                            */}
        {/* ------------------------------------------------------------- */}
        {activeModule === "projects" && (
          <div className="space-y-6">
            
            {/* Sub-screens toggle buttons */}
            <div className="flex gap-2 border-b border-[#2d2d34]/30 pb-3">
              <button
                onClick={() => setProjectsScreen("list")}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wide transition ${
                  projectsScreen === "list" ? "bg-zinc-800 text-white border border-[#2d2d34]" : "text-[#8e8e95] hover:text-white"
                }`}
              >
                Client Projects Screen
              </button>
              <button
                onClick={() => setProjectsScreen("progress")}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wide transition ${
                  projectsScreen === "progress" ? "bg-zinc-800 text-white border border-[#2d2d34]" : "text-[#8e8e95] hover:text-white"
                }`}
              >
                Project Progress Screen
              </button>
            </div>

            {/* SCREEN 2: CLIENT PROJECTS SCREEN */}
            {projectsScreen === "list" && (
              <div className="space-y-4">
                <div className="flex flex-col gap-0.5">
                  <h2 className="text-base font-extrabold text-white">Client Projects</h2>
                  <p className="text-[10px] text-[#8e8e95]">Overview details of registered workspaces shared with your organization</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {projects.map((p) => (
                    <div
                      key={p.id}
                      onClick={() => {
                        setSelectedProjectId(p.id);
                        setProjectsScreen("progress");
                      }}
                      className="bg-[#1c1c1f]/40 border border-[#2d2d34]/60 p-5 rounded-2xl hover:border-indigo-500/30 transition cursor-pointer flex flex-col justify-between h-36"
                    >
                      <div className="space-y-1.5">
                        <span className="text-[9px] uppercase font-bold tracking-widest text-indigo-400 block font-mono">Workspace Project</span>
                        <h3 className="font-extrabold text-sm text-white truncate">{p.name}</h3>
                        <p className="text-[11px] text-[#8e8e95] leading-relaxed line-clamp-2">
                          {p.description || "No project description detailed."}
                        </p>
                      </div>

                      <span className="text-[10px] font-black text-indigo-400 hover:text-indigo-300 self-end">
                        View Progress &rarr;
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* SCREEN 3: PROJECT PROGRESS SCREEN */}
            {projectsScreen === "progress" && (
              <div className="space-y-4">
                <div className="flex flex-col gap-0.5">
                  <h2 className="text-base font-extrabold text-white">Project Progress</h2>
                  <p className="text-[10px] text-[#8e8e95]">Real-time task boards and activity timeline for the selected project context</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Active Tasks Board Column */}
                  <div className="bg-[#1c1c1f]/40 border border-[#2d2d34]/60 p-4 rounded-xl space-y-3">
                    <h3 className="text-xs font-bold text-white uppercase tracking-wider">Tasks Boards</h3>
                    
                    <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                      {loadingTasks ? (
                        <p className="text-xs text-muted-foreground animate-pulse">Loading...</p>
                      ) : filteredTasks.length === 0 ? (
                        <p className="text-xs text-muted-foreground py-6 text-center">No tasks recorded.</p>
                      ) : (
                        filteredTasks.map((t) => (
                          <div key={t.id} className="p-3 bg-[#121214]/60 border border-[#1f1f23] rounded-xl text-xs space-y-1">
                            <div className="flex justify-between items-start">
                              <span className="font-bold text-white">{t.title}</span>
                              <span className={`text-[8px] font-bold px-1.5 rounded uppercase ${
                                t.status === "DONE" ? "text-emerald-400 bg-emerald-500/5 border border-emerald-500/20" : "text-indigo-400 bg-indigo-500/5 border border-indigo-500/20"
                              }`}>{t.status}</span>
                            </div>
                            <p className="text-[#8e8e95] text-[10px] line-clamp-2">"{t.description || 'No details.'}"</p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Activity Timeline Column */}
                  <div className="bg-[#1c1c1f]/40 border border-[#2d2d34]/60 p-4 rounded-xl space-y-3">
                    <h3 className="text-xs font-bold text-white uppercase tracking-wider">Activity Feed</h3>
                    
                    <div className="relative border-l border-[#2d2d34]/40 ml-3 pl-5 space-y-5 max-h-[300px] overflow-y-auto pr-1">
                      {filteredActivities.length === 0 ? (
                        <p className="text-xs text-[#8e8e95] py-4 pl-1">No activities logged.</p>
                      ) : (
                        filteredActivities.map((act) => (
                          <div key={act.id} className="relative">
                            <span className="absolute -left-[28px] top-1 bg-indigo-500 h-2.5 w-2.5 rounded-full" />
                            <div className="text-xs">
                              <span className="font-bold text-white block">{act.title}</span>
                              <span className="text-[9px] text-[#8e8e95] font-mono">{act.activity_type} - {new Date(act.created_at).toLocaleDateString()}</span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* MODULE 3: DELIVERABLES -> Deliverables Screen                 */}
        {/* ------------------------------------------------------------- */}
        {activeModule === "deliverables" && (
          <div className="space-y-6">
            
            {/* Screen Header */}
            <div className="flex flex-col gap-1 border-b border-[#2d2d34]/40 pb-3">
              <h2 className="text-lg font-black text-white">Deliverables</h2>
              <p className="text-xs text-[#8e8e95]">Inspect delivery deadlines, task milestones, and sprint deliverables</p>
            </div>

            <div className="bg-[#1c1c1f]/40 border border-[#2d2d34]/60 p-5 rounded-2xl space-y-4">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">Active Project Deliverables</h3>
              
              <div className="space-y-3">
                {loadingTasks ? (
                  <p className="text-xs text-muted-foreground animate-pulse">Loading deliverables...</p>
                ) : filteredTasks.filter(t => t.priority === "HIGH" || t.priority === "URGENT").length === 0 ? (
                  <p className="text-xs text-[#8e8e95] py-6 text-center">No high-priority sprint deliverables scheduled.</p>
                ) : (
                  filteredTasks
                    .filter(t => t.priority === "HIGH" || t.priority === "URGENT")
                    .map((t) => (
                      <div
                        key={t.id}
                        className="p-3.5 bg-[#121214]/60 border border-[#1f1f23] rounded-xl flex flex-col sm:flex-row justify-between sm:items-center gap-3 text-xs"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-white text-sm">{t.title}</span>
                            <span className="font-mono text-[8px] text-[#8e8e95] bg-[#222226] px-1.5 py-0.5 rounded">
                              {t.project_name}
                            </span>
                            <span className="text-[8px] font-bold text-rose-400 bg-rose-500/5 px-1.5 py-0.5 rounded border border-rose-500/10 uppercase">
                              {t.priority}
                            </span>
                          </div>
                          <p className="text-[#8e8e95] text-[10px] leading-relaxed">"{t.description || 'No description detailed.'}"</p>
                        </div>

                        <div className="flex items-center gap-4 shrink-0 justify-between sm:justify-end">
                          {t.due_date && (
                            <span className="text-[9px] text-[#8e8e95] font-mono flex items-center gap-1">
                              <Clock className="h-3 w-3" /> Due: {t.due_date}
                            </span>
                          )}

                          <span className={`text-[8px] font-bold px-1.5 rounded uppercase border ${
                            t.status === "DONE" ? "bg-emerald-500/5 border-emerald-500/20 text-emerald-400" : "bg-indigo-500/5 border-indigo-500/20 text-indigo-400"
                          }`}>{t.status}</span>
                        </div>
                      </div>
                    ))
                )}
              </div>
            </div>

          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* MODULE 4: RELEASES -> Release Notes Screen                     */}
        {/* ------------------------------------------------------------- */}
        {activeModule === "releases" && (
          <div className="space-y-6">
            
            {/* Screen Header */}
            <div className="flex flex-col gap-1 border-b border-[#2d2d34]/40 pb-3">
              <h2 className="text-lg font-black text-white">Release Notes</h2>
              <p className="text-xs text-[#8e8e95]">Version roadmap updates, deploy notes, and version status reports</p>
            </div>

            <div className="space-y-4 max-w-3xl">
              {loadingReleases ? (
                <p className="text-xs text-muted-foreground animate-pulse">Loading roadmap releases...</p>
              ) : filteredReleases.length === 0 ? (
                <p className="text-xs text-[#8e8e95] py-4">No version updates registered.</p>
              ) : (
                filteredReleases.map((rel) => (
                  <div key={rel.id} className="p-5 bg-[#1c1c1f]/40 border border-[#2d2d34]/60 rounded-xl space-y-3 text-xs">
                    <div className="flex justify-between items-center flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-white font-extrabold text-sm font-mono">{rel.version}</span>
                        <span className="text-[9px] text-[#8e8e95] bg-[#222226] px-2 py-0.5 rounded font-mono">
                          Project: {rel.project_name}
                        </span>
                      </div>
                      
                      <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded border ${
                        rel.status === "RELEASED" ? "bg-emerald-500/5 border-emerald-500/20 text-emerald-400" :
                        rel.status === "BETA" ? "bg-indigo-500/5 border-indigo-500/20 text-indigo-400 animate-pulse" :
                        "bg-[#2d2d34] border-transparent text-[#8e8e95]"
                      }`}>{rel.status}</span>
                    </div>

                    <div className="bg-[#121214]/60 border border-[#1f1f23] rounded-lg p-3 space-y-1">
                      <span className="text-[8px] uppercase font-bold text-indigo-400 block font-mono">Release Summary</span>
                      <p className="text-white leading-relaxed whitespace-pre-line text-[11px]">
                        "{rel.notes || "No release documentation completed."}"
                      </p>
                    </div>

                    {rel.release_date && (
                      <span className="text-[9px] text-[#8e8e95] font-mono block">Deploy Date: {rel.release_date}</span>
                    )}
                  </div>
                ))
              )}
            </div>

          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* MODULE 5: APPROVALS                                           */}
        {/* ------------------------------------------------------------- */}
        {activeModule === "approvals" && (
          <div className="space-y-6">
            
            {/* Sub-screens toggle buttons */}
            <div className="flex gap-2 border-b border-[#2d2d34]/30 pb-3">
              <button
                onClick={() => setApprovalsScreen("milestones")}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wide transition ${
                  approvalsScreen === "milestones" ? "bg-zinc-800 text-white border border-[#2d2d34]" : "text-[#8e8e95] hover:text-white"
                }`}
              >
                Milestone Approval Screen
              </button>
              <button
                onClick={() => setApprovalsScreen("comments")}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wide transition ${
                  approvalsScreen === "comments" ? "bg-zinc-800 text-white border border-[#2d2d34]" : "text-[#8e8e95] hover:text-white"
                }`}
              >
                Comments & Feedback
              </button>
            </div>

            {/* SCREEN 6: MILESTONE APPROVAL SCREEN */}
            {approvalsScreen === "milestones" && (
              <div className="space-y-4">
                <div className="flex flex-col gap-0.5">
                  <h2 className="text-base font-extrabold text-white">Milestone Approval</h2>
                  <p className="text-[10px] text-[#8e8e95]">Approve milestone progress deliverables or request revisions</p>
                </div>

                <div className="space-y-3">
                  {loadingApprovals ? (
                    <p className="text-xs text-muted-foreground animate-pulse">Loading sign-off requests...</p>
                  ) : filteredApprovals.length === 0 ? (
                    <p className="text-xs text-[#8e8e95] py-4 text-center">No sign-off approval requests submitted.</p>
                  ) : (
                    filteredApprovals.map((req) => (
                      <div
                        key={req.id}
                        className="p-4 bg-[#1c1c1f]/40 border border-[#2d2d34]/60 rounded-xl text-xs flex flex-col md:flex-row justify-between md:items-center gap-4"
                      >
                        <div className="space-y-1.5 flex-1 pr-4">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-extrabold text-white text-sm">{req.title}</span>
                            <span className="text-[9px] text-[#8e8e95] bg-[#222226] px-1.5 rounded font-mono border border-[#2d2d34]">
                              {req.project_name}
                            </span>
                            <span className={`text-[8px] font-bold px-1.5 rounded border ${
                              req.status === 'APPROVED' ? "bg-emerald-500/5 border-emerald-500/20 text-emerald-400" :
                              req.status === 'REJECTED' ? "bg-rose-500/5 border-rose-500/20 text-rose-400" :
                              req.status === 'NEEDS_CLARIFICATION' ? "bg-amber-500/5 border-amber-500/20 text-amber-400" :
                              "bg-indigo-500/5 border-indigo-500/20 text-indigo-400 animate-pulse"
                            }`}>{req.status.replace('_', ' ')}</span>
                          </div>
                          <p className="text-[#8e8e95] text-[11px] leading-relaxed">"{req.description}"</p>
                          {req.comments && (
                            <p className="text-[10px] text-indigo-400 bg-indigo-500/5 rounded p-2 border border-indigo-500/10 italic">
                              Review Feedback: {req.comments}
                            </p>
                          )}
                        </div>

                        {req.status === "PENDING" && (
                          <div className="flex gap-2 shrink-0">
                            <button
                              onClick={() => handleOpenReviewModal(req.id, "APPROVED")}
                              className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-bold"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => handleOpenReviewModal(req.id, "REJECTED")}
                              className="px-2.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded font-bold"
                            >
                              Reject
                            </button>
                            <button
                              onClick={() => handleOpenReviewModal(req.id, "NEEDS_CLARIFICATION")}
                              className="px-2.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded font-bold"
                            >
                              Clarify
                            </button>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* SCREEN 9: COMMENTS & FEEDBACK SCREEN */}
            {approvalsScreen === "comments" && (
              <div className="space-y-4">
                <div className="flex flex-col gap-0.5">
                  <h2 className="text-base font-extrabold text-white">Comments & Feedback</h2>
                  <p className="text-[10px] text-[#8e8e95]">Submit queries and comments to the project engineering managers</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
                  
                  {/* Chat feed */}
                  <div className="md:col-span-8 bg-[#1c1c1f]/40 border border-[#2d2d34]/60 p-5 rounded-2xl space-y-4">
                    <h3 className="text-xs font-bold text-white uppercase tracking-wider">Project Feedback Thread</h3>
                    
                    <div className="space-y-3.5 max-h-[280px] overflow-y-auto pr-1">
                      {feedbackList.map((f) => (
                        <div key={f.id} className="p-3 bg-[#121214]/60 border border-[#1f1f23] rounded-xl text-xs space-y-1">
                          <div className="flex justify-between text-[#8e8e95] text-[9px] font-mono">
                            <span>User: <strong className="text-white">{f.user}</strong></span>
                            <span>{f.time}</span>
                          </div>
                          <p className="text-white leading-relaxed">"{f.text}"</p>
                        </div>
                      ))}
                    </div>

                    <form onSubmit={handlePostFeedback} className="flex gap-2 border-t border-[#2d2d34]/40 pt-4">
                      <input
                        id="feedback-text-input"
                        name="feedback-text-input"
                        type="text"
                        value={feedbackInput}
                        onChange={(e) => setFeedbackInput(e.target.value)}
                        placeholder="Write comments or queries regarding deliveries..."
                        autoComplete="off"
                        aria-label="Feedback comment"
                        className="flex-1 bg-[#121214] border border-[#1f1f23] rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                        required
                      />
                      <button
                        type="submit"
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5"
                      >
                        <Send className="h-3.5 w-3.5" />
                        <span>Post</span>
                      </button>
                    </form>
                  </div>

                  {/* Help Channel info */}
                  <div className="md:col-span-4 bg-[#1c1c1f]/40 border border-[#2d2d34]/60 p-4 rounded-xl space-y-3">
                    <h3 className="text-xs font-bold text-white uppercase tracking-wider">Escalation Channels</h3>
                    <p className="text-[10px] text-[#8e8e95] leading-relaxed">
                      Questions regarding SLA timings or specific delivery roadmaps should be directed to the engineering manager's office.
                    </p>
                  </div>

                </div>
              </div>
            )}

          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* MODULE 6: INVOICES -> Invoices Screen                         */}
        {/* ------------------------------------------------------------- */}
        {activeModule === "invoices" && (
          <div className="space-y-6">
            
            {/* Screen Header */}
            <div className="flex flex-col gap-1 border-b border-[#2d2d34]/40 pb-3">
              <h2 className="text-lg font-black text-white">Invoices</h2>
              <p className="text-xs text-[#8e8e95]">Review project invoice bills, due deadlines, and billing reports</p>
            </div>

            <div className="bg-[#1c1c1f]/40 border border-[#2d2d34]/60 p-5 rounded-2xl space-y-4">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-indigo-400" />
                <span>Invoice Inbound Ledger</span>
              </h3>

              <div className="space-y-3">
                {invoices.map((inv) => (
                  <div
                    key={inv.id}
                    className="p-4 bg-[#121214]/60 border border-[#1f1f23] rounded-xl flex flex-col sm:flex-row justify-between sm:items-center gap-3 text-xs"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-white text-sm font-mono">{inv.invoice_number}</span>
                        <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded border uppercase ${
                          inv.status === "PAID" ? "bg-emerald-500/5 border-emerald-500/20 text-emerald-400" :
                          "bg-amber-500/5 border-amber-500/20 text-amber-400"
                        }`}>{inv.status}</span>
                      </div>
                      <p className="text-[#8e8e95] text-[11px] leading-relaxed">"{inv.description}"</p>
                    </div>

                    <div className="flex items-center gap-5 shrink-0 justify-between sm:justify-end">
                      <div className="text-right">
                        <span className="font-mono text-base font-black text-white block">{inv.amount}</span>
                        <span className="text-[9px] text-[#8e8e95] block font-mono">Due date: {inv.due_date}</span>
                      </div>

                      <button
                        onClick={() => showToast(`Invoice ${inv.invoice_number} pdf copy requested`, "success")}
                        className="p-2 border border-[#2d2d34]/60 hover:bg-zinc-800 rounded-lg text-indigo-400 transition"
                        title="Download Invoice PDF"
                      >
                        <FileDown className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* MODULE 7: DOCUMENTS -> Documents Screen                       */}
        {/* ------------------------------------------------------------- */}
        {activeModule === "documents" && (
          <div className="space-y-6">
            
            {/* Screen Header */}
            <div className="flex flex-col gap-1 border-b border-[#2d2d34]/40 pb-3">
              <h2 className="text-lg font-black text-white">Documents</h2>
              <p className="text-xs text-[#8e8e95]">Browse uploader assets, blueprint PDFs, and sprint deliverables documentation</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {loadingDocs ? (
                <p className="text-xs text-muted-foreground animate-pulse">Loading documents...</p>
              ) : filteredDocuments.length === 0 ? (
                <div className="col-span-full text-center text-xs text-[#8e8e95] py-12 border border-dashed border-[#2d2d34]/40 rounded-xl">
                  No uploader resource files shared.
                </div>
              ) : (
                filteredDocuments.map((doc) => (
                  <div
                    key={doc.id}
                    className="p-4 bg-[#1c1c1f]/40 border border-[#2d2d34]/60 rounded-xl text-xs flex flex-col justify-between h-36"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <FolderOpen className="h-4.5 w-4.5 text-indigo-400" />
                        <span className="font-extrabold text-white leading-tight truncate max-w-[160px]">{doc.title}</span>
                      </div>
                      <p className="text-[10px] text-[#8e8e95] line-clamp-2">
                        {doc.description || "No description provided."}
                      </p>
                    </div>

                    <div className="flex justify-between items-center border-t border-[#1f1f23] pt-3 text-[9px] text-[#8e8e95] font-mono mt-2">
                      <span>{new Date(doc.created_at).toLocaleDateString()}</span>
                      {doc.file_url && (
                        <a 
                          href={doc.file_url} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="text-indigo-400 font-bold hover:text-indigo-300 flex items-center gap-1"
                        >
                          <FileDown className="h-3.5 w-3.5" /> Download
                        </a>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

          </div>
        )}

        {/* Modal: Review Decision Comments Box */}
        {reviewEntryId && (
          <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex justify-center items-center p-4">
            <div className="bg-[#121214] border border-[#1f1f23] rounded-xl w-full max-w-md shadow-2xl p-6 relative">
              <button
                onClick={() => setReviewEntryId(null)}
                className="absolute top-4 right-4 text-[#8e8e95] hover:text-white transition"
              >
                <X className="h-4 w-4" />
              </button>

              <h2 className="text-lg font-bold text-white mb-4">
                {reviewStatus === "APPROVED" ? "Approve Milestone Request" : 
                 reviewStatus === "REJECTED" ? "Reject Milestone Request" : 
                 "Request Clarification"}
              </h2>

              <form onSubmit={handleReviewSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label htmlFor="review-comments-textarea" className="text-[10px] uppercase font-bold tracking-wider text-[#8e8e95]">
                    Comments / Feedback (Required for Rejection or Clarification)
                  </label>
                  <textarea
                    id="review-comments-textarea"
                    name="review-comments-textarea"
                    value={comments}
                    onChange={(e) => setComments(e.target.value)}
                    placeholder="Provide details about your review decision..."
                    rows={3}
                    autoComplete="off"
                    className="w-full bg-[#1c1c1f] border border-[#2d2d34] rounded-lg p-2.5 text-xs focus:outline-none text-white resize-none leading-relaxed"
                    required={reviewStatus !== "APPROVED"}
                  />
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setReviewEntryId(null)}
                    className="px-4 py-2 border border-[#1f1f23] rounded-lg text-xs font-semibold text-white hover:bg-[#1c1c1f] transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className={`px-4 py-2 rounded-lg text-xs font-bold transition shadow-lg ${
                      reviewStatus === "APPROVED" ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/10" : 
                      reviewStatus === "REJECTED" ? "bg-rose-600 hover:bg-rose-700 text-white shadow-rose-600/10" : 
                      "bg-amber-600 hover:bg-amber-700 text-white shadow-amber-600/10"
                    }`}
                  >
                    Submit Decision
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
