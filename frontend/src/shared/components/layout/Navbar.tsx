"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { Search, Menu, User as UserIcon, Settings, LogOut, Shield, ChevronDown } from "lucide-react";
import { useLayoutStore } from "@/infrastructure/store/layout-store";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { useAuthorization } from "@/features/rbac/hooks/useAuthorization";
import { Breadcrumbs } from "./Breadcrumbs";
import { NotificationsDropdown } from "./NotificationsDropdown";

export const Navbar: React.FC = () => {
  const { setCommandPaletteOpen, toggleSidebar } = useLayoutStore();
  const { user, logout } = useAuth();
  const { roleName } = useAuthorization();

  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const initials = user
    ? `${user.first_name?.charAt(0) || ""}${user.last_name?.charAt(0) || ""}`.toUpperCase() || "U"
    : "U";

  return (
    <header className="h-14 border-b border-[#d0d7de] bg-white px-6 flex items-center justify-between gap-4 select-none shrink-0">
      
      {/* Breadcrumbs Left Section */}
      <div className="flex items-center gap-3">
        {/* Mobile menu trigger */}
        <button
          onClick={toggleSidebar}
          className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground md:hidden transition focus:outline-none"
          aria-label="Toggle navigation menu"
        >
          <Menu className="h-4 w-4" />
        </button>

        <Breadcrumbs />
      </div>

      {/* Global Actions Right Section */}
      <div className="flex items-center gap-3">
        {/* Global Search trigger bar */}
        <button
          onClick={() => setCommandPaletteOpen(true)}
          className="h-8 w-44 sm:w-56 bg-background hover:bg-muted/50 border border-input rounded-lg text-left px-3 text-muted-foreground hover:text-foreground transition-linear flex items-center justify-between gap-2 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
          aria-label="Launch search command palette"
        >
          <span className="flex items-center gap-2 truncate">
            <Search className="h-3.5 w-3.5" />
            <span>Search...</span>
          </span>
          <kbd className="hidden sm:inline-block bg-muted px-1.5 py-0.5 rounded text-[10px] font-mono border border-border">
            ⌘K
          </kbd>
        </button>

        {/* Notifications center popover */}
        <NotificationsDropdown />

        {/* Profile Dropdown */}
        <div className="relative" ref={profileRef}>
          <button
            onClick={() => setIsProfileOpen(!isProfileOpen)}
            className="flex items-center gap-2 hover:bg-muted/50 px-2 py-1.5 rounded-lg transition focus:outline-none"
          >
            <span className="h-6 w-6 rounded-full bg-slate-100 border border-[#d0d7de] flex items-center justify-center text-[9px] font-bold text-slate-600">
              {initials}
            </span>
            <div className="hidden sm:block text-left leading-tight">
              <p className="text-xs font-semibold text-foreground truncate max-w-[100px]">
                {user?.first_name || "User"}
              </p>
              <p className="text-[10px] text-muted-foreground truncate max-w-[100px]">
                {roleName || "Member"}
              </p>
            </div>
            <ChevronDown className="h-3 w-3 text-muted-foreground hidden sm:block" />
          </button>

          {isProfileOpen && (
            <div className="absolute right-0 top-12 bg-white border border-[#d0d7de] rounded-md shadow-md z-50 py-1 w-52 overflow-hidden">
              {/* User info header */}
              <div className="px-3 py-2.5 border-b border-border">
                <p className="text-xs font-bold text-foreground truncate">
                  {user?.first_name} {user?.last_name}
                </p>
                <p className="text-[10px] text-muted-foreground truncate">{user?.email}</p>
                <span className="inline-flex items-center gap-1 mt-1.5 px-2 py-0.5 rounded bg-slate-100 text-slate-600 text-[9px] font-bold border border-[#d0d7de]">
                  <Shield className="h-2.5 w-2.5" />
                  {roleName || "Member"}
                </span>
              </div>

              <Link
                href="/settings"
                onClick={() => setIsProfileOpen(false)}
                className="flex items-center gap-2 px-3 py-2 text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition"
              >
                <Settings className="h-3.5 w-3.5" />
                <span>Account Settings</span>
              </Link>

              <Link
                href="/workspace-select"
                onClick={() => setIsProfileOpen(false)}
                className="flex items-center gap-2 px-3 py-2 text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition"
              >
                <UserIcon className="h-3.5 w-3.5" />
                <span>Switch Workspace</span>
              </Link>

              <div className="border-t border-border my-1" />

              <button
                onClick={() => {
                  logout();
                  setIsProfileOpen(false);
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs text-rose-500 hover:bg-rose-500/10 text-left transition"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span>Sign Out</span>
              </button>
            </div>
          )}
        </div>
      </div>

    </header>
  );
};
export default Navbar;

