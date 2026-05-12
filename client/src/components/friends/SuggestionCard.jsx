import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Avatar from '../ui/Avatar';
import Button from '../ui/Button';
import { sendRequest } from '../../api/friends';
import useToastStore from '../../store/toastStore';

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
    <div className="bg-[#F7F7F7] border border-[#E0E0E0] rounded-lg p-4 flex flex-col items-center text-center hover:shadow-sm transition-shadow">
      <Avatar
        firstName={user.first_name}
        lastName={user.last_name}
        size="lg"
      />
      <p
        className="font-semibold text-sm text-[#0A0A0A] mt-2 cursor-pointer hover:underline"
        onClick={() => navigate(`/profile/${user.id}`)}
      >
        {user.first_name} {user.last_name}
      </p>
      <p className="text-xs text-[#888888]">@{user.username}</p>
      <p className="text-xs text-[#888888] mt-1">Suggested for you</p>

      {sent ? (
        <Button
          variant="ghost"
          size="sm"
          disabled
          className="w-full mt-3 text-sm"
        >
          Request Sent ✓
        </Button>
      ) : (
        <Button
          variant="primary"
          size="sm"
          onClick={handleAdd}
          loading={loading}
          className="w-full mt-3 text-sm"
        >
          Add Friend
        </Button>
      )}
    </div>
  );
}
