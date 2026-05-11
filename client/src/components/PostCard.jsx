import { useState } from 'react';
import { Link } from 'react-router-dom';
import { likePost, unlikePost, addComment, deletePost } from '../api/posts';
import Avatar from './Avatar';
import useAuthStore from '../store/authStore';

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr);
  const m = Math.floor(diff / 60000);
  if (m < 1)  return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function PostCard({ post: initialPost, onDelete }) {
  const me = useAuthStore((s) => s.user);
  const [post, setPost]         = useState(initialPost);
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText]   = useState('');
  const [submitting, setSubmitting]     = useState(false);

  const handleLike = async () => {
    const wasLiked = post.liked_by_me;
    setPost((p) => ({ ...p, liked_by_me: !wasLiked, like_count: p.like_count + (wasLiked ? -1 : 1) }));
    try {
      if (wasLiked) await unlikePost(post.id);
      else          await likePost(post.id);
    } catch {
      setPost((p) => ({ ...p, liked_by_me: wasLiked, like_count: p.like_count + (wasLiked ? 1 : -1) }));
    }
  };

  const handleComment = async (e) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    setSubmitting(true);
    try {
      const res = await addComment(post.id, commentText.trim());
      setPost((p) => ({
        ...p,
        comment_count: p.comment_count + 1,
        comments: [...(p.comments || []), res.data],
      }));
      setCommentText('');
    } catch {}
    setSubmitting(false);
  };

  const handleDelete = async () => {
    if (!confirm('Delete this post?')) return;
    try { await deletePost(post.id); onDelete?.(post.id); } catch {}
  };

  const visibilityLabel = { FRIENDS: '👥 Friends', FRIENDS_OF_FRIENDS: '🌐 FoF', PUBLIC: '🌍 Public' };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
      <div className="flex items-start gap-3">
        <Link to={`/profile/${post.author_id}`}>
          <Avatar firstName={post.first_name} lastName={post.last_name} />
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <div>
              <Link to={`/profile/${post.author_id}`} className="font-semibold text-gray-900 hover:underline">
                {post.first_name} {post.last_name}
              </Link>
              <span className="text-xs text-gray-400 ml-2">{timeAgo(post.created_at)}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400">{visibilityLabel[post.visibility]}</span>
              {me?.id === post.author_id && (
                <button onClick={handleDelete} className="text-xs text-red-400 hover:text-red-600">Delete</button>
              )}
            </div>
          </div>

          <p className="mt-2 text-gray-800 whitespace-pre-wrap">{post.content}</p>

          <div className="flex items-center gap-4 mt-3 pt-3 border-t border-gray-50">
            <button
              onClick={handleLike}
              className={`flex items-center gap-1 text-sm transition-colors ${
                post.liked_by_me ? 'text-blue-600 font-medium' : 'text-gray-500 hover:text-blue-600'
              }`}
            >
              <span>{post.liked_by_me ? '♥' : '♡'}</span>
              <span>{post.like_count}</span>
            </button>
            <button
              onClick={() => setShowComments((v) => !v)}
              className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
            >
              💬 {post.comment_count}
            </button>
          </div>

          {showComments && (
            <div className="mt-3 space-y-2">
              {(post.comments || []).map((c) => (
                <div key={c.id} className="text-sm bg-gray-50 rounded-lg px-3 py-2">
                  <span className="font-medium text-gray-700">User #{c.author_id}</span>
                  <span className="text-gray-600 ml-2">{c.content}</span>
                </div>
              ))}
              <form onSubmit={handleComment} className="flex gap-2 mt-2">
                <input
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder="Write a comment…"
                  className="flex-1 border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50"
                >
                  Post
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
