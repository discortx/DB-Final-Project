import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Cake, Venus, Mars } from 'lucide-react';
import { getMe, updateMe, getUserById, getUserPosts } from '../api/users';
import {
  getFriends,
  getInbox,
  sendRequest,
  cancelRequest,
  acceptRequest,
  rejectRequest,
  unfriend,
} from '../api/friends';
import { openDm } from '../api/chats';
import useAuthStore from '../store/authStore';
import useToastStore from '../store/toastStore';
import Avatar from '../components/ui/Avatar';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import Modal from '../components/ui/Modal';
import Input from '../components/ui/Input';
import Skeleton from '../components/ui/Skeleton';
import { SkeletonAvatar } from '../components/ui/Skeleton';
import PostCard from '../components/feed/PostCard';

function formatMemberDate(dateStr) {
  if (!dateStr) return '—';
  try {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

function formatDob(dateStr) {
  if (!dateStr) return null;
  try {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

/* ── Toggle Switch ── */
function Toggle({ value, onChange }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!value)}
      className={`relative w-9 h-5 rounded-full cursor-pointer transition-colors ${
        value ? 'bg-[#0A0A0A]' : 'bg-[#C0C0C0]'
      }`}
      aria-checked={value}
      role="switch"
    >
      <span
        className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
          value ? 'translate-x-4' : 'translate-x-0.5'
        }`}
      />
    </button>
  );
}

/* ── Edit Profile Modal ── */
function EditProfileModal({ open, onClose, profile, onSaved }) {
  const addToast = useToastStore((s) => s.addToast);
  const { updateUser } = useAuthStore();

  const [firstName, setFirstName] = useState(profile?.first_name || '');
  const [lastName, setLastName] = useState(profile?.last_name || '');
  const [bio, setBio] = useState(profile?.bio || '');
  const [dob, setDob] = useState(profile?.date_of_birth ? profile.date_of_birth.slice(0, 10) : '');
  const [gender, setGender] = useState(profile?.gender || null);
  const [saving, setSaving] = useState(false);

  // Sync when modal opens with fresh profile data
  useEffect(() => {
    if (open && profile) {
      setFirstName(profile.first_name || '');
      setLastName(profile.last_name || '');
      setBio(profile.bio || '');
      setDob(profile.date_of_birth ? profile.date_of_birth.slice(0, 10) : '');
      setGender(profile.gender || null);
    }
  }, [open, profile]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = { first_name: firstName, last_name: lastName, bio };
      if (dob) payload.date_of_birth = dob;
      if (gender) payload.gender = gender;
      else payload.gender = null;

      const res = await updateMe(payload);
      updateUser(res.data);
      addToast({ message: 'Profile updated', type: 'success' });
      if (onSaved) onSaved(res.data);
      onClose();
    } catch (err) {
      addToast({ message: err.response?.data?.error || 'Something went wrong', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Edit Profile"
      maxWidth="max-w-lg"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSave} loading={saving}>
            Save changes
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="First name"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            required
          />
          <Input
            label="Last name"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            required
          />
        </div>

        <div className="w-full">
          <label className="text-xs font-semibold text-[#404040] mb-1 block">Bio</label>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            rows={3}
            placeholder="Tell the world about yourself…"
            className="w-full border border-[#E0E0E0] bg-white rounded-md px-3 py-2 text-sm placeholder:text-[#888888] focus:outline-none focus:border-black focus:ring-1 focus:ring-black transition-colors resize-none"
          />
        </div>

        <Input
          label="Date of birth (optional)"
          type="date"
          value={dob}
          onChange={(e) => setDob(e.target.value)}
        />

        <div>
          <p className="text-xs font-semibold text-[#404040] mb-1">Gender (optional)</p>
          <div className="flex gap-2 flex-wrap">
            {[
              { label: 'Male', value: 'MALE' },
              { label: 'Female', value: 'FEMALE' },
              { label: 'Prefer not to say', value: null },
            ].map((opt) => (
              <button
                key={opt.label}
                type="button"
                onClick={() => setGender(opt.value)}
                className={`border text-sm px-3 py-1.5 rounded cursor-pointer transition-colors ${
                  gender === opt.value
                    ? 'bg-[#0A0A0A] text-white border-[#0A0A0A]'
                    : 'border-[#E0E0E0] text-[#404040] hover:bg-[#F7F7F7]'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </Modal>
  );
}

/* ── Profile Skeleton ── */
function ProfileSkeleton() {
  return (
    <div className="bg-[#F7F7F7] border border-[#E0E0E0] rounded-lg p-6 mb-6">
      <div className="flex items-start gap-4">
        <SkeletonAvatar size="lg" className="w-24 h-24" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-64 mt-2" />
        </div>
      </div>
      <div className="border-t border-[#E0E0E0] pt-4 mt-4 flex gap-8">
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex flex-col items-center gap-1">
            <Skeleton className="h-6 w-10" />
            <Skeleton className="h-3 w-16" />
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Main ProfilePage ── */
export default function ProfilePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user: me, updateUser } = useAuthStore();
  const addToast = useToastStore((s) => s.addToast);

  const isOwnProfile = String(id) === String(me?.id) || id === 'me';

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [friendStatus, setFriendStatus] = useState(null); // null | 'friends' | 'sent' | 'received'
  const [pendingRequestId, setPendingRequestId] = useState(null);
  const [friendCount, setFriendCount] = useState(0);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [privacyLoading, setPrivacyLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [messageLoading, setMessageLoading] = useState(false);

  const [posts, setPosts] = useState([]);
  const [postsLoading, setPostsLoading] = useState(true);

  // Use the actual numeric ID — never the string "me" — so the backend route gets a real user ID.
  const profileUserId = isOwnProfile ? me?.id : id;

  useEffect(() => {
    if (!profileUserId) return;
    setPostsLoading(true);
    getUserPosts(profileUserId)
      .then((r) => setPosts(r.data || []))
      .catch(() => setPosts([]))
      .finally(() => setPostsLoading(false));
  }, [profileUserId]);

  const loadProfile = useCallback(async () => {
    setLoading(true);
    try {
      const res = isOwnProfile
        ? await getMe()
        : await getUserById(id);
      setProfile(res.data);

      if (!isOwnProfile) {
        // Determine friend status
        const [friendsRes, inboxRes] = await Promise.all([
          getFriends(),
          getInbox(),
        ]);
        const isFriend = friendsRes.data.some((f) => String(f.id) === String(id));
        if (isFriend) {
          setFriendStatus('friends');
          setFriendCount(friendsRes.data.length);
        } else {
          const inboundReq = inboxRes.data.find(
            (r) => String(r.sender_id) === String(id)
          );
          if (inboundReq) {
            setFriendStatus('received');
            setPendingRequestId(inboundReq.id);
          } else {
            setFriendStatus(null);
          }
          setFriendCount(friendsRes.data.length);
        }
      } else {
        const friendsRes = await getFriends();
        setFriendCount(friendsRes.data.length);
      }
    } catch (err) {
      addToast({ message: err.response?.data?.error || 'Failed to load profile', type: 'error' });
    } finally {
      setLoading(false);
    }
  }, [id, isOwnProfile]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  /* ── Privacy toggle ── */
  const handlePrivacyToggle = async (newVal) => {
    setPrivacyLoading(true);
    try {
      const res = await updateMe({ privacy_enabled: newVal });
      setProfile(res.data);
      updateUser(res.data);
    } catch (err) {
      addToast({ message: err.response?.data?.error || 'Something went wrong', type: 'error' });
    } finally {
      setPrivacyLoading(false);
    }
  };

  /* ── Friend actions ── */
  const handleAddFriend = async () => {
    setActionLoading(true);
    try {
      await sendRequest(parseInt(id));
      setFriendStatus('sent');
      addToast({ message: 'Friend request sent!', type: 'success' });
    } catch (err) {
      addToast({ message: err.response?.data?.error || 'Something went wrong', type: 'error' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancelRequest = async () => {
    if (!pendingRequestId) return;
    setActionLoading(true);
    try {
      await cancelRequest(pendingRequestId);
      setFriendStatus(null);
      setPendingRequestId(null);
    } catch (err) {
      addToast({ message: err.response?.data?.error || 'Something went wrong', type: 'error' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleAcceptRequest = async () => {
    if (!pendingRequestId) return;
    setActionLoading(true);
    try {
      await acceptRequest(pendingRequestId);
      setFriendStatus('friends');
      setFriendCount((c) => c + 1);
      addToast({ message: `You and ${profile.first_name} are now friends!`, type: 'success' });
    } catch (err) {
      addToast({ message: err.response?.data?.error || 'Something went wrong', type: 'error' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeclineRequest = async () => {
    if (!pendingRequestId) return;
    setActionLoading(true);
    try {
      await rejectRequest(pendingRequestId);
      setFriendStatus(null);
      setPendingRequestId(null);
    } catch (err) {
      addToast({ message: err.response?.data?.error || 'Something went wrong', type: 'error' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleUnfriend = async () => {
    setActionLoading(true);
    try {
      await unfriend(parseInt(id));
      setFriendStatus(null);
      setFriendCount((c) => Math.max(0, c - 1));
      addToast({ message: `Removed ${profile.first_name} from friends.`, type: 'success' });
    } catch (err) {
      addToast({ message: err.response?.data?.error || 'Something went wrong', type: 'error' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleMessage = async () => {
    setMessageLoading(true);
    try {
      const res = await openDm(parseInt(id));
      navigate(`/chats/${res.data.id}`);
    } catch (err) {
      addToast({ message: err.response?.data?.error || 'Something went wrong', type: 'error' });
      setMessageLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-[720px] mx-auto pt-6">
        <ProfileSkeleton />
      </div>
    );
  }

  if (!profile) return null;

  return (
    <div className="max-w-[720px] mx-auto pt-6">
      {/* Profile Header Card */}
      <div className="bg-[#F7F7F7] border border-[#E0E0E0] rounded-lg p-6 mb-6">
        {/* Top row */}
        <div className="flex items-start gap-4">
          <Avatar
            firstName={profile.first_name}
            lastName={profile.last_name}
            size="xl"
          />

          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-baseline gap-2">
              <h1 className="text-3xl font-bold tracking-tight text-[#0A0A0A]">
                {profile.first_name} {profile.last_name}
              </h1>
              <span className="text-sm text-[#888888]">@{profile.username}</span>
            </div>
            <p className={`text-sm mt-1 ${profile.bio ? 'text-[#404040]' : 'text-[#888888] italic'}`}>
              {profile.bio || 'No bio yet'}
            </p>
          </div>

          {/* Action area */}
          <div className="flex flex-col gap-2 items-end shrink-0">
            {isOwnProfile ? (
              <>
                <Button variant="secondary" onClick={() => setEditModalOpen(true)}>
                  Edit Profile
                </Button>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-[#888888]">Private profile</span>
                  <Toggle
                    value={!!profile.privacy_enabled}
                    onChange={handlePrivacyToggle}
                    disabled={privacyLoading}
                  />
                </div>
              </>
            ) : (
              <>
                {/* Friend action buttons */}
                {friendStatus === null && (
                  <Button
                    variant="primary"
                    onClick={handleAddFriend}
                    loading={actionLoading}
                  >
                    Add Friend
                  </Button>
                )}

                {friendStatus === 'sent' && (
                  <div className="flex gap-2">
                    <Button variant="secondary" disabled>
                      Request Sent ✓
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleCancelRequest}
                      loading={actionLoading}
                      className="text-[#CC0000] hover:text-[#CC0000] hover:bg-[#FFF0F0]"
                    >
                      Cancel
                    </Button>
                  </div>
                )}

                {friendStatus === 'received' && (
                  <div className="flex gap-2">
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={handleAcceptRequest}
                      loading={actionLoading}
                    >
                      Accept
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleDeclineRequest}
                      loading={actionLoading}
                      className="text-[#CC0000] hover:text-[#CC0000] hover:bg-[#FFF0F0]"
                    >
                      Decline
                    </Button>
                  </div>
                )}

                {friendStatus === 'friends' && (
                  <div className="flex gap-2">
                    <Button variant="secondary" disabled>
                      Friends ✓
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleUnfriend}
                      loading={actionLoading}
                      className="text-[#CC0000] hover:text-[#CC0000] hover:bg-[#FFF0F0]"
                    >
                      Unfriend
                    </Button>
                  </div>
                )}

                {/* Message button always visible */}
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleMessage}
                  loading={messageLoading}
                >
                  Message
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Stats row */}
        <div className="border-t border-[#E0E0E0] pt-4 mt-4 flex gap-8">
          <div className="flex flex-col items-center">
            <span className="font-bold text-lg text-[#0A0A0A]">{postsLoading ? '—' : posts.length}</span>
            <span className="text-xs text-[#888888]">Posts</span>
          </div>
          <div className="flex flex-col items-center">
            <span className="font-bold text-lg text-[#0A0A0A]">{friendCount}</span>
            <span className="text-xs text-[#888888]">Friends</span>
          </div>
          <div className="flex flex-col items-center">
            <span className="font-bold text-lg text-[#0A0A0A]">
              {profile.created_at ? formatMemberDate(profile.created_at) : '—'}
            </span>
            <span className="text-xs text-[#888888]">Member since</span>
          </div>
        </div>

        {/* Info pills */}
        {(profile.gender || profile.date_of_birth) && (
          <div className="mt-3 flex flex-wrap gap-2">
            {profile.gender === 'MALE' && (
              <Badge variant="muted" className="flex items-center gap-1">
                <Mars size={12} />
                MALE
              </Badge>
            )}
            {profile.gender === 'FEMALE' && (
              <Badge variant="muted" className="flex items-center gap-1">
                <Venus size={12} />
                FEMALE
              </Badge>
            )}
            {profile.date_of_birth && (
              <Badge variant="muted" className="flex items-center gap-1">
                <Cake size={12} />
                {formatDob(profile.date_of_birth)}
              </Badge>
            )}
          </div>
        )}
      </div>

      {/* Posts */}
      {postsLoading ? (
        <div className="bg-[#F7F7F7] border border-[#E0E0E0] rounded-lg p-6 text-center">
          <p className="text-sm text-[#888888]">Loading posts…</p>
        </div>
      ) : posts.length === 0 ? (
        <div className="bg-[#F7F7F7] border border-[#E0E0E0] rounded-lg p-6 text-center">
          <p className="text-sm text-[#888888]">No posts yet.</p>
        </div>
      ) : (
        <div>
          {posts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              onDelete={(pid) => setPosts((prev) => prev.filter((p) => p.id !== pid))}
              onUpdate={(updated) => setPosts((prev) => prev.map((p) => p.id === updated.id ? updated : p))}
            />
          ))}
        </div>
      )}

      {/* Edit Profile Modal */}
      <EditProfileModal
        open={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        profile={profile}
        onSaved={(updated) => setProfile(updated)}
      />
    </div>
  );
}
