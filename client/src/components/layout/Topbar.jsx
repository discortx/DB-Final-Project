import { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Search, Bell, MessageCircle, Gamepad2,
  ChevronDown, User, LogOut, X,
} from 'lucide-react';
import Avatar from '../ui/Avatar';
import Dropdown, { DropdownItem, DropdownDivider } from '../ui/Dropdown';
import NotificationItem from '../notifications/NotificationItem';
import useAuthStore from '../../store/authStore';
import useNotifStore from '../../store/notifStore';
import { searchUsers } from '../../api/users';
import { getNotifications, markAllRead } from '../../api/notifications';
import socket from '../../socket';

const TOPBAR_CSS = `
  .tbar-search::placeholder { color: rgba(245,240,239,0.28); }
  .tbar-search:focus { border-color: rgba(139,21,32,0.5) !important; background: rgba(255,255,255,0.07) !important; outline: none; }
  .tbar-icon-btn:hover { background: rgba(255,255,255,0.1) !important; }
  @keyframes shake {
    0%   { transform: rotate(0deg); }
    20%  { transform: rotate(-12deg); }
    40%  { transform: rotate(12deg); }
    60%  { transform: rotate(-8deg); }
    80%  { transform: rotate(8deg); }
    100% { transform: rotate(0deg); }
  }
`;

function useDebounce(value, delay) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

function LogoMark() {
  return (
    <svg width="22" height="22" viewBox="0 0 80 80" fill="none">
      <path
        d="M60 22 C60 22 45 14 30 22 C15 30 20 46 36 48 C52 50 58 56 52 68"
        stroke="#8B1520" strokeWidth="7" strokeLinecap="round" fill="none"
      />
      <path
        d="M20 60 C20 60 35 68 50 60 C65 52 60 36 44 34 C28 32 22 26 28 14"
        stroke="#F5F0EF" strokeWidth="5" strokeLinecap="round" fill="none"
      />
    </svg>
  );
}

