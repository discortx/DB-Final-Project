import { useState, useRef, useEffect } from 'react';
import { Users, Globe, Tag, Loader2, X, ChevronDown } from 'lucide-react';
import Avatar from '../ui/Avatar';
import Modal from '../ui/Modal';
import useAuthStore from '../../store/authStore';
import useToastStore from '../../store/toastStore';
import { createPost } from '../../api/posts';
import { searchUsers } from '../../api/users';

const COMPOSE_CSS = `
  .compose-textarea::placeholder { color: rgba(245,240,239,0.28); }
  .compose-textarea:focus { border-color: rgba(139,21,32,0.4) !important; outline: none; }
  .compose-tag-btn:hover { background: rgba(255,255,255,0.08) !important; }
`;

/* ── visibility config ─────────────────────────────── */
const VISIBILITY_OPTIONS = [
  { value: 'FRIENDS',          label: 'Friends only',       icon: Users, desc: 'Only your friends can see this post.'          },
  { value: 'FRIENDS_OF_FRIENDS', label: 'Friends of friends', icon: Users, desc: 'Your friends and their friends can see this.' },
  { value: 'PUBLIC',           label: 'Public',             icon: Globe, desc: 'Anyone on Sora Link can see this post.'         },
];

function VisibilityDropdown({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const current = VISIBILITY_OPTIONS.find((o) => o.value === value) || VISIBILITY_OPTIONS[0];
  const Icon = current.icon;

  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    if (open) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="compose-tag-btn flex items-center gap-1.5 transition-colors"
        style={{
          fontSize: '0.75rem',
          color: 'rgba(245,240,239,0.5)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: '6px',
          padding: '4px 10px',
          background: 'transparent',
          cursor: 'pointer',
        }}
      >
        <Icon size={13} />
        <span>{current.label}</span>
        <ChevronDown size={11} style={{ color: 'rgba(245,240,239,0.3)' }} />
      </button>
      {open && (
        <div
          className="absolute left-0 top-full mt-1 z-50 py-1"
          style={{
            background: '#1E181A',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '8px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
            minWidth: '210px',
          }}
        >
          {VISIBILITY_OPTIONS.map((opt) => {
            const OIcon = opt.icon;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => { onChange(opt.value); setOpen(false); }}
                className="w-full text-left flex items-start gap-2 px-3 py-2 transition-colors hover:bg-white/5"
                style={{
                  background: opt.value === value ? 'rgba(255,255,255,0.04)' : 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                <OIcon size={13} style={{ marginTop: '2px', flexShrink: 0, color: 'rgba(245,240,239,0.45)' }} />
                <div>
                  <p style={{ fontSize: '0.82rem', fontWeight: 500, color: '#F5F0EF' }}>{opt.label}</p>
                  <p style={{ fontSize: '0.72rem', color: 'rgba(245,240,239,0.38)' }}>{opt.desc}</p>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ── Tag users modal ──────────────────────────────── */
function TagModal({ open, onClose, taggedUsers, onToggle }) {
  const [query,   setQuery]   = useState('');
  const [results, setResults] = useState([]);

  useEffect(() => {
    if (!query.trim()) { setResults([]); return; }
    const t = setTimeout(async () => {
      try {
        const res = await searchUsers(query);
        setResults(res.data || []);
      } catch { setResults([]); }
    }, 300);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => {
    if (!open) { setQuery(''); setResults([]); }
  }, [open]);

  const taggedIds = new Set(taggedUsers.map((u) => u.id));

  return (
    <Modal open={open} onClose={onClose} title="Tag People">
      <input
        type="text"
        autoFocus
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search by name or username…"
        className="w-full border border-[#E0E0E0] rounded-md px-3 py-2 text-sm mb-3
                   focus:outline-none focus:border-black focus:ring-1 focus:ring-black"
      />
      {results.length > 0 && (
        <ul className="max-h-52 overflow-y-auto border border-[#E0E0E0] rounded-md divide-y divide-[#F0F0F0]">
          {results.map((u) => (
            <li key={u.id}>
              <button
                type="button"
                onClick={() => onToggle(u)}
                className="w-full flex items-center gap-2 px-3 py-2 hover:bg-[#F7F7F7] transition-colors text-left"
              >
                <Avatar firstName={u.first_name} lastName={u.last_name} userId={u.id} size="sm" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[#0A0A0A] truncate">
                    {u.first_name} {u.last_name}
                  </p>
                  <p className="text-xs text-[#888888]">@{u.username}</p>
                </div>
                {taggedIds.has(u.id) && (
                  <span className="text-xs font-semibold text-[#1A7A4A]">Tagged</span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
      {taggedUsers.length > 0 && (
        <div className="mt-3">
          <p className="text-xs text-[#888888] mb-1.5">Tagged:</p>
          <div className="flex flex-wrap gap-1.5">
            {taggedUsers.map((u) => (
              <span
                key={u.id}
                className="inline-flex items-center gap-1 bg-[#0A0A0A] text-white text-xs px-2 py-0.5 rounded-full"
              >
                {u.first_name} {u.last_name}
                <button type="button" onClick={() => onToggle(u)} className="hover:opacity-70">
                  <X size={10} />
                </button>
              </span>
            ))}
          </div>
        </div>
      )}
    </Modal>
  );
}

/* ── ComposeBox ─────────────────────────────────────── */
export default function ComposeBox({ onPost }) {
  const user     = useAuthStore((s) => s.user);
  const addToast = useToastStore((s) => s.addToast);

  const [expanded,    setExpanded]    = useState(false);
  const [content,     setContent]     = useState('');
  const [visibility,  setVisibility]  = useState('FRIENDS');
  const [taggedUsers, setTaggedUsers] = useState([]);
  const [tagModal,    setTagModal]    = useState(false);
  const [submitting,  setSubmitting]  = useState(false);
  const textareaRef = useRef(null);

  useEffect(() => {
    if (expanded && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [expanded]);

  const toggleTag = (u) => {
    setTaggedUsers((prev) =>
      prev.some((x) => x.id === u.id)
        ? prev.filter((x) => x.id !== u.id)
        : [...prev, u]
    );
  };

  const handleSubmit = async () => {
    if (!content.trim() || submitting) return;
    setSubmitting(true);
    try {
      const res = await createPost({
        content: content.trim(),
        visibility,
        tagged_user_ids: taggedUsers.map((u) => u.id),
      });
      const newPost = {
        ...res.data,
        first_name:    user?.first_name,
        last_name:     user?.last_name,
        username:      user?.username,
        author_id:     user?.id,
        like_count:    0,
        comment_count: 0,
        liked_by_me:   false,
        comments:      [],
      };
      onPost?.(newPost);
      setContent('');
      setTaggedUsers([]);
      setVisibility('FRIENDS');
      setExpanded(false);
      addToast({ message: 'Post shared!', type: 'success' });
    } catch (err) {
      addToast({ message: err?.response?.data?.message || 'Failed to post.', type: 'error' });
    }
    setSubmitting(false);
  };

  const canPost = content.trim().length > 0 && !submitting;

  return (
    <>
      <style>{COMPOSE_CSS}</style>
      <div
        style={{
          background: '#171214',
          border: '1px solid rgba(255,255,255,0.07)',
          borderRadius: '10px',
          padding: '16px',
          marginBottom: '16px',
        }}
      >
        {/* Collapsed prompt */}
        {!expanded ? (
          <div className="flex items-center gap-3">
            <Avatar firstName={user?.first_name} lastName={user?.last_name} userId={user?.id} size="sm" />
            <div
              role="button"
              tabIndex={0}
              onClick={() => setExpanded(true)}
              onKeyDown={(e) => e.key === 'Enter' && setExpanded(true)}
              style={{
                flex: 1,
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '24px',
                padding: '8px 16px',
                fontSize: '0.875rem',
                color: 'rgba(245,240,239,0.28)',
                cursor: 'text',
                userSelect: 'none',
                transition: 'border-color 0.15s',
              }}
            >
              What's on your mind, {user?.first_name}?
            </div>
          </div>
        ) : (
          /* Expanded */
          <div>
            <div className="flex items-start gap-3">
              <Avatar firstName={user?.first_name} lastName={user?.last_name} userId={user?.id} size="sm" />
              <textarea
                ref={textareaRef}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder={`What's on your mind, ${user?.first_name}?`}
                rows={3}
                className="compose-textarea"
                style={{
                  flex: 1,
                  width: '100%',
                  minHeight: '80px',
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '8px',
                  color: '#F5F0EF',
                  fontSize: '0.875rem',
                  padding: '10px 12px',
                  resize: 'none',
                  fontFamily: 'inherit',
                  transition: 'border-color 0.2s',
                }}
              />
            </div>

            {/* Tagged user pills */}
            {taggedUsers.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2 pl-11">
                {taggedUsers.map((u) => (
                  <span
                    key={u.id}
                    style={{
                      background: '#8B1520',
                      color: '#F5F0EF',
                      fontSize: '0.7rem',
                      padding: '2px 8px',
                      borderRadius: '20px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    {u.first_name} {u.last_name}
                    <button
                      type="button"
                      onClick={() => toggleTag(u)}
                      style={{ opacity: 0.7, background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex' }}
                    >
                      <X size={10} />
                    </button>
                  </span>
                ))}
              </div>
            )}

            {/* Action row */}
            <div className="flex items-center justify-between mt-3 flex-wrap gap-2 pl-11">
              <div className="flex items-center gap-2 flex-wrap">
                <VisibilityDropdown value={visibility} onChange={setVisibility} />
                <button
                  type="button"
                  onClick={() => setTagModal(true)}
                  className="compose-tag-btn flex items-center gap-1.5 transition-colors"
                  style={{
                    fontSize: '0.75rem',
                    color: 'rgba(245,240,239,0.5)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '6px',
                    padding: '4px 10px',
                    background: 'transparent',
                    cursor: 'pointer',
                  }}
                >
                  <Tag size={13} />
                  <span>Tag</span>
                  {taggedUsers.length > 0 && (
                    <span style={{ fontWeight: 600, color: '#F5F0EF' }}>
                      ({taggedUsers.length})
                    </span>
                  )}
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => { setExpanded(false); setContent(''); setTaggedUsers([]); }}
                  style={{
                    fontSize: '0.8rem',
                    color: 'rgba(245,240,239,0.38)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '4px 8px',
                    transition: 'color 0.15s',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={!canPost}
                  onClick={handleSubmit}
                  style={{
                    fontSize: '0.82rem',
                    fontWeight: 600,
                    background: canPost ? '#8B1520' : 'rgba(139,21,32,0.35)',
                    color: canPost ? '#F5F0EF' : 'rgba(245,240,239,0.4)',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '5px 18px',
                    cursor: canPost ? 'pointer' : 'not-allowed',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px',
                    transition: 'background 0.15s',
                  }}
                >
                  {submitting && <Loader2 size={13} className="animate-spin" />}
                  Post
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Tag modal */}
      <TagModal
        open={tagModal}
        onClose={() => setTagModal(false)}
        taggedUsers={taggedUsers}
        onToggle={toggleTag}
      />
    </>
  );
}
