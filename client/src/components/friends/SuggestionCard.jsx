import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, UserPlus, Check } from 'lucide-react';
import Avatar from '../ui/Avatar';
import { sendRequest } from '../../api/friends';
import useToastStore from '../../store/toastStore';

const cardStyle = {
  background: 'rgba(23,18,20,0.65)',
  backdropFilter: 'blur(12px)',
  WebkitBackdropFilter: 'blur(12px)',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: 8,
};

const addBtnStyle = {
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 4,
  width: '100%', background: '#8B1520', border: 'none', color: '#F5F0EF',
  borderRadius: 6, padding: '6px 12px', fontSize: '0.8rem', fontWeight: 600,
  cursor: 'pointer', marginTop: 12,
};

const sentBtnStyle = {
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 4,
  width: '100%',
  background: 'rgba(255,255,255,0.05)',
  border: '1px solid rgba(255,255,255,0.1)',
  color: 'rgba(245,240,239,0.45)',
  borderRadius: 6, padding: '6px 12px', fontSize: '0.8rem', fontWeight: 600,
  cursor: 'default', marginTop: 12,
};

export default function SuggestionCard({ user, onSend }) {
  const navigate = useNavigate();
  const addToast = useToastStore((s) => s.addToast);
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleAdd = async () => {
    setLoading(true);
    try {
      await sendRequest(user.id);
      setSent(true);
      if (onSend) onSend(user.id);
    } catch (err) {
      addToast({ message: err.response?.data?.error || 'Something went wrong', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 flex flex-col items-center text-center" style={cardStyle}>
      <Avatar firstName={user.first_name} lastName={user.last_name} size="lg" />
      <p
        className="font-semibold text-sm mt-2 cursor-pointer hover:underline"
        style={{ color: '#F5F0EF' }}
        onClick={() => navigate(`/profile/${user.id}`)}
      >
        {user.first_name} {user.last_name}
      </p>
      <p className="text-xs" style={{ color: 'rgba(245,240,239,0.45)' }}>
        @{user.username}
      </p>
      <p className="text-xs mt-1" style={{ color: 'rgba(245,240,239,0.35)' }}>
        Suggested for you
      </p>

      {sent ? (
        <button type="button" style={sentBtnStyle} disabled>
          <Check size={12} />
          Request Sent
        </button>
      ) : (
        <button type="button" style={addBtnStyle} onClick={handleAdd} disabled={loading}>
          {loading ? <Loader2 size={12} className="animate-spin" /> : <UserPlus size={12} />}
          Add Friend
        </button>
      )}
    </div>
  );
}
