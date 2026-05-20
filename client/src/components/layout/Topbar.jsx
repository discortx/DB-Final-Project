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
  .tbar-search:focus {
    border-color: rgba(139,21,32,0.5) !important;
    background: rgba(255,255,255,0.07) !important;
    outline: none;
  }
  @keyframes skeletonShimmer {
    0%   { background-position: -400px 0; }
    100% { background-position:  400px 0; }
  }
  .skeleton-pulse {
    background: linear-gradient(
      90deg,
      rgba(255,255,255,0.06) 25%,
      rgba(255,255,255,0.10) 50%,
      rgba(255,255,255,0.06) 75%
    );
    background-size: 400px 100%;
    animation: skeletonShimmer 1.6s ease-in-out infinite;
  }
  @keyframes bellShake {
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
  const [notifsError,   setNotifsError]   = useState(false);
  const [bellWobble,    setBellWobble]    = useState(false);

  const loadNotifs = useCallback(async () => {
    setNotifsLoading(true);
    setNotifsError(false);
    try {
      const res = await getNotifications();
      const items = Array.isArray(res.data) ? res.data : [];
      setNotifs(items.slice(0, 20));
      const serverCount = parseInt(res.headers?.['x-unread-count'] ?? '', 10);
      if (!Number.isNaN(serverCount)) setUnreadCount(serverCount);
    } catch {
      setNotifsError(true);
    }
    setNotifsLoading(false);
  }, [setUnreadCount]);

  useEffect(() => {
    if (drawerOpen) loadNotifs();
  }, [drawerOpen, loadNotifs]);

  useEffect(() => {
    function handleNew(notif) {
      increment();
      setBellWobble(true);
      setTimeout(() => setBellWobble(false), 400);
      if (notif && typeof notif === 'object') {
        setNotifs((prev) => [notif, ...prev].slice(0, 20));
      }
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

  const iconBtnStyle = {
    background: 'rgba(255,255,255,0.06)',
    border: 'none',
    cursor: 'pointer',
    color: 'rgba(245,240,239,0.7)',
    borderRadius: '50%',
    transition: 'background 0.15s',
  };

  return (
    <>
      <style>{TOPBAR_CSS}</style>

      <header
        className="px-4 flex items-center h-full"
        style={{ background: 'transparent' }}
      >
        {/* LEFT — logo */}
        <div className="shrink-0 flex items-center" style={{ width: '200px' }}>
          <Link to="/" className="flex items-center gap-2 select-none">
            <LogoMark />
            <span
              className="hidden sm:block"
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
                background: 'rgba(23,18,20,0.96)',
                backdropFilter: 'blur(16px)',
                WebkitBackdropFilter: 'blur(16px)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '10px',
                boxShadow: '0 12px 40px rgba(0,0,0,0.6)',
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
            className={`relative w-[30px] h-[30px] flex items-center justify-center transition-colors hover:bg-white/10 ${bellWobble ? 'animate-[bellShake_0.3s_ease-in-out]' : ''}`}
            style={iconBtnStyle}
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
            className="w-[30px] h-[30px] flex items-center justify-center transition-colors hover:bg-white/10"
            style={iconBtnStyle}
            aria-label="Messages"
          >
            <MessageCircle size={15} />
          </button>

          {/* Games */}
          <button
            type="button"
            onClick={() => navigate('/games')}
            className="w-[30px] h-[30px] flex items-center justify-center transition-colors hover:bg-white/10"
            style={iconBtnStyle}
            aria-label="Games"
          >
            <Gamepad2 size={15} />
          </button>

          <span className="w-px h-5 mx-0.5" style={{ background: 'rgba(255,255,255,0.1)' }} />

          {/* Profile dropdown */}
          <Dropdown
            align="right"
            trigger={
              <button
                type="button"
                className="flex items-center gap-1.5 rounded-md px-1.5 py-1 transition-colors cursor-pointer hover:bg-white/5"
                style={{ background: 'none', border: 'none' }}
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
            {/* Dropdown header — dark themed */}
            <div
              className="flex items-center gap-3 py-3 px-4"
              style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}
            >
              <Avatar
                firstName={user?.first_name}
                lastName={user?.last_name}
                userId={user?.id}
                size="md"
              />
              <div className="min-w-0">
                <p style={{ fontWeight: 600, fontSize: '0.875rem', color: '#F5F0EF' }} className="truncate">
                  {user?.first_name} {user?.last_name}
                </p>
                <p style={{ fontSize: '0.75rem', color: 'rgba(245,240,239,0.4)' }} className="truncate">
                  @{user?.username}
                </p>
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
          <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)' }} />
        </div>
      )}

      {/* Notification drawer */}
      <div
        className={`fixed right-0 top-0 bottom-0 z-50 flex flex-col transition-transform duration-300 ease-in-out ${drawerOpen ? 'translate-x-0' : 'translate-x-full'}`}
        style={{
          width: 'min(360px, 100vw)',
          background: 'rgba(14,10,12,0.92)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderLeft: '1px solid rgba(255,255,255,0.09)',
          boxShadow: '-12px 0 48px rgba(0,0,0,0.7)',
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
              className="px-2 py-1 rounded transition-colors hover:text-white/70"
              style={{ color: 'rgba(245,240,239,0.45)', fontSize: '0.75rem', background: 'none', border: 'none', cursor: 'pointer' }}
            >
              Mark all read
            </button>
            <button
              type="button"
              onClick={() => setDrawerOpen(false)}
              className="w-7 h-7 flex items-center justify-center rounded-md transition-colors hover:bg-white/5"
              style={{ color: 'rgba(245,240,239,0.45)', background: 'none', border: 'none', cursor: 'pointer' }}
            >
              <X size={15} />
            </button>
          </div>
        </div>

        {/* Drawer body */}
        <div className="flex-1 overflow-y-auto">
          {notifsLoading ? (
            <div className="p-4 space-y-3">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-3 px-1 py-2">
                  <div
                    className="shrink-0 w-9 h-9 rounded-full skeleton-pulse"
                    style={{ background: 'rgba(255,255,255,0.07)' }}
                  />
                  <div className="flex-1 space-y-2">
                    <div className="skeleton-pulse h-3 w-4/5 rounded" style={{ background: 'rgba(255,255,255,0.07)' }} />
                    <div className="skeleton-pulse h-2.5 w-1/2 rounded" style={{ background: 'rgba(255,255,255,0.05)' }} />
                  </div>
                </div>
              ))}
            </div>
          ) : notifsError ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <span style={{ color: 'rgba(245,240,239,0.45)', fontSize: '0.85rem' }}>
                Could not load notifications.
              </span>
              <button
                type="button"
                onClick={loadNotifs}
                style={{
                  background: 'none', border: '1px solid rgba(255,255,255,0.12)',
                  color: 'rgba(245,240,239,0.6)', borderRadius: '8px',
                  padding: '4px 14px', fontSize: '0.78rem', cursor: 'pointer',
                }}
              >
                Retry
              </button>
            </div>
          ) : notifs.length === 0 ? (
            <div className="flex items-center justify-center py-16">
              <span style={{ color: 'rgba(245,240,239,0.45)', fontSize: '0.85rem' }}>
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
            className="transition-colors hover:text-white/70"
            style={{ color: 'rgba(245,240,239,0.45)', fontSize: '0.84rem' }}
          >
            View all notifications
          </Link>
        </div>
      </div>
    </>
  );
}
