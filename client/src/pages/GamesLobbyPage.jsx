import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Gamepad2, ChevronRight } from 'lucide-react';
import {
  getPendingInvites,
  sendInvite,
  acceptInvite,
  rejectInvite,
  getSnakeLeaderboard,
} from '../api/games';
import { getFriends } from '../api/friends';
import useAuthStore from '../store/authStore';
import useToastStore from '../store/toastStore';
import Tabs from '../components/ui/Tabs';
import Avatar from '../components/ui/Avatar';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import EmptyState from '../components/ui/EmptyState';
import Skeleton from '../components/ui/Skeleton';
import { SkeletonAvatar } from '../components/ui/Skeleton';

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
    { val: 'X', cls: 'text-[#0A0A0A]' },
    { val: '', cls: '' },
    { val: 'O', cls: 'text-[#888888]' },
    { val: '', cls: '' },
    { val: 'X', cls: 'text-[#0A0A0A]' },
    { val: '', cls: '' },
    { val: 'O', cls: 'text-[#888888]' },
    { val: '', cls: '' },
    { val: 'X', cls: 'text-[#0A0A0A]' },
  ];
  return (
    <div className="grid grid-cols-3 gap-1">
      {cells.map((c, i) => (
        <div
          key={i}
          className="w-6 h-6 border border-[#C0C0C0] rounded flex items-center justify-center text-xs font-black"
        >
          <span className={c.cls}>{c.val}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Snake preview icon ──────────────────────────────────────────────────────
function SnakePreview() {
  return (
    <div className="relative w-20 h-20 border border-[#E0E0E0] rounded bg-white overflow-hidden">
      {/* Snake body — 4 squares in a row */}
      <div className="absolute w-4 h-4 bg-[#0A0A0A] rounded-sm" style={{ left: 8, top: 32 }} />
      <div className="absolute w-4 h-4 bg-[#0A0A0A] rounded-sm" style={{ left: 24, top: 32 }} />
      <div className="absolute w-4 h-4 bg-[#0A0A0A] rounded-sm" style={{ left: 40, top: 32 }} />
      <div className="absolute w-4 h-4 bg-[#333] rounded-sm" style={{ left: 56, top: 32 }} />
      {/* Food */}
      <div className="absolute w-4 h-4 bg-[#CC0000] rounded-sm" style={{ left: 40, top: 8 }} />
    </div>
  );
}

// ─── Hangman preview icon ────────────────────────────────────────────────────
function HangmanPreview() {
  return (
    <svg width="80" height="80" viewBox="0 0 80 80" fill="none">
      <line x1="10" y1="70" x2="70" y2="70" stroke="#C0C0C0" strokeWidth="2" />
      <line x1="20" y1="10" x2="20" y2="70" stroke="#C0C0C0" strokeWidth="2" />
      <line x1="20" y1="10" x2="50" y2="10" stroke="#C0C0C0" strokeWidth="2" />
      <line x1="50" y1="10" x2="50" y2="20" stroke="#C0C0C0" strokeWidth="2" />
    </svg>
  );
}

// ─── Leaderboard Table ───────────────────────────────────────────────────────
function LeaderboardTable({ entries, currentUserId }) {
  if (!entries.length) {
    return (
      <p className="text-sm text-[#888888] text-center py-6">
        Play Snake to appear on the leaderboard!
      </p>
    );
  }
  return (
    <div className="w-full">
      {/* Header */}
      <div className="grid grid-cols-[32px_1fr_80px_80px] gap-2 px-3 py-2">
        <span className="text-[10px] uppercase tracking-widest text-[#888888] font-semibold">
          #
        </span>
        <span className="text-[10px] uppercase tracking-widest text-[#888888] font-semibold">
          Player
        </span>
        <span className="text-[10px] uppercase tracking-widest text-[#888888] font-semibold text-right">
          Score
        </span>
        <span className="text-[10px] uppercase tracking-widest text-[#888888] font-semibold text-right">
          Date
        </span>
      </div>
      <div className="divide-y divide-[#E0E0E0]">
        {entries.map((entry) => {
          const isMe = String(entry.user_id) === String(currentUserId);
          const rankColor =
            entry.rank === 1
              ? 'text-[#0A0A0A]'
              : entry.rank === 2
              ? 'text-[#404040]'
              : entry.rank === 3
              ? 'text-[#888888]'
              : 'text-[#888888]';
          return (
            <div
              key={entry.user_id ?? entry.id}
              className={`grid grid-cols-[32px_1fr_80px_80px] gap-2 items-center px-3 py-2.5 ${
                isMe
                  ? 'bg-[#F7F7F7] rounded-lg border-l-2 border-black'
                  : ''
              }`}
            >
              <span className={`font-bold text-sm ${rankColor}`}>
                {entry.rank}
              </span>
              <div className="flex items-center gap-2 min-w-0">
                <Avatar
                  size="sm"
                  firstName={entry.first_name || ''}
                  lastName={entry.last_name || ''}
                />
                <span className="text-sm text-[#0A0A0A] truncate font-medium">
                  {entry.first_name} {entry.last_name}
                </span>
              </div>
              <span className="font-bold text-sm text-right text-[#0A0A0A]">
                {entry.high_score}
              </span>
              <span className="text-xs text-[#888888] text-right">
                {entry.updated_at
                  ? new Date(entry.updated_at).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                    })
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

  // Data
  const [invites, setInvites] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [loadingInvites, setLoadingInvites] = useState(false);
  const [loadingLeaderboard, setLoadingLeaderboard] = useState(true);

  // Invite modal
  const [inviteModal, setInviteModal] = useState(false);
  const [friends, setFriends] = useState([]);
  const [friendSearch, setFriendSearch] = useState('');
  const [loadingFriends, setLoadingFriends] = useState(false);
  const [sendingInviteTo, setSendingInviteTo] = useState(null);

  // Accept / decline loading
  const [actionId, setActionId] = useState(null);

  // Load leaderboard on mount
  useEffect(() => {
    setLoadingLeaderboard(true);
    getSnakeLeaderboard()
      .then((r) => setLeaderboard(r.data || []))
      .catch(() => setLeaderboard([]))
      .finally(() => setLoadingLeaderboard(false));
  }, []);

  // Load invites when tab changes to 'matches'
  useEffect(() => {
    if (activeTab === 'matches') {
      setLoadingInvites(true);
      getPendingInvites()
        .then((r) => setInvites(r.data || []))
        .catch(() => setInvites([]))
        .finally(() => setLoadingInvites(false));
    }
  }, [activeTab]);

  // Load friends when invite modal opens
  useEffect(() => {
    if (!inviteModal) {
      setFriendSearch('');
      setFriends([]);
      return;
    }
    setLoadingFriends(true);
    getFriends()
      .then((r) => setFriends(r.data || []))
      .catch(() => setFriends([]))
      .finally(() => setLoadingFriends(false));
  }, [inviteModal]);

  // Derived: my high score
  const myHighScore = (() => {
    if (!user || !leaderboard.length) return null;
    const entry = leaderboard.find(
      (e) => String(e.user_id) === String(user.id)
    );
    return entry ? entry.high_score : null;
  })();

  // Filtered friends
  const filteredFriends = friends.filter((f) => {
    const q = friendSearch.trim().toLowerCase();
    if (!q) return true;
    const name = `${f.first_name || ''} ${f.last_name || ''} ${f.username || ''}`.toLowerCase();
    return name.includes(q);
  });

  const handleSendInvite = async (friend) => {
    setSendingInviteTo(friend.id);
    try {
      await sendInvite(friend.id);
      const name = `${friend.first_name || ''} ${friend.last_name || ''}`.trim() || friend.username || 'Friend';
      addToast({ message: `${name} has been invited!`, type: 'success' });
      setInviteModal(false);
    } catch (err) {
      addToast({
        message: err?.response?.data?.error || 'Could not send invite.',
        type: 'error',
      });
    } finally {
      setSendingInviteTo(null);
    }
  };

  const handleAccept = async (inv) => {
    setActionId(inv.id);
    try {
      const r = await acceptInvite(inv.id);
      const matchId = r.data?.id ?? r.data?.match_id;
      if (matchId) {
        navigate(`/games/ttt/${matchId}`);
      }
    } catch (err) {
      addToast({
        message: err?.response?.data?.error || 'Could not accept invite.',
        type: 'error',
      });
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
      addToast({
        message: err?.response?.data?.error || 'Could not decline invite.',
        type: 'error',
      });
    } finally {
      setActionId(null);
    }
  };

  const tabs = [
    { key: 'games', label: 'Available Games' },
    { key: 'matches', label: 'Active Matches' },
    { key: 'leaderboard', label: 'Leaderboard' },
  ];

  return (
    <div className="max-w-[800px] mx-auto pt-6 px-4 pb-16">
      <h1 className="text-2xl font-bold text-[#0A0A0A] mb-6">Games</h1>

      <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

      <div className="mt-6">
        {/* ── TAB 1: AVAILABLE GAMES ─────────────────────────── */}
        {activeTab === 'games' && (
          <div className="grid sm:grid-cols-2 gap-4">
            {/* TicTacToe */}
            <div className="bg-[#F7F7F7] border border-[#E0E0E0] rounded-lg p-5 hover:shadow-sm hover:border-[#C0C0C0] transition-all flex flex-col">
              <div className="h-24 flex items-center justify-center mb-3">
                <TicTacToePreview />
              </div>
              <h3 className="font-bold text-base text-[#0A0A0A] mb-1">
                TicTacToe
              </h3>
              <p className="text-sm text-[#404040] mb-3 flex-1">
                Challenge a friend to a match. Track wins across sessions.
              </p>
              <div className="flex items-center gap-2 mb-3">
                <Badge variant="muted" className="text-[10px]">
                  MULTIPLAYER
                </Badge>
                <span className="text-[10px] text-[#888888]">• 2 players</span>
              </div>
              <Button
                variant="primary"
                className="w-full"
                onClick={() => setInviteModal(true)}
              >
                Invite a Friend →
              </Button>
            </div>

            {/* Snake */}
            <div className="bg-[#F7F7F7] border border-[#E0E0E0] rounded-lg p-5 hover:shadow-sm hover:border-[#C0C0C0] transition-all flex flex-col">
              <div className="h-24 flex items-center justify-center mb-3">
                <SnakePreview />
              </div>
              <h3 className="font-bold text-base text-[#0A0A0A] mb-1">
                Snake
              </h3>
              <p className="text-sm text-[#404040] mb-3 flex-1">
                Classic snake. Beat your high score and compete on the
                leaderboard.
              </p>
              {myHighScore !== null && (
                <p className="text-xs text-[#888888] mb-3">
                  Your best: <span className="font-semibold text-[#0A0A0A]">{myHighScore}</span>
                </p>
              )}
              {myHighScore === null && (
                <p className="text-xs text-[#888888] mb-3">Your best: —</p>
              )}
              <div className="flex items-center gap-2 mb-3">
                <Badge variant="muted" className="text-[10px]">
                  SOLO
                </Badge>
                <span className="text-[10px] text-[#888888]">
                  • Single player
                </span>
              </div>
              <Button
                variant="primary"
                className="w-full"
                onClick={() => navigate('/games/snake')}
              >
                Play Snake →
              </Button>
            </div>

            {/* Hangman */}
            <div className="bg-[#F7F7F7] border border-[#E0E0E0] rounded-lg p-5 hover:shadow-sm hover:border-[#C0C0C0] transition-all flex flex-col">
              <div className="h-24 flex items-center justify-center mb-3">
                <HangmanPreview />
              </div>
              <h3 className="font-bold text-base text-[#0A0A0A] mb-1">
                Hangman
              </h3>
              <p className="text-sm text-[#404040] mb-3 flex-1">
                Classic word guessing game. No account data saved.
              </p>
              <div className="flex items-center gap-2 mb-3">
                <Badge variant="muted" className="text-[10px]">
                  SOLO
                </Badge>
                <span className="text-[10px] text-[#888888]">
                  • Single player
                </span>
              </div>
              <Button
                variant="primary"
                className="w-full"
                onClick={() => navigate('/games/hangman')}
              >
                Play Hangman →
              </Button>
            </div>
          </div>
        )}

        {/* ── TAB 2: ACTIVE MATCHES ──────────────────────────── */}
        {activeTab === 'matches' && (
          <div>
            {loadingInvites ? (
              <div className="space-y-3">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="bg-[#F7F7F7] border border-[#E0E0E0] rounded-lg p-4 flex items-center gap-3"
                  >
                    <SkeletonAvatar size="md" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-3 w-40" />
                      <Skeleton className="h-2 w-20" />
                    </div>
                    <Skeleton className="h-7 w-16 rounded-none" />
                    <Skeleton className="h-7 w-16 rounded-none" />
                  </div>
                ))}
              </div>
            ) : invites.length > 0 ? (
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-widest text-[#888888] mb-3">
                  PENDING INVITES
                </p>
                <div className="space-y-2">
                  {invites.map((inv) => {
                    const senderName =
                      inv.sender_name ||
                      `${inv.first_name || ''} ${inv.last_name || ''}`.trim() ||
                      `User #${inv.sender_id}`;
                    return (
                      <div
                        key={inv.id}
                        className="bg-[#F7F7F7] border border-[#E0E0E0] rounded-lg p-4 flex items-center gap-3"
                      >
                        <Avatar
                          size="md"
                          firstName={inv.first_name || ''}
                          lastName={inv.last_name || ''}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-[#0A0A0A] font-medium">
                            <span className="font-semibold">{senderName}</span>{' '}
                            challenged you to TicTacToe
                          </p>
                          <p className="text-xs text-[#888888]">
                            {relativeTime(inv.created_at)}
                          </p>
                        </div>
                        <Button
                          variant="primary"
                          size="sm"
                          loading={actionId === inv.id}
                          onClick={() => handleAccept(inv)}
                        >
                          Accept
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-[#CC0000] hover:text-[#CC0000]"
                          disabled={actionId === inv.id}
                          onClick={() => handleDecline(inv)}
                        >
                          Decline
                        </Button>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <EmptyState
                icon={Gamepad2}
                title="No active matches"
                description="Invite a friend to play!"
                action={
                  <Button variant="primary" onClick={() => setInviteModal(true)}>
                    Invite a Friend
                  </Button>
                }
              />
            )}
          </div>
        )}

        {/* ── TAB 3: LEADERBOARD ────────────────────────────── */}
        {activeTab === 'leaderboard' && (
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-[#888888] mb-4">
              SNAKE HIGH SCORES
            </p>
            {loadingLeaderboard ? (
              <div className="space-y-2">
                {[0, 1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 px-3 py-2.5 border-b border-[#E0E0E0]"
                  >
                    <Skeleton className="w-8 h-4" />
                    <SkeletonAvatar size="sm" />
                    <Skeleton className="h-3 w-32" />
                    <Skeleton className="h-3 w-10 ml-auto" />
                    <Skeleton className="h-3 w-16" />
                  </div>
                ))}
              </div>
            ) : (
              <LeaderboardTable
                entries={leaderboard}
                currentUserId={user?.id}
              />
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
            placeholder="Search friends…"
            value={friendSearch}
            onChange={(e) => setFriendSearch(e.target.value)}
            className="w-full border border-[#E0E0E0] rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-black text-[#0A0A0A] placeholder:text-[#888888]"
          />
        </div>
        <div className="max-h-[300px] overflow-y-auto -mx-2">
          {loadingFriends ? (
            <div className="space-y-1 px-2">
              {[0, 1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="flex items-center gap-2 px-3 py-2"
                >
                  <SkeletonAvatar size="sm" />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-3 w-28" />
                    <Skeleton className="h-2 w-16" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredFriends.length === 0 ? (
            <p className="text-sm text-[#888888] text-center py-6 px-2">
              {friends.length === 0
                ? 'No friends found. Add friends first!'
                : 'No friends match your search.'}
            </p>
          ) : (
            filteredFriends.map((f) => {
              const name =
                `${f.first_name || ''} ${f.last_name || ''}`.trim() ||
                f.username ||
                `User #${f.id}`;
              return (
                <button
                  key={f.id}
                  type="button"
                  className="w-full flex items-center gap-2 px-3 py-2 hover:bg-[#F7F7F7] rounded-md cursor-pointer transition-colors text-left disabled:opacity-50"
                  disabled={sendingInviteTo === f.id}
                  onClick={() => handleSendInvite(f)}
                >
                  <Avatar
                    size="sm"
                    firstName={f.first_name || ''}
                    lastName={f.last_name || ''}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[#0A0A0A] truncate">
                      {name}
                    </p>
                    {f.username && (
                      <p className="text-xs text-[#888888]">@{f.username}</p>
                    )}
                  </div>
                  {sendingInviteTo === f.id ? (
                    <span className="text-xs text-[#888888]">Sending…</span>
                  ) : (
                    <ChevronRight size={14} className="text-[#C0C0C0] shrink-0" />
                  )}
                </button>
              );
            })
          )}
        </div>
      </Modal>
    </div>
  );
}
