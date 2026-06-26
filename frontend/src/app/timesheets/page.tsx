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
  MessageSquare,
  FileSpreadsheet,
  Layers,
  ChevronLeft
} from "lucide-react";

// 5 Requested Modules
type TimesheetModule =
  | "my-timesheets"
  | "submit"
  | "approvals"
  | "reports"
  | "export";

const moduleLabels: Record<TimesheetModule, string> = {
  "my-timesheets": "My Timesheets",
  submit: "Submit",
  approvals: "Approval Queue",
  reports: "Reports",
  export: "Export",
};

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

  // Navigation state
  const [activeModule, setActiveModule] = useState<TimesheetModule>("my-timesheets");
  
  // My Timesheets Sub-screens: Timesheet Entry | Weekly Timesheet | Monthly Timesheet
  const [myTimesheetsScreen, setMyTimesheetsScreen] = useState<"entry" | "weekly" | "monthly">("entry");
  
  // Detailed Modal / detail view state
  const [selectedTimesheet, setSelectedTimesheet] = useState<TimesheetItem | null>(null);
  
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  
  // Reject timesheet action state
  const [rejectEntryId, setRejectEntryId] = useState<string | null>(null);
  const [rejectionComments, setRejectionComments] = useState("");

  // Submit screen: selected drafts queue state
  const [selectedDraftIds, setSelectedDraftIds] = useState<string[]>([]);

  // Filter state for Reports
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

  // Form hooks
  const { register, handleSubmit, reset } = useForm<LogTimeInput>({
    defaultValues: {
      project: "",
      task: "",
      date: new Date().toISOString().split("T")[0],
      hours_logged: 8,
      is_billable: true,
      description: ""
    }
  });

  const projectForm = useForm<{ name: string; description: string }>({
    defaultValues: { name: "", description: "" }
  });

  // Queries
  const { data: timesheets = [], isLoading } = useQuery<TimesheetItem[]>({
    queryKey: ["timesheet-entries", activeModule, activeOrganizationId],
    queryFn: async () => {
      // If we are looking at the Approval Queue, fetch all timesheets in the organization
      const allParam = activeModule === "approvals" ? "?all=true" : "";
      const res = await apiClient.get(`/api/v1/timesheets/${allParam}`);
      return (Array.isArray(res.data?.data) ? res.data.data : (Array.isArray(res.data) ? res.data : []));
    }
  });

  const { data: summary } = useQuery<TimesheetSummary>({
    queryKey: ["timesheet-summary", startDate, endDate, activeModule, activeOrganizationId],
    queryFn: async () => {
      const teamParam = activeModule === "approvals" ? "&team=true" : "";
      const res = await apiClient.get(`/api/v1/timesheets/summary/?start_date=${startDate}&end_date=${endDate}${teamParam}`);
      return res.data.data;
    }
  });

  const { data: projects = [] } = useQuery<ProjectItem[]>({
    queryKey: ["timesheet-projects", activeOrganizationId],
    queryFn: async () => {
      const res = await apiClient.get("/api/v1/timesheets/projects/");
      return (Array.isArray(res.data?.data) ? res.data.data : (Array.isArray(res.data) ? res.data : []));
    }
  });

  const { data: tasks = [] } = useQuery<TaskItem[]>({
    queryKey: ["planner-all-tasks", activeOrganizationId],
    queryFn: async () => {
      const res = await apiClient.get("/api/v1/planner/tasks/");
      return (Array.isArray(res.data?.data) ? res.data.data : (Array.isArray(res.data) ? res.data : []));
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
      showToast("Timesheet draft logged successfully", "success");
      setIsLogModalOpen(false);
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
      // Update selected detail view if open
      setSelectedTimesheet(null);
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
      setSelectedTimesheet(null);
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

  const handleBulkSubmit = async () => {
    if (selectedDraftIds.length === 0) return;
    try {
      await Promise.all(selectedDraftIds.map(id => apiClient.post(`/api/v1/timesheets/${id}/submit/`)));
      showToast(`Submitted ${selectedDraftIds.length} timesheets successfully`, "success");
      setSelectedDraftIds([]);
      queryClient.invalidateQueries({ queryKey: ["timesheet-entries"] });
      queryClient.invalidateQueries({ queryKey: ["timesheet-summary"] });
    } catch (e) {
      showToast("Error during bulk submission", "error");
    }
  };

  const handleExportCSV = () => {
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Date,User,Project,Task,Hours,Billable,Status,Description\n";
    timesheets.forEach(entry => {
      csvContent += `"${entry.date}","${entry.user_email}","${entry.project_name || "N/A"}","${entry.task_title || "N/A"}",${entry.hours_logged},${entry.is_billable ? 'Yes' : 'No'},"${entry.status}","${entry.description || ''}"\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `timesheet_report_${activeModule}_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast("CSV exported successfully", "success");
  };

  const handleExportExcel = () => {
    // Generate a mock excel layout sheet using CSV headers format
    handleExportCSV();
  };

  // Helper: group my timesheets into a weekly grid (Monday - Sunday) for current week
  const getWeeklyGridData = () => {
    const today = new Date();
    const day = today.getDay(); 
    // Start of week (Monday)
    const monday = new Date(today);
    monday.setDate(today.getDate() - (day === 0 ? 6 : day - 1));
    
    const days: string[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      days.push(d.toISOString().split("T")[0]);
    }

    const myLogs = timesheets.filter(t => t.user_email === currentUser?.email);

    // Group logs by project name or "General Work"
    const projectsTracked = Array.from(new Set(myLogs.map(l => l.project_name || "General Work")));
    
    const rows = projectsTracked.map(proj => {
      const dayHours = days.map(dStr => {
        const hours = myLogs
          .filter(l => (l.project_name || "General Work") === proj && l.date === dStr)
          .reduce((sum, l) => sum + parseFloat(l.hours_logged), 0);
        return hours;
      });
      const total = dayHours.reduce((sum, h) => sum + h, 0);
      return { project: proj, days: dayHours, total };
    });

    return { days, rows };
  };

  // Helper: group my timesheets into a monthly grid of calendar days for current month
  const getMonthlyGridData = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth(); // 0-indexed
    
    const firstDayIndex = new Date(year, month, 1).getDay(); // 0=Sun, 1=Mon, etc.
    const totalDays = new Date(year, month + 1, 0).getDate();
    
    const myLogs = timesheets.filter(t => t.user_email === currentUser?.email);

    const dayCells: Array<{ dayNum: number; dateStr: string; hours: number } | null> = [];
    
    // Fill lead spaces
    const blankCount = firstDayIndex === 0 ? 6 : firstDayIndex - 1; // Align Mon-Sun
    for (let i = 0; i < blankCount; i++) {
      dayCells.push(null);
    }

    for (let d = 1; d <= totalDays; d++) {
      const dateObj = new Date(year, month, d);
      // Adjust timezone offset to get correct string representation
      const dateStr = new Date(dateObj.getTime() - dateObj.getTimezoneOffset() * 60000).toISOString().split("T")[0];
      const hours = myLogs
        .filter(l => l.date === dateStr)
        .reduce((sum, l) => sum + parseFloat(l.hours_logged), 0);
      dayCells.push({ dayNum: d, dateStr, hours });
    }

    return { monthName: today.toLocaleString('default', { month: 'long' }), year, dayCells };
  };

  const myDrafts = timesheets.filter(t => t.user_email === currentUser?.email && (t.status === "DRAFT" || t.status === "REJECTED"));
  const pendingApprovals = timesheets.filter(t => t.status === "SUBMITTED");
  const approvedHistory = timesheets.filter(t => t.status === "APPROVED" || t.status === "REJECTED");

  return (
    <ProtectedRoute>
      <div className="p-6 space-y-6 max-w-7xl mx-auto text-foreground select-none relative pb-20">
        
        {/* Toast Alerts */}
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

        {/* Top Header Row */}
        <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-[#2d2d34]/60 pb-5 gap-4">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-white flex items-center gap-2.5">
              <Clock className="h-6 w-6 text-indigo-500" />
              <span>Timesheets Workspace</span>
            </h1>
            <p className="text-xs text-[#8e8e95] mt-1 leading-relaxed">
              Track utilization metrics, log work sessions, manage approvals, and export corporate timesheet logs.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsProjectModalOpen(true)}
              className="flex items-center gap-1.5 border border-[#2d2d34]/60 text-[10px] font-bold uppercase tracking-wider px-3 py-2 rounded-lg bg-[#1c1c1f] hover:bg-[#28282c] transition"
            >
              <Building className="h-3.5 w-3.5 text-indigo-400" />
              <span>New Project</span>
            </button>

            <button
              onClick={() => setIsLogModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Log Time Entry</span>
            </button>
          </div>
        </div>

        {/* Modules Navigation Tab Bar */}
        <div className="bg-[#1c1c1f] p-1.5 border border-[#2d2d34]/60 rounded-2xl flex gap-1 overflow-x-auto max-w-full no-scrollbar">
          {(["my-timesheets", "submit", "approvals", "reports", "export"] as TimesheetModule[]).map((mod) => (
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
        {/* MODULE 1: MY TIMESHEETS                                       */}
        {/* ------------------------------------------------------------- */}
        {activeModule === "my-timesheets" && (
          <div className="space-y-6">
            
            {/* Screen Toggles inside My Timesheets */}
            <div className="flex gap-2 border-b border-[#2d2d34]/30 pb-3">
              <button
                onClick={() => setMyTimesheetsScreen("entry")}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wide transition ${
                  myTimesheetsScreen === "entry" ? "bg-zinc-800 text-white border border-[#2d2d34]" : "text-[#8e8e95] hover:text-white"
                }`}
              >
                Timesheet Entry View
              </button>
              <button
                onClick={() => setMyTimesheetsScreen("weekly")}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wide transition ${
                  myTimesheetsScreen === "weekly" ? "bg-zinc-800 text-white border border-[#2d2d34]" : "text-[#8e8e95] hover:text-white"
                }`}
              >
                Weekly Timesheet
              </button>
              <button
                onClick={() => setMyTimesheetsScreen("monthly")}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wide transition ${
                  myTimesheetsScreen === "monthly" ? "bg-zinc-800 text-white border border-[#2d2d34]" : "text-[#8e8e95] hover:text-white"
                }`}
              >
                Monthly Timesheet
              </button>
            </div>

            {/* SCREEN 1: TIMESHEET ENTRY SCREEN */}
            {myTimesheetsScreen === "entry" && (
              <div className="space-y-4">
                <div className="flex flex-col gap-0.5">
                  <h2 className="text-base font-extrabold text-white">Timesheet Entry</h2>
                  <p className="text-[10px] text-[#8e8e95]">Manage individual draft and historical time logs</p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                  
                  {/* Logs list */}
                  <div className="lg:col-span-8 space-y-3">
                    {isLoading ? (
                      <div className="text-center py-10 text-xs animate-pulse text-muted-foreground">Loading time entries...</div>
                    ) : timesheets.length === 0 ? (
                      <div className="p-12 text-center text-xs text-muted-foreground border border-dashed border-[#2d2d34]/40 rounded-2xl flex flex-col justify-center h-48">
                        No timesheet logs completed yet. Click 'Log Time Entry' to begin.
                      </div>
                    ) : (
                      timesheets
                        .filter(t => t.user_email === currentUser?.email)
                        .map((entry) => (
                          <div
                            key={entry.id}
                            onClick={() => setSelectedTimesheet(entry)}
                            className="p-4 bg-[#1c1c1f]/40 border border-[#2d2d34]/60 rounded-xl text-xs flex justify-between items-center hover:border-indigo-500/30 transition cursor-pointer"
                          >
                            <div className="space-y-1 pr-4 truncate">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-extrabold text-white text-sm">
                                  {entry.task_title || "General Time Allocation"}
                                </span>
                                <span className="text-[8px] bg-zinc-800 text-[#8e8e95] font-mono px-2 py-0.5 rounded">
                                  {entry.date}
                                </span>
                                {entry.project_name && (
                                  <span className="text-[8px] bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-bold px-1.5 py-0.5 rounded">
                                    {entry.project_name}
                                  </span>
                                )}
                              </div>
                              <p className="text-[#8e8e95] text-[11px] truncate italic">
                                {entry.description || "No description provided."}
                              </p>
                            </div>

                            <div className="flex items-center gap-4 shrink-0">
                              <span className="font-mono text-base font-black text-white">{entry.hours_logged}h</span>
                              
                              <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded uppercase border ${
                                entry.status === 'APPROVED' ? "bg-emerald-500/5 border-emerald-500/25 text-emerald-400" :
                                entry.status === 'SUBMITTED' ? "bg-indigo-500/5 border-indigo-500/25 text-indigo-400 animate-pulse" :
                                entry.status === 'REJECTED' ? "bg-rose-500/5 border-rose-500/25 text-rose-400" :
                                "bg-[#2d2d34] border-transparent text-[#8e8e95]"
                              }`}>
                                {entry.status}
                              </span>

                              {entry.status === "DRAFT" && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    deleteTimeMutation.mutate(entry.id);
                                  }}
                                  className="p-1 border border-[#2d2d34]/60 rounded text-[#8e8e95] hover:text-rose-400 transition"
                                >
                                  <X className="h-3.5 w-3.5" />
                                </button>
                              )}
                            </div>
                          </div>
                        ))
                    )}
                  </div>

                  {/* Summary Snapshot */}
                  <div className="lg:col-span-4 bg-[#1c1c1f]/40 border border-[#2d2d34]/60 p-4 rounded-xl space-y-4">
                    <h3 className="text-xs font-bold text-white uppercase tracking-wider">Metrics Snapshot</h3>
                    
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div className="bg-[#121214]/60 border border-[#1f1f23] p-3 rounded-lg">
                        <span className="text-[9px] text-[#8e8e95] uppercase font-bold block">Utilization</span>
                        <span className="text-lg font-black text-indigo-400 mt-1 block">
                          {summary?.utilization_rate || 0}%
                        </span>
                      </div>
                      <div className="bg-[#121214]/60 border border-[#1f1f23] p-3 rounded-lg">
                        <span className="text-[9px] text-[#8e8e95] uppercase font-bold block">Productivity</span>
                        <span className="text-lg font-black text-amber-500 mt-1 block">
                          {summary?.productivity_score || 0}%
                        </span>
                      </div>
                    </div>
                  </div>

                </div>
              </div>
            )}

            {/* SCREEN 2: WEEKLY TIMESHEET SCREEN */}
            {myTimesheetsScreen === "weekly" && (
              <div className="space-y-4">
                <div className="flex flex-col gap-0.5">
                  <h2 className="text-base font-extrabold text-white">Weekly Timesheet</h2>
                  <p className="text-[10px] text-[#8e8e95]">Current week hours breakdown by task and day</p>
                </div>

                <div className="bg-[#1c1c1f]/40 border border-[#2d2d34]/60 p-4 rounded-2xl overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-[#2d2d34]/40 text-[#8e8e95] uppercase tracking-wider text-[9px] font-bold">
                        <th className="py-2.5 pr-4">Project Context</th>
                        {getWeeklyGridData().days.map((d, idx) => {
                          const dateObj = new Date(d);
                          const dayName = dateObj.toLocaleDateString('default', { weekday: 'short' });
                          return (
                            <th key={idx} className="py-2.5 px-2 text-center font-mono">
                              {dayName} ({dateObj.getDate()})
                            </th>
                          );
                        })}
                        <th className="py-2.5 pl-4 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {getWeeklyGridData().rows.length === 0 ? (
                        <tr>
                          <td colSpan={9} className="py-10 text-center text-muted-foreground">
                            No logs registered for the active week.
                          </td>
                        </tr>
                      ) : (
                        getWeeklyGridData().rows.map((row, rIdx) => (
                          <tr key={rIdx} className="border-b border-[#2d2d34]/30 hover:bg-[#1c1c1f]/20">
                            <td className="py-3 pr-4 font-bold text-white max-w-[180px] truncate">
                              {row.project}
                            </td>
                            {row.days.map((hours, cIdx) => (
                              <td key={cIdx} className="py-3 px-2 text-center font-mono text-white">
                                {hours > 0 ? (
                                  <span className="bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-2 py-1 rounded font-bold">
                                    {hours.toFixed(1)}h
                                  </span>
                                ) : (
                                  <span className="text-zinc-600">-</span>
                                )}
                              </td>
                            ))}
                            <td className="py-3 pl-4 text-right font-black font-mono text-white text-sm">
                              {row.total.toFixed(1)}h
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* SCREEN 3: MONTHLY TIMESHEET SCREEN */}
            {myTimesheetsScreen === "monthly" && (
              <div className="space-y-4">
                <div className="flex flex-col gap-0.5">
                  <h2 className="text-base font-extrabold text-white">Monthly Timesheet</h2>
                  <p className="text-[10px] text-[#8e8e95]">
                    Overview of hours tracked for {getMonthlyGridData().monthName} {getMonthlyGridData().year}
                  </p>
                </div>

                <div className="bg-[#1c1c1f]/40 border border-[#2d2d34]/60 p-5 rounded-2xl">
                  {/* Calendar Day Titles */}
                  <div className="grid grid-cols-7 gap-2 text-center font-bold text-[9px] uppercase tracking-wider text-[#8e8e95] border-b border-[#2d2d34]/30 pb-2">
                    <div>Mon</div>
                    <div>Tue</div>
                    <div>Wed</div>
                    <div>Thu</div>
                    <div>Fri</div>
                    <div>Sat</div>
                    <div>Sun</div>
                  </div>

                  {/* Calendar Cells */}
                  <div className="grid grid-cols-7 gap-2 mt-2">
                    {getMonthlyGridData().dayCells.map((cell, idx) => {
                      if (!cell) {
                        return <div key={idx} className="h-16 bg-zinc-900/10 border border-transparent rounded-lg"></div>;
                      }

                      return (
                        <div
                          key={idx}
                          className={`h-16 border rounded-lg p-2 flex flex-col justify-between transition ${
                            cell.hours > 0 
                              ? "bg-indigo-600/5 border-indigo-500/20" 
                              : "bg-[#121214]/50 border-[#2d2d34]/30 hover:border-zinc-700"
                          }`}
                        >
                          <span className="text-[10px] font-bold text-[#8e8e95]">{cell.dayNum}</span>
                          
                          {cell.hours > 0 && (
                            <span className="text-[10px] font-black font-mono text-indigo-400 bg-indigo-500/10 px-1 rounded self-end">
                              {cell.hours.toFixed(1)}h
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* MODULE 2: SUBMIT -> Submit Timesheet Screen                   */}
        {/* ------------------------------------------------------------- */}
        {activeModule === "submit" && (
          <div className="space-y-6">
            
            {/* Screen Header */}
            <div className="flex flex-col gap-1 border-b border-[#2d2d34]/40 pb-3">
              <h2 className="text-lg font-black text-white">Submit Timesheet</h2>
              <p className="text-xs text-[#8e8e95]">Select and bulk-submit logged draft hours to project managers</p>
            </div>

            <div className="bg-[#1c1c1f]/40 border border-[#2d2d34]/60 p-6 rounded-2xl space-y-4">
              <div className="flex justify-between items-center border-b border-[#2d2d34]/40 pb-3">
                <div>
                  <h3 className="font-extrabold text-sm text-white uppercase tracking-wider">Draft Time Logs</h3>
                  <p className="text-[9px] text-[#8e8e95] mt-0.5">Select items below to request manager review approval</p>
                </div>

                {selectedDraftIds.length > 0 && (
                  <button
                    onClick={handleBulkSubmit}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-white bg-indigo-600 rounded hover:bg-indigo-700 transition"
                  >
                    <CheckSquare className="h-3.5 w-3.5" />
                    <span>Submit Selected ({selectedDraftIds.length})</span>
                  </button>
                )}
              </div>

              {myDrafts.length === 0 ? (
                <div className="text-center text-muted-foreground text-xs py-10 border border-dashed border-[#2d2d34]/40 rounded-xl">
                  No draft or rejected timesheets available for submission.
                </div>
              ) : (
                <div className="space-y-2">
                  
                  {/* Select All Bar */}
                  <div className="flex items-center gap-2 text-xs text-[#8e8e95] border-b border-[#2d2d34]/20 pb-2">
                    <input
                      id="selectAllDrafts"
                      name="selectAllDrafts"
                      autoComplete="off"
                      type="checkbox"
                      checked={selectedDraftIds.length === myDrafts.length}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedDraftIds(myDrafts.map(d => d.id));
                        } else {
                          setSelectedDraftIds([]);
                        }
                      }}
                      className="rounded border-[#2d2d34] text-indigo-600 bg-[#121214]"
                    />
                    <label htmlFor="selectAllDrafts" className="cursor-pointer">Select All Drafts ({myDrafts.length})</label>
                  </div>

                  <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
                    {myDrafts.map((d) => (
                      <div
                        key={d.id}
                        className="p-3 bg-[#121214]/60 border border-[#1f1f23] rounded-xl flex items-center justify-between text-xs"
                      >
                        <div className="flex items-center gap-3">
                          <input
                            id={`select-draft-${d.id}`}
                            name={`select-draft-${d.id}`}
                            autoComplete="off"
                            aria-label={`Select draft time log ${d.task_title || "General Time Log"}`}
                            type="checkbox"
                            checked={selectedDraftIds.includes(d.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedDraftIds(prev => [...prev, d.id]);
                              } else {
                                setSelectedDraftIds(prev => prev.filter(id => id !== d.id));
                              }
                            }}
                            className="rounded border-[#2d2d34] text-indigo-600 bg-[#121214]"
                          />
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-bold text-white">{d.task_title || "General Time Log"}</span>
                              <span className="font-mono text-[9px] text-[#8e8e95]">{d.date}</span>
                              {d.status === "REJECTED" && (
                                <span className="text-[8px] font-bold text-rose-400 bg-rose-500/5 px-1.5 border border-rose-500/10 rounded">
                                  Rejected
                                </span>
                              )}
                            </div>
                            <p className="text-[10px] text-[#8e8e95] italic mt-0.5 truncate max-w-[280px]">
                              {d.description || "No description provided."}
                            </p>
                          </div>
                        </div>

                        <span className="font-mono font-black text-white text-sm shrink-0">{d.hours_logged}h</span>
                      </div>
                    ))}
                  </div>

                </div>
              )}
            </div>

          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* MODULE 3: APPROVAL QUEUE                                      */}
        {/* ------------------------------------------------------------- */}
        {activeModule === "approvals" && (
          <div className="space-y-6">
            
            {/* Screen Header */}
            <div className="flex flex-col gap-1 border-b border-[#2d2d34]/40 pb-3">
              <h2 className="text-lg font-black text-white">Approval Queue</h2>
              <p className="text-xs text-[#8e8e95]">Audit and approve timesheet submissions from team members</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              
              {/* Approvals list */}
              <div className="lg:col-span-8 space-y-4">
                
                {/* Pending review section */}
                <div className="bg-[#1c1c1f]/40 border border-[#2d2d34]/60 p-4 rounded-xl space-y-3">
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                    <Clock className="h-4 w-4 text-indigo-400" />
                    <span>Awaiting Manager Sign-off ({pendingApprovals.length})</span>
                  </h3>

                  <div className="space-y-2.5 max-h-[320px] overflow-y-auto pr-1">
                    {pendingApprovals.length === 0 ? (
                      <p className="text-xs text-[#8e8e95] text-center py-6">All submitted timesheets processed.</p>
                    ) : (
                      pendingApprovals.map((entry) => (
                        <div
                          key={entry.id}
                          onClick={() => setSelectedTimesheet(entry)}
                          className="p-3 bg-[#121214]/60 border border-[#1f1f23] hover:border-indigo-500/30 transition rounded-xl text-xs flex justify-between items-center cursor-pointer"
                        >
                          <div className="space-y-0.5 truncate pr-4">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-bold text-white">{entry.task_title || "General Time Log"}</span>
                              <span className="text-[8px] bg-zinc-800 text-[#8e8e95] px-1.5 py-0.5 rounded font-mono">{entry.date}</span>
                            </div>
                            <span className="text-[10px] text-[#8e8e95] block mt-0.5 truncate">
                              User: <strong className="text-white">{entry.user_email}</strong>
                            </span>
                          </div>

                          <div className="flex items-center gap-3 shrink-0">
                            <span className="font-mono font-bold text-white">{entry.hours_logged}h</span>
                            <ChevronRight className="h-4 w-4 text-[#8e8e95]" />
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Historical log ledger */}
                <div className="bg-[#1c1c1f]/40 border border-[#2d2d34]/60 p-4 rounded-xl space-y-3">
                  <h3 className="text-xs font-bold text-[#8e8e95] uppercase tracking-wider">Historical Logs</h3>
                  
                  <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                    {approvedHistory.length === 0 ? (
                      <p className="text-xs text-[#8e8e95] text-center py-4">No historical approvals logged.</p>
                    ) : (
                      approvedHistory.map((entry) => (
                        <div
                          key={entry.id}
                          onClick={() => setSelectedTimesheet(entry)}
                          className="p-2.5 bg-[#121214]/30 border border-[#1f1f23] rounded-lg text-xs flex justify-between items-center cursor-pointer hover:border-zinc-700"
                        >
                          <span className="text-[#8e8e95] truncate max-w-[200px]">
                            {entry.user_email} - {entry.task_title || "General Hours"}
                          </span>
                          
                          <div className="flex items-center gap-3 shrink-0">
                            <span className="font-mono text-[#8e8e95]">{entry.hours_logged}h</span>
                            <span className={`text-[8px] font-bold px-1 rounded ${
                              entry.status === "APPROVED" ? "text-emerald-400 bg-emerald-500/5" : "text-rose-400 bg-rose-500/5"
                            }`}>
                              {entry.status}
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

              </div>

              {/* SCREEN 6: TIMESHEET DETAIL SCREEN */}
              <div className="lg:col-span-4 bg-[#1c1c1f]/40 border border-[#2d2d34]/60 p-5 rounded-2xl space-y-4">
                <div className="border-b border-[#2d2d34]/40 pb-2 flex justify-between items-center">
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider">Timesheet Detail</h3>
                  {selectedTimesheet && (
                    <button
                      onClick={() => setSelectedTimesheet(null)}
                      className="text-[#8e8e95] hover:text-white transition text-[10px]"
                    >
                      Deselect
                    </button>
                  )}
                </div>

                {!selectedTimesheet ? (
                  <div className="text-center text-[10px] text-[#8e8e95] py-12 border border-dashed border-[#2d2d34]/40 rounded-xl">
                    Select a timesheet log from approvals or history to inspect details.
                  </div>
                ) : (
                  <div className="space-y-4 text-xs">
                    <div className="space-y-2 bg-[#121214]/60 p-3 rounded-lg border border-[#1f1f23]">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] text-[#8e8e95] uppercase font-mono">Status</span>
                        <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase border ${
                          selectedTimesheet.status === 'APPROVED' ? "bg-emerald-500/5 border-emerald-500/25 text-emerald-400" :
                          selectedTimesheet.status === 'REJECTED' ? "bg-rose-500/5 border-rose-500/25 text-rose-400" :
                          "bg-indigo-500/5 border-indigo-500/25 text-indigo-400"
                        }`}>
                          {selectedTimesheet.status}
                        </span>
                      </div>

                      <div className="flex justify-between">
                        <span className="text-[#8e8e95]">Hours Logged</span>
                        <strong className="text-white font-mono">{selectedTimesheet.hours_logged}h</strong>
                      </div>

                      <div className="flex justify-between">
                        <span className="text-[#8e8e95]">Log Date</span>
                        <span className="text-white font-mono">{selectedTimesheet.date}</span>
                      </div>

                      <div className="flex justify-between">
                        <span className="text-[#8e8e95]">User Email</span>
                        <span className="text-white truncate max-w-[150px]">{selectedTimesheet.user_email}</span>
                      </div>

                      {selectedTimesheet.project_name && (
                        <div className="flex justify-between">
                          <span className="text-[#8e8e95]">Project</span>
                          <span className="text-indigo-400 font-semibold">{selectedTimesheet.project_name}</span>
                        </div>
                      )}
                    </div>

                    <div className="space-y-1 bg-[#121214]/60 p-3 rounded-lg border border-[#1f1f23]">
                      <span className="text-[9px] text-[#8e8e95] uppercase font-bold block">Log Comments</span>
                      <p className="text-white leading-relaxed italic text-[11px]">
                        "{selectedTimesheet.description || "No description provided."}"
                      </p>
                    </div>

                    {/* Pending reviewer actions */}
                    {selectedTimesheet.status === "SUBMITTED" && (
                      <div className="flex gap-2 pt-2 border-t border-[#2d2d34]/40">
                        <button
                          onClick={() => approveTimesheetMutation.mutate(selectedTimesheet.id)}
                          className="flex-1 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-bold text-center transition"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => setRejectEntryId(selectedTimesheet.id)}
                          className="flex-1 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded font-bold text-center transition"
                        >
                          Reject
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

            </div>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* MODULE 4: REPORTS -> Timesheet Reports Screen                 */}
        {/* ------------------------------------------------------------- */}
        {activeModule === "reports" && (
          <div className="space-y-6">
            
            {/* Screen Header */}
            <div className="flex flex-col gap-1 border-b border-[#2d2d34]/40 pb-3">
              <h2 className="text-lg font-black text-white">Timesheet Reports</h2>
              <p className="text-xs text-[#8e8e95]">Corporate productivity, project metrics, and timeline velocity sorting</p>
            </div>

            {/* Filters panel inside reports */}
            <div className="bg-[#1c1c1f]/40 border border-[#2d2d34]/60 p-4 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-2 text-xs">
                <Filter className="h-4 w-4 text-indigo-400" />
                <span className="font-bold text-[#8e8e95] uppercase">Select Range:</span>
                <div className="flex items-center gap-1.5 bg-[#121214] border border-[#2d2d34] rounded px-2.5 py-1">
                  <input
                    id="startDate"
                    name="startDate"
                    autoComplete="off"
                    aria-label="Start Date"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="bg-transparent border-0 font-mono text-[10px] focus:outline-none text-white"
                  />
                  <span className="text-[#8e8e95]">-</span>
                  <input
                    id="endDate"
                    name="endDate"
                    autoComplete="off"
                    aria-label="End Date"
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="bg-transparent border-0 font-mono text-[10px] focus:outline-none text-white"
                  />
                </div>
              </div>

              <span className="text-[#8e8e95] text-[10px] italic">
                Report matches logs from {startDate} to {endDate}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Hours logged by project summary */}
              <div className="bg-[#1c1c1f]/40 border border-[#2d2d34]/60 p-5 rounded-2xl space-y-4">
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">Hours Tracked By Project</h3>
                
                <div className="space-y-3">
                  {!summary?.by_project || summary.by_project.length === 0 ? (
                    <p className="text-xs text-[#8e8e95] py-8 text-center">No projects tracked inside this range.</p>
                  ) : (
                    summary.by_project.map((proj, idx) => (
                      <div key={idx} className="space-y-1.5">
                        <div className="flex justify-between text-xs">
                          <span className="font-semibold text-white">{proj.project}</span>
                          <span className="font-mono text-indigo-400 font-bold">{proj.hours.toFixed(1)}h</span>
                        </div>
                        {/* Progress bar indicator */}
                        <div className="h-1.5 w-full bg-[#121214] border border-[#1f1f23] rounded-full overflow-hidden">
                          <div
                            className="h-full bg-indigo-500"
                            style={{ 
                              width: `${Math.min(100, summary.total_hours > 0 ? (proj.hours / summary.total_hours) * 100 : 0)}%` 
                            }}
                          />
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Task Planned vs Actual Comparison */}
              <div className="bg-[#1c1c1f]/40 border border-[#2d2d34]/60 p-5 rounded-2xl space-y-4">
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">Task Actual Workload</h3>
                
                <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                  {!summary?.by_task || summary.by_task.length === 0 ? (
                    <p className="text-xs text-[#8e8e95] py-8 text-center">No tasks tracked in this report scope.</p>
                  ) : (
                    summary.by_task.map((t, idx) => (
                      <div key={idx} className="p-3 bg-[#121214]/60 border border-[#1f1f23] rounded-xl text-xs space-y-2">
                        <div className="flex justify-between">
                          <span className="font-bold text-white truncate max-w-[180px]">{t.task}</span>
                          <span className="font-mono text-indigo-400 font-bold">{t.logged_here.toFixed(1)}h logged</span>
                        </div>

                        <div className="grid grid-cols-2 gap-4 text-[10px] text-[#8e8e95] pt-1 border-t border-[#2d2d34]/20">
                          <span>Planned Hours: {t.planned_hours.toFixed(1)}h</span>
                          <span>Actual Hours: {t.actual_hours.toFixed(1)}h</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

            </div>

          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* MODULE 5: EXPORT                                              */}
        {/* ------------------------------------------------------------- */}
        {activeModule === "export" && (
          <div className="max-w-md mx-auto space-y-6">
            
            {/* Screen Header */}
            <div className="flex flex-col gap-1 border-b border-[#2d2d34]/40 pb-3">
              <h2 className="text-lg font-black text-white">Export Timesheets</h2>
              <p className="text-xs text-[#8e8e95]">Generate, download, and print reports of logged hours</p>
            </div>

            <div className="bg-[#1c1c1f]/40 border border-[#2d2d34]/60 p-6 rounded-2xl space-y-5">
              <h3 className="font-extrabold text-sm text-white uppercase tracking-wider border-b border-[#2d2d34]/40 pb-3">
                Download Formats
              </h3>

              <div className="space-y-3">
                {/* CSV */}
                <button
                  onClick={handleExportCSV}
                  className="w-full p-4 bg-[#121214]/60 border border-[#1f1f23] hover:border-indigo-500/30 transition rounded-xl flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-500/10 rounded-lg text-indigo-400">
                      <FileText className="h-5 w-5" />
                    </div>
                    <div className="text-left">
                      <span className="font-bold text-white block">Comma Separated values (CSV)</span>
                      <span className="text-[10px] text-[#8e8e95] block mt-0.5">Compatible with spreadsheet systems</span>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-[#8e8e95]" />
                </button>

                {/* Excel */}
                <button
                  onClick={handleExportExcel}
                  className="w-full p-4 bg-[#121214]/60 border border-[#1f1f23] hover:border-indigo-500/30 transition rounded-xl flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-400">
                      <FileSpreadsheet className="h-5 w-5" />
                    </div>
                    <div className="text-left">
                      <span className="font-bold text-white block">Microsoft Excel Sheet (XLSX)</span>
                      <span className="text-[10px] text-[#8e8e95] block mt-0.5">Standard business spreadsheets grid structure</span>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-[#8e8e95]" />
                </button>

                {/* Print PDF */}
                <button
                  onClick={() => window.print()}
                  className="w-full p-4 bg-[#121214]/60 border border-[#1f1f23] hover:border-indigo-500/30 transition rounded-xl flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-zinc-800 rounded-lg text-white">
                      <Printer className="h-5 w-5" />
                    </div>
                    <div className="text-left">
                      <span className="font-bold text-white block">Print Report / Save PDF</span>
                      <span className="text-[10px] text-[#8e8e95] block mt-0.5">Generates clean printable layouts</span>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-[#8e8e95]" />
                </button>
              </div>
            </div>

          </div>
        )}

        {/* Modal: Log Work Time */}
        {isLogModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex justify-center items-center p-4">
            <div className="bg-[#121214] border border-[#1f1f23] rounded-xl w-full max-w-md shadow-2xl p-6 relative">
              <button
                onClick={() => setIsLogModalOpen(false)}
                className="absolute top-4 right-4 text-[#8e8e95] hover:text-white transition"
              >
                <X className="h-4 w-4" />
              </button>

              <h2 className="text-base font-extrabold text-white mb-4">Log Daily Timesheet Hours</h2>

              <form onSubmit={handleSubmit((data) => logTimeMutation.mutate(data))} className="space-y-4">
                <div className="space-y-1.5">
                  <label htmlFor="logProject" className="text-[10px] uppercase font-bold tracking-wider text-[#8e8e95]">Project Context</label>
                  <select
                    id="logProject"
                    autoComplete="off"
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
                  <label htmlFor="logTask" className="text-[10px] uppercase font-bold tracking-wider text-[#8e8e95]">Target Task (Optional)</label>
                  <select
                    id="logTask"
                    autoComplete="off"
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
                    <label htmlFor="logDate" className="text-[10px] uppercase font-bold tracking-wider text-[#8e8e95]">Date</label>
                    <input
                      id="logDate"
                      autoComplete="off"
                      type="date"
                      {...register("date")}
                      className="w-full bg-[#1c1c1f] border border-[#2d2d34] rounded-lg p-2 text-xs focus:outline-none text-white"
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="logHoursLogged" className="text-[10px] uppercase font-bold tracking-wider text-[#8e8e95]">Hours Logged</label>
                    <input
                      id="logHoursLogged"
                      autoComplete="off"
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
                  <label htmlFor="logDescription" className="text-[10px] uppercase font-bold tracking-wider text-[#8e8e95]">Work Description</label>
                  <textarea
                    id="logDescription"
                    autoComplete="off"
                    {...register("description")}
                    placeholder="Details about what you worked on..."
                    rows={3}
                    className="w-full bg-[#1c1c1f] border border-[#2d2d34] rounded-lg p-2 text-xs focus:outline-none text-white resize-none leading-relaxed"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsLogModalOpen(false)}
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
          <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex justify-center items-center p-4">
            <div className="bg-[#121214] border border-[#1f1f23] rounded-xl w-full max-w-md shadow-2xl p-6 relative">
              <button
                onClick={() => setIsProjectModalOpen(false)}
                className="absolute top-4 right-4 text-[#8e8e95] hover:text-white transition"
              >
                <X className="h-4 w-4" />
              </button>

              <h2 className="text-base font-extrabold text-white mb-4">Create Enterprise Project</h2>

              <form onSubmit={projectForm.handleSubmit((data) => createProjectMutation.mutate(data))} className="space-y-4">
                <div className="space-y-1.5">
                  <label htmlFor="newProjectName" className="text-[10px] uppercase font-bold tracking-wider text-[#8e8e95]">Project Name</label>
                  <input
                    id="newProjectName"
                    autoComplete="off"
                    type="text"
                    {...projectForm.register("name")}
                    placeholder="e.g. Apollo Infrastructure Expansion"
                    className="w-full bg-[#1c1c1f] border border-[#2d2d34] rounded-lg p-2 text-xs focus:outline-none text-white"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="newProjectDescription" className="text-[10px] uppercase font-bold tracking-wider text-[#8e8e95]">Description</label>
                  <textarea
                    id="newProjectDescription"
                    autoComplete="off"
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
          <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex justify-center items-center p-4">
            <div className="bg-[#121214] border border-[#1f1f23] rounded-xl w-full max-w-md shadow-2xl p-6 relative">
              <button
                onClick={() => setRejectEntryId(null)}
                className="absolute top-4 right-4 text-[#8e8e95] hover:text-white transition"
              >
                <X className="h-4 w-4" />
              </button>

              <h2 className="text-base font-extrabold text-white mb-4">Reject Timesheet Log</h2>

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label htmlFor="rejectionComments" className="text-[10px] uppercase font-bold tracking-wider text-[#8e8e95]">Rejection Comments</label>
                  <textarea
                    id="rejectionComments"
                    name="rejectionComments"
                    autoComplete="off"
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

      </div>
    </ProtectedRoute>
  );
}
