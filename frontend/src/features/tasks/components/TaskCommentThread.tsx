"use client";

import React, { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/infrastructure/api/api-client";
import {
  MessageSquare,
  Send,
  Activity,
  Clock,
  User,
  Edit3,
  Trash2,
  ThumbsUp,
  Reply,
  CheckCircle2,
  Tag,
  ArrowUpDown,
  RefreshCw,
  FileEdit,
  UserPlus,
  AlertCircle,
} from "lucide-react";

// ─── Types ─────────────────────────────────────────────────────────────────

interface CommentItem {
  id: string;
  user_email: string;
  user_name: string;
  content: string;
  created_at: string;
}

interface ActivityLogItem {
  id: string;
  user_email: string;
  field_changed: string;
  old_value: string | null;
  new_value: string | null;
  timestamp: string;
}

type ThreadMode = "comments" | "activity" | "all";

// ─── Helpers ────────────────────────────────────────────────────────────────

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

function getActivityIcon(field: string) {
  const f = field.toUpperCase();
  if (f === "COMMENT") return <MessageSquare className="h-3 w-3 text-blue-400" />;
  if (f === "STATUS") return <ArrowUpDown className="h-3 w-3 text-violet-400" />;
  if (f === "ATTACHMENT") return <Tag className="h-3 w-3 text-amber-400" />;
  if (f.includes("ASSIGN")) return <UserPlus className="h-3 w-3 text-emerald-400" />;
  if (f.includes("DUE") || f.includes("DATE")) return <Clock className="h-3 w-3 text-rose-400" />;
  if (f.includes("PRIORITY")) return <AlertCircle className="h-3 w-3 text-orange-400" />;
  return <FileEdit className="h-3 w-3 text-slate-400" />;
}

function getActivityColor(field: string): string {
  const f = field.toUpperCase();
  if (f === "STATUS") return "border-violet-500/40 bg-violet-500/5";
  if (f === "COMMENT") return "border-blue-500/40 bg-blue-500/5";
  if (f === "ATTACHMENT") return "border-amber-500/40 bg-amber-500/5";
  if (f.includes("ASSIGN")) return "border-emerald-500/40 bg-emerald-500/5";
  return "border-border/30 bg-muted/10";
}

function getAvatarColor(name: string): string {
  const colors = [
    "from-indigo-500 to-purple-600",
    "from-emerald-500 to-teal-600",
    "from-rose-500 to-pink-600",
    "from-amber-500 to-orange-600",
    "from-cyan-500 to-blue-600",
    "from-violet-500 to-indigo-600",
  ];
  const index = name.charCodeAt(0) % colors.length;
  return colors[index];
}

// ─── Avatar ─────────────────────────────────────────────────────────────────

function Avatar({ name, size = "sm" }: { name: string; size?: "sm" | "md" }) {
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
  const gradient = getAvatarColor(name);
  const cls = size === "sm" ? "h-7 w-7 text-[10px]" : "h-9 w-9 text-xs";
  return (
    <div
      className={`${cls} rounded-full bg-gradient-to-br ${gradient} flex items-center justify-center text-white font-bold shrink-0 shadow-sm`}
    >
      {initials || <User className="h-3 w-3" />}
    </div>
  );
}

// ─── Comment Bubble ──────────────────────────────────────────────────────────

function CommentBubble({
  comment,
  isOwn,
  onDelete,
  canDelete,
}: {
  comment: CommentItem;
  isOwn: boolean;
  onDelete: (id: string) => void;
  canDelete: boolean;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      className={`flex gap-2.5 group ${isOwn ? "flex-row-reverse" : ""}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <Avatar name={comment.user_name} />
      <div className={`flex flex-col gap-1 max-w-[75%] ${isOwn ? "items-end" : "items-start"}`}>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-semibold text-foreground">{comment.user_name}</span>
          <span className="text-[9px] text-muted-foreground font-mono">{timeAgo(comment.created_at)}</span>
        </div>
        <div
          className={`relative px-3.5 py-2.5 rounded-2xl text-[11px] leading-relaxed shadow-sm transition-all ${
            isOwn
              ? "bg-gradient-to-br from-indigo-600 to-indigo-700 text-white rounded-tr-sm"
              : "bg-muted/40 border border-border/40 text-foreground rounded-tl-sm"
          }`}
        >
          {comment.content}

          {/* Actions on hover */}
          {hovered && (
            <div
              className={`absolute -top-7 ${isOwn ? "left-0" : "right-0"} flex items-center gap-1 bg-popover border border-border/60 rounded-lg px-1.5 py-1 shadow-lg`}
            >
              <button className="p-0.5 hover:text-blue-400 text-muted-foreground transition" title="React">
                <ThumbsUp className="h-3 w-3" />
              </button>
              <button className="p-0.5 hover:text-emerald-400 text-muted-foreground transition" title="Reply">
                <Reply className="h-3 w-3" />
              </button>
              {canDelete && (
                <button
                  onClick={() => onDelete(comment.id)}
                  className="p-0.5 hover:text-rose-400 text-muted-foreground transition"
                  title="Delete"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Activity Row ────────────────────────────────────────────────────────────

function ActivityRow({ log }: { log: ActivityLogItem }) {
  const userName = log.user_email?.split("@")[0] || "System";

  return (
    <div className={`flex gap-2.5 items-start p-2.5 rounded-xl border ${getActivityColor(log.field_changed)} transition-all`}>
      <div className="h-6 w-6 rounded-full bg-muted/30 border border-border/40 flex items-center justify-center shrink-0 mt-0.5">
        {getActivityIcon(log.field_changed)}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[10px] font-semibold text-foreground">{userName}</span>
          <span className="text-[10px] text-muted-foreground">updated</span>
          <span className="text-[10px] font-medium text-indigo-400 uppercase tracking-wide">
            {log.field_changed.replace(/_/g, " ")}
          </span>
        </div>
        {(log.old_value || log.new_value) && (
          <div className="mt-1 flex items-center gap-2 text-[10px]">
            {log.old_value && (
              <span className="px-1.5 py-0.5 bg-rose-500/10 text-rose-400 rounded font-mono line-through">
                {log.old_value.length > 40 ? log.old_value.slice(0, 40) + "…" : log.old_value}
              </span>
            )}
            {log.old_value && log.new_value && <span className="text-muted-foreground">→</span>}
            {log.new_value && (
              <span className="px-1.5 py-0.5 bg-emerald-500/10 text-emerald-400 rounded font-mono">
                {log.new_value.length > 40 ? log.new_value.slice(0, 40) + "…" : log.new_value}
              </span>
            )}
          </div>
        )}
      </div>
      <span className="text-[9px] text-muted-foreground font-mono shrink-0">{timeAgo(log.timestamp)}</span>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

interface TaskCommentThreadProps {
  taskId: string;
  currentUserEmail?: string;
}

export const TaskCommentThread: React.FC<TaskCommentThreadProps> = ({
  taskId,
  currentUserEmail = "",
}) => {
  const queryClient = useQueryClient();
  const [mode, setMode] = useState<ThreadMode>("comments");
  const [draft, setDraft] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // ── Queries ──
  const commentsQuery = useQuery<CommentItem[]>({
    queryKey: ["task-comments", taskId],
    queryFn: async () => {
      const res = await apiClient.get(`/api/v1/tasks/comments/?task=${taskId}`);
      return res.data.data || [];
    },
    refetchInterval: 15000, // poll every 15s as real-time fallback
  });

  const logsQuery = useQuery<ActivityLogItem[]>({
    queryKey: ["task-logs", taskId],
    queryFn: async () => {
      const res = await apiClient.get(`/api/v1/tasks/activity-logs/?task=${taskId}`);
      return res.data.data || [];
    },
    refetchInterval: 30000,
  });

  // ── Mutations ──
  const postCommentMutation = useMutation({
    mutationFn: async (content: string) => {
      const res = await apiClient.post(`/api/v1/tasks/comments/`, { task: taskId, content });
      return res.data.data;
    },
    onMutate: async (content) => {
      // Optimistic update
      await queryClient.cancelQueries({ queryKey: ["task-comments", taskId] });
      const prev = queryClient.getQueryData<CommentItem[]>(["task-comments", taskId]);
      const optimistic: CommentItem = {
        id: `opt-${Date.now()}`,
        user_email: currentUserEmail,
        user_name: currentUserEmail.split("@")[0] || "You",
        content,
        created_at: new Date().toISOString(),
      };
      queryClient.setQueryData<CommentItem[]>(
        ["task-comments", taskId],
        (old) => [...(old || []), optimistic]
      );
      return { prev };
    },
    onError: (_err, _vars, context) => {
      if (context?.prev) {
        queryClient.setQueryData(["task-comments", taskId], context.prev);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["task-comments", taskId] });
      queryClient.invalidateQueries({ queryKey: ["task-logs", taskId] });
    },
    onSettled: () => {
      setDraft("");
    },
  });

  const deleteCommentMutation = useMutation({
    mutationFn: async (commentId: string) => {
      await apiClient.delete(`/api/v1/tasks/comments/${commentId}/`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["task-comments", taskId] });
    },
  });

  // ── Auto-grow textarea ──
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [draft]);

  // ── Scroll to bottom on new comment ──
  useEffect(() => {
    if (mode === "comments") {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [commentsQuery.data?.length, mode]);

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    const trimmed = draft.trim();
    if (!trimmed || postCommentMutation.isPending) return;
    postCommentMutation.mutate(trimmed);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const comments = commentsQuery.data || [];
  const logs = logsQuery.data || [];

  // Merge for "all" mode — sorted by time
  const allItems = [
    ...comments.map((c) => ({ type: "comment" as const, time: c.created_at, data: c })),
    ...logs.map((l) => ({ type: "log" as const, time: l.timestamp, data: l })),
  ].sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());

  return (
    <div className="flex flex-col h-full bg-card border border-border/40 rounded-xl overflow-hidden">
      {/* ── Header ── */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/40 bg-muted/10">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-indigo-400" />
          <span className="text-xs font-bold text-foreground">Activity Thread</span>
          <span className="text-[10px] bg-indigo-500/10 text-indigo-400 px-1.5 py-0.5 rounded-full font-semibold">
            {comments.length} comments
          </span>
        </div>

        {/* Mode switcher */}
        <div className="flex items-center gap-1 bg-muted/30 rounded-lg p-0.5">
          {(["comments", "activity", "all"] as ThreadMode[]).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`px-2.5 py-1 rounded-md text-[10px] font-semibold uppercase tracking-wide transition-all ${
                mode === m
                  ? "bg-card text-indigo-400 shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {m === "all" ? "All" : m === "comments" ? "💬" : "📋"}
            </button>
          ))}
          <button
            onClick={() => {
              commentsQuery.refetch();
              logsQuery.refetch();
            }}
            className="p-1 text-muted-foreground hover:text-foreground transition ml-0.5"
            title="Refresh"
          >
            <RefreshCw className={`h-3 w-3 ${commentsQuery.isFetching ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* ── Feed ── */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {/* Empty states */}
        {mode === "comments" && comments.length === 0 && !commentsQuery.isLoading && (
          <div className="flex flex-col items-center justify-center h-32 text-center gap-2">
            <div className="h-12 w-12 rounded-full bg-indigo-500/10 flex items-center justify-center">
              <MessageSquare className="h-5 w-5 text-indigo-400" />
            </div>
            <p className="text-xs text-muted-foreground">No comments yet.</p>
            <p className="text-[10px] text-muted-foreground">Be the first to leave a note!</p>
          </div>
        )}
        {mode === "activity" && logs.length === 0 && !logsQuery.isLoading && (
          <div className="flex flex-col items-center justify-center h-32 text-center gap-2">
            <div className="h-12 w-12 rounded-full bg-violet-500/10 flex items-center justify-center">
              <Activity className="h-5 w-5 text-violet-400" />
            </div>
            <p className="text-xs text-muted-foreground">No activity logged yet.</p>
          </div>
        )}

        {/* Loading skeleton */}
        {(commentsQuery.isLoading || logsQuery.isLoading) && (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex gap-2.5 animate-pulse">
                <div className="h-7 w-7 rounded-full bg-muted/40 shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-2.5 w-24 bg-muted/40 rounded" />
                  <div className="h-8 w-full bg-muted/30 rounded-xl" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Comments mode */}
        {mode === "comments" &&
          comments.map((comment) => (
            <CommentBubble
              key={comment.id}
              comment={comment}
              isOwn={comment.user_email === currentUserEmail}
              canDelete={comment.user_email === currentUserEmail}
              onDelete={(id) => deleteCommentMutation.mutate(id)}
            />
          ))}

        {/* Activity mode */}
        {mode === "activity" &&
          logs.map((log) => <ActivityRow key={log.id} log={log} />)}

        {/* All combined mode */}
        {mode === "all" &&
          allItems.map((item) =>
            item.type === "comment" ? (
              <CommentBubble
                key={`c-${item.data.id}`}
                comment={item.data as CommentItem}
                isOwn={(item.data as CommentItem).user_email === currentUserEmail}
                canDelete={(item.data as CommentItem).user_email === currentUserEmail}
                onDelete={(id) => deleteCommentMutation.mutate(id)}
              />
            ) : (
              <ActivityRow key={`l-${item.data.id}`} log={item.data as ActivityLogItem} />
            )
          )}

        <div ref={bottomRef} />
      </div>

      {/* ── Comment Input ── */}
      <div className="border-t border-border/40 p-3 bg-muted/5">
        <form onSubmit={handleSubmit}>
          <div
            className={`flex items-end gap-2 bg-background border rounded-xl px-3 py-2 transition-all ${
              isFocused ? "border-indigo-500/70 shadow-[0_0_0_2px_rgba(99,102,241,0.15)]" : "border-border/50"
            }`}
          >
            <div className="shrink-0 pb-0.5">
              <div className="h-6 w-6 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                <User className="h-3 w-3 text-white" />
              </div>
            </div>
            <textarea
              ref={textareaRef}
              id={`comment-input-${taskId}`}
              name="comment"
              rows={1}
              placeholder="Add a comment… (Enter to send, Shift+Enter for new line)"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={handleKeyDown}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              className="flex-1 bg-transparent text-[11px] text-foreground placeholder:text-muted-foreground resize-none focus:outline-none leading-relaxed min-h-[24px]"
            />
            <button
              type="submit"
              disabled={!draft.trim() || postCommentMutation.isPending}
              className={`shrink-0 h-7 w-7 rounded-lg flex items-center justify-center transition-all ${
                draft.trim() && !postCommentMutation.isPending
                  ? "bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm"
                  : "bg-muted/30 text-muted-foreground cursor-not-allowed"
              }`}
            >
              {postCommentMutation.isPending ? (
                <RefreshCw className="h-3 w-3 animate-spin" />
              ) : (
                <Send className="h-3 w-3" />
              )}
            </button>
          </div>
          <div className="flex items-center justify-between mt-1.5 px-1">
            <span className="text-[9px] text-muted-foreground">
              💡 <strong>Enter</strong> to send · <strong>Shift+Enter</strong> for new line
            </span>
            {draft.length > 0 && (
              <span className={`text-[9px] font-mono ${draft.length > 800 ? "text-rose-400" : "text-muted-foreground"}`}>
                {draft.length}/1000
              </span>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};
