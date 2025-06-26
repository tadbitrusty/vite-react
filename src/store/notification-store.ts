'use client';

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

interface NotificationState {
  notifications: Array<{ id: string; title: string; message: string; type: 'success' | 'error' }>;
  showSuccess: (title: string, message: string) => void;
  showError: (title: string, message: string) => void;
  removeNotification: (id: string) => void;
}

export const useNotificationStore = create<NotificationState>()(
  devtools(
    (set) => ({
      notifications: [],
      showSuccess: (title, message) => {
        const id = Math.random().toString(36);
        set((state) => ({
          notifications: [...state.notifications, { id, title, message, type: 'success' }]
        }));
        setTimeout(() => {
          set((state) => ({
            notifications: state.notifications.filter(n => n.id !== id)
          }));
        }, 3000);
      },
      showError: (title, message) => {
        const id = Math.random().toString(36);
        set((state) => ({
          notifications: [...state.notifications, { id, title, message, type: 'error' }]
        }));
        setTimeout(() => {
          set((state) => ({
            notifications: state.notifications.filter(n => n.id !== id)
          }));
        }, 5000);
      },
      removeNotification: (id) =>
        set((state) => ({
          notifications: state.notifications.filter(n => n.id !== id)
        })),
    }),
    { name: 'notification-store' }
  )
);

export type { NotificationState };
