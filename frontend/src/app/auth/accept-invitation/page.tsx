"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { User, Lock, Eye, EyeOff, CheckCircle2, AlertCircle, ArrowRight, Layers, Building } from "lucide-react";
import { apiClient } from "@/infrastructure/api/api-client";

function AcceptInvitationContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Query Parameters
  const emailParam = searchParams.get("email") || "";
  const orgParam = searchParams.get("org") || "TaskSphere Org";
  const roleParam = searchParams.get("role") || "Teammate";

  const [isRegistered, setIsRegistered] = useState<boolean | null>(null);
  const [checkingUser, setCheckingUser] = useState(true);
  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    password: "",
    confirmPassword: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Check if email already exists in system directory on mount
  useEffect(() => {
    if (!emailParam) {
      setCheckingUser(false);
      return;
    }

    const checkUserExistence = async () => {
      try {
        const res = await apiClient.get(`/api/v1/rbac/users/?email=${emailParam}`);
        const userExists = res.data && res.data.length > 0;
        setIsRegistered(userExists);
      } catch (err) {
        // Fallback to unregistered form if query fails
        setIsRegistered(false);
      } finally {
        setCheckingUser(false);
      }
    };

    checkUserExistence();
  }, [emailParam]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (formData.password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    setIsLoading(true);
    try {
      // 1. Register User on Platform
      await apiClient.post("/api/v1/auth/register/", {
        first_name: formData.first_name,
        last_name: formData.last_name,
        email: emailParam,
        password: formData.password,
        org_name: orgParam // Auto-join/bind parameter
      });

      setSuccess(true);
      setTimeout(() => router.push(`/auth/login?email=${encodeURIComponent(emailParam)}`), 3000);
    } catch (err: any) {
      const msg =
        err?.response?.data?.errors?.[0]?.message ||
        err?.response?.data?.detail ||
        "Failed to set up account. Please try again.";
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  if (checkingUser) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-foreground">
        <div className="text-center space-y-2 animate-pulse">
          <Layers className="h-10 w-10 text-primary mx-auto animate-spin mb-4" />
          <p className="text-sm font-semibold">Resolving invitation details...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-12">
      {/* Visual background decorators */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 h-96 w-96 rounded-full bg-primary/8 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 h-96 w-96 rounded-full bg-primary/5 blur-3xl" />
      </div>

      <div className="w-full max-w-lg relative z-10">
        {/* Workspace Brand Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-primary/10 border border-primary/20 mb-4">
            <Building className="h-7 w-7 text-primary" />
          </div>
          <h1 className="text-3xl font-black tracking-tight text-foreground">Workspace Invitation</h1>
          <p className="text-muted-foreground text-sm mt-2">
            Join <span className="text-foreground font-semibold">{orgParam}</span> as a {roleParam}
          </p>
        </div>

        {success ? (
          <div className="bg-card border border-emerald-500/20 rounded-2xl p-8 text-center shadow-lg">
            <CheckCircle2 className="h-12 w-12 text-emerald-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-foreground mb-2">Invitation Accepted!</h2>
            <p className="text-muted-foreground text-sm">
              Your profile is set up. Redirecting to workspace log in...
            </p>
          </div>
        ) : (
          <div className="bg-card border border-border rounded-2xl p-8 shadow-lg">
            {error && (
              <div className="flex items-center gap-2 bg-destructive/10 border border-destructive/20 text-destructive rounded-xl px-4 py-3 text-sm mb-6">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {isRegistered ? (
              // Case A: User already has a TaskSphere account
              <div className="space-y-6 text-center">
                <div className="p-4 bg-muted/50 rounded-xl border text-sm text-muted-foreground leading-relaxed">
                  👋 It looks like <span className="text-foreground font-semibold">{emailParam}</span> already has a registered account on TaskSphere.
                </div>
                
                <p className="text-xs text-muted-foreground">
                  Click below to log in and access your new workspace assignments inside **{orgParam}**.
                </p>

                <button
                  onClick={() => router.push(`/auth/login?email=${encodeURIComponent(emailParam)}`)}
                  className="w-full inline-flex items-center justify-center gap-2 bg-primary text-primary-foreground hover:bg-primary/90 text-sm font-semibold py-3 rounded-xl transition shadow"
                >
                  <span>Sign In & Accept Invite</span>
                  <ArrowRight className="h-4 w-4" />
                </button>

                <p className="text-xs text-muted-foreground">
                  Logged in as someone else?{" "}
                  <Link href="/auth/login" className="text-primary font-semibold hover:underline">
                    Switch Accounts
                  </Link>
                </p>
              </div>
            ) : (
              // Case B: User needs to create their profile credentials
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-xl text-xs text-center font-medium">
                  Workspace seat reserved for: <span className="font-bold underline">{emailParam}</span>
                </div>

                {/* Name Row */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label htmlFor="first_name" className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      First Name
                    </label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                      <input
                        id="first_name"
                        type="text"
                        name="first_name"
                        value={formData.first_name}
                        onChange={handleChange}
                        autoComplete="given-name"
                        required
                        placeholder="Jane"
                        className="w-full pl-9 pr-3 py-2.5 bg-background border border-input rounded-xl text-sm text-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition"
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label htmlFor="last_name" className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      Last Name
                    </label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                      <input
                        id="last_name"
                        type="text"
                        name="last_name"
                        value={formData.last_name}
                        onChange={handleChange}
                        autoComplete="family-name"
                        required
                        placeholder="Doe"
                        className="w-full pl-9 pr-3 py-2.5 bg-background border border-input rounded-xl text-sm text-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition"
                      />
                    </div>
                  </div>
                </div>

                {/* Password fields */}
                <div className="space-y-1.5">
                  <label htmlFor="password" className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Choose Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      name="password"
                      value={formData.password}
                      onChange={handleChange}
                      autoComplete="new-password"
                      required
                      placeholder="••••••••"
                      className="w-full pl-9 pr-10 py-2.5 bg-background border border-input rounded-xl text-sm text-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 hover:text-foreground text-muted-foreground transition"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="confirmPassword" className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Confirm Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <input
                      id="confirmPassword"
                      type="password"
                      name="confirmPassword"
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      autoComplete="new-password"
                      required
                      placeholder="••••••••"
                      className="w-full pl-9 pr-3 py-2.5 bg-background border border-input rounded-xl text-sm text-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-primary text-primary-foreground hover:bg-primary/95 text-sm font-semibold py-3 rounded-xl transition duration-150 disabled:opacity-50 disabled:cursor-not-allowed shadow mt-2"
                >
                  {isLoading ? "Setting Up Account..." : "Accept Invite & Create Profile"}
                </button>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function AcceptInvitationPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-background text-foreground">
        <div className="text-center space-y-2 animate-pulse">
          <Layers className="h-10 w-10 text-primary mx-auto animate-spin mb-4" />
          <p className="text-sm font-semibold">Resolving invitation details...</p>
        </div>
      </div>
    }>
      <AcceptInvitationContent />
    </Suspense>
  );
}
