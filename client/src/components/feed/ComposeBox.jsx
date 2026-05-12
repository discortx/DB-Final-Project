import { useState, useRef, useEffect } from 'react';
import { Users, Globe, Tag, Loader2, X, ChevronDown } from 'lucide-react';
import Avatar from '../ui/Avatar';
import Button from '../ui/Button';
import Modal from '../ui/Modal';
import useAuthStore from '../../store/authStore';
import useToastStore from '../../store/toastStore';
import { createPost } from '../../api/posts';
import { searchUsers } from '../../api/users';

/* ── visibility config ─────────────────────────────── */
const VISIBILITY_OPTIONS = [
  {
    value: 'FRIENDS',
    label: 'Friends only',
    icon: Users,
    desc: 'Only your friends can see this post.',
  },
  {
    value: 'FRIENDS_OF_FRIENDS',
    label: 'Friends of friends',
    icon: Users,
    desc: 'Your friends and their friends can see this.',
  },
  {
    value: 'PUBLIC',
    label: 'Public',
    icon: Globe,
    desc: 'Anyone on Nexus can see this post.',
  },
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
        className="flex items-center gap-1.5 text-xs text-[#404040] border border-[#E0E0E0] rounded-md px-2 py-1.5 hover:bg-[#EFEFEF] transition-colors"
      >
        <Icon size={14} />
        <span>{current.label}</span>
        <ChevronDown size={12} className="text-[#888888]" />
      </button>
      {open && (
        <div className="absolute left-0 top-full mt-1 z-50 bg-white border border-[#E0E0E0] rounded-lg shadow-md py-1 min-w-[200px]">
          {VISIBILITY_OPTIONS.map((opt) => {
            const OIcon = opt.icon;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => { onChange(opt.value); setOpen(false); }}
                className={`w-full text-left px-3 py-2 hover:bg-[#F7F7F7] transition-colors flex items-start gap-2
                  ${opt.value === value ? 'bg-[#F7F7F7]' : ''}`}
              >
                <OIcon size={14} className="mt-0.5 shrink-0 text-[#404040]" />
                <div>
                  <p className="text-sm font-medium text-[#0A0A0A]">{opt.label}</p>
                  <p className="text-xs text-[#888888]">{opt.desc}</p>
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
                <Avatar firstName={u.first_name} lastName={u.last_name} size="sm" />
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

  /* Focus textarea when expanding */
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

  return (
    <>
      <div className="bg-[#F7F7F7] border border-[#E0E0E0] rounded-lg p-4 mb-6">
        {/* Collapsed prompt */}
        {!expanded ? (
          <div className="flex items-center gap-3">
            <Avatar firstName={user?.first_name} lastName={user?.last_name} size="sm" />
            <div
              role="button"
              tabIndex={0}
              onClick={() => setExpanded(true)}
              onKeyDown={(e) => e.key === 'Enter' && setExpanded(true)}
              className="flex-1 bg-white border border-[#E0E0E0] rounded-full px-4 py-2 text-sm text-[#888888] cursor-text select-none hover:border-[#C0C0C0] transition-colors"
            >
              What's on your mind, {user?.first_name}?
            </div>
          </div>
        ) : (
          /* Expanded compose */
          <div>
            <div className="flex items-start gap-3">
              <Avatar firstName={user?.first_name} lastName={user?.last_name} size="sm" />
              <textarea
                ref={textareaRef}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder={`What's on your mind, ${user?.first_name}?`}
                rows={3}
                className="flex-1 bg-white border border-[#E0E0E0] rounded-md p-3 text-sm w-full min-h-[80px] resize-none
                           focus:outline-none focus:border-black focus:ring-1 focus:ring-black transition-colors"
              />
            </div>

            {/* Tagged users pills */}
            {taggedUsers.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2 pl-11">
                {taggedUsers.map((u) => (
                  <span
                    key={u.id}
                    className="inline-flex items-center gap-1 bg-[#0A0A0A] text-white text-xs px-2 py-0.5 rounded-full"
                  >
                    {u.first_name} {u.last_name}
                    <button
                      type="button"
                      onClick={() => toggleTag(u)}
                      className="hover:opacity-70"
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
                  className="flex items-center gap-1.5 text-xs text-[#404040] border border-[#E0E0E0] rounded-md px-2 py-1.5 hover:bg-[#EFEFEF] transition-colors"
                >
                  <Tag size={14} />
                  <span>Tag</span>
                  {taggedUsers.length > 0 && (
                    <span className="ml-0.5 font-semibold text-[#0A0A0A]">
                      ({taggedUsers.length})
                    </span>
                  )}
                </button>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => { setExpanded(false); setContent(''); setTaggedUsers([]); }}
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  disabled={!content.trim() || submitting}
                  loading={submitting}
                  onClick={handleSubmit}
                >
                  Post
                </Button>
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
