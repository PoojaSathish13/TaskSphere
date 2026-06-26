"use client";

import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/infrastructure/api/api-client";
import { useAuthorization } from "@/features/rbac/hooks/useAuthorization";
import { TaskCommentThread } from "./TaskCommentThread";
import { 
  MessageSquare, 
  Paperclip, 
  Tag, 
  Activity, 
  Plus, 
  CheckSquare, 
  Square,
  CornerDownRight,
  Send,
  X,
  FileText,
  User,
  Calendar,
  AlertCircle,
  Clock
} from "lucide-react";

interface LabelItem {
  id: string;
  name: string;
  color: string;
}

interface CommentItem {
  id: string;
  user_email: string;
  user_name: string;
  content: string;
  created_at: string;
}

interface AttachmentItem {
  id: string;
  filename: string;
  file: string;
  uploaded_by_email: string;
  uploaded_at: string;
}

interface ActivityLogItem {
  id: string;
  user_email: string;
  field_changed: string;
  old_value: string | null;
  new_value: string | null;
  timestamp: string;
}

interface TaskDetail {
  id: string;
  title: string;
  description: string;
  priority: string;
  status: string;
  estimated_hours: string;
  due_date: string | null;
  parent: string | null;
  subtasks?: TaskDetail[];
  labels: LabelItem[];
}

interface TaskManagementPanelProps {
  taskId: string;
  onClose?: () => void;
}

