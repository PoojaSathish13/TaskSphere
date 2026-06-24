"use client";

import React from "react";
import { Activity } from "lucide-react";

interface HealthScoreWidgetProps {
  score?: number;
}

export const HealthScoreWidget: React.FC<HealthScoreWidgetProps> = ({
  score = 84,
}) => {
  const radius = 38;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  return (
    <div className="bg-card border border-border rounded-xl p-5 shadow-sm space-y-4 flex flex-col justify-between">
      <div className="flex justify-between items-center">
        <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
          Daily Health Score
        </span>
        <Activity className="h-4 w-4 text-indigo-400" />
      </div>

      <div className="flex items-center justify-center py-2 gap-6">
        {/* SVG Circle meter */}
        <div className="relative h-24 w-24">
          <svg className="h-full w-full -rotate-90">
            {/* Background tracking circle */}
            <circle
              cx="48"
              cy="48"
              r={radius}
              className="stroke-muted fill-none"
              strokeWidth="6"
            />
            {/* Foreground metric progress circle */}
            <circle
              cx="48"
              cy="48"
              r={radius}
              className="stroke-primary fill-none transition-all duration-500 ease-out"
              strokeWidth="6"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center flex-col leading-none">
            <span className="text-2xl font-extrabold tracking-tight text-foreground">
              {score}%
            </span>
          </div>
        </div>

        {/* Text descriptions */}
        <div className="space-y-1">
          <p className="text-xs font-semibold text-foreground">Status: Optimal</p>
          <p className="text-[10px] text-muted-foreground leading-relaxed max-w-[120px]">
            Velocity and task closure rates are matching targeted trends.
          </p>
        </div>
      </div>
    </div>
  );
};
export default HealthScoreWidget;
