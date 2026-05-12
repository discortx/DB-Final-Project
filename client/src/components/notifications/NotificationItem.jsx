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

  return (
    <div
      onClick={() => onClick(notification)}
      className={`flex items-start gap-3 px-3 py-3 cursor-pointer transition-colors relative group border-l-4 ${
        !notification.is_read
          ? 'bg-[#F7F7F7] border-[#0A0A0A]'
          : 'bg-white border-transparent'
      }`}
    >
      {/* Type icon circle */}
      <div className="w-8 h-8 rounded-full bg-[#0A0A0A] flex items-center justify-center shrink-0 mt-0.5">
        <Icon size={14} className="text-white" />
      </div>

      {/* Sender avatar */}
      <Avatar
        firstName={notification.sender_first_name || '?'}
        lastName={notification.sender_last_name || ''}
        size="sm"
      />

      {/* Text column */}
      <div className="flex-1 min-w-0 pr-6">
        <p className="text-sm text-[#0A0A0A] leading-snug">
          {notification.text}
        </p>
        <span className="text-[10px] text-[#888888] mt-0.5 block">
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
        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-md hover:bg-[#EFEFEF] text-[#888888] hover:text-[#0A0A0A]"
        aria-label="Dismiss notification"
      >
        <X size={14} />
      </button>
    </div>
  );
}
