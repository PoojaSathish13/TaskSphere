"use client";

import React from "react";
import HealthScoreWidget from "./HealthScoreWidget";
import ActiveBlockersWidget from "./ActiveBlockersWidget";
import RiskIndicatorsWidget from "./RiskIndicatorsWidget";
import TodayTasksWidget from "./TodayTasksWidget";
import FocusTasksWidget from "./FocusTasksWidget";
import TeamCompletionRateWidget from "./TeamCompletionRateWidget";
import DelayedTasksWidget from "./DelayedTasksWidget";
import TeamCapacityWidget from "./TeamCapacityWidget";
import WorkloadDistributionWidget from "./WorkloadDistributionWidget";
import ActiveContributorsWidget from "./ActiveContributorsWidget";
import PendingApprovalsWidget from "./PendingApprovalsWidget";
import TimeSpentWidget from "./TimeSpentWidget";
import ProductivityTrendsWidget from "./ProductivityTrendsWidget";
import DailyTimelineWidget from "./DailyTimelineWidget";
import RecentActivityFeed from "./RecentActivityFeed";
import { CheckCircle2, ClipboardList, TrendingUp, AlertOctagon, UserCheck, Activity } from "lucide-react";

export const DashboardGrid: React.FC = () => {
  // Static KPI Metrics
  const kpis = [
    { title: "Tasks Completed", value: "48", icon: <CheckCircle2 className="h-4 w-4 text-emerald-400" /> },
    { title: "Open Tasks", value: "12", icon: <ClipboardList className="h-4 w-4 text-sky-400" /> },
    { title: "Team Utilization", value: "84%", icon: <Activity className="h-4 w-4 text-indigo-400" /> },
    { title: "Approvals Pending", value: "2", icon: <UserCheck className="h-4 w-4 text-purple-400" /> },
    { title: "Productivity Score", value: "94%", icon: <TrendingUp className="h-4 w-4 text-teal-400" /> },
    { title: "Projects At Risk", value: "1", icon: <AlertOctagon className="h-4 w-4 text-rose-400" /> },
  ];

  return (
    <div className="space-y-6">
      
      {/* 1. Header Greetings */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Workspace Overview</h1>
        <p className="text-xs text-muted-foreground mt-0.5">Welcome back to TaskSphere. Manage tasks, timelines, and team access.</p>
      </div>

      {/* 2. KPI Metrics Summary Cards Row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        {kpis.map((kpi, idx) => (
          <div key={idx} className="bg-card border border-border rounded-xl p-4 shadow-sm flex flex-col justify-between h-20 select-none">
            <div className="flex justify-between items-center text-[10px] text-muted-foreground uppercase font-bold tracking-wider">
              <span>{kpi.title}</span>
              <span>{kpi.icon}</span>
            </div>
            <span className="text-xl font-extrabold text-foreground tracking-tight mt-1">
              {kpi.value}
            </span>
          </div>
        ))}
      </div>

      {/* 3. Core Workspace Dashboard Layout Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left/Center Panel (Col-span-2): Operational tasks, analytics, approvals, feeds */}
        <div className="lg:col-span-2 space-y-6">
          <div className="space-y-4">
            <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-widest pl-1">📅 Today Overview</h2>
            <TodayTasksWidget />
            <FocusTasksWidget />
          </div>

          <div className="space-y-4">
            <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-widest pl-1">📊 Analytics</h2>
            <ProductivityTrendsWidget />
            <TeamCompletionRateWidget />
          </div>

          <div className="space-y-4">
            <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-widest pl-1">💬 Feeds & Approvals</h2>
            <PendingApprovalsWidget />
            <RecentActivityFeed />
          </div>
        </div>

        {/* Right Panel (Col-span-1): KPI Gauges, blockers, overload capacities, timelines, risks */}
        <div className="space-y-6">
          <div>
            <HealthScoreWidget score={84} />
          </div>

          <div className="space-y-4">
            <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-widest pl-1">⚠️ Risk Panel</h2>
            <ActiveBlockersWidget />
            <DelayedTasksWidget />
            <RiskIndicatorsWidget />
          </div>

          <div className="space-y-4">
            <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-widest pl-1">👥 Team Insights</h2>
            <TeamCapacityWidget />
            <WorkloadDistributionWidget />
            <ActiveContributorsWidget />
          </div>

          <div className="space-y-4">
            <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-widest pl-1">⏱ Execution Tracking</h2>
            <DailyTimelineWidget />
            <TimeSpentWidget />
          </div>
        </div>

      </div>

    </div>
  );
};
export default DashboardGrid;
