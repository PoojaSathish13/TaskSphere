"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/infrastructure/api/api-client";
import { useAuthStore } from "@/infrastructure/store/auth-store";
import { useAuthorization } from "@/features/rbac/hooks/useAuthorization";
import { useRouter } from "next/navigation";
import { useLayoutStore } from "@/infrastructure/store/layout-store";

// Widgets Imports
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

import { 
  CheckCircle2, 
  ClipboardList, 
  TrendingUp, 
  AlertOctagon, 
  UserCheck, 
  Activity,
  Monitor,
  Sliders,
  Users,
  ShieldAlert,
  Bell,
  Building,
  PlusCircle,
  FileText,
  Tag,
  Clock,
  Download,
  Folder,
  Search,
  ChevronRight,
  AlertCircle
} from "lucide-react";

type DashboardScreen = "home" | "team" | "manager" | "admin" | "client";

const screenLabels: Record<DashboardScreen, string> = {
  home: "Dashboard Home",
  team: "Team Productivity Dashboard",
  manager: "Manager Dashboard",
  admin: "Admin Dashboard",
  client: "Client Dashboard",
};

interface NotificationItem {
  id: string;
  verb: string;
  description: string;
  is_read: boolean;
  created_at: string;
}

interface ProjectItem {
  id: string;
  name: string;
  description: string;
  is_active: boolean;
  is_client_visible: boolean;
}

