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
  Briefcase
} from "lucide-react";

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

export default function ClientPortalPage() {
  const queryClient = useQueryClient();
  const { activeOrganizationId, user: currentUser } = useAuthStore();

  const [activeSubTab, setActiveSubTab] = useState<"tasks" | "releases" | "approvals" | "timeline" | "documents">("tasks");
  const [selectedProjectId, setSelectedProjectId] = useState<string>("all");
  const [reviewEntryId, setReviewEntryId] = useState<string | null>(null);
  const [reviewStatus, setReviewStatus] = useState<"APPROVED" | "REJECTED" | "NEEDS_CLARIFICATION">("APPROVED");
  const [comments, setComments] = useState("");
  const [showNotifications, setShowNotifications] = useState(false);

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
      return res.data || [];
    }
  });

  const { data: tasks = [], isLoading: loadingTasks } = useQuery<TaskItem[]>({
    queryKey: ["client-tasks", activeOrganizationId],
    queryFn: async () => {
      const res = await apiClient.get("/api/v1/client/tasks/");
      return res.data || [];
    }
  });

  const { data: releases = [], isLoading: loadingReleases } = useQuery<ReleaseItem[]>({
    queryKey: ["client-releases", activeOrganizationId],
    queryFn: async () => {
      const res = await apiClient.get("/api/v1/client/releases/");
      return res.data || [];
    }
  });

  const { data: approvals = [], isLoading: loadingApprovals } = useQuery<ApprovalRequestItem[]>({
    queryKey: ["client-approvals", activeOrganizationId],
    queryFn: async () => {
      const res = await apiClient.get("/api/v1/client/approvals/");
      return res.data || [];
    }
  });

  const { data: documents = [], isLoading: loadingDocs } = useQuery<ClientDocumentItem[]>({
    queryKey: ["client-documents", activeOrganizationId],
    queryFn: async () => {
      const res = await apiClient.get("/api/v1/client/documents/");
      return res.data || [];
    }
  });

  const { data: activities = [], isLoading: loadingActivities } = useQuery<ProjectActivityItem[]>({
    queryKey: ["client-activities", activeOrganizationId],
    queryFn: async () => {
      const res = await apiClient.get("/api/v1/client/activities/");
      return res.data || [];
    }
  });

  const { data: notifications = [] } = useQuery<NotificationItem[]>({
    queryKey: ["client-notifications", activeOrganizationId],
    queryFn: async () => {
      const res = await apiClient.get("/api/v1/client/notifications/");
      return res.data || [];
    }
  });

  const { data: report } = useQuery<ReportMetrics>({
    queryKey: ["client-reports", activeOrganizationId],
    queryFn: async () => {
      const res = await apiClient.get("/api/v1/client/reports/");
      return res.data;
    }
  });

  // Mutation: Submit Review Action (Approve/Reject/Clarify)
  const submitReviewMutation = useMutation({
    mutationFn: async (payload: { id: string; status: "APPROVED" | "REJECTED" | "NEEDS_CLARIFICATION"; comments: string }) => {
      const res = await apiClient.patch(`/api/v1/client/approvals/${payload.id}/`, {
        status: payload.status,
        comments: payload.comments
      });
      return res.data;
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
      <main className="space-y-6 pb-12 text-foreground bg-[#0a0a0c]">
        {/* Toast alerts */}
        {toast && (
          <div className={`fixed bottom-5 right-5 z-50 p-4 rounded-xl border shadow-2xl flex items-center gap-2 text-xs font-bold bg-[#121214] text-white print:hidden ${
            toast.type === "success" ? "border-emerald-500/40 text-emerald-400" : "border-rose-500/40 text-rose-400"
          }`}>
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{toast.message}</span>
          </div>
        )}

        {/* Dashboard Header */}
        <header className="border-b border-[#1f1f23] pb-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 relative">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight flex items-center gap-3 text-white">
              <Inbox className="h-7 w-7 text-indigo-500" />
              Secure Client Portal
            </h1>
            <p className="text-[#8e8e95] text-xs mt-1">
              Real-time version roadmap, approval sign-off, shared client resources, and project reports.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Notification Center */}
            <div className="relative">
              <button 
                onClick={() => setShowNotifications(!showNotifications)}
                className="p-2 bg-[#121214] border border-[#1f1f23] text-gray-400 hover:text-white rounded-xl relative transition"
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
                className="flex items-center gap-1.5 px-3 py-2 bg-[#121214] border border-[#1f1f23] text-gray-300 hover:text-white text-xs font-semibold rounded-xl transition"
              >
                <FileDown className="h-3.5 w-3.5" /> PDF
              </button>
              <button 
                onClick={() => handleDownload("excel")}
                className="flex items-center gap-1.5 px-3 py-2 bg-[#121214] border border-[#1f1f23] text-gray-300 hover:text-white text-xs font-semibold rounded-xl transition"
              >
                <FileDown className="h-3.5 w-3.5" /> Excel
              </button>
            </div>
          </div>
        </header>

        {/* Project Selector Filter */}
        <div className="flex items-center gap-2 text-xs">
          <Briefcase className="h-4 w-4 text-indigo-500" />
          <span className="text-[#8e8e95] font-semibold">Active Project Context:</span>
          <select 
            value={selectedProjectId}
            onChange={(e) => setSelectedProjectId(e.target.value)}
            className="bg-[#121214] border border-[#1f1f23] text-white text-xs font-bold rounded-lg px-2.5 py-1.5 focus:outline-none cursor-pointer"
          >
            <option value="all">All Accessible Projects</option>
            {projects.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>

        {/* Aggregate report gauges */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-[#121214] border border-[#1f1f23] rounded-xl p-4 shadow-sm">
            <span className="text-[10px] uppercase font-bold text-[#8e8e95] tracking-wider">Project Progress Rate</span>
            <div className="flex items-baseline gap-1.5 mt-2">
              <span className="text-2xl font-black text-white">{report?.progress_rate || 100}%</span>
              <span className="text-xs text-indigo-400 font-semibold">completion</span>
            </div>
          </div>

          <div className="bg-[#121214] border border-[#1f1f23] rounded-xl p-4 shadow-sm">
            <span className="text-[10px] uppercase font-bold text-[#8e8e95] tracking-wider">Completed Tasks</span>
            <div className="flex items-baseline gap-1.5 mt-2">
              <span className="text-2xl font-black text-emerald-400">{report?.completed_tasks || 0}</span>
              <span className="text-xs text-[#8e8e95]">tasks</span>
            </div>
          </div>

          <div className="bg-[#121214] border border-[#1f1f23] rounded-xl p-4 shadow-sm">
            <span className="text-[10px] uppercase font-bold text-[#8e8e95] tracking-wider">Active Risks</span>
            <div className="flex items-baseline gap-1.5 mt-2">
              <span className="text-2xl font-black text-amber-500">{report?.risks?.length || 0}</span>
              <span className="text-xs text-amber-500 font-semibold">identified</span>
            </div>
          </div>

          <div className="bg-[#121214] border border-[#1f1f23] rounded-xl p-4 shadow-sm">
            <span className="text-[10px] uppercase font-bold text-[#8e8e95] tracking-wider">Pending Approvals</span>
            <div className="flex items-baseline gap-1.5 mt-2">
              <span className={`text-2xl font-black ${report?.pending_approvals && report.pending_approvals > 0 ? "text-indigo-400 animate-pulse" : "text-[#8e8e95]"}`}>
                {report?.pending_approvals || 0}
              </span>
              <span className="text-xs text-[#8e8e95]">requests</span>
            </div>
          </div>
        </section>

        {/* Section Navigation Tabs */}
        <div className="flex items-center gap-1.5 border-b border-[#1f1f23] pb-px">
          <button
            onClick={() => setActiveSubTab("tasks")}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 transition focus:outline-none ${
              activeSubTab === "tasks" ? "border-indigo-500 text-white" : "border-transparent text-[#8e8e95] hover:text-white"
            }`}
          >
            Tasks Board
          </button>
          <button
            onClick={() => setActiveSubTab("releases")}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 transition focus:outline-none ${
              activeSubTab === "releases" ? "border-indigo-500 text-white" : "border-transparent text-[#8e8e95] hover:text-white"
            }`}
          >
            Release Roadmap
          </button>
          <button
            onClick={() => setActiveSubTab("approvals")}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 transition focus:outline-none ${
              activeSubTab === "approvals" ? "border-indigo-500 text-white" : "border-transparent text-[#8e8e95] hover:text-white"
            }`}
          >
            Milestone Approvals ({approvals.filter(a => a.status === 'PENDING').length})
          </button>
          <button
            onClick={() => setActiveSubTab("timeline")}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 transition focus:outline-none ${
              activeSubTab === "timeline" ? "border-indigo-500 text-white" : "border-transparent text-[#8e8e95] hover:text-white"
            }`}
          >
            Project Activity Timeline
          </button>
          <button
            onClick={() => setActiveSubTab("documents")}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 transition focus:outline-none ${
              activeSubTab === "documents" ? "border-indigo-500 text-white" : "border-transparent text-[#8e8e95] hover:text-white"
            }`}
          >
            Client Documents
          </button>
        </div>

        {/* Dynamic Display Panel */}
        <section className="bg-[#121214] border border-[#1f1f23] rounded-xl p-5 shadow-sm min-h-[350px]">
          
          {/* TAB 1: Tasks Board */}
          {activeSubTab === "tasks" && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Column A: Pending Tasks */}
                <div className="space-y-3">
                  <div className="flex justify-between items-center pb-2 border-b border-[#1f1f23]">
                    <span className="text-xs font-bold text-white uppercase tracking-wider">Active Pending Tasks</span>
                    <span className="font-mono text-[10px] text-amber-500 bg-amber-500/5 px-2 rounded border border-amber-500/10">
                      {filteredTasks.filter(t => t.status !== 'DONE').length}
                    </span>
                  </div>

                  <div className="space-y-2 max-h-[350px] overflow-y-auto pr-1">
                    {loadingTasks ? (
                      <div className="space-y-2 animate-pulse-skeleton w-full">
                        <div className="h-14 bg-white/5 rounded-lg border border-white/5" />
                        <div className="h-14 bg-white/5 rounded-lg border border-white/5" />
                      </div>
                    ) : filteredTasks.filter(t => t.status !== 'DONE').length === 0 ? (
                      <p className="text-[10px] text-[#8e8e95] py-4">No active pending tasks logged.</p>
                    ) : (
                      filteredTasks.filter(t => t.status !== 'DONE').map(task => (
                        <div key={task.id} className="p-3 bg-[#1c1c1f]/40 border border-[#2d2d34]/60 rounded-lg text-xs space-y-1">
                          <div className="flex justify-between items-start gap-3">
                            <div>
                              <span className="font-bold text-white">{task.title}</span>
                              <span className="block text-[9px] text-[#8e8e95] font-mono mt-0.5">Project: {task.project_name}</span>
                            </div>
                            <span className={`text-[8px] font-bold px-1.5 rounded border ${
                              task.priority === 'HIGH' || task.priority === 'URGENT' ? "bg-rose-500/5 border-rose-500/20 text-rose-400" :
                              "bg-[#2d2d34] border-transparent text-[#8e8e95]"
                            }`}>{task.priority}</span>
                          </div>
                          {task.description && <p className="text-[#8e8e95] text-[10px] leading-relaxed line-clamp-2">"{task.description}"</p>}
                          {task.due_date && (
                            <div className="text-[9px] text-[#8e8e95] flex items-center gap-1 mt-1 font-mono">
                              <Clock className="h-3 w-3" /> Due date: {task.due_date}
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Column B: Completed Tasks */}
                <div className="space-y-3">
                  <div className="flex justify-between items-center pb-2 border-b border-[#1f1f23]">
                    <span className="text-xs font-bold text-white uppercase tracking-wider">Completed Tasks</span>
                    <span className="font-mono text-[10px] text-emerald-400 bg-emerald-500/5 px-2 rounded border border-emerald-500/10">
                      {filteredTasks.filter(t => t.status === 'DONE').length}
                    </span>
                  </div>

                  <div className="space-y-2 max-h-[350px] overflow-y-auto pr-1">
                    {loadingTasks ? (
                      <div className="space-y-2 animate-pulse-skeleton w-full">
                        <div className="h-14 bg-white/5 rounded-lg border border-white/5" />
                        <div className="h-14 bg-white/5 rounded-lg border border-white/5" />
                      </div>
                    ) : filteredTasks.filter(t => t.status === 'DONE').length === 0 ? (
                      <p className="text-[10px] text-[#8e8e95] py-4">No completed tasks available.</p>
                    ) : (
                      filteredTasks.filter(t => t.status === 'DONE').map(task => (
                        <div key={task.id} className="p-3 bg-[#1c1c1f]/20 border border-[#2d2d34]/40 rounded-lg text-xs space-y-1">
                          <div className="flex justify-between items-start gap-3">
                            <div>
                              <span className="font-bold text-white line-through decoration-[#52525b]">{task.title}</span>
                              <span className="block text-[9px] text-[#8e8e95] font-mono mt-0.5">Project: {task.project_name}</span>
                            </div>
                            <span className="text-[8px] font-bold px-1.5 rounded border bg-emerald-500/5 border-emerald-500/20 text-emerald-400 flex items-center gap-0.5">
                              <Check className="h-2 w-2" /> Done
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: Releases Roadmap */}
          {activeSubTab === "releases" && (
            <div className="space-y-4">
              <span className="text-xs font-bold text-white uppercase tracking-wider block">Upcoming Roadmap Releases</span>
              <div className="space-y-4 max-w-2xl">
                {loadingReleases ? (
                  <div className="space-y-3 animate-pulse-skeleton max-w-2xl">
                    <div className="h-20 bg-white/5 rounded-xl border border-white/5" />
                    <div className="h-20 bg-white/5 rounded-xl border border-white/5" />
                  </div>
                ) : filteredReleases.length === 0 ? (
                  <p className="text-xs text-[#8e8e95] py-4">No release milestones available.</p>
                ) : (
                  filteredReleases.map(rel => (
                    <div key={rel.id} className="p-4 bg-[#1c1c1f]/40 border border-[#2d2d34]/60 rounded-xl text-xs space-y-2 relative">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="text-white font-black text-sm font-mono">{rel.version}</span>
                          <span className="font-mono text-[10px] text-[#8e8e95] bg-[#222226] px-2 py-0.5 rounded">
                            Project: {rel.project_name}
                          </span>
                        </div>
                        <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider border ${
                          rel.status === 'RELEASED' ? "bg-emerald-500/5 border-emerald-500/20 text-emerald-400" :
                          rel.status === 'BETA' ? "bg-indigo-500/5 border-indigo-500/20 text-indigo-400 animate-pulse" :
                          "bg-[#2d2d34] border-transparent text-[#8e8e95]"
                        }`}>
                          {rel.status}
                        </span>
                      </div>
                      {rel.notes && <p className="text-[#8e8e95] text-[11px] leading-relaxed whitespace-pre-line bg-[#101012] border border-[#1f1f23] rounded-lg p-3">"{rel.notes}"</p>}
                      {rel.release_date && <div className="text-[9px] text-[#8e8e95] font-mono">Target: {rel.release_date}</div>}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* TAB 3: Milestone Approvals */}
          {activeSubTab === "approvals" && (
            <div className="space-y-4">
              <span className="text-xs font-bold text-white uppercase tracking-wider block">Milestone approvals and feedback requests</span>
              <div className="space-y-3">
                {loadingApprovals ? (
                  <div className="space-y-3 animate-pulse-skeleton">
                    <div className="h-20 bg-white/5 rounded-xl border border-white/5" />
                    <div className="h-20 bg-white/5 rounded-xl border border-white/5" />
                  </div>
                ) : filteredApprovals.length === 0 ? (
                  <p className="text-xs text-[#8e8e95] py-4">No sign-off approval requests submitted.</p>
                ) : (
                  filteredApprovals.map(req => (
                    <div key={req.id} className="p-4 bg-[#1c1c1f]/40 border border-[#2d2d34]/60 rounded-xl text-xs flex flex-col md:flex-row justify-between md:items-center gap-4 relative">
                      <div className="space-y-1.5 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-bold text-white text-sm">{req.title}</span>
                          <span className="font-mono text-[9px] text-[#8e8e95] bg-[#222226] px-2 rounded border border-[#2d2d34]">
                            Project: {req.project_name}
                          </span>
                          <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider border ${
                            req.status === 'APPROVED' ? "bg-emerald-500/5 border-emerald-500/20 text-emerald-400" :
                            req.status === 'REJECTED' ? "bg-rose-500/5 border-rose-500/20 text-rose-400" :
                            req.status === 'NEEDS_CLARIFICATION' ? "bg-amber-500/5 border-amber-500/20 text-amber-400" :
                            "bg-indigo-500/5 border-indigo-500/20 text-indigo-400 animate-pulse"
                          }`}>
                            {req.status.replace('_', ' ')}
                          </span>
                        </div>
                        <p className="text-[#8e8e95] text-[11px] leading-relaxed">"{req.description}"</p>
                        <div className="flex items-center gap-1 text-[9px] text-[#8e8e95] font-mono">
                          <span>Requested by: <strong className="text-white">{req.requested_by_email}</strong></span>
                        </div>
                        {req.comments && (
                          <p className="text-[10px] text-indigo-400 bg-indigo-500/5 rounded p-2 italic border border-indigo-500/10">
                            <strong>Review Comments:</strong> {req.comments}
                          </p>
                        )}
                      </div>

                      {req.status === 'PENDING' && (
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            onClick={() => handleOpenReviewModal(req.id, "APPROVED")}
                            className="p-1.5 border border-emerald-500/20 bg-emerald-500/5 text-emerald-400 rounded-lg hover:bg-emerald-500/10 transition"
                            title="Approve"
                          >
                            <Check className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleOpenReviewModal(req.id, "REJECTED")}
                            className="p-1.5 border border-rose-500/20 bg-rose-500/5 text-rose-400 rounded-lg hover:bg-rose-500/10 transition"
                            title="Reject"
                          >
                            <X className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleOpenReviewModal(req.id, "NEEDS_CLARIFICATION")}
                            className="p-1.5 border border-amber-500/20 bg-amber-500/5 text-amber-400 rounded-lg hover:bg-amber-500/10 transition"
                            title="Request Clarification"
                          >
                            <HelpCircle className="h-4 w-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* TAB 4: Project Activity Timeline */}
          {activeSubTab === "timeline" && (
            <div className="space-y-4">
              <span className="text-xs font-bold text-white uppercase tracking-wider block">Project Activity Timeline</span>
              <div className="relative border-l border-[#1f1f23] ml-3 pl-6 space-y-6">
                {loadingActivities ? (
                  <div className="space-y-4 animate-pulse-skeleton pl-2">
                    <div className="h-12 bg-white/5 rounded w-3/4" />
                    <div className="h-12 bg-white/5 rounded w-1/2" />
                  </div>
                ) : filteredActivities.length === 0 ? (
                  <p className="text-xs text-[#8e8e95] py-2">No activity logs recorded.</p>
                ) : (
                  filteredActivities.map(act => (
                    <div key={act.id} className="relative">
                      {/* Timeline dot */}
                      <span className="absolute -left-[31px] top-1 bg-indigo-500 border border-[#0a0a0c] h-3.5 w-3.5 rounded-full flex items-center justify-center">
                        <Activity className="h-2 w-2 text-white" />
                      </span>
                      
                      <div className="text-xs space-y-1">
                        <div className="flex flex-wrap items-baseline gap-2">
                          <span className="font-bold text-white">{act.title}</span>
                          <span className="text-[9px] text-[#8e8e95] bg-[#222226] px-1.5 py-0.5 rounded font-mono">
                            {act.activity_type}
                          </span>
                          <span className="text-[9px] text-[#8e8e95] font-mono">
                            {new Date(act.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        {act.description && <p className="text-[#8e8e95] text-[10px] max-w-xl">"{act.description}"</p>}
                        {act.created_by_email && (
                          <span className="text-[9px] text-[#8e8e95] block font-mono">Triggered by: {act.created_by_email}</span>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* TAB 5: Client Documents */}
          {activeSubTab === "documents" && (
            <div className="space-y-4">
              <span className="text-xs font-bold text-white uppercase tracking-wider block">Shared Documents & Resource Files</span>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {loadingDocs ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 animate-pulse-skeleton">
                    <div className="h-24 bg-white/5 rounded-xl border border-white/5" />
                    <div className="h-24 bg-white/5 rounded-xl border border-white/5" />
                  </div>
                ) : filteredDocuments.length === 0 ? (
                  <p className="text-xs text-[#8e8e95] py-2">No documents shared yet.</p>
                ) : (
                  filteredDocuments.map(doc => (
                    <div key={doc.id} className="p-4 bg-[#1c1c1f]/40 border border-[#2d2d34]/60 rounded-xl text-xs space-y-3 flex flex-col justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <FolderOpen className="h-4.5 w-4.5 text-indigo-400" />
                          <span className="font-bold text-white leading-tight">{doc.title}</span>
                        </div>
                        {doc.description && <p className="text-[#8e8e95] text-[10px] leading-relaxed">"{doc.description}"</p>}
                      </div>
                      
                      <div className="border-t border-[#1f1f23] pt-3 flex justify-between items-center text-[9px] text-[#8e8e95] font-mono">
                        <span>Uploaded: {new Date(doc.created_at).toLocaleDateString()}</span>
                        {doc.file_url && (
                          <a 
                            href={doc.file_url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-indigo-400 hover:text-indigo-300 font-bold flex items-center gap-1"
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

        </section>

        {/* Modal: Review Sign-off Decision */}
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
                  <label className="text-[10px] uppercase font-bold tracking-wider text-[#8e8e95]">
                    Comments / Feedback (Required for Rejection or Clarification)
                  </label>
                  <textarea
                    value={comments}
                    onChange={(e) => setComments(e.target.value)}
                    placeholder="Enter review comments or reasons for decision..."
                    rows={3}
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
      </main>
    </ProtectedRoute>
  );
}
