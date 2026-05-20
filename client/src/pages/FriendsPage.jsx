import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Clock, UserPlus, RefreshCw, Loader2 } from 'lucide-react';
import { getFriends, getInbox, getSuggestions } from '../api/friends';
import useToastStore from '../store/toastStore';
import Tabs from '../components/ui/Tabs';
import EmptyState from '../components/ui/EmptyState';
import FriendCard from '../components/friends/FriendCard';
import RequestCard from '../components/friends/RequestCard';
import SuggestionCard from '../components/friends/SuggestionCard';

const FRIENDS_CSS = `
  @keyframes skeletonShimmer { 0% { background-position: -400px 0 } 100% { background-position: 400px 0 } }
  .skeleton-pulse {
    background: linear-gradient(90deg, rgba(255,255,255,0.06) 25%, rgba(255,255,255,0.10) 50%, rgba(255,255,255,0.06) 75%);
    background-size: 400px 100%;
    animation: skeletonShimmer 1.6s ease-in-out infinite;
  }
  .friends-tabs-wrap > div { border-bottom-color: rgba(255,255,255,0.08) !important; }
  .friends-tabs-wrap .text-\\[#0A0A0A\\] { color: #F5F0EF !important; }
  .friends-tabs-wrap .text-\\[#888888\\] { color: rgba(245,240,239,0.45) !important; }
  .friends-tabs-wrap .hover\\:text-\\[#0A0A0A\\]:hover { color: rgba(245,240,239,0.75) !important; }
  .friends-tabs-wrap button::after { background-color: #8B1520 !important; }
  .friends-input::placeholder { color: rgba(245,240,239,0.35); }
  .friends-input:focus { border-color: rgba(139,21,32,0.5) !important; outline: none; box-shadow: none; }
  @media (prefers-reduced-motion: reduce) { .skeleton-pulse { animation: none; } }
`;

const skeletonCardStyle = {
  background: 'rgba(23,18,20,0.65)',
  backdropFilter: 'blur(12px)',
  WebkitBackdropFilter: 'blur(12px)',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: 8,
};

