import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getFriends, getInbox, getSuggestions, sendRequest, acceptRequest, rejectRequest, unfriend } from '../api/friends';
import Avatar from '../components/Avatar';

const TABS = ['Friends', 'Requests', 'Suggestions'];

export default function FriendsPage() {
  const [tab, setTab]             = useState(0);
  const [friends, setFriends]     = useState([]);
  const [inbox, setInbox]         = useState([]);
  const [suggestions, setSugg]    = useState([]);
  const [loading, setLoading]     = useState(true);

  useEffect(() => {
    Promise.all([getFriends(), getInbox(), getSuggestions()])
      .then(([f, i, s]) => { setFriends(f.data); setInbox(i.data); setSugg(s.data); })
      .finally(() => setLoading(false));
  }, []);

  const handleAccept = async (id) => {
    await acceptRequest(id);
    setInbox((prev) => prev.filter((r) => r.id !== id));
    const { data } = await getFriends();
    setFriends(data);
  };

  const handleReject = async (id) => {
    await rejectRequest(id);
    setInbox((prev) => prev.filter((r) => r.id !== id));
  };

  const handleUnfriend = async (id) => {
    if (!confirm('Unfriend this person?')) return;
    await unfriend(id);
    setFriends((prev) => prev.filter((f) => f.id !== id));
  };

  const handleAddSugg = async (id) => {
    await sendRequest(id);
    setSugg((prev) => prev.filter((s) => s.id !== id));
  };

  const tabCls = (i) =>
    `px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
      tab === i ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'
    }`;

  if (loading) return <div className="text-center py-12 text-gray-400">Loading…</div>;

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex gap-2 mb-6">
        {TABS.map((t, i) => (
          <button key={t} onClick={() => setTab(i)} className={tabCls(i)}>
            {t}
            {i === 1 && inbox.length > 0 && (
              <span className="ml-1.5 bg-red-500 text-white text-xs rounded-full px-1.5">{inbox.length}</span>
            )}
          </button>
        ))}
      </div>

      {tab === 0 && (
        <div className="space-y-3">
          {friends.length === 0 && <p className="text-gray-400 text-center py-8">No friends yet. Check Suggestions!</p>}
          {friends.map((f) => (
            <div key={f.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex items-center gap-3">
              <Avatar firstName={f.first_name} lastName={f.last_name} />
              <div className="flex-1">
                <Link to={`/profile/${f.id}`} className="font-medium text-gray-900 hover:underline">
                  {f.first_name} {f.last_name}
                </Link>
                <p className="text-xs text-gray-400">@{f.username}</p>
              </div>
              <button onClick={() => handleUnfriend(f.id)} className="text-sm text-red-400 hover:text-red-600 px-3 py-1 rounded-lg hover:bg-red-50">
                Unfriend
              </button>
            </div>
          ))}
        </div>
      )}

      {tab === 1 && (
        <div className="space-y-3">
          {inbox.length === 0 && <p className="text-gray-400 text-center py-8">No pending requests.</p>}
          {inbox.map((r) => (
            <div key={r.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex items-center gap-3">
              <Avatar firstName={r.first_name} lastName={r.last_name} />
              <div className="flex-1">
                <Link to={`/profile/${r.sender_id}`} className="font-medium text-gray-900 hover:underline">
                  {r.first_name} {r.last_name}
                </Link>
                <p className="text-xs text-gray-400">@{r.username}</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => handleAccept(r.id)} className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">Accept</button>
                <button onClick={() => handleReject(r.id)} className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200">Reject</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 2 && (
        <div className="space-y-3">
          {suggestions.length === 0 && <p className="text-gray-400 text-center py-8">No suggestions right now.</p>}
          {suggestions.map((s) => (
            <div key={s.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex items-center gap-3">
              <Avatar firstName={s.first_name} lastName={s.last_name} />
              <div className="flex-1">
                <Link to={`/profile/${s.id}`} className="font-medium text-gray-900 hover:underline">
                  {s.first_name} {s.last_name}
                </Link>
                <p className="text-xs text-gray-400">@{s.username}</p>
              </div>
              <button onClick={() => handleAddSugg(s.id)} className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">
                Add Friend
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
