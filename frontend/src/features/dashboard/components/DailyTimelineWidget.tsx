"use client";

import React from "react";
import { Clock } from "lucide-react";

interface TimelineEvent {
  time: string;
  title: string;
  description: string;
  completed: boolean;
}

export const DailyTimelineWidget: React.FC = () => {
  const events: TimelineEvent[] = [
    { time: "09:30 AM", title: "Daily Standup Meeting", description: "Sync priorities and block parameters.", completed: true },
    { time: "11:00 AM", title: "API Gateway Review", description: "SMTP timeouts code overrides review.", completed: true },
    { time: "02:00 PM", title: "DB Scaling Overrides Sync", description: "David Kim DB replica pool increases review.", completed: false },
    { time: "04:30 PM", title: "Sprint Demo Release Preview", description: "Preview complete shell layouts.", completed: false },
  ];

  return (
    <div className="bg-card border border-border rounded-xl p-5 shadow-sm space-y-4">
      <div className="flex justify-between items-center border-b pb-2">
        <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
          Daily Timeline
        </span>
        <Clock className="h-4 w-4 text-indigo-400" />
      </div>

      <div className="relative pl-4 border-l border-border/80 space-y-4">
        {events.map((evt, idx) => (
          <div key={idx} className="relative text-xs">
            {/* Circle Node Tracker */}
            <span className={`absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full border-2 bg-background ${
              evt.completed ? "border-indigo-500" : "border-muted"
            }`} />
            
            <div className="space-y-0.5">
              <span className={`text-[9px] font-mono font-bold uppercase ${
                evt.completed ? "text-indigo-400" : "text-muted-foreground"
              }`}>
                {evt.time}
              </span>
              <p className={`font-semibold ${
                evt.completed ? "text-muted-foreground line-through" : "text-foreground"
              }`}>
                {evt.title}
              </p>
              <p className="text-[10px] text-muted-foreground leading-relaxed">
                {evt.description}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
export default DailyTimelineWidget;
