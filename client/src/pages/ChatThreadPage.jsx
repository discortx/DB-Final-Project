import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { getChat, addMember, removeMember } from '../api/chats';
import { getMessages, sendMessage } from '../api/messages';
import { searchUsers } from '../api/users';
import useAuthStore from '../store/authStore';
import Avatar from '../components/Avatar';
import socket from '../socket';

function timeStr(dateStr) {
  return new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function ChatThreadPage() {
  const { id } = useParams();
  const me = useAuthStore((s) => s.user);
  const [chat, setChat]         = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText]         = useState('');
  const [sending, setSending]   = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [addQuery, setAddQuery] = useState('');
  const [addResults, setAddRes] = useState([]);
  const bottomRef = useRef(null);

  const scrollToBottom = () => bottomRef.current?.scrollIntoView({ behavior: 'smooth' });

  useEffect(() => {
    getChat(id).then((r) => setChat(r.data));
    getMessages(id).then((r) => { setMessages(r.data); setTimeout(scrollToBottom, 50); });

    socket.emit('chat:join', id);
    const onMessage = (msg) => {
      if (String(msg.chat_id) !== String(id)) return;
      setMessages((m) => m.some((x) => x.id === msg.id) ? m : [...m, msg]);
    };
    socket.on('chat:message', onMessage);
    return () => socket.off('chat:message', onMessage);
  }, [id]);

  useEffect(() => { scrollToBottom(); }, [messages.length]);

  useEffect(() => {
    if (!addQuery.trim()) { setAddRes([]); return; }
    const t = setTimeout(async () => {
      try { const r = await searchUsers(addQuery); setAddRes(r.data); } catch {}
    }, 300);
    return () => clearTimeout(t);
  }, [addQuery]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    setSending(true);
    try {
      const r = await sendMessage(id, text.trim());
      setMessages((m) => [...m, r.data]);
      setText('');
    } catch {}
    setSending(false);
  };

  const handleAddMember = async (userId) => {
    await addMember(id, userId);
    const r = await getChat(id);
    setChat(r.data);
    setAddQuery('');
    setAddRes([]);
  };

  const handleRemove = async (userId) => {
    await removeMember(id, userId);
    const r = await getChat(id);
    setChat(r.data);
  };

  if (!chat) return <div className="text-center py-12 text-gray-400">Loading…</div>;

  return (
    <div className="max-w-3xl mx-auto flex gap-4">
      {/* Thread */}
      <div className="flex-1 flex flex-col bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden" style={{ height: 'calc(100vh - 120px)' }}>
        {/* Header */}
        <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">{chat.name || 'Direct Message'}</h2>
          <button onClick={() => setShowInfo((v) => !v)} className="text-sm text-gray-500 hover:text-gray-700">
            {chat.type === 'GROUP' ? (showInfo ? 'Hide info' : 'Group info') : ''}
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
          {messages.map((msg) => {
            const isMine = msg.sender_id === me.id;
            return (
              <div key={msg.id} className={`flex gap-2 ${isMine ? 'flex-row-reverse' : ''}`}>
                {!isMine && <Avatar firstName={msg.first_name} lastName={msg.last_name} size="sm" />}
                <div className={`max-w-xs lg:max-w-md ${isMine ? 'items-end' : 'items-start'} flex flex-col`}>
                  {!isMine && <span className="text-xs text-gray-500 mb-1">{msg.first_name}</span>}
                  <div className={`px-3 py-2 rounded-2xl text-sm ${isMine ? 'bg-blue-600 text-white rounded-tr-sm' : 'bg-gray-100 text-gray-900 rounded-tl-sm'}`}>
                    {msg.content}
                  </div>
                  <span className="text-xs text-gray-400 mt-1">{timeStr(msg.created_at)}</span>
                </div>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <form onSubmit={handleSend} className="px-4 py-3 border-t border-gray-100 flex gap-2">
          <input
            value={text} onChange={(e) => setText(e.target.value)}
            placeholder="Type a message…"
            className="flex-1 border border-gray-200 rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button type="submit" disabled={sending || !text.trim()}
            className="px-4 py-2 bg-blue-600 text-white rounded-full text-sm hover:bg-blue-700 disabled:opacity-50">
            Send
          </button>
        </form>
      </div>

      {/* Group info panel */}
      {showInfo && chat.type === 'GROUP' && (
        <div className="w-56 bg-white rounded-xl border border-gray-100 shadow-sm p-4 space-y-3 self-start">
          <h3 className="font-semibold text-gray-900 text-sm">Members</h3>
          {chat.members?.map((m) => (
            <div key={m.id} className="flex items-center gap-2">
              <Avatar firstName={m.first_name} lastName={m.last_name} size="sm" />
              <span className="text-sm text-gray-700 flex-1 truncate">{m.first_name}</span>
              {chat.creator_id === me.id && m.id !== me.id && (
                <button onClick={() => handleRemove(m.id)} className="text-xs text-red-400 hover:text-red-600">✕</button>
              )}
            </div>
          ))}
          {chat.creator_id === me.id && (
            <div className="relative">
              <input value={addQuery} onChange={(e) => setAddQuery(e.target.value)} placeholder="Add member…"
                className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500" />
              {addResults.length > 0 && (
                <div className="absolute top-full left-0 right-0 z-10 bg-white border border-gray-200 rounded-lg shadow-lg mt-1">
                  {addResults.map((u) => (
                    <button key={u.id} onClick={() => handleAddMember(u.id)} className="w-full text-left px-2 py-1.5 text-xs hover:bg-gray-50">
                      {u.first_name} {u.last_name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
