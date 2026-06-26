"use client";

import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { apiClient } from "@/infrastructure/api/api-client";
import { ProtectedRoute } from "@/features/rbac/components/ProtectedRoute";
import { useAuthStore } from "@/infrastructure/store/auth-store";
import { useAuthActions } from "@/features/auth/hooks/useAuthActions";
import { 
  changePasswordSchema, 
  ChangePasswordInput, 
  mfaVerifySchema, 
  MfaVerifyInput 
} from "@/features/auth/schemas/auth-validation";
import { 
  Settings, 
  Building, 
  Users, 
  UserPlus, 
  Shield, 
  Layers, 
  CreditCard, 
  Lock, 
  Share2, 
  ClipboardList, 
  Plus, 
  Trash2, 
  Check, 
  X, 
  AlertCircle, 
  CheckCircle, 
  Copy, 
  Key, 
  ChevronRight, 
  Activity, 
  ExternalLink,
  Receipt,
  Eye,
  EyeOff
} from "lucide-react";

// Types
interface WorkspaceItem {
  id: string;
  name: string;
  description: string;
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

interface ApiKeyItem {
  id: string;
  name: string;
  key?: string;
  scope: string;
  expires_at: string;
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

type SettingsModule = 
  | "organization"
  | "members"
  | "roles"
  | "workspaces"
  | "billing"
  | "security"
  | "integrations"
  | "audit";

type ScreenId =
  | "org_profile"
  | "members_licenses"
  | "invite_user"
  | "role_management"
  | "permission_matrix"
  | "workspace_management"
  | "billing_dashboard"
  | "subscription_plans"
  | "mfa_settings"
  | "security_center"
  | "integrations_list"
  | "api_keys"
  | "audit_logs";

export default function UnifiedSettingsPage() {
  const queryClient = useQueryClient();
  const { user: storeUser, activeOrganizationId, setUser } = useAuthStore();
  
  // Navigation states
  const [activeModule, setActiveModule] = useState<SettingsModule>("organization");
  const [activeScreen, setActiveScreen] = useState<ScreenId>("org_profile");

  // Keep screen selections synchronized when changing modules
  const handleModuleChange = (mod: SettingsModule) => {
    setActiveModule(mod);
    switch (mod) {
      case "organization":
        setActiveScreen("org_profile");
        break;
      case "members":
        setActiveScreen("members_licenses");
        break;
      case "roles":
        setActiveScreen("role_management");
        break;
      case "workspaces":
        setActiveScreen("workspace_management");
        break;
      case "billing":
        setActiveScreen("billing_dashboard");
        break;
      case "security":
        setActiveScreen("mfa_settings");
        break;
      case "integrations":
        setActiveScreen("integrations_list");
        break;
      case "audit":
        setActiveScreen("audit_logs");
        break;
    }
  };

  // Toast notifications
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Auth actions
  const {
    changePassword,
    isChangePasswordLoading,
    mfaEnable,
    mfaConfirm,
    isMfaConfirmLoading,
    sessions,
    isSessionsLoading,
    revokeSession
  } = useAuthActions();

  // MFA setup states
  const [mfaSecretData, setMfaSecretData] = useState<{ secret: string; provisioning_uri: string } | null>(null);
  const [backupCodes, setBackupCodes] = useState<string[] | null>(null);

  // Profile forms
  const [profileFirstName, setProfileFirstName] = useState("");
  const [profileLastName, setProfileLastName] = useState("");
  const [profileEmail, setProfileEmail] = useState("");

  const [orgName, setOrgName] = useState("");
  const [orgSlug, setOrgSlug] = useState("");

  // Sync profile inputs with storeUser
  useEffect(() => {
    if (storeUser) {
      setProfileFirstName(storeUser.first_name || "");
      setProfileLastName(storeUser.last_name || "");
      setProfileEmail(storeUser.email || "");
    }
  }, [storeUser]);

  // Sync organization details
  const { data: activeOrg } = useQuery({
    queryKey: ["org-detail", activeOrganizationId],
    queryFn: async () => {
      if (!activeOrganizationId) return null;
      const res = await apiClient.get(`/api/v1/organizations/${activeOrganizationId}/`);
      return res.data.data;
    },
    enabled: !!activeOrganizationId
  });

  useEffect(() => {
    if (activeOrg) {
      setOrgName(activeOrg.name || "");
      setOrgSlug(activeOrg.slug || "");
    }
  }, [activeOrg]);

  // Invite Seat form
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRoleId, setInviteRoleId] = useState("");

  // Workspace creation form
  const [workspaceName, setWorkspaceName] = useState("");
  const [workspaceDesc, setWorkspaceDesc] = useState("");

  // Custom Role creation form
  const [customRoleName, setCustomRoleName] = useState("");
  const [customRoleCode, setCustomRoleCode] = useState("");

  // Integrations states
  const [integrations, setIntegrations] = useState({
    slack: true,
    teams: false,
    jira: false,
    github: true
  });

  // API Keys state
  const [newKeyName, setNewKeyName] = useState("");
  const [newKeyScope, setNewKeyScope] = useState("READ_ONLY");
  const [apiKeys, setApiKeys] = useState<ApiKeyItem[]>([
    { id: "key_1", name: "CI Pipeline Deploy Key", scope: "READ_WRITE", expires_at: "2027-12-31", created_at: "2026-03-12" },
    { id: "key_2", name: "Read Only Analytics Token", scope: "READ_ONLY", expires_at: "2027-06-30", created_at: "2026-05-18" }
  ]);
  const [generatedKeyResult, setGeneratedKeyResult] = useState<string | null>(null);

  // Queries
  const { data: roles = [] } = useQuery<RoleItem[]>({
    queryKey: ["rbac-roles", activeOrganizationId],
    queryFn: async () => {
      const res = await apiClient.get("/api/v1/rbac/roles/");
      return res.data.data || res.data || [];
    }
  });

  const { data: memberships = [], isLoading: loadingMemberships } = useQuery<MembershipItem[]>({
    queryKey: ["rbac-memberships", activeOrganizationId],
    queryFn: async () => {
      const res = await apiClient.get("/api/v1/rbac/members/");
      return res.data.data || res.data || [];
    }
  });

  const { data: workspaces = [], isLoading: loadingWorkspaces } = useQuery<WorkspaceItem[]>({
    queryKey: ["saas-workspaces", activeOrganizationId],
    queryFn: async () => {
      const res = await apiClient.get("/api/v1/organizations/workspaces/");
      return (Array.isArray(res.data?.data) ? res.data.data : (Array.isArray(res.data) ? res.data : []));
    }
  });

  const { data: plans = [] } = useQuery<PlanItem[]>({
    queryKey: ["saas-plans", activeOrganizationId],
    queryFn: async () => {
      const res = await apiClient.get("/api/v1/organizations/plans/");
      return (Array.isArray(res.data?.data) ? res.data.data : (Array.isArray(res.data) ? res.data : []));
    }
  });

  const { data: subscription } = useQuery<SubscriptionDetails>({
    queryKey: ["saas-subscription", activeOrganizationId],
    queryFn: async () => {
      const res = await apiClient.get("/api/v1/organizations/subscription/");
      return res.data.data;
    }
  });

  const { data: usage } = useQuery<UsageMetric>({
    queryKey: ["saas-usage", activeOrganizationId],
    queryFn: async () => {
      const res = await apiClient.get("/api/v1/organizations/usage/");
      return res.data.data;
    }
  });

  const { data: logs = [], isLoading: loadingLogs } = useQuery<SaaSLogItem[]>({
    queryKey: ["saas-logs", activeOrganizationId],
    queryFn: async () => {
      const res = await apiClient.get("/api/v1/organizations/audit-logs/");
      return (Array.isArray(res.data?.data) ? res.data.data : (Array.isArray(res.data) ? res.data : []));
    }
  });

  const { data: invoices = [], isLoading: loadingInvoices } = useQuery<InvoiceItem[]>({
    queryKey: ["saas-invoices", activeOrganizationId],
    queryFn: async () => {
      const res = await apiClient.get("/api/v1/organizations/invoices/");
      return (Array.isArray(res.data?.data) ? res.data.data : (Array.isArray(res.data) ? res.data : []));
    }
  });

  // Zod validation forms
  const {
    register: registerPassword,
    handleSubmit: handlePasswordSubmit,
    reset: resetPasswordForm,
    formState: { errors: passwordErrors },
  } = useForm<ChangePasswordInput>({
    resolver: zodResolver(changePasswordSchema),
  });

