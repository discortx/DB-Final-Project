import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageCircle, UserMinus } from 'lucide-react';
import Avatar from '../ui/Avatar';
import Button from '../ui/Button';
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
        throw new Error("Chat ID not received from backend");
      }
    } catch (err) {
      console.error("Failed to open DM:", err);
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
      <div className="flex flex-col p-3 bg-[#F7F7F7] border border-[#E0E0E0] rounded-lg hover:shadow-sm transition-shadow">
        <div className="flex items-center gap-3">
          <Avatar
            firstName={friend.first_name}
            lastName={friend.last_name}
            size="md"
          />
          <div className="flex-1 min-w-0">
            <p
              className="font-semibold text-sm text-[#0A0A0A] cursor-pointer hover:underline truncate"
              onClick={() => navigate(`/profile/${friend.id}`)}
            >
              {friend.first_name} {friend.last_name}
            </p>
            <p className="text-xs text-[#888888] truncate">@{friend.username}</p>
            {friend.friends_since && (
              <p className="text-xs text-[#888888]">
                Friends since {formatDate(friend.friends_since)}
              </p>
            )}
          </div>
        </div>
        <div className="flex gap-2 mt-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleMessage}
            loading={messaging}
            className="flex items-center gap-1"
          >
            <MessageCircle size={14} />
            Message
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setConfirmOpen(true)}
            className="flex items-center gap-1 text-[#CC0000] hover:text-[#CC0000] hover:bg-[#FFF0F0]"
          >
            <UserMinus size={14} />
            Unfriend
          </Button>
        </div>
      </div>

      <Modal
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title="Remove Friend"
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirmOpen(false)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleUnfriend} loading={unfriending}>
              Remove
            </Button>
          </>
        }
      >
        <p className="text-sm text-[#404040]">
          Remove{' '}
          <span className="font-semibold text-[#0A0A0A]">
            {friend.first_name} {friend.last_name}
          </span>{' '}
          from your friends? This cannot be undone.
        </p>
      </Modal>
    </>
  );
}
