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
  ShieldAlert
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
    { name: "Dashboard", href: "/", icon: <Monitor className="h-4 w-4" />, permission: "PROJECT_VIEW" },
    { name: "Workspaces", href: "/workspace-select", icon: <Building className="h-4 w-4" />, permission: "PROJECT_VIEW" },
    { name: "Tasks", href: "/tasks", icon: <CheckSquare className="h-4 w-4" />, permission: "PROJECT_VIEW" },
    { name: "Daily Planner", href: "/planner", icon: <Calendar className="h-4 w-4" />, permission: "PROJECT_VIEW" },
    { name: "Focus Mode", href: "/focus", icon: <Target className="h-4 w-4" />, permission: "PROJECT_VIEW" },
    { name: "Blocker Center", href: "/blockers", icon: <ShieldAlert className="h-4 w-4" />, permission: "PROJECT_VIEW" },
    { name: "Client Portal", href: "/client", icon: <Users className="h-4 w-4" />, permission: "PROJECT_VIEW" },
    { name: "SaaS Settings", href: "/settings/saas", icon: <Settings className="h-4 w-4" />, permission: "ORG_MANAGE" },
    { name: "Role Policies (RBAC)", href: "/settings/rbac", icon: <Shield className="h-4 w-4" />, permission: "ORG_MANAGE" },
  ];

  return (
    <aside
      className={`border-r border-border bg-card flex flex-col justify-between transition-all duration-300 h-screen select-none ${
        isSidebarCollapsed ? "w-16" : "w-60"
      }`}
    >
      <div className="space-y-4">
        {/* Workspace Switcher Header */}
        <div className="p-4 border-b border-border flex items-center justify-between relative" ref={orgRef}>
          {isSidebarCollapsed ? (
            <button
              onClick={() => setIsOrgDropdownOpen(!isOrgDropdownOpen)}
              className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center font-bold text-primary-foreground text-xs mx-auto focus:outline-none"
            >
              {activeOrganization?.name.substring(0, 2).toUpperCase() || "TS"}
            </button>
          ) : (
            <div className="flex-1 flex items-center justify-between gap-2 overflow-hidden">
              <button
                onClick={() => setIsOrgDropdownOpen(!isOrgDropdownOpen)}
                className="flex items-center gap-2 text-left w-full hover:bg-muted/50 p-1.5 rounded-lg transition overflow-hidden focus:outline-none"
              >
                <span className="h-6 w-6 rounded bg-primary flex items-center justify-center font-bold text-primary-foreground text-xs shrink-0">
                  {activeOrganization?.name.substring(0, 2).toUpperCase() || "TS"}
                </span>
                <span className="font-bold text-xs truncate text-foreground flex-1">
                  {activeOrganization?.name || "TaskSphere"}
                </span>
              </button>
            </div>
          )}

          {/* Toggle Sidebar Collapse Button */}
          {!isSidebarCollapsed && (
            <button
              onClick={toggleSidebar}
              className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition ml-1"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>
          )}

          {/* Switcher Dropdown */}
          {isOrgDropdownOpen && (
            <div className={`absolute top-14 bg-card border border-border rounded-xl shadow-lg z-dropdown py-1 w-52 overflow-hidden ${
              isSidebarCollapsed ? "left-14" : "left-4"
            }`}>
              <div className="text-[10px] font-bold text-muted-foreground px-3 py-1.5 uppercase border-b">
                Switch workspace
              </div>
              {organizations.map((org) => (
                <button
                  key={org.id}
                  onClick={() => {
                    switchOrganization(org.id);
                    setIsOrgDropdownOpen(false);
                  }}
                  className={`w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-muted transition text-xs ${
                    org.id === activeOrganization?.id ? "text-primary font-semibold" : "text-muted-foreground"
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
        <nav className="px-3 space-y-1">
          {navItems.map((item) => (
            <HasPermission key={item.name} permission={item.permission}>
              <Link
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium transition duration-75 ${
                  pathname === item.href
                    ? "bg-muted text-foreground"
                    : "text-muted-foreground hover:bg-muted/40 hover:text-foreground"
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
      <div className="p-3 border-t border-border relative" ref={userRef}>
        {isSidebarCollapsed ? (
          <button
            onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
            className="h-8 w-8 rounded-full bg-muted border flex items-center justify-center text-xs font-bold text-primary mx-auto focus:outline-none"
          >
            {user?.email.substring(0, 1).toUpperCase() || "U"}
          </button>
        ) : (
          <button
            onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
            className="flex items-center gap-3 w-full hover:bg-muted/50 p-2 rounded-lg transition text-left focus:outline-none"
          >
            <span className="h-8 w-8 rounded-full bg-muted border flex items-center justify-center text-xs font-bold text-primary shrink-0">
              {user?.email.substring(0, 1).toUpperCase() || "U"}
            </span>
            <div className="overflow-hidden flex-1 leading-tight">
              <p className="font-semibold text-xs text-foreground truncate">
                {user?.first_name} {user?.last_name}
              </p>
              <p className="text-[10px] text-muted-foreground truncate">{roleName || "Member"}</p>
            </div>
          </button>
        )}

        {/* Expand trigger button when collapsed */}
        {isSidebarCollapsed && (
          <button
            onClick={toggleSidebar}
            className="absolute -top-3 -right-2 bg-background border border-border text-muted-foreground hover:text-foreground rounded-full p-0.5 shadow-md"
          >
            <ChevronRight className="h-3 w-3" />
          </button>
        )}

        {/* User profile Menu Popover */}
        {isUserMenuOpen && (
          <div className={`absolute bg-card border border-border rounded-xl shadow-lg z-dropdown py-1 w-48 overflow-hidden bottom-14 ${
            isSidebarCollapsed ? "left-14" : "left-3"
          }`}>
            <Link
              href="/settings/security"
              onClick={() => setIsUserMenuOpen(false)}
              className="flex items-center gap-2 px-3 py-2 text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition"
            >
              <Settings className="h-3.5 w-3.5" />
              <span>Security Settings</span>
            </Link>
            
            <Link
              href="#"
              onClick={() => setIsUserMenuOpen(false)}
              className="flex items-center gap-2 px-3 py-2 text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition"
            >
              <HelpCircle className="h-3.5 w-3.5" />
              <span>Docs / Help</span>
            </Link>

            <div className="border-t my-1"></div>
            
            <button
              onClick={() => {
                logout();
                setIsUserMenuOpen(false);
              }}
              className="w-full flex items-center gap-2 px-3 py-2 text-xs text-rose-500 hover:bg-rose-500/10 text-left transition"
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
