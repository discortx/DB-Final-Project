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
      {/* Avatar slot */}
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
      <div className={`flex flex-col max-w-[70%] min-w-0 ${isMine ? 'items-end' : 'items-start'}`}>
        {/* Sender name for group chats */}
        {!isMine && isGroup && showAvatar && (
          <span
            className="text-[10px] font-semibold mb-0.5"
            style={{ color: 'rgba(245,240,239,0.55)' }}
          >
            {message.first_name || message.username || 'Unknown'}
          </span>
        )}

        {/* Message bubble */}
        <div
          className="px-3 py-2 text-sm break-words w-fit"
          style={
            isMine
              ? {
                  background: '#8B1520',
                  color: '#F5F0EF',
                  borderRadius: '10px 10px 2px 10px',
                }
              : {
                  background: 'rgba(255,255,255,0.07)',
                  border: '1px solid rgba(255,255,255,0.09)',
                  color: '#F5F0EF',
                  borderRadius: '10px 10px 10px 2px',
                }
          }
        >
          {message.content}
        </div>

        {/* Timestamp */}
        <span
          className="text-[10px] mt-0.5"
          style={{ color: 'rgba(245,240,239,0.35)' }}
        >
          {formatTime(message.created_at)}
        </span>
      </div>
    </div>
  );
}
