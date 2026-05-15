import api from './client';
export const getPendingInvites  = ()               => api.get('/api/games/invites/pending');
export const getSentInvites     = ()               => api.get('/api/games/invites/sent');
export const sendInvite         = (receiverId)     => api.post('/api/games/invites', { receiver_id: Number(receiverId) });
export const acceptInvite       = (id)             => api.patch(`/api/games/invites/${id}/accept`);
export const rejectInvite       = (id)             => api.patch(`/api/games/invites/${id}/reject`);
export const getMatch           = (id)             => api.get(`/api/games/matches/${id}`);
export const makeMove           = (id, pos)        => api.post(`/api/games/matches/${id}/move`, { position: pos });
export const rematch            = (id)             => api.post(`/api/games/matches/${id}/rematch`);
export const upsertSnakeScore   = (score)          => api.post('/api/games/snake/score', { score });
export const getSnakeLeaderboard = ()              => api.get('/api/games/snake/leaderboard');
// legacy aliases
export const submitSnake    = upsertSnakeScore;
export const getLeaderboard = getSnakeLeaderboard;
