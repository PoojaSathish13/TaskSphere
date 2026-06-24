"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/infrastructure/api/api-client";
import { ProtectedRoute } from "@/features/rbac/components/ProtectedRoute";
import { useAuthStore } from "@/infrastructure/store/auth-store";
import { 
  Building, 
  CreditCard, 
  Activity, 
  Layers, 
  ShieldCheck, 
  Plus, 
  Trash2, 
  ArrowRight,
  CheckCircle,
  AlertCircle,
  Users,
  UserPlus,
  ExternalLink,
  Receipt,
  ShieldAlert,
  Check
} from "lucide-react";

interface WorkspaceItem {
  id: string;
  name: string;
  description: string;
  created_at: string;
}

interface PlanItem {
  id: string;
  name: string;
  code: string;
  price_monthly: string;
  max_tasks: number;
  max_members: number;
}

interface SubscriptionDetails {
  id: string;
  plan_name: string;
  plan_code: string;
  price_monthly: string;
  max_tasks: number;
  max_members: number;
  status: string;
  current_period_end: string;
}

interface UsageMetric {
  plan_name: string;
  plan_code: string;
  tasks_usage: {
    current: number;
    limit: number;
    percentage: number;
  };
  members_usage: {
    current: number;
    limit: number;
    percentage: number;
  };
}

interface SaaSLogItem {
  id: string;
  actor_email: string;
  action: string;
  target_type: string;
  object_id: string;
  created_at: string;
}

interface InvoiceItem {
  id: string;
  amount: string;
  status: 'PAID' | 'UNPAID' | 'FAILED';
  stripe_invoice_id: string;
  created_at: string;
}

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

