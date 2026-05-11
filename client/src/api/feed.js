import api from './client';
export const getFeed = (cursor = null, limit = 20) =>
  api.get('/api/feed', { params: { cursor, limit } });
