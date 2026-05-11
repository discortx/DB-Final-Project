import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getChats, openDm, createGroup } from '../api/chats';
import { searchUsers } from '../api/users';
import Avatar from '../components/Avatar';

function timeAgo(dateStr) {
  if (!dateStr) return '';
  const d = Math.floor((Date.now() - new Date(dateStr)) / 60000);
  if (d < 1) return 'just now';
  if (d < 60) return `${d}m`;
  if (d < 1440) return `${Math.floor(d/60)}h`;
  return `${Math.floor(d/1440)}d`;
}

export default function ChatInboxPage() {
  const navigate = useNavigate();
  const [chats, setChats]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [dmQuery, setDmQuery]   = useState('');
  const [dmResults, setDmRes]   = useState([]);
  const [showGroup, setShowGroup] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [groupMembers, setGM]   = useState([]);
  const [memberQuery, setMQ]    = useState('');
  const [memberRes, setMR]      = useState([]);

  useEffect(() => {
    getChats().then((r) => setChats(r.data)).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!dmQuery.trim()) { setDmRes([]); return; }
    const t = setTimeout(async () => {
      try { const r = await searchUsers(dmQuery); setDmRes(r.data); } catch {}
    }, 300);
    return () => clearTimeout(t);
  }, [dmQuery]);

  useEffect(() => {
    if (!memberQuery.trim()) { setMR([]); return; }
    const t = setTimeout(async () => {
      try { const r = await searchUsers(memberQuery); setMR(r.data); } catch {}
    }, 300);
    return () => clearTimeout(t);
  }, [memberQuery]);

  const startDm = async (userId) => {
    const r = await openDm(userId);
    navigate(`/chats/${r.data.id}`);
  };

  const createGroupChat = async () => {
    if (!groupName.trim() || groupMembers.length === 0) return;
    const r = await createGroup({ name: groupName, member_ids: groupMembers.map((m) => m.id) });
    navigate(`/chats/${r.data.id}`);
  };

  if (loading) return <div className="text-center py-12 text-gray-400">Loading…</div>;

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      {/* Actions */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 space-y-3">
        <div className="relative">
          <input value={dmQuery} onChange={(e) => setDmQuery(e.target.value)}
            placeholder="Start a DM — search by name…"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {dmResults.length > 0 && (
            <div className="absolute top-full left-0 right-0 z-10 bg-white border border-gray-200 rounded-lg shadow-lg mt-1">
              {dmResults.map((u) => (
                <button key={u.id} onClick={() => startDm(u.id)} className="w-full flex items-center gap-3 px-3 py-2 hover:bg-gray-50 text-sm">
                  <Avatar firstName={u.first_name} lastName={u.last_name} size="sm" />
                  <span>{u.first_name} {u.last_name}</span>
                  <span className="text-gray-400 text-xs">@{u.username}</span>
                </button>
              ))}
            </div>
          )}
        </div>
        <button onClick={() => setShowGroup((v) => !v)} className="text-sm text-blue-600 hover:underline">
          {showGroup ? '▲ Hide' : '▼ Create group chat'}
        </button>
        {showGroup && (
          <div className="space-y-2 border-t pt-3">
            <input value={groupName} onChange={(e) => setGroupName(e.target.value)}
              placeholder="Group name" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            <div className="relative">
              <input value={memberQuery} onChange={(e) => setMQ(e.target.value)} placeholder="Add members…"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              {memberRes.length > 0 && (
                <div className="absolute top-full left-0 right-0 z-10 bg-white border border-gray-200 rounded-lg shadow-lg mt-1">
                  {memberRes.map((u) => (
                    <button key={u.id} onClick={() => { setGM((m) => [...m, u]); setMQ(''); setMR([]); }}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50">
                      {u.first_name} {u.last_name}
                    </button>
                  ))}
                </div>
              )}
            </div>
            {groupMembers.length > 0 && (
              <div className="flex gap-1 flex-wrap">
                {groupMembers.map((m) => (
                  <span key={m.id} className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 text-xs px-2 py-1 rounded-full">
                    {m.first_name}
                    <button onClick={() => setGM((prev) => prev.filter((x) => x.id !== m.id))}>×</button>
                  </span>
                ))}
              </div>
            )}
            <button onClick={createGroupChat} className="px-4 py-1.5 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">
              Create Group
            </button>
          </div>
        )}
      </div>

      {/* Chat list */}
      {chats.length === 0 && <p className="text-gray-400 text-center py-8">No chats yet. Start a DM!</p>}
      {chats.map((c) => (
        <button key={c.id} onClick={() => navigate(`/chats/${c.id}`)}
          className="w-full bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex items-center gap-3 hover:bg-gray-50 text-left">
          <div className="w-10 h-10 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center text-sm font-semibold flex-shrink-0">
            {c.type === 'GROUP' ? '👥' : '💬'}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex justify-between items-center">
              <span className="font-medium text-gray-900 truncate">{c.name || 'Direct Message'}</span>
              <span className="text-xs text-gray-400 ml-2 flex-shrink-0">{timeAgo(c.last_message_at)}</span>
            </div>
            <p className="text-sm text-gray-500 truncate">{c.last_message || 'No messages yet'}</p>
          </div>
        </button>
      ))}
    </div>
  );
}
