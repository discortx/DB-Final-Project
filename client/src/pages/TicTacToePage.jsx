import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { getMatch, makeMove, proposeRematch, acceptRematch, declineRematch } from '../api/games';
import { getUserById } from '../api/users';
import useAuthStore from '../store/authStore';
import useToastStore from '../store/toastStore';
import socket from '../socket';
import Avatar from '../components/ui/Avatar';
import TicTacToeBoard from '../components/games/TicTacToeBoard';

const TTT_CSS = `
  @keyframes skeletonShimmer { 0% { background-position: -400px 0 } 100% { background-position: 400px 0 } }
  .skeleton-pulse {
    background: linear-gradient(90deg, rgba(255,255,255,0.06) 25%, rgba(255,255,255,0.10) 50%, rgba(255,255,255,0.06) 75%);
    background-size: 400px 100%;
    animation: skeletonShimmer 1.6s ease-in-out infinite;
  }
  @media (prefers-reduced-motion: reduce) { .skeleton-pulse { animation: none; } }
`;

// ─── Win lines ───────────────────────────────────────────────────────────────
const WIN_LINES = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],
  [0, 3, 6], [1, 4, 7], [2, 5, 8],
  [0, 4, 8], [2, 4, 6],
];

function findWinLine(board, mark) {
  return WIN_LINES.find((line) => line.every((i) => board[i] === mark)) || null;
}

