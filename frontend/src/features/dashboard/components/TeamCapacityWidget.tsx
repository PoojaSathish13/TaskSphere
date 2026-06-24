"use client";

import React from "react";
import { Users, AlertTriangle } from "lucide-react";

interface MemberCapacity {
  name: string;
  initials: string;
  role: string;
  usage: number;
}

export const TeamCapacityWidget: React.FC = () => {
  const team: MemberCapacity[] = [
    { name: "Sarah Jenkins", initials: "SJ", role: "DevOps Engineer", usage: 82 },
    { name: "David Kim", initials: "DK", role: "Developer", usage: 95 },
    { name: "Jessica Alba", initials: "JA", role: "Developer", usage: 45 },
  ];

  return (
    <div className="bg-card border border-border rounded-xl p-5 shadow-sm space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center border-b pb-2">
        <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
          Team Capacity
        </span>
        <Users className="h-4 w-4 text-indigo-400" />
      </div>

      {/* List */}
      <div className="space-y-3">
        {team.map((member, idx) => (
          <div key={idx} className="space-y-1 text-xs">
            <div className="flex justify-between items-center text-xs">
              <div className="flex items-center gap-2.5 overflow-hidden">
                {/* Avatar */}
                <span className="h-7 w-7 rounded-full bg-indigo-950/40 border border-indigo-900/50 text-[10px] font-bold text-indigo-400 flex items-center justify-center shrink-0 select-none">
                  {member.initials}
                </span>
                
                <div className="overflow-hidden leading-none pr-3">
                  <span className="font-semibold text-foreground truncate block">{member.name}</span>
                  <span className="text-[9px] text-muted-foreground truncate block mt-0.5">{member.role}</span>
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                {member.usage > 90 && (
                  <span className="flex items-center text-[9px] font-bold bg-rose-500/10 text-rose-400 border border-rose-900/40 px-1 py-0.25 rounded gap-0.5 animate-pulse">
                    <AlertTriangle className="h-2.5 w-2.5" />
                    <span>OVERLOAD</span>
                  </span>
                )}
                <span className={`font-mono font-bold ${
                  member.usage > 90 ? "text-rose-400" : member.usage > 75 ? "text-amber-400" : "text-emerald-400"
                }`}>
                  {member.usage}%
                </span>
              </div>
            </div>
            
            {/* ProgressBar */}
            <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
              <div
                style={{ width: `${member.usage}%` }}
                className={`h-full rounded-full transition-all duration-500 ease-out ${
                  member.usage > 90 
                    ? "bg-rose-500" 
                    : member.usage > 75 
                    ? "bg-amber-500" 
                    : "bg-indigo-500"
                }`}
              ></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
export default TeamCapacityWidget;
