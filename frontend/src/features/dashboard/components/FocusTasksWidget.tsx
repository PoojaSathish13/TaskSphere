"use client";

import { useState } from "react";
import { Crosshair, Clock, Play, Flame, Zap } from "lucide-react";

interface FocusTask {
  id: string;
  title: string;
  project: string;
  estimatedMinutes: number;
  priority: "High" | "Critical";
  started?: boolean;
}

const mockFocusTasks: FocusTask[] = [
  {
    id: "ft-1",
    title: "Finalize API schema for billing module",
    project: "Billing v2",
    estimatedMinutes: 45,
    priority: "Critical",
  },
  {
    id: "ft-2",
    title: "Review onboarding flow prototypes",
    project: "User Growth",
    estimatedMinutes: 30,
    priority: "High",
  },
  {
    id: "ft-3",
    title: "Write migration script for tenant DB",
    project: "Platform Core",
    estimatedMinutes: 60,
    priority: "Critical",
  },
  {
    id: "ft-4",
    title: "Update component library docs",
    project: "Design System",
    estimatedMinutes: 25,
    priority: "High",
  },
];

export default function FocusTasksWidget() {
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);

  const totalMinutes = mockFocusTasks.reduce(
    (sum, t) => sum + t.estimatedMinutes,
    0
  );

  return (
    <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-primary/10">
            <Crosshair className="w-4 h-4 text-primary" />
          </div>
          <h3 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            Focus Mode
          </h3>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Clock className="w-3.5 h-3.5" />
          <span className="font-medium">
            {Math.floor(totalMinutes / 60)}h {totalMinutes % 60}m total
          </span>
        </div>
      </div>

      {/* Task List */}
      <div className="space-y-2.5">
        {mockFocusTasks.map((task) => {
          const isActive = activeTaskId === task.id;
          return (
            <div
              key={task.id}
              className={`group relative flex items-center gap-3 rounded-xl px-3.5 py-3 transition-all duration-200 ${
                isActive
                  ? "bg-primary/10 border border-primary/20"
                  : "bg-background border border-transparent hover:border-border hover:shadow-sm"
              }`}
            >
              {/* Focus indicator */}
              <div
                className={`flex-shrink-0 w-2 h-2 rounded-full transition-all duration-300 ${
                  isActive
                    ? "bg-primary shadow-[0_0_6px_rgba(59,130,246,0.5)] animate-pulse"
                    : "bg-muted-foreground/30"
                }`}
              />

              {/* Task info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">
                  {task.title}
                </p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[11px] text-muted-foreground">
                    {task.project}
                  </span>
                  <span className="text-muted-foreground/30">·</span>
                  <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                    <Clock className="w-3 h-3" />
                    {task.estimatedMinutes}m
                  </span>
                </div>
              </div>

              {/* Priority badge */}
              <span
                className={`flex-shrink-0 flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full ${
                  task.priority === "Critical"
                    ? "bg-rose-500/10 text-rose-500"
                    : "bg-amber-500/10 text-amber-500"
                }`}
              >
                {task.priority === "Critical" ? (
                  <Flame className="w-3 h-3" />
                ) : (
                  <Zap className="w-3 h-3" />
                )}
                {task.priority}
              </span>

              {/* Start Focus button */}
              <button
                onClick={() =>
                  setActiveTaskId(isActive ? null : task.id)
                }
                className={`flex-shrink-0 flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-all duration-200 ${
                  isActive
                    ? "bg-primary text-white shadow-md shadow-primary/25"
                    : "bg-primary/10 text-primary hover:bg-primary hover:text-white hover:shadow-md hover:shadow-primary/25"
                }`}
              >
                <Play className="w-3 h-3" />
                {isActive ? "Focusing" : "Start"}
              </button>
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="mt-4 pt-3 border-t border-border flex items-center justify-between">
        <span className="text-[11px] text-muted-foreground">
          {mockFocusTasks.length} tasks queued for today
        </span>
        <button className="text-[11px] font-semibold text-primary hover:text-primary/80 transition-colors">
          Manage Focus List →
        </button>
      </div>
    </div>
  );
}
