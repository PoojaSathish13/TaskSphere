"use client";

import React from "react";
import { Award, Flame, CheckSquare, MessageSquare, ShieldAlert } from "lucide-react";

interface Contributor {
  id: string;
  name: string;
  initials: string;
  role: string;
  tasksCompleted: number;
  commentsCount: number;
  qualityScore: number;
  isActiveNow: boolean;
}

const mockContributors: Contributor[] = [
  {
    id: "c-1",
    name: "Arjun Mehta",
    initials: "AM",
    role: "Backend Lead",
    tasksCompleted: 15,
    commentsCount: 32,
    qualityScore: 98,
    isActiveNow: true,
  },
  {
    id: "c-2",
    name: "Sara Chen",
    initials: "SC",
    role: "Frontend Dev",
    tasksCompleted: 12,
    commentsCount: 24,
    qualityScore: 95,
    isActiveNow: true,
  },
  {
    id: "c-3",
    name: "Liam Brooks",
    initials: "LB",
    role: "Fullstack Engineer",
    tasksCompleted: 9,
    commentsCount: 18,
    qualityScore: 92,
    isActiveNow: false,
  },
  {
    id: "c-4",
    name: "Priya Nair",
    initials: "PN",
    role: "QA Engineer",
    tasksCompleted: 14,
    commentsCount: 41,
    qualityScore: 99,
    isActiveNow: true,
  },
];

export const ActiveContributorsWidget: React.FC = () => {
  return (
    <div className="bg-card border border-border rounded-xl p-5 shadow-sm space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center border-b pb-2">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-emerald-500/10">
            <Award className="h-4 w-4 text-emerald-500" />
          </div>
          <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
            Active Contributors
          </span>
        </div>
        <span className="text-[10px] bg-primary/10 text-primary font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
          This Week
        </span>
      </div>

      {/* Contributor List */}
      <div className="space-y-3">
        {mockContributors.map((c) => (
          <div
            key={c.id}
            className="flex items-center justify-between p-2 rounded-lg bg-muted/20 border border-transparent hover:border-border/60 hover:bg-muted/40 transition cursor-pointer"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              {/* Avatar Frame */}
              <div className="relative flex-shrink-0">
                <span className="h-8 w-8 rounded-full bg-primary/10 border border-primary/20 text-xs font-extrabold text-primary flex items-center justify-center select-none">
                  {c.initials}
                </span>
                {c.isActiveNow && (
                  <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-emerald-500 border border-card ring-2 ring-emerald-500/20" />
                )}
              </div>

              {/* Identity info */}
              <div className="min-w-0 leading-none">
                <span className="font-semibold text-xs text-foreground block truncate">
                  {c.name}
                </span>
                <span className="text-[9px] text-muted-foreground block mt-0.5 truncate">
                  {c.role}
                </span>
              </div>
            </div>

            {/* Metrics */}
            <div className="flex items-center gap-3 shrink-0">
              <div className="flex items-center gap-1" title="Tasks Completed">
                <CheckSquare className="h-3 w-3 text-muted-foreground/60" />
                <span className="text-[10px] font-mono font-semibold text-foreground">
                  {c.tasksCompleted}
                </span>
              </div>
              <div className="flex items-center gap-1" title="Discussions">
                <MessageSquare className="h-3 w-3 text-muted-foreground/60" />
                <span className="text-[10px] font-mono font-semibold text-foreground">
                  {c.commentsCount}
                </span>
              </div>
              <div className="flex items-center gap-1" title="Quality Score">
                <Flame className="h-3 w-3 text-amber-500" />
                <span className="text-[10px] font-mono font-bold text-amber-500">
                  {c.qualityScore}%
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ActiveContributorsWidget;
