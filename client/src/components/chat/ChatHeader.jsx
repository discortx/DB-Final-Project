import { Users, Info, Search } from 'lucide-react';
import Avatar from '../ui/Avatar';
import Button from '../ui/Button';
import useToastStore from '../../store/toastStore';

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
    <div className="bg-white border-b border-[#E0E0E0] px-4 py-3 flex items-center gap-3 h-14 shrink-0">
      {/* Avatar / icon */}
      {chat.type === 'DM' ? (
        <Avatar
          firstName={otherMember.first_name || ''}
          lastName={otherMember.last_name || ''}
          size="sm"
        />
      ) : (
        <div className="w-9 h-9 bg-[#EFEFEF] rounded-full flex items-center justify-center shrink-0 border border-[#E0E0E0]">
          <Users size={16} className="text-[#888888]" />
        </div>
      )}

      {/* Name + subtitle */}
      <div className="flex flex-col min-w-0 flex-1">
        {chat.type === 'DM' ? (
          <>
            <span className="font-semibold text-sm text-[#0A0A0A] truncate">
              {otherMember.first_name
                ? `${otherMember.first_name} ${otherMember.last_name || ''}`.trim()
                : chat.name || 'Direct Message'}
            </span>
            <span className="text-xs text-[#1A7A4A]">Active now</span>
          </>
        ) : (
          <>
            <span className="font-semibold text-sm text-[#0A0A0A] truncate">
              {chat.name || 'Group Chat'}
            </span>
            <span className="text-xs text-[#888888]">
              {memberCount} member{memberCount !== 1 ? 's' : ''}
            </span>
          </>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex gap-1 ml-auto shrink-0">
        <Button
          variant="ghost"
          size="sm"
          onClick={onOpenInfo}
          className="p-1.5"
          aria-label="Info"
        >
          <Info size={18} />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => addToast({ message: 'Coming soon', type: 'info' })}
          className="p-1.5"
          aria-label="Search messages"
        >
          <Search size={18} />
        </Button>
      </div>
    </div>
  );
}
