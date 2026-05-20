import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Gamepad2, ChevronRight, Clock, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import {
  getPendingInvites,
  getSentInvites,
  sendInvite,
  acceptInvite,
  rejectInvite,
  getSnakeLeaderboard,
} from '../api/games';
import { getFriends } from '../api/friends';
import useAuthStore from '../store/authStore';
import useToastStore from '../store/toastStore';
import socket from '../socket';
import Tabs from '../components/ui/Tabs';
import Avatar from '../components/ui/Avatar';
import Modal from '../components/ui/Modal';
import EmptyState from '../components/ui/EmptyState';

const GAMES_CSS = `
  @keyframes skeletonShimmer { 0% { background-position: -400px 0 } 100% { background-position: 400px 0 } }
  .skeleton-pulse {
    background: linear-gradient(90deg, rgba(255,255,255,0.06) 25%, rgba(255,255,255,0.10) 50%, rgba(255,255,255,0.06) 75%);
    background-size: 400px 100%;
    animation: skeletonShimmer 1.6s ease-in-out infinite;
  }
  .games-tabs-wrap > div { border-bottom-color: rgba(255,255,255,0.08) !important; }
  .games-tabs-wrap .text-\\[#0A0A0A\\] { color: #F5F0EF !important; }
  .games-tabs-wrap .text-\\[#888888\\] { color: rgba(245,240,239,0.45) !important; }
  .games-tabs-wrap .hover\\:text-\\[#0A0A0A\\]:hover { color: rgba(245,240,239,0.75) !important; }
  .games-tabs-wrap button::after { background-color: #8B1520 !important; }
  .games-card:hover { border-color: rgba(139,21,32,0.35) !important; }
  .games-invite-input::placeholder { color: rgba(245,240,239,0.35); }
  .games-invite-input:focus { border-color: rgba(139,21,32,0.5) !important; outline: none; }
  .games-friend-row:hover { background: rgba(255,255,255,0.06) !important; }
  @media (prefers-reduced-motion: reduce) { .skeleton-pulse { animation: none; } }
`;

const cardStyle = {
  background: 'rgba(23,18,20,0.65)',
  backdropFilter: 'blur(12px)',
  WebkitBackdropFilter: 'blur(12px)',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: 8,
  transition: 'border-color 0.15s',
};

const primaryBtnStyle = {
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 4,
  width: '100%', background: 'linear-gradient(135deg, #A8192B 0%, #8B1520 100%)',
  border: '1px solid rgba(196,30,51,0.4)', color: '#F5F0EF',
  borderRadius: 8, padding: '8px 14px', fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer',
  boxShadow: '0 2px 12px rgba(139,21,32,0.3)',
};

const ghostBtnStyle = {
  display: 'inline-flex', alignItems: 'center', gap: 4,
  background: 'none', border: '1px solid rgba(255,255,255,0.12)',
  color: 'rgba(245,240,239,0.75)', borderRadius: 8,
  padding: '5px 12px', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer',
};

const dangerBtnStyle = {
  display: 'inline-flex', alignItems: 'center', gap: 4,
  background: 'none', border: '1px solid rgba(139,21,32,0.3)',
  color: '#E87080', borderRadius: 8,
  padding: '5px 10px', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer',
};

const acceptSmBtnStyle = {
  display: 'inline-flex', alignItems: 'center', gap: 4,
  background: 'linear-gradient(135deg, #A8192B 0%, #8B1520 100%)',
  border: '1px solid rgba(196,30,51,0.4)', color: '#F5F0EF',
  borderRadius: 8, padding: '4px 10px', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer',
  boxShadow: '0 1px 8px rgba(139,21,32,0.25)',
};

const resumeBtnStyle = { ...acceptSmBtnStyle };

