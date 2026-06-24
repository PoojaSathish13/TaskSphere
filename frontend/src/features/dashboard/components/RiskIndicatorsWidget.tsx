"use client";

import React from "react";
import { ShieldAlert, Info } from "lucide-react";

interface RiskItem {
  id: string;
  name: string;
  factor: string;
  level: "WARNING" | "CRITICAL";
}

export const RiskIndicatorsWidget: React.FC = () => {
  const risks: RiskItem[] = [
    { id: "1", name: "SLA Deadline Slippage", factor: "Sprint velocity reduced by 15%", level: "WARNING" },
    { id: "2", name: "GDPR Compliance Audit", factor: "Audit trails missing on API endpoints", level: "CRITICAL" },
  ];

  return (
    <div className="bg-card border border-border rounded-xl p-5 shadow-sm space-y-4 flex flex-col justify-between">
      <div className="flex justify-between items-center">
        <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
          Risk Indicators
        </span>
        <ShieldAlert className="h-4 w-4 text-amber-500" />
      </div>

      <div className="space-y-2">
        {risks.map((risk) => (
          <div
            key={risk.id}
            className="p-2.5 rounded-lg bg-muted/40 border border-border text-xs flex gap-3 transition hover:bg-muted/60"
          >
            <div className="mt-0.5">
              <Info className={`h-4 w-4 ${
                risk.level === "CRITICAL" ? "text-rose-400" : "text-amber-400"
              }`} />
            </div>
            <div className="space-y-0.5 overflow-hidden">
              <p className="font-semibold text-foreground truncate">{risk.name}</p>
              <p className="text-[10px] text-muted-foreground leading-relaxed truncate">{risk.factor}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
export default RiskIndicatorsWidget;