export const DashboardGrid: React.FC = () => {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { activeOrganizationId, user } = useAuthStore();
  const { roleName } = useAuthorization();
  const [activeScreen, setActiveScreen] = useState<DashboardScreen>("home");

  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Query: Notifications list
  const { data: notifications = [] } = useQuery<NotificationItem[]>({
    queryKey: ["notifications-list", activeOrganizationId],
    queryFn: async () => {
      const res = await apiClient.get("/api/v1/notifications/");
      return res.data;
    },
    enabled: !!activeOrganizationId && activeScreen === "home",
  });

  // Query: Active Projects list
  const { data: projects = [] } = useQuery<ProjectItem[]>({
    queryKey: ["projects-list", activeOrganizationId],
    queryFn: async () => {
      const res = await apiClient.get("/api/v1/timesheets/projects/");
      return res.data.data || [];
    },
    enabled: !!activeOrganizationId && activeScreen === "home",
  });

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
    <div className="space-y-6 select-none text-foreground pb-12">
      
      {/* Header & Screen Selector */}
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-white/25 pb-5 gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-800 flex items-center gap-2">
            <Monitor className="h-6 w-6 text-indigo-600" />
            <span>Workspace Control Center</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1 leading-relaxed">
            Role: <span className="text-indigo-600 font-semibold">{roleName || "Workspace Member"}</span> | Scope: Multi-tenant isolated workspace
          </p>
        </div>

        {/* Dynamic Screen Selection Tab Bar */}
        <div className="bg-white/35 p-1.5 border border-white/50 backdrop-blur-md rounded-2xl flex gap-1 self-start md:self-auto overflow-x-auto max-w-full shadow-sm">
          {(["home", "team", "manager", "admin", "client"] as DashboardScreen[]).map((screen) => (
            <button
              key={screen}
              onClick={() => setActiveScreen(screen)}
              className={`py-1.5 px-3 rounded-xl text-[10px] font-bold uppercase tracking-wider shrink-0 transition ${
                activeScreen === screen
                  ? "bg-indigo-600 text-white shadow-md"
                  : "text-slate-500 hover:text-slate-800 hover:bg-white/50"
              }`}
            >
              {screenLabels[screen]}
            </button>
          ))}
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 1. SCREEN: DASHBOARD HOME                                     */}
      {/* ------------------------------------------------------------- */}
      {activeScreen === "home" && (
        <div className="space-y-6">
          
          {/* Welcome Header bar matching mockup */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-transparent pb-1">
            <div className="space-y-1">
              <span className="text-[11px] font-bold text-slate-500 block">Hi, {user?.first_name || "Alex"}! 👋</span>
              <h2 className="text-xl font-extrabold text-slate-800 tracking-tight">Welcome Back, {user?.first_name || "Alex"}!</h2>
            </div>
            
            {/* Header Actions: Search & Bell */}
            <div className="flex items-center gap-3 self-end sm:self-auto">
              
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                <input 
                  id="dashboardSearch"
                  name="dashboardSearch"
                  autoComplete="off"
                  aria-label="Search"
                  type="text" 
                  placeholder="Search" 
                  className="pl-9 pr-4 py-1.5 w-44 sm:w-56 bg-white border border-[#d0d7de] rounded-md text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-[#0969da] shadow-sm"
                />
              </div>
              <button 
                onClick={() => router.push("/notifications")}
                className="p-2 bg-white hover:bg-slate-50 border border-[#d0d7de] rounded-md text-slate-700 transition relative shadow-sm"
                aria-label="View notifications inbox"
              >
                <Bell className="h-4 w-4" />
                <span className="absolute top-1.5 right-1.5 h-2 w-2 bg-rose-500 rounded-full border border-white" />
              </button>
            </div>
          </div>

          {/* Three-Column Dashboard Grid */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
            
            {/* Left Panel: Column-1 (Col-span-3) */}
            <div className="md:col-span-3 space-y-6">
              
              {/* Tasks Completed Circular Gauge */}
              <div className="p-5 glass-card-premium rounded-md space-y-4 flex flex-col items-center text-center">
                <div className="w-full flex justify-between items-center text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                  <span>Tasks Completed</span>
                  <Sliders className="h-3.5 w-3.5 text-slate-400" />
                </div>
                
                <div className="relative flex items-center justify-center">
                  <svg className="w-28 h-28 transform -rotate-90" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="40" stroke="#d0d7de" strokeWidth="8" fill="transparent" />
                    <circle 
                      cx="50" 
                      cy="50" 
                      r="40" 
                      stroke="#2da44e" 
                      strokeWidth="8" 
                      fill="transparent" 
                      strokeDasharray="251" 
                      strokeDashoffset={251 - (251 * 84) / 100}
                      strokeLinecap="round"
                    />
                  </svg>
                  <span className="absolute text-xl font-black text-slate-800">84%</span>
                </div>
              </div>

              {/* Active Projects Vertical Bars */}
              <div className="p-5 glass-card-premium rounded-md space-y-3">
                <div className="flex justify-between items-center text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                  <span>Active Projects</span>
                  <ChevronRight className="h-4 w-4 text-slate-400" />
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-black text-slate-800">12</span>
                </div>
                
                {/* SVG Vertical bars */}
                <div className="flex items-end justify-between h-14 px-1 pt-1.5">
                  {[25, 45, 80, 50, 70, 40, 60].map((h, i) => (
                    <div 
                      key={i} 
                      style={{ height: `${h}%` }} 
                      className={`w-2.5 rounded-t-sm ${
                        i === 0 ? "bg-[#0969da]" :
                        i === 1 ? "bg-[#57606a]" :
                        i === 2 ? "bg-[#2da44e]" :
                        i === 3 ? "bg-[#bf8700]" :
                        i === 4 ? "bg-[#0969da]" : 
                        i === 5 ? "bg-[#2da44e]" : "bg-[#57606a]"
                      }`}
                    />
                  ))}
                </div>
              </div>

              {/* Due Today horizontal metrics */}
              <div className="p-5 glass-card-premium rounded-md space-y-3">
                <div className="flex justify-between items-center text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                  <span>Due Today</span>
                  <span className="font-mono text-[#0969da] font-bold">5</span>
                </div>
                
                <div className="space-y-3 pt-1">
                  <div className="space-y-1">
                    <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-[#0969da] rounded-full" style={{ width: "70%" }} />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-[#2da44e] rounded-full" style={{ width: "85%" }} />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-[#bf8700] rounded-full" style={{ width: "40%" }} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Team Activity wave line */}
              <div className="p-5 glass-card-premium rounded-md space-y-3">
                <div className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Team Activity</div>
                <div className="pt-2">
                  <svg className="w-full h-12 text-[#0969da]" viewBox="0 0 100 30" preserveAspectRatio="none">
                    <path 
                      d="M0,25 C20,10 40,30 60,15 C80,0 90,20 100,10 L100,30 L0,30 Z" 
                      fill="url(#wave-grad-home)" 
                      stroke="#0969da" 
                      strokeWidth="1.5" 
                    />
                    <defs>
                      <linearGradient id="wave-grad-home" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#0969da" stopOpacity="0.2" />
                        <stop offset="100%" stopColor="#0969da" stopOpacity="0" />
                      </linearGradient>
                    </defs>
                  </svg>
                </div>
              </div>

            </div>

            {/* Middle Panel: Column-2 (Col-span-5) */}
            <div className="md:col-span-5 space-y-6">
              
              {/* Project Overview */}
              <div className="p-5 glass-card-premium rounded-md space-y-4">
                <div className="flex justify-between items-center text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                  <span>Project Overview</span>
                  <Sliders className="h-4 w-4 text-slate-400" />
                </div>
                
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-sm text-slate-800">Marketing Launch Q4</h3>
                    <p className="text-[10px] text-slate-500 mt-0.5">Brand guidelines & strategy</p>
                  </div>
                  <span className="font-mono text-sm font-black text-slate-800">75%</span>
                </div>

                <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-[#0969da] rounded-full" style={{ width: "75%" }} />
                </div>

                <div className="flex items-center justify-between pt-1">
                  {/* Team stack */}
                  <div className="flex items-center">
                    <div className="flex -space-x-1.5">
                      {["US", "EM", "JD", "AM"].map((initial, i) => (
                        <div 
                          key={i} 
                          className={`h-6 w-6 rounded-full border border-white flex items-center justify-center font-bold text-[8px] text-white shadow-sm ${
                            i === 0 ? "bg-slate-400" :
                            i === 1 ? "bg-slate-500" :
                            i === 2 ? "bg-slate-600" : "bg-slate-700"
                          }`}
                        >
                          {initial}
                        </div>
                      ))}
                    </div>
                    <span className="text-[9px] font-bold text-slate-500 ml-2">+2</span>
                  </div>
                  
                  <span className="px-2 py-0.5 bg-[#2da44e] text-white font-bold rounded text-[8px] uppercase">
                    Done
                  </span>
                </div>
              </div>

              {/* Project Progress waves */}
              <div className="p-5 glass-card-premium rounded-md space-y-4">
                <div className="flex justify-between items-center text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                  <span>Project Progress</span>
                  <span className="text-slate-700 font-bold">4 projects</span>
                </div>
                
                {/* Wavy line charts representation */}
                <div className="relative h-28 pt-2">
                  <svg className="w-full h-full" viewBox="0 0 300 100" preserveAspectRatio="none">
                    {/* Grid lines */}
                    <line x1="0" y1="25" x2="300" y2="25" stroke="#d0d7de" strokeDasharray="4 4" />
                    <line x1="0" y1="50" x2="300" y2="50" stroke="#d0d7de" strokeDasharray="4 4" />
                    <line x1="0" y1="75" x2="300" y2="75" stroke="#d0d7de" strokeDasharray="4 4" />

                    {/* Wave 1: Alpha (Blue) */}
                    <path d="M0,75 C50,30 100,90 150,45 C200,10 250,70 300,35" fill="none" stroke="#0969da" strokeWidth="2" strokeLinecap="round" />
                    {/* Wave 2: Beta (Dark Gray) */}
                    <path d="M0,85 C60,55 120,35 180,75 C240,100 270,25 300,45" fill="none" stroke="#57606a" strokeWidth="2" strokeLinecap="round" />
                    {/* Wave 3: Delta (Light Gray) */}
                    <path d="M0,55 C40,85 90,25 160,65 C210,95 260,35 300,25" fill="none" stroke="#8c959f" strokeWidth="2" strokeLinecap="round" />
                    {/* Wave 4: Gamma (Green) */}
                    <path d="M0,70 C70,25 130,80 200,40 C250,15 280,55 300,30" fill="none" stroke="#2da44e" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                  
                  {/* Floating tooltip */}
                  <div className="absolute top-2 right-12 bg-slate-800 text-white font-mono font-bold text-[8px] px-1.5 py-0.5 rounded shadow">
                    4 projects
                  </div>
                </div>

                <div className="flex justify-between items-center text-[8px] font-mono text-slate-500 pt-1">
                  <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-[#0969da]" /> Alpha</span>
                  <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-[#57606a]" /> Beta</span>
                  <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-[#8c959f]" /> Delta</span>
                  <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-[#2da44e]" /> Gamma</span>
                </div>
              </div>

              {/* Calendar & Deadlines */}
              <div className="p-5 glass-card-premium rounded-md space-y-4">
                <div className="flex justify-between items-center text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                  <span>Calendar & Deadlines</span>
                  <ChevronRight className="h-4 w-4 text-slate-400 cursor-pointer" />
                </div>
                
                {/* Minimal Calendar Grid */}
                <div className="space-y-3">
                  {/* Days header */}
                  <div className="grid grid-cols-7 text-center text-[9px] font-bold text-slate-500">
                    <span>Sun</span><span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span>
                  </div>
                  
                  {/* Dates grid */}
                  <div className="grid grid-cols-7 text-center text-[10px] font-bold text-slate-800 gap-y-2">
                    <span className="text-slate-300">30</span>
                    <span className="relative flex justify-center items-center h-5 w-full"><span className="bg-blue-100 text-[#0969da] rounded-full h-5 w-5 flex items-center justify-center">1</span></span>
                    <span>2</span><span>3</span><span>4</span><span>5</span><span>6</span>
                    <span className="relative flex justify-center items-center">7<span className="absolute bottom-0 h-1 w-1 bg-rose-500 rounded-full" /></span>
                    <span>8</span><span>9</span><span>10</span><span>11</span><span>12</span><span>13</span>
                    <span>14</span><span>15</span><span>16</span><span>17</span><span>18</span><span>19</span><span>20</span>
                    <span>21</span><span>22</span><span>23</span><span>24</span><span>25</span><span>26</span><span>27</span>
                    <span>28</span><span>29</span><span>30</span><span>31</span>
                    <span className="text-slate-300">1</span><span className="text-slate-300">2</span><span className="text-slate-300">3</span>
                  </div>
                </div>
              </div>

            </div>

            {/* Right Panel: Column-3 (Col-span-4) */}
            <div className="md:col-span-4 space-y-6">
              
              {/* My Tasks Checklist */}
              <div className="p-5 glass-card-premium rounded-md space-y-4">
                <div className="flex justify-between items-center text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                  <span>My Tasks</span>
                  <Sliders className="h-4 w-4 text-slate-400" />
                </div>

                <div className="space-y-3">
                  {/* Item 1 */}
                  <div className="flex justify-between items-center p-3 bg-slate-50/50 border border-slate-100 rounded-xl text-xs">
                    <div className="flex items-center gap-2">
                      <input 
                        id="chk-finalize-designs"
                        name="chk-finalize-designs"
                        autoComplete="off"
                        aria-label="Mark Finalize Designs as complete"
                        type="checkbox" 
                        defaultChecked 
                        onClick={() => showToast("Task status toggled", "success")}
                        className="rounded border-slate-300 text-[#0969da] focus:ring-[#0969da] h-3.5 w-3.5 cursor-pointer"
                      />
                      <div>
                        <span className="font-bold text-slate-800 line-through">Finalize Designs</span>
                        <p className="text-[8px] text-slate-500">Done items</p>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 bg-emerald-50 text-emerald-600 font-bold rounded text-[8px] uppercase border border-emerald-200">
                      Done
                    </span>
                  </div>
                  
                  {/* Item 2 */}
                  <div className="flex justify-between items-center p-3 bg-slate-50/50 border border-slate-100 rounded-xl text-xs">
                    <div className="flex items-center gap-2">
                      <input 
                        id="chk-team-meeting"
                        name="chk-team-meeting"
                        autoComplete="off"
                        aria-label="Mark Team Meeting as complete"
                        type="checkbox" 
                        onClick={() => showToast("Task status toggled", "success")}
                        className="rounded border-slate-300 text-[#0969da] focus:ring-[#0969da] h-3.5 w-3.5 cursor-pointer"
                      />
                      <div>
                        <span className="font-bold text-slate-800">Team Meeting</span>
                        <p className="text-[8px] text-slate-500">High Task</p>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 bg-rose-50 text-rose-600 font-bold rounded text-[8px] uppercase border border-rose-200">
                      High
                    </span>
                  </div>

                  {/* Item 3 */}
                  <div className="flex justify-between items-center p-3 bg-slate-50/50 border border-slate-100 rounded-xl text-xs">
                    <div className="flex items-center gap-2">
                      <input 
                        id="chk-client-feedback"
                        name="chk-client-feedback"
                        autoComplete="off"
                        aria-label="Mark client Feedback as complete"
                        type="checkbox" 
                        onClick={() => showToast("Task status toggled", "success")}
                        className="rounded border-slate-300 text-[#0969da] focus:ring-[#0969da] h-3.5 w-3.5 cursor-pointer"
                      />
                      <div>
                        <span className="font-bold text-slate-800">client Feedback</span>
                        <p className="text-[8px] text-slate-500">Medium feedback</p>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 bg-amber-50 text-amber-600 font-bold rounded text-[8px] uppercase border border-amber-200">
                      Medium
                    </span>
                  </div>
                </div>
              </div>

              {/* Recent Activity */}
              <div className="p-5 glass-card-premium rounded-md space-y-4">
                <div className="flex justify-between items-center text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                  <span>Recent Activity</span>
                  <Sliders className="h-4 w-4 text-slate-400" />
                </div>

                <div className="space-y-3.5 max-h-[300px] overflow-y-auto pr-1">
                  {[
                    { name: "Team Member", time: "Actions 4 monts ago", initial: "JS", bg: "bg-rose-400" },
                    { name: "Team Member", time: "Actions 3 monts ago", initial: "DL", bg: "bg-amber-400" },
                    { name: "Team Member", time: "Actions 2 monts ago", initial: "RM", bg: "bg-emerald-400" },
                    { name: "Team Member", time: "Actions 3 meer ago", initial: "KB", bg: "bg-sky-400" }
                  ].map((act, i) => (
                    <div key={i} className="flex justify-between items-center text-xs gap-3">
                      <div className="flex items-center gap-2.5">
                        <div className={`h-8 w-8 rounded-full flex items-center justify-center font-bold text-xs text-white shadow-sm ${act.bg}`}>
                          {act.initial}
                        </div>
                        <div className="space-y-0.5">
                          <span className="font-bold text-slate-800 block">{act.name}</span>
                          <span className="text-[8px] text-slate-500 block">{act.time}</span>
                        </div>
                      </div>
                      <ChevronRight className="h-4 w-4 text-slate-400 cursor-pointer" />
                    </div>
                  ))}
                </div>
              </div>

            </div>

          </div>

        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 2. SCREEN: TEAM PRODUCTIVITY                                  */}
      {/* ------------------------------------------------------------- */}
      {activeScreen === "team" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="space-y-3">
              <h3 className="text-[10px] font-bold text-[#8e8e95] uppercase tracking-widest pl-1">📈 Team Completion Velocity</h3>
              <TeamCompletionRateWidget />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <h3 className="text-[10px] font-bold text-[#8e8e95] uppercase tracking-widest pl-1">👥 Active Contributors</h3>
                <ActiveContributorsWidget />
              </div>
              <div className="space-y-3">
                <h3 className="text-[10px] font-bold text-[#8e8e95] uppercase tracking-widest pl-1">⏱ Planner Timeline</h3>
                <DailyTimelineWidget />
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="space-y-3">
              <h3 className="text-[10px] font-bold text-[#8e8e95] uppercase tracking-widest pl-1">Capacity index</h3>
              <TeamCapacityWidget />
            </div>
            <div className="space-y-3">
              <h3 className="text-[10px] font-bold text-[#8e8e95] uppercase tracking-widest pl-1">Workload distribution</h3>
              <WorkloadDistributionWidget />
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 3. SCREEN: MANAGER DASHBOARD                                  */}
      {/* ------------------------------------------------------------- */}
      {activeScreen === "manager" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="space-y-3">
              <h3 className="text-[10px] font-bold text-[#8e8e95] uppercase tracking-widest pl-1">Approvals & Timesheets</h3>
              <PendingApprovalsWidget />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <h3 className="text-[10px] font-bold text-[#8e8e95] uppercase tracking-widest pl-1">Risk Factors</h3>
                <RiskIndicatorsWidget />
              </div>
              <div className="space-y-3">
                <h3 className="text-[10px] font-bold text-[#8e8e95] uppercase tracking-widest pl-1">Delayed tasks</h3>
                <DelayedTasksWidget />
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="space-y-3">
              <h3 className="text-[10px] font-bold text-[#8e8e95] uppercase tracking-widest pl-1">Health rating</h3>
              <HealthScoreWidget score={84} />
            </div>
            <div className="space-y-3">
              <h3 className="text-[10px] font-bold text-[#8e8e95] uppercase tracking-widest pl-1">Open Blocker lists</h3>
              <ActiveBlockersWidget />
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 4. SCREEN: ADMIN DASHBOARD                                    */}
      {/* ------------------------------------------------------------- */}
      {activeScreen === "admin" && (
        <div className="space-y-6 max-w-4xl mx-auto animate-slide-up">
          <div className="bg-white border border-[#d0d7de] p-6 rounded-md shadow-sm space-y-6">
            
            <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
              <div>
                <h3 className="font-extrabold text-sm text-slate-800 uppercase tracking-wider">Tenant Subscription Overview</h3>
                <p className="text-[10px] text-slate-500 mt-0.5">SaaS account tier, utilization stats, and active seat allocation quotas.</p>
              </div>
              <button 
                onClick={() => router.push("/settings")}
                className="py-1.5 px-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[10px] uppercase tracking-wider rounded-lg transition"
              >
                Configure Settings
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="p-4 bg-slate-50/50 border border-slate-100 rounded-md space-y-2">
                <span className="text-[9px] uppercase font-bold text-slate-500">Current Plan Tier</span>
                <span className="text-2xl font-black text-indigo-600 block">SaaS Pro</span>
              </div>
              <div className="p-4 bg-slate-50/50 border border-slate-100 rounded-md space-y-2">
                <span className="text-[9px] uppercase font-bold text-slate-500">Active Member Seats</span>
                <span className="text-2xl font-black text-slate-800 block">8 / 50</span>
              </div>
              <div className="p-4 bg-slate-50/50 border border-slate-100 rounded-md space-y-2">
                <span className="text-[9px] uppercase font-bold text-slate-500">Task Limits count</span>
                <span className="text-2xl font-black text-slate-800 block">126 / 500</span>
              </div>
            </div>

            <div className="space-y-3.5">
              <span className="text-[10px] uppercase font-bold text-slate-500 block border-b border-slate-100 pb-1">System Invoice Registry</span>
              <div className="space-y-2.5">
                {[
                  { id: "INV-0012", date: "June 15, 2026", amount: "$29.00", status: "PAID" },
                  { id: "INV-0011", date: "May 15, 2026", amount: "$29.00", status: "PAID" }
                ].map((inv) => (
                  <div key={inv.id} className="flex items-center justify-between p-3 bg-slate-50/30 border border-slate-100 rounded-md text-xs">
                    <div className="space-y-0.5">
                      <span className="font-bold text-slate-800 block">{inv.id}</span>
                      <span className="text-[10px] text-slate-500">Issued on {inv.date}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-slate-800">{inv.amount}</span>
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-600 border border-emerald-200">
                        {inv.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 5. SCREEN: CLIENT DASHBOARD                                   */}
      {/* ------------------------------------------------------------- */}
      {activeScreen === "client" && (
        <div className="space-y-6 max-w-4xl mx-auto animate-slide-up">
          <div className="bg-white border border-[#d0d7de] p-6 rounded-md shadow-sm space-y-6">
            
            <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
              <div>
                <h3 className="font-extrabold text-sm text-slate-800 uppercase tracking-wider">Client Portal Interface</h3>
                <p className="text-[10px] text-slate-500 mt-0.5">Externally visible milestone releases, deliverables sign-offs, and documents.</p>
              </div>
              <button 
                onClick={() => router.push("/client-portal")}
                className="py-1.5 px-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[10px] uppercase tracking-wider rounded-lg transition"
              >
                Enter Portal Page
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Releases summary */}
              <div className="p-4 bg-slate-50/50 border border-slate-100 rounded-md space-y-3">
                <span className="text-[10px] uppercase font-bold text-indigo-600 block border-b border-slate-100 pb-1">Milestone Releases</span>
                <div className="space-y-2">
                  {[
                    { version: "v1.2.0-beta", date: "June 20, 2026", status: "BETA" },
                    { version: "v1.1.0", date: "May 10, 2026", status: "RELEASED" }
                  ].map((r) => (
                    <div key={r.version} className="flex justify-between items-center text-xs">
                      <span className="font-mono font-bold text-slate-800">{r.version}</span>
                      <div className="flex items-center gap-2 text-[10px] text-slate-500">
                        <span>{r.date}</span>
                        <span className={`px-1 rounded text-[8px] font-bold ${
                          r.status === "RELEASED" ? "bg-emerald-50 text-emerald-600 border border-emerald-200" : "bg-sky-50 text-sky-600 border border-sky-200"
                        }`}>{r.status}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Sign-offs summary */}
              <div className="p-4 bg-slate-50/50 border border-slate-100 rounded-md space-y-3">
                <span className="text-[10px] uppercase font-bold text-indigo-600 block border-b border-slate-100 pb-1">Client Approval requests</span>
                <div className="space-y-2">
                  {[
                    { title: "Sprint 4 UI mockup assets Signoff", status: "PENDING" },
                    { title: "Timesheet cycle May signoff", status: "APPROVED" }
                  ].map((a) => (
                    <div key={a.title} className="flex justify-between items-center text-xs">
                      <span className="truncate max-w-[180px] text-slate-800">{a.title}</span>
                      <span className={`px-1 rounded text-[8px] font-bold shrink-0 ${
                        a.status === "APPROVED" ? "bg-emerald-50 text-emerald-600 border border-emerald-200" : "bg-amber-50 text-amber-600 border border-amber-200"
                      }`}>{a.status}</span>
                    </div>
                  ))}
                </div>
              </div>

            </div>

          </div>
        </div>
      )}

    </div>
  );
};
export default DashboardGrid;
