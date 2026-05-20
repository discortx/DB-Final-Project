import { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import {
  Home, User, Users, MessageCircle, Gamepad2,
} from 'lucide-react';
import Avatar from '../ui/Avatar';
import useAuthStore from '../../store/authStore';
import { getInbox } from '../../api/friends';
import socket from '../../socket';

const SIDEBAR_CSS = `
  .sl-nav-link { transition: all 0.15s ease; text-decoration: none; }
  .sl-nav-link:hover { background: rgba(255,255,255,0.06) !important; }
  .sl-nav-link.active:hover { background: rgba(139,21,32,0.22) !important; }
`;

export default function LeftSidebar() {
  const user = useAuthStore((s) => s.user);
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    (async () => {
      try {
        const res = await getInbox();
        setPendingCount((res.data || []).length);
      } catch {}
    })();
  }, []);

  useEffect(() => {
    function handle(notif) {
      if (notif?.type === 'FRIEND_REQUEST') setPendingCount((c) => c + 1);
    }
    socket.on('notification:new', handle);
    return () => socket.off('notification:new', handle);
  }, []);

  const navItems = [
    { icon: Home,          label: 'Home',     to: '/',                    end: true,  badge: null                           },
    { icon: User,          label: 'Profile',  to: `/profile/${user?.id}`, end: false, badge: null                           },
    { icon: Users,         label: 'Friends',  to: '/friends',             end: false, badge: pendingCount > 99 ? '99+' : pendingCount || null },
    { icon: MessageCircle, label: 'Messages', to: '/chats',               end: false, badge: null                           },
    { icon: Gamepad2,      label: 'Games',    to: '/games',               end: false, badge: null                           },
  ];

  return (
    <>
      <style>{SIDEBAR_CSS}</style>
      <aside
        className="pt-4 px-2 pb-4 flex flex-col w-full h-full"
        style={{ background: 'transparent' }}
      >
        <p
          className="px-3 mb-2 uppercase"
          style={{ color: 'rgba(245,240,239,0.25)', fontSize: '0.6rem', letterSpacing: '0.14em', fontWeight: 700 }}
        >
          Menu
        </p>

        <nav className="flex flex-col gap-0.5 flex-1">
          {navItems.map(({ icon: Icon, label, to, end, badge }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className="sl-nav-link flex items-center gap-3 text-sm"
              style={({ isActive }) => ({
                padding: '8px 12px',
                paddingLeft: '9px',
                color: isActive ? '#F5F0EF' : 'rgba(245,240,239,0.5)',
                background: isActive ? 'rgba(139,21,32,0.15)' : 'transparent',
                borderLeft: `3px solid ${isActive ? '#C41E33' : 'transparent'}`,
                borderRadius: isActive ? '0 6px 6px 0' : '6px',
                fontWeight: isActive ? 600 : 400,
                boxShadow: isActive ? 'inset 0 0 0 1px rgba(196,30,51,0.15)' : 'none',
              })}
            >
              <Icon size={17} className="shrink-0" />
              <span className="flex-1 truncate">{label}</span>
              {badge != null && badge !== 0 && badge !== false && (
                <span
                  style={{
                    background: '#8B1520',
                    color: '#F5F0EF',
                    fontSize: '10px',
                    padding: '1px 6px',
                    borderRadius: '10px',
                    fontWeight: 600,
                    lineHeight: '16px',
                  }}
                >
                  {badge}
                </span>
              )}
            </NavLink>
          ))}
        </nav>

        {/* User info pinned at bottom — glass micro-card */}
        {user && (
          <div
            className="mt-3 px-3 py-2.5"
            style={{
              borderRadius: '8px',
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.07)',
            }}
          >
            <div className="flex items-center gap-2">
              <div className="relative shrink-0">
                <Avatar
                  firstName={user.first_name}
                  lastName={user.last_name}
                  userId={user.id}
                  size="sm"
                />
                <span
                  className="absolute bottom-0 right-0 w-2 h-2 rounded-full"
                  style={{ background: '#1A7A4A', border: '2px solid transparent' }}
                />
              </div>
              <div className="min-w-0">
                <p
                  className="truncate"
                  style={{ color: '#F5F0EF', fontSize: '0.78rem', fontWeight: 500 }}
                >
                  {user.first_name} {user.last_name}
                </p>
                <p
                  className="truncate"
                  style={{ color: 'rgba(245,240,239,0.38)', fontSize: '0.7rem' }}
                >
                  @{user.username}
                </p>
              </div>
            </div>
          </div>
        )}
      </aside>
    </>
  );
}
