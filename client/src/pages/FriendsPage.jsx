import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Clock, UserPlus, RefreshCw } from 'lucide-react';
import { getFriends, getInbox, getSuggestions } from '../api/friends';
import useToastStore from '../store/toastStore';
import Tabs from '../components/ui/Tabs';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import EmptyState from '../components/ui/EmptyState';
import Skeleton from '../components/ui/Skeleton';
import FriendCard from '../components/friends/FriendCard';
import RequestCard from '../components/friends/RequestCard';
import SuggestionCard from '../components/friends/SuggestionCard';

/* ── Loading skeleton ── */
function FriendListSkeleton() {
  return (
    <div className="grid sm:grid-cols-2 gap-3">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="p-3 bg-[#F7F7F7] border border-[#E0E0E0] rounded-lg">
          <div className="flex items-center gap-3">
            <Skeleton className="w-10 h-10 rounded-full shrink-0" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-3.5 w-32" />
              <Skeleton className="h-3 w-20" />
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
        <div key={i} className="flex items-center gap-3 p-3 bg-[#F7F7F7] border border-[#E0E0E0] rounded-lg">
          <Skeleton className="w-10 h-10 rounded-full shrink-0" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-3.5 w-28" />
            <Skeleton className="h-3 w-16" />
          </div>
          <div className="flex gap-2 ml-auto">
            <Skeleton className="h-7 w-16 rounded-none" />
            <Skeleton className="h-7 w-16 rounded-none" />
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
        <div key={i} className="bg-[#F7F7F7] border border-[#E0E0E0] rounded-lg p-4 flex flex-col items-center">
          <Skeleton className="w-16 h-16 rounded-full" />
          <Skeleton className="h-3.5 w-24 mt-3" />
          <Skeleton className="h-3 w-16 mt-1.5" />
          <Skeleton className="h-8 w-full mt-3 rounded-none" />
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
        className="w-full mb-4 border border-[#E0E0E0] bg-white rounded-md px-3 py-2 text-sm placeholder:text-[#888888] focus:outline-none focus:border-black focus:ring-1 focus:ring-black transition-colors"
      />

      {friends.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No friends yet"
          description="Add some friends to get started."
          action={
            <Button variant="primary" onClick={() => navigate('/friends/suggest')}>
              Find People
            </Button>
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
      <p className="text-xs font-semibold uppercase tracking-widest text-[#888888] mb-3">
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
        <p className="text-xs font-semibold uppercase tracking-widest text-[#888888]">
          People you may know
        </p>
        <Button
          variant="ghost"
          size="sm"
          onClick={onRefresh}
          loading={refreshing}
          className="flex items-center gap-1"
        >
          <RefreshCw size={14} />
          Refresh
        </Button>
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

  // Load all data on mount
  useEffect(() => {
    loadFriends();
    loadRequests();
    loadSuggestions(false);
  }, []);

  const handleTabChange = (key) => {
    if (key === 'friends') navigate('/friends');
    else if (key === 'requests') navigate('/friends/requests');
    else if (key === 'suggestions') navigate('/friends/suggest');
  };

  /* ── friend handlers ── */
  const handleUnfriend = (friendId) => {
    setFriends((prev) => prev.filter((f) => f.id !== friendId));
  };

  const handleAcceptRequest = (requestId) => {
    setRequests((prev) => prev.filter((r) => r.id !== requestId));
    loadFriends(); // refresh friend count
  };

  const handleDeclineRequest = (requestId) => {
    setRequests((prev) => prev.filter((r) => r.id !== requestId));
  };

  const handleSendFromSuggestions = (userId) => {
    // keep the card in place but SuggestionCard internally shows "Sent" state
  };

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
    <div className="max-w-[720px] mx-auto pt-6">
      {/* Heading */}
      <div className="flex items-center gap-2 mb-6">
        <h1 className="text-2xl font-bold text-[#0A0A0A]">Friends</h1>
        <Badge variant="default">{friends.length}</Badge>
      </div>

      {/* Tabs */}
      <div className="mb-6">
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
  );
}
