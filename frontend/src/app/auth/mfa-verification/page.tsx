"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Layers, ShieldCheck, KeyRound, AlertCircle, CheckCircle2, ArrowLeft, RefreshCw } from "lucide-react";
import { apiClient } from "@/infrastructure/api/api-client";

function MFAContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const mfaToken = searchParams.get("mfa_token");

  const [code, setCode] = useState(["", "", "", "", "", ""]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [countdown, setCountdown] = useState(30);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const handleCodeChange = (idx: number, value: string) => {
    if (value.length > 1) return;
    if (!/^\d*$/.test(value)) return;

    const newCode = [...code];
    newCode[idx] = value;
    setCode(newCode);
    setError(null);

    // Auto-focus next input
    if (value && idx < 5) {
      const next = document.getElementById(`mfa-input-${idx + 1}`);
      next?.focus();
    }
  };

  const handleKeyDown = (idx: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !code[idx] && idx > 0) {
      const prev = document.getElementById(`mfa-input-${idx - 1}`);
      prev?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const text = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    const newCode = [...code];
    for (let i = 0; i < text.length; i++) {
      newCode[i] = text[i];
    }
    setCode(newCode);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const otp = code.join("");
    if (otp.length !== 6) {
      setError("Please enter the 6-digit code.");
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const res = await apiClient.post("/api/v1/auth/mfa/verify/", {
        mfa_token: mfaToken,
        otp_code: otp,
      });
      const { access, refresh } = res.data?.data || {};
      if (access) {
        // Store tokens and redirect
        localStorage.setItem("access_token", access);
        localStorage.setItem("refresh_token", refresh);
        setSuccess(true);
        setTimeout(() => router.push("/"), 1500);
      }
    } catch (err: any) {
      setError(
        err?.response?.data?.errors?.[0]?.message ||
        "Invalid or expired verification code. Please try again."
      );
      setCode(["", "", "", "", "", ""]);
      document.getElementById("mfa-input-0")?.focus();
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-12">
      {/* Background decorations */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 h-96 w-96 rounded-full bg-primary/8 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 h-96 w-96 rounded-full bg-primary/5 blur-3xl" />
      </div>

      <div className="w-full max-w-sm relative z-10 animate-slide-up">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-primary/10 border border-primary/20 mb-4">
            <Layers className="h-7 w-7 text-primary" />
          </div>
          <h1 className="text-2xl font-black tracking-tight text-foreground">Two-Factor Auth</h1>
          <p className="text-muted-foreground text-sm mt-1">Enter the 6-digit code from your authenticator app</p>
        </div>

        <div className="bg-card border border-border rounded-2xl p-8 shadow-sm">
          {success ? (
            <div className="text-center space-y-4">
              <div className="flex items-center justify-center">
                <div className="h-16 w-16 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center">
                  <CheckCircle2 className="h-8 w-8 text-emerald-500" />
                </div>
              </div>
              <h2 className="text-lg font-bold text-foreground">Verified!</h2>
              <p className="text-muted-foreground text-sm">Redirecting to your workspace...</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Shield icon */}
              <div className="flex flex-col items-center gap-3 pb-2">
                <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  <ShieldCheck className="h-6 w-6 text-primary" />
                </div>
                <div className="text-center">
                  <p className="text-xs text-muted-foreground">
                    Open your authenticator app and enter the current 6-digit code
                  </p>
                </div>
              </div>

              {/* 6-digit OTP input */}
              <div className="flex gap-2 justify-center" onPaste={handlePaste}>
                {code.map((digit, idx) => (
                  <input
                    key={idx}
                    id={`mfa-input-${idx}`}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleCodeChange(idx, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(idx, e)}
                    className={`h-12 w-10 text-center text-lg font-bold border rounded-xl bg-background text-foreground focus:outline-none transition ${
                      error
                        ? "border-red-400 focus:border-red-500 focus:ring-1 focus:ring-red-500"
                        : "border-input focus:border-primary focus:ring-1 focus:ring-primary"
                    }`}
                  />
                ))}
              </div>

              {/* Error message */}
              {error && (
                <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-600 rounded-xl px-3 py-2.5 text-xs">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Code timer */}
              <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                <RefreshCw className="h-3 w-3" />
                <span>Code refreshes in <span className="font-bold text-foreground">{countdown}s</span></span>
              </div>

              <button
                type="submit"
                disabled={isLoading || code.join("").length !== 6}
                className="w-full py-2.5 bg-primary hover:bg-primary/90 disabled:opacity-60 text-primary-foreground font-bold text-sm rounded-xl transition shadow-lg shadow-primary/20 flex items-center justify-center gap-2"
              >
                <KeyRound className="h-4 w-4" />
                {isLoading ? "Verifying..." : "Verify & Sign In"}
              </button>

              <div className="text-center">
                <Link href="/auth/login" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition">
                  <ArrowLeft className="h-3.5 w-3.5" />
                  Back to Sign In
                </Link>
              </div>
            </form>
          )}
        </div>

        {/* Help text */}
        <p className="text-center text-xs text-muted-foreground mt-6">
          Lost access to your authenticator?{" "}
          <Link href="/auth/forgot-password" className="text-primary hover:underline font-semibold">
            Contact Support
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function MFAVerificationPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse-skeleton h-8 w-48 bg-muted rounded-xl" />
      </div>
    }>
      <MFAContent />
    </Suspense>
  );
}