  const {
    register: registerMfaCode,
    handleSubmit: handleMfaSubmit,
    formState: { errors: mfaErrors },
  } = useForm<MfaVerifyInput>({
    resolver: zodResolver(mfaVerifySchema),
  });

  // Mutations
  const updateProfileMutation = useMutation({
    mutationFn: async (payload: { first_name: string; last_name: string }) => {
      const res = await apiClient.patch("/api/v1/auth/me/", payload);
      return res.data.data;
    },
    onSuccess: (data) => {
      showToast("Profile details updated successfully", "success");
      if (storeUser) {
        setUser({
          ...storeUser,
          first_name: data.first_name,
          last_name: data.last_name
        });
      }
    },
    onError: () => {
      showToast("Failed to update profile", "error");
    }
  });

  const updateBrandingMutation = useMutation({
    mutationFn: async (name: string) => {
      const res = await apiClient.patch(`/api/v1/organizations/${activeOrganizationId}/`, { name });
      return res.data.data;
    },
    onSuccess: () => {
      showToast("Organization branding updated successfully", "success");
      queryClient.invalidateQueries({ queryKey: ["org-detail"] });
    },
    onError: () => {
      showToast("Failed to update branding settings", "error");
    }
  });

  const inviteMemberMutation = useMutation({
    mutationFn: async (payload: { email: string; role: string }) => {
      const userRes = await apiClient.get(`/api/v1/rbac/users/?email=${payload.email}`);
      const matchedUser = userRes.data.data?.[0];
      if (!matchedUser) {
        throw new Error("User email does not exist in platform directory.");
      }
      const res = await apiClient.post("/api/v1/rbac/members/", {
        user: matchedUser.id,
        role: payload.role
      });
      return res.data.data;
    },
    onSuccess: () => {
      showToast("Member invited successfully", "success");
      setInviteEmail("");
      setInviteRoleId("");
      queryClient.invalidateQueries({ queryKey: ["rbac-memberships"] });
      queryClient.invalidateQueries({ queryKey: ["saas-usage"] });
      queryClient.invalidateQueries({ queryKey: ["saas-logs"] });
    },
    onError: (err: any) => {
      const errMsg = err.response?.data?.[0] || err.message || "Failed to add member.";
      showToast(errMsg, "error");
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

  const updateRoleMutation = useMutation({
    mutationFn: async (payload: { membershipId: string; roleId: string }) => {
      const res = await apiClient.patch(`/api/v1/rbac/members/${payload.membershipId}/`, {
        role: payload.roleId,
      });
      return res.data.data;
    },
    onSuccess: () => {
      showToast("Member role updated successfully", "success");
      queryClient.invalidateQueries({ queryKey: ["rbac-memberships"] });
    },
    onError: () => {
      showToast("Failed to update member role", "error");
    }
  });

  const createWorkspaceMutation = useMutation({
    mutationFn: async (payload: { name: string; description: string }) => {
      const res = await apiClient.post("/api/v1/organizations/workspaces/", payload);
      return res.data.data;
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
      return res.data.data;
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

  // Action submit handlers
  const handleProfileSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileFirstName.trim() || !profileLastName.trim()) {
      showToast("First and last names are required.", "error");
      return;
    }
    updateProfileMutation.mutate({ first_name: profileFirstName, last_name: profileLastName });
  };

  const handlePasswordSubmitAction = async (data: ChangePasswordInput) => {
    try {
      await changePassword({ oldPassword: data.oldPassword, newPassword: data.newPassword });
      showToast("Password updated successfully. Other sessions revoked.", "success");
      resetPasswordForm();
    } catch (err: any) {
      const errMsg = err?.errors?.[0]?.message || "Failed to change credentials.";
      showToast(errMsg, "error");
    }
  };

  const handleMfaInit = async () => {
    try {
      const res = await mfaEnable();
      setMfaSecretData(res);
    } catch {
      showToast("Failed to start MFA activation.", "error");
    }
  };

  const onMfaConfirmSubmit = async (data: MfaVerifyInput) => {
    try {
      const res = await mfaConfirm(data.code);
      setBackupCodes(res.backup_recovery_codes);
      setMfaSecretData(null);
      showToast("TOTP MFA activated successfully", "success");
      if (storeUser) {
        setUser({ ...storeUser, mfa_enabled: true });
      }
    } catch (err: any) {
      const errMsg = err?.errors?.[0]?.message || "Invalid activation code.";
      showToast(errMsg, "error");
    }
  };

  const handleInviteMemberAction = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail || !inviteRoleId) return;
    inviteMemberMutation.mutate({ email: inviteEmail, role: inviteRoleId });
  };

  const handleCreateWorkspace = (e: React.FormEvent) => {
    e.preventDefault();
    if (!workspaceName.trim()) return;
    createWorkspaceMutation.mutate({ name: workspaceName, description: workspaceDesc });
  };

  const handleCreateCustomRole = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customRoleName.trim() || !customRoleCode.trim()) return;
    showToast(`Custom role "${customRoleName}" created successfully!`, "success");
    setCustomRoleName("");
    setCustomRoleCode("");
  };

