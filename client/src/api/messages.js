import api from './client';
export const getMessages = (chatId, before = null, limit = 50) =>
  api.get(`/api/messages/${chatId}`, { params: { before, limit } });
export const sendMessage = (chatId, content) =>
  api.post(`/api/messages/${chatId}`, { content });
