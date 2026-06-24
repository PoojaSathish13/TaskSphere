"use client";

import { AlertTriangle, CalendarX, ArrowUpRight } from "lucide-react";

interface DelayedTask {
  id: string;
  title: string;
  assignee: string;
  assigneeInitial: string;
  daysOverdue: number;
  dueDate: string;
}

const mockDelayedTasks: DelayedTask[] = [
  {
    id: "dt-1",
    title: "Deploy staging environment hotfix",
    assignee: "Arjun Mehta",
    assigneeInitial: "AM",
    daysOverdue: 5,
    dueDate: "Jun 19, 2026",
  },
  {
    id: "dt-2",
    title: "Submit compliance audit report",
    assignee: "Sara Chen",
    assigneeInitial: "SC",
    daysOverdue: 3,
    dueDate: "Jun 21, 2026",
  },
  {
    id: "dt-3",
    title: "Update SSO integration docs",
    assignee: "Liam Brooks",
    assigneeInitial: "LB",
    daysOverdue: 2,
    dueDate: "Jun 22, 2026",
  },
  {
    id: "dt-4",
    title: "Fix CSV export encoding issue",
    assignee: "Priya Nair",
    assigneeInitial: "PN",
    daysOverdue: 1,
    dueDate: "Jun 23, 2026",
  },
];

function getSeverity(daysOverdue: number) {
  if (daysOverdue >= 3) {
    return {
      badge: "bg-rose-500/10 text-rose-500",
      icon: "text-rose-500",
      avatar: "bg-rose-500/10 text-rose-600",
      border: "border-rose-500/20",
      glow: "shadow-rose-500/5",
    };
  }
  return {
    badge: "bg-amber-500/10 text-amber-500",
    icon: "text-amber-500",
    avatar: "bg-amber-500/10 text-amber-600",
    border: "border-amber-500/20",
    glow: "shadow-amber-500/5",
  };
}

export default function DelayedTasksWidget() {
  const criticalCount = mockDelayedTasks.filter(
    (t) => t.daysOverdue >= 3
  ).length;

  return (
    <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-rose-500/10">
            <AlertTriangle className="w-4 h-4 text-rose-500" />
          </div>
          <h3 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            Delayed Tasks
          </h3>
        </div>
        <div className="flex items-center gap-2">
          {criticalCount > 0 && (
            <span className="text-[10px] font-semibold text-rose-500 bg-rose-500/10 px-2 py-0.5 rounded-full animate-pulse">
              {criticalCount} critical
            </span>
          )}
          <span className="text-[11px] font-medium text-muted-foreground bg-background px-2 py-0.5 rounded-full">
            {mockDelayedTasks.length} total
          </span>
        </div>
      </div>

      {/* Task rows */}
      <div className="space-y-2">
        {mockDelayedTasks.map((task) => {
          const severity = getSeverity(task.daysOverdue);
          return (
            <div
              key={task.id}
              className={`group flex items-center gap-3 rounded-xl px-3.5 py-3 bg-background border transition-all duration-200 hover:shadow-md cursor-pointer ${severity.border} ${severity.glow}`}
            >
              {/* Alert icon */}
              <AlertTriangle
                className={`flex-shrink-0 w-4 h-4 ${severity.icon}`}
              />

              {/* Task info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate group-hover:text-primary transition-colors">
                  {task.title}
                </p>
                <div className="flex items-center gap-2 mt-0.5">
                  <CalendarX className="w-3 h-3 text-muted-foreground" />
                  <span className="text-[11px] text-muted-foreground">
                    Due {task.dueDate}
                  </span>
                </div>
              </div>

              {/* Assignee avatar */}
              <div
                className={`flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-full text-[11px] font-bold ${severity.avatar}`}
                title={task.assignee}
              >
                {task.assigneeInitial}
              </div>

              {/* Overdue badge */}
              <span
                className={`flex-shrink-0 text-[10px] font-semibold px-2.5 py-1 rounded-full whitespace-nowrap ${severity.badge}`}
              >
                {task.daysOverdue}d overdue
              </span>

              {/* Hover arrow */}
              <ArrowUpRight className="flex-shrink-0 w-4 h-4 text-muted-foreground/0 group-hover:text-muted-foreground transition-all duration-200" />
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="mt-4 pt-3 border-t border-border flex items-center justify-between">
        <span className="text-[11px] text-muted-foreground">
          Avg. delay:{" "}
          <span className="font-semibold text-foreground">
            {(
              mockDelayedTasks.reduce((s, t) => s + t.daysOverdue, 0) /
              mockDelayedTasks.length
            ).toFixed(1)}{" "}
            days
          </span>
        </span>
        <button className="text-[11px] font-semibold text-primary hover:text-primary/80 transition-colors">
          View All Overdue →
        </button>
      </div>
    </div>
  );
}
