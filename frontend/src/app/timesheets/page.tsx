"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { apiClient } from "@/infrastructure/api/api-client";
import { ProtectedRoute } from "@/features/rbac/components/ProtectedRoute";
import { useAuthStore } from "@/infrastructure/store/auth-store";
import { 
  Calendar, 
  Clock, 
  Download, 
  FileText, 
  Plus, 
  Check, 
  X, 
  AlertCircle, 
  CheckCircle,
  TrendingUp,
  Printer,
  ChevronRight,
  Filter,
  CheckSquare,
  Lock,
  Building,
  User,
  MessageSquare
} from "lucide-react";

interface TaskItem {
  id: string;
  title: string;
  status: string;
}

interface ProjectItem {
  id: string;
  name: string;
  description: string;
  is_active: boolean;
}

interface TimesheetItem {
  id: string;
  user: string;
  user_email: string;
  project: string | null;
  project_name: string | null;
  task: string | null;
  task_title: string | null;
  date: string;
  hours_logged: string;
  description: string;
  is_billable: boolean;
  status: 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED';
  rejection_comments: string | null;
  approved_by_email: string | null;
  approved_at: string | null;
  submitted_at: string | null;
}

interface TimesheetSummary {
  total_hours: number;
  billable_hours: number;
  utilization_rate: number;
  productivity_score: number;
  by_date: Array<{ date: string; hours: number }>;
  by_project: Array<{ project: string; hours: number }>;
  by_task: Array<{ task: string; planned_hours: number; actual_hours: number; logged_here: number; status: string }>;
  team_summary: Array<{ email: string; name: string; hours: number }>;
}

interface LogTimeInput {
  project: string;
  task: string;
  date: string;
  hours_logged: number;
  is_billable: boolean;
  description: string;
}

