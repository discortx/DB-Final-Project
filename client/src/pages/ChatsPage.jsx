import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { UserPlus, UsersRound, MessageCircle, X, Loader2 } from 'lucide-react';
import { getChats, openDm, createGroup } from '../api/chats';
import { searchUsers } from '../api/users';
import useToastStore from '../store/toastStore';
import ChatListItem from '../components/chat/ChatListItem';
import Modal from '../components/ui/Modal';
import EmptyState from '../components/ui/EmptyState';
import Avatar from '../components/ui/Avatar';

const CHATS_CSS = `
  .chats-input::placeholder { color: rgba(245,240,239,0.35); }
  .chats-input:focus { border-color: rgba(139,21,32,0.5) !important; outline: none; box-shadow: none; }
  .chats-textarea::placeholder { color: rgba(245,240,239,0.35); }
  .chats-textarea:focus { border-color: rgba(139,21,32,0.5) !important; outline: none; }
  .dm-result-btn:hover { background: rgba(255,255,255,0.06) !important; }
  .group-member-result:hover { background: rgba(255,255,255,0.06) !important; }
  .chats-icon-btn:hover { background: rgba(255,255,255,0.09) !important; }
`;

const inputStyle = {
  width: '100%',
  background: 'rgba(255,255,255,0.05)',
  border: '1px solid rgba(255,255,255,0.1)',
  color: '#F5F0EF',
  borderRadius: 6,
  padding: '7px 12px',
  fontSize: '0.875rem',
};

const iconBtnStyle = {
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
  width: 32, height: 32, borderRadius: 6,
  background: 'none', border: 'none',
  color: 'rgba(245,240,239,0.6)', cursor: 'pointer',
};

// ─── helpers ────────────────────────────────────────────────────────────────

function useDebounce(value, delay = 300) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

// ─── New DM Modal ────────────────────────────────────────────────────────────

