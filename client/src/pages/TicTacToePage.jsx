import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { getMatch, makeMove, rematch } from '../api/games';
import { getUserById } from '../api/users';
import useAuthStore from '../store/authStore';
import useToastStore from '../store/toastStore';
import socket from '../socket';
import Avatar from '../components/ui/Avatar';
import Button from '../components/ui/Button';
import Skeleton from '../components/ui/Skeleton';
import { SkeletonAvatar } from '../components/ui/Skeleton';
import TicTacToeBoard from '../components/games/TicTacToeBoard';

// ─── Win lines ───────────────────────────────────────────────────────────────
const WIN_LINES = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],
  [0, 3, 6], [1, 4, 7], [2, 5, 8],
  [0, 4, 8], [2, 4, 6],
];

function findWinLine(board, mark) {
  return (
    WIN_LINES.find((line) => line.every((i) => board[i] === mark)) || null
  );
}

// ─── Confetti ────────────────────────────────────────────────────────────────
function Confetti({ active }) {
  const pieces = useRef(
    Array.from({ length: 20 }, (_, i) => ({
      id: i,
      x: 40 + Math.random() * 20, // start near center %
      tx: (Math.random() - 0.5) * 200, // translate x px
      ty: -(80 + Math.random() * 120), // translate y px (upward)
      delay: Math.random() * 0.3,
      hue: Math.floor(Math.random() * 360),
    }))
  ).current;

  if (!active) return null;

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden z-20">
      {pieces.map((p) => (
        <div
          key={p.id}
          className="absolute w-2 h-2 rounded-sm"
          style={{
            left: `${p.x}%`,
            top: '50%',
            backgroundColor: `hsl(${p.hue}, 70%, 50%)`,
            animation: `confettifly 1s ${p.delay}s ease-out forwards`,
            '--tx': `${p.tx}px`,
            '--ty': `${p.ty}px`,
          }}
        />
      ))}
      <style>{`
        @keyframes confettifly {
          0%   { transform: translate(0, 0) rotate(0deg); opacity: 1; }
          100% { transform: translate(var(--tx), var(--ty)) rotate(720deg); opacity: 0; }
        }
      `}</style>
    </div>
  );
}

