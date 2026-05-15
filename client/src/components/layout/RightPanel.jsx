import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { RefreshCw } from 'lucide-react';
import Avatar from '../ui/Avatar';
import Badge from '../ui/Badge';
import Button from '../ui/Button';
import Divider from '../ui/Divider';
import useToastStore from '../../store/toastStore';
import { getOnlineFriends, searchUsers } from '../../api/users';
import { getInbox, sendRequest, acceptRequest, rejectRequest } from '../../api/friends';
import { getPendingInvites, acceptInvite, rejectInvite } from '../../api/games';
import { openDm } from '../../api/chats';

/* ── tiny helper ─────────────────────────────────── */
function SectionLabel({ children }) {
  return (
    <p className="text-[10px] font-bold tracking-widest text-[#888888] uppercase mb-2">
      {children}
    </p>
  );
}

export default function RightPanel() {
  const navigate = useNavigate();
  const addToast = useToastStore((s) => s.addToast);

  /* ── online friends ── */
  const [onlineFriends, setOnlineFriends] = useState([]);

  useEffect(() => {
    const fetchOnline = async () => {
      try {
        const res = await getOnlineFriends();
        setOnlineFriends(res.data || []);
      } catch {}
    };
    fetchOnline();
    const timer = setInterval(fetchOnline, 30_000);
    return () => clearInterval(timer);
  }, []);

  const handleStartDM = async (userId) => {
    try {
      const res = await openDm(userId);
      navigate(`/chats/${res.data.id}`);
    } catch {
      addToast({ message: 'Could not open chat.', type: 'error' });
    }
  };

  /* ── suggestions ── */
  const [suggestions,     setSuggestions]     = useState([]);
  const [pendingSent,     setPendingSent]      = useState(new Set());
  const [loadingSugg,     setLoadingSugg]      = useState(false);

  const loadSuggestions = async () => {
    setLoadingSugg(true);
    try {
      // getSuggestions is in the friends API
      const { getSuggestions } = await import('../../api/friends');
      const res = await getSuggestions();
      setSuggestions((res.data || []).slice(0, 4));
    } catch {}
    setLoadingSugg(false);
  };

  useEffect(() => { loadSuggestions(); }, []);

  const handleAddFriend = async (id) => {
    try {
      await sendRequest(id);
      setPendingSent((s) => new Set([...s, id]));
    } catch {
      addToast({ message: 'Could not send request.', type: 'error' });
    }
  };

  /* ── friend requests (inbox) ── */
  const [friendRequests,    setFriendRequests]    = useState([]);
  const [acceptingReq,      setAcceptingReq]      = useState(new Set());
  const [rejectingReq,      setRejectingReq]      = useState(new Set());

  useEffect(() => {
    (async () => {
      try {
        const res = await getInbox();
        setFriendRequests(res.data || []);
      } catch {}
    })();
  }, []);

  const handleAcceptReq = async (req) => {
    setAcceptingReq((s) => new Set([...s, req.id]));
    try {
      await acceptRequest(req.id);
      setFriendRequests((prev) => prev.filter((r) => r.id !== req.id));
    } catch {
      addToast({ message: 'Could not accept request.', type: 'error' });
    }
    setAcceptingReq((s) => { const n = new Set(s); n.delete(req.id); return n; });
  };

  const handleDeclineReq = async (req) => {
    setRejectingReq((s) => new Set([...s, req.id]));
    try {
      await rejectRequest(req.id);
      setFriendRequests((prev) => prev.filter((r) => r.id !== req.id));
    } catch {
      addToast({ message: 'Could not decline request.', type: 'error' });
    }
    setRejectingReq((s) => { const n = new Set(s); n.delete(req.id); return n; });
  };

  /* ── game invites ── */
  const [gameInvites,    setGameInvites]    = useState([]);
  const [acceptingGame,  setAcceptingGame]  = useState(new Set());
  const [rejectingGame,  setRejectingGame]  = useState(new Set());

  useEffect(() => {
    (async () => {
      try {
        const res = await getPendingInvites();
        setGameInvites(res.data || []);
      } catch {}
    })();
  }, []);

  const handleAcceptGame = async (invite) => {
    setAcceptingGame((s) => new Set([...s, invite.id]));
    try {
      const res = await acceptInvite(invite.id);
      const matchId = res.data?.match_id || res.data?.id;
      setGameInvites((prev) => prev.filter((g) => g.id !== invite.id));
      if (matchId) navigate(`/games/ttt/${matchId}`);
    } catch {
      addToast({ message: 'Could not accept invite.', type: 'error' });
    }
    setAcceptingGame((s) => { const n = new Set(s); n.delete(invite.id); return n; });
  };

  const handleDeclineGame = async (invite) => {
    setRejectingGame((s) => new Set([...s, invite.id]));
    try {
      await rejectInvite(invite.id);
      setGameInvites((prev) => prev.filter((g) => g.id !== invite.id));
    } catch {
      addToast({ message: 'Could not decline invite.', type: 'error' });
    }
    setRejectingGame((s) => { const n = new Set(s); n.delete(invite.id); return n; });
  };

  return (
    <aside className="pt-6 px-4 pb-6 flex flex-col gap-6 bg-white w-full">
      {/* ── Widget 1: Online Friends ── */}
      <section>
        <div className="flex items-center justify-between mb-2">
          <SectionLabel>Online Now</SectionLabel>
          {onlineFriends.length > 0 && (
            <Badge variant="success">{onlineFriends.length}</Badge>
          )}
        </div>
        {onlineFriends.length === 0 ? (
          <p className="text-xs text-[#888888]">None of your friends are online.</p>
        ) : (
          <ul className="space-y-0.5">
            {onlineFriends.slice(0, 6).map((u) => (
              <li key={u.id}>
                <button
                  type="button"
                  onClick={() => handleStartDM(u.id)}
                  className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-[#F7F7F7] transition-colors text-left"
                >
                  <Avatar firstName={u.first_name} lastName={u.last_name} size="sm" online />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-[#0A0A0A] truncate">
                      {u.first_name} {u.last_name}
                    </p>
                    <p className="text-xs text-[#1A7A4A]">Active now</p>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <Divider className="my-0" />

      {/* ── Widget 2: Suggested Friends ── */}
      <section>
        <SectionLabel>People You May Know</SectionLabel>
        {suggestions.length === 0 && !loadingSugg ? (
          <p className="text-xs text-[#888888]">No suggestions right now.</p>
        ) : (
          <ul className="space-y-1">
            {suggestions.map((u) => (
              <li key={u.id} className="flex items-center gap-2 py-1.5">
                <Avatar firstName={u.first_name} lastName={u.last_name} size="sm" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[#0A0A0A] truncate">
                    {u.first_name} {u.last_name}
                  </p>
                  <p className="text-xs text-[#888888]">
                    {u.mutual_friends_count != null
                      ? `${u.mutual_friends_count} mutual friend${u.mutual_friends_count !== 1 ? 's' : ''}`
                      : 'Suggested'}
                  </p>
                </div>
                <Button
                  variant={pendingSent.has(u.id) ? 'ghost' : 'secondary'}
                  size="sm"
                  disabled={pendingSent.has(u.id)}
                  onClick={() => handleAddFriend(u.id)}
                >
                  {pendingSent.has(u.id) ? 'Pending…' : 'Add'}
                </Button>
              </li>
            ))}
          </ul>
        )}
        <button
          type="button"
          onClick={loadSuggestions}
          disabled={loadingSugg}
          className="mt-2 flex items-center gap-1.5 text-xs text-[#888888] hover:text-[#0A0A0A] transition-colors"
        >
          <RefreshCw size={12} className={loadingSugg ? 'animate-spin' : ''} />
          Refresh
        </button>
      </section>

      {/* ── Widget 3: Friend Requests ── */}
      {friendRequests.length > 0 && (
        <>
          <Divider className="my-0" />
          <section>
            <div className="flex items-center gap-2 mb-2">
              <SectionLabel>Friend Requests</SectionLabel>
              <Badge variant="default">{friendRequests.length}</Badge>
            </div>
            <ul className="space-y-2">
              {friendRequests.map((req) => (
                <li key={req.id} className="flex items-center gap-2 py-1.5">
                  <Avatar
                    firstName={req.sender_first_name || req.first_name}
                    lastName={req.sender_last_name || req.last_name}
                    size="sm"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[#0A0A0A] truncate">
                      {req.sender_first_name || req.first_name} {req.sender_last_name || req.last_name}
                    </p>
                    <p className="text-xs text-[#888888] truncate">
                      @{req.sender_username || req.username}
                    </p>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button
                      variant="primary"
                      size="sm"
                      loading={acceptingReq.has(req.id)}
                      onClick={() => handleAcceptReq(req)}
                    >
                      Accept
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-[#CC0000] hover:bg-[#FFF5F5]"
                      loading={rejectingReq.has(req.id)}
                      onClick={() => handleDeclineReq(req)}
                    >
                      Decline
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        </>
      )}

      {/* ── Widget 4: Game Invites ── */}
      {gameInvites.length > 0 && (
        <>
          <Divider className="my-0" />
          <section>
            <SectionLabel>Game Invites</SectionLabel>
            <ul className="space-y-2">
              {gameInvites.map((invite) => (
                <li key={invite.id} className="flex items-start gap-2 py-1.5">
                  <Avatar
                    firstName={invite.sender_first_name || invite.first_name}
                    lastName={invite.sender_last_name || invite.last_name}
                    size="sm"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-[#0A0A0A] leading-snug">
                      <span className="font-semibold">
                        {invite.sender_first_name || invite.first_name}
                      </span>{' '}
                      challenged you to TicTacToe
                    </p>
                    <div className="flex gap-1 mt-1.5">
                      <Button
                        variant="primary"
                        size="sm"
                        loading={acceptingGame.has(invite.id)}
                        onClick={() => handleAcceptGame(invite)}
                      >
                        Accept
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        loading={rejectingGame.has(invite.id)}
                        onClick={() => handleDeclineGame(invite)}
                      >
                        Decline
                      </Button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        </>
      )}
    </aside>
  );
}
