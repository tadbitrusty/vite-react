'use client';

import { create } from 'zustand';
import { devtools, subscribeWithSelector } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import type { Notification, NotificationType } from '../../lib/shared';

interface NotificationState {
  notifications: Notification[];
  
  // Actions
  addNotification: (
    type: NotificationType,
    title: string,
    message: string,
    options?: {
      duration?: number;
      persistent?: boolean;
    }
  ) => void;
  removeNotification: (id: string) => void;
  clearAllNotifications: () => void;
  
  // Convenience methods
  showSuccess: (title: string, message: string, duration?: number) => void;
  showError: (title: string, message: string, persistent?: boolean) => void;
  showInfo: (title: string, message: string, duration?: number) => void;
  showWarning: (title: string, message: string, duration?: number) => void;
}

export const useNotificationStore = create<NotificationState>()(
  devtools(
    subscribeWithSelector(
      immer((set, get) => ({
        notifications: [],

        addNotification: (type, title, message, options = {}) =>
          set((state) => {
            const id = crypto.randomUUID();
            const notification: Notification = {
              id,
              type,
              title,
              message,
              duration: options.duration ?? (type === 'error' ? 0 : 5000),
              persistent: options.persistent ?? false,
            };

            state.notifications.push(notification);

            // Auto-remove non-persistent notifications
            if (!notification.persistent && notification.duration > 0) {
              setTimeout(() => {
                get().removeNotification(id);
              }, notification.duration);
            }
          }),

        removeNotification: (id) =>
          set((state) => {
            const index = state.notifications.findIndex((n) => n.id === id);
            if (index > -1) {
              state.notifications.splice(index, 1);
            }
          }),

        clearAllNotifications: () =>
          set((state) => {
            state.notifications = [];
          }),

        // Convenience methods
        showSuccess: (title, message, duration = 5000) =>
          get().addNotification('success', title, message, { duration }),

        showError: (title, message, persistent = true) =>
          get().addNotification('error', title, message, { 
            persistent, 
            duration: persistent ? 0 : 10000 
          }),

        showInfo: (title, message, duration = 5000) =>
          get().addNotification('info', title, message, { duration }),

        showWarning: (title, message, duration = 7000) =>
          get().addNotification('warning', title, message, { duration }),
      }))
    ),
    {
      name: 'notification-store',
    }
  )
);

export type { NotificationState };