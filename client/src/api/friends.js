import api from './client';
export const getFriends       = ()     => api.get('/api/friends');
export const getInbox         = ()     => api.get('/api/friends/requests/inbox');
export const getSuggestions   = ()     => api.get('/api/friends/suggestions');
export const sendRequest      = (id)   => api.post('/api/friends/requests', { receiver_id: id });
export const acceptRequest    = (id)   => api.patch(`/api/friends/requests/${id}/accept`);
export const rejectRequest    = (id)   => api.patch(`/api/friends/requests/${id}/reject`);
export const cancelRequest    = (id)   => api.delete(`/api/friends/requests/${id}`);
export const unfriend         = (id)   => api.delete(`/api/friends/${id}`);