function NewDMModal({ open, onClose, onCreated }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const debouncedQuery = useDebounce(query, 300);
  const addToast = useToastStore((s) => s.addToast);

  useEffect(() => {
    if (!debouncedQuery.trim()) { setResults([]); return; }
    setLoading(true);
    searchUsers(debouncedQuery)
      .then((r) => setResults(r.data || []))
      .catch(() => setResults([]))
      .finally(() => setLoading(false));
  }, [debouncedQuery]);

  useEffect(() => {
    if (!open) { setQuery(''); setResults([]); }
  }, [open]);

  const handleSelect = async (user) => {
    try {
      const r = await openDm(user.id);
      onCreated(r.data.id);
    } catch {
      addToast({ message: 'Could not open chat.', type: 'error' });
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="New Direct Message">
      <div className="space-y-3">
        <input
          className="chats-input"
          style={inputStyle}
          placeholder="Search by name or @username…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoFocus
        />
        {loading && (
          <p className="text-xs text-center py-2" style={{ color: 'rgba(245,240,239,0.45)' }}>
            Searching…
          </p>
        )}
        {!loading && results.length === 0 && query.trim() && (
          <p className="text-xs text-center py-2" style={{ color: 'rgba(245,240,239,0.45)' }}>
            No users found.
          </p>
        )}
        <div
          className="max-h-60 overflow-y-auto"
          style={{ borderTop: results.length ? '1px solid rgba(255,255,255,0.07)' : 'none' }}
        >
          {results.map((u) => (
            <button
              key={u.id}
              type="button"
              onClick={() => handleSelect(u)}
              className="dm-result-btn w-full flex items-center gap-3 px-2 py-2.5 text-left transition-colors"
              style={{ background: 'none', border: 'none', cursor: 'pointer', borderBottom: '1px solid rgba(255,255,255,0.06)' }}
            >
              <Avatar firstName={u.first_name || ''} lastName={u.last_name || ''} size="sm" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold truncate" style={{ color: '#F5F0EF' }}>
                  {u.first_name} {u.last_name}
                </p>
                <p className="text-xs" style={{ color: 'rgba(245,240,239,0.45)' }}>
                  @{u.username}
                </p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </Modal>
  );
}

// ─── New Group Modal ─────────────────────────────────────────────────────────

function NewGroupModal({ open, onClose, onCreated }) {
  const [groupName, setGroupName] = useState('');
  const [description, setDescription] = useState('');
  const [memberQuery, setMemberQuery] = useState('');
  const [memberResults, setMemberResults] = useState([]);
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const debouncedMemberQuery = useDebounce(memberQuery, 300);
  const addToast = useToastStore((s) => s.addToast);

  useEffect(() => {
    if (!debouncedMemberQuery.trim()) { setMemberResults([]); return; }
    searchUsers(debouncedMemberQuery)
      .then((r) => setMemberResults(r.data || []))
      .catch(() => setMemberResults([]));
  }, [debouncedMemberQuery]);

  useEffect(() => {
    if (!open) {
      setGroupName('');
      setDescription('');
      setMemberQuery('');
      setMemberResults([]);
      setSelectedMembers([]);
      setError('');
    }
  }, [open]);

  const addMemberToList = (user) => {
    if (!selectedMembers.find((m) => m.id === user.id)) {
      setSelectedMembers((prev) => [...prev, user]);
    }
    setMemberQuery('');
    setMemberResults([]);
  };

  const removeMemberFromList = (userId) => {
    setSelectedMembers((prev) => prev.filter((m) => m.id !== userId));
  };

  const handleCreate = async () => {
    setError('');
    if (!groupName.trim()) { setError('Group name required'); return; }
    if (selectedMembers.length < 2) { setError('Add at least 2 members'); return; }

    setCreating(true);
    try {
      const r = await createGroup({
        name: groupName.trim(),
        description: description.trim() || undefined,
        member_ids: selectedMembers.map((u) => Number(u.id)),
      });
      onCreated(r.data.id);
    } catch (err) {
      console.error('[NewGroupModal] createGroup error:', err);
      const msg =
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        err?.message ||
        'Failed to create group. Please try again.';
      setError(String(msg));
    } finally {
      setCreating(false);
    }
  };

  const labelStyle = { color: 'rgba(245,240,239,0.55)', fontSize: '0.75rem', fontWeight: 600, display: 'block', marginBottom: 4 };

  const ghostBtnStyle = {
    display: 'inline-flex', alignItems: 'center', gap: 4,
    background: 'none', border: '1px solid rgba(255,255,255,0.12)',
    color: 'rgba(245,240,239,0.75)', borderRadius: 6,
    padding: '6px 14px', fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer',
  };
  const primaryBtnStyle = {
    display: 'inline-flex', alignItems: 'center', gap: 6,
    background: '#8B1520', border: 'none', color: '#F5F0EF',
    borderRadius: 6, padding: '6px 14px', fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer',
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Create Group Chat"
      footer={
        <>
          <button type="button" style={ghostBtnStyle} onClick={onClose} disabled={creating}>
            Cancel
          </button>
          <button type="button" style={primaryBtnStyle} onClick={handleCreate} disabled={creating}>
            {creating && <Loader2 size={14} className="animate-spin" />}
            Create group
          </button>
        </>
      }
    >
      <div className="space-y-3">
        <div>
          <label style={labelStyle}>Group name</label>
          <input
            className="chats-input"
            style={{ ...inputStyle, width: '100%' }}
            placeholder="e.g. Study Group"
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            autoFocus
          />
        </div>

        <div>
          <label style={labelStyle}>Description (optional)</label>
          <textarea
            className="chats-textarea"
            style={{
              ...inputStyle,
              width: '100%',
              resize: 'none',
              borderRadius: 6,
            }}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What's this group about?"
            rows={2}
          />
        </div>

        {/* Member search */}
        <div>
          <label style={labelStyle}>Add members</label>
          <div className="relative">
            <input
              className="chats-input"
              style={{ ...inputStyle, width: '100%' }}
              placeholder="Search users…"
              value={memberQuery}
              onChange={(e) => setMemberQuery(e.target.value)}
            />
            {memberResults.length > 0 && (
              <div
                className="absolute top-full left-0 right-0 z-20 rounded-md mt-1 max-h-48 overflow-y-auto"
                style={{
                  background: 'rgba(23,18,20,0.98)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  backdropFilter: 'blur(12px)',
                  WebkitBackdropFilter: 'blur(12px)',
                }}
              >
                {memberResults.map((u) => (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => addMemberToList(u)}
                    className="group-member-result w-full flex items-center gap-2 px-3 py-2 text-left transition-colors"
                    style={{ background: 'none', border: 'none', cursor: 'pointer', borderBottom: '1px solid rgba(255,255,255,0.06)' }}
                  >
                    <Avatar firstName={u.first_name || ''} lastName={u.last_name || ''} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate" style={{ color: '#F5F0EF' }}>
                        {u.first_name} {u.last_name}
                      </p>
                      <p className="text-xs" style={{ color: 'rgba(245,240,239,0.45)' }}>
                        @{u.username}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Selected member pills */}
        {selectedMembers.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {selectedMembers.map((m) => (
              <span
                key={m.id}
                className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full"
                style={{
                  background: 'rgba(255,255,255,0.07)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  color: '#F5F0EF',
                }}
              >
                {m.first_name} {m.last_name}
                <button
                  type="button"
                  onClick={() => removeMemberFromList(m.id)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(245,240,239,0.45)', lineHeight: 1, padding: 0 }}
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}

        {error && (
          <p className="text-xs" style={{ color: '#E87080' }}>{error}</p>
        )}
      </div>
    </Modal>
  );
}

// ─── ChatsPage ───────────────────────────────────────────────────────────────

export default function ChatsPage() {
  const navigate = useNavigate();
  const location = useLocation();

  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dmModalOpen, setDmModalOpen] = useState(false);
  const [groupModalOpen, setGroupModalOpen] = useState(false);

  useEffect(() => {
    getChats()
      .then((r) => setChats(r.data || []))
      .catch(() => setChats([]))
      .finally(() => setLoading(false));
  }, []);

  const filteredChats = chats.filter((c) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (c.name || '').toLowerCase().includes(q);
  });

  const handleChatCreated = (chatId) => {
    setDmModalOpen(false);
    setGroupModalOpen(false);
    navigate(`/chats/${chatId}`);
    getChats().then((r) => setChats(r.data || [])).catch(() => {});
  };

  const activeMatch = location.pathname.match(/^\/chats\/([^/]+)/);
  const activeChatId = activeMatch ? activeMatch[1] : null;

  return (
    <>
      <style>{CHATS_CSS}</style>
      {/* 2-column layout filling AppShell content area */}
      <div className="flex h-[calc(100vh-56px)] -mt-6 -mx-4">
        {/* ── Left panel: chat list ── */}
        <div
          className="w-80 shrink-0 flex flex-col"
          style={{
            background: 'rgba(16,13,14,0.7)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            borderRight: '1px solid rgba(255,255,255,0.07)',
          }}
        >
          {/* Header */}
          <div
            className="sticky top-0 p-4 flex items-center shrink-0"
            style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}
          >
            <h2
              style={{
                fontFamily: "'Cormorant Garamond', serif",
                fontWeight: 700,
                fontSize: '1.25rem',
                color: '#F5F0EF',
              }}
            >
              Messages
            </h2>
            <div className="flex gap-1 ml-auto">
              <button
                type="button"
                className="chats-icon-btn transition-colors"
                style={iconBtnStyle}
                onClick={() => setDmModalOpen(true)}
                aria-label="New direct message"
              >
                <UserPlus size={16} />
              </button>
              <button
                type="button"
                className="chats-icon-btn transition-colors"
                style={iconBtnStyle}
                onClick={() => setGroupModalOpen(true)}
                aria-label="New group chat"
              >
                <UsersRound size={16} />
              </button>
            </div>
          </div>

          {/* Search */}
          <div className="px-3 py-2 shrink-0">
            <input
              className="chats-input"
              style={{ ...inputStyle, width: '100%', padding: '6px 10px', fontSize: '0.8rem' }}
              placeholder="Search conversations…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {/* Chat list */}
          <div className="flex-1 overflow-y-auto">
            {loading && (
              <div className="px-4 py-8 text-center text-sm" style={{ color: 'rgba(245,240,239,0.35)' }}>
                Loading…
              </div>
            )}
            {!loading && filteredChats.length === 0 && (
              <EmptyState
                icon={MessageCircle}
                title="No conversations yet"
                action={
                  <button
                    type="button"
                    onClick={() => setDmModalOpen(true)}
                    style={{
                      background: '#8B1520', border: 'none', color: '#F5F0EF',
                      borderRadius: 6, padding: '5px 14px', fontSize: '0.8rem',
                      fontWeight: 600, cursor: 'pointer',
                    }}
                  >
                    Start a DM
                  </button>
                }
              />
            )}
            {!loading &&
              filteredChats.map((chat) => (
                <ChatListItem
                  key={chat.id}
                  chat={chat}
                  isActive={String(activeChatId) === String(chat.id)}
                  onClick={() => navigate(`/chats/${chat.id}`)}
                />
              ))}
          </div>
        </div>

        {/* ── Right panel: transparent placeholder ── */}
        <div className="flex-1 hidden md:flex flex-col items-center justify-center">
          {!activeChatId && (
            <EmptyState
              icon={MessageCircle}
              title="Select a conversation"
              description="Choose a chat from the list or start a new one."
            />
          )}
        </div>
      </div>

      {/* Modals */}
      <NewDMModal
        open={dmModalOpen}
        onClose={() => setDmModalOpen(false)}
        onCreated={handleChatCreated}
      />
      <NewGroupModal
        open={groupModalOpen}
        onClose={() => setGroupModalOpen(false)}
        onCreated={handleChatCreated}
      />
    </>
  );
}
