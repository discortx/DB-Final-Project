import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Send, Trash2 } from 'lucide-react';
import Avatar from '../ui/Avatar';
import useAuthStore from '../../store/authStore';
import { addComment, deleteComment } from '../../api/posts';

const THREAD_CSS = `
  .ct-input::placeholder { color: rgba(245,240,239,0.28); }
  .ct-input:focus {
    border-color: rgba(139,21,32,0.5) !important;
    background: rgba(196,30,51,0.05) !important;
    outline: none;
  }
`;

function timeAgo(dateStr) {
  if (!dateStr) return '';
  const m = Math.floor((Date.now() - new Date(dateStr)) / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  if (m < 1440) return `${Math.floor(m / 60)}h ago`;
  return `${Math.floor(m / 1440)}d ago`;
}

export default function CommentThread({ postId, comments = [], onCommentAdded, onCommentDeleted }) {
  const user         = useAuthStore((s) => s.user);
  const [text,       setText]       = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showAll,    setShowAll]    = useState(false);
  const [deleting,   setDeleting]   = useState(new Set());

  const INITIAL_VISIBLE = 3;
  const displayedComments = showAll ? comments : comments.slice(0, INITIAL_VISIBLE);
  const hiddenCount = comments.length - INITIAL_VISIBLE;

  const handleSubmit = async () => {
    const trimmed = text.trim();
    if (!trimmed || submitting) return;
    setSubmitting(true);
    try {
      const res = await addComment(postId, trimmed);
      onCommentAdded?.(res.data);
      setText('');
    } catch {}
    setSubmitting(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleDelete = async (cid) => {
    setDeleting((s) => new Set([...s, cid]));
    try {
      await deleteComment(postId, cid);
      onCommentDeleted?.(cid);
    } catch {}
    setDeleting((s) => { const n = new Set(s); n.delete(cid); return n; });
  };

  return (
    <>
      <style>{THREAD_CSS}</style>
      <div
        className="mt-3 space-y-2.5 pt-3"
        style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
      >
        {/* Comment list */}
        {displayedComments.map((c) => {
          const isOwn = c.author_id === user?.id || c.user_id === user?.id;
          const firstName = c.first_name || c.author_first_name || '';
          const lastName  = c.last_name  || c.author_last_name  || '';
          return (
            <div key={c.id} className="flex gap-2 items-start group">
              <Avatar firstName={firstName} lastName={lastName} size="xs" />
              <div className="flex-1 min-w-0">
                <div
                  className="inline-block max-w-full px-3 py-2 rounded-xl"
                  style={{
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.07)',
                  }}
                >
                  <Link
                    to={`/profile/${c.author_id}`}
                    className="hover:underline mr-1"
                    style={{ color: '#F5F0EF', fontWeight: 600, fontSize: '0.78rem' }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    {firstName} {lastName}
                  </Link>
                  <span style={{ color: 'rgba(245,240,239,0.82)', fontSize: '0.82rem', wordBreak: 'break-words' }}>
                    {c.content}
                  </span>
                </div>
                <p style={{ color: 'rgba(245,240,239,0.3)', fontSize: '0.68rem', marginTop: '3px', paddingLeft: '4px' }}>
                  {timeAgo(c.created_at)}
                </p>
              </div>
              {isOwn && (
                <button
                  type="button"
                  disabled={deleting.has(c.id)}
                  onClick={() => handleDelete(c.id)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mt-1 flex items-center justify-center w-6 h-6 rounded-md hover:bg-white/5 disabled:opacity-30"
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(232,112,128,0.7)' }}
                  aria-label="Delete comment"
                >
                  <Trash2 size={12} />
                </button>
              )}
            </div>
          );
        })}

        {/* Show more / less */}
        {comments.length > INITIAL_VISIBLE && (
          <button
            type="button"
            onClick={() => setShowAll((v) => !v)}
            className="transition-colors pl-8 hover:text-white/60"
            style={{ color: 'rgba(245,240,239,0.38)', fontSize: '0.75rem', background: 'none', border: 'none', cursor: 'pointer' }}
          >
            {showAll ? 'Show less' : `View ${hiddenCount} more comment${hiddenCount !== 1 ? 's' : ''}`}
          </button>
        )}

        {/* Add comment row */}
        <div className="flex items-center gap-2 pt-1">
          <Avatar firstName={user?.first_name} lastName={user?.last_name} size="xs" />
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Write a comment…"
            className="ct-input flex-1"
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '20px',
              color: '#F5F0EF',
              fontSize: '0.8rem',
              padding: '6px 14px',
              transition: 'border-color 0.2s, background 0.2s',
            }}
          />
          <button
            type="button"
            disabled={!text.trim() || submitting}
            onClick={handleSubmit}
            className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 transition-colors"
            style={{
              background: text.trim() && !submitting ? '#8B1520' : 'rgba(255,255,255,0.07)',
              border: 'none',
              cursor: text.trim() && !submitting ? 'pointer' : 'not-allowed',
              color: '#F5F0EF',
              opacity: !text.trim() || submitting ? 0.45 : 1,
              transition: 'background 0.15s, opacity 0.15s',
            }}
            aria-label="Send comment"
          >
            <Send size={13} />
          </button>
        </div>
      </div>
    </>
  );
}
