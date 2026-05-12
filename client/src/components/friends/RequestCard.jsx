import { useState } from 'react';
import Avatar from '../ui/Avatar';
import Button from '../ui/Button';
import { acceptRequest, rejectRequest } from '../../api/friends';
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

export default function RequestCard({ request, onAccept, onDecline }) {
  const addToast = useToastStore((s) => s.addToast);
  const [accepting, setAccepting] = useState(false);
  const [declining, setDeclining] = useState(false);

  const handleAccept = async () => {
    setAccepting(true);
    try {
      await acceptRequest(request.id);
      addToast({ message: `You and ${request.first_name} are now friends!`, type: 'success' });
      if (onAccept) onAccept(request.id);
    } catch (err) {
      addToast({ message: err.response?.data?.error || 'Something went wrong', type: 'error' });
    } finally {
      setAccepting(false);
    }
  };

  const handleDecline = async () => {
    setDeclining(true);
    try {
      await rejectRequest(request.id);
      if (onDecline) onDecline(request.id);
    } catch (err) {
      addToast({ message: err.response?.data?.error || 'Something went wrong', type: 'error' });
    } finally {
      setDeclining(false);
    }
  };

  return (
    <div className="flex items-center gap-3 p-3 bg-[#F7F7F7] border border-[#E0E0E0] rounded-lg mb-2">
      <Avatar
        firstName={request.first_name}
        lastName={request.last_name}
        size="md"
      />
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm text-[#0A0A0A] truncate">
          {request.first_name} {request.last_name}
        </p>
        <p className="text-xs text-[#888888]">@{request.username}</p>
        <p className="text-xs text-[#888888]">
          Sent {relativeTime(request.created_at)}
        </p>
      </div>
      <div className="flex gap-2 ml-auto shrink-0">
        <Button
          variant="primary"
          size="sm"
          loading={accepting}
          onClick={handleAccept}
        >
          Accept
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleDecline}
          disabled={declining}
          className="text-[#CC0000] hover:text-[#CC0000] hover:bg-[#FFF0F0]"
        >
          Decline
        </Button>
      </div>
    </div>
  );
}
