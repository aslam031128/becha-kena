import { create } from 'zustand';

export interface NotificationItem {
  id: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

interface NotificationState {
  notifications: NotificationItem[];
  unreadCount: number;
  addNotification: (notification: NotificationItem) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  setNotifications: (notifications: NotificationItem[]) => void;
}

export const useNotificationStore = create<NotificationState>((set) => ({
  notifications: [],
  unreadCount: 0,

  addNotification: (notification: NotificationItem) =>
    set((state) => ({
      notifications: [notification, ...state.notifications],
      unreadCount: state.unreadCount + (notification.isRead ? 0 : 1),
    })),

  markAsRead: (id: string) =>
    set((state) => ({
      notifications: state.notifications.map((n) =>
        n.id === id ? { ...n, isRead: true } : n
      ),
      unreadCount: Math.max(0, state.unreadCount - 1),
    })),

  markAllAsRead: () =>
    set((state) => ({
      notifications: state.notifications.map((n) => ({ ...n, isRead: true })),
      unreadCount: 0,
    })),

  setNotifications: (notifications: NotificationItem[]) =>
    set({
      notifications,
      unreadCount: notifications.filter((n) => !n.isRead).length,
    }),
}));

