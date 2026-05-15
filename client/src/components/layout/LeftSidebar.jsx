import { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import {
  Home, User, Users, MessageCircle,
  Gamepad2,
} from 'lucide-react';
import Badge from '../ui/Badge';
import useAuthStore from '../../store/authStore';
import { getInbox } from '../../api/friends';
import socket from '../../socket';

export default function LeftSidebar() {
  const user       = useAuthStore((s) => s.user);

  const [pendingCount, setPendingCount] = useState(0);

  /* load pending friend request count */
  useEffect(() => {
    (async () => {
      try {
        const res = await getInbox();
        setPendingCount((res.data || []).length);
      } catch {}
    })();
  }, []);

  /* socket: increment pending badge when new friend request arrives */
  useEffect(() => {
    function handle(notif) {
      if (notif?.type === 'FRIEND_REQUEST') {
        setPendingCount((c) => c + 1);
      }
    }
    socket.on('notification:new', handle);
    return () => socket.off('notification:new', handle);
  }, []);

  const navItems = [
    { icon: Home,          label: 'Home',          to: '/',                  end: true,  badge: null        },
    { icon: User,          label: 'Profile',        to: `/profile/${user?.id}`, end: false, badge: null     },
    { icon: Users,         label: 'Friends',        to: '/friends',           end: false, badge: pendingCount },
    { icon: MessageCircle, label: 'Messages',       to: '/chats',             end: false, badge: null        },
    { icon: Gamepad2,      label: 'Games',          to: '/games',             end: false, badge: null        },
  ];

  return (
    <aside className="bg-[#F7F7F7] border-r border-[#E0E0E0] pt-4 px-3 pb-6 flex flex-col w-full h-full">
      {/* Section label */}
      <p className="text-[10px] font-bold tracking-widest text-[#888888] px-3 mb-1 uppercase">
        Menu
      </p>

      {/* Nav items */}
      <nav className="flex flex-col gap-0.5">
        {navItems.map(({ icon: Icon, label, to, end, badge }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `relative flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors
               ${isActive
                 ? 'bg-[#EFEFEF] text-[#0A0A0A] font-semibold before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2 before:w-[3px] before:h-[60%] before:bg-black before:rounded-r'
                 : 'text-[#404040] hover:bg-[#EFEFEF] hover:text-[#0A0A0A]'
               }`
            }
          >
            <Icon size={18} className="shrink-0" />
            <span className="flex-1 truncate">{label}</span>
            {badge != null && badge > 0 && (
              <Badge variant="default">{badge}</Badge>
            )}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
