import { Users, Info, Search } from 'lucide-react';
import Avatar from '../ui/Avatar';
import useToastStore from '../../store/toastStore';

const iconBtnStyle = {
  background: 'rgba(255,255,255,0.06)',
  border: 'none',
  cursor: 'pointer',
  color: 'rgba(245,240,239,0.6)',
  borderRadius: '50%',
  width: 30,
  height: 30,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  transition: 'background 0.15s',
};

export default function ChatHeader({ chat, currentUserId, onOpenInfo }) {
  const addToast = useToastStore((s) => s.addToast);

  const otherMember =
    chat.type === 'DM'
      ? (chat.members || []).find((m) => m.id !== currentUserId) ||
        (chat.members || [])[0] ||
        {}
      : null;

  const memberCount = (chat.members || []).length;

  return (
    <div
      className="px-4 py-3 flex items-center gap-3 h-14 shrink-0"
      style={{
        background: 'rgba(12,9,10,0.9)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderBottom: '1px solid rgba(255,255,255,0.07)',
      }}
    >
      {/* Avatar / icon */}
      {chat.type === 'DM' ? (
        <Avatar
          firstName={otherMember.first_name || ''}
          lastName={otherMember.last_name || ''}
          size="sm"
        />
      ) : (
        <div
          className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
          style={{
            background: 'rgba(139,21,32,0.15)',
            border: '1px solid rgba(139,21,32,0.25)',
          }}
        >
          <Users size={16} style={{ color: 'rgba(245,240,239,0.6)' }} />
        </div>
      )}

      {/* Name + subtitle */}
      <div className="flex flex-col min-w-0 flex-1">
        {chat.type === 'DM' ? (
          <>
            <span
              className="font-semibold text-sm truncate"
              style={{ color: '#F5F0EF' }}
            >
              {otherMember.first_name
                ? `${otherMember.first_name} ${otherMember.last_name || ''}`.trim()
                : chat.name || 'Direct Message'}
            </span>
            <span className="text-xs" style={{ color: '#4ABA80' }}>Active now</span>
          </>
        ) : (
          <>
            <span
              className="font-semibold text-sm truncate"
              style={{ color: '#F5F0EF' }}
            >
              {chat.name || 'Group Chat'}
            </span>
            <span className="text-xs" style={{ color: 'rgba(245,240,239,0.45)' }}>
              {memberCount} member{memberCount !== 1 ? 's' : ''}
            </span>
          </>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex gap-1.5 ml-auto shrink-0">
        <button
          type="button"
          onClick={onOpenInfo}
          style={iconBtnStyle}
          className="hover:bg-white/10 transition-colors"
          aria-label="Info"
        >
          <Info size={16} />
        </button>
        <button
          type="button"
          onClick={() => addToast({ message: 'Coming soon', type: 'info' })}
          style={iconBtnStyle}
          className="hover:bg-white/10 transition-colors"
          aria-label="Search messages"
        >
          <Search size={16} />
        </button>
      </div>
    </div>
  );
}
