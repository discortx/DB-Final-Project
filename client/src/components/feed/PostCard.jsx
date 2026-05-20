import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  ThumbsUp, MessageSquare, Share2, MoreHorizontal, Globe, Users,
} from 'lucide-react';
import Avatar from '../ui/Avatar';
import Button from '../ui/Button';
import Dropdown, { DropdownItem, DropdownDivider } from '../ui/Dropdown';
import CommentThread from './CommentThread';
import useAuthStore from '../../store/authStore';
import useToastStore from '../../store/toastStore';
import { likePost, unlikePost, updatePost, deletePost, getComments } from '../../api/posts';

const CARD_CSS = `
  .post-card {
    transition: border-color 0.2s ease, box-shadow 0.2s ease;
  }
  .post-card:hover {
    border-color: rgba(255,255,255,0.13) !important;
    box-shadow: 0 4px 28px rgba(0,0,0,0.35) !important;
  }
  @keyframes postFadeUp {
    from { opacity: 0; transform: translateY(-6px); }
    to   { opacity: 1; transform: translateY(0);    }
  }
  .post-card-new {
    animation: postFadeUp 0.25s ease forwards;
  }
  .post-edit-ta::placeholder { color: rgba(245,240,239,0.25); }
  .post-edit-ta:focus { border-color: rgba(139,21,32,0.4) !important; outline: none; }
`;

