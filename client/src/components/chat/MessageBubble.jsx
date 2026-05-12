import Avatar from '../ui/Avatar';

function formatTime(dateStr) {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function MessageBubble({ message, isMine, isGroup, showAvatar }) {
  return (
    <div
      className={`flex gap-2 mb-1 items-end ${isMine ? 'flex-row-reverse' : 'flex-row'}`}
    >
      {/* Avatar slot — always reserves space for alignment */}
      {!isMine ? (
        showAvatar ? (
          <Avatar
            firstName={message.first_name || ''}
            lastName={message.last_name || ''}
            size="xs"
          />
        ) : (
          <div className="w-6 h-6 shrink-0 invisible" />
        )
      ) : null}

      {/* Bubble + name + timestamp */}
      <div className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}>
        {/* Sender name for group chats */}
        {!isMine && isGroup && showAvatar && (
          <span className="text-[10px] font-semibold text-[#404040] mb-0.5">
            {message.first_name || message.username || 'Unknown'}
          </span>
        )}

        {/* Message bubble */}
        <div
          className={`max-w-[70%] px-3 py-2 text-sm break-words ${
            isMine
              ? 'bg-[#0A0A0A] text-white rounded-lg rounded-tr-sm'
              : 'bg-[#F7F7F7] border border-[#E0E0E0] text-[#0A0A0A] rounded-lg rounded-tl-sm'
          }`}
        >
          {message.content}
        </div>

        {/* Timestamp */}
        <span className="text-[10px] text-[#888888] mt-0.5">
          {formatTime(message.created_at)}
        </span>
      </div>
    </div>
  );
}
