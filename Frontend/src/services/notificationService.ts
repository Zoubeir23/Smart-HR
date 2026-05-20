import api from './api';

export interface Notification {
  id: number;
  notification_type: string;
  title: string;
  message: string;
  is_read: boolean;
  target_url: string;
  created_at: string;
}

export interface NotificationListResponse {
  results: Notification[];
  unread_count: number;
}

export const notificationService = {
  list: async (): Promise<NotificationListResponse> => {
    const { data } = await api.get('/notifications/');
    return data;
  },

  markRead: async (notificationId: number): Promise<void> => {
    await api.patch(`/notifications/${notificationId}/read/`);
  },

  markAllRead: async (): Promise<void> => {
    await api.post('/notifications/');
  },
};
