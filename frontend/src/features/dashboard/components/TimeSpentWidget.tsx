"use client";

import React from "react";
import { Clock, TrendingUp, AlertTriangle } from "lucide-react";

interface TaskTime {
  name: string;
  estimatedHours: number;
  actualHours: number;
}

const mockData: TaskTime[] = [
  { name: "API Integration", estimatedHours: 4, actualHours: 3.5 },
  { name: "UI Polish", estimatedHours: 3, actualHours: 4.5 },
  { name: "Bug Fixes", estimatedHours: 2, actualHours: 1.5 },
  { name: "Code Review", estimatedHours: 3, actualHours: 2 },
  { name: "Documentation", estimatedHours: 2, actualHours: 1 },
];

const totalEstimated = mockData.reduce((s, t) => s + t.estimatedHours, 0);
const totalActual = mockData.reduce((s, t) => s + t.actualHours, 0);
const efficiency = Math.round((totalEstimated / Math.max(totalActual, 0.1)) * 100);

export default function TimeSpentWidget() {
  // Find the max value across all tasks so bars are proportional
  const maxHours = Math.max(...mockData.flatMap((t) => [t.estimatedHours, t.actualHours]));

  return (
    <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10">
            <Clock className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h3 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Time Spent vs Estimated
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">Today&apos;s work breakdown</p>
          </div>
        </div>
      </div>

      {/* Task bars */}
      <div className="space-y-5">
        {mockData.map((task) => {
          const estPct = (task.estimatedHours / maxHours) * 100;
          const actPct = (task.actualHours / maxHours) * 100;
          const isOver = task.actualHours > task.estimatedHours;
          const withinPct = isOver ? estPct : actPct;
          const overflowPct = isOver ? actPct - estPct : 0;

          return (
            <div key={task.name} className="group">
              {/* Task label row */}
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-sm font-medium text-foreground truncate max-w-[160px]">
                  {task.name}
                </span>
                <div className="flex items-center gap-2">
                  {isOver && (
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-500 animate-pulse" />
                  )}
                  <span className="text-xs tabular-nums text-muted-foreground">
                    {task.actualHours}h / {task.estimatedHours}h
                  </span>
                </div>
              </div>

              {/* Estimated bar (outline) */}
              <div className="relative h-4 w-full rounded-full bg-muted/30 overflow-hidden">
                {/* Estimated outline indicator */}
                <div
                  className="absolute inset-y-0 left-0 rounded-full border-2 border-primary/40 border-dashed"
                  style={{ width: `${estPct}%` }}
                />

                {/* Actual filled — within-estimate portion */}
                <div
                  className="absolute inset-y-0 left-0 rounded-l-full bg-primary/80 transition-all duration-700 ease-out group-hover:bg-primary"
                  style={{
                    width: `${withinPct}%`,
                    borderTopRightRadius: isOver ? 0 : "9999px",
                    borderBottomRightRadius: isOver ? 0 : "9999px",
                  }}
                />

                {/* Overflow portion (rose/red) */}
                {isOver && (
                  <div
                    className="absolute inset-y-0 rounded-r-full bg-rose-500/80 transition-all duration-700 ease-out group-hover:bg-rose-500"
                    style={{ left: `${withinPct}%`, width: `${overflowPct}%` }}
                  />
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Summary row */}
      <div className="mt-5 pt-4 border-t border-border grid grid-cols-3 gap-3 text-center">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-0.5">
            Estimated
          </p>
          <p className="text-lg font-bold text-foreground tabular-nums">{totalEstimated}h</p>
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-0.5">
            Actual
          </p>
          <p className="text-lg font-bold text-foreground tabular-nums">{totalActual}h</p>
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-0.5">
            Efficiency
          </p>
          <div className="flex items-center justify-center gap-1">
            <TrendingUp className="w-4 h-4 text-emerald-500" />
            <p className="text-lg font-bold text-emerald-500 tabular-nums">{efficiency}%</p>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 mt-3">
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-primary/80" />
          <span className="text-[10px] text-muted-foreground">Actual (within est.)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-rose-500/80" />
          <span className="text-[10px] text-muted-foreground">Over estimate</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm border-2 border-dashed border-primary/40" />
          <span className="text-[10px] text-muted-foreground">Estimated</span>
        </div>
      </div>
    </div>
  );
}
