"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Building2,
  Plus,
  ChevronRight,
  Shield,
  Clock,
  CheckCircle2,
  Layers,
  Search,
  Star,
  Users,
  AlertCircle,
  X,
} from "lucide-react";
import { useAuthStore } from "@/infrastructure/store/auth-store";
import { useTenants } from "@/features/tenants/hooks/useTenants";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/infrastructure/api/api-client";

interface WorkspaceItem {
  id: string;
  name: string;
  description: string;
  created_at: string;
}

export default function WorkspaceSelectPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const { organizations, activeOrganization, switchOrganization } = useTenants();

  const [searchQuery, setSearchQuery] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newOrgName, setNewOrgName] = useState("");
  const [newOrgSlug, setNewOrgSlug] = useState("");
  const [createError, setCreateError] = useState<string | null>(null);

  // Fetch workspaces for the active organization
  const { data: workspacesData, isLoading: loadingWorkspaces } = useQuery<WorkspaceItem[]>({
    queryKey: ["workspaces", activeOrganization?.id],
    queryFn: async () => {
      const res = await apiClient.get("/api/v1/organizations/workspaces/");
      return (Array.isArray(res.data?.data) ? res.data.data : (Array.isArray(res.data) ? res.data : []));
    },
    enabled: !!activeOrganization,
  });

  const workspaces = React.useMemo(() => Array.isArray(workspacesData) ? workspacesData : [], [workspacesData]);

  // Create workspace mutation
  const createWorkspaceMutation = useMutation({
    mutationFn: async (payload: { name: string; description: string }) => {
      const res = await apiClient.post("/api/v1/organizations/workspaces/", payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workspaces"] });
      setShowCreateModal(false);
      setNewOrgName("");
      setNewOrgSlug("");
    },
    onError: (err: any) => {
      setCreateError(err?.response?.data?.detail || "Failed to create workspace.");
    },
  });

  // Get role for a specific organization
  const getRoleForOrg = (orgId: string) => {
    const membership = user?.memberships.find((m) => m.organization.id === orgId);
    return membership?.role_name || "Member";
  };

  const getRoleCode = (orgId: string) => {
    const membership = user?.memberships.find((m) => m.organization.id === orgId);
    return membership?.role_code || "MEMBER";
  };

  // Filter organizations by search
  const filteredOrgs = organizations.filter((org) =>
    org.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Get recent workspaces (last accessed — simulated with created_at sorting)
  const recentWorkspaces = [...workspaces]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 3);

  const handleSelectOrg = (orgId: string) => {
    switchOrganization(orgId);
    router.push("/");
  };

  const handleCreateWorkspace = () => {
    if (!newOrgName.trim()) return;
    setCreateError(null);
    createWorkspaceMutation.mutate({
      name: newOrgName.trim(),
      description: newOrgSlug.trim(),
    });
  };

  const roleColorMap: Record<string, string> = {
    ADMIN: "text-primary bg-primary/10 border-primary/20",
    SUPER_ADMIN: "text-amber-600 bg-amber-50 border-amber-200",
    MEMBER: "text-emerald-600 bg-emerald-50 border-emerald-200",
    VIEWER: "text-muted-foreground bg-muted border-border",
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Background decorations */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 h-[500px] w-[500px] rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 h-[400px] w-[400px] rounded-full bg-accent/5 blur-3xl" />
      </div>

      <div className="relative z-10 max-w-4xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="text-center mb-10 animate-slide-up">
          <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-primary/10 border border-primary/20 mb-5">
            <Layers className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-3xl font-black tracking-tight text-foreground">Select Workspace</h1>
          <p className="text-muted-foreground text-sm mt-2 max-w-md mx-auto">
            Choose an organization to access its projects, tasks, and team resources.
          </p>
        </div>

        {/* Search & Create Row */}
        <div className="flex items-center gap-3 mb-8 animate-slide-up" style={{ animationDelay: "50ms" }}>
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              id="search-orgs"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search organizations..."
              autoComplete="off"
              aria-label="Search organizations"
              className="w-full pl-10 pr-4 py-2.5 bg-card border border-border rounded-xl text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition"
            />
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground font-semibold text-sm rounded-xl hover:bg-primary/90 transition shadow-lg shadow-primary/15 shrink-0"
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">New Workspace</span>
          </button>
        </div>

        {/* Recent Workspaces Quick Access */}
        {recentWorkspaces.length > 0 && (
          <div className="mb-8 animate-slide-up" style={{ animationDelay: "100ms" }}>
            <h2 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
              <Clock className="h-3.5 w-3.5" />
              Recent Workspaces
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {recentWorkspaces.map((ws) => (
                <button
                  key={ws.id}
                  onClick={() => router.push("/")}
                  className="group bg-card border border-border rounded-xl p-4 text-left hover:border-primary/40 hover:shadow-md transition-all"
                >
                  <div className="flex items-center gap-2 mb-1.5">
                    <Star className="h-3.5 w-3.5 text-amber-400" />
                    <span className="text-sm font-semibold text-foreground truncate">{ws.name}</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground truncate">
                    {ws.description || "No description"}
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-2">
                    {new Date(ws.created_at).toLocaleDateString()}
                  </p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Organizations List */}
        <div className="animate-slide-up" style={{ animationDelay: "150ms" }}>
          <h2 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
            <Building2 className="h-3.5 w-3.5" />
            Your Organizations ({filteredOrgs.length})
          </h2>

          {filteredOrgs.length === 0 ? (
            <div className="bg-card border border-border rounded-2xl p-12 text-center">
              <Building2 className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">
                {searchQuery ? "No organizations match your search." : "You don't belong to any organizations yet."}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredOrgs.map((org) => {
                const isActive = org.id === activeOrganization?.id;
                const role = getRoleForOrg(org.id);
                const roleCode = getRoleCode(org.id);
                const roleColor = roleColorMap[roleCode] || roleColorMap.MEMBER;

                return (
                  <button
                    key={org.id}
                    onClick={() => handleSelectOrg(org.id)}
                    className={`w-full group bg-card border rounded-2xl p-5 text-left transition-all hover:shadow-md ${
                      isActive
                        ? "border-primary/50 shadow-sm ring-1 ring-primary/20"
                        : "border-border hover:border-primary/30"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4 min-w-0">
                        {/* Org Avatar */}
                        <div
                          className={`h-12 w-12 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 ${
                            isActive
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted text-foreground"
                          }`}
                        >
                          {org.name.substring(0, 2).toUpperCase()}
                        </div>

                        {/* Org Details */}
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-foreground truncate">{org.name}</span>
                            {isActive && (
                              <span className="flex items-center gap-1 text-[10px] text-primary font-semibold">
                                <CheckCircle2 className="h-3 w-3" />
                                Active
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-3 mt-1">
                            <span className="text-xs text-muted-foreground truncate">{org.slug}</span>
                          </div>
                        </div>
                      </div>

                      {/* Right side: Role badge + Arrow */}
                      <div className="flex items-center gap-3 shrink-0">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold border ${roleColor}`}
                        >
                          <Shield className="h-3 w-3" />
                          {role}
                        </span>
                        <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition" />
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Workspace count for active org */}
        {activeOrganization && (
          <div className="mt-6 animate-slide-up" style={{ animationDelay: "200ms" }}>
            <div className="bg-card border border-border rounded-2xl p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                  <Users className="h-3.5 w-3.5" />
                  Workspaces in {activeOrganization.name}
                </h3>
                <span className="text-xs font-semibold text-muted-foreground">{workspaces.length} total</span>
              </div>
              {loadingWorkspaces ? (
                <div className="space-y-2">
                  {[1, 2].map((i) => (
                    <div key={i} className="h-10 bg-muted rounded-lg animate-pulse-skeleton" />
                  ))}
                </div>
              ) : workspaces.length === 0 ? (
                <p className="text-xs text-muted-foreground">No workspaces created yet.</p>
              ) : (
                <div className="space-y-2">
                  {workspaces.map((ws) => (
                    <div
                      key={ws.id}
                      className="flex items-center justify-between p-3 bg-background border border-border rounded-xl"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-foreground truncate">{ws.name}</p>
                        <p className="text-[11px] text-muted-foreground truncate">
                          {ws.description || "No description"}
                        </p>
                      </div>
                      <span className="text-[10px] text-muted-foreground shrink-0">
                        {new Date(ws.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Create Workspace Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
          <div className="bg-card border border-border rounded-2xl shadow-2xl p-6 w-full max-w-md animate-slide-up">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold text-foreground">Create New Workspace</h3>
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setCreateError(null);
                }}
                className="p-1 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {createError && (
              <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-600 rounded-xl px-3 py-2.5 text-xs mb-4">
                <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                <span>{createError}</span>
              </div>
            )}

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label htmlFor="workspace-name" className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  Workspace Name
                </label>
                <input
                  id="workspace-name"
                  type="text"
                  value={newOrgName}
                  onChange={(e) => setNewOrgName(e.target.value)}
                  placeholder="e.g. Engineering Team"
                  autoComplete="off"
                  className="w-full bg-background border border-input rounded-xl px-3.5 py-2.5 text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition"
                />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="workspace-description" className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  Description (optional)
                </label>
                <input
                  id="workspace-description"
                  type="text"
                  value={newOrgSlug}
                  onChange={(e) => setNewOrgSlug(e.target.value)}
                  placeholder="e.g. Core backend and infra projects"
                  autoComplete="off"
                  className="w-full bg-background border border-input rounded-xl px-3.5 py-2.5 text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition"
                />
              </div>
              <button
                onClick={handleCreateWorkspace}
                disabled={!newOrgName.trim() || createWorkspaceMutation.isPending}
                className="w-full py-2.5 bg-primary hover:bg-primary/90 disabled:opacity-60 text-primary-foreground font-bold text-sm rounded-xl transition shadow-lg shadow-primary/15 flex items-center justify-center gap-2"
              >
                <Plus className="h-4 w-4" />
                {createWorkspaceMutation.isPending ? "Creating..." : "Create Workspace"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