export default function TimesheetsPage() {
  const queryClient = useQueryClient();
  const { activeOrganizationId, user: currentUser } = useAuthStore();

  const [activeTab, setActiveTab] = useState<"my-timesheets" | "approvals">("my-timesheets");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [rejectEntryId, setRejectEntryId] = useState<string | null>(null);
  const [rejectionComments, setRejectionComments] = useState("");

  // Filter state
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 14); // Default to last 14 days
    return d.toISOString().split("T")[0];
  });
  const [endDate, setEndDate] = useState(new Date().toISOString().split("T")[0]);

  // Toast notifications
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // React Hook Form for logging time
  const { register, handleSubmit, reset, watch, setValue } = useForm<LogTimeInput>({
    defaultValues: {
      project: "",
      task: "",
      date: new Date().toISOString().split("T")[0],
      hours_logged: 8,
      is_billable: true,
      description: ""
    }
  });

  // React Hook Form for Project creation
  const projectForm = useForm<{ name: string; description: string }>({
    defaultValues: { name: "", description: "" }
  });

  // Queries
  const { data: timesheets = [], isLoading } = useQuery<TimesheetItem[]>({
    queryKey: ["timesheet-entries", activeTab, activeOrganizationId],
    queryFn: async () => {
      const allParam = activeTab === "approvals" ? "?all=true" : "";
      const res = await apiClient.get(`/api/v1/timesheets/${allParam}`);
      return res.data.data || [];
    }
  });

  const { data: summary } = useQuery<TimesheetSummary>({
    queryKey: ["timesheet-summary", startDate, endDate, activeTab, activeOrganizationId],
    queryFn: async () => {
      const teamParam = activeTab === "approvals" ? "&team=true" : "";
      const res = await apiClient.get(`/api/v1/timesheets/summary/?start_date=${startDate}&end_date=${endDate}${teamParam}`);
      return res.data;
    }
  });

  const { data: projects = [] } = useQuery<ProjectItem[]>({
    queryKey: ["timesheet-projects", activeOrganizationId],
    queryFn: async () => {
      const res = await apiClient.get("/api/v1/timesheets/projects/");
      return res.data.data || [];
    }
  });

  const { data: tasks = [] } = useQuery<TaskItem[]>({
    queryKey: ["planner-all-tasks", activeOrganizationId],
    queryFn: async () => {
      const res = await apiClient.get("/api/v1/planner/tasks/");
      return res.data.data || [];
    }
  });

  // Mutations
  const createProjectMutation = useMutation({
    mutationFn: async (payload: { name: string; description: string }) => {
      const res = await apiClient.post("/api/v1/timesheets/projects/", payload);
      return res.data.data;
    },
    onSuccess: () => {
      showToast("Project created successfully", "success");
      setIsProjectModalOpen(false);
      projectForm.reset();
      queryClient.invalidateQueries({ queryKey: ["timesheet-projects"] });
    },
    onError: () => {
      showToast("Failed to create project", "error");
    }
  });

  const logTimeMutation = useMutation({
    mutationFn: async (payload: LogTimeInput) => {
      const formatPayload = {
        ...payload,
        project: payload.project || null,
        task: payload.task || null,
        hours_logged: Number(payload.hours_logged)
      };
      const res = await apiClient.post("/api/v1/timesheets/", formatPayload);
      return res.data.data;
    },
    onSuccess: () => {
      showToast("Timesheet logged as Draft", "success");
      setIsModalOpen(false);
      reset();
      queryClient.invalidateQueries({ queryKey: ["timesheet-entries"] });
      queryClient.invalidateQueries({ queryKey: ["timesheet-summary"] });
    },
    onError: (err: any) => {
      const errMsg = err?.response?.data?.errors?.[0]?.message || "Failed to log time";
      showToast(errMsg, "error");
    }
  });

  const submitTimesheetMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiClient.post(`/api/v1/timesheets/${id}/submit/`);
      return res.data.data;
    },
    onSuccess: () => {
      showToast("Timesheet submitted for review", "success");
      queryClient.invalidateQueries({ queryKey: ["timesheet-entries"] });
      queryClient.invalidateQueries({ queryKey: ["timesheet-summary"] });
    }
  });

  const approveTimesheetMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiClient.post(`/api/v1/timesheets/${id}/approve/`);
      return res.data.data;
    },
    onSuccess: () => {
      showToast("Timesheet entry approved", "success");
      queryClient.invalidateQueries({ queryKey: ["timesheet-entries"] });
      queryClient.invalidateQueries({ queryKey: ["timesheet-summary"] });
    },
    onError: () => {
      showToast("Failed to approve timesheet", "error");
    }
  });

  const rejectTimesheetMutation = useMutation({
    mutationFn: async (payload: { id: string; comments: string }) => {
      const res = await apiClient.post(`/api/v1/timesheets/${payload.id}/reject/`, {
        status: "REJECTED",
        rejection_comments: payload.comments
      });
      return res.data.data;
    },
    onSuccess: () => {
      showToast("Timesheet entry rejected", "success");
      setRejectEntryId(null);
      setRejectionComments("");
      queryClient.invalidateQueries({ queryKey: ["timesheet-entries"] });
      queryClient.invalidateQueries({ queryKey: ["timesheet-summary"] });
    },
    onError: () => {
      showToast("Failed to reject timesheet", "error");
    }
  });

  const deleteTimeMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/api/v1/timesheets/${id}/`);
    },
    onSuccess: () => {
      showToast("Timesheet entry deleted", "success");
      queryClient.invalidateQueries({ queryKey: ["timesheet-entries"] });
      queryClient.invalidateQueries({ queryKey: ["timesheet-summary"] });
    }
  });

  const handleExportCSV = () => {
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Date,User,Project,Task,Hours,Billable,Status,Description\n";
    timesheets.forEach(entry => {
      csvContent += `"${entry.date}","${entry.user_email}","${entry.project_name || "N/A"}","${entry.task_title || "N/A"}",${entry.hours_logged},${entry.is_billable ? 'Yes' : 'No'},"${entry.status}","${entry.description || ''}"\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `timesheet_report_${activeTab}_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast("CSV exported successfully", "success");
  };

  const isUserProjectManager = currentUser?.is_superuser || false; // Or resolved dynamically from user context memberships

  return (
    <ProtectedRoute>
      <main className="space-y-6 pb-12 print:p-0 print:space-y-4 text-foreground bg-[#0a0a0c]">
        {/* Toast Toast alerts */}
        {toast && (
          <div className={`fixed bottom-5 right-5 z-50 p-4 rounded-xl border shadow-2xl flex items-center gap-2 text-xs font-bold bg-[#121214] text-white print:hidden ${
            toast.type === "success" ? "border-emerald-500/40 text-emerald-400" : "border-rose-500/40 text-rose-400"
          }`}>
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{toast.message}</span>
          </div>
        )}

        {/* Dashboard Header */}
        <header className="border-b border-[#1f1f23] pb-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 print:border-b-0 print:pb-0">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight flex items-center gap-3 text-white">
              <Clock className="h-7 w-7 text-indigo-500" />
              Timesheet Workspace
            </h1>
            <p className="text-[#8e8e95] text-xs mt-1 print:hidden">
              Enterprise log reporting, billing tracking, and workforce utilization indicators.
            </p>
          </div>

          <div className="flex items-center gap-2.5 self-end sm:self-auto print:hidden">
            <button
              onClick={() => window.print()}
              className="flex items-center gap-1.5 border border-[#1f1f23] text-xs font-semibold px-3.5 py-2 rounded-lg bg-[#121214] hover:bg-[#1c1c1f] text-white transition focus:outline-none"
            >
              <Printer className="h-3.5 w-3.5 text-[#8e8e95]" />
              <span>Print View</span>
            </button>

            <button
              onClick={handleExportCSV}
              className="flex items-center gap-1.5 border border-[#1f1f23] text-xs font-semibold px-3.5 py-2 rounded-lg bg-[#121214] hover:bg-[#1c1c1f] text-white transition focus:outline-none"
            >
              <Download className="h-3.5 w-3.5 text-[#8e8e95]" />
              <span>Export CSV</span>
            </button>

            <button
              onClick={() => setIsProjectModalOpen(true)}
              className="flex items-center gap-1.5 border border-indigo-500/20 text-xs font-semibold px-3.5 py-2 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 transition focus:outline-none"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>New Project</span>
            </button>

            <button
              onClick={() => setIsModalOpen(true)}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition shadow-lg shadow-indigo-600/10"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Log Hours</span>
            </button>
          </div>
        </header>

        {/* Tab Gating */}
        <div className="flex items-center gap-1.5 border-b border-[#1f1f23] pb-px print:hidden">
          <button
            onClick={() => setActiveTab("my-timesheets")}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 transition focus:outline-none ${
              activeTab === "my-timesheets" 
                ? "border-indigo-500 text-white" 
                : "border-transparent text-[#8e8e95] hover:text-white"
            }`}
          >
            My Timesheets
          </button>
          <button
            onClick={() => setActiveTab("approvals")}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 transition focus:outline-none ${
              activeTab === "approvals" 
                ? "border-indigo-500 text-white" 
                : "border-transparent text-[#8e8e95] hover:text-white"
            }`}
          >
            Approval Pending Board
          </button>
        </div>

        {/* Dynamic Metric Widgets */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-4 print:grid-cols-4">
          <div className="bg-[#121214] border border-[#1f1f23] rounded-xl p-4 shadow-sm flex flex-col justify-between">
            <span className="text-[10px] uppercase font-bold text-[#8e8e95] tracking-wider">Total Logged</span>
            <div className="flex items-baseline gap-1.5 mt-2">
              <span className="text-2xl font-black text-white">{summary?.total_hours || 0}</span>
              <span className="text-xs text-[#8e8e95]">hours</span>
            </div>
          </div>

          <div className="bg-[#121214] border border-[#1f1f23] rounded-xl p-4 shadow-sm flex flex-col justify-between">
            <span className="text-[10px] uppercase font-bold text-[#8e8e95] tracking-wider">Billable Hours</span>
            <div className="flex items-baseline gap-1.5 mt-2">
              <span className="text-2xl font-black text-emerald-400">{summary?.billable_hours || 0}</span>
              <span className="text-xs text-[#8e8e95]">hours</span>
            </div>
          </div>

          <div className="bg-[#121214] border border-[#1f1f23] rounded-xl p-4 shadow-sm flex flex-col justify-between">
            <span className="text-[10px] uppercase font-bold text-[#8e8e95] tracking-wider">Utilization Rate</span>
            <div className="flex items-baseline gap-1.5 mt-2">
              <span className="text-2xl font-black text-indigo-400">{summary?.utilization_rate || 0}%</span>
              <span className="text-xs text-[#8e8e95]">billable</span>
            </div>
          </div>

          <div className="bg-[#121214] border border-[#1f1f23] rounded-xl p-4 shadow-sm flex flex-col justify-between">
            <span className="text-[10px] uppercase font-bold text-[#8e8e95] tracking-wider">Productivity Score</span>
            <div className="flex items-baseline gap-1.5 mt-2">
              <span className="text-2xl font-black text-amber-400">{summary?.productivity_score || 100}%</span>
              <span className="text-xs text-[#8e8e95]">ratio</span>
            </div>
          </div>
        </section>

        {/* Date Filters Range Panel */}
        <section className="bg-[#121214] border border-[#1f1f23] rounded-xl p-4 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4 print:hidden">
          <div className="flex items-center gap-2">
            <Filter className="h-3.5 w-3.5 text-indigo-400" />
            <span className="text-xs font-bold text-[#8e8e95] uppercase tracking-wider">Date Filters:</span>
            <div className="flex items-center gap-2 bg-[#1c1c1f] border border-[#2d2d34] rounded-lg px-3 py-1 text-xs">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-transparent border-0 text-[11px] font-bold focus:outline-none text-white"
              />
              <span className="text-[#8e8e95]">to</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-transparent border-0 text-[11px] font-bold focus:outline-none text-white"
              />
            </div>
          </div>

          <div className="text-right text-xs text-[#8e8e95]">
            Showing statistics from <span className="text-white font-semibold">{startDate}</span> to <span className="text-white font-semibold">{endDate}</span>
          </div>
        </section>

        {/* Main Work Area */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start print:grid-cols-1">
          {/* Lists / Approvals */}
          <section className="lg:col-span-8 bg-[#121214] border border-[#1f1f23] rounded-xl p-5 shadow-sm space-y-4 print:border-0 print:p-0">
            <div>
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                {activeTab === "my-timesheets" ? "My Time Logs" : "Submitted Manager Approvals"}
              </h2>
              <p className="text-[10px] text-[#8e8e95] mt-0.5">
                {activeTab === "my-timesheets" 
                  ? "Logged hours drafts and submission workflow" 
                  : "Pending approvals queue tracking"}
              </p>
            </div>

            <div className="space-y-3 overflow-y-auto max-h-[500px] pr-1 print:max-h-none">
              {isLoading ? (
                <div className="p-12 text-center text-xs animate-pulse text-[#8e8e95]">Loading database entries...</div>
              ) : timesheets.length === 0 ? (
                <div className="p-12 text-center text-xs text-[#8e8e95] border border-dashed border-[#1f1f23] rounded-lg">
                  No records matching active status scope.
                </div>
              ) : (
                timesheets.map((entry) => (
                  <div key={entry.id} className="p-3.5 bg-[#1c1c1f]/40 border border-[#2d2d34]/60 rounded-xl text-xs flex flex-col sm:flex-row justify-between sm:items-center gap-3 relative">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-bold text-white text-sm">
                          {entry.task_title || "General Workspace hours"}
                        </span>
                        <span className="font-mono text-[9px] text-[#8e8e95] bg-[#222226] px-2 py-0.5 rounded">
                          {entry.date}
                        </span>
                        <span className="font-mono text-[9px] text-indigo-400 bg-indigo-500/5 px-2 py-0.5 rounded border border-indigo-500/10">
                          {entry.project_name || "No Project"}
                        </span>
                        {entry.is_billable ? (
                          <span className="text-[9px] font-bold text-emerald-400 bg-emerald-500/5 px-1.5 py-0.5 rounded border border-emerald-500/10">
                            Billable
                          </span>
                        ) : (
                          <span className="text-[9px] font-bold text-amber-500 bg-amber-500/5 px-1.5 py-0.5 rounded border border-amber-500/10">
                            Non-Billable
                          </span>
                        )}
                        
                        {/* Status badges */}
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider border ${
                          entry.status === 'APPROVED' ? "bg-emerald-500/5 border-emerald-500/20 text-emerald-400" :
                          entry.status === 'SUBMITTED' ? "bg-indigo-500/5 border-indigo-500/20 text-indigo-400 animate-pulse" :
                          entry.status === 'REJECTED' ? "bg-rose-500/5 border-rose-500/20 text-rose-400" :
                          "bg-[#2d2d34] border-transparent text-[#8e8e95]"
                        }`}>
                          {entry.status}
                        </span>
                      </div>
                      
                      {entry.description && (
                        <p className="text-[#8e8e95] text-[11px] leading-relaxed italic">"{entry.description}"</p>
                      )}
                      
                      {entry.user_email && activeTab === 'approvals' && (
                        <div className="flex items-center gap-1.5 text-[10px] text-[#8e8e95] mt-1.5">
                          <User className="h-3 w-3 text-[#52525b]" />
                          <span>Logged by: <strong className="text-white">{entry.user_email}</strong></span>
                        </div>
                      )}

                      {entry.status === 'REJECTED' && entry.rejection_comments && (
                        <div className="flex items-start gap-1.5 text-[10px] text-rose-400 bg-rose-500/5 border border-rose-500/10 rounded-lg p-2 mt-2">
                          <MessageSquare className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                          <span><strong>Rejection Feedback:</strong> {entry.rejection_comments}</span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                      <span className="text-white font-mono font-black text-base">{entry.hours_logged}h</span>
                      
                      {/* Action buttons based on Tab state */}
                      <div className="flex items-center gap-1.5 print:hidden">
                        {activeTab === "my-timesheets" && entry.status === "DRAFT" && (
                          <>
                            <button
                              onClick={() => submitTimesheetMutation.mutate(entry.id)}
                              className="px-2.5 py-1 text-[10px] font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded transition"
                            >
                              Submit
                            </button>
                            <button
                              onClick={() => deleteTimeMutation.mutate(entry.id)}
                              className="p-1 border border-[#1f1f23] rounded bg-[#121214] text-[#8e8e95] hover:text-rose-400 transition"
                              aria-label="Delete draft"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </>
                        )}

                        {activeTab === "approvals" && entry.status === "SUBMITTED" && (
                          <>
                            <button
                              onClick={() => approveTimesheetMutation.mutate(entry.id)}
                              className="p-1 border border-emerald-500/20 bg-emerald-500/5 text-emerald-400 rounded-lg hover:bg-emerald-500/10 transition"
                              title="Approve Log"
                            >
                              <Check className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => setRejectEntryId(entry.id)}
                              className="p-1 border border-rose-500/20 bg-rose-500/5 text-rose-400 rounded-lg hover:bg-rose-500/10 transition"
                              title="Reject Log"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>

          {/* Analytics Summary Panel */}
          <section className="lg:col-span-4 bg-[#121214] border border-[#1f1f23] rounded-xl p-5 shadow-sm space-y-5 print:border-0 print:p-0">
            <div>
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">Timesheet Analytics</h2>
              <p className="text-[10px] text-[#8e8e95] mt-0.5">Range utilization and productivity data</p>
            </div>

            <div className="space-y-4">
              {/* Project utilization summary */}
              <div>
                <span className="text-[9px] uppercase font-bold tracking-widest text-indigo-400">Hours By Project</span>
                <div className="space-y-2 mt-2 max-h-[160px] overflow-y-auto pr-1">
                  {!summary?.by_project || summary.by_project.length === 0 ? (
                    <p className="text-[10px] text-[#8e8e95]">No project time logged.</p>
                  ) : (
                    summary.by_project.map((p, idx) => (
                      <div key={idx} className="flex justify-between items-center text-xs py-1 border-b border-[#1f1f23]">
                        <span className="font-semibold text-white truncate pr-4">{p.project}</span>
                        <span className="font-mono text-indigo-400 font-bold shrink-0">{p.hours.toFixed(1)}h</span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Tasks Planned vs Actual Hours */}
              <div>
                <span className="text-[9px] uppercase font-bold tracking-widest text-indigo-400">Planned vs Actual Hours</span>
                <div className="space-y-2 mt-2 max-h-[160px] overflow-y-auto pr-1">
                  {!summary?.by_task || summary.by_task.length === 0 ? (
                    <p className="text-[10px] text-[#8e8e95]">No task hours matched.</p>
                  ) : (
                    summary.by_task.map((t, idx) => (
                      <div key={idx} className="py-2 border-b border-[#1f1f23] text-xs">
                        <div className="flex justify-between items-center">
                          <span className="font-bold text-white truncate pr-4">{t.task}</span>
                          <span className="font-mono text-indigo-400 font-bold shrink-0">{t.logged_here.toFixed(1)}h logged</span>
                        </div>
                        <div className="flex items-center justify-between text-[10px] text-[#8e8e95] mt-1">
                          <span>Planned: {t.planned_hours.toFixed(1)}h</span>
                          <span>Actual: {t.actual_hours.toFixed(1)}h</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Team logs utilization (for managers/admins) */}
              {activeTab === 'approvals' && (
                <div>
                  <span className="text-[9px] uppercase font-bold tracking-widest text-indigo-400">Team Workload Distribution</span>
                  <div className="space-y-2 mt-2 max-h-[180px] overflow-y-auto pr-1">
                    {!summary?.team_summary || summary.team_summary.length === 0 ? (
                      <p className="text-[10px] text-[#8e8e95]">No team summary records.</p>
                    ) : (
                      summary.team_summary.map((t, idx) => (
                        <div key={idx} className="flex justify-between items-center text-xs py-1.5 border-b border-[#1f1f23]">
                          <div className="flex items-center gap-1.5 overflow-hidden">
                            <span className="font-bold text-white truncate">{t.name}</span>
                          </div>
                          <span className="font-mono text-indigo-400 font-bold shrink-0">{t.hours.toFixed(1)}h</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          </section>
        </div>

        {/* Modal: Log Work Time */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex justify-center items-center p-4 print:hidden">
            <div className="bg-[#121214] border border-[#1f1f23] rounded-xl w-full max-w-md shadow-2xl p-6 relative">
              <button
                onClick={() => setIsModalOpen(false)}
                className="absolute top-4 right-4 text-[#8e8e95] hover:text-white transition"
              >
                <X className="h-4 w-4" />
              </button>

              <h2 className="text-lg font-bold text-white mb-4">Log Daily Timesheet Hours</h2>

              <form onSubmit={handleSubmit((data) => logTimeMutation.mutate(data))} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase font-bold tracking-wider text-[#8e8e95]">Project Context</label>
                  <select
                    {...register("project")}
                    className="w-full bg-[#1c1c1f] border border-[#2d2d34] rounded-lg p-2.5 text-xs focus:outline-none text-white focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value="">No Project (General Work)...</option>
                    {projects.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase font-bold tracking-wider text-[#8e8e95]">Target Task (Optional)</label>
                  <select
                    {...register("task")}
                    className="w-full bg-[#1c1c1f] border border-[#2d2d34] rounded-lg p-2.5 text-xs focus:outline-none text-white focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value="">General Work (No specific task)...</option>
                    {tasks.map(t => (
                      <option key={t.id} value={t.id}>{t.title} ({t.status})</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase font-bold tracking-wider text-[#8e8e95]">Date</label>
                    <input
                      type="date"
                      {...register("date")}
                      className="w-full bg-[#1c1c1f] border border-[#2d2d34] rounded-lg p-2 text-xs focus:outline-none text-white"
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase font-bold tracking-wider text-[#8e8e95]">Hours Logged</label>
                    <input
                      type="number"
                      step="0.5"
                      min="0.5"
                      max="24"
                      {...register("hours_logged")}
                      className="w-full bg-[#1c1c1f] border border-[#2d2d34] rounded-lg p-2 text-xs focus:outline-none text-white"
                      required
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2 py-1">
                  <input
                    type="checkbox"
                    id="is_billable"
                    {...register("is_billable")}
                    className="rounded border-[#2d2d34] bg-[#1c1c1f] text-indigo-600 focus:ring-indigo-500"
                  />
                  <label htmlFor="is_billable" className="text-xs font-semibold text-white cursor-pointer select-none">
                    Mark as Billable Hours
                  </label>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase font-bold tracking-wider text-[#8e8e95]">Work Description</label>
                  <textarea
                    {...register("description")}
                    placeholder="Details about what you worked on..."
                    rows={3}
                    className="w-full bg-[#1c1c1f] border border-[#2d2d34] rounded-lg p-2 text-xs focus:outline-none text-white resize-none leading-relaxed"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 border border-[#1f1f23] rounded-lg text-xs font-semibold text-white hover:bg-[#1c1c1f] transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition shadow-lg shadow-indigo-600/10"
                  >
                    Save as Draft
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Create New Project */}
        {isProjectModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex justify-center items-center p-4 print:hidden">
            <div className="bg-[#121214] border border-[#1f1f23] rounded-xl w-full max-w-md shadow-2xl p-6 relative">
              <button
                onClick={() => setIsProjectModalOpen(false)}
                className="absolute top-4 right-4 text-[#8e8e95] hover:text-white transition"
              >
                <X className="h-4 w-4" />
              </button>

              <h2 className="text-lg font-bold text-white mb-4">Create Enterprise Project</h2>

              <form onSubmit={projectForm.handleSubmit((data) => createProjectMutation.mutate(data))} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase font-bold tracking-wider text-[#8e8e95]">Project Name</label>
                  <input
                    type="text"
                    {...projectForm.register("name")}
                    placeholder="e.g. Apollo Infrastructure Expansion"
                    className="w-full bg-[#1c1c1f] border border-[#2d2d34] rounded-lg p-2 text-xs focus:outline-none text-white"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase font-bold tracking-wider text-[#8e8e95]">Description</label>
                  <textarea
                    {...projectForm.register("description")}
                    placeholder="Project description and objectives..."
                    rows={3}
                    className="w-full bg-[#1c1c1f] border border-[#2d2d34] rounded-lg p-2 text-xs focus:outline-none text-white resize-none leading-relaxed"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsProjectModalOpen(false)}
                    className="px-4 py-2 border border-[#1f1f23] rounded-lg text-xs font-semibold text-white hover:bg-[#1c1c1f] transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition shadow-lg shadow-indigo-600/10"
                  >
                    Create Project
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Rejection Feedback */}
        {rejectEntryId && (
          <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex justify-center items-center p-4 print:hidden">
            <div className="bg-[#121214] border border-[#1f1f23] rounded-xl w-full max-w-md shadow-2xl p-6 relative">
              <button
                onClick={() => setRejectEntryId(null)}
                className="absolute top-4 right-4 text-[#8e8e95] hover:text-white transition"
              >
                <X className="h-4 w-4" />
              </button>

              <h2 className="text-lg font-bold text-white mb-4">Reject Timesheet Log</h2>

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase font-bold tracking-wider text-[#8e8e95]">Rejection Comments</label>
                  <textarea
                    value={rejectionComments}
                    onChange={(e) => setRejectionComments(e.target.value)}
                    placeholder="Explain why this timesheet entry is rejected..."
                    rows={3}
                    className="w-full bg-[#1c1c1f] border border-[#2d2d34] rounded-lg p-2 text-xs focus:outline-none text-white resize-none leading-relaxed"
                    required
                  />
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setRejectEntryId(null)}
                    className="px-4 py-2 border border-[#1f1f23] rounded-lg text-xs font-semibold text-white hover:bg-[#1c1c1f] transition"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => rejectTimesheetMutation.mutate({ id: rejectEntryId, comments: rejectionComments })}
                    className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold transition shadow-lg shadow-rose-600/10"
                    disabled={!rejectionComments}
                  >
                    Reject Entry
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </ProtectedRoute>
  );
}
