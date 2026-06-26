"use client";

import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { loginSchema, LoginInput, mfaVerifySchema, MfaVerifyInput } from "@/features/auth/schemas/auth-validation";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { useAuthActions } from "@/features/auth/hooks/useAuthActions";

export default function LoginPage() {
  const router = useRouter();
  const { login, mfaPending, mfaToken, isLoading } = useAuth();
  const { mfaVerify, isMfaVerifyLoading } = useAuthActions();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Login Form
  const {
    register: registerLogin,
    handleSubmit: handleLoginSubmit,
    formState: { errors: loginErrors },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
  });

  // MFA Code Form
  const {
    register: registerMfa,
    handleSubmit: handleMfaSubmit,
    formState: { errors: mfaErrors },
  } = useForm<MfaVerifyInput>({
    resolver: zodResolver(mfaVerifySchema),
  });

  const onLoginSubmit = async (data: LoginInput) => {
    setErrorMessage(null);
    try {
      const res = await login(data);
      if (!res.mfaRequired) {
        router.push("/");
      }
    } catch (err: any) {
      const serverErr = err?.errors?.[0]?.message || "Invalid credentials. Try again.";
      setErrorMessage(serverErr);
    }
  };

  const onMfaSubmit = async (data: MfaVerifyInput) => {
    setErrorMessage(null);
    if (!mfaToken) return;
    try {
      await mfaVerify({ mfaToken, code: data.code });
      router.push("/");
    } catch (err: any) {
      const serverErr = err?.errors?.[0]?.message || "Invalid code entry.";
      setErrorMessage(serverErr);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8 bg-card border border-border p-8 rounded-xl shadow-lg transition-linear hover:shadow-glow">
        
        {/* Title */}
        <div className="text-center">
          <h2 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            TaskSphere
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {mfaPending ? "Verify Identity" : "Sign in to your account"}
          </p>
        </div>

        {errorMessage && (
          <div className="rounded-lg bg-destructive/15 border border-destructive/35 p-3 text-xs text-destructive font-medium">
            ⚠️ {errorMessage}
          </div>
        )}

        {/* Dynamic Forms */}
        {!mfaPending ? (
          <form className="space-y-4" onSubmit={handleLoginSubmit(onLoginSubmit)}>
            <div>
              <label htmlFor="login-email" className="block text-xs font-bold uppercase text-muted-foreground mb-1">Email</label>
              <input
                id="login-email"
                type="email"
                {...registerLogin("email")}
                autoComplete="email"
                className="w-full bg-background border border-input rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
              {loginErrors.email && (
                <p className="text-[11px] text-destructive mt-1">{loginErrors.email.message}</p>
              )}
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label htmlFor="login-password" className="block text-xs font-bold uppercase text-muted-foreground">Password</label>
                <Link
                  href="/auth/forgot-password"
                  className="text-xs text-primary hover:text-primary/80 transition"
                >
                  Forgot Password?
                </Link>
              </div>
              <input
                id="login-password"
                type="password"
                {...registerLogin("password")}
                autoComplete="current-password"
                className="w-full bg-background border border-input rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
              {loginErrors.password && (
                <p className="text-[11px] text-destructive mt-1">{loginErrors.password.message}</p>
              )}
            </div>

            <div className="flex items-center">
              <input
                id="rememberMe"
                type="checkbox"
                {...registerLogin("rememberMe")}
                autoComplete="off"
                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary bg-background"
              />
              <label htmlFor="rememberMe" className="ml-2 block text-xs text-muted-foreground font-medium">
                Keep me signed in for 7 days
              </label>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-primary text-primary-foreground hover:bg-primary/95 text-sm font-semibold py-2.5 rounded-md transition duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? "Authenticating Session..." : "Sign In"}
            </button>
          </form>
        ) : (
          <form className="space-y-4" onSubmit={handleMfaSubmit(onMfaSubmit)}>
            <div className="p-3 bg-muted border rounded text-xs text-muted-foreground">
              🛡️ Multi-factor authentication is active. Enter the 6-digit TOTP validation code from your app or backup code.
            </div>

            <div>
              <label htmlFor="mfa-code" className="block text-xs font-bold uppercase text-muted-foreground mb-1">Verification Code</label>
              <input
                id="mfa-code"
                type="text"
                maxLength={8}
                {...registerMfa("code")}
                placeholder="000 000"
                autoComplete="one-time-code"
                className="w-full text-center tracking-widest font-mono bg-background border border-input rounded-md px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
              {mfaErrors.code && (
                <p className="text-[11px] text-destructive mt-1">{mfaErrors.code.message}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={isMfaVerifyLoading}
              className="w-full bg-primary text-primary-foreground hover:bg-primary/90 text-sm font-semibold py-2.5 rounded-md transition duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isMfaVerifyLoading ? "Verifying..." : "Verify Code"}
            </button>

            <button
              type="button"
              onClick={() => router.refresh()}
              className="w-full text-xs text-muted-foreground hover:text-foreground text-center block mt-2"
            >
              Cancel Verification
            </button>
          </form>
        )}

        <p className="text-center text-xs text-muted-foreground mt-5">
          Don&apos;t have an account?{" "}
          <Link href="/auth/register" className="text-primary font-semibold hover:underline">
            Create one
          </Link>
        </p>
      </div>
    </div>
  );
}
