import { useState, useEffect, useRef, useCallback } from 'react';
import { getFeed } from '../api/feed';
import { createPost } from '../api/posts';
import { searchUsers } from '../api/users';
import PostCard from '../components/PostCard';
import useAuthStore from '../store/authStore';

export default function FeedPage() {
  const me = useAuthStore((s) => s.user);
  const [posts, setPosts]         = useState([]);
  const [cursor, setCursor]       = useState(null);
  const [hasMore, setHasMore]     = useState(true);
  const [loading, setLoading]     = useState(false);
  const [content, setContent]     = useState('');
  const [visibility, setVisibility] = useState('FRIENDS');
  const [tagQuery, setTagQuery]   = useState('');
  const [tagResults, setTagResults] = useState([]);
  const [tagged, setTagged]       = useState([]);
  const [posting, setPosting]     = useState(false);
  const bottomRef = useRef(null);

  const loadMore = useCallback(async () => {
    if (loading || !hasMore) return;
    setLoading(true);
    try {
      const res = await getFeed(cursor);
      const { items, nextCursor } = res.data;
      setPosts((p) => [...p, ...items]);
      setCursor(nextCursor);
      setHasMore(!!nextCursor);
    } catch {}
    setLoading(false);
  }, [cursor, hasMore, loading]);

  useEffect(() => { loadMore(); }, []); // eslint-disable-line

  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) loadMore(); }, { threshold: 0.1 });
    if (bottomRef.current) obs.observe(bottomRef.current);
    return () => obs.disconnect();
  }, [loadMore]);

  useEffect(() => {
    if (!tagQuery.trim()) { setTagResults([]); return; }
    const t = setTimeout(async () => {
      try { const res = await searchUsers(tagQuery); setTagResults(res.data); } catch {}
    }, 300);
    return () => clearTimeout(t);
  }, [tagQuery]);

  const handlePost = async (e) => {
    e.preventDefault();
    if (!content.trim()) return;
    setPosting(true);
    try {
      const res = await createPost({
        content: content.trim(),
        visibility,
        tagged_user_ids: tagged.map((u) => u.id),
      });
      const newPost = {
        ...res.data,
        first_name: me.first_name, last_name: me.last_name,
        like_count: 0, comment_count: 0, liked_by_me: false, comments: [],
      };
      setPosts((p) => [newPost, ...p]);
      setContent(''); setTagged([]); setTagQuery('');
    } catch {}
    setPosting(false);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      {/* Compose box */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <form onSubmit={handlePost} className="space-y-3">
          <textarea
            value={content} onChange={(e) => setContent(e.target.value)}
            placeholder="What's on your mind?"
            rows={3}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <div className="flex items-center gap-3 flex-wrap">
            <select
              value={visibility} onChange={(e) => setVisibility(e.target.value)}
              className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="FRIENDS">Friends only</option>
              <option value="FRIENDS_OF_FRIENDS">Friends of friends</option>
              <option value="PUBLIC">Public</option>
            </select>
            <div className="relative flex-1">
              <input
                value={tagQuery} onChange={(e) => setTagQuery(e.target.value)}
                placeholder="Tag people…"
                className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {tagResults.length > 0 && (
                <div className="absolute top-full left-0 right-0 z-10 bg-white border border-gray-200 rounded-lg shadow-lg mt-1 max-h-32 overflow-y-auto">
                  {tagResults.map((u) => (
                    <button key={u.id} type="button"
                      onClick={() => { setTagged((t) => [...t, u]); setTagQuery(''); setTagResults([]); }}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50">
                      {u.first_name} {u.last_name} @{u.username}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button type="submit" disabled={posting || !content.trim()}
              className="px-4 py-1.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
              Post
            </button>
          </div>
          {tagged.length > 0 && (
            <div className="flex gap-1 flex-wrap">
              {tagged.map((u) => (
                <span key={u.id} className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 text-xs px-2 py-1 rounded-full">
                  @{u.username}
                  <button type="button" onClick={() => setTagged((t) => t.filter((x) => x.id !== u.id))} className="hover:text-blue-900">×</button>
                </span>
              ))}
            </div>
          )}
        </form>
      </div>

      {/* Feed */}
      {posts.map((p) => (
        <PostCard key={p.id} post={p} onDelete={(id) => setPosts((ps) => ps.filter((x) => x.id !== id))} />
      ))}

      {loading && <p className="text-center text-gray-400 text-sm py-4">Loading…</p>}
      {!hasMore && posts.length > 0 && <p className="text-center text-gray-400 text-sm py-4">You're all caught up!</p>}
      {!loading && posts.length === 0 && (
        <div className="text-center py-12 text-gray-400">
          <p className="text-4xl mb-2">📭</p>
          <p>Your feed is empty. Add friends to see their posts!</p>
        </div>
      )}
      <div ref={bottomRef} className="h-2" />
    </div>
  );
}
