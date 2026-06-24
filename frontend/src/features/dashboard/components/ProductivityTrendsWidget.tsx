"use client";

import React, { useState } from "react";
import { AreaChart } from "lucide-react";

export const ProductivityTrendsWidget: React.FC = () => {
  const [timeframe, setTimeframe] = useState<"7D" | "30D" | "90D">("7D");

  // Dynamic datasets depending on toggles
  const datasets = {
    "7D": {
      data: [12, 19, 15, 25, 22, 30, 28],
      labels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
      maxScale: 35,
    },
    "30D": {
      data: [110, 140, 130, 160, 150, 190, 185],
      labels: ["W1", "W2", "W3", "W4", "W5", "W6", "W7"],
      maxScale: 220,
    },
    "90D": {
      data: [350, 420, 390, 480, 460, 520, 505],
      labels: ["M1", "M2", "M3", "M4", "M5", "M6", "M7"],
      maxScale: 600,
    },
  };

  const activeDataset = datasets[timeframe];
  
  const width = 500;
  const height = 120;
  const padding = 20;
  
  const points = activeDataset.data.map((val, idx) => {
    const x = padding + (idx * (width - 2 * padding)) / (activeDataset.data.length - 1);
    const y = height - padding - (val * (height - 2 * padding)) / activeDataset.maxScale;
    return { x, y };
  });

  const pathD = points.reduce(
    (acc, pt, idx) => (idx === 0 ? `M ${pt.x} ${pt.y}` : `${acc} L ${pt.x} ${pt.y}`),
    ""
  );

  const fillD = `${pathD} L ${points[points.length - 1].x} ${height - padding} L ${points[0].x} ${height - padding} Z`;

  return (
    <div className="bg-card border border-border rounded-xl p-5 shadow-sm space-y-4 col-span-1 md:col-span-2 flex flex-col justify-between">
      {/* Header */}
      <div className="flex justify-between items-center border-b pb-2">
        <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
          Productivity Trends (Completions)
        </span>
        
        {/* Toggles */}
        <div className="flex gap-1 bg-muted p-0.5 rounded border">
          {(["7D", "30D", "90D"] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => setTimeframe(mode)}
              className={`px-2 py-0.5 rounded text-[9px] font-bold transition ${
                timeframe === mode
                  ? "bg-background text-indigo-400 font-semibold shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {mode}
            </button>
          ))}
        </div>
      </div>

      <div className="w-full h-36 flex flex-col justify-between">
        {/* SVG Area Chart */}
        <svg className="w-full h-28 overflow-visible animate-in fade-in duration-300" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
          <line x1={padding} y1={padding} x2={width - padding} y2={padding} className="stroke-border/30" strokeDasharray="4 4" />
          <line x1={padding} y1={height / 2} x2={width - padding} y2={height / 2} className="stroke-border/30" strokeDasharray="4 4" />
          <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} className="stroke-border/50" />

          <defs>
            <linearGradient id="chartGradDynamic" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="rgb(99, 102, 241)" stopOpacity="0.25" />
              <stop offset="100%" stopColor="rgb(99, 102, 241)" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          <path d={fillD} fill="url(#chartGradDynamic)" />
          <path d={pathD} fill="none" className="stroke-primary" strokeWidth="2" strokeLinecap="round" />

          {points.map((pt, idx) => (
            <circle
              key={idx}
              cx={pt.x}
              cy={pt.y}
              r="3.5"
              className="fill-background stroke-primary"
              strokeWidth="1.5"
            />
          ))}
        </svg>

        {/* Labels */}
        <div className="flex justify-between px-5 text-[9px] text-muted-foreground font-semibold">
          {activeDataset.labels.map((lbl, idx) => (
            <span key={idx}>{lbl}</span>
          ))}
        </div>
      </div>
    </div>
  );
};
export default ProductivityTrendsWidget;
