import api from './client';
export const getMe      = ()       => api.get('/api/users/me');
export const updateMe   = (data)   => api.patch('/api/users/me', data);
export const searchUsers = (q)     => api.get('/api/users/search', { params: { q } });
export const getOnline  = ()       => api.get('/api/users/online');
export const getUser    = (id)     => api.get(`/api/users/${id}`);
