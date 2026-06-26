"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/infrastructure/api/api-client";
import { ProtectedRoute } from "@/features/rbac/components/ProtectedRoute";
import { useAuthStore } from "@/infrastructure/store/auth-store";
import { 
  Bell, 
  Check, 
  Clock, 
  ShieldAlert, 
  AlertTriangle,
  UserPlus,
  ClipboardList,
  AlertCircle,
  Inbox,
  CheckCircle,
  Eye,
  Settings,
  Mail,
  Trash2,
  Calendar,
  X,
  Sliders,
  ChevronRight
} from "lucide-react";

// 4 Requested Modules
type NotificationModule =
  | "all"
  | "mentions"
  | "approvals"
  | "settings";

const moduleLabels: Record<NotificationModule, string> = {
  all: "All Notifications",
  mentions: "Mentions",
  approvals: "Approvals",
  settings: "Settings",
};

interface NotificationItem {
  id: string;
  verb: string;
  description: string;
  is_read: boolean;
  data: any;
  created_at: string;
}

export default function NotificationsPage() {
  const queryClient = useQueryClient();
  const { activeOrganizationId } = useAuthStore();

  const [activeModule, setActiveModule] = useState<NotificationModule>("all");
  
  // Selected notification for the Notification Detail screen
  const [selectedNotification, setSelectedNotification] = useState<NotificationItem | null>(null);

  // Stateful preferences mock
  const [preferences, setPreferences] = useState({
    emailTasks: true,
    pushTasks: true,
    emailSLA: true,
    pushSLA: true,
    emailBlockers: true,
    pushBlockers: true,
    digest: "instant"
  });

  // Local notifications
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Query: Fetch notifications
  const { data: notifications = [], isLoading } = useQuery<NotificationItem[]>({
    queryKey: ["global-notifications", activeOrganizationId],
    queryFn: async () => {
      const res = await apiClient.get("/api/v1/notifications/");
      return res.data.data || res.data || [];
    }
  });

  // Mutation: Mark notification as read
  const markReadMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiClient.post(`/api/v1/notifications/${id}/mark-read/`);
      return res.data;
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ["global-notifications"] });
      // Sync active selection details if visible
      if (selectedNotification?.id === id) {
        setSelectedNotification(prev => prev ? { ...prev, is_read: true } : null);
      }
    },
    onError: () => {
      showToast("Failed to update notification status", "error");
    }
  });

  // Mutation: Bulk Mark all as read
  const markAllReadMutation = useMutation({
    mutationFn: async (unreadIds: string[]) => {
      const promises = unreadIds.map(id => apiClient.post(`/api/v1/notifications/${id}/mark-read/`));
      await Promise.all(promises);
    },
    onSuccess: () => {
      showToast("All notifications marked as read", "success");
      queryClient.invalidateQueries({ queryKey: ["global-notifications"] });
      if (selectedNotification) {
        setSelectedNotification(prev => prev ? { ...prev, is_read: true } : null);
      }
    },
    onError: () => {
      showToast("Failed to update all notifications", "error");
    }
  });

  // Resolve category checks for custom layouts
  const getNotificationCategory = (item: NotificationItem): "mentions" | "approvals" | "general" => {
    const text = (item.verb + " " + (item.description || "")).toLowerCase();
    if (text.includes("approval") || text.includes("approved") || text.includes("rejected") || text.includes("review")) {
      return "approvals";
    }
    if (text.includes("@") || text.includes("mention") || text.includes("mentioned") || text.includes("assigned you")) {
      return "mentions";
    }
    return "general";
  };

  const getCategoryStyles = (item: NotificationItem) => {
    const category = getNotificationCategory(item);
    switch (category) {
      case "approvals":
        return {
          icon: <ClipboardList className="h-4.5 w-4.5" />,
          bgColor: "bg-purple-500/10",
          textColor: "text-purple-400",
          borderColor: "border-purple-500/20"
        };
      case "mentions":
        return {
          icon: <UserPlus className="h-4.5 w-4.5" />,
          bgColor: "bg-indigo-500/10",
          textColor: "text-indigo-400",
          borderColor: "border-indigo-500/20"
        };
      default:
        const text = (item.verb + " " + (item.description || "")).toLowerCase();
        if (text.includes("blocker") || text.includes("blocked") || text.includes("risk")) {
          return {
            icon: <AlertTriangle className="h-4.5 w-4.5" />,
            bgColor: "bg-rose-500/10",
            textColor: "text-rose-400",
            borderColor: "border-rose-500/20"
          };
        }
        return {
          icon: <Bell className="h-4.5 w-4.5" />,
          bgColor: "bg-gray-500/10",
          textColor: "text-gray-400",
          borderColor: "border-gray-500/20"
        };
    }
  };

  // Filter list by active module
  const filteredNotifications = notifications.filter(item => {
    if (activeModule === "all") return true;
    if (activeModule === "settings") return false;
    
    const cat = getNotificationCategory(item);
    return cat === activeModule;
  });

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const handleMarkAllRead = () => {
    const unreadIds = notifications.filter(n => !n.is_read).map(n => n.id);
    if (unreadIds.length === 0) {
      showToast("No unread notifications to clear", "success");
      return;
    }
    markAllReadMutation.mutate(unreadIds);
  };

  const handleSavePreferences = (e: React.FormEvent) => {
    e.preventDefault();
    showToast("Preferences saved successfully", "success");
  };

  return (
    <ProtectedRoute>
      <div className="p-6 space-y-6 max-w-6xl mx-auto text-foreground select-none relative pb-20">
        
        {/* Toast Alert */}
        {toast && (
          <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-xl border text-xs font-semibold shadow-xl bg-[#121214] ${
            toast.type === "success" 
              ? "border-emerald-500/25 text-emerald-400" 
              : "border-rose-500/25 text-rose-400"
          }`}>
            {toast.type === "success" ? <CheckCircle className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
            <span>{toast.message}</span>
          </div>
        )}

        {/* Top Header Row */}
        <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-[#2d2d34]/60 pb-5 gap-4">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-white flex items-center gap-2.5">
              <Bell className="h-6 w-6 text-indigo-500" />
              <span>Workspace Notifications</span>
            </h1>
            <p className="text-xs text-[#8e8e95] mt-1 leading-relaxed">
              Consolidated notification inbox, @mentions, milestone approvals requests, and alert preference settings.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {activeModule !== "settings" && unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                disabled={markAllReadMutation.isPending}
                className="flex items-center gap-1.5 px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition"
              >
                <Check className="h-3.5 w-3.5" />
                <span>Mark All as Read</span>
              </button>
            )}
          </div>
        </div>

        {/* Modules Tab Bar */}
        <div className="bg-[#1c1c1f] p-1.5 border border-[#2d2d34]/60 rounded-2xl flex gap-1 overflow-x-auto max-w-full no-scrollbar">
          {(["all", "mentions", "approvals", "settings"] as NotificationModule[]).map((mod) => (
            <button
              key={mod}
              onClick={() => setActiveModule(mod)}
              className={`py-1.5 px-3.5 rounded-xl text-[10px] font-bold uppercase tracking-wider shrink-0 transition ${
                activeModule === mod
                  ? "bg-indigo-600 text-white shadow-md"
                  : "text-[#8e8e95] hover:text-white hover:bg-zinc-800/50"
              }`}
            >
              {moduleLabels[mod]}
              {mod !== "settings" && mod === "all" && unreadCount > 0 && (
                <span className="ml-1.5 bg-rose-500 text-white text-[8px] px-1.5 py-0.25 rounded-full font-black">
                  {unreadCount}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ------------------------------------------------------------- */}
        {/* MODULES 1, 2, 3: Notification Inbox Screen                    */}
        {/* ------------------------------------------------------------- */}
        {activeModule !== "settings" && (
          <div className="space-y-6">
            
            {/* Screen Header */}
            <div className="flex flex-col gap-1 border-b border-[#2d2d34]/40 pb-3">
              <h2 className="text-lg font-black text-white">Notification Inbox</h2>
              <p className="text-xs text-[#8e8e95]">Manage active updates feed, system alerts, and reviews requests</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              
              {/* Inbox lists feed */}
              <div className="lg:col-span-8 space-y-3">
                {isLoading ? (
                  <div className="text-center py-10 text-xs animate-pulse text-muted-foreground">Loading inbox feed...</div>
                ) : filteredNotifications.length === 0 ? (
                  <div className="p-12 text-center text-xs text-muted-foreground border border-dashed border-[#2d2d34]/40 rounded-2xl flex flex-col justify-center items-center gap-2.5 h-44">
                    <Inbox className="h-8 w-8 text-[#2d2d34]" />
                    <span>No notifications match selected filters inbox.</span>
                  </div>
                ) : (
                  filteredNotifications.map((item) => {
                    const styles = getCategoryStyles(item);
                    return (
                      <div
                        key={item.id}
                        onClick={() => setSelectedNotification(item)}
                        className={`p-3.5 rounded-xl border text-xs flex justify-between items-center gap-4 transition cursor-pointer ${
                          item.is_read 
                            ? "bg-[#1c1c1f]/20 border-[#2d2d34]/40 text-[#8e8e95]" 
                            : "bg-[#1c1c1f]/50 border-indigo-500/20 text-white shadow-sm"
                        }`}
                      >
                        <div className="flex items-start gap-3.5 pr-2 truncate">
                          <div className={`p-2 rounded-lg shrink-0 border ${styles.bgColor} ${styles.textColor} ${styles.borderColor}`}>
                            {styles.icon}
                          </div>

                          <div className="space-y-0.5 truncate">
                            <span className="font-extrabold text-white text-sm block truncate">
                              {item.verb}
                            </span>
                            <span className="text-[9px] text-[#8e8e95] font-mono block">
                              {new Date(item.created_at).toLocaleString()}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 shrink-0">
                          {!item.is_read && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                markReadMutation.mutate(item.id);
                              }}
                              className="p-1 border border-indigo-500/25 bg-indigo-500/5 hover:bg-indigo-500/10 text-indigo-400 rounded transition"
                              title="Mark read"
                            >
                              <Check className="h-3.5 w-3.5" />
                            </button>
                          )}
                          <ChevronRight className="h-4 w-4 text-[#8e8e95]" />
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* SCREEN 2: NOTIFICATION DETAIL SCREEN */}
              <div className="lg:col-span-4 bg-[#1c1c1f]/40 border border-[#2d2d34]/60 p-5 rounded-2xl space-y-4">
                <div className="border-b border-[#2d2d34]/40 pb-2 flex justify-between items-center">
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider">Notification Detail</h3>
                  {selectedNotification && (
                    <button
                      onClick={() => setSelectedNotification(null)}
                      className="text-[10px] text-[#8e8e95] hover:text-white transition"
                    >
                      Close
                    </button>
                  )}
                </div>

                {!selectedNotification ? (
                  <div className="text-center text-[10px] text-[#8e8e95] py-12 border border-dashed border-[#2d2d34]/40 rounded-xl">
                    Select a notification log entry from your inbox feed to inspect detail metrics.
                  </div>
                ) : (
                  <div className="space-y-4 text-xs">
                    <div className="space-y-2 bg-[#121214]/60 border border-[#1f1f23] p-3 rounded-lg">
                      <div className="flex justify-between items-center">
                        <span className="text-[9px] text-[#8e8e95] uppercase font-bold">Status</span>
                        <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded border uppercase ${
                          selectedNotification.is_read ? "bg-zinc-800 text-zinc-400 border-transparent" : "bg-indigo-500/5 border-indigo-500/20 text-indigo-400"
                        }`}>
                          {selectedNotification.is_read ? "Read" : "Unread"}
                        </span>
                      </div>

                      <div className="flex justify-between text-[10px] text-[#8e8e95] font-mono pt-1">
                        <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" /> Date Time:</span>
                        <span className="text-white">{new Date(selectedNotification.created_at).toLocaleString()}</span>
                      </div>
                    </div>

                    <div className="space-y-1.5 bg-[#121214]/60 border border-[#1f1f23] p-3 rounded-lg">
                      <span className="text-[9px] text-[#8e8e95] uppercase font-bold block">Activity Verb</span>
                      <p className="font-extrabold text-sm text-white">{selectedNotification.verb}</p>
                    </div>

                    {selectedNotification.description && (
                      <div className="space-y-1.5 bg-[#121214]/60 border border-[#1f1f23] p-3 rounded-lg">
                        <span className="text-[9px] text-[#8e8e95] uppercase font-bold block">Audit Details</span>
                        <p className="text-[#8e8e95] leading-relaxed italic text-[11px]">
                          "{selectedNotification.description}"
                        </p>
                      </div>
                    )}

                    {!selectedNotification.is_read && (
                      <button
                        onClick={() => markReadMutation.mutate(selectedNotification.id)}
                        className="w-full py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded font-bold transition text-center"
                      >
                        Mark as Read
                      </button>
                    )}
                  </div>
                )}
              </div>

            </div>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* MODULE 4: SETTINGS -> Notification Preferences Screen         */}
        {/* ------------------------------------------------------------- */}
        {activeModule === "settings" && (
          <div className="max-w-md mx-auto space-y-6">
            
            {/* Screen Header */}
            <div className="flex flex-col gap-1 border-b border-[#2d2d34]/40 pb-3">
              <h2 className="text-lg font-black text-white">Notification Preferences</h2>
              <p className="text-xs text-[#8e8e95]">Manage workspace alert channels, email routing rules, and push limits</p>
            </div>

            <div className="bg-[#1c1c1f]/40 border border-[#2d2d34]/60 p-6 rounded-2xl">
              <form onSubmit={handleSavePreferences} className="space-y-5 text-xs">
                
                <h3 className="font-extrabold text-xs text-white uppercase tracking-wider border-b border-[#2d2d34]/40 pb-2 flex items-center gap-1.5">
                  <Sliders className="h-4 w-4 text-indigo-400" />
                  <span>Channel Configurations</span>
                </h3>

                <div className="space-y-4">
                  {/* Task assignments */}
                  <div className="flex items-center justify-between bg-[#121214]/40 p-3 border border-[#1f1f23] rounded-xl">
                    <div className="space-y-0.5">
                      <span className="font-bold text-white block">Task Assignments</span>
                      <span className="text-[9px] text-[#8e8e95] block">Alert when a new task is assigned to you</span>
                    </div>

                     <div className="flex gap-3">
                      <label htmlFor="notify-email-tasks" className="flex items-center gap-1 font-semibold text-white cursor-pointer select-none">
                        <input
                          id="notify-email-tasks"
                          name="notify-email-tasks"
                          type="checkbox"
                          checked={preferences.emailTasks}
                          onChange={(e) => setPreferences(prev => ({ ...prev, emailTasks: e.target.checked }))}
                          autoComplete="off"
                          className="rounded border-[#2d2d34] text-indigo-600 bg-[#121214]"
                        />
                        <span>Email</span>
                      </label>
                      <label htmlFor="notify-push-tasks" className="flex items-center gap-1 font-semibold text-white cursor-pointer select-none">
                        <input
                          id="notify-push-tasks"
                          name="notify-push-tasks"
                          type="checkbox"
                          checked={preferences.pushTasks}
                          onChange={(e) => setPreferences(prev => ({ ...prev, pushTasks: e.target.checked }))}
                          autoComplete="off"
                          className="rounded border-[#2d2d34] text-indigo-600 bg-[#121214]"
                        />
                        <span>Push</span>
                      </label>
                    </div>
                  </div>

                  {/* SLA Warning Alerts */}
                  <div className="flex items-center justify-between bg-[#121214]/40 p-3 border border-[#1f1f23] rounded-xl">
                    <div className="space-y-0.5">
                      <span className="font-bold text-white block">SLA Warning alerts</span>
                      <span className="text-[9px] text-[#8e8e95] block">Alert on SLA limits violations warnings</span>
                    </div>

                     <div className="flex gap-3">
                      <label htmlFor="notify-email-sla" className="flex items-center gap-1 font-semibold text-white cursor-pointer select-none">
                        <input
                          id="notify-email-sla"
                          name="notify-email-sla"
                          type="checkbox"
                          checked={preferences.emailSLA}
                          onChange={(e) => setPreferences(prev => ({ ...prev, emailSLA: e.target.checked }))}
                          autoComplete="off"
                          className="rounded border-[#2d2d34] text-indigo-600 bg-[#121214]"
                        />
                        <span>Email</span>
                      </label>
                      <label htmlFor="notify-push-sla" className="flex items-center gap-1 font-semibold text-white cursor-pointer select-none">
                        <input
                          id="notify-push-sla"
                          name="notify-push-sla"
                          type="checkbox"
                          checked={preferences.pushSLA}
                          onChange={(e) => setPreferences(prev => ({ ...prev, pushSLA: e.target.checked }))}
                          autoComplete="off"
                          className="rounded border-[#2d2d34] text-indigo-600 bg-[#121214]"
                        />
                        <span>Push</span>
                      </label>
                    </div>
                  </div>

                  {/* Blocker center notifications */}
                  <div className="flex items-center justify-between bg-[#121214]/40 p-3 border border-[#1f1f23] rounded-xl">
                    <div className="space-y-0.5">
                      <span className="font-bold text-white block">Blocker Alerts</span>
                      <span className="text-[9px] text-[#8e8e95] block">Alert when blockers are created or escalated</span>
                    </div>

                     <div className="flex gap-3">
                      <label htmlFor="notify-email-blockers" className="flex items-center gap-1 font-semibold text-white cursor-pointer select-none">
                        <input
                          id="notify-email-blockers"
                          name="notify-email-blockers"
                          type="checkbox"
                          checked={preferences.emailBlockers}
                          onChange={(e) => setPreferences(prev => ({ ...prev, emailBlockers: e.target.checked }))}
                          autoComplete="off"
                          className="rounded border-[#2d2d34] text-indigo-600 bg-[#121214]"
                        />
                        <span>Email</span>
                      </label>
                      <label htmlFor="notify-push-blockers" className="flex items-center gap-1 font-semibold text-white cursor-pointer select-none">
                        <input
                          id="notify-push-blockers"
                          name="notify-push-blockers"
                          type="checkbox"
                          checked={preferences.pushBlockers}
                          onChange={(e) => setPreferences(prev => ({ ...prev, pushBlockers: e.target.checked }))}
                          autoComplete="off"
                          className="rounded border-[#2d2d34] text-indigo-600 bg-[#121214]"
                        />
                        <span>Push</span>
                      </label>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="notify-digest-select" className="text-[10px] uppercase font-bold tracking-wider text-[#8e8e95]">Alert Digest Frequency</label>
                    <select
                      id="notify-digest-select"
                      name="notify-digest-select"
                      value={preferences.digest}
                      onChange={(e) => setPreferences(prev => ({ ...prev, digest: e.target.value }))}
                      autoComplete="off"
                      className="w-full bg-[#121214] border border-[#1f1f23] rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                    >
                      <option value="instant">Instant Notifications</option>
                      <option value="daily">Daily digest summary</option>
                      <option value="weekly">Weekly digest summary</option>
                    </select>
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg transition"
                >
                  Save Alert Settings
                </button>
              </form>
            </div>

          </div>
        )}

      </div>
    </ProtectedRoute>
  );
}

