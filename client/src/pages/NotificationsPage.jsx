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

const NOTIF_CSS = `
  @keyframes skeletonShimmer { 0% { background-position: -400px 0 } 100% { background-position: 400px 0 } }
  .skeleton-pulse {
    background: linear-gradient(90deg, rgba(255,255,255,0.06) 25%, rgba(255,255,255,0.10) 50%, rgba(255,255,255,0.06) 75%);
    background-size: 400px 100%;
    animation: skeletonShimmer 1.6s ease-in-out infinite;
  }
  .notif-tab-btn { transition: color 0.15s, border-color 0.15s; }
  .notif-tab-btn:hover { color: rgba(245,240,239,0.75) !important; }
  @media (prefers-reduced-motion: reduce) { .skeleton-pulse { animation: none; } }
`;

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

    switch (notif.type) {
      case 'FRIEND_REQUEST': navigate('/friends/requests'); break;
      case 'LIKE':
      case 'COMMENT':
      case 'TAG':           navigate('/'); break;
      case 'MESSAGE':       navigate('/chats'); break;
      case 'GAME':          navigate('/games'); break;
      default:              navigate('/');
    }
  };

  const handleDismiss = (notifId) => {
    setNotifications((prev) => prev.filter((n) => n.id !== notifId));
  };

  const filtered = filterNotifications(notifications, activeFilter);
  const groups = groupNotificationsByDate(filtered);
  const hasUnread = notifications.some((n) => !n.is_read);

  return (
    <>
      <style>{NOTIF_CSS}</style>
      <div className="max-w-[640px] mx-auto pt-6">
        {/* Page header */}
        <div className="flex items-center justify-between mb-4">
          <h1
            style={{
              fontFamily: "'Cormorant Garamond', serif",
              fontWeight: 700,
              fontSize: '1.65rem',
              color: '#F5F0EF',
            }}
          >
            Notifications
          </h1>
          {hasUnread && (
            <button
              type="button"
              onClick={handleMarkAllRead}
              disabled={markingAll}
              className="transition-colors hover:text-white/70 cursor-pointer"
              style={{
                color: 'rgba(245,240,239,0.45)',
                fontSize: '0.8rem',
                background: 'none',
                border: 'none',
                padding: '4px 8px',
              }}
            >
              {markingAll ? 'Marking…' : 'Mark all read'}
            </button>
          )}
        </div>

        {/* Filter tabs */}
        <div
          className="flex gap-1 mb-5 overflow-x-auto"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}
        >
          {FILTER_TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveFilter(tab.key)}
              className="notif-tab-btn px-3 py-2 text-sm font-medium shrink-0 border-b-2 -mb-px cursor-pointer"
              style={{
                borderBottomColor: activeFilter === tab.key ? '#8B1520' : 'transparent',
                color: activeFilter === tab.key
                  ? '#F5F0EF'
                  : 'rgba(245,240,239,0.45)',
                background: 'none',
                border: 'none',
                borderBottom: `2px solid ${activeFilter === tab.key ? '#8B1520' : 'transparent'}`,
                transition: 'color 0.15s, border-color 0.15s',
              }}
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
                <div
                  className="skeleton-pulse w-8 h-8 rounded-full shrink-0"
                  style={{ background: 'rgba(255,255,255,0.07)' }}
                />
                <div
                  className="skeleton-pulse w-8 h-8 rounded-full shrink-0"
                  style={{ background: 'rgba(255,255,255,0.07)' }}
                />
                <div className="flex-1 space-y-1.5">
                  <div
                    className="skeleton-pulse h-3 w-3/4 rounded"
                    style={{ background: 'rgba(255,255,255,0.07)' }}
                  />
                  <div
                    className="skeleton-pulse h-2.5 w-1/4 rounded"
                    style={{ background: 'rgba(255,255,255,0.05)' }}
                  />
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
              <p
                className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider"
                style={{ color: 'rgba(245,240,239,0.4)' }}
              >
                {group.label}
              </p>
              <div
                className="overflow-hidden rounded-lg"
                style={{
                  background: 'rgba(23,18,20,0.65)',
                  backdropFilter: 'blur(12px)',
                  WebkitBackdropFilter: 'blur(12px)',
                  border: '1px solid rgba(255,255,255,0.08)',
                }}
              >
                {group.items.map((notif, idx) => (
                  <div
                    key={notif.id}
                    style={
                      idx < group.items.length - 1
                        ? { borderBottom: '1px solid rgba(255,255,255,0.06)' }
                        : {}
                    }
                  >
                    <NotificationItem
                      notification={notif}
                      onClick={handleNotifClick}
                      onDismiss={handleDismiss}
                    />
                  </div>
                ))}
              </div>
            </div>
          ))}
      </div>
    </>
  );
}
