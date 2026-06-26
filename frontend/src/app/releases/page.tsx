"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { apiClient } from "@/infrastructure/api/api-client";
import { ProtectedRoute } from "@/features/rbac/components/ProtectedRoute";
import { useAuthStore } from "@/infrastructure/store/auth-store";
import { 
  CheckCircle, 
  AlertCircle, 
  X, 
  Plus, 
  Calendar, 
  Tag, 
  Clock, 
  Building,
  Sliders,
  FileText
} from "lucide-react";

interface ProjectItem {
  id: string;
  name: string;
}

interface ReleaseItem {
  id: string;
  project: string;
  project_name: string;
  version: string;
  release_date: string | null;
  status: "PLANNING" | "BETA" | "RELEASED";
  notes: string;
  created_at: string;
}

interface ReleaseInput {
  project: string;
  version: string;
  release_date: string;
  status: "PLANNING" | "BETA" | "RELEASED";
  notes: string;
}

export default function ReleasesPage() {
  const queryClient = useQueryClient();
  const { activeOrganizationId } = useAuthStore();
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // 1. Query: Projects (for selector dropdown)
  const { data: projects = [] } = useQuery<ProjectItem[]>({
    queryKey: ["projects", activeOrganizationId],
    queryFn: async () => {
      const res = await apiClient.get("/api/v1/timesheets/projects/");
      const payload = res.data?.data ?? res.data;
      return Array.isArray(payload) ? payload : [];
    },
    enabled: !!activeOrganizationId,
  });

  // 2. Query: Releases
  const { data: releases = [], isLoading } = useQuery<ReleaseItem[]>({
    queryKey: ["client-releases", activeOrganizationId],
    queryFn: async () => {
      const res = await apiClient.get("/api/v1/client/releases/");
      const payload = res.data?.data ?? res.data;
      return Array.isArray(payload) ? payload : [];
    },
    enabled: !!activeOrganizationId,
  });

  // 3. Form
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ReleaseInput>({
    defaultValues: {
      project: "",
      version: "",
      release_date: new Date().toISOString().split("T")[0],
      status: "PLANNING",
      notes: ""
    }
  });

  // 4. Mutation: Create Release
  const createReleaseMutation = useMutation({
    mutationFn: async (data: ReleaseInput) => {
      const res = await apiClient.post("/api/v1/client/releases/", data);
      return res.data;
    },
    onSuccess: () => {
      showToast("Release registered successfully.", "success");
      setIsModalOpen(false);
      reset();
      queryClient.invalidateQueries({ queryKey: ["client-releases"] });
    },
    onError: (err: any) => {
      const errMsg = err.response?.data?.[0] || err.message || "Failed to create release.";
      showToast(errMsg, "error");
    }
  });

  const onSubmit = (data: ReleaseInput) => {
    createReleaseMutation.mutate(data);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "RELEASED":
        return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
      case "BETA":
        return "bg-sky-500/10 text-sky-400 border-sky-500/20";
      default:
        return "bg-amber-500/10 text-amber-400 border-amber-500/20";
    }
  };

  return (
    <ProtectedRoute>
      <div className="p-6 space-y-6 max-w-6xl mx-auto text-foreground select-none relative">
        
        {/* Toast */}
        {toast && (
          <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-xl border text-xs font-semibold shadow-xl animate-slide-up ${
            toast.type === "success" 
              ? "bg-emerald-500/10 border-emerald-500/25 text-emerald-400" 
              : "bg-rose-500/10 border-rose-500/25 text-rose-400"
          }`}>
            {toast.type === "success" ? <CheckCircle className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
            <span>{toast.message}</span>
          </div>
        )}

        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#2d2d34]/60 pb-4">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-white flex items-center gap-2.5">
              <Tag className="h-6 w-6 text-indigo-500" />
              <span>Project Releases</span>
            </h1>
            <p className="text-xs text-[#8e8e95] mt-1 leading-relaxed">
              Track version releases, planning milestones, and beta branches visible to external clients.
            </p>
          </div>

          <button
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center gap-1.5 py-2 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-lg transition shadow-md shadow-indigo-600/15"
          >
            <Plus className="h-4 w-4" />
            <span>Create Release</span>
          </button>
        </div>

        {/* Table list */}
        {isLoading ? (
          <div className="space-y-4 animate-pulse">
            {[1, 2].map(n => (
              <div key={n} className="h-16 bg-[#1c1c1f]/40 border border-[#2d2d34]/60 rounded-xl" />
            ))}
          </div>
        ) : releases.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 bg-[#1c1c1f]/30 border border-[#2d2d34]/40 border-dashed rounded-2xl text-center space-y-4">
            <Tag className="h-10 w-10 text-muted-foreground animate-pulse" />
            <div>
              <p className="text-sm font-semibold text-white">No releases logged</p>
              <p className="text-xs text-muted-foreground mt-1">Start by recording your project versions or deployment milestones.</p>
            </div>
            <button
              onClick={() => setIsModalOpen(true)}
              className="py-1.5 px-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-lg transition"
            >
              Log Release
            </button>
          </div>
        ) : (
          <div className="bg-[#1c1c1f]/40 border border-[#2d2d34]/60 rounded-2xl overflow-hidden shadow">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="bg-[#1c1c1f] border-b border-[#2d2d34]/60 text-[10px] font-bold uppercase tracking-wider text-[#8e8e95]">
                  <th className="p-4">Project</th>
                  <th className="p-4">Version</th>
                  <th className="p-4">Release Date</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Scope Details / Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#2d2d34]/40 text-xs">
                {releases.map((rel) => (
                  <tr key={rel.id} className="hover:bg-muted/10 transition">
                    <td className="p-4 font-bold text-white flex items-center gap-2">
                      <Building className="h-3.5 w-3.5 text-indigo-400 shrink-0" />
                      <span className="truncate max-w-[150px]">{rel.project_name}</span>
                    </td>
                    <td className="p-4 font-mono font-bold text-indigo-300">{rel.version}</td>
                    <td className="p-4 text-muted-foreground">
                      {rel.release_date ? new Date(rel.release_date).toLocaleDateString() : "TBD"}
                    </td>
                    <td className="p-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${getStatusColor(rel.status)}`}>
                        {rel.status}
                      </span>
                    </td>
                    <td className="p-4 text-[#8e8e95] truncate max-w-xs">{rel.notes || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Modal */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="w-full max-w-md bg-[#161618] border border-[#2d2d34]/80 p-6 rounded-2xl shadow-2xl animate-scale-up space-y-4">
              <div className="flex items-center justify-between border-b border-[#2d2d34]/40 pb-3">
                <h3 className="font-extrabold text-sm text-white uppercase tracking-wider flex items-center gap-2">
                  <Sliders className="h-4.5 w-4.5 text-indigo-500" />
                  <span>Configure Release</span>
                </h3>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="p-1 hover:bg-[#2d2d34]/60 rounded-lg text-muted-foreground hover:text-foreground transition"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div className="space-y-1">
                  <label htmlFor="release-project-select" className="text-[10px] font-bold uppercase tracking-wider text-[#8e8e95]">Select Project</label>
                  <select
                    id="release-project-select"
                    {...register("project", { required: "Project is required" })}
                    autoComplete="off"
                    className="w-full bg-[#121214] border border-[#1f1f23] rounded-lg p-2.5 text-xs text-white focus:outline-none"
                  >
                    <option value="">Select Target...</option>
                    {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                  {errors.project && <p className="text-[10px] text-rose-400 mt-1">{errors.project.message}</p>}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label htmlFor="release-version-input" className="text-[10px] font-bold uppercase tracking-wider text-[#8e8e95]">Version</label>
                    <input
                      id="release-version-input"
                      type="text"
                      {...register("version", { required: "Version code is required" })}
                      placeholder="e.g. v1.2.0"
                      autoComplete="off"
                      className="w-full bg-[#121214] border border-[#1f1f23] rounded-lg p-2.5 text-xs text-white focus:outline-none"
                    />
                    {errors.version && <p className="text-[10px] text-rose-400 mt-1">{errors.version.message}</p>}
                  </div>

                  <div className="space-y-1">
                    <label htmlFor="release-date-input" className="text-[10px] font-bold uppercase tracking-wider text-[#8e8e95]">Release Date</label>
                    <input
                      id="release-date-input"
                      type="date"
                      {...register("release_date")}
                      autoComplete="off"
                      className="w-full bg-[#121214] border border-[#1f1f23] rounded-lg p-2.5 text-xs text-white focus:outline-none"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label htmlFor="release-status-select" className="text-[10px] font-bold uppercase tracking-wider text-[#8e8e95]">Deployment Status</label>
                  <select
                    id="release-status-select"
                    {...register("status")}
                    autoComplete="off"
                    className="w-full bg-[#121214] border border-[#1f1f23] rounded-lg p-2.5 text-xs text-white focus:outline-none"
                  >
                    <option value="PLANNING">Planning</option>
                    <option value="BETA">Beta Test</option>
                    <option value="RELEASED">Released / Production</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label htmlFor="release-notes-textarea" className="text-[10px] font-bold uppercase tracking-wider text-[#8e8e95]">Release Notes</label>
                  <textarea
                    id="release-notes-textarea"
                    rows={3}
                    {...register("notes")}
                    placeholder="Changelog details, fix lists, infrastructure details..."
                    autoComplete="off"
                    className="w-full bg-[#121214] border border-[#1f1f23] rounded-lg p-2.5 text-xs text-white focus:outline-none resize-none"
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 py-2 bg-[#212124] hover:bg-[#2c2c31] border border-[#2d2d34]/60 text-white text-xs font-bold rounded-lg transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={createReleaseMutation.isPending}
                    className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg transition disabled:opacity-50"
                  >
                    {createReleaseMutation.isPending ? "Creating..." : "Save Release"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      </div>
    </ProtectedRoute>
  );
}
