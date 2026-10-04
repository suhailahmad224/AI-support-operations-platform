import api from '../config/api';

export const notificationService = {
  getNotifications: async (params = {}) => {
    return await api.get('/notifications', { params });
  },

  getUnreadCount: async () => {
    return await api.get('/notifications/unread-count');
  },

  markAsRead: async (id) => {
    return await api.patch(`/notifications/${id}/read`);
  },

  markAllAsRead: async () => {
    return await api.patch('/notifications/read-all');
  },
};