// ─── Confetti ────────────────────────────────────────────────────────────────
function Confetti({ active }) {
  const pieces = useRef(
    Array.from({ length: 20 }, (_, i) => ({
      id: i,
      x: 40 + Math.random() * 20,
      tx: (Math.random() - 0.5) * 200,
      ty: -(80 + Math.random() * 120),
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
  const [player1, setPlayer1] = useState(null);
  const [player2, setPlayer2] = useState(null);
  const [confettiActive, setConfettiActive] = useState(false);
  const prevStateRef = useRef(null);
  const [rematchProposedByMe, setRematchProposedByMe] = useState(false);
  const [rematchProposedByOpponent, setRematchProposedByOpponent] = useState(false);

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

  useEffect(() => { loadMatch(); }, [loadMatch]);

  useEffect(() => {
    if (!match) return;
    const fetchPlayer = async (playerId, setter) => {
      try { const r = await getUserById(playerId); setter(r.data); } catch {}
    };
    if (match.player1_id) fetchPlayer(match.player1_id, setPlayer1);
    if (match.player2_id) fetchPlayer(match.player2_id, setPlayer2);
  }, [match?.player1_id, match?.player2_id]); // eslint-disable-line

  useEffect(() => {
    if (!match || !me) return;
    if (!match.rematch_proposed_by) {
      setRematchProposedByMe(false);
      setRematchProposedByOpponent(false);
      return;
    }
    if (String(match.rematch_proposed_by) === String(me.id)) {
      setRematchProposedByMe(true);
      setRematchProposedByOpponent(false);
    } else {
      setRematchProposedByMe(false);
      setRematchProposedByOpponent(true);
    }
  }, [match?.rematch_proposed_by, me?.id]); // eslint-disable-line

  useEffect(() => {
    const onMove = (updated) => {
      if (String(updated.id) !== String(id)) return;
      setMatch(updated);
    };
    socket.on('game:move', onMove);
    return () => socket.off('game:move', onMove);
  }, [id]);

  useEffect(() => {
    const onProposed = ({ match_id }) => {
      if (String(match_id) !== String(id)) return;
      setRematchProposedByOpponent(true);
      addToast({ message: 'Opponent wants a rematch!', type: 'info' });
    };
    const onDeclined = ({ match_id }) => {
      if (String(match_id) !== String(id)) return;
      setRematchProposedByMe(false);
      addToast({ message: 'Opponent declined the rematch.', type: 'info' });
    };
    socket.on('rematch:proposed', onProposed);
    socket.on('rematch:declined', onDeclined);
    return () => { socket.off('rematch:proposed', onProposed); socket.off('rematch:declined', onDeclined); };
  }, [id, addToast]);

  useEffect(() => {
    if (!match || !me) return;
    const prev = prevStateRef.current;
    if (prev !== 'WIN' && match.state === 'WIN' && String(match.winner_id) === String(me.id)) {
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

  const handleProposeRematch = async () => {
    try { await proposeRematch(id); setRematchProposedByMe(true); }
    catch (e) { addToast({ message: e?.response?.data?.error || 'Could not propose rematch.', type: 'error' }); }
  };

  const handleAcceptRematch = async () => {
    try { const r = await acceptRematch(id); setMatch(r.data); setError(''); }
    catch (e) { addToast({ message: e?.response?.data?.error || 'Could not accept rematch.', type: 'error' }); }
  };

  const handleDeclineRematch = async () => {
    try { await declineRematch(id); setRematchProposedByOpponent(false); navigate('/games'); }
    catch (e) { addToast({ message: e?.response?.data?.error || 'Could not decline rematch.', type: 'error' }); }
  };

  // ── Loading ──
  if (loading) {
    return (
      <>
        <style>{TTT_CSS}</style>
        <div className="max-w-[540px] mx-auto pt-8 pb-12 px-4">
          <div className="flex items-center gap-1 text-sm mb-6" style={{ color: 'rgba(245,240,239,0.4)' }}>
            <ChevronLeft size={16} />
            Back to Games
          </div>
          <div className="flex items-center justify-between mb-4">
            <div className="flex flex-col items-center gap-1 flex-1">
              <div className="skeleton-pulse w-10 h-10 rounded-full" />
              <div className="skeleton-pulse h-3 w-20 mt-1 rounded" />
            </div>
            <span className="font-bold text-lg mx-4" style={{ color: 'rgba(245,240,239,0.35)' }}>VS</span>
            <div className="flex flex-col items-center gap-1 flex-1">
              <div className="skeleton-pulse w-10 h-10 rounded-full" />
              <div className="skeleton-pulse h-3 w-20 mt-1 rounded" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 mx-auto" style={{ maxWidth: 360 }}>
            {Array.from({ length: 9 }).map((_, i) => (
              <div key={i} className="skeleton-pulse rounded-md" style={{ minHeight: 100 }} />
            ))}
          </div>
        </div>
      </>
    );
  }

  if (!match) {
    return (
      <>
        <style>{TTT_CSS}</style>
        <div className="max-w-[540px] mx-auto pt-8 px-4 text-center">
          <p style={{ color: 'rgba(245,240,239,0.45)' }}>Match not found.</p>
          <button
            type="button"
            className="mt-4"
            style={{
              background: '#8B1520', border: 'none', color: '#F5F0EF',
              borderRadius: 6, padding: '8px 18px', fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer',
            }}
            onClick={() => navigate('/games')}
          >
            Back to Games
          </button>
        </div>
      </>
    );
  }

  // ── Derived values ──
  const board = match.board || '---------';
  const cells = board.split('');
  const isPlayer1 = String(match.player1_id) === String(me?.id);
  const myMark = isPlayer1 ? match.player1_mark : match.player2_mark;
  const oppMark = myMark === 'X' ? 'O' : 'X';
  const isMyTurn = match.state === 'CONTINUE' && String(match.current_turn_id) === String(me?.id);
  const winLine = match.state === 'WIN' ? findWinLine(cells, myMark) || findWinLine(cells, oppMark) : null;
  const iWon = match.state === 'WIN' && String(match.winner_id) === String(me?.id);
  const iLost = match.state === 'WIN' && String(match.winner_id) !== String(me?.id);

  const p1 = player1;
  const p2 = player2;
  const p1Name = p1 ? `${p1.first_name || ''} ${p1.last_name || ''}`.trim() || p1.username || 'Player 1' : 'Player 1';
  const p2Name = p2 ? `${p2.first_name || ''} ${p2.last_name || ''}`.trim() || p2.username || 'Player 2' : 'Player 2';

  const p1Active = String(match.current_turn_id) === String(match.player1_id) && match.state === 'CONTINUE';
  const p2Active = String(match.current_turn_id) === String(match.player2_id) && match.state === 'CONTINUE';

  const activePlayerStyle = {
    outline: '2px solid rgba(139,21,32,0.6)',
    outlineOffset: '-2px',
    background: 'rgba(139,21,32,0.1)',
    borderRadius: 8,
  };

  const statusConfig = (() => {
    if (match.state === 'CONTINUE') {
      if (isMyTurn) return {
        style: { background: 'rgba(139,21,32,0.12)', border: '1px solid rgba(139,21,32,0.3)', color: '#F5F0EF' },
        text: `Your turn — place your ${myMark}`,
      };
      return {
        style: { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', color: 'rgba(245,240,239,0.55)' },
        text: 'Waiting for opponent…',
      };
    }
    if (match.state === 'WIN') {
      if (iWon) return {
        style: { background: 'rgba(26,122,74,0.15)', border: '1px solid rgba(26,122,74,0.35)', color: '#4ABA80' },
        text: 'You won this round!',
      };
      return {
        style: { background: 'rgba(139,21,32,0.15)', border: '1px solid rgba(139,21,32,0.35)', color: '#E87080' },
        text: 'You lost this round.',
      };
    }
    if (match.state === 'DRAW') return {
      style: { background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(245,240,239,0.65)' },
      text: "It's a draw!",
    };
    return { style: { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }, text: '' };
  })();

  const roundNumber = match.total_games + (match.state === 'CONTINUE' ? 1 : 0);

  const primaryBtnStyle = {
    display: 'inline-flex', alignItems: 'center',
    background: '#8B1520', border: 'none', color: '#F5F0EF',
    borderRadius: 6, padding: '8px 18px', fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer',
  };
  const secondaryBtnStyle = {
    display: 'inline-flex', alignItems: 'center',
    background: 'none', border: '1px solid rgba(255,255,255,0.15)',
    color: 'rgba(245,240,239,0.75)', borderRadius: 6,
    padding: '8px 18px', fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer',
  };

  return (
    <>
      <style>{TTT_CSS}</style>
      <div className="max-w-[540px] mx-auto pt-8 pb-12 px-4 relative">
        <Confetti active={confettiActive} />

        {/* Back link */}
        <Link
          to="/games"
          className="inline-flex items-center gap-1 text-sm mb-6 transition-colors hover:text-white/70"
          style={{ color: 'rgba(245,240,239,0.4)' }}
        >
          <ChevronLeft size={16} />
          Back to Games
        </Link>

        {/* Round label */}
        <p className="text-[10px] font-semibold uppercase tracking-widest text-center mb-2" style={{ color: 'rgba(245,240,239,0.45)' }}>
          Round {roundNumber}
        </p>

        {/* Players header */}
        <div className="flex items-center justify-between mb-4">
          <div
            className="flex flex-col items-center gap-1 flex-1 p-2 transition-all"
            style={p1Active ? activePlayerStyle : {}}
          >
            {!p1 ? (
              <>
                <div className="skeleton-pulse w-10 h-10 rounded-full" />
                <div className="skeleton-pulse h-3 w-20 mt-1 rounded" />
              </>
            ) : (
              <>
                <Avatar size="md" firstName={p1.first_name || ''} lastName={p1.last_name || ''} />
                <span className="font-semibold text-sm text-center leading-tight" style={{ color: '#F5F0EF' }}>
                  {p1Name}
                </span>
                <span
                  className="text-xs px-2 py-0.5 rounded-full font-mono"
                  style={{ background: 'rgba(139,21,32,0.2)', color: '#8B1520', border: '1px solid rgba(139,21,32,0.3)' }}
                >
                  {match.player1_mark}
                </span>
              </>
            )}
          </div>

          <span className="font-bold text-lg mx-4 shrink-0" style={{ color: 'rgba(245,240,239,0.35)' }}>VS</span>

          <div
            className="flex flex-col items-center gap-1 flex-1 p-2 transition-all"
            style={p2Active ? activePlayerStyle : {}}
          >
            {!p2 ? (
              <>
                <div className="skeleton-pulse w-10 h-10 rounded-full" />
                <div className="skeleton-pulse h-3 w-20 mt-1 rounded" />
              </>
            ) : (
              <>
                <Avatar size="md" firstName={p2.first_name || ''} lastName={p2.last_name || ''} />
                <span className="font-semibold text-sm text-center leading-tight" style={{ color: '#F5F0EF' }}>
                  {p2Name}
                </span>
                <span
                  className="text-xs px-2 py-0.5 rounded-full font-mono"
                  style={{ background: 'rgba(139,21,32,0.2)', color: '#8B1520', border: '1px solid rgba(139,21,32,0.3)' }}
                >
                  {match.player2_mark}
                </span>
              </>
            )}
          </div>
        </div>

        {/* Score */}
        <div className="text-center my-4">
          <p className="font-black text-4xl tracking-tight" style={{ color: '#F5F0EF' }}>
            {match.player1_score}&nbsp;&nbsp;–&nbsp;&nbsp;{match.player2_score}
          </p>
          <p className="text-xs mt-1" style={{ color: 'rgba(245,240,239,0.45)' }}>
            {match.total_games} game{match.total_games !== 1 ? 's' : ''} played
          </p>
        </div>

        {/* Status bar */}
        <div className="my-4 py-2 px-4 rounded-lg text-sm font-medium text-center" style={statusConfig.style}>
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
          <p className="text-center text-sm mt-3" style={{ color: '#E87080' }}>{error}</p>
        )}

        {/* Post-game actions */}
        {match.state !== 'CONTINUE' && (
          <div className="flex flex-col items-center gap-3 mt-6">
            {!rematchProposedByMe && !rematchProposedByOpponent && (
              <div className="flex gap-3">
                <button type="button" style={primaryBtnStyle} onClick={handleProposeRematch}>
                  Play Again
                </button>
                <button type="button" style={secondaryBtnStyle} onClick={() => navigate('/games')}>
                  Back to Games
                </button>
              </div>
            )}

            {rematchProposedByMe && !rematchProposedByOpponent && (
              <div className="flex flex-col items-center gap-2">
                <p className="text-sm" style={{ color: 'rgba(245,240,239,0.55)' }}>Waiting for opponent to accept…</p>
                <button type="button" style={secondaryBtnStyle} onClick={() => navigate('/games')}>
                  Back to Games
                </button>
              </div>
            )}

            {rematchProposedByOpponent && !rematchProposedByMe && (
              <div className="flex flex-col items-center gap-2">
                <p className="text-sm font-medium" style={{ color: '#F5F0EF' }}>Opponent wants a rematch!</p>
                <div className="flex gap-3">
                  <button type="button" style={primaryBtnStyle} onClick={handleAcceptRematch}>Accept</button>
                  <button type="button" style={secondaryBtnStyle} onClick={handleDeclineRematch}>Decline</button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}
