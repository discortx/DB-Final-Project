import { X, UserPlus, Heart, MessageSquare, AtSign, MessageCircle, Gamepad2 } from 'lucide-react';
import Avatar from '../ui/Avatar';

function relativeTime(dateStr) {
  if (!dateStr) return '';
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin}m`;
  if (diffMin < 1440) return `${Math.floor(diffMin / 60)}h`;
  const d = new Date(dateStr);
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${d.getDate()} ${months[d.getMonth()]}`;
}

const TYPE_CONFIG = {
  FRIEND_REQUEST: { Icon: UserPlus },
  LIKE:           { Icon: Heart },
  COMMENT:        { Icon: MessageSquare },
  TAG:            { Icon: AtSign },
  MESSAGE:        { Icon: MessageCircle },
  GAME:           { Icon: Gamepad2 },
};

export default function NotificationItem({ notification, onClick, onDismiss }) {
  const config = TYPE_CONFIG[notification.type] || { Icon: MessageCircle };
  const { Icon } = config;
  const isUnread = !notification.is_read;

  return (
    <div
      onClick={() => onClick(notification)}
      className="flex items-start gap-3 px-3 py-3 cursor-pointer transition-colors relative group hover:bg-white/[0.03]"
      style={{
        background: isUnread ? 'rgba(139,21,32,0.07)' : 'transparent',
        borderLeft: `3px solid ${isUnread ? '#8B1520' : 'transparent'}`,
      }}
    >
      {/* Type icon circle */}
      <div
        className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5"
        style={{
          background: 'rgba(139,21,32,0.15)',
          border: '1px solid rgba(139,21,32,0.25)',
        }}
      >
        <Icon size={14} style={{ color: 'rgba(245,240,239,0.7)' }} />
      </div>

      {/* Sender avatar */}
      <Avatar
        firstName={notification.sender_first_name || '?'}
        lastName={notification.sender_last_name || ''}
        size="sm"
      />

      {/* Text column */}
      <div className="flex-1 min-w-0 pr-6">
        <p
          className="text-sm leading-snug"
          style={{ color: isUnread ? '#F5F0EF' : 'rgba(245,240,239,0.75)' }}
        >
          {notification.text}
        </p>
        <span
          className="mt-0.5 block"
          style={{ color: 'rgba(245,240,239,0.38)', fontSize: '10px' }}
        >
          {relativeTime(notification.created_at)}
        </span>
      </div>

      {/* Dismiss button */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onDismiss(notification.id);
        }}
        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-md hover:bg-white/5"
        style={{ color: 'rgba(245,240,239,0.45)', background: 'none', border: 'none', cursor: 'pointer' }}
        aria-label="Dismiss notification"
      >
        <X size={14} />
      </button>
    </div>
  );
}
