"use client";

import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { forgotPasswordSchema, ForgotPasswordInput } from "@/features/auth/schemas/auth-validation";
import { useAuthActions } from "@/features/auth/hooks/useAuthActions";

export default function ForgotPasswordPage() {
  const { forgotPassword, isForgotPasswordLoading } = useAuthActions();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  const onSubmit = async (data: ForgotPasswordInput) => {
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      const res = await forgotPassword(data.email);
      setSuccessMessage(res.data.message || "Reset link instructions sent.");
    } catch (err: any) {
      const serverErr = err?.errors?.[0]?.message || "Something went wrong.";
      setErrorMessage(serverErr);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8 bg-card border border-border p-8 rounded-xl shadow-lg">
        
        {/* Title */}
        <div className="text-center">
          <h2 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Recover Credentials
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            We will email password reset instructions.
          </p>
        </div>

        {errorMessage && (
          <div className="rounded-lg bg-destructive/15 border border-destructive/35 p-3 text-xs text-destructive font-medium">
            ⚠️ {errorMessage}
          </div>
        )}

        {successMessage ? (
          <div className="space-y-4">
            <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-4 text-xs text-emerald-600 font-medium">
              ✅ {successMessage}
            </div>
            <Link
              href="/auth/login"
              className="w-full bg-primary text-primary-foreground hover:bg-primary/95 text-sm font-semibold py-2.5 rounded-md transition duration-150 text-center block"
            >
              Back to Sign In
            </Link>
          </div>
        ) : (
          <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
            <div>
              <label className="block text-xs font-bold uppercase text-muted-foreground mb-1">Email Address</label>
              <input
                type="email"
                {...register("email")}
                placeholder="you@company.com"
                className="w-full bg-background border border-input rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
              {errors.email && (
                <p className="text-[11px] text-destructive mt-1">{errors.email.message}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={isForgotPasswordLoading}
              className="w-full bg-primary text-primary-foreground hover:bg-primary/95 text-sm font-semibold py-2.5 rounded-md transition duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isForgotPasswordLoading ? "Sending Link..." : "Email Reset Instructions"}
            </button>

            <Link
              href="/auth/login"
              className="w-full text-xs text-muted-foreground hover:text-foreground text-center block mt-2"
            >
              Back to Sign In
            </Link>
          </form>
        )}
      </div>
    </div>
  );
}
