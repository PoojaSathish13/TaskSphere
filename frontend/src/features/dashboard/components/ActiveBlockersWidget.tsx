"use client";

import React from "react";
import { AlertCircle, ArrowUpRight } from "lucide-react";

interface BlockerItem {
  id: string;
  title: string;
  project: string;
  assignedTo: string;
  severity: "CRITICAL" | "HIGH";
}

export const ActiveBlockersWidget: React.FC = () => {
  const blockers: BlockerItem[] = [
    { id: "1", title: "API Gateway SMTP connection timeout error", project: "TaskSphere App", assignedTo: "Devops Team", severity: "CRITICAL" },
    { id: "2", title: "PostgreSQL read replica replication lag", project: "Data Layer", assignedTo: "DBA Group", severity: "HIGH" },
  ];

  return (
    <div className="bg-card border border-border rounded-xl p-5 shadow-sm space-y-4 flex flex-col justify-between">
      <div className="flex justify-between items-center">
        <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
          Active Blockers
        </span>
        <AlertCircle className="h-4 w-4 text-rose-500 animate-pulse" />
      </div>

      <div className="space-y-2">
        {blockers.map((blocker) => (
          <div
            key={blocker.id}
            className="flex justify-between items-center p-2.5 rounded-lg bg-muted/40 border border-border text-xs transition hover:bg-muted/60"
          >
            <div className="space-y-1 overflow-hidden pr-3">
              <div className="flex items-center gap-2">
                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                  blocker.severity === "CRITICAL" 
                    ? "bg-rose-500/10 text-rose-400 border border-rose-900/50" 
                    : "bg-amber-500/10 text-amber-400 border border-amber-900/30"
                }`}>
                  {blocker.severity}
                </span>
                <span className="text-[10px] text-muted-foreground truncate max-w-[80px]">
                  {blocker.project}
                </span>
              </div>
              <p className="font-medium text-foreground truncate">{blocker.title}</p>
            </div>
            
            <button className="h-6 w-6 rounded bg-card hover:bg-muted border border-border flex items-center justify-center text-muted-foreground hover:text-foreground transition shrink-0">
              <ArrowUpRight className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
export default ActiveBlockersWidget;
