import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { RefreshCw, X } from 'lucide-react';
import Avatar from '../ui/Avatar';
import useToastStore from '../../store/toastStore';
import { getOnlineFriends, searchUsers } from '../../api/users';
import { getInbox, sendRequest, acceptRequest, rejectRequest } from '../../api/friends';
import { getPendingInvites, acceptInvite, rejectInvite } from '../../api/games';
import { openDm } from '../../api/chats';

function SectionLabel({ children }) {
  return (
    <p
      style={{ color: 'rgba(245,240,239,0.3)', fontSize: '0.6rem', letterSpacing: '0.14em', fontWeight: 700 }}
      className="uppercase mb-2"
    >
      {children}
    </p>
  );
}

function Hairline() {
  return <div style={{ height: '1px', background: 'rgba(255,255,255,0.07)' }} />;
}

export default function RightPanel() {
  const navigate = useNavigate();
  const addToast = useToastStore((s) => s.addToast);

  /* ── welcome banner ── */
  const [welcomeDismissed, setWelcomeDismissed] = useState(() => {
    try { return localStorage.getItem('sora-welcome-dismissed') === 'true'; } catch { return false; }
  });
  const dismissWelcome = () => {
    try { localStorage.setItem('sora-welcome-dismissed', 'true'); } catch {}
    setWelcomeDismissed(true);
  };

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
  const [suggestions, setSuggestions] = useState([]);
  const [pendingSent, setPendingSent]  = useState(new Set());
  const [loadingSugg, setLoadingSugg] = useState(false);

  const loadSuggestions = async () => {
    setLoadingSugg(true);
    try {
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

  /* ── friend requests ── */
  const [friendRequests, setFriendRequests] = useState([]);
  const [acceptingReq,   setAcceptingReq]   = useState(new Set());
  const [rejectingReq,   setRejectingReq]   = useState(new Set());

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
  const [gameInvites,   setGameInvites]   = useState([]);
  const [acceptingGame, setAcceptingGame] = useState(new Set());
  const [rejectingGame, setRejectingGame] = useState(new Set());

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

  const smallBtn = (bg, color, cursor = 'pointer') => ({
    fontSize: '0.7rem',
    fontWeight: 600,
    padding: '2px 9px',
    borderRadius: '4px',
    background: bg,
    color,
    border: 'none',
    cursor,
    transition: 'background 0.15s',
    lineHeight: '18px',
  });

  return (
    <aside
      style={{ background: '#100D0E' }}
      className="pt-4 px-4 pb-6 flex flex-col gap-5 w-full"
    >
      {/* Welcome banner */}
      {!welcomeDismissed && (
        <div
          className="relative p-3 rounded-lg"
          style={{
            background: 'rgba(139,21,32,0.1)',
            border: '1px solid rgba(139,21,32,0.28)',
          }}
        >
          <button
            type="button"
            onClick={dismissWelcome}
            className="absolute top-2 right-2"
            style={{ color: 'rgba(245,240,239,0.35)', background: 'none', border: 'none', cursor: 'pointer' }}
          >
            <X size={13} />
          </button>
          <p style={{ color: '#F5F0EF', fontSize: '0.82rem', fontWeight: 600 }}>
            Welcome to Sora Link
          </p>
          <p style={{ color: 'rgba(245,240,239,0.5)', fontSize: '0.74rem', marginTop: '3px' }}>
            Connect, play games, and share moments.
          </p>
        </div>
      )}

      {/* ── Online Now ── */}
      <section>
        <div className="flex items-center justify-between mb-2">
          <SectionLabel>Online Now</SectionLabel>
          {onlineFriends.length > 0 && (
            <span
              style={{
                background: '#1A7A4A',
                color: 'rgba(245,240,239,0.9)',
                fontSize: '10px',
                padding: '1px 6px',
                borderRadius: '10px',
                fontWeight: 600,
              }}
            >
              {onlineFriends.length}
            </span>
          )}
        </div>
        {onlineFriends.length === 0 ? (
          <p style={{ color: 'rgba(245,240,239,0.35)', fontSize: '0.78rem' }}>
            No friends online right now.
          </p>
        ) : (
          <ul className="space-y-0.5">
            {onlineFriends.slice(0, 6).map((u) => (
              <li key={u.id}>
                <button
                  type="button"
                  onClick={() => handleStartDM(u.id)}
                  className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md transition-colors text-left hover:bg-white/5"
                >
                  <Avatar firstName={u.first_name} lastName={u.last_name} userId={u.id} size="sm" online />
                  <div className="min-w-0">
                    <p style={{ color: '#F5F0EF', fontSize: '0.8rem', fontWeight: 500 }} className="truncate">
                      {u.first_name} {u.last_name}
                    </p>
                    <p style={{ color: '#1A7A4A', fontSize: '0.7rem' }}>Active now</p>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <Hairline />

      {/* ── People You May Know ── */}
      <section>
        <SectionLabel>People You May Know</SectionLabel>
        {suggestions.length === 0 && !loadingSugg ? (
          <p style={{ color: 'rgba(245,240,239,0.35)', fontSize: '0.78rem' }}>
            No suggestions right now.
          </p>
        ) : (
          <ul className="space-y-1">
            {suggestions.map((u) => (
              <li key={u.id} className="flex items-center gap-2 py-1">
                <Avatar firstName={u.first_name} lastName={u.last_name} userId={u.id} size="sm" />
                <div className="flex-1 min-w-0">
                  <p style={{ color: '#F5F0EF', fontSize: '0.8rem', fontWeight: 500 }} className="truncate">
                    {u.first_name} {u.last_name}
                  </p>
                  <p style={{ color: 'rgba(245,240,239,0.38)', fontSize: '0.7rem' }}>
                    {u.mutual_friends_count != null
                      ? `${u.mutual_friends_count} mutual`
                      : 'Suggested'}
                  </p>
                </div>
                <button
                  type="button"
                  disabled={pendingSent.has(u.id)}
                  onClick={() => handleAddFriend(u.id)}
                  style={pendingSent.has(u.id)
                    ? smallBtn('rgba(255,255,255,0.06)', 'rgba(245,240,239,0.38)', 'not-allowed')
                    : smallBtn('#8B1520', '#F5F0EF')}
                >
                  {pendingSent.has(u.id) ? 'Sent' : '+ Add'}
                </button>
              </li>
            ))}
          </ul>
        )}
        <button
          type="button"
          onClick={loadSuggestions}
          disabled={loadingSugg}
          className="mt-2 flex items-center gap-1.5 transition-colors hover:text-white/50"
          style={{ color: 'rgba(245,240,239,0.32)', fontSize: '0.72rem', background: 'none', border: 'none', cursor: 'pointer' }}
        >
          <RefreshCw size={11} className={loadingSugg ? 'animate-spin' : ''} />
          Refresh
        </button>
      </section>

      {/* ── Friend Requests ── */}
      {friendRequests.length > 0 && (
        <>
          <Hairline />
          <section>
            <div className="flex items-center gap-2 mb-2">
              <SectionLabel>Friend Requests</SectionLabel>
              <span
                style={{
                  background: '#8B1520',
                  color: '#F5F0EF',
                  fontSize: '10px',
                  padding: '1px 6px',
                  borderRadius: '10px',
                  fontWeight: 600,
                }}
              >
                {friendRequests.length}
              </span>
            </div>
            <ul className="space-y-2">
              {friendRequests.map((req) => (
                <li key={req.id} className="flex items-center gap-2 py-1">
                  <Avatar
                    firstName={req.sender_first_name || req.first_name}
                    lastName={req.sender_last_name || req.last_name}
                    userId={req.sender_id || req.id}
                    size="sm"
                  />
                  <div className="flex-1 min-w-0">
                    <p style={{ color: '#F5F0EF', fontSize: '0.8rem', fontWeight: 500 }} className="truncate">
                      {req.sender_first_name || req.first_name} {req.sender_last_name || req.last_name}
                    </p>
                    <p style={{ color: 'rgba(245,240,239,0.38)', fontSize: '0.7rem' }} className="truncate">
                      @{req.sender_username || req.username}
                    </p>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <button
                      type="button"
                      disabled={acceptingReq.has(req.id)}
                      onClick={() => handleAcceptReq(req)}
                      style={smallBtn('#8B1520', '#F5F0EF', acceptingReq.has(req.id) ? 'not-allowed' : 'pointer')}
                    >
                      {acceptingReq.has(req.id) ? '…' : 'Accept'}
                    </button>
                    <button
                      type="button"
                      disabled={rejectingReq.has(req.id)}
                      onClick={() => handleDeclineReq(req)}
                      style={smallBtn('rgba(255,255,255,0.06)', 'rgba(245,240,239,0.45)', rejectingReq.has(req.id) ? 'not-allowed' : 'pointer')}
                    >
                      {rejectingReq.has(req.id) ? '…' : 'Decline'}
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        </>
      )}

      {/* ── Game Invites ── */}
      {gameInvites.length > 0 && (
        <>
          <Hairline />
          <section>
            <SectionLabel>Game Invites</SectionLabel>
            <ul className="space-y-2">
              {gameInvites.map((invite) => (
                <li key={invite.id} className="flex items-start gap-2 py-1">
                  <Avatar
                    firstName={invite.sender_first_name || invite.first_name}
                    lastName={invite.sender_last_name || invite.last_name}
                    userId={invite.sender_id || invite.id}
                    size="sm"
                  />
                  <div className="flex-1 min-w-0">
                    <p style={{ color: 'rgba(245,240,239,0.8)', fontSize: '0.8rem' }} className="leading-snug">
                      <span style={{ fontWeight: 600, color: '#F5F0EF' }}>
                        {invite.sender_first_name || invite.first_name}
                      </span>{' '}
                      challenged you to TicTacToe
                    </p>
                    <div className="flex gap-1 mt-1.5">
                      <button
                        type="button"
                        disabled={acceptingGame.has(invite.id)}
                        onClick={() => handleAcceptGame(invite)}
                        style={smallBtn('#8B1520', '#F5F0EF', acceptingGame.has(invite.id) ? 'not-allowed' : 'pointer')}
                      >
                        {acceptingGame.has(invite.id) ? '…' : 'Accept'}
                      </button>
                      <button
                        type="button"
                        disabled={rejectingGame.has(invite.id)}
                        onClick={() => handleDeclineGame(invite)}
                        style={smallBtn('rgba(255,255,255,0.06)', 'rgba(245,240,239,0.45)', rejectingGame.has(invite.id) ? 'not-allowed' : 'pointer')}
                      >
                        {rejectingGame.has(invite.id) ? '…' : 'Decline'}
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        </>
      )}

      {/* ── Your Games ── */}
      <Hairline />
      <section>
        <SectionLabel>Your Games</SectionLabel>
        <div className="space-y-0.5">
          {[
            { label: 'Snake',        to: '/games/snake',   icon: '🐍' },
            { label: 'Hangman',      to: '/games/hangman', icon: '🎯' },
            { label: 'TicTacToe',    to: '/games',         icon: '⚔️' },
          ].map(({ label, to, icon }) => (
            <button
              key={to}
              type="button"
              onClick={() => navigate(to)}
              className="w-full flex items-center gap-2.5 px-2 py-2 rounded-md transition-colors hover:bg-white/5 text-left"
              style={{ color: 'rgba(245,240,239,0.65)', fontSize: '0.82rem', background: 'none', border: 'none', cursor: 'pointer' }}
            >
              <span style={{ fontSize: '0.95rem', lineHeight: 1 }}>{icon}</span>
              <span>{label}</span>
            </button>
          ))}
        </div>
      </section>
    </aside>
  );
}
