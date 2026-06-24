"use client";

import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { changePasswordSchema, ChangePasswordInput, mfaVerifySchema, MfaVerifyInput } from "@/features/auth/schemas/auth-validation";
import { useAuthActions } from "@/features/auth/hooks/useAuthActions";
import { useAuth } from "@/features/auth/hooks/useAuth";

export default function SecuritySettingsPage() {
  const { user } = useAuth();
  const {
    changePassword,
    isChangePasswordLoading,
    mfaEnable,
    mfaConfirm,
    isMfaConfirmLoading,
    sessions,
    isSessionsLoading,
    revokeSession,
  } = useAuthActions();

  // Local state contexts
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  // MFA setup states
  const [mfaSecretData, setMfaSecretData] = useState<{ secret: string; provisioning_uri: string } | null>(null);
  const [backupCodes, setBackupCodes] = useState<string[] | null>(null);

  // 1. Password change hook form
  const {
    register: registerPassword,
    handleSubmit: handlePasswordSubmit,
    reset: resetPasswordForm,
    formState: { errors: passwordErrors },
  } = useForm<ChangePasswordInput>({
    resolver: zodResolver(changePasswordSchema),
  });

  // 2. MFA confirmation hook form
  const {
    register: registerMfaCode,
    handleSubmit: handleMfaSubmit,
    formState: { errors: mfaErrors },
  } = useForm<MfaVerifyInput>({
    resolver: zodResolver(mfaVerifySchema),
  });

  const onPasswordSubmit = async (data: ChangePasswordInput) => {
    setSuccessMsg(null);
    setErrorMsg(null);
    try {
      await changePassword({
        oldPassword: data.oldPassword,
        newPassword: data.newPassword,
      });
      setSuccessMsg("Your password has been changed successfully. Other sessions revoked.");
      resetPasswordForm();
    } catch (err: any) {
      const serverErr = err?.errors?.[0]?.message || "Failed to update password.";
      setErrorMsg(serverErr);
    }
  };

  const handleMfaInit = async () => {
    setErrorMsg(null);
    try {
      const res = await mfaEnable();
      setMfaSecretData(res);
    } catch (err: any) {
      setErrorMsg("Failed to start MFA setup.");
    }
  };

  const onMfaConfirmSubmit = async (data: MfaVerifyInput) => {
    setErrorMsg(null);
    try {
      const res = await mfaConfirm(data.code);
      setBackupCodes(res.backup_recovery_codes);
      setMfaSecretData(null);
    } catch (err: any) {
      const serverErr = err?.errors?.[0]?.message || "Invalid setup confirmation code.";
      setErrorMsg(serverErr);
    }
  };

  const handleSessionRevoke = async (id: string) => {
    try {
      await revokeSession(id);
    } catch (err) {
      console.error("Revoke request failed:", err);
    }
  };

  return (
    <main className="container mx-auto p-8 max-w-4xl space-y-8">
      {/* Back button */}
      <div>
        <Link href="/" className="text-xs text-indigo-400 hover:text-indigo-300">
          ← Back to Dashboard
        </Link>
      </div>

      <header className="border-b pb-4">
        <h1 className="text-3xl font-extrabold tracking-tight">Security & Credentials Panel</h1>
        <p className="text-muted-foreground text-sm mt-1">Configure account access, credentials, and track session logs.</p>
      </header>

      {/* Message Notifications */}
      {successMsg && (
        <div className="rounded-lg bg-emerald-950/30 border border-emerald-900/50 p-4 text-xs text-emerald-400 font-medium">
          ✅ {successMsg}
        </div>
      )}
      {errorMsg && (
        <div className="rounded-lg bg-destructive/15 border border-destructive/35 p-3 text-xs text-destructive font-medium">
          ⚠️ {errorMsg}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Change Password Card */}
        <section className="bg-card border rounded-xl p-6 shadow-sm space-y-4">
          <h2 className="text-lg font-bold border-b pb-2">Change Password</h2>
          <form className="space-y-3" onSubmit={handlePasswordSubmit(onPasswordSubmit)}>
            <div>
              <label className="block text-xs font-bold uppercase text-muted-foreground mb-1">Current Password</label>
              <input
                type="password"
                {...registerPassword("oldPassword")}
                className="w-full bg-background border border-input rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
              />
              {passwordErrors.oldPassword && (
                <p className="text-[10px] text-destructive mt-0.5">{passwordErrors.oldPassword.message}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-muted-foreground mb-1">New Password</label>
              <input
                type="password"
                {...registerPassword("newPassword")}
                className="w-full bg-background border border-input rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
              />
              {passwordErrors.newPassword && (
                <p className="text-[10px] text-destructive mt-0.5">{passwordErrors.newPassword.message}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-muted-foreground mb-1">Confirm New Password</label>
              <input
                type="password"
                {...registerPassword("confirmPassword")}
                className="w-full bg-background border border-input rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
              />
              {passwordErrors.confirmPassword && (
                <p className="text-[10px] text-destructive mt-0.5">{passwordErrors.confirmPassword.message}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={isChangePasswordLoading}
              className="w-full bg-primary text-primary-foreground hover:bg-primary/95 text-xs font-semibold py-2 rounded-md transition disabled:opacity-50"
            >
              {isChangePasswordLoading ? "Updating Credentials..." : "Change Password"}
            </button>
          </form>
        </section>

        {/* Multi-Factor Authentication Card */}
        <section className="bg-card border rounded-xl p-6 shadow-sm space-y-4">
          <h2 className="text-lg font-bold border-b pb-2">Multi-Factor Authentication (MFA)</h2>
          
          {user?.mfa_enabled || backupCodes ? (
            <div className="space-y-4">
              <div className="p-3 bg-emerald-950/30 border border-emerald-900/50 rounded-lg text-xs text-emerald-400">
                🛡️ MFA status: Enabled. Your workspace operations are guarded.
              </div>
              
              {backupCodes && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-amber-400">⚠️ Store these Backup codes safely. Single-use only.</p>
                  <div className="grid grid-cols-2 gap-2 bg-muted p-3 rounded font-mono text-xs text-center border">
                    {backupCodes.map((code, idx) => (
                      <div key={idx}>{code}</div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : mfaSecretData ? (
            <form className="space-y-3" onSubmit={handleMfaSubmit(onMfaConfirmSubmit)}>
              <div className="text-xs text-muted-foreground space-y-1">
                <p>1. Open Authenticator app (e.g. Google Authenticator).</p>
                <p>2. Enter manual setup key: <span className="font-mono text-indigo-400 font-semibold">{mfaSecretData.secret}</span></p>
                <p>3. Enter 6-digit TOTP code below to activate setup.</p>
              </div>

              <div>
                <input
                  type="text"
                  maxLength={6}
                  {...registerMfaCode("code")}
                  placeholder="000 000"
                  className="w-full bg-background border border-input rounded text-center font-mono text-sm px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-ring"
                />
                {mfaErrors.code && (
                  <p className="text-[10px] text-destructive mt-0.5">{mfaErrors.code.message}</p>
                )}
              </div>

              <button
                type="submit"
                disabled={isMfaConfirmLoading}
                className="w-full bg-indigo-600 text-white hover:bg-indigo-500 text-xs font-semibold py-2 rounded-md transition"
              >
                {isMfaConfirmLoading ? "Confirming Code..." : "Confirm Activation"}
              </button>
            </form>
          ) : (
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground">Add extra security layers to prevent password hijacking.</p>
              <button
                onClick={handleMfaInit}
                className="w-full bg-indigo-600 text-white hover:bg-indigo-500 text-xs font-semibold py-2 rounded-md transition"
              >
                Enable TOTP Authenticator
              </button>
            </div>
          )}
        </section>
      </div>

      {/* Active Sessions Card */}
      <section className="bg-card border rounded-xl p-6 shadow-sm space-y-4">
        <h2 className="text-lg font-bold border-b pb-2">Active login sessions</h2>
        
        {isSessionsLoading ? (
          <p className="text-xs text-muted-foreground animate-pulse">Loading login history...</p>
        ) : sessions && sessions.length > 0 ? (
          <ul className="space-y-3">
            {sessions.map((session: any) => (
              <li key={session.id} className="flex justify-between items-center text-xs bg-muted/50 border p-3 rounded-lg">
                <div>
                  <p className="font-semibold">{session.user_agent || "Web Browser Device"}</p>
                  <p className="text-[10px] text-muted-foreground">
                    IP Address: {session.ip_address} • Active: {new Date(session.last_active).toLocaleString()}
                  </p>
                </div>
                <button
                  onClick={() => handleSessionRevoke(session.id)}
                  className="bg-destructive/10 text-destructive border border-destructive/20 hover:bg-destructive hover:text-white px-3 py-1 rounded transition text-[10px] font-semibold"
                >
                  Revoke Access
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-xs text-muted-foreground">No other active login sessions detected.</p>
        )}
      </section>
    </main>
  );
}
