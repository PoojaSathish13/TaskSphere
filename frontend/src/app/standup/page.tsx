"use client";

import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/infrastructure/api/api-client";
import { ProtectedRoute } from "@/features/rbac/components/ProtectedRoute";
import { useAuthStore } from "@/infrastructure/store/auth-store";
import { 
  Calendar, 
  Activity, 
  Send, 
  Copy, 
  Sparkles, 
  Users, 
  FileText, 
  AlertCircle, 
  CheckCircle,
  HelpCircle,
  Clock,
  ArrowRight,
  ShieldAlert,
  Flame,
  Award,
  CheckCircle2,
  AlertTriangle
} from "lucide-react";

interface StandupItem {
  id: string;
  user_email: string;
  user_name: string;
  date: string;
  yesterday_text: string;
  today_text: string;
  blockers_text: string;
  created_at: string;
}

interface AttendanceReport {
  total_members: number;
  submitted_count: number;
  missing_count: number;
  missing_list: Array<{ email: string; name: string }>;
}

interface AiSummaryReport {
  summary: string;
}

export default function StandupPage() {
  const queryClient = useQueryClient();
  const { user, activeOrganizationId } = useAuthStore();

  const [yesterdayText, setYesterdayText] = useState("");
  const [todayText, setTodayText] = useState("");
  const [blockersText, setBlockersText] = useState("");
  
  // Date selector for history lookup
  const todayStr = new Date().toISOString().split("T")[0];
  const [selectedDate, setSelectedDate] = useState(todayStr);

  // Local notifications
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Auto-save status state
  const [draftStatus, setDraftStatus] = useState<"idle" | "saved">("idle");

  // Query: Fetch team standups for the selected date
  const { data: standups = [], isLoading } = useQuery<StandupItem[]>({
    queryKey: ["daily-standups", selectedDate, activeOrganizationId],
    queryFn: async () => {
      const res = await apiClient.get(`/api/v1/standups/?date=${selectedDate}`);
      return res.data.data || [];
    }
  });

  // Query: Fetch Team Attendance stats for today
  const { data: attendance = { total_members: 0, submitted_count: 0, missing_count: 0, missing_list: [] } } = useQuery<AttendanceReport>({
    queryKey: ["standup-attendance", activeOrganizationId],
    queryFn: async () => {
      const res = await apiClient.get("/api/v1/standups/attendance/");
      return res.data;
    }
  });

  // Query: Fetch AI Summary Report for today
  const { data: aiSummary = { summary: "" }, isFetching: isAiLoading, refetch: fetchAiSummary } = useQuery<AiSummaryReport>({
    queryKey: ["standup-ai-summary", activeOrganizationId],
    queryFn: async () => {
      const res = await apiClient.get("/api/v1/standups/ai-summary/");
      return res.data;
    },
    enabled: false // Trigger manually on click
  });

  // Check if current user has submitted today
  const userTodayStandup = standups.find(s => s.user_email === user?.email);

  // Load drafts on mount
  useEffect(() => {
    if (!userTodayStandup && selectedDate === todayStr) {
      const yDraft = localStorage.getItem("standup_yesterday");
      const tDraft = localStorage.getItem("standup_today");
      const bDraft = localStorage.getItem("standup_blockers");
      if (yDraft) setYesterdayText(yDraft);
      if (tDraft) setTodayText(tDraft);
      if (bDraft) setBlockersText(bDraft);
    }
  }, [selectedDate]);

  // Sync inputs if user already submitted today
  useEffect(() => {
    if (userTodayStandup && selectedDate === todayStr) {
      setYesterdayText(userTodayStandup.yesterday_text);
      setTodayText(userTodayStandup.today_text);
      setBlockersText(userTodayStandup.blockers_text);
    }
  }, [userTodayStandup, selectedDate]);

  // Auto-save changes to localStorage
  const handleInputChange = (field: "yesterday" | "today" | "blockers", value: string) => {
    if (selectedDate !== todayStr || userTodayStandup) {
      if (field === "yesterday") setYesterdayText(value);
      if (field === "today") setTodayText(value);
      if (field === "blockers") setBlockersText(value);
      return;
    }

    setDraftStatus("idle");
    if (field === "yesterday") {
      setYesterdayText(value);
      localStorage.setItem("standup_yesterday", value);
    }
    if (field === "today") {
      setTodayText(value);
      localStorage.setItem("standup_today", value);
    }
    if (field === "blockers") {
      setBlockersText(value);
      localStorage.setItem("standup_blockers", value);
    }
    setTimeout(() => setDraftStatus("saved"), 600);
  };

  // Mutation: Fetch pre-populated draft from active workspace tasks
  const generateDraftMutation = useMutation({
    mutationFn: async () => {
      const res = await apiClient.get("/api/v1/standups/generate-draft/");
      return res.data;
    },
    onSuccess: (data) => {
      handleInputChange("yesterday", data.yesterday_text || "No completed tasks logged yesterday.");
      handleInputChange("today", data.today_text || "No tasks planned for today.");
      handleInputChange("blockers", data.blockers_text || "No active blockers.");
      showToast("Auto-generated draft from your active tasks and blockers", "success");
    },
    onError: () => {
      showToast("Failed to fetch standup draft details", "error");
    }
  });

  // Mutation: Submit Standup
  const submitStandupMutation = useMutation({
    mutationFn: async (payload: { yesterday_text: string; today_text: string; blockers_text: string }) => {
      const today = new Date().toISOString().split("T")[0];
      if (userTodayStandup) {
        const res = await apiClient.put(`/api/v1/standups/${userTodayStandup.id}/`, {
          date: today,
          ...payload
        });
        return res.data.data;
      } else {
        const res = await apiClient.post("/api/v1/standups/", {
          date: today,
          ...payload
        });
        return res.data.data;
      }
    },
    onSuccess: () => {
      showToast("Daily standup logged successfully", "success");
      // Clear drafts
      localStorage.removeItem("standup_yesterday");
      localStorage.removeItem("standup_today");
      localStorage.removeItem("standup_blockers");
      queryClient.invalidateQueries({ queryKey: ["daily-standups"] });
      queryClient.invalidateQueries({ queryKey: ["standup-attendance"] });
    },
    onError: () => {
      showToast("Failed to log standup entry", "error");
    }
  });

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!yesterdayText.trim() || !todayText.trim()) {
      showToast("Please provide details for Yesterday and Today", "error");
      return;
    }

    submitStandupMutation.mutate({
      yesterday_text: yesterdayText,
      today_text: todayText,
      blockers_text: blockersText
    });
  };

  const handleCopyToClipboard = () => {
    const markdown = `### Daily Standup - ${selectedDate}
**Yesterday's Work:**
${yesterdayText || "No entry"}

**Today's Plan:**
${todayText || "No entry"}

**Active Blockers:**
${blockersText || "No blockers"}`;

    navigator.clipboard.writeText(markdown).then(() => {
      showToast("Markdown copied to clipboard!", "success");
    });
  };

  if (isLoading) {
    return <div className="p-8 text-center text-xs animate-pulse text-muted-foreground">Standup center loading...</div>;
  }

  return (
    <ProtectedRoute>
      <main className="space-y-6 pb-12">
        {/* Toast Alert */}
        {toast && (
          <div className={`fixed bottom-5 right-5 z-50 p-4 rounded-xl border shadow-xl flex items-center gap-2 text-xs font-bold bg-popover text-popover-foreground ${
            toast.type === "success" ? "border-emerald-500/40 text-emerald-400" : "border-rose-500/40 text-rose-400"
          }`}>
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{toast.message}</span>
          </div>
        )}

        {/* Header */}
        <header className="border-b border-border pb-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight flex items-center gap-2">
              Daily Standups
              <span className="text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center gap-1">
                <Users className="h-3.5 w-3.5" /> Team Sync
              </span>
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              Submit status updates, auto-generate logs from active task checklists, and view team sync reports.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="flex items-center gap-1.5 bg-muted/20 border border-border/80 rounded-lg px-2.5 py-1.5 text-xs font-semibold">
              <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-transparent border-0 text-[11px] font-bold focus:outline-none cursor-pointer text-foreground"
              />
            </div>

            <button
              onClick={handleCopyToClipboard}
              className="flex items-center gap-1.5 border text-xs font-semibold px-3 py-2 rounded-lg bg-card hover:bg-muted transition focus:outline-none"
            >
              <Copy className="h-3.5 w-3.5" />
              <span>Copy Markdown</span>
            </button>
          </div>
        </header>

        {/* Missing standup warning banner */}
        {!userTodayStandup && selectedDate === todayStr && (
          <div className="bg-amber-950/20 border border-amber-900/50 text-amber-400 p-3.5 rounded-xl flex gap-3 text-xs">
            <Clock className="h-4 w-4 shrink-0" />
            <div>
              <span className="font-semibold uppercase tracking-wider text-[10px]">Standup Reminder</span>
              <p className="mt-0.5">You have not submitted a standup report for today. Complete the form below to update your team.</p>
            </div>
          </div>
        )}

        {/* Manager Dashboard Stats */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 bg-card border rounded-xl shadow-sm flex items-center gap-3">
            <div className="p-2.5 bg-indigo-500/10 rounded-lg text-indigo-400 shrink-0">
              <Users className="h-4 w-4" />
            </div>
            <div>
              <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Total Members</span>
              <p className="text-xl font-bold font-mono">{attendance.total_members}</p>
            </div>
          </div>

          <div className="p-4 bg-card border rounded-xl shadow-sm flex items-center gap-3">
            <div className="p-2.5 bg-emerald-500/10 rounded-lg text-emerald-400 shrink-0">
              <CheckCircle2 className="h-4 w-4" />
            </div>
            <div>
              <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Submitted Today</span>
              <p className="text-xl font-bold font-mono text-emerald-400">{attendance.submitted_count}</p>
            </div>
          </div>

          <div className="p-4 bg-card border rounded-xl shadow-sm flex items-center gap-3">
            <div className="p-2.5 bg-rose-500/10 rounded-lg text-rose-400 shrink-0">
              <AlertTriangle className="h-4 w-4" />
            </div>
            <div>
              <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Missing Logs</span>
              <p className="text-xl font-bold font-mono text-rose-400">{attendance.missing_count}</p>
            </div>
          </div>

          <div className="p-4 bg-card border rounded-xl shadow-sm flex items-center gap-3">
            <div className="p-2.5 bg-indigo-500/10 rounded-lg text-indigo-400 shrink-0">
              <Activity className="h-4 w-4" />
            </div>
            <div>
              <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Sync Ratio</span>
              <p className="text-xl font-bold font-mono text-indigo-400">
                {attendance.total_members > 0 
                  ? `${Math.round((attendance.submitted_count / attendance.total_members) * 100)}%` 
                  : "0%"}
              </p>
            </div>
          </div>
        </section>

        {/* AI summary center */}
        <section className="bg-card border rounded-xl p-5 shadow-sm space-y-4">
          <div className="flex justify-between items-center border-b pb-2">
            <div>
              <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">AI Team Standup Synthesis</h2>
              <p className="text-[9px] text-muted-foreground mt-0.5">Summarize submitted logs via automated synthesis</p>
            </div>

            <button
              onClick={() => fetchAiSummary()}
              disabled={isAiLoading}
              className="flex items-center gap-1 text-[10px] font-bold text-white bg-indigo-600 rounded px-2.5 py-1.5 hover:bg-indigo-700 transition"
            >
              <Sparkles className="h-3 w-3" />
              <span>{isAiLoading ? "Synthesizing Summary..." : "Generate AI Summary"}</span>
            </button>
          </div>

          {aiSummary.summary ? (
            <div className="p-4 bg-muted/20 border border-border/40 rounded-lg text-xs leading-relaxed text-foreground whitespace-pre-line">
              {aiSummary.summary}
            </div>
          ) : (
            <div className="text-center text-xs text-muted-foreground py-6 border border-dashed rounded-lg">
              Click the button to generate a structured AI sync summary for today's submissions.
            </div>
          )}
        </section>

        {/* Board grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Submission Form (Col-span-5) */}
          <section className="lg:col-span-5 bg-card border rounded-xl p-5 shadow-sm space-y-4 flex flex-col">
            <div className="flex justify-between items-center border-b pb-2">
              <div>
                <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-wider">My Status Report</h2>
                <p className="text-[10px] text-muted-foreground mt-0.5">Log standup for today</p>
              </div>
              
              {selectedDate === todayStr && (
                <div className="flex items-center gap-2">
                  {draftStatus === "saved" && (
                    <span className="text-[9px] text-muted-foreground italic">Draft Saved</span>
                  )}
                  <button
                    onClick={() => generateDraftMutation.mutate()}
                    className="flex items-center gap-1 text-[10px] font-bold text-indigo-400 bg-indigo-950/20 border border-indigo-900/40 rounded px-2.5 py-1 hover:bg-indigo-950/40 transition"
                  >
                    <Sparkles className="h-3 w-3" /> Auto-Fill
                  </button>
                </div>
              )}
            </div>

            <form onSubmit={handleFormSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Yesterday: Completed Work</label>
                <textarea
                  value={yesterdayText}
                  onChange={(e) => handleInputChange("yesterday", e.target.value)}
                  placeholder="Summarize what tasks you resolved yesterday..."
                  rows={3}
                  className="w-full bg-muted/20 border border-border rounded-lg p-2.5 text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none resize-none leading-relaxed"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Today: Planned Work</label>
                <textarea
                  value={todayText}
                  onChange={(e) => handleInputChange("today", e.target.value)}
                  placeholder="Outline what targets you aim to resolve today..."
                  rows={3}
                  className="w-full bg-muted/20 border border-border rounded-lg p-2.5 text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none resize-none leading-relaxed"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground font-mono text-rose-400">Blockers: Current Issues</label>
                <textarea
                  value={blockersText}
                  onChange={(e) => handleInputChange("blockers", e.target.value)}
                  placeholder="Detail any active blocking elements or QA/DevOps dependencies..."
                  rows={2}
                  className="w-full bg-muted/20 border border-border rounded-lg p-2.5 text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none resize-none leading-relaxed"
                />
              </div>

              {selectedDate === todayStr ? (
                <button
                  type="submit"
                  className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold text-xs transition flex items-center justify-center gap-1.5"
                >
                  <Send className="h-3.5 w-3.5" /> Submit Daily Standup
                </button>
              ) : (
                <div className="text-center text-[10px] text-muted-foreground py-2 border rounded bg-muted/10 font-semibold">
                  Historical logs are read-only. Select today to update standup.
                </div>
              )}
            </form>
          </section>

          {/* Team View Panel (Col-span-7) */}
          <section className="lg:col-span-7 bg-card border rounded-xl p-5 shadow-sm space-y-4 flex flex-col">
            <div>
              <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Team Sync board</h2>
              <p className="text-[10px] text-muted-foreground mt-0.5">Active team standups submitted for {selectedDate}</p>
            </div>

            <div className="space-y-4 overflow-y-auto max-h-[460px] pr-1">
              {standups.length === 0 ? (
                <div className="p-12 text-center text-xs text-muted-foreground border border-dashed rounded-lg flex flex-col justify-center h-48">
                  No standups logged for this date.
                </div>
              ) : (
                standups.map((s) => (
                  <div key={s.id} className="p-4 bg-muted/10 border border-border/50 rounded-xl text-xs space-y-3">
                    <div className="flex justify-between items-center border-b pb-2 border-border/30">
                      <span className="font-bold text-foreground">{s.user_name}</span>
                      <span className="font-mono text-[9px] text-muted-foreground">{s.user_email}</span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 leading-relaxed text-[11px]">
                      <div>
                        <span className="text-[9px] uppercase font-bold tracking-widest text-indigo-400 block mb-1">yesterday</span>
                        <p className="text-foreground whitespace-pre-line">{s.yesterday_text}</p>
                      </div>

                      <div>
                        <span className="text-[9px] uppercase font-bold tracking-widest text-indigo-400 block mb-1">today</span>
                        <p className="text-foreground whitespace-pre-line">{s.today_text}</p>
                      </div>

                      <div>
                        <span className="text-[9px] uppercase font-bold tracking-widest text-rose-400 block mb-1 font-mono">blockers</span>
                        <p className="text-foreground whitespace-pre-line">{s.blockers_text || "No active blockers."}</p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>

        </div>

        {/* Manager View: Missing logs directory */}
        {selectedDate === todayStr && attendance.missing_list.length > 0 && (
          <section className="bg-card border border-rose-500/25 rounded-xl p-5 shadow-sm space-y-3">
            <div>
              <h2 className="text-xs font-bold text-rose-400 uppercase tracking-wider">Awaiting Submissions ({attendance.missing_list.length})</h2>
              <p className="text-[9px] text-muted-foreground mt-0.5">Missing standups list for today's scrum</p>
            </div>

            <div className="flex flex-wrap gap-2 pt-2 border-t border-border/30">
              {attendance.missing_list.map((m, idx) => (
                <div key={idx} className="px-3 py-1 bg-rose-500/5 border border-rose-500/10 text-rose-400 rounded-lg text-xs font-semibold">
                  {m.name || m.email}
                </div>
              ))}
            </div>
          </section>
        )}
      </main>
    </ProtectedRoute>
  );
}
