import { useEffect } from 'react';
import { Outlet, useLocation, Link } from 'react-router-dom';
import { Home, Users, MessageCircle, Bell, User } from 'lucide-react';
import Topbar from './Topbar';
import LeftSidebar from './LeftSidebar';
import RightPanel from './RightPanel';
import useAuthStore from '../../store/authStore';
import useNotifStore from '../../store/notifStore';
import socket from '../../socket';

const BOTTOM_TABS = [
  { icon: Home,          label: 'Home',          to: '/',              exact: true  },
  { icon: Users,         label: 'Friends',        to: '/friends',       exact: false },
  { icon: MessageCircle, label: 'Chats',          to: '/chats',         exact: false },
  { icon: Bell,          label: 'Notifications',  to: '/notifications', exact: false },
];

export default function AppShell() {
  const user        = useAuthStore((s) => s.user);
  const token       = useAuthStore((s) => s.token);
  const unreadCount = useNotifStore((s) => s.unreadCount);
  const location    = useLocation();

  useEffect(() => {
    if (!token) return;
    if (!socket.connected) {
      socket.auth = { token };
      socket.connect();
    }
    return () => { socket.disconnect(); };
  }, [token]);

  function isActive(to, exact) {
    if (exact) return location.pathname === to;
    return location.pathname.startsWith(to);
  }

  const allTabs = [
    ...BOTTOM_TABS,
    { icon: User, label: 'Profile', to: `/profile/${user?.id}`, exact: false },
  ];

  return (
    <div className="h-screen overflow-hidden" style={{ background: '#080607' }}>
      {/* Topbar */}
      <div style={{ height: '52px', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
        <Topbar />
      </div>

      {/* Content row */}
      <div className="flex" style={{ height: 'calc(100vh - 52px)' }}>
        {/* Left sidebar — hidden below md */}
        <div
          className="hidden md:block shrink-0 overflow-y-auto"
          style={{ width: '200px', borderRight: '1px solid rgba(255,255,255,0.07)', background: '#100D0E' }}
        >
          <LeftSidebar />
        </div>

        {/* Main feed */}
        <main
          className="flex-1 min-w-0 overflow-y-auto"
          style={{ background: '#080607', scrollbarGutter: 'stable' }}
        >
          <div className="max-w-2xl mx-auto px-4 py-6 pb-20 md:pb-6">
            <Outlet />
          </div>
        </main>

        {/* Right panel — hidden below xl */}
        <div
          className="hidden xl:block shrink-0 overflow-y-auto"
          style={{ width: '240px', borderLeft: '1px solid rgba(255,255,255,0.07)', background: '#100D0E' }}
        >
          <RightPanel />
        </div>
      </div>

      {/* Mobile bottom tab bar — visible below md */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-50 flex h-14"
        style={{ background: '#100D0E', borderTop: '1px solid rgba(255,255,255,0.07)' }}
      >
        {allTabs.map(({ icon: Icon, label, to, exact }) => {
          const active = isActive(to, exact);
          const isBell = label === 'Notifications';

          return (
            <Link
              key={to}
              to={to}
              className="flex-1 flex flex-col items-center justify-center py-2 text-[10px] gap-0.5 transition-colors"
              style={{ color: active ? '#F5F0EF' : 'rgba(245,240,239,0.4)' }}
            >
              <span className="relative">
                <Icon size={20} strokeWidth={active ? 2.5 : 1.75} />
                {isBell && unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-[#8B1520]" />
                )}
              </span>
              <span>{label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
