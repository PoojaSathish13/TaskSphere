"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Layers, MailCheck, RefreshCw, CheckCircle2, AlertCircle, ArrowLeft } from "lucide-react";
import { apiClient } from "@/infrastructure/api/api-client";

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const email = searchParams.get("email");

  const [status, setStatus] = useState<"idle" | "verifying" | "success" | "error">(token ? "verifying" : "idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    if (token) {
      verifyToken(token);
    }
  }, [token]);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const verifyToken = async (tok: string) => {
    setStatus("verifying");
    try {
      await apiClient.post("/api/v1/auth/verify-email/", { token: tok });
      setStatus("success");
    } catch (err: any) {
      setStatus("error");
      setErrorMsg(
        err?.response?.data?.errors?.[0]?.message ||
        "Verification link is invalid or has expired."
      );
    }
  };

  const handleResend = async () => {
    if (!email || countdown > 0) return;
    setResendLoading(true);
    try {
      await apiClient.post("/api/v1/auth/resend-verification/", { email });
      setResendSuccess(true);
      setCountdown(60);
    } catch {
      setResendSuccess(false);
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-12">
      {/* Background decorations */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 h-96 w-96 rounded-full bg-primary/8 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 h-96 w-96 rounded-full bg-primary/5 blur-3xl" />
      </div>

      <div className="w-full max-w-md relative z-10 animate-slide-up">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-primary/10 border border-primary/20 mb-4">
            <Layers className="h-7 w-7 text-primary" />
          </div>
          <h1 className="text-2xl font-black tracking-tight text-foreground">Email Verification</h1>
        </div>

        <div className="bg-card border border-border rounded-2xl p-8 shadow-sm text-center">
          {/* Verifying state */}
          {status === "verifying" && (
            <div className="space-y-4">
              <div className="flex items-center justify-center">
                <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                  <RefreshCw className="h-8 w-8 text-primary animate-spin" />
                </div>
              </div>
              <h2 className="text-lg font-bold text-foreground">Verifying your email...</h2>
              <p className="text-muted-foreground text-sm">Please wait while we confirm your email address.</p>
            </div>
          )}

          {/* Success state */}
          {status === "success" && (
            <div className="space-y-5">
              <div className="flex items-center justify-center">
                <div className="h-16 w-16 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center">
                  <CheckCircle2 className="h-8 w-8 text-emerald-500" />
                </div>
              </div>
              <div>
                <h2 className="text-lg font-bold text-foreground">Email Verified!</h2>
                <p className="text-muted-foreground text-sm mt-1">
                  Your email has been verified successfully. You can now sign in to your workspace.
                </p>
              </div>
              <Link
                href="/auth/login"
                className="inline-flex items-center gap-2 px-6 py-2.5 bg-primary text-primary-foreground font-bold text-sm rounded-xl hover:bg-primary/90 transition shadow-lg shadow-primary/20"
              >
                Sign in to Workspace
              </Link>
            </div>
          )}

          {/* Error state */}
          {status === "error" && (
            <div className="space-y-5">
              <div className="flex items-center justify-center">
                <div className="h-16 w-16 rounded-full bg-red-50 border border-red-200 flex items-center justify-center">
                  <AlertCircle className="h-8 w-8 text-red-500" />
                </div>
              </div>
              <div>
                <h2 className="text-lg font-bold text-foreground">Verification Failed</h2>
                <p className="text-muted-foreground text-sm mt-1">{errorMsg}</p>
              </div>
              {email && (
                <button
                  onClick={handleResend}
                  disabled={resendLoading || countdown > 0}
                  className="inline-flex items-center gap-2 px-6 py-2.5 bg-primary text-primary-foreground font-bold text-sm rounded-xl hover:bg-primary/90 disabled:opacity-60 transition"
                >
                  <RefreshCw className={`h-4 w-4 ${resendLoading ? "animate-spin" : ""}`} />
                  {countdown > 0 ? `Resend in ${countdown}s` : "Resend Verification Email"}
                </button>
              )}
            </div>
          )}

          {/* Idle state (no token in URL, just waiting) */}
          {status === "idle" && (
            <div className="space-y-5">
              <div className="flex items-center justify-center">
                <div className="h-16 w-16 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center">
                  <MailCheck className="h-8 w-8 text-primary" />
                </div>
              </div>
              <div>
                <h2 className="text-lg font-bold text-foreground">Check your inbox</h2>
                <p className="text-muted-foreground text-sm mt-1">
                  We sent a verification link to{" "}
                  <span className="font-semibold text-foreground">{email || "your email address"}</span>.
                  Click the link in the email to verify your account.
                </p>
              </div>
              {email && (
                <div className="space-y-2">
                  {resendSuccess && (
                    <p className="text-xs text-emerald-600 font-semibold">✓ Verification email sent!</p>
                  )}
                  <button
                    onClick={handleResend}
                    disabled={resendLoading || countdown > 0}
                    className="inline-flex items-center gap-2 px-5 py-2.5 border border-border text-foreground font-semibold text-sm rounded-xl hover:bg-muted disabled:opacity-60 transition"
                  >
                    <RefreshCw className={`h-4 w-4 ${resendLoading ? "animate-spin" : ""}`} />
                    {countdown > 0 ? `Resend in ${countdown}s` : "Resend Email"}
                  </button>
                </div>
              )}
            </div>
          )}

          <div className="mt-6 pt-5 border-t border-border">
            <Link href="/auth/login" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition">
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to Sign In
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse-skeleton h-8 w-48 bg-muted rounded-xl" />
      </div>
    }>
      <VerifyEmailContent />
    </Suspense>
  );
}
