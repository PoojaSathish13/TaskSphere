"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { apiClient } from "@/infrastructure/api/api-client";
import { ProtectedRoute } from "@/features/rbac/components/ProtectedRoute";
import { 
  ShieldCheck, 
  ArrowLeft,
  AlertCircle,
  CheckCircle,
  HelpCircle,
  Building
} from "lucide-react";

interface RoleItem {
  id: string;
  name: string;
  code: string;
}

interface MemberItem {
  id: string;
  user_email: string;
  user_name: string;
  role: string; // role ID
  role_name: string;
  role_code: string;
}

export default function AdminRolesPage() {
  const queryClient = useQueryClient();
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Query: Fetch members
  const { data: members = [], isLoading: loadingMembers } = useQuery<MemberItem[]>({
    queryKey: ["rbac-memberships"],
    queryFn: async () => {
      const res = await apiClient.get("/api/v1/rbac/members/");
      return (Array.isArray(res.data?.data) ? res.data.data : (Array.isArray(res.data) ? res.data : []));
    }
  });

  // Query: Fetch roles
  const { data: roles = [] } = useQuery<RoleItem[]>({
    queryKey: ["rbac-roles"],
    queryFn: async () => {
      const res = await apiClient.get("/api/v1/rbac/roles/");
      return (Array.isArray(res.data?.data) ? res.data.data : (Array.isArray(res.data) ? res.data : []));
    }
  });

  // Mutation: Update member role
  const updateRoleMutation = useMutation({
    mutationFn: async (payload: { membershipId: string; roleId: string }) => {
      const res = await apiClient.patch(`/api/v1/rbac/members/${payload.membershipId}/`, {
        role: payload.roleId,
      });
      return res.data;
    },
    onSuccess: () => {
      showToast("Member permissions updated successfully. Clear cache active.", "success");
      queryClient.invalidateQueries({ queryKey: ["rbac-memberships"] });
    },
    onError: () => {
      showToast("Failed to transition member access role.", "error");
    }
  });

  const handleRoleChange = (membershipId: string, roleId: string) => {
    updateRoleMutation.mutate({ membershipId, roleId });
  };

  return (
    <ProtectedRoute allowedPermissions={["ORG_MANAGE"]}>
      <main className="space-y-6 pb-12 text-foreground bg-[#0a0a0c]">
        {/* Toast alerts */}
        {toast && (
          <div className={`fixed bottom-5 right-5 z-50 p-4 rounded-xl border shadow-2xl flex items-center gap-2 text-xs font-bold bg-[#121214] text-white print:hidden ${
            toast.type === "success" ? "border-emerald-500/40 text-emerald-400" : "border-rose-500/40 text-rose-400"
          }`}>
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{toast.message}</span>
          </div>
        )}

        {/* Back navigation */}
        <div>
          <Link href="/admin" className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1.5 font-semibold">
            <ArrowLeft className="h-3.5 w-3.5" /> Back to Admin Console
          </Link>
        </div>

        {/* Header */}
        <header className="border-b border-[#1f1f23] pb-5">
          <h1 className="text-3xl font-extrabold tracking-tight flex items-center gap-3 text-white">
            <ShieldCheck className="h-7 w-7 text-indigo-500" />
            RBAC Access Policies
          </h1>
          <p className="text-[#8e8e95] text-xs mt-1">
            Assign workspace permission mappings, configure administrative roles, and manage authorization levels.
          </p>
        </header>

        {/* Table of Memberships */}
        <section className="bg-[#121214] border border-[#1f1f23] rounded-xl overflow-hidden shadow-sm">
          {loadingMembers ? (
            <div className="p-8 text-center text-xs animate-pulse text-[#8e8e95]">Loading authorization directory...</div>
          ) : members.length === 0 ? (
            <div className="p-8 text-center text-xs text-[#8e8e95]">No organizational members registered.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-[#1f1f23] bg-[#161619] text-[#8e8e95]">
                    <th className="p-4 font-bold">Member Name</th>
                    <th className="p-4 font-bold">Email</th>
                    <th className="p-4 font-bold">Current Policy Role</th>
                    <th className="p-4 font-bold text-right">Transition Access Level</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1f1f23]">
                  {members.map((member) => (
                    <tr key={member.id} className="hover:bg-[#1c1c1f]/20 transition duration-75 text-[#c5c5ca]">
                      <td className="p-4 font-bold text-white">{member.user_name || "Platform User"}</td>
                      <td className="p-4 font-mono text-[#8e8e95]">{member.user_email}</td>
                      <td className="p-4">
                        <span className="bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-bold font-mono text-[10px] px-2.5 py-0.5 rounded tracking-wider uppercase">
                          {member.role_name}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        <select
                          id={`role-select-${member.id}`}
                          name={`role-select-${member.id}`}
                          value={member.role}
                          onChange={(e) => handleRoleChange(member.id, e.target.value)}
                          autoComplete="off"
                          aria-label={`Select role for ${member.user_name || "member"}`}
                          className="bg-[#1c1c1f] border border-[#2d2d34] text-white text-xs rounded-lg px-3 py-1.5 focus:outline-none cursor-pointer focus:ring-1 focus:ring-indigo-500"
                        >
                          {roles.map((role) => (
                            <option key={role.id} value={role.id}>
                              {role.name} ({role.code})
                            </option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    </ProtectedRoute>
  );
}
