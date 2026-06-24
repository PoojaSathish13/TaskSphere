"use client";

import React from "react";
import { Users, AlertCircle } from "lucide-react";

interface TeamMember {
  name: string;
  avatarInitial: string;
  tasksAssigned: number;
  tasksCompleted: number;
}

const mockData: TeamMember[] = [
  { name: "Aarav Mehta", avatarInitial: "A", tasksAssigned: 10, tasksCompleted: 7 },
  { name: "Priya Sharma", avatarInitial: "P", tasksAssigned: 6, tasksCompleted: 5 },
  { name: "Rohan Kapoor", avatarInitial: "R", tasksAssigned: 9, tasksCompleted: 4 },
  { name: "Sneha Iyer", avatarInitial: "S", tasksAssigned: 5, tasksCompleted: 5 },
  { name: "Vikram Das", avatarInitial: "V", tasksAssigned: 12, tasksCompleted: 6 },
];

export default function WorkloadDistributionWidget() {
  return (
    <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10">
            <Users className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h3 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Workload Distribution
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">Tasks per member</p>
          </div>
        </div>
        <span className="text-xs text-muted-foreground font-medium tabular-nums">
          {mockData.length} members
        </span>
      </div>

      {/* Team member bars */}
      <div className="space-y-4">
        {mockData.map((member) => {
          const pct =
            member.tasksAssigned > 0
              ? Math.round((member.tasksCompleted / member.tasksAssigned) * 100)
              : 0;
          const isOverloaded = member.tasksAssigned > 8;

          return (
            <div key={member.name} className="group">
              {/* Info row */}
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  {/* Avatar */}
                  <span className="flex items-center justify-center w-7 h-7 rounded-full bg-primary/10 text-primary text-xs font-semibold select-none">
                    {member.avatarInitial}
                  </span>
                  <span className="text-sm font-medium text-foreground truncate max-w-[120px]">
                    {member.name}
                  </span>
                  {isOverloaded && (
                    <span className="relative flex h-2.5 w-2.5" title="Overloaded">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500" />
                    </span>
                  )}
                </div>
                <span className="text-xs tabular-nums text-muted-foreground">
                  {member.tasksCompleted}/{member.tasksAssigned} tasks
                </span>
              </div>

              {/* Bar */}
              <div className="relative h-5 w-full rounded-full bg-muted/40 overflow-hidden">
                {/* Completed portion */}
                <div
                  className="absolute inset-y-0 left-0 rounded-full bg-primary transition-all duration-700 ease-out group-hover:brightness-110"
                  style={{ width: `${pct}%` }}
                />
                {/* Remaining portion (subtle) */}
                <div
                  className="absolute inset-y-0 rounded-full bg-muted/60"
                  style={{ left: `${pct}%`, width: `${100 - pct}%` }}
                />
                {/* Percentage label */}
                <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-foreground mix-blend-difference select-none">
                  {pct}%
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer legend */}
      <div className="flex items-center gap-4 mt-5 pt-4 border-t border-border">
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-primary" />
          <span className="text-[10px] text-muted-foreground">Completed</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-muted/60" />
          <span className="text-[10px] text-muted-foreground">Remaining</span>
        </div>
        <div className="flex items-center gap-1.5 ml-auto">
          <span className="relative flex h-2.5 w-2.5">
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500" />
          </span>
          <span className="text-[10px] text-muted-foreground">Overloaded (&gt;8)</span>
        </div>
      </div>
    </div>
  );
}
