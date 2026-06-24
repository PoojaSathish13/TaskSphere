"use client";

import React, { useEffect, useState, useRef } from "react";
import { useLayoutStore } from "@/infrastructure/store/layout-store";
import { useTenants } from "@/features/tenants/hooks/useTenants";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { useAuthorization } from "@/features/rbac/hooks/useAuthorization";
import { useRouter } from "next/navigation";
import { Monitor, Moon, Sun, Search, LogOut, Shield, Settings } from "lucide-react";

export const CommandPalette: React.FC = () => {
  const router = useRouter();
  const { isCommandPaletteOpen, setCommandPaletteOpen, toggleTheme, theme } = useLayoutStore();
  const { organizations, switchOrganization } = useTenants();
  const { logout } = useAuth();
  const { hasPermission } = useAuthorization();
  
  const [search, setSearch] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const paletteRef = useRef<HTMLDivElement>(null);

  // Bind key listeners for Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setCommandPaletteOpen(!isCommandPaletteOpen);
      }
      if (e.key === "Escape") {
        setCommandPaletteOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isCommandPaletteOpen, setCommandPaletteOpen]);

  // Autofocus input when opened
  useEffect(() => {
    if (isCommandPaletteOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setSearch("");
    }
  }, [isCommandPaletteOpen]);

  // Click outside listener
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (paletteRef.current && !paletteRef.current.contains(event.target as Node)) {
        setCommandPaletteOpen(false);
      }
    };
    if (isCommandPaletteOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isCommandPaletteOpen, setCommandPaletteOpen]);

  if (!isCommandPaletteOpen) return null;

  // Static commands list
  const navigationCommands = [
    { name: "Go to Home Workspace", icon: <Monitor className="h-4 w-4" />, action: () => router.push("/") },
    { name: "Account Security Settings", icon: <Settings className="h-4 w-4" />, action: () => router.push("/settings/security") },
    {
      name: "Workspace Member Access Rules (RBAC)",
      icon: <Shield className="h-4 w-4" />,
      action: () => router.push("/settings/rbac"),
      permission: "ORG_MANAGE",
    },
  ];

  // Dynamic tenant switching commands
  const workspaceCommands = organizations.map((org) => ({
    name: `Switch Workspace to: ${org.name}`,
    icon: <Monitor className="h-4 w-4 text-indigo-400" />,
    action: () => {
      switchOrganization(org.id);
      setCommandPaletteOpen(false);
    },
  }));

  // Style commands
  const styleCommands = [
    {
      name: `Switch to ${theme === "dark" ? "Light" : "Dark"} Mode`,
      icon: theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />,
      action: () => {
        toggleTheme();
        setCommandPaletteOpen(false);
      },
    },
    { name: "Disconnect Session / Sign Out", icon: <LogOut className="h-4 w-4 text-rose-500" />, action: () => logout() },
  ];

  // Combined and filtered commands
  const allCommands = [
    ...navigationCommands.filter((cmd) => !cmd.permission || hasPermission(cmd.permission)),
    ...workspaceCommands,
    ...styleCommands,
  ];

  const filteredCommands = allCommands.filter((cmd) =>
    cmd.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-modal flex items-start justify-center pt-24 px-4 animate-in fade-in duration-100">
      <div
        ref={paletteRef}
        className="w-full max-w-xl bg-card border border-border rounded-xl shadow-2xl overflow-hidden py-1 animate-in slide-in-from-top-4 duration-150"
        role="dialog"
        aria-modal="true"
        aria-label="Command palette input menu"
      >
        {/* Search header */}
        <div className="flex items-center px-4 border-b border-border">
          <Search className="h-4 w-4 text-muted-foreground mr-3" />
          <input
            ref={inputRef}
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Type a command or search workspaces..."
            className="w-full bg-transparent text-foreground placeholder-muted-foreground py-3 text-sm focus:outline-none"
          />
        </div>

        {/* Commands list */}
        <div className="max-h-72 overflow-y-auto p-2 space-y-1">
          {filteredCommands.length === 0 ? (
            <div className="p-4 text-center text-xs text-muted-foreground">
              No matching commands or actions found.
            </div>
          ) : (
            filteredCommands.map((cmd, idx) => (
              <button
                key={idx}
                onClick={() => {
                  cmd.action();
                  setCommandPaletteOpen(false);
                }}
                className="w-full flex items-center px-3 py-2 text-xs text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted/40 text-left transition duration-75"
              >
                <span className="mr-3 text-muted-foreground/80">{cmd.icon}</span>
                <span className="flex-1 font-medium">{cmd.name}</span>
                <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded font-mono text-muted-foreground/70 uppercase">
                  Action
                </span>
              </button>
            ))
          )}
        </div>

        {/* Footer info */}
        <footer className="border-t border-border px-4 py-2 bg-muted/10 flex justify-between items-center text-[10px] text-muted-foreground/75">
          <span>Use arrows to navigate, Esc to close</span>
          <span>
            <kbd className="bg-muted px-1.5 py-0.5 rounded border font-mono">⌘K</kbd> or{" "}
            <kbd className="bg-muted px-1.5 py-0.5 rounded border font-mono">Ctrl+K</kbd>
          </span>
        </footer>
      </div>
    </div>
  );
};
export default CommandPalette;
