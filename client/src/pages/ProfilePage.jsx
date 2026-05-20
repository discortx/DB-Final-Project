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
import Modal from '../components/ui/Modal';
import Input from '../components/ui/Input';
import PostCard from '../components/feed/PostCard';

const PROFILE_CSS = `
  @keyframes skeletonShimmer { 0% { background-position: -400px 0 } 100% { background-position: 400px 0 } }
  .skeleton-pulse {
    background: linear-gradient(90deg, rgba(255,255,255,0.06) 25%, rgba(255,255,255,0.10) 50%, rgba(255,255,255,0.06) 75%);
    background-size: 400px 100%;
    animation: skeletonShimmer 1.6s ease-in-out infinite;
  }
  @keyframes profileFadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
  .profile-enter { animation: profileFadeIn 0.35s ease-out forwards; }
  .profile-input::placeholder { color: rgba(245,240,239,0.28); }
  .profile-input:focus { border-color: rgba(139,21,32,0.5) !important; outline: none; }
  .profile-gender-btn:hover { background: rgba(255,255,255,0.08) !important; }
  .profile-action-ghost:hover { background: rgba(139,21,32,0.08) !important; color: #E87080 !important; }
  .profile-bio-area::placeholder { color: rgba(245,240,239,0.28); }
  .profile-bio-area:focus { border-color: rgba(139,21,32,0.5) !important; outline: none; }
  @media (prefers-reduced-motion: reduce) { .profile-enter { animation: none; } .skeleton-pulse { animation: none; } }
`;

function formatMemberDate(dateStr) {
  if (!dateStr) return '—';
  try {
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  } catch { return dateStr; }
}

