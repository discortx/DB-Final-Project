import { useState } from 'react';
import { Users } from 'lucide-react';
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

export default function ChatListItem({ chat, isActive, onClick }) {
  const [hovered, setHovered] = useState(false);

  const otherMember =
    chat.type === 'DM'
      ? {
          id:         chat.other_user_id,
          first_name: chat.other_first_name,
          last_name:  chat.other_last_name,
          username:   chat.other_username,
        }
      : null;

  const timestamp = chat.last_message_at || chat.created_at || null;
  const preview = chat.last_message || null;

  const rowStyle = isActive
    ? {
        background: 'rgba(139,21,32,0.15)',
        borderLeft: '2px solid #8B1520',
        cursor: 'pointer',
      }
    : hovered
    ? {
        background: 'rgba(255,255,255,0.05)',
        borderLeft: '2px solid transparent',
        cursor: 'pointer',
      }
    : {
        borderLeft: '2px solid transparent',
        cursor: 'pointer',
      };

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="flex items-center gap-3 px-3 py-3 transition-colors"
      style={rowStyle}
    >
      {/* Avatar */}
      {chat.type === 'DM' ? (
        <Avatar
          firstName={otherMember.first_name || ''}
          lastName={otherMember.last_name || ''}
          size="md"
        />
      ) : (
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
          style={{
            background: 'rgba(139,21,32,0.15)',
            border: '1px solid rgba(139,21,32,0.3)',
          }}
        >
          <Users size={16} style={{ color: '#8B1520' }} />
        </div>
      )}

      {/* Text column */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center">
          <span
            className="font-semibold text-sm truncate flex-1"
            style={{ color: '#F5F0EF' }}
          >
            {chat.name ||
              (chat.type === 'DM'
                ? `${otherMember.first_name || ''} ${otherMember.last_name || ''}`.trim() || 'Direct Message'
                : 'Group Chat')}
          </span>
          {timestamp && (
            <span
              className="text-[10px] ml-2 shrink-0"
              style={{ color: 'rgba(245,240,239,0.35)' }}
            >
              {relativeTime(timestamp)}
            </span>
          )}
        </div>
        <p className="text-xs truncate mt-0.5" style={{ color: 'rgba(245,240,239,0.45)' }}>
          {preview || 'No messages yet'}
        </p>
      </div>
    </div>
  );
}
