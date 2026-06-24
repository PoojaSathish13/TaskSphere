"use client";

import React, { useState, useRef, useEffect } from "react";
import { Bell, AlertTriangle, MessageSquare, ShieldAlert, Settings } from "lucide-react";
import { useNotificationStore } from "@/features/notifications/store/notification-store";
import { useAuthActions } from "@/features/auth/hooks/useAuthActions";

export const NotificationsDropdown: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  const { notifications, unreadCount, markRead } = useNotificationStore();
  const { revokeSession } = useAuthActions(); // using general auth action triggers

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleMarkRead = (id: string) => {
    markRead(id);
    // In production, also trigger API: apiClient.post(`/api/v1/notifications/${id}/mark-read/`)
  };

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

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-1.5 rounded-lg border border-border bg-card text-muted-foreground hover:text-foreground transition-linear focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
        aria-label="Toggle notifications panel"
        aria-haspopup="true"
        aria-expanded={isOpen}
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 h-4 min-w-4 rounded-full bg-indigo-600 text-[10px] font-bold text-white flex items-center justify-center px-1 animate-pulse">
            {unreadCount}
          </span>
        )}
      </button>

      {/* Popover Panel */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-card border border-border rounded-xl shadow-lg z-toast overflow-hidden py-1 animate-in fade-in slide-in-from-top-2 duration-150">
          <header className="px-4 py-2 border-b flex justify-between items-center bg-muted/20">
            <span className="text-xs font-bold tracking-tight text-foreground">Notifications</span>
            {unreadCount > 0 && (
              <span className="text-[10px] font-semibold text-indigo-400">
                {unreadCount} new alerts
              </span>
            )}
          </header>

          <div className="max-h-72 overflow-y-auto divide-y divide-border">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-xs text-muted-foreground space-y-1">
                <p>All caught up!</p>
                <p className="text-[10px] text-muted-foreground/60">No recent task updates or mentions.</p>
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
