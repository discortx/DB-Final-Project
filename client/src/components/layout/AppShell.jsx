import { Outlet, useLocation, Link, NavLink } from 'react-router-dom';
import { Home, Users, MessageCircle, Bell, User } from 'lucide-react';
import Topbar from './Topbar';
import LeftSidebar from './LeftSidebar';
import RightPanel from './RightPanel';
import useAuthStore from '../../store/authStore';
import useNotifStore from '../../store/notifStore';

const BOTTOM_TABS = [
  { icon: Home,          label: 'Home',          to: '/',              exact: true  },
  { icon: Users,         label: 'Friends',        to: '/friends',       exact: false },
  { icon: MessageCircle, label: 'Chats',          to: '/chats',         exact: false },
  { icon: Bell,          label: 'Notifications',  to: '/notifications', exact: false },
];

export default function AppShell() {
  const user        = useAuthStore((s) => s.user);
  const unreadCount = useNotifStore((s) => s.unreadCount);
  const location    = useLocation();

  function isActive(to, exact) {
    if (exact) return location.pathname === to;
    return location.pathname.startsWith(to);
  }

  const allTabs = [
    ...BOTTOM_TABS,
    { icon: User, label: 'Profile', to: `/profile/${user?.id}`, exact: false },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-white">
      {/* Topbar */}
      <div className="sticky top-0 z-50 h-14">
        <Topbar />
      </div>

      {/* Content row */}
      <div className="flex flex-1">
        {/* Left sidebar — hidden below md */}
        <div className="w-60 shrink-0 sticky top-14 h-[calc(100vh-56px)] overflow-y-auto hidden md:flex flex-col">
          <LeftSidebar />
        </div>

        {/* Main content */}
        <main className="flex-1 min-w-0 overflow-y-auto bg-white">
          <div className="max-w-5xl mx-auto px-4 py-6">
            <Outlet />
          </div>
        </main>

        {/* Right panel — hidden below xl */}
        <div className="w-[280px] shrink-0 sticky top-14 h-[calc(100vh-56px)] overflow-y-auto hidden xl:flex flex-col border-l border-[#E0E0E0]">
          <RightPanel />
        </div>
      </div>

      {/* Mobile bottom tab bar — visible below md */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-[#E0E0E0] flex">
        {allTabs.map(({ icon: Icon, label, to, exact }) => {
          const active = isActive(to, exact);
          const isBell = label === 'Notifications';

          return (
            <Link
              key={to}
              to={to}
              className={`flex-1 flex flex-col items-center justify-center py-2 text-[10px] gap-0.5 transition-colors ${
                active ? 'text-[#0A0A0A]' : 'text-[#888888] hover:text-[#0A0A0A]'
              }`}
            >
              <span className="relative">
                <Icon size={20} strokeWidth={active ? 2.5 : 1.75} />
                {isBell && unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-[#CC0000]" />
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
