import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowRight, X, Edit2, Plus, MoreVertical, ChevronLeft, Loader2 } from 'lucide-react';
import { getChat, updateChat, addMember, removeMember, updateMemberRole } from '../api/chats';
import { getMessages, sendMessage } from '../api/messages';
import { searchUsers } from '../api/users';
import useAuthStore from '../store/authStore';
import useToastStore from '../store/toastStore';
import socket from '../socket';
import ChatHeader from '../components/chat/ChatHeader';
import MessageBubble from '../components/chat/MessageBubble';
import Avatar from '../components/ui/Avatar';

const THREAD_CSS = `
  @keyframes skeletonShimmer { 0% { background-position: -400px 0 } 100% { background-position: 400px 0 } }
  .skeleton-pulse {
    background: linear-gradient(90deg, rgba(255,255,255,0.06) 25%, rgba(255,255,255,0.10) 50%, rgba(255,255,255,0.06) 75%);
    background-size: 400px 100%;
    animation: skeletonShimmer 1.6s ease-in-out infinite;
  }
  .thread-input::placeholder { color: rgba(245,240,239,0.35); }
  .thread-input:focus { outline: none; }
  .info-icon-btn { transition: background 0.15s; }
  .info-icon-btn:hover { background: rgba(255,255,255,0.08) !important; }
  .info-input::placeholder { color: rgba(245,240,239,0.35); }
  .info-input:focus { border-color: rgba(139,21,32,0.5) !important; outline: none; }
  .info-ghost-danger { transition: background 0.15s; }
  .info-ghost-danger:hover { background: rgba(139,21,32,0.1) !important; }
  .info-add-member:hover { background: rgba(255,255,255,0.06) !important; }
  .info-dropdown-item:hover { background: rgba(255,255,255,0.08) !important; }
  .info-member-result:hover { background: rgba(255,255,255,0.06) !important; }
  @media (prefers-reduced-motion: reduce) { .skeleton-pulse { animation: none; } }
`;

// ─── helpers ────────────────────────────────────────────────────────────────

function isSameDay(d1, d2) {
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
}

