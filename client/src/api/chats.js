import api from './client';
export const getChats          = ()               => api.get('/api/chats');
export const openDm            = (userId)         => api.post('/api/chats/dm', { user_id: Number(userId) });
export const createGroup       = (data)           => api.post('/api/chats/group', data);
export const getChat           = (id)             => api.get(`/api/chats/${id}`);
export const updateChat        = (id, data)       => api.patch(`/api/chats/${id}`, data);
export const addMember         = (id, userId)     => api.post(`/api/chats/${id}/members`, { user_id: userId });
export const removeMember      = (id, userId)     => api.delete(`/api/chats/${id}/members/${userId}`);
export const updateMemberRole  = (id, uid, role)  => api.patch(`/api/chats/${id}/members/${uid}/role`, { role });
