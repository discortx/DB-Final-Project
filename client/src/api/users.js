import api from './client';
export const getMe           = ()     => api.get('/api/users/me');
export const updateMe        = (data) => api.patch('/api/users/me', data);
export const searchUsers     = (q)    => api.get('/api/users/search', { params: { q } });
export const getOnlineFriends = ()    => api.get('/api/users/online');
export const getUserById     = (id)   => api.get(`/api/users/${id}`);
// legacy aliases
export const getOnline = getOnlineFriends;
export const getUser   = getUserById;
