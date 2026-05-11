import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { getUser, updateMe, getMe } from '../api/users';
import { sendRequest, cancelRequest, acceptRequest, getFriends } from '../api/friends';
import { createPost } from '../api/posts';
import useAuthStore from '../store/authStore';
import Avatar from '../components/Avatar';
import PostCard from '../components/PostCard';
import api from '../api/client';

export default function ProfilePage() {
  const { id } = useParams();
  const { user: me, updateUser } = useAuthStore();
  const isMe = String(id) === String(me?.id) || id === 'me';

  const [profile, setProfile]   = useState(null);
  const [posts, setPosts]       = useState([]);
  const [editing, setEditing]   = useState(false);
  const [form, setForm]         = useState({});
  const [friendStatus, setFriendStatus] = useState(null); // null | 'friends' | 'pending_sent' | 'pending_received'
  const [pendingId, setPendingId] = useState(null);
  const [saving, setSaving]     = useState(false);

  useEffect(() => {
    const uid = isMe ? me.id : id;
    Promise.all([
      getUser(uid),
      api.get(`/api/posts?author_id=${uid}`).catch(() => ({ data: [] })),
    ]).then(([uRes]) => {
      setProfile(uRes.data);
      setForm(uRes.data);
    });

    if (!isMe) {
      getFriends().then((res) => {
        const friend = res.data.find((f) => String(f.id) === String(id));
        if (friend) { setFriendStatus('friends'); return; }
      });
      api.get('/api/friends/requests/inbox').then((res) => {
        const req = res.data.find((r) => String(r.sender_id) === String(id));
        if (req) { setFriendStatus('pending_received'); setPendingId(req.id); }
      });
    }
  }, [id, isMe, me?.id]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await updateMe(form);
      setProfile(res.data);
      updateUser(res.data);
      setEditing(false);
    } catch {}
    setSaving(false);
  };

  const handleFriendAction = async () => {
    if (friendStatus === null) {
      await sendRequest(parseInt(id));
      setFriendStatus('pending_sent');
    } else if (friendStatus === 'pending_sent') {
      if (pendingId) { await cancelRequest(pendingId); setFriendStatus(null); }
    } else if (friendStatus === 'pending_received') {
      if (pendingId) { await acceptRequest(pendingId); setFriendStatus('friends'); }
    }
  };

  if (!profile) return <div className="text-center py-12 text-gray-400">Loading…</div>;

  const inputCls = 'border border-gray-300 rounded-lg px-3 py-2 text-sm w-full focus:outline-none focus:ring-2 focus:ring-blue-500';

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-start gap-4">
          <Avatar firstName={profile.first_name} lastName={profile.last_name} size="lg" />
          <div className="flex-1">
            {editing ? (
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <input className={inputCls} value={form.first_name || ''} onChange={(e) => setForm((f) => ({ ...f, first_name: e.target.value }))} placeholder="First name" />
                  <input className={inputCls} value={form.last_name || ''}  onChange={(e) => setForm((f) => ({ ...f, last_name: e.target.value }))}  placeholder="Last name" />
                </div>
                <textarea className={inputCls} rows={2} value={form.bio || ''} onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))} placeholder="Bio" />
                <div className="grid grid-cols-2 gap-2">
                  <select className={inputCls} value={form.gender || ''} onChange={(e) => setForm((f) => ({ ...f, gender: e.target.value || null }))}>
                    <option value="">Gender</option>
                    <option value="MALE">Male</option>
                    <option value="FEMALE">Female</option>
                  </select>
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={form.privacy_enabled || false}
                      onChange={(e) => setForm((f) => ({ ...f, privacy_enabled: e.target.checked }))} />
                    Hide online status
                  </label>
                </div>
                <div className="flex gap-2">
                  <button onClick={handleSave} disabled={saving} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50">Save</button>
                  <button onClick={() => setEditing(false)} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200">Cancel</button>
                </div>
              </div>
            ) : (
              <>
                <h2 className="text-xl font-bold text-gray-900">{profile.first_name} {profile.last_name}</h2>
                <p className="text-sm text-gray-500">@{profile.username}</p>
                {profile.bio && <p className="mt-2 text-gray-700 text-sm">{profile.bio}</p>}
                <div className="flex items-center gap-3 mt-3">
                  {profile.gender && <span className="text-xs text-gray-400">{profile.gender}</span>}
                  {profile.privacy_enabled && <span className="text-xs text-gray-400">🔒 Private</span>}
                </div>
                <div className="flex gap-2 mt-4">
                  {isMe ? (
                    <button onClick={() => setEditing(true)} className="px-4 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200">Edit Profile</button>
                  ) : (
                    <button onClick={handleFriendAction}
                      className={`px-4 py-1.5 rounded-lg text-sm font-medium ${
                        friendStatus === 'friends' ? 'bg-green-100 text-green-700' :
                        friendStatus === 'pending_sent' ? 'bg-yellow-100 text-yellow-700' :
                        friendStatus === 'pending_received' ? 'bg-blue-600 text-white' :
                        'bg-blue-600 text-white hover:bg-blue-700'
                      }`}>
                      {friendStatus === 'friends' ? '✓ Friends' :
                       friendStatus === 'pending_sent' ? 'Cancel Request' :
                       friendStatus === 'pending_received' ? 'Accept Request' :
                       'Add Friend'}
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {posts.map((p) => (
        <PostCard key={p.id} post={p} onDelete={(pid) => setPosts((ps) => ps.filter((x) => x.id !== pid))} />
      ))}
    </div>
  );
}