// ─── relative time helper ────────────────────────────────────────────────────
function relativeTime(dateStr) {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

// ─── TicTacToe preview icon ──────────────────────────────────────────────────
function TicTacToePreview() {
  const cells = [
    { val: 'X', color: '#8B1520' },
    { val: '', color: '' },
    { val: 'O', color: 'rgba(245,240,239,0.6)' },
    { val: '', color: '' },
    { val: 'X', color: '#8B1520' },
    { val: '', color: '' },
    { val: 'O', color: 'rgba(245,240,239,0.6)' },
    { val: '', color: '' },
    { val: 'X', color: '#8B1520' },
  ];
  return (
    <div className="grid grid-cols-3 gap-1">
      {cells.map((c, i) => (
        <div
          key={i}
          className="w-6 h-6 flex items-center justify-center text-xs font-black rounded"
          style={{ border: '1px solid rgba(255,255,255,0.1)', color: c.color }}
        >
          {c.val}
        </div>
      ))}
    </div>
  );
}

// ─── Snake preview icon ──────────────────────────────────────────────────────
function SnakePreview() {
  return (
    <div
      className="relative w-20 h-20 rounded overflow-hidden"
      style={{ background: '#0A0809', border: '1px solid rgba(255,255,255,0.08)' }}
    >
      <div className="absolute w-4 h-4 rounded-sm" style={{ left: 8, top: 32, background: '#8B1520' }} />
      <div className="absolute w-4 h-4 rounded-sm" style={{ left: 24, top: 32, background: '#8B1520' }} />
      <div className="absolute w-4 h-4 rounded-sm" style={{ left: 40, top: 32, background: '#8B1520' }} />
      <div className="absolute w-4 h-4 rounded-sm" style={{ left: 56, top: 32, background: 'rgba(139,21,32,0.65)' }} />
      <div className="absolute w-4 h-4 rounded-sm" style={{ left: 40, top: 8, background: '#F5C542' }} />
    </div>
  );
}

// ─── Hangman preview icon ────────────────────────────────────────────────────
function HangmanPreview() {
  return (
    <svg width="80" height="80" viewBox="0 0 80 80" fill="none">
      <line x1="10" y1="70" x2="70" y2="70" stroke="rgba(245,240,239,0.25)" strokeWidth="2" />
      <line x1="20" y1="10" x2="20" y2="70" stroke="rgba(245,240,239,0.25)" strokeWidth="2" />
      <line x1="20" y1="10" x2="50" y2="10" stroke="rgba(245,240,239,0.25)" strokeWidth="2" />
      <line x1="50" y1="10" x2="50" y2="20" stroke="rgba(245,240,239,0.25)" strokeWidth="2" />
    </svg>
  );
}

// ─── Leaderboard Table ───────────────────────────────────────────────────────
function LeaderboardTable({ entries, currentUserId }) {
  if (!entries.length) {
    return (
      <p className="text-sm text-center py-6" style={{ color: 'rgba(245,240,239,0.45)' }}>
        Play Snake to appear on the leaderboard!
      </p>
    );
  }

  const rankColor = (rank) =>
    rank === 1 ? '#F5C542'
    : rank === 2 ? 'rgba(245,240,239,0.75)'
    : rank === 3 ? 'rgba(245,240,239,0.55)'
    : 'rgba(245,240,239,0.4)';

  return (
    <div className="w-full">
      <div className="grid grid-cols-[32px_1fr_80px_80px] gap-2 px-3 py-2">
        {['#', 'Player', 'Score', 'Date'].map((h, i) => (
          <span
            key={h}
            className={`text-[10px] uppercase tracking-widest font-semibold${i >= 2 ? ' text-right' : ''}`}
            style={{ color: 'rgba(245,240,239,0.4)' }}
          >
            {h}
          </span>
        ))}
      </div>
      <div>
        {entries.map((entry) => {
          const isMe = String(entry.user_id) === String(currentUserId);
          return (
            <div
              key={entry.user_id ?? entry.id}
              className="grid grid-cols-[32px_1fr_80px_80px] gap-2 items-center px-3 py-2.5"
              style={
                isMe
                  ? { background: 'rgba(139,21,32,0.12)', borderLeft: '2px solid #8B1520', borderBottom: '1px solid rgba(255,255,255,0.06)' }
                  : { borderBottom: '1px solid rgba(255,255,255,0.06)' }
              }
            >
              <span className="font-bold text-sm" style={{ color: rankColor(entry.rank) }}>
                {entry.rank}
              </span>
              <div className="flex items-center gap-2 min-w-0">
                <Avatar size="sm" firstName={entry.first_name || ''} lastName={entry.last_name || ''} />
                <span className="text-sm truncate font-medium" style={{ color: '#F5F0EF' }}>
                  {entry.first_name} {entry.last_name}
                </span>
              </div>
              <span className="font-bold text-sm text-right" style={{ color: '#F5F0EF' }}>
                {entry.high_score}
              </span>
              <span className="text-xs text-right" style={{ color: 'rgba(245,240,239,0.45)' }}>
                {entry.updated_at
                  ? new Date(entry.updated_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                  : '—'}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Main component ──────────────────────────────────────────────────────────
export default function GamesLobbyPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { addToast } = useToastStore();

  const [activeTab, setActiveTab] = useState('games');

  const [invites, setInvites] = useState([]);
  const [sentInvites, setSentInvites] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [loadingInvites, setLoadingInvites] = useState(false);
  const [loadingSentInvites, setLoadingSentInvites] = useState(false);
  const [loadingLeaderboard, setLoadingLeaderboard] = useState(true);

  const [inviteModal, setInviteModal] = useState(false);
  const [friends, setFriends] = useState([]);
  const [friendSearch, setFriendSearch] = useState('');
  const [loadingFriends, setLoadingFriends] = useState(false);
  const [sendingInviteTo, setSendingInviteTo] = useState(null);

  const [actionId, setActionId] = useState(null);

  const loadPendingInvites = useCallback(() => {
    setLoadingInvites(true);
    getPendingInvites()
      .then((r) => setInvites(r.data || []))
      .catch(() => setInvites([]))
      .finally(() => setLoadingInvites(false));
  }, []);

  const loadSentInvites = useCallback(() => {
    setLoadingSentInvites(true);
    getSentInvites()
      .then((r) => setSentInvites(r.data || []))
      .catch(() => setSentInvites([]))
      .finally(() => setLoadingSentInvites(false));
  }, []);

  useEffect(() => {
    setLoadingLeaderboard(true);
    getSnakeLeaderboard()
      .then((r) => setLeaderboard(r.data || []))
      .catch(() => setLeaderboard([]))
      .finally(() => setLoadingLeaderboard(false));
  }, []);

  useEffect(() => {
    if (activeTab === 'matches') {
      loadPendingInvites();
      loadSentInvites();
    }
  }, [activeTab, loadPendingInvites, loadSentInvites]);

  useEffect(() => {
    const onAccepted = ({ match_id }) => {
      addToast({ message: 'Your friend accepted! Starting game…', type: 'success' });
      loadSentInvites();
      navigate(`/games/ttt/${match_id}`);
    };
    socket.on('invite:accepted', onAccepted);
    return () => socket.off('invite:accepted', onAccepted);
  }, [navigate, addToast, loadSentInvites]);

  useEffect(() => {
    if (!inviteModal) { setFriendSearch(''); setFriends([]); return; }
    setLoadingFriends(true);
    getFriends()
      .then((r) => setFriends(r.data || []))
      .catch(() => setFriends([]))
      .finally(() => setLoadingFriends(false));
  }, [inviteModal]);

  const myHighScore = (() => {
    if (!user || !leaderboard.length) return null;
    const entry = leaderboard.find((e) => String(e.user_id) === String(user.id));
    return entry ? entry.high_score : null;
  })();

  const filteredFriends = friends.filter((f) => {
    const q = friendSearch.trim().toLowerCase();
    if (!q) return true;
    return `${f.first_name || ''} ${f.last_name || ''} ${f.username || ''}`.toLowerCase().includes(q);
  });

  const handleSendInvite = async (friend) => {
    setSendingInviteTo(friend.id);
    try {
      await sendInvite(friend.id);
      const name = `${friend.first_name || ''} ${friend.last_name || ''}`.trim() || friend.username || 'Friend';
      addToast({ message: `Invite sent! Waiting for ${name} to accept.`, type: 'success' });
      setInviteModal(false);
      loadSentInvites();
    } catch (err) {
      addToast({ message: String(err?.response?.data?.error || err?.message || 'Could not send invite.'), type: 'error' });
    } finally {
      setSendingInviteTo(null);
    }
  };

  const handleAccept = async (inv) => {
    setActionId(inv.id);
    try {
      const r = await acceptInvite(inv.id);
      const matchId = r.data?.match_id;
      if (matchId) {
        navigate(`/games/ttt/${matchId}`);
      } else {
        addToast({ message: 'Game started but match ID missing.', type: 'error' });
      }
    } catch (err) {
      addToast({ message: err?.response?.data?.error || 'Could not accept invite.', type: 'error' });
    } finally {
      setActionId(null);
    }
  };

  const handleDecline = async (inv) => {
    setActionId(inv.id);
    try {
      await rejectInvite(inv.id);
      setInvites((prev) => prev.filter((i) => i.id !== inv.id));
      addToast({ message: 'Invite declined.', type: 'info' });
    } catch (err) {
      addToast({ message: err?.response?.data?.error || 'Could not decline invite.', type: 'error' });
    } finally {
      setActionId(null);
    }
  };

  const tabs = [
    { key: 'games', label: 'Available Games' },
    { key: 'matches', label: 'Active Matches' },
    { key: 'leaderboard', label: 'Leaderboard' },
  ];

  const skeletonInviteRow = (
    <div className="p-4 flex items-center gap-3" style={cardStyle}>
      <div className="skeleton-pulse w-10 h-10 rounded-full shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="skeleton-pulse h-3 w-40 rounded" />
        <div className="skeleton-pulse h-2 w-20 rounded" />
      </div>
      <div className="skeleton-pulse h-7 w-16 rounded" />
      <div className="skeleton-pulse h-7 w-16 rounded" />
    </div>
  );

  const statusStyleMap = {
    PENDING:  { icon: Clock,       style: { background: 'rgba(168,105,10,0.15)', border: '1px solid rgba(168,105,10,0.3)', color: '#F5C542' }, label: 'Pending' },
    ACCEPTED: { icon: CheckCircle, style: { background: 'rgba(26,122,74,0.15)', border: '1px solid rgba(26,122,74,0.35)', color: '#4ABA80' }, label: 'Accepted' },
    REJECTED: { icon: XCircle,     style: { background: 'rgba(139,21,32,0.15)', border: '1px solid rgba(139,21,32,0.35)', color: '#E87080' }, label: 'Declined' },
  };

  return (
    <>
      <style>{GAMES_CSS}</style>
      <div className="max-w-[800px] mx-auto pt-6 px-4 pb-16">
        <h1
          className="mb-6"
          style={{
            fontFamily: "'Cormorant Garamond', serif",
            fontWeight: 700,
            fontSize: '1.65rem',
            color: '#F5F0EF',
          }}
        >
          Games
        </h1>

        <div className="games-tabs-wrap">
          <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />
        </div>

        <div className="mt-6">
          {/* ── TAB 1: AVAILABLE GAMES ─────────────────────────── */}
          {activeTab === 'games' && (
            <div className="grid sm:grid-cols-2 gap-4">
              {/* TicTacToe */}
              <div className="games-card p-5 flex flex-col" style={cardStyle}>
                <div className="h-24 flex items-center justify-center mb-3">
                  <TicTacToePreview />
                </div>
                <h3 className="font-bold text-base mb-1" style={{ color: '#F5F0EF' }}>
                  TicTacToe
                </h3>
                <p className="text-sm mb-3 flex-1" style={{ color: 'rgba(245,240,239,0.55)' }}>
                  Challenge a friend to a match. Track wins across sessions.
                </p>
                <div className="flex items-center gap-2 mb-3">
                  <span
                    className="text-[10px] font-semibold px-2 py-0.5 rounded"
                    style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(245,240,239,0.55)' }}
                  >
                    MULTIPLAYER
                  </span>
                  <span className="text-[10px]" style={{ color: 'rgba(245,240,239,0.35)' }}>• 2 players</span>
                </div>
                <button type="button" style={primaryBtnStyle} onClick={() => setInviteModal(true)}>
                  Invite a Friend →
                </button>
              </div>

              {/* Snake */}
              <div className="games-card p-5 flex flex-col" style={cardStyle}>
                <div className="h-24 flex items-center justify-center mb-3">
                  <SnakePreview />
                </div>
                <h3 className="font-bold text-base mb-1" style={{ color: '#F5F0EF' }}>
                  Snake
                </h3>
                <p className="text-sm mb-3 flex-1" style={{ color: 'rgba(245,240,239,0.55)' }}>
                  Classic snake. Beat your high score and compete on the leaderboard.
                </p>
                {myHighScore !== null ? (
                  <p className="text-xs mb-3" style={{ color: 'rgba(245,240,239,0.45)' }}>
                    Your best: <span className="font-semibold" style={{ color: '#F5F0EF' }}>{myHighScore}</span>
                  </p>
                ) : (
                  <p className="text-xs mb-3" style={{ color: 'rgba(245,240,239,0.35)' }}>Your best: —</p>
                )}
                <div className="flex items-center gap-2 mb-3">
                  <span
                    className="text-[10px] font-semibold px-2 py-0.5 rounded"
                    style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(245,240,239,0.55)' }}
                  >
                    SOLO
                  </span>
                  <span className="text-[10px]" style={{ color: 'rgba(245,240,239,0.35)' }}>• Single player</span>
                </div>
                <button type="button" style={primaryBtnStyle} onClick={() => navigate('/games/snake')}>
                  Play Snake →
                </button>
              </div>

              {/* Hangman */}
              <div className="games-card p-5 flex flex-col" style={cardStyle}>
                <div className="h-24 flex items-center justify-center mb-3">
                  <HangmanPreview />
                </div>
                <h3 className="font-bold text-base mb-1" style={{ color: '#F5F0EF' }}>
                  Hangman
                </h3>
                <p className="text-sm mb-3 flex-1" style={{ color: 'rgba(245,240,239,0.55)' }}>
                  Classic word guessing game. No account data saved.
                </p>
                <div className="flex items-center gap-2 mb-3">
                  <span
                    className="text-[10px] font-semibold px-2 py-0.5 rounded"
                    style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(245,240,239,0.55)' }}
                  >
                    SOLO
                  </span>
                  <span className="text-[10px]" style={{ color: 'rgba(245,240,239,0.35)' }}>• Single player</span>
                </div>
                <button type="button" style={primaryBtnStyle} onClick={() => navigate('/games/hangman')}>
                  Play Hangman →
                </button>
              </div>
            </div>
          )}

          {/* ── TAB 2: ACTIVE MATCHES ──────────────────────────── */}
          {activeTab === 'matches' && (
            <div className="space-y-8">
              {/* Received Invites */}
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-widest mb-3" style={{ color: 'rgba(245,240,239,0.45)' }}>
                  RECEIVED INVITES
                </p>
                {loadingInvites ? (
                  <div className="space-y-3">
                    {[0, 1].map((i) => <div key={i}>{skeletonInviteRow}</div>)}
                  </div>
                ) : invites.length > 0 ? (
                  <div className="space-y-2">
                    {invites.map((inv) => {
                      const senderName =
                        inv.sender_username ||
                        `${inv.first_name || ''} ${inv.last_name || ''}`.trim() ||
                        `User #${inv.sender_id}`;
                      return (
                        <div key={inv.id} className="p-4 flex items-center gap-3" style={cardStyle}>
                          <Avatar size="md" firstName={inv.first_name || ''} lastName={inv.last_name || ''} />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium" style={{ color: '#F5F0EF' }}>
                              <span className="font-semibold">{senderName}</span>{' '}challenged you to TicTacToe
                            </p>
                            <p className="text-xs" style={{ color: 'rgba(245,240,239,0.45)' }}>{relativeTime(inv.created_at)}</p>
                          </div>
                          <button type="button" style={acceptSmBtnStyle} disabled={actionId === inv.id} onClick={() => handleAccept(inv)}>
                            {actionId === inv.id ? <Loader2 size={12} className="animate-spin" /> : null}
                            Accept
                          </button>
                          <button type="button" style={dangerBtnStyle} disabled={actionId === inv.id} onClick={() => handleDecline(inv)}>
                            Decline
                          </button>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-sm py-4 text-center" style={{ color: 'rgba(245,240,239,0.45)' }}>
                    No pending invites from friends.
                  </p>
                )}
              </div>

              {/* Sent Invites */}
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-widest mb-3" style={{ color: 'rgba(245,240,239,0.45)' }}>
                  SENT INVITES
                </p>
                {loadingSentInvites ? (
                  <div className="space-y-3">
                    {[0, 1].map((i) => (
                      <div key={i} className="p-4 flex items-center gap-3" style={cardStyle}>
                        <div className="skeleton-pulse w-10 h-10 rounded-full shrink-0" />
                        <div className="flex-1 space-y-2">
                          <div className="skeleton-pulse h-3 w-40 rounded" />
                          <div className="skeleton-pulse h-2 w-20 rounded" />
                        </div>
                        <div className="skeleton-pulse h-5 w-20 rounded-full" />
                      </div>
                    ))}
                  </div>
                ) : sentInvites.length > 0 ? (
                  <div className="space-y-2">
                    {sentInvites.map((inv) => {
                      const receiverName =
                        inv.receiver_username ||
                        `${inv.first_name || ''} ${inv.last_name || ''}`.trim() ||
                        `User #${inv.receiver_id}`;
                      const statusCfg = statusStyleMap[inv.status] || {
                        icon: Clock,
                        style: { background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(245,240,239,0.55)' },
                        label: inv.status,
                      };
                      const StatusIcon = statusCfg.icon;
                      return (
                        <div key={inv.id} className="p-4 flex items-center gap-3" style={cardStyle}>
                          <Avatar size="md" firstName={inv.first_name || ''} lastName={inv.last_name || ''} />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium" style={{ color: '#F5F0EF' }}>
                              You invited <span className="font-semibold">{receiverName}</span> to TicTacToe
                            </p>
                            <p className="text-xs" style={{ color: 'rgba(245,240,239,0.45)' }}>{relativeTime(inv.created_at)}</p>
                          </div>
                          <span
                            className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full"
                            style={statusCfg.style}
                          >
                            <StatusIcon size={11} />{statusCfg.label}
                          </span>
                          {inv.status === 'ACCEPTED' && inv.match_id && (
                            <button type="button" style={resumeBtnStyle} onClick={() => navigate(`/games/ttt/${inv.match_id}`)}>
                              Resume →
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <EmptyState
                    icon={Gamepad2}
                    title="No sent invites yet"
                    description="Challenge a friend to TicTacToe!"
                    action={
                      <button type="button" style={{ ...acceptSmBtnStyle, width: 'auto' }} onClick={() => setInviteModal(true)}>
                        Invite a Friend
                      </button>
                    }
                  />
                )}
              </div>
            </div>
          )}

          {/* ── TAB 3: LEADERBOARD ────────────────────────────── */}
          {activeTab === 'leaderboard' && (
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest mb-4" style={{ color: 'rgba(245,240,239,0.45)' }}>
                SNAKE HIGH SCORES
              </p>
              {loadingLeaderboard ? (
                <div className="space-y-2">
                  {[0, 1, 2, 3, 4].map((i) => (
                    <div key={i} className="flex items-center gap-3 px-3 py-2.5" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                      <div className="skeleton-pulse w-8 h-4 rounded" />
                      <div className="skeleton-pulse w-6 h-6 rounded-full shrink-0" />
                      <div className="skeleton-pulse h-3 w-32 rounded" />
                      <div className="skeleton-pulse h-3 w-10 ml-auto rounded" />
                      <div className="skeleton-pulse h-3 w-16 rounded" />
                    </div>
                  ))}
                </div>
              ) : (
                <LeaderboardTable entries={leaderboard} currentUserId={user?.id} />
              )}
            </div>
          )}
        </div>

        {/* ── INVITE MODAL ─────────────────────────────────────── */}
        <Modal
          open={inviteModal}
          onClose={() => setInviteModal(false)}
          title="Invite to TicTacToe"
        >
          <div className="mb-3">
            <input
              type="text"
              className="games-invite-input w-full rounded-md px-3 py-2 text-sm"
              style={{
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
                color: '#F5F0EF',
              }}
              placeholder="Search friends…"
              value={friendSearch}
              onChange={(e) => setFriendSearch(e.target.value)}
            />
          </div>
          <div className="max-h-[300px] overflow-y-auto -mx-2">
            {loadingFriends ? (
              <div className="space-y-1 px-2">
                {[0, 1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center gap-2 px-3 py-2">
                    <div className="skeleton-pulse w-7 h-7 rounded-full shrink-0" />
                    <div className="flex-1 space-y-1.5">
                      <div className="skeleton-pulse h-3 w-28 rounded" />
                      <div className="skeleton-pulse h-2 w-16 rounded" />
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredFriends.length === 0 ? (
              <p className="text-sm text-center py-6 px-2" style={{ color: 'rgba(245,240,239,0.45)' }}>
                {friends.length === 0 ? 'No friends found. Add friends first!' : 'No friends match your search.'}
              </p>
            ) : (
              filteredFriends.map((f) => {
                const name = `${f.first_name || ''} ${f.last_name || ''}`.trim() || f.username || `User #${f.id}`;
                return (
                  <button
                    key={f.id}
                    type="button"
                    className="games-friend-row w-full flex items-center gap-2 px-3 py-2 rounded-md cursor-pointer text-left transition-colors disabled:opacity-50"
                    style={{ background: 'none', border: 'none' }}
                    disabled={sendingInviteTo === f.id}
                    onClick={() => handleSendInvite(f)}
                  >
                    <Avatar size="sm" firstName={f.first_name || ''} lastName={f.last_name || ''} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate" style={{ color: '#F5F0EF' }}>{name}</p>
                      {f.username && (
                        <p className="text-xs" style={{ color: 'rgba(245,240,239,0.45)' }}>@{f.username}</p>
                      )}
                    </div>
                    {sendingInviteTo === f.id ? (
                      <Loader2 size={14} className="animate-spin shrink-0" style={{ color: 'rgba(245,240,239,0.45)' }} />
                    ) : (
                      <ChevronRight size={14} className="shrink-0" style={{ color: 'rgba(245,240,239,0.3)' }} />
                    )}
                  </button>
                );
              })
            )}
          </div>
        </Modal>
      </div>
    </>
  );
}
