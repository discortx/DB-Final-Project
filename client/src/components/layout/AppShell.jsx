import { useEffect } from 'react';
import { Outlet, useLocation, Link } from 'react-router-dom';
import { Home, Users, MessageCircle, Bell, User } from 'lucide-react';
import Topbar from './Topbar';
import LeftSidebar from './LeftSidebar';
import RightPanel from './RightPanel';
import OrbBackground from '../ui/OrbBackground';
import useAuthStore from '../../store/authStore';
import useNotifStore from '../../store/notifStore';
import socket from '../../socket';

const BOTTOM_TABS = [
  { icon: Home,          label: 'Home',         to: '/',              exact: true  },
  { icon: Users,         label: 'Friends',       to: '/friends',       exact: false },
  { icon: MessageCircle, label: 'Chats',         to: '/chats',         exact: false },
  { icon: Bell,          label: 'Notifications', to: '/notifications', exact: false },
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
    <div className="h-screen overflow-hidden" style={{ background: '#080607', position: 'relative' }}>
      {/* Shared orb background — z-index 0 + 5 (vignette) */}
      <OrbBackground />

      {/* Topbar — z-index 30 */}
      <div
        style={{
          height: '52px',
          position: 'relative',
          zIndex: 30,
          background: 'rgba(8,6,7,0.75)',
          backdropFilter: 'blur(14px)',
          WebkitBackdropFilter: 'blur(14px)',
          borderBottom: '1px solid rgba(255,255,255,0.07)',
        }}
      >
        <Topbar />
      </div>

      {/* Content row — z-index 10 */}
      <div className="flex" style={{ height: 'calc(100vh - 52px)', position: 'relative', zIndex: 10 }}>

        {/* Left sidebar — hidden below md (768px) */}
        <div
          className="hidden md:flex shrink-0 flex-col overflow-y-auto"
          style={{
            width: '200px',
            background: 'rgba(8,6,7,0.55)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            borderRight: '1px solid rgba(255,255,255,0.07)',
          }}
        >
          <LeftSidebar />
        </div>

        {/* Main feed — transparent so orbs show through */}
        <main
          className="flex-1 min-w-0 overflow-y-auto"
          style={{ background: 'transparent', scrollbarGutter: 'stable' }}
        >
          <div className="max-w-2xl mx-auto px-4 py-6 pb-20 md:pb-8">
            <Outlet />
          </div>
        </main>

        {/* Right panel — hidden below xl (1280px) */}
        <div
          className="hidden xl:flex shrink-0 flex-col overflow-y-auto"
          style={{
            width: '260px',
            background: 'rgba(8,6,7,0.55)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            borderLeft: '1px solid rgba(255,255,255,0.07)',
          }}
        >
          <RightPanel />
        </div>
      </div>

      {/* Mobile bottom tab bar — visible below md, z-index 50 */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 flex h-14"
        style={{
          zIndex: 50,
          background: 'rgba(8,6,7,0.88)',
          backdropFilter: 'blur(14px)',
          WebkitBackdropFilter: 'blur(14px)',
          borderTop: '1px solid rgba(255,255,255,0.07)',
        }}
      >
        {allTabs.map(({ icon: Icon, label, to, exact }) => {
          const active = isActive(to, exact);
          const isBell = label === 'Notifications';

          return (
            <Link
              key={to}
              to={to}
              className="flex-1 flex flex-col items-center justify-center py-2 gap-0.5 transition-colors"
              style={{
                color: active ? '#F5F0EF' : 'rgba(245,240,239,0.38)',
                fontSize: '10px',
                textDecoration: 'none',
              }}
            >
              <span className="relative">
                <Icon size={20} strokeWidth={active ? 2.5 : 1.75} />
                {isBell && unreadCount > 0 && (
                  <span
                    className="absolute -top-1 -right-1 w-2 h-2 rounded-full"
                    style={{ background: '#8B1520' }}
                  />
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
