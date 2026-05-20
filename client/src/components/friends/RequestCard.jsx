import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import Avatar from '../ui/Avatar';
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

const cardStyle = {
  background: 'rgba(23,18,20,0.65)',
  backdropFilter: 'blur(12px)',
  WebkitBackdropFilter: 'blur(12px)',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: 8,
};

const acceptBtnStyle = {
  display: 'inline-flex', alignItems: 'center', gap: 4,
  background: '#8B1520', border: 'none', color: '#F5F0EF',
  borderRadius: 6, padding: '4px 12px',
  fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer',
};

const declineBtnStyle = {
  display: 'inline-flex', alignItems: 'center', gap: 4,
  background: 'none', border: '1px solid rgba(139,21,32,0.3)',
  color: '#E87080', borderRadius: 6, padding: '4px 10px',
  fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer',
};

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
    <div className="flex items-center gap-3 p-3 mb-2" style={cardStyle}>
      <Avatar firstName={request.first_name} lastName={request.last_name} size="md" />
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm truncate" style={{ color: '#F5F0EF' }}>
          {request.first_name} {request.last_name}
        </p>
        <p className="text-xs" style={{ color: 'rgba(245,240,239,0.45)' }}>
          @{request.username}
        </p>
        <p className="text-xs" style={{ color: 'rgba(245,240,239,0.35)' }}>
          Sent {relativeTime(request.created_at)}
        </p>
      </div>
      <div className="flex gap-2 ml-auto shrink-0">
        <button
          type="button"
          style={acceptBtnStyle}
          onClick={handleAccept}
          disabled={accepting}
        >
          {accepting && <Loader2 size={12} className="animate-spin" />}
          Accept
        </button>
        <button
          type="button"
          style={declineBtnStyle}
          onClick={handleDecline}
          disabled={declining}
        >
          {declining && <Loader2 size={12} className="animate-spin" />}
          Decline
        </button>
      </div>
    </div>
  );
}
