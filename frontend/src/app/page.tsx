"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { DashboardGrid } from "@/features/dashboard/components/DashboardGrid";
import { Building, AlertCircle } from "lucide-react";

export default function DashboardGateway() {
  const { login, isAuthenticated, isLoading } = useAuth();

  // Prevent SSR hydration mismatch
  const [hasMounted, setHasMounted] = useState(false);
  useEffect(() => {
    setHasMounted(true);
  }, []);

  // Mock Form State
  const [email, setEmail] = useState("admin@gmail.com");
  const [password, setPassword] = useState("securepass123");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleMockLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    try {
      await login({ email, password });
    } catch (err: any) {
      const serverErr = err?.errors?.[0]?.message || "Invalid credentials.";
      setErrorMessage(serverErr);
    }
  };

  return (
    <div className="space-y-6">
      {hasMounted && isAuthenticated ? (
        // Render Master Dashboard Grid when logged in
        <DashboardGrid />
      ) : (
        // Render Login box inline if unauthenticated
        <div className="flex items-center justify-center pt-16 px-4">
          <div className="w-full max-w-md bg-glass shadow-2xl p-8 rounded-2xl border border-border animate-slide-up relative overflow-hidden">
            {/* Subtle card glow overlay */}
            <div className="absolute -top-24 -left-24 h-48 w-48 rounded-full bg-primary/10 blur-3xl pointer-events-none" />
            <div className="absolute -bottom-24 -right-24 h-48 w-48 rounded-full bg-primary/10 blur-3xl pointer-events-none" />

            <div className="text-center relative z-10 space-y-2 mb-6">
              <h2 className="text-2xl font-black tracking-tight text-foreground flex items-center justify-center gap-2">
                <Building className="h-6 w-6 text-primary" /> TaskSphere
              </h2>
              <p className="text-muted-foreground text-xs">
                Welcome back. Sign in to access your tenant workspace logs.
              </p>
            </div>

            {errorMessage && (
              <div className="rounded-xl bg-rose-500/10 border border-rose-500/20 p-3 text-xs text-rose-500 font-semibold mb-4 flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0 text-rose-500" />
                <span>{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleMockLogin} className="space-y-4 relative z-10">
              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-background border border-input rounded-xl px-3.5 py-2.5 text-xs text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition"
                  placeholder="name@organization.com"
                />
              </div>
              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-background border border-input rounded-xl px-3.5 py-2.5 text-xs text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition"
                  placeholder="••••••••"
                />
              </div>
              <button
                type="submit"
                disabled={hasMounted && isLoading}
                className="w-full py-2.5 bg-primary hover:bg-primary/90 disabled:opacity-60 text-primary-foreground font-bold text-xs rounded-xl transition shadow-lg shadow-primary/15 flex items-center justify-center gap-1.5"
              >
                {hasMounted && isLoading ? "Signing In..." : "Sign In to Workspace"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
