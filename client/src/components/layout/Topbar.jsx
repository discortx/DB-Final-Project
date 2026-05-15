import { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Search, Bell, MessageCircle, Gamepad2,
  ChevronDown, User, LogOut, X,
} from 'lucide-react';
import Avatar from '../ui/Avatar';
import Badge from '../ui/Badge';
import Button from '../ui/Button';
import Dropdown, { DropdownItem, DropdownDivider } from '../ui/Dropdown';
import NotificationItem from '../notifications/NotificationItem';
import useAuthStore from '../../store/authStore';
import useNotifStore from '../../store/notifStore';
import { searchUsers } from '../../api/users';
import { getNotifications, markAllRead } from '../../api/notifications';
import socket from '../../socket';

/* ─── tiny debounce hook ──────────────────────────── */
function useDebounce(value, delay) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

export default function Topbar() {
  const navigate   = useNavigate();
  const user       = useAuthStore((s) => s.user);
  const logout     = useAuthStore((s) => s.logout);
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
  const [drawerOpen, setDrawerOpen]   = useState(false);
  const [notifs,     setNotifs]       = useState([]);
  const [notifsLoading, setNotifsLoading] = useState(false);
  const [bellWobble, setBellWobble]   = useState(false);

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

  /* ── socket: new notification ── */
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
      <header className="h-14 bg-white border-b border-[#E0E0E0] px-4 flex items-center">
        {/* LEFT */}
        <div className="w-[200px] shrink-0">
          <Link to="/" className="text-xl font-black tracking-tighter text-[#0A0A0A] select-none font-sans">
            SORA LINK
          </Link>
        </div>

        {/* CENTER: search */}
        <div className="flex-1 max-w-sm mx-auto relative" ref={searchRef}>
          <span className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
            <Search size={16} className="text-[#888888]" />
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => searchResults.length > 0 && setSearchOpen(true)}
            onBlur={() => setTimeout(() => setSearchOpen(false), 200)}
            placeholder="Search Sora Link…"
            className="w-full pl-9 pr-3 py-1.5 bg-[#F7F7F7] border border-[#E0E0E0] rounded-md text-sm
                       focus:bg-white focus:border-black focus:ring-1 focus:ring-black focus:outline-none
                       transition-colors"
          />
          {searchOpen && searchResults.length > 0 && (
            <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-[#E0E0E0] rounded-lg shadow-md z-50 overflow-hidden">
              {searchResults.map((u) => (
                <div
                  key={u.id}
                  onMouseDown={() => {
                    navigate(`/profile/${u.id}`);
                    setSearchQuery('');
                    setSearchResults([]);
                    setSearchOpen(false);
                  }}
                  className="flex items-center gap-2 px-3 py-2 hover:bg-[#F7F7F7] cursor-pointer"
                >
                  <Avatar firstName={u.first_name} lastName={u.last_name} size="sm" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-[#0A0A0A] truncate">
                      {u.first_name} {u.last_name}
                    </p>
                    <p className="text-xs text-[#888888] truncate">@{u.username}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* RIGHT */}
        <div className="flex items-center gap-1 ml-4">
          {/* Notification bell */}
          <button
            type="button"
            onClick={() => setDrawerOpen((o) => !o)}
            className={`relative ghost rounded-md w-9 h-9 flex items-center justify-center
                        text-[#404040] hover:bg-[#EFEFEF] transition-colors
                        ${bellWobble ? 'animate-[shake_0.3s_ease-in-out]' : ''}`}
            aria-label="Notifications"
          >
            <Bell size={20} />
            {unreadCount > 0 && (
              <Badge className="absolute -top-1 -right-1 text-[9px] min-w-[16px] h-4">
                {unreadCount > 99 ? '99+' : unreadCount}
              </Badge>
            )}
          </button>

          {/* Messages */}
          <button
            type="button"
            onClick={() => navigate('/chats')}
            className="w-9 h-9 flex items-center justify-center rounded-md text-[#404040] hover:bg-[#EFEFEF] transition-colors"
            aria-label="Messages"
          >
            <MessageCircle size={20} />
          </button>

          {/* Games */}
          <button
            type="button"
            onClick={() => navigate('/games')}
            className="w-9 h-9 flex items-center justify-center rounded-md text-[#404040] hover:bg-[#EFEFEF] transition-colors"
            aria-label="Games"
          >
            <Gamepad2 size={20} />
          </button>

          {/* Divider */}
          <span className="w-px h-6 bg-[#E0E0E0] mx-1" />

          {/* Profile dropdown */}
          <Dropdown
            align="right"
            trigger={
              <button
                type="button"
                className="flex items-center gap-1.5 rounded-md px-1.5 py-1 hover:bg-[#EFEFEF] transition-colors cursor-pointer"
              >
                <Avatar firstName={user?.first_name} lastName={user?.last_name} size="sm" />
                <ChevronDown size={14} className="text-[#888888]" />
              </button>
            }
          >
            {/* Profile header */}
            <div className="flex items-center gap-3 py-3 px-4 border-b border-[#E0E0E0]">
              <Avatar firstName={user?.first_name} lastName={user?.last_name} size="md" />
              <div className="min-w-0">
                <p className="font-semibold text-sm text-[#0A0A0A] truncate">
                  {user?.first_name} {user?.last_name}
                </p>
                <p className="text-xs text-[#888888] truncate">@{user?.username}</p>
              </div>
            </div>

            <DropdownItem
              icon={User}
              onClick={() => navigate(`/profile/${user?.id}`)}
            >
              View Profile
            </DropdownItem>

            <DropdownDivider />

            <DropdownItem
              icon={LogOut}
              danger
              onClick={handleLogout}
            >
              Log out
            </DropdownItem>
          </Dropdown>
        </div>
      </header>

      {/* Notification Drawer */}
      {drawerOpen && (
        <div className="fixed inset-0 z-40" onClick={() => setDrawerOpen(false)}>
          <div className="absolute inset-0 bg-black/20" />
        </div>
      )}
      <div
        className={`fixed right-0 top-0 bottom-0 z-50 w-[360px] bg-white border-l border-[#E0E0E0] shadow-xl flex flex-col
                    transition-transform duration-250 ease-in-out
                    ${drawerOpen ? 'translate-x-0' : 'translate-x-full'}`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#E0E0E0] shrink-0">
          <h2 className="text-base font-semibold text-[#0A0A0A]">Notifications</h2>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={handleMarkAll}>
              Mark all read
            </Button>
            <button
              type="button"
              onClick={() => setDrawerOpen(false)}
              className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-[#EFEFEF] transition-colors text-[#404040]"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          {notifsLoading ? (
            <div className="flex items-center justify-center py-12">
              <span className="text-sm text-[#888888]">Loading…</span>
            </div>
          ) : notifs.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <span className="text-sm text-[#888888]">No notifications yet.</span>
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

        {/* Footer */}
        <div className="shrink-0 border-t border-[#E0E0E0] py-3 text-center">
          <Link
            to="/notifications"
            onClick={() => setDrawerOpen(false)}
            className="text-sm text-[#0A0A0A] hover:underline"
          >
            View all notifications
          </Link>
        </div>
      </div>

      {/* shake keyframe injected inline */}
      <style>{`
        @keyframes shake {
          0%   { transform: rotate(0deg); }
          20%  { transform: rotate(-12deg); }
          40%  { transform: rotate(12deg); }
          60%  { transform: rotate(-8deg); }
          80%  { transform: rotate(8deg); }
          100% { transform: rotate(0deg); }
        }
      `}</style>
    </>
  );
}