function timeAgo(dateStr) {
  if (!dateStr) return '';
  const m = Math.floor((Date.now() - new Date(dateStr)) / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  if (m < 1440) return `${Math.floor(m / 60)}h ago`;
  if (m < 10080) return `${Math.floor(m / 1440)}d ago`;
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function VisibilityPill({ visibility }) {
  if (visibility === 'FRIENDS') {
    return (
      <span style={{
        border: '1px solid rgba(26,122,74,0.4)', color: '#4ABA80',
        background: 'rgba(26,122,74,0.1)', fontSize: '10px',
        padding: '1px 8px', borderRadius: '20px',
        display: 'inline-flex', alignItems: 'center', gap: '4px', flexShrink: 0,
      }}>
        <Users size={9} /> Friends
      </span>
    );
  }
  if (visibility === 'FRIENDS_OF_FRIENDS') {
    return (
      <span style={{
        border: '1px solid rgba(245,240,239,0.15)', color: 'rgba(245,240,239,0.5)',
        fontSize: '10px', padding: '1px 8px', borderRadius: '20px',
        display: 'inline-flex', alignItems: 'center', gap: '4px', flexShrink: 0,
      }}>
        <Users size={9} /> Friends of Friends
      </span>
    );
  }
  return (
    <span style={{
      background: 'rgba(139,21,32,0.2)', border: '1px solid rgba(139,21,32,0.4)',
      color: '#C41E33', fontSize: '10px', padding: '1px 8px', borderRadius: '20px',
      display: 'inline-flex', alignItems: 'center', gap: '4px', flexShrink: 0,
    }}>
      <Globe size={9} /> Public
    </span>
  );
}

export default function PostCard({ post, onDelete, onUpdate, isNew = false }) {
  const currentUser = useAuthStore((s) => s.user);
  const addToast    = useToastStore((s) => s.addToast);

  const [localPost,      setLocalPost]      = useState(post);
  const [commentsOpen,   setCommentsOpen]   = useState(false);
  const [commentsLoaded, setCommentsLoaded] = useState(false);
  const [editMode,       setEditMode]       = useState(false);
  const [editContent,    setEditContent]    = useState(post.content);
  const [saving,         setSaving]         = useState(false);
  const [deleting,       setDeleting]       = useState(false);
  const [liking,         setLiking]         = useState(false);
  const [confirmDelete,  setConfirmDelete]  = useState(false);
  const confirmResetRef = useRef(null);

  useEffect(() => () => clearTimeout(confirmResetRef.current), []);

  /* ── like / unlike ── */
  const handleLike = async () => {
    if (liking) return;
    setLiking(true);
    const wasLiked = localPost.liked_by_me;
    setLocalPost((p) => ({
      ...p,
      liked_by_me: !wasLiked,
      like_count:  wasLiked ? p.like_count - 1 : p.like_count + 1,
    }));
    try {
      if (wasLiked) await unlikePost(localPost.id);
      else          await likePost(localPost.id);
    } catch {
      setLocalPost((p) => ({
        ...p,
        liked_by_me: wasLiked,
        like_count:  wasLiked ? p.like_count + 1 : p.like_count - 1,
      }));
      addToast({ message: 'Could not update like.', type: 'error' });
    }
    setLiking(false);
  };

  /* ── save edit ── */
  const handleSaveEdit = async () => {
    const trimmed = editContent.trim();
    if (!trimmed || saving) return;
    setSaving(true);
    try {
      const res = await updatePost(localPost.id, { content: trimmed });
      const updated = { ...localPost, ...res.data, content: trimmed };
      setLocalPost(updated);
      onUpdate?.(updated);
      setEditMode(false);
    } catch {
      addToast({ message: 'Could not save edit.', type: 'error' });
    }
    setSaving(false);
  };

  /* ── delete (two-tap confirmation) ── */
  const handleDeleteClick = () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      confirmResetRef.current = setTimeout(() => setConfirmDelete(false), 3000);
    } else {
      clearTimeout(confirmResetRef.current);
      setDeleting(true);
      deletePost(localPost.id)
        .then(() => onDelete?.(localPost.id))
        .catch(() => {
          addToast({ message: 'Could not delete post.', type: 'error' });
          setDeleting(false);
        });
    }
  };

  /* ── comment handlers ── */
  const handleCommentAdded = (newComment) => {
    const updated = { ...localPost, comments: [...(localPost.comments || []), newComment], comment_count: (localPost.comment_count || 0) + 1 };
    setLocalPost(updated);
    onUpdate?.(updated);
  };

  const handleCommentDeleted = (cid) => {
    const updated = { ...localPost, comments: (localPost.comments || []).filter((c) => c.id !== cid), comment_count: Math.max(0, (localPost.comment_count || 0) - 1) };
    setLocalPost(updated);
    onUpdate?.(updated);
  };

  const handleToggleComments = async () => {
    const opening = !commentsOpen;
    setCommentsOpen(opening);
    if (opening && !commentsLoaded) {
      try {
        const res = await getComments(localPost.id);
        setLocalPost((p) => ({ ...p, comments: res.data || [] }));
        setCommentsLoaded(true);
      } catch {}
    }
  };

  const handleShare = () => {
    addToast({ message: 'Link copied!', type: 'success' });
  };

  const isOwn = localPost.author_id === currentUser?.id;

  return (
    <>
      <style>{CARD_CSS}</style>
      <div
        className={`post-card ${isNew ? 'post-card-new' : ''}`}
        style={{
          background: 'rgba(23,18,20,0.65)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '12px',
          padding: '16px',
          marginBottom: '10px',
        }}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <Link
            to={`/profile/${localPost.author_id}`}
            className="flex items-center gap-3 min-w-0 group"
            onClick={(e) => e.stopPropagation()}
          >
            <Avatar
              firstName={localPost.first_name}
              lastName={localPost.last_name}
              userId={localPost.author_id}
              size="md"
            />
            <div className="min-w-0">
              <p
                className="truncate group-hover:underline"
                style={{ color: '#F5F0EF', fontWeight: 600, fontSize: '0.875rem' }}
              >
                {localPost.first_name} {localPost.last_name}
              </p>
              <p style={{ color: 'rgba(245,240,239,0.38)', fontSize: '0.72rem' }}>
                @{localPost.username} · {timeAgo(localPost.created_at)}
              </p>
            </div>
          </Link>

          <div className="flex items-center gap-2 shrink-0">
            <VisibilityPill visibility={localPost.visibility} />
            {isOwn && (
              <Dropdown
                align="right"
                trigger={
                  <button
                    type="button"
                    className="w-7 h-7 flex items-center justify-center rounded-md transition-colors hover:bg-white/5 cursor-pointer"
                    style={{ color: 'rgba(245,240,239,0.35)', background: 'none', border: 'none' }}
                    aria-label="Post options"
                  >
                    <MoreHorizontal size={15} />
                  </button>
                }
              >
                <DropdownItem onClick={() => { setEditMode(true); setEditContent(localPost.content); }}>
                  Edit
                </DropdownItem>
                <DropdownDivider />
                <DropdownItem
                  danger
                  onClick={handleDeleteClick}
                >
                  {deleting ? 'Deleting…' : confirmDelete ? 'Tap again to confirm' : 'Delete'}
                </DropdownItem>
              </Dropdown>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="mt-3">
          {editMode ? (
            <div>
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                rows={3}
                className="post-edit-ta"
                style={{
                  width: '100%',
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '6px',
                  color: '#F5F0EF',
                  fontSize: '0.875rem',
                  padding: '10px 12px',
                  resize: 'none',
                  fontFamily: 'inherit',
                  transition: 'border-color 0.2s',
                }}
                autoFocus
              />
              <div className="flex gap-2 mt-2">
                <Button variant="primary" size="sm" loading={saving} onClick={handleSaveEdit}>Save</Button>
                <Button variant="ghost" size="sm" onClick={() => { setEditMode(false); setEditContent(localPost.content); }}>Cancel</Button>
              </div>
            </div>
          ) : (
            <p style={{ color: '#F5F0EF', fontSize: '0.875rem', lineHeight: '1.65', whiteSpace: 'pre-line' }}>
              {localPost.content}
            </p>
          )}
        </div>

        {/* Engagement bar */}
        <div
          className="flex items-center justify-between pt-3 mt-3"
          style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}
        >
          <div className="flex items-center gap-0.5">
            {/* Like */}
            <button
              type="button"
              onClick={handleLike}
              className="flex items-center gap-1.5 text-sm transition-all cursor-pointer rounded-md px-2 py-1 hover:bg-white/5"
              style={{
                color:      localPost.liked_by_me ? '#C41E33' : 'rgba(245,240,239,0.38)',
                fontWeight: localPost.liked_by_me ? 600 : 400,
                filter:     localPost.liked_by_me ? 'drop-shadow(0 0 6px rgba(196,30,51,0.5))' : 'none',
              }}
            >
              <ThumbsUp
                size={15}
                style={{
                  fill:   localPost.liked_by_me ? '#C41E33' : 'none',
                  stroke: localPost.liked_by_me ? '#C41E33' : 'currentColor',
                }}
              />
              <span>{localPost.like_count || 0}</span>
            </button>

            {/* Comment */}
            <button
              type="button"
              onClick={handleToggleComments}
              className="flex items-center gap-1.5 text-sm transition-colors rounded-md px-2 py-1 hover:bg-white/5"
              style={{ color: commentsOpen ? 'rgba(245,240,239,0.7)' : 'rgba(245,240,239,0.38)' }}
            >
              <MessageSquare size={15} />
              <span>{localPost.comment_count || 0}</span>
            </button>
          </div>

          {/* Share */}
          <button
            type="button"
            onClick={handleShare}
            className="flex items-center gap-1.5 text-sm transition-colors rounded-md px-2 py-1 hover:bg-white/5"
            style={{ color: 'rgba(245,240,239,0.38)' }}
          >
            <Share2 size={14} />
          </button>
        </div>

        {/* Comment thread */}
        {commentsOpen && (
          <CommentThread
            postId={localPost.id}
            comments={localPost.comments || []}
            onCommentAdded={handleCommentAdded}
            onCommentDeleted={handleCommentDeleted}
          />
        )}
      </div>
    </>
  );
}
