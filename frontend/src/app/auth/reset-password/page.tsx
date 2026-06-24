"use client";

import React, { useState, Suspense } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { resetPasswordSchema, ResetPasswordInput } from "@/features/auth/schemas/auth-validation";
import { useAuthActions } from "@/features/auth/hooks/useAuthActions";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { resetPassword, isResetPasswordLoading } = useAuthActions();
  
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const uid = searchParams.get("uid");
  const token = searchParams.get("token");

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordInput>({
    resolver: zodResolver(resetPasswordSchema),
  });

  const onSubmit = async (data: ResetPasswordInput) => {
    setErrorMessage(null);
    setSuccessMessage(null);
    
    if (!uid || !token) {
      setErrorMessage("Reset parameters are missing. Check your email link again.");
      return;
    }

    try {
      await resetPassword({
        uid,
        token,
        newPassword: data.newPassword,
      });
      setSuccessMessage("Password reset completed successfully.");
    } catch (err: any) {
      const serverErr = err?.errors?.[0]?.message || "Failed to reset password. Link may be expired.";
      setErrorMessage(serverErr);
    }
  };

  return (
    <div className="w-full max-w-md space-y-8 bg-card border border-border p-8 rounded-xl shadow-lg">
      <div className="text-center">
        <h2 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
          Create New Password
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Enter secure passwords to recover your workspace access.
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
            Go to Sign In
          </Link>
        </div>
      ) : (
        <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
          <div>
            <label className="block text-xs font-bold uppercase text-muted-foreground mb-1">New Password</label>
            <input
              type="password"
              {...register("newPassword")}
              className="w-full bg-background border border-input rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
            {errors.newPassword && (
              <p className="text-[11px] text-destructive mt-1">{errors.newPassword.message}</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold uppercase text-muted-foreground mb-1">Confirm New Password</label>
            <input
              type="password"
              {...register("confirmPassword")}
              className="w-full bg-background border border-input rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
            {errors.confirmPassword && (
              <p className="text-[11px] text-destructive mt-1">{errors.confirmPassword.message}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={isResetPasswordLoading}
            className="w-full bg-primary text-primary-foreground hover:bg-primary/95 text-sm font-semibold py-2.5 rounded-md transition duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isResetPasswordLoading ? "Saving Credentials..." : "Reset Password"}
          </button>
        </form>
      )}
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12 sm:px-6 lg:px-8">
      <Suspense fallback={<div className="text-sm text-muted-foreground">Loading parameter check...</div>}>
        <ResetPasswordForm />
      </Suspense>
    </div>
  );
}
