import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell } from 'lucide-react';
import { getNotifications, markRead, markAllRead } from '../api/notifications';
import useNotifStore from '../store/notifStore';
import socket from '../socket';
import NotificationItem from '../components/notifications/NotificationItem';
import Button from '../components/ui/Button';
import EmptyState from '../components/ui/EmptyState';
import Skeleton, { SkeletonText, SkeletonAvatar } from '../components/ui/Skeleton';

// ─── helpers ────────────────────────────────────────────────────────────────

function isToday(date) {
  const today = new Date();
  return (
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate()
  );
}

function isYesterday(date) {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return (
    date.getFullYear() === yesterday.getFullYear() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getDate() === yesterday.getDate()
  );
}

function groupNotificationsByDate(notifications) {
  const today = [];
  const yesterday = [];
  const earlier = [];

  for (const n of notifications) {
    const d = new Date(n.created_at);
    if (isToday(d)) today.push(n);
    else if (isYesterday(d)) yesterday.push(n);
    else earlier.push(n);
  }

  const groups = [];
  if (today.length) groups.push({ label: 'Today', items: today });
  if (yesterday.length) groups.push({ label: 'Yesterday', items: yesterday });
  if (earlier.length) groups.push({ label: 'Earlier', items: earlier });
  return groups;
}

const FILTER_TABS = [
  { key: 'all',      label: 'All' },
  { key: 'unread',   label: 'Unread' },
  { key: 'likes',    label: 'Likes' },
  { key: 'comments', label: 'Comments' },
  { key: 'messages', label: 'Messages' },
];

function filterNotifications(notifications, filter) {
  switch (filter) {
    case 'unread':   return notifications.filter((n) => !n.is_read);
    case 'likes':    return notifications.filter((n) => n.type === 'LIKE');
    case 'comments': return notifications.filter((n) => n.type === 'COMMENT');
    case 'messages': return notifications.filter((n) => n.type === 'MESSAGE');
    default:         return notifications;
  }
}

// ─── NotificationsPage ───────────────────────────────────────────────────────

export default function NotificationsPage() {
  const navigate = useNavigate();
  const resetUnread = useNotifStore((s) => s.reset);
  const incrementUnread = useNotifStore((s) => s.increment);

  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('all');
  const [markingAll, setMarkingAll] = useState(false);

  const load = async () => {
    try {
      const r = await getNotifications();
      setNotifications(r.data || []);
    } catch {
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();

    // Socket: new notification comes in
    const onNew = (notif) => {
      setNotifications((prev) => [notif, ...prev]);
      incrementUnread();
    };
    socket.on('notification:new', onNew);
    return () => socket.off('notification:new', onNew);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleMarkAllRead = async () => {
    setMarkingAll(true);
    try {
      await markAllRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      resetUnread();
    } catch {
      // ignore
    } finally {
      setMarkingAll(false);
    }
  };

  const handleNotifClick = async (notif) => {
    // Mark as read
    if (!notif.is_read) {
      try {
        await markRead(notif.id);
        setNotifications((prev) =>
          prev.map((n) => (n.id === notif.id ? { ...n, is_read: true } : n))
        );
      } catch {
        // ignore
      }
    }

    // Navigate based on type
    switch (notif.type) {
      case 'FRIEND_REQUEST':
        navigate('/friends/requests');
        break;
      case 'LIKE':
      case 'COMMENT':
      case 'TAG':
        navigate('/');
        break;
      case 'MESSAGE':
        navigate('/chats');
        break;
      case 'GAME':
        navigate('/games');
        break;
      default:
        navigate('/');
    }
  };

  const handleDismiss = (notifId) => {
    setNotifications((prev) => prev.filter((n) => n.id !== notifId));
  };

  const filtered = filterNotifications(notifications, activeFilter);
  const groups = groupNotificationsByDate(filtered);
  const hasUnread = notifications.some((n) => !n.is_read);

  return (
    <div className="max-w-[640px] mx-auto pt-6">
      {/* Page header */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-[#0A0A0A]">Notifications</h1>
        {hasUnread && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleMarkAllRead}
            loading={markingAll}
          >
            Mark all read
          </Button>
        )}
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 mb-5 border-b border-[#E0E0E0] overflow-x-auto scrollbar-hide">
        {FILTER_TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveFilter(tab.key)}
            className={`px-3 py-2 text-sm font-medium shrink-0 border-b-2 transition-colors -mb-px ${
              activeFilter === tab.key
                ? 'border-[#0A0A0A] text-[#0A0A0A]'
                : 'border-transparent text-[#888888] hover:text-[#404040]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Loading skeleton */}
      {loading && (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-start gap-3 px-3 py-3">
              <Skeleton className="w-8 h-8 rounded-full shrink-0" />
              <SkeletonAvatar size="sm" />
              <div className="flex-1 space-y-1.5">
                <SkeletonText className="w-3/4" />
                <SkeletonText className="w-1/4" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && filtered.length === 0 && (
        <EmptyState
          icon={Bell}
          title="You're all caught up!"
          description="No notifications yet."
        />
      )}

      {/* Notification groups */}
      {!loading &&
        groups.map((group) => (
          <div key={group.label} className="mb-4">
            <p className="text-[10px] font-semibold text-[#888888] uppercase tracking-wider px-3 py-1.5">
              {group.label}
            </p>
            <div className="divide-y divide-[#E0E0E0] border border-[#E0E0E0] rounded-lg overflow-hidden">
              {group.items.map((notif) => (
                <NotificationItem
                  key={notif.id}
                  notification={notif}
                  onClick={handleNotifClick}
                  onDismiss={handleDismiss}
                />
              ))}
            </div>
          </div>
        ))}
    </div>
  );
}
