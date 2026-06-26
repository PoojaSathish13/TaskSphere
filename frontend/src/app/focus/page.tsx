"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/infrastructure/api/api-client";
import { ProtectedRoute } from "@/features/rbac/components/ProtectedRoute";
import { useAuthStore } from "@/infrastructure/store/auth-store";
import { 
  Play, 
  Pause, 
  CheckCircle, 
  RotateCcw, 
  AlertCircle, 
  Compass, 
  Activity, 
  Target, 
  ArrowRight,
  Zap,
  Sparkles,
  Flame,
  Award,
  BookOpen,
  Lock,
  Unlock,
  Volume2,
  Clock,
  History
} from "lucide-react";

interface TaskItem {
  id: string;
  title: string;
  description: string;
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  status: "BACKLOG" | "TODO" | "IN_PROGRESS" | "REVIEW" | "DONE";
  estimated_hours: string;
  due_date: string | null;
}

interface FocusSession {
  id: string;
  task: string;
  task_details?: TaskItem;
  started_at: string;
  completed: boolean;
  context_switches: number;
  duration_seconds: number;
}

interface ProductivityReport {
  date: string;
  focus_seconds: number;
  productivity_score: number;
}

export default function FocusPage() {
  const queryClient = useQueryClient();
  const { activeOrganizationId } = useAuthStore();

  const [activeSession, setActiveSession] = useState<FocusSession | null>(null);
  const [selectedTask, setSelectedTask] = useState<TaskItem | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [timeSeconds, setTimeSeconds] = useState(0);
  const [targetDuration, setTargetDuration] = useState(1500); // Default 25m (1500s)
  const [switches, setSwitches] = useState(0);

  // Enterprise options
  const [lockMode, setLockMode] = useState(false);
  const [showLockWarning, setShowLockWarning] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Timer Ref
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Query: Fetch Today's Tasks
  const todayStr = new Date().toISOString().split("T")[0];
  const { data: tasks = [], isLoading } = useQuery<TaskItem[]>({
    queryKey: ["planner-all-tasks", activeOrganizationId],
    queryFn: async () => {
      const res = await apiClient.get("/api/v1/planner/tasks/");
      const all: TaskItem[] = (Array.isArray(res.data?.data) ? res.data.data : (Array.isArray(res.data) ? res.data : []));
      return all.filter(t => t.due_date === todayStr && t.status !== "DONE");
    }
  });

  // Query: Fetch 7-day Productivity Metrics History
  const { data: trendData = [] } = useQuery<ProductivityReport[]>({
    queryKey: ["productivity-metrics-trend", activeOrganizationId],
    queryFn: async () => {
      const res = await apiClient.get("/api/v1/focus/metrics/");
      return (Array.isArray(res.data?.data) ? res.data.data : (Array.isArray(res.data) ? res.data : []));
    }
  });

  // Query: Fetch Streak count
  const { data: streakCount = 0 } = useQuery<number>({
    queryKey: ["productivity-streak", activeOrganizationId],
    queryFn: async () => {
      const res = await apiClient.get("/api/v1/focus/metrics/streak/");
      return res.data.data?.streak || 0;
    }
  });

  // Query: Fetch Past Focus Sessions list (History)
  const { data: pastSessions = [] } = useQuery<FocusSession[]>({
    queryKey: ["focus-sessions-history", activeOrganizationId],
    queryFn: async () => {
      const res = await apiClient.get("/api/v1/focus/sessions/");
      return (Array.isArray(res.data?.data) ? res.data.data : (Array.isArray(res.data) ? res.data : []));
    }
  });

  // Mutation: Start Focus Session
  const startSessionMutation = useMutation({
    mutationFn: async (taskId: string) => {
      const res = await apiClient.post("/api/v1/focus/sessions/start/", { task: taskId });
      return res.data.data;
    },
    onSuccess: (data) => {
      setActiveSession(data);
      setIsRunning(true);
      setTimeSeconds(0);
      setSwitches(0);
    },
    onError: (err: any) => {
      const errMsg = err?.response?.data?.error || "Failed to start session";
      alert(errMsg);
    }
  });

  // Mutation: Track Context Switch
  const trackSwitchMutation = useMutation({
    mutationFn: async (sessionId: string) => {
      await apiClient.post(`/api/v1/focus/sessions/${sessionId}/track-switch/`);
    }
  });

  // Mutation: Stop Focus Session
  const stopSessionMutation = useMutation({
    mutationFn: async (payload: { id: string; duration_seconds: number; context_switches: number; completed_task: boolean }) => {
      await apiClient.post(`/api/v1/focus/sessions/${payload.id}/stop/`, {
        duration_seconds: payload.duration_seconds,
        context_switches: payload.context_switches,
        completed_task: payload.completed_task
      });
    },
    onSuccess: () => {
      // Play audio notification beep
      if (soundEnabled) {
        try {
          const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
          const osc = audioCtx.createOscillator();
          osc.type = "sine";
          osc.frequency.setValueAtTime(880, audioCtx.currentTime); // A5 note
          osc.connect(audioCtx.destination);
          osc.start();
          osc.stop(audioCtx.currentTime + 0.3);
        } catch (e) {
          console.log("Audio notification failed to play", e);
        }
      }
      setActiveSession(null);
      setSelectedTask(null);
      setIsRunning(false);
      setTimeSeconds(0);
      setSwitches(0);
      queryClient.invalidateQueries({ queryKey: ["planner-all-tasks"] });
      queryClient.invalidateQueries({ queryKey: ["productivity-metrics-trend"] });
      queryClient.invalidateQueries({ queryKey: ["focus-sessions-history"] });
      queryClient.invalidateQueries({ queryKey: ["productivity-streak"] });
    }
  });

  const handleCompleteTimer = useCallback((markDone: boolean) => {
    if (!activeSession) return;
    stopSessionMutation.mutate({
      id: activeSession.id,
      duration_seconds: timeSeconds,
      context_switches: switches,
      completed_task: markDone
    });
  }, [activeSession, timeSeconds, switches, stopSessionMutation]);

  // Timer Tick Logic (Counts down or counts up based on selected Pomodoro type)
  useEffect(() => {
    if (isRunning) {
      timerRef.current = setInterval(() => {
        setTimeSeconds(prev => {
          const next = prev + 1;
          if (next >= targetDuration) {
            // Completed! Stop timer automatically
            setIsRunning(false);
            handleCompleteTimer(false);
            return targetDuration;
          }
          return next;
        });
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRunning, targetDuration, activeSession, handleCompleteTimer]);

  // Context Switch Tracking: Trigger switches when selecting task cards during lock mode
  const handleSelectTaskForFocus = (task: TaskItem) => {
    if (lockMode && activeSession) {
      setShowLockWarning(true);
      return;
    }
    if (activeSession) {
      setSwitches(prev => prev + 1);
      trackSwitchMutation.mutate(activeSession.id);
    }
    setSelectedTask(task);
  };

  const handleStartTimer = () => {
    if (!selectedTask) return;
    startSessionMutation.mutate(selectedTask.id);
  };

  const handlePauseTimer = () => {
    if (lockMode) {
      setShowLockWarning(true);
      return;
    }
    setIsRunning(false);
  };

  const handleResumeTimer = () => {
    setIsRunning(true);
  };



  const formatTimer = (totalSeconds: number) => {
    const remaining = targetDuration - totalSeconds;
    const isOver = remaining <= 0;
    const min = Math.floor(Math.abs(remaining) / 60);
    const sec = Math.abs(remaining) % 60;
    return `${isOver ? "-" : ""}${min < 10 ? `0${min}` : min}:${sec < 10 ? `0${sec}` : sec}`;
  };

  const handlePresetSelect = (minutes: number) => {
    if (activeSession) return;
    setTargetDuration(minutes * 60);
    setTimeSeconds(0);
  };

  // Metrics calculator values
  const todayMetric = trendData.find(d => d.date === todayStr) || { focus_seconds: 0, productivity_score: 100 };

  return (
    <ProtectedRoute>
      <main className="space-y-6 max-w-5xl mx-auto pb-12">
        {/* Lock warning modal */}
        {showLockWarning && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex justify-center items-center p-4">
            <div className="bg-card border rounded-xl w-full max-w-sm p-6 relative space-y-4">
              <div className="flex gap-2.5 items-start text-amber-400">
                <AlertCircle className="h-5 w-5 shrink-0" />
                <h3 className="text-sm font-bold text-foreground">Focus Lock Enabled</h3>
              </div>
              <p className="text-xs text-muted-foreground leading-normal">
                You are in Lock Mode. Pausing the timer or switching tasks is restricted to maintain deep focus momentum. To unlock, toggle Focus Lock mode off.
              </p>
              <div className="flex justify-end gap-2.5">
                <button
                  onClick={() => setShowLockWarning(false)}
                  className="px-4 py-2 bg-primary hover:bg-primary/95 text-primary-foreground rounded-lg text-xs font-bold transition"
                >
                  Return to Focus
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Header */}
        <header className="border-b border-border pb-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight flex items-center gap-2">
              Focus Workspace
              <span className="text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20 flex items-center gap-1">
                <Flame className="h-3 w-3" /> Focus Mode
              </span>
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              Deep focus presets with streaking metrics, context switch blocks, and trend charts.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setLockMode(prev => !prev)}
              className={`flex items-center gap-1.5 border text-xs font-semibold px-3 py-2 rounded-lg transition focus:outline-none ${
                lockMode ? "bg-amber-950/20 border-amber-500/30 text-amber-400" : "bg-card hover:bg-muted"
              }`}
            >
              {lockMode ? <Lock className="h-3.5 w-3.5" /> : <Unlock className="h-3.5 w-3.5" />}
              <span>Lock Mode</span>
            </button>

            <button
              onClick={() => setSoundEnabled(prev => !prev)}
              className={`p-2 border rounded-lg transition ${
                soundEnabled ? "text-primary bg-primary/10 border border-primary/20" : "text-muted-foreground bg-card"
              }`}
            >
              <Volume2 className="h-4 w-4" />
            </button>
          </div>
        </header>

        {/* Dashboard Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Today's Tasks */}
          <section className="lg:col-span-4 bg-card border rounded-xl p-4 shadow-sm flex flex-col gap-3 min-h-[360px]">
            <div>
              <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Today's Targets</h2>
              <p className="text-[9px] text-muted-foreground mt-0.5">Select a task to launch timer</p>
            </div>

            <div className="flex-1 space-y-2 max-h-[380px] overflow-y-auto pr-1">
              {tasks.length === 0 ? (
                <div className="p-8 text-center text-xs text-muted-foreground border border-dashed rounded-lg border-border/80 h-48 flex items-center justify-center">
                  No pending tasks for today.
                </div>
              ) : (
                tasks.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => handleSelectTaskForFocus(t)}
                    disabled={lockMode && activeSession !== null}
                    className={`w-full text-left p-3 border rounded-lg transition text-xs flex justify-between items-center ${
                      selectedTask?.id === t.id ? "border-primary bg-primary/5 font-semibold" : "hover:border-border/80"
                    } disabled:opacity-50`}
                  >
                    <span className="truncate pr-4">{t.title}</span>
                    <span className="font-mono text-[9px] text-muted-foreground">{t.estimated_hours}h</span>
                  </button>
                ))
              )}
            </div>
          </section>

          {/* Focus Timer Presets and Timer Screen */}
          <section className="lg:col-span-8 bg-card border rounded-xl p-5 shadow-sm flex flex-col justify-between min-h-[360px] gap-6">
            
            {/* Presets and target indicators */}
            <div className="flex justify-between items-center border-b pb-3">
              <div className="flex gap-2">
                <button
                  onClick={() => handlePresetSelect(15)}
                  disabled={activeSession !== null}
                  className="px-2.5 py-1 bg-muted/20 border hover:bg-muted/40 transition rounded text-[10px] font-bold"
                >
                  Sprint (15m)
                </button>
                <button
                  onClick={() => handlePresetSelect(25)}
                  disabled={activeSession !== null}
                  className="px-2.5 py-1 bg-muted/20 border hover:bg-muted/40 transition rounded text-[10px] font-bold"
                >
                  Pomodoro (25m)
                </button>
                <button
                  onClick={() => handlePresetSelect(50)}
                  disabled={activeSession !== null}
                  className="px-2.5 py-1 bg-muted/20 border hover:bg-muted/40 transition rounded text-[10px] font-bold"
                >
                  Deep Focus (50m)
                </button>
              </div>

              <div className="flex items-center gap-1.5 text-xs text-amber-500">
                <Award className="h-4 w-4" />
                <span className="font-bold">Streak: {streakCount} Days</span>
              </div>
            </div>

            {selectedTask ? (
              <div className="flex-1 flex flex-col justify-between items-center text-center py-2 space-y-4">
                <div>
                  <span className="text-[9px] uppercase font-bold tracking-widest text-primary">target focus</span>
                  <h2 className="text-base font-extrabold text-foreground mt-0.5">{selectedTask.title}</h2>
                </div>

                <div className="space-y-2">
                  <p className="text-6xl font-black font-mono tracking-wider text-foreground">
                    {formatTimer(timeSeconds)}
                  </p>
                  
                  {activeSession && (
                    <div className="flex items-center justify-center gap-1 text-[10px] text-muted-foreground bg-muted/20 px-2 py-0.5 rounded-full border border-border/40 w-fit mx-auto">
                      <Zap className="h-3 w-3 text-amber-400 animate-pulse" />
                      <span>Switches: <span className="font-mono font-bold text-foreground">{switches}</span></span>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  {!activeSession ? (
                    <button
                      onClick={handleStartTimer}
                      className="px-6 py-2.5 bg-primary hover:bg-primary/95 text-primary-foreground rounded-lg font-bold transition flex items-center gap-1.5"
                    >
                      <Play className="h-4 w-4" /> Start Focus Session
                    </button>
                  ) : (
                    <>
                      {isRunning ? (
                        <button
                          onClick={handlePauseTimer}
                          className="px-4 py-2 border rounded-lg font-semibold hover:bg-muted transition flex items-center gap-1"
                        >
                          <Pause className="h-4 w-4" /> Pause
                        </button>
                      ) : (
                        <button
                          onClick={handleResumeTimer}
                          className="px-4 py-2 bg-primary hover:bg-primary/95 text-primary-foreground rounded-lg font-bold transition flex items-center gap-1"
                        >
                          <Play className="h-4 w-4" /> Resume
                        </button>
                      )}

                      <button
                        onClick={() => handleCompleteTimer(true)}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold transition flex items-center gap-1"
                      >
                        <CheckCircle className="h-4 w-4" /> Complete Task
                      </button>

                      <button
                        onClick={() => handleCompleteTimer(false)}
                        className="px-4 py-2 border border-rose-500/20 text-rose-400 rounded-lg hover:bg-rose-950/20 text-xs font-bold transition"
                      >
                        Abandon Focus
                      </button>
                    </>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col justify-center items-center text-center p-8 gap-3 h-full">
                <Target className="h-10 w-10 text-muted-foreground/45 animate-spin" />
                <h3 className="font-bold text-foreground">Launch Pomodoro Zone</h3>
                <p className="text-muted-foreground text-[11px] max-w-xs">
                  Pick a target from your pipeline column and click a preset duration to commit to deep work.
                </p>
              </div>
            )}
          </section>
        </div>

        {/* Productivity Trends & History logs */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Trend chart */}
          <section className="bg-card border rounded-xl p-5 shadow-sm space-y-4">
            <div>
              <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Productivity Trend Graph</h2>
              <p className="text-[10px] text-muted-foreground mt-0.5">Historical focus duration charting (minutes)</p>
            </div>

            <div className="h-48 flex items-end justify-between px-4 pb-2 border-b border-l border-border/60">
              {trendData.slice(0, 7).reverse().map((day, idx) => {
                const heightPercentage = Math.min(100, (day.focus_seconds / 3600) * 100); // 1h is 100% height
                return (
                  <div key={idx} className="flex flex-col items-center gap-1.5 w-8">
                    <div
                      className="w-4 bg-primary/80 hover:bg-primary transition-all rounded-t"
                      style={{ height: `${Math.max(10, heightPercentage)}px` }}
                    />
                    <span className="text-[8px] font-mono text-muted-foreground truncate w-full text-center">
                      {day.date.substring(5)}
                    </span>
                  </div>
                );
              })}
            </div>
          </section>

          {/* History Feed logs */}
          <section className="bg-card border rounded-xl p-5 shadow-sm flex flex-col gap-4">
            <div>
              <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Focus Log History</h2>
              <p className="text-[10px] text-muted-foreground mt-0.5">Audit records of completed workspace logs</p>
            </div>

            <div className="flex-1 space-y-2.5 max-h-[190px] overflow-y-auto pr-1">
              {pastSessions.length === 0 ? (
                <div className="text-center text-xs text-muted-foreground py-12 border border-dashed rounded-lg">
                  No focus history logged.
                </div>
              ) : (
                pastSessions.map((session) => (
                  <div key={session.id} className="p-3 bg-muted/10 border rounded-lg flex items-center justify-between text-xs">
                    <div className="space-y-0.5 overflow-hidden pr-4">
                      <p className="font-semibold text-foreground truncate">{session.task_details?.title || "Task Details"}</p>
                      <p className="text-[9px] text-muted-foreground font-mono">
                        Started: {new Date(session.started_at).toLocaleDateString()}
                      </p>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="font-mono text-primary font-bold block">
                        {Math.round(session.duration_seconds / 60)} min
                      </span>
                      <span className="text-[9px] text-muted-foreground block">
                        Switches: {session.context_switches}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>

        </div>
      </main>
    </ProtectedRoute>
  );
}