// ─── Main page ───────────────────────────────────────────────────────────────
export default function TicTacToePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user: me } = useAuthStore();
  const { addToast } = useToastStore();

  const [match, setMatch] = useState(null);
  const [loading, setLoading] = useState(true);
  const [moveLoading, setMoveLoading] = useState(false);
  const [error, setError] = useState('');

  // Player info
  const [player1, setPlayer1] = useState(null);
  const [player2, setPlayer2] = useState(null);

  // Confetti
  const [confettiActive, setConfettiActive] = useState(false);
  const prevStateRef = useRef(null);

  // Load match
  const loadMatch = useCallback(async () => {
    try {
      const r = await getMatch(id);
      setMatch(r.data);
    } catch {
      setError('Failed to load match.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadMatch();
  }, [loadMatch]);

  // Load player info when match arrives
  useEffect(() => {
    if (!match) return;
    const fetchPlayer = async (playerId, setter) => {
      try {
        const r = await getUserById(playerId);
        setter(r.data);
      } catch {}
    };
    if (match.player1_id) fetchPlayer(match.player1_id, setPlayer1);
    if (match.player2_id) fetchPlayer(match.player2_id, setPlayer2);
  }, [match?.player1_id, match?.player2_id]); // eslint-disable-line

  // Socket listener
  useEffect(() => {
    const onMove = (updated) => {
      if (String(updated.id) !== String(id)) return;
      setMatch(updated);
    };
    socket.on('game:move', onMove);
    return () => socket.off('game:move', onMove);
  }, [id]);

  // Trigger confetti when I win
  useEffect(() => {
    if (!match || !me) return;
    const prev = prevStateRef.current;
    if (
      prev !== 'WIN' &&
      match.state === 'WIN' &&
      String(match.winner_id) === String(me.id)
    ) {
      setConfettiActive(true);
      setTimeout(() => setConfettiActive(false), 1500);
    }
    prevStateRef.current = match.state;
  }, [match, me]);

  const handleMove = async (pos) => {
    if (!match || match.state !== 'CONTINUE') return;
    if (String(match.current_turn_id) !== String(me?.id)) return;
    const board = match.board.split('');
    if (board[pos] !== '-') return;
    setMoveLoading(true);
    setError('');
    try {
      const r = await makeMove(id, pos);
      setMatch(r.data);
    } catch (e) {
      const msg = e?.response?.data?.error || 'Move failed.';
      setError(msg);
      addToast({ message: msg, type: 'error' });
    } finally {
      setMoveLoading(false);
    }
  };

  const handleRematch = async () => {
    try {
      const r = await rematch(id);
      setMatch(r.data);
      setError('');
    } catch (e) {
      addToast({
        message: e?.response?.data?.error || 'Could not start rematch.',
        type: 'error',
      });
    }
  };

  // ── Loading ──
  if (loading) {
    return (
      <div className="max-w-[540px] mx-auto pt-8 pb-12 px-4">
        <div className="flex items-center gap-1 text-sm text-[#888888] mb-6">
          <ChevronLeft size={16} />
          Back to Games
        </div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex flex-col items-center gap-1 flex-1">
            <SkeletonAvatar size="md" />
            <Skeleton className="h-3 w-20 mt-1" />
          </div>
          <span className="text-[#888888] font-bold text-lg mx-4">VS</span>
          <div className="flex flex-col items-center gap-1 flex-1">
            <SkeletonAvatar size="md" />
            <Skeleton className="h-3 w-20 mt-1" />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2 mx-auto" style={{ maxWidth: 360 }}>
          {Array.from({ length: 9 }).map((_, i) => (
            <Skeleton key={i} className="rounded-md" style={{ minHeight: 100 }} />
          ))}
        </div>
      </div>
    );
  }

  if (!match) {
    return (
      <div className="max-w-[540px] mx-auto pt-8 px-4 text-center">
        <p className="text-[#888888]">Match not found.</p>
        <Button variant="primary" className="mt-4" onClick={() => navigate('/games')}>
          Back to Games
        </Button>
      </div>
    );
  }

  // ── Derived values ──
  const board = match.board || '---------';
  const cells = board.split('');

  const isPlayer1 = String(match.player1_id) === String(me?.id);
  const myMark = isPlayer1 ? match.player1_mark : match.player2_mark;
  const oppMark = myMark === 'X' ? 'O' : 'X';

  const isMyTurn =
    match.state === 'CONTINUE' &&
    String(match.current_turn_id) === String(me?.id);

  const winLine =
    match.state === 'WIN'
      ? findWinLine(cells, myMark) || findWinLine(cells, oppMark)
      : null;

  const iWon =
    match.state === 'WIN' && String(match.winner_id) === String(me?.id);
  const iLost =
    match.state === 'WIN' && String(match.winner_id) !== String(me?.id);

  // Player display helpers
  const p1 = player1;
  const p2 = player2;
  const p1Name =
    p1
      ? `${p1.first_name || ''} ${p1.last_name || ''}`.trim() || p1.username || `Player 1`
      : `Player 1`;
  const p2Name =
    p2
      ? `${p2.first_name || ''} ${p2.last_name || ''}`.trim() || p2.username || `Player 2`
      : `Player 2`;

  // Is it player1's turn?
  const p1Active = String(match.current_turn_id) === String(match.player1_id) && match.state === 'CONTINUE';
  const p2Active = String(match.current_turn_id) === String(match.player2_id) && match.state === 'CONTINUE';

  // Status bar styling
  const statusConfig = (() => {
    if (match.state === 'CONTINUE') {
      if (isMyTurn) {
        return {
          cls: 'bg-[#F7F7F7] border border-[#E0E0E0]',
          text: `Your turn — place your ${myMark}`,
        };
      }
      return {
        cls: 'bg-[#F7F7F7] border border-[#E0E0E0] text-[#888888]',
        text: 'Waiting for opponent…',
      };
    }
    if (match.state === 'WIN') {
      if (iWon) {
        return {
          cls: 'bg-[#F0FDF4] border border-[#1A7A4A] text-[#1A7A4A]',
          text: 'You won this round!',
        };
      }
      return {
        cls: 'bg-[#FFF5F5] border border-[#CC0000] text-[#CC0000]',
        text: 'You lost this round.',
      };
    }
    if (match.state === 'DRAW') {
      return {
        cls: 'bg-[#F7F7F7] border border-[#E0E0E0] text-[#404040]',
        text: "It's a draw!",
      };
    }
    return { cls: 'bg-[#F7F7F7] border border-[#E0E0E0]', text: '' };
  })();

  const roundNumber =
    match.total_games + (match.state === 'CONTINUE' ? 1 : 0);

  return (
    <div className="max-w-[540px] mx-auto pt-8 pb-12 px-4 relative">
      {/* Confetti overlay */}
      <Confetti active={confettiActive} />

      {/* Back link */}
      <Link
        to="/games"
        className="inline-flex items-center gap-1 text-sm text-[#888888] hover:text-[#0A0A0A] mb-6 transition-colors"
      >
        <ChevronLeft size={16} />
        Back to Games
      </Link>

      {/* Round label */}
      <p className="text-[10px] font-semibold uppercase tracking-widest text-[#888888] text-center mb-2">
        Round {roundNumber}
      </p>

      {/* Players header */}
      <div className="flex items-center justify-between mb-4">
        {/* Player 1 */}
        <div
          className={`flex flex-col items-center gap-1 flex-1 p-2 rounded-lg transition-all ${
            p1Active ? 'ring-2 ring-black bg-[#F7F7F7]' : ''
          }`}
        >
          {!p1 ? (
            <>
              <SkeletonAvatar size="md" />
              <Skeleton className="h-3 w-20 mt-1" />
            </>
          ) : (
            <>
              <Avatar
                size="md"
                firstName={p1.first_name || ''}
                lastName={p1.last_name || ''}
              />
              <span className="font-semibold text-sm text-[#0A0A0A] text-center leading-tight">
                {p1Name}
              </span>
              <span className="bg-[#0A0A0A] text-white text-xs px-2 py-0.5 rounded-full font-mono">
                {match.player1_mark}
              </span>
            </>
          )}
        </div>

        {/* VS divider */}
        <span className="text-[#888888] font-bold text-lg mx-4 shrink-0">
          VS
        </span>

        {/* Player 2 */}
        <div
          className={`flex flex-col items-center gap-1 flex-1 p-2 rounded-lg transition-all ${
            p2Active ? 'ring-2 ring-black bg-[#F7F7F7]' : ''
          }`}
        >
          {!p2 ? (
            <>
              <SkeletonAvatar size="md" />
              <Skeleton className="h-3 w-20 mt-1" />
            </>
          ) : (
            <>
              <Avatar
                size="md"
                firstName={p2.first_name || ''}
                lastName={p2.last_name || ''}
              />
              <span className="font-semibold text-sm text-[#0A0A0A] text-center leading-tight">
                {p2Name}
              </span>
              <span className="bg-[#0A0A0A] text-white text-xs px-2 py-0.5 rounded-full font-mono">
                {match.player2_mark}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Score */}
      <div className="text-center my-4">
        <p className="font-black text-4xl tracking-tight text-[#0A0A0A]">
          {match.player1_score}&nbsp;&nbsp;–&nbsp;&nbsp;{match.player2_score}
        </p>
        <p className="text-xs text-[#888888] mt-1">
          {match.total_games} game{match.total_games !== 1 ? 's' : ''} played
        </p>
      </div>

      {/* Status bar */}
      <div
        className={`my-4 py-2 px-4 rounded-lg text-sm font-medium text-center ${statusConfig.cls}`}
      >
        {statusConfig.text}
      </div>

      {/* Board */}
      <TicTacToeBoard
        board={board}
        winLine={winLine}
        isMyTurn={isMyTurn}
        myMark={myMark}
        onCellClick={handleMove}
        loading={moveLoading}
      />

      {/* Error */}
      {error && (
        <p className="text-center text-sm text-[#CC0000] mt-3">{error}</p>
      )}

      {/* Post-game actions */}
      {match.state !== 'CONTINUE' && (
        <div className="flex gap-3 justify-center mt-6">
          <Button variant="primary" onClick={handleRematch}>
            Play Again
          </Button>
          <Button variant="secondary" onClick={() => navigate('/games')}>
            Back to Games
          </Button>
        </div>
      )}
    </div>
  );
}
