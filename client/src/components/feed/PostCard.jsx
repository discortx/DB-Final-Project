import { useState } from 'react';
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

/* ── helpers ────────────────────────────────────────── */
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
      <span className="border border-[#E0E0E0] text-[#404040] text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1 shrink-0">
        <Users size={9} />
        Friends
      </span>
    );
  }
  if (visibility === 'FRIENDS_OF_FRIENDS') {
    return (
      <span className="border border-[#C0C0C0] text-[#0A0A0A] font-medium text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1 shrink-0">
        <Users size={9} />
        Friends of Friends
      </span>
    );
  }
  // PUBLIC
  return (
    <span className="bg-[#0A0A0A] text-white text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1 shrink-0">
      <Globe size={9} />
      Public
    </span>
  );
}

/* ── PostCard ───────────────────────────────────────── */
export default function PostCard({ post, onDelete, onUpdate }) {
  const currentUser = useAuthStore((s) => s.user);
  const addToast    = useToastStore((s) => s.addToast);

  /* local post state for optimistic updates */
  const [localPost,      setLocalPost]      = useState(post);
  const [commentsOpen,      setCommentsOpen]      = useState(false);
  const [commentsLoaded,    setCommentsLoaded]    = useState(false);
  const [editMode,       setEditMode]       = useState(false);
  const [editContent,    setEditContent]    = useState(post.content);
  const [saving,         setSaving]         = useState(false);
  const [deleting,       setDeleting]       = useState(false);
  const [liking,         setLiking]         = useState(false);

  /* Keep local post in sync if parent post prop changes (e.g. initial load) */
  // We intentionally manage local state; parent updates flow through onUpdate

  /* ── like / unlike ── */
  const handleLike = async () => {
    if (liking) return;
    setLiking(true);

    const wasLiked = localPost.liked_by_me;
    // Optimistic update
    setLocalPost((p) => ({
      ...p,
      liked_by_me: !wasLiked,
      like_count:  wasLiked ? p.like_count - 1 : p.like_count + 1,
    }));

    try {
      if (wasLiked) {
        await unlikePost(localPost.id);
      } else {
        await likePost(localPost.id);
      }
    } catch {
      // Revert on failure
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

  /* ── delete ── */
  const handleDelete = async () => {
    if (!window.confirm('Delete this post?')) return;
    setDeleting(true);
    try {
      await deletePost(localPost.id);
      onDelete?.(localPost.id);
    } catch {
      addToast({ message: 'Could not delete post.', type: 'error' });
      setDeleting(false);
    }
  };

  /* ── comment handlers ── */
  const handleCommentAdded = (newComment) => {
    const updated = {
      ...localPost,
      comments:      [...(localPost.comments || []), newComment],
      comment_count: (localPost.comment_count || 0) + 1,
    };
    setLocalPost(updated);
    onUpdate?.(updated);
  };

  const handleCommentDeleted = (cid) => {
    const updated = {
      ...localPost,
      comments:      (localPost.comments || []).filter((c) => c.id !== cid),
      comment_count: Math.max(0, (localPost.comment_count || 0) - 1),
    };
    setLocalPost(updated);
    onUpdate?.(updated);
  };

  /* ── toggle comments with lazy fetch ── */
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

  /* ── share ── */
  const handleShare = () => {
    addToast({ message: 'Link copied!', type: 'success' });
  };

  const isOwn = localPost.author_id === currentUser?.id;

  return (
    <div className="bg-[#F7F7F7] border border-[#E0E0E0] rounded-lg p-4 hover:shadow-sm transition-shadow mb-4">
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
            size="md"
          />
          <div className="min-w-0">
            <p className="font-semibold text-sm text-[#0A0A0A] truncate group-hover:underline">
              {localPost.first_name} {localPost.last_name}
            </p>
            <p className="text-xs text-[#888888]">
              @{localPost.username} · {timeAgo(localPost.created_at)}
            </p>
          </div>
        </Link>

        {/* Right header section */}
        <div className="flex items-center gap-2 shrink-0">
          <VisibilityPill visibility={localPost.visibility} />

          {isOwn && (
            <Dropdown
              align="right"
              trigger={
                <button
                  type="button"
                  className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-[#EFEFEF] transition-colors text-[#888888]"
                  aria-label="Post options"
                >
                  <MoreHorizontal size={16} />
                </button>
              }
            >
              <DropdownItem onClick={() => { setEditMode(true); setEditContent(localPost.content); }}>
                Edit
              </DropdownItem>
              <DropdownDivider />
              <DropdownItem danger onClick={handleDelete}>
                {deleting ? 'Deleting…' : 'Delete'}
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
              className="w-full bg-white border border-[#E0E0E0] rounded-md p-3 text-sm resize-none
                         focus:outline-none focus:border-black focus:ring-1 focus:ring-black transition-colors"
              autoFocus
            />
            <div className="flex gap-2 mt-2">
              <Button variant="primary" size="sm" loading={saving} onClick={handleSaveEdit}>
                Save
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => { setEditMode(false); setEditContent(localPost.content); }}
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <p className="text-sm leading-relaxed text-[#0A0A0A] whitespace-pre-line">
            {localPost.content}
          </p>
        )}
      </div>

      {/* Engagement bar */}
      <div className="border-t border-[#E0E0E0] pt-3 mt-3 flex items-center justify-between">
        <div className="flex items-center gap-1">
          {/* Like */}
          <button
            type="button"
            onClick={handleLike}
            className={`flex items-center gap-1.5 text-sm transition-colors cursor-pointer rounded-md px-2 py-1 hover:bg-[#EFEFEF]
              ${localPost.liked_by_me ? 'text-[#0A0A0A] font-medium' : 'text-[#888888] hover:text-[#0A0A0A]'}`}
          >
            <ThumbsUp
              size={16}
              className={localPost.liked_by_me ? 'fill-[#0A0A0A]' : ''}
            />
            <span>{localPost.like_count || 0}</span>
          </button>

          {/* Comment */}
          <button
            type="button"
            onClick={handleToggleComments}
            className="flex items-center gap-1.5 text-sm text-[#888888] hover:text-[#0A0A0A] transition-colors rounded-md px-2 py-1 hover:bg-[#EFEFEF]"
          >
            <MessageSquare size={16} />
            <span>{localPost.comment_count || 0}</span>
          </button>
        </div>

        {/* Share */}
        <Button variant="ghost" size="sm" onClick={handleShare} className="text-[#888888]">
          <Share2 size={14} />
        </Button>
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
  );
}
