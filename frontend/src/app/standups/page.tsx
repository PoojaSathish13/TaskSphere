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
  AlertCircle, 
  CheckCircle,
  Clock,
  CheckCircle2,
  AlertTriangle
} from "lucide-react";

// The 4 requested modules under Standups
type StandupModule = 
  | "daily"
  | "team"
  | "history"
  | "analytics";

const moduleLabels: Record<StandupModule, string> = {
  daily: "Daily Standup",
  team: "Team Standups",
  history: "History",
  analytics: "Analytics",
};

// The 4 requested Screens corresponding to the modules
const moduleScreens: Record<StandupModule, string> = {
  daily: "Submit Standup",
  team: "Team Standups",
  history: "Standup Timeline",
  analytics: "Standup Analytics",
};

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

  const [activeModule, setActiveModule] = useState<StandupModule>("daily");
  const [yesterdayText, setYesterdayText] = useState("");
  const [todayText, setTodayText] = useState("");
  const [blockersText, setBlockersText] = useState("");
  
  // Date selector for timeline history lookup
  const todayStr = new Date().toISOString().split("T")[0];
  const [selectedDate, setSelectedDate] = useState(todayStr);

  // Local notifications
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Auto-save draft status
  const [draftStatus, setDraftStatus] = useState<"idle" | "saved">("idle");

  // -----------------------------------------------------------------
  // Queries
  // -----------------------------------------------------------------
  
  // 1. Query: Fetch team standups for the selected date (History / Team view)
  const { data: standups = [], isLoading } = useQuery<StandupItem[]>({
    queryKey: ["daily-standups", selectedDate, activeOrganizationId],
    queryFn: async () => {
      const res = await apiClient.get(`/api/v1/standups/?date=${selectedDate}`);
      return (Array.isArray(res.data?.data) ? res.data.data : (Array.isArray(res.data) ? res.data : []));
    },
    enabled: !!activeOrganizationId
  });

  // Query: Today's standups for submission check
  const { data: todayStandups = [] } = useQuery<StandupItem[]>({
    queryKey: ["daily-standups", todayStr, activeOrganizationId],
    queryFn: async () => {
      const res = await apiClient.get(`/api/v1/standups/?date=${todayStr}`);
      return (Array.isArray(res.data?.data) ? res.data.data : (Array.isArray(res.data) ? res.data : []));
    },
    enabled: !!activeOrganizationId && activeModule === "daily"
  });

  // 2. Query: Fetch Team Attendance stats
  const { data: attendance = { total_members: 0, submitted_count: 0, missing_count: 0, missing_list: [] } } = useQuery<AttendanceReport>({
    queryKey: ["standup-attendance", activeOrganizationId],
    queryFn: async () => {
      const res = await apiClient.get("/api/v1/standups/attendance/");
      return res.data.data;
    },
    enabled: !!activeOrganizationId
  });

  // 3. Query: Fetch AI Summary Report for today
  const { data: aiSummary = { summary: "" }, isFetching: isAiLoading, refetch: fetchAiSummary } = useQuery<AiSummaryReport>({
    queryKey: ["standup-ai-summary", activeOrganizationId],
    queryFn: async () => {
      const res = await apiClient.get("/api/v1/standups/ai-summary/");
      return res.data.data;
    },
    enabled: false
  });

  // Check if current user has submitted today
  const userTodayStandup = todayStandups.find(s => s.user_email === user?.email);

  // Load drafts on mount
  useEffect(() => {
    if (!userTodayStandup && activeModule === "daily") {
      const yDraft = localStorage.getItem("standup_yesterday");
      const tDraft = localStorage.getItem("standup_today");
      const bDraft = localStorage.getItem("standup_blockers");
      if (yDraft) setYesterdayText(yDraft);
      if (tDraft) setTodayText(tDraft);
      if (bDraft) setBlockersText(bDraft);
    }
  }, [userTodayStandup, activeModule]);

  // Sync inputs if user already submitted today
  useEffect(() => {
    if (userTodayStandup && activeModule === "daily") {
      setYesterdayText(userTodayStandup.yesterday_text);
      setTodayText(userTodayStandup.today_text);
      setBlockersText(userTodayStandup.blockers_text);
    }
  }, [userTodayStandup, activeModule]);

  // Auto-save changes to localStorage
  const handleInputChange = (field: "yesterday" | "today" | "blockers", value: string) => {
    if (userTodayStandup) {
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

  // -----------------------------------------------------------------
  // Mutations
  // -----------------------------------------------------------------
  
  // Auto-populate draft from active workspace tasks
  const generateDraftMutation = useMutation({
    mutationFn: async () => {
      const res = await apiClient.get("/api/v1/standups/generate-draft/");
      return res.data.data;
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

  // Submit Standup
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

  return (
    <ProtectedRoute>
      <div className="p-6 space-y-6 max-w-6xl mx-auto text-foreground select-none relative pb-20">
        
        {/* Toast Alert */}
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
              <Users className="h-6 w-6 text-indigo-500" />
              <span>Standups Workspace</span>
            </h1>
            <p className="text-xs text-[#8e8e95] mt-1 leading-relaxed">
              Submit daily updates, sync workspace tasks checklists, and synthesize team reports.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={handleCopyToClipboard}
              className="flex items-center gap-1.5 border border-[#2d2d34]/60 text-[10px] font-bold uppercase tracking-wider px-3 py-2 rounded-lg bg-[#1c1c1f] hover:bg-[#28282c] transition focus:outline-none"
            >
              <Copy className="h-3.5 w-3.5" />
              <span>Copy Markdown</span>
            </button>
          </div>
        </div>

        {/* Dynamic Module Selection Tab Bar */}
        <div className="bg-[#1c1c1f] p-1.5 border border-[#2d2d34]/60 rounded-2xl flex gap-1 overflow-x-auto max-w-full no-scrollbar">
          {(["daily", "team", "history", "analytics"] as StandupModule[]).map((mod) => (
            <button
              key={mod}
              onClick={() => setActiveModule(mod)}
              className={`py-1.5 px-3 rounded-xl text-[10px] font-bold uppercase tracking-wider shrink-0 transition ${
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
        {/* MODULE 1: DAILY STANDUP -> Submit Standup Screen              */}
        {/* ------------------------------------------------------------- */}
        {activeModule === "daily" && (
          <div className="max-w-md mx-auto space-y-6">
            
            {/* Screen Header */}
            <div className="flex flex-col gap-1 border-b border-[#2d2d34]/40 pb-3">
              <h2 className="text-lg font-black text-white">{moduleScreens.daily}</h2>
              <p className="text-xs text-[#8e8e95]">Record and submit your daily individual scrum progress updates</p>
            </div>

            {!userTodayStandup && (
              <div className="bg-amber-950/20 border border-amber-900/50 text-amber-400 p-3.5 rounded-xl flex gap-3 text-xs">
                <Clock className="h-4 w-4 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold uppercase tracking-wider text-[10px]">Scrum Alert</span>
                  <p className="mt-0.5 leading-relaxed text-foreground">
                    You have not logged a status report for today yet. Complete the fields below.
                  </p>
                </div>
              </div>
            )}

            {userTodayStandup && (
              <div className="bg-emerald-950/20 border border-emerald-900/50 text-emerald-400 p-3.5 rounded-xl flex gap-3 text-xs">
                <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold uppercase tracking-wider text-[10px]">Log complete</span>
                  <p className="mt-0.5 leading-relaxed text-foreground">
                    You already logged a standup today. Updates made below will overwrite your active daily report.
                  </p>
                </div>
              </div>
            )}

            <div className="bg-[#1c1c1f]/40 border border-[#2d2d34]/60 p-6 rounded-2xl space-y-4">
              <div className="flex justify-between items-center border-b border-[#2d2d34]/40 pb-3">
                <div>
                  <h3 className="font-extrabold text-sm text-white uppercase tracking-wider">My Daily Standup</h3>
                  <p className="text-[9px] text-[#8e8e95] mt-0.5">Submit status report for today</p>
                </div>

                <div className="flex items-center gap-2">
                  {draftStatus === "saved" && (
                    <span className="text-[9px] text-[#8e8e95] italic">Draft Saved</span>
                  )}
                  <button
                    onClick={() => generateDraftMutation.mutate()}
                    className="flex items-center gap-1 text-[10px] font-bold text-indigo-400 bg-indigo-500/10 border border-indigo-500/25 rounded px-2.5 py-1.5 hover:bg-indigo-500/20 transition"
                  >
                    <Sparkles className="h-3 w-3" /> Auto-Fill
                  </button>
                </div>
              </div>

              <form onSubmit={handleFormSubmit} className="space-y-4 text-xs">
                <div className="space-y-1">
                  <label htmlFor="yesterdayText" className="text-[10px] uppercase font-bold tracking-wider text-[#8e8e95]">Yesterday: Completed Work</label>
                  <textarea
                    id="yesterdayText"
                    name="yesterdayText"
                    autoComplete="off"
                    value={yesterdayText}
                    onChange={(e) => handleInputChange("yesterday", e.target.value)}
                    placeholder="List completed tasks since last scrum sync..."
                    rows={3}
                    className="w-full bg-[#121214] border border-[#1f1f23] rounded-lg p-2.5 focus:outline-none focus:border-indigo-500 text-white resize-none"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label htmlFor="todayText" className="text-[10px] uppercase font-bold tracking-wider text-[#8e8e95]">Today: Planned Work</label>
                  <textarea
                    id="todayText"
                    name="todayText"
                    autoComplete="off"
                    value={todayText}
                    onChange={(e) => handleInputChange("today", e.target.value)}
                    placeholder="Outline objectives you aim to target today..."
                    rows={3}
                    className="w-full bg-[#121214] border border-[#1f1f23] rounded-lg p-2.5 focus:outline-none focus:border-indigo-500 text-white resize-none"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label htmlFor="blockersText" className="text-[10px] uppercase font-bold tracking-wider text-rose-400">Blockers: Active Blocks</label>
                  <textarea
                    id="blockersText"
                    name="blockersText"
                    autoComplete="off"
                    value={blockersText}
                    onChange={(e) => handleInputChange("blockers", e.target.value)}
                    placeholder="Detail any active blocking elements or dependencies..."
                    rows={2}
                    className="w-full bg-[#121214] border border-[#1f1f23] rounded-lg p-2.5 focus:outline-none focus:border-indigo-500 text-white resize-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitStandupMutation.isPending}
                  className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg transition flex items-center justify-center gap-1.5"
                >
                  <Send className="h-3.5 w-3.5" />
                  <span>{submitStandupMutation.isPending ? "Submitting..." : "Submit Status Report"}</span>
                </button>
              </form>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* MODULE 2: TEAM STANDUPS -> Team Standups Screen               */}
        {/* ------------------------------------------------------------- */}
        {activeModule === "team" && (
          <div className="space-y-4">
            
            {/* Screen Header */}
            <div className="flex flex-col gap-1 border-b border-[#2d2d34]/40 pb-3">
              <h2 className="text-lg font-black text-white">{moduleScreens.team}</h2>
              <p className="text-xs text-[#8e8e95]">View daily scrum updates submitted by team members</p>
            </div>

            <div className="space-y-4 max-w-4xl mx-auto">
              {isLoading ? (
                <div className="text-center py-10 text-xs animate-pulse text-muted-foreground">Loading team reports...</div>
              ) : todayStandups.length === 0 ? (
                <div className="p-12 text-center text-xs text-muted-foreground border border-dashed border-[#2d2d34]/40 rounded-2xl flex flex-col justify-center h-48">
                  No daily standup reports submitted for today yet.
                </div>
              ) : (
                todayStandups.map((s) => (
                  <div key={s.id} className="p-4 bg-[#1c1c1f]/40 border border-[#2d2d34]/60 rounded-2xl text-xs space-y-3 shadow-sm">
                    <div className="flex justify-between items-center border-b border-[#2d2d34]/40 pb-2">
                      <span className="font-extrabold text-white text-sm">{s.user_name}</span>
                      <span className="font-mono text-[9px] text-[#8e8e95]">{s.user_email}</span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 leading-relaxed text-[11px]">
                      <div className="space-y-1">
                        <span className="text-[8px] uppercase font-bold tracking-widest text-indigo-400 block">yesterday</span>
                        <p className="text-white whitespace-pre-line">{s.yesterday_text}</p>
                      </div>

                      <div className="space-y-1">
                        <span className="text-[8px] uppercase font-bold tracking-widest text-indigo-400 block">today</span>
                        <p className="text-white whitespace-pre-line">{s.today_text}</p>
                      </div>

                      <div className="space-y-1">
                        <span className="text-[8px] uppercase font-bold tracking-widest text-rose-400 block font-mono">blockers</span>
                        <p className="text-white whitespace-pre-line">{s.blockers_text || "No active blockers."}</p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* MODULE 3: HISTORY -> Standup Timeline Screen                   */}
        {/* ------------------------------------------------------------- */}
        {activeModule === "history" && (
          <div className="space-y-6">
            
            {/* Screen Header */}
            <div className="flex flex-col gap-1 border-b border-[#2d2d34]/40 pb-3">
              <h2 className="text-lg font-black text-white">{moduleScreens.history}</h2>
              <p className="text-xs text-[#8e8e95]">Look up and audit historical standup entries by date</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              
              {/* Left selector */}
              <div className="lg:col-span-4 bg-[#1c1c1f]/40 border border-[#2d2d34]/60 p-5 rounded-2xl space-y-4">
                <div>
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider">Timeline Lookup</h3>
                  <p className="text-[9px] text-[#8e8e95] mt-0.5 font-semibold">Select date to filter historical logs</p>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="space-y-1">
                    <label htmlFor="selectedDate" className="text-[10px] font-bold text-[#8e8e95] uppercase">Select Date</label>
                    <input
                      id="selectedDate"
                      name="selectedDate"
                      autoComplete="off"
                      type="date"
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                      className="w-full bg-[#121214] border border-[#1f1f23] rounded-lg p-2.5 text-xs text-white focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Right log timeline */}
              <div className="lg:col-span-8 bg-[#1c1c1f]/40 border border-[#2d2d34]/60 p-5 rounded-2xl space-y-4">
                <div>
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider">Sync Submissions</h3>
                  <p className="text-[9px] text-[#8e8e95] mt-0.5">Historical logs logged for {selectedDate}</p>
                </div>

                <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
                  {isLoading ? (
                    <div className="text-center py-8 text-xs animate-pulse text-muted-foreground">Loading sync history logs...</div>
                  ) : standups.length === 0 ? (
                    <div className="text-center text-[#8e8e95] py-12 border border-dashed border-[#2d2d34]/40 rounded-xl h-36 flex flex-col justify-center">
                      No historical logs logged for this date.
                    </div>
                  ) : (
                    standups.map((s) => (
                      <div key={s.id} className="p-4 bg-[#121214]/60 border border-[#1f1f23] rounded-xl text-xs space-y-3">
                        <div className="flex justify-between items-center border-b border-[#2d2d34]/35 pb-2">
                          <span className="font-bold text-white">{s.user_name}</span>
                          <span className="font-mono text-[9px] text-[#8e8e95]">{s.user_email}</span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 leading-normal text-[10px]">
                          <div>
                            <span className="text-[8px] uppercase font-bold text-indigo-400 block mb-1">yesterday</span>
                            <p className="text-white whitespace-pre-line">{s.yesterday_text}</p>
                          </div>
                          <div>
                            <span className="text-[8px] uppercase font-bold text-indigo-400 block mb-1">today</span>
                            <p className="text-white whitespace-pre-line">{s.today_text}</p>
                          </div>
                          <div>
                            <span className="text-[8px] uppercase font-bold text-rose-400 block mb-1 font-mono">blockers</span>
                            <p className="text-white whitespace-pre-line">{s.blockers_text || "No active blockers."}</p>
                          </div>
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
        {/* MODULE 4: ANALYTICS -> Standup Analytics Screen               */}
        {/* ------------------------------------------------------------- */}
        {activeModule === "analytics" && (
          <div className="space-y-6">
            
            {/* Screen Header */}
            <div className="flex flex-col gap-1 border-b border-[#2d2d34]/40 pb-3">
              <h2 className="text-lg font-black text-white">{moduleScreens.analytics}</h2>
              <p className="text-xs text-[#8e8e95]">Workspace member attendance rates and AI synthesis report</p>
            </div>

            {/* Attendance stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 bg-[#1c1c1f]/40 border border-[#2d2d34]/60 rounded-xl flex items-center gap-3">
                <div className="p-2.5 bg-primary/10 rounded-lg text-primary shrink-0">
                  <Users className="h-4 w-4" />
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Workspace Members</span>
                  <p className="text-xl font-bold font-mono">{attendance.total_members}</p>
                </div>
              </div>

              <div className="p-4 bg-[#1c1c1f]/40 border border-[#2d2d34]/60 rounded-xl flex items-center gap-3">
                <div className="p-2.5 bg-emerald-500/10 rounded-lg text-emerald-400 shrink-0">
                  <CheckCircle2 className="h-4 w-4" />
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Submitted Today</span>
                  <p className="text-xl font-bold font-mono text-emerald-400">{attendance.submitted_count}</p>
                </div>
              </div>

              <div className="p-4 bg-[#1c1c1f]/40 border border-[#2d2d34]/60 rounded-xl flex items-center gap-3">
                <div className="p-2.5 bg-rose-500/10 rounded-lg text-rose-400 shrink-0">
                  <AlertTriangle className="h-4 w-4" />
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Awaiting Logs</span>
                  <p className="text-xl font-bold font-mono text-rose-400">{attendance.missing_count}</p>
                </div>
              </div>

              <div className="p-4 bg-[#1c1c1f]/40 border border-[#2d2d34]/60 rounded-xl flex items-center gap-3">
                <div className="p-2.5 bg-primary/10 rounded-lg text-primary shrink-0">
                  <Activity className="h-4 w-4" />
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Sync Ratios</span>
                  <p className="text-xl font-bold font-mono text-primary">
                    {attendance.total_members > 0 
                      ? `${Math.round((attendance.submitted_count / attendance.total_members) * 100)}%` 
                      : "0%"}
                  </p>
                </div>
              </div>
            </div>

            {/* AI synthesis and Awaiting queue */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* AI synthesis */}
              <div className="bg-[#1c1c1f]/40 border border-[#2d2d34]/60 p-5 rounded-2xl space-y-4 flex flex-col">
                <div className="flex justify-between items-center border-b border-[#2d2d34]/40 pb-2">
                  <div>
                    <h3 className="text-xs font-bold text-white uppercase tracking-wider">AI Scrum Synthesis</h3>
                    <p className="text-[9px] text-[#8e8e95] mt-0.5 font-semibold">Consolidated workspace daily status summary</p>
                  </div>

                  <button
                    onClick={() => fetchAiSummary()}
                    disabled={isAiLoading}
                    className="flex items-center gap-1 text-[10px] font-bold text-white bg-indigo-600 rounded px-2.5 py-1.5 hover:bg-indigo-700 transition"
                  >
                    <Sparkles className="h-3 w-3" />
                    <span>{isAiLoading ? "Processing..." : "Generate Synthesis"}</span>
                  </button>
                </div>

                <div className="flex-1 min-h-[160px]">
                  {aiSummary.summary ? (
                    <div className="p-3 bg-[#121214]/60 border border-[#1f1f23] rounded-xl text-xs text-white leading-relaxed whitespace-pre-line max-h-[220px] overflow-y-auto pr-1">
                      {aiSummary.summary}
                    </div>
                  ) : (
                    <div className="text-center text-[10px] text-[#8e8e95]/80 py-12 border border-dashed border-[#2d2d34]/40 rounded-xl">
                      Trigger synthetic analysis of today's logged status reports.
                    </div>
                  )}
                </div>
              </div>

              {/* Awaiting submission directory */}
              <div className="bg-[#1c1c1f]/40 border border-[#2d2d34]/60 p-5 rounded-2xl space-y-4 flex flex-col justify-between h-full">
                <div>
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider">Awaiting Submission Queue</h3>
                  <p className="text-[9px] text-[#8e8e95] mt-0.5 font-semibold">Workspace members who have not logged updates today</p>
                </div>

                <div className="flex-1 mt-4">
                  {attendance.missing_list.length === 0 ? (
                    <div className="text-center text-[10px] text-emerald-400 py-10 border border-dashed border-emerald-500/10 rounded-xl">
                      Perfect synchronization! All members have submitted today's standup.
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-2 max-h-[180px] overflow-y-auto pr-1">
                      {attendance.missing_list.map((m, idx) => (
                        <div key={idx} className="px-2.5 py-1 bg-rose-500/5 border border-rose-500/10 text-rose-400 rounded-lg text-[10px] font-bold font-mono">
                          {m.name || m.email}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

            </div>

          </div>
        )}

      </div>
    </ProtectedRoute>
  );
}
