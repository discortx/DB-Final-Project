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
  const otherMember =
    chat.type === 'DM'
      ? (chat.members || []).find((m) => m.id !== undefined) || {}
      : null;

  const timestamp = chat.last_message_at || chat.created_at || null;
  const preview = chat.last_message || null;

  return (
    <div
      onClick={onClick}
      className={`flex items-center gap-3 px-3 py-3 cursor-pointer transition-colors ${
        isActive
          ? 'bg-white border-l-2 border-black'
          : 'hover:bg-[#EFEFEF] border-l-2 border-transparent'
      }`}
    >
      {/* Avatar */}
      {chat.type === 'DM' ? (
        <Avatar
          firstName={otherMember.first_name || ''}
          lastName={otherMember.last_name || ''}
          size="md"
        />
      ) : (
        <div className="w-10 h-10 bg-[#EFEFEF] rounded-full flex items-center justify-center shrink-0 border border-[#E0E0E0]">
          <Users size={16} className="text-[#888888]" />
        </div>
      )}

      {/* Text column */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center">
          <span className="font-semibold text-sm text-[#0A0A0A] truncate flex-1">
            {chat.name ||
              (chat.type === 'DM'
                ? `${otherMember.first_name || ''} ${otherMember.last_name || ''}`.trim() || 'Direct Message'
                : 'Group Chat')}
          </span>
          {timestamp && (
            <span className="text-[10px] text-[#888888] ml-2 shrink-0">
              {relativeTime(timestamp)}
            </span>
          )}
        </div>
        <p className="text-xs text-[#888888] truncate mt-0.5">
          {preview || 'No messages yet'}
        </p>
      </div>
    </div>
  );
}
