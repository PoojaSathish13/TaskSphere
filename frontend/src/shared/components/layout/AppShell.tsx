"use client";

import React, { useEffect, useState } from "react";
import { Sidebar } from "./Sidebar";
import { Navbar } from "./Navbar";
import { CommandPalette } from "./CommandPalette";
import { useAuthStore } from "@/infrastructure/store/auth-store";
import { useLayoutStore } from "@/infrastructure/store/layout-store";

interface AppShellProps {
  children: React.ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({ children }) => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const theme = useLayoutStore((state) => state.theme);
  const setTheme = useLayoutStore((state) => state.setTheme);
  const bgPreset = useLayoutStore((state) => state.bgPreset);
  const fontPreset = useLayoutStore((state) => state.fontPreset);

  // Prevent SSR hydration mismatch: always render unauthenticated shell on first render,
  // then switch to authenticated shell after client-side mount.
  const [hasMounted, setHasMounted] = useState(false);
  useEffect(() => {
    setHasMounted(true);
  }, []);

  // Sync theme variables on startup
  useEffect(() => {
    setTheme(theme);
  }, [theme, setTheme]);

  // Before hydration or if unauthenticated, render simple full-screen layout
  if (!hasMounted || !isAuthenticated) {
    return (
      <div className={`min-h-screen text-foreground transition-all duration-700 bg-preset-${bgPreset} font-${fontPreset}`}>
        {children}
      </div>
    );
  }

  return (
    <div className={`h-screen w-screen flex flex-col p-4 md:p-6 overflow-hidden relative transition-all duration-300 bg-[#f6f8fa] font-${fontPreset}`}>
      
      {/* Brand logo header matching GitHub UI */}
      <div className="flex items-center gap-2 mb-3 px-3 select-none shrink-0 relative z-10">
        <span className="h-6 w-6 rounded-md bg-[#0969da] flex items-center justify-center font-black text-white text-xs shadow-sm">
          TS
        </span>
        <span className="font-extrabold text-xs tracking-tight text-slate-800 uppercase">
          TaskSphere
        </span>
      </div>

      {/* Centered flat panel container */}
      <div className="flex-1 flex overflow-hidden rounded-lg bg-white border border-[#d0d7de] shadow-sm w-full relative z-10">
        {/* 1. Left Navigation Sidebar Panel */}
        <Sidebar />

        {/* 2. Content view container */}
        <div className="flex-1 flex flex-col overflow-hidden bg-transparent">
          {/* Top Navbar */}
          <Navbar />

          {/* Scrollable page body */}
          <div className="flex-1 overflow-y-auto px-6 py-6 md:px-8 bg-transparent">
            <div className="max-w-6xl mx-auto w-full">
              {children}
            </div>
          </div>
        </div>
      </div>

      {/* 3. Global Keyboard-driven Command Palette Dialogue */}
      <CommandPalette />

    </div>
  );
};
export default AppShell;
