import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowRight, X, Edit2, Plus } from 'lucide-react';
import { getChat, updateChat, addMember, removeMember, updateMemberRole } from '../api/chats';
import { getMessages, sendMessage } from '../api/messages';
import { searchUsers } from '../api/users';
import useAuthStore from '../store/authStore';
import useToastStore from '../store/toastStore';
import socket from '../socket';
import ChatHeader from '../components/chat/ChatHeader';
import MessageBubble from '../components/chat/MessageBubble';
import Avatar from '../components/ui/Avatar';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Badge from '../components/ui/Badge';
import Divider from '../components/ui/Divider';
import { SkeletonAvatar, SkeletonText } from '../components/ui/Skeleton';

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
            className="block w-1.5 h-1.5 bg-[#888888] rounded-full animate-bounce"
            style={{ animationDelay: `${i * 150}ms`, animationDuration: '0.8s' }}
          />
        ))}
      </span>
      <span className="text-[10px] text-[#888888]">{label}</span>
    </div>
  );
}

// ─── Group Info Panel ─────────────────────────────────────────────────────────

function GroupInfoPanel({ chat, currentUserId, open, onClose, onChatUpdated, onLeave }) {
  const addToast = useToastStore((s) => s.addToast);
  const [editing, setEditing] = useState(false);
  const [nameVal, setNameVal] = useState(chat?.name || '');
  const [savingName, setSavingName] = useState(false);
  const [addQuery, setAddQuery] = useState('');
  const [addResults, setAddResults] = useState([]);
  const [showAddSearch, setShowAddSearch] = useState(false);
  const [roleLoading, setRoleLoading] = useState(null); // uid being changed
  const debouncedAdd = useDebounce(addQuery, 300);

  // Derive admin status from the member list role field
  const isAdmin = (chat?.members || []).some(
    (m) => String(m.id) === String(currentUserId) && m.role === 'ADMIN'
  );
  const isCreator = chat?.creator_id === currentUserId;

  useEffect(() => {
    setNameVal(chat?.name || '');
  }, [chat?.name]);

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
      console.error('[handleAddMember] error:', err);
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
      console.error('[handleRemoveMember] error:', err);
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

  return (
    <>
      {/* Overlay */}
      {open && (
        <div
          className="fixed inset-0 z-30"
          onClick={onClose}
        />
      )}

      {/* Panel */}
      <div
        className={`absolute right-0 top-0 bottom-0 z-40 w-[280px] bg-white border-l border-[#E0E0E0] shadow-xl flex flex-col transform transition-transform duration-200 ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Panel header */}
        <div className="flex items-center justify-between p-4 border-b border-[#E0E0E0] shrink-0">
          <span className="font-semibold text-sm text-[#0A0A0A]">Group Info</span>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-md hover:bg-[#EFEFEF] transition-colors text-[#888888]"
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
                <Input
                  value={nameVal}
                  onChange={(e) => setNameVal(e.target.value)}
                  autoFocus
                />
                <div className="flex gap-2">
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={handleSaveName}
                    loading={savingName}
                    disabled={!nameVal.trim()}
                  >
                    Save
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => { setEditing(false); setNameVal(chat?.name || ''); }}
                    disabled={savingName}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-lg font-semibold text-[#0A0A0A] flex-1 truncate">
                  {chat?.name || 'Group Chat'}
                </span>
                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => setEditing(true)}
                    className="p-1 rounded-md hover:bg-[#EFEFEF] transition-colors text-[#888888]"
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
            <p className="text-[10px] font-semibold text-[#888888] uppercase tracking-wider mb-2">
              {(chat?.members || []).length} members
            </p>
            <div className="space-y-1">
              {(chat?.members || []).map((member) => (
                <div key={member.id} className="flex items-center gap-2 py-1.5">
                  <Avatar
                    firstName={member.first_name || ''}
                    lastName={member.last_name || ''}
                    size="sm"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-[#0A0A0A] truncate font-medium">
                      {member.first_name} {member.last_name}
                      {/* Show Admin badge based on role field */}
                      {member.role === 'ADMIN' && (
                        <Badge variant="muted" className="ml-1">Admin</Badge>
                      )}
                    </p>
                    <p className="text-xs text-[#888888] truncate">@{member.username}</p>
                  </div>
                  {/* Admin actions for other members */}
                  {isAdmin && String(member.id) !== String(currentUserId) && (
                    <div className="flex items-center gap-1">
                      {/* Promote / Demote toggle */}
                      <button
                        type="button"
                        disabled={roleLoading === member.id}
                        onClick={() =>
                          handleChangeRole(
                            member,
                            member.role === 'ADMIN' ? 'MEMBER' : 'ADMIN'
                          )
                        }
                        className="p-1 rounded-md hover:bg-[#EFEFEF] transition-colors text-[#888888] text-[10px] font-semibold shrink-0"
                        aria-label={member.role === 'ADMIN' ? `Demote ${member.first_name}` : `Promote ${member.first_name}`}
                        title={member.role === 'ADMIN' ? 'Demote to Member' : 'Promote to Admin'}
                      >
                        {roleLoading === member.id ? '…' : member.role === 'ADMIN' ? '↓' : '↑'}
                      </button>
                      {/* Remove */}
                      <button
                        type="button"
                        onClick={() => handleRemoveMember(member)}
                        className="p-1 rounded-md hover:bg-[#EFEFEF] transition-colors text-[#CC0000] shrink-0"
                        aria-label={`Remove ${member.first_name}`}
                      >
                        <X size={14} />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Add member — visible to all admins */}
            {isAdmin && (
              <div className="mt-2">
                {showAddSearch ? (
                  <div className="relative">
                    <Input
                      placeholder="Search users…"
                      value={addQuery}
                      onChange={(e) => setAddQuery(e.target.value)}
                      autoFocus
                    />
                    {addResults.length > 0 && (
                      <div className="absolute top-full left-0 right-0 z-10 bg-white border border-[#E0E0E0] rounded-md shadow-sm mt-1 max-h-40 overflow-y-auto">
                        {addResults.map((u) => (
                          <button
                            key={u.id}
                            type="button"
                            onClick={() => handleAddMember(u)}
                            className="w-full flex items-center gap-2 px-2 py-1.5 hover:bg-[#EFEFEF] text-left"
                          >
                            <Avatar firstName={u.first_name || ''} lastName={u.last_name || ''} size="xs" />
                            <span className="text-xs text-[#0A0A0A]">
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
                    onClick={() => setShowAddSearch(true)}
                    className="flex items-center gap-1.5 text-xs text-[#0A0A0A] font-semibold px-2 py-1.5 rounded-md hover:bg-[#EFEFEF] transition-colors border border-[#E0E0E0] w-full justify-center"
                  >
                    <Plus size={12} />
                    Add member
                  </button>
                )}
              </div>
            )}
          </div>

          <Divider />

          {/* Leave / Delete */}
          {!isCreator && (
            <Button
              variant="ghost"
              size="sm"
              className="w-full text-[#CC0000] hover:bg-[#FFF0F0]"
              onClick={() => {
                // Leave group - remove self
                handleRemoveMember({ id: currentUserId, first_name: 'You' });
              }}
            >
              Leave group
            </Button>
          )}
          {isCreator && (
            <Button
              variant="danger"
              size="sm"
              className="w-full"
              onClick={() => {
                if (window.confirm('Delete this group? This cannot be undone.')) {
                  // No delete API in spec — show toast
                  addToast({ message: 'Delete group not supported yet', type: 'error' });
                }
              }}
            >
              Delete group
            </Button>
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

  // Load chat + messages on id change
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
          return prev.find((u) => u.userId === userId)
            ? prev
            : [...prev, { userId, firstName }];
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

  // Auto-scroll on new messages
  useEffect(() => {
    if (messages.length > 0) scrollToBottom('smooth');
  }, [messages.length, scrollToBottom]);

  const handleTextChange = (e) => {
    setText(e.target.value);

    // Emit typing start (debounced)
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
    // Stop typing
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
      setText(content); // restore
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
      <div className="flex flex-col h-[calc(100vh-56px)] -mt-6 -mx-4 bg-white">
        <div className="h-14 border-b border-[#E0E0E0] px-4 flex items-center gap-3">
          <SkeletonAvatar size="sm" />
          <div className="space-y-1 flex-1">
            <SkeletonText className="w-32" />
            <SkeletonText className="w-16" />
          </div>
        </div>
        <div className="flex-1 px-4 py-4 space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className={`flex gap-2 ${i % 3 === 0 ? 'flex-row-reverse' : ''}`}>
              <SkeletonAvatar size="xs" />
              <SkeletonText className={`h-8 rounded-lg ${i % 3 === 0 ? 'w-40' : 'w-56'}`} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!chat) {
    return (
      <div className="flex flex-col h-[calc(100vh-56px)] -mt-6 -mx-4 bg-white items-center justify-center">
        <p className="text-[#888888] text-sm">Chat not found.</p>
        <Button variant="ghost" size="sm" onClick={() => navigate('/chats')} className="mt-2">
          Back to chats
        </Button>
      </div>
    );
  }

  const messageGroups = groupMessagesByDate(messages);

  return (
    <div className="flex flex-col h-[calc(100vh-56px)] -mt-6 -mx-4 bg-white relative overflow-hidden">
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
            <p className="text-sm text-[#888888]">No messages yet. Say hello!</p>
          </div>
        )}

        {messageGroups.map((group) => (
          <div key={group.dateLabel}>
            {/* Date separator */}
            <div className="flex items-center gap-2 my-3">
              <hr className="flex-1 border-[#E0E0E0]" />
              <span className="text-[10px] text-[#888888] px-2 shrink-0">{group.dateLabel}</span>
              <hr className="flex-1 border-[#E0E0E0]" />
            </div>

            {group.messages.map((msg, idx) => {
              const prevMsg = idx > 0 ? group.messages[idx - 1] : null;
              const showAvatar =
                !prevMsg || prevMsg.sender_id !== msg.sender_id;
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

        {/* Typing indicator */}
        <TypingIndicator names={typingUsers.map((u) => u.firstName || 'Someone')} />

        {/* Scroll sentinel */}
        <div ref={bottomRef} />
      </div>

      {/* Input bar */}
      <div className="sticky bottom-0 bg-white border-t border-[#E0E0E0] px-4 py-3 flex items-center gap-3 shrink-0">
        <Avatar
          firstName={currentUser?.first_name || ''}
          lastName={currentUser?.last_name || ''}
          size="sm"
        />
        <input
          value={text}
          onChange={handleTextChange}
          onKeyDown={handleKeyDown}
          placeholder="Type a message…"
          className="flex-1 bg-[#F7F7F7] rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#C0C0C0] placeholder:text-[#888888] border border-[#E0E0E0]"
        />
        <button
          type="button"
          onClick={handleSend}
          disabled={!text.trim() || sending}
          className="w-9 h-9 bg-black text-white rounded-full flex items-center justify-center shrink-0 hover:bg-[#222] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          aria-label="Send message"
        >
          <ArrowRight size={16} />
        </button>
      </div>

      {/* Group info slide-in panel */}
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
  );
}