export default function SaasSettingsPage() {
  const queryClient = useQueryClient();
  const { activeOrganizationId } = useAuthStore();

  const [activeTab, setActiveTab] = useState<"billing" | "workspaces" | "usage" | "audit" | "roles">("billing");
  const [workspaceName, setWorkspaceName] = useState("");
  const [workspaceDesc, setWorkspaceDesc] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRoleId, setInviteRoleId] = useState("");
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Queries
  const { data: workspaces = [], isLoading: loadingWorkspaces } = useQuery<WorkspaceItem[]>({
    queryKey: ["saas-workspaces", activeOrganizationId],
    queryFn: async () => {
      const res = await apiClient.get("/api/v1/organizations/workspaces/");
      return res.data || [];
    }
  });

  const { data: plans = [] } = useQuery<PlanItem[]>({
    queryKey: ["saas-plans", activeOrganizationId],
    queryFn: async () => {
      const res = await apiClient.get("/api/v1/organizations/plans/");
      return res.data || [];
    }
  });

  const { data: subscription } = useQuery<SubscriptionDetails>({
    queryKey: ["saas-subscription", activeOrganizationId],
    queryFn: async () => {
      const res = await apiClient.get("/api/v1/organizations/subscription/");
      return res.data;
    }
  });

  const { data: usage } = useQuery<UsageMetric>({
    queryKey: ["saas-usage", activeOrganizationId],
    queryFn: async () => {
      const res = await apiClient.get("/api/v1/organizations/usage/");
      return res.data;
    }
  });

  const { data: logs = [], isLoading: loadingLogs } = useQuery<SaaSLogItem[]>({
    queryKey: ["saas-logs", activeOrganizationId],
    queryFn: async () => {
      const res = await apiClient.get("/api/v1/organizations/audit-logs/");
      return res.data || [];
    }
  });

  const { data: invoices = [], isLoading: loadingInvoices } = useQuery<InvoiceItem[]>({
    queryKey: ["saas-invoices", activeOrganizationId],
    queryFn: async () => {
      const res = await apiClient.get("/api/v1/organizations/invoices/");
      return res.data || [];
    }
  });

  const { data: roles = [] } = useQuery<RoleItem[]>({
    queryKey: ["rbac-roles", activeOrganizationId],
    queryFn: async () => {
      const res = await apiClient.get("/api/v1/rbac/roles/");
      return res.data || [];
    }
  });

  const { data: memberships = [], isLoading: loadingMemberships } = useQuery<MembershipItem[]>({
    queryKey: ["rbac-memberships", activeOrganizationId],
    queryFn: async () => {
      const res = await apiClient.get("/api/v1/rbac/members/");
      return res.data || [];
    }
  });

  // Mutations
  const createWorkspaceMutation = useMutation({
    mutationFn: async (payload: { name: string; description: string }) => {
      const res = await apiClient.post("/api/v1/organizations/workspaces/", payload);
      return res.data;
    },
    onSuccess: () => {
      showToast("Workspace created successfully", "success");
      setWorkspaceName("");
      setWorkspaceDesc("");
      queryClient.invalidateQueries({ queryKey: ["saas-workspaces"] });
      queryClient.invalidateQueries({ queryKey: ["saas-logs"] });
    },
    onError: () => {
      showToast("Failed to create workspace", "error");
    }
  });

  const deleteWorkspaceMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/api/v1/organizations/workspaces/${id}/`);
    },
    onSuccess: () => {
      showToast("Workspace deleted successfully", "success");
      queryClient.invalidateQueries({ queryKey: ["saas-workspaces"] });
      queryClient.invalidateQueries({ queryKey: ["saas-logs"] });
    },
    onError: () => {
      showToast("Failed to delete workspace", "error");
    }
  });

  const upgradeSubscriptionMutation = useMutation({
    mutationFn: async (planCode: string) => {
      const res = await apiClient.post("/api/v1/organizations/subscription/", { plan_code: planCode });
      return res.data;
    },
    onSuccess: (data) => {
      showToast(`Subscription plan updated to ${data.plan_name}`, "success");
      queryClient.invalidateQueries({ queryKey: ["saas-subscription"] });
      queryClient.invalidateQueries({ queryKey: ["saas-usage"] });
      queryClient.invalidateQueries({ queryKey: ["saas-logs"] });
    },
    onError: () => {
      showToast("Failed to update subscription", "error");
    }
  });

  const inviteMemberMutation = useMutation({
    mutationFn: async (payload: { email: string; role: string }) => {
      // Find user matching email, or simulation endpoints
      const userRes = await apiClient.get(`/api/v1/rbac/users/?email=${payload.email}`);
      const matchedUser = userRes.data?.[0];
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
      queryClient.invalidateQueries({ queryKey: ["saas-logs"] });
    },
    onError: (err: any) => {
      showToast(err.response?.data?.[0] || err.message || "Failed to add member.", "error");
    }
  });

  const removeMemberMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/api/v1/rbac/members/${id}/`);
    },
    onSuccess: () => {
      showToast("Member seat revoked successfully", "success");
      queryClient.invalidateQueries({ queryKey: ["rbac-memberships"] });
      queryClient.invalidateQueries({ queryKey: ["saas-usage"] });
      queryClient.invalidateQueries({ queryKey: ["saas-logs"] });
    },
    onError: () => {
      showToast("Failed to revoke seat membership", "error");
    }
  });

  const handleCreateWorkspace = (e: React.FormEvent) => {
    e.preventDefault();
    if (!workspaceName) return;
    createWorkspaceMutation.mutate({ name: workspaceName, description: workspaceDesc });
  };

  const handleInviteMember = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail || !inviteRoleId) return;
    inviteMemberMutation.mutate({ email: inviteEmail, role: inviteRoleId });
  };

  return (
    <ProtectedRoute>
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

        {/* Dashboard Header */}
        <header className="border-b border-[#1f1f23] pb-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight flex items-center gap-3 text-white">
              <Building className="h-7 w-7 text-indigo-500" />
              SaaS Admin Panel
            </h1>
            <p className="text-[#8e8e95] text-xs mt-1">
              Strict multi-tenant workspace division, subscription plans management, Stripe integration, limits metrics, and member audits.
            </p>
          </div>
        </header>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-1.5 border-b border-[#1f1f23] pb-px">
          <button
            onClick={() => setActiveTab("billing")}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 transition focus:outline-none flex items-center gap-2 ${
              activeTab === "billing" ? "border-indigo-500 text-white" : "border-transparent text-[#8e8e95] hover:text-white"
            }`}
          >
            <CreditCard className="h-4 w-4" /> Subscription & Invoices
          </button>
          <button
            onClick={() => setActiveTab("roles")}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 transition focus:outline-none flex items-center gap-2 ${
              activeTab === "roles" ? "border-indigo-500 text-white" : "border-transparent text-[#8e8e95] hover:text-white"
            }`}
          >
            <Users className="h-4 w-4" /> Team Seats & Roles
          </button>
          <button
            onClick={() => setActiveTab("workspaces")}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 transition focus:outline-none flex items-center gap-2 ${
              activeTab === "workspaces" ? "border-indigo-500 text-white" : "border-transparent text-[#8e8e95] hover:text-white"
            }`}
          >
            <Layers className="h-4 w-4" /> Workspaces CRUD
          </button>
          <button
            onClick={() => setActiveTab("usage")}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 transition focus:outline-none flex items-center gap-2 ${
              activeTab === "usage" ? "border-indigo-500 text-white" : "border-transparent text-[#8e8e95] hover:text-white"
            }`}
          >
            <Activity className="h-4 w-4" /> Metered Quota Usage
          </button>
          <button
            onClick={() => setActiveTab("audit")}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 transition focus:outline-none flex items-center gap-2 ${
              activeTab === "audit" ? "border-indigo-500 text-white" : "border-transparent text-[#8e8e95] hover:text-white"
            }`}
          >
            <ShieldCheck className="h-4 w-4" /> Tenant Audit Ledger
          </button>
        </div>

        {/* Main Display Area */}
        <section className="bg-[#121214] border border-[#1f1f23] rounded-xl p-6 shadow-sm min-h-[350px]">
          
          {/* TAB 1: Billing & Subscriptions */}
          {activeTab === "billing" && (
            <div className="space-y-6">
              <div className="p-5 bg-indigo-500/5 border border-indigo-500/20 rounded-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="space-y-1">
                  <span className="text-[10px] uppercase font-bold text-indigo-400 tracking-wider">Active Subscription</span>
                  <h3 className="text-xl font-bold text-white">{subscription?.plan_name} Tier</h3>
                  <p className="text-[10px] text-[#8e8e95]">Renewing on: {subscription?.current_period_end || 'N/A'}</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <span className="text-2xl font-black text-white">${subscription?.price_monthly}</span>
                    <span className="text-[10px] text-[#8e8e95] block">/ month</span>
                  </div>
                  <a 
                    href="https://billing.stripe.com/p/login/test_mock" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg transition"
                  >
                    Stripe Customer Portal <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </div>
              </div>

              {/* Plans Scale comparison */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-white uppercase tracking-wider">Scale Subscription Plan</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {plans.map(p => (
                    <div 
                      key={p.id} 
                      className={`p-5 rounded-xl border flex flex-col justify-between space-y-4 relative ${
                        subscription?.plan_code === p.code 
                          ? "bg-indigo-500/5 border-indigo-500/40" 
                          : "bg-[#1c1c1f]/40 border-[#2d2d34]/60"
                      }`}
                    >
                      {subscription?.plan_code === p.code && (
                        <span className="absolute top-3 right-3 text-[9px] bg-indigo-500 text-white font-bold px-2 py-0.5 rounded flex items-center gap-1">
                          <CheckCircle className="h-3 w-3" /> Active Plan
                        </span>
                      )}
                      
                      <div className="space-y-1">
                        <h4 className="text-sm font-bold text-white">{p.name}</h4>
                        <div className="flex items-baseline gap-1">
                          <span className="text-2xl font-black text-white">${p.price_monthly}</span>
                          <span className="text-[10px] text-[#8e8e95]">/mo</span>
                        </div>
                      </div>

                      <ul className="space-y-2 text-[10px] text-[#8e8e95]">
                        <li className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-indigo-400" /> Max Tasks: {p.max_tasks}</li>
                        <li className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-indigo-400" /> Max Members: {p.max_members}</li>
                      </ul>

                      {subscription?.plan_code !== p.code && (
                        <button
                          onClick={() => upgradeSubscriptionMutation.mutate(p.code)}
                          className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-lg transition shadow-md flex items-center justify-center gap-1.5"
                        >
                          Scale to Tier <ArrowRight className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Invoices history */}
              <div className="space-y-3 pt-4">
                <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                  <Receipt className="h-4.5 w-4.5 text-indigo-500" /> Invoices Billing History
                </h4>
                <div className="border border-[#1f1f23] rounded-xl overflow-hidden bg-[#121214]">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-[#1f1f23] bg-[#161619] text-[#8e8e95]">
                        <th className="p-3 font-bold">Stripe Ref</th>
                        <th className="p-3 font-bold">Amount</th>
                        <th className="p-3 font-bold">Status</th>
                        <th className="p-3 font-bold">Billing Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {loadingInvoices ? (
                        <tr>
                          <td colSpan={4} className="p-4 space-y-2">
                            <div className="h-4 bg-white/5 rounded animate-pulse-skeleton w-3/4" />
                            <div className="h-4 bg-white/5 rounded animate-pulse-skeleton w-1/2" />
                          </td>
                        </tr>
                      ) : invoices.length === 0 ? (
                        <tr><td colSpan={4} className="p-3 text-center text-[#8e8e95]">No invoices paid.</td></tr>
                      ) : (
                        invoices.map(inv => (
                          <tr key={inv.id} className="border-b border-[#1f1f23]/60 text-[#c5c5ca]">
                            <td className="p-3 font-mono">{inv.stripe_invoice_id || 'MOCK_REF'}</td>
                            <td className="p-3 font-bold text-white">${inv.amount}</td>
                            <td className="p-3">
                              <span className={`px-2 py-0.5 rounded font-bold text-[9px] uppercase ${
                                inv.status === 'PAID' ? "bg-emerald-500/10 text-emerald-400" :
                                inv.status === 'FAILED' ? "bg-rose-500/10 text-rose-400" : "bg-[#2d2d34] text-[#8e8e95]"
                              }`}>
                                {inv.status}
                              </span>
                            </td>
                            <td className="p-3 font-mono text-[#8e8e95]">{new Date(inv.created_at).toLocaleDateString()}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: Team Members & Role Seats */}
          {activeTab === "roles" && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                {/* Invite form */}
                <div className="md:col-span-1 p-5 bg-[#1c1c1f]/40 border border-[#2d2d34]/60 rounded-xl space-y-4">
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1">
                    <UserPlus className="h-4.5 w-4.5 text-indigo-500" /> Allocate Team Seat
                  </h3>
                  
                  <form onSubmit={handleInviteMember} className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-[9px] uppercase font-bold text-[#8e8e95]">Member Email</label>
                      <input
                        type="email"
                        value={inviteEmail}
                        onChange={(e) => setInviteEmail(e.target.value)}
                        placeholder="user@organization.com"
                        className="w-full bg-[#121214] border border-[#1f1f23] rounded-lg p-2.5 text-xs text-white focus:outline-none"
                        required
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[9px] uppercase font-bold text-[#8e8e95]">Access Role</label>
                      <select
                        value={inviteRoleId}
                        onChange={(e) => setInviteRoleId(e.target.value)}
                        className="w-full bg-[#121214] border border-[#1f1f23] rounded-lg p-2.5 text-xs text-white focus:outline-none cursor-pointer"
                        required
                      >
                        <option value="">Select Target Role</option>
                        {roles.map(r => (
                          <option key={r.id} value={r.id}>{r.name} ({r.code})</option>
                        ))}
                      </select>
                    </div>

                    <button
                      type="submit"
                      className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-lg transition"
                    >
                      Allocate Member Seat
                    </button>
                  </form>
                </div>

                {/* Team Seat Members List */}
                <div className="md:col-span-2 space-y-3">
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider">Active Organization Seats</h3>
                  <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                    {loadingMemberships ? (
                      <div className="space-y-2 animate-pulse-skeleton">
                        <div className="h-16 bg-white/5 rounded-xl border border-white/5" />
                        <div className="h-16 bg-white/5 rounded-xl border border-white/5" />
                      </div>
                    ) : memberships.length === 0 ? (
                      <p className="text-xs text-[#8e8e95] py-4">No team memberships added.</p>
                    ) : (
                      memberships.map(member => (
                        <div key={member.id} className="p-4 bg-[#1c1c1f]/40 border border-[#2d2d34]/60 rounded-xl text-xs flex justify-between items-center gap-4">
                          <div className="space-y-1">
                            <span className="font-bold text-white text-sm">{member.user_name}</span>
                            <span className="block text-[#8e8e95] font-mono">{member.user_email}</span>
                            <span className="text-[9px] text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded font-bold border border-indigo-500/20">
                              Role: {member.role_name}
                            </span>
                          </div>
                          
                          <button
                            onClick={() => removeMemberMutation.mutate(member.id)}
                            className="p-2 border border-rose-500/20 bg-rose-500/5 hover:bg-rose-500/10 text-rose-400 rounded-lg transition"
                            title="Revoke seat membership"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* TAB 3: Workspace Management */}
          {activeTab === "workspaces" && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                {/* Form to Create Workspace */}
                <div className="md:col-span-1 p-5 bg-[#1c1c1f]/40 border border-[#2d2d34]/60 rounded-xl space-y-4">
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider">Initialize Workspace</h3>
                  <form onSubmit={handleCreateWorkspace} className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-[9px] uppercase font-bold text-[#8e8e95]">Workspace Name</label>
                      <input
                        type="text"
                        value={workspaceName}
                        onChange={(e) => setWorkspaceName(e.target.value)}
                        placeholder="e.g. Engineering, Sales"
                        className="w-full bg-[#121214] border border-[#1f1f23] rounded-lg p-2.5 text-xs text-white focus:outline-none"
                        required
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[9px] uppercase font-bold text-[#8e8e95]">Description</label>
                      <textarea
                        value={workspaceDesc}
                        onChange={(e) => setWorkspaceDesc(e.target.value)}
                        placeholder="Define workspace goals..."
                        rows={2}
                        className="w-full bg-[#121214] border border-[#1f1f23] rounded-lg p-2.5 text-xs text-white focus:outline-none resize-none"
                      />
                    </div>

                    <button
                      type="submit"
                      className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-lg transition flex items-center justify-center gap-1.5"
                    >
                      <Plus className="h-4 w-4" /> Create Workspace
                    </button>
                  </form>
                </div>

                {/* Workspace List */}
                <div className="md:col-span-2 space-y-3">
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider">Active Workspace Sub-divisions</h3>
                  <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                    {loadingWorkspaces ? (
                      <div className="space-y-2 animate-pulse-skeleton">
                        <div className="h-16 bg-white/5 rounded-xl border border-white/5" />
                        <div className="h-16 bg-white/5 rounded-xl border border-white/5" />
                      </div>
                    ) : workspaces.length === 0 ? (
                      <p className="text-xs text-[#8e8e95] py-4">No active workspaces initialized.</p>
                    ) : (
                      workspaces.map(w => (
                        <div key={w.id} className="p-4 bg-[#1c1c1f]/40 border border-[#2d2d34]/60 rounded-xl text-xs flex justify-between items-center gap-4">
                          <div className="space-y-1">
                            <span className="font-bold text-white text-sm">{w.name}</span>
                            {w.description && <p className="text-[#8e8e95] text-[10px]">"{w.description}"</p>}
                            <span className="text-[9px] text-[#8e8e95] font-mono block">Created: {new Date(w.created_at).toLocaleDateString()}</span>
                          </div>
                          
                          <button
                            onClick={() => deleteWorkspaceMutation.mutate(w.id)}
                            className="p-2 border border-rose-500/20 bg-rose-500/5 hover:bg-rose-500/10 text-rose-400 rounded-lg transition"
                            title="Delete Workspace"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* TAB 4: Metered Quota Usage */}
          {activeTab === "usage" && (
            <div className="space-y-6">
              <span className="text-xs font-bold text-white uppercase tracking-wider block">Metered Limits Tracker</span>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Dial 1: Tasks Usage */}
                <div className="p-5 bg-[#1c1c1f]/40 border border-[#2d2d34]/60 rounded-xl space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-white">Tasks Usage Quota</span>
                    <span className={`font-mono text-xs font-black ${
                      (usage?.tasks_usage.percentage || 0) >= 100 ? "text-rose-500" :
                      (usage?.tasks_usage.percentage || 0) >= 80 ? "text-amber-500 animate-pulse" : "text-indigo-400"
                    }`}>
                      {usage?.tasks_usage.current} / {usage?.tasks_usage.limit}
                    </span>
                  </div>

                  <div className="relative pt-1">
                    <div className="overflow-hidden h-2 text-xs flex rounded bg-[#121214] border border-[#1f1f23]">
                      <div 
                        style={{ width: `${Math.min(usage?.tasks_usage.percentage || 0, 100)}%` }}
                        className={`shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center ${
                          (usage?.tasks_usage.percentage || 0) >= 90 ? "bg-rose-500" :
                          (usage?.tasks_usage.percentage || 0) >= 80 ? "bg-amber-500" : "bg-indigo-500"
                        }`}
                      />
                    </div>
                    
                    <div className="flex justify-between mt-1 text-[9px] text-[#8e8e95] font-mono">
                      <span>{usage?.tasks_usage.percentage}% capacity logged</span>
                      {(usage?.tasks_usage.percentage || 0) >= 80 && (
                        <span className="flex items-center gap-0.5 text-amber-500">
                          <ShieldAlert className="h-3 w-3" /> Approaching Quota Threshold Limit
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Dial 2: Members Usage */}
                <div className="p-5 bg-[#1c1c1f]/40 border border-[#2d2d34]/60 rounded-xl space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-white">Seat Members Quota</span>
                    <span className={`font-mono text-xs font-black ${
                      (usage?.members_usage.percentage || 0) >= 100 ? "text-rose-500" :
                      (usage?.members_usage.percentage || 0) >= 80 ? "text-amber-500 animate-pulse" : "text-indigo-400"
                    }`}>
                      {usage?.members_usage.current} / {usage?.members_usage.limit}
                    </span>
                  </div>

                  <div className="relative pt-1">
                    <div className="overflow-hidden h-2 text-xs flex rounded bg-[#121214] border border-[#1f1f23]">
                      <div 
                        style={{ width: `${Math.min(usage?.members_usage.percentage || 0, 100)}%` }}
                        className={`shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center ${
                          (usage?.members_usage.percentage || 0) >= 90 ? "bg-rose-500" :
                          (usage?.members_usage.percentage || 0) >= 80 ? "bg-amber-500" : "bg-indigo-500"
                        }`}
                      />
                    </div>
                    
                    <div className="flex justify-between mt-1 text-[9px] text-[#8e8e95] font-mono">
                      <span>{usage?.members_usage.percentage}% capacity logged</span>
                      {(usage?.members_usage.percentage || 0) >= 80 && (
                        <span className="flex items-center gap-0.5 text-amber-500">
                          <ShieldAlert className="h-3 w-3" /> Approaching Member Seat Limit
                        </span>
                      )}
                    </div>
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* TAB 5: Audit Logs Ledger */}
          {activeTab === "audit" && (
            <div className="space-y-4">
              <span className="text-xs font-bold text-white uppercase tracking-wider block">Tenant Operations Ledger</span>
              <div className="border border-[#1f1f23] rounded-xl overflow-hidden bg-[#121214]">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-[#1f1f23] bg-[#161619] text-[#8e8e95]">
                      <th className="p-3 font-bold">Action</th>
                      <th className="p-3 font-bold">Actor</th>
                      <th className="p-3 font-bold">Target</th>
                      <th className="p-3 font-bold">Timestamp</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loadingLogs ? (
                      <tr>
                        <td colSpan={4} className="p-4 space-y-2">
                          <div className="h-4 bg-white/5 rounded animate-pulse-skeleton w-full" />
                          <div className="h-4 bg-white/5 rounded animate-pulse-skeleton w-5/6" />
                        </td>
                      </tr>
                    ) : logs.length === 0 ? (
                      <tr><td colSpan={4} className="p-3 text-center text-[#8e8e95]">No audit operations registered.</td></tr>
                    ) : (
                      logs.map(log => (
                        <tr key={log.id} className="border-b border-[#1f1f23]/60 text-[#c5c5ca]">
                          <td className="p-3">
                            <span className={`px-2 py-0.5 rounded font-bold text-[9px] uppercase ${
                              log.action === 'CREATE' ? "bg-emerald-500/10 text-emerald-400" :
                              log.action === 'UPDATE' ? "bg-indigo-500/10 text-indigo-400" :
                              log.action === 'DELETE' ? "bg-rose-500/10 text-rose-400" : "bg-[#2d2d34] text-[#8e8e95]"
                            }`}>
                              {log.action}
                            </span>
                          </td>
                          <td className="p-3 font-mono">{log.actor_email || 'System'}</td>
                          <td className="p-3">{log.target_type} ({log.object_id})</td>
                          <td className="p-3 font-mono text-[#8e8e95]">{new Date(log.created_at).toLocaleString()}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </section>
      </main>
    </ProtectedRoute>
  );
}
