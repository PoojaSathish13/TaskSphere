"use client";

import React from "react";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { useAuthStore } from "@/infrastructure/store/auth-store";
import { useAuthorization } from "../hooks/useAuthorization";
import { AlertCircle } from "lucide-react";

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: string[];
  allowedPermissions?: string[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  allowedRoles,
  allowedPermissions,
}) => {
  const { user, isAuthenticated, isLoading, error, logout } = useAuth();
  const { activeOrganizationId } = useAuthStore();
  const { hasPermission, hasRole } = useAuthorization();

  const [hasMounted, setHasMounted] = React.useState(false);
  React.useEffect(() => {
    setHasMounted(true);
  }, []);

  if (!hasMounted) {
    return (
      <div className="flex h-screen items-center justify-center bg-background text-foreground">
        <div className="text-center">
          <p className="text-sm text-muted-foreground animate-pulse">
            Resolving workspace credentials...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-screen items-center justify-center bg-background text-foreground p-4 select-none">
        <div className="w-full max-w-md bg-card border border-border p-6 rounded-2xl shadow-xl space-y-4 text-center">
          <div className="h-12 w-12 rounded-full bg-rose-500/10 text-rose-500 flex items-center justify-center mx-auto">
            <AlertCircle className="h-6 w-6" />
          </div>
          <div className="space-y-1">
            <h2 className="text-base font-bold text-foreground">Workspace Connection Error</h2>
            <p className="text-xs text-muted-foreground leading-relaxed">
              We couldn't connect to the backend server to verify your credentials. The backend might be offline or restarting.
            </p>
          </div>
          <div className="p-2.5 bg-muted/40 rounded-lg text-[10px] font-mono text-rose-400 break-all border border-border">
            {typeof error === "object" && (error as any).errors ? (error as any).errors[0].message : (error as any).message || String(error)}
          </div>
          <div className="flex gap-3 justify-center pt-2">
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 border rounded-xl text-xs font-semibold hover:bg-muted transition"
            >
              Retry Connection
            </button>
            <button
              onClick={() => logout()}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="flex h-screen items-center justify-center bg-background text-foreground">
        <div className="text-center">
          <h2 className="text-xl font-bold tracking-tight">Access Denied</h2>
          <p className="text-sm text-muted-foreground mt-2">
            Please authenticate to access this resource.
          </p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex h-screen items-center justify-center bg-background text-foreground">
        <div className="text-center">
          <p className="text-sm text-muted-foreground animate-pulse">
            Resolving workspace credentials...
          </p>
        </div>
      </div>
    );
  }

  const activeMembership = user.memberships.find(
    (membership) => membership.organization.id === activeOrganizationId
  );

  if (!activeMembership) {
    return (
      <div className="flex h-screen items-center justify-center bg-background text-foreground">
        <div className="text-center">
          <h2 className="text-xl font-bold tracking-tight">Access Denied</h2>
          <p className="text-sm text-muted-foreground mt-2">
            You are not a member of the active organization workspace.
          </p>
        </div>
      </div>
    );
  }

  // 1. Validate Roles if specified
  if (allowedRoles && allowedRoles.length > 0) {
    const roleMatch = allowedRoles.some((role) => hasRole(role));
    if (!roleMatch) {
      return (
        <div className="flex h-screen items-center justify-center bg-background text-foreground">
          <div className="text-center">
            <h2 className="text-xl font-bold text-destructive">Unauthorized Role</h2>
            <p className="text-sm text-muted-foreground mt-2">
              Your role ({activeMembership.role_name}) lacks access privileges.
            </p>
          </div>
        </div>
      );
    }
  }

  // 2. Validate Permissions if specified
  if (allowedPermissions && allowedPermissions.length > 0) {
    const permissionMatch = allowedPermissions.some((perm) => hasPermission(perm));
    if (!permissionMatch) {
      return (
        <div className="flex h-screen items-center justify-center bg-background text-foreground">
          <div className="text-center">
            <h2 className="text-xl font-bold text-destructive">Access Restricted</h2>
            <p className="text-sm text-muted-foreground mt-2">
              You do not have the required permissions to access this feature.
            </p>
          </div>
        </div>
      );
    }
  }

  return <>{children}</>;
};
export default ProtectedRoute;