function formatDateLabel(date) {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (isSameDay(date, today)) return 'Today';
  if (isSameDay(date, yesterday)) return 'Yesterday';
  const days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${days[date.getDay()]}, ${months[date.getMonth()]} ${date.getDate()}`;
}

function groupMessagesByDate(messages) {
  const groups = [];
  let currentDate = null;
  let currentGroup = null;
  for (const msg of messages) {
    const msgDate = new Date(msg.created_at);
    if (!currentDate || !isSameDay(currentDate, msgDate)) {
      if (currentGroup) groups.push(currentGroup);
      currentDate = msgDate;
      currentGroup = { dateLabel: formatDateLabel(msgDate), messages: [] };
    }
    currentGroup.messages.push(msg);
  }
  if (currentGroup) groups.push(currentGroup);
  return groups;
}

function useDebounce(value, delay = 300) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

// ─── Typing dots ─────────────────────────────────────────────────────────────

function TypingIndicator({ names }) {
  if (!names.length) return null;
  const label =
    names.length === 1
      ? `${names[0]} is typing…`
      : `${names.join(', ')} are typing…`;
  return (
    <div className="flex items-center gap-2 ml-8 py-1">
      <span className="flex gap-0.5 items-end">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="block w-1.5 h-1.5 rounded-full animate-bounce"
            style={{
              background: 'rgba(245,240,239,0.4)',
              animationDelay: `${i * 150}ms`,
              animationDuration: '0.8s',
            }}
          />
        ))}
      </span>
      <span className="text-[10px]" style={{ color: 'rgba(245,240,239,0.35)' }}>{label}</span>
    </div>
  );
}

// ─── Group Info Panel ─────────────────────────────────────────────────────────

const infoBtnStyle = {
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
  width: 28, height: 28, borderRadius: 6,
  background: 'none', border: 'none',
  color: 'rgba(245,240,239,0.55)', cursor: 'pointer',
};

const infoInputStyle = {
  width: '100%',
  background: 'rgba(255,255,255,0.05)',
  border: '1px solid rgba(255,255,255,0.1)',
  color: '#F5F0EF',
  borderRadius: 6,
  padding: '6px 10px',
  fontSize: '0.8rem',
};

function GroupInfoPanel({ chat, currentUserId, open, onClose, onChatUpdated, onLeave }) {
  const addToast = useToastStore((s) => s.addToast);
  const [editing, setEditing] = useState(false);
  const [nameVal, setNameVal] = useState(chat?.name || '');
  const [savingName, setSavingName] = useState(false);
  const [addQuery, setAddQuery] = useState('');
  const [addResults, setAddResults] = useState([]);
  const [showAddSearch, setShowAddSearch] = useState(false);
  const [roleLoading, setRoleLoading] = useState(null);
  const debouncedAdd = useDebounce(addQuery, 300);
  const [openDropdownId, setOpenDropdownId] = useState(null);

  const [confirmDelete, setConfirmDelete] = useState(false);
  const confirmDeleteRef = useRef(null);

  useEffect(() => {
    return () => clearTimeout(confirmDeleteRef.current);
  }, []);

  useEffect(() => {
    const handleClickOutside = () => setOpenDropdownId(null);
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const isAdmin = (chat?.members || []).some(
    (m) => String(m.id) === String(currentUserId) && m.role === 'ADMIN'
  );
  const isCreator = chat?.creator_id === currentUserId;

  useEffect(() => { setNameVal(chat?.name || ''); }, [chat?.name]);

  useEffect(() => {
    if (!debouncedAdd.trim()) { setAddResults([]); return; }
    searchUsers(debouncedAdd)
      .then((r) => setAddResults(r.data || []))
      .catch(() => setAddResults([]));
  }, [debouncedAdd]);

  const handleSaveName = async () => {
    if (!nameVal.trim()) return;
    setSavingName(true);
    try {
      const r = await updateChat(chat.id, { name: nameVal.trim() });
      onChatUpdated(r.data);
      setEditing(false);
      addToast({ message: 'Group name updated', type: 'success' });
    } catch {
      addToast({ message: 'Failed to update name', type: 'error' });
    } finally {
      setSavingName(false);
    }
  };

  const handleAddMember = async (user) => {
    try {
      await addMember(chat.id, user.id);
      const r = await getChat(chat.id);
      onChatUpdated(r.data);
      setAddQuery('');
      setAddResults([]);
      setShowAddSearch(false);
      addToast({ message: `${user.first_name} added to group`, type: 'success' });
    } catch (err) {
      const msg = err?.response?.data?.error || err?.response?.data?.message || err?.message || 'Failed to add member';
      addToast({ message: String(msg), type: 'error' });
    }
  };

  const handleRemoveMember = async (member) => {
    try {
      await removeMember(chat.id, member.id);
      if (member.id === currentUserId) {
        onClose();
        if (onLeave) onLeave();
      } else {
        const r = await getChat(chat.id);
        onChatUpdated(r.data);
      }
      addToast({ message: member.id === currentUserId ? 'You left the group' : `${member.first_name} removed`, type: 'success' });
    } catch (err) {
      const msg = err?.response?.data?.error || err?.response?.data?.message || err?.message || 'Failed to remove member';
      addToast({ message: String(msg), type: 'error' });
    }
  };

  const handleChangeRole = async (member, newRole) => {
    setRoleLoading(member.id);
    try {
      await updateMemberRole(chat.id, member.id, newRole);
      const r = await getChat(chat.id);
      onChatUpdated(r.data);
      const label = newRole === 'ADMIN' ? 'promoted to Admin' : 'demoted to Member';
      addToast({ message: `${member.first_name} ${label}`, type: 'success' });
    } catch {
      addToast({ message: 'Failed to update role', type: 'error' });
    } finally {
      setRoleLoading(null);
    }
  };

  const handleDeleteGroup = () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      confirmDeleteRef.current = setTimeout(() => setConfirmDelete(false), 3000);
      return;
    }
    clearTimeout(confirmDeleteRef.current);
    setConfirmDelete(false);
    addToast({ message: 'Delete group not supported yet', type: 'error' });
  };

  const panelStyle = {
    background: 'rgba(23,18,20,0.92)',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    borderLeft: '1px solid rgba(255,255,255,0.09)',
  };

  return (
    <>
      {/* Desktop-only overlay behind panel */}
      {open && (
        <div
          className="hidden md:block fixed inset-0 z-30"
          onClick={onClose}
        />
      )}

      {/* Panel — full-screen on mobile, side drawer on md+ */}
      <div
        className={`fixed inset-0 md:absolute md:inset-auto md:right-0 md:top-0 md:bottom-0 md:w-[280px] z-40 flex flex-col transform transition-transform duration-200 ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
        style={panelStyle}
      >
        {/* Panel header */}
        <div
          className="flex items-center justify-between p-4 shrink-0"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}
        >
          <span className="font-semibold text-sm" style={{ color: '#F5F0EF' }}>
            Group Info
          </span>
          <button
            type="button"
            className="info-icon-btn"
            style={infoBtnStyle}
            onClick={onClose}
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Group name */}
          <div>
            {editing ? (
              <div className="space-y-2">
                <input
                  className="info-input"
                  style={infoInputStyle}
                  value={nameVal}
                  onChange={(e) => setNameVal(e.target.value)}
                  autoFocus
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: 4,
                      background: '#8B1520', border: 'none', color: '#F5F0EF',
                      borderRadius: 6, padding: '4px 12px', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer',
                    }}
                    onClick={handleSaveName}
                    disabled={savingName || !nameVal.trim()}
                  >
                    {savingName && <Loader2 size={11} className="animate-spin" />}
                    Save
                  </button>
                  <button
                    type="button"
                    style={{
                      display: 'inline-flex', alignItems: 'center',
                      background: 'none', border: '1px solid rgba(255,255,255,0.1)',
                      color: 'rgba(245,240,239,0.7)', borderRadius: 6,
                      padding: '4px 10px', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer',
                    }}
                    onClick={() => { setEditing(false); setNameVal(chat?.name || ''); }}
                    disabled={savingName}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-base font-semibold flex-1 truncate" style={{ color: '#F5F0EF' }}>
                  {chat?.name || 'Group Chat'}
                </span>
                {isAdmin && (
                  <button
                    type="button"
                    className="info-icon-btn"
                    style={infoBtnStyle}
                    onClick={() => setEditing(true)}
                    aria-label="Edit group name"
                  >
                    <Edit2 size={14} />
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Members section */}
          <div>
            <p
              className="text-[10px] font-semibold uppercase tracking-wider mb-2"
              style={{ color: 'rgba(245,240,239,0.4)' }}
            >
              {(chat?.members || []).length} members
            </p>
            <div className="space-y-0.5">
              {(chat?.members || []).map((member) => (
                <div key={member.id} className="flex items-center gap-2 py-1.5">
                  <Avatar
                    firstName={member.first_name || ''}
                    lastName={member.last_name || ''}
                    size="sm"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm truncate font-medium" style={{ color: '#F5F0EF' }}>
                      {member.first_name} {member.last_name}
                      {member.role === 'ADMIN' && (
                        <span
                          className="ml-1.5 text-[10px] font-semibold px-1.5 py-0.5 rounded"
                          style={{
                            background: 'rgba(139,21,32,0.2)',
                            border: '1px solid rgba(139,21,32,0.35)',
                            color: '#E87080',
                          }}
                        >
                          Admin
                        </span>
                      )}
                    </p>
                    <p className="text-xs truncate" style={{ color: 'rgba(245,240,239,0.4)' }}>
                      @{member.username}
                    </p>
                  </div>
                  {isAdmin && String(member.id) !== String(currentUserId) && (
                    <div className="relative">
                      <button
                        type="button"
                        className="info-icon-btn"
                        style={infoBtnStyle}
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenDropdownId(openDropdownId === member.id ? null : member.id);
                        }}
                        aria-label="Member options"
                      >
                        <MoreVertical size={15} />
                      </button>

                      {openDropdownId === member.id && (
                        <div
                          className="absolute right-0 top-full mt-1 w-44 z-50 rounded-md py-1"
                          style={{
                            background: 'rgba(23,18,20,0.98)',
                            border: '1px solid rgba(255,255,255,0.1)',
                            backdropFilter: 'blur(12px)',
                            WebkitBackdropFilter: 'blur(12px)',
                          }}
                        >
                          <button
                            type="button"
                            disabled={roleLoading === member.id}
                            className="info-dropdown-item w-full text-left px-3 py-2 text-xs transition-colors"
                            style={{ background: 'none', border: 'none', color: '#F5F0EF', cursor: 'pointer' }}
                            onClick={() => {
                              handleChangeRole(member, member.role === 'ADMIN' ? 'MEMBER' : 'ADMIN');
                              setOpenDropdownId(null);
                            }}
                          >
                            {roleLoading === member.id
                              ? 'Updating...'
                              : member.role === 'ADMIN'
                              ? 'Demote to Member'
                              : 'Promote to Admin'}
                          </button>
                          <button
                            type="button"
                            className="info-dropdown-item w-full text-left px-3 py-2 text-xs transition-colors"
                            style={{ background: 'none', border: 'none', color: '#E87080', cursor: 'pointer' }}
                            onClick={() => {
                              handleRemoveMember(member);
                              setOpenDropdownId(null);
                            }}
                          >
                            Remove from Group
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Add member */}
            {isAdmin && (
              <div className="mt-2">
                {showAddSearch ? (
                  <div className="relative">
                    <input
                      className="info-input"
                      style={{ ...infoInputStyle, width: '100%' }}
                      placeholder="Search users…"
                      value={addQuery}
                      onChange={(e) => setAddQuery(e.target.value)}
                      autoFocus
                    />
                    {addResults.length > 0 && (
                      <div
                        className="absolute top-full left-0 right-0 z-10 rounded-md mt-1 max-h-40 overflow-y-auto"
                        style={{
                          background: 'rgba(23,18,20,0.98)',
                          border: '1px solid rgba(255,255,255,0.1)',
                          backdropFilter: 'blur(12px)',
                          WebkitBackdropFilter: 'blur(12px)',
                        }}
                      >
                        {addResults.map((u) => (
                          <button
                            key={u.id}
                            type="button"
                            className="info-member-result w-full flex items-center gap-2 px-2 py-1.5 text-left transition-colors"
                            style={{ background: 'none', border: 'none', cursor: 'pointer', borderBottom: '1px solid rgba(255,255,255,0.06)' }}
                            onClick={() => handleAddMember(u)}
                          >
                            <Avatar firstName={u.first_name || ''} lastName={u.last_name || ''} size="xs" />
                            <span className="text-xs" style={{ color: '#F5F0EF' }}>
                              {u.first_name} {u.last_name}
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <button
                    type="button"
                    className="info-add-member w-full flex items-center justify-center gap-1.5 py-1.5 rounded-md transition-colors"
                    style={{
                      background: 'none',
                      border: '1px solid rgba(255,255,255,0.1)',
                      color: 'rgba(245,240,239,0.6)',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                    onClick={() => setShowAddSearch(true)}
                  >
                    <Plus size={12} />
                    Add member
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Divider */}
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }} />

          {/* Leave / Delete */}
          {!isCreator && (
            <button
              type="button"
              className="info-ghost-danger w-full rounded-md py-1.5 text-sm font-semibold"
              style={{
                background: 'none',
                border: '1px solid rgba(139,21,32,0.3)',
                color: '#E87080',
                cursor: 'pointer',
              }}
              onClick={() => handleRemoveMember({ id: currentUserId, first_name: 'You' })}
            >
              Leave group
            </button>
          )}
          {isCreator && (
            <button
              type="button"
              className="info-ghost-danger w-full rounded-md py-1.5 text-sm font-semibold transition-colors"
              style={{
                background: confirmDelete ? 'rgba(139,21,32,0.25)' : 'rgba(139,21,32,0.12)',
                border: '1px solid rgba(139,21,32,0.4)',
                color: '#E87080',
                cursor: 'pointer',
              }}
              onClick={handleDeleteGroup}
            >
              {confirmDelete ? 'Tap again to confirm' : 'Delete group'}
            </button>
          )}
        </div>
      </div>
    </>
  );
}

// ─── ChatThreadPage ──────────────────────────────────────────────────────────

export default function ChatThreadPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const currentUser = useAuthStore((s) => s.user);
  const addToast = useToastStore((s) => s.addToast);

  const [chat, setChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [typingUsers, setTypingUsers] = useState([]);

  const bottomRef = useRef(null);
  const typingTimerRef = useRef(null);
  const typingEmittedRef = useRef(false);

  const scrollToBottom = useCallback((behavior = 'smooth') => {
    bottomRef.current?.scrollIntoView({ behavior });
  }, []);

  useEffect(() => {
    setLoading(true);
    setChat(null);
    setMessages([]);
    setShowInfo(false);
    setTypingUsers([]);

    Promise.all([getChat(id), getMessages(id)])
      .then(([chatRes, msgRes]) => {
        setChat(chatRes.data);
        setMessages(msgRes.data || []);
        setTimeout(() => scrollToBottom('auto'), 50);
      })
      .catch(() => addToast({ message: 'Failed to load chat', type: 'error' }))
      .finally(() => setLoading(false));

    socket.emit('chat:join', id);

    const onMessage = (msg) => {
      if (String(msg.chat_id) !== String(id)) return;
      setMessages((prev) =>
        prev.some((x) => x.id === msg.id) ? prev : [...prev, msg]
      );
    };

    const onTyping = ({ userId, firstName, isTyping }) => {
      if (userId === currentUser?.id) return;
      setTypingUsers((prev) => {
        if (isTyping) {
          return prev.find((u) => u.userId === userId) ? prev : [...prev, { userId, firstName }];
        }
        return prev.filter((u) => u.userId !== userId);
      });
    };

    socket.on('chat:message', onMessage);
    socket.on('chat:typing', onTyping);

    return () => {
      socket.off('chat:message', onMessage);
      socket.off('chat:typing', onTyping);
    };
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (messages.length > 0) scrollToBottom('smooth');
  }, [messages.length, scrollToBottom]);

  const handleTextChange = (e) => {
    setText(e.target.value);
    if (!typingEmittedRef.current) {
      socket.emit('chat:typing:start', { chatId: id });
      typingEmittedRef.current = true;
    }
    clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => {
      socket.emit('chat:typing:stop', { chatId: id });
      typingEmittedRef.current = false;
    }, 1000);
  };

  const handleSend = async () => {
    const content = text.trim();
    if (!content || sending) return;
    setSending(true);
    setText('');
    clearTimeout(typingTimerRef.current);
    socket.emit('chat:typing:stop', { chatId: id });
    typingEmittedRef.current = false;

    try {
      const r = await sendMessage(id, content);
      setMessages((prev) =>
        prev.some((x) => x.id === r.data.id) ? prev : [...prev, r.data]
      );
    } catch {
      addToast({ message: 'Failed to send message', type: 'error' });
      setText(content);
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (loading) {
    return (
      <>
        <style>{THREAD_CSS}</style>
        <div className="flex flex-col" style={{ flex: 1, overflow: 'hidden' }}>
          <div
            className="h-14 px-4 flex items-center gap-3 shrink-0"
            style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}
          >
            <div className="skeleton-pulse w-8 h-8 rounded-full" />
            <div className="space-y-1 flex-1">
              <div className="skeleton-pulse h-3.5 w-32 rounded" />
              <div className="skeleton-pulse h-2.5 w-16 rounded" />
            </div>
          </div>
          <div className="flex-1 px-4 py-4 space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className={`flex gap-2 ${i % 3 === 0 ? 'flex-row-reverse' : ''}`}>
                <div className="skeleton-pulse w-6 h-6 rounded-full shrink-0" />
                <div className={`skeleton-pulse h-8 rounded-xl ${i % 3 === 0 ? 'w-40' : 'w-56'}`} />
              </div>
            ))}
          </div>
        </div>
      </>
    );
  }

  if (!chat) {
    return (
      <>
        <style>{THREAD_CSS}</style>
        <div className="flex flex-col items-center justify-center gap-3" style={{ flex: 1, overflow: 'hidden' }}>
          <p className="text-sm" style={{ color: 'rgba(245,240,239,0.45)' }}>
            Chat not found.
          </p>
          <button
            type="button"
            className="inline-flex items-center gap-1.5"
            style={{
              background: 'none',
              border: '1px solid rgba(255,255,255,0.1)',
              color: 'rgba(245,240,239,0.7)',
              borderRadius: 6, padding: '5px 12px',
              fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer',
            }}
            onClick={() => navigate('/chats')}
          >
            <ChevronLeft size={14} />
            Back to chats
          </button>
        </div>
      </>
    );
  }

  const messageGroups = groupMessagesByDate(messages);

  return (
    <>
      <style>{THREAD_CSS}</style>
      <div className="flex flex-col relative overflow-hidden" style={{ flex: 1 }}>
        {/* Mobile back button */}
        <div
          className="md:hidden flex items-center shrink-0 px-3 py-1.5"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
        >
          <button
            type="button"
            onClick={() => navigate('/chats')}
            className="flex items-center gap-1"
            style={{
              background: 'none', border: 'none',
              color: 'rgba(245,240,239,0.65)',
              fontSize: '0.875rem', fontWeight: 500, cursor: 'pointer', padding: '4px 0',
            }}
          >
            <ChevronLeft size={16} />
            Chats
          </button>
        </div>

        {/* Header */}
        <ChatHeader
          chat={chat}
          currentUserId={currentUser?.id}
          onOpenInfo={() => setShowInfo((v) => !v)}
        />

        {/* Messages area */}
        <div className="flex-1 overflow-y-auto px-4 py-4">
          {messages.length === 0 && (
            <div className="flex items-center justify-center h-full">
              <p className="text-sm" style={{ color: 'rgba(245,240,239,0.35)' }}>
                No messages yet. Say hello!
              </p>
            </div>
          )}

          {messageGroups.map((group) => (
            <div key={group.dateLabel}>
              {/* Date separator */}
              <div className="flex items-center gap-2 my-3">
                <hr className="flex-1" style={{ borderColor: 'rgba(255,255,255,0.08)' }} />
                <span
                  className="text-[10px] px-2 shrink-0"
                  style={{ color: 'rgba(245,240,239,0.35)' }}
                >
                  {group.dateLabel}
                </span>
                <hr className="flex-1" style={{ borderColor: 'rgba(255,255,255,0.08)' }} />
              </div>

              {group.messages.map((msg, idx) => {
                const prevMsg = idx > 0 ? group.messages[idx - 1] : null;
                const showAvatar = !prevMsg || prevMsg.sender_id !== msg.sender_id;
                return (
                  <MessageBubble
                    key={msg.id}
                    message={msg}
                    isMine={msg.sender_id === currentUser?.id}
                    isGroup={chat.type === 'GROUP'}
                    showAvatar={showAvatar}
                  />
                );
              })}
            </div>
          ))}

          <TypingIndicator names={typingUsers.map((u) => u.firstName || 'Someone')} />
          <div ref={bottomRef} />
        </div>

        {/* Input bar */}
        <div
          className="sticky bottom-0 px-4 py-3 flex items-center gap-3 shrink-0"
          style={{
            background: 'rgba(12,9,10,0.85)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            borderTop: '1px solid rgba(255,255,255,0.07)',
          }}
        >
          <Avatar
            firstName={currentUser?.first_name || ''}
            lastName={currentUser?.last_name || ''}
            size="sm"
          />
          <input
            className="thread-input flex-1 rounded-full px-4 py-2 text-sm"
            style={{
              background: 'rgba(255,255,255,0.07)',
              border: '1px solid rgba(255,255,255,0.1)',
              color: '#F5F0EF',
            }}
            value={text}
            onChange={handleTextChange}
            onKeyDown={handleKeyDown}
            placeholder="Type a message…"
          />
          <button
            type="button"
            onClick={handleSend}
            disabled={!text.trim() || sending}
            className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-colors"
            style={{
              background: text.trim() && !sending ? '#8B1520' : 'rgba(255,255,255,0.08)',
              border: 'none',
              color: '#F5F0EF',
              cursor: text.trim() && !sending ? 'pointer' : 'not-allowed',
              opacity: text.trim() && !sending ? 1 : 0.4,
            }}
            aria-label="Send message"
          >
            <ArrowRight size={16} />
          </button>
        </div>

        {/* Group info panel */}
        {chat.type === 'GROUP' && (
          <GroupInfoPanel
            chat={chat}
            currentUserId={currentUser?.id}
            open={showInfo}
            onClose={() => setShowInfo(false)}
            onChatUpdated={setChat}
            onLeave={() => navigate('/chats')}
          />
        )}
      </div>
    </>
  );
}
