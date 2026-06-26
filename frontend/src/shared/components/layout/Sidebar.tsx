"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLayoutStore } from "@/infrastructure/store/layout-store";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { useTenants } from "@/features/tenants/hooks/useTenants";
import { useAuthorization } from "@/features/rbac/hooks/useAuthorization";
import { HasPermission } from "@/features/rbac/components/HasPermission";
import { 
  Monitor, 
  Settings, 
  Shield, 
  ChevronLeft, 
  ChevronRight, 
  LogOut,
  User as UserIcon,
  HelpCircle,
  Building,
  AreaChart,
  Users,
  CheckSquare,
  Target,
  Calendar,
  ShieldAlert,
  Clock,
  Activity,
  UserCheck,
  Sliders,
  Bell,
  Folder,
  Tag,
  FileText
} from "lucide-react";

export const Sidebar: React.FC = () => {
  const pathname = usePathname();
  const { isSidebarCollapsed, toggleSidebar } = useLayoutStore();
  const { user, logout } = useAuth();
  const { organizations, activeOrganization, switchOrganization } = useTenants();
  const { roleName } = useAuthorization();
  
  const [isOrgDropdownOpen, setIsOrgDropdownOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  
  const orgRef = useRef<HTMLDivElement>(null);
  const userRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (orgRef.current && !orgRef.current.contains(event.target as Node)) {
        setIsOrgDropdownOpen(false);
      }
      if (userRef.current && !userRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const navItems = [
    { name: "Dashboard", href: "/dashboard", icon: <Monitor className="h-4 w-4" />, permission: "PROJECT_VIEW" },
    { name: "Projects", href: "/projects", icon: <Folder className="h-4 w-4" />, permission: "PROJECT_VIEW" },
    { name: "Tasks", href: "/tasks", icon: <CheckSquare className="h-4 w-4" />, permission: "PROJECT_VIEW" },
    { name: "Planner", href: "/planner", icon: <Calendar className="h-4 w-4" />, permission: "PROJECT_VIEW" },
    { name: "Blockers", href: "/blockers", icon: <ShieldAlert className="h-4 w-4" />, permission: "PROJECT_VIEW" },
    { name: "Standups", href: "/standups", icon: <UserCheck className="h-4 w-4" />, permission: "PROJECT_VIEW" },
    { name: "Timesheets", href: "/timesheets", icon: <Clock className="h-4 w-4" />, permission: "PROJECT_VIEW" },
    { name: "Productivity", href: "/productivity", icon: <Activity className="h-4 w-4" />, permission: "PROJECT_VIEW" },
    { name: "Releases", href: "/releases", icon: <Tag className="h-4 w-4" />, permission: "PROJECT_VIEW" },
    { name: "Client Portal", href: "/client-portal", icon: <Users className="h-4 w-4" />, permission: "PROJECT_VIEW" },
    { name: "Reports", href: "/reports", icon: <FileText className="h-4 w-4" />, permission: "PROJECT_VIEW" },
    { name: "Settings", href: "/settings", icon: <Settings className="h-4 w-4" />, permission: "PROJECT_VIEW" },
    { name: "Workspaces", href: "/workspace-select", icon: <Building className="h-4 w-4" />, permission: "PROJECT_VIEW" },
    { name: "SaaS Admin Panel", href: "/admin", icon: <Sliders className="h-4 w-4" />, permission: "ORG_MANAGE" },
  ];


  return (
    <aside
      className={`border-r border-[#d0d7de] bg-[#f6f8fa] flex flex-col justify-between transition-all duration-300 h-full select-none ${
        isSidebarCollapsed ? "w-16" : "w-60"
      }`}
    >
      <div className="space-y-4 flex flex-col min-h-0 flex-1">
        {/* Workspace Switcher Header */}
        <div className="p-4 border-b border-[#d0d7de] flex items-center justify-between relative" ref={orgRef}>
          {isSidebarCollapsed ? (
            <button
              onClick={() => setIsOrgDropdownOpen(!isOrgDropdownOpen)}
              className="h-8 w-8 rounded-md bg-white border border-[#d0d7de] shadow-sm flex items-center justify-center font-black text-[#0969da] text-xs mx-auto focus:outline-none transition hover:bg-slate-50"
            >
              {activeOrganization?.name ? activeOrganization.name.substring(0, 2).toUpperCase() : "TS"}
            </button>
          ) : (
            <div className="flex-1 flex items-center justify-between gap-2 overflow-hidden">
              <button
                onClick={() => setIsOrgDropdownOpen(!isOrgDropdownOpen)}
                className="flex items-center gap-2 text-left w-full hover:bg-slate-50 p-1.5 rounded-md bg-white border border-[#d0d7de] shadow-sm transition overflow-hidden focus:outline-none"
              >
                <span className="h-5 w-5 rounded bg-[#0969da] flex items-center justify-center font-bold text-white text-[9px] shrink-0">
                  {activeOrganization?.name ? activeOrganization.name.substring(0, 2).toUpperCase() : "TS"}
                </span>
                <span className="font-extrabold text-[10px] uppercase tracking-wide truncate text-slate-700 flex-1">
                  {activeOrganization?.name || "TaskSphere"}
                </span>
              </button>
            </div>
          )}

          {/* Toggle Sidebar Collapse Button */}
          {!isSidebarCollapsed && (
            <button
              onClick={toggleSidebar}
              className="p-1 rounded-md hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition ml-1"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>
          )}

          {/* Switcher Dropdown */}
          {isOrgDropdownOpen && (
            <div className={`absolute top-14 bg-white border border-[#d0d7de] rounded-md shadow-md z-dropdown py-1 w-52 overflow-hidden ${
              isSidebarCollapsed ? "left-14" : "left-4"
            }`}>
              <div className="text-[10px] font-bold text-slate-400 px-3 py-1.5 uppercase border-b border-[#d0d7de]">
                Switch workspace
              </div>
              {organizations.map((org) => (
                <button
                  key={org.id}
                  onClick={() => {
                    switchOrganization(org.id);
                    setIsOrgDropdownOpen(false);
                  }}
                  className={`w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-slate-50 transition text-xs ${
                    org.id === activeOrganization?.id ? "text-[#0969da] font-bold" : "text-slate-500"
                  }`}
                >
                  <Building className="h-3.5 w-3.5" />
                  <span className="truncate">{org.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Navigation Section */}
        <nav className="px-3 space-y-1 overflow-y-auto flex-1">
          {navItems.map((item) => (
            <HasPermission key={item.name} permission={item.permission}>
              <Link
                href={item.href}
                className={`flex items-center transition-all duration-150 ${
                  isSidebarCollapsed 
                    ? `justify-center h-8 w-8 mx-auto rounded-md ${
                        pathname === item.href
                          ? "bg-white text-[#0969da] border border-[#d0d7de] shadow-sm font-bold"
                          : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50"
                      }`
                    : `gap-3 px-3 py-2 rounded-md text-xs ${
                        pathname === item.href
                          ? "bg-white text-[#0969da] border border-[#d0d7de] shadow-sm font-bold"
                          : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50"
                      }`
                }`}
              >
                <span className="shrink-0">{item.icon}</span>
                {!isSidebarCollapsed && <span className="truncate">{item.name}</span>}
              </Link>
            </HasPermission>
          ))}
        </nav>
      </div>

      {/* Footer Profile Section */}
      <div className="p-3 border-t border-[#d0d7de] relative shrink-0" ref={userRef}>
        {isSidebarCollapsed ? (
          <button
            onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
            className="h-8 w-8 rounded-full bg-white border border-[#d0d7de] shadow-sm flex items-center justify-center text-xs font-bold text-[#0969da] mx-auto focus:outline-none hover:bg-slate-50 transition"
          >
            {user?.email ? user.email.substring(0, 1).toUpperCase() : "U"}
          </button>
        ) : (
          <button
            onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
            className="flex items-center gap-3 w-full hover:bg-slate-50 p-2 rounded-md bg-white border border-[#d0d7de] shadow-sm transition text-left focus:outline-none"
          >
            <span className="h-7 w-7 rounded-full bg-slate-100 border border-[#d0d7de] flex items-center justify-center text-xs font-bold text-slate-600 shrink-0">
              {user?.email ? user.email.substring(0, 1).toUpperCase() : "U"}
            </span>
            <div className="overflow-hidden flex-1 leading-tight">
              <p className="font-bold text-xs text-slate-800 truncate">
                {user?.first_name} {user?.last_name}
              </p>
              <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wide truncate">{roleName || "Member"}</p>
            </div>
          </button>
        )}

        {/* Expand trigger button when collapsed */}
        {isSidebarCollapsed && (
          <button
            onClick={toggleSidebar}
            className="absolute -top-3 -right-2 bg-white border border-[#d0d7de] text-slate-500 hover:text-slate-800 rounded-full p-0.5 shadow-sm"
          >
            <ChevronRight className="h-3 w-3" />
          </button>
        )}

        {/* User profile Menu Popover */}
        {isUserMenuOpen && (
          <div className={`absolute bg-white border border-[#d0d7de] rounded-md shadow-md z-dropdown py-1 w-48 overflow-hidden bottom-14 ${
            isSidebarCollapsed ? "left-14" : "left-3"
          }`}>
            <Link
              href="/settings"
              onClick={() => setIsUserMenuOpen(false)}
              className="flex items-center gap-2 px-3 py-2 text-xs text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition"
            >
              <Settings className="h-3.5 w-3.5" />
              <span>Settings</span>
            </Link>
            
            <Link
              href="#"
              onClick={() => setIsUserMenuOpen(false)}
              className="flex items-center gap-2 px-3 py-2 text-xs text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition"
            >
              <HelpCircle className="h-3.5 w-3.5" />
              <span>Docs / Help</span>
            </Link>

            <div className="border-t border-slate-100 my-1"></div>
            
            <button
              onClick={() => {
                logout();
                setIsUserMenuOpen(false);
              }}
              className="w-full flex items-center gap-2 px-3 py-2 text-xs text-rose-500 hover:bg-rose-50/10 text-left transition"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        )}
      </div>
    </aside>
  );
};
export default Sidebar;
