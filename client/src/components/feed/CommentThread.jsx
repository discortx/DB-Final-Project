import { useState } from 'react';
import { ArrowRight, Trash2 } from 'lucide-react';
import Avatar from '../ui/Avatar';
import useAuthStore from '../../store/authStore';
import { addComment, deleteComment } from '../../api/posts';

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
    <div className="bg-[#EFEFEF] rounded-md p-3 mt-2 space-y-2">
      {/* Comment list */}
      {displayedComments.map((c) => {
        const isOwn = c.author_id === user?.id || c.user_id === user?.id;
        return (
          <div key={c.id} className="flex gap-2 items-start">
            <Avatar
              firstName={c.first_name || c.author_first_name || ''}
              lastName={c.last_name || c.author_last_name || ''}
              size="xs"
            />
            <div className="flex-1 min-w-0">
              <div className="bg-white rounded-md px-2.5 py-1.5 inline-block max-w-full">
                <span className="font-semibold text-xs text-[#0A0A0A] mr-1">
                  {c.first_name || c.author_first_name} {c.last_name || c.author_last_name}
                </span>
                <span className="text-sm text-[#0A0A0A] break-words">{c.content}</span>
              </div>
              <p className="text-[10px] text-[#888888] mt-0.5 pl-1">
                {timeAgo(c.created_at)}
              </p>
            </div>
            {isOwn && (
              <button
                type="button"
                disabled={deleting.has(c.id)}
                onClick={() => handleDelete(c.id)}
                className="text-[#CC0000] hover:bg-[#FFF5F5] rounded p-0.5 transition-colors shrink-0 mt-1 disabled:opacity-40"
                aria-label="Delete comment"
              >
                <Trash2 size={13} />
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
          className="text-xs text-[#404040] hover:text-[#0A0A0A] pl-8 transition-colors"
        >
          {showAll ? 'Show less' : `View ${hiddenCount} more comment${hiddenCount !== 1 ? 's' : ''}`}
        </button>
      )}

      {/* Add comment row */}
      <div className="flex items-center gap-2 mt-2">
        <Avatar firstName={user?.first_name} lastName={user?.last_name} size="xs" />
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Write a comment…"
          className="flex-1 bg-white border border-[#E0E0E0] rounded-full px-3 py-1.5 text-xs
                     focus:outline-none focus:border-black focus:ring-1 focus:ring-black transition-colors"
        />
        <button
          type="button"
          disabled={!text.trim() || submitting}
          onClick={handleSubmit}
          className="w-7 h-7 rounded-full bg-black flex items-center justify-center shrink-0
                     disabled:opacity-40 hover:bg-[#222] transition-colors"
          aria-label="Send comment"
        >
          <ArrowRight size={16} className="text-white" />
        </button>
      </div>
    </div>
  );
}
