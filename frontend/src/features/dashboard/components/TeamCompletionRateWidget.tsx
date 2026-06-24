"use client";

import { TrendingUp, CheckCircle2, Clock, Circle } from "lucide-react";

const completionData = {
  overall: 78,
  onTime: 65,
  late: 13,
  remaining: 22,
};

const dailyTrend = [
  { day: "Mon", rate: 82 },
  { day: "Tue", rate: 76 },
  { day: "Wed", rate: 88 },
  { day: "Thu", rate: 71 },
  { day: "Fri", rate: 78 },
];

const breakdownItems = [
  {
    label: "On Time",
    value: completionData.onTime,
    color: "bg-emerald-500",
    textColor: "text-emerald-500",
    icon: CheckCircle2,
  },
  {
    label: "Late",
    value: completionData.late,
    color: "bg-amber-500",
    textColor: "text-amber-500",
    icon: Clock,
  },
  {
    label: "Remaining",
    value: completionData.remaining,
    color: "bg-muted-foreground/30",
    textColor: "text-muted-foreground",
    icon: Circle,
  },
];

export default function TeamCompletionRateWidget() {
  const circumference = 2 * Math.PI * 54;
  const strokeDashoffset =
    circumference - (completionData.overall / 100) * circumference;

  return (
    <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-emerald-500/10">
            <TrendingUp className="w-4 h-4 text-emerald-500" />
          </div>
          <h3 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            Team Completion Rate
          </h3>
        </div>
        <span className="text-[11px] font-medium text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full">
          +3% this week
        </span>
      </div>

      {/* Donut chart + breakdown */}
      <div className="flex items-center gap-6">
        {/* Donut ring – pure CSS/SVG */}
        <div className="relative flex-shrink-0 w-[130px] h-[130px]">
          <svg
            className="w-full h-full -rotate-90"
            viewBox="0 0 120 120"
          >
            {/* Background ring */}
            <circle
              cx="60"
              cy="60"
              r="54"
              fill="none"
              strokeWidth="10"
              className="stroke-muted-foreground/10"
            />
            {/* Late arc (amber) */}
            <circle
              cx="60"
              cy="60"
              r="54"
              fill="none"
              strokeWidth="10"
              className="stroke-amber-500"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={
                circumference -
                ((completionData.onTime + completionData.late) / 100) *
                  circumference
              }
              style={{ transition: "stroke-dashoffset 1s ease-out" }}
            />
            {/* On‑time arc (emerald, on top) */}
            <circle
              cx="60"
              cy="60"
              r="54"
              fill="none"
              strokeWidth="10"
              className="stroke-emerald-500"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={
                circumference -
                (completionData.onTime / 100) * circumference
              }
              style={{ transition: "stroke-dashoffset 1s ease-out" }}
            />
          </svg>

          {/* Centre text */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-3xl font-bold text-foreground leading-none">
              {completionData.overall}%
            </span>
            <span className="text-[10px] text-muted-foreground mt-0.5">
              completed
            </span>
          </div>
        </div>

        {/* Breakdown list */}
        <div className="flex-1 space-y-3">
          {breakdownItems.map((item) => (
            <div key={item.label} className="flex items-center gap-3">
              <item.icon className={`w-4 h-4 ${item.textColor}`} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-foreground font-medium">
                    {item.label}
                  </span>
                  <span className={`text-xs font-semibold ${item.textColor}`}>
                    {item.value}%
                  </span>
                </div>
                <div className="h-1.5 rounded-full bg-muted-foreground/10 overflow-hidden">
                  <div
                    className={`h-full rounded-full ${item.color} transition-all duration-700 ease-out`}
                    style={{ width: `${item.value}%` }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Daily trend */}
      <div className="mt-5 pt-4 border-t border-border">
        <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-3">
          Daily Trend
        </p>
        <div className="flex items-end justify-between gap-2 h-14">
          {dailyTrend.map((d) => {
            const barHeight = (d.rate / 100) * 100;
            return (
              <div
                key={d.day}
                className="flex-1 flex flex-col items-center gap-1"
              >
                <span className="text-[10px] font-semibold text-foreground">
                  {d.rate}%
                </span>
                <div className="w-full h-10 rounded-md bg-muted-foreground/10 relative overflow-hidden">
                  <div
                    className={`absolute bottom-0 left-0 right-0 rounded-md transition-all duration-500 ease-out ${
                      d.rate >= 80
                        ? "bg-emerald-500/80"
                        : d.rate >= 70
                        ? "bg-primary/70"
                        : "bg-amber-500/80"
                    }`}
                    style={{ height: `${barHeight}%` }}
                  />
                </div>
                <span className="text-[10px] text-muted-foreground font-medium">
                  {d.day}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
