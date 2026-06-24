"use client";

import React, { useState } from "react";
import { CheckSquare, Square, Plus } from "lucide-react";

interface TaskItem {
  id: string;
  title: string;
  completed: boolean;
  priority: "LOW" | "MEDIUM" | "HIGH";
}

export const TodayTasksWidget: React.FC = () => {
  const [tasks, setTasks] = useState<TaskItem[]>([
    { id: "1", title: "Setup PostgreSQL replication replica sets in docker", completed: false, priority: "HIGH" },
    { id: "2", title: "Configure Redis caching services on DRF auth hooks", completed: true, priority: "MEDIUM" },
    { id: "3", title: "Refactor Next.js root layout providers and shell grids", completed: false, priority: "LOW" },
  ]);

  const [filter, setFilter] = useState<"ALL" | "PENDING" | "COMPLETED">("ALL");

  const toggleTask = (id: string) => {
    setTasks(
      tasks.map((task) =>
        task.id === id ? { ...task, completed: !task.completed } : task
      )
    );
  };

  const filteredTasks = tasks.filter((task) => {
    if (filter === "PENDING") return !task.completed;
    if (filter === "COMPLETED") return task.completed;
    return true;
  });

  const completedCount = tasks.filter((t) => t.completed).length;
  const progressPercent = tasks.length > 0 ? Math.round((completedCount / tasks.length) * 100) : 0;

  return (
    <div className="bg-card border border-border rounded-xl p-5 shadow-sm space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center border-b pb-2">
        <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
          Today's Tasks
        </span>
        <button className="text-indigo-400 hover:text-indigo-300 text-xs font-semibold flex items-center gap-1">
          <Plus className="h-3.5 w-3.5" />
          <span>New Task</span>
        </button>
      </div>

      {/* Progress tracking */}
      <div className="space-y-1">
        <div className="flex justify-between items-center text-[10px] text-muted-foreground font-semibold">
          <span>Task Progress</span>
          <span>{progressPercent}% Completed</span>
        </div>
        <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
          <div
            style={{ width: `${progressPercent}%` }}
            className="h-full bg-indigo-500 rounded-full transition-all duration-300 ease-out"
          ></div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-1.5 border-b pb-2 border-border/40">
        {(["ALL", "PENDING", "COMPLETED"] as const).map((mode) => (
          <button
            key={mode}
            onClick={() => setFilter(mode)}
            className={`px-2.5 py-0.5 rounded text-[10px] font-semibold transition ${
              filter === mode
                ? "bg-indigo-600/15 text-indigo-400 border border-indigo-900/50"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
            }`}
          >
            {mode.charAt(0) + mode.slice(1).toLowerCase()}
          </button>
        ))}
      </div>

      {/* Checklist */}
      <div className="space-y-2 max-h-60 overflow-y-auto">
        {filteredTasks.length === 0 ? (
          <div className="p-6 text-center text-xs text-muted-foreground space-y-0.5">
            <p>No tasks matching filter.</p>
            <p className="text-[10px] text-muted-foreground/60">Enjoy your clear dashboard!</p>
          </div>
        ) : (
          filteredTasks.map((task) => (
            <div
              key={task.id}
              onClick={() => toggleTask(task.id)}
              className="flex items-start gap-3 p-3 rounded-lg bg-muted/20 border border-border hover:bg-muted/40 transition cursor-pointer select-none"
            >
              <button className="mt-0.5 text-muted-foreground hover:text-indigo-400 shrink-0 focus:outline-none">
                {task.completed ? (
                  <CheckSquare className="h-4 w-4 text-indigo-400" />
                ) : (
                  <Square className="h-4 w-4" />
                )}
              </button>
              <div className="flex-1 overflow-hidden space-y-1 leading-tight">
                <p className={`text-xs text-foreground truncate ${
                  task.completed ? "line-through text-muted-foreground" : "font-medium"
                }`}>
                  {task.title}
                </p>
                <span className={`inline-block text-[8px] font-bold px-1.5 py-0.25 rounded ${
                  task.priority === "HIGH" 
                    ? "bg-rose-500/10 text-rose-400 border border-rose-900/50" 
                    : task.priority === "MEDIUM"
                    ? "bg-amber-500/10 text-amber-400 border border-amber-900/30"
                    : "bg-zinc-500/10 text-zinc-400 border border-zinc-900/30"
                }`}>
                  {task.priority}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
export default TodayTasksWidget;
