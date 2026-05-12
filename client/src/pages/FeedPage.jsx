import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users } from 'lucide-react';
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

  const sentinelRef = useRef(null);
  /* guard: prevent concurrent fetches */
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

  useEffect(() => {
    loadFeed();
  }, [loadFeed]);

  /* ── load more (infinite scroll) ── */
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
        if (entry.isIntersecting && hasMore && !loadingMore && !loading) {
          loadMore();
        }
      },
      { threshold: 0.1 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore, loadingMore, loading, loadMore]);

  /* ── post handlers ── */
  const handleNewPost = (newPost) => {
    setPosts((prev) => [newPost, ...prev]);
  };

  const handleDeletePost = (id) => {
    setPosts((prev) => prev.filter((p) => p.id !== id));
  };

  const handleUpdatePost = (updated) => {
    setPosts((prev) =>
      prev.map((p) => (p.id === updated.id ? { ...p, ...updated } : p))
    );
  };

  return (
    <div className="max-w-[640px] mx-auto pt-6 pb-24">
      {/* Compose */}
      <ComposeBox onPost={handleNewPost} />

      {/* Initial loading skeleton */}
      {loading && <FeedSkeleton />}

      {/* Feed */}
      {!loading && (
        <>
          {posts.length === 0 ? (
            <EmptyState
              icon={Users}
              title="Your feed is empty"
              description="Add some friends to see their posts here."
              action={
                <Button
                  variant="secondary"
                  onClick={() => navigate('/friends/suggest')}
                >
                  Find Friends
                </Button>
              }
            />
          ) : (
            posts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                onDelete={handleDeletePost}
                onUpdate={handleUpdatePost}
              />
            ))
          )}

          {/* Loading more skeleton */}
          {loadingMore && <FeedSkeleton />}

          {/* End of feed message */}
          {!hasMore && posts.length > 0 && !loadingMore && (
            <p className="text-center text-sm text-[#888888] py-8">
              You're all caught up ✓
            </p>
          )}
        </>
      )}

      {/* Sentinel for infinite scroll */}
      <div ref={sentinelRef} className="h-2" />
    </div>
  );
}