  const handleCreateApiKey = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKeyName.trim()) return;
    const generatedStr = "ts_key_" + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    const newKeyItem: ApiKeyItem = {
      id: "key_" + Date.now(),
      name: newKeyName,
      scope: newKeyScope,
      expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      created_at: new Date().toISOString().split("T")[0]
    };
    setApiKeys([newKeyItem, ...apiKeys]);
    setGeneratedKeyResult(generatedStr);
    setNewKeyName("");
    showToast("API Access Key generated successfully", "success");
  };

  const handleDeleteApiKey = (id: string) => {
    setApiKeys(apiKeys.filter(k => k.id !== id));
    showToast("API Key revoked successfully", "success");
  };

  const handleCopyGeneratedKey = () => {
    if (!generatedKeyResult) return;
    navigator.clipboard.writeText(generatedKeyResult).then(() => {
      showToast("API Key copied to clipboard", "success");
    });
  };

  // Matrix permission options
  const matrixRoles = ["Owner", "Admin", "Member", "Guest"];
  const matrixPermissions = [
    { label: "Tasks: Read & View", owner: true, admin: true, member: true, guest: true },
    { label: "Tasks: Create & Edit", owner: true, admin: true, member: true, guest: false },
    { label: "Tasks: Delete", owner: true, admin: true, member: false, guest: false },
    { label: "Workspaces: Manage Settings", owner: true, admin: true, member: false, guest: false },
    { label: "Members: Invite Seat", owner: true, admin: true, member: false, guest: false },
    { label: "Billing: Edit Plan", owner: true, admin: false, member: false, guest: false },
    { label: "Integrations: Configure Triggers", owner: true, admin: true, member: false, guest: false },
    { label: "Audit Logs: View Ledger", owner: true, admin: true, member: false, guest: false },
  ];

  const [matrixState, setMatrixState] = useState(matrixPermissions);

  const toggleMatrixCell = (rowIndex: number, role: string) => {
    const updated = [...matrixState];
    const key = role.toLowerCase() as "owner" | "admin" | "member" | "guest";
    updated[rowIndex][key] = !updated[rowIndex][key];
    setMatrixState(updated);
    showToast("Clearance level permission map updated", "success");
  };

  // Render sub-tabs helper
  const renderSubTabs = () => {
    switch (activeModule) {
      case "organization":
        return (
          <div className="flex border-b border-[#1f1f23] mb-4 overflow-x-auto">
            <button
              onClick={() => setActiveScreen("org_profile")}
              className={`px-4 py-2 text-xs font-bold border-b-2 whitespace-nowrap transition ${
                activeScreen === "org_profile" ? "border-indigo-500 text-white" : "border-transparent text-[#8e8e95] hover:text-white"
              }`}
            >
              Organization Profile
            </button>
          </div>
        );
      case "members":
        return (
          <div className="flex border-b border-[#1f1f23] mb-4 overflow-x-auto">
            <button
              onClick={() => setActiveScreen("members_licenses")}
              className={`px-4 py-2 text-xs font-bold border-b-2 whitespace-nowrap transition ${
                activeScreen === "members_licenses" ? "border-indigo-500 text-white" : "border-transparent text-[#8e8e95] hover:text-white"
              }`}
            >
              Members & Licenses
            </button>
            <button
              onClick={() => setActiveScreen("invite_user")}
              className={`px-4 py-2 text-xs font-bold border-b-2 whitespace-nowrap transition ${
                activeScreen === "invite_user" ? "border-indigo-500 text-white" : "border-transparent text-[#8e8e95] hover:text-white"
              }`}
            >
              Invite User
            </button>
          </div>
        );
      case "roles":
        return (
          <div className="flex border-b border-[#1f1f23] mb-4 overflow-x-auto">
            <button
              onClick={() => setActiveScreen("role_management")}
              className={`px-4 py-2 text-xs font-bold border-b-2 whitespace-nowrap transition ${
                activeScreen === "role_management" ? "border-indigo-500 text-white" : "border-transparent text-[#8e8e95] hover:text-white"
              }`}
            >
              Role Management
            </button>
            <button
              onClick={() => setActiveScreen("permission_matrix")}
              className={`px-4 py-2 text-xs font-bold border-b-2 whitespace-nowrap transition ${
                activeScreen === "permission_matrix" ? "border-indigo-500 text-white" : "border-transparent text-[#8e8e95] hover:text-white"
              }`}
            >
              Permission Matrix
            </button>
          </div>
        );
      case "workspaces":
        return (
          <div className="flex border-b border-[#1f1f23] mb-4 overflow-x-auto">
            <button
              onClick={() => setActiveScreen("workspace_management")}
              className={`px-4 py-2 text-xs font-bold border-b-2 whitespace-nowrap transition ${
                activeScreen === "workspace_management" ? "border-indigo-500 text-white" : "border-transparent text-[#8e8e95] hover:text-white"
              }`}
            >
              Workspace Management
            </button>
          </div>
        );
      case "billing":
        return (
          <div className="flex border-b border-[#1f1f23] mb-4 overflow-x-auto">
            <button
              onClick={() => setActiveScreen("billing_dashboard")}
              className={`px-4 py-2 text-xs font-bold border-b-2 whitespace-nowrap transition ${
                activeScreen === "billing_dashboard" ? "border-indigo-500 text-white" : "border-transparent text-[#8e8e95] hover:text-white"
              }`}
            >
              Billing Dashboard
            </button>
            <button
              onClick={() => setActiveScreen("subscription_plans")}
              className={`px-4 py-2 text-xs font-bold border-b-2 whitespace-nowrap transition ${
                activeScreen === "subscription_plans" ? "border-indigo-500 text-white" : "border-transparent text-[#8e8e95] hover:text-white"
              }`}
            >
              Subscription Plans
            </button>
          </div>
        );
      case "security":
        return (
          <div className="flex border-b border-[#1f1f23] mb-4 overflow-x-auto">
            <button
              onClick={() => setActiveScreen("mfa_settings")}
              className={`px-4 py-2 text-xs font-bold border-b-2 whitespace-nowrap transition ${
                activeScreen === "mfa_settings" ? "border-indigo-500 text-white" : "border-transparent text-[#8e8e95] hover:text-white"
              }`}
            >
              MFA Settings
            </button>
            <button
              onClick={() => setActiveScreen("security_center")}
              className={`px-4 py-2 text-xs font-bold border-b-2 whitespace-nowrap transition ${
                activeScreen === "security_center" ? "border-indigo-500 text-white" : "border-transparent text-[#8e8e95] hover:text-white"
              }`}
            >
              Security Center
            </button>
          </div>
        );
      case "integrations":
        return (
          <div className="flex border-b border-[#1f1f23] mb-4 overflow-x-auto">
            <button
              onClick={() => setActiveScreen("integrations_list")}
              className={`px-4 py-2 text-xs font-bold border-b-2 whitespace-nowrap transition ${
                activeScreen === "integrations_list" ? "border-indigo-500 text-white" : "border-transparent text-[#8e8e95] hover:text-white"
              }`}
            >
              Integrations
            </button>
            <button
              onClick={() => setActiveScreen("api_keys")}
              className={`px-4 py-2 text-xs font-bold border-b-2 whitespace-nowrap transition ${
                activeScreen === "api_keys" ? "border-indigo-500 text-white" : "border-transparent text-[#8e8e95] hover:text-white"
              }`}
            >
              API Keys
            </button>
          </div>
        );
      case "audit":
        return (
          <div className="flex border-b border-[#1f1f23] mb-4 overflow-x-auto">
            <button
              onClick={() => setActiveScreen("audit_logs")}
              className={`px-4 py-2 text-xs font-bold border-b-2 whitespace-nowrap transition ${
                activeScreen === "audit_logs" ? "border-indigo-500 text-white" : "border-transparent text-[#8e8e95] hover:text-white"
              }`}
            >
              Audit Logs
            </button>
          </div>
        );
    }
  };

  return (
    <ProtectedRoute>
      <main className="space-y-6 pb-12 text-foreground bg-[#0a0a0c]">
        {/* Toast Alerts */}
        {toast && (
          <div className={`fixed bottom-5 right-5 z-50 p-4 rounded-xl border shadow-2xl flex items-center gap-2 text-xs font-bold bg-[#121214] text-white print:hidden ${
            toast.type === "success" ? "border-emerald-500/40 text-emerald-400" : "border-rose-500/40 text-rose-400"
          }`}>
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{toast.message}</span>
          </div>
        )}

        {/* Header */}
        <header className="border-b border-[#1f1f23] pb-5">
          <h1 className="text-3xl font-extrabold tracking-tight flex items-center gap-3 text-white">
            <Settings className="h-7 w-7 text-indigo-500" />
            System & Workspace Settings
          </h1>
          <p className="text-[#8e8e95] text-xs mt-1">
            Manage organization details, team seats roles, matrices credentials, workspaces quotas, MFA settings, integrations, and audit logs.
          </p>
        </header>

        {/* Grid split layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Module Sidebar list - Desktop left, mobile horizontal list */}
          <section className="lg:col-span-3 bg-[#121214] border border-[#1f1f23] rounded-xl p-3.5 space-y-1">
            <span className="text-[10px] uppercase font-bold text-[#8e8e95] px-3 mb-2 block tracking-wider">Modules</span>
            
            <div className="flex flex-row lg:flex-col overflow-x-auto lg:overflow-x-visible gap-1 pb-2 lg:pb-0">
              <button
                onClick={() => handleModuleChange("organization")}
                className={`w-full text-left px-3 py-2 text-xs font-semibold rounded-lg transition flex items-center gap-2.5 shrink-0 lg:shrink-1 ${
                  activeModule === "organization" ? "bg-indigo-600 text-white" : "text-[#8e8e95] hover:bg-[#1c1c1f] hover:text-white"
                }`}
              >
                <Building className="h-4 w-4" /> Organization
              </button>
              <button
                onClick={() => handleModuleChange("members")}
                className={`w-full text-left px-3 py-2 text-xs font-semibold rounded-lg transition flex items-center gap-2.5 shrink-0 lg:shrink-1 ${
                  activeModule === "members" ? "bg-indigo-600 text-white" : "text-[#8e8e95] hover:bg-[#1c1c1f] hover:text-white"
                }`}
              >
                <Users className="h-4 w-4" /> Members
              </button>
              <button
                onClick={() => handleModuleChange("roles")}
                className={`w-full text-left px-3 py-2 text-xs font-semibold rounded-lg transition flex items-center gap-2.5 shrink-0 lg:shrink-1 ${
                  activeModule === "roles" ? "bg-indigo-600 text-white" : "text-[#8e8e95] hover:bg-[#1c1c1f] hover:text-white"
                }`}
              >
                <Shield className="h-4 w-4" /> Roles
              </button>
              <button
                onClick={() => handleModuleChange("workspaces")}
                className={`w-full text-left px-3 py-2 text-xs font-semibold rounded-lg transition flex items-center gap-2.5 shrink-0 lg:shrink-1 ${
                  activeModule === "workspaces" ? "bg-indigo-600 text-white" : "text-[#8e8e95] hover:bg-[#1c1c1f] hover:text-white"
                }`}
              >
                <Layers className="h-4 w-4" /> Workspaces
              </button>
              <button
                onClick={() => handleModuleChange("billing")}
                className={`w-full text-left px-3 py-2 text-xs font-semibold rounded-lg transition flex items-center gap-2.5 shrink-0 lg:shrink-1 ${
                  activeModule === "billing" ? "bg-indigo-600 text-white" : "text-[#8e8e95] hover:bg-[#1c1c1f] hover:text-white"
                }`}
              >
                <CreditCard className="h-4 w-4" /> Billing
              </button>
              <button
                onClick={() => handleModuleChange("security")}
                className={`w-full text-left px-3 py-2 text-xs font-semibold rounded-lg transition flex items-center gap-2.5 shrink-0 lg:shrink-1 ${
                  activeModule === "security" ? "bg-indigo-600 text-white" : "text-[#8e8e95] hover:bg-[#1c1c1f] hover:text-white"
                }`}
              >
                <Lock className="h-4 w-4" /> Security
              </button>
              <button
                onClick={() => handleModuleChange("integrations")}
                className={`w-full text-left px-3 py-2 text-xs font-semibold rounded-lg transition flex items-center gap-2.5 shrink-0 lg:shrink-1 ${
                  activeModule === "integrations" ? "bg-indigo-600 text-white" : "text-[#8e8e95] hover:bg-[#1c1c1f] hover:text-white"
                }`}
              >
                <Share2 className="h-4 w-4" /> Integrations
              </button>
              <button
                onClick={() => handleModuleChange("audit")}
                className={`w-full text-left px-3 py-2 text-xs font-semibold rounded-lg transition flex items-center gap-2.5 shrink-0 lg:shrink-1 ${
                  activeModule === "audit" ? "bg-indigo-600 text-white" : "text-[#8e8e95] hover:bg-[#1c1c1f] hover:text-white"
                }`}
              >
                <ClipboardList className="h-4 w-4" /> Audit Logs
              </button>
            </div>
          </section>

          {/* Active Screen details panel */}
          <section className="lg:col-span-9 bg-[#121214] border border-[#1f1f23] rounded-xl p-6 shadow-sm min-h-[460px]">
            {renderSubTabs()}

            {/* SCREEN 1: Organization Profile */}
            {activeScreen === "org_profile" && (
              <div className="space-y-6">
                <div className="border-b border-[#1f1f23] pb-3">
                  <h3 className="text-base font-bold text-white">Organization Profile</h3>
                  <p className="text-xs text-[#8e8e95] mt-1">Modify metadata properties and public branding for your company space.</p>
                </div>

                <form onSubmit={(e) => { e.preventDefault(); updateBrandingMutation.mutate(orgName); }} className="space-y-4 max-w-lg">
                  <div className="space-y-1.5">
                    <label htmlFor="settings-org-name" className="text-[10px] uppercase font-bold text-[#8e8e95]">Organization Name</label>
                    <input
                      id="settings-org-name"
                      name="settings-org-name"
                      type="text"
                      autoComplete="organization"
                      value={orgName}
                      onChange={(e) => setOrgName(e.target.value)}
                      className="w-full bg-[#1c1c1f] border border-[#2d2d34] rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="settings-org-slug" className="text-[10px] uppercase font-bold text-[#8e8e95]">Tenant ID Slug (Read-Only)</label>
                    <input
                      id="settings-org-slug"
                      name="settings-org-slug"
                      type="text"
                      autoComplete="off"
                      value={orgSlug}
                      disabled
                      className="w-full bg-[#1c1c1f]/40 border border-[#2d2d34]/40 rounded-lg p-2.5 text-xs text-[#8e8e95] cursor-not-allowed"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4 pt-2">
                    <div className="p-4 bg-[#1c1c1f]/30 border border-[#2d2d34]/60 rounded-xl space-y-1">
                      <span className="text-[10px] text-[#8e8e95] uppercase font-bold">Workspace Members</span>
                      <p className="text-lg font-extrabold text-white">{memberships.length} Users active</p>
                    </div>
                    <div className="p-4 bg-[#1c1c1f]/30 border border-[#2d2d34]/60 rounded-xl space-y-1">
                      <span className="text-[10px] text-[#8e8e95] uppercase font-bold">Sub-workspaces</span>
                      <p className="text-lg font-extrabold text-white">{workspaces.length} Active</p>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={updateBrandingMutation.isPending}
                    className="py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-lg transition"
                  >
                    {updateBrandingMutation.isPending ? "Saving..." : "Update Branding Name"}
                  </button>
                </form>
              </div>
            )}

            {/* SCREEN 2: Members & Licenses */}
            {activeScreen === "members_licenses" && (
              <div className="space-y-6">
                <div className="border-b border-[#1f1f23] pb-3 flex justify-between items-center gap-4">
                  <div>
                    <h3 className="text-base font-bold text-white">Members & Licenses</h3>
                    <p className="text-xs text-[#8e8e95] mt-1">Review seat utilization quotas and revoke permissions.</p>
                  </div>
                  <button
                    onClick={() => setActiveScreen("invite_user")}
                    className="flex items-center gap-1.5 py-1.5 px-3 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg transition"
                  >
                    <UserPlus className="h-3.5 w-3.5" /> Invite Teammate
                  </button>
                </div>

                {/* Quota dial */}
                <div className="p-4 bg-[#1c1c1f]/40 border border-[#2d2d34]/60 rounded-xl flex justify-between items-center text-xs">
                  <div className="space-y-0.5">
                    <span className="text-[10px] uppercase font-bold text-[#8e8e95] block">Subscription Seat Capacity</span>
                    <span className="text-white font-bold">You are utilizing {memberships.length} seat license entitlements</span>
                  </div>
                  <div className="font-mono text-sm font-black text-indigo-400 bg-indigo-500/10 px-2.5 py-1 rounded-lg">
                    {memberships.length} / {usage?.members_usage.limit || 10} Used
                  </div>
                </div>

                <div className="space-y-2">
                  <span className="text-[10px] uppercase font-bold text-[#8e8e95] block">Active Seat Assignments</span>
                  {loadingMemberships ? (
                    <p className="text-xs text-[#8e8e95] animate-pulse">Loading members...</p>
                  ) : memberships.length === 0 ? (
                    <p className="text-xs text-[#8e8e95]">No members configured.</p>
                  ) : (
                    <div className="border border-[#1f1f23] rounded-xl overflow-hidden bg-[#121214]">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="border-b border-[#1f1f23] bg-[#161619] text-[#8e8e95]">
                            <th className="p-3 font-bold">User Name</th>
                            <th className="p-3 font-bold">Email</th>
                            <th className="p-3 font-bold">Role</th>
                            <th className="p-3 font-bold text-right">Clearance Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {memberships.map((m) => (
                            <tr key={m.id} className="border-b border-[#1f1f23]/60 text-[#c5c5ca] hover:bg-[#1c1c1f]/20">
                              <td className="p-3 font-bold text-white">{m.user_name}</td>
                              <td className="p-3 font-mono">{m.user_email}</td>
                              <td className="p-3">
                                <span className="bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-2 py-0.5 rounded font-semibold text-[10px]">
                                  {m.role_name}
                                </span>
                              </td>
                              <td className="p-3 text-right">
                                <button
                                  onClick={() => removeMemberMutation.mutate(m.id)}
                                  className="p-1.5 border border-rose-500/25 bg-rose-500/5 hover:bg-rose-500/10 text-rose-400 rounded-lg transition"
                                  title="Revoke member seat"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* SCREEN 3: Invite User */}
            {activeScreen === "invite_user" && (
              <div className="space-y-6">
                <div className="border-b border-[#1f1f23] pb-3">
                  <h3 className="text-base font-bold text-white">Invite User</h3>
                  <p className="text-xs text-[#8e8e95] mt-1">Allocate license entitlements and select initial roles for new teammates.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
                  {/* Form */}
                  <form onSubmit={handleInviteMemberAction} className="md:col-span-5 p-5 bg-[#1c1c1f]/40 border border-[#2d2d34]/60 rounded-xl space-y-4">
                    <span className="text-[10px] uppercase font-bold text-indigo-400 block border-b border-[#1f1f23] pb-1">Allocate seat</span>
                    
                    <div className="space-y-1.5">
                      <label htmlFor="settings-invite-email" className="text-[10px] uppercase font-bold text-[#8e8e95]">User Email</label>
                      <input
                        id="settings-invite-email"
                        name="settings-invite-email"
                        type="email"
                        autoComplete="email"
                        value={inviteEmail}
                        onChange={(e) => setInviteEmail(e.target.value)}
                        placeholder="teammate@company.com"
                        className="w-full bg-[#121214] border border-[#1f1f23] rounded-lg p-2.5 text-xs text-white focus:outline-none"
                        required
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label htmlFor="settings-invite-role" className="text-[10px] uppercase font-bold text-[#8e8e95]">Initial Access Role</label>
                      <select
                        id="settings-invite-role"
                        name="settings-invite-role"
                        value={inviteRoleId}
                        onChange={(e) => setInviteRoleId(e.target.value)}
                        className="w-full bg-[#121214] border border-[#1f1f23] rounded-lg p-2.5 text-xs text-white focus:outline-none cursor-pointer"
                        required
                      >
                        <option value="">Select clearance role...</option>
                        {roles.map((r) => (
                          <option key={r.id} value={r.id}>
                            {r.name} ({r.code})
                          </option>
                        ))}
                      </select>
                    </div>

                    <button
                      type="submit"
                      disabled={inviteMemberMutation.isPending}
                      className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-lg transition"
                    >
                      {inviteMemberMutation.isPending ? "Sending invitation..." : "Send Workspace Invite"}
                    </button>
                  </form>

                  {/* Info helper */}
                  <div className="md:col-span-7 space-y-4 text-xs text-[#8e8e95] leading-relaxed bg-[#1c1c1f]/20 border border-[#2d2d34]/40 p-5 rounded-xl">
                    <h4 className="font-bold text-white text-sm">Clearance Level Matrix Info:</h4>
                    <p>New invites must belong to a pre-existing platform directory user account matching the email.</p>
                    <ul className="list-disc list-inside space-y-1">
                      <li><strong className="text-white">Admin</strong>: full workspaces control and client editing privileges.</li>
                      <li><strong className="text-white">Member</strong>: full read/write tasks and standups logs submission.</li>
                      <li><strong className="text-white">Guest</strong>: read-only access to deliverables and milestones.</li>
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {/* SCREEN 4: Role Management */}
            {activeScreen === "role_management" && (
              <div className="space-y-6">
                <div className="border-b border-[#1f1f23] pb-3">
                  <h3 className="text-base font-bold text-white">Role Management</h3>
                  <p className="text-xs text-[#8e8e95] mt-1">Configure clearance authorization codes and customize platform roles.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
                  
                  {/* Create role form */}
                  <form onSubmit={handleCreateCustomRole} className="md:col-span-5 p-5 bg-[#1c1c1f]/40 border border-[#2d2d34]/60 rounded-xl space-y-4">
                    <span className="text-[10px] uppercase font-bold text-indigo-400 block border-b border-[#1f1f23] pb-1">Define custom role</span>
                    
                    <div className="space-y-1.5">
                      <label htmlFor="settings-custom-role-name" className="text-[10px] uppercase font-bold text-[#8e8e95]">Role Name</label>
                      <input
                        id="settings-custom-role-name"
                        name="settings-custom-role-name"
                        type="text"
                        autoComplete="off"
                        value={customRoleName}
                        onChange={(e) => setCustomRoleName(e.target.value)}
                        placeholder="e.g. Project Manager"
                        className="w-full bg-[#121214] border border-[#1f1f23] rounded-lg p-2.5 text-xs text-white focus:outline-none"
                        required
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label htmlFor="settings-custom-role-code" className="text-[10px] uppercase font-bold text-[#8e8e95]">Clearance Code</label>
                      <input
                        id="settings-custom-role-code"
                        name="settings-custom-role-code"
                        type="text"
                        autoComplete="off"
                        value={customRoleCode}
                        onChange={(e) => setCustomRoleCode(e.target.value)}
                        placeholder="e.g. PROJECT_LEAD"
                        className="w-full bg-[#121214] border border-[#1f1f23] rounded-lg p-2.5 text-xs text-white focus:outline-none"
                        required
                      />
                    </div>

                    <button
                      type="submit"
                      className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-lg transition"
                    >
                      Initialize Role
                    </button>
                  </form>

                  {/* Active roles list */}
                  <div className="md:col-span-7 space-y-3">
                    <span className="text-[10px] uppercase font-bold text-[#8e8e95] block">Active Role Directories</span>
                    <div className="space-y-2">
                      {roles.map((r) => {
                        const associatedUsers = memberships.filter(m => m.role === r.id || m.role_name === r.name);
                        return (
                          <div key={r.id} className="p-4 bg-[#1c1c1f]/40 border border-[#2d2d34]/60 rounded-xl text-xs flex justify-between items-center">
                            <div className="space-y-1">
                              <span className="font-bold text-white text-sm block">{r.name}</span>
                              <span className="text-[10px] text-[#8e8e95] font-mono block">Code: {r.code || "CUSTOM"}</span>
                            </div>
                            <div className="text-right">
                              <span className="text-xs text-indigo-400 font-bold bg-indigo-500/10 px-2.5 py-1 rounded-lg border border-indigo-500/20">
                                {associatedUsers.length} Users assigned
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* SCREEN 5: Permission Matrix */}
            {activeScreen === "permission_matrix" && (
              <div className="space-y-6">
                <div className="border-b border-[#1f1f23] pb-3">
                  <h3 className="text-base font-bold text-white">Permission Matrix</h3>
                  <p className="text-xs text-[#8e8e95] mt-1">Fine-tune authorization maps and feature check-boxes for active tenant roles.</p>
                </div>

                <div className="border border-[#1f1f23] rounded-xl overflow-hidden bg-[#121214]">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-[#1f1f23] bg-[#161619] text-[#8e8e95]">
                        <th className="p-3 font-bold">Capability / Privilege Scope</th>
                        {matrixRoles.map((role) => (
                          <th key={role} className="p-3 font-bold text-center">{role}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {matrixState.map((row, rIdx) => (
                        <tr key={rIdx} className="border-b border-[#1f1f23]/60 text-[#c5c5ca] hover:bg-[#1c1c1f]/10">
                          <td className="p-3 font-semibold text-white">{row.label}</td>
                          
                          <td className="p-3 text-center">
                            <input
                              id={`matrix-cell-${rIdx}-owner`}
                              name={`matrix-cell-${rIdx}-owner`}
                              aria-label={`${row.label} Owner permission`}
                              type="checkbox"
                              checked={row.owner}
                              onChange={() => toggleMatrixCell(rIdx, "Owner")}
                              className="rounded border-[#2d2d34] bg-[#1c1c1f] text-indigo-600 focus:ring-indigo-500 cursor-pointer h-4 w-4"
                            />
                          </td>
                          <td className="p-3 text-center">
                            <input
                              id={`matrix-cell-${rIdx}-admin`}
                              name={`matrix-cell-${rIdx}-admin`}
                              aria-label={`${row.label} Admin permission`}
                              type="checkbox"
                              checked={row.admin}
                              onChange={() => toggleMatrixCell(rIdx, "Admin")}
                              className="rounded border-[#2d2d34] bg-[#1c1c1f] text-indigo-600 focus:ring-indigo-500 cursor-pointer h-4 w-4"
                            />
                          </td>
                          <td className="p-3 text-center">
                            <input
                              id={`matrix-cell-${rIdx}-member`}
                              name={`matrix-cell-${rIdx}-member`}
                              aria-label={`${row.label} Member permission`}
                              type="checkbox"
                              checked={row.member}
                              onChange={() => toggleMatrixCell(rIdx, "Member")}
                              className="rounded border-[#2d2d34] bg-[#1c1c1f] text-indigo-600 focus:ring-indigo-500 cursor-pointer h-4 w-4"
                            />
                          </td>
                          <td className="p-3 text-center">
                            <input
                              id={`matrix-cell-${rIdx}-guest`}
                              name={`matrix-cell-${rIdx}-guest`}
                              aria-label={`${row.label} Guest permission`}
                              type="checkbox"
                              checked={row.guest}
                              onChange={() => toggleMatrixCell(rIdx, "Guest")}
                              className="rounded border-[#2d2d34] bg-[#1c1c1f] text-indigo-600 focus:ring-indigo-500 cursor-pointer h-4 w-4"
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* SCREEN 6: Workspace Management */}
            {activeScreen === "workspace_management" && (
              <div className="space-y-6">
                <div className="border-b border-[#1f1f23] pb-3">
                  <h3 className="text-base font-bold text-white">Workspace Management</h3>
                  <p className="text-xs text-[#8e8e95] mt-1">Divide organization workflows and isolate tasks through dedicated sub-workspaces.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
                  
                  {/* Create Workspace */}
                  <form onSubmit={handleCreateWorkspace} className="md:col-span-5 p-5 bg-[#1c1c1f]/40 border border-[#2d2d34]/60 rounded-xl space-y-4">
                    <span className="text-[10px] uppercase font-bold text-indigo-400 block border-b border-[#1f1f23] pb-1">Initialize Workspace</span>
                    
                    <div className="space-y-1.5">
                      <label htmlFor="settings-workspace-name" className="text-[10px] uppercase font-bold text-[#8e8e95]">Workspace Name</label>
                      <input
                        id="settings-workspace-name"
                        name="settings-workspace-name"
                        type="text"
                        autoComplete="off"
                        value={workspaceName}
                        onChange={(e) => setWorkspaceName(e.target.value)}
                        placeholder="e.g. Marketing, Sales"
                        className="w-full bg-[#121214] border border-[#1f1f23] rounded-lg p-2.5 text-xs text-white focus:outline-none"
                        required
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label htmlFor="settings-workspace-desc" className="text-[10px] uppercase font-bold text-[#8e8e95]">Description</label>
                      <textarea
                        id="settings-workspace-desc"
                        name="settings-workspace-desc"
                        value={workspaceDesc}
                        onChange={(e) => setWorkspaceDesc(e.target.value)}
                        placeholder="Describe department operations..."
                        rows={2}
                        className="w-full bg-[#121214] border border-[#1f1f23] rounded-lg p-2.5 text-xs text-white focus:outline-none resize-none"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={createWorkspaceMutation.isPending}
                      className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-lg transition"
                    >
                      {createWorkspaceMutation.isPending ? "Creating Workspace..." : "Create Workspace"}
                    </button>
                  </form>

                  {/* Workspaces List */}
                  <div className="md:col-span-7 space-y-3">
                    <span className="text-[10px] uppercase font-bold text-[#8e8e95] block">Active Workspaces</span>
                    {loadingWorkspaces ? (
                      <p className="text-xs text-[#8e8e95] animate-pulse">Loading workspaces...</p>
                    ) : workspaces.length === 0 ? (
                      <p className="text-xs text-[#8e8e95]">No active workspaces configured.</p>
                    ) : (
                      <div className="space-y-2">
                        {workspaces.map((w) => (
                          <div key={w.id} className="p-4 bg-[#1c1c1f]/40 border border-[#2d2d34]/60 rounded-xl text-xs flex justify-between items-center gap-4">
                            <div className="space-y-1">
                              <span className="font-bold text-white text-sm block">{w.name}</span>
                              {w.description && <p className="text-[#8e8e95] text-[10px]">"{w.description}"</p>}
                              <span className="text-[9px] text-[#8e8e95] font-mono block">Created: {new Date(w.created_at).toLocaleDateString()}</span>
                            </div>
                            
                            <button
                              onClick={() => deleteWorkspaceMutation.mutate(w.id)}
                              className="p-2 border border-rose-500/25 bg-rose-500/5 hover:bg-rose-500/10 text-rose-400 rounded-lg transition"
                              title="Delete Workspace"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* SCREEN 7: Billing Dashboard */}
            {activeScreen === "billing_dashboard" && (
              <div className="space-y-6">
                <div className="border-b border-[#1f1f23] pb-3 flex justify-between items-center gap-4">
                  <div>
                    <h3 className="text-base font-bold text-white">Billing Dashboard</h3>
                    <p className="text-xs text-[#8e8e95] mt-1">Review active sub-limits quotas, and retrieve legal PDF invoice records.</p>
                  </div>
                  <a
                    href="https://billing.stripe.com/p/login/test_mock"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 py-1.5 px-3 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg transition"
                  >
                    Stripe Customer Portal <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </div>

                {/* Metered usage indicators */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Tasks quota */}
                  <div className="p-4 bg-[#1c1c1f]/40 border border-[#2d2d34]/60 rounded-xl space-y-3">
                    <div className="flex justify-between items-center text-xs font-bold">
                      <span className="text-white">Tasks Usage Quota</span>
                      <span className="font-mono text-indigo-400">{usage?.tasks_usage.current} / {usage?.tasks_usage.limit}</span>
                    </div>
                    <div className="overflow-hidden h-2 rounded bg-[#121214] border border-[#1f1f23]">
                      <div
                        style={{ width: `${Math.min(usage?.tasks_usage.percentage || 0, 100)}%` }}
                        className="h-full bg-indigo-500 rounded"
                      />
                    </div>
                    <p className="text-[10px] text-[#8e8e95] font-mono">{usage?.tasks_usage.percentage}% capacity logged</p>
                  </div>

                  {/* Members quota */}
                  <div className="p-4 bg-[#1c1c1f]/40 border border-[#2d2d34]/60 rounded-xl space-y-3">
                    <div className="flex justify-between items-center text-xs font-bold">
                      <span className="text-white">Member Seats Quota</span>
                      <span className="font-mono text-indigo-400">{usage?.members_usage.current} / {usage?.members_usage.limit}</span>
                    </div>
                    <div className="overflow-hidden h-2 rounded bg-[#121214] border border-[#1f1f23]">
                      <div
                        style={{ width: `${Math.min(usage?.members_usage.percentage || 0, 100)}%` }}
                        className="h-full bg-indigo-500 rounded"
                      />
                    </div>
                    <p className="text-[10px] text-[#8e8e95] font-mono">{usage?.members_usage.percentage}% capacity logged</p>
                  </div>
                </div>

                {/* Invoice list */}
                <div className="space-y-2">
                  <span className="text-[10px] uppercase font-bold text-[#8e8e95] block">Invoices Billing History</span>
                  {loadingInvoices ? (
                    <p className="text-xs text-[#8e8e95] animate-pulse">Loading invoices...</p>
                  ) : invoices.length === 0 ? (
                    <p className="text-xs text-[#8e8e95]">No invoices paid.</p>
                  ) : (
                    <div className="border border-[#1f1f23] rounded-xl overflow-hidden bg-[#121214]">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="border-b border-[#1f1f23] bg-[#161619] text-[#8e8e95]">
                            <th className="p-3 font-bold">Stripe Ref</th>
                            <th className="p-3 font-bold">Amount</th>
                            <th className="p-3 font-bold">Status</th>
                            <th className="p-3 font-bold">Billing Date</th>
                            <th className="p-3 font-bold text-right">Receipt</th>
                          </tr>
                        </thead>
                        <tbody>
                          {invoices.map((inv) => (
                            <tr key={inv.id} className="border-b border-[#1f1f23]/60 text-[#c5c5ca]">
                              <td className="p-3 font-mono">{inv.stripe_invoice_id}</td>
                              <td className="p-3 font-bold text-white">${inv.amount}</td>
                              <td className="p-3">
                                <span className={`px-2 py-0.5 rounded font-bold text-[9px] uppercase ${
                                  inv.status === 'PAID' ? "bg-emerald-500/10 text-emerald-400 text-xs border border-emerald-500/20" : "bg-rose-500/10 text-rose-400 text-xs border border-rose-500/20"
                                }`}>
                                  {inv.status}
                                </span>
                              </td>
                              <td className="p-3 font-mono text-[#8e8e95]">{new Date(inv.created_at).toLocaleDateString()}</td>
                              <td className="p-3 text-right">
                                <button
                                  onClick={() => showToast("Downloading invoice PDF...", "success")}
                                  className="text-indigo-400 hover:text-indigo-300 font-bold hover:underline inline-flex items-center gap-1 text-[11px]"
                                >
                                  Download <Receipt className="h-3 w-3" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* SCREEN 8: Subscription Plans */}
            {activeScreen === "subscription_plans" && (
              <div className="space-y-6">
                <div className="border-b border-[#1f1f23] pb-3">
                  <h3 className="text-base font-bold text-white">Subscription Plans</h3>
                  <p className="text-xs text-[#8e8e95] mt-1">Scale organization resources and upgrade to professional tiers.</p>
                </div>

                <div className="p-5 bg-indigo-500/5 border border-indigo-500/20 rounded-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
                  <div className="space-y-1">
                    <span className="text-[10px] uppercase font-bold text-indigo-400 tracking-wider">Current Active Plan</span>
                    <h3 className="text-xl font-bold text-white">{subscription?.plan_name} Tier</h3>
                    <p className="text-[10px] text-[#8e8e95]">Renewal Date: {subscription?.current_period_end || 'N/A'}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-2xl font-black text-white">${subscription?.price_monthly}</span>
                    <span className="text-[10px] text-[#8e8e95] block">/ month</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {plans.map((p) => (
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
                        <li className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-indigo-400" /> Max Tasks Limit: {p.max_tasks}</li>
                        <li className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-indigo-400" /> Max Member Seats: {p.max_members}</li>
                      </ul>

                      {subscription?.plan_code !== p.code ? (
                        <button
                          onClick={() => upgradeSubscriptionMutation.mutate(p.code)}
                          className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-lg transition flex items-center justify-center gap-1.5"
                        >
                          Scale to Tier <ChevronRight className="h-3.5 w-3.5" />
                        </button>
                      ) : (
                        <div className="text-center text-[#8e8e95] text-[10px] font-bold py-2">
                          Currently subscribed
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* SCREEN 9: MFA Settings */}
            {activeScreen === "mfa_settings" && (
              <div className="space-y-6">
                <div className="border-b border-[#1f1f23] pb-3">
                  <h3 className="text-base font-bold text-white">MFA Settings</h3>
                  <p className="text-xs text-[#8e8e95] mt-1">Guard account operations through secondary TOTP verification tokens.</p>
                </div>

                {storeUser?.mfa_enabled || backupCodes ? (
                  <div className="space-y-4 max-w-lg">
                    <div className="p-4 bg-emerald-500/5 border border-emerald-500/25 text-emerald-400 rounded-lg text-xs font-semibold">
                      🛡️ Multi-Factor Authentication is active and guarding this account.
                    </div>
                    
                    {backupCodes && (
                      <div className="space-y-2">
                        <span className="text-[10px] uppercase font-bold text-amber-500 block">Backup recovery codes (Save safely)</span>
                        <div className="grid grid-cols-2 gap-2 bg-[#1c1c1f] border border-[#2d2d34] p-3 rounded font-mono text-[11px] text-center text-white">
                          {backupCodes.map((code, idx) => <div key={idx}>{code}</div>)}
                        </div>
                      </div>
                    )}
                  </div>
                ) : mfaSecretData ? (
                  <form className="space-y-4 max-w-lg" onSubmit={handleMfaSubmit(onMfaConfirmSubmit)}>
                    <div className="text-xs text-[#8e8e95] space-y-1.5 leading-relaxed bg-[#1c1c1f]/40 border border-[#2d2d34]/60 p-4 rounded-xl">
                      <p className="font-bold text-white">Setup Instructions:</p>
                      <p>1. Open Authenticator app (e.g. Google Authenticator).</p>
                      <p>2. Enter manual secret setup key: <span className="font-mono text-indigo-400 font-bold">{mfaSecretData.secret}</span></p>
                      <p>3. Input the generated 6-digit verification code below.</p>
                    </div>

                    <div className="space-y-1.5">
                      <label htmlFor="settings-mfa-code" className="text-[10px] uppercase font-bold text-[#8e8e95]">TOTP Code</label>
                      <input
                        id="settings-mfa-code"
                        type="text"
                        autoComplete="one-time-code"
                        maxLength={6}
                        {...registerMfaCode("code")}
                        placeholder="000 000"
                        className="w-full bg-[#1c1c1f] border border-[#2d2d34] rounded-lg text-center font-mono p-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                        required
                      />
                      {mfaErrors.code && (
                        <p className="text-[10px] text-rose-400 mt-0.5">{mfaErrors.code.message}</p>
                      )}
                    </div>

                    <button
                      type="submit"
                      disabled={isMfaConfirmLoading}
                      className="py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-lg transition"
                    >
                      {isMfaConfirmLoading ? "Confirming code..." : "Activate Authentication"}
                    </button>
                  </form>
                ) : (
                  <div className="space-y-3 max-w-lg">
                    <p className="text-xs text-[#8e8e95] leading-relaxed">
                      Require a secondary verification token when authenticating to block hijacking attempts.
                    </p>
                    <button
                      onClick={handleMfaInit}
                      className="py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-lg transition"
                    >
                      Configure TOTP Authenticator
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* SCREEN 10: Security Center */}
            {activeScreen === "security_center" && (
              <div className="space-y-6">
                <div className="border-b border-[#1f1f23] pb-3">
                  <h3 className="text-base font-bold text-white">Security Center</h3>
                  <p className="text-xs text-[#8e8e95] mt-1">Configure user login credentials and manage active device sessions.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
                  
                  {/* Change Password */}
                  <div className="md:col-span-5 p-5 bg-[#1c1c1f]/40 border border-[#2d2d34]/60 rounded-xl space-y-4">
                    <span className="text-[10px] uppercase font-bold text-indigo-400 block border-b border-[#1f1f23] pb-1">Change credentials</span>
                    
                    <form className="space-y-3.5" onSubmit={handlePasswordSubmit(handlePasswordSubmitAction)}>
                      <div className="space-y-1.5">
                        <label htmlFor="settings-current-password" className="text-[10px] uppercase font-bold text-[#8e8e95]">Current Password</label>
                        <input
                          id="settings-current-password"
                          type="password"
                          autoComplete="current-password"
                          {...registerPassword("oldPassword")}
                          className="w-full bg-[#121214] border border-[#1f1f23] rounded-lg p-2.5 text-xs text-white focus:outline-none"
                          required
                        />
                        {passwordErrors.oldPassword && (
                          <p className="text-[10px] text-rose-400 mt-0.5">{passwordErrors.oldPassword.message}</p>
                        )}
                      </div>

                      <div className="space-y-1.5">
                        <label htmlFor="settings-new-password" className="text-[10px] uppercase font-bold text-[#8e8e95]">New Password</label>
                        <input
                          id="settings-new-password"
                          type="password"
                          autoComplete="new-password"
                          {...registerPassword("newPassword")}
                          className="w-full bg-[#121214] border border-[#1f1f23] rounded-lg p-2.5 text-xs text-white focus:outline-none"
                          required
                        />
                        {passwordErrors.newPassword && (
                          <p className="text-[10px] text-rose-400 mt-0.5">{passwordErrors.newPassword.message}</p>
                        )}
                      </div>

                      <div className="space-y-1.5">
                        <label htmlFor="settings-confirm-password" className="text-[10px] uppercase font-bold text-[#8e8e95]">Confirm New Password</label>
                        <input
                          id="settings-confirm-password"
                          type="password"
                          autoComplete="new-password"
                          {...registerPassword("confirmPassword")}
                          className="w-full bg-[#121214] border border-[#1f1f23] rounded-lg p-2.5 text-xs text-white focus:outline-none"
                          required
                        />
                        {passwordErrors.confirmPassword && (
                          <p className="text-[10px] text-rose-400 mt-0.5">{passwordErrors.confirmPassword.message}</p>
                        )}
                      </div>

                      <button
                        type="submit"
                        disabled={isChangePasswordLoading}
                        className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-lg transition"
                      >
                        {isChangePasswordLoading ? "Updating Credentials..." : "Update Password"}
                      </button>
                    </form>
                  </div>

                  {/* Device sessions */}
                  <div className="md:col-span-7 space-y-3">
                    <span className="text-[10px] uppercase font-bold text-[#8e8e95] block">Active Device Sessions</span>
                    {isSessionsLoading ? (
                      <p className="text-xs text-[#8e8e95] animate-pulse">Loading login sessions...</p>
                    ) : !sessions || sessions.length === 0 ? (
                      <p className="text-xs text-[#8e8e95]">No sessions active.</p>
                    ) : (
                      <div className="space-y-2">
                        {sessions.map((session: any) => (
                          <div key={session.id} className="p-3 bg-[#1c1c1f]/40 border border-[#2d2d34]/60 rounded-xl text-xs flex justify-between items-center gap-4">
                            <div className="space-y-1">
                              <span className="font-bold text-white block">{session.user_agent || "Web Browser Agent"}</span>
                              <div className="flex flex-wrap gap-2 text-[9px] text-[#8e8e95] font-mono">
                                <span>IP: {session.ip_address || "127.0.0.1"}</span>
                                <span>• Last Active: {session.last_active ? new Date(session.last_active).toLocaleDateString() : "Just now"}</span>
                              </div>
                            </div>
                            <button
                              onClick={() => { revokeSession(session.id); showToast("Device session revoked", "success"); }}
                              className="p-1.5 border border-rose-500/20 bg-rose-500/5 hover:bg-rose-500/10 text-rose-400 rounded-lg transition"
                              title="Revoke session"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* SCREEN 11: Integrations */}
            {activeScreen === "integrations_list" && (
              <div className="space-y-6">
                <div className="border-b border-[#1f1f23] pb-3">
                  <h3 className="text-base font-bold text-white">Integrations</h3>
                  <p className="text-xs text-[#8e8e95] mt-1">Link workflow platforms and push notifications to target channels.</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Slack */}
                  <div className="p-4 bg-[#1c1c1f]/40 border border-[#2d2d34]/60 rounded-xl text-xs flex justify-between items-center">
                    <div className="space-y-0.5">
                      <strong className="text-white block">Slack Connector</strong>
                      <span className="text-[10px] text-[#8e8e95]">Export standup timelines</span>
                    </div>
                    <button
                      onClick={() => {
                        const updated = !integrations.slack;
                        setIntegrations({ ...integrations, slack: updated });
                        showToast(updated ? "Slack connected" : "Slack disconnected", "success");
                      }}
                      className={`px-3 py-1.5 rounded text-[10px] font-bold transition ${
                        integrations.slack ? "bg-emerald-600 text-white" : "bg-[#1c1c1f] border border-[#2d2d34] text-[#8e8e95]"
                      }`}
                    >
                      {integrations.slack ? "Connected" : "Disconnect"}
                    </button>
                  </div>

                  {/* Teams */}
                  <div className="p-4 bg-[#1c1c1f]/40 border border-[#2d2d34]/60 rounded-xl text-xs flex justify-between items-center">
                    <div className="space-y-0.5">
                      <strong className="text-white block">Microsoft Teams</strong>
                      <span className="text-[10px] text-[#8e8e95]">Push alerts to channels</span>
                    </div>
                    <button
                      onClick={() => {
                        const updated = !integrations.teams;
                        setIntegrations({ ...integrations, teams: updated });
                        showToast(updated ? "Teams connected" : "Teams disconnected", "success");
                      }}
                      className={`px-3 py-1.5 rounded text-[10px] font-bold transition ${
                        integrations.teams ? "bg-emerald-600 text-white" : "bg-[#1c1c1f] border border-[#2d2d34] text-[#8e8e95]"
                      }`}
                    >
                      {integrations.teams ? "Connected" : "Connect"}
                    </button>
                  </div>

                  {/* Jira */}
                  <div className="p-4 bg-[#1c1c1f]/40 border border-[#2d2d34]/60 rounded-xl text-xs flex justify-between items-center">
                    <div className="space-y-0.5">
                      <strong className="text-white block">Jira Software</strong>
                      <span className="text-[10px] text-[#8e8e95]">Sync issue checklists</span>
                    </div>
                    <button
                      onClick={() => {
                        const updated = !integrations.jira;
                        setIntegrations({ ...integrations, jira: updated });
                        showToast(updated ? "Jira connected" : "Jira disconnected", "success");
                      }}
                      className={`px-3 py-1.5 rounded text-[10px] font-bold transition ${
                        integrations.jira ? "bg-emerald-600 text-white" : "bg-[#1c1c1f] border border-[#2d2d34] text-[#8e8e95]"
                      }`}
                    >
                      {integrations.jira ? "Connected" : "Connect"}
                    </button>
                  </div>

                  {/* GitHub */}
                  <div className="p-4 bg-[#1c1c1f]/40 border border-[#2d2d34]/60 rounded-xl text-xs flex justify-between items-center">
                    <div className="space-y-0.5">
                      <strong className="text-white block">GitHub Actions</strong>
                      <span className="text-[10px] text-[#8e8e95]">Pull commit logs inside releases</span>
                    </div>
                    <button
                      onClick={() => {
                        const updated = !integrations.github;
                        setIntegrations({ ...integrations, github: updated });
                        showToast(updated ? "GitHub connected" : "GitHub disconnected", "success");
                      }}
                      className={`px-3 py-1.5 rounded text-[10px] font-bold transition ${
                        integrations.github ? "bg-emerald-600 text-white" : "bg-[#1c1c1f] border border-[#2d2d34] text-[#8e8e95]"
                      }`}
                    >
                      {integrations.github ? "Connected" : "Disconnect"}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* SCREEN 12: API Keys */}
            {activeScreen === "api_keys" && (
              <div className="space-y-6">
                <div className="border-b border-[#1f1f23] pb-3">
                  <h3 className="text-base font-bold text-white">API Keys</h3>
                  <p className="text-xs text-[#8e8e95] mt-1">Generate programmatic access tokens for external systems query.</p>
                </div>

                {/* Generator form */}
                <form onSubmit={handleCreateApiKey} className="p-5 bg-[#1c1c1f]/40 border border-[#2d2d34]/60 rounded-xl space-y-4 max-w-xl">
                  <span className="text-[10px] uppercase font-bold text-indigo-400 block border-b border-[#1f1f23] pb-1">Create Access Token</span>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label htmlFor="settings-token-name" className="text-[10px] uppercase font-bold text-[#8e8e95]">Token Name</label>
                      <input
                        id="settings-token-name"
                        name="settings-token-name"
                        type="text"
                        autoComplete="off"
                        value={newKeyName}
                        onChange={(e) => setNewKeyName(e.target.value)}
                        placeholder="e.g. Analytics Exporter"
                        className="w-full bg-[#121214] border border-[#1f1f23] rounded-lg p-2 text-xs text-white focus:outline-none"
                        required
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label htmlFor="settings-token-scope" className="text-[10px] uppercase font-bold text-[#8e8e95]">Privilege Clearance Scope</label>
                      <select
                        id="settings-token-scope"
                        name="settings-token-scope"
                        value={newKeyScope}
                        onChange={(e) => setNewKeyScope(e.target.value)}
                        className="w-full bg-[#121214] border border-[#1f1f23] rounded-lg p-2 text-xs text-white focus:outline-none cursor-pointer"
                      >
                        <option value="READ_ONLY">Read Only (Default)</option>
                        <option value="READ_WRITE">Read & Write</option>
                        <option value="ADMIN">Administrator root</option>
                      </select>
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="py-2 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-lg transition"
                  >
                    Generate API Token
                  </button>
                </form>

                {/* Result banner */}
                {generatedKeyResult && (
                  <div className="p-4 bg-amber-500/5 border border-amber-500/25 rounded-xl space-y-2 max-w-xl">
                    <span className="text-[9px] uppercase font-bold text-amber-500 block">⚠️ Security: Copy key now. It will not be shown again.</span>
                    <div className="flex items-center justify-between gap-3 bg-[#121214] border border-[#1f1f23] p-2.5 rounded-lg font-mono text-xs text-white">
                      <span className="truncate flex-1 select-all">{generatedKeyResult}</span>
                      <button
                        onClick={handleCopyGeneratedKey}
                        className="p-1 text-gray-400 hover:text-white transition"
                        title="Copy API Token"
                      >
                        <Copy className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                )}

                {/* Keys list */}
                <div className="space-y-2 max-w-xl">
                  <span className="text-[10px] uppercase font-bold text-[#8e8e95] block">Active API Tokens</span>
                  {apiKeys.map((k) => (
                    <div key={k.id} className="p-3 bg-[#1c1c1f]/40 border border-[#2d2d34]/60 rounded-xl text-xs flex justify-between items-center gap-4">
                      <div className="space-y-1">
                        <span className="font-bold text-white text-sm block">{k.name}</span>
                        <div className="flex flex-wrap gap-2 text-[9px] text-[#8e8e95] font-mono">
                          <span className="bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-1.5 py-0.25 rounded font-bold">{k.scope}</span>
                          <span>Expires: {k.expires_at}</span>
                        </div>
                      </div>
                      
                      <button
                        onClick={() => handleDeleteApiKey(k.id)}
                        className="p-2 border border-rose-500/25 bg-rose-500/5 hover:bg-rose-500/10 text-rose-400 rounded-lg transition"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* SCREEN 13: Audit Logs */}
            {activeScreen === "audit_logs" && (
              <div className="space-y-6">
                <div className="border-b border-[#1f1f23] pb-3">
                  <h3 className="text-base font-bold text-white">Audit Logs</h3>
                  <p className="text-xs text-[#8e8e95] mt-1">Review tenant operations ledger and track administrative actions.</p>
                </div>

                <div className="border border-[#1f1f23] rounded-xl overflow-hidden bg-[#121214]">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-[#1f1f23] bg-[#161619] text-[#8e8e95]">
                        <th className="p-3 font-bold">Action Type</th>
                        <th className="p-3 font-bold">Actor Email</th>
                        <th className="p-3 font-bold">Target / Entity</th>
                        <th className="p-3 font-bold">Timestamp</th>
                      </tr>
                    </thead>
                    <tbody>
                      {loadingLogs ? (
                        <tr>
                          <td colSpan={4} className="p-4 space-y-2">
                            <div className="h-4 bg-white/5 rounded animate-pulse w-full" />
                            <div className="h-4 bg-white/5 rounded animate-pulse w-4/5" />
                          </td>
                        </tr>
                      ) : logs.length === 0 ? (
                        <tr><td colSpan={4} className="p-3 text-center text-[#8e8e95]">No operations registered.</td></tr>
                      ) : (
                        logs.map((log) => (
                          <tr key={log.id} className="border-b border-[#1f1f23]/60 text-[#c5c5ca]">
                            <td className="p-3">
                              <span className={`px-2 py-0.5 rounded font-bold text-[9px] uppercase ${
                                log.action === 'CREATE' ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" :
                                log.action === 'UPDATE' ? "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20" :
                                log.action === 'DELETE' ? "bg-rose-500/10 text-rose-400 border border-rose-500/20" : "bg-[#2d2d34] text-[#8e8e95]"
                              }`}>
                                {log.action}
                              </span>
                            </td>
                            <td className="p-3 font-mono">{log.actor_email || "System Daemon"}</td>
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

        </div>
      </main>
    </ProtectedRoute>
  );
}
