import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageCircle, UserMinus, Loader2 } from 'lucide-react';
import Avatar from '../ui/Avatar';
import Modal from '../ui/Modal';
import { unfriend } from '../../api/friends';
import { openDm } from '../../api/chats';
import useToastStore from '../../store/toastStore';

function relativeTime(dateStr) {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  try {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

const cardStyle = {
  background: 'rgba(23,18,20,0.65)',
  backdropFilter: 'blur(12px)',
  WebkitBackdropFilter: 'blur(12px)',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: 8,
};

const ghostBtnStyle = {
  display: 'inline-flex', alignItems: 'center', gap: 4,
  background: 'none', border: '1px solid rgba(255,255,255,0.12)',
  color: 'rgba(245,240,239,0.75)', borderRadius: 6,
  padding: '4px 10px', fontSize: '0.75rem', fontWeight: 600,
  cursor: 'pointer',
};

const dangerBtnStyle = {
  display: 'inline-flex', alignItems: 'center', gap: 4,
  background: 'none', border: '1px solid rgba(139,21,32,0.35)',
  color: '#E87080', borderRadius: 6,
  padding: '4px 10px', fontSize: '0.75rem', fontWeight: 600,
  cursor: 'pointer',
};

export default function FriendCard({ friend, onUnfriend }) {
  const navigate = useNavigate();
  const addToast = useToastStore((s) => s.addToast);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [unfriending, setUnfriending] = useState(false);
  const [messaging, setMessaging] = useState(false);

  const handleMessage = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setMessaging(true);
    try {
      const res = await openDm(friend.id);
      const chatId = res?.data?.id;
      if (chatId) {
        navigate(`/chats/${chatId}`);
      } else {
        throw new Error('Chat ID not received from backend');
      }
    } catch (err) {
      console.error('Failed to open DM:', err);
      addToast({ message: err?.response?.data?.error || 'Something went wrong', type: 'error' });
    } finally {
      setMessaging(false);
    }
  };

  const handleUnfriend = async () => {
    setUnfriending(true);
    try {
      await unfriend(friend.id);
      addToast({ message: `Removed ${friend.first_name} from your friends.`, type: 'success' });
      setConfirmOpen(false);
      if (onUnfriend) onUnfriend(friend.id);
    } catch (err) {
      addToast({ message: err.response?.data?.error || 'Something went wrong', type: 'error' });
    } finally {
      setUnfriending(false);
    }
  };

  return (
    <>
      <div className="flex flex-col p-3" style={cardStyle}>
        <div className="flex items-center gap-3">
          <Avatar firstName={friend.first_name} lastName={friend.last_name} size="md" />
          <div className="flex-1 min-w-0">
            <p
              className="font-semibold text-sm cursor-pointer hover:underline truncate"
              style={{ color: '#F5F0EF' }}
              onClick={() => navigate(`/profile/${friend.id}`)}
            >
              {friend.first_name} {friend.last_name}
            </p>
            <p className="text-xs truncate" style={{ color: 'rgba(245,240,239,0.45)' }}>
              @{friend.username}
            </p>
            {friend.friends_since && (
              <p className="text-xs" style={{ color: 'rgba(245,240,239,0.35)' }}>
                Friends since {formatDate(friend.friends_since)}
              </p>
            )}
          </div>
        </div>
        <div className="flex gap-2 mt-2">
          <button
            type="button"
            style={ghostBtnStyle}
            onClick={handleMessage}
            disabled={messaging}
          >
            {messaging ? <Loader2 size={12} className="animate-spin" /> : <MessageCircle size={12} />}
            Message
          </button>
          <button
            type="button"
            style={dangerBtnStyle}
            onClick={() => setConfirmOpen(true)}
          >
            <UserMinus size={12} />
            Unfriend
          </button>
        </div>
      </div>

      <Modal
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title="Remove Friend"
        footer={
          <>
            <button
              type="button"
              style={ghostBtnStyle}
              onClick={() => setConfirmOpen(false)}
            >
              Cancel
            </button>
            <button
              type="button"
              style={{ ...dangerBtnStyle, background: 'rgba(139,21,32,0.2)' }}
              onClick={handleUnfriend}
              disabled={unfriending}
            >
              {unfriending && <Loader2 size={12} className="animate-spin" />}
              Remove
            </button>
          </>
        }
      >
        <p className="text-sm" style={{ color: 'rgba(245,240,239,0.7)' }}>
          Remove{' '}
          <span className="font-semibold" style={{ color: '#F5F0EF' }}>
            {friend.first_name} {friend.last_name}
          </span>{' '}
          from your friends? This cannot be undone.
        </p>
      </Modal>
    </>
  );
}