/* ── Loading skeletons ── */
function FriendListSkeleton() {
  return (
    <div className="grid sm:grid-cols-2 gap-3">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="p-3" style={skeletonCardStyle}>
          <div className="flex items-center gap-3">
            <div className="skeleton-pulse w-10 h-10 rounded-full shrink-0" />
            <div className="flex-1 space-y-1.5">
              <div className="skeleton-pulse h-3.5 w-32 rounded" />
              <div className="skeleton-pulse h-3 w-20 rounded" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function RequestListSkeleton() {
  return (
    <div className="space-y-2">
      {[0, 1, 2].map((i) => (
        <div key={i} className="flex items-center gap-3 p-3" style={skeletonCardStyle}>
          <div className="skeleton-pulse w-10 h-10 rounded-full shrink-0" />
          <div className="flex-1 space-y-1.5">
            <div className="skeleton-pulse h-3.5 w-28 rounded" />
            <div className="skeleton-pulse h-3 w-16 rounded" />
          </div>
          <div className="flex gap-2 ml-auto">
            <div className="skeleton-pulse h-7 w-16 rounded" />
            <div className="skeleton-pulse h-7 w-16 rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}

function SuggestionListSkeleton() {
  return (
    <div className="grid lg:grid-cols-3 sm:grid-cols-2 gap-4">
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="p-4 flex flex-col items-center" style={skeletonCardStyle}>
          <div className="skeleton-pulse w-16 h-16 rounded-full" />
          <div className="skeleton-pulse h-3.5 w-24 mt-3 rounded" />
          <div className="skeleton-pulse h-3 w-16 mt-1.5 rounded" />
          <div className="skeleton-pulse h-8 w-full mt-3 rounded" />
        </div>
      ))}
    </div>
  );
}

/* ── Tab: Friends ── */
function FriendsTab({ friends, loading, onUnfriend }) {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');

  const filtered = friends.filter((f) => {
    const q = searchQuery.toLowerCase();
    return (
      !q ||
      f.first_name?.toLowerCase().includes(q) ||
      f.last_name?.toLowerCase().includes(q) ||
      f.username?.toLowerCase().includes(q)
    );
  });

  if (loading) return <FriendListSkeleton />;

  return (
    <div>
      <input
        type="text"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        placeholder="Search your friends…"
        className="friends-input w-full mb-4 rounded-md px-3 py-2 text-sm transition-colors"
        style={{
          background: 'rgba(255,255,255,0.05)',
          border: '1px solid rgba(255,255,255,0.1)',
          color: '#F5F0EF',
        }}
      />

      {friends.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No friends yet"
          description="Add some friends to get started."
          action={
            <button
              type="button"
              onClick={() => navigate('/friends/suggest')}
              style={{
                background: 'linear-gradient(135deg, #A8192B 0%, #8B1520 100%)',
                border: '1px solid rgba(196,30,51,0.4)', color: '#F5F0EF',
                borderRadius: 8, padding: '6px 18px', fontSize: '0.875rem',
                fontWeight: 600, cursor: 'pointer',
                boxShadow: '0 2px 12px rgba(139,21,32,0.3)',
              }}
            >
              Find People
            </button>
          }
        />
      ) : filtered.length === 0 ? (
        <EmptyState icon={Users} title="No results found" />
      ) : (
        <div className="grid sm:grid-cols-2 gap-3">
          {filtered.map((f) => (
            <FriendCard key={f.id} friend={f} onUnfriend={onUnfriend} />
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Tab: Requests ── */
function RequestsTab({ requests, loading, onAccept, onDecline }) {
  if (loading) return <RequestListSkeleton />;

  return (
    <div>
      <p
        className="text-xs font-semibold uppercase tracking-widest mb-3"
        style={{ color: 'rgba(245,240,239,0.45)' }}
      >
        Received Requests
      </p>

      {requests.length === 0 ? (
        <EmptyState icon={Clock} title="No pending requests" />
      ) : (
        <div>
          {requests.map((r) => (
            <RequestCard
              key={r.id}
              request={r}
              onAccept={onAccept}
              onDecline={onDecline}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Tab: Suggestions ── */
function SuggestionsTab({ suggestions, loading, onSend, onRefresh, refreshing }) {
  if (loading) return <SuggestionListSkeleton />;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p
          className="text-xs font-semibold uppercase tracking-widest"
          style={{ color: 'rgba(245,240,239,0.45)' }}
        >
          People you may know
        </p>
        <button
          type="button"
          onClick={onRefresh}
          disabled={refreshing}
          className="inline-flex items-center gap-1"
          style={{
            background: 'none',
            border: '1px solid rgba(255,255,255,0.12)',
            color: 'rgba(245,240,239,0.6)',
            borderRadius: 8,
            padding: '4px 10px',
            fontSize: '0.75rem',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          <RefreshCw size={13} className={refreshing ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {suggestions.length === 0 ? (
        <EmptyState
          icon={UserPlus}
          title="No suggestions"
          description="Add more friends to discover new people."
        />
      ) : (
        <div className="grid lg:grid-cols-3 sm:grid-cols-2 gap-4">
          {suggestions.map((s) => (
            <SuggestionCard key={s.id} user={s} onSend={onSend} />
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Main FriendsPage ── */
export default function FriendsPage({ tab: tabProp = 'friends' }) {
  const navigate = useNavigate();
  const addToast = useToastStore((s) => s.addToast);

  const [friends, setFriends] = useState([]);
  const [requests, setRequests] = useState([]);
  const [suggestions, setSuggestions] = useState([]);

  const [loadingFriends, setLoadingFriends] = useState(false);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [refreshingSuggestions, setRefreshingSuggestions] = useState(false);

  const loadFriends = async () => {
    setLoadingFriends(true);
    try {
      const res = await getFriends();
      setFriends(res.data);
    } catch (err) {
      addToast({ message: err.response?.data?.error || 'Failed to load friends', type: 'error' });
    } finally {
      setLoadingFriends(false);
    }
  };

  const loadRequests = async () => {
    setLoadingRequests(true);
    try {
      const res = await getInbox();
      setRequests(res.data);
    } catch (err) {
      addToast({ message: err.response?.data?.error || 'Failed to load requests', type: 'error' });
    } finally {
      setLoadingRequests(false);
    }
  };

  const loadSuggestions = async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshingSuggestions(true);
    } else {
      setLoadingSuggestions(true);
    }
    try {
      const res = await getSuggestions();
      setSuggestions(res.data);
    } catch (err) {
      addToast({ message: err.response?.data?.error || 'Failed to load suggestions', type: 'error' });
    } finally {
      setLoadingSuggestions(false);
      setRefreshingSuggestions(false);
    }
  };

  useEffect(() => {
    loadFriends();
    loadRequests();
    loadSuggestions(false);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleTabChange = (key) => {
    if (key === 'friends') navigate('/friends');
    else if (key === 'requests') navigate('/friends/requests');
    else if (key === 'suggestions') navigate('/friends/suggest');
  };

  const handleUnfriend = (friendId) => {
    setFriends((prev) => prev.filter((f) => f.id !== friendId));
  };

  const handleAcceptRequest = (requestId) => {
    setRequests((prev) => prev.filter((r) => r.id !== requestId));
    loadFriends();
  };

  const handleDeclineRequest = (requestId) => {
    setRequests((prev) => prev.filter((r) => r.id !== requestId));
  };

  const handleSendFromSuggestions = () => {};

  const tabs = [
    { key: 'friends', label: 'Friends' },
    {
      key: 'requests',
      label: 'Requests',
      badge: requests.length > 0 ? requests.length : undefined,
    },
    { key: 'suggestions', label: 'Suggestions' },
  ];

  return (
    <>
      <style>{FRIENDS_CSS}</style>
      <div className="max-w-[720px] mx-auto pt-6">
        {/* Heading */}
        <div className="flex items-center gap-2 mb-6">
          <h1
            style={{
              fontFamily: "'Cormorant Garamond', serif",
              fontWeight: 700,
              fontSize: '1.65rem',
              color: '#F5F0EF',
            }}
          >
            Friends
          </h1>
          <span
            style={{
              background: 'rgba(255,255,255,0.07)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 20,
              padding: '1px 8px',
              fontSize: '0.75rem',
              fontWeight: 600,
              color: 'rgba(245,240,239,0.55)',
            }}
          >
            {friends.length}
          </span>
        </div>

        {/* Tabs */}
        <div className="friends-tabs-wrap mb-6">
          <Tabs tabs={tabs} activeTab={tabProp} onChange={handleTabChange} />
        </div>

        {/* Tab content */}
        {tabProp === 'friends' && (
          <FriendsTab
            friends={friends}
            loading={loadingFriends}
            onUnfriend={handleUnfriend}
          />
        )}

        {tabProp === 'requests' && (
          <RequestsTab
            requests={requests}
            loading={loadingRequests}
            onAccept={handleAcceptRequest}
            onDecline={handleDeclineRequest}
          />
        )}

        {tabProp === 'suggestions' && (
          <SuggestionsTab
            suggestions={suggestions}
            loading={loadingSuggestions}
            onSend={handleSendFromSuggestions}
            onRefresh={() => loadSuggestions(true)}
            refreshing={refreshingSuggestions}
          />
        )}
      </div>
    </>
  );
}