export default function Topbar() {
  const navigate       = useNavigate();
  const user           = useAuthStore((s) => s.user);
  const logout         = useAuthStore((s) => s.logout);
  const unreadCount    = useNotifStore((s) => s.unreadCount);
  const setUnreadCount = useNotifStore((s) => s.setUnreadCount);
  const increment      = useNotifStore((s) => s.increment);

  /* ── search ── */
  const [searchQuery,   setSearchQuery]   = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchOpen,    setSearchOpen]    = useState(false);
  const debouncedQuery = useDebounce(searchQuery, 300);
  const searchRef = useRef(null);

  useEffect(() => {
    if (!debouncedQuery.trim()) { setSearchResults([]); return; }
    (async () => {
      try {
        const res = await searchUsers(debouncedQuery);
        setSearchResults(res.data || []);
        setSearchOpen(true);
      } catch { setSearchResults([]); }
    })();
  }, [debouncedQuery]);

  /* ── notification drawer ── */
  const [drawerOpen,    setDrawerOpen]    = useState(false);
  const [notifs,        setNotifs]        = useState([]);
  const [notifsLoading, setNotifsLoading] = useState(false);
  const [bellWobble,    setBellWobble]    = useState(false);

  const loadNotifs = useCallback(async () => {
    setNotifsLoading(true);
    try {
      const res = await getNotifications();
      setNotifs((res.data || []).slice(0, 20));
    } catch {}
    setNotifsLoading(false);
  }, []);

  useEffect(() => {
    if (drawerOpen) loadNotifs();
  }, [drawerOpen, loadNotifs]);

  useEffect(() => {
    function handleNew() {
      increment();
      setBellWobble(true);
      setTimeout(() => setBellWobble(false), 400);
    }
    socket.on('notification:new', handleNew);
    return () => socket.off('notification:new', handleNew);
  }, [increment]);

  const handleMarkAll = async () => {
    try {
      await markAllRead();
      setUnreadCount(0);
      setNotifs((n) => n.map((x) => ({ ...x, is_read: true })));
    } catch {}
  };

  const handleLogout = () => {
    socket.disconnect();
    logout();
    navigate('/login');
  };

  return (
    <>
      <style>{TOPBAR_CSS}</style>

      <header
        className="px-4 flex items-center"
        style={{ background: '#100D0E', height: '52px' }}
      >
        {/* LEFT — logo */}
        <div className="shrink-0 flex items-center gap-2" style={{ width: '200px' }}>
          <Link to="/" className="flex items-center gap-2 select-none">
            <LogoMark />
            <span
              style={{
                fontFamily: "'Cormorant Garamond', serif",
                fontWeight: 700,
                fontSize: '1.05rem',
                color: '#F5F0EF',
                letterSpacing: '0.1em',
              }}
            >
              SORA LINK
            </span>
          </Link>
        </div>

        {/* CENTER — search */}
        <div className="flex-1 max-w-sm mx-auto relative" ref={searchRef}>
          <span className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
            <Search size={14} style={{ color: 'rgba(245,240,239,0.3)' }} />
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => searchResults.length > 0 && setSearchOpen(true)}
            onBlur={() => setTimeout(() => setSearchOpen(false), 200)}
            placeholder="Search…"
            className="tbar-search"
            style={{
              width: '100%',
              height: '32px',
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '20px',
              color: '#F5F0EF',
              fontSize: '0.8rem',
              padding: '0 12px 0 34px',
              transition: 'border-color 0.2s, background 0.2s',
            }}
          />
          {searchOpen && searchResults.length > 0 && (
            <div
              className="absolute left-0 right-0 top-full mt-1 z-50 overflow-hidden"
              style={{
                background: '#1E181A',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '8px',
                boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
              }}
            >
              {searchResults.map((u) => (
                <div
                  key={u.id}
                  onMouseDown={() => {
                    navigate(`/profile/${u.id}`);
                    setSearchQuery('');
                    setSearchResults([]);
                    setSearchOpen(false);
                  }}
                  className="flex items-center gap-2 px-3 py-2 cursor-pointer transition-colors hover:bg-white/5"
                  style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}
                >
                  <Avatar firstName={u.first_name} lastName={u.last_name} userId={u.id} size="sm" />
                  <div className="min-w-0">
                    <p style={{ color: '#F5F0EF', fontSize: '0.84rem', fontWeight: 500 }} className="truncate">
                      {u.first_name} {u.last_name}
                    </p>
                    <p style={{ color: 'rgba(245,240,239,0.4)', fontSize: '0.72rem' }} className="truncate">
                      @{u.username}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* RIGHT — icon buttons */}
        <div className="flex items-center gap-1.5 ml-4">
          {/* Bell */}
          <button
            type="button"
            onClick={() => setDrawerOpen((o) => !o)}
            className={`tbar-icon-btn relative w-[30px] h-[30px] flex items-center justify-center rounded-full transition-colors ${bellWobble ? 'animate-[shake_0.3s_ease-in-out]' : ''}`}
            style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(245,240,239,0.7)' }}
            aria-label="Notifications"
          >
            <Bell size={15} />
            {unreadCount > 0 && (
              <span
                className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full"
                style={{ background: '#8B1520' }}
              />
            )}
          </button>

          {/* Messages */}
          <button
            type="button"
            onClick={() => navigate('/chats')}
            className="tbar-icon-btn w-[30px] h-[30px] flex items-center justify-center rounded-full transition-colors"
            style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(245,240,239,0.7)' }}
            aria-label="Messages"
          >
            <MessageCircle size={15} />
          </button>

          {/* Games */}
          <button
            type="button"
            onClick={() => navigate('/games')}
            className="tbar-icon-btn w-[30px] h-[30px] flex items-center justify-center rounded-full transition-colors"
            style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(245,240,239,0.7)' }}
            aria-label="Games"
          >
            <Gamepad2 size={15} />
          </button>

          {/* Divider */}
          <span
            className="w-px h-5 mx-0.5"
            style={{ background: 'rgba(255,255,255,0.1)' }}
          />

          {/* Profile dropdown */}
          <Dropdown
            align="right"
            trigger={
              <button
                type="button"
                className="flex items-center gap-1.5 rounded-md px-1.5 py-1 transition-colors cursor-pointer hover:bg-white/5"
              >
                <Avatar
                  firstName={user?.first_name}
                  lastName={user?.last_name}
                  userId={user?.id}
                  size="sm"
                />
                <ChevronDown size={12} style={{ color: 'rgba(245,240,239,0.4)' }} />
              </button>
            }
          >
            <div className="flex items-center gap-3 py-3 px-4 border-b border-[#E0E0E0]">
              <Avatar
                firstName={user?.first_name}
                lastName={user?.last_name}
                userId={user?.id}
                size="md"
              />
              <div className="min-w-0">
                <p className="font-semibold text-sm text-[#0A0A0A] truncate">
                  {user?.first_name} {user?.last_name}
                </p>
                <p className="text-xs text-[#888888] truncate">@{user?.username}</p>
              </div>
            </div>

            <DropdownItem icon={User} onClick={() => navigate(`/profile/${user?.id}`)}>
              View Profile
            </DropdownItem>

            <DropdownDivider />

            <DropdownItem icon={LogOut} danger onClick={handleLogout}>
              Log out
            </DropdownItem>
          </Dropdown>
        </div>
      </header>

      {/* Notification drawer backdrop */}
      {drawerOpen && (
        <div className="fixed inset-0 z-40" onClick={() => setDrawerOpen(false)}>
          <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.4)' }} />
        </div>
      )}

      {/* Notification drawer */}
      <div
        className={`fixed right-0 top-0 bottom-0 z-50 w-[360px] flex flex-col transition-transform duration-300 ease-in-out ${drawerOpen ? 'translate-x-0' : 'translate-x-full'}`}
        style={{
          background: '#171214',
          borderLeft: '1px solid rgba(255,255,255,0.07)',
          boxShadow: '-8px 0 40px rgba(0,0,0,0.6)',
        }}
      >
        {/* Drawer header */}
        <div
          className="flex items-center justify-between px-4 py-3 shrink-0"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}
        >
          <h2 style={{ color: '#F5F0EF', fontSize: '0.95rem', fontWeight: 600 }}>
            Notifications
          </h2>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleMarkAll}
              style={{ color: 'rgba(245,240,239,0.45)', fontSize: '0.75rem', background: 'none', border: 'none', cursor: 'pointer' }}
              className="px-2 py-1 rounded transition-colors hover:text-white/70"
            >
              Mark all read
            </button>
            <button
              type="button"
              onClick={() => setDrawerOpen(false)}
              className="w-7 h-7 flex items-center justify-center rounded-md transition-colors hover:bg-white/5"
              style={{ color: 'rgba(245,240,239,0.45)' }}
            >
              <X size={15} />
            </button>
          </div>
        </div>

        {/* Drawer body */}
        <div className="flex-1 overflow-y-auto">
          {notifsLoading ? (
            <div className="flex items-center justify-center py-12">
              <span style={{ color: 'rgba(245,240,239,0.35)', fontSize: '0.85rem' }}>Loading…</span>
            </div>
          ) : notifs.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <span style={{ color: 'rgba(245,240,239,0.35)', fontSize: '0.85rem' }}>
                No notifications yet.
              </span>
            </div>
          ) : (
            notifs.map((n) => (
              <NotificationItem
                key={n.id}
                notification={n}
                onClick={(notif) => {
                  setNotifs((prev) =>
                    prev.map((x) => (x.id === notif.id ? { ...x, is_read: true } : x))
                  );
                }}
                onDismiss={(id) => {
                  setNotifs((prev) => prev.filter((x) => x.id !== id));
                }}
              />
            ))
          )}
        </div>

        {/* Drawer footer */}
        <div
          className="shrink-0 py-3 text-center"
          style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}
        >
          <Link
            to="/notifications"
            onClick={() => setDrawerOpen(false)}
            style={{ color: 'rgba(245,240,239,0.45)', fontSize: '0.84rem' }}
            className="hover:text-white/70 transition-colors"
          >
            View all notifications
          </Link>
        </div>
      </div>
    </>
  );
}