function formatDob(dateStr) {
  if (!dateStr) return null;
  try {
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch { return dateStr; }
}

/* ── Toggle Switch ── */
function Toggle({ value, onChange, disabled }) {
  return (
    <button
      type="button"
      onClick={() => !disabled && onChange(!value)}
      role="switch"
      aria-checked={value}
      style={{
        position: 'relative',
        width: 44,
        height: 24,
        borderRadius: 20,
        border: 'none',
        cursor: disabled ? 'not-allowed' : 'pointer',
        background: value ? '#8B1520' : 'rgba(255,255,255,0.12)',
        transition: 'background 0.2s',
        opacity: disabled ? 0.45 : 1,
        flexShrink: 0,
      }}
    >
      <span
        style={{
          position: 'absolute',
          top: 3,
          left: value ? 23 : 3,
          width: 18,
          height: 18,
          borderRadius: '50%',
          background: '#F5F0EF',
          boxShadow: '0 1px 4px rgba(0,0,0,0.5)',
          transition: 'left 0.2s',
        }}
      />
    </button>
  );
}

/* ── Edit Profile Modal ── */
function EditProfileModal({ open, onClose, profile, onSaved }) {
  const addToast = useToastStore((s) => s.addToast);
  const { updateUser } = useAuthStore();

  const [firstName, setFirstName] = useState(profile?.first_name || '');
  const [lastName,  setLastName]  = useState(profile?.last_name  || '');
  const [bio,       setBio]       = useState(profile?.bio        || '');
  const [dob,       setDob]       = useState(profile?.date_of_birth ? profile.date_of_birth.slice(0, 10) : '');
  const [gender,    setGender]    = useState(profile?.gender     || null);
  const [saving,    setSaving]    = useState(false);

  useEffect(() => {
    if (open && profile) {
      setFirstName(profile.first_name || '');
      setLastName(profile.last_name   || '');
      setBio(profile.bio              || '');
      setDob(profile.date_of_birth ? profile.date_of_birth.slice(0, 10) : '');
      setGender(profile.gender        || null);
    }
  }, [open, profile]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = { first_name: firstName, last_name: lastName, bio };
      if (dob) payload.date_of_birth = dob;
      payload.gender = gender || null;
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

  const inputStyle = {
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 6,
    color: '#F5F0EF',
    fontSize: '0.875rem',
    padding: '8px 12px',
    width: '100%',
    transition: 'border-color 0.2s',
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Edit Profile"
      maxWidth="max-w-lg"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={handleSave} loading={saving}>Save changes</Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block mb-1" style={{ color: 'rgba(245,240,239,0.55)', fontSize: '0.72rem', fontWeight: 600 }}>
              First name
            </label>
            <input
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="profile-input"
              style={inputStyle}
            />
          </div>
          <div>
            <label className="block mb-1" style={{ color: 'rgba(245,240,239,0.55)', fontSize: '0.72rem', fontWeight: 600 }}>
              Last name
            </label>
            <input
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="profile-input"
              style={inputStyle}
            />
          </div>
        </div>

        <div>
          <label className="block mb-1" style={{ color: 'rgba(245,240,239,0.55)', fontSize: '0.72rem', fontWeight: 600 }}>
            Bio
          </label>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            rows={3}
            placeholder="Tell the world about yourself…"
            className="profile-bio-area"
            style={{ ...inputStyle, resize: 'none', fontFamily: 'inherit' }}
          />
        </div>

        <div>
          <label className="block mb-1" style={{ color: 'rgba(245,240,239,0.55)', fontSize: '0.72rem', fontWeight: 600 }}>
            Date of birth (optional)
          </label>
          <input
            type="date"
            value={dob}
            onChange={(e) => setDob(e.target.value)}
            className="profile-input"
            style={{
              ...inputStyle,
              colorScheme: 'dark',
            }}
          />
        </div>

        <div>
          <p className="mb-1" style={{ color: 'rgba(245,240,239,0.55)', fontSize: '0.72rem', fontWeight: 600 }}>
            Gender (optional)
          </p>
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
                className="profile-gender-btn text-sm px-3 py-1.5 rounded cursor-pointer transition-colors"
                style={
                  gender === opt.value
                    ? { background: 'rgba(139,21,32,0.25)', color: '#F5F0EF', border: '1px solid rgba(139,21,32,0.5)' }
                    : { background: 'rgba(255,255,255,0.04)', color: 'rgba(245,240,239,0.55)', border: '1px solid rgba(255,255,255,0.1)' }
                }
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
    <div
      className="rounded-xl mb-6 p-6"
      style={{
        background: 'rgba(23,18,20,0.65)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        border: '1px solid rgba(255,255,255,0.08)',
      }}
    >
      <div className="flex items-start gap-4">
        <div
          className="skeleton-pulse shrink-0 rounded-full"
          style={{ width: 64, height: 64, background: 'rgba(255,255,255,0.07)' }}
        />
        <div className="flex-1 space-y-2">
          <div className="skeleton-pulse h-7 w-48 rounded" style={{ background: 'rgba(255,255,255,0.07)' }} />
          <div className="skeleton-pulse h-3.5 w-28 rounded" style={{ background: 'rgba(255,255,255,0.06)' }} />
          <div className="skeleton-pulse h-3.5 w-56 rounded mt-2" style={{ background: 'rgba(255,255,255,0.05)' }} />
        </div>
      </div>
      <div className="flex gap-8 mt-4 pt-4" style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}>
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex flex-col items-center gap-1">
            <div className="skeleton-pulse h-6 w-10 rounded" style={{ background: 'rgba(255,255,255,0.07)' }} />
            <div className="skeleton-pulse h-3 w-14 rounded" style={{ background: 'rgba(255,255,255,0.05)' }} />
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Main ProfilePage ── */
export default function ProfilePage() {
  const { id }       = useParams();
  const navigate     = useNavigate();
  const { user: me, updateUser } = useAuthStore();
  const addToast     = useToastStore((s) => s.addToast);

  const isOwnProfile = String(id) === String(me?.id) || id === 'me';

  const [profile,        setProfile]        = useState(null);
  const [loading,        setLoading]        = useState(true);
  const [friendStatus,   setFriendStatus]   = useState(null);
  const [pendingRequestId, setPendingRequestId] = useState(null);
  const [friendCount,    setFriendCount]    = useState(0);
  const [editModalOpen,  setEditModalOpen]  = useState(false);
  const [privacyLoading, setPrivacyLoading] = useState(false);
  const [actionLoading,  setActionLoading]  = useState(false);
  const [messageLoading, setMessageLoading] = useState(false);
  const [posts,          setPosts]          = useState([]);
  const [postsLoading,   setPostsLoading]   = useState(true);

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
      const res = isOwnProfile ? await getMe() : await getUserById(id);
      setProfile(res.data);

      if (!isOwnProfile) {
        const [friendsRes, inboxRes] = await Promise.all([getFriends(), getInbox()]);
        const isFriend = friendsRes.data.some((f) => String(f.id) === String(id));
        if (isFriend) {
          setFriendStatus('friends');
          setFriendCount(friendsRes.data.length);
        } else {
          const inboundReq = inboxRes.data.find((r) => String(r.sender_id) === String(id));
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
  }, [id, isOwnProfile]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { loadProfile(); }, [loadProfile]);

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
    } finally { setActionLoading(false); }
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
    } finally { setActionLoading(false); }
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
    } finally { setActionLoading(false); }
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
    } finally { setActionLoading(false); }
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
    } finally { setActionLoading(false); }
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
      <>
        <style>{PROFILE_CSS}</style>
        <div className="max-w-[720px] mx-auto pt-6">
          <ProfileSkeleton />
        </div>
      </>
    );
  }

  if (!profile) return null;

  const ghostDangerStyle = {
    fontSize: '0.8rem',
    background: 'none',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 6,
    padding: '5px 12px',
    cursor: 'pointer',
    transition: 'background 0.15s, color 0.15s',
    color: 'rgba(245,240,239,0.55)',
  };

  return (
    <>
      <style>{PROFILE_CSS}</style>
      <div className="max-w-[720px] mx-auto pt-6">

        {/* Profile Header Card */}
        <div
          className="profile-enter rounded-xl p-6 mb-6"
          style={{
            background: 'rgba(23,18,20,0.65)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            border: '1px solid rgba(255,255,255,0.08)',
          }}
        >
          {/* Top row */}
          <div className="flex items-start gap-4 flex-wrap">
            <Avatar firstName={profile.first_name} lastName={profile.last_name} size="xl" />

            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-baseline gap-2">
                <h1
                  style={{
                    fontFamily: "'Cormorant Garamond', serif",
                    fontWeight: 700,
                    fontSize: '1.85rem',
                    color: '#F5F0EF',
                    lineHeight: 1.1,
                  }}
                >
                  {profile.first_name} {profile.last_name}
                </h1>
                <span style={{ fontSize: '0.875rem', color: 'rgba(245,240,239,0.45)' }}>
                  @{profile.username}
                </span>
              </div>
              <p
                className="text-sm mt-1"
                style={{
                  color: profile.bio ? 'rgba(245,240,239,0.65)' : 'rgba(245,240,239,0.28)',
                  fontStyle: profile.bio ? 'normal' : 'italic',
                }}
              >
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
                    <span style={{ fontSize: '0.75rem', color: 'rgba(245,240,239,0.45)' }}>
                      Private profile
                    </span>
                    <Toggle
                      value={!!profile.privacy_enabled}
                      onChange={handlePrivacyToggle}
                      disabled={privacyLoading}
                    />
                  </div>
                </>
              ) : (
                <>
                  {friendStatus === null && (
                    <Button variant="primary" onClick={handleAddFriend} loading={actionLoading}>
                      Add Friend
                    </Button>
                  )}

                  {friendStatus === 'sent' && (
                    <div className="flex gap-2 flex-wrap">
                      <button
                        type="button"
                        disabled
                        style={{
                          ...ghostDangerStyle,
                          opacity: 0.5,
                          cursor: 'not-allowed',
                          color: 'rgba(245,240,239,0.4)',
                        }}
                      >
                        Request Sent ✓
                      </button>
                      <button
                        type="button"
                        onClick={handleCancelRequest}
                        disabled={actionLoading}
                        className="profile-action-ghost"
                        style={ghostDangerStyle}
                      >
                        Cancel
                      </button>
                    </div>
                  )}

                  {friendStatus === 'received' && (
                    <div className="flex gap-2 flex-wrap">
                      <Button variant="primary" size="sm" onClick={handleAcceptRequest} loading={actionLoading}>
                        Accept
                      </Button>
                      <button
                        type="button"
                        onClick={handleDeclineRequest}
                        disabled={actionLoading}
                        className="profile-action-ghost"
                        style={ghostDangerStyle}
                      >
                        Decline
                      </button>
                    </div>
                  )}

                  {friendStatus === 'friends' && (
                    <div className="flex gap-2 flex-wrap">
                      <button
                        type="button"
                        disabled
                        style={{
                          ...ghostDangerStyle,
                          opacity: 0.5,
                          cursor: 'not-allowed',
                          color: 'rgba(245,240,239,0.4)',
                        }}
                      >
                        Friends ✓
                      </button>
                      <button
                        type="button"
                        onClick={handleUnfriend}
                        disabled={actionLoading}
                        className="profile-action-ghost"
                        style={ghostDangerStyle}
                      >
                        Unfriend
                      </button>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={handleMessage}
                    disabled={messageLoading}
                    style={{
                      ...ghostDangerStyle,
                      color: 'rgba(245,240,239,0.65)',
                      opacity: messageLoading ? 0.5 : 1,
                    }}
                  >
                    {messageLoading ? 'Opening…' : 'Message'}
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Stats row */}
          <div className="flex gap-8 pt-4 mt-4 flex-wrap" style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}>
            <div className="flex flex-col items-center">
              <span style={{ fontWeight: 700, fontSize: '1.1rem', color: '#F5F0EF' }}>
                {postsLoading ? '—' : posts.length}
              </span>
              <span style={{ fontSize: '0.72rem', color: 'rgba(245,240,239,0.45)' }}>Posts</span>
            </div>
            <div className="flex flex-col items-center">
              <span style={{ fontWeight: 700, fontSize: '1.1rem', color: '#F5F0EF' }}>{friendCount}</span>
              <span style={{ fontSize: '0.72rem', color: 'rgba(245,240,239,0.45)' }}>Friends</span>
            </div>
            <div className="flex flex-col items-center">
              <span style={{ fontWeight: 700, fontSize: '1.1rem', color: '#F5F0EF' }}>
                {profile.created_at ? formatMemberDate(profile.created_at) : '—'}
              </span>
              <span style={{ fontSize: '0.72rem', color: 'rgba(245,240,239,0.45)' }}>Member since</span>
            </div>
          </div>

          {/* Info pills */}
          {(profile.gender || profile.date_of_birth) && (
            <div className="mt-3 flex flex-wrap gap-2">
              {profile.gender === 'MALE' && (
                <span
                  className="inline-flex items-center gap-1"
                  style={{
                    background: 'rgba(255,255,255,0.07)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: 20,
                    fontSize: '0.72rem',
                    color: 'rgba(245,240,239,0.65)',
                    padding: '3px 10px',
                  }}
                >
                  <Mars size={11} /> MALE
                </span>
              )}
              {profile.gender === 'FEMALE' && (
                <span
                  className="inline-flex items-center gap-1"
                  style={{
                    background: 'rgba(255,255,255,0.07)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: 20,
                    fontSize: '0.72rem',
                    color: 'rgba(245,240,239,0.65)',
                    padding: '3px 10px',
                  }}
                >
                  <Venus size={11} /> FEMALE
                </span>
              )}
              {profile.date_of_birth && (
                <span
                  className="inline-flex items-center gap-1"
                  style={{
                    background: 'rgba(255,255,255,0.07)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: 20,
                    fontSize: '0.72rem',
                    color: 'rgba(245,240,239,0.65)',
                    padding: '3px 10px',
                  }}
                >
                  <Cake size={11} /> {formatDob(profile.date_of_birth)}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Posts */}
        {postsLoading ? (
          <div className="space-y-2.5">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="rounded-xl"
                style={{
                  background: 'rgba(23,18,20,0.65)',
                  backdropFilter: 'blur(12px)',
                  WebkitBackdropFilter: 'blur(12px)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  height: 88,
                  overflow: 'hidden',
                }}
              >
                <div className="skeleton-pulse w-full h-full" style={{ background: 'rgba(255,255,255,0.05)' }} />
              </div>
            ))}
          </div>
        ) : posts.length === 0 ? (
          <div
            className="rounded-xl p-6 text-center"
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.07)',
            }}
          >
            <p style={{ color: 'rgba(245,240,239,0.3)', fontSize: '0.875rem' }}>No posts yet.</p>
          </div>
        ) : (
          <div className="profile-enter">
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

        <EditProfileModal
          open={editModalOpen}
          onClose={() => setEditModalOpen(false)}
          profile={profile}
          onSaved={(updated) => setProfile(updated)}
        />
      </div>
    </>
  );
}
