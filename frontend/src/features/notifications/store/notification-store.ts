import { create } from "zustand";

export interface NotificationItem {
  id: string;
  verb: string;
  description: string;
  is_read: boolean;
  data: Record<string, unknown> | null;
  created_at: string;
}

interface NotificationState {
  notifications: NotificationItem[];
  unreadCount: number;
  
  setNotifications: (notifications: NotificationItem[]) => void;
  addNotification: (notification: NotificationItem) => void;
  markRead: (id: string) => void;
}

export const useNotificationStore = create<NotificationState>((set) => ({
  notifications: [],
  unreadCount: 0,

  setNotifications: (notifications) => {
    const unreadCount = notifications.filter((n) => !n.is_read).length;
    set({ notifications, unreadCount });
  },

  addNotification: (notification) => {
    set((state) => {
      const updated = [notification, ...state.notifications];
      return {
        notifications: updated,
        unreadCount: state.unreadCount + (notification.is_read ? 0 : 1),
      };
    });
  },

  markRead: (id) => {
    set((state) => {
      const updated = state.notifications.map((n) =>
        n.id === id ? { ...n, is_read: true } : n
      );
      const previousNotification = state.notifications.find((n) => n.id === id);
      const dec = previousNotification && !previousNotification.is_read ? 1 : 0;
      return {
        notifications: updated,
        unreadCount: Math.max(0, state.unreadCount - dec),
      };
    });
  },
}));
