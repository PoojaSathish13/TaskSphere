"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { apiClient } from "@/infrastructure/api/api-client";
import { ProtectedRoute } from "@/features/rbac/components/ProtectedRoute";
import { 
  Users, 
  UserPlus, 
  Trash2, 
  ArrowLeft,
  AlertCircle,
  CheckCircle,
  Building
} from "lucide-react";

interface RoleItem {
  id: string;
  name: string;
  code: string;
}

interface MembershipItem {
  id: string;
  user_email: string;
  user_name: string;
  role: string;
  role_name: string;
  role_code: string;
  created_at: string;
}

export default function AdminUsersPage() {
  const queryClient = useQueryClient();
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRoleId, setInviteRoleId] = useState("");
  
  // Local notification state
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Query: Fetch roles
  const { data: roles = [] } = useQuery<RoleItem[]>({
    queryKey: ["rbac-roles"],
    queryFn: async () => {
      const res = await apiClient.get("/api/v1/rbac/roles/");
      return (Array.isArray(res.data?.data) ? res.data.data : (Array.isArray(res.data) ? res.data : []));
    }
  });

  // Query: Fetch memberships
  const { data: memberships = [], isLoading } = useQuery<MembershipItem[]>({
    queryKey: ["rbac-memberships"],
    queryFn: async () => {
      const res = await apiClient.get("/api/v1/rbac/members/");
      return (Array.isArray(res.data?.data) ? res.data.data : (Array.isArray(res.data) ? res.data : []));
    }
  });

  // Mutation: Invite member
  const inviteMemberMutation = useMutation({
    mutationFn: async (payload: { email: string; role: string }) => {
      // Find user matching email
      const userRes = await apiClient.get(`/api/v1/rbac/users/?email=${payload.email}`);
      const matchedUser = userRes.data.data?.[0];
      if (!matchedUser) {
        throw new Error("User email does not exist in platform directory.");
      }
      const res = await apiClient.post("/api/v1/rbac/members/", {
        user: matchedUser.id,
        role: payload.role
      });
      return res.data;
    },
    onSuccess: () => {
      showToast("Seat member added successfully", "success");
      setInviteEmail("");
      setInviteRoleId("");
      queryClient.invalidateQueries({ queryKey: ["rbac-memberships"] });
      queryClient.invalidateQueries({ queryKey: ["saas-usage"] });
    },
    onError: (err: any) => {
      const errMsg = err.response?.data?.[0] || err.message || "Failed to add member.";
      showToast(errMsg, "error");
    }
  });

  // Mutation: Revoke member seat
  const removeMemberMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/api/v1/rbac/members/${id}/`);
    },
    onSuccess: () => {
      showToast("Member seat revoked successfully", "success");
      queryClient.invalidateQueries({ queryKey: ["rbac-memberships"] });
      queryClient.invalidateQueries({ queryKey: ["saas-usage"] });
    },
    onError: () => {
      showToast("Failed to revoke seat membership", "error");
    }
  });

  const handleInviteMember = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail || !inviteRoleId) return;
    inviteMemberMutation.mutate({ email: inviteEmail, role: inviteRoleId });
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
            <Users className="h-7 w-7 text-indigo-500" />
            SaaS Team Seat Allocations
          </h1>
          <p className="text-[#8e8e95] text-xs mt-1">
            Allocate organizational seat licenses, assign default roles, and revoke member clearances.
          </p>
        </header>

        {/* Main Columns Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Column A: Invite member form (Col-span-4) */}
          <section className="lg:col-span-4 bg-[#121214] border border-[#1f1f23] rounded-xl p-5 shadow-sm space-y-4">
            <div className="border-b border-[#1f1f23] pb-2">
              <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <UserPlus className="h-4 w-4 text-indigo-400" />
                Allocate Seat License
              </h2>
              <p className="text-[10px] text-[#8e8e95] mt-0.5">Assign seat subscription to existing system users.</p>
            </div>

             <form onSubmit={handleInviteMember} className="space-y-4">
              <div className="space-y-1.5">
                <label htmlFor="user-email" className="text-[9px] uppercase font-bold text-[#8e8e95]">User Email Address</label>
                <input
                  id="user-email"
                  name="user-email"
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="name@company.com"
                  autoComplete="email"
                  className="w-full bg-[#1c1c1f] border border-[#2d2d34] rounded-lg p-2.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="privilege-role" className="text-[9px] uppercase font-bold text-[#8e8e95]">Access Privilege Role</label>
                <select
                  id="privilege-role"
                  name="privilege-role"
                  value={inviteRoleId}
                  onChange={(e) => setInviteRoleId(e.target.value)}
                  autoComplete="off"
                  className="w-full bg-[#1c1c1f] border border-[#2d2d34] rounded-lg p-2.5 text-xs text-white focus:outline-none cursor-pointer focus:ring-1 focus:ring-indigo-500"
                  required
                >
                  <option value="">Choose default role...</option>
                  {roles.map(r => (
                    <option key={r.id} value={r.id}>{r.name} ({r.code})</option>
                  ))}
                </select>
              </div>

              <button
                type="submit"
                disabled={inviteMemberMutation.isPending}
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold text-xs rounded-lg transition"
              >
                {inviteMemberMutation.isPending ? "Allocating seat..." : "Allocate Seat License"}
              </button>
            </form>
          </section>

          {/* Column B: Active Members Seats (Col-span-8) */}
          <section className="lg:col-span-8 bg-[#121214] border border-[#1f1f23] rounded-xl p-5 shadow-sm space-y-4">
            <div className="border-b border-[#1f1f23] pb-2">
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">Active Seat Licenses ({memberships.length})</h2>
              <p className="text-[10px] text-[#8e8e95] mt-0.5">Currently active seat registrations in this organization.</p>
            </div>

            <div className="space-y-3 overflow-y-auto max-h-[500px] pr-1">
              {isLoading ? (
                <div className="p-8 text-center text-xs animate-pulse text-[#8e8e95]">Loading seat configurations...</div>
              ) : memberships.length === 0 ? (
                <div className="p-8 text-center text-xs text-[#8e8e95] border border-dashed border-[#1f1f23] rounded-lg">
                  No active seat registrations. Use the license form on the left to allocate seats.
                </div>
              ) : (
                memberships.map((member) => (
                  <div key={member.id} className="p-4 bg-[#1c1c1f]/40 border border-[#2d2d34]/60 rounded-xl text-xs flex justify-between items-center gap-4 hover:border-indigo-500/20 transition duration-150">
                    <div className="space-y-1">
                      <span className="font-bold text-white text-sm">{member.user_name || "Platform Member"}</span>
                      <span className="block text-[#8e8e95] font-mono">{member.user_email}</span>
                      <span className="inline-block text-[9px] text-indigo-400 bg-indigo-500/10 px-2.5 py-0.5 rounded font-bold border border-indigo-500/20 uppercase tracking-wider">
                        Role: {member.role_name}
                      </span>
                    </div>

                    <button
                      onClick={() => {
                        if (confirm(`Are you sure you want to revoke license and membership for ${member.user_email}?`)) {
                          removeMemberMutation.mutate(member.id);
                        }
                      }}
                      className="p-2.5 border border-rose-500/20 bg-rose-500/5 hover:bg-rose-500/10 text-rose-400 rounded-lg transition"
                      title="Revoke seat license"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </section>

        </div>
      </main>
    </ProtectedRoute>
  );
}
