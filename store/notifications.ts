import { create } from 'zustand';

export type NotificationType = 'prime' | 'analytics' | 'system';

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  body?: string;
  timestamp: number;
  read: boolean;
  deepLink?: string;
  meta?: Record<string, unknown>;
}

interface NotificationsState {
  items: AppNotification[];
  add: (n: Omit<AppNotification, 'id' | 'timestamp' | 'read'> & { id?: string }) => void;
  markRead: (id: string) => void;
  markAllRead: () => void;
  clear: () => void;
  unreadCount: () => number;
}

export const useNotifications = create<NotificationsState>((set, get) => ({
  items: [],

  add: (n) =>
    set((state) => ({
      items: [
        {
          id: n.id ?? `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          type: n.type,
          title: n.title,
          body: n.body,
          deepLink: n.deepLink,
          meta: n.meta,
          timestamp: Date.now(),
          read: false,
        },
        ...state.items,
      ].slice(0, 200),
    })),

  markRead: (id) =>
    set((state) => ({
      items: state.items.map((i) => (i.id === id ? { ...i, read: true } : i)),
    })),

  markAllRead: () =>
    set((state) => ({ items: state.items.map((i) => ({ ...i, read: true })) })),

  clear: () => set({ items: [] }),

  unreadCount: () => get().items.filter((i) => !i.read).length,
}));