export const TaskManagementPanel: React.FC<TaskManagementPanelProps> = ({ taskId, onClose }) => {
  const queryClient = useQueryClient();
  const { hasPermission } = useAuthorization();
  const canEdit = hasPermission("TASK_EDIT");

  const [activeTab, setActiveTab] = useState<"subtasks" | "comments" | "attachments" | "labels" | "logs">("subtasks");
  
  // Local state for interactive actions
  const [subtaskTitle, setSubtaskTitle] = useState("");
  const [commentContent, setCommentContent] = useState("");
  const [newLabelName, setNewLabelName] = useState("");
  const [newLabelColor, setNewLabelColor] = useState("#6366F1");

  // Query: Fetch Task Details
  const taskQuery = useQuery<TaskDetail>({
    queryKey: ["task-details", taskId],
    queryFn: async () => {
      const res = await apiClient.get(`/api/v1/planner/tasks/${taskId}/`);
      return res.data.data;
    }
  });

  // Query: Fetch all tasks for subtask picker or reference
  const allTasksQuery = useQuery<TaskDetail[]>({
    queryKey: ["planner-all-tasks"],
    queryFn: async () => {
      const res = await apiClient.get("/api/v1/planner/tasks/");
      return res.data.data || [];
    }
  });

  // Query: Fetch Labels list
  const labelsQuery = useQuery<LabelItem[]>({
    queryKey: ["task-labels", taskId],
    queryFn: async () => {
      const res = await apiClient.get("/api/v1/tasks/labels/");
      return res.data.data || [];
    }
  });

  // Query: Fetch Comments list
  const commentsQuery = useQuery<CommentItem[]>({
    queryKey: ["task-comments", taskId],
    queryFn: async () => {
      const res = await apiClient.get(`/api/v1/tasks/comments/?task=${taskId}`);
      return res.data.data || [];
    }
  });

  // Query: Fetch Attachments list
  const attachmentsQuery = useQuery<AttachmentItem[]>({
    queryKey: ["task-attachments", taskId],
    queryFn: async () => {
      const res = await apiClient.get(`/api/v1/tasks/attachments/?task=${taskId}`);
      return res.data.data || [];
    }
  });

  // Query: Fetch Activity logs
  const logsQuery = useQuery<ActivityLogItem[]>({
    queryKey: ["task-logs", taskId],
    queryFn: async () => {
      const res = await apiClient.get(`/api/v1/tasks/activity-logs/?task=${taskId}`);
      return res.data.data || [];
    }
  });

  // --- Mutations ---
  
  // Status Update
  const updateStatusMutation = useMutation({
    mutationFn: async (status: string) => {
      await apiClient.patch(`/api/v1/planner/tasks/${taskId}/`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["task-details", taskId] });
      queryClient.invalidateQueries({ queryKey: ["task-logs", taskId] });
    }
  });

  // Create Subtask
  const createSubtaskMutation = useMutation({
    mutationFn: async (title: string) => {
      await apiClient.post(`/api/v1/planner/tasks/`, {
        title,
        parent: taskId,
        status: "TODO",
        priority: "MEDIUM",
        estimated_hours: "1.0"
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["task-details", taskId] });
      queryClient.invalidateQueries({ queryKey: ["planner-all-tasks"] });
      setSubtaskTitle("");
    }
  });

  // Create Comment
  const createCommentMutation = useMutation({
    mutationFn: async (content: string) => {
      await apiClient.post(`/api/v1/tasks/comments/`, {
        task: taskId,
        content
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["task-comments", taskId] });
      queryClient.invalidateQueries({ queryKey: ["task-logs", taskId] });
      setCommentContent("");
    }
  });

  // Create & Apply Label
  const createLabelMutation = useMutation({
    mutationFn: async () => {
      const res = await apiClient.post(`/api/v1/tasks/labels/`, {
        name: newLabelName,
        color: newLabelColor
      });
      return res.data.data;
    },
    onSuccess: async (newLabel) => {
      // Link the label to the current task
      const currentLabels = taskQuery.data?.labels.map(l => l.id) || [];
      await apiClient.patch(`/api/v1/planner/tasks/${taskId}/`, {
        labels: [...currentLabels, newLabel.id]
      });
      queryClient.invalidateQueries({ queryKey: ["task-details", taskId] });
      queryClient.invalidateQueries({ queryKey: ["task-labels", taskId] });
      setNewLabelName("");
    }
  });

  // Apply Existing Label Toggle
  const toggleLabelMutation = useMutation({
    mutationFn: async (labelId: string) => {
      const currentLabels = taskQuery.data?.labels.map(l => l.id) || [];
      const updatedLabels = currentLabels.includes(labelId)
        ? currentLabels.filter(id => id !== labelId)
        : [...currentLabels, labelId];
      await apiClient.patch(`/api/v1/planner/tasks/${taskId}/`, {
        labels: updatedLabels
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["task-details", taskId] });
    }
  });

  // Upload Attachment
  const uploadAttachmentMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("task", taskId);
      formData.append("file", file);
      formData.append("filename", file.name);
      await apiClient.post(`/api/v1/tasks/attachments/`, formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["task-attachments", taskId] });
      queryClient.invalidateQueries({ queryKey: ["task-logs", taskId] });
    }
  });

  // --- Subtask completion handler ---
  const handleToggleSubtask = (subtask: TaskDetail) => {
    if (!canEdit) return;
    const newStatus = subtask.status === "DONE" ? "TODO" : "DONE";
    apiClient.patch(`/api/v1/planner/tasks/${subtask.id}/`, { status: newStatus }).then(() => {
      queryClient.invalidateQueries({ queryKey: ["task-details", taskId] });
      queryClient.invalidateQueries({ queryKey: ["planner-all-tasks"] });
    });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      uploadAttachmentMutation.mutate(e.target.files[0]);
    }
  };

  if (taskQuery.isLoading) {
    return <div className="p-6 text-center text-xs text-muted-foreground animate-pulse">Loading task workspace...</div>;
  }

  const task = taskQuery.data;
  if (!task) {
    return <div className="p-6 text-center text-xs text-rose-400">Task details could not be retrieved.</div>;
  }

  // Filter subtasks from all tasks list to ensure accuracy
  const childSubtasks = allTasksQuery.data?.filter(t => t.parent === taskId) || [];

  return (
    <div className="bg-card border rounded-xl overflow-hidden shadow-2xl flex flex-col h-full text-xs">
      {/* Header bar */}
      <div className="p-4 border-b border-border/60 flex justify-between items-start gap-4">
        <div>
          <span className="text-[9px] uppercase font-bold tracking-widest text-indigo-400">Task Workspace</span>
          <h2 className="text-sm font-bold text-foreground mt-0.5">{task.title}</h2>
          {task.description && <p className="text-muted-foreground mt-1 text-[11px] leading-relaxed">{task.description}</p>}
        </div>
        {onClose && (
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition shrink-0 p-1">
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Quick Status Select */}
      <div className="px-4 py-2 border-b border-border/40 bg-muted/10 flex items-center justify-between gap-4">
        <div className="flex items-center gap-1.5">
          <span className="text-muted-foreground font-semibold">Status:</span>
          <select
            id="taskStatusDetail"
            name="taskStatusDetail"
            autoComplete="off"
            aria-label="Status"
            value={task.status}
            onChange={(e) => updateStatusMutation.mutate(e.target.value)}
            disabled={!canEdit}
            className="bg-background border border-border/60 rounded px-1.5 py-0.5 text-[10px] font-semibold focus:outline-none"
          >
            <option value="BACKLOG">Backlog</option>
            <option value="TODO">To Do</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="REVIEW">Under Review</option>
            <option value="DONE">Done</option>
          </select>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 text-muted-foreground">
            <Calendar className="h-3.5 w-3.5" />
            <span className="font-mono">{task.due_date || "No due date"}</span>
          </div>
          <div className="flex items-center gap-1 text-muted-foreground">
            <Clock className="h-3.5 w-3.5" />
            <span className="font-mono">{task.estimated_hours}h</span>
          </div>
        </div>
      </div>

      {/* Tabs list */}
      <div className="flex border-b border-border/40 text-[10px] bg-muted/20">
        <button
          onClick={() => setActiveTab("subtasks")}
          className={`flex-1 py-2 font-bold uppercase tracking-wider border-b-2 text-center transition ${
            activeTab === "subtasks" ? "border-indigo-500 text-indigo-400 bg-card" : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          Subtasks ({childSubtasks.length})
        </button>
        <button
          onClick={() => setActiveTab("comments")}
          className={`flex-1 py-2 font-bold uppercase tracking-wider border-b-2 text-center transition ${
            activeTab === "comments" ? "border-indigo-500 text-indigo-400 bg-card" : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          Comments ({commentsQuery.data?.length || 0})
        </button>
        <button
          onClick={() => setActiveTab("attachments")}
          className={`flex-1 py-2 font-bold uppercase tracking-wider border-b-2 text-center transition ${
            activeTab === "attachments" ? "border-indigo-500 text-indigo-400 bg-card" : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          Attachments ({attachmentsQuery.data?.length || 0})
        </button>
        <button
          onClick={() => setActiveTab("labels")}
          className={`flex-1 py-2 font-bold uppercase tracking-wider border-b-2 text-center transition ${
            activeTab === "labels" ? "border-indigo-500 text-indigo-400 bg-card" : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          Labels ({task.labels.length})
        </button>
        <button
          onClick={() => setActiveTab("logs")}
          className={`flex-1 py-2 font-bold uppercase tracking-wider border-b-2 text-center transition ${
            activeTab === "logs" ? "border-indigo-500 text-indigo-400 bg-card" : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          Audit Logs
        </button>
      </div>

      {/* Main content scroll area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 max-h-[380px]">
        {activeTab === "subtasks" && (
          <div className="space-y-3">
            {/* Subtasks checklist */}
            <div className="space-y-1.5">
              {childSubtasks.length === 0 ? (
                <div className="text-center text-muted-foreground py-6 border border-dashed rounded-lg">
                  No subtasks defined. Create one below to break down work.
                </div>
              ) : (
                childSubtasks.map((sub) => (
                  <div key={sub.id} className="flex items-center gap-2 py-1 pl-1 border-b border-border/20">
                    <button onClick={() => handleToggleSubtask(sub)} className="text-muted-foreground hover:text-indigo-400 transition">
                      {sub.status === "DONE" ? (
                        <CheckSquare className="h-4 w-4 text-emerald-400" />
                      ) : (
                        <Square className="h-4 w-4" />
                      )}
                    </button>
                    <CornerDownRight className="h-3 w-3 text-muted-foreground/60" />
                    <span className={`font-medium ${sub.status === "DONE" ? "line-through text-muted-foreground" : "text-foreground"}`}>
                      {sub.title}
                    </span>
                  </div>
                ))
              )}
            </div>

            {/* Quick add subtask form */}
            {canEdit && (
              <form
                onSubmit={(e) => { e.preventDefault(); if (subtaskTitle.trim()) createSubtaskMutation.mutate(subtaskTitle); }}
                className="flex gap-2 pt-2 border-t border-border/30"
              >
                <input
                  id="newSubtaskTitle"
                  name="newSubtaskTitle"
                  autoComplete="off"
                  aria-label="New subtask checklist item"
                  type="text"
                  placeholder="New subtask checklist item..."
                  value={subtaskTitle}
                  onChange={(e) => setSubtaskTitle(e.target.value)}
                  className="flex-1 bg-muted/20 border border-border rounded px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
                <button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white rounded px-3 flex items-center justify-center transition">
                  <Plus className="h-3.5 w-3.5" />
                </button>
              </form>
            )}
          </div>
        )}

        {activeTab === "comments" && (
          <div className="h-[380px] -mx-4 -mb-4">
            <TaskCommentThread
              taskId={taskId}
              currentUserEmail={typeof window !== "undefined" ? localStorage.getItem("user_email") ?? "" : ""}
            />
          </div>
        )}

        {activeTab === "attachments" && (
          <div className="space-y-3">
            {/* Attachments List */}
            <div className="space-y-2">
              {attachmentsQuery.data?.length === 0 ? (
                <div className="text-center text-muted-foreground py-6">No files uploaded.</div>
              ) : (
                attachmentsQuery.data?.map((file) => (
                  <div key={file.id} className="p-2.5 bg-muted/20 border rounded-lg flex items-center justify-between">
                    <div className="flex items-center gap-2 overflow-hidden">
                      <FileText className="h-4 w-4 text-indigo-400 shrink-0" />
                      <span className="font-semibold truncate text-foreground">{file.filename}</span>
                    </div>
                    <span className="text-[9px] text-muted-foreground font-mono">{file.uploaded_by_email}</span>
                  </div>
                ))
              )}
            </div>

            {/* Upload form button */}
            {canEdit && (
              <div className="pt-2 border-t border-border/35">
                <label htmlFor="taskAttachmentFile" className="flex items-center justify-center border border-dashed rounded-lg border-border/80 hover:bg-muted/10 transition p-4 cursor-pointer">
                  <Paperclip className="h-4 w-4 mr-1.5 text-muted-foreground" />
                  <span className="font-semibold text-muted-foreground">Attach reference document...</span>
                  <input id="taskAttachmentFile" name="taskAttachmentFile" autoComplete="off" type="file" onChange={handleFileUpload} className="hidden" />
                </label>
              </div>
            )}
          </div>
        )}

        {activeTab === "labels" && (
          <div className="space-y-4">
            {/* Active labels list */}
            <div>
              <span className="font-bold text-muted-foreground uppercase text-[9px] tracking-wider">Applied Tags</span>
              <div className="flex flex-wrap gap-1.5 mt-1.5">
                {task.labels.length === 0 ? (
                  <span className="text-muted-foreground">No tags applied yet.</span>
                ) : (
                  task.labels.map(l => (
                    <span
                      key={l.id}
                      className="px-2 py-0.5 rounded text-[10px] font-bold text-white flex items-center gap-1"
                      style={{ backgroundColor: l.color }}
                    >
                      {l.name}
                      {canEdit && (
                        <button onClick={() => toggleLabelMutation.mutate(l.id)} className="hover:text-black transition">
                          <X className="h-3 w-3" />
                        </button>
                      )}
                    </span>
                  ))
                )}
              </div>
            </div>

            {/* Toggle Existing Labels */}
            {labelsQuery.data && labelsQuery.data.length > 0 && (
              <div>
                <span className="font-bold text-muted-foreground uppercase text-[9px] tracking-wider">Workspace Tags</span>
                <div className="flex flex-wrap gap-1.5 mt-1.5">
                  {labelsQuery.data
                    .filter(l => !task.labels.some(tl => tl.id === l.id))
                    .map(l => (
                      <button
                        key={l.id}
                        onClick={() => toggleLabelMutation.mutate(l.id)}
                        className="px-2 py-0.5 rounded border border-border hover:bg-muted/20 text-[10px] font-bold transition flex items-center gap-1"
                      >
                        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: l.color }} />
                        {l.name}
                      </button>
                    ))}
                </div>
              </div>
            )}

            {/* Create new label */}
            {canEdit && (
              <div className="pt-2 border-t border-border/30 space-y-2">
                <span className="font-bold text-muted-foreground uppercase text-[9px] tracking-wider">Create Custom Tag</span>
                <div className="flex gap-2">
                  <input
                    id="newLabelName"
                    name="newLabelName"
                    autoComplete="off"
                    aria-label="Tag name"
                    type="text"
                    placeholder="Tag name..."
                    value={newLabelName}
                    onChange={(e) => setNewLabelName(e.target.value)}
                    className="flex-1 bg-muted/20 border border-border rounded px-2.5 py-1 focus:outline-none"
                  />
                  <input
                    id="newLabelColor"
                    name="newLabelColor"
                    autoComplete="off"
                    aria-label="Tag color"
                    type="color"
                    value={newLabelColor}
                    onChange={(e) => setNewLabelColor(e.target.value)}
                    className="h-7 w-7 bg-transparent border-0 cursor-pointer p-0 shrink-0"
                  />
                  <button
                    onClick={() => { if (newLabelName.trim()) createLabelMutation.mutate(); }}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white rounded px-3 text-[10px] font-bold transition"
                  >
                    Add
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === "logs" && (
          <div className="h-[380px] -mx-4 -mb-4">
            <TaskCommentThread
              taskId={taskId}
              currentUserEmail={typeof window !== "undefined" ? localStorage.getItem("user_email") ?? "" : ""}
            />
          </div>
        )}
      </div>
    </div>
  );
};
