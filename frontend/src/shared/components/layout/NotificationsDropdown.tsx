"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  Bell,
  AlertTriangle,
  MessageSquare,
  ShieldAlert,
} from "lucide-react";
import { useNotificationStore } from "@/features/notifications/store/notification-store";
import { useNotificationSocket } from "@/infrastructure/websocket/useNotificationSocket";
import type { NotificationEvent } from "@/infrastructure/websocket/useNotificationSocket";
import { queryClient } from "@/infrastructure/query/query-client";
import type { NotificationItem } from "@/features/notifications/store/notification-store";
import { usePushNotifications } from "@/infrastructure/push/usePushNotifications";

// ---------------------------------------------------------------------------
// Connection Status Dot
// ---------------------------------------------------------------------------

type ConnectionStatus = "connected" | "reconnecting" | "disconnected";

const StatusDot: React.FC<{ status: ConnectionStatus }> = ({ status }) => {
  const dotClass =
    status === "connected"
      ? "bg-emerald-400 animate-pulse shadow-emerald-400/50"
      : status === "reconnecting"
      ? "bg-amber-400 animate-pulse shadow-amber-400/50"
      : "bg-rose-500 shadow-rose-500/50";

  const label =
    status === "connected"
      ? "Real-time connected"
      : status === "reconnecting"
      ? "Reconnecting…"
      : "Disconnected";

  return (
    <span
      title={label}
      aria-label={label}
      className={`inline-block h-2 w-2 rounded-full shadow-md ${dotClass}`}
    />
  );
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Map a WebSocket NotificationEvent → NotificationItem for the Zustand store */
function wsEventToStoreItem(event: NotificationEvent): NotificationItem {
  return {
    id: event.id,
    verb: event.title ?? event.notification_type ?? "Notification",
    description: event.message ?? "",
    is_read: false,
    data: null,
    created_at: event.created_at ?? new Date().toISOString(),
  };
}

const getAlertIcon = (verb: string) => {
  const v = verb.toLowerCase();
  if (v.includes("block") || v.includes("critical")) {
    return <ShieldAlert className="h-4 w-4 text-rose-500" />;
  }
  if (v.includes("mention") || v.includes("comment")) {
    return <MessageSquare className="h-4 w-4 text-sky-500" />;
  }
  if (v.includes("warning") || v.includes("alert")) {
    return <AlertTriangle className="h-4 w-4 text-amber-500" />;
  }
  return <Bell className="h-4 w-4 text-indigo-400" />;
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const NotificationsDropdown: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const { notifications, unreadCount, markRead, addNotification } =
    useNotificationStore();

  const { isSubscribed, subscribe, unsubscribe, isSupported } = usePushNotifications();

  // ── WebSocket ──────────────────────────────────────────────────────────────
  const handleWsMessage = useCallback(
    (event: NotificationEvent) => {
      if (event.type !== "notification") return;

      const storeItem = wsEventToStoreItem(event);

      // 1. Update Zustand store (drives the dropdown list immediately)
      addNotification(storeItem);

      // 2. Optimistically prepend to any TanStack Query cache that holds
      //    a notifications list (e.g. fetched from API on mount)
      queryClient.setQueryData<NotificationItem[]>(
        ["notifications"],
        (prev) => (prev ? [storeItem, ...prev] : [storeItem])
      );
    },
    [addNotification]
  );

  const { isConnected, reconnectCount } = useNotificationSocket({
    onMessage: handleWsMessage,
  });

  // Derive a tri-state status for the visual indicator
  const connectionStatus: ConnectionStatus =
    isConnected
      ? "connected"
      : reconnectCount > 0
      ? "reconnecting"
      : "disconnected";

  // ── Click-outside handler ──────────────────────────────────────────────────
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleMarkRead = (id: string) => {
    markRead(id);
    // Production: apiClient.post(`/api/v1/notifications/${id}/mark-read/`)
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="relative" ref={dropdownRef}>
      {/* ── Trigger Button ── */}
      <button
        id="notifications-trigger"
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-1.5 rounded-lg border border-border bg-card text-muted-foreground hover:text-foreground transition-linear focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
        aria-label="Toggle notifications panel"
        aria-haspopup="true"
        aria-expanded={isOpen}
      >
        <Bell className="h-4 w-4" />

        {/* Unread badge */}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 h-4 min-w-4 rounded-full bg-indigo-600 text-[10px] font-bold text-white flex items-center justify-center px-1 animate-pulse">
            {unreadCount}
          </span>
        )}

        {/* Connection status dot — bottom-right of bell */}
        <span className="absolute -bottom-0.5 -right-0.5">
          <StatusDot status={connectionStatus} />
        </span>
      </button>

      {/* ── Popover Panel ── */}
      {isOpen && (
        <div
          id="notifications-panel"
          className="absolute right-0 mt-2 w-80 bg-card border border-border rounded-xl shadow-lg z-toast overflow-hidden py-1 animate-in fade-in slide-in-from-top-2 duration-150"
        >
          {/* Header */}
          <header className="px-4 py-2 border-b flex justify-between items-center bg-muted/20">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold tracking-tight text-foreground">
                Notifications
              </span>
              <StatusDot status={connectionStatus} />
            </div>
            <div className="flex items-center gap-2">
              {isSupported && (
                <button
                  onClick={isSubscribed ? unsubscribe : subscribe}
                  className={`text-[9px] font-bold px-1.5 py-0.5 rounded border transition-all ${
                    isSubscribed
                      ? "bg-indigo-600/10 border-indigo-500/30 text-indigo-400 hover:bg-indigo-600/20"
                      : "bg-[#1c1c1f] border-border text-muted-foreground hover:text-foreground hover:bg-zinc-800"
                  }`}
                  title={isSubscribed ? "Disable browser push notifications" : "Enable browser push notifications"}
                >
                  {isSubscribed ? "Push Enabled" : "Enable Push"}
                </button>
              )}
              {unreadCount > 0 && (
                <span className="text-[10px] font-semibold text-indigo-400">
                  {unreadCount} new alerts
                </span>
              )}
            </div>
          </header>

          {/* Connection status banner when not connected */}
          {!isConnected && (
            <div
              className={`px-4 py-1.5 text-[10px] font-medium flex items-center gap-1.5 ${
                reconnectCount > 0
                  ? "bg-amber-500/10 text-amber-400"
                  : "bg-rose-500/10 text-rose-400"
              }`}
            >
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-current" />
              {reconnectCount > 0
                ? `Reconnecting… (attempt ${reconnectCount}/5)`
                : "Real-time updates disconnected"}
            </div>
          )}

          {/* List */}
          <div className="max-h-72 overflow-y-auto divide-y divide-border">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-xs text-muted-foreground space-y-1">
                <p>All caught up!</p>
                <p className="text-[10px] text-muted-foreground/60">
                  No recent task updates or mentions.
                </p>
              </div>
            ) : (
              notifications.map((notif) => (
                <div
                  key={notif.id}
                  className={`p-3 text-xs flex gap-3 transition hover:bg-muted/30 ${
                    !notif.is_read ? "bg-muted/15 font-medium" : ""
                  }`}
                >
                  <div className="mt-0.5">{getAlertIcon(notif.verb)}</div>
                  <div className="flex-1 space-y-1">
                    <p className="text-foreground leading-snug">{notif.verb}</p>
                    <p className="text-[10px] text-muted-foreground leading-relaxed">
                      {notif.description}
                    </p>
                    <div className="flex justify-between items-center pt-1">
                      <span className="text-[9px] text-muted-foreground/75">
                        {new Date(notif.created_at).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                      {!notif.is_read && (
                        <button
                          onClick={() => handleMarkRead(notif.id)}
                          className="text-[9px] text-indigo-400 hover:text-indigo-300 font-semibold"
                        >
                          Mark as read
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationsDropdown;
