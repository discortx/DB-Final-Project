import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { UserPlus, UsersRound, MessageCircle } from 'lucide-react';
import { getChats, openDm, createGroup } from '../api/chats';
import { searchUsers } from '../api/users';
import useAuthStore from '../store/authStore';
import useToastStore from '../store/toastStore';
import ChatListItem from '../components/chat/ChatListItem';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Modal from '../components/ui/Modal';
import EmptyState from '../components/ui/EmptyState';
import Avatar from '../components/ui/Avatar';

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

  // Reset on close
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
        <Input
          placeholder="Search by name or @username…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoFocus
        />
        {loading && (
          <p className="text-xs text-[#888888] text-center py-2">Searching…</p>
        )}
        {!loading && results.length === 0 && query.trim() && (
          <p className="text-xs text-[#888888] text-center py-2">No users found.</p>
        )}
        <div className="max-h-60 overflow-y-auto divide-y divide-[#E0E0E0]">
          {results.map((u) => (
            <button
              key={u.id}
              type="button"
              onClick={() => handleSelect(u)}
              className="w-full flex items-center gap-3 px-2 py-2.5 hover:bg-[#EFEFEF] transition-colors text-left"
            >
              <Avatar firstName={u.first_name || ''} lastName={u.last_name || ''} size="sm" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-[#0A0A0A] truncate">
                  {u.first_name} {u.last_name}
                </p>
                <p className="text-xs text-[#888888]">@{u.username}</p>
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

  useEffect(() => {
    if (!debouncedMemberQuery.trim()) { setMemberResults([]); return; }
    searchUsers(debouncedMemberQuery)
      .then((r) => setMemberResults(r.data || []))
      .catch(() => setMemberResults([]));
  }, [debouncedMemberQuery]);

  // Reset on close
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
        member_ids: selectedMembers.map((u) => u.id),
      });
      onCreated(r.data.id);
    } catch {
      setError('Failed to create group. Please try again.');
    } finally {
      setCreating(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Create Group Chat"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={creating}>Cancel</Button>
          <Button variant="primary" onClick={handleCreate} loading={creating}>
            Create group
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <Input
          label="Group name"
          placeholder="e.g. Study Group"
          value={groupName}
          onChange={(e) => setGroupName(e.target.value)}
          autoFocus
        />

        <div className="w-full">
          <label className="text-xs font-semibold text-[#404040] mb-1 block">
            Description (optional)
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What's this group about?"
            rows={2}
            className="text-sm border border-[#E0E0E0] rounded-md px-3 py-2 resize-none w-full focus:outline-none focus:border-black focus:ring-1 focus:ring-black placeholder:text-[#888888]"
          />
        </div>

        {/* Member search */}
        <div className="relative">
          <Input
            label="Add members"
            placeholder="Add members…"
            value={memberQuery}
            onChange={(e) => setMemberQuery(e.target.value)}
          />
          {memberResults.length > 0 && (
            <div className="absolute top-full left-0 right-0 z-20 bg-white border border-[#E0E0E0] rounded-md shadow-sm mt-1 max-h-48 overflow-y-auto">
              {memberResults.map((u) => (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => addMemberToList(u)}
                  className="w-full flex items-center gap-2 px-3 py-2 hover:bg-[#EFEFEF] text-left"
                >
                  <Avatar firstName={u.first_name || ''} lastName={u.last_name || ''} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-[#0A0A0A] truncate">
                      {u.first_name} {u.last_name}
                    </p>
                    <p className="text-xs text-[#888888]">@{u.username}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Selected member pills */}
        {selectedMembers.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {selectedMembers.map((m) => (
              <span
                key={m.id}
                className="inline-flex items-center gap-1.5 bg-[#F7F7F7] border border-[#E0E0E0] text-xs text-[#0A0A0A] px-2.5 py-1 rounded-full"
              >
                {m.first_name} {m.last_name}
                <button
                  type="button"
                  onClick={() => removeMemberFromList(m.id)}
                  className="text-[#888888] hover:text-[#CC0000] transition-colors leading-none"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}

        {error && (
          <p className="text-xs text-[#CC0000]">{error}</p>
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
    // Refresh chat list
    getChats().then((r) => setChats(r.data || [])).catch(() => {});
  };

  // Determine active chat from URL
  const activeMatch = location.pathname.match(/^\/chats\/([^/]+)/);
  const activeChatId = activeMatch ? activeMatch[1] : null;

  return (
    <>
      {/* 2-column layout filling AppShell content area */}
      <div className="flex h-[calc(100vh-56px)] -mt-6 -mx-4">
        {/* ── Left panel: chat list ── */}
        <div className="w-80 shrink-0 bg-[#F7F7F7] border-r border-[#E0E0E0] flex flex-col">
          {/* Header */}
          <div className="sticky top-0 bg-[#F7F7F7] border-b border-[#E0E0E0] p-4 flex items-center">
            <h2 className="text-xl font-semibold text-[#0A0A0A]">Messages</h2>
            <div className="flex gap-2 ml-auto">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setDmModalOpen(true)}
                className="p-1.5"
                aria-label="New direct message"
              >
                <UserPlus size={16} />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setGroupModalOpen(true)}
                className="p-1.5"
                aria-label="New group chat"
              >
                <UsersRound size={16} />
              </Button>
            </div>
          </div>

          {/* Search */}
          <div className="px-4 py-2">
            <Input
              placeholder="Search conversations…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {/* Chat list */}
          <div className="flex-1 overflow-y-auto">
            {loading && (
              <div className="px-4 py-8 text-center text-sm text-[#888888]">Loading…</div>
            )}
            {!loading && filteredChats.length === 0 && (
              <EmptyState
                icon={MessageCircle}
                title="No conversations yet"
                action={
                  <Button variant="primary" size="sm" onClick={() => setDmModalOpen(true)}>
                    Start a DM
                  </Button>
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

        {/* ── Right panel: empty state on /chats, thread on /chats/:id ── */}
        <div className="flex-1 bg-white hidden md:flex flex-col items-center justify-center">
          {!activeChatId ? (
            <EmptyState
              icon={MessageCircle}
              title="Select a conversation"
              description="Choose a chat from the list or start a new one."
            />
          ) : (
            /* When a thread is active, the child route (ChatThreadPage) renders via AppShell Outlet.
               This panel is visible behind it but won't show because ChatThreadPage is the Outlet. */
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
