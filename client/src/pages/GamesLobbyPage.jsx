import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { sendInvite, acceptInvite, rejectInvite, getLeaderboard } from '../api/games';
import { searchUsers } from '../api/users';
import api from '../api/client';

export default function GamesLobbyPage() {
  const navigate = useNavigate();
  const [invites, setInvites]   = useState([]);
  const [board, setBoard]       = useState([]);
  const [query, setQuery]       = useState('');
  const [results, setResults]   = useState([]);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/api/games/invites/pending').catch(() => ({ data: [] })),
      getLeaderboard(),
    ]).then(([inv, lb]) => {
      setInvites(inv.data);
      setBoard(lb.data);
    }).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!query.trim()) { setResults([]); return; }
    const t = setTimeout(async () => {
      try { const r = await searchUsers(query); setResults(r.data); } catch {}
    }, 300);
    return () => clearTimeout(t);
  }, [query]);

  const handleInvite = async (userId) => {
    await sendInvite(userId);
    setQuery(''); setResults([]);
    alert('Invite sent!');
  };

  const handleAccept = async (id) => {
    const r = await acceptInvite(id);
    navigate(`/games/ttt/${r.data.id}`);
  };

  const handleReject = async (id) => {
    await rejectInvite(id);
    setInvites((i) => i.filter((x) => x.id !== id));
  };

  if (loading) return <div className="text-center py-12 text-gray-400">Loading…</div>;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Games</h1>

      {/* Invite to TicTacToe */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
        <h2 className="font-semibold text-gray-900 mb-3">🎮 Invite to TicTacToe</h2>
        <div className="relative">
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search players…"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          {results.length > 0 && (
            <div className="absolute top-full left-0 right-0 z-10 bg-white border border-gray-200 rounded-lg shadow-lg mt-1">
              {results.map((u) => (
                <button key={u.id} onClick={() => handleInvite(u.id)} className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex justify-between">
                  <span>{u.first_name} {u.last_name}</span>
                  <span className="text-blue-600 text-xs">Invite</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Pending invites */}
      {invites.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
          <h2 className="font-semibold text-gray-900 mb-3">Pending Invites</h2>
          <div className="space-y-2">
            {invites.map((inv) => (
              <div key={inv.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-sm text-gray-700">TicTacToe from User #{inv.sender_id}</span>
                <div className="flex gap-2">
                  <button onClick={() => handleAccept(inv.id)} className="px-3 py-1 bg-blue-600 text-white rounded-lg text-xs hover:bg-blue-700">Accept</button>
                  <button onClick={() => handleReject(inv.id)} className="px-3 py-1 bg-gray-200 text-gray-700 rounded-lg text-xs hover:bg-gray-300">Reject</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Snake */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex items-center justify-between">
        <div>
          <h2 className="font-semibold text-gray-900">🐍 Snake</h2>
          <p className="text-sm text-gray-500 mt-0.5">Classic snake game with global leaderboard</p>
        </div>
        <button onClick={() => navigate('/games/snake')} className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700">
          Play Snake
        </button>
      </div>

      {/* Leaderboard */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
        <h2 className="font-semibold text-gray-900 mb-3">🏆 Snake Leaderboard</h2>
        {board.length === 0 && <p className="text-gray-400 text-sm">No scores yet. Be the first!</p>}
        <div className="space-y-2">
          {board.map((entry) => (
            <div key={entry.id} className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0">
              <span className={`text-sm font-bold w-6 text-center ${entry.rank === 1 ? 'text-yellow-500' : entry.rank === 2 ? 'text-gray-400' : entry.rank === 3 ? 'text-amber-600' : 'text-gray-400'}`}>
                {entry.rank}
              </span>
              <span className="flex-1 text-sm text-gray-700">{entry.first_name} {entry.last_name}</span>
              <span className="text-sm font-semibold text-gray-900">{entry.high_score}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
