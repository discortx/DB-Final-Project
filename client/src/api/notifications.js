import api from './client';
export const getNotifications = (unreadOnly = false) =>
  api.get('/api/notifications', { params: { unread_only: unreadOnly } });
export const markRead    = (id) => api.patch(`/api/notifications/${id}/read`);
export const markAllRead = ()   => api.patch('/api/notifications/read-all');
