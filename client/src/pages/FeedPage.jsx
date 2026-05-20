import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, CheckCircle } from 'lucide-react';
import ComposeBox from '../components/feed/ComposeBox';
import PostCard from '../components/feed/PostCard';
import FeedSkeleton from '../components/feed/FeedSkeleton';
import EmptyState from '../components/ui/EmptyState';
import Button from '../components/ui/Button';
import { getFeed } from '../api/feed';

export default function FeedPage() {
  const navigate = useNavigate();

  const [posts,       setPosts]       = useState([]);
  const [cursor,      setCursor]      = useState(null);
  const [hasMore,     setHasMore]     = useState(true);
  const [loading,     setLoading]     = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [newPostIds,  setNewPostIds]  = useState(new Set());

  const sentinelRef = useRef(null);
  const fetchingRef = useRef(false);

  /* ── initial load ── */
  const loadFeed = useCallback(async () => {
    if (fetchingRef.current) return;
    fetchingRef.current = true;
    setLoading(true);
    try {
      const res = await getFeed(null, 20);
      const { items, nextCursor } = res.data;
      setPosts(items || []);
      setCursor(nextCursor || null);
      setHasMore(!!nextCursor);
    } catch {}
    setLoading(false);
    fetchingRef.current = false;
  }, []);

  useEffect(() => { loadFeed(); }, [loadFeed]);

  /* ── load more ── */
  const loadMore = useCallback(async () => {
    if (fetchingRef.current || loadingMore || !hasMore) return;
    fetchingRef.current = true;
    setLoadingMore(true);
    try {
      const res = await getFeed(cursor, 20);
      const { items, nextCursor } = res.data;
      setPosts((prev) => [...prev, ...(items || [])]);
      setCursor(nextCursor || null);
      setHasMore(!!nextCursor);
    } catch {}
    setLoadingMore(false);
    fetchingRef.current = false;
  }, [cursor, hasMore, loadingMore]);

  /* ── IntersectionObserver sentinel ── */
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && hasMore && !loadingMore && !loading) loadMore();
      },
      { threshold: 0.1 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore, loadingMore, loading, loadMore]);

  /* ── post handlers ── */
  const handleNewPost = (newPost) => {
    const id = newPost.id;
    setPosts((prev) => [newPost, ...prev]);
    setNewPostIds((s) => new Set([...s, id]));
    setTimeout(() => setNewPostIds((s) => { const n = new Set(s); n.delete(id); return n; }), 400);
  };

  const handleDeletePost  = (id)      => setPosts((prev) => prev.filter((p) => p.id !== id));
  const handleUpdatePost  = (updated) => setPosts((prev) => prev.map((p) => (p.id === updated.id ? { ...p, ...updated } : p)));

  return (
    <div className="max-w-[640px] mx-auto pb-8">
      <ComposeBox onPost={handleNewPost} />

      {loading && <FeedSkeleton />}

      {!loading && (
        <>
          {posts.length === 0 ? (
            <EmptyState
              icon={Users}
              title="Your feed is empty"
              description="Add some friends to see their posts here."
              action={
                <Button variant="secondary" onClick={() => navigate('/friends/suggest')}>
                  Find Friends
                </Button>
              }
            />
          ) : (
            posts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                isNew={newPostIds.has(post.id)}
                onDelete={handleDeletePost}
                onUpdate={handleUpdatePost}
              />
            ))
          )}

          {loadingMore && <FeedSkeleton />}

          {!hasMore && posts.length > 0 && !loadingMore && (
            <div
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                gap: '8px', padding: '8px 20px', margin: '20px auto',
                borderRadius: '20px', width: 'fit-content',
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.07)',
              }}
            >
              <CheckCircle size={14} style={{ color: '#1A7A4A' }} />
              <span style={{ color: 'rgba(245,240,239,0.35)', fontSize: '0.8rem' }}>
                You're all caught up
              </span>
            </div>
          )}
        </>
      )}

      <div ref={sentinelRef} className="h-2" />
    </div>
  );
}
