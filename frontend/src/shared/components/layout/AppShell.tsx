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
      <div className="min-h-screen bg-background text-foreground transition-linear">
        {children}
      </div>
    );
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background text-foreground transition-linear">
      
      {/* 1. Left Navigation Sidebar Panel */}
      <Sidebar />

      {/* 2. Content view container */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Navbar */}
        <Navbar />

        {/* Scrollable page body */}
        <div className="flex-1 overflow-y-auto px-6 py-6 md:px-8 bg-background">
          <div className="max-w-6xl mx-auto w-full">
            {children}
          </div>
        </div>
      </div>

      {/* 3. Global Keyboard-driven Command Palette Dialogue */}
      <CommandPalette />

    </div>
  );
};
export default AppShell;
