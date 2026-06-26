"use client";

import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/infrastructure/api/api-client";
import { ProtectedRoute } from "@/features/rbac/components/ProtectedRoute";
import { useAuthStore } from "@/infrastructure/store/auth-store";
import { 
  FileText, 
  Download, 
  TrendingUp, 
  Clock, 
  AlertCircle,
  Building,
  BarChart2,
  PieChart,
  Users,
  Flame,
  DollarSign,
  Printer,
  ChevronRight,
  ShieldAlert,
  Activity,
  CheckCircle2,
  XCircle,
  FileSpreadsheet,
  Loader2,
} from "lucide-react";

// 5 Requested Modules
type ReportModule =
  | "project"
  | "productivity"
  | "financial"
  | "timesheet"
  | "exports";

const moduleLabels: Record<ReportModule, string> = {
  project: "Project Reports",
  productivity: "Productivity Reports",
  financial: "Financial Reports",
  timesheet: "Timesheet Reports",
  exports: "Exports",
};

interface ReportSummary {
  timesheet_count: number;
  total_hours: number;
  billable_hours: number;
  utilization_rate: number;
}

type ToastType = "success" | "error" | "info";
interface Toast { id: number; type: ToastType; message: string; }


export default function ReportsPage() {
  const { activeOrganizationId } = useAuthStore();
  const [activeModule, setActiveModule] = useState<ReportModule>("project");
  const [downloadingFormat, setDownloadingFormat] = useState<"pdf" | "excel" | "csv" | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = (type: ToastType, message: string) => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, type, message }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
  };

  // Queries
  const { data: summary, isLoading, error } = useQuery<ReportSummary>({
    queryKey: ["client-reports-summary", activeOrganizationId],
    queryFn: async () => {
      const res = await apiClient.get("/api/v1/client/reports/");
      return res.data.data;
    },
    enabled: !!activeOrganizationId,
  });

  const handleExport = async (format: "pdf" | "excel") => {
    setDownloadingFormat(format);
    try {
      const url = format === "pdf" 
        ? "/api/v1/client/reports/export_pdf/" 
        : "/api/v1/client/reports/export_excel/";
      
      const response = await apiClient.get(url, { responseType: "blob" });
      
      const mimeType = format === "pdf" ? "text/html" : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
      const extension = format === "pdf" ? "html" : "xlsx";
      const blob = new Blob([response.data], { type: mimeType });
      const fileUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = fileUrl;
      link.setAttribute("download", `TaskSphere_Report_${new Date().toISOString().split("T")[0]}.${extension}`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(fileUrl);
      addToast("success", `✅ ${format.toUpperCase()} report downloaded successfully!`);
    } catch (err) {
      addToast("error", `❌ Export failed. Make sure the backend server is running.`);
    } finally {
      setDownloadingFormat(null);
    }
  };

  const handleCSVExport = () => {
    setDownloadingFormat("csv");
    try {
      // Client-side CSV generation from report summary data
      const rows = [
        ["Metric", "Value", "Generated"],
        ["Total Hours Logged", summary?.total_hours ?? 0, new Date().toISOString()],
        ["Billable Hours", summary?.billable_hours ?? 0, ""],
        ["Utilization Rate", `${summary?.utilization_rate ?? 0}%`, ""],
        ["Timesheet Entries", summary?.timesheet_count ?? 0, ""],
      ];
      const csvContent = rows.map(r => r.join(",")).join("\n");
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `TaskSphere_Summary_${new Date().toISOString().split("T")[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      addToast("success", "✅ CSV summary exported successfully!");
    } catch {
      addToast("error", "❌ CSV export failed.");
    } finally {
      setDownloadingFormat(null);
    }
  };


  return (
    <ProtectedRoute>
      <div className="p-6 space-y-6 max-w-6xl mx-auto text-foreground select-none relative pb-20">
        
        {/* Top Header Row */}
        <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-[#2d2d34]/60 pb-5 gap-4">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-white flex items-center gap-2.5">
              <FileText className="h-6 w-6 text-indigo-500" />
              <span>Workspace Reports</span>
            </h1>
            <p className="text-xs text-[#8e8e95] mt-1 leading-relaxed">
              Access project roadmaps, team productivity metrics, financial ratios, and download official exports.
            </p>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => handleExport("pdf")}
              disabled={downloadingFormat !== null}
              className="inline-flex items-center gap-1.5 py-2 px-3 border border-[#2d2d34]/60 text-[10px] font-bold uppercase tracking-wider rounded-lg bg-[#1c1c1f] hover:bg-[#28282c] transition focus:outline-none"
            >
              <Download className="h-3.5 w-3.5" />
              <span>{downloadingFormat === "pdf" ? "Syncing..." : "Export PDF"}</span>
            </button>
          </div>
        </div>

        {/* SCREEN 1: EXECUTIVE REPORTS (Unified Dashboard Snapshot) */}
        <section className="bg-[#1c1c1f]/40 border border-[#2d2d34]/60 p-5 rounded-2xl space-y-4">
          <div className="border-b border-[#2d2d34]/40 pb-2">
            <h2 className="text-xs font-bold text-white uppercase tracking-wider">Executive Reports</h2>
            <p className="text-[9px] text-[#8e8e95] mt-0.5">High-level corporate snapshot of workspace allocations, metrics, and financials</p>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 animate-pulse">
              {[1, 2, 3, 4].map(n => (
                <div key={n} className="h-16 bg-[#121214] rounded-lg" />
              ))}
            </div>
          ) : error ? (
            <div className="flex items-center gap-2 bg-[#2a1b1b] border border-rose-500/20 text-rose-400 p-3 rounded-xl text-xs">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>Failed to load reporting dashboard data. Check workspace settings.</span>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
              <div className="bg-[#121214]/60 border border-[#1f1f23] p-3 rounded-lg">
                <span className="text-[9px] text-[#8e8e95] uppercase font-bold block">Total Logged Time</span>
                <span className="text-lg font-black text-white mt-1 block">
                  {summary?.total_hours || 0} hrs
                </span>
              </div>

              <div className="bg-[#121214]/60 border border-[#1f1f23] p-3 rounded-lg">
                <span className="text-[9px] text-[#8e8e95] uppercase font-bold block">Billable Hours</span>
                <span className="text-lg font-black text-white mt-1 block">
                  {summary?.billable_hours || 0} hrs
                </span>
              </div>

              <div className="bg-[#121214]/60 border border-[#1f1f23] p-3 rounded-lg">
                <span className="text-[9px] text-[#8e8e95] uppercase font-bold block">Utilization Rate</span>
                <span className="text-lg font-black text-indigo-400 mt-1 block">
                  {summary?.utilization_rate || 0}%
                </span>
              </div>

              <div className="bg-[#121214]/60 border border-[#1f1f23] p-3 rounded-lg">
                <span className="text-[9px] text-[#8e8e95] uppercase font-bold block">Timesheets Logged</span>
                <span className="text-lg font-black text-white mt-1 block">
                  {summary?.timesheet_count || 0} entries
                </span>
              </div>
            </div>
          )}
        </section>

        {/* Modules Tab Selection */}
        <div className="bg-[#1c1c1f] p-1.5 border border-[#2d2d34]/60 rounded-2xl flex gap-1 overflow-x-auto max-w-full no-scrollbar">
          {(["project", "productivity", "financial", "timesheet", "exports"] as ReportModule[]).map((mod) => (
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
        {/* MODULE 1: PROJECT REPORTS -> Project Reports Screen           */}
        {/* ------------------------------------------------------------- */}
        {activeModule === "project" && (
          <div className="space-y-6">
            
            {/* Screen Header */}
            <div className="flex flex-col gap-1 border-b border-[#2d2d34]/40 pb-3">
              <h2 className="text-lg font-black text-white">Project Reports</h2>
              <p className="text-xs text-[#8e8e95]">Track sprint delivery timelines, milestone completion rates, and roadblocks</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Chart */}
              <div className="md:col-span-2 bg-[#1c1c1f]/40 border border-[#2d2d34]/60 p-5 rounded-2xl space-y-4">
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">Weekly Work Breakdown</h3>
                <div className="h-44 bg-[#121214]/60 border border-[#1f1f23] rounded-xl flex items-end justify-between p-6">
                  {[60, 45, 80, 55, 95, 30, 70].map((val, idx) => (
                    <div key={idx} className="flex flex-col items-center gap-1.5 w-8">
                      <div 
                        style={{ height: `${val}%` }} 
                        className="w-full bg-gradient-to-t from-indigo-600 to-indigo-400 rounded-t hover:opacity-85 transition cursor-pointer"
                      />
                      <span className="text-[9px] text-[#8e8e95] uppercase font-bold font-mono">
                        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"][idx]}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Status details */}
              <div className="bg-[#1c1c1f]/40 border border-[#2d2d34]/60 p-5 rounded-2xl flex flex-col justify-between">
                <div>
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider">Delivery Health</h3>
                  <p className="text-[10px] text-[#8e8e95] mt-0.5">Summary of sprint milestones</p>
                </div>

                <div className="space-y-2.5 pt-4 text-xs">
                  <div className="flex justify-between items-center py-1.5 border-b border-[#2d2d34]/30">
                    <span className="text-[#8e8e95]">Completed Milestones</span>
                    <strong className="text-white">8 / 10</strong>
                  </div>
                  <div className="flex justify-between items-center py-1.5 border-b border-[#2d2d34]/30">
                    <span className="text-[#8e8e95]">Active Roadblocks</span>
                    <strong className="text-amber-500">1 Blocker</strong>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[#8e8e95]">Sprint Phase</span>
                    <span className="text-indigo-400 font-bold">Release Candidate</span>
                  </div>
                </div>
              </div>
            </div>

          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* MODULE 2: PRODUCTIVITY REPORTS -> Productivity Reports Screen */}
        {/* ------------------------------------------------------------- */}
        {activeModule === "productivity" && (
          <div className="space-y-6">
            
            {/* Screen Header */}
            <div className="flex flex-col gap-1 border-b border-[#2d2d34]/40 pb-3">
              <h2 className="text-lg font-black text-white">Productivity Reports</h2>
              <p className="text-xs text-[#8e8e95]">View team focus session totals, average context switches, and daily streaks</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              {/* Focus stats */}
              <div className="bg-[#1c1c1f]/40 border border-[#2d2d34]/60 p-5 rounded-2xl flex flex-col justify-between">
                <div>
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider">Focus Streaks</h3>
                  <p className="text-[10px] text-[#8e8e95] mt-0.5">Average team streaking indices</p>
                </div>

                <div className="space-y-3 pt-4 text-xs">
                  <div className="flex justify-between items-center py-1.5 border-b border-[#2d2d34]/30">
                    <span className="text-[#8e8e95] flex items-center gap-1"><Flame className="h-3.5 w-3.5 text-amber-500" /> Active Streaks</span>
                    <strong className="text-white">5 Days</strong>
                  </div>

                  <div className="flex justify-between items-center py-1.5 border-b border-[#2d2d34]/30">
                    <span className="text-[#8e8e95] flex items-center gap-1"><Activity className="h-3.5 w-3.5 text-indigo-400" /> Focus Time (Avg)</span>
                    <strong className="text-white">2.5 hrs/day</strong>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-[#8e8e95]">Context Switches</span>
                    <span className="text-emerald-400 font-bold">Low (1.2/hr)</span>
                  </div>
                </div>
              </div>

              {/* Weekly deep focus velocity chart */}
              <div className="md:col-span-2 bg-[#1c1c1f]/40 border border-[#2d2d34]/60 p-5 rounded-2xl space-y-4">
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">Deep Work Hours Velocity</h3>
                <div className="h-44 bg-[#121214]/60 border border-[#1f1f23] rounded-xl flex items-end justify-between p-6">
                  {[40, 65, 50, 75, 90, 20, 35].map((val, idx) => (
                    <div key={idx} className="flex flex-col items-center gap-1.5 w-8">
                      <div 
                        style={{ height: `${val}%` }} 
                        className="w-full bg-indigo-500/80 hover:bg-indigo-500 transition-all rounded-t"
                      />
                      <span className="text-[9px] text-[#8e8e95] uppercase font-bold font-mono">
                        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"][idx]}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

            </div>

          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* MODULE 3: FINANCIAL REPORTS -> Financial Reports Screen       */}
        {/* ------------------------------------------------------------- */}
        {activeModule === "financial" && (
          <div className="space-y-6">
            
            {/* Screen Header */}
            <div className="flex flex-col gap-1 border-b border-[#2d2d34]/40 pb-3">
              <h2 className="text-lg font-black text-white">Financial Reports</h2>
              <p className="text-xs text-[#8e8e95]">Sprint billing metrics, invoice tracking, and billability percentages</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Allocations Donut */}
              <div className="bg-[#1c1c1f]/40 border border-[#2d2d34]/60 p-5 rounded-2xl space-y-4 flex flex-col justify-between">
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">Time Billability Allocations</h3>
                
                <div className="h-32 flex items-center justify-center relative">
                  <div className="h-24 w-24 rounded-full border-8 border-indigo-600 border-t-indigo-400 border-l-zinc-800" />
                  <div className="absolute text-center space-y-0.5">
                    <span className="text-lg font-black text-white">82%</span>
                    <span className="text-[8px] text-[#8e8e95] block uppercase font-bold">Billable</span>
                  </div>
                </div>
                
                <div className="space-y-1.5 text-[10px] font-semibold text-[#8e8e95]">
                  <div className="flex items-center justify-between border-b border-[#2d2d34]/30 pb-1">
                    <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-indigo-500" /> Billable Project Hours</span>
                    <span className="text-white">82%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-zinc-700" /> Non-billable internal R&D</span>
                    <span className="text-white">18%</span>
                  </div>
                </div>
              </div>

              {/* Financial values list */}
              <div className="md:col-span-2 bg-[#1c1c1f]/40 border border-[#2d2d34]/60 p-5 rounded-2xl space-y-4">
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">Invoice Summaries</h3>
                
                <div className="space-y-2 text-xs">
                  <div className="p-3 bg-[#121214]/60 border border-[#1f1f23] rounded-xl flex justify-between items-center">
                    <div>
                      <span className="font-bold text-white block">Q2 Development Milestones</span>
                      <span className="text-[9px] text-[#8e8e95] block">Due Date: 2026-06-30</span>
                    </div>
                    <span className="font-mono font-black text-indigo-400 text-sm">$12,000.00</span>
                  </div>

                  <div className="p-3 bg-[#121214]/60 border border-[#1f1f23] rounded-xl flex justify-between items-center">
                    <div>
                      <span className="font-bold text-white block">Design Wireframes & blueprints</span>
                      <span className="text-[9px] text-[#8e8e95] block">Paid Date: 2026-05-15</span>
                    </div>
                    <span className="font-mono font-bold text-emerald-400 text-sm">$4,500.00 (PAID)</span>
                  </div>
                </div>
              </div>
            </div>

          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* MODULE 4: TIMESHEET REPORTS -> Resource Utilization Screen    */}
        {/* ------------------------------------------------------------- */}
        {activeModule === "timesheet" && (
          <div className="space-y-6">
            
            {/* Screen Header */}
            <div className="flex flex-col gap-1 border-b border-[#2d2d34]/40 pb-3">
              <h2 className="text-lg font-black text-white">Resource Utilization</h2>
              <p className="text-xs text-[#8e8e95]">Workspace capacity limits, workloads distribution, and logged hours sheets</p>
            </div>

            <div className="bg-[#1c1c1f]/40 border border-[#2d2d34]/60 p-5 rounded-2xl space-y-4">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">Resource Allocation workloads</h3>
              
              <div className="space-y-3">
                <div className="p-3.5 bg-[#121214]/60 border border-[#1f1f23] rounded-xl text-xs space-y-2">
                  <div className="flex justify-between items-center">
                    <div>
                      <span className="font-bold text-white block">Frontend Engineering Team</span>
                      <span className="text-[9px] text-[#8e8e95] block">SaaS Dashboard components</span>
                    </div>
                    <span className="font-mono text-[#8e8e95] font-bold">6.8h / 8.0h (85%)</span>
                  </div>
                  <div className="w-full bg-[#121214] border border-[#2d2d34]/60 rounded-full h-1">
                    <div className="h-full bg-indigo-500" style={{ width: "85%" }} />
                  </div>
                </div>

                <div className="p-3.5 bg-[#121214]/60 border border-[#1f1f23] rounded-xl text-xs space-y-2">
                  <div className="flex justify-between items-center">
                    <div>
                      <span className="font-bold text-white block">Backend Platform Team</span>
                      <span className="text-[9px] text-[#8e8e95] block">Postgres Database migration</span>
                    </div>
                    <span className="font-mono text-rose-400 font-bold">9.2h / 8.0h (115% - OVERLOAD)</span>
                  </div>
                  <div className="w-full bg-[#121214] border border-[#2d2d34]/60 rounded-full h-1">
                    <div className="h-full bg-rose-500" style={{ width: "100%" }} />
                  </div>
                </div>
              </div>
            </div>

          </div>
        )}

        {/* MODULE 5: EXPORTS ─ Premium Export Center */}
        {activeModule === "exports" && (
          <div className="space-y-6">
            <div className="flex flex-col gap-1 border-b border-[#2d2d34]/40 pb-3">
              <h2 className="text-lg font-black text-white">Export Center</h2>
              <p className="text-xs text-[#8e8e95]">Download workspace reports as PDF, Excel, or CSV — all data is scoped to your active organization.</p>
            </div>

            {/* Format cards grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

              {/* PDF Card */}
              <button
                onClick={() => handleExport("pdf")}
                disabled={downloadingFormat !== null}
                className="group relative p-5 bg-[#1c1c1f]/60 border border-[#2d2d34]/60 hover:border-indigo-500/40 hover:bg-[#1c1c1f] transition-all rounded-2xl flex flex-col gap-4 text-left disabled:opacity-60"
              >
                <div className="flex items-start justify-between">
                  <div className="p-3 bg-gradient-to-br from-indigo-500/20 to-purple-500/20 rounded-xl border border-indigo-500/20">
                    <FileText className="h-6 w-6 text-indigo-400" />
                  </div>
                  {downloadingFormat === "pdf" ? (
                    <Loader2 className="h-4 w-4 text-indigo-400 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4 text-[#8e8e95] group-hover:text-indigo-400 transition" />
                  )}
                </div>
                <div>
                  <span className="font-bold text-white text-sm block">PDF Report</span>
                  <span className="text-[10px] text-[#8e8e95] mt-1 block leading-relaxed">
                    Styled HTML report with all timesheet entries, summaries and charts — ready to print or share.
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 bg-indigo-500/10 text-indigo-400 rounded-full">.HTML / PDF-ready</span>
                </div>
              </button>

              {/* Excel Card */}
              <button
                onClick={() => handleExport("excel")}
                disabled={downloadingFormat !== null}
                className="group relative p-5 bg-[#1c1c1f]/60 border border-[#2d2d34]/60 hover:border-emerald-500/40 hover:bg-[#1c1c1f] transition-all rounded-2xl flex flex-col gap-4 text-left disabled:opacity-60"
              >
                <div className="flex items-start justify-between">
                  <div className="p-3 bg-gradient-to-br from-emerald-500/20 to-teal-500/20 rounded-xl border border-emerald-500/20">
                    <FileSpreadsheet className="h-6 w-6 text-emerald-400" />
                  </div>
                  {downloadingFormat === "excel" ? (
                    <Loader2 className="h-4 w-4 text-emerald-400 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4 text-[#8e8e95] group-hover:text-emerald-400 transition" />
                  )}
                </div>
                <div>
                  <span className="font-bold text-white text-sm block">Excel Spreadsheet</span>
                  <span className="text-[10px] text-[#8e8e95] mt-1 block leading-relaxed">
                    Full .xlsx workbook with detailed timesheet rows and a summary sheet — up to 500 entries.
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 bg-emerald-500/10 text-emerald-400 rounded-full">.XLSX</span>
                </div>
              </button>

              {/* CSV Card */}
              <button
                onClick={handleCSVExport}
                disabled={downloadingFormat !== null}
                className="group relative p-5 bg-[#1c1c1f]/60 border border-[#2d2d34]/60 hover:border-amber-500/40 hover:bg-[#1c1c1f] transition-all rounded-2xl flex flex-col gap-4 text-left disabled:opacity-60"
              >
                <div className="flex items-start justify-between">
                  <div className="p-3 bg-gradient-to-br from-amber-500/20 to-orange-500/20 rounded-xl border border-amber-500/20">
                    <BarChart2 className="h-6 w-6 text-amber-400" />
                  </div>
                  {downloadingFormat === "csv" ? (
                    <Loader2 className="h-4 w-4 text-amber-400 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4 text-[#8e8e95] group-hover:text-amber-400 transition" />
                  )}
                </div>
                <div>
                  <span className="font-bold text-white text-sm block">CSV Summary</span>
                  <span className="text-[10px] text-[#8e8e95] mt-1 block leading-relaxed">
                    Quick metrics snapshot exported as comma-separated values — works offline, no server needed.
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 bg-amber-500/10 text-amber-400 rounded-full">.CSV · Client-side</span>
                </div>
              </button>
            </div>

            {/* Print row */}
            <button
              onClick={() => window.print()}
              className="w-full p-4 bg-[#1c1c1f]/40 border border-[#2d2d34]/60 hover:border-[#3d3d44] transition rounded-2xl flex items-center justify-between text-xs text-left"
            >
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-zinc-800 rounded-xl">
                  <Printer className="h-5 w-5 text-zinc-300" />
                </div>
                <div>
                  <span className="font-bold text-white text-sm block">Print Page</span>
                  <span className="text-[10px] text-[#8e8e95] mt-0.5 block">Send the current page to any connected printer or save as PDF via the browser print dialog.</span>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-[#8e8e95]" />
            </button>

            {/* Info box */}
            <div className="p-4 bg-indigo-500/5 border border-indigo-500/20 rounded-2xl flex items-start gap-3">
              <AlertCircle className="h-4 w-4 text-indigo-400 shrink-0 mt-0.5" />
              <div className="text-[10px] text-[#8e8e95] leading-relaxed">
                <strong className="text-indigo-400">PDF & Excel</strong> exports require the Django backend to be running at{" "}
                <code className="text-indigo-300 bg-indigo-500/10 px-1 py-0.5 rounded">localhost:8000</code>.
                The <strong className="text-amber-400">CSV</strong> export works entirely in your browser without a backend connection.
              </div>
            </div>
          </div>
        )}

      </div>

      {/* Toast notifications */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 pointer-events-none">
        {toasts.map(toast => (
          <div
            key={toast.id}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl border text-xs font-semibold animate-in slide-in-from-bottom-4 ${
              toast.type === "success"
                ? "bg-emerald-950 border-emerald-500/40 text-emerald-300"
                : toast.type === "error"
                ? "bg-rose-950 border-rose-500/40 text-rose-300"
                : "bg-indigo-950 border-indigo-500/40 text-indigo-300"
            }`}
          >
            {toast.type === "success" ? (
              <CheckCircle2 className="h-4 w-4 shrink-0" />
            ) : toast.type === "error" ? (
              <XCircle className="h-4 w-4 shrink-0" />
            ) : (
              <AlertCircle className="h-4 w-4 shrink-0" />
            )}
            <span>{toast.message}</span>
          </div>
        ))}
      </div>
    </ProtectedRoute>
  );
}

