"use client";

import React from "react";
import { GitPullRequest, Settings, UserCheck, Shield } from "lucide-react";

interface ActivityItem {
  id: string;
  type: "CODE" | "CONFIG" | "ROLE" | "MEMBERSHIP";
  action: string;
  user: string;
  time: string;
}

export const RecentActivityFeed: React.FC = () => {
  const activities: ActivityItem[] = [
    { id: "1", type: "CODE", action: "Merged PR #128: Setup PostgreSQL replication replication pool lag thresholds", user: "David Kim", time: "10m ago" },
    { id: "2", type: "CONFIG", action: "Configured SMTP broker keys setup parameters", user: "Sarah Jenkins", time: "1h ago" },
    { id: "3", type: "ROLE", action: "Reassigned DevOps role membership mappings", user: "Workspace Manager", time: "3h ago" },
  ];

  const getIcon = (type: string) => {
    switch (type) {
      case "CODE":
        return <GitPullRequest className="h-4 w-4 text-purple-400" />;
      case "CONFIG":
        return <Settings className="h-4 w-4 text-sky-400" />;
      case "ROLE":
        return <Shield className="h-4 w-4 text-emerald-400" />;
      default:
        return <UserCheck className="h-4 w-4 text-muted-foreground" />;
    }
  };

  return (
    <div className="bg-card border border-border rounded-xl p-5 shadow-sm space-y-4">
      <div className="flex justify-between items-center border-b pb-2">
        <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
          Recent Activity Feed
        </span>
        <span className="text-[10px] text-muted-foreground font-semibold">Live logs</span>
      </div>

      <div className="space-y-3">
        {activities.map((act) => (
          <div key={act.id} className="flex gap-3 text-xs items-start">
            <span className="h-7 w-7 rounded-lg bg-muted flex items-center justify-center shrink-0 border">
              {getIcon(act.type)}
            </span>
            <div className="flex-1 overflow-hidden leading-tight space-y-0.5">
              <p className="text-foreground font-medium line-clamp-2">{act.action}</p>
              <p className="text-[10px] text-muted-foreground">
                By {act.user} • {act.time}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
export default RecentActivityFeed;
