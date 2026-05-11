import { useState, useEffect } from 'react';
import { getNotifications, markRead, markAllRead } from '../api/notifications';

const TYPE_ICON = {
  MESSAGE: '💬', LIKE: '♥', COMMENT: '💭',
  TAG: '🏷', GAME: '🎮', FRIEND_REQUEST: '👤',
};

function timeAgo(dateStr) {
  const m = Math.floor((Date.now() - new Date(dateStr)) / 60000);
  if (m < 1)   return 'just now';
  if (m < 60)  return `${m}m ago`;
  if (m < 1440) return `${Math.floor(m / 60)}h ago`;
  return `${Math.floor(m / 1440)}d ago`;
}

export default function NotificationsPage() {
  const [notifs, setNotifs]   = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try { const r = await getNotifications(); setNotifs(r.data); } catch {}
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleMarkOne = async (id) => {
    await markRead(id);
    setNotifs((n) => n.map((x) => x.id === id ? { ...x, is_read: true } : x));
  };

  const handleMarkAll = async () => {
    await markAllRead();
    setNotifs((n) => n.map((x) => ({ ...x, is_read: true })));
  };

  if (loading) return <div className="text-center py-12 text-gray-400">Loading…</div>;

  const unreadCount = notifs.filter((n) => !n.is_read).length;

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-gray-900">Notifications</h1>
        {unreadCount > 0 && (
          <button onClick={handleMarkAll} className="text-sm text-blue-600 hover:underline">
            Mark all as read
          </button>
        )}
      </div>

      {notifs.length === 0 && (
        <div className="text-center py-12 text-gray-400">
          <p className="text-4xl mb-2">🔔</p>
          <p>No notifications yet.</p>
        </div>
      )}

      <div className="space-y-2">
        {notifs.map((n) => (
          <div
            key={n.id}
            onClick={() => !n.is_read && handleMarkOne(n.id)}
            className={`flex items-start gap-3 p-4 rounded-xl border transition-colors cursor-pointer ${
              n.is_read ? 'bg-white border-gray-100 shadow-sm' : 'bg-blue-50 border-blue-100 shadow-sm'
            }`}
          >
            <span className="text-xl flex-shrink-0">{TYPE_ICON[n.type] || '🔔'}</span>
            <div className="flex-1 min-w-0">
              <p className={`text-sm ${n.is_read ? 'text-gray-700' : 'text-gray-900 font-medium'}`}>{n.text}</p>
              <p className="text-xs text-gray-400 mt-0.5">{timeAgo(n.created_at)}</p>
            </div>
            {!n.is_read && <div className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0 mt-1.5" />}
          </div>
        ))}
      </div>
    </div>
  );
}
