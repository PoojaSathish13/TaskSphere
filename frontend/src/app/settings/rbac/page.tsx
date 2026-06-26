"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { apiClient } from "@/infrastructure/api/api-client";
import { ProtectedRoute } from "@/features/rbac/components/ProtectedRoute";

interface MemberItem {
  id: string;
  user_email: string;
  user_name: string;
  role: string; // role ID
  role_name: string;
  role_code: string;
  created_at: string;
}

interface RoleItem {
  id: string;
  name: string;
  code: string;
}

export default function RbacAdminPage() {
  const queryClient = useQueryClient();
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // 1. Fetch organization members list
  const membersQuery = useQuery<MemberItem[]>({
    queryKey: ["rbac-members"],
    queryFn: async () => {
      const res = await apiClient.get("/api/v1/rbac/members/");
      return (Array.isArray(res.data?.data) ? res.data.data : (Array.isArray(res.data) ? res.data : []));
    },
  });

  // 2. Fetch available workspace roles list
  const rolesQuery = useQuery<RoleItem[]>({
    queryKey: ["rbac-roles"],
    queryFn: async () => {
      const res = await apiClient.get("/api/v1/rbac/roles/");
      return (Array.isArray(res.data?.data) ? res.data.data : (Array.isArray(res.data) ? res.data : []));
    },
  });

  // 3. Mutation: Update member role membership
  const updateRoleMutation = useMutation({
    mutationFn: async (payload: { membershipId: string; roleId: string }) => {
      const res = await apiClient.patch(`/api/v1/rbac/members/${payload.membershipId}/`, {
        role: payload.roleId,
      });
      return res.data;
    },
    onSuccess: () => {
      setSuccessMessage("Member role updated successfully. Permissions cache cleared on server.");
      queryClient.invalidateQueries({ queryKey: ["rbac-members"] });
    },
    onError: (err: any) => {
      const msg = err?.errors?.[0]?.message || "Failed to update member role.";
      setErrorMessage(msg);
    },
  });

  const handleRoleChange = async (membershipId: string, roleId: string) => {
    setSuccessMessage(null);
    setErrorMessage(null);
    try {
      await updateRoleMutation.mutateAsync({ membershipId, roleId });
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <ProtectedRoute allowedPermissions={["ORG_MANAGE"]}>
      <main className="container mx-auto p-8 max-w-4xl space-y-6">
        
        {/* Back Link */}
        <div>
          <Link href="/" className="text-xs text-indigo-400 hover:text-indigo-300">
            ← Back to Dashboard
          </Link>
        </div>

        <header className="border-b pb-4 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight">Organization Members (RBAC)</h1>
            <p className="text-muted-foreground text-sm mt-1">Assign organizational access permissions and workspace roles.</p>
          </div>
        </header>

        {successMessage && (
          <div className="rounded-lg bg-emerald-950/30 border border-emerald-900/50 p-4 text-xs text-emerald-400 font-medium">
            ✅ {successMessage}
          </div>
        )}

        {errorMessage && (
          <div className="rounded-lg bg-destructive/15 border border-destructive/35 p-3 text-xs text-destructive font-medium">
            ⚠️ {errorMessage}
          </div>
        )}

        {/* Members Management Table */}
        <section className="bg-card border rounded-xl overflow-hidden shadow-sm">
          {membersQuery.isLoading || rolesQuery.isLoading ? (
            <div className="p-8 text-center text-xs text-muted-foreground animate-pulse">
              Loading workspace configurations...
            </div>
          ) : membersQuery.data && membersQuery.data.length > 0 ? (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b bg-muted/30 text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
                  <th className="p-4">Member Name</th>
                  <th className="p-4">Email</th>
                  <th className="p-4">Assigned Role</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y text-xs">
                {membersQuery.data.map((member) => (
                  <tr key={member.id} className="hover:bg-muted/35 transition-linear">
                    <td className="p-4 font-semibold">{member.user_name}</td>
                    <td className="p-4 text-muted-foreground">{member.user_email}</td>
                    <td className="p-4">
                      <span className="bg-indigo-950/30 text-indigo-400 border border-indigo-900/50 font-mono text-[10px] px-2 py-0.5 rounded">
                        {member.role_name}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      {/* Role selection dropdown */}
                      <select
                        id={`rbac-member-role-select-${member.id}`}
                        name={`rbac-member-role-select-${member.id}`}
                        aria-label={`Change role for ${member.user_name}`}
                        value={member.role}
                        onChange={(e) => handleRoleChange(member.id, e.target.value)}
                        className="bg-background text-foreground text-xs rounded border border-border px-2 py-1 focus:outline-none focus:ring-1 focus:ring-ring"
                      >
                        {rolesQuery.data?.map((role) => (
                          <option key={role.id} value={role.id}>
                            {role.name}
                          </option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="p-8 text-center text-xs text-muted-foreground">
              No memberships registered under this organization context.
            </div>
          )}
        </section>
      </main>
    </ProtectedRoute>
  );
}
