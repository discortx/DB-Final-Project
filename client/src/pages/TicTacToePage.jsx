import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getMatch, makeMove, rematch } from '../api/games';
import useAuthStore from '../store/authStore';
import socket from '../socket';

const WINS = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];

function findWinLine(board, mark) {
  return WINS.find((c) => c.every((i) => board[i] === mark)) || null;
}

export default function TicTacToePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const me = useAuthStore((s) => s.user);
  const [match, setMatch]   = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState('');

  const load = async () => {
    try { const r = await getMatch(id); setMatch(r.data); } catch {}
  };

  useEffect(() => {
    load();
    const onMove = (updated) => {
      if (String(updated.id) !== String(id)) return;
      setMatch(updated);
    };
    socket.on('game:move', onMove);
    return () => socket.off('game:move', onMove);
  }, [id]);

  const handleMove = async (pos) => {
    if (!match || match.state !== 'CONTINUE') return;
    if (match.current_turn_id !== me.id) return;
    const board = match.board.split('');
    if (board[pos] !== '-') return;
    setLoading(true);
    setError('');
    try {
      const r = await makeMove(id, pos);
      setMatch(r.data);
    } catch (e) {
      setError(e.response?.data?.error || 'Move failed');
    }
    setLoading(false);
  };

  const handleRematch = async () => {
    try { const r = await rematch(id); setMatch(r.data); } catch {}
  };

  if (!match) return <div className="text-center py-12 text-gray-400">Loading…</div>;

  const board    = match.board.split('');
  const myMark   = match.player1_id === me.id ? match.player1_mark : match.player2_mark;
  const oppMark  = myMark === 'X' ? 'O' : 'X';
  const isMyTurn = match.current_turn_id === me.id && match.state === 'CONTINUE';
  const winLine  = match.state === 'WIN' ? (findWinLine(board, myMark) || findWinLine(board, oppMark)) : null;

  const cellCls = (i) => {
    const val   = board[i];
    const isWin = winLine?.includes(i);
    return `w-24 h-24 text-4xl font-bold rounded-xl border-2 transition-all flex items-center justify-center cursor-pointer select-none
      ${isWin ? 'bg-green-100 border-green-400' :
        val !== '-' ? 'bg-gray-50 border-gray-200 cursor-default' :
        isMyTurn ? 'bg-white border-gray-200 hover:bg-blue-50 hover:border-blue-400' :
        'bg-gray-50 border-gray-200 cursor-default'}`;
  };

  const cellColor = (v) => v === 'X' ? 'text-blue-600' : v === 'O' ? 'text-red-500' : '';

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <button onClick={() => navigate('/games')} className="text-sm text-gray-500 hover:text-gray-700">← Back to Lobby</button>

      {/* Scoreboard */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
        <div className="flex justify-around text-center">
          <div>
            <p className="text-2xl font-bold text-blue-600">{match.player1_score}</p>
            <p className="text-xs text-gray-500">Player 1 ({match.player1_mark})</p>
          </div>
          <div>
            <p className="text-sm text-gray-400 mt-2">Game {match.total_games + (match.state === 'CONTINUE' ? 1 : 0)}</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-red-500">{match.player2_score}</p>
            <p className="text-xs text-gray-500">Player 2 ({match.player2_mark})</p>
          </div>
        </div>
      </div>

      {/* Status */}
      <div className={`text-center py-2 rounded-lg text-sm font-medium ${
        match.state === 'WIN' ? (match.winner_id === me.id ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700') :
        match.state === 'DRAW' ? 'bg-yellow-100 text-yellow-700' :
        isMyTurn ? 'bg-blue-50 text-blue-700' : 'bg-gray-50 text-gray-500'
      }`}>
        {match.state === 'WIN'  && (match.winner_id === me.id ? '🎉 You won!' : '😔 You lost')}
        {match.state === 'DRAW' && "🤝 It's a draw!"}
        {match.state === 'CONTINUE' && (isMyTurn ? '✨ Your turn' : '⏳ Waiting for opponent…')}
      </div>

      {/* Board */}
      <div className="grid grid-cols-3 gap-2 mx-auto w-fit">
        {board.map((val, i) => (
          <button
            key={i}
            onClick={() => handleMove(i)}
            disabled={loading || !isMyTurn || val !== '-'}
            className={cellCls(i)}
          >
            <span className={cellColor(val)}>{val !== '-' ? val : ''}</span>
          </button>
        ))}
      </div>

      {error && <p className="text-center text-sm text-red-600">{error}</p>}

      {match.state !== 'CONTINUE' && (
        <div className="flex gap-3 justify-center">
          <button onClick={handleRematch} className="px-6 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">
            Play Again
          </button>
          <button onClick={() => navigate('/games')} className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200">
            Back to Lobby
          </button>
        </div>
      )}
    </div>
  );
}
